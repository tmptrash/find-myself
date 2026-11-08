import * as PolyBatch from '../../../utils/poly-batch.js'
import { addLiddedEyeBerry, addTaperedPass, forestEyeBerryColors } from '../utils/forest-eye-berry.js'
//
// Forest section icon on the menu ring: one of the level's stalk-eyes cut
// short so it fits the icon's place across from the hero — a red contoured
// stalk with a lit line and two little side buds, swaying a little, and a
// white eye on top whose pupil follows the hero and blinks now and then.
// Drawn live with the level's eye-berry look (forest-eye-berry.js), in icon
// px round the pose's centre (scaled with the pose).
//
// The stalk: its foot ICON_FOOT_Y below the centre, STALK_SEGMENTS joints up
// to the eye ICON_EYE_Y above it, bowed STALK_BOW px; it sways SWAY_PX at
// the eye (SWAY_SPEED rad/s), less towards the foot.
//
const ICON_FOOT_Y = 40
const ICON_EYE_Y = -20
const STALK_SEGMENTS = 4
const STALK_BOW = 4
const STALK_W = 6
const STALK_TIP_FRAC = 0.6
const STALK_LIGHT_FRAC = 0.35
const CONTOUR_PAD = 2
const SWAY_PX = 2.5
const SWAY_SPEED = 1.4
//
// Side buds on the middle joints (alternating sides): arm length and drop
// as shares of the stalk width, the bud's radius share.
//
const BUD_ARM = 2.4
const BUD_DROP = 0.35
const BUD_ARM_W = 0.72
const BUD_R = 0.95
//
// The eye: sclera and pupil radii, the pupil kept PUPIL_MARGIN inside the
// sclera, its contour ring.
//
const EYE_R = 16
const PUPIL_R = 6.5
const PUPIL_MARGIN = 1
const EYE_CONTOUR = 1.8
//
// Blinks: a pause of BLINK_MIN..MAX s, then the lid shuts and opens again
// over BLINK_SEC.
//
const BLINK_MIN = 2.5
const BLINK_MAX = 6
const BLINK_SEC = 0.18

/**
 * Creates the menu forest stalk-eye icon.
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
    points: Array.from({ length: STALK_SEGMENTS + 1 }, () => ({ x: 0, y: 0 })),
    time: 0,
    blinkWait: randomIn(BLINK_MIN, BLINK_MAX),
    blinkT: 0,
    lidClose: 0
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
    inst.lidClose = Math.sin(Math.PI * (1 - inst.blinkT / BLINK_SEC))
    return
  }
  inst.lidClose = 0
  inst.blinkWait -= dt
  if (inst.blinkWait > 0) return
  inst.blinkWait = randomIn(BLINK_MIN, BLINK_MAX)
  inst.blinkT = BLINK_SEC
}
//
// Contours under every fill (stalk and buds), the stalk, its lit line,
// then the eye on top.
//
function onDraw(inst) {
  if (!inst.isVisible()) return
  const pose = inst.getPose()
  const s = pose.scale
  const pts = stalkPoints(inst, pose)
  const colors = forestEyeBerryColors(inst.k)
  const batch = inst.batch
  addBody(batch, pts, STALK_W * s, CONTOUR_PAD * s, colors.contour)
  addBody(batch, pts, STALK_W * s, 0, colors.stem)
  addTaperedPass(batch, pts, STALK_W * s * STALK_LIGHT_FRAC, STALK_W * s * STALK_LIGHT_FRAC * STALK_TIP_FRAC, colors.stemLight)
  const eye = pts[pts.length - 1]
  const pupil = pupilAt(eye, inst.getLookAt(), EYE_R * s, PUPIL_R * s)
  addLiddedEyeBerry(batch, eye.x, eye.y, EYE_R * s, pupil.x, pupil.y, PUPIL_R * s, colors, EYE_CONTOUR * s, inst.lidClose)
  PolyBatch.flush(batch, inst.k)
}
//
// Joints from the foot up to the eye: a gentle bow plus the sway, both
// growing towards the eye.
//
function stalkPoints(inst, pose) {
  const s = pose.scale
  const sway = Math.sin(inst.time * SWAY_SPEED) * SWAY_PX
  inst.points.forEach((p, i) => {
    const u = i / STALK_SEGMENTS
    p.x = pose.x + (Math.sin(Math.PI * u) * STALK_BOW + sway * u * u) * s
    p.y = pose.y + (ICON_FOOT_Y + (ICON_EYE_Y - ICON_FOOT_Y) * u) * s
  })
  return inst.points
}
//
// The tapered stalk and its side buds, `pad` wider all round (the contour).
//
function addBody(batch, pts, w, pad, color) {
  addTaperedPass(batch, pts, w + pad, w * STALK_TIP_FRAC + pad, color)
  for (let i = 1; i < pts.length - 1; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const tipX = pts[i].x + side * w * BUD_ARM
    const tipY = pts[i].y + w * BUD_DROP
    PolyBatch.addLine(batch, pts[i].x, pts[i].y, tipX, tipY, w * BUD_ARM_W + pad, color)
    PolyBatch.addDisc(batch, tipX, tipY, w * BUD_R + pad * 0.5, color)
  }
}
//
// The pupil turned towards the look-at point, kept inside the sclera.
//
function pupilAt(eye, look, scleraR, pupilR) {
  if (!look) return { x: eye.x, y: eye.y }
  const dx = look.x - eye.x
  const dy = look.y - eye.y
  const dist = Math.hypot(dx, dy) || 1
  const reach = Math.min(dist, scleraR - pupilR - PUPIL_MARGIN)
  return { x: eye.x + dx / dist * reach, y: eye.y + dy / dist * reach }
}
function randomIn(min, max) {
  return min + Math.random() * (max - min)
}
