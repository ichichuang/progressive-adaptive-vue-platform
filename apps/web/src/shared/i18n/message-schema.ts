import type common from './messages/zh-CN/common.json'
import type consoleMessages from './messages/zh-CN/console.json'
import type appearance from './messages/zh-CN/appearance.json'
import type capabilities from './messages/zh-CN/capabilities.json'
import type englishCommon from './messages/en/common.json'
import type englishConsole from './messages/en/console.json'
import type englishAppearance from './messages/en/appearance.json'
import type englishCapabilities from './messages/en/capabilities.json'

export interface ConsoleScopeMessages {
  readonly common: typeof common
  readonly console: typeof consoleMessages
  readonly appearance: typeof appearance
  readonly capabilities: typeof capabilities
}

// Both directions reject a missing or additional message in either language.
type SameKeys<Left, Right> =
  Exclude<keyof Left, keyof Right> extends never
    ? Exclude<keyof Right, keyof Left> extends never
      ? true
      : false
    : false
export const messageScopeCoverage = {
  common: true,
  console: true,
  appearance: true,
  capabilities: true,
} as const satisfies {
  common: SameKeys<typeof common, typeof englishCommon>
  console: SameKeys<typeof consoleMessages, typeof englishConsole>
  appearance: SameKeys<typeof appearance, typeof englishAppearance>
  capabilities: SameKeys<typeof capabilities, typeof englishCapabilities>
}

export type ConsoleMessageScope = keyof ConsoleScopeMessages
export type ConsoleMessageSchema = typeof common &
  typeof consoleMessages &
  typeof appearance &
  typeof capabilities
export type ConsoleMessageKey = keyof ConsoleMessageSchema
export type ConsoleCommonMessageKey = keyof typeof common
export interface ConsoleMessageParams {
  readonly 'console.storage.active-records': Readonly<{ count: number }>
  readonly 'appearance.gallery.description': Readonly<{ count: number }>
  readonly 'appearance.preview.current-material': Readonly<{ material: string }>
}

export const messageParameterKinds = {
  'console.storage.active-records': { count: 'number' },
  'appearance.gallery.description': { count: 'number' },
  'appearance.preview.current-material': { material: 'string' },
} as const satisfies {
  [Key in keyof ConsoleMessageParams]: {
    [Name in keyof ConsoleMessageParams[Key]]: ConsoleMessageParams[Key][Name] extends number
      ? 'number'
      : 'string'
  }
}

export type ConsoleTranslate = <Key extends ConsoleMessageKey>(
  key: Key,
  ...args: Key extends keyof ConsoleMessageParams ? [parameters: ConsoleMessageParams[Key]] : []
) => string
