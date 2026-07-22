import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { canonicalPath, type Manifest } from './shared/content'

const manifest:Manifest=JSON.parse(readFileSync(resolve('public/content/manifest.json'),'utf8'))
const scholarlyRoutes=manifest.pages.map(canonicalPath).sort()
const routes=['/','/about/','/search/',...scholarlyRoutes]

export default defineNuxtConfig({
  compatibilityDate:'2026-07-22',
  ssr:true,
  css:['~/assets/css/main.css'],
  runtimeConfig:{public:{siteUrl:process.env.NUXT_PUBLIC_SITE_URL||'',issueUrl:process.env.NUXT_PUBLIC_ISSUE_URL||''}},
  app:{head:{htmlAttrs:{lang:'en'},meta:[{name:'theme-color',content:'#f2efe7'}],link:[
    {rel:'icon',href:'/favicon.ico'},{rel:'manifest',href:'/site.webmanifest'},{rel:'apple-touch-icon',href:'/apple-touch-icon.png'}
  ]}},
  nitro:{prerender:{routes,crawlLinks:false,failOnError:true},compressPublicAssets:true},
  routeRules:{'/**':{headers:{'x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}}},
  typescript:{typeCheck:true}
})
