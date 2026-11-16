<script setup lang="ts">
import { computed, ref } from 'vue'
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
      previewOnly ? 'flex min-w-0 items-center gap-content-gap' : 'grid grid-cols-2 gap-content-gap'
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
        :is="previewOnly ? 'span' : 'button'"
        :class="{
          'w-admin-sidebar-rail shrink-0': previewOnly,
          'rounded-control border-solid min-w-0 cursor-pointer bg-surface-panel border-border-default border-width-default p-panel-narrow px-button-inline':
            !previewOnly,
          'text-control-primary': !previewOnly && option.value === modelValue,
          'text-text-primary': !previewOnly && option.value !== modelValue,
        }"
        :type="previewOnly ? undefined : 'button'"
        :disabled="previewOnly ? undefined : disabled"
        :aria-pressed="previewOnly ? undefined : option.value === modelValue"
        :aria-hidden="previewOnly ? 'true' : undefined"
        :tabindex="previewOnly ? undefined : option.value === focusedStyle ? 0 : -1"
        :data-style-choice="previewOnly ? undefined : ''"
        @focus="focusedStyle = option.value"
        @keydown="moveFocus"
        @click="choose(option.value)"
      >
        <span
          class="theme-style-card grid min-w-0 whitespace-normal break-words gap-component-unit"
        >
          <span
            v-if="!previewOnly"
            class="flex justify-end"
          >
            <span
              class="i-lucide-circle-check"
              :class="{ invisible: option.value !== modelValue }"
              aria-hidden="true"
            />
          </span>
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
.theme-style-scene {
  display: grid;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 5 / 3;
  grid-template-columns: 1fr 3fr;
  grid-template-rows: 1fr 1fr 4fr;
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
