import assert from 'node:assert/strict'
import {
  ProductPreferenceDefault,
  projectSettingsColorMotion,
  projectUiAppearance,
  resolveThemeReference,
  type EffectiveColorMode,
} from '@platform/design-system'
import {
  interruptAppearanceTransition,
  playAppearanceTransition,
} from '../../apps/web/src/app/appearance/appearance-transition'

// A skipped browser transition can still deliver its original update callback later.
const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
const oldCss = Object.getOwnPropertyDescriptor(globalThis, 'CSS')
const updates: (() => Promise<void>)[] = []
let skips = 0
let throwOnSkip = false
let settings = false
const never = new Promise<void>(() => undefined)
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: {
    visibilityState: 'visible',
    activeViewTransition: null,
    documentElement: { animate: () => undefined },
    querySelector: (selector: string) => (settings && selector === '.wb-settings-page' ? {} : null),
    startViewTransition: ({ update }: { update: () => Promise<void> }) => {
      updates.push(update)
      return {
        ready: never,
        finished: never,
        updateCallbackDone: never,
        skipTransition: () => {
          skips += 1
          if (throwOnSkip) throw new Error('visual transition unavailable')
        },
      }
    },
  },
})
Object.defineProperty(globalThis, 'CSS', {
  configurable: true,
  value: { supports: () => true },
})

try {
  const value = { mode: 'system', theme: 'iris', density: 'comfortable' }
  let modeCommits = 0
  playAppearanceTransition({
    kind: 'mode',
    motion: 'full',
    commit: () => {
      modeCommits += 1
      value.mode = 'dark'
      return true
    },
  })
  playAppearanceTransition({
    kind: 'mode',
    motion: 'full',
    commit: () => {
      value.mode = 'light'
      return true
    },
  })
  assert.equal(value.mode, 'light', 'The newest mode request must be applied immediately.')
  await updates[0]?.()
  assert.equal(value.mode, 'light', 'A skipped update callback must not overwrite the newer mode.')
  assert.equal(modeCommits, 1, 'The skipped update must commit exactly once.')

  playAppearanceTransition({
    kind: 'palette',
    motion: 'full',
    commit: () => {
      value.theme = 'ocean'
      return true
    },
  })
  playAppearanceTransition({
    kind: 'mode',
    motion: 'full',
    commit: () => {
      value.mode = 'dark'
      return true
    },
  })
  await updates[1]?.()
  assert.deepEqual(value, { mode: 'dark', theme: 'ocean', density: 'comfortable' })

  playAppearanceTransition({
    kind: 'palette',
    motion: 'full',
    commit: () => {
      value.theme = 'forest'
      return true
    },
  })
  throwOnSkip = true
  interruptAppearanceTransition()
  value.density = 'compact'
  await updates[2]?.()
  assert.deepEqual(value, { mode: 'dark', theme: 'forest', density: 'compact' })
  assert.equal(skips, 3)
  settings = true
  playAppearanceTransition({
    kind: 'mode',
    motion: 'full',
    isCurrent: () => value.mode === 'dark',
    commit: () =>
      assert.fail('An unchanged preference must never enter the commit or animation path.'),
  })
  playAppearanceTransition({
    kind: 'mode',
    motion: 'full',
    commit: () => {
      value.mode = 'system'
      return true
    },
  })
  assert.equal(value.mode, 'system', 'A distinct Settings mode applies synchronously.')
  assert.equal(updates.length, 3, 'The Settings scene must never request a document snapshot.')

  const snapshot = (
    themeId: 'royal-iris' | 'cobalt-tide' | 'emerald-grove',
    colorMode: EffectiveColorMode,
  ) => {
    const theme = { registryKind: 'built-in', themeId } as const
    const resolved = resolveThemeReference({ reference: theme, customThemeRegistry: null })
    assert.equal(resolved.status, 'resolved')
    return projectUiAppearance(
      { ...ProductPreferenceDefault, theme, colorMode, density: 'comfortable', material: 'solid' },
      resolved.entry,
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
  console.log('Appearance transitions preserve rapid and independent accepted updates.')
} finally {
  interruptAppearanceTransition()
  for (const [key, descriptor] of [
    ['document', oldDocument],
    ['CSS', oldCss],
  ] as const) {
    if (descriptor === undefined) Reflect.deleteProperty(globalThis, key)
    else Object.defineProperty(globalThis, key, descriptor)
  }
}
