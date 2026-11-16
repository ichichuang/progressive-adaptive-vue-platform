<script setup lang="ts">
import ErrorPresentation from '../../app/errors/ErrorPresentation.vue'

defineOptions({ name: 'RouteAuthenticationRequiredPage' })
defineProps<{
  readonly title: string
  readonly message: string
}>()
</script>

<template>
  <main>
    <ErrorPresentation
      code="401"
      :title="title"
      :message="message"
    />
  </main>
</template>
