import { isDeepStrictEqual } from 'node:util'

import { z } from 'zod'

import { compareCodePoints } from './order'

export type LayoutContainerVariantId = 'layout-narrow' | 'layout-regular' | 'layout-wide'

export interface UnoCssClassProjection {
  readonly generatorKind: 'exact-rule' | 'theme-entry'
  readonly family: string
  readonly key: string
  readonly classes: readonly [string, ...string[]]
  readonly allowedCssProperties: readonly [string, ...string[]]
}

export interface UnoCssContainerBoundaryContribution {
  readonly variantName: LayoutContainerVariantId
  readonly edge: 'minimum-inclusive' | 'maximum-exclusive'
}

export interface UnoCssContainerVariantProjection {
  readonly generatorKind: 'container-variant'
  readonly family: 'layout-profile'
  readonly key: 'regular-min-inline-size' | 'wide-min-inline-size'
  readonly containerName: 'pavp-admin-shell'
  readonly containerType: 'inline-size'
  readonly measurementAxis: 'inline'
  readonly boundaryContributions: readonly [
    UnoCssContainerBoundaryContribution,
    ...UnoCssContainerBoundaryContribution[],
  ]
}

export type PublicRoleUnoCssProjection = UnoCssClassProjection | UnoCssContainerVariantProjection

export interface PublicRoleRecord {
  readonly id: string
  readonly tokenType:
    | 'color'
    | 'cubicBezier'
    | 'dimension'
    | 'duration'
    | 'fontFamily'
    | 'fontWeight'
    | 'number'
    | 'shadow'
  readonly category: 'color' | 'interaction' | 'layout' | 'spacing' | 'typography'
  readonly visibility: 'public'
  readonly admissionPhase: 1
  readonly cssVariable: `--ui-${string}`
  readonly themePlaneApplicability: 'target-required-after-atomic-cutover' | 'not-applicable'
  readonly contrastEndpointId: string | null
  readonly alphaContractId: 'alpha-scrim-viewport' | null
  readonly unocss: PublicRoleUnoCssProjection
}

export interface AlphaContractRecord {
  readonly id: string
  readonly roleId: string
  readonly minimumAlpha: number
  readonly maximumAlpha: number
}

export interface NamedContrastRecord {
  readonly id: string
  readonly foregroundRole: string
  readonly backgroundRole: string
  readonly kind: 'normal-text' | 'large-text' | 'non-text'
  readonly standardMinimum: number
  readonly enhancedMinimum: number
  readonly maximumUsefulRatio: number | null
  readonly enhancedDifferenceRequired: boolean
  readonly staticMaterialProjections: readonly ('adaptive' | 'reduced' | 'solid')[]
}

export type UnoCssMappingRecord =
  | {
      readonly roleId: string
      readonly cssVariable: `--ui-${string}`
      readonly generatorKind: 'exact-rule' | 'theme-entry'
      readonly family: string
      readonly key: string
      readonly classes: readonly string[]
      readonly allowedCssProperties: readonly string[]
    }
  | {
      readonly roleId: string
      readonly cssVariable: `--ui-${string}`
      readonly generatorKind: 'container-variant'
      readonly family: 'layout-profile'
      readonly key: 'regular-min-inline-size' | 'wide-min-inline-size'
      readonly containerName: 'pavp-admin-shell'
      readonly containerType: 'inline-size'
      readonly measurementAxis: 'inline'
      readonly boundaryContributions: readonly UnoCssContainerBoundaryContribution[]
    }

function metadataEquals(actual: string, expected: string): boolean {
  return actual === expected
}

export function isActivePublicColorRole(record: PublicRoleRecord): record is PublicRoleRecord & {
  readonly themePlaneApplicability: 'target-required-after-atomic-cutover'
  readonly tokenType: 'color'
} {
  return (
    metadataEquals(record.visibility, 'public') &&
    record.tokenType === 'color' &&
    record.themePlaneApplicability === 'target-required-after-atomic-cutover'
  )
}

export const PublicRoleRegistry = {
  schemaVersion: 1,
  status: 'active-current-public-surface',
  records: [
    {
      id: 'color.action.primary',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-action-primary',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: 'color.action.primary',
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'action-primary',
        classes: ['bg-action-primary'],
        allowedCssProperties: ['background-color'],
      },
    },
    {
      id: 'color.control.primary',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-control-primary',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: 'color.control.primary',
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'control-primary',
        classes: ['text-control-primary'],
        allowedCssProperties: ['color'],
      },
    },
    {
      id: 'color.border.default',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-border-default',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: 'color.border.default',
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'border-default',
        classes: ['border-border-default'],
        allowedCssProperties: ['border-color'],
      },
    },
    {
      id: 'color.focus.ring',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-focus-ring',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: 'color.focus.ring',
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'focus-ring',
        classes: ['ring-focus-ring'],
        allowedCssProperties: ['--un-ring-color'],
      },
    },
    {
      id: 'color.scrim.viewport',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-scrim-viewport',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: null,
      alphaContractId: 'alpha-scrim-viewport',
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'scrim-viewport',
        classes: ['bg-scrim-viewport'],
        allowedCssProperties: ['background-color'],
      },
    },
    {
      id: 'color.surface.page',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-surface-page',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: 'color.surface.page',
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'surface-page',
        classes: ['bg-surface-page'],
        allowedCssProperties: ['background-color'],
      },
    },
    {
      id: 'color.surface.panel',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-surface-panel',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: 'color.surface.panel',
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'surface-panel',
        classes: ['bg-surface-panel'],
        allowedCssProperties: ['background-color'],
      },
    },
    {
      id: 'color.text.on-action',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-text-on-action',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: 'color.text.on-action',
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'text-on-action',
        classes: ['text-text-on-action'],
        allowedCssProperties: ['color'],
      },
    },
    {
      id: 'color.text.primary',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-text-primary',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: 'color.text.primary',
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'text-primary',
        classes: ['text-text-primary'],
        allowedCssProperties: ['color'],
      },
    },
    {
      id: 'color.text.secondary',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-text-secondary',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: 'color.text.secondary',
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'text-secondary',
        classes: ['text-text-secondary'],
        allowedCssProperties: ['color'],
      },
    },
    {
      id: 'interaction.control.height',
      tokenType: 'dimension',
      category: 'interaction',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-control-height',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'dimension',
        key: 'control',
        classes: ['h-control'],
        allowedCssProperties: ['height'],
      },
    },
    {
      id: 'interaction.motion.duration',
      tokenType: 'duration',
      category: 'interaction',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-motion-duration',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'duration',
        key: 'motion',
        classes: ['duration-motion'],
        allowedCssProperties: ['--un-duration', 'transition-duration'],
      },
    },
    {
      id: 'interaction.motion.easing',
      tokenType: 'cubicBezier',
      category: 'interaction',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-motion-easing',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'easing',
        key: 'motion',
        classes: ['ease-motion'],
        allowedCssProperties: ['--un-ease', 'transition-timing-function'],
      },
    },
    {
      id: 'interaction.radius.panel',
      tokenType: 'dimension',
      category: 'interaction',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-radius-panel',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'theme-entry',
        family: 'radius',
        key: 'panel',
        classes: ['rounded-panel'],
        allowedCssProperties: ['border-radius'],
      },
    },
    {
      id: 'interaction.shadow.panel',
      tokenType: 'shadow',
      category: 'interaction',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-shadow-panel',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'theme-entry',
        family: 'shadow',
        key: 'panel',
        classes: ['shadow-panel'],
        allowedCssProperties: ['--un-shadow', 'box-shadow'],
      },
    },
    {
      id: 'layout.admin.content.minimum-inline-size',
      tokenType: 'dimension',
      category: 'layout',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-layout-admin-content-minimum-inline-size',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'content-size',
        key: 'admin-content',
        classes: ['min-w-admin-content'],
        allowedCssProperties: ['min-width'],
      },
    },
    {
      id: 'layout.admin.drawer.maximum-inline-size',
      tokenType: 'dimension',
      category: 'layout',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-layout-admin-drawer-maximum-inline-size',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'shell-size',
        key: 'admin-drawer',
        classes: ['max-w-admin-drawer'],
        allowedCssProperties: ['max-width'],
      },
    },
    {
      id: 'layout.admin.header.block-size',
      tokenType: 'dimension',
      category: 'layout',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-layout-admin-header-block-size',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'shell-size',
        key: 'admin-header',
        classes: ['h-admin-header'],
        allowedCssProperties: ['height'],
      },
    },
    {
      id: 'layout.admin.sidebar.expanded-inline-size',
      tokenType: 'dimension',
      category: 'layout',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-layout-admin-sidebar-expanded-inline-size',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'shell-size',
        key: 'admin-sidebar-expanded',
        classes: ['w-admin-sidebar-expanded'],
        allowedCssProperties: ['width'],
      },
    },
    {
      id: 'layout.admin.sidebar.rail-inline-size',
      tokenType: 'dimension',
      category: 'layout',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-layout-admin-sidebar-rail-inline-size',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'shell-size',
        key: 'admin-sidebar-rail',
        classes: ['w-admin-sidebar-rail'],
        allowedCssProperties: ['width'],
      },
    },
    {
      id: 'layout.content.max-width',
      tokenType: 'dimension',
      category: 'layout',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-layout-content-max-width',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'content-width',
        key: 'content',
        classes: ['max-w-content'],
        allowedCssProperties: ['max-width'],
      },
    },
    {
      id: 'layout.profile.regular.min-inline-size',
      tokenType: 'dimension',
      category: 'layout',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-layout-profile-regular-min-inline-size',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'container-variant',
        family: 'layout-profile',
        key: 'regular-min-inline-size',
        containerName: 'pavp-admin-shell',
        containerType: 'inline-size',
        measurementAxis: 'inline',
        boundaryContributions: [
          { variantName: 'layout-narrow', edge: 'maximum-exclusive' },
          { variantName: 'layout-regular', edge: 'minimum-inclusive' },
        ],
      },
    },
    {
      id: 'layout.profile.wide.min-inline-size',
      tokenType: 'dimension',
      category: 'layout',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-layout-profile-wide-min-inline-size',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'container-variant',
        family: 'layout-profile',
        key: 'wide-min-inline-size',
        containerName: 'pavp-admin-shell',
        containerType: 'inline-size',
        measurementAxis: 'inline',
        boundaryContributions: [
          { variantName: 'layout-regular', edge: 'maximum-exclusive' },
          { variantName: 'layout-wide', edge: 'minimum-inclusive' },
        ],
      },
    },
    {
      id: 'layout.target.enhanced.minimum-block-size',
      tokenType: 'dimension',
      category: 'layout',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-layout-target-enhanced-minimum-block-size',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'minimum-target',
        key: 'target-enhanced',
        classes: ['min-h-target-enhanced'],
        allowedCssProperties: ['min-height'],
      },
    },
    {
      id: 'layout.target.enhanced.minimum-inline-size',
      tokenType: 'dimension',
      category: 'layout',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-layout-target-enhanced-minimum-inline-size',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'minimum-target',
        key: 'target-enhanced',
        classes: ['min-w-target-enhanced'],
        allowedCssProperties: ['min-width'],
      },
    },
    {
      id: 'layout.z.base',
      tokenType: 'number',
      category: 'layout',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-z-base',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'z-index',
        key: 'base',
        classes: ['z-base'],
        allowedCssProperties: ['z-index'],
      },
    },
    {
      id: 'layout.z.overlay',
      tokenType: 'number',
      category: 'layout',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-z-overlay',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'z-index',
        key: 'overlay',
        classes: ['z-overlay'],
        allowedCssProperties: ['z-index'],
      },
    },
    {
      id: 'spacing.content.gap',
      tokenType: 'dimension',
      category: 'spacing',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-space-content-gap',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'spacing',
        key: 'content-gap',
        classes: ['gap-content-gap'],
        allowedCssProperties: ['gap'],
      },
    },
    {
      id: 'spacing.page.inline',
      tokenType: 'dimension',
      category: 'spacing',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-space-page-inline',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'spacing',
        key: 'page-inline',
        classes: ['px-page-inline'],
        allowedCssProperties: ['padding-inline'],
      },
    },
    {
      id: 'spacing.section.block',
      tokenType: 'dimension',
      category: 'spacing',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-space-section-block',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'spacing',
        key: 'section-block',
        classes: ['py-section-block'],
        allowedCssProperties: ['padding-block'],
      },
    },
    {
      id: 'typography.family.body',
      tokenType: 'fontFamily',
      category: 'typography',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-font-family-body',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'theme-entry',
        family: 'font-family',
        key: 'body-family',
        classes: ['font-body-family'],
        allowedCssProperties: ['font-family'],
      },
    },
    {
      id: 'typography.line-height.body',
      tokenType: 'number',
      category: 'typography',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-font-line-height-body',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'theme-entry',
        family: 'line-height',
        key: 'body',
        classes: ['leading-body'],
        allowedCssProperties: ['--un-leading', 'line-height'],
      },
    },
    {
      id: 'typography.line-height.title',
      tokenType: 'number',
      category: 'typography',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-font-line-height-title',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'theme-entry',
        family: 'line-height',
        key: 'title',
        classes: ['leading-title'],
        allowedCssProperties: ['--un-leading', 'line-height'],
      },
    },
    {
      id: 'typography.size.body',
      tokenType: 'dimension',
      category: 'typography',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-font-size-body',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'typography',
        key: 'body',
        classes: ['text-body'],
        allowedCssProperties: ['font-size'],
      },
    },
    {
      id: 'typography.size.title',
      tokenType: 'dimension',
      category: 'typography',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-font-size-title',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'typography',
        key: 'title',
        classes: ['text-title'],
        allowedCssProperties: ['font-size'],
      },
    },
    {
      id: 'typography.weight.body',
      tokenType: 'fontWeight',
      category: 'typography',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-font-weight-body',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'theme-entry',
        family: 'font-weight',
        key: 'body-weight',
        classes: ['font-body-weight'],
        allowedCssProperties: ['--un-font-weight', 'font-weight'],
      },
    },
    {
      id: 'typography.weight.title',
      tokenType: 'fontWeight',
      category: 'typography',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-font-weight-title',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'theme-entry',
        family: 'font-weight',
        key: 'title-weight',
        classes: ['font-title-weight'],
        allowedCssProperties: ['--un-font-weight', 'font-weight'],
      },
    },
  ],
} as const satisfies {
  readonly schemaVersion: 1
  readonly status: 'active-current-public-surface'
  readonly records: readonly PublicRoleRecord[]
}

export const ActiveAlphaContractRegistry = {
  schemaVersion: 1,
  records: [
    {
      id: 'alpha-scrim-viewport',
      roleId: 'color.scrim.viewport',
      minimumAlpha: 0.56,
      maximumAlpha: 0.56,
    },
  ],
} as const satisfies {
  readonly schemaVersion: 1
  readonly records: readonly AlphaContractRecord[]
}

export const ActiveNamedContrastRegistry = {
  schemaVersion: 1,
  records: [
    {
      id: 'text-primary-on-page',
      foregroundRole: 'color.text.primary',
      backgroundRole: 'color.surface.page',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'text-primary-on-panel',
      foregroundRole: 'color.text.primary',
      backgroundRole: 'color.surface.panel',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'text-secondary-on-page',
      foregroundRole: 'color.text.secondary',
      backgroundRole: 'color.surface.page',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'text-secondary-on-panel',
      foregroundRole: 'color.text.secondary',
      backgroundRole: 'color.surface.panel',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'action-content-on-primary',
      foregroundRole: 'color.text.on-action',
      backgroundRole: 'color.action.primary',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'focus-ring-on-page',
      foregroundRole: 'color.focus.ring',
      backgroundRole: 'color.surface.page',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'focus-ring-on-panel',
      foregroundRole: 'color.focus.ring',
      backgroundRole: 'color.surface.panel',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'material-chrome-content',
      foregroundRole: 'color.text.primary',
      backgroundRole: 'material.chrome.background',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: ['adaptive', 'reduced', 'solid'],
    },
    {
      id: 'material-overlay-content',
      foregroundRole: 'color.text.primary',
      backgroundRole: 'material.overlay.background',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: ['adaptive', 'reduced', 'solid'],
    },
    {
      id: 'material-modal-content',
      foregroundRole: 'color.text.primary',
      backgroundRole: 'material.modal.background',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: ['adaptive', 'reduced', 'solid'],
    },
    {
      id: 'control-primary-on-page',
      foregroundRole: 'color.control.primary',
      backgroundRole: 'color.surface.page',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'control-primary-on-panel',
      foregroundRole: 'color.control.primary',
      backgroundRole: 'color.surface.panel',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'border-default-on-page',
      foregroundRole: 'color.border.default',
      backgroundRole: 'color.surface.page',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'border-default-on-panel',
      foregroundRole: 'color.border.default',
      backgroundRole: 'color.surface.panel',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
  ],
} as const satisfies {
  readonly schemaVersion: 1
  readonly records: readonly NamedContrastRecord[]
}

const publicRoleRecordSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/u),
  tokenType: z.enum([
    'color',
    'cubicBezier',
    'dimension',
    'duration',
    'fontFamily',
    'fontWeight',
    'number',
    'shadow',
  ]),
  category: z.enum(['color', 'interaction', 'layout', 'spacing', 'typography']),
  visibility: z.literal('public'),
  admissionPhase: z.literal(1),
  cssVariable: z.string().regex(/^--ui-[a-z0-9-]+$/u),
  themePlaneApplicability: z.enum(['target-required-after-atomic-cutover', 'not-applicable']),
  contrastEndpointId: z.string().nullable(),
  alphaContractId: z.literal('alpha-scrim-viewport').nullable(),
  unocss: z.discriminatedUnion('generatorKind', [
    z.strictObject({
      generatorKind: z.enum(['exact-rule', 'theme-entry']),
      family: z.string().regex(/^[a-z][a-z0-9-]*$/u),
      key: z.string().regex(/^[a-z][a-z0-9-]*$/u),
      classes: z.array(z.string().regex(/^[a-z][a-z0-9-]*$/u)).min(1),
      allowedCssProperties: z.array(z.string().regex(/^(?:--[a-z0-9-]+|[a-z][a-z-]*)$/u)).min(1),
    }),
    z.strictObject({
      generatorKind: z.literal('container-variant'),
      family: z.literal('layout-profile'),
      key: z.enum(['regular-min-inline-size', 'wide-min-inline-size']),
      containerName: z.literal('pavp-admin-shell'),
      containerType: z.literal('inline-size'),
      measurementAxis: z.literal('inline'),
      boundaryContributions: z
        .array(
          z.strictObject({
            variantName: z.enum(['layout-narrow', 'layout-regular', 'layout-wide']),
            edge: z.enum(['minimum-inclusive', 'maximum-exclusive']),
          }),
        )
        .min(1),
    }),
  ]),
})

const alphaContractRecordSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/u),
  roleId: z.string().min(1),
  minimumAlpha: z.number().min(0).max(1),
  maximumAlpha: z.number().min(0).max(1),
})

const namedContrastRecordSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/u),
  foregroundRole: z.string().min(1),
  backgroundRole: z.string().min(1),
  kind: z.enum(['normal-text', 'large-text', 'non-text']),
  standardMinimum: z.number().min(1).max(21),
  enhancedMinimum: z.number().min(1).max(21),
  maximumUsefulRatio: z.number().min(1).max(21).nullable(),
  enhancedDifferenceRequired: z.boolean(),
  staticMaterialProjections: z.array(z.enum(['adaptive', 'reduced', 'solid'])),
})

const themeEntryContracts = {
  'font-family': {
    classPrefix: 'font',
    properties: ['font-family'],
  },
  'font-weight': {
    classPrefix: 'font',
    properties: ['--un-font-weight', 'font-weight'],
  },
  'line-height': {
    classPrefix: 'leading',
    properties: ['--un-leading', 'line-height'],
  },
  radius: {
    classPrefix: 'rounded',
    properties: ['border-radius'],
  },
  shadow: {
    classPrefix: 'shadow',
    properties: ['--un-shadow', 'box-shadow'],
  },
} as const

const exactRuleContracts = {
  'color|background-color': 'bg',
  'color|border-color': 'border',
  'color|--un-ring-color': 'ring',
  'color|color': 'text',
  'dimension|height': 'h',
  'content-size|min-width': 'min-w',
  'shell-size|max-width': 'max-w',
  'shell-size|height': 'h',
  'shell-size|width': 'w',
  'minimum-target|min-height': 'min-h',
  'minimum-target|min-width': 'min-w',
  'duration|--un-duration,transition-duration': 'duration',
  'easing|--un-ease,transition-timing-function': 'ease',
  'content-width|max-width': 'max-w',
  'z-index|z-index': 'z',
  'spacing|gap': 'gap',
  'spacing|padding-inline': 'px',
  'spacing|padding-block': 'py',
  'typography|font-size': 'text',
} as const

function assertExactCount(actual: number, expected: number, description: string): void {
  if (actual !== expected) {
    throw new Error(`${description}: expected ${String(expected)}, received ${String(actual)}.`)
  }
}

function assertUnique(values: readonly string[], description: string): void {
  const seen = new Set<string>()

  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`${description}: duplicate "${value}".`)
    }

    seen.add(value)
  }
}

function assertExactArray(
  actual: readonly string[],
  expected: readonly string[],
  description: string,
): void {
  if (
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    throw new Error(
      `${description}: expected [${expected.join(', ')}], received [${actual.join(', ')}].`,
    )
  }
}

function assertExactRegistryRecords(
  actual: readonly unknown[],
  expected: readonly unknown[],
  description: string,
): void {
  if (!isDeepStrictEqual(actual, expected)) {
    throw new Error(`${description}: records do not match the canonical exact registry.`)
  }
}

export function validatePublicRoleRegistry(
  registry: unknown = PublicRoleRegistry,
): readonly PublicRoleRecord[] {
  const parsed = z
    .strictObject({
      schemaVersion: z.literal(1),
      status: z.literal('active-current-public-surface'),
      records: z.array(publicRoleRecordSchema),
    })
    .parse(registry)
  const records = parsed.records as unknown as readonly PublicRoleRecord[]

  assertExactCount(records.length, 37, 'Public Role Registry record count')
  assertUnique(
    records.map((record) => record.id),
    'Public Role Registry IDs',
  )
  assertUnique(
    records.map((record) => record.cssVariable),
    'Public Role Registry CSS variables',
  )
  assertUnique(
    records.flatMap((record) =>
      record.unocss.generatorKind === 'container-variant' ? [] : record.unocss.classes,
    ),
    'Public Role Registry UnoCSS classes',
  )

  const sortedIds = records.map((record) => record.id).sort(compareCodePoints)
  const borderIndex = sortedIds.indexOf('color.border.default')
  const controlIndex = sortedIds.indexOf('color.control.primary')

  if (borderIndex < 0 || controlIndex < 0) {
    throw new Error('The Action, Control, and Border public role order is incomplete.')
  }

  sortedIds.splice(controlIndex, 1)
  sortedIds.splice(borderIndex, 0, 'color.control.primary')

  assertExactArray(
    records.map((record) => record.id),
    sortedIds,
    'Public Role Registry canonical order',
  )
  assertExactCount(
    records.filter((record) => record.tokenType === 'color').length,
    10,
    'Active public color role count',
  )
  assertExactCount(
    records.filter((record) => record.unocss.generatorKind === 'exact-rule').length,
    28,
    'Exact UnoCSS rule count',
  )
  assertExactCount(
    records.filter((record) => record.unocss.generatorKind === 'theme-entry').length,
    7,
    'UnoCSS theme-entry count',
  )
  assertExactCount(
    records.filter((record) => record.unocss.generatorKind === 'container-variant').length,
    2,
    'UnoCSS container-variant boundary count',
  )

  for (const record of records) {
    if (!record.id.startsWith(`${record.category}.`)) {
      throw new Error(`${record.id}: category metadata does not match the role ID.`)
    }

    if (record.category === 'color') {
      if (record.themePlaneApplicability !== 'target-required-after-atomic-cutover') {
        throw new Error(`${record.id}: public color roles require target Theme-plane eligibility.`)
      }

      if ((record.contrastEndpointId === null) === (record.alphaContractId === null)) {
        throw new Error(
          `${record.id}: public colors require exactly one contrast endpoint or Alpha contract.`,
        )
      }
    } else if (
      record.themePlaneApplicability !== 'not-applicable' ||
      record.contrastEndpointId !== null ||
      record.alphaContractId !== null
    ) {
      throw new Error(
        `${record.id}: non-color roles cannot declare Theme, contrast, or Alpha data.`,
      )
    }

    if (record.contrastEndpointId !== null && record.contrastEndpointId !== record.id) {
      throw new Error(`${record.id}: public contrast endpoint IDs must equal their role IDs.`)
    }

    if (record.unocss.generatorKind === 'container-variant') {
      const expectedContributions = {
        'regular-min-inline-size': [
          { variantName: 'layout-narrow', edge: 'maximum-exclusive' },
          { variantName: 'layout-regular', edge: 'minimum-inclusive' },
        ],
        'wide-min-inline-size': [
          { variantName: 'layout-regular', edge: 'maximum-exclusive' },
          { variantName: 'layout-wide', edge: 'minimum-inclusive' },
        ],
      } as const

      assertExactRegistryRecords(
        record.unocss.boundaryContributions,
        expectedContributions[record.unocss.key],
        `${record.id} UnoCSS container boundary contributions`,
      )
      continue
    }

    if (record.unocss.generatorKind === 'theme-entry') {
      const contract = (
        themeEntryContracts as Readonly<
          Record<
            string,
            | {
                readonly classPrefix: string
                readonly properties: readonly string[]
              }
            | undefined
          >
        >
      )[record.unocss.family]

      if (contract === undefined) {
        throw new Error(`${record.id}: unsupported UnoCSS Theme family "${record.unocss.family}".`)
      }

      assertExactArray(
        record.unocss.classes,
        [`${contract.classPrefix}-${record.unocss.key}`],
        `${record.id} UnoCSS Theme class`,
      )
      assertExactArray(
        record.unocss.allowedCssProperties,
        contract.properties,
        `${record.id} UnoCSS Theme property scope`,
      )
    } else {
      const signature = `${record.unocss.family}|${record.unocss.allowedCssProperties.join(',')}`
      const classPrefix = (exactRuleContracts as Readonly<Record<string, string | undefined>>)[
        signature
      ]

      if (classPrefix === undefined) {
        throw new Error(`${record.id}: unsupported exact UnoCSS family or CSS property scope.`)
      }

      assertExactArray(
        record.unocss.classes,
        [`${classPrefix}-${record.unocss.key}`],
        `${record.id} exact UnoCSS class`,
      )
    }
  }

  assertExactRegistryRecords(records, PublicRoleRegistry.records, 'Public Role Registry')
  return records
}

export function validateAlphaContractRegistry(
  registry: unknown = ActiveAlphaContractRegistry,
  publicRoleRecords: readonly PublicRoleRecord[] = validatePublicRoleRegistry(),
): readonly AlphaContractRecord[] {
  const parsed = z
    .strictObject({
      schemaVersion: z.literal(1),
      records: z.array(alphaContractRecordSchema),
    })
    .parse(registry)
  const records = parsed.records as readonly AlphaContractRecord[]
  const boundRoles = publicRoleRecords.filter((record) => record.alphaContractId !== null)

  assertExactCount(records.length, 1, 'Active Alpha Registry record count')
  assertUnique(
    records.map((record) => record.id),
    'Active Alpha Registry IDs',
  )
  assertExactCount(boundRoles.length, records.length, 'Active Alpha Registry role binding count')

  for (const record of records) {
    const role = publicRoleRecords.find(
      (candidate) => candidate.id === record.roleId && candidate.alphaContractId === record.id,
    )

    if (role === undefined) {
      throw new Error(
        `${record.id}: Alpha record has an unknown or mismatched public role binding.`,
      )
    }

    if (record.minimumAlpha > record.maximumAlpha) {
      throw new Error(`${record.id}: minimum Alpha cannot exceed maximum Alpha.`)
    }
  }

  assertExactRegistryRecords(records, ActiveAlphaContractRegistry.records, 'Active Alpha Registry')
  return records
}

export function validateNamedContrastRegistry(
  registry: unknown = ActiveNamedContrastRegistry,
  publicRoleRecords: readonly PublicRoleRecord[] = validatePublicRoleRegistry(),
): readonly NamedContrastRecord[] {
  const parsed = z
    .strictObject({
      schemaVersion: z.literal(1),
      records: z.array(namedContrastRecordSchema),
    })
    .parse(registry)
  const records = parsed.records as readonly NamedContrastRecord[]
  const publicEndpoints = new Set(
    publicRoleRecords.flatMap((record) =>
      record.contrastEndpointId === null ? [] : [record.contrastEndpointId],
    ),
  )
  const canonicalRecords = ActiveNamedContrastRegistry.records as readonly NamedContrastRecord[]
  const canonicalRecordsById = new Map(canonicalRecords.map((record) => [record.id, record]))

  assertExactCount(canonicalRecords.length, 14, 'Canonical Named Contrast Registry record count')
  assertUnique(
    canonicalRecords.map((record) => record.id),
    'Canonical Named Contrast Registry IDs',
  )
  assertExactCount(records.length, canonicalRecords.length, 'Named Contrast Registry record count')
  assertUnique(
    records.map((record) => record.id),
    'Named Contrast Registry IDs',
  )

  const actionContent = records.find((record) => record.id === 'action-content-on-primary')
  const controlOnPage = records.find((record) => record.id === 'control-primary-on-page')
  const controlOnPanel = records.find((record) => record.id === 'control-primary-on-panel')

  if (
    actionContent?.foregroundRole !== 'color.text.on-action' ||
    actionContent.backgroundRole !== 'color.action.primary'
  ) {
    throw new Error('action-content-on-primary must use On-action Content over Action Fill.')
  }

  for (const record of [controlOnPage, controlOnPanel]) {
    if (record?.foregroundRole !== 'color.control.primary') {
      throw new Error(`${record?.id ?? 'control-primary contrast'} must use Control Foreground.`)
    }
  }

  for (const record of records) {
    const canonicalRecord = canonicalRecordsById.get(record.id)

    if (canonicalRecord === undefined) {
      throw new Error(`${record.id}: unknown Named Contrast Registry record.`)
    }

    assertExactRegistryRecords(
      [record],
      [canonicalRecord],
      `${record.id} Named Contrast Registry record`,
    )

    if (!publicEndpoints.has(record.foregroundRole)) {
      throw new Error(`${record.id}: foreground is not an active opaque public color endpoint.`)
    }

    if (
      !publicEndpoints.has(record.backgroundRole) &&
      record.staticMaterialProjections.length === 0
    ) {
      throw new Error(
        `${record.id}: a non-public background must declare its exact static Material projections.`,
      )
    }

    if (record.standardMinimum > record.enhancedMinimum) {
      throw new Error(`${record.id}: standard minimum cannot exceed enhanced minimum.`)
    }

    if (
      record.maximumUsefulRatio !== null &&
      (record.maximumUsefulRatio < record.enhancedMinimum || record.maximumUsefulRatio > 21)
    ) {
      throw new Error(`${record.id}: maximum useful ratio is invalid.`)
    }

    if (record.maximumUsefulRatio !== null || record.enhancedDifferenceRequired) {
      throw new Error(
        `${record.id}: the active contract requires no maximum ratio or enhanced-difference rule.`,
      )
    }

    assertUnique(record.staticMaterialProjections, `${record.id} static Material projections`)
  }

  for (const endpoint of publicEndpoints) {
    if (
      !records.some(
        (record) => record.foregroundRole === endpoint || record.backgroundRole === endpoint,
      )
    ) {
      throw new Error(`${endpoint}: active opaque public color endpoint has no named contrast use.`)
    }
  }

  assertExactRegistryRecords(records, canonicalRecords, 'Named Contrast Registry')
  return records
}

export function unoCssMappingRecords(
  publicRoleRecords: readonly PublicRoleRecord[] = validatePublicRoleRegistry(),
): readonly UnoCssMappingRecord[] {
  return publicRoleRecords.map((record) => ({
    roleId: record.id,
    cssVariable: record.cssVariable,
    ...record.unocss,
  }))
}
