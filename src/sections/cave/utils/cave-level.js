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
import * as Fireflies from '../components/cave-fireflies.js'
import * as EyeFlower from '../components/cave-eye-flower.js'
import * as StalkEye from '../components/cave-stalk-eye.js'
import * as Exit from '../components/cave-exit.js'
import * as Atlas from './cave-atlas.js'
import * as Layout from './cave-layout.js'
import * as Terrain from './cave-terrain.js'
import * as Backdrop from './cave-backdrop.js'
import * as Front from './cave-front.js'
import * as CaveLake from './cave-lake.js'
import * as Ground from './cave-ground.js'
import * as Glow from './cave-glow.js'
import * as CaveSound from './cave-sound.js'
import * as View from './cave-view.js'
//
// Cave lesson 0 — the hero drops in from the forest through the hole the
// eye-flower's roots tore in the ceiling, onto an earth ledge, a dormant
// lantern mushroom left of him (bounced on, it lights up). Right past the
// gap the hostile eye-flower watches him. Below lies the lake hall: stone
// platforms over a shallow lake climb into the crevice of the exit, up to
// the stalk-eye's ledge; past the stalk-eye a shaft of stone steps drops
// into the passage under the hall (cave-layout.js).
//
export const SCENE_NAME = 'lesson-cave.0'
const KEY_LAST_LESSON = 'lastLesson'
const KEY_SAFE_SPOT = 'cave.safeSpot'
const KEY_REACHED = 'cave.reached'           // Menu shows the cave's icon once the hero got here
const START_PLATFORM = 'upper'
//
// Draw order: back (parallax), the eye-flower (behind its ledge, its root
// in the soil), terrain, the drowning hero, the lake water, the lights,
// the hero and creatures (player z), the stones in front of him, the
// frame.
//
const Z_WORLD = 0
const Z_FLOWER = Z_WORLD + 0.3
const Z_TERRAIN = Z_WORLD + 0.4
const Z_DROWN_HERO = Z_WORLD + 0.5
const Z_WATER = Z_WORLD + 0.6
const Z_LIGHTS = 9
const Z_FRONT = CFG.visual.zIndex.player + 1
const Z_FRAME = CFG.visual.zIndex.ui - 1
//
// The eye-flower's root sinks this far into its ledge's top.
//
const FLOWER_SINK = 14
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
// Death and respawn.
//
const DEATH_BURST_COUNT = 48
const RESPAWN_BURST_COUNT = 14
const RESPAWN_DELAY = 2.3
const DEATH_SHAKE = 5
const FALL_OUT_Y = Layout.WORLD_H + 120
//
// A landing sounds after this long in the air (a jump or a fall, not a
// flicker over a bump in the ground), seconds.
//
const LAND_MIN_AIR = 0.12
const SPLASH_VOLUME = 0.3
//
// Drowning (like the forest lake): the hero sinks slowly into the water,
// then a short silent pause.
//
const DROWN_SINK_SPEED = 48
const DROWN_TIME = 1.5
const DROWN_RESPAWN_DELAY = 0.8
//
// Ambient fireflies.
//
const FIREFLY_COUNT = 44
//
// Steady glow: the daylight falling in through the roots' hole (radius,
// opacity).
//
const HOLE_GLOW = { x: Layout.ENTRY_X, y: Layout.ENTRY_Y + 30, r: 130, opacity: 0.4, color: 'rootLight' }
//
// FPS readout over the top-left of the screen (like the forest's; on touch
// devices lined up with the fullscreen / back buttons).
//
const FPS_LEFT_X = 24
const FPS_TOP_Y = 44
const FPS_FONT_SCALE = 0.7
const GLOW_FLICKER_SPEED = 1.3
const GLOW_FLICKER = 0.12

/**
 * Builds the whole cave level inside the active scene (once the prop
 * sheets are in; a direct start loads them first).
 * @param {Object} k - Kaplay instance
 */
export function create(k) {
  set(KEY_LAST_LESSON, SCENE_NAME)
  get(KEY_REACHED, false) || set(KEY_REACHED, true)
  CanvasBackdrop.applyCanvasBackdrop(k, CAVE_CFG.colors.frame)
  Atlas.isLoaded() ? build(k) : Atlas.load().then(() => build(k))
}
//
// Every part of the level, then its update and draw passes.
//
function build(k) {
  k.setGravity(CFG.game.gravity)
  const view = View.create(k)
  const sfx = Sound.create()
  Sound.startAudioContext(sfx)
  const caveSound = CaveSound.create(sfx)
  CaveSound.startAmbience(caveSound)
  const lake = CaveLake.create(k)
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
    fireflies: Fireflies.create({ k, bounds: Layout.FIREFLY_BOUNDS, count: FIREFLY_COUNT }),
    lantern: Lantern.create({ k, ...rootedOn(Layout.LANTERN) }),
    exit: Exit.create({ k }),
    glows: [HOLE_GLOW].map(g => ({ ...g, rgb: getRGB(k, CAVE_CFG.colors[g.color]) })),
    platformByBody: new Map(),
    heroInst: null,
    safe: get(KEY_SAFE_SPOT, null),
    dead: false,
    drown: null,
    respawnAt: 0,
    deathX: 0,
    deathY: 0,
    airFor: 0,
    fps: null
  }
  const getHeroPos = () => heroPos(inst)
  const getView = () => View.worldRect(inst.view)
  const flowerRoot = rootedOn(Layout.EYE_FLOWER)
  inst.eyeFlower = EyeFlower.create({ k, x: flowerRoot.x, y: flowerRoot.y + FLOWER_SINK, z: Z_FLOWER, getHeroPos, getView })
  inst.stalkEye = StalkEye.create({ k, ...rootedOn(Layout.STALK_EYE), getHeroPos, getView })
  createBodies(inst)
  spawnHero(inst, startPose(inst))
  createHud(inst)
  initTouchInput(k)
  TouchControls.create(k)
  TouchControls.setVisible(true)
  addDrawLayers(inst)
  k.onUpdate(() => onUpdate(inst))
  bindLeave(inst)
}
//
// Per-frame gameplay: hazards, lantern, creatures, ambience and camera.
//
function onUpdate(inst) {
  const k = inst.k
  const char = inst.heroInst?.character
  if (inst.drown) updateDrown(inst, char)
  else if (inst.dead) updateRespawn(inst)
  else char?.exists?.() && updateHero(inst, char)
  Fireflies.onUpdate(inst.fireflies)
  EyeFlower.onUpdate(inst.eyeFlower)
  StalkEye.onUpdate(inst.stalkEye)
  Exit.onUpdate(inst.exit)
  const focus = heroFocus(inst)
  CaveSound.onUpdate(inst.caveSound, k.dt(), focus.y)
  View.follow(inst.view, focus.x, focus.y, focus.vy)
  inst.fps && FpsCounter.onUpdate(inst.fps)
}
function updateHero(inst, char) {
  //
  // Pixel snap only on the ground: Kaplay steps physics at a fixed rate and
  // smooths the body between steps only while nothing else moves it, so
  // snapping in the air made jumps and falls stutter.
  //
  char.isGrounded() && Hero.snapPosToPixels(inst.heroInst)
  rideGround(inst, char)
  trackLanding(inst, char)
  Lantern.onUpdate(inst.lantern, inst.heroInst) && CaveSound.playLanternBounce(inst.caveSound)
  trackSafeSpot(inst, char)
  const { x, y } = char.pos
  if (Layout.isInLake(x, y)) return startDrown(inst, char)
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
// Remembers the last solid platform the hero stood on (respawn point);
// written to storage only when the platform changes.
//
function trackSafeSpot(inst, char) {
  if (!char.isGrounded?.()) return
  const platform = inst.platformByBody.get(char.curPlatform?.())
  if (!platform || inst.safe?.id === platform.id) return
  inst.safe = { id: platform.id, x: Math.round(char.pos.x) }
  set(KEY_SAFE_SPOT, inst.safe)
}
//
// Fell out of the world: the hero shatters into fireflies and comes back
// on the last safe platform.
//
function killHero(inst) {
  const k = inst.k
  const hero = inst.heroInst
  const char = hero.character
  inst.dead = true
  inst.deathX = char.pos.x
  inst.deathY = char.pos.y
  inst.respawnAt = k.time() + RESPAWN_DELAY
  hero.controllable = false
  hero.isDying = true
  char.exists() && k.destroy(char)
  hero.character = null
  releaseGamePhysicalKeys()
  k.shake(DEATH_SHAKE)
  CaveSound.playSparkBurst(inst.caveSound)
  Fireflies.burst(inst.fireflies, inst.deathX, inst.deathY, DEATH_BURST_COUNT)
}
//
// Falling into the lake: controls off, no gravity, a splash; the hero then
// sinks at a slow steady speed (drawn under the water fill, so it clouds him).
//
function startDrown(inst, char) {
  const hero = inst.heroInst
  hero.controllable = false
  hero.isDying = true
  char.gravityScale = 0
  char.vel.x = 0
  char.vel.y = 0
  char.z = Z_DROWN_HERO
  inst.drown = { t: 0, x: Math.round(char.pos.x), y: char.pos.y }
  releaseGamePhysicalKeys()
  Sound.playSplashSound(inst.sfx, SPLASH_VOLUME)
}
function updateDrown(inst, char) {
  const d = inst.drown
  d.t += inst.k.dt()
  if (char?.exists?.()) {
    char.vel.x = 0
    char.vel.y = 0
    char.moveTo(d.x, d.y + DROWN_SINK_SPEED * d.t)
  }
  if (d.t < DROWN_TIME) return
  inst.deathX = d.x
  inst.deathY = d.y
  char?.exists?.() && inst.k.destroy(char)
  inst.heroInst.character = null
  inst.drown = null
  inst.dead = true
  inst.respawnAt = inst.k.time() + DROWN_RESPAWN_DELAY
}
function updateRespawn(inst) {
  if (inst.k.time() < inst.respawnAt) return
  const pose = startPose(inst)
  spawnHero(inst, pose)
  Fireflies.burst(inst.fireflies, pose.x, pose.y, RESPAWN_BURST_COUNT)
  inst.dead = false
}
//
// Saved safe platform if any, else the ledge under the roots' hole (where
// the forest's glimpse of the cave showed him land).
//
function startPose(inst) {
  const saved = inst.safe && Layout.PLATFORMS.find(p => p.id === inst.safe.id)
  return saved ? Ground.standPoseOn(saved, inst.safe.x) : Ground.standPoseOn(Layout.PLATFORMS.find(p => p.id === START_PLATFORM), Layout.ENTRY_X)
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
    idleVocalization: null,
    dozes: true
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
    const gap = step.pos.y - bottom
    gap > 0 && gap <= RIDE_SLACK && (char.pos.y += gap)
    lineY === null || (step.pos = inst.k.vec2(step.pos.x, lineY))
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
  const hud = getRGB(k, CFG.visual.colors.palette.hudScore)
  const shadow = getRGB(k, CAVE_CFG.colors.contour)
  inst.fps = FpsCounter.create({ k, topY: FPS_TOP_Y, textColor: hud, outlineColor: shadow, postBakeCanvas: applyForestHudSharpBake, fontScale: FPS_FONT_SCALE, fpsOnly: true })
  FpsCounter.pinScreenFixed(inst.fps)
  FpsCounter.layoutAtScreenLeftX(inst.fps, isTouchDevice() ? hudLeftWorldX(k) : FPS_LEFT_X)
}
//
// Draw passes: the back world (parallax), the terrain (the lake's bowl in
// it) with the lake's algae and the lantern, the see-through water (a
// drowning hero sinks under it), the additive lights, the stones in front
// of the hero and the screen frame.
//
function addDrawLayers(inst) {
  const k = inst.k
  k.add([k.z(Z_WORLD), { draw: () => drawWorld(inst) }])
  k.add([k.z(Z_TERRAIN), { draw: () => drawTerrain(inst) }])
  k.add([k.z(Z_WATER), { draw: () => CaveLake.onDraw(inst.lake, View.worldRect(inst.view)) }])
  k.add([k.z(Z_LIGHTS), { draw: () => drawLights(inst) }])
  k.add([k.z(Z_FRONT), { draw: () => Front.onDraw(inst.front, View.worldRect(inst.view)) }])
  k.add([k.z(Z_FRAME), { draw: () => View.onDrawFrame(inst.view) }])
}
function drawWorld(inst) {
  const view = View.worldRect(inst.view)
  Backdrop.onDraw(inst.backdrop, view)
}
function drawTerrain(inst) {
  const view = View.worldRect(inst.view)
  Terrain.onDraw(inst.terrain, view)
  CaveLake.onDrawAlgae(inst.lake, view)
  Lantern.onDraw(inst.lantern)
}
//
// Every additive glow together: the roots' hole, the lantern's halo, the
// exit, the fireflies.
//
function drawLights(inst) {
  const view = View.worldRect(inst.view)
  const t = inst.k.time()
  inst.glows.forEach((g, i) => drawSteadyGlow(inst.k, g, i, t))
  Lantern.onDrawHalo(inst.lantern)
  Exit.onDraw(inst.exit, view)
  Fireflies.onDraw(inst.fireflies, view.top, view.bottom)
}
function drawSteadyGlow(k, g, i, t) {
  Glow.drawGlow(k, g.x, g.y, g.r, g.rgb, g.opacity * (1 + Math.sin(t * GLOW_FLICKER_SPEED + i) * GLOW_FLICKER))
}
//
// Esc → menu; ambience stops on scene leave or native engine teardown.
//
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
