<script setup lang="ts">
import { tokens, type UiAppearanceSnapshot } from '@platform/design-system'
import type { UiLocale } from '../components/contracts'
import type { GlobalThemeOverrides } from 'naive-ui'
import zhCN from 'naive-ui/es/locales/common/zhCN'
import enUS from 'naive-ui/es/locales/common/enUS'
import dateZhCN from 'naive-ui/es/locales/date/zhCN'
import dateEnUS from 'naive-ui/es/locales/date/enUS'
import { NConfigProvider } from 'naive-ui/es/config-provider'
import { computed, onBeforeUnmount, onMounted, provide, ref, toRef } from 'vue'

import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'
import { createPavpNaiveThemeProjection } from '../adapters/naive/pavp-naive-theme'
import { loadScrollEnhancement } from '../adapters/scroll/scroll-enhancement-loader'

defineOptions({ name: 'UiProvider' })

const props = defineProps<{
  readonly appearance: Readonly<UiAppearanceSnapshot>
  readonly locale: UiLocale
}>()

defineSlots<{
  default: (props: Readonly<Record<string, never>>) => unknown
}>()

const controlMetric = ref<HTMLElement | null>(null)
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
const appearance = toRef(() => props.appearance)

provide(pavpNaiveAppearanceKey, appearance)
provide(
  'pavp.scroll',
  (host: HTMLElement, viewport: HTMLElement, content: HTMLElement, xScrollable: boolean) => {
    const hadNestedGuard = host.hasAttribute('data-lenis-prevent')
    host.toggleAttribute('data-lenis-prevent', true)
    let disposed = false
    let detach: (() => void) | undefined
    void loadScrollEnhancement().then((runtime) => {
      if (!disposed)
        detach = runtime?.attachNaiveScrollbar(host, viewport, content, xScrollable, appearance)
    })
    return () => {
      disposed = true
      detach?.()
      host.toggleAttribute('data-lenis-prevent', hadNestedGuard)
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
    if (
      root.getAttribute('data-motion') !== 'full' ||
      !root.hasAttribute('data-ui-size-transition')
    ) {
      finishSizeTransition()
      updateMetrics()
      return
    }
    if (!changed && !records.some((record) => record.attributeName === 'data-ui-size-transition'))
      return

    // The appearance transaction armed transitions before changing size.
    // This observer owns cleanup only, without deferring the committed preference.
    const revision = ++sizeRevision
    clearTimeout(sizeTimer)
    if (sizeFrame !== undefined) cancelAnimationFrame(sizeFrame)
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
  <div id="pavp-overlay-root" />
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
@layer vendor-overrides {
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
      .n-descriptions__label,
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

  .pavp-switch :not(:is(.n-switch__rail, .n-switch__button)) {
    transition-duration: var(--ui-motion-duration);
  }
  .pavp-switch * {
    transition-timing-function: var(--ui-motion-easing);
  }
  html:not([data-motion='full']) .pavp-switch :not(:is(.n-switch__rail, .n-switch__button)) {
    transition: none;
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
    .n-descriptions__label,
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
    .n-descriptions__label,
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
    .n-descriptions__label,
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
html[data-motion='full'] .n-date-panel-calendar__title,
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
html[data-motion='reduced'] .n-date-panel-calendar__title,
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
html[data-motion='reduced'] .n-date-panel-calendar__title,
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

.pavp-switch :is(.n-switch__rail, .n-switch__button) {
  transition-duration: var(--ui-motion-duration);
}
html:not([data-motion='full']) .pavp-switch :is(.n-switch__rail, .n-switch__button) {
  transition: none;
}
@media (forced-colors: active) {
  .pavp-switch[role='switch'] .n-switch__rail {
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
    .n-radio-button,
    .n-radio-button__state-border,
    .n-switch__rail,
    .n-input__state-border,
    .n-base-selection__state-border
  ) {
  transition: none !important;
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
    .n-card__content,
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
</style>
