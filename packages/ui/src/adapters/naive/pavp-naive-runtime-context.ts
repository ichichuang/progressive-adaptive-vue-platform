import type { UiAppearanceSnapshot } from '@platform/design-system'
import type { GlobalThemeOverrides } from 'naive-ui'
import type { InjectionKey, Ref } from 'vue'

export type PavpNaiveAppearanceReference = Readonly<Ref<Readonly<UiAppearanceSnapshot>>>

export const pavpNaiveAppearanceKey: InjectionKey<PavpNaiveAppearanceReference> =
  Symbol('pavp-naive-appearance')

export const pavpOverlayTargetKey: InjectionKey<string> = Symbol('pavp-overlay-target')
export const pavpMeasuredThemeKey: InjectionKey<Readonly<Ref<GlobalThemeOverrides>>> =
  Symbol('pavp-measured-theme')

export const pavpForcedColorsKey: InjectionKey<Readonly<Ref<boolean>>> =
  Symbol('pavp-forced-colors')

export const pavpRootAppearanceKey: InjectionKey<PavpNaiveAppearanceReference> =
  Symbol('pavp-root-appearance')
