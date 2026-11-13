import assert from 'node:assert/strict'
import {
  rasterDimensions,
  assertStaticRasterImage,
  detectAttachmentMedia,
  validateRasterImage,
} from '../../packages/ui/src/adapters/media/image-processing'
export async function verifyFormImageProcessing() {
  const png = new Uint8Array(24)
  png.set([137, 80, 78, 71, 13, 10, 26, 10])
  const view = new DataView(png.buffer)
  view.setUint32(16, 600)
  view.setUint32(20, 400)
  assert.deepEqual(await rasterDimensions(new Blob([png]), 'image/png'), {
    width: 600,
    height: 400,
  })
  assert.equal(await detectAttachmentMedia(new Blob([png], { type: 'image/jpeg' })), 'unsupported')
  assert.equal(
    await detectAttachmentMedia(new Blob(['%PDF-1.7'], { type: 'application/pdf' })),
    'pdf',
  )
  view.setUint32(16, 100000)
  view.setUint32(20, 100000)
  await assert.rejects(
    validateRasterImage(new Blob([png], { type: 'image/png' }), new AbortController().signal),
    RangeError,
  )
  await assert.rejects(rasterDimensions(new Blob([new Uint8Array(2)]), 'image/jpeg'), TypeError)
  const abort = new AbortController()
  abort.abort()
  await assert.rejects(validateRasterImage(new Blob([png]), abort.signal))
  // Structurally valid container headers/chunks: animation is rejected before decoding.
  const chunk = (type: string, data: Uint8Array, isPng: boolean) => {
    const result = new Uint8Array(8 + data.length + (isPng ? 4 : data.length % 2))
    const view = new DataView(result.buffer)
    view.setUint32(isPng ? 0 : 4, data.length, !isPng)
    result.set(new TextEncoder().encode(type), isPng ? 4 : 0)
    result.set(data, 8)
    return result
  }
  const ihdr = new Uint8Array(13)
  new DataView(ihdr.buffer).setUint32(0, 1)
  new DataView(ihdr.buffer).setUint32(4, 1)
  ihdr[8] = 8
  ihdr[9] = 6
  const apng = new Blob(
    [
      png.slice(0, 8),
      chunk('IHDR', ihdr, true),
      chunk('acTL', new Uint8Array([0, 0, 0, 2, 0, 0, 0, 0]), true),
    ],
    { type: 'image/png' },
  )
  const webp = (chunks: Uint8Array[]) => {
    const header = new Uint8Array(12)
    header.set(new TextEncoder().encode('RIFF'))
    new DataView(header.buffer).setUint32(
      4,
      4 + chunks.reduce((sum, item) => sum + item.length, 0),
      true,
    )
    header.set(new TextEncoder().encode('WEBP'), 8)
    return new Blob([header, ...chunks.map((chunk) => new Uint8Array(chunk))], {
      type: 'image/webp',
    })
  }
  const extended = new Uint8Array(10)
  extended[0] = 2
  for (const animated of [
    apng,
    webp([chunk('VP8X', extended, false)]),
    webp([chunk('ANIM', new Uint8Array(6), false)]),
  ]) {
    await assert.rejects(
      assertStaticRasterImage(animated, new AbortController().signal),
      /Animated images/,
    )
    assert.equal(
      await detectAttachmentMedia(animated),
      'image',
      'preview identification must stay available',
    )
  }
  extended[0] = 0
  await assertStaticRasterImage(
    webp([chunk('VP8X', extended, false)]),
    new AbortController().signal,
  )
  console.log('media header / mismatch / limits / cancellation passed')
}
