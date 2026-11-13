const MAX_BYTES = 32 * 1024 * 1024
const MAX_PIXELS = 40_000_000

function abort(signal: AbortSignal): void {
  signal.throwIfAborted()
}

async function rasterMime(blob: Blob): Promise<string | null> {
  const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer())
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end))
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg'
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return 'image/png'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  return null
}

export async function detectAttachmentMedia(blob: Blob): Promise<'image' | 'pdf' | 'unsupported'> {
  const mime = await rasterMime(blob)
  if (mime) return !blob.type || blob.type === mime ? 'image' : 'unsupported'
  const header = new Uint8Array(await blob.slice(0, 5).arrayBuffer())
  if (String.fromCharCode(...header) === '%PDF-' && (!blob.type || blob.type === 'application/pdf'))
    return 'pdf'
  return 'unsupported'
}

/** Processing is intentionally static-only; previews retain the original animation. */
export async function assertStaticRasterImage(blob: Blob, signal: AbortSignal): Promise<void> {
  abort(signal)
  if (!blob.size || blob.size > MAX_BYTES)
    throw new RangeError('Image exceeds processing byte limit.')
  const mime = await rasterMime(blob)
  abort(signal)
  if (mime !== 'image/png' && mime !== 'image/webp') return
  const bytes = new Uint8Array(await blob.arrayBuffer())
  abort(signal)
  const view = new DataView(bytes.buffer)
  const png = mime === 'image/png'
  let offset = png ? 8 : 12
  while (offset + (png ? 12 : 8) <= bytes.length) {
    const length = view.getUint32(offset + (png ? 0 : 4), !png)
    const typeOffset = offset + (png ? 4 : 0)
    const type = String.fromCharCode(...bytes.slice(typeOffset, typeOffset + 4))
    const data = offset + 8
    const end = data + length + (png ? 4 : length % 2)
    if (end > bytes.length) throw new TypeError('Invalid raster image chunk.')
    if (
      (png && type === 'acTL') ||
      (!png &&
        (type === 'ANIM' ||
          type === 'ANMF' ||
          (type === 'VP8X' && length >= 1 && ((bytes[data] ?? 0) & 2) !== 0)))
    ) {
      throw new TypeError('Animated images cannot be cropped or compressed.')
    }
    offset = end
  }
}

export async function rasterDimensions(
  blob: Blob,
  mime: string,
): Promise<{ width: number; height: number }> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const view = new DataView(bytes.buffer)
  const u24 = (offset: number) =>
    (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16)
  if (mime === 'image/png' && bytes.length >= 24)
    return { width: view.getUint32(16), height: view.getUint32(20) }
  if (mime === 'image/jpeg') {
    let offset = 2
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 255) break
      const marker = bytes[offset + 1] ?? 0
      offset += 2
      if (marker === 255) {
        offset--
        continue
      }
      if (marker === 217 || marker === 218) break
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue
      const length = view.getUint16(offset)
      if (length < 2 || offset + length > bytes.length) break
      if (
        [192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) &&
        length >= 7
      )
        return { width: view.getUint16(offset + 5), height: view.getUint16(offset + 3) }
      offset += length
    }
  }
  if (mime === 'image/webp') {
    let offset = 12
    while (offset + 8 <= bytes.length) {
      const type = String.fromCharCode(...bytes.slice(offset, offset + 4))
      const length = view.getUint32(offset + 4, true)
      const data = offset + 8
      if (data + length > bytes.length) break
      if (type === 'VP8X' && length >= 10)
        return { width: 1 + u24(data + 4), height: 1 + u24(data + 7) }
      if (
        type === 'VP8 ' &&
        length >= 10 &&
        bytes[data + 3] === 157 &&
        bytes[data + 4] === 1 &&
        bytes[data + 5] === 42
      )
        return {
          width: view.getUint16(data + 6, true) & 16383,
          height: view.getUint16(data + 8, true) & 16383,
        }
      if (type === 'VP8L' && length >= 5 && bytes[data] === 47) {
        const packed = view.getUint32(data + 1, true)
        return { width: 1 + (packed & 16383), height: 1 + ((packed >>> 14) & 16383) }
      }
      offset = data + length + (length % 2)
    }
  }
  throw new TypeError('Invalid raster image header.')
}

export async function validateRasterImage(
  blob: Blob,
  signal: AbortSignal,
): Promise<{ width: number; height: number; mimeType: string }> {
  abort(signal)
  if (!blob.size || blob.size > MAX_BYTES)
    throw new RangeError('Image exceeds processing byte limit.')
  const mimeType = await rasterMime(blob)
  abort(signal)
  if (!mimeType || (blob.type && blob.type !== mimeType))
    throw new TypeError('Unsupported or mismatched image format.')
  const size = await rasterDimensions(blob, mimeType)
  abort(signal)
  if (!size.width || !size.height || size.width * size.height > MAX_PIXELS)
    throw new RangeError('Image exceeds processing pixel limit.')
  const bitmap = await createImageBitmap(blob)
  try {
    abort(signal)
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > MAX_PIXELS)
      throw new RangeError('Image exceeds processing pixel limit.')
    return { width: bitmap.width, height: bitmap.height, mimeType }
  } finally {
    bitmap.close()
  }
}

export async function encodeProcessedImage(
  canvas: HTMLCanvasElement,
  file: File,
  output:
    | {
        mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
        quality?: number
        maxWidth?: number
        maxHeight?: number
      }
    | undefined,
  signal: AbortSignal,
): Promise<File> {
  abort(signal)
  const scale = Math.min(
    1,
    (output?.maxWidth ?? canvas.width) / canvas.width,
    (output?.maxHeight ?? canvas.height) / canvas.height,
  )
  const target = document.createElement('canvas')
  target.width = Math.max(1, Math.round(canvas.width * scale))
  target.height = Math.max(1, Math.round(canvas.height * scale))
  const context = target.getContext('2d')
  if (!context) throw new Error('Image canvas unavailable.')
  context.drawImage(canvas, 0, 0, target.width, target.height)
  const mime =
    output?.mimeType ??
    (file.type === 'image/jpeg' || file.type === 'image/webp' ? file.type : 'image/png')
  const blob = await new Promise<Blob>((resolve, reject) => {
    target.toBlob(
      (value) => {
        if (value) resolve(value)
        else reject(new Error('Image encoding failed.'))
      },
      mime,
      output?.quality,
    )
  })
  abort(signal)
  if (blob.type !== mime) throw new TypeError('Requested image encoder unavailable.')
  const suffix = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png'
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.${suffix}`, {
    type: mime,
    lastModified: file.lastModified,
  })
}
