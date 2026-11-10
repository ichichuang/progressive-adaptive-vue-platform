import type { UiFormCondition, UiFormNode, UiFormReference, UiFormSchema } from './form-contracts'
import {
  cloneDraft,
  createFormValues,
  formPathParts,
  freezeDraftValue,
} from '../composables/form-draft-values'

/** Validate an untrusted JSON payload before any component, event or source is resolved. */
export function parseUiFormSchema(input: unknown): UiFormSchema {
  const cloned: unknown = cloneDraft(input)
  function record(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      throw new TypeError('Expected a form configuration object.')
    return value as Record<string, unknown>
  }
  function keys(value: Record<string, unknown>, allowed: readonly string[]): void {
    if (Object.keys(value).some((key) => !allowed.includes(key)))
      throw new TypeError('Unsupported form configuration property.')
  }
  function text(value: unknown): void {
    if (typeof value !== 'string') throw new TypeError('Expected form text.')
  }
  function path(value: unknown): void {
    text(value)
    if (formPathParts(value as string).some((part) => part.includes('*')))
      throw new TypeError('Wildcard form paths are not supported.')
  }
  function reference(value: unknown): void {
    const ref = record(value)
    keys(ref, ['field', 'scope'])
    path(ref['field'])
    if (ref['scope'] !== undefined && ref['scope'] !== 'form' && ref['scope'] !== 'group')
      throw new TypeError('Invalid form reference scope.')
  }
  function condition(value: unknown): void {
    const item = record(value)
    for (const key of ['all', 'any'] as const)
      if (key in item) {
        keys(item, [key])
        const list = item[key]
        if (!Array.isArray(list) || list.length === 0)
          throw new TypeError('A form condition group cannot be empty.')
        list.forEach(condition)
        return
      }
    if ('not' in item) {
      keys(item, ['not'])
      condition(item['not'])
      return
    }
    keys(item, ['field', 'scope', 'operator', 'value'])
    reference({
      field: item['field'],
      ...(item['scope'] === undefined ? {} : { scope: item['scope'] }),
    })
    const operator = item['operator']
    if (
      typeof operator !== 'string' ||
      !['eq', 'neq', 'in', 'empty', 'not-empty'].includes(operator)
    )
      throw new TypeError('Invalid condition operator.')
    if (['eq', 'neq', 'in'].includes(operator) && !Object.hasOwn(item, 'value'))
      throw new TypeError('Condition value is required.')
    if (operator === 'in' && !Array.isArray(item['value']))
      throw new TypeError('The in condition requires an array.')
  }
  function number(value: unknown, integer = false): void {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      (integer && (!Number.isInteger(value) || value < 0))
    )
      throw new TypeError('Invalid form numeric configuration.')
  }
  let count = 0
  function fields(value: unknown): void {
    if (!Array.isArray(value)) throw new TypeError('Form fields must be an array.')
    const names = new Set<string>()
    for (const raw of value) {
      if (++count > 1000) throw new TypeError('Too many configured form nodes.')
      const node = record(raw)
      const kind = node['kind']
      const shared = [
        'name',
        'label',
        'description',
        'kind',
        'hidden',
        'disabled',
        'readonly',
        'span',
      ]
      path(node['name'])
      if (
        (node['name'] as string).includes('.') ||
        /^\d+$/u.test(node['name'] as string) ||
        names.has(node['name'] as string)
      )
        throw new TypeError('Form node names must be unique local keys.')
      names.add(node['name'] as string)
      text(node['label'])
      if (node['description'] !== undefined) text(node['description'])
      if (node['span'] !== undefined && node['span'] !== 1 && node['span'] !== 2)
        throw new TypeError('Invalid field span.')
      for (const key of ['hidden', 'disabled', 'readonly', 'required'])
        if (node[key] !== undefined && typeof node[key] !== 'boolean') condition(node[key])
      if (kind === 'group' || kind === 'repeat') {
        keys(node, [
          ...shared,
          'fields',
          ...(kind === 'repeat' ? ['minItems', 'maxItems', 'addLabel', 'itemLabel'] : []),
        ])
        fields(node['fields'])
        for (const key of ['minItems', 'maxItems'])
          if (node[key] !== undefined) {
            number(node[key], true)
            if ((node[key] as number) > 1000)
              throw new TypeError('Repeat bounds cannot exceed 1000 rows.')
          }
        if (
          typeof node['minItems'] === 'number' &&
          typeof node['maxItems'] === 'number' &&
          node['minItems'] > node['maxItems']
        )
          throw new TypeError('Invalid repeat bounds.')
        for (const key of ['addLabel', 'itemLabel']) if (node[key] !== undefined) text(node[key])
        continue
      }
      if (
        ![
          'text',
          'textarea',
          'number',
          'switch',
          'date',
          'select',
          'multi-select',
          'custom',
        ].includes(String(kind))
      )
        throw new TypeError('Unsupported form field kind.')
      keys(node, [
        ...shared,
        'placeholder',
        'defaultValue',
        'required',
        'options',
        'min',
        'max',
        'step',
        'rules',
      ])
      if (node['placeholder'] !== undefined) text(node['placeholder'])
      for (const key of ['min', 'max', 'step'])
        if (node[key] !== undefined) {
          if (kind !== 'number') throw new TypeError('Numeric hints require a number field.')
          number(node[key])
        }
      if (typeof node['step'] === 'number' && node['step'] <= 0)
        throw new TypeError('Number step must be positive.')
      if (
        typeof node['min'] === 'number' &&
        typeof node['max'] === 'number' &&
        node['min'] > node['max']
      )
        throw new TypeError('Invalid number bounds.')
      if (kind === 'select' || kind === 'multi-select') {
        const options = node['options']
        if (Array.isArray(options)) {
          const identities = new Set<unknown>()
          for (const rawOption of options) {
            const option = record(rawOption)
            keys(option, ['value', 'label', 'disabled'])
            text(option['label'])
            if (
              (typeof option['value'] !== 'string' && typeof option['value'] !== 'number') ||
              identities.has(option['value'])
            )
              throw new TypeError('Invalid or duplicate option identity.')
            identities.add(option['value'])
            if (option['disabled'] !== undefined && typeof option['disabled'] !== 'boolean')
              throw new TypeError('Invalid option state.')
          }
        } else {
          const source = record(options)
          keys(source, ['source', 'dependsOn'])
          text(source['source'])
          if (!(source['source'] as string).trim())
            throw new TypeError('Option source name is required.')
          if (source['dependsOn'] !== undefined) {
            if (!Array.isArray(source['dependsOn']))
              throw new TypeError('Invalid option dependencies.')
            source['dependsOn'].forEach(reference)
          }
        }
      } else if (node['options'] !== undefined)
        throw new TypeError('Only selection fields accept options.')
      if (node['rules'] !== undefined) {
        const rules = record(node['rules'])
        keys(rules, ['min', 'max', 'minLength', 'maxLength', 'format', 'message'])
        for (const key of ['min', 'max', 'minLength', 'maxLength'])
          if (rules[key] !== undefined) number(rules[key], key.endsWith('Length'))
        if (rules['format'] !== undefined && rules['format'] !== 'email')
          throw new TypeError('Unsupported form format.')
        if (rules['message'] !== undefined) text(rules['message'])
        if (
          (typeof rules['min'] === 'number' &&
            typeof rules['max'] === 'number' &&
            rules['min'] > rules['max']) ||
          (typeof rules['minLength'] === 'number' &&
            typeof rules['maxLength'] === 'number' &&
            rules['minLength'] > rules['maxLength'])
        )
          throw new TypeError('Invalid validation bounds.')
        if (kind !== 'number' && (rules['min'] !== undefined || rules['max'] !== undefined))
          throw new TypeError('Numeric rules require a number field.')
        if (
          !['text', 'textarea', 'multi-select'].includes(String(kind)) &&
          (rules['minLength'] !== undefined || rules['maxLength'] !== undefined)
        )
          throw new TypeError('Length rules require text or multiple selection.')
        if (!['text', 'textarea'].includes(String(kind)) && rules['format'] !== undefined)
          throw new TypeError('Format rules require text.')
      }
    }
  }
  const schema = record(cloned)
  keys(schema, ['fields', 'columns'])
  if (schema['columns'] !== undefined && schema['columns'] !== 1 && schema['columns'] !== 2)
    throw new TypeError('Invalid form columns.')
  fields(schema['fields'])
  const parsed = cloned as UiFormSchema
  const declarations: { node: UiFormNode; path: string; group: string }[] = []
  function declare(nodes: readonly UiFormNode[], group = ''): void {
    for (const node of nodes) {
      const path = group ? `${group}.${node.name}` : node.name
      declarations.push({ node, path, group })
      if (node.kind === 'group' || node.kind === 'repeat')
        declare(node.fields, node.kind === 'repeat' ? `${path}.*` : path)
    }
  }
  declare(parsed.fields)
  function knownReference(ref: UiFormReference, group: string): void {
    const path = ref.scope === 'group' && group ? `${group}.${ref.field}` : ref.field
    // Only declaration-generated group prefixes contain '*'. User references
    // must use actual canonical indexes, and only at a repeat boundary.
    const parts = path.split('.')
    let nodes = parsed.fields
    for (let index = 0; index < parts.length; index += 1) {
      const node = nodes.find((candidate) => candidate.name === parts[index])
      if (node === undefined) throw new TypeError(`Unknown form dependency: ${path}`)
      if (index === parts.length - 1) return
      if (node.kind !== 'group' && node.kind !== 'repeat')
        throw new TypeError(`Unknown form dependency: ${path}`)
      if (node.kind === 'repeat') {
        const position = parts[++index]
        if (
          position === undefined ||
          (position !== '*' &&
            (!/^(0|[1-9]\d*)$/u.test(position) || !Number.isSafeInteger(Number(position)))) ||
          index === parts.length - 1
        )
          throw new TypeError(`Invalid repeat dependency: ${path}`)
      }
      nodes = node.fields
    }
  }
  function knownCondition(condition: UiFormCondition, group: string): void {
    if ('all' in condition)
      condition.all.forEach((child) => {
        knownCondition(child, group)
      })
    else if ('any' in condition)
      condition.any.forEach((child) => {
        knownCondition(child, group)
      })
    else if ('not' in condition) knownCondition(condition.not, group)
    else knownReference(condition, group)
  }
  for (const { node, group } of declarations) {
    const flags = [
      node.hidden,
      node.disabled,
      node.readonly,
      ...('required' in node ? [node.required] : []),
    ]
    for (const flag of flags) if (typeof flag === 'object') knownCondition(flag, group)
    if ('options' in node && 'source' in node.options) {
      for (const ref of node.options.dependsOn ?? []) knownReference(ref, group)
    }
  }
  // Validate field defaults even when they are currently nested inside an empty repeat group.
  function defaults(nodes: readonly UiFormNode[]): void {
    createFormValues(nodes)
    for (const node of nodes)
      if (node.kind === 'group' || node.kind === 'repeat') defaults(node.fields)
  }
  defaults(parsed.fields)
  freezeDraftValue<unknown>(parsed)
  return parsed
}
