<script setup lang="ts">
import { onActivated, onDeactivated, onMounted, onScopeDispose, ref } from 'vue'
import { useRouteRevealBoundary } from '../app/router/route-transition/route-motion-player'
import DashboardComposer from '../app/workbench/dashboard/DashboardComposer.vue'

defineOptions({ name: 'WorkbenchDashboardPage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()

const reveal = useRouteRevealBoundary()
const routeRevealed = ref(false)
let arrival = 0
async function revealDashboard(): Promise<void> {
  const current = ++arrival
  await reveal.whenRevealed()
  if (current === arrival) routeRevealed.value = true
}
onMounted(() => {
  void revealDashboard()
})
onActivated(() => {
  if (!routeRevealed.value) void revealDashboard()
})
onDeactivated(() => {
  arrival += 1
  routeRevealed.value = false
})
onScopeDispose(() => {
  arrival += 1
})
</script>

<template>
  <DashboardComposer
    :class="{ 'pointer-events-none opacity-0': !routeRevealed }"
    :title="title"
  />
</template>
