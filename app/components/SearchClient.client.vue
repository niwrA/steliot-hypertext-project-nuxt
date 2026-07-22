<script setup lang="ts">
type Entry={id:string;title:string;type:string;text:string;url:string};type Meta={file:string}
type HighlightPart={text:string;match:boolean}
const route=useRoute(),router=useRouter();const query=ref(typeof route.query.q==='string'?route.query.q:'');const entries=useState<Entry[]>('search-index',()=>[]);const loading=ref(!entries.value.length)
onMounted(async () => {
  if (!entries.value.length) {
    const metaResponse = await fetch('/content/search-meta.json')
    if (!metaResponse.ok) throw new Error(`Unable to load search metadata (${metaResponse.status})`)
    const meta = await metaResponse.json() as Meta
    const indexResponse = await fetch(`/content/${encodeURIComponent(meta.file)}`)
    if (!indexResponse.ok) throw new Error(`Unable to load search index (${indexResponse.status})`)
    entries.value = await indexResponse.json() as Entry[]
  }
  loading.value = false
})
watch(query,q=>{router.replace({path:'/search/',query:q?{q}: {}})});watch(()=>route.query.q,q=>{const v=typeof q==='string'?q:'';if(v!==query.value)query.value=v})
const terms=computed(()=>query.value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean))
const escapeRegExp=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
const highlight=(value:string):HighlightPart[]=>{
  if(!terms.value.length)return[{text:value,match:false}]
  const expression=new RegExp(`(${terms.value.slice().sort((a,b)=>b.length-a.length).map(escapeRegExp).join('|')})`,'giu')
  const matches=new Set(terms.value)
  return value.split(expression).filter(Boolean).map(text=>({text,match:matches.has(text.toLocaleLowerCase())}))
}
const results=computed(()=>{if(!terms.value.length)return[];return entries.value.map(entry=>{const title=entry.title.toLocaleLowerCase(),plainText=entry.text.replace(/\s+/g,' '),text=plainText.toLocaleLowerCase();let score=0;for(const t of terms.value){if(title===t)score+=20;else if(title.includes(t))score+=8;if(text.includes(t))score+=2}const positions=terms.value.map(t=>text.indexOf(t)).filter(n=>n>=0);const at=positions.length?Math.min(...positions):0;return{entry,score,snippet:`${at>70?'…':''}${plainText.slice(Math.max(0,at-70),at+180)}…`}}).filter(x=>x.score>=terms.value.length*2).sort((a,b)=>b.score-a.score).slice(0,60)})
</script>

<template>
  <div>
    <label for="q">Search words or exact title</label>
    <input id="q" v-model="query" type="search" maxlength="200" autocomplete="off" placeholder="Poem, person, place, phrase…">
    <p aria-live="polite">{{ loading ? 'Loading search index…' : query ? `${results.length} results` : 'Enter one or more words.' }}</p>
    <ol class="search-results">
      <li v-for="result in results" :key="result.entry.id">
        <NuxtLink :to="result.entry.url">
          <span><strong><template v-for="(part,index) in highlight(result.entry.title)" :key="index"><mark v-if="part.match">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></strong><small>{{ result.entry.type.replaceAll('-', ' ') }}</small></span>
          <p><template v-for="(part,index) in highlight(result.snippet)" :key="index"><mark v-if="part.match">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></p>
        </NuxtLink>
      </li>
    </ol>
  </div>
</template>
