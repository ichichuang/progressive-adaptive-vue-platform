import {
  migrateFormValues,
  type UiFormNode,
  type UiFormMigrationPolicy,
  type UiFormReadonlyValue,
  type UiFormValue,
} from '@platform/ui'

/** Builder edits deliberately retain the trial value when one sibling field is renamed. */
function previewRenames(
  previous: readonly UiFormNode[],
  next: readonly UiFormNode[],
): Readonly<Record<string, string>> {
  const removed = previous.filter((node) => !next.some((candidate) => candidate.name === node.name))
  const added = next.filter((node) => !previous.some((candidate) => candidate.name === node.name))
  const before = removed[0]
  const after = added[0]
  return previous.length === next.length &&
    removed.length === 1 &&
    added.length === 1 &&
    before &&
    after
    ? { [before.name]: after.name }
    : {}
}

export const builderMigrationPolicy = {
  replaceUnchangedDefaults: true,
  resolveRenames: previewRenames,
  resetFieldFormat: 'label',
} as const satisfies UiFormMigrationPolicy

/** Builder-specific policies over the same migration engine used by dynamic JSON forms. */
export function previewValues(
  previous: readonly UiFormNode[],
  next: readonly UiFormNode[],
  supplied: Readonly<Record<string, UiFormReadonlyValue>>,
  previousDefaults: Readonly<Record<string, UiFormReadonlyValue>>,
  nextDefaults: Readonly<Record<string, UiFormReadonlyValue>>,
  resetFields: string[],
): Record<string, UiFormValue> {
  return migrateFormValues(
    previous,
    next,
    supplied,
    previousDefaults,
    nextDefaults,
    resetFields,
    builderMigrationPolicy,
  )
}
