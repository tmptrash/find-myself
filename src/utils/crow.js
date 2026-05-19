
//
// Shared crow drawing utility — realistic black bird silhouette used across
// touch and time sections. All geometry is parametric on sc (scale) and s
// (facing side: +1 = right, -1 = left).
//
// Crow colors (pre-defined here so callers do not allocate per frame)
//
const BODY_R = 22
const BODY_G = 20
const BODY_B = 24
const HEAD_R = 18
const HEAD_G = 16
const HEAD_B = 20
const WING_R = 30
const WING_G = 26
const WING_B = 38
const WING2_R = 40
const WING2_G = 36
const WING2_B = 58
const TAIL_R = 20
const TAIL_G = 18
const TAIL_B = 22
const BEAK_UPPER_R = 52
const BEAK_UPPER_G = 48
const BEAK_UPPER_B = 32
const BEAK_LOWER_R = 42
const BEAK_LOWER_G = 38
const BEAK_LOWER_B = 25
const MOUTH_R = 155
const MOUTH_G = 72
const MOUTH_B = 55
const EYE_RING_R = 10
const EYE_RING_G = 8
const EYE_RING_B = 10
const EYE_WHITE_R = 220
const EYE_WHITE_G = 215
const EYE_WHITE_B = 218
const PUPIL_R = 8
const PUPIL_G = 6
const PUPIL_B = 10
const FEET_R = 58
const FEET_G = 48
const FEET_B = 28
const LEG_WIDTH = 1.6
const TOE_WIDTH = 1.2
//
// Eye geometry
//
const EYE_RADIUS = 2.5
const PUPIL_RADIUS = 1.2
const EYE_RING_RADIUS = 3.1
const EYE_HIGHLIGHT_RADIUS = 0.45
const MAX_PUPIL_OFFSET = (EYE_RADIUS - PUPIL_RADIUS) * 0.65

/**
 * Draws a realistic crow at (cx, perchY) using Kaplay procedural draw calls.
 * Must be called inside a Kaplay onDraw / draw() callback.
 * @param {Object} k - Kaplay instance
 * @param {number} cx - Horizontal center of crow body
 * @param {number} perchY - Y position of crow body center
 * @param {number} sc - Scale factor (1.35 default)
 * @param {number} s - Facing direction: +1 = right (beak right), -1 = left
 * @param {boolean} mouthOpen - Whether the beak is open (calling)
 * @param {Object|null} heroInst - Hero instance for pupil direction (optional)
 */
export function drawCrow(k, cx, perchY, sc, s, mouthOpen, heroInst) {
  const bdy  = k.rgb(BODY_R, BODY_G, BODY_B)
  const hd   = k.rgb(HEAD_R, HEAD_G, HEAD_B)
  const wing = k.rgb(WING_R, WING_G, WING_B)
  const wing2 = k.rgb(WING2_R, WING2_G, WING2_B)
  const tail = k.rgb(TAIL_R, TAIL_G, TAIL_B)
  const bkU  = k.rgb(BEAK_UPPER_R, BEAK_UPPER_G, BEAK_UPPER_B)
  const bkL  = k.rgb(BEAK_LOWER_R, BEAK_LOWER_G, BEAK_LOWER_B)
  const mth  = k.rgb(MOUTH_R, MOUTH_G, MOUTH_B)
  const eRing = k.rgb(EYE_RING_R, EYE_RING_G, EYE_RING_B)
  const eWhi = k.rgb(EYE_WHITE_R, EYE_WHITE_G, EYE_WHITE_B)
  const pup  = k.rgb(PUPIL_R, PUPIL_G, PUPIL_B)
  const feet = k.rgb(FEET_R, FEET_G, FEET_B)
  //
  // Tail: wide-fan shape — narrow root at body, wide spread at the outer tip.
  // Drawn before the body so the root is naturally hidden.
  //
  k.drawTriangle({
    p1: k.vec2(cx - 10 * sc * s, perchY + 3 * sc),
    p2: k.vec2(cx - 28 * sc * s, perchY - 6 * sc),
    p3: k.vec2(cx - 28 * sc * s, perchY + 12 * sc),
    color: tail, opacity: 1
  })
  //
  // Inner feather layer — lighter shade gives texture and depth
  //
  k.drawTriangle({
    p1: k.vec2(cx - 10 * sc * s, perchY + 3 * sc),
    p2: k.vec2(cx - 24 * sc * s, perchY - 2 * sc),
    p3: k.vec2(cx - 24 * sc * s, perchY + 9 * sc),
    color: k.rgb(TAIL_R + 8, TAIL_G + 6, TAIL_B + 8), opacity: 0.65
  })
  //
  // Body — elongated oval with slight lean toward beak side
  //
  k.drawEllipse({
    pos: k.vec2(cx + 1 * sc * s, perchY),
    radiusX: 14 * sc,
    radiusY: 8.5 * sc,
    color: bdy, opacity: 1
  })
  //
  // Primary wing surface — dark with iridescent blue-purple shimmer
  //
  k.drawEllipse({
    pos: k.vec2(cx - 1 * sc * s, perchY - 1.5 * sc),
    radiusX: 9 * sc,
    radiusY: 4.5 * sc,
    color: wing, opacity: 0.88
  })
  //
  // Secondary wing sheen (subtle blue-violet iridescence)
  //
  k.drawEllipse({
    pos: k.vec2(cx - 3 * sc * s, perchY - 2 * sc),
    radiusX: 6 * sc,
    radiusY: 2.8 * sc,
    color: wing2, opacity: 0.45
  })
  //
  // Neck — connects body to head with a tapered ellipse
  //
  k.drawEllipse({
    pos: k.vec2(cx + 6 * sc * s, perchY - 5.5 * sc),
    radiusX: 5.5 * sc,
    radiusY: 4 * sc,
    color: bdy, opacity: 1
  })
  //
  // Head — slightly flattened ellipse (crows have wide, flat heads)
  //
  k.drawEllipse({
    pos: k.vec2(cx + 10 * sc * s, perchY - 10 * sc),
    radiusX: 7.5 * sc,
    radiusY: 6.5 * sc,
    color: hd, opacity: 1
  })
  //
  // Eye position (on the beak side of the head, upper third)
  //
  const eyeCx = cx + 13.5 * sc * s
  const eyeCy = perchY - 12 * sc
  //
  // Compute pupil offset toward hero (eye tracking)
  //
  const heroPosX = heroInst?.character?.pos?.x ?? (cx + s)
  const heroPosY = heroInst?.character?.pos?.y ?? eyeCy
  const eDx = heroPosX - eyeCx
  const eDy = heroPosY - eyeCy
  const eDist = Math.sqrt(eDx * eDx + eDy * eDy) || 1
  const maxOff = MAX_PUPIL_OFFSET * sc
  const pupilX = eyeCx + (eDx / eDist) * maxOff
  const pupilY = eyeCy + (eDy / eDist) * maxOff
  //
  // Eye ring (outer dark border for definition)
  //
  k.drawCircle({ pos: k.vec2(eyeCx, eyeCy), radius: EYE_RING_RADIUS * sc, color: eRing, opacity: 1 })
  //
  // Eye sclera (off-white, smaller than eye ring)
  //
  k.drawCircle({ pos: k.vec2(eyeCx, eyeCy), radius: EYE_RADIUS * sc, color: eWhi, opacity: 1 })
  //
  // Pupil (tracks hero direction)
  //
  k.drawCircle({ pos: k.vec2(pupilX, pupilY), radius: PUPIL_RADIUS * sc, color: pup, opacity: 1 })
  //
  // Specular highlight dot (top-right of pupil)
  //
  k.drawCircle({
    pos: k.vec2(pupilX - 0.4 * sc * s, pupilY - 0.5 * sc),
    radius: EYE_HIGHLIGHT_RADIUS * sc,
    color: k.rgb(255, 255, 255), opacity: 0.82
  })
  //
  // Beak — large, hooked shape characteristic of crows.
  // Upper mandible: long, curves down at the tip (hook).
  // Lower mandible: shorter, slightly curved.
  //
  const beakBaseX = cx + 10 * sc * s
  const beakBaseY = perchY - 9 * sc
  if (mouthOpen) {
    //
    // Upper mandible (wide-open)
    //
    k.drawTriangle({
      p1: k.vec2(beakBaseX, beakBaseY - 1 * sc),
      p2: k.vec2(beakBaseX + 19 * sc * s, beakBaseY - 4 * sc),
      p3: k.vec2(beakBaseX + 9 * sc * s, beakBaseY + 1 * sc),
      color: bkU, opacity: 1
    })
    //
    // Hook tip (small dark wedge at end of upper mandible)
    //
    k.drawTriangle({
      p1: k.vec2(beakBaseX + 15 * sc * s, beakBaseY - 5 * sc),
      p2: k.vec2(beakBaseX + 21 * sc * s, beakBaseY - 3 * sc),
      p3: k.vec2(beakBaseX + 16 * sc * s, beakBaseY - 1 * sc),
      color: k.rgb(BEAK_UPPER_R - 10, BEAK_UPPER_G - 10, BEAK_UPPER_B - 10), opacity: 1
    })
    //
    // Lower mandible
    //
    k.drawTriangle({
      p1: k.vec2(beakBaseX, beakBaseY + 1 * sc),
      p2: k.vec2(beakBaseX + 17 * sc * s, beakBaseY + 1 * sc),
      p3: k.vec2(beakBaseX + 3 * sc * s, beakBaseY + 5 * sc),
      color: bkL, opacity: 1
    })
    //
    // Mouth interior
    //
    k.drawTriangle({
      p1: k.vec2(beakBaseX + 2 * sc * s, beakBaseY),
      p2: k.vec2(beakBaseX + 16 * sc * s, beakBaseY - 2 * sc),
      p3: k.vec2(beakBaseX + 3 * sc * s, beakBaseY + 4 * sc),
      color: mth, opacity: 0.88
    })
  } else {
    //
    // Closed beak: only the upper mandible drawn as a single solid hooked shape.
    // No lower mandible — avoids any visible gap that would look like an open mouth.
    //
    k.drawTriangle({
      p1: k.vec2(beakBaseX, beakBaseY - 1.5 * sc),
      p2: k.vec2(beakBaseX + 20 * sc * s, beakBaseY - 3 * sc),
      p3: k.vec2(beakBaseX + 2 * sc * s, beakBaseY + 1.5 * sc),
      color: bkU, opacity: 1
    })
  }
  //
  // Legs: two short tarsometatarsus segments (knee-to-ankle)
  //
  const lLegX = cx + 2 * sc
  const rLegX = cx + 8 * sc
  const legTop = perchY + 8 * sc
  const legBot = perchY + 15 * sc
  k.drawLine({ p1: k.vec2(lLegX, legTop), p2: k.vec2(lLegX - 1 * sc, legBot), width: LEG_WIDTH, color: feet, opacity: 1 })
  k.drawLine({ p1: k.vec2(rLegX, legTop), p2: k.vec2(rLegX + 0.5 * sc, legBot), width: LEG_WIDTH, color: feet, opacity: 1 })
  //
  // Toes: 3 forward + 1 hallux (rear) per foot
  //
  drawToes(k, lLegX - 1 * sc, legBot, sc, s, feet)
  drawToes(k, rLegX + 0.5 * sc, legBot, sc, s, feet)
}
//
// Draws the three-forward + one-rear toe arrangement for one foot.
//
function drawToes(k, ankleX, ankleY, sc, s, color) {
  k.drawLine({ p1: k.vec2(ankleX, ankleY), p2: k.vec2(ankleX + 7 * sc * s, ankleY + 2 * sc), width: TOE_WIDTH, color, opacity: 1 })
  k.drawLine({ p1: k.vec2(ankleX, ankleY), p2: k.vec2(ankleX + 5 * sc * s, ankleY + 5 * sc), width: TOE_WIDTH, color, opacity: 1 })
  k.drawLine({ p1: k.vec2(ankleX, ankleY), p2: k.vec2(ankleX + 2 * sc * s, ankleY + 6 * sc), width: TOE_WIDTH, color, opacity: 1 })
  //
  // Hallux (hind digit, points backward)
  //
  k.drawLine({ p1: k.vec2(ankleX, ankleY), p2: k.vec2(ankleX - 5 * sc * s, ankleY + 3 * sc), width: TOE_WIDTH, color, opacity: 1 })
}
