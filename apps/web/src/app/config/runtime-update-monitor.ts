import { applicationConfig } from './app.config'
import { coreRuntimeConfigurationSchema } from './runtime-configuration-contract'
import {
  compiledBuildIdentity,
  readRuntimeConfigurationSource,
  isRuntimeConfigurationUrlAllowed,
  type CompiledBuildIdentity,
  type RuntimeConfigurationLoadInput,
} from './runtime-configuration'

/** Read-only deployment probe. Startup identity checks remain unchanged. */
export async function probeRuntimeConfigurationUpdate(
  input: RuntimeConfigurationLoadInput,
): Promise<CompiledBuildIdentity | null> {
  try {
    input.signal.throwIfAborted()
    const source = readRuntimeConfigurationSource(input.document)
    if (!source) return null
    const url = new URL(source, input.document.baseURI)
    if (
      !isRuntimeConfigurationUrlAllowed(url, input.location) ||
      new URL(input.document.baseURI).origin !== input.location.origin
    )
      return null
    const response = await input.fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      signal: input.signal,
    })
    if (!response.ok) return null
    const parsed = coreRuntimeConfigurationSchema.safeParse(await response.json())
    input.signal.throwIfAborted()
    if (
      !parsed.success ||
      parsed.data.environment !== compiledBuildIdentity.environment ||
      parsed.data.deploymentBase !== import.meta.env.BASE_URL
    )
      return null
    return Object.freeze({
      environment: parsed.data.environment,
      releaseSha: parsed.data.releaseSha,
      buildVersion: parsed.data.buildVersion,
    })
  } catch {
    return null
  }
}

export function createRuntimeUpdateMonitor(input: {
  readonly document: Document
  readonly window: Window
  readonly fetch?: typeof globalThis.fetch
  readonly onStatus?: (status: 'checking' | 'current' | 'available' | 'unavailable') => void
  readonly onCandidate: (identity: CompiledBuildIdentity | null) => void
}) {
  let disposed = false
  let active: AbortController | undefined
  let pending: Promise<void> | undefined
  let lastCheck = -Infinity
  let generation = 0
  let dismissed = ''
  let candidate: CompiledBuildIdentity | null = null
  const key = (identity: CompiledBuildIdentity) => `${identity.releaseSha}:${identity.buildVersion}`
  function check(automatic = false): Promise<void> {
    if (disposed) return Promise.resolve()
    if (!automatic) dismissed = ''
    if (pending) return pending
    if (
      input.document.visibilityState !== 'visible' ||
      (automatic && Date.now() - lastCheck < applicationConfig.updates.minimumCheckIntervalMs)
    )
      return Promise.resolve()
    input.onStatus?.('checking')
    lastCheck = Date.now()
    const revision = ++generation
    const controller = new AbortController()
    active = controller
    const timeout = input.window.setTimeout(() => {
      controller.abort()
    }, applicationConfig.updates.timeoutMs)
    pending = (async () => {
      const next = await probeRuntimeConfigurationUpdate({
        document: input.document,
        location: input.window.location,
        fetch: input.fetch ?? globalThis.fetch.bind(globalThis),
        signal: controller.signal,
      })
      if (revision !== generation) return
      if (controller.signal.aborted || !next) {
        input.onStatus?.('unavailable')
        return
      }
      candidate = key(next) !== key(compiledBuildIdentity) && key(next) !== dismissed ? next : null
      input.onCandidate(candidate)
      input.onStatus?.(key(next) === key(compiledBuildIdentity) ? 'current' : 'available')
    })().finally(() => {
      input.window.clearTimeout(timeout)
      if (active === controller) active = undefined
      pending = undefined
    })
    return pending
  }
  const wake = () => {
    void check(true)
  }
  const production = compiledBuildIdentity.environment === 'production'
  const timer = production
    ? input.window.setInterval(wake, applicationConfig.updates.pollIntervalMs)
    : undefined
  if (production) {
    input.window.addEventListener('focus', wake)
    input.document.addEventListener('visibilitychange', wake)
    wake()
  }
  return {
    check: () => check(),
    dismiss() {
      if (disposed) return
      if (candidate) dismissed = key(candidate)
      candidate = null
      input.onCandidate(null)
    },
    dispose() {
      if (disposed) return
      disposed = true
      generation++
      active?.abort()
      if (timer !== undefined) input.window.clearInterval(timer)
      input.window.removeEventListener('focus', wake)
      input.document.removeEventListener('visibilitychange', wake)
    },
  }
}
