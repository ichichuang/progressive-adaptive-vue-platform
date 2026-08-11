import { relative } from 'node:path'

import tokenManifest from '../../packages/design-system/src/generated/tokens.manifest.json' with { type: 'json' }

const workspacePackagePattern = /^@platform\/[^/]+\/.+/
const rawColorPattern =
  /(?:^|[^0-9A-Za-z])#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?:$|[^0-9A-Za-z])|(?:color|hsl|hsla|lab|lch|oklab|oklch|rgb|rgba)\s*\(/u
const opticalEffectPattern = /\b(?:backdrop-filter|filter)\s*:|(?:blur|brightness|saturate)\s*\(/u
const rawVisualLengthPattern =
  /(?:^|[\s(,])[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:%|cap|ch|cm|cqb|cqh|cqi|cqmax|cqmin|cqw|dvh|dvw|em|ex|ic|in|lh|lvh|lvw|mm|pc|pt|px|rem|rlh|svh|svw|vb|vh|vi|vmax|vmin|vw)(?=$|[\s),;/])/iu
const rawMotionTimePattern = /(?:^|[\s(,])[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:ms|s)(?=$|[\s),;/])/iu
const rawMotionEasingPattern =
  /\b(?:ease|ease-in|ease-in-out|ease-out|linear|step-end|step-start)\b|(?:cubic-bezier|steps)\s*\(/iu
const rawUnitlessNumberPattern = /^[-+]?(?:\d+(?:\.\d+)?|\.\d+)$/u
const semanticVisualVariablePattern = /^var\((--ui-[a-z0-9-]+)\)$/u
const visualAuthorityMappings = tokenManifest.unoCssMappings
const structuralDimensionPattern =
  /^(?:auto|fit-content|max-content|min-content|(?:calc|clamp|max|min|minmax)\(.+\)|[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:%|dvh|dvw|fr|lvh|lvw|svh|svw|vh|vw))$/iu
const visualLengthProperties = new Set([
  'border-radius',
  'column-gap',
  'font-size',
  'gap',
  'height',
  'line-height',
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
])
const structuralDimensionProperties = new Set(['height', 'max-width'])
const colorProperties = new Set([
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
const unitlessVisualProperties = new Set(['font-weight', 'line-height', 'z-index'])
const shadowProperties = new Set(['box-shadow', 'text-shadow'])
const motionDurationProperties = new Set([
  'animation',
  'animation-delay',
  'animation-duration',
  'transition',
  'transition-delay',
  'transition-duration',
])
const motionEasingProperties = new Set([
  'animation',
  'animation-timing-function',
  'transition',
  'transition-timing-function',
])
const maximumStyleResolutionDepth = 8
const canonicalAppearanceStoragePaths = new Set([
  'apps/web/src/app/appearance/preference-storage.ts',
  'apps/web/src/app/appearance/custom-theme-registry-storage.ts',
])
const storageNames = new Set(['localStorage', 'sessionStorage'])
const storageOwners = new Set(['window', 'globalThis'])

function getStaticPropertyName(property, computed) {
  if (!computed && property.type === 'Identifier') {
    return property.name
  }

  if (computed && property.type === 'Literal' && typeof property.value === 'string') {
    return property.value
  }

  if (computed && property.type === 'TemplateLiteral' && property.expressions.length === 0) {
    return property.quasis[0]?.value.cooked ?? property.quasis[0]?.value.raw
  }

  return undefined
}

function normalizeVisualProperty(name) {
  return name.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`).toLowerCase()
}

function isBorderColorShorthand(property) {
  return /^border(?:-(?:block|bottom|inline|left|right|top)(?:-(?:end|start))?)?$/u.test(property)
}

function semanticColorProperty(property) {
  if (property === 'background') {
    return 'background-color'
  }

  if (
    isBorderColorShorthand(property) ||
    (property.startsWith('border-') && property.endsWith('-color'))
  ) {
    return 'border-color'
  }

  return colorProperties.has(property) ? property : undefined
}

function authorityMappingsForProperty(propertyName) {
  const property = normalizeVisualProperty(propertyName)
  const colorProperty = semanticColorProperty(property)

  return visualAuthorityMappings.filter((mapping) => {
    if (
      visualLengthProperties.has(property) &&
      /^(?:column-gap|gap|margin|padding|row-gap)/u.test(property)
    ) {
      return mapping.family === 'spacing'
    }

    if (
      property === 'border-radius' ||
      (property.startsWith('border-') && property.endsWith('-radius'))
    ) {
      return mapping.family === 'radius'
    }

    if (property === 'box-shadow') {
      return mapping.family === 'shadow'
    }

    if (motionDurationProperties.has(property) && mapping.family === 'duration') {
      return true
    }

    if (motionEasingProperties.has(property) && mapping.family === 'easing') {
      return true
    }

    if (colorProperty !== undefined) {
      return mapping.allowedCssProperties.includes(colorProperty)
    }

    return mapping.allowedCssProperties.includes(property)
  })
}

function staticNodeValue(node) {
  if (
    node?.type === 'Literal' &&
    (typeof node.value === 'number' || typeof node.value === 'string')
  ) {
    return node.value
  }

  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? node.quasis[0]?.value.raw
  }

  if (
    node?.type === 'UnaryExpression' &&
    (node.operator === '+' || node.operator === '-') &&
    node.argument.type === 'Literal' &&
    typeof node.argument.value === 'number'
  ) {
    return node.operator === '-' ? -node.argument.value : node.argument.value
  }

  return undefined
}

function isApprovedSemanticVariable(propertyName, value) {
  const match = semanticVisualVariablePattern.exec(value)
  return (
    match !== null &&
    authorityMappingsForProperty(propertyName).some((mapping) => mapping.cssVariable === match[1])
  )
}

function hasUnapprovedSemanticVariable(propertyName, value) {
  const variables = [...value.matchAll(/var\((--ui-[a-z0-9-]+)\)/gu)].map((match) => match[1])

  if (variables.length === 0) {
    return /var\(/u.test(value)
  }

  const approvedVariables = new Set(
    authorityMappingsForProperty(propertyName).map((mapping) => mapping.cssVariable),
  )

  return variables.some((variable) => !approvedVariables.has(variable))
}

function transitionPropertyIncludesAll(value) {
  return value.split(',').some((property) => property.trim().toLowerCase() === 'all')
}

function isGovernedVisualProperty(propertyName) {
  const property = normalizeVisualProperty(propertyName)

  return (
    visualLengthProperties.has(property) ||
    colorProperties.has(property) ||
    unitlessVisualProperties.has(property) ||
    shadowProperties.has(property) ||
    motionDurationProperties.has(property) ||
    motionEasingProperties.has(property) ||
    property === 'font-family' ||
    property === 'transition-property' ||
    isBorderColorShorthand(property) ||
    (/^border-/u.test(property) && /-(?:color|radius)$/u.test(property))
  )
}

function visualLiteralKind(propertyName, value) {
  const property = normalizeVisualProperty(propertyName)
  const isVisualLengthProperty =
    visualLengthProperties.has(property) ||
    (property.startsWith('border-') && property.endsWith('-radius'))
  const isColorProperty = semanticColorProperty(property) !== undefined

  if (
    typeof value === 'string' &&
    (/\btransition\s*:\s*all\b/iu.test(value) ||
      (property === 'transition' && /(?:^|[,\s])all(?=[,\s]|$)/iu.test(value)) ||
      (property === 'transition-property' && transitionPropertyIncludesAll(value)))
  ) {
    return 'transitionAll'
  }

  if (
    value === 0 ||
    value === '0' ||
    /^(?:auto|inherit|initial|none|revert|revert-layer|unset)$/u.test(String(value))
  ) {
    return undefined
  }

  if (typeof value === 'string' && isApprovedSemanticVariable(property, value)) {
    return undefined
  }

  if (
    typeof value === 'string' &&
    isGovernedVisualProperty(property) &&
    /var\(/u.test(value) &&
    hasUnapprovedSemanticVariable(property, value)
  ) {
    return 'visualLiteral'
  }

  if (isColorProperty) {
    if (typeof value !== 'string') {
      return 'visualLiteral'
    }

    return /^(?:currentColor|inherit|unset)$/u.test(value) ? undefined : 'visualLiteral'
  }

  if (
    structuralDimensionProperties.has(property) &&
    typeof value === 'string' &&
    structuralDimensionPattern.test(value)
  ) {
    return undefined
  }

  if (
    isVisualLengthProperty &&
    ((typeof value === 'number' && value !== 0) ||
      (typeof value === 'string' && rawVisualLengthPattern.test(value)))
  ) {
    return 'visualLiteral'
  }

  if (
    unitlessVisualProperties.has(property) &&
    ((typeof value === 'number' && value !== 0) ||
      (typeof value === 'string' &&
        (rawUnitlessNumberPattern.test(value) || /^(?:bold|bolder|lighter|normal)$/u.test(value))))
  ) {
    return 'visualLiteral'
  }

  if (
    shadowProperties.has(property) &&
    typeof value === 'string' &&
    value !== 'none' &&
    !isApprovedSemanticVariable(property, value)
  ) {
    return 'visualLiteral'
  }

  if (
    property === 'font-family' &&
    typeof value === 'string' &&
    !isApprovedSemanticVariable(property, value)
  ) {
    return 'visualLiteral'
  }

  if (
    motionDurationProperties.has(property) &&
    typeof value === 'string' &&
    rawMotionTimePattern.test(value)
  ) {
    return 'visualLiteral'
  }

  if (
    motionEasingProperties.has(property) &&
    typeof value === 'string' &&
    rawMotionEasingPattern.test(value)
  ) {
    return 'visualLiteral'
  }

  if (
    property.startsWith('--') &&
    typeof value === 'string' &&
    (rawColorPattern.test(value) ||
      rawVisualLengthPattern.test(value) ||
      rawMotionTimePattern.test(value) ||
      rawMotionEasingPattern.test(value) ||
      rawUnitlessNumberPattern.test(value))
  ) {
    return 'visualLiteral'
  }

  if (property === 'transition' || property === 'animation' || property === 'transition-property') {
    return undefined
  }

  if (isGovernedVisualProperty(property)) {
    return 'visualLiteral'
  }

  return undefined
}

function sourceVisitors(context, inspect) {
  function inspectNode(node) {
    if (node?.value !== undefined && typeof node.value === 'string') {
      inspect(node.value, node)
    }
  }

  return {
    ExportAllDeclaration(node) {
      inspectNode(node.source)
    },
    ExportNamedDeclaration(node) {
      inspectNode(node.source)
    },
    ImportDeclaration(node) {
      inspectNode(node.source)
    },
    ImportExpression(node) {
      inspectNode(node.source)
    },
  }
}

const noWorkspaceDeepImport = {
  meta: {
    messages: {
      deepImport: 'Import workspace packages only through their public root export.',
    },
    schema: [],
    type: 'problem',
  },
  create(context) {
    return sourceVisitors(context, (source, node) => {
      if (workspacePackagePattern.test(source)) {
        context.report({
          messageId: 'deepImport',
          node,
        })
      }
    })
  },
}

const noRekaImportOutsideUi = {
  meta: {
    messages: {
      invalidImport: 'Only @platform/ui may import reka-ui.',
    },
    schema: [],
    type: 'problem',
  },
  create(context) {
    const filename = context.filename.replaceAll('\\', '/')
    const isUiSource = filename.includes('/packages/ui/src/')

    return sourceVisitors(context, (source, node) => {
      if (source === 'reka-ui' && !isUiSource) {
        context.report({
          messageId: 'invalidImport',
          node,
        })
      }
    })
  },
}

const noDirectStorageAccess = {
  meta: {
    messages: {
      directStorage:
        'Access browser storage only through the two canonical Appearance persistence boundaries.',
    },
    schema: [],
    type: 'problem',
  },
  create(context) {
    const filename = relative(process.cwd(), context.filename).replaceAll('\\', '/')
    const ownsLocalStorage = canonicalAppearanceStoragePaths.has(filename)

    function storageAccessIsAllowed(storageName) {
      return ownsLocalStorage && storageName === 'localStorage'
    }

    function isUnshadowedGlobalReference(node) {
      for (let scope = context.sourceCode.getScope(node); scope; scope = scope.upper) {
        const reference = scope.references.find(
          (scopeReference) => scopeReference.identifier === node,
        )

        if (reference) {
          return reference.resolved === null || reference.resolved.defs.length === 0
        }
      }

      return false
    }

    function isGlobalNamedIdentifier(node, names) {
      return (
        node?.type === 'Identifier' && names.has(node.name) && isUnshadowedGlobalReference(node)
      )
    }

    function reportDestructuredStorage(pattern, owner) {
      if (pattern.type !== 'ObjectPattern' || !isGlobalNamedIdentifier(owner, storageOwners)) {
        return
      }

      for (const property of pattern.properties) {
        if (
          property.type === 'Property' &&
          storageNames.has(getStaticPropertyName(property.key, property.computed)) &&
          !storageAccessIsAllowed(getStaticPropertyName(property.key, property.computed))
        ) {
          context.report({
            messageId: 'directStorage',
            node: property,
          })
        }
      }
    }

    return {
      AssignmentExpression(node) {
        reportDestructuredStorage(node.left, node.right)
      },
      Identifier(node) {
        if (!isGlobalNamedIdentifier(node, storageNames)) {
          return
        }

        if (storageAccessIsAllowed(node.name)) {
          return
        }

        if (node.parent.type === 'MemberExpression' && node.parent.object === node) {
          return
        }

        context.report({
          messageId: 'directStorage',
          node,
        })
      },
      MemberExpression(node) {
        const directStorage = isGlobalNamedIdentifier(node.object, storageNames)
        const qualifiedStorage =
          isGlobalNamedIdentifier(node.object, storageOwners) &&
          storageNames.has(getStaticPropertyName(node.property, node.computed))

        const storageName = directStorage
          ? node.object.name
          : getStaticPropertyName(node.property, node.computed)

        if ((directStorage || qualifiedStorage) && !storageAccessIsAllowed(storageName)) {
          context.report({
            messageId: 'directStorage',
            node,
          })
        }
      },
      VariableDeclarator(node) {
        reportDestructuredStorage(node.id, node.init)
      },
    }
  },
}

const noUserAgentLayoutBranching = {
  meta: {
    messages: {
      userAgent:
        'Resolve responsive behavior from space and input capabilities, not user-agent data.',
    },
    schema: [],
    type: 'problem',
  },
  create(context) {
    return {
      MemberExpression(node) {
        const propertyName =
          node.property.type === 'Identifier'
            ? node.property.name
            : node.property.type === 'Literal' && typeof node.property.value === 'string'
              ? node.property.value
              : undefined

        if (propertyName === 'userAgent' || propertyName === 'userAgentData') {
          context.report({
            messageId: 'userAgent',
            node,
          })
        }
      },
    }
  },
}

const noRawUiColors = {
  meta: {
    messages: {
      rawColor: 'Use a project semantic design token instead of a raw color value.',
    },
    schema: [],
    type: 'problem',
  },
  create(context) {
    function inspectValue(value, node) {
      if (rawColorPattern.test(value)) {
        context.report({
          messageId: 'rawColor',
          node,
        })
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          inspectValue(node.value, node)
        }
      },
      TemplateElement(node) {
        inspectValue(node.value.raw, node)
      },
    }
  },
}

const noDynamicUnoCssClasses = {
  meta: {
    messages: {
      dynamicClass:
        'UnoCSS class names must be statically discoverable; select complete static strings instead.',
    },
    schema: [],
    type: 'problem',
  },
  create(context) {
    const templateVisitor = {
      "VAttribute[directive=true][key.name.name='bind']"(node) {
        if (node.key.argument?.type !== 'VIdentifier' || node.key.argument.name !== 'class') {
          return
        }

        const expression = node.value?.expression
        const isDynamic =
          expression?.type === 'BinaryExpression' ||
          (expression?.type === 'TemplateLiteral' && expression.expressions.length > 0)

        if (isDynamic) {
          context.report({
            messageId: 'dynamicClass',
            node,
          })
        }
      },
    }

    return context.sourceCode.parserServices.defineTemplateBodyVisitor?.(templateVisitor, {}) ?? {}
  },
}

const noUnapprovedVisualLiterals = {
  meta: {
    messages: {
      transitionAll: 'Declare the exact transitioned properties instead of transition: all.',
      unresolvedAuthority:
        'A visual style sink must resolve locally to a project design token or a static approved value.',
      visualLiteral:
        'Use a project design token or a named protocol constant instead of a visual literal.',
    },
    schema: [],
    type: 'problem',
  },
  create(context) {
    const localConstBindings = new Map()
    const cssStyleDeclarationBindings = new Map()
    const tokenImportBindings = new Set()
    const parserServices = context.sourceCode.parserServices
    const typeChecker = parserServices.program?.getTypeChecker()

    function reportUnresolved(node) {
      context.report({ messageId: 'unresolvedAuthority', node })
    }

    function localConstInitializer(identifier) {
      const initializer = localConstBindings.get(identifier.name)
      return initializer === null ? undefined : initializer
    }

    function isApprovedTokenReference(propertyName, node) {
      if (
        node?.type !== 'MemberExpression' ||
        node.object.type !== 'Identifier' ||
        !tokenImportBindings.has(node.object.name)
      ) {
        return false
      }

      const tokenName = getStaticPropertyName(node.property, node.computed)
      return (
        tokenName !== undefined &&
        authorityMappingsForProperty(propertyName).some((mapping) => mapping.roleId === tokenName)
      )
    }

    function isExplicitCssStyleDeclaration(identifier) {
      const annotation = identifier.typeAnnotation?.typeAnnotation

      return (
        annotation?.type === 'TSTypeReference' &&
        annotation.typeName.type === 'Identifier' &&
        annotation.typeName.name === 'CSSStyleDeclaration'
      )
    }

    function typeIsCssStyleDeclaration(type) {
      if (type.isUnion?.()) {
        const relevantTypes = type.types.filter((part) => {
          const text = typeChecker.typeToString(part)
          return text !== 'null' && text !== 'undefined'
        })

        return (
          relevantTypes.length > 0 && relevantTypes.every((part) => typeIsCssStyleDeclaration(part))
        )
      }

      return (
        type.aliasSymbol?.name === 'CSSStyleDeclaration' ||
        type.symbol?.name === 'CSSStyleDeclaration'
      )
    }

    function hasCssStyleDeclarationType(expression) {
      if (typeChecker === undefined || parserServices.esTreeNodeToTSNodeMap === undefined) {
        return undefined
      }

      try {
        const type = typeChecker.getTypeAtLocation(
          parserServices.esTreeNodeToTSNodeMap.get(expression),
        )
        return typeIsCssStyleDeclaration(type)
      } catch {
        return false
      }
    }

    function inspectStyleValue(propertyName, value, reportNode, depth, seenBindings) {
      if (depth > maximumStyleResolutionDepth) {
        reportUnresolved(reportNode)
        return
      }

      if (isApprovedTokenReference(propertyName, value)) {
        return
      }

      if (value?.type === 'Identifier') {
        if (seenBindings.has(value.name)) {
          reportUnresolved(reportNode)
          return
        }

        const initializer = localConstInitializer(value)

        if (initializer === undefined) {
          if (isGovernedVisualProperty(propertyName)) {
            reportUnresolved(reportNode)
          }
          return
        }

        inspectStyleValue(
          propertyName,
          initializer,
          reportNode,
          depth + 1,
          new Set([...seenBindings, value.name]),
        )
        return
      }

      const staticValue = staticNodeValue(value)

      if (staticValue !== undefined) {
        const messageId = visualLiteralKind(propertyName, staticValue)

        if (messageId !== undefined) {
          context.report({ messageId, node: reportNode })
        }

        return
      }

      if (isGovernedVisualProperty(propertyName)) {
        reportUnresolved(reportNode)
      }
    }

    function inspectProperty(property, depth, seenBindings) {
      if (property.type === 'SpreadElement') {
        inspectStyleExpression(property.argument, property, depth + 1, seenBindings)
        return
      }

      if (property.type !== 'Property') {
        reportUnresolved(property)
        return
      }

      const name = getStaticPropertyName(property.key, property.computed)

      if (name === undefined) {
        reportUnresolved(property)
        return
      }

      inspectStyleValue(name, property.value, property, depth + 1, seenBindings)
    }

    function inspectCssSnippet(value, node) {
      let declarationFound = false

      for (const match of value.matchAll(/(?:^|;)\s*([A-Za-z-]+)\s*:\s*([^;]+)/gu)) {
        declarationFound = true
        const property = match[1]
        const propertyValue = match[2]?.trim()

        if (property === undefined || propertyValue === undefined) {
          continue
        }

        const messageId = visualLiteralKind(property, propertyValue)

        if (messageId !== undefined) {
          context.report({ messageId, node })
        }
      }

      return declarationFound
    }

    function inspectStyleExpression(expression, reportNode, depth = 0, seenBindings = new Set()) {
      if (depth > maximumStyleResolutionDepth) {
        reportUnresolved(reportNode)
        return
      }

      if (expression?.type === 'Identifier') {
        if (seenBindings.has(expression.name)) {
          reportUnresolved(reportNode)
          return
        }

        const initializer = localConstInitializer(expression)

        if (initializer === undefined) {
          reportUnresolved(reportNode)
        } else {
          inspectStyleExpression(
            initializer,
            reportNode,
            depth + 1,
            new Set([...seenBindings, expression.name]),
          )
        }

        return
      }

      if (expression?.type === 'ObjectExpression') {
        for (const property of expression.properties) {
          inspectProperty(property, depth, seenBindings)
        }
        return
      }

      if (expression?.type === 'ArrayExpression') {
        for (const element of expression.elements) {
          if (element !== null) {
            inspectStyleExpression(element, element, depth + 1, seenBindings)
          }
        }
        return
      }

      if (expression?.type === 'Literal' && typeof expression.value === 'string') {
        if (!inspectCssSnippet(expression.value, reportNode)) {
          reportUnresolved(reportNode)
        }
        return
      }

      if (expression?.type === 'TemplateLiteral' && expression.expressions.length === 0) {
        const value = expression.quasis[0]?.value.cooked ?? expression.quasis[0]?.value.raw ?? ''
        if (!inspectCssSnippet(value, reportNode)) {
          reportUnresolved(reportNode)
        }
        return
      }

      if (expression?.type === 'ConditionalExpression') {
        inspectStyleExpression(
          expression.consequent,
          expression.consequent,
          depth + 1,
          seenBindings,
        )
        inspectStyleExpression(expression.alternate, expression.alternate, depth + 1, seenBindings)
        return
      }

      if (expression?.type === 'LogicalExpression') {
        inspectStyleExpression(expression.right, expression.right, depth + 1, seenBindings)
        return
      }

      if (
        expression?.type === 'Literal' &&
        (expression.value === null || expression.value === false)
      ) {
        return
      }

      reportUnresolved(reportNode)
    }

    function isStyleDeclaration(expression, depth = 0, seenBindings = new Set()) {
      if (depth > maximumStyleResolutionDepth) {
        return false
      }

      const typedResult = hasCssStyleDeclarationType(expression)

      if (typedResult !== undefined) {
        return typedResult
      }

      if (
        expression?.type === 'MemberExpression' &&
        getStaticPropertyName(expression.property, expression.computed) === 'style'
      ) {
        return true
      }

      if (expression?.type !== 'Identifier' || seenBindings.has(expression.name)) {
        return false
      }

      if (cssStyleDeclarationBindings.get(expression.name) === true) {
        return true
      }

      const initializer = localConstInitializer(expression)
      return (
        initializer !== undefined &&
        isStyleDeclaration(initializer, depth + 1, new Set([...seenBindings, expression.name]))
      )
    }

    const scriptVisitor = {
      AssignmentExpression(node) {
        if (node.left.type !== 'MemberExpression') {
          return
        }

        const propertyName = getStaticPropertyName(node.left.property, node.left.computed)

        if (!isStyleDeclaration(node.left.object)) {
          return
        }

        if (propertyName === undefined) {
          reportUnresolved(node.left)
          return
        }

        if (propertyName === 'cssText') {
          inspectStyleExpression(node.right, node.right)
        } else {
          inspectStyleValue(propertyName, node.right, node.right, 0, new Set())
        }
      },
      CallExpression(node) {
        if (
          node.callee.type !== 'MemberExpression' ||
          getStaticPropertyName(node.callee.property, node.callee.computed) !== 'setProperty' ||
          !isStyleDeclaration(node.callee.object)
        ) {
          return
        }

        const [property, value] = node.arguments
        const propertyName = staticNodeValue(property)

        if (
          typeof propertyName !== 'string' ||
          value?.type === 'SpreadElement' ||
          value === undefined
        ) {
          reportUnresolved(node)
          return
        }

        inspectStyleValue(propertyName, value, value, 0, new Set())
      },
      ImportDeclaration(node) {
        if (node.source.value !== '@platform/design-system') {
          return
        }

        for (const specifier of node.specifiers) {
          if (
            specifier.type === 'ImportSpecifier' &&
            getStaticPropertyName(specifier.imported, false) === 'tokens'
          ) {
            tokenImportBindings.add(specifier.local.name)
          }
        }
      },
      VariableDeclarator(node) {
        if (node.id.type !== 'Identifier') {
          return
        }

        if (isExplicitCssStyleDeclaration(node.id)) {
          if (cssStyleDeclarationBindings.has(node.id.name)) {
            cssStyleDeclarationBindings.set(node.id.name, null)
          } else {
            cssStyleDeclarationBindings.set(node.id.name, true)
          }
        }

        if (node.parent.kind === 'const' && node.init !== null) {
          if (localConstBindings.has(node.id.name)) {
            localConstBindings.set(node.id.name, null)
          } else {
            localConstBindings.set(node.id.name, node.init)
          }
        }
      },
    }
    const templateVisitor = {
      VAttribute(node) {
        if (!node.directive && node.key.name === 'style' && typeof node.value?.value === 'string') {
          inspectCssSnippet(node.value.value, node)
          return
        }

        if (
          !node.directive ||
          node.key.name.name !== 'bind' ||
          node.key.argument?.type !== 'VIdentifier' ||
          node.key.argument.name !== 'style' ||
          node.value?.expression === undefined
        ) {
          return
        }

        inspectStyleExpression(node.value.expression, node)
      },
    }

    return (
      context.sourceCode.parserServices.defineTemplateBodyVisitor?.(
        templateVisitor,
        scriptVisitor,
      ) ?? scriptVisitor
    )
  },
}

function literalVisitors(context, inspect) {
  return {
    Literal(node) {
      if (typeof node.value === 'string') {
        inspect(node.value, node)
      }
    },
    TemplateElement(node) {
      inspect(node.value.raw, node)
    },
  }
}

const noAppMaterialTokenAccess = {
  meta: {
    messages: {
      internalMaterial:
        'Applications may not consume ui-internal --ui-material-* implementation tokens.',
    },
    schema: [],
    type: 'problem',
  },
  create(context) {
    const filename = context.filename.replaceAll('\\', '/')

    if (!filename.includes('/apps/')) {
      return {}
    }

    return literalVisitors(context, (value, node) => {
      if (value.includes('--ui-material-')) {
        context.report({
          messageId: 'internalMaterial',
          node,
        })
      }
    })
  },
}

const noPageOpticalEffects = {
  meta: {
    messages: {
      opticalEffect:
        'Application and page code may not author blur, filter, saturation, or brightness effects.',
    },
    schema: [],
    type: 'problem',
  },
  create(context) {
    const filename = context.filename.replaceAll('\\', '/')

    if (!filename.includes('/apps/')) {
      return {}
    }

    return literalVisitors(context, (value, node) => {
      if (opticalEffectPattern.test(value)) {
        context.report({
          messageId: 'opticalEffect',
          node,
        })
      }
    })
  },
}

export const localRules = {
  rules: {
    'no-app-material-token-access': noAppMaterialTokenAccess,
    'no-direct-storage-access': noDirectStorageAccess,
    'no-dynamic-unocss-classes': noDynamicUnoCssClasses,
    'no-page-optical-effects': noPageOpticalEffects,
    'no-raw-ui-colors': noRawUiColors,
    'no-reka-import-outside-ui': noRekaImportOutsideUi,
    'no-unapproved-visual-literals': noUnapprovedVisualLiterals,
    'no-user-agent-layout-branching': noUserAgentLayoutBranching,
    'no-workspace-deep-import': noWorkspaceDeepImport,
  },
}
