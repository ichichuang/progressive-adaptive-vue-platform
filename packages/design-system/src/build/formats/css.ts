import type { Format } from 'style-dictionary/types'

import type { DtcgTokenType } from '../../schema/token.schema'
import { compareCodePoints } from '../order'
import type { TokenBuildResult } from '../preprocess'
import { isActivePublicColorRole } from '../public-role-registry'
import type { ResolvedTokenRecord } from '../resolve'
import { conditionEntries } from '../token-contract'
import {
  generatedNotice,
  requireBuildResult,
  resolvedCssValue,
  selectTokensForOutput,
  type FormatContext,
} from './shared'
import { themeRegistryDocument } from './typescript'

interface SelectorGroup {
  rank: number
  selector: string
  declarations: { name: string; type?: DtcgTokenType; value: string }[]
  sequence: number
}

const cssPrintWidth = 100
const declarationIndent = '    '
const continuationIndent = '      '

function splitTopLevelCssValue(value: string, separator: ',' | 'whitespace'): string[] {
  const segments: string[] = []
  let depth = 0
  let escaped = false
  let quote: '"' | "'" | null = null
  let start = 0

  const appendSegment = (end: number): void => {
    const segment = value.slice(start, end).trim()

    if (segment !== '') {
      segments.push(segment)
    }
  }

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]

    if (character === undefined) {
      continue
    }

    if (quote !== null) {
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === quote) {
        quote = null
      }
      continue
    }

    if (character === '"' || character === "'") {
      quote = character
      continue
    }

    if (character === '(') {
      depth += 1
      continue
    }

    if (character === ')') {
      depth = Math.max(0, depth - 1)
      continue
    }

    const separatesValue =
      depth === 0 &&
      (separator === ',' ? character === ',' : character === ' ' || character === '\t')

    if (!separatesValue) {
      continue
    }

    appendSegment(index)
    start = index + 1
  }

  appendSegment(value.length)
  return segments
}

function wrapCssSegments(
  segments: readonly string[],
  firstPrefix: string,
  continuedPrefix: string,
  finalSuffix: ',' | ';',
): string[] {
  const lines: string[] = []
  let line = firstPrefix

  for (const [index, segment] of segments.entries()) {
    const spacer = line === firstPrefix ? '' : ' '
    const candidate = `${line}${spacer}${segment}`
    const suffixLength = index === segments.length - 1 ? finalSuffix.length : 0

    if (line !== firstPrefix && candidate.length + suffixLength > cssPrintWidth) {
      lines.push(line)
      line = `${continuedPrefix}${segment}`
    } else {
      line = candidate
    }
  }

  lines.push(`${line}${finalSuffix}`)
  return lines
}

function formatShadowDeclaration(declaration: { name: string; value: string }): string {
  const layers = splitTopLevelCssValue(declaration.value, ',')

  if (layers.length > 1) {
    const formattedLayers = layers.flatMap((layer, index) =>
      wrapCssSegments(
        splitTopLevelCssValue(layer, 'whitespace'),
        continuationIndent,
        `${continuationIndent}  `,
        index === layers.length - 1 ? ';' : ',',
      ),
    )

    return `${declarationIndent}${declaration.name}:\n${formattedLayers.join('\n')}`
  }

  return wrapCssSegments(
    splitTopLevelCssValue(declaration.value, 'whitespace'),
    `${declarationIndent}${declaration.name}: `,
    continuationIndent,
    ';',
  ).join('\n')
}

function formatDeclaration(declaration: {
  name: string
  type?: DtcgTokenType
  value: string
}): string {
  const singleLine = `    ${declaration.name}: ${declaration.value};`
  const variableReference = /^var\((--ui-[a-z0-9-]+)\)$/u.exec(declaration.value)

  if (singleLine.length <= cssPrintWidth) {
    return singleLine
  }

  if (variableReference?.[1] !== undefined) {
    return `    ${declaration.name}: var(\n      ${variableReference[1]}\n    );`
  }

  return declaration.type === 'shadow' ? formatShadowDeclaration(declaration) : singleLine
}

const axisSelector = {
  theme: 'data-theme',
  colorMode: 'data-color-mode',
  contrast: 'data-contrast',
  density: 'data-density',
  material: 'data-material',
} as const

const axisRank = {
  theme: 10,
  colorMode: 20,
  contrast: 30,
  density: 40,
  material: 50,
} as const

export const canonicalLayerOrder =
  '@layer reset, tokens, base, utilities, components, app, overrides;'

export function formatAppearanceBaseCss(): string {
  return `@layer base {
  html {
    background-color: var(--ui-color-surface-page);
    color: var(--ui-color-text-primary);
    font-size: calc(100% * var(--ui-font-scale));
  }

  html[data-color-mode='light'] {
    color-scheme: light;
  }

  html[data-color-mode='dark'] {
    color-scheme: dark;
  }
}`
}

export function formatForcedColorsCss(): string {
  return `@media (forced-colors: active) {
  @layer tokens {
    :root {
      --ui-color-action-primary: Highlight;
      --ui-color-control-primary: Highlight;
      --ui-color-border-default: GrayText;
      --ui-color-focus-ring: Highlight;
      --ui-color-scrim-viewport: CanvasText;
      --ui-color-surface-page: Canvas;
      --ui-color-surface-panel: Canvas;
      --ui-color-text-on-action: HighlightText;
      --ui-color-text-primary: CanvasText;
      --ui-color-text-secondary: CanvasText;
      --ui-material-chrome-background: Canvas;
      --ui-material-modal-background: Canvas;
      --ui-material-overlay-background: Canvas;
      --ui-material-scrim-background: CanvasText;
    }
  }
}`
}

function selectorForToken(token: ResolvedTokenRecord): {
  rank: number
  selector: string
} {
  const entries = conditionEntries(token.conditions)

  if (entries.length === 0) {
    return {
      rank: 0,
      selector: ':root',
    }
  }

  if (entries.length === 1) {
    const entry = entries[0]

    if (entry === undefined) {
      throw new Error(`${token.path}: unresolved selector condition.`)
    }

    const [axis, value] = entry
    return {
      rank: axisRank[axis],
      selector: `html[${axisSelector[axis]}='${value}']`,
    }
  }

  if (token.compound === undefined) {
    throw new Error(`${token.path}: compound selector is missing its name.`)
  }

  return {
    rank: 35,
    selector: `html${entries
      .map(([axis, value]) => `[${axisSelector[axis]}='${value}']`)
      .join('')}`,
  }
}

export function formatRuntimeCss(result: TokenBuildResult): string {
  const groups = new Map<string, SelectorGroup>()
  const activePublicColorRoles = new Set(
    result.activePublicRoles.filter(isActivePublicColorRole).map((record) => record.id),
  )
  let sequence = 0

  for (const token of selectTokensForOutput(result, 'runtime-css')) {
    if (token.cssVariable === undefined) {
      throw new Error(`${token.path}: Runtime CSS token is missing its CSS variable.`)
    }

    if (activePublicColorRoles.has(token.role.name)) {
      continue
    }

    const target = selectorForToken(token)
    const group = groups.get(target.selector) ?? {
      ...target,
      declarations: [],
      sequence: sequence++,
    }

    group.declarations.push({
      name: token.cssVariable,
      type: token.type,
      value: resolvedCssValue(token, result),
    })
    groups.set(target.selector, group)
  }

  const blocks = [...groups.values(), ...themeBankSelectorGroups(result, sequence)]
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        compareCodePoints(left.selector, right.selector) ||
        left.sequence - right.sequence,
    )
    .map((group) => {
      const declarations = group.declarations
        .sort((left, right) => compareCodePoints(left.name, right.name))
        .map(formatDeclaration)
        .join('\n')

      return `  ${group.selector} {\n${declarations}\n  }`
    })
    .join('\n\n')

  return `/* ${generatedNotice} */
${canonicalLayerOrder}

@layer tokens {
${blocks}
}

${formatForcedColorsCss()}

${formatAppearanceBaseCss()}
`
}

function effectiveBankVariable(bankVariable: string, colorMode: 'dark' | 'light'): string {
  const prefix = `--ui-theme-bank-${colorMode}-`

  if (!bankVariable.startsWith(prefix)) {
    throw new Error(`${bankVariable}: Theme Bank variable does not match ${colorMode}.`)
  }

  return `--ui-theme-bank-effective-${bankVariable.slice(prefix.length)}`
}

export function formatThemeBankCssValue(value: string): string {
  return value.replaceAll(/\d+\.\d+/gu, (numericLexeme) => String(Number(numericLexeme)))
}

function themeBankSelectorGroups(result: TokenBuildResult, initialSequence = 0): SelectorGroup[] {
  const registry = themeRegistryDocument(result)
  const groups: SelectorGroup[] = []
  let sequence = initialSequence

  for (const entry of registry.builtInEntries) {
    groups.push({
      rank: axisRank.theme,
      selector: `html[data-theme-kind='built-in'][data-theme='${entry.themeId}']`,
      declarations: entry.bank.records.map((record) => ({
        name: record.bankVariable,
        value: formatThemeBankCssValue(record.resolvedValue),
      })),
      sequence: sequence++,
    })
  }

  const representativeRecords = registry.builtInEntries[0]?.bank.records

  if (representativeRecords === undefined) {
    throw new Error('Generated Theme Bank requires one representative Built-in Theme.')
  }

  for (const colorMode of ['light', 'dark'] as const) {
    const records = representativeRecords.filter((record) => record.colorMode === colorMode)

    groups.push({
      rank: axisRank.colorMode,
      selector: `html[data-color-mode='${colorMode}']`,
      declarations: records.map((record) => ({
        name: effectiveBankVariable(record.bankVariable, colorMode),
        value: `var(${record.bankVariable})`,
      })),
      sequence: sequence++,
    })
  }

  for (const contrast of ['standard', 'enhanced'] as const) {
    const records = representativeRecords.filter(
      (record) => record.colorMode === 'light' && record.contrast === contrast,
    )

    groups.push({
      rank: axisRank.contrast,
      selector: `html[data-contrast='${contrast}']`,
      declarations: records.map((record) => ({
        name: record.publicBinding,
        value: `var(${effectiveBankVariable(record.bankVariable, 'light')})`,
      })),
      sequence: sequence++,
    })
  }

  return groups
}

export function formatThemeBankCss(result: TokenBuildResult): string {
  return themeBankSelectorGroups(result)
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        compareCodePoints(left.selector, right.selector) ||
        left.sequence - right.sequence,
    )
    .map((group) => {
      const declarations = group.declarations
        .sort((left, right) => compareCodePoints(left.name, right.name))
        .map(formatDeclaration)
        .join('\n')

      return `  ${group.selector} {\n${declarations}\n  }`
    })
    .join('\n\n')
}

export function createCssFormat(context: FormatContext): Format {
  return {
    name: 'pavp/css',
    format: () => formatRuntimeCss(requireBuildResult(context)),
  }
}
