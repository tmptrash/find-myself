import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { unloadSprite } from '../../../utils/sprite-unload.js'
import { CAVE_CFG } from '../cfg.js'
import * as Bubbles from '../components/cave-bubbles.js'
import * as Fireflies from '../components/cave-fireflies.js'
import * as Fish from '../components/cave-fish.js'
import * as Giant from '../components/cave-giant.js'
import * as Haggy from '../components/cave-haggy.js'
import * as Lantern from '../components/cave-lantern.js'
import * as Lurker from '../components/cave-lurker.js'
import * as Pads from '../components/cave-pads.js'
import * as Runner from '../components/cave-runner.js'
import * as Strider from '../components/cave-strider.js'
import * as StriderBridge from '../components/cave-strider-bridge.js'
import * as Trumpet from '../components/cave-trumpet.js'
import * as Front from './cave-front.js'
import * as Atlas from './cave-atlas.js'
import * as Backdrop from './cave-backdrop.js'
import * as CaveLake from './cave-lake.js'
import * as Ground from './cave-ground.js'
import * as HaggyPrey from './cave-haggy-prey.js'
import * as LakeBed from './cave-lake-bed.js'
import * as Layout from './cave-layout.js'
import * as Platform from './cave-platform.js'
import * as Scene from './cave-scene.js'
import * as Surface from './cave-surface.js'
//
// The cave level as the menu's backdrop: the room round the hero's landing
// spot (back layers, the earth ledge with its moss and props, the ceiling
// with the roots' hole), painted by the level's own painters at the
// level's own size (one world px to one screen unit, as in the level) and
// baked once per live k and screen size (the lake's bed tinted under its
// water as in the level), with the level's life as in the level, only no
// hero: the dry mushroom on the hall's floor; the lake's fish leaping for
// the yellow fireflies over the water, its giant coming in to hunt them,
// the trumpeter on the bed catching them as they leap, the lurker by the
// left bank pouncing on the runners sent out to its edge now and then, the
// pad plant's leaves and the striders on the water (lining up now and
// then), its algae and water; the level's runners scurrying over it, the
// blind climber roaming the rock on its long limbs, feeling for them
// (it starts in view, at HAGGY_AT of the screen, and hunts the runners as
// in the level: they flee it, the one it catches it eats),
// fireflies drifting in the open air between its platforms (never over
// the soil) and its big stones in front (all drawn live in its world).
// The bottom sinks into shade so the menu's key hints stay readable. The
// picture is baked in two layers — the back, then the soil over it — so
// the fish swim between them, behind the soil, as in the level.
//
const SPRITE_PREFIX = 'cave0-menu-v6-'
const BACK = '-back'
const SOIL = '-soil'
const GRAIN_SEED = 9400
const MIN_SCREEN_PX = 64
const TILE_MAX = 2048
//
// World rect shown, as big as the screen: the lake's left end (FOCUS_IN px
// in from it) sits at FOCUS_SHARE of the screen width (right of the level
// list), the hall FOCUS_UP px over the lake's surface at FOCUS_Y_SHARE of
// its height (kept in the world).
//
const FOCUS_IN = 40
const FOCUS_X = Layout.LAKE_X1 + FOCUS_IN
const FOCUS_SHARE = 0.68
const FOCUS_UP = 120
const FOCUS_Y = Layout.LAKE_SURFACE_Y - FOCUS_UP
const FOCUS_Y_SHARE = 0.5
//
// Shade over the bottom: from this share of the height down, reaching
// SHADE_ALPHA at the bottom edge.
//
const SHADE_FROM = 0.72
const SHADE_ALPHA = 0.85
//
// Fireflies: how many, kept WATER_CLEAR px over the lake's surface; one a
// fish ate lights up again over the lake (in view) from LAKE_SKY_TOP down
// to LAKE_SKY_LOW px over the surface (where the fish can reach it). They
// keep FIREFLY_PAD px clear of the soil and the water.
//
const FIREFLY_COUNT = 34
const FIREFLY_PAD = 10
const WATER_CLEAR = 20
const LAKE_SKY_TOP = 140
const LAKE_SKY_LOW = 30
//
// A fish's splash is heard full at the view's middle, gone SPLASH_HEAR px
// off it (as from the hero in the level).
//
const SPLASH_HEAR = 900
//
// Softer sounds off the same splash: a drop from the lurker's mouth
// (DRIP_SPLASH of a fish's), the trumpeter's gulp (GULP_SPLASH), the
// lurker's head breaking the surface (LURKER_SPLASH).
//
const DRIP_SPLASH = 0.3
const GULP_SPLASH = 0.6
const LURKER_SPLASH = 1
//
// A popping bubble breaks the lake's surface BUBBLE_WAVE per px of its
// radius (CaveLake.disturb, 1: a full fish splash).
//
const BUBBLE_WAVE = 0.04
//
// Every VISIT_EVERY..+RANGE s a runner is sent out onto the lake's left
// bank, VISIT_IN..+RANGE px short of its edge (one on the bank's run, else
// one out of sight, coming in by the way in: Runner.entrySpot) — for the
// lurker to pounce on.
//
const VISIT_EVERY = 10
const VISIT_EVERY_RANGE = 10
const VISIT_IN = 20
const VISIT_IN_RANGE = 70
const HAGGY_SEED = 4711
const HAGGY_AT = { x: 0.6, y: 0.3 }
const bakedFor = new WeakMap()

/**
 * Creates the backdrop for a screen size (baking it on first use).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.width - Screen width
 * @param {number} cfg.height - Screen height
 * @param {(strength: number, near: number) => void} [cfg.onSplash] - A fish broke the lake's surface (its strength, how near the view's middle: 0 … 1), to be heard as in the level
 * @param {(r: number, near: number) => void} [cfg.onBubble] - A bubble popped on the surface (its radius, how near the view's middle: 0 … 1), to be heard as in the level
 * @param {(near: number) => void} [cfg.onSnap] - The lurker's jaws snapped shut on a runner (how near the view's middle: 0 … 1), to be heard as in the level
 * @param {(near: number, strength: number, time: number) => void} [cfg.onCrunch] - The climber's jaws work on a runner (how near the view's middle, 1: a bite or less: a chew, how long they take), to be heard as in the level
 * @param {(near: number) => void} [cfg.onGrip] - A hand of the climber took a hold (how near the view's middle), to be heard as in the level
 * @returns {Object} Backdrop instance
 */
export function create(cfg) {
  const { k } = cfg
  const w = Math.max(MIN_SCREEN_PX, Math.round(cfg.width))
  const h = Math.max(MIN_SCREEN_PX, Math.round(cfg.height))
  const place = placement(w, h)
  const ready = Atlas.isLoaded()
  const lake = ready ? CaveLake.create(k) : null
  const pads = lake ? Pads.create({ k, lake }) : null
  const inst = {
    k,
    place,
    world: { left: place.x1, top: place.y1, right: place.x2, bottom: place.y2 },
    tiles: bake(k, w, h, place),
    front: ready ? Front.create(k) : null,
    lake,
    fish: lake ? Fish.createAll(k, lake) : [],
    striders: lake ? Strider.createAll(k, lake, [Pads.crownSpan(pads)]) : [],
    strideFears: [],
    pads,
    bubbles: lake ? Bubbles.create({ k, lake, onPop: (x, r) => bubblePop(lake, cfg.onBubble, place, x, r) }) : null,
    fishMouths: [],
    giant: lake ? Giant.create({ k, lake }) : null,
    lurker: lake ? Lurker.create({ k, lake }) : null,
    trumpet: lake ? Trumpet.create({ k, lake }) : null,
    lantern: ready ? createLantern(k) : null,
    bridge: null,
    visitIn: VISIT_EVERY,
    fishCtx: null,
    giantCtx: null,
    lurkerCtx: null,
    trumpetCtx: null,
    trumpetDraw: null,
    lakeSky: { x1: Math.max(Layout.LAKE_X1, place.x1), x2: Math.min(Layout.LAKE_X2, place.x2), y1: Layout.LAKE_SURFACE_Y - LAKE_SKY_TOP, y2: Layout.LAKE_SURFACE_Y - LAKE_SKY_LOW },
    runners: ready ? Runner.createAll(k) : [],
    haggy: ready ? Haggy.create({ k, seed: HAGGY_SEED, at: { x: place.x1 + (place.x2 - place.x1) * HAGGY_AT.x, y: place.y1 + (place.y2 - place.y1) * HAGGY_AT.y } }) : null,
    haggyCtx: null,
    runnerPrey: [],
    beastAt: { x: 0, y: 0 },
    ear: { x: (place.x1 + place.x2) / 2, y: (place.y1 + place.y2) / 2 },
    fireflies: Fireflies.create({
      k,
      bounds: { x1: place.x1, y1: place.y1, x2: place.x2, y2: Math.min(place.y1 + (place.y2 - place.y1) * SHADE_FROM, Layout.LAKE_SURFACE_Y - WATER_CLEAR) },
      count: FIREFLY_COUNT,
      isOpen: ready ? isOpenAir : undefined
    })
  }
  inst.fishCtx = { prey: [], swarmPrey: [], swarm: null, threats: [], giant: null, school: inst.fish, onCatch: prey => Fireflies.eat(inst.fireflies, prey, inst.lakeSky), onSplash: (x, strength) => splash(inst, cfg.onSplash, x, strength) }
  lake && createLakeLife(inst, cfg.onSplash, cfg.onSnap)
  inst.haggy && createHaggyLife(inst, cfg.onCrunch, cfg.onGrip)
  return inst
}

/**
 * Frees the backdrop's baked tiles on this engine (the menu is left for a
 * level: screen-sized textures the level never draws); the next create()
 * or prewarm() bakes them again.
 * @param {Object} k - Kaplay instance
 */
export function release(k) {
  bakedFor.get(k)?.forEach(names => names.forEach(name => unloadSprite(k, name)))
  bakedFor.delete(k)
}

/**
 * Bakes the backdrop ahead of time (under the boot loader) so the menu
 * only reuses loaded sprites.
 * @param {Object} k - Kaplay instance
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 */
export function prewarm(k, width, height) {
  create({ k, width, height })
}

/**
 * Moves the living parts: the runners scurry (one sent to the lake's edge
 * now and then; they flee the climber), the climber roams and hunts them,
 * fireflies wander, the dry mushroom settles, the lake's
 * life goes on (updateLakeLife).
 * @param {Object} inst - Backdrop instance
 */
export function onUpdate(inst) {
  inst.lake && sendVisitor(inst)
  inst.runners.forEach(runner => Runner.onUpdate(runner, null, null, inst.haggy && Haggy.nearestTo(inst.haggy, runner.pos, inst.beastAt)))
  inst.haggy && updateHaggy(inst)
  Fireflies.onUpdate(inst.fireflies)
  inst.lantern && Lantern.onUpdate(inst.lantern, null)
  inst.lake && updateLakeLife(inst)
}

/**
 * Draws the picture's back, what lives behind its soil (drawUnderSoil), its
 * soil, then what lives over it (drawWorldLife) — always all of it, opaque:
 * the menu fades it in and out whole under a veil.
 * @param {Object} inst - Backdrop instance
 */
export function onDraw(inst) {
  drawTiles(inst, BACK)
  inWorld(inst, drawUnderSoil)
  drawTiles(inst, SOIL)
  inWorld(inst, drawWorldLife)
}
function drawTiles(inst, layer) {
  inst.tiles.forEach(tile => inst.k.drawSprite({ sprite: tile.name + layer, pos: inst.k.vec2(tile.x, 0) }))
}
//
// Runs a draw pass in the level's world placed on the screen the way the
// picture is.
//
function inWorld(inst, draw) {
  const k = inst.k
  const { place } = inst
  k.pushTransform()
  k.pushScale(k.vec2(place.scale, place.scale))
  k.pushTranslate(k.vec2(-place.x1, -place.y1))
  draw(inst)
  k.popTransform()
}
//
// Behind the soil, as in the level: the far row of the left hollow's
// paving, the giant, the fish (far to near) and the sand they spill, the
// pad plant's stems, the trumpeter, the lurker (all of it while its head
// is under the water or among the bank's plants).
//
function drawUnderSoil(inst) {
  const view = inst.world
  inst.lake && LakeBed.onDrawBack(inst.k)
  inst.giant && Giant.onDraw(inst.giant, view, drawHeldFish)
  inst.fish.sort((a, b) => Fish.depth(b) - Fish.depth(a))
  inst.fish.forEach(fish => Fish.onDraw(fish, view))
  inst.fish.forEach(fish => Fish.onDrawSand(fish))
  if (!inst.lake) return
  Pads.onDraw(inst.pads, view)
  Trumpet.onDraw(inst.trumpet, view, inst.trumpetDraw)
  Lurker.onDrawRosette(inst.lurker, view)
  Lurker.onDraw(inst.lurker, view, drawHeldRunner, false)
  Lurker.isOut(inst.lurker) && Lurker.amongPlants(inst.lurker) && Lurker.onDraw(inst.lurker, view, drawHeldRunner, true)
}
//
// A fish in the giant's jaws (only what sticks out of its mouth), a runner
// in the lurker's.
//
function drawHeldFish(fish, view, cut) {
  Fish.onDraw(fish, view, true, cut)
}
function drawHeldRunner(prey, at, angle, size) {
  prey.runner && Runner.drawHeld(prey.runner, at, angle, size)
}
//
// Over the soil: the dry mushroom, the lake's algae, water and what is on
// it, the lurker's head out of the water, the runners, the fireflies, the
// climber, then the big stones in front of them.
//
function drawWorldLife(inst) {
  inst.lantern && Lantern.onDraw(inst.lantern)
  inst.lake && drawLake(inst)
  inst.lake && Lurker.isOut(inst.lurker) && !Lurker.amongPlants(inst.lurker) && Lurker.onDraw(inst.lurker, inst.world, drawHeldRunner, true)
  inst.runners.forEach(runner => Runner.onDraw(runner, inst.world))
  Fireflies.onDraw(inst.fireflies, inst.world.top, inst.world.bottom)
  inst.haggy && Haggy.onDraw(inst.haggy, HaggyPrey.onDraw)
  inst.front && Front.onDraw(inst.front, inst.world)
}
//
// The lake as in the level (its fish are under the soil): the algae, the
// see-through water, the fish's splashes, the bubbles, the pad plant's
// leaves, the lurker's splashes, the giant's breath and the striders on it.
//
function drawLake(inst) {
  const view = inst.world
  CaveLake.onDrawAlgae(inst.lake)
  CaveLake.onDraw(inst.lake, view)
  inst.fish.forEach(fish => Fish.onDrawSplash(fish))
  Bubbles.onDraw(inst.bubbles, view)
  Pads.onDrawCrown(inst.pads, view)
  Lurker.onDrawSplash(inst.lurker)
  Giant.onDrawMist(inst.giant)
  inst.striders.forEach(strider => Strider.onDrawWater(strider, view))
  inst.striders.forEach(strider => Strider.onDraw(strider, view))
}
//
// Something broke the surface: waves run off from it, and it is heard as
// in the level, fading over SPLASH_HEAR px from the view's middle
// (nothing to hear while baking ahead).
//
function splash(inst, onSplash, x, strength) {
  CaveLake.disturb(inst.lake, x, strength)
  onSplash?.(strength, nearMiddle(inst.place, x))
}
//
// A bubble popped on the surface: a tiny ripple there, heard as in the
// level.
//
function bubblePop(lake, onBubble, place, x, r) {
  CaveLake.disturb(lake, x, r * BUBBLE_WAVE)
  onBubble?.(r, nearMiddle(place, x))
}
//
// How near the view's middle a world X is: 1 there, 0 SPLASH_HEAR px off.
//
function nearMiddle(place, x) {
  return 1 - Math.abs(x - (place.x1 + place.x2) / 2) / SPLASH_HEAR
}
//
// The lake's life as in the level: the giant comes in to hunt the fish,
// the fish hunt the yellow fireflies and keep off the giant, the
// trumpeter catches them leaping, the lurker hunts the runners at the
// bank's edge (watching the giant over it), the striders shy from all
// that moves near the water and line up now and then.
//
function updateLakeLife(inst) {
  CaveLake.onUpdate(inst.lake)
  const ctx = inst.fishCtx
  ctx.prey.length = 0
  Fireflies.forEachLit(inst.fireflies, f => ctx.prey.push(f))
  Giant.onUpdate(inst.giant, inst.giantCtx)
  ctx.giant = Giant.bodyLine(inst.giant)
  inst.fish.forEach(fish => Fish.onUpdate(fish, ctx))
  Trumpet.onUpdate(inst.trumpet, inst.trumpetCtx)
  Bubbles.onUpdate(inst.bubbles, Fish.swimmingMouths(inst.fish, inst.fishMouths))
  inst.lurkerCtx.giant = ctx.giant
  Lurker.onUpdate(inst.lurker, inst.lurkerCtx)
  Pads.onUpdate(inst.pads)
  const fears = inst.strideFears
  fears.length = 0
  inst.runners.forEach(runner => fears.push(runner.pos))
  inst.fish.forEach(fish => {
    const head = Fish.surfacePoint(fish)
    head && fears.push(head)
  })
  Giant.fearPoints(inst.giant).forEach(p => fears.push(p))
  const lurker = Lurker.surfacePoint(inst.lurker)
  lurker && fears.push(lurker)
  StriderBridge.onUpdate(inst.bridge, null)
  inst.striders.forEach(strider => Strider.onUpdate(strider, fears, inst.striders))
}
//
// The lake's creatures' contexts (no hero: nothing for them to do with
// him), its striders' row.
//
function createLakeLife(inst, onSplash, onSnap) {
  inst.bridge = StriderBridge.create({ k: inst.k, striders: inst.striders, from: Pads.crownLine(inst.pads).span().x2, to: Layout.BANK_TIP_X2, stop: inst.trumpet.x })
  inst.giantCtx = { school: inst.fish, headOf: Fish.swimmingHead, canEat: Fish.isSmall, middleOf: Fish.middle, onChase: Fish.bolt, onSeize: Fish.seize, onHold: Fish.hold, onEat: Fish.eat, onBreath: () => {} }
  inst.lurkerCtx = {
    hero: null,
    sinking: null,
    runners: inst.runners,
    runnerAbout: Runner.isAbout,
    onSeize: prey => seizeRunner(inst, onSnap, prey),
    onSwallow: () => {},
    onSplash: x => splash(inst, onSplash, x, LURKER_SPLASH),
    onDrip: x => splash(inst, onSplash, x, DRIP_SPLASH),
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
    onCatch: fish => eatFish(inst, onSplash, fish),
    onSpit: () => {}
  }
  inst.trumpetDraw = { hero: () => {}, fish: fish => Fish.onDraw(fish, inst.world, true) }
}
//
// The climber's life as in the level, with only the runners to feel for:
// one it catches is gone from its run (and stays gone while it is eaten:
// its time away starts anew with every bite); its jaws and its hands are
// heard as in the level, from the view's middle.
//
function createHaggyLife(inst, onCrunch, onGrip) {
  inst.runnerPrey = inst.runners.map(HaggyPrey.create)
  inst.haggyCtx = {
    view: inst.world,
    prey: [],
    onEat: () => {},
    beings: [],
    onSeize: prey => Runner.snatch(prey.runner, Runner.entrySpot(), () => null),
    onJaws: (prey, strength, x) => onCrunch?.(nearMiddle(inst.place, x), strength, HaggyPrey.crunchTime(strength)),
    onBite: prey => eatRunner(prey),
    onDrop: () => {},
    onGrip: (x, y) => onGrip?.(HaggyPrey.gripNear(x, y, inst.ear))
  }
}
function eatRunner(prey) {
  Runner.snatch(prey.runner, Runner.entrySpot(), () => null)
  return true
}
//
// The climber: the runners about are told to it (what it may touch and
// feel running), then it goes on.
//
function updateHaggy(inst) {
  const ctx = inst.haggyCtx
  for (let i = 0; i < inst.runners.length; i++) HaggyPrey.setBeing(ctx.beings, i, Runner.isAbout(inst.runners[i]) ? inst.runners[i].pos : null, HaggyPrey.RUNNER_R, inst.runnerPrey[i])
  Haggy.onUpdate(inst.haggy, ctx)
}
//
// The lurker's jaws snapped shut on a runner: heard as in the level (as far
// as a splash), the runner gone for a while.
//
function seizeRunner(inst, onSnap, prey) {
  if (!prey.runner) return
  onSnap?.(nearMiddle(inst.place, prey.runner.pos.x))
  Runner.snatch(prey.runner, Runner.entrySpot(), () => null)
}
//
// The trumpeter has eaten a fish: it is gone (to swim back in later), with
// a soft gulp.
//
function eatFish(inst, onSplash, fish) {
  Fish.eat(fish)
  splash(inst, onSplash, inst.trumpet.x, GULP_SPLASH)
}
//
// Now and then a runner runs out onto the lake's left bank, near its edge.
//
function sendVisitor(inst) {
  inst.visitIn -= inst.k.dt()
  if (inst.visitIn > 0) return
  inst.visitIn = VISIT_EVERY + Math.random() * VISIT_EVERY_RANGE
  const x = Layout.BANK_TIP_X - VISIT_IN - Math.random() * VISIT_IN_RANGE
  const spot = { x, y: Ground.topAt(Layout.lakeFloor(), x) }
  const about = inst.runners.filter(Runner.isAbout)
  if (about.some(runner => Runner.sendTo(runner, spot))) return
  const view = inst.world
  const away = about.find(r => r.pos.x < view.left || r.pos.x > view.right || r.pos.y < view.top || r.pos.y > view.bottom)
  away && Runner.comeFrom(away, Runner.entrySpot(), spot)
}
//
// The dry mushroom on its platform (its crumbs and dust come to rest on
// that platform's soil).
//
function createLantern(k) {
  const p = Layout.PLATFORMS.find(q => q.id === Layout.LANTERN.on)
  return Lantern.create({ k, x: Layout.LANTERN.x, y: Lantern.footYOn(p, Layout.LANTERN.x), groundAt: x => Platform.surfaceAt(p, x) })
}
//
// Open air for the fireflies: clear of the soil and the water by
// FIREFLY_PAD px.
//
function isOpenAir(x, y) {
  return Surface.isOpenAir(x, y, FIREFLY_PAD)
}
//
// World → screen, one to one: the shown rect is the screen's size, placed
// so FOCUS_X sits at FOCUS_SHARE of its width and FOCUS_Y at FOCUS_Y_SHARE
// of its height (kept in the world; centred on it where the screen is the
// bigger).
//
function placement(w, h) {
  const x1 = keptIn(FOCUS_X - w * FOCUS_SHARE, w, Layout.WORLD_W)
  const y1 = keptIn(FOCUS_Y - h * FOCUS_Y_SHARE, h, Layout.WORLD_H)
  return { scale: 1, x1, y1, x2: x1 + w, y2: y1 + h }
}
function keptIn(from, size, worldSize) {
  return size >= worldSize ? (worldSize - size) / 2 : Math.max(0, Math.min(worldSize - size, from))
}
//
// Screen-wide columns, each under the texture limit, painted at screen
// resolution; once per live k and size (their sprite names kept per size,
// for release()).
//
function bake(k, w, h, place) {
  const key = `${w}x${h}`
  const tiles = []
  const count = Math.ceil(w / TILE_MAX)
  const tileW = Math.ceil(w / count)
  for (let i = 0; i < count; i++) tiles.push({ name: `${SPRITE_PREFIX}${key}-${i}`, x: i * tileW, w: Math.min(tileW, w - i * tileW) })
  if (bakedFor.get(k)?.has(key) || !Atlas.isLoaded()) return tiles
  tiles.forEach((tile, i) => {
    const back = tileCanvas(tile, h, place)
    Backdrop.paintBackdrop(back.ctx, place)
    applyForestFilmGrainToCanvas(back.canvas, GRAIN_SEED + i)
    k.loadSprite(tile.name + BACK, back.canvas)
    const soil = tileCanvas(tile, h, place)
    Scene.paintTerrain(soil.ctx, place, true)
    soil.ctx.setTransform(1, 0, 0, 1, -tile.x, 0)
    paintShade(soil.ctx, w, h)
    applyForestFilmGrainToCanvas(soil.canvas, GRAIN_SEED + i)
    k.loadSprite(tile.name + SOIL, soil.canvas)
  })
  bakedFor.has(k) || bakedFor.set(k, new Map())
  bakedFor.get(k).set(key, tiles.flatMap(tile => [tile.name + BACK, tile.name + SOIL]))
  return tiles
}
//
// A tile's canvas, its context set to paint the world into it.
//
function tileCanvas(tile, h, place) {
  const canvas = document.createElement('canvas')
  canvas.width = tile.w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.translate(-tile.x, 0)
  ctx.scale(place.scale, place.scale)
  ctx.translate(-place.x1, -place.y1)
  return { canvas, ctx }
}
function paintShade(ctx, w, h) {
  const g = ctx.createLinearGradient(0, h * SHADE_FROM, 0, h)
  g.addColorStop(0, `${CAVE_CFG.colors.frame}00`)
  g.addColorStop(1, CAVE_CFG.colors.frame)
  ctx.globalAlpha = SHADE_ALPHA
  ctx.fillStyle = g
  ctx.fillRect(0, h * SHADE_FROM, w, h * (1 - SHADE_FROM))
  ctx.globalAlpha = 1
}
