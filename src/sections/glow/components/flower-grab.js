import { CFG } from '../../../cfg.js'
import * as Hero from '../../../components/hero.js'
import * as Sound from '../../../utils/sound.js'
import { getRGB } from '../../../utils/helper.js'
import * as EyeFlower from './eye-flower.js'
import * as GlowCamera from '../utils/glow-camera.js'
import * as GlowFootParticles from '../utils/glow-foot-particles.js'
import { GLOW_PAL, glowRgb } from '../utils/glow-palette.js'
//
// Scripted end of the glow level: the hero lands on the lake island, the
// eye-flower notices him, whips its tentacles around him, hoists him up,
// hesitates, then yanks him under the ground in a spray of soil and pebbles.
// The level fades out and the caller moves on to the next section.
//
// Beats in order (seconds). The strike lasts until every tentacle holds
// (or its timeout), the rest are fixed.
//
const BEAT = {
  AWARE: 'aware',
  STRIKE: 'strike',
  SQUEEZE: 'squeeze',
  LIFT: 'lift',
  HOLD: 'hold',
  PULL: 'pull',
  BURIED: 'buried',
  FADE: 'fade',
  DONE: 'done'
}
const AWARE_SEC = 0.55
const STRIKE_MAX_SEC = 0.9
const SQUEEZE_SEC = 0.22
const LIFT_SEC = 0.95
const HOLD_SEC = 0.45
const PULL_SEC = 0.24
const BURIED_SEC = 0.95
const FADE_SEC = 1.1
const MAX_DT = 1 / 20
//
// Hero body centre sits below his sprite centre (same offset the flower aims at).
//
const HERO_CENTER_DY = 12
const HERO_FOOT_DY = 38
//
// Hero squash: the coils squeeze him thin, the pull stretches him tall.
//
const SQUEEZE_SQUASH = 0.08
const PULL_SQUASH = 0.14
const SQUASH_Y_GAIN = 1.3
const SQUASH_SPRING = { k: 260, c: 14 }
const SQUEEZE_KICK = 1.6
//
// Lift: the body is hoisted on a soft spring (slow start, slight overshoot,
// late settle) a little toward the plant; it dangles like a pendulum and
// kicks now and then while held.
//
const LIFT_H = 74
const LIFT_TOWARD_PLANT = 22
const LIFT_SPRING = { k: 40, c: 9 }
const HOLD_RISE = 8
const SWING_SPRING = { k: 60, c: 4 }
const SWING_FROM_VX = 0.004
const STRUGGLE_GAP_MIN = 0.16
const STRUGGLE_GAP_RANGE = 0.18
const STRUGGLE_KICK = 2.2
const HOLD_TREMBLE_PX = 1.6
const PULL_ANGLE_DAMP = 18
//
// Pull: cubic ease-in toward the hole (slow first frames, violent end), a bit
// closer to the plant, until the whole sprite is below the opening's near lip.
//
const PULL_TOWARD_PLANT = 10
const PULL_BURY_PAD = 6
//
// Earth bursts: a big one as the feet break the ground, a smaller closing
// puff once the head is gone and one where the plant itself goes under.
// The cones lean toward the open lake (the island only runs out to the
// right), so most of the earth rains into the water and the rest lands
// along the mound at whatever height it comes down on.
//
const SOIL_BURST = { halfW: 14, count: 46, speedMin: 220, speedRange: 340, sizeMin: 2, sizeRange: 4, spreadDeg: 48, tiltDeg: 42, drag: 0.85 }
const STONE_BURST = { halfW: 10, count: 12, speedMin: 260, speedRange: 340, sizeMin: 4, sizeRange: 4, spreadDeg: 45, tiltDeg: 36, drag: 0.9 }
const CLOSE_BURST = { halfW: 10, count: 18, speedMin: 140, speedRange: 180, sizeMin: 2, sizeRange: 3, spreadDeg: 50, tiltDeg: 32, drag: 0.8 }
const PLANT_BURST = { halfW: 18, count: 24, speedMin: 120, speedRange: 200, sizeMin: 2, sizeRange: 3, spreadDeg: 55, tiltDeg: 24, drag: 0.7 }
const BURST_DUST_MULT = 2.4
const IMPACT_SHAKE = 8
const IMPACT_SHAKE_SEC = 0.5
const SQUEEZE_SHAKE = 2.5
const SQUEEZE_SHAKE_SEC = 0.2
//
// Torn earth left where he vanished: sits on the island top (island z 11.8,
// under the lake fill at 12) so it covers the soil, not the hero.
//
const HOLE_Z = 11.9
const HOLE_RX = 34
const HOLE_RY = 9
const HOLE_INNER = 0.72
const HOLE_OPEN_SEC = 0.16
//
// The grabbed hero is drawn in front of the island and the hole's back wall
// (the island's baked greenery sits above the player plane and would swallow
// him before he reaches the hole). While he is pulled his body is cut at the
// opening's near edge and the near half of the rim is drawn over him, so he
// drops into the hole instead of slipping behind it. The flower's front
// coils (eye-flower GRAB_FRONT_Z) stay above both. The fade covers
// everything in the level.
//
const HERO_Z = HOLE_Z + 0.02
const HOLE_FRONT_Z = HERO_Z + 0.01
const HOLE_FRONT_SEGMENTS = 16
const FADE_Z = CFG.visual.zIndex.ui * 20

/**
 * Creates the grab sequence (idle until start()).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay inst
 * @param {Object} cfg.flower - Eye-flower inst
 * @param {Object} cfg.heroInst - Hero inst
 * @param {Object} [cfg.footParticles] - Glow foot-particle pool (earth bursts)
 * @param {Object} [cfg.camera] - Glow camera inst (impact shake)
 * @param {Object} [cfg.sound] - Sound inst
 * @param {function(Object): void} cfg.onFinished - Called once with k after the fade-out
 * @returns {Object} Flower-grab inst
 */
export function create(cfg) {
  const { k } = cfg
  const pal = GLOW_PAL.glowEyeFlower
  const inst = {
    k,
    flower: cfg.flower,
    heroInst: cfg.heroInst,
    footParticles: cfg.footParticles,
    camera: cfg.camera,
    sound: cfg.sound,
    onFinished: cfg.onFinished,
    started: false,
    beat: null,
    beatTime: 0,
    prey: { x: 0, y: 0, scale: 1, angle: 0 },
    groundY: 0,
    side: 1,
    startX: 0,
    startY: 0,
    lift: { x: 0, y: 0, vx: 0, vy: 0 },
    swing: { v: 0, vel: 0 },
    squash: { v: 0, vel: 0 },
    struggleIn: STRUGGLE_GAP_MIN,
    pullFromX: 0,
    pullFromY: 0,
    holeX: 0,
    heroX: 0,
    heroY: 0,
    heroVisible: true,
    sprites: null,
    flipX: false,
    impactDone: false,
    holeOpening: false,
    holeOpen: 0,
    fade: null,
    soilColors: [pal.soil, pal.soilDark, pal.soilLight].map(glowRgb),
    stoneColors: [pal.stone, pal.stoneLight, pal.stoneDark].map(glowRgb),
    dustColor: glowRgb(pal.soilLight),
    splashColor: glowRgb(pal.splash),
    holeColor: getRGB(k, pal.hole),
    holeRimColor: getRGB(k, pal.soilDark),
    fadeColor: pal.fade
  }
  k.add([
    k.z(HERO_Z),
    {
      draw() {
        drawHero(inst)
      }
    }
  ])
  k.add([
    k.z(HOLE_Z),
    {
      draw() {
        drawHole(inst)
      }
    }
  ])
  k.add([
    k.z(HOLE_FRONT_Z),
    {
      draw() {
        drawHoleFront(inst)
      }
    }
  ])
  return inst
}

/**
 * Starts the grab on the hero who just landed on the island: takes him out of
 * physics and input, and wakes the flower. Does nothing after the first call.
 * The hole opens on the painted soil under the pull spot, above the
 * waterline collider he stands on.
 * @param {Object} inst - Flower-grab inst
 */
export function start(inst) {
  if (inst.started) return
  const hero = inst.heroInst
  const char = hero?.character
  if (!char?.pos) return
  inst.started = true
  inst.startX = char.pos.x
  inst.startY = char.pos.y
  inst.heroX = char.pos.x
  inst.heroY = char.pos.y
  inst.side = char.pos.x >= inst.flower.baseX ? 1 : -1
  inst.holeX = Math.min(inst.startX - inst.side * PULL_TOWARD_PLANT, inst.flower.shoreX - HOLE_RX)
  inst.groundY = Math.min(EyeFlower.soilLineY(inst.flower, inst.holeX), inst.flower.waterY - HOLE_RY)
  inst.flipX = char.flipX
  inst.prey.scale = char.scale?.x ?? 1
  inst.sprites = heroSprites(inst, hero)
  captureHero(hero, char)
  syncPrey(inst)
  EyeFlower.startGrab(inst.flower, inst.prey, inst.groundY)
  setBeat(inst, BEAT.AWARE)
  inst.sound && Sound.playFlowerRustle(inst.sound)
}

/**
 * True from start() for the rest of the scene: the level must stay frozen
 * through the hand-off transition too, or its lake check would drown the
 * buried hero and restart the level.
 * @param {Object} inst - Flower-grab inst
 * @returns {boolean}
 */
export function isActive(inst) {
  return !!inst?.started
}

/**
 * Advances the sequence: hero pose first, then the flower, so the coils
 * and the body move in the same frame.
 * @param {Object} inst - Flower-grab inst
 * @param {number} dt - Frame time in seconds
 */
export function onUpdate(inst, dt) {
  if (!isActive(inst) || inst.beat === BEAT.DONE) return
  const step = Math.min(dt, MAX_DT)
  inst.beatTime += step
  updateBeat(inst, step)
  stepSpring(inst.squash, squashTarget(inst), SQUASH_SPRING, step)
  inst.holeOpen = inst.holeOpening ? Math.min(1, inst.holeOpen + step / HOLE_OPEN_SEC) : 0
  pinHero(inst)
  syncPrey(inst)
  EyeFlower.tickGrab(inst.flower, step)
}

//
// Beat logic: each beat moves the hero and decides when to hand over.
//
function updateBeat(inst, step) {
  const t = inst.beatTime
  switch (inst.beat) {
    case BEAT.AWARE:
      t >= AWARE_SEC && setBeat(inst, BEAT.STRIKE)
      break
    case BEAT.STRIKE:
      (EyeFlower.isGrabHolding(inst.flower) || t >= STRIKE_MAX_SEC) && setBeat(inst, BEAT.SQUEEZE)
      break
    case BEAT.SQUEEZE:
      t >= SQUEEZE_SEC && setBeat(inst, BEAT.LIFT)
      break
    case BEAT.LIFT:
      updateLift(inst, step, 0)
      t >= LIFT_SEC && setBeat(inst, BEAT.HOLD)
      break
    case BEAT.HOLD:
      updateLift(inst, step, HOLD_RISE)
      t >= HOLD_SEC && setBeat(inst, BEAT.PULL)
      break
    case BEAT.PULL:
      updatePull(inst, step)
      break
    case BEAT.BURIED:
      t >= BURIED_SEC && setBeat(inst, BEAT.FADE)
      break
    case BEAT.FADE:
      updateFade(inst)
      break
  }
}

function setBeat(inst, beat) {
  inst.beat = beat
  inst.beatTime = 0
  const flower = inst.flower
  switch (beat) {
    case BEAT.STRIKE:
      EyeFlower.setGrabPhase(flower, EyeFlower.GRAB_PHASE.STRIKE)
      break
    case BEAT.SQUEEZE:
      inst.squash.vel += SQUEEZE_KICK
      inst.camera && GlowCamera.triggerShake(inst.camera, SQUEEZE_SHAKE, SQUEEZE_SHAKE_SEC)
      inst.sound && Sound.playFlowerSqueeze(inst.sound)
      break
    case BEAT.LIFT:
      EyeFlower.setGrabPhase(flower, EyeFlower.GRAB_PHASE.LIFT)
      break
    case BEAT.HOLD:
      EyeFlower.setGrabPhase(flower, EyeFlower.GRAB_PHASE.HOLD)
      break
    case BEAT.PULL:
      inst.pullFromX = inst.heroX
      inst.pullFromY = inst.heroY
      inst.holeOpening = true
      EyeFlower.setGrabPhase(flower, EyeFlower.GRAB_PHASE.PULL)
      break
    case BEAT.BURIED:
      inst.heroVisible = false
      burstSoil(inst, inst.holeX, CLOSE_BURST, inst.soilColors)
      burstSoil(inst, inst.flower.baseX, PLANT_BURST, inst.soilColors)
      EyeFlower.setGrabPhase(flower, EyeFlower.GRAB_PHASE.RELEASE)
      break
    case BEAT.FADE:
      inst.fade = addFadeOverlay(inst)
      break
    case BEAT.DONE:
      inst.onFinished?.(inst.k)
      break
  }
}

//
// Hoisted body: spring toward the lifted spot, pendulum swing driven by its
// sideways motion plus random struggle kicks, and a growing tremble while
// the plant hesitates before the pull.
//
function updateLift(inst, step, rise) {
  const lift = inst.lift
  const tx = -inst.side * LIFT_TOWARD_PLANT
  const ty = -LIFT_H - rise
  lift.vx += ((tx - lift.x) * LIFT_SPRING.k - lift.vx * LIFT_SPRING.c) * step
  lift.vy += ((ty - lift.y) * LIFT_SPRING.k - lift.vy * LIFT_SPRING.c) * step
  lift.x += lift.vx * step
  lift.y += lift.vy * step
  inst.struggleIn -= step
  if (inst.struggleIn <= 0) {
    inst.struggleIn = STRUGGLE_GAP_MIN + Math.random() * STRUGGLE_GAP_RANGE
    inst.swing.vel += (Math.random() < 0.5 ? -1 : 1) * STRUGGLE_KICK
  }
  stepSpring(inst.swing, -lift.vx * SWING_FROM_VX, SWING_SPRING, step)
  const tremble = inst.beat === BEAT.HOLD ? HOLD_TREMBLE_PX * inst.beatTime / HOLD_SEC : 0
  inst.heroX = inst.startX + lift.x + (Math.random() * 2 - 1) * tremble
  inst.heroY = inst.startY + lift.y + (Math.random() * 2 - 1) * tremble
}

//
// Violent drag under: accelerating ease-in, the body snaps upright, the
// ground erupts as the feet break through, then the head disappears.
//
function updatePull(inst, step) {
  const u = Math.min(1, inst.beatTime / PULL_SEC)
  const e = u * u * u
  const halfH = Hero.HERO_BAKE_SPRITE_SIZE * inst.prey.scale * 0.5
  const endY = inst.groundY + HOLE_RY * HOLE_INNER + halfH + PULL_BURY_PAD
  inst.heroX = inst.pullFromX + (inst.holeX - inst.pullFromX) * e
  inst.heroY = inst.pullFromY + (endY - inst.pullFromY) * e
  inst.swing.v *= Math.exp(-PULL_ANGLE_DAMP * step)
  inst.swing.vel = 0
  !inst.impactDone && inst.heroY + HERO_FOOT_DY * inst.prey.scale >= inst.groundY && burstEarth(inst)
  u >= 1 && setBeat(inst, BEAT.BURIED)
}

function updateFade(inst) {
  const u = Math.min(1, inst.beatTime / FADE_SEC)
  inst.fade && (inst.fade.opacity = u * u * (3 - 2 * u))
  u >= 1 && setBeat(inst, BEAT.DONE)
}

function squashTarget(inst) {
  if (inst.beat === BEAT.PULL) return PULL_SQUASH
  const held = inst.beat === BEAT.SQUEEZE || inst.beat === BEAT.LIFT || inst.beat === BEAT.HOLD
  return held ? SQUEEZE_SQUASH : 0
}

//
// The ground erupts: soil and pebbles thrown up, a dust puff, camera shake
// and the earth gulp.
//
function burstEarth(inst) {
  inst.impactDone = true
  const particles = inst.footParticles
  burstSoil(inst, inst.holeX, SOIL_BURST, inst.soilColors)
  burstSoil(inst, inst.holeX, STONE_BURST, inst.stoneColors)
  particles && GlowFootParticles.spawnLanding(particles, inst.holeX, inst.groundY, inst.dustColor, BURST_DUST_MULT)
  inst.camera && GlowCamera.triggerShake(inst.camera, IMPACT_SHAKE, IMPACT_SHAKE_SEC)
  inst.sound && Sound.playFlowerEarthGulp(inst.sound)
}

//
// Crumbs land on the island ground or splash into the lake, wherever each
// one comes down.
//
function burstSoil(inst, x, burst, colors) {
  inst.footParticles && GlowFootParticles.spawnSoilBurst(inst.footParticles, {
    x,
    groundY: inst.groundY,
    ...burst,
    colors,
    surfaceAt: EyeFlower.landingSurface,
    surfaceTarget: inst.flower,
    splashColor: inst.splashColor
  })
}

//
// Hero leaves physics and input for good; hero.js keeps him hidden at the
// scripted spot while the grab layer draws him.
//
function captureHero(hero, char) {
  hero.controllable = false
  hero.controlsDisabled = true
  hero.jumpDisabled = true
  hero.suppressDust = true
  hero.isSubmerging = true
  char.has('body') && char.unuse('body')
  char.gravityScale = 0
  char.hidden = true
}

function pinHero(inst) {
  const hero = inst.heroInst
  hero.drownSinkX = inst.heroX
  hero.drownSinkY = inst.heroY
}

function syncPrey(inst) {
  const prey = inst.prey
  prey.x = inst.heroX
  prey.y = inst.heroY + HERO_CENTER_DY * prey.scale
  prey.angle = inst.swing.v
}

//
// Open-eyed frame looking at the plant while he notices it, eyes squeezed
// shut once the coils close (falls back to the idle frame).
//
function heroSprites(inst, hero) {
  const k = inst.k
  const prefix = hero.spritePrefix || hero.type
  const idle = `${prefix}_0_0`
  const look = `${prefix}_${-inst.side}_0`
  const closed = `${prefix}_closed`
  const fallback = k.getSprite(idle) ? idle : hero.character.sprite
  return {
    open: k.getSprite(look) ? look : fallback,
    closed: k.getSprite(closed) ? closed : fallback
  }
}

//
// Grabbed hero: rotated with the dangle, squashed by the coils, and cut at the
// soil line only while he is dragged under (he first stands lower, on the
// waterline collider).
//
function drawHero(inst) {
  if (!inst.started || !inst.heroVisible || !inst.sprites) return
  const k = inst.k
  const caught = inst.beat !== BEAT.AWARE && inst.beat !== BEAT.STRIKE
  const sprite = caught ? inst.sprites.closed : inst.sprites.open
  const size = Hero.HERO_BAKE_SPRITE_SIZE * inst.prey.scale
  const width = size * (1 - inst.squash.v)
  const height = size * (1 + inst.squash.v * SQUASH_Y_GAIN)
  const topY = inst.heroY - height * 0.5
  const clipY = inst.beat === BEAT.PULL ? inst.groundY + HOLE_RY * HOLE_INNER * inst.holeOpen : Infinity
  const visibleH = Math.min(height, clipY - topY)
  if (visibleH <= 0) return
  const opts = {
    sprite,
    pos: k.vec2(inst.heroX, topY + visibleH * 0.5),
    anchor: 'center',
    width,
    height: visibleH,
    flipX: inst.flipX,
    angle: inst.swing.v * 180 / Math.PI
  }
  visibleH < height && (opts.quad = { x: 0, y: 0, w: 1, h: visibleH / height })
  k.drawSprite(opts)
}

//
// Torn earth: dark rim and darker hole opening on the island top.
//
function drawHole(inst) {
  if (inst.holeOpen <= 0) return
  const k = inst.k
  const open = inst.holeOpen
  const pos = k.vec2(inst.holeX, inst.groundY)
  k.drawEllipse({ pos, radiusX: HOLE_RX * open, radiusY: HOLE_RY * open, color: inst.holeRimColor })
  k.drawEllipse({ pos, radiusX: HOLE_RX * HOLE_INNER * open, radiusY: HOLE_RY * HOLE_INNER * open, color: inst.holeColor })
}
//
// Near half of the rim (between the opening's and the rim's lower arcs),
// drawn over the hero so his body disappears behind the hole's front lip.
//
function drawHoleFront(inst) {
  if (inst.holeOpen <= 0 || inst.beat !== BEAT.PULL || !inst.heroVisible) return
  const k = inst.k
  const open = inst.holeOpen
  const outerRx = HOLE_RX * open
  const outerRy = HOLE_RY * open
  const innerRx = outerRx * HOLE_INNER
  const innerRy = outerRy * HOLE_INNER
  const pts = []
  const indices = []
  for (let i = 0; i <= HOLE_FRONT_SEGMENTS; i++) {
    const a = Math.PI * i / HOLE_FRONT_SEGMENTS
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    pts.push(k.vec2(inst.holeX + outerRx * cos, inst.groundY + outerRy * sin))
    pts.push(k.vec2(inst.holeX + innerRx * cos, inst.groundY + innerRy * sin))
    i > 0 && indices.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2)
  }
  k.drawPolygon({ pts, indices, color: inst.holeRimColor })
}
function addFadeOverlay(inst) {
  const k = inst.k
  return k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.fixed(),
    k.color(getRGB(k, inst.fadeColor)),
    k.opacity(0),
    k.z(FADE_Z)
  ])
}

function stepSpring(s, target, spring, h) {
  s.vel += ((target - s.v) * spring.k - s.vel * spring.c) * h
  s.v += s.vel * h
}
