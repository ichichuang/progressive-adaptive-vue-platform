<script setup lang="ts">
import type { UiDateTimeContext } from '../date-time/date-time'
import { uiDateTimeContext } from '../date-time/date-time-context'
import { uiLocaleKey } from './ui-locale'
import { projectRegionAppearance, tokens, type UiAppearanceSnapshot } from '@platform/design-system'
import type { UiLocale } from '../components/contracts'
import type { GlobalThemeOverrides } from 'naive-ui'
import zhCN from 'naive-ui/es/locales/common/zhCN'
import enUS from 'naive-ui/es/locales/common/enUS'
import dateZhCN from 'naive-ui/es/locales/date/zhCN'
import dateEnUS from 'naive-ui/es/locales/date/enUS'
import { NConfigProvider } from 'naive-ui/es/config-provider'
import { computed, onBeforeUnmount, onMounted, provide, ref, toRef, watch } from 'vue'

import {
  pavpNaiveAppearanceKey,
  pavpRootAppearanceKey,
  pavpMeasuredThemeKey,
  pavpForcedColorsKey,
} from '../adapters/naive/pavp-naive-runtime-context'
import { createPavpNaiveThemeProjection } from '../adapters/naive/pavp-naive-theme'
import { attachSegmentedSelectionMotion } from '../adapters/motion/segmented-selection-motion'
import { loadScrollEnhancement } from '../adapters/scroll/scroll-enhancement-loader'

defineOptions({ name: 'UiProvider' })

const props = defineProps<{
  readonly dateTime?: UiDateTimeContext
  readonly appearance: Readonly<UiAppearanceSnapshot>
  readonly locale: UiLocale
}>()

provide(
  uiLocaleKey,
  toRef(() => props.locale),
)
provide(
  uiDateTimeContext,
  computed(() => props.dateTime),
)

defineSlots<{
  default: (props: Readonly<Record<string, never>>) => unknown
}>()

const forcedColorsMedia = window.matchMedia('(forced-colors: active)')
const forcedColors = ref(forcedColorsMedia.matches)
provide(pavpForcedColorsKey, forcedColors)
const synchronizeForcedColors = (): void => {
  forcedColors.value = forcedColorsMedia.matches
}
forcedColorsMedia.addEventListener('change', synchronizeForcedColors)
onBeforeUnmount(() => {
  forcedColorsMedia.removeEventListener('change', synchronizeForcedColors)
})
const controlMetric = ref<HTMLElement | null>(null)
const overlayRoot = ref<HTMLElement | null>(null)
const smallMetric = ref<HTMLElement | null>(null)
const largeMetric = ref<HTMLElement | null>(null)
const breakpointMetric = ref<HTMLElement | null>(null)
const metrics = ref<{
  control: number
  small: number
  large: number
  breakpoint: number
  narrow: boolean
} | null>(null)
let metricObserver: ResizeObserver | undefined
let sizeObserver: MutationObserver | undefined
let sizeTimer: ReturnType<typeof setTimeout> | undefined
let sizeFrame: number | undefined
let sizeRevision = 0

function finishSizeTransition(): void {
  sizeRevision += 1
  clearTimeout(sizeTimer)
  if (sizeFrame !== undefined) cancelAnimationFrame(sizeFrame)
  sizeTimer = undefined
  sizeFrame = undefined
  document.documentElement.removeAttribute('data-ui-size-transition')
}
const measuredTheme = computed<GlobalThemeOverrides>(() => {
  if (metrics.value === null) return {}
  const menu = {
    optionHeightSmall: `${String(metrics.value.small)}px`,
    optionHeightMedium: `${String(metrics.value.control)}px`,
    optionHeightLarge: `${String(metrics.value.large)}px`,
  }
  const padding = metrics.value.narrow
    ? tokens['spacing.panel.padding-narrow']
    : tokens['spacing.panel.padding']
  const peers = { InternalSelectMenu: menu }
  return {
    Card: { paddingMedium: padding, paddingLarge: padding, paddingHuge: padding },
    Dialog: { padding },
    Drawer: { bodyPadding: padding, headerPadding: padding, footerPadding: padding },
    Select: { peers },
    AutoComplete: { peers },
    Popselect: { peers },
    Cascader: { peers, optionHeight: `${String(metrics.value.control)}px` },
  }
})
provide(pavpMeasuredThemeKey, measuredTheme)
const projection = computed(() => {
  const base = createPavpNaiveThemeProjection(props.appearance)
  if (metrics.value === null) return base
  const normal = `${String(metrics.value.control)}px`
  const large = `${String(metrics.value.large)}px`
  const menu = {
    optionHeightSmall: `${String(metrics.value.small)}px`,
    optionHeightMedium: normal,
    optionHeightLarge: large,
  }
  const panelPadding = metrics.value.narrow
    ? tokens['spacing.panel.padding-narrow']
    : tokens['spacing.panel.padding']
  const current: GlobalThemeOverrides = base.themeOverrides
  function withMenu(theme: { peers?: { InternalSelectMenu?: object } } | undefined) {
    return {
      ...theme,
      peers: {
        ...theme?.peers,
        InternalSelectMenu: { ...theme?.peers?.InternalSelectMenu, ...menu },
      },
    }
  }
  const themeOverrides: GlobalThemeOverrides = {
    ...current,
    Card: {
      ...current.Card,
      paddingMedium: panelPadding,
      paddingLarge: panelPadding,
      paddingHuge: panelPadding,
    },
    Dialog: { ...current.Dialog, padding: panelPadding },
    Drawer: {
      ...current.Drawer,
      bodyPadding: panelPadding,
      headerPadding: panelPadding,
      footerPadding: panelPadding,
    },
    Select: withMenu(current.Select),
    AutoComplete: withMenu(current.AutoComplete),
    Popselect: withMenu(current.Popselect),
    Cascader: { ...withMenu(current.Cascader), optionHeight: normal },
  }
  return { ...base, themeOverrides }
})
const contentRegion = computed(() => {
  if (forcedColors.value || props.appearance.colorStyle === 'unified') return null
  const projection = projectRegionAppearance(props.appearance, 'content')
  return projection.isCustomized ? projection : null
})
const appearance = toRef(() => props.appearance)

provide(pavpNaiveAppearanceKey, appearance)
provide(pavpRootAppearanceKey, appearance)
watch(
  [() => appearance.value.motion === 'full' && !forcedColors.value, controlMetric, overlayRoot],
  ([enabled, metric, overlay], _, onCleanup) => {
    if (!enabled || typeof Element.prototype.animate !== 'function') return
    const scopes = [metric?.parentElement, overlay].filter((element) => element != null)
    if (scopes.length > 0) {
      onCleanup(
        attachSegmentedSelectionMotion(scopes, [
          {
            group: '.n-radio-group--button-group:not([data-ui-radio-card-group])',
            option: '.n-radio-button',
            checkedOption: '.n-radio-button--checked:not(.n-radio-button--disabled)',
            label: '.n-radio__label',
          },
          {
            group: '.n-button-group[data-pavp-exclusive-selection]:not(.n-button-group--vertical)',
            option: '.n-button[aria-pressed]',
            checkedOption: '.n-button[aria-pressed="true"]:not(:disabled)',
            label: '.n-button__content',
          },
          {
            group: '.n-tabs--segment-type .n-tabs-rail',
            option: '.n-tabs-tab-wrapper > .n-tabs-tab[data-name]',
            checkedOption: '.n-tabs-tab-wrapper > .n-tabs-tab--active:not(.n-tabs-tab--disabled)',
            label: '.n-tabs-tab__label',
          },
        ]),
      )
    }
  },
  { immediate: true, flush: 'post' },
)
provide(
  'pavp.scroll',
  (host: HTMLElement, viewport: HTMLElement, content: HTMLElement, xScrollable: boolean) => {
    let disposed = false
    let detach: (() => void) | undefined
    void loadScrollEnhancement().then((runtime) => {
      if (!disposed)
        detach = runtime?.attachNaiveScrollbar(host, viewport, content, xScrollable, appearance)
    })
    return () => {
      disposed = true
      detach?.()
    }
  },
)

onMounted(() => {
  const root = document.documentElement
  const control = controlMetric.value
  const large = largeMetric.value
  const small = smallMetric.value
  const breakpoint = breakpointMetric.value
  if (!control || !large || !small || !breakpoint) return
  let previousDensity = root.getAttribute('data-density')
  let previousFontScale = root.style.getPropertyValue('--ui-font-scale')
  sizeObserver = new MutationObserver((records) => {
    const density = root.getAttribute('data-density')
    const fontScale = root.style.getPropertyValue('--ui-font-scale')
    const changed = density !== previousDensity || fontScale !== previousFontScale
    previousDensity = density
    previousFontScale = fontScale
    const transition = root.getAttribute('data-ui-size-transition')
    const hintChanged = records.some((record) => record.attributeName === 'data-ui-size-transition')
    const interrupted =
      transition !== null && transition !== 'instant' && root.getAttribute('data-motion') !== 'full'
    if (!changed && !hintChanged && !interrupted) return
    if (transition === null || interrupted) {
      finishSizeTransition()
      updateMetrics()
      return
    }

    // The appearance transaction armed transitions before changing size.
    // This observer owns cleanup only, without deferring the committed preference.
    const revision = ++sizeRevision
    clearTimeout(sizeTimer)
    if (sizeFrame !== undefined) cancelAnimationFrame(sizeFrame)
    if (transition === 'instant') {
      updateMetrics()
      // Allow the measured vendor sizes and indicator geometry to render before releasing the hint.
      sizeFrame = requestAnimationFrame(() => {
        sizeFrame = requestAnimationFrame(() => {
          if (revision === sizeRevision) finishSizeTransition()
        })
      })
      return
    }
    const duration = getComputedStyle(root).getPropertyValue('--ui-motion-duration').trim()
    const milliseconds = Number.parseFloat(duration) * (duration.endsWith('ms') ? 1 : 1000)
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
      finishSizeTransition()
      updateMetrics()
      return
    }
    sizeFrame = requestAnimationFrame(() => {
      sizeFrame = undefined
      sizeTimer = setTimeout(() => {
        // Naive's measured geometry can begin after the canonical CSS change.
        // Finish those actual transitions, not an estimated extra delay.
        const transitions = root
          .getAnimations({ subtree: true })
          .filter(
            (animation) =>
              animation instanceof CSSTransition &&
              /^(font-size|height|min-height|max-height|min-width|padding-.+|margin-.+|row-gap|column-gap|line-height)$/.test(
                animation.transitionProperty,
              ),
          )
        void Promise.allSettled(transitions.map((animation) => animation.finished)).then(() => {
          if (revision === sizeRevision) {
            finishSizeTransition()
            updateMetrics()
          }
        })
      }, milliseconds)
    })
  })
  sizeObserver.observe(root, {
    attributes: true,
    attributeFilter: ['data-density', 'data-motion', 'style', 'data-ui-size-transition'],
  })

  let measuredFontTransition: CSSTransition | undefined
  let measuredDensity: string | null = null
  const updateMetrics = (): void => {
    const fontTransition =
      root.getAttribute('data-ui-size-transition') === 'font-scale'
        ? root
            .getAnimations()
            .find(
              (animation): animation is CSSTransition =>
                animation instanceof CSSTransition && animation.transitionProperty === 'font-size',
            )
        : undefined
    const density = root.getAttribute('data-density')
    const previous = metrics.value
    if (
      fontTransition !== undefined &&
      fontTransition === measuredFontTransition &&
      density === measuredDensity &&
      previous !== null
    ) {
      const narrow = root.clientWidth < previous.breakpoint
      if (narrow !== previous.narrow) metrics.value = { ...previous, narrow }
      return
    }

    // Native font scaling changes rem probes every frame. Measure their target
    // once per transition, keeping virtual-menu measurements stable without
    // rebuilding the entire Naive theme for every intermediate text size.
    const targetFontSize =
      fontTransition?.effect instanceof KeyframeEffect
        ? fontTransition.effect.getKeyframes().at(-1)?.['fontSize']
        : undefined
    const currentFontSize = Number.parseFloat(getComputedStyle(root).fontSize)
    const targetSize = typeof targetFontSize === 'string' ? Number.parseFloat(targetFontSize) : NaN
    const scale =
      Number.isFinite(targetSize) && targetSize > 0 && currentFontSize > 0
        ? targetSize / currentFontSize
        : 1
    const controlHeight = control.getBoundingClientRect().height * scale
    const largeHeight = large.getBoundingClientRect().height * scale
    const smallHeight = small.getBoundingClientRect().height * scale
    const breakpointWidth = breakpoint.getBoundingClientRect().width * scale
    if (controlHeight <= 0 || largeHeight <= 0 || smallHeight <= 0 || breakpointWidth <= 0) return
    const narrow = root.clientWidth < breakpointWidth
    measuredFontTransition = fontTransition
    measuredDensity = density
    if (
      previous?.control === controlHeight &&
      previous.small === smallHeight &&
      previous.large === largeHeight &&
      previous.breakpoint === breakpointWidth &&
      previous.narrow === narrow
    )
      return
    metrics.value = {
      control: controlHeight,
      large: largeHeight,
      small: smallHeight,
      breakpoint: breakpointWidth,
      narrow,
    }
  }
  updateMetrics()
  metricObserver = new ResizeObserver(updateMetrics)
  metricObserver.observe(control)
  metricObserver.observe(large)
  metricObserver.observe(small)
  metricObserver.observe(breakpoint)
  metricObserver.observe(document.documentElement)
})
onBeforeUnmount(() => {
  sizeObserver?.disconnect()
  finishSizeTransition()
  metricObserver?.disconnect()
})
</script>

<template>
  <div
    id="pavp-overlay-root"
    ref="overlayRoot"
    :data-pavp-color-scope="contentRegion !== null ? '' : undefined"
    :data-color-mode="contentRegion?.appearance.colorMode"
    :data-material="contentRegion?.appearance.material"
    :data-contrast="contentRegion?.appearance.contrast"
    :style="contentRegion === null ? undefined : contentRegion.cssVariables"
  />
  <NConfigProvider
    :preflight-style-disabled="true"
    :locale="locale === 'zh-CN' ? zhCN : enUS"
    :date-locale="locale === 'zh-CN' ? dateZhCN : dateEnUS"
    :theme="projection.theme"
    :theme-overrides="projection.themeOverrides"
  >
    <span
      ref="controlMetric"
      class="block invisible absolute h-control"
      aria-hidden="true"
    />
    <span
      ref="largeMetric"
      class="block invisible absolute h-control-large"
      aria-hidden="true"
    />
    <span
      ref="smallMetric"
      class="block invisible absolute h-control-small"
      aria-hidden="true"
    />
    <span
      ref="breakpointMetric"
      class="block invisible pointer-events-none fixed"
      :style="{
        width: tokens['layout.profile.regular.min-inline-size'],
        height: '0',
        left: '0',
        top: '0',
      }"
      aria-hidden="true"
    />
    <slot />
  </NConfigProvider>
</template>

<style>
/* Opt-in for calendar surfaces whose seven columns must fit a narrow panel. */
[data-pavp-compact-calendar].n-calendar {
  height: auto;
}
[data-pavp-compact-calendar].n-calendar .n-calendar-dates .n-calendar-cell {
  min-block-size: var(--ui-layout-target-enhanced-minimum-block-size);
  padding: var(--ui-space-component-unit);
}
[data-pavp-compact-calendar].n-calendar .n-calendar-dates .n-calendar-date {
  display: grid;
  justify-content: center;
  justify-items: center;
  height: auto;
  padding-bottom: 0;
  white-space: nowrap;
}
[data-pavp-compact-calendar].n-calendar .n-calendar-dates .n-calendar-date__date {
  margin-left: 0;
}

@layer vendor-overrides {
  /* Standalone segments keep their radius regardless of the decorative sibling. */
  .n-button-group[data-pavp-exclusive-selection]:not(.n-button-group--vertical)
    > .n-button[aria-pressed] {
    border-radius: var(--ui-radius-control) !important;
  }

  .n-cascader-menu {
    max-width: calc(100vw - 2 * var(--ui-space-page-inline));
  }

  .n-cascader-menu .n-cascader-submenu-wrapper {
    overflow-x: auto;
  }

  .n-pagination--simple .n-pagination-quick-jumper .n-input {
    text-align: center;
  }

  .n-color-picker .n-color-picker__fill {
    overflow: hidden;
  }

  .n-qr-code {
    box-sizing: content-box;
  }

  .n-time-picker-col__item:not(.n-time-picker-col__item--disabled):active {
    --n-item-text-color: var(--n-item-text-color-active);
  }

  html[data-motion='full']
    :where(
      .n-time-picker-col__item,
      .n-cascader-option,
      .n-date-panel-month-calendar__picker-col-item
    ),
  html[data-motion='full']
    :where(.n-time-picker-col__item, .n-date-panel-month-calendar__picker-col-item)::before {
    transition-duration: var(--ui-motion-duration) !important;
    transition-timing-function: var(--ui-motion-easing) !important;
  }

  html[data-motion='reduced']
    :where(
      .n-time-picker-col__item,
      .n-cascader-option,
      .n-date-panel-month-calendar__picker-col-item
    ),
  html[data-motion='reduced']
    :where(.n-time-picker-col__item, .n-date-panel-month-calendar__picker-col-item)::before {
    transition-duration: calc(var(--ui-motion-duration) / 2) !important;
    transition-timing-function: var(--ui-motion-easing) !important;
  }

  html[data-motion='none']
    :where(
      .n-time-picker-col__item,
      .n-cascader-option,
      .n-date-panel-month-calendar__picker-col-item
    ),
  html[data-motion='none']
    :where(.n-time-picker-col__item, .n-date-panel-month-calendar__picker-col-item)::before {
    transition: none !important;
  }

  html[data-motion] :where(.n-button .n-base-wave, .n-button .n-icon-slot) {
    transition-duration: var(--ui-motion-duration);
  }

  html[data-motion]
    :where(
      .n-button,
      .n-button__border,
      .n-button__state-border,
      .n-button .n-base-wave,
      .n-button .n-icon-slot,
      .n-breadcrumb-item,
      .n-breadcrumb-item .n-icon,
      .n-breadcrumb-item__link,
      .n-breadcrumb-item__separator,
      .n-descriptions-header,
      .n-descriptions-table-wrapper,
      .n-descriptions-table-row,
      .n-descriptions-table-header,
      .n-descriptions-table-content,
      .n-descriptions-table-content__content,
      .n-descriptions-table-content__label,
      .n-radio-group__splitor,
      .n-radio__dot,
      .n-radio-button,
      .n-radio-button__state-border,
      .n-tag,
      .n-tag__border,
      .n-tag__icon,
      .n-tag__close
    ) {
    transition-timing-function: var(--ui-motion-easing);
  }

  html[data-motion] .n-radio__dot::before {
    transition-timing-function: var(--ui-motion-easing);
  }

  html[data-motion] .n-button .n-base-wave {
    animation-duration: var(--ui-motion-duration);
    animation-timing-function: var(--ui-motion-easing);
  }

  .pavp-admin-shell__header-action-tooltip.n-popover {
    box-sizing: border-box;
    border-color: var(--ui-color-border-default);
    border-style: solid;
    border-width: var(--ui-admin-border-width);
  }

  .pavp-workspace-context-menu {
    border-width: var(--ui-admin-border-width);
    border-style: solid;
    border-color: var(--ui-color-border-default);
  }
  .pavp-workspace-context-menu:focus-visible {
    outline: var(--ui-admin-border-focus);
    outline-offset: calc(-1 * var(--ui-admin-focus-outline-offset));
  }
  @media (forced-colors: active) {
    .pavp-workspace-context-menu.n-dropdown-menu {
      background: Canvas;
    }
    .pavp-workspace-context-menu .n-dropdown-option-body--pending {
      outline: var(--ui-admin-border-width) solid Highlight;
    }
  }
}
[data-pavp-admin-navigation='persistent']
  .pavp-admin-shell__sidebar.n-layout-sider
  > .n-layout-sider__border {
  width: var(--ui-admin-border-width);
}

.n-avatar.n-avatar {
  color: var(--ui-color-text-on-action);
}

.n-cascader-menu .n-cascader-submenu {
  width: min(
    calc(var(--ui-layout-admin-drawer-maximum-inline-size) / 2),
    calc((100vw - 2 * var(--ui-space-page-inline)) / 2)
  );
  min-width: min(
    calc(var(--ui-layout-admin-drawer-maximum-inline-size) / 2),
    calc((100vw - 2 * var(--ui-space-page-inline)) / 2)
  );
  height: auto;
  max-height: calc(6 * var(--ui-control-height));
}

.n-cascader-menu .n-cascader-option {
  min-width: 0;
}

html[data-motion]
  :where(
    .n-button,
    .n-button__border,
    .n-button__state-border,
    .n-breadcrumb-item,
    .n-breadcrumb-item .n-icon,
    .n-breadcrumb-item__link,
    .n-breadcrumb-item__separator,
    .n-descriptions-header,
    .n-descriptions-table-wrapper,
    .n-descriptions-table-row,
    .n-descriptions-table-header,
    .n-descriptions-table-content,
    .n-descriptions-table-content__content,
    .n-descriptions-table-content__label,
    .n-radio-group__splitor,
    .n-radio__dot,
    .n-radio-button,
    .n-radio-button__state-border,
    .n-tag,
    .n-tag__border,
    .n-tag__icon,
    .n-tag__close
  ) {
  transition-duration: var(--ui-motion-duration);
}

html[data-motion] .n-radio__dot::before {
  transition-duration: var(--ui-motion-duration);
}

html[data-motion] .n-button .n-icon-slot {
  transition-duration: var(--ui-motion-duration) !important;
  transition-timing-function: var(--ui-motion-easing) !important;
}

@media (forced-colors: active) {
  .pavp-admin-shell__header-action.n-button {
    outline: var(--ui-admin-border-control);
  }
}

html[data-motion='reduced']
  :where(
    .n-button,
    .n-button__border,
    .n-button__state-border,
    .n-button .n-base-wave,
    .n-button .n-icon-slot,
    .n-breadcrumb-item,
    .n-breadcrumb-item .n-icon,
    .n-breadcrumb-item__link,
    .n-breadcrumb-item__separator,
    .n-descriptions-header,
    .n-descriptions-table-wrapper,
    .n-descriptions-table-row,
    .n-descriptions-table-header,
    .n-descriptions-table-content,
    .n-descriptions-table-content__content,
    .n-descriptions-table-content__label,
    .n-radio-group__splitor,
    .n-radio__dot,
    .n-radio-button,
    .n-radio-button__state-border,
    .n-tag,
    .n-tag__border,
    .n-tag__icon,
    .n-tag__close
  ) {
  transition-duration: calc(var(--ui-motion-duration) / 2) !important;
}

html[data-motion='reduced'] .n-radio__dot::before {
  transition-duration: calc(var(--ui-motion-duration) / 2) !important;
}

html[data-motion='reduced'] .n-button .n-icon-slot {
  transition-duration: calc(var(--ui-motion-duration) / 2) !important;
}

html[data-motion='reduced'] .n-button .n-base-wave {
  animation-duration: calc(var(--ui-motion-duration) / 2) !important;
}

html[data-motion='none']
  :where(
    .n-button,
    .n-button__border,
    .n-button__state-border,
    .n-button .n-base-wave,
    .n-button .n-icon-slot,
    .n-breadcrumb-item,
    .n-breadcrumb-item .n-icon,
    .n-breadcrumb-item__link,
    .n-breadcrumb-item__separator,
    .n-descriptions-header,
    .n-descriptions-table-wrapper,
    .n-descriptions-table-row,
    .n-descriptions-table-header,
    .n-descriptions-table-content,
    .n-descriptions-table-content__content,
    .n-descriptions-table-content__label,
    .n-radio-group__splitor,
    .n-radio__dot,
    .n-radio__label,
    .n-radio-button,
    .n-radio-button__state-border,
    .n-tag,
    .n-tag__border,
    .n-tag__icon,
    .n-tag__close,
    .n-card,
    .n-input,
    .n-input__input,
    .n-input__border,
    .n-input__state-border,
    .n-input__suffix,
    .n-base-selection,
    .n-base-selection__border,
    .n-base-selection__state-border,
    .n-base-selection-label,
    .n-base-selection-input,
    .n-base-selection-overlay,
    .n-base-selection .n-base-suffix__arrow,
    .n-switch__rail,
    .n-switch__button,
    .n-base-select-menu,
    .n-base-select-menu .n-base-select-option,
    .n-base-select-menu .n-base-select-option::before,
    .n-base-select-menu .n-base-select-option__check,
    .pavp-form-control,
    .pavp-form-control *,
    .pavp-form-field .n-form-item-feedback,
    .pavp-form-select-menu,
    .pavp-form-select-menu *,
    .n-date-panel,
    .n-date-panel *
  ) {
  animation: none !important;
  transition: none !important;
}

html[data-motion='none'] .n-radio__dot::before,
html[data-motion='none'] .n-button .n-icon-slot,
html[data-motion='none'] .n-button .n-base-wave {
  animation: none !important;
  transition: none !important;
}

html[data-motion='none'] .pavp-admin-shell__header-action-icon-state,
html[data-motion='none'] .pavp-admin-shell__header-action-tooltip {
  animation: none !important;
  transition: none !important;
  transform: none !important;
}

html[data-motion='none'] .pavp-admin-navigation-dropdown {
  animation: none !important;
  transition: none !important;
  transform: none !important;
}

html[data-motion='full'] .pavp-admin-shell__header-action-icon-state,
html[data-motion='full'] .pavp-admin-shell__header-action-tooltip,
html[data-motion='full'] .n-card,
html[data-motion='full'] .n-input,
html[data-motion='full'] .n-input__input,
html[data-motion='full'] .n-input__suffix,
html[data-motion='full'] .n-input__border,
html[data-motion='full'] .n-input__state-border,
html[data-motion='full'] .n-base-selection,
html[data-motion='full'] .n-base-selection__border,
html[data-motion='full'] .n-base-selection__state-border,
html[data-motion='full'] .n-base-selection-label,
html[data-motion='full'] .n-base-selection-input,
html[data-motion='full'] .n-base-selection-overlay,
html[data-motion='full'] .n-base-selection .n-base-suffix__arrow,
html[data-motion='full'] .n-switch__rail,
html[data-motion='full'] .n-switch__button,
html[data-motion='full'] .pavp-form-field .n-form-item-feedback,
html[data-motion='full'] .n-base-select-menu,
html[data-motion='full'] .n-base-select-menu .n-base-select-option,
html[data-motion='full'] .n-base-select-menu .n-base-select-option::before,
html[data-motion='full'] .n-base-select-menu .n-base-select-option__check,
html[data-motion='full'] .n-date-panel,
html[data-motion='full'] .n-date-panel-date,
html[data-motion='full'] .n-date-panel-month__text,
html[data-motion='full'] .n-date-panel-month {
  transition-duration: var(--ui-motion-duration) !important;
  transition-timing-function: var(--ui-motion-easing) !important;
}

html[data-motion='full'] .pavp-admin-shell__header-action.n-button {
  transition-duration: var(--ui-motion-duration) !important;
  transition-property: background-color, color, opacity !important;
  transition-timing-function: var(--ui-motion-easing) !important;
}

html[data-motion='full'] .pavp-admin-shell__header-action-icon-state {
  transition-property: opacity, transform !important;
}

html[data-motion='reduced'] .pavp-admin-shell__header-action-icon-state,
html[data-motion='reduced'] .pavp-admin-shell__header-action-tooltip,
html[data-motion='reduced'] .n-card,
html[data-motion='reduced'] .n-input,
html[data-motion='reduced'] .n-input__input,
html[data-motion='reduced'] .n-input__suffix,
html[data-motion='reduced'] .n-input__border,
html[data-motion='reduced'] .n-input__state-border,
html[data-motion='reduced'] .n-base-selection,
html[data-motion='reduced'] .n-base-selection__border,
html[data-motion='reduced'] .n-base-selection__state-border,
html[data-motion='reduced'] .n-base-selection-label,
html[data-motion='reduced'] .n-base-selection-input,
html[data-motion='reduced'] .n-base-selection-overlay,
html[data-motion='reduced'] .n-base-selection .n-base-suffix__arrow,
html[data-motion='reduced'] .n-switch__rail,
html[data-motion='reduced'] .n-switch__button,
html[data-motion='reduced'] .pavp-form-field .n-form-item-feedback,
html[data-motion='reduced'] .n-base-select-menu,
html[data-motion='reduced'] .n-base-select-menu .n-base-select-option,
html[data-motion='reduced'] .n-base-select-menu .n-base-select-option::before,
html[data-motion='reduced'] .n-base-select-menu .n-base-select-option__check,
html[data-motion='reduced'] .n-date-panel,
html[data-motion='reduced'] .n-date-panel-date,
html[data-motion='reduced'] .n-date-panel-month__text,
html[data-motion='reduced'] .n-date-panel-month {
  transition-duration: calc(var(--ui-motion-duration) / 2) !important;
  transition-timing-function: var(--ui-motion-easing) !important;
}

html[data-motion='reduced'] .pavp-admin-shell__header-action.n-button,
html[data-motion='reduced'] .n-input,
html[data-motion='reduced'] .n-input__input,
html[data-motion='reduced'] .n-input__suffix,
html[data-motion='reduced'] .n-input__border,
html[data-motion='reduced'] .n-input__state-border,
html[data-motion='reduced'] .n-base-selection,
html[data-motion='reduced'] .n-base-selection__border,
html[data-motion='reduced'] .n-base-selection__state-border,
html[data-motion='reduced'] .n-base-selection-label,
html[data-motion='reduced'] .n-base-selection-input,
html[data-motion='reduced'] .n-base-selection-overlay,
html[data-motion='reduced'] .n-base-selection .n-base-suffix__arrow,
html[data-motion='reduced'] .n-switch__rail,
html[data-motion='reduced'] .n-switch__button,
html[data-motion='reduced'] .n-base-select-menu,
html[data-motion='reduced'] .n-base-select-menu .n-base-select-option,
html[data-motion='reduced'] .n-base-select-menu .n-base-select-option::before,
html[data-motion='reduced'] .n-base-select-menu .n-base-select-option__check,
html[data-motion='reduced'] .n-date-panel,
html[data-motion='reduced'] .n-date-panel-date,
html[data-motion='reduced'] .n-date-panel-month__text,
html[data-motion='reduced'] .n-date-panel-month {
  transition-duration: calc(var(--ui-motion-duration) / 2) !important;
  transition-property: background-color, color, opacity !important;
  transition-timing-function: var(--ui-motion-easing) !important;
}

html[data-motion='reduced'] .pavp-admin-shell__header-action-icon-state,
html[data-motion='reduced'] .pavp-form-field .n-form-item-feedback {
  transform: none !important;
  transition-property: opacity !important;
}

html[data-motion='reduced'] .pavp-admin-shell__header-action-tooltip {
  transition-property: background-color, color, opacity !important;
}

html[data-motion='reduced']
  .pavp-admin-shell__header-action-tooltip:is(
    .popover-transition-enter-from,
    .popover-transition-leave-to
  ),
html[data-motion='reduced']
  :is(.n-base-select-menu, .n-base-select-menu .n-base-select-option__check):is(
    .fade-in-scale-up-transition-enter-from,
    .fade-in-scale-up-transition-leave-to
  ),
html[data-motion='reduced']
  .n-date-panel:is(.fade-in-scale-up-transition-enter-from, .fade-in-scale-up-transition-leave-to) {
  transform: none !important;
}

html[data-motion='none']
  .pavp-admin-shell__header-action-tooltip:is(
    .popover-transition-enter-from,
    .popover-transition-leave-to
  ),
html[data-motion='none']
  :is(.n-base-select-menu, .n-base-select-menu .n-base-select-option__check):is(
    .fade-in-scale-up-transition-enter-from,
    .fade-in-scale-up-transition-leave-to
  ),
html[data-motion='none']
  .n-date-panel:is(.fade-in-scale-up-transition-enter-from, .fade-in-scale-up-transition-leave-to) {
  opacity: 1 !important;
  transform: none !important;
}

html[data-motion='full']
  :where(
    [data-pavp-admin-navigation='persistent'].n-layout,
    [data-pavp-admin-navigation='persistent'] .n-layout-sider,
    [data-pavp-admin-navigation='persistent'] .n-layout-sider__border,
    [data-pavp-admin-navigation='persistent'] .n-layout-sider-scroll-container,
    [data-pavp-admin-navigation='persistent'] .n-menu,
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content,
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__icon,
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__arrow,
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content-header,
    [data-pavp-admin-navigation='persistent'] .n-submenu-children,
    .pavp-admin-navigation-dropdown,
    .pavp-admin-navigation-dropdown .n-dropdown-option-body,
    .pavp-admin-navigation-dropdown .n-dropdown-option-body__prefix,
    .pavp-admin-navigation-dropdown .n-dropdown-option-body__suffix,
    .pavp-admin-navigation-dropdown .n-dropdown-divider
  ) {
  transition-duration: var(--ui-motion-duration) !important;
  transition-timing-function: var(--ui-motion-easing) !important;
}

html[data-motion='full']
  :where(
    [data-pavp-admin-navigation='persistent'] .n-menu,
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content,
    .pavp-admin-navigation-dropdown .n-dropdown-option-body
  ) {
  transition-property: background-color, color, opacity !important;
}

html[data-motion='full'] .pavp-admin-navigation-dropdown {
  transition-property: background-color, opacity, transform !important;
}

html[data-motion='full']
  :where(
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__icon,
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content-header,
    .pavp-admin-navigation-dropdown .n-dropdown-option-body__prefix,
    .pavp-admin-navigation-dropdown .n-dropdown-option-body__suffix
  ) {
  transition-property: color, opacity !important;
}

html[data-motion='full'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content__arrow {
  transition-property: color, opacity, transform !important;
}

html[data-motion='reduced']
  :where(
    [data-pavp-admin-navigation='persistent'].n-layout,
    [data-pavp-admin-navigation='persistent'] .n-layout-sider,
    [data-pavp-admin-navigation='persistent'] .n-layout-sider__border,
    [data-pavp-admin-navigation='persistent'] .n-layout-sider-scroll-container,
    [data-pavp-admin-navigation='persistent'] .n-menu,
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content,
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__icon,
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__arrow,
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content-header,
    [data-pavp-admin-navigation='persistent'] .n-submenu-children,
    .pavp-admin-navigation-dropdown,
    .pavp-admin-navigation-dropdown .n-dropdown-option-body,
    .pavp-admin-navigation-dropdown .n-dropdown-option-body__prefix,
    .pavp-admin-navigation-dropdown .n-dropdown-option-body__suffix,
    .pavp-admin-navigation-dropdown .n-dropdown-divider
  ) {
  transition-duration: calc(var(--ui-motion-duration) / 2) !important;
  transition-timing-function: var(--ui-motion-easing) !important;
}

html[data-motion='reduced']
  :where(
    [data-pavp-admin-navigation='persistent'] .n-menu,
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content,
    .pavp-admin-navigation-dropdown .n-dropdown-option-body
  ) {
  transition-property: background-color, color, opacity !important;
}

html[data-motion='reduced'] .pavp-admin-navigation-dropdown {
  transform: none !important;
  transition-property: opacity !important;
}

html[data-motion='reduced']
  :where(
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__icon,
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__arrow,
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content-header,
    .pavp-admin-navigation-dropdown .n-dropdown-option-body__prefix,
    .pavp-admin-navigation-dropdown .n-dropdown-option-body__suffix
  ) {
  transition-property: color !important;
}

html[data-motion='reduced'] .pavp-admin-navigation-dropdown.fade-in-scale-up-transition-enter-from,
html[data-motion='reduced'] .pavp-admin-navigation-dropdown.fade-in-scale-up-transition-leave-to {
  transform: none !important;
}

html[data-motion='none']
  :where(
    [data-pavp-admin-navigation='persistent'].n-layout,
    [data-pavp-admin-navigation='persistent'] .n-layout-sider,
    [data-pavp-admin-navigation='persistent'] .n-layout-sider__border,
    [data-pavp-admin-navigation='persistent'] .n-layout-sider-scroll-container,
    [data-pavp-admin-navigation='persistent'] .n-menu,
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content,
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__icon,
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__arrow,
    [data-pavp-admin-navigation='persistent'] .n-menu-item-content-header,
    [data-pavp-admin-navigation='persistent'] .n-submenu-children,
    .pavp-admin-navigation-dropdown,
    .pavp-admin-navigation-dropdown .n-dropdown-option-body,
    .pavp-admin-navigation-dropdown .n-dropdown-option-body__prefix,
    .pavp-admin-navigation-dropdown .n-dropdown-option-body__suffix,
    .pavp-admin-navigation-dropdown .n-dropdown-divider
  ) {
  animation: none !important;
  transition: none !important;
}

html[data-motion='none']
  [data-pavp-admin-navigation='persistent']
  :is(
    .n-submenu-children.fade-in-height-expand-transition-enter-active,
    .n-submenu-children.fade-in-height-expand-transition-leave-active,
    .n-submenu-children.fade-in-height-expand-transition-enter-from,
    .n-submenu-children.fade-in-height-expand-transition-leave-to
  ) {
  opacity: 1 !important;
}

html[data-motion='none'] .pavp-admin-navigation-dropdown.fade-in-scale-up-transition-enter-from,
html[data-motion='none'] .pavp-admin-navigation-dropdown.fade-in-scale-up-transition-leave-to {
  opacity: 1 !important;
  transform: none !important;
}

html[data-motion='full']
  .n-switch
  :is(.n-switch__checked, .n-switch__unchecked, .n-switch__button-icon, .n-base-loading) {
  transition-duration: var(--ui-motion-duration);
  transition-timing-function: var(--ui-motion-easing);
}
html:is([data-motion='reduced'], [data-motion='none'])
  .n-switch
  :is(.n-switch__checked, .n-switch__unchecked, .n-switch__button-icon, .n-base-loading) {
  transition: none;
}
@media (forced-colors: active) {
  .n-switch[role='switch'] :is(.n-switch__rail, .n-switch__button) {
    outline: var(--ui-admin-border-width) solid ButtonText;
  }
}
html[data-motion] .pavp-workspace-context-menu,
html[data-motion] .pavp-workspace-context-menu .n-dropdown-option-body {
  transition-duration: var(--ui-motion-duration) !important;
  transition-timing-function: var(--ui-motion-easing) !important;
}
html[data-motion='reduced'] .pavp-workspace-context-menu,
html[data-motion='reduced'] .pavp-workspace-context-menu .n-dropdown-option-body {
  transition-duration: calc(var(--ui-motion-duration) / 2) !important;
  transform: none !important;
}
html[data-motion='none'] .pavp-workspace-context-menu,
html[data-motion='none'] .pavp-workspace-context-menu .n-dropdown-option-body {
  transition: none !important;
  transform: none !important;
  opacity: 1 !important;
}
/* Editing focus stays on Naive's state border. Action focus follows the browser. */
.n-button:focus-visible {
  outline: var(--ui-admin-focus-width) solid currentColor;
  outline-offset: calc(-1 * var(--ui-admin-focus-outline-offset));
}

/* Keep :has() isolated so unsupported selectors do not discard other controls. */
.n-radio-button:has(.n-radio-input:focus-visible) {
  outline: var(--ui-admin-focus-width) solid currentColor;
  outline-offset: calc(-1 * var(--ui-admin-focus-outline-offset));
}

.n-checkbox:focus-visible .n-checkbox-box__border {
  outline: var(--ui-admin-border-focus);
  outline-offset: calc(-1 * var(--ui-admin-focus-outline-offset));
}

.n-radio:has(.n-radio-input:focus-visible) .n-radio__dot {
  outline: var(--ui-admin-border-focus);
  outline-offset: calc(-1 * var(--ui-admin-focus-outline-offset));
}

.n-checkbox:is(.n-checkbox--checked, .n-checkbox--indeterminate):focus-visible
  .n-checkbox-box__border {
  outline-color: var(--n-check-mark-color);
}

.n-radio.n-radio--checked:has(.n-radio-input:focus-visible) .n-radio__dot {
  outline-color: var(--n-dot-color-active);
}

.n-switch:focus-visible .n-switch__rail {
  outline: var(--ui-admin-focus-width) solid var(--n-text-color);
  outline-offset: calc(-1 * var(--ui-admin-focus-outline-offset));
}

/* Focus geometry is immediate; only color changes may transition. */
html[data-motion]
  :is(
    .n-button,
    .n-button__state-border,
    .n-checkbox-box__border,
    .n-radio__dot,
    .n-radio-button,
    .n-radio-button__state-border,
    .n-switch__rail,
    .n-input__state-border,
    .n-base-selection__state-border
  ) {
  transition-property: background-color, color, border-color, outline-color, opacity !important;
  transition-duration: var(--ui-motion-duration) !important;
  transition-timing-function: var(--ui-motion-easing) !important;
}

html:not([data-motion='full'])
  :is(
    .n-button,
    .n-button__state-border,
    .n-checkbox-box__border,
    .n-radio__dot,
    .n-switch__rail,
    .n-input__state-border,
    .n-base-selection__state-border
  ) {
  transition: none !important;
}

html[data-motion='reduced'] :is(.n-radio-button, .n-radio-button__state-border) {
  transition-duration: calc(var(--ui-motion-duration) / 2) !important;
}

html[data-motion='none'] :is(.n-radio-button, .n-radio-button__state-border) {
  transition: none !important;
}

html[data-motion='reduced']:not([data-pavp-settings-appearance])
  :is(
    .n-button[aria-pressed],
    .n-button[aria-pressed] > .n-button__border,
    .n-button[aria-pressed] > .n-button__state-border
  ) {
  transition-property: background-color, color, border-color, outline-color, opacity !important;
  transition-duration: calc(var(--ui-motion-duration) / 2) !important;
  transition-timing-function: var(--ui-motion-easing) !important;
}

.n-radio-group--button-group > :where(.n-radio-button:not([data-ui-radio-card-option])) {
  min-height: var(--n-height);
}

.n-radio-group--button-group
  > :where(.n-radio-button:not([data-ui-radio-card-option])):is(
    [data-settings-control],
    .min-h-target-enhanced
  ) {
  min-height: max(var(--n-height), var(--ui-layout-target-enhanced-minimum-block-size));
}

html[data-motion='full'] [data-settings-control],
html[data-motion='full'] [data-settings-control] :is(.n-switch__rail, .n-switch__button),
html[data-motion='full'] [data-settings-control] [data-ui-radio-card-option] {
  transition-duration: calc(var(--ui-motion-duration) / 2) !important;
}

/* Settings colors are committed as pairs. Choice owners opt in only approved paints. */
html[data-pavp-settings-appearance]
  :where(.pavp-admin-shell, #pavp-overlay-root)
  :is(
    .n-button,
    .n-button__border,
    .n-button__state-border,
    .n-radio-button,
    .n-radio-button__state-border,
    .n-radio-group__splitor,
    .n-switch__rail,
    .n-base-selection,
    .n-base-selection-label,
    .n-base-selection__border,
    .n-base-selection__state-border,
    .n-menu-item-content,
    .n-menu-item-content-header,
    .n-menu-item-content-header a,
    .n-menu-item-content__icon
  ) {
  transition-property: opacity !important;
  transition-duration: calc(var(--ui-motion-duration) / 2) !important;
}
html[data-pavp-settings-appearance] .pavp-admin-shell .n-menu-item-content__arrow {
  transition-property: opacity, transform !important;
}
html[data-pavp-settings-appearance] .pavp-admin-shell [data-settings-control] .n-switch__button {
  transition-property: left, max-width, opacity !important;
}
html[data-pavp-settings-appearance~='sidebar'] .pavp-admin-shell__sidebar.n-layout-sider {
  transition:
    min-width var(--ui-motion-duration) var(--ui-motion-easing),
    max-width var(--ui-motion-duration) var(--ui-motion-easing),
    transform var(--ui-motion-duration) var(--ui-motion-easing),
    background-color var(--pavp-settings-appearance-duration) var(--ui-motion-easing) !important;
}

@media (forced-colors: active) {
  .n-button:focus-visible,
  .n-checkbox:focus-visible .n-checkbox-box__border,
  .n-checkbox:is(.n-checkbox--checked, .n-checkbox--indeterminate):focus-visible
    .n-checkbox-box__border,
  .n-switch:focus-visible .n-switch__rail {
    outline-color: Highlight;
  }

  .n-radio-button:has(.n-radio-input:focus-visible),
  .n-radio:has(.n-radio-input:focus-visible) .n-radio__dot,
  .n-radio.n-radio--checked:has(.n-radio-input:focus-visible) .n-radio__dot {
    outline-color: Highlight;
  }

  .n-radio-button[data-ui-radio-card-option][data-selected='true']:has(
      .n-radio-input:focus-visible
    ) {
    outline-color: currentColor;
  }

  .n-input--focus > .n-input__state-border,
  .n-base-selection:is(.n-base-selection--focus, .n-base-selection--active)
    > .n-base-selection__state-border {
    outline: var(--ui-admin-focus-width) solid Highlight;
    outline-offset: calc(-1 * var(--ui-admin-focus-outline-offset));
  }
}
/* Root font scaling carries all rem-based text and geometry in the same frame. */
html[data-motion='full'][data-ui-size-transition='font-scale'] {
  transition: font-size var(--ui-motion-duration) var(--ui-motion-easing);
}

html[data-ui-size-transition='instant']
  :where(.pavp-admin-shell, #pavp-overlay-root)
  :is(.n-icon-slot, .n-base-wave, .pavp-admin-shell__sidebar) {
  transition-property: background-color, border-color, color, opacity, transform !important;
}

/* Geometry transitions exist only for a density commit, never ordinary editing or scrolling.
   Probe spans remain instantaneous so Naive menu measurements target the final density. */
html[data-motion='full'][data-ui-size-transition='density']
  :where(.n-config-provider, #pavp-overlay-root)
  :is(
    [class*='gap-content-gap'],
    [class*='gap-field-gap'],
    [class*='p-panel'],
    [class*='h-control'],
    .n-button,
    .n-input,
    .n-input-wrapper,
    .n-input__input-el,
    .n-base-selection,
    .n-base-selection-label,
    .n-base-selection-tags,
    .n-radio-button,
    .n-tag,
    .n-card-header,
    .n-card-content,
    .n-card__footer,
    .n-card__action,
    .n-dialog,
    .n-drawer-header,
    .n-drawer-body-content-wrapper,
    .n-drawer-footer,
    .n-form-item-label,
    .n-base-select-option,
    .n-data-table-th,
    .n-data-table-td,
    .n-pagination,
    .n-pagination-item,
    .pavp-chart-time-range-track,
    .pavp-admin-shell__identity,
    .pavp-admin-shell__navigation-group,
    .pavp-admin-shell__navigation-bottom
  ):not([aria-hidden='true']) {
  transition-property:
    height, min-height, max-height, min-width, padding, margin, gap, line-height, background-color,
    color, border-color, outline-color, box-shadow, opacity !important;
  transition-duration: var(--ui-motion-duration) !important;
  transition-timing-function: var(--ui-motion-easing) !important;
}

/* A shared track for Naive single-choice segments and grouped toggle buttons. */
.n-radio-group.n-radio-group--button-group:not([data-ui-radio-card-group]),
.n-button-group:not(.n-button-group--vertical):has(> .n-button[aria-pressed]):not(
    :has(> .n-button:not([aria-pressed]))
  ) {
  box-sizing: border-box;
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-self: start;
  block-size: auto;
  max-inline-size: 100%;
  gap: var(--ui-space-component-unit);
  padding: var(--ui-space-component-unit);
  border-width: var(--ui-admin-border-width);
  border-style: solid;
  border-color: var(--ui-color-border-default);
  border-radius: var(--ui-radius-control);
  background-color: var(--ui-color-surface-page);
}

.n-button-group:not(.n-button-group--vertical):has(> .n-button[aria-pressed]):not(
    :has(> .n-button:not([aria-pressed]))
  ) {
  gap: 0;
}

.n-radio-group.n-radio-group--button-group:not([data-ui-radio-card-group]) > .n-radio-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: auto;
  max-inline-size: 100%;
  min-inline-size: 0;
  padding-block: var(--ui-space-component-unit);
  padding-inline: var(--ui-space-button-inline);
  border: 0;
  border-radius: var(--ui-radius-control);
  line-height: var(--ui-font-line-height-body);
  text-align: center;
  white-space: normal;
  overflow-wrap: anywhere;
}

.n-radio-group.n-radio-group--button-group:not([data-ui-radio-card-group])
  > .n-radio-group__splitor {
  display: none;
}

.n-button-group[data-pavp-exclusive-selection] > .n-button > .n-button__border {
  border-color: transparent;
}

.pavp-segmented-selection {
  position: absolute;
  inset: 0 auto auto 0;
  z-index: calc(var(--ui-z-base) - 1);
  border-radius: var(--ui-radius-control);
  pointer-events: none;
  transform-origin: left top;
}

/* The hover paint sits below the moving selection and the native hit targets. */
:is(
  .n-radio-group--button-group:not([data-ui-radio-card-group]),
  .n-button-group[data-pavp-exclusive-selection]:not(.n-button-group--vertical),
  .n-tabs--segment-type .n-tabs-rail
) {
  position: relative;
  isolation: isolate;
}

:is(
  .n-radio-group--button-group:not([data-ui-radio-card-group])
    > .n-radio-button:not(.n-radio-button--disabled),
  .n-button-group[data-pavp-exclusive-selection]:not(.n-button-group--vertical)
    > .n-button[aria-pressed]:not(:disabled),
  .n-tabs--segment-type .n-tabs-rail .n-tabs-tab:not(.n-tabs-tab--disabled)
) {
  position: relative;
  transition-property: opacity, outline-color !important;
}

:is(
  .n-radio-group--button-group:not([data-ui-radio-card-group]) > .n-radio-button,
  .n-button-group[data-pavp-exclusive-selection]:not(.n-button-group--vertical)
    > .n-button[aria-pressed],
  .n-tabs--segment-type .n-tabs-rail .n-tabs-tab
)::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: calc(var(--ui-z-base) - 2);
  border-radius: var(--ui-radius-control);
  background-color: var(--ui-color-control-primary);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--ui-motion-duration) var(--ui-motion-easing);
}

@media (hover: hover) and (forced-colors: none) {
  :is(
      .n-radio-group--button-group:not([data-ui-radio-card-group])
        > .n-radio-button:not(.n-radio-button--checked, .n-radio-button--disabled),
      .n-button-group[data-pavp-exclusive-selection]:not(.n-button-group--vertical)
        > .n-button[aria-pressed='false']:not(:disabled),
      .n-tabs--segment-type .n-tabs-rail .n-tabs-tab:not(.n-tabs-tab--active, .n-tabs-tab--disabled)
    ):hover::before {
    opacity: 0.16;
  }
}

@media (forced-colors: none) {
  :is(
    .n-radio-group--button-group:not([data-ui-radio-card-group])
      > .n-radio-button:not(.n-radio-button--disabled),
    .n-button-group[data-pavp-exclusive-selection]:not(.n-button-group--vertical)
      > .n-button[aria-pressed]:not(:disabled),
    .n-tabs--segment-type .n-tabs-rail .n-tabs-tab:not(.n-tabs-tab--disabled)
  ) {
    background-color: transparent;
    color: var(--ui-color-text-primary);
  }

  :is(
      .n-radio-group--button-group:not([data-ui-radio-card-group])
        > .n-radio-button:not(.n-radio-button--disabled),
      .n-button-group[data-pavp-exclusive-selection]:not(.n-button-group--vertical)
        > .n-button[aria-pressed]:not(:disabled),
      .n-tabs--segment-type .n-tabs-rail .n-tabs-tab:not(.n-tabs-tab--disabled)
    ):active::before {
    opacity: 0.24;
  }

  .pavp-segmented-selection,
  .n-tabs--segment-type .n-tabs-rail > .n-tabs-capsule,
  :is(
    .n-radio-group--button-group:not([data-ui-radio-card-group], [data-pavp-segmented-selection])
      > .n-radio-button--checked:not(.n-radio-button--disabled),
    .n-button-group[data-pavp-exclusive-selection]:not(
        .n-button-group--vertical,
        [data-pavp-segmented-selection]
      )
      > .n-button[aria-pressed='true']:not(:disabled)
  ) {
    background-color: var(--ui-color-action-primary);
    box-shadow: var(--ui-admin-shadow-control-hover);
  }

  /* Inert appearance snapshots retain attributes but have no animated mask. */
  [data-pavp-segmented-selection='moving']:not(:where([inert], [inert] *))
    [data-pavp-segmented-label-ink] {
    background-color: var(--ui-color-text-primary);
    background-image: linear-gradient(
      var(--ui-color-text-on-action),
      var(--ui-color-text-on-action)
    );
    background-repeat: no-repeat;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  :is(
    .n-radio-group--button-group:not([data-ui-radio-card-group])
      > .n-radio-button--checked:not(.n-radio-button--disabled),
    .n-button-group[data-pavp-exclusive-selection]:not(.n-button-group--vertical)
      > .n-button[aria-pressed='true']:not(:disabled),
    .n-tabs--segment-type .n-tabs-rail .n-tabs-tab--active:not(.n-tabs-tab--disabled)
  ) {
    color: var(--ui-color-text-on-action);
  }

  .n-tabs-rail[data-pavp-segmented-selection] > .n-tabs-capsule {
    visibility: hidden;
  }

  .n-tabs--segment-type .n-tabs-rail > .n-tabs-capsule {
    z-index: calc(var(--ui-z-base) - 1);
  }
}

html[data-motion='reduced']
  :is(
    .n-radio-group--button-group:not([data-ui-radio-card-group]) > .n-radio-button,
    .n-button-group[data-pavp-exclusive-selection] > .n-button[aria-pressed],
    .n-tabs--segment-type .n-tabs-rail .n-tabs-tab
  )::before {
  transition-duration: calc(var(--ui-motion-duration) / 2);
}

html[data-motion='none']
  :is(
    .n-radio-group--button-group:not([data-ui-radio-card-group]) > .n-radio-button,
    .n-button-group[data-pavp-exclusive-selection] > .n-button[aria-pressed],
    .n-tabs--segment-type .n-tabs-rail .n-tabs-tab
  )::before {
  transition: none;
}

html[data-motion]
  [data-motion='none']
  :is(
    .n-radio-button[data-settings-control],
    .n-radio-button[data-settings-control] > :is(.n-radio__label, .n-radio-button__state-border),
    .n-button[aria-pressed][data-settings-control],
    .n-button[aria-pressed][data-settings-control]
      > :is(.n-button__border, .n-button__state-border, .n-base-wave)
  ),
html[data-motion] [data-motion='none'] [data-settings-control]::before {
  animation: none !important;
  transition: none !important;
}

.n-radio-group.n-radio-group--button-group:not([data-ui-radio-card-group])
  > .n-radio-button
  > .n-radio-button__state-border {
  inset: 0;
  border-radius: inherit;
  box-shadow: none;
}

.n-tabs--segment-type .n-tabs-rail .n-tabs-tab:focus-visible {
  outline: var(--ui-admin-focus-width) solid currentColor;
  outline-offset: calc(-1 * var(--ui-admin-focus-outline-offset));
}

@media (forced-colors: active) {
  .n-radio-group.n-radio-group--button-group:not([data-ui-radio-card-group])
    > .n-radio-button--checked,
  .n-button-group[data-pavp-exclusive-selection] > .n-button[aria-pressed='true'] {
    background-color: Highlight;
    color: HighlightText;
    forced-color-adjust: none;
  }

  .n-radio-group.n-radio-group--button-group:not([data-ui-radio-card-group])
    > .n-radio-button--checked:has(.n-radio-input:focus-visible),
  .n-button-group[data-pavp-exclusive-selection] > .n-button[aria-pressed='true']:focus-visible,
  .n-tabs--segment-type .n-tabs-rail .n-tabs-tab--active:focus-visible {
    outline-color: HighlightText;
  }

  @media (hover: hover) {
    :is(
        .n-radio-group--button-group:not([data-ui-radio-card-group])
          > .n-radio-button:not(.n-radio-button--checked, .n-radio-button--disabled),
        .n-button-group[data-pavp-exclusive-selection]
          > .n-button[aria-pressed='false']:not(:disabled),
        .n-tabs--segment-type
          .n-tabs-rail
          .n-tabs-tab:not(.n-tabs-tab--active, .n-tabs-tab--disabled)
      ):hover:not(:focus-visible, :has(:focus-visible)) {
      outline: var(--ui-border-width) solid ButtonText;
      outline-offset: calc(-1 * var(--ui-border-width));
    }
  }
}

/* Keep the native segment indicator and its resize/initialization guard. */
.n-tabs--segment-type .n-tabs-rail {
  box-sizing: border-box;
  padding: var(--ui-space-component-unit);
  border-width: var(--ui-admin-border-width);
  border-style: solid;
  border-color: var(--ui-color-border-default);
}

html[data-motion='full']
  .n-tabs--segment-type
  .n-tabs-rail:not(.transition-disabled)
  > .n-tabs-capsule {
  transition: background-color var(--ui-motion-duration) var(--ui-motion-easing);
}

html[data-motion='full'] .n-tabs--segment-type :is(.n-tabs-rail, .n-tabs-tab) {
  transition-duration: var(--ui-motion-duration);
  transition-timing-function: var(--ui-motion-easing);
}

html[data-motion='reduced'] .n-tabs--segment-type :is(.n-tabs-rail, .n-tabs-tab),
html[data-motion='reduced']
  .n-tabs--segment-type
  .n-tabs-rail:not(.transition-disabled)
  > .n-tabs-capsule {
  transition-property: color, background-color;
  transition-duration: calc(var(--ui-motion-duration) / 2);
  transition-timing-function: var(--ui-motion-easing);
}

html[data-motion='none'] .n-tabs--segment-type :is(.n-tabs-rail, .n-tabs-tab, .n-tabs-capsule) {
  transition: none;
}

html[data-motion='full'] .n-tabs--segment-type :is(.n-tabs-pane-wrapper, .n-tab-pane) {
  transition-duration: var(--ui-motion-duration);
  transition-timing-function: var(--ui-motion-easing);
}

html[data-motion='reduced'] .n-tabs--segment-type .n-tab-pane {
  transition-property: color, background-color, opacity;
  transition-duration: calc(var(--ui-motion-duration) / 2);
  transition-timing-function: var(--ui-motion-easing);
  transform: none;
}

html:not([data-motion='full']) .n-tabs--segment-type .n-tabs-pane-wrapper,
html[data-motion='none'] .n-tabs--segment-type .n-tab-pane {
  transition: none;
}

html[data-motion='none'] .n-tabs--segment-type .n-tab-pane {
  transform: none;
  opacity: 1;
}

html[data-motion='none']
  .n-tabs--segment-type
  .n-tab-pane:is(.next-transition-leave-active, .prev-transition-leave-active) {
  opacity: 0;
}

@media (forced-colors: active) {
  html[data-motion] .n-tabs--segment-type .n-tabs-capsule {
    background-color: Highlight;
    forced-color-adjust: none;
    transition: none !important;
  }

  html[data-motion] .n-tabs--segment-type .n-tabs-rail .n-tabs-tab--active {
    color: HighlightText;
    forced-color-adjust: none;
    transition: none !important;
  }
}
</style>
