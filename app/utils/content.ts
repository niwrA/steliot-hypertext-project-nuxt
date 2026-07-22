import manifestData from '../generated/manifest.json'
import { canonicalPath, type ContentPage, type Manifest, type ManifestPage } from '../../shared/content'

export const manifest=manifestData as Manifest
export const pageById=new Map(manifest.pages.map(p=>[p.id,p]))
export const publicUrl=(id:string)=>{const p=pageById.get(id);return p?canonicalPath(p):undefined}
const cleanPath=(value:string)=>decodeURIComponent(value).replace(/\\/g,'/').replace(/^\.\//,'').split(/[?#]/)[0].toLowerCase()
const resolveRelative=(sourceFile:string,href:string)=>{
  if(href.startsWith('/'))return cleanPath(href)
  const bits=(sourceFile.includes('/')?sourceFile.slice(0,sourceFile.lastIndexOf('/')+1):'').split('/').filter(Boolean)
  for(const bit of cleanPath(href).split('/')){if(!bit||bit==='.')continue;if(bit==='..')bits.pop();else bits.push(bit)}
  return bits.join('/')
}
export const assetUrl=(sourceFile:string,src:string)=>{
  const clean=decodeURIComponent(src).replace(/\\/g,'/').split(/[?#]/)[0]
  const marker=clean.toLowerCase().lastIndexOf('/images/')
  if(marker>=0)return `/content/assets/${clean.slice(marker+1).split('/').map(encodeURIComponent).join('/')}`
  if(clean.toLowerCase().startsWith('images/'))return `/content/assets/${clean.split('/').map(encodeURIComponent).join('/')}`
  const out:string[]=[];const dir=sourceFile.includes('/')?sourceFile.slice(0,sourceFile.lastIndexOf('/')+1):''
  for(const part of `${dir}${clean}`.split('/')){if(!part||part==='.')continue;if(part==='..')out.pop();else out.push(part)}
  return `/content/assets/${out.map(encodeURIComponent).join('/')}`
}
const esc=(s:string)=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!))
export function renderLegacy(page:ContentPage){
  const targets=new Map<string,ManifestPage>()
  for(const link of page.links){if(!link.pageId)continue;const target=pageById.get(link.pageId);if(!target)continue;for(const key of [link.path,link.href,link.resolvedPath])if(key)targets.set(cleanPath(key),target)}
  let html=page.html.replace(/<img\b([^>]*?)src=["']([^"']+)["']([^>]*)>/gi,(all,before,src,after)=>{
    const name=cleanPath(src).split('/').pop()||'';const icon=name==='r.gif'?'R':name==='a.gif'?'A':name==='t.gif'?'T':name.startsWith('arrowl')?'←':name.startsWith('arrow')?'→':''
    if(icon)return `<span class="legacy-marker" role="img" aria-label="${icon==='R'?'Reference':icon==='A'?'Annotation':icon==='T'?'Translation':'Navigation'}">${icon}</span>`
    const alt=/\balt=["']([^"']*)/i.exec(`${before}${after}`)?.[1]||''
    return `<img ${before}src="${assetUrl(page.sourceFile,src)}"${after} loading="lazy" tabindex="0" data-lightbox alt="${esc(alt||page.title)}">`
  })
  html=html.replace(/<a\b([^>]*?)href=["']([^"']+)["']([^>]*)>/gi,(all,before,href,after)=>{
    if(/^(https?:|mailto:|tel:)/i.test(href)){const extra=/^https?:/i.test(href)?' target="_blank" rel="external noopener noreferrer"':'';return `<a ${before}href="${esc(href)}"${after}${extra}>`}
    if(href.startsWith('#'))return `<a ${before}href="${esc(href)}"${after}>`
    const normalized=resolveRelative(page.sourceFile,href);const target=targets.get(cleanPath(href))||targets.get(normalized)
    if(!target)return `<a ${before}href="${esc(href)}"${after}>`
    return `<a ${before}href="${canonicalPath(target)}" data-page-id="${target.id}" data-page-type="${target.type}"${after}>`
  })
  return html
}
export async function loadPage(id:string){return await $fetch<ContentPage>(`/content/pages/${encodeURIComponent(id)}.json`)}
export function pageForRoute(namespace:string,id:string){const p=pageById.get(id);return p&&canonicalPath(p)===`/${namespace}/${id}/`?p:null}
