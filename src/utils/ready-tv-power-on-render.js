//
// CRT power-on renderer: dark tube → line → picture opening into snow, then
// looping snow backdrop until a fade-out. DOM-free so it can run inside a
// worker on an OffscreenCanvas and keep animating while the main thread is
// busy booting the engine.
//
export const TV_TIMELINE = {
  clickSec: 0.16,
  lineSpreadEndSec: 0.42,
  lineHoldEndSec: 0.95,
  openEndSec: 1.42
}
export const TV_EVENTS = {
  LOADER_REVEAL: 'loaderReveal',
  INTRO_DONE: 'introDone',
  FADE_DONE: 'fadeDone'
}
export const TV_WORKER_MSG = {
  INIT: 'init',
  SPOT: 'spot',
  FADE_OUT: 'fadeOut'
}
const TV_SNOW_LOADER_OPACITY = 0.82
const TV_BACKDROP_ROLL_OPACITY = 0.42
const TV_FADE_EASE_POW = 2.2
const TV_FALLBACK_FRAME_MS = 16
//
// Dark pool behind the loader panel so text and bar stand out from the snow.
//
const TV_LOADER_SPOT_RADIUS_PX = 420
const TV_LOADER_SPOT_OPACITY = 0.88
//
// Line look: thin overexposed core, wide cool halo, tapered ends.
//
const TV_DOT_RADIUS_PX = 3
const TV_LINE_CORE_MIN_PX = 1.5
const TV_LINE_CORE_MAX_PX = 4
const TV_LINE_HALO_PX = 46
const TV_LINE_HALO_OPACITY = 0.38
const TV_LINE_END_TAPER = 0.12
const TV_LINE_FLICKER = 0.22
const TV_LINE_JITTER_CHANCE = 0.18
const TV_LINE_JITTER_PX = 1
//
// Opening band: slight overshoot like the vertical deflection settling.
//
const TV_OPEN_OVERSHOOT = 1.04
const TV_OPEN_EDGE_GLOW_PX = 18
const TV_OPEN_FLASH_OPACITY = 0.85
//
// Snow: coarse luminance grain redrawn every frame on a small canvas.
//
const TV_SNOW_CELL_PX = 3
const TV_SNOW_OPEN_OPACITY = 0.9
const TV_SNOW_LINE_OPACITY = 0.55
//
// Rolling hum bar drifting down the picture while vertical sync locks.
//
const TV_ROLL_BAR_HEIGHT_FRAC = 0.22
const TV_ROLL_BAR_SPEED_FRAC = 0.9
const TV_ROLL_BAR_OPACITY = 0.35
//
// Glass: scanlines over everything.
//
const TV_SCANLINE_SPACING_PX = 3
const TV_SCANLINE_OPACITY = 0.28

/**
 * Creates the renderer on a 2D-capable canvas (HTML or Offscreen).
 * @param {Object} cfg
 * @param {HTMLCanvasElement|OffscreenCanvas} cfg.canvas - Target canvas, already sized
 * @param {Object} cfg.colors - { offRgb, coreRgb, haloRgb } as [r, g, b] plus snowPalette (packed ABGR)
 * @param {Function} cfg.emit - Receives TV_EVENTS values as the timeline advances
 * @returns {Object} Renderer inst
 */
export function create(cfg) {
  const { canvas, colors, emit } = cfg
  const inst = {
    canvas,
    ctx: canvas.getContext('2d'),
    w: canvas.width,
    h: canvas.height,
    emit,
    offRgb: colors.offRgb,
    coreRgb: colors.coreRgb,
    haloRgb: colors.haloRgb,
    snowPalette: colors.snowPalette,
    snowCanvas: null,
    snowCtx: null,
    snowImage: null,
    scanlines: null,
    startMs: 0,
    loaderRevealed: false,
    introDone: false,
    spotStrength: 1,
    fadeStartMs: null,
    fadeSec: 0,
    stopped: false
  }
  setupSnow(inst)
  setupGlass(inst)
  return inst
}

/**
 * Starts the frame loop: intro first, then the snow backdrop runs until fadeOut().
 * @param {Object} inst - Renderer inst
 */
export function start(inst) {
  inst.startMs = performance.now()
  requestFrame(() => onFrame(inst))
}

/**
 * Sets the dark pool strength behind the loader panel (0 hides it).
 * @param {Object} inst - Renderer inst
 * @param {number} strength - 0..1
 */
export function setSpotStrength(inst, strength) {
  inst.spotStrength = strength
}

/**
 * Fades the whole overlay to transparent, then emits FADE_DONE and stops.
 * @param {Object} inst - Renderer inst
 * @param {number} durationSec - Fade length
 */
export function fadeOut(inst, durationSec) {
  inst.fadeStartMs = performance.now()
  inst.fadeSec = durationSec
}

function onFrame(inst) {
  if (inst.stopped) return
  const now = performance.now()
  const sec = (now - inst.startMs) / 1000
  if (sec < TV_TIMELINE.openEndSec) {
    onDrawIntro(inst, sec)
  } else {
    !inst.introDone && finishIntroTimeline(inst)
    onDrawBackdrop(inst, sec)
  }
  if (inst.fadeStartMs != null && applyFade(inst, now)) return
  requestFrame(() => onFrame(inst))
}
//
// A hidden tab can deliver its first frame after the whole intro window, so
// LOADER_REVEAL must still precede INTRO_DONE — the page installs the loader
// hide handler that later fades this overlay out on that event.
//
function finishIntroTimeline(inst) {
  if (!inst.loaderRevealed) {
    inst.loaderRevealed = true
    inst.emit(TV_EVENTS.LOADER_REVEAL)
  }
  inst.introDone = true
  inst.emit(TV_EVENTS.INTRO_DONE)
}
//
// Erases a growing share of the finished frame so the scene underneath shows
// through; returns true once the overlay is fully transparent.
//
function applyFade(inst, now) {
  const t = Math.min(1, (now - inst.fadeStartMs) / (Math.max(0.01, inst.fadeSec) * 1000))
  const eased = 1 - Math.pow(1 - t, TV_FADE_EASE_POW)
  const { ctx, w, h } = inst
  ctx.globalCompositeOperation = 'destination-out'
  ctx.globalAlpha = eased
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  if (t < 1) return false
  ctx.clearRect(0, 0, w, h)
  inst.stopped = true
  inst.emit(TV_EVENTS.FADE_DONE)
  return true
}

function onDrawIntro(inst, sec) {
  if (!inst.loaderRevealed && sec >= TV_TIMELINE.lineHoldEndSec) {
    inst.loaderRevealed = true
    inst.emit(TV_EVENTS.LOADER_REVEAL)
  }
  const { ctx, w, h } = inst
  ctx.globalAlpha = 1
  ctx.fillStyle = rgbCss(inst.offRgb)
  ctx.fillRect(0, 0, w, h)
  if (sec >= TV_TIMELINE.clickSec && sec < TV_TIMELINE.lineSpreadEndSec) drawLineSpread(inst, sec)
  if (sec >= TV_TIMELINE.lineSpreadEndSec && sec < TV_TIMELINE.lineHoldEndSec) drawLineHold(inst, sec)
  if (sec >= TV_TIMELINE.lineHoldEndSec) drawPictureOpen(inst, sec)
  inst.loaderRevealed && drawLoaderSpot(inst, inst.spotStrength * phase(sec, TV_TIMELINE.lineHoldEndSec, TV_TIMELINE.openEndSec))
  drawGlass(inst)
}

function onDrawBackdrop(inst, sec) {
  const { ctx, w, h } = inst
  const rollSec = sec - TV_TIMELINE.openEndSec
  ctx.globalAlpha = 1
  ctx.fillStyle = rgbCss(inst.offRgb)
  ctx.fillRect(0, 0, w, h)
  drawSnow(inst, 0, h, TV_SNOW_LOADER_OPACITY)
  drawRollBar(inst, rollSec, 0, h, TV_BACKDROP_ROLL_OPACITY)
  inst.spotStrength > 0.001 && drawLoaderSpot(inst, inst.spotStrength)
  drawGlass(inst)
}
//
// Radial dark pool centred under the loader panel.
//
function drawLoaderSpot(inst, strength) {
  if (strength <= 0.001) return
  const { ctx, w, h } = inst
  const cx = w * 0.5
  const cy = h * 0.5
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, TV_LOADER_SPOT_RADIUS_PX)
  grad.addColorStop(0, rgbaCss(inst.offRgb, TV_LOADER_SPOT_OPACITY * strength))
  grad.addColorStop(0.55, rgbaCss(inst.offRgb, TV_LOADER_SPOT_OPACITY * strength * 0.7))
  grad.addColorStop(1, rgbaCss(inst.offRgb, 0))
  ctx.fillStyle = grad
  ctx.fillRect(cx - TV_LOADER_SPOT_RADIUS_PX, cy - TV_LOADER_SPOT_RADIUS_PX, TV_LOADER_SPOT_RADIUS_PX * 2, TV_LOADER_SPOT_RADIUS_PX * 2)
}
//
// Dot ignites in the centre and stretches sideways into a full-width line.
//
function drawLineSpread(inst, sec) {
  const p = easeOutCubic(phase(sec, TV_TIMELINE.clickSec, TV_TIMELINE.lineSpreadEndSec))
  const halfW = Math.max(TV_DOT_RADIUS_PX, p * inst.w * 0.5)
  drawBurningLine(inst, halfW, TV_LINE_CORE_MIN_PX + p, flicker())
}
//
// Line burns at full width, thickening slightly with a nervous flicker.
//
function drawLineHold(inst, sec) {
  const p = phase(sec, TV_TIMELINE.lineSpreadEndSec, TV_TIMELINE.lineHoldEndSec)
  const core = TV_LINE_CORE_MIN_PX + 1 + p * (TV_LINE_CORE_MAX_PX - TV_LINE_CORE_MIN_PX - 1)
  drawBurningLine(inst, inst.w * 0.5, core, flicker())
}
//
// Vertical deflection opens the picture from the centre; the band is
// overexposed snow with glowing top/bottom edges.
//
function drawPictureOpen(inst, sec) {
  const p = phase(sec, TV_TIMELINE.lineHoldEndSec, TV_TIMELINE.openEndSec)
  const open = Math.min(1, easeOutBack(p) * TV_OPEN_OVERSHOOT)
  const cy = inst.h * 0.5
  const halfH = Math.max(TV_LINE_CORE_MAX_PX * 0.5, open * cy)
  const top = cy - halfH
  const bandH = halfH * 2
  const snowOp = TV_SNOW_LINE_OPACITY + (TV_SNOW_OPEN_OPACITY - TV_SNOW_LINE_OPACITY) * p
  drawSnow(inst, top, bandH, snowOp)
  drawRollBar(inst, sec, top, bandH)
  const { ctx, w } = inst
  ctx.globalAlpha = TV_OPEN_FLASH_OPACITY * (1 - p) * flicker()
  ctx.fillStyle = rgbCss(inst.coreRgb)
  ctx.fillRect(0, top, w, bandH)
  drawBandEdge(inst, top, 1 - p)
  drawBandEdge(inst, top + bandH, 1 - p)
  ctx.globalAlpha = 1
}

function drawBurningLine(inst, halfW, coreH, bright) {
  const { ctx, w, h } = inst
  const cx = w * 0.5
  const jitter = Math.random() < TV_LINE_JITTER_CHANCE ? (Math.random() < 0.5 ? -1 : 1) * TV_LINE_JITTER_PX : 0
  const cy = h * 0.5 + jitter
  //
  // Elliptical halo — brightest at the centre of the tube, fading to the ends.
  //
  const haloGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  haloGrad.addColorStop(0, rgbaCss(inst.haloRgb, TV_LINE_HALO_OPACITY * bright))
  haloGrad.addColorStop(0.6, rgbaCss(inst.haloRgb, TV_LINE_HALO_OPACITY * bright * 0.5))
  haloGrad.addColorStop(1, rgbaCss(inst.haloRgb, 0))
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(halfW, TV_LINE_HALO_PX * 0.5)
  ctx.fillStyle = haloGrad
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
  const coreGrad = ctx.createLinearGradient(cx - halfW, 0, cx + halfW, 0)
  coreGrad.addColorStop(0, rgbaCss(inst.coreRgb, 0))
  coreGrad.addColorStop(TV_LINE_END_TAPER, rgbaCss(inst.coreRgb, bright))
  coreGrad.addColorStop(1 - TV_LINE_END_TAPER, rgbaCss(inst.coreRgb, bright))
  coreGrad.addColorStop(1, rgbaCss(inst.coreRgb, 0))
  ctx.fillStyle = coreGrad
  ctx.fillRect(cx - halfW, cy - coreH * 0.5, halfW * 2, coreH)
}

function drawBandEdge(inst, y, strength) {
  if (strength <= 0.001) return
  const { ctx, w } = inst
  const grad = ctx.createLinearGradient(0, y - TV_OPEN_EDGE_GLOW_PX, 0, y + TV_OPEN_EDGE_GLOW_PX)
  grad.addColorStop(0, rgbaCss(inst.haloRgb, 0))
  grad.addColorStop(0.5, rgbaCss(inst.coreRgb, strength))
  grad.addColorStop(1, rgbaCss(inst.haloRgb, 0))
  ctx.globalAlpha = 1
  ctx.fillStyle = grad
  ctx.fillRect(0, y - TV_OPEN_EDGE_GLOW_PX, w, TV_OPEN_EDGE_GLOW_PX * 2)
}
//
// Regenerates the coarse snow frame (write-only putImageData, no readback)
// and blits the requested band of it, pixelated.
//
function drawSnow(inst, top, bandH, opacity) {
  const { snowCtx, snowImage, snowPalette, snowCanvas, ctx, w, h } = inst
  const pixels = new Uint32Array(snowImage.data.buffer)
  const last = snowPalette.length - 1
  for (let i = 0; i < pixels.length; i++) {
    const r = Math.random()
    pixels[i] = snowPalette[Math.min(last, Math.floor(r * r * snowPalette.length))]
  }
  snowCtx.putImageData(snowImage, 0, 0)
  const srcTop = (top / h) * snowCanvas.height
  const srcH = Math.max(1, (bandH / h) * snowCanvas.height)
  ctx.globalAlpha = opacity
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(snowCanvas, 0, srcTop, snowCanvas.width, srcH, 0, top, w, bandH)
  ctx.globalAlpha = 1
}

function drawRollBar(inst, sec, top, bandH, strength = 1) {
  const { ctx, w, h } = inst
  const barH = h * TV_ROLL_BAR_HEIGHT_FRAC
  const y = ((sec * TV_ROLL_BAR_SPEED_FRAC * h) % (h + barH)) - barH
  const y0 = Math.max(top, y)
  const y1 = Math.min(top + bandH, y + barH)
  if (y1 <= y0) return
  ctx.globalAlpha = TV_ROLL_BAR_OPACITY * strength
  ctx.fillStyle = rgbCss(inst.offRgb)
  ctx.fillRect(0, y0, w, y1 - y0)
  ctx.globalAlpha = 1
}

function drawGlass(inst) {
  const { ctx, w, h } = inst
  ctx.globalAlpha = TV_SCANLINE_OPACITY
  ctx.fillStyle = inst.scanlines
  ctx.fillRect(0, 0, w, h)
  ctx.globalAlpha = 1
}

function setupSnow(inst) {
  inst.snowCanvas = new OffscreenCanvas(Math.ceil(inst.w / TV_SNOW_CELL_PX), Math.ceil(inst.h / TV_SNOW_CELL_PX))
  inst.snowCtx = inst.snowCanvas.getContext('2d')
  inst.snowImage = inst.snowCtx.createImageData(inst.snowCanvas.width, inst.snowCanvas.height)
}

function setupGlass(inst) {
  const tile = new OffscreenCanvas(1, TV_SCANLINE_SPACING_PX)
  const tileCtx = tile.getContext('2d')
  tileCtx.fillStyle = rgbCss(inst.offRgb)
  tileCtx.fillRect(0, 0, 1, 1)
  inst.scanlines = inst.ctx.createPattern(tile, 'repeat')
}
//
// Dedicated workers with OffscreenCanvas expose requestAnimationFrame in
// Chromium; the timeout keeps older runtimes animating.
//
function requestFrame(cb) {
  typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : setTimeout(cb, TV_FALLBACK_FRAME_MS)
}

function flicker() {
  return 1 - Math.random() * TV_LINE_FLICKER
}

function phase(sec, start, end) {
  return Math.min(1, Math.max(0, (sec - start) / (end - start)))
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

function easeOutBack(t) {
  const c = 1.4
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2)
}

function rgbCss([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`
}

function rgbaCss([r, g, b], a) {
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
