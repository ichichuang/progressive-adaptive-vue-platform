import { z } from 'zod'
import { explicitThemePreferenceSchema, ProductPreferenceDefault } from '@platform/design-system'
import { consoleLocaleSchema, defaultConsoleLocale } from '../../shared/i18n/locale-contract'

import { apiConfigurationSchema } from '../../shared/api/configuration'

export const compiledEnvironmentValues = Object.freeze(['development', 'production'] as const)

export type CompiledEnvironment = (typeof compiledEnvironmentValues)[number]

export const runtimeConfigurationFailureCauses = Object.freeze([
  'configuration-source-missing',
  'configuration-network-failure',
  'configuration-malformed-json',
  'configuration-schema-rejected',
  'configuration-environment-mismatch',
  'configuration-release-mismatch',
  'configuration-build-mismatch',
  'configuration-base-mismatch',
  'configuration-origin-prohibited',
  'configuration-document-mismatch',
  'configuration-first-paint-mismatch',
] as const)

export type RuntimeConfigurationFailureCause = (typeof runtimeConfigurationFailureCauses)[number]

const publicAssetUrlSchema = z.string().refine((value) => {
  if (value.startsWith('/') && !value.startsWith('//')) return !/[\\\s]/u.test(value)
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.username === '' && url.password === ''
  } catch {
    return false
  }
}, 'Use a root-relative path or an HTTPS URL without credentials.')

const runtimePresentationSchema = z.strictObject({
  name: z.string().trim().min(1).max(100).nullable(),
  favicon: publicAssetUrlSchema,
  logo: publicAssetUrlSchema.nullable(),
  locale: consoleLocaleSchema,
  appearance: explicitThemePreferenceSchema.shape.appearance.refine(
    (value) => value.theme.registryKind === 'built-in',
    'Deployment defaults must use a bundled built-in theme.',
  ),
})
export const defaultRuntimePresentation = runtimePresentationSchema.parse({
  name: null,
  favicon: '/favicon.svg',
  logo: null,
  locale: defaultConsoleLocale,
  appearance: ProductPreferenceDefault,
})
export type RuntimePresentation = Readonly<z.infer<typeof runtimePresentationSchema>>

export const coreRuntimeConfigurationSchema = z
  .strictObject({
    schemaVersion: z.literal(2),
    environment: z.enum(compiledEnvironmentValues),
    deploymentBase: z.literal('/'),
    releaseSha: z.string().regex(/^[0-9a-f]{40}$/u),
    buildVersion: z.string().regex(/^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/u),
    api: apiConfigurationSchema,
    presentation: runtimePresentationSchema.optional(),
  })
  .refine(
    (value) =>
      value.environment === 'development' ||
      value.api.status !== 'configured' ||
      value.api.upstreamOrigin === undefined,
  )

export type CoreRuntimeConfiguration = Readonly<z.infer<typeof coreRuntimeConfigurationSchema>>
