/** Decorative presentation parameters. Route identity and recovery stay with their owners. */
export const errorArtwork = {
  '400': { role: 'warning', accent: 'warning', grains: 15200, flow: 0.85 },
  '401': { role: 'primary', accent: 'primary', grains: 15000, flow: 0.72 },
  '403': { role: 'warning', accent: 'warning', grains: 16800, flow: 0.66 },
  '404': { role: 'primary', accent: 'expression', grains: 18400, flow: 1 },
  '500': { role: 'error', accent: 'error', grains: 16800, flow: 1.14 },
  OFFLINE: { role: 'neutral', accent: 'info', grains: 11500, flow: 0.6 },
  SERVICE: { role: 'warning', accent: 'warning', grains: 13500, flow: 0.52 },
  ERROR: { role: 'neutral', accent: 'error', grains: 10500, flow: 0.65 },
} as const

export type ErrorSceneCode = keyof typeof errorArtwork

export const glyphWidth = 960
export const glyphHeight = 440

export interface ErrorArtworkColors {
  readonly ink: string
  readonly accent: string
}
