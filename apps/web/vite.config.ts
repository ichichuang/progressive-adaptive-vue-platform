import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), UnoCSS()],
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
