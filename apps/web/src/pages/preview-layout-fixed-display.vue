<script setup lang="ts">
import DisplayLayoutPreview from '../app/workbench/layout/DisplayLayoutPreview.vue'
defineOptions({ name: 'LayoutPreviewFixedDisplayPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <DisplayLayoutPreview
    :title="title"
    :message="message"
    fixed
  />
</template>
