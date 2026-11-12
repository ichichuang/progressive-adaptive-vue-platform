import { randomUUID } from 'node:crypto'
import { open, readFile, rename, rm, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseEnv } from 'node:util'

import {
  coreRuntimeConfigurationSchema,
  type CoreRuntimeConfiguration,
} from './src/app/config/runtime-configuration-contract'
import {
  apiConfigurationSchema,
  apiProxyPrefixSchema,
  httpsApiBaseUrlSchema,
  type ApiConfiguration,
} from './src/shared/api/configuration'

export const rootDeploymentBase = coreRuntimeConfigurationSchema.shape.deploymentBase.value

export interface DeploymentConfig {
  readonly deploymentBase: CoreRuntimeConfiguration['deploymentBase']
  readonly api: ApiConfiguration
  readonly developmentProxy?: { readonly prefix: string; readonly target: string }
}

export function parseDeploymentConfig(
  source: string,
  override: unknown,
  apiOverride?: unknown,
  proxyPrefixOverride?: unknown,
): Omit<DeploymentConfig, 'developmentProxy'> & { readonly proxyPrefix?: string } {
  const assignments = source.split(/\r?\n/u).filter((line) => !/^\s*(?:#.*)?$/u.test(line))
  if (
    assignments.length === 0 ||
    assignments.some(
      (line) =>
        !/^[ \t]*(?:export[ \t]+)?PAVP_(?:DEPLOYMENT_BASE|API_BASE_URL|DEV_PROXY_PREFIX)[ \t]*=[ \t]*(?:[^'"\r\n#]*|'[^'\r\n]*'|"[^"\r\n]*")[ \t]*(?:#.*)?$/u.test(
          line,
        ),
    )
  ) {
    throw new Error('The deployment environment file must declare only admitted public fields.')
  }
  const values = parseEnv(source)
  const keys = Object.keys(values)
  if (
    keys.length !== assignments.length ||
    !keys.includes('PAVP_DEPLOYMENT_BASE') ||
    keys.some(
      (key) =>
        !['PAVP_DEPLOYMENT_BASE', 'PAVP_API_BASE_URL', 'PAVP_DEV_PROXY_PREFIX'].includes(key),
    )
  ) {
    throw new Error(
      'The deployment environment file contains missing, duplicate or unadmitted fields.',
    )
  }
  const parsed = coreRuntimeConfigurationSchema.shape.deploymentBase.safeParse(
    override === undefined ? values['PAVP_DEPLOYMENT_BASE'] : override,
  )
  if (!parsed.success) throw new Error('The public deployment configuration is invalid.')
  const apiBaseUrl = apiOverride === undefined ? values['PAVP_API_BASE_URL'] : apiOverride
  const api = apiConfigurationSchema.safeParse(
    apiBaseUrl === undefined
      ? { status: 'unconfigured' }
      : { status: 'configured', baseUrl: apiBaseUrl },
  )
  if (!api.success) throw new Error('The public API configuration is invalid.')
  const prefixValue =
    proxyPrefixOverride === undefined ? values['PAVP_DEV_PROXY_PREFIX'] : proxyPrefixOverride
  if (prefixValue !== undefined) {
    const prefix = apiProxyPrefixSchema.safeParse(prefixValue)
    if (!prefix.success) throw new Error('The development API proxy configuration is invalid.')
    return Object.freeze({
      deploymentBase: parsed.data,
      api: Object.freeze(api.data),
      proxyPrefix: prefix.data,
    })
  }
  return Object.freeze({ deploymentBase: parsed.data, api: Object.freeze(api.data) })
}

export async function readDeploymentConfig(
  mode: unknown,
  developmentServer = false,
): Promise<DeploymentConfig> {
  const environment = coreRuntimeConfigurationSchema.shape.environment.safeParse(mode)
  if (!environment.success) throw new Error('The deployment environment is unsupported.')
  let source: string
  try {
    source = await readFile(new URL(`./.env.${environment.data}`, import.meta.url), 'utf8')
  } catch {
    throw new Error('The selected deployment environment file could not be read.')
  }
  const deployment = parseDeploymentConfig(
    source,
    process.env['PAVP_DEPLOYMENT_BASE'],
    process.env['PAVP_API_BASE_URL'],
    process.env['PAVP_DEV_PROXY_PREFIX'],
  )
  if (environment.data === 'production' && deployment.proxyPrefix !== undefined)
    throw new Error('Development proxy settings are not production inputs.')
  const proxy =
    environment.data === 'development' &&
    developmentServer &&
    deployment.proxyPrefix !== undefined &&
    deployment.api.status === 'configured' &&
    httpsApiBaseUrlSchema.safeParse(deployment.api.baseUrl).success
      ? Object.freeze({ prefix: deployment.proxyPrefix, target: deployment.api.baseUrl })
      : undefined
  return Object.freeze({
    deploymentBase: deployment.deploymentBase,
    api:
      proxy === undefined
        ? deployment.api
        : Object.freeze({
            status: 'configured',
            baseUrl: proxy.prefix,
            upstreamOrigin: new URL(proxy.target).origin,
          } as const),
    ...(proxy === undefined ? {} : { developmentProxy: proxy }),
  })
}

export async function validateRuntimeConfigurationArtifact(
  artifactDirectory: string,
): Promise<CoreRuntimeConfiguration> {
  const target = resolve(artifactDirectory, 'runtime-configuration.json')
  let raw: unknown
  try {
    raw = JSON.parse(await readFile(target, 'utf8')) as unknown
  } catch {
    throw new Error('The existing runtime configuration artifact could not be read.')
  }
  const artifact = coreRuntimeConfigurationSchema.safeParse(raw)
  if (!artifact.success)
    throw new Error(
      `Invalid runtime configuration: ${artifact.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`,
    )
  return artifact.data
}

export async function generateRuntimeConfiguration(
  artifactDirectory: string,
): Promise<CoreRuntimeConfiguration> {
  const target = resolve(artifactDirectory, 'runtime-configuration.json')
  const artifact = await validateRuntimeConfigurationArtifact(artifactDirectory)
  const deployment = await readDeploymentConfig(artifact.environment)
  const result = coreRuntimeConfigurationSchema.parse({ ...artifact, api: deployment.api })
  const temporary = resolve(artifactDirectory, `.runtime-configuration-${randomUUID()}.json`)
  const handle = await open(temporary, 'wx', (await stat(target)).mode & 0o777)
  try {
    try {
      await handle.writeFile(`${JSON.stringify(result, null, 2)}\n`, 'utf8')
    } finally {
      await handle.close()
    }
    await rename(temporary, target)
  } finally {
    await rm(temporary, { force: true })
  }
  return Object.freeze({ ...result, api: Object.freeze(result.api) })
}

if (
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const checkOnly = process.argv[2] === '--check'
  const arguments_ = process.argv.slice(checkOnly ? 3 : 2)
  try {
    if (
      arguments_.length !== 0 &&
      (arguments_.length !== 2 || arguments_[0] !== '--artifact-dir' || !arguments_[1])
    )
      throw new Error('Use --artifact-dir with one existing build directory.')
    const directory = arguments_[1] ?? resolve(import.meta.dirname, 'dist')
    if (checkOnly) {
      await validateRuntimeConfigurationArtifact(directory)
      console.log('Runtime configuration is valid; artifact unchanged.')
    } else {
      await generateRuntimeConfiguration(directory)
      console.log('Runtime API configuration generated; build identity and presentation preserved.')
    }
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : 'Runtime configuration validation failed.',
    )
    process.exitCode = 1
  }
}
