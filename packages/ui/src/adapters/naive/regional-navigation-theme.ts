import type { UiAppearanceSnapshot } from '@platform/design-system'
import type { GlobalThemeOverrides } from 'naive-ui'

/** Full state pairs for navigation sitting on a regional surface. */
export function regionalNavigationTheme(appearance: UiAppearanceSnapshot) {
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

/** Header controls stay legible on the selected regional surface, not the page surface. */
export function regionalHeaderTheme(surface: Readonly<{ background: string; foreground: string }>) {
  const foreground = surface.foreground
  const hover = `color-mix(in srgb, ${foreground} 12%, transparent)`
  const pressed = `color-mix(in srgb, ${foreground} 20%, transparent)`
  return {
    color: 'transparent',
    colorDisabled: 'transparent',
    colorHover: hover,
    colorFocus: hover,
    colorPressed: pressed,
    textColor: foreground,
    textColorTertiary: foreground,
    textColorHover: foreground,
    textColorPressed: foreground,
    textColorFocus: foreground,
    textColorText: foreground,
    textColorTextHover: foreground,
    textColorTextPressed: foreground,
    textColorTextFocus: foreground,
    textColorDisabled: foreground,
    rippleColor: foreground,
  } satisfies NonNullable<GlobalThemeOverrides['Button']>
}
