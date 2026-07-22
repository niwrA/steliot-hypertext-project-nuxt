# T. S. Eliot Hypertext Project — static Nuxt edition

This repository contains the modern, statically generated edition of the T. S. Eliot Hypertext Project, created by Arwin van Arum in 1998. The recovered HTML is treated as archival source material; derived JSON under `public/content/` remains reproducible and editorial corrections live in `editorial/content-overrides.json`.

## Development and validation

Requires Node.js 22 and Python 3.

```bash
npm ci
npm run dev
npm run content:audit
npm run typecheck
npm test
npm run build
npm run generate
node tools/validate-output.mjs
```

`npm run generate` validates the manifest and search index before prerendering. Static output is written to `.output/public`. The validation fails on duplicate routes or IDs, missing records/assets/internal destinations, invalid work/annotation classification, stale hash URLs, and search URLs without generated destinations.

## Routes and rendering

- `/read/:id/` — annotated works and other reading/project pages
- `/annotation/:id/` — annotations
- `/reference/:id/` — bibliography and source/reference pages
- `/image/:id/` — image and bibliography-image pages
- `/about/` and `/search/` — important site pages

Record IDs are used as stable canonical slugs. Every manifest record has exactly one route. Primary works are selected only by the semantic `annotated-text` type. Internal links are rewritten into normal links during server rendering, so scholarly content and navigation are present before hydration. JavaScript progressively adds annotation panels, fullscreen images, search, and legacy hash redirects.

Search loads a content-hashed static index lazily. Its query is stored in `/search/?q=...`, and every result carries the canonical URL generated from the same manifest.

## Site configuration

- `NUXT_PUBLIC_SITE_URL` — eventual production origin, for example `https://example.org` (no trailing slash). When absent, absolute canonical and Open Graph URLs are omitted. Set it in production so `sitemap.xml` contains absolute locations.
- `NUXT_PUBLIC_ISSUE_URL` — issue creation endpoint, normally `https://github.com/OWNER/REPOSITORY/issues/new`. When absent, “Report an issue” degrades to an email action without exposing audit data.

## Azure Static Web Apps

Use these exact settings:

| Setting | Value |
|---|---|
| App location | `/` |
| API location | *(empty)* |
| Output location | `.output/public` |
| Build command | `npm run generate` |
| Node version | `22` |

The included workflow builds and validates first, then uploads `.output/public` with `skip_app_build: true`. Add the repository secret `AZURE_STATIC_WEB_APPS_API_TOKEN` and repository variables `NUXT_PUBLIC_SITE_URL` and, optionally, `NUXT_PUBLIC_ISSUE_URL`. `staticwebapp.config.json` provides a real 404 rewrite (status 404), MIME types, cache policy, and security headers; there is no SPA fallback.

## Editorial and audit policy

Run `npm run content:enrich` only to apply conservative derived-metadata changes. It never edits recovered source HTML. Developer reports remain in `reports/` and are not copied into the generated public site. Ambiguous titles, missing source assets, and historical attributions should be reviewed editorially rather than guessed.
