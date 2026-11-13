import assert from 'node:assert/strict'
import { watch } from 'vue'
import type { UiFormCopy, UiFormSchema } from '../../packages/ui/src/components/form-contracts'
import { useUiDynamicForm } from '../../packages/ui/src/composables/use-ui-dynamic-form'

export async function verifyDynamicForm(copy: UiFormCopy): Promise<void> {
  const original: UiFormSchema = {
    fields: [
      { kind: 'text', name: 'name', label: 'Name' },
      { kind: 'text', name: 'old', label: 'Old' },
    ],
    steps: [
      { name: 'identity', label: 'Identity', fields: ['name'] },
      { name: 'extra', label: 'Extra', fields: ['old'] },
    ],
  }
  const next: UiFormSchema = {
    fields: [
      { kind: 'text', name: 'name', label: 'Name' },
      { kind: 'number', name: 'added', label: 'Added', defaultValue: 7 },
    ],
    steps: [
      { name: 'extra', label: 'Extra', fields: ['added'] },
      { name: 'identity', label: 'Identity', fields: ['name'] },
    ],
  }
  let changes = 0
  let replacements = 0
  const owner = useUiDynamicForm({
    formId: 'dynamic',
    copy: { ...copy, previousStep: () => 'Back', nextStep: () => 'Next' },
    schema: original,
    initial: { draftId: 'record', values: { name: 'Initial', old: 'Do not rename' } },
    onChange: () => {
      changes += 1
    },
    onReplaced: ({ previous, current }) => {
      assert.equal(previous.phase.value, 'idle')
      assert.equal(current, owner.form.value)
      replacements += 1
    },
  })
  owner.form.value.setValue('name', 'Edited')
  assert.equal(changes, 1)
  const old = owner.form.value
  assert.equal((await owner.replaceSchema(next)).status, 'applied')
  assert.deepEqual(owner.form.value.getValues(), { name: 'Edited', added: 7 })
  assert.deepEqual(owner.form.value.getInitial().values, { name: 'Initial', added: 7 })
  assert.equal(owner.form.value.hasUnsavedChanges.value, true)
  assert.equal(owner.form.value.activeStepIndex.value, 1)
  assert.equal(old.phase.value, 'disposed')
  assert.equal(changes, 1, 'candidate migration must not emit external changes')
  assert.equal(replacements, 1)
  await assert.rejects(owner.replaceSchema({ fields: [{ kind: 'invalid' }] }))
  assert.equal(owner.form.value.getValue('name'), 'Edited')
  const binding = owner.form.value.field('name')
  binding.setPendingInput(true)
  assert.equal((await owner.replaceSchema(original)).status, 'blocked')
  binding.setPendingInput(false)
  const stale = owner.replaceSchema(original)
  owner.form.value.setValue('name', 'New edit')
  assert.equal((await stale).status, 'cancelled')
  assert.equal(owner.form.value.getValue('name'), 'New edit')
  const one = owner.replaceSchema(original)
  const two = owner.replaceSchema({ ...original, columns: 2 })
  assert.equal((await one).status, 'cancelled')
  assert.equal((await two).status, 'applied')
  assert.equal(owner.form.value.getValue('old'), '', 'removed+added names must not auto-rename')
  owner.dispose()
  assert.equal((await owner.replaceSchema(next)).status, 'disposed')
  let finishLoad:
    ((snapshot: { draftId: string; values: Record<string, string> }) => void) | undefined
  const loading = useUiDynamicForm({
    formId: 'dynamic-load',
    schema: { fields: [{ kind: 'text', name: 'name', label: 'Name' }] },
    copy,
    initial: { draftId: 'loading', values: { name: '' } },
  })
  const request = loading.form.value.load(
    () =>
      new Promise((resolve) => {
        finishLoad = resolve
      }),
  )
  assert.equal((await loading.replaceSchema({ fields: [] })).status, 'blocked')
  assert.ok(finishLoad)
  finishLoad({ draftId: 'loaded', values: { name: 'Loaded' } })
  await request
  assert.equal(loading.form.value.getValue('name'), 'Loaded')
  loading.dispose()

  let optionsSignal: AbortSignal | undefined
  let finishOptions: ((items: readonly { label: string; value: string }[]) => void) | undefined
  const optionsOwner = useUiDynamicForm({
    formId: 'dynamic-options',
    copy,
    schema: {
      fields: [{ kind: 'select', name: 'choice', label: 'Choice', options: { source: 'choices' } }],
    },
    initial: { draftId: 'options', values: { choice: null } },
    sources: {
      choices: (_values, context) => {
        optionsSignal = context.signal
        return new Promise((resolve) => {
          finishOptions = resolve
        })
      },
    },
  })
  await Promise.resolve()
  assert.ok(optionsSignal)
  assert.equal(
    (await optionsOwner.replaceSchema({ fields: [{ kind: 'text', name: 'name', label: 'Name' }] }))
      .status,
    'applied',
  )
  assert.equal(optionsSignal.aborted, true)
  finishOptions?.([{ label: 'Late', value: 'late' }])
  await Promise.resolve()
  assert.deepEqual(optionsOwner.form.value.getValues(), { name: '' })
  optionsOwner.dispose()
  const nestedSchema = (kind: 'text' | 'number'): UiFormSchema => ({
    fields: [
      {
        kind: 'group',
        name: 'first',
        label: 'Same',
        fields: [{ kind, name: 'value', label: 'Same' }],
      },
      {
        kind: 'group',
        name: 'second',
        label: 'Same',
        fields: [{ kind, name: 'value', label: 'Same' }],
      },
      {
        kind: 'repeat',
        name: 'rows',
        label: 'Same',
        fields: [{ kind, name: 'value', label: 'Same' }],
      },
    ],
  })
  const nested = useUiDynamicForm({
    formId: 'dynamic-paths',
    copy,
    schema: nestedSchema('text'),
    initial: {
      draftId: 'nested',
      values: {
        first: { value: 'A' },
        second: { value: 'B' },
        rows: [{ value: 'C' }, { value: 'D' }],
      },
    },
  })
  const migrated = await nested.replaceSchema(nestedSchema('number'))
  assert.equal(migrated.status, 'applied')
  assert.deepEqual(migrated.resetFields, [
    'first.value',
    'second.value',
    'rows.0.value',
    'rows.1.value',
  ])
  nested.dispose()

  const throwing = useUiDynamicForm({
    formId: 'dynamic-watcher',
    initial: { draftId: 'watcher', values: {} },
    copy,
    schema: { fields: [{ kind: 'text', name: 'name', label: 'Name' }] },
  })
  const replaced = throwing.form.value
  const stopThrowing = watch(
    throwing.form,
    () => {
      throw new Error('Sync publication failed')
    },
    { flush: 'sync' },
  )
  await assert.rejects(
    throwing.replaceSchema({ fields: [{ kind: 'text', name: 'other', label: 'Other' }] }),
    /Sync publication failed/,
  )
  stopThrowing()
  assert.equal(replaced.phase.value, 'disposed')
  assert.equal(
    (await throwing.replaceSchema({ fields: [{ kind: 'text', name: 'third', label: 'Third' }] }))
      .status,
    'applied',
  )
  throwing.dispose()
}
