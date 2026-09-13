import { createRequire } from 'node:module'
import { theme as windTheme } from '@unocss/preset-wind4/theme'
import { parseColor, valueHandlers } from '@unocss/preset-wind4/utils'

import type { UnoCssMappingRecord } from '../../packages/design-system/src/build/public-role-registry'

const requireFromStyleAuthority = createRequire(import.meta.url)
export const structuralColorKeywords = [
  'transparent',
  'currentcolor',
  'inherit',
  'initial',
  'revert',
  'revert-layer',
  'unset',
  'accentcolor',
  'accentcolortext',
  'activetext',
  'buttonborder',
  'buttonface',
  'buttontext',
  'canvas',
  'canvastext',
  'field',
  'fieldtext',
  'graytext',
  'highlight',
  'highlighttext',
  'linktext',
  'mark',
  'marktext',
  'selecteditem',
  'selecteditemtext',
  'visitedtext',
] as const

/** Checker projection only. The PublicRoleRegistry continues to own the union. */
export function mappingCssProperties(mapping: UnoCssMappingRecord): readonly string[] {
  switch (mapping.generatorKind) {
    case 'exact-rule':
    case 'theme-entry':
      return mapping.allowedCssProperties
    case 'property-specific-exact-rule':
      return [...new Set(mapping.bindings.map((binding) => binding.cssProperty))]
    case 'container-variant':
      return []
  }
}

export function mappingClasses(mapping: UnoCssMappingRecord): readonly string[] {
  switch (mapping.generatorKind) {
    case 'exact-rule':
    case 'theme-entry':
      return mapping.classes
    case 'property-specific-exact-rule':
      return mapping.bindings.map((binding) => binding.className)
    case 'container-variant':
      return []
  }
}

export const dimensionProperty =
  /^(?:(?:(?:min|max)-)?(?:width|height|inline-size|block-size)|flex-basis)$/u
export const cssWideValue = /^(?:inherit|initial|revert|revert-layer|unset)$/iu
export const structuralColor = new RegExp(`^(?:${structuralColorKeywords.join('|')})$`, 'iu')

export function physicalDimensionProperty(property: string): string {
  return property.replace('inline-size', 'width').replace('block-size', 'height')
}

function sourceUtilitySegments(token: string): readonly string[] {
  let depth = 0
  let start = 0
  const segments: string[] = []
  for (let index = 0; index < token.length; index += 1) {
    const character = token[index]
    if (character === '\\') {
      index += 1
      continue
    }
    if (character === '[' || character === '(') depth += 1
    if (character === ']' || character === ')') depth -= 1
    if (depth === 0 && character === ':') {
      segments.push(token.slice(start, index))
      start = index + 1
    }
  }
  return [...segments, token.slice(start)]
}

export function hasShellViewportVariant(token: string): boolean {
  return sourceUtilitySegments(token)
    .slice(0, -1)
    .some((variant) => /^(?:(?:lt|at|max|min)-)?(?:sm|md|lg|xl|2xl)$/u.test(variant))
}

function blocksCompactSpacing(value: string): boolean {
  const resolved = valueHandlers.bracket(value) ?? value
  if (/^(?:0|auto|none)$/u.test(resolved) || cssWideValue.test(resolved)) return false
  return (
    Object.hasOwn(windTheme.spacing, value) ||
    [valueHandlers.bracket, valueHandlers.cssvar, valueHandlers.fraction, valueHandlers.rem].some(
      (resolve) => resolve(value) !== undefined,
    )
  )
}

function blocksCompactDimension(value: string): boolean {
  if (/^(?:full|fit|max|min|stretch|screen)$/u.test(value)) return false
  const resolved = valueHandlers.bracket(value) ?? valueHandlers.fraction(value) ?? value
  if (isStructuralDimensionValue(resolved, undefined, { allowFullViewportOrContainer: true }))
    return false
  return (
    Object.hasOwn(windTheme.container, value) ||
    Object.hasOwn(windTheme.spacing, value) ||
    [valueHandlers.bracket, valueHandlers.cssvar, valueHandlers.rem].some(
      (resolve) => resolve(value) !== undefined,
    )
  )
}

function blocksCompactShadow(value: string, dropShadow: boolean): boolean {
  if (value === 'none') return false
  const color = parseColor(value, { colors: windTheme.colors })
  if (color?.color !== undefined)
    return !structuralColor.test(color.color) || color.alpha !== undefined
  return (
    Object.hasOwn(
      dropShadow ? windTheme.dropShadow : windTheme.shadow,
      value.split('/')[0] ?? '',
    ) ||
    valueHandlers.bracket(value) !== undefined ||
    valueHandlers.cssvar(value) !== undefined
  )
}

/** Only called on actual class authoring, never on the extraction candidate corpus. */
export function blocksSourceUtility(token: string): boolean {
  const utility = sourceUtilitySegments(token).at(-1) ?? ''
  if (utility.startsWith('!') || utility.endsWith('!')) return true
  // Wind4 optional-separator/default aliases overlap HTML tags and ordinary words.
  // Keep this ambiguity out of generation-level matchers.
  if (/^-?(?:[mp]-?(?:xy|[rltbsexy]|[bi][se])|[mp]-(?:block|inline))$/u.test(utility)) return true
  if (
    /^(?:(?:border|b)(?:-(?:block|inline|[xyrlbtse]|[bi][se]))?|(?:border|b)-(?:rounded|rd)|ring|ring-offset|inset-ring|outline|rounded|rd|shadow|inset-shadow|text-shadow|drop-shadow|blur|filter|backdrop-filter|backdrop-blur|transition|ease|container)$/u.test(
      utility,
    )
  )
    return true
  // Match the omitted final separator only; delimited forms remain owned by UnoCSS blocklist.
  const spacing =
    /^-?(?:(?:scroll-)?[mp](?:a|-?(?:[bi][se]|[rltbsexy]))?|(?:flex-|grid-)?gap(?:-(?:col|row|x|y))?)([^-].*)$/u.exec(
      utility,
    )
  if (spacing?.[1] !== undefined && blocksCompactSpacing(spacing[1])) return true
  const dimension = /^-?(?:(?:size-)?(?:min-|max-)?[wh]|(?:flex-)?basis)([^-].*)$/u.exec(utility)
  if (dimension?.[1] !== undefined && blocksCompactDimension(dimension[1])) return true
  const weight = /^fw([^-]+)$/u.exec(utility)?.[1]
  if (
    weight !== undefined &&
    !cssWideValue.test(weight) &&
    (Object.hasOwn(windTheme.fontWeight, weight) ||
      valueHandlers.bracket(weight) !== undefined ||
      valueHandlers.cssvar(weight) !== undefined ||
      (valueHandlers.number(weight) ?? 0) !== 0)
  )
    return true
  const shadow = /^(shadow|(?:filter-)?drop-shadow)([^-].*)$/u.exec(utility)
  if (shadow?.[2] !== undefined && blocksCompactShadow(shadow[2], shadow[1] !== 'shadow'))
    return true
  // Wind4 z without a separator accepts numeric syntax only, unlike its z- rule.
  return /^-?(?:position-|pos-)?z[\d.]+$/u.test(utility) && !/z0(?:\.0+)?$/u.test(utility)
}

export interface ValueNode {
  readonly type: string
  readonly value: string
  readonly quote?: string
  readonly nodes?: readonly ValueNode[]
  readonly unclosed?: boolean
}

// Reuse the value parser already owned and installed by Stylelint; no new dependency.
const requireFromStylelint = createRequire(requireFromStyleAuthority.resolve('stylelint'))
export const parseStyleValue = requireFromStylelint('postcss-value-parser') as (value: string) => {
  readonly nodes: readonly ValueNode[]
  readonly walk: (callback: (node: ValueNode) => boolean | undefined) => void
}

/** Inspect leaves, including nested math; a function name never licenses a design literal. */
export function isStructuralDimensionValue(
  value: string,
  allowsVariable: (name: string) => boolean = () => false,
  options: {
    readonly allowPercentages?: boolean
    readonly allowNegativePercentages?: boolean
    readonly allowSequence?: boolean
    readonly allowPlatformEnvironment?: boolean
    readonly allowCanonicalCalculations?: boolean
    readonly allowFullViewportOrContainer?: boolean
    readonly allowFraction?: boolean
    readonly allowZeroPercentage?: boolean
    readonly allowAnchorFunction?: boolean
    readonly allowAnchorSizeFunction?: boolean
    readonly allowCalcSizeFunction?: boolean
    readonly allowsKeyword?: (keyword: string, parentFunction: string | undefined) => boolean
  } = {},
): boolean {
  const keywords =
    /^(?:auto|none|stretch|fit-content|max-content|min-content|inherit|initial|revert|revert-layer|unset)$/iu
  const fullStructuralUnit =
    /^([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)([sld]?v(?:w|h|i|b|min|max)|cq(?:w|h|i|b|min|max))$/iu
  const structuralFraction = /^([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)fr$/iu
  const percentage = /^([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)%$/iu
  const zeroDimension =
    /^([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)(%|cap|ch|cm|cqb|cqh|cqi|cqmax|cqmin|cqw|em|ex|fr|ic|in|lh|mm|pc|pt|px|q|rcap|rch|rem|rex|ric|rlh|[sld]?v(?:w|h|i|b|min|max))?$/iu

  const significant = (nodes: readonly ValueNode[]) =>
    nodes.filter((node) => node.type !== 'space' && node.type !== 'comment')

  function isEnvironment(node: ValueNode): boolean {
    if (node.type !== 'function' || node.value.toLowerCase() !== 'env' || node.unclosed === true)
      return false
    if (options.allowPlatformEnvironment !== true) return false
    const parts = significant(node.nodes ?? [])
    const commaIndex = parts.findIndex((part) => part.type === 'div' && part.value === ',')
    const input = commaIndex === -1 ? parts : parts.slice(0, commaIndex)
    const fallback = commaIndex === -1 ? [] : parts.slice(commaIndex + 1)
    const simpleName = input.length === 1 && input[0]?.type === 'word' ? input[0].value : ''
    const safeArea = /^safe-area-(?:max-)?inset-(?:top|right|bottom|left)$/u.test(simpleName)
    const otherRegisteredPlatformInput =
      /^(?:keyboard-inset-(?:top|right|bottom|left|width|height)|titlebar-area-(?:x|y|width|height))$/u.test(
        simpleName,
      ) ||
      (input.length === 3 &&
        input[0]?.type === 'word' &&
        /^viewport-segment-(?:width|height|top|right|bottom|left)$/u.test(input[0].value) &&
        input.slice(1).every((part) => part.type === 'word' && /^\d+$/u.test(part.value)))
    if (!safeArea && !otherRegisteredPlatformInput) return false
    if (commaIndex === -1) return true
    if (fallback.length !== 1 || fallback[0]?.type !== 'word') return false
    const fallbackZero = zeroDimension.exec(fallback[0].value)
    return fallbackZero !== null && numericLexemeEquals(fallbackZero[1] ?? '', 0)
  }

  function isAuthorizedVariable(node: ValueNode): boolean {
    if (node.type !== 'function' || node.value.toLowerCase() !== 'var' || node.unclosed === true)
      return false
    const names = significant(node.nodes ?? [])
    return names.length === 1 && names[0]?.type === 'word' && allowsVariable(names[0].value)
  }

  function splitArguments(nodes: readonly ValueNode[]): readonly (readonly ValueNode[])[] {
    const groups: ValueNode[][] = [[]]
    for (const node of significant(nodes)) {
      if (node.type === 'div' && node.value === ',') groups.push([])
      else groups.at(-1)?.push(node)
    }
    return groups
  }

  function inspectAtom(node: ValueNode, parentFunction?: string): boolean {
    if (node.unclosed === true) return false
    if (isAuthorizedVariable(node) || isEnvironment(node)) return true
    if (node.type === 'word') {
      const percentageValue = percentage.exec(node.value)?.[1]
      const zeroMatch = zeroDimension.exec(node.value)
      const zeroValue = zeroMatch?.[1]
      const zeroUnit = zeroMatch?.[2]?.toLowerCase()
      const fullValue = fullStructuralUnit.exec(node.value)?.[1]
      const fractionValue = structuralFraction.exec(node.value)?.[1]
      const keyword = node.value.toLowerCase()
      const keywordAllowed =
        options.allowsKeyword?.(keyword, parentFunction) ?? keywords.test(node.value)
      return (
        (zeroValue !== undefined &&
          numericLexemeEquals(zeroValue, 0) &&
          (zeroUnit !== '%' ||
            options.allowPercentages === true ||
            options.allowZeroPercentage === true) &&
          (zeroUnit !== 'fr' || options.allowFraction === true)) ||
        keywordAllowed ||
        (options.allowFullViewportOrContainer === true &&
          fullValue !== undefined &&
          numericLexemeEquals(fullValue, 100)) ||
        (options.allowFraction === true &&
          fractionValue !== undefined &&
          numericLexemeEquals(fractionValue, 1)) ||
        (options.allowPercentages === true &&
          percentageValue !== undefined &&
          Number.isFinite(Number(percentageValue)) &&
          (options.allowNegativePercentages === true ||
            !percentageValue.startsWith('-') ||
            numericLexemeEquals(percentageValue, 0)))
      )
    }
    if (node.type !== 'function') return false

    const name = node.value.toLowerCase()
    const children = significant(node.nodes ?? [])
    if (name === 'calc') {
      if (children.length !== 3 || children[1]?.type !== 'word') return false
      const operator = children[1].value
      const left = children[0]
      const right = children[2]
      if (left === undefined || right === undefined) return false
      const leftIsDynamic = isAuthorizedVariable(left) || isEnvironment(left)
      const rightIsDynamic = isAuthorizedVariable(right) || isEnvironment(right)
      if (operator === '*' || operator === '/') {
        if (options.allowCanonicalCalculations !== true) return false
        const factor = /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/iu
        const factorNode = leftIsDynamic ? right : left
        const factorValue = factorNode.type === 'word' ? factor.exec(factorNode.value) : null
        return (
          leftIsDynamic !== rightIsDynamic &&
          (operator === '*' || leftIsDynamic) &&
          factorValue !== null &&
          numericLexemeEquals(factorValue[0], 1)
        )
      }
      if (operator !== '+' && operator !== '-') return false
      const structuralPart = leftIsDynamic ? right : left
      return (
        leftIsDynamic !== rightIsDynamic &&
        !(structuralPart.type === 'word' && structuralPart.value === '0') &&
        (operator === '+' || rightIsDynamic) &&
        inspectAtom(left, name) &&
        inspectAtom(right, name)
      )
    }

    const argumentsList = splitArguments(children)
    const singleKeyword = (argument: readonly ValueNode[], keywords: RegExp) =>
      argument.length === 1 && argument[0]?.type === 'word' && keywords.test(argument[0].value)
    if (name === 'anchor' && options.allowAnchorFunction === true) {
      const anchorSide =
        /^(?:bottom|center|end|inside|left|outside|right|self-end|self-start|start|top)$/u
      return (
        (argumentsList.length === 1 || argumentsList.length === 2) &&
        singleKeyword(argumentsList[0] ?? [], anchorSide) &&
        (argumentsList.length === 1 || inspectExpression(argumentsList[1] ?? [], name))
      )
    }
    if (name === 'anchor-size' && options.allowAnchorSizeFunction === true) {
      const anchorDimension = /^(?:block|height|inline|self-block|self-inline|width)$/u
      return (
        (argumentsList.length === 1 || argumentsList.length === 2) &&
        singleKeyword(argumentsList[0] ?? [], anchorDimension) &&
        (argumentsList.length === 1 || inspectExpression(argumentsList[1] ?? [], name))
      )
    }
    if (name === 'calc-size' && options.allowCalcSizeFunction === true) {
      const basis = argumentsList[0] ?? []
      const result = argumentsList[1] ?? []
      return (
        argumentsList.length === 2 &&
        (singleKeyword(
          basis,
          /^(?:any|auto|contain|fit-content|max-content|min-content|stretch)$/u,
        ) ||
          inspectExpression(basis, name)) &&
        (singleKeyword(result, /^size$/u) || inspectExpression(result, name))
      )
    }
    if (name === 'minmax')
      return (
        argumentsList.length === 2 &&
        argumentsList.every((argument) => inspectExpression(argument, name))
      )
    if (name === 'repeat') {
      const count = argumentsList[0]
      return (
        argumentsList.length === 2 &&
        count?.length === 1 &&
        count[0]?.type === 'word' &&
        /^(?:[1-9]\d*|auto-fit|auto-fill)$/u.test(count[0].value) &&
        inspectExpression(argumentsList[1] ?? [], name)
      )
    }
    if (name === 'fit-content')
      return argumentsList.length === 1 && inspectExpression(argumentsList[0] ?? [], name)
    if (name === 'min' || name === 'max')
      return (
        argumentsList.length >= 1 &&
        argumentsList.every((argument) => inspectExpression(argument, name))
      )
    if (name === 'clamp')
      return (
        argumentsList.length === 3 &&
        argumentsList.every((argument) => inspectExpression(argument, name))
      )
    return false
  }

  function inspectExpression(nodes: readonly ValueNode[], parentFunction?: string): boolean {
    const parts = significant(nodes)
    return (
      parts.length >= 1 &&
      (parts.length === 1 || options.allowSequence === true) &&
      parts.every((part) => inspectAtom(part, parentFunction))
    )
  }

  // The value parser keeps adjacent multiply/divide operators in word nodes.
  // These operators do not require whitespace in CSS math; retain CSS comments.
  const mathValue = value.replaceAll(/(?<!\/)\*(?!\/)|(?<![*/])\/(?![*/])/gu, ' $& ')
  return inspectExpression(parseStyleValue(mathValue).nodes)
}

export function normalizeStyleValue(value: string): string {
  const normalize = (nodes: readonly ValueNode[]): string => {
    let result = ''
    let space = false
    for (const node of nodes) {
      if (node.type === 'space' || node.type === 'comment') {
        space = true
        continue
      }
      const token =
        node.type === 'function'
          ? node.value + '(' + normalize(node.nodes ?? []) + ')'
          : node.type === 'string'
            ? JSON.stringify(node.value)
            : node.value
      if (space && result !== '' && !result.endsWith(',') && node.type !== 'div') result += ' '
      result += token
      space = false
    }
    return result.trim()
  }
  const normalized = normalize(parseStyleValue(value).nodes)
  return normalized
}

export function normalizeStyleProperty(property: string): string {
  return property.startsWith('--') ? property : property.toLowerCase()
}

/** Compare a CSS number without binary floating-point rounding or underflow. */
export function numericLexemeEquals(value: string, expected: 0 | 1 | 100): boolean {
  const match = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/iu.exec(value)
  if (match === null) return false
  const negative = match[1] === '-'
  const integer = match[2] ?? ''
  const fraction = match[3] ?? match[4] ?? ''
  let digits = (integer + fraction).replace(/^0+/u, '')
  if (digits === '') return expected === 0
  if (negative || expected === 0) return false
  const parsedExponent = Number(match[5] ?? '0')
  if (!Number.isSafeInteger(parsedExponent)) return false
  let exponent = parsedExponent - fraction.length
  const trailingZeros = /0+$/u.exec(digits)?.[0].length ?? 0
  if (trailingZeros > 0) {
    digits = digits.slice(0, -trailingZeros)
    exponent += trailingZeros
  }
  const target = expected === 1 ? ['1', 0] : ['1', 2]
  return digits === target[0] && exponent === target[1]
}

/** Recognize the one platform font-scale identity without fixing its numeric spelling. */
export function isPreferredTextScaleIdentity(value: string): boolean {
  const significant = (nodes: readonly ValueNode[]): readonly ValueNode[] =>
    nodes.filter((node) => node.type !== 'space' && node.type !== 'comment')
  const roots = significant(parseStyleValue(value).nodes)
  const calculation = roots.length === 1 && roots[0]?.type === 'function' ? roots[0] : undefined
  if (
    calculation === undefined ||
    calculation.unclosed === true ||
    calculation.value.toLowerCase() !== 'calc'
  )
    return false
  const operands = significant(calculation.nodes ?? [])
  if (operands.length !== 3 || operands[1]?.type !== 'word' || operands[1].value !== '*')
    return false
  const isPercentageIdentity = (node: ValueNode | undefined): boolean => {
    if (node?.type !== 'word') return false
    const match = /^([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)%$/iu.exec(node.value)
    return match !== null && numericLexemeEquals(match[1] ?? '', 100)
  }
  const isPreferredScaleEnvironment = (node: ValueNode | undefined): boolean => {
    if (node?.type !== 'function' || node.unclosed === true || node.value.toLowerCase() !== 'env')
      return false
    const inputs = significant(node.nodes ?? [])
    return (
      inputs.length === 1 &&
      inputs[0]?.type === 'word' &&
      inputs[0].value.toLowerCase() === 'preferred-text-scale'
    )
  }
  return (
    (isPercentageIdentity(operands[0]) && isPreferredScaleEnvironment(operands[2])) ||
    (isPreferredScaleEnvironment(operands[0]) && isPercentageIdentity(operands[2]))
  )
}

export function hasObfuscatedCssValueIdentifier(value: string): boolean {
  let obfuscated = false
  parseStyleValue(value).walk((node) => {
    if (node.type === 'string' || node.type === 'space' || node.type === 'comment') return
    if (node.type === 'function' && node.value.toLowerCase() === 'url') return false
    if ((node.type === 'function' || node.type === 'word') && node.value.includes('\\'))
      obfuscated = true
  })
  return obfuscated
}

/** Reject design literals even when they are nested inside CSS functions. */
export function hasRawDesignBearingValue(
  value: string,
  allowFullViewportOrContainer = false,
): boolean {
  let raw = hasObfuscatedCssValueIdentifier(value)
  parseStyleValue(value).walk((node) => {
    if (node.type === 'string' || node.type === 'space' || node.type === 'comment') return
    if (node.type === 'function') {
      const name = node.value.toLowerCase()
      if (name === 'url') return false
      if (
        /^(?:color|color-contrast|color-mix|contrast-color|device-cmyk|gray|hsl|hsla|hwb|lab|lch|light-dark|oklab|oklch|rgb|rgba)$/u.test(
          name,
        ) ||
        /^(?:cubic-bezier|linear|steps)$/u.test(name)
      )
        raw = true
      return
    }
    if (node.type !== 'word') return
    if (
      /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/iu.test(node.value) ||
      /^(?:ease|ease-in|ease-in-out|ease-out|linear|step-end|step-start)$/iu.test(node.value)
    ) {
      raw = true
      return
    }
    const time = /^([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)(?:ms|s)$/iu.exec(node.value)
    if (time !== null) {
      if (!numericLexemeEquals(time[1] ?? '', 0)) raw = true
      return
    }
    const dimension =
      /^([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)(%|cap|ch|cm|cqb|cqh|cqi|cqmax|cqmin|cqw|deg|em|ex|fr|grad|ic|in|lh|mm|pc|pt|px|q|rad|rcap|rch|rem|rex|ric|rlh|[sld]?v(?:w|h|i|b|min|max)|turn)$/iu.exec(
        node.value,
      )
    if (dimension === null) return
    const amount = dimension[1] ?? ''
    const unit = (dimension[2] ?? '').toLowerCase()
    if (
      !numericLexemeEquals(amount, 0) &&
      unit !== '%' &&
      !(numericLexemeEquals(amount, 1) && unit === 'fr') &&
      !(
        allowFullViewportOrContainer &&
        numericLexemeEquals(amount, 100) &&
        /^(?:cq(?:w|h|i|b|min|max)|[sld]?v(?:w|h|i|b|min|max))$/u.test(unit)
      )
    )
      raw = true
  })
  return raw
}
