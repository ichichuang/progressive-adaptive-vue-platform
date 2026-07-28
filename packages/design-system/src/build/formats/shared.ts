import {
  colorValueSchema,
  cubicBezierValueSchema,
  dimensionValueSchema,
  durationValueSchema,
  fontFamilyValueSchema,
  fontWeightValueSchema,
  shadowValueSchema,
  type DtcgTokenType,
} from '../../schema/token.schema'
import { compareCodePoints } from '../order'
import type { TokenBuildResult } from '../preprocess'
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

  const shadow = shadowValueSchema.parse(value)

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
    dimensionToCss(shadow.offsetX),
    dimensionToCss(shadow.offsetY),
    dimensionToCss(shadow.blur),
    dimensionToCss(shadow.spread),
    colorToCss(shadow.color),
  ].join(' ')
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

  return tokenValueToCss(token.type, token.resolvedValue)
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

  return [...roles.values()].sort((left, right) => compareCodePoints(left.name, right.name))
}

export function requireBuildResult(context: FormatContext): TokenBuildResult {
  if (context.result === undefined) {
    throw new Error('The project token preprocessor did not produce build metadata.')
  }

  return context.result
}

export function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}
