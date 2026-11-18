<script setup lang="ts">
import type { UiScrollController } from '@platform/ui'
import { inject, onScopeDispose } from 'vue'
import ShowcaseFrame from '../app/access-showcase/ShowcaseFrame.vue'
import { useShowcaseTaskTable } from '../app/access-showcase/showcase-task-table'
import type { ValidatedRouteInput } from '../app/router/route-input'
import { routerScrollControllerKey } from '../app/router/router-scroll-controller'
import TableRouteEditor from '../app/workbench/tables/TableRouteEditor.vue'
import { useConsoleI18n } from '../shared/i18n'

defineProps<{ readonly routeInput: ValidatedRouteInput<'access-showcase-editor'> }>()
defineOptions({ name: 'AccessShowcaseEditorRoute' })

const { t } = useConsoleI18n()
const { guarded, target, editor } = useShowcaseTaskTable('page')
const register = inject(routerScrollControllerKey)
let release: (() => void) | undefined
function connect(controller: UiScrollController | null) {
  release?.()
  release = controller === null ? undefined : register?.(controller)
}
onScopeDispose(() => {
  connect(null)
})
const control = {
  table: guarded.table,
  target,
  editor,
  fallback: { name: 'access-showcase-projects' },
} as const
</script>

<template>
  <ShowcaseFrame
    :title="t('route-title.access-showcase-editor')"
    :summary="t('route-message.access-showcase-editor-summary')"
    copy="UiTableEditor · page presentation · createGuardedTableEditor · validated route input and context-bound record removal."
    scroll-owned-by-child
  >
    <TableRouteEditor
      :key="routeInput.query.mode + routeInput.query.id"
      :mode="routeInput.query.mode"
      :record-id="routeInput.query.id"
      :controlled="control"
      active
      @scroll-controller="connect"
    />
  </ShowcaseFrame>
</template>
