import { readFileSync } from 'node:fs'
import { describe,expect,it } from 'vitest';import index from '../public/content/search-index.json';import manifest from '../public/content/manifest.json';import { canonicalPath } from '../shared/content'
import { highlightSearchTerms,searchTerms } from '../app/utils/search-highlight'
describe('search source',()=>{it('has unique IDs and complete manifest coverage',()=>{expect(new Set(index.map(x=>x.id)).size).toBe(index.length);expect(index.length).toBe(manifest.pages.length)});it('maps annotations outside read',()=>{const p=manifest.pages.find(x=>x.id==='burbank-notes-title-a')!;expect(canonicalPath(p as never)).toBe('/annotation/burbank-notes-title-a/')})})

describe('search highlighting',()=>{
  it('highlights every case-insensitive partial-word occurrence',()=>{
    expect(highlightSearchTerms('Waste, wasteland and WASTE.',searchTerms('waste land'))).toEqual([
      {text:'Waste',match:true},
      {text:', ',match:false},
      {text:'waste',match:true},
      {text:'land',match:true},
      {text:' and ',match:false},
      {text:'WASTE',match:true},
      {text:'.',match:false},
    ])
  })

  it('treats punctuation in terms literally',()=>{
    expect(highlightSearchTerms('Who? Whoa. (Who?)',searchTerms('who?'))).toEqual([
      {text:'Who?',match:true},
      {text:' Whoa. (',match:false},
      {text:'Who?',match:true},
      {text:')',match:false},
    ])
  })

  it('keeps markup-like text as plain text for Vue to escape',()=>{
    const value='<script>alert("Eliot & Pound")</script>'
    const parts=highlightSearchTerms(value,searchTerms('eliot <script>'))
    expect(parts.map(part=>part.text).join('')).toBe(value)
    expect(parts.filter(part=>part.match).map(part=>part.text)).toEqual(['<script>','Eliot'])
    expect(parts.every(part=>!('html' in part))).toBe(true)

    const component=readFileSync(new URL('../app/components/SearchClient.client.vue',import.meta.url),'utf8')
    expect(component).not.toContain('v-html')
    expect(component).toContain('<mark v-if="part.match">{{ part.text }}</mark>')
  })
})
