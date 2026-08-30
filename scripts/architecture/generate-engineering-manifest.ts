import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { format, resolveConfig } from 'prettier'
import { parse as parseYaml } from 'yaml'

import { projectConfig } from '../../project.config'

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const outputPath = resolve(repositoryRoot, 'apps/web/src/generated/engineering-manifest.ts')
const verifyStageByCommand = new Map([
  ['tsx scripts/verify/check-runtime.ts', 'runtime-preflight'],
  ['pnpm format:check', 'format-check'],
  ['pnpm lint', 'lint'],
  ['pnpm lint:css', 'lint-css'],
  ['pnpm lint:uno', 'lint-uno'],
  ['pnpm typecheck:vue', 'typecheck-vue'],
  ['pnpm typecheck:ts', 'typecheck-ts'],
  ['pnpm check:arch', 'check-arch'],
  ['pnpm schema:check', 'schema-check'],
  ['pnpm tokens:check', 'tokens-check'],
  ['pnpm check:policy', 'check-policy'],
  ['pnpm check:unused', 'check-unused'],
  ['pnpm build', 'build'],
  ['pnpm check:bundle', 'check-bundle'],
])

interface PackageManifest {
  readonly engines?: Readonly<Record<string, string>>
  readonly scripts?: Readonly<Record<string, string>>
}

interface WorkspaceCatalog {
  readonly catalog?: Readonly<Record<string, string>>
}

function quote(value: string): string {
  return JSON.stringify(value)
}

export async function engineeringManifestSource(): Promise<string> {
  const [packageSource, workspaceSource, buildSource, codeqlSource, verifyWorkflowSource] =
    await Promise.all([
      readFile(resolve(repositoryRoot, 'package.json'), 'utf8'),
      readFile(resolve(repositoryRoot, 'pnpm-workspace.yaml'), 'utf8'),
      readFile(resolve(repositoryRoot, 'packages/design-system/src/build/build.ts'), 'utf8'),
      readFile(resolve(repositoryRoot, '.github/workflows/codeql.yml'), 'utf8'),
      readFile(resolve(repositoryRoot, '.github/workflows/verify.yml'), 'utf8'),
    ])
  const packageManifest = JSON.parse(packageSource) as PackageManifest
  const workspace = parseYaml(workspaceSource) as WorkspaceCatalog
  const verifyCommands = packageManifest.scripts?.['verify']?.split(' && ') ?? []
  const verifyStageIds = verifyCommands.map((command) => {
    const stageId = verifyStageByCommand.get(command)

    if (stageId === undefined) {
      throw new TypeError(`Unknown canonical verify command: ${command}`)
    }

    return stageId
  })
  const hardLimitMatch = /hardLimitBytes:\s*(\d+)/u.exec(buildSource)
  const workflowNames = [codeqlSource, verifyWorkflowSource]
    .map((source) => /^name:\s*(.+)$/mu.exec(source)?.[1]?.trim())
    .filter((name): name is string => name !== undefined)
    .sort()
  const node = packageManifest.engines?.['node']
  const pnpm = packageManifest.engines?.['pnpm']
  const catalog = workspace.catalog
  const typescript = catalog?.['typescript']
  const vue = catalog?.['vue']
  const vite = catalog?.['vite']
  const manifestLimit = hardLimitMatch?.[1]

  if (
    node !== projectConfig.runtime.node ||
    pnpm !== projectConfig.runtime.pnpm ||
    typescript !== projectConfig.runtime.typescript ||
    vue === undefined ||
    vite === undefined ||
    manifestLimit === undefined ||
    verifyStageIds.length !== 14 ||
    workflowNames.length !== 2
  ) {
    throw new TypeError('Engineering Manifest source authorities are incomplete.')
  }

  const budgets = [
    ['generated-token-manifest-gzip', Number(manifestLimit)],
    ['initial-css-gzip', projectConfig.bundleBudgets.initialCssGzipBytes],
    ['initial-javascript-gzip', projectConfig.bundleBudgets.initialJavaScriptGzipBytes],
    [
      'lazy-motion-adapter-javascript-gzip',
      projectConfig.bundleBudgets.lazyMotionAdapterJavaScriptGzipBytes,
    ],
    ['lazy-route-javascript-gzip', projectConfig.bundleBudgets.lazyRouteJavaScriptGzipBytes],
  ] as const

  const source = `/* Generated file. Do not edit directly. */
export interface EngineeringCoordinates {
  readonly node: 'node@${node}'
  readonly pnpm: 'pnpm@${pnpm}'
  readonly typescript: 'typescript@${typescript}'
  readonly vue: 'vue@${vue}'
  readonly vite: 'vite@${vite}'
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
    node: ${quote(`node@${node}`)},
    pnpm: ${quote(`pnpm@${pnpm}`)},
    typescript: ${quote(`typescript@${typescript}`)},
    vue: ${quote(`vue@${vue}`)},
    vite: ${quote(`vite@${vite}`)},
  },
  verifyStageIds: [${verifyStageIds.map(quote).join(', ')}],
  bundleBudgets: [
${budgets
  .map(([id, limit]) => `    { id: ${quote(id)}, limit: ${String(limit)}, unit: 'bytes-gzip' },`)
  .join('\n')}
  ],
  workflowNames: [${workflowNames.map(quote).join(', ')}],
} as const satisfies EngineeringManifest
`

  return format(source, {
    ...(await resolveConfig(outputPath)),
    filepath: outputPath,
  })
}

async function main(): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, await engineeringManifestSource(), 'utf8')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
