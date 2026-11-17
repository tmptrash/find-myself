import { CFG } from '../../../cfg.js'
import { getRGB } from '../../../utils/helper.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from '../utils/cave-atlas.js'
import * as Glow from '../utils/cave-glow.js'
//
// The lantern mushroom (the plants sheet's glowing blue mushrooms): it
// stands dim beside the hero's landing spot. A hero landing on its cap is
// thrown back up, the cap squashes and springs, and the mushroom lights up
// — a cold blue halo that fades again over LIGHT_HOLD_SEC. It also serves as
// the cave's picture behind the menu (no cap collider there).
//
const SPRITE = 'cave0-lantern-v3'
export const LANTERN_PIECE = 'shroom4'
const GRAIN_SEED = 9300
//
// Size: drawn height in world px (its cap top stays within one jump), the
// bake's resolution over it (crisper when the menu scales it up).
//
export const LANTERN_H = 92
const BAKE_SCALE = 2
//
// Walkable cap: its share of the width and its top (share of the height
// from the foot); a hero passes up through it and lands on top.
//
const CAP_W_SHARE = 0.62
const CAP_TOP_SHARE = 0.9
const CAP_BODY_H = 10
const CAP_SINK = 4
//
// Bounce: the throw, the cap's squash spring.
//
const BOUNCE_FORCE = 900
const SQUASH_KICK = 5
const SQUASH_SPRING = { k: 220, c: 9 }
const SQUASH_Y = 0.22
const SQUASH_X = 0.12
//
// Light: dim tint and faint halo at rest; lit, the full colour and a
// broad halo that fades out over LIGHT_HOLD_SEC (slow at first).
//
const DIM_TINT = 0.55
const LIGHT_HOLD_SEC = 24
const LIGHT_FADE_POW = 3
const HALO_DIM_R = 40
const HALO_LIT_R = 190
const HALO_DIM_OPACITY = 0.18
const HALO_LIT_OPACITY = 0.75
const HALO_CORE_SHARE = 0.35
const HALO_CORE_OPACITY = 0.5
const HALO_Y_SHARE = 0.62
const BREATH_SPEED = 1.4
const BREATH_DEPTH = 0.08
//
// In the menu's picture it idles, now and then squatting on its own.
//
const IDLE_SQUAT_MIN = 3
const IDLE_SQUAT_RANGE = 4
const IDLE_SQUAT_KICK = 2.5
const BYTE_MAX = 255
const bakedFor = new WeakSet()

/**
 * Creates the lantern mushroom standing with its foot at x / y.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - Foot X
 * @param {number} cfg.y - Foot Y (the ground's top)
 * @param {boolean} [cfg.collide=true] - Give it a walkable cap (false for the menu's picture)
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
    cap: null,
    squash: { v: 0, vel: 0 },
    light: cfg.lit ? 1 : 0,
    litFor: cfg.lit ? 0 : LIGHT_HOLD_SEC,
    idleIn: IDLE_SQUAT_MIN,
    wasOnCap: false,
    glowRgb: getRGB(k, CAVE_CFG.colors.lanternGlow),
    coreRgb: getRGB(k, CAVE_CFG.colors.lanternCore),
    menu: cfg.collide === false
  }
  inst.menu || (inst.cap = addCap(inst))
  Glow.create(k)
  return inst
}

/**
 * Runs the squash spring and the light; bounces a hero who landed on the
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
  const onCap = !!char?.exists?.() && char.isGrounded?.() && char.curPlatform?.() === inst.cap
  const landed = onCap && !inst.wasOnCap
  inst.wasOnCap = onCap
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
  const r = (HALO_DIM_R + (HALO_LIT_R - HALO_DIM_R) * inst.light) * s * breath
  const opacity = HALO_DIM_OPACITY + (HALO_LIT_OPACITY - HALO_DIM_OPACITY) * inst.light
  const cy = inst.y - LANTERN_H * s * HALO_Y_SHARE
  Glow.drawGlow(k, inst.x, cy, r, inst.glowRgb, opacity)
  Glow.drawGlow(k, inst.x, cy, r * HALO_CORE_SHARE, inst.coreRgb, HALO_CORE_OPACITY * inst.light)
}

/**
 * Current light (0 dim … 1 freshly lit).
 * @param {Object} inst - Lantern instance
 * @returns {number}
 */
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
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  k.loadSprite(SPRITE, canvas, { filter: 'linear' })
  bakedFor.add(k)
}
//
// Static one-way cap body: passable from below, solid from above.
//
function addCap(inst) {
  const k = inst.k
  const w = inst.w * CAP_W_SHARE
  return k.add([
    k.rect(w, CAP_BODY_H),
    k.pos(inst.x - w / 2, inst.y - LANTERN_H * CAP_TOP_SHARE + CAP_SINK),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName,
    CFG.game.noCeilingTag
  ])
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
