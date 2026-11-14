<script setup lang="ts">
import { inject, onActivated, onDeactivated, onScopeDispose, ref } from 'vue'
import { UiCopyAction, UiScrollArea, type UiScrollController } from '@platform/ui'
import { useConsoleI18n } from '../shared/i18n'
import { routerScrollControllerKey } from '../app/router/router-scroll-controller'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import DateTimeShowcase from '../app/workbench/DateTimeShowcase.vue'
defineOptions({ name: 'WorkbenchDateTimePage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()
const { t } = useConsoleI18n()
const active = ref(true)
const registration = inject(routerScrollControllerKey)
if (registration === undefined)
  throw new Error('Date/time showcase requires Router Scroll Controller.')
let unregister: (() => void) | undefined
function connect(controller: UiScrollController | null): void {
  unregister?.()
  unregister = undefined
  if (controller !== null && active.value) unregister = registration?.(controller)
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
    :message="message"
    contained
  >
    <template #actions>
      <UiCopyAction
        variant="tertiary"
        :value="t('dateShowcase.copy')"
        :label="t('formShowcase.copyAI')"
        :copy-label="t('formShowcase.copyAI')"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
      />
    </template>
    <UiScrollArea
      class="flex-1 min-h-0 min-w-0"
      owner-id="architecture-console-content"
      :enabled="active"
      @controller="connect"
    >
      <DateTimeShowcase />
    </UiScrollArea>
  </WorkbenchPage>
</template>
