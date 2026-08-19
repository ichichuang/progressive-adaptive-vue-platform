import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'

import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig, type Plugin } from 'vite'
import VueRouter from 'vue-router/vite'

import { projectConfig } from '../../project.config'
import { applicationConfig } from './src/app/config/app.config'
import {
  compiledEnvironmentValues,
  coreRuntimeConfigurationSchema,
  type CompiledEnvironment,
  type CoreRuntimeConfiguration,
} from './src/app/config/runtime-configuration-contract'
import { getRouteRecordBySourcePath, routeRegistry } from './src/app/router/route-registry'

type JsonObject = Record<string, unknown>
type VueRouterPluginOptions = NonNullable<Parameters<typeof VueRouter>[0]>
type EditableTreeNode = Parameters<NonNullable<VueRouterPluginOptions['extendRoute']>>[0]

const repositoryDirectory = resolve(import.meta.dirname, '../..')
const rootPackageManifestPath = resolve(repositoryDirectory, 'package.json')
const deploymentBase: string = projectConfig.deployment.deploymentBase
const runtimeConfigurationArtifactName = 'runtime-configuration.json'
const firstPaintArtifactNames = ['appearance-init.js', 'critical-theme.css'] as const
const generatedDirectory = resolve(repositoryDirectory, 'packages/design-system/src/generated')
const releaseShaOutputPattern = /^([0-9a-f]{40})(?:\r?\n)?$/u

function canonicalPageSourcePath(filePath: string): string {
  return relative(repositoryDirectory, filePath).split(sep).join('/')
}

function projectCanonicalFileRoute(route: EditableTreeNode): void {
  const component = route.component

  if (component === undefined) {
    return
  }

  const record = getRouteRecordBySourcePath(canonicalPageSourcePath(component))
  route.name = record.name
  route.path = record.pathPattern
  route.meta = record.meta
}

function verifyCanonicalFileRouteTree(rootRoute: EditableTreeNode): void {
  const generatedSourcePaths = [...rootRoute]
    .flatMap((route) => [...route.components.values()])
    .map(canonicalPageSourcePath)
    .sort()
  const registeredSourcePaths = routeRegistry.map((record) => record.sourcePath).sort()

  if (
    generatedSourcePaths.length !== registeredSourcePaths.length ||
    generatedSourcePaths.some((sourcePath, index) => sourcePath !== registeredSourcePaths[index])
  ) {
    throw new Error('The official file-route source set diverged from the Route Registry.')
  }
}

export const routerFileGenerationOptions = {
  root: import.meta.dirname,
  routesFolder: 'src/pages',
  extensions: ['.vue'],
  importMode: 'async',
  dts: 'src/route-map.d.ts',
  extendRoute: projectCanonicalFileRoute,
  beforeWriteFiles: verifyCanonicalFileRouteTree,
} as const satisfies VueRouterPluginOptions

if (deploymentBase !== '/') {
  throw new Error('The Runtime Kernel currently requires the exact root deployment base.')
}

function deploymentPath(relativePath: string): string {
  return `${deploymentBase}${relativePath}`
}

const runtimeConfigurationUrl = deploymentPath(runtimeConfigurationArtifactName)
const firstPaintPaths = {
  appearanceInitializer: deploymentPath('generated/appearance-init.js'),
  criticalTheme: deploymentPath('generated/critical-theme.css'),
} as const

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCompiledEnvironment(value: string): value is CompiledEnvironment {
  return compiledEnvironmentValues.some((environment) => environment === value)
}

async function readBuildVersion(): Promise<string> {
  const manifest = JSON.parse(await readFile(rootPackageManifestPath, 'utf8')) as unknown

  if (!isJsonObject(manifest) || typeof manifest['version'] !== 'string') {
    throw new Error('The root package manifest must provide its Build Version authority.')
  }

  return manifest['version']
}

function readReleaseSha(): string {
  const releaseShaOutput = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repositoryDirectory,
    encoding: 'utf8',
  })
  const releaseShaMatch = releaseShaOutputPattern.exec(releaseShaOutput)

  if (releaseShaMatch?.[1] === undefined) {
    throw new Error('The build boundary requires a full lowercase Git commit SHA.')
  }

  return releaseShaMatch[1]
}

function runtimeConfigurationArtifacts(runtimeConfiguration: CoreRuntimeConfiguration): Plugin {
  const runtimeConfigurationJson = `${JSON.stringify(runtimeConfiguration, null, 2)}\n`

  return {
    name: 'pavp-runtime-configuration-and-first-paint-artifacts',
    buildStart() {
      for (const fileName of firstPaintArtifactNames) {
        this.addWatchFile(resolve(generatedDirectory, fileName))
      }
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url !== runtimeConfigurationUrl) {
          next()
          return
        }

        response.statusCode = 200
        response.setHeader('Cache-Control', 'no-store')
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.end(runtimeConfigurationJson)
      })

      server.middlewares.use((request, response, next) => {
        const requestPath = request.url?.split('?', 1)[0]
        const fileName = firstPaintArtifactNames.find(
          (candidate) => requestPath === deploymentPath(`generated/${candidate}`),
        )

        if (fileName === undefined) {
          next()
          return
        }

        void readFile(resolve(generatedDirectory, fileName))
          .then((contents) => {
            response.statusCode = 200
            response.setHeader(
              'Content-Type',
              fileName.endsWith('.css')
                ? 'text/css; charset=utf-8'
                : 'text/javascript; charset=utf-8',
            )
            response.end(contents)
          })
          .catch(next)
      })
    },
    async generateBundle() {
      this.emitFile({
        fileName: runtimeConfigurationArtifactName,
        source: runtimeConfigurationJson,
        type: 'asset',
      })

      for (const fileName of firstPaintArtifactNames) {
        this.emitFile({
          fileName: `generated/${fileName}`,
          source: await readFile(resolve(generatedDirectory, fileName)),
          type: 'asset',
        })
      }
    },
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
        const preferenceStorageKeyMatches = [
          ...html.matchAll(/\bdata-preference-storage-key="([^"]*)"/gu),
        ]

        if (
          preferenceStorageKeyMatches.length !== 1 ||
          preferenceStorageKeyMatches[0]?.[1] !== applicationConfig.appearance.preferenceStorageKey
        ) {
          throw new Error(
            'index.html must provide exactly one exact application-owned Preference storage key.',
          )
        }

        if (/\bdata-theme-registry-storage-key\b/u.test(html)) {
          throw new Error('index.html must not expose the Custom Theme Registry storage key.')
        }

        const moduleBootstrapScripts = [...html.matchAll(/<script\b[^>]*>/gu)]
          .map((match) => match[0])
          .filter(
            (script) => /\btype="module"/u.test(script) && /\bsrc="\/src\/main\.ts"/u.test(script),
          )
        const runtimeConfigurationCarrierMatches = [
          ...html.matchAll(/\bdata-runtime-configuration-url="([^"]*)"/gu),
        ]

        if (
          moduleBootstrapScripts.length !== 1 ||
          runtimeConfigurationCarrierMatches.length !== 1 ||
          runtimeConfigurationCarrierMatches[0]?.[1] !== runtimeConfigurationUrl ||
          !moduleBootstrapScripts[0]?.includes(
            `data-runtime-configuration-url="${runtimeConfigurationUrl}"`,
          )
        ) {
          throw new Error(
            'The existing module bootstrap script must be the sole exact Runtime Configuration URL carrier.',
          )
        }

        const criticalThemeReferences = [...html.matchAll(/\bhref="([^"]*critical-theme\.css)"/gu)]
        const appearanceInitializerReferences = [
          ...html.matchAll(/\bsrc="([^"]*appearance-init\.js)"/gu),
        ]

        if (
          criticalThemeReferences.length !== 1 ||
          criticalThemeReferences[0]?.[1] !== firstPaintPaths.criticalTheme ||
          appearanceInitializerReferences.length !== 1 ||
          appearanceInitializerReferences[0]?.[1] !== firstPaintPaths.appearanceInitializer
        ) {
          throw new Error('index.html First Paint paths must match the deployment-base authority.')
        }

        const appearanceInitializer = await readFile(
          resolve(generatedDirectory, 'appearance-init.js'),
          'utf8',
        )

        for (const storageKey of [
          applicationConfig.appearance.preferenceStorageKey,
          applicationConfig.appearance.customThemeRegistryStorageKey,
        ]) {
          if (appearanceInitializer.includes(storageKey)) {
            throw new Error('Generated First Paint must remain application-storage-key-agnostic.')
          }
        }

        return html
      },
    },
  }
}

function productionRuntimeConfigurationCarrier(): Plugin {
  return {
    name: 'pavp-production-runtime-configuration-carrier',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const moduleBootstrapScripts = [...html.matchAll(/<script\b[^>]*\btype="module"[^>]*>/gu)]

        if (moduleBootstrapScripts.length !== 1) {
          throw new Error(
            'Production HTML must contain exactly one generated module bootstrap script.',
          )
        }

        const moduleBootstrapScript = moduleBootstrapScripts[0]?.[0]

        if (moduleBootstrapScript === undefined) {
          throw new Error('Production HTML is missing its generated module bootstrap script.')
        }

        const carrierMatches = [...html.matchAll(/\bdata-runtime-configuration-url="([^"]*)"/gu)]

        if (carrierMatches.length === 1) {
          if (carrierMatches[0]?.[1] !== runtimeConfigurationUrl) {
            throw new Error('Production Runtime Configuration URL carrier drifted.')
          }

          return html
        }

        if (carrierMatches.length !== 0) {
          throw new Error('Production HTML contains competing Runtime Configuration URL carriers.')
        }

        return html.replace(
          moduleBootstrapScript,
          moduleBootstrapScript.replace(
            '<script',
            `<script data-runtime-configuration-url="${runtimeConfigurationUrl}"`,
          ),
        )
      },
    },
  }
}

export default defineConfig(async ({ mode }) => {
  if (!isCompiledEnvironment(mode)) {
    throw new Error(
      'Vite mode must be one of the exact compiled environments: development, staging, production.',
    )
  }

  const buildVersion = await readBuildVersion()
  const releaseSha = readReleaseSha()
  const runtimeConfiguration = Object.freeze(
    coreRuntimeConfigurationSchema.parse({
      schemaVersion: 1,
      environment: mode,
      deploymentBase,
      releaseSha,
      buildVersion,
    }),
  )

  return {
    base: deploymentBase,
    define: {
      __PAVP_COMPILED_ENVIRONMENT__: JSON.stringify(runtimeConfiguration.environment),
      __PAVP_COMPILED_RELEASE_SHA__: JSON.stringify(runtimeConfiguration.releaseSha),
      __PAVP_COMPILED_BUILD_VERSION__: JSON.stringify(runtimeConfiguration.buildVersion),
    },
    plugins: [
      runtimeConfigurationArtifacts(runtimeConfiguration),
      productionRuntimeConfigurationCarrier(),
      VueRouter(routerFileGenerationOptions),
      vue(),
      UnoCSS(),
    ],
    build: {
      cssCodeSplit: true,
      emptyOutDir: true,
      manifest: true,
      outDir: 'dist',
      reportCompressedSize: true,
      sourcemap: false,
      target: 'es2022',
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
    },
    server: {
      host: true,
      port: 5173,
      strictPort: false,
    },
  }
})
