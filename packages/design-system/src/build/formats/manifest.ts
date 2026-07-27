import type { Format } from 'style-dictionary/types'

import {
  generatedNotice,
  requireBuildResult,
  semanticTokens,
  stableJson,
  type FormatContext,
} from './shared'

export function createManifestFormat(context: FormatContext): Format {
  return {
    name: 'pavp/json/manifest',
    format: ({ dictionary }) => {
      const result = requireBuildResult(context)
      const expandedDensityPresets = `  "densityPresets": ${JSON.stringify(
        result.densityPresets,
        null,
        2,
      ).replaceAll('\n', '\n  ')},`
      const compactDensityPresets = `  "densityPresets": [${result.densityPresets
        .map((preset) => JSON.stringify(preset))
        .join(', ')}],`

      return stableJson({
        generatedNotice,
        schemaVersion: 1,
        sourceFiles: result.sourceFiles,
        densityPresets: result.densityPresets,
        themes: result.themes.map((theme) => ({
          id: theme.id,
          label: theme.label,
          neutral: theme.palette.neutral,
        })),
        tokens: semanticTokens(dictionary.allTokens).map((token) => ({
          name: token.name,
          type: token.type,
          cssVariable: token.cssVariable,
          value: token.value,
          source: token.source,
        })),
      }).replace(expandedDensityPresets, compactDensityPresets)
    },
  }
}
