import type { ConsoleCommonMessageKey, ConsoleTranslate } from '../../shared/i18n/message-schema'
import { getDefaultConsoleMessage } from '../../shared/i18n/default-messages'
import type { CoreErrorMessageKey } from './core-error-registry'

interface CoreErrorMessage {
  readonly title: string
  readonly description: string
  readonly retryActionLabel: string | null
  readonly reloadActionLabel: string | null
}

export function getCoreErrorMessage(
  messageKey: CoreErrorMessageKey,
  translate?: ConsoleTranslate,
): CoreErrorMessage {
  const read = (key: ConsoleCommonMessageKey): string => {
    try {
      return translate?.(key) ?? getDefaultConsoleMessage(key)
    } catch {
      return getDefaultConsoleMessage(key)
    }
  }
  const coreErrorMessageTable = Object.freeze({
    'core-error.runtime-configuration-failure': Object.freeze({
      title: read('core-error.runtime-configuration-failure.title'),
      description: read('core-error.runtime-configuration-failure.description'),
      retryActionLabel: read('core-error.runtime-configuration-failure.retryActionLabel'),
      reloadActionLabel: read('core-error.runtime-configuration-failure.reloadActionLabel'),
    }),
    'core-error.application-startup-failure': Object.freeze({
      title: read('core-error.application-startup-failure.title'),
      description: read('core-error.application-startup-failure.description'),
      retryActionLabel: null,
      reloadActionLabel: read('core-error.application-startup-failure.reloadActionLabel'),
    }),
    'core-error.vue-component-failure': Object.freeze({
      title: read('core-error.vue-component-failure.title'),
      description: read('core-error.vue-component-failure.description'),
      retryActionLabel: null,
      reloadActionLabel: null,
    }),
    'core-error.unhandled-promise-rejection': Object.freeze({
      title: read('core-error.unhandled-promise-rejection.title'),
      description: read('core-error.unhandled-promise-rejection.description'),
      retryActionLabel: null,
      reloadActionLabel: null,
    }),
  } as const satisfies Readonly<Record<CoreErrorMessageKey, CoreErrorMessage>>)

  return coreErrorMessageTable[messageKey]
}
