import manifestData from '../generated/manifest.json'
import annotationPreviewData from '../generated/annotation-previews.json'
import assetReplacementData from '../../editorial/asset-replacements.json'
import linkReplacementData from '../../editorial/link-replacements.json'
import { canonicalPath, type ContentPage, type Manifest, type ManifestPage } from '../../shared/content'

export const manifest=manifestData as Manifest
export const pageById=new Map(manifest.pages.map(p=>[p.id,p]))
const annotationPreviews = annotationPreviewData as Record<string, { title: string; text: string }>
type AssetReplacement = { url?: string; alt: string; renderAs?: 'legacy-marker' | 'omit' | 'text'; text?: string }
const assetReplacements = assetReplacementData as Record<string, AssetReplacement>
type LinkReplacement = { href?: string; renderAs?: 'text'; provenance: string }
const linkReplacements = linkReplacementData as Record<string, LinkReplacement>
export const publicUrl=(id:string)=>{const p=pageById.get(id);return p?canonicalPath(p):undefined}
const cleanPath = (value: string) => (decodeURIComponent(value)
  .replace(/\\/g, '/')
  .replace(/^\.\//, '')
  .split(/[?#]/)[0] ?? '')
  .toLowerCase()
const resolveRelative=(sourceFile:string,href:string)=>{
  if(href.startsWith('/'))return cleanPath(href)
  const sourceDirectory = sourceFile.includes('/')
    ? sourceFile.slice(0, sourceFile.lastIndexOf('/') + 1)
    : ''
  const bits = cleanPath(sourceDirectory).split('/').filter(Boolean)
  for(const bit of cleanPath(href).split('/')){if(!bit||bit==='.')continue;if(bit==='..')bits.pop();else bits.push(bit)}
  return cleanPath(bits.join('/'))
}
const linkReplacement=(sourceFile:string,href:string)=>linkReplacements[`${cleanPath(sourceFile)}::${cleanPath(href)}`]
  ||linkReplacements[`${cleanPath(sourceFile)}::${resolveRelative(sourceFile,href)}`]
export const assetUrl=(sourceFile:string,src:string)=>{
  const clean = decodeURIComponent(src).replace(/\\/g, '/').split(/[?#]/)[0] ?? ''
  const replacement = assetReplacements[resolveRelative(sourceFile, clean)]
  if(replacement?.url)return replacement.url
  const marker=clean.toLowerCase().lastIndexOf('/images/')
  if(marker>=0)return `/content/assets/${clean.slice(marker+1).split('/').map(encodeURIComponent).join('/')}`
  if(clean.toLowerCase().startsWith('images/'))return `/content/assets/${clean.split('/').map(encodeURIComponent).join('/')}`
  const out:string[]=[];const dir=sourceFile.includes('/')?sourceFile.slice(0,sourceFile.lastIndexOf('/')+1):''
  for(const part of `${dir}${clean}`.split('/')){if(!part||part==='.')continue;if(part==='..')out.pop();else out.push(part)}
  return `/content/assets/${out.map(encodeURIComponent).join('/')}`
}
const esc=(s:string)=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!))
const normalizeLegacyMarkup=(html:string)=>{
  let normalized=html
    .replace(/<\/?font\b[^>]*>/gi,'')
    .replace(/<center\b[^>]*>/gi,'<div class="legacy-center">')
    .replace(/<\/center>/gi,'</div>')
    .replace(/<h1\b([^>]*)>/gi,'<h2 class="legacy-heading"$1>')
    .replace(/<\/h1>/gi,'</h2>')
  normalized=normalized.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi,(all,attrs,body)=>{
    if(/\bhref\s*=/i.test(attrs))return all
    const name=/\bname\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]
    return name?`<span id="${esc(name)}" class="legacy-anchor">${body}</span>`:body
  })
  return normalized
}
export function renderLegacy(page:ContentPage){
  if(page.type==='frameset')return '<p class="legacy-document-note">This recovered record was the original frameset entry point. Its navigation and documents are available through the modern project index.</p>'
  const targets=new Map<string,ManifestPage>()
  for(const link of page.links){if(!link.pageId)continue;const target=pageById.get(link.pageId);if(!target)continue;for(const key of [link.path,link.href,link.resolvedPath])if(key)targets.set(cleanPath(key),target)}
  let html=normalizeLegacyMarkup(page.html).replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,(all,href,body)=>{
    const replacement=linkReplacement(page.sourceFile,href)
    return replacement?.renderAs==='text'?body:all
  })
  html=html.replace(/<img\b([^>]*?)src=["']([^"']+)["']([^>]*)>/gi,(all,before,src,after)=>{
    const name=cleanPath(src).split('/').pop()||'';const icon=name==='r.gif'?'R':name==='a.gif'?'A':name==='t.gif'?'T':name.startsWith('arrowl')?'←':name.startsWith('arrow')?'→':''
    if(icon)return `<span class="legacy-marker" role="img" aria-label="${icon==='R'?'Reference':icon==='A'?'Annotation':icon==='T'?'Translation':'Navigation'}">${icon}</span>`
    const replacement = assetReplacements[resolveRelative(page.sourceFile, src)]
    if(replacement?.renderAs==='omit')return ''
    if(replacement?.renderAs==='text'&&replacement.text)return `<span class="editorial-greek" lang="grc" aria-label="${esc(replacement.alt)}">${esc(replacement.text).replace(/\n/g,'<br>')}</span>`
    const attributes=`${before} ${after}`.replace(/\/\s*$/,'').replace(/\s(?:alt|loading|tabindex|data-lightbox)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'').trim()
    const alt=/\balt=["']([^"']*)/i.exec(`${before}${after}`)?.[1]||replacement?.alt||''
    return `<img${attributes?` ${attributes}`:''} src="${assetUrl(page.sourceFile,src)}" loading="lazy" tabindex="0" data-lightbox alt="${esc(alt||page.title)}">`
  })
  html=html.replace(/<a\b([^>]*?)href=["']([^"']+)["']([^>]*)>/gi,(all,before,href,after)=>{
    const replacement=linkReplacement(page.sourceFile,href)
    if(replacement?.href){const external=/^https?:/i.test(replacement.href);return `<a ${before}href="${esc(replacement.href)}"${after}${external?' target="_blank" rel="external noopener noreferrer"':''}>`}
    if(/^(https?:|mailto:|tel:)/i.test(href)){const extra=/^https?:/i.test(href)?' target="_blank" rel="external noopener noreferrer"':'';return `<a ${before}href="${esc(href)}"${after}${extra}>`}
    if(href.startsWith('#'))return `<a ${before}href="${esc(href)}"${after}>`
    const normalized=resolveRelative(page.sourceFile,href);const target=targets.get(cleanPath(href))||targets.get(normalized)
    if(!target)return `<a ${before}href="${esc(href)}"${after}>`
    return `<a ${before}href="${canonicalPath(target)}" data-page-id="${target.id}" data-page-type="${target.type}"${after}>`
  })
  let tooltipSequence=0
  html=html.replace(/(<a\b[^>]*data-page-id="([^"]+)"[^>]*data-page-type="annotation"[^>]*>)([\s\S]*?)(<\/a>)/gi,(all,opening,id,body,closing)=>{
    const preview=annotationPreviews[id]
    if(!preview)return all
    const previewId=`annotation-tooltip-${id}-${++tooltipSequence}`
    const continuation=preview.text.length>=260?'…':''
    return `${opening.replace(/>$/,` aria-describedby="${previewId}">`)}${body}<span id="${previewId}" class="annotation-tooltip" role="tooltip"><strong>${esc(preview.title)}</strong><span>${esc(preview.text)}${continuation}</span><span class="annotation-tooltip-action">Click for the full annotation →</span></span>${closing}`
  })
  return html
}
export async function loadPage(id: string) {
  const encodedId = encodeURIComponent(id)
  const path = `/content/pages/${encodedId}.json`
  if (import.meta.client) {
    const response = await fetch(path)
    if (!response.ok) throw new Error(`Unable to load content record ${id} (${response.status})`)
    return await response.json() as ContentPage
  }
  return await $fetch<ContentPage>(`/api/content/${encodedId}`)
}
export function pageForRoute(namespace:string,id:string){const p=pageById.get(id);return p&&canonicalPath(p)===`/${namespace}/${id}/`?p:null}
