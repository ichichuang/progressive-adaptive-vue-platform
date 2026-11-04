import type { UiAppearanceSnapshot } from '@platform/design-system'
import type { GlobalThemeOverrides } from 'naive-ui'

type ColorPalette = NonNullable<UiAppearanceSnapshot['colorPalette']>

/** Project the approved opaque semantic colors through Naive's supported theme fields. */
export function projectSemanticNaiveTheme<Base extends GlobalThemeOverrides>(
  palette: ColorPalette,
  base: Base,
) {
  const { roles, surfaces, text, borders, tooltip } = palette
  const primary = roles.primary
  const neutral = roles.neutral
  const selectedBackground = `var(--pavp-navigation-selected-surface, ${primary.soft.background.default})`
  const selectedForeground = `var(--pavp-navigation-selected-foreground, ${primary.soft.foreground})`
  const childForeground = `var(--pavp-navigation-child-active-foreground, ${primary.soft.foreground})`
  const border = (color: string) => `var(--ui-admin-border-width) solid ${color}`
  const focus = (color: string) => `0 0 0 var(--ui-admin-focus-width) ${color}`
  const common: NonNullable<GlobalThemeOverrides['common']> = {
    ...base.common,
    baseColor: surfaces.surface,
    primaryColor: primary.foreground.default,
    primaryColorHover: primary.foreground.hover,
    primaryColorPressed: primary.foreground.pressed,
    primaryColorSuppl: primary.foreground.suppl,
    textColorBase: text.primary,
    textColor1: text.primary,
    textColor2: text.secondary,
    textColor3: text.muted,
    textColorDisabled: neutral.disabled.foreground,
    placeholderColor: text.muted,
    placeholderColorDisabled: neutral.disabled.foreground,
    iconColor: text.secondary,
    iconColorHover: primary.foreground.hover,
    iconColorPressed: primary.foreground.pressed,
    iconColorDisabled: neutral.disabled.foreground,
    dividerColor: borders.decorative,
    borderColor: borders.control,
    closeIconColor: text.secondary,
    closeIconColorHover: text.primary,
    closeIconColorPressed: text.primary,
    closeColorHover: neutral.soft.background.hover,
    closeColorPressed: neutral.soft.background.pressed,
    clearColor: text.secondary,
    clearColorHover: text.primary,
    clearColorPressed: text.primary,
    scrollbarColor: borders.control,
    scrollbarColorHover: text.secondary,
    progressRailColor: neutral.soft.background.default,
    railColor: neutral.soft.background.default,
    popoverColor: surfaces.raised,
    tableColor: surfaces.surface,
    cardColor: surfaces.surface,
    modalColor: surfaces.raised,
    bodyColor: surfaces.canvas,
    tagColor: neutral.soft.background.default,
    avatarColor: primary.soft.background.default,
    invertedColor: tooltip.background,
    inputColor: surfaces.surface,
    codeColor: surfaces.sunken,
    tabColor: surfaces.surface,
    actionColor: surfaces.surface,
    tableHeaderColor: surfaces.sunken,
    hoverColor: neutral.soft.background.hover,
    tableColorHover: neutral.soft.background.hover,
    tableColorStriped: surfaces.sunken,
    pressedColor: neutral.soft.background.pressed,
    inputColorDisabled: primary.disabled.background,
    buttonColor2: neutral.soft.background.default,
    buttonColor2Hover: neutral.soft.background.hover,
    buttonColor2Pressed: neutral.soft.background.pressed,
  }
  for (const tone of ['info', 'success', 'warning', 'error'] as const) {
    common[`${tone}Color`] = roles[tone].foreground.default
    common[`${tone}ColorHover`] = roles[tone].foreground.hover
    common[`${tone}ColorPressed`] = roles[tone].foreground.pressed
    common[`${tone}ColorSuppl`] = roles[tone].foreground.suppl
  }
  const button: NonNullable<GlobalThemeOverrides['Button']> = {
    ...base.Button,
    color: neutral.soft.background.default,
    colorHover: neutral.soft.background.hover,
    colorPressed: neutral.soft.background.pressed,
    colorFocus: neutral.soft.background.hover,
    colorDisabled: neutral.disabled.background,
    textColor: neutral.soft.foreground,
    textColorHover: neutral.soft.foreground,
    textColorPressed: neutral.soft.foreground,
    textColorFocus: neutral.soft.foreground,
    textColorDisabled: neutral.disabled.foreground,
    textColorText: neutral.foreground.default,
    textColorTextHover: neutral.foreground.hover,
    textColorTextPressed: neutral.foreground.pressed,
    textColorTextFocus: neutral.foreground.hover,
    textColorTextDisabled: neutral.disabled.foreground,
    textColorGhost: neutral.foreground.default,
    textColorGhostHover: neutral.foreground.hover,
    textColorGhostPressed: neutral.foreground.pressed,
    textColorGhostFocus: neutral.foreground.hover,
    textColorGhostDisabled: neutral.disabled.foreground,
    border: border(neutral.soft.border),
    borderHover: border(neutral.soft.border),
    borderPressed: border(neutral.soft.border),
    borderFocus: border(neutral.focus),
    borderDisabled: border(neutral.disabled.border),
    colorSecondary: neutral.soft.background.default,
    colorSecondaryHover: neutral.soft.background.hover,
    colorSecondaryPressed: neutral.soft.background.pressed,
    colorTertiary: neutral.soft.background.default,
    colorTertiaryHover: neutral.soft.background.hover,
    colorTertiaryPressed: neutral.soft.background.pressed,
    colorQuaternaryHover: neutral.soft.background.hover,
    colorQuaternaryPressed: neutral.soft.background.pressed,
    textColorTertiary: text.secondary,
    rippleColor: neutral.focus,
  }
  const tag: NonNullable<GlobalThemeOverrides['Tag']> = {
    ...base.Tag,
    color: neutral.soft.background.default,
    colorBordered: neutral.soft.background.default,
    textColor: neutral.soft.foreground,
    border: border(neutral.soft.border),
    colorCheckable: neutral.soft.background.default,
    colorHoverCheckable: neutral.soft.background.hover,
    colorPressedCheckable: neutral.soft.background.pressed,
    textColorCheckable: neutral.soft.foreground,
    textColorHoverCheckable: neutral.soft.foreground,
    textColorPressedCheckable: neutral.soft.foreground,
    colorChecked: primary.solid.background.default,
    colorCheckedHover: primary.solid.background.hover,
    colorCheckedPressed: primary.solid.background.pressed,
    textColorChecked: primary.solid.foreground,
  }
  const alert: NonNullable<GlobalThemeOverrides['Alert']> = {
    ...base.Alert,
    color: neutral.soft.background.default,
    titleTextColor: neutral.soft.foreground,
    contentTextColor: neutral.soft.foreground,
    iconColor: neutral.soft.icon,
    border: border(neutral.soft.border),
  }
  const message: NonNullable<GlobalThemeOverrides['Message']> = {
    ...base.Message,
    color: surfaces.raised,
    textColor: text.primary,
    iconColor: neutral.foreground.default,
    border: border(borders.control),
    colorLoading: surfaces.raised,
    textColorLoading: text.primary,
    iconColorLoading: primary.foreground.default,
    loadingColor: primary.foreground.default,
  }
  const notification: NonNullable<GlobalThemeOverrides['Notification']> = {
    ...base.Notification,
    color: surfaces.raised,
    textColor: text.primary,
    headerTextColor: text.primary,
    descriptionTextColor: text.muted,
    actionTextColor: text.primary,
    iconColor: neutral.foreground.default,
  }
  for (const [tone, suffix] of [
    ['primary', 'Primary'],
    ['info', 'Info'],
    ['success', 'Success'],
    ['warning', 'Warning'],
    ['error', 'Error'],
  ] as const) {
    const family = roles[tone]
    button[`color${suffix}`] = family.solid.background.default
    button[`colorHover${suffix}`] = family.solid.background.hover
    button[`colorPressed${suffix}`] = family.solid.background.pressed
    button[`colorFocus${suffix}`] = family.solid.background.focus
    button[`colorDisabled${suffix}`] = family.disabled.background
    for (const state of ['', 'Hover', 'Pressed', 'Focus'] as const) {
      button[`textColor${state}${suffix}`] = family.solid.foreground
      button[`border${state}${suffix}`] = border(
        state === 'Focus' ? family.focus : family.solid.border,
      )
    }
    button[`textColorDisabled${suffix}`] = family.disabled.foreground
    button[`borderDisabled${suffix}`] = border(family.disabled.border)
    for (const kind of ['Text', 'Ghost'] as const) {
      button[`textColor${kind}${suffix}`] = family.foreground.default
      button[`textColor${kind}Hover${suffix}`] = family.foreground.hover
      button[`textColor${kind}Pressed${suffix}`] = family.foreground.pressed
      button[`textColor${kind}Focus${suffix}`] = family.foreground.hover
      button[`textColor${kind}Disabled${suffix}`] = family.disabled.foreground
    }
    button[`rippleColor${suffix}`] = family.focus
    tag[`color${suffix}`] = family.soft.background.default
    tag[`colorBordered${suffix}`] = family.soft.background.default
    tag[`textColor${suffix}`] = family.soft.foreground
    tag[`border${suffix}`] = border(family.soft.border)
    tag[`closeIconColor${suffix}`] = family.soft.icon
    tag[`closeIconColorHover${suffix}`] = family.soft.icon
    tag[`closeIconColorPressed${suffix}`] = family.soft.icon
    tag[`closeColorHover${suffix}`] = family.soft.background.hover
    tag[`closeColorPressed${suffix}`] = family.soft.background.pressed
    if (suffix !== 'Primary') {
      alert[`color${suffix}`] = family.soft.background.default
      alert[`titleTextColor${suffix}`] = family.soft.foreground
      alert[`contentTextColor${suffix}`] = family.soft.foreground
      alert[`iconColor${suffix}`] = family.soft.icon
      alert[`border${suffix}`] = border(family.soft.border)
      alert[`closeIconColor${suffix}`] = family.soft.icon
      alert[`closeIconColorHover${suffix}`] = family.soft.icon
      alert[`closeIconColorPressed${suffix}`] = family.soft.icon
      alert[`closeColorHover${suffix}`] = family.soft.background.hover
      alert[`closeColorPressed${suffix}`] = family.soft.background.pressed
      message[`color${suffix}`] = surfaces.raised
      message[`textColor${suffix}`] = text.primary
      message[`iconColor${suffix}`] = family.foreground.default
      notification[`iconColor${suffix}`] = family.foreground.default
    }
  }
  const input: NonNullable<GlobalThemeOverrides['Input']> = {
    ...base.Input,
    color: surfaces.surface,
    colorHover: surfaces.surface,
    colorFocus: surfaces.surface,
    textColor: text.primary,
    textDecorationColor: text.primary,
    placeholderColor: text.muted,
    colorDisabled: primary.disabled.background,
    textColorDisabled: primary.disabled.foreground,
    placeholderColorDisabled: primary.disabled.foreground,
    border: border(borders.control),
    borderHover: border(primary.foreground.hover),
    borderFocus: border(primary.focus),
    borderDisabled: border(primary.disabled.border),
    boxShadowFocus: focus(primary.focus),
    caretColor: primary.foreground.default,
    loadingColor: primary.foreground.default,
  }
  const selection: NonNullable<
    NonNullable<GlobalThemeOverrides['Select']>['peers']
  >['InternalSelection'] = {
    ...base.Select?.peers?.InternalSelection,
    color: surfaces.surface,
    colorActive: surfaces.surface,
    colorDisabled: primary.disabled.background,
    textColor: text.primary,
    textColorDisabled: primary.disabled.foreground,
    placeholderColor: text.muted,
    placeholderColorDisabled: primary.disabled.foreground,
    border: border(borders.control),
    borderHover: border(primary.foreground.hover),
    borderActive: border(primary.focus),
    borderFocus: border(primary.focus),
    boxShadowFocus: focus(primary.focus),
    boxShadowActive: focus(primary.focus),
    caretColor: primary.foreground.default,
    arrowColor: text.secondary,
    arrowColorDisabled: primary.disabled.foreground,
    loadingColor: primary.foreground.default,
  }
  for (const [tone, suffix] of [
    ['error', 'Error'],
    ['warning', 'Warning'],
  ] as const) {
    const family = roles[tone]
    input[`border${suffix}`] = border(family.foreground.default)
    input[`borderHover${suffix}`] = border(family.foreground.hover)
    input[`borderFocus${suffix}`] = border(family.focus)
    input[`boxShadowFocus${suffix}`] = focus(family.focus)
    input[`colorFocus${suffix}`] = surfaces.surface
    input[`caretColor${suffix}`] = family.foreground.default
    input[`loadingColor${suffix}`] = family.foreground.default
    selection[`border${suffix}`] = border(family.foreground.default)
    selection[`borderHover${suffix}`] = border(family.foreground.hover)
    selection[`borderActive${suffix}`] = border(family.focus)
    selection[`borderFocus${suffix}`] = border(family.focus)
    selection[`boxShadowHover${suffix}`] = 'none'
    selection[`boxShadowActive${suffix}`] = focus(family.focus)
    selection[`boxShadowFocus${suffix}`] = focus(family.focus)
    selection[`colorActive${suffix}`] = surfaces.surface
    selection[`caretColor${suffix}`] = family.foreground.default
  }
  const popover: NonNullable<GlobalThemeOverrides['Popover']> = {
    ...base.Popover,
    color: surfaces.raised,
    textColor: text.primary,
    dividerColor: borders.control,
  }
  const dropdown: NonNullable<GlobalThemeOverrides['Dropdown']> = {
    ...base.Dropdown,
    color: surfaces.raised,
    optionTextColor: text.primary,
    prefixColor: text.secondary,
    suffixColor: text.secondary,
    optionTextColorHover: primary.foreground.hover,
    optionTextColorActive: selectedForeground,
    optionTextColorChildActive: primary.soft.foreground,
    optionColorHover: neutral.soft.background.hover,
    optionColorActive: selectedBackground,
    dividerColor: borders.control,
    peers: { ...base.Dropdown?.peers, Popover: { ...base.Dropdown?.peers?.Popover, ...popover } },
  }
  return Object.freeze({
    ...base,
    common,
    Button: button,
    Layout: {
      ...base.Layout,
      common: { ...base.Layout?.common, bodyColor: surfaces.canvas },
      textColor: text.primary,
    },
    Breadcrumb: {
      ...base.Breadcrumb,
      itemTextColor: text.secondary,
      itemTextColorHover: primary.foreground.hover,
      itemTextColorPressed: primary.foreground.pressed,
      itemTextColorActive: text.primary,
      itemColorHover: neutral.soft.background.hover,
      itemColorPressed: neutral.soft.background.pressed,
      separatorColor: borders.control,
    },
    Tag: tag,
    Alert: alert,
    Message: message,
    Notification: notification,
    Input: input,
    InputNumber: {
      ...base.InputNumber,
      peers: { ...base.InputNumber?.peers, Input: input, Button: button },
    },
    Form: {
      ...base.Form,
      labelTextColor: text.primary,
      feedbackTextColor: text.muted,
      // Plain NFormItem feedback is transparent; strong feedback text belongs to the PAVP local owner.
      feedbackTextColorError: roles.error.foreground.default,
      feedbackTextColorWarning: roles.warning.foreground.default,
      asteriskColor: roles.error.foreground.default,
    },
    Select: {
      ...base.Select,
      peers: {
        ...base.Select?.peers,
        InternalSelection: {
          ...selection,
          peers: { ...selection.peers, Popover: { ...selection.peers?.Popover, ...popover } },
        },
        InternalSelectMenu: {
          ...base.Select?.peers?.InternalSelectMenu,
          color: surfaces.raised,
          optionTextColor: text.primary,
          optionTextColorPressed: primary.foreground.pressed,
          optionTextColorDisabled: primary.disabled.foreground,
          optionTextColorActive: primary.soft.foreground,
          groupHeaderTextColor: text.muted,
          optionCheckColor: primary.foreground.default,
          optionColorPending: neutral.soft.background.hover,
          optionColorActive: primary.soft.background.default,
          optionColorActivePending: primary.soft.background.hover,
          actionDividerColor: borders.control,
          actionTextColor: text.primary,
          loadingColor: primary.foreground.default,
        },
      },
    },
    Checkbox: {
      ...base.Checkbox,
      color: surfaces.surface,
      colorChecked: primary.solid.background.default,
      checkMarkColor: primary.solid.foreground,
      colorDisabled: primary.disabled.background,
      colorDisabledChecked: primary.disabled.background,
      checkMarkColorDisabled: primary.disabled.foreground,
      checkMarkColorDisabledChecked: primary.disabled.foreground,
      border: border(borders.control),
      borderChecked: border(primary.solid.border),
      borderFocus: border(primary.focus),
      borderDisabled: border(primary.disabled.border),
      borderDisabledChecked: border(primary.disabled.border),
      boxShadowFocus: focus(primary.focus),
      textColor: text.primary,
      textColorDisabled: primary.disabled.foreground,
    },
    Radio: {
      ...base.Radio,
      color: surfaces.surface,
      colorActive: primary.solid.background.default,
      dotColorActive: primary.solid.foreground,
      colorDisabled: primary.disabled.background,
      dotColorDisabled: primary.disabled.foreground,
      textColor: text.primary,
      textColorDisabled: primary.disabled.foreground,
      boxShadow: `inset 0 0 0 var(--ui-admin-border-width) ${borders.control}`,
      boxShadowActive: `inset 0 0 0 var(--ui-admin-border-width) ${primary.solid.border}`,
      boxShadowHover: focus(primary.foreground.hover),
      boxShadowFocus: focus(primary.focus),
      boxShadowDisabled: `inset 0 0 0 var(--ui-admin-border-width) ${primary.disabled.border}`,
      buttonColor: surfaces.surface,
      buttonColorActive: primary.solid.background.default,
      buttonTextColor: text.primary,
      buttonTextColorActive: primary.solid.foreground,
      buttonTextColorHover: primary.foreground.hover,
      buttonBorderColor: borders.control,
      buttonBorderColorActive: primary.solid.border,
      buttonBorderColorHover: primary.foreground.hover,
      buttonBoxShadowFocus: focus(primary.focus),
    },
    Switch: {
      ...base.Switch,
      railColor: neutral.solid.background.default,
      railColorActive: primary.solid.background.default,
      buttonColor: primary.solid.foreground,
      textColor: primary.solid.foreground,
      iconColor: primary.solid.background.default,
      loadingColor: primary.foreground.default,
      boxShadowFocus: focus(primary.focus),
    },
    Dropdown: dropdown,
    Menu: {
      ...base.Menu,
      groupTextColor: text.muted,
      itemTextColor: text.primary,
      itemIconColor: text.secondary,
      itemIconColorCollapsed: text.secondary,
      arrowColor: text.secondary,
      itemTextColorHover: primary.foreground.hover,
      itemIconColorHover: primary.foreground.hover,
      arrowColorHover: primary.foreground.hover,
      itemTextColorActive: selectedForeground,
      itemTextColorActiveHover: selectedForeground,
      itemTextColorChildActive: childForeground,
      itemTextColorChildActiveHover: childForeground,
      itemIconColorActive: selectedForeground,
      itemIconColorActiveHover: selectedForeground,
      itemIconColorChildActive: childForeground,
      itemIconColorChildActiveHover: childForeground,
      arrowColorActive: selectedForeground,
      arrowColorActiveHover: selectedForeground,
      arrowColorChildActive: childForeground,
      arrowColorChildActiveHover: childForeground,
      itemColorHover: neutral.soft.background.hover,
      itemColorActive: selectedBackground,
      itemColorActiveHover: selectedBackground,
      itemColorActiveCollapsed: selectedBackground,
      peers: { ...base.Menu?.peers, Dropdown: dropdown },
    },
    Tabs: {
      ...base.Tabs,
      paneTextColor: text.primary,
      barColor: primary.foreground.default,
      tabTextColorLine: text.primary,
      tabTextColorActiveLine: primary.foreground.default,
      tabTextColorHoverLine: primary.foreground.hover,
      tabTextColorDisabledLine: primary.disabled.foreground,
      tabTextColorBar: text.primary,
      tabTextColorActiveBar: primary.foreground.default,
      tabTextColorHoverBar: primary.foreground.hover,
      tabTextColorDisabledBar: primary.disabled.foreground,
      tabTextColorCard: text.primary,
      tabTextColorActiveCard: primary.soft.foreground,
      tabTextColorHoverCard: primary.foreground.hover,
      tabTextColorDisabledCard: primary.disabled.foreground,
      tabTextColorSegment: text.primary,
      tabTextColorActiveSegment: primary.soft.foreground,
      tabTextColorHoverSegment: primary.foreground.hover,
      tabTextColorDisabledSegment: primary.disabled.foreground,
      colorSegment: surfaces.sunken,
      tabColorSegment: primary.soft.background.default,
      tabColor: primary.soft.background.default,
      tabBorderColor: borders.control,
      peers: { ...base.Tabs?.peers, Button: button },
    },
    Table: {
      ...base.Table,
      borderColor: borders.control,
      borderColorModal: borders.control,
      borderColorPopover: borders.control,
      tdColor: surfaces.surface,
      tdColorModal: surfaces.raised,
      tdColorPopover: surfaces.raised,
      tdColorStriped: surfaces.sunken,
      tdColorStripedModal: surfaces.sunken,
      tdColorStripedPopover: surfaces.sunken,
      thColor: surfaces.sunken,
      thColorModal: surfaces.sunken,
      thColorPopover: surfaces.sunken,
      thTextColor: text.primary,
      tdTextColor: text.primary,
    },
    DataTable: {
      ...base.DataTable,
      borderColor: borders.control,
      borderColorModal: borders.control,
      borderColorPopover: borders.control,
      tdColor: surfaces.surface,
      tdColorModal: surfaces.raised,
      tdColorPopover: surfaces.raised,
      tdColorHover: neutral.soft.background.hover,
      tdColorHoverModal: neutral.soft.background.hover,
      tdColorHoverPopover: neutral.soft.background.hover,
      tdColorSorting: primary.soft.background.default,
      tdColorSortingModal: primary.soft.background.default,
      tdColorSortingPopover: primary.soft.background.default,
      tdColorStriped: surfaces.sunken,
      tdColorStripedModal: surfaces.sunken,
      tdColorStripedPopover: surfaces.sunken,
      thColor: surfaces.sunken,
      thColorModal: surfaces.sunken,
      thColorPopover: surfaces.sunken,
      thColorHover: neutral.soft.background.hover,
      thColorHoverModal: neutral.soft.background.hover,
      thColorHoverPopover: neutral.soft.background.hover,
      thColorSorting: primary.soft.background.default,
      thColorSortingModal: primary.soft.background.default,
      thColorSortingPopover: primary.soft.background.default,
      thTextColor: text.primary,
      tdTextColor: text.primary,
      thIconColor: text.secondary,
      thIconColorActive: primary.foreground.default,
      loadingColor: primary.foreground.default,
    },
    DatePicker: {
      ...base.DatePicker,
      itemTextColor: text.primary,
      itemTextColorDisabled: primary.disabled.foreground,
      itemTextColorActive: primary.solid.foreground,
      itemTextColorCurrent: primary.foreground.default,
      itemColorIncluded: primary.soft.background.default,
      itemColorHover: primary.soft.background.hover,
      itemColorDisabled: primary.disabled.background,
      itemColorActive: primary.solid.background.default,
      panelColor: surfaces.raised,
      panelTextColor: text.primary,
      calendarTitleTextColor: text.primary,
      calendarTitleColorHover: neutral.soft.background.hover,
      calendarDaysTextColor: text.muted,
      peers: { ...base.DatePicker?.peers, Input: input, Button: button },
    },
    Popover: popover,
    Modal: { ...base.Modal, color: surfaces.raised, textColor: text.primary },
    Card: {
      ...base.Card,
      color: surfaces.surface,
      colorModal: surfaces.raised,
      colorPopover: surfaces.raised,
      colorEmbedded: surfaces.sunken,
      colorEmbeddedModal: surfaces.sunken,
      colorEmbeddedPopover: surfaces.sunken,
      textColor: text.primary,
      titleTextColor: text.primary,
      borderColor: borders.control,
    },
    Tooltip: {
      ...base.Tooltip,
      color: tooltip.background,
      textColor: tooltip.foreground,
      peers: {
        ...base.Tooltip?.peers,
        Popover: {
          ...base.Tooltip?.peers?.Popover,
          color: tooltip.background,
          textColor: tooltip.foreground,
        },
      },
    },
  } satisfies GlobalThemeOverrides)
}
