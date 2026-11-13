import assert from 'node:assert/strict'
import { effectScope } from 'vue'
import { useUiForm } from '../../packages/ui/src/composables/use-ui-form'
import { useFormAttachments } from '../../packages/ui/src/composables/use-form-attachments'
import { createFormUploadSource } from '../../apps/web/src/app/forms/create-form-upload-source'

export async function verifyFormUploadSource(): Promise<void> {
  const turns = async (): Promise<void> => {
    for (let i = 0; i < 12; i++) await Promise.resolve()
  }
  let rejectNext = false
  const completes: ((value: { id: string; name: string }) => void)[] = []
  const uploads = createFormUploadSource({
    chunkSize: 2,
    adapter: {
      uploadChunk() {
        return rejectNext ? Promise.reject(new Error('Offline')) : Promise.resolve()
      },
      complete() {
        return new Promise((resolve) => {
          completes.push(resolve)
        })
      },
    },
  })
  const file = new File(['sample'], 'attachment.txt')
  const context = () => ({ signal: new AbortController().signal, field: 'files' })
  const first = uploads.source(file, context())
  await turns()
  completes[0]?.({ id: 'server-reference', name: file.name })
  assert.deepEqual(await first, { id: 'server-reference', name: file.name })
  rejectNext = true
  await assert.rejects(uploads.source(file, context()), /Offline/u)
  rejectNext = false
  const controller = new AbortController()
  const cancelled = uploads.source(file, { signal: controller.signal, field: 'files' })
  const rejection = assert.rejects(cancelled, { name: 'AbortError' })
  await turns()
  controller.abort()
  await rejection
  completes[1]?.({ id: 'late', name: file.name })
  await turns()
  assert.equal(uploads.queue.snapshot()[2]?.status, 'cancelled')
  const disposed = uploads.source(file, context())
  const disposal = assert.rejects(disposed, { name: 'AbortError' })
  uploads.queue.dispose()
  await disposal
  await assert.rejects(uploads.source(file, context()), { name: 'AbortError' })
  const preAborted = new AbortController()
  preAborted.abort()
  await assert.rejects(uploads.source(file, { signal: preAborted.signal, field: 'files' }), {
    name: 'AbortError',
  })
  await verifyFormUploadLifecycle()
  console.log(
    'Form upload bridge: confirmed reference, failure, abort, late result and disposal passed.',
  )
}

async function verifyFormUploadLifecycle(): Promise<void> {
  const completions: ((value: { id: string; name: string }) => void)[] = []
  const uploads = createFormUploadSource({
    chunkSize: 8,
    adapter: {
      uploadChunk: () => Promise.resolve(),
      complete: () =>
        new Promise((resolve) => {
          completions.push(resolve)
        }),
    },
  })
  const text = () => 'Message'
  const scope = effectScope()
  const state = scope.run(() => {
    const config = { kind: 'attachment', name: 'files', label: 'Files', source: 'upload' } as const
    const form = useUiForm({
      formId: 'form-upload-integration',
      initial: { draftId: 'a', values: {} },
      schema: { fields: [{ kind: 'text', name: 'other', label: 'Other' }, config] },
      attachments: { upload: uploads.source },
      copy: {
        submit: text,
        reset: text,
        required: text,
        loadingOptions: text,
        noOptions: text,
        optionsFailed: text,
        retryOptions: text,
        validating: text,
        submitting: text,
        submitSucceeded: text,
        submitFailed: text,
        validationUnavailable: text,
        inputIncomplete: text,
        errorSummary: text,
        empty: text,
        yes: text,
        no: text,
        addItem: text,
        insertItem: text,
        duplicateItem: text,
        removeItem: text,
        moveUp: text,
        moveDown: text,
        minItems: text,
        maxItems: text,
        invalidValue: text,
        chooseAttachment: text,
        uploadingAttachment: text,
        attachmentFailed: text,
      },
    })
    return { form, session: useFormAttachments({ form, binding: form.field('files'), config }) }
  })
  assert.ok(state)
  const turns = async (): Promise<void> => {
    for (let i = 0; i < 12; i++) await Promise.resolve()
  }
  const file = new File(['data'], 'data.txt')
  const chosen = state.session.choose(file)
  state.form.setValue('other', 'unrelated')
  await turns()
  assert.equal(state.form.hasPendingInput.value, true)
  completions[0]?.({ id: 'confirmed', name: file.name })
  assert.equal(await chosen, true)
  assert.deepEqual(state.form.getValue('files'), [{ id: 'confirmed', name: file.name }])
  const resetting = state.session.choose(file)
  await turns()
  state.form.reset()
  assert.equal(await resetting, false)
  assert.equal(uploads.queue.snapshot()[1]?.status, 'cancelled')
  completions[1]?.({ id: 'late-reset', name: file.name })
  await turns()
  assert.deepEqual(state.form.getValue('files'), [])
  assert.equal(state.form.hasPendingInput.value, false)
  const leaving = state.session.choose(file)
  await turns()
  scope.stop()
  assert.equal(await leaving, false)
  assert.equal(uploads.queue.snapshot()[2]?.status, 'cancelled')
  completions[2]?.({ id: 'late-scope', name: file.name })
  await turns()
  assert.deepEqual(state.form.getValue('files'), [])
  uploads.queue.dispose()
  state.form.dispose()
}
