import type { UiFormSchema, UiRichTextDocument } from '@platform/ui'
import type { ConsoleTranslate } from '../../../shared/i18n'

/** Real structured content, shared by the editor, detail view and copied model. */
export function createFormRichTextExample(t: ConsoleTranslate) {
  const document: UiRichTextDocument = {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: t('formCapabilities.richText.sampleHeading') }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: t('formCapabilities.richText.sampleIntro') }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: t('formCapabilities.richText.sampleEmphasis'),
            marks: [{ type: 'bold' }],
          },
        ],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: t('formCapabilities.richText.sampleItemOne') }],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: t('formCapabilities.richText.sampleItemTwo') }],
              },
            ],
          },
        ],
      },
      {
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: t('formCapabilities.richText.sampleQuote') }],
          },
        ],
      },
    ],
  }
  const note: UiRichTextDocument = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: t('formCapabilities.richText.sampleNote') }],
      },
    ],
  }
  const schema = {
    columns: 1,
    fields: [
      {
        kind: 'text',
        name: 'title',
        label: 'formCapabilities.richText.title',
        defaultValue: t('formCapabilities.richText.sampleTitle'),
      },
      {
        kind: 'rich-text',
        name: 'body',
        label: 'formCapabilities.richText.body',
        description: 'formCapabilities.richText.bodyHint',
        required: true,
        defaultValue: document,
        rules: { maxLength: 2000, message: 'formCapabilities.richText.maxLength' },
      },
      {
        kind: 'rich-text',
        name: 'note',
        label: 'formCapabilities.richText.note',
        description: 'formCapabilities.richText.noteHint',
        tools: ['bold', 'italic', 'undo', 'redo'],
        defaultValue: note,
      },
    ],
  } as const satisfies UiFormSchema
  return { schema }
}
