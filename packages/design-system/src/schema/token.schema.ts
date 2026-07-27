import { z } from 'zod'

const tokenPathSegmentPattern = /^(?:[a-z][a-z0-9-]*|\d+)$/u
const tokenReferencePattern = /^\{[a-z][a-z0-9-]*(?:\.(?:[a-z][a-z0-9-]*|\d+))+\}$/u

const finiteNumberSchema = z.number()
const normalizedNumberSchema = finiteNumberSchema.min(0).max(1)
const hueSchema = finiteNumberSchema.min(0).lt(360)

export const tokenReferenceSchema = z
  .string()
  .regex(tokenReferencePattern, 'Token references must use the complete {token.path} syntax.')

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

export const tokenDefinitionSchema = z.discriminatedUnion('$type', [
  z.strictObject({
    $type: z.literal('color'),
    $value: z.union([colorValueSchema, tokenReferenceSchema]),
    $description: tokenDescriptionSchema,
  }),
  z.strictObject({
    $type: z.literal('dimension'),
    $value: z.union([dimensionValueSchema, tokenReferenceSchema]),
    $description: tokenDescriptionSchema,
  }),
  z.strictObject({
    $type: z.literal('duration'),
    $value: z.union([durationValueSchema, tokenReferenceSchema]),
    $description: tokenDescriptionSchema,
  }),
  z.strictObject({
    $type: z.literal('cubicBezier'),
    $value: z.union([cubicBezierValueSchema, tokenReferenceSchema]),
    $description: tokenDescriptionSchema,
  }),
  z.strictObject({
    $type: z.literal('fontFamily'),
    $value: z.union([fontFamilyValueSchema, tokenReferenceSchema]),
    $description: tokenDescriptionSchema,
  }),
  z.strictObject({
    $type: z.literal('fontWeight'),
    $value: z.union([fontWeightValueSchema, tokenReferenceSchema]),
    $description: tokenDescriptionSchema,
  }),
  z.strictObject({
    $type: z.literal('number'),
    $value: z.union([finiteNumberSchema, tokenReferenceSchema]),
    $description: tokenDescriptionSchema,
  }),
  z.strictObject({
    $type: z.literal('shadow'),
    $value: z.union([shadowValueSchema, tokenReferenceSchema]),
    $description: tokenDescriptionSchema,
  }),
])

export type ColorValue = z.infer<typeof colorValueSchema>
export type DtcgTokenType = z.infer<typeof tokenDefinitionSchema>['$type']
export type ShadowValue = z.infer<typeof shadowValueSchema>
export type TokenDefinition = z.infer<typeof tokenDefinitionSchema>

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
