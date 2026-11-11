export interface ApiRequestPolicy {
  readonly timeoutMilliseconds: number
  readonly maximumResponseBytes: number
}

export interface ApiStreamPolicy extends ApiRequestPolicy {
  readonly idleTimeoutMilliseconds: number
  readonly maximumEventBytes: number
}

export const apiRequestPolicies = Object.freeze({
  standard: Object.freeze({ timeoutMilliseconds: 10_000, maximumResponseBytes: 1024 * 1024 }),
  stream: Object.freeze({
    timeoutMilliseconds: 120_000,
    idleTimeoutMilliseconds: 30_000,
    maximumResponseBytes: 16 * 1024 * 1024,
    maximumEventBytes: 1024 * 1024,
  }),
})

export type ApiRequestPolicyId = keyof typeof apiRequestPolicies
export interface ApiPolicyOverrides {
  readonly standard?: Partial<ApiRequestPolicy>
  readonly stream?: Partial<ApiStreamPolicy>
}

export function resolveApiPolicies(
  overrides: ApiPolicyOverrides = {},
): { readonly standard: ApiRequestPolicy; readonly stream: ApiStreamPolicy } | undefined {
  const standard = { ...apiRequestPolicies.standard, ...overrides.standard }
  const stream = { ...apiRequestPolicies.stream, ...overrides.stream }
  for (const policy of [standard, stream]) {
    if (
      Object.entries(policy).some(
        ([key, value]) =>
          !Number.isSafeInteger(value) ||
          value <= 0 ||
          (key.endsWith('Milliseconds') && value > 2_147_483_647),
      )
    )
      return undefined
  }
  return Object.freeze({ standard: Object.freeze(standard), stream: Object.freeze(stream) })
}
