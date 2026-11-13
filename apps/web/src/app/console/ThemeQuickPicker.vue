<script setup lang="ts">
import {
  builtInAppearanceThemePreviews,
  explicitThemePreferenceSchema,
  projectAccessibleCustomAppearanceThemePreviews,
  type AppearanceThemePreviewProjection,
} from '@platform/design-system'
import { computed, ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NIcon } from 'naive-ui/es/icon'
import { useAppearanceMutationBoundary } from '../appearance/appearance-mutation-boundary'
import { useAppearanceReadBoundary } from '../appearance/appearance-read-boundary'
import { useConsoleI18n } from '../../shared/i18n'

const mutation = useAppearanceMutationBoundary()
const effective = useAppearanceReadBoundary()
const { t } = useConsoleI18n()
const rejected = ref(false)
const hovered = ref<AppearanceThemePreviewProjection | null>(null)
const preview = computed(() => hovered.value ?? themes.value.find(selected) ?? themes.value[0])
const previewColors = computed(() => (preview.value === undefined ? null : swatches(preview.value)))
const choiceLayout = Object.freeze({ heightSmall: 'auto', paddingSmall: '0' })
const themes = computed(() => [
  ...builtInAppearanceThemePreviews,
  ...projectAccessibleCustomAppearanceThemePreviews(mutation.customThemeRegistry.value ?? []),
])
function selected(theme: AppearanceThemePreviewProjection): boolean {
  return (
    effective.snapshot.value.theme.registryKind === theme.registryKind &&
    effective.snapshot.value.theme.themeId === theme.themeId
  )
}
function swatches(theme: AppearanceThemePreviewProjection) {
  return theme.planes[effective.snapshot.value.colorMode][effective.snapshot.value.contrast]
}
function choose(theme: AppearanceThemePreviewProjection): void {
  const current = explicitThemePreferenceSchema.safeParse(mutation.preference.value)
  if (!current.success) {
    rejected.value = true
    return
  }
  rejected.value =
    mutation.commitPreference({
      ...current.data,
      appearance: { ...current.data.appearance, theme: theme.reference },
    }).status !== 'committed'
}
</script>

<template>
  <section
    class="theme-quick-picker grid min-w-0 gap-content-gap"
    :aria-label="t('shell.themePickerLabel')"
  >
    <span
      class="font-title-weight flex items-center justify-between gap-content-gap text-caption text-text-secondary"
    >
      {{ t('shell.themePickerLabel') }}
      <NIcon
        class="i-lucide-palette"
        aria-hidden="true"
      />
    </span>
    <svg
      v-if="previewColors"
      class="theme-quick-scene rounded-panel w-full"
      viewBox="0 0 280 112"
      aria-hidden="true"
    >
      <rect
        width="280"
        height="112"
        rx="14"
        :fill="previewColors.surfacePage"
      />
      <rect
        x="9"
        y="9"
        width="49"
        height="94"
        rx="10"
        :fill="previewColors.actionPrimary"
      />
      <circle
        cx="25"
        cy="25"
        r="6"
        :fill="previewColors.onAction"
        opacity=".9"
      />
      <rect
        x="19"
        y="45"
        width="29"
        height="5"
        rx="2.5"
        :fill="previewColors.onAction"
        opacity=".8"
      />
      <rect
        x="19"
        y="59"
        width="22"
        height="5"
        rx="2.5"
        :fill="previewColors.onAction"
        opacity=".35"
      />
      <rect
        x="19"
        y="73"
        width="26"
        height="5"
        rx="2.5"
        :fill="previewColors.onAction"
        opacity=".35"
      />
      <rect
        x="67"
        y="9"
        width="204"
        height="22"
        rx="8"
        :fill="previewColors.surfacePanel"
      />
      <rect
        x="77"
        y="18"
        width="45"
        height="4"
        rx="2"
        :fill="previewColors.controlPrimary"
      />
      <circle
        cx="256"
        cy="20"
        r="4"
        :fill="previewColors.accentB"
      />
      <rect
        x="67"
        y="39"
        width="124"
        height="64"
        rx="10"
        :fill="previewColors.surfacePanel"
      />
      <path
        d="M78 86 C92 86 95 59 108 65 S132 89 145 63 S167 71 181 51"
        fill="none"
        :stroke="previewColors.accentA"
        stroke-width="4"
        stroke-linecap="round"
      />
      <rect
        x="200"
        y="39"
        width="71"
        height="28"
        rx="9"
        :fill="previewColors.accentA"
      />
      <rect
        x="200"
        y="75"
        width="71"
        height="28"
        rx="9"
        :fill="previewColors.accentB"
      />
    </svg>
    <div
      class="gatheme-quick-choice-content grid grid-cols-5"
      role="group"
      :aria-label="t('shell.themePickerLabel')"
    >
      <NButton
        v-for="theme in themes"
        :key="`${theme.registryKind}:${theme.themeId}`"
        :aria-label="theme.label"
        :aria-pressed="selected(theme)"
        :color="swatches(theme).surfacePanel"
        :text-color="swatches(theme).actionPrimary"
        :disabled="mutation.preference.value === null"
        :bordered="false"
        :theme-overrides="choiceLayout"
        size="small"
        class="theme-quick-choice min-h-target-enhanced min-w-target-enhanced"
        attr-type="button"
        data-pavp-quick-theme
        @mouseenter="hovered = theme"
        @mouseleave="hovered = null"
        @focus="hovered = theme"
        @blur="hovered = null"
        @click="choose(theme)"
      >
        <span class="theme-quick-choice-content gatheme-quick-choice-content grid">
          <svg
            class="theme-quick-palette"
            viewBox="0 0 44 54"
            aria-hidden="true"
          >
            <rect
              width="44"
              height="54"
              rx="10"
              :fill="swatches(theme).actionPrimary"
            />
            <path
              d="M0 31 Q20 19 44 31 V44 Q44 54 34 54 H10 Q0 54 0 44 Z"
              :fill="swatches(theme).accentA"
            />
            <path
              d="M0 44 Q24 31 44 42 V44 Q44 54 34 54 H10 Q0 54 0 44 Z"
              :fill="swatches(theme).accentB"
            />
          </svg>
          <NIcon
            class="i-lucide-check mx-auto"
            :class="{ 'opacity-0': !selected(theme) }"
            aria-hidden="true"
          />
        </span>
      </NButton>
    </div>
    <span
      v-if="rejected"
      role="alert"
      class="text-status-error text-caption"
    >
      {{ t('shell.themeChangeFailed') }}
    </span>
  </section>
</template>

<style scoped>
.theme-quick-picker {
  inline-size: calc(
    var(--ui-layout-target-enhanced-minimum-inline-size) * 5 + var(--ui-space-component-unit) * 8
  );
  max-inline-size: calc(100vw - var(--ui-space-content-gap) * 4);
}
.theme-quick-choices {
  grid-template-columns: repeat(
    auto-fit,
    minmax(var(--ui-layout-target-enhanced-minimum-inline-size), 1fr)
  );
}
.theme-quick-choice-content {
  padding: var(--ui-space-component-unit);
}
.theme-quick-palette {
  inline-size: calc(
    var(--ui-layout-target-enhanced-minimum-inline-size) - var(--ui-space-component-unit) * 2
  );
  block-size: auto;
}
.theme-quick-scene * {
  transition:
    fill var(--ui-motion-duration) var(--ui-motion-easing),
    stroke var(--ui-motion-duration) var(--ui-motion-easing);
}
.theme-quick-choice {
  transition: transform var(--ui-motion-duration) var(--ui-motion-easing);
}
html[data-motion='full'] .theme-quick-choice:hover {
  transform: translateY(calc(var(--ui-space-component-unit) * -1));
}
</style>
