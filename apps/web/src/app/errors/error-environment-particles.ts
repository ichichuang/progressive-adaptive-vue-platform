import { environmentFrame, errorEnvironments } from './error-environment'
import { createSamplingPath } from './error-static-dots'
import type { ErrorSceneCode } from './error-scene'

const pathSegments = 96

interface FieldPointer {
  readonly x: number
  readonly y: number
  readonly vx: number
  readonly vy: number
}

export function sampleErrorEnvironment(code: ErrorSceneCode, random: () => number) {
  const { contours, grains, glide, crosswind } = errorEnvironments[code]
  let totalWeight = 0
  const tracks = contours.flatMap((contour, index) => {
    const path = createSamplingPath(contour.path)
    const length = path.getTotalLength()
    if (length <= 0) return []
    const samples = Array.from({ length: pathSegments + 1 }, (_, segment) =>
      path.getPointAtLength((length * segment) / pathSegments),
    )
    totalWeight += length * contour.weight
    return [{ ...contour, samples, cumulativeWeight: totalWeight, phase: index * 0.79 }]
  })
  const positions = new Float32Array(grains * 3)
  const anchors = new Float32Array(grains * 2)
  const tangents = new Float32Array(grains * 2)
  const phases = new Float32Array(grains)
  const depths = new Float32Array(grains)
  const variation = new Float32Array(grains)
  const opacity = new Float32Array(grains)
  const { width, height } = environmentFrame

  for (let index = 0; index < grains; index += 1) {
    const target = random() * totalWeight
    const track = tracks.find(({ cumulativeWeight }) => target < cumulativeWeight)
    if (track === undefined) break
    const progress = random() * pathSegments
    const segment = Math.floor(progress)
    const a = track.samples[segment]
    const b = track.samples[segment + 1]
    if (a === undefined || b === undefined) continue
    const fraction = progress - segment
    const dx = b.x - a.x
    const dy = a.y - b.y
    const length = Math.hypot(dx, dy) || 1
    const tx = dx / length
    const ty = dy / length
    const depth = Math.min(1, Math.max(0, track.depth + (random() - 0.5) * 0.27))
    const endFade = Math.sin((Math.PI * progress) / pathSegments)
    const pockets = Math.sin(progress * 0.19 + track.phase)
    const spread = (13 + 46 * (1 - depth) ** 2) * (1 + 0.28 * pockets)
    const offset = (random() + random() + random() - 1.5) * spread
    const x = (a.x + dx * fraction - width / 2 - ty * offset) / height
    const y = (height / 2 - a.y + dy * fraction + tx * offset) / height
    const item = index * 2
    const vertex = index * 3
    positions[vertex] = anchors[item] = x
    positions[vertex + 1] = anchors[item + 1] = y
    positions[vertex + 2] = -0.08 - (1 - depth) * 0.19
    tangents[item] = tx * track.direction
    tangents[item + 1] = ty * track.direction
    phases[index] = progress * 0.043 + track.phase
    variation[index] = random()
    depths[index] = depth
    opacity[index] = (0.2 + depth * 0.62) * (0.26 + endFade * 0.74) * (0.82 + pockets * 0.18)
  }

  function advance(
    positions: Float32Array,
    velocities: Float32Array,
    count: number,
    elapsed: number,
    step: number,
    pointer: FieldPointer | null,
    pressure: number,
  ): void {
    const phase = elapsed * (0.43 + glide * 0.42)
    for (let index = 0; index < count; index += 1) {
      const item = index * 2
      const vertex = index * 3
      const x = positions[vertex] ?? 0
      const y = positions[vertex + 1] ?? 0
      const tx = tangents[item] ?? 0
      const ty = tangents[item + 1] ?? 0
      const a = anchors[item] ?? 0
      const b = anchors[item + 1] ?? 0
      const depth = depths[index] ?? 0
      const lane = phases[index] ?? 0
      const glideOffset = Math.sin(lane - phase) * (0.01 + 0.035 * glide) * (0.4 + depth * 0.6)
      const crossOffset =
        Math.sin(lane * 1.6 + a * 2.3 - b * 2.1 + phase * 0.72) *
        (0.003 + 0.022 * crosswind) *
        (1 - depth * 0.52)
      let ax = (a + tx * glideOffset - ty * crossOffset - x) * 40
      let ay = (b + ty * glideOffset + tx * crossOffset - y) * 40

      if (pointer !== null) {
        const dx = x - pointer.x
        const dy = y - pointer.y
        const weight = 1 - (dx * dx + dy * dy) / 0.0144
        if (weight > 0) {
          const force = weight * weight * pressure * (0.26 + depth * 0.74)
          ax += force * (dx * 16 + pointer.vx * 1.1)
          ay += force * (dy * 16 + pointer.vy * 1.1)
        }
      }

      const vx = Math.max(-0.34, Math.min(0.34, ((velocities[item] ?? 0) + ax * step) * 0.88))
      const vy = Math.max(-0.34, Math.min(0.34, ((velocities[item + 1] ?? 0) + ay * step) * 0.88))
      velocities[item] = vx
      velocities[item + 1] = vy
      positions[vertex] = x + vx * step
      positions[vertex + 1] = y + vy * step
    }
  }

  return {
    capacity: tracks.length === 0 ? 0 : grains,
    positions,
    depths,
    variation,
    opacity,
    advance,
  }
}
