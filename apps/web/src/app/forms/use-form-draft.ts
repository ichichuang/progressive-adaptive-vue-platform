import { computed } from 'vue'
import { z } from 'zod'
import type { UiFormController, UiFormNode, UiFormValue } from '@platform/ui'
import { useFormDraftStorage } from './use-form-draft-storage'
import { formDraftSignature } from './form-draft-signature'
import type { FormDraftHandoff } from './form-draft-contract'
import { useDraftSession } from './use-draft-session'

const dataSchema = z.strictObject({
  formId: z.string(),
  draftId: z.string(),
  values: z.record(z.string(), z.json()),
  initial: z.record(z.string(), z.json()),
  activeStepIndex: z.number().int().nonnegative().optional(),
})

const reservedKeys = new Set(['__proto__', 'prototype', 'constructor'])

/** Explicit schema roots only; repeat contents are saved atomically, never by row index. */
export function useFormDraft<I extends Record<string, UiFormValue>>(input: {
  readonly previous?: FormDraftHandoff
  readonly form: UiFormController<I>
  readonly scope: string
  readonly maxAgeMs: number
  readonly includeFields: readonly string[]
  readonly excludeFields?: readonly string[]
  readonly automatic?: boolean
  readonly enabled: () => boolean
}) {
  const storage = useFormDraftStorage()
  const form = input.form
  const draftIdentity = form.draftId.value
  for (const path of [...input.includeFields, ...(input.excludeFields ?? [])])
    if (
      path
        .split('.')
        .some((part) => !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(part) || reservedKeys.has(part))
    )
      throw new TypeError('Draft policies require explicit paths without wildcards or row indexes.')
  const declarations = new Map<string, UiFormNode>()
  function declare(nodes: readonly UiFormNode[], prefix = ''): void {
    for (const node of nodes) {
      const path = prefix ? `${prefix}.${node.name}` : node.name
      declarations.set(path, node)
      // Descendants of a repeat are part of that collection, not independently stable paths.
      if (node.kind === 'group') declare(node.fields, path)
    }
  }
  declare(form.schema.fields)
  if (input.includeFields.some((path) => !declarations.has(path)))
    throw new TypeError('Persisted form paths must name a schema leaf, group or repeat root.')
  const included = [...new Set(input.includeFields)]
    .filter(
      (path) =>
        // Omit the whole root when any descendant is excluded; never leak it through a parent.
        !input.excludeFields?.some(
          (excluded) =>
            path === excluded || path.startsWith(`${excluded}.`) || excluded.startsWith(`${path}.`),
        ),
    )
    .sort()
  const fields = included.filter(
    (path) => !included.some((parent) => path.startsWith(`${parent}.`)),
  )
  function safeKeys(value: unknown, depth = 0): void {
    if (depth > 64) throw new TypeError('The saved draft exceeds the supported nesting depth.')
    if (value === null || typeof value !== 'object') return
    if (
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    )
      throw new TypeError('Saved drafts require plain JSON objects.')
    const keys = Object.keys(value)
    if (
      keys.some((key) => reservedKeys.has(key)) ||
      (Array.isArray(value)
        ? keys.length !== value.length ||
          keys.some((key, index) => key !== String(index)) ||
          Reflect.ownKeys(value).length !== keys.length + 1
        : Reflect.ownKeys(value).length !== keys.length)
    )
      throw new TypeError('The saved draft contains unsupported keys.')
    for (const child of Object.values(value)) safeKeys(child, depth + 1)
  }
  function valueSchema(node: UiFormNode): z.ZodType<UiFormValue> {
    if (node.kind !== 'group' && node.kind !== 'repeat') return z.json()
    const row = z.strictObject(
      Object.fromEntries(node.fields.map((child) => [child.name, valueSchema(child)])),
    )
    return node.kind === 'repeat' ? z.array(row) : row
  }
  const schemas = fields.map((path) => {
    const node = declarations.get(path)
    if (!node) throw new TypeError('The included draft path no longer exists.')
    return { path, schema: valueSchema(node) }
  })
  function valueAt(source: I, path: string): UiFormValue {
    let value: UiFormValue | undefined = source
    for (const part of path.split('.'))
      value =
        value && typeof value === 'object' && !Array.isArray(value) && Object.hasOwn(value, part)
          ? (value as Record<string, UiFormValue>)[part]
          : undefined
    if (value === undefined) throw new TypeError('The included draft field no longer exists.')
    return value
  }
  function pick(source: I): Record<string, UiFormValue> {
    return Object.fromEntries(fields.map((path) => [path, valueAt(source, path)]))
  }
  function snapshot() {
    const step = form.activeStepIndex.value
    return {
      formId: form.formId,
      draftId: form.draftId.value,
      values: pick(form.getValues()),
      initial: pick(form.getInitial().values),
      ...(step === null ? {} : { activeStepIndex: step }),
    }
  }
  function parse(value: unknown) {
    // Check before Zod parses records, so reserved keys cannot be silently stripped.
    safeKeys(value)
    const data = dataSchema.parse(value)
    if (
      data.formId !== form.formId ||
      data.draftId !== draftIdentity ||
      [data.values, data.initial].some(
        (values) => JSON.stringify(Object.keys(values).sort()) !== JSON.stringify(fields),
      )
    )
      throw new TypeError('The saved draft belongs to a different form or field policy.')
    for (const { path, schema } of schemas) {
      schema.parse(data.values[path])
      schema.parse(data.initial[path])
    }
    if (data.activeStepIndex !== undefined) {
      if (form.activeStepIndex.value === null)
        throw new TypeError('The saved draft step does not apply to this form.')
      if (form.schema.steps === undefined || data.activeStepIndex >= form.schema.steps.length)
        throw new TypeError('The saved draft step is out of range.')
    }
    return data
  }
  const port = storage.create({
    scope: input.scope,
    schemaKey: JSON.stringify({ schema: form.schema, fields }, (key, value: unknown) =>
      key === 'defaultValue' ? undefined : value,
    ),
    maxAgeMs: input.maxAgeMs,
    parse,
  })
  const adopted =
    input.previous === undefined
      ? undefined
      : fields.length > 0 && input.enabled()
        ? input.previous.handoff(port, snapshot())
        : { status: 'failed' as const, reason: 'incompatible' as const }
  const session = useDraftSession({
    port,
    ...(adopted === undefined ? {} : { adopted }),
    snapshot,
    automatic: input.automatic ?? false,
    enabled: () => fields.length > 0 && input.enabled() && form.draftId.value === draftIdentity,
    restore(data) {
      if (form.hasPendingInput.value || form.draftId.value !== draftIdentity) return false
      // Restoring an old local draft must not silently replace a newer accepted server baseline.
      if (formDraftSignature(data.initial) !== formDraftSignature(pick(form.getInitial().values)))
        return false
      const current = form.getValues()
      for (const path of fields) {
        const parts = path.split('.')
        let target: Record<string, UiFormValue> = current
        for (const part of parts.slice(0, -1)) {
          const next = target[part]
          if (!next || typeof next !== 'object' || Array.isArray(next)) return false
          target = next
        }
        const leaf = parts.at(-1)
        const value = data.values[path]
        if (leaf === undefined || value === undefined) return false
        target[leaf] = value
      }
      // The form owner validates leaf semantics. Strict collection shapes above prevent its
      // default-filling normalization from silently repairing an incomplete persisted row.
      const result = form.replaceValues(current)
      if (result !== 'applied' && result !== 'unchanged') return false
      if (data.activeStepIndex !== undefined && form.activeStepIndex.value !== null) {
        // Restore progress without re-validating; values already pass replaceValues.
        void form.setActiveStep(data.activeStepIndex, { relax: true })
      }
      return true
    },
  })
  return {
    ...session,
    pendingInput: computed(() => form.hasPendingInput.value),
    includedFields: fields,
  }
}
