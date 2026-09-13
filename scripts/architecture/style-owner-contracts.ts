import type { StyleDeclarationGroup } from './style-debt-baseline'

export interface StyleDeclarationIdentity {
  readonly path: string
  readonly block: number
  readonly context: readonly string[]
  readonly selector: string
  readonly property: string
  readonly value: string
  readonly important: boolean
}

export type StyleResponsibility =
  | 'ORDINARY_STYLE_DEBT'
  | 'VENDOR_ADAPTER_OWNER'
  | 'BROWSER_OR_PLATFORM_OWNER'
  | 'PRIVATE_INTERACTION_MOTION'
  | 'RUNTIME_STYLE_OWNER'
  | 'GENERATED_STYLE_OWNER'
  | 'LEGITIMATE_SCSS_FALLBACK'

interface OwnedStyleContract extends StyleDeclarationGroup {
  readonly responsibility: Exclude<
    StyleResponsibility,
    'ORDINARY_STYLE_DEBT' | 'GENERATED_STYLE_OWNER' | 'LEGITIMATE_SCSS_FALLBACK'
  >
}

interface StyleBlockOwner {
  readonly scoped: boolean
  readonly lang: 'css'
}

export interface ScssAtRuleOwner {
  readonly context: readonly string[]
  readonly name: string
  readonly params: string
}

interface ScssKeyframeOwner {
  readonly context: readonly string[]
  readonly name: string
  readonly family: string
}

export interface ScssFallbackOwner {
  readonly path: string
  readonly block: number
  readonly scoped: true
  readonly lang: 'scss' | 'sass'
  readonly responsibility: 'LEGITIMATE_SCSS_FALLBACK'
  readonly compiler: 'sass' | 'sass-embedded'
  readonly manifestPath: string
  readonly contracts: readonly StyleDeclarationGroup[]
  readonly atRules: readonly ScssAtRuleOwner[]
  readonly keyframes: readonly ScssKeyframeOwner[]
}

export interface StyleCompilerSupport {
  readonly dependency: 'sass' | 'sass-embedded'
  readonly manifestPath: string
  readonly languages: readonly ('scss' | 'sass')[]
  readonly api: 'compileString'
}

// Admission is explicit, not a permanent language prohibition. No compiler or SCSS
// owner is admitted today; a future owner must supply both compiler and exact contracts.
export const scssFallbackOwners: readonly ScssFallbackOwner[] = []
export const styleCompilerSupport: readonly StyleCompilerSupport[] = []

export const shellIconResolverOwner = {
  path: 'packages/ui/src/components/UiAdminShell.vue',
  binding: 'resolveNavigationIconClass',
  classes: [
    'i-lucide-layout-dashboard',
    'i-lucide-palette',
    'i-lucide-swatch-book',
    'i-lucide-cpu',
    'i-lucide-route',
    'i-lucide-database',
    'i-lucide-component',
    'i-lucide-panels-top-left',
    'i-lucide-workflow',
    'i-lucide-map',
  ],
} as const

export const vueStyleOwners: Readonly<Record<string, readonly StyleBlockOwner[]>> = {
  'apps/web/src/pages/appearance.vue': [
    {
      scoped: true,
      lang: 'css',
    },
  ],
  'apps/web/src/pages/capabilities.vue': [
    {
      scoped: true,
      lang: 'css',
    },
  ],
  'apps/web/src/pages/index.vue': [
    {
      scoped: true,
      lang: 'css',
    },
  ],
  'apps/web/src/pages/router.vue': [
    {
      scoped: true,
      lang: 'css',
    },
  ],
  'apps/web/src/pages/runtime-kernel.vue': [
    {
      scoped: true,
      lang: 'css',
    },
  ],
  'packages/ui/src/components/UiSection.vue': [
    {
      scoped: true,
      lang: 'css',
    },
  ],
  'packages/ui/src/components/UiPageHeader.vue': [
    {
      scoped: true,
      lang: 'css',
    },
  ],
  'packages/ui/src/components/UiStatusBadge.vue': [
    {
      scoped: true,
      lang: 'css',
    },
  ],
  'packages/ui/src/components/UiRadioCardGroup.vue': [
    {
      scoped: true,
      lang: 'css',
    },
  ],
  'packages/ui/src/adapters/naive/PavpNaiveForm.vue': [
    {
      scoped: true,
      lang: 'css',
    },
  ],
  'packages/ui/src/adapters/naive/PavpNaiveFormField.vue': [
    {
      scoped: false,
      lang: 'css',
    },
  ],
  'packages/ui/src/adapters/naive/PavpNaiveFormControl.vue': [
    {
      scoped: false,
      lang: 'css',
    },
  ],
  'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue': [
    {
      scoped: false,
      lang: 'css',
    },
  ],
  'packages/ui/src/components/UiAdminShell.vue': [
    {
      scoped: true,
      lang: 'css',
    },
    {
      scoped: false,
      lang: 'css',
    },
  ],
  'packages/ui/src/components/UiScrollArea.vue': [
    {
      scoped: true,
      lang: 'css',
    },
    {
      scoped: false,
      lang: 'css',
    },
  ],
  'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue': [
    {
      scoped: true,
      lang: 'css',
    },
  ],
}

export const generatedStyleOwners = [
  {
    path: 'packages/design-system/src/generated/tokens.css',
    producer: 'packages/design-system/src/build/build.ts',
    verification: 'tokens:check',
  },
  {
    path: 'packages/design-system/src/generated/critical-theme.css',
    producer: 'packages/design-system/src/build/build.ts',
    verification: 'tokens:check',
  },
] as const

export const standaloneStyleOwners: Readonly<Record<string, StyleResponsibility>> = {
  'apps/web/src/app/styles/layers.css': 'BROWSER_OR_PLATFORM_OWNER',
  'apps/web/src/app/router/route-transition/route-transition.css': 'PRIVATE_INTERACTION_MOTION',
  ...Object.fromEntries(
    generatedStyleOwners.map((owner) => [owner.path, 'GENERATED_STYLE_OWNER' as const]),
  ),
}

// Exact selector/context/property responsibilities. Existing private optical, gesture,
// scale and vendor !important values are local to these declarations, never file grants.
export const ownedStyleContracts: readonly OwnedStyleContract[] = [
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    selector: '.pavp-appearance-theme-swatch',
    responsibility: 'RUNTIME_STYLE_OWNER',
    declarations: [['background', 'var(--pavp-appearance-swatch)', false]],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    selector: '.pavp-appearance-feedback__message',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      [
        'animation',
        'pavp-setting-commit var(--ui-motion-duration) var(--ui-motion-easing) both',
        false,
      ],
    ],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    selector:
      ".pavp-appearance-preview[data-material-preview='adaptive']\n  :where(\n    .pavp-material-stage__header,\n    .pavp-material-stage__navigation,\n    .pavp-material-stage__floating\n  )",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['-webkit-backdrop-filter', 'blur(var(--ui-admin-optical-backdrop-blur))', false],
      ['backdrop-filter', 'blur(var(--ui-admin-optical-backdrop-blur))', false],
    ],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    selector:
      ".pavp-appearance-preview[data-material-preview='reduced']\n  :where(\n    .pavp-material-stage__header,\n    .pavp-material-stage__navigation,\n    .pavp-material-stage__floating\n  ),\n.pavp-appearance-preview[data-material-preview='solid']\n  :where(\n    .pavp-material-stage__header,\n    .pavp-material-stage__navigation,\n    .pavp-material-stage__floating\n  )",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['-webkit-backdrop-filter', 'none', false],
      ['backdrop-filter', 'none', false],
    ],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    selector:
      ".pavp-appearance-preview[data-motion-preview='full'] .pavp-material-stage__navigation-indicator,\n.pavp-appearance-preview[data-motion-preview='full'] .pavp-motion-stage__indicator",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      [
        'animation',
        'pavp-appearance-indicator-enter var(--ui-motion-duration) var(--ui-motion-easing) both',
        false,
      ],
    ],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    selector:
      ".pavp-appearance-preview[data-motion-preview='full'] .pavp-material-stage__content-entry,\n.pavp-appearance-preview[data-motion-preview='full'] .pavp-motion-stage__content",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      [
        'animation',
        'pavp-appearance-content-enter var(--ui-motion-duration) var(--ui-motion-easing) both',
        false,
      ],
    ],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    selector:
      ".pavp-appearance-preview[data-motion-preview='reduced'] .pavp-material-stage__navigation-indicator,\n.pavp-appearance-preview[data-motion-preview='reduced'] .pavp-motion-stage__indicator",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      [
        'animation',
        'pavp-appearance-indicator-enter-reduced calc(var(--ui-motion-duration) / 2)\n    var(--ui-motion-easing) both',
        false,
      ],
    ],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    selector:
      ".pavp-appearance-preview[data-motion-preview='reduced'] .pavp-material-stage__content-entry,\n.pavp-appearance-preview[data-motion-preview='reduced'] .pavp-motion-stage__content",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      [
        'animation',
        'pavp-appearance-content-enter-reduced calc(var(--ui-motion-duration) / 2)\n    var(--ui-motion-easing) both',
        false,
      ],
    ],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    selector:
      ".pavp-appearance-preview[data-motion-preview='none']\n  :where(\n    .pavp-material-stage__navigation-indicator,\n    .pavp-material-stage__content-entry,\n    .pavp-motion-stage__indicator,\n    .pavp-motion-stage__content\n  )",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['animation', 'none', false],
      ['transform', 'none', false],
      ['transition', 'none', false],
    ],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: ['@keyframes pavp-setting-commit'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['color', 'var(--ui-color-text-primary)', false],
      ['transform', 'translateY(var(--ui-space-content-gap))', false],
    ],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: ['@keyframes pavp-setting-commit'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['color', 'var(--ui-color-text-secondary)', false],
      ['transform', 'translateY(0)', false],
    ],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: ['@keyframes pavp-setting-commit-reduced'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['color', 'var(--ui-color-text-primary)', false]],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: ['@keyframes pavp-setting-commit-reduced'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['color', 'var(--ui-color-text-secondary)', false]],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: ['@keyframes pavp-appearance-indicator-enter'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'translateX(calc(var(--ui-space-content-gap) * -1))', false]],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: ['@keyframes pavp-appearance-indicator-enter'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'translateX(0)', false]],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: ['@keyframes pavp-appearance-indicator-enter-reduced'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'translateX(calc(var(--ui-space-content-gap) / -4))', false]],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: ['@keyframes pavp-appearance-indicator-enter-reduced'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'translateX(0)', false]],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: ['@keyframes pavp-appearance-content-enter'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'translateY(var(--ui-space-content-gap))', false]],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: ['@keyframes pavp-appearance-content-enter'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'translateY(0)', false]],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: ['@keyframes pavp-appearance-content-enter-reduced'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'translateY(calc(var(--ui-space-content-gap) / 4))', false]],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: ['@keyframes pavp-appearance-content-enter-reduced'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'translateY(0)', false]],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    selector: ":global(html[data-motion='reduced']) .pavp-appearance-feedback__message",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['animation-name', 'pavp-setting-commit-reduced', false],
      ['animation-duration', 'calc(var(--ui-motion-duration) / 2)', false],
    ],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    selector: ":global(html[data-motion='none']) .pavp-appearance-feedback__message",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['animation', 'none', false]],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: ['@media (prefers-reduced-motion: reduce)'],
    selector: ":global(html[data-motion='full']) .pavp-appearance-feedback__message",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['animation-name', 'pavp-setting-commit-reduced', false],
      ['animation-duration', 'calc(var(--ui-motion-duration) / 2)', false],
    ],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: ['@media (prefers-reduced-motion: reduce)'],
    selector:
      ".pavp-appearance-preview[data-motion-preview='full'] .pavp-material-stage__navigation-indicator,\n  .pavp-appearance-preview[data-motion-preview='full'] .pavp-motion-stage__indicator",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['animation-name', 'pavp-appearance-indicator-enter-reduced', false],
      ['animation-duration', 'calc(var(--ui-motion-duration) / 2)', false],
    ],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: ['@media (prefers-reduced-motion: reduce)'],
    selector:
      ".pavp-appearance-preview[data-motion-preview='full'] .pavp-material-stage__content-entry,\n  .pavp-appearance-preview[data-motion-preview='full'] .pavp-motion-stage__content",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['animation-name', 'pavp-appearance-content-enter-reduced', false],
      ['animation-duration', 'calc(var(--ui-motion-duration) / 2)', false],
    ],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: ['@media (prefers-reduced-transparency: reduce)'],
    selector:
      '.pavp-appearance-preview\n    :where(\n      .pavp-material-stage__header,\n      .pavp-material-stage__navigation,\n      .pavp-material-stage__floating\n    )',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['-webkit-backdrop-filter', 'none', false],
      ['backdrop-filter', 'none', false],
    ],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector: '.pavp-appearance-theme-swatches,\n  .pavp-material-stage__canvas',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['border-style', 'solid', false]],
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector:
      '.pavp-appearance-preview\n    :where(\n      .pavp-material-stage__header,\n      .pavp-material-stage__navigation,\n      .pavp-material-stage__floating\n    )',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['-webkit-backdrop-filter', 'none', false],
      ['backdrop-filter', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: [],
    selector: '.pavp-radio-card-group[data-ui-radio-card-group]',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['--n-label-padding', '0', false],
      ['display', 'grid', false],
      [
        'grid-template-columns',
        'repeat(\n    auto-fit,\n    minmax(min(100%, var(--ui-layout-admin-content-minimum-inline-size)), 1fr)\n  )',
        false,
      ],
      ['inline-size', '100%', false],
      ['height', 'auto', false],
      ['block-size', 'auto', false],
      ['gap', 'var(--ui-space-content-gap)', false],
      ['line-height', 'var(--ui-font-line-height-body)', false],
      ['white-space', 'normal', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: [],
    selector:
      '.pavp-radio-card-group[data-ui-radio-card-group] > :not(.pavp-radio-card-group__option)',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['display', 'none', false]],
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: [],
    selector:
      '.pavp-radio-card-group[data-ui-radio-card-group]\n  > .pavp-radio-card-group__option[data-ui-radio-card-option]',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['box-sizing', 'border-box', false],
      ['display', 'grid', false],
      ['inline-size', '100%', false],
      ['height', 'auto', false],
      ['block-size', 'auto', false],
      ['min-inline-size', '0', false],
      ['overflow', 'hidden', false],
      ['padding', '0', false],
      ['border-color', 'var(--ui-color-border-default)', false],
      ['border-style', 'solid', false],
      ['border-width', 'var(--ui-admin-border-width)', false],
      ['border-radius', 'var(--ui-radius-panel)', false],
      ['color', 'var(--ui-color-text-primary)', false],
      ['line-height', 'var(--ui-font-line-height-body)', false],
      ['white-space', 'normal', false],
      ['background', 'var(--ui-color-surface-panel)', false],
      ['box-shadow', 'none', false],
      [
        'transition',
        'background-color var(--ui-motion-duration) var(--ui-motion-easing),\n    box-shadow var(--ui-motion-duration) var(--ui-motion-easing),\n    color var(--ui-motion-duration) var(--ui-motion-easing)',
        false,
      ],
    ],
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: [],
    selector:
      '.pavp-radio-card-group[data-ui-radio-card-group]\n  > .pavp-radio-card-group__option[data-ui-radio-card-option]:hover',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['border-color', 'var(--ui-color-border-default)', false],
      ['color', 'var(--ui-color-text-primary)', false],
      ['background', 'var(--ui-color-surface-page)', false],
      ['box-shadow', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: [],
    selector:
      ".pavp-radio-card-group[data-ui-radio-card-group]\n  > .pavp-radio-card-group__option[data-ui-radio-card-option][data-selected='true']",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['border-color', 'var(--ui-color-border-default)', false],
      ['border-style', 'solid', false],
      ['color', 'var(--ui-color-text-primary)', false],
      ['background', 'var(--ui-color-surface-page)', false],
      ['box-shadow', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: [],
    selector:
      '.pavp-radio-card-group[data-ui-radio-card-group]\n  > .pavp-radio-card-group__option:focus-within[data-ui-radio-card-option]',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['box-shadow', 'var(--ui-admin-shadow-focus-ring)', false]],
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector:
      '.pavp-radio-card-group[data-ui-radio-card-group]\n    > .pavp-radio-card-group__option[data-ui-radio-card-option]',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['border-style', 'solid', false]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveFormField.vue',
    block: 0,
    context: [],
    selector: '.pavp-form-field .n-form-item-feedback--error',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['background-color', 'var(--ui-color-status-error)', false]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveFormField.vue',
    block: 0,
    context: [],
    selector: '.pavp-form-field .n-form-item-label',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['white-space', 'normal', false],
      ['transition', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveFormControl.vue',
    block: 0,
    context: [],
    selector:
      '.pavp-form-control .n-switch,\n.pavp-form-control [data-form-readonly],\n.pavp-form-control button',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['min-block-size', 'var(--ui-layout-target-enhanced-minimum-block-size)', false],
      ['min-inline-size', 'var(--ui-layout-target-enhanced-minimum-inline-size)', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "[data-pavp-admin-navigation='persistent']\n  .pavp-admin-shell__sidebar.n-layout-sider\n  > .n-layout-sider__border",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['width', 'var(--ui-admin-border-width)', false]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      'html[data-motion]\n  :where(\n    .n-button,\n    .n-button__border,\n    .n-button__state-border,\n    .n-button .n-base-wave,\n    .n-button .n-icon-slot,\n    .n-breadcrumb-item,\n    .n-breadcrumb-item .n-icon,\n    .n-breadcrumb-item__link,\n    .n-breadcrumb-item__separator,\n    .n-descriptions-header,\n    .n-descriptions-table-wrapper,\n    .n-descriptions-table-row,\n    .n-descriptions-table-header,\n    .n-descriptions-table-content,\n    .n-descriptions-table-content__content,\n    .n-descriptions__label,\n    .n-radio-group__splitor,\n    .n-radio__dot,\n    .n-radio-button,\n    .n-radio-button__state-border,\n    .n-tag,\n    .n-tag__border,\n    .n-tag__icon,\n    .n-tag__close\n  )',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['transition-duration', 'var(--ui-motion-duration)', false],
      ['transition-timing-function', 'var(--ui-motion-easing)', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector: 'html[data-motion] .n-radio__dot::before',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['transition-duration', 'var(--ui-motion-duration)', false],
      ['transition-timing-function', 'var(--ui-motion-easing)', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector: 'html[data-motion] .n-button .n-icon-slot',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['transition-duration', 'var(--ui-motion-duration)', true],
      ['transition-timing-function', 'var(--ui-motion-easing)', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector: 'html[data-motion] .n-button .n-base-wave',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['animation-duration', 'var(--ui-motion-duration)', false],
      ['animation-timing-function', 'var(--ui-motion-easing)', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector: '.n-button:focus-visible',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['box-shadow', 'var(--ui-admin-shadow-focus-ring)', false]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector: '.pavp-admin-shell__header-action-tooltip.n-popover',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['box-sizing', 'border-box', false],
      ['border-color', 'var(--ui-color-border-default)', false],
      ['border-style', 'solid', false],
      ['border-width', 'var(--ui-admin-border-width)', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector: '.pavp-admin-shell__header-action.n-button',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['outline', 'var(--ui-admin-border-control)', false]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector: '.n-button:focus-visible,\n  .n-radio-button--focus',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['outline', 'var(--ui-admin-border-focus)', false],
      ['outline-offset', 'var(--ui-admin-focus-outline-offset)', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced']\n  :where(\n    .n-button,\n    .n-button__border,\n    .n-button__state-border,\n    .n-button .n-base-wave,\n    .n-button .n-icon-slot,\n    .n-breadcrumb-item,\n    .n-breadcrumb-item .n-icon,\n    .n-breadcrumb-item__link,\n    .n-breadcrumb-item__separator,\n    .n-descriptions-header,\n    .n-descriptions-table-wrapper,\n    .n-descriptions-table-row,\n    .n-descriptions-table-header,\n    .n-descriptions-table-content,\n    .n-descriptions-table-content__content,\n    .n-descriptions__label,\n    .n-radio-group__splitor,\n    .n-radio__dot,\n    .n-radio-button,\n    .n-radio-button__state-border,\n    .n-tag,\n    .n-tag__border,\n    .n-tag__icon,\n    .n-tag__close\n  )",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['transition-duration', 'calc(var(--ui-motion-duration) / 2)', true]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector: "html[data-motion='reduced'] .n-radio__dot::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['transition-duration', 'calc(var(--ui-motion-duration) / 2)', true]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector: "html[data-motion='reduced'] .n-button .n-icon-slot",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['transition-duration', 'calc(var(--ui-motion-duration) / 2)', true]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector: "html[data-motion='reduced'] .n-button .n-base-wave",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['animation-duration', 'calc(var(--ui-motion-duration) / 2)', true]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='none']\n  :where(\n    .n-button,\n    .n-button__border,\n    .n-button__state-border,\n    .n-button .n-base-wave,\n    .n-button .n-icon-slot,\n    .n-breadcrumb-item,\n    .n-breadcrumb-item .n-icon,\n    .n-breadcrumb-item__link,\n    .n-breadcrumb-item__separator,\n    .n-descriptions-header,\n    .n-descriptions-table-wrapper,\n    .n-descriptions-table-row,\n    .n-descriptions-table-header,\n    .n-descriptions-table-content,\n    .n-descriptions-table-content__content,\n    .n-descriptions__label,\n    .n-radio-group__splitor,\n    .n-radio__dot,\n    .n-radio__label,\n    .n-radio-button,\n    .n-radio-button__state-border,\n    .n-tag,\n    .n-tag__border,\n    .n-tag__icon,\n    .n-tag__close,\n    .pavp-form-control,\n    .pavp-form-control *,\n    .pavp-form-field .n-form-item-feedback,\n    .pavp-form-select-menu,\n    .pavp-form-select-menu *,\n    .n-date-panel,\n    .n-date-panel *\n  )",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['animation', 'none', true],
      ['transition', 'none', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='none'] .n-radio__dot::before,\nhtml[data-motion='none'] .n-button .n-icon-slot,\nhtml[data-motion='none'] .n-button .n-base-wave",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['animation', 'none', true],
      ['transition', 'none', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='none'] .pavp-admin-shell__header-action-icon-state,\nhtml[data-motion='none'] .pavp-admin-shell__header-action-tooltip",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['animation', 'none', true],
      ['transition', 'none', true],
      ['transform', 'none', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector: "html[data-motion='none'] .pavp-admin-navigation-dropdown",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['animation', 'none', true],
      ['transition', 'none', true],
      ['transform', 'none', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='full'] .pavp-admin-shell__header-action-icon-state,\nhtml[data-motion='full'] .pavp-admin-shell__header-action-tooltip,\nhtml[data-motion='full'] .pavp-form-control .n-input,\nhtml[data-motion='full'] .pavp-form-control .n-input__border,\nhtml[data-motion='full'] .pavp-form-control .n-input__state-border,\nhtml[data-motion='full'] .pavp-form-control .n-base-selection,\nhtml[data-motion='full'] .pavp-form-control .n-base-selection__border,\nhtml[data-motion='full'] .pavp-form-control .n-base-selection__state-border,\nhtml[data-motion='full'] .pavp-form-control .n-switch__rail,\nhtml[data-motion='full'] .pavp-form-control .n-switch__button,\nhtml[data-motion='full'] .pavp-form-field .n-form-item-feedback,\nhtml[data-motion='full'] .pavp-form-select-menu,\nhtml[data-motion='full'] .n-date-panel,\nhtml[data-motion='full'] .n-date-panel-date,\nhtml[data-motion='full'] .n-date-panel-calendar__title,\nhtml[data-motion='full'] .n-date-panel-month",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['transition-duration', 'var(--ui-motion-duration)', true],
      ['transition-timing-function', 'var(--ui-motion-easing)', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector: "html[data-motion='full'] .pavp-admin-shell__header-action.n-button",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['transition-duration', 'var(--ui-motion-duration)', true],
      ['transition-property', 'background-color, color, opacity', true],
      ['transition-timing-function', 'var(--ui-motion-easing)', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector: "html[data-motion='full'] .pavp-admin-shell__header-action-icon-state",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['transition-property', 'opacity, transform', true]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced'] .pavp-admin-shell__header-action-icon-state,\nhtml[data-motion='reduced'] .pavp-admin-shell__header-action-tooltip,\nhtml[data-motion='reduced'] .pavp-form-control .n-input,\nhtml[data-motion='reduced'] .pavp-form-control .n-input__border,\nhtml[data-motion='reduced'] .pavp-form-control .n-input__state-border,\nhtml[data-motion='reduced'] .pavp-form-control .n-base-selection,\nhtml[data-motion='reduced'] .pavp-form-control .n-base-selection__border,\nhtml[data-motion='reduced'] .pavp-form-control .n-base-selection__state-border,\nhtml[data-motion='reduced'] .pavp-form-control .n-switch__rail,\nhtml[data-motion='reduced'] .pavp-form-control .n-switch__button,\nhtml[data-motion='reduced'] .pavp-form-field .n-form-item-feedback,\nhtml[data-motion='reduced'] .pavp-form-select-menu,\nhtml[data-motion='reduced'] .n-date-panel,\nhtml[data-motion='reduced'] .n-date-panel-date,\nhtml[data-motion='reduced'] .n-date-panel-calendar__title,\nhtml[data-motion='reduced'] .n-date-panel-month",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['transition-duration', 'calc(var(--ui-motion-duration) / 2)', true],
      ['transition-timing-function', 'var(--ui-motion-easing)', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced'] .pavp-admin-shell__header-action.n-button,\nhtml[data-motion='reduced'] .pavp-form-control .n-input,\nhtml[data-motion='reduced'] .pavp-form-control .n-input__border,\nhtml[data-motion='reduced'] .pavp-form-control .n-input__state-border,\nhtml[data-motion='reduced'] .pavp-form-control .n-base-selection,\nhtml[data-motion='reduced'] .pavp-form-control .n-base-selection__border,\nhtml[data-motion='reduced'] .pavp-form-control .n-base-selection__state-border,\nhtml[data-motion='reduced'] .pavp-form-control .n-switch__rail,\nhtml[data-motion='reduced'] .pavp-form-control .n-switch__button,\nhtml[data-motion='reduced'] .pavp-form-select-menu,\nhtml[data-motion='reduced'] .n-date-panel,\nhtml[data-motion='reduced'] .n-date-panel-date,\nhtml[data-motion='reduced'] .n-date-panel-calendar__title,\nhtml[data-motion='reduced'] .n-date-panel-month",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['transition-duration', 'calc(var(--ui-motion-duration) / 2)', true],
      ['transition-property', 'background-color, color, opacity', true],
      ['transition-timing-function', 'var(--ui-motion-easing)', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced'] .pavp-admin-shell__header-action-icon-state,\nhtml[data-motion='reduced'] .pavp-form-field .n-form-item-feedback",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['transform', 'none', true],
      ['transition-property', 'opacity', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector: "html[data-motion='reduced'] .pavp-admin-shell__header-action-tooltip",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['transition-property', 'background-color, color, opacity', true]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced']\n  .pavp-admin-shell__header-action-tooltip:is(\n    .popover-transition-enter-from,\n    .popover-transition-leave-to\n  ),\nhtml[data-motion='reduced']\n  .pavp-form-select-menu:is(\n    .fade-in-scale-up-transition-enter-from,\n    .fade-in-scale-up-transition-leave-to\n  ),\nhtml[data-motion='reduced']\n  .n-date-panel:is(.fade-in-scale-up-transition-enter-from, .fade-in-scale-up-transition-leave-to)",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['transform', 'none', true]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='none']\n  .pavp-admin-shell__header-action-tooltip:is(\n    .popover-transition-enter-from,\n    .popover-transition-leave-to\n  ),\nhtml[data-motion='none']\n  .pavp-form-select-menu:is(\n    .fade-in-scale-up-transition-enter-from,\n    .fade-in-scale-up-transition-leave-to\n  ),\nhtml[data-motion='none']\n  .n-date-panel:is(.fade-in-scale-up-transition-enter-from, .fade-in-scale-up-transition-leave-to)",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['opacity', '1', true],
      ['transform', 'none', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='full']\n  :where(\n    [data-pavp-admin-navigation='persistent'].n-layout,\n    [data-pavp-admin-navigation='persistent'] .n-layout-sider,\n    [data-pavp-admin-navigation='persistent'] .n-layout-sider__border,\n    [data-pavp-admin-navigation='persistent'] .n-layout-sider-scroll-container,\n    [data-pavp-admin-navigation='persistent'] .n-menu,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__icon,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__arrow,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content-header,\n    [data-pavp-admin-navigation='persistent'] .n-submenu-children,\n    .pavp-admin-navigation-dropdown,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__prefix,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__suffix,\n    .pavp-admin-navigation-dropdown .n-dropdown-divider\n  )",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['transition-duration', 'var(--ui-motion-duration)', true],
      ['transition-timing-function', 'var(--ui-motion-easing)', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='full']\n  :where(\n    [data-pavp-admin-navigation='persistent'] .n-menu,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body\n  )",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['transition-property', 'background-color, color, opacity', true]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector: "html[data-motion='full'] .pavp-admin-navigation-dropdown",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['transition-property', 'background-color, opacity, transform', true]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='full']\n  :where(\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__icon,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content-header,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__prefix,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__suffix\n  )",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['transition-property', 'color, opacity', true]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='full'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content__arrow",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['transition-property', 'color, opacity, transform', true]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced']\n  :where(\n    [data-pavp-admin-navigation='persistent'].n-layout,\n    [data-pavp-admin-navigation='persistent'] .n-layout-sider,\n    [data-pavp-admin-navigation='persistent'] .n-layout-sider__border,\n    [data-pavp-admin-navigation='persistent'] .n-layout-sider-scroll-container,\n    [data-pavp-admin-navigation='persistent'] .n-menu,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__icon,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__arrow,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content-header,\n    [data-pavp-admin-navigation='persistent'] .n-submenu-children,\n    .pavp-admin-navigation-dropdown,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__prefix,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__suffix,\n    .pavp-admin-navigation-dropdown .n-dropdown-divider\n  )",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['transition-duration', 'calc(var(--ui-motion-duration) / 2)', true],
      ['transition-timing-function', 'var(--ui-motion-easing)', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced']\n  :where(\n    [data-pavp-admin-navigation='persistent'] .n-menu,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body\n  )",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['transition-property', 'background-color, color, opacity', true]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector: "html[data-motion='reduced'] .pavp-admin-navigation-dropdown",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['transform', 'none', true],
      ['transition-property', 'opacity', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced']\n  :where(\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__icon,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__arrow,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content-header,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__prefix,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__suffix\n  )",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['transition-property', 'color', true]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced'] .pavp-admin-navigation-dropdown.fade-in-scale-up-transition-enter-from,\nhtml[data-motion='reduced'] .pavp-admin-navigation-dropdown.fade-in-scale-up-transition-leave-to",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['transform', 'none', true]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='none']\n  :where(\n    [data-pavp-admin-navigation='persistent'].n-layout,\n    [data-pavp-admin-navigation='persistent'] .n-layout-sider,\n    [data-pavp-admin-navigation='persistent'] .n-layout-sider__border,\n    [data-pavp-admin-navigation='persistent'] .n-layout-sider-scroll-container,\n    [data-pavp-admin-navigation='persistent'] .n-menu,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__icon,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__arrow,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content-header,\n    [data-pavp-admin-navigation='persistent'] .n-submenu-children,\n    .pavp-admin-navigation-dropdown,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__prefix,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__suffix,\n    .pavp-admin-navigation-dropdown .n-dropdown-divider\n  )",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['animation', 'none', true],
      ['transition', 'none', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='none']\n  [data-pavp-admin-navigation='persistent']\n  :is(\n    .n-submenu-children.fade-in-height-expand-transition-enter-active,\n    .n-submenu-children.fade-in-height-expand-transition-leave-active,\n    .n-submenu-children.fade-in-height-expand-transition-enter-from,\n    .n-submenu-children.fade-in-height-expand-transition-leave-to\n  )",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['opacity', '1', true]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='none'] .pavp-admin-navigation-dropdown.fade-in-scale-up-transition-enter-from,\nhtml[data-motion='none'] .pavp-admin-navigation-dropdown.fade-in-scale-up-transition-leave-to",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['opacity', '1', true],
      ['transform', 'none', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector: '.pavp-form-control :focus-visible',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['outline', 'var(--ui-admin-border-focus)', false],
      ['outline-offset', 'var(--ui-admin-focus-outline-offset)', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector: '.pavp-switch *',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['transition-duration', 'var(--ui-motion-duration)', false],
      ['transition-timing-function', 'var(--ui-motion-easing)', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector: ".pavp-switch:not([data-motion='full']) *",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['transition', 'none', false]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector: ".pavp-switch [role='switch']",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['outline', 'var(--ui-admin-border-width) solid ButtonText', false]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector: '.pavp-workspace-context-menu',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['border-width', 'var(--ui-admin-border-width)', false],
      ['border-style', 'solid', false],
      ['border-color', 'var(--ui-color-border-default)', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector: '.pavp-workspace-context-menu:focus-visible',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['outline', 'var(--ui-admin-border-focus)', false]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      'html[data-motion] .pavp-workspace-context-menu,\nhtml[data-motion] .pavp-workspace-context-menu .n-dropdown-option-body',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['transition-duration', 'var(--ui-motion-duration)', true],
      ['transition-timing-function', 'var(--ui-motion-easing)', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced'] .pavp-workspace-context-menu,\nhtml[data-motion='reduced'] .pavp-workspace-context-menu .n-dropdown-option-body",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['transition-duration', 'calc(var(--ui-motion-duration) / 2)', true],
      ['transform', 'none', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='none'] .pavp-workspace-context-menu,\nhtml[data-motion='none'] .pavp-workspace-context-menu .n-dropdown-option-body",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['transition', 'none', true],
      ['transform', 'none', true],
      ['opacity', '1', true],
    ],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector: '.pavp-workspace-context-menu.n-dropdown-menu',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['background', 'Canvas', false]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector: '.pavp-workspace-context-menu .n-dropdown-option-body--pending',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['outline', 'var(--ui-admin-border-width) solid Highlight', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: [],
    selector: '.pavp-admin-shell',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['--pavp-safe-area-top', 'env(safe-area-inset-top, 0px)', false],
      ['--pavp-safe-area-right', 'env(safe-area-inset-right, 0px)', false],
      ['--pavp-safe-area-bottom', 'env(safe-area-inset-bottom, 0px)', false],
      ['--pavp-safe-area-left', 'env(safe-area-inset-left, 0px)', false],
      ['container-name', 'pavp-admin-shell', false],
      ['container-type', 'inline-size', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: [],
    selector: '.pavp-admin-shell::before',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['position', 'absolute', false],
      ['z-index', 'var(--ui-z-base)', false],
      [
        'background',
        'radial-gradient(\n      circle at 12% 4%,\n      color-mix(in srgb, var(--ui-admin-ambient-light-primary) 20%, transparent),\n      transparent 42%\n    ),\n    radial-gradient(\n      circle at 88% 2%,\n      color-mix(in srgb, var(--ui-admin-ambient-light-accent) 16%, transparent),\n      transparent 38%\n    ),\n    linear-gradient(\n      color-mix(in srgb, var(--ui-admin-ambient-grid) 14%, transparent) 1px,\n      transparent 1px\n    ),\n    linear-gradient(\n      90deg,\n      color-mix(in srgb, var(--ui-admin-ambient-grid) 14%, transparent) 1px,\n      transparent 1px\n    )',
        false,
      ],
      [
        'background-size',
        'auto,\n    auto,\n    var(--ui-space-section-block) var(--ui-space-section-block),\n    var(--ui-space-section-block) var(--ui-space-section-block)',
        false,
      ],
      ['content', "''", false],
      ['inset', '0', false],
      ['pointer-events', 'none', false],
      [
        'animation',
        'pavp-admin-ambient-drift calc(var(--ui-motion-duration) * 40) var(--ui-motion-easing)\n    infinite alternate',
        false,
      ],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: [],
    selector: '.pavp-admin-shell__navigation-action::after',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['position', 'absolute', false],
      ['block-size', 'calc(var(--ui-space-content-gap) / 2)', false],
      ['inline-size', 'calc(var(--ui-space-content-gap) / 2)', false],
      ['border-radius', 'var(--ui-radius-panel)', false],
      ['background', 'var(--ui-admin-navigation-selected)', false],
      ['content', "''", false],
      ['inset-block-start', '50%', false],
      ['inset-inline-end', 'var(--ui-space-page-inline)', false],
      ['opacity', '0', false],
      ['transform', 'translateY(-50%) scale(0.72)', false],
      ['transform-origin', 'center', false],
      ['transition-duration', 'var(--ui-motion-duration)', false],
      ['transition-property', 'opacity, transform', false],
      ['transition-timing-function', 'var(--ui-motion-easing)', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: [],
    selector: ".pavp-admin-shell__navigation-action[aria-current='page']::after",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '1', false],
      ['transform', 'translateY(-50%) scale(1)', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: [],
    selector: '.pavp-admin-shell__content',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['overscroll-behavior', 'contain', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: [],
    selector: '.pavp-admin-shell__drawer-layer',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['--pavp-safe-area-top', 'env(safe-area-inset-top, 0px)', false],
      ['--pavp-safe-area-right', 'env(safe-area-inset-right, 0px)', false],
      ['--pavp-safe-area-bottom', 'env(safe-area-inset-bottom, 0px)', false],
      ['--pavp-safe-area-left', 'env(safe-area-inset-left, 0px)', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: [],
    selector:
      '.pavp-admin-drawer-enter-active .pavp-admin-shell__drawer-navigation,\n.pavp-admin-drawer-leave-active .pavp-admin-shell__drawer-navigation',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['transition-duration', 'var(--ui-motion-duration)', false],
      ['transition-property', 'transform', false],
      ['transition-timing-function', 'var(--ui-motion-easing)', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: [],
    selector:
      '.pavp-admin-drawer-enter-from .pavp-admin-shell__drawer-navigation,\n.pavp-admin-drawer-leave-to .pavp-admin-shell__drawer-navigation',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      [
        'transform',
        'translateX(calc(var(--ui-layout-admin-drawer-maximum-inline-size) * -1))',
        false,
      ],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@keyframes pavp-admin-ambient-drift'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'translateX(calc(var(--ui-space-content-gap) * -1))', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@keyframes pavp-admin-ambient-drift'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'translateX(var(--ui-space-content-gap))', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector: '.pavp-admin-shell::before',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['display', 'none', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@media (prefers-reduced-transparency: reduce)'],
    selector: '.pavp-admin-shell::before',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['opacity', '0', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@media (prefers-reduced-transparency: reduce)'],
    selector:
      ".pavp-admin-shell__header,\n  .pavp-admin-shell__sidebar,\n  .pavp-admin-shell__navigation-action[aria-current='page'],\n  .pavp-admin-shell__drawer-navigation",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['-webkit-backdrop-filter', 'none', false],
      ['backdrop-filter', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector: "[data-pavp-admin-navigation='persistent'] .n-menu",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['padding-block-end', '0', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector: "[data-pavp-admin-navigation='persistent'] .n-menu-item:focus-visible",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['border-radius', 'var(--ui-radius-panel)', false],
      ['box-shadow', 'var(--ui-admin-shadow-focus-ring)', false],
      ['outline', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector: '.pavp-admin-shell__header-action-icon-state',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '0', false],
      ['transform', 'scale(0.98)', false],
      ['transform-origin', 'center', false],
      ['transition-duration', 'var(--ui-motion-duration)', false],
      ['transition-property', 'opacity, transform', false],
      ['transition-timing-function', 'var(--ui-motion-easing)', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      "[data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,\n.pavp-admin-navigation-dropdown .n-dropdown-option-body::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['opacity', '0', false],
      ['transform', 'none', false],
      ['transition-duration', 'var(--ui-motion-duration)', false],
      ['transition-property', 'background-color, opacity', false],
      ['transition-timing-function', 'var(--ui-motion-easing)', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      "[data-pavp-admin-navigation='persistent'] .n-menu-item-content--hover::before,\n[data-pavp-admin-navigation='persistent'] .n-menu-item-content:hover::before,\n.pavp-admin-navigation-dropdown .n-dropdown-option-body--pending::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['opacity', '1', false],
      ['transform', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      "[data-pavp-admin-navigation='persistent'] .n-menu-item-content--selected::before,\n.pavp-admin-shell[data-navigation-collapsed='true']\n  [data-pavp-admin-navigation='persistent']\n  .n-menu-item-content--child-active::before,\n.pavp-admin-navigation-dropdown .n-dropdown-option-body--active::before,\n.pavp-admin-navigation-dropdown\n  .n-dropdown-option[aria-current='page']\n  .n-dropdown-option-body::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['opacity', '1', false],
      ['transform', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector: '.pavp-admin-shell__header-action-icon-state--active',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '1', false],
      ['transform', 'scale(1)', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      "[data-pavp-admin-navigation='persistent']\n  .n-menu-item-content:active\n  :where(.n-menu-item-content__icon, .n-menu-item-content__arrow, .n-menu-item-content-header)",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['color', 'var(--ui-color-control-primary)', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      ".pavp-admin-shell[data-navigation-collapsed='true']\n  [data-pavp-admin-navigation='persistent']\n  .n-menu-item-content--child-active::before,\n.pavp-admin-shell[data-navigation-collapsed='true']\n  [data-pavp-admin-navigation='persistent']\n  .n-menu-item-content--child-active.n-menu-item-content--hover::before,\n.pavp-admin-shell[data-navigation-collapsed='true']\n  [data-pavp-admin-navigation='persistent']\n  .n-menu-item-content--child-active:hover::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['background', 'var(--n-item-color-active-collapsed)', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      ".pavp-admin-navigation-dropdown .n-dropdown-option-body--active::before,\n.pavp-admin-navigation-dropdown\n  .n-dropdown-option[aria-current='page']\n  .n-dropdown-option-body::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['background', 'var(--n-option-color-active)', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector: '.pavp-admin-navigation-selection-lens',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['position', 'absolute', false],
      ['inset-block', '0', false],
      ['inset-inline', 'calc(var(--ui-space-content-gap) / 2)', false],
      ['border-radius', 'var(--ui-radius-panel)', false],
      [
        'background',
        'color-mix(\n    in srgb,\n    var(--ui-admin-navigation-selected) 16%,\n    var(--ui-material-overlay-background)\n  )',
        false,
      ],
      ['pointer-events', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      "html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,\nhtml[data-motion='reduced']\n  .pavp-admin-navigation-dropdown\n  .n-dropdown-option\n  .n-dropdown-option-body::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['transform', 'none', false],
      ['transition-duration', 'var(--ui-motion-duration)', false],
      ['transition-property', 'background-color, opacity', false],
      ['transition-timing-function', 'var(--ui-motion-easing)', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      "html[data-motion='none'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,\nhtml[data-motion='none']\n  .pavp-admin-navigation-dropdown\n  .n-dropdown-option\n  .n-dropdown-option-body::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['animation', 'none', false],
      ['transform', 'none', false],
      ['transition', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      ".pavp-admin-shell[data-navigation-collapsed='false']\n  [data-pavp-admin-navigation='persistent']\n  .n-menu\n  > .n-submenu\n  > .n-menu-item-content:where(.n-menu-item-content--hover, :hover)::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['visibility', 'visible', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      ".pavp-admin-shell[data-navigation-collapsed='false']\n  [data-pavp-admin-navigation='persistent']\n  .n-menu\n  > .n-submenu\n  > .n-menu-item-content:where(:not(.n-menu-item-content--hover):not(:hover))::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['visibility', 'hidden', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      ".pavp-admin-shell[data-navigation-collapsed='false']\n  [data-pavp-admin-navigation='persistent']\n  .n-menu-item-content--child-active:not(.n-menu-item-content--hover):not(:hover)::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['opacity', '1', false],
      ['transform', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      ".pavp-admin-shell[data-navigation-collapsed='false']\n  [data-pavp-admin-navigation-motion-ready='true']\n  .n-menu-item-content--selected::before,\n.pavp-admin-shell[data-navigation-collapsed='true']\n  [data-pavp-admin-navigation-motion-ready='true']\n  .n-menu-item-content.n-menu-item-content--child-active::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['opacity', '1', false],
      ['transform', 'none', false],
      ['transition', 'none', false],
      ['visibility', 'hidden', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector: '.pavp-admin-navigation-dropdown.n-dropdown-menu',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['box-sizing', 'border-box', false],
      ['border-color', 'var(--ui-color-border-default)', false],
      ['border-style', 'solid', false],
      ['border-width', 'var(--ui-admin-border-width)', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      '.pavp-admin-navigation-dropdown\n  .n-dropdown-option-body:active\n  :where(.n-dropdown-option-body__prefix, .n-dropdown-option-body__label)',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['color', 'var(--ui-color-control-primary)', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      "html[data-material='adaptive'] .pavp-admin-shell__header,\nhtml[data-material='adaptive'] .pavp-admin-shell__sidebar,\nhtml[data-material='adaptive'] .pavp-admin-shell__navigation-action[aria-current='page'],\nhtml[data-material='adaptive'] .pavp-admin-shell__drawer-navigation,\nhtml[data-material='adaptive'] .pavp-admin-navigation-dropdown",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['-webkit-backdrop-filter', 'blur(var(--ui-admin-optical-backdrop-blur))', false],
      ['backdrop-filter', 'blur(var(--ui-admin-optical-backdrop-blur))', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      "html[data-material='reduced'] .pavp-admin-shell__header,\nhtml[data-material='reduced'] .pavp-admin-shell__sidebar,\nhtml[data-material='reduced'] .pavp-admin-shell__navigation-action[aria-current='page'],\nhtml[data-material='reduced'] .pavp-admin-shell__drawer-navigation,\nhtml[data-material='reduced'] .pavp-admin-navigation-dropdown,\nhtml[data-material='solid'] .pavp-admin-shell__header,\nhtml[data-material='solid'] .pavp-admin-shell__sidebar,\nhtml[data-material='solid'] .pavp-admin-shell__navigation-action[aria-current='page'],\nhtml[data-material='solid'] .pavp-admin-shell__drawer-navigation,\nhtml[data-material='solid'] .pavp-admin-navigation-dropdown",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['-webkit-backdrop-filter', 'none', false],
      ['backdrop-filter', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      "html[data-material='reduced'] .pavp-admin-shell__header,\nhtml[data-material='reduced'] .pavp-admin-shell__sidebar,\nhtml[data-material='reduced'] .pavp-admin-shell__drawer-navigation,\nhtml[data-material='reduced'] .pavp-admin-navigation-dropdown",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['box-shadow', 'none', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      "html[data-motion='reduced'] .pavp-admin-shell::before,\nhtml[data-motion='none'] .pavp-admin-shell::before",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['animation', 'none', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      "html[data-motion='reduced']\n  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active\n  .pavp-admin-shell__drawer-navigation,\nhtml[data-motion='reduced']\n  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-active\n  .pavp-admin-shell__drawer-navigation,\nhtml[data-motion='reduced'] .pavp-admin-shell__sidebar,\nhtml[data-motion='reduced'] .pavp-admin-shell__action,\nhtml[data-motion='reduced'] .pavp-admin-shell__navigation-action,\nhtml[data-motion='reduced'] .pavp-admin-shell__navigation-action::after",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transition-duration', 'calc(var(--ui-motion-duration) / 2)', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      "html[data-motion='none']\n  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active\n  .pavp-admin-shell__drawer-navigation,\nhtml[data-motion='none']\n  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-active\n  .pavp-admin-shell__drawer-navigation,\nhtml[data-motion='none'] .pavp-admin-shell__sidebar,\nhtml[data-motion='none'] .pavp-admin-shell__action,\nhtml[data-motion='none'] .pavp-admin-shell__navigation-action,\nhtml[data-motion='none'] .pavp-admin-shell__navigation-action::after",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transition', 'none', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      "html[data-motion='reduced'] .pavp-admin-shell__action:active,\nhtml[data-motion='reduced'] .pavp-admin-shell__navigation-action:active",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'none', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      "html[data-motion='reduced']\n  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-from\n  .pavp-admin-shell__drawer-navigation,\nhtml[data-motion='reduced']\n  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-to\n  .pavp-admin-shell__drawer-navigation",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'translateX(calc(var(--ui-space-content-gap) * -1))', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      "html[data-motion='none']\n  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-from\n  .pavp-admin-shell__drawer-navigation,\nhtml[data-motion='none']\n  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-to\n  .pavp-admin-shell__drawer-navigation",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'none', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      "html[data-motion='none'] .pavp-admin-shell__action:active,\nhtml[data-motion='none'] .pavp-admin-shell__navigation-action:active",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'none', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@media (forced-colors: active)'],
    selector: "[data-pavp-admin-navigation='persistent'] .n-menu-item:focus-visible",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['outline', 'var(--ui-admin-border-focus)', false],
      ['outline-offset', 'var(--ui-admin-focus-outline-offset)', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@media (forced-colors: active)'],
    selector: '.pavp-admin-navigation-selection-lens',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['background', 'var(--ui-color-action-primary)', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@media (forced-colors: active)'],
    selector:
      "[data-pavp-admin-navigation='persistent'] .n-menu-item-content--selected::before,\n  .pavp-admin-shell[data-navigation-collapsed='true']\n    [data-pavp-admin-navigation='persistent']\n    .n-menu-item-content--child-active::before,\n  .pavp-admin-navigation-dropdown.n-dropdown-menu\n    .n-dropdown-option[aria-current='page']\n    .n-dropdown-option-body:not(.n-dropdown-option-body--disabled)::before",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['background-color', 'var(--ui-color-action-primary)', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@media (forced-colors: active)'],
    selector:
      "[data-pavp-admin-navigation='persistent']\n    .n-menu-item-content--selected\n    :is(.n-menu-item-content__icon, .n-menu-item-content__arrow, .n-menu-item-content-header),\n  .pavp-admin-shell[data-navigation-collapsed='true']\n    [data-pavp-admin-navigation='persistent']\n    .n-menu-item-content--child-active\n    :is(.n-menu-item-content__icon, .n-menu-item-content__arrow, .n-menu-item-content-header),\n  .pavp-admin-navigation-dropdown.n-dropdown-menu\n    .n-dropdown-option[aria-current='page']\n    .n-dropdown-option-body:not(.n-dropdown-option-body--disabled)\n    :is(.n-dropdown-option-body__prefix, .n-dropdown-option-body__label)",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['color', 'var(--ui-color-text-on-action)', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@media (prefers-reduced-transparency: reduce)'],
    selector:
      "[data-pavp-admin-navigation='persistent'] .n-layout-sider,\n  .pavp-admin-navigation-dropdown",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['-webkit-backdrop-filter', 'none', false],
      ['backdrop-filter', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: [],
    selector: '.pavp-scroll-area',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['position', 'relative', false],
      ['block-size', '100%', false],
      ['min-block-size', '0', false],
      ['min-inline-size', '0', false],
      ['overflow', 'hidden', false],
      ['overscroll-behavior', 'contain', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: [],
    selector: ".pavp-scroll-area[data-enabled='false']",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['block-size', 'auto', false],
      ['overflow', 'visible', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: [],
    selector: '.pavp-scroll-area__viewport',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['block-size', '100%', false],
      ['min-block-size', '0', false],
      ['min-inline-size', '0', false],
      ['overscroll-behavior', 'contain', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: [],
    selector: ".pavp-scroll-area[data-horizontal='true'] .pavp-scroll-area__viewport",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['overflow', 'auto hidden', false]],
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: [],
    selector: ".pavp-scroll-area[data-enabled='false'] .pavp-scroll-area__viewport",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['block-size', 'auto', false],
      ['overflow', 'visible', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: [],
    selector: '.pavp-scroll-area__content',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['display', 'flow-root', false],
      ['min-inline-size', '100%', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector: '.pavp-scroll-area__viewport',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['scrollbar-color', 'ButtonText Canvas', false]],
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 1,
    context: [],
    selector: ':where(.pavp-scroll-area__viewport)',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['overflow', 'hidden auto', false],
      ['scrollbar-width', 'thin', false],
      ['scrollbar-color', 'var(--ui-color-text-secondary) var(--ui-color-surface-panel)', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 1,
    context: [],
    selector: '.pavp-scroll-area .os-theme-pavp',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['--os-size', 'calc(var(--ui-space-content-gap) / 2)', false],
      ['--os-track-border-radius', 'var(--ui-radius-panel)', false],
      ['--os-track-bg', 'var(--ui-color-surface-panel)', false],
      ['--os-track-bg-hover', 'var(--ui-color-surface-panel)', false],
      ['--os-track-bg-active', 'var(--ui-color-surface-panel)', false],
      ['--os-handle-border-radius', 'var(--ui-radius-panel)', false],
      ['--os-handle-bg', 'var(--ui-color-text-secondary)', false],
      ['--os-handle-bg-hover', 'var(--ui-color-text-primary)', false],
      ['--os-handle-bg-active', 'var(--ui-color-text-primary)', false],
      ['--os-handle-interactive-area-offset', 'calc(var(--ui-space-content-gap) / 2)', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 1,
    context: [],
    selector: ".pavp-scroll-area[data-horizontal='true'] .os-theme-pavp",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['--os-size', 'calc(var(--ui-space-content-gap) / 6)', false],
      ['--os-handle-interactive-area-offset', 'calc(var(--ui-space-content-gap) * 5 / 6)', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 1,
    context: ['@media (forced-colors: active)'],
    selector: '.pavp-scroll-area .os-theme-pavp',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['--os-track-bg', 'Canvas', false],
      ['--os-track-bg-hover', 'Canvas', false],
      ['--os-track-bg-active', 'Canvas', false],
      ['--os-handle-bg', 'ButtonText', false],
      ['--os-handle-bg-hover', 'Highlight', false],
      ['--os-handle-bg-active', 'Highlight', false],
      ['forced-color-adjust', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector: '.pavp-workspace-tabs-region:dir(rtl)',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['padding-inline-start', 'var(--pavp-safe-area-right)', false],
      ['padding-inline-end', 'var(--pavp-safe-area-left)', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector: '.pavp-workspace-tabs-edge__surface',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['position', 'absolute', false],
      ['inset', '0', false],
      [
        'background',
        'color-mix(in srgb, var(--ui-admin-navigation-selected) 10%, transparent)',
        false,
      ],
      ['opacity', '0', false],
      ['pointer-events', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector: '.pavp-workspace-tabs-edge__icon:dir(rtl)',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'scaleX(-1)', false]],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector: '.pavp-workspace-tabs-edge:disabled .pavp-workspace-tabs-edge__surface',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['visibility', 'hidden', false]],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector:
      ".pavp-workspace-tabs-region:not([data-motion='none']) .pavp-workspace-tabs-edge:enabled",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['transition', 'color var(--ui-motion-duration) var(--ui-motion-easing)', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector:
      ".pavp-workspace-tabs-region[data-motion='reduced'] .pavp-workspace-tabs-edge:enabled",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transition-duration', 'calc(var(--ui-motion-duration) / 2)', false]],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector: '.pavp-workspace-tabs',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      [
        '--workspace-hover-surface',
        'color-mix(\n    in srgb,\n    var(--ui-admin-navigation-selected) 6%,\n    transparent\n  )',
        false,
      ],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector: '.pavp-workspace-tabs__item::before',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['content', "''", false],
      ['position', 'absolute', false],
      ['inset', '0', false],
      ['border-block-start-width', 'var(--ui-admin-border-width)', false],
      ['border-block-start-style', 'solid', false],
      ['border-block-start-color', 'var(--ui-color-border-default)', false],
      ['border-inline-end-width', 'var(--ui-admin-border-width)', false],
      ['border-inline-end-style', 'solid', false],
      ['border-inline-end-color', 'var(--ui-color-border-default)', false],
      ['opacity', '0.4', false],
      ['pointer-events', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector: '.pavp-workspace-tabs__hover',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['position', 'absolute', false],
      ['inset', '0', false],
      ['z-index', 'var(--ui-z-base)', false],
      ['border-radius', 'inherit', false],
      ['background', 'var(--workspace-hover-surface)', false],
      ['opacity', '0', false],
      ['pointer-events', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector: ".pavp-workspace-tabs__item[data-active='true']",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      [
        '--workspace-hover-surface',
        'color-mix(\n    in srgb,\n    var(--ui-admin-navigation-selected) 8%,\n    transparent\n  )',
        false,
      ],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector: '.pavp-workspace-tabs__lens',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['position', 'absolute', false],
      ['inset', '0', false],
      ['z-index', 'var(--ui-z-base)', false],
      ['border-radius', 'inherit', false],
      [
        'background',
        'color-mix(\n    in srgb,\n    var(--ui-admin-navigation-selected) 12%,\n    var(--ui-color-surface-panel)\n  )',
        false,
      ],
      ['pointer-events', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector: '.pavp-workspace-tabs__lens::before',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['content', "''", false],
      ['position', 'absolute', false],
      ['inset', '0', false],
      ['box-shadow', 'var(--ui-admin-shadow-control)', false],
      ['opacity', '0.4', false],
      ['pointer-events', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector: '.pavp-workspace-tabs__lens::after',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['content', "''", false],
      ['position', 'absolute', false],
      ['inset-inline', '0', false],
      ['inset-block-end', '0', false],
      ['block-size', 'var(--ui-admin-focus-width)', false],
      ['background', 'var(--ui-admin-navigation-selected)', false],
      ['pointer-events', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector:
      ".pavp-workspace-tabs__item[data-closable='true']\n  .pavp-workspace-tabs__tab\n  .pavp-workspace-tabs__hover",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      [
        'inset-inline-end',
        'calc(var(--ui-layout-target-enhanced-minimum-inline-size) * -1)',
        false,
      ],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector: '.pavp-workspace-tabs__close-mark',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['position', 'absolute', false],
      ['inset-block', '0', false],
      ['inset-inline-start', 'calc((100% - var(--ui-font-size-body)) / 2)', false],
      ['margin-block', 'auto', false],
      ['inline-size', 'var(--ui-font-size-body)', false],
      ['block-size', 'var(--ui-font-size-body)', false],
      ['pointer-events', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector: '.pavp-workspace-tabs__close-mark::before,\n.pavp-workspace-tabs__close-mark::after',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['content', "''", false],
      ['position', 'absolute', false],
      ['inset-block-start', 'calc(50% - var(--ui-admin-border-width) / 2)', false],
      ['inset-inline', '0', false],
      ['border-block-start-width', 'var(--ui-admin-border-width)', false],
      ['border-block-start-style', 'solid', false],
      ['border-block-start-color', 'currentColor', false],
      ['transform', 'rotate(45deg)', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector: '.pavp-workspace-tabs__close-mark::after',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'rotate(-45deg)', false]],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector: ".pavp-workspace-tabs:not([data-motion='none']) button",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['transition', 'color var(--ui-motion-duration) var(--ui-motion-easing)', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    selector: ".pavp-workspace-tabs[data-motion='reduced'] button",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transition-duration', 'calc(var(--ui-motion-duration) / 2)', false]],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector: ".pavp-workspace-tabs [aria-selected='true']",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['outline', 'var(--ui-admin-border-width) solid Highlight', false],
      ['outline-offset', 'calc(var(--ui-admin-border-width) * -1)', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector:
      '.pavp-workspace-tabs button:focus-visible,\n  .pavp-workspace-tabs-edge:focus-visible',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['outline-color', 'Highlight', false]],
  },
  {
    path: 'apps/web/src/app/styles/layers.css',
    block: 0,
    context: ['@layer reset'],
    selector: '*,\n  *::before,\n  *::after',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['box-sizing', 'border-box', false]],
  },
  {
    path: 'apps/web/src/app/styles/layers.css',
    block: 0,
    context: ['@layer reset'],
    selector: 'html,\n  body,\n  #app',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['min-block-size', '100%', false],
      ['margin', '0', false],
    ],
  },
  {
    path: 'apps/web/src/app/styles/layers.css',
    block: 0,
    context: ['@layer base'],
    selector: 'body',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['color', 'var(--ui-color-text-primary)', false],
      ['background', 'var(--ui-color-surface-page)', false],
      ['font-family', 'var(--ui-font-family-body)', false],
      ['font-size', 'var(--ui-font-size-body)', false],
      ['line-height', 'var(--ui-font-line-height-body)', false],
    ],
  },
  {
    path: 'apps/web/src/app/styles/layers.css',
    block: 0,
    context: ['@layer base'],
    selector: 'button,\n  input,\n  select,\n  textarea',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['font', 'inherit', false]],
  },
  {
    path: 'apps/web/src/app/styles/layers.css',
    block: 0,
    context: ['@layer base'],
    selector: ':focus-visible',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['outline-color', 'var(--ui-color-focus-ring)', false]],
  },
  {
    path: 'apps/web/src/app/styles/layers.css',
    block: 0,
    context: [],
    selector:
      'html,\nbody,\n#app,\n#pavp-overlay-root,\n.pavp-route-content,\n.pavp-route-content > *,\n.pavp-admin-shell,\n.pavp-admin-shell__header,\n.pavp-admin-shell__sidebar,\n.pavp-admin-shell__content,\n.pavp-appearance-workspace,\n.pavp-appearance-preview-column',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['transform', 'none', false],
      ['translate', 'none', false],
    ],
  },
  {
    path: 'apps/web/src/app/styles/layers.css',
    block: 0,
    context: [],
    selector: '.pavp-route-content',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['opacity', '1', false]],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector: "[data-scroll-owner='architecture-console-content']",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['view-transition-name', 'root', false],
      ['visibility', 'visible', false],
      ['opacity', '1', false],
      ['transform', 'none', false],
      ['translate', 'none', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector: '.pavp-route-content',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['visibility', 'visible', false],
      ['opacity', '1', false],
      ['transform', 'none', false],
      ['translate', 'none', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector: "[data-scroll-owner='architecture-console-content']::view-transition",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['pointer-events', 'none', false]],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector: "[data-scroll-owner='architecture-console-content']::view-transition-group(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['animation', 'none', false],
      [
        'animation-duration',
        'calc(var(--ui-motion-duration) + var(--ui-motion-duration) / 2)',
        false,
      ],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "[data-scroll-owner='architecture-console-content']::view-transition-image-pair(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['overflow', 'clip', false],
      ['animation-duration', 'inherit', false],
      ['isolation', 'isolate', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "[data-scroll-owner='architecture-console-content']::view-transition-old(root),\n  [data-scroll-owner='architecture-console-content']::view-transition-new(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['animation-duration', 'inherit', false],
      ['animation-timing-function', 'var(--ui-motion-easing)', false],
      ['animation-delay', 'initial', false],
      ['animation-fill-mode', 'both', false],
      ['mix-blend-mode', 'plus-lighter', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector: "[data-scroll-owner='architecture-console-content']::view-transition-old(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['animation-name', 'pavp-route-content-crossfade-old', false]],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector: "[data-scroll-owner='architecture-console-content']::view-transition-new(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['animation-name', 'pavp-route-content-crossfade-new', false]],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "[data-scroll-owner='architecture-console-content']:active-view-transition-type(\n      pavp-route-content-crossfade\n    )::view-transition-old(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['animation-name', 'pavp-route-content-crossfade-old', false]],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "[data-scroll-owner='architecture-console-content']:active-view-transition-type(\n      pavp-route-content-crossfade\n    )::view-transition-new(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['animation-name', 'pavp-route-content-crossfade-new', false]],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "[data-scroll-owner='architecture-console-content'][data-pavp-route-transition-direction='forward']:active-view-transition-type(\n      pavp-route-drill-soft\n    )::view-transition-old(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['animation-name', 'pavp-route-drill-forward-old', false],
      ['transform-origin', 'center top', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "[data-scroll-owner='architecture-console-content'][data-pavp-route-transition-direction='forward']:active-view-transition-type(\n      pavp-route-drill-soft\n    )::view-transition-new(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['animation-name', 'pavp-route-drill-forward-new', false],
      ['transform-origin', 'center top', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "[data-scroll-owner='architecture-console-content'][data-pavp-route-transition-direction='reverse']:active-view-transition-type(\n      pavp-route-drill-soft\n    )::view-transition-old(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['animation-name', 'pavp-route-drill-reverse-old', false],
      ['transform-origin', 'center top', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "[data-scroll-owner='architecture-console-content'][data-pavp-route-transition-direction='reverse']:active-view-transition-type(\n      pavp-route-drill-soft\n    )::view-transition-new(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['animation-name', 'pavp-route-drill-reverse-new', false],
      ['transform-origin', 'center top', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "[data-scroll-owner='architecture-console-content'][data-pavp-route-transition-direction='forward']:active-view-transition-type(\n      pavp-route-sheet-soft\n    )::view-transition-old(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['animation-name', 'pavp-route-sheet-forward-old', false]],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "[data-scroll-owner='architecture-console-content'][data-pavp-route-transition-direction='forward']:active-view-transition-type(\n      pavp-route-sheet-soft\n    )::view-transition-new(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['animation-name', 'pavp-route-sheet-forward-new', false]],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "[data-scroll-owner='architecture-console-content'][data-pavp-route-transition-direction='reverse']:active-view-transition-type(\n      pavp-route-sheet-soft\n    )::view-transition-old(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['animation-name', 'pavp-route-sheet-reverse-old', false]],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "[data-scroll-owner='architecture-console-content'][data-pavp-route-transition-direction='reverse']:active-view-transition-type(\n      pavp-route-sheet-soft\n    )::view-transition-new(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['animation-name', 'pavp-route-sheet-reverse-new', false]],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "html:dir(ltr)\n    [data-scroll-owner='architecture-console-content'][data-pavp-route-transition-direction='forward']:active-view-transition-type(\n      pavp-route-axis-inline-soft\n    )::view-transition-old(root),\n  html:dir(rtl)\n    [data-scroll-owner='architecture-console-content'][data-pavp-route-transition-direction='reverse']:active-view-transition-type(\n      pavp-route-axis-inline-soft\n    )::view-transition-old(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['animation-name', 'pavp-route-axis-inline-old-toward-left', false]],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "html:dir(ltr)\n    [data-scroll-owner='architecture-console-content'][data-pavp-route-transition-direction='forward']:active-view-transition-type(\n      pavp-route-axis-inline-soft\n    )::view-transition-new(root),\n  html:dir(rtl)\n    [data-scroll-owner='architecture-console-content'][data-pavp-route-transition-direction='reverse']:active-view-transition-type(\n      pavp-route-axis-inline-soft\n    )::view-transition-new(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['animation-name', 'pavp-route-axis-inline-new-from-right', false]],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "html:dir(ltr)\n    [data-scroll-owner='architecture-console-content'][data-pavp-route-transition-direction='reverse']:active-view-transition-type(\n      pavp-route-axis-inline-soft\n    )::view-transition-old(root),\n  html:dir(rtl)\n    [data-scroll-owner='architecture-console-content'][data-pavp-route-transition-direction='forward']:active-view-transition-type(\n      pavp-route-axis-inline-soft\n    )::view-transition-old(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['animation-name', 'pavp-route-axis-inline-old-toward-right', false]],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "html:dir(ltr)\n    [data-scroll-owner='architecture-console-content'][data-pavp-route-transition-direction='reverse']:active-view-transition-type(\n      pavp-route-axis-inline-soft\n    )::view-transition-new(root),\n  html:dir(rtl)\n    [data-scroll-owner='architecture-console-content'][data-pavp-route-transition-direction='forward']:active-view-transition-type(\n      pavp-route-axis-inline-soft\n    )::view-transition-new(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['animation-name', 'pavp-route-axis-inline-new-from-left', false]],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "html:root[data-motion='reduced'][data-motion='reduced']\n    [data-scroll-owner='architecture-console-content']::view-transition-group(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['animation-duration', 'var(--ui-motion-duration)', false]],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "html:root[data-motion='reduced'][data-motion='reduced']\n    [data-scroll-owner='architecture-console-content']::view-transition-old(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['animation-name', 'pavp-route-content-crossfade-old', false],
      ['transform', 'none', false],
      ['translate', 'none', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "html:root[data-motion='reduced'][data-motion='reduced']\n    [data-scroll-owner='architecture-console-content']::view-transition-new(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['animation-name', 'pavp-route-content-crossfade-new', false],
      ['transform', 'none', false],
      ['translate', 'none', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "html:root[data-motion='none'][data-motion='none']\n    [data-scroll-owner='architecture-console-content']::view-transition-group(root),\n  html:root[data-motion='none'][data-motion='none']\n    [data-scroll-owner='architecture-console-content']::view-transition-image-pair(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['animation', 'none', false]],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "html:root[data-motion='none'][data-motion='none']\n    [data-scroll-owner='architecture-console-content']::view-transition-old(root),\n  html:root[data-motion='none'][data-motion='none']\n    [data-scroll-owner='architecture-console-content']::view-transition-new(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['animation', 'none', false],
      ['transition', 'none', false],
      ['transform', 'none', false],
      ['translate', 'none', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "html:root[data-motion='none'][data-motion='none']\n    [data-scroll-owner='architecture-console-content']::view-transition-old(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['visibility', 'hidden', false],
      ['opacity', '0', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    selector:
      "html:root[data-motion='none'][data-motion='none']\n    [data-scroll-owner='architecture-console-content']::view-transition-new(root)",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['visibility', 'visible', false],
      ['opacity', '1', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-content-crossfade-old'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '1', false],
      ['transform', 'none', false],
      ['translate', 'none', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-content-crossfade-old'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '0', false],
      ['transform', 'none', false],
      ['translate', 'none', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-content-crossfade-new'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '0', false],
      ['transform', 'none', false],
      ['translate', 'none', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-content-crossfade-new'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '1', false],
      ['transform', 'none', false],
      ['translate', 'none', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-axis-inline-old-toward-left'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '1', false],
      ['translate', '0 0', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-axis-inline-old-toward-left'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '0', false],
      ['translate', 'calc(var(--ui-space-content-gap) * -1) 0', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-axis-inline-new-from-right'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '0', false],
      ['translate', 'var(--ui-space-content-gap) 0', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-axis-inline-new-from-right'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '1', false],
      ['translate', '0 0', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-axis-inline-old-toward-right'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '1', false],
      ['translate', '0 0', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-axis-inline-old-toward-right'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '0', false],
      ['translate', 'var(--ui-space-content-gap) 0', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-axis-inline-new-from-left'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '0', false],
      ['translate', 'calc(var(--ui-space-content-gap) * -1) 0', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-axis-inline-new-from-left'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '1', false],
      ['translate', '0 0', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-drill-forward-old'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '1', false],
      ['transform', 'scale(1)', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-drill-forward-old'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '0', false],
      ['transform', 'scale(0.985)', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-drill-forward-new'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '0', false],
      ['transform', 'scale(1.015)', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-drill-forward-new'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '1', false],
      ['transform', 'scale(1)', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-drill-reverse-old'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '1', false],
      ['transform', 'scale(1)', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-drill-reverse-old'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '0', false],
      ['transform', 'scale(1.015)', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-drill-reverse-new'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '0', false],
      ['transform', 'scale(0.985)', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-drill-reverse-new'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '1', false],
      ['transform', 'scale(1)', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-sheet-forward-old'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '1', false],
      ['translate', 'none', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-sheet-forward-old'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '0', false],
      ['translate', 'none', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-sheet-forward-new'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '0', false],
      ['translate', '0 var(--ui-space-content-gap)', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-sheet-forward-new'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '1', false],
      ['translate', '0 0', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-sheet-reverse-old'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '1', false],
      ['translate', '0 0', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-sheet-reverse-old'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '0', false],
      ['translate', '0 var(--ui-space-content-gap)', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-sheet-reverse-new'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '0', false],
      ['translate', 'none', false],
    ],
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app', '@keyframes pavp-route-sheet-reverse-new'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['opacity', '1', false],
      ['translate', 'none', false],
    ],
  },
]

export const keyframeOwners: readonly {
  readonly path: string
  readonly block: number
  readonly context: readonly string[]
  readonly name: string
  readonly family: 'appearance-preview' | 'admin-ambient' | 'route-transition'
}[] = [
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    name: 'pavp-setting-commit',
    family: 'appearance-preview',
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    name: 'pavp-setting-commit-reduced',
    family: 'appearance-preview',
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    name: 'pavp-appearance-indicator-enter',
    family: 'appearance-preview',
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    name: 'pavp-appearance-indicator-enter-reduced',
    family: 'appearance-preview',
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    name: 'pavp-appearance-content-enter',
    family: 'appearance-preview',
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    name: 'pavp-appearance-content-enter-reduced',
    family: 'appearance-preview',
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: [],
    name: 'pavp-admin-ambient-drift',
    family: 'admin-ambient',
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    name: 'pavp-route-content-crossfade-old',
    family: 'route-transition',
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    name: 'pavp-route-content-crossfade-new',
    family: 'route-transition',
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    name: 'pavp-route-axis-inline-old-toward-left',
    family: 'route-transition',
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    name: 'pavp-route-axis-inline-new-from-right',
    family: 'route-transition',
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    name: 'pavp-route-axis-inline-old-toward-right',
    family: 'route-transition',
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    name: 'pavp-route-axis-inline-new-from-left',
    family: 'route-transition',
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    name: 'pavp-route-drill-forward-old',
    family: 'route-transition',
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    name: 'pavp-route-drill-forward-new',
    family: 'route-transition',
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    name: 'pavp-route-drill-reverse-old',
    family: 'route-transition',
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    name: 'pavp-route-drill-reverse-new',
    family: 'route-transition',
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    name: 'pavp-route-sheet-forward-old',
    family: 'route-transition',
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    name: 'pavp-route-sheet-forward-new',
    family: 'route-transition',
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    name: 'pavp-route-sheet-reverse-old',
    family: 'route-transition',
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: ['@layer app'],
    name: 'pavp-route-sheet-reverse-new',
    family: 'route-transition',
  },
]

export const styleAtRuleOwners: readonly {
  readonly path: string
  readonly block: number
  readonly context: readonly string[]
  readonly name: string
  readonly params: string
  readonly occurrences?: number
}[] = [
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    name: 'media',
    params: '(prefers-reduced-motion: reduce)',
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    name: 'media',
    params: '(prefers-reduced-transparency: reduce)',
  },
  {
    path: 'apps/web/src/pages/appearance.vue',
    block: 0,
    context: [],
    name: 'media',
    params: '(forced-colors: active)',
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: [],
    name: 'media',
    params: '(forced-colors: active)',
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveConfigProvider.vue',
    block: 0,
    context: [],
    name: 'media',
    params: '(forced-colors: active)',
    occurrences: 4,
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: [],
    name: 'media',
    params: '(forced-colors: active)',
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: [],
    name: 'media',
    params: '(prefers-reduced-transparency: reduce)',
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    name: 'media',
    params: '(forced-colors: active)',
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    name: 'media',
    params: '(prefers-reduced-transparency: reduce)',
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: [],
    name: 'media',
    params: '(forced-colors: active)',
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 1,
    context: [],
    name: 'media',
    params: '(forced-colors: active)',
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: [],
    name: 'media',
    params: '(forced-colors: active)',
  },
  {
    path: 'apps/web/src/app/styles/layers.css',
    block: 0,
    context: [],
    name: 'layer',
    params: 'reset',
  },
  {
    path: 'apps/web/src/app/styles/layers.css',
    block: 0,
    context: [],
    name: 'layer',
    params: 'base',
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: [],
    name: 'layer',
    params: 'app',
  },
  {
    path: 'apps/web/src/app/styles/layers.css',
    block: 0,
    context: [],
    name: 'layer',
    params: 'reset, tokens, base, utilities, components, app, overrides',
  },
  {
    path: 'apps/web/src/app/styles/layers.css',
    block: 0,
    context: [],
    name: 'import',
    params: "'@platform/design-system/tokens.css'",
  },
  {
    path: 'apps/web/src/app/styles/layers.css',
    block: 0,
    context: [],
    name: 'import',
    params: "'../router/route-transition/route-transition.css'",
  },
]

export const privateStyleVariables = [
  {
    name: '--n-label-padding',
    source: 'vendor-adapter',
    valueKind: 'dimension',
    writer: 'packages/ui/src/components/UiRadioCardGroup.vue',
  },
  {
    name: '--pavp-safe-area-top',
    source: 'browser-env',
    valueKind: 'dimension',
    writer: 'packages/ui/src/components/UiAdminShell.vue',
  },
  {
    name: '--pavp-safe-area-right',
    source: 'browser-env',
    valueKind: 'dimension',
    writer: 'packages/ui/src/components/UiAdminShell.vue',
  },
  {
    name: '--pavp-safe-area-bottom',
    source: 'browser-env',
    valueKind: 'dimension',
    writer: 'packages/ui/src/components/UiAdminShell.vue',
  },
  {
    name: '--pavp-safe-area-left',
    source: 'browser-env',
    valueKind: 'dimension',
    writer: 'packages/ui/src/components/UiAdminShell.vue',
  },
  {
    name: '--os-size',
    source: 'vendor-adapter',
    valueKind: 'dimension',
    writer: 'packages/ui/src/components/UiScrollArea.vue',
  },
  {
    name: '--os-track-border-radius',
    source: 'vendor-adapter',
    valueKind: 'dimension',
    writer: 'packages/ui/src/components/UiScrollArea.vue',
  },
  {
    name: '--os-track-bg',
    source: 'vendor-adapter',
    valueKind: 'color',
    writer: 'packages/ui/src/components/UiScrollArea.vue',
  },
  {
    name: '--os-track-bg-hover',
    source: 'vendor-adapter',
    valueKind: 'color',
    writer: 'packages/ui/src/components/UiScrollArea.vue',
  },
  {
    name: '--os-track-bg-active',
    source: 'vendor-adapter',
    valueKind: 'color',
    writer: 'packages/ui/src/components/UiScrollArea.vue',
  },
  {
    name: '--os-handle-border-radius',
    source: 'vendor-adapter',
    valueKind: 'dimension',
    writer: 'packages/ui/src/components/UiScrollArea.vue',
  },
  {
    name: '--os-handle-bg',
    source: 'vendor-adapter',
    valueKind: 'color',
    writer: 'packages/ui/src/components/UiScrollArea.vue',
  },
  {
    name: '--os-handle-bg-hover',
    source: 'vendor-adapter',
    valueKind: 'color',
    writer: 'packages/ui/src/components/UiScrollArea.vue',
  },
  {
    name: '--os-handle-bg-active',
    source: 'vendor-adapter',
    valueKind: 'color',
    writer: 'packages/ui/src/components/UiScrollArea.vue',
  },
  {
    name: '--os-handle-interactive-area-offset',
    source: 'vendor-adapter',
    valueKind: 'dimension',
    writer: 'packages/ui/src/components/UiScrollArea.vue',
  },
  {
    name: '--workspace-hover-surface',
    source: 'private-interaction',
    valueKind: 'color',
    writer: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
  },
  {
    name: '--pavp-appearance-swatch',
    source: 'runtime-theme-preview',
    valueKind: 'color',
    writer: 'apps/web/src/pages/appearance.vue',
  },
  {
    name: '--n-item-color-active-collapsed',
    source: 'naive-theme-bridge',
    valueKind: 'color',
    writer: 'packages/ui/src/adapters/naive/pavp-naive-theme.ts',
  },
  {
    name: '--n-option-color-active',
    source: 'naive-theme-bridge',
    valueKind: 'color',
    writer: 'packages/ui/src/adapters/naive/pavp-naive-theme.ts',
  },
] as const

// These are reads in the current Naive bridge, not admitted extension writers.
// Neither variable has a repository writer; the canonical fallback is effective.
export const unresolvedStyleInputs = [
  {
    name: '--pavp-scrollbar-color',
    reader: 'packages/ui/src/adapters/naive/pavp-naive-theme.ts',
    property: 'color',
    fallback: '--ui-color-border-default',
    writer: null,
  },
  {
    name: '--pavp-scrollbar-hover',
    reader: 'packages/ui/src/adapters/naive/pavp-naive-theme.ts',
    property: 'colorHover',
    fallback: '--ui-color-text-secondary',
    writer: null,
  },
] as const
