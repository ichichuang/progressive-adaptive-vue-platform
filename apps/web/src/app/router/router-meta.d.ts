import type { ValidatedRouteMeta } from './route-registry'

declare module 'vue-router' {
  interface RouteMeta extends ValidatedRouteMeta, Readonly<Record<never, never>> {}
}

export {}
