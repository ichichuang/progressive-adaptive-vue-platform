import type { Format } from 'style-dictionary/types'

import { generatedNotice, semanticTokens } from './shared'

export function createCssFormat(): Format {
  return {
    name: 'pavp/css',
    format: ({ dictionary }) => {
      const declarations = semanticTokens(dictionary.allTokens)
        .map((token) => `    ${token.cssVariable}: ${token.value};`)
        .join('\n')

      return `/* ${generatedNotice} */\n@layer tokens {\n  :root {\n${declarations}\n  }\n}\n`
    },
  }
}
