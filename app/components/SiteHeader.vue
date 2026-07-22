<script setup lang="ts">
import { canonicalPath } from '../../shared/content'
import { manifest } from '../utils/content'

defineProps<{ compact?: boolean }>()

const navigationOpen = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)

const groups = [
  { title: 'Annotated works', pages: manifest.pages.filter(page => page.type === 'annotated-text') },
  { title: 'Other poems and reading pages', pages: manifest.pages.filter(page => ['reading-page', 'main-text'].includes(page.type)) },
  { title: 'Essays and sources', pages: manifest.pages.filter(page => page.type === 'source-page' && !page.sourceFile.toLowerCase().includes('_notes/')) },
  { title: 'Project', pages: manifest.pages.filter(page => ['eliot-introduction', 'eliot-life', 'eliot-works', 'eliot-books', 'eliot-credits'].includes(page.id)) },
].filter(group => group.pages.length)

async function openNavigation() {
  navigationOpen.value = true
  await nextTick()
  closeButton.value?.focus()
}

async function closeNavigation() {
  navigationOpen.value = false
  await nextTick()
  menuButton.value?.focus()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && navigationOpen.value) closeNavigation()
}

onMounted(() => addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => removeEventListener('keydown', handleKeydown))
</script>

<template>
  <header class="site-header">
    <button ref="menuButton" class="menu-button" type="button" aria-label="Browse project" :aria-expanded="navigationOpen" @click="openNavigation">☰</button>
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
    <div v-if="navigationOpen" class="navigation-backdrop" @click.self="closeNavigation">
      <aside class="navigation-panel" role="dialog" aria-modal="true" aria-labelledby="navigation-title">
        <header>
          <div>
            <p class="eyebrow">Browse</p>
            <h2 id="navigation-title">Project contents</h2>
          </div>
          <button ref="closeButton" class="icon-button" type="button" aria-label="Close project navigation" @click="closeNavigation">×</button>
        </header>
        <div class="navigation-groups">
          <section class="navigation-about">
            <h3>About</h3>
            <NuxtLink to="/about/" @click="closeNavigation">About this project</NuxtLink>
          </section>
          <section v-for="group in groups" :key="group.title">
            <h3>{{ group.title }}</h3>
            <NuxtLink v-for="page in group.pages" :key="page.id" :to="canonicalPath(page)" @click="closeNavigation">{{ page.title }}</NuxtLink>
          </section>
        </div>
      </aside>
    </div>
  </Teleport>
</template>
