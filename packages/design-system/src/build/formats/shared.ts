import {
  borderValueSchema,
  colorValueSchema,
  cubicBezierValueSchema,
  dimensionValueSchema,
  durationValueSchema,
  fontFamilyValueSchema,
  fontWeightValueSchema,
  shadowLayerValueSchema,
  shadowValueSchema,
  tokenPathFromReference,
  type DtcgTokenType,
} from '../../schema/token.schema'
import { compareCodePoints } from '../order'
import type { TokenBuildResult } from '../preprocess'
import { isActivePublicColorRole } from '../public-role-registry'
import type { ResolvedTokenRecord } from '../resolve'
import { visibilityEntersOutput, type TokenOutput } from '../token-contract'

export const generatedNotice = 'Generated file. Do not edit directly.'

export interface OutputToken {
  cssVariable: string
  name: string
  source: string
  type: DtcgTokenType
  value: string
}

export interface FormatContext {
  result?: TokenBuildResult
}

function formatNumber(value: number): string {
  return String(Number(value.toFixed(6)))
}

function colorToCss(value: unknown): string {
  const color = colorValueSchema.parse(value)
  const [lightness, chroma, hue] = color.components
  const alpha = color.alpha ?? 1
  const components = `${formatNumber(lightness * 100)}% ${formatNumber(chroma)} ${formatNumber(hue)}`

  return alpha === 1 ? `oklch(${components})` : `oklch(${components} / ${formatNumber(alpha)})`
}

function dimensionToCss(value: unknown): string {
  const dimension = dimensionValueSchema.parse(value)
  return `${formatNumber(dimension.value)}${dimension.unit}`
}

function fontFamilyToCss(value: unknown): string {
  const family = fontFamilyValueSchema.parse(value)
  const values = typeof family === 'string' ? [family] : family

  return values.map((item) => (/\s/u.test(item) ? JSON.stringify(item) : item)).join(', ')
}

function borderToCss(value: unknown): string {
  const border = borderValueSchema.parse(value)

  if (typeof border.color === 'string' || typeof border.width === 'string') {
    throw new Error('Border references must be resolved by the project preprocessor.')
  }

  return `${dimensionToCss(border.width)} ${border.style} ${colorToCss(border.color)}`
}

function shadowLayerToCss(value: unknown): string {
  const shadow = shadowLayerValueSchema.parse(value)

  if (
    typeof shadow.color === 'string' ||
    typeof shadow.offsetX === 'string' ||
    typeof shadow.offsetY === 'string' ||
    typeof shadow.blur === 'string' ||
    typeof shadow.spread === 'string'
  ) {
    throw new Error('Shadow references must be resolved by the project preprocessor.')
  }

  return [
    ...(shadow.inset === true ? ['inset'] : []),
    dimensionToCss(shadow.offsetX),
    dimensionToCss(shadow.offsetY),
    dimensionToCss(shadow.blur),
    dimensionToCss(shadow.spread),
    colorToCss(shadow.color),
  ].join(' ')
}

export function tokenValueToCss(type: DtcgTokenType, value: unknown): string {
  if (type === 'color') {
    return colorToCss(value)
  }

  if (type === 'dimension') {
    return dimensionToCss(value)
  }

  if (type === 'duration') {
    const duration = durationValueSchema.parse(value)
    return `${formatNumber(duration.value)}${duration.unit}`
  }

  if (type === 'cubicBezier') {
    const bezier = cubicBezierValueSchema.parse(value)
    return `cubic-bezier(${bezier.map(formatNumber).join(', ')})`
  }

  if (type === 'fontFamily') {
    return fontFamilyToCss(value)
  }

  if (type === 'fontWeight') {
    return String(fontWeightValueSchema.parse(value))
  }

  if (type === 'number') {
    return formatNumber(
      typeof value === 'number'
        ? value
        : (() => {
            throw new Error('Number tokens must contain a numeric value.')
          })(),
    )
  }

  if (type === 'border') {
    return borderToCss(value)
  }

  const shadow = shadowValueSchema.parse(value)
  const layers = Array.isArray(shadow) ? shadow : [shadow]

  return layers.map(shadowLayerToCss).join(', ')
}

export function selectTokensForOutput(
  result: TokenBuildResult,
  output: TokenOutput,
): ResolvedTokenRecord[] {
  return result.tokens.filter((token) => visibilityEntersOutput(token.visibility, output))
}

export function resolvedCssValue(token: ResolvedTokenRecord, result: TokenBuildResult): string {
  if (token.reference !== undefined) {
    const target = result.tokens.find((candidate) => candidate.path === token.reference)

    if (target === undefined) {
      throw new Error(`${token.path}: resolved reference target "${token.reference}" is missing.`)
    }

    if (target.cssVariable !== undefined && target.cssVariable !== token.cssVariable) {
      return `var(${target.cssVariable})`
    }
  }

  if (token.type === 'border' && typeof token.authoredValue !== 'string') {
    const authored = borderValueSchema.parse(token.authoredValue)
    const resolved = borderValueSchema.parse(token.resolvedValue)

    return [
      compositeFieldToCss(token, result, authored.width, resolved.width, 'dimension', 'width'),
      resolved.style,
      compositeFieldToCss(token, result, authored.color, resolved.color, 'color', 'color'),
    ].join(' ')
  }

  if (token.type === 'shadow' && typeof token.authoredValue !== 'string') {
    const authoredValue = shadowValueSchema.parse(token.authoredValue)
    const resolvedValue = shadowValueSchema.parse(token.resolvedValue)
    const authoredLayers = Array.isArray(authoredValue) ? authoredValue : [authoredValue]
    const resolvedLayers = Array.isArray(resolvedValue) ? resolvedValue : [resolvedValue]

    if (authoredLayers.length !== resolvedLayers.length) {
      throw new Error(`${token.path}: resolved Shadow layer cardinality drifted.`)
    }

    return authoredLayers
      .map((authored, index) => {
        const resolved = resolvedLayers[index]

        if (resolved === undefined) {
          throw new Error(`${token.path}: resolved Shadow layer ${String(index)} is missing.`)
        }

        return [
          ...(resolved.inset === true ? ['inset'] : []),
          compositeFieldToCss(
            token,
            result,
            authored.offsetX,
            resolved.offsetX,
            'dimension',
            `[${String(index)}].offsetX`,
          ),
          compositeFieldToCss(
            token,
            result,
            authored.offsetY,
            resolved.offsetY,
            'dimension',
            `[${String(index)}].offsetY`,
          ),
          compositeFieldToCss(
            token,
            result,
            authored.blur,
            resolved.blur,
            'dimension',
            `[${String(index)}].blur`,
          ),
          compositeFieldToCss(
            token,
            result,
            authored.spread,
            resolved.spread,
            'dimension',
            `[${String(index)}].spread`,
          ),
          compositeFieldToCss(
            token,
            result,
            authored.color,
            resolved.color,
            'color',
            `[${String(index)}].color`,
          ),
        ].join(' ')
      })
      .join(', ')
  }

  return tokenValueToCss(token.type, token.resolvedValue)
}

function compositeFieldToCss(
  token: ResolvedTokenRecord,
  result: TokenBuildResult,
  authoredValue: unknown,
  resolvedValue: unknown,
  expectedType: 'color' | 'dimension',
  field: string,
): string {
  if (typeof authoredValue !== 'string') {
    return tokenValueToCss(expectedType, resolvedValue)
  }

  const targetPath = tokenPathFromReference(authoredValue)
  const target = result.tokens.find((candidate) => candidate.path === targetPath)

  if (target === undefined) {
    throw new Error(`${token.path}.${field}: reference target "${authoredValue}" is missing.`)
  }

  if (target.type !== expectedType) {
    throw new Error(
      `${token.path}.${field}: reference "${authoredValue}" has type "${target.type}", expected "${expectedType}".`,
    )
  }

  if (target.cssVariable !== undefined && target.cssVariable !== token.cssVariable) {
    return `var(${target.cssVariable})`
  }

  return tokenValueToCss(target.type, target.resolvedValue)
}

export function uniqueRoleTokensForOutput(
  result: TokenBuildResult,
  output: Exclude<TokenOutput, 'runtime-css' | 'manifest'>,
): OutputToken[] {
  const roles = new Map<string, OutputToken>()

  for (const token of selectTokensForOutput(result, output)) {
    if (token.cssVariable === undefined) {
      throw new Error(`${token.path}: ${output} token is missing its Runtime CSS variable.`)
    }

    const existing = roles.get(token.role.name)
    const outputToken = {
      cssVariable: token.cssVariable,
      name: token.role.name,
      source: token.source,
      type: token.type,
      value: resolvedCssValue(token, result),
    }

    if (
      existing !== undefined &&
      (existing.cssVariable !== outputToken.cssVariable || existing.type !== outputToken.type)
    ) {
      throw new Error(`${token.path}: public role "${token.role.name}" has conflicting metadata.`)
    }

    roles.set(token.role.name, outputToken)
  }

  for (const role of result.activePublicRoles.filter(isActivePublicColorRole)) {
    if (roles.has(role.id)) {
      continue
    }

    roles.set(role.id, {
      cssVariable: role.cssVariable,
      name: role.id,
      source: '<Public Role Registry Theme Plane>',
      type: role.tokenType,
      value: `var(${role.cssVariable})`,
    })
  }

  return [...roles.values()].sort((left, right) => compareCodePoints(left.name, right.name))
}

export function requireBuildResult(context: FormatContext): TokenBuildResult {
  if (context.result === undefined) {
    throw new Error('The project token preprocessor did not produce build metadata.')
  }

  return context.result
}

function formatJsonValue(value: unknown, indentation: number): string {
  if (Array.isArray(value)) {
    const containsOnlyPrimitives = value.every((item) => typeof item !== 'object' || item === null)
    const compact = `[${value.map((item) => JSON.stringify(item)).join(', ')}]`

    if (containsOnlyPrimitives && indentation + compact.length <= 100) {
      return compact
    }

    const itemPadding = ' '.repeat(indentation + 2)
    const items = value
      .map((item) => `${itemPadding}${formatJsonValue(item, indentation + 2)}`)
      .join(',\n')

    return `[\n${items}\n${' '.repeat(indentation)}]`
  }

  if (typeof value === 'object' && value !== null) {
    if (Object.keys(value).length === 0) {
      return '{}'
    }

    const propertyPadding = ' '.repeat(indentation + 2)
    const properties = Object.entries(value)
      .map(
        ([key, propertyValue]) =>
          `${propertyPadding}${JSON.stringify(key)}: ${formatJsonValue(
            propertyValue,
            indentation + 2,
          )}`,
      )
      .join(',\n')

    return `{\n${properties}\n${' '.repeat(indentation)}}`
  }

  return JSON.stringify(value)
}

export function stableJson(value: unknown): string {
  return `${formatJsonValue(value, 0)}\n`
}
