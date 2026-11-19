<script setup lang="ts" generic="I">
import {
  type ButtonHTMLAttributes,
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  useTemplateRef,
  watch,
} from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { normalizeRichTextDocument as documentValue } from './rich-text-value'
import StarterKit from '@tiptap/starter-kit'
import { NPopover } from 'naive-ui/es/popover'
import { NInput } from 'naive-ui/es/input'
import { NTooltip } from 'naive-ui/es/tooltip'
import UiScrollArea from '../../components/UiScrollArea.vue'
import { NButton } from 'naive-ui/es/button'
import type { UiFormController, UiFormFieldBinding } from '../../components/form-contracts'
import {
  isRichTextUri,
  isRichTextDocument,
  parseRichTextDocument,
  richTextTools,
  type UiRichTextTool,
} from '../../components/rich-text-document'

defineOptions({ name: 'PavpFormRichText' })
const props = defineProps<{
  form: UiFormController<I>
  binding: UiFormFieldBinding
  readonly?: boolean
}>()
const config = computed(() => props.form.fields.find((field) => field.name === props.binding.name))
const tools = computed(() =>
  config.value?.kind === 'rich-text' ? (config.value.tools ?? richTextTools) : [],
)
const hasBlockTools = computed(() =>
  tools.value.some(
    (tool) =>
      tool === 'heading' ||
      tool === 'bullet-list' ||
      tool === 'ordered-list' ||
      tool === 'blockquote',
  ),
)
const toolIcons: Readonly<Record<UiRichTextTool, string>> = {
  bold: 'i-lucide-bold',
  italic: 'i-lucide-italic',
  strike: 'i-lucide-strikethrough',
  heading: 'i-lucide-heading-2',
  'bullet-list': 'i-lucide-list',
  'ordered-list': 'i-lucide-list-ordered',
  blockquote: 'i-lucide-text-quote',
  link: 'i-lucide-link-2',
  undo: 'i-lucide-undo-2',
  redo: 'i-lucide-redo-2',
}
function preserveEditorSelection(event: MouseEvent): void {
  event.preventDefault()
}
const linkUrl = ref('')
const linkOpen = ref(false)
const linkInvalid = ref(false)
const linkTrigger = useTemplateRef<InstanceType<typeof NButton>>('linkTrigger')
const revision = ref(0)
let generation = 0
let publishing = false
let composing = false
let disposed = false
function currentDocument(): string | null {
  try {
    return editor.value ? JSON.stringify(documentValue(editor.value.getJSON())) : null
  } catch {
    return null
  }
}
function commit(): boolean {
  if (disposed || composing) return false
  const instance = editor.value
  if (!instance || props.readonly || props.binding.readonly || props.binding.disabled) return true
  try {
    publishing = true
    const result = props.binding.setValue(documentValue(instance.getJSON()))
    publishing = false
    return result === 'applied' || result === 'unchanged'
  } catch {
    publishing = false
    return false
  }
}
const editor = useEditor({
  content: parseRichTextDocument(props.binding.value),
  injectCSS: false,
  editable: !props.readonly && !props.binding.readonly && !props.binding.disabled,
  extensions: [
    StarterKit.configure({
      code: false,
      codeBlock: false,
      horizontalRule: false,
      underline: false,
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: false,
        linkOnPaste: true,
        isAllowedUri: isRichTextUri,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow', class: null },
      },
    }),
  ],
  onTransaction: () => {
    revision.value += 1
  },
  onUpdate: () => {
    if (!composing) props.binding.setPendingInput(!commit())
  },
  onBlur: () => {
    props.binding.blur()
  },
  editorProps: {
    handleDOMEvents: {
      compositionstart: () => {
        composing = true
        props.binding.setPendingInput(true)
        return false
      },
      compositionend: () => {
        if (!composing) return false
        composing = false
        const ticket = generation
        queueMicrotask(() => {
          if (!disposed && ticket === generation) {
            props.binding.setPendingInput(!commit())
          }
        })
        return false
      },
    },
  },
})
watch(
  () =>
    [
      JSON.stringify(props.binding.value),
      props.binding.disabled,
      props.binding.readonly,
      props.readonly,
    ] as const,
  (state, previous) => {
    const instance = editor.value
    if (!instance) return
    if (
      composing &&
      !publishing &&
      (!previous || state.some((value, index) => value !== previous[index]))
    ) {
      generation += 1
      composing = false
      props.binding.setPendingInput(false)
    }
    instance.setEditable(
      !props.readonly && !props.binding.readonly && !props.binding.disabled,
      false,
    )
    if (
      !composing &&
      isRichTextDocument(props.binding.value) &&
      currentDocument() !== JSON.stringify(props.binding.value)
    )
      instance.commands.setContent(parseRichTextDocument(props.binding.value), {
        emitUpdate: false,
      })
  },
  { immediate: true },
)
watch(
  () =>
    [
      editor.value,
      props.binding,
      props.binding.controlId,
      props.binding.invalid,
      props.binding.describedBy,
    ] as const,
  (_, previous) => {
    const old = previous?.[1]
    if (old && old !== props.binding) {
      generation += 1
      composing = false
      old.setFocusTarget(null)
      old.setCommitTarget(null)
      old.setPendingInput(false)
    }
    props.binding.setFocusTarget(() => editor.value?.commands.focus())
    props.binding.setCommitTarget(commit)
    editor.value?.setOptions({
      editorProps: {
        attributes: {
          id: props.binding.controlId,
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-labelledby': props.binding.labelId,
          'aria-invalid': String(props.binding.invalid),
          'aria-describedby': props.binding.describedBy,
        },
      },
    })
  },
  { immediate: true },
)
function applyLink(): void {
  if (!isRichTextUri(linkUrl.value)) {
    linkInvalid.value = true
    return
  }
  editor.value?.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.value }).run()
  linkOpen.value = false
  linkInvalid.value = false
}
async function closeLink(): Promise<void> {
  linkOpen.value = false
  await nextTick()
  const target: unknown = linkTrigger.value?.$el
  if (target instanceof HTMLElement) target.focus({ preventScroll: true })
}
function closeLinkOnEscape(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  void closeLink()
}
function handleLinkInputKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    applyLink()
    return
  }
  closeLinkOnEscape(event)
}
function active(tool: UiRichTextTool): boolean {
  void revision.value
  const name =
    tool === 'bullet-list' ? 'bulletList' : tool === 'ordered-list' ? 'orderedList' : tool
  return editor.value?.isActive(name) ?? false
}
function act(tool: UiRichTextTool): void {
  const chain = editor.value?.chain().focus()
  if (!chain) return
  switch (tool) {
    case 'bold':
      chain.toggleBold().run()
      break
    case 'italic':
      chain.toggleItalic().run()
      break
    case 'strike':
      chain.toggleStrike().run()
      break
    case 'heading':
      chain.toggleHeading({ level: 2 }).run()
      break
    case 'bullet-list':
      chain.toggleBulletList().run()
      break
    case 'ordered-list':
      chain.toggleOrderedList().run()
      break
    case 'blockquote':
      chain.toggleBlockquote().run()
      break
    case 'undo':
      chain.undo().run()
      break
    case 'redo':
      chain.redo().run()
      break
    case 'link':
      break
  }
}
onBeforeUnmount(() => {
  disposed = true
  props.binding.setFocusTarget(null)
  props.binding.setCommitTarget(null)
  props.binding.setPendingInput(false)
  editor.value?.destroy()
})
</script>
<template>
  <div
    class="pavp-rich-text rounded-control border-solid grid min-w-0 bg-surface-panel border-border-default border-width-default gap-component-unit p-panel-narrow text-body text-text-primary"
    :data-compact="!hasBlockTools"
  >
    <div
      v-if="!readonly && !binding.readonly"
      class="flex min-w-0 items-center overflow-x-auto overflow-y-hidden gap-component-unit"
      role="group"
      :aria-labelledby="binding.labelId"
    >
      <NTooltip
        v-for="tool in tools.filter((item) => item !== 'link')"
        :key="tool"
        :show-arrow="false"
      >
        <template #trigger>
          <NButton
            class="shrink-0 min-h-target-enhanced min-w-target-enhanced"
            size="small"
            :secondary="active(tool)"
            :quaternary="!active(tool)"
            :type="active(tool) ? 'primary' : 'default'"
            :bordered="false"
            v-bind="
              {
                'aria-label': form.copy.richText?.[tool]() ?? tool,
                'aria-pressed': tool === 'undo' || tool === 'redo' ? undefined : active(tool),
                onMousedown: preserveEditorSelection,
              } satisfies ButtonHTMLAttributes
            "
            :disabled="binding.disabled"
            @click="act(tool)"
          >
            <span
              :class="toolIcons[tool]"
              class="size-icon-medium"
              aria-hidden="true"
            />
          </NButton>
        </template>
        {{ form.copy.richText?.[tool]() ?? tool }}
      </NTooltip>
      <NPopover
        v-if="tools.includes('link')"
        v-model:show="linkOpen"
        trigger="click"
      >
        <template #trigger>
          <NTooltip
            :show-arrow="false"
            :disabled="linkOpen"
          >
            <template #trigger>
              <NButton
                ref="linkTrigger"
                class="shrink-0 min-h-target-enhanced min-w-target-enhanced"
                size="small"
                :secondary="active('link')"
                :quaternary="!active('link')"
                :type="active('link') ? 'primary' : 'default'"
                :bordered="false"
                :disabled="binding.disabled"
                v-bind="
                  {
                    'aria-label': form.copy.richText?.link() ?? 'link',
                    onMousedown: preserveEditorSelection,
                  } satisfies ButtonHTMLAttributes
                "
              >
                <span
                  :class="toolIcons.link"
                  class="size-icon-medium"
                  aria-hidden="true"
                />
              </NButton>
            </template>
            {{ form.copy.richText?.link() ?? 'link' }}
          </NTooltip>
        </template>
        <div class="grid gap-component-unit">
          <NInput
            v-model:value="linkUrl"
            :input-props="{ 'aria-label': form.copy.richTextLinkLabel?.() ?? '' }"
            :placeholder="form.copy.richTextLinkLabel?.() ?? ''"
            :status="linkInvalid ? 'error' : 'success'"
            @update:value="linkInvalid = false"
            @keydown="handleLinkInputKeydown"
          />
          <span
            v-if="linkInvalid"
            role="alert"
            v-text="form.copy.richTextLinkInvalid?.()"
          />
          <NButton
            type="primary"
            v-bind="{ onKeydown: closeLinkOnEscape } satisfies ButtonHTMLAttributes"
            @click="applyLink"
          >
            {{ form.copy.richTextLinkApply?.() }}
          </NButton>
        </div>
      </NPopover>
    </div>
    <div class="pavp-rich-text__viewport rounded-control bg-surface-page">
      <UiScrollArea
        :owner-id="`${binding.controlId}-rich-text`"
        contained
      >
        <EditorContent
          v-if="editor"
          :editor="editor"
          class="min-w-0 break-words"
        />
      </UiScrollArea>
    </div>
  </div>
</template>

<style>
@layer components {
  .pavp-rich-text__viewport {
    height: calc(var(--ui-layout-target-enhanced-minimum-block-size) * 6);
    min-height: 0;
  }
  .pavp-rich-text .tiptap {
    min-height: calc(var(--ui-layout-target-enhanced-minimum-block-size) * 5);
    outline: none;
    padding: var(--ui-space-component-unit);
    white-space: pre-wrap;
  }
  .pavp-rich-text[data-compact='true'] .pavp-rich-text__viewport {
    height: calc(var(--ui-layout-target-enhanced-minimum-block-size) * 3);
  }
  .pavp-rich-text[data-compact='true'] .tiptap {
    min-height: calc(var(--ui-layout-target-enhanced-minimum-block-size) * 2);
  }
  .pavp-rich-text .tiptap:focus-visible {
    outline: var(--ui-admin-border-focus);
    outline-offset: calc(-1 * var(--ui-admin-focus-outline-offset));
  }
  @media (forced-colors: active) {
    .pavp-rich-text .tiptap:focus-visible {
      outline-color: Highlight;
    }
  }
  .pavp-rich-text .tiptap p {
    margin-block: var(--ui-space-component-unit);
  }
  .pavp-rich-text .tiptap a {
    color: var(--ui-color-text-primary);
    text-decoration: underline;
  }
  .pavp-rich-text .tiptap h1 {
    font-size: var(--ui-font-size-title);
  }
  .pavp-rich-text .tiptap h2 {
    font-size: var(--ui-font-size-heading);
  }
  .pavp-rich-text .tiptap h3 {
    font-size: var(--ui-font-size-subheading);
  }
  .pavp-rich-text .tiptap :is(h1, h2, h3) {
    font-weight: var(--ui-font-weight-title);
    line-height: var(--ui-font-line-height-title);
    margin-block: var(--ui-space-component-unit);
  }
  .pavp-rich-text .tiptap :is(ul, ol) {
    padding-inline-start: var(--ui-space-content-gap);
    margin-block: var(--ui-space-component-unit);
  }
  .pavp-rich-text .tiptap ul {
    list-style-type: disc;
  }
  .pavp-rich-text .tiptap ol {
    list-style-type: decimal;
  }
  .pavp-rich-text .tiptap blockquote {
    margin: 0;
    padding: var(--ui-space-component-unit);
    border-radius: var(--ui-radius-control);
    background: var(--ui-color-surface-page);
  }
}
</style>
