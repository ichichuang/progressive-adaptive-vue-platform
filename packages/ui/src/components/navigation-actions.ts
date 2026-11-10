import { nextTick } from 'vue'
import type { UiAdminNavigationExpansionUpdate, UiAdminNavigationGroup } from './contracts'
import { findScrollTargetOwner } from './scroll-target-owner'

const requests = new WeakMap<HTMLElement, symbol>()
let stateUpdates: Promise<void> = Promise.resolve()

/** Explicit navigation recovery only; normal route changes retain their scroll policy. */
async function centerActiveNavigation(
  state: {
    readonly activeRouteName: string
    readonly navigation: readonly UiAdminNavigationGroup[]
    readonly navigationAccordion: boolean
    readonly wideNavigationCollapsed: boolean
    readonly expandedNavigationGroupIds: readonly string[]
  },
  root: HTMLElement | undefined,
  emit: {
    (event: 'update:expandedNavigationGroupIds', update: UiAdminNavigationExpansionUpdate): void
    (event: 'update:wideNavigationCollapsed', collapsed: boolean): void
  },
): Promise<void> {
  if (root?.isConnected !== true) return
  const collapsed = state.wideNavigationCollapsed
  const request = Symbol()
  requests.set(root, request)
  const tab = root.querySelector<HTMLElement>('.pavp-workspace-tabs__item[data-active="true"]')
  if (tab !== null) centerTarget(tab, 'horizontal')
  const navigation = root.querySelector<HTMLElement>('.pavp-admin-shell__persistent-navigation')
  if (navigation === null) return
  const routeName = state.activeRouteName
  function activePath(groups: readonly UiAdminNavigationGroup[]): readonly string[] {
    for (const group of groups) {
      for (const item of group.items) {
        if ('items' in item) {
          const path = activePath([item])
          if (path.length > 0) return [group.id, ...path]
        } else if (item.routeName === routeName) return [group.id]
      }
    }
    return []
  }
  const path = activePath(state.navigation)
  const firstGroup = path[0]
  if (firstGroup === undefined) return
  const isCurrent = (): boolean =>
    root.isConnected && requests.get(root) === request && state.activeRouteName === routeName
  if (!collapsed && path.some((id) => !state.expandedNavigationGroupIds.includes(id))) {
    emit('update:expandedNavigationGroupIds', {
      expandedGroupIds: state.navigationAccordion
        ? path
        : [...state.expandedNavigationGroupIds, ...path],
      intent: 'group',
    })
  }
  if (!collapsed) {
    // A repeated request may arrive while an earlier expansion is still settling.
    // Naive starts enter transitions on its next animation frame. Measure only
    // after the active branch has settled, without guessing its token duration.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve()
        })
      })
    })
    await Promise.all(
      navigation
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => undefined)),
    )
  }
  if (!isCurrent()) return
  const key = collapsed ? `navigation-group:${firstGroup}` : routeName
  const target = Array.from(
    navigation.querySelectorAll<HTMLElement>('[data-pavp-navigation-key]'),
  ).find((node) => node.dataset['pavpNavigationKey'] === key && node.getClientRects().length > 0)
  if (target !== undefined) centerTarget(target, 'vertical')
}

function centerTarget(target: HTMLElement, axis: 'horizontal' | 'vertical'): void {
  if (target.closest('[inert], [hidden]') !== null || target.getClientRects().length === 0) return
  const owner = findScrollTargetOwner(target)
  if (owner?.controller.readState().ready !== true) return
  const { viewport, controller } = owner
  const box = target.getBoundingClientRect()
  const frame = viewport.getBoundingClientRect()
  controller.scrollBy({
    ...(axis === 'horizontal'
      ? {
          left:
            box.left + box.width / 2 - frame.left - viewport.clientLeft - viewport.clientWidth / 2,
        }
      : {
          top:
            box.top + box.height / 2 - frame.top - viewport.clientTop - viewport.clientHeight / 2,
        }),
    behavior: 'smooth',
  })
}

export function runNavigationAction(
  action: 'focus' | 'mode' | 'sidebar' | 'groups',
  ...input: [...Parameters<typeof centerActiveNavigation>, keys?: readonly (string | number)[]]
): Promise<void> {
  const [props, root, emit, keys] = input
  const available = (): boolean =>
    root?.isConnected === true && root.dataset['layoutProfile'] === 'wide'
  if (action === 'focus') {
    return stateUpdates.then(() => {
      if (available()) return centerActiveNavigation(props, root, emit)
    })
  }
  // Multiple cold-import clicks must observe each preceding controlled update.
  const update = stateUpdates.then(() => {
    if (!available()) return
    if (action === 'sidebar') {
      toggleWideNavigation(props, emit)
      return
    }
    if (props.wideNavigationCollapsed) return
    if (action === 'groups') {
      emit('update:expandedNavigationGroupIds', {
        expandedGroupIds: groupIds(props.navigation).filter((id) =>
          keys?.includes(`navigation-group:${id}`),
        ),
        intent: 'group',
      })
      return
    }
    toggleNavigationMode(props, emit)
  })
  stateUpdates = update.then(
    () => nextTick(),
    () => undefined,
  )
  return update
}

function toggleWideNavigation(
  props: Parameters<typeof centerActiveNavigation>[0],
  emit: Parameters<typeof centerActiveNavigation>[2],
): void {
  emit('update:wideNavigationCollapsed', !props.wideNavigationCollapsed)
}

function toggleNavigationMode(
  props: Parameters<typeof centerActiveNavigation>[0],
  emit: Parameters<typeof centerActiveNavigation>[2],
): void {
  emit('update:expandedNavigationGroupIds', {
    expandedGroupIds: props.navigationAccordion ? groupIds(props.navigation) : [],
    intent: 'mode',
    accordion: !props.navigationAccordion,
  })
}

function groupIds(groups: readonly UiAdminNavigationGroup[]): readonly string[] {
  return groups.flatMap((group) => [
    group.id,
    ...groupIds(group.items.filter((item): item is UiAdminNavigationGroup => 'items' in item)),
  ])
}
