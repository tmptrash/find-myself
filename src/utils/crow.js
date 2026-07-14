
//
// Shared crow drawing utility — cartoon-style black bird silhouette used across
// touch and time sections. All geometry is parametric on sc (scale) and s
// (facing side: +1 = right, -1 = left).
//
// Crow colors based on the cartoon reference (plump, round, friendly crow).
// perchY is the level where the crow's feet rest (legs extend upward from there).
//
const BODY_R = 28
const BODY_G = 25
const BODY_B = 32
const HEAD_R = 22
const HEAD_G = 20
const HEAD_B = 26
const WING_R = 38
const WING_G = 34
const WING_B = 44
const WING2_R = 52
const WING2_G = 48
const WING2_B = 62
const WING3_R = 60
const WING3_G = 56
const WING3_B = 72
const TAIL_R = 20
const TAIL_G = 18
const TAIL_B = 24
//
// Beak — pure black for a sharp, well-defined look
//
const BEAK_R = 10
const BEAK_G = 10
const BEAK_B = 10
const BEAK_DARK_R = 0
const BEAK_DARK_G = 0
const BEAK_DARK_B = 0
const MOUTH_R = 140
const MOUTH_G = 60
const MOUTH_B = 50
const EYE_RING_R = 12
const EYE_RING_G = 10
const EYE_RING_B = 14
const EYE_WHITE_R = 240
const EYE_WHITE_G = 238
const EYE_WHITE_B = 242
const PUPIL_R = 6
const PUPIL_G = 4
const PUPIL_B = 8
const FEET_R = 140
const FEET_G = 138
const FEET_B = 150
const LEG_WIDTH = 2.2
const TOE_WIDTH = 1.6
//
// Eye geometry — cartoon crow has a big expressive eye
//
const EYE_RADIUS = 4.2
const PUPIL_RADIUS = 1.8
const EYE_RING_RADIUS = 5.0
const EYE_HIGHLIGHT_RADIUS = 0.7
const MAX_PUPIL_OFFSET = (EYE_RADIUS - PUPIL_RADIUS) * 0.5
//
// How far the body center is raised above perchY so legs clearly extend below.
// Callers should treat perchY as the foot/perch level.
//
const BODY_RAISE = 28
//
// How far the torso drops toward the perch when crouch=1 (knee bend).
// Kept modest so knees stay above the toes / ground line.
//
const BODY_CROUCH_DROP = 7
//
// Lateral knee push while crouching
//
const KNEE_OUT_MAX = 7
//
// Extra lift for toe tips above the perch line (keeps claws visible)
//
const TOE_ABOVE_PERCH = 1.5
//
// Minimum gap between knee joint and perchY (knees must stay above toes)
//
const KNEE_ABOVE_TOES = 3

/**
 * Draws a cartoon-style crow at (cx, perchY) using Kaplay procedural draw calls.
 * Must be called inside a Kaplay onDraw / draw() callback.
 * @param {Object} k - Kaplay instance
 * @param {number} cx - Horizontal center of crow body
 * @param {number} perchY - Y position where crow feet rest (body drawn above)
 * @param {number} sc - Scale factor (1.35 default)
 * @param {number} s - Facing direction: +1 = right (beak right), -1 = left
 * @param {boolean} mouthOpen - Whether the beak is open (calling)
 * @param {Object|null} heroInst - Hero instance for pupil direction (optional)
 * @param {number} [brightnessBoost=0] - Add this value to all feather/body RGB channels
 * @param {number} [wingBrightnessBoost=brightnessBoost] - Separate brightness boost for wings only
 * @param {number} [crouch=0] - 0..1 knee bend (feet stay on perchY, body drops)
 */
export function drawCrow(k, cx, perchY, sc, s, mouthOpen, heroInst, brightnessBoost = 0, wingBrightnessBoost = brightnessBoost, crouch = 0) {
  const b = brightnessBoost
  const wb = wingBrightnessBoost
  const clamp = v => Math.min(255, v + b)
  const clampW = v => Math.min(255, v + wb)
  const bdy  = k.rgb(clamp(BODY_R), clamp(BODY_G), clamp(BODY_B))
  const hd   = k.rgb(clamp(HEAD_R), clamp(HEAD_G), clamp(HEAD_B))
  const wing = k.rgb(clampW(WING_R), clampW(WING_G), clampW(WING_B))
  const wing2 = k.rgb(clampW(WING2_R), clampW(WING2_G), clampW(WING2_B))
  const wing3 = k.rgb(clampW(WING3_R), clampW(WING3_G), clampW(WING3_B))
  const tail = k.rgb(clamp(TAIL_R), clamp(TAIL_G), clamp(TAIL_B))
  const bk   = k.rgb(clamp(BEAK_R), clamp(BEAK_G), clamp(BEAK_B))
  const bkDk = k.rgb(clamp(BEAK_DARK_R), clamp(BEAK_DARK_G), clamp(BEAK_DARK_B))
  const mth  = k.rgb(MOUTH_R, MOUTH_G, MOUTH_B)
  const eRing = k.rgb(EYE_RING_R, EYE_RING_G, EYE_RING_B)
  const eWhi = k.rgb(EYE_WHITE_R, EYE_WHITE_G, EYE_WHITE_B)
  const pup  = k.rgb(PUPIL_R, PUPIL_G, PUPIL_B)
  const feet = k.rgb(clamp(FEET_R), clamp(FEET_G), clamp(FEET_B))
  //
  // Body center raised above perchY; crouch drops the torso while feet stay planted
  //
  const crouchAmt = Math.max(0, Math.min(1, crouch))
  const vy = perchY - (BODY_RAISE - crouchAmt * BODY_CROUCH_DROP) * sc
  //
  // Tail: wide fan shape pointing down-away from beak, drawn behind body
  //
  k.drawTriangle({
    p1: k.vec2(cx - 5 * sc * s, vy + 4 * sc),
    p2: k.vec2(cx - 26 * sc * s, vy + 18 * sc),
    p3: k.vec2(cx - 14 * sc * s, vy + 24 * sc),
    color: tail, opacity: 1
  })
  k.drawTriangle({
    p1: k.vec2(cx - 5 * sc * s, vy + 4 * sc),
    p2: k.vec2(cx - 20 * sc * s, vy + 14 * sc),
    p3: k.vec2(cx - 8 * sc * s, vy + 24 * sc),
    color: k.rgb(clamp(TAIL_R + 10), clamp(TAIL_G + 8), clamp(TAIL_B + 12)), opacity: 0.8
  })
  //
  // Main body — fat round shape, cartoon style
  //
  k.drawEllipse({
    pos: k.vec2(cx, vy),
    radiusX: 18 * sc,
    radiusY: 12 * sc,
    color: bdy, opacity: 1
  })
  //
  // Wing feather layers (scalloped feathers on the back/top of the body).
  // Three rows of overlapping feather shapes to mimic the reference image.
  //
  drawFeatherRow(k, cx - 2 * sc * s, vy - 4 * sc, sc, s, wing, 16, 4.5, 3)
  drawFeatherRow(k, cx - 4 * sc * s, vy + 1 * sc, sc, s, wing2, 14, 4, 3)
  drawFeatherRow(k, cx - 6 * sc * s, vy + 6 * sc, sc, s, wing3, 12, 3.5, 3)
  //
  // Neck connecting body to head
  //
  k.drawEllipse({
    pos: k.vec2(cx + 9 * sc * s, vy - 8 * sc),
    radiusX: 7 * sc,
    radiusY: 6 * sc,
    color: bdy, opacity: 1
  })
  //
  // Head — large round shape, cartoon proportion
  //
  k.drawEllipse({
    pos: k.vec2(cx + 12 * sc * s, vy - 15 * sc),
    radiusX: 10 * sc,
    radiusY: 9.5 * sc,
    color: hd, opacity: 1
  })
  //
  // Eye position (on front/beak side of head, upper area)
  //
  const eyeCx = cx + 15.5 * sc * s
  const eyeCy = vy - 16 * sc
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
  // Eye sclera (bright white — cartoon crow has expressive big eyes)
  //
  k.drawCircle({ pos: k.vec2(eyeCx, eyeCy), radius: EYE_RADIUS * sc, color: eWhi, opacity: 1 })
  //
  // Pupil (tracks hero direction)
  //
  k.drawCircle({ pos: k.vec2(pupilX, pupilY), radius: PUPIL_RADIUS * sc, color: pup, opacity: 1 })
  //
  // Specular highlight dot (top-inner of eye)
  //
  k.drawCircle({
    pos: k.vec2(pupilX - 0.6 * sc * s, pupilY - 0.8 * sc),
    radius: EYE_HIGHLIGHT_RADIUS * sc,
    color: k.rgb(255, 255, 255), opacity: 0.9
  })
  //
  // Beak — black hooked shape, prominent and well-defined.
  // Upper mandible: large, hooks downward at tip.
  // Lower mandible (when open): short curve below upper.
  //
  const beakBaseX = cx + 14 * sc * s
  const beakBaseY = vy - 13 * sc
  if (mouthOpen) {
    //
    // Upper mandible with hook
    //
    k.drawTriangle({
      p1: k.vec2(beakBaseX, beakBaseY - 2 * sc),
      p2: k.vec2(beakBaseX + 14 * sc * s, beakBaseY - 5 * sc),
      p3: k.vec2(beakBaseX + 10 * sc * s, beakBaseY + 1 * sc),
      color: bk, opacity: 1
    })
    //
    // Hook tip (darker wedge curving downward)
    //
    k.drawTriangle({
      p1: k.vec2(beakBaseX + 12 * sc * s, beakBaseY - 5 * sc),
      p2: k.vec2(beakBaseX + 16 * sc * s, beakBaseY - 3 * sc),
      p3: k.vec2(beakBaseX + 12 * sc * s, beakBaseY + 0.5 * sc),
      color: bkDk, opacity: 1
    })
    //
    // Lower mandible
    //
    k.drawTriangle({
      p1: k.vec2(beakBaseX, beakBaseY + 1 * sc),
      p2: k.vec2(beakBaseX + 13 * sc * s, beakBaseY + 1 * sc),
      p3: k.vec2(beakBaseX + 4 * sc * s, beakBaseY + 5 * sc),
      color: bk, opacity: 1
    })
    //
    // Mouth interior
    //
    k.drawTriangle({
      p1: k.vec2(beakBaseX + 1 * sc * s, beakBaseY),
      p2: k.vec2(beakBaseX + 12 * sc * s, beakBaseY - 2 * sc),
      p3: k.vec2(beakBaseX + 4 * sc * s, beakBaseY + 4 * sc),
      color: mth, opacity: 0.88
    })
  } else {
    //
    // Closed beak: upper mandible with hook tip, no gap visible
    //
    k.drawTriangle({
      p1: k.vec2(beakBaseX, beakBaseY - 1 * sc),
      p2: k.vec2(beakBaseX + 15 * sc * s, beakBaseY - 4 * sc),
      p3: k.vec2(beakBaseX + 9 * sc * s, beakBaseY + 3 * sc),
      color: bk, opacity: 1
    })
    //
    // Hook tip (contrasting darker black for depth)
    //
    k.drawTriangle({
      p1: k.vec2(beakBaseX + 13 * sc * s, beakBaseY - 4.5 * sc),
      p2: k.vec2(beakBaseX + 17 * sc * s, beakBaseY - 2.5 * sc),
      p3: k.vec2(beakBaseX + 11 * sc * s, beakBaseY + 1.5 * sc),
      color: bkDk, opacity: 1
    })
    //
    // Nostril dot on upper mandible base
    //
    k.drawCircle({
      pos: k.vec2(beakBaseX + 3 * sc * s, beakBaseY - 2 * sc),
      radius: 0.9 * sc,
      color: bkDk, opacity: 0.8
    })
  }
  //
  // Legs: two segments from body bottom down to perchY.
  // legTop is at body bottom (vy + 12*sc), legBot is at perchY = footY.
  //
  const lLegX = cx + 3 * sc * s
  const rLegX = cx + 10 * sc * s
  const legTop = vy + 12 * sc
  //
  // Knee bends outward when crouching — joint stays above the toes/perch
  //
  const kneeOut = crouchAmt * KNEE_OUT_MAX * sc
  const thighLen = (7 - crouchAmt * 1.2) * sc
  const kneeFloor = perchY - KNEE_ABOVE_TOES * sc
  const legMid = Math.min(legTop + thighLen, kneeFloor)
  const legBot = perchY
  //
  // Thigh segment (slanted outward on crouch)
  //
  k.drawLine({ p1: k.vec2(lLegX - 2 * sc * s, legTop), p2: k.vec2(lLegX - kneeOut * s, legMid), width: LEG_WIDTH * 1.4, color: feet, opacity: 1 })
  k.drawLine({ p1: k.vec2(rLegX - 2 * sc * s, legTop), p2: k.vec2(rLegX + kneeOut * s, legMid), width: LEG_WIDTH * 1.4, color: feet, opacity: 1 })
  //
  // Lower leg (tarsometatarsus)
  //
  k.drawLine({ p1: k.vec2(lLegX - kneeOut * s, legMid), p2: k.vec2(lLegX - 1 * sc, legBot), width: LEG_WIDTH, color: feet, opacity: 1 })
  k.drawLine({ p1: k.vec2(rLegX + kneeOut * s, legMid), p2: k.vec2(rLegX + 1 * sc, legBot), width: LEG_WIDTH, color: feet, opacity: 1 })
  //
  // Toes stay on / slightly above the perch line (never sink into the floor)
  //
  drawToes(k, lLegX - 1 * sc, legBot, sc, s, feet)
  drawToes(k, rLegX + 1 * sc, legBot, sc, s, feet)
}
//
// Draws a row of scalloped feather shapes (layered arcs) on the wing.
// count feathers spread along the wing from back to tail side.
//
function drawFeatherRow(k, startX, startY, sc, s, color, totalW, featherH, count) {
  const featherW = (totalW * sc) / count
  for (let i = 0; i < count; i++) {
    const fx = startX - i * featherW * s
    k.drawEllipse({
      pos: k.vec2(fx - featherW * 0.5 * s, startY + featherH * sc * 0.3),
      radiusX: featherW * 0.72,
      radiusY: featherH * sc * 0.7,
      color, opacity: 0.85
    })
  }
}
//
// Draws the three-forward + one-rear toe arrangement for one foot.
//
function drawToes(k, ankleX, ankleY, sc, s, color) {
  //
  // Forward toes rest at/above the perch — tips never drop below ankleY
  //
  const tipY = ankleY - TOE_ABOVE_PERCH * sc
  k.drawLine({ p1: k.vec2(ankleX, ankleY), p2: k.vec2(ankleX + 9 * sc * s, tipY), width: TOE_WIDTH, color, opacity: 1 })
  k.drawLine({ p1: k.vec2(ankleX, ankleY), p2: k.vec2(ankleX + 7 * sc * s, tipY + 0.5 * sc), width: TOE_WIDTH, color, opacity: 1 })
  k.drawLine({ p1: k.vec2(ankleX, ankleY), p2: k.vec2(ankleX + 3 * sc * s, tipY + 0.8 * sc), width: TOE_WIDTH, color, opacity: 1 })
  //
  // Hallux (hind digit, points backward)
  //
  k.drawLine({ p1: k.vec2(ankleX, ankleY), p2: k.vec2(ankleX - 6 * sc * s, tipY + 0.4 * sc), width: TOE_WIDTH, color, opacity: 1 })
}
