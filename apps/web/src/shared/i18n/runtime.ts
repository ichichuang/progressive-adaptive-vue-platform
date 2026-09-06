import { computed, nextTick, readonly, shallowRef } from 'vue'
import { createI18n } from 'vue-i18n'

import {
  provideConsoleI18n,
  type ConsoleI18nBoundary,
  type ConsoleI18nHandle,
  type ConsoleI18nInput,
  type ConsoleLocaleNotice,
  type ConsoleLocaleSwitchResult,
} from './boundary'
import { getDefaultConsoleMessage } from './default-messages'
import { consoleLocaleSchema, defaultConsoleLocale, type ConsoleLocale } from './locale-contract'
import {
  messageParameterKinds,
  type ConsoleMessageSchema,
  type ConsoleMessageScope,
  type ConsoleScopeMessages,
  type ConsoleTranslate,
} from './message-schema'

type Messages = ConsoleScopeMessages[ConsoleMessageScope]
type LoadResource = (locale: ConsoleLocale, scope: ConsoleMessageScope) => Promise<Messages>
interface SwitchRequest {
  readonly identity: symbol
  readonly target: ConsoleLocale
  readonly phase: 'preparing' | 'committed'
  readonly cancel: (reason: 'superseded' | 'disposed') => void
}

export function createConsoleI18nRuntime(
  input: ConsoleI18nInput,
  loadResource: LoadResource,
): ConsoleI18nHandle {
  const instance = createI18n<[ConsoleMessageSchema], ConsoleLocale, false>({
    legacy: false,
    globalInjection: false,
    flatJson: true,
    locale: defaultConsoleLocale,
    fallbackLocale: defaultConsoleLocale,
    fallbackFormat: false,
    missingWarn: import.meta.env.DEV,
    fallbackWarn: import.meta.env.DEV,
  })
  const composer = instance.global
  const notice = shallowRef<ConsoleLocaleNotice>('none')
  const request = shallowRef<SwitchRequest | null>(null)
  const scopes = new Set<ConsoleMessageScope>(['common', input.initialScope])
  const cache: Record<ConsoleLocale, Map<ConsoleMessageScope, Messages>> = {
    'zh-CN': new Map(),
    en: new Map(),
  }
  const element = input.document.documentElement
  const previousLang = element.getAttribute('lang')
  const previousDir = element.getAttribute('dir')
  let disposed = false
  const isDisposed = (): boolean => disposed
  let ownsDocument = false
  let cancelReady: (() => void) | undefined
  const cancelled = new Promise<{ readonly status: 'cancelled' }>((resolve) => {
    cancelReady = () => {
      resolve({ status: 'cancelled' })
    }
  })

  const t: ConsoleTranslate = (key, ...args) => {
    // Reading the Composer ref also tracks callers when the safe fallback is used.
    const locale = composer.locale.value
    try {
      const params = args[0]
      const expected = Object.entries(messageParameterKinds).find(([name]) => name === key)?.[1]
      if (
        expected !== undefined &&
        (params === undefined ||
          Object.entries(expected).some(([name, kind]) => {
            const value: unknown = Object.entries(params).find(
              ([parameter]) => parameter === name,
            )?.[1]
            return typeof value !== kind || (typeof value === 'number' && !Number.isFinite(value))
          }))
      )
        throw new TypeError('The translated message parameters are invalid.')

      // Let the official translator produce its development diagnostics first.
      const value = params === undefined ? composer.t(key) : composer.t(key, params)
      if (!composer.te(key, locale) && !composer.te(key, defaultConsoleLocale)) {
        return getDefaultConsoleMessage('i18n.safe-message')
      }
      return value.trim().length === 0 ? getDefaultConsoleMessage('i18n.safe-message') : value
    } catch (source: unknown) {
      if (import.meta.env.DEV) throw source
      return getDefaultConsoleMessage('i18n.safe-message')
    }
  }

  async function prepareResources(
    locale: ConsoleLocale,
    requested: readonly ConsoleMessageScope[],
    eligible: () => boolean,
  ): Promise<boolean> {
    for (const scope of requested) {
      const chinese =
        cache[defaultConsoleLocale].get(scope) ?? (await loadResource(defaultConsoleLocale, scope))
      if (!eligible()) return false
      cache[defaultConsoleLocale].set(scope, chinese)
      if (locale === defaultConsoleLocale) continue
      const translated = cache[locale].get(scope) ?? (await loadResource(locale, scope))
      if (!eligible()) return false
      const chineseKeys = Object.keys(chinese)
      const translatedKeys = Object.keys(translated)
      if (
        chineseKeys.length !== translatedKeys.length ||
        chineseKeys.some((key) => !Object.hasOwn(translated, key))
      ) {
        throw new Error('The language resource coverage is incomplete.')
      }
      cache[locale].set(scope, translated)
    }
    return true
  }

  function registerResources(
    locale: ConsoleLocale,
    requested: readonly ConsoleMessageScope[],
  ): void {
    for (const language of new Set([defaultConsoleLocale, locale])) {
      for (const scope of requested) {
        const messages = cache[language].get(scope)
        if (messages === undefined) throw new Error('The language resource is not ready.')
        composer.mergeLocaleMessage<Messages>(language, { ...messages })
      }
    }
  }

  function commitPresentation(locale: ConsoleLocale): void {
    const previous = composer.locale.value
    const lang = element.getAttribute('lang')
    const dir = element.getAttribute('dir')
    try {
      composer.locale.value = locale
      element.lang = locale
      element.dir = 'ltr'
      input.onLocaleCommitted(t)
      ownsDocument = true
    } catch (source: unknown) {
      composer.locale.value = previous
      if (lang === null) element.removeAttribute('lang')
      else element.setAttribute('lang', lang)
      if (dir === null) element.removeAttribute('dir')
      else element.setAttribute('dir', dir)
      input.onLocaleCommitted(t)
      throw source
    }
  }

  function ownsRequest(operation: SwitchRequest): boolean {
    return !isDisposed() && request.value?.identity === operation.identity
  }

  function switchLocale(candidate: unknown): Promise<ConsoleLocaleSwitchResult> {
    const parsed = consoleLocaleSchema.safeParse(candidate)
    if (isDisposed())
      return Promise.resolve({
        status: 'cancelled',
        locale: composer.locale.value,
        reason: 'disposed',
      })
    if (!parsed.success) {
      if (request.value?.phase !== 'preparing') notice.value = 'unsupported-locale'
      return Promise.resolve({
        status: 'failed',
        locale: composer.locale.value,
        reason: 'unsupported-locale',
      })
    }
    const target = parsed.data
    if (target === composer.locale.value) {
      if (request.value?.phase === 'preparing') {
        request.value.cancel('superseded')
        request.value = null
        notice.value = 'none'
      }
      return Promise.resolve({ status: 'unchanged', locale: target })
    }
    request.value?.cancel('superseded')
    let cancelOperation: (reason: 'superseded' | 'disposed') => void = () => undefined
    const cancellation = new Promise<ConsoleLocaleSwitchResult>((resolve) => {
      cancelOperation = (reason) => {
        resolve({ status: 'cancelled', locale: target, reason })
      }
    })
    const operation: SwitchRequest = {
      identity: Symbol('LocaleSwitch'),
      target,
      phase: 'preparing',
      cancel: cancelOperation,
    }
    request.value = operation
    notice.value = 'loading'

    const completion = (async (): Promise<ConsoleLocaleSwitchResult> => {
      let committing = false
      try {
        let batch: ConsoleMessageScope[]
        do {
          batch = [...scopes]
          if (!(await prepareResources(target, batch, () => ownsRequest(operation)))) {
            return {
              status: 'cancelled',
              locale: target,
              reason: isDisposed() ? 'disposed' : 'superseded',
            }
          }
        } while (batch.length !== scopes.size)
        if (!ownsRequest(operation))
          return {
            status: 'cancelled',
            locale: target,
            reason: isDisposed() ? 'disposed' : 'superseded',
          }
        committing = true
        registerResources(target, batch)
        commitPresentation(target)
        request.value = { ...operation, phase: 'committed' }
        let persistence: 'saved' | 'failed' = 'failed'
        try {
          persistence = input.preference.write(target).status
        } catch {
          /* A port failure must not undo the applied presentation. */
        }
        notice.value = persistence === 'saved' ? 'applied' : 'not-saved'
        const result = { status: 'applied', locale: target, persistence } as const
        await nextTick()
        if (!ownsRequest(operation))
          return {
            status: 'cancelled',
            locale: target,
            reason: isDisposed() ? 'disposed' : 'superseded',
          }
        request.value = null
        return result
      } catch {
        if (!ownsRequest(operation))
          return {
            status: 'cancelled',
            locale: target,
            reason: isDisposed() ? 'disposed' : 'superseded',
          }
        const reason = committing ? 'commit-failed' : 'message-load-failed'
        request.value = null
        notice.value = reason
        return { status: 'failed', locale: composer.locale.value, reason }
      }
    })()
    return Promise.race([cancellation, completion])
  }

  async function prepareScope(
    scope: ConsoleMessageScope,
  ): Promise<{ readonly status: 'ready' | 'failed' | 'cancelled' }> {
    if (isDisposed()) return { status: 'cancelled' }
    scopes.add(scope)
    const preparation = (async () => {
      try {
        while (!isDisposed()) {
          const locale = composer.locale.value
          if (!(await prepareResources(locale, [scope], () => !isDisposed())))
            return { status: 'cancelled' } as const
          if (locale !== composer.locale.value) continue
          registerResources(locale, [scope])
          return { status: 'ready' } as const
        }
      } catch {
        return { status: isDisposed() ? 'cancelled' : 'failed' } as const
      }
      return { status: 'cancelled' } as const
    })()
    return Promise.race([cancelled, preparation])
  }

  const boundary: ConsoleI18nBoundary = Object.freeze({
    locale: readonly(composer.locale),
    pendingLocale: computed(() =>
      request.value?.phase === 'preparing' ? request.value.target : null,
    ),
    notice: readonly(notice),
    t,
    switchLocale,
    prepareScope,
  })

  const ready = Promise.race([
    cancelled,
    (async () => {
      const preference = input.preference.read()
      const initial = [...scopes]
      if (!(await prepareResources(defaultConsoleLocale, initial, () => !isDisposed())))
        return { status: 'cancelled' } as const
      let locale = defaultConsoleLocale
      if (preference.status === 'found' && preference.locale !== defaultConsoleLocale) {
        try {
          if (!(await prepareResources(preference.locale, initial, () => !isDisposed())))
            return { status: 'cancelled' } as const
          locale = preference.locale
        } catch {
          notice.value = 'saved-choice-unavailable'
        }
      } else if (preference.status === 'unusable') notice.value = 'preference-unavailable'
      if (isDisposed()) return { status: 'cancelled' } as const
      registerResources(locale, initial)
      // Vue's unmount and the Kernel share one effective official scope cleanup.
      const disposeInstance = instance.dispose.bind(instance)
      let released = false
      instance.dispose = () => {
        if (!released) {
          released = true
          disposeInstance()
        }
      }
      // The public void declaration does not expose this version's async installation result.
      // Preserve that result as unknown and let Promise.resolve observe completion/failure.
      const install: (application: ConsoleI18nInput['application']) => unknown =
        instance.install.bind(instance)
      await Promise.resolve(install(input.application))
      if (isDisposed()) {
        instance.dispose()
        return { status: 'cancelled' } as const
      }
      commitPresentation(locale)
      provideConsoleI18n(input.application, boundary)
      return { status: 'ready', boundary } as const
    })(),
  ])

  return {
    ready,
    dispose() {
      if (isDisposed()) return
      disposed = true
      cancelReady?.()
      request.value?.cancel('disposed')
      request.value = null
      notice.value = 'none'
      cache['zh-CN'].clear()
      cache.en.clear()
      instance.dispose()
      if (ownsDocument) {
        if (previousLang === null) element.removeAttribute('lang')
        else element.setAttribute('lang', previousLang)
        if (previousDir === null) element.removeAttribute('dir')
        else element.setAttribute('dir', previousDir)
      }
    },
  }
}
