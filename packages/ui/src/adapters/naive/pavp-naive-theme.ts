import { tokens, type EffectiveAppearanceState } from '@platform/design-system'
import type { GlobalTheme, GlobalThemeOverrides } from 'naive-ui'
import commonDark from 'naive-ui/es/_styles/common/dark'
import breadcrumbDark from 'naive-ui/es/breadcrumb/styles/dark'
import buttonDark from 'naive-ui/es/button/styles/dark'
import descriptionsDark from 'naive-ui/es/descriptions/styles/dark'
import layoutDark from 'naive-ui/es/layout/styles/dark'
import menuDark from 'naive-ui/es/menu/styles/dark'
import radioDark from 'naive-ui/es/radio/styles/dark'
import tagDark from 'naive-ui/es/tag/styles/dark'

export interface PavpNaiveThemeProjection {
  readonly theme: GlobalTheme | null
  readonly themeOverrides: GlobalThemeOverrides
}

const colorAction = tokens['color.action.primary']
const colorControl = tokens['color.control.primary']
const colorBorder = tokens['color.border.default']
const colorFocus = tokens['color.focus.ring']
const colorOnAction = tokens['color.text.on-action']
const colorPage = tokens['color.surface.page']
const colorPanel = tokens['color.surface.panel']
const colorText = tokens['color.text.primary']
const colorTextSecondary = tokens['color.text.secondary']
const adminAmbientCanvas = 'var(--ui-admin-ambient-canvas)'
const borderAction = 'var(--ui-admin-border-action)'
const borderControl = 'var(--ui-admin-border-control)'
const borderFocus = 'var(--ui-admin-border-focus)'
const controlHeight = tokens['interaction.control.height']
const disabledOpacity = 'var(--ui-admin-state-disabled-opacity)'
const enhancedTargetHeight = tokens['layout.target.enhanced.minimum-block-size']
const fontBody = tokens['typography.family.body']
const fontSize = tokens['typography.size.body']
const fontWeight = tokens['typography.weight.body']
const fontWeightStrong = tokens['typography.weight.title']
const lineHeight = tokens['typography.line-height.body']
const materialChrome = 'var(--ui-material-chrome-background)'
const materialOverlay = 'var(--ui-material-overlay-background)'
const motionDuration = tokens['interaction.motion.duration']
const motionEasing = tokens['interaction.motion.easing']
const navigationHover = 'var(--ui-admin-navigation-hover)'
const radius = tokens['interaction.radius.panel']
const shadow = tokens['interaction.shadow.panel']
const shadowControl = 'var(--ui-admin-shadow-control)'
const shadowControlHover = 'var(--ui-admin-shadow-control-hover)'
const shadowFocusRing = 'var(--ui-admin-shadow-focus-ring)'
const shadowOverlay = 'var(--ui-admin-shadow-overlay)'
const spacingContentGap = tokens['spacing.content.gap']
const darkTheme = {
  name: 'dark',
  common: commonDark,
  Breadcrumb: breadcrumbDark,
  Button: buttonDark,
  Descriptions: descriptionsDark,
  Layout: layoutDark,
  Menu: menuDark,
  Radio: radioDark,
  Tag: tagDark,
} as const satisfies GlobalTheme

function resolveMaterialSurface(material: EffectiveAppearanceState['material']): {
  readonly chrome: string
  readonly shadow: string
} {
  switch (material) {
    case 'adaptive':
      return { chrome: materialChrome, shadow }
    case 'reduced':
      return { chrome: materialChrome, shadow: 'none' }
    case 'solid':
      return { chrome: materialChrome, shadow: 'none' }
  }
}

function resolveMotionDuration(motion: EffectiveAppearanceState['motion']): string {
  switch (motion) {
    case 'full':
      return motionDuration
    case 'reduced':
      return `calc(${motionDuration} / 2)`
    case 'none':
      return `calc(${motionDuration} * 0)`
  }
}

export function createPavpNaiveThemeProjection(
  appearance: Readonly<EffectiveAppearanceState>,
): Readonly<PavpNaiveThemeProjection> {
  const material = resolveMaterialSurface(appearance.material)
  const projectedMotionDuration = resolveMotionDuration(appearance.motion)
  const themeOverrides = Object.freeze({
    common: {
      primaryColorHover: colorControl,
      primaryColorPressed: colorControl,
      primaryColorSuppl: colorControl,
      textColorBase: colorText,
      textColor1: colorText,
      textColor2: colorTextSecondary,
      textColor3: colorTextSecondary,
      iconColor: colorTextSecondary,
      iconColorHover: colorControl,
      iconColorPressed: colorControl,
      borderColor: colorBorder,
      bodyColor: colorPage,
      tagColor: material.chrome,
      actionColor: material.chrome,
      hoverColor: material.chrome,
      pressedColor: material.chrome,
      boxShadow1: material.shadow,
      boxShadow2: material.shadow,
      boxShadow3: material.shadow,
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
      opacityDisabled: disabledOpacity,
      heightSmall: controlHeight,
      heightMedium: controlHeight,
      heightLarge: enhancedTargetHeight,
    },
    Breadcrumb: {
      fontSize,
      itemLineHeight: lineHeight,
      itemTextColor: colorTextSecondary,
      itemTextColorHover: colorControl,
      itemTextColorPressed: colorControl,
      itemTextColorActive: colorText,
      itemBorderRadius: radius,
      itemColorHover: material.chrome,
      itemColorPressed: material.chrome,
      separatorColor: colorBorder,
      fontWeightActive: fontWeightStrong,
    },
    Button: {
      heightMedium: enhancedTargetHeight,
      borderRadiusMedium: radius,
      fontSizeMedium: fontSize,
      border: borderControl,
      borderHover: borderAction,
      borderPressed: borderAction,
      borderFocus,
      borderDisabled: borderControl,
      colorSecondary: material.chrome,
      colorSecondaryHover: material.chrome,
      colorSecondaryPressed: material.chrome,
      colorPrimary: colorAction,
      colorHoverPrimary: colorAction,
      colorPressedPrimary: colorAction,
      colorFocusPrimary: colorAction,
      colorDisabledPrimary: colorAction,
      borderPrimary: borderAction,
      borderHoverPrimary: borderAction,
      borderPressedPrimary: borderAction,
      borderFocusPrimary: borderFocus,
      borderDisabledPrimary: borderAction,
      textColorPrimary: colorOnAction,
      textColorHoverPrimary: colorOnAction,
      textColorPressedPrimary: colorOnAction,
      textColorFocusPrimary: colorOnAction,
      textColorDisabledPrimary: colorOnAction,
      textColor: colorText,
      textColorGhost: colorText,
      textColorGhostHover: colorControl,
      textColorGhostPressed: colorControl,
      textColorGhostDisabled: colorTextSecondary,
      rippleColor: colorFocus,
      rippleColorPrimary: colorFocus,
      rippleDuration: projectedMotionDuration,
    },
    Descriptions: {
      lineHeight,
      fontSizeMedium: fontSize,
      thColor: colorPanel,
      thTextColor: colorTextSecondary,
      thFontWeight: fontWeightStrong,
      thPaddingBorderedMedium: spacingContentGap,
      tdTextColor: colorText,
      tdColor: colorPanel,
      tdPaddingBorderedMedium: spacingContentGap,
      borderColor: colorBorder,
      borderRadius: radius,
    },
    Layout: {
      common: {
        bodyColor: commonDark.bodyColor,
      },
      color: adminAmbientCanvas,
      textColor: colorText,
      siderColor: material.chrome,
      siderBorderColor: colorBorder,
    },
    Menu: {
      color: material.chrome,
      groupTextColor: colorTextSecondary,
      itemTextColor: colorText,
      itemTextColorHover: colorControl,
      itemTextColorActive: colorControl,
      itemTextColorActiveHover: colorControl,
      itemTextColorChildActive: colorControl,
      itemTextColorChildActiveHover: colorControl,
      itemIconColor: colorTextSecondary,
      itemIconColorHover: colorControl,
      itemIconColorActive: colorControl,
      itemIconColorActiveHover: colorControl,
      itemIconColorChildActive: colorControl,
      itemIconColorChildActiveHover: colorControl,
      itemIconColorCollapsed: colorTextSecondary,
      arrowColor: colorTextSecondary,
      arrowColorHover: colorControl,
      arrowColorActive: colorControl,
      arrowColorActiveHover: colorControl,
      arrowColorChildActive: colorControl,
      arrowColorChildActiveHover: colorControl,
      itemColorHover: navigationHover,
      itemColorActive: materialOverlay,
      itemColorActiveHover: materialOverlay,
      itemColorActiveCollapsed: materialOverlay,
      itemHeight: enhancedTargetHeight,
      borderRadius: radius,
      fontSize,
      dividerColor: colorBorder,
      peers: {
        Dropdown: {
          color: materialOverlay,
          optionTextColor: colorText,
          prefixColor: colorTextSecondary,
          suffixColor: colorTextSecondary,
          optionTextColorHover: colorControl,
          optionTextColorActive: colorControl,
          optionTextColorChildActive: colorControl,
          optionColorHover: navigationHover,
          optionColorActive: materialOverlay,
          optionHeightLarge: enhancedTargetHeight,
          fontSizeLarge: fontSize,
          optionIconSizeLarge: fontSize,
          optionPrefixWidthLarge: fontSize,
          optionSuffixWidthLarge: fontSize,
          optionIconPrefixWidthLarge: `calc(${fontSize} + ${spacingContentGap} + ${spacingContentGap})`,
          optionIconSuffixWidthLarge: `calc(${fontSize} + ${spacingContentGap} + ${spacingContentGap})`,
          borderRadius: radius,
          padding: `calc(${spacingContentGap} / 2) 0`,
          dividerColor: colorBorder,
          optionOpacityDisabled: disabledOpacity,
          peers: {
            Popover: {
              color: materialOverlay,
              boxShadow: shadowOverlay,
            },
          },
        },
      },
    },
    Radio: {
      buttonHeightMedium: enhancedTargetHeight,
      fontSizeMedium: fontSize,
      buttonBorderColor: colorBorder,
      buttonBorderColorActive: colorControl,
      buttonBoxShadow: shadowControl,
      buttonBoxShadowHover: shadowControlHover,
      buttonBoxShadowFocus: shadowFocusRing,
      buttonColor: material.chrome,
      buttonColorActive: colorAction,
      buttonTextColor: colorText,
      buttonTextColorActive: colorOnAction,
      buttonTextColorHover: colorControl,
      buttonBorderRadius: radius,
    },
    Tag: {
      heightMedium: controlHeight,
      borderRadius: radius,
      fontSizeMedium: fontSize,
      border: borderControl,
      textColor: colorText,
      colorBordered: material.chrome,
    },
  } as const satisfies GlobalThemeOverrides)

  return Object.freeze({
    theme: appearance.colorMode === 'dark' ? darkTheme : null,
    themeOverrides,
  })
}
