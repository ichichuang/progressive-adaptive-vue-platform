<script setup lang="ts">
import LayoutPreview from '../app/workbench/layout/LayoutPreview.vue'
defineOptions({ name: 'LayoutPreviewContentFooterPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <LayoutPreview
    :title="title"
    :message="message"
    variant="content-footer"
  />
</template>
