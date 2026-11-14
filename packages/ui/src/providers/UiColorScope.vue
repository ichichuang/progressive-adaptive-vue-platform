<script setup lang="ts">
import { projectRegionAppearance, type AppearanceRegion } from '@platform/design-system'
import { computed, inject, provide, useId } from 'vue'
import { NConfigProvider } from 'naive-ui/es/config-provider'
import {
  pavpNaiveAppearanceKey,
  pavpRootAppearanceKey,
  pavpOverlayTargetKey,
  pavpMeasuredThemeKey,
  pavpForcedColorsKey,
} from '../adapters/naive/pavp-naive-runtime-context'
import {
  regionalHeaderTheme,
  regionalNavigationTheme,
  regionalNavigationPressedStyle,
} from '../adapters/naive/regional-navigation-theme'
import { createPavpNaiveThemeProjection } from '../adapters/naive/pavp-naive-theme'

defineOptions({ name: 'UiColorScope' })
const props = defineProps<{ readonly region: AppearanceRegion; readonly overlayId?: string }>()
const global = inject(pavpRootAppearanceKey)
if (global === undefined) throw new Error('Color scope requires UiProvider.')
const forcedColors = inject(pavpForcedColorsKey)
const resolved = computed(() => {
  if (forcedColors?.value === true || global.value.colorStyle === 'unified') return null
  const projection = projectRegionAppearance(global.value, props.region)
  return projection.isCustomized ? projection : null
})
const overlayTarget = props.overlayId ?? `pavp-color-overlay-${useId()}`
provide(pavpOverlayTargetKey, `#${overlayTarget}`)
const measured = inject(pavpMeasuredThemeKey)
const appearance = computed(() => resolved.value?.appearance ?? global.value)
provide(pavpNaiveAppearanceKey, appearance)
const projection = computed(() =>
  resolved.value === null ? undefined : createPavpNaiveThemeProjection(appearance.value),
)
const surfaceOverrides = computed(() => {
  if (resolved.value === null) return {}
  if (props.region === 'header')
    return { Button: regionalHeaderTheme(resolved.value.surface, resolved.value.appearance) }
  if (props.region === 'sidebar') {
    return {
      Menu: regionalNavigationTheme(resolved.value.appearance),
      ...(global.value.colorStyle === 'brand-sidebar' || global.value.colorStyle === 'brand-frame'
        ? { Button: regionalHeaderTheme(resolved.value.surface, resolved.value.appearance) }
        : {}),
    }
  }
  return {}
})
const style = computed(() =>
  resolved.value === null
    ? undefined
    : {
        ...resolved.value.cssVariables,
        ...regionalNavigationPressedStyle(resolved.value.appearance),
        '--pavp-region-background': resolved.value.surface.background,
        '--pavp-region-foreground': resolved.value.surface.foreground,
      },
)
</script>

<template>
  <Teleport to="#pavp-overlay-root">
    <div
      :id="overlayTarget"
      :data-pavp-color-scope="resolved !== null ? '' : undefined"
      :data-color-mode="appearance.colorMode"
      :data-material="appearance.material"
      :data-contrast="appearance.contrast"
      :style="resolved === null ? undefined : resolved.cssVariables"
    />
  </Teleport>
  <NConfigProvider
    class="pavp-color-scope"
    :data-color-region="region"
    :data-pavp-color-scope="resolved !== null ? '' : undefined"
    :data-color-mode="appearance.colorMode"
    :data-material="appearance.material"
    :data-contrast="appearance.contrast"
    v-bind="
      projection === undefined
        ? {}
        : { theme: projection.theme, themeOverrides: projection.themeOverrides }
    "
    :style="style"
    :preflight-style-disabled="true"
  >
    <NConfigProvider
      abstract
      :theme-overrides="measured ?? {}"
    >
      <NConfigProvider
        abstract
        :theme-overrides="surfaceOverrides"
      >
        <slot />
      </NConfigProvider>
    </NConfigProvider>
  </NConfigProvider>
</template>

<style scoped>
.pavp-color-scope {
  display: contents;
}
</style>
