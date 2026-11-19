<script setup lang="ts">
import ErrorPresentation from '../app/errors/ErrorPresentation.vue'

defineOptions({ name: 'StatusPreviewOfflinePage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>

<template>
  <ErrorPresentation
    code="OFFLINE"
    :title="title"
    :message="message"
    focus-target="architecture-console-page-heading"
    contained
  />
</template>
