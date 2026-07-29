const workspacePackagePattern = /^@platform\/[^/]+\/.+/
const rawColorPattern =
  /(?:^|[^0-9A-Za-z])#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?:$|[^0-9A-Za-z])|(?:color|hsl|hsla|lab|lch|oklab|oklch|rgb|rgba)\s*\(/u
const opticalEffectPattern = /\b(?:backdrop-filter|filter)\s*:|(?:blur|brightness|saturate)\s*\(/u

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
        'Access browser storage only through the canonical preference persistence boundary.',
    },
    schema: [],
    type: 'problem',
  },
  create(context) {
    const filename = context.filename.replaceAll('\\', '/')
    const allowed =
      filename.includes('/apps/web/src/app/appearance/') ||
      filename.includes('/apps/web/src/app/shell/layout/') ||
      filename.includes('/packages/design-system/src/runtime/')

    if (allowed) {
      return {}
    }

    return {
      MemberExpression(node) {
        const directStorage =
          node.object.type === 'Identifier' &&
          (node.object.name === 'localStorage' || node.object.name === 'sessionStorage')
        const windowStorage =
          node.object.type === 'Identifier' &&
          node.object.name === 'window' &&
          node.property.type === 'Identifier' &&
          (node.property.name === 'localStorage' || node.property.name === 'sessionStorage')

        if (directStorage || windowStorage) {
          context.report({
            messageId: 'directStorage',
            node,
          })
        }
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
    'no-user-agent-layout-branching': noUserAgentLayoutBranching,
    'no-workspace-deep-import': noWorkspaceDeepImport,
  },
}
