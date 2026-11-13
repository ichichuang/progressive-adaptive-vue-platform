import { getCurrentScope, onScopeDispose, watch } from 'vue'
import type { UiFormCopy, UiFormOptionSource, UiFormSchema } from '../components/form-contracts'
import type { UiTableController, UiTableRecord } from '../components/table-contracts'
import { useUiForm } from './use-ui-form'
import { createFormValues, sameDraftValue } from './form-draft-values'

/** Filter drafts only become an applied table query on submit, unless change mode is explicit. */
export function useUiTableQuery(
  table: UiTableController,
  copy: UiFormCopy,
  sources?: Readonly<Record<string, UiFormOptionSource<UiTableRecord>>>,
) {
  const config = table.schema.query
  if (!config) throw new TypeError('Table query form configuration is required.')
  let timer: ReturnType<typeof setTimeout> | undefined
  const clear = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }
  const initial = {
    draftId: table.schema.id,
    values: createFormValues(config.form.fields, table.query.value.filters),
  }
  const form = useUiForm<UiFormSchema>({
    formId: `${table.schema.id}-query`,
    initial,
    schema: config.form,
    copy,
    ...(sources === undefined ? {} : { sources }),
    translate: (value) => table.text(value),
    onSubmit: async (values) => {
      clear()
      await table.search(values)
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
        values: createFormValues(config.form.fields, table.query.value.filters),
      })
      void completion
    },
  })
  const stopQuerySync = watch(
    () => table.query.value.filters,
    (filters, previous) => {
      if (sameDraftValue(filters, previous)) return
      clear()
      let values: UiTableRecord
      try {
        values = createFormValues(
          config.form.fields,
          Object.fromEntries(
            config.form.fields
              .filter((field) => Object.hasOwn(filters, field.name))
              .map((field) => [field.name, filters[field.name]]),
          ),
        )
      } catch {
        // Programmatic table filters may not be representable by this query form.
        // Preserve its draft rather than turning a valid table operation into a watcher error.
        return
      }
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
