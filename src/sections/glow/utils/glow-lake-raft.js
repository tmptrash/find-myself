import { CFG } from '../../../cfg.js'
import { generateLogDetail, drawLogPlatform } from '../../touch/utils/log-platform.js'
import { GLOW_PAL, glowRgb, isGlowGrayWorld } from './glow-palette.js'
import { applyGlowFilmGrainToCanvas } from './glow-parallax-grain.js'

//
// Small log raft over the left lake (where the W log used to sit) — bobs with
// the same wave phase as the baked water surface.
//
const LAKE_RAFT_X_FRAC = 0.2
const LAKE_RAFT_W = 96
const LAKE_RAFT_PREDATOR_CLEAR_X = 28
const LAKE_RAFT_H = 12
//
// How many px of the log top stay above the water surface (rest is submerged).
//
const LAKE_RAFT_VISIBLE_ABOVE_SURFACE = 5
//
// Log sits under the lake fill (LAKE_Z = 12) so water hides its submerged
// part; glasses draw above the water so the lenses never get clipped.
//
const LAKE_RAFT_LOG_Z = 11.9
const LAKE_RAFT_GLASSES_Z = 12.35
//
// Invisible static collider that rides the wave with the log; the drop keeps
// the hero's feet on the bark instead of hovering above it.
//
const LAKE_RAFT_COLLIDER_W_FRAC = 0.9
const LAKE_RAFT_COLLIDER_H = 10
const LAKE_RAFT_COLLIDER_DROP_Y = 2
const LAKE_RAFT_COLLIDER_HIDE_X = -5000
const LAKE_RAFT_COLLIDER_HIDE_Y = -5000
//
// Standing band used by the lake checks (feet within this of the log top).
//
const LAKE_RAFT_STAND_X_SLACK = 6
const LAKE_RAFT_STAND_ABOVE = 14
const LAKE_RAFT_STAND_BELOW = 12
//
// Hero centre within this distance of the glasses centre picks them up.
//
const GLASSES_PICKUP_RADIUS = 34
//
// Lens bottoms rest a little into the log's top bark (sprite has a small
// transparent margin under the lens rims).
//
const GLASSES_SINK_INTO_LOG = 2
//
// Baked sprite id for the raft prop (round wire rims in three-quarter view).
//
export const GLOW_LAKE_RAFT_GLASSES_SPRITE = 'glow-lake-raft-glasses-v11'
const GLASSES_SPRITE_NAME = GLOW_LAKE_RAFT_GLASSES_SPRITE
const GLASSES_BAKE_SEED = 0x6c616b65
//
// Geometry is authored in reference-art units (traced from the concept
// image) and scaled down to world px when baked.
//
const GLASSES_ART_SCALE = 0.32
const GLASSES_ART_X0 = 4
const GLASSES_ART_Y0 = 6
const GLASSES_ART_W = 236
const GLASSES_ART_H = 90
const GLASSES_SPRITE_W = Math.ceil(GLASSES_ART_W * GLASSES_ART_SCALE)
const GLASSES_SPRITE_H = Math.ceil(GLASSES_ART_H * GLASSES_ART_SCALE)
//
// Wire stroke: black outer line with a dark core, like the inked reference.
//
const GLASSES_RIM_W = 5.5
const GLASSES_TEMPLE_W = 4
const GLASSES_CORE_FRAC = 0.4
const GLASSES_GLINT_WIDE_W = 5
const GLASSES_GLINT_THIN_W = 1.8
const GLASSES_GLINT_THIN_ALPHA = 0.75
//
// Near lens sits lower-left; far lens upper-right, a touch narrower.
//
const GLASSES_NEAR_LENS = { x: 137, y: 65, rx: 21, ry: 23.5 }
const GLASSES_FAR_LENS = { x: 202, y: 52, rx: 20, ry: 24 }
const GLASSES_BRIDGE = { x1: 158, y1: 54, cx: 170, cy: 41, x2: 182, y2: 50 }
const GLASSES_HINGE_NUB = { x1: 222, y1: 44, x2: 228, y2: 43 }
//
// Temples: near one runs far left and bends down at the ear; far one runs
// over the top behind the lenses.
//
const GLASSES_NEAR_TEMPLE = [[117, 62], [20, 46], [11, 57]]
const GLASSES_FAR_TEMPLE = [[189, 37], [100, 14], [92, 28]]
//
// Two parallel lower-left → upper-right glints per lens: a wide band plus a
// thin streak beside it.
//
const GLASSES_NEAR_GLINTS = [
  { x1: 127, y1: 84, x2: 152, y2: 50, w: GLASSES_GLINT_WIDE_W, alpha: 1 },
  { x1: 140, y1: 86, x2: 160, y2: 58, w: GLASSES_GLINT_THIN_W, alpha: GLASSES_GLINT_THIN_ALPHA }
]
const GLASSES_FAR_GLINTS = [
  { x1: 191, y1: 72, x2: 215, y2: 33, w: GLASSES_GLINT_WIDE_W, alpha: 1 },
  { x1: 203, y1: 74, x2: 220, y2: 46, w: GLASSES_GLINT_THIN_W, alpha: GLASSES_GLINT_THIN_ALPHA }
]
//
// Same wood tones as letter logs on level0 (gray-lit vs colour world).
//
const LOG_TREE_LIT_COLORS = {
  bark: GLOW_PAL.treeLit.branch,
  barkLight: GLOW_PAL.treeLit.trunk,
  barkDark: GLOW_PAL.treeLit.root,
  ring: GLOW_PAL.treeLit.trunk,
  ringDark: GLOW_PAL.glowContour.platform,
  core: GLOW_PAL.treeLit.branch,
  shadow: GLOW_PAL.void
}
const LOG_TREE_COLOR_COLORS = {
  bark: GLOW_PAL.treeColor.root,
  barkLight: GLOW_PAL.treeColor.branch,
  barkDark: GLOW_PAL.treeColor.root,
  ring: GLOW_PAL.treeColor.trunk,
  ringDark: GLOW_PAL.glowContour.platform,
  core: GLOW_PAL.treeColor.branch,
  shadow: GLOW_PAL.void
}
const LOG_RAFT_GRAY_COLORS = {
  bark: GLOW_PAL.decorGray,
  barkLight: GLOW_PAL.decorGray,
  barkDark: GLOW_PAL.glowContour.platform,
  ring: GLOW_PAL.decorGray,
  ringDark: GLOW_PAL.glowContour.platform,
  core: GLOW_PAL.decorGray,
  shadow: GLOW_PAL.void
}

const logDetailCache = new Map()
const glassesSpriteReady = new WeakMap()

/**
 * World X for the lake raft (left lake, above the old W spot).
 * @param {number} lakeX1
 * @param {number} lakeX2
 * @returns {number}
 */
export function glowLakeRaftWorldX(lakeX1, lakeX2) {
  return lakeX1 + (lakeX2 - lakeX1) * LAKE_RAFT_X_FRAC
}

/**
 * Minimum centipede head X so the body stays on the lake, right of the glasses
 * log — not standing on the raft collider.
 * @param {Object} inst - Glow level inst
 * @returns {number|null}
 */
export function glowLakeRaftPredatorMinX(inst) {
  if (inst?.lakeRaftX == null) return null
  return inst.lakeRaftX + LAKE_RAFT_W * 0.5 + LAKE_RAFT_PREDATOR_CLEAR_X
}

/**
 * Registers the bobbing raft log (under the water), its standable collider
 * and the glasses lying on it (above the water).
 * @param {Object} k - Kaplay inst
 * @param {function(): Object|null} getLevelInst - Live glow level inst
 * @param {Object} hooks
 * @param {function(): boolean} hooks.isGlassesOnLog - True while the glasses still lie on the log
 * @param {function({ x: number, y: number }): void} hooks.onGlassesTouched - Hero touched the glasses (world centre)
 */
export function mountGlowLakeRaftLayer(k, getLevelInst, hooks) {
  const collider = k.add([
    k.rect(LAKE_RAFT_W * LAKE_RAFT_COLLIDER_W_FRAC, LAKE_RAFT_COLLIDER_H),
    k.pos(LAKE_RAFT_COLLIDER_HIDE_X, LAKE_RAFT_COLLIDER_HIDE_Y),
    k.anchor('top'),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName
  ])
  k.add([
    k.z(LAKE_RAFT_LOG_Z),
    {
      update() {
        onUpdateGlowLakeRaft(k, getLevelInst(), collider, hooks)
      },
      draw() {
        drawGlowLakeRaftLog(k, getLevelInst())
      }
    }
  ])
  k.add([
    k.z(LAKE_RAFT_GLASSES_Z),
    {
      draw() {
        hooks.isGlassesOnLog() && drawGlowLakeRaftGlasses(k, getLevelInst())
      }
    }
  ])
}

/**
 * True when the feet stand on the raft log (lake checks must not drown him).
 * @param {Object} inst - Glow level inst
 * @param {number} footX - Feet world X
 * @param {number} footY - Feet world Y
 * @returns {boolean}
 */
export function isOnGlowLakeRaft(inst, footX, footY) {
  const raftTop = lakeRaftTopY(inst)
  if (raftTop == null) return false
  const halfW = LAKE_RAFT_W * LAKE_RAFT_COLLIDER_W_FRAC * 0.5 + LAKE_RAFT_STAND_X_SLACK
  if (Math.abs(footX - inst.lakeRaftX) > halfW) return false
  return footY >= raftTop - LAKE_RAFT_STAND_ABOVE && footY <= raftTop + LAKE_RAFT_STAND_BELOW
}

/**
 * Draws the baked three-quarter glasses sprite centred at (cx, cy).
 * @param {Object} k - Kaplay inst
 * @param {number} cx - Centre X
 * @param {number} cy - Centre Y
 * @param {number} [scale=1] - Uniform scale
 * @param {number} [opacity=1] - Draw opacity
 */
export function drawGlowLakeGlassesSprite(k, cx, cy, scale = 1, opacity = 1) {
  ensureLakeRaftGlassesSprite(k)
  k.drawSprite({
    sprite: GLASSES_SPRITE_NAME,
    pos: k.vec2(cx, cy),
    anchor: 'center',
    scale: k.vec2(scale, scale),
    opacity
  })
}

/**
 * Baked glasses sprite size in px (slot hover zone / layout).
 * @returns {{ w: number, h: number }}
 */
export function glowLakeGlassesSpriteSize() {
  return { w: GLASSES_SPRITE_W, h: GLASSES_SPRITE_H }
}

/**
 * Draws the half-submerged raft log at the current wave height.
 * @param {Object} k - Kaplay inst
 * @param {Object|null} inst - Glow level inst
 */
export function drawGlowLakeRaftLog(k, inst) {
  const raftTop = lakeRaftTopY(inst)
  if (raftTop == null) return
  const raftCy = raftTop + LAKE_RAFT_H * 0.5
  const detail = getLakeRaftLogDetail(LAKE_RAFT_W, LAKE_RAFT_H)
  drawLogPlatform(k, LAKE_RAFT_W, LAKE_RAFT_H, inst.lakeRaftX, raftCy, 1, detail, lakeRaftLogColors(inst))
}

/**
 * Draws the glasses resting on the raft log (always full palette tones).
 * @param {Object} k - Kaplay inst
 * @param {Object|null} inst - Glow level inst
 */
export function drawGlowLakeRaftGlasses(k, inst) {
  const raftTop = lakeRaftTopY(inst)
  if (raftTop == null) return
  const center = lakeRaftGlassesCenter(inst, raftTop)
  drawGlowLakeGlassesSprite(k, center.x, center.y)
}

//
// Moves the collider with the wave (Kaplay carries a standing hero by the
// platform delta) and fires the pickup once the hero reaches the glasses.
//
function onUpdateGlowLakeRaft(k, inst, collider, hooks) {
  const raftTop = lakeRaftTopY(inst)
  if (raftTop == null) {
    collider.pos.x = LAKE_RAFT_COLLIDER_HIDE_X
    collider.pos.y = LAKE_RAFT_COLLIDER_HIDE_Y
    return
  }
  collider.pos.x = inst.lakeRaftX
  collider.pos.y = raftTop + LAKE_RAFT_COLLIDER_DROP_Y
  if (!hooks.isGlassesOnLog()) return
  const char = inst.heroInst?.character
  if (!char?.pos || inst.drowning) return
  const center = lakeRaftGlassesCenter(inst, raftTop)
  if (Math.hypot(char.pos.x - center.x, char.pos.y - center.y) > GLASSES_PICKUP_RADIUS) return
  hooks.onGlassesTouched(center)
}

function lakeRaftGlassesCenter(inst, raftTop) {
  return {
    x: inst.lakeRaftX,
    y: raftTop + GLASSES_SINK_INTO_LOG - GLASSES_SPRITE_H * 0.5
  }
}

//
// Top of the log in world space, or null while the lake is still closed.
//
function lakeRaftTopY(inst) {
  if (!inst?.zones?.secondEyeCollected) return null
  if (!inst?.zones?.water) return null
  if (inst.lakeX1 == null || inst.lakeX2 == null) return null
  if (typeof inst.lakeSurfaceAt !== 'function') return null
  inst.lakeRaftX ??= glowLakeRaftWorldX(inst.lakeX1, inst.lakeX2)
  return inst.lakeSurfaceAt(inst.lakeRaftX) - LAKE_RAFT_VISIBLE_ABOVE_SURFACE
}

function lakeRaftLogColors(inst) {
  if (isGlowGrayWorld(inst.zones)) return LOG_RAFT_GRAY_COLORS
  const fade = inst.colorFade ?? (inst.zones?.colorWorld ? 1 : 0)
  return fade > 0.5 ? LOG_TREE_COLOR_COLORS : LOG_TREE_LIT_COLORS
}

function getLakeRaftLogDetail(w, h) {
  const key = `${w}|${h}`
  if (!logDetailCache.has(key)) {
    logDetailCache.set(key, generateLogDetail(w, h, false))
  }
  return logDetailCache.get(key)
}

function ensureLakeRaftGlassesSprite(k) {
  if (glassesSpriteReady.get(k)) return
  const canvas = document.createElement('canvas')
  canvas.width = GLASSES_SPRITE_W
  canvas.height = GLASSES_SPRITE_H
  drawGlowLakeGlassesArt(canvas.getContext('2d'))
  applyGlowFilmGrainToCanvas(canvas, GLASSES_BAKE_SEED)
  k.loadSprite(GLASSES_SPRITE_NAME, canvas)
  glassesSpriteReady.set(k, true)
}

//
// Back-to-front: far temple, far lens, hinge + bridge, near lens, near temple.
//
function drawGlowLakeGlassesArt(ctx) {
  const pal = GLOW_PAL.lakeGlasses
  const tones = {
    ink: cssRgb(CFG.visual.colors.outline),
    core: cssRgb(pal.rim),
    lens: cssRgb(pal.lens),
    glint: cssRgb(pal.glint)
  }
  ctx.scale(GLASSES_ART_SCALE, GLASSES_ART_SCALE)
  ctx.translate(-GLASSES_ART_X0, -GLASSES_ART_Y0)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  strokeGlassesWire(ctx, tones, GLASSES_TEMPLE_W, () => traceGlassesPolyline(ctx, GLASSES_FAR_TEMPLE))
  drawGlassesLens(ctx, tones, GLASSES_FAR_LENS, GLASSES_FAR_GLINTS)
  strokeGlassesWire(ctx, tones, GLASSES_TEMPLE_W, () => {
    ctx.moveTo(GLASSES_HINGE_NUB.x1, GLASSES_HINGE_NUB.y1)
    ctx.lineTo(GLASSES_HINGE_NUB.x2, GLASSES_HINGE_NUB.y2)
  })
  strokeGlassesWire(ctx, tones, GLASSES_TEMPLE_W, () => {
    const b = GLASSES_BRIDGE
    ctx.moveTo(b.x1, b.y1)
    ctx.quadraticCurveTo(b.cx, b.cy, b.x2, b.y2)
  })
  drawGlassesLens(ctx, tones, GLASSES_NEAR_LENS, GLASSES_NEAR_GLINTS)
  strokeGlassesWire(ctx, tones, GLASSES_TEMPLE_W, () => traceGlassesPolyline(ctx, GLASSES_NEAR_TEMPLE))
}

//
// Light lens fill, glints clipped to the glass, then the inked wire rim.
//
function drawGlassesLens(ctx, tones, lens, glints) {
  ctx.fillStyle = tones.lens
  ctx.beginPath()
  ctx.ellipse(lens.x, lens.y, lens.rx, lens.ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  ctx.clip()
  ctx.strokeStyle = tones.glint
  glints.forEach(g => {
    ctx.globalAlpha = g.alpha
    ctx.lineWidth = g.w
    ctx.beginPath()
    ctx.moveTo(g.x1, g.y1)
    ctx.lineTo(g.x2, g.y2)
    ctx.stroke()
  })
  ctx.restore()
  strokeGlassesWire(ctx, tones, GLASSES_RIM_W, () => {
    ctx.ellipse(lens.x, lens.y, lens.rx, lens.ry, 0, 0, Math.PI * 2)
  })
}

//
// Strokes the same path twice: black outer wire, then a thinner dark core.
//
function strokeGlassesWire(ctx, tones, width, tracePath) {
  ctx.strokeStyle = tones.ink
  ctx.lineWidth = width
  ctx.beginPath()
  tracePath()
  ctx.stroke()
  ctx.strokeStyle = tones.core
  ctx.lineWidth = width * GLASSES_CORE_FRAC
  ctx.beginPath()
  tracePath()
  ctx.stroke()
}

function traceGlassesPolyline(ctx, pts) {
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
}

function cssRgb(hex) {
  const c = glowRgb(hex)
  return `rgb(${c.r}, ${c.g}, ${c.b})`
}
