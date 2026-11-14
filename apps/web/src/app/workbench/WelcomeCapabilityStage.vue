<script setup lang="ts">
import { computed, nextTick, onActivated, onDeactivated, ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NTag } from 'naive-ui/es/tag'
import { UiG2Chart, useUiMotion, type UiG2ChartOptions } from '@platform/ui'
import { useConsoleI18n } from '../../shared/i18n'

defineOptions({ name: 'WelcomeCapabilityStage' })
const { t } = useConsoleI18n()
const active = ref(true)
const motion = useUiMotion()
const plot = ref<HTMLElement | null>(null)
onActivated(() => {
  active.value = true
})
onDeactivated(() => {
  active.value = false
})
const generation = ref(0)
const data = computed(() =>
  Array.from({ length: 12 }, (_, index) => ({
    month: String(index + 1),
    value: Math.round(28 + index * 4 + Math.sin(index * 1.3 + generation.value) * 18),
  })),
)
const chart = computed((): UiG2ChartOptions => ({
  type: 'view',
  data: data.value,
  padding: 0,
  margin: 0,
  axis: false,
  legend: false,
  scale: { y: { domain: [0, 100] } },
  children: [
    {
      type: 'area',
      encode: { x: 'month', y: 'value' },
      style: { fillOpacity: 0.18, shape: 'smooth' },
    },
    { type: 'line', encode: { x: 'month', y: 'value' }, style: { shape: 'smooth', lineWidth: 3 } },
  ],
  tooltip: { title: 'month', items: [{ field: 'value', name: t('welcomeArt.sample') }] },
}))
async function remix(event: MouseEvent): Promise<void> {
  generation.value += 1
  await nextTick()
  if (!active.value || !plot.value) return
  motion.play(plot.value, {
    preset: 'ink-reveal',
    phase: 'enter',
    ...(event.detail > 0 ? { origin: { clientX: event.clientX, clientY: event.clientY } } : {}),
  })
}
</script>

<template>
  <div
    class="wb-home-universe relative"
    :aria-label="t('welcomeArt.interactive')"
  >
    <section
      class="wb-home-preview rounded-panel grid shadow-panel text-expression-accent-a-soft-foreground"
    >
      <div class="flex flex-wrap min-w-0 items-center justify-between gap-component-unit">
        <div class="flex min-w-0 items-center gap-component-unit">
          <div
            class="wb-home-app-icon rounded-control grid place-items-center bg-expression-accent-a-solid-background text-expression-accent-a-solid-foreground"
          >
            <span
              class="i-lucide-boxes"
              aria-hidden="true"
            />
          </div>
          <strong
            class="text-subheading"
            v-text="t('welcomeArt.liveCanvas')"
          />
        </div>
        <NTag
          size="small"
          :bordered="false"
          type="success"
        >
          {{ t('welcomeArt.sample') }}
        </NTag>
      </div>
      <div
        ref="plot"
        class="wb-home-preview-chart"
      >
        <UiG2Chart
          :options="chart"
          :label="t('welcomeArt.chartLabel')"
        />
      </div>
      <div class="flex flex-wrap items-center justify-between gap-content-gap">
        <span
          class="text-caption text-text-secondary"
          v-text="t('welcomeArt.interactHint')"
        />
        <NButton
          size="small"
          secondary
          type="primary"
          @click="remix"
        >
          <template #icon>
            <span
              class="i-lucide-shuffle"
              aria-hidden="true"
            />
          </template>
          {{ t('welcomeArt.remix') }}
        </NButton>
      </div>
    </section>
    <div class="wb-home-palette-card grid gap-component-unit">
      <div
        class="wb-home-palette-fan flex"
        aria-hidden="true"
      >
        <span class="bg-data-viz-categorical-series-1" />
        <span class="bg-data-viz-categorical-series-2" />
        <span class="bg-data-viz-categorical-series-3" />
        <span class="bg-data-viz-categorical-series-4" />
        <span class="bg-data-viz-categorical-series-5" />
      </div>
      <span
        class="text-caption text-text-secondary"
        v-text="t('welcomeArt.yourSignature')"
      />
    </div>
  </div>
</template>
