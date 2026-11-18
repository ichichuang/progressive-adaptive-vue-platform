<script setup lang="ts">
import { UiTable, UiTableEditor, useUiTableForm, type UiTableReadonlyRecord } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { ref, onScopeDispose, watch } from 'vue'
import { useConsoleI18n } from '../../shared/i18n'
import { useAccessBoundary } from '../access/access-boundary'
import { executeGuardedAction, type GuardedActionOutcome } from '../access/guarded-action'
import { useWorkspaceEditorNavigation } from '../router/application-navigation'
import { useShowcaseTaskTable } from './showcase-task-table'
import { useShowcaseWorld } from './showcase-session'
import { showcaseBatch } from './showcase-task-actions'

const emit = defineEmits<{ select: [id: string] }>()
const { locale } = useConsoleI18n()
const say = (en: string, zh: string) => (locale.value === 'zh-CN' ? zh : en)
const access = useAccessBoundary()
const world = useShowcaseWorld()
const props = defineProps<{ presentation: 'modal' | 'drawer' | 'page' }>()
const { guarded, demo, editor } = useShowcaseTaskTable(props.presentation)
const session = useUiTableForm({ table: guarded.table, copy: demo.copy, access: editor() })
const navigation = useWorkspaceEditorNavigation(
  () => session.form.value?.hasUnsavedChanges.value === true,
)
async function open(row: UiTableReadonlyRecord) {
  const candidate = guarded.target(row)
  if (!candidate) return
  const mode = guarded.can(row, 'save') ? 'edit' : 'detail'
  if (props.presentation === 'page') {
    await navigation.open({ name: 'access-showcase-editor', query: { mode, id: candidate.id } })
  } else await session.show(mode, row)
}
const outcomes = ref<readonly GuardedActionOutcome[]>([])
let attempt: AbortController | undefined
function clear() {
  attempt?.abort()
  outcomes.value = []
}
watch(() => access.readContext(), clear, { flush: 'sync' })
onScopeDispose(clear)
async function batch(mode: 'all' | 'partial') {
  attempt?.abort()
  const owner = new AbortController()
  attempt = owner
  const selected = new Set(guarded.table.selectedKeys.value)
  const targets = guarded.table.rows.value.flatMap((row) => {
    const target = guarded.target(row)
    return target && selected.has(target.id) ? [target] : []
  })
  const results = await executeGuardedAction(access, showcaseBatch(world), {
    mode,
    targets,
    signal: owner.signal,
  })
  if (!owner.signal.aborted) outcomes.value = results
  for (const outcome of results) {
    if (outcome.status === 'completed') await world.invalidateRecord(outcome.targetId)
  }
}
</script>

<template>
  <div class="grid min-w-0 gap-content-gap">
    <UiTable
      :table="guarded.table"
      :copy="demo.tableCopy"
    >
      <template #cell="{ row, value, column }">
        <NButton
          v-if="column.key === 'title' && typeof row['id'] === 'string' && value !== undefined"
          text
          @click="emit('select', row['id'])"
        >
          {{ String(value) }}
        </NButton>
        <NButton
          v-if="column.key === 'title' && value !== undefined"
          size="small"
          text
          @click="() => void open(row)"
        >
          {{ say('Open editor', '打开编辑器') }}
        </NButton>
        <span v-else>{{ value ?? '—' }}</span>
      </template>
    </UiTable>
    <div class="gap-control flex flex-wrap">
      <NButton @click="() => void batch('all')">
        {{ say('Complete selected together', '同时完成选中项') }}
      </NButton>
      <NButton @click="() => void batch('partial')">
        {{ say('Complete eligible selection', '完成可用的选中项') }}
      </NButton>
    </div>
    <UiTableEditor
      v-if="presentation !== 'page'"
      :session="session"
      :copy="demo.editorCopy"
    />
    <ul
      v-if="outcomes.length > 0"
      role="status"
    >
      <li
        v-for="(outcome, index) in outcomes"
        :key="outcome.targetId"
      >
        {{ index + 1 }} · {{ outcome.status }}
      </li>
    </ul>
  </div>
</template>
