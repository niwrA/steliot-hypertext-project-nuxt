<script setup lang="ts">
useSeoMeta({
  title: 'Search — T. S. Eliot Hypertext Project',
  description: 'Search works, annotations, references, and images in the T. S. Eliot Hypertext Project.',
})
</script>

<template>
  <div>
    <SiteHeader />
    <main class="search-page">
      <header>
        <p class="eyebrow">Project search</p>
        <h1>Search the edition</h1>
      </header>
      <SearchClient />
      <noscript>
        <p>Search requires JavaScript to load the static index. You can still <a href="/">browse works and reading pages</a>.</p>
      </noscript>
    </main>
  </div>
</template>
