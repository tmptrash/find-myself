import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from '../utils/cave-atlas.js'
import * as Platform from '../utils/cave-platform.js'
//
// The lantern mushroom (mushroom.png: a glowing blue mushroom, its cap and
// stem full of holes): it stands dim beside the hero's landing spot. It
// has no body: the hero walks past it, and a hero falling onto its cap
// (crossing the cap's top over it) is thrown back up, the cap squashes and
// springs, and the mushroom lights up — glowing a cold blue, a small halo
// hugging its outline — and fades again over LIGHT_HOLD_SEC (and its
// fireflies fly out of its holes, cave-swarm.js). It also serves as the cave's picture behind the menu.
//
const SPRITE = 'cave0-lantern-v4'
const HALO_SPRITE = 'cave0-lantern-halo-v1'
export const LANTERN_PIECE = 'lantern'
const GRAIN_SEED = 9300
//
// Size: drawn height in world px (its cap top stays within one jump), the
// bake's resolution over it (crisper when the menu scales it up).
//
export const LANTERN_H = 92
const BAKE_SCALE = 2
//
// The cap a falling hero bounces off: its share of the width and its top
// (share of the height from the foot, CAP_SINK px lower).
//
const CAP_W_SHARE = 0.8
const CAP_TOP_SHARE = 0.95
const CAP_SINK = 4
//
// Its foot stands on the lowest point of the soil under its stems (FOOT_HALF
// px either side of its middle), FOOT_SINK px into it, so on a slope no
// stem hangs in the air.
//
const FOOT_HALF = 44
const FOOT_SINK = 4
const FOOT_STEP = 2
//
// Bounce: the throw, the cap's squash spring.
//
const BOUNCE_FORCE = 900
const SQUASH_KICK = 5
const SQUASH_SPRING = { k: 220, c: 9 }
const SQUASH_Y = 0.22
const SQUASH_X = 0.12
//
// Light: dim tint and a faint halo at rest; lit, the full colour and its
// halo at full, fading out over LIGHT_HOLD_SEC (slow at first). The halo
// hugs its outline: its silhouette in the lantern's glow colour laid round
// itself HALO_SPREAD px out, in HALO_RINGS rings of HALO_STEPS copies
// (each ring fainter, HALO_RING_ALPHA the innermost), its own inside kept
// at HALO_INSIDE of that (it glows, it is not washed out); breathing a
// little.
//
const DIM_TINT = 0.55
const LIGHT_HOLD_SEC = 24
const LIGHT_FADE_POW = 3
const HALO_SPREAD = 9
const HALO_RINGS = 6
const HALO_STEPS = 16
const HALO_RING_ALPHA = 0.16
const HALO_INSIDE = 0.35
const HALO_DIM_OPACITY = 0.12
const HALO_LIT_OPACITY = 0.95
const FULL_TURN = Math.PI * 2
const BREATH_SPEED = 1.4
const BREATH_DEPTH = 0.08
//
// In the menu's picture it idles, now and then squatting on its own.
//
const IDLE_SQUAT_MIN = 3
const IDLE_SQUAT_RANGE = 4
const IDLE_SQUAT_KICK = 2.5
const BYTE_MAX = 255
//
// Its holes the fireflies live in: where each opens on the picture (shares
// of its width from the left and of its height from the top) — the big
// and small ones of the cap, the big ones of the stem.
//
const HOLES = [
  { x: 0.343, y: 0.264 },
  { x: 0.620, y: 0.177 },
  { x: 0.111, y: 0.269 },
  { x: 0.772, y: 0.260 },
  { x: 0.418, y: 0.107 },
  { x: 0.713, y: 0.115 },
  { x: 0.469, y: 0.724 },
  { x: 0.612, y: 0.837 },
  { x: 0.326, y: 0.881 }
]
const HALF = 0.5
const bakedFor = new WeakSet()

/**
 * Creates the lantern mushroom standing with its foot at x / y.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - Foot X
 * @param {number} cfg.y - Foot Y (the ground's top)
 * @param {boolean} [cfg.collide=true] - Bounce a hero falling onto its cap (false for the menu's picture)
 * @param {boolean} [cfg.lit=false] - Start lit (the menu's picture)
 * @returns {Object} Lantern instance
 */
export function create(cfg) {
  const { k, x, y } = cfg
  bake(k)
  const w = Atlas.widthAt(LANTERN_PIECE, LANTERN_H)
  const inst = {
    k,
    x,
    y,
    scale: 1,
    w,
    capTop: y - LANTERN_H * CAP_TOP_SHARE + CAP_SINK,
    capHalfW: w * CAP_W_SHARE / 2,
    prevBottom: null,
    squash: { v: 0, vel: 0 },
    light: cfg.lit ? 1 : 0,
    litFor: cfg.lit ? 0 : LIGHT_HOLD_SEC,
    idleIn: IDLE_SQUAT_MIN,
    menu: cfg.collide === false
  }
  return inst
}

/**
 * Where the mushroom's foot stands on a platform at X: the lowest soil
 * under its stems, a little sunk in.
 * @param {Object} p - PLATFORMS entry
 * @param {number} x - Foot X
 * @returns {number} Foot Y
 */
export function footYOn(p, x) {
  let y = -Infinity
  for (let dx = -FOOT_HALF; dx <= FOOT_HALF; dx += FOOT_STEP) y = Math.max(y, Platform.surfaceAt(p, x + dx))
  return y + FOOT_SINK
}

/**
 * Its holes in the world: where each opens, its middle, its cap's top
 * and its foot.
 * @param {Object} inst - Lantern instance
 * @returns {{holes: Array<{x: number, y: number}>, x: number, top: number, foot: number}}
 */
export function holes(inst) {
  const w = inst.w * inst.scale
  const h = LANTERN_H * inst.scale
  return {
    holes: HOLES.map(hole => ({ x: inst.x + (hole.x - HALF) * w, y: inst.y - (1 - hole.y) * h })),
    x: inst.x,
    top: inst.y - h,
    foot: inst.y
  }
}

/**
 * Runs the squash spring and the light; bounces a hero falling onto the
 * cap. Returns true on the frame of a bounce.
 * @param {Object} inst - Lantern instance
 * @param {Object|null} heroInst - Hero instance (null: the menu's one idles)
 * @returns {boolean}
 */
export function onUpdate(inst, heroInst) {
  const dt = inst.k.dt()
  stepSpring(inst.squash, dt)
  inst.litFor = Math.min(LIGHT_HOLD_SEC, inst.litFor + dt)
  inst.menu || (inst.light = 1 - Math.pow(inst.litFor / LIGHT_HOLD_SEC, LIGHT_FADE_POW))
  if (inst.menu) return idle(inst, dt)
  const char = heroInst?.character
  if (!char?.exists?.()) {
    inst.prevBottom = null
    return false
  }
  const box = char.worldArea().bbox()
  const bottom = box.pos.y + box.height
  const crossed = inst.prevBottom !== null && inst.prevBottom <= inst.capTop && bottom >= inst.capTop
  const landed = crossed && (char.vel?.y ?? 0) > 0 && Math.abs(char.pos.x - inst.x) <= inst.capHalfW
  inst.prevBottom = bottom
  landed && bounce(inst, char)
  return landed
}

/**
 * Places the mushroom (the menu's picture): foot at x / y, scaled.
 * @param {Object} inst - Lantern instance
 * @param {number} x - Foot X
 * @param {number} y - Foot Y
 * @param {number} scale - Size multiplier
 */
export function setPose(inst, x, y, scale) {
  inst.x = x
  inst.y = y
  inst.scale = scale
}

/**
 * Draws the mushroom (dim or lit tint, squashed by its spring).
 * @param {Object} inst - Lantern instance
 */
export function onDraw(inst) {
  const k = inst.k
  const tint = Math.round(BYTE_MAX * (DIM_TINT + (1 - DIM_TINT) * inst.light))
  const s = inst.scale
  k.drawSprite({
    sprite: SPRITE,
    pos: k.vec2(inst.x, inst.y),
    anchor: 'bot',
    width: inst.w * s * (1 + inst.squash.v * SQUASH_X),
    height: LANTERN_H * s * (1 - inst.squash.v * SQUASH_Y),
    color: k.rgb(tint, tint, tint)
  })
}

/**
 * Additive halo round the cap (draw in the lights pass).
 * @param {Object} inst - Lantern instance
 */
export function onDrawHalo(inst) {
  const k = inst.k
  const s = inst.scale
  const breath = 1 + Math.sin(k.time() * BREATH_SPEED) * BREATH_DEPTH
  const sx = s * (1 + inst.squash.v * SQUASH_X)
  const sy = s * (1 - inst.squash.v * SQUASH_Y)
  k.drawSprite({
    sprite: HALO_SPRITE,
    pos: k.vec2(inst.x, inst.y + HALO_SPREAD * sy),
    anchor: 'bot',
    width: (inst.w + HALO_SPREAD * 2) * sx,
    height: (LANTERN_H + HALO_SPREAD * 2) * sy,
    opacity: Math.min(1, (HALO_DIM_OPACITY + (HALO_LIT_OPACITY - HALO_DIM_OPACITY) * inst.light) * breath),
    blend: k.BlendMode.Add
  })
}

//
// The picture baked once per live k at BAKE_SCALE over its drawn size.
//
function bake(k) {
  if (bakedFor.has(k)) return
  const src = Atlas.piece(LANTERN_PIECE)
  if (!src) return
  const h = LANTERN_H * BAKE_SCALE
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(Atlas.widthAt(LANTERN_PIECE, h))
  canvas.height = h
  Atlas.drawPiece(canvas.getContext('2d'), LANTERN_PIECE, canvas.width / 2, h, h)
  k.loadSprite(HALO_SPRITE, bakeHalo(canvas), { filter: 'linear' })
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  k.loadSprite(SPRITE, canvas, { filter: 'linear' })
  bakedFor.add(k)
}
//
// The halo round the baked picture: its silhouette in the glow colour,
// laid round itself in fading rings, its inside dimmed.
//
function bakeHalo(picture) {
  const pad = Math.ceil(HALO_SPREAD * BAKE_SCALE)
  const sil = document.createElement('canvas')
  sil.width = picture.width
  sil.height = picture.height
  const sctx = sil.getContext('2d')
  sctx.drawImage(picture, 0, 0)
  sctx.globalCompositeOperation = 'source-in'
  sctx.fillStyle = CAVE_CFG.colors.lanternGlow
  sctx.fillRect(0, 0, sil.width, sil.height)
  const halo = document.createElement('canvas')
  halo.width = picture.width + pad * 2
  halo.height = picture.height + pad * 2
  const ctx = halo.getContext('2d')
  for (let ring = 1; ring <= HALO_RINGS; ring++) {
    const r = pad * ring / HALO_RINGS
    ctx.globalAlpha = HALO_RING_ALPHA * (1 - (ring - 1) / HALO_RINGS)
    for (let i = 0; i < HALO_STEPS; i++) {
      const a = i / HALO_STEPS * FULL_TURN
      ctx.drawImage(sil, pad + Math.cos(a) * r, pad + Math.sin(a) * r)
    }
  }
  ctx.globalAlpha = 1 - HALO_INSIDE
  ctx.globalCompositeOperation = 'destination-out'
  ctx.drawImage(sil, pad, pad)
  return halo
}
function bounce(inst, char) {
  char.jump(BOUNCE_FORCE)
  inst.squash.vel += SQUASH_KICK
  inst.litFor = 0
  inst.light = 1
}
function idle(inst, dt) {
  inst.light = 1
  inst.idleIn -= dt
  if (inst.idleIn > 0) return false
  inst.idleIn = IDLE_SQUAT_MIN + Math.random() * IDLE_SQUAT_RANGE
  inst.squash.vel += IDLE_SQUAT_KICK
  return false
}
function stepSpring(s, dt) {
  s.vel += (-s.v * SQUASH_SPRING.k - s.vel * SQUASH_SPRING.c) * dt
  s.v += s.vel * dt
}
