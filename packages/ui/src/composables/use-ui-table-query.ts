import { getCurrentScope, onScopeDispose, shallowRef, watch } from 'vue'
import type {
  UiFormCopy,
  UiFormController,
  UiFormOptionSource,
  UiFormSchema,
  UiFormInput,
  UiFormProjection,
} from '../components/form-contracts'
import type {
  UiTableController,
  UiTableReadonlyRecord,
  UiTableRecord,
} from '../components/table-contracts'
import { invalidLocalFilters } from '../components/table-local-filters'
import { useUiForm } from './use-ui-form'
import { cloneDraft, createFormValues, sameDraftValue } from './form-draft-values'

/** Filter drafts only become an applied table query on submit, unless change mode is explicit. */
export function useUiTableQuery(
  table: UiTableController,
  copy: UiFormCopy,
  sources?: Readonly<Record<string, UiFormOptionSource<UiTableRecord>>>,
  validation?: UiFormInput<UiTableRecord>['validation'],
) {
  const config = table.schema.query
  if (!config) throw new TypeError('Table query form configuration is required.')
  let timer: ReturnType<typeof setTimeout> | undefined
  const clear = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }
  const formValues = (filters: UiTableReadonlyRecord) =>
    createFormValues(
      config.form.fields,
      Object.fromEntries(
        config.form.fields
          .filter((field) => Object.hasOwn(filters, field.name))
          .map((field) => [field.name, filters[field.name]]),
      ),
    )
  const initial = {
    draftId: table.schema.id,
    values: formValues(table.query.value.filters),
  }
  const access = table.access
  const receipt = shallowRef(0)
  const projection: UiFormProjection | undefined = access && {
    session: access.context,
    mode: () => 'edit',
    canRead: () => access.context() !== undefined,
    canSubmit: () => access.context() !== undefined,
    field(path) {
      const allowed = access.filter(path)
      return { read: allowed, write: allowed }
    },
    confirmed() {
      const session = access.context()
      const generation = receipt.value
      return {
        receipt: String(generation),
        values: cloneDraft(table.query.value.filters) as UiTableRecord,
        isCurrent: () =>
          session !== undefined && access.context() === session && receipt.value === generation,
      }
    },
    async submit(operation) {
      if (!operation.isCurrent()) return 'cancelled'
      clear()
      await table.search(form.getValues())
      return table.error.value ? 'failure' : 'success'
    },
  }
  const validateQuery: NonNullable<UiFormInput<UiTableRecord>['validation']> = async (
    values,
    context,
  ) => {
    const candidate: unknown = values
    const local = invalidLocalFilters(
      candidate as Readonly<Record<string, unknown>>,
      table.schema.localFilters ?? [],
    ).map((definition) => ({
      field: definition.parameter,
      message:
        definition.invalidMessage === undefined
          ? copy.invalidValue
          : () => table.text(definition.invalidMessage ?? ''),
    }))
    const custom = (await validation?.(values, context)) ?? []
    return [...local, ...custom]
  }
  const form: UiFormController<UiTableRecord> = useUiForm<UiFormSchema>({
    formId: `${table.schema.id}-query`,
    initial: projection ? { draftId: initial.draftId, values: undefined } : initial,
    schema: config.form,
    copy,
    validation: validateQuery,
    ...(projection === undefined ? {} : { projection }),
    ...(sources === undefined ? {} : { sources }),
    translate: (value) => table.text(value),
    onSubmit: async (values) => {
      clear()
      await table.search({ ...table.query.value.filters, ...values })
      return table.error.value
        ? { status: 'failure', message: copy.submitFailed }
        : { status: 'success' }
    },
    onChange: () => {
      if (config.mode !== 'change') return
      clear()
      timer = setTimeout(() => {
        void form.submit()
      }, config.debounce ?? 250)
    },
    onReset: () => {
      clear()
      const completion = table.reset()
      if (projection) {
        void completion
        return
      }
      form.replaceInitial({
        draftId: table.schema.id,
        values: formValues(table.query.value.filters),
      })
      void completion
    },
  })
  const stopQuerySync = watch(
    () => table.query.value.filters,
    (filters, previous) => {
      if (sameDraftValue(filters, previous)) return
      if (projection) {
        if (!form.submitting.value || !sameDraftValue(filters, form.getValues())) {
          clear()
          receipt.value++
        }
        return
      }
      let values: UiTableRecord
      try {
        values = formValues(filters)
        if (sameDraftValue(values, formValues(previous))) return
      } catch {
        // Programmatic table filters may not be representable by this query form.
        // Preserve its draft rather than turning a valid table operation into a watcher error.
        return
      }
      clear()
      if (sameDraftValue(values, form.values.value)) return
      form.replaceInitial({
        draftId: table.schema.id,
        values,
      })
    },
    { flush: 'sync' },
  )
  const dispose = () => {
    stopQuerySync()
    clear()
    form.dispose()
  }
  if (getCurrentScope()) onScopeDispose(dispose)
  return form
}
