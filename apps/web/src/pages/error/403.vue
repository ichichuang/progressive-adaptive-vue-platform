<script setup lang="ts">
import ErrorPresentation from '../../app/errors/ErrorPresentation.vue'

defineOptions({ name: 'RoutePermissionDeniedPage' })
defineProps<{
  readonly title: string
  readonly message: string
}>()
</script>

<template>
  <main>
    <ErrorPresentation
      code="403"
      :title="title"
      :message="message"
    />
  </main>
</template>
