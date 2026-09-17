import { glowRgb } from './glow-palette.js'
//
// Must match EYE_INTRO_EYE_GAP in glow-eye-intro.js (pickup eye spacing).
//
const PIT_CAVE_EYE_GAP = 14
//
// Same front-view bust proportions as drawUndergroundSkeleton in level0.js.
//
const PIT_CAVE_SKULL_SOCKET_X_FRAC = 0.42
const PIT_CAVE_SKULL_SOCKET_Y_FRAC = 0.08
const PIT_CAVE_SKULL_SOCKET_R_FRAC = 0.3
const PIT_CAVE_SKULL_R = PIT_CAVE_EYE_GAP / (PIT_CAVE_SKULL_SOCKET_X_FRAC * 2)

const PIT_CAVE_SKELETON_SPRITE = 'glow-pit-cave-skeleton'
const SKELETON_BAKE_PAD = 22
const CAVE_SKELETON_LAYOUT_VERSION = 5
const PIT_WALL_W = 20
const PIT_FLOOR_EXTRA_W_LEFT = 18
const PIT_FLOOR_EXTRA_W_RIGHT = 6
/**
 * Same world centre as spawnGlowCavePickupEyes / getGlowPitBonusPosition.
 * @param {Object} pit - Pit state
 * @returns {{ x: number, y: number }|null}
 */
function pitCaveEyePickupCenter(pit) {
  if (!pit?.zone) return null
  const { zone, floorY } = pit
  const bottomY = floorY + zone.depth
  const innerX = zone.x1 + PIT_WALL_W - PIT_FLOOR_EXTRA_W_LEFT
  const innerW = Math.max(24, zone.width - PIT_WALL_W * 2 +
    PIT_FLOOR_EXTRA_W_LEFT + PIT_FLOOR_EXTRA_W_RIGHT)
  return {
    x: innerX + innerW * 0.14,
    y: bottomY - 18
  }
}
/**
 * World positions for the lying pickup eyes (skull socket line).
 * @param {Object} pit - Pit state
 * @returns {{ cx: number, cy: number, leftX: number, rightX: number, y: number }}
 */
export function getPitCaveSkullEyeLine(pit) {
  const sk = ensurePitCaveSkeletonLayout(pit)
  const r = sk.skullR
  const eyeY = sk.y - r * PIT_CAVE_SKULL_SOCKET_Y_FRAC
  return {
    cx: sk.x,
    cy: eyeY,
    leftX: sk.x - r * PIT_CAVE_SKULL_SOCKET_X_FRAC,
    rightX: sk.x + r * PIT_CAVE_SKULL_SOCKET_X_FRAC,
    y: eyeY
  }
}
/**
 * Ensures pit.caveSkeleton holds a stable back-wall pose for the pit cave.
 * @param {Object} pit - Pit state
 * @returns {Object} Skeleton layout
 */
export function ensurePitCaveSkeletonLayout(pit) {
  if (pit.caveSkeleton?.version === CAVE_SKELETON_LAYOUT_VERSION) {
    return pit.caveSkeleton
  }
  pit._caveSkeletonSpriteReady = false
  const bonus = pitCaveEyePickupCenter(pit)
  const r = PIT_CAVE_SKULL_R
  const eyeLineY = bonus?.y ?? pit.floorY + pit.zone.depth - 28
  const cx = bonus?.x ?? pit.zone.x1 + pit.zone.width * 0.52
  pit.caveSkeleton = {
    version: CAVE_SKELETON_LAYOUT_VERSION,
    x: cx,
    y: eyeLineY + r * PIT_CAVE_SKULL_SOCKET_Y_FRAC,
    angle: 0,
    skullR: r
  }
  return pit.caveSkeleton
}
/**
 * Bone tones for the cave skeleton (flat gray or shaded earth band).
 * @param {boolean} flatDecor - Single-tone decor mode
 * @returns {{ fill: Object, deep: Object, light: Object }}
 */
export function caveSkeletonTones(flatDecor) {
  if (flatDecor) {
    const g = glowRgb('decorGray')
    return { fill: g, deep: g, light: g }
  }
  return {
    fill: glowRgb('playfieldOuter'),
    deep: glowRgb('void'),
    light: glowRgb('midGray')
  }
}
/**
 * Draws the cave skeleton embedded in the back wall (does not touch baked rocks).
 * @param {Object} k - Kaplay instance
 * @param {Object} pit - Pit state
 * @param {Object} tones - { fill, deep, light } rgb objects
 * @param {Object} opts - { opacity, embedded }
 */
export function drawPitCaveSkeleton(k, pit, tones, opts = {}) {
  if (!pit) return
  const sk = ensurePitCaveSkeletonLayout(pit)
  const opacity = opts.opacity ?? 0.85
  const embedded = Boolean(opts.embedded)
  ensurePitCaveSkeletonSprite(k, pit, tones, embedded)
  if (!pit._caveSkeletonSpriteReady) return
  const uniform = embedded ? 0.55 : 1
  const anchorOffY = (pit._caveSkeletonSkullOffsetY ?? 0) * uniform
  k.drawSprite({
    sprite: PIT_CAVE_SKELETON_SPRITE,
    pos: k.vec2(sk.x, sk.y + anchorOffY),
    anchor: 'center',
    width: pit._caveSkeletonBakeW * uniform,
    height: pit._caveSkeletonBakeH * uniform,
    opacity
  })
}
//
// Bakes the skeleton once per Kaplay instance (re-bake if embed mode changes).
//
function ensurePitCaveSkeletonSprite(k, pit, tones, embedded) {
  const bakeKey = embedded ? 'embed' : 'free'
  if (pit._caveSkeletonSpriteReady && pit._caveSkeletonBakeKey === bakeKey &&
    pit._caveSkeletonSkullOffsetY != null) return
  const sk = ensurePitCaveSkeletonLayout(pit)
  const r = sk.skullR
  const w = Math.ceil(r * 5.2 + SKELETON_BAKE_PAD * 2)
  const h = Math.ceil(r * 5.6 + SKELETON_BAKE_PAD * 2 + r * 1.5)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const skullCy = SKELETON_BAKE_PAD + r * 0.55
  ctx.translate(w / 2, skullCy)
  drawCaveSkeletonToCtx(ctx, sk, tones)
  k.loadSprite(PIT_CAVE_SKELETON_SPRITE, canvas)
  canvas.width = 0
  canvas.height = 0
  pit._caveSkeletonBakeW = w
  pit._caveSkeletonBakeH = h
  //
  // sk.x/sk.y is the skull pivot — sprite anchor is the bake centre, not the cranium.
  //
  pit._caveSkeletonSkullOffsetY = h / 2 - skullCy
  pit._caveSkeletonSpriteReady = true
  pit._caveSkeletonBakeKey = bakeKey
}
//
// Front-view buried skeleton — matches drawUndergroundSkeleton in level0.js.
//
function drawCaveSkeletonToCtx(ctx, sk, tones) {
  const boneCss = `rgb(${tones.light.r}, ${tones.light.g}, ${tones.light.b})`
  const deepCss = `rgb(${tones.deep.r}, ${tones.deep.g}, ${tones.deep.b})`
  const r = sk.skullR
  ctx.save()
  ctx.rotate(sk.angle || 0)
  ctx.globalAlpha = 0.85
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.fillStyle = boneCss
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-r * 0.62, r * 0.4)
  ctx.lineTo(r * 0.62, r * 0.4)
  ctx.lineTo(r * 0.5, r * 1.35)
  ctx.lineTo(-r * 0.5, r * 1.35)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = deepCss
  ctx.beginPath()
  ctx.arc(-r * PIT_CAVE_SKULL_SOCKET_X_FRAC, -r * PIT_CAVE_SKULL_SOCKET_Y_FRAC,
    r * PIT_CAVE_SKULL_SOCKET_R_FRAC, 0, Math.PI * 2)
  ctx.arc(r * PIT_CAVE_SKULL_SOCKET_X_FRAC, -r * PIT_CAVE_SKULL_SOCKET_Y_FRAC,
    r * PIT_CAVE_SKULL_SOCKET_R_FRAC, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(0, r * 0.28)
  ctx.lineTo(-r * 0.14, r * 0.62)
  ctx.lineTo(r * 0.14, r * 0.62)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(-r * 0.48, r * 0.88, r * 0.96, r * 0.34)
  ctx.strokeStyle = boneCss
  ctx.lineWidth = 1.4
  for (let t = -1; t <= 1; t++) {
    ctx.beginPath()
    ctx.moveTo(t * r * 0.26, r * 0.84)
    ctx.lineTo(t * r * 0.26, r * 1.26)
    ctx.stroke()
  }
  const spineTopY = r * 1.5
  const spineBottomY = r * 5.6
  ctx.strokeStyle = boneCss
  ctx.lineWidth = r * 0.16
  ctx.beginPath()
  ctx.moveTo(0, spineTopY)
  ctx.lineTo(0, spineBottomY)
  ctx.stroke()
  ctx.lineWidth = r * 0.13
  for (let v = 0; v < 7; v++) {
    const vy = spineTopY + (spineBottomY - spineTopY) * (v / 6)
    ctx.beginPath()
    ctx.moveTo(-r * 0.24, vy)
    ctx.lineTo(r * 0.24, vy)
    ctx.stroke()
  }
  const shoulderX = r * 1.9
  const shoulderY = r * 1.75
  ctx.lineWidth = r * 0.16
  ctx.beginPath()
  ctx.moveTo(-shoulderX, shoulderY)
  ctx.quadraticCurveTo(0, r * 2.05, shoulderX, shoulderY)
  ctx.stroke()
  ctx.lineWidth = r * 0.18
  for (let rib = 0; rib < 4; rib++) {
    const ribY = r * (2.35 + rib * 0.78)
    const ribW = r * (2.15 - rib * 0.22)
    const ribDrop = r * (0.85 - rib * 0.08)
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(0, ribY)
      ctx.quadraticCurveTo(side * ribW, ribY + ribDrop * 0.2, side * ribW * 0.82, ribY + ribDrop)
      ctx.stroke()
    }
  }
  drawSkeletonBone(ctx, boneCss, -shoulderX, shoulderY, -shoulderX - r * 0.45, shoulderY + r * 2.6)
  drawSkeletonBone(ctx, boneCss, shoulderX, shoulderY, shoulderX + r * 0.45, shoulderY + r * 2.6)
  ctx.globalAlpha = 1
  ctx.restore()
}
function drawSkeletonBone(ctx, boneCss, x1, y1, x2, y2) {
  ctx.strokeStyle = boneCss
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x1, y1, 1.7, 0, Math.PI * 2)
  ctx.arc(x2, y2, 1.7, 0, Math.PI * 2)
  ctx.stroke()
}
