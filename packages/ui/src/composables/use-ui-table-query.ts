import { getCurrentScope, onScopeDispose, watch } from 'vue'
import type {
  UiFormCopy,
  UiFormOptionSource,
  UiFormSchema,
  UiFormInput,
} from '../components/form-contracts'
import type {
  UiTableController,
  UiTableReadonlyRecord,
  UiTableRecord,
} from '../components/table-contracts'
import { invalidLocalFilters } from '../components/table-local-filters'
import { useUiForm } from './use-ui-form'
import { createFormValues, sameDraftValue } from './form-draft-values'

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
  const form = useUiForm<UiFormSchema>({
    formId: `${table.schema.id}-query`,
    initial,
    schema: config.form,
    copy,
    validation: validateQuery,
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
  )
  const dispose = () => {
    stopQuerySync()
    clear()
    form.dispose()
  }
  if (getCurrentScope()) onScopeDispose(dispose)
  return form
}
