//
// Pupil layout in eye_0.png local space (anchor at sprite centre, +Y down).
// Tuned to match eye_line.png — large dark disc with a small upper-right glint.
//
const SCLERA_OFFSET_X = 0
const SCLERA_OFFSET_Y = -6
const SCLERA_RADIUS_X = 54
const SCLERA_RADIUS_Y = 58
const PUPIL_RADIUS = 26
const PUPIL_MAX_OFFSET = 16
//
// Ellipse inset inside the sclera — tighter on Y so the pupil stays inside the black iris ring (especially at the top).
//
const PUPIL_BOUNDS_RADIUS_X_MUL = 0.48
const PUPIL_BOUNDS_RADIUS_Y_MUL = 0.40
const PUPIL_HIGHLIGHT_OFFSET_X = 7
const PUPIL_HIGHLIGHT_OFFSET_Y = -9
const PUPIL_HIGHLIGHT_RADIUS = 5.5
//
// Top lid coverage per blink frame (0 = open, 1 = shut).
//
export const EYE_LID_COVER_BY_FRAME = [0, 0.56, 1]
const PUPIL_ARC_STEPS = 18
//
// @param {number} frameHeight - Display height of one eye frame in world px
//
export function eyeDisplayScaleFromHeight(frameHeight) {
  return frameHeight / 239
}
/**
 * @param {number} eyeCenterX
 * @param {number} eyeCenterY
 * @param {number} targetX
 * @param {number} targetY
 * @param {number} displayScale
 * @returns {{ x: number, y: number }}
 */
export function computeEyePupilWorldPos(eyeCenterX, eyeCenterY, targetX, targetY, displayScale) {
  const scleraX = eyeCenterX + SCLERA_OFFSET_X * displayScale
  const scleraY = eyeCenterY + SCLERA_OFFSET_Y * displayScale
  const maxOff = PUPIL_MAX_OFFSET * displayScale
  const dx = targetX - scleraX
  const dy = targetY - scleraY
  const len = Math.hypot(dx, dy) || 1
  let ox = (dx / len) * maxOff
  let oy = (dy / len) * maxOff
  const rx = SCLERA_RADIUS_X * displayScale * PUPIL_BOUNDS_RADIUS_X_MUL
  const ry = SCLERA_RADIUS_Y * displayScale * PUPIL_BOUNDS_RADIUS_Y_MUL
  const mag = Math.hypot(ox / rx, oy / ry)
  if (mag > 1) {
    ox /= mag
    oy /= mag
  }
  return { x: scleraX + ox, y: scleraY + oy }
}
/**
 * @param {Object} k
 * @param {Object} cfg
 * @param {number} cfg.centerX
 * @param {number} cfg.centerY
 * @param {number} cfg.displayScale
 * @param {number} cfg.frameIndex
 * @param {number} cfg.targetX
 * @param {number} cfg.targetY
 * @param {number} [cfg.opacity=1]
 * @param {boolean} [cfg.fixed=false]
 */
export function drawTrackingEyePupil(k, cfg) {
  const {
    centerX,
    centerY,
    displayScale,
    frameIndex,
    targetX,
    targetY,
    opacity = 1,
    fixed = false
  } = cfg
  const cover = EYE_LID_COVER_BY_FRAME[frameIndex] ?? 0
  if (cover >= 0.995 || opacity <= 0.01) return
  const scleraX = centerX + SCLERA_OFFSET_X * displayScale
  const scleraY = centerY + SCLERA_OFFSET_Y * displayScale
  const ry = SCLERA_RADIUS_Y * displayScale
  const lidY = scleraY - ry + cover * 2 * ry
  const pupil = computeEyePupilWorldPos(centerX, centerY, targetX, targetY, displayScale)
  const pr = PUPIL_RADIUS * displayScale
  const hr = PUPIL_HIGHLIGHT_RADIUS * displayScale
  const hx = pupil.x + PUPIL_HIGHLIGHT_OFFSET_X * displayScale
  const hy = pupil.y + PUPIL_HIGHLIGHT_OFFSET_Y * displayScale
  if (!pointVisibleBelowLid(pupil.x, pupil.y, pr, lidY)) return
  drawCircleClippedBelowLid(k, pupil.x, pupil.y, pr, lidY, k.rgb(0, 0, 0), opacity, fixed)
  pointVisibleBelowLid(hx, hy, hr, lidY) &&
    drawCircleClippedBelowLid(k, hx, hy, hr, lidY, k.rgb(255, 255, 255), opacity * 0.95, fixed)
}
function pointVisibleBelowLid(px, py, r, lidY) {
  return py + r > lidY
}
function drawCircleClippedBelowLid(k, cx, cy, r, lidY, color, opacity, fixed) {
  if (cy - r >= lidY) {
    k.drawCircle({ pos: k.vec2(cx, cy), radius: r, color, opacity, fixed })
    return
  }
  if (cy + r <= lidY) return
  const dy = (lidY - cy) / r
  const clamped = Math.max(-1, Math.min(1, dy))
  const beta = Math.asin(clamped)
  const pts = []
  for (let i = 0; i <= PUPIL_ARC_STEPS; i++) {
    const ang = beta + ((Math.PI - 2 * beta) * i) / PUPIL_ARC_STEPS
    pts.push(k.vec2(cx + r * Math.cos(ang), cy + r * Math.sin(ang)))
  }
  k.drawPolygon({ pts, color, opacity, fixed })
}
