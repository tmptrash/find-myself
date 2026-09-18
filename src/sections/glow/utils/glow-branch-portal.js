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
function portalEllipsePoint(cx, cy, rx, ry, angle, rNorm) {
  const spiralTight = 0.72 + rNorm * 0.55
  const a = angle + rNorm * spiralTight * Math.PI * 3.2
  return {
    x: cx + Math.cos(a) * rx * rNorm,
    y: cy + Math.sin(a) * ry * rNorm
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
  const voidRgb = glowRgb('lightGray')
  const deepRgb = glowRgb('midGray')
  const midRgb = glowRgb('lightGray')
  const brightRgb = glowRgb('decorGray')
  const coreRgb = glowRgb('midGray')
  const pulse = 0.93 + Math.sin(t * CORE_PULSE_SPEED) * 0.05
  const rx = PORTAL_RX * pulse
  const ry = PORTAL_RY * pulse
  //
  // Layered ellipses — dark core, cyan mid, bright rim (pixel-vortex read).
  //
  k.drawEllipse({
    pos: k.vec2(cx, cy),
    radiusX: rx * 1.08,
    radiusY: ry * 1.12,
    color: k.rgb(deepRgb.r, deepRgb.g, deepRgb.b),
    opacity: ghost * 0.35
  })
  k.drawEllipse({
    pos: k.vec2(cx, cy),
    radiusX: rx * 0.88,
    radiusY: ry * 0.9,
    color: k.rgb(voidRgb.r, voidRgb.g, voidRgb.b),
    opacity: ghost * 0.9
  })
  k.drawEllipse({
    pos: k.vec2(cx, cy),
    radiusX: rx * 0.62,
    radiusY: ry * 0.62,
    color: k.rgb(midRgb.r, midRgb.g, midRgb.b),
    opacity: ghost * (0.45 + fade * 0.35)
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
    opacity: ghost * 0.18
  })
  //
  // Spiral arms — unwind outward and fade (horizontal ellipse).
  //
  const spin = state.spin
  state.arms.forEach((arm, armIdx) => {
    const pts = []
    const steps = 26
    for (let s = 0; s <= steps; s++) {
      const u = s / steps
      const angle = arm.baseAngle + spin * (1 + armIdx * 0.08)
      const fadeOut = u < SPIRAL_FADE_START ? 0 : (u - SPIRAL_FADE_START) / (1 - SPIRAL_FADE_START)
      const alpha = ghost * (1 - fadeOut) * (0.5 + fade * 0.45)
      if (alpha <= 0.02) continue
      const p = portalEllipsePoint(cx, cy, rx, ry, angle, u)
      pts.push({ x: p.x, y: p.y, a: alpha })
    }
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1]
      const p1 = pts[i]
      const a = Math.min(p0.a, p1.a)
      k.drawLine({
        p1: k.vec2(p0.x, p0.y),
        p2: k.vec2(p1.x, p1.y),
        width: 2.4 - armIdx * 0.12,
        color: k.rgb(brightRgb.r, brightRgb.g, brightRgb.b),
        opacity: a
      })
      k.drawLine({
        p1: k.vec2(p0.x, p0.y),
        p2: k.vec2(p1.x, p1.y),
        width: 1.2,
        color: k.rgb(midRgb.r, midRgb.g, midRgb.b),
        opacity: a * 0.55
      })
    }
  })
  //
  // Spark pixels on the spiral path.
  //
  state.particles.forEach((p) => {
    const r = p.radiusNorm
    const fadeOut = r < SPIRAL_FADE_START ? 0 : (r - SPIRAL_FADE_START) / (1 - SPIRAL_FADE_START)
    const alpha = ghost * (1 - fadeOut) * (0.55 + fade * 0.4) * (0.6 + Math.sin(p.twinkle) * 0.4)
    if (alpha <= 0.03) return
    const pt = portalEllipsePoint(cx, cy, rx, ry, p.angle + spin, r)
    k.drawRect({
      pos: k.vec2(pt.x, pt.y),
      width: 2,
      height: 2,
      color: k.rgb(brightRgb.r, brightRgb.g, brightRgb.b),
      opacity: alpha
    })
  })
}

export const BRANCH_PORTAL_RX = PORTAL_RX
export const BRANCH_PORTAL_RY = PORTAL_RY
