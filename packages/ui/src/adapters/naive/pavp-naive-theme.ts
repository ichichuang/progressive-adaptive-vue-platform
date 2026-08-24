import { tokens, type EffectiveAppearanceState } from '@platform/design-system'
import type { GlobalTheme, GlobalThemeOverrides } from 'naive-ui'
import commonDark from 'naive-ui/es/_styles/common/dark'
import breadcrumbDark from 'naive-ui/es/breadcrumb/styles/dark'
import buttonDark from 'naive-ui/es/button/styles/dark'
import descriptionsDark from 'naive-ui/es/descriptions/styles/dark'
import radioDark from 'naive-ui/es/radio/styles/dark'
import tagDark from 'naive-ui/es/tag/styles/dark'

export interface PavpNaiveThemeProjection {
  readonly theme: GlobalTheme | null
  readonly themeOverrides: GlobalThemeOverrides
}

const colorAction = tokens['color.action.primary']
const colorBorder = tokens['color.border.default']
const colorFocus = tokens['color.focus.ring']
const colorOnAction = tokens['color.text.on-action']
const colorPage = tokens['color.surface.page']
const colorPanel = tokens['color.surface.panel']
const colorText = tokens['color.text.primary']
const colorTextSecondary = tokens['color.text.secondary']
const controlHeight = tokens['interaction.control.height']
const fontBody = tokens['typography.family.body']
const fontSize = tokens['typography.size.body']
const fontWeight = tokens['typography.weight.body']
const fontWeightStrong = tokens['typography.weight.title']
const lineHeight = tokens['typography.line-height.body']
const motionEasing = tokens['interaction.motion.easing']
const radius = tokens['interaction.radius.panel']
const shadow = tokens['interaction.shadow.panel']
const darkTheme = {
  name: 'dark',
  common: commonDark,
  Breadcrumb: breadcrumbDark,
  Button: buttonDark,
  Descriptions: descriptionsDark,
  Radio: radioDark,
  Tag: tagDark,
} as const satisfies GlobalTheme

const themeOverrides = Object.freeze({
  common: {
    primaryColorHover: colorAction,
    primaryColorPressed: colorAction,
    primaryColorSuppl: colorAction,
    textColorBase: colorText,
    textColor1: colorText,
    textColor2: colorTextSecondary,
    textColor3: colorTextSecondary,
    iconColor: colorTextSecondary,
    iconColorHover: colorAction,
    iconColorPressed: colorAction,
    borderColor: colorBorder,
    bodyColor: colorPage,
    tagColor: colorPanel,
    actionColor: colorPanel,
    hoverColor: 'var(--ui-admin-navigation-hover)',
    pressedColor: 'var(--ui-admin-navigation-hover)',
    boxShadow1: shadow,
    boxShadow2: shadow,
    boxShadow3: 'var(--ui-admin-shadow-overlay)',
    fontFamily: fontBody,
    fontWeight,
    fontWeightStrong,
    cubicBezierEaseInOut: motionEasing,
    cubicBezierEaseOut: motionEasing,
    cubicBezierEaseIn: motionEasing,
    borderRadius: radius,
    borderRadiusSmall: radius,
    fontSize,
    fontSizeSmall: fontSize,
    fontSizeMedium: fontSize,
    fontSizeLarge: tokens['typography.size.title'],
    lineHeight,
    heightSmall: controlHeight,
    heightMedium: controlHeight,
    heightLarge: tokens['layout.target.enhanced.minimum-block-size'],
  },
  Breadcrumb: {
    fontSize,
    itemLineHeight: lineHeight,
    itemTextColor: colorTextSecondary,
    itemTextColorHover: colorAction,
    itemTextColorPressed: colorAction,
    itemTextColorActive: colorText,
    itemBorderRadius: radius,
    itemColorHover: 'var(--ui-admin-navigation-hover)',
    itemColorPressed: 'var(--ui-admin-navigation-hover)',
    separatorColor: colorBorder,
    fontWeightActive: fontWeightStrong,
  },
  Button: {
    heightMedium: tokens['layout.target.enhanced.minimum-block-size'],
    borderRadiusMedium: radius,
    fontSizeMedium: fontSize,
    colorPrimary: colorAction,
    colorHoverPrimary: colorAction,
    colorPressedPrimary: colorAction,
    colorFocusPrimary: colorAction,
    textColorPrimary: colorOnAction,
    textColorHoverPrimary: colorOnAction,
    textColorPressedPrimary: colorOnAction,
    textColorFocusPrimary: colorOnAction,
    textColor: colorText,
    textColorHover: colorAction,
    textColorPressed: colorAction,
    textColorFocus: colorAction,
    rippleColor: colorFocus,
    rippleColorPrimary: colorFocus,
  },
  Descriptions: {
    lineHeight,
    fontSizeMedium: fontSize,
    titleTextColor: colorText,
    thColor: colorPanel,
    thTextColor: colorTextSecondary,
    thFontWeight: fontWeightStrong,
    tdTextColor: colorText,
    tdColor: colorPanel,
    borderColor: colorBorder,
    borderRadius: radius,
  },
  Radio: {
    labelLineHeight: lineHeight,
    buttonHeightMedium: tokens['layout.target.enhanced.minimum-block-size'],
    fontSizeMedium: fontSize,
    color: colorPanel,
    colorActive: colorAction,
    textColor: colorText,
    dotColorActive: colorOnAction,
    buttonBorderColor: colorBorder,
    buttonBorderColorActive: colorAction,
    buttonBorderColorHover: colorAction,
    buttonColor: colorPanel,
    buttonColorActive: colorAction,
    buttonTextColor: colorText,
    buttonTextColorActive: colorOnAction,
    buttonTextColorHover: colorAction,
    buttonBoxShadowFocus: shadow,
    buttonBorderRadius: radius,
  },
  Tag: {
    heightMedium: controlHeight,
    borderRadius: radius,
    fontSizeMedium: fontSize,
    fontWeightStrong,
    border: colorBorder,
    textColor: colorText,
    color: colorPanel,
    colorBordered: colorPanel,
  },
} as const satisfies GlobalThemeOverrides)

export function createPavpNaiveThemeProjection(
  appearance: Readonly<EffectiveAppearanceState>,
): Readonly<PavpNaiveThemeProjection> {
  return Object.freeze({
    theme: appearance.colorMode === 'dark' ? darkTheme : null,
    themeOverrides,
  })
}
