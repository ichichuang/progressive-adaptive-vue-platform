import type { UiFormSchema, UiTableSchema } from '@platform/ui'
import { useConsoleI18n } from '../../shared/i18n'
import { useAccessBoundary } from '../access/access-boundary'
import { createGuardedTableEditor } from '../tables/guarded-table-editor'
import { useGuardedTable } from '../tables/use-guarded-table'
import { useTableShowcase } from '../workbench/tables/table-showcase'
import { localShowcaseRead } from './showcase-read'
import {
  globalShowcaseScope,
  fixtureRecordsDomain,
  showcaseRequirement,
  taskCapability,
} from './showcase-requirements'
import { useShowcaseWorld } from './showcase-session'
import { showcaseTaskSave } from './showcase-task-actions'
import { z } from 'zod'

const taskForm = {
  fields: [
    { kind: 'text', name: 'title', label: 'title', required: true },
    { kind: 'text', name: 'owner', label: 'owner' },
    { kind: 'text', name: 'secret', label: 'secret' },
  ],
} as const satisfies UiFormSchema
const save = { api: 'showcase-save-task', method: 'PATCH' } as const
const detail = { api: 'showcase-task-detail', method: 'GET' } as const

export function useShowcaseTaskTable(presentation: 'modal' | 'drawer' | 'page') {
  const access = useAccessBoundary()
  const world = useShowcaseWorld()
  const demo = useTableShowcase()
  const { locale } = useConsoleI18n()
  const localized = (en: string, zh: string) => (locale.value === 'zh-CN' ? zh : en)
  const labels = (key: string) => {
    if (key === 'title') return localized('Task', '任务')
    if (key === 'owner') return localized('Owner', '所有者')
    if (key === 'completed') return localized('Completed', '已完成')
    if (key === 'secret') return localized('Replacement secret', '替换密钥')
    return key
  }
  const list = showcaseRequirement(taskCapability('collection', 'list'))
  const schema = {
    id: 'showcase-team-tasks',
    rowKey: 'id',
    source: { kind: 'local' },
    columns: [
      { key: 'title', title: 'title' },
      { key: 'owner', title: 'owner' },
      { key: 'completed', title: 'completed', kind: 'boolean' },
    ],
    selection: 'multiple',
    editor: { form: taskForm, presentation, update: save, detail },
  } as const satisfies UiTableSchema
  const guarded = useGuardedTable({
    schema,
    access,
    domain: fixtureRecordsDomain,
    resource: 'task',
    scope: globalShowcaseScope,
    recordAction: 'read',
    recordActions: ['save'],
    target: (row) =>
      typeof row['id'] === 'string' && typeof row['revision'] === 'string'
        ? { id: row['id'], revision: row['revision'], idempotencyKey: world.issueRevision() }
        : undefined,
    fields: {
      selection: 'listed',
      paths: {
        title: { column: list, read: 'read-field' },
        owner: { column: list, read: 'read-field' },
      },
    },
    data: {
      kind: 'local',
      read: list,
      rows(context) {
        const project = world.projectFor(context)
        if (world.state.fault === 'empty-data') return []
        return world.state.tasks
          .filter((task) => task.project === project?.id)
          .map(({ id, title, owner, revision, completed }) => ({
            id,
            title,
            owner,
            revision,
            completed,
          }))
      },
    },
    translate: labels,
  })
  const read = localShowcaseRead(
    world,
    'showcase-crud-task',
    z.record(z.string(), z.string()),
    (query) => showcaseRequirement(taskCapability('record', 'read', String(query['id']))),
    (context, query) => {
      const task = world.taskFor(String(query['id']), context)
      if (!task) return
      return {
        ...(world.state.titleReadRevoked.has(task.id) ? {} : { title: task.title }),
        owner: task.owner,
      }
    },
  )
  function target(id: string | undefined) {
    const current = access.readContext()
    if (id === undefined || current.status !== 'ready') return
    const task = world.taskFor(id, current.snapshot)
    if (task) return { id, revision: task.revision, idempotencyKey: world.issueRevision() }
  }
  function editor(onRecordUnavailable?: () => void) {
    return createGuardedTableEditor({
      access,
      ...(onRecordUnavailable === undefined ? {} : { onRecordUnavailable }),
      form: { formId: 'showcase-crud-form', copy: demo.copy, translate: labels },
      source: {
        domain: fixtureRecordsDomain,
        resource: 'task',
        scope: globalShowcaseScope,
        selection: 'all',
        fields: {
          title: { edit: { read: 'read-field', write: 'write-field' } },
          owner: { edit: { read: 'read-field' } },
          secret: { edit: { write: 'write-field' } },
        },
      },
      target: (mode, row) =>
        mode !== 'create' && typeof row['id'] === 'string' ? target(row['id']) : undefined,
      canOpen: (mode, row) =>
        mode !== 'create' &&
        (presentation === 'page'
          ? typeof row['id'] === 'string'
          : guarded.can(row, mode === 'edit' ? 'save' : 'read')),
      read: () => read,
      recordRead: ({ id }) => showcaseRequirement(taskCapability('record', 'read', id)),
      recordWrite: ({ id }) => showcaseRequirement(taskCapability('record', 'save', id)),
      action: (_patch, payload) => showcaseTaskSave(world, payload),
      onOutcome(outcome) {
        if (outcome.status !== 'completed') return
        const origin = world.currentGeneration()
        setTimeout(() => {
          if (origin === world.currentGeneration()) void world.invalidateRecord(outcome.targetId)
        })
      },
    })
  }
  return { guarded, demo, target, editor }
}
