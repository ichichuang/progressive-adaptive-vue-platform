import assert from 'node:assert/strict'
import { useUiForm } from '../../packages/ui/src/composables/use-ui-form'
import type { UiFormCopy } from '../../packages/ui/src/components/form-contracts'
import { captureUiFormReport } from '../../packages/ui/src/components/report-form'
import {
  createUiReportSnapshot,
  captureUiChartReport,
} from '../../packages/ui/src/components/report-snapshot'
import type { UiG2ChartHandle } from '../../packages/ui/src/components/g2-chart-contracts'

export async function verifyReportForm(copy: UiFormCopy): Promise<void> {
  const form = useUiForm({
    formId: 'report-form',
    copy,
    schema: {
      fields: [
        { kind: 'text', name: 'title', label: 'Title' },
        {
          kind: 'group',
          name: 'private',
          label: 'Private',
          hidden: true,
          fields: [{ kind: 'text', name: 'secret', label: 'Secret' }],
        },
        {
          kind: 'group',
          name: 'details',
          label: 'Details',
          fields: [
            {
              kind: 'repeat',
              name: 'contacts',
              label: 'Contacts',
              fields: [{ kind: 'text', name: 'name', label: 'Name' }],
            },
          ],
        },
        { kind: 'rich-text', name: 'body', label: 'Body' },
      ],
    },
    initial: {
      draftId: 'one',
      values: {
        title: 'Original',
        private: { secret: 'DO NOT EXPORT' },
        details: { contacts: [{ name: 'First' }, { name: 'Second' }] },
        body: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Rich words', marks: [{ type: 'bold' }] }],
            },
          ],
        },
      },
    },
  })
  const section = captureUiFormReport(form, { title: 'Form' })
  assert.equal(section.fields.length, 4)
  assert.equal(JSON.stringify(section).includes('DO NOT EXPORT'), false)
  assert.equal(section.fields[1]?.group, 'Details / Contacts 1')
  assert.equal(section.fields[2]?.group, 'Details / Contacts 2')
  const richText = section.fields[3]?.richText
  assert.ok(richText)
  assert.equal(richText.content[0]?.type, 'paragraph')
  assert.equal(Object.isFrozen(richText.content), true)
  const snapshot = createUiReportSnapshot({ title: 'Report', sections: [section] })
  form.field('title').setValue('Changed')
  assert.equal(section.fields[0]?.text, 'Original')
  assert.equal(snapshot.sections[0]?.kind, 'form')
  const titleBinding = form.field('title')
  titleBinding.setPendingInput(true)
  assert.throws(() => captureUiFormReport(form, { title: 'Pending' }), /ready/u)
  titleBinding.setPendingInput(false)
  assert.throws(
    () => captureUiFormReport(form, { title: 'Unknown', includeFields: ['unknown'] }),
    /existing/u,
  )
  form.dispose()
  assert.throws(() => captureUiFormReport(form, { title: 'Disposed' }), /ready/u)

  const custom = useUiForm({
    formId: 'report-custom',
    copy,
    schema: { fields: [{ kind: 'custom', name: 'custom', label: 'Custom' }] },
    initial: { draftId: 'custom', values: { custom: { note: 'value' } } },
  })
  assert.throws(() => captureUiFormReport(custom, { title: 'Custom' }), /formatter/u)
  assert.equal(
    captureUiFormReport(custom, { title: 'Custom', formatCustom: () => 'Readable' }).fields[0]
      ?.text,
    'Readable',
  )
  custom.dispose()

  let finish: ((value: Blob) => void) | undefined
  const chart: UiG2ChartHandle = {
    exportImage: () =>
      new Promise((resolve) => {
        finish = resolve
      }),
    playTour() {
      return undefined
    },
    pauseTour() {
      return undefined
    },
    stopTour() {
      return undefined
    },
    nextTour() {
      return undefined
    },
    previousTour() {
      return undefined
    },
  }
  const abort = new AbortController()
  const pending = captureUiChartReport(chart, {
    title: 'Chart',
    alt: 'Trend',
    signal: abort.signal,
  })
  abort.abort()
  finish?.(new Blob(['PNG'], { type: 'image/png' }))
  await assert.rejects(pending)
  const image = await captureUiChartReport(
    { ...chart, exportImage: () => Promise.resolve(new Blob(['PNG'], { type: 'image/png' })) },
    { title: 'Chart', alt: 'Trend' },
  )
  assert.equal(image.kind, 'chart')
  assert.equal(image.image.type, 'image/png')
  console.log(
    'Report form: hidden ancestry, repeat labels, rich text, pending, custom projection, immutable snapshot and late chart cancellation passed.',
  )
}
