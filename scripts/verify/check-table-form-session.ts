import assert from 'node:assert/strict'
import type { UiFormCopy } from '../../packages/ui/src/components/form-contracts'
import type {
  UiTableSchema,
  UiTableTransport,
} from '../../packages/ui/src/components/table-contracts'
import { InlineFormScopeError } from '../../packages/ui/src/components/table-inline-form'
import { useUiTable } from '../../packages/ui/src/composables/use-ui-table'
import { useUiTableForm } from '../../packages/ui/src/composables/use-ui-table-form'

export async function verifyTableFormSession(copy: UiFormCopy): Promise<void> {
  const attachmentsCopy = {
    ...copy,
    chooseAttachment: () => 'Choose',
    uploadingAttachment: () => 'Uploading',
    attachmentFailed: () => 'Upload failed',
  }
  const file = { id: 'ref', name: 'sample.txt', size: 4 }
  const row = { id: 1, files: [file] }
  const attachmentForm = {
    fields: [{ kind: 'attachment', name: 'files', label: 'Files', source: 'files' }],
  } as const
  const transport: UiTableTransport = { list: () => Promise.resolve({ rows: [], total: 0 }) }

  for (const presentation of ['modal', 'drawer', 'page'] as const) {
    const table = useUiTable({
      schema: {
        id: 'attachment-editor',
        rowKey: 'id',
        source: { kind: 'local' },
        columns: [{ key: 'id', title: 'ID' }],
        editor: { presentation, form: attachmentForm },
      },
      immediate: false,
    })
    const editor = useUiTableForm({
      table,
      transport,
      copy: attachmentsCopy,
      attachments: { files: { upload: () => Promise.resolve(file) } },
    })
    for (const mode of ['create', 'edit', 'detail'] as const) {
      assert.equal(await editor.show(mode, mode === 'create' ? {} : row), true)
      assert.ok(editor.form.value)
      if (mode !== 'create') assert.deepEqual(editor.form.value.getValue('files'), [file])
      assert.equal(editor.close(), true)
    }
    const missing = useUiTableForm({ table, transport, copy: attachmentsCopy })
    assert.equal(await missing.show('detail', row), false)
    assert.match(missing.error.value?.message ?? '', /trusted registered source/u)
    assert.equal(missing.open.value, true, 'Full editor keeps its error surface.')
    assert.equal(missing.close(), true)
    missing.dispose()
    editor.dispose()
    table.dispose()
  }

  const inline = {
    id: 'dependent-inline',
    rowKey: 'id',
    source: { kind: 'local' },
    columns: [
      { key: 'active', title: 'Active' },
      { key: 'title', title: 'Title' },
    ],
    editor: {
      detail: { api: 'detail', method: 'GET' },
      update: { api: 'update', method: 'PATCH' },
      inline: { mode: 'row', fields: ['active', 'title'] },
      form: {
        fields: [
          { kind: 'switch', name: 'active', label: 'Active' },
          {
            kind: 'text',
            name: 'title',
            label: 'Title',
            required: { field: 'active', operator: 'eq', value: true },
          },
        ],
      },
    },
  } as const satisfies UiTableSchema
  assert.throws(
    () =>
      useUiTable({
        schema: {
          ...inline,
          editor: { ...inline.editor, inline: { mode: 'cell', fields: ['title'] } },
        },
        immediate: false,
      }),
    /Inline fields \[title\].*Unknown form dependency: active/u,
  )
  const table = useUiTable({ schema: inline, immediate: false })
  let details = 0
  let rejectObsoleteDetail: ((cause: Error) => void) | undefined
  const editor = useUiTableForm({
    table,
    copy,
    transport: {
      ...transport,
      detail: () => {
        details += 1
        if (details === 1) return Promise.reject(new Error('Detail unavailable'))
        if (details === 3)
          return new Promise((_resolve, reject) => {
            rejectObsoleteDetail = reject
          })
        return Promise.resolve({ id: 2, active: true, title: 'Valid' })
      },
    },
  })
  assert.equal(await editor.showInline({ id: 2 }, 'title'), false)
  const scopeFailure = editor.error.value
  assert.ok(scopeFailure instanceof InlineFormScopeError)
  assert.match(scopeFailure.message, /Unknown form dependency: active/u)
  assert.equal(details, 0, 'Unsupported editor scope does not start a detail request.')
  assert.equal(editor.open.value, false)
  assert.equal(await editor.showInline({ id: 2 }), false)
  const transportFailure = editor.error.value
  assert.ok(transportFailure)
  assert.notEqual(transportFailure.constructor, InlineFormScopeError)
  assert.match(transportFailure.message, /Detail unavailable/u)
  assert.equal(editor.open.value, false)
  assert.equal(await editor.showInline({ id: 2 }), true)
  editor.release()
  assert.ok(editor.form.value, 'A prior leave transition cannot release an open session.')
  assert.deepEqual(editor.inlineFields.value, ['active', 'title'])
  assert.equal(editor.form.value.field('title').required, true)
  assert.equal(editor.close(), true)
  const obsolete = editor.showInline({ id: 3 })
  assert.equal(editor.close(), true)
  assert.equal(await editor.showInline({ id: 2 }), true)
  assert.ok(rejectObsoleteDetail)
  rejectObsoleteDetail(new Error('Obsolete detail failed'))
  assert.equal(await obsolete, false)
  assert.equal(editor.error.value, null)
  assert.equal(editor.isInlineEditing({ id: 2 }, 'title'), true)
  editor.dispose()
  table.dispose()
}
