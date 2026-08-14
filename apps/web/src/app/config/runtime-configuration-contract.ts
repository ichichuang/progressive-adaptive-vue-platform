import { z } from 'zod'

export const compiledEnvironmentValues = Object.freeze([
  'development',
  'staging',
  'production',
] as const)

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

export const coreRuntimeConfigurationSchema = z.strictObject({
  schemaVersion: z.literal(1),
  environment: z.enum(compiledEnvironmentValues),
  deploymentBase: z.literal('/'),
  releaseSha: z.string().regex(/^[0-9a-f]{40}$/u),
  buildVersion: z.string().regex(/^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/u),
})

export type CoreRuntimeConfiguration = Readonly<z.infer<typeof coreRuntimeConfigurationSchema>>
