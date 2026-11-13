import type { UiFormAttachmentSource, UiFormNode, UiFormSchema } from '@platform/ui'

/** Builder-only local selection, never an HTTP handler or simulated server upload. */
export function builderAttachments(
  schema: UiFormSchema,
): Readonly<Record<string, UiFormAttachmentSource>> {
  const entries: [string, UiFormAttachmentSource][] = []
  const choose: UiFormAttachmentSource = (file) =>
    Promise.resolve({ id: crypto.randomUUID(), name: file.name, size: file.size })
  function visit(nodes: readonly UiFormNode[]): void {
    for (const node of nodes) {
      if (node.kind === 'attachment') entries.push([node.source, choose])
      else if (node.kind === 'group' || node.kind === 'repeat') visit(node.fields)
    }
  }
  visit(schema.fields)
  return Object.fromEntries(entries)
}
