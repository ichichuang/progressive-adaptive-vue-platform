import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  DynamicDrawUsage,
  OrthographicCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from 'three'
import {
  particleOpacityLevels,
  particleStampSize,
  type ErrorParticleDescription,
} from './error-particle-data'
import type { ErrorParticleLayout } from './error-particle-layout'
import { errorArtwork, type ErrorSceneCode } from './error-scene'

const step = 1 / 60

interface ErrorParticlePointer {
  readonly x: number
  readonly y: number
  readonly vx: number
  readonly vy: number
}

export function createErrorParticles(
  description: ErrorParticleDescription,
  code: ErrorSceneCode,
  atlas: ImageData,
) {
  const { focal, environment } = description
  const tuning = errorArtwork[code]
  const { positions: initial, depths, variation } = focal
  const positions = initial.slice()
  const velocities = new Float32Array(focal.capacity * 2)
  const environmentPositions = environment.positions.slice()
  const environmentVelocities = new Float32Array(environment.capacity * 2)
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: false,
    powerPreference: 'low-power',
  })
  const context = renderer.getContext()
  let shaderFailed = false
  renderer.debug.onShaderError = () => {
    shaderFailed = true
  }
  // Canvas 2D and the shader read the same premultiplication-free sRGB stamps.
  let palette = atlas
  const texture = new DataTexture(new Uint8Array(atlas.data), atlas.width, atlas.height)
  texture.needsUpdate = true
  const scene = new Scene()
  const camera = new OrthographicCamera()
  const resolution = new Vector2()
  const size = { value: 1 }
  const material = new ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    uniforms: { atlas: { value: texture }, resolution: { value: resolution }, size },
    defines: {
      STAMP_SIZE: particleStampSize.toFixed(1),
      OPACITY_LEVELS: particleOpacityLevels.toFixed(1),
    },
    vertexShader: `
      uniform vec2 resolution;
      uniform float size;
      attribute vec3 stampStyle;
      varying vec2 tile;
      varying float diameter;

      void main() {
        diameter = clamp(floor(stampStyle.x * size + 0.5), 1.0, STAMP_SIZE);
        tile = vec2(stampStyle.y, (diameter - 1.0) * OPACITY_LEVELS + stampStyle.z) * STAMP_SIZE;
        vec2 point = (modelMatrix * vec4(position, 1.0)).xy * vec2(1.0, -1.0);
        // Match the device-pixel origin used by Canvas 2D.
        vec2 center = floor(resolution * 0.5 + point - diameter * 0.5 + 0.5) + diameter * 0.5;
        gl_Position = vec4((center / resolution * 2.0 - 1.0) * vec2(1.0, -1.0), 0.0, 1.0);
        gl_PointSize = diameter;
      }
    `,
    fragmentShader: `
      uniform sampler2D atlas;
      varying vec2 tile;
      varying float diameter;

      void main() {
        vec2 pixel = min(vec2(diameter - 1.0), floor(gl_PointCoord * diameter));
        gl_FragColor = texelFetch(atlas, ivec2(tile + pixel), 0);
      }
    `,
  })

  function createLayer(positions: Float32Array, styles: Float32Array, order: number) {
    const geometry = new BufferGeometry()
    const position = new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage)
    geometry.setAttribute('position', position)
    geometry.setAttribute('stampStyle', new BufferAttribute(styles, 3))
    const layer = new Points(geometry, material)
    layer.frustumCulled = false
    layer.renderOrder = order
    scene.add(layer)
    return { layer, geometry, position }
  }

  const {
    layer: points,
    geometry: pointsGeometry,
    position,
  } = createLayer(positions, focal.styles, 1)
  const {
    layer: field,
    geometry: environmentGeometry,
    position: environmentPosition,
  } = createLayer(environmentPositions, environment.styles, -1)

  let focalCount = 0
  let visibleEnvironment = 0
  let environmentScale = 1
  let elapsed = 0
  let accumulator = 0
  let pointer: ErrorParticlePointer | null = null
  let pointerStrength = 0
  let disposed = false

  function advance(): void {
    elapsed += step
    const damp = 0.85
    pointerStrength *= 0.88
    const localPointer = pointerStrength > 0.002 ? pointer : null
    const flowPhase = elapsed * (0.63 + tuning.flow * 0.18)
    const amplitude = Math.min(elapsed / 0.65, 1)

    for (let index = 0; index < focalCount; index += 1) {
      const pair = index * 2
      const vertex = index * 3
      const x = positions[vertex] ?? 0
      const y = positions[vertex + 1] ?? 0
      const a = initial[vertex] ?? 0
      const b = initial[vertex + 1] ?? 0
      const depth = depths[index] ?? 0
      const grain = variation[index] ?? 0
      const sheet = (0.35 + depth * depth) * tuning.flow
      // Nearby grains share the same moving field. The tether is softer on the surface.
      const stream = Math.sin(x * 9 + y * 5.4 + flowPhase)
      const eddy = Math.cos(y * 10.7 - x * 5.8 - flowPhase * 0.79)
      const goalX = a + (0.012 * eddy + 0.004 * stream) * sheet * amplitude
      const goalY = b + (0.011 * stream - 0.003 * eddy) * sheet * amplitude
      let ax = (goalX - x) * 66
      let ay = (goalY - y) * 66

      if (localPointer !== null) {
        const dx = x - localPointer.x
        const dy = y - localPointer.y
        const radius = 0.22
        const weight = 1 - (dx * dx + dy * dy) / (radius * radius)
        if (weight > 0) {
          const force = weight * weight * pointerStrength * (0.8 + grain * 0.4)
          ax += force * (dx * 25 + localPointer.vx * 1.9)
          ay += force * (dy * 25 + localPointer.vy * 1.9)
        }
      }

      const vx = Math.max(-0.76, Math.min(0.76, ((velocities[pair] ?? 0) + ax * step) * damp))
      const vy = Math.max(-0.76, Math.min(0.76, ((velocities[pair + 1] ?? 0) + ay * step) * damp))
      velocities[pair] = vx
      velocities[pair + 1] = vy
      positions[vertex] = x + vx * step
      positions[vertex + 1] = y + vy * step
    }
    position.needsUpdate = true
    if (visibleEnvironment > 0) {
      environment.advance(
        environmentPositions,
        environmentVelocities,
        visibleEnvironment,
        elapsed,
        step,
        localPointer === null
          ? null
          : {
              x: localPointer.x / environmentScale,
              y: localPointer.y / environmentScale,
              vx: localPointer.vx / environmentScale,
              vy: localPointer.vy / environmentScale,
            },
        pointerStrength,
      )
      environmentPosition.clearUpdateRanges()
      environmentPosition.addUpdateRange(0, visibleEnvironment * 3)
      environmentPosition.needsUpdate = true
    }
  }

  function resize(layout: ErrorParticleLayout): void {
    const { pixelWidth, pixelHeight, diameter, scale, environmentScale: backdropScale } = layout
    if (renderer.domElement.width !== pixelWidth || renderer.domElement.height !== pixelHeight) {
      renderer.setSize(pixelWidth, pixelHeight, false)
    }
    resolution.set(pixelWidth, pixelHeight)
    size.value = diameter
    points.scale.set(scale, scale, 1)
    field.scale.set(backdropScale, backdropScale, 1)
    environmentScale = backdropScale / scale
    focalCount = layout.focalCount
    visibleEnvironment = layout.environmentCount
    pointsGeometry.setDrawRange(0, focalCount)
    environmentGeometry.setDrawRange(0, visibleEnvironment)
  }

  function draw(delta: number): void {
    accumulator = Math.min(accumulator + delta, step * 3)
    while (accumulator >= step) {
      advance()
      accumulator -= step
    }
    renderer.render(scene, camera)
    if (shaderFailed || context.isContextLost()) throw new Error('Error artwork rendering failed.')
  }

  function dispose(): void {
    if (disposed) return
    disposed = true
    pointsGeometry.dispose()
    environmentGeometry.dispose()
    material.dispose()
    texture.dispose()
    renderer.dispose()
    if (!context.isContextLost()) renderer.forceContextLoss()
  }

  return {
    canvas: renderer.domElement,
    prepare: () => renderer.compileAsync(scene, camera),
    draw,
    resize,
    dispose,
    isContextLost: () => context.isContextLost(),
    present(): void {
      draw(0)
      if (
        renderer.info.render.points !== focalCount + visibleEnvironment ||
        context.getError() !== context.NO_ERROR
      ) {
        throw new Error('The initial error particle frame was not rendered.')
      }
    },
    setPalette(image: ImageData): void {
      if (palette === image) return
      palette = image
      texture.image = { data: new Uint8Array(image.data), width: image.width, height: image.height }
      texture.needsUpdate = true
    },
    setPointer(next: ErrorParticlePointer | null): void {
      pointer = next
      if (next !== null) pointerStrength = 1
    },
  }
}
