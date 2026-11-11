<script setup lang="ts">
import { computed, onDeactivated, onScopeDispose, ref, shallowRef, watch } from 'vue'
import { UiTable, useUiTable, type UiTableSchema } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { NCheckbox } from 'naive-ui/es/checkbox'
import { NInputNumber } from 'naive-ui/es/input-number'
import { NPopover } from 'naive-ui/es/popover'
import { NSelect } from 'naive-ui/es/select'
import TableCapabilityWorkbench from './TableCapabilityWorkbench.vue'
import { createLocalProductTable } from './local-product-table'
import { useTableShowcase } from './table-showcase'
import {
  tableLayoutColumns,
  tableLayoutSchema,
  type TableLayoutExample,
  type TableLayoutViewport,
} from './table-layout-examples'

const props = defineProps<{
  readonly title: string
  readonly message: string
  readonly example: TableLayoutExample
}>()
const demo = useTableShowcase()
const { t } = demo
const hintOpen = ref(false)
onDeactivated(() => {
  hintOpen.value = false
})
const viewport = ref<TableLayoutViewport>(props.example === 'responsive' ? 'full' : 'regular')
const initialSchema = tableLayoutSchema(props.example)
const initialTitleWidth = initialSchema.columns.find((column) => column.key === 'title')?.width
const initialDescriptionWidth = initialSchema.columns.find(
  (column) => column.key === 'description',
)?.width
if (initialTitleWidth === undefined || initialDescriptionWidth === undefined)
  throw new TypeError('Table layout examples require initial title and description widths.')
const defaultTitleWidth = initialTitleWidth
const titleWidth = ref(defaultTitleWidth)
const flexibleTitle = ref(false)
const pinnedLeft = ref(props.example === 'scroll')
const pinnedRight = ref(props.example === 'scroll')
const local = createLocalProductTable()
const rows = computed(() =>
  local.rows.map((row) => ({
    ...row,
    description: `${typeof row['title'] === 'string' ? row['title'] : 'PAVP'} · ${t('tableCapabilities.layout.longDescription')}`,
  })),
)
function createTable(schema: UiTableSchema) {
  return useUiTable({ schema, rows: rows.value, translate: demo.translate })
}
const table = shallowRef(createTable(initialSchema))
onScopeDispose(() => {
  table.value.dispose()
})
watch(rows, (next) => {
  void table.value.setRows(next)
})
const appliedTitle = computed(() =>
  table.value.columns.value.find((column) => column.key === 'title'),
)
const appliedDescription = computed(() =>
  table.value.columns.value.find((column) => column.key === 'description'),
)
const widthsPending = computed(() =>
  flexibleTitle.value
    ? appliedTitle.value?.width !== undefined || appliedDescription.value?.width !== undefined
    : appliedTitle.value?.width !== titleWidth.value ||
      appliedDescription.value?.width !== initialDescriptionWidth,
)
const viewportOptions = computed(() => [
  { label: t('tableCapabilities.layout.viewportFull'), value: 'full' },
  { label: t('tableCapabilities.layout.viewportRegular'), value: 'regular' },
  { label: t('tableCapabilities.layout.viewportNarrow'), value: 'narrow' },
])
const viewportToken = computed(() =>
  viewport.value === 'regular'
    ? 'layout.profile.regular.min-inline-size'
    : viewport.value === 'narrow'
      ? 'layout.admin.content.minimum-inline-size'
      : t('tableCapabilities.layout.availableSpace'),
)
const hint = computed(() =>
  t(
    props.example === 'scroll'
      ? 'tableCapabilities.layout.scrollHint'
      : props.example === 'widths'
        ? 'tableCapabilities.layout.widthsHint'
        : 'tableCapabilities.layout.responsiveHint',
  ),
)
const boundary = computed(() =>
  t(
    props.example === 'scroll'
      ? 'tableCapabilities.layout.scrollBoundary'
      : props.example === 'widths'
        ? 'tableCapabilities.layout.widthsBoundary'
        : 'tableCapabilities.layout.responsiveBoundary',
  ),
)
const visibleColumns = computed(
  () => table.value.columns.value.filter((column) => !column.hidden).length,
)
const copyValue = computed(() =>
  [
    t('tableCapabilities.layout.copyInstruction'),
    props.title,
    props.message,
    hint.value,
    boundary.value,
    `${t('tableCapabilities.layout.containerToken')}: ${viewportToken.value}`,
    'UiTable · useUiTable · columns.width · columns.fixed · height: fill · setColumnVisibility · moveColumn',
    'apps/web/src/app/workbench/tables/TableLayoutExample.vue',
    t('tableCapabilities.layout.configuration'),
    JSON.stringify({ ...table.value.schema, columns: table.value.columns.value }, null, 2),
  ].join('\n\n'),
)

function replaceTable(schema: UiTableSchema): void {
  table.value.dispose()
  table.value = createTable(schema)
}
function apply(): void {
  replaceTable({
    ...table.value.schema,
    columns: tableLayoutColumns(
      table.value.columns.value,
      { title: titleWidth.value, flexibleTitle: flexibleTitle.value },
      { left: pinnedLeft.value, right: pinnedRight.value },
    ),
  })
}
function reset(): void {
  titleWidth.value = defaultTitleWidth
  flexibleTitle.value = false
  pinnedLeft.value = props.example === 'scroll'
  pinnedRight.value = props.example === 'scroll'
  viewport.value = props.example === 'responsive' ? 'full' : 'regular'
  replaceTable(initialSchema)
}
function updateTitleWidth(value: number | null): void {
  if (value !== null && Number.isFinite(value) && value >= 80 && value <= 640)
    titleWidth.value = value
}
function updateViewport(value: string): void {
  if (value === 'full' || value === 'regular' || value === 'narrow') viewport.value = value
}
function updatePinnedLeft(value: boolean): void {
  pinnedLeft.value = value
  apply()
}
function updatePinnedRight(value: boolean): void {
  pinnedRight.value = value
  apply()
}
</script>

<template>
  <TableCapabilityWorkbench
    :title="title"
    :message="message"
    :copy-value="copyValue"
  >
    <template #controls>
      <div class="grid min-w-0 gap-content-gap">
        <div class="flex flex-wrap min-w-0 items-end gap-content-gap">
          <div
            v-if="example !== 'widths'"
            class="wb-layout-control grid min-w-0 gap-component-unit"
          >
            <span class="sr-only">{{ t('tableCapabilities.layout.viewport') }}</span>
            <NSelect
              :value="viewport"
              :options="viewportOptions"
              :aria-label="t('tableCapabilities.layout.viewport')"
              @update:value="updateViewport"
            />
          </div>
          <template v-if="example === 'scroll'">
            <div class="flex flex-wrap min-w-0 gap-content-gap">
              <NCheckbox
                :checked="pinnedLeft"
                @update:checked="updatePinnedLeft"
              >
                {{ t('tableCapabilities.layout.fixedLeft') }}
              </NCheckbox>
              <NCheckbox
                :checked="pinnedRight"
                @update:checked="updatePinnedRight"
              >
                {{ t('tableCapabilities.layout.fixedRight') }}
              </NCheckbox>
            </div>
          </template>
          <template v-if="example === 'widths'">
            <div class="wb-layout-control grid min-w-0 gap-component-unit">
              <span class="text-caption text-text-secondary">{{
                t('tableCapabilities.layout.titleWidth')
              }}</span>
              <NInputNumber
                :value="titleWidth"
                :min="80"
                :max="640"
                :step="40"
                :disabled="flexibleTitle"
                :input-props="{ 'aria-label': t('tableCapabilities.layout.titleWidth') }"
                @update:value="updateTitleWidth"
              />
            </div>
            <NCheckbox v-model:checked="flexibleTitle">
              {{ t('tableCapabilities.layout.flexibleTitle') }}
            </NCheckbox>
          </template>
        </div>
        <p
          class="m-0 text-caption text-text-secondary layout-narrow:hidden"
          v-text="hint"
        />
      </div>
    </template>
    <div
      class="wb-layout-preview mx-auto flex flex-1 flex-col min-h-0 min-w-0 w-full gap-content-gap"
      :data-viewport="viewport"
      :data-table-layout-example="example"
    >
      <UiTable
        :table="table"
        :copy="demo.tableCopy"
      >
        <template #actions>
          <NPopover
            v-model:show="hintOpen"
            trigger="click"
            to="#pavp-overlay-root"
          >
            <template #trigger>
              <NButton
                quaternary
                class="hidden min-h-target-enhanced layout-narrow:inline-flex"
                :aria-label="hint"
              >
                <span
                  class="i-lucide-info"
                  aria-hidden="true"
                />
              </NButton>
            </template>
            {{ hint }}
          </NPopover>
          <span
            class="text-caption text-text-secondary"
            v-text="
              `${t('tableCapabilities.layout.visibleColumns')} ${String(visibleColumns)} / ${String(table.columns.value.length)}`
            "
          />
        </template>
      </UiTable>
    </div>
    <template #footer>
      <div class="flex flex-wrap min-w-0 items-center justify-between gap-content-gap">
        <span
          v-if="example === 'widths'"
          class="text-caption text-text-secondary"
          role="status"
          aria-live="polite"
        >
          {{
            t(
              widthsPending
                ? 'tableCapabilities.layout.pending'
                : 'tableCapabilities.layout.applied',
            )
          }}
        </span>
        <span
          v-else
          class="text-caption text-text-secondary"
          v-text="`${t('tableExamples.results')} ${String(table.total.value)}`"
        />
        <div class="flex shrink-0 flex-wrap gap-component-unit">
          <NButton
            class="min-h-target-enhanced"
            @click="reset"
          >
            {{ t('tableCapabilities.layout.reset') }}
          </NButton>
          <NButton
            v-if="example === 'widths'"
            type="primary"
            class="min-h-target-enhanced"
            :disabled="!widthsPending"
            @click="apply"
          >
            {{ t('tableCapabilities.layout.apply') }}
          </NButton>
        </div>
      </div>
    </template>
  </TableCapabilityWorkbench>
</template>

<style scoped>
@layer components {
  .wb-layout-control {
    flex: 1 1 var(--ui-layout-admin-content-minimum-inline-size);
    max-inline-size: var(--ui-layout-admin-content-minimum-inline-size);
  }
  .wb-layout-preview[data-viewport='regular'] {
    max-inline-size: var(--ui-layout-profile-regular-min-inline-size);
  }
  .wb-layout-preview[data-viewport='narrow'] {
    max-inline-size: var(--ui-layout-admin-content-minimum-inline-size);
  }
}
</style>
