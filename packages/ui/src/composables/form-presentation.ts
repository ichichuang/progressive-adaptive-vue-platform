import { computed, nextTick, useTemplateRef, watch, type Ref } from 'vue'
import type { UiFormController, UiFormKey } from '../components/form-contracts'

interface FormPresentation {
  readonly generation: Readonly<Ref<number>>
  readonly summaryRevision: Readonly<Ref<number>>
  isSummaryCurrent(revision: number): boolean
  canFocusField(name: string): boolean
  focusField(name: string): boolean
}

// The controller owns these projections and focus references. This association
// exposes no writable draft or additional lifecycle owner to presentation.
const presentations = new WeakMap<object, FormPresentation>()

export function registerFormPresentation(form: object, presentation: FormPresentation): void {
  presentations.set(form, presentation)
}

export function formPresentation(form: object): FormPresentation {
  const presentation = presentations.get(form)
  if (presentation === undefined) throw new TypeError('UiForm requires a useUiForm controller.')
  return presentation
}

export function useFormPresentation<I>(props: { readonly form: UiFormController<I> }) {
  const summary = useTemplateRef<HTMLElement>('summary')
  const presentation = computed(() => formPresentation(props.form))
  const announcement = computed(() => {
    const form = props.form
    if (form.phase.value === 'validating') return form.copy.validating()
    if (form.phase.value === 'submitting') return form.copy.submitting()
    return form.notice.value?.() ?? ''
  })
  function canFocus(name: UiFormKey<I> | null): name is UiFormKey<I> {
    if (name === null) return false
    return presentation.value.canFocusField(name)
  }
  function label(name: UiFormKey<I> | null): string {
    return name === null
      ? ''
      : (props.form.fields.find((field) => field.name === name)?.label() ?? '')
  }
  watch(
    () => presentation.value.summaryRevision.value,
    async (revision) => {
      const form = props.form
      const generation = presentation.value.generation.value
      await nextTick()
      if (
        form === props.form &&
        revision === presentation.value.summaryRevision.value &&
        presentation.value.isSummaryCurrent(revision) &&
        generation === presentation.value.generation.value &&
        !form.submitting.value &&
        form.phase.value !== 'disposed' &&
        form.issues.value.length > 0
      )
        summary.value?.focus()
    },
  )
  return { announcement, presentation, canFocus, label }
}
