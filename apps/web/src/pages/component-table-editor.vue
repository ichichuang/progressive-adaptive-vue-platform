<script setup lang="ts">
import {
  computed,
  inject,
  onActivated,
  onDeactivated,
  onScopeDispose,
  ref,
  shallowRef,
  watch,
} from 'vue'
import type { UiScrollController } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { useTableShowcase } from '../app/workbench/tables/table-showcase'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import TableRouteEditor from '../app/workbench/tables/TableRouteEditor.vue'
import type { ValidatedRouteInput } from '../app/router/route-input'
import { useApplicationNavigation } from '../app/router/application-navigation'
import { useTableEditorWorkspace } from '../app/workbench/tables/use-table-editor-workspace'
import { routerScrollControllerKey } from '../app/router/router-scroll-controller'
defineOptions({ name: 'ComponentTableEditorPage' })
const props = defineProps<{
  readonly title: string
  readonly message: string
  readonly routeInput: ValidatedRouteInput<'component-table-editor'>
}>()
const incoming = computed(() => props.routeInput.query)
const query = shallowRef(incoming.value)
const pending = shallowRef<typeof query.value | null>(null)
const editor = ref<InstanceType<typeof TableRouteEditor> | null>(null)
const { t } = useTableShowcase()
watch(incoming, (value) => {
  if (value.mode === query.value.mode && value.id === query.value.id) {
    pending.value = null
    return
  }
  if (editor.value?.dirty()) pending.value = value
  else {
    query.value = value
    pending.value = null
  }
})
function accept(): void {
  if (editor.value?.busy()) return
  if (pending.value) query.value = pending.value
  pending.value = null
}
const navigation = useApplicationNavigation()
const active = ref(true)
const { closeEditor, editorRevision } = useTableEditorWorkspace(
  () => editor.value?.dirty() === true,
)
const register = inject(routerScrollControllerKey)
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
  >
    <div
      class="wb-form-panel-header rounded-panel flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden bg-surface-panel gap-content-gap"
    >
      <div
        v-if="pending"
        role="alert"
        class="shrink-0 grid gap-content-gap"
      >
        <p class="m-0 text-body text-text-secondary">
          {{ t('tableShowcase.pendingEditor') }}
        </p>
        <div class="flex flex-wrap gap-component-unit">
          <NButton
            class="min-h-target-enhanced"
            :disabled="editor?.busy() === true"
            @click="accept"
          >
            {{ t('tableShowcase.discardAndOpen') }}
          </NButton>
          <NButton
            class="min-h-target-enhanced"
            @click="navigation.navigate({ name: 'component-table-editor', query })"
          >
            {{ t('tableShowcase.keepEditing') }}
          </NButton>
        </div>
      </div>
      <TableRouteEditor
        ref="editor"
        :key="`${editorRevision}:${query.mode}:${query.id ?? ''}`"
        :active="active"
        :mode="query.mode"
        :record-id="query.id"
        @closed="closeEditor"
        @scroll-controller="connect"
      />
    </div>
  </WorkbenchPage>
</template>
