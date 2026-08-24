import type { LayoutProfileId, LayoutRegistryRecord } from '@platform/design-system'

function thresholdPixels(record: LayoutRegistryRecord, rootFontSize: number): number {
  const match = /^(\d+(?:\.\d+)?)(px|rem)$/u.exec(record.resolvedValue)

  if (match === null) {
    throw new TypeError(`${record.id}: unsupported Layout Registry threshold unit.`)
  }

  const value = Number(match[1])
  return match[2] === 'rem' ? value * rootFontSize : value
}

export function resolveAdminShellProfile(input: {
  readonly inlineSize: number
  readonly rootFontSize: number
  readonly regularMinimum: LayoutRegistryRecord
  readonly wideMinimum: LayoutRegistryRecord
}): LayoutProfileId {
  const regularMinimum = thresholdPixels(input.regularMinimum, input.rootFontSize)
  const wideMinimum = thresholdPixels(input.wideMinimum, input.rootFontSize)

  if (
    !Number.isFinite(input.inlineSize) ||
    input.inlineSize < 0 ||
    !Number.isFinite(input.rootFontSize) ||
    input.rootFontSize <= 0 ||
    regularMinimum >= wideMinimum
  ) {
    throw new TypeError('The Admin Shell profile measurement is invalid.')
  }

  if (input.inlineSize < regularMinimum) {
    return 'narrow'
  }

  return input.inlineSize < wideMinimum ? 'regular' : 'wide'
}
