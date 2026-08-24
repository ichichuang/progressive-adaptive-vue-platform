import type { Format } from 'style-dictionary/types'

import { compareCodePoints } from '../order'
import type { TokenBuildResult } from '../preprocess'
import {
  generatedNotice,
  requireBuildResult,
  uniqueRoleTokensForOutput,
  type FormatContext,
} from './shared'

const layoutTokenKinds = {
  'layout.admin.content.minimum-inline-size': 'content-size',
  'layout.admin.drawer.maximum-inline-size': 'shell-size',
  'layout.admin.header.block-size': 'shell-size',
  'layout.admin.sidebar.expanded-inline-size': 'shell-size',
  'layout.admin.sidebar.rail-inline-size': 'shell-size',
  'layout.profile.regular.min-inline-size': 'profile-threshold',
  'layout.profile.wide.min-inline-size': 'profile-threshold',
  'layout.target.enhanced.minimum-block-size': 'minimum-target',
  'layout.target.enhanced.minimum-inline-size': 'minimum-target',
} as const

export type LayoutTokenId = keyof typeof layoutTokenKinds

export function layoutRegistryDocument(result: TokenBuildResult) {
  const tokensByRole = new Map(
    uniqueRoleTokensForOutput(result, 'public-typescript').map((token) => [token.name, token]),
  )
  const records = Object.entries(layoutTokenKinds)
    .sort(([left], [right]) => compareCodePoints(left, right))
    .map(([id, kind]) => {
      const token = tokensByRole.get(id)

      if (token === undefined) {
        throw new Error(`${id}: generated Layout Registry token is missing.`)
      }

      if (token.type !== 'dimension' || !token.cssVariable.startsWith('--ui-layout-')) {
        throw new Error(`${id}: generated Layout Registry token metadata is invalid.`)
      }

      return {
        id: id as LayoutTokenId,
        kind,
        resolvedValue: token.value,
        cssVariable: token.cssVariable as `--ui-layout-${string}`,
      }
    })

  if (new Set(records.map((record) => record.cssVariable)).size !== records.length) {
    throw new Error('Generated Layout Registry CSS variables must be unique.')
  }

  return {
    schemaVersion: 1 as const,
    records,
  }
}

export function formatLayoutRegistry(result: TokenBuildResult): string {
  const document = layoutRegistryDocument(result)
  const recordLines = document.records
    .map(
      (record) => `    {
      id: '${record.id}',
      kind: '${record.kind}',
      resolvedValue: '${record.resolvedValue}',
      cssVariable: '${record.cssVariable}',
    },`,
    )
    .join('\n')

  return `/* ${generatedNotice} */
export type LayoutProfileId = 'narrow' | 'regular' | 'wide'

export type LayoutTokenId =
${document.records.map((record) => `  | '${record.id}'`).join('\n')}

export interface LayoutRegistryRecord {
  readonly id: LayoutTokenId
  readonly kind: 'profile-threshold' | 'shell-size' | 'content-size' | 'minimum-target'
  readonly resolvedValue: string
  readonly cssVariable: \`--ui-layout-\${string}\`
}

export interface LayoutRegistry {
  readonly schemaVersion: 1
  readonly records: readonly LayoutRegistryRecord[]
}

export const layoutRegistry = {
  schemaVersion: 1,
  records: [
${recordLines}
  ],
} as const satisfies LayoutRegistry
`
}

export function createLayoutRegistryFormat(context: FormatContext): Format {
  return {
    name: 'pavp/typescript/layout-registry',
    format: () => formatLayoutRegistry(requireBuildResult(context)),
  }
}
