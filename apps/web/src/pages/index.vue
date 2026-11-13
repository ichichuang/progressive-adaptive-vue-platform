<script setup lang="ts">
import { inject, onActivated, onDeactivated, onScopeDispose, ref } from 'vue'
import { UiScrollArea, type UiScrollController } from '@platform/ui'
import { routerScrollControllerKey } from '../app/router/router-scroll-controller'
import WelcomeExperience from '../app/workbench/WelcomeExperience.vue'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
defineOptions({ name: 'WorkbenchWelcomePage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()
const active = ref(true)
const register = inject(routerScrollControllerKey)
if (!register) throw new Error('Welcome requires the Router Scroll Controller port.')
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
  <WorkbenchPage
    :title="title"
    hide-heading
    contained
  >
    <div class="wb-home-viewport flex-1 min-h-0 min-w-0">
      <UiScrollArea
        owner-id="architecture-console-content"
        :enabled="active"
        contained
        @controller="connect"
      >
        <WelcomeExperience />
      </UiScrollArea>
    </div>
  </WorkbenchPage>
</template>
