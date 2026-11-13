<script setup lang="ts">
import { computed, onActivated, onDeactivated, ref } from 'vue'
import { m } from 'motion-v'
import { NButton } from 'naive-ui/es/button'
import { NTag } from 'naive-ui/es/tag'
import { UiG2Chart, type UiG2ChartOptions } from '@platform/ui'
import { useConsoleI18n } from '../../shared/i18n'
import { useAppearanceReadBoundary } from '../appearance/appearance-read-boundary'

defineOptions({ name: 'WelcomeCapabilityStage' })
const { t } = useConsoleI18n()
const appearance = useAppearanceReadBoundary()
const active = ref(true)
onActivated(() => {
  active.value = true
})
onDeactivated(() => {
  active.value = false
})
const full = computed(() => active.value && appearance.snapshot.value.motion === 'full')
const instant = computed(() => appearance.snapshot.value.motion === 'none')
const generation = ref(0)
const transition = computed(() => ({ duration: instant.value ? 0 : full.value ? 0.8 : 0.12 }))
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
function remix(): void {
  generation.value += 1
}
</script>

<template>
  <div
    class="wb-home-universe relative"
    :aria-label="t('welcomeArt.interactive')"
  >
    <m.section
      class="wb-home-preview rounded-panel grid bg-surface-panel"
      :initial="full ? { opacity: 0, y: 20 } : false"
      :animate="{ opacity: 1, y: 0 }"
      :transition="transition"
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
            class="text-body"
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
      <div class="wb-home-preview-chart">
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
    </m.section>
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
