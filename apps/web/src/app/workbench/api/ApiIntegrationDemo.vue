<script setup lang="ts">
import { inject, onActivated, onDeactivated, onScopeDispose, ref } from 'vue'
import { UiScrollArea, type UiScrollController } from '@platform/ui'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'
import ApiIntegrationTable from './ApiIntegrationTable.vue'
const active = ref(true)
const register = inject(routerScrollControllerKey)
if (!register) throw new Error('API integration requires the Router Scroll Controller port.')
let unregister: (() => void) | undefined
function connect(controller: UiScrollController | null): void {
  unregister?.()
  unregister = undefined
  if (controller && active.value) unregister = register?.(controller)
}
onActivated(() => {
  active.value = true
})
onDeactivated(() => {
  active.value = false
  connect(null)
})
onScopeDispose(() => {
  connect(null)
})
</script>
<template>
  <UiScrollArea
    owner-id="architecture-console-content"
    :enabled="active"
    contained
    class="flex-1 min-h-0 min-w-0"
    @controller="connect"
  >
    <ApiIntegrationTable v-if="active" />
  </UiScrollArea>
</template>
