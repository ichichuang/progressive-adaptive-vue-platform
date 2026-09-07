/** Public, vendor-independent contracts for one explicitly owned editable draft. */
import type { DeepReadonly, Ref } from 'vue'

export type UiFormKey<I> = Extract<keyof I, string>
export type UiFormValues<I> = DeepReadonly<I>
export type UiFormText = () => string
export type UiFormDraftValue = string | number | boolean | null | readonly (string | number)[]
export type UiFormFlag<I> = boolean | ((values: UiFormValues<I>) => boolean)
export type UiFormMaybePromise<T> = T | Promise<T>
export type UiFormOptionValue<V> = V extends readonly (infer Item)[]
  ? Extract<Item, string | number>
  : Extract<V, string | number>
export type UiFormMatch<V, Expected, Config> = [V] extends [Expected]
  ? [Expected] extends [V]
    ? Config
    : never
  : never

export interface UiFormWorkContext {
  readonly signal: AbortSignal
}
export interface UiFormSnapshot<I> {
  readonly draftId: string
  readonly values: I
}
export interface UiFormIssue<I> {
  readonly field: UiFormKey<I> | null
  readonly message: UiFormText
}
export interface UiFormOption<V> {
  readonly value: V
  readonly label: UiFormText
  readonly disabled?: boolean
}
export type UiFormOptions<I, V> =
  | readonly UiFormOption<V>[]
  | {
      readonly dependsOn: readonly UiFormKey<I>[]
      readonly load: (
        values: UiFormValues<I>,
        context: UiFormWorkContext,
      ) => Promise<readonly UiFormOption<V>[]>
    }
export type UiFormControlConfig<I, V> =
  | UiFormMatch<
      V,
      string,
      { readonly kind: 'text' | 'textarea'; readonly placeholder?: UiFormText }
    >
  | UiFormMatch<
      V,
      number | null,
      {
        readonly kind: 'number'
        readonly min?: number
        readonly max?: number
        readonly step?: number
      }
    >
  | UiFormMatch<V, boolean, { readonly kind: 'switch' }>
  | UiFormMatch<
      V,
      string | null,
      {
        readonly kind: 'date'
        readonly isDateAllowed?: (date: string, values: UiFormValues<I>) => boolean
      }
    >
  | ([V] extends [string | number | null]
      ? null extends V
        ? {
            readonly kind: 'select'
            readonly options: UiFormOptions<I, Exclude<V, null>>
          }
        : never
      : never)
  | ([V] extends [readonly (string | number)[]]
      ? V[number][] extends V
        ? {
            readonly kind: 'multi-select'
            readonly options: UiFormOptions<I, V[number]>
          }
        : never
      : never)
  | ([V] extends [UiFormDraftValue] ? { readonly kind: 'custom' } : never)
export type UiFormFieldConfig<I> = {
  [K in UiFormKey<I>]: {
    readonly name: K
    readonly label: UiFormText
    readonly description?: UiFormText
    readonly required?: UiFormFlag<I>
    readonly hidden?: UiFormFlag<I>
    readonly disabled?: UiFormFlag<I>
    readonly readonly?: UiFormFlag<I>
  } & UiFormControlConfig<I, I[K]>
}[UiFormKey<I>]

export type UiFormParseResult<I, O> =
  | { readonly status: 'valid'; readonly output: O }
  | { readonly status: 'invalid'; readonly issues: readonly UiFormIssue<I>[] }
export interface UiFormValidation<I, O> {
  check(
    values: UiFormValues<I>,
    context: UiFormWorkContext,
  ): UiFormMaybePromise<readonly UiFormIssue<I>[]>
  parse(
    values: UiFormValues<I>,
    context: UiFormWorkContext,
  ): UiFormMaybePromise<UiFormParseResult<I, O>>
}
export type UiFormSubmitResult<I> =
  | { readonly status: 'success'; readonly initial?: UiFormSnapshot<I> }
  | { readonly status: 'failure'; readonly message: UiFormText }
export type UiFormSubmitOutcome = 'success' | 'invalid' | 'failure' | 'cancelled'
export interface UiFormCopy {
  readonly submit: UiFormText
  readonly reset: UiFormText
  readonly required: UiFormText
  readonly loadingOptions: UiFormText
  readonly noOptions: UiFormText
  readonly optionsFailed: UiFormText
  readonly retryOptions: UiFormText
  readonly validating: UiFormText
  readonly submitting: UiFormText
  readonly submitSucceeded: UiFormText
  readonly submitFailed: UiFormText
  readonly validationUnavailable: UiFormText
  readonly inputIncomplete: UiFormText
  readonly errorSummary: (count: number) => string
}
export interface UiFormInput<I, O> {
  readonly formId: string
  readonly initial: UiFormSnapshot<I>
  readonly fields: readonly UiFormFieldConfig<I>[]
  readonly validation: UiFormValidation<I, O>
  readonly copy: UiFormCopy
  readonly onSubmit: (output: O, context: UiFormWorkContext) => Promise<UiFormSubmitResult<I>>
  readonly onChange?: (change: {
    readonly previous: UiFormValues<I>
    readonly values: UiFormValues<I>
    readonly changed: readonly UiFormKey<I>[]
  }) => Partial<I>
}
export interface UiFormController<I> {
  readonly formId: string
  readonly draftId: Readonly<Ref<string>>
  readonly fields: readonly UiFormFieldConfig<I>[]
  readonly copy: UiFormCopy
  readonly values: Readonly<Ref<UiFormValues<I>>>
  readonly dirty: Readonly<Ref<boolean>>
  readonly touched: Readonly<Ref<Readonly<Partial<Record<UiFormKey<I>, boolean>>>>>
  readonly issues: Readonly<Ref<readonly UiFormIssue<I>[]>>
  readonly phase: Readonly<Ref<'idle' | 'validating' | 'submitting' | 'disposed'>>
  readonly submitting: Readonly<Ref<boolean>>
  readonly notice: Readonly<Ref<null | UiFormText>>
  setValues(patch: Partial<I>): 'applied' | 'unchanged' | 'busy' | 'disposed'
  blur(name: UiFormKey<I>): void
  validate(): Promise<'valid' | 'invalid' | 'cancelled'>
  submit(): Promise<UiFormSubmitOutcome>
  reset(): void
  replaceInitial(snapshot: UiFormSnapshot<I>): void
  field<K extends UiFormKey<I>>(name: K): UiFormFieldBinding<I, K>
  dispose(): void
}
export interface UiFormFieldBinding<I, K extends UiFormKey<I>> {
  readonly name: K
  readonly value: DeepReadonly<I[K]>
  readonly controlId: string
  readonly labelId: string
  readonly describedBy: string
  readonly hidden: boolean
  readonly disabled: boolean
  readonly readonly: boolean
  readonly required: boolean
  readonly invalid: boolean
  readonly errors: readonly UiFormText[]
  readonly options: readonly UiFormOption<UiFormOptionValue<I[K]>>[]
  readonly optionsState: 'idle' | 'loading' | 'ready' | 'failed'
  setValue(value: I[K]): 'applied' | 'unchanged' | 'blocked' | 'busy' | 'disposed'
  blur(): void
  retryOptions(): void
  setFocusTarget(focus: (() => void) | null): void
  setCommitTarget(commit: (() => boolean) | null): void
}
export interface UiFormProps<I> {
  readonly form: UiFormController<I>
  readonly columns?: 1 | 2
}
export interface UiFormFieldProps<I, K extends UiFormKey<I>> {
  readonly form: UiFormController<I>
  readonly name: K
}
export interface UiFormSlots<I> {
  default?: (props: { readonly form: UiFormController<I> }) => unknown
  field?: (props: { [K in UiFormKey<I>]: UiFormFieldBinding<I, K> }[UiFormKey<I>]) => unknown
  actions?: (props: { readonly form: UiFormController<I> }) => unknown
}
export interface UiFormFieldSlots<I, K extends UiFormKey<I>> {
  default?: (props: UiFormFieldBinding<I, K>) => unknown
}
