import { CFG } from '../../../cfg.js'
import * as Hero from '../../../components/hero.js'
import * as Lake from '../../../components/lake.js'
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
import * as Scene from './cave-scene.js'
import * as Glow from './cave-glow.js'
import * as CaveSound from './cave-sound.js'
import * as View from './cave-view.js'
//
// Cave lesson 0 — the hero drops in from the forest through the hole the
// eye-flower's roots tore in the ceiling, onto a long earth ledge, a
// dormant lantern mushroom left of him (bounced on, it lights up). Along
// the ledge the hostile eye-flower watches him; past it the crevice of the
// exit glows between the ledge and the stalk-eye's ledge. Below lies the
// lower cave: an earth floor, an underground lake with pillars standing in
// it, and the ground under the exit.
//
export const SCENE_NAME = 'lesson-cave.0'
const KEY_LAST_LESSON = 'lastLesson'
const KEY_SAFE_SPOT = 'cave.safeSpot'
const KEY_REACHED = 'cave.reached'           // Menu shows the cave's icon once the hero got here
const START_PLATFORM = 'upper'
//
// Draw order: back (parallax), terrain (with the lake's depths), the
// drowning hero, the lake water, the lights, the hero and creatures
// (player z), the frame.
//
const Z_WORLD = 0
const Z_TERRAIN = Z_WORLD + 0.4
const Z_DROWN_HERO = Z_WORLD + 0.5
const Z_WATER = Z_WORLD + 0.6
const Z_LIGHTS = 9
const Z_FRAME = CFG.visual.zIndex.ui - 1
//
// Static bodies: walls reach above the world so the entry fall is framed;
// ledge and pillar bodies are this thick (top flush with the art).
//
const BODY_ABOVE_WORLD = 400
const PLATFORM_BODY_H = 16
//
// Slopes: under a rise or a fall a solid body sits at its lower end's
// height, and a narrow step rides under the hero's feet along the slope
// line (passable from below) whenever his feet are within SLOPE_CATCH px
// of it; standing on it he is held on the line (downhill too, no hopping).
//
const SLOPE_STEP_W = 30
const SLOPE_STEP_H = 12
const SLOPE_CATCH = 24
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
// The lake's sprites; the water line sits this far over its ground line.
//
const LAKE_SPRITE_KEY = 'cave0-v3'
const LAKE_FLOOR_BELOW_SURFACE = 8
//
// The water starts where the floor's bank slope meets its surface.
//
const LAKE_SHORE_INSET = 26
//
// Ambient fireflies.
//
const FIREFLY_COUNT = 44
//
// Steady glows: round every glowing prop (cave-scene.js) and the daylight
// falling in through the roots' hole: radius, opacity.
//
const PROP_GLOW_R = 60
const PROP_GLOW_OPACITY = 0.35
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
  const lake = Lake.create({
    k,
    x1: Layout.LAKE_X1,
    x2Core: Layout.LAKE_X2,
    surfaceY: Layout.LAKE_SURFACE_Y,
    floorY: Layout.LAKE_SURFACE_Y + LAKE_FLOOR_BELOW_SURFACE,
    spriteKey: LAKE_SPRITE_KEY,
    waterStartX: Layout.LAKE_X1 + LAKE_SHORE_INSET,
    palette: CAVE_CFG.water
  })
  Glow.create(k)
  const inst = {
    k,
    view,
    sfx,
    caveSound,
    lake,
    backdrop: Backdrop.create(k, View.windowSize(view)),
    terrain: Terrain.create({ k }),
    fireflies: Fireflies.create({ k, bounds: Layout.FIREFLY_BOUNDS, count: FIREFLY_COUNT }),
    lantern: Lantern.create({ k, ...Layout.LANTERN }),
    exit: Exit.create({ k }),
    glows: [...Scene.propGlows().map(g => ({ ...g, r: PROP_GLOW_R, opacity: PROP_GLOW_OPACITY })), HOLE_GLOW].map(g => ({ ...g, rgb: getRGB(k, CAVE_CFG.colors[g.color]) })),
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
  inst.eyeFlower = EyeFlower.create({ k, ...Layout.EYE_FLOWER, getHeroPos, getView })
  inst.stalkEye = StalkEye.create({ k, ...Layout.STALK_EYE, getHeroPos, getView })
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
  rideSlope(inst, char)
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
  return saved ? Layout.standPoseOn(saved, inst.safe.x) : Layout.standPoseOn(Layout.PLATFORMS.find(p => p.id === START_PLATFORM), Layout.ENTRY_X)
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
  Hero.spawn(hero, { instant: true })
  inst.heroInst = hero
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
// Both walls, every flat run and the body under every slope, and the step
// that rides the slopes.
//
function createBodies(inst) {
  const k = inst.k
  const top = -BODY_ABOVE_WORLD
  const tall = Layout.WORLD_H + BODY_ABOVE_WORLD
  addSolid(k, 0, top, Layout.WALL_COLLIDE_W, tall)
  addSolid(k, Layout.WORLD_W - Layout.WALL_COLLIDE_W, top, Layout.WALL_COLLIDE_W, tall)
  Layout.PLATFORMS.forEach(p => Layout.topSegments(p).forEach(seg => {
    const y = Math.max(seg.y1, seg.y2)
    const h = p.kind === Layout.PLATFORM_KIND.GROUND ? Layout.WORLD_H - y : PLATFORM_BODY_H
    inst.platformByBody.set(addSolid(k, seg.x1, y, seg.x2 - seg.x1, h), p)
  }))
  inst.slopeStep = k.add([
    k.rect(SLOPE_STEP_W, SLOPE_STEP_H),
    k.pos(0, PARK_Y),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName,
    CFG.game.noCeilingTag
  ])
}
//
// Keeps the slope step under the hero's feet on a slope right at his feet,
// else parks it — but never from under his feet (Kaplay
// carries a rider along with his platform): past a slope's end he just
// walks off its edge. Holds a hero standing on it on the line.
//
function rideSlope(inst, char) {
  const step = inst.slopeStep
  const feetY = char.pos.y + Layout.HERO_FEET_DY
  const slope = Layout.slopeUnder(char.pos.x, feetY - SLOPE_CATCH)
  const onStep = char.isGrounded() && char.curPlatform?.() === step
  if (!slope || slope.y > feetY + SLOPE_CATCH) {
    onStep || (step.pos = inst.k.vec2(0, PARK_Y))
    return
  }
  step.pos = inst.k.vec2(char.pos.x - SLOPE_STEP_W / 2, slope.y)
  inst.platformByBody.set(step, slope.platform)
  onStep && char.vel.y >= 0 && (char.pos.y = slope.y - Layout.HERO_FEET_DY)
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
// Draw passes: the back world (parallax), the terrain (the lake's bed in it) with the
// lantern, the see-through water over the pillars' feet (a drowning hero
// sinks between them), the additive lights and the screen frame.
//
function addDrawLayers(inst) {
  const k = inst.k
  k.add([k.z(Z_WORLD), { draw: () => drawWorld(inst) }])
  k.add([k.z(Z_TERRAIN), { draw: () => drawTerrain(inst) }])
  k.add([k.z(Z_WATER), { draw: () => Lake.drawFill(k, inst.lake) }])
  k.add([k.z(Z_LIGHTS), { draw: () => drawLights(inst) }])
  k.add([k.z(Z_FRAME), { draw: () => View.onDrawFrame(inst.view) }])
}
function drawWorld(inst) {
  const view = View.worldRect(inst.view)
  Backdrop.onDraw(inst.backdrop, view)
}
function drawTerrain(inst) {
  Terrain.onDraw(inst.terrain, View.worldRect(inst.view))
  Lantern.onDraw(inst.lantern)
}
//
// Every additive glow together: props, the lantern's halo, the exit, the
// fireflies.
//
function drawLights(inst) {
  const view = View.worldRect(inst.view)
  const t = inst.k.time()
  inst.glows.forEach((g, i) => drawPropGlow(inst.k, g, i, t))
  Lantern.onDrawHalo(inst.lantern)
  Exit.onDraw(inst.exit, view)
  Fireflies.onDraw(inst.fireflies, view.top, view.bottom)
}
function drawPropGlow(k, g, i, t) {
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
