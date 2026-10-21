import { CFG } from '../../../cfg.js'
import * as Hero from '../../../components/hero.js'
import * as Sound from '../../../utils/sound.js'
import { getRGB } from '../../../utils/helper.js'
import * as EyeFlower from './eye-flower.js'
import * as RootTunnel from './root-tunnel.js'
import * as ForestCamera from '../utils/forest-camera.js'
import * as ForestFootParticles from '../utils/forest-foot-particles.js'
import { FOREST_PAL, forestRgb } from '../utils/forest-palette.js'
//
// Scripted end of the forest level: the hero lands on the lake island, the
// eye-flower notices him, whips its tentacles around him, hoists him up,
// hesitates, then yanks him into a crack its roots tear open in the island.
// The roots drag him down the fresh tunnel, the camera follows a little,
// the forest light dies and the level fades out; the caller moves on to
// the next section.
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
  DESCEND: 'descend',
  FADE: 'fade',
  DONE: 'done'
}
const AWARE_SEC = 0.55
const STRIKE_MAX_SEC = 0.9
const SQUEEZE_SEC = 0.22
const LIFT_SEC = 0.95
const HOLD_SEC = 0.45
const PULL_SEC = 0.24
const DESCEND_SEC = 2.6
const FADE_SEC = 1.1
const MAX_DT = 1 / 20
//
// Hero body centre sits below his sprite centre (same offset the flower aims at).
//
const HERO_CENTER_DY = 12
const HERO_FOOT_DY = 38
//
// Hero squash: the coils squeeze him thin, the pull stretches him tall,
// the narrowing tunnel keeps him squeezed.
//
const SQUEEZE_SQUASH = 0.08
const PULL_SQUASH = 0.14
const DESCEND_SQUASH = 0.2
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
// Pull: cubic ease-in toward the crack (slow first frames, violent end), a
// bit closer to the plant, until his sprite centre is half a body below the
// soil line.
//
const PULL_TOWARD_PLANT = 10
const PULL_SINK_FRAC = 0.5
//
// Descent: the roots drag him down the winding tunnel in tugs (he springs
// back a little between them) while he sways, until he is past the bottom
// of the view.
//
const DESCEND_JERKS = 5
const DESCEND_JERK_PX = 10
const DESCEND_SWAY = 0.1
const DESCEND_SWAY_SPEED = 6.5
const HERO_EXIT_PAD = 120
//
// Tunnel: kept clear of the island ends so it never cuts the lake water,
// leaning away from the lake; it reaches below the deepest view.
//
const TUNNEL_EDGE_CLEAR = 90
const TUNNEL_EXTRA_DEPTH = 80
const TUNNEL_SEED = 52021
const TUNNEL_OPEN_SEC = 0.16
const GROUND_BELOW_WATER = 9
//
// Camera follows him down once he passes this fraction of the view height,
// on a soft spring, up to a cap; the underground darkness grows meanwhile.
//
const CAM_FOLLOW_FRAC = 0.6
const CAM_DROP_MAX = 300
const CAM_SPRING = { k: 30, c: 11 }
const DARK_MAX = 0.7
//
// Earth bursts: a big one as the feet break the ground and one where the
// plant itself goes under. The cones lean toward the open lake (the island
// only runs out to the right), so most of the earth rains into the water
// and the rest lands along the mound at whatever height it comes down on.
//
const SOIL_BURST = { halfW: 14, count: 46, speedMin: 220, speedRange: 340, sizeMin: 2, sizeRange: 4, spreadDeg: 48, tiltDeg: 42, drag: 0.85 }
const STONE_BURST = { halfW: 10, count: 12, speedMin: 260, speedRange: 340, sizeMin: 4, sizeRange: 4, spreadDeg: 45, tiltDeg: 36, drag: 0.9 }
const PLANT_BURST = { halfW: 18, count: 24, speedMin: 120, speedRange: 200, sizeMin: 2, sizeRange: 3, spreadDeg: 55, tiltDeg: 24, drag: 0.7 }
const BURST_DUST_MULT = 2.4
const IMPACT_SHAKE = 8
const IMPACT_SHAKE_SEC = 0.5
const SQUEEZE_SHAKE = 2.5
const SQUEEZE_SHAKE_SEC = 0.2
//
// Until the pull the grabbed hero is drawn just above the island (its baked
// greenery sits above the player plane and would swallow him), under the
// flower's front coils (eye-flower GRAB_FRONT_Z). From the pull on the
// tunnel layer draws him between its back and front strands. The fade
// covers everything in the level.
//
const HERO_Z = 11.92
const FADE_Z = CFG.visual.zIndex.ui * 20

/**
 * Creates the grab sequence (idle until start()).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay inst
 * @param {Object} cfg.flower - Eye-flower inst
 * @param {Object} cfg.heroInst - Hero inst
 * @param {number} cfg.earthBottomY - World Y where the playfield earth band ends
 * @param {Object} [cfg.footParticles] - Forest foot-particle pool (earth bursts)
 * @param {Object} [cfg.camera] - Forest camera inst (impact shake, view height)
 * @param {Object} [cfg.sound] - Sound inst
 * @param {function(Object): void} cfg.onFinished - Called once with k after the fade-out
 * @returns {Object} Flower-grab inst
 */
export function create(cfg) {
  const { k } = cfg
  const pal = FOREST_PAL.forestEyeFlower
  const inst = {
    k,
    flower: cfg.flower,
    heroInst: cfg.heroInst,
    earthBottomY: cfg.earthBottomY,
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
    camDrop: { v: 0, vel: 0 },
    struggleIn: STRUGGLE_GAP_MIN,
    pullFromX: 0,
    pullFromY: 0,
    descendFromY: 0,
    descendToY: 0,
    holeX: 0,
    heroX: 0,
    heroY: 0,
    heroVisible: true,
    inTunnel: false,
    tunnel: null,
    sprites: null,
    flipX: false,
    impactDone: false,
    holeOpening: false,
    holeOpen: 0,
    fade: null,
    soilColors: [pal.soil, pal.soilDark, pal.soilLight].map(forestRgb),
    stoneColors: [pal.stone, pal.stoneLight, pal.stoneDark].map(forestRgb),
    dustColor: forestRgb(pal.soilLight),
    splashColor: forestRgb(pal.splash),
    fadeColor: pal.fade
  }
  k.add([
    k.z(HERO_Z),
    {
      draw() {
        !inst.inTunnel && drawHero(inst)
      }
    }
  ])
  return inst
}

/**
 * Starts the grab on the hero who just landed on the island: takes him out of
 * physics and input, wakes the flower and bakes the (still hidden) tunnel
 * under the pull spot. Does nothing after the first call.
 * @param {Object} inst - Flower-grab inst
 */
export function start(inst) {
  if (inst.started) return
  const hero = inst.heroInst
  const char = hero?.character
  if (!char?.pos) return
  const flower = inst.flower
  inst.started = true
  inst.startX = char.pos.x
  inst.startY = char.pos.y
  inst.heroX = char.pos.x
  inst.heroY = char.pos.y
  inst.side = char.pos.x >= flower.baseX ? 1 : -1
  inst.holeX = Math.max(flower.x1 + TUNNEL_EDGE_CLEAR, Math.min(inst.startX - inst.side * PULL_TOWARD_PLANT, flower.shoreX - TUNNEL_EDGE_CLEAR))
  inst.groundY = Math.min(EyeFlower.soilLineY(flower, inst.holeX), flower.waterY - GROUND_BELOW_WATER)
  inst.flipX = char.flipX
  inst.prey.scale = char.scale?.x ?? 1
  inst.sprites = heroSprites(inst, hero)
  inst.descendToY = inst.earthBottomY + CAM_DROP_MAX + HERO_EXIT_PAD
  inst.tunnel = RootTunnel.create({
    k: inst.k,
    x: inst.holeX,
    groundY: inst.groundY,
    surfaceAt: EyeFlower.surfaceY,
    surfaceTarget: flower,
    bottomY: inst.descendToY + TUNNEL_EXTRA_DEPTH,
    earthBottomY: inst.earthBottomY,
    leanDir: inst.holeX > flower.baseX ? -1 : 1,
    seed: TUNNEL_SEED + Math.round(inst.holeX),
    drawPrey: () => drawHero(inst)
  })
  captureHero(hero, char)
  syncPrey(inst)
  EyeFlower.startGrab(flower, inst.prey, inst.groundY)
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
 * Advances the sequence: hero pose first, then the flower and the tunnel,
 * so the coils and the body move in the same frame.
 * @param {Object} inst - Flower-grab inst
 * @param {number} dt - Frame time in seconds
 */
export function onUpdate(inst, dt) {
  if (!isActive(inst) || inst.beat === BEAT.DONE) return
  const step = Math.min(dt, MAX_DT)
  inst.beatTime += step
  updateBeat(inst, step)
  stepSpring(inst.squash, squashTarget(inst), SQUASH_SPRING, step)
  stepSpring(inst.camDrop, camDropTarget(inst), CAM_SPRING, step)
  inst.holeOpen = inst.holeOpening ? Math.min(1, inst.holeOpen + step / TUNNEL_OPEN_SEC) : 0
  pinHero(inst)
  syncPrey(inst)
  EyeFlower.tickGrab(inst.flower, step)
  updateTunnel(inst, step)
}

/**
 * How far the camera follows the dragged hero below its fixed height
 * (whole px; add it to the camera Y after the regular follow).
 * @param {Object} inst - Flower-grab inst
 * @returns {number}
 */
export function cameraDropY(inst) {
  return inst?.started ? Math.round(inst.camDrop.v) : 0
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
    case BEAT.DESCEND:
      updateDescend(inst)
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
      inst.camera && ForestCamera.triggerShake(inst.camera, SQUEEZE_SHAKE, SQUEEZE_SHAKE_SEC)
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
      inst.inTunnel = true
      EyeFlower.setGrabPhase(flower, EyeFlower.GRAB_PHASE.PULL)
      break
    case BEAT.DESCEND:
      inst.descendFromY = inst.heroY
      RootTunnel.setDragging(inst.tunnel, true)
      burstSoil(inst, flower.baseX, PLANT_BURST, inst.soilColors)
      EyeFlower.setGrabPhase(flower, EyeFlower.GRAB_PHASE.RELEASE)
      break
    case BEAT.FADE:
      inst.heroVisible = false
      RootTunnel.setDragging(inst.tunnel, false)
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
// Violent drag into the crack: accelerating ease-in, the body snaps upright
// and the ground erupts as the feet break through.
//
function updatePull(inst, step) {
  const u = Math.min(1, inst.beatTime / PULL_SEC)
  const e = u * u * u
  const halfH = Hero.HERO_BAKE_SPRITE_SIZE * inst.prey.scale * 0.5
  const endY = inst.groundY + halfH * PULL_SINK_FRAC
  inst.heroX = inst.pullFromX + (inst.holeX - inst.pullFromX) * e
  inst.heroY = inst.pullFromY + (endY - inst.pullFromY) * e
  inst.swing.v *= Math.exp(-PULL_ANGLE_DAMP * step)
  inst.swing.vel = 0
  !inst.impactDone && inst.heroY + HERO_FOOT_DY * inst.prey.scale >= inst.groundY && burstEarth(inst)
  u >= 1 && setBeat(inst, BEAT.DESCEND)
}
//
// Dragged down the cut in tugs along its winding centre; darkness grows.
//
function updateDescend(inst) {
  const t = inst.beatTime
  const u = Math.min(1, t / DESCEND_SEC)
  const ease = u * u * (3 - 2 * u)
  const jerk = DESCEND_JERK_PX * Math.sin(u * Math.PI * DESCEND_JERKS) * (1 - u)
  inst.heroY = inst.descendFromY + (inst.descendToY - inst.descendFromY) * ease + jerk
  inst.heroX = RootTunnel.spineX(inst.tunnel, inst.heroY + HERO_CENTER_DY * inst.prey.scale)
  inst.swing.v = DESCEND_SWAY * Math.sin(t * DESCEND_SWAY_SPEED) * (1 - u * 0.5)
  inst.swing.vel = 0
  RootTunnel.setDarkness(inst.tunnel, DARK_MAX * ease)
  u >= 1 && setBeat(inst, BEAT.FADE)
}

function updateFade(inst) {
  const u = Math.min(1, inst.beatTime / FADE_SEC)
  inst.fade && (inst.fade.opacity = u * u * (3 - 2 * u))
  u >= 1 && setBeat(inst, BEAT.DONE)
}

function squashTarget(inst) {
  if (inst.beat === BEAT.PULL) return PULL_SQUASH
  if (inst.beat === BEAT.DESCEND) return DESCEND_SQUASH
  const held = inst.beat === BEAT.SQUEEZE || inst.beat === BEAT.LIFT || inst.beat === BEAT.HOLD
  return held ? SQUEEZE_SQUASH : 0
}
//
// The camera only starts following once he is being dragged down; it then
// keeps him above CAM_FOLLOW_FRAC of the view, never dropping past the cap.
//
function camDropTarget(inst) {
  if (inst.beat !== BEAT.DESCEND && inst.beat !== BEAT.FADE) return 0
  const k = inst.k
  const viewH = k.height()
  const viewTop = (inst.camera?.fixedCamY ?? viewH * 0.5) - viewH * 0.5
  return Math.max(0, Math.min(CAM_DROP_MAX, inst.heroY - viewTop - viewH * CAM_FOLLOW_FRAC))
}
//
// Tunnel follows the crack opening and the coil grip on the hero.
//
function updateTunnel(inst, step) {
  const tunnel = inst.tunnel
  if (!tunnel) return
  inst.holeOpening && RootTunnel.setOpen(tunnel, inst.holeOpen)
  RootTunnel.setPrey(tunnel, inst.heroX, inst.heroY, inst.prey.scale, inst.squash.v)
  RootTunnel.onUpdate(tunnel, step)
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
  particles && ForestFootParticles.spawnLanding(particles, inst.holeX, inst.groundY, inst.dustColor, BURST_DUST_MULT)
  inst.camera && ForestCamera.triggerShake(inst.camera, IMPACT_SHAKE, IMPACT_SHAKE_SEC)
  inst.sound && Sound.playFlowerEarthGulp(inst.sound)
}

//
// Crumbs land on the island ground or splash into the lake, wherever each
// one comes down.
//
function burstSoil(inst, x, burst, colors) {
  inst.footParticles && ForestFootParticles.spawnSoilBurst(inst.footParticles, {
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
// Grabbed hero: rotated with the dangle and squashed by the coils.
//
function drawHero(inst) {
  if (!inst.started || !inst.heroVisible || !inst.sprites) return
  const k = inst.k
  const caught = inst.beat !== BEAT.AWARE && inst.beat !== BEAT.STRIKE
  const size = Hero.HERO_BAKE_SPRITE_SIZE * inst.prey.scale
  k.drawSprite({
    sprite: caught ? inst.sprites.closed : inst.sprites.open,
    pos: k.vec2(inst.heroX, inst.heroY),
    anchor: 'center',
    width: size * (1 - inst.squash.v),
    height: size * (1 + inst.squash.v * SQUASH_Y_GAIN),
    flipX: inst.flipX,
    angle: inst.swing.v * 180 / Math.PI
  })
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
