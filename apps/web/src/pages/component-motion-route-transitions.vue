<script setup lang="ts">
import RouteTransitionWorkbench from '../app/workbench/cinematic/RouteTransitionWorkbench.vue'
import type { ValidatedRouteInput } from '../app/router/route-input'
defineOptions({ name: 'ComponentMotionRouteTransitionsPage' })
defineProps<{
  readonly title: string
  readonly message: string
  readonly routeInput: ValidatedRouteInput<'component-motion-route-transitions'>
}>()
</script>
<template>
  <RouteTransitionWorkbench
    :title="title"
    :message="message"
    :route-input="routeInput"
    stage="a"
  />
</template>
