import {
  computed,
  effectScope,
  getCurrentInstance,
  getCurrentScope,
  onDeactivated,
  onScopeDispose,
  shallowRef,
  watch,
  type EffectScope,
} from 'vue'
import type {
  UiFormController,
  UiFormCopy,
  UiFormInput,
  UiFormNode,
  UiFormOptionSource,
  UiFormSchema,
  UiFormReadonlyValue,
  UiFormValue,
} from '../components/form-contracts'
import type {
  UiTableController,
  UiTableEditorAccess,
  UiTableEditorMode,
  UiTableRecord,
  UiTableReadonlyRecord,
  UiTableTransport,
} from '../components/table-contracts'
import { useUiForm } from './use-ui-form'
import { resolveUiTableRequest } from '../components/table-request'
import { parseInlineFormScope } from '../components/table-inline-form'
import { cloneDraft, freezeDraftValue, getFormValue } from './form-draft-values'

export interface UiTableFormInput {
  readonly table: UiTableController
  readonly transport?: UiTableTransport
  readonly access?: UiTableEditorAccess
  readonly copy: UiFormCopy
  readonly sources?: Readonly<Record<string, UiFormOptionSource<UiTableRecord>>>
  /** Trusted attachment services named by the editor form schema, never part of the JSON. */
  readonly attachments?: NonNullable<UiFormInput<UiTableRecord>['attachments']>
  readonly context?: UiTableReadonlyRecord
}
export interface UiTableFormScope {
  /** Independent top-level fields of an existing row to edit in place. The original record supplies untouched request values. */
  readonly fields: readonly string[]
}
/** Shared form session for inline, modal, drawer and route hosts. Never manufactures mutation success. */
export function useUiTableForm(input: UiTableFormInput) {
  const configuration = input.table.schema.editor
  if (!configuration) throw new TypeError('Table editor configuration is required.')
  if (input.table.access && !input.access)
    throw new TypeError('A controlled table requires a guarded editor.')
  const editor = configuration
  const form = shallowRef<UiFormController<UiTableRecord> | null>(null)
  const row = shallowRef<UiTableReadonlyRecord | null>(null)
  const controlledKey = shallowRef<UiTableReadonlyRecord[string]>()
  const currentRow = computed(() =>
    input.access
      ? (input.table.rows.value.find(
          (record) => getFormValue(record, input.table.schema.rowKey) === controlledKey.value,
        ) ?? null)
      : row.value,
  )
  const mode = shallowRef<'create' | 'edit' | 'detail'>('create')
  const loading = shallowRef(false)
  const error = shallowRef<Error | null>(null)
  const open = shallowRef(false)
  const inlineFields = shallowRef<readonly string[]>([])
  let active: AbortController | undefined
  let sequence = 0
  let disposed = false
  let stopSubmission: (() => void) | undefined
  let formScope: EffectScope | undefined
  const context = cloneDraft(input.context ?? {})
  function current(ticket: number, signal: AbortSignal): boolean {
    return !disposed && ticket === sequence && !signal.aborted
  }
  function fieldsOnly(fields: readonly UiFormNode[], record: UiTableReadonlyRecord): UiTableRecord {
    const result: UiTableRecord = {}
    for (const field of fields) {
      if (!Object.hasOwn(record, field.name)) continue
      const value = record[field.name]
      if (value === undefined) continue
      if (
        field.kind === 'group' &&
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      )
        result[field.name] = fieldsOnly(field.fields, value as UiTableReadonlyRecord)
      else if (field.kind === 'repeat' && Array.isArray(value))
        result[field.name] = value.map((item: UiFormReadonlyValue) =>
          typeof item === 'object' && item !== null && !Array.isArray(item)
            ? fieldsOnly(field.fields, item as UiTableReadonlyRecord)
            : (cloneDraft(item) as UiFormValue),
        )
      else result[field.name] = cloneDraft(value) as UiFormValue
    }
    return result
  }
  function close(force = false): boolean {
    if (form.value?.submitting.value && !(force && input.access)) return false
    if (open.value && !force && form.value?.hasUnsavedChanges.value) return false
    ++sequence
    active?.abort()
    open.value = false
    inlineFields.value = []
    loading.value = false
    if (editor.presentation === 'page' || input.access) release()
    return true
  }
  // Overlay hosts release only after their leave transition. A reopened session
  // must never be released by a previous overlay's delayed after-leave event.
  function release(): void {
    if (open.value) return
    stopSubmission?.()
    stopSubmission = undefined
    formScope?.stop()
    formScope = undefined
    form.value?.dispose()
    form.value = null
    controlledKey.value = undefined
  }
  function canOpen(
    nextMode: UiTableEditorMode,
    record: UiTableReadonlyRecord,
    fields?: readonly string[],
  ): boolean {
    return !disposed && input.access?.canOpen(nextMode, record, fields) !== false
  }
  async function show(
    nextMode: 'create' | 'edit' | 'detail',
    recordInput: UiTableReadonlyRecord = {},
    scope?: UiTableFormScope,
  ): Promise<boolean> {
    if (!canOpen(nextMode, recordInput, scope?.fields) || !close()) return false
    release()
    const selected = input.access ? recordInput : cloneDraft(recordInput)
    if (!input.access) freezeDraftValue<unknown>(selected)
    if (input.access) controlledKey.value = getFormValue(selected, input.table.schema.rowKey)
    else row.value = selected
    const ticket = ++sequence
    active = new AbortController()
    const signal = active.signal
    mode.value = nextMode
    open.value = true
    loading.value = true
    error.value = null
    try {
      if (scope !== undefined && nextMode !== 'edit')
        throw new TypeError('Scoped table forms only support editing existing rows.')
      const fields = scope === undefined ? undefined : [...scope.fields]
      const schema = fields === undefined ? editor.form : parseInlineFormScope(editor.form, fields)
      const names = fields === undefined ? undefined : new Set(fields)
      if (input.access) {
        formScope = effectScope(true)
        const guarded = formScope.run(() =>
          input.access?.prepare({ mode: nextMode, row: selected, schema, signal }),
        )
        if (guarded?.form.persistence !== 'disabled')
          throw new TypeError('A controlled editor requires a non-persistent guarded form.')
        form.value = guarded.form
        if (fields !== undefined) inlineFields.value = fields
        if (guarded.readState) {
          formScope.run(() =>
            watch(
              () => guarded.readState?.(),
              (state) => {
                if (!current(ticket, signal)) return
                loading.value = state === 'pending'
                if (state === 'unavailable')
                  error.value = new Error('Controlled record is unavailable.')
              },
              { flush: 'sync', immediate: true },
            ),
          )
        } else loading.value = false
        stopSubmission = watch(
          guarded.form.submitting,
          (submitting) => {
            if (
              !submitting &&
              guarded.acknowledged() &&
              !guarded.form.hasUnsavedChanges.value &&
              guarded.form.notice.value === guarded.form.copy.submitSucceeded &&
              ticket === sequence
            ) {
              close(true)
              void input.table.refresh()
            }
          },
          { flush: 'post' },
        )
        return true
      }
      let record = selected
      if (nextMode !== 'create' && editor.detail) {
        if (!input.transport?.detail) throw new TypeError('Detail transport is required.')
        record = await input.transport.detail(
          resolveUiTableRequest(editor.detail, {
            ...input.table.query.value,
            context,
            row: selected,
            form: {},
          }),
          signal,
        )
      }
      if (!current(ticket, signal)) return false
      const baseline = fieldsOnly(
        editor.form.fields.filter((field) => !names?.has(field.name)),
        record,
      )
      let saved = false
      const session = useUiForm<UiFormSchema>({
        formId: `${input.table.schema.id}-editor`,
        schema,
        initial: {
          draftId: `${input.table.schema.id}-${String(ticket)}`,
          values: fieldsOnly(schema.fields, record),
        },
        copy: input.copy,
        ...(input.sources === undefined ? {} : { sources: input.sources }),
        ...(input.attachments === undefined ? {} : { attachments: input.attachments }),
        translate: (value) => input.table.text(value),
        onSubmit: async (values, work) => {
          if (saved || !current(ticket, work.signal) || !open.value)
            return { status: 'failure', message: input.copy.submitFailed }
          const request =
            nextMode === 'create' ? editor.create : nextMode === 'edit' ? editor.update : undefined
          if (!request || !input.transport?.mutate)
            return { status: 'failure', message: input.copy.submitFailed }
          try {
            await input.transport.mutate(
              resolveUiTableRequest(request, {
                ...input.table.query.value,
                context,
                row: selected,
                form: names ? { ...baseline, ...values } : values,
              }),
              work.signal,
            )
            if (!current(ticket, work.signal))
              return { status: 'failure', message: input.copy.submitFailed }
            saved = true
            await input.table.refresh()
            return { status: 'success' }
          } catch {
            return { status: 'failure', message: input.copy.submitFailed }
          }
        },
      })
      form.value = session
      if (fields !== undefined) inlineFields.value = fields
      stopSubmission = watch(
        session.submitting,
        (submitting) => {
          if (!submitting && saved && ticket === sequence) close(true)
        },
        { flush: 'post' },
      )
      return true
    } catch (cause) {
      if (current(ticket, signal)) {
        error.value = cause instanceof Error ? cause : new Error('Table detail request failed.')
        if (input.access) {
          formScope?.stop()
          formScope = undefined
          controlledKey.value = undefined
        }
        if (scope !== undefined) {
          close(true)
          release()
          row.value = null
        }
      }
      return false
    } finally {
      if (ticket === sequence && (!input.access || form.value === null)) loading.value = false
    }
  }
  async function showInline(record: UiTableReadonlyRecord, field?: string): Promise<boolean> {
    const inline = editor.inline
    if (!inline) throw new TypeError('Inline editor configuration is required.')
    if (open.value || disposed) return false
    const fields = field === undefined ? inline.fields : [field]
    if (fields.some((name) => !inline.fields.includes(name)))
      throw new TypeError('The field is not configured for inline editing.')
    return show('edit', record, { fields })
  }
  function isInlineEditing(record: UiTableReadonlyRecord, field: string): boolean {
    return (
      open.value &&
      inlineFields.value.includes(field) &&
      currentRow.value !== null &&
      getFormValue(record, input.table.schema.rowKey) ===
        getFormValue(currentRow.value, input.table.schema.rowKey)
    )
  }
  async function saveInline() {
    if (!inlineFields.value.length || !form.value) return undefined
    const session = form.value
    const ticket = sequence
    const result = await session.submit()
    if (ticket !== sequence || form.value !== session) return result
    if (result === 'invalid') {
      const first = session.issues.value.find((issue) => issue.field !== null)
      if (first?.field) session.focusField(first.field)
    }
    if (!open.value) release()
    return result
  }
  async function remove(
    row: UiTableReadonlyRecord,
    confirm: () => boolean | Promise<boolean>,
  ): Promise<boolean> {
    if (
      disposed ||
      open.value ||
      loading.value ||
      form.value?.submitting.value ||
      (!input.access && (!editor.remove || !input.transport?.mutate))
    )
      return false
    if (input.access) {
      const origin = input.table.access?.context()
      const operation = new AbortController()
      active?.abort()
      active = operation
      const ticket = ++sequence
      const ownsRemoval = () =>
        current(ticket, operation.signal) && input.table.access?.context() === origin
      loading.value = true
      error.value = null
      try {
        const removed = await input.access.remove?.(row, confirm, operation.signal)
        if (!removed || !ownsRemoval()) return false
        await input.table.refresh()
        return ownsRemoval()
      } catch {
        if (ownsRemoval()) error.value = new Error('Controlled table removal failed.')
        return false
      } finally {
        if (ownsRemoval()) loading.value = false
      }
    }
    if (!editor.remove || !input.transport?.mutate) return false
    const selected = cloneDraft(row)
    const query = input.table.query.value
    const controller = new AbortController()
    active?.abort()
    active = controller
    const ticket = ++sequence
    loading.value = true
    error.value = null
    try {
      if (!(await confirm()) || !current(ticket, controller.signal)) return false
      await input.transport.mutate(
        resolveUiTableRequest(editor.remove, {
          ...query,
          context,
          row: selected,
          form: {},
        }),
        controller.signal,
      )
      if (!current(ticket, controller.signal)) return false
      await input.table.refresh()
      return true
    } catch (cause) {
      if (current(ticket, controller.signal))
        error.value = cause instanceof Error ? cause : new Error('Table removal failed.')
      return false
    } finally {
      if (ticket === sequence) loading.value = false
    }
  }
  function dispose() {
    disposed = true
    stopSubmission?.()
    stopSubmission = undefined
    ++sequence
    active?.abort()
    formScope?.stop()
    formScope = undefined
    form.value?.dispose()
    form.value = null
    row.value = null
    loading.value = false
    open.value = false
  }
  if (input.access) {
    if (getCurrentInstance())
      onDeactivated(() => {
        close(true)
      })
    const access = input.table.access
    if (access)
      watch(
        access.context,
        () => {
          close(true)
        },
        { flush: 'sync' },
      )
  }
  if (getCurrentScope()) onScopeDispose(dispose)
  return {
    form: computed(() => form.value),
    row: currentRow,
    mode: computed(() => mode.value),
    open: computed(() => open.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    presentation: editor.presentation ?? 'modal',
    modal: editor.modal,
    inlineFields: computed(() => inlineFields.value),
    canOpen,
    showInline,
    isInlineEditing,
    saveInline,
    show,
    remove,
    close,
    release,
    dispose,
  }
}
