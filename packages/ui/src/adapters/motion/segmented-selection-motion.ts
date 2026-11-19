import { spring } from 'motion-v'
import { projectMotionPolicy } from './motion-policy'

const selectionAttribute = 'data-pavp-segmented-selection'
const labelInkAttribute = 'data-pavp-segmented-label-ink'
const motionlessScope = '[data-motion="none"]'

interface SegmentSelectors {
  readonly group: string
  readonly option: string
  readonly checkedOption: string
  readonly label: string
}

interface SegmentBounds {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

interface SegmentTrack {
  readonly width: number
  readonly height: number
}

interface SegmentIndicator {
  readonly element: HTMLElement
  readonly labels: Set<Element>
  readonly selectors: SegmentSelectors
  place(bounds: SegmentBounds): void
  play(frames: readonly SegmentBounds[], destination: SegmentBounds, duration: number): Animation
  selected?: Element
  bounds?: SegmentBounds
  track?: SegmentTrack
  playback?: Animation
  labelPlayback?: () => void
}

function sameBounds(a: SegmentBounds | undefined, b: SegmentBounds): boolean {
  return a?.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}

function transform(x: number, y: number, scaleX = 1, scaleY = 1): string {
  return `translate(${String(x)}px, ${String(y)}px) scale(${String(scaleX)}, ${String(scaleY)})`
}

function visibleBounds(indicator: SegmentIndicator): SegmentBounds | undefined {
  const { bounds, element, playback } = indicator
  if (bounds === undefined || playback === undefined) return bounds
  const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform)
  return {
    x: matrix.e,
    y: matrix.f,
    width: bounds.width * matrix.a,
    height: bounds.height * matrix.d,
  }
}

function slideFrames(
  track: SegmentTrack,
  start: SegmentBounds,
  destination: SegmentBounds,
): { readonly frames: readonly SegmentBounds[]; readonly duration: number } {
  const { visualDuration, bounce } = projectMotionPolicy('full').navigationTransition.layout
  const curve = spring({
    keyframes: [0, 1],
    visualDuration,
    bounce,
    restDelta: 0.005,
    restSpeed: 0.08,
  })
  const frames: SegmentBounds[] = []
  const stepMs = 1000 / 60
  const distance = destination.x - start.x
  const stretch = Math.min(0.22, (Math.abs(distance) / destination.width) * 0.16)
  const direction = Math.sign(distance)
  const mix = (a: number, b: number, progress: number): number => a + (b - a) * progress
  let duration = 0
  // Sample once and let the browser composite transforms. The moving tip stretches
  // slightly while the trailing edge is carried forward by the damped spring.
  for (; duration < visualDuration * 1500; duration += stepMs) {
    const { value, done } = curve.next(duration)
    if (done) break
    const progress = Math.min(1, Math.max(0, value))
    const pull = Math.sin(Math.PI * progress) * stretch
    const width = Math.min(
      track.width,
      mix(start.width, destination.width, value) + destination.width * pull,
    )
    const height = Math.min(track.height, mix(start.height, destination.height, value))
    const x = Math.max(
      0,
      Math.min(
        track.width - width,
        mix(start.x, destination.x, value) -
          destination.width * pull * (direction < 0 ? 0.78 : 0.22),
      ),
    )
    const y = Math.max(0, Math.min(track.height - height, mix(start.y, destination.y, value)))
    frames.push({ x, y, width, height })
  }
  frames.push(destination)
  return { frames, duration }
}

/** Color the existing glyphs according to which part of the moving thumb covers them. */
function followSelectionInk(
  group: HTMLElement,
  options: NodeListOf<HTMLElement>,
  labelSelector: string,
  frames: readonly SegmentBounds[],
  duration: number,
): () => void {
  const track = group.getBoundingClientRect()
  const scaleX = track.width / group.offsetWidth
  const scaleY = track.height / group.offsetHeight
  const size = frames.map(({ width, height }) => `${String(width)}px ${String(height)}px`)
  const cleanups: (() => void)[] = []
  for (const option of options) {
    const label = option.querySelector<HTMLElement>(`:scope > ${labelSelector}`)
    if (label === null) continue
    const rect = label.getBoundingClientRect()
    const left = (rect.left - track.left) / scaleX - group.clientLeft
    const top = (rect.top - track.top) / scaleY - group.clientTop
    const position = frames.map(({ x, y }) => `${String(x - left)}px ${String(y - top)}px`)
    const animation = label.animate(
      { backgroundPosition: position, backgroundSize: size },
      { duration, fill: 'both' },
    )
    label.setAttribute(labelInkAttribute, '')
    cleanups.push(() => {
      animation.cancel()
      label.removeAttribute(labelInkAttribute)
    })
  }
  return () => {
    for (const cleanup of cleanups) cleanup()
  }
}

function createIndicator(group: HTMLElement, selectors: SegmentSelectors): SegmentIndicator {
  const element = group.ownerDocument.createElement('span')
  element.className = 'pavp-segmented-selection'
  element.setAttribute('aria-hidden', 'true')
  return {
    element,
    labels: new Set(),
    selectors,
    place(bounds) {
      element.style.width = `${String(bounds.width)}px`
      element.style.height = `${String(bounds.height)}px`
      element.style.transform = `translate(${String(bounds.x)}px, ${String(bounds.y)}px)`
    },
    play(frames, destination, duration) {
      const transforms = frames.map(({ x, y, width, height }) =>
        transform(x, y, width / destination.width, height / destination.height),
      )
      return element.animate({ transform: transforms }, { duration })
    },
  }
}

/** Animate an accepted choice without owning its state, focus or input events. */
export function attachSegmentedSelectionMotion(
  roots: readonly HTMLElement[],
  configurations: readonly SegmentSelectors[],
): () => void {
  const groupSelector = configurations.map(({ group }) => group).join(', ')
  const indicators = new Map<HTMLElement, SegmentIndicator>()
  const pending = new Set<HTMLElement>()
  let frame = 0

  function groupFor(element: Element): HTMLElement | null {
    return element.closest<HTMLElement>(groupSelector)
  }

  function queue(group: HTMLElement): void {
    pending.add(group)
    if (frame !== 0) return
    frame = requestAnimationFrame(() => {
      frame = 0
      for (const group of pending) synchronize(group)
      pending.clear()
    })
  }

  const resize = new ResizeObserver((entries) => {
    for (const { target } of entries) {
      const group = groupFor(target)
      if (group !== null && indicators.has(group)) queue(group)
    }
  })

  function track(group: HTMLElement): void {
    if (indicators.has(group) || group.closest(motionlessScope) !== null) return
    const selectors = configurations.find(({ group: selector }) => group.matches(selector))
    if (selectors === undefined) return
    indicators.set(group, createIndicator(group, selectors))
    resize.observe(group)
    queue(group)
  }

  function clearIndicator(group: HTMLElement, state: SegmentIndicator): void {
    state.playback?.cancel()
    state.labelPlayback?.()
    delete state.playback
    delete state.labelPlayback
    delete state.bounds
    delete state.track
    delete state.selected
    group.removeAttribute(selectionAttribute)
    state.element.remove()
  }

  function release(group: HTMLElement, state: SegmentIndicator): void {
    resize.unobserve(group)
    for (const label of state.labels) resize.unobserve(label)
    clearIndicator(group, state)
    indicators.delete(group)
  }

  function synchronize(group: HTMLElement): void {
    const state = indicators.get(group)
    if (state === undefined) return
    const { selectors } = state
    if (
      !group.matches(selectors.group) ||
      group.closest(motionlessScope) !== null ||
      !roots.some((root) => root.contains(group))
    ) {
      release(group, state)
      return
    }
    const labels = group.querySelectorAll<HTMLElement>(`:scope > ${selectors.option}`)
    const labelsNow = new Set<Element>(labels)
    for (const label of state.labels) {
      if (!labelsNow.has(label)) {
        state.labels.delete(label)
        resize.unobserve(label)
      }
    }
    for (const label of labels) {
      if (!state.labels.has(label)) {
        state.labels.add(label)
        resize.observe(label)
      }
    }

    const active = group.querySelectorAll<HTMLElement>(`:scope > ${selectors.checkedOption}`)
    const selected = active[0]
    if (active.length !== 1 || selected?.offsetParent !== group || selected.offsetWidth === 0) {
      clearIndicator(group, state)
      return
    }
    const next = {
      x: selected.offsetLeft,
      y: selected.offsetTop,
      width: selected.offsetWidth,
      height: selected.offsetHeight,
    }
    const track = { width: group.clientWidth, height: group.clientHeight }
    const { element } = state
    const mounted = element.parentElement === group
    const trackResized = state.track?.width !== track.width || state.track.height !== track.height
    if (
      mounted &&
      selected === state.selected &&
      sameBounds(state.bounds, next) &&
      (state.playback === undefined || !trackResized)
    )
      return
    const start =
      mounted && (selected !== state.selected || state.playback !== undefined)
        ? visibleBounds(state)
        : undefined
    state.playback?.cancel()
    state.labelPlayback?.()
    delete state.playback
    delete state.labelPlayback
    state.selected = selected
    state.bounds = next
    state.track = track
    state.place(next)
    if (!mounted) group.prepend(element)
    if (start === undefined || sameBounds(start, next)) {
      group.setAttribute(selectionAttribute, 'rest')
      return
    }
    group.setAttribute(selectionAttribute, 'moving')
    const { frames, duration } = slideFrames(track, start, next)
    const playback = state.play(frames, next, duration)
    state.labelPlayback = followSelectionInk(group, labels, selectors.label, frames, duration)
    state.playback = playback
    playback.onfinish = () => {
      if (state.playback !== playback) return
      state.labelPlayback?.()
      delete state.playback
      delete state.labelPlayback
      group.setAttribute(selectionAttribute, 'rest')
    }
  }

  function discover(node: Element): void {
    if (node instanceof HTMLElement && node.matches(groupSelector)) track(node)
    for (const group of node.querySelectorAll<HTMLElement>(groupSelector)) track(group)
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (!(record.target instanceof HTMLElement)) continue
      const target = record.target
      const group = indicators.has(target) ? target : groupFor(target)
      const state = group === null ? undefined : indicators.get(group)
      if (group !== null && state !== undefined) {
        if (
          target === group ||
          record.type === 'childList' ||
          target.matches(state.selectors.option)
        )
          queue(group)
      } else if (record.type === 'attributes' && target.matches(groupSelector)) {
        track(target)
      }
      if (record.type !== 'childList') continue
      for (const node of record.addedNodes) {
        if (node instanceof Element && !node.matches('.pavp-segmented-selection')) discover(node)
      }
      if (record.removedNodes.length > 0) {
        for (const group of indicators.keys()) {
          if (!roots.some((root) => root.contains(group))) queue(group)
        }
      }
    }
  })
  for (const root of roots) {
    discover(root)
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'aria-pressed', 'disabled'],
    })
  }
  return () => {
    observer.disconnect()
    resize.disconnect()
    cancelAnimationFrame(frame)
    for (const [group, state] of indicators) clearIndicator(group, state)
    indicators.clear()
    pending.clear()
  }
}
