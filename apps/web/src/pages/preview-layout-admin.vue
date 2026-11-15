<script setup lang="ts">
import LayoutPreview from '../app/workbench/layout/LayoutPreview.vue'
defineOptions({ name: 'LayoutPreviewAdminPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <LayoutPreview
    :title="title"
    :message="message"
    variant="admin"
  />
</template>
