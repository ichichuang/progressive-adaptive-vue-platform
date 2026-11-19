<script setup lang="ts">
import ErrorPresentation from '../app/errors/ErrorPresentation.vue'

defineOptions({ name: 'StatusPreviewMaintenancePage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>

<template>
  <ErrorPresentation
    code="SERVICE"
    :title="title"
    :message="message"
    focus-target="architecture-console-page-heading"
    contained
  />
</template>
