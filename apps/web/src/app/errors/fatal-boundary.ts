import type { NormalizedCoreError } from './core-error'
import { getCoreErrorMessage } from './core-error-messages'
import { getCoreErrorRecord } from './core-error-registry'
import { appendErrorStaticDots } from './error-static-dots'

export interface FatalBoundaryHandle {
  dispose(): void
}

export type ConfigurationFailureAction =
  | {
      readonly kind: 'retry'
      readonly run: () => void
    }
  | {
      readonly kind: 'reload'
      readonly run: () => void
    }

function renderFatalBoundary(input: {
  readonly target: HTMLElement
  readonly error:
    | NormalizedCoreError<'runtime-configuration-failure'>
    | NormalizedCoreError<'application-startup-failure'>
  readonly action: ConfigurationFailureAction
}): FatalBoundaryHandle {
  const record = getCoreErrorRecord(input.error.id)
  const message = getCoreErrorMessage(record.userMessageKey)
  const actionLabel =
    input.action.kind === 'retry' ? message.retryActionLabel : message.reloadActionLabel

  if (actionLabel === null) {
    throw new TypeError()
  }

  const boundary = document.createElement('main')
  boundary.className = 'error-scene error-scene--document grid'
  boundary.dataset['errorTone'] = 'error'
  boundary.setAttribute('lang', 'zh-CN')
  boundary.setAttribute('dir', 'ltr')
  boundary.setAttribute('role', 'alert')
  boundary.setAttribute('aria-live', 'assertive')

  const scene = document.createElement('section')
  scene.className = 'error-scene__composition relative grid min-w-0 min-h-0'

  const illustration = document.createElement('div')
  illustration.className = 'error-scene__artwork pointer-events-none'
  illustration.setAttribute('aria-hidden', 'true')

  const glyph = document.createElement('div')
  glyph.className = 'error-scene__glyph'
  glyph.setAttribute('data-compact', '')
  try {
    appendErrorStaticDots(glyph, 'ERROR')
  } catch {
    // Decoration is best-effort and must not prevent access to fatal recovery.
  }
  illustration.append(glyph)

  const content = document.createElement('div')
  content.className = 'error-scene__content grid min-w-0'

  const copy = document.createElement('div')
  copy.className = 'error-scene__copy grid gap-content-gap'

  const title = document.createElement('h1')
  title.className = 'm-0 leading-title'
  title.textContent = message.title

  const description = document.createElement('p')
  description.className = 'm-0 text-pretty text-body text-text-secondary'
  description.textContent = message.description

  const action = document.createElement('button')
  action.className = 'error-scene__action error-scene__action--fallback'
  action.type = 'button'
  const actionSurface = document.createElement('span')
  actionSurface.className = 'error-scene__action-surface'
  const actionIcon = document.createElement('span')
  actionIcon.className = 'error-scene__action-arrow i-lucide-rotate-cw'
  actionIcon.setAttribute('aria-hidden', 'true')
  actionSurface.append(actionIcon, actionLabel)
  action.append(actionSurface)

  let actionStarted = false
  let disposed = false
  let listenerInstalled = false
  let boundaryInstalled = false
  const runAction = (): void => {
    if (disposed || actionStarted) {
      return
    }

    actionStarted = true
    action.disabled = true
    input.action.run()
  }

  const handle: FatalBoundaryHandle = {
    dispose() {
      if (disposed) {
        return
      }

      let cleanupFailure: Error | undefined

      if (listenerInstalled) {
        try {
          action.removeEventListener('click', runAction)
          listenerInstalled = false
        } catch {
          cleanupFailure = new Error('Fatal boundary action disposal was incomplete.')
        }
      }

      if (boundaryInstalled) {
        try {
          boundary.remove()
          boundaryInstalled = false
        } catch {
          cleanupFailure ??= new Error('Fatal boundary host disposal was incomplete.')
        }
      }

      if (cleanupFailure !== undefined) {
        throw cleanupFailure
      }

      disposed = true
    },
  }

  try {
    listenerInstalled = true
    action.addEventListener('click', runAction)
    copy.append(title, description)
    content.append(copy, action)
    scene.append(illustration, content)
    boundary.append(scene)
    boundaryInstalled = true
    input.target.replaceChildren(boundary)
  } catch (source: unknown) {
    try {
      handle.dispose()
    } catch {
      // Fatal renderer cleanup is best-effort and cannot create another Core Error record.
    }
    throw source
  }

  return handle
}

export function renderConfigurationFailure(input: {
  readonly target: HTMLElement
  readonly error: NormalizedCoreError<'runtime-configuration-failure'>
  readonly action: ConfigurationFailureAction
}): FatalBoundaryHandle {
  return renderFatalBoundary(input)
}

export function renderStartupFailure(input: {
  readonly target: HTMLElement
  readonly error: NormalizedCoreError<'application-startup-failure'>
  readonly reload: () => void
}): FatalBoundaryHandle {
  return renderFatalBoundary({
    target: input.target,
    error: input.error,
    action: {
      kind: 'reload',
      run: input.reload,
    },
  })
}
