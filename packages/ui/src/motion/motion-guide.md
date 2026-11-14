# Cinematic motion

`useUiMotion()` is opt-in inside a component under `UiProvider`. It follows the nearest color
scope and the effective full/reduced/none preference. It does not navigate, update data, change
focus, scroll, or remove elements.

```ts
const motion = useUiMotion()
const handle = motion.play(element, {
  preset: 'theme-rift',
  phase: 'enter',
  durationMs: 600,
  origin: { clientX: event.clientX, clientY: event.clientY },
})
const result = await handle.finished
```

Omit `origin` for keyboard/programmatic actions. Supply actual viewport pointer coordinates for
spatial pointer-triggered effects. Coordinates are normalized and clamped to the target bounds.

Only implemented recipes appear in `uiMotionPresets`. Preset, phase and target types derive from
that registry. Unknown runtime IDs, invalid durations and invalid coordinates throw before taking
visual ownership. The browser needs Web Animations; an unsupported mask falls back to a fade,
unless `fallback: 'none'` is supplied. Reduced motion is always a short fade, never fragmentation
or spatial motion; disabled motion immediately returns `skipped` without changing the target.

## Exit ownership

An `enter` restores the original presentation on completion. An `exit` intentionally holds its
final presentation after `finished` resolves. Remove the element, call `handle.cancel()`, or start
an `enter` on the same element to release that lease. For example, a route owner can await exit,
commit its own navigation and scroll restoration, then enter the stable content boundary. It must
release the exit handle in `finally` when navigation does not complete. Cancelling visuals never
cancels or implicitly performs application updates.

Same-target calls replace previous work, including work started by another composable instance.
Finished promises settle once and report completed/cancelled/skipped/failed explicitly. Calling
cancel after a completed exit releases its held effect but does not rewrite the completed result.
KeepAlive deactivation, scope disposal, hidden documents, appearance changes, target detachment,
changes to the target’s viewport position or size release owned effects and decoration. Internal scrolling
that leaves its bounds unchanged does not interrupt a held exit. A detached target is not retained by
a pending exit. Application inline styles are not saved/overwritten: native animation effects are
removed, revealing whatever styles the application currently owns.

The decorative colored edge is theme-derived and pointer-inert. This recipe reveals live DOM;
it does not capture screenshots or claim pixel-level DOM refraction. The public catalog also includes `particle-scatter` for DOM elements and `liquid-refraction` for
loaded `HTMLImageElement` targets. Particles are theme-colored decorative reveal, not a snapshot
of DOM pixels. Refraction samples the explicit image texture only. Arbitrary elements cannot be
passed to that recipe in TypeScript. Unsupported image geometry, unavailable WebGL or context
loss use a fade when allowed; `fallback: 'none'` reports failure instead. GPU renderer code loads
only when a full-motion GPU recipe starts; reduced/disabled motion never requests it.
