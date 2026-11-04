export const apiRequestPolicies = Object.freeze({
  standard: Object.freeze({ timeoutMilliseconds: 10_000, maximumResponseBytes: 1024 * 1024 }),
})

export type ApiRequestPolicyId = keyof typeof apiRequestPolicies
