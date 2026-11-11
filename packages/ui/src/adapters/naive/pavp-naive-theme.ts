import {
  tokens,
  type EffectiveAppearanceState,
  type UiAppearanceSnapshot,
} from '@platform/design-system'
import type { GlobalTheme, GlobalThemeOverrides } from 'naive-ui'
import commonDark from 'naive-ui/es/_styles/common/dark'
import breadcrumbDark from 'naive-ui/es/breadcrumb/styles/dark'
import buttonDark from 'naive-ui/es/button/styles/dark'
import descriptionsDark from 'naive-ui/es/descriptions/styles/dark'
import dropdownDark from 'naive-ui/es/dropdown/styles/dark'
import layoutDark from 'naive-ui/es/layout/styles/dark'
import menuDark from 'naive-ui/es/menu/styles/dark'
import radioDark from 'naive-ui/es/radio/styles/dark'
import tagDark from 'naive-ui/es/tag/styles/dark'
import tooltipDark from 'naive-ui/es/tooltip/styles/dark'

import { projectSemanticNaiveTheme } from './semantic-naive-theme'

interface PavpNaiveThemeProjection {
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
const controlHeightSmall = tokens['interaction.control.height-small']
const controlHeightLarge = tokens['interaction.control.height-large']
const disabledOpacity = 'var(--ui-admin-state-disabled-opacity)'
const enhancedTargetHeight = tokens['layout.target.enhanced.minimum-block-size']
const headerActionIconSize = `calc(${enhancedTargetHeight} / 2)`
const fontBody = tokens['typography.family.body']
const fontSize = tokens['typography.size.body']
const fontWeight = tokens['typography.weight.body']
const fontWeightStrong = tokens['typography.weight.title']
const lineHeight = tokens['typography.line-height.body']
const materialChrome = 'var(--ui-material-chrome-background)'
const materialOverlay = 'var(--ui-material-overlay-background)'
const motionDuration = tokens['interaction.motion.duration']
const motionEasing = tokens['interaction.motion.easing']
const navigationHoverSurface =
  'color-mix(in srgb, var(--ui-admin-navigation-selected) 6%, var(--ui-material-chrome-background))'
const navigationSelectedSurface =
  'color-mix(in srgb, var(--ui-admin-navigation-selected) 16%, var(--ui-material-overlay-background))'
const navigationSelectedBackground = `var(--pavp-navigation-selected-surface, ${navigationSelectedSurface})`
const navigationSelectedForeground = `var(--pavp-navigation-selected-foreground, ${colorControl})`
const navigationChildActiveForeground = `var(--pavp-navigation-child-active-foreground, ${colorControl})`
const panelRadius = tokens['interaction.radius.panel']
const controlRadius = tokens['interaction.radius.control']
const smallRadius = 'var(--ui-radius-small)'
const shadow = tokens['interaction.shadow.panel']
const shadowControl = 'var(--ui-admin-shadow-control)'
const shadowControlHover = 'var(--ui-admin-shadow-control-hover)'
const shadowFocusRing = 'var(--ui-admin-shadow-focus-ring)'
const shadowOverlay = 'var(--ui-admin-shadow-overlay)'
const spacingContentGap = tokens['spacing.content.gap']
const compactOverlaySpacing = `calc(${spacingContentGap} / 2)`
const cardPadding = tokens['spacing.panel.padding']
const darkTheme = {
  name: 'dark',
  common: commonDark,
  Breadcrumb: breadcrumbDark,
  Button: buttonDark,
  Descriptions: descriptionsDark,
  Dropdown: dropdownDark,
  Layout: layoutDark,
  Menu: menuDark,
  Radio: radioDark,
  Tag: tagDark,
  Tooltip: tooltipDark,
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

export function createPavpNaiveThemeProjection(appearance: Readonly<UiAppearanceSnapshot>) {
  const material = resolveMaterialSurface(appearance.material)
  const projectedMotionDuration = resolveMotionDuration(appearance.motion)
  const dropdown = {
    color: materialOverlay,
    optionTextColor: colorText,
    prefixColor: colorTextSecondary,
    suffixColor: colorTextSecondary,
    optionTextColorHover: colorControl,
    optionTextColorActive: navigationSelectedForeground,
    optionTextColorChildActive: colorControl,
    optionColorHover: navigationHoverSurface,
    optionColorActive: navigationSelectedBackground,
    optionHeightLarge: enhancedTargetHeight,
    fontSizeLarge: fontSize,
    optionIconSizeLarge: fontSize,
    optionPrefixWidthLarge: fontSize,
    optionSuffixWidthLarge: fontSize,
    optionIconPrefixWidthLarge: `calc(${fontSize} + ${spacingContentGap} + ${spacingContentGap})`,
    optionIconSuffixWidthLarge: `calc(${fontSize} + ${spacingContentGap} + ${spacingContentGap})`,
    borderRadius: controlRadius,
    padding: `calc(${spacingContentGap} / 2) 0`,
    dividerColor: colorBorder,
    optionOpacityDisabled: disabledOpacity,
    peers: {
      Popover: {
        color: materialOverlay,
        boxShadow: shadowOverlay,
        borderRadius: panelRadius,
      },
    },
  } satisfies NonNullable<GlobalThemeOverrides['Dropdown']>
  const themeOverrides = Object.freeze({
    Avatar: { color: colorAction, colorModal: colorAction, colorPopover: colorAction },
    Dropdown: dropdown,
    Scrollbar: {
      width: compactOverlaySpacing,
      height: compactOverlaySpacing,
      color: `var(--pavp-scrollbar-color, ${colorBorder})`,
      colorHover: `var(--pavp-scrollbar-hover, ${colorTextSecondary})`,
      railColor: 'transparent',
      borderRadius: smallRadius,
    },
    Form: {
      blankHeightSmall: controlHeightSmall,
      blankHeightMedium: controlHeight,
      blankHeightLarge: controlHeightLarge,
      // Role-only Custom themes guarantee body text on surfaces, not status fills as text.
      feedbackTextColorError: colorText,
      feedbackTextColorWarning: colorText,
      asteriskColor: colorText,
    },
    Switch: {
      // The Custom body/surface pair guarantees the track boundary and inverse content contrast.
      railColor: colorText,
      railColorActive: colorText,
      buttonColor: colorPanel,
      buttonBoxShadow: shadowControl,
      boxShadowFocus: shadowFocusRing,
      textColor: colorPanel,
      iconColor: colorText,
      loadingColor: colorText,
      opacityDisabled: disabledOpacity,
      railHeightMedium: `calc(${controlHeight} / 2)`,
      railWidthMedium: controlHeight,
      buttonHeightMedium: `calc(${controlHeight} / 2)`,
      buttonWidthMedium: `calc(${controlHeight} / 2)`,
      buttonWidthPressedMedium: `calc(${controlHeight} / 2)`,
      railBorderRadiusMedium: `calc(${controlHeight} / 4)`,
      buttonBorderRadiusMedium: `calc(${controlHeight} / 4)`,
    },
    common: {
      fontSizeTiny: fontSize,
      fontSizeMini: fontSize,
      textColorDisabled: colorTextSecondary,
      placeholderColor: colorTextSecondary,
      placeholderColorDisabled: colorTextSecondary,
      infoColor: appearance.statusColors.info.default,
      infoColorHover: appearance.statusColors.info.hover,
      infoColorPressed: appearance.statusColors.info.pressed,
      infoColorSuppl: appearance.statusColors.info.supplementary,
      successColor: appearance.statusColors.success.default,
      successColorHover: appearance.statusColors.success.hover,
      successColorPressed: appearance.statusColors.success.pressed,
      successColorSuppl: appearance.statusColors.success.supplementary,
      warningColor: appearance.statusColors.warning.default,
      warningColorHover: appearance.statusColors.warning.hover,
      warningColorPressed: appearance.statusColors.warning.pressed,
      warningColorSuppl: appearance.statusColors.warning.supplementary,
      errorColor: appearance.statusColors.error.default,
      errorColorHover: appearance.statusColors.error.hover,
      errorColorPressed: appearance.statusColors.error.pressed,
      errorColorSuppl: appearance.statusColors.error.supplementary,
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
      borderRadius: controlRadius,
      borderRadiusSmall: smallRadius,
      fontSize,
      fontSizeSmall: fontSize,
      fontSizeMedium: fontSize,
      fontSizeLarge: tokens['typography.size.title'],
      lineHeight,
      opacityDisabled: disabledOpacity,
      heightSmall: controlHeightSmall,
      heightMedium: controlHeight,
      heightLarge: controlHeightLarge,
    },
    Breadcrumb: {
      fontSize,
      itemLineHeight: lineHeight,
      itemTextColor: colorTextSecondary,
      itemTextColorHover: colorControl,
      itemTextColorPressed: colorControl,
      itemTextColorActive: colorText,
      itemBorderRadius: smallRadius,
      itemColorHover: material.chrome,
      itemColorPressed: material.chrome,
      separatorColor: colorBorder,
      fontWeightActive: fontWeightStrong,
    },
    Button: {
      textColorText: colorText,
      textColorTextHover: colorControl,
      textColorTextPressed: colorControl,
      textColorTextDisabled: colorTextSecondary,
      textColorDisabledInfo: appearance.statusColors.info.onStatus,
      borderDisabledInfo: `var(--ui-admin-border-width) solid ${appearance.statusColors.info.default}`,
      textColorDisabledSuccess: appearance.statusColors.success.onStatus,
      borderDisabledSuccess: `var(--ui-admin-border-width) solid ${appearance.statusColors.success.default}`,
      textColorDisabledWarning: appearance.statusColors.warning.onStatus,
      borderDisabledWarning: `var(--ui-admin-border-width) solid ${appearance.statusColors.warning.default}`,
      textColorDisabledError: appearance.statusColors.error.onStatus,
      borderDisabledError: `var(--ui-admin-border-width) solid ${appearance.statusColors.error.default}`,
      textColorInfo: appearance.statusColors.info.onStatus,
      textColorHoverInfo: appearance.statusColors.info.onStatus,
      textColorPressedInfo: appearance.statusColors.info.onStatus,
      textColorFocusInfo: appearance.statusColors.info.onStatus,
      borderInfo: `var(--ui-admin-border-width) solid ${appearance.statusColors.info.default}`,
      borderHoverInfo: `var(--ui-admin-border-width) solid ${appearance.statusColors.info.default}`,
      borderPressedInfo: `var(--ui-admin-border-width) solid ${appearance.statusColors.info.default}`,
      borderFocusInfo: `var(--ui-admin-border-width) solid ${appearance.statusColors.info.default}`,
      textColorSuccess: appearance.statusColors.success.onStatus,
      textColorHoverSuccess: appearance.statusColors.success.onStatus,
      textColorPressedSuccess: appearance.statusColors.success.onStatus,
      textColorFocusSuccess: appearance.statusColors.success.onStatus,
      borderSuccess: `var(--ui-admin-border-width) solid ${appearance.statusColors.success.default}`,
      borderHoverSuccess: `var(--ui-admin-border-width) solid ${appearance.statusColors.success.default}`,
      borderPressedSuccess: `var(--ui-admin-border-width) solid ${appearance.statusColors.success.default}`,
      borderFocusSuccess: `var(--ui-admin-border-width) solid ${appearance.statusColors.success.default}`,
      textColorWarning: appearance.statusColors.warning.onStatus,
      textColorHoverWarning: appearance.statusColors.warning.onStatus,
      textColorPressedWarning: appearance.statusColors.warning.onStatus,
      textColorFocusWarning: appearance.statusColors.warning.onStatus,
      borderWarning: `var(--ui-admin-border-width) solid ${appearance.statusColors.warning.default}`,
      borderHoverWarning: `var(--ui-admin-border-width) solid ${appearance.statusColors.warning.default}`,
      borderPressedWarning: `var(--ui-admin-border-width) solid ${appearance.statusColors.warning.default}`,
      borderFocusWarning: `var(--ui-admin-border-width) solid ${appearance.statusColors.warning.default}`,
      textColorError: appearance.statusColors.error.onStatus,
      textColorHoverError: appearance.statusColors.error.onStatus,
      textColorPressedError: appearance.statusColors.error.onStatus,
      textColorFocusError: appearance.statusColors.error.onStatus,
      borderError: `var(--ui-admin-border-width) solid ${appearance.statusColors.error.default}`,
      borderHoverError: `var(--ui-admin-border-width) solid ${appearance.statusColors.error.default}`,
      borderPressedError: `var(--ui-admin-border-width) solid ${appearance.statusColors.error.default}`,
      borderFocusError: `var(--ui-admin-border-width) solid ${appearance.statusColors.error.default}`,
      heightMedium: controlHeight,
      paddingSmall: `0 ${tokens['spacing.button.inline']}`,
      paddingLarge: `0 ${tokens['spacing.button.inline']}`,
      paddingMedium: `0 ${tokens['spacing.button.inline']}`,
      borderRadiusMedium: controlRadius,
      fontSizeMedium: fontSize,
      fontSizeLarge: fontSize,
      iconSizeMedium: headerActionIconSize,
      border: borderControl,
      borderHover: borderAction,
      borderPressed: borderAction,
      borderFocus,
      borderDisabled: borderControl,
      color: material.chrome,
      colorHover: navigationHoverSurface,
      colorPressed: navigationSelectedSurface,
      colorFocus: navigationHoverSurface,
      colorDisabled: material.chrome,
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
      textColorHover: colorControl,
      textColorPressed: colorControl,
      textColorFocus: colorControl,
      textColorDisabled: colorTextSecondary,
      textColorTertiary: colorTextSecondary,
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
      borderRadius: panelRadius,
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
      itemTextColorActive: navigationSelectedForeground,
      itemTextColorActiveHover: navigationSelectedForeground,
      itemTextColorChildActive: navigationChildActiveForeground,
      itemTextColorChildActiveHover: navigationChildActiveForeground,
      itemIconColor: colorTextSecondary,
      itemIconColorHover: colorControl,
      itemIconColorActive: navigationSelectedForeground,
      itemIconColorActiveHover: navigationSelectedForeground,
      itemIconColorChildActive: navigationChildActiveForeground,
      itemIconColorChildActiveHover: navigationChildActiveForeground,
      itemIconColorCollapsed: colorTextSecondary,
      arrowColor: colorTextSecondary,
      arrowColorHover: colorControl,
      arrowColorActive: navigationSelectedForeground,
      arrowColorActiveHover: navigationSelectedForeground,
      arrowColorChildActive: navigationChildActiveForeground,
      arrowColorChildActiveHover: navigationChildActiveForeground,
      itemColorHover: navigationHoverSurface,
      itemColorActive: navigationSelectedBackground,
      itemColorActiveHover: navigationSelectedBackground,
      itemColorActiveCollapsed: navigationSelectedBackground,
      itemHeight: enhancedTargetHeight,
      borderRadius: controlRadius,
      fontSize,
      dividerColor: colorBorder,
      peers: {
        Dropdown: dropdown,
      },
    },
    Radio: {
      buttonHeightSmall: controlHeightSmall,
      buttonHeightMedium: controlHeight,
      buttonHeightLarge: controlHeightLarge,
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
      buttonBorderRadius: controlRadius,
    },
    Card: {
      color: colorPanel,
      textColor: colorText,
      titleTextColor: colorText,
      borderRadius: panelRadius,
      paddingSmall: spacingContentGap,
      paddingMedium: cardPadding,
      paddingLarge: cardPadding,
      paddingHuge: cardPadding,
      fontSizeSmall: fontSize,
      fontSizeMedium: fontSize,
      fontSizeLarge: fontSize,
      fontSizeHuge: fontSize,
      titleFontSizeSmall: fontSize,
      titleFontSizeMedium: fontSize,
      titleFontSizeLarge: fontSize,
      titleFontSizeHuge: fontSize,
      titleFontWeight: fontWeightStrong,
    },
    Tag: {
      color: material.chrome,
      closeIconColor: colorTextSecondary,
      closeIconColorHover: colorText,
      closeIconColorPressed: colorText,
      closeColorHover: colorPage,
      closeColorPressed: colorPage,
      closeBorderRadius: smallRadius,
      heightMedium: controlHeight,
      borderRadius: controlRadius,
      fontSizeMedium: fontSize,

      border: borderControl,
      textColor: colorText,
      colorBordered: material.chrome,
    },
    Tooltip: {
      borderRadius: panelRadius,
      boxShadow: shadowOverlay,
      color: materialOverlay,
      textColor: colorText,
      padding: compactOverlaySpacing,
      peers: {
        Popover: {
          fontSize,
          borderRadius: panelRadius,
          color: materialOverlay,
          dividerColor: colorBorder,
          textColor: colorText,
          boxShadow: shadowOverlay,
          padding: compactOverlaySpacing,
          space: compactOverlaySpacing,
        },
      },
    },
  } as const satisfies GlobalThemeOverrides)

  return Object.freeze({
    theme: appearance.colorMode === 'dark' ? darkTheme : null,
    themeOverrides: projectSemanticNaiveTheme(
      appearance.colorPalette,
      themeOverrides,
      appearance.contrast,
      appearance.colorMode,
    ),
  } satisfies PavpNaiveThemeProjection)
}
