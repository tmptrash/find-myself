import * as FlowerPicture from '../utils/forest-water-flower-picture.js'
import * as WaterDrop from '../utils/forest-water-drop.js'
import * as GroundWater from '../utils/forest-ground-water.js'
import * as OrganicMotion from '../utils/forest-organic-motion.js'
import * as TreeJolt from '../utils/forest-tree-jolt.js'
import * as Sound from '../../../utils/sound.js'
import { FOREST_CFG } from '../cfg.js'
import { FOREST_PAL } from '../utils/forest-palette.js'

//
// The water flower by the left big tree: a leafy bell hanging from an
// arched stem grows a drop of water out of its mouth. The drop starts tiny,
// swells and draws out longer as it fills, until it is full size. A hero
// landing by the stem shakes the whole plant round its foot, like the bomb
// trees to the right; a full-size drop tears off once the shake has died
// down, falls faster and faster, splashes on the ground and spreads into a
// puddle that soaks into the soil. After a while a new drop starts growing.
//
// While it hangs the drop is drawn behind the picture, so the bell covers
// its tip; the falling drop is drawn in front of the plant.
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
// Idle breathing of the drop (stretch share). A hanging drop's tip stays
// TIP_OVERLAP px up inside the bell; its tip grows from TIP_MIN to TIP_MAX
// radii as it fills (eased in, so it draws out late, just before it is
// ready to fall) and breathes a little while it waits.
//
const BREATH_AMOUNT = 0.025
const BREATH_SPEED = 1.3
const TIP_OVERLAP = 2
const TIP_MIN = 0.35
const TIP_MAX = 1.15
const TIP_GROW_POW = 2
const TIP_BREATH = 0.6
//
// Falling, the tip springs back from its hanging length to one set by the
// speed (TIP_PER_V radii per px/s, up to TIP_FALL_MAX), easing at
// TIP_RELAX per second.
//
const TIP_PER_V = 0.0012
const TIP_FALL_MAX = 0.7
const TIP_RELAX = 9
//
// The falling water lands in a few spots across the burst span.
//
const BURST_SPOTS = 5
const DROP_WATER = 1
const DETACH_DRIP_VOLUME = 0.12
const BURST_SPLASH_VOLUME = 0.32
//
// The clear span around the flower: its plant's foot, plus the puddle a
// full drop makes under the heart (puddle reach as a share of its half
// width, the soaked rim goes a little past the water).
//
const CLEAR_PAD = 14
const PUDDLE_REACH = 1.4
const RAD_TO_DEG = 180 / Math.PI
const pictureByK = new WeakMap()

/**
 * Creates the flower on the ground line with an empty heart; its first
 * drop starts growing startDelay seconds later (0: at once). Needs
 * load(k) to have resolved first.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - World X of the stem's foot
 * @param {number} cfg.y - World Y of the ground line
 * @param {number} cfg.z - Draw layer of the plant and its drop
 * @param {number} [cfg.waterZ=cfg.z] - Draw layer of the spilt water (puddle, drops, burst ring)
 * @param {number} [cfg.startDelay] - Seconds before the first drop (the level's start pause)
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
    spotPos: k.vec2(x, y + picture.spot.dy),
    heartX: x + picture.heart.x,
    heartY: y + picture.heart.y,
    jolt: TreeJolt.create(),
    shakeAngle: 0,
    dropLeft: 0,
    drop: WaterDrop.create(k, COLORS),
    ground: GroundWater.create({ k, groundY: y, params: PARAMS, colors: COLORS }),
    state: STATES.GONE,
    time: 0,
    clock: OrganicMotion.createClock(PHYSICS_STEP, MAX_FRAME_DT),
    growth: 0,
    regrowLeft: startDelay,
    sway: OrganicMotion.create(),
    wobble: OrganicMotion.create(),
    centre: { x: 0, y: 0 },
    fall: { x: 0, y: 0, vy: 0, r: 0, tip: 0 },
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
 * Where the stem's foot goes for the flower's heart (and the drop hanging
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
 * Where the flower's drop hangs (and its water falls) across the ground.
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
 * Whether a full-size drop hangs in the flower and is not already
 * shaken loose.
 * @param {Object|null} inst - Flower inst
 * @returns {boolean}
 */
export function isRipe(inst) {
  return inst?.state === STATES.RIPE && !(inst.dropLeft > 0)
}

/**
 * Where the full-size drop hangs now.
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
 * Something bit the full-size drop: the plant jolts and the drop tears
 * off at once.
 * @param {Object|null} inst - Flower inst
 * @returns {boolean} Whether a drop tore off
 */
export function pierce(inst) {
  if (!isRipe(inst)) return false
  TreeJolt.start(inst.jolt)
  detach(inst)
  return true
}

/**
 * Reports a hero landing on the ground. Near the stem's foot it shakes the
 * plant and the hanging drop; a full-size drop tears off and falls once
 * the shake has died down (shakeDropDelay).
 * @param {Object} inst - Flower inst
 * @param {number} heroX - World X of the hero's feet
 * @returns {boolean} Whether the landing shook the drop loose
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
  GroundWater.onUpdate(inst.ground, dt)
}
//
// A hanging drop (the bell covers its tip), the plant, the moss spot at its
// foot, then the falling drop in front of them. The spot stays put while
// the plant shakes.
//
function isFlowerInView(inst) {
  const k = inst.k
  const camX = k.camPos().x
  const scale = k.camScale?.()
  const zoom = (typeof scale === 'object' ? scale.x : scale) || 1
  const half = k.width() / (2 * zoom) + 80
  return inst.x >= camX - half && inst.x <= camX + half
}
function onDraw(inst) {
  if (!isFlowerInView(inst)) return
  const { state } = inst
  const hanging = state === STATES.GROWING || state === STATES.RIPE
  hanging && drawHanging(inst)
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
  if (!isFlowerInView(inst)) return
  GroundWater.drawSoil(inst.ground)
  GroundWater.drawSplash(inst.ground)
}
//
// The sway swings the hanging drop round the flower's heart on a slow
// drift; the wobble is the drop's squash, breathing a little at rest.
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
// the drop hanging from it) along.
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
// A shaken full-size drop holds on until the shake has died down.
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
  const tipTarget = fall.r * Math.min(TIP_FALL_MAX, fall.vy * TIP_PER_V)
  fall.tip += (tipTarget - fall.tip) * Math.min(1, h * TIP_RELAX)
  fall.y + fall.r * fallStretch(inst) >= inst.groundY && burst(inst)
}
//
// The drop swells fast at first and slows into its full size; after a
// burst the flower stays bare for a while before the next one starts.
//
function updateGrowth(inst, dt) {
  if (inst.state === STATES.GROWING) {
    inst.growth = Math.min(1, inst.growth + dt / PARAMS.dropGrowDuration)
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
}
function hangingRadius(inst) {
  const g = 1 - inst.growth
  return PARAMS.dropMaxRadius * (1 - g * g)
}
//
// How far a hanging drop's tip reaches over its belly: short while it is
// small, drawn out as it fills, breathing with the wobble.
//
function hangingTip(inst, r) {
  const fill = Math.pow(inst.growth, TIP_GROW_POW)
  return r * (TIP_MIN + (TIP_MAX - TIP_MIN) * fill + inst.wobble.value * TIP_BREATH)
}
//
// The drop hangs from the bell by its tip (TIP_OVERLAP up inside it), lower
// as it grows and draws out, and the sway turns it round the heart.
//
function hangingCentre(inst, r, stretch, out) {
  const a = inst.sway.value
  const reach = hangingTip(inst, r) + r * stretch - TIP_OVERLAP
  out.x = inst.heartX + Math.sin(a) * reach
  out.y = inst.heartY + Math.cos(a) * reach
  return out
}
function drawHanging(inst) {
  const r = hangingRadius(inst)
  const stretch = 1 + inst.wobble.value
  const c = hangingCentre(inst, r, stretch, inst.centre)
  WaterDrop.draw(inst.drop, c.x, c.y, r, stretch, hangingTip(inst, r), -inst.sway.value)
}
function drawFalling(inst) {
  const { fall } = inst
  WaterDrop.draw(inst.drop, fall.x, fall.y, fall.r, fallStretch(inst), fall.tip, 0)
}
function fallStretch(inst) {
  return 1 + inst.wobble.value + Math.min(PARAMS.fallMaxStretch, inst.fall.vy * PARAMS.fallStretch)
}
//
// Torn off where it hangs: the drop starts falling from rest with a wobble
// from the snap, its drawn-out tip springing back as it goes.
//
function detach(inst) {
  const { fall } = inst
  const r = hangingRadius(inst)
  hangingCentre(inst, r, 1 + inst.wobble.value, fall)
  fall.vy = 0
  fall.r = r
  fall.tip = hangingTip(inst, r)
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
    GroundWater.addWater(inst.ground, fall.x + halfW * u, DROP_WATER / BURST_SPOTS)
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
  inst.onSoilWatered(inst.wateredPos, DROP_WATER)
}
function playSfx(inst, play, volume) {
  inst.sfx && !inst.sfx._forestSfxMuted && play(inst.sfx, volume)
}
