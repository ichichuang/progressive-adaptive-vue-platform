import { computed, onScopeDispose, provide, shallowRef, watch, type InjectionKey } from 'vue'

import {
  isLiveWorkspace,
  type useWorkspaceStore,
  type WorkspaceEntry,
  type WorkspaceInstanceIdentity,
} from './workspace.store'

interface UnsavedChangesState {
  readonly dirty: boolean
  readonly revision: number
}
interface Registration {
  readonly instance: WorkspaceInstanceIdentity
  readonly read: () => UnsavedChangesState
}
interface DiscardConfirmation {
  readonly entry: WorkspaceEntry
  readonly action: 'refresh' | 'close'
  accept(): void
  cancel(): void
}
export const workspaceUnsavedChangesKey: InjectionKey<(registration: Registration) => () => void> =
  Symbol('workspace-unsaved-changes')

export function provideWorkspaceUnsavedChanges(workspace: ReturnType<typeof useWorkspaceStore>) {
  const registrations = shallowRef<readonly Registration[]>([])
  const confirmation = shallowRef<DiscardConfirmation>()
  let disposed = false
  provide(workspaceUnsavedChangesKey, (registration) => {
    registrations.value = [...registrations.value, registration]
    return () => {
      registrations.value = registrations.value.filter((item) => item !== registration)
    }
  })

  function owns(entry: WorkspaceEntry): boolean {
    return workspace.entries.some((candidate) =>
      isLiveWorkspace(entry)
        ? isLiveWorkspace(candidate) && candidate.instance === entry.instance
        : candidate === entry,
    )
  }
  function read(entry: WorkspaceEntry): readonly Registration[] {
    return isLiveWorkspace(entry)
      ? registrations.value.filter((item) => item.instance === entry.instance)
      : []
  }

  async function requestDiscard(
    entry: WorkspaceEntry,
    action: DiscardConfirmation['action'],
    isRequestCurrent: () => boolean,
  ): Promise<{ isCurrent(): boolean } | undefined> {
    // This supplements, rather than overrides, the existing route discard authority.
    if (confirmation.value !== undefined || !workspace.canDiscard(entry)) return undefined
    const snapshots = read(entry).map((registration) => ({
      registration,
      state: registration.read(),
    }))
    const isCurrent = (): boolean => {
      const current = read(entry)
      return (
        !disposed &&
        owns(entry) &&
        workspace.canDiscard(entry) &&
        current.length === snapshots.length &&
        snapshots.every(({ registration, state }, index) => {
          const latest = registration.read()
          return (
            current[index] === registration &&
            latest.revision === state.revision &&
            latest.dirty === state.dirty
          )
        })
      )
    }
    if (!isRequestCurrent() || !isCurrent()) return undefined
    if (!snapshots.some(({ state }) => state.dirty)) return { isCurrent }
    return new Promise((resolve) => {
      let settled = false
      const finish = (accepted: boolean): void => {
        if (settled) return
        settled = true
        stop()
        confirmation.value = undefined
        resolve(accepted && isRequestCurrent() && isCurrent() ? { isCurrent } : undefined)
      }
      const stop = watch(
        () => isRequestCurrent() && isCurrent(),
        (current) => {
          if (!current) finish(false)
        },
        { flush: 'sync' },
      )
      confirmation.value = {
        entry,
        action,
        accept() {
          finish(true)
        },
        cancel() {
          finish(false)
        },
      }
    })
  }

  const hasUnsavedChanges = computed(() =>
    registrations.value.some(
      (registration) =>
        registration.read().dirty &&
        workspace.entries.some(
          (entry) => isLiveWorkspace(entry) && entry.instance === registration.instance,
        ),
    ),
  )
  const beforeUnload = (event: BeforeUnloadEvent): void => {
    if (!hasUnsavedChanges.value) return
    event.preventDefault()
  }
  if (typeof window !== 'undefined') {
    watch(
      hasUnsavedChanges,
      (dirty) => {
        if (dirty) window.addEventListener('beforeunload', beforeUnload)
        else window.removeEventListener('beforeunload', beforeUnload)
      },
      { immediate: true, flush: 'sync' },
    )
  }
  onScopeDispose(() => {
    disposed = true
    confirmation.value?.cancel()
    registrations.value = []
    if (typeof window !== 'undefined') window.removeEventListener('beforeunload', beforeUnload)
  })
  return { confirmation, requestDiscard }
}
