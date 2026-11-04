export const apiQueryPolicies = Object.freeze({
  'manual-read': Object.freeze({
    staleTime: 0,
    gcTime: 300_000,
    networkMode: 'always',
    retry: false,
    retryOnMount: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    throwOnError: false,
  }),
})
