import assert from 'node:assert/strict'
import {
  ProductPreferenceDefault,
  projectUiAppearance,
  resolveThemeReference,
} from '@platform/design-system'
import {
  createCinematicController,
  type CinematicPlatform,
} from '../../packages/ui/src/adapters/motion/cinematic-controller'
import type { ThemeRiftInput } from '../../packages/ui/src/adapters/motion/cinematic-theme-rift'
import type {
  UiMotionCancelReason,
  UiMotionController,
} from '../../packages/ui/src/motion/motion-contracts'
import { uiMotionPresets } from '../../packages/ui/src/motion/motion-registry'

const theme = resolveThemeReference({
  reference: ProductPreferenceDefault.theme,
  customThemeRegistry: null,
})
assert.equal(theme.status, 'resolved')
let appearance = projectUiAppearance(
  { ...ProductPreferenceDefault, colorMode: 'light', density: 'comfortable', material: 'solid' },
  theme.entry,
)
let active = true
const target = {
  isConnected: true,
  ownerDocument: { hidden: false },
  getBoundingClientRect: () => ({ width: 240, height: 120 }),
} as unknown as HTMLElement
const jobs: {
  finish(): void
  fail(error: unknown): void
  stopped: boolean
  input: ThemeRiftInput
}[] = []
const observers = new Set<(reason: UiMotionCancelReason) => void>()
let supported = true
let mask = true
const platform: CinematicPlatform = {
  supports: () => supported,
  supportsMask: () => mask,
  observe(_target, cancel) {
    observers.add(cancel)
    return () => {
      observers.delete(cancel)
    }
  },
  start(_target, input) {
    let finish!: () => void
    let fail!: (error: unknown) => void
    const finished = new Promise<void>((resolve, reject) => {
      finish = resolve
      fail = reject
    })
    const job = { finish, fail, stopped: false, input }
    jobs.push(job)
    return {
      finished,
      cancel() {
        job.stopped = true
      },
    }
  },
}
const runtime = createCinematicController(
  () => appearance,
  () => active,
  platform,
)
const options = { preset: 'theme-rift', phase: 'enter' } as const
const initial = runtime.controller.play(target, options)
assert.equal(jobs.at(-1)?.input.durationMs, 600)
jobs.at(-1)?.finish()
assert.equal((await initial.finished).kind, 'completed')
assert.equal(observers.size, 0)
assert.equal(jobs.at(-1)?.stopped, true)

const exit = runtime.controller.play(target, { ...options, phase: 'exit' })
jobs.at(-1)?.finish()
assert.equal((await exit.finished).kind, 'completed')
assert.equal(
  jobs.at(-1)?.stopped,
  false,
  'Exit retains its visual lease through the caller commit.',
)
assert.equal(observers.size, 1)
exit.cancel()
assert.equal(jobs.at(-1)?.stopped, true)
assert.equal(observers.size, 0)
assert.equal(
  (await exit.finished).kind,
  'completed',
  'A resolved result does not change after lease release.',
)

const first = runtime.controller.play(target, options)
const another = createCinematicController(
  () => appearance,
  () => active,
  platform,
)
const second = another.controller.play(target, options)
assert.deepEqual(await first.finished, { ...options, kind: 'cancelled', reason: 'superseded' })
runtime.dispose()
assert.equal(
  jobs.at(-1)?.stopped,
  false,
  'Disposing one owner must not cancel another owner on the same target.',
)
second.cancel()
assert.equal((await second.finished).kind, 'cancelled')

const enterAfterExit = another.controller.play(target, { ...options, phase: 'exit' })
jobs.at(-1)?.finish()
await enterAfterExit.finished
const held = jobs.at(-1)
const entering = another.controller.play(target, options)
assert.equal(held?.stopped, true)
entering.cancel()
for (const reason of ['hidden-document', 'target-detached', 'geometry-changed'] as const) {
  const handle = another.controller.play(target, options)
  for (const observer of [...observers]) observer(reason)
  assert.deepEqual(await handle.finished, { ...options, kind: 'cancelled', reason })
  assert.equal(observers.size, 0)
}
const interrupted = another.controller.play(target, options)
another.interrupt('preference-changed')
assert.equal((await interrupted.finished).kind, 'cancelled')
appearance = { ...appearance, motion: 'reduced' }
const reduced = another.controller.play(target, { ...options, durationMs: 1200 })
assert.equal(jobs.at(-1)?.input.durationMs, 120)
assert.equal(jobs.at(-1)?.input.reduced, true)
jobs.at(-1)?.finish()
assert.deepEqual(await reduced.finished, { ...options, kind: 'completed', presentation: 'reduced' })
appearance = { ...appearance, motion: 'none' }
assert.equal((await another.controller.play(target, options).finished).kind, 'skipped')
appearance = { ...appearance, motion: 'full' }
mask = false
const fallback = another.controller.play(target, options)
assert.equal(jobs.at(-1)?.input.fallback, true)
fallback.cancel()
assert.equal(
  (await another.controller.play(target, { ...options, fallback: 'none' }).finished).kind,
  'skipped',
)
supported = false
assert.equal((await another.controller.play(target, options).finished).kind, 'skipped')
supported = true
active = false
assert.equal((await another.controller.play(target, options).finished).kind, 'skipped')
active = true
mask = true
const failure = another.controller.play(target, options)
jobs.at(-1)?.fail(new Error('renderer failed'))
assert.equal((await failure.finished).kind, 'failed')
assert.equal(observers.size, 0)
assert.throws(() => another.controller.play(target, { ...options, durationMs: Number.NaN }))
assert.throws(() =>
  another.controller.play(target, { ...options, origin: { clientX: Infinity, clientY: 0 } }),
)
const disposed = another.controller.play(target, options)
another.dispose()
assert.deepEqual(await disposed.finished, { ...options, kind: 'cancelled', reason: 'disposed' })
assert.equal(observers.size, 0)
assert.equal((await another.controller.play(target, options).finished).kind, 'skipped')
assert.equal(Object.isFrozen(uiMotionPresets), true)

// Compile-time consumer contract: these invalid pairs must never become callable.
function verifyTypes(
  controller: UiMotionController,
  element: HTMLElement,
  image: HTMLImageElement,
): void {
  controller.play(element, { preset: 'theme-rift', phase: 'enter', durationMs: 600 })
  controller.play(image, { preset: 'liquid-refraction', phase: 'enter' })
  controller.play(element, { preset: 'particle-scatter', phase: 'exit' })
  // @ts-expect-error Real texture refraction accepts images, not arbitrary DOM.
  controller.play(element, { preset: 'liquid-refraction', phase: 'enter' })
  // @ts-expect-error Unknown public recipe.
  controller.play(element, { preset: 'invented-effect', phase: 'enter' })
  // @ts-expect-error No unimplemented transition/update contract.
  controller.play(element, { preset: 'theme-rift', phase: 'transition' })
  // @ts-expect-error A media/source descriptor is not a DOM target.
  controller.play({ source: element }, { preset: 'theme-rift', phase: 'enter' })
}
void verifyTypes
console.log(
  'Cinematic motion: typed catalog, same-target ownership, retained exits, reduced/fallback, interruptions and cleanup passed.',
)

// DOM recipes share a reversible lease, retain semantic content, and never write layout styles.
const { playMaskRecipe } =
  await import('../../packages/ui/src/adapters/motion/cinematic-mask-recipes')
const { playSpatialRecipe } =
  await import('../../packages/ui/src/adapters/motion/cinematic-spatial-recipes')
const { playTextRecipe } =
  await import('../../packages/ui/src/adapters/motion/cinematic-text-recipes')
const recordedFrames: Keyframe[][] = []
const recordedTimings: KeyframeAnimationOptions[] = []
let releasedAnimations = 0
const recipeTarget = {
  childElementCount: 1,
  getBoundingClientRect: () => ({ left: 20, top: 30, width: 320, height: 180 }),
  animate(frames: Keyframe[], timing: KeyframeAnimationOptions) {
    recordedFrames.push(frames)
    recordedTimings.push(timing)
    return {
      finished: Promise.resolve(),
      cancel() {
        releasedAnimations++
      },
    }
  },
} as unknown as HTMLElement
const recipes = {
  curtain: playMaskRecipe,
  iris: playMaskRecipe,
  'paper-tear': playMaskRecipe,
  'ink-reveal': playMaskRecipe,
  'pixel-dissolve': playMaskRecipe,
  'page-peel': playSpatialRecipe,
  'camera-push': playSpatialRecipe,
  'card-expand': playSpatialRecipe,
  'text-reveal': playTextRecipe,
  'text-dust': playTextRecipe,
} as const
for (const preset of Object.keys(recipes) as (keyof typeof recipes)[]) {
  const play = (phase: 'enter' | 'exit') => {
    const input: ThemeRiftInput = {
      options: { preset, phase, origin: { clientX: 100, clientY: 80 } },
      appearance,
      durationMs: 900,
      reduced: false,
      fallback: false,
    }
    if (preset === 'page-peel' || preset === 'camera-push' || preset === 'card-expand')
      return playSpatialRecipe(recipeTarget, input, preset)
    if (preset === 'text-reveal' || preset === 'text-dust')
      return playTextRecipe(recipeTarget, input, preset)
    return playMaskRecipe(recipeTarget, input, preset)
  }
  const entering = play('enter')
  await entering.finished
  assert.equal(recordedTimings.at(-1)?.easing, 'cubic-bezier(0.22, 1, 0.36, 1)', preset)
  const forward = recordedFrames.at(-1)
  assert.ok(forward && forward.length >= 2, preset)
  assert.ok(!JSON.stringify(forward).includes('NaN'), preset)
  entering.cancel()
  const exiting = play('exit')
  await exiting.finished
  assert.equal(recordedTimings.at(-1)?.easing, 'cubic-bezier(0.64, 0, 0.78, 0)', preset)
  const reverse = recordedFrames.at(-1)
  const stripOffset = (frame: Keyframe | undefined) => {
    const copy = { ...frame }
    delete copy.offset
    return copy
  }
  assert.deepEqual(stripOffset(reverse?.[0]), stripOffset(forward.at(-1)), preset)
  assert.deepEqual(stripOffset(reverse?.at(-1)), stripOffset(forward[0]), preset)
  exiting.cancel()
}
assert.equal(releasedAnimations, 20)
console.log(
  'Ten DOM recipes: finite keyframes, enter/exit reversal and animation lease cleanup passed.',
)
