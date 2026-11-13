import type * as PdfModule from 'pdfjs-dist'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'

/** Byte-only PDF renderer: no viewer actions, annotation links or remote document URLs. */
type PdfRuntime = Pick<typeof PdfModule, 'getDocument' | 'AnnotationMode'>
async function loadRuntime(): Promise<PdfRuntime> {
  const pdf = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdf.GlobalWorkerOptions.workerSrc = worker.default
  return pdf
}
export async function createPdfPreview(
  blob: Blob,
  signal: AbortSignal,
  load: () => Promise<PdfRuntime> = loadRuntime,
) {
  signal.throwIfAborted()
  if (!blob.size || blob.size > 32 * 1024 * 1024) throw new RangeError('PDF byte limit exceeded.')
  const pdf = await load()
  signal.throwIfAborted()
  const data = new Uint8Array(await blob.arrayBuffer())
  signal.throwIfAborted()
  const loading = pdf.getDocument({
    data,
    // pdfjs-dist 6.5.438 removed isEvalSupported; its core/worker build has no eval/new Function path.
    enableXfa: false,
    useSystemFonts: false,
    disableFontFace: true,
    useWorkerFetch: false,
    useWasm: false,
    BinaryDataFactory: class {
      async fetch({ kind, filename }: { kind: string; filename: string }): Promise<Uint8Array> {
        if (kind !== 'standardFontDataUrl') throw new Error('Unsupported PDF resource.')
        signal.throwIfAborted()
        const { fontUrl } = await import('./pdf-font-assets')
        const response = await fetch(fontUrl(filename), { signal })
        if (!response.ok) throw new Error('Standard font unavailable.')
        return new Uint8Array(await response.arrayBuffer())
      }
    },
  })
  let document: PDFDocumentProxy | undefined
  let render: RenderTask | undefined
  let disposed = false
  const isDisposed = () => disposed
  let generation = 0
  const destroy = () => {
    if (disposed) return
    disposed = true
    generation++
    render?.cancel()
    signal.removeEventListener('abort', destroy)
    void loading.destroy().catch(() => undefined)
  }
  signal.addEventListener('abort', destroy, { once: true })
  try {
    document = await loading.promise
    signal.throwIfAborted()
    if (document.numPages > 500) throw new RangeError('PDF page limit exceeded.')
    const loaded = document
    return {
      pages: loaded.numPages,
      destroy,
      async draw(
        canvas: HTMLCanvasElement,
        pageNumber: number,
        scale: number,
        available?: { width: number; height: number; dpr: number },
      ): Promise<void> {
        if (disposed) throw new Error('PDF preview closed.')
        const revision = ++generation
        const previous = render
        previous?.cancel()
        if (previous) await previous.promise.catch(() => undefined)
        let page: Awaited<ReturnType<PDFDocumentProxy['getPage']>> | undefined
        try {
          if (isDisposed() || revision !== generation || signal.aborted) return
          page = await loaded.getPage(pageNumber)
          signal.throwIfAborted()
          if (revision !== generation) return
          const base = page.getViewport({ scale: 1 })
          const fit = available
            ? Math.min(available.width / base.width, available.height / base.height)
            : 1
          const logicalScale = Math.max(0.01, fit) * scale
          const logical = page.getViewport({ scale: logicalScale })
          const dpr = Math.min(
            available?.dpr ?? 1,
            Math.sqrt(16_000_000 / (logical.width * logical.height)),
          )
          const viewport = page.getViewport({ scale: logicalScale * dpr })
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.style.width = `${String(logical.width)}px`
          canvas.style.height = `${String(logical.height)}px`
          render = page.render({ canvas, viewport, annotationMode: pdf.AnnotationMode.DISABLE })
          await render.promise
        } catch (error) {
          if (!isDisposed() && revision === generation && !signal.aborted) throw error
        } finally {
          page?.cleanup()
        }
      },
    }
  } catch (error) {
    destroy()
    throw error
  }
}

/** Only the newest render in the current open preview may publish feedback. */
export function createPdfPreviewFeedback(setFailed: (failed: boolean) => void) {
  let generation = 0
  return {
    invalidate() {
      generation++
    },
    async draw(signal: AbortSignal, operation: () => Promise<void>): Promise<void> {
      const revision = ++generation
      try {
        await operation()
        if (revision === generation && !signal.aborted) setFailed(false)
      } catch {
        if (revision === generation && !signal.aborted) setFailed(true)
      }
    },
  }
}
