export interface UiPublicPropContract {
  readonly name: string
  readonly type: string
  readonly required: boolean
  readonly defaultValue: string | null
}

export interface UiPublicEmitContract {
  readonly name: string
  readonly payloadType: string
}

export interface UiPublicSlotContract {
  readonly name: string
  readonly slotPropsType: string
  readonly required: boolean
}

export interface UiPublicComponentRegistryRecord {
  readonly id: string
  readonly exportName: string
  readonly sourcePath: string
  readonly props: readonly UiPublicPropContract[]
  readonly emits: readonly UiPublicEmitContract[]
  readonly slots: readonly UiPublicSlotContract[]
  readonly semanticVariants: readonly string[]
  readonly accessibilityContractIds: readonly string[]
  readonly capabilityStatus: 'TARGET_INACTIVE' | 'ACTIVE'
}

export interface UiPublicComponentRegistry {
  readonly schemaVersion: 1
  readonly records: readonly UiPublicComponentRegistryRecord[]
}

export const uiPublicComponentRegistry = Object.freeze({
  schemaVersion: 1,
  records: Object.freeze([
    Object.freeze({
      id: 'ui-table',
      exportName: 'UiTable',
      sourcePath: 'packages/ui/src/components/UiTable.vue',
      props: Object.freeze([
        Object.freeze({
          name: 'table',
          type: 'UiTableController',
          required: true,
          defaultValue: null,
        }),
        Object.freeze({ name: 'copy', type: 'UiTableCopy', required: true, defaultValue: null }),
        Object.freeze({
          name: 'virtualScroll',
          type: 'boolean',
          required: false,
          defaultValue: null,
        }),
        Object.freeze({
          name: 'height',
          type: 'UiTableHeight',
          required: false,
          defaultValue: null,
        }),
        Object.freeze({
          name: 'appearance',
          type: 'UiTableAppearance',
          required: false,
          defaultValue: null,
        }),
        Object.freeze({ name: 'maxHeight', type: 'number', required: false, defaultValue: null }),
        Object.freeze({
          name: 'rowActionsWidth',
          type: 'number',
          required: false,
          defaultValue: null,
        }),
      ]),
      emits: Object.freeze([]),
      slots: Object.freeze([
        Object.freeze({
          name: 'query',
          slotPropsType: '{ readonly table: UiTableController }',
          required: false,
        }),
        Object.freeze({
          name: 'actions',
          slotPropsType: '{ readonly table: UiTableController }',
          required: false,
        }),
        Object.freeze({
          name: 'rowActions',
          slotPropsType: '{ readonly row: UiTableReadonlyRecord }',
          required: false,
        }),
        Object.freeze({
          name: 'summaryCell',
          slotPropsType:
            '{ readonly table: UiTableController; readonly rowKey: string; readonly column: UiTableColumn; readonly value: UiTableSummaryValue; readonly text: string }',
          required: false,
        }),
      ]),
      semanticVariants: Object.freeze([]),
      accessibilityContractIds: Object.freeze([]),
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'ui-table-editor',
      exportName: 'UiTableEditor',
      sourcePath: 'packages/ui/src/components/UiTableEditor.vue',
      props: Object.freeze([
        Object.freeze({
          name: 'session',
          type: 'ReturnType<typeof useUiTableForm>',
          required: true,
          defaultValue: null,
        }),
        Object.freeze({
          name: 'copy',
          type: 'UiTableEditorCopy',
          required: true,
          defaultValue: null,
        }),
        Object.freeze({
          name: 'contained',
          type: 'boolean',
          required: false,
          defaultValue: null,
        }),
        Object.freeze({
          name: 'scrollOwnerId',
          type: 'string',
          required: false,
          defaultValue: null,
        }),
      ]),
      emits: Object.freeze([
        Object.freeze({
          name: 'scrollController',
          payloadType: '[controller: UiScrollController | null]',
        }),
        Object.freeze({ name: 'closed', payloadType: '[]' }),
        Object.freeze({ name: 'closeBlocked', payloadType: '[]' }),
      ]),
      slots: Object.freeze([
        Object.freeze({ name: 'field', slotPropsType: 'UiFormFieldBinding', required: false }),
        Object.freeze({ name: 'detail', slotPropsType: 'UiFormFieldBinding', required: false }),
      ]),
      semanticVariants: Object.freeze(['modal', 'drawer', 'page']),
      accessibilityContractIds: Object.freeze([]),
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'ui-copy-action',
      exportName: 'UiCopyAction',
      sourcePath: 'packages/ui/src/components/UiCopyAction.vue',
      props: Object.freeze([
        Object.freeze({ name: 'value', type: 'string', required: true, defaultValue: null }),
        Object.freeze({ name: 'label', type: 'string', required: true, defaultValue: null }),
        Object.freeze({ name: 'copyLabel', type: 'string', required: true, defaultValue: null }),
        Object.freeze({ name: 'successLabel', type: 'string', required: true, defaultValue: null }),
        Object.freeze({ name: 'failureLabel', type: 'string', required: true, defaultValue: null }),
        Object.freeze({
          name: 'variant',
          type: "'card' | 'primary' | 'text' | 'tertiary'",
          required: true,
          defaultValue: null,
        }),
        Object.freeze({
          name: 'disabled',
          type: 'boolean',
          required: false,
          defaultValue: 'false',
        }),
      ]),
      emits: Object.freeze([]),
      slots: Object.freeze([
        Object.freeze({
          name: 'default',
          slotPropsType: 'Readonly<Record<string, never>>',
          required: false,
        }),
      ]),
      semanticVariants: Object.freeze(['card', 'primary', 'text', 'tertiary']),
      accessibilityContractIds: Object.freeze([
        'a11y.enhanced-target',
        'a11y.text-status-equivalent',
      ]),
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'ui-scroll-area',
      exportName: 'UiScrollArea',
      sourcePath: 'packages/ui/src/components/UiScrollArea.vue',
      props: Object.freeze([
        Object.freeze({ name: 'ownerId', type: 'string', required: true, defaultValue: null }),
        Object.freeze({ name: 'enabled', type: 'boolean', required: false, defaultValue: 'true' }),
        Object.freeze({
          name: 'contained',
          type: 'boolean',
          required: false,
          defaultValue: 'false',
        }),
        Object.freeze({
          name: 'xScrollable',
          type: 'boolean',
          required: false,
          defaultValue: 'false',
        }),
      ]),
      emits: Object.freeze([
        Object.freeze({ name: 'controller', payloadType: 'UiScrollController | null' }),
        Object.freeze({ name: 'viewport', payloadType: 'HTMLElement | null' }),
      ]),
      slots: Object.freeze([
        Object.freeze({
          name: 'default',
          slotPropsType: 'Readonly<Record<string, never>>',
          required: true,
        }),
      ]),
      semanticVariants: Object.freeze([]),
      accessibilityContractIds: Object.freeze([]),
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'ui-form',
      exportName: 'UiForm',
      sourcePath: 'packages/ui/src/components/UiForm.vue',
      props: Object.freeze([
        Object.freeze({
          name: 'form',
          type: 'UiFormController<I>',
          required: true,
          defaultValue: null,
        }),
        Object.freeze({ name: 'mode', type: 'UiFormMode', required: false, defaultValue: 'edit' }),
        Object.freeze({ name: 'columns', type: '1 | 2', required: false, defaultValue: null }),
      ]),
      emits: Object.freeze([]),
      slots: Object.freeze([
        Object.freeze({ name: 'detail', slotPropsType: 'UiFormFieldBinding', required: false }),
        Object.freeze({
          name: 'default',
          slotPropsType: '{ readonly form: UiFormController<I> }',
          required: false,
        }),
        Object.freeze({
          name: 'field',
          slotPropsType: 'UiFormFieldBinding',
          required: false,
        }),
        Object.freeze({
          name: 'actions',
          slotPropsType: '{ readonly form: UiFormController<I> }',
          required: false,
        }),
      ]),
      semanticVariants: Object.freeze(['edit', 'detail', '1', '2']),
      accessibilityContractIds: Object.freeze([
        'a11y.form-label-feedback',
        'a11y.form-summary-focus',
      ]),
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'ui-form-field',
      exportName: 'UiFormField',
      sourcePath: 'packages/ui/src/components/UiFormField.vue',
      props: Object.freeze([
        Object.freeze({
          name: 'form',
          type: 'UiFormController<I>',
          required: true,
          defaultValue: null,
        }),
        Object.freeze({ name: 'mode', type: 'UiFormMode', required: false, defaultValue: 'edit' }),
        Object.freeze({ name: 'name', type: 'string', required: true, defaultValue: null }),
      ]),
      emits: Object.freeze([]),
      slots: Object.freeze([
        Object.freeze({ name: 'detail', slotPropsType: 'UiFormFieldBinding', required: false }),
        Object.freeze({
          name: 'default',
          slotPropsType: 'UiFormFieldBinding',
          required: false,
        }),
      ]),
      semanticVariants: Object.freeze([]),
      accessibilityContractIds: Object.freeze([
        'a11y.form-label-feedback',
        'a11y.form-summary-focus',
      ]),
      capabilityStatus: 'ACTIVE',
    }),

    Object.freeze({
      id: 'ui-workspace-tabs',
      exportName: 'UiWorkspaceTabs',
      sourcePath: 'packages/ui/src/components/UiWorkspaceTabs.vue',
      props: Object.freeze([
        Object.freeze({
          name: 'items',
          type: 'readonly UiWorkspaceTab[]',
          required: true,
          defaultValue: null,
        }),
        Object.freeze({
          name: 'activeId',
          type: 'string | null',
          required: true,
          defaultValue: null,
        }),
        Object.freeze({ name: 'label', type: 'string', required: true, defaultValue: null }),
        Object.freeze({
          name: 'previousLabel',
          type: 'string',
          required: true,
          defaultValue: null,
        }),
        Object.freeze({ name: 'nextLabel', type: 'string', required: true, defaultValue: null }),
        Object.freeze({ name: 'refreshLabel', type: 'string', required: true, defaultValue: null }),
        Object.freeze({ name: 'closeLabel', type: 'string', required: true, defaultValue: null }),
        Object.freeze({ name: 'panelId', type: 'string', required: true, defaultValue: null }),
        Object.freeze({
          name: 'motion',
          type: "EffectiveAppearanceState['motion']",
          required: true,
          defaultValue: null,
        }),
      ]),
      emits: Object.freeze([
        Object.freeze({ name: 'activate', payloadType: 'string' }),
        Object.freeze({ name: 'close', payloadType: 'string' }),
        Object.freeze({ name: 'refresh', payloadType: 'string' }),
        Object.freeze({ name: 'viewport', payloadType: 'HTMLElement | null' }),
      ]),
      slots: Object.freeze([]),
      semanticVariants: Object.freeze([]),
      accessibilityContractIds: Object.freeze(['a11y.enhanced-target', 'a11y.named-control-group']),
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'ui-admin-shell',
      exportName: 'UiAdminShell',
      sourcePath: 'packages/ui/src/components/UiAdminShell.vue',
      props: Object.freeze([
        Object.freeze({
          name: 'composition',
          type: 'UiShellComposition | null',
          required: true,
          defaultValue: null,
        }),
        Object.freeze({
          name: 'contentLayout',
          type: "'scroll' | 'contained'",
          required: false,
          defaultValue: null,
        }),
        Object.freeze({
          name: 'copy',
          type: 'UiAdminShellCopy',
          required: true,
          defaultValue: null,
        }),
        Object.freeze({
          name: 'activeRouteName',
          type: 'string',
          required: true,
          defaultValue: null,
        }),
        Object.freeze({
          name: 'expandedNavigationGroupIds',
          type: 'readonly string[]',
          required: true,
          defaultValue: null,
        }),
        Object.freeze({
          name: 'navigationAccordion',
          type: 'boolean',
          required: true,
          defaultValue: null,
        }),
        Object.freeze({
          name: 'colorModeSwitchFailed',
          type: 'boolean',
          required: true,
          defaultValue: null,
        }),
        Object.freeze({
          name: 'wideNavigationCollapsed',
          type: 'boolean',
          required: true,
          defaultValue: null,
        }),
        Object.freeze({
          name: 'navigation',
          type: 'readonly UiAdminNavigationGroup[]',
          required: true,
          defaultValue: null,
        }),
      ]),
      emits: Object.freeze([
        Object.freeze({ name: 'navigate', payloadType: 'string' }),
        Object.freeze({ name: 'toggle-color-mode', payloadType: 'void' }),
        Object.freeze({
          name: 'content-scroll-controller',
          payloadType: 'UiScrollController | null',
        }),
        Object.freeze({ name: 'sidebar-viewport', payloadType: 'HTMLElement | null' }),
        Object.freeze({ name: 'drawer-viewport', payloadType: 'HTMLElement | null' }),
        Object.freeze({
          name: 'update:expandedNavigationGroupIds',
          payloadType: 'UiAdminNavigationExpansionUpdate',
        }),
        Object.freeze({ name: 'update:wideNavigationCollapsed', payloadType: 'boolean' }),
      ]),
      slots: Object.freeze([
        Object.freeze({
          name: 'footer',
          slotPropsType: 'Readonly<Record<string, never>>',
          required: false,
        }),
        Object.freeze({
          name: 'navigation-bottom',
          slotPropsType: 'Readonly<{ collapsed: boolean; navigate: (routeName: string) => void }>',
          required: false,
        }),
        Object.freeze({
          name: 'workspace',
          slotPropsType: 'Readonly<Record<string, never>>',
          required: true,
        }),
        Object.freeze({
          name: 'default',
          slotPropsType: 'Readonly<Record<string, never>>',
          required: true,
        }),
      ]),
      semanticVariants: Object.freeze(['narrow', 'regular', 'wide']),
      accessibilityContractIds: Object.freeze(['a11y.enhanced-target', 'a11y.named-navigation']),
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'ui-page-header',
      exportName: 'UiPageHeader',
      sourcePath: 'packages/ui/src/components/UiPageHeader.vue',
      props: Object.freeze([
        Object.freeze({ name: 'breadcrumb', type: 'string', required: true, defaultValue: null }),
        Object.freeze({ name: 'summary', type: 'string', required: true, defaultValue: null }),
        Object.freeze({ name: 'title', type: 'string', required: true, defaultValue: null }),
      ]),
      emits: Object.freeze([]),
      slots: Object.freeze([]),
      semanticVariants: Object.freeze([]),
      accessibilityContractIds: Object.freeze(['a11y.route-focus-primary-heading']),
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'ui-provider',
      exportName: 'UiProvider',
      sourcePath: 'packages/ui/src/providers/UiProvider.vue',
      props: Object.freeze([
        Object.freeze({ name: 'locale', type: 'UiLocale', required: true, defaultValue: null }),
        Object.freeze({
          name: 'appearance',
          type: 'UiAppearanceSnapshot',
          required: true,
          defaultValue: null,
        }),
      ]),
      emits: Object.freeze([]),
      slots: Object.freeze([
        Object.freeze({
          name: 'default',
          slotPropsType: 'Readonly<Record<string, never>>',
          required: true,
        }),
      ]),
      semanticVariants: Object.freeze([]),
      accessibilityContractIds: Object.freeze([]),
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'ui-radio-card-group',
      exportName: 'UiRadioCardGroup',
      sourcePath: 'packages/ui/src/components/UiRadioCardGroup.vue',
      props: Object.freeze([
        Object.freeze({
          name: 'accessibleLabel',
          type: 'string',
          required: true,
          defaultValue: null,
        }),
        Object.freeze({ name: 'modelValue', type: 'string', required: true, defaultValue: null }),
        Object.freeze({
          name: 'options',
          type: 'readonly UiRadioCardOption[]',
          required: true,
          defaultValue: null,
        }),
        Object.freeze({
          name: 'disabled',
          type: 'boolean',
          required: false,
          defaultValue: 'false',
        }),
      ]),
      emits: Object.freeze([Object.freeze({ name: 'update:modelValue', payloadType: 'string' })]),
      slots: Object.freeze([
        Object.freeze({
          name: 'option',
          slotPropsType: 'Readonly<{ option: UiRadioCardOption; selected: boolean }>',
          required: false,
        }),
      ]),
      semanticVariants: Object.freeze(['card-grid']),
      accessibilityContractIds: Object.freeze(['a11y.enhanced-target', 'a11y.named-control-group']),
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'ui-section',
      exportName: 'UiSection',
      sourcePath: 'packages/ui/src/components/UiSection.vue',
      props: Object.freeze([
        Object.freeze({ name: 'description', type: 'string', required: false, defaultValue: null }),
        Object.freeze({ name: 'title', type: 'string', required: true, defaultValue: null }),
      ]),
      emits: Object.freeze([]),
      slots: Object.freeze([
        Object.freeze({
          name: 'default',
          slotPropsType: 'Readonly<Record<string, never>>',
          required: true,
        }),
      ]),
      semanticVariants: Object.freeze([]),
      accessibilityContractIds: Object.freeze(['a11y.semantic-section-heading']),
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'ui-status-badge',
      exportName: 'UiStatusBadge',
      sourcePath: 'packages/ui/src/components/UiStatusBadge.vue',
      props: Object.freeze([
        Object.freeze({ name: 'label', type: 'string', required: true, defaultValue: null }),
        Object.freeze({ name: 'tone', type: 'UiStatusTone', required: true, defaultValue: null }),
      ]),
      emits: Object.freeze([]),
      slots: Object.freeze([]),
      semanticVariants: Object.freeze([
        'active',
        'complete',
        'deferred',
        'inactive',
        'not-started',
      ]),
      accessibilityContractIds: Object.freeze(['a11y.text-status-equivalent']),
      capabilityStatus: 'ACTIVE',
    }),
  ]),
} as const satisfies UiPublicComponentRegistry)
