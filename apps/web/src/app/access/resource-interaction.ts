import { computed, onDeactivated, shallowRef, watch } from 'vue'
import type { AccessBoundary, AccessContextSnapshot, AccessProposal } from './access-contract'
import { executeGuardedAction, type ActionTarget, type GuardedAction } from './guarded-action'
import { observeNativeRequirement, type AccessRequirement } from './native-requirement'

interface ResourceInteractionView {
  readonly revision: string
}

export interface ResourceInteractionHost<Command extends string> {
  readonly targetId: string
  /** This label is explicitly safe for this interaction, even without resource read permission. */
  readonly label: string
  readonly viewRequirement: AccessRequirement
  read(context: AccessContextSnapshot, signal: AbortSignal): Promise<unknown>
  readonly commands?: Readonly<Partial<Record<Command, GuardedAction<unknown>>>>
}

/** Owns a single dialog's authorized snapshot and command lifetime. */
export function useResourceInteraction<
  Command extends string,
  View extends ResourceInteractionView,
>(
  access: AccessBoundary,
  input: () => ResourceInteractionHost<Command>,
  open: () => boolean,
  close: () => void,
  parse: (input: unknown) => View | undefined,
) {
  const value = shallowRef<View>()
  const status = shallowRef<'pending' | 'ready' | 'unavailable' | 'failed'>('pending')
  const activity = shallowRef<'idle' | 'working' | 'done' | 'failed' | 'unknown' | 'unavailable'>(
    'idle',
  )
  let lifetime: AbortController | undefined
  let refresh: (() => void) | undefined
  let commandContext: AccessContextSnapshot | undefined
  let lease: (() => boolean) | undefined
  onDeactivated(close)

  watch(
    () => [input(), open(), access.readContext()] as const,
    ([host, displayed, context], previous, onCleanup) => {
      value.value = undefined
      status.value = 'pending'
      activity.value = 'idle'
      if (!displayed) return
      if (previous?.[1] && (previous[2] !== context || previous[0] !== host)) {
        close()
        return
      }
      if (context.status !== 'ready') {
        status.value = 'unavailable'
        return
      }
      const origin = context.snapshot
      const owner = new AbortController()
      lifetime = owner
      commandContext = origin
      let attempt: AbortController | undefined
      const inContext = () => {
        const now = access.readContext()
        return !owner.signal.aborted && now.status === 'ready' && now.snapshot === origin
      }
      const targets = host.viewRequirement.requests.filter(
        (request) => request.kind === 'record' || request.kind === 'field',
      )
      const requirement =
        targets.length !== 0 && targets.every(({ recordId }) => recordId === host.targetId)
          ? host.viewRequirement
          : undefined
      const view = observeNativeRequirement(access, requirement, () => {
        attempt?.abort()
        value.value = undefined
        status.value = 'pending'
        queueMicrotask(reload)
      })
      function reload(): void {
        if (!inContext()) return
        attempt?.abort()
        const read = new AbortController()
        attempt = read
        const owns = () => inContext() && !read.signal.aborted
        async function run(): Promise<void> {
          await view.evaluate()
          const permit = view.permit()
          if (!owns()) return
          if (!permit?.isCurrent()) {
            value.value = undefined
            status.value = 'unavailable'
            return
          }
          const candidate = await host.read(origin, read.signal)
          if (!owns() || !permit.isCurrent()) return
          const parsed = parse(candidate)
          status.value = parsed === undefined ? 'failed' : 'ready'
          value.value = parsed
        }
        void run().catch(() => {
          if (owns()) {
            status.value = 'failed'
            value.value = undefined
          }
        })
      }
      refresh = reload
      lease = () => inContext() && view.permit()?.isCurrent() === true
      onCleanup(() => {
        owner.abort()
        attempt?.abort()
        view.dispose()
        refresh = undefined
        lease = undefined
        lifetime = undefined
        commandContext = undefined
      })
      reload()
    },
    { immediate: true, flush: 'sync' },
  )

  const current = computed(() => {
    const snapshot = value.value
    return lease?.() === true ? snapshot : undefined
  })
  function isCurrent(snapshot: View): boolean {
    return current.value === snapshot && lease?.() === true
  }

  function replace(snapshot: View, replacement: View): void {
    if (isCurrent(snapshot)) value.value = replacement
  }

  function operation(
    command: Command,
    values: AccessProposal['values'] | undefined,
    draftIsCurrent?: () => boolean,
  ) {
    const host = input()
    const active = current.value
    const action = host.commands?.[command]
    if (active === undefined || values === undefined || action === undefined) return undefined
    const target = {
      id: host.targetId,
      mode: command,
      revision: active.revision,
      proposal: { revision: crypto.randomUUID(), values },
    }
    return {
      action: {
        ...action,
        isTargetCurrent: (candidate: ActionTarget) =>
          isCurrent(active) &&
          input() === host &&
          draftIsCurrent?.() !== false &&
          action.isTargetCurrent(candidate),
      } satisfies GuardedAction<unknown>,
      target,
    }
  }

  async function run(selection: ReturnType<typeof operation>): Promise<void> {
    const origin = commandContext
    const signal = lifetime?.signal
    if (!selection || !signal || !origin || activity.value === 'working') return
    activity.value = 'working'
    try {
      const [outcome] = await executeGuardedAction(access, selection.action, {
        targets: [selection.target],
        signal,
      })
      if (signal.aborted || commandContext !== origin) return
      activity.value =
        outcome?.status === 'completed'
          ? 'done'
          : outcome?.status === 'unknown'
            ? 'unknown'
            : outcome?.status === 'failed'
              ? 'failed'
              : 'unavailable'
      if (outcome?.requestId !== undefined) {
        value.value = undefined
        status.value = 'pending'
        refresh?.()
      }
    } catch {
      if (!signal.aborted && commandContext === origin) activity.value = 'failed'
    }
  }

  return { current, status, activity, operation, run, isCurrent, replace }
}
