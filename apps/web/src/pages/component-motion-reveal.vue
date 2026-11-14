<script setup lang="ts">
import CinematicMotionWorkbench from '../app/workbench/cinematic/CinematicMotionWorkbench.vue'
defineOptions({ name: 'ComponentMotionRevealPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <CinematicMotionWorkbench
    :title="title"
    :message="message"
    category="reveal"
  />
</template>
