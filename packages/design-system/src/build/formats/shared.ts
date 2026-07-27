import type { TransformedToken } from 'style-dictionary/types'

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

export const generatedNotice = 'Generated file. Do not edit directly.'

const supportedTokenTypes = new Set<DtcgTokenType>([
  'color',
  'cubicBezier',
  'dimension',
  'duration',
  'fontFamily',
  'fontWeight',
  'number',
  'shadow',
])

interface PavpExtension {
  source: string
  tier: string
}

export interface SemanticToken {
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

function readExtension(token: TransformedToken): PavpExtension {
  const tokenRecord = token as unknown as Record<string, unknown>
  const extensions = tokenRecord['$extensions']

  if (typeof extensions !== 'object' || extensions === null || Array.isArray(extensions)) {
    throw new Error(`${token.path.join('.')}: missing org.pavp token metadata.`)
  }

  const extension = (extensions as Record<string, unknown>)['org.pavp']

  if (typeof extension !== 'object' || extension === null || Array.isArray(extension)) {
    throw new Error(`${token.path.join('.')}: missing org.pavp token metadata.`)
  }

  const candidate = extension as Record<string, unknown>

  if (typeof candidate['source'] !== 'string' || typeof candidate['tier'] !== 'string') {
    throw new Error(`${token.path.join('.')}: invalid org.pavp token metadata.`)
  }

  return {
    source: candidate['source'],
    tier: candidate['tier'],
  }
}

function cssVariableForToken(name: string): string {
  const segments = name.split('.')
  const root = segments.shift()

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

  throw new Error(`${name}: semantic token has no canonical --ui-* namespace mapping.`)
}

export function semanticTokens(tokens: readonly TransformedToken[]): SemanticToken[] {
  return tokens
    .map((token) => {
      const extension = readExtension(token)

      if (extension.tier !== 'semantic') {
        return undefined
      }

      const name = token.path.join('.')
      const tokenRecord = token as unknown as Record<string, unknown>
      const type = tokenRecord['$type']
      const value = tokenRecord['$value']

      if (typeof type !== 'string' || !supportedTokenTypes.has(type as DtcgTokenType)) {
        throw new Error(`${name}: unsupported transformed token type.`)
      }

      if (typeof value !== 'string') {
        throw new Error(`${name}: Style Dictionary CSS transform did not produce a string.`)
      }

      return {
        cssVariable: cssVariableForToken(name),
        name,
        source: extension.source,
        type: type as DtcgTokenType,
        value,
      }
    })
    .filter((token): token is SemanticToken => token !== undefined)
    .sort((left, right) => compareCodePoints(left.name, right.name))
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
