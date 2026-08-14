import {
  coreRuntimeConfigurationSchema,
  type CoreRuntimeConfiguration,
  type RuntimeConfigurationFailureCause,
} from './runtime-configuration-contract'

export interface CompiledBuildIdentity {
  readonly environment: CoreRuntimeConfiguration['environment']
  readonly releaseSha: string
  readonly buildVersion: string
}

export const compiledBuildIdentity: CompiledBuildIdentity = Object.freeze({
  environment: __PAVP_COMPILED_ENVIRONMENT__,
  releaseSha: __PAVP_COMPILED_RELEASE_SHA__,
  buildVersion: __PAVP_COMPILED_BUILD_VERSION__,
})

interface RuntimeConfigurationFailure {
  readonly status: 'failure'
  readonly cause: RuntimeConfigurationFailureCause
}

interface RuntimeConfigurationCancelled {
  readonly status: 'cancelled'
}

interface RuntimeConfigurationSuccess {
  readonly status: 'success'
  readonly configuration: CoreRuntimeConfiguration
  readonly appearanceInitializerScript: HTMLScriptElement
}

type RuntimeConfigurationLoadResult =
  RuntimeConfigurationCancelled | RuntimeConfigurationFailure | RuntimeConfigurationSuccess

export interface RuntimeConfigurationLoadInput {
  readonly document: Document
  readonly location: Location
  readonly fetch: typeof globalThis.fetch
  readonly signal: AbortSignal
}

export interface RuntimeConfigurationLoadHandle {
  readonly result: Promise<RuntimeConfigurationLoadResult>
  abort(): void
  dispose(): void
}

const runtimeConfigurationPath = '/runtime-configuration.json'
const criticalThemePath = '/generated/critical-theme.css'
const appearanceInitializerPath = '/generated/appearance-init.js'

function failure(cause: RuntimeConfigurationFailureCause): RuntimeConfigurationFailure {
  return Object.freeze({
    status: 'failure',
    cause,
  })
}

function cancelled(): RuntimeConfigurationCancelled {
  return Object.freeze({ status: 'cancelled' })
}

function applyCancellationPrecedence(
  signal: AbortSignal,
  result: RuntimeConfigurationFailure | RuntimeConfigurationSuccess,
): RuntimeConfigurationLoadResult {
  return signal.aborted ? cancelled() : result
}

function immutableConfiguration(configuration: CoreRuntimeConfiguration): CoreRuntimeConfiguration {
  return Object.freeze({
    schemaVersion: configuration.schemaVersion,
    environment: configuration.environment,
    deploymentBase: configuration.deploymentBase,
    releaseSha: configuration.releaseSha,
    buildVersion: configuration.buildVersion,
  })
}

function readRuntimeConfigurationSource(documentReference: Document): string | undefined {
  const attributedElements = documentReference.querySelectorAll('[data-runtime-configuration-url]')

  if (attributedElements.length !== 1) {
    return undefined
  }

  const carrier = attributedElements.item(0)

  if (!carrier.matches('script[type="module"][src]')) {
    return undefined
  }

  const attributeValue = carrier.getAttribute('data-runtime-configuration-url')

  if (attributeValue === null || attributeValue.length === 0) {
    return undefined
  }

  return attributeValue
}

function isRuntimeConfigurationUrlAllowed(url: URL, locationReference: Location): boolean {
  if (
    url.username.length !== 0 ||
    url.password.length !== 0 ||
    url.search.length !== 0 ||
    url.hash.length !== 0
  ) {
    return false
  }

  if (url.origin !== locationReference.origin) {
    return false
  }

  if (url.pathname !== runtimeConfigurationPath) {
    return false
  }

  return (
    url.protocol === 'https:' ||
    (compiledBuildIdentity.environment === 'development' && url.protocol === 'http:')
  )
}

function resolveExactAssetPath(
  attributeValue: string | null,
  documentBase: string,
  locationOrigin: string,
  expectedPath: string,
): boolean {
  if (attributeValue === null || attributeValue.length === 0) {
    return false
  }

  let resolvedUrl: URL

  try {
    resolvedUrl = new URL(attributeValue, documentBase)
  } catch {
    return false
  }

  return (
    resolvedUrl.username.length === 0 &&
    resolvedUrl.password.length === 0 &&
    resolvedUrl.search.length === 0 &&
    resolvedUrl.hash.length === 0 &&
    resolvedUrl.origin === locationOrigin &&
    resolvedUrl.pathname === expectedPath
  )
}

function validatedAppearanceInitializerScript(
  documentReference: Document,
  locationReference: Location,
): HTMLScriptElement | undefined {
  const criticalThemeLinks = documentReference.querySelectorAll<HTMLLinkElement>(
    'link[rel="stylesheet"][media="all"]',
  )
  const appearanceInitializerScripts = documentReference.querySelectorAll<HTMLScriptElement>(
    'script[data-preference-storage-key]',
  )

  if (criticalThemeLinks.length !== 1 || appearanceInitializerScripts.length !== 1) {
    return undefined
  }

  const appearanceInitializerScript = appearanceInitializerScripts.item(0)

  if (
    !resolveExactAssetPath(
      criticalThemeLinks.item(0).getAttribute('href'),
      documentReference.baseURI,
      locationReference.origin,
      criticalThemePath,
    ) ||
    !resolveExactAssetPath(
      appearanceInitializerScript.getAttribute('src'),
      documentReference.baseURI,
      locationReference.origin,
      appearanceInitializerPath,
    )
  ) {
    return undefined
  }

  return appearanceInitializerScript
}

async function executeRuntimeConfigurationLoad(
  input: RuntimeConfigurationLoadInput,
  signal: AbortSignal,
): Promise<RuntimeConfigurationLoadResult> {
  if (signal.aborted) {
    return cancelled()
  }

  const attributeValue = readRuntimeConfigurationSource(input.document)

  if (attributeValue === undefined) {
    return applyCancellationPrecedence(signal, failure('configuration-source-missing'))
  }

  let configurationUrl: URL

  try {
    configurationUrl = new URL(attributeValue, input.document.baseURI)
  } catch {
    return applyCancellationPrecedence(signal, failure('configuration-origin-prohibited'))
  }

  if (!isRuntimeConfigurationUrlAllowed(configurationUrl, input.location)) {
    return applyCancellationPrecedence(signal, failure('configuration-origin-prohibited'))
  }

  const fetchBoundary = input.fetch
  let response: Response

  try {
    response = await fetchBoundary(configurationUrl, {
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      signal,
    })
  } catch {
    return applyCancellationPrecedence(signal, failure('configuration-network-failure'))
  }

  if (!response.ok) {
    return applyCancellationPrecedence(signal, failure('configuration-network-failure'))
  }

  let responseBody: string

  try {
    responseBody = await response.text()
  } catch {
    return applyCancellationPrecedence(signal, failure('configuration-network-failure'))
  }

  let untrustedConfiguration: unknown

  try {
    untrustedConfiguration = JSON.parse(responseBody) as unknown
  } catch {
    return applyCancellationPrecedence(signal, failure('configuration-malformed-json'))
  }

  const parsedConfiguration = coreRuntimeConfigurationSchema.safeParse(untrustedConfiguration)

  if (!parsedConfiguration.success) {
    return applyCancellationPrecedence(signal, failure('configuration-schema-rejected'))
  }

  if (parsedConfiguration.data.environment !== compiledBuildIdentity.environment) {
    return applyCancellationPrecedence(signal, failure('configuration-environment-mismatch'))
  }

  if (parsedConfiguration.data.releaseSha !== compiledBuildIdentity.releaseSha) {
    return applyCancellationPrecedence(signal, failure('configuration-release-mismatch'))
  }

  if (parsedConfiguration.data.buildVersion !== compiledBuildIdentity.buildVersion) {
    return applyCancellationPrecedence(signal, failure('configuration-build-mismatch'))
  }

  if (parsedConfiguration.data.deploymentBase !== import.meta.env.BASE_URL) {
    return applyCancellationPrecedence(signal, failure('configuration-base-mismatch'))
  }

  let documentBaseUrl: URL

  try {
    documentBaseUrl = new URL(input.document.baseURI)
  } catch {
    return applyCancellationPrecedence(signal, failure('configuration-document-mismatch'))
  }

  if (documentBaseUrl.origin !== input.location.origin) {
    return applyCancellationPrecedence(signal, failure('configuration-document-mismatch'))
  }

  const appearanceInitializerScript = validatedAppearanceInitializerScript(
    input.document,
    input.location,
  )

  if (appearanceInitializerScript === undefined) {
    return applyCancellationPrecedence(signal, failure('configuration-first-paint-mismatch'))
  }

  return applyCancellationPrecedence(
    signal,
    Object.freeze({
      status: 'success',
      configuration: immutableConfiguration(parsedConfiguration.data),
      appearanceInitializerScript,
    }),
  )
}

export function loadRuntimeConfiguration(
  input: RuntimeConfigurationLoadInput,
): RuntimeConfigurationLoadHandle {
  const loadAbortController = new AbortController()
  const abortFromOwner = (): void => {
    loadAbortController.abort()
  }

  if (input.signal.aborted) {
    abortFromOwner()
  } else {
    input.signal.addEventListener('abort', abortFromOwner, { once: true })
  }

  let ownerAbortListenerActive = !input.signal.aborted
  let loadAbortComplete = loadAbortController.signal.aborted
  let disposed = false
  const removeOwnerAbortListener = (): boolean => {
    if (!ownerAbortListenerActive) {
      return true
    }

    try {
      input.signal.removeEventListener('abort', abortFromOwner)
      ownerAbortListenerActive = false
      return true
    } catch {
      return false
    }
  }
  const abortLoad = (): boolean => {
    if (loadAbortComplete) {
      return true
    }

    try {
      loadAbortController.abort()
      loadAbortComplete = true
      return true
    } catch {
      if (loadAbortController.signal.aborted) {
        loadAbortComplete = true
        return true
      }

      return false
    }
  }
  const result = executeRuntimeConfigurationLoad(input, loadAbortController.signal).finally(() => {
    removeOwnerAbortListener()
  })

  return {
    result,
    abort() {
      if (!abortLoad()) {
        throw new Error('Runtime Configuration load abort was incomplete.')
      }
    },
    dispose() {
      if (disposed) {
        return
      }

      const ownerAbortListenerRemoved = removeOwnerAbortListener()
      const loadAborted = abortLoad()

      if (!ownerAbortListenerRemoved || !loadAborted) {
        throw new Error('Runtime Configuration load disposal was incomplete.')
      }

      disposed = true
    },
  }
}
