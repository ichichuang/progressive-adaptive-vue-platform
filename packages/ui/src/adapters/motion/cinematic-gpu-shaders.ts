/** Private shader programs. Colors are supplied by the appearance owner, never embedded here. */
export const cinematicVertexShader = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

export const cinematicLiquidShader = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_source;
uniform float u_progress;
uniform float u_exit;
uniform vec2 u_origin;
uniform vec2 u_aspect;
void main() {
  float visibility = mix(u_progress, 1.0 - u_progress, u_exit);
  vec2 delta = (v_uv - u_origin) * u_aspect;
  float radius = length(delta);
  float envelope = sin(visibility * 3.14159265);
  float wave = sin(radius * 28.0 - visibility * 16.0);
  vec2 direction = delta / max(radius, 0.001);
  vec2 displacement = direction / u_aspect * wave * envelope * 0.026;
  displacement += vec2(sin(v_uv.y * 15.0 + visibility * 8.0),
                       cos(v_uv.x * 13.0 - visibility * 6.0)) * envelope * 0.008;
  vec4 color = texture2D(u_source, clamp(v_uv + displacement, 0.001, 0.999));
  float reach = max(max(length(u_origin * u_aspect), length((vec2(1.0,0.0)-u_origin)*u_aspect)),
                    max(length((vec2(0.0,1.0)-u_origin)*u_aspect), length((vec2(1.0)-u_origin)*u_aspect)));
  float mask = 1.0 - smoothstep(visibility * (reach + 0.16) - 0.08,
                              visibility * (reach + 0.16) + 0.08, radius);
  mask *= smoothstep(0.0, 0.06, visibility);
  gl_FragColor = vec4(color.rgb, color.a * mask);
}`

/** Procedural particles decorate the DOM reveal; they do not pretend to sample DOM content. */
export const cinematicParticleShader = `
precision mediump float;
varying vec2 v_uv;
uniform float u_progress;
uniform float u_exit;
uniform vec2 u_origin;
uniform vec2 u_aspect;
uniform vec4 u_colorA;
uniform vec4 u_colorB;
float hash(vec2 point) { return fract(sin(dot(point, vec2(127.1,311.7))) * 43758.5453); }
void main() {
  float travel = mix(1.0 - u_progress, u_progress, u_exit);
  float envelope = sin(u_progress * 3.14159265);
  vec2 uv = v_uv * u_aspect;
  vec2 cell = floor(uv * 24.0);
  float alpha = 0.0;
  vec3 light = vec3(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 id = cell + vec2(float(x), float(y));
      float seed = hash(id);
      vec2 home = (id + vec2(seed, hash(id + 5.4))) / 24.0;
      vec2 radial = home - u_origin * u_aspect;
      vec2 drift = radial / max(length(radial), 0.01) * travel * 0.025;
      drift += vec2(sin(seed * 23.0 + travel * 5.0), cos(seed * 17.0 + travel * 4.0)) * travel * 0.009;
      float distanceToParticle = length(uv - home - drift);
      float size = mix(0.002, 0.007, seed) * (0.4 + 0.6 * envelope);
      float dotAlpha = (1.0 - smoothstep(size * 0.3, size, distanceToParticle)) * envelope;
      vec4 tint = mix(u_colorA, u_colorB, seed);
      light += tint.rgb * dotAlpha * tint.a;
      alpha += dotAlpha * tint.a;
    }
  }
  gl_FragColor = vec4(light / max(alpha, 0.001), min(alpha, 1.0));
}`
