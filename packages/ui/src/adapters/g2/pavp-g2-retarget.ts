import type { G2Context } from '@antv/g2'

type G2Animation = NonNullable<G2Context['animations']>[number]
type G2Target = NonNullable<G2Context['canvas']>['document']['documentElement']

const keyframeMetadata = new Set(['offset', 'computedOffset', 'easing', 'composite'])

function targetOf(animation: G2Animation): G2Target | null {
  // G's concrete KeyframeEffect exposes this public Web Animations property,
  // although its IKeyframeEffect interface currently omits it.
  const effect = animation.effect
  return 'target' in effect ? (effect.target as G2Target | null) : null
}

function snapshotValue(value: unknown): unknown {
  // Path/point arrays must not share mutable interpolation buffers.
  return Array.isArray(value) ? value.map((entry: unknown) => snapshotValue(entry)) : value
}

/** Settle native render promises before replacement without jumping to old geometry. */
export function settleG2Animations(context: G2Context, preserveCurrentFrame: boolean): void {
  // Native component transitions can contribute null despite G2Context's narrower type.
  const candidates: readonly (G2Animation | null | undefined)[] = context.animations ?? []
  const animations = candidates.filter(
    (animation): animation is G2Animation =>
      animation !== null &&
      animation !== undefined &&
      (animation.playState === 'running' || animation.playState === 'paused'),
  )
  if (!preserveCurrentFrame) {
    // Timeline draining and reduced motion keep native endpoint callbacks and cleanup.
    for (const animation of animations) animation.finish()
    return
  }

  const snapshots = new Map<G2Target, Map<string, unknown>>()
  const currentTimes = new Map<G2Animation, number>()
  // Read every target before finishing any animation: multiple animations can share
  // a target, and finishing one may also reapply the other animations on that target.
  for (const animation of animations) {
    currentTimes.set(animation, animation.currentTime ?? 0)
    const target = targetOf(animation)
    if (!target || target.destroyed) continue
    let values = snapshots.get(target)
    if (!values) {
      values = new Map()
      snapshots.set(target, values)
    }
    // Angular and native wave transitions derive a path in onframe rather than in
    // their keyframes. Preserve that displayed geometry before ending callbacks.
    if (target.nodeName === 'path' && !values.has('d'))
      values.set('d', snapshotValue(target.getAttribute('d') as unknown))
    for (const keyframe of animation.effect.getKeyframes()) {
      for (const property of Object.keys(keyframe)) {
        if (!keyframeMetadata.has(property) && !values.has(property))
          values.set(property, snapshotValue(target.getAttribute(property) as unknown))
      }
    }
  }

  for (const animation of animations) {
    // Old morph/wave completion callbacks can write obsolete endpoints after the
    // replacement. Promise-based native exit removal still completes normally.
    animation.onfinish = null
    animation.onframe = null
    animation.finish()
    animation.cancel()
    // G can reapply the canceled effect once on its queued frame. Keep that public
    // effect's interpolation at the sampled time rather than the obsolete endpoint.
    animation.effect.update(currentTimes.get(animation) ?? 0)
  }
  for (const [target, values] of snapshots) {
    if (target.destroyed) continue
    for (const [property, value] of values) {
      if (value === undefined) target.removeAttribute(property)
      else target.setAttribute(property, value)
    }
  }
}
