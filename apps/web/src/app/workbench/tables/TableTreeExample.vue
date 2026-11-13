<script setup lang="ts">
import { computed, effectScope, onScopeDispose, ref, shallowRef, watch } from 'vue'
import {
  UiTable,
  useUiTable,
  type UiTableReadonlyRecord,
  type UiTableSchema,
  type UiTableTransport,
} from '@platform/ui'
import { NRadioGroup, NRadioButton } from 'naive-ui/es/radio'
import { NTag } from 'naive-ui/es/tag'
import TableCapabilityWorkbench from './TableCapabilityWorkbench.vue'
import { useTableShowcase } from './table-showcase'
import type { ConsoleMessageKey } from '../../../shared/i18n'

const props = defineProps<{ readonly title: string; readonly message: string }>()
const { t, tableCopy, translate } = useTableShowcase()
const mode = ref<'static' | 'lazy'>('static')
const selectedCount = ref(0)

const treeLabels: Readonly<Record<string, ConsoleMessageKey>> = {
  'name.ops': 'tableTreeData.name.ops',
  'name.ops-east': 'tableTreeData.name.ops-east',
  'name.ops-east-a': 'tableTreeData.name.ops-east-a',
  'name.ops-east-b': 'tableTreeData.name.ops-east-b',
  'name.ops-west': 'tableTreeData.name.ops-west',
  'name.ops-west-a': 'tableTreeData.name.ops-west-a',
  'name.fin': 'tableTreeData.name.fin',
  'name.fin-ap': 'tableTreeData.name.fin-ap',
  'name.catalog': 'tableTreeData.name.catalog',
  'name.support': 'tableTreeData.name.support',
  'name.archive': 'tableTreeData.name.archive',
  'name.catalog-devices': 'tableTreeData.name.catalog-devices',
  'name.catalog-parts': 'tableTreeData.name.catalog-parts',
  'name.catalog-devices-phone': 'tableTreeData.name.catalog-devices-phone',
  'name.catalog-devices-tablet': 'tableTreeData.name.catalog-devices-tablet',
  'name.support-tickets': 'tableTreeData.name.support-tickets',
  'kind.group': 'tableTreeData.kind.group',
  'kind.region': 'tableTreeData.kind.region',
  'kind.site': 'tableTreeData.kind.site',
  'kind.team': 'tableTreeData.kind.team',
  'kind.root': 'tableTreeData.kind.root',
  'kind.leaf': 'tableTreeData.kind.leaf',
  'kind.folder': 'tableTreeData.kind.folder',
  'kind.item': 'tableTreeData.kind.item',
  'kind.queue': 'tableTreeData.kind.queue',
}
function treeLabel(key: string, fallback: string): string {
  const message = treeLabels[key]
  return message ? t(message) : fallback
}

const staticRoots: readonly UiTableReadonlyRecord[] = Object.freeze([
  {
    id: 'ops',
    name: 'Operations',
    kind: 'group',
    stock: 42,
    children: [
      {
        id: 'ops-east',
        name: 'East region',
        kind: 'region',
        stock: 18,
        children: [
          { id: 'ops-east-a', name: 'Dock A', kind: 'site', stock: 7, isLeaf: true },
          { id: 'ops-east-b', name: 'Dock B', kind: 'site', stock: 11, isLeaf: true },
        ],
      },
      {
        id: 'ops-west',
        name: 'West region',
        kind: 'region',
        stock: 24,
        children: [{ id: 'ops-west-a', name: 'Yard A', kind: 'site', stock: 24, isLeaf: true }],
      },
    ],
  },
  {
    id: 'fin',
    name: 'Finance',
    kind: 'group',
    stock: 9,
    children: [{ id: 'fin-ap', name: 'Accounts payable', kind: 'team', stock: 9, isLeaf: true }],
  },
])

const lazyRoots: readonly UiTableReadonlyRecord[] = Object.freeze([
  { id: 'catalog', name: 'Catalog', kind: 'root', stock: 3, isLeaf: false },
  { id: 'support', name: 'Support', kind: 'root', stock: 2, isLeaf: false },
  { id: 'archive', name: 'Archive', kind: 'leaf', stock: 0, isLeaf: true },
])

const lazyChildren: Readonly<Record<string, readonly UiTableReadonlyRecord[]>> = Object.freeze({
  catalog: Object.freeze([
    { id: 'catalog-devices', name: 'Devices', kind: 'folder', stock: 2, isLeaf: false },
    { id: 'catalog-parts', name: 'Parts', kind: 'folder', stock: 1, isLeaf: true },
  ]),
  'catalog-devices': Object.freeze([
    { id: 'catalog-devices-phone', name: 'Phone', kind: 'item', stock: 1, isLeaf: true },
    { id: 'catalog-devices-tablet', name: 'Tablet', kind: 'item', stock: 1, isLeaf: true },
  ]),
  support: Object.freeze([
    { id: 'support-tickets', name: 'Tickets', kind: 'queue', stock: 2, isLeaf: true },
  ]),
})

const schema = computed<UiTableSchema>(() => ({
  id: mode.value === 'static' ? 'tree-static' : 'tree-lazy',
  rowKey: 'id',
  source: { kind: 'local' },
  selection: 'multiple',
  pagination: { pageSize: 10, pageSizes: [5, 10] },
  csvExport: { fileName: 'tree-nodes.csv', scopes: ['page', 'selected'] },
  columns: [
    { key: 'name', title: 'tableCapabilities.tree.name', width: 280 },
    { key: 'kind', title: 'tableCapabilities.tree.kind', kind: 'tag', width: 140 },
    { key: 'stock', title: 'tableCapabilities.tree.stock', kind: 'number', width: 120 },
  ],
  tree: {
    childrenKey: 'children',
    leafKey: 'isLeaf',
    selectionCascade: true,
    defaultExpandedKeys: mode.value === 'static' ? ['ops'] : [],
    ...(mode.value === 'lazy'
      ? {
          childrenRequest: {
            api: 'local/tree-children',
            method: 'POST' as const,
            body: { parentId: { from: 'row.id' } },
          },
        }
      : {}),
  },
}))

const copyValue = computed(() =>
  [
    t('tableExamples.aiRequest'),
    props.title,
    t('tableCapabilities.tree.hint'),
    t('tableCapabilities.tree.unsupported'),
    'UiTable · useUiTable · schema.tree · loadTreeChildren · setExpandedKeys · setSelection',
    'apps/web/src/app/workbench/tables/TableTreeExample.vue',
    JSON.stringify(schema.value, null, 2),
  ].join('\n\n'),
)

const transport: UiTableTransport = {
  async list(request) {
    await new Promise((resolve) => setTimeout(resolve, 280))
    const parentId = request.body['parentId']
    if (typeof parentId !== 'string') throw new TypeError('Tree children require row.id.')
    const rows = lazyChildren[parentId] ?? []
    return { rows, total: rows.length }
  },
}

const tableHost = shallowRef<{ dispose: () => void; table: ReturnType<typeof useUiTable> }>()

watch(
  schema,
  (next) => {
    tableHost.value?.dispose()
    const scope = effectScope()
    const table = scope.run(() =>
      useUiTable({
        schema: next,
        rows: next.id === 'tree-static' ? staticRoots : lazyRoots,
        transport,
        translate,
        onSelectionChange: (keys) => {
          selectedCount.value = keys.length
        },
      }),
    )
    if (!table) return
    selectedCount.value = 0
    tableHost.value = {
      table,
      dispose: () => {
        table.dispose()
        scope.stop()
      },
    }
  },
  { immediate: true },
)

onScopeDispose(() => {
  tableHost.value?.dispose()
})
</script>

<template>
  <TableCapabilityWorkbench
    :title="title"
    :message="message"
    :copy-value="copyValue"
  >
    <UiTable
      v-if="tableHost"
      :key="mode"
      :table="tableHost.table"
      :copy="tableCopy"
      :height="{ mode: 'fill' }"
    >
      <template #actions>
        <div class="flex min-w-0 items-center gap-content-gap">
          <NRadioGroup
            v-model:value="mode"
            :aria-label="t('tableCapabilities.tree.mode')"
            name="table-tree-mode"
          >
            <NRadioButton value="static">
              {{ t('tableCapabilities.tree.static') }}
            </NRadioButton>
            <NRadioButton value="lazy">
              {{ t('tableCapabilities.tree.lazy') }}
            </NRadioButton>
          </NRadioGroup>
          <span
            class="tabular-nums text-caption text-text-secondary"
            role="status"
          >
            {{ t('tableCapabilities.tree.selected') }}: {{ selectedCount }}
          </span>
        </div>
      </template>
      <template #cell="{ row, column, text }">
        <NTag
          v-if="column.key === 'kind'"
          size="small"
          :bordered="false"
        >
          {{ treeLabel(`kind.${text}`, text) }}
        </NTag>
        <span v-else-if="column.key === 'name'">{{
          treeLabel(`name.${String(row['id'])}`, text)
        }}</span>
        <span v-else>{{ text }}</span>
      </template>
    </UiTable>
  </TableCapabilityWorkbench>
</template>
