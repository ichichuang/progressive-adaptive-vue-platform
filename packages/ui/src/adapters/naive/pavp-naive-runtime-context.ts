import type { EffectiveAppearanceState } from '@platform/design-system'
import type { InjectionKey, Ref } from 'vue'

export type PavpNaiveAppearanceReference = Readonly<Ref<Readonly<EffectiveAppearanceState>>>

export const pavpNaiveAppearanceKey: InjectionKey<PavpNaiveAppearanceReference> =
  Symbol('pavp-naive-appearance')
