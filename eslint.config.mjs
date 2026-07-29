import unocss from '@unocss/eslint-plugin'
import boundaries from 'eslint-plugin-boundaries'
import vue from 'eslint-plugin-vue'
import vueAccessibility from 'eslint-plugin-vuejs-accessibility'
import typescriptEslint from 'typescript-eslint'

import { localRules } from './scripts/eslint-rules/index.mjs'

const typedFiles = ['**/*.ts', '**/*.vue']
const architectureElements = [
  {
    type: 'web-root',
    pattern: 'apps/web/src/*',
  },
  {
    type: 'app',
    pattern: 'apps/web/src/app/**/*',
  },
  {
    type: 'pages',
    pattern: 'apps/web/src/pages/**/*',
  },
  {
    type: 'features',
    pattern: 'apps/web/src/features/**/*',
  },
  {
    type: 'shared',
    pattern: 'apps/web/src/shared/**/*',
  },
  {
    type: 'ui',
    pattern: 'packages/ui/src/**/*',
  },
  {
    type: 'design-system',
    pattern: 'packages/design-system/src/**/*',
  },
]

function allowDependencies(from, to) {
  return {
    from: {
      element: {
        types: from,
      },
    },
    allow: {
      to: {
        element: {
          types: {
            anyOf: to,
          },
        },
      },
    },
  }
}

export default typescriptEslint.config(
  {
    ignores: ['**/.git/**', '**/node_modules/**', '**/dist/**', 'pnpm-lock.yaml'],
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
      reportUnusedInlineConfigs: 'error',
    },
  },
  ...typescriptEslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: typedFiles,
  })),
  ...typescriptEslint.configs.stylisticTypeChecked.map((config) => ({
    ...config,
    files: typedFiles,
  })),
  ...vue.configs['flat/recommended-error'],
  {
    files: typedFiles,
    languageOptions: {
      parserOptions: {
        extraFileExtensions: ['.vue'],
        project: [
          './tsconfig.node.json',
          './apps/web/tsconfig.json',
          './packages/design-system/tsconfig.json',
          './packages/ui/tsconfig.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'inline-type-imports',
          prefer: 'type-imports',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-unreachable': 'error',
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: typescriptEslint.parser,
      },
    },
    plugins: {
      'vuejs-accessibility': vueAccessibility,
    },
    rules: {
      ...vueAccessibility.configs.recommended.rules,
      'vue/block-order': [
        'error',
        {
          order: ['script', 'template', 'style'],
        },
      ],
      'vue/component-api-style': ['error', ['script-setup']],
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,vue}', 'packages/ui/src/**/*.{ts,vue}'],
    plugins: {
      local: localRules,
      unocss,
    },
    rules: {
      'local/no-app-material-token-access': 'error',
      'local/no-direct-storage-access': 'error',
      'local/no-dynamic-unocss-classes': 'error',
      'local/no-page-optical-effects': 'error',
      'local/no-raw-ui-colors': 'error',
      'local/no-reka-import-outside-ui': 'error',
      'local/no-user-agent-layout-branching': 'error',
      'local/no-workspace-deep-import': 'error',
      'unocss/blocklist': 'error',
      'unocss/order': 'error',
    },
  },
  {
    files: ['apps/web/src/**/*.ts', 'packages/*/src/**/*.ts', 'scripts/**/*.ts'],
    ignores: ['**/*.d.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          message: 'Use named exports outside tool configuration and Vue SFC files.',
          selector: 'ExportDefaultDeclaration',
        },
      ],
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,vue}'],
    rules: {
      'no-alert': 'error',
      'no-console': 'error',
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,vue}', 'packages/*/src/**/*.ts'],
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/elements': architectureElements,
      'boundaries/root-path': import.meta.dirname,
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            allowDependencies('web-root', [
              'web-root',
              'app',
              'pages',
              'features',
              'shared',
              'ui',
              'design-system',
            ]),
            allowDependencies('app', ['app', 'pages', 'features', 'shared', 'ui', 'design-system']),
            allowDependencies('pages', ['pages', 'features', 'shared', 'ui', 'design-system']),
            allowDependencies('features', ['features', 'shared', 'ui', 'design-system']),
            allowDependencies('shared', ['shared', 'ui', 'design-system']),
            allowDependencies('ui', ['ui', 'design-system']),
            allowDependencies('design-system', ['design-system']),
          ],
        },
      ],
    },
  },
)
