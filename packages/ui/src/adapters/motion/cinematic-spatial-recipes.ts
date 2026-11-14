import { motionOrigin, playDomFrames } from './cinematic-dom-playback'
import type { CinematicPlayback, ThemeRiftInput } from './cinematic-theme-rift'

type SpatialPreset = 'page-peel' | 'camera-push' | 'card-expand'

/** Individual transform properties preserve the consumer's existing transform declaration. */
export function playSpatialRecipe(
  target: HTMLElement,
  input: ThemeRiftInput,
  preset: SpatialPreset,
): CinematicPlayback {
  const { x, y } = motionOrigin(target, input)
  const transformOrigin = `${String(x * 100)}% ${String(y * 100)}%`
  if (preset === 'camera-push')
    return playDomFrames(target, input, [
      { scale: '1.16', opacity: 0, filter: 'blur(8px)', transformOrigin },
      { scale: '1.025', opacity: 1, filter: 'blur(0px)', transformOrigin, offset: 0.65 },
      { scale: '1', opacity: 1, filter: 'blur(0px)', transformOrigin },
    ])
  if (preset === 'card-expand')
    return playDomFrames(target, input, [
      { scale: '0.84', clipPath: 'inset(20% 12% round 8%)', opacity: 0, transformOrigin },
      {
        scale: '0.985',
        clipPath: 'inset(1% 1% round 2%)',
        opacity: 1,
        transformOrigin,
        offset: 0.7,
      },
      { scale: '1', clipPath: 'inset(0% 0% round 0%)', opacity: 1, transformOrigin },
    ])
  // A live surface unfurls from its initiating edge. It is not a synthetic image of the page.
  return playDomFrames(target, input, [
    {
      rotate: `${String(x < 0.5 ? -8 : 8)}deg`,
      scale: '0.88',
      clipPath: 'polygon(0% 0%,0% 0%,0% 100%,0% 100%)',
      opacity: 0.4,
      transformOrigin,
    },
    {
      rotate: `${String(x < 0.5 ? -2 : 2)}deg`,
      scale: '0.98',
      clipPath: 'polygon(0% 0%,84% 0%,68% 100%,0% 100%)',
      opacity: 1,
      transformOrigin,
      offset: 0.65,
    },
    {
      rotate: '0deg',
      scale: '1',
      clipPath: 'polygon(0% 0%,100% 0%,100% 100%,0% 100%)',
      opacity: 1,
      transformOrigin,
    },
  ])
}
