import {
  particleOpacityLevels,
  particleStampSize,
  particleTones,
  type ErrorParticleDescription,
} from './error-particle-data'
import type { ErrorParticleLayout } from './error-particle-layout'
import type { ErrorArtworkColors } from './error-scene'

export function paintParticleAtlas(
  context: CanvasRenderingContext2D,
  { ink, accent }: ErrorArtworkColors,
) {
  const width = particleStampSize * particleTones
  const height = particleStampSize * particleStampSize * particleOpacityLevels
  context.canvas.width = width
  context.canvas.height = height
  context.fillStyle = ink
  context.fillRect(0, 0, 1, 1)
  context.fillStyle = accent
  context.fillRect(1, 0, 1, 1)
  const colors = context.getImageData(0, 0, 2, 1).data
  const image = context.createImageData(width, height)
  for (let size = 1; size <= particleStampSize; size += 1) {
    for (let opacity = 1; opacity < particleOpacityLevels; opacity += 1) {
      const row = ((size - 1) * particleOpacityLevels + opacity) * particleStampSize
      for (let tone = 0; tone < particleTones; tone += 1) {
        const mix = tone / (particleTones - 1)
        for (let y = 0; y < size; y += 1) {
          for (let x = 0; x < size; x += 1) {
            const distance = Math.hypot((x + 0.5) / size - 0.5, (y + 0.5) / size - 0.5)
            const edge = Math.max(0, Math.min(1, (0.55 - distance) / 0.42))
            const pixel = ((row + y) * width + tone * particleStampSize + x) * 4
            for (let channel = 0; channel < 3; channel += 1) {
              image.data[pixel + channel] =
                (colors[channel] ?? 0) * (1 - mix) + (colors[4 + channel] ?? 0) * mix
            }
            image.data[pixel + 3] =
              (255 * opacity * edge * edge * (3 - 2 * edge)) / (particleOpacityLevels - 1)
          }
        }
      }
    }
  }
  context.putImageData(image, 0, 0)
  return image
}

export function paintErrorParticles(
  context: CanvasRenderingContext2D,
  atlas: HTMLCanvasElement,
  description: ErrorParticleDescription,
  layout: ErrorParticleLayout,
): void {
  const { pixelWidth, pixelHeight, diameter } = layout
  context.canvas.width = pixelWidth
  context.canvas.height = pixelHeight
  context.imageSmoothingEnabled = false

  function paintLayer(
    { positions, styles }: Pick<ErrorParticleDescription['focal'], 'positions' | 'styles'>,
    count: number,
    scale: number,
  ): void {
    for (let index = 0; index < count; index += 1) {
      const vertex = index * 3
      const size = Math.max(
        1,
        Math.min(particleStampSize, Math.round(diameter * (styles[vertex] ?? 0))),
      )
      const x = Math.round(pixelWidth / 2 + (positions[vertex] ?? 0) * scale - size / 2)
      const y = Math.round(pixelHeight / 2 - (positions[vertex + 1] ?? 0) * scale - size / 2)
      if (x >= pixelWidth || y >= pixelHeight || x + size <= 0 || y + size <= 0) continue
      const column = (styles[vertex + 1] ?? 0) * particleStampSize
      const row =
        ((size - 1) * particleOpacityLevels + (styles[vertex + 2] ?? 0)) * particleStampSize
      context.drawImage(atlas, column, row, size, size, x, y, size, size)
    }
  }

  paintLayer(description.environment, layout.environmentCount, layout.environmentScale)
  paintLayer(description.focal, layout.focalCount, layout.scale)
}
