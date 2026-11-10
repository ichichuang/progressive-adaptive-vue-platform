<script setup lang="ts">
import { inject, onActivated, onDeactivated, onScopeDispose, ref } from 'vue'
import { UiScrollArea, type UiScrollController } from '@platform/ui'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import TableAppearanceSpecimen from '../app/workbench/tables/TableAppearanceSpecimen.vue'
import { tableAppearanceGroups } from '../app/workbench/tables/table-appearance-gallery'
import { routerScrollControllerKey } from '../app/router/router-scroll-controller'
import { useConsoleI18n } from '../shared/i18n'

defineOptions({ name: 'ComponentTableAppearancePage' })
defineProps<{ readonly title: string; readonly message: string }>()
const { t } = useConsoleI18n()
const active = ref(true)
const register = inject(routerScrollControllerKey)
if (!register) throw new Error('The table gallery requires the Router Scroll Controller port.')
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
    <UiScrollArea
      owner-id="architecture-console-content"
      :enabled="active"
      class="flex-1 min-h-0"
      @controller="connect"
    >
      <div
        class="wb-page grid min-w-0"
        data-table-example="appearance"
      >
        <section
          v-for="group in tableAppearanceGroups"
          :key="group.id"
          class="grid min-w-0 gap-content-gap"
          :aria-label="t(group.label)"
          :data-table-style-group="group.id"
        >
          <header class="grid min-w-0 gap-component-unit">
            <h2 class="font-title-weight m-0 text-subheading text-text-primary">
              {{ t(group.label) }}
            </h2>
            <p class="m-0 text-caption text-text-secondary">
              {{ t(group.description) }}
            </p>
          </header>
          <div
            class="grid grid-cols-1 min-w-0 items-start gap-content-gap layout-regular:grid-cols-2 layout-wide:grid-cols-3"
          >
            <TableAppearanceSpecimen
              v-for="specimen in group.specimens"
              :key="specimen.id"
              :specimen="specimen"
            />
          </div>
        </section>
      </div>
    </UiScrollArea>
  </WorkbenchPage>
</template>
