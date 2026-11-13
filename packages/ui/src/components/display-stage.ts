export interface UiDisplayRatio {
  readonly width: number
  readonly height: number
}
export interface UiDisplayStageSize {
  readonly width: number
  readonly height: number
}
/** Contain the requested ratio within the actual available content box, without scaling descendants. */
export function fitUiDisplayStage(
  width: number,
  height: number,
  ratio: UiDisplayRatio = { width: 16, height: 9 },
): UiDisplayStageSize {
  if (
    !Number.isFinite(ratio.width) ||
    !Number.isFinite(ratio.height) ||
    ratio.width <= 0 ||
    ratio.height <= 0
  )
    throw new Error('Display stage ratio must contain positive finite width and height.')
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 0 || height < 0)
    throw new Error('Display stage available dimensions must be finite and non-negative.')
  const scale = Math.min(width / ratio.width, height / ratio.height)
  return { width: ratio.width * scale, height: ratio.height * scale }
}
