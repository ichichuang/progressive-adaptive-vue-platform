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
    'i-lucide-ruler',
    'i-lucide-type',
    'i-lucide-sparkles',
  ],
} as const

export const vueStyleOwners: Readonly<Record<string, readonly StyleBlockOwner[]>> = {
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
  'packages/ui/src/providers/UiProvider.vue': [
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
  'apps/web/src/app/workbench/workbench.css': 'RUNTIME_STYLE_OWNER',
  'apps/web/src/app/router/route-transition/route-transition.css': 'PRIVATE_INTERACTION_MOTION',
  ...Object.fromEntries(
    generatedStyleOwners.map((owner) => [owner.path, 'GENERATED_STYLE_OWNER' as const]),
  ),
}

// Exact selector/context/property responsibilities. Existing private optical, gesture,
// scale and vendor !important values are local to these declarations, never file grants.
export const ownedStyleContracts: readonly OwnedStyleContract[] = [
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: [],
    selector: '.pavp-admin-shell__layout',
    declarations: [
      ['z-index', 'var(--ui-z-base)', false],
      ['flex', '1 1 0%', false],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: [],
    selector: '.pavp-admin-shell__sidebar',
    declarations: [['z-index', 'var(--ui-z-overlay)', false]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveFormField.vue',
    block: 0,
    context: ['@layer vendor-overrides'],
    selector: '.pavp-form-field .n-form-item-feedback--error',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['background-color', 'var(--ui-color-status-error)', false]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveFormField.vue',
    block: 0,
    context: ['@layer vendor-overrides'],
    selector: '.pavp-form-field .n-form-item-label',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['white-space', 'normal', false]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveFormField.vue',
    block: 0,
    context: [],
    selector: '.pavp-form-field .n-form-item-label',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['transition', 'none', false]],
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveFormControl.vue',
    block: 0,
    context: ['@layer components'],
    selector:
      '.pavp-form-control .n-switch,\n.pavp-form-control [data-form-readonly],\n.pavp-form-control button',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['min-block-size', 'var(--ui-layout-target-enhanced-minimum-block-size)', false],
      ['min-inline-size', 'var(--ui-layout-target-enhanced-minimum-inline-size)', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@layer components'],
    selector: '.pavp-admin-shell',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['block-size', '100vh', false],
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
    context: ['@layer components', '@supports (height: 100dvh)'],
    selector: '.pavp-admin-shell',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['block-size', '100dvh', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@layer components'],
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
    context: ['@layer components'],
    selector: '.pavp-admin-shell__navigation-action::after',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['position', 'absolute', false],
      ['block-size', 'calc(var(--ui-space-content-gap) / 2)', false],
      ['inline-size', 'calc(var(--ui-space-content-gap) / 2)', false],
      ['border-radius', 'var(--ui-radius-small)', false],
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
    context: ['@layer components'],
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
    context: ['@layer components'],
    selector: '.pavp-admin-shell__header',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      [
        'min-block-size',
        'calc(var(--ui-layout-admin-header-block-size) + var(--pavp-safe-area-top))',
        false,
      ],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@layer components'],
    selector: ".pavp-admin-shell[data-header='false'] .pavp-admin-shell__content-inner",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      [
        'padding-block-start',
        'max(var(--ui-space-section-block), var(--pavp-safe-area-top))',
        false,
      ],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@layer components'],
    selector: '.pavp-admin-shell__content',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['overscroll-behavior', 'contain', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@layer components'],
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
    context: ['@layer components'],
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
    context: ['@layer components'],
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
    context: ['@layer components', '@keyframes pavp-admin-ambient-drift'],
    selector: 'from',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'translateX(calc(var(--ui-space-content-gap) * -1))', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@layer components', '@keyframes pavp-admin-ambient-drift'],
    selector: 'to',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'translateX(var(--ui-space-content-gap))', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@layer components', '@media (forced-colors: active)'],
    selector: '.pavp-admin-shell::before',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['display', 'none', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@layer components', '@media (prefers-reduced-transparency: reduce)'],
    selector: '.pavp-admin-shell::before',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['opacity', '0', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@layer components', '@media (prefers-reduced-transparency: reduce)'],
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
    context: ['@layer vendor-overrides'],
    selector: "[data-pavp-admin-navigation='persistent'] .n-menu-item:focus-visible",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['border-radius', 'var(--ui-radius-control)', false],
      ['box-shadow', 'var(--ui-admin-shadow-focus-ring)', false],
      ['outline', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer components'],
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
    context: ['@layer vendor-overrides'],
    selector:
      "[data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,\n.pavp-admin-navigation-dropdown .n-dropdown-option-body::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['opacity', '0', false],
      ['transform', 'none', false],
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
      ['transition-duration', 'var(--ui-motion-duration)', false],
      ['transition-property', 'background-color, opacity', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer vendor-overrides'],
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
    context: ['@layer vendor-overrides'],
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
    context: ['@layer components'],
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
      "[data-pavp-admin-navigation='persistent']\n  .n-menu-item-content:not(.n-menu-item-content--selected):not(.n-menu-item-content--child-active):active\n  :where(.n-menu-item-content__icon, .n-menu-item-content__arrow, .n-menu-item-content-header)",
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
    context: ['@layer components'],
    selector: '.pavp-admin-navigation-selection-lens',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['position', 'absolute', false],
      ['inset-block', '0', false],
      ['inset-inline', 'calc(var(--ui-space-content-gap) / 2)', false],
      ['border-radius', 'var(--ui-radius-control)', false],
      ['background', 'var(--n-item-color-active)', false],
      ['pointer-events', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer vendor-overrides'],
    selector:
      "html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,\nhtml[data-motion='reduced']\n  .pavp-admin-navigation-dropdown\n  .n-dropdown-option\n  .n-dropdown-option-body::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['transform', 'none', false],
      ['transition-timing-function', 'var(--ui-motion-easing)', false],
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
      ['transition-duration', 'var(--ui-motion-duration)', false],
      ['transition-property', 'background-color, opacity', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer vendor-overrides'],
    selector:
      "html[data-motion='none'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,\nhtml[data-motion='none']\n  .pavp-admin-navigation-dropdown\n  .n-dropdown-option\n  .n-dropdown-option-body::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['animation', 'none', false],
      ['transform', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      "html[data-motion='none'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,\nhtml[data-motion='none']\n  .pavp-admin-navigation-dropdown\n  .n-dropdown-option\n  .n-dropdown-option-body::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['transition', 'none', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer vendor-overrides'],
    selector:
      ".pavp-admin-shell[data-navigation-collapsed='false']\n  [data-pavp-admin-navigation='persistent']\n  .n-menu\n  > .n-submenu\n  > .n-menu-item-content:where(.n-menu-item-content--hover, :hover)::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['visibility', 'visible', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer vendor-overrides'],
    selector:
      ".pavp-admin-shell[data-navigation-collapsed='false']\n  [data-pavp-admin-navigation='persistent']\n  .n-menu\n  > .n-submenu\n  > .n-menu-item-content:where(:not(.n-menu-item-content--hover):not(:hover))::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['visibility', 'hidden', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer vendor-overrides'],
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
    context: ['@layer vendor-overrides'],
    selector:
      ".pavp-admin-shell[data-navigation-collapsed='false']\n  [data-pavp-admin-navigation-motion-ready='true']\n  .n-menu-item-content--selected::before,\n.pavp-admin-shell[data-navigation-collapsed='true']\n  [data-pavp-admin-navigation-motion-ready='true']\n  .n-menu-item-content.n-menu-item-content--child-active::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [
      ['opacity', '1', false],
      ['transform', 'none', false],
      ['visibility', 'hidden', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    selector:
      ".pavp-admin-shell[data-navigation-collapsed='false']\n  [data-pavp-admin-navigation-motion-ready='true']\n  .n-menu-item-content--selected::before,\n.pavp-admin-shell[data-navigation-collapsed='true']\n  [data-pavp-admin-navigation-motion-ready='true']\n  .n-menu-item-content.n-menu-item-content--child-active::before",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['transition', 'none', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer vendor-overrides'],
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
      '.pavp-admin-navigation-dropdown\n  .n-dropdown-option-body:not(.n-dropdown-option-body--active:not(.n-dropdown-option-body--disabled)):active\n  :where(.n-dropdown-option-body__prefix, .n-dropdown-option-body__label)',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['color', 'var(--ui-color-control-primary)', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer components'],
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
    context: ['@layer components'],
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
    selector: "html[data-material='reduced'] .pavp-admin-navigation-dropdown",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['box-shadow', 'none', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer components'],
    selector:
      "html[data-material='reduced'] .pavp-admin-shell__header,\nhtml[data-material='reduced'] .pavp-admin-shell__sidebar,\nhtml[data-material='reduced'] .pavp-admin-shell__drawer-navigation",
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['box-shadow', 'none', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer components'],
    selector:
      "html[data-motion='reduced'] .pavp-admin-shell::before,\nhtml[data-motion='none'] .pavp-admin-shell::before",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['animation', 'none', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer components'],
    selector:
      "html[data-motion='reduced']\n  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active\n  .pavp-admin-shell__drawer-navigation,\nhtml[data-motion='reduced']\n  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-active\n  .pavp-admin-shell__drawer-navigation,\nhtml[data-motion='reduced'] .pavp-admin-shell__sidebar,\nhtml[data-motion='reduced'] .pavp-admin-shell__action,\nhtml[data-motion='reduced'] .pavp-admin-shell__navigation-action,\nhtml[data-motion='reduced'] .pavp-admin-shell__navigation-action::after",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transition-duration', 'calc(var(--ui-motion-duration) / 2)', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer components'],
    selector:
      "html[data-motion='none']\n  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active\n  .pavp-admin-shell__drawer-navigation,\nhtml[data-motion='none']\n  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-active\n  .pavp-admin-shell__drawer-navigation,\nhtml[data-motion='none'] .pavp-admin-shell__sidebar,\nhtml[data-motion='none'] .pavp-admin-shell__action,\nhtml[data-motion='none'] .pavp-admin-shell__navigation-action,\nhtml[data-motion='none'] .pavp-admin-shell__navigation-action::after",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transition', 'none', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer components'],
    selector:
      "html[data-motion='reduced'] .pavp-admin-shell__action:active,\nhtml[data-motion='reduced'] .pavp-admin-shell__navigation-action:active",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'none', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer components'],
    selector:
      "html[data-motion='reduced']\n  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-from\n  .pavp-admin-shell__drawer-navigation,\nhtml[data-motion='reduced']\n  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-to\n  .pavp-admin-shell__drawer-navigation",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'translateX(calc(var(--ui-space-content-gap) * -1))', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer components'],
    selector:
      "html[data-motion='none']\n  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-from\n  .pavp-admin-shell__drawer-navigation,\nhtml[data-motion='none']\n  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-to\n  .pavp-admin-shell__drawer-navigation",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'none', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer components'],
    selector:
      "html[data-motion='none'] .pavp-admin-shell__action:active,\nhtml[data-motion='none'] .pavp-admin-shell__navigation-action:active",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'none', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer vendor-overrides', '@media (forced-colors: active)'],
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
    context: ['@layer components', '@media (forced-colors: active)'],
    selector: '.pavp-admin-navigation-selection-lens',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['visibility', 'hidden', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer vendor-overrides', '@media (forced-colors: active)'],
    selector:
      ".pavp-admin-shell[data-navigation-collapsed='false']\n  [data-pavp-admin-navigation-motion-ready='true']\n  .n-menu-item-content--selected::before,\n.pavp-admin-shell[data-navigation-collapsed='true']\n  [data-pavp-admin-navigation-motion-ready='true']\n  .n-menu-item-content.n-menu-item-content--child-active::before",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [['visibility', 'visible', false]],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer vendor-overrides', '@media (forced-colors: active)'],
    selector: "[data-pavp-admin-navigation='persistent'] .n-menu",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['--pavp-navigation-selected-surface', 'var(--ui-color-action-primary)', false],
      ['--pavp-navigation-selected-foreground', 'var(--ui-color-text-on-action)', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer vendor-overrides', '@media (forced-colors: active)'],
    selector:
      ".pavp-admin-navigation-dropdown.n-dropdown-menu:has(\n    .n-dropdown-option[aria-current='page']\n      > .n-dropdown-option-body:not(.n-dropdown-option-body--disabled)\n  )",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['--pavp-navigation-selected-surface', 'var(--ui-color-action-primary)', false],
      ['--pavp-navigation-selected-foreground', 'var(--ui-color-text-on-action)', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer vendor-overrides', '@media (forced-colors: active)'],
    selector: "[data-pavp-admin-navigation='persistent'] .n-menu.n-menu--collapsed",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['--pavp-navigation-child-active-foreground', 'var(--ui-color-text-on-action)', false],
    ],
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer vendor-overrides', '@media (prefers-reduced-transparency: reduce)'],
    selector:
      "[data-pavp-admin-navigation='persistent'] .n-layout-sider,\n  .pavp-admin-navigation-dropdown",
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['-webkit-backdrop-filter', 'none', false],
      ['backdrop-filter', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@layer components'],
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
    context: ['@layer components'],
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
    context: ['@layer components'],
    selector: '.pavp-workspace-tabs-edge__icon:dir(rtl)',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'scaleX(-1)', false]],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@layer components'],
    selector: '.pavp-workspace-tabs-edge:disabled .pavp-workspace-tabs-edge__surface',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['visibility', 'hidden', false]],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@layer components'],
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
    context: ['@layer components'],
    selector:
      ".pavp-workspace-tabs-region[data-motion='reduced'] .pavp-workspace-tabs-edge:enabled",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transition-duration', 'calc(var(--ui-motion-duration) / 2)', false]],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@layer components'],
    selector: '.pavp-workspace-tabs',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      [
        '--workspace-hover-surface',
        'color-mix(\n    in srgb,\n    var(--ui-admin-navigation-selected) 12%,\n    transparent\n  )',
        false,
      ],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@layer components'],
    selector: '.pavp-workspace-tabs__item::before',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['border-radius', 'inherit', false],
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
    context: ['@layer components'],
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
    context: ['@layer components'],
    selector:
      '.pavp-workspace-tabs__item:hover > .pavp-workspace-tabs__hover,\n.pavp-workspace-tabs__item:focus-within > .pavp-workspace-tabs__hover',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['opacity', '0.6', false]],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@layer components'],
    selector: '.pavp-workspace-tabs__item:has(> button:active) > .pavp-workspace-tabs__hover',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['opacity', '1', false]],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@layer components'],
    selector: ".pavp-workspace-tabs:not([data-motion='none']) .pavp-workspace-tabs__hover",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['transition', 'opacity var(--ui-motion-duration) var(--ui-motion-easing)', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@layer components'],
    selector: ".pavp-workspace-tabs[data-motion='reduced'] .pavp-workspace-tabs__hover",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transition-duration', 'calc(var(--ui-motion-duration) / 2)', false]],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@layer components'],
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
    context: ['@layer components'],
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
    context: ['@layer components'],
    selector: '.pavp-workspace-tabs__lens::before',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['content', "''", false],
      ['position', 'absolute', false],
      ['inset', '0', false],
      ['border-radius', 'inherit', false],
      ['box-shadow', 'var(--ui-admin-shadow-control)', false],
      ['opacity', '0.4', false],
      ['pointer-events', 'none', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@layer components'],
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
    context: ['@layer components'],
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
    context: ['@layer components'],
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
    context: ['@layer components'],
    selector: '.pavp-workspace-tabs__close-mark::after',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transform', 'rotate(-45deg)', false]],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@layer components'],
    selector: ".pavp-workspace-tabs:not([data-motion='none']) button",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['transition', 'color var(--ui-motion-duration) var(--ui-motion-easing)', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@layer components'],
    selector: ".pavp-workspace-tabs[data-motion='reduced'] button",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['transition-duration', 'calc(var(--ui-motion-duration) / 2)', false]],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@layer components', '@media (forced-colors: active)'],
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
    context: ['@layer components', '@media (forced-colors: active)'],
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
    context: ['@layer app'],
    selector:
      'html,\nbody,\n#app,\n#pavp-overlay-root,\n.pavp-route-content,\n.pavp-route-content > *,\n.pavp-admin-shell,\n.pavp-admin-shell__header,\n.pavp-admin-shell__sidebar,\n.pavp-admin-shell__content',
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
    declarations: [
      ['transform', 'none', false],
      ['translate', 'none', false],
    ],
  },
  {
    path: 'apps/web/src/app/styles/layers.css',
    block: 0,
    context: ['@layer app'],
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
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: [],
    selector: '.pavp-admin-shell__document-layout',
    responsibility: 'VENDOR_ADAPTER_OWNER',
    declarations: [['overflow', 'visible', false]],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@layer components'],
    selector: '.pavp-workspace-tabs__item',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [
      ['border-radius', 'var(--ui-radius-control) var(--ui-radius-control) 0 0', false],
    ],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@layer components'],
    selector: '.pavp-workspace-tabs .pavp-workspace-tabs__tab',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['border-radius', 'inherit', false]],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@layer components'],
    selector: ".pavp-workspace-tabs__item[data-closable='true'] .pavp-workspace-tabs__tab",
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['border-start-end-radius', '0', false]],
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@layer components'],
    selector: '.pavp-workspace-tabs .pavp-workspace-tabs__close',
    responsibility: 'PRIVATE_INTERACTION_MOTION',
    declarations: [['border-radius', 'var(--ui-radius-small)', false]],
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-page,\n  .wb-settings-content,\n  .wb-settings-section-body',
    declarations: [['gap', 'var(--ui-space-section-block)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-mode-scene-sidebar > span',
    declarations: [
      ['block-size', 'var(--ui-border-width)', false],
      ['background', 'var(--pavp-mode-preview-border)', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-mode-scene-tiles > span',
    declarations: [
      ['block-size', 'var(--ui-control-height)', false],
      ['background', 'var(--pavp-mode-preview-action)', false],
      ['border-radius', 'var(--ui-radius-control)', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-border-sample,\n  .wb-radius-sample,\n  .wb-shadow-sample,\n  .wb-layer-sample',
    declarations: [
      ['inline-size', '50%', false],
      ['block-size', '50%', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-layer-sample > span',
    declarations: [
      ['inline-size', '75%', false],
      ['block-size', '75%', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-api',
    declarations: [
      [
        'grid-template-columns',
        'repeat(\n      auto-fit,\n      minmax(min(100%, var(--ui-workbench-api-content-block-size)), 1fr)\n    )',
        false,
      ],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-clock-plane',
    declarations: [
      ['grid-template-rows', 'auto 1fr auto', false],
      ['min-block-size', 'var(--ui-workbench-api-content-block-size)', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-clock',
    declarations: [['font-size', 'var(--ui-workbench-display-font-size)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-payload',
    declarations: [['block-size', 'var(--ui-workbench-api-payload-block-size)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-feedback',
    declarations: [
      ['block-size', 'var(--ui-workbench-feedback-minimum-block-size)', false],
      ['overflow', 'auto', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-capability-content',
    declarations: [['grid-template-columns', 'auto minmax(0, 1fr) auto', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-capability-links',
    declarations: [
      [
        'grid-template-columns',
        'repeat(\n      auto-fit,\n      minmax(min(100%, var(--ui-workbench-specimen-minimum-inline-size)), 1fr)\n    )',
        false,
      ],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-specimen-grid',
    declarations: [
      [
        'grid-template-columns',
        'repeat(\n      auto-fit,\n      minmax(min(100%, var(--ui-workbench-specimen-minimum-inline-size)), 1fr)\n    )',
        false,
      ],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-specimen',
    declarations: [
      ['grid-template-rows', 'var(--ui-workbench-specimen-preview-block-size) 1fr auto', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-specimen-copy',
    declarations: [
      ['block-size', 'var(--ui-workbench-feedback-minimum-block-size)', false],
      ['overflow', 'auto', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-color-sample',
    declarations: [['background', 'var(--pavp-specimen-value)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-foreground-sample',
    declarations: [
      ['color', 'var(--pavp-specimen-value)', false],
      ['background', 'var(--pavp-specimen-background)', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: "[data-kind='border'] .wb-border-sample",
    declarations: [['border', 'var(--ui-border-width) solid var(--pavp-specimen-value)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: "[data-kind='focus'] .wb-border-sample",
    declarations: [['outline', 'var(--ui-border-width) solid var(--pavp-specimen-value)', false]],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-radius-sample',
    declarations: [['border-radius', 'var(--pavp-specimen-value)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-shadow-sample',
    declarations: [['box-shadow', 'var(--pavp-specimen-value)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: "[data-kind='inline-size'] .wb-size-sample > span",
    declarations: [
      ['inline-size', 'min(100%, var(--pavp-specimen-value))', false],
      ['block-size', 'var(--ui-space-content-gap)', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: "[data-kind='block-size'] .wb-size-sample > span",
    declarations: [
      ['block-size', 'min(100%, var(--pavp-specimen-value))', false],
      ['inline-size', 'var(--ui-space-content-gap)', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: "[data-kind='family'] .wb-type-sample",
    declarations: [['font-family', 'var(--pavp-specimen-value)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: "[data-kind='size'] .wb-type-sample",
    declarations: [['font-size', 'var(--pavp-specimen-value)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: "[data-kind='weight'] .wb-type-sample",
    declarations: [['font-weight', 'var(--pavp-specimen-value)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: "[data-kind='line-height'] .wb-type-sample",
    declarations: [['line-height', 'var(--pavp-specimen-value)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-layer-sample > span:last-child',
    declarations: [
      ['inset-inline-end', '0', false],
      ['inset-block-end', '0', false],
      ['z-index', 'var(--pavp-specimen-value)', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-motion-dot',
    declarations: [['transition', 'none', false]],
    responsibility: 'PRIVATE_INTERACTION_MOTION',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-specimen:hover .wb-motion-dot',
    declarations: [['transform', 'translateX(var(--ui-workbench-motion-travel))', false]],
    responsibility: 'PRIVATE_INTERACTION_MOTION',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-interaction-grid',
    declarations: [
      [
        'grid-template-columns',
        'repeat(\n      auto-fit,\n      minmax(min(100%, var(--ui-workbench-specimen-minimum-inline-size)), 1fr)\n    )',
        false,
      ],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-motion-stage',
    declarations: [['min-block-size', 'var(--ui-workbench-specimen-preview-block-size)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: ".wb-motion-stage[data-replayed='true'] .wb-motion-object",
    declarations: [['transform', 'translateX(var(--ui-workbench-motion-travel))', false]],
    responsibility: 'PRIVATE_INTERACTION_MOTION',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-scroll-example',
    declarations: [['block-size', 'var(--ui-workbench-specimen-preview-block-size)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-settings',
    declarations: [
      ['grid-template-rows', 'minmax(0, 1fr)', false],
      [
        'grid-template-columns',
        'minmax(0, 1fr) calc(\n        var(--ui-layout-target-enhanced-minimum-inline-size) + var(--ui-space-page-inline) * 2\n      )',
        false,
      ],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-settings-save',
    declarations: [
      ['block-size', 'var(--ui-workbench-feedback-minimum-block-size)', false],
      ['overflow', 'auto', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-settings-tail',
    declarations: [['block-size', '100vh', false]],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components', '@supports (height: 100dvh)'],
    selector: '.wb-settings-tail',
    declarations: [['block-size', '100dvh', false]],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-settings-field',
    declarations: [['grid-template-columns', 'minmax(0, 1fr)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-settings-navigation',
    declarations: [['grid-template-rows', 'minmax(0, 1fr) auto', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-section-nav',
    declarations: [
      ['justify-content', 'safe center', false],
      ['margin-inline', 'calc(-1 * var(--ui-space-content-gap))', false],
      ['padding', 'var(--ui-space-content-gap)', false],
      ['overscroll-behavior', 'contain', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-section-link.n-button',
    declarations: [
      ['flex', 'none', false],
      ['justify-content', 'center', true],
      ['white-space', 'nowrap', true],
      ['min-block-size', 'var(--ui-layout-target-enhanced-minimum-block-size)', false],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-settings-dock.n-button',
    declarations: [['justify-content', 'start', true]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: ".wb-settings-dock.n-button[data-collapsed='true']",
    declarations: [['justify-content', 'center', true]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-mode-preview',
    declarations: [['block-size', 'var(--ui-workbench-specimen-preview-block-size)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-mode-scene',
    declarations: [
      ['background', 'var(--pavp-mode-preview-page)', false],
      ['padding', 'var(--ui-space-content-gap)', false],
      ['grid-template-columns', 'minmax(0, 1fr) minmax(0, 3fr)', false],
      ['grid-template-rows', 'auto 1fr', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-mode-scene-toolbar',
    declarations: [
      ['grid-column', '1 / -1', false],
      ['block-size', 'var(--ui-space-content-gap)', false],
      ['background', 'var(--pavp-mode-preview-panel)', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-mode-scene-sidebar',
    declarations: [['background', 'var(--pavp-mode-preview-panel)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-mode-scene-title',
    declarations: [
      ['inline-size', '50%', false],
      ['block-size', 'var(--ui-space-content-gap)', false],
      ['background', 'var(--pavp-mode-preview-control)', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-mode-scene-tiles',
    declarations: [['grid-template-columns', 'repeat(2, minmax(0, 1fr))', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-theme-options',
    declarations: [['grid-template-columns', 'minmax(0, 1fr)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-theme-option.n-button',
    declarations: [
      ['block-size', 'auto', false],
      ['min-inline-size', '0', false],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-theme-option .n-button__content',
    declarations: [
      ['display', 'flex', false],
      ['flex-direction', 'row', false],
      ['justify-content', 'start', false],
      ['block-size', '100%', false],
      ['gap', 'var(--ui-space-content-gap)', false],
      ['inline-size', '100%', false],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-theme-name',
    declarations: [
      ['white-space', 'normal', false],
      ['overflow-wrap', 'normal', false],
      ['word-break', 'normal', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-theme-swatch',
    declarations: [
      ['flex-shrink', '0', false],
      ['border-radius', '50%', false],
      ['background', 'var(--pavp-settings-theme-color)', false],
      ['color', 'var(--pavp-settings-theme-on-color)', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector:
      "[data-layout-profile='regular'] .wb-settings-field,\n  [data-layout-profile='wide'] .wb-settings-field",
    declarations: [['grid-template-columns', 'minmax(0, 1fr) minmax(0, 2fr)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector:
      "[data-layout-profile='regular'] .wb-theme-options,\n  [data-layout-profile='wide'] .wb-theme-options",
    declarations: [['grid-template-columns', 'repeat(5, minmax(0, 1fr))', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector:
      "[data-layout-profile='regular'] .wb-theme-option .n-button__content,\n  [data-layout-profile='wide'] .wb-theme-option .n-button__content",
    declarations: [['flex-direction', 'column', false]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector:
      "[data-layout-profile='regular'] .wb-settings,\n  [data-layout-profile='wide'] .wb-settings",
    declarations: [['grid-template-columns', 'minmax(0, 1fr) max-content', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector:
      "[data-layout-profile='regular'] .wb-settings-navigation,\n  [data-layout-profile='wide'] .wb-settings-navigation",
    declarations: [
      ['min-inline-size', 'var(--ui-workbench-settings-navigator-inline-size)', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: '.wb-settings-field.wb-settings-choice-field',
    declarations: [['grid-template-columns', 'minmax(0, 1fr)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector: "[data-layout-profile='wide'] .wb-settings-section-body",
    declarations: [['grid-template-columns', 'minmax(0, 1fr) minmax(0, 2fr)', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector:
      "[data-layout-profile='regular'] .wb-section-link.n-button,\n  [data-layout-profile='wide'] .wb-section-link.n-button",
    declarations: [['justify-content', 'start', true]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    selector:
      '.wb-specimen:focus-visible,\n  .wb-link:focus-visible,\n  .wb-done:focus-visible,\n  .wb-section-link:focus-visible',
    declarations: [
      ['outline', 'var(--ui-admin-border-focus)', false],
      ['outline-offset', 'var(--ui-admin-focus-outline-offset)', false],
    ],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components', '@media (prefers-reduced-motion: no-preference)'],
    selector:
      "html[data-motion='full'] .wb-motion-object,\n    html[data-motion='full'] .wb-motion-dot",
    declarations: [
      ['transition', 'transform var(--ui-motion-duration) var(--ui-motion-easing)', false],
    ],
    responsibility: 'PRIVATE_INTERACTION_MOTION',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components', '@media (prefers-reduced-motion: no-preference)'],
    selector: "html[data-motion='full'] .wb-specimen[data-kind='motion']:hover .wb-motion-dot",
    declarations: [['transition-duration', 'var(--ui-motion-duration)', false]],
    responsibility: 'PRIVATE_INTERACTION_MOTION',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components', '@media (forced-colors: active)'],
    selector: '.wb-specimen,\n    .wb-theme-option,\n    .wb-section-nav,\n    .wb-done',
    declarations: [['border-color', 'CanvasText', false]],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components', '@media (forced-colors: active)'],
    selector: '.wb-clock-plane',
    declarations: [['outline', 'var(--ui-border-width) solid CanvasText', false]],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@layer vendor-overrides'],
    selector: 'html[data-motion] :where(.n-button .n-base-wave, .n-button .n-icon-slot)',
    declarations: [['transition-duration', 'var(--ui-motion-duration)', false]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@layer vendor-overrides'],
    selector:
      'html[data-motion]\n    :where(\n      .n-button,\n      .n-button__border,\n      .n-button__state-border,\n      .n-button .n-base-wave,\n      .n-button .n-icon-slot,\n      .n-breadcrumb-item,\n      .n-breadcrumb-item .n-icon,\n      .n-breadcrumb-item__link,\n      .n-breadcrumb-item__separator,\n      .n-descriptions-header,\n      .n-descriptions-table-wrapper,\n      .n-descriptions-table-row,\n      .n-descriptions-table-header,\n      .n-descriptions-table-content,\n      .n-descriptions-table-content__content,\n      .n-descriptions__label,\n      .n-radio-group__splitor,\n      .n-radio__dot,\n      .n-radio-button,\n      .n-radio-button__state-border,\n      .n-tag,\n      .n-tag__border,\n      .n-tag__icon,\n      .n-tag__close\n    )',
    declarations: [['transition-timing-function', 'var(--ui-motion-easing)', false]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@layer vendor-overrides'],
    selector: 'html[data-motion] .n-radio__dot::before',
    declarations: [['transition-timing-function', 'var(--ui-motion-easing)', false]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@layer vendor-overrides'],
    selector: 'html[data-motion] .n-button .n-base-wave',
    declarations: [
      ['animation-duration', 'var(--ui-motion-duration)', false],
      ['animation-timing-function', 'var(--ui-motion-easing)', false],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@layer vendor-overrides'],
    selector: '.n-button:focus-visible',
    declarations: [['box-shadow', 'var(--ui-admin-shadow-focus-ring)', false]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@layer vendor-overrides'],
    selector: '.pavp-admin-shell__header-action-tooltip.n-popover',
    declarations: [
      ['box-sizing', 'border-box', false],
      ['border-color', 'var(--ui-color-border-default)', false],
      ['border-style', 'solid', false],
      ['border-width', 'var(--ui-admin-border-width)', false],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@layer vendor-overrides', '@media (forced-colors: active)'],
    selector: '.n-button:focus-visible',
    declarations: [['outline-offset', 'var(--ui-admin-focus-outline-offset)', false]],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@layer vendor-overrides', '@media (forced-colors: active)'],
    selector:
      ".pavp-form-control\n      :focus-visible:not(\n        :is(\n          .n-input__input-el,\n          .n-input__textarea-el,\n          .n-base-selection-label,\n          .n-base-selection-tags,\n          .n-switch[role='switch']\n        )\n      )",
    declarations: [['outline', 'var(--ui-admin-border-focus)', false]],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@layer vendor-overrides', '@media (forced-colors: active)'],
    selector: '.pavp-form-control :focus-visible',
    declarations: [['outline-offset', 'var(--ui-admin-focus-outline-offset)', false]],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@layer vendor-overrides'],
    selector: '.pavp-switch :not(:is(.n-switch__rail, .n-switch__button))',
    declarations: [['transition-duration', 'var(--ui-motion-duration)', false]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@layer vendor-overrides'],
    selector: '.pavp-switch *',
    declarations: [['transition-timing-function', 'var(--ui-motion-easing)', false]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@layer vendor-overrides'],
    selector:
      "html:not([data-motion='full']) .pavp-switch :not(:is(.n-switch__rail, .n-switch__button))",
    declarations: [['transition', 'none', false]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@layer vendor-overrides'],
    selector: '.pavp-workspace-context-menu',
    declarations: [
      ['border-width', 'var(--ui-admin-border-width)', false],
      ['border-style', 'solid', false],
      ['border-color', 'var(--ui-color-border-default)', false],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@layer vendor-overrides'],
    selector: '.pavp-workspace-context-menu:focus-visible',
    declarations: [['outline', 'var(--ui-admin-border-focus)', false]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@layer vendor-overrides', '@media (forced-colors: active)'],
    selector: '.pavp-workspace-context-menu.n-dropdown-menu',
    declarations: [['background', 'Canvas', false]],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@layer vendor-overrides', '@media (forced-colors: active)'],
    selector: '.pavp-workspace-context-menu .n-dropdown-option-body--pending',
    declarations: [['outline', 'var(--ui-admin-border-width) solid Highlight', false]],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "[data-pavp-admin-navigation='persistent']\n  .pavp-admin-shell__sidebar.n-layout-sider\n  > .n-layout-sider__border",
    declarations: [['width', 'var(--ui-admin-border-width)', false]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      'html[data-motion]\n  :where(\n    .n-button,\n    .n-button__border,\n    .n-button__state-border,\n    .n-breadcrumb-item,\n    .n-breadcrumb-item .n-icon,\n    .n-breadcrumb-item__link,\n    .n-breadcrumb-item__separator,\n    .n-descriptions-header,\n    .n-descriptions-table-wrapper,\n    .n-descriptions-table-row,\n    .n-descriptions-table-header,\n    .n-descriptions-table-content,\n    .n-descriptions-table-content__content,\n    .n-descriptions__label,\n    .n-radio-group__splitor,\n    .n-radio__dot,\n    .n-radio-button,\n    .n-radio-button__state-border,\n    .n-tag,\n    .n-tag__border,\n    .n-tag__icon,\n    .n-tag__close\n  )',
    declarations: [['transition-duration', 'var(--ui-motion-duration)', false]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector: 'html[data-motion] .n-radio__dot::before',
    declarations: [['transition-duration', 'var(--ui-motion-duration)', false]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector: 'html[data-motion] .n-button .n-icon-slot',
    declarations: [
      ['transition-duration', 'var(--ui-motion-duration)', true],
      ['transition-timing-function', 'var(--ui-motion-easing)', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector: '.pavp-admin-shell__header-action.n-button',
    declarations: [['outline', 'var(--ui-admin-border-control)', false]],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector: '.n-button:focus-visible',
    declarations: [['outline', 'var(--ui-admin-border-focus)', false]],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced']\n  :where(\n    .n-button,\n    .n-button__border,\n    .n-button__state-border,\n    .n-button .n-base-wave,\n    .n-button .n-icon-slot,\n    .n-breadcrumb-item,\n    .n-breadcrumb-item .n-icon,\n    .n-breadcrumb-item__link,\n    .n-breadcrumb-item__separator,\n    .n-descriptions-header,\n    .n-descriptions-table-wrapper,\n    .n-descriptions-table-row,\n    .n-descriptions-table-header,\n    .n-descriptions-table-content,\n    .n-descriptions-table-content__content,\n    .n-descriptions__label,\n    .n-radio-group__splitor,\n    .n-radio__dot,\n    .n-radio-button,\n    .n-radio-button__state-border,\n    .n-tag,\n    .n-tag__border,\n    .n-tag__icon,\n    .n-tag__close\n  )",
    declarations: [['transition-duration', 'calc(var(--ui-motion-duration) / 2)', true]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector: "html[data-motion='reduced'] .n-radio__dot::before",
    declarations: [['transition-duration', 'calc(var(--ui-motion-duration) / 2)', true]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector: "html[data-motion='reduced'] .n-button .n-icon-slot",
    declarations: [['transition-duration', 'calc(var(--ui-motion-duration) / 2)', true]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector: "html[data-motion='reduced'] .n-button .n-base-wave",
    declarations: [['animation-duration', 'calc(var(--ui-motion-duration) / 2)', true]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='none']\n  :where(\n    .n-button,\n    .n-button__border,\n    .n-button__state-border,\n    .n-button .n-base-wave,\n    .n-button .n-icon-slot,\n    .n-breadcrumb-item,\n    .n-breadcrumb-item .n-icon,\n    .n-breadcrumb-item__link,\n    .n-breadcrumb-item__separator,\n    .n-descriptions-header,\n    .n-descriptions-table-wrapper,\n    .n-descriptions-table-row,\n    .n-descriptions-table-header,\n    .n-descriptions-table-content,\n    .n-descriptions-table-content__content,\n    .n-descriptions__label,\n    .n-radio-group__splitor,\n    .n-radio__dot,\n    .n-radio__label,\n    .n-radio-button,\n    .n-radio-button__state-border,\n    .n-tag,\n    .n-tag__border,\n    .n-tag__icon,\n    .n-tag__close,\n    .n-card,\n    .n-input,\n    .n-input__input,\n    .n-input__border,\n    .n-input__state-border,\n    .n-input__suffix,\n    .n-base-selection,\n    .n-base-selection__border,\n    .n-base-selection__state-border,\n    .n-base-selection-label,\n    .n-base-selection-input,\n    .n-base-selection-overlay,\n    .n-base-selection .n-base-suffix__arrow,\n    .n-switch__rail,\n    .n-switch__button,\n    .n-base-select-menu,\n    .n-base-select-menu .n-base-select-option,\n    .n-base-select-menu .n-base-select-option::before,\n    .n-base-select-menu .n-base-select-option__check,\n    .pavp-form-control,\n    .pavp-form-control *,\n    .pavp-form-field .n-form-item-feedback,\n    .pavp-form-select-menu,\n    .pavp-form-select-menu *,\n    .n-date-panel,\n    .n-date-panel *\n  )",
    declarations: [
      ['animation', 'none', true],
      ['transition', 'none', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='none'] .n-radio__dot::before,\nhtml[data-motion='none'] .n-button .n-icon-slot,\nhtml[data-motion='none'] .n-button .n-base-wave",
    declarations: [
      ['animation', 'none', true],
      ['transition', 'none', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='none'] .pavp-admin-shell__header-action-icon-state,\nhtml[data-motion='none'] .pavp-admin-shell__header-action-tooltip",
    declarations: [
      ['animation', 'none', true],
      ['transition', 'none', true],
      ['transform', 'none', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector: "html[data-motion='none'] .pavp-admin-navigation-dropdown",
    declarations: [
      ['animation', 'none', true],
      ['transition', 'none', true],
      ['transform', 'none', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='full'] .pavp-admin-shell__header-action-icon-state,\nhtml[data-motion='full'] .pavp-admin-shell__header-action-tooltip,\nhtml[data-motion='full'] .n-card,\nhtml[data-motion='full'] .n-input,\nhtml[data-motion='full'] .n-input__input,\nhtml[data-motion='full'] .n-input__suffix,\nhtml[data-motion='full'] .n-input__border,\nhtml[data-motion='full'] .n-input__state-border,\nhtml[data-motion='full'] .n-base-selection,\nhtml[data-motion='full'] .n-base-selection__border,\nhtml[data-motion='full'] .n-base-selection__state-border,\nhtml[data-motion='full'] .n-base-selection-label,\nhtml[data-motion='full'] .n-base-selection-input,\nhtml[data-motion='full'] .n-base-selection-overlay,\nhtml[data-motion='full'] .n-base-selection .n-base-suffix__arrow,\nhtml[data-motion='full'] .n-switch__rail,\nhtml[data-motion='full'] .n-switch__button,\nhtml[data-motion='full'] .pavp-form-field .n-form-item-feedback,\nhtml[data-motion='full'] .n-base-select-menu,\nhtml[data-motion='full'] .n-base-select-menu .n-base-select-option,\nhtml[data-motion='full'] .n-base-select-menu .n-base-select-option::before,\nhtml[data-motion='full'] .n-base-select-menu .n-base-select-option__check,\nhtml[data-motion='full'] .n-date-panel,\nhtml[data-motion='full'] .n-date-panel-date,\nhtml[data-motion='full'] .n-date-panel-calendar__title,\nhtml[data-motion='full'] .n-date-panel-month",
    declarations: [
      ['transition-duration', 'var(--ui-motion-duration)', true],
      ['transition-timing-function', 'var(--ui-motion-easing)', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector: "html[data-motion='full'] .pavp-admin-shell__header-action.n-button",
    declarations: [
      ['transition-duration', 'var(--ui-motion-duration)', true],
      ['transition-property', 'background-color, color, opacity', true],
      ['transition-timing-function', 'var(--ui-motion-easing)', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector: "html[data-motion='full'] .pavp-admin-shell__header-action-icon-state",
    declarations: [['transition-property', 'opacity, transform', true]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced'] .pavp-admin-shell__header-action-icon-state,\nhtml[data-motion='reduced'] .pavp-admin-shell__header-action-tooltip,\nhtml[data-motion='reduced'] .n-card,\nhtml[data-motion='reduced'] .n-input,\nhtml[data-motion='reduced'] .n-input__input,\nhtml[data-motion='reduced'] .n-input__suffix,\nhtml[data-motion='reduced'] .n-input__border,\nhtml[data-motion='reduced'] .n-input__state-border,\nhtml[data-motion='reduced'] .n-base-selection,\nhtml[data-motion='reduced'] .n-base-selection__border,\nhtml[data-motion='reduced'] .n-base-selection__state-border,\nhtml[data-motion='reduced'] .n-base-selection-label,\nhtml[data-motion='reduced'] .n-base-selection-input,\nhtml[data-motion='reduced'] .n-base-selection-overlay,\nhtml[data-motion='reduced'] .n-base-selection .n-base-suffix__arrow,\nhtml[data-motion='reduced'] .n-switch__rail,\nhtml[data-motion='reduced'] .n-switch__button,\nhtml[data-motion='reduced'] .pavp-form-field .n-form-item-feedback,\nhtml[data-motion='reduced'] .n-base-select-menu,\nhtml[data-motion='reduced'] .n-base-select-menu .n-base-select-option,\nhtml[data-motion='reduced'] .n-base-select-menu .n-base-select-option::before,\nhtml[data-motion='reduced'] .n-base-select-menu .n-base-select-option__check,\nhtml[data-motion='reduced'] .n-date-panel,\nhtml[data-motion='reduced'] .n-date-panel-date,\nhtml[data-motion='reduced'] .n-date-panel-calendar__title,\nhtml[data-motion='reduced'] .n-date-panel-month",
    declarations: [
      ['transition-duration', 'calc(var(--ui-motion-duration) / 2)', true],
      ['transition-timing-function', 'var(--ui-motion-easing)', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced'] .pavp-admin-shell__header-action.n-button,\nhtml[data-motion='reduced'] .n-input,\nhtml[data-motion='reduced'] .n-input__input,\nhtml[data-motion='reduced'] .n-input__suffix,\nhtml[data-motion='reduced'] .n-input__border,\nhtml[data-motion='reduced'] .n-input__state-border,\nhtml[data-motion='reduced'] .n-base-selection,\nhtml[data-motion='reduced'] .n-base-selection__border,\nhtml[data-motion='reduced'] .n-base-selection__state-border,\nhtml[data-motion='reduced'] .n-base-selection-label,\nhtml[data-motion='reduced'] .n-base-selection-input,\nhtml[data-motion='reduced'] .n-base-selection-overlay,\nhtml[data-motion='reduced'] .n-base-selection .n-base-suffix__arrow,\nhtml[data-motion='reduced'] .n-switch__rail,\nhtml[data-motion='reduced'] .n-switch__button,\nhtml[data-motion='reduced'] .n-base-select-menu,\nhtml[data-motion='reduced'] .n-base-select-menu .n-base-select-option,\nhtml[data-motion='reduced'] .n-base-select-menu .n-base-select-option::before,\nhtml[data-motion='reduced'] .n-base-select-menu .n-base-select-option__check,\nhtml[data-motion='reduced'] .n-date-panel,\nhtml[data-motion='reduced'] .n-date-panel-date,\nhtml[data-motion='reduced'] .n-date-panel-calendar__title,\nhtml[data-motion='reduced'] .n-date-panel-month",
    declarations: [
      ['transition-duration', 'calc(var(--ui-motion-duration) / 2)', true],
      ['transition-property', 'background-color, color, opacity', true],
      ['transition-timing-function', 'var(--ui-motion-easing)', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced'] .pavp-admin-shell__header-action-icon-state,\nhtml[data-motion='reduced'] .pavp-form-field .n-form-item-feedback",
    declarations: [
      ['transform', 'none', true],
      ['transition-property', 'opacity', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector: "html[data-motion='reduced'] .pavp-admin-shell__header-action-tooltip",
    declarations: [['transition-property', 'background-color, color, opacity', true]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced']\n  .pavp-admin-shell__header-action-tooltip:is(\n    .popover-transition-enter-from,\n    .popover-transition-leave-to\n  ),\nhtml[data-motion='reduced']\n  :is(.n-base-select-menu, .n-base-select-menu .n-base-select-option__check):is(\n    .fade-in-scale-up-transition-enter-from,\n    .fade-in-scale-up-transition-leave-to\n  ),\nhtml[data-motion='reduced']\n  .n-date-panel:is(.fade-in-scale-up-transition-enter-from, .fade-in-scale-up-transition-leave-to)",
    declarations: [['transform', 'none', true]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='none']\n  .pavp-admin-shell__header-action-tooltip:is(\n    .popover-transition-enter-from,\n    .popover-transition-leave-to\n  ),\nhtml[data-motion='none']\n  :is(.n-base-select-menu, .n-base-select-menu .n-base-select-option__check):is(\n    .fade-in-scale-up-transition-enter-from,\n    .fade-in-scale-up-transition-leave-to\n  ),\nhtml[data-motion='none']\n  .n-date-panel:is(.fade-in-scale-up-transition-enter-from, .fade-in-scale-up-transition-leave-to)",
    declarations: [
      ['opacity', '1', true],
      ['transform', 'none', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='full']\n  :where(\n    [data-pavp-admin-navigation='persistent'].n-layout,\n    [data-pavp-admin-navigation='persistent'] .n-layout-sider,\n    [data-pavp-admin-navigation='persistent'] .n-layout-sider__border,\n    [data-pavp-admin-navigation='persistent'] .n-layout-sider-scroll-container,\n    [data-pavp-admin-navigation='persistent'] .n-menu,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__icon,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__arrow,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content-header,\n    [data-pavp-admin-navigation='persistent'] .n-submenu-children,\n    .pavp-admin-navigation-dropdown,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__prefix,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__suffix,\n    .pavp-admin-navigation-dropdown .n-dropdown-divider\n  )",
    declarations: [
      ['transition-duration', 'var(--ui-motion-duration)', true],
      ['transition-timing-function', 'var(--ui-motion-easing)', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='full']\n  :where(\n    [data-pavp-admin-navigation='persistent'] .n-menu,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body\n  )",
    declarations: [['transition-property', 'background-color, color, opacity', true]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector: "html[data-motion='full'] .pavp-admin-navigation-dropdown",
    declarations: [['transition-property', 'background-color, opacity, transform', true]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='full']\n  :where(\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__icon,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content-header,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__prefix,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__suffix\n  )",
    declarations: [['transition-property', 'color, opacity', true]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='full'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content__arrow",
    declarations: [['transition-property', 'color, opacity, transform', true]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced']\n  :where(\n    [data-pavp-admin-navigation='persistent'].n-layout,\n    [data-pavp-admin-navigation='persistent'] .n-layout-sider,\n    [data-pavp-admin-navigation='persistent'] .n-layout-sider__border,\n    [data-pavp-admin-navigation='persistent'] .n-layout-sider-scroll-container,\n    [data-pavp-admin-navigation='persistent'] .n-menu,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__icon,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__arrow,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content-header,\n    [data-pavp-admin-navigation='persistent'] .n-submenu-children,\n    .pavp-admin-navigation-dropdown,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__prefix,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__suffix,\n    .pavp-admin-navigation-dropdown .n-dropdown-divider\n  )",
    declarations: [
      ['transition-duration', 'calc(var(--ui-motion-duration) / 2)', true],
      ['transition-timing-function', 'var(--ui-motion-easing)', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced']\n  :where(\n    [data-pavp-admin-navigation='persistent'] .n-menu,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body\n  )",
    declarations: [['transition-property', 'background-color, color, opacity', true]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector: "html[data-motion='reduced'] .pavp-admin-navigation-dropdown",
    declarations: [
      ['transform', 'none', true],
      ['transition-property', 'opacity', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced']\n  :where(\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__icon,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__arrow,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content-header,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__prefix,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__suffix\n  )",
    declarations: [['transition-property', 'color', true]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced'] .pavp-admin-navigation-dropdown.fade-in-scale-up-transition-enter-from,\nhtml[data-motion='reduced'] .pavp-admin-navigation-dropdown.fade-in-scale-up-transition-leave-to",
    declarations: [['transform', 'none', true]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='none']\n  :where(\n    [data-pavp-admin-navigation='persistent'].n-layout,\n    [data-pavp-admin-navigation='persistent'] .n-layout-sider,\n    [data-pavp-admin-navigation='persistent'] .n-layout-sider__border,\n    [data-pavp-admin-navigation='persistent'] .n-layout-sider-scroll-container,\n    [data-pavp-admin-navigation='persistent'] .n-menu,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__icon,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content__arrow,\n    [data-pavp-admin-navigation='persistent'] .n-menu-item-content-header,\n    [data-pavp-admin-navigation='persistent'] .n-submenu-children,\n    .pavp-admin-navigation-dropdown,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__prefix,\n    .pavp-admin-navigation-dropdown .n-dropdown-option-body__suffix,\n    .pavp-admin-navigation-dropdown .n-dropdown-divider\n  )",
    declarations: [
      ['animation', 'none', true],
      ['transition', 'none', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='none']\n  [data-pavp-admin-navigation='persistent']\n  :is(\n    .n-submenu-children.fade-in-height-expand-transition-enter-active,\n    .n-submenu-children.fade-in-height-expand-transition-leave-active,\n    .n-submenu-children.fade-in-height-expand-transition-enter-from,\n    .n-submenu-children.fade-in-height-expand-transition-leave-to\n  )",
    declarations: [['opacity', '1', true]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='none'] .pavp-admin-navigation-dropdown.fade-in-scale-up-transition-enter-from,\nhtml[data-motion='none'] .pavp-admin-navigation-dropdown.fade-in-scale-up-transition-leave-to",
    declarations: [
      ['opacity', '1', true],
      ['transform', 'none', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector:
      ".pavp-form-control .n-input__input-el:focus-visible,\n  .pavp-form-control .n-input__textarea-el:focus-visible,\n  .pavp-form-control .n-base-selection-label:focus-visible,\n  .pavp-form-control .n-base-selection-tags:focus-visible,\n  .pavp-form-control .n-switch[role='switch']:focus-visible",
    declarations: [['outline', 'var(--ui-admin-border-focus)', false]],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector: '.pavp-switch :is(.n-switch__rail, .n-switch__button)',
    declarations: [['transition-duration', 'var(--ui-motion-duration)', false]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector: "html:not([data-motion='full']) .pavp-switch :is(.n-switch__rail, .n-switch__button)",
    declarations: [['transition', 'none', false]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector: ".pavp-switch[role='switch']",
    declarations: [['outline', 'var(--ui-admin-border-width) solid ButtonText', false]],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      'html[data-motion] .pavp-workspace-context-menu,\nhtml[data-motion] .pavp-workspace-context-menu .n-dropdown-option-body',
    declarations: [
      ['transition-duration', 'var(--ui-motion-duration)', true],
      ['transition-timing-function', 'var(--ui-motion-easing)', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='reduced'] .pavp-workspace-context-menu,\nhtml[data-motion='reduced'] .pavp-workspace-context-menu .n-dropdown-option-body",
    declarations: [
      ['transition-duration', 'calc(var(--ui-motion-duration) / 2)', true],
      ['transform', 'none', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    selector:
      "html[data-motion='none'] .pavp-workspace-context-menu,\nhtml[data-motion='none'] .pavp-workspace-context-menu .n-dropdown-option-body",
    declarations: [
      ['transition', 'none', true],
      ['transform', 'none', true],
      ['opacity', '1', true],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: ['@layer components'],
    selector: '.pavp-scroll-area',
    declarations: [
      ['position', 'relative', false],
      ['block-size', '100%', false],
      ['min-block-size', '0', false],
      ['min-inline-size', '0', false],
      ['overflow', 'hidden', false],
      ['overscroll-behavior', 'contain', false],
    ],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: ['@layer components'],
    selector: ".pavp-scroll-area[data-enabled='false']",
    declarations: [
      ['block-size', 'auto', false],
      ['overflow', 'visible', false],
    ],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: ['@layer components'],
    selector: '.pavp-scroll-area__viewport',
    declarations: [
      ['block-size', '100%', false],
      ['min-block-size', '0', false],
      ['min-inline-size', '0', false],
      ['overscroll-behavior', 'contain', false],
    ],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: ['@layer components'],
    selector: ".pavp-scroll-area[data-horizontal='true'] > .pavp-scroll-area__viewport",
    declarations: [['overflow', 'auto hidden', false]],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: ['@layer components'],
    selector: ".pavp-scroll-area[data-enabled='false'] > .pavp-scroll-area__viewport",
    declarations: [
      ['block-size', 'auto', false],
      ['overflow', 'visible', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: ['@layer components'],
    selector: '.pavp-scroll-area__content',
    declarations: [
      ['display', 'flow-root', false],
      ['min-inline-size', '100%', false],
    ],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: ['@layer components'],
    selector: ".pavp-scroll-area__content[data-main-content='true']",
    declarations: [
      ['display', 'flex', false],
      ['flex-direction', 'column', false],
      ['min-block-size', '100%', false],
      ['min-inline-size', '0', false],
    ],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: ['@layer components'],
    selector:
      ".pavp-scroll-area[data-enabled='false'][data-contained='true'],\n  .pavp-scroll-area[data-enabled='false'][data-contained='true'] > .pavp-scroll-area__viewport,\n  .pavp-scroll-area[data-enabled='false'][data-contained='true']\n    > .pavp-scroll-area__viewport\n    > .pavp-scroll-area__content",
    declarations: [
      ['display', 'flex', false],
      ['flex', '1 1 auto', false],
      ['flex-direction', 'column', false],
      ['block-size', '100%', false],
      ['min-block-size', '0', false],
      ['min-inline-size', '0', false],
      ['overflow', 'hidden', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: ['@layer components', '@media (forced-colors: active)'],
    selector: '.pavp-scroll-area__viewport',
    declarations: [['scrollbar-color', 'ButtonText Canvas', false]],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 1,
    context: ['@layer components'],
    selector: ':where(.pavp-scroll-area__viewport)',
    declarations: [
      ['overflow', 'hidden auto', false],
      ['scrollbar-width', 'thin', false],
      ['scrollbar-color', 'var(--ui-color-text-secondary) var(--ui-color-surface-panel)', false],
    ],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 1,
    context: [],
    selector: '.pavp-scroll-area .os-theme-pavp',
    declarations: [
      ['--os-size', 'calc(var(--ui-space-content-gap) / 2)', false],
      ['--os-track-border-radius', 'var(--ui-radius-small)', false],
      ['--os-track-bg', 'var(--ui-color-surface-panel)', false],
      ['--os-track-bg-hover', 'var(--ui-color-surface-panel)', false],
      ['--os-track-bg-active', 'var(--ui-color-surface-panel)', false],
      ['--os-handle-border-radius', 'var(--ui-radius-small)', false],
      ['--os-handle-bg', 'var(--ui-color-text-secondary)', false],
      ['--os-handle-bg-hover', 'var(--ui-color-text-primary)', false],
      ['--os-handle-bg-active', 'var(--ui-color-text-primary)', false],
      ['--os-handle-interactive-area-offset', 'calc(var(--ui-space-content-gap) / 2)', false],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 1,
    context: [],
    selector: ".pavp-scroll-area[data-horizontal='true'] .os-theme-pavp",
    declarations: [
      ['--os-size', 'calc(var(--ui-space-content-gap) / 6)', false],
      ['--os-handle-interactive-area-offset', 'calc(var(--ui-space-content-gap) * 5 / 6)', false],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 1,
    context: ['@media (forced-colors: active)'],
    selector: '.pavp-scroll-area .os-theme-pavp',
    declarations: [
      ['--os-track-bg', 'Canvas', false],
      ['--os-track-bg-hover', 'Canvas', false],
      ['--os-track-bg-active', 'Canvas', false],
      ['--os-handle-bg', 'ButtonText', false],
      ['--os-handle-bg-hover', 'Highlight', false],
      ['--os-handle-bg-active', 'Highlight', false],
      ['forced-color-adjust', 'none', false],
    ],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: ['@layer components'],
    selector: '.pavp-radio-card-group[data-ui-radio-card-group]',
    declarations: [
      ['--n-label-padding', '0', false],
      ['inline-size', '100%', false],
      ['gap', 'var(--ui-space-content-gap)', false],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: ['@layer components'],
    selector:
      '.pavp-radio-card-group[data-ui-radio-card-group]\n    > :not(.pavp-radio-card-group__option):not(.n-radio-group__splitor)',
    declarations: [['display', 'none', false]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: ['@layer components'],
    selector:
      '.pavp-radio-card-group[data-ui-radio-card-group]\n    > .pavp-radio-card-group__option[data-ui-radio-card-option]',
    declarations: [
      ['box-sizing', 'border-box', false],
      ['inline-size', '100%', false],
      ['min-inline-size', '0', false],
      ['overflow', 'hidden', false],
      ['border-style', 'none', false],
      ['border-radius', 'var(--ui-radius-panel)', false],
      ['box-shadow', 'none', false],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: ['@layer components', '@media (forced-colors: active)'],
    selector:
      '.pavp-radio-card-group[data-ui-radio-card-group]\n      > .pavp-radio-card-group__option[data-ui-radio-card-option]',
    declarations: [['border-style', 'solid', false]],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: [],
    selector: '.pavp-radio-card-group[data-ui-radio-card-group]',
    declarations: [
      ['display', 'grid', false],
      ['height', 'auto', false],
      ['block-size', 'auto', false],
      ['line-height', 'var(--ui-font-line-height-body)', false],
      ['white-space', 'normal', false],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: [],
    selector:
      '.pavp-radio-card-group[data-ui-radio-card-group]\n  > .pavp-radio-card-group__option[data-ui-radio-card-option]',
    declarations: [
      ['display', 'grid', false],
      ['align-items', 'center', false],
      ['height', 'auto', false],
      ['block-size', 'auto', false],
      ['padding', '0', false],
      ['line-height', 'var(--ui-font-line-height-body)', false],
      ['white-space', 'normal', false],
      [
        'transition',
        'background-color var(--ui-motion-duration) var(--ui-motion-easing),\n    box-shadow var(--ui-motion-duration) var(--ui-motion-easing),\n    color var(--ui-motion-duration) var(--ui-motion-easing)',
        false,
      ],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: [],
    selector:
      ".pavp-radio-card-group[data-ui-radio-card-group][data-disabled='false']\n  > .pavp-radio-card-group__option[data-ui-radio-card-option]:not(.n-radio-button--disabled):hover",
    declarations: [['background', 'var(--pavp-radio-card-hover-surface)', false]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: [],
    selector:
      ".pavp-radio-card-group[data-ui-radio-card-group][data-disabled='false']\n  > .pavp-radio-card-group__option[data-ui-radio-card-option][data-selected='true']:not(\n    .n-radio-button--disabled\n  ):hover",
    declarations: [
      ['background', 'var(--pavp-radio-card-selected-hover-surface)', false],
      ['color', 'var(--pavp-radio-card-selected-hover-foreground)', false],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: [],
    selector:
      '.pavp-radio-card-group[data-ui-radio-card-group]\n  > :deep(.n-radio-group__splitor:not(.pavp-radio-card-group__option))',
    declarations: [['display', 'none', false]],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector:
      '.pavp-radio-card-group[data-ui-radio-card-group]\n    > .pavp-radio-card-group__option[data-ui-radio-card-option]',
    declarations: [
      ['background', 'Canvas', false],
      ['color', 'CanvasText', false],
    ],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector:
      ".pavp-radio-card-group[data-ui-radio-card-group][data-disabled='false']\n    > .pavp-radio-card-group__option[data-ui-radio-card-option]:not(\n      .n-radio-button--disabled\n    ):hover",
    declarations: [
      ['background', 'CanvasText', false],
      ['color', 'Canvas', false],
    ],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector:
      ".pavp-radio-card-group[data-ui-radio-card-group]\n    > .pavp-radio-card-group__option[data-ui-radio-card-option][data-selected='true']",
    declarations: [
      ['background', 'Highlight', false],
      ['color', 'HighlightText', false],
    ],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: ['@media (forced-colors: active)'],
    selector:
      ".pavp-radio-card-group[data-ui-radio-card-group][data-disabled='false']\n    > .pavp-radio-card-group__option[data-ui-radio-card-option][data-selected='true']:not(\n      .n-radio-button--disabled\n    ):hover",
    declarations: [
      ['background', 'HighlightText', false],
      ['color', 'Highlight', false],
    ],
    responsibility: 'BROWSER_OR_PLATFORM_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@layer components'],
    selector: '.pavp-admin-shell__navigation-bottom',
    declarations: [
      ['display', 'flex', false],
      ['justify-content', 'center', false],
      [
        'padding-block',
        'var(--ui-space-content-gap)\n      max(var(--ui-space-content-gap), var(--pavp-safe-area-bottom))',
        false,
      ],
      ['padding-inline', '0', false],
    ],
    responsibility: 'VENDOR_ADAPTER_OWNER',
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@layer components'],
    selector: ".pavp-admin-shell__content-inner[data-contained='true']",
    declarations: [
      ['block-size', '100%', false],
      ['min-block-size', '0', false],
    ],
    responsibility: 'RUNTIME_STYLE_OWNER',
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
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@layer components'],
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
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: [],
    name: 'media',
    params: '(forced-colors: active)',
  },
  {
    path: 'packages/ui/src/components/UiSection.vue',
    block: 0,
    context: [],
    name: 'layer',
    params: 'components',
  },
  {
    path: 'packages/ui/src/components/UiPageHeader.vue',
    block: 0,
    context: [],
    name: 'layer',
    params: 'components',
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: [],
    name: 'layer',
    params: 'components',
  },
  {
    path: 'packages/ui/src/components/UiRadioCardGroup.vue',
    block: 0,
    context: ['@layer components'],
    name: 'media',
    params: '(forced-colors: active)',
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveForm.vue',
    block: 0,
    context: [],
    name: 'layer',
    params: 'components',
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveFormControl.vue',
    block: 0,
    context: [],
    name: 'layer',
    params: 'components',
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: [],
    name: 'layer',
    params: 'components',
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 0,
    context: ['@layer components'],
    name: 'media',
    params: '(forced-colors: active)',
  },
  {
    path: 'packages/ui/src/components/UiScrollArea.vue',
    block: 1,
    context: [],
    name: 'layer',
    params: 'components',
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
    name: 'layer',
    params: 'components',
  },
  {
    path: 'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
    block: 0,
    context: ['@layer components'],
    name: 'media',
    params: '(forced-colors: active)',
  },
  {
    path: 'apps/web/src/app/styles/layers.css',
    block: 0,
    context: [],
    name: 'layer',
    params: 'reset, tokens, base, components, app, utilities, vendor-overrides',
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
    path: 'apps/web/src/app/styles/layers.css',
    block: 0,
    context: [],
    name: 'layer',
    params: 'app',
  },
  {
    path: 'apps/web/src/app/router/route-transition/route-transition.css',
    block: 0,
    context: [],
    name: 'layer',
    params: 'app',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    name: 'layer',
    params: 'vendor-overrides',
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: ['@layer vendor-overrides'],
    name: 'media',
    params: '(forced-colors: active)',
    occurrences: 3,
  },
  {
    path: 'packages/ui/src/providers/UiProvider.vue',
    block: 0,
    context: [],
    name: 'media',
    params: '(forced-colors: active)',
    occurrences: 3,
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: [],
    name: 'layer',
    params: 'components',
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@layer components'],
    name: 'supports',
    params: '(height: 100dvh)',
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@layer components'],
    name: 'media',
    params: '(forced-colors: active)',
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 0,
    context: ['@layer components'],
    name: 'media',
    params: '(prefers-reduced-transparency: reduce)',
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    name: 'layer',
    params: 'components',
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer components'],
    name: 'media',
    params: '(forced-colors: active)',
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: [],
    name: 'layer',
    params: 'vendor-overrides',
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer vendor-overrides'],
    name: 'media',
    params: '(forced-colors: active)',
  },
  {
    path: 'packages/ui/src/components/UiAdminShell.vue',
    block: 1,
    context: ['@layer vendor-overrides'],
    name: 'media',
    params: '(prefers-reduced-transparency: reduce)',
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveFormField.vue',
    block: 0,
    context: [],
    name: 'layer',
    params: 'components',
  },
  {
    path: 'packages/ui/src/adapters/naive/PavpNaiveFormField.vue',
    block: 0,
    context: [],
    name: 'layer',
    params: 'vendor-overrides',
  },
  {
    path: 'apps/web/src/app/styles/layers.css',
    block: 0,
    context: [],
    name: 'import',
    params: "'../workbench/workbench.css'",
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: [],
    name: 'layer',
    params: 'components',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    name: 'supports',
    params: '(height: 100dvh)',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    name: 'media',
    params: '(prefers-reduced-motion: no-preference)',
  },
  {
    path: 'apps/web/src/app/workbench/workbench.css',
    block: 0,
    context: ['@layer components'],
    name: 'media',
    params: '(forced-colors: active)',
  },
]

export const privateStyleVariables = [
  {
    name: '--pavp-radio-card-selected-hover-foreground',
    source: 'naive-theme-bridge',
    valueKind: 'color',
    writer: 'packages/ui/src/components/UiRadioCardGroup.vue',
  },
  {
    name: '--pavp-radio-card-hover-surface',
    source: 'naive-theme-bridge',
    valueKind: 'color',
    writer: 'packages/ui/src/components/UiRadioCardGroup.vue',
  },
  {
    name: '--pavp-radio-card-selected-hover-surface',
    source: 'naive-theme-bridge',
    valueKind: 'color',
    writer: 'packages/ui/src/components/UiRadioCardGroup.vue',
  },
  {
    name: '--pavp-mode-preview-page',
    source: 'validated-theme-mode-preview',
    valueKind: 'color',
    writer: 'apps/web/src/app/workbench/ColorModePreview.vue',
  },
  {
    name: '--pavp-mode-preview-panel',
    source: 'validated-theme-mode-preview',
    valueKind: 'color',
    writer: 'apps/web/src/app/workbench/ColorModePreview.vue',
  },
  {
    name: '--pavp-mode-preview-action',
    source: 'validated-theme-mode-preview',
    valueKind: 'color',
    writer: 'apps/web/src/app/workbench/ColorModePreview.vue',
  },
  {
    name: '--pavp-mode-preview-control',
    source: 'validated-theme-mode-preview',
    valueKind: 'color',
    writer: 'apps/web/src/app/workbench/ColorModePreview.vue',
  },
  {
    name: '--pavp-mode-preview-border',
    source: 'validated-theme-mode-preview',
    valueKind: 'color',
    writer: 'apps/web/src/app/workbench/ColorModePreview.vue',
  },
  {
    name: '--n-item-color-active',
    source: 'naive-theme-bridge',
    valueKind: 'color',
    writer: 'packages/ui/src/adapters/naive/pavp-naive-theme.ts',
  },
  {
    name: '--pavp-navigation-selected-surface',
    source: 'naive-theme-bridge',
    valueKind: 'color',
    writer: 'packages/ui/src/components/UiAdminShell.vue',
  },
  {
    name: '--pavp-navigation-selected-foreground',
    source: 'naive-theme-bridge',
    valueKind: 'color',
    writer: 'packages/ui/src/components/UiAdminShell.vue',
  },
  {
    name: '--pavp-navigation-child-active-foreground',
    source: 'naive-theme-bridge',
    valueKind: 'color',
    writer: 'packages/ui/src/components/UiAdminShell.vue',
  },
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
  {
    name: '--pavp-specimen-value',
    valueKind: undefined,
    source: 'validated-public-token-specimen',
    writer: 'apps/web/src/app/workbench/TokenSpecimen.vue',
  },
  {
    name: '--pavp-specimen-background',
    source: 'validated-public-token-specimen',
    valueKind: 'color',
    writer: 'apps/web/src/app/workbench/TokenSpecimen.vue',
  },
  {
    name: '--pavp-settings-theme-color',
    source: 'runtime-theme-preview',
    valueKind: 'color',
    writer: 'apps/web/src/pages/control-center.vue',
  },
  {
    name: '--pavp-settings-theme-on-color',
    source: 'runtime-theme-preview',
    valueKind: 'color',
    writer: 'apps/web/src/pages/control-center.vue',
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
