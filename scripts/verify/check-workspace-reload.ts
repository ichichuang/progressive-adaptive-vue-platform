import assert from 'node:assert/strict'
import { createRenderer, h, inject, reactive, ref, type InjectionKey, type Ref } from 'vue'
import { createServer } from 'vite'
interface TestEntry {
  state: string
  instance: symbol
}
interface TestWorkspace {
  entries: TestEntry[]
  canDiscard(): boolean
}
interface TestConfirmation {
  affectedEntries: readonly TestEntry[]
  accept(): void
  cancel(): void
}
interface TestOwner {
  reloadConfirmation: Ref<TestConfirmation | undefined>
  requestReload(
    current: () => boolean,
  ): Promise<{ isCurrent(): boolean; reload(action: () => void): boolean } | undefined>
}
interface TestExports {
  provideWorkspaceUnsavedChanges: (workspace: TestWorkspace) => TestOwner
  workspaceUnsavedChangesKey: InjectionKey<
    (registration: { instance: symbol; read(): { dirty: boolean; revision: number } }) => () => void
  >
}

export async function verifyWorkspaceReload(): Promise<void> {
  const server = await createServer({ configFile: false, server: { middlewareMode: true } })
  const loaded: unknown = await server.ssrLoadModule(
    '/apps/web/src/app/workspace/workspace-unsaved-changes.ts',
  )
  const { provideWorkspaceUnsavedChanges, workspaceUnsavedChangesKey } = loaded as TestExports
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const events = new EventTarget()
  Object.defineProperty(globalThis, 'window', { configurable: true, value: events })
  const entry = { state: 'live', instance: Symbol('test') }
  const other = { state: 'live', instance: Symbol('active') }
  const allowed = ref(true)
  const candidate = ref(true)
  const workspace = reactive({
    entries: [entry, other],
    active: other,
    canDiscard: () => allowed.value,
  })
  let addRegistration: (() => () => void) | undefined
  const state = reactive({ dirty: true, revision: 0 })
  let owner: ReturnType<typeof provideWorkspaceUnsavedChanges> | undefined
  const renderer = createRenderer<object, object>({
    patchProp() {
      return undefined
    },
    insert() {
      return undefined
    },
    remove() {
      return undefined
    },
    createElement: () => ({}),
    createText: () => ({}),
    createComment: () => ({}),
    setText() {
      return undefined
    },
    setElementText() {
      return undefined
    },
    parentNode: () => null,
    nextSibling: () => null,
  })
  const child = {
    setup() {
      const register = inject(workspaceUnsavedChangesKey)
      assert.ok(register)
      addRegistration = () =>
        register({
          instance: entry.instance,
          read: () => ({ dirty: false, revision: 0 }),
        })
      register({
        instance: entry.instance,
        read: () => state,
      })
      return () => h('div')
    },
  }
  const app = renderer.createApp({
    setup() {
      owner = provideWorkspaceUnsavedChanges(workspace)
      return () => h(child)
    },
  })
  app.mount({})
  try {
    assert.ok(owner)
    const first = owner.requestReload(() => true)
    assert.equal(owner.reloadConfirmation.value?.affectedEntries.length, 1)
    state.revision++
    assert.equal(await first, undefined)
    const second = owner.requestReload(() => true)
    owner.reloadConfirmation.value.accept()
    const token = await second
    assert.ok(token)
    const before = () => {
      const event = new Event('beforeunload', { cancelable: true })
      events.dispatchEvent(event)
      return event.defaultPrevented
    }
    assert.equal(before(), true)
    assert.equal(
      token.reload(() => {
        assert.equal(before(), false)
        assert.equal(before(), true)
      }),
      true,
    )
    assert.equal(
      token.reload(() => {
        throw new Error('must not run')
      }),
      false,
    )
    assert.equal(before(), true)
    const third = owner.requestReload(() => true)
    owner.reloadConfirmation.value.accept()
    const failing = await third
    assert.ok(failing)
    assert.throws(() =>
      failing.reload(() => {
        throw new Error('navigation failed')
      }),
    )
    assert.equal(before(), true)
    assert.ok(addRegistration)
    const outdated = owner.requestReload(() => candidate.value)
    candidate.value = false
    assert.equal(await outdated, undefined)
    candidate.value = true
    const cancelled = owner.requestReload(() => true)
    owner.reloadConfirmation.value.cancel()
    assert.equal(await cancelled, undefined)
    assert.equal(before(), true)
    const granted = owner.requestReload(() => true)
    owner.reloadConfirmation.value.accept()
    const stale = await granted
    assert.ok(stale)
    state.revision++
    assert.equal(
      stale.reload(() => {
        throw new Error('stale token ran')
      }),
      false,
    )
    const membership = owner.requestReload(() => true)
    const remove = addRegistration()
    assert.equal(await membership, undefined)
    const removal = owner.requestReload(() => true)
    remove()
    assert.equal(await removal, undefined)
    const forbidden = owner.requestReload(() => true)
    allowed.value = false
    assert.equal(await forbidden, undefined)
    assert.equal(before(), true)
    allowed.value = true
    const removedEntry = owner.requestReload(() => true)
    workspace.entries.pop()
    assert.equal(await removedEntry, undefined)
    assert.equal(before(), true)
  } finally {
    app.unmount()
    await server.close()
    if (original) Object.defineProperty(globalThis, 'window', original)
    else Reflect.deleteProperty(globalThis, 'window')
  }
}
