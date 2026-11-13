<script setup lang="ts" generic="I">
import { computed, onBeforeUnmount, watch, ref } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { normalizeRichTextDocument as documentValue } from './rich-text-value'
import StarterKit from '@tiptap/starter-kit'
import { NPopover } from 'naive-ui/es/popover'
import { NInput } from 'naive-ui/es/input'
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
const linkUrl = ref('')
const linkOpen = ref(false)
const linkInvalid = ref(false)
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
    class="pavp-rich-text rounded-control grid min-w-0 bg-surface-panel gap-component-unit p-panel-narrow text-body text-text-primary"
  >
    <div
      v-if="!readonly && !binding.readonly"
      class="flex flex-wrap gap-component-unit"
    >
      <NButton
        v-for="tool in tools.filter((item) => item !== 'link')"
        :key="tool"
        size="small"
        :quaternary="!active(tool)"
        :type="active(tool) ? 'primary' : 'default'"
        :aria-pressed="active(tool)"
        :disabled="binding.disabled"
        @mousedown.prevent
        @click="act(tool)"
      >
        {{ form.copy.richText?.[tool]() ?? tool }}
      </NButton>
      <NPopover
        v-if="tools.includes('link')"
        v-model:show="linkOpen"
        trigger="click"
      >
        <template #trigger>
          <NButton
            size="small"
            quaternary
            :disabled="binding.disabled"
            @mousedown.prevent
          >
            {{ form.copy.richText?.link() }}
          </NButton>
        </template>
        <div class="grid gap-component-unit">
          <NInput
            v-model:value="linkUrl"
            :aria-label="form.copy.richTextLinkLabel?.() ?? ''"
            :placeholder="form.copy.richTextLinkLabel?.() ?? ''"
            :status="linkInvalid ? 'error' : 'success'"
            @update:value="linkInvalid = false"
            @keydown.enter.prevent="applyLink"
          />
          <span
            v-if="linkInvalid"
            role="alert"
            v-text="form.copy.richTextLinkInvalid?.()"
          />
          <NButton
            type="primary"
            @click="applyLink"
          >
            {{ form.copy.richTextLinkApply?.() }}
          </NButton>
        </div>
      </NPopover>
    </div>
    <div class="pavp-rich-text__viewport">
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
