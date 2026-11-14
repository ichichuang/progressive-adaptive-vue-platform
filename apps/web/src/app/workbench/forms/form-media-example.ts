import { shallowReactive } from 'vue'
import type { UiFormAttachmentService, UiFormSchema } from '@platform/ui'

/** Session-only example storage. No file bytes or object URLs enter form values or drafts. */
export function createFormMediaExample(sampleLabel: () => string) {
  const comparisons = shallowReactive(
    new Map<
      string,
      {
        before: { width: number; height: number; bytes: number }
        after: { width: number; height: number; bytes: number }
      }
    >(),
  )
  async function dimensions(blob: Blob) {
    const image = await createImageBitmap(blob)
    try {
      return { width: image.width, height: image.height, bytes: blob.size }
    } finally {
      image.close()
    }
  }
  async function sampleImage(signal: AbortSignal): Promise<File> {
    const canvas = document.createElement('canvas')
    canvas.width = 2000
    canvas.height = 1400
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image canvas unavailable.')
    // A generated photograph-like test texture, not application interface styling.
    const pixels = context.createImageData(canvas.width, canvas.height)
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const offset = (y * canvas.width + x) * 4
        const wave = Math.sin(x / 180 + y / 240) * 35
        pixels.data[offset] = 65 + x / 16 + wave
        pixels.data[offset + 1] = 80 + y / 12
        pixels.data[offset + 2] = 210 - y / 18 + wave
        pixels.data[offset + 3] = 255
      }
    }
    context.putImageData(pixels, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value)
        else reject(new Error('Image encoding failed.'))
      }, 'image/png')
    })
    signal.throwIfAborted()
    return new File([blob], 'PAVP-landscape.png', { type: blob.type })
  }
  const blobs = new Map<string, Blob>()
  const pageText = [
    ['PAVP attachment preview', 'Page 1 of 3 - Open, zoom and move between pages.'],
    ['Images and documents', 'Page 2 of 3 - Files stay in this browser session.'],
    ['Ready to explore', 'Page 3 of 3 - Return to the first page or close the preview.'],
  ]
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [4 0 R 6 0 R 8 0 R] /Count 3 >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  for (const [index, lines] of pageText.entries()) {
    const contentId = 5 + index * 2
    const commands = `BT /F1 20 Tf 50 740 Td (${lines[0] ?? ''}) Tj 0 -36 Td /F1 12 Tf (${lines[1] ?? ''}) Tj ET`
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${String(contentId)} 0 R >>`,
      `<< /Length ${String(commands.length)} >>\nstream\n${commands}\nendstream`,
    )
  }
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(pdf.length)
    pdf += `${String(index + 1)} 0 obj\n${object}\nendobj\n`
  }
  const start = pdf.length
  const objectCount = String(objects.length + 1)
  pdf += `xref\n0 ${objectCount}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('')}trailer\n<< /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${String(start)}\n%%EOF`
  const sample = new Blob([pdf], { type: 'application/pdf' })
  blobs.set('sample-pdf', sample)
  const service: UiFormAttachmentService = {
    async upload(file, { signal, originalFile }) {
      signal.throwIfAborted()
      const retainedBytes = [...blobs.values()].reduce((total, blob) => total + blob.size, 0)
      if (retainedBytes + file.size > 64 * 1024 * 1024)
        throw new Error('The local preview session is full. Reload before adding more files.')
      const id = crypto.randomUUID()
      if (originalFile && file.type.startsWith('image/')) {
        const [before, after] = await Promise.all([dimensions(originalFile), dimensions(file)])
        signal.throwIfAborted()
        comparisons.set(id, { before, after })
      }
      blobs.set(id, file)
      return { id, name: file.name, size: file.size }
    },
    resolvePreview(attachment, { signal }) {
      signal.throwIfAborted()
      const blob = blobs.get(attachment.id)
      if (!blob) throw new Error('This session attachment is unavailable.')
      return Promise.resolve(blob)
    },
  }
  const imageService: UiFormAttachmentService = {
    ...service,
    pickFile: { label: sampleLabel, select: ({ signal }) => sampleImage(signal) },
  }
  const schema = {
    columns: 1,
    fields: [
      {
        kind: 'attachment',
        name: 'image',
        label: 'formCapabilities.media.image',
        description: 'formCapabilities.media.imageHint',
        source: 'image-session',
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
    imageService,
    comparisons,
    initial: {
      image: [],
      documents: [{ id: 'sample-pdf', name: 'PAVP-preview.pdf', size: sample.size }],
    },
    dispose: () => {
      blobs.clear()
      comparisons.clear()
    },
  }
}
