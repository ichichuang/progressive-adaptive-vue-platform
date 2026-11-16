<script setup lang="ts">
import type {
  AppearanceThemePreviewProjection,
  ColorModePreference,
  ContrastPreference,
} from '@platform/design-system'

defineProps<{
  readonly theme: AppearanceThemePreviewProjection
  readonly mode: ColorModePreference
  readonly contrast: ContrastPreference
}>()

function planeStyle(
  theme: AppearanceThemePreviewProjection,
  mode: 'light' | 'dark',
  contrast: ContrastPreference,
): Readonly<Record<string, string>> {
  const colors = theme.planes[mode][contrast]
  return {
    '--pavp-mode-preview-page': colors.surfacePage,
    '--pavp-mode-preview-panel': colors.surfacePanel,
    '--pavp-mode-preview-control': colors.controlPrimary,
    '--pavp-mode-preview-action': colors.actionPrimary,
  }
}
</script>

<template>
  <span
    class="settings-mode-preview"
    aria-hidden="true"
  >
    <span
      v-for="plane in mode === 'system' ? (['light', 'dark'] as const) : [mode]"
      :key="plane"
      class="settings-mode-preview__plane"
      :style="planeStyle(theme, plane, contrast)"
    >
      <span class="settings-mode-preview__surface">
        <span class="settings-mode-preview__line" />
        <span class="settings-mode-preview__action" />
      </span>
    </span>
  </span>
</template>

<style scoped>
.settings-mode-preview {
  display: flex;
  overflow: hidden;
  inline-size: 100%;
  block-size: calc(var(--ui-control-height) - 2 * var(--ui-space-component-unit));
  border-radius: var(--ui-radius-control);
}
.settings-mode-preview__plane {
  display: flex;
  flex: 1 1 0;
  min-inline-size: 0;
  padding: var(--ui-space-component-unit);
  background: var(--pavp-mode-preview-page);
}
.settings-mode-preview__surface {
  display: grid;
  align-content: center;
  flex: 1 1 0;
  gap: var(--ui-space-component-unit);
  min-inline-size: 0;
  padding: var(--ui-space-component-unit);
  border-radius: var(--ui-radius-control);
  background: var(--pavp-mode-preview-panel);
}
.settings-mode-preview__line,
.settings-mode-preview__action {
  display: block;
  block-size: var(--ui-space-component-unit);
  border-radius: var(--ui-radius-control);
}
.settings-mode-preview__line {
  inline-size: 70%;
  background: var(--pavp-mode-preview-control);
}
.settings-mode-preview__action {
  inline-size: 45%;
  background: var(--pavp-mode-preview-action);
}
html[data-pavp-settings-appearance]
  :is(
    .settings-mode-preview__plane,
    .settings-mode-preview__surface,
    .settings-mode-preview__line,
    .settings-mode-preview__action
  ) {
  transition: background-color var(--pavp-settings-appearance-duration) var(--ui-motion-easing);
}
</style>
