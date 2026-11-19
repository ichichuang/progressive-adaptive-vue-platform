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
  readonly diagnostic?: UiConfigurationError
}
type ConfigurationReason =
  | 'value'
  | 'object'
  | 'property'
  | 'choice'
  | 'text'
  | 'fields'
  | 'columns'
  | 'fieldName'
  | 'fieldValue'
  | 'stepField'
  | 'columnKey'
  | 'option'
  | 'bounds'
  | 'reference'
/** Keeps the existing parser message while exposing its location and constraints to editors. */
export class UiConfigurationError extends TypeError {
  readonly location: string | null
  readonly reason: ConfigurationReason
  readonly values: readonly string[]

  constructor(
    message: string,
    location: string | null,
    reason: ConfigurationReason,
    values: readonly string[],
  ) {
    super(location === null ? message : `${location}: ${message}`)
    this.location = location
    this.reason = reason
    this.values = values
  }
}
export function failedConfigurationInspection(
  cause: unknown,
  hints: readonly UiConfigurationHint[],
): UiConfigurationInspection {
  return {
    valid: false,
    issue: cause instanceof Error ? cause.message : String(cause),
    hints,
    ...(cause instanceof UiConfigurationError ? { diagnostic: cause } : {}),
  }
}
export interface ConfigurationInspectionContext {
  readonly hints: UiConfigurationHint[]
  record: (value: unknown) => Record<string, unknown>
  keys: (value: Record<string, unknown>, allowed: readonly string[]) => void
  choice: (owner: Record<string, unknown>, key: string, allowed: readonly string[]) => void
  error: (message: string, reason?: ConfigurationReason, values?: readonly string[]) => TypeError
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
  const error = (
    message: string,
    reason: ConfigurationReason = 'value',
    values: readonly string[] = [],
  ): TypeError =>
    new UiConfigurationError(
      message,
      current.reduce<string>((path, key) => `${path}[${JSON.stringify(key)}]`, '$'),
      reason,
      values,
    )
  return {
    hints,
    error,
    record(value) {
      if (typeof value !== 'object' || value === null || Array.isArray(value))
        throw error('Expected a configuration object.', 'object')
      current = paths.get(value) ?? current
      return value as Record<string, unknown>
    },
    keys(value, allowed) {
      current = paths.get(value) ?? current
      hints.push({ path: current, properties: [...allowed] })
      const unknown = Object.keys(value).find((key) => !allowed.includes(key))
      if (unknown !== undefined) {
        current = [...current, unknown]
        throw error('Unsupported configuration property.', 'property')
      }
    },
    choice(owner, key, allowed) {
      current = [...(paths.get(owner) ?? []), key]
      hints.push({ path: current, choices: [...allowed] })
      const value = owner[key]
      if (typeof value !== 'string' || !allowed.includes(value))
        throw error(`Expected one of: ${allowed.join(', ')}.`, 'choice', allowed)
    },
  }
}
