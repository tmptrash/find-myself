import * as BombTree from '../utils/forest-bomb-tree.js'
import * as ForestFootParticles from '../utils/forest-foot-particles.js'
import * as Sound from '../../../utils/sound.js'
import { FOREST_PAL, forestRgb } from '../utils/forest-palette.js'
//
// Pulsing bomb flower sitting in the fork of each bomb tree (its picture
// comes with the tree, utils/forest-bomb-tree.js). Landing near a tree jolts
// it; enough jolts drop the bomb, which spins down and bursts into shards on
// the ground like the hero's leaf death.
//
const TOMATO_PULSE_SPEED = 3.4
const TOMATO_PULSE_SPEED_PER_HIT = 2.2
const TOMATO_PULSE_AMP = 0.07
//
// Landing radius around the trunk and how many jolts shake the bomb loose.
//
const TOMATO_LAND_RADIUS = 120
const TOMATO_HITS_TO_DROP = 2
//
// Free fall from the fork, then a shard burst on the ground line.
//
const TOMATO_GRAVITY = 1800
const TOMATO_FALL_SPIN = 7
const TOMATO_BURST_COUNT = 42
const RAD_TO_DEG = 180 / Math.PI
const STATE_HANG = 'hang'
const STATE_FALL = 'fall'
const STATE_GONE = 'gone'
//
// After a burst the fork regrows its bomb so the player can shake it loose again.
//
const TOMATO_REGROW_SEC = 4.5
const TOMATO_GROW_SEC = 0.55
const TOMATO_GROW_MIN_SCALE = 0.12

/**
 * Creates one bomb per bomb tree.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {Object} cfg.earTrees - Bomb tree inst (bombs ride its forks)
 * @param {Object} cfg.particles - Forest foot-particle inst for the shard burst
 * @param {Object} cfg.sfx - Sound inst for the explosion
 * @param {number} cfg.groundY - Ground line Y where a falling bomb bursts
 * @param {Function} [cfg.onExplode] - (x, y) => void after a burst
 * @returns {Object} Bomb inst
 */
export function create(cfg) {
  const { k, earTrees, particles, sfx, groundY, onExplode } = cfg
  const tomatoes = earTrees.trees.map((tree, index) => {
    const seat = BombTree.getCrownTop(earTrees, index)
    return {
      index,
      state: STATE_HANG,
      hits: 0,
      x: seat.x,
      y: seat.y,
      vy: 0,
      spin: 0,
      regrowTimer: 0,
      growT: 1
    }
  })
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
 * Advances the pulse, keeps hanging bombs in their rocking forks and drops
 * falling ones until they burst on the ground.
 * @param {Object} inst - Bomb inst
 * @param {number} dt - Frame delta
 */
export function onUpdate(inst, dt) {
  inst.time += dt
  inst.tomatoes.forEach(tomato => updateTomato(inst, tomato, dt))
}

/**
 * Hero landed on the ground at heroX — jolts the nearest bomb tree in range
 * and drops its bomb after enough jolts.
 * @param {Object} inst - Bomb inst
 * @param {number} heroX - Hero world X at landing
 */
export function onHeroLanded(inst, heroX) {
  const tomato = inst.tomatoes.find(t =>
    t.state === STATE_HANG && Math.abs(inst.earTrees.trees[t.index].x - heroX) <= TOMATO_LAND_RADIUS)
  if (!tomato) return
  BombTree.shake(inst.earTrees, tomato.index)
  inst.sfx && !inst.sfx._forestSfxMuted && Sound.playForestEarTreeShake(inst.sfx)
  tomato.hits += 1
  tomato.hits >= TOMATO_HITS_TO_DROP && (tomato.state = STATE_FALL)
}

/**
 * One tree's bomb (its live x/y follow the fork or the fall).
 * @param {Object} inst - Bomb inst
 * @param {number} index - Bomb tree index
 * @returns {Object|null} The bomb
 */
export function bombAt(inst, index) {
  return inst?.tomatoes[index] ?? null
}

/**
 * Whether a bomb still hangs in its fork (not falling, not regrowing).
 * @param {Object} bomb - Bomb from bombAt()
 * @returns {boolean}
 */
export function isBombHanging(bomb) {
  return bomb.state === STATE_HANG
}

/**
 * Jolts each hanging bomb has taken so far (0 for fallen ones) — saved level state.
 * @param {Object} inst - Bomb inst
 * @returns {number[]}
 */
export function getHits(inst) {
  return inst.tomatoes.map(t => (t.state === STATE_HANG ? t.hits : 0))
}

/**
 * Restores saved jolt counts on hanging bombs (never enough to drop one).
 * @param {Object} inst - Bomb inst
 * @param {number[]} hits - Counts in tree order
 */
export function restoreHits(inst, hits) {
  inst.tomatoes.forEach((t, i) => {
    t.state === STATE_HANG && (t.hits = Math.min(TOMATO_HITS_TO_DROP - 1, Math.max(0, hits?.[i] ?? 0)))
  })
}

/**
 * Draws all bombs still in play (hanging or falling).
 * @param {Object} inst - Bomb inst
 * @param {number} [opacity=1] - Reveal fade shared with the trees
 */
export function onDraw(inst, opacity = 1) {
  inst.tomatoes.forEach(tomato => tomato.state !== STATE_GONE && drawTomato(inst, tomato, opacity))
}
function updateTomato(inst, tomato, dt) {
  if (tomato.state === STATE_HANG) {
    tomato.growT < 1 && (tomato.growT = Math.min(1, tomato.growT + dt / TOMATO_GROW_SEC))
    const seat = BombTree.getCrownTop(inst.earTrees, tomato.index)
    seat && (tomato.x = seat.x, tomato.y = seat.y)
    return
  }
  if (tomato.state === STATE_GONE) {
    if (tomato.regrowTimer > 0) {
      tomato.regrowTimer -= dt
      tomato.regrowTimer <= 0 && resetTomatoInFork(tomato, inst)
    }
    return
  }
  if (tomato.state !== STATE_FALL) return
  tomato.vy += TOMATO_GRAVITY * dt
  tomato.y += tomato.vy * dt
  tomato.spin += TOMATO_FALL_SPIN * dt
  tomato.y + bombHalfHeight(inst, tomato) >= inst.groundY && explodeTomato(inst, tomato)
}
function explodeTomato(inst, tomato) {
  tomato.state = STATE_GONE
  tomato.regrowTimer = TOMATO_REGROW_SEC
  const x = tomato.x
  const y = inst.groundY - bombHalfHeight(inst, tomato)
  const c = FOREST_PAL.forestTomato
  const palette = [c.body, c.light, c.petal, c.spike].map(forestRgb)
  ForestFootParticles.spawnLeafBurst(inst.particles, x, y, palette, TOMATO_BURST_COUNT, inst.groundY)
  inst.sfx && !inst.sfx._forestSfxMuted && Sound.playForestTomatoExplosion(inst.sfx)
  inst.onExplode?.(x, y)
}
function resetTomatoInFork(tomato, inst) {
  tomato.state = STATE_HANG
  tomato.hits = 0
  tomato.vy = 0
  tomato.spin = 0
  tomato.regrowTimer = 0
  tomato.growT = 0
  const seat = BombTree.getCrownTop(inst.earTrees, tomato.index)
  seat && (tomato.x = seat.x, tomato.y = seat.y)
}
//
// Half the height of a bomb's picture (0 before the bake).
//
function bombHalfHeight(inst, tomato) {
  return (BombTree.getBombLook(inst.earTrees, tomato.index)?.h ?? 0) / 2
}
function tomatoGrowScale(tomato) {
  const t = tomato.growT ?? 1
  if (t >= 1) return 1
  const eased = 1 - (1 - t) * (1 - t)
  return TOMATO_GROW_MIN_SCALE + (1 - TOMATO_GROW_MIN_SCALE) * eased
}
//
// The bomb flower picture, pulsing faster with every jolt, growing back after
// a burst and spinning while it falls.
//
function drawTomato(inst, tomato, opacity) {
  const look = BombTree.getBombLook(inst.earTrees, tomato.index)
  if (!look) return
  const k = inst.k
  const pulseSpeed = TOMATO_PULSE_SPEED + tomato.hits * TOMATO_PULSE_SPEED_PER_HIT
  const scale = tomatoGrowScale(tomato) * (1 + Math.sin(inst.time * pulseSpeed + tomato.index) * TOMATO_PULSE_AMP)
  k.drawSprite({
    sprite: look.sprite,
    pos: k.vec2(tomato.x, tomato.y),
    anchor: 'center',
    angle: tomato.spin * RAD_TO_DEG,
    width: look.w * scale,
    height: look.h * scale,
    opacity
  })
}
