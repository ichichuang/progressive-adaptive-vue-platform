import Color from 'colorjs.io'
import { z } from 'zod'

import { tokenReferenceSchema } from './token.schema'

export const builtInThemeIds = ['neutral', 'ocean', 'warm'] as const
export const completeThemeSchemaVersion = 3 as const
export const completeThemeRoleContractVersion = 1 as const
export const builtInThemeIdSchema = z.enum(builtInThemeIds)
export const customThemeIdSchema = z.string().min(1).brand<'CustomThemeId'>()

const cssWideKeywords = new Set(['inherit', 'initial', 'revert', 'revert-layer', 'unset'])
const systemColorKeywords = new Set(
  [
    'accentcolor',
    'accentcolortext',
    'activeborder',
    'activecaption',
    'activetext',
    'appworkspace',
    'background',
    'buttonborder',
    'buttonface',
    'buttonhighlight',
    'buttonshadow',
    'buttontext',
    'canvas',
    'canvastext',
    'captiontext',
    'field',
    'fieldtext',
    'graytext',
    'highlight',
    'highlighttext',
    'inactiveborder',
    'inactivecaption',
    'inactivecaptiontext',
    'infobackground',
    'infotext',
    'linktext',
    'mark',
    'marktext',
    'menu',
    'menutext',
    'scrollbar',
    'selecteditem',
    'selecteditemtext',
    'threeddarkshadow',
    'threedface',
    'threedhighlight',
    'threedlightshadow',
    'threedshadow',
    'visitedtext',
    'window',
    'windowframe',
    'windowtext',
  ].map((value) => value.toLowerCase()),
)
const forbiddenComputedColorSyntax =
  /\b(?:attr|calc|color-mix|env|light-dark|var)\s*\(|\bcurrentcolor\b|\(\s*from\b/iu
const supportedAbsoluteColorSyntax =
  /^(?:#[0-9a-f]{3,4}|#[0-9a-f]{6}|#[0-9a-f]{8}|[a-z][a-z0-9-]*|(?:hsl|hsla|hwb|lab|lch|oklab|oklch|rgb|rgba)\(.+\)|color\(\s*srgb\s+.+\))$/iu

function isSupportedAbsoluteCssColor(value: string): boolean {
  const trimmed = value.trim()
  const normalized = trimmed.toLowerCase()

  if (
    normalized.length === 0 ||
    trimmed !== value ||
    !supportedAbsoluteColorSyntax.test(normalized) ||
    cssWideKeywords.has(normalized) ||
    systemColorKeywords.has(normalized) ||
    forbiddenComputedColorSyntax.test(normalized)
  ) {
    return false
  }

  try {
    const color = new Color(value)

    return color.inGamut('srgb')
  } catch {
    return false
  }
}

const absoluteCssColorSchema = z.string().refine(isSupportedAbsoluteCssColor, {
  error: 'Expected an unchanged absolute CSS color representable in sRGB.',
})

const directPrimitiveOrAbsoluteColorSchema = z.union([tokenReferenceSchema, absoluteCssColorSchema])
const absoluteColorRoleMapSchema = z.record(z.string(), absoluteCssColorSchema)
const authoredColorRoleMapSchema = z.record(z.string(), directPrimitiveOrAbsoluteColorSchema)

function planeSchema(roleMapSchema: typeof authoredColorRoleMapSchema) {
  return z.strictObject({
    standard: roleMapSchema,
    enhanced: roleMapSchema,
  })
}

const neutralPlanesSchema = z.strictObject({
  light: z.strictObject({
    standard: absoluteColorRoleMapSchema,
    enhanced: absoluteColorRoleMapSchema,
  }),
  dark: z.strictObject({
    standard: absoluteColorRoleMapSchema,
    enhanced: absoluteColorRoleMapSchema,
  }),
})

const nonNeutralPlanesSchema = z.strictObject({
  light: planeSchema(authoredColorRoleMapSchema),
  dark: planeSchema(authoredColorRoleMapSchema),
})

const customPlanesSchema = z.strictObject({
  light: z.strictObject({
    standard: absoluteColorRoleMapSchema,
    enhanced: absoluteColorRoleMapSchema,
  }),
  dark: z.strictObject({
    standard: absoluteColorRoleMapSchema,
    enhanced: absoluteColorRoleMapSchema,
  }),
})

const completeThemeContractShape = {
  schemaVersion: z.literal(completeThemeSchemaVersion),
  roleContractVersion: z.literal(completeThemeRoleContractVersion),
  label: z.string().min(1),
}

export const completeBuiltInThemeDefinitionSchema = z.discriminatedUnion('id', [
  z.strictObject({
    ...completeThemeContractShape,
    id: z.literal('neutral'),
    planes: neutralPlanesSchema,
  }),
  z.strictObject({
    ...completeThemeContractShape,
    id: z.enum(['ocean', 'warm']),
    planes: nonNeutralPlanesSchema,
  }),
])

export const customThemeDefinitionSchema = z.strictObject({
  ...completeThemeContractShape,
  id: customThemeIdSchema,
  planes: customPlanesSchema,
})

export type BuiltInThemeId = z.infer<typeof builtInThemeIdSchema>
export type BuiltInThemeDefinition = z.infer<typeof completeBuiltInThemeDefinitionSchema>
export type CustomThemeId = z.infer<typeof customThemeIdSchema>
export type CustomThemeDefinition = z.infer<typeof customThemeDefinitionSchema>
