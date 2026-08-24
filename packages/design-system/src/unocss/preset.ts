import { definePreset, type Rule, type Variant } from '@unocss/core'
import type { Preset } from 'unocss'

import { layoutRegistry, type LayoutTokenId } from '../generated/layout-registry'
import { platformRules, platformTheme, platformUnoMappings } from '../generated/unocss-theme'

const wind4ThemeFamily = {
  'font-family': 'font',
  'font-weight': 'fontWeight',
  'line-height': 'leading',
  radius: 'radius',
  shadow: 'shadow',
} as const
const wind4RadiusDirections = [
  '',
  'l',
  'r',
  't',
  'b',
  's',
  'e',
  'tl',
  'lt',
  'tr',
  'rt',
  'bl',
  'lb',
  'br',
  'rb',
  'bs',
  'be',
  'is',
  'ie',
  'ss',
  'se',
  'es',
  'ee',
  'bs-is',
  'is-bs',
  'bs-ie',
  'ie-bs',
  'be-is',
  'is-be',
  'be-ie',
  'ie-be',
] as const
const wind4RadiusPrefixes = [
  'rounded',
  'rd',
  'border-rounded',
  'border-rd',
  'b-rounded',
  'b-rd',
] as const
const wind4LeadingPrefixes = [
  'leading',
  'lh',
  'line-height',
  'font-leading',
  'font-lh',
  'font-line-height',
] as const
const wind4ShadowModifierRepresentatives = ['50', '[50%]', '$opacity'] as const
type PlatformUnoMapping = (typeof platformUnoMappings)[number]
type PlatformClassMapping = Extract<
  PlatformUnoMapping,
  { readonly generatorKind: 'exact-rule' | 'theme-entry' }
>

function isClassMapping(mapping: PlatformUnoMapping): mapping is PlatformClassMapping {
  return mapping.generatorKind !== 'container-variant'
}

const classMappings = platformUnoMappings.filter(isClassMapping)
const themeMappings = classMappings.filter((mapping) => mapping.generatorKind === 'theme-entry')
const registeredPublicClasses = new Set<string>(classMappings.flatMap((mapping) => mapping.classes))

function layoutThreshold(id: LayoutTokenId): string {
  const record = layoutRegistry.records.find((candidate) => candidate.id === id)

  if (record?.kind !== 'profile-threshold') {
    throw new Error(`${id}: generated Layout Registry profile threshold is missing.`)
  }

  return record.resolvedValue
}

const regularMinimum = layoutThreshold('layout.profile.regular.min-inline-size')
const wideMinimum = layoutThreshold('layout.profile.wide.min-inline-size')

function containerVariant(name: string, condition: string): Variant {
  const prefix = `${name}:`

  return {
    name,
    match(matcher) {
      if (!matcher.startsWith(prefix)) {
        return undefined
      }

      return {
        matcher: matcher.slice(prefix.length),
        parent: `@container pavp-admin-shell (${condition})`,
      }
    },
  }
}

const layoutVariants = [
  containerVariant('layout-narrow', `inline-size < ${regularMinimum}`),
  containerVariant('layout-regular', `${regularMinimum} <= inline-size < ${wideMinimum}`),
  containerVariant('layout-wide', `${wideMinimum} <= inline-size`),
]

export interface Wind4RestrictedThemeAliasCandidate {
  readonly className: string
  readonly roleId: string
  readonly template: string
}

export interface Wind4PublicVariableBypassCandidate {
  readonly className: string
  readonly roleId: string
  readonly template: string
}

function escapeRegularExpression(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function semanticCssProperty(mapping: PlatformUnoMapping): string {
  if (mapping.generatorKind === 'container-variant') {
    return 'width'
  }

  return (
    mapping.allowedCssProperties.find((property) => !property.startsWith('--')) ??
    mapping.allowedCssProperties[0]
  )
}

function themeAliasCandidate(
  mapping: (typeof themeMappings)[number],
  className: string,
  template: string,
): Wind4RestrictedThemeAliasCandidate {
  return {
    className,
    roleId: mapping.roleId,
    template,
  }
}

function directThemeAliasCandidates(
  mapping: (typeof themeMappings)[number],
  textSizeKeys: readonly string[],
): Wind4RestrictedThemeAliasCandidate[] {
  if (mapping.family === 'radius') {
    return wind4RadiusPrefixes.flatMap((prefix) =>
      wind4RadiusDirections.map((direction) =>
        themeAliasCandidate(
          mapping,
          [prefix, direction, mapping.key].filter(Boolean).join('-'),
          `radius:${prefix}:${direction || 'all'}`,
        ),
      ),
    )
  }

  if (mapping.family === 'shadow') {
    const bases = [`shadow-${mapping.key}`, `shadow${mapping.key}`]

    return [
      ...bases.map((base) => themeAliasCandidate(mapping, base, 'shadow:direct')),
      ...bases.flatMap((base) =>
        wind4ShadowModifierRepresentatives.map((modifier) =>
          themeAliasCandidate(mapping, `${base}/${modifier}`, `shadow:modifier:${modifier}`),
        ),
      ),
    ]
  }

  if (mapping.family === 'line-height') {
    const textSizes = [...new Set([...textSizeKeys, '1rem', '[1rem]', '[length:1rem]'])]

    return [
      ...wind4LeadingPrefixes.map((prefix) =>
        themeAliasCandidate(mapping, `${prefix}-${mapping.key}`, `leading:${prefix}`),
      ),
      ...textSizes.flatMap((textSize) =>
        ['/', ':'].map((separator) =>
          themeAliasCandidate(
            mapping,
            `text-${textSize}${separator}${mapping.key}`,
            `text-leading:${separator}:${textSize}`,
          ),
        ),
      ),
    ]
  }

  const candidates = [themeAliasCandidate(mapping, `font-${mapping.key}`, 'font:direct')]

  if (mapping.family === 'font-weight' && !mapping.key.includes('-')) {
    candidates.push(
      themeAliasCandidate(mapping, `fw-${mapping.key}`, 'font-weight:fw-hyphen'),
      themeAliasCandidate(mapping, `fw${mapping.key}`, 'font-weight:fw'),
    )
  }

  return candidates
}

function arbitraryThemeAliasCandidates(
  mapping: (typeof themeMappings)[number],
): Wind4RestrictedThemeAliasCandidate[] {
  const family = wind4ThemeFamily[mapping.family]
  const path = `${family}.${mapping.key}`
  const mirrorVariable = `--${family}-${mapping.key}`
  const property = semanticCssProperty(mapping)
  const candidates = [
    [`[${property}:theme(${path})]`, 'arbitrary:theme'],
    [`[${property}:theme('${path}')]`, 'arbitrary:theme-single-quoted'],
    [`[${property}:theme("${path}")]`, 'arbitrary:theme-double-quoted'],
    [`[${property}:--${path}]`, 'arbitrary:dotted-theme-variable'],
    [`[${property}:$${path}]`, 'arbitrary:dotted-theme-variable-shortcut'],
    [`[${property}:${mirrorVariable}]`, 'arbitrary:mirror-variable'],
    [`[${property}:$${mirrorVariable.slice(2)}]`, 'arbitrary:mirror-variable-shortcut'],
    [`[${property}:var(${mirrorVariable})]`, 'arbitrary:mirror-variable-function'],
    [`hover:[${property}:theme(${path})]`, 'variant:theme'],
  ] as const
  const utilityCandidates =
    mapping.family === 'font-family'
      ? [
          [`font-[family:theme(${path})]`, 'font-family:theme'],
          [`font-[family:--${path}]`, 'font-family:dotted-theme-variable'],
        ]
      : mapping.family === 'font-weight'
        ? [
            [`font-[number:theme(${path})]`, 'font-weight:theme'],
            [`font-[number:--${path}]`, 'font-weight:dotted-theme-variable'],
          ]
        : mapping.family === 'line-height'
          ? [
              [`leading-[theme(${path})]`, 'leading:theme'],
              [`leading-[--${path}]`, 'leading:dotted-theme-variable'],
            ]
          : mapping.family === 'radius'
            ? [
                [`rounded-[theme(${path})]`, 'radius:theme'],
                [`rounded-[--${path}]`, 'radius:dotted-theme-variable'],
              ]
            : [
                [`shadow-[theme(${path})]`, 'shadow:theme'],
                [`shadow[theme(${path})]`, 'shadow:theme-no-hyphen'],
                [`shadow-[--${path}]`, 'shadow:dotted-theme-variable'],
              ]

  return [...candidates, ...utilityCandidates].map(([className, template]) =>
    themeAliasCandidate(mapping, className, template),
  )
}

export function wind4RestrictedThemeAliasCandidates(
  textSizeKeys: readonly string[] = [],
): readonly Wind4RestrictedThemeAliasCandidate[] {
  const candidates = themeMappings.flatMap((mapping) => [
    ...directThemeAliasCandidates(mapping, textSizeKeys),
    ...arbitraryThemeAliasCandidates(mapping),
  ])
  const seen = new Set<string>()

  return candidates.filter(({ className }) => {
    if (registeredPublicClasses.has(className) || seen.has(className)) {
      return false
    }

    seen.add(className)
    return true
  })
}

export const wind4RestrictedThemeSafelistPaths = themeMappings.map(
  (mapping) => `${wind4ThemeFamily[mapping.family]}:${mapping.key}`,
)

export const wind4PublicVariableBypassCandidates: readonly Wind4PublicVariableBypassCandidate[] =
  platformUnoMappings.flatMap((mapping) => {
    const property = semanticCssProperty(mapping)
    const shorthandVariable = `$${mapping.cssVariable.slice(2)}`

    return [
      {
        className: `[${property}:var(${mapping.cssVariable})]`,
        roleId: mapping.roleId,
        template: 'public-variable:function',
      },
      {
        className: `[${property}:${mapping.cssVariable}]`,
        roleId: mapping.roleId,
        template: 'public-variable:direct',
      },
      {
        className: `[${property}:${shorthandVariable}]`,
        roleId: mapping.roleId,
        template: 'public-variable:shortcut',
      },
    ]
  })

const directThemeGrammarPatterns = themeMappings.flatMap((mapping) => {
  const key = escapeRegularExpression(mapping.key)

  if (mapping.family === 'radius') {
    const directions = wind4RadiusDirections
      .filter(Boolean)
      .map(escapeRegularExpression)
      .sort((left, right) => right.length - left.length)
      .join('|')

    return [new RegExp(`^(?:border-|b-)?(?:rounded|rd)(?:-(?:${directions}))?-${key}$`, 'u')]
  }

  if (mapping.family === 'shadow') {
    return [new RegExp(`^shadow-?${key}(?:/.*)?$`, 'u')]
  }

  if (mapping.family === 'line-height') {
    return [
      new RegExp(`^(?:font-)?(?:leading|lh|line-height)-${key}$`, 'u'),
      new RegExp(`^text-.+(?:/|:)${key}$`, 'u'),
    ]
  }

  if (mapping.family === 'font-weight' && !mapping.key.includes('-')) {
    return [new RegExp(`^font-${key}$`, 'u'), new RegExp(`^fw-?${key}$`, 'u')]
  }

  return [new RegExp(`^font-${key}$`, 'u')]
})

function containsBoundedReference(selector: string, reference: string): boolean {
  return new RegExp(`${escapeRegularExpression(reference)}(?=$|[^a-zA-Z0-9_.-])`, 'u').test(
    selector,
  )
}

function referencesThemeMapping(
  selector: string,
  mapping: (typeof themeMappings)[number],
): boolean {
  const family = wind4ThemeFamily[mapping.family]
  const path = `${family}.${mapping.key}`
  const mirrorVariable = `--${family}-${mapping.key}`
  const themeCall = new RegExp(
    `theme\\(\\s*(['"]?)${escapeRegularExpression(path)}(?:/[^'")\\s]+)?\\1\\s*\\)`,
    'u',
  )

  return (
    themeCall.test(selector) ||
    containsBoundedReference(selector, `--${path}`) ||
    containsBoundedReference(selector, `$${path}`) ||
    containsBoundedReference(selector, mirrorVariable) ||
    containsBoundedReference(selector, `$${mirrorVariable.slice(2)}`)
  )
}

function referencesPublicVariable(selector: string): boolean {
  return platformUnoMappings.some(
    (mapping) =>
      containsBoundedReference(selector, mapping.cssVariable) ||
      containsBoundedReference(selector, `$${mapping.cssVariable.slice(2)}`),
  )
}

function blocksUnregisteredThemeUtility(selector: string): boolean {
  if (registeredPublicClasses.has(selector)) {
    return false
  }

  return (
    referencesPublicVariable(selector) ||
    directThemeGrammarPatterns.some((pattern) => pattern.test(selector)) ||
    themeMappings.some((mapping) => referencesThemeMapping(selector, mapping))
  )
}

export const platformPreset = definePreset((): Preset => ({
  name: '@platform/design-system',
  blocklist: [blocksUnregisteredThemeUtility],
  rules: platformRules.map(([className, declarations]) => [className, declarations] as Rule),
  theme: platformTheme,
  variants: layoutVariants,
}))
