import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig, type Plugin } from 'vite'

import { applicationConfig } from './src/app/config/app.config'

const firstPaintArtifactNames = ['appearance-init.js', 'critical-theme.css'] as const
const generatedDirectory = resolve(
  import.meta.dirname,
  '../../packages/design-system/src/generated',
)

function firstPaintArtifacts(): Plugin {
  return {
    name: 'pavp-first-paint-artifacts',
    buildStart() {
      for (const fileName of firstPaintArtifactNames) {
        this.addWatchFile(resolve(generatedDirectory, fileName))
      }
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestPath = request.url?.split('?', 1)[0]
        const fileName = firstPaintArtifactNames.find(
          (candidate) => requestPath === `/generated/${candidate}`,
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
      for (const fileName of firstPaintArtifactNames) {
        this.emitFile({
          fileName: `generated/${fileName}`,
          source: await readFile(resolve(generatedDirectory, fileName)),
          type: 'asset',
        })
      }
    },
    transformIndexHtml(html) {
      const expectedStorageKeyAttribute = `data-preference-storage-key="${applicationConfig.appearance.preferenceStorageKey}"`

      if (!html.includes(expectedStorageKeyAttribute)) {
        throw new Error(
          'index.html must provide the application-owned appearance preference storage key.',
        )
      }

      return html
    },
  }
}

export default defineConfig({
  plugins: [firstPaintArtifacts(), vue(), UnoCSS()],
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
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
