<script setup lang="ts">
import ErrorPresentation from '../../app/errors/ErrorPresentation.vue'

defineOptions({ name: 'RouteOfflinePage' })
defineProps<{
  readonly title: string
  readonly message: string
}>()
</script>

<template>
  <main>
    <ErrorPresentation
      code="OFFLINE"
      :title="title"
      :message="message"
    />
  </main>
</template>
