<script setup lang="ts">
import type { UiAppearanceSnapshot } from '@platform/design-system'
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
const enhancedMetric = ref<HTMLElement | null>(null)
const metrics = ref<{ control: number; enhanced: number } | null>(null)
let metricObserver: ResizeObserver | undefined
const projection = computed(() => {
  const base = createPavpNaiveThemeProjection(props.appearance)
  if (metrics.value === null) return base
  const normal = `${String(metrics.value.control)}px`
  const large = `${String(Math.max(metrics.value.control, metrics.value.enhanced))}px`
  const menu = { optionHeightSmall: normal, optionHeightMedium: normal, optionHeightLarge: large }
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
  const control = controlMetric.value
  const enhanced = enhancedMetric.value
  if (!control || !enhanced) return
  const updateMetrics = (): void => {
    const controlHeight = control.getBoundingClientRect().height
    const enhancedHeight = enhanced.getBoundingClientRect().height
    if (controlHeight > 0 && enhancedHeight > 0)
      metrics.value = { control: controlHeight, enhanced: enhancedHeight }
  }
  updateMetrics()
  metricObserver = new ResizeObserver(updateMetrics)
  metricObserver.observe(control)
  metricObserver.observe(enhanced)
})
onBeforeUnmount(() => {
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
      ref="enhancedMetric"
      class="block invisible absolute min-h-target-enhanced"
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
</style>
