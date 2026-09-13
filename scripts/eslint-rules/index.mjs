import {
  createStyleSinkResolver,
  getStaticPropertyName,
  staticNodeValue,
  maximumStyleResolutionDepth,
} from './ui-source-analysis.mjs'
import { relative, resolve } from 'node:path'

import unocss from '@unocss/eslint-plugin'
import { parseVariantGroup } from 'unocss'

import tokenManifest from '../../packages/design-system/src/generated/tokens.manifest.json' with { type: 'json' }
import { shellIconResolverOwner } from '../architecture/style-owner-contracts.ts'
import {
  blocksSourceUtility,
  dimensionProperty,
  hasShellViewportVariant,
  isStructuralDimensionValue,
  mappingCssProperties,
  numericLexemeEquals,
  physicalDimensionProperty,
} from './style-authority.ts'

const workspacePackagePattern = /^@platform\/[^/]+\/.+/
const rawColorPattern =
  /(?:^|[^0-9A-Za-z])#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?:$|[^0-9A-Za-z])|(?:color|hsl|hsla|lab|lch|oklab|oklch|rgb|rgba)\s*\(/u
const opticalEffectPattern = /\b(?:backdrop-filter|filter)\s*:|(?:blur|brightness|saturate)\s*\(/u
const rawVisualLengthPattern =
  /(?:^|[\s(,])[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?(?:%|cap|ch|cm|cqb|cqh|cqi|cqmax|cqmin|cqw|dvh|dvw|em|ex|ic|in|lh|lvh|lvw|mm|pc|pt|px|rem|rlh|svh|svw|vb|vh|vi|vmax|vmin|vw)(?=$|[\s),;/])/iu
const rawMotionTimePattern =
  /(?:^|[\s(,])[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?(?:ms|s)(?=$|[\s),;/])/iu
const rawMotionEasingPattern =
  /\b(?:ease|ease-in|ease-in-out|ease-out|linear|step-end|step-start)\b(?!-)|(?:cubic-bezier|steps)\s*\(/iu
const rawUnitlessNumberPattern = /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/iu
const semanticVisualVariablePattern = /^var\((--ui-[a-z0-9-]+)\)$/u
const visualAuthorityMappings = tokenManifest.unoCssMappings
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
const canonicalAppearanceStoragePaths = new Set([
  'apps/web/src/app/appearance/preference-storage.ts',
  'apps/web/src/app/appearance/custom-theme-registry-storage.ts',
])
const canonicalStorageOwnerPrefix = 'apps/web/src/app/storage/'
const storageNames = new Set(['localStorage', 'sessionStorage'])
const storageOwners = new Set(['window', 'globalThis'])
const legacyErrorPages = new Set([
  'apps/web/src/pages/[...path].vue',
  ...['400', '401', '403', '500', 'maintenance', 'offline'].map(
    (name) => `apps/web/src/pages/error/${name}.vue`,
  ),
])
const legacyBorderOwners = new Map([
  ...[...legacyErrorPages].map((path) => [path, 'section']),
  ['apps/web/src/app/errors/AppErrorBoundary.vue', 'section'],
  ['apps/web/src/pages/capabilities.vue', 'article'],
  ['apps/web/src/pages/index.vue', 'a'],
  ['packages/ui/src/components/UiSection.vue', 'section'],
])
const exactDynamicClassOwners = new Map([
  [
    'packages/ui/src/components/UiAdminShell.vue',
    new Set(['pavp-admin-shell__header-action-icon-state--active']),
  ],
  [
    'packages/ui/src/adapters/motion/AdminNavigationSelectionLens.vue',
    new Set(['pavp-admin-navigation-selection-lens', 'pavp-admin-navigation-selection-lens--full']),
  ],
])

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
  const property = physicalDimensionProperty(normalizeVisualProperty(propertyName))
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
      return mappingCssProperties(mapping).includes(colorProperty)
    }

    return mappingCssProperties(mapping).includes(property)
  })
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
    dimensionProperty.test(property) ||
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
    dimensionProperty.test(property) &&
    typeof value === 'string' &&
    isStructuralDimensionValue(
      value,
      (name) =>
        authorityMappingsForProperty(property).some((mapping) => mapping.cssVariable === name),
      { allowFullViewportOrContainer: true, allowPercentages: true },
    )
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
        'Access browser storage only through the canonical Appearance persistence boundaries or the Storage owner.',
    },
    schema: [],
    type: 'problem',
  },
  create(context) {
    const filename = relative(process.cwd(), context.filename).replaceAll('\\', '/')
    const ownsLocalStorage =
      canonicalAppearanceStoragePaths.has(filename) ||
      filename.startsWith(canonicalStorageOwnerPrefix)

    function storageAccessIsAllowed(storageName) {
      return (
        (ownsLocalStorage && storageName === 'localStorage') ||
        (filename === 'apps/web/src/app/storage/scroll-refresh-storage.ts' &&
          storageName === 'sessionStorage')
      )
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

// Follow values only after a renderer or DOM API proves that they reach a style
// sink. ESLint variables (not identifier spellings) are the binding authority.
const noDynamicUnoCssClasses = {
  meta: {
    messages: {
      ...unocss.rules.blocklist.meta.messages,
      dynamicClass:
        'Class input at this UI sink is unresolved. Supply a complete static class set or an exact registered resolver owner.',
      unresolvedMarkup:
        'HTML at this UI sink is unresolved or cannot be parsed. Supply statically resolved, well-formed markup with inspectable attributes.',
      sourceUtility:
        'Use a registered PAVP semantic utility. A missing reusable capability requires a canonical token/UnoCSS mapping extension.',
      layoutProfile:
        'Admin Shell geometry must use layout-narrow/regular/wide, not a parallel viewport breakpoint.',
    },
    schema: [],
    type: 'problem',
  },
  create(context) {
    const filename = relative(process.cwd(), context.filename).replaceAll('\\', '/')
    const shellOwner = [
      'packages/ui/src/components/UiAdminShell.vue',
      'packages/ui/src/adapters/motion/WorkspaceTabsSurface.vue',
      'apps/web/src/app/console/ConsoleRouteFrame.vue',
      'apps/web/src/App.vue',
    ].includes(filename)
    const shellClass = /(?:pavp-admin-|pavp-workspace-|admin-header|admin-sidebar|admin-drawer)/u
    const sinks = createStyleSinkResolver(context)
    const inspected = new WeakMap()
    let legacyBorderClaimed = false
    let officialTemplateVisitor
    let officialReportNode

    // The installed official blocklist rule owns extraction and variant matching. Its
    // current Vue visitor only handles static attributes; feed it source-proven class
    // strings from bindings without copying UnoCSS's utility parser into this rule.
    unocss.rules.blocklist.create({
      options: [],
      settings: context.settings,
      filename: context.filename,
      sourceCode: {
        parserServices: {
          defineTemplateBodyVisitor(templateVisitor) {
            officialTemplateVisitor = templateVisitor
            return {}
          },
        },
      },
      report(descriptor) {
        context.report({ ...descriptor, node: officialReportNode })
      },
    })

    function inspectClassText(value, node, scopedShell, official = true) {
      if (typeof value !== 'string') return
      const values = inspected.get(node) ?? new Set()
      if (values.has(value)) return
      values.add(value)
      inspected.set(node, values)
      const classes = parseVariantGroup(value).expanded.split(/\s+/u).filter(Boolean)
      const exactOwnerClasses = exactDynamicClassOwners.get(filename)
      const inspectableClasses = classes.filter((token) => !exactOwnerClasses?.has(token))
      if (official && inspectableClasses.length > 0) {
        officialReportNode = node
        officialTemplateVisitor.VAttribute({
          key: { name: 'class' },
          value: { type: 'VLiteral', value: inspectableClasses.join(' ') },
        })
      }
      const sourceViolations = classes.filter((token) => {
        if (exactOwnerClasses?.has(token)) return false
        if (!blocksSourceUtility(token)) return false
        // Existing border debt is finite; no new page or second sink inherits it.
        if (
          token === 'border' &&
          legacyBorderOwners.has(filename) &&
          node.type === 'VLiteral' &&
          node.parent?.key.name === 'class' &&
          node.parent.parent.parent.rawName === legacyBorderOwners.get(filename) &&
          !legacyBorderClaimed
        ) {
          legacyBorderClaimed = true
          return false
        }
        if (
          token === 'border' &&
          filename === 'apps/web/src/app/errors/fatal-boundary.ts' &&
          node.parent?.type === 'AssignmentExpression' &&
          node.parent.left.type === 'MemberExpression' &&
          sinks.name(node.parent.left.property, node.parent.left.computed) === 'className' &&
          sinks.unwrap(node.parent.left.object)?.type === 'CallExpression' &&
          staticNodeValue(sinks.unwrap(node.parent.left.object).arguments[0]) === 'section' &&
          !legacyBorderClaimed
        ) {
          legacyBorderClaimed = true
          return false
        }
        return true
      })
      if (sourceViolations.length > 0) {
        context.report({ messageId: 'sourceUtility', node })
      }
      if (
        (shellOwner || scopedShell || shellClass.test(value)) &&
        classes.some(hasShellViewportVariant)
      ) {
        context.report({ messageId: 'layoutProfile', node })
      }
    }

    function unresolved(node) {
      context.report({ messageId: 'dynamicClass', node })
    }

    function admittedClass(expression) {
      if (
        filename === 'packages/ui/src/components/UiStatusBadge.vue' &&
        expression.type === 'TemplateLiteral' &&
        expression.expressions.length === 1 &&
        expression.quasis[0].value.raw === 'pavp-status-badge--' &&
        expression.quasis[1].value.raw === ''
      ) {
        const tone = expression.expressions[0]
        const props = tone.type === 'MemberExpression' ? sinks.initializer(tone.object) : undefined
        const shape = props?.typeArguments?.params[0] ?? props?.typeParameters?.params[0]
        const member =
          shape?.type === 'TSTypeLiteral'
            ? shape.members.find(
                (item) => getStaticPropertyName(item.key, item.computed) === 'tone',
              )
            : undefined
        const type = member?.typeAnnotation?.typeAnnotation
        return (
          getStaticPropertyName(tone.property, tone.computed) === 'tone' &&
          props?.callee?.name === 'defineProps' &&
          type?.type === 'TSTypeReference' &&
          sinks.imported(type.typeName, './contracts', ['UiStatusTone'])
        )
      }
      if (
        filename !== shellIconResolverOwner.path ||
        expression.type !== 'CallExpression' ||
        expression.arguments.length !== 1
      )
        return false
      const binding = sinks.variable(sinks.unwrap(expression.callee))
      if (!binding || binding !== sinks.moduleBinding(shellIconResolverOwner.binding)) return false
      if (binding.references.some((reference) => reference.isWrite() && !reference.init))
        return false
      const definition = binding.defs[0]
      const fn = definition?.type === 'FunctionName' ? definition.node : definition?.node.init
      if (
        !['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
          fn?.type,
        ) ||
        fn.params.length !== 1 ||
        fn.params[0].type !== 'Identifier' ||
        fn.async ||
        fn.generator
      )
        return false
      return sinks.finiteReturns(fn, new Set(shellIconResolverOwner.classes))
    }

    function inspectClassExpression(expression, scopedShell, depth = 0, seen = new Set()) {
      if (expression === undefined) return
      if (depth > maximumStyleResolutionDepth || seen.has(expression)) {
        unresolved(expression)
        return
      }
      const nextSeen = new Set([...seen, expression])
      if (sinks.untrusted(expression)) {
        unresolved(expression)
        return
      }
      const resolved = sinks.unwrap(expression)
      if (resolved !== expression) {
        inspectClassExpression(resolved, scopedShell, depth + 1, nextSeen)
        return
      }
      const value = staticNodeValue(expression)
      if (typeof value === 'string') {
        inspectClassText(value, expression, scopedShell)
        return
      }
      if (
        admittedClass(expression) ||
        (expression.type === 'Literal' &&
          (expression.value === null || typeof expression.value === 'boolean')) ||
        sinks.global(expression, 'undefined')
      )
        return
      const inspect = (child) => inspectClassExpression(child, scopedShell, depth + 1, nextSeen)
      if (expression.type === 'ArrayExpression') {
        for (const element of expression.elements) if (element !== null) inspect(element)
      } else if (expression.type === 'ObjectExpression') {
        for (const property of expression.properties) {
          if (property.type === 'SpreadElement') inspect(property.argument)
          else if (property.type === 'Property') {
            const name = sinks.name(property.key, property.computed)
            if (name !== undefined) inspectClassText(name, property.key, scopedShell)
            else unresolved(property)
          }
        }
      } else if (expression.type === 'ConditionalExpression') {
        inspect(expression.consequent)
        inspect(expression.alternate)
      } else if (expression.type === 'LogicalExpression') {
        if (expression.operator !== '&&') inspect(expression.left)
        inspect(expression.right)
      } else if (expression.type === 'MemberExpression') {
        const container = sinks.unwrap(expression.object)
        const name = sinks.name(expression.property, expression.computed)
        let found = false
        if (container?.type === 'ObjectExpression') {
          for (const property of container.properties) {
            if (
              property.type === 'Property' &&
              (name === undefined ||
                getStaticPropertyName(property.key, property.computed) === name)
            ) {
              found = true
              inspect(property.value)
            } else if (property.type === 'SpreadElement') {
              found = true
              unresolved(property)
            }
          }
        } else if (container?.type === 'ArrayExpression') {
          found = true
          for (const element of container.elements) if (element !== null) inspect(element)
        }
        if (!found) unresolved(expression)
      } else if (expression.type === 'SpreadElement') inspect(expression.argument)
      else unresolved(expression)
    }

    function inspectMarkupClasses(expression, node) {
      const values = sinks.classMarkupValues(expression)
      if (values === undefined) {
        if (sinks.markupIsUnresolved(expression))
          context.report({ messageId: 'unresolvedMarkup', node })
        return
      }
      for (const value of values) inspectClassText(value, node, false)
    }

    function inspectProps(expression) {
      sinks.props(
        expression,
        (name, value, node) => {
          if (name === 'class' || name === 'className') inspectClassExpression(value, false)
          if (name === 'innerHTML' || name === 'outerHTML') inspectMarkupClasses(value, node)
        },
        unresolved,
      )
    }

    const templateVisitor = {
      VAttribute(node) {
        if (!node.directive && node.key.name === 'class') {
          inspectClassText(node.value?.value, node.value, false)
          return
        }
        if (!node.directive || node.key.name.name !== 'bind') return
        if (sinks.vendorTemplate(node, inspectProps, unresolved)) return
        const argument = node.key.argument
        if (argument == null) {
          if (!sinks.templateForward(node)) inspectProps(node.value?.expression)
          return
        }
        const names =
          argument.type === 'VIdentifier'
            ? [argument.name]
            : sinks.attributeNames(argument.expression)
        if (names === undefined) {
          unresolved(node)
          return
        }
        if (names.includes('class'))
          inspectClassExpression(
            node.value?.expression,
            shellClass.test(context.sourceCode.getText(node.parent)),
          )
      },
    }

    const scriptVisitor = {
      CallExpression(node) {
        const call = sinks.invocation(node)
        if (call === undefined) return
        const renderName = sinks.renderName(call)
        if (renderName !== undefined) {
          if (call.unresolvedArguments) unresolved(node)
          else if (renderName === 'createStaticVNode') unresolved(node)
          else if (!sinks.hChildren(call)) inspectProps(call.arguments[1])
          return
        }
        const callee = call.callee
        if (callee.type !== 'MemberExpression') return
        const object = call.receiver
        const arguments_ = call.arguments
        const methods = sinks.memberNames(callee)
        const method = methods?.length === 1 ? methods[0] : undefined
        const namespace = sinks.namespace(callee.object)
        const classListReaders = [
          'contains',
          'item',
          'entries',
          'values',
          'keys',
          'forEach',
          'toString',
        ]
        const ambiguousClassSink =
          methods !== undefined &&
          methods.length > 1 &&
          ((sinks.dom(object) &&
            methods.some((name) =>
              ['setAttribute', 'setAttributeNS', 'insertAdjacentHTML'].includes(name),
            )) ||
            (sinks.documentObject(object) &&
              methods.some((name) => ['write', 'writeln'].includes(name))) ||
            (sinks.classList(object) && methods.some((name) => !classListReaders.includes(name))) ||
            (['Object', 'Reflect'].includes(namespace) &&
              methods.some((name) => ['assign', 'set'].includes(name)) &&
              (sinks.dom(arguments_[0]) || sinks.vnodeProps(arguments_[0]))))
        if (ambiguousClassSink) {
          unresolved(node)
          return
        }
        if (
          call.unresolvedArguments &&
          ((sinks.dom(object) &&
            ['setAttribute', 'setAttributeNS', 'insertAdjacentHTML'].includes(method)) ||
            (sinks.documentObject(object) && ['write', 'writeln'].includes(method)) ||
            (sinks.classList(object) && !classListReaders.includes(method)) ||
            (['Object', 'Reflect'].includes(namespace) &&
              (sinks.dom(arguments_[0]) || sinks.vnodeProps(arguments_[0]))))
        ) {
          unresolved(node)
          return
        }
        if (
          methods === undefined &&
          (sinks.dom(object) ||
            sinks.documentObject(object) ||
            (['Object', 'Reflect'].includes(namespace) &&
              (sinks.dom(arguments_[0]) || sinks.vnodeProps(arguments_[0]))))
        ) {
          unresolved(node)
          return
        }
        if (sinks.dom(object) && method === 'insertAdjacentHTML') {
          inspectMarkupClasses(arguments_[1], node)
          return
        }
        if (sinks.documentObject(object) && ['write', 'writeln'].includes(method)) {
          for (const argument of arguments_) inspectMarkupClasses(argument, node)
          return
        }
        if (method === 'assign' && namespace === 'Object') {
          const target = arguments_[0]
          if (sinks.dom(target) || sinks.vnodeProps(target) || sinks.documentObject(target)) {
            for (const source of arguments_.slice(1)) inspectProps(source)
            return
          }
        }
        if (method === 'set' && namespace === 'Reflect') {
          const target = arguments_[0]
          if (sinks.dom(target) || sinks.vnodeProps(target) || sinks.documentObject(target)) {
            const names = sinks.attributeNames(arguments_[1])
            if (names?.some((name) => name === 'class' || name === 'className'))
              inspectClassExpression(arguments_[2], false)
            else if (names?.some((name) => name === 'innerHTML' || name === 'outerHTML'))
              inspectMarkupClasses(arguments_[2], node)
            else if (names === undefined) unresolved(node)
            return
          }
        }
        if (['setAttribute', 'setAttributeNS'].includes(method) && sinks.dom(object)) {
          const offset = method === 'setAttributeNS' ? 1 : 0
          const names = sinks.attributeNames(arguments_[offset])
          if (names?.some((name) => sinks.htmlAttributeName(name, method, object) === 'class'))
            inspectClassExpression(arguments_[offset + 1], false)
          else if (
            names === undefined &&
            (method === 'setAttributeNS' ||
              (!sinks.appearanceAttribute({ ...node, arguments: arguments_ }) &&
                !sinks.mountAttributeRestore({
                  ...node,
                  callee: { ...callee, object },
                  arguments: arguments_,
                })))
          )
            unresolved(node)
        }
        if (sinks.classList(object)) {
          const count =
            method === 'toggle'
              ? 1
              : method === 'replace'
                ? 2
                : ['add', 'remove'].includes(method)
                  ? arguments_.length
                  : 0
          if (count === 0 && !classListReaders.includes(method)) unresolved(node)
          for (const argument of arguments_.slice(0, count)) inspectClassExpression(argument, false)
        }
      },
      AssignmentExpression(node) {
        if (node.left.type !== 'MemberExpression') return
        const keys = sinks.memberNames(node.left)
        if (
          keys === undefined &&
          (sinks.dom(node.left.object) ||
            sinks.vnodeProps(node.left.object) ||
            sinks.documentObject(node.left.object) ||
            sinks.svgClassName(node.left.object))
        ) {
          unresolved(node)
          return
        }
        for (const key of keys ?? []) {
          if (
            ['innerHTML', 'outerHTML'].includes(key) &&
            (sinks.dom(node.left.object) ||
              sinks.documentObject(node.left.object) ||
              sinks.vnodeProps(node.left.object))
          )
            inspectMarkupClasses(node.right, node)
          if (key === 'className' && sinks.dom(node.left.object))
            inspectClassExpression(node.right, false)
          if (['class', 'className'].includes(key) && sinks.vnodeProps(node.left.object))
            inspectClassExpression(node.right, false)
          if (key === 'value' && sinks.classList(node.left.object))
            inspectClassExpression(node.right, false)
          if (key === 'baseVal' && sinks.svgClassName(node.left.object))
            inspectClassExpression(node.right, false)
          if (key === 'props' && sinks.typed(node.left.object, /^VNode$/u)) inspectProps(node.right)
        }
      },
      VariableDeclarator(node) {
        if (sinks.typed(node.id, /^VNode$/u))
          sinks.props(
            node.init,
            (key, value) => {
              if (key === 'props') inspectProps(value)
            },
            unresolved,
          )
      },
    }
    return (
      context.sourceCode.parserServices.defineTemplateBodyVisitor?.(
        sinks.visitors(templateVisitor),
        sinks.visitors(scriptVisitor),
      ) ?? sinks.visitors(scriptVisitor)
    )
  },
}

const noUnapprovedVisualLiterals = {
  meta: {
    messages: {
      transitionAll: 'Declare the exact transitioned properties instead of transition: all.',
      unresolvedAuthority:
        'A visual style sink must resolve locally to a project design token or a static approved value.',
      unresolvedMarkup:
        'HTML at this UI sink is unresolved or cannot be parsed. Supply statically resolved, well-formed markup with inspectable attributes.',
      visualLiteral:
        'Use a project design token or a named protocol constant instead of a visual literal.',
      styleOwner:
        'Ordinary UI must use semantic UnoCSS. Inline style requires a named runtime/vendor owner or an inventoried legacy sink.',
      publicVariableWriter:
        'Only the canonical generated/runtime owner may declare public --ui-* variables.',
    },
    schema: [],
    type: 'problem',
  },
  create(context) {
    const filename = relative(process.cwd(), context.filename).replaceAll('\\', '/')
    const sinks = createStyleSinkResolver(context)
    const previewProjectionFunctions = new Set()
    const overflowWrites = []
    const usedStyleSinks = new Set()

    function reportStyleOwner(node) {
      context.report({ messageId: 'styleOwner', node })
    }

    function reportUnresolvedMarkup(node) {
      context.report({ messageId: 'unresolvedMarkup', node })
    }

    function resolveLocalExpression(expression, seen = new Set()) {
      return sinks.unwrap(expression, seen)
    }

    function singleStyleProperty(expression) {
      const resolved = resolveLocalExpression(expression)
      if (resolved?.type !== 'ObjectExpression' || resolved.properties.length !== 1)
        return undefined
      const property = resolved.properties[0]
      return property.type === 'Property' ? property : undefined
    }

    function claimStyleSink(key) {
      if (usedStyleSinks.has(key)) return false
      usedStyleSinks.add(key)
      return true
    }

    function isPreviewPlaneReturn(expression, parameters) {
      const contrast = resolveLocalExpression(expression)
      if (contrast?.type !== 'MemberExpression' || !contrast.computed) return false
      const mode = resolveLocalExpression(contrast.object)
      if (mode?.type !== 'MemberExpression' || !mode.computed) return false
      const planes = resolveLocalExpression(mode.object)
      return (
        planes?.type === 'MemberExpression' &&
        getStaticPropertyName(planes.property, planes.computed) === 'planes' &&
        planes.object.type === 'Identifier' &&
        parameters.has(sinks.variable(planes.object))
      )
    }

    function documentOverflowTarget(expression) {
      if (
        expression?.type !== 'MemberExpression' ||
        getStaticPropertyName(expression.property, expression.computed) !== 'style'
      )
        return undefined
      const target = expression.object
      if (target.type !== 'MemberExpression' || !sinks.global(target.object, 'document'))
        return undefined
      const name = getStaticPropertyName(target.property, target.computed)
      return name === 'documentElement' || name === 'body' ? name : undefined
    }

    function lifecycleCallback(fn, names) {
      const call = fn?.parent
      return (
        call?.type === 'CallExpression' &&
        call.arguments[0] === fn &&
        sinks.imported(call.callee, 'vue', names)
      )
    }

    function captureReaches(capture, sink) {
      let statement = capture
      while (statement.parent && !['Program', 'BlockStatement'].includes(statement.parent.type)) {
        if (
          ![
            'VariableDeclarator',
            'VariableDeclaration',
            'ExpressionStatement',
            'AssignmentExpression',
          ].includes(statement.type)
        )
          return false
        statement = statement.parent
      }
      if (!['VariableDeclaration', 'ExpressionStatement'].includes(statement.type)) return false
      if (sinks.definitelyLater(sink, capture)) return true
      const capturedIn = sinks.executionOwner(capture)
      const restoredIn = sinks.executionOwner(sink)
      if (!lifecycleCallback(capturedIn, ['onMounted'])) return false
      if (statement.parent !== capturedIn.body) return false
      let earlyReturn = false
      const inspect = (node) => {
        if (!node || node.range[0] >= capture.range[0]) return
        if (node.type === 'ReturnStatement') earlyReturn = true
        if (node !== capturedIn.body && sinks.executionOwner(node) !== capturedIn) return
        for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
          const children = node[key]
          if (Array.isArray(children)) children.forEach(inspect)
          else inspect(children)
        }
      }
      inspect(capturedIn.body)
      if (earlyReturn) return false
      if (lifecycleCallback(restoredIn, ['onBeforeUnmount'])) return true
      if (restoredIn?.type !== 'FunctionDeclaration') return false
      const references = sinks.variable(restoredIn.id)?.references ?? []
      let appliedAfterCapture = false
      for (const reference of references) {
        const use = reference.identifier.parent
        if (reference.isWrite() || use?.type !== 'CallExpression') return false
        if (
          use.callee === reference.identifier &&
          sinks.executionOwner(use) === capturedIn &&
          sinks.definitelyLater(use, capture)
        ) {
          appliedAfterCapture = true
          continue
        }
        // The current non-immediate post watcher observes the mounted capture.
        const options = sinks.bare(use.arguments[2])
        if (
          use.arguments[1] !== reference.identifier ||
          !sinks.imported(use.callee, 'vue', ['watch']) ||
          options?.type !== 'ObjectExpression' ||
          options.properties.some(
            (property) =>
              property.type !== 'Property' ||
              property.kind !== 'init' ||
              property.method ||
              getStaticPropertyName(property.key, property.computed) === undefined,
          )
        )
          return false
        const effectiveOptions = new Map(
          options.properties.map((property) => [
            getStaticPropertyName(property.key, property.computed),
            sinks.bare(property.value),
          ]),
        )
        const immediate = effectiveOptions.get('immediate')
        if (
          staticNodeValue(effectiveOptions.get('flush')) !== 'post' ||
          (immediate !== undefined && (immediate.type !== 'Literal' || immediate.value !== false))
        )
          return false
      }
      return appliedAfterCapture
    }

    function capturedOverflow(expression, sink, seen = new Set()) {
      expression = sinks.bare(expression)
      if (expression?.type !== 'Identifier') return undefined
      const binding = sinks.variable(expression)
      if (!binding || seen.has(binding)) return undefined
      const definition = binding.defs[0]
      if (definition?.type !== 'Variable' || definition.node.id.type !== 'Identifier')
        return undefined
      const writes = binding.references.filter(
        (reference) => reference.isWrite() && !sinks.definitelyLater(reference.identifier, sink),
      )
      const assignments = writes.filter((reference) => !reference.init)
      // An initializer is superseded only by one proven capture. All other writes,
      // including writes in another callback or branch, remain disqualifying.
      const reaching = assignments.length === 1 ? assignments : writes
      if (reaching.length !== 1) return undefined
      const reference = reaching[0]
      const write = reference.identifier.parent
      const value =
        reference.init && write?.type === 'VariableDeclarator' && write.id === reference.identifier
          ? write.init
          : write?.type === 'AssignmentExpression' &&
              write.operator === '=' &&
              write.left === reference.identifier
            ? write.right
            : undefined
      if (!value || !captureReaches(write, sink)) return undefined
      const captured = sinks.bare(value)
      if (
        captured.type === 'MemberExpression' &&
        getStaticPropertyName(captured.property, captured.computed) === 'overflow'
      ) {
        const target = documentOverflowTarget(captured.object)
        return target === undefined ? undefined : { target, origin: write }
      }
      if (reference.init && definition.parent.kind === 'const' && assignments.length === 0)
        return capturedOverflow(captured, write, new Set([...seen, binding]))
      return undefined
    }

    function isCapturedFontScale(value, priority) {
      return (
        value?.type === 'MemberExpression' &&
        priority?.type === 'MemberExpression' &&
        getStaticPropertyName(value.property, value.computed) === 'value' &&
        getStaticPropertyName(priority.property, priority.computed) === 'priority' &&
        value.object.type === 'MemberExpression' &&
        priority.object.type === 'MemberExpression' &&
        sinks.name(value.object.property, value.object.computed) === 'fontScale' &&
        sinks.name(priority.object.property, priority.object.computed) === 'fontScale' &&
        sinks.typed(value.object.object, /^AppearanceDomCapture$/u) &&
        sinks.variable(value.object.object) === sinks.variable(priority.object.object)
      )
    }

    function staticTemplateClass(element) {
      const attribute = element?.startTag?.attributes?.find(
        (candidate) =>
          !candidate.directive && candidate.key?.name === 'class' && candidate.value !== null,
      )
      return attribute?.value?.value
    }

    function admittedTemplateStyle(node, attribute) {
      const property = singleStyleProperty(node.value?.expression)
      if (property === undefined) return false
      const name = getStaticPropertyName(property.key, property.computed)
      const value = resolveLocalExpression(property.value)
      if (attribute === 'style' && legacyErrorPages.has(filename)) {
        const element = node.parent?.parent
        const parent = element?.parent?.type === 'VElement' ? element.parent : undefined
        const panelClass =
          'mx-auto border rounded-panel shadow-panel bg-surface-panel border-border-default max-w-content'
        const role =
          name === 'padding' &&
          element?.rawName === 'section' &&
          staticTemplateClass(element) === panelClass &&
          parent?.rawName === 'main'
            ? 'spacing.page.inline'
            : name === 'marginBlockStart' &&
                element?.rawName === 'p' &&
                staticTemplateClass(element) === 'text-text-secondary' &&
                parent?.rawName === 'section' &&
                staticTemplateClass(parent) === panelClass
              ? 'spacing.content.gap'
              : undefined
        return (
          role !== undefined &&
          isApprovedTokenReference(name, value) &&
          getStaticPropertyName(value.property, value.computed) === role &&
          claimStyleSink(name)
        )
      }
      if (
        filename === 'packages/ui/src/components/UiAdminShell.vue' &&
        attribute === 'content-style'
      ) {
        const tag = node.parent.parent.rawName
        const expected =
          tag === 'PavpLayoutPrimitive'
            ? 'visible'
            : tag === 'PavpLayoutSiderPrimitive'
              ? 'hidden'
              : undefined
        return (
          name === 'overflow' &&
          expected !== undefined &&
          staticNodeValue(value) === expected &&
          claimStyleSink(tag)
        )
      }
      if (
        filename !== 'apps/web/src/pages/appearance.vue' ||
        attribute !== 'style' ||
        name !== '--pavp-appearance-swatch'
      )
        return false
      const swatch =
        value?.type === 'MemberExpression'
          ? getStaticPropertyName(value.property, value.computed)
          : undefined
      const element = node.parent?.parent
      const parent = element?.parent?.type === 'VElement' ? element.parent : undefined
      const projectionCall = value?.type === 'MemberExpression' ? value.object : undefined
      const previewCall =
        projectionCall?.type === 'CallExpression'
          ? resolveLocalExpression(projectionCall.arguments[0])
          : undefined
      const optionValue =
        previewCall?.type === 'CallExpression'
          ? resolveLocalExpression(previewCall.arguments[0])
          : undefined
      return (
        element?.rawName === 'span' &&
        staticTemplateClass(element) === 'pavp-appearance-theme-swatch' &&
        parent?.rawName === 'span' &&
        staticTemplateClass(parent) === 'pavp-appearance-theme-swatches' &&
        [
          'surfacePage',
          'surfacePanel',
          'actionPrimary',
          'controlPrimary',
          'borderDefault',
          'focusRing',
          'statusInfo',
          'statusSuccess',
          'statusWarning',
          'statusError',
        ].includes(swatch) &&
        projectionCall?.type === 'CallExpression' &&
        projectionCall.callee.type === 'Identifier' &&
        previewProjectionFunctions.has(sinks.variable(projectionCall.callee)) &&
        projectionCall.arguments.length === 1 &&
        previewCall?.type === 'CallExpression' &&
        previewCall.callee.type === 'Identifier' &&
        previewCall.callee.name === 'themePreviewForValue' &&
        previewCall.arguments.length === 1 &&
        optionValue?.type === 'MemberExpression' &&
        optionValue.object.type === 'Identifier' &&
        optionValue.object.name === 'option' &&
        getStaticPropertyName(optionValue.property, optionValue.computed) === 'value' &&
        claimStyleSink(swatch)
      )
    }

    function reportUnresolved(node) {
      context.report({ messageId: 'unresolvedAuthority', node })
    }

    function localConstInitializer(identifier) {
      return sinks.initializer(identifier)
    }

    function isApprovedTokenReference(propertyName, node) {
      if (
        node?.type !== 'MemberExpression' ||
        node.object.type !== 'Identifier' ||
        !sinks.imported(node.object, '@platform/design-system', ['tokens'])
      ) {
        return false
      }

      const tokenName = getStaticPropertyName(node.property, node.computed)
      return (
        tokenName !== undefined &&
        authorityMappingsForProperty(propertyName).some((mapping) => mapping.roleId === tokenName)
      )
    }

    function inspectStyleValue(propertyName, value, reportNode, depth, seenBindings) {
      if (sinks.untrusted(value)) {
        reportUnresolved(reportNode ?? value)
        return
      }
      if (depth > maximumStyleResolutionDepth) {
        reportUnresolved(reportNode)
        return
      }

      if (isApprovedTokenReference(propertyName, value)) {
        return
      }

      if (value?.type === 'Identifier') {
        const binding = sinks.variable(value)
        if (seenBindings.has(binding)) {
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
          new Set([...seenBindings, binding]),
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
      if (sinks.untrusted(expression)) {
        reportUnresolved(reportNode ?? expression)
        return
      }
      if (depth > maximumStyleResolutionDepth) {
        reportUnresolved(reportNode)
        return
      }

      if (expression?.type === 'Identifier') {
        const binding = sinks.variable(expression)
        if (seenBindings.has(binding)) {
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
            new Set([...seenBindings, binding]),
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

    function isStyleDeclaration(expression) {
      return sinks.style(expression)
    }

    function inspectScriptStyle(value, node) {
      const property = singleStyleProperty(value)
      if (
        filename === 'packages/ui/src/adapters/motion/AdminNavigationSelectionLens.vue' &&
        property !== undefined &&
        sinks.name(property.key, property.computed) === 'zIndex' &&
        staticNodeValue(resolveLocalExpression(property.value)) === 'calc(var(--ui-z-base) - 1)' &&
        claimStyleSink('selection-lens')
      )
        return
      reportStyleOwner(node)
      inspectStyleExpression(value, node)
    }

    function inspectProps(expression) {
      sinks.props(
        expression,
        (name, value, node) => {
          if (
            ['style', 'content-style', 'contentStyle', 'overlay-style', 'overlayStyle'].includes(
              name,
            )
          )
            inspectScriptStyle(value, node)
          if (name === 'innerHTML' || name === 'outerHTML') {
            if (sinks.styleMarkup(value)) reportStyleOwner(node)
            else if (sinks.markupIsUnresolved(value)) reportUnresolvedMarkup(node)
          }
        },
        reportUnresolved,
      )
    }

    function ownedMutation(target, name, value) {
      return (
        (name === 'adoptedStyleSheets' && sinks.documentObject(target)) ||
        (['textContent', 'innerHTML', 'innerText', 'outerHTML'].includes(name) &&
          sinks.styleElement(target)) ||
        (['innerHTML', 'outerHTML'].includes(name) &&
          (sinks.dom(target) || sinks.documentObject(target)) &&
          sinks.styleMarkup(value)) ||
        (['disabled', 'media'].includes(name) && sinks.sheet(target)) ||
        (name === 'mediaText' && sinks.sheetMedia(target)) ||
        sinks.cssRule(target) ||
        sinks.adoptedSheets(target)
      )
    }

    function mutationTarget(target) {
      return (
        sinks.dom(target) ||
        sinks.vnodeProps(target) ||
        sinks.documentObject(target) ||
        sinks.styleElement(target) ||
        sinks.sheet(target) ||
        sinks.sheetMedia(target) ||
        sinks.cssRule(target) ||
        sinks.adoptedSheets(target)
      )
    }

    function inspectMutation(target, name, value, node) {
      if (ownedMutation(target, name, value)) reportStyleOwner(node)
      else if (
        ['innerHTML', 'outerHTML'].includes(name) &&
        (sinks.dom(target) || sinks.documentObject(target)) &&
        sinks.markupIsUnresolved(value)
      )
        reportUnresolvedMarkup(node)
      if (
        ['style', 'content-style', 'contentStyle', 'overlay-style', 'overlayStyle'].includes(
          name,
        ) &&
        (sinks.dom(target) || sinks.vnodeProps(target))
      )
        inspectScriptStyle(value, node)
    }

    const scriptVisitor = {
      'FunctionDeclaration:exit'(node) {
        const parameters = new Set(
          node.params
            .filter(
              (parameter) =>
                parameter.type === 'Identifier' &&
                sinks.imported(
                  parameter.typeAnnotation?.typeAnnotation?.typeName,
                  '@platform/design-system',
                  ['AppearanceThemePreviewProjection'],
                ),
            )
            .map((parameter) => sinks.variable(parameter)),
        )
        const returns = node.body.body.filter((statement) => statement.type === 'ReturnStatement')
        if (
          node.id !== null &&
          sinks.imported(node.returnType?.typeAnnotation?.typeName, '@platform/design-system', [
            'AppearanceThemePreviewSwatches',
          ]) &&
          returns.length === 1 &&
          isPreviewPlaneReturn(returns[0].argument, parameters)
        ) {
          previewProjectionFunctions.add(sinks.variable(node.id))
        }
      },
      AssignmentExpression(node) {
        if (node.left.type !== 'MemberExpression') {
          return
        }

        const propertyNames = sinks.memberNames(node.left)
        if (propertyNames !== undefined && propertyNames.length > 1) {
          const ambiguousStyleSink =
            isStyleDeclaration(node.left.object) ||
            propertyNames.some(
              (name) =>
                ownedMutation(node.left.object, name, node.right) ||
                (['style', 'contentStyle', 'overlayStyle'].includes(name) &&
                  (sinks.dom(node.left.object) || sinks.vnodeProps(node.left.object))),
            )
          if (ambiguousStyleSink) reportUnresolved(node)
          return
        }
        const propertyName = propertyNames?.[0]
        if (
          propertyNames === undefined &&
          (sinks.dom(node.left.object) ||
            sinks.vnodeProps(node.left.object) ||
            sinks.documentObject(node.left.object) ||
            sinks.cssRule(node.left.object))
        ) {
          reportUnresolved(node)
          return
        }
        if (
          ['style', 'contentStyle', 'overlayStyle'].includes(propertyName) &&
          sinks.vnodeProps(node.left.object)
        ) {
          inspectScriptStyle(node.right, node)
          return
        }

        if (
          ['innerHTML', 'outerHTML'].includes(propertyName) &&
          (sinks.dom(node.left.object) || sinks.documentObject(node.left.object)) &&
          !sinks.styleMarkup(node.right) &&
          sinks.markupIsUnresolved(node.right)
        ) {
          reportUnresolvedMarkup(node)
          return
        }

        if (
          (propertyName === 'style' && sinks.dom(node.left.object)) ||
          ownedMutation(node.left.object, propertyName, node.right)
        ) {
          reportStyleOwner(node)
          return
        }
        if (propertyName === 'props' && sinks.typed(node.left.object, /^VNode$/u)) {
          inspectProps(node.right)
          return
        }

        if (!isStyleDeclaration(node.left.object)) {
          return
        }

        if (
          filename === 'packages/ui/src/components/UiAdminShell.vue' &&
          propertyName === 'overflow'
        ) {
          overflowWrites.push(node)
          return
        }
        if (propertyName?.startsWith('--ui-')) {
          context.report({ messageId: 'publicVariableWriter', node })
          return
        }
        reportStyleOwner(node)

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
        const call = sinks.invocation(node)
        if (call === undefined) return
        const renderName = sinks.renderName(call)
        if (renderName !== undefined) {
          if (call.unresolvedArguments) reportUnresolved(node)
          else if (renderName === 'createStaticVNode') reportUnresolved(node)
          else {
            const tags = sinks.attributeNames(call.arguments[0])
            if (
              renderName !== 'cloneVNode' &&
              tags === undefined &&
              !sinks.componentTag(call.arguments[0])
            )
              reportUnresolved(node)
            else if (tags?.some((tag) => sinks.asciiLower(tag) === 'style')) reportStyleOwner(node)
            if (!sinks.hChildren(call)) inspectProps(call.arguments[1])
          }
          return
        }
        const callee = call.callee
        if (callee.type !== 'MemberExpression') return
        const arguments_ = call.arguments
        const object = call.receiver
        const methods = sinks.memberNames(callee)
        const method = methods?.length === 1 ? methods[0] : undefined
        const namespace = sinks.namespace(callee.object)
        const styleElementMethods = [
          'append',
          'appendChild',
          'prepend',
          'replaceChildren',
          'insertAdjacentHTML',
          'insertAdjacentText',
          'insertBefore',
          'replaceChild',
        ]
        const styleDeclarationReaders = ['getPropertyValue', 'getPropertyPriority', 'item']
        const styleMapReaders = [
          'entries',
          'forEach',
          'get',
          'getAll',
          'has',
          'keys',
          'toString',
          'values',
        ]
        if (methods !== undefined && methods.length > 1) {
          const ambiguousStyleSink =
            (sinks.documentObject(object) &&
              methods.some((name) =>
                ['createElement', 'createElementNS', 'write', 'writeln'].includes(name),
              )) ||
            (sinks.dom(object) &&
              methods.some((name) =>
                ['animate', 'insertAdjacentHTML', 'setAttribute', 'setAttributeNS'].includes(name),
              )) ||
            (sinks.styleElement(object) &&
              methods.some((name) => styleElementMethods.includes(name))) ||
            (sinks.styleMap(object) && methods.some((name) => !styleMapReaders.includes(name))) ||
            sinks.sheet(object) ||
            sinks.sheetMedia(object) ||
            sinks.cssRule(object) ||
            sinks.adoptedSheets(object) ||
            isStyleDeclaration(object) ||
            (['Object', 'Reflect'].includes(namespace) &&
              methods.some((name) => ['assign', 'set'].includes(name)) &&
              (mutationTarget(arguments_[0]) || isStyleDeclaration(arguments_[0])))
          if (ambiguousStyleSink) reportUnresolved(node)
          return
        }
        if (
          call.unresolvedArguments &&
          ((sinks.documentObject(object) &&
            ['createElement', 'createElementNS', 'write', 'writeln'].includes(method)) ||
            (sinks.dom(object) &&
              ['animate', 'setAttribute', 'setAttributeNS', 'insertAdjacentHTML'].includes(
                method,
              )) ||
            (sinks.styleElement(object) && styleElementMethods.includes(method)) ||
            sinks.styleMap(object) ||
            sinks.sheet(object) ||
            sinks.sheetMedia(object) ||
            sinks.cssRule(object) ||
            sinks.adoptedSheets(object) ||
            isStyleDeclaration(object) ||
            (['Object', 'Reflect'].includes(namespace) &&
              (mutationTarget(arguments_[0]) || isStyleDeclaration(arguments_[0]))))
        ) {
          if (!(
            (isStyleDeclaration(object) && styleDeclarationReaders.includes(method)) ||
            (sinks.styleMap(object) && styleMapReaders.includes(method)) ||
            (sinks.sheetMedia(object) && ['item', 'toString'].includes(method))
          ))
            reportUnresolved(node)
          return
        }
        {
          if (
            methods === undefined &&
            (sinks.dom(object) ||
              sinks.documentObject(object) ||
              sinks.styleElement(object) ||
              sinks.styleMap(object) ||
              sinks.sheet(object) ||
              sinks.sheetMedia(object) ||
              sinks.cssRule(object) ||
              sinks.adoptedSheets(object) ||
              isStyleDeclaration(object))
          ) {
            reportUnresolved(node)
            return
          }
          if (sinks.styleMap(object)) {
            if (!styleMapReaders.includes(method)) reportStyleOwner(node)
            return
          }
          if (sinks.dom(object) && method === 'animate') {
            reportStyleOwner(node)
            return
          }
          if (sinks.global(callee.object, 'CSS') && method === 'registerProperty') {
            reportStyleOwner(node)
            return
          }
          if (sinks.documentObject(object) && ['write', 'writeln'].includes(method)) {
            for (const argument of arguments_) {
              if (sinks.styleMarkup(argument)) reportStyleOwner(node)
              else if (sinks.markupIsUnresolved(argument)) reportUnresolvedMarkup(node)
            }
            return
          }
          if (
            sinks.documentObject(object) &&
            ['createElement', 'createElementNS'].includes(method)
          ) {
            const names = sinks.attributeNames(arguments_[method === 'createElementNS' ? 1 : 0])
            if (names === undefined) reportUnresolved(node)
            else if (names.some((name) => sinks.htmlTagName(name, method, arguments_) === 'style'))
              reportStyleOwner(node)
            return
          }
          if (sinks.adoptedSheets(object)) {
            reportStyleOwner(node)
            return
          }
          if (
            (sinks.sheet(object) || sinks.sheetMedia(object)) &&
            !['item', 'toString'].includes(method) &&
            !['addEventListener', 'removeEventListener', 'dispatchEvent'].includes(method)
          ) {
            reportStyleOwner(node)
            return
          }
          if (
            sinks.cssRule(object) &&
            !['findRule', 'toString'].includes(method) &&
            !['addEventListener', 'removeEventListener', 'dispatchEvent'].includes(method)
          ) {
            reportStyleOwner(node)
            return
          }
          if (
            (sinks.dom(object) &&
              method === 'insertAdjacentHTML' &&
              sinks.styleMarkup(arguments_[1])) ||
            (sinks.styleElement(object) && styleElementMethods.includes(method))
          ) {
            reportStyleOwner(node)
            return
          }
          if (
            sinks.dom(object) &&
            method === 'insertAdjacentHTML' &&
            sinks.markupIsUnresolved(arguments_[1])
          ) {
            reportUnresolvedMarkup(node)
            return
          }
          if (method === 'assign' && namespace === 'Object' && isStyleDeclaration(arguments_[0])) {
            reportStyleOwner(node)
            return
          }
          if (method === 'assign' && namespace === 'Object') {
            const target = arguments_[0]
            if (mutationTarget(target)) {
              for (const source of arguments_.slice(1)) {
                sinks.props(
                  source,
                  (name, value, property) => inspectMutation(target, name, value, property),
                  reportUnresolved,
                )
              }
              return
            }
          }
          if (method === 'set' && namespace === 'Reflect') {
            const target = arguments_[0]
            if (isStyleDeclaration(target)) {
              reportStyleOwner(node)
              return
            }
            if (mutationTarget(target)) {
              const names = sinks.attributeNames(arguments_[1])
              for (const name of names ?? []) inspectMutation(target, name, arguments_[2], node)
              if (names === undefined) reportUnresolved(node)
              return
            }
          }
          if (['setAttribute', 'setAttributeNS'].includes(method) && sinks.dom(object)) {
            const offset = method === 'setAttributeNS' ? 1 : 0
            const names = sinks.attributeNames(arguments_[offset])
            if (names?.some((name) => sinks.htmlAttributeName(name, method, object) === 'style')) {
              reportStyleOwner(node)
              return
            }
            if (
              names === undefined &&
              (method === 'setAttributeNS' ||
                (!sinks.appearanceAttribute({ ...node, arguments: arguments_ }) &&
                  !sinks.mountAttributeRestore({
                    ...node,
                    callee: { ...callee, object },
                    arguments: arguments_,
                  })))
            )
              reportUnresolved(node)
          }
          if (
            isStyleDeclaration(object) &&
            ![
              'setProperty',
              'removeProperty',
              'getPropertyValue',
              'getPropertyPriority',
              'item',
            ].includes(method)
          ) {
            reportStyleOwner(node)
            return
          }
        }
        if (
          !['setProperty', 'removeProperty'].includes(
            sinks.name(callee.property, callee.computed),
          ) ||
          !isStyleDeclaration(object)
        ) {
          return
        }

        const [property, value, priority] = arguments_
        const propertyName = staticNodeValue(sinks.unwrap(property))

        if (
          filename === 'apps/web/src/app/appearance/appearance.store.ts' &&
          propertyName === '--ui-font-scale' &&
          (method === 'removeProperty' || isCapturedFontScale(value, priority)) &&
          claimStyleSink(`font-scale:${method}`)
        )
          return
        if (typeof propertyName === 'string' && propertyName.startsWith('--ui-')) {
          context.report({ messageId: 'publicVariableWriter', node })
          return
        }
        reportStyleOwner(node)

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
      NewExpression(node) {
        if (sinks.global(sinks.unwrap(node.callee), 'CSSStyleSheet')) reportStyleOwner(node)
      },
      VariableDeclarator(node) {
        if (sinks.typed(node.id, /^VNode$/u))
          sinks.props(
            node.init,
            (key, value) => {
              if (key === 'props') inspectProps(value)
            },
            reportUnresolved,
          )
      },
      'Program:exit'() {
        const lockCaptures = new Map()
        const restores = []
        for (const node of overflowWrites) {
          const target = documentOverflowTarget(node.left.object)
          const value = node.right
          const locks =
            value.type === 'ConditionalExpression' && staticNodeValue(value.consequent) === 'hidden'
          const capture = capturedOverflow(locks ? value.alternate : value, node)
          if (
            target === undefined ||
            capture?.target !== target ||
            !claimStyleSink(`overflow:${target}:${locks ? 'lock' : 'restore'}`)
          )
            reportStyleOwner(node)
          else if (locks) lockCaptures.set(target, capture.origin)
          else restores.push({ node, target, origin: capture.origin })
        }
        for (const restore of restores)
          if (
            lockCaptures.has(restore.target) &&
            lockCaptures.get(restore.target) !== restore.origin
          )
            reportStyleOwner(restore.node)
      },
    }
    const templateVisitor = {
      VAttribute(node) {
        if (
          !node.directive &&
          ['style', 'content-style', 'overlay-style'].includes(node.key.name)
        ) {
          reportStyleOwner(node)
          return
        }

        if (!node.directive || node.key.name.name !== 'bind') return
        if (sinks.vendorTemplate(node, inspectProps, reportUnresolved)) return
        const argument = node.key.argument
        if (argument == null) {
          if (!sinks.templateForward(node)) inspectProps(node.value?.expression)
          return
        }
        const names =
          argument.type === 'VIdentifier'
            ? [argument.name]
            : sinks.attributeNames(argument.expression)
        if (names === undefined) {
          reportUnresolved(node)
          return
        }
        if (
          names.some(
            (name) =>
              ['style', 'content-style', 'overlay-style'].includes(name) &&
              !admittedTemplateStyle(node, name),
          )
        )
          reportStyleOwner(node)
      },
    }

    return (
      context.sourceCode.parserServices.defineTemplateBodyVisitor?.(
        sinks.visitors(templateVisitor),
        sinks.visitors(scriptVisitor),
      ) ?? sinks.visitors(scriptVisitor)
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
