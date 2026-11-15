import type { NormalizedCoreError } from './core-error'
import { getCoreErrorMessage } from './core-error-messages'
import { getCoreErrorRecord } from './core-error-registry'

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
  boundary.className =
    'leading-body font-body-family grid place-items-center h-dvh min-h-0 overflow-hidden px-page-inline py-section-block text-body text-text-primary bg-surface-page'
  boundary.setAttribute('lang', 'zh-CN')
  boundary.setAttribute('dir', 'ltr')
  boundary.setAttribute('role', 'alert')
  boundary.setAttribute('aria-live', 'assertive')

  const panel = document.createElement('section')
  panel.className =
    'mx-auto flex flex-col h-full min-h-0 min-w-0 w-full items-center justify-center gap-content-gap max-w-content'

  const illustration = document.createElement('div')
  illustration.className =
    'flex shrink min-h-0 min-w-0 w-full items-center justify-center overflow-hidden'
  illustration.setAttribute('aria-hidden', 'true')

  const illustrationCard = document.createElement('div')
  illustrationCard.className = 'rounded-panel shadow-panel bg-surface-panel p-panel'
  const illustrationIcon = document.createElement('span')
  illustrationIcon.className =
    'i-lucide-circle-alert size-icon-extra-large text-control-primary block'
  illustrationCard.append(illustrationIcon)
  illustration.append(illustrationCard)

  const content = document.createElement('div')
  content.className =
    'text-center grid shrink-0 min-w-0 w-full justify-items-center gap-content-gap'

  const title = document.createElement('h1')
  title.className = 'leading-title font-title-weight m-0 text-title'
  title.textContent = message.title

  const description = document.createElement('p')
  description.className = 'm-0 text-pretty text-text-secondary'
  description.textContent = message.description

  const action = document.createElement('button')
  action.className =
    'h-control min-h-target-enhanced rounded-control border-0 bg-action-primary px-button-inline text-text-on-action cursor-pointer'
  action.type = 'button'
  action.textContent = actionLabel

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
    content.append(title, description, action)
    panel.append(illustration, content)
    boundary.append(panel)
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
