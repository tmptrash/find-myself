import { CFG } from '../../../cfg.js'
import * as Hero from '../../../components/hero.js'
import * as Sound from '../../../utils/sound.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as CanvasBackdrop from '../../../utils/canvas-backdrop.js'
import * as TouchControls from '../../../utils/touch-controls.js'
import { set, get } from '../../../utils/progress.js'
import { initTouchInput, isTouchDevice } from '../../../utils/touch-input.js'
import { hudLeftWorldX } from '../../../utils/fullscreen.js'
import { goToMenuAfterAssets } from '../../../utils/lesson-assets.js'
import { registerNativeTeardown } from '../../../utils/engine-switch.js'
import { bindBackToMenuKeys, releaseGamePhysicalKeys, getRGB } from '../../../utils/helper.js'
import { applyForestHudSharpBake } from '../../forest/utils/forest-focus-depth.js'
import { CAVE_CFG } from '../cfg.js'
import * as Lantern from '../components/cave-lantern.js'
import * as Platform from './cave-platform.js'
import * as Fireflies from '../components/cave-fireflies.js'
import * as DeathFireflies from '../../../components/death-fireflies.js'
import * as StalkEye from '../components/cave-stalk-eye.js'
import * as Runner from '../components/cave-runner.js'
import * as Swarm from '../components/cave-swarm.js'
import * as Strider from '../components/cave-strider.js'
import * as StriderBridge from '../components/cave-strider-bridge.js'
import * as Bubbles from '../components/cave-bubbles.js'
import * as Fish from '../components/cave-fish.js'
import * as Giant from '../components/cave-giant.js'
import * as Lurker from '../components/cave-lurker.js'
import * as Haggy from '../components/cave-haggy.js'
import * as Pads from '../components/cave-pads.js'
import * as Trumpet from '../components/cave-trumpet.js'
import * as Atlas from './cave-atlas.js'
import * as Scene from './cave-scene.js'
import * as LakeBed from './cave-lake-bed.js'
import * as Layout from './cave-layout.js'
import * as Surface from './cave-surface.js'
import * as Terrain from './cave-terrain.js'
import * as Backdrop from './cave-backdrop.js'
import * as Front from './cave-front.js'
import * as CaveLake from './cave-lake.js'
import * as Ground from './cave-ground.js'
import * as Glow from './cave-glow.js'
import * as CaveSound from './cave-sound.js'
import * as View from './cave-view.js'
//
// Cave lesson 0 — the hero drops in from the forest down the tunnel the
// forest eye-flower's roots tore through the ceiling, onto the lake's left
// bank, a dry mushroom left of him (bounced on, crumbs and dust fall off
// it and its fireflies fly out of its holes, shy of the hero). A deep
// lake fills the hall, its giant living its own life under the water;
// across it is the right bank, past it a shaft of stone steps drops into the passage
// under the hall, where the stalk-eye stands (cave-layout.js). Under the
// left bank's lip lurks a snake of a plant: whoever comes to the bank's
// edge it snatches and chews (cave-lurker.js); a jump from its head while
// it chews lands on a plant whose crown of leaves lies on the water
// (cave-pads.js). Now and then the water striders line up from there
// toward the right bank, a way across on their sinking backs
// (cave-strider-bridge.js). Near the right bank a trumpeter waits on the
// bed for the fish leaping out of the water (cave-trumpet.js).
//
export const SCENE_NAME = 'lesson-cave.0'
const KEY_LAST_LESSON = 'lastLesson'
const KEY_SAFE_SPOT = 'cave.safeSpot'
const KEY_REACHED = 'cave.reached'           // Menu shows the cave's icon once the hero got here
//
// Draw order: back (parallax), the fireflies (behind the soil: they fly
// only in the open between the platforms), the far row of stones paving
// the left hollow's mouth, the lake's giant and its fish (behind the soil:
// the bed's walls — and the near row of those stones — hide them as they
// swim in and out),
// the drowning hero (behind the soil, in front of the giant), the lurker
// plant (behind the soil while its head is
// under the water, in front of it once out),
// the runner insects (behind the soil
// and its plants: they run behind the leaves), terrain, the lake water,
// what is on its surface (the fish's splashes, the water striders), the
// mushroom's fireflies, the hero and creatures (player z), the stones in
// front of him, the frame.
//
const Z_WORLD = 0
const Z_FIREFLIES = Z_WORLD + 0.2
const Z_DROWN_HERO = Z_WORLD + 0.375
const Z_TERRAIN = Z_WORLD + 0.4
const Z_RUNNERS = Z_WORLD + 0.38
const Z_WATER = Z_WORLD + 0.6
const Z_GIANT = Z_WORLD + 0.36
const Z_PAVE_BACK = Z_WORLD + 0.355
const Z_FISH = Z_WORLD + 0.37
const Z_LURKER = Z_WORLD + 0.39
const Z_LURKER_OUT = Z_WORLD + 0.45
const Z_LURKER_PLANTS = Z_WORLD + 0.395
const Z_LAKE_SURFACE = Z_WORLD + 0.7
//
// The climber (cave-haggy.js) draws in front of the soil and the water,
// behind the hero.
//
const Z_HAGGY = Z_WORLD + 0.8
const HAGGY_SEED = 4711
//
// The living things the blind climber (cave-haggy.js) may find — by an
// ultrasound echo off them or by touching them: the hero, the runners,
// the lurker's head, the fish out of the water, the giant's head; their
// bodies' radii (px).
//
const BEING_HERO_R = 20
const BEING_RUNNER_R = 9
const BEING_LURKER_R = 22
const BEING_FISH_R = 9
const BEING_GIANT_R = 40
//
// A fish's splash sounds full within the hero's reach and fades out over
// SPLASH_HEAR px from him.
//
const SPLASH_HEAR = 900
//
// The giant's breath carries farther: full near the hero, gone BREATH_HEAR
// px from him.
//
const BREATH_HEAR = 2000
//
// A firefly a fish ate lights up again over the lake, from LAKE_SKY_TOP
// down to LAKE_SKY_LOW px over the surface (where the fish can reach it).
//
const LAKE_SKY_TOP = 140
const LAKE_SKY_LOW = 30
const Z_LIGHTS = 9
const Z_FRONT = CFG.visual.zIndex.player + 1
const Z_LURKER_TOP = Z_FRONT + 0.5
const Z_DEATH_FLIES = Z_FRONT + 0.25
const Z_FRAME = CFG.visual.zIndex.ui - 1
const Z_GIANT_DEBUG = Z_FRAME - 1
//
// The giant's dev scene: keys holding it in a state (the hero's x for a
// surfacing under him), one to let it be, one toggling its debug overlay.
//
const GIANT_DEV_KEYS = {
  1: Giant.COMMAND.IDLE,
  2: Giant.COMMAND.SLOW,
  3: Giant.COMMAND.FAST,
  4: Giant.COMMAND.SURFACE,
  5: Giant.COMMAND.DIVE,
  6: Giant.COMMAND.TURN,
  0: Giant.COMMAND.AUTO
}
const GIANT_DEBUG_KEY = 'g'
//
// Static bodies: only the walls (they reach above the world so the entry
// fall is framed). The platforms are walked on their own top (cave-ground.js): a
// step as long as the platform the hero is on lies under him, and only
// its height follows the walking line under his X — it never slides
// sideways under him, so Kaplay, which carries a rider along with his
// platform, carries him only up and down the line, never along it (a step
// that followed his X added its own move to his run). Passable from
// below and untagged, so his legs' rays pass it and land on the platforms'
// own contour. A falling hero is caught where the bottom of his hitbox
// crossed the line since the last frame (CATCH_TOL either way); one
// already past it is set back to CATCH_EMBED px into the step, his fall
// speed kept, and Kaplay lands him on it.
//
const BODY_ABOVE_WORLD = 400
const STEP_H = 40
const CATCH_TOL = 6
const CATCH_EMBED = 2
const RIDE_SLACK = 16
const PARK_Y = -10000
//
// Death and respawn. A death at the lake (drowned, or fallen out of the
// world over it) brings him back to the bank he last stood on: on the left
// by the lantern mushroom, LANTERN_RESPAWN_DX px on from it toward the lake
// (clear of its cap); once he has crossed it, on the right bank
// RIGHT_BANK_RESPAWN_DX px in from its tip.
//
const LANTERN_RESPAWN_DX = 90
const RIGHT_BANK_RESPAWN_DX = 90
//
// Killed out of the water, he breaks into DEATH_BURST_COUNT white fireflies
// where he was (components/death-fireflies.js, drawn at Z_DEATH_FLIES in
// front of the world), lining up along his outline first; dying in the
// water (drowned, or swallowed under it) he is just gone. Coming back, the
// cave's own sparks gather.
//
const DEATH_BURST_COUNT = 48
const RESPAWN_BURST_COUNT = 14
const RESPAWN_DELAY = 2.3
//
// Back from a death the hero blinks and is safe for a while, as in the
// forest (CFG.game.respawnGraceSec): the lurker does not hunt him.
//
const RESPAWN_GRACE_SEC = CFG.game.respawnGraceSec
const RESPAWN_BLINK_SEC = CFG.game.respawnBlinkSec
const DEATH_SHAKE = 5
const FALL_OUT_Y = Layout.WORLD_H + 120
//
// A landing sounds after this long in the air (a jump or a fall, not a
// flicker over a bump in the ground), seconds.
//
const LAND_MIN_AIR = 0.12
//
// The fall into the lake sounds as in the forest: one water-steps take.
//
const WATER_STEPS_VOLUME = 0.42
//
// The level's bake inputs (cave-scene.js releaseBakeInputs) are let go this
// long after it is built: its first frames have baked what bakes lazily.
//
const BAKE_INPUTS_HOLD = 2
//
// How hard things break the lake's surface (CaveLake.disturb, 1: a full
// fish splash): the hero falling in, the lurker's head, a bubble popping
// (BUBBLE_WAVE per px of its radius).
//
const HERO_FALL_WAVE = 1.6
const LURKER_WAVE = 1.2
const BUBBLE_WAVE = 0.04
//
// Drowning (like the forest lake): the hero shuts his eyes in his calm
// pose and sinks slowly, drawn whole as one picture behind the soil and
// under the water (seen through it); once he is all down in the lake bed's
// soil (or after DROWN_MAX_TIME) a short silent pause.
//
const DROWN_SINK_SPEED = 100
const DROWN_MAX_TIME = 4
const DROWN_RESPAWN_DELAY = 0.8
const HALF = 0.5
//
// Ambient fireflies: how many; they fly only in the open air of the room,
// FIREFLY_PAD px clear of the soil and the water.
//
const FIREFLY_COUNT = 44
const FIREFLY_PAD = 10
//
// FPS readout over the top-left of the screen (like the forest's; on touch
// devices lined up with the fullscreen / back buttons).
//
const FPS_LEFT_X = 24
const FPS_TOP_Y = 44
const FPS_FONT_SCALE = 0.7
//
// The hero bounced off the dry mushroom: its crumbs and dust first, its
// fireflies coming out of its holes SWARM_DELAY s later.
//
const SWARM_DELAY = 0.35
//
// The hero snatched by the lurker: he is stuck in its jaws while it chews
// (it draws him there), then gone (his fireflies burst out of its jaws)
// and back on the bank by the lantern EATEN_RESPAWN s after that.
//
const EATEN_RESPAWN = 1
const LURKER_DRIP = 0.3
//
// The trumpeter's gulp of a fish sounds TRUMPET_GULP of a fish's splash.
//
const TRUMPET_GULP = 0.6
//
// The hero the trumpeter spat out flies up over onto the right bank: to
// SPIT_LAND_DX px past its tip (its ground found within SPIT_SEARCH px up
// or down), his arc's top SPIT_ARC px over the higher of its ends; the
// spit is a wet slosh, SPIT_LOUD (it is by the hero).
//
const SPIT_LAND_DX = 70
const SPIT_SEARCH = 400
const SPIT_ARC = 70
const SPIT_LOUD = 1
//
// Runners: one the lurker ate is back a little later, coming in at
// ENTRY_SPOT (on the floor under the roots' hole the hero came in by) and
// running off to where the hero is; every VISIT_EVERY..+RANGE s the hero
// spends on the lake's left bank (VISIT_AWAY_RATE as often while he is not
// on it) one runs out onto it, VISIT_IN..+RANGE px short of its edge —
// one already on the bank's run, else one out of sight, coming in at the
// way in.
//
const ENTRY_SPOT = { x: Layout.ENTRY_X, y: Layout.lakeFloor().y }
const VISIT_EVERY = 20
const VISIT_EVERY_RANGE = 20
const VISIT_IN = 20
const VISIT_IN_RANGE = 70
const VISIT_AWAY_RATE = 0.25
//
// The touch buttons are a little see-through.
//
const CONTROLS_OPACITY = 0.6

/**
 * Builds the whole cave level inside the active scene (once the prop
 * sheets are in; a direct start loads them first).
 * @param {Object} k - Kaplay instance
 * @param {Object} [opts]
 * @param {boolean} [opts.giantDev=false] - The giant's dev scene: the giant stays in the lake, keys drive its states, its debug overlay toggles
 */
export function create(k, opts = {}) {
  set(KEY_LAST_LESSON, SCENE_NAME)
  get(KEY_REACHED, false) || set(KEY_REACHED, true)
  CanvasBackdrop.applyCanvasBackdrop(k, CAVE_CFG.colors.frame)
  Atlas.isLoaded() ? build(k, opts) : Atlas.load().then(() => build(k, opts))
}
//
// Every part of the level, then its update and draw passes.
//
function build(k, opts) {
  k.setGravity(CFG.game.gravity)
  const view = View.create(k)
  const sfx = Sound.create()
  Sound.startAudioContext(sfx)
  const caveSound = CaveSound.create(sfx)
  CaveSound.startAmbience(caveSound)
  const lake = CaveLake.create(k)
  const pads = Pads.create({ k, lake })
  Glow.create(k)
  const inst = {
    k,
    view,
    sfx,
    caveSound,
    lake,
    backdrop: Backdrop.create(k, View.windowSize(view)),
    terrain: Terrain.create({ k }),
    front: Front.create(k),
    deathFlies: DeathFireflies.create({ k, z: Z_DEATH_FLIES }),
    haggy: Haggy.create({ k, seed: HAGGY_SEED }),
    haggyCtx: { view: { left: 0, top: 0, right: 0, bottom: 0 }, prey: [], onEat: null, beings: [] },
    fireflies: Fireflies.create({ k, bounds: Layout.FIREFLY_BOUNDS, count: FIREFLY_COUNT, isOpen: (x, y) => Surface.isOpenAir(x, y, FIREFLY_PAD) }),
    runners: Runner.createAll(k),
    striders: Strider.createAll(k, lake, [Pads.crownSpan(pads)]),
    striderFears: [],
    bubbles: null,
    fishMouths: [],
    bridge: null,
    fish: Fish.createAll(k, lake),
    giant: Giant.create({ k, lake, stay: Boolean(opts.giantDev) }),
    lurker: Lurker.create({ k, lake }),
    pads,
    trumpet: Trumpet.create({ k, lake }),
    trumpetCtx: null,
    trumpetDraw: null,
    lurkerCtx: null,
    visitIn: VISIT_EVERY,
    giantDebug: false,
    fishCtx: null,
    runnerFood: null,
    lakeSky: null,
    swarm: Swarm.create({ k }),
    lantern: createLantern(k),
    swarmIn: 0,
    platformByBody: new Map(),
    heroInst: null,
    safe: get(KEY_SAFE_SPOT, null),
    dead: false,
    drown: null,
    inTrumpet: false,
    spat: false,
    lastFeet: null,
    respawnAt: 0,
    graceUntil: 0,
    rightBank: false,
    deathX: 0,
    deathY: 0,
    lakeDeath: false,
    airFor: 0,
    drownLegs: null,
    eatenLegs: null,
    fps: null
  }
  Fireflies.setNest(inst.fireflies, Lantern.holes(inst.lantern))
  const lakeSpan = CaveLake.openSpan(lake)
  inst.lakeSky = { x1: lakeSpan.x1, x2: lakeSpan.x2, y1: Layout.LAKE_SURFACE_Y - LAKE_SKY_TOP, y2: Layout.LAKE_SURFACE_Y - LAKE_SKY_LOW }
  inst.fishCtx = {
    prey: [],
    swarmPrey: [],
    swarm: null,
    threats: [],
    giant: null,
    school: inst.fish,
    onCatch: prey => onFishCatch(inst, prey),
    onSplash: (x, strength) => onFishSplash(inst, x, strength)
  }
  inst.lurkerCtx = {
    hero: null,
    sinking: null,
    runners: inst.runners,
    runnerAbout: Runner.isAbout,
    onSeize: prey => onLurkerSeize(inst, prey),
    onSwallow: (prey, at) => onLurkerSwallow(inst, prey, at),
    onSplash: x => onLurkerSplash(inst, x),
    onDrip: x => onLurkerDrip(inst, x),
    school: inst.fish,
    fishHead: Fish.swimmingHead,
    giant: null
  }
  inst.trumpetCtx = {
    school: inst.fish,
    headOf: Fish.swimmingHead,
    leapOf: Fish.swarmLeapingHead,
    tailOf: Fish.leapingTail,
    landingOf: Fish.leapLandingX,
    seizeFish: Fish.seize,
    holdFish: Fish.hold,
    onCatch: fish => onTrumpetCatch(inst, fish),
    onSpit: at => spitHero(inst, at)
  }
  inst.trumpetDraw = {
    hero: at => drawEatenHero(inst, at, at.angle),
    fish: fish => Fish.onDraw(fish, View.worldRect(inst.view), true)
  }
  inst.runnerFood = {
    prey: [],
    onEat: f => Fireflies.eat(inst.fireflies, f)
  }
  const getHeroPos = () => heroPos(inst)
  const getView = () => View.worldRect(inst.view)
  inst.stalkEye = StalkEye.create({ k, ...rootedOn(Layout.STALK_EYE), getHeroPos, getView })
  inst.bubbles = Bubbles.create({ k, lake, onPop: (x, r) => onBubblePop(inst, x, r) })
  inst.bridge = StriderBridge.create({ k, striders: inst.striders, from: Pads.crownLine(pads).span().x2, to: Layout.BANK_TIP_X2, stop: inst.trumpet.x })
  createBodies(inst)
  Ground.setMovingLines([Lurker.topLine(inst.lurker), Pads.crownLine(inst.pads), ...inst.striders.map(Strider.line)])
  spawnHero(inst, startPose(inst))
  createHud(inst)
  initTouchInput(k)
  TouchControls.create(k, { opacity: CONTROLS_OPACITY })
  TouchControls.setVisible(true)
  addDrawLayers(inst)
  k.onUpdate(() => onUpdate(inst))
  bindLeave(inst)
  opts.giantDev && bindGiantDev(inst)
  //
  // Once every picture of the level is baked (some only on their first
  // draw), what they were baked from goes.
  //
  k.wait(BAKE_INPUTS_HOLD, Scene.releaseBakeInputs)
}
//
// Per-frame gameplay: hazards, lantern, creatures, ambience and camera.
//
function onUpdate(inst) {
  const k = inst.k
  const char = inst.heroInst?.character
  if (inst.drown) updateDrown(inst)
  else if (inst.dead) updateRespawn(inst)
  else if (inst.inTrumpet) holdInTrumpet(inst)
  else char?.exists?.() && updateHero(inst, char)
  Fireflies.onUpdate(inst.fireflies, heroPos(inst))
  updateRunners(inst)
  updateLurker(inst)
  releaseSwarm(inst)
  driveSwarm(inst)
  updateLakeLife(inst)
  StalkEye.onUpdate(inst.stalkEye)
  const focus = heroFocus(inst)
  CaveSound.onUpdate(inst.caveSound, k.dt(), focus.y)
  View.follow(inst.view, focus.x, focus.y, focus.vy)
  inst.fps && FpsCounter.onUpdate(inst.fps)
}
function updateHero(inst, char) {
  //
  // Pixel snap only on the ground: Kaplay steps physics at a fixed rate and
  // smooths the body between steps only while nothing else moves it, so
  // snapping in the air made jumps and falls stutter. Not while he rides
  // the lurker's head, the pad plant's leaves or a strider: Kaplay carries
  // him by their slow fractions of a pixel, which rounding would lose (or
  // add), letting him creep along them.
  //
  inst.heroInst.freePos = ridesLurker(inst) || ridesPads(inst) || Boolean(ridesStrider(inst))
  inst.spat && settleSpit(inst, char)
  char.isGrounded() && Hero.snapPosToPixels(inst.heroInst)
  rideGround(inst, char)
  trackLanding(inst, char)
  Lantern.onUpdate(inst.lantern, inst.heroInst) && lanternBounce(inst)
  trackSafeSpot(inst, char)
  const { x, y } = char.pos
  const feet = y + Layout.HERO_FEET_DY
  const prevFeet = inst.lastFeet ?? feet
  inst.lastFeet = feet
  if (Trumpet.takes(inst.trumpet, x, feet, prevFeet)) return grabByTrumpet(inst, char)
  const held = Pads.holds(inst.pads, x, feet) || inst.striders.some(strider => Strider.holds(strider, x, feet))
  if (Layout.isInLake(x, y) && !held) return startDrown(inst, char)
  y > FALL_OUT_Y && killHero(inst)
}
//
// Landings are heard by the level, not by the hero's own landing hook (it
// misses landings after the jump key was let go in the air): after a real
// time in the air, the first grounded frame plays the landing.
//
function trackLanding(inst, char) {
  if (!char.isGrounded()) {
    inst.airFor += inst.k.dt()
    return
  }
  inst.airFor >= LAND_MIN_AIR && playHeroStep(inst, inst.heroInst, true)
  inst.airFor = 0
}
//
// The hero bounced off the dry mushroom: its sound now, its fireflies a
// while later (releaseSwarm).
//
function lanternBounce(inst) {
  CaveSound.playLanternBounce(inst.caveSound)
  inst.swarmIn = SWARM_DELAY
}
//
// Once the wait after a bounce is over the mushroom's fireflies come out
// of its holes.
//
function releaseSwarm(inst) {
  if (inst.swarmIn <= 0) return
  inst.swarmIn -= inst.k.dt()
  inst.swarmIn <= 0 && Swarm.release(inst.swarm, Lantern.holes(inst.lantern))
}
function heroFocus(inst) {
  const char = inst.heroInst?.character
  if (inst.dead || !char?.exists?.()) return { x: inst.deathX, y: inst.deathY, vy: 0 }
  return { x: char.pos.x, y: char.pos.y, vy: char.vel?.y ?? 0 }
}
//
// The hero's centre for the creatures' eyes (none while he is dead or
// drowning).
//
function heroPos(inst) {
  const char = inst.heroInst?.character
  return inst.dead || inst.drown || !char?.exists?.() ? null : char.pos
}
//
// Whether the hero is off the ground: the swarm tells a jump onto it
// from a push along the ground by it.
//
function isHeroAirborne(inst) {
  const char = inst.heroInst?.character
  return Boolean(char?.exists?.() && char.isGrounded?.() === false)
}
//
// The swarm's fireflies and the hero: wherever he is any move of his at
// them drives them off.
//
function driveSwarm(inst) {
  Swarm.onUpdate(inst.swarm, heroPos(inst), isHeroAirborne(inst))
}
//
// Remembers the last solid platform the hero stood on (respawn point;
// written to storage only when the platform changes) and the lake's bank
// he stands on.
//
function trackSafeSpot(inst, char) {
  if (!char.isGrounded?.()) return
  const platform = inst.platformByBody.get(char.curPlatform?.())
  if (!platform || platform.moving) return
  trackBank(inst, char.pos.x)
  if (inst.safe?.id === platform.id) return
  inst.safe = { id: platform.id, x: Math.round(char.pos.x) }
  set(KEY_SAFE_SPOT, inst.safe)
}
//
// Fell out of the world: the hero breaks into white fireflies and comes
// back on the last safe platform.
//
function killHero(inst) {
  const k = inst.k
  const hero = inst.heroInst
  const char = hero.character
  inst.dead = true
  inst.deathX = char.pos.x
  inst.deathY = char.pos.y
  inst.lakeDeath = inst.deathX >= Layout.LAKE_X1 && inst.deathX <= Layout.LAKE_X2
  inst.respawnAt = k.time() + RESPAWN_DELAY
  hero.controllable = false
  hero.isDying = true
  char.exists() && k.destroy(char)
  hero.character = null
  releaseGamePhysicalKeys()
  k.shake(DEATH_SHAKE)
  CaveSound.playSparkBurst(inst.caveSound)
  DeathFireflies.burst(inst.deathFlies, inst.deathX, inst.deathY, DEATH_BURST_COUNT)
}
//
// Falling into the lake: controls off, no gravity, a splash, the calm
// pose; the hero then sinks at a slow steady speed (the hero module moves
// him to his sink point and hides his own picture; drawDrowningHero draws
// him under the water, behind the soil).
//
function startDrown(inst, char) {
  const hero = inst.heroInst
  hero.controllable = false
  hero.controlsDisabled = true
  hero.isDying = true
  hero.isSubmerging = true
  Hero.enterCalmPose(hero)
  Hero.applyCalmIdleSprite(hero)
  char.gravityScale = 0
  char.vel.x = 0
  char.vel.y = 0
  //
  // No body while he sinks: against the bowl's steep side by a bank its
  // collision kept pushing him back out, so he sank in jerks.
  //
  char.has('body') && char.unuse('body')
  inst.drown = { t: 0, x: Math.round(char.pos.x), y: char.pos.y }
  inst.lakeDeath = true
  hero.drownSinkX = inst.drown.x
  hero.drownSinkY = inst.drown.y
  releaseGamePhysicalKeys()
  Sound.playWaterStepsOnce(inst.sfx, WATER_STEPS_VOLUME)
  CaveLake.disturb(inst.lake, char.pos.x, HERO_FALL_WAVE)
  StriderBridge.breakUp(inst.bridge)
  inst.striders.forEach(strider => Strider.startle(strider, char.pos.x))
  inst.fish.forEach(fish => Fish.startle(fish, char.pos.x))
}
function updateDrown(inst) {
  const d = inst.drown
  const hero = inst.heroInst
  d.t += inst.k.dt()
  hero.drownSinkY = d.y + DROWN_SINK_SPEED * d.t
  const top = hero.drownSinkY - Hero.HERO_BAKE_SPRITE_SIZE * HALF
  const bed = CaveLake.bedTopAt(inst.lake, d.x)
  if (top < bed && d.t < DROWN_MAX_TIME) return
  const char = hero.character
  inst.deathX = d.x
  inst.deathY = d.y
  char?.exists?.() && inst.k.destroy(char)
  hero.character = null
  inst.drown = null
  inst.dead = true
  inst.respawnAt = inst.k.time() + DROWN_RESPAWN_DELAY
}
//
// The sinking hero: his calm closed-eyes picture on his legs standing as
// in idle, whole, behind the soil (the lake bed hides what of him has gone
// into it) and under the water.
//
function drawDrowningHero(inst) {
  const hero = inst.heroInst
  const char = hero?.character
  if (!inst.drown || !char?.exists?.()) return
  const k = inst.k
  const sprite = `${hero.spritePrefix}_closed`
  if (!k.getSprite(sprite)) return
  inst.drownLegs ??= Hero.createStandLegs(k)
  Hero.drawStandingHero(k, inst.drownLegs, { x: char.pos.x, y: char.pos.y, sprite, flipX: char.flipX, groundY: char.pos.y + Hero.HERO_FEET_OFFSET_Y })
}
function updateRespawn(inst) {
  if (inst.k.time() < inst.respawnAt) return
  const pose = inst.lakeDeath ? lakeBankPose(inst) : startPose(inst)
  inst.lakeDeath = false
  spawnHero(inst, pose)
  startRespawnGrace(inst)
  Fireflies.burst(inst.fireflies, pose.x, pose.y, RESPAWN_BURST_COUNT)
  inst.dead = false
}
//
// The hero's safe blinking moment after he comes back from a death.
//
function startRespawnGrace(inst) {
  inst.graceUntil = inst.k.time() + RESPAWN_GRACE_SEC
  Hero.startBlink(inst.heroInst, RESPAWN_BLINK_SEC)
}
function isRespawnGrace(inst) {
  return inst.k.time() < inst.graceUntil
}
//
// Saved safe platform if any (and still a dry spot on it: a save from
// before the layout changed may lie off it or in the lake), else the
// ledge under the roots' hole (where the forest's glimpse of the cave
// showed him land).
//
function startPose(inst) {
  const saved = inst.safe && Layout.PLATFORMS.find(p => p.id === inst.safe.id)
  const pose = saved && inst.safe.x >= saved.x1 && inst.safe.x <= saved.x2 ? Ground.standPoseOn(saved, inst.safe.x) : null
  return pose && !Layout.isInLake(pose.x, pose.y) ? pose : Ground.standPoseOn(Layout.PLATFORMS.find(p => p.id === Layout.START_PLATFORM), Layout.ENTRY_X)
}
//
// Which bank of the lake the hero stood on last (on solid ground; the
// floor's one platform runs on under both).
//
function trackBank(inst, x) {
  x > Layout.LAKE_X2 && (inst.rightBank = true)
  x < Layout.LAKE_X1 && (inst.rightBank = false)
}
//
// Back from a lake death on the bank he came from.
//
function lakeBankPose(inst) {
  return inst.rightBank ? Ground.standPoseOn(Layout.lakeFloor(), Layout.BANK_TIP_X2 + RIGHT_BANK_RESPAWN_DX) : lanternPose()
}
//
// By the lantern mushroom, on the lake's side of it.
//
function lanternPose() {
  const floor = Layout.PLATFORMS.find(p => p.id === Layout.LANTERN.on)
  return Ground.standPoseOn(floor, Layout.LANTERN.x + LANTERN_RESPAWN_DX)
}
function spawnHero(inst, pose) {
  const k = inst.k
  const prev = inst.heroInst
  prev?.character?.exists?.() && k.destroy(prev.character)
  const hero = Hero.create({
    k,
    x: pose.x,
    y: pose.y,
    type: Hero.HEROES.HERO,
    controllable: true,
    sfx: inst.sfx,
    stepSoundScene: SCENE_NAME,
    suppressDust: true,
    suppressFootprints: true,
    airAnimDuringFlicker: true,
    runDuringFlicker: true,
    idleVocalization: null
  })
  hero.onPlayStepSound = h => playHeroStep(inst, h, false)
  //
  // The hero's own landing hooks stay silent: the level plays landings
  // itself (trackLanding), the surface's sound only, no jump tone on top.
  //
  hero.onPlayLandSound = null
  hero.onPlayJumpLandSound = null
  Hero.setSurfaceRay(hero, Ground.raycast)
  Hero.spawn(hero, { instant: true })
  inst.heroInst = hero
  inst.prevBottom = pose.y + Layout.HERO_FEET_DY
  inst.lastFeet = null
  inst.inTrumpet = false
  inst.spat = false
  inst.rodeStep = false
  inst.stepPlatform = null
  inst.step.pos = k.vec2(0, PARK_Y)
  inst.airFor = 0
  !prev && View.snapTo(inst.view, pose.x, pose.y)
}
//
// Footsteps: a soft scuff on the mossy earth.
//
function playHeroStep(inst, hero, land) {
  hero.sfx && CaveSound.playStoneStep(inst.caveSound, land)
}
//
// Both walls, and the step that carries the hero along the platforms' top.
//
function createBodies(inst) {
  const k = inst.k
  const top = -BODY_ABOVE_WORLD
  const tall = Layout.WORLD_H + BODY_ABOVE_WORLD
  addSolid(k, 0, top, Layout.WALL_COLLIDE_W, tall)
  addSolid(k, Layout.WORLD_W - Layout.WALL_COLLIDE_W, top, Layout.WALL_COLLIDE_W, tall)
  inst.step = k.add([
    k.rect(Layout.WORLD_W, STEP_H),
    k.pos(0, PARK_Y),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0)
  ])
}
//
// Keeps the step under the hero on the platforms' walking line: while he
// stands on it, at the line's height under his X (past the line's ends it
// stays put and he walks off its edge — it is never parked from under his
// feet); while he falls, laid along the platform whose line he crossed;
// in the air otherwise (rising, or nothing under him) parked. A hero who
// stood on it last frame, is not jumping and still has his feet within
// RIDE_SLACK of its line counts as on it (a long frame can carry him off
// it for a moment); off its line's end he is caught like any faller. A
// hero standing on it but above it (his hitbox, tucked in the jump, grew
// back to full height on landing and lifted him) is set back down on it,
// so he never leaves it for a frame and flickers into the fall pose.
// While Kaplay still has the step as his platform it is never moved to
// another one or parked (it would carry him along).
//
function rideGround(inst, char) {
  const step = inst.step
  const box = char.worldArea().bbox()
  const bottom = box.pos.y + box.height
  const prevBottom = inst.prevBottom ?? bottom
  inst.prevBottom = bottom
  const rising = (char.vel?.y ?? 0) < 0
  const lineY = inst.stepPlatform ? Ground.walkOn(inst.stepPlatform, char.pos.x) : null
  const near = lineY !== null && Math.abs(char.pos.y + Layout.HERO_FEET_DY - lineY) <= RIDE_SLACK
  const onStep = Boolean(inst.stepPlatform) && ((char.isGrounded() && char.curPlatform?.() === step) || (inst.rodeStep && !rising && near))
  inst.rodeStep = onStep && !rising && lineY !== null
  if (onStep) {
    if (rising) return
    const span = inst.stepPlatform.moving ? inst.stepPlatform.span() : null
    //
    // A moving line gone from under him (a strider sunk, the lurker's head
    // under the water): with his feet in the lake the step stays put this
    // frame and he drowns (updateHero) — parked now, Kaplay would carry
    // him off with it.
    //
    if (inst.stepPlatform.moving && !span && Layout.isInLake(char.pos.x, char.pos.y)) return
    if (inst.stepPlatform.moving && !span) {
      step.pos = inst.k.vec2(0, PARK_Y)
      inst.stepPlatform = null
      inst.rodeStep = false
      return
    }
    const gap = step.pos.y - bottom
    gap > 0 && gap <= RIDE_SLACK && (char.pos.y += gap)
    span && (step.width = span.x2 - span.x1)
    lineY === null || (step.pos = inst.k.vec2(span ? span.x1 : step.pos.x, lineY))
    return
  }
  if (char.curPlatform?.() === step) return
  const hit = rising ? null : Ground.walkUnder(char.pos.x, Math.min(prevBottom, bottom) - CATCH_TOL, bottom + CATCH_TOL)
  if (!hit) {
    step.pos = inst.k.vec2(0, PARK_Y)
    return
  }
  step.width = hit.x2 - hit.x1
  step.pos = inst.k.vec2(hit.x1, hit.y)
  inst.stepPlatform = hit.platform
  inst.platformByBody.set(step, hit.platform)
  bottom > hit.y + CATCH_EMBED && (char.pos.y -= bottom - hit.y - CATCH_EMBED)
}
//
// A creature's or the lantern's spot with its foot on its platform's top.
//
function rootedOn(spot) {
  return { x: spot.x, y: Ground.topAt(Layout.PLATFORMS.find(p => p.id === spot.on), spot.x) }
}
function addSolid(k, x, y, w, h) {
  return k.add([
    k.rect(w, h),
    k.pos(x, y),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName
  ])
}
function createHud(inst) {
  const k = inst.k
  const hud = getRGB(k, CAVE_CFG.colors.fps)
  const shadow = getRGB(k, CAVE_CFG.colors.contour)
  inst.fps = FpsCounter.create({ k, topY: FPS_TOP_Y, textColor: hud, textColorOnTouch: true, outlineColor: shadow, postBakeCanvas: applyForestHudSharpBake, fontScale: FPS_FONT_SCALE, fpsOnly: true })
  FpsCounter.pinScreenFixed(inst.fps)
  FpsCounter.layoutAtScreenLeftX(inst.fps, isTouchDevice() ? hudLeftWorldX(k) : FPS_LEFT_X)
}
//
// Draw passes: the back world (parallax), the fireflies, the giant and
// the fish, the drowning hero (behind the soil), the terrain (the lake's
// bowl in it) with the lake's algae and the lantern, the see-through water,
// the fish's splashes and the striders on it, the mushroom's fireflies,
// the stones in front of the hero and the screen frame.
//
function addDrawLayers(inst) {
  const k = inst.k
  k.add([k.z(Z_WORLD), { draw: () => drawWorld(inst) }])
  k.add([k.z(Z_FIREFLIES), { draw: () => drawFireflies(inst) }])
  k.add([k.z(Z_HAGGY), { draw: () => Haggy.onDraw(inst.haggy) }])
  k.add([k.z(Z_DROWN_HERO), { draw: () => drawDrowningHero(inst) }])
  k.add([k.z(Z_TERRAIN), { draw: () => drawTerrain(inst) }])
  k.add([k.z(Z_RUNNERS), { draw: () => drawRunners(inst) }])
  k.add([k.z(Z_PAVE_BACK), { draw: () => LakeBed.onDrawBack(k) }])
  k.add([k.z(Z_GIANT), { draw: () => Giant.onDraw(inst.giant, View.worldRect(inst.view), drawHeldFish) }])
  k.add([k.z(Z_FISH), { draw: () => drawFish(inst) }])
  k.add([k.z(Z_LURKER), { draw: () => Pads.onDraw(inst.pads, View.worldRect(inst.view)) }])
  k.add([k.z(Z_LURKER), { draw: () => Trumpet.onDraw(inst.trumpet, View.worldRect(inst.view), inst.trumpetDraw) }])
  k.add([k.z(Z_LURKER), { draw: () => Lurker.onDrawRosette(inst.lurker, View.worldRect(inst.view)) }])
  k.add([k.z(Z_LURKER), { draw: () => drawLurker(inst, false) }])
  k.add([k.z(Z_LURKER_PLANTS), { draw: () => lurkerLayer(inst) === Z_LURKER_PLANTS && drawLurker(inst, true) }])
  k.add([k.z(Z_LURKER_OUT), { draw: () => lurkerLayer(inst) === Z_LURKER_OUT && drawLurker(inst, true) }])
  k.add([k.z(Z_LURKER_TOP), { draw: () => lurkerLayer(inst) === Z_LURKER_TOP && drawLurker(inst, true) }])
  k.add([k.z(Z_WATER), { draw: () => CaveLake.onDraw(inst.lake, View.worldRect(inst.view)) }])
  k.add([k.z(Z_LAKE_SURFACE), { draw: () => drawLakeSurface(inst) }])
  k.add([k.z(Z_LIGHTS), { draw: () => drawLights(inst) }])
  k.add([k.z(Z_FRONT), { draw: () => Front.onDraw(inst.front, View.worldRect(inst.view)) }])
  k.add([k.z(Z_GIANT_DEBUG), { draw: () => inst.giantDebug && Giant.onDrawDebug(inst.giant) }])
  k.add([k.z(Z_FRAME), { draw: () => View.onDrawFrame(inst.view) }])
}
function drawWorld(inst) {
  const view = View.worldRect(inst.view)
  Backdrop.onDraw(inst.backdrop, view)
}
function drawTerrain(inst) {
  const view = View.worldRect(inst.view)
  Terrain.onDraw(inst.terrain, view)
  CaveLake.onDrawAlgae(inst.lake)
  Lantern.onDraw(inst.lantern)
}
//
// The additive glow over the world: the cave's fireflies going in and out
// of the mushroom, and its own.
//
function drawLights(inst) {
  const view = View.worldRect(inst.view)
  Fireflies.onDrawNest(inst.fireflies, view.top, view.bottom)
  Swarm.onDraw(inst.swarm)
}
//
// The runners: afraid of the hero, now and then leaping for a firefly.
//
function updateRunners(inst) {
  sendVisitor(inst)
  const hero = heroPos(inst)
  const food = inst.runnerFood
  food.prey.length = 0
  Fireflies.forEachLit(inst.fireflies, f => food.prey.push(f))
  inst.runners.forEach(runner => Runner.onUpdate(runner, hero, food))
  updateHaggy(inst, food)
}
//
// The climber: blind, it finds the living things about only by its
// ultrasound's echoes off them and by touching them (their bodies are
// told to it here, in one list kept from frame to frame: the hero, the
// runners, the lurker's head, the fish out of the water, the giant's
// head); its free hands snatch the fireflies they touch, the ones the
// runners leap for.
//
function updateHaggy(inst, food) {
  const ctx = inst.haggyCtx
  View.worldRect(inst.view, ctx.view)
  ctx.prey = food.prey
  ctx.onEat = food.onEat
  let n = 0
  n = setBeing(ctx.beings, n, heroPos(inst), BEING_HERO_R)
  for (let i = 0; i < inst.runners.length; i++) n = setBeing(ctx.beings, n, Runner.isAbout(inst.runners[i]) ? inst.runners[i].pos : null, BEING_RUNNER_R)
  n = setBeing(ctx.beings, n, inst.lurker.head, BEING_LURKER_R)
  for (let i = 0; i < inst.fish.length; i++) n = setBeing(ctx.beings, n, Fish.leapingTail(inst.fish[i]), BEING_FISH_R)
  setBeing(ctx.beings, n, Giant.bodyLine(inst.giant)?.pts[0] ?? null, BEING_GIANT_R)
  Haggy.onUpdate(inst.haggy, ctx)
}
//
// The n-th living thing's body in the climber's list (its record made
// once, then only updated): its middle and radius; not about (live:
// false) while it has no place.
//
function setBeing(beings, n, pos, r) {
  beings[n] ??= { x: 0, y: 0, r, live: false }
  const b = beings[n]
  b.live = Boolean(pos)
  b.x = pos ? pos.x : b.x
  b.y = pos ? pos.y : b.y
  return n + 1
}
//
// The lurker by the left bank: it hunts the hero on the bank (or sinking
// in the lake near it; not while he is safe after a respawn) and the
// runners about.
//
function updateLurker(inst) {
  const ctx = inst.lurkerCtx
  const char = inst.heroInst?.character
  ctx.hero = isRespawnGrace(inst) ? null : heroPos(inst)
  ctx.sinking = inst.drown && char?.exists?.() ? char.pos : null
  ctx.giant = Giant.bodyLine(inst.giant)
  Lurker.bear(inst.lurker, ridesLurker(inst))
  Pads.bear(inst.pads, ridesPads(inst))
  Pads.onUpdate(inst.pads)
  Lurker.onUpdate(inst.lurker, ctx)
}
//
// The lurker caught something (its jaws snap shut): a runner is gone (for
// a while, the snap heard as far as a fish's splash); the hero
// is eaten — gone at once, a lake death (he comes back by the lantern
// once it has swallowed him).
//
function onLurkerSeize(inst, prey) {
  if (prey.runner) {
    const focus = heroFocus(inst)
    CaveSound.playSnap(inst.caveSound, 1 - Math.abs(prey.runner.pos.x - focus.x) / SPLASH_HEAR)
    Runner.snatch(prey.runner, ENTRY_SPOT, () => heroPos(inst))
    return
  }
  const hero = inst.heroInst
  const char = hero.character
  inst.drown = null
  inst.dead = true
  inst.deathX = char.pos.x
  inst.deathY = char.pos.y
  inst.lakeDeath = true
  inst.respawnAt = Infinity
  hero.controllable = false
  hero.isDying = true
  char.exists() && inst.k.destroy(char)
  hero.character = null
  releaseGamePhysicalKeys()
  inst.k.shake(DEATH_SHAKE)
}
//
// It has eaten what it caught: the hero's fireflies burst out of its jaws
// (out of the water only; under it he is just gone) and he comes back soon
// after.
//
function onLurkerSwallow(inst, prey, at) {
  if (prey.runner) return
  const surfaceY = CaveLake.surfaceAt(inst.lake, at.x)
  const inWater = at.y > surfaceY
  inWater || CaveSound.playSparkBurst(inst.caveSound)
  inWater || DeathFireflies.burst(inst.deathFlies, at.x, at.y, DEATH_BURST_COUNT, surfaceY)
  inst.deathX = at.x
  inst.deathY = at.y
  inst.respawnAt = inst.k.time() + EATEN_RESPAWN
}
//
// Whether the hero stands on the lurker's jaws (on the step laid along
// their top).
//
function ridesLurker(inst) {
  const char = inst.heroInst?.character
  return Boolean(char?.exists?.()) && inst.stepPlatform === Lurker.topLine(inst.lurker) && char.curPlatform?.() === inst.step
}
//
// Whether the hero stands on the pad plant's leaves.
//
function ridesPads(inst) {
  const char = inst.heroInst?.character
  return Boolean(char?.exists?.()) && inst.stepPlatform === Pads.crownLine(inst.pads) && char.curPlatform?.() === inst.step
}
//
// The strider the hero stands on (on the step laid along its back), or
// null.
//
function ridesStrider(inst) {
  const char = inst.heroInst?.character
  if (!char?.exists?.() || char.curPlatform?.() !== inst.step) return null
  return inst.striders.find(strider => inst.stepPlatform === Strider.line(strider)) ?? null
}
//
// The lurker: all of it behind the soil and under the water's paint
// (its head too while that is under the water); once its head is out, its
// head and what of its neck is out of the water again in front of
// everything on the bank (it never goes behind the bank, its plants or its
// stones; the water's line stays over its neck) — but behind the bank's
// plants while it pounces on a runner among them (as the runner is), and
// under the hero standing on its head.
//
function lurkerLayer(inst) {
  if (!Lurker.isOut(inst.lurker)) return Z_LURKER
  if (Lurker.amongPlants(inst.lurker)) return Z_LURKER_PLANTS
  return ridesLurker(inst) ? Z_LURKER_OUT : Z_LURKER_TOP
}
function drawLurker(inst, over) {
  Lurker.onDraw(inst.lurker, View.worldRect(inst.view), (prey, at, angle, size) => (prey.runner ? Runner.drawHeld(prey.runner, at, angle, size) : drawEatenHero(inst, at, angle)), over)
}
//
// The hero stuck in the lurker's jaws: his calm closed-eyes picture on his
// dangling legs, turned with its head.
//
function drawEatenHero(inst, at, angle) {
  const k = inst.k
  const hero = inst.heroInst
  const sprite = hero && `${hero.spritePrefix}_closed`
  if (!sprite || !k.getSprite(sprite)) return
  inst.eatenLegs ??= Hero.createStandLegs(k)
  k.pushTransform()
  k.pushTranslate(k.vec2(at.x, at.y))
  k.pushRotate(angle)
  Hero.drawStandingHero(k, inst.eatenLegs, { x: 0, y: 0, sprite, groundY: null })
  k.popTransform()
}
//
// Its head broke the surface (bursting out, or dragging the hero under):
// a slosh, and everything in the water and on it near there startles.
//
function onLurkerSplash(inst, x) {
  const focus = heroFocus(inst)
  CaveSound.playSlosh(inst.caveSound, 1 - Math.abs(x - focus.x) / SPLASH_HEAR)
  CaveLake.disturb(inst.lake, x, LURKER_WAVE)
  inst.striders.forEach(strider => Strider.startle(strider, x))
  inst.fish.forEach(fish => Fish.startle(fish, x))
}
//
// Now and then a runner runs out onto the lake's left bank.
//
function sendVisitor(inst) {
  const hero = heroPos(inst)
  const onBank = Boolean(hero) && hero.x < Layout.BANK_TIP_X && hero.y < Layout.LAKE_SURFACE_Y
  inst.visitIn -= inst.k.dt() * (onBank ? 1 : VISIT_AWAY_RATE)
  if (inst.visitIn > 0) return
  inst.visitIn = VISIT_EVERY + Math.random() * VISIT_EVERY_RANGE
  const x = Layout.BANK_TIP_X - VISIT_IN - Math.random() * VISIT_IN_RANGE
  const spot = { x, y: Ground.topAt(Layout.lakeFloor(), x) }
  const about = inst.runners.filter(Runner.isAbout)
  if (about.some(runner => Runner.sendTo(runner, spot))) return
  const view = View.worldRect(inst.view)
  const away = about.find(r => r.pos.x < view.left || r.pos.x > view.right || r.pos.y < view.top || r.pos.y > view.bottom)
  away && Runner.comeFrom(away, ENTRY_SPOT, spot)
}
//
// A drop from the lurker's mouth falling into the water: a soft plop,
// quieter than a fish's (LURKER_DRIP of its splash).
//
function onLurkerDrip(inst, x) {
  const focus = heroFocus(inst)
  CaveSound.playFishSplash(inst.caveSound, LURKER_DRIP, 1 - Math.abs(x - focus.x) / SPLASH_HEAR)
  CaveLake.disturb(inst.lake, x, LURKER_DRIP)
}
//
// The trumpeter caught a leaping fish: it is gone (to swim back in later),
// with a soft gulp of water.
//
function onTrumpetCatch(inst, fish) {
  Fish.eat(fish)
  onFishSplash(inst, inst.trumpet.x, TRUMPET_GULP)
}
//
// The hero dropped into the trumpeter's open funnel: controls off, no
// gravity, his own picture hidden (it draws him in its funnel, his lower
// half in it); he goes where it holds him.
//
function grabByTrumpet(inst, char) {
  const hero = inst.heroInst
  const fall = char.vel.y
  hero.controlsDisabled = true
  hero.isSubmerging = true
  char.gravityScale = 0
  char.vel.x = 0
  char.vel.y = 0
  inst.inTrumpet = true
  releaseGamePhysicalKeys()
  Trumpet.grab(inst.trumpet, char.pos.y, fall)
  holdInTrumpet(inst)
  onFishSplash(inst, inst.trumpet.x, TRUMPET_GULP)
}
function holdInTrumpet(inst) {
  const at = Trumpet.heldPoint(inst.trumpet)
  inst.heroInst.drownSinkX = at.x
  inst.heroInst.drownSinkY = at.y
}
//
// Spat out (with a slosh): his own picture back, thrown in an arc onto
// the right bank, no control till he lands there.
//
function spitHero(inst, at) {
  const hero = inst.heroInst
  const char = hero?.character
  if (!char?.exists?.()) return
  CaveSound.playSlosh(inst.caveSound, SPIT_LOUD)
  inst.inTrumpet = false
  inst.spat = true
  hero.isSubmerging = false
  hero.drownSinkX = null
  hero.drownSinkY = null
  hero.direction = 1
  char.hidden = false
  char.moveTo(at.x, at.y)
  char.gravityScale = 1
  const v = spitThrow(at)
  char.vel.x = v.x
  char.vel.y = v.y
  inst.prevBottom = at.y + Layout.HERO_FEET_DY
  inst.lastFeet = null
}
//
// The throw from `at` that lands his feet SPIT_LAND_DX px past the right
// bank's tip, over an arc SPIT_ARC px high.
//
function spitThrow(at) {
  const x = Layout.BANK_TIP_X2 + SPIT_LAND_DX
  const hit = Ground.walkUnder(x, at.y - SPIT_SEARCH, at.y + SPIT_SEARCH)
  const y = (hit ? hit.y : at.y) - Layout.HERO_FEET_DY
  const g = CFG.game.gravity
  const apex = Math.min(at.y, y) - SPIT_ARC
  const up = Math.sqrt(2 * g * (at.y - apex))
  const time = up / g + Math.sqrt(2 * (y - apex) / g)
  return { x: (x - at.x) / time, y: -up }
}
//
// Landed after a spit: his slide stopped, his controls back.
//
function settleSpit(inst, char) {
  if (!char.isGrounded()) return
  char.vel.x = 0
  inst.heroInst.controlsDisabled = false
  inst.spat = false
}
function drawRunners(inst) {
  const view = View.worldRect(inst.view)
  inst.runners.forEach(runner => Runner.onDraw(runner, view))
}
//
// The lake's life: the giant comes in now and then to eat fish; the fish
// hunt every lit firefly (the hall's or the swarm's), all of them going
// for the swarm while it hangs over the water, and flee the hero in the water and
// the giant (its snout, middle and tail); the striders fear everything
// near the lake that moves — the hero (on the bank, over the water or
// sinking in it), the runners, the swarm, a fish near the surface,
// the giant; bubbles rise from the bed (and out of the fish's mouths) now
// and then.
//
function updateLakeLife(inst) {
  CaveLake.onUpdate(inst.lake)
  const ctx = inst.fishCtx
  const char = inst.heroInst?.character
  const hero = !inst.dead && char?.exists?.() ? char.pos : null
  ctx.prey.length = 0
  ctx.swarmPrey.length = 0
  Fireflies.forEachLit(inst.fireflies, f => ctx.prey.push(f))
  Swarm.forEachFlying(inst.swarm, fly => ctx.swarmPrey.push(fly))
  ctx.swarmPrey.forEach(fly => ctx.prey.push(fly))
  ctx.swarm = Swarm.center(inst.swarm)
  Giant.onUpdate(inst.giant, { school: inst.fish, headOf: Fish.swimmingHead, canEat: Fish.isSmall, middleOf: Fish.middle, onChase: Fish.bolt, onSeize: Fish.seize, onHold: Fish.hold, onEat: Fish.eat, onBreath: (exhale, x) => onGiantBreath(inst, exhale, x) })
  ctx.threats.length = 0
  inst.drown && hero && ctx.threats.push(hero)
  ctx.giant = Giant.bodyLine(inst.giant)
  inst.fish.forEach(fish => Fish.onUpdate(fish, ctx))
  Trumpet.onUpdate(inst.trumpet, inst.trumpetCtx)
  Bubbles.onUpdate(inst.bubbles, Fish.swimmingMouths(inst.fish, inst.fishMouths))
  const fears = inst.striderFears
  fears.length = 0
  hero && fears.push(hero)
  inst.runners.forEach(runner => fears.push(runner.pos))
  const swarm = Swarm.center(inst.swarm)
  swarm && fears.push(swarm)
  inst.fish.forEach(fish => {
    const head = Fish.surfacePoint(fish)
    head && fears.push(head)
  })
  Giant.fearPoints(inst.giant).forEach(p => fears.push(p))
  const lurker = Lurker.surfacePoint(inst.lurker)
  lurker && fears.push(lurker)
  const ridden = ridesStrider(inst)
  inst.striders.forEach(strider => Strider.bear(strider, strider === ridden ? inst.heroInst.direction || 1 : 0))
  StriderBridge.onUpdate(inst.bridge, ridden)
  inst.striders.forEach(strider => Strider.onUpdate(strider, fears, inst.striders))
}
//
// A fish reached a firefly: one of the swarm's dodges it (they are never
// eaten); an ambient one is eaten (and lights up again over the lake
// later).
//
function onFishCatch(inst, prey) {
  inst.swarm.flies.includes(prey) ? Swarm.dodge(inst.swarm, prey) : Fireflies.eat(inst.fireflies, prey, inst.lakeSky)
}
function onGiantBreath(inst, exhale, x) {
  const focus = heroFocus(inst)
  CaveSound.playGiantBreath(inst.caveSound, exhale, 1 - Math.abs(x - focus.x) / BREATH_HEAR)
}
//
// A bubble popped on the surface: a plip, faded over SPLASH_HEAR px from
// the hero as a splash is.
//
function onBubblePop(inst, x, r) {
  const focus = heroFocus(inst)
  CaveSound.playBubble(inst.caveSound, r, 1 - Math.abs(x - focus.x) / SPLASH_HEAR)
  CaveLake.disturb(inst.lake, x, r * BUBBLE_WAVE)
}
function onFishSplash(inst, x, strength) {
  const focus = heroFocus(inst)
  CaveSound.playFishSplash(inst.caveSound, strength, 1 - Math.abs(x - focus.x) / SPLASH_HEAR)
  CaveLake.disturb(inst.lake, x, strength)
}
//
// A fish in the giant's jaws: only what sticks out of its mouth.
//
function drawHeldFish(fish, view, cut) {
  Fish.onDraw(fish, view, true, cut)
}
//
// The fish far to near (deeper in z first), then the sand they spill.
//
function drawFish(inst) {
  const view = View.worldRect(inst.view)
  inst.fish.sort((a, b) => Fish.depth(b) - Fish.depth(a))
  inst.fish.forEach(fish => Fish.onDraw(fish, view))
  inst.fish.forEach(fish => Fish.onDrawSand(fish))
}
//
// On the surface: first everything drawn as plain shapes — the fish's
// and the lurker's splashes, the bubbles rising from the bed, the
// striders' water marks — then the sprites: the pad plant's crown, the
// giant's breath, the striders. Shapes and sprites are not mixed: every
// switch between them is one more batch for the GPU.
//
function drawLakeSurface(inst) {
  const view = View.worldRect(inst.view)
  inst.fish.forEach(fish => Fish.onDrawSplash(fish))
  Bubbles.onDraw(inst.bubbles, view)
  Lurker.onDrawSplash(inst.lurker)
  inst.striders.forEach(strider => Strider.onDrawWater(strider, view))
  Pads.onDrawCrown(inst.pads, view)
  Giant.onDrawMist(inst.giant)
  inst.striders.forEach(strider => Strider.onDraw(strider, view))
}
function drawFireflies(inst) {
  const view = View.worldRect(inst.view)
  Fireflies.onDraw(inst.fireflies, view.top, view.bottom)
}
//
// Esc → menu; ambience stops on scene leave or native engine teardown.
//
//
// The giant's dev scene: its state keys and its debug overlay's toggle.
//
function bindGiantDev(inst) {
  const k = inst.k
  inst.giantDebug = true
  Object.entries(GIANT_DEV_KEYS).forEach(([key, cmd]) => k.onKeyPress(key, () => giantCommand(inst, cmd)))
  k.onKeyPress(GIANT_DEBUG_KEY, () => { inst.giantDebug = !inst.giantDebug })
}
function giantCommand(inst, cmd) {
  Giant.command(inst.giant, cmd, inst.heroInst?.character?.pos?.x)
}
function bindLeave(inst) {
  const k = inst.k
  const stopAudio = () => CaveSound.stop(inst.caveSound)
  registerNativeTeardown(stopAudio)
  const back = bindBackToMenuKeys(k, () => goToMenuAfterAssets(k))
  k.onSceneLeave(() => {
    back.cancel()
    stopAudio()
    CanvasBackdrop.clearCanvasBackdrop(k)
  })
}
//
// The lantern mushroom on its platform (its crumbs and dust come to rest
// on that platform's soil).
//
function createLantern(k) {
  const p = Layout.PLATFORMS.find(q => q.id === Layout.LANTERN.on)
  return Lantern.create({ k, x: Layout.LANTERN.x, y: Lantern.footYOn(p, Layout.LANTERN.x), groundAt: x => Platform.surfaceAt(p, x) })
}
