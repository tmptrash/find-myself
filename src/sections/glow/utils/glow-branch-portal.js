import { glowRgb, GLOW_PAL } from './glow-palette.js'

//
// Horizontal oval — wide RX, flat RY (reference art is vertical; we rotate the feel).
//
const PORTAL_RX = 56
const PORTAL_RY = 15
const SPIRAL_ARM_COUNT = 6
const SPIRAL_PARTICLE_COUNT = 44
const SPIRAL_TURN_RATE = 1.35
const SPIRAL_FADE_START = 0.28
const CORE_PULSE_SPEED = 2.8
const SPIRAL_LINE_WIDTH_GRAY = 2.4
const SPIRAL_LINE_WIDTH_COLOR = 2.8
const SPIRAL_SHADOW_LINE_WIDTH_COLOR = 3.6
const COLOR_SPIRAL_ALPHA_BOOST = 1.35
const COLOR_FILL_ELLIPSE_OPACITY_SCALE = 0.62
const COLOR_SPIRAL_FADE = 0.35
const COLOR_SPIRAL_ARM_STRIDE = 2
const COLOR_SPIRAL_MIN_RADIUS_NORM = 0.42
const COLOR_SPIRAL_FADE_START = 0.5
const COLOR_SPIRAL_TURN_SCALE = 2.35
const GRAY_SPIRAL_TURN_SCALE = 3.2

/**
 * Mutable spiral state for the branch teleport VFX (one per level scene).
 * @returns {Object} Portal VFX inst
 */
export function createBranchPortalState() {
  const arms = []
  for (let i = 0; i < SPIRAL_ARM_COUNT; i++) {
    arms.push({ baseAngle: (i / SPIRAL_ARM_COUNT) * Math.PI * 2 })
  }
  const particles = []
  for (let i = 0; i < SPIRAL_PARTICLE_COUNT; i++) {
    particles.push({
      angle: Math.random() * Math.PI * 2,
      radiusNorm: Math.random() * 0.2,
      speed: 0.45 + Math.random() * 0.5,
      twinkle: Math.random() * Math.PI * 2
    })
  }
  return { arms, particles, spin: 0 }
}

/**
 * Advances spiral unwrap animation.
 * @param {Object} state - Portal VFX inst
 * @param {number} dt - Frame delta
 */
export function updateBranchPortalState(state, dt) {
  if (!state) return
  state.spin += dt * SPIRAL_TURN_RATE
  state.particles.forEach((p) => {
    p.radiusNorm += p.speed * dt * 0.24
    if (p.radiusNorm > 1.08) {
      p.radiusNorm = Math.random() * 0.1
      p.angle = state.spin + Math.random() * Math.PI * 2
    }
    p.twinkle += dt * 4.5
  })
}

/**
 * Maps a unit disc point into a horizontal ellipse in world space.
 */
function portalEllipsePoint(cx, cy, rx, ry, angle, rNorm, turnScale = GRAY_SPIRAL_TURN_SCALE) {
  const spiralTight = 0.72 + rNorm * 0.55
  const a = angle + rNorm * spiralTight * Math.PI * turnScale
  return {
    x: cx + Math.cos(a) * rx * rNorm,
    y: cy + Math.sin(a) * ry * rNorm
  }
}

/**
 * Linear RGB blend between two palette keys (snapped endpoints).
 */
function lerpGlowRgbKey(grayKey, colorKey, t) {
  const a = glowRgb(grayKey)
  const b = glowRgb(colorKey)
  const u = Math.max(0, Math.min(1, t))
  return {
    r: Math.round(a.r + (b.r - a.r) * u),
    g: Math.round(a.g + (b.g - a.g) * u),
    b: Math.round(a.b + (b.b - a.b) * u)
  }
}

/**
 * Draws a horizontal cyan-vortex portal with spinning spiral arms.
 * @param {Object} k - Kaplay inst
 * @param {Object} layout - { cx, cy }
 * @param {Object} state - Portal VFX inst
 * @param {number} colorFade - 0 gray ghost, 1 full colour read
 * @param {number} [alphaMul=1] - Extra opacity scale (e.g. mud-sneak ghost read)
 */
export function drawBranchPortal(k, layout, state, colorFade, alphaMul = 1) {
  if (!layout || !state) return
  const t = k.time()
  const cx = layout.cx
  const cy = layout.cy
  const fade = Math.max(0, Math.min(1, colorFade ?? 0))
  const ghost = (0.22 + fade * 0.62) * Math.max(0, Math.min(1, alphaMul ?? 1))
  const portalPal = GLOW_PAL.branchPortal
  const voidRgb = glowRgb('void')
  const deepRgb = lerpGlowRgbKey('midGray', 'void', fade)
  const hazeRgb = lerpGlowRgbKey('lightGray', portalPal.haze, fade)
  const midRgb = lerpGlowRgbKey('lightGray', portalPal.depth, fade)
  const brightRgb = lerpGlowRgbKey('decorGray', portalPal.spiralBright, fade)
  const coreRgb = lerpGlowRgbKey('midGray', 'void', fade)
  const spiralShadowRgb = voidRgb
  const fillOpacityScale = 1 - fade * (1 - COLOR_FILL_ELLIPSE_OPACITY_SCALE)
  const pulse = 0.93 + Math.sin(t * CORE_PULSE_SPEED) * 0.05
  const rx = PORTAL_RX * pulse
  const ry = PORTAL_RY * pulse
  //
  // Layered ellipses — dark core, haze mid, bright rim (pixel-vortex read).
  //
  k.drawEllipse({
    pos: k.vec2(cx, cy),
    radiusX: rx * 1.08,
    radiusY: ry * 1.12,
    color: k.rgb(deepRgb.r, deepRgb.g, deepRgb.b),
    opacity: ghost * 0.35 * fillOpacityScale
  })
  k.drawEllipse({
    pos: k.vec2(cx, cy),
    radiusX: rx * 0.88,
    radiusY: ry * 0.9,
    color: k.rgb(hazeRgb.r, hazeRgb.g, hazeRgb.b),
    opacity: ghost * 0.9 * fillOpacityScale
  })
  k.drawEllipse({
    pos: k.vec2(cx, cy),
    radiusX: rx * 0.62,
    radiusY: ry * 0.62,
    color: k.rgb(midRgb.r, midRgb.g, midRgb.b),
    opacity: ghost * (0.45 + fade * 0.35) * fillOpacityScale
  })
  k.drawEllipse({
    pos: k.vec2(cx, cy),
    radiusX: rx * 0.38,
    radiusY: ry * 0.42,
    color: k.rgb(coreRgb.r, coreRgb.g, coreRgb.b),
    opacity: ghost * (0.35 + fade * 0.4)
  })
  k.drawEllipse({
    pos: k.vec2(cx, cy),
    radiusX: rx * 1.02,
    radiusY: ry * 1.05,
    color: k.rgb(brightRgb.r, brightRgb.g, brightRgb.b),
    opacity: ghost * (0.18 + fade * 0.22)
  })
  //
  // Spiral arms — unwind outward and fade (horizontal ellipse).
  //
  const spin = state.spin
  const spiralMidRgb = lerpGlowRgbKey('lightGray', portalPal.spiralMid, fade)
  const armWidth = SPIRAL_LINE_WIDTH_GRAY - fade * (SPIRAL_LINE_WIDTH_GRAY - SPIRAL_LINE_WIDTH_COLOR)
  const colorSpiral = fade > COLOR_SPIRAL_FADE
  const spiralFadeStart = colorSpiral ? COLOR_SPIRAL_FADE_START : SPIRAL_FADE_START
  const spiralTurnScale = colorSpiral ? COLOR_SPIRAL_TURN_SCALE : GRAY_SPIRAL_TURN_SCALE
  const spiralMinU = colorSpiral ? COLOR_SPIRAL_MIN_RADIUS_NORM : 0
  state.arms.forEach((arm, armIdx) => {
    if (colorSpiral && armIdx % COLOR_SPIRAL_ARM_STRIDE !== 0) return
    const pts = []
    const steps = 22
    for (let s = 0; s <= steps; s++) {
      const u = spiralMinU + (s / steps) * (1 - spiralMinU)
      const angle = arm.baseAngle + spin * (1 + armIdx * 0.08)
      const fadeOut = u < spiralFadeStart ? 0 : (u - spiralFadeStart) / (1 - spiralFadeStart)
      const alpha = ghost * (1 - fadeOut) * (0.5 + fade * 0.55) * (colorSpiral ? COLOR_SPIRAL_ALPHA_BOOST : 1)
      if (alpha <= 0.02) continue
      const p = portalEllipsePoint(cx, cy, rx, ry, angle, u, spiralTurnScale)
      pts.push({ x: p.x, y: p.y, a: alpha })
    }
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1]
      const p1 = pts[i]
      const a = Math.min(p0.a, p1.a)
      const w = armWidth - armIdx * 0.12
      colorSpiral && k.drawLine({
        p1: k.vec2(p0.x, p0.y),
        p2: k.vec2(p1.x, p1.y),
        width: SPIRAL_SHADOW_LINE_WIDTH_COLOR - armIdx * 0.15,
        color: k.rgb(spiralShadowRgb.r, spiralShadowRgb.g, spiralShadowRgb.b),
        opacity: a * 0.75
      })
      k.drawLine({
        p1: k.vec2(p0.x, p0.y),
        p2: k.vec2(p1.x, p1.y),
        width: w,
        color: k.rgb(brightRgb.r, brightRgb.g, brightRgb.b),
        opacity: a
      })
      !colorSpiral && k.drawLine({
        p1: k.vec2(p0.x, p0.y),
        p2: k.vec2(p1.x, p1.y),
        width: Math.max(1, w * 0.5),
        color: k.rgb(spiralMidRgb.r, spiralMidRgb.g, spiralMidRgb.b),
        opacity: a * (0.55 + fade * 0.25)
      })
    }
  })
  //
  // Spark pixels on the spiral path.
  //
  state.particles.forEach((p) => {
    const r = p.radiusNorm
    if (colorSpiral && r < spiralMinU) return
    const fadeOut = r < spiralFadeStart ? 0 : (r - spiralFadeStart) / (1 - spiralFadeStart)
    const alpha = ghost * (1 - fadeOut) * (0.55 + fade * 0.5) * (0.6 + Math.sin(p.twinkle) * 0.4)
    if (alpha <= 0.03) return
    const pt = portalEllipsePoint(cx, cy, rx, ry, p.angle + spin, r, spiralTurnScale)
    k.drawRect({
      pos: k.vec2(pt.x, pt.y),
      width: 2,
      height: 2,
      color: k.rgb(brightRgb.r, brightRgb.g, brightRgb.b),
      opacity: alpha * (colorSpiral ? COLOR_SPIRAL_ALPHA_BOOST * 0.85 : 1)
    })
  })
}

export const BRANCH_PORTAL_RX = PORTAL_RX
export const BRANCH_PORTAL_RY = PORTAL_RY
