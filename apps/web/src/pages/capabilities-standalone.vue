<script setup lang="ts">
import CapabilityRoadmapContent from '../app/console/CapabilityRoadmapContent.vue'

defineOptions({ name: 'CapabilityRoadmapStandalonePage' })
defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()
</script>

<template>
  <CapabilityRoadmapContent
    :breadcrumb="breadcrumb"
    :message="message"
    :title="title"
  />
</template>
