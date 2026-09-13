import { createRequire } from 'node:module'
import { relative } from 'node:path'

import stylelint from 'stylelint'

import tokenManifest from '../../packages/design-system/src/generated/tokens.manifest.json' with { type: 'json' }
import {
  generatedStyleOwners,
  hasExactOwnedStyleDeclaration,
  hasKeyframeOwner,
  hasRawDesignBearingValue,
  hasScssFallbackAtRuleOwner,
  hasStyleAtRuleOwner,
  hasStyleRuleOwner,
  isPreferredTextScaleIdentity,
  normalizeStyleContext,
  normalizeStyleProperty,
  normalizeStyleValue,
  numericLexemeEquals,
  privateStyleVariableAllowed,
  privateStyleVariableValueKind,
  scssFallbackAtRuleViolations,
  styleDeclarationKey,
  styleDeclarationResponsibility,
} from '../architecture/style-ownership.ts'
import {
  dimensionProperty,
  isStructuralDimensionValue,
  mappingCssProperties,
  physicalDimensionProperty,
  structuralColor,
} from './style-authority.ts'

const ruleName = 'pavp/style-authority'
const requireFromStylelint = createRequire(import.meta.resolve('stylelint'))
const parseValue = requireFromStylelint('postcss-value-parser')
const canonicalVariables = new Set(tokenManifest.tokens.map((token) => token.cssVariable))
const insetProperty = /^(?:inset(?:-(?:block|inline)(?:-(?:start|end))?)?|top|right|bottom|left)$/u
const spacingGeometryProperty =
  /^(?:(?:scroll-)?(?:margin|padding)(?:-(?:top|right|bottom|left|block|inline|block-(?:start|end)|inline-(?:start|end)))?|(?:row|column)-gap|grid-(?:row|column)-gap|gap|shape-margin)$/u
const colorBearingProperty =
  /^(?:(?:[a-z-]+-)?color|fill|stroke|background|column-rule|outline|border(?:-(?:top|right|bottom|left|block|inline|block-(?:start|end)|inline-(?:start|end)))?|text-decoration|text-emphasis|-webkit-text-stroke)$/u
const privateDimensionProperty =
  /^(?:timeline-trigger-(?:exit-)?range(?:-(?:start|end))?|(?:(?:min|max)-)?(?:width|height|inline-size|block-size)|flex-basis|inset(?:-(?:block|inline)(?:-(?:start|end))?)?|top|right|bottom|left|(?:scroll-)?(?:margin|padding)(?:-(?:top|right|bottom|left|block|inline|block-(?:start|end)|inline-(?:start|end)))?|(?:row|column)-gap|grid-(?:row|column)-gap|gap|shape-margin|animation-range(?:-(?:start|end))?|background-(?:position(?:-[xy])?|size)|(?:perspective|transform)-origin|border(?:-(?:top|right|bottom|left|block|inline|block-(?:start|end)|inline-(?:start|end)))?-width|outline-(?:width|offset)|grid-auto-(?:columns|rows)|mask-(?:position|size)|object-position|offset-(?:anchor|distance|position)|stroke-(?:dasharray|dashoffset|width)|tab-size|text-indent|text-underline-offset|vertical-align|view-timeline-inset|perspective|translate|contain-intrinsic-(?:width|height|inline-size|block-size)|baseline-shift|line-height-step|(?:cx|cy|r|rx|ry|x|y))$/u
const geometryProperty =
  /^(?:animation-range(?:-(?:start|end))?|aspect-ratio|background-(?:position(?:-[xy])?|size)|clip-path|flex-basis|inset(?:-(?:block|inline)(?:-(?:start|end))?)?|top|right|bottom|left|(?:scroll-)?(?:margin|padding)(?:-(?:top|right|bottom|left|block|inline|block-(?:start|end)|inline-(?:start|end)))?|(?:row|column)-gap|grid-(?:row|column)-gap|gap|shape-(?:margin|outside)|(?:perspective|transform)-origin|border(?:-(?:top|right|bottom|left|block|inline|block-(?:start|end)|inline-(?:start|end)))?-width|outline-width|outline-offset|grid-(?:auto|template)-(?:columns|rows)|mask-(?:position|size)|object-position|offset-(?:anchor|distance|position)|stroke-(?:dasharray|dashoffset|miterlimit|width)|tab-size|text-indent|text-underline-offset|vertical-align|view-timeline-inset|contain-intrinsic-(?:width|height|inline-size|block-size)|baseline-shift|line-height-step|scroll-snap-(?:coordinate|destination|points-[xy])|(?:cx|cy|r|rx|ry|x|y))$/u
const structuralPercentageProperty =
  /^(?:animation-range(?:-(?:start|end))?|(?:(?:min|max)-)?(?:width|height|inline-size|block-size)|flex-basis|inset(?:-(?:block|inline)(?:-(?:start|end))?)?|top|right|bottom|left|grid-template-(?:columns|rows)|scroll-padding(?:-(?:top|right|bottom|left|block|inline|block-(?:start|end)|inline-(?:start|end)))?|view-timeline-inset)$/u
const negativePercentageProperty =
  /^(?:inset(?:-(?:block|inline)(?:-(?:start|end))?)?|top|right|bottom|left|view-timeline-inset)$/u
const platformEnvironmentProperty =
  /^(?:(?:(?:min|max)-)?(?:width|height|inline-size|block-size)|inset(?:-(?:block|inline)(?:-(?:start|end))?)?|top|right|bottom|left|(?:scroll-)?(?:margin|padding)(?:-(?:top|right|bottom|left|block|inline|block-(?:start|end)|inline-(?:start|end)))?)$/u
const visualProperty =
  /^(?:timeline-trigger(?:-[a-z-]+)?|animation-(?:iteration-count|range(?:-(?:start|end))?|timeline|trigger(?:-[a-z-]+)?)|background(?:-[a-z-]+)?|(?:[a-z-]+-)?color|fill|stroke|column-rule(?:-[a-z-]+)?|text-decoration(?:-[a-z-]+)?|text-emphasis(?:-[a-z-]+)?|(?:-(?:moz|ms|o|webkit)-)?text-size-adjust|-webkit-text-(?:fill|stroke)(?:-color)?|border(?:-[a-z-]+)?|outline(?:-[a-z-]+)?|font(?:-[a-z-]+)?|line-height|line-height-step|letter-spacing|word-spacing|baseline-shift|initial-letter|box-shadow|text-shadow|z-index|opacity|(?:fill|flood|stop|stroke)-opacity|shape-(?:image-threshold|margin|outside)|zoom|perspective|transform|translate|rotate|scale|filter|backdrop-filter|-webkit-backdrop-filter|clip-path|mask(?:-[a-z-]+)?|object-position|offset-(?:anchor|distance|path|position)|(?:scroll|view)-timeline(?:-[a-z-]+)?|timeline-scope|view-transition-name|image-resolution|color-scheme|(?:background|mix)-blend-mode|columns|column-(?:count|width)|will-change|scrollbar-width|scroll-snap-(?:coordinate|destination|points-[xy])|contain-intrinsic-(?:width|height|inline-size|block-size)|grid-(?:auto-(?:columns|rows)|(?:row|column)-gap)|(?:cx|cy|r|rx|ry|x|y))$/u
const cssWideValue = /^(?:inherit|initial|revert|revert-layer|unset)$/iu

function contextOf(node) {
  const context = []
  for (let ancestor = node.parent; ancestor !== undefined; ancestor = ancestor.parent) {
    if (ancestor.type === 'atrule') context.unshift('@' + ancestor.name + ' ' + ancestor.params)
  }
  return context
}

function declarationIdentity(node, path, block) {
  const selectors = []
  for (let ancestor = node.parent; ancestor !== undefined; ancestor = ancestor.parent) {
    if (ancestor.type === 'rule') selectors.unshift(ancestor.selector)
  }
  return {
    path,
    block,
    context: contextOf(node),
    selector: selectors.join(' '),
    property: normalizeStyleProperty(node.prop),
    value: node.value,
    important: node.important === true,
  }
}

function compatibleVariable(name, property) {
  if (!canonicalVariables.has(name)) return false
  const physical = physicalDimensionProperty(property)
  return tokenManifest.unoCssMappings.some(
    (mapping) =>
      mapping.cssVariable === name &&
      (/^grid-(?:auto|template)-/u.test(property)
        ? mappingCssProperties(mapping).some((candidate) => {
            const physicalCandidate = physicalDimensionProperty(candidate)
            return property.endsWith('-columns')
              ? /^(?:(?:min|max)-)?width$/u.test(physicalCandidate)
              : /^(?:(?:min|max)-)?height$/u.test(physicalCandidate)
          })
        : /^(?:inset|top|right|bottom|left|translate|transform-origin)/u.test(property)
          ? mapping.family === 'spacing'
          : property === 'flex-basis'
            ? mappingCssProperties(mapping).includes('width')
            : mappingCssProperties(mapping).includes(physical)),
  )
}

function privateVariableCompatible(declaration, name, property) {
  if (!privateStyleVariableAllowed(declaration, name, false)) return false
  const kind = privateStyleVariableValueKind(name)
  if (kind === 'color') return colorBearingProperty.test(property)
  return kind === 'dimension' && privateDimensionProperty.test(property)
}

function singleVariableName(value) {
  const nodes = parseValue(value).nodes.filter(
    (node) => node.type !== 'space' && node.type !== 'comment',
  )
  const variable = nodes.length === 1 && nodes[0]?.type === 'function' ? nodes[0] : undefined
  if (variable?.value.toLowerCase() !== 'var' || variable.unclosed === true) return undefined
  const inputs = variable.nodes.filter((node) => node.type !== 'space' && node.type !== 'comment')
  return inputs.length === 1 && inputs[0]?.type === 'word' ? inputs[0].value : undefined
}

function isZeroLength(value) {
  const zero =
    /^([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)(?:cap|ch|cm|cqb|cqh|cqi|cqmax|cqmin|cqw|em|ex|ic|in|lh|mm|pc|pt|px|q|rcap|rch|rem|rex|ric|rlh|[sld]?v(?:w|h|i|b|min|max))?$/iu.exec(
      normalizeStyleValue(value),
    )
  return zero !== null && numericLexemeEquals(zero[1], 0)
}

function isZeroAngle(value) {
  const zero = /^([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)(?:deg|grad|rad|turn)?$/iu.exec(
    normalizeStyleValue(value),
  )
  return zero !== null && numericLexemeEquals(zero[1], 0)
}

function isIdentityScale(value) {
  const nodes = parseValue(value).nodes.filter((node) => node.type !== 'space')
  return (
    nodes.length >= 1 &&
    nodes.every(
      (node) =>
        (node.type === 'word' &&
          (isUnitlessNumber(node.value, 1) ||
            (/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?%$/iu.test(node.value) &&
              numericLexemeEquals(node.value.slice(0, -1), 100)))) ||
        (node.type === 'div' && node.value === ','),
    ) &&
    nodes[0]?.type === 'word' &&
    nodes.at(-1)?.type === 'word'
  )
}

function isStructuralTranslation(value, variableAllowed, options, requiredGroups) {
  const groups = [[]]
  for (const node of parseValue(value).nodes) {
    if (node.type === 'div' && node.value === ',') groups.push([])
    else groups.at(-1).push(node)
  }
  return (
    (requiredGroups === undefined || groups.length === requiredGroups) &&
    groups.every(
      (group) =>
        group.some((node) => node.type !== 'space' && node.type !== 'comment') &&
        isStructuralDimensionValue(parseValue.stringify(group), variableAllowed, options),
    )
  )
}

function isUnitlessNumber(value, expected) {
  const number = /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/iu
  return number.test(value) && numericLexemeEquals(value, expected)
}

function isPercentageNumber(value, expected) {
  const percentage = /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?%$/iu
  return percentage.test(value) && numericLexemeEquals(value.slice(0, -1), expected)
}

function isIdentityNumber(value) {
  return isUnitlessNumber(value, 1) || isPercentageNumber(value, 100)
}

function isEndpointNumber(value) {
  return (
    isUnitlessNumber(value, 0) ||
    isUnitlessNumber(value, 1) ||
    isPercentageNumber(value, 0) ||
    isPercentageNumber(value, 100)
  )
}

function structuralKeywordAllowed(property, value) {
  if (property === 'text-emphasis-style') return value === 'none'
  if (value === 'auto') {
    return (
      /^(?:(?:min-)?(?:width|height|inline-size|block-size)|flex-basis)$/u.test(property) ||
      insetProperty.test(property) ||
      /^(?:margin(?:-(?:top|right|bottom|left|block|inline|block-(?:start|end)|inline-(?:start|end)))?|scroll-padding(?:-(?:top|right|bottom|left|block|inline|block-(?:start|end)|inline-(?:start|end)))?|aspect-ratio|grid-template-(?:columns|rows)|background-size|mask-size|offset-(?:anchor|position)|view-timeline-inset|(?:-(?:moz|ms|o|webkit)-)?text-size-adjust|text-underline-offset|columns|column-(?:count|width))$/u.test(
        property,
      ) ||
      /^(?:accent-color|caret-color|outline-color|outline-style|scrollbar-color|scrollbar-width|will-change)$/u.test(
        property,
      )
    )
  }
  if (value === 'none') {
    return /^(?:max-(?:width|height|inline-size|block-size)|contain-intrinsic-(?:width|height|inline-size|block-size)|grid-template-(?:columns|rows)|background(?:-image)?|border(?:-(?:top|right|bottom|left|block|inline|block-(?:start|end)|inline-(?:start|end)))?(?:-style)?|outline(?:-style)?|box-shadow|text-shadow|clip-path|shape-outside|mask(?:-image|-border-source)?|offset-path|filter|backdrop-filter|-webkit-backdrop-filter|perspective|transform|translate|rotate|scale|(?:-(?:moz|ms|o|webkit)-)?text-size-adjust|animation-(?:timeline|trigger(?:-[a-z-]+)?)|(?:scroll|view)-timeline(?:-[a-z-]+)?|timeline-scope|view-transition-name|scrollbar-width|fill|stroke|stroke-dasharray)$/u.test(
      property,
    )
  }
  if (value === 'normal') {
    return /^(?:(?:row|column)-gap|gap|animation-range(?:-(?:start|end))?|(?:background|mix)-blend-mode|offset-position|zoom)$/u.test(
      property,
    )
  }
  return (
    /^(?:stretch|fit-content|max-content|min-content)$/u.test(value) &&
    /^(?:(?:(?:min|max)-)?(?:width|height|inline-size|block-size)|flex-basis|grid-template-(?:columns|rows))$/u.test(
      property,
    )
  )
}

function approvedBlurValue(value) {
  return singleVariableName(value) === '--ui-admin-optical-backdrop-blur' || isZeroLength(value)
}

function isStructuralTimelineFunction(value) {
  const parsed = parseValue(value)
  const significant = parsed.nodes.filter(
    (node) => node.type !== 'space' && node.type !== 'comment',
  )
  return (
    significant.length === 1 &&
    significant[0]?.type === 'function' &&
    significant[0].unclosed !== true &&
    /^(?:scroll|view)$/iu.test(significant[0].value) &&
    significant[0].nodes
      .filter((node) => node.type !== 'space' && node.type !== 'comment')
      .every(
        (node) =>
          node.type === 'word' && /^(?:block|inline|nearest|root|self|x|y)$/iu.test(node.value),
      )
  )
}

function isStructuralTriggerRange(declaration, property) {
  const groups = [[]]
  for (const node of parseValue(declaration.value).nodes) {
    if (node.type === 'space' || node.type === 'comment') continue
    if (node.type === 'div' && node.value === ',') groups.push([])
    else groups.at(-1).push(node)
  }
  const endpoint = (node) => {
    if (node === undefined) return false
    if (node.type === 'word')
      return (
        isZeroLength(node.value) ||
        isPercentageNumber(node.value, 0) ||
        isPercentageNumber(node.value, 100)
      )
    return (
      node.type === 'function' &&
      /^(?:var|calc)$/iu.test(node.value) &&
      isStructuralDimensionValue(
        parseValue.stringify(node),
        (name) =>
          compatibleVariable(name, property) ||
          privateVariableCompatible(declaration, name, property),
        { allowZeroPercentage: true, allowCanonicalCalculations: true, allowsKeyword: () => false },
      )
    )
  }
  return groups.every((nodes) => {
    let count = 0
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index]
      const keyword = node.type === 'word' ? node.value.toLowerCase() : ''
      if (/^(?:contain|cover|entry|entry-crossing|exit|exit-crossing)$/u.test(keyword)) {
        if (endpoint(nodes[index + 1])) index += 1
      } else if (
        keyword !== 'normal' &&
        !(keyword === 'auto' && property.startsWith('timeline-trigger-exit-range')) &&
        !endpoint(node)
      )
        return false
      count += 1
    }
    return count > 0 && count <= (/-(?:start|end)$/u.test(property) ? 1 : 2)
  })
}

function approvedVisualValue(declaration, responsibility, property = declaration.property) {
  const { value } = declaration
  const normalized = normalizeStyleValue(value)
  const scssFallback = responsibility === 'LEGITIMATE_SCSS_FALLBACK'
  if (scssFallback && property === 'color-scheme') return false
  if (cssWideValue.test(normalized)) return true
  if (/^timeline-trigger-(?:exit-)?range(?:-(?:start|end))?$/u.test(property))
    return scssFallback && isStructuralTriggerRange(declaration, property)
  if (/^timeline-trigger(?:-name|-source)?$/u.test(property))
    return (
      normalized.toLowerCase() === 'none' ||
      (property === 'timeline-trigger-source' &&
        (normalized.toLowerCase() === 'auto' || isStructuralTimelineFunction(value)))
    )
  if (property === 'border-collapse') return /^(?:collapse|separate)$/iu.test(normalized)
  if (property === 'border-spacing')
    return isStructuralDimensionValue(value, () => false, {
      allowSequence: true,
      allowZeroPercentage: true,
    })
  if (property === 'border-image-source') return normalized.toLowerCase() === 'none'
  if (property === 'background-repeat')
    return /^(?:(?:no-repeat|repeat|round|space)(?:\s+(?:no-repeat|repeat|round|space))?|repeat-[xy])$/iu.test(
      normalized,
    )
  if (/^(?:background|mask)-(?:clip|origin)$/u.test(property))
    return /^(?:border-box|content-box|padding-box)$/iu.test(normalized)
  if (property === 'background-attachment') return /^(?:fixed|local|scroll)$/iu.test(normalized)
  if (property === 'mask-repeat')
    return /^(?:(?:no-repeat|repeat|round|space)(?:\s+(?:no-repeat|repeat|round|space))?|repeat-[xy])$/iu.test(
      normalized,
    )
  if (property === 'mask-composite')
    return /^(?:add|exclude|intersect|subtract)$/iu.test(normalized)
  if (property === 'mask-mode') return /^(?:alpha|luminance|match-source)$/iu.test(normalized)
  if (property === 'mask-type') return /^(?:alpha|luminance)$/iu.test(normalized)
  if (property === 'text-decoration-line') return normalized.toLowerCase() === 'none'
  if (/^(?:background-size|mask-size)$/u.test(property) && /^(?:contain|cover)$/iu.test(normalized))
    return true
  if (property === 'outline-style' && normalized.toLowerCase() === 'auto') return true
  if (property === 'will-change') return normalized.toLowerCase() === 'auto'
  if (property === 'scrollbar-width') return /^(?:auto|none)$/iu.test(normalized)
  if (property === 'initial-letter') return normalized.toLowerCase() === 'normal'
  if (property === 'baseline-shift' && /^(?:baseline|sub|super)$/iu.test(normalized)) return true
  if (property === 'background-position-x')
    return /^(?:center|end|left|right|start|x-end|x-start)$/iu.test(normalized)
  if (property === 'background-position-y')
    return /^(?:bottom|center|end|start|top|y-end|y-start)$/iu.test(normalized)
  if (
    /^(?:animation-timeline|animation-trigger(?:-[a-z-]+)?|(?:scroll|view)-timeline(?:-[a-z-]+)?|timeline-scope|view-transition-name)$/u.test(
      property,
    )
  ) {
    return (
      /^(?:auto|none)$/iu.test(normalized) ||
      (property === 'animation-timeline' && isStructuralTimelineFunction(value))
    )
  }
  if (property === 'flex-basis' && normalized.toLowerCase() === 'content') return true
  if (/^grid-template-(?:columns|rows)$/u.test(property) && normalized.toLowerCase() === 'subgrid')
    return true
  if (/^(?:auto|none|normal|stretch|fit-content|max-content|min-content)$/iu.test(normalized))
    return structuralKeywordAllowed(property, normalized.toLowerCase())
  if (property === 'aspect-ratio') return isUnitlessNumber(normalized, 0)
  if (/^(?:-(?:moz|ms|o|webkit)-)?text-size-adjust$/u.test(property)) {
    if (isPercentageNumber(normalized, 100)) return true
    return scssFallback && isPreferredTextScaleIdentity(value)
  }
  if (/^(?:columns|column-count)$/u.test(property)) return isUnitlessNumber(normalized, 1)
  if (property === 'column-width') return isZeroLength(normalized)
  if (/^(?:background|mix)-blend-mode$/u.test(property)) return false
  if (property === 'image-resolution') return /^from-image(?: snap)?$/iu.test(normalized)
  if (property === 'vertical-align')
    return /^(?:baseline|bottom|middle|sub|super|text-bottom|text-top|top)$/iu.test(normalized)
  if (
    /^(?:background-position(?:-[xy])?|mask-position|object-position|offset-(?:anchor|position)|perspective-origin|transform-origin)$/u.test(
      property,
    ) &&
    /^(?:(?:bottom|center|left|right|top)(?:\s+(?:bottom|center|left|right|top))?)$/iu.test(
      normalized,
    )
  )
    return true
  if (property === 'stroke-miterlimit') return isUnitlessNumber(normalized, 1)
  if (property === 'perspective') return isZeroLength(value)
  if (/^border(?:-[a-z]+){0,3}-radius$/u.test(property))
    return isZeroLength(normalized) || isPercentageNumber(normalized, 0)
  if (property === 'z-index') return isUnitlessNumber(normalized, 0)
  if (property === 'font-size') return isZeroLength(normalized) || isPercentageNumber(normalized, 0)
  if (/^(?:line-height|letter-spacing|word-spacing)$/u.test(property))
    return isZeroLength(normalized) || isPercentageNumber(normalized, 0)
  if (
    dimensionProperty.test(property) ||
    geometryProperty.test(property) ||
    spacingGeometryProperty.test(property)
  ) {
    return isStructuralDimensionValue(
      value,
      (name) =>
        compatibleVariable(name, property) ||
        privateVariableCompatible(declaration, name, property),
      {
        allowPercentages: scssFallback && structuralPercentageProperty.test(property),
        allowNegativePercentages: scssFallback && negativePercentageProperty.test(property),
        allowPlatformEnvironment: scssFallback && platformEnvironmentProperty.test(property),
        allowCanonicalCalculations: scssFallback,
        allowFullViewportOrContainer: scssFallback && structuralPercentageProperty.test(property),
        allowZeroPercentage: true,
        allowAnchorFunction: scssFallback && insetProperty.test(property),
        allowAnchorSizeFunction: scssFallback && dimensionProperty.test(property),
        allowCalcSizeFunction: scssFallback && dimensionProperty.test(property),
        allowFraction: scssFallback && /^grid-(?:auto|template)-(?:columns|rows)$/u.test(property),
        allowsKeyword: (keyword, parentFunction) => {
          if (parentFunction === undefined) {
            if (/^animation-range(?:-(?:start|end))?$/u.test(property))
              return /^(?:contain|cover|entry|entry-crossing|exit|exit-crossing|normal)$/u.test(
                keyword,
              )
            if (
              /^(?:background-position(?:-[xy])?|mask-position|object-position|offset-(?:anchor|position)|perspective-origin|transform-origin)$/u.test(
                property,
              )
            )
              return /^(?:bottom|center|left|right|top)$/u.test(keyword)
            return structuralKeywordAllowed(property, keyword)
          }
          return (
            /^grid-(?:auto|template)-(?:columns|rows)$/u.test(property) &&
            /^(?:minmax|repeat)$/u.test(parentFunction) &&
            /^(?:auto|max-content|min-content)$/u.test(keyword)
          )
        },
        allowSequence:
          scssFallback &&
          /^(?:animation-range(?:-(?:start|end))?|grid-(?:auto|template)-(?:columns|rows)|inset(?:-(?:inline|block))?|view-timeline-inset|background-position(?:-[xy])?|mask-position|object-position|offset-(?:anchor|position)|perspective-origin|transform-origin)$/u.test(
            property,
          ),
      },
    )
  }
  if (/^(?:font|letter-spacing|word-spacing)$/u.test(property)) return false
  if (/^(?:filter|backdrop-filter|-webkit-backdrop-filter)$/u.test(property) && scssFallback) {
    const parsed = parseValue(value)
    return (
      parsed.nodes.length > 0 &&
      parsed.nodes.every((node) => {
        if (node.type === 'space') return true
        if (node.type !== 'function' || node.unclosed === true) return false
        const functionName = node.value.toLowerCase()
        const input = parseValue.stringify(node.nodes)
        if (functionName === 'blur') return approvedBlurValue(input)
        if (/^(?:grayscale|invert|sepia)$/u.test(functionName))
          return isUnitlessNumber(normalizeStyleValue(input), 0)
        if (functionName === 'hue-rotate') return isZeroAngle(input)
        return (
          /^(?:brightness|contrast|opacity|saturate)$/u.test(functionName) &&
          isIdentityNumber(normalizeStyleValue(input))
        )
      })
    )
  }
  if (/^(?:transform|translate|rotate|scale)$/u.test(property)) {
    const variableAllowed = (name) =>
      compatibleVariable(name, 'translate') ||
      privateVariableCompatible(declaration, name, 'translate')
    const structuralOptions = {
      allowPercentages: scssFallback,
      allowNegativePercentages: scssFallback,
      allowPlatformEnvironment: scssFallback,
      allowCanonicalCalculations: scssFallback,
      allowFullViewportOrContainer: scssFallback,
      allowsKeyword: () => false,
      allowSequence: true,
    }
    if (property === 'translate')
      return isStructuralTranslation(value, variableAllowed, structuralOptions)
    if (property === 'rotate') return isZeroAngle(value)
    if (property === 'scale') return isIdentityScale(value)
    const parsed = parseValue(value)
    return (
      parsed.nodes.length > 0 &&
      parsed.nodes.every((node) => {
        if (node.type === 'space') return true
        if (node.type !== 'function' || node.unclosed === true) return false
        const functionName = node.value.toLowerCase()
        const input = parseValue.stringify(node.nodes)
        if (/^translate(?:x|y|z)?$/u.test(functionName))
          return isStructuralTranslation(input, variableAllowed, structuralOptions)
        if (functionName === 'translate3d')
          return isStructuralTranslation(input, variableAllowed, structuralOptions, 3)
        if (/^scale(?:x|y|z|3d)?$/u.test(functionName)) return isIdentityScale(input)
        if (/^rotate(?:x|y|z)?$/u.test(functionName)) return isZeroAngle(input)
        return false
      })
    )
  }
  if (property === 'animation-iteration-count' && isUnitlessNumber(normalized, 0)) return true
  if (property === 'animation-iteration-count' && isUnitlessNumber(normalized, 1)) return true
  if (property === 'animation-iteration-count' && normalized.toLowerCase() === 'infinite')
    return true
  if (
    /^(?:(?:fill|flood|stop|stroke)-opacity|opacity|shape-image-threshold|zoom)$/u.test(property) &&
    ((property === 'zoom' && isIdentityNumber(normalized)) ||
      (property !== 'zoom' && isEndpointNumber(normalized)))
  )
    return true
  if (/^(?:border|outline)(?:-[a-z-]+)?-style$|^border-style$/u.test(property)) {
    return /^(?:none|hidden|solid|dashed|dotted|double)$/iu.test(normalized)
  }
  if (property === 'background' || /color$|^(?:color|fill|stroke)$/u.test(property)) {
    if (structuralColor.test(normalized)) return true
  }
  const variable = singleVariableName(value)
  if (variable !== undefined) {
    if (privateVariableCompatible(declaration, variable, property)) return true
    const mappedProperty = property === 'background' ? 'background-color' : property
    return compatibleVariable(variable, mappedProperty)
  }
  return false
}

export function inspectStyleAuthoring(root, path, block) {
  const violations = []
  const report = (node, message) => violations.push({ node, message })
  const keyframeOccurrences = new Map()
  const atRuleOccurrences = new Map()
  const generatedOwner = generatedStyleOwners.find((owner) => owner.path === path)
  // Generated contents are re-derived and byte-compared by the named producer's
  // tokens:check gate. This is a producer contract, not an authoring exception.
  if (generatedOwner !== undefined) return violations

  root.walkAtRules((node) => {
    if (node.name.toLowerCase().endsWith('keyframes')) {
      const context = contextOf(node)
      const key = JSON.stringify([
        path,
        block,
        normalizeStyleContext(context),
        normalizeStyleValue(node.params),
      ])
      const occurrence = (keyframeOccurrences.get(key) ?? 0) + 1
      keyframeOccurrences.set(key, occurrence)
      if (
        node.name.toLowerCase() !== 'keyframes' ||
        !hasKeyframeOwner(path, block, context, node.params, occurrence)
      ) {
        report(node, 'Keyframes require one exact path/block/context/name/family owner occurrence.')
      }
      return
    }
    const context = contextOf(node)
    const key = JSON.stringify([
      path,
      block,
      normalizeStyleContext(context),
      node.name.toLowerCase(),
      normalizeStyleValue(node.params),
    ])
    const occurrence = (atRuleOccurrences.get(key) ?? 0) + 1
    atRuleOccurrences.set(key, occurrence)
    if (!hasStyleAtRuleOwner(path, block, context, node.name, node.params, occurrence)) {
      report(node, 'At-rule context or declaration has no exact import/layer/platform owner.')
    }
    if (hasScssFallbackAtRuleOwner(path, block, context, node.name, node.params, occurrence))
      for (const violation of scssFallbackAtRuleViolations(node.name, node.params))
        report(node, violation)
  })

  root.walkRules((node) => {
    if (!hasStyleRuleOwner(path, block, contextOf(node), node.selector)) {
      report(
        node,
        'Selector/context has no exact owner; ordinary styling must use semantic UnoCSS.',
      )
    }
  })

  const occurrences = new Map()
  root.walkDecls((node) => {
    const declaration = declarationIdentity(node, path, block)
    const property = declaration.property
    const authorityProperty = property.replace(/^-(?:moz|ms|o|webkit)-/u, '')
    const key = styleDeclarationKey(declaration)
    const occurrence = (occurrences.get(key) ?? 0) + 1
    occurrences.set(key, occurrence)
    const responsibility = styleDeclarationResponsibility(declaration, occurrence)
    if (responsibility === undefined) {
      report(
        node,
        'No New Debt: declaration is outside the decreasing ordinary baseline or exact owner contract.',
      )
    }
    if (property.startsWith('--ui-')) {
      report(node, 'Public --ui-* declarations belong only to canonical generated/runtime writers.')
    }
    if (property.startsWith('--') && !privateStyleVariableAllowed(declaration, property, true)) {
      report(node, 'Private design variables require an exact registered writer and declaration.')
    }
    parseValue(node.value).walk((valueNode) => {
      if (valueNode.type !== 'function' || valueNode.value.toLowerCase() !== 'var') return
      const name = valueNode.nodes.find((child) => child.type === 'word')?.value
      if (
        name === undefined ||
        (!canonicalVariables.has(name) && !privateStyleVariableAllowed(declaration, name, false))
      ) {
        report(
          node,
          'CSS variable input has no canonical token or exact registered private consumer.',
        )
      }
    })
    const exactOwned = hasExactOwnedStyleDeclaration(declaration, occurrence)
    const exactRegisteredOwner = exactOwned || responsibility === 'LEGITIMATE_SCSS_FALLBACK'
    if (node.important && !exactRegisteredOwner) {
      report(
        node,
        '!important requires the exact existing vendor declaration; no file-wide exception exists.',
      )
    }
    if (
      /^(?:filter|backdrop-filter|-webkit-backdrop-filter)$/u.test(property) &&
      !exactRegisteredOwner
    ) {
      report(node, 'Optical effects require the exact canonical adapter declaration.')
    }
    if (
      responsibility === 'LEGITIMATE_SCSS_FALLBACK' &&
      hasRawDesignBearingValue(node.value, structuralPercentageProperty.test(authorityProperty))
    ) {
      report(
        node,
        'SCSS fallback values must use canonical or registered inputs; raw colors, design units, durations, and easing are forbidden.',
      )
    }
    // Historical ordinary values are frozen by the complete identity above. Named
    // private motion/vendor geometry preserves only its exact existing declaration.
    if (responsibility === 'ORDINARY_STYLE_DEBT' || exactOwned) return
    if (
      (dimensionProperty.test(authorityProperty) ||
        geometryProperty.test(authorityProperty) ||
        visualProperty.test(authorityProperty)) &&
      !approvedVisualValue(declaration, responsibility, authorityProperty)
    ) {
      report(
        node,
        'Use a property-compatible canonical design value or an exact private geometry contract.',
      )
    }
  })
  return violations
}

export default stylelint.createPlugin(ruleName, () => (root, result) => {
  const source = relative(process.cwd(), root.source.input.file).replaceAll('\\', '/')
  const match = /^(.*\.vue)\.style-(\d+)\.css$/u.exec(source)
  const path = match?.[1] ?? source
  const block = match === null ? 0 : Number(match[2]) - 1
  for (const { node, message } of inspectStyleAuthoring(root, path, block)) {
    stylelint.utils.report({ ruleName, result, node, message })
  }
})
