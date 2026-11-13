import type { DeepReadonly } from 'vue'
/** Project-owned rich text JSON. No HTML, files or vendor extension attributes. */
export type UiRichTextTool =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'heading'
  | 'bullet-list'
  | 'ordered-list'
  | 'blockquote'
  | 'link'
  | 'undo'
  | 'redo'
type UiRichTextMark =
  { type: 'bold' | 'italic' | 'strike' } | { type: 'link'; attrs: { href: string } }
type UiRichTextInline =
  { type: 'text'; text: string; marks?: UiRichTextMark[] } | { type: 'hardBreak' }
type UiRichTextBlock =
  | { type: 'paragraph'; content?: UiRichTextInline[] }
  | { type: 'heading'; attrs: { level: 1 | 2 | 3 }; content?: UiRichTextInline[] }
  | { type: 'blockquote'; content: UiRichTextBlock[] }
  | {
      type: 'bulletList' | 'orderedList'
      content: { type: 'listItem'; content: UiRichTextBlock[] }[]
    }
// A type alias preserves assignability to the recursive JSON value contract.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type UiRichTextDocument = { type: 'doc'; content: UiRichTextBlock[] }
export const richTextTools: readonly UiRichTextTool[] = [
  'bold',
  'italic',
  'strike',
  'heading',
  'bullet-list',
  'ordered-list',
  'blockquote',
  'link',
  'undo',
  'redo',
]
export function emptyRichTextDocument(): UiRichTextDocument {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}
export function isRichTextUri(value: string): boolean {
  if (!/^https?:\/\//iu.test(value) || /[\s\u0000-\u001f\u007f]/u.test(value)) return false
  try {
    const url = new URL(value)
    return (
      ['https:', 'http:'].includes(url.protocol) &&
      url.hostname.length > 0 &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}
export function parseRichTextDocument(value: unknown): UiRichTextDocument {
  let count = 0
  let characters = 0
  const ancestors = new Set<object>()
  const fail = (): never => {
    throw new TypeError('Invalid rich text document.')
  }
  function object(value: unknown, keys: readonly string[]): Record<string, unknown> {
    if (
      value === null ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
    )
      return fail()
    if (Reflect.ownKeys(value).some((key) => typeof key !== 'string' || !keys.includes(key)))
      return fail()
    return value as Record<string, unknown>
  }
  function visit(value: unknown, allowed: readonly string[], depth: number): void {
    if (++count > 10000 || depth > 24) fail()
    const node = object(value, ['type', 'content', 'attrs', 'text', 'marks'])
    if (ancestors.has(node)) fail()
    ancestors.add(node)
    const type = node['type']
    if (typeof type !== 'string' || !allowed.includes(type)) fail()
    if (type === 'text') {
      object(node, ['type', 'text', 'marks'])
      if (typeof node['text'] !== 'string' || !node['text'].length) fail()
      characters += (node['text'] as string).length
      if (characters > 100000) fail()
      if (node['marks'] !== undefined) {
        if (!Array.isArray(node['marks'])) fail()
        const seen = new Set<string>()
        for (const raw of node['marks'] as unknown[]) {
          const mark = object(raw, ['type', 'attrs'])
          const kind = mark['type']
          if (
            typeof kind !== 'string' ||
            !['bold', 'italic', 'strike', 'link'].includes(kind) ||
            seen.has(kind)
          )
            fail()
          seen.add(kind as string)
          if (kind === 'link') {
            const attrs = object(mark['attrs'], ['href'])
            if (typeof attrs['href'] !== 'string' || !isRichTextUri(attrs['href'])) fail()
          } else if (mark['attrs'] !== undefined) fail()
        }
      }
    } else if (type === 'hardBreak') object(node, ['type'])
    else {
      object(node, type === 'heading' ? ['type', 'attrs', 'content'] : ['type', 'content'])
      if (type === 'heading') {
        const attrs = object(node['attrs'], ['level'])
        if (![1, 2, 3].includes(attrs['level'] as number)) fail()
      }
      const inline = type === 'paragraph' || type === 'heading'
      const content = node['content']
      if (content === undefined && inline) {
        ancestors.delete(node)
        return
      }
      if (!Array.isArray(content) || (!inline && !content.length)) fail()
      const children = content as unknown[]
      if (
        type === 'listItem' &&
        (children[0] as { type?: unknown } | undefined)?.type !== 'paragraph'
      )
        fail()
      for (const child of children)
        visit(
          child,
          inline
            ? ['text', 'hardBreak']
            : type === 'bulletList' || type === 'orderedList'
              ? ['listItem']
              : ['paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList'],
          depth + 1,
        )
    }
    ancestors.delete(node)
  }
  visit(value, ['doc'], 0)
  return JSON.parse(JSON.stringify(value)) as UiRichTextDocument
}
export function isRichTextDocument(value: unknown): value is UiRichTextDocument {
  try {
    parseRichTextDocument(value)
    return true
  } catch {
    return false
  }
}
export function richTextPlainText(value: DeepReadonly<UiRichTextDocument>): string {
  function text(
    node: DeepReadonly<
      | UiRichTextBlock
      | UiRichTextInline
      | UiRichTextDocument
      | { type: 'listItem'; content: UiRichTextBlock[] }
    >,
  ): string {
    if (node.type === 'text') return node.text
    if (node.type === 'hardBreak') return '\n'
    return (node.content ?? [])
      .map(text)
      .join(node.type === 'paragraph' || node.type === 'heading' ? '' : '\n')
  }
  return text(value)
}
