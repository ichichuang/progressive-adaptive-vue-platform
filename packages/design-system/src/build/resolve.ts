import {
  isTokenReference,
  tokenPathFromReference,
  type ColorValue,
  type DtcgTokenType,
  type ShadowValue,
  type TokenDefinition,
} from '../schema/token.schema'
import { normalizeColor } from './color'
import { compareCodePoints } from './order'

export type TokenTier = 'density' | 'primitive' | 'semantic'

export interface TokenRecord {
  description?: string
  path: string
  sourcePath: string
  tier: TokenTier
  type: DtcgTokenType
  value: TokenDefinition['$value']
}

export interface ResolvedTokenRecord extends Omit<TokenRecord, 'value'> {
  value: Exclude<TokenDefinition['$value'], string>
}

type ResolutionState = 'resolved' | 'resolving'

export interface TokenResolver {
  records: readonly ResolvedTokenRecord[]
  resolveReference: (
    reference: string,
    expectedType: DtcgTokenType,
    context: string,
  ) => Exclude<TokenDefinition['$value'], string>
}

export function createTokenResolver(records: readonly TokenRecord[]): TokenResolver {
  const recordsByPath = new Map(records.map((record) => [record.path, record]))
  const resolvedByPath = new Map<string, ResolvedTokenRecord>()
  const states = new Map<string, ResolutionState>()
  const stack: string[] = []

  function resolveReference(
    reference: string,
    expectedType: DtcgTokenType,
    context: string,
  ): Exclude<TokenDefinition['$value'], string> {
    const targetPath = tokenPathFromReference(reference)
    const target = recordsByPath.get(targetPath)

    if (target === undefined) {
      throw new Error(`${context}: unknown token reference "${reference}".`)
    }

    if (target.type !== expectedType) {
      throw new Error(
        `${context}: reference "${reference}" has type "${target.type}", expected "${expectedType}".`,
      )
    }

    return resolveRecord(target).value
  }

  function resolveShadow(value: ShadowValue, context: string): ShadowValue {
    const resolveField = (
      fieldValue: ShadowValue[keyof ShadowValue],
      expectedType: 'color' | 'dimension',
      field: string,
    ): ShadowValue[keyof ShadowValue] => {
      if (!isTokenReference(fieldValue)) {
        return fieldValue
      }

      return resolveReference(fieldValue, expectedType, `${context}.${field}`) as
        ColorValue | ShadowValue['offsetX']
    }

    return {
      color: resolveField(value.color, 'color', 'color') as ColorValue,
      offsetX: resolveField(value.offsetX, 'dimension', 'offsetX') as ShadowValue['offsetX'],
      offsetY: resolveField(value.offsetY, 'dimension', 'offsetY') as ShadowValue['offsetY'],
      blur: resolveField(value.blur, 'dimension', 'blur') as ShadowValue['blur'],
      spread: resolveField(value.spread, 'dimension', 'spread') as ShadowValue['spread'],
    }
  }

  function normalizeLiteral(
    type: DtcgTokenType,
    value: Exclude<TokenDefinition['$value'], string>,
    context: string,
  ): Exclude<TokenDefinition['$value'], string> {
    if (type === 'color') {
      return normalizeColor(value as ColorValue, context)
    }

    if (type === 'shadow') {
      const shadow = resolveShadow(value as ShadowValue, context)

      return {
        ...shadow,
        color: normalizeColor(shadow.color as ColorValue, `${context}.color`),
      }
    }

    return value
  }

  function resolveRecord(record: TokenRecord): ResolvedTokenRecord {
    const existing = resolvedByPath.get(record.path)

    if (existing !== undefined) {
      return existing
    }

    if (states.get(record.path) === 'resolving') {
      const cycleStart = stack.indexOf(record.path)
      const cycle = [...stack.slice(cycleStart), record.path]
      throw new Error(`${record.path}: circular token reference ${cycle.join(' -> ')}.`)
    }

    states.set(record.path, 'resolving')
    stack.push(record.path)

    const resolvedValue = isTokenReference(record.value)
      ? resolveReference(record.value, record.type, record.path)
      : normalizeLiteral(record.type, record.value, record.path)
    const resolved: ResolvedTokenRecord = {
      path: record.path,
      sourcePath: record.sourcePath,
      tier: record.tier,
      type: record.type,
      value: resolvedValue,
      ...(record.description === undefined ? {} : { description: record.description }),
    }

    stack.pop()
    states.set(record.path, 'resolved')
    resolvedByPath.set(record.path, resolved)
    return resolved
  }

  return {
    records: [...records]
      .sort((left, right) => compareCodePoints(left.path, right.path))
      .map(resolveRecord),
    resolveReference,
  }
}
