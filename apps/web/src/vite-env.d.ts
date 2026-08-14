/// <reference types="vite/client" />

declare const __PAVP_COMPILED_ENVIRONMENT__: 'development' | 'staging' | 'production'
declare const __PAVP_COMPILED_RELEASE_SHA__: string
declare const __PAVP_COMPILED_BUILD_VERSION__: string

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

declare module 'virtual:uno.css'
