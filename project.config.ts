export const projectConfig = {
  identity: {
    name: 'Progressive Adaptive Vue Platform',
    packageName: 'progressive-adaptive-vue-platform',
    repository: 'https://github.com/ichichuang/progressive-adaptive-vue-platform',
  },
  governance: {
    architectureAuthority: 'ARCHITECTURE.md',
    defaultBranch: 'main',
    implementationPhase: 1,
    maintenanceModel: 'solo-main-branch',
  },
  runtime: {
    node: '24.15.0',
    pnpm: '10.34.5',
    typescript: '6.0.3',
  },
  deployment: {
    deploymentBase: '/',
  },
  workspaces: [
    {
      kind: 'application',
      name: '@platform/web',
      path: 'apps/web',
      mayDependOn: ['@platform/ui', '@platform/design-system'],
    },
    {
      kind: 'package',
      name: '@platform/ui',
      path: 'packages/ui',
      mayDependOn: ['@platform/design-system'],
    },
    {
      kind: 'package',
      name: '@platform/design-system',
      path: 'packages/design-system',
      mayDependOn: [],
    },
  ],
  bundleBudgets: {
    initialCssGzipBytes: 40 * 1024,
    initialJavaScriptGzipBytes: 224 * 1024,
    lazyMotionAdapterJavaScriptGzipBytes: 40 * 1024,
    lazyRouteJavaScriptGzipBytes: 120 * 1024,
  },
} as const
