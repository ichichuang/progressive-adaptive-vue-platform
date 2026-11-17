import {
  type UiFormSchema,
  type UiTableEditorAccess,
  type UiTableEditorMode,
  type UiTableReadonlyRecord,
  type UiTableRecord,
} from '@platform/ui'
import { onScopeDispose, shallowRef, watch } from 'vue'
import type { BoundAccessRequest } from '../access/access-contract'
import { useGuardedForm } from '../forms/use-guarded-form'
import { createScopedApiRead } from '../api/scoped-api-read'
import {
  observeNativeRequirement,
  type NativeAccessRequirement,
} from '../access/native-requirement'
import {
  executeGuardedAction,
  type ActionTarget,
  type GuardedAction,
} from '../access/guarded-action'

type FormDefinition = Parameters<typeof useGuardedForm<UiFormSchema>>[0]
type AccessContextSnapshot = BoundAccessRequest['context']
type EditorTarget = NonNullable<ReturnType<FormDefinition['target']>>
type ScopedRecord = Omit<
  Parameters<typeof createScopedApiRead<UiTableReadonlyRecord>>[1],
  'requirement'
>

interface GuardedEditorInput extends Omit<FormDefinition, 'form' | 'target' | 'confirmed'> {
  readonly form: Omit<FormDefinition['form'], 'schema'>
  readonly target: (mode: UiTableEditorMode, row: UiTableReadonlyRecord) => ActionTarget | undefined
  readonly read: (target: EditorTarget) => ScopedRecord
  readonly canOpen: UiTableEditorAccess['canOpen']
  readonly remove?: GuardedAction<unknown>
  /** Bound to the current controlled route instance by its workspace owner. */
  readonly onRecordUnavailable?: () => void
}

function exactRecord(
  requirement: NativeAccessRequirement | undefined,
  target: EditorTarget,
  source: FormDefinition['source'],
): NativeAccessRequirement {
  if (
    requirement === undefined ||
    requirement.requests.length === 0 ||
    requirement.requests.some(
      (request) =>
        request.kind !== 'record' ||
        request.recordId !== target.id ||
        request.domain !== source.domain ||
        request.resource !== source.resource,
    )
  )
    throw new TypeError('Controlled editing requires an exact record requirement.')
  return requirement
}

export function createGuardedTableEditor(input: GuardedEditorInput): UiTableEditorAccess {
  const { access } = input
  const context = () => {
    const current = access.readContext()
    return current.status === 'ready' ? current.snapshot : undefined
  }
  return {
    canOpen: (mode, row, fields) => context() !== undefined && input.canOpen(mode, row, fields),
    prepare({ mode, row, schema, signal }) {
      const origin = context()
      const candidate = input.target(mode, row)
      if (!origin || !candidate?.id || signal.aborted)
        throw new TypeError('A confirmed editor target is required.')
      const target = Object.freeze({ ...candidate, mode })
      const session = shallowRef<AccessContextSnapshot | undefined>(origin)
      const receipt = shallowRef<ReturnType<FormDefinition['confirmed']>>()
      const lostRecord = shallowRef(false)
      const readState = shallowRef<'pending' | 'ready' | 'unavailable'>(
        mode === 'create' ? 'ready' : 'pending',
      )
      let acknowledged = false
      const isCurrent = (): boolean =>
        !signal.aborted && session.value === origin && context() === origin && !lostRecord.value
      function withdraw(): void {
        readState.value = 'unavailable'
        receipt.value = undefined
        lostRecord.value = true
        session.value = undefined
        input.onRecordUnavailable?.()
      }
      const stopContext = watch(
        context,
        (current) => {
          if (current !== origin) withdraw()
        },
        { flush: 'sync' },
      )
      const guarded = useGuardedForm({
        ...input,
        form: { ...input.form, schema },
        target: () => (isCurrent() ? target : undefined),
        confirmed: () => receipt.value,
        recordWrite: (candidate) => {
          const requirement = input.recordWrite(candidate)
          return candidate.mode === 'edit'
            ? exactRecord(requirement, candidate, input.source)
            : requirement
        },
        businessAllows: (candidate) =>
          (mode === 'create' || receipt.value?.isCurrent() === true) &&
          input.businessAllows?.(candidate) !== false,
        action(patch, payload) {
          const action = input.action(patch, payload)
          return {
            ...action,
            isTargetCurrent: (candidate) => isCurrent() && action.isTargetCurrent(candidate),
            apply(value, command) {
              action.apply?.(value, command)
              acknowledged = true
              return undefined
            },
          }
        },
      })
      onScopeDispose(() => {
        stopContext()
        session.value = undefined
        receipt.value = undefined
      })
      if (mode !== 'create') {
        const requirement = exactRecord(input.recordRead?.(target), target, input.source)
        const definition = input.read(target)
        const read = createScopedApiRead(access, {
          ...definition,
          requirement: () => requirement,
          clearDerived() {
            receipt.value = undefined
            definition.clearDerived?.()
            return undefined
          },
        })
        let reloading = false
        const recordCheck = observeNativeRequirement(access, requirement, () => {
          receipt.value = undefined
          readState.value = 'pending'
          queueMicrotask(() => {
            if (isCurrent()) void load()
          })
        })
        onScopeDispose(recordCheck.dispose)
        async function load() {
          if (reloading || !isCurrent()) return
          reloading = true
          try {
            await recordCheck.evaluate()
            if (!isCurrent()) return
            if (recordCheck.permit()?.isCurrent() !== true) {
              withdraw()
              return
            }
            const result = await read.run({ id: target.id }, signal)
            const answer = read.state.value
            if (!isCurrent()) return
            if (result !== 'ready' || answer.status !== 'ready') {
              if (result !== 'stale') withdraw()
              return
            }
            receipt.value = {
              receipt: answer.requestId,
              values: structuredClone(answer.data) as UiTableRecord,
              isCurrent: () => isCurrent() && read.isCurrent(answer.requestId),
            }
            readState.value = 'ready'
          } finally {
            reloading = false
          }
        }
        void load().catch(() => {
          if (isCurrent()) withdraw()
        })
      }
      return {
        form: guarded.form,
        acknowledged: () => acknowledged && isCurrent(),
        readState: () => readState.value,
      }
    },
    async remove(row, confirm) {
      const target = input.target('edit', row)
      if (!target || !input.remove) return false
      const operation = new AbortController()
      const [outcome] = await executeGuardedAction(access, input.remove, {
        targets: [target],
        signal: operation.signal,
        confirm: () => confirm(),
      })
      return outcome?.status === 'completed' && outcome.applied === true
    },
  }
}
