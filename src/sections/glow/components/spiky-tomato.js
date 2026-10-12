import * as EarTree from '../utils/glow-ear-tree.js'
import * as GlowFootParticles from '../utils/glow-foot-particles.js'
import * as Sound from '../../../utils/sound.js'
import { GLOW_PAL, glowRgb } from '../utils/glow-palette.js'
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
const TOMATO_SPIKE_COUNT = 9
const TOMATO_SPIKE_LEN = 6
const TOMATO_SPIKE_HALF_RAD = 0.2
const TOMATO_SPIKE_OUTLINE_PX = 1.2
//
// Landing radius around the trunk and how many jolts shake the tomato loose.
//
const TOMATO_LAND_RADIUS = 120
const TOMATO_HITS_TO_DROP = 3
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
 * @param {Object} cfg.particles - Glow foot-particle inst for the shard burst
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
  inst.sfx && !inst.sfx._glowSfxMuted && Sound.playGlowEarTreeShake(inst.sfx)
  tomato.hits += 1
  tomato.hits >= TOMATO_HITS_TO_DROP && (tomato.state = STATE_FALL)
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
  const c = GLOW_PAL.glowTomato
  const palette = [c.body, c.light, c.dark, c.spike].map(glowRgb)
  GlowFootParticles.spawnLeafBurst(inst.particles, x, y, palette, TOMATO_BURST_COUNT, inst.groundY)
  inst.sfx && !inst.sfx._glowSfxMuted && Sound.playGlowTomatoExplosion(inst.sfx)
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
  const c = GLOW_PAL.glowTomato
  const toK = hex => {
    const rgb = glowRgb(hex)
    return k.rgb(rgb.r, rgb.g, rgb.b)
  }
  return {
    body: toK(c.body),
    light: toK(c.light),
    dark: toK(c.dark),
    outline: toK(c.outline),
    spike: toK(c.spike)
  }
}
//
// Spikes behind the body, then outline, shaded body and highlight.
//
function drawTomato(inst, tomato, colors, opacity) {
  const k = inst.k
  const pulseSpeed = TOMATO_PULSE_SPEED + tomato.hits * TOMATO_PULSE_SPEED_PER_HIT
  const grow = tomatoGrowScale(tomato)
  const r = TOMATO_RADIUS * grow * (1 + Math.sin(inst.time * pulseSpeed + tomato.index) * TOMATO_PULSE_AMP)
  const { x, y, spin } = tomato
  drawTomatoSpikes(k, x, y, r, spin, colors, opacity)
  k.drawCircle({ pos: k.vec2(x, y), radius: r + TOMATO_OUTLINE_PX, color: colors.outline, opacity })
  k.drawCircle({ pos: k.vec2(x, y), radius: r, color: colors.dark, opacity })
  k.drawCircle({ pos: k.vec2(x, y - r * TOMATO_SHADE_OFFSET_Y), radius: r * TOMATO_SHADE_R, color: colors.body, opacity })
  k.drawCircle({
    pos: k.vec2(x - r * TOMATO_HIGHLIGHT_OFFSET, y - r * TOMATO_HIGHLIGHT_OFFSET),
    radius: r * TOMATO_HIGHLIGHT_R,
    color: colors.light,
    opacity
  })
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
