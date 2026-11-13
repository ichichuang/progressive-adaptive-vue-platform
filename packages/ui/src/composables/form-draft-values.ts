import { toRaw, type DeepReadonly } from 'vue'
import type {
  UiFormCondition,
  UiFormFlag,
  UiFormNode,
  UiFormReference,
  UiFormValue,
} from '../components/form-contracts'
import { isDateOnly, isDateRange, isTimeOnly } from '../components/form-control-values'

import { isFormAttachment } from '../components/form-special-values'

const reserved = new Set(['__proto__', 'prototype', 'constructor'])
export function formPathParts(path: string): string[] {
  const parts = path.split('.')
  if (parts.some((part) => !part || reserved.has(part) || /[\[\]]/u.test(part)))
    throw new TypeError('Invalid form path.')
  return parts
}
export function cloneDraft<T>(value: T): T {
  function clone(candidate: unknown, ancestors: Set<object>, depth: number): UiFormValue {
    if (candidate === null || typeof candidate === 'string' || typeof candidate === 'boolean')
      return candidate
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate
    if (typeof candidate !== 'object' || depth > 32)
      throw new TypeError('Forms require finite JSON data.')
    const raw = toRaw(candidate)
    if (ancestors.has(raw)) throw new TypeError('Form data cannot contain cycles.')
    ancestors.add(raw)
    let result: UiFormValue
    if (Array.isArray(raw)) {
      if (raw.length > 10000 || Object.keys(raw).length !== raw.length)
        throw new TypeError('Invalid form array.')
      result = raw.map((item: unknown) => clone(item, ancestors, depth + 1))
    } else {
      if (Object.getPrototypeOf(raw) !== Object.prototype && Object.getPrototypeOf(raw) !== null)
        throw new TypeError('Forms require plain JSON objects.')
      const entries = Object.entries(raw)
      if (Reflect.ownKeys(raw).length !== entries.length)
        throw new TypeError('Unsupported form object keys.')
      const object: Record<string, UiFormValue> = {}
      for (const [key, child] of entries) {
        if (reserved.has(key)) throw new TypeError('Reserved form key.')
        object[key] = clone(child, ancestors, depth + 1)
      }
      result = object
    }
    ancestors.delete(raw)
    return result
  }
  return clone(value, new Set(), 0) as T
}
export function freezeDraftValue<T>(value: T): DeepReadonly<T> {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDraftValue(child)
    Object.freeze(value)
  }
  return value as DeepReadonly<T>
}
export function sameDraftValue(left: unknown, right: unknown): boolean {
  if (left === right) return true
  if (
    typeof left !== 'object' ||
    left === null ||
    typeof right !== 'object' ||
    right === null ||
    Array.isArray(left) !== Array.isArray(right)
  )
    return false
  const entries = Object.entries(left)
  return (
    entries.length === Object.keys(right).length &&
    entries.every(
      ([key, value]) =>
        Object.hasOwn(right, key) && sameDraftValue(value, (right as Record<string, unknown>)[key]),
    )
  )
}
export function getFormValue(values: unknown, path: string): UiFormValue | undefined {
  let current = values
  for (const part of formPathParts(path)) {
    if (typeof current !== 'object' || current === null || !Object.hasOwn(current, part))
      return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current as UiFormValue | undefined
}
export function setFormValue(values: unknown, path: string, value: UiFormValue): void {
  const parts = formPathParts(path)
  const last = parts.pop()
  let current = values
  for (const part of parts) {
    if (typeof current !== 'object' || current === null || !Object.hasOwn(current, part))
      throw new TypeError('Unknown form path.')
    current = (current as Record<string, unknown>)[part]
  }
  if (
    last === undefined ||
    typeof current !== 'object' ||
    current === null ||
    !Object.hasOwn(current, last)
  )
    throw new TypeError('Unknown form path.')
  ;(current as Record<string, unknown>)[last] = value
}
export function createFormValues(
  nodes: readonly UiFormNode[],
  supplied?: unknown,
  budget = { remaining: 10000 },
): Record<string, UiFormValue> {
  if (
    supplied !== undefined &&
    (typeof supplied !== 'object' || supplied === null || Array.isArray(supplied))
  )
    throw new TypeError('Form groups require an object.')
  const input = supplied === undefined ? {} : (cloneDraft(supplied) as Record<string, UiFormValue>)
  if (Object.keys(input).some((key) => !nodes.some((node) => node.name === key)))
    throw new TypeError('Unknown form value key.')
  const result: Record<string, UiFormValue> = {}
  for (const node of nodes) {
    if (--budget.remaining < 0) throw new TypeError('Form values exceed the supported size.')
    const value = input[node.name]
    if (node.kind === 'group') result[node.name] = createFormValues(node.fields, value, budget)
    else if (node.kind === 'repeat') {
      const rows =
        value === undefined ? Array.from({ length: node.minItems ?? 0 }, () => ({})) : value
      if (!Array.isArray(rows)) throw new TypeError('Repeat groups require an array.')
      result[node.name] = rows.map((row) => createFormValues(node.fields, row, budget))
    } else {
      const actual =
        value !== undefined
          ? value
          : node.defaultValue !== undefined
            ? node.defaultValue
            : node.kind === 'switch'
              ? false
              : node.kind === 'multi-select' ||
                  node.kind === 'checkbox-group' ||
                  node.kind === 'attachment'
                ? []
                : node.kind === 'text' || node.kind === 'textarea' || node.kind === 'mask'
                  ? ''
                  : node.kind === 'slider'
                    ? node.min
                    : node.kind === 'rating'
                      ? 0
                      : null
      const valid =
        node.kind === 'custom' ||
        (node.kind === 'slider' && typeof actual === 'number') ||
        (node.kind === 'rating' &&
          typeof actual === 'number' &&
          actual >= 0 &&
          actual <= (node.count ?? 5) &&
          Number.isInteger(actual * (node.allowHalf ? 2 : 1))) ||
        (node.kind === 'attachment' &&
          Array.isArray(actual) &&
          actual.every(isFormAttachment) &&
          new Set(actual.map((item) => (isFormAttachment(item) ? item.id : ''))).size ===
            actual.length) ||
        ((node.kind === 'text' || node.kind === 'textarea' || node.kind === 'mask') &&
          typeof actual === 'string') ||
        (node.kind === 'number' && (actual === null || typeof actual === 'number')) ||
        (node.kind === 'switch' && typeof actual === 'boolean') ||
        (node.kind === 'date' &&
          (actual === null || (typeof actual === 'string' && isDateOnly(actual)))) ||
        (node.kind === 'time' &&
          (actual === null || (typeof actual === 'string' && isTimeOnly(actual)))) ||
        (node.kind === 'date-range' && (actual === null || isDateRange(actual))) ||
        ((node.kind === 'select' || node.kind === 'radio') &&
          (actual === null || typeof actual === 'string' || typeof actual === 'number')) ||
        ((node.kind === 'multi-select' || node.kind === 'checkbox-group') &&
          Array.isArray(actual) &&
          actual.every((item) => typeof item === 'string' || typeof item === 'number') &&
          new Set(actual).size === actual.length)
      if (!valid) throw new TypeError(`Incompatible value for form field ${node.name}.`)
      result[node.name] = cloneDraft(actual)
    }
  }
  return result
}
export interface FormEntry {
  readonly node: UiFormNode
  readonly path: string
  readonly group: string
  readonly ancestors: readonly string[]
}
export function formEntries(
  nodes: readonly UiFormNode[],
  values: unknown,
  prefix = '',
  ancestors: readonly string[] = [],
): FormEntry[] {
  return nodes.flatMap((node) => {
    const path = prefix ? `${prefix}.${node.name}` : node.name
    const entry: FormEntry = { node, path, group: prefix, ancestors }
    if (node.kind === 'group')
      return [entry, ...formEntries(node.fields, values, path, [...ancestors, path])]
    if (node.kind === 'repeat') {
      const rows = getFormValue(values, path)
      return [
        entry,
        ...(Array.isArray(rows)
          ? rows.flatMap((_, index) =>
              formEntries(node.fields, values, `${path}.${String(index)}`, [...ancestors, path]),
            )
          : []),
      ]
    }
    return [entry]
  })
}
export function resolveFormReference(reference: UiFormReference, group: string): string {
  return reference.scope === 'group' && group ? `${group}.${reference.field}` : reference.field
}
export function evaluateFormFlag(
  flag: UiFormFlag | undefined,
  values: unknown,
  group: string,
): boolean {
  if (typeof flag === 'boolean' || flag === undefined) return flag === true
  const evaluate = (condition: UiFormCondition): boolean => {
    if ('all' in condition) return condition.all.every(evaluate)
    if ('any' in condition) return condition.any.some(evaluate)
    if ('not' in condition) return !evaluate(condition.not)
    const value = getFormValue(values, resolveFormReference(condition, group))
    const empty =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    switch (condition.operator) {
      case 'eq':
        return sameDraftValue(value, condition.value)
      case 'neq':
        return !sameDraftValue(value, condition.value)
      case 'in':
        return (
          Array.isArray(condition.value) &&
          condition.value.some((item) => sameDraftValue(value, item))
        )
      case 'empty':
        return empty
      case 'not-empty':
        return !empty
    }
  }
  return evaluate(flag)
}
