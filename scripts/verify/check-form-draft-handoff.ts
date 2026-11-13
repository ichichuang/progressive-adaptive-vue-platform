import assert from 'node:assert/strict'
import { createApp, effectScope, nextTick, ref, watch } from 'vue'
import { createFormDraftStorage } from '../../apps/web/src/app/storage/form-draft-storage'
import { createStorageErrorAdapter } from '../../apps/web/src/app/storage/storage-error'
import { createStartupAttemptId } from '../../apps/web/src/app/bootstrap/lifecycle'
import { useDraftSession } from '../../apps/web/src/app/forms/use-draft-session'

import { useFormDraft } from '../../apps/web/src/app/forms/use-form-draft'
import { formDraftStorageKey } from '../../apps/web/src/app/forms/form-draft-contract'
import { useUiDynamicForm } from '../../packages/ui/src/composables/use-ui-dynamic-form'
import type {
  UiFormCopy,
  UiFormController,
  UiFormSchema,
  UiFormRecord,
} from '../../packages/ui/src/components/form-contracts'

export async function verifyFormDraftHandoff(copy: UiFormCopy): Promise<void> {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const records = new Map<string, string>()
  let writes = 0
  let fail = false
  const host = new EventTarget()
  const storage = {
    getItem: (key: string) => records.get(key) ?? null,
    setItem(key: string, value: string) {
      if (fail) throw new DOMException('Full', 'QuotaExceededError')
      writes++
      records.set(key, value)
    },
    removeItem(key: string) {
      records.delete(key)
    },
  }
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: Object.assign(host, { localStorage: storage }),
  })
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: Object.assign(new EventTarget(), { visibilityState: 'visible' }),
  })
  const scope = effectScope()
  try {
    const owner = createFormDraftStorage(
      createStorageErrorAdapter({
        startupAttemptId: createStartupAttemptId(),
        releaseSha: 'test',
        buildVersion: 'test',
      }),
      () => false,
    )
    const port = (schemaKey: string, name = 'same') =>
      owner.create({
        scope: name,
        schemaKey,
        maxAgeMs: 60_000,
        parse: (value: unknown) => {
          if (typeof value !== 'string') throw new TypeError('String required')
          return value
        },
      })
    const old = port('old')
    assert.equal(old.read().status, 'missing')
    assert.equal(old.write('first').status, 'saved')
    const next = port('new')
    const before = writes
    assert.equal(old.handoff(next, 'migrated').status, 'saved')
    assert.equal(writes, before + 1)
    assert.equal(old.write('stale').status, 'failed')
    assert.equal(old.clear().status, 'failed')
    assert.equal(next.read().status, 'found')
    const stale = port('new')
    stale.read()
    next.write('competitor')
    assert.deepEqual(stale.handoff(port('third'), 'overwrite'), {
      status: 'failed',
      reason: 'conflict',
    })
    const latest = port('new')
    latest.read()
    fail = true
    assert.equal(latest.handoff(port('third'), 'quota').status, 'failed')
    fail = false
    assert.equal(port('new').read().status, 'found', 'quota preserves old envelope')
    scope.run(() => {
      const value = ref('a')
      const original = port('one', 'session')
      const session = useDraftSession({
        port: original,
        snapshot: () => value.value,
        restore: () => false,
      })
      value.value = 'pending timer'
      session.stop({ flush: false })
      assert.equal(session.save(), false)
      assert.equal(session.restore(), false)
      assert.equal(session.clear(), false)
      const destination = port('two', 'session')
      const adopted = session.handoff(destination, 'migration')
      assert.equal(adopted.status, 'saved')
      const target = useDraftSession({
        port: destination,
        snapshot: () => 'migration',
        restore: () => {
          throw new Error('Must not restore')
        },
        automatic: true,
        adopted,
      })
      assert.equal(target.status.value, 'saved')
      assert.equal(target.unsaved.value, false)
      const count = writes
      target.stop()
      assert.equal(writes, count, 'stopped source disposal does not flush')
    })
    const app = createApp({})
    app.provide(formDraftStorageKey, {
      errorAdapter: createStorageErrorAdapter({
        startupAttemptId: createStartupAttemptId(),
        releaseSha: 'test',
        buildVersion: 'test',
      }),
      isDisposed: () => false,
    })
    type Values = UiFormRecord
    let draftScope = effectScope()
    let draft: ReturnType<typeof useFormDraft<Values>> | undefined
    const currentDraft = () => draft
    const connect = (form: UiFormController<Values>, previous = draft) => {
      previous?.stop({ flush: false })
      const oldScope = draftScope
      draftScope = effectScope()
      draft = app.runWithContext(() =>
        draftScope.run(() =>
          useFormDraft<Values>({
            form,
            scope: 'integrated',
            includeFields: ['name'],
            maxAgeMs: 60_000,
            enabled: () => true,
            automatic: true,
            ...(previous ? { previous } : {}),
          }),
        ),
      )
      oldScope.stop()
      assert.ok(draft)
    }
    const first: UiFormSchema = {
      fields: [
        { kind: 'text', name: 'name', label: 'Name' },
        { kind: 'text', name: 'removed', label: 'Removed' },
      ],
    }
    const second: UiFormSchema = {
      fields: [
        { kind: 'text', name: 'name', label: 'Updated name' },
        { kind: 'text', name: 'secret', label: 'Not persisted' },
      ],
    }
    const dynamic = scope.run(() =>
      useUiDynamicForm({
        formId: 'dynamic-draft',
        schema: first,
        copy,
        initial: { draftId: 'record', values: { name: 'Accepted' } },
        onReplaced: ({ current }) => {
          connect(current)
        },
      }),
    )
    assert.ok(dynamic)
    connect(dynamic.form.value)
    const snapshots: string[] = []
    const stopObserver = watch(
      () => dynamic.form.value.getValues(),
      (value) => {
        snapshots.push(JSON.stringify(value))
      },
      { flush: 'sync' },
    )
    dynamic.form.value.setValue('name', 'User input')
    await nextTick()
    assert.equal((await dynamic.replaceSchema(second)).status, 'applied')
    assert.equal(draft?.status.value, 'saved')
    dynamic.form.value.setValue('secret', 'Do not persist')
    await nextTick()
    assert.ok(snapshots.length > 0)
    const raw = [...records.entries()].find(([key]) => key.endsWith(':integrated'))?.[1]
    assert.ok(raw)
    assert.equal(raw.includes('Do not persist'), false)
    const envelope = JSON.parse(raw) as { data: { values: Record<string, unknown> } }
    assert.deepEqual(Object.keys(envelope.data.values), ['name'])
    currentDraft()?.stop({ flush: false })
    draftScope.stop()
    dynamic.dispose()
    const reload = scope.run(() =>
      useUiDynamicForm({
        formId: 'dynamic-draft',
        schema: second,
        copy,
        initial: { draftId: 'record', values: { name: 'Accepted' } },
      }),
    )
    assert.ok(reload)
    draft = undefined
    connect(reload.form.value)
    assert.equal(currentDraft()?.status.value, 'restored')
    assert.equal(reload.form.value.getValue('name'), 'User input')
    assert.equal(reload.form.value.getValue('secret'), '')
    stopObserver()
    currentDraft()?.stop({ flush: false })
    draftScope.stop()
    reload.dispose()
  } finally {
    scope.stop()
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow)
    else Reflect.deleteProperty(globalThis, 'window')
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument)
    else Reflect.deleteProperty(globalThis, 'document')
  }
}
