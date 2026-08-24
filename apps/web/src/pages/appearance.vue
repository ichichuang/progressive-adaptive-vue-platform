<script setup lang="ts">
import {
  builtInThemeIds,
  colorModePreferenceSchema,
  contrastPreferenceSchema,
  fontScaleValues,
  materialPreferenceSchema,
  motionPreferenceSchema,
  type ColorModePreference,
  type ContrastPreference,
  type ExplicitThemePreference,
  type MaterialPreference,
  type MotionPreference,
} from '@platform/design-system'
import {
  UiButton,
  UiPageHeader,
  UiSection,
  UiSegmentedControl,
  type UiSegmentedOption,
} from '@platform/ui'
import { computed, ref } from 'vue'

import { useAppearanceMutationBoundary } from '../app/appearance/appearance-mutation-boundary'
import { useAppearanceReadBoundary } from '../app/appearance/appearance-read-boundary'

defineOptions({ name: 'AppearanceManagementPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

const effective = useAppearanceReadBoundary()
const mutation = useAppearanceMutationBoundary()
const resultLabel = ref('')

function options(values: readonly string[]): readonly UiSegmentedOption[] {
  return values.map((value) => ({ label: value, value }))
}

const colorModeOptions = options(colorModePreferenceSchema.options)
const contrastOptions = options(contrastPreferenceSchema.options)
const materialOptions = options(materialPreferenceSchema.options)
const motionOptions = options(motionPreferenceSchema.options)
const themeOptions = options(builtInThemeIds)
const fontScaleOptions = fontScaleValues.map((value) => ({
  label: String(value),
  value: String(value),
}))
const preference = computed(() => mutation.preference.value)

function mutablePreference(): ExplicitThemePreference | null {
  const current = preference.value

  if (current === null) {
    return null
  }

  return {
    schemaVersion: current.schemaVersion,
    appearance: {
      colorMode: current.appearance.colorMode,
      theme: { ...current.appearance.theme },
      contrast: current.appearance.contrast,
      material: current.appearance.material,
      density: { ...current.appearance.density },
      fontScale: current.appearance.fontScale,
      motion: current.appearance.motion,
    },
  }
}

function commit(update: (candidate: ExplicitThemePreference) => void): void {
  const candidate = mutablePreference()

  if (candidate === null) {
    resultLabel.value = '当前偏好不可用。'
    return
  }

  update(candidate)
  resultLabel.value =
    mutation.commitPreference(candidate).status === 'committed' ? '偏好已应用。' : '偏好未被接受。'
}

function updateColorMode(value: string): void {
  commit((candidate) => {
    candidate.appearance.colorMode = value as ColorModePreference
  })
}

function updateTheme(value: string): void {
  const themeId = builtInThemeIds.find((candidate) => candidate === value)

  if (themeId === undefined) {
    resultLabel.value = '主题偏好无效。'
    return
  }

  commit((candidate) => {
    candidate.appearance.theme = { registryKind: 'built-in', themeId }
  })
}

function updateContrast(value: string): void {
  commit((candidate) => {
    candidate.appearance.contrast = value as ContrastPreference
  })
}

function updateMaterial(value: string): void {
  commit((candidate) => {
    candidate.appearance.material = value as MaterialPreference
  })
}

function updateFontScale(value: string): void {
  const numericValue = Number(value)

  if (!fontScaleValues.includes(numericValue as (typeof fontScaleValues)[number])) {
    resultLabel.value = '字号偏好无效。'
    return
  }

  commit((candidate) => {
    candidate.appearance.fontScale = numericValue as (typeof fontScaleValues)[number]
  })
}

function updateMotion(value: string): void {
  commit((candidate) => {
    candidate.appearance.motion = value as MotionPreference
  })
}

function resetPreference(): void {
  resultLabel.value =
    mutation.resetPreference().status === 'committed' ? '已恢复产品默认值。' : '重置未被接受。'
}
</script>

<template>
  <UiPageHeader
    :breadcrumb="breadcrumb"
    :summary="message"
    :title="title"
  />
  <UiSection
    description="所有变更均通过应用内部无状态 Mutation Boundary 委托给现有 Appearance Store。"
    title="外观偏好"
  >
    <div
      v-if="preference"
      class="pavp-appearance-grid"
    >
      <div class="pavp-appearance-field">
        <span>颜色模式</span>
        <UiSegmentedControl
          accessible-label="颜色模式"
          :model-value="preference.appearance.colorMode"
          :options="colorModeOptions"
          @update:model-value="updateColorMode"
        />
      </div>
      <div class="pavp-appearance-field">
        <span>内置主题</span>
        <UiSegmentedControl
          accessible-label="内置主题"
          :model-value="effective.snapshot.value.theme.themeId"
          :options="themeOptions"
          @update:model-value="updateTheme"
        />
      </div>
      <div class="pavp-appearance-field">
        <span>对比度</span>
        <UiSegmentedControl
          accessible-label="对比度"
          :model-value="preference.appearance.contrast"
          :options="contrastOptions"
          @update:model-value="updateContrast"
        />
      </div>
      <div class="pavp-appearance-field">
        <span>材质</span>
        <UiSegmentedControl
          accessible-label="材质"
          :model-value="preference.appearance.material"
          :options="materialOptions"
          @update:model-value="updateMaterial"
        />
      </div>
      <div class="pavp-appearance-field">
        <span>字号</span>
        <UiSegmentedControl
          accessible-label="字号"
          :model-value="String(preference.appearance.fontScale)"
          :options="fontScaleOptions"
          @update:model-value="updateFontScale"
        />
      </div>
      <div class="pavp-appearance-field">
        <span>动效</span>
        <UiSegmentedControl
          accessible-label="动效"
          :model-value="preference.appearance.motion"
          :options="motionOptions"
          @update:model-value="updateMotion"
        />
      </div>
    </div>
    <div class="pavp-appearance-actions">
      <UiButton
        variant="ghost"
        @press="resetPreference"
      >
        恢复默认值
      </UiButton>
      <span
        :key="resultLabel"
        aria-live="polite"
        class="pavp-appearance-result text-text-secondary"
      >
        {{ resultLabel }}
      </span>
    </div>
  </UiSection>
</template>

<style scoped>
.pavp-appearance-grid,
.pavp-appearance-field {
  display: grid;
  gap: var(--ui-space-content-gap);
}

.pavp-appearance-grid {
  grid-template-columns: repeat(
    auto-fit,
    minmax(var(--ui-layout-admin-content-minimum-inline-size), 1fr)
  );
}

.pavp-appearance-actions {
  display: flex;
  align-items: center;
  gap: var(--ui-space-content-gap);
}

.pavp-appearance-result:not(:empty) {
  animation: pavp-setting-commit var(--ui-motion-duration) var(--ui-motion-easing) both;
}

@keyframes pavp-setting-commit {
  from {
    color: var(--ui-color-text-primary);
  }

  to {
    color: var(--ui-color-text-secondary);
  }
}

:global(html[data-motion='reduced']) .pavp-appearance-result:not(:empty) {
  animation-duration: calc(var(--ui-motion-duration) / 2);
}

:global(html[data-motion='none']) .pavp-appearance-result:not(:empty) {
  animation: none;
}
</style>
