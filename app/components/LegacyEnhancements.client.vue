<script setup lang="ts">
import type { ContentPage } from '../../shared/content'
import { assetUrl, loadPage, renderLegacy } from '../utils/content'

const props = defineProps<{ rootId: string }>()
const panel = ref<ContentPage | null>(null)
const image = ref<{ src: string; alt: string; title: string } | null>(null)
const fullscreenImage = ref<{ src: string; alt: string; title: string } | null>(null)
const annotationPreview = ref<ContentPage | null>(null)
const imagePreview = ref<{ src: string; alt: string } | null>(null)
const previewPosition = ref<{ left: number; top: number } | null>(null)
const opener = ref<HTMLElement | null>(null)
const debugEnabled = ref(false)
const debugStatus = ref('disabled')
let previewTimer: ReturnType<typeof setTimeout> | undefined
let previewRequest = 0

function debug(message: string, detail?: unknown) {
  if (!debugEnabled.value) return
  debugStatus.value = message
  if (detail === undefined) console.info(`[Eliot hover] ${message}`)
  else console.info(`[Eliot hover] ${message}`, detail)
}

function positionFor(anchor: HTMLElement, width: number, height: number) {
  const rect = anchor.getBoundingClientRect()
  return {
    left: Math.max(12, Math.min(innerWidth - width - 12, rect.left + rect.width / 2 - width / 2)),
    top: Math.max(12, Math.min(innerHeight - height - 12, rect.bottom + 10)),
  }
}

async function click(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!isInsideContent(target)) return
  const clickedImage = target.closest<HTMLImageElement>('img[data-lightbox]')
  if (clickedImage) {
    event.preventDefault()
    opener.value = clickedImage
    image.value = {
      src: clickedImage.currentSrc || clickedImage.src,
      alt: clickedImage.alt,
      title: clickedImage.title || clickedImage.alt || 'Project image',
    }
    annotationPreview.value = null
    imagePreview.value = null
    await nextTick()
    document.querySelector<HTMLElement>('.lightbox-close')?.focus()
    return
  }

  const anchor = target.closest<HTMLAnchorElement>('a[data-page-type="annotation"]')
  if (anchor && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) && event.button === 0) {
    event.preventDefault()
    opener.value = anchor
    panel.value = await loadPage(anchor.dataset.pageId!)
    annotationPreview.value = null
    history.pushState({}, '', `${location.pathname}?note=${anchor.dataset.pageId}`)
    await nextTick()
    document.querySelector<HTMLElement>('.panel-close')?.focus()
  }
}

function isInsideContent(target: HTMLElement) {
  return document.getElementById(props.rootId)?.contains(target) ?? false
}

function pointerOver(event: MouseEvent) {
  const target = event.currentTarget instanceof HTMLElement
    ? event.currentTarget
    : event.target as HTMLElement
  debug('mouseenter received', {
    tag: target.tagName,
    pageId: target.dataset.pageId,
    pageType: target.dataset.pageType,
    text: target.textContent?.trim().slice(0, 80),
  })
  if (!isInsideContent(target)) {
    debug('ignored: target is outside scholarly content')
    return
  }
  if (!matchMedia('(hover: hover)').matches) {
    debug('ignored: browser reports no hover capability')
    return
  }
  clearTimeout(previewTimer)
  const hoveredImage = target.closest<HTMLImageElement>('img[data-lightbox]')
  if (hoveredImage) {
    previewTimer = setTimeout(() => {
      annotationPreview.value = null
      imagePreview.value = { src: hoveredImage.currentSrc || hoveredImage.src, alt: hoveredImage.alt }
      previewPosition.value = positionFor(hoveredImage, 320, 170)
      debug('inline image preview shown', imagePreview.value)
    }, 220)
    return
  }

  const imageLink = target.closest<HTMLAnchorElement>('a[data-page-type="image-wrapper"], a[data-page-type="bibliography-image"]')
  if (imageLink?.dataset.pageId) {
    const request = ++previewRequest
    previewTimer = setTimeout(async () => {
      try {
        debug('loading image-wrapper record', imageLink.dataset.pageId)
        const page = await loadPage(imageLink.dataset.pageId!)
        const source = page.images?.[0]?.path || page.images?.[0]?.src
        if (request === previewRequest && source) {
          annotationPreview.value = null
          imagePreview.value = { src: assetUrl(page.sourceFile, source), alt: page.images?.[0]?.alt || page.title }
          previewPosition.value = positionFor(imageLink, 320, 170)
          debug('image-wrapper preview shown', { id: page.id, src: imagePreview.value?.src })
        }
      } catch (error) {
        debug('image-wrapper preview failed', error)
        if (debugEnabled.value) console.error('[Eliot hover] image-wrapper preview failed', error)
        if (request === previewRequest) imagePreview.value = null
      }
    }, 220)
    return
  }

  const anchor = target.closest<HTMLAnchorElement>('a[data-page-type="annotation"]')
  if (anchor?.dataset.pageId) {
    const request = ++previewRequest
    previewTimer = setTimeout(async () => {
      try {
        debug('loading annotation record', anchor.dataset.pageId)
        const page = await loadPage(anchor.dataset.pageId!)
        if (request === previewRequest) {
          imagePreview.value = null
          annotationPreview.value = page
          previewPosition.value = positionFor(anchor, 340, 220)
          debug('annotation preview shown', { id: page.id, title: page.title, position: previewPosition.value })
        }
      } catch (error) {
        debug('annotation preview failed', error)
        if (debugEnabled.value) console.error('[Eliot hover] annotation preview failed', error)
        if (request === previewRequest) annotationPreview.value = null
      }
    }, 220)
  }
}

function pointerOut(event: MouseEvent) {
  const target = event.currentTarget instanceof HTMLElement
    ? event.currentTarget
    : event.target as HTMLElement
  debug('mouseleave received', { pageId: target.dataset.pageId, pageType: target.dataset.pageType })
  if (!isInsideContent(target)) return
  const related = event.relatedTarget as Node | null
  const previewTarget = target.closest('img[data-lightbox], a[data-page-type="annotation"], a[data-page-type="image-wrapper"], a[data-page-type="bibliography-image"]')
  if (previewTarget && (!related || !previewTarget.contains(related))) {
    clearTimeout(previewTimer)
    previewRequest++
    setTimeout(() => {
      annotationPreview.value = null
      imagePreview.value = null
      previewPosition.value = null
    }, 100)
  }
}

function close() {
  panel.value = null
  image.value = null
  fullscreenImage.value = null
  if (location.search.includes('note=')) history.replaceState({}, '', location.pathname)
  nextTick(() => opener.value?.focus())
}

function key(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (fullscreenImage.value) {
    fullscreenImage.value = null
    nextTick(() => document.querySelector<HTMLElement>('.drawer-image-stage')?.focus())
  } else if (panel.value || image.value) close()
}

const hoverTargets: HTMLElement[] = []

function removeHoverTargets() {
  for (const target of hoverTargets) {
    target.removeEventListener('mouseenter', pointerOver)
    target.removeEventListener('mouseleave', pointerOut)
  }
  hoverTargets.length = 0
}

function installHoverTargets() {
  removeHoverTargets()
  const root = document.getElementById(props.rootId)
  root?.querySelectorAll<HTMLElement>([
    'a[data-page-type="image-wrapper"]',
    'a[data-page-type="bibliography-image"]',
    'img[data-lightbox]',
  ].join(', ')).forEach((target) => {
    target.addEventListener('mouseenter', pointerOver)
    target.addEventListener('mouseleave', pointerOut)
    hoverTargets.push(target)
  })
  debug(`bound ${hoverTargets.length} hover targets`, {
    rootId: props.rootId,
    annotations: root?.querySelectorAll('a[data-page-type="annotation"]').length ?? 0,
    images: root?.querySelectorAll('img[data-lightbox], a[data-page-type="image-wrapper"], a[data-page-type="bibliography-image"]').length ?? 0,
  })
}

onMounted(async () => {
  const params = new URLSearchParams(location.search)
  debugEnabled.value = params.get('debugHover') === '1' || localStorage.getItem('eliot.debugHover') === 'true'
  debug('enhancement mounted', { rootId: props.rootId, rootPresent: Boolean(document.getElementById(props.rootId)) })
  document.addEventListener('click', click)
  addEventListener('keydown', key)

  // This client-only enhancement may mount before Nuxt has hydrated the
  // server-rendered v-html subtree. Bind after hydration and one paint.
  await nextTick()
  requestAnimationFrame(installHoverTargets)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', click)
  removeEventListener('keydown', key)
  removeHoverTargets()
  clearTimeout(previewTimer)
})

watch(() => props.rootId, async () => {
  await nextTick()
  requestAnimationFrame(installHoverTargets)
})
</script>

<template>
  <Teleport to="body">
    <aside v-if="panel" class="annotation-drawer" role="dialog" aria-modal="true" :aria-labelledby="`panel-${panel.id}`">
      <header class="drawer-header">
        <div><p class="eyebrow">Annotation</p><h2 :id="`panel-${panel.id}`">{{ panel.title }}</h2></div>
        <button class="panel-close icon-button" aria-label="Close annotation" @click="close">×</button>
      </header>
      <div class="drawer-body"><div class="legacy-content" v-html="renderLegacy(panel)" /></div>
      <footer class="provenance"><NuxtLink :to="`/annotation/${panel.id}/`">Open permanent page</NuxtLink></footer>
    </aside>

    <aside v-if="image" class="annotation-drawer image-drawer" role="dialog" aria-modal="true" :aria-labelledby="`image-drawer-title-${rootId}`">
      <header class="drawer-header">
        <div><p class="eyebrow">Project image</p><h2 :id="`image-drawer-title-${rootId}`">{{ image.title }}</h2></div>
        <button class="panel-close icon-button" aria-label="Close image panel" @click="close">×</button>
      </header>
      <div class="drawer-body">
        <button class="drawer-image-stage" type="button" aria-label="Open image fullscreen" @click="fullscreenImage = image">
          <img :src="image.src" :alt="image.alt">
          <span>Open fullscreen</span>
        </button>
        <div class="image-metadata">
          <p>{{ image.alt || image.title }}</p>
        </div>
      </div>
    </aside>

    <div v-if="fullscreenImage" class="lightbox" role="dialog" aria-modal="true" :aria-label="`Fullscreen image: ${fullscreenImage.title}`">
      <button class="lightbox-close icon-button" aria-label="Close fullscreen image" @click="fullscreenImage = null">×</button>
      <img :src="fullscreenImage.src" :alt="fullscreenImage.alt">
    </div>

    <aside v-if="annotationPreview && previewPosition" class="annotation-preview" :style="previewPosition" aria-live="polite">
      <p class="eyebrow">Annotation preview</p>
      <h3>{{ annotationPreview.title }}</h3>
      <p>{{ annotationPreview.text.replace(/\s+/g, ' ').trim().slice(0, 230) }}{{ annotationPreview.text.length > 230 ? '…' : '' }}</p>
    </aside>

    <aside v-if="imagePreview && previewPosition" class="image-preview" :style="previewPosition" aria-live="polite">
      <img :src="imagePreview.src" :alt="imagePreview.alt">
      <div><p class="eyebrow">Image preview</p><strong>{{ imagePreview.alt }}</strong></div>
    </aside>

    <output v-if="debugEnabled" class="hover-debug" aria-live="polite">
      <strong>Hover debug</strong>
      <span>{{ debugStatus }}</span>
      <span>Bound targets: {{ hoverTargets.length }}</span>
    </output>
  </Teleport>
</template>
