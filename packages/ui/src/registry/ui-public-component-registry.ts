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
  readonly consumerRouteNames: readonly string[]
  readonly capabilityStatus: 'TARGET_INACTIVE' | 'ACTIVE'
}

export interface UiPublicComponentRegistry {
  readonly schemaVersion: 1
  readonly records: readonly UiPublicComponentRegistryRecord[]
}

const allProductRoutes = Object.freeze([
  'appearance-management',
  'capability-roadmap',
  'console-overview',
  'design-token-inspector',
  'engineering-quality-inspector',
  'responsive-layout-inspector',
  'router-governance-inspector',
  'runtime-kernel-inspector',
  'storage-persistence-inspector',
  'ui-system-inspector',
] as const)

export const uiPublicComponentRegistry = Object.freeze({
  schemaVersion: 1,
  records: Object.freeze([
    Object.freeze({
      id: 'ui-scroll-area',
      exportName: 'UiScrollArea',
      sourcePath: 'packages/ui/src/components/UiScrollArea.vue',
      props: Object.freeze([
        Object.freeze({ name: 'ownerId', type: 'string', required: true, defaultValue: null }),
        Object.freeze({ name: 'enabled', type: 'boolean', required: false, defaultValue: 'true' }),
        Object.freeze({
          name: 'xScrollable',
          type: 'boolean',
          required: false,
          defaultValue: 'false',
        }),
      ]),
      emits: Object.freeze([
        Object.freeze({ name: 'controller', payloadType: 'UiScrollController | null' }),
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
      consumerRouteNames: allProductRoutes,
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'ui-switch',
      exportName: 'UiSwitch',
      sourcePath: 'packages/ui/src/components/UiSwitch.vue',
      props: Object.freeze([
        Object.freeze({ name: 'modelValue', type: 'boolean', required: true, defaultValue: null }),
        Object.freeze({
          name: 'accessibleLabel',
          type: 'string',
          required: true,
          defaultValue: null,
        }),
      ]),
      emits: Object.freeze([Object.freeze({ name: 'update:modelValue', payloadType: 'boolean' })]),
      slots: Object.freeze([]),
      semanticVariants: Object.freeze([]),
      accessibilityContractIds: Object.freeze(['a11y.enhanced-target', 'a11y.named-control-group']),
      consumerRouteNames: Object.freeze(['appearance-management']),
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
        Object.freeze({ name: 'columns', type: '1 | 2', required: false, defaultValue: '1' }),
      ]),
      emits: Object.freeze([]),
      slots: Object.freeze([
        Object.freeze({
          name: 'default',
          slotPropsType: '{ readonly form: UiFormController<I> }',
          required: false,
        }),
        Object.freeze({
          name: 'field',
          slotPropsType: '{ [K in UiFormKey<I>]: UiFormFieldBinding<I, K> }[UiFormKey<I>]',
          required: false,
        }),
        Object.freeze({
          name: 'actions',
          slotPropsType: '{ readonly form: UiFormController<I> }',
          required: false,
        }),
      ]),
      semanticVariants: Object.freeze(['1', '2']),
      accessibilityContractIds: Object.freeze([
        'a11y.form-label-feedback',
        'a11y.form-summary-focus',
      ]),
      consumerRouteNames: Object.freeze([]),
      capabilityStatus: 'TARGET_INACTIVE',
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
        Object.freeze({ name: 'name', type: 'K', required: true, defaultValue: null }),
      ]),
      emits: Object.freeze([]),
      slots: Object.freeze([
        Object.freeze({
          name: 'default',
          slotPropsType: 'UiFormFieldBinding<I, K>',
          required: false,
        }),
      ]),
      semanticVariants: Object.freeze([]),
      accessibilityContractIds: Object.freeze([
        'a11y.form-label-feedback',
        'a11y.form-summary-focus',
      ]),
      consumerRouteNames: Object.freeze([]),
      capabilityStatus: 'TARGET_INACTIVE',
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
      ]),
      slots: Object.freeze([]),
      semanticVariants: Object.freeze([]),
      accessibilityContractIds: Object.freeze(['a11y.enhanced-target', 'a11y.named-control-group']),
      consumerRouteNames: allProductRoutes,
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'ui-admin-shell',
      exportName: 'UiAdminShell',
      sourcePath: 'packages/ui/src/components/UiAdminShell.vue',
      props: Object.freeze([
        Object.freeze({ name: 'enabled', type: 'boolean', required: true, defaultValue: null }),
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
        Object.freeze({
          name: 'content-scroll-controller',
          payloadType: 'UiScrollController | null',
        }),
        Object.freeze({
          name: 'update:expandedNavigationGroupIds',
          payloadType: 'UiAdminNavigationExpansionUpdate',
        }),
        Object.freeze({ name: 'update:wideNavigationCollapsed', payloadType: 'boolean' }),
      ]),
      slots: Object.freeze([
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
      consumerRouteNames: allProductRoutes,
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'ui-button',
      exportName: 'UiButton',
      sourcePath: 'packages/ui/src/components/UiButton.vue',
      props: Object.freeze([
        Object.freeze({
          name: 'disabled',
          type: 'boolean',
          required: false,
          defaultValue: 'false',
        }),
        Object.freeze({
          name: 'type',
          type: "'button' | 'submit'",
          required: false,
          defaultValue: "'button'",
        }),
        Object.freeze({
          name: 'variant',
          type: "'ghost' | 'primary' | 'secondary'",
          required: false,
          defaultValue: "'secondary'",
        }),
      ]),
      emits: Object.freeze([Object.freeze({ name: 'press', payloadType: 'void' })]),
      slots: Object.freeze([
        Object.freeze({
          name: 'default',
          slotPropsType: 'Readonly<Record<string, never>>',
          required: true,
        }),
      ]),
      semanticVariants: Object.freeze(['ghost', 'primary', 'secondary']),
      accessibilityContractIds: Object.freeze(['a11y.enhanced-target']),
      consumerRouteNames: Object.freeze(['appearance-management']),
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'ui-description-list',
      exportName: 'UiDescriptionList',
      sourcePath: 'packages/ui/src/components/UiDescriptionList.vue',
      props: Object.freeze([
        Object.freeze({
          name: 'items',
          type: 'readonly UiDescriptionItem[]',
          required: true,
          defaultValue: null,
        }),
      ]),
      emits: Object.freeze([]),
      slots: Object.freeze([]),
      semanticVariants: Object.freeze([]),
      accessibilityContractIds: Object.freeze(['a11y.semantic-description-list']),
      consumerRouteNames: Object.freeze([
        'appearance-management',
        'console-overview',
        'design-token-inspector',
        'engineering-quality-inspector',
        'responsive-layout-inspector',
        'router-governance-inspector',
        'runtime-kernel-inspector',
        'storage-persistence-inspector',
        'ui-system-inspector',
      ]),
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
      consumerRouteNames: allProductRoutes,
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
          type: 'EffectiveAppearanceState',
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
      consumerRouteNames: allProductRoutes,
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
          type: 'readonly UiSegmentedOption[]',
          required: true,
          defaultValue: null,
        }),
      ]),
      emits: Object.freeze([Object.freeze({ name: 'update:modelValue', payloadType: 'string' })]),
      slots: Object.freeze([
        Object.freeze({
          name: 'option',
          slotPropsType: 'Readonly<{ option: UiSegmentedOption; selected: boolean }>',
          required: false,
        }),
      ]),
      semanticVariants: Object.freeze(['card-grid']),
      accessibilityContractIds: Object.freeze(['a11y.enhanced-target', 'a11y.named-control-group']),
      consumerRouteNames: Object.freeze(['appearance-management']),
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
      consumerRouteNames: allProductRoutes,
      capabilityStatus: 'ACTIVE',
    }),
    Object.freeze({
      id: 'ui-segmented-control',
      exportName: 'UiSegmentedControl',
      sourcePath: 'packages/ui/src/components/UiSegmentedControl.vue',
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
          type: 'readonly UiSegmentedOption[]',
          required: true,
          defaultValue: null,
        }),
      ]),
      emits: Object.freeze([Object.freeze({ name: 'update:modelValue', payloadType: 'string' })]),
      slots: Object.freeze([]),
      semanticVariants: Object.freeze([]),
      accessibilityContractIds: Object.freeze(['a11y.enhanced-target', 'a11y.named-control-group']),
      consumerRouteNames: Object.freeze(['appearance-management']),
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
      consumerRouteNames: Object.freeze([
        'appearance-management',
        'capability-roadmap',
        'console-overview',
        'design-token-inspector',
        'engineering-quality-inspector',
        'ui-system-inspector',
      ]),
      capabilityStatus: 'ACTIVE',
    }),
  ]),
} as const satisfies UiPublicComponentRegistry)
