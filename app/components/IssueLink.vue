<script setup lang="ts">
const props = defineProps<{ id: string; title: string; type: string }>()
const config = useRuntimeConfig()
const href = computed(() => {
  const base = String(config.public.issueUrl || '')
  if (!base) return ''
  const body = `Page: ${locationSafe()}\nContent ID: ${props.id}\nType: ${props.type}\nTitle: ${props.title}`
  const join = base.includes('?') ? '&' : '?'
  return `${base}${join}title=${encodeURIComponent(`Issue: ${props.title}`)}&body=${encodeURIComponent(body)}`
})
function locationSafe() {
  return import.meta.client ? location.href : `(page URL: ${props.id})`
}
</script>
<template><a v-if="href" :href="href" target="_blank" rel="noopener noreferrer">Report an issue</a><a v-else href="mailto:?subject=T.%20S.%20Eliot%20Hypertext%20Project%20correction">Report an issue</a></template>
