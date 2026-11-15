<script setup lang="ts">
import RouteNotFoundView from '../app/errors/RouteNotFoundView.vue'

defineOptions({ name: 'RouteNotFoundPreviewPage' })
defineProps<{
  readonly title: string
  readonly message: string
}>()
</script>

<template>
  <RouteNotFoundView
    :title="title"
    :message="message"
  />
</template>
