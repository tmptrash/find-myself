import { GLOW_PAL, glowRgb } from './glow-palette.js'

//
// Baked blur + film-grain passes for glow sprites (parallax forest, decor,
// hero, tree, water frames). Applied once at bake time so runtime draw
// stays a plain blit.
//
const GRAIN_ALPHA_MIN = 8
//
// Film grain must not brighten the outline rim — noise on dark ink pixels
// reads as a grey fringe between the light body and the outer contour.
// Perceptual luminance (not a flat per-channel cap) so hued dark outlines
// like glow's bluish-gray rim (#2f3b3d, luminance ~56) are still protected.
//
const GRAIN_OUTLINE_LUM_MAX = 90
//
// Shared film-grain look for every glow bake (matches the near parallax row).
//
export const GLOW_FILM_GRAIN = {
  strength: 10,
  blockSize: 1,
  seed: 43011
}

/**
 * Adds the standard glow film grain to a baked canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {number} [seedOffset=0] - Per-sprite seed tweak so repeats do not align
 */
export function applyGlowFilmGrainToCanvas(canvas, seedOffset = 0) {
  if (!canvas?.width || !canvas?.height) return
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  applyFilmGrainToContext(ctx, canvas.width, canvas.height, grainCfg(seedOffset))
}

/**
 * Blurs then adds the standard glow film grain to a parallax forest canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width - Canvas width in px
 * @param {number} height - Canvas height in px
 * @param {Object} cfg
 * @param {number} [cfg.blurRadius] - Gaussian blur radius in px (0 = skip)
 * @param {number} [cfg.grainSeedOffset] - Extra seed offset for this layer
 */
export const GLOW_LAYER_GRADE = {
  far: { contrast: 0.2, saturation: 0.28 },
  mid: { contrast: 0.38, saturation: 0.38 },
  near: { contrast: 0.55, saturation: 0.48 },
  foreground: { contrast: 0.75, saturation: 0.65 }
}
/**
 * Applies depth contrast/saturation plus optional film grain to a baked canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {{ contrast: number, saturation: number }} grade
 * @param {number} [seedOffset=0]
 */
export function applyGlowLayerGradeToCanvas(canvas, grade, seedOffset = 0) {
  if (!canvas?.width || !canvas?.height || !grade) return
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  applyContrastSaturationToContext(ctx, canvas.width, canvas.height, grade.contrast, grade.saturation)
  applyFilmGrainToContext(ctx, canvas.width, canvas.height, grainCfg(seedOffset))
}
export function applyParallaxPostFxToContext(ctx, width, height, cfg) {
  if (!cfg) return
  cfg.blurRadius > 0 && applyBlurToContext(ctx, width, height, cfg.blurRadius)
  cfg.grade && applyContrastSaturationToContext(ctx, width, height, cfg.grade.contrast, cfg.grade.saturation)
  applyFilmGrainToContext(ctx, width, height, grainCfg(cfg.grainSeedOffset ?? 0))
}
//
// Softens a baked layer via canvas filter blur. Resets any active transform
// while copying back so content painted under ctx.translate() stays aligned.
//
function applyBlurToContext(ctx, width, height, radiusPx) {
  if (!radiusPx || radiusPx <= 0) return
  const src = ctx.canvas
  const scratch = document.createElement('canvas')
  scratch.width = width
  scratch.height = height
  const scratchCtx = scratch.getContext('2d')
  scratchCtx.filter = `blur(${radiusPx}px)`
  scratchCtx.drawImage(src, 0, 0, width, height)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(scratch, 0, 0, width, height)
  ctx.restore()
  scratch.width = 0
  scratch.height = 0
}
//
// Shifts pixel contrast around mid-grey and lerps colour toward luminance.
//
function applyContrastSaturationToContext(ctx, width, height, contrast, saturation) {
  if (contrast >= 0.999 && saturation >= 0.999) return
  const imageData = ctx.getImageData(0, 0, width, height)
  const px = imageData.data
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < GRAIN_ALPHA_MIN) continue
    const r = px[i]
    const g = px[i + 1]
    const b = px[i + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    let nr = lum + (r - lum) * saturation
    let ng = lum + (g - lum) * saturation
    let nb = lum + (b - lum) * saturation
    nr = (nr - 128) * contrast + 128
    ng = (ng - 128) * contrast + 128
    nb = (nb - 128) * contrast + 128
    px[i] = clamp255(nr)
    px[i + 1] = clamp255(ng)
    px[i + 2] = clamp255(nb)
  }
  ctx.putImageData(imageData, 0, 0)
}
//
// Adds luminance film grain to every opaque pixel on a baked canvas.
//
function applyFilmGrainToContext(ctx, width, height, cfg) {
  const { strength, blockSize, seed, inkAlphaMin = GRAIN_ALPHA_MIN } = cfg
  if (!strength || strength <= 0) return
  const block = Math.max(1, blockSize | 0)
  const imageData = ctx.getImageData(0, 0, width, height)
  const px = imageData.data
  for (let y = 0; y < height; y++) {
    const by = (y / block) | 0
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (px[i + 3] < inkAlphaMin) continue
      const luminance = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
      if (luminance < GRAIN_OUTLINE_LUM_MAX) continue
      const bx = (x / block) | 0
      const n = grainNoise(seed, bx, by) * strength
      px[i] = clamp255(px[i] + n)
      px[i + 1] = clamp255(px[i + 1] + n)
      px[i + 2] = clamp255(px[i + 2] + n)
    }
  }
  ctx.putImageData(imageData, 0, 0)
}
//
// Builds a grain cfg from the shared glow preset plus an optional seed offset.
//
function grainCfg(seedOffset = 0) {
  return {
    strength: GLOW_FILM_GRAIN.strength,
    blockSize: GLOW_FILM_GRAIN.blockSize,
    seed: GLOW_FILM_GRAIN.seed + (seedOffset | 0)
  }
}
//
// Deterministic hash noise in [-1, 1] for one pixel block.
//
function grainNoise(seed, bx, by) {
  let h = (seed + bx * 374761393 + by * 668265263) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 2147483647.5 - 1
}
//
// Clamps a channel after grain offset.
//
function clamp255(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0
}
//
// Full-screen film-grain overlay for non-baked scenes (menu, ready) — tiles
// the same luminance noise as the glow bake pass across the whole viewport.
//
const GRAIN_OVERLAY_TILE = 256
const GRAIN_OVERLAY_SPRITE = 'glow-film-grain-tile'
const GRAIN_OVERLAY_OPACITY = 0.28
let grainOverlayTileCanvas = null
//
// Bakes one repeatable grain tile for the runtime overlay.
//
function buildGrainOverlayTile() {
  if (grainOverlayTileCanvas) return grainOverlayTileCanvas
  const size = GRAIN_OVERLAY_TILE
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(size, size)
  const px = imageData.data
  const { strength, seed, blockSize } = GLOW_FILM_GRAIN
  const block = Math.max(1, blockSize | 0)
  for (let y = 0; y < size; y++) {
    const by = (y / block) | 0
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const bx = (x / block) | 0
      const n = grainNoise(seed, bx, by) * strength
      const v = clamp255(128 + n * 2.2)
      px[i] = v
      px[i + 1] = v
      px[i + 2] = v
      px[i + 3] = 255
    }
  }
  ctx.putImageData(imageData, 0, 0)
  grainOverlayTileCanvas = canvas
  return canvas
}
//
// Loads the grain tile sprite once per Kaplay instance.
//
function ensureGlowFilmGrainOverlaySprite(k) {
  if (k.getSprite(GRAIN_OVERLAY_SPRITE)) return
  k.loadSprite(GRAIN_OVERLAY_SPRITE, buildGrainOverlayTile())
}
/**
 * Draws the shared grain tile across one WORLD-space rect (scrolls with the
 * camera, unlike addGlowFilmGrainOverlayLayer's fixed full-screen version) —
 * for small live-drawn (not baked) shapes that need the same grain look as
 * the game's baked sprites without baking their own canvas.
 * @param {Object} k - Kaplay instance
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} [opacity] - Defaults to the standard overlay opacity
 */
export function drawGlowFilmGrainWorldPatch(k, x1, y1, x2, y2, opacity = GRAIN_OVERLAY_OPACITY) {
  ensureGlowFilmGrainOverlaySprite(k)
  const tile = GRAIN_OVERLAY_TILE
  for (let y = y1; y < y2; y += tile) {
    for (let x = x1; x < x2; x += tile) {
      k.drawSprite({
        sprite: GRAIN_OVERLAY_SPRITE,
        pos: k.vec2(x, y),
        width: tile,
        height: tile,
        opacity
      })
    }
  }
}
//
// Draws the grain tile across the full viewport (call from a fixed draw layer).
//
function drawGlowFilmGrainOverlay(k) {
  ensureGlowFilmGrainOverlaySprite(k)
  const w = k.width()
  const h = k.height()
  const tile = GRAIN_OVERLAY_TILE
  for (let y = 0; y < h; y += tile) {
    for (let x = 0; x < w; x += tile) {
      k.drawSprite({
        sprite: GRAIN_OVERLAY_SPRITE,
        pos: k.vec2(x, y),
        width: tile,
        height: tile,
        opacity: GRAIN_OVERLAY_OPACITY,
        fixed: true
      })
    }
  }
}
/**
 * Adds a fixed full-screen film-grain layer on top of the scene.
 * @param {Object} k - Kaplay instance
 * @param {number} zIndex - Draw order (above gameplay/UI, below leave covers)
 */
export function addGlowFilmGrainOverlayLayer(k, zIndex) {
  ensureGlowFilmGrainOverlaySprite(k)
  k.add([
    k.fixed(),
    k.z(zIndex),
    { draw() { drawGlowFilmGrainOverlay(k) } }
  ])
}
/**
 * One puffy foliage clump — shadow base, mid fill, highlight rim (nearest
 * parallax bush row and tree crowns share this bake-time look).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - Centre X
 * @param {number} cy - Centre Y
 * @param {number} radius - Clump radius
 * @param {{ r: number, g: number, b: number }} baseRgb - Fallback mid tone
 * @param {number} [seed=0] - Per-clump seed
 */
export function drawGlowHiResFoliageCluster(ctx, cx, cy, radius, baseRgb, seed = 0) {
  const shades = GLOW_PAL.treeColor.leafShades.map(h => glowRgb(h))
  const shadow = shades[0] || baseRgb
  const mid = shades[2] || baseRgb
  const highlight = shades[Math.min(3, shades.length - 1)] || baseRgb
  let state = (seed * 1103515245 + 12345) >>> 0
  const rnd = () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
  const r = radius * (0.85 + rnd() * 0.2)
  ctx.fillStyle = `rgb(${shadow.r}, ${shadow.g}, ${shadow.b})`
  ctx.beginPath()
  ctx.ellipse(cx + 1.5, cy + 2, r * 1.05, r * 0.72, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = `rgb(${mid.r}, ${mid.g}, ${mid.b})`
  ctx.beginPath()
  ctx.ellipse(cx, cy, r, r * 0.68, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = `rgb(${highlight.r}, ${highlight.g}, ${highlight.b})`
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.22, cy - r * 0.28, r * 0.42, r * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()
}
