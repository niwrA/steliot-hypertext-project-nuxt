export type PageType='annotated-text'|'annotation'|'bibliography'|'bibliography-image'|'frameset'|'image-wrapper'|'main-text'|'reading-page'|'source-page'
export interface ManifestPage { id:string; slug:string; type:PageType; title:string; sourceFile:string; url?:string }
export interface ContentPage extends ManifestPage { html:string; text:string; links:Array<{kind:string;path?:string;href?:string;resolvedPath?:string;pageId?:string;label?:string}>; images:Array<{src?:string;path?:string;alt?:string;resolvedPath?:string}>; backlinks:string[]; provenance:{edition:string;sourceFile:string} }
export interface Manifest { title:string; pageCount:number; assetCount:number; pages:ManifestPage[]; types:Record<string,number> }

export const namespaceForType=(type:PageType):'read'|'annotation'|'reference'|'image'=>{
  if(type==='annotation')return 'annotation'
  if(type==='image-wrapper'||type==='bibliography-image')return 'image'
  if(type==='bibliography'||type==='source-page')return 'reference'
  return 'read'
}
export const canonicalPath=(page:Pick<ManifestPage,'id'|'type'>)=>`/${namespaceForType(page.type)}/${page.id}/`
export const isPrimaryWork=(p:ManifestPage)=>p.type==='annotated-text'
export const pageKindLabel=(type:PageType)=>({
  'annotated-text':'Annotated work','annotation':'Annotation','bibliography':'Bibliography',
  'bibliography-image':'Image','frameset':'Project page','image-wrapper':'Image','main-text':'Reading page',
  'reading-page':'Reading page','source-page':'Reference'
}[type])
