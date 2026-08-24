import { defineConfig } from 'unocss'
import { presetIcons } from '@unocss/preset-icons'
import { presetWind4 } from '@unocss/preset-wind4'
import { platformPreset } from '@platform/design-system'

import tokenManifest from './packages/design-system/src/generated/tokens.manifest.json' with { type: 'json' }

const presetColorClass =
  /^(?:bg|border|fill|from|outline|ring|stroke|text|to|via)-(?:amber|black|blue|cyan|emerald|fuchsia|gray|green|indigo|lime|neutral|orange|pink|purple|red|rose|sky|slate|stone|teal|transparent|violet|white|yellow|zinc)(?:-\d+)?(?:\/\d+)?$/
const rawSpacingClass =
  /^-?(?:m[trblxy]?|p[trblxy]?|gap(?:-[xy])?|space-[xy])-(?!(?:0|auto)$)(?:px|\d|\[)/
const ownedDimensionClass = /^(?:h|min-h|min-w|max-w|w)-(.+)$/
const structuralDimensionClassValue =
  /^(?:0|auto|dvh|dvw|fit|full|lvh|lvw|max|min|none|screen|svh|svw)$/
const rawTypographyClass =
  /^(?:text-(?:xs|sm|base|lg|xl|\d+xl|\[)|leading-(?:none|tight|snug|normal|relaxed|loose|\d|\[)|font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|mono|sans|serif|\[))/
const rawRadiusClass = /^(?:(?:b-|border-)?(?:rd|rounded))(?:$|-)/
const rawShadowClass = /^(?:drop-)?shadow(?:$|-)/
const rawZIndexClass = /^-?z-(?!auto$)/
const rawMotionClass = /^(?:animate|delay|duration|ease|transition)(?:$|-)/
const rawOpticalClass = /^(?:backdrop-)?(?:blur|brightness|saturate)(?:$|-)/
const arbitraryOwnedUtilityClass =
  /^(?:bg|fill|font|from|leading|rounded|shadow|stroke|text|to|via|z)-\[/
const arbitraryDeclarationClass = /^\[([A-Za-z-]+):(.+)\]$/
const arbitraryOwnedDimensionClass = /^(?:h|min-h|min-w|max-w|w)-\[(.+)\]$/
const structuralDimensionValue =
  /^(?:0|auto|fit-content|max-content|min-content|none|(?:calc|clamp|max|min|minmax)\(.+\)|[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:%|dvh|dvw|fr|lvh|lvw|svh|svw|vh|vw))$/
const generatedSemanticClasses = new Set(
  tokenManifest.unoCssMappings.flatMap((mapping) => mapping.classes ?? []),
)
const visualAuthorityMappings = tokenManifest.unoCssMappings.filter(
  (
    mapping,
  ): mapping is typeof mapping & {
    readonly allowedCssProperties: readonly string[]
    readonly classes: readonly string[]
  } => Array.isArray(mapping.allowedCssProperties) && Array.isArray(mapping.classes),
)
const allowedEmptyVisualUtilities = new Set([
  'animate-none',
  'delay-0',
  'duration-0',
  'rounded-none',
  'shadow-none',
  'transition-none',
])
const governedArbitraryProperties = new Set([
  'animation',
  'animation-delay',
  'animation-duration',
  'animation-timing-function',
  'border-radius',
  'box-shadow',
  'column-gap',
  'font-family',
  'font-size',
  'font-weight',
  'gap',
  'height',
  'line-height',
  'min-height',
  'min-width',
  'margin',
  'margin-block',
  'margin-block-end',
  'margin-block-start',
  'margin-bottom',
  'margin-inline',
  'margin-inline-end',
  'margin-inline-start',
  'margin-left',
  'margin-right',
  'margin-top',
  'max-width',
  'padding',
  'padding-block',
  'padding-block-end',
  'padding-block-start',
  'padding-bottom',
  'padding-inline',
  'padding-inline-end',
  'padding-inline-start',
  'padding-left',
  'padding-right',
  'padding-top',
  'row-gap',
  'text-shadow',
  'transition',
  'transition-delay',
  'transition-duration',
  'transition-timing-function',
  'width',
  'z-index',
])
const arbitraryColorProperties = new Set([
  'background',
  'background-color',
  'border-color',
  'caret-color',
  'color',
  'fill',
  'outline-color',
  'stroke',
  'text-decoration-color',
])

function semanticColorProperty(property: string): string | undefined {
  if (property === 'background') {
    return 'background-color'
  }

  if (property.startsWith('border-') && property.endsWith('-color')) {
    return 'border-color'
  }

  return arbitraryColorProperties.has(property) ? property : undefined
}

function authorityMappingsForProperty(property: string): typeof visualAuthorityMappings {
  const colorProperty = semanticColorProperty(property)

  return visualAuthorityMappings.filter((mapping) => {
    if (/^(?:column-gap|gap|margin|padding|row-gap)/u.test(property)) {
      return mapping.family === 'spacing'
    }

    if (property === 'border-radius') {
      return mapping.family === 'radius'
    }

    if (property === 'box-shadow') {
      return mapping.family === 'shadow'
    }

    if (
      /^(?:animation|animation-delay|animation-duration|transition|transition-delay|transition-duration)$/u.test(
        property,
      ) &&
      mapping.family === 'duration'
    ) {
      return true
    }

    if (
      /^(?:animation|animation-timing-function|transition|transition-timing-function)$/u.test(
        property,
      ) &&
      mapping.family === 'easing'
    ) {
      return true
    }

    if (colorProperty !== undefined) {
      return mapping.allowedCssProperties.includes(colorProperty)
    }

    return mapping.allowedCssProperties.includes(property)
  })
}

function isGeneratedSemanticVariable(property: string, value: string): boolean {
  const match = /^var\((--ui-[a-z0-9-]+)\)$/u.exec(value)
  return (
    match !== null &&
    authorityMappingsForProperty(property).some((mapping) => mapping.cssVariable === match[1])
  )
}

function blocksRawRadiusUtility(selector: string): boolean {
  return !generatedSemanticClasses.has(selector) && rawRadiusClass.test(selector)
}

function blocksRawMotionUtility(selector: string): boolean {
  return (
    !generatedSemanticClasses.has(selector) &&
    !allowedEmptyVisualUtilities.has(selector) &&
    rawMotionClass.test(selector)
  )
}

function blocksRawOwnedUtility(selector: string): boolean {
  if (generatedSemanticClasses.has(selector) || allowedEmptyVisualUtilities.has(selector)) {
    return false
  }

  const arbitraryDimension = arbitraryOwnedDimensionClass.exec(selector)

  if (arbitraryDimension !== null) {
    const value = arbitraryDimension[2]?.replaceAll('_', ' ').trim()
    return (
      value !== undefined &&
      !isGeneratedSemanticVariable(arbitraryDimension[1] ?? '', value) &&
      !structuralDimensionValue.test(value)
    )
  }

  const ownedDimension = ownedDimensionClass.exec(selector)

  if (ownedDimension !== null) {
    const value = ownedDimension[2]
    return value !== undefined && !structuralDimensionClassValue.test(value)
  }

  return (
    rawShadowClass.test(selector) ||
    rawZIndexClass.test(selector) ||
    rawTypographyClass.test(selector) ||
    rawOpticalClass.test(selector) ||
    arbitraryOwnedUtilityClass.test(selector)
  )
}

function blocksTransitionAllArbitraryDeclaration(selector: string): boolean {
  const match = arbitraryDeclarationClass.exec(selector)

  if (match === null) {
    return false
  }

  const property = match[1]?.toLowerCase()
  const value = match[2]?.replaceAll('_', ' ').trim().toLowerCase()

  if (property === undefined || value === undefined) {
    return false
  }

  if (property === 'transition-property') {
    return value.split(',').some((item) => item.trim() === 'all')
  }

  return property === 'transition' && /(?:^|[,\s])all(?=[,\s]|$)/u.test(value)
}

function blocksRawArbitraryDeclaration(selector: string): boolean {
  const match = arbitraryDeclarationClass.exec(selector)

  if (match === null) {
    return false
  }

  const property = match[1]?.toLowerCase()
  const value = match[2]?.replaceAll('_', ' ').trim().toLowerCase()

  if (property === undefined || value === undefined) {
    return false
  }

  if (
    property === 'transition-property' ||
    (property === 'transition' && /(?:^|[,\s])all(?=[,\s]|$)/u.test(value))
  ) {
    return false
  }

  if ((property === 'height' || property === 'max-width') && structuralDimensionValue.test(value)) {
    return false
  }

  if (arbitraryColorProperties.has(property)) {
    return (
      !/^(?:currentcolor|inherit|unset)$/u.test(value) &&
      !isGeneratedSemanticVariable(property, value)
    )
  }

  if (!governedArbitraryProperties.has(property)) {
    return false
  }

  return (
    !/^(?:0|auto|inherit|none|unset)$/u.test(value) && !isGeneratedSemanticVariable(property, value)
  )
}

export default defineConfig({
  blocklist: [
    [
      'transition-all',
      {
        message: 'Use an explicit transition property.',
      },
    ],
    [
      presetColorClass,
      {
        message:
          'Use a generated semantic color authority such as bg-surface-page, text-text-primary, or border-border-default.',
      },
    ],
    [
      rawSpacingClass,
      {
        message:
          'Use gap-content-gap, px-page-inline, or py-section-block instead of raw spacing values.',
      },
    ],
    [
      blocksRawRadiusUtility,
      {
        message: 'Use rounded-panel, backed by --ui-radius-panel.',
      },
    ],
    [
      blocksRawMotionUtility,
      {
        message: (selector) => {
          if (selector.startsWith('duration-')) {
            return 'Use duration-motion, backed by --ui-motion-duration.'
          }

          if (selector.startsWith('ease-')) {
            return 'Use ease-motion, backed by --ui-motion-easing.'
          }

          if (selector.startsWith('transition')) {
            return 'Use explicit transition properties with duration-motion and ease-motion.'
          }

          return 'This raw motion utility has no admitted semantic replacement.'
        },
      },
    ],
    [
      blocksRawOwnedUtility,
      {
        message:
          'Use h-control, max-w-content, shadow-panel, z-base/z-overlay, or the generated typography authority matching this property; optical filters remain prohibited.',
      },
    ],
    [
      blocksTransitionAllArbitraryDeclaration,
      {
        message:
          'Declare the exact transitioned properties; transition: all and transition-property: all are prohibited without requiring a replacement authority.',
      },
    ],
    [
      blocksRawArbitraryDeclaration,
      {
        message:
          'Use the exact generated PAVP variable for this property; transition-property: all remains prohibited independently of a replacement.',
      },
    ],
  ],
  presets: [
    presetWind4({
      preflights: {
        reset: true,
        theme: {
          mode: 'on-demand',
        },
      },
    }),
    presetIcons({
      collections: {
        lucide: () => import('@iconify-json/lucide/icons.json').then((module) => module.default),
      },
    }),
    platformPreset(),
  ],
})
