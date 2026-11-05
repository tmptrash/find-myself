import * as FlowerPicture from '../utils/forest-water-flower-picture.js'
import * as WaterBubble from '../utils/forest-water-bubble.js'
import * as GroundWater from '../utils/forest-ground-water.js'
import * as OrganicMotion from '../utils/forest-organic-motion.js'
import * as TreeJolt from '../utils/forest-tree-jolt.js'
import * as Sound from '../../../utils/sound.js'
import { FOREST_CFG } from '../cfg.js'
import { FOREST_PAL } from '../utils/forest-palette.js'

//
// The water flower by the left big tree: a red flower hanging from a mossy
// stem grows a clear bubble of water out of its heart. The bubble swells and
// hangs lower until it is full size. A hero landing by the stem shakes the
// whole plant round its foot, like the bomb trees to the right; a full-size
// bubble tears off once the shake has died down. Its skin pops as it tears
// off and only its water falls, splashes on the ground and spreads into a
// puddle that soaks into the soil. After a while a new bubble starts growing.
//
// While it hangs the bubble (and its popping skin) is drawn behind the
// picture, so the front petals cover its top; the falling water is drawn in
// front of the plant.
//
const STATES = {
  GROWING: 'growing',
  RIPE: 'ripe',
  FALLING: 'falling',
  GONE: 'gone'
}
const PARAMS = FOREST_CFG.waterFlower
const COLORS = FOREST_PAL.waterFlower
const PHYSICS_STEP = 1 / 240
const MAX_FRAME_DT = 0.1
const SWAY_SEED = 13.7
const BREATH_SEED = 29.3
//
// Idle skin breathing (stretch share). A growing bubble swells out of the
// petals, its top hanging HANG_DROP below the heart at full size, tied to
// it by a short neck whose tip stays NECK_OVERLAP up inside the flower.
//
const BREATH_AMOUNT = 0.025
const BREATH_SPEED = 1.3
const HANG_DROP = 0
const NECK_OVERLAP = 3
//
// The water's surface tilts against the sway's speed (it lags the skin)
// and ripples a little all the time (phase speed, rad/s).
//
const SLOSH_GAIN = 0.35
const SLOSH_MAX = 0.5
const WAVE_SPEED = 3.2
//
// The torn-off skin's ring flies apart this long; the falling water has no
// skin left and lands in a few spots across the burst span.
//
const POP_DURATION = 0.2
const BARE_WATER = 0
const BURST_SPOTS = 5
const BUBBLE_WATER = 1
const DETACH_DRIP_VOLUME = 0.12
const BURST_SPLASH_VOLUME = 0.32
//
// The clear span around the flower: its plant's foot, plus the puddle a
// full bubble makes under the heart (puddle reach as a share of its half
// width, the soaked rim goes a little past the water).
//
const CLEAR_PAD = 14
const PUDDLE_REACH = 1.4
const RAD_TO_DEG = 180 / Math.PI
//
// The moment the bubble is full it flashes RIPE_FLASH_COUNT times: each
// time its brightness swells and fades over RIPE_FLASH_ONE_SEC.
//
const RIPE_FLASH_COUNT = 2
const RIPE_FLASH_ONE_SEC = 0.35
const RIPE_FLASH_DURATION = RIPE_FLASH_ONE_SEC * RIPE_FLASH_COUNT
const pictureByK = new WeakMap()

/**
 * Creates the flower on the ground line with an empty heart; its first
 * bubble starts growing startDelay seconds later (0: at once). Needs
 * load(k) to have resolved first.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - World X of the stem's foot
 * @param {number} cfg.y - World Y of the ground line
 * @param {number} cfg.z - Draw layer of the plant and its bubble
 * @param {number} [cfg.waterZ=cfg.z] - Draw layer of the spilt water (puddle, drops, burst ring)
 * @param {number} [cfg.startDelay] - Seconds before the first bubble (the level's start pause)
 * @param {Object} [cfg.sfx] - Sound inst
 * @param {{x1: number, x2: number}} [cfg.rootArea] - Ground span that counts as the tree's roots
 * @param {Function} [cfg.onSoilWatered] - (position, amount) when a burst waters the roots
 * @returns {Object|null} Flower inst (null if the picture is not baked)
 */
export function create(cfg) {
  const { k, x, y, z, waterZ = z, sfx = null, rootArea = null, onSoilWatered = null, startDelay = PARAMS.startDelay } = cfg
  const picture = pictureByK.get(k)
  if (!picture) return null
  const inst = {
    k,
    x,
    groundY: y,
    sfx,
    rootArea,
    onSoilWatered,
    picture,
    footPos: k.vec2(x, y),
    footAnchor: k.vec2(picture.anchor.x, picture.anchor.y),
    rootsPos: k.vec2(x + picture.roots.dx, y + picture.roots.dy),
    spotPos: k.vec2(x, y + picture.spot.dy),
    heartX: x + picture.heart.x,
    heartY: y + picture.heart.y,
    jolt: TreeJolt.create(),
    shakeAngle: 0,
    dropLeft: 0,
    bubble: WaterBubble.create(k, COLORS),
    ground: GroundWater.create({ k, groundY: y, params: PARAMS, colors: COLORS }),
    state: STATES.GONE,
    time: 0,
    clock: OrganicMotion.createClock(PHYSICS_STEP, MAX_FRAME_DT),
    growth: 0,
    regrowLeft: startDelay,
    sway: OrganicMotion.create(),
    wobble: OrganicMotion.create(),
    centre: { x: 0, y: 0 },
    fall: { x: 0, y: 0, vy: 0, r: 0 },
    pop: { x: 0, y: 0, r: 0, t: 1 },
    flash: 1,
    ripeSpot: { x: 0, y: 0, r: 0 },
    wateredPos: { x: 0, y }
  }
  const obj = k.add([
    k.pos(0, 0),
    k.z(z),
    { draw() { onDraw(inst) } }
  ])
  obj.onUpdate(() => onUpdate(inst))
  inst.obj = obj
  inst.waterObj = k.add([
    k.pos(0, 0),
    k.z(waterZ),
    { draw() { onDrawSpiltWater(inst) } }
  ])
  return inst
}

/**
 * Hides or shows the flower and its spilt water (it goes on living while
 * hidden).
 * @param {Object|null} inst - Flower inst
 * @param {boolean} hidden - True to hide
 */
export function setHidden(inst, hidden) {
  if (!inst) return
  inst.obj.hidden = hidden
  inst.waterObj.hidden = hidden
}

/**
 * Bakes the flower's picture once per live k (waits for it to load).
 * @param {Object} k - Kaplay instance
 * @returns {Promise<Object|null>} Baked picture (null if it failed to load)
 */
export async function load(k) {
  const picture = await FlowerPicture.load(k, PARAMS.height)
  picture && pictureByK.set(k, picture)
  return picture
}

/**
 * Where the stem's foot goes for the flower's heart (and the bubble hanging
 * from it) to be right above a world X (no picture needed).
 * @param {number} heartX - World X the heart should hang above
 * @returns {number} World X of the stem's foot (whole px, so the picture stays sharp)
 */
export function footXUnderHeart(heartX) {
  return Math.round(heartX - FlowerPicture.layout(PARAMS.height).heart.x)
}

/**
 * Ground span the flower and its puddle take, for the level to keep free
 * of plants, stones and grass.
 * @param {number} x - World X of the stem's foot
 * @returns {{x1: number, x2: number}}
 */
export function clearSpan(x) {
  const picture = FlowerPicture.layout(PARAMS.height)
  const puddle = PARAMS.puddleWidth * PUDDLE_REACH
  const heartX = x + picture.heart.x
  return {
    x1: Math.min(x + picture.dx, heartX - puddle) - CLEAR_PAD,
    x2: Math.max(x + picture.dx + picture.w, heartX + puddle) + CLEAR_PAD
  }
}

/**
 * The water falling from the flower, while it falls.
 * @param {Object|null} inst - Flower inst
 * @returns {{x: number, y: number, r: number}|null} Its centre and radius (world px)
 */
export function fallingWater(inst) {
  return inst?.state === STATES.FALLING ? inst.fall : null
}

/**
 * Where the flower's bubble hangs (and its water falls) across the ground.
 * @param {Object|null} inst - Flower inst
 * @returns {number|null} World X of the flower's heart (null without a flower)
 */
export function dropX(inst) {
  return inst ? inst.heartX : null
}

/**
 * The falling water hits something on its way down and bursts right away,
 * splashing onto the ground under it.
 * @param {Object} inst - Flower inst
 */
export function burstFallingWater(inst) {
  inst.state === STATES.FALLING && burst(inst)
}

/**
 * Whether a full-size bubble hangs in the flower and is not already
 * shaken loose.
 * @param {Object|null} inst - Flower inst
 * @returns {boolean}
 */
export function isRipe(inst) {
  return inst?.state === STATES.RIPE && !(inst.dropLeft > 0)
}

/**
 * Where the full-size bubble hangs now.
 * @param {Object} inst - Flower inst
 * @returns {{x: number, y: number, r: number}} Its centre and radius (world px, reused object)
 */
export function ripeSpot(inst) {
  const spot = inst.ripeSpot
  spot.r = hangingRadius(inst)
  hangingCentre(inst, spot.r, 1 + inst.wobble.value, spot)
  return spot
}

/**
 * Something bit the full-size bubble: the plant jolts and the bubble tears
 * off at once.
 * @param {Object|null} inst - Flower inst
 * @returns {boolean} Whether a bubble tore off
 */
export function pierce(inst) {
  if (!isRipe(inst)) return false
  TreeJolt.start(inst.jolt)
  detach(inst)
  return true
}

/**
 * Reports a hero landing on the ground. Near the stem's foot it shakes the
 * plant and the hanging bubble; a full-size bubble tears off and falls once
 * the shake has died down (shakeDropDelay).
 * @param {Object} inst - Flower inst
 * @param {number} heroX - World X of the hero's feet
 * @returns {boolean} Whether the landing shook the bubble loose
 */
export function onHeroLanded(inst, heroX) {
  if (!inst || Math.abs(heroX - inst.x) > PARAMS.landingRadius) return false
  TreeJolt.start(inst.jolt)
  if (inst.state !== STATES.GROWING && inst.state !== STATES.RIPE) return false
  inst.sway.velocity += PARAMS.landingSwayKick * Math.sign(inst.heartX - heroX || 1)
  inst.wobble.velocity += PARAMS.landingWobbleKick
  if (inst.state !== STATES.RIPE || inst.dropLeft > 0) return false
  inst.dropLeft = PARAMS.shakeDropDelay
  return true
}

//
// The shake moves the flower's heart first, then fixed-step springs, growth,
// the delayed tear-off, fall and the spilt water.
//
function onUpdate(inst) {
  const dt = inst.k.dt()
  updateShake(inst, dt)
  const steps = OrganicMotion.consumeSteps(inst.clock, dt)
  for (let i = 0; i < steps; i++) {
    inst.time += PHYSICS_STEP
    stepSprings(inst, PHYSICS_STEP)
    inst.state === STATES.FALLING && stepFall(inst, PHYSICS_STEP)
  }
  updateGrowth(inst, dt)
  updateDrop(inst, dt)
  inst.pop.t = Math.min(1, inst.pop.t + dt / POP_DURATION)
  inst.flash = Math.min(1, inst.flash + dt / RIPE_FLASH_DURATION)
  GroundWater.onUpdate(inst.ground, dt)
}
//
// The roots under the ground, a hanging bubble or its popping skin (the
// front petals cover their top), the plant, the moss spot over its joint
// with the roots, then the falling water in front of them. The roots and
// the spot stay put while the plant shakes.
//
function onDraw(inst) {
  const { state, pop } = inst
  const hanging = state === STATES.GROWING || state === STATES.RIPE
  inst.k.drawSprite({ sprite: inst.picture.roots.sprite, pos: inst.rootsPos })
  hanging && drawHanging(inst)
  WaterBubble.drawPop(inst.bubble, pop.x, pop.y, pop.r, pop.t)
  inst.k.drawSprite({
    sprite: inst.picture.sprite,
    pos: inst.footPos,
    anchor: inst.footAnchor,
    angle: inst.shakeAngle * RAD_TO_DEG
  })
  inst.k.drawSprite({ sprite: inst.picture.spot.sprite, pos: inst.spotPos, anchor: 'center' })
  state === STATES.FALLING && drawFalling(inst)
}
//
// Spilt water on its own layer, in front of the ground plants round the
// tree's foot: wet soil and puddle, splash drops.
//
function onDrawSpiltWater(inst) {
  GroundWater.drawSoil(inst.ground)
  GroundWater.drawSplash(inst.ground)
}
//
// The sway swings the hanging bubble round the flower's heart on a slow
// drift; the wobble is the skin's squash, breathing a little at rest.
//
function stepSprings(inst, h) {
  const t = inst.time
  const hanging = inst.state === STATES.GROWING || inst.state === STATES.RIPE
  const swayTarget = hanging ? PARAMS.swayAmplitude * OrganicMotion.drift(t, SWAY_SEED, PARAMS.swaySpeed) : 0
  OrganicMotion.step(inst.sway, swayTarget, PARAMS.swayStiffness, PARAMS.swayDamping, h)
  const breath = BREATH_AMOUNT * OrganicMotion.drift(t, BREATH_SEED, BREATH_SPEED)
  OrganicMotion.step(inst.wobble, breath, PARAMS.wobbleStiffness, PARAMS.wobbleDamping, h)
}
//
// The plant swings round its stem's foot, carrying the flower's heart (and
// the bubble hanging from it) along.
//
function updateShake(inst, dt) {
  TreeJolt.onUpdate(inst.jolt, dt)
  const a = TreeJolt.angle(inst.jolt, PARAMS.shakeMaxAngle)
  const { x, y } = inst.picture.heart
  inst.shakeAngle = a
  inst.heartX = inst.x + x * Math.cos(a) - y * Math.sin(a)
  inst.heartY = inst.groundY + x * Math.sin(a) + y * Math.cos(a)
}
//
// A shaken full-size bubble holds on until the shake has died down.
//
function updateDrop(inst, dt) {
  if (!(inst.dropLeft > 0)) return
  inst.dropLeft = Math.max(0, inst.dropLeft - dt)
  inst.dropLeft === 0 && inst.state === STATES.RIPE && detach(inst)
}
function stepFall(inst, h) {
  const { fall } = inst
  fall.vy += PARAMS.fallGravity * h
  fall.y += fall.vy * h
  fall.y + fall.r * fallStretch(inst) >= inst.groundY && burst(inst)
}
//
// The bubble swells fast at first and slows into its full size; after a
// burst the flower stays bare for a while before the next one starts.
//
function updateGrowth(inst, dt) {
  if (inst.state === STATES.GROWING) {
    inst.growth = Math.min(1, inst.growth + dt / PARAMS.bubbleGrowDuration)
    inst.growth >= 1 && ripen(inst)
    return
  }
  if (inst.state !== STATES.GONE) return
  inst.regrowLeft -= dt
  if (inst.regrowLeft > 0) return
  inst.growth = 0
  inst.state = STATES.GROWING
}
function ripen(inst) {
  inst.state = STATES.RIPE
  inst.flash = 0
}
function hangingRadius(inst) {
  const g = 1 - inst.growth
  return PARAMS.bubbleMaxRadius * (1 - g * g)
}
function hangingDrop(inst) {
  return HANG_DROP * inst.growth
}
//
// The bubble hangs lower as it grows, and the sway turns it round the heart.
//
function hangingCentre(inst, r, stretch, out) {
  const a = inst.sway.value
  const reach = hangingDrop(inst) + r * stretch
  out.x = inst.heartX + Math.sin(a) * reach
  out.y = inst.heartY + Math.cos(a) * reach
  return out
}
function drawHanging(inst) {
  const r = hangingRadius(inst)
  const stretch = 1 + inst.wobble.value
  const c = hangingCentre(inst, r, stretch, inst.centre)
  const neck = r > 0 ? (hangingDrop(inst) + NECK_OVERLAP) / r : 0
  const slosh = Math.max(-SLOSH_MAX, Math.min(SLOSH_MAX, -inst.sway.velocity * SLOSH_GAIN))
  WaterBubble.draw(inst.bubble, c.x, c.y, r, stretch, neck, PARAMS.bubbleWaterFill, slosh,
    inst.time * WAVE_SPEED)
  inst.flash < 1 && WaterBubble.drawFlash(inst.bubble, Math.abs(Math.sin(Math.PI * RIPE_FLASH_COUNT * inst.flash)))
}
function drawFalling(inst) {
  const { fall } = inst
  WaterBubble.draw(inst.bubble, fall.x, fall.y, fall.r, fallStretch(inst), 0, PARAMS.bubbleWaterFill, 0,
    inst.time * WAVE_SPEED, BARE_WATER)
}
function fallStretch(inst) {
  return 1 + inst.wobble.value + Math.min(PARAMS.fallMaxStretch, inst.fall.vy * PARAMS.fallStretch)
}
//
// Torn off where it hangs: the skin pops there and its ring flies apart,
// the water it held starts falling with a wobble from the snapped neck.
//
function detach(inst) {
  const { fall, pop } = inst
  const r = hangingRadius(inst)
  hangingCentre(inst, r, 1 + inst.wobble.value, fall)
  fall.vy = 0
  fall.r = r
  pop.x = fall.x
  pop.y = fall.y
  pop.r = r
  pop.t = 0
  inst.wobble.velocity -= PARAMS.landingWobbleKick
  inst.state = STATES.FALLING
  playSfx(inst, Sound.playDripSound, DETACH_DRIP_VOLUME)
}
//
// The water hits the ground: it slaps down and runs out with a crown
// throwing drops, lands across the burst span and the roots there drink.
//
function burst(inst) {
  const { fall } = inst
  const halfW = fall.r * PARAMS.burstSpread
  for (let i = 0; i < BURST_SPOTS; i++) {
    const u = BURST_SPOTS > 1 ? i / (BURST_SPOTS - 1) * 2 - 1 : 0
    GroundWater.addWater(inst.ground, fall.x + halfW * u, BUBBLE_WATER / BURST_SPOTS)
  }
  GroundWater.slap(inst.ground, fall.x, fall.r)
  GroundWater.splash(inst.ground, fall.x, PARAMS.burstSplashDrops, halfW, PARAMS.burstSplashPower)
  waterRoots(inst, fall.x)
  playSfx(inst, Sound.playSplashSound, BURST_SPLASH_VOLUME)
  inst.wobble.value = 0
  inst.wobble.velocity = 0
  inst.regrowLeft = PARAMS.regrowDelay
  inst.state = STATES.GONE
}
function waterRoots(inst, x) {
  const { rootArea } = inst
  if (!inst.onSoilWatered || !rootArea || x < rootArea.x1 || x > rootArea.x2) return
  inst.wateredPos.x = x
  inst.onSoilWatered(inst.wateredPos, BUBBLE_WATER)
}
function playSfx(inst, play, volume) {
  inst.sfx && !inst.sfx._forestSfxMuted && play(inst.sfx, volume)
}
