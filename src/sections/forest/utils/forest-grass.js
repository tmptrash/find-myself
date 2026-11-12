import { FOREST_PAL, forestRgb } from './forest-palette.js'
import { applyForestFilmGrainToCanvas } from './forest-parallax-grain.js'
import { cssRgb, isWorldSpanInView } from './forest-static-bake.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
//
// Tufts of tall grass standing on the ground between the lake and the right
// hill: clumps of a few tufts, each a handful of blades, every blade drawn
// from a baked atlas of blade pictures (body, lit edge, tip; no contour).
// The grass stands in front of the hero, the apple bug and the centipede. It
// is still until something runs through it: the hero, the apple bug and the
// centipede (the level reports them as movers) bend the blades they pass
// along their way, and each blade then swings back on its own spring — its
// own stiffness, damping and push, some blades pushed the wrong way, some
// not at all — so no two passes look alike.
//
const BLADE_VARIANTS = 14
const CELL_W = 16
const CELL_H = 30
const ATLAS_PAD = 1
const BLADE_H_MIN = 12
const BLADE_H_RANGE = 14
const BLADE_W_MIN = 3
const BLADE_W_RANGE = 2.5
const BLADE_BEND_MIN = 0.12
const BLADE_BEND_RANGE = 0.34
const BLADE_TIP_FRAC = 0.22
const BLADE_LIGHT_FRAC = 0.4
const BLADE_STEPS = 12
const TONE_COUNT = 3
const TIP_GOLD_SHARE = 0.08
const ATLAS_SPRITE = 'forest-grass-atlas'
const ATLAS_SEED = 4417
const ATLAS_GRAIN_SEED = 4418
//
// Layout: clumps CLUMP_GAP_MIN..+RANGE apart, each CLUMP_TUFTS_MIN..+RANGE
// tufts within CLUMP_SPREAD of its middle, each tuft TUFT_BLADES_MIN..+RANGE
// blades within TUFT_SPREAD, the tuft's middle blades taller. A blade sinks
// ROOT_SINK px into the ground.
//
const LAYOUT_SEED = 90211
const CLUMP_GAP_MIN = 34
const CLUMP_GAP_RANGE = 92
const CLUMP_HALF = 22
const CLUMP_TUFTS_MIN = 2
const CLUMP_TUFTS_RANGE = 3
const CLUMP_SPREAD = 20
const TUFT_BLADES_MIN = 3
const TUFT_BLADES_RANGE = 4
const TUFT_SPREAD = 7
const BLADE_SCALE_MIN = 0.7
const BLADE_SCALE_RANGE = 0.45
const MIDDLE_TALLER = 0.3
const REST_LEAN = 0.1
const ROOT_SINK = 1.5
//
// Swing: a blade is a spring (stiffness STIFF_MIN..+RANGE, damping
// DAMP_MIN..+RANGE, so it rings for a second or two). A mover faster than
// MOVER_MIN_SPEED pushes the blades within its reach with PUSH * its speed
// share (up to MOVER_FULL_SPEED) * how near it is * the blade's own push,
// on a random PUSH_CHANCE of the frames; WRONG_WAY of the blades are pushed
// the other way. A swing never bends a blade past MAX_BEND, a mover that
// jumps further than MOVER_MAX_STEP in a frame (a respawn) pushes nothing.
//
const STIFF_MIN = 55
const STIFF_RANGE = 60
const DAMP_MIN = 2.6
const DAMP_RANGE = 3
const PUSH = 26
const PUSH_MIN = 0.4
const PUSH_RANGE = 1.1
const PUSH_CHANCE = 0.6
const WRONG_WAY = 0.14
const MOVER_MIN_SPEED = 25
const MOVER_FULL_SPEED = 320
const MOVER_MAX_STEP = 220
const MAX_BEND = 0.75
const REST_EPS = 0.002
const MAX_DT = 0.05
const RAD_TO_DEG = 180 / Math.PI
const VIEW_PAD = 40
const bakedByK = new WeakMap()

/**
 * Plants the grass along [x1, x2] and bakes its blade atlas (once per live k).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x1 - Left world X of the grass strip
 * @param {number} cfg.x2 - Right world X of the grass strip
 * @param {function(number, number): boolean} cfg.isSpotFree - (x, halfW) => whether grass may stand there
 * @param {function(number): number} cfg.baseY - World Y of the ground under an X
 * @returns {Object} Grass inst
 */
export function create(cfg) {
  const { k, x1, x2, isSpotFree, baseY } = cfg
  const atlas = bakeAtlas(k)
  const rng = createSeededRandom(LAYOUT_SEED)
  const inst = {
    k,
    atlas,
    blades: [],
    movers: [],
    moverCount: 0,
    prevX: [],
    posScratch: k.vec2(0, 0),
    sizeScratch: k.vec2(1, 1)
  }
  for (let x = x1 + rng() * CLUMP_GAP_MIN; x < x2; x += CLUMP_GAP_MIN + rng() * CLUMP_GAP_RANGE) {
    isSpotFree(x, CLUMP_HALF) && plantClump(inst, rng, x, baseY)
  }
  inst.blades.sort(byX)
  return inst
}

/**
 * Starts a frame's list of things moving through the grass (call before
 * addMover()).
 * @param {Object} inst - Grass inst
 */
export function beginMovers(inst) {
  inst.moverCount = 0
}

/**
 * Reports one thing on the ground that bends the grass it passes (its speed
 * comes from how far it moved since the last frame; the list's order must
 * stay the same from frame to frame for that).
 * @param {Object} inst - Grass inst
 * @param {number} x - World X of the thing
 * @param {number} reach - How far to each side it reaches (px); 0 for one that is not on the ground now
 */
export function addMover(inst, x, reach) {
  const i = inst.moverCount++
  const mover = inst.movers[i] ?? (inst.movers[i] = { x: 0, reach: 0, vx: 0 })
  mover.x = x
  mover.reach = reach
}

/**
 * Pushes the blades the movers pass and lets every blade in view swing.
 * @param {Object} inst - Grass inst
 * @param {number} dt - Frame delta
 * @param {{x1: number, x2: number}|null} view - Visible world X range
 */
export function onUpdate(inst, dt, view) {
  const step = Math.min(dt, MAX_DT)
  if (step <= 0) return
  measureMovers(inst, step)
  pushBlades(inst, step)
  swingBlades(inst.blades, step, view)
}

/**
 * Draws the blades in view.
 * @param {Object} inst - Grass inst
 * @param {{x1: number, x2: number}|null} view - Visible world X range
 */
export function onDraw(inst, view) {
  const blades = inst.blades
  const { k, atlas, posScratch, sizeScratch } = inst
  const from = view ? firstBladeAtOrAfter(blades, view.x1 - VIEW_PAD) : 0
  for (let i = from; i < blades.length; i++) {
    const blade = blades[i]
    if (view && !isWorldSpanInView(blade.x - VIEW_PAD, blade.x + VIEW_PAD, view)) break
    const cell = atlas.cells[blade.variant]
    posScratch.x = blade.x
    posScratch.y = blade.y
    sizeScratch.x = CELL_W * blade.scale
    sizeScratch.y = CELL_H * blade.scale
    k.drawSprite({
      sprite: ATLAS_SPRITE,
      quad: cell,
      width: sizeScratch.x,
      height: sizeScratch.y,
      pos: posScratch,
      anchor: 'bot',
      angle: (blade.rest + blade.ang) * RAD_TO_DEG,
      flipX: blade.flip
    })
  }
}
//
// One clump: a few tufts of blades round x, on the ground under each.
//
function plantClump(inst, rng, x, baseY) {
  const tufts = CLUMP_TUFTS_MIN + Math.floor(rng() * CLUMP_TUFTS_RANGE)
  for (let t = 0; t < tufts; t++) {
    const tx = x + (rng() * 2 - 1) * CLUMP_SPREAD
    const blades = TUFT_BLADES_MIN + Math.floor(rng() * TUFT_BLADES_RANGE)
    for (let b = 0; b < blades; b++) {
      const bx = tx + (rng() * 2 - 1) * TUFT_SPREAD
      const middle = 1 - Math.abs(bx - tx) / TUFT_SPREAD
      inst.blades.push({
        x: bx,
        y: baseY(bx) + ROOT_SINK,
        variant: Math.floor(rng() * BLADE_VARIANTS),
        flip: rng() < 0.5,
        scale: (BLADE_SCALE_MIN + rng() * BLADE_SCALE_RANGE) * (1 + middle * MIDDLE_TALLER),
        rest: (rng() * 2 - 1) * REST_LEAN,
        ang: 0,
        vel: 0,
        stiff: STIFF_MIN + rng() * STIFF_RANGE,
        damp: DAMP_MIN + rng() * DAMP_RANGE,
        push: PUSH_MIN + rng() * PUSH_RANGE,
        wrongWay: rng() < WRONG_WAY
      })
    }
  }
}
function byX(a, b) {
  return a.x - b.x
}
//
// Each mover's speed since last frame (zero for one that jumped).
//
function measureMovers(inst, dt) {
  for (let i = 0; i < inst.moverCount; i++) {
    const mover = inst.movers[i]
    const moved = mover.x - (inst.prevX[i] ?? mover.x)
    mover.vx = Math.abs(moved) > MOVER_MAX_STEP ? 0 : moved / dt
    inst.prevX[i] = mover.x
  }
}
//
// The blades within each mover's reach get pushed along its way.
//
function pushBlades(inst, dt) {
  const blades = inst.blades
  for (let m = 0; m < inst.moverCount; m++) {
    const mover = inst.movers[m]
    const speed = Math.abs(mover.vx)
    if (mover.reach <= 0 || speed < MOVER_MIN_SPEED) continue
    const share = Math.min(1, speed / MOVER_FULL_SPEED)
    const dir = Math.sign(mover.vx)
    for (let i = firstBladeAtOrAfter(blades, mover.x - mover.reach); i < blades.length; i++) {
      const blade = blades[i]
      if (blade.x > mover.x + mover.reach) break
      if (Math.random() > PUSH_CHANCE) continue
      const near = 1 - Math.abs(blade.x - mover.x) / mover.reach
      blade.vel += (blade.wrongWay ? -dir : dir) * PUSH * share * near * blade.push * dt
    }
  }
}
//
// Every blade in view swings on its spring; one at rest stays still.
//
function swingBlades(blades, dt, view) {
  const from = view ? firstBladeAtOrAfter(blades, view.x1 - VIEW_PAD) : 0
  for (let i = from; i < blades.length; i++) {
    const blade = blades[i]
    if (view && blade.x > view.x2 + VIEW_PAD) break
    if (blade.ang === 0 && blade.vel === 0) continue
    blade.vel += (-blade.stiff * blade.ang - blade.damp * blade.vel) * dt
    blade.ang = Math.max(-MAX_BEND, Math.min(MAX_BEND, blade.ang + blade.vel * dt))
    if (Math.abs(blade.ang) < REST_EPS && Math.abs(blade.vel) < REST_EPS) {
      blade.ang = 0
      blade.vel = 0
    }
  }
}
//
// Index of the first blade at or right of x (blades are sorted by x).
//
function firstBladeAtOrAfter(blades, x) {
  let lo = 0
  let hi = blades.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    blades[mid].x < x ? lo = mid + 1 : hi = mid
  }
  return lo
}
//
// The blade atlas of this live k: BLADE_VARIANTS blades side by side,
// each rooted at the bottom middle of its cell, baked once.
//
function bakeAtlas(k) {
  const cached = bakedByK.get(k)
  if (cached) return cached
  const rng = createSeededRandom(ATLAS_SEED)
  const w = BLADE_VARIANTS * (CELL_W + ATLAS_PAD)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = CELL_H
  const ctx = canvas.getContext('2d')
  const pal = FOREST_PAL.forestGrass
  const tones = [forestRgb(pal.shade), forestRgb(pal.base), forestRgb(pal.light)]
  const colors = { tip: forestRgb(pal.tip), gold: forestRgb(pal.dry), lit: forestRgb(pal.lit) }
  const cells = []
  for (let v = 0; v < BLADE_VARIANTS; v++) {
    const x0 = v * (CELL_W + ATLAS_PAD)
    paintBlade(ctx, rng, x0 + CELL_W / 2, CELL_H, tones[v % TONE_COUNT], colors)
    cells.push({ x: x0 / w, y: 0, w: CELL_W / w, h: 1 })
  }
  applyForestFilmGrainToCanvas(canvas, ATLAS_GRAIN_SEED)
  k.loadSprite(ATLAS_SPRITE, canvas)
  const baked = { cells }
  bakedByK.set(k, baked)
  return baked
}
//
// One blade: a curved, tapering leaf from its root (bx, by) up, with a body tone, a lit edge down one side and (rarely) a golden tip.
//
function paintBlade(ctx, rng, bx, by, tone, colors) {
  const height = BLADE_H_MIN + rng() * BLADE_H_RANGE
  const halfW = (BLADE_W_MIN + rng() * BLADE_W_RANGE) / 2
  const bend = (rng() < 0.5 ? -1 : 1) * (BLADE_BEND_MIN + rng() * BLADE_BEND_RANGE) * height
  const spine = []
  for (let i = 0; i <= BLADE_STEPS; i++) {
    const t = i / BLADE_STEPS
    spine.push({ x: bx + bend * t * t, y: by - height * t, half: halfW * Math.pow(1 - t, 0.7) })
  }
  fillBladeShape(ctx, spine, cssRgb(tone))
  paintBladeEdge(ctx, spine, cssRgb(colors.lit))
  rng() < TIP_GOLD_SHARE && paintBladeTip(ctx, spine, cssRgb(colors.gold))
  paintBladeTip(ctx, spine, cssRgb(colors.tip), 0.5)
}
//
// The blade's outline (left edge up, right edge down).
//
function fillBladeShape(ctx, spine, css) {
  ctx.fillStyle = css
  ctx.beginPath()
  spine.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x - p.half, p.y) : ctx.lineTo(p.x - p.half, p.y)))
  for (let i = spine.length - 1; i >= 0; i--) ctx.lineTo(spine[i].x + spine[i].half, spine[i].y)
  ctx.closePath()
  ctx.fill()
}
//
// A lit stripe along the lower-left part of the blade.
//
function paintBladeEdge(ctx, spine, css) {
  ctx.strokeStyle = css
  ctx.lineWidth = 1
  ctx.beginPath()
  const last = Math.floor(spine.length * BLADE_LIGHT_FRAC)
  for (let i = 1; i < last; i++) {
    const p = spine[i]
    i === 1 ? ctx.moveTo(p.x - p.half * 0.45, p.y) : ctx.lineTo(p.x - p.half * 0.45, p.y)
  }
  ctx.stroke()
}
//
// The top BLADE_TIP_FRAC of the blade in another colour (alpha as given).
//
function paintBladeTip(ctx, spine, css, alpha = 1) {
  const from = Math.floor(spine.length * (1 - BLADE_TIP_FRAC))
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = css
  ctx.beginPath()
  for (let i = from; i < spine.length; i++) ctx.lineTo(spine[i].x - spine[i].half * 0.6, spine[i].y)
  for (let i = spine.length - 1; i >= from; i--) ctx.lineTo(spine[i].x + spine[i].half * 0.6, spine[i].y)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}
