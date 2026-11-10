/** Current workbench coverage belongs to the application, not the reusable UI package. */
const formCapabilityRoutes = Object.freeze([
  'component-form-basics',
  'component-form-detail',
  'component-form-layout',
  'component-form-dependencies',
  'component-form-calculations',
  'component-form-structure',
  'component-form-validation',
  'component-form-extension',
  'component-form-controls',
  'component-form-lifecycle',
  'component-form-loading',
  'component-form-submission',
  'component-form-options',
  'component-form-builder',
] as const)

const tableDataCapabilityRoutes = Object.freeze([
  'component-table-sorting',
  'component-table-rendering',
  'component-table-virtual',
  'component-table-states',
] as const)

const tableExampleRoutes = Object.freeze([
  'component-table',
  'component-table-appearance',
  'component-table-theme',
  'component-table-columns',
  'component-table-selection',
  'component-table-remote',
  'component-table-configuration',
  'component-table-scroll',
  'component-table-widths',
  'component-table-responsive',
  ...tableDataCapabilityRoutes,
  'component-table-summary',
  'component-combination-query',
  'component-combination-modal',
  'component-combination-drawer',
  'component-combination-page',
] as const)

const combinationRoutes = Object.freeze([
  'component-combination-query',
  'component-combination-modal',
  'component-combination-drawer',
  'component-combination-page',
] as const)

const allProductRoutes = Object.freeze([
  'workbench-dashboard',
  'workbench-colors',
  'workbench-sizes',
  'workbench-typography',
  'workbench-interactions',
  'workbench-motion',
  'component-showcase',
  'component-actions',
  'component-inputs',
  'component-form-overview',
  ...formCapabilityRoutes,
  'component-table-overview',
  ...tableExampleRoutes,
  'component-table-editor',
  'component-selection',
  'component-navigation',
  'component-data',
  'component-feedback',
  'component-layout',
] as const)

const contentRoutes = Object.freeze([...allProductRoutes, 'control-center'] as const)

const formExampleRoutes = Object.freeze([
  'component-inputs',
  ...formCapabilityRoutes,
  ...tableDataCapabilityRoutes,
  ...combinationRoutes,
  'component-table-editor',
] as const)

export const componentExampleConsumers: Readonly<Record<string, readonly string[]>> = Object.freeze(
  {
    UiTable: tableExampleRoutes,
    UiTableEditor: Object.freeze([
      'component-combination-modal',
      'component-combination-drawer',
      'component-combination-page',
      'component-table-editor',
    ]),
    UiCopyAction: Object.freeze([
      'workbench-colors',
      'workbench-sizes',
      'workbench-typography',
      'workbench-interactions',
      'workbench-motion',
      'component-showcase',
      'component-actions',
      'component-inputs',
      'component-form-overview',
      ...formCapabilityRoutes,
      'component-table-overview',
      ...tableExampleRoutes,
      'component-selection',
      'component-navigation',
      'component-data',
      'component-feedback',
      'component-layout',
    ]),
    UiScrollArea: contentRoutes,
    UiForm: formExampleRoutes,
    UiFormField: formExampleRoutes,
    UiWorkspaceTabs: allProductRoutes,
    UiAdminShell: contentRoutes,
    UiPageHeader: Object.freeze([]),
    UiProvider: contentRoutes,
    UiRadioCardGroup: Object.freeze([
      'workbench-interactions',
      'control-center',
      'component-selection',
      'component-form-controls',
    ]),
    UiSection: Object.freeze(['workbench-interactions', 'component-layout']),
    UiStatusBadge: Object.freeze(['workbench-dashboard', 'component-showcase', 'component-data']),
  },
)
