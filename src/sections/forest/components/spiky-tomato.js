import * as EarTree from '../utils/forest-ear-tree.js'
import * as ForestFootParticles from '../utils/forest-foot-particles.js'
import * as Sound from '../../../utils/sound.js'
import { FOREST_PAL, forestRgb } from '../utils/forest-palette.js'
//
// Pulsing spiky tomato "grenade" sitting on the crown of each lip-tree.
// Landing near a tree jolts it; the third jolt drops the tomato, which bursts
// into shards on the ground like the hero's leaf death.
//
const TOMATO_RADIUS = 11
//
// The tomato sinks this far onto the crown so the trunk tip hides behind it.
//
//
// Negative lifts the fruit onto the crown so the trunk tip and rim hide under it.
//
const TOMATO_CROWN_SINK = -1
const TOMATO_PULSE_SPEED = 3.4
const TOMATO_PULSE_SPEED_PER_HIT = 2.2
const TOMATO_PULSE_AMP = 0.07
const TOMATO_OUTLINE_PX = 1.5
const TOMATO_HIGHLIGHT_R = 0.32
const TOMATO_HIGHLIGHT_OFFSET = 0.38
const TOMATO_SHADE_R = 0.78
const TOMATO_SHADE_OFFSET_Y = 0.2
const TOMATO_SPIKE_COUNT = 5
const TOMATO_SPIKE_LEN = 4
const TOMATO_SPIKE_HALF_RAD = 0.22
const TOMATO_SPIKE_OUTLINE_PX = 1.2
//
// Bud reads as a flower: pointed petals ring a smaller red core.
//
const TOMATO_BUD_SCALE = 0.72
const TOMATO_PETAL_COUNT = 6
const TOMATO_PETAL_BASE = 0.5
const TOMATO_PETAL_LEN = 1.05
const TOMATO_PETAL_HALF_W = 0.42
const TOMATO_PETAL_SEGMENTS = 5
const TOMATO_PETAL_OUTLINE_PX = 1
const TOMATO_PETAL_SPIN_OFFSET = Math.PI / TOMATO_PETAL_COUNT
const TOMATO_PETAL_RIB_LEN = 0.75
const TOMATO_PETAL_RIB_W = 1.4
const TOMATO_STAMEN_R = 0.2
//
// Landing radius around the trunk and how many jolts shake the tomato loose.
//
const TOMATO_LAND_RADIUS = 120
const TOMATO_HITS_TO_DROP = 2
//
// Free fall from the crown, then a shard burst on the ground line.
//
const TOMATO_GRAVITY = 1800
const TOMATO_FALL_SPIN = 7
const TOMATO_BURST_COUNT = 42
const STATE_HANG = 'hang'
const STATE_FALL = 'fall'
const STATE_GONE = 'gone'
//
// After a burst the crown regrows so the player can shake it loose again.
//
const TOMATO_REGROW_SEC = 4.5
const TOMATO_GROW_SEC = 0.55
const TOMATO_GROW_MIN_SCALE = 0.12

/**
 * Creates one spiky tomato per lip-tree.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {Object} cfg.earTrees - Ear-tree inst (tomatoes ride its crowns)
 * @param {Object} cfg.particles - Forest foot-particle inst for the shard burst
 * @param {Object} cfg.sfx - Sound inst for the explosion
 * @param {number} cfg.groundY - Ground line Y where a falling tomato bursts
 * @param {Function} [cfg.onExplode] - (x, y) => void after a burst
 * @returns {Object} Spiky tomato inst
 */
export function create(cfg) {
  const { k, earTrees, particles, sfx, groundY, onExplode } = cfg
  const tomatoes = earTrees.trees.map((tree, index) => ({
    index,
    state: STATE_HANG,
    hits: 0,
    x: tree.x,
    y: tree.groundY - tree.trunkH - TOMATO_RADIUS + TOMATO_CROWN_SINK,
    vy: 0,
    spin: 0,
    regrowTimer: 0,
    growT: 1
  }))
  return {
    k,
    earTrees,
    particles,
    sfx,
    groundY,
    onExplode,
    time: 0,
    tomatoes
  }
}

/**
 * Advances the pulse, keeps hanging tomatoes on their rocking crowns and
 * drops falling ones until they burst on the ground.
 * @param {Object} inst - Spiky tomato inst
 * @param {number} dt - Frame delta
 */
export function onUpdate(inst, dt) {
  inst.time += dt
  inst.tomatoes.forEach(tomato => updateTomato(inst, tomato, dt))
}

/**
 * Hero landed on the ground at heroX — jolts the nearest lip-tree in range and
 * drops its tomato on the third jolt.
 * @param {Object} inst - Spiky tomato inst
 * @param {number} heroX - Hero world X at landing
 */
export function onHeroLanded(inst, heroX) {
  const tomato = inst.tomatoes.find(t =>
    t.state === STATE_HANG && Math.abs(inst.earTrees.trees[t.index].x - heroX) <= TOMATO_LAND_RADIUS)
  if (!tomato) return
  EarTree.shake(inst.earTrees, tomato.index)
  inst.sfx && !inst.sfx._forestSfxMuted && Sound.playForestEarTreeShake(inst.sfx)
  tomato.hits += 1
  tomato.hits >= TOMATO_HITS_TO_DROP && (tomato.state = STATE_FALL)
}

/**
 * Jolts each hanging tomato has taken so far (0 for fallen ones) — saved level state.
 * @param {Object} inst - Spiky tomato inst
 * @returns {number[]}
 */
export function getHits(inst) {
  return inst.tomatoes.map(t => (t.state === STATE_HANG ? t.hits : 0))
}

/**
 * Restores saved jolt counts on hanging tomatoes (never enough to drop one).
 * @param {Object} inst - Spiky tomato inst
 * @param {number[]} hits - Counts in tree order
 */
export function restoreHits(inst, hits) {
  inst.tomatoes.forEach((t, i) => {
    t.state === STATE_HANG && (t.hits = Math.min(TOMATO_HITS_TO_DROP - 1, Math.max(0, hits?.[i] ?? 0)))
  })
}

/**
 * Draws all tomatoes still in play (hanging or falling).
 * @param {Object} inst - Spiky tomato inst
 * @param {number} [opacity=1] - Reveal fade shared with the lip-trees
 */
export function onDraw(inst, opacity = 1) {
  const k = inst.k
  const colors = resolveTomatoColors(k)
  inst.tomatoes.forEach(tomato => tomato.state !== STATE_GONE && drawTomato(inst, tomato, colors, opacity))
}
function updateTomato(inst, tomato, dt) {
  if (tomato.state === STATE_HANG) {
    tomato.growT < 1 && (tomato.growT = Math.min(1, tomato.growT + dt / TOMATO_GROW_SEC))
    const crown = EarTree.getCrownTop(inst.earTrees, tomato.index)
    crown && (tomato.x = crown.x, tomato.y = crown.y - TOMATO_RADIUS + TOMATO_CROWN_SINK)
    return
  }
  if (tomato.state === STATE_GONE) {
    if (tomato.regrowTimer > 0) {
      tomato.regrowTimer -= dt
      tomato.regrowTimer <= 0 && resetTomatoOnCrown(tomato, inst)
    }
    return
  }
  if (tomato.state !== STATE_FALL) return
  tomato.vy += TOMATO_GRAVITY * dt
  tomato.y += tomato.vy * dt
  tomato.spin += TOMATO_FALL_SPIN * dt
  tomato.y + TOMATO_RADIUS >= inst.groundY && explodeTomato(inst, tomato)
}
function explodeTomato(inst, tomato) {
  tomato.state = STATE_GONE
  tomato.regrowTimer = TOMATO_REGROW_SEC
  const x = tomato.x
  const y = inst.groundY - TOMATO_RADIUS
  const c = FOREST_PAL.forestTomato
  const palette = [c.body, c.light, c.petal, c.spike].map(forestRgb)
  ForestFootParticles.spawnLeafBurst(inst.particles, x, y, palette, TOMATO_BURST_COUNT, inst.groundY)
  inst.sfx && !inst.sfx._forestSfxMuted && Sound.playForestTomatoExplosion(inst.sfx)
  inst.onExplode?.(x, y)
}
function resetTomatoOnCrown(tomato, inst) {
  tomato.state = STATE_HANG
  tomato.hits = 0
  tomato.vy = 0
  tomato.spin = 0
  tomato.regrowTimer = 0
  tomato.growT = 0
  const crown = EarTree.getCrownTop(inst.earTrees, tomato.index)
  crown && (tomato.x = crown.x, tomato.y = crown.y - TOMATO_RADIUS + TOMATO_CROWN_SINK)
}
function tomatoGrowScale(tomato) {
  const t = tomato.growT ?? 1
  if (t >= 1) return 1
  const eased = 1 - (1 - t) * (1 - t)
  return TOMATO_GROW_MIN_SCALE + (1 - TOMATO_GROW_MIN_SCALE) * eased
}
function resolveTomatoColors(k) {
  const c = FOREST_PAL.forestTomato
  const toK = hex => {
    const rgb = forestRgb(hex)
    return k.rgb(rgb.r, rgb.g, rgb.b)
  }
  return {
    body: toK(c.body),
    light: toK(c.light),
    dark: toK(c.dark),
    outline: toK(c.outline),
    spike: toK(c.spike),
    petal: toK(c.petal),
    petalLight: toK(c.petalLight),
    stamen: toK(c.stamen)
  }
}
//
// Green sepals and pink petals behind a small red bud with a pollen dot.
//
function drawTomato(inst, tomato, colors, opacity) {
  const k = inst.k
  const pulseSpeed = TOMATO_PULSE_SPEED + tomato.hits * TOMATO_PULSE_SPEED_PER_HIT
  const grow = tomatoGrowScale(tomato)
  const r = TOMATO_RADIUS * grow * (1 + Math.sin(inst.time * pulseSpeed + tomato.index) * TOMATO_PULSE_AMP)
  const bud = r * TOMATO_BUD_SCALE
  const { x, y, spin } = tomato
  drawTomatoSpikes(k, x, y, r, spin, colors, opacity)
  drawTomatoPetals(k, x, y, r, spin + TOMATO_PETAL_SPIN_OFFSET, colors, opacity)
  k.drawCircle({ pos: k.vec2(x, y), radius: bud + TOMATO_OUTLINE_PX, color: colors.outline, opacity })
  k.drawCircle({ pos: k.vec2(x, y), radius: bud, color: colors.dark, opacity })
  k.drawCircle({ pos: k.vec2(x, y - bud * TOMATO_SHADE_OFFSET_Y), radius: bud * TOMATO_SHADE_R, color: colors.body, opacity })
  k.drawCircle({
    pos: k.vec2(x - bud * TOMATO_HIGHLIGHT_OFFSET, y - bud * TOMATO_HIGHLIGHT_OFFSET),
    radius: bud * TOMATO_HIGHLIGHT_R,
    color: colors.light,
    opacity
  })
  k.drawCircle({ pos: k.vec2(x, y), radius: bud * TOMATO_STAMEN_R, color: colors.stamen, opacity })
}
//
// Pointed oval petals radiating from the bud rim, each with a light midrib.
//
function drawTomatoPetals(k, x, y, r, spin, colors, opacity) {
  const len = r * TOMATO_PETAL_LEN
  const halfW = r * TOMATO_PETAL_HALF_W
  for (let i = 0; i < TOMATO_PETAL_COUNT; i++) {
    const a = spin + (i / TOMATO_PETAL_COUNT) * Math.PI * 2
    const pts = petalPoints(k, x, y, a, r * TOMATO_BUD_SCALE * TOMATO_PETAL_BASE, len, halfW)
    k.drawPolygon({
      pts,
      color: colors.petal,
      outline: { width: TOMATO_PETAL_OUTLINE_PX, color: colors.outline },
      opacity
    })
    const ribFrom = r * TOMATO_BUD_SCALE
    const ribTo = r * TOMATO_BUD_SCALE * TOMATO_PETAL_BASE + len * TOMATO_PETAL_RIB_LEN
    k.drawLine({
      p1: k.vec2(x + Math.cos(a) * ribFrom, y + Math.sin(a) * ribFrom),
      p2: k.vec2(x + Math.cos(a) * ribTo, y + Math.sin(a) * ribTo),
      width: TOMATO_PETAL_RIB_W,
      color: colors.petalLight,
      opacity
    })
  }
}
function petalPoints(k, x, y, angle, base, len, halfW) {
  const ca = Math.cos(angle)
  const sa = Math.sin(angle)
  const side = []
  for (let s = 0; s <= TOMATO_PETAL_SEGMENTS; s++) {
    const t = s / TOMATO_PETAL_SEGMENTS
    side.push({ along: base + len * t, w: Math.sin(t * Math.PI) * halfW })
  }
  const toPt = (along, w) => k.vec2(x + ca * along - sa * w, y + sa * along + ca * w)
  return [
    ...side.map(p => toPt(p.along, p.w)),
    ...side.slice(1, -1).reverse().map(p => toPt(p.along, -p.w))
  ]
}
function drawTomatoSpikes(k, x, y, r, spin, colors, opacity) {
  for (let i = 0; i < TOMATO_SPIKE_COUNT; i++) {
    const a = spin + (i / TOMATO_SPIKE_COUNT) * Math.PI * 2
    const tipR = r + TOMATO_SPIKE_LEN
    const pts = [
      k.vec2(x + Math.cos(a - TOMATO_SPIKE_HALF_RAD) * r, y + Math.sin(a - TOMATO_SPIKE_HALF_RAD) * r),
      k.vec2(x + Math.cos(a) * tipR, y + Math.sin(a) * tipR),
      k.vec2(x + Math.cos(a + TOMATO_SPIKE_HALF_RAD) * r, y + Math.sin(a + TOMATO_SPIKE_HALF_RAD) * r)
    ]
    k.drawPolygon({
      pts,
      color: colors.spike,
      outline: { width: TOMATO_SPIKE_OUTLINE_PX, color: colors.outline },
      opacity
    })
  }
}
