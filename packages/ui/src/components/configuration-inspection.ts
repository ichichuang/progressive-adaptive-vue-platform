/** Read-only editor hints collected by the authoritative runtime parsers. */
export interface UiConfigurationHint {
  readonly path: readonly (string | number)[]
  readonly properties?: readonly string[]
  readonly choices?: readonly string[]
}
export interface UiConfigurationInspection {
  readonly valid: boolean
  readonly issue: string | null
  readonly hints: readonly UiConfigurationHint[]
}
export interface ConfigurationInspectionContext {
  readonly hints: UiConfigurationHint[]
  record: (value: unknown) => Record<string, unknown>
  keys: (value: Record<string, unknown>, allowed: readonly string[]) => void
  choice: (owner: Record<string, unknown>, key: string, allowed: readonly string[]) => void
  error: (message: string) => TypeError
}
export function createConfigurationInspection(input: unknown): ConfigurationInspectionContext {
  const paths = new WeakMap<object, readonly (string | number)[]>()
  function visit(value: unknown, path: readonly (string | number)[]): void {
    if (typeof value !== 'object' || value === null || paths.has(value)) return
    paths.set(value, path)
    for (const [key, child] of Object.entries(value))
      visit(child, [...path, Array.isArray(value) ? Number(key) : key])
  }
  visit(input, [])
  let current: readonly (string | number)[] = []
  const hints: UiConfigurationHint[] = []
  const error = (message: string): TypeError =>
    new TypeError(
      `${current.reduce<string>((path, key) => `${path}[${JSON.stringify(key)}]`, '$')}: ${message}`,
    )
  return {
    hints,
    error,
    record(value) {
      if (typeof value !== 'object' || value === null || Array.isArray(value))
        throw error('Expected a configuration object.')
      current = paths.get(value) ?? current
      return value as Record<string, unknown>
    },
    keys(value, allowed) {
      current = paths.get(value) ?? current
      hints.push({ path: current, properties: [...allowed] })
      const unknown = Object.keys(value).find((key) => !allowed.includes(key))
      if (unknown !== undefined) {
        current = [...current, unknown]
        throw error('Unsupported configuration property.')
      }
    },
    choice(owner, key, allowed) {
      current = [...(paths.get(owner) ?? []), key]
      hints.push({ path: current, choices: [...allowed] })
      const value = owner[key]
      if (typeof value !== 'string' || !allowed.includes(value))
        throw error(`Expected one of: ${allowed.join(', ')}.`)
    },
  }
}
