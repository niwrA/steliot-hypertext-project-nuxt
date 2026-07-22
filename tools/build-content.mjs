import { createHash } from 'node:crypto'
import { copyFileSync,existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const root=resolve(import.meta.dirname,'..'),content=resolve(root,'public/content')
const manifest=JSON.parse(readFileSync(resolve(content,'manifest.json'),'utf8'))
const generated=resolve(root,'app/generated')
const generatedPages=resolve(generated,'pages')
mkdirSync(generatedPages,{recursive:true})
copyFileSync(resolve(content,'manifest.json'),resolve(generated,'manifest.json'))
for(const name of readdirSync(resolve(content,'pages')).filter(name=>name.endsWith('.json')).sort()){
  copyFileSync(resolve(content,'pages',name),resolve(generatedPages,name))
}
const namespace=t=>t==='annotation'?'annotation':['image-wrapper','bibliography-image'].includes(t)?'image':['bibliography','source-page'].includes(t)?'reference':'read'
const url=p=>`/${namespace(p.type)}/${p.id}/`
const errors=[],routes=new Map(),ids=new Set();
for(const p of manifest.pages){if(ids.has(p.id))errors.push(`Duplicate ID: ${p.id}`);ids.add(p.id);const route=url(p);if(routes.has(route))errors.push(`Duplicate canonical route: ${route}`);routes.set(route,p.id);if(!existsSync(resolve(content,'pages',`${p.id}.json`)))errors.push(`Missing content record: ${p.id}`)}
const byNamespace=new Map();for(const p of manifest.pages){const key=`${namespace(p.type)}:${p.id}`;if(byNamespace.has(key))errors.push(`Duplicate slug in namespace: ${key}`);byNamespace.set(key,p.id)}
if(manifest.pages.find(p=>p.id==='burbank-notes-title-a')?.type!=='annotation')errors.push('burbank-notes-title-a must be an annotation')
const works=manifest.pages.filter(p=>p.type==='annotated-text');if(works.some(p=>p.type==='annotation'))errors.push('Annotation included in works navigation')
for(const p of manifest.pages){const page=JSON.parse(readFileSync(resolve(content,'pages',`${p.id}.json`),'utf8'));if(page.id!==p.id)errors.push(`Record ID mismatch: ${p.id}`);for(const l of page.links||[])if(l.kind==='internal'&&l.pageId&&!ids.has(l.pageId))errors.push(`Missing internal destination: ${p.id} -> ${l.pageId}`)}
for(const asset of ['favicon.ico','favicon.svg','social-preview.png','site.webmanifest','robots.txt','staticwebapp.config.json'])if(!existsSync(resolve(root,'public',asset)))errors.push(`Missing required public asset: ${asset}`)
const raw=JSON.parse(readFileSync(resolve(content,'search-index.json'),'utf8')),seenSearch=new Set();const search=raw.map(x=>{if(seenSearch.has(x.id))errors.push(`Duplicate search ID: ${x.id}`);seenSearch.add(x.id);const p=manifest.pages.find(p=>p.id===x.id);if(!p){errors.push(`Search record missing manifest page: ${x.id}`);return {...x,url:''}}const u=url(p);if(!routes.has(u))errors.push(`Search URL has no generated route: ${u}`);if(u.includes('#/'))errors.push(`Stale hash URL: ${x.id}`);if(x.type!==p.type)errors.push(`Invalid search classification: ${x.id}`);return {...x,type:p.type,url:u}})
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
const json=JSON.stringify(search),hash=createHash('sha256').update(json).digest('hex').slice(0,12),file=`search-index.${hash}.json`
for(const old of readdirSync(content).filter(x=>/^search-index\.[a-f0-9]+\.json$/.test(x)&&x!==file)){/* old generated files are harmless locally but excluded by clean checkouts */}
writeFileSync(resolve(content,file),json);writeFileSync(resolve(content,'search-meta.json'),JSON.stringify({file,count:search.length},null,2)+'\n')
const legacy=Object.fromEntries(manifest.pages.flatMap(p=>[[`/read/${p.id}`,url(p)],[`/read/${p.slug}`,url(p)]]));writeFileSync(resolve(content,'legacy-routes.json'),JSON.stringify(legacy,null,2)+'\n')
const fixed=['/','/about/','/search/'];const all=[...fixed,...routes.keys()].sort();writeFileSync(resolve(content,'routes.json'),JSON.stringify(all,null,2)+'\n')
const base=(process.env.NUXT_PUBLIC_SITE_URL||'').replace(/\/$/,'');writeFileSync(resolve(root,'public/sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${all.map(r=>`  <url><loc>${base?base+r:r}</loc></url>`).join('\n')}\n</urlset>\n`)
console.log(JSON.stringify({records:manifest.pages.length,primaryWorks:works.length,prerenderRoutes:all.length,searchIndex:file},null,2))
