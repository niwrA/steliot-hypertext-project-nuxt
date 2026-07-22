<script setup lang="ts">
import { loadPage, pageForRoute } from '../../utils/content'
const route = useRoute()
const id = String(route.params.slug)
const meta = pageForRoute('reference', id)
if (!meta) throw createError({ statusCode: 404, statusMessage: 'Reference not found' })
const page = await loadPage(id)
usePageSeo(page, page.text)
</script>
<template><ScholarlyDocument :page="page" /></template>
