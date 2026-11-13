<script setup lang="ts">
import type { UiDateTimeContext } from '../date-time/date-time'
import {
  computed,
  inject,
  nextTick,
  onActivated,
  onDeactivated,
  onMounted,
  onBeforeUnmount,
  ref,
  useId,
  watch,
} from 'vue'
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
// Surface geometry is transient UI state, never a second form or a persisted draft.
const modalCard = ref<InstanceType<typeof NCard>>()
const maximized = ref(false)
const correction = ref({ x: 0, y: 0 })
const canMaximize = computed(() => props.session.modal?.maximizable === true)
watch(
  canMaximize,
  (enabled) => {
    if (enabled && (!props.copy.maximize || !props.copy.restore))
      throw new TypeError('Maximizable editor requires maximize and restore copy.')
  },
  { immediate: true },
)
function keepModalVisible(): void {
  if (!props.session.open.value || props.session.presentation !== 'modal' || maximized.value) return
  const element: unknown = modalCard.value?.$el
  if (!(element instanceof HTMLElement)) return
  const rect = element.getBoundingClientRect()
  // Correct vendor drag offsets after viewport changes without touching its private state.
  const x =
    rect.left < 0 ? -rect.left : rect.right > window.innerWidth ? window.innerWidth - rect.right : 0
  const y =
    rect.top < 0
      ? -rect.top
      : rect.bottom > window.innerHeight
        ? window.innerHeight - rect.bottom
        : 0
  if (x || y) correction.value = { x: correction.value.x + x, y: correction.value.y + y }
  element.style.translate = `${String(correction.value.x)}px ${String(correction.value.y)}px`
}
function resizeModal(): void {
  void nextTick(keepModalVisible)
}
function toggleMaximize(): void {
  maximized.value = !maximized.value
  const element: unknown = modalCard.value?.$el
  if (element instanceof HTMLElement)
    element.style.translate = maximized.value
      ? 'none'
      : `${String(correction.value.x)}px ${String(correction.value.y)}px`
  void nextTick(keepModalVisible)
}
function preventMaximizedDrag(event: MouseEvent): void {
  // Naive starts drag listeners on after-enter, not on reactive draggable changes.
  if (maximized.value) event.stopImmediatePropagation()
}
function releaseModal(): void {
  maximized.value = false
  correction.value = { x: 0, y: 0 }
  props.session.release()
}
onMounted(() => {
  window.addEventListener('resize', resizeModal)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeModal)
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
    :draggable="session.modal?.draggable === true"
    to="#pavp-overlay-root"
    @update:show="updateShow"
    @after-leave="releaseModal"
  >
    <template #default="{ draggableClass }">
      <NCard
        ref="modalCard"
        :data-maximized="maximized"
        class="pavp-table-modal__card min-h-0 min-w-0"
        content-class="grid min-h-0 min-w-0 grid-rows-1"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <template #header>
          <span
            :class="[
              draggableClass === 'n-draggable' ? 'n-draggable' : '',
              !maximized && draggableClass === 'n-draggable' ? 'cursor-move' : 'cursor-default',
            ]"
            role="presentation"
            @mousedown.capture="preventMaximizedDrag"
            v-text="title"
          />
        </template>
        <template
          v-if="canMaximize"
          #header-extra
        >
          <NButton
            quaternary
            :aria-label="maximized ? copy.restore?.() : copy.maximize?.()"
            :title="maximized ? copy.restore?.() : copy.maximize?.()"
            @click="toggleMaximize"
          >
            <span
              :class="maximized ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
              class="size-icon"
              aria-hidden="true"
            />
          </NButton>
        </template>
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
    </template>
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
  .pavp-table-modal__card[data-maximized='true'] {
    width: calc(100vw - 2 * var(--ui-space-page-inline)) !important;
    height: calc(100dvh - 2 * var(--ui-space-page-inline));
    left: 0 !important;
    top: 0 !important;
  }
}
</style>
