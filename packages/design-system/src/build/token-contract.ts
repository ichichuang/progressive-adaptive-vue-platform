import type { TokenConditions, TokenVisibility } from '../schema/token.schema'

export type TokenTier = 'primitive' | 'density' | 'semantic' | 'semantic.material' | 'component'

export interface TokenRoleMetadata {
  category: string
  name: string
}

export type TokenOutput =
  'runtime-css' | 'public-typescript' | 'public-token-names' | 'unocss' | 'manifest'

export const colorCompoundBudget = 8

const conditionAxisOrder = [
  'theme',
  'colorMode',
  'contrast',
  'density',
  'material',
] as const satisfies readonly (keyof TokenConditions)[]

export const tierDefaultVisibility = {
  primitive: 'build-only',
  density: 'build-only',
  semantic: 'public',
  'semantic.material': 'ui-internal',
  component: 'ui-internal',
} as const satisfies Record<TokenTier, TokenVisibility>

const outputVisibility = {
  'runtime-css': new Set<TokenVisibility>(['public', 'ui-internal']),
  'public-typescript': new Set<TokenVisibility>(['public']),
  'public-token-names': new Set<TokenVisibility>(['public']),
  unocss: new Set<TokenVisibility>(['public']),
  manifest: new Set<TokenVisibility>(['public', 'ui-internal', 'build-only']),
} as const satisfies Record<TokenOutput, ReadonlySet<TokenVisibility>>

const visibilityRank = {
  public: 0,
  'ui-internal': 1,
  'build-only': 2,
} as const satisfies Record<TokenVisibility, number>

export function assertVisibilityNarrowing(
  visibility: TokenVisibility,
  enforcedVisibility: TokenVisibility,
  context: string,
): void {
  if (visibilityRank[visibility] < visibilityRank[enforcedVisibility]) {
    throw new Error(
      `${context}: visibility "${visibility}" illegally widens enforced visibility "${enforcedVisibility}".`,
    )
  }
}

export function visibilityEntersOutput(visibility: TokenVisibility, output: TokenOutput): boolean {
  return outputVisibility[output].has(visibility)
}

export function orderedConditions(conditions: TokenConditions | undefined): TokenConditions {
  if (conditions === undefined) {
    return {}
  }

  return {
    ...(conditions.theme === undefined ? {} : { theme: conditions.theme }),
    ...(conditions.colorMode === undefined ? {} : { colorMode: conditions.colorMode }),
    ...(conditions.contrast === undefined ? {} : { contrast: conditions.contrast }),
    ...(conditions.density === undefined ? {} : { density: conditions.density }),
    ...(conditions.material === undefined ? {} : { material: conditions.material }),
  }
}

export function conditionEntries(
  conditions: TokenConditions,
): readonly (readonly [keyof TokenConditions, string])[] {
  return conditionAxisOrder.flatMap((axis) => {
    const value = conditions[axis]
    return value === undefined ? [] : ([[axis, value]] as const)
  })
}

export function conditionKey(conditions: TokenConditions): string {
  return conditionEntries(conditions)
    .map(([axis, value]) => `${axis}=${value}`)
    .join(';')
}

export function roleMetadata(name: string): TokenRoleMetadata {
  const [category] = name.split('.')

  if (category === undefined || category.length === 0) {
    throw new Error(`${name}: token role must have a category.`)
  }

  return {
    category,
    name,
  }
}

export function cssVariableForRole(role: TokenRoleMetadata): string {
  const segments = role.name.split('.')
  const root = segments.shift()

  if (root === 'material') {
    return `--ui-material-${segments.join('-')}`
  }

  if (root === 'color') {
    return `--ui-color-${segments.join('-')}`
  }

  if (root === 'spacing') {
    return `--ui-space-${segments.join('-')}`
  }

  if (root === 'typography') {
    return `--ui-font-${segments.join('-')}`
  }

  if (root === 'interaction') {
    const family = segments.shift()
    const namespace = {
      control: 'control',
      motion: 'motion',
      radius: 'radius',
      shadow: 'shadow',
    }[family ?? '']

    if (namespace !== undefined) {
      return `--ui-${namespace}-${segments.join('-')}`
    }
  }

  if (root === 'layout') {
    const family = segments.shift()

    if (family === 'z') {
      return `--ui-z-${segments.join('-')}`
    }

    return `--ui-layout-${[family, ...segments].filter(Boolean).join('-')}`
  }

  throw new Error(`${role.name}: runtime token has no canonical --ui-* namespace mapping.`)
}
