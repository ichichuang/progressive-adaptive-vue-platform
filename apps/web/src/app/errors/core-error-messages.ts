import type { CoreErrorMessageKey } from './core-error-registry'

interface CoreErrorMessage {
  readonly title: string
  readonly description: string
  readonly retryActionLabel: string | null
  readonly reloadActionLabel: string | null
}

const coreErrorMessageTable = Object.freeze({
  'core-error.runtime-configuration-failure': Object.freeze({
    title: 'Application configuration unavailable',
    description: 'The application could not verify the configuration required to start safely.',
    retryActionLabel: 'Try again',
    reloadActionLabel: 'Reload application',
  }),
  'core-error.application-startup-failure': Object.freeze({
    title: 'Application unavailable',
    description: 'The application could not start safely.',
    retryActionLabel: null,
    reloadActionLabel: 'Reload application',
  }),
  'core-error.vue-component-failure': Object.freeze({
    title: 'Content unavailable',
    description: 'This content could not continue safely.',
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
  'core-error.unhandled-promise-rejection': Object.freeze({
    title: 'Operation unavailable',
    description: 'An unexpected operation could not continue safely.',
    retryActionLabel: null,
    reloadActionLabel: null,
  }),
} as const satisfies Readonly<Record<CoreErrorMessageKey, CoreErrorMessage>>)

export function getCoreErrorMessage(messageKey: CoreErrorMessageKey): CoreErrorMessage {
  return coreErrorMessageTable[messageKey]
}
