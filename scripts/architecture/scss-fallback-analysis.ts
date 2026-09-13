import { createRequire } from 'node:module'
const requireFromScss = createRequire(import.meta.url)
import type { ScssFallbackOwner, StyleDeclarationIdentity } from './style-owner-contracts'
import type {
  ValueNode,
  parseStyleValue as ParseStyleValueContract,
  normalizeStyleValue as NormalizeStyleValueContract,
  normalizeStyleProperty as NormalizeStylePropertyContract,
  numericLexemeEquals as NumericLexemeEqualsContract,
  structuralColor as StructuralColorContract,
  hasRawDesignBearingValue as HasRawDesignBearingValueContract,
  hasObfuscatedCssValueIdentifier as HasObfuscatedCssValueIdentifierContract,
  isPreferredTextScaleIdentity as IsPreferredTextScaleIdentityContract,
} from '../eslint-rules/style-authority'
const {
  parseStyleValue,
  normalizeStyleValue,
  normalizeStyleProperty,
  numericLexemeEquals,
  structuralColor,
  hasRawDesignBearingValue,
  hasObfuscatedCssValueIdentifier,
  isPreferredTextScaleIdentity,
} = requireFromScss('../eslint-rules/style-authority.ts') as {
  readonly parseStyleValue: typeof ParseStyleValueContract
  readonly normalizeStyleValue: typeof NormalizeStyleValueContract
  readonly normalizeStyleProperty: typeof NormalizeStylePropertyContract
  readonly numericLexemeEquals: typeof NumericLexemeEqualsContract
  readonly structuralColor: typeof StructuralColorContract
  readonly hasRawDesignBearingValue: typeof HasRawDesignBearingValueContract
  readonly hasObfuscatedCssValueIdentifier: typeof HasObfuscatedCssValueIdentifierContract
  readonly isPreferredTextScaleIdentity: typeof IsPreferredTextScaleIdentityContract
}

export interface ScssStyleInputs {
  readonly has: (name: string) => boolean
  readonly kind: (name: string) => 'color' | 'dimension' | undefined
}
const tokenManifest = requireFromScss(
  '../../packages/design-system/src/generated/tokens.manifest.json',
) as {
  readonly tokens: readonly { readonly cssVariable: string; readonly type: string }[]
}
const canonicalStyleVariables = new Set(tokenManifest.tokens.map((token) => token.cssVariable))
const canonicalStyleVariableKinds = new Map(
  tokenManifest.tokens.map((token) => [token.cssVariable, token.type] as const),
)

export function createScssFallbackAnalysis(inputs: ScssStyleInputs) {
  const parsedValues = new Map<string, ReturnType<typeof parseStyleValue>>()
  const parseValue = (value: string) => {
    let parsed = parsedValues.get(value)
    if (parsed === undefined) {
      parsed = parseStyleValue(value)
      parsedValues.set(value, parsed)
    }
    return parsed
  }
  function hasRawAspectRatioQuery(params: string): boolean {
    const inspectable = params.replaceAll(/\/\*[\s\S]*?\*\//gu, ' ')
    const number = String.raw`[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?`
    const ratio = String.raw`${number}(?:\s*\/\s*${number})?`
    return (
      new RegExp(
        String.raw`\b(?:min-|max-)?aspect-ratio\b\s*(?::|=|[<>]=?)\s*${ratio}(?![\w.-])`,
        'iu',
      ).test(inspectable) ||
      new RegExp(
        String.raw`(?:^|[^\w.-])${ratio}\s*(?:=|[<>]=?)\s*\b(?:min-|max-)?aspect-ratio\b`,
        'iu',
      ).test(inspectable)
    )
  }

  function scssFallbackAtRuleViolations(name: string, params: string): readonly string[] {
    const normalizedName = name.toLowerCase()
    const inspectableParams = params.replaceAll(/\/\*[\s\S]*?\*\//gu, ' ')
    const violations: string[] = []
    if (normalizedName === 'supports') {
      const hasObfuscatedFeature = (nodes: readonly ValueNode[]): boolean =>
        nodes.some((node) => {
          if (node.type === 'string' || node.type === 'comment') return false
          if (
            node.type === 'function' &&
            /^(?:selector|url)$/u.test(node.value.toLowerCase()) &&
            !node.value.includes('\\')
          )
            return false
          return (
            ((node.type === 'function' || node.type === 'word') && node.value.includes('\\')) ||
            hasObfuscatedFeature(node.nodes ?? [])
          )
        })
      if (hasObfuscatedFeature(parseValue(params).nodes)) {
        violations.push(
          'SCSS fallback supports features may not obscure declaration properties or values with CSS escapes.',
        )
      }
    }
    if (
      /^(?:container|media)$/u.test(normalizedName) &&
      (hasRawDesignBearingValue(params) || hasRawAspectRatioQuery(inspectableParams))
    ) {
      violations.push(
        'SCSS fallback queries may not introduce raw design boundaries; use the canonical UnoCSS variant contract.',
      )
    }
    if (normalizedName === 'media' && /\bprefers-color-scheme\b/iu.test(inspectableParams)) {
      violations.push(
        'SCSS fallback may not create a parallel color-scheme theme branch; use the canonical appearance authority.',
      )
    }
    if (
      /^(?:custom-media|font-face|font-feature-values|font-palette-values|property)$/u.test(
        normalizedName,
      ) ||
      (normalizedName === 'layer' &&
        !/^(?:app|base|components|reset|vendor-overrides)$/u.test(normalizeStyleValue(params)))
    ) {
      violations.push(
        'SCSS fallback may not create custom properties, custom media, cascade-layer identities/order, or font authorities.',
      )
    }
    if (normalizedName === 'container') {
      const stringify = (nodes: readonly ValueNode[]): string =>
        nodes
          .map((node) =>
            node.type === 'function' ? `${node.value}(${stringify(node.nodes ?? [])})` : node.value,
          )
          .join('')
      parseValue(inspectableParams).walk((node) => {
        if (node.type !== 'function' || node.value.toLowerCase() !== 'style') return
        const allVariables: string[] = []
        const collectVariables = (nodes: readonly ValueNode[]) => {
          for (const child of nodes) {
            if (child.type === 'word' && child.value.startsWith('--'))
              allVariables.push(child.value)
            collectVariables(child.nodes ?? [])
          }
        }
        collectVariables(node.nodes ?? [])
        for (const variable of allVariables) {
          if (!canonicalStyleVariables.has(variable) && !inputs.has(variable))
            violations.push(
              'SCSS style queries require a canonical variable or registered private runtime input.',
            )
        }
        const parts = significantSourceValueNodes(node.nodes ?? [])
        const colon = parts.findIndex((part) => part.type === 'div' && part.value === ':')
        const property = colon > 0 && parts[0]?.type === 'word' ? parts[0].value : undefined
        if (property === undefined || colon === -1) return false
        const valueNodes = parts.slice(colon + 1)
        const value = normalizeStyleValue(stringify(valueNodes))
        const valueKind = canonicalStyleVariableKinds.get(property) ?? inputs.kind(property)
        const variableFunction =
          valueNodes.length === 1 &&
          valueNodes[0]?.type === 'function' &&
          valueNodes[0].value.toLowerCase() === 'var'
            ? significantSourceValueNodes(valueNodes[0].nodes ?? [])
            : []
        const inputVariable =
          variableFunction.length === 1 && variableFunction[0]?.type === 'word'
            ? variableFunction[0].value
            : undefined
        const inputKind =
          inputVariable === undefined
            ? undefined
            : (canonicalStyleVariableKinds.get(inputVariable) ?? inputs.kind(inputVariable))
        if (valueKind === 'color' && !structuralColor.test(value) && inputKind !== 'color') {
          violations.push(
            'SCSS style queries must consume canonical color values instead of raw named colors.',
          )
        } else if (
          valueKind !== undefined &&
          valueKind !== 'color' &&
          inputKind !== valueKind &&
          !/^(?:inherit|initial|revert|revert-layer|unset)$/iu.test(value) &&
          !/^[-+]?(?:0+(?:\.0*)?|\.0+)(?:e[-+]?\d+)?(?:%|[A-Za-z]+)?$/iu.test(value)
        ) {
          violations.push(
            'SCSS style queries require structural zero or a compatible canonical input for non-color design values.',
          )
        }
        return false
      })
    }
    return violations
  }

  const cssSourceValueFunctions = new Set([
    '',
    'abs',
    'acos',
    'anchor',
    'anchor-size',
    'asin',
    'atan',
    'atan2',
    'attr',
    'blur',
    'brightness',
    'calc',
    'calc-size',
    'circle',
    'clamp',
    'color',
    'color-contrast',
    'color-mix',
    'conic-gradient',
    'contrast',
    'contrast-color',
    'cos',
    'counter',
    'counters',
    'cross-fade',
    'cubic-bezier',
    'device-cmyk',
    'drop-shadow',
    'element',
    'ellipse',
    'env',
    'exp',
    'fit-content',
    'font-format',
    'font-tech',
    'grayscale',
    'has',
    'hsl',
    'hsla',
    'hue-rotate',
    'hwb',
    'hypot',
    'image',
    'image-set',
    'inset',
    'invert',
    'is',
    'lab',
    'lch',
    'light-dark',
    'linear',
    'linear-gradient',
    'log',
    'matrix',
    'matrix3d',
    'max',
    'min',
    'minmax',
    'mod',
    'not',
    'nth-child',
    'nth-last-child',
    'oklab',
    'oklch',
    'opacity',
    'paint',
    'path',
    'perspective',
    'polygon',
    'pow',
    'radial-gradient',
    'ray',
    'rem',
    'repeat',
    'repeating-conic-gradient',
    'repeating-linear-gradient',
    'repeating-radial-gradient',
    'rgb',
    'rgba',
    'rotate',
    'rotate3d',
    'rotatex',
    'rotatey',
    'rotatez',
    'round',
    'saturate',
    'scale',
    'scale3d',
    'scalex',
    'scaley',
    'scalez',
    'scroll',
    'selector',
    'sepia',
    'sign',
    'sin',
    'skew',
    'skewx',
    'skewy',
    'sqrt',
    'steps',
    'style',
    'symbols',
    'tan',
    'translate',
    'translate3d',
    'translatex',
    'translatey',
    'translatez',
    'url',
    'var',
    'view',
    'where',
  ])

  const staticallyEvaluatedSassMathFunctions = new Set([
    'abs',
    'acos',
    'asin',
    'atan',
    'atan2',
    'cos',
    'exp',
    'hypot',
    'log',
    'mod',
    'pow',
    'rem',
    'round',
    'sign',
    'sin',
    'sqrt',
    'tan',
  ])

  function significantSourceValueNodes(nodes: readonly ValueNode[]): readonly ValueNode[] {
    return nodes.filter((node) => node.type !== 'space' && node.type !== 'comment')
  }

  function sourceFunctionHasRuntimeInput(node: ValueNode): boolean {
    if (
      node.type === 'function' &&
      /^(?:attr|env|var)$/u.test(node.value.toLowerCase()) &&
      !node.value.includes('\\')
    )
      return true
    return (node.nodes ?? []).some((child) => sourceFunctionHasRuntimeInput(child))
  }

  function hasStaticNumericArithmetic(value: string, property?: string): boolean {
    const numericSource = String.raw`[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?(?:%|[A-Za-z]+)?`
    if (
      new RegExp(
        String.raw`(?:^|[\s(,])${numericSource}\s+%\s*${numericSource}(?=$|[\s),])`,
        'iu',
      ).test(value)
    )
      return true
    const numericAtom =
      /^(?:[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?(?:%|[A-Za-z]+)?|e|infinity|-infinity|nan|pi)$/iu
    const gridSlashList = /^(?:grid|grid-area|grid-column|grid-row|grid-template)$/u.test(
      property ?? '',
    )
    const compactSource = value.replaceAll(/\/\*[\s\S]*?\*\//gu, '')
    const fullNumeric = new RegExp(String.raw`^${numericSource}$`, 'iu')
    const compactNumericArithmetic = new RegExp(
      String.raw`^${numericSource}(?:\+|-|\*|%|/)${numericSource}$`,
      'iu',
    )
    const groupedWord = (node: ValueNode | undefined): string | undefined => {
      if (node?.type === 'word') return node.value
      if (node?.type !== 'function' || !/^(?:|calc)$/iu.test(node.value)) return undefined
      const children = significantSourceValueNodes(node.nodes ?? [])
      return children.length === 1 ? groupedWord(children[0]) : undefined
    }
    const inspect = (nodes: readonly ValueNode[], depth = 0, parentFunction?: string): boolean => {
      const significant = significantSourceValueNodes(nodes)
      const cssMathFunction = /^(?:calc|clamp|max|min)$/u.test(parentFunction ?? '')
      for (let index = 0; index < significant.length; index += 1) {
        const node = significant[index]
        if (node?.type !== 'word') continue
        const word = node.value
        const standaloneMathOperator = /^(?:\+|-|\*|%|\/)$/u.test(word)
        if (standaloneMathOperator && !cssMathFunction) return true
        if (standaloneMathOperator) continue
        if (fullNumeric.test(word)) {
          if (index > 0 && word.startsWith('+')) return true
          continue
        }
        if (
          compactNumericArithmetic.test(word) ||
          /[+*%/]/u.test(word) ||
          new RegExp(String.raw`^${numericSource}-$`, 'iu').test(word) ||
          (/[-+]$/u.test(word) && index + 1 < significant.length)
        )
          return true
      }
      for (let index = 0; index + 2 < significant.length; index += 1) {
        const left = significant[index]
        const operator = significant[index + 1]
        const right = significant[index + 2]
        const arithmeticOperator =
          (operator?.type === 'word' && /^(?:%|\+|-|\*|\/)$/u.test(operator.value)) ||
          (operator?.type === 'div' && operator.value === '/')
        const leftWord = groupedWord(left)
        const rightWord = groupedWord(right)
        const staticNumericOperands =
          leftWord !== undefined &&
          rightWord !== undefined &&
          numericAtom.test(leftWord) &&
          numericAtom.test(rightWord)
        const sassIdentifierConcatenation =
          operator?.type === 'word' &&
          /^(?:\+|-)$/u.test(operator.value) &&
          (leftWord !== undefined ||
            (left?.type === 'function' && !sourceFunctionHasRuntimeInput(left))) &&
          (rightWord !== undefined ||
            (right?.type === 'function' && !sourceFunctionHasRuntimeInput(right)))
        if (arithmeticOperator && (staticNumericOperands || sassIdentifierConcatenation)) {
          if (operator.value === '/' && gridSlashList && depth === 0) continue
          return true
        }
      }
      return significant.some(
        (node) =>
          node.nodes !== undefined &&
          !/^(?:has|is|not|nth-child|nth-last-child|selector|url|where)$/u.test(
            node.value.toLowerCase(),
          ) &&
          inspect(node.nodes, depth + 1, node.value.toLowerCase()),
      )
    }
    return inspect(parseValue(compactSource).nodes)
  }

  function hasUnsupportedSassValueFunction(value: string, property?: string): boolean {
    const visit = (nodes: readonly ValueNode[]): boolean => {
      for (const node of nodes) {
        if (node.type !== 'function') continue
        const name = node.value.toLowerCase()
        if (name.includes('\\') || !cssSourceValueFunctions.has(name)) return true
        if (
          property !== undefined &&
          /^(?:font-format|font-tech|has|is|not|nth-child|nth-last-child|selector|style|where)$/u.test(
            name,
          )
        )
          return true
        if (/^(?:brightness|contrast|grayscale|invert|opacity|saturate|sepia)$/u.test(name)) {
          const input = significantSourceValueNodes(node.nodes ?? [])
          const scalar = input.length === 1 ? input[0] : undefined
          const scalarWord =
            scalar?.type === 'word' &&
            /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?%?$/iu.test(scalar.value)
          const scalarRuntimeFunction =
            scalar?.type === 'function' && /^(?:calc|clamp|env|max|min|var)$/iu.test(scalar.value)
          if (!scalarWord && !scalarRuntimeFunction) return true
        }
        if (
          !sourceFunctionHasRuntimeInput(node) &&
          (staticallyEvaluatedSassMathFunctions.has(name) || /^(?:clamp|max|min)$/u.test(name))
        )
          return true
        if (visit(node.nodes ?? [])) return true
      }
      return false
    }
    return visit(parseValue(value).nodes)
  }

  function hasSassBooleanOrComparison(value: string): boolean {
    return (
      /(?:^|[\s(,])(?:and|or)(?=$|[\s),])|(?:^|[\s(,])not(?=\s+\S)/iu.test(value) ||
      /(?:==|!=|<=|>=|<|>)/u.test(value)
    )
  }

  function hasSassAtRuleBoolean(value: string): boolean {
    return (
      /(?:==|!=)/u.test(value) ||
      /(?:^|[\s(,])(?:true|false)\s+(?:and|or)\s+(?:true|false)(?=$|[\s),])/iu.test(value) ||
      /(?:^|[\s(,])not\s+(?:true|false)(?=$|[\s),])/iu.test(value)
    )
  }

  function sourceAtRules(
    source: string,
    lang: ScssFallbackOwner['lang'],
  ): readonly { readonly name: string; readonly params: string }[] {
    const atRules: { name: string; params: string }[] = []
    for (let index = 0; index < source.length; index += 1) {
      if (source[index] !== '@') continue
      let cursor = index + 1
      const nameStart = cursor
      while (cursor < source.length && !/[\s{;()]/u.test(source[cursor] ?? '')) {
        if (source[cursor] === '\\') cursor += 1
        cursor += 1
      }
      const name = source.slice(nameStart, cursor)
      if (name === '') continue
      while (cursor < source.length && /[ \t]/u.test(source[cursor] ?? '')) cursor += 1
      const paramsStart = cursor
      let depth = 0
      while (cursor < source.length) {
        const character = source[cursor] ?? ''
        if (character === '\\') {
          cursor += 2
          continue
        }
        if (character === '(' || character === '[') depth += 1
        if (character === ')' || character === ']') depth = Math.max(0, depth - 1)
        const endsScss = lang === 'scss' && depth === 0 && (character === '{' || character === ';')
        const endsSass =
          lang === 'sass' && depth === 0 && (character === '\n' || character === '\r')
        if (endsScss || endsSass) break
        cursor += 1
      }
      atRules.push({ name, params: source.slice(paramsStart, cursor).trim() })
      index = Math.max(index, cursor - 1)
    }
    return atRules
  }

  function inspectScssSourceAuthority(source: string, owner: ScssFallbackOwner): readonly string[] {
    const masked = source.split('')
    let state: 'source' | 'single-quote' | 'double-quote' | 'line-comment' | 'block-comment' =
      'source'
    let escaped = false
    let hasScssInterpolation = false
    let urlDepth = 0

    for (let index = 0; index < masked.length; index += 1) {
      const character = masked[index] ?? ''
      const next = masked[index + 1] ?? ''
      if (state === 'source') {
        if (urlDepth > 0) {
          if (character === '\\') {
            index += 1
          } else if (character === "'") {
            masked[index] = ' '
            state = 'single-quote'
          } else if (character === '"') {
            masked[index] = ' '
            state = 'double-quote'
          } else if (character === '#' && next === '{') {
            hasScssInterpolation = true
          } else if (character === '(') {
            urlDepth += 1
          } else if (character === ')') {
            urlDepth -= 1
          }
        } else if (
          source.slice(index, index + 4).toLowerCase() === 'url(' &&
          !/[\w-]/u.test(source[index - 1] ?? '')
        ) {
          urlDepth = 1
          index += 3
        } else if (character === '/' && next === '*') {
          masked[index] = ' '
          masked[index + 1] = ' '
          state = 'block-comment'
          index += 1
        } else if (character === '/' && next === '/') {
          masked[index] = ' '
          masked[index + 1] = ' '
          state = 'line-comment'
          index += 1
        } else if (character === "'") {
          masked[index] = ' '
          state = 'single-quote'
        } else if (character === '"') {
          masked[index] = ' '
          state = 'double-quote'
        } else if (character === '#' && next === '{') {
          let backslashes = 0
          for (let cursor = index - 1; cursor >= 0 && source[cursor] === '\\'; cursor -= 1)
            backslashes += 1
          if (backslashes % 2 === 0) hasScssInterpolation = true
        }
        continue
      }
      if (character !== '\n' && character !== '\r') masked[index] = ' '
      if (state === 'line-comment') {
        if (character === '\n' || character === '\r') state = 'source'
        continue
      }
      if (state === 'block-comment') {
        if (character === '*' && next === '/') {
          masked[index + 1] = ' '
          state = 'source'
          index += 1
        }
        continue
      }
      if (escaped) {
        escaped = false
        continue
      }
      if (character === '\\') {
        escaped = true
        continue
      }
      if (character === '#' && next === '{') hasScssInterpolation = true
      if (
        (state === 'single-quote' && character === "'") ||
        (state === 'double-quote' && character === '"')
      )
        state = 'source'
    }

    const mechanicsInspectable = masked.join('')
    const inspectable = mechanicsInspectable.replaceAll(
      /url\((?:\\[\s\S]|[^\\)])*\)/giu,
      (input) => `url(${' '.repeat(Math.max(0, input.length - 5))})`,
    )
    const violations = new Set<string>()
    if (owner.atRules.some((atRule) => atRule.name.toLowerCase().endsWith('keyframes'))) {
      violations.add('SCSS keyframes require an exact named keyframe family owner.')
    }
    for (const atRule of owner.atRules)
      for (const violation of scssFallbackAtRuleViolations(atRule.name, atRule.params))
        violations.add(violation)
    const sassDirective =
      /^(?:at-root|content|debug|each|else|error|extend|for|forward|function|if|import|include|mixin|return|use|warn|while)$/u
    for (const atRule of sourceAtRules(inspectable, owner.lang)) {
      if (atRule.name.includes('\\')) {
        violations.add('SCSS fallback may not obscure at-rule identifiers with CSS escapes.')
        continue
      }
      if (sassDirective.test(atRule.name.toLowerCase())) {
        violations.add(
          'SCSS fallback may not hide values behind imports, mixins, functions, control flow, placeholders, or extensions.',
        )
      }
      for (const violation of scssFallbackAtRuleViolations(atRule.name, atRule.params))
        violations.add(violation)
      if (
        hasStaticNumericArithmetic(atRule.params) ||
        hasUnsupportedSassValueFunction(atRule.params) ||
        hasSassAtRuleBoolean(atRule.params)
      ) {
        violations.add(
          'SCSS fallback may not hide values behind Sass-only functions or arithmetic.',
        )
      }
    }
    let hasUnescapedDollar = false
    for (let index = 0; index < mechanicsInspectable.length; index += 1) {
      if (mechanicsInspectable[index] !== '$') continue
      let backslashes = 0
      for (
        let cursor = index - 1;
        cursor >= 0 && mechanicsInspectable[cursor] === '\\';
        cursor -= 1
      )
        backslashes += 1
      if (backslashes % 2 === 0) {
        hasUnescapedDollar = true
        break
      }
    }
    if (hasUnescapedDollar) {
      violations.add(
        'SCSS fallback may not declare or consume Sass variables as a parallel value authority.',
      )
    }
    if (hasScssInterpolation) {
      violations.add('SCSS interpolation is not statically admitted by the exact source contract.')
    }
    const sassIdentifier = String.raw`(?:\\(?:[\da-f]{1,6}[ \t]?|[^\r\n\f])|[\p{L}_-])(?:\\(?:[\da-f]{1,6}[ \t]?|[^\r\n\f])|[\p{L}\p{N}_-])*`
    const sassMixinUsage = new RegExp(
      String.raw`(?:^|[\n;{}])\s*[=+]${sassIdentifier}(?:\s*\(|\s*(?=$|\n))`,
      'mu',
    )
    if (
      /@(?:at-root|content|debug|each|else|error|extend|for|forward|function|if|import|include|mixin|return|use|warn|while)\b/iu.test(
        mechanicsInspectable,
      ) ||
      /(?:^|[,{])[ \t]*%(?:\\(?:[\da-f]{1,6}[ \t]?|[^\r\n\f])|[\p{L}\p{N}_-])+/imu.test(
        mechanicsInspectable,
      ) ||
      (owner.lang === 'sass' && sassMixinUsage.test(mechanicsInspectable)) ||
      /\bif\s*\(/iu.test(mechanicsInspectable)
    ) {
      violations.add(
        'SCSS fallback may not hide values behind imports, mixins, functions, control flow, placeholders, or extensions.',
      )
    }
    // Declarations must be inspected before Sass can fold a raw branch into an
    // allowed compiled value. Indented Sass needs a line grammar separate from
    // the brace-delimited SCSS grammar.
    const propertyIdentifier = String.raw`(?:--|-)?(?:[A-Za-z_]|\\(?:[\da-f]{1,6}[ \t]?|[^\r\n\f]))(?:[\w-]|\\(?:[\da-f]{1,6}[ \t]?|[^\r\n\f]))*`
    const declarationPattern =
      owner.lang === 'sass'
        ? new RegExp(
            String.raw`(?:^|\n)[ \t]+(${propertyIdentifier})[ \t]*:[ \t]*([^\r\n]*)`,
            'gmu',
          )
        : new RegExp(String.raw`(?:^|[;{}])\s*(${propertyIdentifier})\s*:\s*([^;{}]+)`, 'gu')
    const declarations = [...inspectable.matchAll(declarationPattern)].map((match) => {
      const value = match[2] ?? ''
      const valueOffset = match[0].lastIndexOf(value)
      const sourceOffset = match.index + Math.max(0, valueOffset)
      return {
        property: match[1] ?? '',
        value,
        sourceValue: source.slice(sourceOffset, sourceOffset + value.length),
      }
    })
    const numericUnit =
      /(?:^|[^\w.-])([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)(cap|ch|cm|cqb|cqh|cqi|cqmax|cqmin|cqw|deg|dpcm|dpi|dppx|em|ex|fr|grad|ic|in|lh|mm|pc|pt|px|q|rad|rcap|rch|rem|rex|ric|rlh|[sld]?v(?:w|h|i|b|min|max)|turn)(?![\w-])/giu
    const numericScalar = /^([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)(%)?$/iu
    const sourceStructuralPercentageProperty =
      /^(?:animation-range(?:-(?:start|end))?|(?:(?:min|max)-)?(?:width|height|inline-size|block-size)|flex-basis|inset(?:-(?:block|inline)(?:-(?:start|end))?)?|top|right|bottom|left|grid-template-(?:columns|rows)|scroll-padding(?:-(?:top|right|bottom|left|block|inline|block-(?:start|end)|inline-(?:start|end)))?|view-timeline-inset)$/u
    const sourceNegativePercentageProperty =
      /^(?:inset(?:-(?:block|inline)(?:-(?:start|end))?)?|top|right|bottom|left|view-timeline-inset)$/u
    for (const declaration of declarations) {
      if (declaration.property.includes('\\')) {
        violations.add('SCSS fallback may not obscure property identifiers with CSS escapes.')
      }
      const normalizedProperty = declaration.property.toLowerCase()
      const authorityProperty = normalizedProperty.replace(/^-(?:moz|ms|o|webkit)-/u, '')
      if (
        hasStaticNumericArithmetic(declaration.sourceValue, normalizedProperty) ||
        hasUnsupportedSassValueFunction(declaration.value, normalizedProperty) ||
        hasSassBooleanOrComparison(declaration.value)
      ) {
        violations.add(
          'SCSS fallback may not hide values behind Sass-only functions or arithmetic.',
        )
      }
      const containsSassNull = (nodes: readonly ValueNode[]): boolean =>
        nodes.some(
          (node) =>
            (node.type === 'word' && node.value.toLowerCase() === 'null') ||
            (node.type === 'function' &&
              node.value.toLowerCase() !== 'url' &&
              containsSassNull(node.nodes ?? [])),
        )
      const hasSassNull = containsSassNull(parseValue(declaration.sourceValue).nodes)
      if (hasSassNull)
        violations.add('SCSS fallback may not erase owned declarations with the Sass null value.')
      const sourceValue = normalizeStyleValue(declaration.sourceValue)
      if (/^timeline-trigger(?:-[a-z-]+)?$/u.test(authorityProperty)) {
        parseValue(declaration.sourceValue).walk((node) => {
          if (node.type !== 'word') return
          const percentage = numericScalar.exec(node.value)
          if (
            percentage?.[2] === '%' &&
            !numericLexemeEquals(percentage[1] ?? '', 0) &&
            !numericLexemeEquals(percentage[1] ?? '', 100)
          )
            violations.add(
              'SCSS timeline trigger ranges require exact structural endpoints or registered motion inputs.',
            )
        })
      }
      const scalar = numericScalar.exec(sourceValue)
      if (
        scalar?.[2] === '%' &&
        sourceStructuralPercentageProperty.test(authorityProperty) &&
        !sourceNegativePercentageProperty.test(authorityProperty) &&
        (scalar[1] ?? '').startsWith('-') &&
        !numericLexemeEquals(scalar[1] ?? '', 0)
      )
        violations.add(
          'SCSS fallback structural percentages must preserve a valid non-negative source sign.',
        )
      const exactEndpoint = (allowed: readonly (0 | 1 | 100)[]) =>
        scalar !== null &&
        allowed.some((expected) =>
          scalar[2] === '%'
            ? (expected === 0 || expected === 100) && numericLexemeEquals(scalar[1] ?? '', expected)
            : (expected === 0 || expected === 1) && numericLexemeEquals(scalar[1] ?? '', expected),
        )
      if (
        scalar !== null &&
        (/^(?:(?:fill|flood|stop|stroke)-opacity|opacity|shape-image-threshold)$/u.test(
          authorityProperty,
        )
          ? !exactEndpoint([0, 1, 100])
          : authorityProperty === 'zoom'
            ? !exactEndpoint([1, 100])
            : authorityProperty === 'animation-iteration-count'
              ? !exactEndpoint([0, 1])
              : authorityProperty === 'aspect-ratio'
                ? !exactEndpoint([0])
                : /^(?:columns|column-count|stroke-miterlimit)$/u.test(authorityProperty)
                  ? !exactEndpoint([1])
                  : false)
      )
        violations.add(
          'SCSS fallback numeric endpoints and identity values must remain exact in source.',
        )
      if (
        scalar !== null &&
        /^(?:(?:(?:min|max)-)?(?:width|height|inline-size|block-size)|flex-basis|inset(?:-(?:block|inline)(?:-(?:start|end))?)?|top|right|bottom|left|(?:scroll-)?(?:margin|padding)(?:-(?:top|right|bottom|left|block|inline|block-(?:start|end)|inline-(?:start|end)))?|(?:row|column)-gap|grid-(?:row|column)-gap|gap|shape-margin|border(?:-[a-z]+){0,3}-radius|border(?:-[a-z-]+)?-width|outline-(?:offset|width)|font-size|line-height|line-height-step|letter-spacing|word-spacing|z-index|column-width|perspective|rotate|tab-size|text-indent|text-underline-offset|vertical-align|view-timeline-inset|baseline-shift|(?:cx|cy|r|rx|ry|x|y))$/u.test(
          authorityProperty,
        ) &&
        !(
          scalar[2] === '%' &&
          /^(?:(?:(?:min|max)-)?(?:width|height|inline-size|block-size)|flex-basis|inset(?:-(?:block|inline)(?:-(?:start|end))?)?|top|right|bottom|left|view-timeline-inset)$/u.test(
            authorityProperty,
          )
        ) &&
        !numericLexemeEquals(scalar[1] ?? '', 0)
      )
        violations.add('SCSS fallback structural zero values must remain exact in source.')
      if (
        authorityProperty === 'scale' &&
        sourceValue
          .split(/\s+/u)
          .filter(Boolean)
          .some((part) => {
            const component = numericScalar.exec(part)
            return (
              component !== null &&
              !(
                (component[2] === '%' && numericLexemeEquals(component[1] ?? '', 100)) ||
                (component[2] === undefined && numericLexemeEquals(component[1] ?? '', 1))
              )
            )
          })
      )
        violations.add('SCSS fallback scale identity values must remain exact in source.')
      const hasInvalidFunctionIdentity = (nodes: readonly ValueNode[]): boolean =>
        nodes.some((node) => {
          if (node.type !== 'function') return false
          const functionName = node.value.toLowerCase()
          const inputs = significantSourceValueNodes(node.nodes ?? [])
            .filter((input) => input.type === 'word')
            .map((input) => input.value)
          const invalidIdentity = (input: string) => {
            const number = numericScalar.exec(input)
            if (number === null) return false
            return number[2] === '%'
              ? !numericLexemeEquals(number[1] ?? '', 100)
              : !numericLexemeEquals(number[1] ?? '', 1)
          }
          const invalidZero = (input: string) => {
            const number = numericScalar.exec(input)
            return number !== null && !numericLexemeEquals(number[1] ?? '', 0)
          }
          return (
            (authorityProperty === 'transform' &&
              /^scale(?:3d|[xyz])?$/u.test(functionName) &&
              inputs.some(invalidIdentity)) ||
            (/^(?:backdrop-filter|filter)$/u.test(authorityProperty) &&
              (/^(?:brightness|contrast|opacity|saturate)$/u.test(functionName)
                ? inputs.some(invalidIdentity)
                : /^(?:grayscale|invert|sepia)$/u.test(functionName)
                  ? inputs.some(invalidZero)
                  : false)) ||
            hasInvalidFunctionIdentity(node.nodes ?? [])
          )
        })
      if (hasInvalidFunctionIdentity(parseValue(declaration.sourceValue).nodes))
        violations.add('SCSS fallback function identity values must remain exact in source.')
      if (
        authorityProperty === 'text-size-adjust' &&
        /preferred-text-scale/iu.test(sourceValue) &&
        !isPreferredTextScaleIdentity(declaration.sourceValue)
      )
        violations.add(
          'SCSS preferred text scaling requires the exact 100% platform identity calculation.',
        )
      if (hasObfuscatedCssValueIdentifier(declaration.value)) {
        violations.add(
          'SCSS fallback may not obscure value identifiers with CSS escapes; use the canonical literal authority.',
        )
      }
      if (
        /(?:^|[^\w-])#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})(?![\da-f])/iu.test(
          declaration.value,
        ) ||
        /\b(?:color|color-contrast|color-mix|contrast-color|device-cmyk|gray|hsl|hsla|hwb|lab|lch|light-dark|oklab|oklch|rgb|rgba)\s*\(/iu.test(
          declaration.value,
        )
      ) {
        violations.add(
          'SCSS fallback must consume canonical color variables instead of raw colors.',
        )
      }
      for (const match of declaration.value.matchAll(numericUnit)) {
        const value = match[1] ?? ''
        const unit = (match[2] ?? '').toLowerCase()
        const fullViewportOrContainer =
          /^(?:(?:(?:min|max)-)?(?:width|height|inline-size|block-size)|flex-basis|inset(?:-(?:block|inline)(?:-(?:start|end))?)?|top|right|bottom|left|grid-template-(?:columns|rows)|scroll-padding(?:-(?:top|right|bottom|left|block|inline|block-(?:start|end)|inline-(?:start|end)))?|view-timeline-inset)$/u.test(
            authorityProperty,
          ) &&
          numericLexemeEquals(value, 100) &&
          /^(?:cq(?:w|h|i|b|min|max)|[sld]?v(?:w|h|i|b|min|max))$/u.test(unit)
        if (
          numericLexemeEquals(value, 0) ||
          fullViewportOrContainer ||
          (numericLexemeEquals(value, 1) && unit === 'fr')
        )
          continue
        violations.add(
          'SCSS fallback must consume canonical or registered structural dimensions instead of raw design units.',
        )
      }
      for (const match of declaration.value.matchAll(
        /(?:^|[^\w.-])([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)(ms|s)(?![\w-])/giu,
      )) {
        if (!numericLexemeEquals(match[1] ?? '', 0)) {
          violations.add(
            'SCSS fallback must consume canonical motion variables instead of raw duration values.',
          )
        }
      }
      if (
        /\b(?:ease|ease-in|ease-in-out|ease-out|linear|step-end|step-start)\b(?!-)|\b(?:cubic-bezier|steps)\s*\(/iu.test(
          declaration.value,
        )
      ) {
        violations.add(
          'SCSS fallback must consume canonical motion variables instead of raw timing functions.',
        )
      }
      if (
        normalizedProperty.startsWith('--') &&
        (normalizedProperty.startsWith('--ui-') ||
          !owner.contracts.some((contract) =>
            contract.declarations.some(
              ([property]) =>
                normalizeStyleProperty(property) === normalizeStyleProperty(declaration.property),
            ),
          ))
      )
        violations.add(
          'SCSS custom-property declarations require an exact registered private writer identity.',
        )
    }
    return [...violations]
  }

  return {
    inspectSource: inspectScssSourceAuthority,
    atRuleViolations: scssFallbackAtRuleViolations,
  }
}

interface PostCssNode {
  readonly type: string
  readonly parent?: PostCssNode
  readonly name?: string
  readonly params?: string
  readonly selector?: string
  readonly prop?: string
  readonly value?: string
  readonly important?: boolean
}

interface PostCssRoot {
  readonly walk: (callback: (node: PostCssNode) => void) => void
}

const postcss = createRequire(requireFromScss.resolve('stylelint'))('postcss') as {
  readonly parse: (source: string) => PostCssRoot
}

function postCssContext(node: PostCssNode): string[] {
  const context: string[] = []
  for (let ancestor = node.parent; ancestor !== undefined; ancestor = ancestor.parent) {
    if (ancestor.type === 'atrule')
      context.unshift(`@${ancestor.name ?? ''} ${ancestor.params ?? ''}`)
  }
  return context
}

function postCssSelector(node: PostCssNode): string {
  const selectors: string[] = []
  for (let ancestor = node.parent; ancestor !== undefined; ancestor = ancestor.parent) {
    if (ancestor.type === 'rule') selectors.unshift(ancestor.selector ?? '')
  }
  return selectors.join(' ')
}

function addIdentity(identities: Map<string, number>, identity: string): number {
  const occurrence = (identities.get(identity) ?? 0) + 1
  identities.set(identity, occurrence)
  return occurrence
}

function exactIdentitySetMatches(
  registered: ReadonlyMap<string, number>,
  actual: ReadonlyMap<string, number>,
): boolean {
  return (
    registered.size === actual.size &&
    [...registered].every(([identity, occurrences]) => actual.get(identity) === occurrences)
  )
}

export function validateScssFallbackOutputContract(
  owner: ScssFallbackOwner,
  compiledCss: string,
  identity: {
    readonly declaration: (value: StyleDeclarationIdentity) => string
    readonly atRule: (context: readonly string[], name: string, params: string) => string
  },
): string[] {
  const violations: string[] = []
  const registeredDeclarations = new Map<string, number>()
  const registeredAtRules = new Map<string, number>()
  const registeredKeyframes = new Map<string, number>()

  for (const contract of owner.contracts) {
    if (contract.declarations.length === 0) {
      violations.push(`${owner.path}: SCSS fallback declaration groups may not be empty.`)
    }
    for (const [property, value, important] of contract.declarations) {
      const occurrence = addIdentity(
        registeredDeclarations,
        identity.declaration({
          path: contract.path,
          block: contract.block,
          context: contract.context,
          selector: contract.selector,
          property,
          value,
          important,
        }),
      )
      if (occurrence > 1) {
        violations.push(`${owner.path}: SCSS fallback declaration identity is duplicated.`)
      }
    }
  }
  for (const atRule of owner.atRules) {
    const occurrence = addIdentity(
      registeredAtRules,
      identity.atRule(atRule.context, atRule.name, atRule.params),
    )
    if (occurrence > 1) {
      violations.push(`${owner.path}: SCSS fallback at-rule identity is duplicated.`)
    }
  }
  for (const keyframe of owner.keyframes) {
    const occurrence = addIdentity(
      registeredKeyframes,
      identity.atRule(keyframe.context, 'keyframes', keyframe.name),
    )
    if (occurrence > 1) {
      violations.push(`${owner.path}: SCSS fallback keyframe identity is duplicated.`)
    }
  }

  const actualDeclarations = new Map<string, number>()
  const actualAtRules = new Map<string, number>()
  const actualKeyframes = new Map<string, number>()
  const root = postcss.parse(compiledCss)
  root.walk((node) => {
    if (node.type === 'atrule') {
      const name = node.name ?? ''
      const params = node.params ?? ''
      if (name.toLowerCase().endsWith('keyframes'))
        addIdentity(actualKeyframes, identity.atRule(postCssContext(node), 'keyframes', params))
      else addIdentity(actualAtRules, identity.atRule(postCssContext(node), name, params))
    } else if (node.type === 'decl') {
      addIdentity(
        actualDeclarations,
        identity.declaration({
          path: owner.path,
          block: owner.block,
          context: postCssContext(node),
          selector: postCssSelector(node),
          property: node.prop ?? '',
          value: node.value ?? '',
          important: node.important === true,
        }),
      )
    }
  })

  if (!exactIdentitySetMatches(registeredDeclarations, actualDeclarations)) {
    violations.push(
      `${owner.path}: SCSS fallback declaration registry must exactly equal compiled output.`,
    )
  }
  if (!exactIdentitySetMatches(registeredAtRules, actualAtRules)) {
    violations.push(
      `${owner.path}: SCSS fallback at-rule registry must exactly equal compiled output.`,
    )
  }
  if (!exactIdentitySetMatches(registeredKeyframes, actualKeyframes)) {
    violations.push(
      `${owner.path}: SCSS fallback keyframe registry must exactly equal compiled output.`,
    )
  }

  return violations
}
