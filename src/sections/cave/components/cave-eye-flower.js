import { CFG } from '../../../cfg.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { closeness, creatureColors, eyeVeins, addVeinedEye, addStalk, addThorns, addBlade, fillArc, makePoints } from '../utils/cave-creature-paint.js'
//
// The hostile eye-flower of the cave's upper ledge: the forest's doll's-eyes
// bush grown mean. A blood-red thorny stalk rises out of a fan of long
// blades and branches into short thorny stems, each holding a bloodshot
// eye-berry; cream flowers with red hearts sit between them. Every eye
// watches the hero once he is within WATCH_REACH; the closer he comes the
// tenser it gets (TENSE_FAR → TENSE_NEAR, eased at TENSE_EASE per second):
// the stalk leans out at him (smoothly, toward whichever side he is on)
// and sways faster, and the pupils shrink to points. Drawn live in one polygon batch, just behind the hero.
//
const Z = CFG.visual.zIndex.player - 0.5
const WATCH_REACH = 900
const TENSE_FAR = 700
const TENSE_NEAR = 240
const TENSE_EASE = 1.5
//
// Main stalk: segments, length, widths, contour, lit line; at rest it
// stands up bending a little toward the left (where the hero comes from),
// swaying STEM_SWAY rad at STEM_SWAY_SPEED; tense, it leans up to LEAN_MAX
// rad toward the hero and sways TENSE_SWAY_SPEED times as fast. The lean
// turns side gradually across LEAN_SIDE_SOFT px either side of the stalk.
//
const STEM_SEGMENTS = 14
const STEM_LEN = 270
const STEM_W_BASE = 11
const STEM_W_TIP = 5
const CONTOUR_PAD = 2.4
const STEM_LIGHT_FRAC = 0.35
const STEM_REST_ANGLE = -Math.PI / 2 - 0.12
const STEM_REST_BEND = -0.9
const STEM_BEND_POW = 1.6
const STEM_SWAY = 0.07
const STEM_SWAY_SPEED = 0.9
const TENSE_SWAY_SPEED = 2.2
const LEAN_MAX = 0.45
const LEAN_SIDE_SOFT = 160
//
// Thorns: on the stalk (between its from / to shares), on the eye stems.
//
const STALK_THORNS = { step: 17, len: 13, tipLen: 7, from: 0.06, to: 0.95 }
const STEM_THORNS = { step: 11, len: 6, tipLen: 4, from: 0.15, to: 0.8 }
//
// Eye-berries on short stems branching off the upper stalk (the forest
// bush's layout, SIZE times bigger): `at` where the stem leaves the stalk
// (0 root, 1 tip), `turn` its angle off the stalk heading, `len` the stem
// length, `r` the eye radius. Stems curl up toward the eye and sway on
// their own. Blades and flowers are SIZE times bigger too.
//
const SIZE = 1.35
const BERRIES = [
  { at: 1, turn: -0.3, len: 32, r: 13, phase: 0.3 },
  { at: 1, turn: 0.45, len: 25, r: 11, phase: 1.1 },
  { at: 0.95, turn: -1, len: 47, r: 12, phase: 2.4 },
  { at: 0.91, turn: 1.05, len: 50, r: 12.5, phase: 0.8 },
  { at: 0.86, turn: -0.6, len: 23, r: 7.5, phase: 1.9 },
  { at: 0.82, turn: 0.7, len: 28, r: 9, phase: 2.9 },
  { at: 0.77, turn: -1.15, len: 40, r: 10.5, phase: 0.5 },
  { at: 0.72, turn: 1.1, len: 23, r: 7, phase: 1.5 },
  { at: 0.67, turn: -0.8, len: 28, r: 8, phase: 2.2 },
  { at: 0.62, turn: 0.95, len: 33, r: 9, phase: 3.1 },
  { at: 0.56, turn: -1, len: 19, r: 6.5, phase: 0.1 },
  { at: 0.52, turn: 0.85, len: 21, r: 7, phase: 1.7 }
]
const BERRY_STEM_SEGMENTS = 4
const BERRY_STEM_W_BASE = 4.6
const BERRY_STEM_W_TIP = 3
const BERRY_STEM_CURL = 0.45
const BERRY_SWAY = 0.12
const BERRY_SWAY_SPEED = 1.4
//
// Eyes: contour, veins per eye, pupil share of the radius (relaxed → tense),
// how far the pupil moves off centre; at rest each looks about, a new way
// every WANDER_MIN..+RANGE seconds; pupils glide at LOOK_EASE per second;
// blinks every BLINK_MIN..+RANGE seconds, over BLINK_SEC.
//
const EYE_CONTOUR = 1.6
const EYE_VEINS = 5
const PUPIL_RELAXED = 0.32
const PUPIL_TENSE = 0.2
const LOOK_FRAC = 0.42
const WANDER_MIN = 1
const WANDER_RANGE = 2.5
const LOOK_EASE = 9
const BLINK_MIN = 4
const BLINK_RANGE = 6
const BLINK_SEC = 0.2
const SEED = 7177
//
// Flowers between the eyes: where on the stalk, angle off it, stem length,
// size; petal count, petal ring and petal size (shares of the size), the
// heart's size, and how fast the petal ring turns with the sway clock.
//
const FLOWERS = [
  { at: 0.88, turn: 0.3, len: 14, r: 7 },
  { at: 0.74, turn: -0.5, len: 12, r: 6 },
  { at: 0.6, turn: 0.55, len: 10, r: 5.5 },
  { at: 0.97, turn: -0.15, len: 8, r: 5 }
]
const PETALS = 5
const PETAL_RX = 0.6
const PETAL_RY = 0.38
const HEART_R = 0.35
const PETAL_SPIN = 0.1
const FLOWER_STEM_W = 2.5
//
// Blades fanned round the root (`dx` off it, `angle`, `len`, widest `w`);
// they sway on their own and stiffen outward as the bush tenses.
//
const BLADES = [
  { dx: -18, angle: -2.65, len: 82, w: 11, phase: 0.4 },
  { dx: -12, angle: -2.3, len: 112, w: 12, phase: 1.3 },
  { dx: -7, angle: -2, len: 76, w: 10, phase: 2.2 },
  { dx: -3, angle: -1.72, len: 128, w: 12, phase: 0.2 },
  { dx: 2, angle: -1.45, len: 118, w: 13, phase: 0.9 },
  { dx: 6, angle: -1.2, len: 100, w: 12, phase: 2.8 },
  { dx: 10, angle: -0.95, len: 90, w: 11, phase: 1.9 },
  { dx: 14, angle: -0.65, len: 70, w: 10, phase: 3.4 },
  { dx: 18, angle: -0.4, len: 54, w: 9, phase: 2.6 }
]
const BLADE_SEGMENTS = 10
const BLADE_BEND = 0.35
const BLADE_SWAY = 0.05
const BLADE_SWAY_SPEED = 1.3
const BLADE_TENSE_SPREAD = 0.12
const CULL_PAD = 260

/**
 * Creates the eye-flower rooted at a point on the ground.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - Root X (world)
 * @param {number} cfg.y - Root Y (ground line)
 * @param {() => ({x: number, y: number}|null)} cfg.getHeroPos - Hero centre, null when there is none
 * @param {() => {left: number, top: number, right: number, bottom: number}} cfg.getView - Visible world rect
 * @returns {Object} Eye-flower inst
 */
export function create(cfg) {
  const { k, x, y } = cfg
  const rng = createSeededRandom(SEED)
  const inst = {
    k,
    x,
    y,
    getHeroPos: cfg.getHeroPos,
    getView: cfg.getView,
    tension: 0,
    lean: 0,
    time: rng() * Math.PI * 2,
    stemPts: makePoints(STEM_SEGMENTS),
    berries: BERRIES.map(def => ({
      ...def,
      len: def.len * SIZE,
      r: def.r * SIZE,
      pts: makePoints(BERRY_STEM_SEGMENTS),
      veins: eyeVeins(rng, EYE_VEINS),
      lookX: 0,
      lookY: 0,
      wanderAt: 0,
      wanderX: 0,
      wanderY: 0,
      blinkWait: BLINK_MIN + rng() * BLINK_RANGE,
      blinkT: -1
    })),
    flowers: FLOWERS.map(def => ({ ...def, len: def.len * SIZE, r: def.r * SIZE, pts: makePoints(1) })),
    blades: BLADES.map(def => ({ ...def, dx: def.dx * SIZE, len: def.len * SIZE, w: def.w * SIZE, pts: makePoints(BLADE_SEGMENTS) })),
    batch: PolyBatch.create(),
    colors: creatureColors(k),
    eye: { x: 0, y: 0, r: 0, lookX: 0, lookY: 0, pupilR: 0, close: 0, veins: null }
  }
  k.add([
    k.z(Z),
    {
      draw() {
        onDraw(inst)
      }
    }
  ])
  return inst
}

/**
 * Tenses, sways and leans the bush and turns its eyes. Call once per frame.
 * @param {Object} inst - Eye-flower inst
 */
export function onUpdate(inst) {
  const dt = inst.k.dt()
  const hero = inst.getHeroPos()
  const dist = hero ? Math.hypot(hero.x - inst.x, hero.y - inst.y) : Infinity
  const target = closeness(TENSE_FAR, TENSE_NEAR, dist)
  inst.tension += (target - inst.tension) * Math.min(1, dt * TENSE_EASE)
  const side = hero ? Math.max(-1, Math.min(1, (hero.x - inst.x) / LEAN_SIDE_SOFT)) : 0
  inst.lean += (side * LEAN_MAX * inst.tension - inst.lean) * Math.min(1, dt * TENSE_EASE)
  inst.time += dt * (1 + (TENSE_SWAY_SPEED - 1) * inst.tension)
  poseStalk(inst)
  inst.berries.forEach(berry => poseBerry(inst, berry, hero, dist, dt))
  inst.flowers.forEach(flower => poseFlower(inst, flower))
  inst.blades.forEach(blade => poseBlade(inst, blade))
}

//
// The stalk: its rest arc plus sway and the lean toward the hero (the
// leaning stalk straightens out of its rest bend as far as it leans).
//
function poseStalk(inst) {
  const t = inst.time
  const angle = STEM_REST_ANGLE + Math.sin(t * STEM_SWAY_SPEED) * STEM_SWAY + inst.lean
  const straighten = Math.min(1, Math.abs(inst.lean) / LEAN_MAX)
  fillArc(inst.stemPts, inst.x, inst.y, angle, STEM_REST_BEND * (1 - straighten), STEM_BEND_POW, STEM_LEN / STEM_SEGMENTS)
}
//
// Point and heading on the stalk at a share of its length.
//
function onStalk(inst, at) {
  const pts = inst.stemPts
  const f = Math.min(at * STEM_SEGMENTS, STEM_SEGMENTS - 0.001)
  const i = Math.floor(f)
  const a = pts[i]
  const b = pts[i + 1]
  const u = f - i
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, heading: Math.atan2(b.y - a.y, b.x - a.x) }
}
//
// An eye stem leaving the stalk, curling up toward its eye; the eye looks
// at the hero (in reach) or about, and blinks now and then.
//
function poseBerry(inst, berry, hero, dist, dt) {
  const at = onStalk(inst, berry.at)
  const sway = Math.sin(inst.time * BERRY_SWAY_SPEED + berry.phase) * BERRY_SWAY
  fillArc(berry.pts, at.x, at.y, at.heading + berry.turn + sway, -Math.sign(berry.turn) * BERRY_STEM_CURL, 1, berry.len / BERRY_STEM_SEGMENTS)
  const eye = berry.pts[BERRY_STEM_SEGMENTS]
  const reach = berry.r * LOOK_FRAC
  let tx = berry.wanderX
  let ty = berry.wanderY
  if (hero && dist < WATCH_REACH) {
    const d = Math.hypot(hero.x - eye.x, hero.y - eye.y) || 1
    tx = (hero.x - eye.x) / d * reach
    ty = (hero.y - eye.y) / d * reach
  } else {
    tickWander(inst, berry, reach)
  }
  const ease = Math.min(1, dt * LOOK_EASE)
  berry.lookX += (tx - berry.lookX) * ease
  berry.lookY += (ty - berry.lookY) * ease
  tickBlink(berry, dt)
}
function tickWander(inst, berry, reach) {
  if (inst.k.time() < berry.wanderAt) return
  const a = Math.random() * Math.PI * 2
  const r = Math.random() * reach
  berry.wanderX = Math.cos(a) * r
  berry.wanderY = Math.sin(a) * r
  berry.wanderAt = inst.k.time() + WANDER_MIN + Math.random() * WANDER_RANGE
}
function tickBlink(berry, dt) {
  if (berry.blinkT >= 0) {
    berry.blinkT += dt / BLINK_SEC
    berry.blinkT >= 1 && (berry.blinkT = -1, berry.blinkWait = BLINK_MIN + Math.random() * BLINK_RANGE)
    return
  }
  berry.blinkWait -= dt
  berry.blinkWait <= 0 && (berry.blinkT = 0)
}
function poseFlower(inst, flower) {
  const at = onStalk(inst, flower.at)
  const a = at.heading + flower.turn
  flower.pts[0].x = at.x
  flower.pts[0].y = at.y
  flower.pts[1].x = at.x + Math.cos(a) * flower.len
  flower.pts[1].y = at.y + Math.sin(a) * flower.len
}
//
// A blade: its rest arc, swaying, spreading outward as the bush tenses.
//
function poseBlade(inst, blade) {
  const sway = Math.sin(inst.time * BLADE_SWAY_SPEED + blade.phase) * BLADE_SWAY
  const out = Math.sign(blade.angle + Math.PI / 2) * BLADE_TENSE_SPREAD * inst.tension
  fillArc(blade.pts, inst.x + blade.dx, inst.y, blade.angle + sway + out, BLADE_BEND * Math.sign(Math.cos(blade.angle)), 1, blade.len / BLADE_SEGMENTS)
}
//
// Blades, the stalk and stems, thorns, flowers, then the eyes — one batch.
//
function onDraw(inst) {
  const view = inst.getView()
  if (inst.x + CULL_PAD < view.left || inst.x - CULL_PAD > view.right || inst.y < view.top || inst.y - STEM_LEN - CULL_PAD > view.bottom) return
  const { batch, colors } = inst
  inst.blades.forEach(blade => addBlade(batch, blade.pts, blade.w, colors))
  addStalk(batch, inst.stemPts, STEM_W_BASE, STEM_W_TIP, colors, CONTOUR_PAD, STEM_LIGHT_FRAC)
  inst.berries.forEach(berry => addStalk(batch, berry.pts, BERRY_STEM_W_BASE, BERRY_STEM_W_TIP, colors, CONTOUR_PAD, STEM_LIGHT_FRAC))
  addThorns(batch, inst.stemPts, STEM_W_BASE, STEM_W_TIP, STALK_THORNS, colors)
  inst.berries.forEach(berry => addThorns(batch, berry.pts, BERRY_STEM_W_BASE, BERRY_STEM_W_TIP, STEM_THORNS, colors))
  inst.flowers.forEach(flower => addFlower(inst, flower))
  const pupil = PUPIL_RELAXED + (PUPIL_TENSE - PUPIL_RELAXED) * inst.tension
  inst.berries.forEach(berry => addEye(inst, berry, pupil))
  PolyBatch.flush(batch, inst.k)
}
function addEye(inst, berry, pupil) {
  const eye = inst.eye
  const at = berry.pts[BERRY_STEM_SEGMENTS]
  eye.x = at.x
  eye.y = at.y
  eye.r = berry.r
  eye.lookX = berry.lookX
  eye.lookY = berry.lookY
  eye.pupilR = berry.r * pupil
  eye.close = berry.blinkT >= 0 ? Math.sin(Math.PI * berry.blinkT) : 0
  eye.veins = berry.veins
  addVeinedEye(inst.batch, eye, inst.colors, EYE_CONTOUR)
}
//
// A cream flower with a red heart at the end of its short stem.
//
function addFlower(inst, flower) {
  const { batch, colors } = inst
  const [a, b] = flower.pts
  PolyBatch.addLine(batch, a.x, a.y, b.x, b.y, FLOWER_STEM_W + CONTOUR_PAD, colors.contour)
  PolyBatch.addLine(batch, a.x, a.y, b.x, b.y, FLOWER_STEM_W, colors.stem)
  for (let i = 0; i < PETALS; i++) {
    const ang = i / PETALS * Math.PI * 2 + inst.time * PETAL_SPIN
    const px = b.x + Math.cos(ang) * flower.r * PETAL_RX
    const py = b.y + Math.sin(ang) * flower.r * PETAL_RX
    PolyBatch.addDisc(batch, px, py, flower.r * PETAL_RY + 1, colors.contour)
  }
  for (let i = 0; i < PETALS; i++) {
    const ang = i / PETALS * Math.PI * 2 + inst.time * PETAL_SPIN
    PolyBatch.addDisc(batch, b.x + Math.cos(ang) * flower.r * PETAL_RX, b.y + Math.sin(ang) * flower.r * PETAL_RX, flower.r * PETAL_RY, colors.petal)
  }
  PolyBatch.addDisc(batch, b.x, b.y, flower.r * HEART_R, colors.heart)
}
