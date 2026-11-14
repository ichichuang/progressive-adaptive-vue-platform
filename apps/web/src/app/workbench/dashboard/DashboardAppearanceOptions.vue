<script setup lang="ts">
import { computed, ref } from 'vue'
import { UiScrollArea } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import {
  dashboardStyleIds,
  dashboardPresetTones,
  dashboardToneIds,
  dashboardEntranceIds,
  type DashboardStyle,
  type DashboardTone,
  type DashboardEntrance,
} from '../../dashboard/dashboard-contract'
import { useConsoleI18n } from '../../../shared/i18n'

const props = defineProps<{
  readonly boardStyle?: DashboardStyle
  readonly tone?: DashboardTone
  readonly entrance: DashboardEntrance
  readonly toneInherited?: boolean
  readonly entranceInherited?: boolean
  readonly toneOverrides?: number
  readonly entranceOverrides?: number
  readonly previewEnabled: boolean
}>()
const emit = defineEmits<{
  'update:boardStyle': [value: DashboardStyle]
  'update:tone': [value: DashboardTone]
  'update:entrance': [value: DashboardEntrance]
  'reset:tone': []
  'reset:entrance': []
}>()
const slots = defineSlots<{ default?: () => unknown }>()
const section = ref<'color' | 'motion' | 'content'>('color')
const { t } = useConsoleI18n()
const styleLabels = {
  theme: 'dashboardBoard.styleTheme',
  brand: 'dashboardBoard.styleBrand',
  soft: 'dashboardBoard.styleSoft',
  contrast: 'dashboardBoard.styleContrast',
} as const satisfies Record<DashboardStyle, string>
const toneLabels = {
  theme: 'dashboardBoard.toneTheme',
  'accent-a': 'dashboardBoard.toneAccentA',
  'accent-b': 'dashboardBoard.toneAccentB',
  brand: 'dashboardBoard.toneBrand',
  'accent-a-strong': 'dashboardBoard.toneAccentAStrong',
  'accent-b-strong': 'dashboardBoard.toneAccentBStrong',
  quiet: 'dashboardBoard.toneQuiet',
} as const satisfies Record<DashboardTone, string>
const entranceLabels = {
  balanced: 'dashboardBoard.entranceBalanced',
  curtain: 'dashboardBoard.entranceCurtain',
  'card-expand': 'dashboardBoard.entranceExpand',
  'camera-push': 'dashboardBoard.entranceCamera',
  iris: 'dashboardBoard.entranceIris',
  'ink-reveal': 'dashboardBoard.entranceInk',
  none: 'dashboardBoard.entranceNone',
} as const satisfies Record<DashboardEntrance, string>
const entranceIcons = {
  balanced: 'i-lucide-sparkles',
  curtain: 'i-lucide-panel-top',
  'card-expand': 'i-lucide-expand',
  'camera-push': 'i-lucide-focus',
  iris: 'i-lucide-aperture',
  'ink-reveal': 'i-lucide-droplets',
  none: 'i-lucide-minus',
} as const satisfies Record<DashboardEntrance, string>
const toneSwatchClasses = {
  theme: 'bg-surface-panel text-text-primary',
  'accent-a': 'bg-expression-accent-a-soft-background text-expression-accent-a-soft-foreground',
  'accent-b': 'bg-expression-accent-b-soft-background text-expression-accent-b-soft-foreground',
  brand: 'bg-action-primary text-text-on-action',
  'accent-a-strong':
    'bg-expression-accent-a-solid-background text-expression-accent-a-solid-foreground',
  'accent-b-strong':
    'bg-expression-accent-b-solid-background text-expression-accent-b-solid-foreground',
  quiet: 'bg-surface-page text-text-secondary',
} as const satisfies Record<DashboardTone, string>
const colorOptions = computed(() => {
  const boardStyle = props.boardStyle
  if (boardStyle !== undefined) {
    return dashboardStyleIds.map((value) => {
      const preset = dashboardPresetTones[value]
      return {
        kind: 'board' as const,
        value,
        label: t(styleLabels[value]),
        tones: [preset.capabilities, preset.notes, preset.clock, preset.chart],
        selected: boardStyle === value,
      }
    })
  }
  return dashboardToneIds.map((value) => ({
    kind: 'card' as const,
    value,
    label: t(toneLabels[value]),
    selected: !props.toneInherited && props.tone === value,
  }))
})
const colorGroupLabel = computed(() =>
  t(
    props.boardStyle === undefined ? 'dashboardBoard.appearance' : 'dashboardBoard.appearanceStyle',
  ),
)
const entranceOptions = computed(() =>
  dashboardEntranceIds.map((value) => ({ value, label: t(entranceLabels[value]) })),
)
function selectColor(option: (typeof colorOptions.value)[number]): void {
  if (option.kind === 'board') emit('update:boardStyle', option.value)
  else emit('update:tone', option.value)
}
</script>
<template>
  <div class="grid min-w-0 gap-component-unit">
    <div
      class="flex items-center gap-component-unit"
      role="group"
      :aria-label="t('dashboardBoard.appearance')"
    >
      <NButton
        v-for="tab in (['color', 'motion', 'content'] as const).filter(
          (tab) => tab !== 'content' || slots.default,
        )"
        :key="tab"
        class="wb-dashboard-choice"
        type="primary"
        quaternary
        size="small"
        :aria-pressed="section === tab"
        @click="section = tab"
      >
        {{
          t(
            tab === 'color'
              ? 'dashboardBoard.colorTab'
              : tab === 'motion'
                ? 'dashboardBoard.motionTab'
                : 'dashboardBoard.contentTab',
          )
        }}
      </NButton>
    </div>
    <div
      v-if="section === 'content'"
      class="grid min-w-0 gap-component-unit"
    >
      <slot />
    </div>
    <section
      v-if="section === 'color' && (boardStyle !== undefined || tone !== undefined)"
      class="grid min-w-0 gap-component-unit"
      :aria-label="colorGroupLabel"
    >
      <UiScrollArea
        x-scrollable
        owner-id="dashboard-appearance-options"
        class="min-w-0 w-full"
      >
        <div
          class="flex min-w-full w-max gap-component-unit"
          role="group"
          :aria-label="colorGroupLabel"
        >
          <NButton
            v-if="boardStyle === undefined"
            type="primary"
            quaternary
            class="wb-dashboard-choice shrink-0"
            :aria-pressed="toneInherited === true"
            @click="emit('reset:tone')"
          >
            {{ t('dashboardBoard.boardDefault') }}
          </NButton>
          <NButton
            v-for="option in colorOptions"
            :key="option.value"
            class="wb-dashboard-choice shrink-0"
            type="primary"
            quaternary
            :aria-pressed="option.selected"
            @click="selectColor(option)"
          >
            <span class="flex items-center gap-component-unit">
              <span
                v-if="option.kind === 'board'"
                class="rounded-control shrink-0 grid grid-cols-2 grid-rows-2 overflow-hidden size-icon-medium"
                aria-hidden="true"
              >
                <span
                  v-for="(previewTone, index) in option.tones"
                  :key="index"
                  :class="toneSwatchClasses[previewTone]"
                />
              </span>
              <span
                v-else
                class="rounded-control shrink-0 grid place-items-center size-icon-medium"
                :class="toneSwatchClasses[option.value]"
                aria-hidden="true"
              >
                <span class="i-lucide-palette" />
              </span>
              <span v-text="option.label" />
              <span
                class="i-lucide-check shrink-0"
                :class="{ invisible: !option.selected }"
                aria-hidden="true"
              />
            </span>
          </NButton>
        </div>
      </UiScrollArea>
    </section>
    <section
      v-if="section === 'motion'"
      class="grid min-w-0 gap-component-unit"
      :aria-label="t('dashboardBoard.entrance')"
    >
      <p
        v-if="!previewEnabled"
        class="m-0 text-caption text-text-secondary"
        v-text="t('dashboardBoard.motionUnavailable')"
      />
      <UiScrollArea
        x-scrollable
        owner-id="dashboard-appearance-motion"
        class="min-w-0 w-full"
      >
        <div
          class="flex min-w-full w-max items-center gap-component-unit"
          role="group"
          :aria-label="t('dashboardBoard.entrance')"
        >
          <NButton
            v-if="tone !== undefined"
            type="primary"
            quaternary
            class="wb-dashboard-choice shrink-0"
            :aria-pressed="entranceInherited === true"
            @click="emit('reset:entrance')"
          >
            {{ t('dashboardBoard.boardDefault') }}
          </NButton>
          <NButton
            v-for="option in entranceOptions"
            :key="option.value"
            type="primary"
            quaternary
            class="wb-dashboard-choice shrink-0"
            :aria-pressed="!entranceInherited && entrance === option.value"
            @click="emit('update:entrance', option.value)"
          >
            <template #icon>
              <span
                :class="entranceIcons[option.value]"
                aria-hidden="true"
              />
            </template>
            <span v-text="option.label" />
          </NButton>
        </div>
      </UiScrollArea>
    </section>
    <p
      v-if="boardStyle !== undefined && section === 'color' && toneOverrides"
      class="m-0 text-caption text-text-secondary"
    >
      {{ toneOverrides }} {{ t('dashboardBoard.colorOverrides') }}
    </p>
    <p
      v-if="boardStyle !== undefined && section === 'motion' && entranceOverrides"
      class="m-0 text-caption text-text-secondary"
    >
      {{ entranceOverrides }} {{ t('dashboardBoard.entranceOverrides') }}
    </p>
  </div>
</template>
