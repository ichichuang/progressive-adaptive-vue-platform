import { z } from 'zod'

const tokenPathSegmentPattern = /^(?:[a-z][a-z0-9-]*|\d+)$/u
const tokenReferencePattern = /^\{[a-z][a-z0-9-]*(?:\.(?:[a-z][a-z0-9-]*|\d+))+\}$/u

const finiteNumberSchema = z.number()
const normalizedNumberSchema = finiteNumberSchema.min(0).max(1)
const hueSchema = finiteNumberSchema.min(0).lt(360)
const metadataNameSchema = z.string().regex(/^[a-z][a-z0-9-]*$/u)

export const tokenReferenceSchema = z
  .string()
  .regex(tokenReferencePattern, 'Token references must use the complete {token.path} syntax.')

const tokenVisibilitySchema = z.enum(['public', 'ui-internal', 'build-only'])

const tokenConditionsSchema = z
  .strictObject({
    theme: metadataNameSchema.optional(),
    colorMode: z.enum(['light', 'dark']).optional(),
    contrast: z.enum(['standard', 'enhanced']).optional(),
    density: z.enum(['compact', 'comfortable', 'spacious']).optional(),
    material: z.enum(['adaptive', 'reduced', 'solid']).optional(),
  })
  .refine((conditions) => Object.keys(conditions).length > 0, {
    message: 'Token conditions must select at least one appearance axis.',
  })

const tokenRoleSchema = z
  .string()
  .regex(
    /^(?:[a-z][a-z0-9-]*|\d+)(?:\.(?:[a-z][a-z0-9-]*|\d+))+$/u,
    'Token roles must use a complete lower kebab-case dot path.',
  )

const groupPavpExtensionSchema = z.strictObject({
  visibility: tokenVisibilitySchema,
})

const tokenPavpExtensionSchema = z
  .strictObject({
    visibility: tokenVisibilitySchema.optional(),
    role: tokenRoleSchema.optional(),
    conditions: tokenConditionsSchema.optional(),
    compound: metadataNameSchema.optional(),
  })
  .refine((extension) => Object.keys(extension).length > 0, {
    message: 'org.pavp token metadata must declare at least one supported field.',
  })

export const tokenGroupExtensionsSchema = z.strictObject({
  'org.pavp': groupPavpExtensionSchema,
})

const tokenExtensionsSchema = z.strictObject({
  'org.pavp': tokenPavpExtensionSchema,
})

export const colorValueSchema = z.strictObject({
  colorSpace: z.literal('oklch'),
  components: z.tuple([normalizedNumberSchema, finiteNumberSchema.min(0).max(0.4), hueSchema]),
  alpha: normalizedNumberSchema.optional(),
})

export const dimensionValueSchema = z.strictObject({
  value: finiteNumberSchema,
  unit: z.enum(['px', 'rem']),
})

export const durationValueSchema = z.strictObject({
  value: finiteNumberSchema.min(0),
  unit: z.literal('ms'),
})

export const cubicBezierValueSchema = z.tuple([
  normalizedNumberSchema,
  finiteNumberSchema,
  normalizedNumberSchema,
  finiteNumberSchema,
])

export const fontFamilyValueSchema = z.union([z.string().min(1), z.array(z.string().min(1)).min(1)])

export const fontWeightValueSchema = z.number().int().min(1).max(1000)

export const shadowValueSchema = z.strictObject({
  color: z.union([colorValueSchema, tokenReferenceSchema]),
  offsetX: z.union([dimensionValueSchema, tokenReferenceSchema]),
  offsetY: z.union([dimensionValueSchema, tokenReferenceSchema]),
  blur: z.union([dimensionValueSchema, tokenReferenceSchema]),
  spread: z.union([dimensionValueSchema, tokenReferenceSchema]),
})

const tokenDescriptionSchema = z.string().min(1).optional()
const tokenMetadataShape = {
  $description: tokenDescriptionSchema,
  $extensions: tokenExtensionsSchema.optional(),
}

export const tokenDefinitionSchema = z.discriminatedUnion('$type', [
  z.strictObject({
    $type: z.literal('color'),
    $value: z.union([colorValueSchema, tokenReferenceSchema]),
    ...tokenMetadataShape,
  }),
  z.strictObject({
    $type: z.literal('dimension'),
    $value: z.union([dimensionValueSchema, tokenReferenceSchema]),
    ...tokenMetadataShape,
  }),
  z.strictObject({
    $type: z.literal('duration'),
    $value: z.union([durationValueSchema, tokenReferenceSchema]),
    ...tokenMetadataShape,
  }),
  z.strictObject({
    $type: z.literal('cubicBezier'),
    $value: z.union([cubicBezierValueSchema, tokenReferenceSchema]),
    ...tokenMetadataShape,
  }),
  z.strictObject({
    $type: z.literal('fontFamily'),
    $value: z.union([fontFamilyValueSchema, tokenReferenceSchema]),
    ...tokenMetadataShape,
  }),
  z.strictObject({
    $type: z.literal('fontWeight'),
    $value: z.union([fontWeightValueSchema, tokenReferenceSchema]),
    ...tokenMetadataShape,
  }),
  z.strictObject({
    $type: z.literal('number'),
    $value: z.union([finiteNumberSchema, tokenReferenceSchema]),
    ...tokenMetadataShape,
  }),
  z.strictObject({
    $type: z.literal('shadow'),
    $value: z.union([shadowValueSchema, tokenReferenceSchema]),
    ...tokenMetadataShape,
  }),
])

export type ColorValue = z.infer<typeof colorValueSchema>
export type DtcgTokenType = z.infer<typeof tokenDefinitionSchema>['$type']
export type ShadowValue = z.infer<typeof shadowValueSchema>
export type TokenConditions = z.infer<typeof tokenConditionsSchema>
export type TokenDefinition = z.infer<typeof tokenDefinitionSchema>
export type TokenPavpExtension = z.infer<typeof tokenPavpExtensionSchema>
export type TokenVisibility = z.infer<typeof tokenVisibilitySchema>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateTokenGroup(
  group: Record<string, unknown>,
  context: z.RefinementCtx,
  path: string[],
): void {
  let childCount = 0

  for (const [key, value] of Object.entries(group)) {
    if (key === '$description') {
      if (typeof value !== 'string' || value.length === 0) {
        context.addIssue({
          code: 'custom',
          message: 'Group $description must be a non-empty string.',
          path: [...path, key],
        })
      }
      continue
    }

    if (key === '$extensions') {
      const result = tokenGroupExtensionsSchema.safeParse(value)

      if (!result.success) {
        for (const issue of result.error.issues) {
          context.addIssue({
            code: 'custom',
            message: issue.message,
            path: [...path, key, ...issue.path],
          })
        }
      }
      continue
    }

    if (key.startsWith('$')) {
      context.addIssue({
        code: 'custom',
        message: `Unsupported DTCG group property "${key}".`,
        path: [...path, key],
      })
      continue
    }

    childCount += 1

    if (!tokenPathSegmentPattern.test(key)) {
      context.addIssue({
        code: 'custom',
        message: 'Token path segments must use lower kebab-case or numeric scale steps.',
        path: [...path, key],
      })
    }

    if (!isRecord(value)) {
      context.addIssue({
        code: 'custom',
        message: 'Token groups and token definitions must be JSON objects.',
        path: [...path, key],
      })
      continue
    }

    if ('$value' in value) {
      const result = tokenDefinitionSchema.safeParse(value)

      if (!result.success) {
        for (const issue of result.error.issues) {
          context.addIssue({
            code: 'custom',
            message: issue.message,
            path: [...path, key, ...issue.path],
          })
        }
      }
      continue
    }

    validateTokenGroup(value, context, [...path, key])
  }

  if (childCount === 0) {
    context.addIssue({
      code: 'custom',
      message: 'Token groups must contain at least one token or nested group.',
      path,
    })
  }
}

export const tokenSourceSchema = z
  .record(z.string(), z.unknown())
  .superRefine((source, context) => {
    validateTokenGroup(source, context, [])
  })

export function isTokenReference(value: unknown): value is string {
  return typeof value === 'string' && tokenReferencePattern.test(value)
}

export function tokenPathFromReference(reference: string): string {
  return reference.slice(1, -1)
}
