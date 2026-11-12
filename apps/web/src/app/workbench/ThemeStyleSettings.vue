<script setup lang="ts">
import { computed } from 'vue'
import { UiRadioCardGroup } from '@platform/ui'
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
}>()
const emit = defineEmits<{ 'update:modelValue': [value: ColorStyle] }>()
const { t } = useConsoleI18n()
const labels = {
  unified: 'settings.styles.unified',
  'dark-navigation': 'settings.styles.dark-navigation',
  'brand-sidebar': 'settings.styles.brand-sidebar',
  'brand-header': 'settings.styles.brand-header',
  'dark-frame': 'settings.styles.dark-frame',
  'brand-frame': 'settings.styles.brand-frame',
  'soft-frame': 'settings.styles.soft-frame',
} as const
const options = computed(() => colorStyleIds.map((value) => ({ value, label: t(labels[value]) })))
function previewStyle(style: ColorStyle): Record<string, string> {
  const snapshot = { ...props.appearance, colorStyle: style }
  const sidebar = projectRegionAppearance(snapshot, 'sidebar')
  const header = projectRegionAppearance(snapshot, 'header')
  const tabs = projectRegionAppearance(snapshot, 'tabs')
  const content = projectRegionAppearance(snapshot, 'content')
  const menuPalette = sidebar.appearance.colorPalette.roles.primary
  const menuSelection = sidebar.isCustomized ? menuPalette.solid : menuPalette.soft
  return {
    '--preview-sidebar': sidebar.surface.background,
    '--preview-sidebar-text': sidebar.appearance.colorPalette.text.primary,
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
</script>
<template>
  <section
    class="grid min-w-0 gap-content-gap"
    :aria-label="t('settings.styles.title')"
  >
    <h3 class="font-title-weight m-0 text-subheading">
      {{ t('settings.styles.title') }}
    </h3>
    <UiRadioCardGroup
      class="theme-style-grid"
      :accessible-label="t('settings.styles.title')"
      :model-value="modelValue"
      :options="options"
      :disabled="disabled"
      @update:model-value="emit('update:modelValue', colorStyleSchema.parse($event))"
    >
      <template #option="{ option, selected }">
        <span class="theme-style-card grid gap-content-gap">
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
          <span class="flex items-center justify-center gap-content-gap">
            <span
              v-if="selected"
              class="i-lucide-circle-check"
              aria-hidden="true"
            />
            {{ option.label }}
          </span>
        </span>
      </template>
    </UiRadioCardGroup>
  </section>
</template>
<style scoped>
.theme-style-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(
      min(
        100%,
        max(calc(var(--ui-control-height) * 4), calc((100% - var(--ui-space-content-gap) * 3) / 4))
      ),
      1fr
    )
  );
  gap: var(--ui-space-content-gap);
}
:global([data-layout-profile='narrow'] .theme-style-grid) {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
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
