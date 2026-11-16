<script setup lang="ts">
import ErrorPresentation from './ErrorPresentation.vue'

defineOptions({ name: 'RouteNotFoundView' })
defineProps<{
  readonly title: string
  readonly message: string
}>()
</script>

<template>
  <main>
    <ErrorPresentation
      code="404"
      :title="title"
      :message="message"
    />
  </main>
</template>
