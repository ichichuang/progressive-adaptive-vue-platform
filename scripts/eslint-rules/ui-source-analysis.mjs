import { dirname, relative, resolve } from 'node:path'
import vue from 'eslint-plugin-vue'
import ts from 'typescript'

// Consume the parser exposed by the already-declared linting dependency.
const markupParser = vue.configs['flat/base'].find((config) => config.languageOptions?.parser)
  .languageOptions.parser

export const maximumStyleResolutionDepth = 8
const sourceAnalyses = new WeakMap()
export function createStyleSinkResolver(context) {
  let analysis = sourceAnalyses.get(context.sourceCode)
  if (!analysis) {
    analysis = buildStyleSinkResolver(context)
    sourceAnalyses.set(context.sourceCode, analysis)
  }
  return analysis
}

export function getStaticPropertyName(property, computed) {
  if (!computed && property.type === 'Identifier') {
    return property.name
  }

  if (property.type === 'Literal' && typeof property.value === 'string') {
    return property.value
  }

  if (computed && property.type === 'TemplateLiteral' && property.expressions.length === 0) {
    return property.quasis[0]?.value.cooked ?? property.quasis[0]?.value.raw
  }

  return undefined
}

export function staticNodeValue(node) {
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

function buildStyleSinkResolver(context) {
  const filename = relative(process.cwd(), context.filename).replaceAll('\\', '/')
  const source = context.sourceCode
  const services = source.parserServices
  const checker = services.program?.getTypeChecker()
  const domLibraryFile =
    services.program === undefined || services.program === null
      ? undefined
      : resolve(
          dirname(ts.getDefaultLibFilePath(services.program.getCompilerOptions())),
          'lib.dom.d.ts',
        )
  const appearanceDomCaptureFile = resolve(
    process.cwd(),
    'apps/web/src/app/appearance/appearance.store.ts',
  )
  const moduleScope = source.scopeManager.scopes.find((scope) => scope.type === 'module')

  function variable(identifier) {
    if (identifier?.type !== 'Identifier') return undefined
    let ancestor = identifier
    while (ancestor != null && ancestor.type !== 'VExpressionContainer') ancestor = ancestor.parent
    if (ancestor != null) {
      // A v-for/slot binding must never fall through to a same-named script const.
      const reference = ancestor.references?.find((item) => item.id === identifier)
      if (reference?.variable != null) return undefined
      return moduleScope?.set.get(identifier.name)
    }
    let scope = source.getScope(identifier)
    while (scope !== null) {
      const binding = scope.set.get(identifier.name)
      if (binding !== undefined) return binding
      scope = scope.upper
    }
    return undefined
  }

  function imported(identifier, module, names) {
    const definition = variable(identifier)?.defs[0]
    return (
      definition?.type === 'ImportBinding' &&
      definition.parent.source.value === module &&
      definition.node.type === 'ImportSpecifier' &&
      names.includes(getStaticPropertyName(definition.node.imported, false))
    )
  }

  function global(identifier, name) {
    return (
      identifier?.type === 'Identifier' &&
      identifier.name === name &&
      (variable(identifier)?.defs.length ?? 0) === 0
    )
  }

  function bindingInitializer(identifier) {
    const binding = variable(identifier)
    const definition = binding?.defs[0]
    if (
      definition?.type !== 'Variable' ||
      definition.parent.kind !== 'const' ||
      definition.node.id.type !== 'Identifier' ||
      binding.references.some((reference) => reference.isWrite() && !reference.init)
    )
      return undefined
    return definition.node.init ?? undefined
  }

  let activeSink
  const trust = new WeakMap()
  const wrappers = new Set([
    'TSAsExpression',
    'TSSatisfiesExpression',
    'TSNonNullExpression',
    'ChainExpression',
  ])
  function bare(node) {
    while (node && wrappers.has(node.type)) node = node.expression
    return node
  }
  function executionOwner(node) {
    while (
      node &&
      ![
        'Program',
        'FunctionDeclaration',
        'FunctionExpression',
        'ArrowFunctionExpression',
        'VExpressionContainer',
      ].includes(node.type)
    )
      node = node.parent
    return node
  }
  // Only skip an operation proven later in the same straight-line statement list.
  // Captured bindings and uncertain loop/branch timing remain conservative.
  function definitelyLater(operation, sink) {
    if (!sink || executionOwner(operation) !== executionOwner(sink)) return false
    const statement = (node) => {
      while (node?.parent && !['Program', 'BlockStatement'].includes(node.parent.type)) {
        if (/^(?:For|While|DoWhile)/u.test(node.type)) return undefined
        node = node.parent
      }
      return node
    }
    const left = statement(sink),
      right = statement(operation)
    if (!left || !right || left.parent !== right.parent || left.range[0] >= right.range[0])
      return false
    let ancestor = left.parent
    while (ancestor && ancestor !== executionOwner(sink)) {
      if (/^(?:For|While|DoWhile)/u.test(ancestor.type)) return false
      ancestor = ancestor.parent
    }
    return true
  }
  function container(node, seen = new Set()) {
    node = bare(node)
    if (!node || seen.has(node)) return false
    seen = new Set([...seen, node])
    if (['ObjectExpression', 'ArrayExpression'].includes(node.type)) return true
    if (node.type === 'Identifier') return container(bindingInitializer(node), seen)
    if (node.type === 'MemberExpression') return container(node.object, seen)
    if (node.type === 'NewExpression')
      return ['Map', 'Set', 'WeakMap', 'WeakSet'].some((kind) => global(node.callee, kind))
    if (node.type === 'CallExpression')
      return (
        imported(node.callee, 'vue', ['ref', 'shallowRef', 'computed']) ||
        (node.callee.type === 'MemberExpression' &&
          global(node.callee.object, 'Object') &&
          name(node.callee.property, node.callee.computed) === 'freeze')
      )
    return false
  }
  function safeRead(call, reference) {
    const callee = bare(call.callee)
    if (call.type === 'NewExpression' && global(callee, 'Set')) {
      const initial = bare(
        reference?.type === 'Identifier' ? bindingInitializer(reference) : reference,
      )
      return (
        initial?.type === 'ArrayExpression' &&
        initial.elements.every((element) => typeof staticNodeValue(bare(element)) === 'string')
      )
    }
    if (
      imported(callee, 'vue', [
        'h',
        'createVNode',
        'createElementVNode',
        'createBlock',
        'createElementBlock',
        'cloneVNode',
      ])
    )
      return true
    if (callee?.type !== 'MemberExpression') return false
    const method = getStaticPropertyName(callee.property, callee.computed)
    const definition = variable(callee.object)?.defs[0]
    if (
      definition?.type === 'ImportBinding' &&
      definition.node.type === 'ImportNamespaceSpecifier' &&
      definition.parent.source.value === 'vue' &&
      [
        'h',
        'createVNode',
        'createElementVNode',
        'createBlock',
        'createElementBlock',
        'cloneVNode',
      ].includes(method)
    )
      return true
    if (callee.object === reference)
      return [
        'includes',
        'indexOf',
        'lastIndexOf',
        'has',
        'get',
        'join',
        'toString',
        'at',
      ].includes(method)
    if (global(callee.object, 'Object'))
      return ['keys', 'values', 'entries', 'freeze'].includes(method)
    return false
  }
  // A projection allocates its outer array/tuple but keeps references to nested
  // objects. Track that distinction only while following this container's uses.
  function referenceShape(expression, seen = new Set()) {
    const node = bare(expression)
    const unknown = () => ({ shared: true, unknown: true })
    if (!node || seen.has(node) || seen.size > maximumStyleResolutionDepth) return unknown()
    const next = new Set([...seen, node])
    if (['Literal', 'TemplateLiteral', 'UnaryExpression', 'BinaryExpression'].includes(node.type))
      return undefined
    if (node.type === 'Identifier') return referenceShape(bindingInitializer(node), next)
    if (node.type === 'ObjectExpression') {
      const properties = new Map()
      for (const property of node.properties) {
        if (property.type !== 'Property' || property.kind !== 'init') return unknown()
        const key = getStaticPropertyName(property.key, property.computed)
        if (key === undefined) return unknown()
        properties.set(key, referenceShape(property.value, next))
      }
      return { shared: true, properties }
    }
    if (node.type === 'ArrayExpression')
      return {
        shared: true,
        array: true,
        length: node.elements.length,
        properties: new Map(
          node.elements.map((element, index) => [
            String(index),
            element === null ? undefined : referenceShape(element, next),
          ]),
        ),
      }
    if (node.type === 'MemberExpression')
      return selectedReference(
        referenceShape(node.object, next),
        getStaticPropertyName(node.property, node.computed) ?? staticNodeValue(bare(node.property)),
      )
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'MemberExpression' &&
      global(node.callee.object, 'Object') &&
      getStaticPropertyName(node.callee.property, node.callee.computed) === 'freeze'
    )
      return referenceShape(node.arguments[0], next)
    return unknown()
  }
  function hasSharedReference(shape) {
    return (
      shape !== undefined &&
      (shape.shared || [...(shape.properties?.values() ?? [])].some(hasSharedReference))
    )
  }
  function selectedReference(shape, key) {
    if (!shape) return undefined
    if (shape.unknown) return { shared: true, unknown: true }
    if (key !== undefined) return shape.properties?.get(String(key))
    return [...(shape.properties?.values() ?? [])].some(hasSharedReference)
      ? { shared: true, unknown: true }
      : undefined
  }
  function projectedReferences(shape, entries) {
    if (shape?.unknown) return { shared: false, properties: new Map([['0', shape]]), unknown: true }
    const properties = shape?.properties ?? new Map()
    const keys = Object.keys(Object.fromEntries(properties))
    return {
      shared: false,
      array: true,
      length: shape?.properties?.size,
      properties: new Map(
        keys.map((key, index) => [
          String(index),
          entries
            ? {
                shared: false,
                array: true,
                length: 2,
                properties: new Map([
                  ['0', undefined],
                  ['1', properties.get(key)],
                ]),
              }
            : properties.get(key),
        ]),
      ),
    }
  }
  function patternUnsafe(pattern, shape, sink, seen) {
    if (!hasSharedReference(shape)) return false
    if (pattern.type === 'Identifier') return bindingUnsafe(variable(pattern), sink, seen, shape)
    if (pattern.type === 'ObjectPattern')
      return pattern.properties.some((property) =>
        property.type === 'Property'
          ? patternUnsafe(
              property.value,
              selectedReference(shape, getStaticPropertyName(property.key, property.computed)),
              sink,
              seen,
            )
          : patternUnsafe(property.argument, { ...shape, shared: false }, sink, seen),
      )
    if (pattern.type === 'ArrayPattern')
      return pattern.elements.some(
        (element, index) =>
          element !== null &&
          (element.type === 'RestElement'
            ? patternUnsafe(
                element.argument,
                {
                  ...shape,
                  shared: false,
                  length:
                    shape.length === undefined ? undefined : Math.max(0, shape.length - index),
                  properties: new Map(
                    [...(shape.properties ?? [])]
                      .filter(([key]) => Number(key) >= index)
                      .map(([key, value]) => [String(Number(key) - index), value]),
                  ),
                },
                sink,
                seen,
              )
            : patternUnsafe(element, selectedReference(shape, index), sink, seen)),
      )
    return true
  }
  function returnedReferenceUnsafe(fn, shape, sink, seen) {
    if (!fn || fn.async || fn.generator || seen.has(fn)) return true
    const next = new Set([...seen, fn])
    const parent = fn.parent
    if (
      parent?.type === 'CallExpression' &&
      parent.arguments[0] === fn &&
      imported(parent.callee, 'vue', ['computed'])
    )
      return referenceUseUnsafe(
        parent,
        { shared: false, properties: new Map([['value', shape]]) },
        sink,
        next,
      )
    if (parent?.type === 'CallExpression' && parent.callee === fn)
      return referenceUseUnsafe(parent, shape, sink, next)
    const binding =
      fn.type === 'FunctionDeclaration'
        ? variable(fn.id)
        : parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier'
          ? variable(parent.id)
          : undefined
    const follow = (binding, visited) => {
      if (!binding || visited.has(binding)) return true
      const nextBindings = new Set([...visited, binding])
      for (const reference of binding.references) {
        if (reference.init || definitelyLater(reference.identifier, sink)) continue
        if (reference.isWrite()) return true
        let node = reference.identifier
        while (wrappers.has(node.parent?.type)) node = node.parent
        const use = node.parent
        if (use?.type === 'CallExpression' && use.callee === node) {
          if (referenceUseUnsafe(use, shape, sink, next)) return true
        } else if (use?.type === 'VariableDeclarator' && use.init === node) {
          if (use.id.type !== 'Identifier' || follow(variable(use.id), nextBindings)) return true
        } else return true
      }
      return binding.defs.some(
        (definition) => definition.node.parent?.type === 'ExportNamedDeclaration',
      )
    }
    return follow(binding, new Set())
  }
  function referenceUseUnsafe(node, shape, sink, seen) {
    if (!hasSharedReference(shape) || definitelyLater(node, sink)) return false
    if (seen.size > 64) return true
    const parent = node.parent
    if (!parent) return true
    if (wrappers.has(parent.type)) return referenceUseUnsafe(parent, shape, sink, seen)
    if (parent.type === 'MemberExpression' && parent.object === node) {
      const use = parent.parent
      if (
        (use?.type === 'AssignmentExpression' && use.left === parent) ||
        use?.type === 'UpdateExpression' ||
        (use?.type === 'UnaryExpression' && use.operator === 'delete')
      )
        return shape.shared
      if (use?.type === 'CallExpression' && use.callee === parent) {
        const method = getStaticPropertyName(parent.property, parent.computed)
        if (method === 'at') {
          if (!shape.array) return true
          const argument = use.arguments.length === 0 ? 0 : staticNodeValue(bare(use.arguments[0]))
          const index =
            typeof argument === 'number' || typeof argument === 'string'
              ? Math.trunc(Number(argument)) || 0
              : undefined
          const key = typeof index === 'number' && index < 0 ? shape.length + index : index
          return referenceUseUnsafe(use, selectedReference(shape, key), sink, seen)
        }
        if (safeRead(use, node)) return false
        return true
      }
      const key =
        getStaticPropertyName(parent.property, parent.computed) ??
        staticNodeValue(bare(parent.property))
      return referenceUseUnsafe(parent, selectedReference(shape, key), sink, seen)
    }
    if (parent.type === 'VariableDeclarator' && parent.init === node)
      return patternUnsafe(parent.id, shape, sink, seen)
    if (
      parent.type === 'Property' &&
      parent.value === node &&
      parent.parent.type === 'ObjectExpression'
    ) {
      const key = getStaticPropertyName(parent.key, parent.computed)
      if (key === undefined) return true
      const properties = new Map()
      let unknown = false
      for (const property of parent.parent.properties) {
        if (property.type === 'SpreadElement') {
          unknown = true
          continue
        }
        const name = getStaticPropertyName(property.key, property.computed)
        if (name === undefined) return true
        properties.set(name, property === parent ? shape : undefined)
      }
      return referenceUseUnsafe(parent.parent, { shared: false, properties, unknown }, sink, seen)
    }
    if (parent.type === 'ArrayExpression')
      return referenceUseUnsafe(
        parent,
        {
          shared: false,
          array: true,
          length: parent.elements.length,
          properties: new Map(
            parent.elements.map((element, index) => [
              String(index),
              element === node ? shape : undefined,
            ]),
          ),
        },
        sink,
        seen,
      )
    if (parent.type === 'SpreadElement')
      return referenceUseUnsafe(parent, { ...shape, shared: false }, sink, seen)
    if (parent.type === 'ObjectExpression' && node.type === 'SpreadElement')
      return referenceUseUnsafe(parent, shape, sink, seen)
    if (
      parent.type === 'ReturnStatement' ||
      (parent.type === 'ArrowFunctionExpression' && parent.body === node)
    )
      return returnedReferenceUnsafe(executionOwner(parent), shape, sink, seen)
    if (
      ['CallExpression', 'NewExpression'].includes(parent.type) &&
      parent.arguments.includes(node)
    ) {
      const callee = bare(parent.callee)
      if (callee.type === 'MemberExpression' && global(callee.object, 'Object')) {
        const method = getStaticPropertyName(callee.property, callee.computed)
        if (['values', 'entries'].includes(method) && parent.arguments[0] === node) {
          if (shape.unknown) return true
          return referenceUseUnsafe(
            parent,
            projectedReferences(shape, method === 'entries'),
            sink,
            seen,
          )
        }
        if (method === 'freeze' && parent.arguments[0] === node)
          return referenceUseUnsafe(parent, shape, sink, seen)
      }
      return parent !== sink && !safeRead(parent, node)
    }
    if (parent.type === 'AssignmentExpression' || parent.type === 'UpdateExpression') return true
    if (parent.type === 'UnaryExpression' && parent.operator === 'delete') return true
    if (parent.type === 'ConditionalExpression' && parent.test !== node)
      return referenceUseUnsafe(parent, shape, sink, seen)
    if (parent.type === 'LogicalExpression') return referenceUseUnsafe(parent, shape, sink, seen)
    return false
  }
  function bindingUnsafe(binding, sink, seen, shape) {
    if (!binding || seen.has(binding)) return false
    const next = new Set([...seen, binding])
    const references = shape ?? referenceShape(binding.defs[0]?.node.init)
    return binding.references.some(
      (reference) =>
        !reference.init &&
        !definitelyLater(reference.identifier, sink) &&
        (reference.isWrite() || referenceUseUnsafe(reference.identifier, references, sink, next)),
    )
  }
  function untrusted(expression, seen = new Set()) {
    const node = bare(expression)
    if (!node || seen.has(node)) return false
    const next = new Set([...seen, node])
    if (node.type === 'Identifier' && container(node)) {
      const binding = variable(node)
      const sink = activeSink ?? expression
      let results = trust.get(sink)
      if (!results) {
        results = new Map()
        trust.set(sink, results)
      }
      if (results.has(binding)) return results.get(binding)
      const result =
        bindingUnsafe(binding, sink, new Set()) || untrusted(bindingInitializer(node), next)
      results.set(binding, result)
      return result
    }
    if (node.type === 'MemberExpression') return untrusted(node.object, next)
    if (node.type === 'ObjectExpression')
      return node.properties.some((property) =>
        untrusted(property.type === 'SpreadElement' ? property.argument : property.value, next),
      )
    if (node.type === 'ArrayExpression')
      return node.elements.some((element) => untrusted(element, next))
    if (node.type === 'SpreadElement') return untrusted(node.argument, next)
    if (node.type === 'CallExpression' && container(node))
      return node.arguments.some((argument) => untrusted(argument, next))
    return false
  }
  function initializer(identifier) {
    return untrusted(identifier) ? undefined : bindingInitializer(identifier)
  }
  function visitors(visitor) {
    return Object.fromEntries(
      Object.entries(visitor).map(([event, callback]) => [
        event,
        function (node, ...args) {
          const previous = activeSink
          activeSink = node
          try {
            return callback(node, ...args)
          } finally {
            activeSink = previous
          }
        },
      ]),
    )
  }
  function asciiLower(value) {
    return value.replace(/[A-Z]/gu, (letter) => letter.toLowerCase())
  }
  function htmlTagName(value, method, args) {
    const namespace = staticNodeValue(unwrap(args[0]))
    return method !== 'createElementNS' ||
      typeof namespace !== 'string' ||
      namespace === 'http://www.w3.org/1999/xhtml'
      ? asciiLower(value)
      : value
  }
  function htmlAttributeName(value, method, receiver) {
    if (method === 'setAttributeNS') return value
    const resolved = unwrap(receiver)
    const call = resolved?.type === 'CallExpression' ? invocation(resolved) : undefined
    if (
      call?.callee.type === 'MemberExpression' &&
      name(call.callee.property, call.callee.computed) === 'createElementNS' &&
      typeof staticNodeValue(unwrap(call.arguments[0])) === 'string' &&
      staticNodeValue(unwrap(call.arguments[0])) !== 'http://www.w3.org/1999/xhtml'
    )
      return value
    if (typed(receiver, /^(?:SVGElement|SVG\w+Element)$/u)) return value
    return asciiLower(value)
  }
  function componentTag(expression) {
    const node = bare(expression)
    if (
      node?.type === 'ObjectExpression' ||
      ['ArrowFunctionExpression', 'FunctionExpression'].includes(node?.type)
    )
      return true
    if (
      node?.type === 'MemberExpression' &&
      imported(node.object, 'motion-v', ['m']) &&
      name(node.property, node.computed) === 'div'
    )
      return true
    const definition = variable(node)?.defs[0]
    if (
      definition?.type === 'FunctionName' ||
      (definition?.type === 'ImportBinding' && definition.parent.source.value.endsWith('.vue')) ||
      imported(node, 'vue', [
        'Fragment',
        'Teleport',
        'Suspense',
        'Transition',
        'TransitionGroup',
        'KeepAlive',
      ])
    )
      return true
    const tsNode = services.esTreeNodeToTSNodeMap?.get(node)
    if (!checker || !tsNode) return false
    const component = (type) =>
      type.isUnion?.()
        ? type.types.every(component)
        : (type.flags & (ts.TypeFlags.Object | ts.TypeFlags.ESSymbolLike)) !== 0
    return component(checker.getTypeAtLocation(tsNode))
  }

  // Prove the exact identity contract over every admitted string and the remaining
  // string domain. Only finite comparisons/membership can distinguish that domain;
  // unresolved predicates or output construction cannot authorize the resolver.
  function finiteReturns(fn, allowed) {
    const unresolved = Symbol('unresolved')
    const otherInput = Symbol('other string')
    const inputs = new Set(allowed)
    const inspected = new Set()
    const collectComparedStrings = (node) => {
      if (!node || inspected.has(node)) return
      inspected.add(node)
      if (inspected.size > 2048) return
      const literal = staticNodeValue(node)
      if (typeof literal === 'string') inputs.add(literal)
      if (node.type === 'ObjectExpression')
        Object.getOwnPropertyNames(Object.prototype).forEach((key) => inputs.add(key))
      if (node.type === 'Property') {
        const key = getStaticPropertyName(node.key, node.computed)
        if (key !== undefined) inputs.add(key)
      }
      if (node.type === 'Identifier') collectComparedStrings(bindingInitializer(node))
      for (const key of source.visitorKeys[node.type] ?? []) {
        const children = node[key]
        if (Array.isArray(children)) children.forEach(collectComparedStrings)
        else collectComparedStrings(children)
      }
    }
    collectComparedStrings(fn)
    if (inspected.size > 2048) return false
    let steps = 0
    const value = (expression, environment, seen = new Set()) => {
      const node = bare(expression)
      if (!node || seen.has(node) || seen.size > maximumStyleResolutionDepth) return unresolved
      const next = new Set([...seen, node])
      const read = (child) => value(child, environment, next)
      if (node.type === 'Literal') return node.value
      if (node.type === 'TemplateLiteral' && node.expressions.length === 0)
        return staticNodeValue(node)
      if (node.type === 'Identifier') {
        if (global(node, 'undefined')) return undefined
        const binding = variable(node)
        return environment.has(binding) ? environment.get(binding) : read(initializer(node))
      }
      if (node.type === 'ArrayExpression') {
        const items = []
        for (const element of node.elements) {
          const result = element?.type === 'SpreadElement' ? read(element.argument) : read(element)
          if (result === unresolved) return unresolved
          if (element?.type === 'SpreadElement') {
            if (!Array.isArray(result)) return unresolved
            items.push(...result)
          } else items.push(result)
        }
        return items
      }
      if (node.type === 'ObjectExpression') {
        const entries = new Map()
        for (const property of node.properties) {
          if (property.type !== 'Property' || property.kind !== 'init' || property.method)
            return unresolved
          const key = getStaticPropertyName(property.key, property.computed)
          const result = read(property.value)
          if (
            key === undefined ||
            result === unresolved ||
            (key === '__proto__' && !property.computed)
          )
            return unresolved
          entries.set(key, result)
        }
        return entries
      }
      if (
        node.type === 'NewExpression' &&
        global(node.callee, 'Set') &&
        node.arguments.length === 1
      ) {
        const items = read(node.arguments[0])
        return Array.isArray(items) ? new Set(items) : unresolved
      }
      if (node.type === 'MemberExpression') {
        const object = read(node.object)
        const key = node.computed
          ? read(node.property)
          : getStaticPropertyName(node.property, false)
        if (object instanceof Map && key !== unresolved)
          return object.has(key)
            ? object.get(key)
            : typeof key === 'string' && key in Object.prototype
              ? unresolved
              : undefined
        if (Array.isArray(object) && typeof key === 'number' && Number.isInteger(key))
          return object[key]
        return unresolved
      }
      if (node.type === 'UnaryExpression') {
        const argument = read(node.argument)
        if (argument === unresolved) return unresolved
        if (node.operator === '!') return !argument
        if (node.operator === 'typeof') return argument === otherInput ? 'string' : typeof argument
        return unresolved
      }
      if (node.type === 'BinaryExpression') {
        const left = read(node.left),
          right = read(node.right)
        if (left === unresolved || right === unresolved) return unresolved
        if (node.operator === '===') return left === right
        if (node.operator === '!==') return left !== right
        if (node.operator === 'in' && right instanceof Map)
          return right.has(left) || (typeof left === 'string' && left in Object.prototype)
        return unresolved
      }
      if (node.type === 'LogicalExpression') {
        const left = read(node.left)
        if (left === unresolved) return unresolved
        if (node.operator === '&&') return left ? read(node.right) : left
        if (node.operator === '||') return left ? left : read(node.right)
        if (node.operator === '??') return left == null ? read(node.right) : left
        return unresolved
      }
      if (node.type === 'ConditionalExpression') {
        const condition = read(node.test)
        return condition === unresolved
          ? unresolved
          : read(condition ? node.consequent : node.alternate)
      }
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression' &&
        !node.callee.computed &&
        node.arguments.length === 1
      ) {
        const collection = read(node.callee.object),
          item = read(node.arguments[0])
        if (collection === unresolved || item === unresolved) return unresolved
        const method = getStaticPropertyName(node.callee.property, false)
        if (method === 'includes' && Array.isArray(collection)) return collection.includes(item)
        if (method === 'has' && collection instanceof Set) return collection.has(item)
      }
      return unresolved
    }
    const safeThrownValue = (expression, environment) => {
      const node = bare(expression)
      if (!node) return false
      if (
        node.type === 'NewExpression' &&
        ['Error', 'TypeError', 'RangeError'].some((kind) => global(node.callee, kind))
      )
        return node.arguments.every((argument) => safeThrownValue(argument, environment))
      if (node.type === 'TemplateLiteral')
        return node.expressions.every((argument) => value(argument, environment) !== unresolved)
      return value(node, environment) !== unresolved
    }
    const sequence = (statements, environment) => {
      for (const statement of statements) {
        if (++steps > 4096) return { kind: 'invalid' }
        const read = (expression) => value(expression, environment)
        if (statement.type === 'EmptyStatement') continue
        if (statement.type === 'ReturnStatement')
          return { kind: 'return', value: read(statement.argument) }
        if (statement.type === 'ThrowStatement')
          return { kind: safeThrownValue(statement.argument, environment) ? 'throw' : 'invalid' }
        if (statement.type === 'BreakStatement')
          return { kind: statement.label === null ? 'break' : 'invalid' }
        if (statement.type === 'VariableDeclaration' && statement.kind === 'const') {
          for (const declaration of statement.declarations) {
            const result = read(declaration.init)
            if (declaration.id.type !== 'Identifier' || result === unresolved)
              return { kind: 'invalid' }
            const binding = variable(declaration.id)
            if (binding.references.some((reference) => reference.isWrite() && !reference.init))
              return { kind: 'invalid' }
            environment.set(binding, result)
          }
          continue
        }
        if (statement.type === 'BlockStatement') {
          const result = sequence(statement.body, new Map(environment))
          if (result.kind !== 'continue') return result
          continue
        }
        if (statement.type === 'IfStatement') {
          const condition = read(statement.test)
          if (condition === unresolved) return { kind: 'invalid' }
          const branch = condition ? statement.consequent : statement.alternate
          if (branch) {
            const result = sequence([branch], environment)
            if (result.kind !== 'continue') return result
          }
          continue
        }
        if (statement.type === 'SwitchStatement') {
          const input = read(statement.discriminant)
          if (input === unresolved) return { kind: 'invalid' }
          let selected = -1,
            defaultIndex = -1
          for (const [index, branch] of statement.cases.entries()) {
            if (branch.test === null) defaultIndex = index
            else {
              const candidate = read(branch.test)
              if (candidate === unresolved) return { kind: 'invalid' }
              if (selected < 0 && candidate === input) selected = index
            }
          }
          if (selected < 0) selected = defaultIndex
          if (selected >= 0) {
            const result = sequence(
              statement.cases.slice(selected).flatMap((branch) => branch.consequent),
              new Map(environment),
            )
            if (!['continue', 'break'].includes(result.kind)) return result
          }
          continue
        }
        return { kind: 'invalid' }
      }
      return { kind: 'continue' }
    }
    for (const input of [...inputs, otherInput]) {
      const environment = new Map([[variable(fn.params[0]), input]])
      const result =
        fn.body.type === 'BlockStatement'
          ? sequence(fn.body.body, environment)
          : { kind: 'return', value: value(fn.body, environment) }
      if (
        !allowed.has(input)
          ? result.kind !== 'throw'
          : result.kind !== 'return' || result.value !== input
      )
        return false
    }
    return true
  }

  function unwrap(expression, seen = new Set()) {
    if (expression === undefined || seen.has(expression) || seen.size > maximumStyleResolutionDepth)
      return expression
    const next = new Set([...seen, expression])
    if (
      [
        'TSAsExpression',
        'TSSatisfiesExpression',
        'TSNonNullExpression',
        'ChainExpression',
      ].includes(expression.type)
    )
      return unwrap(expression.expression, next)
    if (expression.type === 'Identifier') {
      const initial = initializer(expression)
      if (initial !== undefined) return unwrap(initial, next)
    }
    if (expression.type === 'CallExpression') {
      const callee = expression.callee
      if (
        callee.type === 'MemberExpression' &&
        global(callee.object, 'Object') &&
        getStaticPropertyName(callee.property, callee.computed) === 'freeze'
      )
        return unwrap(expression.arguments[0], next)
      if (imported(callee, 'vue', ['computed', 'ref', 'shallowRef'])) {
        const argument = expression.arguments[0]
        if (argument?.type === 'ArrowFunctionExpression' && argument.body.type !== 'BlockStatement')
          return unwrap(argument.body, next)
        if (argument?.type !== 'ArrowFunctionExpression') return unwrap(argument, next)
      }
    }
    return expression
  }

  function name(node, computed) {
    return (
      getStaticPropertyName(node, computed) ??
      (computed && typeof staticNodeValue(unwrap(node)) === 'string'
        ? staticNodeValue(unwrap(node))
        : undefined)
    )
  }

  function typed(expression, pattern, resolvedType) {
    if (
      expression === undefined ||
      checker === undefined ||
      services.esTreeNodeToTSNodeMap === undefined
    )
      return false
    const tsNode =
      services.esTreeNodeToTSNodeMap.get(expression) ??
      services.esTreeNodeToTSNodeMap.get(variable(expression)?.defs[0]?.name)
    if (tsNode === undefined) return false

    const hasAuthorizedDeclaration = (symbol, name) => {
      if (symbol === undefined || !pattern.test(name)) return false
      return (symbol.declarations ?? []).some((declaration) => {
        const declarationFile = resolve(declaration.getSourceFile().fileName)
        if (
          /^(?:Document|ShadowRoot|Element|HTMLElement|SVGElement|HTML\w+Element|SVG\w+Element|SVGAnimatedString|CSSStyleDeclaration|StylePropertyMap(?:ReadOnly)?|DOMTokenList|HTMLStyleElement|CSSStyleSheet|StyleSheet|MediaList|CSSRule|CSS\w+Rule)$/u.test(
            name,
          )
        )
          return declarationFile === domLibraryFile
        if (name === 'VNode')
          return declarationFile.replaceAll('\\', '/').includes('/node_modules/@vue/runtime-core/')
        if (name === 'AppearanceDomCapture') return declarationFile === appearanceDomCaptureFile
        return false
      })
    }
    const matches = (type, seen = new Set()) => {
      if (seen.has(type)) return false
      const next = new Set([...seen, type])
      if (type.isUnion?.()) {
        return type.types
          .filter((part) => !['null', 'undefined'].includes(checker.typeToString(part)))
          .some((part) => matches(part, next))
      }
      if (
        hasAuthorizedDeclaration(type.aliasSymbol, type.aliasSymbol?.name ?? '') ||
        hasAuthorizedDeclaration(type.symbol, type.symbol?.name ?? '')
      )
        return true
      return (type.getBaseTypes?.() ?? []).some((base) => matches(base, next))
    }
    return matches(resolvedType ?? checker.getTypeAtLocation(tsNode))
  }

  function documentObject(expression) {
    return global(expression, 'document') || typed(expression, /^(?:Document|ShadowRoot)$/u)
  }

  function dom(expression, seen = new Set()) {
    if (expression === undefined || seen.has(expression)) return false
    if (typed(expression, /^(?:Element|HTMLElement|SVGElement|HTML\w+Element|SVG\w+Element)$/u))
      return true
    const resolved = unwrap(expression)
    if (resolved !== expression) return dom(resolved, new Set([...seen, expression]))
    if (expression.type === 'MemberExpression' && documentObject(expression.object))
      return ['body', 'documentElement', 'head'].includes(
        name(expression.property, expression.computed),
      )
    if (expression.type !== 'CallExpression') return false
    const call = invocation(expression)
    if (call?.callee.type !== 'MemberExpression') return false
    return (
      ['createElement', 'createElementNS', 'getElementById', 'querySelector'].includes(
        name(call.callee.property, call.callee.computed),
      ) &&
      (documentObject(call.receiver) || dom(call.receiver, new Set([...seen, expression])))
    )
  }

  function style(expression) {
    if (typed(expression, /^CSSStyleDeclaration$/u)) return true
    const resolved = unwrap(expression)
    return (
      resolved?.type === 'MemberExpression' &&
      name(resolved.property, resolved.computed) === 'style' &&
      dom(resolved.object)
    )
  }

  function styleMap(expression) {
    return typed(expression, /^StylePropertyMap$/u)
  }

  function classList(expression) {
    if (typed(expression, /^DOMTokenList$/u)) return true
    const resolved = unwrap(expression)
    return (
      resolved?.type === 'MemberExpression' &&
      name(resolved.property, resolved.computed) === 'classList' &&
      dom(resolved.object)
    )
  }

  function svgClassName(expression) {
    const resolved = unwrap(expression)
    return (
      resolved?.type === 'MemberExpression' &&
      name(resolved.property, resolved.computed) === 'className' &&
      typed(resolved.object, /^(?:SVGElement|SVG\w+Element)$/u)
    )
  }

  function namespace(expression) {
    const resolved = unwrap(expression)
    if (global(resolved, 'Object')) return 'Object'
    if (global(resolved, 'Reflect')) return 'Reflect'
    const definition = variable(resolved)?.defs[0]
    if (definition?.type !== 'ImportBinding' || definition.node.type !== 'ImportNamespaceSpecifier')
      return undefined
    const module = definition.parent.source.value
    return module === 'vue' ? module : undefined
  }

  function callable(expression) {
    const resolved = unwrap(expression)
    if (
      resolved?.type === 'SequenceExpression' &&
      resolved.expressions.length > 1 &&
      resolved.expressions.slice(0, -1).every((item) => item.type === 'Literal' && item.value === 0)
    )
      return callable(resolved.expressions.at(-1))
    const binding = variable(resolved)
    const definition = binding?.defs[0]
    if (
      definition?.type === 'Variable' &&
      definition.parent.kind === 'const' &&
      definition.node.id.type === 'ObjectPattern' &&
      definition.node.init !== null &&
      !binding.references.some((reference) => reference.isWrite() && !reference.init)
    ) {
      const property = definition.node.id.properties.find(
        (item) => item.type === 'Property' && item.value === definition.name,
      )
      if (property !== undefined && name(property.key, property.computed) !== undefined)
        return {
          type: 'MemberExpression',
          object: definition.node.init,
          property: property.key,
          computed: property.computed,
        }
    }
    return resolved
  }

  function argumentList(arguments_, depth = 0) {
    const values = []
    for (const argument of arguments_) {
      if (argument?.type !== 'SpreadElement') values.push(argument)
      else {
        const array = unwrap(argument.argument)
        if (array?.type !== 'ArrayExpression' || depth > maximumStyleResolutionDepth)
          return { values, unresolved: true }
        const spread = argumentList(array.elements, depth + 1)
        values.push(...spread.values)
        if (spread.unresolved) return { values, unresolved: true }
      }
    }
    return { values, unresolved: false }
  }

  function appliedArguments(expression) {
    const array = unwrap(expression)
    return array?.type === 'ArrayExpression'
      ? argumentList(array.elements)
      : { values: [], unresolved: true }
  }

  // Resolve only standard invocation forms; arbitrary user wrappers have no inferred authority.
  function invocation(node) {
    function normalize(expression, arguments_, receiver, depth = 0) {
      const target = callable(expression)
      if (depth > maximumStyleResolutionDepth || target === undefined) return undefined
      if (target.type === 'CallExpression') {
        const binding = callable(target.callee)
        if (
          binding?.type === 'MemberExpression' &&
          name(binding.property, binding.computed) === 'bind'
        ) {
          const bound = argumentList(target.arguments.slice(1))
          return normalize(
            binding.object,
            {
              values: [...bound.values, ...(bound.unresolved ? [] : arguments_.values)],
              unresolved: bound.unresolved || arguments_.unresolved,
            },
            target.arguments[0],
            depth + 1,
          )
        }
        return undefined
      }
      if (target.type === 'MemberExpression') {
        const method = name(target.property, target.computed)
        if (method === 'call')
          return normalize(
            target.object,
            { values: arguments_.values.slice(1), unresolved: arguments_.unresolved },
            arguments_.values[0],
            depth + 1,
          )
        if (method === 'apply') {
          if (namespace(target.object) === 'Reflect')
            return normalize(
              arguments_.values[0],
              appliedArguments(arguments_.values[2]),
              arguments_.values[1],
              depth + 1,
            )
          return normalize(
            target.object,
            appliedArguments(arguments_.values[1]),
            arguments_.values[0],
            depth + 1,
          )
        }
        // A bind call creates a function; its eventual invocation consumes the bound arguments.
        if (method === 'bind') return undefined
      }
      return {
        callee: target,
        receiver: receiver ?? (target.type === 'MemberExpression' ? target.object : undefined),
        arguments: arguments_.values,
        unresolvedArguments: arguments_.unresolved,
      }
    }
    return normalize(node.callee, argumentList(node.arguments))
  }

  function styleElement(expression) {
    if (typed(expression, /^(?:HTMLStyleElement|SVGStyleElement)$/u)) return true
    const resolved = unwrap(expression)
    if (resolved?.type !== 'CallExpression') return false
    const call = invocation(resolved)
    if (call?.callee.type !== 'MemberExpression') return false
    const method = name(call.callee.property, call.callee.computed)
    const value = staticNodeValue(unwrap(call.arguments[method === 'createElementNS' ? 1 : 0]))
    return (
      (documentObject(call.receiver) &&
        ['createElement', 'createElementNS'].includes(method) &&
        typeof value === 'string' &&
        htmlTagName(value, method, call.arguments) === 'style') ||
      (['querySelector', 'querySelectorAll'].includes(method) &&
        (documentObject(call.receiver) || dom(call.receiver)) &&
        typeof value === 'string' &&
        /(?:^|[\s>+~,(])(?:[\w-]+\|)?style(?=[\s.#:\[>+~,)]|$)/u.test(value))
    )
  }

  function sheet(expression) {
    if (typed(expression, /^(?:CSSStyleSheet|StyleSheet)$/u)) return true
    const resolved = unwrap(expression)
    return (
      (resolved?.type === 'NewExpression' && global(unwrap(resolved.callee), 'CSSStyleSheet')) ||
      (resolved?.type === 'MemberExpression' &&
        name(resolved.property, resolved.computed) === 'sheet' &&
        styleElement(resolved.object)) ||
      (resolved?.type === 'MemberExpression' &&
        resolved.object.type === 'MemberExpression' &&
        name(resolved.object.property, resolved.object.computed) === 'styleSheets' &&
        documentObject(resolved.object.object))
    )
  }

  function sheetMedia(expression) {
    const resolved = unwrap(expression)
    return (
      typed(expression, /^MediaList$/u) ||
      (resolved?.type === 'MemberExpression' &&
        name(resolved.property, resolved.computed) === 'media' &&
        sheet(resolved.object))
    )
  }

  function cssRule(expression) {
    return typed(expression, /^(?:CSSRule|CSS\w+Rule)$/u)
  }

  function adoptedSheets(expression) {
    const resolved = unwrap(expression)
    return (
      resolved?.type === 'MemberExpression' &&
      name(resolved.property, resolved.computed) === 'adoptedStyleSheets' &&
      documentObject(resolved.object)
    )
  }

  function markupCandidates(expression, seen = new Set()) {
    if (expression === undefined || seen.has(expression) || seen.size > maximumStyleResolutionDepth)
      return ['\u0000']
    const resolved = unwrap(expression)
    if (resolved !== expression) return markupCandidates(resolved, new Set([...seen, expression]))
    const unknown = '\u0000'
    const combine = (prefixes, suffixes, separator = '') =>
      prefixes
        .flatMap((prefix) => suffixes.map((suffix) => prefix + separator + suffix))
        .slice(0, 32)
        .concat(prefixes.length * suffixes.length > 32 ? [unknown] : [])
    const templateCandidates = (template, visited, depth) => {
      let values = [template.quasis[0]?.value.cooked ?? template.quasis[0]?.value.raw ?? '']
      for (const [index, interpolation] of template.expressions.entries()) {
        const interpolated = candidates(interpolation, new Set([...visited, template]), depth + 1)
        const suffix =
          template.quasis[index + 1]?.value.cooked ?? template.quasis[index + 1]?.value.raw ?? ''
        values = combine(values, interpolated).map((value) => value + suffix)
      }
      return values
    }
    const candidates = (node, visited, depth = 0) => {
      if (node === undefined || visited.has(node) || depth > maximumStyleResolutionDepth)
        return [unknown]
      const unwrapped = unwrap(node)
      if (unwrapped !== node) return candidates(unwrapped, new Set([...visited, node]), depth + 1)
      const value = staticNodeValue(unwrapped)
      if (typeof value === 'string') return [value]
      if (unwrapped?.type === 'TemplateLiteral')
        return templateCandidates(unwrapped, visited, depth)
      if (
        unwrapped?.type === 'TaggedTemplateExpression' &&
        unwrapped.tag.type === 'MemberExpression' &&
        global(unwrapped.tag.object, 'String') &&
        name(unwrapped.tag.property, unwrapped.tag.computed) === 'raw'
      )
        return templateCandidates(unwrapped.quasi, visited, depth)
      if (unwrapped?.type === 'BinaryExpression' && unwrapped.operator === '+') {
        const left = candidates(unwrapped.left, new Set([...visited, unwrapped]), depth + 1)
        const right = candidates(unwrapped.right, new Set([...visited, unwrapped]), depth + 1)
        return combine(left, right)
      }
      if (unwrapped?.type === 'CallExpression') {
        const call = invocation(unwrapped)
        if (call?.callee.type === 'MemberExpression') {
          const method = name(call.callee.property, call.callee.computed)
          if (method === 'concat') {
            let values = candidates(call.receiver, new Set([...visited, unwrapped]), depth + 1)
            if (values.some((candidate) => candidate !== unknown)) {
              for (const argument of call.arguments)
                values = combine(
                  values,
                  candidates(argument, new Set([...visited, unwrapped]), depth + 1),
                )
              if (call.unresolvedArguments) values = combine(values, [unknown])
              return values
            }
          }
          if (method === 'join') {
            const receiver = unwrap(call.receiver)
            if (receiver?.type === 'ArrayExpression') {
              const separatorValue =
                call.arguments.length === 0 ? ',' : staticNodeValue(unwrap(call.arguments[0]))
              const separator =
                typeof separatorValue === 'string' || typeof separatorValue === 'number'
                  ? String(separatorValue)
                  : unknown
              let values = ['']
              for (const [index, element] of receiver.elements.entries()) {
                const parts =
                  element === null
                    ? ['']
                    : candidates(element, new Set([...visited, unwrapped]), depth + 1)
                values = combine(values, parts, index === 0 ? '' : separator)
              }
              return values
            }
          }
        }
      }
      if (unwrapped?.type === 'ConditionalExpression')
        return [
          ...candidates(unwrapped.consequent, new Set([...visited, unwrapped]), depth + 1),
          ...candidates(unwrapped.alternate, new Set([...visited, unwrapped]), depth + 1),
        ]
      if (unwrapped?.type === 'LogicalExpression')
        return [
          ...candidates(unwrapped.left, new Set([...visited, unwrapped]), depth + 1),
          ...candidates(unwrapped.right, new Set([...visited, unwrapped]), depth + 1),
        ]
      return [unknown]
    }
    return candidates(resolved, seen)
  }

  function styleMarkup(expression) {
    return parsedMarkup(expression).style
  }

  function markupIsUnresolved(expression) {
    return parsedMarkup(expression).unresolved
  }

  function parsedMarkup(expression) {
    const result = { classes: [], style: false, unresolved: false }
    for (const candidate of markupCandidates(expression)) {
      if (candidate.includes('\u0000')) {
        result.unresolved = true
        continue
      }
      let fragment
      try {
        // v-pre prevents Vue expression/directive interpretation of ordinary HTML.
        fragment = markupParser
          .parseForESLint(`<template v-pre>${candidate}</template>`, { parser: false })
          .services.getDocumentFragment()
      } catch {
        result.unresolved = true
        continue
      }
      // Duplicate attributes are recoverable HTML: consume the first, in source order.
      if (fragment.errors.some((error) => error.code !== 'duplicate-attribute')) {
        result.unresolved = true
        continue
      }
      let plainTextStarted = false
      const inspect = (element) => {
        if (element.type !== 'VElement' || plainTextStarted) return
        const html = element.namespace === 'http://www.w3.org/1999/xhtml'
        const tag = html ? asciiLower(element.rawName) : element.rawName
        if (tag === 'style') result.style = true
        const effective = new Set()
        for (const attribute of element.startTag.attributes) {
          if (attribute.directive) continue
          const name = html ? asciiLower(attribute.key.rawName) : attribute.key.rawName
          if (effective.has(name)) continue
          effective.add(name)
          if (name === 'class') result.classes.push(attribute.value?.value ?? '')
          if (name === 'style') result.style = true
        }
        // HTML plaintext consumes the rest of the fragment, including end tags.
        if (html && tag === 'plaintext') plainTextStarted = true
        for (const child of element.children) inspect(child)
      }
      for (const child of fragment.children) inspect(child)
    }
    return result
  }

  function classMarkupValues(expression) {
    const result = parsedMarkup(expression)
    return result.unresolved ? undefined : [...new Set(result.classes)]
  }

  function renderName(call) {
    const callee = call?.callee
    const namesByModule = new Map([
      [
        'vue',
        [
          'h',
          'createVNode',
          'createElementVNode',
          'createBlock',
          'createElementBlock',
          'cloneVNode',
          'createStaticVNode',
        ],
      ],
    ])
    const definition = variable(callee)?.defs[0]
    for (const [module, names] of namesByModule) {
      if (imported(callee, module, names))
        return getStaticPropertyName(definition.node.imported, false)
    }
    if (callee?.type !== 'MemberExpression') return undefined
    const module = namespace(callee.object)
    const member = name(callee.property, callee.computed)
    return namesByModule.get(module)?.includes(member) ? member : undefined
  }

  function hChildren(call) {
    if (renderName(call) !== 'h' || call.arguments.length !== 2) return false
    const expression = call.arguments[1]
    const resolved = unwrap(expression)
    if (
      resolved == null ||
      ['Literal', 'ArrayExpression', 'ArrowFunctionExpression', 'FunctionExpression'].includes(
        resolved.type,
      )
    )
      return true
    const node =
      services.esTreeNodeToTSNodeMap?.get(expression) ??
      services.esTreeNodeToTSNodeMap?.get(variable(expression)?.defs[0]?.name)
    if (checker === undefined || node === undefined) return false
    const safe = (type) =>
      type.isUnion?.()
        ? type.types.every(safe)
        : (type.flags &
            (ts.TypeFlags.StringLike |
              ts.TypeFlags.NumberLike |
              ts.TypeFlags.BooleanLike |
              ts.TypeFlags.BigIntLike |
              ts.TypeFlags.Null |
              ts.TypeFlags.Undefined)) !==
            0 ||
          typed(expression, /^VNode$/u, type) ||
          type.getCallSignatures().length > 0 ||
          checker.isArrayType(type) ||
          checker.isTupleType(type)
    return safe(checker.getTypeAtLocation(node))
  }

  function vnodeProps(expression) {
    const resolved = unwrap(expression)
    return (
      resolved?.type === 'MemberExpression' &&
      name(resolved.property, resolved.computed) === 'props' &&
      typed(resolved.object, /^VNode$/u)
    )
  }

  function vendorTemplate(node, inspect, unresolved) {
    const argument = node.key.argument
    if (argument?.type !== 'VIdentifier') return false
    const tag = node.parent.parent.rawName
    if (
      filename === 'packages/ui/src/adapters/naive/PavpNaiveFormControl.vue' &&
      tag === 'NSelect' &&
      argument.name === 'menu-props'
    ) {
      inspect(node.value?.expression)
      return true
    }
    if (
      filename === 'packages/ui/src/components/UiAdminShell.vue' &&
      tag === 'PavpMenuPrimitive' &&
      argument.name === 'dropdown-props'
    ) {
      props(
        node.value?.expression,
        (key, value) => {
          if (key !== 'menuProps') return
          const callback = unwrap(value)
          if (
            callback?.type === 'ArrowFunctionExpression' &&
            callback.body.type !== 'BlockStatement'
          )
            inspect(callback.body)
          else unresolved(value)
        },
        unresolved,
      )
      return true
    }
    return false
  }

  function noVisualProps(expression) {
    if (checker === undefined || services.esTreeNodeToTSNodeMap === undefined) return false
    const node =
      services.esTreeNodeToTSNodeMap.get(expression) ??
      services.esTreeNodeToTSNodeMap.get(variable(expression)?.defs[0]?.name)
    if (node === undefined) return false
    const safe = (type) => {
      if (type.isUnion?.()) return type.types.every(safe)
      // Any/unknown, primitive values and open index signatures prove nothing.
      if (
        (type.flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection)) === 0 ||
        checker.getIndexInfosOfType(type).length > 0 ||
        type.getCallSignatures().length > 0
      )
        return false
      const names = checker.getPropertiesOfType(type).map((property) => property.name)
      return !names.some((key) =>
        [
          'class',
          'className',
          'style',
          'content-style',
          'contentStyle',
          'overlay-style',
          'overlayStyle',
        ].includes(key),
      )
    }
    let type = checker.getTypeAtLocation(node)
    if (
      ['ComputedRef', 'Ref', 'ShallowRef'].includes(type.aliasSymbol?.name ?? type.symbol?.name)
    ) {
      const value = checker.getPropertyOfType(type, 'value')
      if (value !== undefined) type = checker.getTypeOfSymbolAtLocation(value, node)
    }
    return safe(type)
  }

  function templateForward(node) {
    const tag = node.parent.parent.rawName
    if (tag === 'slot' || tag === 'template') return true
    const expression = node.value?.expression
    if (expression?.type === 'Identifier' && expression.name === '$attrs') {
      return (
        (filename === 'packages/ui/src/components/UiForm.vue' && tag === 'PavpNaiveForm') ||
        (filename === 'packages/ui/src/components/UiFormField.vue' && tag === 'PavpNaiveFormField')
      )
    }
    return false
  }

  function nativeFormForward(expression) {
    if (
      ![
        'packages/ui/src/adapters/naive/PavpNaiveForm.vue',
        'packages/ui/src/adapters/naive/PavpNaiveFormField.vue',
      ].includes(filename) ||
      expression?.type !== 'CallExpression' ||
      !imported(expression.callee, '../../components/form-native-attributes', [
        'formNativeAttributes',
      ]) ||
      expression.arguments.length !== 1
    )
      return false
    const attrs = unwrap(expression.arguments[0])
    return (
      attrs?.type === 'CallExpression' &&
      imported(attrs.callee, 'vue', ['useAttrs']) &&
      attrs.arguments.length === 0
    )
  }

  function appearanceAttribute(node) {
    if (filename !== 'apps/web/src/app/appearance/appearance.store.ts') return false
    const attribute = node.arguments[0]
    if (
      attribute?.type !== 'MemberExpression' ||
      name(attribute.property, attribute.computed) !== 'name'
    )
      return false
    const definition = variable(attribute.object)?.defs[0]
    const loop = definition?.node?.parent?.parent
    return (
      loop?.type === 'ForOfStatement' &&
      loop.right.type === 'MemberExpression' &&
      name(loop.right.property, loop.right.computed) === 'attributes' &&
      typed(loop.right.object, /^AppearanceDomCapture$/u)
    )
  }

  function attributeNames(expression, seen = new Set()) {
    if (!expression || seen.has(expression) || seen.size > maximumStyleResolutionDepth)
      return undefined
    const resolved = unwrap(expression)
    const next = new Set([...seen, expression])
    if (resolved !== expression) return attributeNames(resolved, next)
    if (expression.type === 'ConditionalExpression') {
      const left = attributeNames(expression.consequent, next),
        right = attributeNames(expression.alternate, next)
      return left && right ? [...new Set([...left, ...right])] : undefined
    }
    const value = staticNodeValue(unwrap(expression))
    if (typeof value === 'string') return [value]
    const definition = variable(expression)?.defs[0]
    const loop = definition?.node?.parent?.parent
    if (
      definition?.node?.id?.type === 'ArrayPattern' &&
      definition.node.id.elements[0] === definition.name &&
      loop?.type === 'ForOfStatement' &&
      loop.right.type === 'CallExpression' &&
      loop.right.callee.type === 'MemberExpression' &&
      global(loop.right.callee.object, 'Object') &&
      name(loop.right.callee.property, loop.right.callee.computed) === 'entries'
    ) {
      const object = unwrap(loop.right.arguments[0])
      if (object?.type === 'ObjectExpression') {
        const keys = object.properties.map((property) =>
          property.type === 'Property' ? name(property.key, property.computed) : undefined,
        )
        if (keys.every((key) => key !== undefined)) return keys
      }
    }
    if (checker !== undefined && services.esTreeNodeToTSNodeMap !== undefined) {
      const node =
        services.esTreeNodeToTSNodeMap.get(expression) ??
        services.esTreeNodeToTSNodeMap.get(variable(expression)?.defs[0]?.name)
      if (node !== undefined) {
        const type = checker.getTypeAtLocation(node)
        const members = type.isUnion?.() ? type.types : [type]
        if (members.every((member) => member.isStringLiteral()))
          return members.map((member) => member.value)
      }
    }
    return undefined
  }

  function memberNames(member) {
    const staticName = name(member.property, member.computed)
    if (staticName !== undefined) return [staticName]
    return member.computed ? attributeNames(member.property) : undefined
  }

  function mountAttributeRestore(node) {
    if (filename !== 'apps/web/src/app/bootstrap/create-application.ts') return false
    const [key, value] = node.arguments
    if (
      key?.type !== 'MemberExpression' ||
      value?.type !== 'MemberExpression' ||
      name(key.property, key.computed) !== 'name' ||
      name(value.property, value.computed) !== 'value' ||
      variable(key.object) !== variable(value.object)
    )
      return false
    const loop = variable(key.object)?.defs[0]?.node?.parent?.parent
    const baseline = loop?.type === 'ForOfStatement' ? variable(loop.right) : undefined
    const capture = baseline?.defs[0]?.node?.init
    if (
      capture?.type !== 'CallExpression' ||
      capture.callee.type !== 'MemberExpression' ||
      !global(capture.callee.object, 'Array') ||
      name(capture.callee.property, capture.callee.computed) !== 'from'
    )
      return false
    const attributes = capture.arguments[0]
    const projection = capture.arguments[1]
    return (
      attributes?.type === 'MemberExpression' &&
      name(attributes.property, attributes.computed) === 'attributes' &&
      variable(attributes.object) === variable(node.callee.object) &&
      projection?.type === 'ArrowFunctionExpression' &&
      projection.body.type === 'ObjectExpression' &&
      projection.body.properties.length === 2 &&
      projection.body.properties.every(
        (property) =>
          property.type === 'Property' &&
          property.shorthand &&
          ['name', 'value'].includes(name(property.key, property.computed)),
      ) &&
      baseline.references
        .filter((reference) => reference.isWrite() && !reference.init)
        .every(
          (reference) =>
            reference.writeExpr?.type === 'ArrayExpression' &&
            reference.writeExpr.elements.length === 0,
        )
    )
  }

  function props(expression, consume, unresolved, seen = new Set()) {
    if (expression == null || (expression.type === 'Literal' && expression.value == null)) return
    if (untrusted(expression)) {
      unresolved(expression)
      return
    }
    if (nativeFormForward(expression)) return
    if (seen.has(expression) || seen.size > maximumStyleResolutionDepth) {
      unresolved(expression)
      return
    }
    const next = new Set([...seen, expression])
    const resolved = unwrap(expression)
    if (resolved !== expression) {
      props(resolved, consume, unresolved, next)
      return
    }
    if (expression.type === 'ConditionalExpression') {
      props(expression.consequent, consume, unresolved, next)
      props(expression.alternate, consume, unresolved, next)
    } else if (expression.type === 'LogicalExpression' && expression.operator === '&&') {
      props(expression.right, consume, unresolved, next)
    } else if (expression.type === 'ObjectExpression') {
      for (const property of expression.properties) {
        if (property.type === 'SpreadElement') props(property.argument, consume, unresolved, next)
        else if (property.type === 'Property') {
          const key = name(property.key, property.computed)
          if (key === undefined) unresolved(property)
          else consume(key, property.value, property)
        } else unresolved(property)
      }
    } else if (!noVisualProps(expression)) unresolved(expression)
  }

  return {
    variable,
    moduleBinding: (name) => moduleScope?.set.get(name),
    bare,
    executionOwner,
    definitelyLater,
    finiteReturns,
    untrusted,
    visitors,
    asciiLower,
    htmlTagName,
    htmlAttributeName,
    componentTag,
    imported,
    global,
    initializer,
    unwrap,
    name,
    typed,
    dom,
    style,
    styleMap,
    classList,
    svgClassName,
    namespace,
    invocation,
    styleElement,
    sheet,
    sheetMedia,
    cssRule,
    adoptedSheets,
    styleMarkup,
    markupIsUnresolved,
    classMarkupValues,
    documentObject,
    renderName,
    hChildren,
    vnodeProps,
    vendorTemplate,
    props,
    templateForward,
    appearanceAttribute,
    attributeNames,
    memberNames,
    mountAttributeRestore,
  }
}
