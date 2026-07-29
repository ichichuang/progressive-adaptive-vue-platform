import type { Format } from 'style-dictionary/types'

import { compareCodePoints } from '../order'
import type { TokenBuildResult } from '../preprocess'
import type { ResolvedTokenRecord } from '../resolve'
import { conditionEntries } from '../token-contract'
import {
  generatedNotice,
  requireBuildResult,
  resolvedCssValue,
  selectTokensForOutput,
  type FormatContext,
} from './shared'

interface SelectorGroup {
  rank: number
  selector: string
  tokens: ResolvedTokenRecord[]
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

  for (const token of selectTokensForOutput(result, 'runtime-css')) {
    if (token.cssVariable === undefined) {
      throw new Error(`${token.path}: Runtime CSS token is missing its CSS variable.`)
    }

    const target = selectorForToken(token)
    const group = groups.get(target.selector) ?? {
      ...target,
      tokens: [],
    }

    group.tokens.push(token)
    groups.set(target.selector, group)
  }

  const blocks = [...groups.values()]
    .sort(
      (left, right) => left.rank - right.rank || compareCodePoints(left.selector, right.selector),
    )
    .map((group) => {
      const declarations = group.tokens
        .sort(
          (left, right) =>
            compareCodePoints(left.role.name, right.role.name) ||
            compareCodePoints(left.path, right.path),
        )
        .map((token) => {
          if (token.cssVariable === undefined) {
            throw new Error(`${token.path}: Runtime CSS token is missing its CSS variable.`)
          }

          return `    ${token.cssVariable}: ${resolvedCssValue(token, result)};`
        })
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

export function createCssFormat(context: FormatContext): Format {
  return {
    name: 'pavp/css',
    format: () => formatRuntimeCss(requireBuildResult(context)),
  }
}
