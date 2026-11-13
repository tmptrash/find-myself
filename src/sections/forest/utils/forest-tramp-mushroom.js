import { loadPictureImage } from './forest-picture.js'
import { applyForestGameplaySharpBake } from './forest-focus-depth.js'
//
// The trampoline mushrooms' pictures from assets/forest/big_mushrooms.png
// (a 6 × 4 sheet, counted row by row): the 4th — a wide cream parasol — for
// the first trampoline (by the left tree's branch), the 14th — a flat cream
// cap with brown spots — for the second (on the ground to the right), the
// 5th — a small brown one on a tall stem — for the third (in the cave).
// Baked once per live k at the trampolines' cap height; the
// level squashes the sprite as the hero lands. The sheet starts loading
// with this module (game boot).
//
// The sheet may come without transparency (a light grey/white checker
// painted in its background), so every mushroom is cut from its box and
// keyed: the light, colourless pixels reachable from the box's border are
// background (the mushroom's dark contour stops the fill).
//
const URL = 'forest/big_mushrooms.png'
const SPRITE_PREFIX = 'forest0-tramp-mushroom-v3'
const GRAIN_SEED = 7180
//
// Each mushroom: its box on the sheet, the row of its stem's foot and the
// top row of its cap (sheet px).
//
export const TRAMP_MUSHROOM = { BRANCH: 0, RIGHT: 1, CAVE: 2 }
const MUSHROOMS = [
  { x: 758, y: 127, w: 183, h: 148, baseY: 274, capTopY: 130 },
  { x: 259, y: 609, w: 220, h: 130, baseY: 738, capTopY: 612 },
  { x: 1025, y: 130, w: 112, h: 145, baseY: 274, capTopY: 133 }
]
//
// Background key: a pixel this light whose channels differ by less than
// KEY_GREY is checker; seen through alpha it is background too.
//
const KEY_LIGHT = 190
const KEY_GREY = 14
const KEY_ALPHA = 8
const RGBA = 4
//
// A trampoline squashes down by up to SQUASH_MAX as the hero lands on it
// (drawn 1 - squash × SQUASH_DRAW tall) and springs back at SQUASH_RELAX per
// second. Left alone it now and then (every IDLE_SQUEEZE_MIN..+RANGE
// seconds) narrows slowly towards its middle, by up to IDLE_SQUEEZE_MAX of
// its width over IDLE_SQUEEZE_IN_SEC (eased in and out), then snaps back
// wide: a damped spring (IDLE_SNAP_HZ, dying at IDLE_SNAP_DAMP per second)
// that overshoots a little and settles in IDLE_SNAP_SEC — looks only, its
// collider stays.
//
export const SQUASH_MAX = 0.35
export const SQUASH_DRAW = 0.35
export const SQUASH_RELAX = 4
const IDLE_SQUEEZE_MIN = 4
const IDLE_SQUEEZE_RANGE = 6
const IDLE_SQUEEZE_MAX = 0.12
const IDLE_SQUEEZE_IN_SEC = 1.6
const IDLE_SNAP_HZ = 3.6
const IDLE_SNAP_DAMP = 12
const IDLE_SNAP_SEC = 0.4
const SQUEEZE_PHASE = { IN: 1, SNAP: 2 }
//
// A squeeze is drawn from a baked sheet of squeezed pictures, not by scaling
// the sprite (nearest scaling drops whole pixel columns and the mushroom's
// texture ripples): each frame narrows the picture row by row, smoothly
// resampled, by nothing at the stem's foot up to the frame's squeeze at the
// cap's top, towards the mushroom's own middle (half way between its
// leftmost and rightmost pixels solid from MIDDLE_ALPHA) — so the foot never
// moves and both sides come in evenly. Frames go SQUEEZE_STEP apart, from
// SQUEEZE_WIDE_FRAMES steps wider (the snap's overshoot) to IDLE_SQUEEZE_MAX
// narrower, laid out SQUEEZE_COLS a row.
//
const SQUEEZE_STEP = 0.01
const SQUEEZE_WIDE_FRAMES = 3
const SQUEEZE_FRAMES = SQUEEZE_WIDE_FRAMES + Math.round(IDLE_SQUEEZE_MAX / SQUEEZE_STEP) + 1
const SQUEEZE_COLS = 4
const SQUEEZE_SUFFIX = '-squeeze'
const MIDDLE_ALPHA = 128
const sheet = loadPictureImage(URL)
let cuts = null

/**
 * Waits for the big mushroom sheet and cuts both trampoline mushrooms out
 * of it with their background keyed out (once per page).
 * @returns {Promise<void>}
 */
export async function load() {
  if (cuts) return
  const img = await sheet
  cuts ??= img && MUSHROOMS.map(box => cutKeyed(img, box))
}

/**
 * Counts a trampoline down to its next idle squeeze and runs it (not while
 * it springs back or cools down from a bounce; a landing cuts it short).
 * @param {{squash: number, cooldown?: number}|null} state - Trampoline state
 * @param {number} dt - Seconds since the last frame
 * @returns {boolean} True on the frame it snaps back wide (for its sound)
 */
export function tickIdleSqueeze(state, dt) {
  if (!state) return false
  state.idleSqueezeIn ??= IDLE_SQUEEZE_MIN + Math.random() * IDLE_SQUEEZE_RANGE
  if (state.idleSqueezePhase) return advanceSqueeze(state, dt)
  if (state.squash > 0 || state.cooldown > 0) return false
  state.idleSqueezeIn -= dt
  if (state.idleSqueezeIn > 0) return false
  state.idleSqueezePhase = SQUEEZE_PHASE.IN
  state.idleSqueezeT = 0
  state.idleSqueezeIn = IDLE_SQUEEZE_MIN + Math.random() * IDLE_SQUEEZE_RANGE
  return false
}

/**
 * How high the top of a mushroom's cap stands over its stem's foot at a
 * width.
 * @param {number} kind - One of TRAMP_MUSHROOM
 * @param {number} width - Picture width in world px
 * @returns {number}
 */
export function capHeight(kind, width) {
  const box = MUSHROOMS[kind]
  return (box.baseY - box.capTopY) / box.w * width
}

/**
 * The width at which a mushroom's cap stands a given height over its foot.
 * @param {number} kind - One of TRAMP_MUSHROOM
 * @param {number} height - Cap height in world px
 * @returns {number}
 */
export function widthForCapHeight(kind, height) {
  return height / capHeight(kind, 1)
}

/**
 * A trampoline mushroom's sprite at a width (baked once per live k, kind and
 * width; null until load() has resolved). Its bottom row is the stem's foot.
 * @param {Object} k - Kaplay instance
 * @param {number} kind - One of TRAMP_MUSHROOM
 * @param {number} width - Sprite width in world px
 * @returns {string|null} Sprite name
 */
export function bake(k, kind, width) {
  if (!cuts) return null
  const w = Math.round(width)
  const name = `${SPRITE_PREFIX}-${kind}-${w}`
  if (k.getSprite(name)) return name
  const box = MUSHROOMS[kind]
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = Math.round((box.baseY - box.y) / box.w * w)
  paint(canvas.getContext('2d'), kind, w / 2, canvas.height, w)
  const middleX = measureMiddle(canvas)
  applyForestGameplaySharpBake(canvas, GRAIN_SEED + kind)
  k.loadSprite(name, canvas)
  bakeSqueezeSheet(k, name + SQUEEZE_SUFFIX, canvas, middleX)
  canvas.width = 0
  canvas.height = 0
  return name
}

/**
 * What to draw for a trampoline this frame: its plain sprite, or a frame of
 * its squeeze sheet while it squeezes (same picture centre and bottom, so
 * both draw with anchor 'bot' at one spot).
 * @param {string} sprite - From bake()
 * @param {Object} state - Trampoline state
 * @param {{sprite: string, frame: number}} out - Written and returned
 * @returns {{sprite: string, frame: number}}
 */
export function squeezeLook(sprite, state, out) {
  out.sprite = sprite
  out.frame = 0
  if (!state.idleSqueezePhase) return out
  const step = Math.round(squeezeOf(state) / SQUEEZE_STEP) + SQUEEZE_WIDE_FRAMES
  out.sprite = sprite + SQUEEZE_SUFFIX
  out.frame = Math.max(0, Math.min(SQUEEZE_FRAMES - 1, step))
  return out
}

/**
 * Paints a trampoline mushroom with its stem's foot at (cx, baseY) (the
 * menu backdrop bakes it into its scene). Nothing until load() has resolved.
 * @param {CanvasRenderingContext2D} ctx - Target context
 * @param {number} kind - One of TRAMP_MUSHROOM
 * @param {number} cx - Centre X
 * @param {number} baseY - Y of the stem's foot
 * @param {number} width - Width of the picture
 */
export function paint(ctx, kind, cx, baseY, width) {
  if (!cuts) return
  const box = MUSHROOMS[kind]
  const scale = width / box.w
  ctx.save()
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(cuts[kind], cx - width / 2, baseY - (box.baseY - box.y) * scale, width, box.h * scale)
  ctx.restore()
}
//
// One mushroom's box with its background keyed out.
//
function cutKeyed(img, box) {
  const canvas = document.createElement('canvas')
  canvas.width = box.w
  canvas.height = box.h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h)
  const image = ctx.getImageData(0, 0, box.w, box.h)
  clearBackground(image.data, box.w, box.h)
  ctx.putImageData(image, 0, 0)
  return canvas
}
//
// Flood fill from the border over background pixels, clearing them.
//
function clearBackground(px, w, h) {
  const fill = { px, seen: new Uint8Array(w * h), stack: [] }
  for (let x = 0; x < w; x++) {
    pushBackground(fill, x)
    pushBackground(fill, (h - 1) * w + x)
  }
  for (let y = 0; y < h; y++) {
    pushBackground(fill, y * w)
    pushBackground(fill, y * w + w - 1)
  }
  while (fill.stack.length) {
    const i = fill.stack.pop()
    px[i * RGBA + 3] = 0
    const x = i % w
    x > 0 && pushBackground(fill, i - 1)
    x < w - 1 && pushBackground(fill, i + 1)
    i >= w && pushBackground(fill, i - w)
    i < w * (h - 1) && pushBackground(fill, i + w)
  }
}
function pushBackground(fill, i) {
  if (fill.seen[i] || !isBackground(fill.px, i * RGBA)) return
  fill.seen[i] = 1
  fill.stack.push(i)
}
function isBackground(px, o) {
  if (px[o + 3] < KEY_ALPHA) return true
  const hi = Math.max(px[o], px[o + 1], px[o + 2])
  const lo = Math.min(px[o], px[o + 1], px[o + 2])
  return hi > KEY_LIGHT && hi - lo < KEY_GREY
}
//
// Half way between the leftmost and rightmost solid pixels of a picture.
//
function measureMiddle(canvas) {
  const w = canvas.width
  const px = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, canvas.height).data
  let left = w
  let right = -1
  for (let i = 0; i < w * canvas.height; i++) {
    if (px[i * RGBA + 3] < MIDDLE_ALPHA) continue
    left = Math.min(left, i % w)
    right = Math.max(right, i % w)
  }
  return right < 0 ? w / 2 : (left + right + 1) / 2
}
//
// The squeeze sheet: every frame resamples each row of the picture narrower
// (or wider) about middleX, by its squeeze times the row's height share.
//
function bakeSqueezeSheet(k, name, canvas, middleX) {
  const w = canvas.width
  const h = canvas.height
  const pad = Math.ceil(w * SQUEEZE_WIDE_FRAMES * SQUEEZE_STEP / 2) + 1
  const cellW = w + pad * 2
  const rows = Math.ceil(SQUEEZE_FRAMES / SQUEEZE_COLS)
  const sheetCanvas = document.createElement('canvas')
  sheetCanvas.width = cellW * SQUEEZE_COLS
  sheetCanvas.height = h * rows
  const ctx = sheetCanvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  for (let f = 0; f < SQUEEZE_FRAMES; f++) {
    const squeeze = (f - SQUEEZE_WIDE_FRAMES) * SQUEEZE_STEP
    const cellX = (f % SQUEEZE_COLS) * cellW + pad
    const cellY = Math.floor(f / SQUEEZE_COLS) * h
    for (let y = 0; y < h; y++) {
      const scaleX = 1 - squeeze * (h - 1 - y) / Math.max(1, h - 1)
      ctx.drawImage(canvas, 0, y, w, 1, cellX + middleX * (1 - scaleX), cellY + y, w * scaleX, 1)
    }
  }
  k.loadSprite(name, sheetCanvas, { sliceX: SQUEEZE_COLS, sliceY: rows })
  sheetCanvas.width = 0
  sheetCanvas.height = 0
}
//
// One frame of a running squeeze: slowly in, then the snap back; a landing
// cuts it short. True on the frame it snaps.
//
function advanceSqueeze(state, dt) {
  state.idleSqueezeT += dt
  if (state.squash > 0) {
    state.idleSqueezePhase = null
    return false
  }
  if (state.idleSqueezePhase === SQUEEZE_PHASE.IN) {
    if (state.idleSqueezeT < IDLE_SQUEEZE_IN_SEC) return false
    state.idleSqueezePhase = SQUEEZE_PHASE.SNAP
    state.idleSqueezeT = 0
    return true
  }
  state.idleSqueezeT >= IDLE_SNAP_SEC && (state.idleSqueezePhase = null)
  return false
}
//
// How much narrower a trampoline's cap is this frame (share of its width;
// below 0 while it overshoots wide).
//
function squeezeOf(state) {
  if (state.idleSqueezePhase === SQUEEZE_PHASE.IN) {
    const u = state.idleSqueezeT / IDLE_SQUEEZE_IN_SEC
    return IDLE_SQUEEZE_MAX * u * u * (3 - 2 * u)
  }
  if (state.idleSqueezePhase !== SQUEEZE_PHASE.SNAP) return 0
  const t = state.idleSqueezeT
  return IDLE_SQUEEZE_MAX * Math.exp(-IDLE_SNAP_DAMP * t) * Math.cos(Math.PI * 2 * IDLE_SNAP_HZ * t)
}
