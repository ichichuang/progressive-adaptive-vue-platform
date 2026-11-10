<script setup lang="ts">
import { computed, effectScope, onActivated, onDeactivated, ref, shallowRef } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NDrawer, NDrawerContent } from 'naive-ui/es/drawer'
import { UiCopyAction, useUiForm, type UiFormValue } from '@platform/ui'
import { useFormShowcase } from '../form-showcase'
import FormBuilderConfiguration from './FormBuilderConfiguration.vue'
import FormBuilderPreview from './FormBuilderPreview.vue'
import { useFormBuilder } from './use-form-builder'
import FormBuilderActions from './FormBuilderActions.vue'
import { parseBuilderDraft, type BuilderTrialState } from './form-builder-draft'
import { formDraftSignature } from '../../../forms/form-draft-signature'
import { useFormDraftStorage } from '../../../forms/use-form-draft-storage'
import { useDraftSession } from '../../../forms/use-draft-session'
import { applicationConfig } from '../../../config/app.config'
import { useWorkspaceUnsavedChanges } from '../../../workspace/use-workspace-unsaved-changes'

const { t, copy } = useFormShowcase()
const builder = useFormBuilder(t)
const draftStorage = useFormDraftStorage()
const initialTrial = shallowRef<Record<string, UiFormValue>>()
const trial = shallowRef<BuilderTrialState | null>(null)
const session = useDraftSession({
  automatic: true,
  port: draftStorage.create({
    scope: 'visual-form-builder',
    schemaKey: 'visual-form-builder-editor',
    maxAgeMs: applicationConfig.forms.builderDraftMaxAgeMs,
    parse: parseBuilderDraft,
  }),
  snapshot: () => {
    const values = trial.value?.values ?? initialTrial.value
    return { ...builder.snapshot(), ...(values === undefined ? {} : { trial: values }) }
  },
  restore(data) {
    // Recovery runs before the preview mounts. Never replace a live controller or its raw inputs.
    if (trial.value || builder.hasActiveComposition.value) return false
    const { trial: values, ...configuration } = data
    if (values !== undefined) {
      const scope = effectScope()
      try {
        const restored = scope.run(() =>
          useUiForm({
            formId: 'visual-builder-preview',
            schema: data.schema,
            initial: { draftId: 'visual-builder-preview', values },
            copy,
          }).getValues(),
        )
        // The public controller owns value validation; partial/mismatched records stay untouched.
        if (formDraftSignature(restored) !== formDraftSignature(values)) return false
      } finally {
        scope.stop()
      }
    }
    if (!builder.restoreDraft(configuration)) return false
    initialTrial.value = values
    return true
  },
  // A focused or pending control can hold the old schema. Save only coherent configuration/value
  // pairs. Accepted values may still save while a raw input is pending; that input stays guarded.
  enabled: () =>
    !builder.hasActiveComposition.value &&
    (!trial.value || trial.value.schema === builder.schema.value),
})
useWorkspaceUnsavedChanges(
  () =>
    session.unsaved.value || builder.hasActiveComposition.value || Boolean(trial.value?.pending),
  () => [builder.snapshot(), trial.value?.revision],
)
const trialState = computed(() =>
  trial.value && trial.value.schema !== builder.schema.value
    ? 'held'
    : trial.value?.pending
      ? 'pending'
      : null,
)
const active = ref(true)
const editorOpen = ref(false)
const ai = computed(() =>
  [
    t('formBuilder.aiRequest'),
    t('formBuilder.aiBoundary'),
    'import { UiForm, useUiForm, parseUiFormSchema } from "@platform/ui"',
    'packages/ui/src/components/form-guide.md',
    t('formBuilder.schema'),
    builder.json.value,
  ].join('\n\n'),
)
onActivated(() => {
  active.value = true
})
onDeactivated(() => {
  active.value = false
  editorOpen.value = false
})
</script>
<template>
  <div class="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden gap-content-gap">
    <header class="shrink-0 grid min-w-0 gap-component-unit">
      <div
        class="flex flex-wrap min-w-0 items-center justify-between gap-component-unit"
        role="group"
        :aria-label="t('formBuilder.title')"
      >
        <div class="flex flex-wrap min-w-0 items-center gap-component-unit">
          <div class="hidden layout-narrow:block">
            <NButton
              type="primary"
              @click="editorOpen = true"
            >
              {{ t('formBuilder.configure') }}
            </NButton>
          </div>
          <div class="flex gap-component-unit layout-narrow:hidden">
            <NButton
              secondary
              :disabled="!builder.canUndo.value"
              @click="builder.undo"
            >
              {{ t('formBuilder.undo') }}
            </NButton>
            <NButton
              secondary
              :disabled="!builder.canRedo.value"
              @click="builder.redo"
            >
              {{ t('formBuilder.redo') }}
            </NButton>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-component-unit">
          <FormBuilderActions
            :builder="builder"
            :session="session"
            :trial-state="trialState"
          />
          <div
            class="flex gap-component-unit layout-narrow:hidden"
            role="group"
            :aria-label="t('formBuilder.columns')"
          >
            <NButton
              v-for="count in [1, 2] as const"
              :key="count"
              tertiary
              :type="builder.schema.value.columns === count ? 'primary' : 'default'"
              :aria-pressed="builder.schema.value.columns === count"
              :disabled="builder.pending.value"
              @click="builder.columns(count)"
            >
              {{ t(count === 1 ? 'formBuilder.oneColumn' : 'formBuilder.twoColumns') }}
            </NButton>
          </div>
          <UiCopyAction
            :key="builder.pending.value ? 'pending' : 'accepted'"
            variant="text"
            :value="ai"
            :label="t('formShowcase.copyAI')"
            :copy-label="t('workbench.copy')"
            :success-label="t('workbench.copied')"
            :failure-label="t('workbench.copyFailed')"
            :disabled="builder.pending.value"
          />
        </div>
      </div>
      <p
        class="m-0 text-caption text-text-secondary layout-narrow:hidden"
        :class="{ 'sr-only': !builder.pending.value }"
        role="status"
        aria-live="polite"
      >
        {{ builder.pending.value ? t('formBuilder.pendingHint') : '' }}
      </p>
    </header>
    <div class="wb-builder-layout flex-1 grid grid-rows-1 min-h-0 min-w-0 gap-content-gap">
      <FormBuilderConfiguration
        :builder="builder"
        owner-id="form-builder-configuration"
        :active="active"
        class="layout-narrow:hidden"
      />
      <FormBuilderPreview
        :schema="builder.schema.value"
        :pending="builder.pending.value"
        :initial-values="initialTrial"
        @add="builder.add"
        @change="trial = $event"
      />
    </div>
    <NDrawer
      v-model:show="editorOpen"
      display-directive="show"
      width="100%"
      placement="right"
      to="#pavp-overlay-root"
    >
      <NDrawerContent
        :title="t('formBuilder.configure')"
        closable
        body-content-class="flex h-full min-h-0 min-w-0 flex-col"
      >
        <template #header>
          <div
            class="flex min-w-0 items-center gap-component-unit"
            role="group"
            :aria-label="t('formBuilder.columns')"
          >
            <span class="sr-only">{{ t('formBuilder.configure') }}</span>
            <NButton
              v-for="count in [1, 2] as const"
              :key="count"
              size="small"
              tertiary
              :type="builder.schema.value.columns === count ? 'primary' : 'default'"
              :aria-pressed="builder.schema.value.columns === count"
              :disabled="builder.pending.value"
              @click="builder.columns(count)"
            >
              {{ t(count === 1 ? 'formBuilder.oneColumn' : 'formBuilder.twoColumns') }}
            </NButton>
            <NButton
              size="small"
              secondary
              :disabled="!builder.canUndo.value"
              @click="builder.undo"
            >
              {{ t('formBuilder.undo') }}
            </NButton>
            <NButton
              secondary
              :disabled="!builder.canRedo.value"
              @click="builder.redo"
            >
              {{ t('formBuilder.redo') }}
            </NButton>
          </div>
        </template>
        <FormBuilderConfiguration
          :builder="builder"
          owner-id="form-builder-mobile-configuration"
          :active="active && editorOpen"
          class="flex-1"
        />
      </NDrawerContent>
    </NDrawer>
  </div>
</template>
