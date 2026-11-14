// @unocss-include
import {
  defineComponent,
  h,
  createTextVNode,
  type DeepReadonly,
  type PropType,
  type VNodeChild,
} from 'vue'
import { parseRichTextDocument, type UiRichTextDocument } from './rich-text-document'

type UiRichTextBlock = UiRichTextDocument['content'][number]
type UiRichTextInline = NonNullable<
  Extract<UiRichTextBlock, { type: 'paragraph' }>['content']
>[number]

/** Semantic read-only rendering of the validated project document, without an editor or HTML injection. */
export const PavpRichTextContent = defineComponent({
  name: 'PavpRichTextContent',
  props: {
    document: { type: Object as PropType<DeepReadonly<UiRichTextDocument>>, required: true },
  },
  setup(props) {
    function inline(node: UiRichTextInline): VNodeChild {
      if (node.type === 'hardBreak') return h('br')
      let content: VNodeChild = createTextVNode(node.text)
      for (const mark of node.marks ?? []) {
        if (mark.type === 'link')
          content = h('span', { class: 'underline break-words' }, [
            content,
            ` (${mark.attrs.href})`,
          ])
        else if (mark.type === 'bold') content = h('strong', {}, [content])
        else if (mark.type === 'italic') content = h('em', {}, [content])
        else content = h('s', {}, [content])
      }
      return content
    }
    function block(node: UiRichTextBlock): VNodeChild {
      if (node.type === 'paragraph')
        return h(
          'p',
          { class: 'm-0 whitespace-pre-wrap break-words' },
          (node.content ?? []).map(inline),
        )
      if (node.type === 'heading') {
        const children = (node.content ?? []).map(inline)
        if (node.attrs.level === 1)
          return h('h1', { class: 'm-0 text-title font-title-weight break-words' }, children)
        if (node.attrs.level === 2)
          return h('h2', { class: 'm-0 text-subheading font-title-weight break-words' }, children)
        return h('h3', { class: 'm-0 text-body font-title-weight break-words' }, children)
      }
      if (node.type === 'blockquote')
        return h(
          'blockquote',
          { class: 'm-0 text-text-secondary grid gap-component-unit' },
          node.content.map(block),
        )
      return h(
        node.type === 'bulletList' ? 'ul' : 'ol',
        {
          class: [
            'm-0 grid gap-component-unit p-panel-narrow',
            node.type === 'bulletList' ? 'list-disc list-outside' : 'list-decimal list-outside',
          ],
        },
        node.content.map((item) => h('li', {}, item.content.map(block))),
      )
    }
    return () =>
      h(
        'div',
        { class: 'grid min-w-0 gap-component-unit text-body text-text-primary' },
        parseRichTextDocument(props.document).content.map(block),
      )
  },
})
