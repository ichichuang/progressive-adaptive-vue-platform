import { environmentFrame } from './error-environment'
import { glyphHeight, glyphWidth } from './error-scene'

export const glyphAspect = glyphWidth / glyphHeight

export interface ErrorArtworkViewport {
  readonly width: number
  readonly height: number
  readonly glyphHeight: number
}

export function errorParticleLayout(
  { width, height, glyphHeight: glyph }: ErrorArtworkViewport,
  dpr: number,
  focalCapacity: number,
  environmentCapacity: number,
) {
  const ratio = Math.min(dpr, 1.65, Math.sqrt(1_650_000 / (width * height)))
  const pixelWidth = Math.max(1, Math.floor(width * ratio))
  const pixelHeight = Math.max(1, Math.floor(height * ratio))
  const scale = glyph * ratio
  const environmentScale =
    environmentFrame.height *
    Math.max(width / environmentFrame.width, height / environmentFrame.height) *
    ratio
  return {
    pixelWidth,
    pixelHeight,
    scale,
    environmentScale,
    diameter: Math.max(1.35, Math.min(2.85, glyph / 150)) * ratio,
    focalCount: Math.round(
      focalCapacity * Math.max(0.58, Math.min((glyph * glyphAspect) / 900, 1)),
    ),
    environmentCount: Math.round(
      environmentCapacity * Math.min(1, width / 980) * Math.min(1, height / 510),
    ),
  }
}

export type ErrorParticleLayout = ReturnType<typeof errorParticleLayout>

export function randomSequence(seed: number): () => number {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}
