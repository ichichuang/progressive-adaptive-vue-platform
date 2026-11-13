import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import type { ConsoleTranslate } from '../../apps/web/src/shared/i18n'
import type { useFormBuilder as CreateBuilder } from '../../apps/web/src/app/workbench/forms/builder/use-form-builder'

export async function verifyFormBuilderFields(): Promise<void> {
  // These modules consume only the public parser at runtime; resolve that export to its owner
  // to keep this controller test independent of the Vue SFC presentation graph.
  const server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    resolve: { alias: { '@platform/ui': resolve('packages/ui/src/components/form-schema.ts') } },
  })
  try {
    const module = await server.ssrLoadModule(
      '/apps/web/src/app/workbench/forms/builder/use-form-builder.ts',
    )
    const create = module['useFormBuilder'] as typeof CreateBuilder
    const builder = create(((key: string) => key) as ConsoleTranslate)
    for (const kind of ['mask', 'slider', 'rating', 'attachment'] as const) builder.add(kind)
    assert.deepEqual(
      builder.schema.value.fields.map((node) => node.kind),
      ['mask', 'slider', 'rating', 'attachment'],
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
