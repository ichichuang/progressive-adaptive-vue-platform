import {
  parseUiFormSchema,
  useUiForm,
  type UiFormInput,
  type UiFormProjectedOperation,
  type UiFormProjection,
  type UiFormReadonlyValue,
  type UiFormSchema,
  type UiFormSchemaValues,
} from '@platform/ui'
import { onScopeDispose, shallowRef, watch } from 'vue'

import type {
  AccessBoundary,
  AccessProposal,
  AccessRequest,
  AccessState,
} from '../access/access-contract'
import {
  executeGuardedAction,
  type ActionTarget,
  type GuardedAction,
} from '../access/guarded-action'
import {
  observeNativeRequirement,
  type NativeAccessRequirement,
} from '../access/native-requirement'

type Target = ActionTarget & { readonly mode: 'create' | 'edit' | 'detail' }
type FieldActions = Readonly<{ read?: string; write?: string }>
type Operation = 'create' | 'edit'
interface Source {
  readonly domain: string
  readonly resource: string
  readonly scope: NativeAccessRequirement['scope']
  readonly fields: Readonly<Record<string, Readonly<Partial<Record<Operation, FieldActions>>>>>
  /** Listed governs declared paths. All also closes every unregistered schema path. */
  readonly selection: 'listed' | 'all'
}
type Patch = UiFormProjectedOperation['patch']
type Payload = Readonly<Record<string, UiFormReadonlyValue>>

interface GuardedFormInput<S extends UiFormSchema> {
  readonly form: Pick<
    UiFormInput<UiFormSchemaValues<S>>,
    'formId' | 'copy' | 'translate' | 'sources' | 'attachments'
  > & { readonly schema: S }
  readonly access: AccessBoundary
  readonly source: Source
  /** An existing record or an actual host-reserved creation ID. Empty IDs never dispatch. */
  readonly target: () => Target | undefined
  readonly confirmed: (target: Target) => ReturnType<UiFormProjection['confirmed']>
  readonly recordRead?: (target: Target) => NativeAccessRequirement
  readonly action: (
    patch: Patch,
    payload: Payload,
  ) => Omit<GuardedAction<'acknowledged'>, 'requirement'>
  readonly recordWrite: (target: Target) => NativeAccessRequirement
  readonly submitRequirement?: (target: Target) => NativeAccessRequirement
  readonly proposal?: (payload: Payload, target: Target) => AccessProposal | undefined
  readonly businessAllows?: (target: Target) => boolean
  readonly customFields?: readonly string[]
  readonly validate?: UiFormProjection['validate']
  /** Replacement APIs must explicitly provide a host-supported adapter. */
  readonly payload?: (patch: Patch, target: Target) => Payload | undefined
}

type Observe = ReturnType<typeof observeNativeRequirement>
interface FieldCheck {
  readonly read?: Observe
  readonly write?: Observe
}
type FieldStatus = AccessState['status'] | 'unsupported-collection' | 'unregistered-field'

/** Attach exact WP-03 requirements to an existing UiForm owner and submit through WP-05. */
export function useGuardedForm<const S extends UiFormSchema>(input: GuardedFormInput<S>) {
  const { access } = input
  const source = Object.freeze({
    ...input.source,
    fields: Object.freeze(
      Object.fromEntries(
        Object.entries(input.source.fields).map(([path, modes]) => [
          path,
          Object.freeze({
            ...(modes.create === undefined ? {} : { create: Object.freeze({ ...modes.create }) }),
            ...(modes.edit === undefined ? {} : { edit: Object.freeze({ ...modes.edit }) }),
          }),
        ]),
      ),
    ),
  })
  const schema = parseUiFormSchema(input.form.schema)
  const declared = new Set<string>()
  const unsupported = new Set<string>()
  const unregistered = new Set<string>()
  function visit(nodes: UiFormSchema['fields'], prefix = ''): void {
    for (const node of nodes) {
      const path = prefix ? prefix + '.' + node.name : node.name
      if (node.kind === 'group') {
        if (Object.hasOwn(source.fields, path)) unregistered.add(path)
        visit(node.fields, path)
      } else if (node.kind === 'repeat') {
        if (
          source.selection === 'all' ||
          Object.keys(source.fields).some((leaf) => leaf === path || leaf.startsWith(path + '.'))
        )
          unsupported.add(path)
      } else if (Object.hasOwn(source.fields, path)) declared.add(path)
      else if (source.selection === 'all') unregistered.add(path)
    }
  }
  visit(schema.fields)
  for (const path of Object.keys(source.fields))
    if (
      !declared.has(path) &&
      ![...unsupported].some((root) => path === root || path.startsWith(root + '.'))
    )
      unregistered.add(path)

  const binding = shallowRef<{
    target: Target
    context: Extract<ReturnType<AccessBoundary['readContext']>, { status: 'ready' }>['snapshot']
    read?: Observe
    write: Observe
    fields: ReadonlyMap<string, FieldCheck>
  }>()
  const clock = shallowRef(0)
  const watches = new Set<Observe>()
  const pending = new Set<Observe>()
  let running = true
  let deadline: ReturnType<typeof setTimeout> | undefined
  const isAllowed = (check: Observe | undefined) => check?.permit()?.isCurrent() === true

  function arm(): void {
    clearTimeout(deadline)
    if (!running) return
    const expiresAt = Math.min(
      binding.value?.context.expiresAt ?? Infinity,
      ...[...watches].map((check) => check.permit()?.expiresAt ?? Infinity),
    )
    if (Number.isFinite(expiresAt))
      deadline = setTimeout(
        () => {
          clock.value++
          arm()
        },
        Math.min(2147483647, Math.max(1, expiresAt - Date.now())),
      )
  }
  function refresh(check: Observe): void {
    if (!watches.has(check)) return
    pending.add(check)
    queueMicrotask(() => {
      if (!watches.has(check) || !pending.delete(check)) return
      void check.evaluate().finally(arm)
    })
  }
  function observe(requirement: NativeAccessRequirement | undefined, target?: Target): Observe {
    const invalidated = () => {
      // All affected leaf generations have already retired in WP-02.
      clock.value++
      refresh(check)
    }
    const matches =
      target === undefined ||
      !requirement?.requests.some(
        (request) =>
          (request.kind === 'record' || request.kind === 'field') && request.recordId !== target.id,
      )
    const check = observeNativeRequirement(access, matches ? requirement : undefined, invalidated)
    watches.add(check)
    refresh(check)
    return check
  }
  function makeField(target: Target, path: string, action?: string): Observe | undefined {
    if (action === undefined) return undefined
    const request: AccessRequest = {
      kind: 'field',
      domain: source.domain,
      resource: source.resource,
      recordId: target.id,
      fieldPath: path,
      action,
    }
    return observe({ operator: 'all', scope: source.scope, requests: [request] })
  }
  function reset(): void {
    clearTimeout(deadline)
    const previous = [...watches]
    watches.clear()
    pending.clear()
    binding.value = undefined
    for (const check of previous) check.dispose()
  }
  function targetParts() {
    const target = input.target()
    return [target?.id, target?.mode, target?.revision, target?.idempotencyKey] as const
  }
  const stop = watch(
    [() => access.readContext(), ...[0, 1, 2, 3].map((index) => () => targetParts()[index])],
    () => {
      reset()
      const context = access.readContext()
      const supplied = input.target()
      if (context.status !== 'ready' || !supplied?.id) return
      const target = Object.freeze({ ...supplied })
      const mode = target.mode === 'create' ? 'create' : 'edit'
      const read =
        input.recordRead === undefined ? undefined : observe(input.recordRead(target), target)
      const write = observe(input.recordWrite(target), target)
      binding.value = {
        context: context.snapshot,
        target,
        ...(read === undefined ? {} : { read }),
        write,
        fields: new Map(
          [...declared].map((path) => {
            const actions = source.fields[path]?.[mode]
            const read = makeField(target, path, actions?.read)
            const write = makeField(target, path, actions?.write)
            return [
              path,
              {
                ...(read === undefined ? {} : { read }),
                ...(write === undefined ? {} : { write }),
              },
            ]
          }),
        ),
      }
      arm()
    },
    { immediate: true, flush: 'sync' },
  )
  const current = () => {
    void clock.value
    const owner = binding.value
    const context = access.readContext()
    const target = input.target()
    if (
      owner === undefined ||
      context.status !== 'ready' ||
      owner.context !== context.snapshot ||
      target?.id !== owner.target.id ||
      target.mode !== owner.target.mode ||
      target.revision !== owner.target.revision ||
      target.idempotencyKey !== owner.target.idempotencyKey
    )
      return undefined
    return owner
  }
  const mayRead = () => {
    const owner = current()
    return owner !== undefined && (owner.read === undefined || isAllowed(owner.read))
  }
  const mayWrite = () => {
    const owner = current()
    return (
      owner !== undefined &&
      owner.target.mode !== 'detail' &&
      isAllowed(owner.write) &&
      input.businessAllows?.(owner.target) !== false
    )
  }
  const field = (path: string) => {
    if (unsupported.has(path) || unregistered.has(path)) return { read: false, write: false }
    if (!declared.has(path)) return undefined
    const checks = current()?.fields.get(path)
    return {
      read: mayRead() && isAllowed(checks?.read),
      write: mayWrite() && isAllowed(checks?.write),
    }
  }
  const projection: UiFormProjection = {
    session: current,
    mode: () => current()?.target.mode ?? 'edit',
    field,
    confirmed: () => {
      const owner = current()
      return owner && mayRead() ? input.confirmed(owner.target) : undefined
    },
    canRead: mayRead,
    canSubmit: mayWrite,
    ...(input.customFields === undefined
      ? {}
      : { customFields: Object.freeze([...input.customFields]) }),
    ...(input.validate === undefined ? {} : { validate: input.validate }),
    async submit(operation) {
      const owner = current()
      if (!owner || !operation.isCurrent()) return 'cancelled'
      const payload =
        input.payload === undefined ? operation.patch : input.payload(operation.patch, owner.target)
      if (payload === undefined) return 'failure'
      const proposal = input.proposal?.(payload, owner.target)
      const target = proposal === undefined ? owner.target : { ...owner.target, proposal }
      const action = input.action(operation.patch, payload)
      const eligible = (): boolean => current() === owner && operation.isCurrent() && mayWrite()
      const [result] = await executeGuardedAction(
        access,
        {
          ...action,
          requirement: () =>
            input.submitRequirement?.(owner.target) ?? input.recordWrite(owner.target),
          isTargetCurrent: (target) => eligible() && action.isTargetCurrent(target),
          businessAllows: (target) => eligible() && action.businessAllows(target),
          apply(acknowledgement: unknown, command) {
            if (acknowledgement !== 'acknowledged')
              throw new TypeError('A form command requires acknowledgement.')
            action.apply?.(acknowledgement, command)
            return undefined
          },
        },
        { signal: operation.signal, targets: [target] },
      )
      if (!eligible()) return 'cancelled'
      return result?.status === 'completed' && result.applied ? 'success' : 'failure'
    },
  }
  const form = useUiForm({
    ...input.form,
    initial: { draftId: input.form.formId, values: undefined },
    projection,
  })
  function dispose(): void {
    if (!running) return
    running = false
    stop()
    form.dispose()
    reset()
  }
  onScopeDispose(dispose, true)
  function status(path: string, access: 'read' | 'write'): FieldStatus {
    if (unsupported.has(path)) return 'unsupported-collection'
    if (unregistered.has(path)) return 'unregistered-field'
    const owner = current()
    const check = owner?.fields.get(path)?.[access]
    return check?.read().status ?? 'configuration-error'
  }
  return Object.freeze({
    form,
    fieldStatus: status,
    dispose,
  })
}
