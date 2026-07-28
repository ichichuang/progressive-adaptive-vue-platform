import type { Format } from 'style-dictionary/types'

import type { TokenBuildResult } from '../preprocess'
import {
  generatedNotice,
  requireBuildResult,
  resolvedCssValue,
  selectTokensForOutput,
  stableJson,
  type FormatContext,
} from './shared'

export function manifestDocument(result: TokenBuildResult): Record<string, unknown> {
  return {
    generatedNotice,
    schemaVersion: 2,
    sourceFiles: result.sourceFiles,
    densityPresets: result.densityPresets,
    themes: result.themes.map((theme) => ({
      id: theme.id,
      label: theme.label,
      neutral: theme.palette.neutral,
    })),
    compoundBudget: {
      limit: result.colorCompoundBudget,
      used: result.compounds.length,
    },
    compounds: result.compounds.map((compound) => ({
      name: compound.name,
      conditions: compound.conditions,
    })),
    tokens: selectTokensForOutput(result, 'manifest').map((token) => ({
      name: token.path,
      type: token.type,
      tier: token.tier,
      visibility: token.visibility,
      source: token.source,
      conditions: token.conditions,
      role: token.role,
      resolvedValue: resolvedCssValue(token, result),
      ...(token.compound === undefined ? {} : { compound: token.compound }),
      ...(token.cssVariable === undefined ? {} : { cssVariable: token.cssVariable }),
    })),
  }
}

export function formatManifest(result: TokenBuildResult): string {
  const expandedDensityPresets = `  "densityPresets": ${JSON.stringify(
    result.densityPresets,
    null,
    2,
  ).replaceAll('\n', '\n  ')},`
  const compactDensityPresets = `  "densityPresets": [${result.densityPresets
    .map((preset) => JSON.stringify(preset))
    .join(', ')}],`

  return stableJson(manifestDocument(result)).replace(expandedDensityPresets, compactDensityPresets)
}

export function createManifestFormat(context: FormatContext): Format {
  return {
    name: 'pavp/json/manifest',
    format: () => formatManifest(requireBuildResult(context)),
  }
}
