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
function previewStyle(
  theme: AppearanceThemePreviewProjection,
  mode: 'light' | 'dark',
  contrast: ContrastPreference,
): Readonly<Record<string, string>> {
  const colors = theme.planes[mode][contrast]
  return {
    '--pavp-mode-preview-page': colors.surfacePage,
    '--pavp-mode-preview-panel': colors.surfacePanel,
    '--pavp-mode-preview-action': colors.actionPrimary,
    '--pavp-mode-preview-control': colors.controlPrimary,
    '--pavp-mode-preview-border': colors.borderDefault,
  }
}
</script>
<template>
  <span
    class="wb-mode-preview rounded-control flex overflow-hidden"
    aria-hidden="true"
  >
    <span
      v-if="mode !== 'dark'"
      class="wb-mode-scene flex-1 grid min-w-0 gap-component-unit"
      :style="previewStyle(theme, 'light', contrast)"
    >
      <span class="wb-mode-scene-toolbar block" />
      <span class="wb-mode-scene-sidebar grid content-start gap-component-unit">
        <span />
        <span />
        <span />
      </span>
      <span class="wb-mode-scene-content grid content-center gap-component-unit">
        <span class="wb-mode-scene-title" />
        <span class="wb-mode-scene-tiles grid gap-component-unit">
          <span />
          <span />
        </span>
      </span>
    </span>
    <span
      v-if="mode !== 'light'"
      class="wb-mode-scene flex-1 grid min-w-0 gap-component-unit"
      :style="previewStyle(theme, 'dark', contrast)"
    >
      <span class="wb-mode-scene-toolbar block" />
      <span class="wb-mode-scene-sidebar grid content-start gap-component-unit">
        <span />
        <span />
        <span />
      </span>
      <span class="wb-mode-scene-content grid content-center gap-component-unit">
        <span class="wb-mode-scene-title" />
        <span class="wb-mode-scene-tiles grid gap-component-unit">
          <span />
          <span />
        </span>
      </span>
    </span>
  </span>
</template>
