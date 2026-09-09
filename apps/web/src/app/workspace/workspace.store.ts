import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'

import type { RegisteredRouteDestination, ValidatedRouteInput } from '../router/route-input'
import { getRouteRecord, type ValidatedRouteMeta } from '../router/route-registry'

declare const workspaceIdentity: unique symbol
declare const workspaceInstance: unique symbol

export type WorkspaceIdentity = string & { readonly [workspaceIdentity]: true }
export type WorkspaceInstanceIdentity = symbol & { readonly [workspaceInstance]: true }

export interface WorkspaceEntry {
  readonly identity: WorkspaceIdentity
  readonly instance: WorkspaceInstanceIdentity
  readonly componentName: string
  readonly destination: RegisteredRouteDestination
}

// Only Router commits write activeIdentity or open an entry. UI actions request navigation.
export const useWorkspaceStore = defineStore('workspace', () => {
  const entries = shallowRef<readonly WorkspaceEntry[]>([])
  const activeIdentity = shallowRef<WorkspaceIdentity | null>(null)
  const active = computed(() =>
    entries.value.find((entry) => entry.identity === activeIdentity.value),
  )
  const includedComponentNames = computed(() => entries.value.map((entry) => entry.componentName))

  function commit(
    destination: RegisteredRouteDestination,
    input: ValidatedRouteInput,
    component: unknown,
  ): WorkspaceEntry | undefined {
    const route = getRouteRecord(input.name)
    let identity: WorkspaceIdentity
    switch (route.workspaceIdentityPolicyId) {
      case null:
        activeIdentity.value = null
        return undefined
      case 'workspace-identity.route-single':
        identity = `workspace:${route.name}` as WorkspaceIdentity
        break
    }
    if (
      component === null ||
      typeof component !== 'object' ||
      !('name' in component) ||
      typeof component.name !== 'string' ||
      component.name.length === 0
    )
      throw new TypeError('The Workspace route component contract is unavailable.')
    const previous = entries.value.find((entry) => entry.identity === identity)
    if (
      entries.value.some(
        (entry) => entry.identity !== identity && entry.componentName === component.name,
      )
    )
      throw new TypeError('Workspace route component names must be unique.')
    const entry: WorkspaceEntry = Object.freeze({
      identity,
      instance: previous?.instance ?? (Symbol(identity) as WorkspaceInstanceIdentity),
      componentName: component.name,
      destination,
    })
    entries.value =
      previous === undefined
        ? [...entries.value, entry]
        : entries.value.map((candidate) => (candidate === previous ? entry : candidate))
    activeIdentity.value = identity
    return entry
  }

  function canDiscard(entry: WorkspaceEntry): boolean {
    const allows = (policy: ValidatedRouteMeta['unsavedChangesPolicy']): boolean =>
      policy === 'none'
    return allows(getRouteRecord(entry.destination.name).meta.unsavedChangesPolicy)
  }

  function discard(entry: WorkspaceEntry): void {
    // Protected future routes require a separately admitted page-owned discard authority.
    if (activeIdentity.value === entry.identity || !canDiscard(entry)) return
    entries.value = entries.value.filter((candidate) => candidate.instance !== entry.instance)
  }

  function dispose(): void {
    activeIdentity.value = null
    entries.value = []
  }

  return {
    entries,
    activeIdentity,
    active,
    includedComponentNames,
    commit,
    canDiscard,
    discard,
    dispose,
  }
})
