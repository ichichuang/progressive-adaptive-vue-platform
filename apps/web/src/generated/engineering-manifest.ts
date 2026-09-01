/* Generated file. Do not edit directly. */
export interface EngineeringCoordinates {
  readonly node: 'node@24.15.0'
  readonly pnpm: 'pnpm@10.34.5'
  readonly typescript: 'typescript@6.0.3'
  readonly vue: 'vue@3.5.40'
  readonly vite: 'vite@8.1.5'
}

export interface EngineeringBundleBudgetRecord {
  readonly id: string
  readonly limit: number
  readonly unit: 'bytes-gzip'
}

export interface EngineeringManifest {
  readonly schemaVersion: 1
  readonly coordinates: EngineeringCoordinates
  readonly verifyStageIds: readonly string[]
  readonly bundleBudgets: readonly EngineeringBundleBudgetRecord[]
  readonly workflowNames: readonly string[]
}

export const engineeringManifest = {
  schemaVersion: 1,
  coordinates: {
    node: 'node@24.15.0',
    pnpm: 'pnpm@10.34.5',
    typescript: 'typescript@6.0.3',
    vue: 'vue@3.5.40',
    vite: 'vite@8.1.5',
  },
  verifyStageIds: [
    'runtime-preflight',
    'format-check',
    'lint',
    'lint-css',
    'lint-uno',
    'typecheck-vue',
    'typecheck-ts',
    'check-arch',
    'schema-check',
    'tokens-check',
    'check-policy',
    'check-unused',
    'build',
    'check-bundle',
  ],
  bundleBudgets: [
    { id: 'generated-token-manifest-gzip', limit: 32768, unit: 'bytes-gzip' },
    { id: 'initial-css-gzip', limit: 40960, unit: 'bytes-gzip' },
    { id: 'initial-javascript-gzip', limit: 229376, unit: 'bytes-gzip' },
    { id: 'lazy-route-javascript-gzip', limit: 122880, unit: 'bytes-gzip' },
  ],
  workflowNames: ['CodeQL', 'Static Verification'],
} as const satisfies EngineeringManifest
