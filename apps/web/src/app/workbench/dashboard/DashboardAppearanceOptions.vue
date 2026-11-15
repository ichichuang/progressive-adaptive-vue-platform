<script setup lang="ts">
import { type ButtonHTMLAttributes, computed } from 'vue'
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
import { useDashboardActionTheme } from './use-dashboard-action-theme'

const props = defineProps<{
  readonly section: 'color' | 'motion'
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
  'update:entrance': [value: DashboardEntrance, target: HTMLElement | null]
  'reset:tone': []
  'reset:entrance': [target: HTMLElement | null]
}>()
const { t } = useConsoleI18n()
const actionTheme = useDashboardActionTheme()
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
  if (props.boardStyle !== undefined) {
    return dashboardStyleIds.map((value) => {
      const preset = dashboardPresetTones[value]
      return {
        kind: 'board' as const,
        value,
        label: t(styleLabels[value]),
        tones: [preset.capabilities, preset.notes, preset.clock, preset.chart],
        selected: props.boardStyle === value,
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
function selectColor(option: (typeof colorOptions.value)[number]): void {
  if (option.kind === 'board') emit('update:boardStyle', option.value)
  else emit('update:tone', option.value)
}
</script>

<template>
  <template v-if="section === 'color'">
    <NButton
      v-if="boardStyle === undefined"
      class="wb-dashboard-context-action wb-dashboard-choice"
      type="primary"
      quaternary
      size="small"
      block
      :theme-overrides="actionTheme"
      v-bind="
        {
          role: 'menuitemradio',
          tabindex: -1,
          'aria-checked': toneInherited === true,
        } satisfies ButtonHTMLAttributes
      "
      @click="emit('reset:tone')"
    >
      <span class="flex w-full items-center justify-between gap-content-gap">
        <span>{{ t('dashboardBoard.boardDefault') }}</span>
        <span
          class="i-lucide-check shrink-0"
          :class="{ invisible: !toneInherited }"
          aria-hidden="true"
        />
      </span>
    </NButton>
    <NButton
      v-for="option in colorOptions"
      :key="option.value"
      class="wb-dashboard-context-action wb-dashboard-choice"
      type="primary"
      quaternary
      size="small"
      block
      :theme-overrides="actionTheme"
      v-bind="
        {
          role: 'menuitemradio',
          tabindex: -1,
          'aria-checked': option.selected,
        } satisfies ButtonHTMLAttributes
      "
      @click="selectColor(option)"
    >
      <span class="flex w-full items-center justify-between gap-content-gap">
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
        </span>
        <span
          class="i-lucide-check shrink-0"
          :class="{ invisible: !option.selected }"
          aria-hidden="true"
        />
      </span>
    </NButton>
    <p
      v-if="boardStyle !== undefined && toneOverrides"
      class="m-0 px-button-inline text-caption text-text-secondary"
    >
      {{ toneOverrides }} {{ t('dashboardBoard.colorOverrides') }}
    </p>
  </template>
  <template v-else>
    <p
      v-if="!previewEnabled"
      class="m-0 px-button-inline text-caption text-text-secondary"
      v-text="t('dashboardBoard.motionUnavailable')"
    />
    <NButton
      v-if="tone !== undefined"
      class="wb-dashboard-context-action wb-dashboard-choice"
      type="primary"
      quaternary
      size="small"
      block
      :theme-overrides="actionTheme"
      v-bind="
        {
          role: 'menuitemradio',
          tabindex: -1,
          'aria-checked': entranceInherited === true,
        } satisfies ButtonHTMLAttributes
      "
      @click="emit('reset:entrance', $event.currentTarget as HTMLElement)"
    >
      <span class="flex w-full items-center justify-between gap-content-gap">
        <span class="flex items-center gap-component-unit">
          <span
            class="i-lucide-sparkles"
            data-dashboard-motion-preview
            aria-hidden="true"
          />
          <span>{{ t('dashboardBoard.boardDefault') }}</span>
        </span>
        <span
          class="i-lucide-check shrink-0"
          :class="{ invisible: !entranceInherited }"
          aria-hidden="true"
        />
      </span>
    </NButton>
    <NButton
      v-for="value in dashboardEntranceIds"
      :key="value"
      class="wb-dashboard-context-action wb-dashboard-choice"
      type="primary"
      quaternary
      size="small"
      block
      :theme-overrides="actionTheme"
      v-bind="
        {
          role: 'menuitemradio',
          tabindex: -1,
          'aria-checked': !entranceInherited && entrance === value,
        } satisfies ButtonHTMLAttributes
      "
      @click="emit('update:entrance', value, $event.currentTarget as HTMLElement)"
    >
      <span class="flex w-full items-center justify-between gap-content-gap">
        <span class="flex items-center gap-component-unit">
          <span
            :class="entranceIcons[value]"
            data-dashboard-motion-preview
            aria-hidden="true"
          />
          <span>{{ t(entranceLabels[value]) }}</span>
        </span>
        <span
          class="i-lucide-check shrink-0"
          :class="{ invisible: entranceInherited || entrance !== value }"
          aria-hidden="true"
        />
      </span>
    </NButton>
    <p
      v-if="boardStyle !== undefined && entranceOverrides"
      class="m-0 px-button-inline text-caption text-text-secondary"
    >
      {{ entranceOverrides }} {{ t('dashboardBoard.entranceOverrides') }}
    </p>
  </template>
</template>
