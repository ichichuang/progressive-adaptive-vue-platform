/* Generated file. Do not edit directly. */
import type { ThemeColorPalettes } from '../schema/theme-color-palette.schema'

const activePublicColorRoles = [
  {
    publicRole: 'color.action.primary',
    publicBinding: '--ui-color-action-primary',
  },
  {
    publicRole: 'color.control.primary',
    publicBinding: '--ui-color-control-primary',
  },
  {
    publicRole: 'color.border.default',
    publicBinding: '--ui-color-border-default',
  },
  {
    publicRole: 'color.focus.ring',
    publicBinding: '--ui-color-focus-ring',
  },
  {
    publicRole: 'color.scrim.viewport',
    publicBinding: '--ui-color-scrim-viewport',
  },
  {
    publicRole: 'color.surface.page',
    publicBinding: '--ui-color-surface-page',
  },
  {
    publicRole: 'color.surface.panel',
    publicBinding: '--ui-color-surface-panel',
  },
  {
    publicRole: 'color.text.on-action',
    publicBinding: '--ui-color-text-on-action',
  },
  {
    publicRole: 'color.text.primary',
    publicBinding: '--ui-color-text-primary',
  },
  {
    publicRole: 'color.text.secondary',
    publicBinding: '--ui-color-text-secondary',
  },
  {
    publicRole: 'color.status.info',
    publicBinding: '--ui-color-status-info',
  },
  {
    publicRole: 'color.status.info.hover',
    publicBinding: '--ui-color-status-info-hover',
  },
  {
    publicRole: 'color.status.info.pressed',
    publicBinding: '--ui-color-status-info-pressed',
  },
  {
    publicRole: 'color.text.on-status.info',
    publicBinding: '--ui-color-text-on-status-info',
  },
  {
    publicRole: 'color.status.success',
    publicBinding: '--ui-color-status-success',
  },
  {
    publicRole: 'color.status.success.hover',
    publicBinding: '--ui-color-status-success-hover',
  },
  {
    publicRole: 'color.status.success.pressed',
    publicBinding: '--ui-color-status-success-pressed',
  },
  {
    publicRole: 'color.text.on-status.success',
    publicBinding: '--ui-color-text-on-status-success',
  },
  {
    publicRole: 'color.status.warning',
    publicBinding: '--ui-color-status-warning',
  },
  {
    publicRole: 'color.status.warning.hover',
    publicBinding: '--ui-color-status-warning-hover',
  },
  {
    publicRole: 'color.status.warning.pressed',
    publicBinding: '--ui-color-status-warning-pressed',
  },
  {
    publicRole: 'color.text.on-status.warning',
    publicBinding: '--ui-color-text-on-status-warning',
  },
  {
    publicRole: 'color.status.error',
    publicBinding: '--ui-color-status-error',
  },
  {
    publicRole: 'color.status.error.hover',
    publicBinding: '--ui-color-status-error-hover',
  },
  {
    publicRole: 'color.status.error.pressed',
    publicBinding: '--ui-color-status-error-pressed',
  },
  {
    publicRole: 'color.text.on-status.error',
    publicBinding: '--ui-color-text-on-status-error',
  },
  {
    publicRole: 'color.control.info',
    publicBinding: '--ui-color-control-info',
  },
  {
    publicRole: 'color.control.success',
    publicBinding: '--ui-color-control-success',
  },
  {
    publicRole: 'color.control.warning',
    publicBinding: '--ui-color-control-warning',
  },
  {
    publicRole: 'color.control.error',
    publicBinding: '--ui-color-control-error',
  },
] as const
const bankTemplates = (['light', 'dark'] as const).flatMap((colorMode) =>
  (['standard', 'enhanced'] as const).flatMap((contrast) =>
    activePublicColorRoles.map((role) => ({
      colorMode,
      contrast,
      publicRole: role.publicRole,
      sourceField: 'planes.' + colorMode + '.' + contrast + '.' + role.publicRole,
      bankVariable:
        '--ui-theme-bank-' +
        colorMode +
        '-' +
        contrast +
        '-' +
        role.publicBinding.slice('--ui-color-'.length),
      publicBinding: role.publicBinding,
    })),
  ),
)
const authoredPlanes = {
  light: {
    standard: {
      'color.action.primary': '{palette.roles.primary.solid.background.default}',
      'color.control.primary': '{palette.roles.primary.foreground.default}',
      'color.border.default': '{palette.borders.control}',
      'color.focus.ring': '{palette.roles.primary.focus}',
      'color.scrim.viewport': 'rgba(0, 0, 0, 0.56)',
      'color.surface.page': '{palette.surfaces.canvas}',
      'color.surface.panel': '{palette.surfaces.surface}',
      'color.text.on-action': '{palette.roles.primary.solid.foreground}',
      'color.text.primary': '{palette.text.primary}',
      'color.text.secondary': '{palette.text.secondary}',
      'color.status.info': '{palette.roles.info.solid.background.default}',
      'color.status.info.hover': '{palette.roles.info.solid.background.hover}',
      'color.status.info.pressed': '{palette.roles.info.solid.background.pressed}',
      'color.text.on-status.info': '{palette.roles.info.solid.foreground}',
      'color.status.success': '{palette.roles.success.solid.background.default}',
      'color.status.success.hover': '{palette.roles.success.solid.background.hover}',
      'color.status.success.pressed': '{palette.roles.success.solid.background.pressed}',
      'color.text.on-status.success': '{palette.roles.success.solid.foreground}',
      'color.status.warning': '{palette.roles.warning.solid.background.default}',
      'color.status.warning.hover': '{palette.roles.warning.solid.background.hover}',
      'color.status.warning.pressed': '{palette.roles.warning.solid.background.pressed}',
      'color.text.on-status.warning': '{palette.roles.warning.solid.foreground}',
      'color.status.error': '{palette.roles.error.solid.background.default}',
      'color.status.error.hover': '{palette.roles.error.solid.background.hover}',
      'color.status.error.pressed': '{palette.roles.error.solid.background.pressed}',
      'color.text.on-status.error': '{palette.roles.error.solid.foreground}',
      'color.control.info': '{palette.roles.info.foreground.default}',
      'color.control.success': '{palette.roles.success.foreground.default}',
      'color.control.warning': '{palette.roles.warning.foreground.default}',
      'color.control.error': '{palette.roles.error.foreground.default}',
    },
    enhanced: {
      'color.action.primary': '{palette.roles.primary.solid.background.default}',
      'color.control.primary': '{palette.roles.primary.foreground.default}',
      'color.border.default': '{palette.borders.control}',
      'color.focus.ring': '{palette.roles.primary.focus}',
      'color.scrim.viewport': 'rgba(0, 0, 0, 0.56)',
      'color.surface.page': '{palette.surfaces.canvas}',
      'color.surface.panel': '{palette.surfaces.surface}',
      'color.text.on-action': '{palette.roles.primary.solid.foreground}',
      'color.text.primary': '{palette.text.primary}',
      'color.text.secondary': '{palette.text.secondary}',
      'color.status.info': '{palette.roles.info.solid.background.default}',
      'color.status.info.hover': '{palette.roles.info.solid.background.hover}',
      'color.status.info.pressed': '{palette.roles.info.solid.background.pressed}',
      'color.text.on-status.info': '{palette.roles.info.solid.foreground}',
      'color.status.success': '{palette.roles.success.solid.background.default}',
      'color.status.success.hover': '{palette.roles.success.solid.background.hover}',
      'color.status.success.pressed': '{palette.roles.success.solid.background.pressed}',
      'color.text.on-status.success': '{palette.roles.success.solid.foreground}',
      'color.status.warning': '{palette.roles.warning.solid.background.default}',
      'color.status.warning.hover': '{palette.roles.warning.solid.background.hover}',
      'color.status.warning.pressed': '{palette.roles.warning.solid.background.pressed}',
      'color.text.on-status.warning': '{palette.roles.warning.solid.foreground}',
      'color.status.error': '{palette.roles.error.solid.background.default}',
      'color.status.error.hover': '{palette.roles.error.solid.background.hover}',
      'color.status.error.pressed': '{palette.roles.error.solid.background.pressed}',
      'color.text.on-status.error': '{palette.roles.error.solid.foreground}',
      'color.control.info': '{palette.roles.info.foreground.default}',
      'color.control.success': '{palette.roles.success.foreground.default}',
      'color.control.warning': '{palette.roles.warning.foreground.default}',
      'color.control.error': '{palette.roles.error.foreground.default}',
    },
  },
  dark: {
    standard: {
      'color.action.primary': '{palette.roles.primary.solid.background.default}',
      'color.control.primary': '{palette.roles.primary.foreground.default}',
      'color.border.default': '{palette.borders.control}',
      'color.focus.ring': '{palette.roles.primary.focus}',
      'color.scrim.viewport': 'rgba(0, 0, 0, 0.56)',
      'color.surface.page': '{palette.surfaces.canvas}',
      'color.surface.panel': '{palette.surfaces.surface}',
      'color.text.on-action': '{palette.roles.primary.solid.foreground}',
      'color.text.primary': '{palette.text.primary}',
      'color.text.secondary': '{palette.text.secondary}',
      'color.status.info': '{palette.roles.info.solid.background.default}',
      'color.status.info.hover': '{palette.roles.info.solid.background.hover}',
      'color.status.info.pressed': '{palette.roles.info.solid.background.pressed}',
      'color.text.on-status.info': '{palette.roles.info.solid.foreground}',
      'color.status.success': '{palette.roles.success.solid.background.default}',
      'color.status.success.hover': '{palette.roles.success.solid.background.hover}',
      'color.status.success.pressed': '{palette.roles.success.solid.background.pressed}',
      'color.text.on-status.success': '{palette.roles.success.solid.foreground}',
      'color.status.warning': '{palette.roles.warning.solid.background.default}',
      'color.status.warning.hover': '{palette.roles.warning.solid.background.hover}',
      'color.status.warning.pressed': '{palette.roles.warning.solid.background.pressed}',
      'color.text.on-status.warning': '{palette.roles.warning.solid.foreground}',
      'color.status.error': '{palette.roles.error.solid.background.default}',
      'color.status.error.hover': '{palette.roles.error.solid.background.hover}',
      'color.status.error.pressed': '{palette.roles.error.solid.background.pressed}',
      'color.text.on-status.error': '{palette.roles.error.solid.foreground}',
      'color.control.info': '{palette.roles.info.foreground.default}',
      'color.control.success': '{palette.roles.success.foreground.default}',
      'color.control.warning': '{palette.roles.warning.foreground.default}',
      'color.control.error': '{palette.roles.error.foreground.default}',
    },
    enhanced: {
      'color.action.primary': '{palette.roles.primary.solid.background.default}',
      'color.control.primary': '{palette.roles.primary.foreground.default}',
      'color.border.default': '{palette.borders.control}',
      'color.focus.ring': '{palette.roles.primary.focus}',
      'color.scrim.viewport': 'rgba(0, 0, 0, 0.56)',
      'color.surface.page': '{palette.surfaces.canvas}',
      'color.surface.panel': '{palette.surfaces.surface}',
      'color.text.on-action': '{palette.roles.primary.solid.foreground}',
      'color.text.primary': '{palette.text.primary}',
      'color.text.secondary': '{palette.text.secondary}',
      'color.status.info': '{palette.roles.info.solid.background.default}',
      'color.status.info.hover': '{palette.roles.info.solid.background.hover}',
      'color.status.info.pressed': '{palette.roles.info.solid.background.pressed}',
      'color.text.on-status.info': '{palette.roles.info.solid.foreground}',
      'color.status.success': '{palette.roles.success.solid.background.default}',
      'color.status.success.hover': '{palette.roles.success.solid.background.hover}',
      'color.status.success.pressed': '{palette.roles.success.solid.background.pressed}',
      'color.text.on-status.success': '{palette.roles.success.solid.foreground}',
      'color.status.warning': '{palette.roles.warning.solid.background.default}',
      'color.status.warning.hover': '{palette.roles.warning.solid.background.hover}',
      'color.status.warning.pressed': '{palette.roles.warning.solid.background.pressed}',
      'color.text.on-status.warning': '{palette.roles.warning.solid.foreground}',
      'color.status.error': '{palette.roles.error.solid.background.default}',
      'color.status.error.hover': '{palette.roles.error.solid.background.hover}',
      'color.status.error.pressed': '{palette.roles.error.solid.background.pressed}',
      'color.text.on-status.error': '{palette.roles.error.solid.foreground}',
      'color.control.info': '{palette.roles.info.foreground.default}',
      'color.control.success': '{palette.roles.success.foreground.default}',
      'color.control.warning': '{palette.roles.warning.foreground.default}',
      'color.control.error': '{palette.roles.error.foreground.default}',
    },
  },
} as const
const paletteShape = {
  surfaces: {
    canvas: 0,
    surface: 1,
    raised: 2,
    sunken: 3,
  },
  roles: {
    primary: {
      foreground: {
        default: 4,
        hover: 5,
        pressed: 6,
        suppl: 7,
      },
      solid: {
        background: {
          default: 8,
          hover: 9,
          pressed: 10,
          focus: 11,
        },
        foreground: 12,
        border: 13,
      },
      soft: {
        background: {
          default: 14,
          hover: 15,
          pressed: 16,
        },
        foreground: 17,
        icon: 18,
        border: 19,
      },
      focus: 20,
      disabled: {
        background: 21,
        foreground: 22,
        border: 23,
      },
    },
    info: {
      foreground: {
        default: 24,
        hover: 25,
        pressed: 26,
        suppl: 27,
      },
      solid: {
        background: {
          default: 28,
          hover: 29,
          pressed: 30,
          focus: 31,
        },
        foreground: 32,
        border: 33,
      },
      soft: {
        background: {
          default: 34,
          hover: 35,
          pressed: 36,
        },
        foreground: 37,
        icon: 38,
        border: 39,
      },
      focus: 40,
      disabled: {
        background: 41,
        foreground: 42,
        border: 43,
      },
    },
    success: {
      foreground: {
        default: 44,
        hover: 45,
        pressed: 46,
        suppl: 47,
      },
      solid: {
        background: {
          default: 48,
          hover: 49,
          pressed: 50,
          focus: 51,
        },
        foreground: 52,
        border: 53,
      },
      soft: {
        background: {
          default: 54,
          hover: 55,
          pressed: 56,
        },
        foreground: 57,
        icon: 58,
        border: 59,
      },
      focus: 60,
      disabled: {
        background: 61,
        foreground: 62,
        border: 63,
      },
    },
    warning: {
      foreground: {
        default: 64,
        hover: 65,
        pressed: 66,
        suppl: 67,
      },
      solid: {
        background: {
          default: 68,
          hover: 69,
          pressed: 70,
          focus: 71,
        },
        foreground: 72,
        border: 73,
      },
      soft: {
        background: {
          default: 74,
          hover: 75,
          pressed: 76,
        },
        foreground: 77,
        icon: 78,
        border: 79,
      },
      focus: 80,
      disabled: {
        background: 81,
        foreground: 82,
        border: 83,
      },
    },
    error: {
      foreground: {
        default: 84,
        hover: 85,
        pressed: 86,
        suppl: 87,
      },
      solid: {
        background: {
          default: 88,
          hover: 89,
          pressed: 90,
          focus: 91,
        },
        foreground: 92,
        border: 93,
      },
      soft: {
        background: {
          default: 94,
          hover: 95,
          pressed: 96,
        },
        foreground: 97,
        icon: 98,
        border: 99,
      },
      focus: 100,
      disabled: {
        background: 101,
        foreground: 102,
        border: 103,
      },
    },
    neutral: {
      foreground: {
        default: 104,
        hover: 105,
        pressed: 106,
        suppl: 107,
      },
      solid: {
        background: {
          default: 108,
          hover: 109,
          pressed: 110,
          focus: 111,
        },
        foreground: 112,
        border: 113,
      },
      soft: {
        background: {
          default: 114,
          hover: 115,
          pressed: 116,
        },
        foreground: 117,
        icon: 118,
        border: 119,
      },
      focus: 120,
      disabled: {
        background: 121,
        foreground: 122,
        border: 123,
      },
    },
  },
  text: {
    primary: 124,
    secondary: 125,
    muted: 126,
    onSurface: 127,
  },
  borders: {
    control: 128,
    decorative: 129,
  },
  tooltip: {
    background: 130,
    foreground: 131,
  },
} as const

type ThemeId = 'royal-iris' | 'cobalt-tide' | 'emerald-grove' | 'ember-coral' | 'berry-bloom'
type PublicColorRole = (typeof activePublicColorRoles)[number]['publicRole']
type ThemePlane = Readonly<Record<PublicColorRole, string>>
interface ThemePlanes {
  readonly light: { readonly standard: ThemePlane; readonly enhanced: ThemePlane }
  readonly dark: { readonly standard: ThemePlane; readonly enhanced: ThemePlane }
}

function resolvePaletteValue(value: string, palette: unknown): string {
  if (!value.startsWith('{palette.')) return value
  let resolved: unknown = palette
  for (const key of value.slice('{palette.'.length, -1).split('.')) {
    if (resolved === null || typeof resolved !== 'object')
      throw new Error('Invalid generated palette path.')
    resolved = (resolved as Readonly<Record<string, unknown>>)[key]
  }
  if (typeof resolved !== 'string') throw new Error('Missing generated palette color.')
  return resolved
}

function decodePalette(packed: string): ThemeColorPalettes {
  const bytes = atob(packed)
  if (bytes.length !== 1584) throw new Error('Incomplete generated palette.')
  const digits = '0123456789ABCDEF'
  const hex = (offset: number) =>
    digits.charAt(bytes.charCodeAt(offset) >> 4) + digits.charAt(bytes.charCodeAt(offset) & 15)
  function plane(offset: number): ThemeColorPalettes['light']['standard'] {
    function decode(shape: unknown): unknown {
      if (typeof shape === 'number') {
        const index = (offset + shape) * 3
        if (!Number.isInteger(index) || index < 0 || index + 2 >= bytes.length)
          throw new Error('Missing generated palette value.')
        return '#' + hex(index) + hex(index + 1) + hex(index + 2)
      }
      return Object.fromEntries(
        Object.entries(shape as Readonly<Record<string, unknown>>).map(([key, value]) => [
          key,
          decode(value),
        ]),
      )
    }
    return decode(paletteShape) as ThemeColorPalettes['light']['standard']
  }
  return {
    light: { standard: plane(0), enhanced: plane(132) },
    dark: { standard: plane(264), enhanced: plane(396) },
  }
}

function createBuiltInTheme(
  themeId: ThemeId,
  label: string,
  source: string,
  planes: ThemePlanes,
  packedPalette: string,
) {
  const uiPalette = decodePalette(packedPalette)
  const records = bankTemplates.map((template) => {
    const authoredValue = planes[template.colorMode][template.contrast][template.publicRole]
    return {
      ...template,
      authoredValue,
      resolvedValue: resolvePaletteValue(
        authoredValue,
        uiPalette[template.colorMode][template.contrast],
      ),
    }
  })
  return {
    registryKind: 'built-in',
    themeId,
    definition: { schemaVersion: 3, roleContractVersion: 4, id: themeId, label, planes },
    source,
    uiPalette,
    bank: { visibility: 'ui-internal', records },
  } as const
}

export const generatedThemeRegistry = {
  roleContractVersion: 4,
  builtInRegistryOrder: [
    'royal-iris',
    'cobalt-tide',
    'emerald-grove',
    'ember-coral',
    'berry-bloom',
  ],
  activePublicColorRoles: activePublicColorRoles,
  alphaContracts: [
    {
      id: 'alpha-scrim-viewport',
      roleId: 'color.scrim.viewport',
      minimumAlpha: 0.56,
      maximumAlpha: 0.56,
    },
  ],
  namedContrasts: [
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
    {
      id: 'status-info-on-page',
      foregroundRole: 'color.control.info',
      backgroundRole: 'color.surface.page',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'status-success-on-page',
      foregroundRole: 'color.control.success',
      backgroundRole: 'color.surface.page',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'status-warning-on-page',
      foregroundRole: 'color.control.warning',
      backgroundRole: 'color.surface.page',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'status-error-on-page',
      foregroundRole: 'color.control.error',
      backgroundRole: 'color.surface.page',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'status-info-on-panel',
      foregroundRole: 'color.control.info',
      backgroundRole: 'color.surface.panel',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'status-success-on-panel',
      foregroundRole: 'color.control.success',
      backgroundRole: 'color.surface.panel',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'status-warning-on-panel',
      foregroundRole: 'color.control.warning',
      backgroundRole: 'color.surface.panel',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'status-error-on-panel',
      foregroundRole: 'color.control.error',
      backgroundRole: 'color.surface.panel',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'on-status-info-on-default',
      foregroundRole: 'color.text.on-status.info',
      backgroundRole: 'color.status.info',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: true,
      staticMaterialProjections: [],
    },
    {
      id: 'on-status-success-on-default',
      foregroundRole: 'color.text.on-status.success',
      backgroundRole: 'color.status.success',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: true,
      staticMaterialProjections: [],
    },
    {
      id: 'on-status-warning-on-default',
      foregroundRole: 'color.text.on-status.warning',
      backgroundRole: 'color.status.warning',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: true,
      staticMaterialProjections: [],
    },
    {
      id: 'on-status-error-on-default',
      foregroundRole: 'color.text.on-status.error',
      backgroundRole: 'color.status.error',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: true,
      staticMaterialProjections: [],
    },
    {
      id: 'on-status-info-on-hover',
      foregroundRole: 'color.text.on-status.info',
      backgroundRole: 'color.status.info.hover',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: true,
      staticMaterialProjections: [],
    },
    {
      id: 'on-status-success-on-hover',
      foregroundRole: 'color.text.on-status.success',
      backgroundRole: 'color.status.success.hover',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: true,
      staticMaterialProjections: [],
    },
    {
      id: 'on-status-warning-on-hover',
      foregroundRole: 'color.text.on-status.warning',
      backgroundRole: 'color.status.warning.hover',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: true,
      staticMaterialProjections: [],
    },
    {
      id: 'on-status-error-on-hover',
      foregroundRole: 'color.text.on-status.error',
      backgroundRole: 'color.status.error.hover',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: true,
      staticMaterialProjections: [],
    },
    {
      id: 'on-status-info-on-pressed',
      foregroundRole: 'color.text.on-status.info',
      backgroundRole: 'color.status.info.pressed',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: true,
      staticMaterialProjections: [],
    },
    {
      id: 'on-status-success-on-pressed',
      foregroundRole: 'color.text.on-status.success',
      backgroundRole: 'color.status.success.pressed',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: true,
      staticMaterialProjections: [],
    },
    {
      id: 'on-status-warning-on-pressed',
      foregroundRole: 'color.text.on-status.warning',
      backgroundRole: 'color.status.warning.pressed',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: true,
      staticMaterialProjections: [],
    },
    {
      id: 'on-status-error-on-pressed',
      foregroundRole: 'color.text.on-status.error',
      backgroundRole: 'color.status.error.pressed',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: true,
      staticMaterialProjections: [],
    },
  ],
  customBankVariables: bankTemplates.map((record) => record.bankVariable),
  builtInEntries: [
    createBuiltInTheme(
      'royal-iris',
      'Royal Iris',
      'themes/complete/royal-iris.theme.json',
      authoredPlanes,
      '+Pj//Pz88PH+6+v8dyfggDbtawfRey7mgzrwjUf8dSTegzrw/Pz8gzrw8/D/7ur/6eP/dyfgdyfgkG7fgDbt8PH+ZGR7v7/fAGOTAG2iAFaAAGeZAHClAHq1AGGQAHCl+/z8AHCl5/X/3fH/0uz/AGOTAGOTL4rCAG2i8PH+ZGR7v7/fAG1AAHhIAF43AHJDAHlIAIRPAGg9AHlI+/z7AHlI3fzn2Pfi0vHdAG1AAG1AK5VhAHhI8PH+ZGR7v7/ffFUAiV8AbEoAglkAjWEAmmoAe1QAjWEA/Pz7jWEA//Da/evP9+XJfFUAfFUAqnkciV8A8PH+ZGR7v7/fvAApzgAupgAjxAAr0wIv4CA6ugAo0wIv/Pv70wIv/+7t/+fm/9/dvAApvAAp0F5fzgAu8PH+ZGR7v7/fW1txZWV7T09kX191Z2d+cXGIWVlvZ2d+/Pz8Z2d+8fH97Oz35ubxW1txW1txgYGRZWV78PH+ZGR7v7/fGxotVVVrZGR7Gxotg4Oov7/fHh4r+Pj/+Pj//Pz88PH+6+v8XgC6aQLPUACgYwDDaADMcRzZWACvaADM/Pz8aADM+Pb/8/D/7+v/XgC6XgC6lHLjaQLP8PH+TExhv7/fAEhtAFJ7ADxbAE1zAFF6AFuIAENmAFF6+/z8AFF68Pn/6PX/3vH/AEhtAEhtM43FAFJ78PH+TExhv7/fAFAuAFo1AEIlAFQxAFgzAGM6AEkpAFgz+/z7AFgz5v/u3fzo2PfjAFAuAFAuLpdiAFo18PH+TExhv7/fXT8AaUcATjQAYkIAaEcAdE8AVzoAaEcA/Pz7aEcA//bp//Hb/uvPXT8AXT8Ar30haUcA8PH+TExhv7/fjwAdoAAhegAXlgAfngAhrwAlhgAangAh/Pv7ngAh//X0/+7t/+fmjwAdjwAd1WJioAAh8PH+TExhv7/fQ0NXTExhNzdLR0dcS0tgVVRqPj5SS0tg/Pz8S0tg9vf/8fL97O34Q0NXQ0NXhYWUTExh8PH+TExhv7/fGxotPj1STExhGxotg4Oov7/fHh4r+Pj/EBAcGhopJSU5CgoStZr/wKv/qYb/uqP/gzrwjUf8dSTegzrw/Pz8wKv/KCI5Lig/NC9GtZr/tZr/i2nYwKv/JSU5mpuzQD9aMLT/X8D/AKXySrr/AHClAHq1AGGQAHCl+/z8X8D/ESk5GC8/HjZGMLT/MLT/KIW8X8D/JSU5mpuzQD9aAMR4ANOBALRuAMt9AHlIAIRPAGg9AHlI+/z7ANOBEy0eGTMkIDkqAMR4AMR4I5BbANOBJSU5mpuzQD9a4J0A8KgAzpAA6KIAjWEAmmoAe1QAjWEA/Pz78KgAMiQMOCoTPzAZ4J0A4J0ApHQR8KgAJSU5mpuzQD9a/4WE/5yZ/2hr/5GO0wIv4CA6ugAo0wIv/Pv7/5yZOB4dPyQjRiop/4WE/4WEyVhZ/5yZJSU5mpuzQD9ap6jAtLTNmZqyrq7GZ2d+cXGIWVlvZ2d+/Pz8tLTNJSYuLCw0MjI6p6jAp6jAe3yLtLTNJSU5mpuzQD9a9vb8q6zEmpuz9vb8b26SQD9a8fH/GhohEBAcGhopJSU5CgoSyrn/1cr/vaf/0ML/aADMcRzZWACvaADM/Pz81cr/IRsxJSA2KiU7yrn/yrn/gF7N1cr/JSU5tLTNQD9agsz/n9f/W7//kdH/AFF6AFuIAENmAFF6+/z8n9f/CiIxDyc2FCw7gsz/gsz/GXuxn9f/JSU5tLTNQD9aCOGLMO+YANGAIeiRAFgzAGM6AEkpAFgz+/z7MO+YDCUXESocFi8gCOGLCOGLEYZSMO+YJSU5tLTNQD9a/7QX/8dr7qcA/75MaEcAdE8AVzoAaEcA/Pz7/8drKhwFLyEKNCYP/7QX/7QXmWoA/8drJSU5tLTNQD9a/66q/8G+/5aT/7i0ngAhrwAlhgAangAh/Pv7/8G+MRcWNhsbOyAf/66q/66qvk1P/8G+JSU5tLTNQD9awMHazc7nsrPLx8fgS0tgVVRqPj5SS0tg/Pz8zc7nHh4mIyMrKCgwwMHawMHacXKBzc7nJSU5tLTNQD9a9vb8xcbftLTN9vb8b26SQD9a8fH/Ghoh',
    ),
    createBuiltInTheme(
      'cobalt-tide',
      'Cobalt Tide',
      'themes/complete/cobalt-tide.theme.json',
      authoredPlanes,
      '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',
    ),
    createBuiltInTheme(
      'emerald-grove',
      'Emerald Grove',
      'themes/complete/emerald-grove.theme.json',
      authoredPlanes,
      '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',
    ),
    createBuiltInTheme(
      'ember-coral',
      'Ember Coral',
      'themes/complete/ember-coral.theme.json',
      authoredPlanes,
      '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',
    ),
    createBuiltInTheme(
      'berry-bloom',
      'Berry Bloom',
      'themes/complete/berry-bloom.theme.json',
      authoredPlanes,
      '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',
    ),
  ],
  statusSupplementary: {
    light: {
      standard: {
        info: 'rgba(44, 107, 155, 1)',
        success: 'rgba(54, 118, 70, 1)',
        warning: 'rgba(135, 93, 19, 1)',
        error: 'rgba(151, 77, 72, 1)',
      },
      enhanced: {
        info: 'rgba(30, 70, 101, 1)',
        success: 'rgba(36, 77, 46, 1)',
        warning: 'rgba(88, 60, 16, 1)',
        error: 'rgba(98, 50, 47, 1)',
      },
    },
    dark: {
      standard: {
        info: 'rgba(103, 165, 217, 1)',
        success: 'rgba(111, 176, 125, 1)',
        warning: 'rgba(195, 149, 83, 1)',
        error: 'rgba(214, 133, 127, 1)',
      },
      enhanced: {
        info: 'rgba(161, 201, 236, 1)',
        success: 'rgba(167, 209, 174, 1)',
        warning: 'rgba(221, 191, 149, 1)',
        error: 'rgba(236, 180, 175, 1)',
      },
    },
  },
} as const
