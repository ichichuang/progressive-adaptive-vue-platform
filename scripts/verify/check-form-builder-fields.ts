import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import type { ConsoleTranslate } from '../../apps/web/src/shared/i18n'
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
          return `export { parseUiFormSchema } from ${JSON.stringify(resolve('packages/ui/src/components/form-schema.ts'))}; export { richTextTools } from ${JSON.stringify(resolve('packages/ui/src/components/rich-text-document.ts'))};`
        },
      },
    ],
  })
  try {
    const module = await server.ssrLoadModule(
      '/apps/web/src/app/workbench/forms/builder/use-form-builder.ts',
    )
    const create = module['useFormBuilder'] as typeof CreateBuilder
    const builder = create(((key: string) => key) as ConsoleTranslate)
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
    const restored = create(((key: string) => key) as ConsoleTranslate)
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
