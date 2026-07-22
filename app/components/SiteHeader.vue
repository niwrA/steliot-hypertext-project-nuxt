<script setup lang="ts">
import { canonicalPath, type ManifestPage } from '~~/shared/content'
import { manifest } from '../utils/content'

const open = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const groups: Array<[string, ManifestPage[]]> = [
  ['Annotated works', manifest.pages.filter(page => page.type === 'annotated-text')],
  ['Other poems and reading pages', manifest.pages.filter(page => page.type === 'reading-page' || page.type === 'main-text')],
  ['Essays and sources', manifest.pages.filter(page => page.type === 'source-page').slice(0, 80)],
]

async function showMenu() {
  open.value = true
  await nextTick()
  panel.value?.querySelector<HTMLElement>('a,button')?.focus()
}
function closeMenu() {
  open.value = false
  nextTick(() => menuButton.value?.focus())
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) closeMenu()
}
onMounted(() => addEventListener('keydown', onKeydown))
onBeforeUnmount(() => removeEventListener('keydown', onKeydown))
</script>

<template>
  <header class="site-header">
    <button ref="menuButton" class="menu-button" type="button" aria-label="Browse project" :aria-expanded="open" @click="showMenu">☰</button>
    <div class="brand">
      <p class="eyebrow">Modern edition · preserved source</p>
      <p class="site-title">T. S. Eliot Hypertext Project</p>
    </div>
    <nav aria-label="Main navigation">
      <NuxtLink to="/">Browse</NuxtLink>
      <NuxtLink to="/search/">Search</NuxtLink>
      <NuxtLink to="/about/">About</NuxtLink>
    </nav>
  </header>
  <Teleport to="body">
    <aside v-if="open" ref="panel" class="navigation-panel" role="dialog" aria-modal="true" aria-labelledby="browse-title">
      <header><div><p class="eyebrow">Browse</p><h2 id="browse-title">Project contents</h2></div><button class="icon-button" type="button" aria-label="Close menu" @click="closeMenu">×</button></header>
      <div class="navigation-groups">
        <section><h3>Project</h3><NuxtLink to="/" @click="closeMenu">Homepage</NuxtLink><NuxtLink to="/about/" @click="closeMenu">About this project</NuxtLink><NuxtLink to="/search/" @click="closeMenu">Search</NuxtLink></section>
        <section v-for="[title, pages] in groups" :key="title"><h3>{{ title }}</h3><NuxtLink v-for="page in pages" :key="page.id" :to="canonicalPath(page)" @click="closeMenu">{{ page.title }}</NuxtLink></section>
      </div>
    </aside>
  </Teleport>
</template>
