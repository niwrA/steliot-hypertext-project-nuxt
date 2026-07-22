#!/usr/bin/env python3
"""Audit and conservatively enrich generated Eliot reader content.

This tool never changes recovered HTML. It only updates derived JSON metadata and
writes an auditable report. Run without --apply for a dry run.
"""
from __future__ import annotations

import argparse
import html
import json
import re
from collections import Counter
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "public" / "content"
PAGES = CONTENT / "pages"
OVERRIDES = ROOT / "editorial" / "content-overrides.json"
ASSET_REPLACEMENTS = ROOT / "editorial" / "asset-replacements.json"
LINK_REPLACEMENTS = ROOT / "editorial" / "link-replacements.json"
REPORT_JSON = ROOT / "reports" / "content-quality.json"
REPORT_MD = ROOT / "reports" / "content-quality.md"

SPACE = re.compile(r"\s+")
NAV_TEXT = re.compile(r"^(back|next|previous|home|reference topics|link two|go back|annotated edition available)\b", re.I)
FILELIKE = re.compile(r"(?:[_-][A-Z]{1,3})$|^[\w.-]+_[A-Z]{1,3}$", re.I)
GENERIC = {"title", "image", "picture", "untitled", "annotation", "note", "notes"}


def clean(value: str | None) -> str:
    value = html.unescape(value or "")
    value = SPACE.sub(" ", value).strip(" \t\r\n|-")
    return value


def link_key(source: str, target: str) -> str:
    return f"{source.replace(chr(92), '/').lower()}::{target.replace(chr(92), '/').lower()}"


class Extractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.buffers: dict[str, list[str]] = {k: [] for k in ("h1", "h2", "h3", "strong", "b", "em")}
        self.candidates: dict[str, list[str]] = {k: [] for k in self.buffers}
        self.images: list[dict[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        self.stack.append(tag)
        if tag == "img":
            data = {k.lower(): clean(v) for k, v in attrs if k}
            self.images.append({"src": data.get("src", ""), "alt": data.get("alt", ""), "title": data.get("title", "")})

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in self.buffers:
            text = clean("".join(self.buffers[tag]))
            if text:
                self.candidates[tag].append(text)
            self.buffers[tag].clear()
        if tag in self.stack:
            idx = len(self.stack) - 1 - self.stack[::-1].index(tag)
            self.stack = self.stack[:idx]

    def handle_data(self, data: str) -> None:
        for tag in self.buffers:
            if tag in self.stack:
                self.buffers[tag].append(data)


def candidate_score(value: str, source: str, page_type: str) -> int:
    value = clean(value)
    if not value or len(value) < 2 or len(value) > 140 or NAV_TEXT.search(value):
        return -999
    score = {"override": 1000, "h1": 120, "h2": 110, "h3": 100, "strong": 90, "b": 80, "image-alt": 85, "em": 55, "text": 30}.get(source, 0)
    if 4 <= len(value) <= 80:
        score += 20
    if value.endswith("..."):
        score -= 3
    if value.lower() in GENERIC:
        score -= 100
    if FILELIKE.search(value):
        score -= 80
    if page_type == "image-wrapper" and source == "image-alt":
        score += 30
    if value.count(" ") == 0 and len(value) < 5:
        score -= 20
    return score


def weak_title(page: dict[str, Any]) -> bool:
    title = clean(page.get("title"))
    stem = Path(page.get("sourceFile", "")).stem
    return (
        not title
        or title.lower() == stem.lower()
        or title.lower() in GENERIC
        or bool(FILELIKE.search(title))
        or len(title) > 100
        or (page.get("type") == "image-wrapper" and title.lower() == "eliot in 1910" and "eliotin1910" not in page.get("id", ""))
    )


def derive_title(page: dict[str, Any], overrides: dict[str, Any]) -> tuple[str | None, str | None, int]:
    override = overrides.get(page["id"], {}).get("title")
    if override:
        return clean(override), "override", 1000
    parser = Extractor()
    parser.feed(page.get("html", ""))
    candidates: list[tuple[int, str, str]] = []
    for source in ("h1", "h2", "h3", "strong", "b"):
        for value in parser.candidates[source][:4]:
            candidates.append((candidate_score(value, source, page.get("type", "")), value, source))
    if page.get("type") in {"image-wrapper", "bibliography-image"}:
        for image in parser.images:
            for value in (image.get("alt"), image.get("title")):
                if value:
                    candidates.append((candidate_score(value, "image-alt", page.get("type", "")), value, "image-alt"))
        for value in parser.candidates["em"][:3]:
            candidates.append((candidate_score(value, "em", page.get("type", "")), value, "em"))
    first = clean(re.split(r"(?<=[.!?])\s+|\n", page.get("text", ""), maxsplit=1)[0])
    if first:
        candidates.append((candidate_score(first, "text", page.get("type", "")), first, "text"))
    candidates.sort(reverse=True)
    if not candidates or candidates[0][0] < 40:
        return None, None, -999
    score, value, source = candidates[0]
    return clean(value), source, score


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(path: Path, data: Any, compact: bool = False) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=None if compact else 2) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="write conservative title improvements")
    args = ap.parse_args()

    overrides = load_json(OVERRIDES) if OVERRIDES.exists() else {}
    asset_replacements = load_json(ASSET_REPLACEMENTS) if ASSET_REPLACEMENTS.exists() else {}
    link_replacements = load_json(LINK_REPLACEMENTS) if LINK_REPLACEMENTS.exists() else {}
    page_files = sorted(PAGES.glob("*.json"))
    pages = [load_json(p) for p in page_files]
    changes: list[dict[str, Any]] = []
    type_changes: list[dict[str, Any]] = []
    weak: list[dict[str, Any]] = []
    missing_images_map: dict[tuple[str, str], dict[str, str]] = {}
    replaced_images_map: dict[tuple[str, str], dict[str, str]] = {}
    empty_labels: list[dict[str, str]] = []

    for path, page in zip(page_files, pages):
        override = overrides.get(page["id"], {})
        override_type = override.get("type")
        if override_type and override_type != page.get("type"):
            type_changes.append({"id": page["id"], "from": page.get("type"), "to": override_type})
            if args.apply:
                page["type"] = override_type

        is_weak = weak_title(page)
        proposed, source, score = derive_title(page, overrides)
        current = clean(page.get("title"))
        eligible_type = page.get("type") in {"annotation", "image-wrapper", "bibliography-image"} or page["id"] in overrides
        should_change = bool(proposed and proposed != current and eligible_type and (is_weak or page["id"] in overrides) and score >= 70)
        if should_change:
            changes.append({"id": page["id"], "from": current, "to": proposed, "source": source, "score": score})
            if args.apply:
                page["title"] = proposed
        if args.apply and (should_change or any(c["id"] == page["id"] for c in type_changes)):
            dump_json(path, page)
        elif is_weak:
            weak.append({"id": page["id"], "title": current, "suggestion": proposed, "source": source, "score": score})

        for image in page.get("images", []):
            image_path = image.get("path") or image.get("resolvedPath")
            if image.get("kind") == "internal" and image_path and not (CONTENT / "assets" / image_path).exists():
                replacement = asset_replacements.get(image_path.lower())
                replacement_path = ROOT / "public" / replacement.get("url", "").lstrip("/") if replacement and replacement.get("url") else None
                record = {"pageId": page["id"], "path": image_path, "alt": clean(image.get("alt"))}
                replacement_is_rendered = replacement and replacement.get("renderAs") in {"legacy-marker", "omit", "text"}
                if replacement and ((replacement_path and replacement_path.exists()) or replacement_is_rendered):
                    replaced_images_map[(page["id"], image_path)] = {**record, "replacement": replacement.get("url") or replacement.get("renderAs"), "provenance": replacement.get("provenance", "")}
                else:
                    missing_images_map[(page["id"], image_path)] = record
        for link in page.get("links", []):
            if link.get("kind") == "internal" and not clean(link.get("label")):
                empty_labels.append({"pageId": page["id"], "target": link.get("pageId") or link.get("path", "")})

    if args.apply and (changes or type_changes):
        title_by_id = {c["id"]: c["to"] for c in changes}
        type_by_id = {c["id"]: c["to"] for c in type_changes}
        manifest = load_json(CONTENT / "manifest.json")
        for item in manifest.get("pages", []):
            if item["id"] in title_by_id:
                item["title"] = title_by_id[item["id"]]
            if item["id"] in type_by_id:
                item["type"] = type_by_id[item["id"]]
            if item["id"] in type_by_id:
                item["type"] = type_by_id[item["id"]]
        manifest["counts"] = dict(Counter(item.get("type", "unknown") for item in manifest.get("pages", [])))
        dump_json(CONTENT / "manifest.json", manifest)
        search = load_json(CONTENT / "search-index.json")
        for item in search:
            if item["id"] in title_by_id:
                item["title"] = title_by_id[item["id"]]
            if item["id"] in type_by_id:
                item["type"] = type_by_id[item["id"]]
        manifest["counts"] = dict(Counter(item.get("type", "unknown") for item in manifest.get("pages", [])))
        dump_json(CONTENT / "search-index.json", search, compact=True)

    missing_images = list(missing_images_map.values())
    replaced_images = list(replaced_images_map.values())
    duplicate_titles = [
        {"title": title, "count": count}
        for title, count in Counter(clean(p.get("title")) for p in pages).most_common()
        if title and count > 1
    ]
    importer_broken_links = load_json(CONTENT / "broken-links.json")
    repaired_links = [
        {**item, **link_replacements[link_key(item["from"], item["to"])]}
        for item in importer_broken_links
        if link_key(item["from"], item["to"]) in link_replacements
    ]
    unresolved_links = [
        item for item in importer_broken_links
        if link_key(item["from"], item["to"]) not in link_replacements
    ]
    report = {
        "summary": {
            "pages": len(pages),
            "proposedOrAppliedTitleChanges": len(changes),
            "proposedOrAppliedTypeChanges": len(type_changes),
            "remainingWeakTitles": len(weak),
            "missingImageReferences": len(missing_images),
            "editorialImageReplacements": len(replaced_images),
            "emptyInternalLinkLabels": len(empty_labels),
            "brokenLinksReportedByImporter": len(unresolved_links),
            "editorialLinkReplacements": len(repaired_links),
            "duplicateTitles": len(duplicate_titles),
        },
        "titleChanges": changes,
        "typeChanges": type_changes,
        "annotatedWorks": [{"id": p["id"], "title": clean(p.get("title"))} for p in pages if p.get("type") == "annotated-text"],
        "remainingWeakTitles": weak,
        "missingImageReferences": missing_images,
        "editorialImageReplacements": replaced_images,
        "emptyInternalLinkLabels": empty_labels,
        "brokenLinks": unresolved_links,
        "editorialLinkReplacements": repaired_links,
        "duplicateTitles": duplicate_titles,
    }
    REPORT_JSON.parent.mkdir(exist_ok=True)
    dump_json(REPORT_JSON, report)
    s = report["summary"]
    md = ["# Content quality report", "", f"Mode: **{'applied' if args.apply else 'dry run'}**", "", "## Summary", ""]
    for key, value in s.items():
        md.append(f"- **{key}**: {value}")
    md += ["", "## Title changes", "", "| Page | Previous | Improved | Basis |", "|---|---|---|---|"]
    for c in changes:
        md.append(f"| `{c['id']}` | {c['from']} | {c['to']} | {c['source']} |")
    md += ["", "## Type changes", "", "| Page | Previous type | Corrected type |", "|---|---|---|"]
    for c in type_changes:
        md.append(f"| `{c['id']}` | {c['from']} | {c['to']} |")
    md += ["", "## Remaining editorial work", "", "See `content-quality.json` for complete machine-readable lists of weak titles, missing images, blank link labels, broken links, and duplicate titles.", ""]
    REPORT_MD.write_text("\n".join(md), encoding="utf-8")
    print(json.dumps(s, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
