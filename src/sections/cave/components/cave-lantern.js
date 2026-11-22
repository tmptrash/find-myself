import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { getRGB } from '../../../utils/helper.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from '../utils/cave-atlas.js'
import * as Platform from '../utils/cave-platform.js'
//
// The dry mushroom (mushroom.png: a smooth pale-brown mushroom, its wide
// cap and twisted stem pierced by big round holes): it stands beside the
// hero's landing spot, dim in the cave's dark. It has no body: the hero
// walks past it, and a hero falling onto its cap (crossing the cap's top
// over it) is thrown back up and the cap squashes and springs (its
// fireflies fly out of its big holes, cave-swarm.js; the cave's own
// fireflies go in and out of them too, cave-fireflies.js). Each landing
// knocks crumbs off its cap that fall to the ground, rest there a while
// and fade, and puffs out dust that flies off every way, settles slowly
// to the ground and fades there.
//
const SPRITE = 'cave0-lantern-v6'
const CHIP_SPRITE = 'cave0-lantern-chips-v2'
const DUST_SPRITE = 'cave0-lantern-dust-v2'
export const LANTERN_PIECE = 'lantern'
const GRAIN_SEED = 9300
const CHIP_SEED = 9310
const DUST_GRAIN_SEED = 9320
//
// Size: drawn height in world px (its cap top stays within one jump), the
// bake's resolution over it (crisp where the world is drawn scaled up),
// its tint in the cave's dark.
//
export const LANTERN_H = 92
const BAKE_SCALE = 2
const TINT = 0.55
const BYTE_MAX = 255
//
// The cap a falling hero bounces off: its share of the width, and its top
// along it — the picture's top edge (x: share of the width from the left,
// y: share of the height up from the foot), CAP_SINK px lower.
//
const CAP_W_SHARE = 0.8
const CAP_SINK = 4
const CAP_TOP = [
  { x: 0.1, y: 0.72 },
  { x: 0.2, y: 0.79 },
  { x: 0.3, y: 0.85 },
  { x: 0.4, y: 0.91 },
  { x: 0.5, y: 0.97 },
  { x: 0.6, y: 1 },
  { x: 0.7, y: 0.96 },
  { x: 0.8, y: 0.86 },
  { x: 0.9, y: 0.77 }
]
//
// Its foot stands on the lowest point of the soil under its stem's flared
// base (FOOT_HALF px either side of its middle), FOOT_SINK px into it, so
// on a slope the stem never hangs in the air.
//
const FOOT_HALF = 14
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
// Its big holes the fireflies go in and out of (the small ones are too
// small): where each opens on the picture (shares of its width from the
// left and of its height from the top) — the cap's, then the stem's.
//
const HOLES = [
  { x: 0.52, y: 0.202 },
  { x: 0.67, y: 0.094 },
  { x: 0.825, y: 0.29 },
  { x: 0.246, y: 0.252 },
  { x: 0.46, y: 0.52 },
  { x: 0.391, y: 0.636 },
  { x: 0.407, y: 0.752 },
  { x: 0.522, y: 0.876 }
]
//
// Crumbs knocked off by a landing: CHIP_KINDS shapes cut out of the baked
// picture (each a lumpy polygon of CHIP_CORNERS..+RANGE corners,
// CHIP_R..+RANGE baked px round, its corners in to CHIP_DENT of that, cut
// from one of CHIP_SOURCES, picture shares on its solid cap and stem), on
// one strip of CHIP_CELL baked px cells. CHIPS..+RANGE break off at a
// landing, from points along the cap's rim and top (CHIP_FROM, picture
// shares); they pop up CHIP_POP..+RANGE px/s, fly apart CHIP_SPREAD px/s
// (and CHIP_OUT px/s away from the middle), fall at CHIP_GRAVITY px/s²,
// spin up to CHIP_SPIN rad/s; on the ground (their middle CHIP_LIE px over
// it) they rest CHIP_REST..+RANGE s, then fade over CHIP_FADE s.
//
const CHIP_KINDS = 8
const CHIP_CELL = 24
const CHIP_CORNERS = 5
const CHIP_CORNERS_RANGE = 3
const CHIP_R = 5
const CHIP_R_RANGE = 5.5
const CHIP_DENT = 0.55
const CHIP_SOURCES = [
  { x: 0.35, y: 0.2 },
  { x: 0.42, y: 0.12 },
  { x: 0.58, y: 0.1 },
  { x: 0.75, y: 0.2 },
  { x: 0.15, y: 0.32 },
  { x: 0.9, y: 0.34 },
  { x: 0.62, y: 0.26 },
  { x: 0.55, y: 0.66 }
]
const CHIPS = 5
const CHIPS_RANGE = 4
const CHIP_FROM = [
  { x: 0.04, y: 0.4 },
  { x: 0.15, y: 0.43 },
  { x: 0.3, y: 0.45 },
  { x: 0.62, y: 0.42 },
  { x: 0.78, y: 0.43 },
  { x: 0.95, y: 0.42 },
  { x: 0.35, y: 0.2 },
  { x: 0.55, y: 0.08 },
  { x: 0.75, y: 0.18 }
]
const CHIP_POP = 20
const CHIP_POP_RANGE = 45
const CHIP_SPREAD = 35
const CHIP_OUT = 25
const CHIP_GRAVITY = 520
const CHIP_SPIN = 9
const CHIP_REST = 2.5
const CHIP_REST_RANGE = 2
const CHIP_FADE = 1.2
const CHIP_LIE = 1.5
//
// Dust puffed out by a landing: DUST..+RANGE motes from all over the cap
// (picture shares DUST_X1..X2 across, DUST_Y1..Y2 down), thrown every way
// at DUST_SPEED..+RANGE px/s — DUST_SIDE times that sideways, DUST_UPDOWN
// times it up or down, and DUST_LIFT px/s up — slowed by DUST_DRAG per s,
// sinking at up to DUST_SINK px/s (pulled down at DUST_FALL px/s²),
// swaying DUST_SWAY px/s at DUST_SWAY_HZ; each DUST_SIZE..+RANGE px
// across, fading in over DUST_IN s, DUST_ALPHA at its thickest; on the
// ground it rests DUST_REST..+RANGE s and fades over DUST_FADE s. The mote
// is a solid round crumb of the mushroom's own colour (darkened like the
// mushroom, nothing glowing), DUST_DOT baked px across, its rim softened
// from DUST_SOLID of its radius, drawn DUST_DOT_SCALE times a mote's size.
//
const DUST = 22
const DUST_RANGE = 12
const DUST_X1 = 0.06
const DUST_X2 = 0.94
const DUST_Y1 = 0.04
const DUST_Y2 = 0.42
const DUST_SPEED = 30
const DUST_SPEED_RANGE = 70
const DUST_SIDE = 1.6
const DUST_UPDOWN = 0.6
const DUST_LIFT = 12
const DUST_DRAG = 1.6
const DUST_FALL = 16
const DUST_SINK = 12
const DUST_SWAY = 4
const DUST_SWAY_HZ = 0.6
const DUST_SIZE = 1.8
const DUST_SIZE_RANGE = 2.2
const DUST_IN = 0.15
const DUST_ALPHA = 0.85
const DUST_REST = 1
const DUST_REST_RANGE = 1.5
const DUST_FADE = 2
const DUST_DOT = 16
const DUST_DOT_SCALE = 1.2
const DUST_SOLID = 0.7
const DEBRIS_SEED = 9330
const FULL_TURN = Math.PI * 2
const HALF = 0.5
const DEG = 180 / Math.PI
const bakedFor = new WeakSet()

/**
 * Creates the dry mushroom standing with its foot at x / y.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - Foot X
 * @param {number} cfg.y - Foot Y (the ground's top)
 * @param {Function} [cfg.groundAt] - The ground's top at a world X (where its crumbs and dust come to rest); default level with its foot
 * @returns {Object} Lantern instance
 */
export function create(cfg) {
  const { k, x, y } = cfg
  bake(k)
  const w = Atlas.widthAt(LANTERN_PIECE, LANTERN_H)
  const tint = Math.round(BYTE_MAX * TINT)
  const inst = {
    k,
    x,
    y,
    w,
    capHalfW: w * CAP_W_SHARE / 2,
    groundAt: cfg.groundAt ?? (() => y),
    prevBottom: null,
    squash: { v: 0, vel: 0 },
    rng: createSeededRandom(DEBRIS_SEED),
    chips: [],
    dust: [],
    tintRgb: k.rgb(tint, tint, tint),
    dustRgb: tinted(getRGB(k, CAVE_CFG.colors.mushroomDust))
  }
  return inst
}

/**
 * Where the mushroom's foot stands on a platform at X: the lowest soil
 * under its stem's base, a little sunk in.
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
 * Its big holes in the world: where each opens, its middle, its cap's top
 * and its foot.
 * @param {Object} inst - Lantern instance
 * @returns {{holes: Array<{x: number, y: number}>, x: number, top: number, foot: number}}
 */
export function holes(inst) {
  return {
    holes: HOLES.map(hole => onPicture(inst, hole)),
    x: inst.x,
    top: inst.y - LANTERN_H,
    foot: inst.y
  }
}

/**
 * Runs the squash spring and the crumbs and dust; bounces a hero falling
 * onto the cap. Returns true on the frame of a bounce.
 * @param {Object} inst - Lantern instance
 * @param {Object|null} heroInst - Hero instance (null: none)
 * @returns {boolean}
 */
export function onUpdate(inst, heroInst) {
  const dt = inst.k.dt()
  stepSpring(inst.squash, dt)
  inst.chips.length && updateChips(inst, dt)
  inst.dust.length && updateDust(inst, dt)
  const char = heroInst?.character
  if (!char?.exists?.()) {
    inst.prevBottom = null
    return false
  }
  const box = char.worldArea().bbox()
  const bottom = box.pos.y + box.height
  const capTop = capTopAt(inst, char.pos.x)
  const crossed = inst.prevBottom !== null && inst.prevBottom <= capTop && bottom >= capTop
  const landed = crossed && (char.vel?.y ?? 0) > 0 && Math.abs(char.pos.x - inst.x) <= inst.capHalfW
  inst.prevBottom = bottom
  landed && bounce(inst, char)
  return landed
}

/**
 * Draws the mushroom (squashed by its spring), then the crumbs falling
 * off it and its dust.
 * @param {Object} inst - Lantern instance
 */
export function onDraw(inst) {
  const k = inst.k
  k.drawSprite({
    sprite: SPRITE,
    pos: k.vec2(inst.x, inst.y),
    anchor: 'bot',
    width: inst.w * (1 + inst.squash.v * SQUASH_X),
    height: LANTERN_H * (1 - inst.squash.v * SQUASH_Y),
    color: inst.tintRgb
  })
  inst.chips.forEach(chip => drawChip(inst, chip))
  inst.dust.forEach(mote => drawMote(inst, mote))
}

//
// The picture, its crumbs and the dust mote, baked once per live k (the
// picture at BAKE_SCALE over its drawn size).
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
  k.loadSprite(CHIP_SPRITE, bakeChips(canvas), { sliceX: CHIP_KINDS, filter: 'linear' })
  k.loadSprite(DUST_SPRITE, bakeDust(), { filter: 'linear' })
  bakedFor.add(k)
}
//
// The crumbs' strip: each cell a lumpy piece cut out of the (grained)
// picture round one of CHIP_SOURCES.
//
function bakeChips(picture) {
  const rng = createSeededRandom(CHIP_SEED)
  const strip = document.createElement('canvas')
  strip.width = CHIP_CELL * CHIP_KINDS
  strip.height = CHIP_CELL
  const ctx = strip.getContext('2d')
  for (let i = 0; i < CHIP_KINDS; i++) {
    const src = CHIP_SOURCES[i % CHIP_SOURCES.length]
    const cx = CHIP_CELL * (i + HALF)
    const cy = CHIP_CELL * HALF
    const r = CHIP_R + rng() * CHIP_R_RANGE
    const corners = CHIP_CORNERS + Math.floor(rng() * CHIP_CORNERS_RANGE)
    ctx.save()
    ctx.beginPath()
    for (let c = 0; c < corners; c++) {
      const a = c / corners * FULL_TURN
      const cr = r * (CHIP_DENT + rng() * (1 - CHIP_DENT))
      c ? ctx.lineTo(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr) : ctx.moveTo(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr)
    }
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(picture, cx - src.x * picture.width, cy - src.y * picture.height)
    ctx.restore()
  }
  return strip
}
//
// The dust mote: a solid white crumb with a softened rim (tinted when
// drawn), grained.
//
function bakeDust() {
  const canvas = document.createElement('canvas')
  canvas.width = DUST_DOT
  canvas.height = DUST_DOT
  const ctx = canvas.getContext('2d')
  const r = DUST_DOT * HALF
  const g = ctx.createRadialGradient(r, r, 0, r, r, r)
  g.addColorStop(0, CAVE_CFG.colors.glowCore)
  g.addColorStop(DUST_SOLID, CAVE_CFG.colors.glowCore)
  g.addColorStop(1, `${CAVE_CFG.colors.glowCore}00`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, DUST_DOT, DUST_DOT)
  applyForestFilmGrainToCanvas(canvas, DUST_GRAIN_SEED)
  return canvas
}
//
// A landing: the hero thrown back up, the cap springing, crumbs and dust
// off it.
//
function bounce(inst, char) {
  char.jump(BOUNCE_FORCE)
  inst.squash.vel += SQUASH_KICK
  breakChips(inst)
  puffDust(inst)
}
//
// A colour darkened as the mushroom is in the cave (TINT).
//
function tinted(rgb) {
  rgb.r = Math.round(rgb.r * TINT)
  rgb.g = Math.round(rgb.g * TINT)
  rgb.b = Math.round(rgb.b * TINT)
  return rgb
}
function stepSpring(s, dt) {
  s.vel += (-s.v * SQUASH_SPRING.k - s.vel * SQUASH_SPRING.c) * dt
  s.v += s.vel * dt
}
//
// The cap's top over a world X (between its CAP_TOP points), CAP_SINK px
// lower.
//
function capTopAt(inst, x) {
  const u = (x - inst.x) / inst.w + HALF
  const i = Math.min(CAP_TOP.length - 1, Math.max(1, CAP_TOP.findIndex(pt => pt.x >= u)))
  const a = CAP_TOP[i - 1]
  const b = CAP_TOP[i]
  const t = Math.max(0, Math.min(1, (u - a.x) / (b.x - a.x)))
  return inst.y - LANTERN_H * (a.y + (b.y - a.y) * t) + CAP_SINK
}
//
// A point of the picture (shares from its top left) in the world.
//
function onPicture(inst, pt) {
  return { x: inst.x + (pt.x - HALF) * inst.w, y: inst.y - (1 - pt.y) * LANTERN_H }
}
function breakChips(inst) {
  const rng = inst.rng
  const count = CHIPS + Math.floor(rng() * CHIPS_RANGE)
  for (let i = 0; i < count; i++) {
    const at = onPicture(inst, CHIP_FROM[Math.floor(rng() * CHIP_FROM.length)])
    inst.chips.push({
      x: at.x,
      y: at.y,
      vx: (rng() * 2 - 1) * CHIP_SPREAD + Math.sign(at.x - inst.x) * CHIP_OUT,
      vy: -(CHIP_POP + rng() * CHIP_POP_RANGE),
      angle: rng() * FULL_TURN,
      spin: (rng() * 2 - 1) * CHIP_SPIN,
      kind: Math.floor(rng() * CHIP_KINDS),
      rest: null,
      restFor: CHIP_REST + rng() * CHIP_REST_RANGE
    })
  }
}
function puffDust(inst) {
  const rng = inst.rng
  const count = DUST + Math.floor(rng() * DUST_RANGE)
  for (let i = 0; i < count; i++) {
    const at = onPicture(inst, { x: DUST_X1 + rng() * (DUST_X2 - DUST_X1), y: DUST_Y1 + rng() * (DUST_Y2 - DUST_Y1) })
    const a = rng() * FULL_TURN
    const speed = DUST_SPEED + rng() * DUST_SPEED_RANGE
    inst.dust.push({
      x: at.x,
      y: at.y,
      vx: Math.cos(a) * speed * DUST_SIDE,
      vy: Math.sin(a) * speed * DUST_UPDOWN - DUST_LIFT,
      t: 0,
      rest: null,
      restFor: DUST_REST + rng() * DUST_REST_RANGE,
      size: DUST_SIZE + rng() * DUST_SIZE_RANGE,
      phase: rng() * FULL_TURN
    })
  }
}
//
// Crumbs fall and spin until they reach the ground, lie there, then fade
// and are gone.
//
function updateChips(inst, dt) {
  inst.chips.forEach(chip => stepChip(inst, chip, dt))
  inst.chips = inst.chips.filter(chip => chip.rest === null || chip.rest < chip.restFor + CHIP_FADE)
}
function stepChip(inst, chip, dt) {
  if (chip.rest !== null) {
    chip.rest += dt
    return
  }
  chip.vy += CHIP_GRAVITY * dt
  chip.x += chip.vx * dt
  chip.y += chip.vy * dt
  chip.angle += chip.spin * dt
  const ground = inst.groundAt(chip.x) - CHIP_LIE
  if (chip.y < ground) return
  chip.y = ground
  chip.rest = 0
}
//
// Dust flies apart, slows, sways and sinks; on the ground it lies a while,
// then fades out and is gone.
//
function updateDust(inst, dt) {
  const drag = Math.exp(-DUST_DRAG * dt)
  inst.dust.forEach(mote => stepMote(inst, mote, dt, drag))
  inst.dust = inst.dust.filter(mote => mote.rest === null || mote.rest < mote.restFor + DUST_FADE)
}
function stepMote(inst, mote, dt, drag) {
  mote.t += dt
  if (mote.rest !== null) {
    mote.rest += dt
    return
  }
  mote.vx *= drag
  mote.vy = Math.min(DUST_SINK, mote.vy * drag + DUST_FALL * dt)
  mote.x += (mote.vx + Math.sin(mote.t * DUST_SWAY_HZ * FULL_TURN + mote.phase) * DUST_SWAY) * dt
  mote.y += mote.vy * dt
  const ground = inst.groundAt(mote.x) - mote.size * HALF
  if (mote.y < ground) return
  mote.y = ground
  mote.rest = 0
}
function drawChip(inst, chip) {
  const k = inst.k
  const fade = chip.rest === null ? 1 : 1 - Math.max(0, chip.rest - chip.restFor) / CHIP_FADE
  k.drawSprite({
    sprite: CHIP_SPRITE,
    frame: chip.kind,
    pos: k.vec2(chip.x, chip.y),
    anchor: 'center',
    angle: chip.angle * DEG,
    width: CHIP_CELL / BAKE_SCALE,
    height: CHIP_CELL / BAKE_SCALE,
    color: inst.tintRgb,
    opacity: fade
  })
}
function drawMote(inst, mote) {
  const k = inst.k
  const fadeIn = Math.min(1, mote.t / DUST_IN)
  const fadeOut = mote.rest === null ? 1 : 1 - Math.max(0, mote.rest - mote.restFor) / DUST_FADE
  k.drawSprite({
    sprite: DUST_SPRITE,
    pos: k.vec2(mote.x, mote.y),
    anchor: 'center',
    width: mote.size * DUST_DOT_SCALE,
    height: mote.size * DUST_DOT_SCALE,
    color: inst.dustRgb,
    opacity: DUST_ALPHA * fadeIn * fadeOut
  })
}
