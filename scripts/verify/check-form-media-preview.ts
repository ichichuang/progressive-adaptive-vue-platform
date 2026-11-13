import assert from 'node:assert/strict'
import {
  createPdfPreview,
  createPdfPreviewFeedback,
} from '../../packages/ui/src/adapters/media/pdf-preview'

type PdfRuntime = Awaited<ReturnType<NonNullable<Parameters<typeof createPdfPreview>[2]>>>
type PDFDocumentLoadingTask = ReturnType<PdfRuntime['getDocument']>
type PDFDocumentProxy = Awaited<PDFDocumentLoadingTask['promise']>
type PDFPageProxy = Awaited<ReturnType<PDFDocumentProxy['getPage']>>

export async function verifyFormMediaPreview(): Promise<void> {
  let renders = 0
  let cleanups = 0
  let destroys = 0
  let release: ((page: PDFPageProxy) => void) | undefined
  const page = {
    getViewport: ({ scale }: { scale: number }) => ({ width: 100 * scale, height: 100 * scale }),
    render: () => {
      renders++
      return {
        promise: Promise.resolve(),
        cancel() {
          return undefined
        },
      }
    },
    cleanup: () => {
      cleanups++
    },
  } as unknown as PDFPageProxy
  const document = {
    numPages: 2,
    getPage: () =>
      new Promise<PDFPageProxy>((resolve) => {
        release = resolve
      }),
  } as unknown as PDFDocumentProxy
  const runtime = {
    getDocument: () =>
      ({
        promise: Promise.resolve(document),
        destroy: () => {
          destroys++
          return Promise.resolve()
        },
      }) as unknown as PDFDocumentLoadingTask,
    GlobalWorkerOptions: { workerSrc: '', workerPort: null },
    AnnotationMode: { DISABLE: 0, ENABLE: 1, ENABLE_FORMS: 2, ENABLE_STORAGE: 3 },
  }
  const blob = new Blob(['%PDF-1.7'])
  const controller = new AbortController()
  const preview = await createPdfPreview(blob, controller.signal, () => Promise.resolve(runtime))
  const drawing = preview.draw({ width: 0, height: 0 } as HTMLCanvasElement, 1, 1)
  preview.destroy()
  release?.(page)
  await drawing
  assert.equal(renders, 0, 'destroy while getPage waits must prevent rendering')
  assert.equal(cleanups, 1)
  assert.equal(destroys, 1)
  preview.destroy()
  assert.equal(destroys, 1)
  await assert.rejects(preview.draw({} as HTMLCanvasElement, 1, 1))
  const fresh = await createPdfPreview(blob, new AbortController().signal, () =>
    Promise.resolve(runtime),
  )
  const canvas = { width: 0, height: 0, style: { width: '', height: '' } } as HTMLCanvasElement
  const fit = fresh.draw(canvas, 1, 1, { width: 800, height: 400, dpr: 2 })
  release?.(page)
  await fit
  assert.equal(canvas.width, 800)
  assert.equal(canvas.height, 800)
  assert.equal(canvas.style.width, '400px')
  assert.equal(canvas.style.height, '400px')
  assert.equal(renders, 1)
  fresh.destroy()
  controller.abort()
  await assert.rejects(createPdfPreview(blob, controller.signal, () => Promise.resolve(runtime)))
  await assert.rejects(
    createPdfPreview(new Blob([]), new AbortController().signal, () => Promise.resolve(runtime)),
  )
  let renderCount = 0
  let rejectRender: ((reason: Error) => void) | undefined
  const racingPage = {
    getViewport: page.getViewport.bind(page),
    cleanup: page.cleanup.bind(page),
    render: () => {
      renderCount++
      return renderCount === 1
        ? {
            promise: new Promise<void>((_resolve, reject) => {
              rejectRender = reject
            }),
            cancel: () => {
              rejectRender?.(new Error('Rendering cancelled'))
            },
          }
        : { promise: Promise.resolve(), cancel: () => undefined }
    },
  } as unknown as PDFPageProxy
  const racingDocument = {
    numPages: 2,
    getPage: () => Promise.resolve(racingPage),
  } as unknown as PDFDocumentProxy
  const racing = await createPdfPreview(blob, new AbortController().signal, () =>
    Promise.resolve({
      ...runtime,
      getDocument: () =>
        ({
          promise: Promise.resolve(racingDocument),
          destroy: () => Promise.resolve(),
        }) as unknown as PDFDocumentLoadingTask,
    }),
  )
  const oldRender = racing.draw(canvas, 1, 1)
  await Promise.resolve()
  const newerRender = racing.draw(canvas, 2, 2)
  await Promise.all([oldRender, newerRender])
  assert.equal(renderCount, 2, 'superseded render rejection must not fail the next render')
  racing.destroy()

  const feedbackStates: boolean[] = []
  const feedback = createPdfPreviewFeedback((failed) => {
    feedbackStates.push(failed)
  })
  let rejectOldFeedback: ((error: Error) => void) | undefined
  const oldFeedback = feedback.draw(
    new AbortController().signal,
    () =>
      new Promise<void>((_resolve, reject) => {
        rejectOldFeedback = reject
      }),
  )
  feedback.invalidate() // close old preview before reopening a different document
  await feedback.draw(new AbortController().signal, () => Promise.resolve())
  rejectOldFeedback?.(new Error('Old document failed'))
  await oldFeedback
  assert.deepEqual(feedbackStates, [false], 'closed/replaced preview must not publish old errors')
  await feedback.draw(new AbortController().signal, () =>
    Promise.reject(new Error('Current error')),
  )
  await feedback.draw(new AbortController().signal, () => Promise.resolve())
  assert.deepEqual(feedbackStates, [false, true, false], 'successful retry clears current failure')
}
