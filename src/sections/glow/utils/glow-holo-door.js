import { CFG } from '../../../cfg.js'
import { GLOW_PAL, glowRgb } from './glow-palette.js'
import * as HoloFx from './glow-holo-fx.js'
import { applyGlowFilmGrainToCanvas } from './glow-parallax-grain.js'
import {
  buildOrganicTreeData,
  buildTreePalette,
  dimOrganicTreeColors,
  drawOrganicTreeToCanvas
} from '../../touch/utils/organic-parallax-tree.js'

//
// Hologram sits over the whole playfield but under the HUD (glasses slot).
//
const HOLO_DOOR_Z = CFG.visual.zIndex.ui - 1
//
// Portal arch in screen px: inner opening, the dim pillar band around it and
// the layered glow strokes (width, alpha) that fake a soft bloom.
//
const DOOR_W = 56
const DOOR_H = 86
const DOOR_R = DOOR_W / 2
const DOOR_SIDE_H = DOOR_H - DOOR_R
const DOOR_BAND = 9
const ARCH_GLOW_PAD = 10
const ARCH_BOTTOM_PAD = 2
const ARCH_SPRITE_W = DOOR_W + (DOOR_BAND + ARCH_GLOW_PAD) * 2
const ARCH_SPRITE_H = DOOR_H + DOOR_BAND + ARCH_GLOW_PAD + ARCH_BOTTOM_PAD
const ARCH_INNER_GLOW = [[14, 0.08], [10, 0.12], [6, 0.2], [4, 0.32]]
const ARCH_OUTER_GLOW = [[6, 0.1], [3, 0.2]]
const ARCH_BAND_ALPHA = 0.32
const ARCH_BAND_DASH_STEP = 3
const ARCH_BAND_DASH_ALPHA = 0.45
const ARCH_BAND_DOT_DASH = [1, 3]
const ARCH_CORE_EDGE_W = 2
const ARCH_CORE_HOT_W = 1
const ARCH_CORE_HOT_ALPHA = 0.9
const ARCH_OUTER_EDGE_ALPHA = 0.5
//
// Projection field behind the arch: broken dashed rows fading out radially,
// a dotted spine above the arch, side rails and dotted reflections below.
//
const FIELD_W = 176
const FIELD_ABOVE = DOOR_H + DOOR_BAND + 34
const FIELD_BELOW = 40
const FIELD_H = FIELD_ABOVE + FIELD_BELOW
const FIELD_ROW_STEP = 6
const FIELD_DASH_MIN = 2
const FIELD_DASH_MAX = 12
const FIELD_GAP_MIN = 2
const FIELD_GAP_MAX = 10
const FIELD_ROW_ALPHA = 0.8
const FIELD_ROW_FADE_FLOOR = 0.35
const FIELD_SPARK_CHANCE = 0.15
const FIELD_HOT_CHANCE = 0.03
const FIELD_DOT_STEP = 3
const FIELD_SPINE_ALPHA = 0.7
const FIELD_RAIL_GAP = 14
const FIELD_RAIL_TOP = 20
const FIELD_RAIL_ALPHA = 0.35
const FIELD_REFLECT_STEP = 7
const FIELD_REFLECT_ALPHA = 0.5
const FIELD_OPACITY = 1
//
// Light pool on the ground at the arch foot: soft ellipse + bright ring.
//
const POOL_W = 120
const POOL_H = 30
const POOL_SQUASH = POOL_H / POOL_W
const POOL_GLOW_STOPS = [[0, 0.55], [0.5, 0.2], [1, 0]]
const POOL_RING_RX = DOOR_R * 1.1
const POOL_RING_RY = 3.5
const POOL_RING_W = 1.2
const POOL_CORE_RX = DOOR_R * 0.7
const POOL_CORE_RY = 2
const POOL_CORE_ALPHA = 0.5
//
// Touch level 0 seen through the arch: far circle trees + clouds, mid
// organic silhouettes, near big tree on grass. Each layer drifts on its own.
//
const VIEW_LAYER_W = 96
const VIEW_LAYER_H = DOOR_H
const VIEW_LAYER_COUNT = 3
const VIEW_ATLAS_H = VIEW_LAYER_H * VIEW_LAYER_COUNT
const VIEW_LAYER_ALPHA = [0.85, 0.8, 0.95]
const VIEW_DRIFT_AMP = [3, 6, 9]
const VIEW_DRIFT_FREQ = [0.35, 0.5, 0.7]
const VIEW_DRIFT_PHASE = 1.7
const VIEW_GRADE_GAIN = [0.9, 1.25, 1.7]
const VIEW_GRADE_GAMMA = 1.6
const VIEW_INTERLACE_ALPHA = 0.7
const VIEW_SLICE_STRAIGHT = 8
const VIEW_SLICE_ARCH = 2
const VIEW_CLIP_INSET = 1
const VIEW_GROUND_H = 14
const VIEW_CLOUD_COUNT = 6
const VIEW_CLOUD_Y_MIN = 14
const VIEW_CLOUD_Y_MAX = 32
const VIEW_CLOUD_R_MIN = 6
const VIEW_CLOUD_R_MAX = 12
const VIEW_CLOUD_ALPHA = 0.5
const VIEW_FAR_TREE_COUNT = 7
const VIEW_FAR_BASE_UP = 22
const VIEW_FAR_TRUNK_W = 2
const VIEW_FAR_TRUNK_MIN = 14
const VIEW_FAR_TRUNK_MAX = 22
const VIEW_FAR_CROWN_MIN = 6
const VIEW_FAR_CROWN_MAX = 10
const VIEW_FAR_LOBE_DX = 0.6
const VIEW_FAR_LOBE_DY = 0.4
const VIEW_FAR_LOBE_R = 0.7
const VIEW_MID_TREE_XS = [14, 48, 84]
const VIEW_MID_TREE_H_MIN = 48
const VIEW_MID_TREE_H_MAX = 62
const VIEW_MID_BASE_UP = 16
const VIEW_MID_DIM = 0.75
const VIEW_NEAR_TREE_X = VIEW_LAYER_W / 2 - 6
const VIEW_NEAR_TREE_H = VIEW_LAYER_H * 0.9
const VIEW_NEAR_BASE_UP = VIEW_GROUND_H - 1
const VIEW_TREE_TRUNK_H = 60
const VIEW_GRASS_STEP = 5
const VIEW_GRASS_MIN = 2
const VIEW_GRASS_MAX = 6
const VIEW_ROCK_X = 74
const VIEW_ROCK_RX = 7
const VIEW_ROCK_RY = 4
//
// Analog projection over the opening: drifting scanlines, a slow roll bar,
// a chroma ghost of the arch and horizontal tears while the lamp stutters.
//
const MOUTH_ALPHA = 0.6
const SCAN_STEP = 4
const SCAN_SPEED = 18
const SCAN_ALPHA = 0.14
const ROLL_PERIOD = 2.6
const ROLL_BAND_H = 6
const ROLL_ALPHA = 0.3
const GHOST_OFFSET_PX = 2
const GHOST_ALPHA = 0.3
const TEAR_H_MIN = 6
const TEAR_H_MAX = 14
const TEAR_DX = 4
//
// Rising sparks from the light pool.
//
const SPARK_SPAWN_PER_SEC = 9
const SPARK_SPREAD = DOOR_R + DOOR_BAND + 10
//
// Lamp stutter jitters the whole hologram sideways by a pixel or two.
//
const LAMP_GLITCH_PX = 2
const FADE_SPEED = 4
//
// Pinned on screen: the portal stays at the bottom-left corner and the
// arrow fades in as the real portal slides off the left edge.
//
const PIN_BOTTOM_PAD = 6
const ARROW_SPACE = 52
const ARROW_GAP = 10
const ARROW_W = 34
const ARROW_HEAD_W = 14
const ARROW_HEAD_HALF_H = 11
const ARROW_SHAFT_HALF_H = 4
const ARROW_SWING_PX = 7
const ARROW_SWING_FREQ = 5
const ARROW_FADE_PX = 60
const ARROW_GLOW_W = 5
const ARROW_GLOW_ALPHA = 0.2
const ARROW_EDGE_W = 2
const ARROW_FILL_ALPHA = 0.35
//
// Baked sprites, regenerated once per live Kaplay instance.
//
const SPRITE_ARCH = 'glow-holo-door-arch'
const SPRITE_FIELD = 'glow-holo-door-field'
const SPRITE_POOL = 'glow-holo-door-pool'
const SPRITE_VIEW = 'glow-holo-door-view'
const GRAIN_SEED_ARCH = 7101
const GRAIN_SEED_FIELD = 7203
const GRAIN_SEED_POOL = 7307
const GRAIN_SEED_VIEW = 7411
const VIEW_GRAIN_STRENGTH = 0.6
const LUMA_R = 0.299
const LUMA_G = 0.587
const LUMA_B = 0.114
const BYTE_MAX = 255
const bakedFor = new WeakMap()

/**
 * Creates the hologram portal: a flickering analog projection of an arch at
 * the bottom-left of the level (under the lake) with a slowly drifting view
 * of Touch level 0 inside. Shown only while the hero wears the glasses. When
 * the camera hides that corner, the portal is pinned to the screen's
 * bottom-left with a swinging arrow pointing towards it.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.worldX - Portal bottom-centre X in world px
 * @param {number} cfg.worldY - Portal bottom Y in world px
 * @param {function(): boolean} cfg.isVisible - True while the glasses are worn
 * @param {function(): number} cfg.getScreenLeft - Playfield left edge in screen px
 * @param {function(): number} cfg.getScreenBottom - Playfield bottom edge in screen px
 * @returns {Object} Holo door inst
 */
export function create(cfg) {
  const { k } = cfg
  const pal = GLOW_PAL.holoDoor
  ensureHoloDoorSprites(k)
  const inst = {
    k,
    worldX: cfg.worldX,
    worldY: cfg.worldY,
    isVisible: cfg.isVisible,
    getScreenLeft: cfg.getScreenLeft,
    getScreenBottom: cfg.getScreenBottom,
    tones: {
      mouth: HoloFx.paletteColor(k, pal.mouth),
      edge: HoloFx.paletteColor(k, pal.edge),
      glow: HoloFx.paletteColor(k, pal.glow),
      spark: HoloFx.paletteColor(k, pal.spark),
      core: HoloFx.paletteColor(k, pal.core)
    },
    mouthPts: archPoints(k, DOOR_R, DOOR_H),
    fade: 0,
    time: 0,
    sparks: HoloFx.createSparks(),
    tear: null,
    lamp: HoloFx.createLamp()
  }
  k.add([
    k.fixed(),
    k.z(HOLO_DOOR_Z),
    {
      update() {
        onUpdate(inst)
      },
      draw() {
        onDraw(inst)
      }
    }
  ])
  return inst
}

/**
 * World point the hero should look at while wearing the glasses (arch centre).
 * @param {Object|null} doorInst - Holo door inst from create()
 * @returns {{ x: number, y: number }|null}
 */
export function portalLookWorldPos(doorInst) {
  if (!doorInst) return null
  return {
    x: doorInst.worldX,
    y: doorInst.worldY - DOOR_H / 2
  }
}

//
// Fades with the glasses, ticks the faulty lamp, tears and sparks.
//
function onUpdate(inst) {
  const dt = inst.k.dt()
  const visible = inst.isVisible()
  visible && inst.fade === 0 && HoloFx.startLampBurst(inst.lamp, inst.k, false)
  inst.fade = visible
    ? Math.min(1, inst.fade + dt * FADE_SPEED)
    : Math.max(0, inst.fade - dt * FADE_SPEED)
  if (inst.fade === 0) {
    inst.sparks = HoloFx.createSparks()
    return
  }
  inst.time += dt
  HoloFx.updateLamp(inst.lamp, inst.k, dt)
  updateTear(inst)
  HoloFx.updateSparks(inst.sparks, inst.k, dt, SPARK_SPREAD, SPARK_SPAWN_PER_SEC)
}

//
// A stuttering lamp also tears one horizontal band of the picture sideways.
//
function updateTear(inst) {
  const k = inst.k
  if (!HoloFx.isLampBursting(inst.lamp)) {
    inst.tear = null
    return
  }
  const h = k.rand(TEAR_H_MIN, TEAR_H_MAX)
  const from = k.rand(0, DOOR_H - h)
  inst.tear = { from, to: from + h, dx: k.rand(-TEAR_DX, TEAR_DX) }
}

//
// Screen pass, back to front: field, dark opening, Touch view, scanlines,
// arch (+ chroma ghost), light pool, sparks, then the arrow when pinned.
//
function onDraw(inst) {
  if (inst.fade === 0 || !hasHoloDoorSprites(inst.k)) return
  const k = inst.k
  const op = inst.fade * HoloFx.lampLevel(inst.lamp, inst.time)
  const raw = k.toScreen(k.vec2(inst.worldX, inst.worldY))
  const minX = inst.getScreenLeft() + ARROW_SPACE + DOOR_R + DOOR_BAND
  const glitch = HoloFx.isLampBursting(inst.lamp) ? k.rand(-LAMP_GLITCH_PX, LAMP_GLITCH_PX) : 0
  const x = Math.max(raw.x, minX) + glitch
  const y = Math.min(raw.y, inst.getScreenBottom() - PIN_BOTTOM_PAD)
  drawBakedAt(k, SPRITE_FIELD, x - FIELD_W / 2, y - FIELD_ABOVE, op * FIELD_OPACITY)
  k.drawPolygon({
    pts: inst.mouthPts.map(p => k.vec2(x + p.x, y + p.y)),
    color: inst.tones.mouth,
    opacity: op * MOUTH_ALPHA
  })
  drawTouchView(inst, x, y, op)
  drawScanlines(inst, x, y, op)
  const archX = x - ARCH_SPRITE_W / 2
  const archY = y - ARCH_SPRITE_H + ARCH_BOTTOM_PAD
  drawBakedAt(k, SPRITE_ARCH, archX + GHOST_OFFSET_PX, archY, op * GHOST_ALPHA)
  drawBakedAt(k, SPRITE_ARCH, archX, archY, op)
  drawBakedAt(k, SPRITE_POOL, x - POOL_W / 2, y - POOL_H / 2, op)
  HoloFx.drawSparks(k, inst.sparks, x, y, op, inst.tones)
  const arrowOp = Math.min(1, Math.max(0, (minX - raw.x) / ARROW_FADE_PX))
  arrowOp > 0 && drawArrow(inst, x, y, op * arrowOp)
}

function hasHoloDoorSprites(k) {
  return Boolean(k.getSprite(SPRITE_VIEW) && k.getSprite(SPRITE_ARCH))
}

function drawBakedAt(k, sprite, x, y, opacity) {
  k.drawSprite({ sprite, pos: k.vec2(x, y), anchor: 'topleft', opacity })
}

//
// The Touch view is clipped to the arch with horizontal slices: one quad per
// band of the straight part, thin rows under the round top.
//
function drawTouchView(inst, x, y, op) {
  for (let layer = 0; layer < VIEW_LAYER_COUNT; layer++) {
    const drift = Math.sin(inst.time * VIEW_DRIFT_FREQ[layer] + layer * VIEW_DRIFT_PHASE) * VIEW_DRIFT_AMP[layer]
    const windowLeft = (VIEW_LAYER_W - DOOR_W) / 2 + drift
    let h = 0
    while (h < DOOR_H) {
      const sliceH = Math.min(h < DOOR_SIDE_H ? VIEW_SLICE_STRAIGHT : VIEW_SLICE_ARCH, DOOR_H - h)
      drawViewSlice(inst, x, y, layer, windowLeft, h, sliceH, op)
      h += sliceH
    }
  }
}

function drawViewSlice(inst, x, y, layer, windowLeft, h, sliceH, op) {
  const k = inst.k
  const half = archHalfWidth(DOOR_R - VIEW_CLIP_INSET, DOOR_H - VIEW_CLIP_INSET, h + sliceH / 2)
  if (half < 1) return
  const tear = inst.tear
  const dx = tear && h + sliceH > tear.from && h < tear.to ? tear.dx : 0
  const srcX = windowLeft + DOOR_R - half
  const srcY = layer * VIEW_LAYER_H + VIEW_LAYER_H - h - sliceH
  k.drawSprite({
    sprite: SPRITE_VIEW,
    pos: k.vec2(x - half + dx, y - h - sliceH),
    width: half * 2,
    height: sliceH,
    quad: {
      x: srcX / VIEW_LAYER_W,
      y: srcY / VIEW_ATLAS_H,
      w: (half * 2) / VIEW_LAYER_W,
      h: sliceH / VIEW_ATLAS_H
    },
    anchor: 'topleft',
    opacity: op * VIEW_LAYER_ALPHA[layer]
  })
}

//
// Drifting scanlines clipped to the arch, plus a brighter roll bar that
// climbs through the opening like a slipping analog frame.
//
function drawScanlines(inst, x, y, op) {
  const k = inst.k
  const shift = (inst.time * SCAN_SPEED) % SCAN_STEP
  const rollY = DOOR_H * (1 - (inst.time % ROLL_PERIOD) / ROLL_PERIOD)
  for (let h = shift; h < DOOR_H; h += SCAN_STEP) {
    const half = archHalfWidth(DOOR_R, DOOR_H, h)
    const roll = Math.abs(h - rollY) < ROLL_BAND_H ? ROLL_ALPHA : 0
    k.drawLine({
      p1: k.vec2(x - half, y - h),
      p2: k.vec2(x + half, y - h),
      width: 1,
      color: inst.tones.spark,
      opacity: op * (SCAN_ALPHA + roll)
    })
  }
}

//
// Left-pointing arrow (head triangle + shaft) swinging left-right, with the
// same glow-then-core edge as the arch.
//
function drawArrow(inst, doorX, doorY, op) {
  const k = inst.k
  const { tones } = inst
  const swing = Math.sin(inst.time * ARROW_SWING_FREQ) * ARROW_SWING_PX
  const right = doorX - DOOR_R - DOOR_BAND - ARROW_GAP + swing
  const left = right - ARROW_W
  const neck = left + ARROW_HEAD_W
  const cy = doorY - DOOR_H / 2
  const outline = [
    k.vec2(left, cy),
    k.vec2(neck, cy - ARROW_HEAD_HALF_H),
    k.vec2(neck, cy - ARROW_SHAFT_HALF_H),
    k.vec2(right, cy - ARROW_SHAFT_HALF_H),
    k.vec2(right, cy + ARROW_SHAFT_HALF_H),
    k.vec2(neck, cy + ARROW_SHAFT_HALF_H),
    k.vec2(neck, cy + ARROW_HEAD_HALF_H)
  ]
  k.drawPolygon({
    pts: [outline[0], outline[1], outline[6]],
    color: tones.glow,
    opacity: op * ARROW_FILL_ALPHA
  })
  k.drawRect({
    pos: k.vec2(neck, cy - ARROW_SHAFT_HALF_H),
    width: right - neck,
    height: ARROW_SHAFT_HALF_H * 2,
    color: tones.glow,
    opacity: op * ARROW_FILL_ALPHA
  })
  drawClosedLine(k, outline, ARROW_GLOW_W, tones.glow, op * ARROW_GLOW_ALPHA)
  drawClosedLine(k, outline.map(p => k.vec2(p.x + GHOST_OFFSET_PX, p.y)), ARROW_EDGE_W, tones.edge, op * GHOST_ALPHA)
  drawClosedLine(k, outline, ARROW_EDGE_W, tones.edge, op)
}

function drawClosedLine(k, pts, width, color, opacity) {
  k.drawLines({ pts: [...pts, pts[0]], width, color, opacity })
}

//
// Arch polygon relative to the bottom centre (y up is negative).
//
function archPoints(k, r, h) {
  const sideH = h - r
  const steps = Math.ceil(r)
  const pts = [k.vec2(-r, 0), k.vec2(-r, -sideH)]
  for (let i = 1; i < steps; i++) {
    const a = Math.PI - Math.PI * i / steps
    pts.push(k.vec2(Math.cos(a) * r, -sideH - Math.sin(a) * r))
  }
  pts.push(k.vec2(r, -sideH), k.vec2(r, 0))
  return pts
}

function archHalfWidth(r, h, fromBottom) {
  const sideH = h - r
  if (fromBottom <= sideH) return r
  const dy = fromBottom - sideH
  return Math.sqrt(Math.max(0, r * r - dy * dy))
}

//
// Bakes (once per live Kaplay instance) every static portal layer.
//
function ensureHoloDoorSprites(k) {
  if (bakedFor.get(k)) return
  bakedFor.set(k, true)
  k.loadSprite(SPRITE_ARCH, bakeGrained(bakeArchCanvas(), GRAIN_SEED_ARCH))
  k.loadSprite(SPRITE_FIELD, bakeGrained(bakeFieldCanvas(), GRAIN_SEED_FIELD))
  k.loadSprite(SPRITE_POOL, bakeGrained(bakePoolCanvas(), GRAIN_SEED_POOL))
  const view = bakeTouchViewCanvas()
  applyGlowFilmGrainToCanvas(view, GRAIN_SEED_VIEW, { strengthScale: VIEW_GRAIN_STRENGTH })
  k.loadSprite(SPRITE_VIEW, view)
}

function bakeGrained(canvas, seed) {
  applyGlowFilmGrainToCanvas(canvas, seed)
  return canvas
}

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w)
  canvas.height = Math.ceil(h)
  return canvas
}

function traceArch(ctx, cx, baseY, half, h) {
  ctx.moveTo(cx - half, baseY)
  ctx.lineTo(cx - half, baseY - (h - half))
  ctx.arc(cx, baseY - (h - half), half, Math.PI, 0)
  ctx.lineTo(cx + half, baseY)
}

function strokeArch(ctx, cx, baseY, half, h, width, style) {
  ctx.beginPath()
  traceArch(ctx, cx, baseY, half, h)
  ctx.lineWidth = width
  ctx.strokeStyle = style
  ctx.stroke()
}

//
// Arch: layered bloom strokes, a dim dashed pillar band with a dotted spine,
// a thin outer edge and the bright core line of the opening.
//
function bakeArchCanvas() {
  const pal = GLOW_PAL.holoDoor
  const canvas = makeCanvas(ARCH_SPRITE_W, ARCH_SPRITE_H)
  const ctx = canvas.getContext('2d')
  const cx = ARCH_SPRITE_W / 2
  const baseY = ARCH_SPRITE_H - ARCH_BOTTOM_PAD
  const outerHalf = DOOR_R + DOOR_BAND
  const outerH = DOOR_H + DOOR_BAND
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ARCH_OUTER_GLOW.forEach(([w, a]) => strokeArch(ctx, cx, baseY, outerHalf, outerH, w, HoloFx.cssColor(pal.field, a)))
  ctx.save()
  ctx.beginPath()
  traceArch(ctx, cx, baseY, outerHalf, outerH)
  ctx.closePath()
  traceArch(ctx, cx, baseY, DOOR_R, DOOR_H)
  ctx.closePath()
  ctx.fillStyle = HoloFx.cssColor(pal.band, ARCH_BAND_ALPHA)
  ctx.fill('evenodd')
  ctx.clip('evenodd')
  for (let y = baseY - outerH; y < baseY; y += ARCH_BAND_DASH_STEP) {
    ctx.fillStyle = HoloFx.cssColor(pal.glow, ARCH_BAND_DASH_ALPHA * Math.random())
    ctx.fillRect(cx - outerHalf, Math.round(y), outerHalf * 2, 1)
  }
  ctx.setLineDash(ARCH_BAND_DOT_DASH)
  strokeArch(ctx, cx, baseY, DOOR_R + DOOR_BAND / 2, DOOR_H + DOOR_BAND / 2, 1, HoloFx.cssColor(pal.spark, 1))
  ctx.restore()
  strokeArch(ctx, cx, baseY, outerHalf, outerH, 1, HoloFx.cssColor(pal.field, ARCH_OUTER_EDGE_ALPHA))
  ARCH_INNER_GLOW.forEach(([w, a]) => strokeArch(ctx, cx, baseY, DOOR_R, DOOR_H, w, HoloFx.cssColor(pal.glow, a)))
  strokeArch(ctx, cx, baseY, DOOR_R, DOOR_H, ARCH_CORE_EDGE_W, HoloFx.cssColor(pal.edge, 1))
  strokeArch(ctx, cx, baseY, DOOR_R, DOOR_H, ARCH_CORE_HOT_W, HoloFx.cssColor(pal.core, ARCH_CORE_HOT_ALPHA))
  return canvas
}

//
// Projection field: broken dashed rows (skipping the arch), spine, rails
// and dotted reflections under the ground line.
//
function bakeFieldCanvas() {
  const pal = GLOW_PAL.holoDoor
  const canvas = makeCanvas(FIELD_W, FIELD_H)
  const ctx = canvas.getContext('2d')
  const cx = FIELD_W / 2
  const outerHalf = DOOR_R + DOOR_BAND
  const outerH = DOOR_H + DOOR_BAND
  for (let y = FIELD_ROW_STEP; y < FIELD_ABOVE; y += FIELD_ROW_STEP) {
    const fromBottom = FIELD_ABOVE - y
    const skipHalf = fromBottom < outerH ? archHalfWidth(outerHalf, outerH, fromBottom) : -1
    const rowFade = Math.min(1, fromBottom / FIELD_ABOVE + FIELD_ROW_FADE_FLOOR)
    let x = Math.random() * FIELD_GAP_MAX
    while (x < FIELD_W) {
      const len = FIELD_DASH_MIN + Math.random() * (FIELD_DASH_MAX - FIELD_DASH_MIN)
      const mid = x + len / 2 - cx
      const radial = Math.max(0, 1 - Math.pow(Math.abs(mid) / cx, 2))
      Math.abs(mid) > skipHalf && fillFieldDash(ctx, pal, x, y, len, radial * rowFade * FIELD_ROW_ALPHA)
      x += len + FIELD_GAP_MIN + Math.random() * (FIELD_GAP_MAX - FIELD_GAP_MIN)
    }
  }
  const archTop = FIELD_ABOVE - outerH
  drawDottedColumn(ctx, HoloFx.cssColor(pal.spark, FIELD_SPINE_ALPHA), cx, 0, archTop - FIELD_DOT_STEP)
  const railDx = outerHalf + FIELD_RAIL_GAP
  drawDottedColumn(ctx, HoloFx.cssColor(pal.field, FIELD_RAIL_ALPHA), cx - railDx, archTop + FIELD_RAIL_TOP, FIELD_ABOVE)
  drawDottedColumn(ctx, HoloFx.cssColor(pal.field, FIELD_RAIL_ALPHA), cx + railDx, archTop + FIELD_RAIL_TOP, FIELD_ABOVE)
  for (let dx = -DOOR_R; dx <= DOOR_R; dx += FIELD_REFLECT_STEP) {
    for (let y = FIELD_ABOVE + FIELD_DOT_STEP; y < FIELD_H; y += FIELD_DOT_STEP) {
      const fade = 1 - (y - FIELD_ABOVE) / FIELD_BELOW
      ctx.fillStyle = HoloFx.cssColor(pal.glow, FIELD_REFLECT_ALPHA * fade * Math.random())
      ctx.fillRect(Math.round(cx + dx), y, 1, 1)
    }
  }
  return canvas
}

function fillFieldDash(ctx, pal, x, y, len, alpha) {
  if (alpha <= 0) return
  const roll = Math.random()
  const hot = roll < FIELD_HOT_CHANCE
  const spark = roll < FIELD_SPARK_CHANCE
  ctx.fillStyle = HoloFx.cssColor(hot ? pal.edge : (spark ? pal.spark : pal.field), alpha)
  ctx.fillRect(Math.round(x), y, hot ? 1 : Math.round(len), 1)
}

function drawDottedColumn(ctx, style, x, y0, y1) {
  ctx.fillStyle = style
  for (let y = y0; y < y1; y += FIELD_DOT_STEP) {
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1)
  }
}

//
// Light pool: one palette colour with an alpha-only radial falloff, then a
// bright ring and a hot core ellipse at the arch foot.
//
function bakePoolCanvas() {
  const pal = GLOW_PAL.holoDoor
  const canvas = makeCanvas(POOL_W, POOL_H)
  const ctx = canvas.getContext('2d')
  const cx = POOL_W / 2
  const cy = POOL_H / 2
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(1, POOL_SQUASH)
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, cx)
  POOL_GLOW_STOPS.forEach(([at, a]) => grad.addColorStop(at, HoloFx.cssColor(pal.glow, a)))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(0, 0, cx, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = HoloFx.cssColor(pal.edge, POOL_CORE_ALPHA)
  ctx.beginPath()
  ctx.ellipse(cx, cy, POOL_CORE_RX, POOL_CORE_RY, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = HoloFx.cssColor(pal.edge, 1)
  ctx.lineWidth = POOL_RING_W
  ctx.beginPath()
  ctx.ellipse(cx, cy, POOL_RING_RX, POOL_RING_RY, 0, 0, Math.PI * 2)
  ctx.stroke()
  return canvas
}

//
// Touch level 0 in miniature, three stacked layers (far / mid / near) in one
// atlas, every pixel regraded to the hologram ramp with baked interlace.
//
function bakeTouchViewCanvas() {
  const atlas = makeCanvas(VIEW_LAYER_W, VIEW_ATLAS_H)
  const ctx = atlas.getContext('2d')
  const layers = [bakeViewFarLayer(), bakeViewMidLayer(), bakeViewNearLayer()]
  layers.forEach((layer, i) => {
    gradeHologram(layer, VIEW_GRADE_GAIN[i])
    ctx.drawImage(layer, 0, i * VIEW_LAYER_H)
  })
  return atlas
}

function bakeViewFarLayer() {
  const pal = GLOW_PAL.holoDoor
  const canvas = makeCanvas(VIEW_LAYER_W, VIEW_LAYER_H)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = HoloFx.cssColor(pal.viewSky, 1)
  ctx.fillRect(0, 0, VIEW_LAYER_W, VIEW_LAYER_H)
  ctx.fillStyle = HoloFx.cssColor(pal.viewCloud, VIEW_CLOUD_ALPHA)
  for (let i = 0; i < VIEW_CLOUD_COUNT; i++) {
    const x = (VIEW_LAYER_W / VIEW_CLOUD_COUNT) * (i + Math.random())
    fillCircle(ctx, x, randRange(VIEW_CLOUD_Y_MIN, VIEW_CLOUD_Y_MAX), randRange(VIEW_CLOUD_R_MIN, VIEW_CLOUD_R_MAX))
  }
  const baseY = VIEW_LAYER_H - VIEW_FAR_BASE_UP
  for (let i = 0; i < VIEW_FAR_TREE_COUNT; i++) {
    const x = (VIEW_LAYER_W / VIEW_FAR_TREE_COUNT) * (i + 0.5)
    const trunkH = randRange(VIEW_FAR_TRUNK_MIN, VIEW_FAR_TRUNK_MAX)
    const crownR = randRange(VIEW_FAR_CROWN_MIN, VIEW_FAR_CROWN_MAX)
    ctx.fillStyle = HoloFx.cssColor(pal.viewFarTrunk, 1)
    ctx.fillRect(Math.round(x - VIEW_FAR_TRUNK_W / 2), baseY - trunkH, VIEW_FAR_TRUNK_W, trunkH)
    ctx.fillStyle = HoloFx.cssColor(pal.viewFarCrown, 1)
    fillCircle(ctx, x, baseY - trunkH, crownR)
    fillCircle(ctx, x - crownR * VIEW_FAR_LOBE_DX, baseY - trunkH + crownR * VIEW_FAR_LOBE_DY, crownR * VIEW_FAR_LOBE_R)
    fillCircle(ctx, x + crownR * VIEW_FAR_LOBE_DX, baseY - trunkH + crownR * VIEW_FAR_LOBE_DY, crownR * VIEW_FAR_LOBE_R)
  }
  ctx.fillStyle = HoloFx.cssColor(pal.viewFarTrunk, 1)
  ctx.fillRect(0, baseY, VIEW_LAYER_W, VIEW_LAYER_H - baseY)
  return canvas
}

function bakeViewMidLayer() {
  const canvas = makeCanvas(VIEW_LAYER_W, VIEW_LAYER_H)
  const ctx = canvas.getContext('2d')
  const baseY = VIEW_LAYER_H - VIEW_MID_BASE_UP
  VIEW_MID_TREE_XS.forEach(x => {
    const tree = buildViewTree(true)
    dimOrganicTreeColors(tree, VIEW_MID_DIM)
    drawFittedTree(ctx, tree, x, baseY, randRange(VIEW_MID_TREE_H_MIN, VIEW_MID_TREE_H_MAX))
  })
  return canvas
}

function bakeViewNearLayer() {
  const pal = GLOW_PAL.holoDoor
  const canvas = makeCanvas(VIEW_LAYER_W, VIEW_LAYER_H)
  const ctx = canvas.getContext('2d')
  const groundY = VIEW_LAYER_H - VIEW_GROUND_H
  drawFittedTree(ctx, buildViewTree(false), VIEW_NEAR_TREE_X, VIEW_LAYER_H - VIEW_NEAR_BASE_UP, VIEW_NEAR_TREE_H)
  ctx.fillStyle = HoloFx.cssColor(pal.viewGround, 1)
  ctx.fillRect(0, groundY, VIEW_LAYER_W, VIEW_GROUND_H)
  ctx.fillStyle = HoloFx.cssColor(pal.viewGroundRim, 1)
  ctx.fillRect(0, groundY, VIEW_LAYER_W, 1)
  ctx.fillStyle = HoloFx.cssColor(pal.viewRock, 1)
  ctx.beginPath()
  ctx.ellipse(VIEW_ROCK_X, groundY, VIEW_ROCK_RX, VIEW_ROCK_RY, 0, Math.PI, 0)
  ctx.fill()
  ctx.strokeStyle = HoloFx.cssColor(pal.viewGrass, 1)
  ctx.lineWidth = 1
  for (let x = 0; x < VIEW_LAYER_W; x += VIEW_GRASS_STEP * (0.5 + Math.random())) {
    ctx.beginPath()
    ctx.moveTo(x, groundY)
    ctx.lineTo(x + (Math.random() - 0.5) * 2, groundY - randRange(VIEW_GRASS_MIN, VIEW_GRASS_MAX))
    ctx.stroke()
  }
  return canvas
}

//
// Same organic generator as the Touch level trees (trunk at local x = 0).
//
function buildViewTree(flatCanopy) {
  const tree = buildOrganicTreeData(0, -VIEW_TREE_TRUNK_H, { includeRoots: false })
  tree.x = 0
  tree.opacity = 1
  tree.flatCanopy = flatCanopy
  tree.trunkColor = buildTreePalette().trunk
  return tree
}

//
// Scales a tree so its full crown height fits `targetH` above (baseX, baseY).
//
function drawFittedTree(ctx, tree, baseX, baseY, targetH) {
  const top = organicTreeTopY(tree)
  const s = targetH / Math.max(1, -top)
  ctx.save()
  ctx.translate(baseX, baseY)
  ctx.scale(s, s)
  drawOrganicTreeToCanvas(ctx, tree, 0)
  ctx.restore()
}

function organicTreeTopY(tree) {
  let top = 0
  tree.trunkSegments.forEach(seg => (top = Math.min(top, seg.endY)))
  tree.branchClusters.forEach(cluster => {
    cluster.branchSegments.forEach(seg => (top = Math.min(top, cluster.pivotY + seg.endY)))
    cluster.leaves.forEach(leaf => (top = Math.min(top, cluster.pivotY + leaf.y - leaf.size)))
  })
  return top
}

//
// Luma → hologram ramp swatch (gamma keeps darks deep), odd rows dimmed for
// a baked interlace look. Alpha is preserved.
//
function gradeHologram(canvas, gain) {
  const ramp = GLOW_PAL.holoDoor.ramp.map(hex => glowRgb(hex))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const px = img.data
  const last = ramp.length - 1
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue
    const luma = (px[i] * LUMA_R + px[i + 1] * LUMA_G + px[i + 2] * LUMA_B) / BYTE_MAX
    const idx = Math.min(last, Math.round(Math.pow(luma, VIEW_GRADE_GAMMA) * gain * last))
    const c = ramp[idx]
    const row = Math.floor(i / 4 / canvas.width)
    px[i] = c.r
    px[i + 1] = c.g
    px[i + 2] = c.b
    row % 2 === 1 && (px[i + 3] = Math.round(px[i + 3] * VIEW_INTERLACE_ALPHA))
  }
  ctx.putImageData(img, 0, 0)
}

function fillCircle(ctx, x, y, r) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function randRange(min, max) {
  return min + Math.random() * (max - min)
}
