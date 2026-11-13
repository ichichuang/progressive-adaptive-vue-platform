<script setup lang="ts">
import { NButton } from 'naive-ui/es/button'
import { NPopconfirm } from 'naive-ui/es/popconfirm'
import { UiScrollArea } from '@platform/ui'
import { useConsoleI18n } from '../../../../shared/i18n'
import FormBuilderOutline from './FormBuilderOutline.vue'
import FormBuilderInspector from './FormBuilderInspector.vue'
import { builderKinds, type BuilderKind, type useFormBuilder } from './use-form-builder'
defineProps<{
  readonly builder: ReturnType<typeof useFormBuilder>
  readonly ownerId: string
  readonly active: boolean
}>()
const { t } = useConsoleI18n()
</script>
<template>
  <aside
    class="wb-builder-editor border-0 rounded-panel flex flex-col min-h-0 min-w-0 overflow-hidden bg-surface-panel"
    :aria-label="t('formBuilder.configure')"
  >
    <div class="wb-builder-editor-content flex-1 grid min-h-0 min-w-0">
      <FormBuilderOutline
        :schema="builder.schema.value"
        :selected="builder.selected.value"
        :pending="builder.pending.value"
        :owner-id="`${ownerId}-structure`"
        :active="active"
        @select="builder.choose"
        @add="builder.add"
        @move="builder.move"
        @reorder="builder.reorder"
      />
      <header class="wb-builder-inspector-heading min-w-0">
        <div class="flex min-w-0 items-center justify-between gap-component-unit">
          <div class="grid min-w-0">
            <h2 class="font-title-weight m-0 truncate text-body text-text-primary">
              {{ builder.selectedNode.value?.label || t('formBuilder.properties') }}
            </h2>
            <span
              v-if="builder.selectedNode.value"
              class="truncate text-caption text-text-secondary"
              v-text="
                `${t('formBuilder.properties')} / ${Object.hasOwn(builderKinds, builder.selectedNode.value.kind) ? t(builderKinds[builder.selectedNode.value.kind as BuilderKind]) : builder.selectedNode.value.kind}`
              "
            />
          </div>
          <NPopconfirm
            v-if="builder.selectedNode.value"
            to="#pavp-overlay-root"
            :positive-text="t('formBuilder.remove')"
            :negative-text="t('formBuilder.cancel')"
            @positive-click="builder.remove"
          >
            <template #trigger>
              <NButton
                size="small"
                quaternary
                :disabled="builder.pending.value"
                :aria-label="`${t('formBuilder.remove')} ${builder.selectedNode.value.label}`"
              >
                <template #icon>
                  <span
                    class="i-lucide-trash-2"
                    aria-hidden="true"
                  />
                </template>
              </NButton>
            </template>
            {{ t('formBuilder.removeConfirm') }}
          </NPopconfirm>
        </div>
        <div
          v-if="builder.selectedNode.value || builder.pending.value || builder.notice.value"
          class="wb-builder-status flex items-center gap-component-unit"
          role="status"
          aria-live="polite"
        >
          <span
            class="shrink-0 size-icon-small"
            :class="
              builder.pending.value || builder.notice.value
                ? 'i-lucide-circle-alert text-control-error'
                : 'i-lucide-check text-control-primary'
            "
            aria-hidden="true"
          />
          <span
            class="flex-1 line-clamp-2 text-caption"
            :class="
              builder.pending.value || builder.notice.value
                ? 'text-control-error'
                : 'text-text-secondary'
            "
            :title="builder.notice.value || t('formBuilder.live')"
            v-text="
              `${builder.notice.value || t('formBuilder.live')}${builder.pending.value ? ` ${t('formBuilder.repairHint')}` : ''}`
            "
          />
          <NButton
            v-if="builder.pending.value"
            size="tiny"
            tertiary
            @click="builder.undo"
          >
            {{ t('formBuilder.undo') }}
          </NButton>
        </div>
      </header>
      <UiScrollArea
        :owner-id="`${ownerId}-properties`"
        :enabled="active"
        class="min-h-0 min-w-0"
      >
        <div
          class="wb-builder-properties min-w-0"
          @focusout="builder.finishEdit"
        >
          <FormBuilderInspector
            v-if="builder.draft.value"
            :key="builder.editorRevision.value"
            :node="builder.draft.value"
            :references="builder.references.value"
            :editor="builder.editor"
            @update="builder.edit"
          />
          <p
            v-else
            class="m-0 text-caption text-text-secondary"
          >
            {{ t('formBuilder.selectHint') }}
          </p>
        </div>
      </UiScrollArea>
    </div>
  </aside>
</template>
