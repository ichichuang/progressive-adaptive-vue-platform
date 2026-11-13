/** In-memory uploads. The adapter owns server protocol and idempotency, not this queue. */
export type UploadTaskStatus =
  'queued' | 'uploading' | 'paused' | 'failed' | 'completed' | 'cancelled'
export interface UploadTaskSnapshot<Result> {
  readonly id: string
  readonly name: string
  readonly size: number
  readonly status: UploadTaskStatus
  /** Server-acknowledged bytes only; never an estimated network percentage. */
  readonly uploadedBytes: number
  readonly completedChunks: number
  readonly totalChunks: number
  readonly result?: Result
  readonly error?: unknown
}
export interface UploadChunkInput {
  readonly taskId: string
  readonly file: File
  readonly chunk: Blob
  readonly index: number
  readonly totalChunks: number
  readonly signal: AbortSignal
}
export interface UploadAdapter<Result> {
  /** Resolve only when the server acknowledges this chunk. Retried indexes must be idempotent. */
  uploadChunk(input: UploadChunkInput): Promise<void>
  /** Must be idempotent for taskId: a cancelled response may have committed on the server. */
  complete(input: {
    readonly taskId: string
    readonly file: File
    readonly signal: AbortSignal
  }): Promise<Result>
}
export interface UploadQueue<Result> {
  enqueue(file: File): string
  pause(id: string): void
  resume(id: string): void
  cancel(id: string): void
  snapshot(): readonly UploadTaskSnapshot<Result>[]
  dispose(): void
}
interface Task<Result> {
  readonly id: string
  readonly file: File
  readonly totalChunks: number
  completedChunks: number
  uploadedBytes: number
  status: UploadTaskStatus
  result?: Result
  error?: unknown
  controller?: AbortController
}
export function createUploadQueue<Result>(options: {
  readonly adapter: UploadAdapter<Result>
  readonly chunkSize: number
  readonly concurrency?: number
  readonly onChange?: (tasks: readonly UploadTaskSnapshot<Result>[]) => void
}): UploadQueue<Result> {
  const { adapter, chunkSize, onChange } = options
  const concurrency = options.concurrency ?? 2
  if (
    !Number.isSafeInteger(chunkSize) ||
    chunkSize < 1 ||
    !Number.isSafeInteger(concurrency) ||
    concurrency < 1
  ) {
    throw new TypeError('Upload chunkSize and concurrency must be positive safe integers.')
  }
  const tasks = new Map<string, Task<Result>>()
  let running = 0
  let disposed = false
  const snapshot = (): readonly UploadTaskSnapshot<Result>[] =>
    Object.freeze(
      [...tasks.values()].map((task) =>
        Object.freeze({
          id: task.id,
          name: task.file.name,
          size: task.file.size,
          status: task.status,
          uploadedBytes: task.uploadedBytes,
          completedChunks: task.completedChunks,
          totalChunks: task.totalChunks,
          ...(task.result === undefined ? {} : { result: task.result }),
          ...(task.error === undefined ? {} : { error: task.error }),
        }),
      ),
    )
  const publish = (): void => {
    if (disposed) return
    // A view subscriber cannot turn successful transport into a failed upload.
    try {
      onChange?.(snapshot())
    } catch {
      /* Observer failures do not mutate upload state. */
    }
  }
  const execute = async (task: Task<Result>): Promise<void> => {
    const controller = new AbortController()
    const aborted = (): boolean => controller.signal.aborted
    task.controller = controller
    task.status = 'uploading'
    delete task.error
    running++
    publish()
    try {
      while (task.completedChunks < task.totalChunks) {
        if (aborted()) return
        const index = task.completedChunks
        const chunk = task.file.slice(
          index * chunkSize,
          Math.min(task.file.size, (index + 1) * chunkSize),
        )
        await adapter.uploadChunk({
          taskId: task.id,
          file: task.file,
          chunk,
          index,
          totalChunks: task.totalChunks,
          signal: controller.signal,
        })
        if (aborted()) return
        task.completedChunks++
        task.uploadedBytes += chunk.size
        publish()
      }
      if (aborted()) return
      const result = await adapter.complete({
        taskId: task.id,
        file: task.file,
        signal: controller.signal,
      })
      if (aborted()) return
      task.result = result
      task.status = 'completed'
    } catch (error) {
      if (!aborted()) {
        task.status = 'failed'
        task.error = error
      }
    } finally {
      delete task.controller
      running--
      publish()
      pump()
    }
  }
  function pump(): void {
    if (disposed) return
    for (const task of tasks.values()) {
      if (running >= concurrency) break
      // A paused adapter may still be settling after abort. Never run it twice.
      if (task.status === 'queued' && !task.controller) void execute(task)
    }
  }
  return {
    enqueue(file) {
      if (disposed) throw new Error('Upload queue is disposed.')
      if (!(file instanceof File)) throw new TypeError('Upload requires a File.')
      const id = crypto.randomUUID()
      tasks.set(id, {
        id,
        file,
        totalChunks: Math.ceil(file.size / chunkSize),
        completedChunks: 0,
        uploadedBytes: 0,
        status: 'queued',
      })
      publish()
      pump()
      return id
    },
    pause(id) {
      const task = tasks.get(id)
      if (!task || (task.status !== 'queued' && task.status !== 'uploading')) return
      task.status = 'paused'
      task.controller?.abort()
      publish()
    },
    resume(id) {
      const task = tasks.get(id)
      if (disposed || !task || (task.status !== 'paused' && task.status !== 'failed')) return
      task.status = 'queued'
      delete task.error
      publish()
      pump()
    },
    cancel(id) {
      const task = tasks.get(id)
      if (!task || task.status === 'completed' || task.status === 'cancelled') return
      task.status = 'cancelled'
      task.controller?.abort()
      publish()
      pump()
    },
    snapshot,
    dispose() {
      disposed = true
      for (const task of tasks.values()) {
        if (task.status !== 'completed' && task.status !== 'cancelled') {
          task.status = 'cancelled'
          task.controller?.abort()
        }
      }
      tasks.clear()
      publish()
    },
  }
}
