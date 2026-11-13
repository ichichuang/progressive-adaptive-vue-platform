<script setup lang="ts">
import type { UiDateTimeContext } from '../date-time/date-time'
import { computed, inject, onActivated, onDeactivated, ref, useId, watch } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import { NDrawer, NDrawerContent } from 'naive-ui/es/drawer'
import { NModal } from 'naive-ui/es/modal'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'
import type { useUiTableForm } from '../composables/use-ui-table-form'
import type { UiFormFieldBinding } from './form-contracts'
import type { UiTableEditorCopy } from './table-contracts'
import type { UiScrollController } from './scroll-contracts'
import UiTableEditorBody from './UiTableEditorBody.vue'
import UiScrollArea from './UiScrollArea.vue'

/** The form session owns draft, mutation and close guards in every presentation. */
defineOptions({ name: 'UiTableEditor', inheritAttrs: false })
const props = defineProps<{
  readonly dateTime?: UiDateTimeContext
  readonly session: ReturnType<typeof useUiTableForm>
  readonly copy: UiTableEditorCopy
  readonly contained?: boolean
  readonly scrollOwnerId?: string
}>()
const slots = defineSlots<{
  field?: (binding: UiFormFieldBinding) => unknown
  detail?: (binding: UiFormFieldBinding) => unknown
}>()
const emit = defineEmits<{
  closed: []
  closeBlocked: []
  scrollController: [controller: UiScrollController | null]
}>()
if (inject(pavpNaiveAppearanceKey) === undefined)
  throw new TypeError('UiTableEditor requires UiProvider.')

const ownerId = `table-editor-${useId()}`
const active = ref(true)
onActivated(() => {
  active.value = true
})
onDeactivated(() => {
  active.value = false
})
const blocked = ref(false)
const title = computed(() => props.copy.title(props.session.mode.value))
const status = computed(() =>
  props.session.loading.value
    ? props.copy.loading()
    : props.session.error.value
      ? props.copy.error()
      : '',
)
watch(
  () => [props.session, props.session.open.value, props.session.form.value] as const,
  () => {
    blocked.value = false
  },
)
watch(
  () =>
    [
      props.session.form.value?.hasUnsavedChanges.value,
      props.session.form.value?.submitting.value,
    ] as const,
  ([dirty, submitting]) => {
    if (!dirty && !submitting) blocked.value = false
  },
)
watch(
  () => props.session.open.value,
  (open, previous) => {
    if (!open && previous) emit('closed')
  },
)
function close(force = false): void {
  if (!props.session.close(force)) {
    blocked.value = props.session.form.value?.submitting.value !== true
    emit('closeBlocked')
    return
  }
  blocked.value = false
}
function updateShow(show: boolean): void {
  if (!show) close()
}
</script>

<template>
  <NDrawer
    v-if="session.presentation === 'drawer'"
    :show="active && session.open.value"
    :aria-label="title"
    width="min(100vw, calc(2 * var(--ui-layout-admin-drawer-maximum-inline-size)))"
    to="#pavp-overlay-root"
    @update:show="updateShow"
    @after-leave="session.release"
  >
    <NDrawerContent
      :title="title"
      :body-style="{ overflow: 'hidden' }"
      body-content-class="grid h-full min-h-0 min-w-0 grid-rows-1"
    >
      <UiScrollArea
        :owner-id="ownerId"
        contained
      >
        <UiTableEditorBody
          :inert="!session.open.value"
          :session="session"
          v-bind="dateTime === undefined ? {} : { dateTime }"
          :status="status"
        >
          <template
            v-if="slots.field"
            #field="binding"
          >
            <slot
              name="field"
              v-bind="binding"
            />
          </template>
          <template
            v-if="slots.detail"
            #detail="binding"
          >
            <slot
              name="detail"
              v-bind="binding"
            />
          </template>
        </UiTableEditorBody>
      </UiScrollArea>
      <template #footer>
        <div class="flex flex-wrap justify-end gap-content-gap">
          <NButton
            class="min-h-target-enhanced min-w-target-enhanced"
            :disabled="session.form.value?.submitting.value === true"
            @click="close()"
          >
            {{ session.mode.value === 'detail' ? copy.close() : copy.cancel() }}
          </NButton>
          <NButton
            v-if="session.mode.value !== 'detail'"
            class="min-h-target-enhanced min-w-target-enhanced"
            type="primary"
            attr-type="submit"
            :form="session.form.value?.formId"
            :loading="session.form.value?.submitting.value === true"
            :disabled="
              !session.open.value || !session.form.value || session.form.value.submitting.value
            "
          >
            {{ copy.save() }}
          </NButton>
        </div>
      </template>
    </NDrawerContent>
  </NDrawer>
  <NModal
    v-else-if="session.presentation === 'modal'"
    :show="active && session.open.value"
    to="#pavp-overlay-root"
    @update:show="updateShow"
    @after-leave="session.release"
  >
    <NCard
      class="pavp-table-modal__card min-h-0 min-w-0"
      :title="title"
      content-class="grid min-h-0 min-w-0 grid-rows-1"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <UiScrollArea
        :owner-id="ownerId"
        contained
      >
        <UiTableEditorBody
          :inert="!session.open.value"
          :session="session"
          v-bind="dateTime === undefined ? {} : { dateTime }"
          :status="status"
        >
          <template
            v-if="slots.field"
            #field="binding"
          >
            <slot
              name="field"
              v-bind="binding"
            />
          </template>
          <template
            v-if="slots.detail"
            #detail="binding"
          >
            <slot
              name="detail"
              v-bind="binding"
            />
          </template>
        </UiTableEditorBody>
      </UiScrollArea>
      <template #footer>
        <div class="flex flex-wrap justify-end gap-content-gap">
          <NButton
            class="min-h-target-enhanced min-w-target-enhanced"
            :disabled="session.form.value?.submitting.value === true"
            @click="close()"
          >
            {{ session.mode.value === 'detail' ? copy.close() : copy.cancel() }}
          </NButton>
          <NButton
            v-if="session.mode.value !== 'detail'"
            class="min-h-target-enhanced min-w-target-enhanced"
            type="primary"
            attr-type="submit"
            :form="session.form.value?.formId"
            :loading="session.form.value?.submitting.value === true"
            :disabled="
              !session.open.value || !session.form.value || session.form.value.submitting.value
            "
          >
            {{ copy.save() }}
          </NButton>
        </div>
      </template>
    </NCard>
  </NModal>
  <!-- Keep the contained scroll host available while the owner handles return navigation. -->
  <section
    v-else-if="active && (session.open.value || contained)"
    class="min-w-0 gap-content-gap"
    :class="contained ? 'flex flex-1 flex-col min-h-0' : 'grid'"
    :aria-label="title"
  >
    <header class="flex shrink-0 flex-wrap min-w-0 items-center justify-between gap-content-gap">
      <h2 class="leading-body font-title-weight m-0 text-body text-text-primary">
        {{ title }}
      </h2>
    </header>
    <UiScrollArea
      :owner-id="scrollOwnerId ?? ownerId"
      :enabled="active && contained"
      class="flex-1 min-h-0"
      @controller="emit('scrollController', $event)"
    >
      <UiTableEditorBody
        :session="session"
        v-bind="dateTime === undefined ? {} : { dateTime }"
        :status="status"
      >
        <template
          v-if="slots.field"
          #field="binding"
        >
          <slot
            name="field"
            v-bind="binding"
          />
        </template>
        <template
          v-if="slots.detail"
          #detail="binding"
        >
          <slot
            name="detail"
            v-bind="binding"
          />
        </template>
      </UiTableEditorBody>
    </UiScrollArea>
    <footer class="flex shrink-0 flex-wrap justify-end gap-content-gap">
      <NButton
        class="min-h-target-enhanced min-w-target-enhanced"
        :disabled="!session.open.value || session.form.value?.submitting.value === true"
        @click="close()"
      >
        {{ session.mode.value === 'detail' ? copy.close() : copy.cancel() }}
      </NButton>
      <NButton
        v-if="session.mode.value !== 'detail'"
        class="min-h-target-enhanced min-w-target-enhanced"
        type="primary"
        attr-type="submit"
        :form="session.form.value?.formId"
        :loading="session.form.value?.submitting.value === true"
        :disabled="
          !session.open.value || !session.form.value || session.form.value.submitting.value
        "
      >
        {{ copy.save() }}
      </NButton>
    </footer>
  </section>
  <NModal
    :show="active && session.open.value && blocked"
    to="#pavp-overlay-root"
    preset="dialog"
    type="warning"
    :title="title"
    :content="copy.closeBlocked()"
    :positive-text="copy.discardChanges()"
    :negative-text="copy.continueEditing()"
    @positive-click="close(true)"
    @negative-click="blocked = false"
    @close="blocked = false"
    @esc="blocked = false"
    @mask-click="blocked = false"
    @update:show="!$event && (blocked = false)"
  />
</template>

<style scoped>
/* Editor grids respond to their own available width, including teleported hosts. */
@layer utilities {
  .pavp-table-editor-body :deep([data-columns='2']:not(form)) {
    grid-template-columns: repeat(
      auto-fit,
      minmax(
        min(
          100%,
          max(
            calc(var(--ui-layout-admin-content-minimum-inline-size) / 2),
            calc((100% - var(--ui-space-content-gap)) / 2)
          )
        ),
        1fr
      )
    );
  }
}
/* Override Naive's unlayered full-width card rule on this modal surface only. */
@layer vendor-overrides {
  .pavp-table-modal__card {
    width: min(
      calc(100vw - 2 * var(--ui-space-page-inline)),
      calc(2 * var(--ui-layout-admin-drawer-maximum-inline-size))
    ) !important;
    max-height: calc(100dvh - 2 * var(--ui-space-page-inline));
  }
}
</style>
