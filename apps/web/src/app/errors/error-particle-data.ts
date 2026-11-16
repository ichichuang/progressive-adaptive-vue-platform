import { sampleErrorEnvironment } from './error-environment-particles'
import { errorSymbolStrokes } from './error-focal-shapes'
import { glyphAspect, randomSequence } from './error-particle-layout'
import { errorArtwork, glyphHeight, glyphWidth, type ErrorSceneCode } from './error-scene'

function focalMask(code: ErrorSceneCode, font: CSSStyleDeclaration): ImageData {
  const mask = document.createElement('canvas')
  mask.width = glyphWidth / 2
  mask.height = glyphHeight / 2
  const context = mask.getContext('2d', { willReadFrequently: true })
  if (context === null) throw new Error('Error artwork Canvas 2D mask is unavailable.')
  context.scale(0.5, 0.5)
  if (code === 'OFFLINE' || code === 'SERVICE' || code === 'ERROR') {
    context.lineCap = 'round'
    for (const { path, width } of errorSymbolStrokes[code]) {
      context.lineWidth = width
      context.stroke(new Path2D(path))
    }
  } else {
    // The PAVP font stack is local. Sample it synchronously with the existing focal proportions.
    const weight = font.getPropertyValue('--ui-font-weight-title').trim()
    context.font = `${weight} 482px ${font.fontFamily}`
    const width = context.measureText(code).width
    context.translate(glyphWidth / 2, 396)
    context.scale(958 / width, 1)
    context.textAlign = 'center'
    context.fillText(code, 0, 0)
  }
  return context.getImageData(0, 0, mask.width, mask.height)
}

export const particleTones = 12
export const particleOpacityLevels = 24
export const particleStampSize = 7

function particleStyles(
  positions: Float32Array,
  depths: Float32Array,
  variation: Float32Array,
  opacity?: Float32Array,
): Float32Array {
  const styles = new Float32Array(positions.length)
  for (let index = 0; index < depths.length; index += 1) {
    const vertex = index * 3
    const depth = depths[index] ?? 0
    const grain = variation[index] ?? 0
    const density = opacity?.[index] ?? 1
    const x = positions[vertex] ?? 0
    const y = positions[vertex + 1] ?? 0
    const relief = 0.62 + depth * 0.54 + 0.18 * Math.sin(x * 6 + y * 5)
    const locality = opacity === undefined ? 1 : 0.66 + 0.29 * depth
    const light = Math.max(0.32, Math.min(0.93, relief * 0.65 + grain * 0.21))
    styles[vertex] = (0.55 + grain * 0.97) * relief * locality
    styles[vertex + 1] = Math.round(grain * (0.24 + (1 - depth) * 0.28) * (particleTones - 1))
    styles[vertex + 2] = Math.max(1, Math.round(light * density * (particleOpacityLevels - 1)))
  }
  return styles
}

export function sampleErrorParticles(code: ErrorSceneCode, font: CSSStyleDeclaration) {
  const { data, width, height } = focalMask(code, font)
  const covered: number[] = []
  for (let index = 0; index < data.length; index += 4) {
    if ((data[index + 3] ?? 0) > 175) covered.push(index / 4)
  }
  if (covered.length < width * height * 0.01) throw new Error('The error glyph mask is empty.')

  const random = randomSequence(58361)
  const capacity = errorArtwork[code].grains
  const positions = new Float32Array(capacity * 3)
  const depths = new Float32Array(capacity)
  const variation = new Float32Array(capacity)
  for (let index = 0; index < capacity; index += 1) {
    // A low-discrepancy order also covers the full glyph when only a prefix is drawn.
    const pixel = covered[Math.floor(((index * 0.61803398875) % 1) * covered.length)] ?? 0
    const depth = random()
    const grain = random()
    positions[index * 3] =
      (((pixel % width) + random()) / width - 0.5) * glyphAspect + 0.021 * (0.5 - grain)
    positions[index * 3 + 1] = 0.5 - (Math.floor(pixel / width) + random()) / height
    positions[index * 3 + 2] = depth * 0.07
    depths[index] = depth
    variation[index] = grain
  }
  const focal = {
    capacity,
    positions,
    depths,
    variation,
    styles: particleStyles(positions, depths, variation),
  }
  const environment = sampleErrorEnvironment(code, randomSequence(41989))
  const environmentStyles = particleStyles(
    environment.positions,
    environment.depths,
    environment.variation,
    environment.opacity,
  )
  return { focal, environment: { ...environment, styles: environmentStyles } }
}

export type ErrorParticleDescription = ReturnType<typeof sampleErrorParticles>
