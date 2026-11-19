import { useAnimate } from 'motion-v'
import { projectMotionPolicy } from './motion-policy'

const duration = projectMotionPolicy('full').workspace.transition.duration

export function useErrorForegroundMotion() {
  const [, animate] = useAnimate()
  return {
    available:
      typeof Element !== 'undefined' &&
      typeof Element.prototype.animate === 'function' &&
      typeof Element.prototype.getAnimations === 'function',
    play(_part: 'heading' | 'description' | 'action', target: HTMLElement) {
      const playback = animate(
        target,
        {
          transform: [getComputedStyle(target).transform, 'matrix(1, 0, 0, 1, 0, 0)'],
        },
        { duration, type: 'tween', ease: 'easeOut', autoplay: false },
      )

      try {
        playback.play()
        // Observe native cancellation as well as Motion's completion.
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
