import { CFG } from '../../../cfg.js'
import * as IkChain from '../../../utils/ik-chain.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { createSeededRandom, nextSeed } from '../../../utils/seeded-random.js'
import { drawFernToCanvas } from '../../../utils/draw-fern.js'
import { drawFeatherPlumeToCanvas } from '../../../utils/draw-feather-plume.js'
import { drawGrassTuftToCanvas } from '../../../utils/draw-grass-tuft.js'
import { drawGroundRimToCanvas } from '../../../utils/draw-ground-rim.js'
import { drawSmallMushroomGroupToCanvas } from '../../../utils/draw-small-mushroom.js'
import { GLOW_PAL, glowRgb } from '../utils/glow-palette.js'
import { drawStaticDecorSprite, ensureStaticDecorSprite } from '../utils/glow-static-bake.js'
import { forestFloorPainterColors } from './forest-floor.js'

//
// Flat earth island in the left lake carrying a calla plant: an IK stem with
// a cream spathe whose spadix holds a watching eye, a few closed buds, and
// leafy tentacle vines that stretch toward the hero once he nears the big tree.
//
// The island runs off the left edge of the playfield (its left part sits under
// the frame) and wears the same surface as the right-side ground: ragged rim,
// ferns, spike bushes, grass tufts, mushrooms and stones.
//
const ISLAND_W = 250
const ISLAND_OFFSCREEN_W = 80
const ISLAND_ABOVE_WATER = 18
const ISLAND_BELOW_WATER = 22
const ISLAND_TOP_STEP = 10
const ISLAND_TOP_JITTER = 0.8
const ISLAND_BOTTOM_STEP = 22
const ISLAND_BOTTOM_JITTER = 4
const ISLAND_BOTTOM_INSET = 14
//
// Only the right end meets open water, so only it rounds down into the lake
// (outside the collider span, so the hero never hovers over it).
//
const ISLAND_SHOULDER_W = 26
const ISLAND_SHOULDER_DROP = 10
const ISLAND_STRATA_COUNT = 3
const ISLAND_STRATA_H = 2
const ISLAND_STRATA_JITTER = 3
const ISLAND_CONTOUR_W = 2
const ISLAND_BAKE_PAD = 4
const ISLAND_DECOR_UP = 96
const ISLAND_BAKE_SEED = 0x65796566
const ISLAND_BAKE_SLOT = 'island'
const ISLAND_BAKE_KEY = 'v5'
//
// Surface dressing, placed by offset from the lake's left edge (negative = under
// the frame). Same painters and colours as the forest floor right of the tree.
//
const KIND = { FERN: 'fern', PLUME: 'plume', MUSHROOMS: 'mushrooms' }
const ISLAND_PLANTS = [
  { kind: KIND.FERN, dx: -34, size: 60 },
  { kind: KIND.PLUME, dx: -6, size: 42 },
  { kind: KIND.FERN, dx: 14, size: 48 },
  { kind: KIND.PLUME, dx: 84, size: 36 },
  { kind: KIND.FERN, dx: 106, size: 52 },
  { kind: KIND.MUSHROOMS, dx: 128 },
  { kind: KIND.PLUME, dx: 138, size: 30 }
]
const ISLAND_STONES = [
  { dx: 62, rx: 9, ry: 6 },
  { dx: 96, rx: 5, ry: 3.5 },
  { dx: 140, rx: 11, ry: 7 }
]
const ISLAND_STONE_SINK = 0.35
const ISLAND_STONE_LIGHT_FRAC = 0.55
const ISLAND_TUFT_STEP = 13
const ISLAND_TUFT_CHANCE = 0.55
//
// Island sits under the lake fill (LAKE_Z = 12) so the water hides its
// submerged half; the plant draws just behind the hero.
//
const ISLAND_Z = 11.8
const PLANT_Z = CFG.visual.zIndex.player - 0.5
//
// Static collider over the walkable top (hidden far away while the plant is off).
//
const COLLIDER_H = 10
const COLLIDER_HIDE_POS = -5000
const STAND_X_SLACK = 6
const STAND_ABOVE = 14
const STAND_BELOW = 14
//
// Open water kept between the island edge and a swimming centipede's head.
//
const PREDATOR_CLEAR_X = 28
//
// Plant root just right of the frame, so the flower and its buds are on screen.
//
const PLANT_BASE_DX = ISLAND_OFFSCREEN_W + 44
const PLANT_BASE_SINK = 2
//
// Stem: IK chain that rests as an arch drooping toward the lake and leans
// its head toward the hero while the flower is open.
//
const STEM_SEGMENTS = 9
const STEM_LEN = 156
const STEM_REST_BEND = 2
const STEM_BEND_POW = 1.6
const STEM_SWAY_AMP = 0.08
const STEM_SWAY_SPEED = 0.9
const STEM_STIFFNESS = 0.35
const STEM_LEAN_MAX = 30
const STEM_OPEN_LIFT = 10
//
// Head target never gets farther than this from the root, so the IK keeps
// the stem bowed instead of pulling it into a straight pole.
//
const STEM_CHORD_MAX_FRAC = 0.8
const STEM_W_BASE = 6
const STEM_W_TIP = 4
const CONTOUR_PAD = 2
//
// Calla spathe in its own frame (u along the stem axis, v across it): a
// funnel whose upper lip runs long into a curled point and whose lower lip
// rolls toward the viewer. Closed, it narrows to a slim bud around the eye.
//
const FLOWER_LEN = 52
const FLOWER_HALF_W = 30
const FLOWER_CLOSED_W = 0.3
const FLOWER_TURN = 0.7
const FLOWER_THROAT_SHOW = 0.05
const SPATHE_SHAPE = [[0, 0], [0.12, 0.16], [0.4, 0.42], [0.7, 0.6], [0.92, 0.5], [1.02, 0.28], [1.06, 0], [1.14, -0.35], [1.22, -0.75], [1.32, -1.05], [1, -1], [0.7, -0.82], [0.42, -0.5], [0.15, -0.18]]
const THROAT_SHAPE = [[0.08, 0], [0.3, 0.25], [0.62, 0.4], [0.9, 0.25], [1.05, -0.2], [1.12, -0.7], [0.85, -0.75], [0.55, -0.55], [0.28, -0.25]]
const LIP_PATH = [[0.05, 0.12], [0.35, 0.42], [0.68, 0.6], [0.95, 0.45], [1.04, 0.24]]
const HOOK_PATH = [[1.22, -0.75], [1.32, -1.05], [1.25, -1.22], [1.12, -1.14]]
const LIP_W_BASE = 4
const LIP_W_TIP = 2
const HOOK_W_BASE = 3
const HOOK_W_TIP = 1.2
//
// Openness follows distance from hero to the flower head (far = closed).
//
const OPEN_FAR = 850
const OPEN_NEAR = 450
const OPEN_SPEED = 1.2
//
// Eye on the yellow spadix: tucked inside the closed spathe, it rises out of
// the throat toward the hero in the second half of the opening.
//
const EYE_STALK_SEGMENTS = 3
const EYE_ORIGIN_FRAC = 0.1
const EYE_HIDDEN_EXT = 12
const EYE_OUT_EXT = 36
const EYE_OUT_FROM = 0.35
const EYE_TURN = 0.6
const EYE_STALK_SLACK = 0.92
const EYE_STALK_STIFFNESS = 0.4
const EYE_STALK_W = 4
const EYE_R = 9
const EYE_IRIS_FRAC = 0.58
const EYE_PUPIL_FRAC = 0.32
const EYE_LOOK_FRAC = 0.35
const EYE_GLINT_FRAC = 0.18
const EYE_CONTOUR_W = 1.5
//
// Closed side buds on their own stems, like the reference plant: one droops
// left, one stands up, one droops right.
//
const BUDS = [
  { dx: -12, angle: -1.95, bend: -1.5, len: 118, size: 0.6, phase: 0.6 },
  { dx: -2, angle: -1.62, bend: 0.3, len: 146, size: 0.5, phase: 2.1 },
  { dx: 12, angle: -1.25, bend: 1.7, len: 102, size: 0.55, phase: 1.2 }
]
const BUD_SEGMENTS = 8
const BUD_BEND_POW = 1.8
const BUD_WIDTH = 0.38
const BUD_SWAY_AMP = 0.06
const BUD_SWAY_SPEED = 1
const BUD_STEM_W_BASE = 4
const BUD_STEM_W_TIP = 3
//
// Tentacle vines rooted around the stem. They grow while the hero is left of
// `reachTriggerX + TENTACLE_TRIGGER_FADE` and straighten toward him, almost
// all the way to the big tree (their tips stop TENTACLE_TREE_GAP short of it).
//
const TENTACLES = [
  { dx: -8, angle: -2.3, curl: 0.9, restLen: 90, phase: 0, targetDy: -8, arch: 1.25 },
  { dx: 4, angle: -1.25, curl: 1.1, restLen: 110, phase: 1.7, targetDy: 0, arch: 0.8 },
  { dx: 10, angle: -0.6, curl: 1.3, restLen: 80, phase: 3.1, targetDy: 8, arch: 1 }
]
const TENTACLE_SEGMENTS = 24
const TENTACLE_TREE_GAP = 70
const TENTACLE_MAX_LEN_SLACK = 1.15
const TENTACLE_HERO_GAP = 18
const TENTACLE_TRIGGER_FADE = 220
const TENTACLE_GROW_SPEED = 260
const TENTACLE_SHRINK_SPEED = 320
const TENTACLE_STIFF_IDLE = 0.3
const TENTACLE_STIFF_REACH = 0.04
const TENTACLE_SWAY_AMP = 0.08
const TENTACLE_SWAY_SPEED = 1.1
const TENTACLE_WAVE_AMP = 9
const TENTACLE_WAVE_SPEED = 2.4
const TENTACLE_WAVE_K = 0.45
const TENTACLE_WAVE_IDLE = 0.2
//
// Reaching vines bow upward over the water (fraction of the vine length).
//
const TENTACLE_ARCH_FRAC = 0.1
const TENTACLE_W_BASE = 6
const TENTACLE_W_TIP = 1.6
const TENTACLE_WATER_CLEAR = 3
const TENTACLE_LEAF_FROM = 2
const TENTACLE_LEAF_EVERY = 2
const TENTACLE_LEAF_LEN = 16
const TENTACLE_LEAF_TAPER = 0.4
const TENTACLE_LEAF_ANGLE = 0.85
//
// Tall lanceolate leaves rising from the base (plus the ones along the vines).
//
const ROSETTE = [
  { angle: -2.6, len: 62, phase: 0.4 },
  { angle: -2.15, len: 84, phase: 1.3 },
  { angle: -1.85, len: 58, phase: 2.2 },
  { angle: -1.35, len: 92, phase: 0.9 },
  { angle: -1, len: 74, phase: 2.8 },
  { angle: -0.6, len: 56, phase: 1.9 }
]
const ROSETTE_SWAY_AMP = 0.05
const ROSETTE_SWAY_SPEED = 1.3
const LEAF_WIDTH_FRAC = 1.05
const LEAF_SHAPE = [[0, 0], [0.3, -0.16], [0.6, -0.18], [0.85, -0.1], [1, 0], [0.8, 0.07], [0.5, 0.1], [0.25, 0.08]]
const LEAF_LIGHT_SHAPE = [[0.04, -0.02], [0.3, -0.13], [0.6, -0.15], [0.85, -0.08], [0.96, -0.01]]
//
// Whisper: the flower head alone only reaches HEAD_WHISPER_PEAK; the loop
// is loudest when a vine tip actually touches the hero.
//
const WHISPER_RADIUS = 950
const HEAD_WHISPER_PEAK = 0.6
const TOUCH_WHISPER_NEAR = TENTACLE_HERO_GAP + 8
const TOUCH_WHISPER_FAR = 280

/**
 * Creates the island, its walkable collider and the eye-flower plant.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.x - Island centre X (see islandWorldX)
 * @param {number} cfg.waterY - Lake surface Y at rest
 * @param {number} cfg.reachTriggerX - Big tree X: hero left of it makes tentacles reach, tips stop just short of it
 * @param {function(): ({x: number, y: number}|null)} cfg.getHeroPos - Hero body centre
 * @param {function(): boolean} cfg.isVisible - True while the island exists (colour world + lake)
 * @returns {Object} Eye-flower inst
 */
export function create(cfg) {
  const { k, x, waterY } = cfg
  const x1 = x - ISLAND_W * 0.5
  const x2 = x1 + ISLAND_W
  const topY = waterY - ISLAND_ABOVE_WATER
  const baseX = x1 + PLANT_BASE_DX
  const baseY = topY + PLANT_BASE_SINK
  const reachLimitX = cfg.reachTriggerX - TENTACLE_TREE_GAP
  const collider = k.add([
    k.rect(ISLAND_W - ISLAND_SHOULDER_W, COLLIDER_H),
    k.pos(COLLIDER_HIDE_POS, COLLIDER_HIDE_POS),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName
  ])
  const inst = {
    k,
    x,
    x1,
    x2,
    waterY,
    topY,
    baseX,
    baseY,
    collider,
    reachTriggerX: cfg.reachTriggerX,
    reachLimitX,
    getHeroPos: cfg.getHeroPos,
    isVisible: cfg.isVisible,
    visible: false,
    open: 0,
    stem: IkChain.create({ segments: STEM_SEGMENTS, segLen: STEM_LEN / STEM_SEGMENTS, x: baseX, y: baseY }),
    stemRest: makePoints(STEM_SEGMENTS + 1),
    eyeStalk: IkChain.create({ segments: EYE_STALK_SEGMENTS, segLen: EYE_HIDDEN_EXT / EYE_STALK_SEGMENTS, x: baseX, y: baseY }),
    eyeRest: makePoints(EYE_STALK_SEGMENTS + 1),
    head: { x: baseX, y: baseY - STEM_LEN, axis: 0, eyeOut: 0 },
    buds: BUDS.map(bud => ({ ...bud, pts: makePoints(BUD_SEGMENTS + 1) })),
    tentacles: TENTACLES.map(t => createTentacle(t, baseX, baseY, reachLimitX)),
    colors: buildColors(k),
    lipPts: makePoints(LIP_PATH.length),
    hookPts: makePoints(HOOK_PATH.length),
    leafIdx: fanIndices(LEAF_SHAPE.length),
    leafLightIdx: fanIndices(LEAF_LIGHT_SHAPE.length),
    spatheIdx: fanIndices(SPATHE_SHAPE.length),
    throatIdx: fanIndices(THROAT_SHAPE.length),
    batch: PolyBatch.create()
  }
  k.add([
    k.z(ISLAND_Z),
    {
      draw() {
        drawIsland(inst)
      }
    }
  ])
  k.add([
    k.z(PLANT_Z),
    {
      update() {
        onUpdate(inst)
      },
      draw() {
        onDraw(inst)
      }
    }
  ])
  return inst
}

/**
 * Island centre X: the island starts under the left frame and runs out into
 * the lake from its left edge.
 * @param {number} lakeX1 - Lake left edge
 * @returns {number}
 */
export function islandWorldX(lakeX1) {
  return lakeX1 - ISLAND_OFFSCREEN_W + ISLAND_W * 0.5
}

/**
 * Minimum centipede head X while the island exists: the crawler stops in the
 * water just east of it so a rider can hop over, never wading onto it.
 * @param {Object|null} inst - Eye-flower inst
 * @returns {number|null}
 */
export function predatorMinX(inst) {
  if (!inst?.visible) return null
  return inst.x2 + PREDATOR_CLEAR_X
}

/**
 * True when the feet stand on the island top (lake checks must not drown him).
 * @param {Object|null} inst - Eye-flower inst
 * @param {number} footX - Feet world X
 * @param {number} footY - Feet world Y
 * @returns {boolean}
 */
export function isOnIsland(inst, footX, footY) {
  if (!inst?.visible) return false
  if (footX < inst.x1 - STAND_X_SLACK || footX > inst.x2 - ISLAND_SHOULDER_W + STAND_X_SLACK) return false
  return footY >= inst.topY - STAND_ABOVE && footY <= inst.topY + STAND_BELOW
}

/**
 * 0..1 whisper loudness for a hero at (x, y): grows near the flower head and
 * peaks when a reaching vine tip touches him.
 * @param {Object|null} inst - Eye-flower inst
 * @param {number} x - World X
 * @param {number} y - World Y
 * @returns {number}
 */
export function whisperProximity(inst, x, y) {
  if (!inst?.visible) return 0
  const d = Math.hypot(x - inst.head.x, y - inst.head.y)
  const head = Math.max(0, 1 - d / WHISPER_RADIUS) * HEAD_WHISPER_PEAK
  return inst.tentacles.reduce((loudest, tentacle) => Math.max(loudest, tentacleTouch(tentacle, x, y)), head)
}

//
// Shows / hides the island, then animates stem, eye, buds and tentacles.
//
function onUpdate(inst) {
  inst.visible = inst.isVisible()
  inst.collider.pos.x = inst.visible ? inst.x1 : COLLIDER_HIDE_POS
  inst.collider.pos.y = inst.visible ? inst.topY : COLLIDER_HIDE_POS
  if (!inst.visible) return
  const dt = inst.k.dt()
  const t = inst.k.time()
  const hero = inst.getHeroPos()
  const headDist = hero ? Math.hypot(hero.x - inst.head.x, hero.y - inst.head.y) : Infinity
  const openTarget = smoothstep(OPEN_FAR, OPEN_NEAR, headDist)
  inst.open = approach(inst.open, openTarget, OPEN_SPEED * dt)
  updateStem(inst, hero, t)
  updateEyeStalk(inst, hero)
  inst.buds.forEach(bud => updateBud(inst, bud, t))
  inst.tentacles.forEach(tentacle => updateTentacle(inst, tentacle, hero, t, dt))
}

function updateStem(inst, hero, t) {
  const bend = STEM_REST_BEND + Math.sin(t * STEM_SWAY_SPEED) * STEM_SWAY_AMP
  const segLen = inst.stem.segLen
  fillArc(inst.stemRest, inst.baseX, inst.baseY, -Math.PI / 2, bend, STEM_BEND_POW, segLen)
  const restTip = inst.stemRest[STEM_SEGMENTS]
  let tx = restTip.x
  let ty = restTip.y
  if (hero && inst.open > 0) {
    const dx = hero.x - restTip.x
    const dy = hero.y - restTip.y
    const d = Math.max(Math.hypot(dx, dy), 1)
    const lean = Math.min(d, STEM_LEAN_MAX)
    tx += (dx / d) * lean * inst.open
    ty += (dy / d) * lean * inst.open - STEM_OPEN_LIFT * inst.open
  }
  const chord = Math.hypot(tx - inst.baseX, ty - inst.baseY)
  const chordMax = STEM_LEN * STEM_CHORD_MAX_FRAC
  if (chord > chordMax) {
    tx = inst.baseX + (tx - inst.baseX) * chordMax / chord
    ty = inst.baseY + (ty - inst.baseY) * chordMax / chord
  }
  IkChain.solve(inst.stem, inst.baseX, inst.baseY, tx, ty, { rest: inst.stemRest, stiffness: STEM_STIFFNESS })
  const pts = inst.stem.pts
  const tip = pts[STEM_SEGMENTS]
  const prev = pts[STEM_SEGMENTS - 1]
  const stemAngle = Math.atan2(tip.y - prev.y, tip.x - prev.x)
  const heroAngle = hero ? Math.atan2(hero.y - tip.y, hero.x - tip.x) : stemAngle
  inst.head.x = tip.x
  inst.head.y = tip.y
  inst.head.axis = stemAngle + angleDelta(stemAngle, heroAngle) * inst.open * FLOWER_TURN
}

//
// Spadix bends from the spathe axis toward the hero as it rises out.
//
function updateEyeStalk(inst, hero) {
  const head = inst.head
  head.eyeOut = smoothstep(EYE_OUT_FROM, 1, inst.open)
  const ext = EYE_HIDDEN_EXT + (EYE_OUT_EXT - EYE_HIDDEN_EXT) * head.eyeOut
  const ox = head.x + Math.cos(head.axis) * FLOWER_LEN * EYE_ORIGIN_FRAC
  const oy = head.y + Math.sin(head.axis) * FLOWER_LEN * EYE_ORIGIN_FRAC
  const heroAngle = hero ? Math.atan2(hero.y - oy, hero.x - ox) : head.axis
  const aim = head.axis + angleDelta(head.axis, heroAngle) * head.eyeOut * EYE_TURN
  const segLen = ext / EYE_STALK_SEGMENTS
  IkChain.setSegLen(inst.eyeStalk, segLen)
  fillArc(inst.eyeRest, ox, oy, head.axis, 0, 1, segLen)
  IkChain.solve(inst.eyeStalk, ox, oy, ox + Math.cos(aim) * ext * EYE_STALK_SLACK, oy + Math.sin(aim) * ext * EYE_STALK_SLACK, {
    rest: inst.eyeRest,
    stiffness: EYE_STALK_STIFFNESS
  })
}

function updateBud(inst, bud, t) {
  const sway = Math.sin(t * BUD_SWAY_SPEED + bud.phase) * BUD_SWAY_AMP
  fillArc(bud.pts, inst.baseX + bud.dx, inst.baseY, bud.angle + sway, bud.bend, BUD_BEND_POW, bud.len / BUD_SEGMENTS)
}

//
// Grows the vine toward the hero while he is left of the big tree, otherwise
// curls it back into its resting arc. Tips never pass the tree.
//
function updateTentacle(inst, tentacle, hero, t, dt) {
  const rootX = inst.baseX + tentacle.dx
  const rootY = inst.baseY
  const act = hero ? smoothstep(inst.reachTriggerX + TENTACLE_TRIGGER_FADE, inst.reachTriggerX, hero.x) : 0
  tentacle.act = act
  let targetLen = tentacle.restLen
  if (hero && act > 0) {
    const heroDist = Math.hypot(hero.x - rootX, hero.y + tentacle.targetDy - rootY) - TENTACLE_HERO_GAP
    const reach = Math.min(tentacle.maxLen, Math.max(tentacle.restLen, heroDist))
    targetLen = tentacle.restLen + (reach - tentacle.restLen) * act
  }
  const speed = targetLen > tentacle.len ? TENTACLE_GROW_SPEED : TENTACLE_SHRINK_SPEED
  tentacle.len = approach(tentacle.len, targetLen, speed * dt)
  const segLen = tentacle.len / TENTACLE_SEGMENTS
  IkChain.setSegLen(tentacle.chain, segLen)
  const angle = tentacle.angle + Math.sin(t * TENTACLE_SWAY_SPEED + tentacle.phase) * TENTACLE_SWAY_AMP
  fillArc(tentacle.rest, rootX, rootY, angle, tentacle.curl, 1, segLen)
  const restTip = tentacle.rest[TENTACLE_SEGMENTS]
  const tx = hero ? Math.min(inst.reachLimitX, restTip.x + (hero.x - restTip.x) * act) : restTip.x
  const ty = hero ? restTip.y + (hero.y + tentacle.targetDy - restTip.y) * act : restTip.y
  IkChain.solve(tentacle.chain, rootX, rootY, tx, ty, {
    rest: tentacle.rest,
    stiffness: TENTACLE_STIFF_IDLE + (TENTACLE_STIFF_REACH - TENTACLE_STIFF_IDLE) * act
  })
  applyTentacleWave(inst, tentacle, t)
}

//
// Sideways travelling wave plus an upward bow on top of the IK pose (both
// grow while reaching); the drawn vine never dips into the water.
//
function applyTentacleWave(inst, tentacle, t) {
  const pts = tentacle.chain.pts
  const amp = TENTACLE_WAVE_AMP * (TENTACLE_WAVE_IDLE + (1 - TENTACLE_WAVE_IDLE) * tentacle.act)
  const arch = tentacle.len * TENTACLE_ARCH_FRAC * tentacle.arch * tentacle.act
  const maxY = inst.waterY - TENTACLE_WATER_CLEAR
  pts.forEach((p, i) => {
    const out = tentacle.draw[i]
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const d = Math.max(Math.hypot(dx, dy), 1e-6)
    const u = i / TENTACLE_SEGMENTS
    const off = Math.sin(t * TENTACLE_WAVE_SPEED + i * TENTACLE_WAVE_K + tentacle.phase) * amp * u
    out.x = p.x - (dy / d) * off
    out.y = Math.min(maxY, p.y + (dx / d) * off - Math.sin(Math.PI * u) * arch)
  })
}

//
// 0..1 closeness of a reaching vine tip to the hero (1 = touching him).
//
function tentacleTouch(tentacle, x, y) {
  if (!tentacle.act) return 0
  const tip = tentacle.draw[TENTACLE_SEGMENTS]
  const d = Math.hypot(tip.x - x, tip.y - (y + tentacle.targetDy))
  return tentacle.act * smoothstep(TOUCH_WHISPER_FAR, TOUCH_WHISPER_NEAR, d)
}

function onDraw(inst) {
  if (!inst.visible) return
  const t = inst.k.time()
  const { batch, colors: c } = inst
  inst.tentacles.forEach(tentacle => addTentacle(inst, tentacle))
  ROSETTE.forEach(leaf => {
    const angle = leaf.angle + Math.sin(t * ROSETTE_SWAY_SPEED + leaf.phase) * ROSETTE_SWAY_AMP
    addLeaf(inst, inst.baseX, inst.baseY, angle, leaf.len)
  })
  inst.buds.forEach(bud => addBud(inst, bud))
  addTaperedPath(batch, inst.stem.pts, STEM_W_BASE, STEM_W_TIP, c.contour, c.stem)
  addFlower(inst)
  PolyBatch.flush(batch, inst.k)
}

function addTentacle(inst, tentacle) {
  const c = inst.colors
  addTaperedPath(inst.batch, tentacle.draw, TENTACLE_W_BASE, TENTACLE_W_TIP, c.contour, c.vine)
  const pts = tentacle.draw
  for (let i = TENTACLE_LEAF_FROM; i < pts.length - 1; i += TENTACLE_LEAF_EVERY) {
    const segAngle = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x)
    const side = (i / TENTACLE_LEAF_EVERY) % 2 === 0 ? 1 : -1
    const len = TENTACLE_LEAF_LEN * (1 - TENTACLE_LEAF_TAPER * i / TENTACLE_SEGMENTS)
    addLeaf(inst, pts[i].x, pts[i].y, segAngle + side * TENTACLE_LEAF_ANGLE, len)
  }
}

//
// Thin stem ending in a furled spathe (no throat, no eye).
//
function addBud(inst, bud) {
  const c = inst.colors
  addTaperedPath(inst.batch, bud.pts, BUD_STEM_W_BASE, BUD_STEM_W_TIP, c.contour, c.stem)
  const tip = bud.pts[BUD_SEGMENTS]
  const prev = bud.pts[BUD_SEGMENTS - 1]
  const axis = Math.atan2(tip.y - prev.y, tip.x - prev.x)
  addSpathe(inst, tip.x, tip.y, axis, FLOWER_LEN * bud.size, FLOWER_HALF_W * bud.size * BUD_WIDTH, c.petalShade)
}

//
// Spathe back, pink throat, spadix + eye, then the rolled lower lip and the
// curled point over them. Closed, the narrow spathe hides the eye.
//
function addFlower(inst) {
  const { head, colors: c, batch } = inst
  const len = FLOWER_LEN
  const halfW = FLOWER_HALF_W * (FLOWER_CLOSED_W + (1 - FLOWER_CLOSED_W) * inst.open)
  const side = spatheSide(head.axis)
  const cos = Math.cos(head.axis)
  const sin = Math.sin(head.axis)
  addSpathe(inst, head.x, head.y, head.axis, len, halfW, c.petal)
  if (inst.open > FLOWER_THROAT_SHOW) {
    PolyBatch.addShape(batch, THROAT_SHAPE, inst.throatIdx, head.x, head.y, len, halfW * side, cos, sin, c.petalInner)
    addEye(inst)
  }
  mapPath(inst.lipPts, LIP_PATH, head.x, head.y, len, halfW * side, cos, sin)
  addTaperedPath(batch, inst.lipPts, LIP_W_BASE, LIP_W_TIP, c.contour, c.petalShade)
}

//
// Contoured spathe silhouette plus its curled point. The long lip always
// faces up, whichever way the axis points.
//
function addSpathe(inst, x, y, axis, len, halfW, color) {
  const { colors: c, batch } = inst
  const side = spatheSide(axis)
  const cos = Math.cos(axis)
  const sin = Math.sin(axis)
  PolyBatch.addShape(batch, SPATHE_SHAPE, inst.spatheIdx, x - cos * CONTOUR_PAD, y - sin * CONTOUR_PAD,
    len + CONTOUR_PAD * 2, (halfW + CONTOUR_PAD) * side, cos, sin, c.contour)
  PolyBatch.addShape(batch, SPATHE_SHAPE, inst.spatheIdx, x, y, len, halfW * side, cos, sin, color)
  mapPath(inst.hookPts, HOOK_PATH, x, y, len, halfW * side, cos, sin)
  addTaperedPath(batch, inst.hookPts, HOOK_W_BASE, HOOK_W_TIP, c.contour, color)
}

function addEye(inst) {
  const c = inst.colors
  const batch = inst.batch
  const pts = inst.eyeStalk.pts
  addTaperedPath(batch, pts, EYE_STALK_W, EYE_STALK_W, c.spadixDark, c.spadix)
  const eye = pts[pts.length - 1]
  const hero = inst.getHeroPos()
  const lookAngle = hero ? Math.atan2(hero.y - eye.y, hero.x - eye.x) : inst.head.axis
  const lookX = eye.x + Math.cos(lookAngle) * EYE_R * EYE_LOOK_FRAC
  const lookY = eye.y + Math.sin(lookAngle) * EYE_R * EYE_LOOK_FRAC
  PolyBatch.addDisc(batch, eye.x, eye.y, EYE_R + EYE_CONTOUR_W, c.contour)
  PolyBatch.addDisc(batch, eye.x, eye.y, EYE_R, c.sclera)
  PolyBatch.addDisc(batch, lookX, lookY, EYE_R * EYE_IRIS_FRAC, c.iris)
  PolyBatch.addDisc(batch, lookX, lookY, EYE_R * EYE_PUPIL_FRAC, c.pupil)
  PolyBatch.addDisc(batch, lookX - EYE_R * EYE_GLINT_FRAC, lookY - EYE_R * EYE_GLINT_FRAC, EYE_R * EYE_GLINT_FRAC, c.sclera)
}

//
// Lanceolate leaf: contour, body, then a lit upper half.
//
function addLeaf(inst, x, y, angle, len) {
  const { colors: c, batch } = inst
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const w = len * LEAF_WIDTH_FRAC
  PolyBatch.addShape(batch, LEAF_SHAPE, inst.leafIdx, x - cos * CONTOUR_PAD * 0.5, y - sin * CONTOUR_PAD * 0.5,
    len + CONTOUR_PAD, w + CONTOUR_PAD * 2, cos, sin, c.contour)
  PolyBatch.addShape(batch, LEAF_SHAPE, inst.leafIdx, x, y, len, w, cos, sin, c.leaf)
  PolyBatch.addShape(batch, LEAF_LIGHT_SHAPE, inst.leafLightIdx, x, y, len, w, cos, sin, c.leafLight)
}

//
// Round-jointed tapered polyline: a contour pass under a fill pass.
//
function addTaperedPath(batch, pts, wBase, wTip, contour, fill) {
  addTaperedPass(batch, pts, wBase + CONTOUR_PAD, wTip + CONTOUR_PAD, contour)
  addTaperedPass(batch, pts, wBase, wTip, fill)
}

function addTaperedPass(batch, pts, wBase, wTip, color) {
  const last = pts.length - 1
  for (let i = 0; i < last; i++) {
    const w = wBase + (wTip - wBase) * (i / last)
    PolyBatch.addLine(batch, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, w, color)
    PolyBatch.addDisc(batch, pts[i + 1].x, pts[i + 1].y, w * 0.5, color)
  }
}

//
// Places a local (u, v) path into world points, same transform as addShape.
//
function mapPath(out, path, x, y, sx, sy, cos, sin) {
  path.forEach(([u, v], i) => {
    const px = u * sx
    const py = v * sy
    out[i].x = x + px * cos - py * sin
    out[i].y = y + px * sin + py * cos
  })
}

//
// Negative v is "up" for an axis pointing right; mirror it for a left axis.
//
function spatheSide(axis) {
  return Math.cos(axis) >= 0 ? 1 : -1
}

function drawIsland(inst) {
  if (!inst.visible) return
  const baked = ensureStaticDecorSprite(inst.k, inst, ISLAND_BAKE_SLOT, ISLAND_BAKE_KEY, islandBounds(inst),
    ctx => paintIsland(ctx, inst), ISLAND_BAKE_SEED)
  drawStaticDecorSprite(inst.k, baked)
}

function islandBounds(inst) {
  return {
    x1: inst.x1 - ISLAND_BAKE_PAD,
    y1: inst.topY - ISLAND_DECOR_UP,
    x2: inst.x2 + ISLAND_BAKE_PAD,
    y2: inst.waterY + ISLAND_BELOW_WATER + ISLAND_BAKE_PAD
  }
}

//
// Earth body with strata and a contour, then the forest-floor surface on
// its flat top: rim, stones, spike bushes, tufts, ferns and mushrooms.
//
function paintIsland(ctx, inst) {
  const rng = createSeededRandom(ISLAND_BAKE_SEED)
  const colors = forestFloorPainterColors()
  paintIslandBody(ctx, inst, rng)
  const walkX2 = inst.x2 - ISLAND_SHOULDER_W
  drawGroundRimToCanvas(ctx, { x1: inst.x1, x2: walkX2, floorY: inst.topY, rng, colors: colors.rim })
  const lakeX1 = inst.x1 + ISLAND_OFFSCREEN_W
  ISLAND_STONES.forEach(stone => paintIslandStone(ctx, lakeX1 + stone.dx, inst.topY, stone, colors.hill))
  ISLAND_PLANTS.filter(p => p.kind === KIND.PLUME).forEach(p => {
    drawFeatherPlumeToCanvas(ctx, { x: lakeX1 + p.dx, baseY: inst.topY, height: p.size, rng: createSeededRandom(nextSeed(rng)), colors: colors.plume })
  })
  for (let x = inst.x1 + ISLAND_TUFT_STEP; x < walkX2; x += ISLAND_TUFT_STEP) {
    rng() < ISLAND_TUFT_CHANCE && drawGrassTuftToCanvas(ctx, { x, baseY: inst.topY, rng, colors: colors.tuft })
  }
  ISLAND_PLANTS.filter(p => p.kind === KIND.FERN).forEach(p => {
    drawFernToCanvas(ctx, { x: lakeX1 + p.dx, baseY: inst.topY, size: p.size, rng: createSeededRandom(nextSeed(rng)), colors: colors.fern })
  })
  ISLAND_PLANTS.filter(p => p.kind === KIND.MUSHROOMS).forEach(p => {
    drawSmallMushroomGroupToCanvas(ctx, { x: lakeX1 + p.dx, baseY: inst.topY, rng: createSeededRandom(nextSeed(rng)), colors: colors.mushroom })
  })
}

//
// Flat top, rounded right shoulder into the water, ragged bottom (hidden
// under the lake). The left end is cut square — it sits under the frame.
//
function paintIslandBody(ctx, inst, rng) {
  const pal = GLOW_PAL.glowEyeFlower
  const { x1, x2, topY, waterY } = inst
  const walkX2 = x2 - ISLAND_SHOULDER_W
  const bottomY = waterY + ISLAND_BELOW_WATER
  ctx.beginPath()
  ctx.moveTo(x1, topY)
  for (let x = x1 + ISLAND_TOP_STEP; x < walkX2; x += ISLAND_TOP_STEP) ctx.lineTo(x, topY + (rng() - 0.5) * ISLAND_TOP_JITTER * 2)
  ctx.lineTo(walkX2, topY)
  ctx.quadraticCurveTo(x2, topY, x2, topY + ISLAND_SHOULDER_DROP)
  ctx.lineTo(x2 - ISLAND_BOTTOM_INSET, bottomY)
  for (let x = x2 - ISLAND_BOTTOM_INSET - ISLAND_BOTTOM_STEP; x > x1; x -= ISLAND_BOTTOM_STEP) ctx.lineTo(x, bottomY - rng() * ISLAND_BOTTOM_JITTER)
  ctx.lineTo(x1, bottomY)
  ctx.closePath()
  ctx.fillStyle = pal.soil
  ctx.fill()
  ctx.save()
  ctx.clip()
  ctx.fillStyle = pal.soilDark
  const depth = bottomY - topY
  for (let i = 0; i < ISLAND_STRATA_COUNT; i++) {
    const y = topY + (i + 1) * depth / (ISLAND_STRATA_COUNT + 1)
    ctx.fillRect(x1, Math.round(y + (rng() - 0.5) * ISLAND_STRATA_JITTER), x2 - x1, ISLAND_STRATA_H)
  }
  ctx.restore()
  ctx.lineWidth = ISLAND_CONTOUR_W
  ctx.strokeStyle = pal.contour
  ctx.stroke()
}

//
// Half-sunk stone: contour, body, lit upper-left face.
//
function paintIslandStone(ctx, x, groundY, stone, colors) {
  const y = groundY + stone.ry * ISLAND_STONE_SINK
  ctx.beginPath()
  ctx.ellipse(x, y, stone.rx, stone.ry, 0, Math.PI, Math.PI * 2)
  ctx.closePath()
  ctx.fillStyle = colors.stone
  ctx.fill()
  ctx.lineWidth = ISLAND_CONTOUR_W
  ctx.strokeStyle = colors.contour
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(x - stone.rx * 0.25, y - stone.ry * 0.35, stone.rx * ISLAND_STONE_LIGHT_FRAC, stone.ry * ISLAND_STONE_LIGHT_FRAC * 0.6, 0, 0, Math.PI * 2)
  ctx.fillStyle = colors.stoneLight
  ctx.fill()
}

function createTentacle(t, baseX, baseY, reachLimitX) {
  const rootX = baseX + t.dx
  return {
    ...t,
    len: t.restLen,
    maxLen: Math.max(t.restLen, (reachLimitX - rootX) * TENTACLE_MAX_LEN_SLACK),
    act: 0,
    chain: IkChain.create({ segments: TENTACLE_SEGMENTS, segLen: t.restLen / TENTACLE_SEGMENTS, x: rootX, y: baseY, angle: t.angle }),
    rest: makePoints(TENTACLE_SEGMENTS + 1),
    draw: makePoints(TENTACLE_SEGMENTS + 1)
  }
}

//
// Fills `out` with an arc of equal segments whose heading turns by `bend`
// from root to tip (eased by `pow` so the curl gathers near the tip).
//
function fillArc(out, x, y, angle, bend, pow, segLen) {
  const last = out.length - 1
  out[0].x = x
  out[0].y = y
  for (let i = 1; i <= last; i++) {
    const a = angle + bend * Math.pow((i - 0.5) / last, pow)
    out[i].x = out[i - 1].x + Math.cos(a) * segLen
    out[i].y = out[i - 1].y + Math.sin(a) * segLen
  }
}

function buildColors(k) {
  const pal = GLOW_PAL.glowEyeFlower
  const keys = ['contour', 'petal', 'petalShade', 'petalInner', 'spadix', 'spadixDark', 'sclera', 'iris', 'pupil', 'stem', 'vine', 'leaf', 'leafLight']
  return Object.fromEntries(keys.map(key => [key, kaplayRgb(k, pal[key])]))
}

function kaplayRgb(k, hex) {
  const c = glowRgb(hex)
  return k.rgb(c.r, c.g, c.b)
}

function fanIndices(count) {
  const out = []
  for (let i = 1; i < count - 1; i++) out.push(0, i, i + 1)
  return out
}

function makePoints(count) {
  return Array.from({ length: count }, () => ({ x: 0, y: 0 }))
}

function smoothstep(edge0, edge1, v) {
  const u = Math.min(1, Math.max(0, (v - edge0) / (edge1 - edge0)))
  return u * u * (3 - 2 * u)
}

function approach(v, target, step) {
  return v < target ? Math.min(target, v + step) : Math.max(target, v - step)
}

function angleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from))
}
