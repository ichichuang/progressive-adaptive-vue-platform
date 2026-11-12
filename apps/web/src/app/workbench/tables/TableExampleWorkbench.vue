<script setup lang="ts">
import { computed, inject, onActivated, onDeactivated, onScopeDispose, ref, shallowRef } from 'vue'
import {
  UiCopyAction,
  UiScrollArea,
  parseUiTableSchema,
  type UiTableSchema,
  type UiTableAppearance,
  type UiTableHeight,
  type UiScrollController,
} from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { NPopover } from 'naive-ui/es/popover'
import ConfigurationJsonEditor from '../configuration/ConfigurationJsonEditor.vue'
import { NInputNumber } from 'naive-ui/es/input-number'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import WorkbenchPage from '../WorkbenchPage.vue'
import { useTableShowcase } from './table-showcase'
import {
  tableExampleSchema,
  tableExampleApis,
  tableExampleGuideKeys,
  type TableExample,
} from './table-examples'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'
import { useWorkspaceUnsavedChanges } from '../../workspace/use-workspace-unsaved-changes'
const props = defineProps<{
  readonly title: string
  readonly message: string
  readonly example: TableExample
  readonly appearance?: UiTableAppearance
}>()
defineSlots<{
  default: (binding: {
    schema: UiTableSchema
    height: UiTableHeight | undefined
    updateConfiguration: (configuration: Pick<UiTableSchema, 'columns' | 'summary'>) => void
    updateSummaryRenderer: (enabled: boolean) => void
  }) => unknown
  controls?: () => unknown
}>()
const { t } = useTableShowcase()
const schema = shallowRef(tableExampleSchema(props.example))
const currentConfiguration = shallowRef<Pick<UiTableSchema, 'columns' | 'summary'>>({
  columns: schema.value.columns,
  ...(schema.value.summary ? { summary: schema.value.summary } : {}),
})
function updateConfiguration(configuration: Pick<UiTableSchema, 'columns' | 'summary'>): void {
  currentConfiguration.value = configuration
}
const summaryRenderer = ref(false)
function updateSummaryRenderer(enabled: boolean): void {
  summaryRenderer.value = enabled
}
const heightMode = ref<UiTableHeight['mode']>('fill')
const fixedBodyHeight = ref(360)
const height = computed<UiTableHeight | undefined>(() =>
  props.example === 'basics'
    ? heightMode.value === 'fixed'
      ? { mode: 'fixed', bodyHeight: fixedBodyHeight.value }
      : { mode: heightMode.value }
    : schema.value.height,
)
const configurationEditing = ref(props.example === 'configuration')
const fill = computed(() => height.value?.mode === 'fill')
const heightHint = computed(() =>
  t(
    heightMode.value === 'fill'
      ? 'tableExamples.height.fillHint'
      : heightMode.value === 'fixed'
        ? 'tableExamples.height.fixedHint'
        : 'tableExamples.height.autoHint',
  ),
)
function updateFixedHeight(value: number | null): void {
  if (value !== null && Number.isFinite(value) && value >= 120 && value <= 1200)
    fixedBodyHeight.value = value
}
const schemaText = ref(JSON.stringify(schema.value, null, 2))
const appliedText = ref(schemaText.value)
const revision = ref(0)
const error = ref('')
const active = ref(true)
const register = inject(routerScrollControllerKey)
if (!register) throw new Error('The table showcase requires the Router Scroll Controller port.')
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
useWorkspaceUnsavedChanges(
  () => schemaText.value !== appliedText.value,
  () => schemaText.value,
)
const steps = computed(() => tableExampleGuideKeys[props.example].steps.map((key) => t(key)))
const boundary = computed(() => t(tableExampleGuideKeys[props.example].boundary))
const copyValue = computed(() =>
  [
    t('tableExamples.aiRequest'),
    props.title,
    props.message,
    ...steps.value,
    boundary.value,
    tableExampleApis[props.example],
    ...(summaryRenderer.value ? [t('tableExamples.summary.richCopy')] : []),
    'apps/web/src/app/workbench/tables/',
    'packages/ui/src/components/table-contracts.ts',
    JSON.stringify(
      {
        ...schema.value,
        ...currentConfiguration.value,
        ...(height.value ? { height: height.value } : {}),
        ...(props.appearance
          ? { appearance: { ...schema.value.appearance, ...props.appearance } }
          : {}),
      },
      null,
      2,
    ),
  ].join('\n\n'),
)
function apply(): void {
  try {
    const next = parseUiTableSchema(JSON.parse(schemaText.value) as unknown)
    if (
      next.source.kind !== 'local' ||
      next.rowKey !== 'id' ||
      next.query ||
      next.editor ||
      next.batchActions?.length
    )
      throw new TypeError(t('tableExamples.configBoundary'))
    schema.value = next
    summaryRenderer.value = false
    currentConfiguration.value = {
      columns: next.columns,
      ...(next.summary ? { summary: next.summary } : {}),
    }
    appliedText.value = schemaText.value
    revision.value++
    error.value = ''
    configurationEditing.value = false
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  }
}
function discard(): void {
  schemaText.value = appliedText.value
  error.value = ''
}
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
      class="wb-table-stage rounded-panel flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden bg-surface-panel"
      :data-table-example="example"
      :aria-label="t('tableExamples.preview')"
    >
      <div
        v-if="$slots['controls']"
        class="wb-form-panel-header shrink-0 min-w-0"
      >
        <slot name="controls" />
      </div>
      <div
        v-if="example === 'basics'"
        class="wb-form-panel-header shrink-0 grid min-w-0 gap-component-unit"
      >
        <div class="flex flex-wrap items-end gap-content-gap">
          <div class="grid gap-component-unit">
            <span class="text-caption text-text-secondary">{{
              t('tableExamples.height.label')
            }}</span>
            <NRadioGroup
              v-model:value="heightMode"
              :aria-label="t('tableExamples.height.label')"
              name="table-height"
            >
              <NRadioButton value="auto">
                {{ t('tableExamples.height.auto') }}
              </NRadioButton>
              <NRadioButton value="fixed">
                {{ t('tableExamples.height.fixed') }}
              </NRadioButton>
              <NRadioButton value="fill">
                {{ t('tableExamples.height.fill') }}
              </NRadioButton>
            </NRadioGroup>
          </div>
          <div
            v-if="heightMode === 'fixed'"
            class="grid gap-component-unit"
          >
            <span class="text-caption text-text-secondary">{{
              t('tableExamples.height.bodyHeight')
            }}</span>
            <NInputNumber
              :value="fixedBodyHeight"
              :min="120"
              :max="1200"
              :step="40"
              :input-props="{ 'aria-label': t('tableExamples.height.bodyHeight') }"
              @update:value="updateFixedHeight"
            />
          </div>
        </div>
        <p class="m-0 text-caption text-text-secondary">
          {{ heightHint }}
        </p>
      </div>
      <div
        v-if="example === 'configuration'"
        class="wb-form-panel-header flex shrink-0 flex-wrap gap-component-unit"
        role="group"
        :aria-label="t('tableShowcase.configuration')"
      >
        <NButton
          secondary
          :type="configurationEditing ? 'primary' : 'default'"
          :aria-pressed="configurationEditing"
          @click="configurationEditing = true"
        >
          {{ t('tableExamples.editConfiguration') }}
        </NButton>
        <NButton
          secondary
          :type="configurationEditing ? 'default' : 'primary'"
          :aria-pressed="!configurationEditing"
          @click="configurationEditing = false"
        >
          {{ t('tableExamples.previewTable') }}
        </NButton>
      </div>
      <UiScrollArea
        owner-id="architecture-console-content"
        :enabled="active"
        :contained="configurationEditing || fill"
        class="flex-1 min-h-0"
        @controller="connect"
      >
        <section
          v-if="example === 'configuration' && configurationEditing"
          class="flex flex-1 flex-col min-h-0 min-w-0 gap-content-gap px-page-inline"
          :aria-label="t('tableShowcase.configuration')"
        >
          <div class="flex shrink-0 min-w-0 items-start gap-content-gap">
            <NPopover
              trigger="click"
              scrollable
              to="#pavp-overlay-root"
            >
              <template #trigger>
                <NButton secondary>
                  {{ t('tableExamples.configuration.notes') }}
                </NButton>
              </template>
              <p class="m-0 text-caption text-text-secondary">
                {{ t('tableExamples.configBoundary') }}
              </p>
            </NPopover>
            <UiCopyAction
              class="shrink-0"
              variant="text"
              :value="schemaText"
              :label="t('tableShowcase.configuration')"
              :copy-label="t('workbench.copy')"
              :success-label="t('workbench.copied')"
              :failure-label="t('workbench.copyFailed')"
            />
          </div>
          <ConfigurationJsonEditor
            v-model:value="schemaText"
            kind="table"
            :label="t('tableShowcase.configuration')"
          />
          <p
            v-if="error"
            role="alert"
            class="m-0 min-h-0 break-words overflow-y-auto text-caption text-control-error"
          >
            {{ error }}
          </p>
        </section>
        <div
          v-show="!configurationEditing"
          class="wb-form-panel-header min-w-0 gap-content-gap"
          :class="fill ? 'flex flex-1 flex-col min-h-0' : 'grid'"
        >
          <div
            :key="revision"
            class="min-w-0"
            :class="fill ? 'flex flex-1 flex-col min-h-0' : ''"
          >
            <slot
              :schema="schema"
              :height="height"
              :update-configuration="updateConfiguration"
              :update-summary-renderer="updateSummaryRenderer"
            />
          </div>
        </div>
      </UiScrollArea>
      <footer
        v-if="example === 'configuration' && configurationEditing"
        class="wb-form-panel-header flex shrink-0 flex-wrap justify-end gap-component-unit"
      >
        <NButton
          class="min-h-target-enhanced"
          @click="discard"
        >
          {{ t('tableShowcase.discard') }}
        </NButton>
        <NButton
          type="primary"
          class="min-h-target-enhanced"
          @click="apply"
        >
          {{ t('tableShowcase.apply') }}
        </NButton>
      </footer>
    </section>
  </WorkbenchPage>
</template>
