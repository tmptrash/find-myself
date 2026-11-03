import { loadPictureImage } from '../utils/forest-picture.js'
import { FOREST_LAYER_GRADE, applyForestLayerGradeToCanvas } from '../utils/forest-parallax-grain.js'
import { forestFilmGrainBlockPxForTier } from '../utils/forest-pixel-density.js'

//
// The water mushroom of forest level 0: a funnel mushroom with a moss cap
// and a sprout, cut from the 4x2 sheet assets/forest/water_mushroom.png
// (eight hand-painted frames of the same mushroom) and played as an idle
// loop. The sheet has no real transparency (a pale, half-opaque backdrop
// sits under every frame), so the backdrop is keyed out at load. Frames are
// aligned on the mound the mushroom stands on and baked once per live k.
//
const URL = 'forest/water_mushroom.png'
const SHEET_COLS = 4
const SHEET_ROWS = 2
const SPRITE_PREFIX = 'forest0-water-mushroom-v1'
const GRAIN_SEED = 6101
//
// Frames play in this order (indices into the sheet, row by row): the
// sheet's own order is not a smooth loop, this one has the least change
// between neighbours, last frame to first included.
//
const FRAME_ORDER = [0, 3, 7, 1, 2, 5, 4, 6]
const IDLE_FRAME_SEC = 0.16
//
// Height of the tallest frame in world px. The hero's hitbox is 69 px tall,
// so the mushroom never grows past the hero.
//
const MUSHROOM_HEIGHT = 66
//
// The mound sinks this much (world px) into the ground line, so no seam
// shows under it.
//
const GROUND_TUCK = 2
//
// Backdrop keying. A sheet pixel is part of the mushroom from this opacity:
// the backdrop sits below MATTE_ALPHA_LO, the mushroom above MATTE_ALPHA_HI,
// the soft edge between them is smoothed. In that edge zone (opacity below
// BACKDROP_ALPHA_BELOW) a pale, grey pixel is backdrop that leaked in between
// leaves and moss and is cleared.
//
const MATTE_ALPHA_LO = 215
const MATTE_ALPHA_HI = 240
const BACKDROP_ALPHA_BELOW = 250
const BACKDROP_SPREAD_MAX = 40
const BACKDROP_MIN_CHANNEL = 175
//
// Frame measuring: a pixel counts as the mushroom's body above this opacity;
// the mound's centre is taken over this many bottom rows.
//
const BODY_ALPHA = 128
const MOUND_ROWS = 50
//
// Source px kept under the mound's bottom row (its soft edge) and beside the
// widest frame.
//
const EDGE_PAD = 3
const PIXEL_BYTES = 4
const ALPHA_BYTE = 3
const image = loadPictureImage(URL)
const bakedByK = new WeakMap()

/**
 * Creates the mushroom standing on the ground line and starts its idle loop.
 * Needs load(k) to have resolved first.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - World X of the mound's centre
 * @param {number} cfg.y - World Y of the ground line
 * @param {number} cfg.z - Draw layer
 * @returns {Object|null} Mushroom inst (null if the frames are not baked)
 */
export function create(cfg) {
  const { k, x, y, z } = cfg
  const frames = bakedByK.get(k)
  if (!frames) return null
  const inst = {
    k,
    frames,
    frame: 0,
    timer: 0
  }
  const obj = k.add([
    k.pos(Math.round(x - frames.anchorX), Math.round(y + GROUND_TUCK - frames.anchorY)),
    k.z(z),
    { draw() { onDraw(inst) } }
  ])
  obj.onUpdate(() => onUpdate(inst))
  inst.obj = obj
  return inst
}
/**
 * Bakes the mushroom's frames once per live k (waits for the picture to load).
 * @param {Object} k - Kaplay instance
 * @returns {Promise<{sprites: string[], anchorX: number, anchorY: number}|null>} Frame sprites in
 *   play order and the ground point's offset from a frame's top-left (null if the
 *   picture failed to load)
 */
export async function load(k) {
  const cached = bakedByK.get(k)
  if (cached) return cached
  const img = await image
  if (!img) return null
  const frames = bakeFrames(k, img)
  bakedByK.set(k, frames)
  return frames
}

//
// Advances the idle loop.
//
function onUpdate(inst) {
  const cycle = IDLE_FRAME_SEC * inst.frames.sprites.length
  inst.timer = (inst.timer + inst.k.dt()) % cycle
  inst.frame = Math.floor(inst.timer / IDLE_FRAME_SEC)
}
//
// Draws the current frame at the object's origin.
//
function onDraw(inst) {
  inst.k.drawSprite({ sprite: inst.frames.sprites[inst.frame], pos: inst.k.vec2(0, 0) })
}
//
// Keys the sheet, aligns every frame on its mound and bakes them at world
// size, graded and grained like the forest's other baked material (one
// grain seed for all frames, so the grain does not flicker between them).
//
function bakeFrames(k, img) {
  const sheet = document.createElement('canvas')
  sheet.width = img.naturalWidth
  sheet.height = img.naturalHeight
  const ctx = sheet.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, sheet.width, sheet.height)
  keyBackdrop(data.data)
  ctx.putImageData(data, 0, 0)
  const cellW = Math.floor(sheet.width / SHEET_COLS)
  const cellH = Math.floor(sheet.height / SHEET_ROWS)
  const marks = FRAME_ORDER.map(cell => measureFrame(data.data, sheet.width, {
    x: (cell % SHEET_COLS) * cellW,
    y: Math.floor(cell / SHEET_COLS) * cellH,
    w: cellW,
    h: cellH
  }))
  //
  // One source box for all frames: the widest reach left and right of the
  // mound's centre, the tallest rise above its bottom row.
  //
  const reachL = Math.max(...marks.map(m => m.centerX - m.left))
  const reachR = Math.max(...marks.map(m => m.right - m.centerX))
  const rise = Math.max(...marks.map(m => m.bottom - m.top))
  const scale = MUSHROOM_HEIGHT / rise
  const srcW = reachL + reachR + 1
  const srcH = rise + 1 + EDGE_PAD
  const sprites = marks.map((mark, i) => {
    const canvas = shrinkRegion(sheet, {
      x: mark.centerX - reachL,
      y: mark.bottom - rise,
      w: srcW,
      h: srcH
    }, Math.ceil(srcW * scale), Math.ceil(srcH * scale))
    applyForestLayerGradeToCanvas(canvas, {
      ...FOREST_LAYER_GRADE.material,
      grainBlockSize: forestFilmGrainBlockPxForTier('gameplay')
    }, GRAIN_SEED)
    const name = `${SPRITE_PREFIX}-${i}`
    k.loadSprite(name, canvas)
    return name
  })
  sheet.width = 0
  sheet.height = 0
  return { sprites, anchorX: reachL * scale, anchorY: rise * scale }
}
//
// Turns the sheet's pale backdrop into transparency, in place.
//
function keyBackdrop(px) {
  for (let i = 0; i < px.length; i += PIXEL_BYTES) {
    const a = px[i + ALPHA_BYTE]
    const hi = Math.max(px[i], px[i + 1], px[i + 2])
    const lo = Math.min(px[i], px[i + 1], px[i + 2])
    const isBackdrop = a < BACKDROP_ALPHA_BELOW && hi - lo < BACKDROP_SPREAD_MAX && lo > BACKDROP_MIN_CHANNEL
    px[i + ALPHA_BYTE] = isBackdrop ? 0 : Math.round(smoothstep(MATTE_ALPHA_LO, MATTE_ALPHA_HI, a) * 255)
  }
}
//
// 0..1 ease between two edges.
//
function smoothstep(lo, hi, v) {
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)))
  return t * t * (3 - 2 * t)
}
//
// Where the mushroom stands inside one sheet cell (keyed pixels): its body's
// box and the centre of its mound over the bottom rows.
//
function measureFrame(px, sheetW, cell) {
  let left = cell.w
  let right = 0
  let top = cell.h
  let bottom = 0
  for (let y = 0; y < cell.h; y++) {
    for (let x = 0; x < cell.w; x++) {
      if (px[((cell.y + y) * sheetW + cell.x + x) * PIXEL_BYTES + ALPHA_BYTE] < BODY_ALPHA) continue
      x < left && (left = x)
      x > right && (right = x)
      y < top && (top = y)
      y > bottom && (bottom = y)
    }
  }
  let moundL = cell.w
  let moundR = 0
  for (let y = Math.max(top, bottom - MOUND_ROWS); y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (px[((cell.y + y) * sheetW + cell.x + x) * PIXEL_BYTES + ALPHA_BYTE] < BODY_ALPHA) continue
      x < moundL && (moundL = x)
      x > moundR && (moundR = x)
    }
  }
  return {
    left: cell.x + left,
    right: cell.x + right,
    top: cell.y + top,
    bottom: cell.y + bottom,
    centerX: Math.round(cell.x + (moundL + moundR) / 2)
  }
}
//
// A rect of the sheet on its own canvas at a smaller size, halved step by
// step so the downscale keeps the painted detail instead of skipping it.
//
function shrinkRegion(sheet, rect, dw, dh) {
  let src = document.createElement('canvas')
  src.width = rect.w
  src.height = rect.h
  src.getContext('2d').drawImage(sheet, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h)
  while (src.width > dw * 2 && src.height > dh * 2) {
    const half = document.createElement('canvas')
    half.width = Math.ceil(src.width / 2)
    half.height = Math.ceil(src.height / 2)
    const halfCtx = half.getContext('2d')
    halfCtx.imageSmoothingQuality = 'high'
    halfCtx.drawImage(src, 0, 0, half.width, half.height)
    src.width = 0
    src.height = 0
    src = half
  }
  const out = document.createElement('canvas')
  out.width = dw
  out.height = dh
  const ctx = out.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, dw, dh)
  src.width = 0
  src.height = 0
  return out
}
