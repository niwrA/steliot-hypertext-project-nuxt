<script setup lang="ts">
import type { ContentPage } from '~~/shared/content'
import { loadPage, renderLegacy } from '../utils/content'

const props = defineProps<{ rootId: string }>()
const panel = ref<ContentPage | null>(null)
const preview = ref<ContentPage | null>(null)
const previewStyle = ref<Record<string, string>>({})
const image = ref<{ src: string; alt: string } | null>(null)
const opener = ref<HTMLElement | null>(null)
let previewTimer: ReturnType<typeof setTimeout> | undefined

async function openAnnotation(anchor: HTMLAnchorElement) {
  opener.value = anchor
  preview.value = null
  try {
    panel.value = await loadPage(anchor.dataset.pageId!)
    history.pushState({}, '', `${location.pathname}?note=${anchor.dataset.pageId}`)
    await nextTick()
    document.querySelector<HTMLElement>('.panel-close')?.focus()
  } catch {
    location.assign(anchor.href)
  }
}
function click(event: MouseEvent) {
  const target = event.target as HTMLElement
  const img = target.closest<HTMLImageElement>('img[data-lightbox]')
  if (img) {
    event.preventDefault()
    opener.value = img
    image.value = { src: img.currentSrc || img.src, alt: img.alt }
    nextTick(() => document.querySelector<HTMLElement>('.lightbox-close')?.focus())
    return
  }
  const anchor = target.closest<HTMLAnchorElement>('a[data-page-type="annotation"]')
  if (anchor && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) && event.button === 0) {
    event.preventDefault()
    void openAnnotation(anchor)
  }
}
function pointerOver(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-page-type="annotation"]')
  if (!anchor?.dataset.pageId) return
  clearTimeout(previewTimer)
  previewTimer = setTimeout(async () => {
    try {
      preview.value = await loadPage(anchor.dataset.pageId!)
      const box = anchor.getBoundingClientRect()
      previewStyle.value = {
        left: `${Math.max(12, Math.min(innerWidth - 352, box.left))}px`,
        top: `${Math.max(12, Math.min(innerHeight - 232, box.bottom + 10))}px`,
      }
    } catch { preview.value = null }
  }, 180)
}
function pointerOut(event: PointerEvent) {
  const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-page-type="annotation"]')
  if (!anchor) return
  clearTimeout(previewTimer)
  previewTimer = setTimeout(() => { preview.value = null }, 120)
}
function close() {
  panel.value = null
  image.value = null
  preview.value = null
  if (location.search.includes('note=')) history.replaceState({}, '', location.pathname)
  nextTick(() => opener.value?.focus())
}
function key(event: KeyboardEvent) {
  if (event.key === 'Escape' && (panel.value || image.value)) close()
}
onMounted(() => {
  const root = document.getElementById(props.rootId)
  root?.addEventListener('click', click)
  root?.addEventListener('pointerover', pointerOver)
  root?.addEventListener('pointerout', pointerOut)
  addEventListener('keydown', key)
})
onBeforeUnmount(() => {
  const root = document.getElementById(props.rootId)
  root?.removeEventListener('click', click)
  root?.removeEventListener('pointerover', pointerOver)
  root?.removeEventListener('pointerout', pointerOut)
  removeEventListener('keydown', key)
  clearTimeout(previewTimer)
})
</script>

<template>
  <Teleport to="body">
    <aside v-if="panel" class="annotation-drawer" role="dialog" aria-modal="true" :aria-labelledby="`panel-${panel.id}`"><header class="drawer-header"><div><p class="eyebrow">Annotation</p><h2 :id="`panel-${panel.id}`">{{panel.title}}</h2></div><button class="panel-close icon-button" aria-label="Close annotation" @click="close">×</button></header><div class="drawer-body"><div class="legacy-content" v-html="renderLegacy(panel)"/></div><footer class="provenance"><NuxtLink :to="`/annotation/${panel.id}/`">Open permanent page</NuxtLink></footer></aside>
    <aside v-if="preview && !panel" class="annotation-preview" :style="previewStyle" aria-live="polite"><p class="eyebrow">Annotation preview</p><h2>{{ preview.title }}</h2><p>{{ preview.text.replace(/\s+/g, ' ').slice(0, 240) }}</p></aside>
    <div v-if="image" class="lightbox" role="dialog" aria-modal="true" aria-label="Fullscreen image"><button class="lightbox-close icon-button" aria-label="Close image" @click="close">×</button><img :src="image.src" :alt="image.alt"></div>
  </Teleport>
</template>
