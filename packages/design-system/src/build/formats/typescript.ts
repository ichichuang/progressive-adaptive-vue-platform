import type { Format } from 'style-dictionary/types'

import { compareCodePoints } from '../order'
import type { TokenBuildResult } from '../preprocess'
import {
  generatedNotice,
  requireBuildResult,
  uniqueRoleTokensForOutput,
  type FormatContext,
  type OutputToken,
} from './shared'

function stringLiteral(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
}

function propertyName(value: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(value) ? value : stringLiteral(value)
}

type UnoThemeValue = Readonly<Record<string, string>> | string

function formatThemeValue(value: UnoThemeValue): string {
  if (typeof value === 'string') {
    return stringLiteral(value)
  }

  const properties = Object.entries(value)
    .sort(([left], [right]) => compareCodePoints(left, right))
    .map(([key, propertyValue]) => `      ${propertyName(key)}: ${stringLiteral(propertyValue)},`)
    .join('\n')

  return `{\n${properties}\n    }`
}

function entries(tokens: readonly OutputToken[], value: (token: OutputToken) => string): string {
  return tokens.map((token) => `  ${stringLiteral(token.name)}: ${value(token)},`).join('\n')
}

export function formatTokensTypeScript(result: TokenBuildResult): string {
  const tokens = uniqueRoleTokensForOutput(result, 'public-typescript')

  return `/* ${generatedNotice} */\nimport type { TokenName } from './token-names'\n\nexport const tokens = {\n${entries(tokens, (token) => stringLiteral(`var(${token.cssVariable})`))}\n} as const satisfies Record<TokenName, string>\n`
}

export function createTokensTypeScriptFormat(context: FormatContext): Format {
  return {
    name: 'pavp/typescript/tokens',
    format: () => formatTokensTypeScript(requireBuildResult(context)),
  }
}

export function formatTokenNames(result: TokenBuildResult): string {
  const names = uniqueRoleTokensForOutput(result, 'public-token-names')
    .map((token) => `  ${stringLiteral(token.name)},`)
    .join('\n')

  return `/* ${generatedNotice} */\nexport const tokenNames = [\n${names}\n] as const\n\nexport type TokenName = (typeof tokenNames)[number]\n`
}

export function createTokenNamesFormat(context: FormatContext): Format {
  return {
    name: 'pavp/typescript/token-names',
    format: () => formatTokenNames(requireBuildResult(context)),
  }
}

function themeKey(token: OutputToken):
  | {
      family: string
      key: string
    }
  | undefined {
  const segments = token.name.split('.')
  const root = segments.shift()

  if (root === 'color') {
    return {
      family: 'colors',
      key: segments.join('-'),
    }
  }

  if (root === 'spacing') {
    return {
      family: 'spacing',
      key: segments.join('-'),
    }
  }

  if (root === 'typography') {
    const category = segments.shift()
    const family = {
      family: 'font',
      'line-height': 'leading',
      size: 'text',
      weight: 'fontWeight',
    }[category ?? '']

    return family === undefined
      ? undefined
      : {
          family,
          key:
            category === 'family'
              ? `${segments.join('-')}-family`
              : category === 'weight'
                ? `${segments.join('-')}-weight`
                : segments.join('-'),
        }
  }

  if (root === 'interaction') {
    const category = segments.shift()
    const family = {
      radius: 'radius',
      shadow: 'shadow',
    }[category ?? '']

    return family === undefined
      ? undefined
      : {
          family,
          key: segments.join('-'),
        }
  }

  return undefined
}

export function formatUnoCssTheme(result: TokenBuildResult): string {
  const tokens = uniqueRoleTokensForOutput(result, 'unocss')
  const tokenVariables = new Map(tokens.map((token) => [token.name, `var(${token.cssVariable})`]))
  const families = new Map<string, Map<string, UnoThemeValue>>()

  for (const token of tokens) {
    const target = themeKey(token)

    if (target === undefined) {
      continue
    }

    const family = families.get(target.family) ?? new Map<string, UnoThemeValue>()
    const lineHeightVariable = tokenVariables.get(`typography.line-height.${target.key}`)
    const value =
      target.family === 'text'
        ? {
            fontSize: `var(${token.cssVariable})`,
            ...(lineHeightVariable === undefined
              ? {}
              : {
                  lineHeight: lineHeightVariable,
                }),
          }
        : `var(${token.cssVariable})`

    family.set(target.key, value)
    families.set(target.family, family)
  }

  const familyLines = [...families.entries()]
    .sort(([left], [right]) => compareCodePoints(left, right))
    .map(([family, values]) => {
      const valueLines = [...values.entries()]
        .sort(([left], [right]) => compareCodePoints(left, right))
        .map(([key, value]) => `    ${propertyName(key)}: ${formatThemeValue(value)},`)
        .join('\n')

      return `  ${family}: {\n${valueLines}\n  },`
    })
    .join('\n')

  return `/* ${generatedNotice} */\nexport const platformTheme = {\n${familyLines}\n} as const\n`
}

export function createUnoCssThemeFormat(context: FormatContext): Format {
  return {
    name: 'pavp/typescript/unocss-theme',
    format: () => formatUnoCssTheme(requireBuildResult(context)),
  }
}
