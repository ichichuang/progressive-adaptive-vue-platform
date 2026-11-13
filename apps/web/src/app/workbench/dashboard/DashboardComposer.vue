<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onActivated,
  onDeactivated,
  onMounted,
  onScopeDispose,
  ref,
} from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NPopover } from 'naive-ui/es/popover'
import { NEmpty } from 'naive-ui/es/empty'
import {
  UiCopyAction,
  UiDashboardGrid,
  UiScrollArea,
  responsiveLayoutConsoleProjection,
  type UiDashboardGridHandle,
  type UiScrollController,
} from '@platform/ui'
import { useDashboard } from '../../dashboard/use-dashboard'
import type { DashboardPanel } from '../../dashboard/dashboard-contract'
import { useConsoleI18n } from '../../../shared/i18n'
import DashboardWidget from './DashboardWidget.vue'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'
defineProps<{ readonly view: 'board' | 'overview' }>()
defineSlots<{ default: () => unknown }>()
const { t } = useConsoleI18n()
const registerScroll = inject(routerScrollControllerKey)
let unregisterScroll: (() => void) | undefined
let active = true
let currentScroll: UiScrollController | null = null
function connectScroll(controller: UiScrollController | null): void {
  currentScroll = controller
  unregisterScroll?.()
  unregisterScroll = controller && active ? registerScroll?.(controller) : undefined
}
onActivated(() => {
  active = true
  connectScroll(currentScroll)
})
onDeactivated(() => {
  active = false
  unregisterScroll?.()
  unregisterScroll = undefined
})
onScopeDispose(() => {
  connectScroll(null)
})
const board = useDashboard()
const editing = ref(false)
const host = ref<HTMLElement>()
const grid = ref<UiDashboardGridHandle>()
const mode = ref<'wide' | 'narrow'>('wide')
const rejected = ref(false)
const adjustedPanel = ref<string>()
let observer: ResizeObserver | undefined
const breakpoint = responsiveLayoutConsoleProjection.profiles.find((item) => item.id === 'regular')
  ?.minimumInclusive.resolvedValue
function measure(): void {
  if (!host.value || !breakpoint) return
  const threshold =
    Number.parseFloat(breakpoint) *
    Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  mode.value = host.value.clientWidth < threshold ? 'narrow' : 'wide'
}
onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (host.value) observer.observe(host.value)
})
onScopeDispose(() => observer?.disconnect())
const panels = computed(
  () => new Map(board.document.value.panels.map((panel) => [panel.id, panel])),
)
const panelLabels = {
  clock: 'dashboardBoard.clock',
  capabilities: 'dashboardBoard.capabilities',
  chart: 'dashboardBoard.chart',
  notes: 'dashboardBoard.notes',
} as const
const options = computed(() =>
  (['clock', 'capabilities', 'chart', 'notes'] as const).map((value) => ({
    value,
    label: t(panelLabels[value]),
  })),
)
const controls = [
  {
    key: 'left',
    label: 'dashboardBoard.left',
    icon: 'i-lucide-arrow-left',
    dx: -1,
    dy: 0,
    dw: 0,
    dh: 0,
  },
  {
    key: 'right',
    label: 'dashboardBoard.right',
    icon: 'i-lucide-arrow-right',
    dx: 1,
    dy: 0,
    dw: 0,
    dh: 0,
  },
  { key: 'up', label: 'dashboardBoard.up', icon: 'i-lucide-arrow-up', dx: 0, dy: -1, dw: 0, dh: 0 },
  {
    key: 'down',
    label: 'dashboardBoard.down',
    icon: 'i-lucide-arrow-down',
    dx: 0,
    dy: 1,
    dw: 0,
    dh: 0,
  },
  {
    key: 'wider',
    label: 'dashboardBoard.wider',
    icon: 'i-lucide-columns-2',
    dx: 0,
    dy: 0,
    dw: 1,
    dh: 0,
  },
  {
    key: 'narrower',
    label: 'dashboardBoard.narrower',
    icon: 'i-lucide-panel-left-close',
    dx: 0,
    dy: 0,
    dw: -1,
    dh: 0,
  },
  {
    key: 'taller',
    label: 'dashboardBoard.taller',
    icon: 'i-lucide-arrow-down-to-line',
    dx: 0,
    dy: 0,
    dw: 0,
    dh: 1,
  },
  {
    key: 'shorter',
    label: 'dashboardBoard.shorter',
    icon: 'i-lucide-arrow-up-to-line',
    dx: 0,
    dy: 0,
    dw: 0,
    dh: -1,
  },
] as const
function controlDisabled(control: (typeof controls)[number]): boolean {
  return mode.value === 'narrow' && ['left', 'right', 'wider', 'narrower'].includes(control.key)
}
function adjust(id: string, control: (typeof controls)[number]): void {
  adjustedPanel.value = id
  if (control.dw || control.dh) grid.value?.resize(id, control.dw, control.dh)
  else grid.value?.move(id, control.dx, control.dy)
}
function keydown(event: KeyboardEvent, id: string): void {
  const directions: Readonly<Record<string, readonly [number, number]>> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  }
  const direction = directions[event.key]
  if (!direction || !editing.value || event.altKey || event.ctrlKey || event.metaKey) return
  event.preventDefault()
  adjustedPanel.value = id
  if (event.shiftKey) grid.value?.resize(id, direction[0], direction[1])
  else grid.value?.move(id, direction[0], direction[1])
}
async function add(type: DashboardPanel['type']): Promise<void> {
  rejected.value = !board.add(type)
  await nextTick()
}
function title(id: string): string {
  const panel = panels.value.get(id)
  return panel ? t(panelLabels[panel.type]) : ''
}
const announcement = computed(() => {
  const item = board.document.value.layouts[mode.value].find(
    (item) => item.id === adjustedPanel.value,
  )
  return item
    ? `${title(item.id)} · ${t('dashboardBoard.position')} ${String(item.y + 1)}, ${String(item.x + 1)}; ${String(item.w)} × ${String(item.h)}`
    : ''
})
</script>
<template>
  <div
    ref="host"
    class="flex flex-1 flex-col min-h-0 min-w-0 gap-content-gap"
  >
    <div
      v-if="view === 'board'"
      class="flex shrink-0 flex-wrap items-center justify-between gap-component-unit"
    >
      <span
        v-if="mode === 'wide'"
        class="text-caption text-text-secondary"
        v-text="t(editing ? 'dashboardBoard.editHint' : 'dashboardBoard.browseHint')"
      />
      <NButton
        :type="editing ? 'primary' : 'default'"
        :aria-pressed="editing"
        :disabled="board.readFailure.value"
        @click="editing = !editing"
      >
        {{ t(editing ? 'dashboardBoard.finish' : 'dashboardBoard.edit') }}
      </NButton>
    </div>
    <div class="flex-1 min-h-0 min-w-0">
      <UiScrollArea
        owner-id="architecture-console-content"
        @controller="connectScroll"
      >
        <UiDashboardGrid
          v-if="view === 'board'"
          ref="grid"
          class="shrink-0"
          :layout="board.document.value.layouts[mode]"
          :columns="mode === 'wide' ? 12 : 1"
          :editing="editing"
          :label="t('dashboardBoard.board')"
          @update:layout="board.updateLayout(mode, $event)"
        >
          <template #item="{ id }">
            <section
              class="flex flex-col h-full min-h-0 min-w-0 gap-component-unit p-page-inline"
              :aria-label="title(id)"
            >
              <header class="flex shrink-0 items-center justify-between gap-component-unit">
                <NButton
                  v-if="editing"
                  class="pavp-dashboard-drag-handle"
                  quaternary
                  size="small"
                  :aria-label="`${t('dashboardBoard.move')} · ${title(id)}`"
                  @keydown="keydown($event, id)"
                >
                  <template #icon>
                    <span
                      class="i-lucide-grip"
                      aria-hidden="true"
                    />
                  </template>
                  <span>{{ title(id) }}</span>
                </NButton>
                <h2
                  v-else
                  class="m-0 text-subheading"
                >
                  {{ title(id) }}
                </h2>
                <NPopover
                  v-if="editing"
                  trigger="click"
                  placement="bottom"
                  :show-arrow="false"
                >
                  <template #trigger>
                    <NButton
                      quaternary
                      size="small"
                      :aria-label="`${t('dashboardBoard.adjust')} · ${title(id)}`"
                    >
                      <span
                        class="i-lucide-sliders-horizontal"
                        aria-hidden="true"
                      />
                    </NButton>
                  </template>
                  <div
                    class="grid gap-component-unit"
                    :aria-label="t('dashboardBoard.adjust')"
                  >
                    <NButton
                      v-for="control in controls"
                      :key="control.key"
                      quaternary
                      size="small"
                      :disabled="controlDisabled(control)"
                      :aria-label="t(control.label)"
                      :title="t(control.label)"
                      @click="adjust(id, control)"
                    >
                      <span
                        :class="{
                          'i-lucide-arrow-left': control.key === 'left',
                          'i-lucide-arrow-right': control.key === 'right',
                          'i-lucide-arrow-up': control.key === 'up',
                          'i-lucide-arrow-down': control.key === 'down',
                          'i-lucide-columns-2': control.key === 'wider',
                          'i-lucide-panel-left-close': control.key === 'narrower',
                          'i-lucide-arrow-down-to-line': control.key === 'taller',
                          'i-lucide-arrow-up-to-line': control.key === 'shorter',
                        }"
                        aria-hidden="true"
                      />
                      <span>{{ t(control.label) }}</span>
                    </NButton>
                  </div>
                </NPopover>
                <NButton
                  v-if="editing"
                  quaternary
                  size="small"
                  :aria-label="`${t('dashboardBoard.remove')} · ${title(id)}`"
                  @click="board.remove(id)"
                >
                  <span
                    class="i-lucide-x"
                    aria-hidden="true"
                  />
                </NButton>
              </header>
              <DashboardWidget
                v-if="panels.get(id)"
                :panel="panels.get(id)!"
                :editing="editing"
                @update="board.updatePanel"
              />
            </section>
          </template>
        </UiDashboardGrid>
        <NEmpty
          v-if="view === 'board' && board.document.value.panels.length === 0"
          :description="t('dashboardBoard.empty')"
        />
        <slot v-if="view === 'overview'" />
      </UiScrollArea>
    </div>
    <span
      class="sr-only"
      role="status"
      aria-live="polite"
      v-text="announcement"
    />
    <footer
      v-if="view === 'board'"
      class="flex shrink-0 flex-wrap items-center justify-between gap-component-unit"
    >
      <div class="flex flex-wrap min-w-0 items-center gap-component-unit">
        <template v-if="editing">
          <NPopover
            trigger="click"
            :show-arrow="false"
          >
            <template #trigger>
              <NButton :disabled="board.document.value.panels.length >= 24">
                {{ t('dashboardBoard.add') }}
              </NButton>
            </template>
            <div
              class="grid gap-component-unit"
              role="group"
              :aria-label="t('dashboardBoard.widgetType')"
            >
              <NButton
                v-for="option in options"
                :key="option.value"
                quaternary
                @click="add(option.value)"
              >
                {{ option.label }}
              </NButton>
            </div>
          </NPopover>
          <NButton
            :disabled="!board.canUndo.value"
            @click="board.undo"
          >
            {{ t('dashboardBoard.undo') }}
          </NButton>
          <NButton @click="board.reset">
            {{ t('dashboardBoard.reset') }}
          </NButton>
        </template>
        <template v-if="board.readFailure.value">
          <span class="text-caption text-text-secondary">{{ t('dashboardBoard.readFailed') }}</span>
          <NButton
            secondary
            @click="board.retryRead"
          >
            {{ t('dashboardBoard.retryRead') }}
          </NButton>
          <NButton
            type="warning"
            secondary
            @click="board.reset"
          >
            {{ t('dashboardBoard.replaceInvalid') }}
          </NButton>
        </template>
        <NButton
          v-if="board.failure.value"
          type="warning"
          secondary
          @click="board.retry"
        >
          {{ t('dashboardBoard.saveFailed') }}
        </NButton>
        <span
          v-if="rejected"
          role="status"
          class="text-caption text-text-secondary"
          v-text="t('dashboardBoard.full')"
        />
      </div>
      <UiCopyAction
        :value="JSON.stringify(board.document.value, null, 2)"
        :label="t('dashboardBoard.copy')"
        :copy-label="t('formShowcase.copyAI')"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
        variant="tertiary"
      />
    </footer>
  </div>
</template>
