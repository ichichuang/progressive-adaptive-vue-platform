import { toRaw, type DeepReadonly } from 'vue'
import { isDateOnly } from '../components/form-control-values'

import type { UiFormDraftValue, UiFormFieldConfig, UiFormKey } from '../components/form-contracts'

export function isFormKey<I extends object>(values: I, name: string): name is UiFormKey<I> {
  return Object.hasOwn(values, name)
}

function isDraftValue(value: unknown): value is UiFormDraftValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    (Array.isArray(value) &&
      Array.from<unknown>(value).every(
        (item: unknown) =>
          typeof item === 'string' || (typeof item === 'number' && Number.isFinite(item)),
      ))
  )
}

export function sameDraftValue(left: unknown, right: unknown): boolean {
  return Array.isArray(left) && Array.isArray(right)
    ? left.length === right.length && left.every((item: unknown, index) => item === right[index])
    : left === right
}

export function cloneDraft<I extends object>(values: I): I {
  // Only the admitted flat scalar/selection shape crosses this cloning boundary.
  for (const value of Object.values(values)) {
    if (!isDraftValue(value)) throw new TypeError('Unsupported form draft value.')
  }
  const cloned = { ...toRaw(values) }
  for (const key of Object.keys(cloned)) {
    if (isFormKey<I>(cloned, key)) cloned[key] = structuredClone(toRaw(values[key]))
  }
  return cloned
}

export function freezeDraftValue<T>(value: T): DeepReadonly<T> {
  // Callers pass an owned, validated flat draft or one of its values. Freeze its
  // only possible nested containers as well; no mutable alias escapes.
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) Object.freeze(child)
    }
    Object.freeze(value)
  }
  return value as DeepReadonly<T>
}

export function checkDraft<I extends object>(
  values: I,
  fields: readonly UiFormFieldConfig<I>[],
): void {
  const prototype: unknown = Object.getPrototypeOf(values)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('Form drafts require a plain top-level value object.')
  }
  const keys = Object.keys(values)
  if (
    Reflect.ownKeys(values).length !== keys.length ||
    keys.length !== fields.length ||
    new Set(fields.map((field) => field.name)).size !== keys.length ||
    fields.some(
      (field) => !isFormKey(values, field.name) || !field.name || /[.\[\]]/u.test(field.name),
    )
  ) {
    throw new TypeError('Form fields must cover every draft key exactly once.')
  }
  for (const field of fields) {
    const value = values[field.name]
    if (
      !isDraftValue(value) ||
      ((field.kind === 'text' || field.kind === 'textarea') && typeof value !== 'string') ||
      (field.kind === 'number' && value !== null && typeof value !== 'number') ||
      (field.kind === 'switch' && typeof value !== 'boolean') ||
      (field.kind === 'date' &&
        value !== null &&
        (typeof value !== 'string' || !isDateOnly(value))) ||
      (field.kind === 'select' &&
        value !== null &&
        typeof value !== 'string' &&
        typeof value !== 'number') ||
      (field.kind === 'multi-select' && !Array.isArray(value))
    ) {
      throw new TypeError('Form value is incompatible with its configured control.')
    }
  }
}
