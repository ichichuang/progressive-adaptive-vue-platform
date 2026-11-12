export { default as UiScrollArea } from './components/UiScrollArea.vue'
export { default as UiCopyAction } from './components/UiCopyAction.vue'
export type * from './components/scroll-contracts'
export { default as UiWorkspaceTabs } from './components/UiWorkspaceTabs.vue'
export { default as UiAdminShell } from './components/UiAdminShell.vue'
export { default as UiPageHeader } from './components/UiPageHeader.vue'
export { default as UiRadioCardGroup } from './components/UiRadioCardGroup.vue'
export { default as UiSection } from './components/UiSection.vue'
export { default as UiStatusBadge } from './components/UiStatusBadge.vue'
export type {
  UiShellComposition,
  UiWorkspaceTab,
  UiLocale,
  UiAdminShellCopy,
  UiAdminNavigationExpansionUpdate,
  UiAdminNavigationGroup,
  UiAdminNavigationItem,
  UiRadioCardOption,
  UiStatusTone,
} from './components/contracts'
export {
  responsiveLayoutConsoleProjection,
  type ResponsiveLayoutConsoleProjection,
  type ResponsiveLayoutProfileRecord,
  type ResponsiveLayoutSizeTokenRecord,
  type ResponsiveLayoutThresholdReference,
} from './console/responsive-layout-console-projection'
export {
  uiSystemConsoleProjection,
  type UiSystemConsoleProjection,
  type UiSystemConsoleStyledVendor,
} from './console/ui-system-console-projection'
export { default as UiProvider } from './providers/UiProvider.vue'

export { default as UiForm } from './components/UiForm.vue'
export { default as UiFormField } from './components/UiFormField.vue'
export { useUiForm } from './composables/use-ui-form'
export type * from './components/form-contracts'

export { parseUiFormSchema } from './components/form-schema'

export type * from './components/table-contracts'
export { parseUiTableSchema } from './components/table-schema'
export { parseUiTableColumnPreference } from './components/table-column-preference'
export { resolveUiTableRequest } from './components/table-request'
export { useUiTable } from './composables/use-ui-table'
export { default as UiTable } from './components/UiTable.vue'
export {
  useUiTableForm,
  type UiTableFormInput,
  type UiTableFormScope,
} from './composables/use-ui-table-form'
export { useUiTableQuery } from './composables/use-ui-table-query'

export { default as UiTableEditor } from './components/UiTableEditor.vue'

export { useUiTableActions, type UiTableActionsInput } from './composables/use-ui-table-actions'

export { default as UiG2Chart } from './components/UiG2Chart.vue'
export type { UiG2ChartOptions } from './components/g2-chart-contracts'

export { default as UiChartTimeRange } from './components/UiChartTimeRange.vue'
export {
  normalizeUiChartTimeRange,
  panUiChartTimeRange,
  zoomUiChartTimeRange,
  type UiChartTimeRangeValue,
} from './components/chart-time-range'

export { inspectUiFormSchema } from './components/form-schema'
export { inspectUiTableSchema } from './components/table-schema'
export type {
  UiConfigurationHint,
  UiConfigurationInspection,
} from './components/configuration-inspection'
