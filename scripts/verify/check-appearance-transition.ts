import assert from 'node:assert/strict'
import {
  ProductPreferenceDefault,
  projectSettingsColorMotion,
  projectUiAppearance,
  resolveThemeReference,
  validateCustomThemeDefinition,
  type EffectiveColorMode,
  type UiAppearanceSnapshot,
} from '@platform/design-system'
import {
  connectSettingsRift,
  playAppearanceTransition,
  reconcileSettingsAppearance,
} from '../../apps/web/src/app/appearance/appearance-transition'

function snapshot(
  themeId: 'royal-iris' | 'cobalt-tide' | 'emerald-grove',
  colorMode: EffectiveColorMode,
) {
  const theme = { registryKind: 'built-in', themeId } as const
  const resolved = resolveThemeReference({ reference: theme, customThemeRegistry: null })
  assert.equal(resolved.status, 'resolved')
  return projectUiAppearance(
    { ...ProductPreferenceDefault, theme, colorMode, density: 'comfortable', material: 'solid' },
    resolved.entry,
  )
}
function customSnapshot(source: Readonly<UiAppearanceSnapshot>) {
  const custom = validateCustomThemeDefinition({ ...source.themeEntry.definition, id: 'ocean' })
  assert.equal(custom.status, 'validated')
  return projectUiAppearance(
    { ...source, theme: { registryKind: 'custom', themeId: custom.entry.themeId } },
    custom.entry,
  )
}
const iris = snapshot('royal-iris', 'light')
const cobalt = snapshot('cobalt-tide', 'light')
const emerald = snapshot('emerald-grove', 'light')
const dark = snapshot('emerald-grove', 'dark')
const initial = projectSettingsColorMotion(iris, cobalt)
assert.ok(initial.surfaces.includes('content'))
assert.ok(!initial.surfaces.includes('header') && !initial.surfaces.includes('canvas'))
const retargeted = projectSettingsColorMotion(cobalt, emerald, initial)
assert.ok(retargeted.surfaces.includes('content'))
assert.ok(!projectSettingsColorMotion(emerald, dark, retargeted).surfaces.includes('content'))

// The parent document owns input. Only passive documents can contain transitional page copies.
class PaintAnimation {
  playbackRate = 1
  readonly frames: readonly string[]
  readonly finished: Promise<void>
  finish: () => void = () => undefined
  cancel: () => void = () => undefined
  constructor(frames: readonly string[]) {
    this.frames = frames
    this.finished = new Promise<void>((resolve, reject) => {
      this.finish = resolve
      this.cancel = () => {
        reject(new Error('cancelled'))
      }
    })
  }
  reverse(): void {
    this.playbackRate *= -1
  }
  updatePlaybackRate(rate: number): void {
    this.playbackRate = rate
  }
}

class PaintNode extends EventTarget {
  children: PaintNode[] = []
  readonly tag: string
  parent: PaintNode | undefined
  readonly attributes = new Map<string, string>()
  readonly classList = new Set<string>()
  readonly contentDocument: PaintDocument | undefined
  animation: PaintAnimation | undefined
  textContent = ''
  inert = false
  open = false
  isConnected = true
  constructor(tag: string) {
    super()
    this.tag = tag
    this.contentDocument = tag === 'iframe' ? new PaintDocument() : undefined
  }
  get firstElementChild() {
    return this.children[0]
  }
  hasChildNodes() {
    return this.children.length > 0
  }
  append(...nodes: PaintNode[]) {
    for (const node of nodes) {
      node.parent = this
      this.children.push(node)
    }
  }
  after(node: PaintNode) {
    if (!this.parent) return
    node.parent = this.parent
    this.parent.children.splice(this.parent.children.indexOf(this) + 1, 0, node)
  }
  cloneNode(deep: boolean): PaintNode {
    const copy = new PaintNode(this.tag)
    copy.textContent = this.textContent
    for (const [key, value] of this.attributes) copy.attributes.set(key, value)
    if (deep) copy.append(...this.children.map((child) => child.cloneNode(true)))
    return copy
  }
  setAttribute(key: string, value: string) {
    this.attributes.set(key, value)
  }
  removeAttribute(key: string) {
    this.attributes.delete(key)
  }
  querySelectorAll(): PaintNode[] {
    return []
  }
  closest() {
    return this.parent
  }
  replaceChildren() {
    this.children = []
  }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((node) => node !== this)
  }
  showPopover() {
    this.open = true
  }
  hidePopover() {
    this.open = false
  }
  animate(frames: { clipPath: string[] }): PaintAnimation {
    if (paintUnavailable) throw new Error('Animation unavailable')
    this.animation = new PaintAnimation(frames.clipPath)
    return this.animation
  }
}

class PaintDocument extends EventTarget {
  documentElement = new PaintNode('html')
  readonly head = new PaintNode('head')
  readonly body = new PaintNode('body')
  readonly styleSheets = []
  importNode(node: PaintNode, deep: boolean) {
    return node.cloneNode(deep)
  }
  createElement(tag: string) {
    return new PaintNode(tag)
  }
  replaceChild(root: PaintNode) {
    this.documentElement = root
  }
}
let paintUnavailable = false
let captures = 0
let routeTransition = false
let forcedColors = false
const app = new PaintNode('app')
const live = new PaintNode('main')
const surface = new PaintNode('div')
app.append(surface, live)
const doc = Object.assign(new PaintDocument(), {
  visibilityState: 'visible',
  activeViewTransition: null,
  getElementById: (id: string) => (id === 'pavp-appearance-surface' ? surface : null),
  querySelector: () => (routeTransition ? app : null),
  startViewTransition: () => {
    captures += 1
  },
})
const testWindow = Object.assign(new EventTarget(), {
  innerWidth: 1280,
  innerHeight: 720,
  scrollX: 0,
  scrollY: 0,
})
const originals = new Map<string, PropertyDescriptor | undefined>()
const globals: Record<string, unknown> = {
  document: doc,
  window: testWindow,
  getComputedStyle: () => ({
    visibility: forcedColors ? 'hidden' : 'visible',
    getPropertyValue: () => '200ms',
  }),
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => undefined,
}
for (const [name, value] of Object.entries(globals)) {
  originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
  Object.defineProperty(globalThis, name, { configurable: true, value })
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve))
const phases: {
  phase: string
  duration: number | undefined
  text: string | null
  finish: () => void
}[] = []
type SettingsRiftHandle = ReturnType<Parameters<typeof connectSettingsRift>[0]>
const disconnect = connectSettingsRift((scene, _appearance, options) => {
  assert.equal(options.preset, 'theme-rift')
  const base = { preset: options.preset, phase: options.phase } as const
  let finish = () => {
    /* assigned by the promise executor */
  }
  let cancel = finish
  const finished = new Promise<Awaited<SettingsRiftHandle['finished']>>((resolve) => {
    finish = () => {
      resolve({ ...base, kind: 'completed', presentation: 'full' })
    }
    cancel = () => {
      resolve({ ...base, kind: 'cancelled', reason: 'requested' })
    }
  })
  phases.push({
    phase: options.phase,
    duration: options.durationMs,
    text: scene.firstElementChild?.textContent ?? null,
    finish,
  })
  return { finished, cancel }
})
let current: Readonly<UiAppearanceSnapshot> = iris
let commits = 0
live.textContent = 'original page'
function select(
  next: Readonly<UiAppearanceSnapshot>,
  kind: 'settings' | 'mode' | 'palette',
  label = 'new page',
) {
  playAppearanceTransition({
    kind,
    origin: { x: 120, y: 80 },
    readSnapshot: () => current,
    isCurrent: () => current === next,
    commit: () => {
      current = next
      live.textContent = label
      commits++
      return true
    },
  })
}
function sceneBody(frame: PaintNode | undefined) {
  return frame?.contentDocument?.documentElement.children[1]
}
function pageIn(frame: PaintNode | undefined) {
  return sceneBody(frame)?.firstElementChild?.firstElementChild?.textContent
}
function finishPalette() {
  const incoming = surface.children[1]
  incoming?.animation?.finish()
  sceneBody(incoming)?.children[1]?.animation?.finish()
}
const root = doc.documentElement
try {
  select(dark, 'mode', 'dark page')
  assert.equal(current, dark, 'The preference accepts input synchronously')
  await flush()
  const [old, incoming] = surface.children
  assert.equal(pageIn(old), 'original page')
  assert.equal(pageIn(incoming), 'dark page')
  assert.ok(incoming?.inert && old?.inert)
  assert.equal(incoming.attributes.get('aria-hidden'), 'true')
  const wave = incoming.animation
  assert.ok(wave?.frames[0] === 'circle(0px at 120px 80px)')
  assert.notEqual(wave.frames[0], wave.frames[1])
  doc.dispatchEvent(new Event('pointermove'))
  assert.equal(incoming.animation, wave)
  select(iris, 'mode', 'light page')
  assert.equal(wave.playbackRate, -1, 'A reversal retraces the partly shown circle')
  await flush()
  assert.equal(pageIn(old), 'light page')
  select(cobalt, 'palette', 'cobalt page')
  assert.equal(current, cobalt)
  assert.equal(surface.children.length, 2, 'Switching effects preserves the partly revealed page')
  assert.equal(phases.length, 0)
  wave.finish()
  await flush()
  const [paletteBase, palettePage] = surface.children
  assert.equal(
    pageIn(paletteBase),
    'light page',
    'The original page stays visible outside the slit',
  )
  assert.equal(pageIn(palettePage), 'cobalt page')
  assert.equal(phases.length, 0, 'Palette changes never close the old page')
  const slit = palettePage?.animation
  assert.ok(slit)
  assert.equal(slit.frames[0], 'polygon(' + Array<string>(6).fill('120px 80px').join(', ') + ')')
  assert.equal(slit.frames.length, 3)
  assert.ok(
    sceneBody(palettePage)?.children[1]?.animation?.frames.every((frame) =>
      frame.startsWith('polygon(evenodd,'),
    ),
    'The slit edge keeps the palette of the incoming page even when another choice commits',
  )
  select(emerald, 'palette', 'emerald page')
  select(emerald, 'palette')
  assert.equal(commits, 4)
  assert.equal(pageIn(palettePage), 'cobalt page', 'A new choice preserves the visible composition')
  assert.equal(root.attributes.get('data-pavp-settings-appearance'), 'reveal')
  finishPalette()
  await flush()
  assert.equal(pageIn(surface.children[0]), 'cobalt page')
  assert.equal(pageIn(surface.children[1]), 'emerald page')
  const compact = { ...emerald, density: 'compact' } as const
  select(compact, 'settings', 'compact layout')
  finishPalette()
  await flush()
  assert.equal(phases.at(-1)?.phase, 'exit')
  assert.equal(phases.at(-1)?.text, 'emerald page')
  assert.equal(phases.at(-1)?.duration, 220)
  phases.at(-1)?.finish()
  await flush()
  assert.equal(phases.at(-1)?.text, 'compact layout')
  assert.equal(phases.at(-1)?.duration, 400)
  const spacious = { ...emerald, density: 'spacious' } as const
  select(spacious, 'settings', 'spacious layout')
  phases.at(-1)?.finish()
  await flush()
  assert.equal(phases.at(-1)?.phase, 'exit')
  select(compact, 'settings', 'latest layout')
  phases.at(-1)?.finish()
  await flush()
  assert.equal(
    phases.at(-1)?.text,
    'latest layout',
    'Repeated settings changes coalesce at the seam',
  )
  phases.at(-1)?.finish()
  await flush()
  assert.equal(surface.children.length, 0)
  assert.ok(!surface.open && !root.attributes.has('data-pavp-settings-appearance'))

  select(dark, 'mode', 'dark emerald')
  await flush()
  const firstWave = surface.children[1]?.animation
  assert.ok(firstWave)
  select(snapshot('royal-iris', 'dark'), 'palette', 'dark iris')
  await flush()
  select(iris, 'mode', 'light iris')
  firstWave.finish()
  await flush()
  assert.equal(pageIn(surface.children[0]), 'dark emerald')
  assert.equal(
    pageIn(surface.children[1]),
    'dark iris',
    'A later mode choice preserves the pending palette',
  )
  assert.ok(surface.children[1]?.animation?.frames[0]?.startsWith('polygon('))
  finishPalette()
  await flush()
  assert.equal(pageIn(surface.children[0]), 'dark iris')
  assert.equal(pageIn(surface.children[1]), 'light iris')
  surface.children[1]?.animation?.finish()
  await flush()
  assert.equal(surface.children.length, 0)

  select(cobalt, 'palette', 'first cobalt')
  await flush()
  select(emerald, 'palette')
  await flush()
  select(snapshot('cobalt-tide', 'light'), 'palette', 'returned to cobalt')
  await flush()
  finishPalette()
  await flush()
  assert.equal(surface.open, false, 'Returning to the opening palette needs only one fissure')
  assert.equal(surface.children.length, 0)
  assert.equal(live.textContent, 'returned to cobalt')

  select(emerald, 'palette')
  await flush()
  select(iris, 'palette')
  await flush()
  select(snapshot('emerald-grove', 'light'), 'palette', 'latest emerald selection')
  await flush()
  select(dark, 'mode', 'dark emerald selection')
  finishPalette()
  await flush()
  assert.equal(pageIn(surface.children[0]), 'latest emerald selection')
  assert.equal(pageIn(surface.children[1]), 'dark emerald selection')
  assert.ok(surface.children[1]?.animation?.frames[0]?.startsWith('circle('))
  surface.children[1]?.animation?.finish()
  await flush()
  assert.equal(surface.children.length, 0)

  select(customSnapshot(cobalt), 'palette')
  await flush()
  select(iris, 'palette')
  await flush()
  const reloaded = customSnapshot(cobalt)
  const planes = reloaded.themeEntry.definition.planes.light
  planes.standard = Object.fromEntries(Object.entries(planes.standard).reverse())
  select(reloaded, 'palette')
  finishPalette()
  await flush()
  assert.equal(surface.open, false, 'Reloading the same custom definition needs no second fissure')
  select(customSnapshot(emerald), 'palette', 'updated ocean palette')
  await flush()
  assert.equal(
    pageIn(surface.children[1]),
    'updated ocean palette',
    'An edited theme can reuse its ID',
  )
  finishPalette()
  await flush()

  select(cobalt, 'settings')
  reconcileSettingsAppearance(cobalt)
  assert.ok(surface.open)
  reconcileSettingsAppearance(dark)
  assert.equal(surface.children.length, 0)
  assert.equal(current, cobalt, 'Cancelling presentation never replays an old preference')
  playAppearanceTransition({ kind: 'settings', readSnapshot: () => current, commit: () => false })
  assert.equal(surface.children.length, 0)
  select({ ...cobalt, motion: 'reduced' }, 'settings')
  select({ ...emerald, motion: 'reduced' }, 'palette')
  assert.equal(surface.children.length, 0)
  assert.ok(root.attributes.get('data-pavp-settings-appearance')?.includes('palette'))
  select({ ...iris, motion: 'none' }, 'palette')
  assert.ok(!root.attributes.has('data-pavp-settings-appearance'))
  routeTransition = true
  select(cobalt, 'settings')
  assert.equal(surface.children.length, 0)
  routeTransition = false
  forcedColors = true
  select(iris, 'settings')
  assert.equal(surface.children.length, 0)
  forcedColors = false
  paintUnavailable = true
  select(dark, 'mode')
  await flush()
  assert.equal(current, dark)
  assert.equal(surface.children.length, 0)
  paintUnavailable = false
  playAppearanceTransition({
    kind: 'mode',
    readSnapshot: () => dark,
    isCurrent: () => false,
    commit: () => true,
  })
  await flush()
  assert.ok(surface.open, 'Equivalent effective modes still show a changed preference')
  assert.equal(captures, 0, 'The interactive document must remain available for pointer input')
  console.log(
    'Appearance scenes preserve old and new content, real rift phases, live input and cleanup.',
  )
} finally {
  disconnect()
  for (const [name, original] of originals) {
    if (original) Object.defineProperty(globalThis, name, original)
    else Reflect.deleteProperty(globalThis, name)
  }
}
