import assert from 'node:assert/strict'
import { createUploadQueue } from '../../apps/web/src/shared/api'

export async function verifyUploads(): Promise<void> {
  const turns = async (): Promise<void> => {
    for (let i = 0; i < 12; i++) await Promise.resolve()
  }
  const calls: {
    id: string
    index: number
    signal: AbortSignal
    resolve(): void
    reject(error: Error): void
  }[] = []
  const queue = createUploadQueue({
    chunkSize: 2,
    concurrency: 1,
    adapter: {
      uploadChunk(input) {
        return new Promise<void>((resolve, reject) => {
          calls.push({
            id: input.taskId,
            index: input.index,
            signal: input.signal,
            resolve,
            reject,
          })
        })
      },
      complete: ({ taskId }) => Promise.resolve(taskId),
    },
  })
  const first = queue.enqueue(new File(['abcde'], 'first'))
  const second = queue.enqueue(new File(['xy'], 'second'))
  assert.equal(calls.length, 1)
  calls[0]?.resolve()
  await turns()
  assert.equal(queue.snapshot()[0]?.uploadedBytes, 2)
  queue.pause(first)
  assert.equal(calls[1]?.signal.aborted, true)
  queue.resume(first)
  assert.equal(calls.length, 2, 'Do not overlap pending aborted transport with a resume')
  calls[1].resolve()
  await turns()
  assert.equal(calls[2]?.index, 1, 'Unacknowledged chunk retries with same index')
  calls[2].resolve()
  await turns()
  calls[3]?.resolve()
  await turns()
  assert.equal(queue.snapshot()[0]?.status, 'completed')
  assert.equal(queue.snapshot()[0]?.uploadedBytes, 5)
  assert.equal(calls[4]?.id, second)
  calls[4].reject(new Error('Offline'))
  await turns()
  assert.equal(queue.snapshot()[1]?.status, 'failed')
  queue.resume(second)
  calls[5]?.resolve()
  await turns()
  assert.equal(queue.snapshot()[1]?.status, 'completed')
  const cancelled = queue.enqueue(new File(['xx'], 'cancel'))
  queue.cancel(cancelled)
  calls[6]?.resolve()
  await turns()
  assert.equal(queue.snapshot()[2]?.status, 'cancelled')
  assert.equal(queue.snapshot()[2]?.uploadedBytes, 0)
  queue.enqueue(new File([], 'empty'))
  await turns()
  assert.equal(queue.snapshot()[3]?.status, 'completed')
  queue.dispose()
  assert.equal(queue.snapshot().length, 0)
  assert.throws(() => queue.enqueue(new File([], 'no')))
  assert.throws(() =>
    createUploadQueue({
      chunkSize: 0,
      adapter: { uploadChunk: () => Promise.resolve(), complete: () => Promise.resolve() },
    }),
  )
  await verifyUploadCompletionRaces()
  console.log(
    'Upload queue: chunks, concurrency, pause/resume races, cancellation, failure retry, empty file and disposal passed.',
  )
}

async function verifyUploadCompletionRaces(): Promise<void> {
  const turns = async (): Promise<void> => {
    for (let i = 0; i < 12; i++) await Promise.resolve()
  }
  const completions: {
    signal: AbortSignal
    resolve(value: string): void
    reject(error: Error): void
  }[] = []
  let chunks = 0
  let notifications = 0
  const queue = createUploadQueue<string>({
    chunkSize: 8,
    onChange() {
      notifications++
    },
    adapter: {
      uploadChunk() {
        chunks++
        return Promise.resolve()
      },
      complete({ signal }) {
        return new Promise((resolve, reject) => {
          completions.push({ signal, resolve, reject })
        })
      },
    },
  })
  const id = queue.enqueue(new File(['sample'], 'completion'))
  await turns()
  assert.equal(queue.snapshot()[0]?.uploadedBytes, 6)
  assert.equal(
    queue.snapshot()[0]?.status,
    'uploading',
    'Acknowledged chunks are not completed until finalize succeeds',
  )
  queue.pause(id)
  queue.resume(id)
  assert.equal(
    completions.length,
    1,
    'Do not overlap finalize attempts while old adapter ignores abort',
  )
  completions[0]?.resolve('stale-result')
  await turns()
  assert.equal(completions.length, 2)
  assert.equal(chunks, 1, 'Finalize retry must not resend acknowledged chunks')
  assert.equal(queue.snapshot()[0]?.result, undefined)
  completions[1]?.reject(new Error('Finalize failed'))
  await turns()
  assert.equal(queue.snapshot()[0]?.status, 'failed')
  queue.resume(id)
  await turns()
  assert.equal(chunks, 1)
  queue.cancel(id)
  completions[2]?.resolve('cancelled-result')
  await turns()
  assert.equal(queue.snapshot()[0]?.status, 'cancelled')
  assert.equal(queue.snapshot()[0]?.result, undefined)
  queue.enqueue(new File([], 'disposed'))
  await turns()
  queue.dispose()
  const beforeSettlement = notifications
  completions[3]?.resolve('disposed-result')
  await turns()
  assert.equal(notifications, beforeSettlement, 'Disposed owners receive no late callbacks')
  assert.equal(queue.snapshot().length, 0)

  let pausedChunks = 0
  const synchronousQueue = createUploadQueue<string>({
    chunkSize: 1,
    onChange(tasks) {
      const task = tasks[0]
      if (task?.status === 'uploading') synchronousQueue.pause(task.id)
    },
    adapter: {
      uploadChunk() {
        pausedChunks++
        return Promise.resolve()
      },
      complete() {
        return Promise.resolve('done')
      },
    },
  })
  synchronousQueue.enqueue(new File(['xy'], 'observer-pause'))
  await turns()
  assert.equal(pausedChunks, 0, 'A synchronous pause observer prevents the next transport call')
  synchronousQueue.dispose()
}
