<script setup lang="ts">
onMounted(async () => {
  const hash = location.hash
  if (!hash.startsWith('#/')) return

  try {
    const response = await fetch('/content/legacy-routes.json')
    if (!response.ok) return
    const map = await response.json() as Record<string, string>
    const key = (hash.slice(1).split('?')[0] ?? '').replace(/\/$/, '')
    const target = map[key]
    if (target && target !== location.pathname) location.replace(target)
  } catch {
    // Unknown legacy fragments deliberately remain unchanged.
  }
})
</script>

<template>
  <span hidden aria-hidden="true" />
</template>
