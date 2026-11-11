import tokenManifest from './packages/design-system/src/generated/tokens.manifest.json' with { type: 'json' }
import { structuralColorKeywords } from './scripts/architecture/style-ownership.ts'
import { privateStyleVariables } from './scripts/architecture/style-owner-contracts.ts'
import { mappingCssProperties } from './scripts/eslint-rules/style-authority.ts'

// color-mix() has current declaration-level owners. The owner-aware PAVP rule
// rejects every other occurrence; this generic regexp cannot exempt an exact
// declaration identity without granting a file-wide exception.
const rawColorFunction =
  /(?:color|color-contrast|contrast-color|device-cmyk|gray|hsl|hsla|hwb|lab|lch|light-dark|oklab|oklch|rgb|rgba)\s*\(/iu
const rawTime =
  /(?:^|[\s(,])(?!(?:[-+]?(?:0+(?:\.0*)?|\.0+)(?:e[-+]?\d+)?)(?:ms|s)(?=$|[\s),;/]))[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?(?:ms|s)(?=$|[\s),;/])/iu
const rawTimingFunction =
  /\b(?:ease|ease-in|ease-in-out|ease-out|linear|step-end|step-start)\b(?!-)|(?:cubic-bezier|steps)\s*\(/iu
const transitionPropertyAll = /(?:^|,)\s*all\s*(?=,|$)/iu
const cssWideValues = ['inherit', 'initial', 'revert', 'revert-layer', 'unset']

function escapeRegularExpression(value) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function asciiCaseInsensitivePattern(value) {
  return [...value]
    .map((character) =>
      /[a-z]/iu.test(character)
        ? `[${character.toLowerCase()}${character.toUpperCase()}]`
        : escapeRegularExpression(character),
    )
    .join('')
}

const cssVarFunction = asciiCaseInsensitivePattern('var')
const cssCalcFunction = asciiCaseInsensitivePattern('calc')
const cssMaxFunction = asciiCaseInsensitivePattern('max')
const cssEnvFunction = asciiCaseInsensitivePattern('env')
const cssTrivia = String.raw`(?:\s|\/\*[\s\S]*?\*\/)*`
const cssWidePatterns = cssWideValues.map(asciiCaseInsensitivePattern)
const structuralColorPatterns = structuralColorKeywords.map(asciiCaseInsensitivePattern)
const zeroNumberPattern = String.raw`[-+]?(?:0+(?:\.0*)?|\.0+)(?:[eE][-+]?\d+)?`
const cssLengthUnits = [
  'cap',
  'ch',
  'cm',
  'cqb',
  'cqh',
  'cqi',
  'cqmax',
  'cqmin',
  'cqw',
  'em',
  'ex',
  'ic',
  'in',
  'lh',
  'mm',
  'pc',
  'pt',
  'px',
  'q',
  'rcap',
  'rch',
  'rem',
  'rex',
  'ric',
  'rlh',
  ...['', 's', 'l', 'd'].flatMap((prefix) =>
    ['vw', 'vh', 'vi', 'vb', 'vmin', 'vmax'].map((unit) => `${prefix}${unit}`),
  ),
]
const cssLengthUnitPattern = cssLengthUnits.map(asciiCaseInsensitivePattern).join('|')
const zeroLengthPattern = `${zeroNumberPattern}(?:%|${cssLengthUnitPattern})?`
const zeroTimePattern = `${zeroNumberPattern}(?:[mM][sS]|[sS])`

function cssVariablePattern(namePattern) {
  return `${cssVarFunction}\\(${cssTrivia}${namePattern}${cssTrivia}\\)`
}

function variablesForMappings(predicate) {
  return [
    ...new Set(
      tokenManifest.unoCssMappings
        .filter((mapping) => mapping.generatorKind !== 'container-variant')
        .filter((mapping) => predicate(mapping))
        .map((mapping) => mapping.cssVariable),
    ),
  ]
}

function mappingAllowsProperty(mapping, property) {
  return mappingCssProperties(mapping).includes(property)
}

function disallowOutsideAuthorities(variables, allowedValues = [], allowedPatterns = []) {
  const authorities = [
    ...variables.map((variable) => cssVariablePattern(escapeRegularExpression(variable))),
    ...allowedValues.map((value) =>
      /[a-z]/iu.test(value) ? asciiCaseInsensitivePattern(value) : escapeRegularExpression(value),
    ),
    ...allowedPatterns,
    ...cssWidePatterns,
  ]

  return new RegExp(`^(?!(?:${authorities.join('|')})$).+`, 'u')
}

function disallowUnapprovedUiVariables(variables) {
  const authorities = variables.map(escapeRegularExpression).join('|')
  return new RegExp(
    `${cssVarFunction}\\(${cssTrivia}(?!(?:${authorities})${cssTrivia}\\))--ui-[a-z0-9-]+${cssTrivia}\\)`,
    'u',
  )
}

const backgroundColorVariables = variablesForMappings((mapping) =>
  mappingAllowsProperty(mapping, 'background-color'),
)
const borderColorVariables = variablesForMappings((mapping) =>
  mappingAllowsProperty(mapping, 'border-color'),
)
const textColorVariables = variablesForMappings((mapping) =>
  mappingAllowsProperty(mapping, 'color'),
)
const spacingVariables = variablesForMappings((mapping) => mapping.family === 'spacing')
const radiusVariables = [
  ...variablesForMappings((mapping) => mapping.family === 'radius'),
  ...tokenManifest.tokens
    .filter(
      (token) =>
        token.name === 'interaction.radius.small' &&
        token.visibility === 'ui-internal' &&
        token.type === 'dimension',
    )
    .map((token) => token.cssVariable),
]
const shadowVariables = variablesForMappings((mapping) => mapping.family === 'shadow')
const zIndexVariables = variablesForMappings((mapping) => mapping.family === 'z-index')
const fontFamilyVariables = variablesForMappings((mapping) => mapping.family === 'font-family')
const fontSizeVariables = variablesForMappings((mapping) => mapping.family === 'typography')
const fontWeightVariables = variablesForMappings((mapping) => mapping.family === 'font-weight')
const lineHeightVariables = variablesForMappings((mapping) => mapping.family === 'line-height')
const durationVariables = variablesForMappings((mapping) => mapping.family === 'duration')
const easingVariables = variablesForMappings((mapping) => mapping.family === 'easing')
const motionVariables = [...durationVariables, ...easingVariables]
const adminColorVariables = tokenManifest.tokens
  .filter(
    (token) =>
      token.visibility === 'ui-internal' &&
      token.type === 'color' &&
      token.name.startsWith('admin.'),
  )
  .map((token) => token.cssVariable)
const adminShadowVariables = tokenManifest.tokens
  .filter(
    (token) =>
      token.visibility === 'ui-internal' &&
      token.type === 'shadow' &&
      token.name.startsWith('admin.'),
  )
  .map((token) => token.cssVariable)
const shellMaterialRoleNames = new Set([
  'material.chrome.background',
  'material.overlay.background',
])
const shellMaterialColorVariables = [
  ...new Set(
    tokenManifest.tokens
      .filter(
        (token) =>
          token.visibility === 'ui-internal' &&
          token.type === 'color' &&
          shellMaterialRoleNames.has(token.role?.name),
      )
      .map((token) => token.cssVariable),
  ),
]
const approvedSpacingPatterns = [
  zeroLengthPattern,
  cssVariablePattern('--pavp-safe-area-(?:block|inline|bottom|left|right|top)[a-z-]*'),
  `${cssEnvFunction}\\(${cssTrivia}(?:safe-area-(?:max-)?inset-(?:top|right|bottom|left)|keyboard-inset-(?:top|right|bottom|left|width|height)|titlebar-area-(?:x|y|width|height)|viewport-segment-(?:width|height|top|right|bottom|left)\\s+\\d+\\s+\\d+)${cssTrivia}(?:,${cssTrivia}${zeroLengthPattern}${cssTrivia})?\\)`,
  `${cssMaxFunction}\\(${cssTrivia}${cssVariablePattern('--ui-space-[a-z-]+')}${cssTrivia},${cssTrivia}${cssVariablePattern('--pavp-safe-area-[a-z-]+')}${cssTrivia}\\)(?:\\s+${cssMaxFunction}\\(${cssTrivia}${cssVariablePattern('--ui-space-[a-z-]+')}${cssTrivia},${cssTrivia}${cssVariablePattern('--pavp-safe-area-[a-z-]+')}${cssTrivia}\\))?`,
  `${cssVariablePattern('--ui-space-[a-z-]+')}\\s+${cssMaxFunction}\\(${cssTrivia}${cssVariablePattern('--ui-space-[a-z-]+')}${cssTrivia},${cssTrivia}${cssVariablePattern('--pavp-safe-area-[a-z-]+')}${cssTrivia}\\)`,
]
const approvedDurationPatterns = [
  `${cssCalcFunction}\\(${cssTrivia}${cssVariablePattern('--ui-motion-duration')}${cssTrivia}/${cssTrivia}2${cssTrivia}\\)`,
  zeroTimePattern,
]
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
const colorRulesWithoutExactAuthority = [rawColorFunction]
const backgroundShorthandRules = [
  rawColorFunction,
  disallowUnapprovedUiVariables([...backgroundColorVariables, ...adminColorVariables]),
]
const shellBackgroundShorthandRules = [
  rawColorFunction,
  disallowUnapprovedUiVariables([
    ...backgroundColorVariables,
    ...adminColorVariables,
    ...shellMaterialColorVariables,
  ]),
]
const borderShorthandRules = [rawColorFunction, disallowUnapprovedUiVariables(borderColorVariables)]
const motionShorthandRules = [
  rawTime,
  rawTimingFunction,
  disallowUnapprovedUiVariables(motionVariables),
]
const colorAuthorityRules = (variables) => [
  rawColorFunction,
  disallowOutsideAuthorities(variables, [], structuralColorPatterns),
]
const transitionPropertyRules = [transitionPropertyAll]
const transitionRules = [/(?:^|[,\s])all(?=[,\s]|$)/iu]
const radiusProperties = '/^border(?:-[a-z]+){0,3}-radius$/'
const transitionAuthorityProperties = 'transition-property'
const transitionShorthandProperty = 'transition'
const typographyAuthorities = {
  'font-family': [disallowOutsideAuthorities(fontFamilyVariables)],
  'font-size': [disallowOutsideAuthorities(fontSizeVariables, ['0'], [zeroLengthPattern])],
  'font-weight': [disallowOutsideAuthorities(fontWeightVariables)],
  'line-height': [disallowOutsideAuthorities(lineHeightVariables, ['0'], [zeroLengthPattern])],
}
const motionAuthorityRules = {
  [motionShorthandProperties]: motionShorthandRules,
  [motionDurationProperties]: [
    disallowOutsideAuthorities(durationVariables, [], approvedDurationPatterns),
  ],
  [motionEasingProperties]: [disallowOutsideAuthorities(easingVariables)],
  [transitionShorthandProperty]: transitionRules,
  [transitionAuthorityProperties]: transitionPropertyRules,
}
const visualAuthorityRules = {
  background: backgroundShorthandRules,
  'background-color': colorAuthorityRules([...backgroundColorVariables, ...adminColorVariables]),
  [borderShorthandProperties]: borderShorthandRules,
  [borderColorProperties]: colorAuthorityRules(borderColorVariables),
  color: colorAuthorityRules(textColorVariables),
  [nonShorthandColorProperties]: colorRulesWithoutExactAuthority,
  [spacingProperties]: [
    disallowOutsideAuthorities(spacingVariables, ['0', 'auto', 'normal'], approvedSpacingPatterns),
  ],
  [radiusProperties]: [
    disallowOutsideAuthorities(
      radiusVariables,
      ['0'],
      [
        zeroLengthPattern,
        // Exact declaration ownership confines this connected Tab shape to its existing owner.
        `${cssVariablePattern('--ui-radius-control')}\\s+${cssVariablePattern('--ui-radius-control')}\\s+${zeroLengthPattern}\\s+${zeroLengthPattern}`,
      ],
    ),
  ],
  'box-shadow': [
    rawColorFunction,
    disallowOutsideAuthorities([...shadowVariables, ...adminShadowVariables], ['none']),
  ],
  'text-shadow': [rawColorFunction, disallowOutsideAuthorities([], ['none'])],
  'z-index': [disallowOutsideAuthorities(zIndexVariables, ['auto'], [zeroNumberPattern])],
  ...typographyAuthorities,
  ...motionAuthorityRules,
}
const shellVisualAuthorityRules = {
  ...visualAuthorityRules,
  color: colorAuthorityRules([
    ...textColorVariables,
    '--pavp-collapsed-foreground',
    '--pavp-collapsed-active-foreground',
    '--pavp-collapsed-hover-foreground',
  ]),
  'z-index': [
    disallowOutsideAuthorities(
      zIndexVariables,
      ['auto'],
      [zeroNumberPattern, String.raw`calc\(\s*var\(--ui-z-base\)\s*-\s*1\s*\)`],
    ),
  ],
  [spacingProperties]: [
    disallowOutsideAuthorities(
      spacingVariables,
      ['0', 'auto', 'normal'],
      [
        ...approvedSpacingPatterns,
        `${cssCalcFunction}\\(${cssTrivia}${cssVariablePattern('--ui-space-content-gap')}${cssTrivia}/${cssTrivia}2${cssTrivia}\\)`,
      ],
    ),
  ],
  background: shellBackgroundShorthandRules,
  'background-color': colorAuthorityRules([
    ...backgroundColorVariables,
    ...adminColorVariables,
    ...shellMaterialColorVariables,
  ]),
}
const providerVisualAuthorityRules = {
  ...visualAuthorityRules,
  color: colorAuthorityRules(textColorVariables),
  'background-color': colorAuthorityRules([...backgroundColorVariables, ...adminColorVariables]),
}

const routeTransitionFullDurationPattern = `${cssCalcFunction}\\(${cssTrivia}${cssVariablePattern('--ui-motion-duration')}${cssTrivia}\\+${cssTrivia}${cssVariablePattern('--ui-motion-duration')}${cssTrivia}/${cssTrivia}2${cssTrivia}\\)`
const routeTransitionVisualAuthorityRules = {
  ...Object.fromEntries(
    Object.entries(visualAuthorityRules).filter(
      ([property]) => property !== motionDurationProperties,
    ),
  ),
  '/^(?:animation-delay|transition-delay|transition-duration)$/':
    motionAuthorityRules[motionDurationProperties],
  'animation-duration': [
    disallowOutsideAuthorities(
      durationVariables,
      [],
      [...approvedDurationPatterns, routeTransitionFullDurationPattern],
    ),
  ],
  animation: [new RegExp(routeTransitionFullDurationPattern, 'u')],
}

// Named live specimens, component adapters and settings layout owners. The owner-aware rule still
// requires exact selector/property/input contracts; this is no file-wide grant.
const specimenVariable = '--pavp-specimen-value'
const settingsActionClearancePattern = String.raw`calc\(\s*var\(--ui-layout-target-enhanced-minimum-block-size\)\s*\+\s*max\(\s*var\(--ui-space-page-inline\)\s*,\s*env\(safe-area-inset-bottom\)\s*\)\s*\+\s*var\(--ui-space-section-block\)\s*\)`
const chartRangeDurationPattern = String.raw`calc\(\s*var\(--ui-motion-duration\)\s*\*\s*2\s*\)`
const chartTimeRangeVisualAuthorityRules = {
  ...Object.fromEntries(
    Object.entries(visualAuthorityRules).filter(
      ([property]) => property !== motionDurationProperties,
    ),
  ),
  '/^(?:animation-delay|animation-duration|transition-delay)$/':
    motionAuthorityRules[motionDurationProperties],
  // The style-owner contract admits this derivation only for the chart navigator.
  'transition-duration': [
    disallowOutsideAuthorities(
      durationVariables,
      [],
      [...approvedDurationPatterns, chartRangeDurationPattern],
    ),
  ],
}
const workbenchVisualAuthorityRules = {
  ...visualAuthorityRules,
  color: colorAuthorityRules([
    ...textColorVariables,
    specimenVariable,
    '--pavp-settings-theme-on-color',
  ]),
  [borderColorProperties]: colorAuthorityRules([...borderColorVariables, '--ui-color-focus-ring']),
  [borderShorthandProperties]: [
    rawColorFunction,
    disallowUnapprovedUiVariables([...borderColorVariables, '--ui-border-width']),
  ],
  [radiusProperties]: [
    disallowOutsideAuthorities([...radiusVariables, specimenVariable], ['0'], ['50%']),
  ],
  'font-family': [disallowOutsideAuthorities([...fontFamilyVariables, specimenVariable])],
  'font-size': [
    disallowOutsideAuthorities(
      [...fontSizeVariables, specimenVariable, '--ui-workbench-display-font-size'],
      ['0'],
      [zeroLengthPattern],
    ),
  ],
  'font-weight': [disallowOutsideAuthorities([...fontWeightVariables, specimenVariable])],
  'line-height': [
    disallowOutsideAuthorities(
      [...lineHeightVariables, specimenVariable],
      ['0'],
      [zeroLengthPattern],
    ),
  ],
  'box-shadow': [
    rawColorFunction,
    disallowOutsideAuthorities(
      [...shadowVariables, ...adminShadowVariables, specimenVariable],
      ['none'],
      [
        String.raw`inset\s+0\s+calc\(-1\s*\*\s*var\(--ui-border-width\)\)\s+0\s+var\(--ui-color-focus-ring\)`,
      ],
    ),
  ],
  'z-index': [
    disallowOutsideAuthorities(
      [...zIndexVariables, specimenVariable],
      ['auto'],
      [zeroNumberPattern],
    ),
  ],
  [spacingProperties]: [
    disallowOutsideAuthorities(
      spacingVariables,
      ['0', 'auto', 'normal'],
      [
        ...approvedSpacingPatterns,
        settingsActionClearancePattern,
        String.raw`calc\(\s*-1\s*\*\s*var\(--ui-space-content-gap\)\s*\)`,
        String.raw`calc\(\s*var\(--ui-workbench-settings-navigator-inline-size\)\s*\+\s*var\(--ui-space-page-inline\)\s*\)`,
      ],
    ),
  ],
}

export default {
  plugins: ['./scripts/eslint-rules/css-authoring.mjs'],
  overrides: [
    {
      files: ['**/packages/ui/src/components/UiTable.vue.style-*.css'],
      rules: {
        'declaration-property-value-disallowed-list': {
          ...visualAuthorityRules,
          // Naive DataTable's native rails sit above fixed columns at local level 3.
          'z-index': [
            disallowOutsideAuthorities(
              zIndexVariables,
              ['auto'],
              [zeroNumberPattern, String.raw`calc\(\s*var\(--ui-z-base\)\s*\+\s*3\s*\)`],
            ),
          ],
          'background-color': [
            rawColorFunction,
            disallowOutsideAuthorities(
              [
                ...backgroundColorVariables,
                ...adminColorVariables,
                '--n-merged-th-color',
                '--n-merged-td-color-hover',
              ],
              [],
              [
                ...structuralColorPatterns,
                String.raw`color-mix\(\s*in srgb,\s*var\(--n-merged-td-color-striped\) 80%,\s*var\(--n-merged-td-color-hover\)\s*\)`,
              ],
            ),
          ],
          color: colorAuthorityRules([...textColorVariables, '--n-th-text-color']),
        },
      },
    },
    {
      files: ['**/packages/ui/src/providers/UiProvider.vue.style-*.css'],
      rules: {
        'declaration-property-value-disallowed-list': providerVisualAuthorityRules,
      },
    },
    {
      files: ['**/packages/ui/src/components/UiRadioCardGroup.vue.style-*.css'],
      rules: {
        'declaration-property-value-disallowed-list': {
          ...visualAuthorityRules,
          color: colorAuthorityRules([
            ...textColorVariables,
            '--pavp-radio-card-selected-hover-foreground',
          ]),
        },
      },
    },
    {
      files: ['apps/web/src/app/router/route-transition/route-transition.css'],
      rules: {
        'declaration-property-value-disallowed-list': routeTransitionVisualAuthorityRules,
      },
    },
    {
      files: ['**/apps/web/src/app/workbench/MotionRoutePreview.vue.style-*.css'],
      rules: {
        'declaration-property-value-disallowed-list': routeTransitionVisualAuthorityRules,
      },
    },
    {
      files: ['**/packages/ui/src/components/UiChartTimeRange.vue.style-*.css'],
      rules: { 'declaration-property-value-disallowed-list': chartTimeRangeVisualAuthorityRules },
    },
    {
      files: ['apps/web/src/app/workbench/workbench.css'],
      rules: {
        'declaration-property-value-disallowed-list': workbenchVisualAuthorityRules,
      },
    },
    {
      files: ['**/packages/ui/src/components/UiAdminShell.vue.style-*.css'],
      rules: {
        'declaration-property-value-disallowed-list': shellVisualAuthorityRules,
      },
    },
  ],
  rules: {
    'pavp/style-authority': true,
    'annotation-no-unknown': true,
    'at-rule-no-unknown': true,
    'block-no-empty': true,
    'color-named': 'never',
    'color-no-hex': true,
    'color-no-invalid-hex': true,
    'declaration-block-no-duplicate-properties': true,
    // Exact !important and optical declarations are enforced by pavp/style-authority.
    'declaration-property-value-disallowed-list': visualAuthorityRules,
    'font-family-no-duplicate-names': true,
    'function-calc-no-unspaced-operator': true,
    'keyframe-block-no-duplicate-selectors': true,
    'keyframe-declaration-no-important': true,
    'no-descending-specificity': true,
    'no-duplicate-at-import-rules': true,
    'no-duplicate-selectors': true,
    'no-empty-source': true,
    'property-no-unknown': true,
    'property-disallowed-list': ['filter'],
    // Vue scoped syntax remains subject to exact declaration/context ownership.
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'deep'] }],
    'selector-pseudo-element-no-unknown': true,
    'unit-no-unknown': true,
  },
}
