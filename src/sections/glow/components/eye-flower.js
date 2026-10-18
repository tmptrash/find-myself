import { CFG } from '../../../cfg.js'
import * as IkChain from '../../../utils/ik-chain.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { createSeededRandom, nextSeed } from '../../../utils/seeded-random.js'
import { drawFernToCanvas } from '../../../utils/draw-fern.js'
import { drawFeatherPlumeToCanvas } from '../../../utils/draw-feather-plume.js'
import { drawGrassTuftToCanvas } from '../../../utils/draw-grass-tuft.js'
import { drawMossyHillToCanvas, mossyHillBounds, mossyHillTopY } from '../../../utils/draw-mossy-hill.js'
import { drawSmallMushroomGroupToCanvas } from '../../../utils/draw-small-mushroom.js'
import { GLOW_PAL, glowRgb } from '../utils/glow-palette.js'
import { drawStaticDecorSprite, ensureStaticDecorSprite } from '../utils/glow-static-bake.js'
import { forestFloorPainterColors } from './forest-floor.js'

//
// Hill island in the left lake carrying a calla bush: a cream spathe whose
// spadix holds a watching eye, a few closed buds and long grass blades. The
// closer the hero comes, the harder the whole bush bends and stretches to him.
//
// The island runs off the left edge of the playfield (its left part sits under
// the frame) and is the same mossy boulder hill as the one right of the tree,
// mirrored: a flat crest under the frame, then a long slope that slides into
// the lake instead of a cut bank.
//
const ISLAND_W = 360
const ISLAND_OFFSCREEN_W = 80
const ISLAND_ABOVE_WATER = 28
const ISLAND_BELOW_WATER = 30
const ISLAND_PLATEAU_FRAC = 0.58
//
// Walkable span ends once the slope has dropped this far below the crest, so
// the hero never hovers over the descending bank.
//
const ISLAND_WALK_DROP = 4
const ISLAND_SAMPLE_STEP = 2
const ISLAND_BAKE_PAD = 4
const ISLAND_DECOR_UP = 96
const ISLAND_BAKE_SEED = 0x65796566
const ISLAND_BAKE_SLOT = 'island'
const ISLAND_BAKE_KEY = 'v7'
//
// Moss, tufts and plants stop above the lake surface; submerged stones may go lower.
//
const ISLAND_GREENERY_ABOVE_WATER = 12
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
// Whole bush leans toward the hero as he approaches (0 = standing like an
// ordinary plant, 1 = stretched almost to him). Distances are from the plant
// root to the hero; the lean eases in over time so it never snaps.
//
const LEAN_FAR = 1300
const LEAN_NEAR = 600
const LEAN_SPEED = 0.42
//
// Lagged aim point the stem and blades chase (hero position snaps instantly
// without this — the flower would move in lockstep with him).
//
const LEAN_HERO_LAG_SPEED = 105
//
// Stretched blades and the stem bow upward over the water: each is a circular
// arc whose chord points at its target and whose half-turn is this angle.
//
const LEAN_ARC_HALF = 0.42
const LEAN_MIN_LEN_FRAC = 0.6
//
// Nothing stretches past this gap short of the big tree.
//
const REACH_TREE_GAP = 70
//
// Stem: an arc drooping toward the lake at rest; leaning, it stretches so the
// flower head stops just short of the hero (spathe + eye + a small gap).
//
const STEM_SEGMENTS = 14
const STEM_LEN = 156
const STEM_REST_BEND = 2
const STEM_BEND_POW = 1.6
const STEM_SWAY_AMP = 0.08
const STEM_SWAY_SPEED = 0.9
const STEM_HERO_GAP = 104
//
// Main calla stem — at full lean its tip stops at this fraction of the lake
// width (blades may reach farther; whisper still uses hero-to-head distance).
//
const STEM_LAKE_REACH_FRAC = 0.5
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
// Buds turn only part of the way toward the hero.
//
const BUD_LEAN_FOLLOW = 0.3
//
// Long grass-like blades of the bush. `follow` is how far a blade turns toward
// the hero at full lean (back blades on the far side barely move), `reach` the
// share of the root-to-hero distance it stretches over.
//
const BLADES = [
  { dx: -14, angle: -2.55, len: 70, w: 9, phase: 0.4, follow: 0.25, reach: 0.18 },
  { dx: -9, angle: -2.2, len: 92, w: 10, phase: 1.3, follow: 0.45, reach: 0.3 },
  { dx: -5, angle: -1.9, len: 64, w: 8, phase: 2.2, follow: 0.6, reach: 0.38 },
  { dx: -2, angle: -1.65, len: 104, w: 10, phase: 0.2, follow: 0.75, reach: 0.5 },
  { dx: 2, angle: -1.4, len: 96, w: 11, phase: 0.9, follow: 0.9, reach: 0.62 },
  { dx: 5, angle: -1.15, len: 84, w: 10, phase: 2.8, follow: 1, reach: 0.72 },
  { dx: 8, angle: -0.9, len: 76, w: 9, phase: 1.9, follow: 1, reach: 0.58 },
  { dx: 11, angle: -0.6, len: 58, w: 8, phase: 3.4, follow: 0.85, reach: 0.42 }
]
const BLADE_SEGMENTS = 14
const BLADE_REST_BEND = 0.35
const BLADE_SWAY_AMP = 0.05
const BLADE_SWAY_SPEED = 1.3
//
// Blade width profile: narrow at the root, widest near 40 %, pointed tip.
//
const BLADE_ROOT_PHASE = 0.15
const BLADE_TIP_PHASE = 0.98
const BLADE_MIDRIB_FRAC = 0.35
//
// Whisper grows as the hero approaches the flower head (loudest at closest range).
//
const WHISPER_FAR = 1400
const WHISPER_NEAR = 450

/**
 * Creates the island, its walkable collider and the eye-flower plant.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.x - Island centre X (see islandWorldX)
 * @param {number} cfg.waterY - Lake surface Y at rest
 * @param {number} cfg.lakeX1 - Lake left edge (world X)
 * @param {number} cfg.lakeX2 - Lake right edge (world X)
 * @param {number} cfg.reachTriggerX - Big tree X: stretched blades and the flower head never pass just short of it
 * @param {function(): ({x: number, y: number}|null)} cfg.getHeroPos - Hero body centre
 * @param {function(): boolean} cfg.isVisible - True while the island exists (colour world + lake)
 * @returns {Object} Eye-flower inst
 */
export function create(cfg) {
  const { k, x, waterY } = cfg
  const x1 = x - ISLAND_W * 0.5
  const x2 = x1 + ISLAND_W
  const topY = waterY - ISLAND_ABOVE_WATER
  const hill = {
    x1,
    x2,
    floorY: waterY + ISLAND_BELOW_WATER,
    height: ISLAND_ABOVE_WATER + ISLAND_BELOW_WATER,
    peakLeft: true,
    plateau: ISLAND_PLATEAU_FRAC
  }
  const walkX2 = hillXWhereTopReaches(hill, topY + ISLAND_WALK_DROP)
  const baseX = x1 + PLANT_BASE_DX
  const baseY = mossyHillTopY(hill, baseX) + PLANT_BASE_SINK
  const reachLimitX = cfg.reachTriggerX - REACH_TREE_GAP
  const lakeSpan = cfg.lakeX2 - cfg.lakeX1
  const stemReachMaxX = cfg.lakeX1 + lakeSpan * STEM_LAKE_REACH_FRAC
  const collider = k.add([
    k.rect(walkX2 - x1, COLLIDER_H),
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
    hill,
    walkX2,
    shoreX: hillXWhereTopReaches(hill, waterY),
    baseX,
    baseY,
    collider,
    reachLimitX,
    stemReachMaxX,
    getHeroPos: cfg.getHeroPos,
    isVisible: cfg.isVisible,
    visible: false,
    open: 0,
    lean: 0,
    leanHero: { x: baseX, y: baseY },
    stemPts: makePoints(STEM_SEGMENTS + 1),
    eyeStalk: IkChain.create({ segments: EYE_STALK_SEGMENTS, segLen: EYE_HIDDEN_EXT / EYE_STALK_SEGMENTS, x: baseX, y: baseY }),
    eyeRest: makePoints(EYE_STALK_SEGMENTS + 1),
    head: { x: baseX, y: baseY - STEM_LEN, axis: 0, eyeOut: 0 },
    buds: BUDS.map(bud => ({ ...bud, pts: makePoints(BUD_SEGMENTS + 1) })),
    blades: BLADES.map(blade => ({ ...blade, pts: makePoints(BLADE_SEGMENTS + 1) })),
    colors: buildColors(k),
    lipPts: makePoints(LIP_PATH.length),
    hookPts: makePoints(HOOK_PATH.length),
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
  return inst.shoreX + PREDATOR_CLEAR_X
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
  if (footX < inst.x1 - STAND_X_SLACK || footX > inst.walkX2 + STAND_X_SLACK) return false
  return footY >= inst.topY - STAND_ABOVE && footY <= inst.topY + STAND_BELOW
}

/**
 * 0..1 whisper loudness for a hero at (x, y): rises as he nears the flower
 * head and peaks at the closest approach (same far/near band as before).
 * @param {Object|null} inst - Eye-flower inst
 * @param {number} x - World X
 * @param {number} y - World Y
 * @returns {number}
 */
export function whisperProximity(inst, x, y) {
  if (!inst?.visible) return 0
  const head = inst.head
  return smoothstep(WHISPER_FAR, WHISPER_NEAR, Math.hypot(x - head.x, y - head.y))
}

//
// Shows / hides the island, then leans the bush and animates stem, eye and buds.
//
function onUpdate(inst) {
  inst.visible = inst.isVisible()
  inst.collider.pos.x = inst.visible ? inst.x1 : COLLIDER_HIDE_POS
  inst.collider.pos.y = inst.visible ? inst.topY : COLLIDER_HIDE_POS
  if (!inst.visible) return
  const dt = inst.k.dt()
  const t = inst.k.time()
  const hero = inst.getHeroPos()
  const heroDist = hero ? Math.hypot(hero.x - inst.baseX, hero.y - inst.baseY) : Infinity
  inst.lean = approach(inst.lean, smoothstep(LEAN_FAR, LEAN_NEAR, heroDist), LEAN_SPEED * dt)
  tickLeanHeroAim(inst, hero, dt)
  const headDist = hero ? Math.hypot(hero.x - inst.head.x, hero.y - inst.head.y) : Infinity
  inst.open = approach(inst.open, smoothstep(OPEN_FAR, OPEN_NEAR, headDist), OPEN_SPEED * dt)
  updateStem(inst, hero, t)
  updateEyeStalk(inst, hero)
  inst.buds.forEach(bud => updateBud(inst, bud, hero, t))
  inst.blades.forEach(blade => updateBlade(inst, blade, hero, t))
}

//
// Drooping rest arc blended with an upward-bowed arc whose tip stops just
// short of the hero, so the flower head reaches out to him.
//
function updateStem(inst, hero, t) {
  const sway = Math.sin(t * STEM_SWAY_SPEED) * STEM_SWAY_AMP
  const rest = { angle: -Math.PI / 2, bend: STEM_REST_BEND + sway, len: STEM_LEN, pow: STEM_BEND_POW }
  const pose = blendArc(rest, leanArc(inst, inst.leanHero, inst.baseX, inst.baseY, 1, STEM_HERO_GAP, STEM_LEN * LEAN_MIN_LEN_FRAC), inst.lean)
  fillArc(inst.stemPts, inst.baseX, inst.baseY, pose.angle, pose.bend, pose.pow, pose.len / STEM_SEGMENTS)
  const pts = inst.stemPts
  const tip = pts[STEM_SEGMENTS]
  const prev = pts[STEM_SEGMENTS - 1]
  const stemAngle = Math.atan2(tip.y - prev.y, tip.x - prev.x)
  const aim = inst.leanHero
  const heroAngle = Math.atan2(aim.y - tip.y, aim.x - tip.x)
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

//
// Calla stem aim — toward the hero but never past the middle of the lake.
//
function stemLeanHeroTarget(inst, hero) {
  if (!hero) return null
  const maxX = inst.stemReachMaxX
  if (hero.x <= maxX) return hero
  const dx = hero.x - inst.baseX
  if (dx <= 1) return hero
  const t = (maxX - inst.baseX) / dx
  return { x: maxX, y: inst.baseY + (hero.y - inst.baseY) * t }
}
//
// Eases the lean aim toward the hero (capped stem target) or back to the root.
//
function tickLeanHeroAim(inst, hero, dt) {
  const step = LEAN_HERO_LAG_SPEED * dt
  let tx = inst.baseX
  let ty = inst.baseY
  if (hero) {
    const aim = stemLeanHeroTarget(inst, hero)
    tx = aim.x
    ty = aim.y
  }
  const lag = inst.leanHero
  lag.x = approach(lag.x, tx, step)
  lag.y = approach(lag.y, ty, step)
}
function updateBud(inst, bud, hero, t) {
  const rootX = inst.baseX + bud.dx
  const sway = Math.sin(t * BUD_SWAY_SPEED + bud.phase) * BUD_SWAY_AMP
  const aim = inst.leanHero
  const heroAngle = Math.atan2(aim.y - inst.baseY, aim.x - rootX)
  const angle = bud.angle + sway + angleDelta(bud.angle, heroAngle) * inst.lean * BUD_LEAN_FOLLOW
  fillArc(bud.pts, rootX, inst.baseY, angle, bud.bend, BUD_BEND_POW, bud.len / BUD_SEGMENTS)
}

//
// Grass blade: a slightly curved rest pose blended toward a bowed arc that
// stretches over its share of the way to the hero.
//
function updateBlade(inst, blade, hero, t) {
  const rootX = inst.baseX + blade.dx
  const sway = Math.sin(t * BLADE_SWAY_SPEED + blade.phase) * BLADE_SWAY_AMP
  const rest = { angle: blade.angle + sway, bend: BLADE_REST_BEND * Math.sign(Math.cos(blade.angle)), len: blade.len, pow: 1 }
  const pose = blendArc(rest, leanArc(inst, inst.leanHero, rootX, inst.baseY, blade.reach, 0, blade.len * LEAN_MIN_LEN_FRAC), inst.lean * blade.follow)
  fillArc(blade.pts, rootX, inst.baseY, pose.angle, pose.bend, pose.pow, pose.len / BLADE_SEGMENTS)
}

//
// Arc from the root toward the hero, ending `share` of the way there minus
// `gap` (never past the big tree, never shorter than `minReach`). The bow
// always rises over the chord.
//
function leanArc(inst, hero, rootX, rootY, share, gap, minReach) {
  if (!hero) return null
  const dx = hero.x - rootX
  const dy = hero.y - rootY
  const dist = Math.max(Math.hypot(dx, dy), 1)
  let reach = dist * share - gap
  if (dx > 0) reach = Math.min(reach, (inst.reachLimitX - rootX) * dist / dx)
  reach = Math.max(minReach, reach)
  const aim = Math.atan2(dy, dx)
  const side = Math.cos(aim) >= 0 ? 1 : -1
  return {
    angle: aim - side * LEAN_ARC_HALF,
    bend: side * LEAN_ARC_HALF * 2,
    len: reach * LEAN_ARC_HALF / Math.sin(LEAN_ARC_HALF),
    pow: 1
  }
}

function blendArc(rest, lean, amount) {
  if (!lean || amount <= 0) return rest
  return {
    angle: rest.angle + angleDelta(rest.angle, lean.angle) * amount,
    bend: rest.bend + (lean.bend - rest.bend) * amount,
    len: rest.len + (lean.len - rest.len) * amount,
    pow: rest.pow + (lean.pow - rest.pow) * amount
  }
}

function onDraw(inst) {
  if (!inst.visible) return
  const { batch, colors: c } = inst
  inst.buds.forEach(bud => addBud(inst, bud))
  inst.blades.forEach(blade => addBlade(inst, blade))
  addTaperedPath(batch, inst.stemPts, STEM_W_BASE, STEM_W_TIP, c.contour, c.stem)
  addFlower(inst)
  PolyBatch.flush(batch, inst.k)
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
// Blade with a leaf-shaped width profile: contour, body, then a lit midrib.
//
function addBlade(inst, blade) {
  const { colors: c, batch } = inst
  addBladePass(batch, blade.pts, blade.w + CONTOUR_PAD, c.contour)
  addBladePass(batch, blade.pts, blade.w, c.leaf)
  addBladePass(batch, blade.pts, blade.w * BLADE_MIDRIB_FRAC, c.leafLight)
}

function addBladePass(batch, pts, wMax, color) {
  const last = pts.length - 1
  for (let i = 0; i < last; i++) {
    const u = (i + 0.5) / last
    const w = wMax * Math.sin(Math.PI * (BLADE_ROOT_PHASE + (BLADE_TIP_PHASE - BLADE_ROOT_PHASE) * u))
    PolyBatch.addLine(batch, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, w, color)
    PolyBatch.addDisc(batch, pts[i + 1].x, pts[i + 1].y, w * 0.5, color)
  }
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
  const hillBounds = mossyHillBounds(inst.hill, ISLAND_DECOR_UP)
  return {
    x1: hillBounds.x1 - ISLAND_BAKE_PAD,
    y1: hillBounds.y1,
    x2: hillBounds.x2 + ISLAND_BAKE_PAD,
    y2: hillBounds.y2 + ISLAND_BAKE_PAD
  }
}

//
// Mossy boulder hill (same painter and colours as the hill right of the tree),
// then plumes, tufts, ferns and mushrooms rooted on its top line.
//
function paintIsland(ctx, inst) {
  const rng = createSeededRandom(ISLAND_BAKE_SEED)
  const colors = forestFloorPainterColors()
  const greeneryMaxY = inst.waterY - ISLAND_GREENERY_ABOVE_WATER
  const rootY = x => mossyHillTopY(inst.hill, x)
  const dryRootY = x => {
    const y = rootY(x)
    return y < greeneryMaxY ? y : null
  }
  drawMossyHillToCanvas(ctx, {
    hill: inst.hill,
    rng,
    colors: colors.hill,
    greeneryMaxY
  })
  const lakeX1 = inst.x1 + ISLAND_OFFSCREEN_W
  ISLAND_PLANTS.filter(p => p.kind === KIND.PLUME).forEach(p => {
    const baseY = dryRootY(lakeX1 + p.dx)
    baseY != null &&
      drawFeatherPlumeToCanvas(ctx, { x: lakeX1 + p.dx, baseY, height: p.size, rng: createSeededRandom(nextSeed(rng)), colors: colors.plume })
  })
  for (let x = inst.x1 + ISLAND_TUFT_STEP; x < inst.walkX2; x += ISLAND_TUFT_STEP) {
    const baseY = dryRootY(x)
    baseY != null && rng() < ISLAND_TUFT_CHANCE &&
      drawGrassTuftToCanvas(ctx, { x, baseY, rng, colors: colors.tuft })
  }
  ISLAND_PLANTS.filter(p => p.kind === KIND.FERN).forEach(p => {
    const baseY = dryRootY(lakeX1 + p.dx)
    baseY != null &&
      drawFernToCanvas(ctx, { x: lakeX1 + p.dx, baseY, size: p.size, rng: createSeededRandom(nextSeed(rng)), colors: colors.fern })
  })
  ISLAND_PLANTS.filter(p => p.kind === KIND.MUSHROOMS).forEach(p => {
    const baseY = dryRootY(lakeX1 + p.dx)
    baseY != null &&
      drawSmallMushroomGroupToCanvas(ctx, { x: lakeX1 + p.dx, baseY, rng: createSeededRandom(nextSeed(rng)), colors: colors.mushroom })
  })
}

//
// First X (walking right from the crest) where the hill top sinks to `y`.
//
function hillXWhereTopReaches(hill, y) {
  for (let x = hill.x1; x <= hill.x2; x += ISLAND_SAMPLE_STEP) {
    if (mossyHillTopY(hill, x) >= y) return x
  }
  return hill.x2
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
  const keys = ['contour', 'petal', 'petalShade', 'petalInner', 'spadix', 'spadixDark', 'sclera', 'iris', 'pupil', 'stem', 'leaf', 'leafLight']
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
