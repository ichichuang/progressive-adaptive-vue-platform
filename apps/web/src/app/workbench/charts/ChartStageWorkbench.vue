<script setup lang="ts">
import { computed, inject, onActivated, onDeactivated, onScopeDispose, ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NPopover } from 'naive-ui/es/popover'
import { NInputNumber } from 'naive-ui/es/input-number'
import {
  UiDisplayStage,
  responsiveLayoutConsoleProjection,
  UiScrollArea,
  UiG2Chart,
  UiCopyAction,
  UiDashboardGrid,
  type UiG2ChartOptions,
  type UiScrollController,
} from '@platform/ui'
import WorkbenchPage from '../WorkbenchPage.vue'
import { useConsoleI18n } from '../../../shared/i18n'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'
defineProps<{ readonly title: string; readonly message: string }>()
const { t } = useConsoleI18n()
const active = ref(true)
const customOpen = ref(false)
const width = ref<number | null>(16)
const height = ref<number | null>(9)
const ratio = computed(() => ({ width: width.value ?? 16, height: height.value ?? 9 }))
const size = ref({ width: 0, height: 0 })
const presets = [
  { width: 16, height: 9 },
  { width: 4, height: 3 },
  { width: 21, height: 9 },
]
const revision = ref(0)
const rows = computed(() =>
  ['09:00', '10:00', '11:00', '12:00'].map((time, index) => ({
    time,
    value: Math.round(50 + index * 15 + Math.sin(revision.value + index) * 15),
  })),
)
const options = computed<UiG2ChartOptions>(() => ({
  type: 'interval',
  data: rows.value,
  encode: { x: 'time', y: 'value', color: 'time', key: 'time' },
  legend: false,
  axis: { x: { title: false }, y: { title: false } },
  tooltip: { title: 'time', items: [{ field: 'value', name: t('chartExamples.value') }] },
  scale: { y: { domain: [0, 120], nice: false } },
}))
const tour = computed(() => ({
  autoplay: true,
  targets: rows.value.map((row) => ({ id: row.time, field: 'time', value: row.time })),
}))
const breakpoint = responsiveLayoutConsoleProjection.profiles.find(
  (profile) => profile.id === 'regular',
)?.minimumInclusive.resolvedValue
const columns = computed<1 | 12>(() => {
  if (typeof document === 'undefined' || !breakpoint) return 1
  const threshold =
    Number.parseFloat(breakpoint) *
    Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  return size.value.width < threshold ? 1 : 12
})
function selectPreset(preset: { width: number; height: number }): void {
  width.value = preset.width
  height.value = preset.height
}
const layout = computed(() =>
  columns.value === 1
    ? [
        { id: 'chart', x: 0, y: 0, w: 1, h: 2 },
        { id: 'summary', x: 0, y: 2, w: 1, h: 2 },
      ]
    : [
        { id: 'chart', x: 0, y: 0, w: 8, h: 2 },
        { id: 'summary', x: 8, y: 0, w: 4, h: 2 },
      ],
)
const copy = computed(() =>
  JSON.stringify(
    {
      component: 'UiDisplayStage',
      ratio: ratio.value,
      content: 'UiDashboardGrid + UiG2Chart',
      chart: { options: options.value, tour: tour.value },
    },
    null,
    2,
  ),
)
const register = inject(routerScrollControllerKey)
if (!register) throw new Error('Chart stage requires the Router Scroll Controller port.')
let controller: UiScrollController | null = null
let unregister: (() => void) | undefined
function connect(value: UiScrollController | null): void {
  controller = value
  unregister?.()
  unregister = value && active.value ? register?.(value) : undefined
}
onActivated(() => {
  active.value = true
  connect(controller)
})
onDeactivated(() => {
  customOpen.value = false
  active.value = false
  unregister?.()
  unregister = undefined
})
onScopeDispose(() => unregister?.())
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
        :value="copy"
        :label="t('formShowcase.copyAI')"
        :copy-label="t('workbench.copy')"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
      />
    </template>
    <section
      class="wb-table-stage rounded-panel flex flex-1 flex-col min-h-0 min-w-0 bg-surface-panel"
      :aria-label="title"
    >
      <header class="wb-form-panel-header flex shrink-0 flex-wrap items-center gap-component-unit">
        <NButton
          v-for="preset in presets"
          :key="preset.width"
          secondary
          :type="
            ratio.width === preset.width && ratio.height === preset.height ? 'primary' : 'default'
          "
          @click="selectPreset(preset)"
        >
          {{ preset.width }}:{{ preset.height }}
        </NButton>
        <NPopover
          v-model:show="customOpen"
          trigger="click"
          placement="bottom-end"
        >
          <template #trigger>
            <NButton secondary>
              {{ t('chartStage.custom') }}
            </NButton>
          </template>
          <div class="flex flex-col gap-component-unit">
            <span class="text-caption">{{ t('chartStage.width') }}</span>
            <NInputNumber
              v-model:value="width"
              :min="1"
              :max="100"
              :aria-label="t('chartStage.width')"
            />
            <span class="text-caption">{{ t('chartStage.height') }}</span>
            <NInputNumber
              v-model:value="height"
              :min="1"
              :max="100"
              :aria-label="t('chartStage.height')"
            />
          </div>
        </NPopover>
      </header>
      <div class="flex-1 min-h-0 min-w-0 p-panel">
        <UiDisplayStage
          :ratio="ratio"
          :label="title"
          @resize="size = $event"
        >
          <UiScrollArea
            contained
            owner-id="architecture-console-content"
            :enabled="active"
            class="h-full min-h-0"
            @controller="connect"
          >
            <UiDashboardGrid
              :layout="layout"
              :columns="columns"
              :row-height="size.height / 2"
              :editing="false"
              :label="t('chartStage.board')"
            >
              <template #item="{ id }">
                <section
                  class="rounded-panel flex flex-col h-full min-h-0 min-w-0 bg-surface-panel gap-component-unit p-panel-narrow"
                >
                  <template v-if="id === 'chart'">
                    <h2
                      v-if="columns === 12"
                      class="m-0 text-subheading text-text-primary"
                    >
                      {{ t('chartStage.trend') }}
                    </h2>
                    <div class="flex-1 min-h-0">
                      <UiG2Chart
                        :options="options"
                        :tour="tour"
                        :label="t('chartStage.trend')"
                      />
                    </div>
                  </template>
                  <template v-else>
                    <h2 class="m-0 text-subheading text-text-primary">
                      {{ t('chartStage.summary') }}
                    </h2>
                    <div
                      v-for="row in rows"
                      :key="row.time"
                      class="flex items-center justify-between gap-component-unit text-body text-text-primary"
                    >
                      <span>{{ row.time }}</span>
                      <span>{{ row.value }}</span>
                    </div>
                    <p
                      v-if="columns === 12"
                      class="text-caption text-text-secondary"
                    >
                      {{ t('chartStage.hint') }}
                    </p>
                  </template>
                </section>
              </template>
            </UiDashboardGrid>
          </UiScrollArea>
        </UiDisplayStage>
      </div>
      <footer
        class="wb-form-panel-header flex shrink-0 flex-wrap items-center justify-between gap-content-gap"
      >
        <span class="text-caption text-text-secondary">
          {{ Math.round(size.width) }} × {{ Math.round(size.height) }} ·
          {{ t('chartStage.fullscreen') }}
        </span>
        <NButton @click="revision++">
          {{ t('chartExamples.update') }}
        </NButton>
      </footer>
    </section>
  </WorkbenchPage>
</template>
