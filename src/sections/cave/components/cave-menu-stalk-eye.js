import * as PolyBatch from '../../../utils/poly-batch.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { creatureColors, eyeVeins, addVeinedEye, addStalk, addThorns, makePoints } from '../utils/cave-creature-paint.js'
//
// Cave section icon on the menu: the level's stalk-eye cut short, as the
// forest icon is the forest's — a blood-red contoured stalk with a lit line
// and thorns along it, swaying a little, topped by a bloodshot eye whose
// pupil follows the hero and which blinks now and then. Drawn live with the
// cave creatures' look (cave-creature-paint.js), in icon px round the
// pose's centre (scaled with the pose).
//
// The stalk: its foot ICON_FOOT_Y below the centre, SEGMENTS joints up to
// the eye ICON_EYE_Y above it, bowed STALK_BOW px; it sways SWAY_PX at the
// eye (SWAY_SPEED rad/s), less toward the foot.
//
const ICON_FOOT_Y = 40
const ICON_EYE_Y = -20
const SEGMENTS = 5
const STALK_BOW = 4
const W_BASE = 7
const W_TIP = 4.5
const CONTOUR_PAD = 2
const LIGHT_FRAC = 0.35
const SWAY_PX = 2.5
const SWAY_SPEED = 1.4
//
// Thorns along the stalk (icon px), between its from / to shares.
//
const THORNS = { step: 10, len: 8, tipLen: 5, from: 0.12, to: 0.85 }
//
// The eye: radius, pupil share of it, the pupil kept PUPIL_MARGIN inside
// the white, its contour, its veins.
//
const EYE_R = 16
const PUPIL_SHARE = 0.36
const PUPIL_MARGIN = 1
const EYE_CONTOUR = 1.8
const EYE_VEINS = 7
const VEIN_INNER = 0.35
const SEED = 4252
//
// Blinks: a pause of BLINK_MIN..MAX s, then the lid shuts and opens again
// over BLINK_SEC.
//
const BLINK_MIN = 2.5
const BLINK_MAX = 6
const BLINK_SEC = 0.2

/**
 * Creates the menu cave stalk-eye icon.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.z - Draw layer z
 * @param {function(): {x: number, y: number, scale: number}} cfg.getPose - Icon centre and scale
 * @param {function(): ({x: number, y: number}|null)} cfg.getLookAt - Point the pupil follows (null: straight ahead)
 * @param {function(): boolean} cfg.isVisible - False hides the icon (scene leave)
 * @returns {Object} Stalk-eye icon inst
 */
export function create(cfg) {
  const { k } = cfg
  const inst = {
    k,
    getPose: cfg.getPose,
    getLookAt: cfg.getLookAt,
    isVisible: cfg.isVisible,
    batch: PolyBatch.create(),
    colors: creatureColors(k),
    points: makePoints(SEGMENTS),
    eye: { x: 0, y: 0, r: 0, lookX: 0, lookY: 0, pupilR: 0, close: 0, veins: eyeVeins(createSeededRandom(SEED), EYE_VEINS, VEIN_INNER) },
    time: 0,
    blinkWait: randomIn(BLINK_MIN, BLINK_MAX),
    blinkT: 0
  }
  k.add([
    k.z(cfg.z),
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
//
// Sway time and the blink: wait, then shut and open over BLINK_SEC.
//
function onUpdate(inst) {
  const dt = inst.k.dt()
  inst.time += dt
  if (inst.blinkT > 0) {
    inst.blinkT = Math.max(0, inst.blinkT - dt)
    inst.eye.close = Math.sin(Math.PI * (1 - inst.blinkT / BLINK_SEC))
    return
  }
  inst.eye.close = 0
  inst.blinkWait -= dt
  if (inst.blinkWait > 0) return
  inst.blinkWait = randomIn(BLINK_MIN, BLINK_MAX)
  inst.blinkT = BLINK_SEC
}
//
// The stalk with its lit line, its thorns, then the eye on top.
//
function onDraw(inst) {
  if (!inst.isVisible()) return
  const pose = inst.getPose()
  const s = pose.scale
  const pts = stalkPoints(inst, pose)
  const { batch, colors, eye } = inst
  addStalk(batch, pts, W_BASE * s, W_TIP * s, colors, CONTOUR_PAD * s, LIGHT_FRAC)
  addThorns(batch, pts, W_BASE * s, W_TIP * s, scaledThorns(s), colors)
  const top = pts[pts.length - 1]
  eye.x = top.x
  eye.y = top.y
  eye.r = EYE_R * s
  eye.pupilR = eye.r * PUPIL_SHARE
  lookAt(eye, inst.getLookAt())
  addVeinedEye(batch, eye, colors, EYE_CONTOUR * s)
  PolyBatch.flush(batch, inst.k)
}
//
// Joints from the foot up to the eye: a gentle bow plus the sway, both
// growing toward the eye.
//
function stalkPoints(inst, pose) {
  const s = pose.scale
  const sway = Math.sin(inst.time * SWAY_SPEED) * SWAY_PX
  inst.points.forEach((p, i) => {
    const u = i / SEGMENTS
    p.x = pose.x + (Math.sin(Math.PI * u) * STALK_BOW + sway * u * u) * s
    p.y = pose.y + (ICON_FOOT_Y + (ICON_EYE_Y - ICON_FOOT_Y) * u) * s
  })
  return inst.points
}
function scaledThorns(s) {
  return { ...THORNS, step: THORNS.step * s, len: THORNS.len * s, tipLen: THORNS.tipLen * s }
}
//
// The pupil turned toward the look-at point, kept inside the white.
//
function lookAt(eye, look) {
  eye.lookX = 0
  eye.lookY = 0
  if (!look) return
  const dx = look.x - eye.x
  const dy = look.y - eye.y
  const dist = Math.hypot(dx, dy) || 1
  const reach = Math.min(dist, eye.r - eye.pupilR - PUPIL_MARGIN)
  eye.lookX = dx / dist * reach
  eye.lookY = dy / dist * reach
}
function randomIn(min, max) {
  return min + Math.random() * (max - min)
}
