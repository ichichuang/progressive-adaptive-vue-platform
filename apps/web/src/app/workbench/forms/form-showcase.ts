import { ref, watch } from 'vue'
import type { UiFormController, UiFormCopy } from '@platform/ui'
import { useConsoleI18n, type ConsoleMessageKey } from '../../../shared/i18n'

export const formCapabilities = {
  richText: {
    hint: 'formCapabilities.richText.hint',
    purpose: 'formCapabilities.richText.purpose',
    try: 'formCapabilities.richText.try',
    boundary: 'formCapabilities.richText.boundary',
    controls: 'formCapabilities.richText.controls',
    api: 'UiForm rich-text · structured document · configurable tools · detail mode',
    sources: ['apps/web/src/pages/component-form-rich-text.vue'],
  },
  media: {
    hint: 'formCapabilities.media.hint',
    purpose: 'formCapabilities.media.purpose',
    try: 'formCapabilities.media.try',
    boundary: 'formCapabilities.media.boundary',
    controls: 'formCapabilities.media.controls',
    api: 'UiForm attachment · imageProcessing · preview · UiFormAttachmentService',
    sources: ['apps/web/src/pages/component-form-media.vue'],
  },
  dynamic: {
    hint: 'formCapabilities.dynamic.hint',
    purpose: 'formCapabilities.dynamic.purpose',
    try: 'formCapabilities.dynamic.try',
    boundary: 'formCapabilities.dynamic.boundary',
    controls: 'formCapabilities.dynamic.controls',
    api: 'useUiDynamicForm · replaceSchema · compatible values · step identity · scoped draft lifetime',
    sources: ['apps/web/src/pages/component-form-dynamic.vue'],
  },
  layout: {
    hint: 'formCapabilities.layout.hint',
    purpose: 'formCapabilities.layout.purpose',
    try: 'formCapabilities.layout.try',
    boundary: 'formCapabilities.layout.boundary',
    controls: 'formCapabilities.layout.controls',
    api: 'UiForm.columns · UiFormSchema.columns · span · group · container-responsive layout',
    sources: ['apps/web/src/pages/component-form-layout.vue'],
  },
  calculations: {
    hint: 'formCapabilities.calculations.hint',
    purpose: 'formCapabilities.calculations.purpose',
    try: 'formCapabilities.calculations.try',
    boundary: 'formCapabilities.calculations.boundary',
    controls: 'formCapabilities.calculations.controls',
    api: 'useUiForm · values · hasPendingInput · Vue computed · trusted frontend calculation',
    sources: ['apps/web/src/pages/component-form-calculations.vue'],
  },
  controls: {
    hint: 'formCapabilities.controls.hint',
    purpose: 'formCapabilities.controls.purpose',
    try: 'formCapabilities.controls.try',
    boundary: 'formCapabilities.controls.boundary',
    controls: 'formCapabilities.controls.controls',
    api: 'custom · UiFormField · UiRadioCardGroup · NCheckboxGroup · setValue · blur · setFocusTarget',
    sources: [
      'apps/web/src/pages/component-form-controls.vue',
      'apps/web/src/app/workbench/forms/FormPreferenceControl.vue',
    ],
  },
  loading: {
    hint: 'formCapabilities.loading.hint',
    purpose: 'formCapabilities.loading.purpose',
    try: 'formCapabilities.loading.try',
    boundary: 'formCapabilities.loading.boundary',
    controls: 'formCapabilities.loading.controls',
    api: 'useUiForm · load · preserve-dirty · loadState · dirtyFields · getInitial · reset',
    sources: ['apps/web/src/pages/component-form-loading.vue'],
  },
  submission: {
    hint: 'formCapabilities.submission.hint',
    purpose: 'formCapabilities.submission.purpose',
    try: 'formCapabilities.submission.try',
    boundary: 'formCapabilities.submission.boundary',
    controls: 'formCapabilities.submission.controls',
    api: 'useUiForm · onSubmit · UiFormSubmitResult · issues · submit · getInitial · reset',
    sources: ['apps/web/src/pages/component-form-submission.vue'],
  },
  basics: {
    hint: 'formShowcase.basicsHint',
    purpose: 'formShowcase.basicsPurpose',
    try: 'formShowcase.basicsTry',
    api: 'UiForm · useUiForm · parseUiFormSchema · validate · reset',
    boundary: 'configuredForm.sourceNote',
    controls: 'formShowcase.configurationSource',
    sources: [
      'apps/web/src/pages/component-form-basics.vue',
      'apps/web/src/app/workbench/forms/FormBasicControls.vue',
    ],
  },
  detail: {
    hint: 'formShowcase.detailHint',
    purpose: 'formShowcase.detailPurpose',
    try: 'formShowcase.detailTry',
    api: 'UiForm · mode="detail" · readonly · sources · selectedOptions · searchOptions · setOptionsPage',
    boundary: 'formShowcase.detailBoundary',
    controls: 'formShowcase.viewMode',
    sources: ['apps/web/src/pages/component-form-detail.vue'],
  },
  dependencies: {
    hint: 'formShowcase.dependenciesHint',
    purpose: 'formShowcase.dependenciesPurpose',
    try: 'formShowcase.dependenciesTry',
    api: 'hidden · required · disabled · sources · dependsOn · retryOptions',
    boundary: 'formShowcase.dependenciesBoundary',
    controls: 'formShowcase.optionScenario',
    sources: ['apps/web/src/pages/component-form-dependencies.vue'],
  },
  structure: {
    hint: 'formShowcase.structureHint',
    purpose: 'formShowcase.structurePurpose',
    try: 'formShowcase.structureTry',
    api: 'group · repeat · minItems/maxItems · scope="group" · addItem · insertItem · duplicateItem · removeItem · moveItem · validateItem · setValue · validate',
    boundary: 'formShowcase.structureBoundary',
    controls: 'formShowcase.rowScenario',
    sources: ['apps/web/src/pages/component-form-structure.vue'],
  },
  validation: {
    hint: 'formShowcase.validationHint',
    purpose: 'formShowcase.validationPurpose',
    try: 'formShowcase.validationTry',
    api: 'rules · validation · validate · setValues · reset · nodeLabel · canFocusField · focusField',
    boundary: 'formShowcase.validationBoundary',
    controls: 'formShowcase.validationScenario',
    sources: ['apps/web/src/pages/component-form-validation.vue'],
  },
  lifecycle: {
    hint: 'formShowcase.lifecycleHint',
    purpose: 'formLifecycle.purpose',
    try: 'formLifecycle.try',
    api: 'useFormDraft · automatic · pendingFields · hasUnsavedChanges · reset',
    boundary: 'formLifecycle.boundary',
    controls: 'formLifecycle.controls',
    sources: [
      'apps/web/src/pages/component-form-lifecycle.vue',
      'apps/web/src/app/forms/use-form-draft.ts',
    ],
  },
  options: {
    hint: 'formShowcase.optionsHint',
    purpose: 'formOptions.purpose',
    try: 'formOptions.try',
    api: 'UiFormPagedOptionSource · query · resolve · selectedOptions · optionQuery · searchOptions · setOptionsPage · retryOptions',
    boundary: 'formOptions.boundary',
    controls: 'formOptions.controls',
    sources: ['apps/web/src/pages/component-form-options.vue'],
  },
  extension: {
    hint: 'formShowcase.extensionHint',
    purpose: 'formShowcase.extensionPurpose',
    try: 'formShowcase.extensionTry',
    api: 'custom · UiFormField · field/detail slots · setValue · blur · setFocusTarget · setCommitTarget',
    boundary: 'formShowcase.extensionBoundary',
    controls: 'formShowcase.viewMode',
    sources: [
      'apps/web/src/pages/component-form-extension.vue',
      'apps/web/src/app/workbench/forms/FormExtensionControl.vue',
    ],
  },
  steps: {
    hint: 'formCapabilities.steps.hint',
    purpose: 'formCapabilities.steps.purpose',
    try: 'formCapabilities.steps.try',
    api: 'UiFormSchema.steps · activeStepIndex · goNextStep · goBackStep · setActiveStep · validate · submit',
    boundary: 'formCapabilities.steps.boundary',
    controls: 'formShowcase.viewMode',
    sources: ['apps/web/src/pages/component-form-steps.vue'],
  },
} as const satisfies Record<
  string,
  {
    hint: ConsoleMessageKey
    purpose: ConsoleMessageKey
    try: ConsoleMessageKey
    boundary: ConsoleMessageKey
    controls: ConsoleMessageKey
    api: string
    sources: readonly string[]
  }
>
export type FormCapability = keyof typeof formCapabilities
export function useFormShowcase() {
  const { t } = useConsoleI18n()
  const copy: UiFormCopy = {
    submit: () => t('configuredForm.submit'),
    reset: () => t('configuredForm.reset'),
    required: () => t('configuredForm.required'),
    loadingOptions: () => t('configuredForm.loadingOptions'),
    noOptions: () => t('configuredForm.noOptions'),
    optionsFailed: () => t('configuredForm.optionsFailed'),
    retryOptions: () => t('configuredForm.retryOptions'),
    previousOptionsPage: () => t('configuredForm.previousOptionsPage'),
    nextOptionsPage: () => t('configuredForm.nextOptionsPage'),
    optionsPage: (page) => `${t('configuredForm.optionsPage')} ${String(page)}`,
    previousStep: () => t('configuredForm.previousStep'),
    nextStep: () => t('configuredForm.nextStep'),
    validating: () => t('configuredForm.validating'),
    submitting: () => t('configuredForm.submitting'),
    submitSucceeded: () => t('configuredForm.submitSucceeded'),
    submitFailed: () => t('configuredForm.submitFailed'),
    validationUnavailable: () => t('configuredForm.validationUnavailable'),
    inputIncomplete: () => t('configuredForm.inputIncomplete'),
    errorSummary: () => t('configuredForm.errorSummary'),
    empty: () => t('configuredForm.empty'),
    yes: () => t('configuredForm.yes'),
    no: () => t('configuredForm.no'),
    addItem: () => t('formShowcase.addRow'),
    insertItem: () => t('configuredForm.insertItem'),
    duplicateItem: () => t('configuredForm.duplicateItem'),
    removeItem: () => t('configuredForm.removeItem'),
    moveUp: () => t('configuredForm.moveUp'),
    moveDown: () => t('configuredForm.moveDown'),
    invalidValue: () => t('configuredForm.invalidValue'),
    chooseAttachment: () => t('formFields.chooseAttachment'),
    uploadingAttachment: () => t('formFields.processingAttachment'),
    attachmentFailed: () => t('formFields.attachmentFailed'),
    richTextLinkLabel: () => t('formCapabilities.richText.linkAddress'),
    richTextLinkApply: () => t('formCapabilities.richText.linkApply'),
    richTextLinkInvalid: () => t('formCapabilities.richText.linkInvalid'),
    richText: {
      bold: () => t('formCapabilities.richText.bold'),
      italic: () => t('formCapabilities.richText.italic'),
      strike: () => t('formCapabilities.richText.strike'),
      heading: () => t('formCapabilities.richText.heading'),
      'bullet-list': () => t('formCapabilities.richText.bullet-list'),
      'ordered-list': () => t('formCapabilities.richText.ordered-list'),
      blockquote: () => t('formCapabilities.richText.blockquote'),
      link: () => t('formCapabilities.richText.link'),
      undo: () => t('formCapabilities.richText.undo'),
      redo: () => t('formCapabilities.richText.redo'),
    },
    media: {
      cropTitle: () => t('formCapabilities.media.cropTitle'),
      previewTitle: () => t('formCapabilities.media.previewTitle'),
      cancel: () => t('formCapabilities.media.cancel'),
      confirm: () => t('formCapabilities.media.confirm'),
      rotateLeft: () => t('formCapabilities.media.rotateLeft'),
      rotateRight: () => t('formCapabilities.media.rotateRight'),
      reset: () => t('formCapabilities.media.reset'),
      processing: () => t('formCapabilities.media.processing'),
      loading: () => t('formCapabilities.media.loading'),
      failed: () => t('formCapabilities.media.failed'),
      previousPage: () => t('formCapabilities.media.previousPage'),
      nextPage: () => t('formCapabilities.media.nextPage'),
      zoomIn: () => t('formCapabilities.media.zoomIn'),
      zoomOut: () => t('formCapabilities.media.zoomOut'),
    },
    minItems: (count) => `${t('configuredForm.minItems')} ${String(count)}`,
    maxItems: (count) => `${t('configuredForm.maxItems')} ${String(count)}`,
  }
  return {
    t,
    copy,
    translate: (key: string) => (key === '' ? '' : t(key as ConsoleMessageKey)),
  }
}

/** Page-only checks never call submit or replace the reset baseline. */
export function useFormExampleCheck<I>(source: UiFormController<I> | (() => UiFormController<I>)) {
  const current = () => (typeof source === 'function' ? source() : source)
  const checked = ref<'valid' | 'invalid' | 'cancelled' | null>(null)
  watch(
    () => [current(), current().values.value],
    () => {
      checked.value = null
    },
    { deep: true },
  )
  let inputRevision = 0
  function clearCheck(): void {
    inputRevision += 1
    checked.value = null
  }
  async function validate(): Promise<void> {
    const revision = inputRevision
    const form = current()
    const result = await form.validate()
    if (revision === inputRevision && current() === form) checked.value = result
  }
  return { checked, validate, clearCheck }
}
