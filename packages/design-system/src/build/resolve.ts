import {
  borderValueSchema,
  isTokenReference,
  shadowLayerValueSchema,
  tokenPathFromReference,
  type BorderValue,
  type ColorValue,
  type DtcgTokenType,
  type ShadowLayerValue,
  type ShadowValue,
  type TokenConditions,
  type TokenDefinition,
  type TokenVisibility,
} from '../schema/token.schema'
import { normalizeColor } from './color'
import { compareCodePoints } from './order'
import type { TokenRoleMetadata, TokenTier } from './token-contract'

export interface TokenRecord {
  compound?: string
  conditions: TokenConditions
  cssVariable?: string
  description?: string
  path: string
  role: TokenRoleMetadata
  source: string
  tier: TokenTier
  type: DtcgTokenType
  value: TokenDefinition['$value']
  visibility: TokenVisibility
}

export interface ResolvedTokenRecord extends Omit<TokenRecord, 'value'> {
  authoredValue: TokenDefinition['$value']
  reference?: string
  resolvedValue: Exclude<TokenDefinition['$value'], string>
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

    return resolveRecord(target).resolvedValue
  }

  function resolveCompositeField(
    fieldValue: ColorValue | ShadowLayerValue['offsetX'],
    expectedType: 'color' | 'dimension',
    context: string,
  ): ColorValue | Exclude<ShadowLayerValue['offsetX'], string> {
    if (!isTokenReference(fieldValue)) {
      return fieldValue
    }

    return resolveReference(fieldValue, expectedType, context) as
      ColorValue | Exclude<ShadowLayerValue['offsetX'], string>
  }

  function resolveBorder(value: BorderValue, context: string): BorderValue {
    const resolved = {
      color: resolveCompositeField(value.color, 'color', `${context}.color`) as ColorValue,
      width: resolveCompositeField(value.width, 'dimension', `${context}.width`) as Exclude<
        BorderValue['width'],
        string
      >,
      style: value.style,
    }
    const result = borderValueSchema.safeParse(resolved)

    if (!result.success) {
      throw new Error(`${context}: invalid resolved Border value (${result.error.message}).`)
    }

    return result.data
  }

  function resolveShadowLayer(value: ShadowLayerValue, context: string): ShadowLayerValue {
    const resolveField = (
      fieldValue: ColorValue | ShadowLayerValue['offsetX'],
      expectedType: 'color' | 'dimension',
      field: string,
    ): ColorValue | Exclude<ShadowLayerValue['offsetX'], string> =>
      resolveCompositeField(fieldValue, expectedType, `${context}.${field}`)

    const resolved = {
      color: resolveField(value.color, 'color', 'color') as ColorValue,
      offsetX: resolveField(value.offsetX, 'dimension', 'offsetX') as Exclude<
        ShadowLayerValue['offsetX'],
        string
      >,
      offsetY: resolveField(value.offsetY, 'dimension', 'offsetY') as Exclude<
        ShadowLayerValue['offsetY'],
        string
      >,
      blur: resolveField(value.blur, 'dimension', 'blur') as Exclude<
        ShadowLayerValue['blur'],
        string
      >,
      spread: resolveField(value.spread, 'dimension', 'spread') as Exclude<
        ShadowLayerValue['spread'],
        string
      >,
      ...(value.inset === undefined ? {} : { inset: value.inset }),
    }
    const result = shadowLayerValueSchema.safeParse(resolved)

    if (!result.success) {
      throw new Error(`${context}: invalid resolved Shadow layer (${result.error.message}).`)
    }

    return result.data
  }

  function resolveShadow(value: ShadowValue, context: string): ShadowValue {
    return Array.isArray(value)
      ? value.map((layer, index) => resolveShadowLayer(layer, `${context}[${String(index)}]`))
      : resolveShadowLayer(value, context)
  }

  function normalizeLiteral(
    type: DtcgTokenType,
    value: Exclude<TokenDefinition['$value'], string>,
    context: string,
  ): Exclude<TokenDefinition['$value'], string> {
    if (type === 'color') {
      return normalizeColor(value as ColorValue, context)
    }

    if (type === 'border') {
      const border = resolveBorder(value as BorderValue, context)

      return {
        ...border,
        color: normalizeColor(border.color as ColorValue, `${context}.color`),
      }
    }

    if (type === 'shadow') {
      const shadow = resolveShadow(value as ShadowValue, context)

      return Array.isArray(shadow)
        ? shadow.map((layer, index) => ({
            ...layer,
            color: normalizeColor(layer.color as ColorValue, `${context}[${String(index)}].color`),
          }))
        : {
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

    let reference: string | undefined
    let resolvedValue: Exclude<TokenDefinition['$value'], string>

    if (isTokenReference(record.value)) {
      reference = tokenPathFromReference(record.value)
      resolvedValue = resolveReference(record.value, record.type, record.path)
    } else {
      resolvedValue = normalizeLiteral(record.type, record.value, record.path)
    }
    const { value: sourceValue, ...metadata } = record
    const resolved: ResolvedTokenRecord = {
      ...metadata,
      authoredValue: record.value,
      resolvedValue,
      ...(reference === undefined ? {} : { reference }),
    }

    void sourceValue

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
