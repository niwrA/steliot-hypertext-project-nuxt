import type { ManifestPage } from '../../shared/content'
import { canonicalPath, pageKindLabel } from '../../shared/content'
export function usePageSeo(page:ManifestPage,description:string){
 const config=useRuntimeConfig();const base=String(config.public.siteUrl||'').replace(/\/$/,'');const path=canonicalPath(page);const absolute=base?`${base}${path}`:''
 const title=`${page.title} — T. S. Eliot Hypertext Project`;const desc=description.replace(/\s+/g,' ').trim().slice(0,180)||`${pageKindLabel(page.type)} in the T. S. Eliot Hypertext Project.`
 useSeoMeta({title,description:desc,ogTitle:title,ogDescription:desc,...(absolute?{ogUrl:absolute}:{}),ogImage:base?`${base}/social-preview.png`:'/social-preview.png',twitterCard:'summary_large_image',twitterTitle:title,twitterDescription:desc})
 useHead({link:absolute?[{rel:'canonical',href:absolute}]:[]})
}
