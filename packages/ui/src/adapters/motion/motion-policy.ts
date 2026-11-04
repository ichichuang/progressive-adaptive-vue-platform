import type { EffectiveAppearanceState } from '@platform/design-system'

type MotionMode = EffectiveAppearanceState['motion']

const resting = Object.freeze({ opacity: 1, scale: 1 })
const navigationTransition = Object.freeze({
  layout: Object.freeze({ type: 'spring' as const, visualDuration: 0.26, bounce: 0.16, delay: 0 }),
})
const edgeSurfaceVariants = Object.freeze({
  rest: { opacity: 0 },
  hover: { opacity: 0.6 },
  press: { opacity: 1 },
  disabled: { opacity: 0, transition: { duration: 0 } },
})
const edgeGestures = Object.freeze({
  whileHover: 'hover',
  whilePress: 'press',
})

// This private projection owns only the two admitted production interactions.
// Effective mode is resolved once by Design System; values retain their named contracts.
export function projectMotionPolicy(mode: MotionMode, featureReady = true) {
  const movement = featureReady && mode === 'full'
  const duration = !featureReady || mode === 'none' ? 0 : movement ? 0.16 : 0.08
  const leaving = { opacity: mode === 'none' ? 1 : 0, scale: movement ? 0.98 : 1 }
  return Object.freeze({
    mode,
    movement,
    reducedMotion: mode === 'full' ? ('user' as const) : ('always' as const),
    skipAnimations: mode === 'none' || !featureReady,
    navigationTransition,
    workspace: Object.freeze({
      transition: {
        duration,
        ...(movement
          ? { layout: { type: 'spring' as const, visualDuration: 0.26, bounce: 0 } }
          : {}),
      },
      resting,
      leaving,
      entering: { ...leaving, y: movement ? 3 : 0 },
      closeMarkVariants: {
        rest: { opacity: 0.68, scale: 1 },
        hover: { opacity: 1, scale: movement ? 1.12 : 1 },
        press: { opacity: 0.86, scale: movement ? 0.985 : 1 },
      },
      edgeSurfaceVariants,
      edgeGestures,
      edgeMarkVariants: {
        rest: resting,
        hover: { opacity: 1, scale: movement ? 1.04 : 1 },
        press: { opacity: 0.86, scale: movement ? 0.96 : 1 },
        disabled: { ...resting, transition: { duration: 0 } },
      },
    }),
  })
}

export type MotionPolicy = ReturnType<typeof projectMotionPolicy>
