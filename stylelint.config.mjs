import tokenManifest from './packages/design-system/src/generated/tokens.manifest.json' with { type: 'json' }

const rawColorFunction = /(?:color|hsl|hsla|hwb|lab|lch|oklab|oklch|rgb|rgba)\s*\(/iu
const rawTime = /(?:^|[\s(,])[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:ms|s)(?=$|[\s),;/])/iu
const rawTimingFunction =
  /\b(?:ease|ease-in|ease-in-out|ease-out|linear|step-end|step-start)\b|(?:cubic-bezier|steps)\s*\(/iu
const transitionPropertyAll = /(?:^|,)\s*all\s*(?=,|$)/iu
const cssWideValues = ['inherit', 'initial', 'revert', 'revert-layer', 'unset']

function escapeRegularExpression(value) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function variablesForMappings(predicate) {
  return [
    ...new Set(
      tokenManifest.unoCssMappings
        .filter((mapping) => predicate(mapping))
        .map((mapping) => mapping.cssVariable),
    ),
  ]
}

function disallowOutsideAuthorities(variables, allowedValues = []) {
  const authorities = [
    ...variables.map((variable) => `var\\(${escapeRegularExpression(variable)}\\)`),
    ...allowedValues.map(escapeRegularExpression),
    ...cssWideValues,
  ]

  return new RegExp(`^(?!(?:${authorities.join('|')})$).+`, 'u')
}

function disallowOutsideDimensionAuthorities(variables) {
  const authorities = [
    ...variables.map((variable) => `var\\(${escapeRegularExpression(variable)}\\)`),
    ...cssWideValues,
  ]
  const structuralValues =
    '(?:0|auto|fit-content|max-content|min-content|none|(?:calc|clamp|fit-content|max|min|minmax)\\(.+\\)|[-+]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:%|dvh|dvw|fr|lvh|lvw|svh|svw|vh|vw))'

  return new RegExp(`^(?!(?:${authorities.join('|')}|${structuralValues})$).+`, 'u')
}

function disallowUnapprovedUiVariables(variables) {
  const authorities = variables.map(escapeRegularExpression).join('|')
  return new RegExp(`var\\((?!(?:${authorities})\\))--ui-[a-z0-9-]+\\)`, 'u')
}

const backgroundColorVariables = variablesForMappings((mapping) =>
  mapping.allowedCssProperties.includes('background-color'),
)
const borderColorVariables = variablesForMappings((mapping) =>
  mapping.allowedCssProperties.includes('border-color'),
)
const textColorVariables = variablesForMappings((mapping) =>
  mapping.allowedCssProperties.includes('color'),
)
const spacingVariables = variablesForMappings((mapping) => mapping.family === 'spacing')
const heightVariables = variablesForMappings((mapping) =>
  mapping.allowedCssProperties.includes('height'),
)
const maxWidthVariables = variablesForMappings((mapping) =>
  mapping.allowedCssProperties.includes('max-width'),
)
const radiusVariables = variablesForMappings((mapping) => mapping.family === 'radius')
const shadowVariables = variablesForMappings((mapping) => mapping.family === 'shadow')
const zIndexVariables = variablesForMappings((mapping) => mapping.family === 'z-index')
const fontFamilyVariables = variablesForMappings((mapping) => mapping.family === 'font-family')
const fontSizeVariables = variablesForMappings((mapping) => mapping.family === 'typography')
const fontWeightVariables = variablesForMappings((mapping) => mapping.family === 'font-weight')
const lineHeightVariables = variablesForMappings((mapping) => mapping.family === 'line-height')
const durationVariables = variablesForMappings((mapping) => mapping.family === 'duration')
const easingVariables = variablesForMappings((mapping) => mapping.family === 'easing')
const motionVariables = [...durationVariables, ...easingVariables]
const nonShorthandColorProperties =
  '/^(?:caret-color|fill|outline-color|stroke|text-decoration-color)$/'
const borderShorthandProperties =
  '/^border(?:-(?:block|bottom|inline|left|right|top)(?:-(?:end|start))?)?$/'
const borderColorProperties =
  '/^border(?:-(?:block|inline)(?:-end|-start)?|-(?:bottom|left|right|top))?-color$/'
const spacingProperties =
  '/^(?:column-gap|gap|margin|margin-block|margin-block-end|margin-block-start|margin-bottom|margin-inline|margin-inline-end|margin-inline-start|margin-left|margin-right|margin-top|padding|padding-block|padding-block-end|padding-block-start|padding-bottom|padding-inline|padding-inline-end|padding-inline-start|padding-left|padding-right|padding-top|row-gap)$/'
const motionShorthandProperties = '/^(?:animation|transition)$/'
const motionDurationProperties =
  '/^(?:animation-delay|animation-duration|transition-delay|transition-duration)$/'
const motionEasingProperties = '/^(?:animation-timing-function|transition-timing-function)$/'
const cssColorWideValues = ['currentColor', 'currentcolor']
const colorRulesWithoutExactAuthority = [rawColorFunction]
const backgroundShorthandRules = [
  rawColorFunction,
  disallowUnapprovedUiVariables(backgroundColorVariables),
]
const borderShorthandRules = [rawColorFunction, disallowUnapprovedUiVariables(borderColorVariables)]
const motionShorthandRules = [
  rawTime,
  rawTimingFunction,
  disallowUnapprovedUiVariables(motionVariables),
]
const colorAuthorityRules = (variables) => [
  rawColorFunction,
  disallowOutsideAuthorities(variables, cssColorWideValues),
]
const transitionPropertyRules = [transitionPropertyAll]
const transitionRules = [/(?:^|[,\s])all(?=[,\s]|$)/iu]
const radiusProperties = '/^border(?:-[a-z]+){0,3}-radius$/'
const transitionAuthorityProperties = 'transition-property'
const transitionShorthandProperty = 'transition'
const typographyAuthorities = {
  'font-family': [disallowOutsideAuthorities(fontFamilyVariables)],
  'font-size': [disallowOutsideAuthorities(fontSizeVariables, ['0'])],
  'font-weight': [disallowOutsideAuthorities(fontWeightVariables)],
  'line-height': [disallowOutsideAuthorities(lineHeightVariables, ['0'])],
}
const motionAuthorityRules = {
  [motionShorthandProperties]: motionShorthandRules,
  [motionDurationProperties]: [disallowOutsideAuthorities(durationVariables)],
  [motionEasingProperties]: [disallowOutsideAuthorities(easingVariables)],
  [transitionShorthandProperty]: transitionRules,
  [transitionAuthorityProperties]: transitionPropertyRules,
}
const visualAuthorityRules = {
  background: backgroundShorthandRules,
  'background-color': colorAuthorityRules(backgroundColorVariables),
  [borderShorthandProperties]: borderShorthandRules,
  [borderColorProperties]: colorAuthorityRules(borderColorVariables),
  color: colorAuthorityRules(textColorVariables),
  [nonShorthandColorProperties]: colorRulesWithoutExactAuthority,
  [spacingProperties]: [disallowOutsideAuthorities(spacingVariables, ['0', 'auto'])],
  height: [disallowOutsideDimensionAuthorities(heightVariables)],
  'max-width': [disallowOutsideDimensionAuthorities(maxWidthVariables)],
  [radiusProperties]: [disallowOutsideAuthorities(radiusVariables, ['0'])],
  'box-shadow': [rawColorFunction, disallowOutsideAuthorities(shadowVariables, ['none'])],
  'text-shadow': [rawColorFunction, disallowOutsideAuthorities([], ['none'])],
  'z-index': [disallowOutsideAuthorities(zIndexVariables, ['auto'])],
  ...typographyAuthorities,
  ...motionAuthorityRules,
}

export default {
  rules: {
    'annotation-no-unknown': true,
    'at-rule-no-unknown': true,
    'block-no-empty': true,
    'color-named': 'never',
    'color-no-hex': true,
    'color-no-invalid-hex': true,
    'declaration-block-no-duplicate-properties': true,
    'declaration-no-important': true,
    'declaration-property-value-disallowed-list': visualAuthorityRules,
    'font-family-no-duplicate-names': true,
    'function-calc-no-unspaced-operator': true,
    'keyframe-declaration-no-important': true,
    'no-descending-specificity': true,
    'no-duplicate-at-import-rules': true,
    'no-duplicate-selectors': true,
    'no-empty-source': true,
    'property-no-unknown': true,
    'property-disallowed-list': ['backdrop-filter', 'filter'],
    'selector-pseudo-class-no-unknown': true,
    'selector-pseudo-element-no-unknown': true,
    'unit-no-unknown': true,
  },
}
