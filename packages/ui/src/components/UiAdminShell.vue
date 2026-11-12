<script setup lang="ts">
import {
  layoutRegistry,
  tokens,
  type LayoutProfileId,
  type LayoutRegistryRecord,
} from '@platform/design-system'
import {
  Comment,
  Fragment,
  Text,
  isVNode,
  computed,
  h,
  inject,
  nextTick,
  useId,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type FunctionalComponent,
  type Slot,
  type HTMLAttributes,
  type VNodeChild,
} from 'vue'

import AdminNavigationSelectionLens from '../adapters/motion/AdminNavigationSelectionLens.vue'
import { NButton } from 'naive-ui/es/button'
import { NCollapse, NCollapseItem } from 'naive-ui/es/collapse'
import { NIcon } from 'naive-ui/es/icon'
import { NImage } from 'naive-ui/es/image'
import { NLayout, NLayoutSider } from 'naive-ui/es/layout'
import type { GlobalThemeOverrides } from 'naive-ui'
import { NMenu, type MenuNodeProps, type MenuOption } from 'naive-ui/es/menu'
import { NDropdown, type DropdownProps } from 'naive-ui/es/dropdown'
import { createPavpNaiveThemeProjection } from '../adapters/naive/pavp-naive-theme'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'
import { loadScrollEnhancement } from '../adapters/scroll/scroll-enhancement-loader'
import { NTooltip } from 'naive-ui/es/tooltip'
import { resolveAdminShellProfile } from '../internal/layout/resolve-admin-shell-profile'
import UiScrollArea from './UiScrollArea.vue'
import type { UiScrollController } from './scroll-contracts'
import type {
  UiAdminNavigationExpansionUpdate,
  UiAdminNavigationGroup,
  UiAdminNavigationItem,
  UiAdminShellCopy,
  UiShellComposition,
} from './contracts'

defineOptions({ name: 'UiAdminShell' })

const props = defineProps<{
  readonly composition: UiShellComposition | null
  readonly navigationFocusRequest?: number
  readonly prepareNavigationFocus?: () => Promise<boolean>
  readonly contentLayout?: 'scroll' | 'contained'
  readonly wideNavigationCollapsed: boolean
  readonly navigationAccordion: boolean
  readonly colorModeSwitchFailed: boolean
  readonly expandedNavigationGroupIds: readonly string[]
  readonly copy: UiAdminShellCopy
  readonly activeRouteName: string
  readonly navigation: readonly UiAdminNavigationGroup[]
}>()

const emit = defineEmits<{
  'content-scroll-controller': [controller: UiScrollController | null]
  'sidebar-viewport': [element: HTMLElement | null]
  'drawer-viewport': [element: HTMLElement | null]
  navigate: [routeName: string]
  'toggle-color-mode': []
  'update:wideNavigationCollapsed': [collapsed: boolean]
  'update:expandedNavigationGroupIds': [update: UiAdminNavigationExpansionUpdate]
}>()

defineSlots<{
  footer?: (props: Readonly<Record<string, never>>) => unknown
  'navigation-bottom'?: (
    props: Readonly<{
      collapsed: boolean
      navigate: (routeName: string) => void
    }>,
  ) => unknown
  workspace: (props: Readonly<Record<string, never>>) => unknown
  default: (props: Readonly<Record<string, never>>) => unknown
}>()

const enabled = computed(() => props.composition !== null)
const containedContent = computed(() => enabled.value && props.contentLayout === 'contained')
const administration = computed(() => props.composition?.startsWith('admin-') === true)
const hasHeader = computed(
  () => administration.value || props.composition?.startsWith('header-') === true,
)

function hasFooterContent(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasFooterContent)
  if (!isVNode(value)) return typeof value === 'string' && value.trim().length > 0
  if (value.type === Comment) return false
  if (value.type === Fragment || value.type === Text) return hasFooterContent(value.children)
  return true
}

// Invoke the application slot during render; components own whether their output is meaningful.
const ShellFooter: FunctionalComponent<{ content: Slot | undefined }> = ({ content: render }) => {
  if (props.composition?.endsWith('-footer') !== true) return null
  const content = render?.({})
  return hasFooterContent(content)
    ? h(
        'footer',
        { class: 'mt-auto shrink-0', 'data-shell-region': 'architecture-console-footer' },
        content,
      )
    : null
}

const injectedAppearance = inject(pavpNaiveAppearanceKey)

if (injectedAppearance === undefined) {
  throw new Error('UiAdminShell requires appearance.')
}

const appearance = injectedAppearance
const colorModeToggleLabel = computed(() =>
  props.colorModeSwitchFailed
    ? props.copy.colorModeChangeFailedLabel
    : appearance.value.colorMode === 'dark'
      ? props.copy.switchToLightLabel
      : props.copy.switchToDarkLabel,
)

const navigationIconClasses = [
  'i-lucide-layout-dashboard',
  'i-lucide-palette',
  'i-lucide-ruler',
  'i-lucide-type',
  'i-lucide-sparkles',
  'i-lucide-swatch-book',
  'i-lucide-cpu',
  'i-lucide-route',
  'i-lucide-database',
  'i-lucide-component',
  'i-lucide-panels-top-left',
  'i-lucide-workflow',
  'i-lucide-map',
] as const
type NavigationIconClass = (typeof navigationIconClasses)[number]

function resolveNavigationIconClass(iconClass: string): NavigationIconClass {
  if (!navigationIconClasses.includes(iconClass as NavigationIconClass)) {
    throw new TypeError(`${iconClass}: Admin Shell navigation icon is not admitted.`)
  }

  return iconClass as NavigationIconClass
}

function layoutRecord(id: string): LayoutRegistryRecord {
  const record = layoutRegistry.records.find((candidate) => candidate.id === id)

  if (record === undefined) {
    throw new TypeError(`${id}: Admin Shell Layout Registry record is missing.`)
  }

  return record
}

const regularMinimum = layoutRecord('layout.profile.regular.min-inline-size')
const wideMinimum = layoutRecord('layout.profile.wide.min-inline-size')
const railInlineSize = layoutRecord('layout.admin.sidebar.rail-inline-size')
const railRemMatch = /^(\d+(?:\.\d+)?)rem$/u.exec(railInlineSize.resolvedValue) ?? []
const railRemMagnitude = Number(railRemMatch[1])

if (!Number.isFinite(railRemMagnitude) || railRemMagnitude <= 0) {
  throw new TypeError(
    `${railInlineSize.id}: Admin Shell rail width must be a finite positive rem value.`,
  )
}

function readRootFontSize(): number {
  const value = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)

  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError('The computed root font size must be finite and positive.')
  }

  return value
}

const shell = ref<HTMLElement>()
const navigationTrigger = ref<InstanceType<typeof NButton>>()
const drawerNavigation = ref<HTMLElement>()
const drawerClose = ref<InstanceType<typeof NButton>>()
const profile = ref<LayoutProfileId>('narrow')
const navigationOpen = ref(false)
const drawerVisible = computed(
  () => administration.value && profile.value === 'narrow' && navigationOpen.value,
)
const persistentNavigation = ref<HTMLElement | null>(null)
const popupOwnerId = useId()
const collapsedPopupKey = ref<string>()
const collapsedPopupPath = shallowRef<MenuOption[]>([])
const focusedNavigationLabelKey = ref<string | number | false>()
const popupViewport = shallowRef({ height: window.innerHeight })
let popupTrigger: HTMLButtonElement | undefined
let popupKeyboardEntry = false
let drawerFocusGeneration = 0
let lastDrawerFocus: HTMLElement | undefined
const currentRootFontSize = ref(readRootFontSize())
const collapsedNavigationWidth = computed(() => railRemMagnitude * currentRootFontSize.value)
const persistentNavigationCollapsed = computed(() => {
  if (profile.value === 'regular') {
    return true
  }

  return profile.value === 'wide' && props.wideNavigationCollapsed
})
const expandedNavigationWidth = tokens['layout.admin.sidebar.expanded-inline-size']
const persistentLayoutContentStyle = Object.freeze({ overflow: 'visible' })
const shellLayoutThemeOverrides = Object.freeze({ color: 'transparent' }) satisfies NonNullable<
  GlobalThemeOverrides['Layout']
>
const headerActionThemeOverrides = Object.freeze({ paddingMedium: '0' }) satisfies NonNullable<
  GlobalThemeOverrides['Button']
>
const collapsedMenuStyle = computed(() => {
  const menu = createPavpNaiveThemeProjection(appearance.value).themeOverrides.Menu
  return {
    '--n-item-color-active': menu.itemColorActiveCollapsed,
    '--pavp-collapsed-foreground': menu.itemIconColorCollapsed,
    '--pavp-collapsed-active-foreground': menu.itemIconColorChildActive,
    '--pavp-collapsed-hover': menu.itemColorHover,
    '--pavp-collapsed-hover-foreground': menu.itemIconColorHover,
  }
})
const persistentSiderContentStyle = Object.freeze({ overflow: 'hidden' })

const wideNavigationCollapseLabel = computed(() =>
  props.wideNavigationCollapsed
    ? props.copy.expandNavigationLabel
    : props.copy.collapseNavigationLabel,
)
function navigationLeaves(group: UiAdminNavigationGroup): readonly UiAdminNavigationItem[] {
  return group.items.flatMap((item) => ('items' in item ? navigationLeaves(item) : [item]))
}

function navigationGroups(
  groups: readonly UiAdminNavigationGroup[],
): readonly UiAdminNavigationGroup[] {
  return groups.flatMap((group) => [
    group,
    ...navigationGroups(
      group.items.filter((item): item is UiAdminNavigationGroup => 'items' in item),
    ),
  ])
}

const allNavigationGroups = computed(() => navigationGroups(props.navigation))
const validExpandedNavigationGroupKeys = computed(() => {
  const expandedIds = new Set(props.expandedNavigationGroupIds)
  return allNavigationGroups.value
    .filter((group) => expandedIds.has(group.id))
    .map((group) => navigationGroupKey(group.id))
})

const navigationGroupsToggleLabel = computed(() =>
  props.navigationAccordion
    ? props.copy.freeNavigationModeLabel
    : props.copy.accordionNavigationModeLabel,
)
let currentShellInlineSize = 0
let resizeObserver: ResizeObserver | undefined
let rootOverflow = ''
let bodyOverflow = ''
let documentScrollGeneration = 0
let disposeDocumentScroll: (() => void) | undefined

function closeNavigation(): void {
  navigationOpen.value = false
}

function handleDrawerScrimPointerDown(event: PointerEvent): void {
  if (event.button !== 0 || event.target !== event.currentTarget) {
    return
  }

  event.preventDefault()
  closeNavigation()
}

function openNavigation(): void {
  navigationOpen.value = true
}

function isCurrentDestination(routeName: string): boolean {
  return props.navigation.some((group) =>
    navigationLeaves(group).some(
      (item) => item.routeName === routeName && item.isCurrentDestination,
    ),
  )
}

function navigate(routeName: string): void {
  if (profile.value === 'narrow' && navigationOpen.value) {
    closeNavigation()
  }

  if (isCurrentDestination(routeName)) {
    return
  }

  emit('navigate', routeName)
}

function preserveCurrentPersistentNavigationFocus(event: PointerEvent, routeName: string): void {
  if (event.button === 0 && isCurrentDestination(routeName)) {
    event.preventDefault()
  }
}

function navigationGroupKey(groupId: string): string {
  return `navigation-group:${groupId}`
}

function navigationOptionKind(option: MenuOption): 'group' | 'route' | undefined {
  return option['pavpNavigationKind'] === 'group' || option['pavpNavigationKind'] === 'route'
    ? option['pavpNavigationKind']
    : undefined
}

function navigationOptionRouteName(option: MenuOption): string | undefined {
  return typeof option['pavpRouteName'] === 'string' ? option['pavpRouteName'] : undefined
}

function renderNavigationIcon(iconClass: string): () => ReturnType<typeof h> {
  const admittedIconClass = resolveNavigationIconClass(iconClass)

  return () =>
    h('span', {
      'aria-hidden': 'true',
      class: [admittedIconClass, 'pavp-admin-shell__navigation-icon'],
    })
}

function navigationGroupOption(group: UiAdminNavigationGroup): MenuOption {
  const firstItem = navigationLeaves(group)[0]
  if (firstItem === undefined) {
    throw new TypeError(`${group.id}: Admin Shell navigation group must contain route items.`)
  }
  return {
    key: navigationGroupKey(group.id),
    label: group.label,
    icon: renderNavigationIcon(firstItem.iconClass),
    pavpNavigationKind: 'group',
    children: group.items.map((item) => {
      if ('items' in item) return navigationGroupOption(item)
      return {
        key: item.routeName,
        label: item.label,
        icon: renderNavigationIcon(item.iconClass),
        pavpNavigationKind: 'route',
        pavpRouteName: item.routeName,
      }
    }),
  }
}

const navigationMenuOptions = computed<MenuOption[]>(() =>
  props.navigation.map(navigationGroupOption),
)

const activeNavigationGroupKey = computed(() => {
  const activeGroup = props.navigation.find((group) =>
    navigationLeaves(group).some((item) => item.routeName === props.activeRouteName),
  )

  return activeGroup === undefined ? undefined : navigationGroupKey(activeGroup.id)
})

function renderNavigationMenuIcon(option: MenuOption): VNodeChild {
  return typeof option.icon === 'function' ? option.icon() : null
}

function navigationLabelTruncated(option: MenuOption): boolean {
  const label = navigationNodes(persistentNavigation.value)
    .find((node) => node.dataset['pavpNavigationKey'] === String(option.key))
    ?.querySelector<HTMLElement>('[data-pavp-navigation-label]')
  return label !== undefined && label !== null && label.scrollWidth > label.clientWidth
}

function isPersistentNavigationSelectionLensOwner(option: MenuOption): boolean {
  if (profile.value === 'narrow') {
    return false
  }

  const optionKind = navigationOptionKind(option)

  if (persistentNavigationCollapsed.value) {
    return optionKind === 'group' && option.key === activeNavigationGroupKey.value
  }

  return optionKind === 'route' && navigationOptionRouteName(option) === props.activeRouteName
}

function visibleFocusTarget(element: HTMLElement): boolean {
  return (
    element.isConnected &&
    !element.closest('[inert], [hidden], [aria-hidden="true"]') &&
    !element.matches(':disabled') &&
    element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== 'hidden'
  )
}

function navigationNodes(root: HTMLElement | null | undefined): HTMLElement[] {
  return Array.from(root?.querySelectorAll<HTMLElement>('[data-pavp-navigation-key]') ?? []).filter(
    visibleFocusTarget,
  )
}

function moveNavigationFocus(event: KeyboardEvent, nodes: HTMLElement[]): boolean {
  const index = nodes.indexOf(event.currentTarget as HTMLElement)
  const target =
    event.key === 'Home'
      ? nodes[0]
      : event.key === 'End'
        ? nodes.at(-1)
        : event.key === 'ArrowDown'
          ? nodes[(index + 1) % nodes.length]
          : event.key === 'ArrowUp'
            ? nodes[(index - 1 + nodes.length) % nodes.length]
            : undefined
  if (target === undefined) return false
  event.preventDefault()
  target.focus()
  return true
}

function setNavigationGroupExpanded(option: MenuOption, expanded: boolean): void {
  const path: string[] = []
  const findPath = (options: MenuOption[]): boolean =>
    options.some((candidate) => {
      if (navigationOptionKind(candidate) !== 'group' || typeof candidate.key !== 'string')
        return false
      path.push(candidate.key)
      if (candidate.key === option.key || findPath(candidate.children ?? [])) return true
      path.pop()
      return false
    })
  findPath(navigationMenuOptions.value)
  const current = validExpandedNavigationGroupKeys.value
  void handleNavigationAction(
    'groups',
    expanded
      ? props.navigationAccordion
        ? path
        : [...new Set([...current, ...path])]
      : current.filter((key) => key !== option.key),
  )
}

function isComposingKey(event: KeyboardEvent): boolean {
  // IME boundary keydowns can clear isComposing before the confirming key arrives.
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- 229 is the remaining IME compatibility signal.
  return event.isComposing || event.keyCode === 229
}

function handlePersistentNavigationKeydown(event: KeyboardEvent, option: MenuOption): void {
  if (
    event.defaultPrevented ||
    isComposingKey(event) ||
    event.target !== event.currentTarget ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  )
    return
  if (event.key === 'Escape') focusedNavigationLabelKey.value = false
  if (moveNavigationFocus(event, navigationNodes(persistentNavigation.value))) return
  const group = navigationOptionKind(option) === 'group'
  const expanded = validExpandedNavigationGroupKeys.value.includes(String(option.key))
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (group) setNavigationGroupExpanded(option, !expanded)
    else {
      const routeName = navigationOptionRouteName(option)
      if (routeName !== undefined) navigate(routeName)
    }
  } else if (event.key === 'ArrowRight' && group) {
    event.preventDefault()
    if (!expanded) setNavigationGroupExpanded(option, true)
    else {
      const children = (option.children ?? []) as MenuOption[]
      navigationNodes(persistentNavigation.value)
        .find((node) => node.dataset['pavpNavigationKey'] === String(children[0]?.key))
        ?.focus()
    }
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    if (group && expanded) setNavigationGroupExpanded(option, false)
    else {
      const parent = allNavigationGroups.value.find((candidate) =>
        candidate.items.some(
          (item) => ('items' in item ? navigationGroupKey(item.id) : item.routeName) === option.key,
        ),
      )
      navigationNodes(persistentNavigation.value)
        .find(
          (node) =>
            node.dataset['pavpNavigationKey'] ===
            (parent === undefined ? undefined : navigationGroupKey(parent.id)),
        )
        ?.focus()
    }
  }
}

type NavigationNodeAttributes = HTMLAttributes &
  Record<`data-${string}`, string | undefined> & { onScrollCapture?: () => void }

// Naive 2.45.2 intersects HTMLAttributes with a string/number record. Keep
// HTML event handlers checked before bridging that incompatible index signature.
const persistentNavigationNodeProps = ((
  option: Parameters<MenuNodeProps>[0],
): NavigationNodeAttributes => {
  const routeName = navigationOptionRouteName(option)
  return {
    tabindex: 0,
    'data-pavp-navigation-key': String(option.key),
    'aria-expanded':
      navigationOptionKind(option) === 'group'
        ? validExpandedNavigationGroupKeys.value.includes(String(option.key))
        : undefined,
    'aria-current': routeName === props.activeRouteName ? 'page' : undefined,
    onKeydown: (event: KeyboardEvent) => {
      handlePersistentNavigationKeydown(event, option)
    },
    onFocusin: () => {
      focusedNavigationLabelKey.value = navigationLabelTruncated(option) ? option.key : undefined
    },
    onFocusout: () => {
      focusedNavigationLabelKey.value = undefined
    },
    onPointerenter: () => {
      if (focusedNavigationLabelKey.value === false) focusedNavigationLabelKey.value = undefined
    },
    onPointerdown: (event: PointerEvent) => {
      if (routeName !== undefined) preserveCurrentPersistentNavigationFocus(event, routeName)
    },
  }
}) as MenuNodeProps

const ShellNavigationIcon: FunctionalComponent<{
  option: MenuOption
  render: (option: MenuOption) => VNodeChild
}> = ({ option, render }) => render(option)

function collapsedPopupRoot(): HTMLElement | undefined {
  return document.getElementById(`${popupOwnerId}-${String(collapsedPopupKey.value)}`) ?? undefined
}

function collapsedPopupOptions(option: MenuOption): MenuOption[] {
  const parent =
    collapsedPopupKey.value === option.key ? (collapsedPopupPath.value.at(-1) ?? option) : option
  return parent.children ?? []
}

function focusCollapsedPopup(last = false): void {
  const key = collapsedPopupKey.value
  const active = document.activeElement
  void nextTick(() => {
    if (
      key === undefined ||
      collapsedPopupKey.value !== key ||
      (document.activeElement !== active && document.activeElement !== document.body)
    )
      return
    const nodes = navigationNodes(collapsedPopupRoot())
    ;(last ? nodes.at(-1) : nodes[0])?.focus()
  })
}

function closeCollapsedPopup(restoreFocus = false): void {
  const root = collapsedPopupRoot()
  const ownsFocus = root?.contains(document.activeElement) === true
  collapsedPopupKey.value = undefined
  collapsedPopupPath.value = []
  popupKeyboardEntry = false
  if (restoreFocus && ownsFocus && popupTrigger !== undefined && visibleFocusTarget(popupTrigger))
    popupTrigger.focus({ preventScroll: true })
}

function handleCollapsedPopupShow(show: boolean, option: MenuOption): void {
  if (show) {
    const trigger = navigationNodes(persistentNavigation.value).find(
      (node) => node.dataset['pavpNavigationKey'] === String(option.key),
    )
    popupTrigger = trigger instanceof HTMLButtonElement ? trigger : undefined
    if (collapsedPopupKey.value !== option.key) collapsedPopupPath.value = []
    collapsedPopupKey.value = String(option.key)
  } else if (collapsedPopupKey.value === option.key) {
    // A pointer leaving the trigger must not dismiss a keyboard-owned menu.
    if (popupKeyboardEntry && collapsedPopupRoot()?.contains(document.activeElement)) return
    closeCollapsedPopup()
  }
}

function handleCollapsedTriggerKeydown(event: KeyboardEvent, option: MenuOption): void {
  if (
    event.defaultPrevented ||
    isComposingKey(event) ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  )
    return
  if (!['Enter', ' ', 'ArrowRight', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
    moveNavigationFocus(event, navigationNodes(persistentNavigation.value))
    return
  }
  event.preventDefault()
  popupTrigger = event.currentTarget as HTMLButtonElement
  popupKeyboardEntry = true
  collapsedPopupPath.value = []
  collapsedPopupKey.value = String(option.key)
  focusCollapsedPopup(event.key === 'ArrowUp')
}

function collapsedNavigationGroupRouteName(option: MenuOption): string | undefined {
  const group = props.navigation.find(
    (candidate) => navigationGroupKey(candidate.id) === option.key,
  )
  return group === undefined ? undefined : navigationLeaves(group)[0]?.routeName
}

function handleCollapsedTriggerClick(event: MouseEvent, option: MenuOption): void {
  if (event.button !== 0) return
  // Keyboard and assistive-technology activation opens the choices; pointer keeps the first route shortcut.
  if (event.detail === 0) {
    popupTrigger = event.currentTarget as HTMLButtonElement
    popupKeyboardEntry = true
    collapsedPopupKey.value = String(option.key)
    focusCollapsedPopup()
    return
  }
  const routeName = collapsedNavigationGroupRouteName(option)
  if (routeName !== undefined) navigate(routeName)
}

function handleCollapsedTriggerPointerdown(event: PointerEvent, option: MenuOption): void {
  const routeName = collapsedNavigationGroupRouteName(option)
  if (routeName !== undefined) preserveCurrentPersistentNavigationFocus(event, routeName)
}

function selectCollapsedRoute(value: string | number): void {
  closeCollapsedPopup(true)
  handleNavigationValueUpdate(value)
}

const persistentNavigationDropdownNodeProps = ((
  option: Parameters<MenuNodeProps>[0],
): NavigationNodeAttributes => ({
  tabindex: 0,
  role: 'menuitem',
  'data-pavp-navigation-key': String(option.key),
  'aria-haspopup': navigationOptionKind(option) === 'group' ? 'menu' : undefined,
  'aria-current': navigationOptionRouteName(option) === props.activeRouteName ? 'page' : undefined,
  onPointerdown: (event: PointerEvent) => {
    const routeName = navigationOptionRouteName(option)
    if (routeName !== undefined) preserveCurrentPersistentNavigationFocus(event, routeName)
  },
  onKeydown: (event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      isComposingKey(event) ||
      event.target !== event.currentTarget ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return
    popupKeyboardEntry = true
    const root =
      (event.currentTarget as HTMLElement).closest<HTMLElement>('[data-pavp-navigation-popup]') ??
      undefined
    if (moveNavigationFocus(event, navigationNodes(root))) return
    if (
      event.key === 'Escape' ||
      (event.key === 'ArrowLeft' && collapsedPopupPath.value.length === 0)
    ) {
      event.preventDefault()
      closeCollapsedPopup(true)
    } else if (event.key === 'Tab') {
      // Return to the trigger before native Tab moves to the adjacent page control.
      closeCollapsedPopup(true)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      collapsedPopupPath.value = collapsedPopupPath.value.slice(0, -1)
      focusCollapsedPopup()
    } else if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowRight') {
      const routeName = navigationOptionRouteName(option)
      if (navigationOptionKind(option) === 'group') {
        event.preventDefault()
        collapsedPopupPath.value = [...collapsedPopupPath.value, option]
        focusCollapsedPopup()
      } else if (routeName !== undefined && event.key !== 'ArrowRight') {
        event.preventDefault()
        selectCollapsedRoute(routeName)
      }
    }
  },
})) as MenuNodeProps

function updatePopupViewport(): void {
  popupViewport.value = { height: window.innerHeight }
}

function collapsedPopupMenuProps(group: MenuOption): NonNullable<DropdownProps['menuProps']> {
  const viewportHeight = popupViewport.value.height
  return ((parent: MenuOption | undefined): NavigationNodeAttributes => {
    const anchor = navigationNodes(
      parent === undefined ? persistentNavigation.value : collapsedPopupRoot(),
    ).find((node) => node.dataset['pavpNavigationKey'] === String((parent ?? group).key))
    const bounds = anchor?.getBoundingClientRect()
    return {
      id: parent === undefined ? `${popupOwnerId}-${String(group.key)}` : undefined,
      class: 'pavp-admin-navigation-dropdown',
      'data-pavp-navigation-popup': popupOwnerId,
      style: {
        maxHeight: `min(calc(100dvh - 2 * var(--ui-space-content-gap)), calc(${String(
          Math.max(bounds?.bottom ?? 0, viewportHeight - (bounds?.top ?? 0)),
        )}px - var(--ui-space-content-gap)))`,
      },
      onScrollCapture: updatePopupViewport,
      onFocusout: () => {
        void nextTick(() => {
          if (
            popupKeyboardEntry &&
            !collapsedPopupRoot()?.contains(document.activeElement) &&
            document.activeElement !== popupTrigger
          )
            closeCollapsedPopup()
        })
      },
    }
  }) as unknown as NonNullable<DropdownProps['menuProps']>
}

const persistentNavigationDropdownProps = {
  // Naive's keyboard handler tracks pending keys globally; this shell focuses real local nodes.
  keyboard: false,
  scrollable: true,
  nodeProps: persistentNavigationDropdownNodeProps,
  to: '#pavp-overlay-root',
  trigger: 'hover',
} satisfies DropdownProps

function renderNavigationMenuLabel(option: MenuOption): VNodeChild {
  return h(
    NTooltip,
    {
      to: '#pavp-overlay-root',
      placement: 'right',
      getDisabled: () => !navigationLabelTruncated(option),
      show:
        focusedNavigationLabelKey.value === false
          ? false
          : focusedNavigationLabelKey.value === option.key
            ? true
            : undefined,
    },
    {
      default: () => String(option.label),
      trigger: () =>
        h(
          'span',
          { class: 'block truncate', 'data-pavp-navigation-label': '' },
          String(option.label),
        ),
    },
  )
}

function handleNavigationValueUpdate(value: string | number): void {
  if (typeof value === 'string') {
    navigate(value)
  }
}

function handleNavigationExpandedKeysUpdate(keys: (string | number)[]): void {
  if (props.navigationAccordion) {
    // Naive only closes root siblings. Resolve a newly opened branch before
    // persistence normalizes key order, retaining its ancestors at every depth.
    const openedKey = keys.find(
      (key) => !validExpandedNavigationGroupKeys.value.includes(String(key)),
    )
    const openedGroup = allNavigationGroups.value.find(
      (group) => navigationGroupKey(group.id) === openedKey,
    )
    if (openedGroup !== undefined) {
      setNavigationGroupExpanded(navigationGroupOption(openedGroup), true)
      return
    }
  }
  void handleNavigationAction('groups', keys)
}

async function handleNavigationAction(
  action: 'focus' | 'mode' | 'sidebar' | 'groups',
  keys?: readonly (string | number)[],
): Promise<void> {
  if (action === 'focus' && props.prepareNavigationFocus !== undefined) {
    if (!(await props.prepareNavigationFocus().catch(() => false))) return
    await nextTick()
  }
  void import('./navigation-actions').then((module) => {
    void module.runNavigationAction(action, props, shell.value, emit, keys)
  })
}

watch(
  () => props.navigationFocusRequest,
  () => {
    void handleNavigationAction('focus')
  },
  { flush: 'post' },
)

function shellButtonElement(
  button: InstanceType<typeof NButton> | undefined,
): HTMLButtonElement | undefined {
  const element: unknown = button?.$el
  return element instanceof HTMLButtonElement ? element : undefined
}

function drawerTabStops(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, summary, [tabindex], [contenteditable="true"]',
    ),
  )
    .filter((node) => node.tabIndex >= 0 && visibleFocusTarget(node))
    .filter(
      (node, _, nodes) =>
        !(
          node instanceof HTMLInputElement &&
          node.type === 'radio' &&
          node.name !== '' &&
          !node.checked &&
          nodes.some(
            (candidate) =>
              candidate instanceof HTMLInputElement &&
              candidate.type === 'radio' &&
              candidate.name === node.name &&
              candidate.form === node.form &&
              candidate.checked,
          )
        ),
    )
    .sort((left, right) => (left.tabIndex || Infinity) - (right.tabIndex || Infinity))
}

function handleDrawerKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || isComposingKey(event) || !drawerVisible.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    closeNavigation()
  } else if (event.key === 'Tab') {
    const root = drawerNavigation.value
    if (root === undefined) return
    const stops = drawerTabStops(root)
    const first = stops[0]
    const last = stops.at(-1)
    if (
      first === undefined ||
      (event.shiftKey && (document.activeElement === first || document.activeElement === root)) ||
      (!event.shiftKey && (document.activeElement === last || document.activeElement === root))
    ) {
      event.preventDefault()
      ;(event.shiftKey ? (last ?? root) : (first ?? root)).focus({ preventScroll: true })
    }
  }
}

function handleDrawerBeforeLeave(element: Element): void {
  if (element instanceof HTMLElement) element.inert = true
}

function handleDrawerFocusin(event: FocusEvent): void {
  if (event.target instanceof HTMLElement) lastDrawerFocus = event.target
}

watch(
  drawerVisible,
  (visible) => {
    const generation = ++drawerFocusGeneration
    const root = drawerNavigation.value
    const previousFocus = document.activeElement
    const trigger = shellButtonElement(navigationTrigger.value)
    const ownedFocus =
      root?.contains(previousFocus) === true ||
      (previousFocus === document.body &&
        lastDrawerFocus !== undefined &&
        !lastDrawerFocus.isConnected)
    void nextTick(() => {
      if (generation !== drawerFocusGeneration) return
      if (visible) {
        if (document.activeElement !== previousFocus && document.activeElement !== document.body)
          return
        ;(shellButtonElement(drawerClose.value) ?? drawerNavigation.value)?.focus({
          preventScroll: true,
        })
      } else if (ownedFocus) {
        const active = document.activeElement
        if (active !== previousFocus && active !== document.body && root?.contains(active) !== true)
          return
        const fallback = shell.value?.querySelectorAll<HTMLElement>(
          'button, a[href], [data-pavp-navigation-key]',
        )
        const destination =
          trigger !== undefined && visibleFocusTarget(trigger)
            ? trigger
            : Array.from(fallback ?? []).find(visibleFocusTarget)
        destination?.focus({ preventScroll: true })
        lastDrawerFocus = undefined
      }
    })
  },
  // Capture focus before the queued render; nextTick then waits for refs and inert to update.
  { flush: 'pre' },
)

watch([profile, persistentNavigationCollapsed], () => {
  closeCollapsedPopup()
})

function updateResponsiveNavigationMetrics(inlineSize = currentShellInlineSize): void {
  currentShellInlineSize = inlineSize
  currentRootFontSize.value = readRootFontSize()
  profile.value = resolveAdminShellProfile({
    inlineSize: currentShellInlineSize,
    rootFontSize: currentRootFontSize.value,
    regularMinimum,
    wideMinimum,
  })

  if (profile.value !== 'narrow') {
    navigationOpen.value = false
  }
}

function updateDocumentScrollLock(): void {
  const generation = ++documentScrollGeneration
  disposeDocumentScroll?.()
  disposeDocumentScroll = undefined
  document.documentElement.style.overflow = enabled.value ? 'hidden' : rootOverflow
  document.body.style.overflow = enabled.value ? 'hidden' : bodyOverflow
  if (!enabled.value)
    void loadScrollEnhancement().then((runtime) => {
      if (generation === documentScrollGeneration)
        disposeDocumentScroll = runtime?.attachDocumentScrollbar()
    })
}

watch(enabled, updateDocumentScrollLock, { flush: 'post' })
watch(
  administration,
  (active) => {
    if (!active) {
      navigationOpen.value = false
    }
  },
  { flush: 'sync' },
)

onMounted(() => {
  const target = shell.value

  if (target === undefined) {
    throw new Error('UiAdminShell element unavailable.')
  }

  rootOverflow = document.documentElement.style.overflow
  bodyOverflow = document.body.style.overflow
  updateDocumentScrollLock()
  updateResponsiveNavigationMetrics(target.getBoundingClientRect().width)
  resizeObserver = new ResizeObserver((entries) => {
    updatePopupViewport()
    const entry = entries[0]

    if (entry !== undefined) {
      updateResponsiveNavigationMetrics(
        entry.borderBoxSize[0]?.inlineSize ?? entry.contentRect.width,
      )
    }
  })
  resizeObserver.observe(target)
})

onBeforeUnmount(() => {
  drawerFocusGeneration += 1
  documentScrollGeneration += 1
  disposeDocumentScroll?.()
  resizeObserver?.disconnect()
  resizeObserver = undefined
  document.documentElement.style.overflow = rootOverflow
  document.body.style.overflow = bodyOverflow
  navigationOpen.value = false
})

watch(
  () => appearance.value.fontScale,
  () => {
    updateResponsiveNavigationMetrics()
  },
  { flush: 'post' },
)
</script>

<template>
  <div
    ref="shell"
    :class="enabled ? 'pavp-admin-shell flex flex-col min-w-0' : 'pavp-admin-shell-document'"
    :data-header="hasHeader"
    :data-layout-profile="enabled ? profile : undefined"
    :data-navigation-collapsed="persistentNavigationCollapsed ? 'true' : 'false'"
    @scroll.capture="collapsedPopupKey !== undefined && updatePopupViewport()"
  >
    <header
      v-if="hasHeader"
      :inert="drawerVisible"
      class="pavp-admin-shell__header shrink-0 h-admin-header"
      data-shell-region="architecture-console-header"
    >
      <NButton
        v-if="administration && profile === 'narrow'"
        ref="navigationTrigger"
        text
        native-focus-behavior
        :aria-label="copy.openNavigationLabel"
        class="pavp-admin-shell__action rounded-control min-h-target-enhanced min-w-target-enhanced"
        attr-type="button"
        @click="openNavigation"
      >
        {{ copy.navigationActionLabel }}
      </NButton>
      <div class="pavp-admin-shell__identity min-w-0">
        <NImage
          v-if="copy.logoUrl"
          :src="copy.logoUrl"
          :alt="copy.brandName ?? copy.consoleTitle"
          :preview-disabled="true"
          width="100%"
          height="100%"
          class="shrink-0 self-center size-icon-extra-large"
          object-fit="contain"
        >
          <template #error>
            <NIcon
              class="h-full w-full"
              aria-hidden="true"
            >
              <span class="i-lucide-building-2 h-full w-full block" />
            </NIcon>
          </template>
        </NImage>
        <span
          v-else-if="!copy.brandName"
          class="pavp-admin-shell__eyebrow"
          v-text="'PAVP'"
        />
        <strong
          class="truncate"
          :title="copy.consoleTitle"
          v-text="copy.consoleTitle"
        />
      </div>
      <div class="flex items-center gap-content-gap">
        <div
          v-if="administration && profile === 'wide'"
          class="pavp-admin-shell__header-actions flex items-center gap-content-gap"
        >
          <NTooltip
            class="pavp-admin-shell__header-action-tooltip"
            placement="bottom-end"
            :show-arrow="false"
            to="#pavp-overlay-root"
          >
            <template #trigger>
              <NButton
                :aria-label="copy.locateCurrentLabel"
                :bordered="false"
                attr-type="button"
                class="pavp-admin-shell__header-action shrink-0 min-h-target-enhanced min-w-target-enhanced"
                :theme-overrides="headerActionThemeOverrides"
                type="tertiary"
                @click="handleNavigationAction('focus')"
              >
                <template #icon>
                  <NIcon
                    aria-hidden="true"
                    class="i-lucide-focus"
                  />
                </template>
              </NButton>
            </template>
            {{ copy.locateCurrentLabel }}
          </NTooltip>
          <NTooltip
            v-if="!persistentNavigationCollapsed"
            class="pavp-admin-shell__header-action-tooltip"
            placement="bottom-end"
            :show-arrow="false"
            to="#pavp-overlay-root"
          >
            <template #trigger>
              <NButton
                :aria-label="navigationGroupsToggleLabel"
                :bordered="false"
                attr-type="button"
                class="pavp-admin-shell__header-action shrink-0 min-h-target-enhanced min-w-target-enhanced"
                data-pavp-admin-navigation-groups-control="header-trailing"
                :theme-overrides="headerActionThemeOverrides"
                type="tertiary"
                @click="handleNavigationAction('mode')"
              >
                <template #icon>
                  <span
                    class="pavp-admin-shell__header-action-icon-stack inline-grid items-center justify-center"
                    data-pavp-admin-navigation-icon-stack="groups"
                  >
                    <NIcon
                      :class="{
                        'pavp-admin-shell__header-action-icon-state--active': !navigationAccordion,
                      }"
                      aria-hidden="true"
                      class="pavp-admin-shell__header-action-icon-state i-lucide-list-collapse col-start-1 row-start-1"
                      data-pavp-admin-navigation-icon-state="groups-expanded"
                    />
                    <NIcon
                      :class="{
                        'pavp-admin-shell__header-action-icon-state--active': navigationAccordion,
                      }"
                      aria-hidden="true"
                      class="pavp-admin-shell__header-action-icon-state i-lucide-list-tree col-start-1 row-start-1"
                      data-pavp-admin-navigation-icon-state="groups-collapsed"
                    />
                  </span>
                </template>
              </NButton>
            </template>
            {{ navigationGroupsToggleLabel }}
          </NTooltip>
          <NTooltip
            class="pavp-admin-shell__header-action-tooltip"
            placement="bottom-end"
            :show-arrow="false"
            to="#pavp-overlay-root"
          >
            <template #trigger>
              <NButton
                :aria-label="wideNavigationCollapseLabel"
                :bordered="false"
                attr-type="button"
                class="pavp-admin-shell__header-action shrink-0 min-h-target-enhanced min-w-target-enhanced"
                data-pavp-admin-navigation-collapse-control="header-trailing"
                :theme-overrides="headerActionThemeOverrides"
                type="tertiary"
                @click="handleNavigationAction('sidebar')"
              >
                <template #icon>
                  <span
                    class="pavp-admin-shell__header-action-icon-stack inline-grid items-center justify-center"
                    data-pavp-admin-navigation-icon-stack="sidebar"
                  >
                    <NIcon
                      :class="{
                        'pavp-admin-shell__header-action-icon-state--active':
                          !wideNavigationCollapsed,
                      }"
                      aria-hidden="true"
                      class="pavp-admin-shell__header-action-icon-state i-lucide-panel-left-close col-start-1 row-start-1"
                      data-pavp-admin-navigation-icon-state="sidebar-expanded"
                    />
                    <NIcon
                      :class="{
                        'pavp-admin-shell__header-action-icon-state--active':
                          wideNavigationCollapsed,
                      }"
                      aria-hidden="true"
                      class="pavp-admin-shell__header-action-icon-state i-lucide-panel-left-open col-start-1 row-start-1"
                      data-pavp-admin-navigation-icon-state="sidebar-collapsed"
                    />
                  </span>
                </template>
              </NButton>
            </template>
            {{ wideNavigationCollapseLabel }}
          </NTooltip>
        </div>
        <NTooltip
          v-if="administration"
          class="pavp-admin-shell__header-action-tooltip"
          placement="bottom-end"
          :show-arrow="false"
          to="#pavp-overlay-root"
        >
          <template #trigger>
            <NButton
              :aria-label="colorModeToggleLabel"
              :aria-pressed="appearance.colorMode === 'dark'"
              :bordered="false"
              attr-type="button"
              class="pavp-admin-shell__header-action shrink-0 min-h-target-enhanced min-w-target-enhanced"
              data-pavp-color-mode-control="header-trailing"
              :theme-overrides="headerActionThemeOverrides"
              type="tertiary"
              @click="emit('toggle-color-mode')"
            >
              <template #icon>
                <span
                  class="pavp-admin-shell__header-action-icon-stack inline-grid items-center justify-center"
                >
                  <NIcon
                    :class="{
                      'pavp-admin-shell__header-action-icon-state--active':
                        appearance.colorMode === 'light',
                    }"
                    aria-hidden="true"
                    class="pavp-admin-shell__header-action-icon-state i-lucide-sun col-start-1 row-start-1"
                    data-pavp-color-mode-icon="light"
                  />
                  <NIcon
                    :class="{
                      'pavp-admin-shell__header-action-icon-state--active':
                        appearance.colorMode === 'dark',
                    }"
                    aria-hidden="true"
                    class="pavp-admin-shell__header-action-icon-state i-lucide-moon col-start-1 row-start-1"
                    data-pavp-color-mode-icon="dark"
                  />
                </span>
              </template>
            </NButton>
          </template>
          {{ colorModeToggleLabel }}
        </NTooltip>
      </div>
    </header>

    <NLayout
      :class="enabled ? 'pavp-admin-shell__layout min-h-0' : 'pavp-admin-shell__document-layout'"
      :content-style="persistentLayoutContentStyle"
      :theme-overrides="shellLayoutThemeOverrides"
      data-pavp-admin-navigation="persistent"
      :has-sider="administration && profile !== 'narrow'"
      :native-scrollbar="true"
    >
      <NLayoutSider
        v-if="administration && profile !== 'narrow'"
        :bordered="false"
        class="pavp-admin-shell__sidebar"
        :collapsed="persistentNavigationCollapsed"
        :collapsed-width="collapsedNavigationWidth"
        collapse-mode="width"
        :content-style="persistentSiderContentStyle"
        data-shell-region="architecture-console-navigation"
        :native-scrollbar="true"
        :show-trigger="false"
        :width="expandedNavigationWidth"
      >
        <div class="pavp-admin-shell__navigation-stack flex flex-col h-full min-h-0">
          <UiScrollArea
            class="flex-1 min-h-0"
            owner-id="architecture-console-sidebar"
            @viewport="emit('sidebar-viewport', $event)"
          >
            <AdminNavigationSelectionLens
              v-slot="{ featureReady, renderIcon }"
              :is-owner="isPersistentNavigationSelectionLensOwner"
              :motion="appearance.motion"
              :render-base-icon="renderNavigationMenuIcon"
            >
              <nav
                ref="persistentNavigation"
                :aria-label="copy.navigationLabel"
                class="pavp-admin-shell__persistent-navigation"
                :data-pavp-admin-navigation-motion-ready="
                  featureReady && appearance.motion === 'full' ? 'true' : 'false'
                "
              >
                <div
                  v-if="persistentNavigationCollapsed"
                  class="pavp-admin-shell__collapsed-menu pb-0 grid"
                  :style="collapsedMenuStyle"
                >
                  <NDropdown
                    v-for="option in navigationMenuOptions"
                    :key="String(option.key)"
                    v-bind="persistentNavigationDropdownProps"
                    :options="collapsedPopupOptions(option)"
                    :menu-props="collapsedPopupMenuProps(option)"
                    :show="collapsedPopupKey === option.key"
                    :value="activeRouteName"
                    placement="right-start"
                    size="large"
                    @update:show="handleCollapsedPopupShow($event, option)"
                    @select="selectCollapsedRoute"
                  >
                    <NButton
                      attr-type="button"
                      text
                      block
                      native-focus-behavior
                      class="pavp-admin-shell__collapsed-trigger p-0 border-0 bg-transparent flex w-full cursor-pointer items-center justify-center relative isolate min-h-target-enhanced"
                      :aria-label="String(option.label)"
                      aria-haspopup="menu"
                      :aria-expanded="collapsedPopupKey === option.key"
                      :data-active="option.key === activeNavigationGroupKey"
                      :data-pavp-navigation-key="option.key"
                      @keydown="handleCollapsedTriggerKeydown($event, option)"
                      @click="handleCollapsedTriggerClick($event, option)"
                      @pointerdown="handleCollapsedTriggerPointerdown($event, option)"
                    >
                      <ShellNavigationIcon
                        :option="option"
                        :render="renderIcon"
                      />
                    </NButton>
                  </NDropdown>
                </div>
                <NMenu
                  v-else
                  :accordion="navigationAccordion"
                  class="pavp-admin-shell__menu"
                  :collapsed="persistentNavigationCollapsed"
                  :collapsed-width="collapsedNavigationWidth"
                  children-field="children"
                  :expanded-keys="validExpandedNavigationGroupKeys"
                  mode="vertical"
                  :node-props="persistentNavigationNodeProps"
                  :options="navigationMenuOptions"
                  :render-icon="renderIcon"
                  :render-label="renderNavigationMenuLabel"
                  :value="activeRouteName"
                  @update:expanded-keys="handleNavigationExpandedKeysUpdate"
                  @update:value="handleNavigationValueUpdate"
                />
              </nav>
            </AdminNavigationSelectionLens>
          </UiScrollArea>
          <div
            v-if="$slots['navigation-bottom']"
            class="pavp-admin-shell__navigation-bottom flex-none"
            data-shell-region="architecture-console-navigation-bottom"
          >
            <slot
              name="navigation-bottom"
              :collapsed="persistentNavigationCollapsed"
              :navigate="navigate"
            />
          </div>
        </div>
      </NLayoutSider>

      <div
        :class="enabled ? 'pavp-admin-shell__workspace' : undefined"
        :inert="administration && profile === 'narrow' && navigationOpen"
      >
        <slot
          v-if="administration"
          name="workspace"
        />
        <div
          :role="enabled ? 'main' : undefined"
          :class="enabled ? 'pavp-admin-shell__content min-w-0' : undefined"
          :data-scroll-owner="enabled ? 'architecture-console-content' : undefined"
          :data-shell-region="enabled ? 'architecture-console-content' : undefined"
          :inert="administration && profile === 'narrow' && navigationOpen"
        >
          <UiScrollArea
            owner-id="architecture-console-content"
            :enabled="enabled && !containedContent"
            :contained="containedContent"
            @controller="emit('content-scroll-controller', $event)"
          >
            <div
              :class="
                enabled ? 'pavp-admin-shell__content-inner flex flex-col flex-1 min-w-0' : undefined
              "
              :data-contained="containedContent"
            >
              <slot />
              <ShellFooter :content="$slots['footer']" />
            </div>
          </UiScrollArea>
        </div>
      </div>
    </NLayout>

    <Teleport to="#pavp-overlay-root">
      <Transition
        name="pavp-admin-drawer"
        @before-leave="handleDrawerBeforeLeave"
      >
        <div
          v-if="administration && profile === 'narrow' && navigationOpen"
          class="pavp-admin-shell__drawer-layer"
          data-shell-region="architecture-console-navigation-overlay"
          @pointerdown="handleDrawerScrimPointerDown($event)"
        >
          <!-- A modal dialog owns bubbling Escape and boundary Tab handling, including slotted controls. -->
          <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
          <nav
            ref="drawerNavigation"
            :aria-label="copy.navigationLabel"
            aria-modal="true"
            class="pavp-admin-shell__drawer-navigation"
            role="dialog"
            tabindex="-1"
            @keydown="handleDrawerKeydown"
            @focusin="handleDrawerFocusin"
          >
            <div class="pavp-admin-shell__navigation-stack flex flex-col h-full min-h-0">
              <UiScrollArea
                class="flex-1 min-h-0"
                owner-id="architecture-console-drawer"
                @viewport="emit('drawer-viewport', $event)"
              >
                <div class="pavp-admin-shell__drawer-content">
                  <div class="pavp-admin-shell__drawer-heading">
                    <strong>{{ copy.navigationLabel }}</strong>
                    <NButton
                      ref="drawerClose"
                      text
                      native-focus-behavior
                      :aria-label="copy.closeNavigationLabel"
                      class="pavp-admin-shell__action rounded-control min-h-target-enhanced min-w-target-enhanced"
                      attr-type="button"
                      @click="closeNavigation"
                    >
                      {{ copy.closeActionLabel }}
                    </NButton>
                  </div>
                  <div
                    v-for="group in navigation"
                    :key="group.id"
                    class="pavp-admin-shell__navigation-group"
                  >
                    <p class="pavp-admin-shell__navigation-group-label">
                      {{ group.label }}
                    </p>
                    <template
                      v-for="item in group.items"
                      :key="'items' in item ? item.id : item.routeName"
                    >
                      <NCollapse
                        v-if="'items' in item"
                        class="pavp-admin-shell__drawer-collapse"
                        :default-expanded-names="
                          navigationLeaves(item).some((leaf) => leaf.isCurrentDestination)
                            ? [item.id]
                            : []
                        "
                      >
                        <NCollapseItem :name="item.id">
                          <template #header="{ collapsed }">
                            <NButton
                              :aria-expanded="!collapsed"
                              :aria-controls="`${popupOwnerId}-drawer-${item.id}`"
                              class="pavp-admin-shell__navigation-action pavp-admin-shell__navigation-disclosure rounded-control min-h-target-enhanced min-w-target-enhanced"
                              attr-type="button"
                              text
                              block
                              native-focus-behavior
                            >
                              {{ item.label }}
                            </NButton>
                          </template>
                          <div
                            :id="`${popupOwnerId}-drawer-${item.id}`"
                            class="px-page-inline"
                          >
                            <NButton
                              v-for="leaf in navigationLeaves(item)"
                              :key="leaf.routeName"
                              :aria-current="
                                leaf.routeName === activeRouteName ? 'page' : undefined
                              "
                              class="pavp-admin-shell__navigation-action rounded-control min-h-target-enhanced min-w-target-enhanced"
                              text
                              block
                              native-focus-behavior
                              attr-type="button"
                              @click="navigate(leaf.routeName)"
                            >
                              <span class="inline-flex items-center gap-content-gap">
                                <span
                                  :class="resolveNavigationIconClass(leaf.iconClass)"
                                  aria-hidden="true"
                                  class="pavp-admin-shell__navigation-icon"
                                />
                                <span>{{ leaf.label }}</span>
                              </span>
                            </NButton>
                          </div>
                        </NCollapseItem>
                      </NCollapse>
                      <NButton
                        v-else
                        :aria-current="item.routeName === activeRouteName ? 'page' : undefined"
                        class="pavp-admin-shell__navigation-action rounded-control min-h-target-enhanced min-w-target-enhanced"
                        text
                        block
                        native-focus-behavior
                        attr-type="button"
                        @click="navigate(item.routeName)"
                      >
                        <span class="inline-flex items-center gap-content-gap">
                          <span
                            :class="resolveNavigationIconClass(item.iconClass)"
                            aria-hidden="true"
                            class="pavp-admin-shell__navigation-icon"
                          />
                          <span>{{ item.label }}</span>
                        </span>
                      </NButton>
                    </template>
                  </div>
                </div>
              </UiScrollArea>
              <div
                v-if="$slots['navigation-bottom']"
                class="pavp-admin-shell__navigation-bottom flex-none"
                data-shell-region="architecture-console-navigation-bottom"
                role="presentation"
              >
                <slot
                  name="navigation-bottom"
                  :collapsed="false"
                  :navigate="navigate"
                />
              </div>
            </div>
          </nav>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
@layer components {
  .pavp-admin-shell {
    --pavp-safe-area-top: env(safe-area-inset-top, 0px);
    --pavp-safe-area-right: env(safe-area-inset-right, 0px);
    --pavp-safe-area-bottom: env(safe-area-inset-bottom, 0px);
    --pavp-safe-area-left: env(safe-area-inset-left, 0px);
    position: relative;
    block-size: 100vh;
    overflow: hidden;
    color: var(--ui-color-text-primary);
    background-color: var(--ui-admin-ambient-canvas);
    container-name: pavp-admin-shell;
    container-type: inline-size;
    isolation: isolate;
  }

  @supports (height: 100dvh) {
    .pavp-admin-shell {
      block-size: 100dvh;
    }
  }

  .pavp-admin-shell::before {
    position: absolute;
    z-index: var(--ui-z-base);
    background:
      radial-gradient(
        circle at 12% 4%,
        color-mix(in srgb, var(--ui-admin-ambient-light-primary) 20%, transparent),
        transparent 42%
      ),
      radial-gradient(
        circle at 88% 2%,
        color-mix(in srgb, var(--ui-admin-ambient-light-accent) 16%, transparent),
        transparent 38%
      ),
      linear-gradient(
        color-mix(in srgb, var(--ui-admin-ambient-grid) 14%, transparent) 1px,
        transparent 1px
      ),
      linear-gradient(
        90deg,
        color-mix(in srgb, var(--ui-admin-ambient-grid) 14%, transparent) 1px,
        transparent 1px
      );
    background-size:
      auto,
      auto,
      var(--ui-space-section-block) var(--ui-space-section-block),
      var(--ui-space-section-block) var(--ui-space-section-block);
    content: '';
    inset: 0;
    pointer-events: none;
    animation: pavp-admin-ambient-drift calc(var(--ui-motion-duration) * 40) var(--ui-motion-easing)
      infinite alternate;
  }

  .pavp-admin-shell__header,
  .pavp-admin-shell__layout {
    position: relative;
  }

  .pavp-admin-shell__header {
    z-index: var(--ui-z-base);
    min-block-size: calc(var(--ui-layout-admin-header-block-size) + var(--pavp-safe-area-top));
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-content-gap);
    padding-block-start: var(--pavp-safe-area-top);
    padding-inline: max(var(--ui-space-page-inline), var(--pavp-safe-area-left))
      max(var(--ui-space-page-inline), var(--pavp-safe-area-right));
    color: var(--ui-color-text-primary);
    background: var(--ui-material-chrome-background);
    box-shadow: var(--ui-admin-shadow-chrome);
  }

  .pavp-admin-shell__identity {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-content-gap);
  }

  .pavp-admin-shell__eyebrow {
    color: var(--ui-color-text-primary);
    font-weight: var(--ui-font-weight-title);
  }

  .pavp-admin-shell__layout {
    min-inline-size: 0;
  }

  .pavp-admin-shell__sidebar {
    position: relative;
    flex: 0 0 auto;
    block-size: 100%;
    overflow: hidden;
    background: var(--ui-material-chrome-background);
    box-shadow: var(--ui-admin-shadow-chrome);
  }

  .pavp-admin-shell__navigation-group {
    display: grid;
    gap: var(--ui-space-content-gap);
  }

  .pavp-admin-shell__persistent-navigation {
    position: relative;
    z-index: var(--ui-z-base);
    min-inline-size: 0;
    padding-block: var(--ui-space-content-gap);
  }

  .pavp-admin-shell__menu {
    min-block-size: 0;
    min-inline-size: 0;
  }

  .pavp-admin-shell__navigation-bottom {
    display: flex;
    justify-content: center;
    padding-block: var(--ui-space-content-gap)
      max(var(--ui-space-content-gap), var(--pavp-safe-area-bottom));
    padding-inline: calc(var(--ui-space-content-gap) / 2);
  }

  .pavp-admin-shell__navigation-group-label {
    margin: 0;
    color: var(--ui-color-text-secondary);
    font-size: var(--ui-font-size-body);
    font-weight: var(--ui-font-weight-title);
    line-height: var(--ui-font-line-height-body);
  }

  .pavp-admin-shell__navigation-icon {
    flex: 0 0 auto;
    block-size: var(--ui-font-size-body);
    inline-size: var(--ui-font-size-body);
  }

  .pavp-admin-shell__workspace {
    display: flex;
    block-size: 100%;
    flex: 1 1 auto;
    flex-direction: column;
    min-inline-size: 0;
    min-block-size: 0;
  }

  .pavp-admin-shell__content {
    min-block-size: 0;
    position: relative;
    flex: 1 1 auto;
    inline-size: 100%;
    overflow: hidden;
    overscroll-behavior: contain;
    color: var(--ui-color-text-primary);
    background: var(--ui-admin-surface-content);
  }

  .pavp-admin-shell__content-inner {
    gap: var(--ui-space-section-block);
    inline-size: 100%;
    padding-block: var(--ui-space-section-block)
      max(var(--ui-space-section-block), var(--pavp-safe-area-bottom));
    padding-inline: max(var(--ui-space-page-inline), var(--pavp-safe-area-left))
      max(var(--ui-space-page-inline), var(--pavp-safe-area-right));
  }

  .pavp-admin-shell__content-inner[data-contained='true'] {
    block-size: 100%;
    min-block-size: 0;
  }

  .pavp-admin-shell[data-header='false'] .pavp-admin-shell__content-inner {
    padding-block-start: max(var(--ui-space-section-block), var(--pavp-safe-area-top));
  }

  .pavp-admin-shell__drawer-navigation {
    block-size: 100%;
    inline-size: 100%;
    max-inline-size: var(--ui-layout-admin-drawer-maximum-inline-size);
    overflow: hidden;
    background: var(--ui-material-overlay-background);
    box-shadow: var(--ui-admin-shadow-overlay);
  }

  .pavp-admin-shell__drawer-content {
    display: grid;
    align-content: start;
    gap: var(--ui-space-section-block);
    padding-block: max(var(--ui-space-section-block), var(--pavp-safe-area-top))
      max(var(--ui-space-section-block), var(--pavp-safe-area-bottom));
    padding-inline: max(var(--ui-space-page-inline), var(--pavp-safe-area-left))
      max(var(--ui-space-page-inline), var(--pavp-safe-area-right));
  }

  .pavp-admin-shell__drawer-layer {
    --pavp-safe-area-top: env(safe-area-inset-top, 0px);
    --pavp-safe-area-right: env(safe-area-inset-right, 0px);
    --pavp-safe-area-bottom: env(safe-area-inset-bottom, 0px);
    --pavp-safe-area-left: env(safe-area-inset-left, 0px);
    position: fixed;
    z-index: var(--ui-z-overlay);
    inset-block: 0;
    inset-inline: 0;
    background: var(--ui-color-scrim-viewport);
  }

  .pavp-admin-shell__drawer-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-content-gap);
  }

  .pavp-admin-drawer-enter-active .pavp-admin-shell__drawer-navigation,
  .pavp-admin-drawer-leave-active .pavp-admin-shell__drawer-navigation {
    transition-duration: var(--ui-motion-duration);
    transition-property: transform;
    transition-timing-function: var(--ui-motion-easing);
  }

  .pavp-admin-drawer-enter-from .pavp-admin-shell__drawer-navigation,
  .pavp-admin-drawer-leave-to .pavp-admin-shell__drawer-navigation {
    transform: translateX(calc(var(--ui-layout-admin-drawer-maximum-inline-size) * -1));
  }

  @keyframes pavp-admin-ambient-drift {
    from {
      transform: translateX(calc(var(--ui-space-content-gap) * -1));
    }

    to {
      transform: translateX(var(--ui-space-content-gap));
    }
  }

  @media (prefers-reduced-transparency: reduce) {
    .pavp-admin-shell::before {
      opacity: 0;
    }

    .pavp-admin-shell__header,
    .pavp-admin-shell__sidebar,
    .pavp-admin-shell__navigation-action[aria-current='page'],
    .pavp-admin-shell__drawer-navigation {
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
    }
  }
}

.pavp-admin-shell__layout {
  z-index: var(--ui-z-base);
  flex: 1 1 0%;
}

.pavp-admin-shell__sidebar {
  z-index: var(--ui-z-overlay);
}

.pavp-admin-shell__document-layout {
  overflow: visible;
}
.pavp-admin-shell__collapsed-trigger {
  margin-block-start: calc(var(--ui-space-content-gap) / 2);
  color: var(--pavp-collapsed-foreground);
  transition: color var(--ui-motion-duration) var(--ui-motion-easing);
}

.pavp-admin-shell__collapsed-trigger::before {
  position: absolute;
  z-index: calc(var(--ui-z-base) - 1);
  inset: 0 calc(var(--ui-space-content-gap) / 2);
  border-radius: var(--ui-radius-control);
  content: '';
  transition: background-color var(--ui-motion-duration) var(--ui-motion-easing);
}

.pavp-admin-shell__collapsed-trigger:hover::before {
  background: var(--pavp-collapsed-hover);
}

.pavp-admin-shell__collapsed-trigger:focus {
  color: var(--pavp-collapsed-foreground);
}

.pavp-admin-shell__collapsed-trigger:hover {
  color: var(--pavp-collapsed-hover-foreground);
}

.pavp-admin-shell__collapsed-trigger[data-active='true']::before {
  background: var(--n-item-color-active);
}

.pavp-admin-shell__collapsed-trigger[data-active='true'] {
  color: var(--pavp-collapsed-active-foreground);
}

[data-pavp-admin-navigation-motion-ready='true']
  .pavp-admin-shell__collapsed-trigger[data-active='true']::before {
  background: transparent;
}

.pavp-admin-shell__collapsed-trigger:focus-visible {
  outline: none;
}

.pavp-admin-shell__collapsed-trigger:focus-visible::before {
  box-shadow: var(--ui-admin-shadow-focus-ring);
}

.pavp-admin-shell__action,
.pavp-admin-shell__navigation-action {
  border-radius: var(--ui-radius-control);
  white-space: normal;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ui-space-content-gap);
  border: 0;
  color: var(--ui-color-text-primary);
  font-family: var(--ui-font-family-body);
  font-size: var(--ui-font-size-body);
  font-weight: var(--ui-font-weight-body);
  line-height: var(--ui-font-line-height-body);
  background: transparent;
  cursor: pointer;
  transition-duration: var(--ui-motion-duration);
  transition-property: color, background-color, transform;
  transition-timing-function: var(--ui-motion-easing);
}

.pavp-admin-shell__navigation-action {
  position: relative;
  justify-content: start;
  inline-size: 100%;
  padding-inline: var(--ui-space-page-inline);
  text-align: start;
}

.pavp-admin-shell__action:focus,
.pavp-admin-shell__navigation-action:focus {
  color: var(--ui-color-text-primary);
}

.pavp-admin-shell__action:hover,
.pavp-admin-shell__navigation-action:hover {
  color: var(--ui-color-text-primary);
  background: var(--ui-admin-navigation-hover);
}

.pavp-admin-shell__action:active,
.pavp-admin-shell__navigation-action:active {
  transform: translateY(calc(var(--ui-space-content-gap) / 4));
}

.pavp-admin-shell__navigation-action[aria-current='page'] {
  color: var(--ui-color-text-primary);
  background: var(--ui-material-overlay-background);
}

.pavp-admin-shell__navigation-action::after {
  position: absolute;
  block-size: calc(var(--ui-space-content-gap) / 2);
  inline-size: calc(var(--ui-space-content-gap) / 2);
  border-radius: var(--ui-radius-small);
  background: var(--ui-admin-navigation-selected);
  content: '';
  inset-block-start: 50%;
  inset-inline-end: var(--ui-space-page-inline);
  opacity: 0;
  transform: translateY(-50%) scale(0.72);
  transform-origin: center;
  transition-duration: var(--ui-motion-duration);
  transition-property: opacity, transform;
  transition-timing-function: var(--ui-motion-easing);
}

.pavp-admin-shell__navigation-action[aria-current='page']::after {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}

.pavp-admin-shell__action:focus-visible,
.pavp-admin-shell__navigation-action:focus-visible,
.pavp-admin-shell__drawer-navigation:focus-visible {
  box-shadow: var(--ui-admin-shadow-focus-ring);
  outline: none;
}

@media (forced-colors: active) {
  .pavp-admin-shell__action:focus-visible,
  .pavp-admin-shell__navigation-action:focus-visible,
  .pavp-admin-shell__drawer-navigation:focus-visible,
  .pavp-admin-shell__collapsed-trigger:focus-visible {
    outline: var(--ui-admin-focus-width) solid Highlight;
    outline-offset: calc(var(--ui-admin-focus-width) * -1);
  }

  .pavp-admin-shell__collapsed-menu .pavp-admin-shell__collapsed-trigger[data-active='true'] {
    color: HighlightText;
  }

  .pavp-admin-shell__collapsed-menu
    .pavp-admin-shell__collapsed-trigger[data-active='true']::before {
    background: Highlight;
  }

  .pavp-admin-shell::before {
    display: none;
  }
}

.pavp-admin-shell__navigation-disclosure {
  flex-shrink: 1;
  min-inline-size: 0;
}

.pavp-admin-shell__drawer-collapse :deep(.n-collapse-item__content-inner) {
  padding-block-start: 0;
}

.pavp-admin-shell__drawer-collapse.n-collapse :deep(.n-collapse-item__content-wrapper) {
  opacity: 1;
  transition: none;
}

.pavp-admin-shell__drawer-collapse :deep(.n-collapse-item-arrow) {
  transition: none;
}
</style>

<style>
@layer components {
  .pavp-admin-shell__header-action-icon-state {
    opacity: 0;
    transform: scale(0.98);
    transform-origin: center;
    transition-duration: var(--ui-motion-duration);
    transition-property: opacity, transform;
    transition-timing-function: var(--ui-motion-easing);
  }

  .pavp-admin-shell__header-action-icon-state--active {
    opacity: 1;
    transform: scale(1);
  }

  .pavp-admin-navigation-selection-lens {
    position: absolute;
    inset-block: 0;
    inset-inline: calc(var(--ui-space-content-gap) / 2);
    border-radius: var(--ui-radius-control);
    background: var(--n-item-color-active);
    pointer-events: none;
  }

  html[data-material='adaptive'] .pavp-admin-shell__header,
  html[data-material='adaptive'] .pavp-admin-shell__sidebar,
  html[data-material='adaptive'] .pavp-admin-shell__navigation-action[aria-current='page'],
  html[data-material='adaptive'] .pavp-admin-shell__drawer-navigation,
  html[data-material='adaptive'] .pavp-admin-navigation-dropdown {
    -webkit-backdrop-filter: blur(var(--ui-admin-optical-backdrop-blur));
    backdrop-filter: blur(var(--ui-admin-optical-backdrop-blur));
  }

  html[data-material='reduced'] .pavp-admin-shell__header,
  html[data-material='reduced'] .pavp-admin-shell__sidebar,
  html[data-material='reduced'] .pavp-admin-shell__navigation-action[aria-current='page'],
  html[data-material='reduced'] .pavp-admin-shell__drawer-navigation,
  html[data-material='reduced'] .pavp-admin-navigation-dropdown,
  html[data-material='solid'] .pavp-admin-shell__header,
  html[data-material='solid'] .pavp-admin-shell__sidebar,
  html[data-material='solid'] .pavp-admin-shell__navigation-action[aria-current='page'],
  html[data-material='solid'] .pavp-admin-shell__drawer-navigation,
  html[data-material='solid'] .pavp-admin-navigation-dropdown {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  html[data-material='reduced'] .pavp-admin-shell__header,
  html[data-material='reduced'] .pavp-admin-shell__sidebar,
  html[data-material='reduced'] .pavp-admin-shell__drawer-navigation {
    box-shadow: none;
  }

  html[data-motion='reduced'] .pavp-admin-shell::before,
  html[data-motion='none'] .pavp-admin-shell::before {
    animation: none;
  }

  html[data-motion='reduced']
    .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-from
    .pavp-admin-shell__drawer-navigation,
  html[data-motion='reduced']
    .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-to
    .pavp-admin-shell__drawer-navigation {
    transform: translateX(calc(var(--ui-space-content-gap) * -1));
  }

  html[data-motion='none']
    .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-from
    .pavp-admin-shell__drawer-navigation,
  html[data-motion='none']
    .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-to
    .pavp-admin-shell__drawer-navigation {
    transform: none;
  }

  @media (forced-colors: active) {
    .pavp-admin-navigation-selection-lens {
      visibility: hidden;
    }
  }
}

@layer vendor-overrides {
  [data-pavp-admin-navigation='persistent'] .n-menu-item:focus-visible,
  .pavp-admin-navigation-dropdown [data-pavp-navigation-key]:focus-visible {
    border-radius: var(--ui-radius-control);
    box-shadow: var(--ui-admin-shadow-focus-ring);
    outline: none;
  }

  [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,
  .pavp-admin-navigation-dropdown .n-dropdown-option-body::before {
    opacity: 0;
    transform: none;
    transition-timing-function: var(--ui-motion-easing);
  }

  [data-pavp-admin-navigation='persistent'] .n-menu-item-content--hover::before,
  [data-pavp-admin-navigation='persistent'] .n-menu-item-content:hover::before,
  .pavp-admin-navigation-dropdown .n-dropdown-option-body--pending::before {
    opacity: 1;
    transform: none;
  }

  [data-pavp-admin-navigation='persistent'] .n-menu-item-content--selected::before,
  .pavp-admin-shell[data-navigation-collapsed='true']
    [data-pavp-admin-navigation='persistent']
    .n-menu-item-content--child-active::before,
  .pavp-admin-navigation-dropdown .n-dropdown-option-body--active::before,
  .pavp-admin-navigation-dropdown
    .n-dropdown-option[aria-current='page']
    .n-dropdown-option-body::before {
    opacity: 1;
    transform: none;
  }

  html[data-motion='reduced']
    [data-pavp-admin-navigation='persistent']
    .n-menu-item-content::before,
  html[data-motion='reduced']
    .pavp-admin-navigation-dropdown
    .n-dropdown-option
    .n-dropdown-option-body::before {
    transform: none;
    transition-timing-function: var(--ui-motion-easing);
  }

  html[data-motion='none'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,
  html[data-motion='none']
    .pavp-admin-navigation-dropdown
    .n-dropdown-option
    .n-dropdown-option-body::before {
    animation: none;
    transform: none;
  }

  .pavp-admin-shell[data-navigation-collapsed='false']
    [data-pavp-admin-navigation='persistent']
    .n-menu
    > .n-submenu
    > .n-menu-item-content:where(.n-menu-item-content--hover, :hover)::before {
    visibility: visible;
  }

  .pavp-admin-shell[data-navigation-collapsed='false']
    [data-pavp-admin-navigation='persistent']
    .n-menu
    > .n-submenu
    > .n-menu-item-content:where(:not(.n-menu-item-content--hover):not(:hover))::before {
    visibility: hidden;
  }

  .pavp-admin-shell[data-navigation-collapsed='false']
    [data-pavp-admin-navigation='persistent']
    .n-menu-item-content--child-active:not(.n-menu-item-content--hover):not(:hover)::before {
    opacity: 1;
    transform: none;
  }

  .pavp-admin-shell[data-navigation-collapsed='false']
    [data-pavp-admin-navigation-motion-ready='true']
    .n-menu-item-content--selected::before,
  .pavp-admin-shell[data-navigation-collapsed='true']
    [data-pavp-admin-navigation-motion-ready='true']
    .n-menu-item-content.n-menu-item-content--child-active::before {
    opacity: 1;
    transform: none;
    visibility: hidden;
  }

  .pavp-admin-navigation-dropdown.n-dropdown-menu {
    box-sizing: border-box;
    border-color: var(--ui-color-border-default);
    border-style: solid;
    border-width: var(--ui-admin-border-width);
  }

  @media (forced-colors: active) {
    [data-pavp-admin-navigation='persistent'] .n-menu-item:focus-visible,
    .pavp-admin-navigation-dropdown [data-pavp-navigation-key]:focus-visible {
      outline: var(--ui-admin-focus-width) solid Highlight;
      outline-offset: calc(var(--ui-admin-focus-width) * -1);
    }

    .pavp-admin-shell[data-navigation-collapsed='false']
      [data-pavp-admin-navigation-motion-ready='true']
      .n-menu-item-content--selected::before,
    .pavp-admin-shell[data-navigation-collapsed='true']
      [data-pavp-admin-navigation-motion-ready='true']
      .n-menu-item-content.n-menu-item-content--child-active::before {
      visibility: visible;
    }

    [data-pavp-admin-navigation='persistent'] .n-menu {
      --pavp-navigation-selected-surface: var(--ui-color-action-primary);
      --pavp-navigation-selected-foreground: var(--ui-color-text-on-action);
    }

    .pavp-admin-navigation-dropdown.n-dropdown-menu:has(
        .n-dropdown-option[aria-current='page']
          > .n-dropdown-option-body:not(.n-dropdown-option-body--disabled)
      ) {
      --pavp-navigation-selected-surface: var(--ui-color-action-primary);
      --pavp-navigation-selected-foreground: var(--ui-color-text-on-action);
    }

    [data-pavp-admin-navigation='persistent'] .n-menu.n-menu--collapsed {
      --pavp-navigation-child-active-foreground: var(--ui-color-text-on-action);
    }
  }

  @media (prefers-reduced-transparency: reduce) {
    [data-pavp-admin-navigation='persistent'] .n-layout-sider,
    .pavp-admin-navigation-dropdown {
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
    }
  }
}
[data-pavp-admin-navigation='persistent'] .n-menu {
  padding-block-end: 0;
}

[data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,
.pavp-admin-navigation-dropdown .n-dropdown-option-body::before {
  transition-duration: var(--ui-motion-duration);
  transition-property: background-color, opacity;
}

[data-pavp-admin-navigation='persistent'] .n-menu-item-content::before {
  inset-inline: calc(var(--ui-space-content-gap) / 2);
}

[data-pavp-admin-navigation='persistent']
  .n-menu-item-content:not(.n-menu-item-content--selected):not(
    .n-menu-item-content--child-active
  ):active
  :where(.n-menu-item-content__icon, .n-menu-item-content__arrow, .n-menu-item-content-header) {
  color: var(--ui-color-control-primary);
}

.pavp-admin-shell[data-navigation-collapsed='true']
  [data-pavp-admin-navigation='persistent']
  .n-menu-item-content--child-active::before,
.pavp-admin-shell[data-navigation-collapsed='true']
  [data-pavp-admin-navigation='persistent']
  .n-menu-item-content--child-active.n-menu-item-content--hover::before,
.pavp-admin-shell[data-navigation-collapsed='true']
  [data-pavp-admin-navigation='persistent']
  .n-menu-item-content--child-active:hover::before {
  background: var(--n-item-color-active-collapsed);
}

.pavp-admin-navigation-dropdown .n-dropdown-option-body--active::before,
.pavp-admin-navigation-dropdown
  .n-dropdown-option[aria-current='page']
  .n-dropdown-option-body::before {
  background: var(--n-option-color-active);
}

html[data-motion='reduced'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,
html[data-motion='reduced']
  .pavp-admin-navigation-dropdown
  .n-dropdown-option
  .n-dropdown-option-body::before {
  transition-duration: var(--ui-motion-duration);
  transition-property: background-color, opacity;
}

html[data-motion='none'] [data-pavp-admin-navigation='persistent'] .n-menu-item-content::before,
html[data-motion='none']
  .pavp-admin-navigation-dropdown
  .n-dropdown-option
  .n-dropdown-option-body::before {
  transition: none;
}

.pavp-admin-shell[data-navigation-collapsed='false']
  [data-pavp-admin-navigation-motion-ready='true']
  .n-menu-item-content--selected::before,
.pavp-admin-shell[data-navigation-collapsed='true']
  [data-pavp-admin-navigation-motion-ready='true']
  .n-menu-item-content.n-menu-item-content--child-active::before {
  transition: none;
}

.pavp-admin-navigation-dropdown
  .n-dropdown-option-body:not(
    .n-dropdown-option-body--active:not(.n-dropdown-option-body--disabled)
  ):active
  :where(.n-dropdown-option-body__prefix, .n-dropdown-option-body__label) {
  color: var(--ui-color-control-primary);
}

html[data-material='reduced'] .pavp-admin-navigation-dropdown {
  box-shadow: none;
}
html[data-motion='reduced']
  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active
  .pavp-admin-shell__drawer-navigation,
html[data-motion='reduced']
  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-active
  .pavp-admin-shell__drawer-navigation,
html[data-motion='reduced'] .pavp-admin-shell__sidebar,
html[data-motion='reduced'] .pavp-admin-shell__collapsed-trigger,
html[data-motion='reduced'] .pavp-admin-shell__collapsed-trigger::before,
html[data-motion='reduced'] .pavp-admin-shell__action,
html[data-motion='reduced'] .pavp-admin-shell__navigation-action,
html[data-motion='reduced'] .pavp-admin-shell__navigation-action::after {
  transition-duration: calc(var(--ui-motion-duration) / 2);
}

html[data-motion='none']
  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-enter-active
  .pavp-admin-shell__drawer-navigation,
html[data-motion='none']
  .pavp-admin-shell__drawer-layer.pavp-admin-drawer-leave-active
  .pavp-admin-shell__drawer-navigation,
html[data-motion='none'] .pavp-admin-shell__sidebar,
html[data-motion='none'] .pavp-admin-shell__collapsed-trigger,
html[data-motion='none'] .pavp-admin-shell__collapsed-trigger::before,
html[data-motion='none'] .pavp-admin-shell__action,
html[data-motion='none'] .pavp-admin-shell__navigation-action,
html[data-motion='none'] .pavp-admin-shell__navigation-action::after {
  transition: none;
}

html[data-motion='reduced'] .pavp-admin-shell__action:active,
html[data-motion='reduced'] .pavp-admin-shell__navigation-action:active {
  transform: none;
}

html[data-motion='none'] .pavp-admin-shell__action:active,
html[data-motion='none'] .pavp-admin-shell__navigation-action:active {
  transform: none;
}
</style>
