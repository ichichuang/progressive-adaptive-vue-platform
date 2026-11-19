<script setup lang="ts">
import ErrorPresentation from '../app/errors/ErrorPresentation.vue'

defineOptions({ name: 'StatusPreview400Page' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>

<template>
  <ErrorPresentation
    code="400"
    :title="title"
    :message="message"
    focus-target="architecture-console-page-heading"
    contained
  />
</template>
