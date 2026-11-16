import { environmentFrame, errorEnvironments } from './error-environment'
import { emergencyFocalStrokes } from './error-focal-shapes'
import { randomSequence } from './error-particle-layout'
import { glyphHeight, glyphWidth, type ErrorSceneCode } from './error-scene'

const namespace = 'http://www.w3.org/2000/svg'

export function createSamplingPath(data: string): SVGPathElement {
  const path = document.createElementNS(namespace, 'path')
  path.setAttribute('d', data)
  return path
}

export function appendErrorStaticDots(host: HTMLElement, code: ErrorSceneCode): void {
  const random = randomSequence(3019)
  function drawLayer(
    layer: 'environment' | 'focal',
    viewBox: string,
    contours: readonly { path: string; width: number; offset?: number }[],
    density: number,
    size: number,
  ): SVGSVGElement {
    const svg = document.createElementNS(namespace, 'svg')
    svg.setAttribute(
      'class',
      layer === 'environment'
        ? 'error-scene__dot-fallback error-scene__dot-environment'
        : 'error-scene__dot-fallback error-scene__focal',
    )
    svg.setAttribute('viewBox', viewBox)
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice')
    svg.setAttribute('fill', 'currentColor')
    svg.setAttribute('focusable', 'false')
    const dots = ['', '', '']
    for (const contour of contours) {
      const shape = createSamplingPath(contour.path)
      const length = shape.getTotalLength()
      const count = Math.min(210, Math.ceil(length / density))
      for (let index = 0; index < count; index += 1) {
        const point = shape.getPointAtLength((length * (index + random())) / count)
        const x = Math.round(point.x + (contour.offset ?? 0) + (random() - 0.5) * contour.width)
        const y = Math.round(point.y + (random() - 0.5) * contour.width)
        const dot = (size * (0.65 + random())).toFixed(1)
        const lane = index % dots.length
        dots[lane] = (dots[lane] ?? '') + `M${String(x)} ${String(y)}h${dot}v${dot}h-${dot}z`
      }
    }
    for (const [index, data] of dots.entries()) {
      const path = createSamplingPath(data)
      path.setAttribute('opacity', String(0.29 + 0.22 * index))
      svg.append(path)
    }
    return svg
  }

  const environment = errorEnvironments[code].contours.map(({ path, depth }) => ({
    path,
    width: 25 + 62 * (1 - depth),
  }))
  host.append(
    drawLayer('environment', environmentFrame.viewBox, environment, 17, 3),
    drawLayer(
      'focal',
      `0 0 ${String(glyphWidth)} ${String(glyphHeight)}`,
      emergencyFocalStrokes(code),
      4.5,
      2.8,
    ),
  )
}
