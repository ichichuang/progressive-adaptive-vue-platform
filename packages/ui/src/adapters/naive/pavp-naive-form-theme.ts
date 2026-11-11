import { tokens, type UiAppearanceSnapshot } from '@platform/design-system'
import type { GlobalThemeOverrides } from 'naive-ui'
import { projectSemanticNaiveTheme } from './semantic-naive-theme'
import { createPavpNaiveThemeProjection } from './pavp-naive-theme'

const colorAction = tokens['color.action.primary']
const colorControl = tokens['color.control.primary']
const colorBorder = tokens['color.border.default']
const colorOnAction = tokens['color.text.on-action']
const colorPage = tokens['color.surface.page']
const colorPanel = tokens['color.surface.panel']
const colorText = tokens['color.text.primary']
const colorTextSecondary = tokens['color.text.secondary']
const borderControl = 'var(--ui-admin-border-control)'
const borderFocus = 'var(--ui-admin-border-focus)'
const disabledOpacity = 'var(--ui-admin-state-disabled-opacity)'
const controlHeight = tokens['interaction.control.height']
const fontSize = tokens['typography.size.body']
const fontWeight = tokens['typography.weight.body']
const fontWeightStrong = tokens['typography.weight.title']
const lineHeight = tokens['typography.line-height.body']
const panelRadius = tokens['interaction.radius.panel']
const controlRadius = tokens['interaction.radius.control']
const smallRadius = 'var(--ui-radius-small)'
const shadowFocusRing = 'var(--ui-admin-shadow-focus-ring)'
const shadowOverlay = 'var(--ui-admin-shadow-overlay)'

/** Form-only overrides are consumed by the form adapters, without eager control imports. */
export function createPavpNaiveFormThemeProjection(appearance: Readonly<UiAppearanceSnapshot>) {
  const shared = createPavpNaiveThemeProjection(appearance).themeOverrides
  const errorBorder = `var(--ui-admin-border-width) solid ${appearance.statusColors.error.default}`
  const scrollbar = shared.Scrollbar
  const Input = {
    heightMedium: controlHeight,
    fontSizeMedium: fontSize,
    fontWeight,
    lineHeight,
    lineHeightTextarea: lineHeight,
    borderRadius: controlRadius,
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
    borderError: errorBorder,
    borderHoverError: errorBorder,
    borderFocusError: errorBorder,
    colorFocusError: colorPanel,
    boxShadowFocusError: shadowFocusRing,
    caretColorError: appearance.statusColors.error.default,
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
  const themeOverrides = {
    Form: {
      labelTextColor: colorText,
      asteriskColor: colorText,
      feedbackTextColorWarning: colorText,
      feedbackTextColor: colorTextSecondary,
      labelFontSizeTopMedium: fontSize,
      feedbackFontSizeMedium: tokens['typography.size.caption'],
      feedbackHeightMedium: '0',
      feedbackPadding: '0',
      lineHeight,
      labelFontWeight: fontWeightStrong,
      blankHeightMedium: controlHeight,
      labelTextAlignVertical: 'start',
    },
    Input,
    InputNumber: {
      // Naive parses iconColorDisabled with rgba(). Keep that intermediate
      // concrete; its rendered text-button colors/opacity are overridden here.
      peers: {
        Input,
        Button: shared.Button,
      },
    },
    Select: {
      menuBoxShadow: shadowOverlay,
      peers: {
        InternalSelection: {
          heightMedium: controlHeight,
          fontSizeMedium: fontSize,
          borderRadius: controlRadius,
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
          borderError: errorBorder,
          borderHoverError: errorBorder,
          borderActiveError: errorBorder,
          borderFocusError: errorBorder,
          boxShadowHoverError: 'none',
          boxShadowActiveError: shadowFocusRing,
          boxShadowFocusError: shadowFocusRing,
          colorActiveError: colorPanel,
          caretColorError: appearance.statusColors.error.default,
          peers: {
            Popover: {
              color: colorPanel,
              textColor: colorText,
              boxShadow: shadowOverlay,
              borderRadius: panelRadius,
              fontSize,
              dividerColor: colorBorder,
            },
          },
        },
        InternalSelectMenu: {
          optionFontSizeMedium: fontSize,
          optionHeightMedium: controlHeight,
          borderRadius: panelRadius,
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
    Switch: shared.Switch,
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
      itemBorderRadius: smallRadius,
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
      panelBorderRadius: panelRadius,
      calendarTitleFontWeight: fontWeightStrong,
      iconColor: colorTextSecondary,
      iconColorDisabled: colorTextSecondary,
      itemSize: controlHeight,
      itemCellWidth: controlHeight,
      itemCellHeight: controlHeight,
      calendarTitleHeight: controlHeight,
      scrollItemHeight: controlHeight,
      peers: { Input, Button: { ...shared.Button }, Scrollbar: scrollbar },
    },
  } satisfies GlobalThemeOverrides
  const projected = projectSemanticNaiveTheme(
    appearance.colorPalette,
    themeOverrides,
    appearance.contrast,
    appearance.colorMode,
  )
  return projected
}
