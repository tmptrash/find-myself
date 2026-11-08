import { CFG } from '../cfg.js'
import { loadPictureImage } from '../sections/forest/utils/forest-picture.js'
//
// The hero's frames cut from assets/hero.png: the run cycle (top row, 8
// frames), the jump (bottom row, first 7 frames) and the idle stance (the
// last frame of the bottom row, its eye rings empty — the pupils are painted
// into them here). The sheet starts loading with this module (game boot).
//
// Every frame lands in the hero's FRAME_SIZE sprite canvas at PICTURE_SCALE,
// so the idle stance stands as tall as the hitbox, and is registered so the
// hero never jitters between frames:
//   - run and jump frames hold their eye still (the head stays put while the
//     legs and body move) at RUN_EYE_X / JUMP_EYE_X;
//   - run frames and the idle stance stand on their own lowest row;
//   - jump frames share their row's ground line, so the airborne poses keep
//     the lift the sheet gives them;
//   - the idle stance is centred on IDLE_CENTER_X.
//
const URL = 'hero.png'
export const FRAME_SIZE = 96
const PICTURE_SCALE = 70 / 171
const FEET_Y = 86
const RUN_EYE_X = 61.6
const JUMP_EYE_X = 56.5
const IDLE_CENTER_X = 48
//
// Sheet boxes (with a little clear margin round each figure) and anchors in
// sheet px: eyeX is the centre of the frame's eye ring, footY the bottom of
// its feet. JUMP_GROUND_Y is the jump row's ground line (its crouches).
//
const RUN = [
  { x: 78, y: 122, w: 102, h: 163, eyeX: 153.1, footY: 282 },
  { x: 348, y: 119, w: 102, h: 168, eyeX: 424.2, footY: 284 },
  { x: 621, y: 117, w: 103, h: 171, eyeX: 697, footY: 285 },
  { x: 892, y: 122, w: 104, h: 166, eyeX: 970.1, footY: 285 },
  { x: 1166, y: 123, w: 102, h: 163, eyeX: 1241.3, footY: 282 },
  { x: 1438, y: 121, w: 102, h: 167, eyeX: 1514.1, footY: 285 },
  { x: 1710, y: 117, w: 103, h: 171, eyeX: 1786.9, footY: 284 },
  { x: 1982, y: 122, w: 103, h: 166, eyeX: 2060, footY: 285 }
]
const JUMP_GROUND_Y = 632.5
const JUMP = [
  { x: 83, y: 509, w: 101, h: 127, eyeX: 155 },
  { x: 356, y: 439, w: 96, h: 178, eyeX: 423.8 },
  { x: 625, y: 454, w: 99, h: 132, eyeX: 696.7 },
  { x: 898, y: 460, w: 99, h: 99, eyeX: 969 },
  { x: 1173, y: 455, w: 99, h: 132, eyeX: 1244.4 },
  { x: 1445, y: 435, w: 97, h: 182, eyeX: 1514.6 },
  { x: 1715, y: 511, w: 102, h: 125, eyeX: 1787.2 }
]
const IDLE = { x: 1986, y: 456, w: 95, h: 177, centerX: 2033, footY: 630 }
//
// The idle eyes (ring centres, left then right) and the pupil painted into
// them, measured from the run/jump eyes: a near-black disc of PUPIL_R that
// sits PUPIL_TRAVEL off the eye's centre when it looks aside, with a light
// notch (the glint) on its upper left — GLINT_X/Y off the pupil's centre,
// GLINT_R wide, cutting GLINT_CUT of the pupil away. Sheet px.
//
const IDLE_EYES = [{ x: 2019.8, y: 487.5 }, { x: 2050.9, y: 487.5 }]
const PUPIL_R = 5.2
const PUPIL_TRAVEL = 5
const GLINT_X = -3.4
const GLINT_Y = -2.8
const GLINT_R = 1.9
const GLINT_CUT = 0.7
export const RUN_FRAME_COUNT = RUN.length
export const JUMP_FRAME_COUNT = JUMP.length
const sheet = loadPictureImage(URL)
let picture = null

/**
 * Waits for the hero sheet (once per page).
 * @returns {Promise<void>}
 */
export async function load() {
  picture ??= await sheet
}

/**
 * One run frame in a FRAME_SIZE canvas (null until load() has resolved).
 * @param {number} frame - 0..RUN_FRAME_COUNT-1
 * @returns {HTMLCanvasElement|null}
 */
export function bakeRunFrame(frame) {
  const box = RUN[frame]
  return picture && bakeBox(picture, box, RUN_EYE_X - (box.eyeX - box.x) * PICTURE_SCALE, FEET_Y - (box.footY - box.y) * PICTURE_SCALE)
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
  const canvas = bakeBox(work, { x: 0, y: 0, w: IDLE.w, h: IDLE.h }, IDLE_CENTER_X - (IDLE.centerX - IDLE.x) * PICTURE_SCALE, FEET_Y - (IDLE.footY - IDLE.y) * PICTURE_SCALE)
  work.width = 0
  work.height = 0
  return canvas
}
//
// A sheet box scaled into a fresh FRAME_SIZE canvas with its top-left at (x, y).
//
function bakeBox(source, box, x, y) {
  const canvas = document.createElement('canvas')
  canvas.width = FRAME_SIZE
  canvas.height = FRAME_SIZE
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, box.x, box.y, box.w, box.h, x, y, box.w * PICTURE_SCALE, box.h * PICTURE_SCALE)
  return canvas
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
