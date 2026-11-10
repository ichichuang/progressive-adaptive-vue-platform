<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NPopover } from 'naive-ui/es/popover'
import { UiScrollArea, type UiFormNode, type UiFormSchema } from '@platform/ui'
import { useConsoleI18n } from '../../../../shared/i18n'
import { builderEntries, builderKinds, builderNode, type BuilderKind } from './use-form-builder'

const props = defineProps<{
  readonly schema: UiFormSchema
  readonly selected: readonly string[]
  readonly pending: boolean
  readonly ownerId: string
  readonly active: boolean
}>()
const emit = defineEmits<{
  select: [path: readonly string[]]
  add: [kind: BuilderKind, parent?: readonly string[]]
  move: [path: readonly string[], offset: number]
  reorder: [from: readonly string[], to: readonly string[]]
}>()
const { t } = useConsoleI18n()
const entries = computed(() => builderEntries(props.schema))
const selectedNode = computed(() => builderNode(props.schema, props.selected))
const target = computed(() =>
  selectedNode.value?.kind === 'group' || selectedNode.value?.kind === 'repeat'
    ? props.selected
    : props.selected.slice(0, -1),
)
const drag = ref<{ kind: BuilderKind } | { path: readonly string[] } | null>(null)
const palettes = Object.keys(builderKinds) as BuilderKind[]
const paletteOpen = ref(false)
function endDrag(): void {
  drag.value = null
  paletteOpen.value = false
}
function add(kind: BuilderKind): void {
  emit('add', kind)
  paletteOpen.value = false
}
function start(event: DragEvent, value: NonNullable<typeof drag.value>): void {
  if (props.pending || !event.dataTransfer) return
  drag.value = value
  event.dataTransfer.effectAllowed = 'kind' in value ? 'copy' : 'move'
  event.dataTransfer.setData('text/plain', 'pavp-form-field')
  if ('kind' in value) event.dataTransfer.setData('application/x-pavp-form-field', value.kind)
}
function acceptDrop(event: DragEvent): void {
  if (!event.dataTransfer) return
  event.dataTransfer.dropEffect =
    props.pending || drag.value === null ? 'none' : 'kind' in drag.value ? 'copy' : 'move'
}
function drop(path: readonly string[], node?: UiFormNode): void {
  const value = drag.value
  drag.value = null
  if (props.pending || !value) return
  if ('kind' in value)
    emit(
      'add',
      value.kind,
      node?.kind === 'group' || node?.kind === 'repeat' ? path : path.slice(0, -1),
    )
  else emit('reorder', value.path, path)
}
function position(path: readonly string[]): { index: number; count: number } {
  const parent = builderNode(props.schema, path.slice(0, -1))
  const fields =
    path.length === 1
      ? props.schema.fields
      : parent?.kind === 'group' || parent?.kind === 'repeat'
        ? parent.fields
        : []
  return { index: fields.findIndex((field) => field.name === path.at(-1)), count: fields.length }
}
</script>

<template>
  <section
    class="flex flex-col min-h-0 min-w-0"
    :aria-label="t('formBuilder.structure')"
  >
    <header
      class="wb-builder-heading flex shrink-0 items-center justify-between gap-component-unit"
    >
      <h2 class="font-title-weight m-0 text-body text-text-primary">
        {{ t('formBuilder.structure') }}
        <span class="text-caption text-text-secondary">{{ entries.length }}</span>
      </h2>
      <div class="ml-auto flex items-center gap-component-unit">
        <NButton
          size="small"
          quaternary
          :type="!selected.length ? 'primary' : 'default'"
          :disabled="pending"
          :aria-label="t('formBuilder.selectRoot')"
          :title="t('formBuilder.root')"
          @click="emit('select', [])"
          @dragenter.prevent="acceptDrop"
          @dragover.prevent="acceptDrop"
          @drop.stop.prevent="drop([])"
        >
          <template #icon>
            <span
              class="i-lucide-folder-tree"
              aria-hidden="true"
            />
          </template>
        </NButton>
        <NPopover
          v-model:show="paletteOpen"
          trigger="click"
          placement="bottom-start"
          to="#pavp-overlay-root"
          :disabled="pending"
        >
          <template #trigger>
            <NButton
              size="small"
              secondary
              type="primary"
              :disabled="pending"
            >
              <template #icon>
                <span
                  class="i-lucide-plus"
                  aria-hidden="true"
                />
              </template>
              {{ t('formBuilder.fields') }}
            </NButton>
          </template>
          <div class="grid min-w-0 gap-component-unit">
            <span
              class="text-caption text-text-secondary"
              v-text="
                `${t('formBuilder.addTo')} ${target.length ? target.join(' / ') : t('formBuilder.root')}`
              "
            />
            <div class="grid grid-cols-3 gap-component-unit">
              <NButton
                v-for="kind in palettes"
                :key="kind"
                size="small"
                tertiary
                :disabled="pending"
                :draggable="!pending"
                :aria-label="`${t('formBuilder.add')} ${t(builderKinds[kind])}`"
                @click="add(kind)"
                @dragstart="start($event, { kind })"
                @dragend="endDrag"
              >
                {{ t(builderKinds[kind]) }}
              </NButton>
            </div>
            <span class="text-caption text-text-secondary">{{ t('formBuilder.addHint') }}</span>
          </div>
        </NPopover>
      </div>
    </header>
    <UiScrollArea
      :owner-id="ownerId"
      :enabled="active"
      class="flex-1 min-h-0 min-w-0"
    >
      <div class="wb-builder-outline grid min-w-0 gap-component-unit">
        <p
          v-if="!entries.length"
          class="m-0 text-caption text-text-secondary"
        >
          {{ t('formBuilder.empty') }}
        </p>
        <div
          v-for="entry in entries"
          :key="entry.path.join('.')"
          class="wb-builder-row rounded-control grid min-w-0 items-center"
          :class="selected.join('.') === entry.path.join('.') ? 'bg-surface-page' : ''"
        >
          <NButton
            class="max-w-full min-w-0 justify-self-start"
            :title="entry.path.join(' / ')"
            size="small"
            quaternary
            :type="selected.join('.') === entry.path.join('.') ? 'primary' : 'default'"
            :aria-pressed="selected.join('.') === entry.path.join('.')"
            :aria-label="`${t('formBuilder.edit')} ${entry.node.label} ${entry.path.join('.')}`"
            :disabled="pending"
            :draggable="!pending"
            @click="emit('select', entry.path)"
            @dragenter.prevent="acceptDrop"
            @dragover.prevent="acceptDrop"
            @drop.stop.prevent="drop(entry.path, entry.node)"
            @dragstart="start($event, { path: entry.path })"
            @dragend="drag = null"
          >
            <template #icon>
              <span
                :class="
                  entry.node.kind === 'group' || entry.node.kind === 'repeat'
                    ? 'i-lucide-folder'
                    : 'i-lucide-grip-vertical'
                "
                aria-hidden="true"
              />
            </template>
            <span class="flex min-w-0 items-center gap-component-unit">
              <span
                v-if="entry.path.length > 1"
                class="truncate text-caption text-text-secondary"
                v-text="`${entry.path.slice(0, -1).join(' / ')} /`"
              />
              <span
                class="truncate"
                v-text="entry.node.label"
              />
            </span>
          </NButton>
          <div class="flex items-center">
            <NButton
              size="tiny"
              quaternary
              :disabled="pending || position(entry.path).index === 0"
              :aria-label="`${t('configuredForm.moveUp')} ${entry.node.label}`"
              @click="emit('move', entry.path, -1)"
            >
              <template #icon>
                <span
                  class="i-lucide-chevron-up"
                  aria-hidden="true"
                />
              </template>
            </NButton>
            <NButton
              size="tiny"
              quaternary
              :disabled="pending || position(entry.path).index === position(entry.path).count - 1"
              :aria-label="`${t('configuredForm.moveDown')} ${entry.node.label}`"
              @click="emit('move', entry.path, 1)"
            >
              <template #icon>
                <span
                  class="i-lucide-chevron-down"
                  aria-hidden="true"
                />
              </template>
            </NButton>
          </div>
        </div>
      </div>
    </UiScrollArea>
  </section>
</template>
