import { effectScope, getCurrentScope, onScopeDispose, shallowRef, shallowReadonly } from 'vue'
import type {
  UiFormInput,
  UiFormSchema,
  UiFormSchemaValues,
  UiFormController,
} from '../components/form-contracts'
import { parseUiFormSchema } from '../components/form-schema'
import { migrateFormValues, type UiFormMigrationPolicy } from '../components/form-value-migration'
import { sameDraftValue, createFormValues } from './form-draft-values'
import { useUiForm } from './use-ui-form'

type Values = UiFormSchemaValues<UiFormSchema>
type Runtime = Pick<UiFormInput<Values>, 'sources' | 'attachments' | 'validation'>
export interface UiDynamicFormInput extends UiFormInput<Values> {
  readonly migrationPolicy?: UiFormMigrationPolicy
  readonly resolveRuntime?: (schema: UiFormSchema) => Runtime
  readonly onReplaced?: (event: {
    readonly previous: UiFormController<Values>
    readonly current: UiFormController<Values>
  }) => void
}
export type UiDynamicFormReplacement =
  | { readonly status: 'applied'; readonly resetFields: readonly string[] }
  | { readonly status: 'unchanged' | 'blocked' | 'cancelled' | 'disposed' }

/** Schema changes replace one controller lifetime, never mutate a typed controller in place. */
export function useUiDynamicForm(input: UiDynamicFormInput) {
  let disposed = false
  const isDisposed = () => disposed
  let attempt = 0
  let publishing = false
  interface Lifetime {
    form: UiFormController<Values>
    publish(): void
    stop(): void
  }
  function create(schema: UiFormSchema, initial: UiFormInput<Values>['initial']): Lifetime {
    const scope = effectScope()
    let published = false
    try {
      const configuration: UiFormInput<Values> = {
        ...input,
        ...input.resolveRuntime?.(schema),
        schema,
        initial,
        onChange: (event) => {
          if (published && !disposed) input.onChange?.(event)
        },
        onBlur: (event) => {
          if (published && !disposed) input.onBlur?.(event)
        },
        onReset: (value) => {
          if (published && !disposed) input.onReset?.(value)
        },
      }
      const form = scope.run<UiFormController<Values>>(() => useUiForm<UiFormSchema>(configuration))
      if (!form) throw new TypeError('Dynamic form scope is unavailable.')
      return {
        form,
        publish: () => {
          published = true
        },
        stop: () => {
          published = false
          scope.stop()
        },
      }
    } catch (error) {
      scope.stop()
      throw error
    }
  }
  let active = create(parseUiFormSchema(input.schema), input.initial)
  active.publish()
  const form = shallowRef<UiFormController<Values>>(active.form)
  const blocked = () =>
    form.value.hasPendingInput.value ||
    form.value.submitting.value ||
    form.value.loadState.value === 'loading'
  async function replaceSchema(value: unknown): Promise<UiDynamicFormReplacement> {
    if (disposed) return { status: 'disposed' }
    if (publishing || blocked()) return { status: 'blocked' }
    const schema = parseUiFormSchema(value)
    if (sameDraftValue(schema, form.value.schema)) return { status: 'unchanged' }
    const id = ++attempt
    const previous = active
    const revision = previous.form.revision.value
    const initial = previous.form.getInitial()
    const defaults = createFormValues(schema.fields)
    const oldDefaults = createFormValues(previous.form.schema.fields)
    const reset: string[] = []
    const migrate = (values: Values) =>
      migrateFormValues(
        previous.form.schema.fields,
        schema.fields,
        values,
        oldDefaults,
        defaults,
        reset,
        input.migrationPolicy,
      )
    const next = create(schema, { draftId: initial.draftId, values: migrate(initial.values) })
    try {
      next.form.replaceValues(migrate(previous.form.getValues()))
      const index = previous.form.activeStepIndex.value
      const name = index === null ? undefined : previous.form.schema.steps?.[index]?.name
      const nextIndex = schema.steps?.findIndex((step) => step.name === name) ?? -1
      if (nextIndex >= 0) await next.form.setActiveStep(nextIndex, { relax: true })
      if (
        isDisposed() ||
        id !== attempt ||
        active !== previous ||
        previous.form.revision.value !== revision ||
        blocked()
      ) {
        next.stop()
        return { status: 'cancelled' }
      }
      publishing = true
      active = next
      next.publish()
      try {
        form.value = next.form
        input.onReplaced?.({ previous: previous.form, current: next.form })
      } finally {
        try {
          previous.stop()
        } finally {
          publishing = false
        }
      }
      return { status: 'applied', resetFields: Object.freeze([...new Set(reset)]) }
    } catch (error) {
      if (active !== next) next.stop()
      throw error
    }
  }
  function dispose() {
    if (disposed) return
    disposed = true
    attempt += 1
    active.stop()
  }
  if (getCurrentScope()) onScopeDispose(dispose)
  return { form: shallowReadonly(form), replaceSchema, dispose }
}
