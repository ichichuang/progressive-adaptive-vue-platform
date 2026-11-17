import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { shallowRef } from 'vue'
import type {
  UiFormCopy,
  UiFormProjectedOperation,
  UiFormProjection,
} from '../../packages/ui/src/components/form-contracts'
import { useUiForm } from '../../packages/ui/src/composables/use-ui-form'

export async function verifyControlledForm(copy: UiFormCopy): Promise<void> {
  const schema = {
    fields: [
      { name: 'name', label: 'Name', kind: 'text', required: true },
      { name: 'unchanged', label: 'Unchanged', kind: 'text', hidden: true },
      {
        name: 'account',
        label: 'Account',
        kind: 'group',
        fields: [
          { name: 'label', label: 'Label', kind: 'text' },
          { name: 'owner', label: 'Owner', kind: 'text' },
          { name: 'hidden', label: 'Hidden', kind: 'text', defaultValue: 'inaccessible default' },
        ],
      },
      {
        name: 'key',
        label: 'Key',
        kind: 'text',
        required: true,
        defaultValue: 'inaccessible default',
      },
      {
        name: 'dependent',
        label: 'Dependent',
        kind: 'text',
        hidden: {
          field: 'key',
          operator: 'not-empty',
        },
      },
      {
        name: 'rows',
        label: 'Rows',
        kind: 'repeat',
        fields: [{ name: 'label', label: 'Label', kind: 'text' }],
      },
    ],
  } as const
  const session = shallowRef<object | undefined>({})
  const readName = shallowRef(true)
  const writeName = shallowRef(true)
  const mode = shallowRef<ReturnType<UiFormProjection['mode']>>('edit')
  const snapshot = shallowRef({
    receipt: 'receipt',
    values: {
      name: 'Confirmed',
      unchanged: 'Original hidden',
      account: { label: 'Label', owner: 'Owner', hidden: 'Private sibling' },
      key: 'Private original',
      dependent: 'Private derived display',
      rows: [{ label: 'Private row' }],
    },
    isCurrent: () => true,
  })
  const patches: UiFormProjectedOperation['patch'][] = []
  let allowValidation: (() => void) | undefined
  let enteredValidation: (() => void) | undefined
  let delay = false
  const projection: UiFormProjection = {
    session: () => session.value,
    mode: () => mode.value,
    canRead: () => session.value !== undefined,
    canSubmit: () => session.value !== undefined && mode.value !== 'detail',
    confirmed: () => snapshot.value,
    field(path) {
      if (path === 'name') return { read: readName.value, write: writeName.value }
      if (path === 'account.hidden' || path === 'rows') return { read: false, write: false }
      if (path === 'account.owner') return { read: true, write: false }
      if (path === 'key') return { read: false, write: true }
      return { read: true, write: true }
    },
    async validate() {
      if (delay)
        await new Promise<void>((resolve) => {
          allowValidation = resolve
          enteredValidation?.()
        })
      return 'valid' as const
    },
    submit(operation) {
      assert.equal(operation.isCurrent(), true)
      patches.push(operation.patch)
      return Promise.resolve('success')
    },
  }
  const form = useUiForm({
    formId: 'field-projection-probe',
    schema,
    copy,
    projection,
    initial: { draftId: 'draft', values: undefined },
  })
  try {
    assert.equal(form.persistence, 'disabled')
    assert.equal(form.field('account.owner').readonly, true)
    assert.equal(form.field('account.hidden').hidden, true)
    assert.equal(form.field('key').value, null)
    assert.equal(form.getValue('account.hidden'), undefined)
    assert.equal(form.getValue('key'), undefined)
    assert.equal(form.nodeState('dependent').hidden, true)
    assert.equal(form.nodeState('rows').hidden, true)
    assert.equal(form.moveItem('rows', 0, 0), 'blocked')
    assert.equal(form.setValue('account', { label: 'Injected' }), 'blocked')
    form.field('account.label').setValue('New label')
    assert.equal(form.setValue('unchanged', 'Business-only value'), 'applied')
    assert.equal(await form.submit(), 'success')
    assert.deepEqual(patches[0], {
      account: { label: 'New label' },
      unchanged: 'Business-only value',
    })
    assert.equal(form.getInitial().values.account.owner, 'Owner')

    form.field('key').setValue('fresh')
    assert.equal(form.field('key').value, 'fresh')
    assert.equal(form.getValue('key'), undefined)
    assert.equal(form.field('name').setValue('Unacknowledged edit'), 'applied')
    writeName.value = false
    assert.equal(form.field('name').value, 'Confirmed')
    assert.equal(form.field('key').value, 'fresh')
    assert.equal(await form.submit(), 'success')
    assert.deepEqual(patches[1], { key: 'fresh' })
    assert.equal(form.field('key').value, null)
    assert.equal(form.field('key').setValue(''), 'applied')
    assert.equal(await form.submit(), 'invalid')
    assert.ok(form.issues.value.some(({ field }) => field === 'key'))

    readName.value = false
    assert.equal(form.getValue('name'), undefined)
    assert.equal(form.field('name').hidden, true)
    writeName.value = true
    assert.equal(form.field('name').value, null)
    assert.equal(form.field('name').setValue('New only'), 'applied')
    readName.value = true
    assert.equal(form.getInitial().values.name, undefined)
    snapshot.value = {
      ...snapshot.value,
      receipt: 'new receipt',
      values: { ...snapshot.value.values, name: 'Fresh confirmed' },
    }
    assert.equal(form.field('name').value, 'Fresh confirmed')
    assert.equal(form.field('key').value, null)

    delay = true
    assert.equal(form.field('name').setValue('Stale value'), 'applied')
    const validationStarted = new Promise<void>((resolve) => {
      enteredValidation = resolve
    })
    const pending = form.submit()
    await validationStarted
    writeName.value = false
    allowValidation?.()
    assert.equal(await pending, 'cancelled')
    assert.equal(patches.length, 2)
    assert.equal(form.field('name').value, 'Fresh confirmed')
    assert.equal(form.issues.value.length, 0)
    mode.value = 'create'
    assert.equal(await form.validateFields(['key']), 'invalid')
    assert.equal(
      form.issues.value.some(({ field }) => field === 'key'),
      true,
    )
    form.field('key').setValue('Creation value')
    assert.equal(await form.validateFields(['key']), 'valid')
    mode.value = 'detail'
    assert.equal(form.field('key').hidden, true)
    assert.equal(await form.submit(), 'cancelled')
    session.value = undefined
    assert.equal(form.getValue('name'), undefined)
  } finally {
    form.dispose()
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href &&
  process.argv.includes('--browser')
) {
  const { serveControlledFormBrowserProbe } = await import('./controlled-form-browser-probe')
  await serveControlledFormBrowserProbe()
}
