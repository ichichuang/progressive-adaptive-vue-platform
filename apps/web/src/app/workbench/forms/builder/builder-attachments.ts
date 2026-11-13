import type {
  UiFormAttachmentSource,
  UiFormAttachmentService,
  UiFormNode,
  UiFormSchema,
} from '@platform/ui'

/** Builder-only local selection, never an HTTP handler or simulated server upload. */
export function builderAttachments(
  schema: UiFormSchema,
  blobs = new Map<string, Blob>(),
): Readonly<Record<string, UiFormAttachmentService>> {
  const entries: [string, UiFormAttachmentService][] = []
  const choose: UiFormAttachmentSource = (file, { signal }) => {
    signal.throwIfAborted()
    const retainedSize = [...blobs.values()].reduce((sum, blob) => sum + blob.size, 0)
    if (retainedSize + file.size > 64 * 1024 * 1024)
      return Promise.reject(new RangeError('Local preview storage is full.'))
    const id = crypto.randomUUID()
    blobs.set(id, file)
    return Promise.resolve({ id, name: file.name, size: file.size })
  }
  const service: UiFormAttachmentService = {
    upload: choose,
    resolvePreview: (reference, { signal }) => {
      signal.throwIfAborted()
      const blob = blobs.get(reference.id)
      return blob
        ? Promise.resolve(blob)
        : Promise.reject(new Error('This local attachment is no longer available.'))
    },
  }
  function visit(nodes: readonly UiFormNode[]): void {
    for (const node of nodes) {
      if (node.kind === 'attachment') entries.push([node.source, service])
      else if (node.kind === 'group' || node.kind === 'repeat') visit(node.fields)
    }
  }
  visit(schema.fields)
  return Object.fromEntries(entries)
}
