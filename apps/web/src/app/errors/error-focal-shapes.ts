import type { ErrorSceneCode } from './error-scene'

interface FocalStroke {
  readonly path: string
  readonly width: number
  readonly offset?: number
}

export const errorSymbolStrokes = {
  OFFLINE: [
    { path: 'M321 151a244 244 0 0 1 338 6M648 302a237 237 0 0 1-262 35', width: 38 },
    { path: 'M401 210a134 134 0 0 1 177 1M459 267a44 44 0 0 1 61 0', width: 30 },
    { path: 'm363 75 250 282', width: 26 },
  ],
  SERVICE: [
    { path: 'M365 100a178 178 0 1 1-54 153', width: 38 },
    { path: 'M436 164v112m87-112v112', width: 36 },
  ],
  ERROR: [{ path: 'M480 77v202m0 83v4', width: 52 }],
} as const satisfies Readonly<Record<string, readonly FocalStroke[]>>

const digitStrokes: Readonly<Record<string, string>> = {
  '0': 'M54 190C54 82 88 39 150 39S246 82 246 190 212 341 150 341 54 298 54 190Z',
  '1': 'M72 104l82-65v302m-77 0h160',
  '3': 'M65 75C109 22 233 24 233 106c0 54-51 74-91 74 53 0 99 24 99 80 0 87-121 105-183 44',
  '4': 'M208 342V39L52 234h200',
  '5': 'M228 40H78L67 177c54-45 173-21 173 66 0 91-101 131-176 69',
}

export function emergencyFocalStrokes(code: ErrorSceneCode): readonly FocalStroke[] {
  if (code in errorSymbolStrokes) return errorSymbolStrokes[code as keyof typeof errorSymbolStrokes]
  return (code.match(/[0-9]/gu) ?? []).map((digit, index) => ({
    path: digitStrokes[digit] ?? '',
    width: 49,
    offset: 30 + 300 * index,
  }))
}
