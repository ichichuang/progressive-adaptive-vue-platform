export const accessShowcaseProfiles = ['native', 'casl'] as const
export type AccessShowcaseProfile = (typeof accessShowcaseProfiles)[number]

declare global {
  const __PAVP_ACCESS_SHOWCASE__: AccessShowcaseProfile | null
}

export const showcaseRouteFolder = 'src/access-showcase-pages'
export const showcaseNavigationDomain = 'showcase-navigation'
export const showcaseProjectRequirement = {
  kind: 'type',
  domain: showcaseNavigationDomain,
  resource: 'projects',
  action: 'view',
} as const

export const showcasePages = [
  { name: 'access-showcase', path: '/access-showcase', file: 'overview.vue' },
  { name: 'access-showcase-projects', path: '/access-showcase/projects', file: 'projects.vue' },
  { name: 'access-showcase-editor', path: '/access-showcase/editor', file: 'editor.vue' },
  {
    name: 'access-showcase-diagnostics',
    path: '/access-showcase/diagnostics',
    file: 'diagnostics.vue',
  },
] as const
