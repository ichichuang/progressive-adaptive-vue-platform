import { parseRichTextDocument, type UiRichTextDocument } from '../../components/rich-text-document'
/** Only known vendor defaults may disappear. All remaining data passes the public strict parser. */
export function normalizeRichTextDocument(value: unknown): UiRichTextDocument {
  const clone: unknown = JSON.parse(JSON.stringify(value))
  function clean(node: unknown): void {
    if (node === null || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(clean)
      return
    }
    const record = node as Record<string, unknown>
    if (record['attrs'] && typeof record['attrs'] === 'object' && !Array.isArray(record['attrs'])) {
      const attrs = record['attrs'] as Record<string, unknown>
      if (record['type'] === 'orderedList') {
        if (attrs['start'] === 1) delete attrs['start']
        if (attrs['type'] === null) delete attrs['type']
        if (!Object.keys(attrs).length) delete record['attrs']
      }
      if (record['type'] === 'link') {
        if (attrs['target'] === null || attrs['target'] === '_blank') delete attrs['target']
        if (attrs['rel'] === null || attrs['rel'] === 'noopener noreferrer nofollow')
          delete attrs['rel']
        if (attrs['class'] === null) delete attrs['class']
        if (attrs['title'] === null) delete attrs['title']
      }
    }
    Object.values(record).forEach(clean)
    if (record['type'] === 'hardBreak' && record['marks'] !== undefined) {
      parseRichTextDocument({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: ' ', marks: record['marks'] }] },
        ],
      })
      delete record['marks']
    }
  }
  clean(clone)
  return parseRichTextDocument(clone)
}
