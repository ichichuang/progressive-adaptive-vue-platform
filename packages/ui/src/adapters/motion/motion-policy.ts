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

// This private projection owns navigation, workspace, form-feedback and table-sort interactions.
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
    themePicker: Object.freeze({
      entering: { opacity: 0, y: movement ? 10 : 0, scale: movement ? 0.97 : 1 },
      visible: { opacity: 1, y: 0, scale: 1 },
      transition: {
        duration: mode === 'none' ? 0 : movement ? 0.38 : 0.12,
        ease: [0.2, 0, 0, 1] as [number, number, number, number],
      },
    }),
    tableSortIcon: Object.freeze({
      visible: { opacity: 1, scale: 1 },
      hidden: { opacity: 0, scale: movement ? 0.82 : 1 },
      transition: { duration, ease: 'easeOut' as const },
    }),
    formFeedback: Object.freeze({
      x: movement ? [0, -3, 3, -2, 1, 0] : 0,
      transition: { duration: movement ? 0.28 : 0 },
    }),
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
      tabSurfaceVariants: {
        rest: { opacity: 0, scaleX: movement ? 0.92 : 1 },
        hover: { opacity: 0.6, scaleX: 1 },
        press: { opacity: 1, scaleX: movement ? 0.98 : 1 },
      },
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
