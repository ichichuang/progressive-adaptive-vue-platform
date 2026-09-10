import { tokens, type EffectiveAppearanceState } from '@platform/design-system'
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
const radius = tokens['interaction.radius.panel']
const shadow = tokens['interaction.shadow.panel']
const shadowControl = 'var(--ui-admin-shadow-control)'
const shadowControlHover = 'var(--ui-admin-shadow-control-hover)'
const shadowFocusRing = 'var(--ui-admin-shadow-focus-ring)'
const shadowOverlay = 'var(--ui-admin-shadow-overlay)'
const spacingContentGap = tokens['spacing.content.gap']
const compactOverlaySpacing = `calc(${spacingContentGap} / 2)`
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

/** Form-only overrides are consumed by the form adapters, without eager control imports. */
export function createPavpNaiveFormThemeProjection(appearance: Readonly<EffectiveAppearanceState>) {
  const shared = createPavpNaiveThemeProjection(appearance).themeOverrides
  const scrollbar = { color: colorBorder, colorHover: colorTextSecondary, borderRadius: radius }
  const Input = {
    heightMedium: enhancedTargetHeight,
    fontSizeMedium: fontSize,
    fontWeight,
    lineHeight,
    lineHeightTextarea: lineHeight,
    borderRadius: radius,
    textColor: colorText,
    textColorDisabled: colorTextSecondary,
    textDecorationColor: colorText,
    placeholderColor: colorTextSecondary,
    placeholderColorDisabled: colorTextSecondary,
    color: colorPanel,
    colorHover: colorPanel,
    colorFocus: colorPanel,
    colorDisabled: colorPanel,
    border: borderControl,
    borderHover: borderControl,
    borderDisabled: borderControl,
    borderFocus,
    boxShadowFocus: shadowFocusRing,
    caretColor: colorControl,
    loadingColor: colorControl,
    loadingColorError: colorText,
    borderError: borderControl,
    borderHoverError: borderControl,
    borderFocusError: borderFocus,
    colorFocusError: colorPanel,
    boxShadowFocusError: shadowFocusRing,
    caretColorError: colorControl,
    clearColor: colorTextSecondary,
    clearColorHover: colorText,
    clearColorPressed: colorText,
    iconColor: colorTextSecondary,
    iconColorDisabled: colorTextSecondary,
    iconColorHover: colorText,
    iconColorPressed: colorText,
    suffixTextColor: colorTextSecondary,
    groupLabelColor: colorPanel,
    groupLabelTextColor: colorText,
    countTextColor: colorTextSecondary,
    countTextColorDisabled: colorTextSecondary,
    peers: { Scrollbar: scrollbar },
  } satisfies NonNullable<GlobalThemeOverrides['Input']>
  return {
    Form: {
      labelTextColor: colorText,
      asteriskColor: colorText,
      feedbackTextColorError: colorText,
      feedbackTextColorWarning: colorText,
      feedbackTextColor: colorTextSecondary,
      labelFontSizeTopMedium: fontSize,
      feedbackFontSizeMedium: fontSize,
      lineHeight,
      labelFontWeight: fontWeightStrong,
      blankHeightMedium: enhancedTargetHeight,
      labelTextAlignVertical: 'start',
    },
    Input,
    InputNumber: {
      // Naive parses iconColorDisabled with rgba(). Keep that intermediate
      // concrete; its rendered text-button colors/opacity are overridden here.
      peers: {
        Input,
        Button: {
          ...shared.Button,
          textColorText: colorText,
          textColorTextHover: colorControl,
          textColorTextPressed: colorControl,
          textColorTextFocus: colorControl,
          textColorTextDisabled: colorTextSecondary,
          opacityDisabled: disabledOpacity,
        },
      },
    },
    Select: {
      menuBoxShadow: shadowOverlay,
      peers: {
        InternalSelection: {
          heightMedium: enhancedTargetHeight,
          fontSizeMedium: fontSize,
          borderRadius: radius,
          textColor: colorText,
          textColorDisabled: colorTextSecondary,
          placeholderColor: colorTextSecondary,
          placeholderColorDisabled: colorTextSecondary,
          color: colorPanel,
          colorDisabled: colorPanel,
          colorActive: colorPanel,
          border: borderControl,
          borderHover: borderControl,
          borderActive: borderFocus,
          borderFocus,
          boxShadowHover: 'none',
          boxShadowActive: shadowFocusRing,
          boxShadowFocus: shadowFocusRing,
          caretColor: colorControl,
          arrowColor: colorTextSecondary,
          arrowColorDisabled: colorTextSecondary,
          loadingColor: colorControl,
          clearColor: colorTextSecondary,
          clearColorHover: colorText,
          clearColorPressed: colorText,
          borderError: borderControl,
          borderHoverError: borderControl,
          borderActiveError: borderFocus,
          borderFocusError: borderFocus,
          boxShadowHoverError: 'none',
          boxShadowActiveError: shadowFocusRing,
          boxShadowFocusError: shadowFocusRing,
          colorActiveError: colorPanel,
          caretColorError: colorControl,
          peers: { Popover: { color: colorPanel, textColor: colorText, boxShadow: shadowOverlay } },
        },
        InternalSelectMenu: {
          optionFontSizeMedium: fontSize,
          optionHeightMedium: enhancedTargetHeight,
          borderRadius: radius,
          color: colorPanel,
          groupHeaderTextColor: colorTextSecondary,
          actionDividerColor: colorBorder,
          optionTextColor: colorText,
          optionTextColorPressed: colorText,
          optionTextColorDisabled: colorTextSecondary,
          optionTextColorActive: colorText,
          optionOpacityDisabled: disabledOpacity,
          optionCheckColor: colorControl,
          optionColorPending: colorPage,
          optionColorActive: colorPage,
          optionColorActivePending: colorPage,
          actionTextColor: colorText,
          loadingColor: colorControl,
          peers: { Scrollbar: scrollbar },
        },
      },
    },
    Switch: {
      textColor: colorText,
      iconColor: colorText,
      loadingColor: colorText,
      opacityDisabled: disabledOpacity,
      railColor: colorBorder,
      railColorActive: colorControl,
      buttonColor: colorPanel,
      buttonBoxShadow: shadowControl,
      boxShadowFocus: shadowFocusRing,
    },
    DatePicker: {
      itemFontSize: fontSize,
      calendarDaysFontSize: fontSize,
      calendarTitleFontSize: fontSize,
      itemTextColor: colorText,
      itemTextColorDisabled: colorTextSecondary,
      itemTextColorActive: colorOnAction,
      itemTextColorCurrent: colorControl,
      itemColorIncluded: colorPage,
      itemColorHover: colorPage,
      itemColorDisabled: colorPanel,
      itemColorActive: colorAction,
      itemBorderRadius: radius,
      panelColor: colorPanel,
      panelTextColor: colorText,
      arrowColor: colorTextSecondary,
      calendarTitleTextColor: colorText,
      calendarTitleColorHover: colorPage,
      calendarDaysTextColor: colorTextSecondary,
      panelHeaderDividerColor: colorBorder,
      calendarDaysDividerColor: colorBorder,
      calendarDividerColor: colorBorder,
      panelActionDividerColor: colorBorder,
      panelBoxShadow: shadowOverlay,
      panelBorderRadius: radius,
      calendarTitleFontWeight: fontWeightStrong,
      iconColor: colorTextSecondary,
      iconColorDisabled: colorTextSecondary,
      itemSize: enhancedTargetHeight,
      itemCellWidth: enhancedTargetHeight,
      itemCellHeight: enhancedTargetHeight,
      calendarTitleHeight: enhancedTargetHeight,
      scrollItemHeight: enhancedTargetHeight,
      peers: { Input, Button: { ...shared.Button }, Scrollbar: scrollbar },
    },
  } satisfies GlobalThemeOverrides
}

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
  const dropdown = {
    color: materialOverlay,
    optionTextColor: colorText,
    prefixColor: colorTextSecondary,
    suffixColor: colorTextSecondary,
    optionTextColorHover: colorControl,
    optionTextColorActive: colorControl,
    optionTextColorChildActive: colorControl,
    optionColorHover: navigationHoverSurface,
    optionColorActive: navigationSelectedSurface,
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
  } satisfies NonNullable<GlobalThemeOverrides['Dropdown']>
  const themeOverrides = Object.freeze({
    Dropdown: dropdown,
    Scrollbar: {
      width: compactOverlaySpacing,
      height: compactOverlaySpacing,
      color: `var(--pavp-scrollbar-color, ${colorBorder})`,
      colorHover: `var(--pavp-scrollbar-hover, ${colorTextSecondary})`,
      railColor: 'transparent',
      borderRadius: radius,
    },
    Switch: {
      railColor: colorBorder,
      railColorActive: colorControl,
      buttonColor: colorPanel,
      buttonBoxShadow: shadowControl,
      boxShadowFocus: shadowFocusRing,
      textColor: colorOnAction,
      iconColor: colorText,
      loadingColor: colorControl,
      opacityDisabled: disabledOpacity,
      railHeightMedium: `calc(${controlHeight} / 2)`,
      railWidthMedium: controlHeight,
      buttonHeightMedium: `calc(${controlHeight} / 2)`,
      buttonWidthMedium: `calc(${controlHeight} / 2)`,
      buttonWidthPressedMedium: `calc(${controlHeight} / 2)`,
      railBorderRadiusMedium: radius,
      buttonBorderRadiusMedium: radius,
    },
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
      itemColorHover: navigationHoverSurface,
      itemColorActive: navigationSelectedSurface,
      itemColorActiveHover: navigationSelectedSurface,
      itemColorActiveCollapsed: navigationSelectedSurface,
      itemHeight: enhancedTargetHeight,
      borderRadius: radius,
      fontSize,
      dividerColor: colorBorder,
      peers: {
        Dropdown: dropdown,
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
    Tooltip: {
      borderRadius: radius,
      boxShadow: shadowOverlay,
      color: materialOverlay,
      textColor: colorText,
      padding: compactOverlaySpacing,
      peers: {
        Popover: {
          fontSize,
          borderRadius: radius,
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
    themeOverrides,
  })
}
