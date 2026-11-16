import { useAnimate } from 'motion-v'

const timing = {
  heading: { delay: 0, duration: 1 },
  description: { delay: 0.24, duration: 1 },
  action: { delay: 0.48, duration: 1.1 },
} as const

export function useErrorForegroundMotion() {
  const [, animate] = useAnimate()
  return {
    available:
      typeof Element !== 'undefined' &&
      typeof Element.prototype.animate === 'function' &&
      typeof Element.prototype.getAnimations === 'function',
    play(part: keyof typeof timing, target: HTMLElement) {
      const playback = animate(
        target,
        {
          opacity: [0, 1],
          // An explicit identity matrix retains scale when Motion resolves the keyframes.
          transform: [getComputedStyle(target).transform, 'matrix(1, 0, 0, 1, 0, 0)'],
        },
        { ...timing[part], type: 'tween', ease: [0.4, 0, 0.6, 1], autoplay: false },
      )

      try {
        playback.play()
        // Observe native cancellation as well as Motion's completion of both properties.
        let complete = false
        const finished = Promise.all([
          playback.finished,
          ...target.getAnimations().map((animation) => animation.finished),
        ]).then(() => {
          complete = true
        })
        void finished.catch(() => undefined)
        return {
          finished,
          finish() {
            if (!complete) playback.complete()
          },
        }
      } catch (error) {
        playback.cancel()
        throw error
      }
    },
  }
}
