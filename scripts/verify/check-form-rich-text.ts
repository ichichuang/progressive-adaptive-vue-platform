import { formPresentation } from '../../packages/ui/src/composables/form-presentation'
import { normalizeRichTextDocument } from '../../packages/ui/src/adapters/naive/rich-text-value'
import assert from 'node:assert/strict'
import type { UiFormCopy, UiFormSchema } from '../../packages/ui/src/components/form-contracts'
import {
  emptyRichTextDocument,
  isRichTextUri,
  parseRichTextDocument,
  richTextPlainText,
} from '../../packages/ui/src/components/rich-text-document'
import { useUiForm } from '../../packages/ui/src/composables/use-ui-form'
import { useUiDynamicForm } from '../../packages/ui/src/composables/use-ui-dynamic-form'

export async function verifyFormRichText(copy: UiFormCopy): Promise<void> {
  const doc = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Hello', marks: [{ type: 'bold' }] }] },
    ],
  }
  const parsed = parseRichTextDocument(doc)
  const linked = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Link',
            marks: [
              {
                type: 'link',
                attrs: {
                  href: 'https://example.com',
                  target: '_blank',
                  rel: 'noopener noreferrer nofollow',
                  class: null,
                  title: null,
                },
              },
            ],
          },
          { type: 'hardBreak', marks: [{ type: 'bold' }] },
          { type: 'text', text: 'Next' },
        ],
      },
    ],
  }
  const normalized = normalizeRichTextDocument(linked)
  assert.equal(richTextPlainText(normalized), 'Link\nNext')
  assert.equal(JSON.stringify(normalized).includes('title'), false)
  assert.deepEqual(normalized.content[0], {
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text: 'Link',
        marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
      },
      { type: 'hardBreak' },
      { type: 'text', text: 'Next' },
    ],
  })
  assert.throws(
    () => parseRichTextDocument(linked),
    'vendor defaults do not weaken external JSON contract',
  )
  for (const marks of [
    [{ type: 'unknown' }],
    [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
  ])
    assert.throws(() =>
      normalizeRichTextDocument({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'hardBreak', marks }] }],
      }),
    )
  assert.throws(() =>
    normalizeRichTextDocument({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'bad',
              marks: [
                {
                  type: 'link',
                  attrs: { href: 'https://example.com', target: 'noopener noreferrer nofollow' },
                },
              ],
            },
          ],
        },
      ],
    }),
  )

  assert.equal(richTextPlainText(parsed), 'Hello')
  assert.notEqual(parsed, doc)
  for (const href of [
    'javascript:alert(1)',
    'data:text/html,test',
    'blob:https://test/id',
    'file:///tmp/a',
    '/relative',
    'https://user:pass@test.com',
    'https://test.com\n',
  ])
    assert.equal(isRichTextUri(href), false)
  assert.equal(isRichTextUri('https://example.com/path?q=1#part'), true)
  for (const value of [
    '<p>HTML</p>',
    { type: 'doc', content: [{ type: 'image', attrs: { src: 'https://example.com' } }] },
    { type: 'doc', content: [{ type: 'paragraph', attrs: { style: 'color:red' } }] },
    {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'bad',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
            },
          ],
        },
      ],
    },
  ])
    assert.throws(() => parseRichTextDocument(value))
  const staticSchema = {
    fields: [
      {
        kind: 'rich-text',
        name: 'static',
        label: 'Static',
        defaultValue: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Static' }] }],
        },
      },
    ],
  } as const satisfies UiFormSchema
  assert.equal(staticSchema.fields[0].defaultValue.content[0].content[0].text, 'Static')
  assert.throws(() =>
    parseRichTextDocument({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x'.repeat(100001) }] }],
    }),
  )
  const schema: UiFormSchema = {
    fields: [
      { kind: 'rich-text', name: 'body', label: 'Body', required: true, rules: { maxLength: 8 } },
      { kind: 'text', name: 'other', label: 'Other' },
    ],
  }
  const form = useUiForm({ formId: 'rich', schema, copy, initial: { draftId: 'rich', values: {} } })
  assert.deepEqual(form.getValue('body'), emptyRichTextDocument())
  assert.equal(await form.validate(), 'invalid')
  form.setValue('body', parsed)
  const external = parseRichTextDocument({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'New' }] }],
  })
  form.setValue('body', external)
  assert.deepEqual(
    form.field('body').value,
    external,
    'external values must remain canonical when read by the editor',
  )
  form.setValue('body', parsed)
  assert.equal(await form.validate(), 'valid')
  const before = form.getValues()
  assert.throws(() => form.setValue('body', { type: 'doc', content: [{ type: 'script' }] }))
  assert.deepEqual(form.getValues(), before)
  form.field('other').setPendingInput(true)
  form.resetFields(['body'])
  assert.equal(form.field('other').pendingInput, true)
  form.field('other').setPendingInput(false)
  for (const local of [false, true]) {
    const buffered = form.field('body')
    const identity = formPresentation(form).fieldIdentity('body')
    buffered.setCommitTarget(() => false)
    buffered.setPendingInput(true)
    if (local) form.resetFields(['body'])
    else form.reset()
    assert.notEqual(
      formPresentation(form).fieldIdentity('body'),
      identity,
      'same-value reset remounts editor buffer',
    )
    assert.equal(form.hasPendingInput.value, false)
    buffered.setValue(parsed)
    assert.deepEqual(
      form.getValue('body'),
      emptyRichTextDocument(),
      'late composition cannot publish after reset',
    )
  }
  form.dispose()
  const owner = useUiDynamicForm({
    formId: 'rich-migrate',
    schema,
    copy,
    initial: { draftId: 'rich', values: { body: parsed } },
  })
  assert.equal((await owner.replaceSchema({ ...schema, columns: 2 })).status, 'applied')
  assert.deepEqual(owner.form.value.getValue('body'), parsed)
  owner.dispose()
  const repeated = useUiForm({
    formId: 'rich-repeat',
    copy,
    schema: {
      fields: [
        {
          kind: 'repeat',
          name: 'rows',
          label: 'Rows',
          fields: [{ kind: 'rich-text', name: 'body', label: 'Body' }],
        },
      ],
    },
    initial: {
      draftId: 'repeat',
      values: { rows: [{ body: parsed }, { body: emptyRichTextDocument() }] },
    },
  })
  const binding = repeated.field('rows.0.body')
  binding.setCommitTarget(() => true)
  const keys = repeated.rowKeys('rows')
  repeated.moveItem('rows', 0, 1)
  assert.equal(binding.name, 'rows.1.body')
  assert.equal(repeated.rowKeys('rows')[1], keys[0])
  binding.setValue(emptyRichTextDocument())
  assert.deepEqual(repeated.getValue('rows.1.body'), emptyRichTextDocument())
  repeated.removeItem('rows', 1)
  binding.setValue(parsed)
  assert.deepEqual(
    repeated.getValue('rows.0.body'),
    emptyRichTextDocument(),
    'removed editor cannot publish into another row',
  )
  repeated.dispose()
}
