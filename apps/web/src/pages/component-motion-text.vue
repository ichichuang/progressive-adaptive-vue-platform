<script setup lang="ts">
import CinematicMotionWorkbench from '../app/workbench/cinematic/CinematicMotionWorkbench.vue'
defineOptions({ name: 'ComponentMotionTextPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <CinematicMotionWorkbench
    :title="title"
    :message="message"
    category="text"
  />
</template>
