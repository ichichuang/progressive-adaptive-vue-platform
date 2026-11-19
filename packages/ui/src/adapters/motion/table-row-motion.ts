import { startWaapiAnimation } from 'motion-v'
import { onDeactivated, onScopeDispose } from 'vue'
import { projectMotionPolicy } from './motion-policy'

const duration = projectMotionPolicy('full').workspace.transition.duration * 1000
const maximumRows = 20

/** Capture presentation geometry only. The native table remains responsible for row identity. */
export function useTableRowMotion() {
  const running = new Set<Animation>()
  function stop(): void {
    for (const playback of running) playback.cancel()
    running.clear()
  }
  onDeactivated(stop)
  onScopeDispose(stop)

  function capture(surface: HTMLElement): ReadonlyMap<HTMLElement, number> | undefined {
    const rows = surface.querySelectorAll<HTMLElement>('tbody > tr')
    if (rows.length < 2 || rows.length > maximumRows) return
    const top = surface.getBoundingClientRect().top
    return new Map([...rows].map((row) => [row, row.getBoundingClientRect().top - top]))
  }

  function play(surface: HTMLElement, before: ReadonlyMap<HTMLElement, number>): void {
    stop()
    const after = capture(surface)
    if (after === undefined || typeof surface.animate !== 'function') return
    for (const [row, top] of after) {
      const previous = before.get(row)
      if (previous !== undefined && Math.abs(previous - top) < 0.5) continue
      const playback =
        previous === undefined
          ? startWaapiAnimation(row, 'opacity', [0.65, 1], { duration })
          : startWaapiAnimation(
              row,
              'transform',
              [`translateY(${String(previous - top)}px)`, 'none'],
              {
                duration,
              },
            )
      running.add(playback)
      const forget = () => running.delete(playback)
      void playback.finished.then(() => {
        playback.cancel()
        forget()
      }, forget)
    }
  }
  return { capture, play, stop }
}
