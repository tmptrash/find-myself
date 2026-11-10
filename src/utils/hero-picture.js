import { CFG } from '../cfg.js'
import { loadPictureImage } from '../sections/forest/utils/forest-picture.js'
import { parseHex } from './helper.js'
//
// The hero's frames cut from assets/hero.png: the leg-less run body (top
// row, first figure — the leg pieces beside it are ignored), the jump
// (bottom row, first 7 frames) and the idle body (the last frame of the
// bottom row cut off under its crotch, IDLE.bottomY — its painted legs are
// dropped; its eye rings are empty, the pupils are painted into them here).
// The legs of the run and the idle stance are drawn live by hero-legs.js.
// The sheet starts loading with this module (game boot).
//
// A sheet exported on an opaque paper background (or with the paper's white
// left in its figures' soft edge) is keyed out once on load (see
// keyOutBackground).
//
// Every frame lands in the hero's FRAME_SIZE sprite canvas at PICTURE_SCALE,
// and is registered so the hero never jitters between frames:
//   - the run body and the jump frames hold their eye still at RUN_EYE_X /
//     JUMP_EYE_X;
//   - the run body is drawn RUN_BODY_SHARE of the sheet scale (it is a
//     taller figure than the idle stance) with its bottom on
//     RUN_BODY_BOTTOM_Y, so the running hero stands about as tall as the
//     idle one while the live legs still reach FEET_Y slightly bent;
//   - jump frames share their row's ground line, so the airborne poses keep
//     the lift the sheet gives them;
//   - the idle body is centred on IDLE_CENTER_X with its bottom on
//     RUN_BODY_BOTTOM_Y too, scaled (IDLE_SCALE) to stand as tall as the run
//     body, so both stand on the same live legs at the same height.
//
const URL = 'hero.png'
export const FRAME_SIZE = 96
const PICTURE_SCALE = 70 / 171
export const FEET_Y = 86
const RUN_EYE_X = 61.6
const RUN_BODY_BOTTOM_Y = 72
const RUN_BODY_SHARE = 0.94
const RUN_SCALE = PICTURE_SCALE * RUN_BODY_SHARE
const JUMP_EYE_X = 56.5
const IDLE_CENTER_X = 48
//
// Sheet boxes (with a little clear margin round each figure) and anchors in
// sheet px: eyeX is the centre of the frame's eye ring, topY / bottomY the
// top and bottom of a leg-less body (the idle one's bottom is the cut under
// its crotch outline), centerX the idle body's middle. RUN_HIPS / IDLE_HIPS
// are where the legs join a body (on its bottom contour): the run's on its
// flat stretch — far enough from its rounded corners that each leg's flared
// top stays inside the body's silhouette; the idle's in the middle of its
// painted legs, so the live ones carry its sides on down. JUMP_GROUND_Y is
// the jump row's ground line (its crouches).
//
const RUN_BODY = { x: 78, y: 121, w: 101, h: 143, eyeX: 151.4, topY: 124, bottomY: 261 }
const RUN_HIPS = [{ x: 110, y: 260 }, { x: 128, y: 260 }]
const JUMP_GROUND_Y = 631
const JUMP = [
  { x: 81, y: 508, w: 101, h: 126, eyeX: 153.8 },
  { x: 354, y: 438, w: 96, h: 177, eyeX: 422.8 },
  { x: 624, y: 453, w: 99, h: 131, eyeX: 695.4 },
  { x: 898, y: 459, w: 98, h: 98, eyeX: 968.2 },
  { x: 1172, y: 454, w: 98, h: 131, eyeX: 1243.1 },
  { x: 1445, y: 435, w: 97, h: 180, eyeX: 1513.2 },
  { x: 1713, y: 510, w: 101, h: 124, eyeX: 1785.7 }
]
const IDLE = { x: 1986, y: 473, w: 92, h: 129, centerX: 2031.5, topY: 476, bottomY: 602 }
const IDLE_HIPS = [{ x: 2007, y: 601 }, { x: 2056, y: 601 }]
//
// The idle eyes (ring centres, left then right) and the pupil painted into
// them, measured from the run/jump eyes: a near-black disc of PUPIL_R that
// sits PUPIL_TRAVEL off the eye's centre when it looks aside, with a light
// notch (the glint) on its upper left — GLINT_X/Y off the pupil's centre,
// GLINT_R wide, cutting GLINT_CUT of the pupil away. Sheet px.
//
const IDLE_EYES = [{ x: 2018, y: 502.3 }, { x: 2048.6, y: 502.3 }]
const PUPIL_R = 5.2
const PUPIL_TRAVEL = 5
const GLINT_X = -3.4
const GLINT_Y = -2.8
const GLINT_R = 1.9
const GLINT_CUT = 0.7
//
// The bodies' bellies are painted darkening towards their bottom; next to
// the live legs (drawn in the body's own colour) that reads as a dark band. In
// the bottom BELLY_LIFT_BAND px above each column's bottom edge, the body's
// inside takes the colour of that column's pixel just above the band (the
// sideways shading stays, the grain pass adds texture back); pixels darker
// than BELLY_INSIDE_SHARE of it are the outline and its soft edge and stay.
//
const BELLY_LIFT_BAND = 10
const BELLY_INSIDE_SHARE = 0.75
const OPAQUE_ALPHA = 128
const RGBA = 4
//
// Keying the paper out: it is light (KEY_PAPER_MIN_LUM and up) and neutral
// (red and blue within KEY_NEUTRAL_SPREAD), the body is warm and the
// outline dark, so a flood from the sheet's border over paper pixels stops
// at every figure's outline. From there the outline's soft outer edge (a mix
// of outline and paper) is followed inwards up to KEY_EDGE_PX px, while it
// is lighter than KEY_EDGE_CORE_LUM — the outline's dark core stops it.
// Paper and edge pixels lighter than that core become the outline colour
// (CFG hero.sheetEdge), as opaque as they are darker than KEY_PAPER_LUM (and
// no more than they were) — a clean soft edge darker than that is kept:
// the edge stays soft, no light rim is left round a figure — also on a sheet
// exported with a clear background whose edge still holds the paper's white.
//
const KEY_PAPER_MIN_LUM = 215
const KEY_PAPER_LUM = 250
const KEY_NEUTRAL_SPREAD = 12
const KEY_EDGE_PX = 3
const KEY_EDGE_CORE_LUM = 110
const RGB = 3
export const JUMP_FRAME_COUNT = JUMP.length
const IDLE_SCALE = RUN_SCALE * (RUN_BODY.bottomY - RUN_BODY.topY) / (IDLE.bottomY - IDLE.topY)
//
// Where the legs meet the bodies' bottom contour, in FRAME_SIZE canvas px
// (run: back hip first; idle: left hip first).
//
export const RUN_HIP_POINTS = RUN_HIPS.map(hip => ({
  x: RUN_EYE_X + (hip.x - RUN_BODY.eyeX) * RUN_SCALE,
  y: RUN_BODY_BOTTOM_Y - (RUN_BODY.bottomY - hip.y) * RUN_SCALE
}))
export const IDLE_HIP_POINTS = IDLE_HIPS.map(hip => ({
  x: IDLE_CENTER_X + (hip.x - IDLE.centerX) * IDLE_SCALE,
  y: RUN_BODY_BOTTOM_Y - (IDLE.bottomY - hip.y) * IDLE_SCALE
}))
const sheet = loadPictureImage(URL)
let picture = null

/**
 * Waits for the hero sheet and keys its paper out (once per page).
 * @returns {Promise<void>}
 */
export async function load() {
  if (picture) return
  const img = await sheet
  picture ??= img && keyOutBackground(img)
}

/**
 * The leg-less run body in a FRAME_SIZE canvas (null until load() has resolved).
 * @returns {HTMLCanvasElement|null}
 */
export function bakeRunBody() {
  if (!picture) return null
  const box = RUN_BODY
  const canvas = bakeBox(picture, box, RUN_EYE_X - (box.eyeX - box.x) * RUN_SCALE, RUN_BODY_BOTTOM_Y - (box.bottomY - box.y) * RUN_SCALE, RUN_SCALE)
  liftBellyShading(canvas)
  return canvas
}

/**
 * One jump frame in a FRAME_SIZE canvas (null until load() has resolved).
 * @param {number} frame - 0..JUMP_FRAME_COUNT-1
 * @returns {HTMLCanvasElement|null}
 */
export function bakeJumpFrame(frame) {
  const box = JUMP[frame]
  return picture && bakeBox(picture, box, JUMP_EYE_X - (box.eyeX - box.x) * PICTURE_SCALE, FEET_Y - (JUMP_GROUND_Y - box.y) * PICTURE_SCALE)
}

/**
 * The idle stance in a FRAME_SIZE canvas with a pupil painted into each
 * open eye (null until load() has resolved). A pupil is a look direction
 * {x, y} of length 0..1 (0: straight ahead, 1: against the eye's rim);
 * null keeps that eye shut (its empty ring reads as a closed lid).
 * @param {Array<{x: number, y: number}|null>} pupils - Left eye, right eye
 * @returns {HTMLCanvasElement|null}
 */
export function bakeIdleFrame(pupils) {
  if (!picture) return null
  const work = document.createElement('canvas')
  work.width = IDLE.w
  work.height = IDLE.h
  const ctx = work.getContext('2d')
  ctx.drawImage(picture, IDLE.x, IDLE.y, IDLE.w, IDLE.h, 0, 0, IDLE.w, IDLE.h)
  const pupil = bakePupil()
  pupils.forEach((look, i) => look && ctx.drawImage(
    pupil,
    IDLE_EYES[i].x - IDLE.x + look.x * PUPIL_TRAVEL - pupil.width / 2,
    IDLE_EYES[i].y - IDLE.y + look.y * PUPIL_TRAVEL - pupil.height / 2
  ))
  pupil.width = 0
  pupil.height = 0
  const canvas = bakeBox(work, { x: 0, y: 0, w: IDLE.w, h: IDLE.h }, IDLE_CENTER_X - (IDLE.centerX - IDLE.x) * IDLE_SCALE, RUN_BODY_BOTTOM_Y - (IDLE.bottomY - IDLE.y) * IDLE_SCALE, IDLE_SCALE)
  work.width = 0
  work.height = 0
  liftBellyShading(canvas)
  return canvas
}
//
// The sheet on a canvas with its paper keyed out (an already transparent
// sheet passes through: its clear pixels count as paper too).
//
function keyOutBackground(img) {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const paper = floodPaper(image)
  followSoftEdge(image, paper)
  const edge = parseHex(CFG.visual.colors.hero.sheetEdge)
  const edgeLum = (edge[0] + edge[1] + edge[2]) / RGB
  const px = image.data
  paper.forEach((isPaper, j) => {
    const i = j * RGBA
    if (!isPaper || px[i + 3] === 0) return
    const lum = (px[i] + px[i + 1] + px[i + 2]) / RGB
    if (lum < KEY_EDGE_CORE_LUM) return
    const alpha = Math.round(255 * Math.max(0, Math.min(1, (KEY_PAPER_LUM - lum) / (KEY_PAPER_LUM - edgeLum))))
    px[i] = edge[0]
    px[i + 1] = edge[1]
    px[i + 2] = edge[2]
    px[i + 3] = Math.min(px[i + 3], alpha)
  })
  ctx.putImageData(image, 0, 0)
  return canvas
}
//
// Which pixels are paper: those reached from the sheet's border through
// clear, or light and neutral, pixels.
//
function floodPaper(image) {
  const { width: w, height: h, data: px } = image
  const paper = new Uint8Array(w * h)
  const stack = []
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1)
  while (stack.length) {
    const j = stack.pop()
    if (paper[j] || !isPaperPixel(px, j * RGBA)) continue
    paper[j] = 1
    const x = j % w
    x > 0 && stack.push(j - 1)
    x < w - 1 && stack.push(j + 1)
    j >= w && stack.push(j - w)
    j < w * (h - 1) && stack.push(j + w)
  }
  return paper
}
//
// Marks the outline's soft outer edge as paper too: ring by ring inwards
// from the paper, over pixels lighter than the outline's core.
//
function followSoftEdge(image, paper) {
  const { width: w, height: h, data: px } = image
  let ring = []
  paper.forEach((isPaper, j) => isPaper && ring.push(j))
  for (let step = 0; step < KEY_EDGE_PX && ring.length; step++) {
    const next = []
    ring.forEach(j => {
      const x = j % w
      const around = [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j - w, j + w]
      around.forEach(n => {
        if (n < 0 || n >= w * h || paper[n]) return
        const i = n * RGBA
        if ((px[i] + px[i + 1] + px[i + 2]) / RGB < KEY_EDGE_CORE_LUM) return
        paper[n] = 1
        next.push(n)
      })
    })
    ring = next
  }
}
function isPaperPixel(px, i) {
  if (px[i + 3] < OPAQUE_ALPHA) return true
  return (px[i] + px[i + 1] + px[i + 2]) / RGB >= KEY_PAPER_MIN_LUM && Math.abs(px[i] - px[i + 2]) <= KEY_NEUTRAL_SPREAD
}
//
// A sheet box scaled into a fresh FRAME_SIZE canvas with its top-left at (x, y).
//
function bakeBox(source, box, x, y, scale = PICTURE_SCALE) {
  const canvas = document.createElement('canvas')
  canvas.width = FRAME_SIZE
  canvas.height = FRAME_SIZE
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, box.x, box.y, box.w, box.h, x, y, box.w * scale, box.h * scale)
  return canvas
}
//
// Evens out a body's darkening belly bottom, column by column.
//
function liftBellyShading(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const image = ctx.getImageData(0, 0, FRAME_SIZE, FRAME_SIZE)
  for (let x = 0; x < FRAME_SIZE; x++) liftBellyColumn(image.data, x)
  ctx.putImageData(image, 0, 0)
}
function liftBellyColumn(px, x) {
  let bottom = FRAME_SIZE - 1
  while (bottom >= 0 && px[(bottom * FRAME_SIZE + x) * RGBA + 3] < OPAQUE_ALPHA) bottom--
  const refY = bottom - BELLY_LIFT_BAND
  if (refY < 0) return
  const ref = (refY * FRAME_SIZE + x) * RGBA
  if (px[ref + 3] < OPAQUE_ALPHA) return
  const refLum = px[ref] + px[ref + 1] + px[ref + 2]
  for (let y = refY + 1; y <= bottom; y++) {
    const i = (y * FRAME_SIZE + x) * RGBA
    if (px[i] + px[i + 1] + px[i + 2] < refLum * BELLY_INSIDE_SHARE) continue
    px[i] = px[ref]
    px[i + 1] = px[ref + 1]
    px[i + 2] = px[ref + 2]
  }
}
//
// One pupil at sheet scale, centred in its canvas: the dark disc with the
// glint notch cut out of it.
//
function bakePupil() {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(PUPIL_R * 2) + 2
  canvas.height = canvas.width
  const ctx = canvas.getContext('2d')
  const c = canvas.width / 2
  ctx.fillStyle = CFG.visual.colors.hero.eyePupil
  ctx.beginPath()
  ctx.arc(c, c, PUPIL_R, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.globalAlpha = GLINT_CUT
  ctx.beginPath()
  ctx.arc(c + GLINT_X, c + GLINT_Y, GLINT_R, 0, Math.PI * 2)
  ctx.fill()
  return canvas
}
