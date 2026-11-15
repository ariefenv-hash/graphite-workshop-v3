/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Direct WebGL2 GLSL ES 3.00 + Canvas2D fallback port of AOSP android-17.0.0_r1:
 * 1) Framework Ripple: RippleAnimationSession.java & RippleShader.java
 *    + Pencil Craftsmanship Extensions (wood-grain anisotropy & SDF barrel masks)
 * 2) SystemUI Ripple: RippleShader.kt & RippleView.kt (isolated 1750ms channel)
 */

export enum RippleMaskShape {
  ROUNDED_RECT = 0,
  HEX_BARREL = 1,
  ROUND_BARREL = 2,
  SHARPENED_CONE = 3,
}

export enum SystemUIShape {
  CIRCLE = 0,
  ROUNDED_BOX = 1,
  ELLIPSE = 2,
}

export const FRAMEWORK_RIPPLE_CONSTANTS = {
  ENTER_ANIM_DURATION: 450,
  EXIT_ANIM_DURATION: 375,
  NOISE_ANIMATION_DURATION: 7000,
  MAX_NOISE_PHASE: 7000 / 214,
  PI_ROTATE_RIGHT: Math.PI * 0.0078125,
  PI_ROTATE_LEFT: Math.PI * -0.0078125,
  RADIUS_MULTIPLIER: 2.3,
  DENSITY_SCALE: 2.1,
} as const;

export const SYSTEMUI_RIPPLE_CONSTANTS = {
  RIPPLE_DURATION_MS: 1750,
} as const;

export interface FrameworkShaderOptions {
  woodDir?: [number, number];
  lacquerColor?: [number, number, number, number];
  bloomRadius?: number;
  trailDecay?: number;
  sparkleDensity?: number;
  maskShape?: RippleMaskShape;
}

export interface FrameworkRippleSessionInit {
  id: number;
  width: number;
  height: number;
  touchX: number;
  touchY: number;
  originX?: number;
  originY?: number;
  radius?: number;
  startTimeMs?: number;
  color?: [number, number, number, number];
  sparkleColor?: [number, number, number, number];
  cornerRadius?: number;
  hasMask?: boolean;
  speedMultiplier?: number;
  options?: FrameworkShaderOptions;
}

export interface SystemUIRippleSession {
  id: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  targetWidth: number;
  targetHeight: number;
  startTimeMs: number;
  durationMs: number;
  shape: SystemUIShape;
  sparkleStrength: number;
  distortFactor: number;
  color: [number, number, number, number];
  sparkleColor: [number, number, number, number];
}

export interface RippleDebugSample {
  progress: number;
  phase: string;
  delayMs: number;
  maskShape: RippleMaskShape;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  if (x1 === y1 && x2 === y2) return (t) => clamp01(t);
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    const clamped = clamp01(x);
    if (clamped === 0 || clamped === 1) return clamped;
    let t = clamped;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - clamped;
      if (Math.abs(err) < 1e-6) return clamp01(sampleY(t));
      const dx = sampleDX(t);
      if (Math.abs(dx) < 1e-6) break;
      t -= err / dx;
    }
    let lo = 0;
    let hi = 1;
    t = clamped;
    for (let i = 0; i < 12; i++) {
      const xEst = sampleX(t);
      if (Math.abs(xEst - clamped) < 1e-6) break;
      if (clamped > xEst) lo = t;
      else hi = t;
      t = 0.5 * (lo + hi);
    }
    return clamp01(sampleY(t));
  };
}

const STANDARD_INTERPOLATOR = cubicBezier(0.4, 0.0, 0.2, 1.0);
const LINEAR_INTERPOLATOR = (t: number) => clamp01(t);

export class FrameworkRippleSession {
  readonly id: number;
  readonly width: number;
  readonly height: number;
  readonly touchX: number;
  readonly touchY: number;
  readonly originX: number;
  readonly originY: number;
  readonly radius: number;
  readonly startTimeMs: number;
  readonly color: [number, number, number, number];
  readonly sparkleColor: [number, number, number, number];
  readonly cornerRadius: number;
  readonly hasMask: boolean;
  readonly speedMultiplier: number;
  readonly options: Required<FrameworkShaderOptions>;

  releasedAtMs: number | null = null;
  exitStartMs: number | null = null;
  cachedDelayMs = 0;

  constructor(init: FrameworkRippleSessionInit) {
    this.id = init.id;
    this.width = Math.max(1, init.width);
    this.height = Math.max(1, init.height);
    this.touchX = init.touchX;
    this.touchY = init.touchY;
    this.originX = init.originX ?? this.width * 0.5;
    this.originY = init.originY ?? this.height * 0.5;
    const dx = Math.max(this.touchX, this.width - this.touchX);
    const dy = Math.max(this.touchY, this.height - this.touchY);
    this.radius = init.radius ?? Math.hypot(dx, dy);
    this.startTimeMs = init.startTimeMs ?? performance.now();
    this.color = init.color ?? [0.16, 0.16, 0.18, 0.22];
    this.sparkleColor = init.sparkleColor ?? [0.35, 0.36, 0.4, 0.85];
    this.cornerRadius = init.cornerRadius ?? 16;
    this.hasMask = init.hasMask ?? true;
    this.speedMultiplier = init.speedMultiplier ?? 1;
    this.options = {
      woodDir: init.options?.woodDir ?? [1, 0],
      lacquerColor: init.options?.lacquerColor ?? [0.71, 0.41, 0.05, 0.35],
      bloomRadius: init.options?.bloomRadius ?? 1.0,
      trailDecay: init.options?.trailDecay ?? 0.2,
      sparkleDensity: init.options?.sparkleDensity ?? 1.0,
      maskShape: init.options?.maskShape ?? RippleMaskShape.ROUNDED_RECT,
    };
  }

  /**
   * Matches AOSP RippleAnimationSession.computeDelay(): unscaled by speedMultiplier.
   */
  computeDelay(nowMs: number): number {
    const elapsed = nowMs - this.startTimeMs;
    return Math.max(FRAMEWORK_RIPPLE_CONSTANTS.ENTER_ANIM_DURATION - elapsed, 0);
  }

  release(nowMs = performance.now()): void {
    if (this.releasedAtMs !== null) return;
    this.releasedAtMs = nowMs;
    this.cachedDelayMs = this.computeDelay(nowMs);
    this.exitStartMs = nowMs + this.cachedDelayMs;
  }

  isFinished(nowMs = performance.now()): boolean {
    if (this.exitStartMs === null) return false;
    return (nowMs - this.exitStartMs) * this.speedMultiplier >= FRAMEWORK_RIPPLE_CONSTANTS.EXIT_ANIM_DURATION;
  }
}

function evaluateFrameworkUniforms(session: FrameworkRippleSession, nowMs = performance.now()) {
  const elapsed = Math.max(0, nowMs - session.startTimeMs);
  const enterFraction = Math.min(1, elapsed / FRAMEWORK_RIPPLE_CONSTANTS.ENTER_ANIM_DURATION);
  let progress = 0.5 * STANDARD_INTERPOLATOR(enterFraction);
  let phase = enterFraction < 1 ? 'enter' : 'hold';
  let delayMs = 0;

  if (session.exitStartMs !== null) {
    delayMs = session.cachedDelayMs;
    if (nowMs >= session.exitStartMs) {
      const exitFraction = Math.min(
        1,
        ((nowMs - session.exitStartMs) * session.speedMultiplier) /
          FRAMEWORK_RIPPLE_CONSTANTS.EXIT_ANIM_DURATION
      );
      progress = 0.5 + 0.5 * LINEAR_INTERPOLATOR(exitFraction);
      phase = exitFraction >= 1 ? 'finished' : 'exit';
    }
  }

  const noiseFraction =
    ((elapsed * session.speedMultiplier) % FRAMEWORK_RIPPLE_CONSTANTS.NOISE_ANIMATION_DURATION) /
    FRAMEWORK_RIPPLE_CONSTANTS.NOISE_ANIMATION_DURATION;
  const turbulencePhase =
    (session.startTimeMs * 0.001 + noiseFraction * FRAMEWORK_RIPPLE_CONSTANTS.MAX_NOISE_PHASE) % 1000;
  const noisePhase = turbulencePhase * 0.001;
  const c = 1.5;
  const rot1 = turbulencePhase * FRAMEWORK_RIPPLE_CONSTANTS.PI_ROTATE_RIGHT + 1.7 * Math.PI;
  const rot2 = turbulencePhase * FRAMEWORK_RIPPLE_CONSTANTS.PI_ROTATE_LEFT + 2.0 * Math.PI;
  const rot3 = turbulencePhase * FRAMEWORK_RIPPLE_CONSTANTS.PI_ROTATE_RIGHT + 2.75 * Math.PI;

  return {
    progress,
    noisePhase,
    turbulencePhase,
    maxRadius: session.radius * FRAMEWORK_RIPPLE_CONSTANTS.RADIUS_MULTIPLIER,
    origin: [session.originX, session.originY] as const,
    touch: [session.touchX, session.touchY] as const,
    resolutionScale: [1 / session.width, 1 / session.height] as const,
    noiseScale: [
      FRAMEWORK_RIPPLE_CONSTANTS.DENSITY_SCALE / session.width,
      FRAMEWORK_RIPPLE_CONSTANTS.DENSITY_SCALE / session.height,
    ] as const,
    tCircle1: [
      c * 0.5 + turbulencePhase * 0.01 * Math.cos(c * 0.55),
      c * 0.5 + turbulencePhase * 0.01 * Math.sin(c * 0.55),
    ] as const,
    tCircle2: [
      c * 0.2 + turbulencePhase * -0.0066 * Math.cos(c * 0.45),
      c * 0.2 + turbulencePhase * -0.0066 * Math.sin(c * 0.45),
    ] as const,
    tCircle3: [
      c + turbulencePhase * -0.0066 * Math.cos(c * 0.35),
      c + turbulencePhase * -0.0066 * Math.sin(c * 0.35),
    ] as const,
    tRotation1: [Math.cos(rot1), Math.sin(rot1)] as const,
    tRotation2: [Math.cos(rot2), Math.sin(rot2)] as const,
    tRotation3: [Math.cos(rot3), Math.sin(rot3)] as const,
    color: session.color,
    sparkleColor: session.sparkleColor,
    cornerRadius: session.cornerRadius,
    hasMask: session.hasMask ? 1 : 0,
    woodDir: session.options.woodDir,
    lacquerColor: session.options.lacquerColor,
    bloomRadius: session.options.bloomRadius,
    trailDecay: session.options.trailDecay,
    sparkleDensity: session.options.sparkleDensity,
    maskShape: session.options.maskShape,
    delayMs,
    phase,
  };
}

const VERTEX_SHADER = `#version 300 es
precision highp float;
in vec2 a_position;
out vec2 v_fragCoord;
uniform vec2 u_canvasSize;
void main() {
  vec2 uv = a_position * 0.5 + 0.5;
  v_fragCoord = vec2(uv.x * u_canvasSize.x, (1.0 - uv.y) * u_canvasSize.y);
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAMEWORK_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_fragCoord;
out vec4 fragColor;

uniform vec2 in_origin;
uniform vec2 in_touch;
uniform float in_progress;
uniform float in_maxRadius;
uniform vec2 in_resolutionScale;
uniform vec2 in_noiseScale;
uniform float in_hasMask;
uniform float in_noisePhase;
uniform float in_turbulencePhase;
uniform vec2 in_tCircle1;
uniform vec2 in_tCircle2;
uniform vec2 in_tCircle3;
uniform vec2 in_tRotation1;
uniform vec2 in_tRotation2;
uniform vec2 in_tRotation3;
uniform vec4 in_color;
uniform vec4 in_sparkleColor;

uniform vec2 u_size;
uniform float u_cornerRadius;
uniform int u_maskShape;

uniform vec2 u_woodDir;
uniform vec4 u_lacquerColor;
uniform float u_bloomRadius;
uniform float u_trailDecay;
uniform float u_sparkleDensity;

const float PI = 3.1415926535897932384626;

float saturate(float v) { return clamp(v, 0.0, 1.0); }

float triangleNoise(vec2 n) {
  n = fract(n * vec2(5.3987, 5.4421));
  n += dot(n.yx, n.xy + vec2(21.5351, 14.3137));
  float xy = n.x * n.y;
  return fract(xy * 95.4307) + fract(xy * 75.04961) - 1.0;
}

float threshold(float v, float l, float h) {
  return step(l, v) * (1.0 - step(h, v));
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + vec2(45.32, 17.71));
  return fract(p.x * p.y);
}

/**
 * 细腻飘散粒子场：每格一颗、逐格哈希定位、软圆 + fwidth 抗锯齿、
 * 随相位漂移与呼吸。不再把 uv 量化成 2px 方块（那是颗粒感的来源）。
 */
float fineSparkles(vec2 uv, float t, float density, float scale) {
  vec2 g = uv * scale;
  vec2 cell = floor(g);
  vec2 f = fract(g);
  float h = hash21(cell);
  float h2 = hash21(cell + vec2(17.13, 9.71));
  float aa = clamp(length(fwidth(g)) * 0.5, 0.003, 0.28);
  vec2 drift = vec2(sin(t * 0.9 + h2 * 6.2832), cos(t * 0.73 + h * 6.2832)) * 0.20;
  vec2 c = vec2(0.18 + 0.64 * h, 0.18 + 0.64 * h2) + drift;
  float d = length(f - c);
  float radius = (0.12 + 0.13 * fract(h * 13.71)) * clamp(density, 0.35, 2.0);
  float pt = 1.0 - smoothstep(radius - aa, radius + aa, d);
  float twinkle = 0.30 + 0.70 * smoothstep(0.12, 0.92, 0.5 + 0.5 * sin(t * 2.6 + h * 41.3));
  float gate = smoothstep(mix(0.62, 0.16, clamp(density, 0.35, 2.0) / 2.0), 0.60, h2);
  return pt * gate * twinkle;
}

float softCircle(vec2 uv, vec2 xy, float radius, float blur) {
  float blurHalf = blur * 0.5;
  float d = distance(uv, xy);
  return 1.0 - smoothstep(1.0 - blurHalf, 1.0 + blurHalf, d / max(radius, 0.0001));
}

float softRing(vec2 uv, vec2 xy, float radius, float progress, float blur) {
  float thickness = 0.05 * radius;
  float currentRadius = radius * progress;
  float circle_outer = softCircle(uv, xy, currentRadius + thickness, blur);
  float circle_inner = softCircle(uv, xy, max(currentRadius - thickness, 0.0), blur);
  return saturate(circle_outer - circle_inner);
}

float subProgress(float start, float end, float progress) {
  float sub = clamp(progress, start, end);
  return (sub - start) / max(end - start, 0.0001);
}

mat2 rotate2d(vec2 rad) {
  return mat2(rad.x, -rad.y, rad.y, rad.x);
}

float circle_grid(vec2 resolution, vec2 coord, float time, vec2 center, vec2 rotation, float cell_diameter) {
  coord = rotate2d(rotation) * (center - coord) + center;
  coord = mod(coord, cell_diameter) / resolution;
  float normal_radius = cell_diameter / resolution.y * 0.5;
  float radius = 0.65 * normal_radius;
  return softCircle(coord, vec2(normal_radius), radius, radius * 50.0);
}

float turbulence(vec2 uv, float t) {
  const vec2 scale = vec2(0.8);
  uv = uv * scale;
  float g1 = circle_grid(scale, uv, t, in_tCircle1, in_tRotation1, 0.17);
  float g2 = circle_grid(scale, uv, t, in_tCircle2, in_tRotation2, 0.2);
  float g3 = circle_grid(scale, uv, t, in_tCircle3, in_tRotation3, 0.275);
  float v = (g1 * g1 + g2 - g3) * 0.5;
  return saturate(0.45 + 0.8 * v);
}

float sdRoundedBox(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float sdHexagon(vec2 p, float r) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}

float sdSharpenedCone(vec2 p, vec2 halfSize) {
  float t = clamp((p.x + halfSize.x) / max(2.0 * halfSize.x, 1.0), 0.0, 1.0);
  float halfH = mix(halfSize.y, max(4.0, halfSize.y * 0.16), smoothstep(0.18, 1.0, t));
  vec2 q = vec2(abs(p.x) - halfSize.x, abs(p.y) - halfH);
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - 2.0;
}

float evaluateSdfMask(vec2 fragCoord) {
  if (in_hasMask < 0.5) return 1.0;
  vec2 halfSize = u_size * 0.5;
  vec2 p = fragCoord - halfSize;
  float dist = 0.0;
  if (u_maskShape == 1) {
    if (halfSize.x > halfSize.y * 1.45) {
      float taper = clamp((abs(p.x) - (halfSize.x - halfSize.y * 0.45)) / max(halfSize.y * 0.45, 1.0), 0.0, 1.0);
      float hexY = halfSize.y * mix(1.0, 0.62, taper);
      dist = sdRoundedBox(p, vec2(halfSize.x, hexY), 6.0);
    } else {
      float m = min(halfSize.x, halfSize.y);
      dist = sdHexagon(p, m * 0.94);
    }
  } else if (u_maskShape == 2) {
    float r = min(halfSize.x, halfSize.y);
    dist = sdRoundedBox(p, halfSize, r);
  } else if (u_maskShape == 3) {
    dist = sdSharpenedCone(p, halfSize);
  } else {
    float r = min(u_cornerRadius, min(halfSize.x, halfSize.y));
    dist = sdRoundedBox(p, halfSize, r);
  }
  return smoothstep(0.5, -0.5, dist);
}

void main() {
  vec2 p = v_fragCoord;
  float fadeIn = subProgress(0.0, 0.13, in_progress);
  float scaleIn = subProgress(0.0, 1.0, in_progress);
  float fadeOutNoise = subProgress(0.4, 0.5, in_progress);
  float fadeOutRipple = subProgress(0.4, 1.0, in_progress);
  vec2 center = mix(in_touch, in_origin, saturate(in_progress * 2.0));

  vec2 woodAxis = normalize(length(u_woodDir) > 0.001 ? u_woodDir : vec2(1.0, 0.0));
  vec2 deltaP = p - center;
  float alongWood = dot(deltaP, woodAxis);
  vec2 perpWood = deltaP - alongWood * woodAxis;
  float anisotropy = 1.0 - clamp(u_trailDecay, 0.0, 0.55) * 0.35;
  vec2 smudgeP = center + alongWood * woodAxis * (1.0 / max(anisotropy, 0.5)) + perpWood;

  float effectiveRadius = in_maxRadius * max(u_bloomRadius, 0.5);
  float ring = softRing(smudgeP, center, effectiveRadius, scaleIn, 1.0);
  float alpha = min(fadeIn, 1.0 - fadeOutNoise);
  vec2 uv = p * in_resolutionScale;
  float turb = turbulence(uv, in_turbulencePhase);
  // 唯一路径：连续亚像素三尺度粒子场，逐格哈希定位 + 漂移 + 呼吸 + fwidth 软边。
  // 不再把 uv 量化成 2px 方块（step 硬阈值）——那是颗粒感的来源。
  vec2 base = uv / max(in_noiseScale, vec2(0.00001));
  float fineA = fineSparkles(base, in_noisePhase * 6.2832, u_sparkleDensity, 0.85);
  float fineB = fineSparkles(base + vec2(11.7, 4.3), in_noisePhase * 10.68 + 2.1, u_sparkleDensity, 2.1);
  float fineC = fineSparkles(base + vec2(3.9, 19.4), in_noisePhase * 7.31 + 4.6, u_sparkleDensity, 3.4);
  float sparkleField = saturate(fineA * 0.9 + fineB * 0.52 + fineC * 0.26);
  float sparkleAlpha = sparkleField * ring * alpha * turb * in_sparkleColor.a;
  float fade = min(fadeIn, 1.0 - fadeOutRipple);
  float waveAlpha = softCircle(smudgeP, center, effectiveRadius * scaleIn, 1.0) * fade * in_color.a;

  float lacquerMix = saturate(ring * u_lacquerColor.a * 0.7);
  vec3 baseRgb = mix(in_color.rgb, u_lacquerColor.rgb, lacquerMix);
  vec4 waveColor = vec4(baseRgb * waveAlpha, waveAlpha);
  vec4 sparkleColor = vec4(in_sparkleColor.rgb * in_sparkleColor.a, in_sparkleColor.a);
  float mask = evaluateSdfMask(p);
  fragColor = mix(waveColor, sparkleColor, sparkleAlpha) * mask;
}`;

const SYSTEMUI_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_fragCoord;
out vec4 fragColor;

uniform vec2 in_center;
uniform vec2 in_size;
uniform float in_progress;
uniform float in_time;
uniform float in_pixelDensity;
uniform float in_sparkleStrength;
uniform float in_distortFactor;
uniform int in_shape;
uniform vec4 in_color;
uniform vec4 in_sparkleColor;
uniform float u_sparkleDensity;

const float PI = 3.1415926535897932384626;

float saturate(float v) { return clamp(v, 0.0, 1.0); }

float triangleNoise(vec2 n) {
  n = fract(n * vec2(5.3987, 5.4421));
  n += dot(n.yx, n.xy + vec2(21.5351, 14.3137));
  float xy = n.x * n.y;
  return fract(xy * 95.4307) + fract(xy * 75.04961) - 1.0;
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + vec2(45.32, 17.71));
  return fract(p.x * p.y);
}

/**
 * 细腻飘散粒子场：每格一颗、逐格哈希定位、软圆 + fwidth 抗锯齿、
 * 随相位漂移与呼吸。不再把 uv 量化成 2px 方块（那是颗粒感的来源）。
 */
float fineSparkles(vec2 uv, float t, float density, float scale) {
  vec2 g = uv * scale;
  vec2 cell = floor(g);
  vec2 f = fract(g);
  float h = hash21(cell);
  float h2 = hash21(cell + vec2(17.13, 9.71));
  float aa = clamp(length(fwidth(g)) * 0.5, 0.003, 0.28);
  vec2 drift = vec2(sin(t * 0.9 + h2 * 6.2832), cos(t * 0.73 + h * 6.2832)) * 0.20;
  vec2 c = vec2(0.18 + 0.64 * h, 0.18 + 0.64 * h2) + drift;
  float d = length(f - c);
  float radius = (0.12 + 0.13 * fract(h * 13.71)) * clamp(density, 0.35, 2.0);
  float pt = 1.0 - smoothstep(radius - aa, radius + aa, d);
  float twinkle = 0.30 + 0.70 * smoothstep(0.12, 0.92, 0.5 + 0.5 * sin(t * 2.6 + h * 41.3));
  float gate = smoothstep(mix(0.62, 0.16, clamp(density, 0.35, 2.0) / 2.0), 0.60, h2);
  return pt * gate * twinkle;
}


float shapeDistance(vec2 p, vec2 halfSize, int shapeType) {
  if (shapeType == 1) {
    float r = min(halfSize.x, halfSize.y) * 0.28;
    vec2 q = abs(p) - halfSize + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  } else if (shapeType == 2) {
    vec2 norm = p / max(halfSize, vec2(1.0));
    return (length(norm) - 1.0) * min(halfSize.x, halfSize.y);
  }
  return length(p) - max(halfSize.x, halfSize.y);
}

void main() {
  vec2 p = v_fragCoord - in_center;
  float timeSec = in_time * 0.001;
  float baseFadeIn = smoothstep(0.0, 0.1, in_progress);
  float baseFadeOut = 1.0 - smoothstep(0.3, 1.0, in_progress);
  float sparkleFadeIn = smoothstep(0.0, 0.1, in_progress);
  float sparkleFadeOut = 1.0 - smoothstep(0.4, 1.0, in_progress);
  vec2 targetHalfSize = in_size * mix(0.18, 1.0, in_progress);
  float dist = shapeDistance(p, targetHalfSize, in_shape);
  float angle = atan(p.y, p.x);
  dist += sin(angle * 6.0 + timeSec * 4.0) * in_distortFactor * 4.0;
  float bandWidth = max(min(in_size.x, in_size.y) * 0.16, 14.0);
  float ringMask = 1.0 - smoothstep(0.0, bandWidth, abs(dist));
  float centerFill = (1.0 - smoothstep(-6.0, 8.0, dist)) * (1.0 - smoothstep(0.0, 0.35, in_progress)) * 0.38;
  vec2 sparkUv = v_fragCoord / 2.6;
  float fine = fineSparkles(sparkUv, timeSec * 2.2, u_sparkleDensity, 1.0) * 0.85
             + fineSparkles(sparkUv + vec2(7.1, 3.9), timeSec * 3.1 + 1.4, u_sparkleDensity, 2.4) * 0.45
             + fineSparkles(sparkUv + vec2(19.3, 8.7), timeSec * 4.7 + 0.8, u_sparkleDensity, 3.6) * 0.26;
  float spark = saturate(fine) * ringMask * sparkleFadeIn * sparkleFadeOut * in_sparkleStrength;
  float waveAlpha = (ringMask * 0.55 + centerFill) * baseFadeIn * baseFadeOut * in_color.a;
  vec4 waveCol = vec4(in_color.rgb * waveAlpha, waveAlpha);
  vec4 sparkCol = vec4(in_sparkleColor.rgb * spark * in_sparkleColor.a, spark * in_sparkleColor.a);
  fragColor = clamp(waveCol + sparkCol, 0.0, 1.0);
}`;

type UniformCache = Record<string, WebGLUniformLocation | null>;


/** 金粉飘散密度 0.35..2.0。细腻粒子场是唯一路径，不再有块状量化档。 */
let rippleSparkleDensity = 1.05;
export function setRippleSparkleDensity(density: number): void {
  rippleSparkleDensity = Math.max(0.35, Math.min(2.0, Number(density) || 1.05));
}
export function getRippleSparkleDensity(): number {
  return rippleSparkleDensity;
}
/** 兼容旧调用：false 也只降低密度，绝不回退到块状采样。 */
export function setRippleFineQuality(fine: boolean): void {
  setRippleSparkleDensity(fine ? 1.05 : 0.55);
}

interface FallbackParticle {
  angle: number;
  radial: number;
  radius: number;
  phase: number;
}
const fallbackParticleCache = new WeakMap<object, FallbackParticle[]>();
function fallbackHash(n: number): number {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}
function getFallbackParticles(key: object, count: number, seed: number): FallbackParticle[] {
  const cached = fallbackParticleCache.get(key);
  if (cached && cached.length === count) return cached;
  const list: FallbackParticle[] = [];
  for (let i = 0; i < count; i++) {
    const a = fallbackHash(seed + i * 1.37);
    const b = fallbackHash(seed + i * 2.71 + 9.1);
    const c = fallbackHash(seed + i * 3.93 + 21.3);
    list.push({ angle: a * Math.PI * 2, radial: 0.42 + 0.58 * b, radius: 0.16 + 0.40 * c, phase: a });
  }
  fallbackParticleCache.set(key, list);
  return list;
}

class AospRippleRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private frameworkProgram: WebGLProgram | null = null;
  private systemUIProgram: WebGLProgram | null = null;
  private frameworkUniforms: UniformCache = {};
  private systemUIUniforms: UniformCache = {};
  private quadVao: WebGLVertexArrayObject | null = null;
  private isSupported = false;

  constructor() {
    this.init();
  }

  get webglAvailable(): boolean {
    return this.isSupported;
  }

  private init(): void {
    if (typeof document === 'undefined') return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: true,
      });
      if (!gl) return;

      const fwProgram = this.createProgram(gl, VERTEX_SHADER, FRAMEWORK_FRAGMENT_SHADER);
      const sysProgram = this.createProgram(gl, VERTEX_SHADER, SYSTEMUI_FRAGMENT_SHADER);
      if (!fwProgram || !sysProgram) return;

      const vao = gl.createVertexArray();
      const vbo = gl.createBuffer();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);

      this.canvas = canvas;
      this.gl = gl;
      this.frameworkProgram = fwProgram;
      this.systemUIProgram = sysProgram;
      this.quadVao = vao;

      for (const name of [
        'u_canvasSize',
        'u_size',
        'in_origin',
        'in_touch',
        'in_progress',
        'in_maxRadius',
        'in_resolutionScale',
        'in_noiseScale',
        'in_hasMask',
        'in_noisePhase',
        'in_turbulencePhase',
        'in_tCircle1',
        'in_tCircle2',
        'in_tCircle3',
        'in_tRotation1',
        'in_tRotation2',
        'in_tRotation3',
        'in_color',
        'in_sparkleColor',
        'u_cornerRadius',
        'u_maskShape',
        'u_woodDir',
        'u_lacquerColor',
        'u_bloomRadius',
        'u_trailDecay',
        'u_sparkleDensity',
      ]) {
        this.frameworkUniforms[name] = gl.getUniformLocation(fwProgram, name);
      }

      for (const name of [
        'u_canvasSize',
        'in_center',
        'in_size',
        'in_progress',
        'in_time',
        'in_pixelDensity',
        'in_sparkleStrength',
        'in_distortFactor',
        'in_shape',
        'in_color',
        'in_sparkleColor',
        'u_sparkleDensity',
      ]) {
        this.systemUIUniforms[name] = gl.getUniformLocation(sysProgram, name);
      }

      this.isSupported = true;
    } catch {
      this.isSupported = false;
    }
  }

  private compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private createProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram | null {
    const vs = this.compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    if (!prog) return null;
    gl.bindAttribLocation(prog, 0, 'a_position');
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      return null;
    }
    return prog;
  }

  private ensureSize(width: number, height: number, dpr: number) {
    const pw = Math.max(1, Math.round(width * dpr));
    const ph = Math.max(1, Math.round(height * dpr));
    if (this.canvas && (this.canvas.width !== pw || this.canvas.height !== ph)) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    return { pw, ph };
  }

  renderFrameworkSessions(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dpr: number,
    sessions: FrameworkRippleSession[],
    nowMs: number,
    suppressSparkle = false
  ): void {
    if (!sessions.length) return;
    if (!this.isSupported || !this.gl || !this.frameworkProgram || !this.canvas || !this.quadVao) {
      this.renderFrameworkFallback(ctx, sessions, nowMs);
      return;
    }

    const gl = this.gl;
    const u = this.frameworkUniforms;
    const { pw, ph } = this.ensureSize(width, height, dpr);

    gl.viewport(0, 0, pw, ph);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.frameworkProgram);
    gl.bindVertexArray(this.quadVao);

    gl.uniform2f(u.u_canvasSize, width, height);
    gl.uniform2f(u.u_size, width, height);

    for (const s of sessions) {
      const val = evaluateFrameworkUniforms(s, nowMs);
      if (val.phase === 'finished') continue;

      gl.uniform2f(u.in_origin, val.origin[0], val.origin[1]);
      gl.uniform2f(u.in_touch, val.touch[0], val.touch[1]);
      gl.uniform1f(u.in_progress, val.progress);
      gl.uniform1f(u.in_maxRadius, val.maxRadius);
      gl.uniform2f(u.in_resolutionScale, val.resolutionScale[0], val.resolutionScale[1]);
      gl.uniform2f(u.in_noiseScale, val.noiseScale[0], val.noiseScale[1]);
      gl.uniform1f(u.in_hasMask, val.hasMask);
      gl.uniform1f(u.in_noisePhase, val.noisePhase);
      gl.uniform1f(u.in_turbulencePhase, val.turbulencePhase);
      gl.uniform2f(u.in_tCircle1, val.tCircle1[0], val.tCircle1[1]);
      gl.uniform2f(u.in_tCircle2, val.tCircle2[0], val.tCircle2[1]);
      gl.uniform2f(u.in_tCircle3, val.tCircle3[0], val.tCircle3[1]);
      gl.uniform2f(u.in_tRotation1, val.tRotation1[0], val.tRotation1[1]);
      gl.uniform2f(u.in_tRotation2, val.tRotation2[0], val.tRotation2[1]);
      gl.uniform2f(u.in_tRotation3, val.tRotation3[0], val.tRotation3[1]);
      gl.uniform4f(u.in_color, ...val.color);
      gl.uniform4f(
        u.in_sparkleColor,
        val.sparkleColor[0],
        val.sparkleColor[1],
        val.sparkleColor[2],
        suppressSparkle ? val.sparkleColor[3] * 0.2 : val.sparkleColor[3]
      );
      gl.uniform1f(u.u_cornerRadius, val.cornerRadius);
      gl.uniform1i(u.u_maskShape, val.maskShape);
      gl.uniform2f(u.u_woodDir, val.woodDir[0], val.woodDir[1]);
      gl.uniform4f(u.u_lacquerColor, ...val.lacquerColor);
      gl.uniform1f(u.u_bloomRadius, val.bloomRadius);
      gl.uniform1f(u.u_trailDecay, val.trailDecay);
      gl.uniform1f(u.u_sparkleDensity, (suppressSparkle ? 0.35 : val.sparkleDensity) * rippleSparkleDensity);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    gl.bindVertexArray(null);
    ctx.drawImage(this.canvas, 0, 0, pw, ph, 0, 0, width, height);
  }

  renderSystemUISessions(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dpr: number,
    sessions: SystemUIRippleSession[],
    nowMs: number,
    suppressSparkle = false
  ): void {
    if (!sessions.length) return;
    if (!this.isSupported || !this.gl || !this.systemUIProgram || !this.canvas || !this.quadVao) {
      this.renderSystemUIFallback(ctx, sessions, nowMs);
      return;
    }

    const gl = this.gl;
    const u = this.systemUIUniforms;
    const { pw, ph } = this.ensureSize(width, height, dpr);

    gl.viewport(0, 0, pw, ph);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.systemUIProgram);
    gl.bindVertexArray(this.quadVao);

    gl.uniform2f(u.u_canvasSize, width, height);

    for (const s of sessions) {
      const elapsed = Math.max(0, nowMs - s.startTimeMs);
      const progress = Math.min(1, elapsed / s.durationMs);
      if (progress >= 1) continue;

      gl.uniform2f(u.in_center, s.centerX, s.centerY);
      gl.uniform2f(u.in_size, s.targetWidth, s.targetHeight);
      gl.uniform1f(u.in_progress, progress);
      gl.uniform1f(u.in_time, elapsed);
      gl.uniform1f(u.in_pixelDensity, dpr);
      gl.uniform1f(u.in_sparkleStrength, suppressSparkle ? s.sparkleStrength * 0.25 : s.sparkleStrength);
      gl.uniform1f(u.in_distortFactor, s.distortFactor);
      gl.uniform1i(u.in_shape, s.shape);
      gl.uniform4f(u.in_color, ...s.color);
      gl.uniform4f(u.in_sparkleColor, ...s.sparkleColor);
      gl.uniform1f(u.u_sparkleDensity, rippleSparkleDensity);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    gl.bindVertexArray(null);
    ctx.drawImage(this.canvas, 0, 0, pw, ph, 0, 0, width, height);
  }

  private renderFrameworkFallback(
    ctx: CanvasRenderingContext2D,
    sessions: FrameworkRippleSession[],
    nowMs: number
  ): void {
    for (const s of sessions) {
      const val = evaluateFrameworkUniforms(s, nowMs);
      if (val.phase === 'finished') continue;
      const cx = s.touchX + (s.originX - s.touchX) * clamp01(val.progress * 2);
      const cy = s.touchY + (s.originY - s.touchY) * clamp01(val.progress * 2);
      const r = val.maxRadius * val.progress;
      const alpha = (1 - clamp01((val.progress - 0.4) / 0.6)) * s.color[3];
      ctx.save();
      ctx.fillStyle = `rgba(${Math.round(s.color[0] * 255)}, ${Math.round(s.color[1] * 255)}, ${Math.round(s.color[2] * 255)}, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1, r), 0, Math.PI * 2);
      ctx.fill();

      // 细腻飘散粒子（WebView 无 WebGL2 时也能看到，不再只是一个实心圆）
      {
        const sp = s.sparkleColor;
        const parts = getFallbackParticles(s, Math.round(150 * rippleSparkleDensity), s.touchX * 0.73 + s.touchY * 1.31 + 3.7);
        const t = nowMs * 0.001;
        ctx.fillStyle = `rgba(${Math.round(sp[0] * 255)}, ${Math.round(sp[1] * 255)}, ${Math.round(sp[2] * 255)}, 1)`;
        for (const pt of parts) {
          const ang = pt.angle + Math.sin(t * 0.6 + pt.phase * 6.28) * 0.06;
          const rr = r * pt.radial + Math.sin(t * 1.1 + pt.phase * 12.6) * 1.4;
          const px = cx + Math.cos(ang) * rr;
          const py = cy + Math.sin(ang) * rr;
          const tw = 0.22 + 0.78 * (0.5 + 0.5 * Math.sin(t * 2.5 + pt.phase * 43.7));
          ctx.globalAlpha = Math.min(1, alpha * tw * sp[3] * 0.9);
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.22, pt.radius * 0.72), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  private renderSystemUIFallback(
    ctx: CanvasRenderingContext2D,
    sessions: SystemUIRippleSession[],
    nowMs: number
  ): void {
    for (const s of sessions) {
      const progress = Math.min(1, Math.max(0, nowMs - s.startTimeMs) / s.durationMs);
      if (progress >= 1) continue;
      const scale = 0.18 + 0.82 * progress;
      const rx = Math.max(1, s.targetWidth * scale * 0.5);
      const ry = Math.max(1, s.targetHeight * scale * 0.5);
      const alpha = (1 - progress) * s.color[3];
      ctx.save();
      ctx.strokeStyle = `rgba(${Math.round(s.color[0] * 255)}, ${Math.round(s.color[1] * 255)}, ${Math.round(s.color[2] * 255)}, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(s.centerX, s.centerY, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      {
        const sp = s.sparkleColor;
        const parts = getFallbackParticles(s, Math.round(130 * rippleSparkleDensity), s.centerX * 0.61 + s.centerY * 1.07 + 8.2);
        const t = nowMs * 0.001;
        const fade = (1 - progress) * s.sparkleStrength * sp[3];
        ctx.fillStyle = `rgba(${Math.round(sp[0] * 255)}, ${Math.round(sp[1] * 255)}, ${Math.round(sp[2] * 255)}, 1)`;
        for (const pt of parts) {
          const ang = pt.angle + Math.sin(t * 0.8 + pt.phase * 6.28) * 0.05;
          const radial = 0.86 + 0.14 * pt.radial;
          const px = s.centerX + Math.cos(ang) * rx * radial;
          const py = s.centerY + Math.sin(ang) * ry * radial;
          const tw = 0.22 + 0.78 * (0.5 + 0.5 * Math.sin(t * 2.3 + pt.phase * 37.1));
          ctx.globalAlpha = Math.min(1, fade * tw * 0.9);
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.22, pt.radius * 0.72), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }
}

let sharedRenderer: AospRippleRenderer | null = null;

export function getRippleRenderer(): AospRippleRenderer {
  if (!sharedRenderer) {
    sharedRenderer = new AospRippleRenderer();
  }
  return sharedRenderer;
}

export function getDevicePixelRatioCapped(): number {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 3);
}

export function pruneRipplePool<T>(
  pool: T[],
  maxSize: number,
  nowMs: number,
  isFinishedFn?: (item: T, nowMs: number) => boolean
): T[] {
  const active = pool.filter((item) => {
    if (isFinishedFn) return !isFinishedFn(item, nowMs);
    const maybe = item as unknown as { isFinished?: (t: number) => boolean };
    return maybe.isFinished ? !maybe.isFinished(nowMs) : true;
  });
  return active.length <= maxSize ? active : active.slice(active.length - maxSize);
}
