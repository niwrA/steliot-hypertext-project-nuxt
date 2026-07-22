export type HighlightPart = {
  text: string
  match: boolean
}

export function searchTerms(query: string): string[] {
  return [...new Set(query.trim().split(/\s+/u).filter(Boolean).map(term => term.toLocaleLowerCase()))]
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function highlightSearchTerms(value: string, terms: string[]): HighlightPart[] {
  if (!terms.length || !value) return [{ text: value, match: false }]

  const pattern = [...terms]
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join('|')
  const expression = new RegExp(pattern, 'giu')
  const parts: HighlightPart[] = []
  let cursor = 0

  for (const match of value.matchAll(expression)) {
    const index = match.index
    if (index > cursor) parts.push({ text: value.slice(cursor, index), match: false })
    parts.push({ text: match[0], match: true })
    cursor = index + match[0].length
  }

  if (cursor < value.length) parts.push({ text: value.slice(cursor), match: false })
  return parts.length ? parts : [{ text: value, match: false }]
}
