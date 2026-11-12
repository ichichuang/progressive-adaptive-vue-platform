import type { ConsoleTranslate } from '../../shared/i18n'
import { getRouteRecord } from '../router/route-registry'
import { registeredRouteDestination } from '../router/route-input'
import {
  tableExampleApis,
  tableExampleGuideKeys,
  tableExampleSchema,
} from './tables/table-examples'

// Search aliases only. Routes, capability contracts and boundaries remain with their owners.
const discoveryExamples = [
  {
    example: 'query',
    descriptionKey: 'showcase.intent.query',
    name: 'component-combination-query',
    aliases: ['查询', '筛选', '搜索', '过滤', 'filter', 'search', 'query'],
  },
  {
    example: 'modal',
    descriptionKey: 'showcase.intent.modal',
    name: 'component-combination-modal',
    aliases: ['弹窗', '弹框', '编辑', '新增', 'modal', 'dialog', 'edit', 'create'],
  },
  {
    example: 'drawer',
    descriptionKey: 'showcase.intent.drawer',
    name: 'component-combination-drawer',
    aliases: ['抽屉', '侧滑', '编辑', 'drawer', 'edit'],
  },
  {
    example: 'page',
    descriptionKey: 'showcase.intent.page',
    name: 'component-combination-page',
    aliases: ['独立页', '新页面', '页签', '编辑', 'page', 'tab', 'edit'],
  },
  {
    example: 'remote',
    descriptionKey: 'showcase.intent.remote',
    name: 'component-table-remote',
    aliases: ['接口', '远程', '请求', 'api', 'remote', 'request', 'server'],
  },
] as const

export function discoverCapabilities(query: string, t: ConsoleTranslate) {
  const term = query.trim().toLocaleLowerCase()
  return discoveryExamples.flatMap(({ example, name, aliases, descriptionKey }) => {
    const route = getRouteRecord(name)
    const guide = tableExampleGuideKeys[example]
    const title = t(route.meta.titleKey)
    const steps = guide.steps.map((key) => t(key))
    const boundary = t(guide.boundary)
    const searchable = [title, tableExampleApis[example], ...aliases].join(' ').toLocaleLowerCase()
    const matches =
      term === '' || searchable.includes(term) || aliases.some((alias) => term.includes(alias))
    if (!matches) return []
    return [
      {
        title,
        description: t(descriptionKey),
        note: t(example === 'remote' ? 'showcase.intent.remoteNote' : 'showcase.intent.localNote'),
        destination: registeredRouteDestination({ name }),
        copyValue: [
          t('showcase.intent.aiRequest'),
          title,
          route.pathPattern,
          route.sourcePath,
          ...steps,
          boundary,
          tableExampleApis[example],
          'apps/web/src/app/workbench/tables/table-examples.ts',
          JSON.stringify(tableExampleSchema(example), null, 2),
        ].join('\n\n'),
      },
    ]
  })
}
