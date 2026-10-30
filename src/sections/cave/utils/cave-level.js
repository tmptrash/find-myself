import { CFG } from '../../../cfg.js'
import * as Hero from '../../../components/hero.js'
import * as Sound from '../../../utils/sound.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as CanvasBackdrop from '../../../utils/canvas-backdrop.js'
import * as TouchControls from '../../../utils/touch-controls.js'
import { set, get } from '../../../utils/progress.js'
import { initTouchInput } from '../../../utils/touch-input.js'
import { goToMenuAfterAssets } from '../../../utils/lesson-assets.js'
import { registerNativeTeardown } from '../../../utils/engine-switch.js'
import { bindBackToMenuKeys, releaseGamePhysicalKeys, getRGB } from '../../../utils/helper.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { applyForestGameplaySharpBake, applyForestHudSharpBake } from '../../forest/utils/forest-focus-depth.js'
import * as Mushroom from '../components/glow-mushroom.js'
import * as Fireflies from '../components/cave-fireflies.js'
import * as HangingPlant from '../components/hanging-plant.js'
import * as Water from '../components/cave-water.js'
import * as WallEye from '../components/wall-eye.js'
import * as Drips from '../components/cave-drips.js'
import * as GiantPlant from '../components/giant-plant.js'
import * as PlantStrands from '../components/plant-strands.js'
import * as SporeMushroom from '../components/spore-mushroom.js'
import * as BubbleLift from '../components/bubble-lift.js'
import * as AirPlant from '../components/air-plant.js'
import * as Layout from './cave-layout.js'
import * as Terrain from './cave-terrain.js'
import * as Parallax from './cave-parallax.js'
import * as Darkness from './cave-darkness.js'
import * as CaveSound from './cave-sound.js'
import * as View from './cave-view.js'
import * as Shaft from './cave-shaft.js'
import { ropeStrandAnchors } from './cave-plant-art.js'
import { CAVE_PAL, caveShadeColor } from './cave-paint.js'
//
// Cave lesson 0 — the hero drops in from the forest above into a dim shaft.
// A dormant mushroom near the entry lights the shaft for a few seconds when
// bounced on; the hero must remember the small platforms (some with deadly
// stalactites below) and reach the gap in the stalagmite floor. Below, a
// mushroom-lit cave ends in an underground lake crossed by stepping stones.
//
export const SCENE_NAME = 'lesson-cave.0'
const KEY_LAST_LESSON = 'lastLesson'
const KEY_SAFE_SPOT = 'cave.safeSpot'
//
// Draw order: world art, darkness, glows/fireflies, then the hero (player z).
//
const Z_WORLD = 0
const Z_DARKNESS = 8
const Z_LIGHTS = 9
const Z_FRAME = CFG.visual.zIndex.ui - 1
//
// Static bodies: wall/ceiling extend above the world so the entry fall is
// framed; platform bodies are this thick (top flush with the art).
//
const BODY_ABOVE_WORLD = 400
const PLATFORM_BODY_H = 16
//
// Death and respawn.
//
const SPIKE_BURST_COUNT = 48
const RESPAWN_BURST_COUNT = 14
const RESPAWN_DELAY = 2.3
const DEATH_SHAKE = 5
const FALL_OUT_Y = Layout.WORLD_H + 120
const SPLASH_VOLUME = 0.3
//
// Drowning (like the forest lake): the hero sinks slowly into the water,
// then a short silent pause.
//
const DROWN_SINK_SPEED = 48
const DROWN_TIME = 1.5
const DROWN_RESPAWN_DELAY = 0.8
//
// World is drawn in two passes: back (parallax, lake bed and algae) and
// front (lake water, terrain). A drowning hero is drawn between them, so the
// water clouds him and the basin rock hides him below the bed.
//
const Z_WORLD_FRONT = Z_WORLD + 0.6
//
// Bubbles draw over the hero (he rides inside them).
//
const Z_FRONT_FX = CFG.visual.zIndex.player + 1
//
// The near half of the plant's leaves is drawn in front of the hero (he
// stands inside the pad's raised lip).
//
const Z_LEAF_FRONT = CFG.visual.zIndex.player + 0.5
//
// Long moss strands swaying in the draught: how many hang off the vines
// (more hang from the leaves' edges, drawn with the leaves' near half),
// their seeds.
//
const ROPE_SWAY_STRANDS = 9
const STRAND_SEED = 4411
const LEAF_STRAND_SEED = 4412
const LEDGE_STRAND_SEED = 4413
//
// Contraptions: keys that jump out of a bubble, air aim above the cup,
// spores held a little above a closed trap's lip, sparks of a popped bubble.
//
const BUBBLE_EXIT_KEYS = ['up', 'w', 'space']
const AIR_TARGET_LIFT = 30
const TRAPPED_SPORES_LIFT = 14
const BUBBLE_POP_SPARKS = 10
const Z_DROWN_HERO = Z_WORLD + 0.5
//
// Ambient fireflies and hanging plants.
//
const FIREFLY_COUNT = 36
const PLANT_SEED = 3301
const CEILING_PLANT_X1 = 330
const CEILING_PLANT_STEP = 52
const CEILING_PLANT_SINK = 6
const CEILING_PLANT_JITTER = 0.5
const UNDER_PLANT_STEP = 46
const UNDER_PLANT_LIFT = 8
//
// Visible drips: which harmless stalactites drip, pan and hearing ranges.
//
const DECOR_DRIP_EVERY = 3
const LEAF_DRIP_EVERY = 5
const DROP_PAN_RANGE = 600
const DROP_HEAR_RANGE = 700
//
// Background mushrooms: size, shade, glow strength, seeds, row, cull pad,
// blur (soft like their row).
//
const BACK_MUSHROOM_SCALE = 0.5
const BACK_MUSHROOM_SHADE = 0.78
const BACK_MUSHROOM_HALO = 0.05
const BACK_MUSHROOM_SEED = 70
const BACK_MUSHROOM_ROW = 'mid'
const BACK_MUSHROOM_CULL = 80
const BACK_MUSHROOM_BLUR = 1.5
//
// Glowing mushrooms on the ledges: each one, at random (seeded), stands
// behind the ledge's grass and plants (drawn before the terrain) or in
// front of them.
//
const LIT_MUSHROOM_SEED = 4520
const BEHIND_GRASS_CHANCE = 0.5
//
// Parallax rows behind and in front of the back-wall eyes.
//
const BACK_ROWS = ['far', 'mid']
const NEAR_ROWS = ['near']
//
// String hash for per-platform stalactite seeds.
//
const HASH_MULT = 31
const HASH_SEED = 7
const HERO_BODY_COLOR = String(CFG.visual.colors.hero.eyeWhite).replace('#', '')
const HERO_OUTLINE_COLOR = CFG.visual.colors.outline

/**
 * Builds the whole cave level inside the active scene.
 * @param {Object} k - Kaplay instance
 * @returns {Object} Level instance
 */
export function create(k) {
  set(KEY_LAST_LESSON, SCENE_NAME)
  CanvasBackdrop.applyCanvasBackdrop(k, CAVE_PAL.frame)
  k.setGravity(CFG.game.gravity)
  const view = View.create(k)
  const sfx = Sound.create()
  Sound.startAudioContext(sfx)
  const caveSound = CaveSound.create(sfx)
  CaveSound.startAmbience(caveSound)
  const stalactites = Layout.buildStalactites(id => createSeededRandom(hashId(id)))
  const water = Water.create({ k, reflected: Layout.LIT_MUSHROOMS })
  const bubble = BubbleLift.create({ k, ...Layout.BUBBLE_MUSHROOM })
  const inst = {
    k,
    view,
    sfx,
    caveSound,
    stalactites,
    parallax: Parallax.create({ k }),
    water,
    terrain: Terrain.create({ k, stalactites, lake: water.lake }),
    darkness: Darkness.create({ k, lights: Layout.LIT_MUSHROOMS }),
    shaft: Shaft.create(k),
    plants: HangingPlant.create({ k, spots: buildPlantSpots(), seed: PLANT_SEED }),
    fireflies: Fireflies.create({ k, bounds: Layout.FIREFLY_BOUNDS, count: FIREFLY_COUNT }),
    lantern: Mushroom.create({ k, ...Layout.DORMANT_MUSHROOM, kind: Mushroom.MUSHROOM_KIND.DORMANT }),
    litMushrooms: createLitMushrooms(k),
    plant: GiantPlant.create(k),
    spores: SporeMushroom.create({ k, ...Layout.SPORE_MUSHROOM, stations: Layout.SPORE_STATIONS }),
    bubble,
    airPlant: AirPlant.create({ k, ...Layout.AIR_PLANT, target: { x: bubble.cup.x, y: bubble.cup.y - AIR_TARGET_LIFT } }),
    platformByBody: new Map(),
    heroInst: null,
    safe: get(KEY_SAFE_SPOT, null),
    dead: false,
    drown: null,
    grabbed: false,
    respawnAt: 0,
    deathX: 0,
    deathY: 0,
    lanternStep: -1,
    fps: null
  }
  inst.wallEyes = WallEye.create({ k, parallax: inst.parallax })
  inst.ropeStrands = PlantStrands.create({ k, anchors: ropeStrandAnchors(ROPE_SWAY_STRANDS, createSeededRandom(STRAND_SEED)), seed: STRAND_SEED })
  inst.leafStrands = PlantStrands.create({ k, anchors: GiantPlant.strandAnchors(inst.plant), seed: LEAF_STRAND_SEED })
  inst.ledgeStrands = PlantStrands.create({ k, anchors: inst.terrain.swayAnchors, seed: LEDGE_STRAND_SEED })
  inst.backMushrooms = createBackMushrooms(inst)
  inst.drips = Drips.create({ k, tips: dripTips(inst), onLand: (x, y, water) => onDropLand(inst, x, y, water) })
  createBodies(inst)
  spawnHero(inst, startPose(inst))
  createHud(inst)
  initTouchInput(k)
  TouchControls.create(k)
  addDrawLayers(inst)
  BUBBLE_EXIT_KEYS.forEach(key => k.onKeyPress(key, () => BubbleLift.jumpOut(inst.bubble)))
  k.onUpdate(() => onUpdate(inst))
  bindLeave(inst)
  return inst
}
//
// Per-frame gameplay: hazards, lantern, ambience and camera.
//
function onUpdate(inst) {
  const k = inst.k
  const dt = k.dt()
  const char = inst.heroInst?.character
  if (inst.drown) updateDrown(inst, char)
  else if (inst.dead) updateRespawn(inst)
  else !inst.grabbed && char?.exists?.() && updateHero(inst, char)
  updateLantern(inst)
  inst.litMushrooms.forEach(m => Mushroom.onUpdate(m, null))
  inst.backMushrooms.forEach(item => Mushroom.onUpdate(item.mushroom, null))
  Fireflies.onUpdate(inst.fireflies)
  updateContraptions(inst)
  const focus = inst.dead ? { x: inst.deathX, y: inst.deathY, vy: 0 } : heroFocus(inst)
  WallEye.onUpdate(inst.wallEyes, focus, View.worldRect(inst.view))
  Drips.onUpdate(inst.drips)
  CaveSound.onUpdate(inst.caveSound, dt, focus.y)
  const gust = CaveSound.gust(inst.caveSound)
  PlantStrands.onUpdate(inst.ropeStrands, gust)
  PlantStrands.onUpdate(inst.leafStrands, gust)
  PlantStrands.onUpdate(inst.ledgeStrands, gust)
  View.follow(inst.view, focus.x, focus.y, focus.vy)
  inst.fps && FpsCounter.onUpdate(inst.fps)
}
//
// Plant traps, spore swarm, air plant and bubble — and how they talk:
// a trap eats the hero, the swarm reaching its last station is caught by
// the spore trap, a trap letting spores go sends them home, the air plant
// swells the bubble.
//
function updateContraptions(inst) {
  const hero = inst.dead || inst.drown ? null : inst.heroInst
  const plant = GiantPlant.onUpdate(inst.plant, hero)
  plant.grabbedBy && seizeHero(inst)
  plant.hold && holdHero(inst, plant.hold)
  plant.eatenBy && eatHero(inst, plant.eatenBy)
  plant.released.forEach(() => SporeMushroom.release(inst.spores))
  const sporeEvent = SporeMushroom.onUpdate(inst.spores, hero)
  sporeEvent === 'released' && CaveSound.playSporeRelease(inst.caveSound)
  sporeEvent === 'trap' && catchSpores(inst)
  AirPlant.onUpdate(inst.airPlant, hero) && CaveSound.playAirBlow(inst.caveSound)
  BubbleLift.setBlowing(inst.bubble, AirPlant.isBlowing(inst.airPlant))
  const bubbleEvent = BubbleLift.onUpdate(inst.bubble, hero)
  bubbleEvent === 'pop' && popBubble(inst)
}
//
// The spore trap leaf snaps on the arriving swarm (if it is open).
//
function catchSpores(inst) {
  const leaf = Layout.PLANT_LEAVES.find(l => l.spores)
  if (!GiantPlant.snap(inst.plant, leaf.id, 'spores')) return
  CaveSound.playLeafSnap(inst.caveSound)
  SporeMushroom.trap(inst.spores, { x: (leaf.x1 + leaf.x2) / 2, y: leaf.y - TRAPPED_SPORES_LIFT })
}
function popBubble(inst) {
  const b = inst.bubble
  CaveSound.playBubblePop(inst.caveSound)
  Fireflies.burst(inst.fireflies, b.cx, b.cy, BUBBLE_POP_SPARKS)
}
//
// A trap's tendrils seize the hero: no control, no physics, he only moves
// where the tendrils drag him.
//
function seizeHero(inst) {
  const hero = inst.heroInst
  const char = hero.character
  hero.controllable = false
  char.isStatic = true
  char.vel = inst.k.vec2(0, 0)
  inst.grabbed = true
  releaseGamePhysicalKeys()
  CaveSound.playTendrilGrab(inst.caveSound)
}
//
// Puts the seized hero where the tendrils hold him, squeezed as they crush.
//
function holdHero(inst, hold) {
  const char = inst.heroInst?.character
  if (!char?.exists?.()) return
  char.pos = inst.k.vec2(hold.x, hold.y)
  char.scale = inst.k.vec2(hold.sx, hold.sy)
}
//
// A trap leaf closes over the hero: he is gone inside it (no burst), and
// comes back on the last safe platform.
//
function eatHero(inst, leaf) {
  const char = inst.heroInst?.character
  if (!char?.exists?.()) return
  inst.grabbed = false
  CaveSound.playLeafSnap(inst.caveSound)
  Sound.playCrunchSound(inst.sfx)
  killHero(inst, true)
  inst.deathX = (leaf.x1 + leaf.x2) / 2
  inst.deathY = leaf.y
}
function updateHero(inst, char) {
  //
  // Pixel snap only on the ground: Kaplay steps physics at a fixed rate and
  // smooths the body between steps only while nothing else moves it, so
  // snapping in the air made jumps and falls stutter.
  //
  char.isGrounded() && Hero.snapPosToPixels(inst.heroInst)
  Mushroom.onUpdate(inst.lantern, inst.heroInst) && CaveSound.playLanternBounce(inst.caveSound)
  trackSafeSpot(inst, char)
  const { x, y } = char.pos
  if (Layout.hitsSpikes(inst.stalactites, x, y)) return killHero(inst)
  if (Layout.isInLake(x, y)) return startDrown(inst, char)
  y > FALL_OUT_Y && killHero(inst)
}
//
// Lantern light drives the upper darkness; each dimming step ticks.
//
function updateLantern(inst) {
  const step = Mushroom.lightStep(inst.lantern)
  step > 0 && step !== inst.lanternStep && CaveSound.playLanternDim(inst.caveSound)
  inst.lanternStep = step
  Darkness.setLantern(inst.darkness, Mushroom.lightLevel(inst.lantern))
}
function heroFocus(inst) {
  const char = inst.heroInst?.character
  if (!char?.exists?.()) return { x: inst.deathX, y: inst.deathY, vy: 0 }
  return { x: char.pos.x, y: char.pos.y, vy: char.vel?.y ?? 0 }
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
// Spike hit: the hero shatters into fireflies (or, eaten, just vanishes)
// and comes back on the last safe platform.
//
function killHero(inst, eaten = false) {
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
  BubbleLift.drop(inst.bubble)
  k.shake(DEATH_SHAKE)
  if (eaten) return
  CaveSound.playSparkBurst(inst.caveSound)
  Fireflies.burst(inst.fireflies, inst.deathX, inst.deathY, SPIKE_BURST_COUNT)
}
//
// Falling into the lake: controls off, no gravity, a splash; the hero then
// sinks at a slow steady speed (he draws under the darkness now, so he dims
// with the water around him).
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
// Saved safe platform if any, else the drop from the forest shaft.
//
function startPose(inst) {
  const platform = inst.safe && [...Layout.PLATFORMS, ...Layout.PLANT_LEAVES].find(p => p.id === inst.safe.id)
  return platform ? Layout.standPoseOn(platform, inst.safe.x) : { x: Layout.HERO_ENTRY_X, y: Layout.HERO_ENTRY_Y }
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
    bodyColor: HERO_BODY_COLOR,
    outlineColor: HERO_OUTLINE_COLOR,
    eyeWhiteColor: CFG.visual.colors.hero.eyeWhite,
    pupilColor: CFG.visual.colors.hero.eyePupil,
    stepSoundScene: SCENE_NAME,
    suppressDust: true,
    suppressFootprints: true,
    airAnimDuringFlicker: true,
    runDuringFlicker: true,
    postBakeCanvas: applyForestGameplaySharpBake,
    idleVocalization: null
  })
  hero.onPlayStepSound = h => playHeroStep(inst, h, false)
  hero.onPlayLandSound = h => playHeroStep(inst, h, true)
  Hero.spawn(hero, { instant: true })
  inst.heroInst = hero
  !prev && View.snapTo(inst.view, pose.x, pose.y)
}
//
// Footsteps: soft and quiet on the plant's leaves, a soft scuff on rock.
//
function playHeroStep(inst, hero, land) {
  if (!hero.sfx) return
  const on = hero.character?.curPlatform?.()
  if (inst.plant.leaves.some(l => l.body === on)) return CaveSound.playLeafStep(inst.caveSound, land)
  CaveSound.playStoneStep(inst.caveSound, land)
}
//
// Walls, ceiling around the shaft and every platform; plain plant leaves
// count as safe respawn platforms too (traps never do).
//
function createBodies(inst) {
  const k = inst.k
  const solid = (x, y, w, h) => k.add([
    k.rect(w, h),
    k.pos(x, y),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName
  ])
  const top = -BODY_ABOVE_WORLD
  const tall = Layout.WORLD_H + BODY_ABOVE_WORLD
  solid(0, top, Layout.WALL_COLLIDE_W, tall)
  solid(Layout.WORLD_W - Layout.WALL_COLLIDE_W, top, Layout.WALL_COLLIDE_W, tall)
  solid(0, top, Layout.ENTRY_X1, Layout.CEILING_Y - top)
  solid(Layout.ENTRY_X2, top, Layout.WORLD_W - Layout.ENTRY_X2, Layout.CEILING_Y - top)
  Layout.PLATFORMS.forEach(p => {
    const h = p.kind === Layout.PLATFORM_KIND.GROUND ? p.h : PLATFORM_BODY_H
    inst.platformByBody.set(solid(p.x1, p.y, p.x2 - p.x1, h), p)
  })
  inst.plant.leaves.filter(l => l.kind === Layout.LEAF_KIND.LEAF).forEach(l => inst.platformByBody.set(l.body, l))
}
function createHud(inst) {
  const k = inst.k
  const hud = getRGB(k, CFG.visual.colors.palette.hudScore)
  const shadow = getRGB(k, CAVE_PAL.contour)
  inst.fps = FpsCounter.create({ k, topY: View.hudTopY(inst.view), textColor: hud, outlineColor: shadow, postBakeCanvas: applyForestHudSharpBake })
  FpsCounter.pinScreenFixed(inst.fps)
  FpsCounter.layoutAtScreenCenterX(inst.fps, k.width() / 2)
}
//
// Draw passes: one world pass (parallax, water, terrain, plants, mushroom
// bodies), the darkness, the additive lights, and the screen frame.
//
function addDrawLayers(inst) {
  const k = inst.k
  k.add([k.z(Z_WORLD), { draw: () => drawWorld(inst) }])
  k.add([k.z(Z_WORLD_FRONT), { draw: () => drawWorldFront(inst) }])
  k.add([k.z(Z_DARKNESS), { draw: () => drawDarkness(inst) }])
  k.add([k.z(Z_LIGHTS), { draw: () => drawLights(inst) }])
  k.add([k.z(Z_LEAF_FRONT), { draw: () => drawPlantFront(inst) }])
  k.add([k.z(Z_FRONT_FX), { draw: () => BubbleLift.onDrawBubble(inst.bubble) }])
  k.add([k.z(Z_FRAME), { draw: () => View.onDrawFrame(inst.view) }])
}
function drawWorld(inst) {
  const r = View.worldRect(inst.view)
  Parallax.onDraw(inst.parallax, r.left, r.top, BACK_ROWS)
  WallEye.onDrawBack(inst.wallEyes, r)
  drawBackMushrooms(inst, r)
  Parallax.onDraw(inst.parallax, r.left, r.top, NEAR_ROWS)
  Water.onDrawBed(inst.water)
}
function drawWorldFront(inst) {
  const r = View.worldRect(inst.view)
  Water.onDrawFill(inst.water)
  inst.litMushrooms.filter(m => m.behindGrass).forEach(m => Mushroom.onDraw(m))
  Terrain.onDraw(inst.terrain, r.top, r.bottom)
  GiantPlant.onDrawBack(inst.plant)
  PlantStrands.onDraw(inst.ropeStrands, r.top, r.bottom)
  PlantStrands.onDraw(inst.ledgeStrands, r.top, r.bottom)
  SporeMushroom.onDraw(inst.spores)
  BubbleLift.onDraw(inst.bubble)
  AirPlant.onDraw(inst.airPlant)
  WallEye.onDrawWall(inst.wallEyes, r)
  HangingPlant.onDraw(inst.plants, r.top, r.bottom)
}
function drawDarkness(inst) {
  CFG.game.caveDarkness && Darkness.onDraw(inst.darkness, View.worldRect(inst.view))
}
//
// The entry light shaft, normal-blend glowing bodies, then every additive
// glow together.
//
function drawLights(inst) {
  const r = View.worldRect(inst.view)
  Shaft.onDraw(inst.shaft, r.top)
  inst.litMushrooms.filter(m => !m.behindGrass).forEach(m => Mushroom.onDraw(m))
  Mushroom.onDraw(inst.lantern)
  inst.litMushrooms.forEach(m => Mushroom.onDrawHalo(m))
  Mushroom.onDrawHalo(inst.lantern)
  Water.onDrawGlints(inst.water)
  SporeMushroom.onDrawGlow(inst.spores)
  Fireflies.onDraw(inst.fireflies, r.top, r.bottom)
  Drips.onDraw(inst.drips, r.top, r.bottom)
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
    Mushroom.destroy(inst.lantern)
    CanvasBackdrop.clearCanvasBackdrop(k)
  })
}
//
// Plants hang from the ceiling and under the solid ledges / small platforms
// that have no stalactites (styled rock ledges grow their own roots).
//
function buildPlantSpots() {
  const rng = createSeededRandom(PLANT_SEED)
  const spots = []
  for (let x = CEILING_PLANT_X1; x < Layout.WORLD_W - Layout.WALL_COLLIDE_W; x += CEILING_PLANT_STEP) {
    const px = Math.round(x + rng() * CEILING_PLANT_STEP * CEILING_PLANT_JITTER)
    spots.push({ x: px, y: Math.round(Layout.ceilingBottomAt(px)) - CEILING_PLANT_SINK })
  }
  Layout.PLATFORMS.filter(p => p.kind !== Layout.PLATFORM_KIND.GROUND && !p.stalactites && !p.style).forEach(p => {
    const x1 = Math.max(p.x1, Layout.WALL_COLLIDE_W * 2)
    const x2 = Math.min(p.x2, Layout.WORLD_W - Layout.WALL_COLLIDE_W * 2)
    for (let x = x1 + UNDER_PLANT_STEP / 2; x < x2; x += UNDER_PLANT_STEP) {
      spots.push({ x, y: Math.round(Layout.platformBottomAt(p, x)) - UNDER_PLANT_LIFT })
    }
  })
  return spots
}
//
// Glowing mushrooms on the ledges, each behind or in front of the grass.
//
function createLitMushrooms(k) {
  const rng = createSeededRandom(LIT_MUSHROOM_SEED)
  return Layout.LIT_MUSHROOMS.map(m => {
    const mushroom = Mushroom.create({ k, ...m, x: Layout.fitOnPlatform(m.x, m.y, Mushroom.clusterHalfWidth(m.scale)), kind: Mushroom.MUSHROOM_KIND.LIT })
    mushroom.behindGrass = rng() < BEHIND_GRASS_CHANCE
    return mushroom
  })
}
//
// Small glowing mushrooms on the mid parallax row's ledges and platforms,
// darkened with the row and with only a faint glow.
//
function createBackMushrooms(inst) {
  const tint = caveShadeColor(inst.k, BACK_MUSHROOM_SHADE)
  return Parallax.mushroomAnchors(inst.parallax).map((a, i) => ({
    anchor: a,
    mushroom: Mushroom.create({
      k: inst.k,
      x: a.x,
      y: a.y,
      scale: BACK_MUSHROOM_SCALE,
      seed: BACK_MUSHROOM_SEED + i,
      tint,
      haloOpacity: BACK_MUSHROOM_HALO,
      blur: BACK_MUSHROOM_BLUR
    })
  }))
}
function drawBackMushrooms(inst, r) {
  inst.backMushrooms.forEach(item => {
    const p = Parallax.toWorld(inst.parallax, BACK_MUSHROOM_ROW, item.anchor.x, item.anchor.y, r.left, r.top)
    Mushroom.setPose(item.mushroom, p.x, p.y, BACK_MUSHROOM_SCALE)
    p.y > r.top - BACK_MUSHROOM_CULL && p.y < r.bottom + BACK_MUSHROOM_CULL && (Mushroom.onDraw(item.mushroom), Mushroom.onDrawHalo(item.mushroom))
  })
}
//
// In front of the hero: the leaves' near half, the long strands swaying
// from their edges, the rock ledges' front greens.
//
function drawPlantFront(inst) {
  const r = View.worldRect(inst.view)
  GiantPlant.onDrawFront(inst.plant)
  PlantStrands.onDraw(inst.leafStrands, r.top, r.bottom)
  Terrain.onDrawFront(inst.terrain, r.top, r.bottom)
}
//
// Drops fall from every deadly stalactite, every few harmless ones, and
// every few strands and slime lobes hanging under the plant's leaves.
//
function dripTips(inst) {
  const deadly = inst.stalactites.map(s => ({ x: s.x, y: s.y + s.len }))
  const leaves = GiantPlant.dripTips(inst.plant).filter((tip, i) => i % LEAF_DRIP_EVERY === 0)
  const decor = inst.terrain.decorTips.filter((tip, i) => i % DECOR_DRIP_EVERY === 0)
  return [...deadly, ...decor, ...leaves]
}
//
// Landing drop sound: panned toward its side of the hero, quieter with
// distance, silent past the hearing range.
//
function onDropLand(inst, x, y, water) {
  const focus = heroFocus(inst)
  const pan = Math.max(-1, Math.min(1, (x - focus.x) / DROP_PAN_RANGE))
  const near = 1 - Math.hypot(x - focus.x, y - focus.y) / DROP_HEAR_RANGE
  CaveSound.playDropLand(inst.caveSound, pan, near, water)
}
function hashId(id) {
  return [...id].reduce((h, c) => (h * HASH_MULT + c.charCodeAt(0)) >>> 0, HASH_SEED)
}
