import {
  cinematicLiquidShader,
  cinematicParticleShader,
  cinematicVertexShader,
} from './cinematic-gpu-shaders'

type Color = readonly [number, number, number, number]
type StageOptions = {
  readonly width: number
  readonly height: number
  readonly pixelRatio: number
  /** Normalized top-left coordinates, resolved from the triggering pointer by the caller. */
  readonly origin: { readonly x: number; readonly y: number }
  readonly phase: 'enter' | 'exit'
  readonly colors: readonly [Color, Color]
  readonly onContextLost?: () => void
} & (
  | { readonly effect: 'liquid-refraction'; readonly source: TexImageSource }
  | { readonly effect: 'particle-scatter' }
)

export interface CinematicGpuStage {
  /** Caller owns clock, cancellation, overlay positioning and the DOM reveal. */
  render(progress: number): boolean
  dispose(): void
}

export type CinematicGpuResult =
  | { readonly kind: 'ready'; readonly stage: CinematicGpuStage }
  | {
      readonly kind: 'unavailable'
      readonly reason:
        'invalid-input' | 'webgl-unavailable' | 'shader-failed' | 'source-unavailable'
    }

/** Lazy-loaded by the motion runtime. Never captures or serializes arbitrary DOM. */
export function createCinematicGpuStage(
  canvas: HTMLCanvasElement,
  options: StageOptions,
): CinematicGpuResult {
  const finiteUnit = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1
  if (
    !Number.isFinite(options.width) ||
    options.width <= 0 ||
    !Number.isFinite(options.height) ||
    options.height <= 0 ||
    !Number.isFinite(options.pixelRatio) ||
    options.pixelRatio <= 0 ||
    !finiteUnit(options.origin.x) ||
    !finiteUnit(options.origin.y) ||
    !options.colors.every((color) => color.every(finiteUnit))
  )
    return { kind: 'unavailable', reason: 'invalid-input' }

  let gl: WebGLRenderingContext | null
  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    })
  } catch {
    return { kind: 'unavailable', reason: 'webgl-unavailable' }
  }
  if (!gl || gl.isContextLost()) return { kind: 'unavailable', reason: 'webgl-unavailable' }
  const context = gl
  const maxDimension = Math.min(4096, Number(context.getParameter(context.MAX_RENDERBUFFER_SIZE)))
  const ratio = Math.min(
    options.pixelRatio,
    2,
    maxDimension / options.width,
    maxDimension / options.height,
    Math.sqrt(2_000_000 / (options.width * options.height)),
  )
  canvas.width = Math.max(1, Math.floor(options.width * ratio))
  canvas.height = Math.max(1, Math.floor(options.height * ratio))
  const program = context.createProgram() as WebGLProgram | null
  const buffer = context.createBuffer() as WebGLBuffer | null
  const shaders: WebGLShader[] = []
  let texture: WebGLTexture | null = null
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    canvas.removeEventListener('webglcontextlost', onLost)
    shaders.forEach((shader) => {
      context.deleteShader(shader)
    })
    context.deleteTexture(texture)
    context.deleteBuffer(buffer)
    context.deleteProgram(program)
  }
  const onLost = () => {
    if (disposed) return
    dispose()
    options.onContextLost?.()
  }
  canvas.addEventListener('webglcontextlost', onLost)
  const fail = (reason: 'shader-failed' | 'source-unavailable'): CinematicGpuResult => {
    dispose()
    return { kind: 'unavailable', reason }
  }
  if (!program || !buffer) return fail('shader-failed')
  for (const [type, source] of [
    [context.VERTEX_SHADER, cinematicVertexShader],
    [
      context.FRAGMENT_SHADER,
      options.effect === 'liquid-refraction' ? cinematicLiquidShader : cinematicParticleShader,
    ],
  ] as const) {
    const shader = context.createShader(type)
    if (!shader) return fail('shader-failed')
    shaders.push(shader)
    context.shaderSource(shader, source)
    context.compileShader(shader)
    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) return fail('shader-failed')
    context.attachShader(program, shader)
  }
  context.linkProgram(program)
  if (!context.getProgramParameter(program, context.LINK_STATUS)) return fail('shader-failed')
  context.useProgram(program)
  context.bindBuffer(context.ARRAY_BUFFER, buffer)
  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    context.STATIC_DRAW,
  )
  const position = context.getAttribLocation(program, 'a_position')
  if (position < 0) return fail('shader-failed')
  context.enableVertexAttribArray(position)
  context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0)
  context.uniform1f(context.getUniformLocation(program, 'u_exit'), options.phase === 'exit' ? 1 : 0)
  context.uniform2f(
    context.getUniformLocation(program, 'u_origin'),
    options.origin.x,
    1 - options.origin.y,
  )
  const shortest = Math.min(options.width, options.height)
  context.uniform2f(
    context.getUniformLocation(program, 'u_aspect'),
    options.width / shortest,
    options.height / shortest,
  )
  context.uniform4fv(context.getUniformLocation(program, 'u_colorA'), options.colors[0])
  context.uniform4fv(context.getUniformLocation(program, 'u_colorB'), options.colors[1])
  if (options.effect === 'liquid-refraction') {
    const source = options.source
    const sourceWidth =
      'videoWidth' in source
        ? source.videoWidth
        : 'naturalWidth' in source
          ? source.naturalWidth
          : 'displayWidth' in source
            ? source.displayWidth
            : source.width
    const sourceHeight =
      'videoHeight' in source
        ? source.videoHeight
        : 'naturalHeight' in source
          ? source.naturalHeight
          : 'displayHeight' in source
            ? source.displayHeight
            : source.height
    const maxTexture = Number(context.getParameter(context.MAX_TEXTURE_SIZE))
    if (
      sourceWidth <= 0 ||
      sourceHeight <= 0 ||
      sourceWidth > maxTexture ||
      sourceHeight > maxTexture ||
      sourceWidth * sourceHeight > 4_000_000
    ) {
      return fail('source-unavailable')
    }
    const allocatedTexture = context.createTexture() as WebGLTexture | null
    if (!allocatedTexture) return fail('source-unavailable')
    texture = allocatedTexture
    context.activeTexture(context.TEXTURE0)
    context.bindTexture(context.TEXTURE_2D, texture)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)
    context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, true)
    try {
      context.texImage2D(
        context.TEXTURE_2D,
        0,
        context.RGBA,
        context.RGBA,
        context.UNSIGNED_BYTE,
        options.source,
      )
    } catch {
      return fail('source-unavailable')
    }
    if (context.getError() !== context.NO_ERROR) return fail('source-unavailable')
    context.uniform1i(context.getUniformLocation(program, 'u_source'), 0)
  }
  const progressLocation = context.getUniformLocation(program, 'u_progress')
  context.viewport(0, 0, canvas.width, canvas.height)
  return {
    kind: 'ready',
    stage: {
      render(progress) {
        if (disposed || context.isContextLost() || !Number.isFinite(progress)) return false
        context.uniform1f(progressLocation, Math.max(0, Math.min(1, progress)))
        context.drawArrays(context.TRIANGLES, 0, 6)
        return true
      },
      dispose,
    },
  }
}
