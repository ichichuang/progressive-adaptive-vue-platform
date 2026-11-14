import { motionOrigin, playDomFrames } from './cinematic-dom-playback'
import type { CinematicPlayback, ThemeRiftInput } from './cinematic-theme-rift'

type MaskPreset = 'curtain' | 'iris' | 'paper-tear' | 'ink-reveal' | 'pixel-dissolve'
const percent = (value: number): string => `${String(value * 100)}%`

/** Fixed vertex count allows the browser to interpolate the live-content silhouette. */
function organicMask(progress: number, x: number, y: number): string {
  const points = Array.from({ length: 32 }, (_, index) => {
    const angle = (index / 32) * Math.PI * 2
    const ripple = 1 + Math.sin(angle * 5 + 0.8) * 0.15 + Math.cos(angle * 3) * 0.1
    const radius = progress * 2 * ripple
    return `${percent(x + Math.cos(angle) * radius)} ${percent(y + Math.sin(angle) * radius)}`
  })
  return `polygon(${points.join(',')})`
}

function tornMask(progress: number): string {
  const edge = Array.from({ length: 18 }, (_, index) => {
    const y = index / 17
    const tooth = Math.sin(index * 2.3) * 0.038 + Math.cos(index * 4.1) * 0.016
    const x = progress + tooth * Math.sin(progress * Math.PI)
    return `${percent(x)} ${percent(y)}`
  })
  return `polygon(0% 0%,${edge.join(',')},0% 100%)`
}

/** An SVG path of independent cells clips the real DOM, without sampling or cloning its contents. */
function pixelMask(progress: number, width: number, height: number, x: number, y: number): string {
  const columns = 12
  const rows = 8
  const cells: string[] = []
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const distance = Math.hypot(column / columns - x, row / rows - y) / Math.SQRT2
      const noise = ((column * 17 + row * 23) % 19) / 19
      const delay = distance * 0.42 + noise * 0.16
      const visible = Math.max(0, Math.min(1, (progress - delay) / 0.38))
      const cellWidth = width / columns
      const cellHeight = height / rows
      const cx = (column + 0.5) * cellWidth
      const cy = (row + 0.5) * cellHeight
      const halfWidth = (cellWidth / 2 + 0.4) * visible
      const halfHeight = (cellHeight / 2 + 0.4) * visible
      cells.push(
        `M${String(cx - halfWidth)} ${String(cy - halfHeight)}h${String(halfWidth * 2)}v${String(halfHeight * 2)}h${String(-halfWidth * 2)}Z`,
      )
    }
  }
  return `path('${cells.join('')}')`
}

export function playMaskRecipe(
  target: HTMLElement,
  input: ThemeRiftInput,
  preset: MaskPreset,
): CinematicPlayback {
  const { x, y } = motionOrigin(target, input)
  if (preset === 'curtain')
    return playDomFrames(target, input, [
      { clipPath: `inset(0 ${percent(1 - x)} 0 ${percent(x)})` },
      { clipPath: 'inset(0 0% 0 0%)' },
    ])
  if (preset === 'iris')
    return playDomFrames(target, input, [
      { clipPath: `circle(0% at ${percent(x)} ${percent(y)})` },
      { clipPath: `circle(150% at ${percent(x)} ${percent(y)})` },
    ])
  const bounds = target.getBoundingClientRect()
  const frames = Array.from({ length: 17 }, (_, index): Keyframe => {
    const progress = index / 16
    return {
      offset: progress,
      clipPath:
        preset === 'paper-tear'
          ? tornMask(progress)
          : preset === 'ink-reveal'
            ? organicMask(progress, x, y)
            : pixelMask(progress, bounds.width, bounds.height, x, y),
    }
  })
  return playDomFrames(target, input, frames)
}
