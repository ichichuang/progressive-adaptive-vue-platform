export const administrationModules = Object.freeze([
  'directory',
  'groups',
  'roles',
  'relationships',
  'policies',
  'requests',
  'audit',
  'diagnostics',
] as const)

export type AdministrationModule = (typeof administrationModules)[number]

declare global {
  const __PAVP_ADMINISTRATION_MODULES__: readonly AdministrationModule[]
}

export function resolveAdministrationSelection(
  input: readonly string[],
): readonly AdministrationModule[] {
  const unknown = input.find((id) => !administrationModules.some((known) => known === id))
  if (unknown !== undefined) throw new TypeError(`Unknown administration module: ${unknown}`)
  if (new Set(input).size !== input.length) throw new TypeError('Duplicate administration module.')
  return Object.freeze(administrationModules.filter((id) => input.includes(id)))
}

export const administrationLayout = Object.freeze({
  module: null,
  name: 'administration-shell',
  path: '/administration',
  file: 'administration.vue',
  resource: 'workbench',
} as const)

export const administrationPages = Object.freeze(
  administrationModules.map(<Id extends AdministrationModule>(module: Id) =>
    Object.freeze({
      module,
      name: `administration-${module}` as const,
      path: `/administration/${module}` as const,
      file: `administration/${module}.vue` as const,
      resource: module,
      parent: administrationLayout.name,
    }),
  ),
)

export const administrationRouteFolder = 'src/administration-pages'
export const administrationAccessDomain = 'administration'
