import type { UiFormAttachmentService, UiFormSchema } from '@platform/ui'

/** Session-only example storage. No file bytes or object URLs enter form values or drafts. */
export function createFormMediaExample() {
  const blobs = new Map<string, Blob>()
  const commands =
    'BT /F1 20 Tf 50 740 Td (PAVP attachment preview) Tj 0 -36 Td /F1 12 Tf (A local sample. No file is uploaded to a server.) Tj ET'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${String(commands.length)} >>\nstream\n${commands}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(pdf.length)
    pdf += `${String(index + 1)} 0 obj\n${object}\nendobj\n`
  }
  const start = pdf.length
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${String(start)}\n%%EOF`
  const sample = new Blob([pdf], { type: 'application/pdf' })
  blobs.set('sample-pdf', sample)
  const service: UiFormAttachmentService = {
    upload(file, { signal }) {
      signal.throwIfAborted()
      const retainedBytes = [...blobs.values()].reduce((total, blob) => total + blob.size, 0)
      if (retainedBytes + file.size > 64 * 1024 * 1024)
        throw new Error('The local preview session is full. Reload before adding more files.')
      const id = crypto.randomUUID()
      blobs.set(id, file)
      return Promise.resolve({ id, name: file.name, size: file.size })
    },
    resolvePreview(attachment, { signal }) {
      signal.throwIfAborted()
      const blob = blobs.get(attachment.id)
      if (!blob) throw new Error('This session attachment is unavailable.')
      return Promise.resolve(blob)
    },
  }
  const schema = {
    columns: 1,
    fields: [
      {
        kind: 'attachment',
        name: 'image',
        label: 'formCapabilities.media.image',
        description: 'formCapabilities.media.imageHint',
        source: 'session',
        accept: 'image/png,image/jpeg,image/webp',
        maxFiles: 1,
        maxSize: 8 * 1024 * 1024,
        imageProcessing: {
          crop: { aspectRatio: 4 / 3 },
          output: { mimeType: 'image/webp', quality: 0.85, maxWidth: 1600, maxHeight: 1200 },
        },
        preview: { types: ['image'] },
      },
      {
        kind: 'attachment',
        name: 'documents',
        label: 'formCapabilities.media.documents',
        description: 'formCapabilities.media.documentsHint',
        source: 'session',
        accept: 'application/pdf,image/png,image/jpeg,image/webp',
        maxFiles: 4,
        maxSize: 8 * 1024 * 1024,
        preview: { types: ['image', 'pdf'] },
      },
    ],
  } as const satisfies UiFormSchema
  return {
    schema,
    service,
    initial: {
      image: [],
      documents: [{ id: 'sample-pdf', name: 'PAVP-preview.pdf', size: sample.size }],
    },
    dispose: () => {
      blobs.clear()
    },
  }
}
