/** JSON configuration is data. Callbacks and services belong to the trusted frontend input. */
import type { DeepReadonly, Ref } from 'vue'

export type UiFormValue =
  string | number | boolean | null | UiFormValue[] | { [key: string]: UiFormValue }
export type UiFormReadonlyValue =
  | string
  | number
  | boolean
  | null
  | readonly UiFormReadonlyValue[]
  | { readonly [key: string]: UiFormReadonlyValue }
export type UiFormRecord = Record<string, UiFormValue>
export type UiFormDraftValue = UiFormValue
export type UiFormText = () => string
export type UiFormMode = 'edit' | 'detail'
export interface UiFormReference {
  readonly field: string
  readonly scope?: 'form' | 'group'
}
export type UiFormCondition =
  | (UiFormReference & {
      readonly operator: 'eq' | 'neq' | 'in' | 'empty' | 'not-empty'
      readonly value?: UiFormValue
    })
  | { readonly all: readonly UiFormCondition[] }
  | { readonly any: readonly UiFormCondition[] }
  | { readonly not: UiFormCondition }
export type UiFormFlag = boolean | UiFormCondition
export interface UiFormOption {
  readonly value: string | number
  readonly label: string
  readonly disabled?: boolean
}
export type UiFormOptionValue = string | number
export interface UiFormOptionContext extends UiFormWorkContext {
  readonly field: string
  readonly group: string
}
export interface UiFormOptionPage {
  readonly items: readonly UiFormOption[]
  readonly hasNext: boolean
}
/** Every requested identity occurs exactly once in items or missing. */
export interface UiFormOptionResolution {
  readonly items: readonly UiFormOption[]
  readonly missing: readonly UiFormOptionValue[]
}
/** Integer pages are a frontend transport boundary, not a cursor protocol adapter. */
export interface UiFormPagedOptionSource<I> {
  readonly pageSize: number
  readonly query: (
    values: DeepReadonly<I>,
    context: UiFormOptionContext & {
      readonly search: string
      readonly page: number
      readonly pageSize: number
    },
  ) => Promise<UiFormOptionPage>
  readonly resolve: (
    values: DeepReadonly<I>,
    context: UiFormOptionContext & { readonly selected: readonly UiFormOptionValue[] },
  ) => Promise<UiFormOptionResolution>
}
export type UiFormOptionSource<I> =
  | ((values: DeepReadonly<I>, context: UiFormOptionContext) => Promise<readonly UiFormOption[]>)
  | UiFormPagedOptionSource<I>
export interface UiFormSelectedOption {
  readonly value: UiFormOptionValue
  /** Last known presentation; only ready certifies the current dependency scope. */
  readonly option: UiFormOption | null
  readonly status: 'idle' | 'loading' | 'ready' | 'missing' | 'failed'
}
export interface UiFormOptionQuery {
  readonly search: string
  /** Requested page, including an unsuccessful attempt. */
  readonly page: number
  readonly pageSize: number
  readonly hasNext: boolean
}
export type UiFormOptions =
  | readonly UiFormOption[]
  | { readonly source: string; readonly dependsOn?: readonly UiFormReference[] }
export interface UiFormNodeBase {
  readonly name: string
  readonly label: string
  readonly description?: string
  readonly hidden?: UiFormFlag
  readonly disabled?: UiFormFlag
  readonly readonly?: UiFormFlag
  readonly span?: 1 | 2
}
interface UiFormFieldBase extends UiFormNodeBase {
  readonly placeholder?: string
  readonly required?: UiFormFlag
  readonly options?: never
  readonly min?: never
  readonly max?: never
  readonly step?: never
}
interface UiFormRules {
  readonly message?: string
  readonly min?: never
  readonly max?: never
  readonly minLength?: never
  readonly maxLength?: never
  readonly format?: never
}
type UiFormLengthRules = Omit<UiFormRules, 'minLength' | 'maxLength'> & {
  readonly minLength?: number
  readonly maxLength?: number
}
export type UiFormFieldConfig =
  | (UiFormFieldBase & {
      readonly kind: 'text' | 'textarea'
      readonly defaultValue?: string
      readonly rules?: Omit<UiFormLengthRules, 'format'> & { readonly format?: 'email' }
    })
  | (Omit<UiFormFieldBase, 'min' | 'max' | 'step'> & {
      readonly kind: 'number'
      readonly defaultValue?: number | null
      readonly min?: number
      readonly max?: number
      readonly step?: number
      readonly rules?: Omit<UiFormRules, 'min' | 'max'> & {
        readonly min?: number
        readonly max?: number
      }
    })
  | (UiFormFieldBase & {
      readonly kind: 'switch'
      readonly defaultValue?: boolean
      readonly rules?: UiFormRules
    })
  | (UiFormFieldBase & {
      readonly kind: 'date' | 'time'
      readonly defaultValue?: string | null
      readonly rules?: UiFormRules
    })
  | (UiFormFieldBase & {
      readonly kind: 'date-range'
      readonly defaultValue?: [string, string] | null
      readonly rules?: UiFormRules
    })
  | (Omit<UiFormFieldBase, 'options'> & {
      readonly kind: 'select' | 'radio'
      readonly defaultValue?: string | number | null
      readonly options: UiFormOptions
      readonly rules?: UiFormRules
    })
  | (Omit<UiFormFieldBase, 'options'> & {
      readonly kind: 'multi-select' | 'checkbox-group'
      readonly defaultValue?: (string | number)[]
      readonly options: UiFormOptions
      readonly rules?: UiFormLengthRules
    })
  | (UiFormFieldBase & {
      readonly kind: 'custom'
      readonly defaultValue?: UiFormValue
      readonly rules?: UiFormRules
    })
export interface UiFormGroupConfig extends UiFormNodeBase {
  readonly kind: 'group'
  readonly fields: readonly UiFormNode[]
}
export interface UiFormRepeatConfig extends UiFormNodeBase {
  readonly kind: 'repeat'
  readonly fields: readonly UiFormNode[]
  readonly minItems?: number
  readonly maxItems?: number
  readonly addLabel?: string
  readonly itemLabel?: string
}
export type UiFormNode = UiFormFieldConfig | UiFormGroupConfig | UiFormRepeatConfig
export interface UiFormSchema {
  readonly columns?: 1 | 2
  readonly fields: readonly UiFormNode[]
}
/** Editable values follow field kinds, not the narrower initial snapshot or defaults. */
export type UiFormSchemaValues<S extends UiFormSchema> = string extends S['fields'][number]['name']
  ? UiFormRecord
  : { [Node in S['fields'][number] as Node['name']]: UiFormNodeValue<Node> }

type UiFormNodeValue<Node extends UiFormNode> = Node extends UiFormGroupConfig
  ? UiFormSchemaValues<Node>
  : Node extends UiFormRepeatConfig
    ? UiFormSchemaValues<Node>[]
    : Node extends { readonly kind: 'text' | 'textarea' }
      ? string
      : Node extends { readonly kind: 'number' }
        ? number | null
        : Node extends { readonly kind: 'switch' }
          ? boolean
          : Node extends { readonly kind: 'date' | 'time' }
            ? string | null
            : Node extends { readonly kind: 'date-range' }
              ? [string, string] | null
              : Node extends { readonly kind: 'select' | 'radio' }
                ? string | number | null
                : Node extends { readonly kind: 'multi-select' | 'checkbox-group' }
                  ? (string | number)[]
                  : UiFormValue

export interface UiFormWorkContext {
  readonly signal: AbortSignal
}
export interface UiFormSnapshot<I> {
  readonly draftId: string
  readonly values: I
}
export interface UiFormLoadOptions {
  /** Preserve edits made before or during the request unless replacement is explicit. */
  readonly strategy?: 'preserve-dirty' | 'replace'
}
export type UiFormLoadOutcome = 'applied' | 'failure' | 'blocked' | 'busy' | 'cancelled'
export type UiFormLoadState = 'idle' | 'loading' | 'ready' | 'failed' | 'blocked'
export interface UiFormIssue {
  readonly field: string | null
  readonly message: UiFormText
}
export type UiFormSubmitResult<I> =
  | { readonly status: 'success'; readonly initial?: UiFormSnapshot<I> }
  | {
      readonly status: 'failure'
      readonly message: UiFormText
      readonly issues?: readonly UiFormIssue[]
    }
export type UiFormSubmitOutcome = 'success' | 'invalid' | 'failure' | 'cancelled'
export type UiFormMutationResult = 'applied' | 'unchanged' | 'blocked' | 'busy' | 'disposed'
export interface UiFormCopy {
  readonly submit: UiFormText
  readonly reset: UiFormText
  readonly required: UiFormText
  readonly loadingOptions: UiFormText
  readonly noOptions: UiFormText
  readonly optionsFailed: UiFormText
  readonly retryOptions: UiFormText
  /** All three paging messages are required when a referenced source is paged. */
  readonly previousOptionsPage?: UiFormText
  readonly nextOptionsPage?: UiFormText
  readonly optionsPage?: (page: number) => string
  readonly validating: UiFormText
  readonly submitting: UiFormText
  readonly submitSucceeded: UiFormText
  readonly submitFailed: UiFormText
  readonly validationUnavailable: UiFormText
  readonly inputIncomplete: UiFormText
  readonly errorSummary: (count: number) => string
  readonly empty: UiFormText
  readonly yes: UiFormText
  readonly no: UiFormText
  readonly addItem: UiFormText
  readonly insertItem: UiFormText
  readonly duplicateItem: UiFormText
  readonly removeItem: UiFormText
  readonly moveUp: UiFormText
  readonly moveDown: UiFormText
  readonly minItems: (count: number) => string
  readonly maxItems: (count: number) => string
  readonly invalidValue: UiFormText
}
export interface UiFormChange<I> {
  readonly previous: DeepReadonly<I>
  readonly values: DeepReadonly<I>
  readonly changed: readonly string[]
}
export interface UiFormInput<I> {
  readonly formId: string
  /** Normalized against schema; missing fields and nested groups receive their defaults. */
  readonly initial: UiFormSnapshot<unknown>
  readonly schema: UiFormSchema
  readonly copy: UiFormCopy
  readonly translate?: (text: string) => string
  readonly validation?: (
    values: DeepReadonly<I>,
    context: UiFormWorkContext,
  ) => readonly UiFormIssue[] | Promise<readonly UiFormIssue[]>
  readonly onSubmit?: (
    values: I,
    context: UiFormWorkContext,
  ) => UiFormSubmitResult<I> | Promise<UiFormSubmitResult<I>>
  readonly onChange?: (event: UiFormChange<I>) => void
  readonly onBlur?: (event: { readonly field: string; readonly values: DeepReadonly<I> }) => void
  readonly onReset?: (values: DeepReadonly<I>) => void
  readonly sources?: Readonly<Record<string, UiFormOptionSource<I>>>
}
export interface UiFormNodeState {
  readonly hidden: boolean
  readonly disabled: boolean
  readonly readonly: boolean
}
export interface UiFormController<I> {
  readonly formId: string
  readonly draftId: Readonly<Ref<string>>
  readonly schema: UiFormSchema
  /** Concrete leaf paths, including current repeat rows. */
  readonly fields: readonly UiFormFieldConfig[]
  readonly copy: UiFormCopy
  readonly values: Readonly<Ref<DeepReadonly<I>>>
  /** Canonical value differences only. Use hasUnsavedChanges for leave/refresh protection. */
  readonly dirty: Readonly<Ref<boolean>>
  /** Changed concrete leaf and repeat collection paths. */
  readonly dirtyFields: Readonly<Ref<readonly string[]>>
  /** Uncommitted control input, which is intentionally absent from values/getValues. */
  readonly pendingFields: Readonly<Ref<readonly string[]>>
  readonly hasPendingInput: Readonly<Ref<boolean>>
  readonly hasUnsavedChanges: Readonly<Ref<boolean>>
  /** Monotonic data/input revision for rejecting stale asynchronous decisions. */
  readonly revision: Readonly<Ref<number>>
  readonly loadState: Readonly<Ref<UiFormLoadState>>
  readonly touched: Readonly<Ref<Readonly<Record<string, boolean>>>>
  readonly issues: Readonly<Ref<readonly UiFormIssue[]>>
  readonly phase: Readonly<Ref<'idle' | 'validating' | 'submitting' | 'disposed'>>
  readonly submitting: Readonly<Ref<boolean>>
  readonly notice: Readonly<Ref<null | UiFormText>>
  text(value: string): string
  getValues(): I
  getInitial(): UiFormSnapshot<I>
  getValue(path: string): UiFormValue | undefined
  setValues(patch: Partial<I>): UiFormMutationResult
  /** Replace all current values and transient input, retaining the accepted reset baseline. */
  replaceValues(values: I): UiFormMutationResult
  setValue(path: string, value: UiFormValue): UiFormMutationResult
  load(
    loader: (context: UiFormWorkContext) => UiFormSnapshot<I> | Promise<UiFormSnapshot<I>>,
    options?: UiFormLoadOptions,
  ): Promise<UiFormLoadOutcome>
  blur(name: string): void
  validate(): Promise<'valid' | 'invalid' | 'cancelled'>
  /** Check one existing repeat row subtree; success does not certify the whole form. */
  validateItem(
    path: string,
    index: number,
  ): Promise<'valid' | 'invalid' | 'blocked' | 'busy' | 'cancelled'>
  submit(): Promise<UiFormSubmitOutcome>
  reset(): void
  replaceInitial(snapshot: UiFormSnapshot<I>): void
  field(name: string): UiFormFieldBinding
  nodeState(path: string): UiFormNodeState
  /** Translated schema ancestry and current repeat positions for an existing node. */
  nodeLabel(path: string): string
  /** Whether an existing, visible, enabled node has a mounted focus target. */
  canFocusField(path: string): boolean
  /** Locate through the mounted node's registered focus target; false when unavailable. */
  focusField(path: string): boolean
  rowKeys(path: string): readonly string[]
  addItem(path: string): UiFormMutationResult
  /** Insert schema defaults before an integer index in 0..length. */
  insertItem(path: string, index: number): UiFormMutationResult
  /** Copy canonical JSON after a row, with fresh identities; blocked by its pending input. */
  duplicateItem(path: string, index: number): UiFormMutationResult
  removeItem(path: string, index: number): UiFormMutationResult
  moveItem(path: string, from: number, to: number): UiFormMutationResult
  dispose(): void
}
export interface UiFormFieldBinding extends UiFormNodeState {
  readonly name: string
  readonly value: UiFormReadonlyValue
  readonly controlId: string
  readonly labelId: string
  readonly describedBy: string
  readonly required: boolean
  readonly dirty: boolean
  readonly pendingInput: boolean
  readonly invalid: boolean
  readonly errors: readonly UiFormText[]
  readonly options: readonly UiFormOption[]
  /** Query state only for paged sources; idle does not invalidate a selection. */
  readonly optionsState: 'idle' | 'loading' | 'ready' | 'failed'
  readonly selectedOptions: readonly UiFormSelectedOption[]
  readonly optionQuery: UiFormOptionQuery | null
  searchOptions(search: string): UiFormMutationResult
  setOptionsPage(page: number): UiFormMutationResult
  setValue(value: UiFormValue): UiFormMutationResult
  blur(): void
  retryOptions(target?: 'query' | 'selection'): void
  setFocusTarget(focus: (() => void) | null): void
  setCommitTarget(commit: (() => boolean) | null): void
  /** Custom buffered controls must report input that is not yet in the canonical value. */
  setPendingInput(pending: boolean): void
}
export interface UiFormProps<I> {
  readonly form: UiFormController<I>
  readonly mode?: UiFormMode
  readonly columns?: 1 | 2
}
export interface UiFormFieldProps<I> {
  readonly form: UiFormController<I>
  readonly name: string
  readonly mode?: UiFormMode
}
export interface UiFormSlots<I> {
  default?: (props: { readonly form: UiFormController<I> }) => unknown
  field?: (props: UiFormFieldBinding) => unknown
  detail?: (props: UiFormFieldBinding) => unknown
  actions?: (props: { readonly form: UiFormController<I> }) => unknown
}
export interface UiFormFieldSlots {
  default?: (props: UiFormFieldBinding) => unknown
  detail?: (props: UiFormFieldBinding) => unknown
}
