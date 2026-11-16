<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton } from 'naive-ui/es/button'
import {
  colorStyleIds,
  colorStyleSchema,
  projectRegionAppearance,
  type ColorStyle,
  type UiAppearanceSnapshot,
} from '@platform/design-system'
import { useConsoleI18n } from '../../shared/i18n'
const props = defineProps<{
  readonly modelValue: ColorStyle
  readonly appearance: Readonly<UiAppearanceSnapshot>
  readonly disabled?: boolean
  readonly previewOnly?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: ColorStyle] }>()
const { t } = useConsoleI18n()
const focusedStyle = ref<ColorStyle>(props.modelValue)
watch(
  () => props.modelValue,
  (value) => {
    focusedStyle.value = value
  },
)
const labels = {
  unified: 'settings.styles.unified',
  'dark-navigation': 'settings.styles.dark-navigation',
  'brand-sidebar': 'settings.styles.brand-sidebar',
  'brand-header': 'settings.styles.brand-header',
  'dark-frame': 'settings.styles.dark-frame',
  'brand-frame': 'settings.styles.brand-frame',
  'soft-frame': 'settings.styles.soft-frame',
} as const
const options = computed(() =>
  colorStyleIds
    .filter((value) => !props.previewOnly || value === props.modelValue)
    .map((value) => ({ value, label: t(labels[value]) })),
)
function previewStyle(style: ColorStyle): Record<string, string> {
  const snapshot = { ...props.appearance, colorStyle: style }
  const sidebar = projectRegionAppearance(snapshot, 'sidebar')
  const header = projectRegionAppearance(snapshot, 'header')
  const tabs = projectRegionAppearance(snapshot, 'tabs')
  const content = projectRegionAppearance(snapshot, 'content')
  const menuPalette = sidebar.appearance.colorPalette.roles.primary
  const brandedSidebar = style === 'brand-sidebar' || style === 'brand-frame'
  const menuSelection =
    sidebar.isCustomized && !brandedSidebar ? menuPalette.solid : menuPalette.soft
  return {
    '--preview-sidebar': sidebar.surface.background,
    '--preview-sidebar-text': sidebar.surface.foreground,
    '--preview-menu-active': menuSelection.background.default,
    '--preview-menu-content': menuSelection.foreground,
    '--preview-header': header.surface.background,
    '--preview-header-text': header.surface.foreground,
    '--preview-tabs': tabs.surface.background,
    '--preview-content': content.surface.background,
    '--preview-panel': content.appearance.colorPalette.surfaces.raised,
    '--preview-accent': content.appearance.colorPalette.roles.primary.solid.background.default,
    '--preview-on-accent': content.appearance.colorPalette.roles.primary.solid.foreground,
  }
}

function moveFocus(event: KeyboardEvent): void {
  const direction =
    event.key === 'ArrowRight' || event.key === 'ArrowDown'
      ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
        ? -1
        : 0
  if (direction === 0 || !(event.currentTarget instanceof HTMLElement)) return
  const gallery = event.currentTarget.closest('[data-style-gallery]')
  if (!gallery) return
  const options = [...gallery.querySelectorAll<HTMLButtonElement>('[data-style-choice]')]
  const current = options.findIndex((option) => option === document.activeElement)
  if (current < 0 || options.length === 0) return
  event.preventDefault()
  options[(current + direction + options.length) % options.length]?.focus()
}

function choose(style: ColorStyle): void {
  if (!props.previewOnly) emit('update:modelValue', colorStyleSchema.parse(style))
}
</script>
<template>
  <div
    :class="
      previewOnly
        ? 'theme-style-summary grid min-w-0 justify-items-start gap-component-unit'
        : 'theme-style-gallery grid min-w-0 gap-component-unit'
    "
    :role="previewOnly ? undefined : 'group'"
    :aria-label="previewOnly ? undefined : t('settings.styles.title')"
    :data-style-gallery="previewOnly ? undefined : ''"
  >
    <template
      v-for="option in options"
      :key="option.value"
    >
      <component
        :is="previewOnly ? 'span' : NButton"
        :class="{
          'theme-style-current shrink-0': previewOnly,
          'theme-style-choice': !previewOnly,
          'min-w-0 cursor-pointer': !previewOnly,
        }"
        :attr-type="previewOnly ? undefined : 'button'"
        :text="previewOnly ? undefined : true"
        :block="previewOnly ? undefined : true"
        :disabled="previewOnly ? undefined : disabled"
        :aria-pressed="previewOnly ? undefined : option.value === modelValue"
        :aria-hidden="previewOnly ? 'true' : undefined"
        :tabindex="previewOnly ? undefined : option.value === focusedStyle ? 0 : -1"
        :data-style-choice="previewOnly ? undefined : ''"
        :data-current-style="!previewOnly && option.value === modelValue ? '' : undefined"
        @focus="focusedStyle = option.value"
        @keydown="moveFocus"
        @click="choose(option.value)"
      >
        <span
          class="theme-style-card grid min-w-0 whitespace-normal break-words gap-component-unit"
        >
          <span
            class="theme-style-scene rounded-control"
            :style="previewStyle(colorStyleSchema.parse(option.value))"
            aria-hidden="true"
          >
            <span class="theme-style-header"><i /><i /><i /></span>
            <span class="theme-style-sidebar">
              <b><em /></b>
              <i />
              <i />
              <i />
            </span>
            <span class="theme-style-tabs">
              <b><em /></b>
              <i />
            </span>
            <span class="theme-style-content">
              <span class="theme-style-metric" />
              <span class="theme-style-metric" />
              <span class="theme-style-panel">
                <i />
                <i />
                <b><em /></b>
              </span>
            </span>
          </span>
          <span
            v-if="!previewOnly"
            class="text-center"
          >
            {{ option.label }}
          </span>
        </span>
      </component>
      <slot
        v-if="previewOnly"
        name="preview-label"
        :label="option.label"
      />
    </template>
  </div>
</template>
<style scoped>
.theme-style-card {
  width: 100%;
}
.theme-style-current {
  max-inline-size: 100%;
}
.theme-style-choice[data-style-choice] {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  block-size: auto;
  min-inline-size: 0;
  white-space: normal;
  padding: var(--ui-space-component-unit);
  border-radius: var(--ui-radius-control);
  border-width: var(--ui-border-width);
  border-style: solid;
  border-color: var(--ui-color-border-default);
  background-color: var(--ui-color-surface-page);
}
.theme-style-choice[data-style-choice][aria-pressed='true'] {
  border-color: currentColor;
  background-color: var(--ui-color-surface-panel);
}
.theme-style-choice[data-style-choice]:not(:disabled):hover {
  color: var(--ui-color-control-primary);
}
@media (forced-colors: active) {
  .theme-style-choice[data-style-choice][aria-pressed='true'] {
    border-color: Highlight;
    background-color: Highlight;
    color: HighlightText;
    forced-color-adjust: none;
  }
}
html[data-pavp-settings-appearance~='fill']
  .theme-style-gallery
  .theme-style-choice[data-style-choice][aria-pressed='true'] {
  transition: background-color var(--pavp-settings-appearance-duration) var(--ui-motion-easing) !important;
}
html[data-pavp-settings-appearance~='edge']
  .theme-style-gallery
  .theme-style-choice[data-style-choice][aria-pressed='false'] {
  transition: border-color var(--pavp-settings-appearance-duration) var(--ui-motion-easing) !important;
}
html[data-pavp-settings-appearance]
  :is(.theme-style-tabs, .theme-style-content, .theme-style-metric, .theme-style-panel) {
  transition: background-color var(--pavp-settings-appearance-duration) var(--ui-motion-easing);
}
.theme-style-scene {
  display: grid;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 5 / 3;
  grid-template-columns: minmax(0, 1fr) minmax(0, 3fr);
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 4fr);
}
.theme-style-header {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--ui-space-component-unit);
  padding: var(--ui-space-component-unit);
  background: var(--preview-header);
  color: var(--preview-header-text);
}
.theme-style-header i {
  height: var(--ui-space-component-unit);
  width: var(--ui-space-component-unit);
  background: currentColor;
  border-radius: var(--ui-radius-control);
}
.theme-style-sidebar {
  grid-row: 2 / 4;
  display: grid;
  align-content: start;
  gap: var(--ui-space-component-unit);
  padding: var(--ui-space-component-unit);
  background: var(--preview-sidebar);
  color: var(--preview-sidebar-text);
}
.theme-style-sidebar i,
.theme-style-sidebar b {
  height: var(--ui-space-component-unit);
  background: currentColor;
  border-radius: var(--ui-radius-control);
}
.theme-style-sidebar i {
  opacity: 0.3;
}
.theme-style-tabs {
  display: flex;
  gap: var(--ui-space-component-unit);
  padding: var(--ui-space-component-unit);
  background: var(--preview-tabs);
}
.theme-style-tabs b {
  width: 45%;
  background: var(--preview-accent);
  border-radius: var(--ui-radius-control);
}
.theme-style-tabs i {
  width: 30%;
  background: var(--preview-panel);
}
.theme-style-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--ui-space-component-unit);
  padding: var(--ui-space-component-unit);
  background: var(--preview-content);
}
.theme-style-metric {
  background: var(--preview-panel);
  border-radius: var(--ui-radius-control);
}
.theme-style-panel {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: var(--ui-space-component-unit);
  background: var(--preview-panel);
  border-radius: var(--ui-radius-control);
}
.theme-style-panel b {
  width: 30%;
  height: var(--ui-space-component-unit);
  background: var(--preview-accent);
  border-radius: var(--ui-radius-control);
}

.theme-style-sidebar b {
  background: var(--preview-menu-active);
  color: var(--preview-menu-content);
  display: flex;
  align-items: center;
  justify-content: center;
}
.theme-style-tabs b,
.theme-style-panel b {
  color: var(--preview-on-accent);
  display: flex;
  align-items: center;
  justify-content: center;
}
.theme-style-scene em {
  display: block;
  width: 50%;
  height: 25%;
  background: currentColor;
}
</style>
