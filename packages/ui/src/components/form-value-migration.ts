import type { UiFormNode, UiFormReadonlyValue, UiFormValue } from './form-contracts'
import { cloneDraft, createFormValues } from '../composables/form-draft-values'

export interface UiFormMigrationPolicy {
  readonly replaceUnchangedDefaults?: boolean
  readonly resetFieldFormat?: 'path' | 'label'
  readonly resolveRenames?: (
    previous: readonly UiFormNode[],
    next: readonly UiFormNode[],
  ) => Readonly<Record<string, string>>
}

/** Project only compatible trial values; defaults and validation remain controller-owned. */
export function migrateFormValues(
  previous: readonly UiFormNode[],
  next: readonly UiFormNode[],
  supplied: Readonly<Record<string, UiFormReadonlyValue>>,
  previousDefaults: Readonly<Record<string, UiFormReadonlyValue>>,
  nextDefaults: Readonly<Record<string, UiFormReadonlyValue>>,
  resetFields: string[],
  policy: UiFormMigrationPolicy = {},
  parentPath = '',
): Record<string, UiFormValue> {
  const renames = policy.resolveRenames?.(previous, next)
  const result = cloneDraft(nextDefaults) as Record<string, UiFormValue>
  const group = (
    value: UiFormReadonlyValue | undefined,
  ): Readonly<Record<string, UiFormReadonlyValue>> =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Readonly<Record<string, UiFormReadonlyValue>>)
      : {}
  for (const node of next) {
    const path = parentPath ? `${parentPath}.${node.name}` : node.name
    const resetField = policy.resetFieldFormat === 'label' ? node.label : path
    const before =
      previous.find((candidate) => candidate.name === node.name) ??
      previous.find((candidate) => renames?.[candidate.name] === node.name)
    if (before?.kind !== node.kind) {
      if (before !== undefined) resetFields.push(resetField)
      continue
    }
    const value = supplied[before.name]
    if (value === undefined) continue
    if (node.kind === 'group' && before.kind === 'group') {
      if (value !== null && typeof value === 'object' && !Array.isArray(value))
        result[node.name] = migrateFormValues(
          before.fields,
          node.fields,
          group(value),
          group(previousDefaults[before.name]),
          group(nextDefaults[node.name]),
          resetFields,
          policy,
          path,
        )
    } else if (node.kind === 'repeat' && before.kind === 'repeat') {
      const oldRows = previousDefaults[before.name]
      const rowDefaults = createFormValues(node.fields)
      if (Array.isArray(value))
        result[node.name] = (value as readonly UiFormReadonlyValue[]).map((row, index) =>
          migrateFormValues(
            before.fields,
            node.fields,
            group(row),
            group(
              Array.isArray(oldRows) ? (oldRows[0] as UiFormReadonlyValue | undefined) : undefined,
            ),
            rowDefaults,
            resetFields,
            policy,
            `${path}.${String(index)}`,
          ),
        )
    } else if (
      node.kind !== 'group' &&
      node.kind !== 'repeat' &&
      before.kind !== 'group' &&
      before.kind !== 'repeat'
    ) {
      const oldDefault = Object.hasOwn(before, 'defaultValue')
        ? before.defaultValue
        : previousDefaults[before.name]
      if (
        policy.replaceUnchangedDefaults === true &&
        JSON.stringify(before.defaultValue) !== JSON.stringify(node.defaultValue) &&
        JSON.stringify(value) === JSON.stringify(oldDefault)
      )
        continue
      if (
        (node.kind === 'select' ||
          node.kind === 'radio' ||
          node.kind === 'multi-select' ||
          node.kind === 'checkbox-group') &&
        Array.isArray(node.options)
      ) {
        const options = node.options
        const chosen = Array.isArray(value) ? value : value === null ? [] : [value]
        if (
          chosen.some(
            (item) =>
              !options.some(
                (option: { value: string | number; disabled?: boolean }) =>
                  option.value === item && !option.disabled,
              ),
          )
        ) {
          resetFields.push(resetField)
          continue
        }
      }
      if (
        node.kind === 'rating' &&
        (typeof value !== 'number' ||
          value > (node.count ?? 5) ||
          !Number.isInteger(value * (node.allowHalf ? 2 : 1)))
      ) {
        resetFields.push(resetField)
        continue
      }
      if (
        node.kind === 'attachment' &&
        before.kind === 'attachment' &&
        before.source !== node.source
      ) {
        resetFields.push(resetField)
        continue
      }
      result[node.name] = cloneDraft(value) as UiFormValue
    }
  }
  return result
}
