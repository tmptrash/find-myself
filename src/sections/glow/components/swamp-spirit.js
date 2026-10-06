import { CFG } from '../../../cfg.js'
import { getRGB } from '../../../utils/helper.js'
import { GLOW_PAL, isGlowGrayExploreBeforeL } from '../utils/glow-palette.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import * as Sound from '../../../utils/sound.js'
import * as Hero from '../../../components/hero.js'
import { isGlowEyesGameplayUnlocked } from '../utils/glow-eye-intro.js'

//
// Timid bog growth. Pose is a spring chain solved every frame — there is no
// baked idle or hide cycle. It watches, and any real hero motion nearby
// yanks it back into the soil.
//
const DRAW_Z = CFG.visual.zIndex.player - 0.4
//
// Inside this span a hero step still snaps the spirit underground.
// Farther out, up to the creep span, it only sinks as the hero gets closer.
//
const HIDE_RADIUS = 220
const CREEP_RADIUS = 460
const CREEP_FLOOR = 0.36
//
// Inside this span the spirit stays buried. Two hide-radii out, it whistles with shut eyes.
//
const CLOSE_RADIUS = 80
const FLUSH_HIDE_RADIUS = 72
const HEAD_CLEAR = 14
const BELLY_SEAM_POINTS = 11
const FAR_RADIUS = HIDE_RADIUS * 2
const WHISTLE_HEAR_RADIUS = FAR_RADIUS * 1.35
const OBSERVE_RADIUS_Y = 170
const SPIRIT_NOTE_OFFSET_X = -14
const SPIRIT_NOTE_OFFSET_Y = -10
const SPIRIT_NOTE_LIFETIME = 2.1
const SPIRIT_NOTE_RISE_SPEED = 26
const SPIRIT_NOTE_DRIFT_AMPLITUDE = 14
const SPIRIT_NOTE_DRIFT_FREQ = 1.35
const SPIRIT_NOTE_GLYPHS = ['♪', '♫', '♩', '♬']
const SPIRIT_WHISTLE_NOTE_BURST = 3
const BODY_HALF = 12
const BASE_SINK = 1
const CAP_RATIO = 12 / 15
const OUTLINE_STROKE = 1.85
const EYE_RADIUS_LEFT = 6.4
const EYE_RADIUS_RIGHT = 5.4
const ARC_STEPS = 4
const CROWN_APEX_Y_EPS = 1
const CURIOUS_STILL = 2.5
const HIDE_DELAY_MIN = 1
const HIDE_DELAY_MAX = 4
const STARTLE_HOLD_MIN = 0.05
const STARTLE_HOLD_MAX = 0.15
const HERO_MOVE_SPEED = 36
const HERO_JUMP_SPEED = 70
const BODY_REST = [0, 17, 38, 64]
const BELLY_BODY_H = BODY_REST[BODY_REST.length - 1]
const CHAIN_STIFF = [0, 86, 48, 26]
const CHAIN_DAMP = [0, 9, 7.2, 5.4]
const SAMPLE_COUNT = 8
const QUAD_SHAPE = [[0, 0], [0, 0], [0, 0], [0, 0]]
const QUAD_INDEX = [0, 1, 2, 0, 2, 3]
const SAMPLES = Array.from({ length: SAMPLE_COUNT }, () => ({ x: 0, y: 0, t: 0 }))
const RING = Array.from({ length: 36 }, () => ({ x: 0, y: 0 }))

/**
 * Creates a swamp spirit rooted on the terrain query.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.x - First burrow X
 * @param {number} cfg.minX - Leftmost burrow
 * @param {number} cfg.maxX - Rightmost burrow
 * @param {function(number): number} cfg.groundAt - Surface Y under a world X (up is smaller)
 * @param {Object} cfg.hero - Hero inst
 * @param {Object} cfg.zones - Level zones
 * @param {Object} [cfg.sfx] - Shared Sound inst
 * @param {Function} [cfg.notePostBake] - Grain pass for mouth-note glyphs
 * @param {Function} [cfg.branchMushroomX] - Left trampoline centre X
 * @param {Function} [cfg.rightMushroomX] - Right trampoline centre X
 * @param {Function} [cfg.branchMushroomShown] - Left trampoline visible
 * @param {Function} [cfg.rightMushroomShown] - Right trampoline visible
 * @returns {Object} Swamp spirit inst
 */
export function create(cfg) {
  const inst = {
    k: cfg.k,
    sfx: cfg.sfx,
    hero: cfg.hero,
    zones: cfg.zones,
    groundAt: cfg.groundAt,
    minX: cfg.minX,
    maxX: cfg.maxX,
    homeX: cfg.x,
    holdRadius: cfg.holdRadius ?? CLOSE_RADIUS,
    branchMushroomX: cfg.branchMushroomX ?? null,
    rightMushroomX: cfg.rightMushroomX ?? null,
    branchMushroomShown: cfg.branchMushroomShown ?? null,
    rightMushroomShown: cfg.rightMushroomShown ?? null,
    burrowPhase: null,
    pendingBurrowX: null,
    retired: false,
    holeX: cfg.x,
    state: 'emerging',
    stateTime: 0,
    wait: 0,
    startleHold: 0.1,
    rise: 0.08,
    riseVel: 0,
    bob: 0,
    bobVel: 0,
    lean: 0,
    leanVel: 0,
    leanDrift: 0,
    sway: 0,
    swayVel: 0,
    swayTarget: 0,
    swayIn: 0.4,
    stillTime: 0,
    moveDir: 0,
    impulseIn: 0.3 + Math.random() * 0.6,
    mound: 0,
    slope: 0,
    whistleIn: 1.5,
    eyesShut: false,
    gaze: { px: 0, py: 0, tx: 0, ty: 0, hold: 0.6, mode: 'lookHero', open: 1, jitter: 0 },
    bellySeam: buildBellySeamProfile(cfg.x),
    batch: PolyBatch.create(),
    chain: BODY_REST.map(() => ({ x: cfg.x, y: 0, vx: 0, vy: 0 })),
    eyes: [],
    motes: Array.from({ length: 14 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1 })),
    whistleNotes: []
  }
  cfg.notePostBake && Hero.ensureIdleNoteGlyphs(cfg.k, cfg.notePostBake)
  buryChain(inst, cfg.x)
  initEyes(inst)
  inst.obj = cfg.k.add([
    cfg.k.z(DRAW_Z),
    {
      draw() {
        drawSpirit(inst)
      }
    }
  ])
  return inst
}

/**
 * True when the hero is far enough that the spirit relaxes and shuts its eyes
 * (same distance test as tickEyes, so the mushroom hint matches the lids).
 * @param {Object} inst - Swamp spirit inst
 * @param {{ x: number, y: number }|null} hero
 * @returns {boolean}
 */
export function isHeroFarEnoughToShutEyes(inst, hero) {
  return Boolean(hero) && heroFar(inst, hero)
}

/**
 * True after the right trampoline is out — the spirit no longer appears.
 * @param {Object} inst - Swamp spirit inst
 * @returns {boolean}
 */
export function isSpiritRetired(inst) {
  return Boolean(inst?.retired)
}

/**
 * Whistle, emerge, and startle stay quiet while the left trampoline sprite
 * is still hidden. The bury sound and the mushroom hint still play.
 * @param {Object} inst - Swamp spirit inst
 * @returns {boolean}
 */
export function isSpiritSensoryMuted(inst) {
  if (!inst || inst.retired) return true
  const phase = inst.burrowPhase === 'right' ? 'right' : 'left'
  if (phase === 'right') return false
  return !Boolean(inst.branchMushroomShown?.())
}

/**
 * Steps the state machine, the body springs and the eyes.
 * @param {Object} inst
 * @param {number} dt
 */
export function update(inst, dt) {
  if (!inst || dt <= 0) return
  if (!isSpiritGameplayActive(inst)) {
    parkUntilG(inst)
    return
  }
  syncBurrowPhase(inst)
  wakeSpiritLive(inst)
  if (inst.retired) {
    inst.obj && (inst.obj.hidden = true)
    return
  }
  inst.obj && (inst.obj.hidden = false)
  const hero = heroPoint(inst)
  const near = heroNear(inst, hero)
  const moving = heroIsMoving(inst)
  tickState(inst, dt, hero, near, moving)
  tickRise(inst, dt, hero)
  tickLean(inst, dt, hero, near)
  tickSway(inst, dt)
  tickBob(inst, dt)
  tickChain(inst, dt)
  tickEyes(inst, dt, hero)
  tickWhistle(inst, dt)
  tickWhistleNotes(inst, dt)
  tickMotes(inst, dt)
  inst.mound = Math.max(0, inst.mound - dt * 0.8)
  inst.stateTime += dt
}
//
// State machine: hidden, emerging, observe, curious, startled, hiding.
//
function tickState(inst, dt, hero, near, moving) {
  if (inst.retired) return
  const showing = inst.rise > 0.05 &&
    inst.state !== 'hidden' && inst.state !== 'hiding' && inst.state !== 'startled'
  if (showing && heroFlush(inst, hero)) {
    enterState(inst, 'startled')
    return
  }
  const visible = inst.state === 'observe' || inst.state === 'curious' ||
    (inst.state === 'emerging' && inst.rise > 0.28)
  if (visible && near && moving) {
    enterState(inst, 'startled')
    return
  }
  if (inst.state === 'emerging' && inst.rise > 0.9 && inst.stateTime > 0.42) {
    enterState(inst, 'observe')
    return
  }
  if (inst.state === 'observe') {
    inst.stillTime = near && !moving ? inst.stillTime + dt : 0
    inst.stillTime >= CURIOUS_STILL && enterState(inst, 'curious')
    return
  }
  if (inst.state === 'curious') {
    if (!near) enterState(inst, 'observe')
    return
  }
  if (inst.state === 'startled' && inst.stateTime >= inst.startleHold) {
    enterState(inst, 'hiding')
    return
  }
  if (inst.state === 'hiding' && inst.rise < 0.035 && inst.stateTime > 0.1) {
    enterState(inst, 'hidden')
    return
  }
  if (inst.state === 'hidden' && inst.stateTime >= inst.wait && !heroTooClose(inst, hero)) {
    enterState(inst, 'emerging')
  }
}
//
// Applies one transition, including the short sounds and the bury hop.
//
function enterState(inst, next) {
  if (inst.state === next) return
  inst.state = next
  inst.stateTime = 0
  if (next === 'emerging') {
    playSpiritSfx(inst, Sound.playGlowSwampSpiritEmerge)
    inst.riseVel = Math.max(inst.riseVel, 0.4)
    return
  }
  if (next === 'startled') {
    inst.startleHold = STARTLE_HOLD_MIN + Math.random() * (STARTLE_HOLD_MAX - STARTLE_HOLD_MIN)
    const head = inst.chain[3]
    head.vy -= 70 + Math.random() * 40
    head.vx += (Math.random() - 0.5) * 50
    inst.gaze.mode = 'startled'
    inst.gaze.open = 1.45
    inst.eyesShut = false
    burst(inst, 5, -1)
    playSpiritSfx(inst, Sound.playGlowSwampSpiritStartle)
    return
  }
  if (next === 'hiding') {
    inst.riseVel = Math.min(inst.riseVel, -0.2)
    inst.mound = 1
    puffFromBase(inst)
    playSpiritSfx(inst, Sound.playGlowSwampSpiritHide, true)
    return
  }
  if (next === 'hidden') {
    const burrowX = inst.pendingBurrowX != null ? inst.pendingBurrowX : nextBurrowX(inst)
    inst.pendingBurrowX = null
    buryChain(inst, burrowX)
    inst.mound = 0
    inst.wait = HIDE_DELAY_MIN + Math.random() * (HIDE_DELAY_MAX - HIDE_DELAY_MIN)
    inst.stillTime = 0
    inst.bob = 0
    inst.bobVel = 0
    return
  }
  if (next === 'observe') inst.stillTime = 0
}
//
// How far out of the soil the body is trying to be.
//
function riseTarget(inst, hero) {
  if (inst.state === 'hidden' || inst.state === 'hiding') return 0
  if (heroTooClose(inst, hero) && inst.state !== 'startled') return 0
  if (inst.state === 'startled') return 1.04
  const creep = proximityScale(inst, hero)
  if (inst.state === 'curious') return Math.min(1.14, 0.82 * creep + 0.22)
  if (inst.state === 'emerging') return Math.max(creep, 0.2)
  return 0.92 * creep
}
//
// Rise uses its own spring so hide can be much stiffer than idle.
//
function tickRise(inst, dt, hero) {
  const hiding = inst.state === 'hiding'
  const buried = heroTooClose(inst, hero)
  const stiff = hiding ? 460 : inst.state === 'startled' ? 80 : inst.state === 'emerging' ? 36 : buried ? 26 : 8
  const damp = hiding ? 14 : 5.4
  inst.riseVel += (riseTarget(inst, hero) - inst.rise) * stiff * dt
  inst.riseVel *= Math.exp(-damp * dt)
  inst.rise = Math.max(0, Math.min(1.28, inst.rise + inst.riseVel * dt))
}
//
// Lean toward the hero when they are close and still, otherwise a slow drift.
//
function tickLean(inst, dt, hero, near) {
  inst.leanDrift += (Math.random() - 0.5) * dt * 1.4
  inst.leanDrift *= Math.exp(-0.6 * dt)
  let target = inst.leanDrift * 5
  if (near && hero && (inst.state === 'observe' || inst.state === 'curious')) {
    const want = (hero.x - inst.holeX) * (inst.state === 'curious' ? 0.045 : 0.028)
    target = clamp(want, -9, 9)
  }
  inst.leanVel += (target - inst.lean) * 8 * dt
  inst.leanVel *= Math.exp(-4.5 * dt)
  inst.lean += inst.leanVel * dt
}
//
// Slow side-to-side rock while any of the body is above the soil.
//
function tickSway(inst, dt) {
  const live = inst.rise > 0.1 && inst.state !== 'hidden' && inst.state !== 'hiding'
  if (!live) {
    inst.swayVel += -inst.sway * 18 * dt
    inst.swayVel *= Math.exp(-6 * dt)
    inst.sway += inst.swayVel * dt
    return
  }
  inst.swayIn -= dt
  if (inst.swayIn <= 0) {
    inst.swayTarget = (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 3.5)
    inst.swayIn = 0.5 + Math.random() * 0.75
  }
  inst.swayVel += (inst.swayTarget - inst.sway) * 5.5 * dt
  inst.swayVel *= Math.exp(-2.1 * dt)
  inst.sway += inst.swayVel * dt
}
//
// Idle lift is a damped spring kicked by rare impulses, not a sine wave.
//
function tickBob(inst, dt) {
  const live = inst.state === 'observe' || inst.state === 'curious'
  if (!live) {
    inst.bobVel += -inst.bob * 30 * dt
    inst.bobVel *= Math.exp(-8 * dt)
    inst.bob += inst.bobVel * dt
    return
  }
  inst.impulseIn -= dt
  if (inst.impulseIn <= 0) {
    const curious = inst.state === 'curious'
    inst.bobVel += (curious ? 16 : 7) + Math.random() * (curious ? 22 : 14)
    inst.impulseIn = (curious ? 0.35 : 0.55) + Math.random() * (curious ? 0.9 : 1.3)
  }
  const stiff = inst.state === 'curious' ? 11 : 16
  inst.bobVel += -inst.bob * stiff * dt
  inst.bobVel *= Math.exp(-(curiousDamp(inst)) * dt)
  inst.bob += inst.bobVel * dt
}
//
// Curious swaying settles a little slower than plain watching.
//
function curiousDamp(inst) {
  return inst.state === 'curious' ? 2.4 : 3.6
}
//
// Each link chases the one below it. The head spring is soft, so it lags and overshoots.
//
function tickChain(inst, dt) {
  const yL = inst.groundAt(inst.holeX - 10)
  const yR = inst.groundAt(inst.holeX + 10)
  inst.slope = (yR - yL) / 20
  const gx = inst.holeX
  const gy = inst.groundAt(inst.holeX)
  const ux = -inst.slope
  const uy = -1
  const ulen = Math.hypot(ux, uy) || 1
  const upX = ux / ulen
  const upY = uy / ulen
  const root = inst.chain[0]
  root.x = gx
  root.y = gy
  root.vx = 0
  root.vy = 0
  const hiding = inst.state === 'hiding' || inst.state === 'hidden'
  for (let i = 1; i < inst.chain.length; i++) {
    const along = BODY_REST[i] * inst.rise
    const lead = i / (inst.chain.length - 1)
    const tx = gx + upX * along + (inst.lean + inst.sway) * lead
    const ty = gy + upY * along - inst.bob * lead
    const stiff = hiding ? CHAIN_STIFF[i] * 2.4 : CHAIN_STIFF[i]
    const damp = hiding ? CHAIN_DAMP[i] + 4 : CHAIN_DAMP[i]
    springTo(inst.chain[i], tx, ty, dt, stiff, damp)
  }
}
//
// Snaps the whole chain under a new burrow so the hop stays invisible.
//
function buryChain(inst, x) {
  inst.holeX = clamp(x, inst.minX, inst.maxX)
  const y = inst.groundAt(inst.holeX) + 6
  inst.chain.forEach(point => {
    point.x = inst.holeX
    point.y = y
    point.vx = 0
    point.vy = 0
  })
  inst.rise = 0
  inst.riseVel = 0
}
//
// Critically-ish damped chase used by the spine links.
//
function springTo(point, tx, ty, dt, stiff, damp) {
  point.vx += (tx - point.x) * stiff * dt
  point.vy += (ty - point.y) * stiff * dt
  const drag = Math.exp(-damp * dt)
  point.vx *= drag
  point.vy *= drag
  point.x += point.vx * dt
  point.y += point.vy * dt
}
//
// Two eyes that share one gaze. Placement only — the pupils are not independent.
//
function initEyes(inst) {
  inst.eyes = [
    { ox: -5.1, oy: 1.2 },
    { ox: 4.6, oy: 2.4 }
  ]
}
//
// One look target for both pupils. Far away, the lids stay shut.
//
function tickEyes(inst, dt, hero) {
  const head = inst.chain[inst.chain.length - 1]
  const gaze = inst.gaze
  const hidden = inst.state === 'hidden' || inst.state === 'hiding'
  const headUp = headIsClear(inst)
  inst.eyesShut = !headUp || heroFar(inst, hero)
  const openTarget = !headUp || inst.eyesShut ? 0 : inst.state === 'startled' ? 1.4 : 1
  gaze.open += (openTarget - gaze.open) * Math.min(1, dt * 14)
  gaze.jitter += (Math.random() - 0.5) * 8 * dt
  gaze.jitter *= Math.exp(-9 * dt)
  if (hidden || inst.eyesShut) return
  if (inst.state === 'startled') {
    gaze.mode = 'startled'
    aimGazeAtHero(inst, head, hero)
    gaze.px = gaze.tx
    gaze.py = gaze.ty
    return
  }
  gaze.hold -= dt
  if (gaze.hold <= 0) pickLook(inst, head, hero)
  gaze.mode === 'lookHero' && aimGazeAtHero(inst, head, hero)
  const follow = gaze.mode === 'lookHero' ? 7 : 4
  gaze.px += (gaze.tx - gaze.px) * Math.min(1, dt * follow)
  gaze.py += (gaze.ty - gaze.py) * Math.min(1, dt * follow)
}
//
// Next shared saccade. Both pupils take it at once.
//
function pickLook(inst, head, hero) {
  const gaze = inst.gaze
  const glance = Math.random() < 0.3 || !hero
  if (!glance) {
    gaze.mode = 'lookHero'
    aimGazeAtHero(inst, head, hero)
    gaze.hold = 1.1 + Math.random() * 1.7
    return
  }
  gaze.mode = 'lookAway'
  aimGazeAtPoint(inst, head, nearbyGlancePoint(inst))
  gaze.hold = 0.32 + Math.random() * 0.7
}
//
// Both pupils toward the hero's chest.
//
function aimGazeAtHero(inst, head, hero) {
  hero && aimGazeAtPoint(inst, head, { x: hero.x, y: hero.y - 24 })
}
//
// A glance at the soil, a side, or a spot above the burrow — not the hero.
//
function nearbyGlancePoint(inst) {
  const gy = inst.groundAt(inst.holeX)
  const roll = Math.random()
  if (roll < 0.34) return { x: inst.holeX - 36 - Math.random() * 70, y: gy - 6 }
  if (roll < 0.68) return { x: inst.holeX + 28 + Math.random() * 80, y: gy - 10 }
  if (roll < 0.84) return { x: inst.holeX + (Math.random() - 0.5) * 24, y: gy + 2 }
  return { x: inst.holeX + (Math.random() - 0.5) * 40, y: gy - 46 - Math.random() * 36 }
}
//
// Pupil target in the eye's local -1..1 box, aimed at a world point.
//
function aimGazeAtPoint(inst, head, point) {
  const dx = point.x - head.x
  const dy = point.y - head.y
  const len = Math.hypot(dx, dy) || 1
  inst.gaze.tx = clamp(dx / len, -1, 1)
  inst.gaze.ty = clamp(dy / len, -1, 1)
}
//
// Active at the branch G-route mushroom after eyes unlock, or anywhere after G.
//
function isSpiritGameplayActive(inst) {
  const z = inst.zones
  if (!z) return false
  if (z.gCollected) return true
  return isGlowEyesGameplayUnlocked(z)
}
//
// Stays buried and invisible until the branch-route beat is live.
//
function parkUntilG(inst) {
  inst._spiritLive = false
  inst.obj && (inst.obj.hidden = true)
  inst.rise = 0
  inst.riseVel = 0
  inst.mound = 0
  inst.motes.forEach(mote => {
    mote.life = 0
  })
  if (inst.state !== 'hidden') {
    inst.state = 'hidden'
    inst.stateTime = 0
  }
}
//
// parkUntilG leaves state hidden without a wait timer — unstick on first live frame.
//
function wakeSpiritLive(inst) {
  if (inst._spiritLive) return
  inst._spiritLive = true
  inst.wait = 0
  inst.stateTime = 0
  inst.state === 'hidden' && enterState(inst, 'emerging')
}
//
// Left trampoline burrow until it is revealed, then the right cap; retire after the right opens.
//
function syncBurrowPhase(inst) {
  if (inst.rightMushroomShown?.()) {
    retireSpirit(inst)
    return
  }
  const leftShown = Boolean(inst.branchMushroomShown?.())
  const wantPhase = leftShown ? 'right' : 'left'
  if (inst.burrowPhase == null) {
    inst.burrowPhase = wantPhase
    buryChain(inst, burrowXForPhase(inst, wantPhase))
    return
  }
  if (inst.burrowPhase === 'left' && wantPhase === 'right') {
    inst.burrowPhase = 'right'
    requestBurrowMove(inst, burrowXForPhase(inst, 'right'))
  }
}
//
// Slides the burrow when the hero unlocks the next trampoline phase.
//
function requestBurrowMove(inst, x) {
  if (inst.state === 'hidden') {
    buryChain(inst, x)
    return
  }
  inst.pendingBurrowX = x
  inst.state !== 'hiding' && inst.state !== 'startled' && enterState(inst, 'hiding')
}
//
// Stays gone once the right mushroom-trampoline is on screen.
//
function retireSpirit(inst) {
  if (inst.retired) return
  inst.retired = true
  inst.pendingBurrowX = null
  inst.obj && (inst.obj.hidden = true)
  inst.rise = 0
  inst.riseVel = 0
  inst.mound = 0
  inst.motes.forEach(mote => {
    mote.life = 0
  })
  if (inst.state !== 'hidden') {
    inst.state = 'hidden'
    inst.stateTime = 0
  }
  buryChain(inst, inst.holeX)
}
//
// Active burrow sits on the cap centre for the current trampoline phase.
//
function burrowXForPhase(inst, phase) {
  if (phase === 'right') return inst.rightMushroomX?.() ?? inst.homeX
  return inst.branchMushroomX?.() ?? inst.homeX
}
function nextBurrowX(inst) {
  return burrowXForPhase(inst, inst.burrowPhase === 'right' ? 'right' : 'left')
}
//
// Two specks kicked up from the ground line when the spirit snaps under.
//
function puffFromBase(inst) {
  const y = inst.groundAt(inst.holeX)
  let spawned = 0
  for (let i = 0; i < inst.motes.length && spawned < 2; i++) {
    const mote = inst.motes[i]
    if (mote.life > 0) continue
    const side = spawned === 0 ? -1 : 1
    mote.x = inst.holeX + side * 5
    mote.y = y + 1
    mote.vx = side * (16 + Math.random() * 14)
    mote.vy = -(32 + Math.random() * 20)
    mote.life = 0.32 + Math.random() * 0.08
    mote.max = mote.life
    spawned++
  }
}
//
// Dirt flecks. dir > 0 falls, dir < 0 pops upward.
//
function burst(inst, count, dir) {
  const root = inst.chain[0]
  let spawned = 0
  for (let i = 0; i < inst.motes.length && spawned < count; i++) {
    const mote = inst.motes[i]
    if (mote.life > 0) continue
    mote.x = root.x + (Math.random() - 0.5) * 10
    mote.y = root.y - 1
    mote.vx = (Math.random() - 0.5) * 28
    mote.vy = dir * (12 + Math.random() * 26)
    mote.life = 0.18 + Math.random() * 0.22
    mote.max = mote.life
    spawned++
  }
}
//
// Motes fall back into the burrow and die.
//
function tickMotes(inst, dt) {
  inst.motes.forEach(mote => {
    if (mote.life <= 0) return
    mote.life -= dt
    mote.vy += 40 * dt
    mote.x += mote.vx * dt
    mote.y += mote.vy * dt
  })
}
//
// Significant hero motion: walk, jump, or a direction change. Standing still is not motion.
//
function heroIsMoving(inst) {
  const ch = inst.hero?.character
  if (!ch || inst.hero.controlsDisabled || inst.hero.isAnnihilating) return false
  const vx = ch.vel?.x ?? 0
  const vy = ch.vel?.y ?? 0
  const grounded = ch.isGrounded?.() ?? true
  const stepping = Boolean(inst.hero._effectivelyMoving) || Math.abs(vx) > HERO_MOVE_SPEED
  const jumping = !grounded && (vy < -HERO_JUMP_SPEED || vy > HERO_JUMP_SPEED)
  const dir = Math.abs(vx) > HERO_MOVE_SPEED ? Math.sign(vx) : 0
  const turned = dir !== 0 && inst.moveDir !== 0 && dir !== inst.moveDir
  inst.moveDir = dir
  return stepping || jumping || turned
}
//
// True when the hero is close enough that the spirit bothers to watch them.
//
function heroNear(inst, hero) {
  if (!hero) return false
  const gy = inst.groundAt(inst.holeX)
  return Math.abs(hero.x - inst.holeX) <= HIDE_RADIUS &&
    Math.abs(hero.y - gy) <= OBSERVE_RADIUS_Y
}
//
// 1 at the creep edge, CREEP_FLOOR at the hide edge. Outside the band the body stays up.
//
function proximityScale(inst, hero) {
  if (!hero) return 1
  const dx = Math.abs(hero.x - inst.holeX)
  const gy = inst.groundAt(inst.holeX)
  if (Math.abs(hero.y - gy) > OBSERVE_RADIUS_Y) return 1
  if (dx >= CREEP_RADIUS) return 1
  const pad = Math.max(inst.holdRadius, FLUSH_HIDE_RADIUS)
  if (dx <= pad) return 0
  if (dx <= HIDE_RADIUS) {
    const u = (dx - pad) / Math.max(1, HIDE_RADIUS - pad)
    return CREEP_FLOOR * u
  }
  const t = (dx - HIDE_RADIUS) / (CREEP_RADIUS - HIDE_RADIUS)
  return CREEP_FLOOR + (1 - CREEP_FLOOR) * t
}
//
// Hero is near enough that the spirit must stay under the soil.
//
function heroTooClose(inst, hero) {
  if (!hero) return false
  const gy = inst.groundAt(inst.holeX)
  const radius = Math.max(inst.holdRadius, FLUSH_HIDE_RADIUS)
  return Math.abs(hero.x - inst.holeX) <= radius &&
    Math.abs(hero.y - gy) <= OBSERVE_RADIUS_Y
}
//
// Close enough that whatever is already above the soil snaps back under.
//
function heroFlush(inst, hero) {
  return heroWithin(inst, hero, FLUSH_HIDE_RADIUS)
}
//
// The face has cleared the ground line, so the lids may open.
//
function headIsClear(inst) {
  const head = inst.chain[inst.chain.length - 1]
  return head.y < inst.groundAt(inst.holeX) - HEAD_CLEAR
}
//
// True when the hero is within a horizontal span of the burrow.
//
function heroWithin(inst, hero, radius) {
  if (!hero) return false
  const gy = inst.groundAt(inst.holeX)
  return Math.abs(hero.x - inst.holeX) <= radius &&
    Math.abs(hero.y - gy) <= OBSERVE_RADIUS_Y
}
//
// Beyond two hide-radii the spirit relaxes: shut eyes, a quiet whistle.
//
function heroFar(inst, hero) {
  if (!hero) return true
  const gy = inst.groundAt(inst.holeX)
  if (Math.abs(hero.y - gy) > OBSERVE_RADIUS_Y) return true
  return Math.abs(hero.x - inst.holeX) > FAR_RADIUS
}
//
// Occasional soft whistle, only while the hero is far and the body is up.
//
function tickWhistle(inst, dt) {
  if (isSpiritSensoryMuted(inst)) return
  const singing = inst.eyesShut && inst.rise > 0.5
  if (!singing) return
  inst.whistleIn -= dt
  if (inst.whistleIn > 0) return
  playSpiritWhistleSfx(inst)
  spawnSpiritWhistleNotes(inst)
  inst.whistleIn = 2.2 + Math.random() * 2.6
}
//
// Close reactions stay inside the creep span; the far whistle reaches farther out.
//
function spiritSfxAudible(inst, hero) {
  return heroWithin(inst, hero, CREEP_RADIUS)
}
function spiritWhistleAudible(inst, hero) {
  return heroWithin(inst, hero, WHISTLE_HEAR_RADIUS)
}
//
// ignoreMute is the bury sound — it plays on the hidden left trampoline too.
//
function playSpiritSfx(inst, playFn, ignoreMute = false) {
  if (!inst.sfx) return
  if (!ignoreMute && isSpiritSensoryMuted(inst)) return
  const hero = heroPoint(inst)
  spiritSfxAudible(inst, hero) && playFn(inst.sfx)
}
function playSpiritWhistleSfx(inst) {
  if (!inst.sfx || isSpiritSensoryMuted(inst)) return
  const hero = heroPoint(inst)
  spiritWhistleAudible(inst, hero) && Sound.playGlowSwampSpiritWhistle(inst.sfx)
}
//
// Mouth-note burst beside the shut-lid head when the spirit whistles.
//
function spawnSpiritWhistleNotes(inst) {
  const head = inst.chain[inst.chain.length - 1]
  const mouthX = head.x + SPIRIT_NOTE_OFFSET_X
  const mouthY = head.y + SPIRIT_NOTE_OFFSET_Y
  for (let i = 0; i < SPIRIT_WHISTLE_NOTE_BURST; i++) {
    const jitterX = (Math.random() - 0.5) * 10
    const jitterY = (Math.random() - 0.5) * 6
    inst.whistleNotes.push({
      baseX: mouthX + jitterX,
      x: mouthX + jitterX,
      y: mouthY + jitterY,
      age: i * 0.08,
      driftPhase: Math.random(),
      glyph: SPIRIT_NOTE_GLYPHS[Math.floor(Math.random() * SPIRIT_NOTE_GLYPHS.length)],
      angle: (Math.random() - 0.5) * 16
    })
  }
}
function tickWhistleNotes(inst, dt) {
  const notes = inst.whistleNotes
  if (!notes.length) return
  for (const note of notes) {
    note.age += dt
    const lifeT = note.age / SPIRIT_NOTE_LIFETIME
    note.x = note.baseX +
      Math.sin((note.age + note.driftPhase) * SPIRIT_NOTE_DRIFT_FREQ * Math.PI * 2) *
      SPIRIT_NOTE_DRIFT_AMPLITUDE * lifeT
    note.y -= SPIRIT_NOTE_RISE_SPEED * dt
  }
  inst.whistleNotes = notes.filter(note => note.age < SPIRIT_NOTE_LIFETIME)
}
//
// Hero world position, or null before the body exists.
//
function heroPoint(inst) {
  const pos = inst.hero?.character?.pos
  if (!pos) return null
  return { x: pos.x, y: pos.y }
}
//
// Procedural silhouette from the live chain. Hidden spirits draw only the mound and motes.
//
function drawSpirit(inst) {
  const k = inst.k
  const batch = inst.batch
  PolyBatch.reset(batch)
  const gray = isGlowGrayExploreBeforeL(inst.zones, inst.zones?._sceneRef?.colorFade ?? 0)
  const pal = GLOW_PAL.swampSpirit
  const contour = rgb(k, gray ? GLOW_PAL.decorGray : pal.contour)
  const shadow = rgb(k, gray ? GLOW_PAL.heroOutline : pal.shadow)
  const body = rgb(k, gray ? GLOW_PAL.lightGray : pal.body)
  const eye = rgb(k, gray ? GLOW_PAL.lightGray : pal.eye)
  const pupil = rgb(k, gray ? GLOW_PAL.decorGray : pal.pupil)
  const groundY = inst.groundAt(inst.holeX)
  inst.mound > 0.02 && PolyBatch.addDisc(batch, inst.holeX, groundY + 1, 7 + inst.mound * 3, shadow)
  fillSamples(inst)
  if (inst.rise > 0.04 && inst.state !== 'hidden') {
    drawColumn(inst, batch, groundY, BODY_HALF, body)
    drawColumnStroke(inst, batch, groundY, BODY_HALF, contour)
    PolyBatch.flush(batch, k, 1)
    PolyBatch.reset(batch)
    drawBellySkirt(inst, batch, groundY, contour)
    PolyBatch.flush(batch, k, 1)
    PolyBatch.reset(batch)
    drawEyes(inst, batch, groundY, contour, eye, pupil)
    PolyBatch.flush(batch, k, 1)
    PolyBatch.reset(batch)
  }
  inst.motes.forEach(mote => {
    if (mote.life <= 0) return
    PolyBatch.addDisc(batch, mote.x, mote.y, 2.1, shadow)
  })
  PolyBatch.flush(batch, k, 1)
  inst.whistleNotes.length && Hero.drawFloatingMusicNotes(k, inst.whistleNotes)
}
//
// Samples the spring chain into a dense silhouette.
//
function fillSamples(inst) {
  const pts = inst.chain
  const last = pts.length - 1
  for (let i = 0; i < SAMPLES.length; i++) {
    const u = i / (SAMPLES.length - 1)
    const span = last * u
    const i0 = Math.min(last - 1, Math.floor(span))
    const f = span - i0
    const sample = SAMPLES[i]
    sample.x = pts[i0].x + (pts[i0 + 1].x - pts[i0].x) * f
    sample.y = pts[i0].y + (pts[i0 + 1].y - pts[i0].y) * f
    sample.t = u
  }
}
//
// One rounded column. The crown uses the hero idle corner radius, not a separate disc.
// The cut at the soil stays horizontal even when the body leans.
//
function drawColumn(inst, batch, groundY, half, color) {
  const ring = buildColumnRing(inst, groundY, half)
  if (!ring) return
  const { n, head, capR } = ring
  for (let i = 0; i < n - 1; i++) {
    const a = RING[i]
    const b = RING[i + 1]
    const aw = sliceHalf(a.y, head.y, capR, half)
    const bw = sliceHalf(b.y, head.y, capR, half)
    addWorldQuad(
      batch,
      a.x - aw, a.y,
      b.x - bw, b.y,
      b.x + bw, b.y,
      a.x + aw, a.y,
      color
    )
  }
}
//
// Single contour stroke on the body edge — no second light rim inside the outline.
//
function drawColumnStroke(inst, batch, groundY, half, color) {
  const ring = buildColumnRing(inst, groundY, half)
  if (!ring) return
  const { n, head, capR } = ring
  for (let i = 0; i < n - 1; i++) {
    const a = RING[i]
    const b = RING[i + 1]
    const aw = sliceHalf(a.y, head.y, capR, half)
    const bw = sliceHalf(b.y, head.y, capR, half)
    PolyBatch.addLine(batch, a.x - aw, a.y, b.x - bw, b.y, OUTLINE_STROKE, color)
    PolyBatch.addLine(batch, a.x + aw, a.y, b.x + bw, b.y, OUTLINE_STROKE, color)
  }
}
//
// Centerline ring shared by the fill and the outline stroke.
//
function buildColumnRing(inst, groundY, half) {
  const baseY = groundY + BASE_SINK
  const head = SAMPLES[SAMPLES.length - 1]
  if (baseY - head.y < 4) return null
  const capR = Math.min(half * CAP_RATIO, (baseY - head.y) * 0.86)
  const capY = head.y + capR
  let n = 0
  n = pushRing(n, inst.holeX, baseY)
  for (let i = 1; i < SAMPLES.length; i++) {
    const sample = SAMPLES[i]
    if (sample.y >= baseY - 0.5 || sample.y <= capY) continue
    n = pushRing(n, sample.x, sample.y)
  }
  n = pushRing(n, centerXAt(capY), capY)
  for (let i = 1; i <= ARC_STEPS; i++) {
    const u = i / ARC_STEPS
    n = pushRing(n, centerXAt(capY) + (head.x - centerXAt(capY)) * u, capY + (head.y - capY) * u)
  }
  RING[0].x = inst.holeX
  RING[0].y = baseY
  return { n, head, capR, baseY }
}
//
// Full width up to the crown, then the hero-idle corner pulls the sides in.
//
function sliceHalf(y, topY, capR, half) {
  const capY = topY + capR
  if (y <= topY + CROWN_APEX_Y_EPS) return 0
  if (y >= capY) return half
  const dy = Math.min(capR, capY - y)
  const inset = capR - Math.sqrt(Math.max(0, capR * capR - dy * dy))
  return Math.max(0.6, half - inset)
}
//
// Fixed jagged seam heights for this burrow — never tied to rise threshold flicker.
//
function buildBellySeamProfile(seedX) {
  const seed = seedX * 0.091
  const seam = []
  for (let i = 0; i < BELLY_SEAM_POINTS; i++) {
    const u = i / (BELLY_SEAM_POINTS - 1)
    const drip = Math.sin(u * 5.4 + seed) * 0.07 +
      Math.sin(u * 11.3 + seed * 1.6) * 0.045 +
      Math.sin(u * 2.2 + seed * 0.4) * 0.03
    const shoulder = 0.08 * Math.sin(u * Math.PI)
    seam.push(0.36 + shoulder + drip)
  }
  return seam
}
//
// Dark lower body with a dripping soil edge, like the concept belly skirt.
//
function drawBellySkirt(inst, batch, groundY, color) {
  const baseY = groundY + BASE_SINK
  const head = SAMPLES[SAMPLES.length - 1]
  const height = baseY - head.y
  if (height < 2) return
  const capR = Math.min(BODY_HALF * CAP_RATIO, height * 0.86)
  const seam = inst.bellySeam
  const n = seam.length - 1
  const yb = baseY
  for (let i = 0; i < n; i++) {
    const t0 = i / n
    const t1 = (i + 1) / n
    let yTop0 = head.y + BELLY_BODY_H * (1 - seam[i])
    let yTop1 = head.y + BELLY_BODY_H * (1 - seam[i + 1])
    if (yTop0 >= yb - 0.5 && yTop1 >= yb - 0.5) continue
    yTop0 = Math.min(yTop0, yb - 0.5)
    yTop1 = Math.min(yTop1, yb - 0.5)
    const xl0 = columnXAt(yb, t0, head.y, capR)
    const xr0 = columnXAt(yb, t1, head.y, capR)
    const xl1 = columnXAt(yTop0, t0, head.y, capR)
    const xr1 = columnXAt(yTop1, t1, head.y, capR)
    addWorldQuad(batch, xl0, yb, xr0, yb, xr1, yTop1, xl1, yTop0, color)
  }
}
//
// X across the column at y. t is 0 on the left wall and 1 on the right.
//
function columnXAt(y, t, headY, capR) {
  const cx = centerXAt(y)
  const half = sliceHalf(y, headY, capR, BODY_HALF - 0.6)
  return cx - half + t * 2 * half
}
//
// Centerline X at a screen Y. Falls back to the burrow when the column is short.
//
function centerXAt(y) {
  const head = SAMPLES[SAMPLES.length - 1]
  const root = SAMPLES[0]
  if (y <= head.y) return head.x
  if (y >= root.y) return root.x
  for (let i = 0; i < SAMPLES.length - 1; i++) {
    const a = SAMPLES[i]
    const b = SAMPLES[i + 1]
    const lo = Math.min(a.y, b.y)
    const hi = Math.max(a.y, b.y)
    if (y < lo || y > hi) continue
    const span = b.y - a.y
    const f = Math.abs(span) < 0.001 ? 0 : (y - a.y) / span
    return a.x + (b.x - a.x) * f
  }
  return root.x
}
//
// Stores one outline vertex in the shared ring.
//
function pushRing(index, x, y) {
  const point = RING[index]
  point.x = x
  point.y = y
  return index + 1
}
//
// Both eyes use the shared gaze. Shut lids replace the discs when the hero is far.
//
function drawEyes(inst, batch, groundY, contour, eyeColor, pupilColor) {
  const head = SAMPLES[SAMPLES.length - 1]
  const gaze = inst.gaze
  inst.eyes.forEach(eye => {
    const ex = head.x + eye.ox
    const ey = head.y + 8 + eye.oy
    if (ey >= groundY) return
    if (inst.eyesShut) {
      drawClosedEye(batch, ex, ey, contour)
      return
    }
    const radius = (eye.ox < 0 ? EYE_RADIUS_LEFT : EYE_RADIUS_RIGHT) * gaze.open
    PolyBatch.addDisc(batch, ex, ey, radius + 0.85, contour)
    PolyBatch.addDisc(batch, ex, ey, radius, eyeColor)
    const qx = ex + clamp(gaze.px, -1, 1) * radius * 0.42 + gaze.jitter
    const qy = ey + clamp(gaze.py, -1, 1) * radius * 0.36
    PolyBatch.addDisc(batch, qx, qy, Math.max(0.85, radius * 0.38), pupilColor)
  })
}
//
// A shallow lid, the same curve on both eyes.
//
function drawClosedEye(batch, ex, ey, color) {
  PolyBatch.addLine(batch, ex - 4.4, ey - 0.4, ex - 1.5, ey + 1.7, 1.8, color)
  PolyBatch.addLine(batch, ex - 1.5, ey + 1.7, ex + 1.6, ey + 1.7, 1.8, color)
  PolyBatch.addLine(batch, ex + 1.6, ey + 1.7, ex + 4.4, ey - 0.4, 1.8, color)
}
//
// Writes one world-space quad into the shared batch without allocating a shape.
//
function addWorldQuad(batch, ax, ay, bx, by, cx, cy, dx, dy, color) {
  QUAD_SHAPE[1][0] = bx - ax
  QUAD_SHAPE[1][1] = by - ay
  QUAD_SHAPE[2][0] = cx - ax
  QUAD_SHAPE[2][1] = cy - ay
  QUAD_SHAPE[3][0] = dx - ax
  QUAD_SHAPE[3][1] = dy - ay
  PolyBatch.addShape(batch, QUAD_SHAPE, QUAD_INDEX, ax, ay, 1, 1, 1, 0, color)
}
//
// Palette hex to a Kaplay colour.
//
function rgb(k, hex) {
  const c = getRGB(k, hex)
  return k.rgb(c.r, c.g, c.b)
}
//
// Clamps a scalar.
//
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}
