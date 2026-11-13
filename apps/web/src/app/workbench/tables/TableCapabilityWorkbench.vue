<script setup lang="ts">
import { inject, onActivated, onDeactivated, onScopeDispose, ref } from 'vue'
import { UiCopyAction, UiScrollArea, type UiScrollController } from '@platform/ui'
import WorkbenchPage from '../WorkbenchPage.vue'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'
import { useTableShowcase } from './table-showcase'

defineProps<{
  readonly title: string
  readonly message: string
  readonly copyValue: string
  readonly scrollControls?: boolean
}>()
defineSlots<{ default: () => unknown; controls?: () => unknown; footer?: () => unknown }>()
const { t } = useTableShowcase()
const active = ref(true)
const register = inject(routerScrollControllerKey)
if (!register) throw new Error('Table capabilities require the Router Scroll Controller port.')
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
    contained
    :title="title"
    :message="message"
    class="wb-form-page mx-auto w-full"
  >
    <template #actions>
      <UiCopyAction
        variant="text"
        :value="copyValue"
        :label="t('formShowcase.copyAI')"
        :copy-label="t('workbench.copy')"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
      />
    </template>
    <section
      :data-scroll-controls="scrollControls || undefined"
      :class="scrollControls ? 'layout-narrow:grid layout-regular:flex layout-wide:flex' : 'flex'"
      class="wb-table-stage rounded-panel flex-1 flex-col min-h-0 min-w-0 overflow-hidden bg-surface-panel"
    >
      <UiScrollArea
        v-if="$slots['controls'] && scrollControls"
        owner-id="table-showcase-controls"
        :enabled="active"
        class="h-auto layout-narrow:h-full"
      >
        <div class="wb-form-panel-header min-w-0">
          <slot name="controls" />
        </div>
      </UiScrollArea>
      <div
        v-else-if="$slots['controls']"
        class="wb-form-panel-header shrink-0 min-w-0"
      >
        <slot name="controls" />
      </div>
      <UiScrollArea
        owner-id="architecture-console-content"
        :enabled="active"
        contained
        class="flex-1 min-h-0"
        @controller="connect"
      >
        <div class="wb-form-panel-header flex flex-1 flex-col min-h-0 min-w-0 gap-content-gap">
          <slot />
        </div>
      </UiScrollArea>
      <footer
        v-if="$slots['footer']"
        class="wb-form-panel-header shrink-0 min-w-0"
      >
        <slot name="footer" />
      </footer>
    </section>
  </WorkbenchPage>
</template>
