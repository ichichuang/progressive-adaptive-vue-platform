import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { ref } from 'vue'
import type { ConsoleTranslate } from '../../apps/web/src/shared/i18n'
import english from '../../apps/web/src/shared/i18n/messages/en/console.json'
import chinese from '../../apps/web/src/shared/i18n/messages/zh-CN/console.json'
import type { previewValues as ProjectPreview } from '../../apps/web/src/app/workbench/forms/builder/form-preview-values'
import type { UiFormNode } from '../../packages/ui/src/components/form-contracts'
import type { useFormBuilder as CreateBuilder } from '../../apps/web/src/app/workbench/forms/builder/use-form-builder'

export async function verifyFormBuilderFields(): Promise<void> {
  await verifyPreviewMigration()
  // Re-export the actual public parser and tool authority without loading the SFC graph.
  const server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    plugins: [
      {
        name: 'builder-public-ui-exports',
        enforce: 'pre',
        resolveId(id) {
          return id === '@platform/ui' ? '\0builder-public-ui-exports' : undefined
        },
        load(id) {
          if (id !== '\0builder-public-ui-exports') return undefined
          return `export { parseUiFormSchema } from ${JSON.stringify(resolve('packages/ui/src/components/form-schema.ts'))}; export { richTextTools } from ${JSON.stringify(resolve('packages/ui/src/components/rich-text-document.ts'))}; export { UiConfigurationError } from ${JSON.stringify(resolve('packages/ui/src/components/configuration-inspection.ts'))};`
        },
      },
    ],
  })
  try {
    const module = await server.ssrLoadModule(
      '/apps/web/src/app/workbench/forms/builder/use-form-builder.ts',
    )
    const create = module['useFormBuilder'] as typeof CreateBuilder
    const locale = ref<'zh-CN' | 'en'>('zh-CN')
    const catalogs: Record<typeof locale.value, Readonly<Record<string, string>>> = {
      'zh-CN': chinese,
      en: english,
    }
    const translate: ConsoleTranslate = (...[key]) => catalogs[locale.value][key] ?? key
    const builder = create(translate, locale)
    for (const kind of ['mask', 'slider', 'rating', 'attachment', 'rich-text'] as const)
      builder.add(kind)
    assert.deepEqual(
      builder.schema.value.fields.map((node) => node.kind),
      ['mask', 'slider', 'rating', 'attachment', 'rich-text'],
    )
    const raw = JSON.stringify(builder.schema.value)
    assert.equal(builder.importJson(raw), true)
    assert.equal(JSON.stringify(builder.schema.value), raw)
    builder.choose(['attachment1'])
    assert.equal(builder.draft.value?.kind, 'attachment')
    builder.edit({
      ...builder.draft.value,
      source: 'documents',
      accept: '.pdf',
      maxFiles: 2,
      maxSize: 1024,
    })
    assert.equal(builder.pending.value, false)
    const exported = JSON.stringify(builder.schema.value)
    const restored = create(translate, locale)
    assert.equal(restored.restoreDraft(builder.snapshot()), true)
    assert.equal(JSON.stringify(restored.schema.value), exported)
    assert.equal(restored.importJson(exported), true)
    restored.choose(['slider1'])
    if (restored.draft.value?.kind === 'slider')
      restored.edit({ ...restored.draft.value, max: 200, step: 5 })
    assert.equal(restored.pending.value, false)
    restored.choose(['mask1'])
    if (restored.draft.value?.kind === 'mask')
      restored.edit({ ...restored.draft.value, mask: '##-####' })
    assert.equal(restored.pending.value, false)
    restored.choose(['rating1'])
    if (restored.draft.value?.kind === 'rating')
      restored.edit({ ...restored.draft.value, count: 10, allowHalf: false, defaultValue: 8 })
    assert.equal(restored.pending.value, false)
    assert.equal(restored.restoreDraft(restored.snapshot()), true)
    assert.equal(
      restored.importJson(
        JSON.stringify({
          fields: [{ kind: 'slider', name: 'broken', label: 'Broken', min: 10, max: 2 }],
        }),
      ),
      false,
    )
    const before = restored.json.value
    let importFeedback: (() => string) | undefined
    assert.equal(
      restored.importJson('{', (message) => {
        importFeedback = message
      }),
      false,
    )
    assert.ok(importFeedback?.().includes(chinese['formBuilder.importInvalid']))
    locale.value = 'en'
    assert.ok(restored.notice.value.includes(english['formBuilder.importInvalid']))
    assert.equal(importFeedback?.(), restored.notice.value)
    assert.equal(restored.json.value, before)
    assert.equal(
      restored.importJson(
        JSON.stringify({ fields: [{ kind: 'text', name: 'item', label: 'Item', extra: true }] }),
      ),
      false,
    )
    assert.ok(restored.notice.value.includes('$["fields"][0]["extra"]'))
    locale.value = 'zh-CN'
    assert.ok(restored.notice.value.includes(chinese['configurationAssist.unknownProperty']))
    assert.equal(
      restored.importJson(
        JSON.stringify({
          fields: [{ kind: 'number', name: 'quantity', label: 'Quantity', defaultValue: 'many' }],
        }),
      ),
      false,
    )
    assert.ok(restored.notice.value.includes(chinese['configurationAssist.fieldValue']))
    assert.ok(restored.notice.value.includes('quantity'))
    const condition = { field: 'source', operator: 'not-empty' }
    assert.equal(
      restored.importJson(
        JSON.stringify({
          fields: [
            { kind: 'text', name: 'source', label: 'Source' },
            { kind: 'text', name: 'first', label: 'Alpha', hidden: condition },
            { kind: 'text', name: 'second', label: 'Beta', disabled: condition },
          ],
        }),
      ),
      true,
    )
    restored.remove()
    assert.ok(restored.notice.value.includes('Alpha、Beta'))
    locale.value = 'en'
    assert.ok(restored.notice.value.includes('Alpha, Beta'))
    const source = restored.draft.value
    assert.ok(source)
    restored.edit({ ...source, name: 'changed' })
    assert.ok(restored.notice.value.includes('Alpha, Beta'))
    assert.equal(restored.schema.value.fields[0]?.name, 'source')
    console.log(
      'Visual form builder special fields: creation, live editing, JSON roundtrip, draft snapshots and invalid ranges passed.',
    )
  } finally {
    await server.close()
  }
}

async function verifyPreviewMigration(): Promise<void> {
  const server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    resolve: {
      alias: { '@platform/ui': resolve('packages/ui/src/components/form-value-migration.ts') },
    },
  })
  try {
    const module = await server.ssrLoadModule(
      '/apps/web/src/app/workbench/forms/builder/form-preview-values.ts',
    )
    const project = module['previewValues'] as typeof ProjectPreview
    const text = (name: string, defaultValue = ''): UiFormNode => ({
      kind: 'text',
      name,
      label: name,
      defaultValue,
    })
    const previous: UiFormNode[] = [
      { kind: 'group', name: 'one', label: 'One', fields: [text('a')] },
      { kind: 'group', name: 'two', label: 'Two', fields: [text('a'), text('b')] },
      text('default', 'old'),
    ]
    const next: UiFormNode[] = [
      { kind: 'group', name: 'one', label: 'One', fields: [text('b')] },
      { kind: 'group', name: 'two', label: 'Two', fields: [text('b'), text('c'), text('d')] },
      text('default', 'new'),
    ]
    const values = {
      one: { a: 'rename me' },
      two: { a: 'do not transfer', b: 'keep b' },
      default: 'old',
    }
    const defaults = { one: { a: '' }, two: { a: '', b: '' }, default: 'old' }
    const nextDefaults = { one: { b: '' }, two: { b: '', c: '', d: '' }, default: 'new' }
    assert.deepEqual(project(previous, next, values, defaults, nextDefaults, []), {
      one: { b: 'rename me' },
      two: { b: 'keep b', c: '', d: '' },
      default: 'new',
    })
    assert.equal(
      project(previous, next, { ...values, default: 'edited' }, defaults, nextDefaults, [])[
        'default'
      ],
      'edited',
    )
    assert.deepEqual(
      project(
        [{ kind: 'repeat', name: 'rows', label: 'Rows', fields: [text('name')] }],
        [
          {
            kind: 'repeat',
            name: 'rows',
            label: 'Rows',
            fields: [text('name'), text('note', 'fresh')],
          },
        ],
        { rows: [{ name: 'Existing' }] },
        { rows: [] },
        { rows: [] },
        [],
      ),
      { rows: [{ name: 'Existing', note: 'fresh' }] },
    )
  } finally {
    await server.close()
  }
}
