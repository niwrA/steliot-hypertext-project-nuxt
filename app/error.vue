<script setup lang="ts">
defineProps<{ error: { statusCode: number; statusMessage?: string } }>()
useSeoMeta({
  title: 'Page not found — T. S. Eliot Hypertext Project',
  robots: 'noindex',
})
</script>

<template>
  <div>
    <SiteHeader />
    <main class="error-page">
      <p class="eyebrow">{{ error.statusCode }}</p>
      <h1>{{ error.statusCode === 404 ? 'Page not found' : error.statusMessage }}</h1>
      <p>The requested scholarly document does not exist at this address.</p>
      <NuxtLink to="/">Browse the edition</NuxtLink> ·
      <NuxtLink to="/search/">Search</NuxtLink>
    </main>
  </div>
</template>
