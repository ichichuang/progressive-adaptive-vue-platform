import { computed, type Ref } from 'vue'
import type { UiFormController, UiFormAttachmentSource } from '../components/form-contracts'

interface FormPresentation {
  attachmentSource(name: string): UiFormAttachmentSource

  readonly generation: Readonly<Ref<number>>
  readonly feedbackTarget: Readonly<
    Ref<{ readonly identity: symbol; readonly revision: number } | null>
  >
  isFeedbackCurrent(revision: number): boolean
  requestFeedback(name: string, revision: number): void
  readonly feedbackRevision: Readonly<Ref<number>>
  readonly feedbackScope: Readonly<Ref<string | undefined>>
  readonly summaryRevision: Readonly<Ref<number>>
  nodeLabel(name: string): string
  nodeControlId(name: string): string
  setNodeFocusTarget(name: string, owner: symbol, focus: (() => void) | null): void
  fieldIdentity(name: string): symbol
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
  const presentation = computed(() => formPresentation(props.form))
  const announcement = computed(() => {
    const form = props.form
    if (form.phase.value === 'validating') return form.copy.validating()
    if (form.phase.value === 'submitting') return form.copy.submitting()
    return form.notice.value?.() ?? ''
  })
  function canFocus(name: string | null): name is string {
    if (name === null) return false
    return presentation.value.canFocusField(name)
  }
  function label(name: string | null): string {
    return name === null ? '' : presentation.value.nodeLabel(name)
  }
  return { announcement, presentation, canFocus, label }
}
