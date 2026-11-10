import type { UiScrollController } from './scroll-contracts'

// Private transport only. UiScrollArea retains geometry, offsets and execution.
export interface ScrollTargetReceipt {
  readonly settled: Promise<boolean>
  cancel(): void
}
type RevealTarget = (
  target: HTMLElement,
  label: HTMLElement | undefined,
  scroll: boolean,
) => ScrollTargetReceipt | undefined
interface ScrollTargetOwner {
  readonly viewport: HTMLElement
  readonly reveal: RevealTarget
  readonly controller: UiScrollController
}
const targets = new WeakMap<HTMLElement, ScrollTargetOwner>()
export function registerScrollTargetOwner(
  viewport: HTMLElement,
  reveal: RevealTarget,
  controller: UiScrollController,
): () => void {
  const owner = { viewport, reveal, controller }
  targets.set(viewport, owner)
  return () => {
    if (targets.get(viewport) === owner) targets.delete(viewport)
  }
}
export function revealOwnedScrollTarget(
  target: HTMLElement,
  label: HTMLElement | undefined,
  scroll: boolean,
): ScrollTargetReceipt | undefined {
  return findScrollTargetOwner(target)?.reveal(target, label, scroll)
}
export function findScrollTargetOwner(target: HTMLElement): ScrollTargetOwner | undefined {
  for (let parent = target.parentElement; parent !== null; parent = parent.parentElement) {
    const owner = targets.get(parent)
    if (owner !== undefined) return owner
  }
  return undefined
}
