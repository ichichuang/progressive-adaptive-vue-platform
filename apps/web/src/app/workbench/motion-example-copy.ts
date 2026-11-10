import type { ConsoleMessageKey } from '../../shared/i18n'

export const libraryCopy = {
  enter: { title: 'motionGallery.enter', description: 'motionGallery.enterDesc' },
  exit: { title: 'motionGallery.exit', description: 'motionGallery.exitDesc' },
  stagger: { title: 'motionGallery.stagger', description: 'motionGallery.staggerDesc' },
  press: { title: 'motionGallery.press', description: 'motionGallery.pressDesc' },
  drag: { title: 'motionGallery.drag', description: 'motionGallery.dragDesc' },
  expand: { title: 'motionGallery.expandTitle', description: 'motionGallery.expandDesc' },
  reorder: { title: 'motionGallery.reorderTitle', description: 'motionGallery.reorderDesc' },
  'spring-pop': { title: 'motionGallery.springPop', description: 'motionGallery.springPopDesc' },
  'slide-reveal': {
    title: 'motionGallery.slideReveal',
    description: 'motionGallery.slideRevealDesc',
  },
  'text-reveal': { title: 'motionGallery.textReveal', description: 'motionGallery.textRevealDesc' },
  'icon-swap': { title: 'motionGallery.iconSwap', description: 'motionGallery.iconSwapDesc' },
  'success-draw': {
    title: 'motionGallery.successDraw',
    description: 'motionGallery.successDrawDesc',
  },
  'error-shake': { title: 'motionGallery.errorShake', description: 'motionGallery.errorShakeDesc' },
  'selection-lens': {
    title: 'motionGallery.selectionLens',
    description: 'motionGallery.selectionLensDesc',
  },
  'grid-morph': { title: 'motionGallery.gridMorph', description: 'motionGallery.gridMorphDesc' },
  'card-fan': { title: 'motionGallery.cardFan', description: 'motionGallery.cardFanDesc' },
  'progress-fill': {
    title: 'motionGallery.progressFill',
    description: 'motionGallery.progressFillDesc',
  },
  'loading-wave': {
    title: 'motionGallery.loadingWave',
    description: 'motionGallery.loadingWaveDesc',
  },
  orbit: { title: 'motionGallery.orbit', description: 'motionGallery.orbitDesc' },
} as const satisfies Record<
  string,
  { readonly title: ConsoleMessageKey; readonly description: ConsoleMessageKey }
>

export type LibraryEffect = keyof typeof libraryCopy
