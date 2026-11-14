import type { UiAppearanceSnapshot } from '@platform/design-system'
import type { GlobalThemeOverrides } from 'naive-ui'

/** Full state pairs for navigation sitting on a regional surface. */
export function regionalNavigationTheme(appearance: UiAppearanceSnapshot) {
  if (appearance.colorStyle === 'brand-sidebar' || appearance.colorStyle === 'brand-frame') {
    return solidNavigationTheme(appearance)
  }
  const { text, roles } = appearance.colorPalette
  const { primary, neutral } = roles
  return {
    color: 'transparent',
    groupTextColor: text.secondary,
    itemTextColor: text.primary,
    itemIconColor: text.primary,
    itemIconColorCollapsed: text.primary,
    arrowColor: text.secondary,
    itemColorHover: neutral.soft.background.pressed,
    itemTextColorHover: neutral.soft.foreground,
    itemIconColorHover: neutral.soft.foreground,
    arrowColorHover: neutral.soft.foreground,
    itemColorActive: primary.solid.background.default,
    itemColorActiveHover: primary.solid.background.hover,
    itemColorActiveCollapsed: primary.solid.background.default,
    itemTextColorActive: primary.solid.foreground,
    itemTextColorActiveHover: primary.solid.foreground,
    itemIconColorActive: primary.solid.foreground,
    itemIconColorActiveHover: primary.solid.foreground,
    arrowColorActive: primary.solid.foreground,
    arrowColorActiveHover: primary.solid.foreground,
    itemTextColorChildActive: primary.foreground.default,
    itemTextColorChildActiveHover: neutral.soft.foreground,
    itemIconColorChildActive: primary.foreground.default,
    itemIconColorChildActiveHover: neutral.soft.foreground,
    arrowColorChildActive: primary.foreground.default,
    arrowColorChildActiveHover: neutral.soft.foreground,
  } satisfies NonNullable<GlobalThemeOverrides['Menu']>
}

/** Navigation on a primary solid surface uses complete, contrast-validated state pairs. */
function solidNavigationTheme(appearance: UiAppearanceSnapshot) {
  const { primary } = appearance.colorPalette.roles
  const foreground = primary.solid.foreground
  const activeForeground = primary.soft.foreground
  return {
    color: 'transparent',
    groupTextColor: foreground,
    itemTextColor: foreground,
    itemIconColor: foreground,
    itemIconColorCollapsed: foreground,
    arrowColor: foreground,
    itemColorHover: primary.solid.background.hover,
    itemTextColorHover: foreground,
    itemIconColorHover: foreground,
    arrowColorHover: foreground,
    itemColorActive: primary.soft.background.default,
    itemColorActiveHover: primary.soft.background.hover,
    itemColorActiveCollapsed: primary.soft.background.default,
    itemTextColorActive: activeForeground,
    itemTextColorActiveHover: activeForeground,
    itemIconColorActive: activeForeground,
    itemIconColorActiveHover: activeForeground,
    arrowColorActive: activeForeground,
    arrowColorActiveHover: activeForeground,
    itemTextColorChildActive: foreground,
    itemTextColorChildActiveHover: foreground,
    itemIconColorChildActive: foreground,
    itemIconColorChildActiveHover: foreground,
    arrowColorChildActive: foreground,
    arrowColorChildActiveHover: foreground,
  } satisfies NonNullable<GlobalThemeOverrides['Menu']>
}

/** Header controls stay legible on the selected regional surface, not the page surface. */
export function regionalHeaderTheme(
  surface: Readonly<{ background: string; foreground: string }>,
  appearance: UiAppearanceSnapshot,
) {
  const foreground = surface.foreground
  const { primary } = appearance.colorPalette.roles
  const branded = surface.background === primary.solid.background.default
  const interactionForeground = branded ? primary.soft.foreground : foreground
  const hover = branded
    ? primary.soft.background.default
    : `color-mix(in srgb, ${foreground} 12%, transparent)`
  const pressed = branded
    ? primary.soft.background.hover
    : `color-mix(in srgb, ${foreground} 20%, transparent)`
  return {
    color: 'transparent',
    colorDisabled: 'transparent',
    colorHover: hover,
    colorFocus: hover,
    colorPressed: pressed,
    textColor: foreground,
    textColorTertiary: foreground,
    textColorHover: interactionForeground,
    textColorPressed: interactionForeground,
    textColorFocus: interactionForeground,
    textColorText: foreground,
    textColorTextHover: interactionForeground,
    textColorTextPressed: interactionForeground,
    textColorTextFocus: interactionForeground,
    textColorDisabled: foreground,
    rippleColor: foreground,
    waveOpacity: '0',
    ...(branded
      ? {
          colorPrimary: primary.soft.background.default,
          colorHoverPrimary: primary.soft.background.hover,
          colorPressedPrimary: primary.soft.background.pressed,
          colorFocusPrimary: primary.soft.background.hover,
          textColorPrimary: primary.soft.foreground,
          textColorHoverPrimary: primary.soft.foreground,
          textColorPressedPrimary: primary.soft.foreground,
          textColorFocusPrimary: primary.soft.foreground,
          // Naive quaternary keeps one foreground through all pointer states.
          colorQuaternaryHover: primary.solid.background.hover,
          colorQuaternaryPressed: primary.solid.background.pressed,
        }
      : {}),
  } satisfies NonNullable<GlobalThemeOverrides['Button']>
}

/** Private CSS bridge for pointer-down, which Naive Menu does not expose as a theme field. */
export function regionalNavigationPressedStyle(appearance: UiAppearanceSnapshot) {
  const { primary, neutral } = appearance.colorPalette.roles
  const branded =
    appearance.colorStyle === 'brand-sidebar' || appearance.colorStyle === 'brand-frame'
  return {
    '--pavp-navigation-pressed': branded
      ? primary.solid.background.pressed
      : neutral.soft.background.pressed,
    '--pavp-navigation-selected-pressed': branded
      ? primary.soft.background.pressed
      : primary.solid.background.pressed,
  }
}
