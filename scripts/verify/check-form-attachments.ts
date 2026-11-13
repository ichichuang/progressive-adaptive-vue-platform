import assert from 'node:assert/strict'
import { computed, effectScope, shallowRef } from 'vue'
import type { UiFormAttachment, UiFormCopy } from '../../packages/ui/src/components/form-contracts'
import { useUiForm } from '../../packages/ui/src/composables/use-ui-form'
import { useFormAttachments } from '../../packages/ui/src/composables/use-form-attachments'

export async function verifyFormAttachments(copy: UiFormCopy): Promise<void> {
  const pending: {
    resolve: (value: UiFormAttachment) => void
    reject: (error: Error) => void
    signal: AbortSignal
  }[] = []
  const scope = effectScope()
  const state = scope.run(() => {
    const config = {
      kind: 'attachment',
      name: 'files',
      label: 'Files',
      source: 'files',
      maxFiles: 2,
      maxSize: 10,
      disabled: { field: 'state', operator: 'eq', value: 1 },
      readonly: { field: 'state', operator: 'eq', value: 2 },
      hidden: { field: 'state', operator: 'eq', value: 3 },
    } as const
    const form = useUiForm({
      formId: 'attachment-session-test',
      schema: {
        fields: [
          { kind: 'number', name: 'state', label: 'State', defaultValue: 0 },
          { kind: 'text', name: 'other', label: 'Other' },
          config,
        ],
      },
      initial: { draftId: 'a', values: {} },
      copy: {
        ...copy,
        chooseAttachment: () => 'Choose',
        uploadingAttachment: () => 'Processing',
        attachmentFailed: () => 'Failed',
      },
      attachments: {
        files: (_file, context) =>
          new Promise<UiFormAttachment>((resolve, reject) =>
            pending.push({ resolve, reject, signal: context.signal }),
          ),
      },
    })
    const currentBinding = shallowRef(form.field('files'))
    return {
      form,
      get binding() {
        return currentBinding.value
      },
      rebind() {
        currentBinding.value = form.field('files')
      },
      session: useFormAttachments({
        form,
        get binding() {
          return currentBinding.value
        },
        config,
      }),
    }
  })
  assert.ok(state)
  const { form, binding, session } = state
  const file = new File(['test'], 'test.txt')
  const first = session.choose(file)
  assert.equal(form.hasPendingInput.value, true)
  form.setValue('other', 'unrelated')
  assert.equal(form.hasPendingInput.value, true)
  assert.equal(pending[0]?.signal.aborted, false)
  pending[0].resolve({ id: 'one', name: 'one.txt', size: 4 })
  assert.equal(await first, true)
  assert.equal(form.hasPendingInput.value, false)
  assert.deepEqual(form.getValue('files'), [{ id: 'one', name: 'one.txt', size: 4 }])
  const stale = session.choose(file)
  form.setValue('files', [])
  assert.equal(pending[1]?.signal.aborted, true)
  pending[1].resolve({ id: 'stale', name: 'stale.txt' })
  assert.equal(await stale, false)
  assert.deepEqual(form.getValue('files'), [])
  for (const value of [1, 2, 3]) {
    const attempt = session.choose(file)
    const active = pending.at(-1)
    assert.ok(active)
    form.setValue('state', value)
    assert.equal(active.signal.aborted, true)
    active.resolve({ id: 'blocked', name: 'blocked.txt' })
    assert.equal(await attempt, false)
    assert.equal(await session.choose(file), false)
    form.setValue('state', 0)
  }
  const reset = session.choose(file)
  const resetting = pending.at(-1)
  form.reset()
  assert.equal(resetting?.signal.aborted, true)
  resetting.resolve({ id: 'reset', name: 'reset.txt' })
  assert.equal(await reset, false)
  assert.deepEqual(form.getValue('files'), [])
  state.rebind() // Vue mounts a fresh keyed binding after a form reset.
  assert.equal(await session.choose(new File(['too many bytes'], 'large.txt')), false)
  assert.equal(session.failed.value, true)
  const failed = session.choose(file)
  pending.at(-1)?.reject(new Error('unavailable'))
  assert.equal(await failed, false)
  assert.equal(form.hasPendingInput.value, false)
  const invalid = session.choose(file)
  pending.at(-1)?.resolve({ id: 'big', name: 'big.txt', size: 100 })
  assert.equal(await invalid, false)
  // A cancelled owner settling must not clear a newer owner's pending flag.
  const old = session.choose(file)
  const oldRequest = pending.at(-1)
  session.cancel()
  const replacement = session.choose(file)
  const replacementRequest = pending.at(-1)
  oldRequest?.resolve({ id: 'old', name: 'old.txt' })
  assert.equal(await old, false)
  assert.equal(form.hasPendingInput.value, true)
  replacementRequest?.resolve({ id: 'new', name: 'new.txt', size: 4 })
  assert.equal(await replacement, true)
  const duplicate = session.choose(file)
  pending.at(-1)?.resolve({ id: 'new', name: 'duplicate.txt' })
  assert.equal(await duplicate, false)
  session.remove('new')
  assert.deepEqual(form.getValue('files'), [])
  const disposed = session.choose(file)
  const disposing = pending.at(-1)
  scope.stop()
  assert.equal(disposing?.signal.aborted, true)
  disposing.resolve({ id: 'disposed', name: 'disposed.txt' })
  assert.equal(await disposed, false)
  assert.equal(binding.pendingInput, false)
  console.log(
    'Attachment field: success, unrelated edits, competing field replacement, disabled/readonly/hidden, reset, failure, limits and disposal passed.',
  )
  const mediaScope = effectScope()
  let finishCrop: ((value: File | null) => void) | undefined
  let cropSignal: AbortSignal | undefined
  let uploads = 0
  const mediaState = mediaScope.run(() => {
    const config = {
      kind: 'attachment',
      name: 'photo',
      label: 'Photo',
      source: 'photos',
      imageProcessing: { crop: {} },
      maxSize: 20,
    } as const
    const mediaForm = useUiForm({
      formId: 'crop-lifecycle',
      schema: { fields: [config] },
      initial: { draftId: 'crop', values: { photo: [{ id: 'kept', name: 'kept.png' }] } },
      copy: {
        ...copy,
        chooseAttachment: () => 'Choose',
        uploadingAttachment: () => 'Processing',
        attachmentFailed: () => 'Failed',
        media: {
          cropTitle: () => 'Crop',
          previewTitle: () => 'Preview',
          cancel: () => 'Cancel',
          confirm: () => 'Use',
          rotateLeft: () => 'Left',
          rotateRight: () => 'Right',
          reset: () => 'Reset',
          processing: () => 'Processing',
          loading: () => 'Loading',
          failed: () => 'Failed',
          previousPage: () => 'Previous',
          nextPage: () => 'Next',
          zoomIn: () => 'Zoom in',
          zoomOut: () => 'Zoom out',
        },
      },
      attachments: {
        photos: {
          upload: (selected, { signal }) => {
            signal.throwIfAborted()
            uploads++
            return Promise.resolve({ id: 'uploaded', name: selected.name })
          },
          resolvePreview: () => Promise.resolve(new Blob()),
        },
      },
    })
    const reactiveBinding = computed(() => {
      void mediaForm.hasPendingInput.value
      void mediaForm.revision.value
      return mediaForm.field('photo')
    })
    const mediaSession = useFormAttachments({
      form: mediaForm,
      get binding() {
        return reactiveBinding.value
      },
      config,
      processImage: (_file, _options, signal) => {
        cropSignal = signal
        return new Promise((resolve) => {
          finishCrop = resolve
        })
      },
    })
    return { mediaForm, mediaSession }
  })
  assert.ok(mediaState)
  const cancelledCrop = mediaState.mediaSession.choose(file)
  assert.equal(mediaState.mediaForm.hasPendingInput.value, true)
  finishCrop?.(null)
  assert.equal(await cancelledCrop, false)
  assert.equal(mediaState.mediaSession.failed.value, false)
  assert.equal(uploads, 0)
  assert.deepEqual(mediaState.mediaForm.getValue('photo'), [{ id: 'kept', name: 'kept.png' }])
  const largeOriginal = new File(['x'.repeat(30)], 'original.png', { type: 'image/png' })
  const completedCrop = mediaState.mediaSession.choose(largeOriginal)
  assert.equal(cropSignal?.aborted, false)
  finishCrop?.(file)
  assert.equal(await completedCrop, true)
  assert.equal(uploads, 1)
  assert.equal(mediaState.mediaForm.hasPendingInput.value, false)
  const oversizedOutput = mediaState.mediaSession.choose(largeOriginal)
  finishCrop?.(new File(['x'.repeat(21)], 'still-large.png', { type: 'image/png' }))
  assert.equal(await oversizedOutput, false)
  assert.equal(uploads, 1)
  assert.equal(mediaState.mediaSession.failed.value, true)
  assert.equal(mediaState.mediaForm.hasPendingInput.value, false)
  const resetCrop = mediaState.mediaSession.choose(file)
  mediaState.mediaForm.reset()
  assert.equal(cropSignal.aborted, true)
  finishCrop?.(file)
  assert.equal(await resetCrop, false)
  assert.equal(uploads, 1)
  mediaScope.stop()
}
