<script setup lang="ts">
import LayoutPreview from '../app/workbench/layout/LayoutPreview.vue'
defineOptions({ name: 'LayoutPreviewHeaderPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <LayoutPreview
    :title="title"
    :message="message"
    variant="header"
  />
</template>
