import { defineConfig } from 'unocss'
import { presetIcons } from '@unocss/preset-icons'
import { presetWind4 } from '@unocss/preset-wind4'
import { colors } from '@unocss/preset-wind4/colors'
import { theme as windTheme } from '@unocss/preset-wind4/theme'
import { parseColor, valueHandlers } from '@unocss/preset-wind4/utils'
import { platformPreset } from '@platform/design-system'

import { platformUnoMappings } from './packages/design-system/src/generated/unocss-theme'
import {
  cssWideValue,
  isStructuralDimensionValue,
  mappingClasses,
  mappingCssProperties,
  physicalDimensionProperty,
  structuralColor,
} from './scripts/eslint-rules/style-authority'

const generatedSemanticClasses = new Set<string>(platformUnoMappings.flatMap(mappingClasses))

// Wind4 66.7.5 rules own the grammar. Ambiguous bare/undelimited aliases need source-aware lint.
const spacingUtility =
  /^-?(?:(?:scroll-)?[mp](?:a|-?(?:[bi][se]|[rltbsexy])|-(?:block|inline))?|(?:flex-|grid-)?gap(?:-(?:col|row|x|y))?|space-[xy]|border-spacing(?:-[xy])?|(?:position-|pos-)?(?:inset(?:-(?:block|inline|[bi][se]|[rltbsexy]))?|top|right|bottom|left|start|end)|indent)-(.+)$/u
const dimensionUtility =
  /^(?:(?:size-)?(?:min-|max-)?(?:[wh]|inline|block)|(?:flex-)?basis)-(.+)$|^size-(?:min-|max-)?(.+)$/u
const colorUtility =
  /^(?:(?:filter-)?drop-shadow(?:-color)?|(?:inset-|text-)?shadow(?:-color)?|text-stroke|text(?:-color)?|bg|c|color|fill|stroke|accent|caret|divide|(?:\$ )?placeholder|(?:border|b)(?:-(?:block|inline|[xyrlbtse]|[bi][se]))?(?:-color)?|outline(?:-color)?|(?:inset-)?ring(?:-offset)?|from|via|to|stops|underline|decoration|rule(?:-(?:x|y|col|row))?(?:-color)?|mask-(?:linear|radial|conic|[xytrbl])-(?:from|to))-(.+)$/u
const typographyUtility =
  /^(?:(?:text|font)-size|font-stretch|(?:font-)?(?:leading|lh|line-height|tracking|word-spacing)|fw)-(.+)$/u
const opticalUtility =
  /^(?:(?:(?:backdrop-)|filter-)?(?:blur|brightness|contrast|drop-shadow|grayscale|hue-rotate|invert|saturate|sepia)-.+|(?:backdrop-filter|filter)-(?:\[.+\]|\$.+|--.+|none)|backdrop-op(?:acity)?-.+)$/u
const radiusUtility =
  /^(?:b-|border-)?(?:rd|rounded)-(?:[rltbse]|[rltb]{2}|[bise][se]|[bi][se]-[bi][se])?(.+)$/u
const shadowUtility = /^(?:inset-|text-)?shadow-(.+)$/u
const zUtility = /^(?:position-|pos-)?z-(.+)$/u
const motionUtility =
  /^(?:(?:animate-)?keyframes|animate|(?:transition-)?(?:delay|duration|ease)|transition)-(.+)$/u
const borderWidthUtility =
  /^(?:(?:border|b)(?:-(?:block|inline|[xyrlbtse]|[bi][se]))?(?:-(?:width|size))?|outline(?:-(?:width|size|offset))?|ring-offset(?:-(?:width|size))?|(?:inset-)?ring|text-stroke|stroke(?:-width)?|(?:underline|decoration)(?:-(?:offset|size|thickness))?|divide-[xy]|rule(?:-(?:x|y|col|row))?(?:-width)?)-(.+)$/u
const transformUtility =
  /^(?:transform-(?!none$).+|translate(?:-[xyz])?-.+|scale(?:-[xyz])?-.+|rotate(?:-[xyz])?-.+|skew(?:-[xy])?-.+|origin-.+|(?:perspective|perspect)(?:-origin)?-.+)$/u
const emptyVisualUtility =
  /^(?:animate-none|(?:transition-)?(?:duration|delay)-0|(?:b-|border-)?(?:rd|rounded)(?:-[a-z-]+)?-(?:none|0)|(?:inset-|text-)?shadow-none|transition-(?:none|normal|discrete)|(?:perspective|perspect)-none)$/u
const colorOpacityUtility =
  /^(?:(?:filter-)?drop-shadow(?:-color)?|(?:inset-|text-)?shadow(?:-color)?|text-stroke|text(?:-color)?|bg|c|color|fill|stroke|accent|caret|divide|placeholder|(?:border|b)(?:-(?:block|inline|[xyrlbtse]|[bi][se]))?(?:-color)?|outline(?:-color)?|(?:inset-)?ring(?:-offset)?|from|via|to|stops|underline|decoration|rule(?:-(?:x|y|col|row))?(?:-color)?)-(?:op|opacity)-(.+)$/u

function unbracket(value: string): string {
  return valueHandlers.bracket(value) ?? value
}

function structuralOpacityUtilityValue(value: string): boolean {
  const bracketed = valueHandlers.bracket(value)
  return (
    /^(?:0|100)$/u.test(value) ||
    cssWideValue.test(value) ||
    (bracketed !== undefined && /^(?:0|1|0%|100%)$/u.test(bracketed))
  )
}

function rawUtilityValue(value: string): string | undefined {
  if (/^(?:\$|--)/u.test(value)) return undefined
  return valueHandlers.bracket(value)
}

function structuralSize(value: string, selector: string): boolean {
  if (/^(?:0|auto|none|full|fit|max|min|stretch|screen|[sld]?v[whib]|vmin|vmax)$/u.test(value))
    return true
  const dimension = /^(?:size-)?(min-|max-)?(w|h|inline|block)-/u.exec(selector)
  const property = dimension?.[2]
  const propertyName = property === 'w' || property === 'inline' ? 'width' : 'height'
  return dimension === null
    ? isStructuralDimensionValue(unbracket(value))
    : structuralDimensionComposition(`${dimension[1] ?? ''}${propertyName}`, unbracket(value))
}

function isWindSize(value: string): boolean {
  return (
    Object.hasOwn(windTheme.container, value) ||
    Object.hasOwn(windTheme.spacing, value) ||
    /^(?:fit|max|min|stretch|screen(?:-.+)?)$/u.test(value) ||
    [
      valueHandlers.bracket,
      valueHandlers.cssvar,
      valueHandlers.global,
      valueHandlers.auto,
      valueHandlers.none,
      valueHandlers.fraction,
      valueHandlers.rem,
    ].some((resolve) => resolve(value) !== undefined)
  )
}

function blocksColor(value: string): boolean {
  // The official resolver understands palette keys, compact scales, alpha and color modifiers.
  const color = parseColor(value, { colors })
  if (color?.color !== undefined)
    return !structuralColor.test(color.color) || color.alpha !== undefined
  return /^(?:\$|--|\[)/u.test(value) && !structuralColor.test(unbracket(value))
}

function structuralDimensionComposition(property: string, value: string): boolean {
  if (value.startsWith('var(')) return false
  return isStructuralDimensionValue(value, (variable) =>
    platformUnoMappings.some(
      (mapping) =>
        mapping.cssVariable === variable &&
        mappingCssProperties(mapping).some(
          (allowed) => physicalDimensionProperty(allowed) === physicalDimensionProperty(property),
        ),
    ),
  )
}

function blocksArbitraryDeclaration(selector: string): boolean {
  // Property/value utilities bypass semantic class ownership even when the
  // embedded value looks structural. Authors must use a named utility or add
  // the missing canonical mapping instead of opening an arbitrary declaration.
  return /^\[(?:--[\w-]+|[a-z-]+):.+\]$/iu.test(selector)
}

function blocksUnapprovedUtility(selector: string): boolean {
  if (generatedSemanticClasses.has(selector) || emptyVisualUtility.test(selector)) return false
  if (/(?:\$[A-Za-z_][\w-]*|(?:^|[-[(,:])--[A-Za-z_][\w-]*)/u.test(selector)) return true
  if (blocksArbitraryDeclaration(selector)) return true
  if (/^will-change(?:-.+)?$/u.test(selector)) return true
  if (selector === 'scroll-smooth' || /^view-transition-.+/u.test(selector)) return true
  if (/^(?:color-)?scheme-.+/u.test(selector)) return true
  const tabSize = /^tab-(.+)$/u.exec(selector)?.[1]
  if (tabSize !== undefined) return !/^\[?(?:[-+]?0(?:\.0+)?)\]?$/u.test(tabSize)
  const zoom = /^zoom-(.+)$/u.exec(selector)?.[1]
  if (zoom !== undefined) {
    const value = rawUtilityValue(zoom) ?? zoom
    return !/^(?:1|100%?|normal)$/u.test(value)
  }
  const intrinsicSize = /^intrinsic(?:-(?:block|inline|w|h))?(?:-size)?-(.+)$/u.exec(selector)?.[1]
  if (intrinsicSize !== undefined) {
    const value = rawUtilityValue(intrinsicSize) ?? intrinsicSize
    return !/^(?:0|none)$/u.test(value)
  }
  const verticalAlign = /^(?:align|v|vertical)-(.+)$/u.exec(selector)?.[1]
  if (verticalAlign !== undefined) {
    const value = rawUtilityValue(verticalAlign) ?? verticalAlign
    if (/^(?:baseline|bottom|middle|sub|super|text-bottom|text-top|top)$/u.test(value)) return false
    if (/^(?:\[|[-+]?\d)/u.test(verticalAlign)) return true
  }
  const strokeGeometry = /^stroke-(?:dash|offset)-(.+)$/u.exec(selector)?.[1]
  if (strokeGeometry !== undefined) {
    const value = rawUtilityValue(strokeGeometry) ?? strokeGeometry
    return !/^(?:0|none)$/u.test(value)
  }
  if (/^bg-(?:conic|linear|radial)-\[.+\]$/u.test(selector)) return true
  if (/^mask-(?:\[|\$|--)/u.test(selector)) return true
  const maskEndpoint = /^mask-(?:conic|linear|radial|x|y)-(?:from|to)-(.+)$/u.exec(selector)?.[1]
  if (maskEndpoint !== undefined) {
    const value = rawUtilityValue(maskEndpoint) ?? maskEndpoint
    return !/^(?:0|100)%?$/u.test(value)
  }
  if (/^mask-(?:conic|linear|radial|x|y)(?:-.+)?$/u.test(selector)) return true
  const gradientStop = /^(?:from|to|via)-(.+)$/u.exec(selector)?.[1]
  if (gradientStop !== undefined) {
    const position = valueHandlers.bracket(gradientStop) ?? gradientStop
    if (/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?%?$/iu.test(position))
      return !/^(?:0|100)%?$/u.test(position)
  }
  const gradientAngle = /^bg-linear-(.+)$/u.exec(selector)?.[1]
  if (gradientAngle !== undefined) {
    const angle = valueHandlers.bracket(gradientAngle) ?? gradientAngle
    if (/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?(?:deg|grad|rad|turn)?$/iu.test(angle))
      return true
  }
  const gridTrack = /^(?:auto|grid)-(?:cols|rows)-(.+)$/u.exec(selector)?.[1]
  if (gridTrack !== undefined && /^(?:\[|\$|--)/u.test(gridTrack)) {
    const track = rawUtilityValue(gridTrack)
    return !/^(?:0|1fr|auto|max-content|min-content|minmax\(0,\s*1fr\)|none|subgrid)$/u.test(
      track ?? '',
    )
  }
  const visualGeometry = /^(?:bg|mask)-(pos|position|size)-(.+)$/u.exec(selector)
  if (visualGeometry !== null && /^(?:\[|\$|--)/u.test(visualGeometry[2] ?? '')) {
    const value = rawUtilityValue(visualGeometry[2] ?? '')
    return visualGeometry[1] === 'size'
      ? !/^(?:0|auto|contain|cover)$/u.test(value ?? '')
      : !/^(?:0|bottom|center|left|right|top)(?:\s+(?:bottom|center|left|right|top))?$/u.test(
          value ?? '',
        )
  }
  const opacity =
    /^(?:op|opacity)-(.+)$/u.exec(selector)?.[1] ?? colorOpacityUtility.exec(selector)?.[1]
  if (opacity !== undefined) return !structuralOpacityUtilityValue(opacity)
  if (/^divide-[xy]$/u.test(selector)) return true
  const blend = /^(?:bg|mix)-blend-(.+)$/u.exec(selector)?.[1]
  if (blend !== undefined) return blend !== 'normal' && !cssWideValue.test(blend)
  const aspect = /^aspect-(.+)$/u.exec(selector)?.[1]
  if (aspect !== undefined) {
    const bracketed = valueHandlers.bracket(aspect)
    return !(
      aspect === 'auto' ||
      cssWideValue.test(aspect) ||
      (bracketed !== undefined && /^(?:0|auto)$/u.test(bracketed))
    )
  }
  if (/^object-(?:\[|\$|--)/u.test(selector)) return true
  const columns = /^columns-(.+)$/u.exec(selector)?.[1]
  if (columns !== undefined) {
    const bracketed = valueHandlers.bracket(columns)
    return !(
      /^(?:1|auto)$/u.test(columns) ||
      cssWideValue.test(columns) ||
      (bracketed !== undefined && /^(?:1|auto)$/u.test(bracketed))
    )
  }
  const spacing = spacingUtility.exec(selector)
  if (spacing !== null) {
    const value = unbracket(spacing[1] ?? '')
    if (
      Object.hasOwn(windTheme.spacing, value) ||
      [
        valueHandlers.bracket,
        valueHandlers.cssvar,
        valueHandlers.global,
        valueHandlers.auto,
        valueHandlers.fraction,
        valueHandlers.rem,
      ].some((resolve) => resolve(spacing[1] ?? '') !== undefined)
    )
      return !/^(?:0|auto|none)$/u.test(value) && !cssWideValue.test(value)
  }
  const dimension = dimensionUtility.exec(selector)
  if (dimension !== null) {
    const value = dimension[1] ?? dimension[2] ?? ''
    // Size patterns overlap structural display utilities such as inline-grid.
    if (isWindSize(value)) return !structuralSize(value, selector)
  }
  const color = colorUtility.exec(selector)?.[1]
  if (color !== undefined && blocksColor(color)) return true
  if (color !== undefined && structuralColor.test(unbracket(color))) return false
  const borderWidth = borderWidthUtility.exec(selector)?.[1]
  if (
    borderWidth !== undefined &&
    [valueHandlers.bracket, valueHandlers.cssvar, valueHandlers.global, valueHandlers.px].some(
      (resolve) => resolve(borderWidth) !== undefined,
    )
  )
    return !/^(?:0|none)$/u.test(unbracket(borderWidth)) && !cssWideValue.test(borderWidth)
  const flex = /^flex-(.+)$/u.exec(selector)?.[1]
  if (
    flex !== undefined &&
    [
      valueHandlers.bracket,
      valueHandlers.cssvar,
      valueHandlers.fraction,
      valueHandlers.rem,
      valueHandlers.number,
    ].some((resolve) => resolve(flex) !== undefined)
  )
    return !/^(?:0|1|auto|initial|none)$/u.test(unbracket(flex))
  const z = zUtility.exec(selector)?.[1]
  if (z !== undefined && /^(?:[\d.-]|\[|\$|--|auto$|inherit$)/u.test(z)) {
    return z !== 'auto' && z !== '0' && !cssWideValue.test(z)
  }
  return (
    typographyUtility.test(selector) ||
    (/^text-(.+)$/u.test(selector) && /^(?:[\d.]+|\[|\$|--)/u.test(selector.slice(5))) ||
    Object.keys(windTheme.text).some(
      (name) => selector === `text-${name}` || selector.startsWith(`text-${name}/`),
    ) ||
    (/^font-(.+)$/u.test(selector) &&
      (/^(?:[\d.]+|\[|\$|--)/u.test(selector.slice(5)) ||
        Object.hasOwn(windTheme.font, selector.slice(5)) ||
        Object.hasOwn(windTheme.fontWeight, selector.slice(5)))) ||
    radiusUtility.test(selector) ||
    shadowUtility.test(selector) ||
    opticalUtility.test(selector) ||
    transformUtility.test(selector) ||
    motionUtility.test(selector) ||
    /^(?:transition-)?property-all$/u.test(selector)
  )
}

export default defineConfig({
  blocklist: [
    // Proven pipeline false positives: Vue tag arguments and admitted selector CSS property text.
    ...['h1', 'h2', 'h3', 'h4', 'backdrop-filter', 'transition'],
    [
      blocksUnapprovedUtility,
      {
        message:
          'Use a registered PAVP semantic utility. A missing reusable capability requires a canonical token/UnoCSS mapping extension, not local CSS or a raw value.',
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
