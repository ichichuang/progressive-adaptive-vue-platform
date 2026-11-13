import type { UiFormAttachment, UiFormAttachmentSource } from '@platform/ui'
import {
  createUploadQueue,
  type UploadAdapter,
  type UploadQueue,
  type UploadTaskSnapshot,
} from '../../shared/api'

/** Application bridge: UI owns attachment references; API owns transfer tasks. */
export function createFormUploadSource(options: {
  readonly adapter: UploadAdapter<UiFormAttachment>
  readonly chunkSize: number
  readonly concurrency?: number
  readonly onChange?: (tasks: readonly UploadTaskSnapshot<UiFormAttachment>[]) => void
}): { readonly source: UiFormAttachmentSource; readonly queue: UploadQueue<UiFormAttachment> } {
  let disposed = false
  const isDisposed = (): boolean => disposed
  const waiting = new Map<
    string,
    {
      resolve(value: UiFormAttachment): void
      reject(reason: unknown): void
      cleanup(): void
    }
  >()
  const settle = (tasks: readonly UploadTaskSnapshot<UiFormAttachment>[]): void => {
    for (const task of tasks) {
      const pending = waiting.get(task.id)
      if (!pending || !['completed', 'failed', 'cancelled'].includes(task.status)) continue
      waiting.delete(task.id)
      pending.cleanup()
      if (task.status === 'completed' && task.result !== undefined) pending.resolve(task.result)
      else
        pending.reject(
          task.status === 'cancelled'
            ? new DOMException('Attachment upload cancelled.', 'AbortError')
            : (task.error ?? new Error('Attachment upload failed.')),
        )
    }
  }
  const queue = createUploadQueue<UiFormAttachment>({
    ...options,
    onChange(tasks) {
      settle(tasks)
      options.onChange?.(tasks)
    },
  })
  const source: UiFormAttachmentSource = (file, { signal }) =>
    new Promise((resolve, reject) => {
      const aborted = (): boolean => signal.aborted
      if (aborted() || isDisposed()) {
        reject(new DOMException('Attachment upload cancelled.', 'AbortError'))
        return
      }
      const id = queue.enqueue(file)
      if (isDisposed()) {
        reject(new DOMException('Attachment upload cancelled.', 'AbortError'))
        return
      }
      const abort = (): void => {
        queue.cancel(id)
      }
      waiting.set(id, {
        resolve,
        reject,
        cleanup: () => {
          signal.removeEventListener('abort', abort)
        },
      })
      signal.addEventListener('abort', abort, { once: true })
      // A synchronous queue observer may have cancelled while enqueue was publishing.
      if (aborted()) abort()
      settle(queue.snapshot())
    })
  return {
    source,
    queue: {
      ...queue,
      dispose() {
        disposed = true
        for (const [id] of waiting) queue.cancel(id)
        queue.dispose()
      },
    },
  }
}
