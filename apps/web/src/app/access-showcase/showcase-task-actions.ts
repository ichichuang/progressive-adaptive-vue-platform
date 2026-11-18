import type { UiFormReadonlyValue } from '@platform/ui'
import type { GuardedAction } from '../access/guarded-action'
import { showcaseRequirement, taskCapability } from './showcase-requirements'
import type { ShowcaseWorld } from './showcase-world'

export function showcaseTaskSave(
  world: ShowcaseWorld,
  payload: Readonly<Record<string, UiFormReadonlyValue>>,
): GuardedAction<'acknowledged'> {
  return world.guardedCommand(
    (target) => showcaseRequirement(taskCapability('record', 'save', target.id)),
    (target, context) => {
      const previous = world.taskFor(target.id, context)
      if (!previous || previous.revision !== target.revision || !target.idempotencyKey) return
      const title = payload['title']
      const secret = payload['secret']
      const source = payload['source']
      if (Object.keys(payload).some((key) => !['title', 'secret', 'source'].includes(key))) return
      if (typeof title === 'string' && world.state.titleWriteRevoked.has(previous.id)) return
      if (typeof source !== 'undefined' && source !== previous.source) return
      world.state.tasks = world.state.tasks.map((task) =>
        task.id === target.id
          ? {
              ...task,
              ...(typeof title === 'string' ? { title } : {}),
              ...(typeof secret === 'string' ? { secret } : {}),
              revision: world.issueRevision(),
            }
          : task,
      )
      return 'acknowledged'
    },
    { isTargetCurrent: () => true, businessAllows: () => true },
  )
}

export function showcaseBatch(world: ShowcaseWorld): GuardedAction<'completed'> {
  return world.guardedCommand(
    (target) => showcaseRequirement(taskCapability('record', 'complete', target.id)),
    (target, context) => {
      const task = world.taskFor(target.id, context)
      if (!task || task.revision !== target.revision) return
      world.state.tasks = world.state.tasks.map((entry) =>
        entry.id !== task.id
          ? entry
          : {
              ...entry,
              completed: true,
              revision: world.issueRevision(),
            },
      )
      return 'completed'
    },
    {
      isTargetCurrent: ({ id }) => world.state.tasks.some((task) => task.id === id),
      businessAllows: ({ id }) => {
        const task = world.state.tasks.find((entry) => entry.id === id)
        return task?.workflow === 'ready' && !task.completed
      },
    },
  )
}
