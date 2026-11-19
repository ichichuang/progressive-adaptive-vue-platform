<script setup lang="ts">
import { UiTable, type UiTableColumn, type UiTableReadonlyRecord } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { NDrawer, NDrawerContent } from 'naive-ui/es/drawer'
import { NSelect } from 'naive-ui/es/select'
import { computed, onScopeDispose, shallowRef, watch, type ButtonHTMLAttributes } from 'vue'
import { useConsoleI18n, type ConsoleMessageKey } from '../../shared/i18n'
import { useAccessBoundary } from '../access/access-boundary'
import { AccessRequestDialog, ResourceSharingDialog } from '../access/advanced-interactions'
import { useGuardedTable } from '../tables/use-guarded-table'
import { useTableShowcase } from '../workbench/tables/table-showcase'
import type { AdministrationCommand, AdministrationModuleHost } from './administration-host'
import { parsePolicyDifferences } from './administration-records'
import type { AdministrationModule } from './administration-routes'
import AdministrationMutation from './AdministrationMutation.vue'
import { simulateAdministration } from './administration-simulation'

const props = defineProps<{
  readonly module: AdministrationModule
  readonly host: AdministrationModuleHost
}>()
const { host } = props
const access = useAccessBoundary()
const { t, locale } = useConsoleI18n()
const { tableCopy, copy } = useTableShowcase()
const selected = shallowRef<UiTableReadonlyRecord>()
const requested = shallowRef<AdministrationCommand>()
const activeRevision = computed(() => {
  const revision = selected.value?.['activeRevision']
  return typeof revision === 'string' ? revision : undefined
})
const sharingOpen = shallowRef(false)
const reviewOpen = shallowRef(false)
const matrixExpanded = shallowRef(true)
const subject = shallowRef<string | null>(null)
const simulated = shallowRef<ConsoleMessageKey>()
const simulationPending = shallowRef(false)
let simulationAttempt: AbortController | undefined

const selectedDetails = computed(() => {
  const projection = [
    ['operatorLabel', t('administration.operator')],
    ['representedLabel', t('administration.represented')],
    ['resourceLabel', t('administration.resource')],
    ['operationLabel', t('administration.operation')],
    ['occurredAt', t('administration.occurredAt')],
    ['correlation', t('administration.correlation')],
    ['reason', t('administration.reason')],
  ] as const
  return projection.flatMap(([field, label]) => {
    const value = selected.value?.[field]
    return typeof value === 'string' && value !== '' ? [{ field, label, value }] : []
  })
})
const differences = computed(() => parsePolicyDifferences(selected.value?.['differences']) ?? [])

function hostText(value: string): string {
  return host.displayText?.(value, locale.value) ?? value
}

function selectedText(field: string): string {
  const value = selected.value?.[field]
  return typeof value === 'string' ? hostText(value) : ''
}

const columns: (UiTableColumn & { readonly title: ConsoleMessageKey })[] = [
  { key: 'label', title: 'administration.subject', width: 190, fixed: 'left' },
  ...(props.module === 'roles'
    ? ([
        { key: 'capability', title: 'administration.capability', width: 200 },
        { key: 'directEffect', title: 'administration.directRule', width: 130 },
        { key: 'effective', title: 'administration.effectiveResult', width: 160 },
      ] as const)
    : []),
  { key: 'status', title: 'administration.state', width: 170 },
  { key: 'source', title: 'administration.source', width: 180 },
  { key: 'detail', title: 'administration.detail', width: 240 },
  ...(props.module === 'audit'
    ? ([{ key: 'occurredAt', title: 'administration.occurredAt', width: 200 }] as const)
    : []),
  { key: 'model', title: 'administration.model', width: 140 },
]

const guarded = useGuardedTable({
  access,
  domain: host.domain,
  resource: host.resource,
  scope: host.scope,
  recordAction: host.recordRead,
  immediate: false,
  target: (row) =>
    typeof row['id'] === 'string' && typeof row['revision'] === 'string'
      ? { id: row['id'], revision: row['revision'] }
      : undefined,
  fields: host.projection,
  translate(value) {
    const column = columns.find(({ title }) => title === value)
    return column ? t(column.title) : value
  },
  data: { kind: 'remote', read: host.read, query: host.query },
  ...(host.export ? { output: { csv: host.export } } : {}),
  schema: {
    id: `administration-${props.module}`,
    rowKey: 'id',
    source: { kind: 'remote', request: { api: 'administration-host', method: 'GET' } },
    columns,
    keywordSearch: { parameter: 'keyword', fields: ['label', 'status'] },
    pagination: { pageSize: 10, pageSizes: [10, 20, 50] },
    ...(host.export
      ? { csvExport: { fileName: `administration-${props.module}`, scopes: ['page'] as const } }
      : {}),
  },
})
const table = guarded.table
const target = computed(() => selected.value && guarded.target(selected.value))
const sharing = computed(() => selected.value && target.value && host.sharing?.(selected.value))
const review = computed(() => selected.value && target.value && host.review?.(selected.value))
const commands = computed(() => {
  const row = selected.value
  if (!row || !target.value) return []
  return (host.commands ?? []).filter(({ kind }) => {
    if (row['editable'] !== true) return false
    if (kind === 'remove-direct-rule')
      return row['source'] === 'direct' && row['model'] === 'native'
    if (kind === 'remove-direct-relation') return row['source'] === 'direct'
    if (kind === 'set-direct-rule' || kind === 'set-parent-role') return row['model'] === 'native'
    if (kind === 'publish')
      return activeRevision.value !== undefined && row['draftState'] === 'saved'
    if (kind === 'save')
      return (
        activeRevision.value !== undefined &&
        (row['draftState'] === 'unsaved' || row['draftState'] === 'saved')
      )
    return true
  })
})
function clear(): void {
  selected.value = undefined
  requested.value = undefined
  sharingOpen.value = false
  reviewOpen.value = false
  subject.value = null
}
watch(
  () => [table.rows.value, access.readContext()] as const,
  ([rows, context], previous) => {
    if (context !== previous[1] || (selected.value && !rows.includes(selected.value))) clear()
  },
  { flush: 'sync' },
)
watch(() => [selected.value, subject.value] as const, clearSimulation, { flush: 'sync' })
onScopeDispose(() => {
  clearSimulation()
})

function clearSimulation(): void {
  simulationAttempt?.abort()
  simulationAttempt = undefined
  simulated.value = undefined
  simulationPending.value = false
}

async function simulate(): Promise<void> {
  const row = selected.value
  const model = host.simulation
  const selectedTarget = target.value
  const id = subject.value
  if (!row || !model || !selectedTarget || !id || simulationPending.value) return
  const request = model.request(row)
  if (!request) return
  clearSimulation()
  const attempt = new AbortController()
  simulationAttempt = attempt
  simulationPending.value = true
  const result = await simulateAdministration(
    access,
    model,
    {
      target: selectedTarget,
      request,
      subjectId: id,
    },
    attempt.signal,
    () => selected.value === row && subject.value === id,
    () => {
      if (simulationAttempt === attempt) clearSimulation()
    },
  )
  if (simulationAttempt === attempt && !attempt.signal.aborted) {
    simulated.value =
      result.status === 'allow'
        ? 'administration.simulationAllow'
        : result.status === 'deny'
          ? 'administration.simulationDeny'
          : 'accessInteraction.unavailable'
    simulationPending.value = false
  }
}

async function refreshed(): Promise<void> {
  clear()
  await table.refresh()
}

function updateSharing(open: boolean): void {
  const shouldRefresh = !open && sharingOpen.value && target.value !== undefined
  sharingOpen.value = open
  if (shouldRefresh) void refreshed()
}

function updateReview(open: boolean): void {
  const shouldRefresh = !open && reviewOpen.value && target.value !== undefined
  reviewOpen.value = open
  if (shouldRefresh) void refreshed()
}
</script>

<template>
  <p v-if="host.completeness === 'partial'">
    {{ t('administration.partial') }}
  </p>
  <p
    v-if="table.access?.state() === 'configuration-error'"
    role="status"
  >
    {{ t('administration.configurationError') }}
  </p>
  <NButton
    v-if="module === 'roles'"
    secondary
    v-bind="{ 'aria-expanded': matrixExpanded } satisfies ButtonHTMLAttributes"
    @click="matrixExpanded = !matrixExpanded"
  >
    {{ t(matrixExpanded ? 'administration.collapseMatrix' : 'administration.expandMatrix') }}
  </NButton>
  <UiTable
    v-show="matrixExpanded"
    :table="table"
    :copy="tableCopy"
  >
    <template
      v-if="host.displayText"
      #cell="{ text }"
    >
      <span v-text="hostText(text)" />
    </template>
    <template #rowActions="{ row }">
      <NButton
        v-if="guarded.target(row)"
        size="small"
        @click="selected = row"
      >
        {{ t('administration.inspect') }}
      </NButton>
    </template>
  </UiTable>
  <NDrawer
    :show="target !== undefined"
    :width="'min(100vw, 520px)'"
    to="#pavp-overlay-root"
    @update:show="!$event && clear()"
  >
    <NDrawerContent
      :title="t('administration.detail')"
      closable
    >
      <div
        v-if="selected && target"
        class="grid min-w-0 gap-content-gap"
      >
        <strong>{{ selectedText('label') }}</strong>
        <p>{{ selectedText('status') }}</p>
        <p>{{ selectedText('source') }}</p>
        <p>{{ selectedText('detail') }}</p>
        <p
          v-if="selected['scopeLabel']"
          v-text="selectedText('scopeLabel')"
        />
        <dl
          v-if="selectedDetails.length"
          class="grid min-w-0 break-words gap-component-unit"
        >
          <template
            v-for="entry in selectedDetails"
            :key="entry.field"
          >
            <dt>{{ entry.label }}</dt>
            <dd
              class="m-0"
              v-text="entry.value"
            />
          </template>
        </dl>
        <dl
          v-if="module === 'policies'"
          class="grid min-w-0 break-words gap-component-unit"
        >
          <dt>{{ t('administration.activeRevision') }}</dt>
          <dd
            class="m-0"
            v-text="selected['activeRevision']"
          />
          <dt>{{ t('administration.confirmedPolicy') }}</dt>
          <dd
            class="m-0"
            v-text="selectedText('baselineSummary')"
          />
          <dt>{{ t('administration.draftPolicy') }}</dt>
          <dd
            class="m-0"
            v-text="selectedText('draftSummary')"
          />
        </dl>
        <ul
          v-if="differences.length"
          class="grid min-w-0 break-words gap-component-unit px-page-inline"
        >
          <li
            v-for="difference in differences"
            :key="difference.id"
          >
            <strong>{{ difference.label }}</strong>
            <p
              class="my-0"
              v-text="`${t('administration.before')} ${difference.before}`"
            />
            <p
              class="my-0"
              v-text="`${t('administration.after')} ${difference.after}`"
            />
          </li>
        </ul>
        <div class="flex flex-wrap gap-content-gap">
          <NButton
            v-for="command in commands"
            :key="command.kind"
            @click="requested = command"
          >
            {{ hostText(command.label) }}
          </NButton>
          <NButton
            v-if="sharing"
            @click="sharingOpen = true"
          >
            {{ t('accessInteraction.sharing') }}
          </NButton>
          <NButton
            v-if="review"
            @click="reviewOpen = true"
          >
            {{ t('accessInteraction.requestAccess') }}
          </NButton>
        </div>
        <template v-if="host.simulation?.request(selected)">
          <NSelect
            v-model:value="subject"
            :placeholder="t('administration.simulatedSubject')"
            :options="host.simulation.subjects.map(({ id, label }) => ({ value: id, label }))"
          />
          <NButton
            :disabled="!subject"
            :loading="simulationPending"
            @click="simulate"
          >
            {{ t('administration.simulate') }}
          </NButton>
          <p
            v-if="simulated"
            role="status"
          >
            {{ t(simulated) }}
          </p>
        </template>
      </div>
    </NDrawerContent>
  </NDrawer>
  <AdministrationMutation
    v-if="requested && target"
    :command="requested"
    :host="host"
    :target="target"
    :active-revision="activeRevision"
    :label="selectedText('label')"
    :command-label="hostText(requested.label)"
    :copy="copy"
    @close="requested = undefined"
    @saved="refreshed"
  />
  <ResourceSharingDialog
    v-if="sharing"
    :show="sharingOpen"
    :host="sharing"
    @update:show="updateSharing"
  />
  <AccessRequestDialog
    v-if="review"
    :show="reviewOpen"
    :host="review"
    @update:show="updateReview"
  />
</template>
