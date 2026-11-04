import type { Format } from 'style-dictionary/types'

import { dimensionValueSchema } from '../../schema/token.schema'
import type { TokenBuildResult } from '../preprocess'
import { generatedNotice, requireBuildResult, type FormatContext } from './shared'

export function radiusProjectionDocument(result: TokenBuildResult) {
  const pixels = (path: string): number => {
    const token = result.tokens.find((record) => record.path === path)
    const parsed = dimensionValueSchema.safeParse(token?.resolvedValue)
    if (
      token?.source !== 'primitive/radius.tokens.json' ||
      token.type !== 'dimension' ||
      token.visibility !== 'build-only' ||
      !parsed.success ||
      parsed.data.unit !== 'px'
    )
      throw new Error(`${path}: radius projection requires its canonical pixel source.`)
    return parsed.data.value
  }
  const resultDocument = {
    minimum: pixels('radius.minimum'),
    maximum: pixels('radius.lg'),
    step: pixels('radius.step'),
    defaultValue: pixels('radius.control'),
    panelDefault: pixels('radius.md'),
    smallDefault: pixels('radius.sm'),
  }
  if (
    resultDocument.minimum !== 0 ||
    resultDocument.maximum !== 16 ||
    resultDocument.step !== 1 ||
    resultDocument.defaultValue !== 8 ||
    resultDocument.panelDefault !== 12 ||
    resultDocument.smallDefault !== 4
  )
    throw new Error('The admitted radius input and projection scales drifted.')
  return resultDocument
}

export function formatRadiusProjection(result: TokenBuildResult): string {
  const fields = Object.entries(radiusProjectionDocument(result))
    .map(([key, value]) => `  ${key}: ${String(value)},`)
    .join('\n')
  return `/* ${generatedNotice} */\nexport const radiusProjection = {\n${fields}\n} as const\n`
}

export function createRadiusProjectionFormat(context: FormatContext): Format {
  return {
    name: 'pavp/typescript/radius-projection',
    format: () => formatRadiusProjection(requireBuildResult(context)),
  }
}
