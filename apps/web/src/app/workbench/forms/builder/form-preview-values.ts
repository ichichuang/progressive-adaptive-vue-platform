import type { UiFormNode, UiFormReadonlyValue, UiFormValue } from '@platform/ui'

/** Project only compatible trial values; defaults and validation remain controller-owned. */
export function previewValues(
  previous: readonly UiFormNode[],
  next: readonly UiFormNode[],
  supplied: Readonly<Record<string, UiFormReadonlyValue>>,
  previousDefaults: Readonly<Record<string, UiFormReadonlyValue>>,
  nextDefaults: Readonly<Record<string, UiFormReadonlyValue>>,
  resetFields: string[],
): Record<string, UiFormValue> {
  const removed = previous.filter((node) => !next.some((candidate) => candidate.name === node.name))
  const added = next.filter((node) => !previous.some((candidate) => candidate.name === node.name))
  const renamed = removed.length === 1 && added.length === 1 && previous.length === next.length
  const result = JSON.parse(JSON.stringify(nextDefaults)) as Record<string, UiFormValue>
  const group = (
    value: UiFormReadonlyValue | undefined,
  ): Readonly<Record<string, UiFormReadonlyValue>> =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Readonly<Record<string, UiFormReadonlyValue>>)
      : {}
  for (const node of next) {
    const before =
      previous.find((candidate) => candidate.name === node.name) ??
      (renamed && added[0] === node ? removed[0] : undefined)
    if (before?.kind !== node.kind) continue
    const value = supplied[before.name]
    if (value === undefined) continue
    if (node.kind === 'group' && before.kind === 'group') {
      if (value !== null && typeof value === 'object' && !Array.isArray(value))
        result[node.name] = previewValues(
          before.fields,
          node.fields,
          group(value),
          group(previousDefaults[before.name]),
          group(nextDefaults[node.name]),
          resetFields,
        )
    } else if (node.kind === 'repeat' && before.kind === 'repeat') {
      const oldRows = previousDefaults[before.name]
      const newRows = nextDefaults[node.name]
      if (Array.isArray(value))
        result[node.name] = (value as readonly UiFormReadonlyValue[]).map((row) =>
          previewValues(
            before.fields,
            node.fields,
            group(row),
            group(
              Array.isArray(oldRows) ? (oldRows[0] as UiFormReadonlyValue | undefined) : undefined,
            ),
            group(
              Array.isArray(newRows) ? (newRows[0] as UiFormReadonlyValue | undefined) : undefined,
            ),
            resetFields,
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
          resetFields.push(node.label)
          continue
        }
      }
      if (
        node.kind === 'rating' &&
        (typeof value !== 'number' ||
          value > (node.count ?? 5) ||
          !Number.isInteger(value * (node.allowHalf ? 2 : 1)))
      ) {
        resetFields.push(node.label)
        continue
      }
      if (
        node.kind === 'attachment' &&
        before.kind === 'attachment' &&
        before.source !== node.source
      ) {
        resetFields.push(node.label)
        continue
      }
      result[node.name] = JSON.parse(JSON.stringify(value)) as UiFormValue
    }
  }
  return result
}
