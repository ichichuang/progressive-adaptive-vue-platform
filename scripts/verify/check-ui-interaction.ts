import assert from 'node:assert/strict'
import { scrollRefreshSchema } from '../../apps/web/src/app/scroll/scroll-refresh-contract'
import {
  createInteractionSession,
  type UiInteractionDirection,
  type UiInteractionGesture,
} from '../../packages/ui/src/composables/interaction-session'

const sample = (x: number, y = 0, pointerId = 1) => ({
  clientX: x,
  clientY: y,
  pointerId,
  pointerType: 'touch',
  button: 0,
  isPrimary: true,
})
let taps = 0
let holds = 0
const swipes: UiInteractionDirection[] = []
const session = createInteractionSession(
  {
    longPressDelay: 10,
    onTap: () => {
      taps += 1
    },
    onLongPress: () => {
      holds += 1
    },
    onSwipe: (direction) => {
      swipes.push(direction)
    },
  },
  () => undefined,
)
session.start(sample(20))
session.end(sample(21))
assert.equal(taps, 1)
session.start(sample(20))
session.move(sample(70))
session.end(sample(20))
assert.equal(taps, 1, 'Returning to the origin after moving must not tap.')
session.start(sample(100))
session.end(sample(20, 0, 2))
assert.equal(session.activePointer(), 1, 'Another pointer cannot end the session.')
session.end(sample(20))
assert.deepEqual(swipes, ['left'])
session.start({ ...sample(0), button: 2 })
assert.equal(session.activePointer(), undefined)
session.start({ ...sample(0), isPrimary: false })
assert.equal(session.activePointer(), undefined)
session.start(sample(5))
await new Promise((resolve) => setTimeout(resolve, 20))
session.end(sample(5))
assert.equal(holds, 1)
assert.equal(taps, 1, 'Long press must not also tap.')
session.start(sample(5))
session.cancel()
await new Promise((resolve) => setTimeout(resolve, 20))
assert.equal(holds, 1, 'Cancellation clears delayed work.')
const drags: UiInteractionGesture[] = []
let ends = 0
let cancelled = 0
const drag = createInteractionSession(
  {
    onDrag: (value) => {
      drags.push(value)
    },
    onDragEnd: () => {
      ends += 1
    },
    onSwipe: () => {
      assert.fail('Drag must not also swipe.')
    },
    onCancel: () => {
      cancelled += 1
    },
  },
  () => undefined,
)
drag.start(sample(120, 30))
drag.move(sample(160, 35))
assert.ok(drags[0])
assert.deepEqual(drags[0].origin, { x: 120, y: 30 })
assert.deepEqual(drags[0].delta, { x: 40, y: 5 })
drag.end(sample(180, 35))
assert.equal(ends, 1)
drag.start(sample(1))
drag.move(sample(50))
drag.cancel()
assert.equal(cancelled, 1)
assert.equal(ends, 1)
const filtered = createInteractionSession(
  {
    directions: ['left'],
    onSwipe: (direction) => {
      swipes.push(direction)
    },
  },
  () => undefined,
)
filtered.start(sample(0))
filtered.end(sample(80))
assert.deepEqual(swipes, ['left'])
assert.throws(() => createInteractionSession({ swipeThreshold: 5 }, () => undefined))
assert.throws(() => createInteractionSession({ longPressDelay: -1 }, () => undefined))
console.log('UI interaction session checks passed.')

const legacyScroll = {
  schemaVersion: 1,
  routeName: 'control-center',
  ownerId: 'architecture-console-content',
  left: 0,
  top: 120,
  context: ['build', 390, 500],
}
const settings = {
  section: 'settings-comfort',
  positions: { 'settings-comfort': { left: 0, top: 120 }, 'settings-theme': { left: 0, top: 20 } },
}
assert.equal(scrollRefreshSchema.safeParse(legacyScroll).success, true)
assert.equal(scrollRefreshSchema.safeParse({ ...legacyScroll, settings }).success, true)
for (const invalid of [
  { ...legacyScroll, unexpected: true },
  { ...legacyScroll, top: -1 },
  { ...legacyScroll, top: 0, settings },
  { ...legacyScroll, settings: { ...settings, extra: true } },
  { ...legacyScroll, settings: { ...settings, section: 'other' } },
  {
    ...legacyScroll,
    settings: { ...settings, positions: { ...settings.positions, other: { left: 0, top: 0 } } },
  },
  ...[
    { left: Infinity, top: 1 },
    { left: 0, top: -1 },
    { left: 0, top: 5, extra: true },
  ].map((offset) => ({
    ...legacyScroll,
    settings: { ...settings, positions: { ...settings.positions, 'settings-theme': offset } },
  })),
])
  assert.equal(scrollRefreshSchema.safeParse(invalid).success, false)
console.log('Settings refresh snapshots preserve strict offsets and legacy records.')
