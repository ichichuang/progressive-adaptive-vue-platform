import common from './messages/zh-CN/common.json'
import type { ConsoleLocale } from './locale-contract'
import { type ConsoleMessageScope, type ConsoleScopeMessages } from './message-schema'

type ResourceLoader<Scope extends ConsoleMessageScope> = () => Promise<{
  readonly default: ConsoleScopeMessages[Scope]
}>

const resourceLoaders = {
  'zh-CN': {
    common: () => Promise.resolve({ default: common }),
    console: () => import('./messages/zh-CN/console.json'),
    appearance: () => import('./messages/zh-CN/appearance.json'),
    capabilities: () => import('./messages/zh-CN/capabilities.json'),
  },
  en: {
    common: () => import('./messages/en/common.json'),
    console: () => import('./messages/en/console.json'),
    appearance: () => import('./messages/en/appearance.json'),
    capabilities: () => import('./messages/en/capabilities.json'),
  },
} satisfies Record<ConsoleLocale, { [Scope in ConsoleMessageScope]: ResourceLoader<Scope> }>

export async function loadConsoleResource(
  locale: ConsoleLocale,
  scope: ConsoleMessageScope,
): Promise<ConsoleScopeMessages[ConsoleMessageScope]> {
  const resource = (await resourceLoaders[locale][scope]()).default
  if (
    Object.values(resource).some((value) => typeof value !== 'string' || value.trim().length === 0)
  ) {
    throw new Error('The language resource is invalid.')
  }
  return { ...resource }
}
