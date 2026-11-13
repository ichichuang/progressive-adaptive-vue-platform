import { verifyFormAttachments } from './check-form-attachments'
import assert from 'node:assert/strict'
import type { UiFormCopy } from '../../packages/ui/src/components/form-contracts'
import { parseUiFormSchema } from '../../packages/ui/src/components/form-schema'
import {
  formatFormMask,
  isCompleteFormMask,
} from '../../packages/ui/src/components/form-special-values'
import { validateFormField } from '../../packages/ui/src/composables/form-validation'
import { useUiForm } from '../../packages/ui/src/composables/use-ui-form'

export async function verifyFormSpecialFields(copy: UiFormCopy): Promise<void> {
  assert.equal(formatFormMask('abc1234', 'AAA-####'), 'abc-1234')
  assert.equal(formatFormMask('abc-12', 'AAA-####'), 'abc-12')
  assert.equal(formatFormMask('abc-', 'AAA-####'), 'abc')
  assert.equal(isCompleteFormMask('abc-1234', 'AAA-####'), true)
  assert.equal(isCompleteFormMask('abc-12', 'AAA-####'), false)
  const schema = parseUiFormSchema({
    fields: [
      { kind: 'mask', name: 'code', label: 'Code', mask: 'AAA-####' },
      { kind: 'slider', name: 'progress', label: 'Progress', min: 0, max: 100, step: 5 },
      { kind: 'rating', name: 'rating', label: 'Rating', count: 5, allowHalf: true },
      { kind: 'attachment', name: 'files', label: 'Files', source: 'files', maxFiles: 1 },
    ],
  })
  assert.throws(
    () =>
      useUiForm({
        formId: 'missing-attachment-source',
        schema,
        copy,
        initial: { draftId: 'a', values: {} },
      }),
    /registered source/u,
  )
  const form = useUiForm({
    formId: 'special-fields',
    schema,
    copy: {
      ...copy,
      chooseAttachment: () => 'Choose',
      uploadingAttachment: () => 'Processing',
      attachmentFailed: () => 'Failed',
    },
    attachments: { files: () => Promise.resolve({ id: 'file', name: 'example.txt' }) },
    initial: { draftId: 'a', values: {} },
  })
  assert.deepEqual(form.getValues(), { code: '', progress: 0, rating: 0, files: [] })
  form.setValues({ code: 'abc-12', progress: 101 })
  assert.equal(await form.validate(), 'invalid')
  assert.deepEqual(form.issues.value.map((issue) => issue.field).sort(), ['code', 'progress'])
  form.setValues({
    code: 'abc-1234',
    progress: 50,
    rating: 4.5,
    files: [{ id: 'f', name: 'file.txt', size: 123 }],
  })
  assert.equal(await form.validate(), 'valid')
  const saved = JSON.parse(JSON.stringify(form.getValues())) as unknown
  form.replaceInitial({ draftId: 'b', values: saved as ReturnType<typeof form.getValues> })
  assert.deepEqual(form.getValue('files'), [{ id: 'f', name: 'file.txt', size: 123 }])
  assert.throws(() => form.setValue('rating', 4.2), /Incompatible/u)
  assert.throws(
    () =>
      form.setValue('files', [
        { id: 'f', name: 'A' },
        { id: 'f', name: 'B' },
      ]),
    /Incompatible/u,
  )
  assert.throws(() =>
    parseUiFormSchema({ fields: [{ kind: 'rating', name: 'x', label: 'X', count: 0 }] }),
  )
  assert.throws(() =>
    parseUiFormSchema({ fields: [{ kind: 'slider', name: 'x', label: 'X', min: 10, max: 1 }] }),
  )
  assert.throws(() =>
    parseUiFormSchema({ fields: [{ kind: 'mask', name: 'x', label: 'X', mask: 'literal' }] }),
  )
  assert.equal(
    validateFormField({ kind: 'rating', name: 'r', label: 'Rating' }, 0, true, copy)[0]?.message,
    copy.required,
  )
  const readonly = useUiForm({
    formId: 'readonly-special',
    schema: { fields: schema.fields.map((field) => ({ ...field, readonly: true })) },
    copy: {
      ...copy,
      chooseAttachment: () => 'Choose',
      uploadingAttachment: () => 'Processing',
      attachmentFailed: () => 'Failed',
    },
    attachments: { files: () => Promise.resolve({ id: 'never', name: 'never' }) },
    initial: { draftId: 'readonly', values: {} },
  })
  assert.equal(readonly.field('code').setValue('abc-1234'), 'blocked')
  assert.equal(readonly.field('progress').setValue(50), 'blocked')
  assert.equal(readonly.field('rating').setValue(4), 'blocked')
  assert.equal(readonly.field('files').setValue([{ id: 'f', name: 'file' }]), 'blocked')
  assert.equal(
    validateFormField(
      { kind: 'attachment', name: 'f', label: 'Files', source: 'files', maxSize: 10 },
      [{ id: 'f', name: 'file', size: 11 }],
      false,
      copy,
    ).length,
    1,
  )
  readonly.dispose()
  form.dispose()
  await verifyFormAttachments(copy)
}
