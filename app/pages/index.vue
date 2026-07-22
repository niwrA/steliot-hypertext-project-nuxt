<script setup lang="ts">
import { canonicalPath } from '~~/shared/content'
import { manifest } from '../utils/content'

const works = manifest.pages.filter(page => page.type === 'annotated-text')
const reading = manifest.pages.filter(page => page.type === 'reading-page')

useSeoMeta({
  title: 'T. S. Eliot Hypertext Project',
  description: 'A recovered and modernized scholarly hypertext edition of works by T. S. Eliot, created by Arwin van Arum in 1998.',
  ogTitle: 'T. S. Eliot Hypertext Project',
  ogDescription: 'A recovered and modernized scholarly hypertext edition.',
  ogImage: '/social-preview.png',
  twitterCard: 'summary_large_image',
})
</script>
<template><div><SiteHeader/><main class="browse-main"><header class="browse-hero"><p class="eyebrow">Recovered scholarship · static edition</p><h1>Read across text, annotation, image, and source.</h1><p>The T. S. Eliot Hypertext Project was created by Arwin van Arum in 1998. This modern edition returns its scholarly network to durable, independently addressable documents.</p><NuxtLink class="primary-link" to="/about/">About the project</NuxtLink></header><section><h2>Annotated works</h2><div class="card-grid"><article v-for="work in works" :key="work.id"><p class="eyebrow">Annotated work</p><h3><NuxtLink :to="canonicalPath(work)">{{work.title}}</NuxtLink></h3></article></div></section><section><h2>Other poems and reading pages</h2><ul class="browse-list"><li v-for="page in reading" :key="page.id"><NuxtLink :to="canonicalPath(page)">{{page.title}}</NuxtLink></li></ul></section></main><LegacyRedirect/></div></template>
