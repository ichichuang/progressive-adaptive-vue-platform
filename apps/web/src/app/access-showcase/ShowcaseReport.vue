<script setup lang="ts">
import { UiChartTimeRange, UiG2Chart, type UiG2ChartOptions } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { NSelect } from 'naive-ui/es/select'
import { computed, onScopeDispose, ref, watch } from 'vue'
import { useConsoleI18n } from '../../shared/i18n'
import AccessRequestDialog from '../access/AccessRequestDialog.vue'
import GuardedOperationButton from '../access/GuardedOperationButton.vue'
import ResourceSharingDialog from '../access/ResourceSharingDialog.vue'
import { useAccessBoundary } from '../access/access-boundary'
import { executeGuardedAction } from '../access/guarded-action'
import { useGuardedChart } from '../charts/use-guarded-chart'
import { reportId, type ExportBlock } from './showcase-data'
import { createShowcaseInteractions } from './showcase-interactions'
import { reportCapability, showcaseRequirement } from './showcase-requirements'
import { useShowcaseWorld } from './showcase-session'

const { locale } = useConsoleI18n()
const say = (en: string, zh: string) => (locale.value === 'zh-CN' ? zh : en)
const world = useShowcaseWorld()
const access = useAccessBoundary()
const { state } = world
const { sharing, requests } = createShowcaseInteractions(world)
const sharingOpen = ref(false)
const requestOpen = ref(false)
const status = ref('')
const target = { id: reportId }
const action = world.exportAction()
const selection = computed(() => {
  // Business switches rebind eligibility without changing record permissions.
  void state.block
  void state.quota
  return { target, action }
})
let attempt: AbortController | undefined
function clear() {
  attempt?.abort()
  status.value = ''
}
watch(() => access.readContext(), clear, { flush: 'sync' })
onScopeDispose(clear)
async function run() {
  attempt?.abort()
  const owner = new AbortController()
  attempt = owner
  const exportData = chart.exportData('velocity')
  if (!exportData?.isCurrent()) return
  const [outcome] = await executeGuardedAction(
    access,
    {
      ...action,
      isTargetCurrent: (candidate) => exportData.isCurrent() && action.isTargetCurrent(candidate),
      apply() {
        if (!exportData.isCurrent()) return
        const lines = exportData.rows.flatMap((row) =>
          typeof row['time'] === 'number' && typeof row['count'] === 'number'
            ? [`${String(row['time'])},${String(row['count'])}`]
            : [],
        )
        const url = URL.createObjectURL(
          new Blob([['time,count', ...lines].join('\r\n')], { type: 'text/csv' }),
        )
        const link = document.createElement('a')
        link.href = url
        link.download = 'showcase-report-window.csv'
        link.click()
        setTimeout(() => {
          URL.revokeObjectURL(url)
        }, 0)
      },
    },
    {
      targets: [target],
      signal: owner.signal,
    },
  )
  if (!owner.signal.aborted && outcome) {
    status.value =
      outcome.status === 'completed'
        ? say('Local export completed', '本地导出操作已完成')
        : [outcome.status, outcome.reason?.kind].filter(Boolean).join(' · ')
  }
}
const exportOptions = computed(() => [
  { value: 'none', label: say('All business constraints met', '满足全部业务约束') },
  { value: 'feature', label: say('Feature disabled', '功能开关关闭') },
  { value: 'entitlement', label: say('Entitlement unavailable', '未开通权益') },
  { value: 'quota', label: say('Quota exhausted', '额度用尽') },
  { value: 'workflow', label: say('Workflow not approved', '工作流未批准') },
])
function selectBlock(value: ExportBlock) {
  state.block = value
}
const options = {
  type: 'line',
  key: 'velocity',
  encode: { x: 'time', y: 'count' },
  animate: false,
} as const satisfies UiG2ChartOptions
const chart = useGuardedChart({
  access,
  view: showcaseRequirement(reportCapability('read', reportId)),
  options,
  series: { velocity: { fields: ['time', 'count'], input: 'window' } },
  source: {
    kind: 'local',
    read(context) {
      const matching = world.projectFor(context)
      const count = state.tasks.filter((task) => task.project === matching?.id).length
      return {
        kind: 'records',
        completeness: 'complete',
        rows: [0, 1, 2, 3].map((time) => ({
          time,
          count: Math.min(time + 1, count),
        })),
      }
    },
  },
  time: { field: 'time', overview: 'count', permitted: () => [0, 3] },
  output: {
    data: {
      fields: ['time', 'count'],
      requirement: showcaseRequirement(reportCapability('export', reportId)),
    },
  },
})
const range = computed(() => chart.range.value ?? ([0, 3] as const))
async function selectRange(value: readonly [number, number]) {
  await chart.timeline.value?.select(value)
}
</script>

<template>
  <div class="grid min-w-0 gap-content-gap">
    <div class="wb-chart-preview min-w-0">
      <UiG2Chart
        :label="say('Signal report activity', '信号项目活动报表')"
        :options="options"
        :access="chart.view"
      />
    </div>
    <UiChartTimeRange
      v-if="chart.timeline.value"
      :value="range"
      :min="chart.timeline.value.bounds[0]"
      :max="chart.timeline.value.bounds[1]"
      :overview="chart.timeline.value.overview"
      :is-current="() => chart.timeline.value !== undefined"
      :format-value="(value) => String(value)"
      :label="say('Report timeline', '报表时间线')"
      :start-label="say('Start', '起点')"
      :end-label="say('End', '终点')"
      :help-text="say('Use the arrow keys to adjust the range.', '使用方向键调整范围。')"
      @update:value="selectRange"
    />
    <div
      role="group"
      class="grid gap-component-unit"
    >
      <span id="showcase-ShowcaseReport-label-1">{{ say('Export restriction', '导出限制') }}</span>
      <NSelect
        :input-props="{ 'aria-labelledby': 'showcase-ShowcaseReport-label-1' }"
        :value="state.block"
        :options="exportOptions"
        @update:value="selectBlock"
      />
    </div>
    <div class="flex flex-wrap gap-content-gap">
      <GuardedOperationButton
        :selection="selection"
        @activate="run"
      >
        {{ say('Run local export', '执行本地导出') }}
      </GuardedOperationButton>
      <NButton @click="sharingOpen = true">
        {{ say('Manage sharing', '管理分享') }}
      </NButton>
      <NButton @click="requestOpen = true">
        {{ say('Review access request', '查看访问申请') }}
      </NButton>
      <NButton @click="() => void world.advanceTime()">
        {{ say('Advance 11 minutes', '快进 11 分钟') }}
      </NButton>
    </div>
    <p
      v-if="status"
      role="status"
    >
      {{ status }}
    </p>
    <ResourceSharingDialog
      v-model:show="sharingOpen"
      :host="sharing"
    />
    <AccessRequestDialog
      v-model:show="requestOpen"
      :host="requests"
    />
  </div>
</template>
