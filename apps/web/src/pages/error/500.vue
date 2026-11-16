<script setup lang="ts">
import ErrorPresentation from '../../app/errors/ErrorPresentation.vue'

defineOptions({ name: 'RouteApplicationFailurePage' })
defineProps<{
  readonly title: string
  readonly message: string
}>()
</script>

<template>
  <main>
    <ErrorPresentation
      code="500"
      :title="title"
      :message="message"
    />
  </main>
</template>
