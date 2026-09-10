import { defineStore } from 'pinia'
import { computed, nextTick, shallowRef } from 'vue'

import {
  registeredRouteDestination,
  type RegisteredRouteDestination,
  type ValidatedRouteInput,
} from '../router/route-input'
import { getRouteRecord, routeRegistry, type ValidatedRouteMeta } from '../router/route-registry'

declare const workspaceIdentity: unique symbol
declare const workspaceInstance: unique symbol

export type WorkspaceIdentity = string & { readonly [workspaceIdentity]: true }
export type WorkspaceInstanceIdentity = symbol & { readonly [workspaceInstance]: true }

interface WorkspaceStructure {
  readonly identity: WorkspaceIdentity
  readonly destination: RegisteredRouteDestination
}

export interface LiveWorkspaceEntry extends WorkspaceStructure {
  readonly state: 'live'
  readonly instance: WorkspaceInstanceIdentity
  readonly componentName: string
}

export type WorkspaceEntry =
  LiveWorkspaceEntry | (WorkspaceStructure & { readonly state: 'dormant' })

function routeSingleIdentity(name: string): WorkspaceIdentity {
  return `workspace:${name}` as WorkspaceIdentity
}

export function isLiveWorkspace(entry: WorkspaceEntry): entry is LiveWorkspaceEntry {
  return entry.state === 'live'
}

// Router commits choose the active entry; local refresh replaces only its live instance.
export const useWorkspaceStore = defineStore('workspace', () => {
  const entries = shallowRef<readonly WorkspaceEntry[]>([])
  const activeIdentity = shallowRef<WorkspaceIdentity | null>(null)
  const refreshing = shallowRef<LiveWorkspaceEntry>()
  const active = computed(() =>
    entries.value.find(
      (entry): entry is LiveWorkspaceEntry =>
        isLiveWorkspace(entry) && entry.identity === activeIdentity.value,
    ),
  )
  const includedComponentNames = computed(() =>
    entries.value
      .filter(isLiveWorkspace)
      .filter((entry) => entry.identity !== refreshing.value?.identity)
      .map((entry) => entry.componentName),
  )
  let restored = false

  function restore(names: readonly string[]): void {
    if (restored) throw new TypeError('Workspace structure was already restored.')
    const current = entries.value
    const structure: WorkspaceEntry[] = []
    for (const name of new Set(names)) {
      const route = routeRegistry.find(
        (candidate) =>
          candidate.name === name &&
          candidate.workspaceIdentityPolicyId === 'workspace-identity.route-single',
      )
      if (route?.workspaceIdentityPolicyId !== 'workspace-identity.route-single') continue
      const identity = routeSingleIdentity(route.name)
      structure.push(
        current.find((entry) => entry.identity === identity) ??
          Object.freeze({
            state: 'dormant',
            identity,
            destination: registeredRouteDestination({ name: route.name }),
          }),
      )
    }
    entries.value = [
      ...structure,
      ...current.filter(
        (entry) => !structure.some((candidate) => candidate.identity === entry.identity),
      ),
    ]
    restored = true
  }

  function commit(
    destination: RegisteredRouteDestination,
    input: ValidatedRouteInput,
    component: unknown,
  ): LiveWorkspaceEntry | undefined {
    const route = getRouteRecord(input.name)
    let identity: WorkspaceIdentity
    switch (route.workspaceIdentityPolicyId) {
      case null:
        activeIdentity.value = null
        return undefined
      case 'workspace-identity.route-single':
        identity = routeSingleIdentity(route.name)
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
        (entry) =>
          isLiveWorkspace(entry) &&
          entry.identity !== identity &&
          entry.componentName === component.name,
      )
    )
      throw new TypeError('Workspace route component names must be unique.')
    const entry: LiveWorkspaceEntry = Object.freeze({
      state: 'live',
      identity,
      instance:
        previous !== undefined && isLiveWorkspace(previous)
          ? previous.instance
          : (Symbol(identity) as WorkspaceInstanceIdentity),
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
    if (!isLiveWorkspace(entry)) return true
    const allows = (policy: ValidatedRouteMeta['unsavedChangesPolicy']): boolean =>
      policy === 'none'
    return allows(getRouteRecord(entry.destination.name).meta.unsavedChangesPolicy)
  }

  function discard(entry: WorkspaceEntry): void {
    // Protected future routes require a separately admitted page-owned discard authority.
    if (activeIdentity.value === entry.identity || !canDiscard(entry)) return
    entries.value = entries.value.filter((candidate) =>
      isLiveWorkspace(entry)
        ? !isLiveWorkspace(candidate) || candidate.instance !== entry.instance
        : candidate !== entry,
    )
  }

  function dispose(): void {
    refreshing.value = undefined
    activeIdentity.value = null
    entries.value = []
  }

  async function refresh(
    entry: LiveWorkspaceEntry,
    isCurrent: () => boolean,
  ): Promise<LiveWorkspaceEntry | undefined> {
    const owns = (expected: LiveWorkspaceEntry): boolean =>
      isCurrent() && active.value === expected && canDiscard(expected)
    if (refreshing.value !== undefined || !owns(entry)) return undefined
    refreshing.value = entry
    try {
      // Public include pruning must finish before changing the current VNode key.
      await nextTick()
      if (!owns(entry)) return undefined
      const replacement = Object.freeze({
        ...entry,
        instance: Symbol(entry.identity) as WorkspaceInstanceIdentity,
      })
      entries.value = entries.value.map((candidate) =>
        candidate === entry ? replacement : candidate,
      )
      // Exclusion stays in force until the old keyed page is actually unmounted.
      await nextTick()
      if (!owns(replacement)) return undefined
      refreshing.value = undefined
      await nextTick()
      return owns(replacement) ? replacement : undefined
    } finally {
      if (refreshing.value !== undefined) {
        refreshing.value = undefined
        await nextTick()
      }
    }
  }

  return {
    entries,
    activeIdentity,
    active,
    includedComponentNames,
    restore,
    commit,
    canDiscard,
    discard,
    refresh,
    dispose,
  }
})
