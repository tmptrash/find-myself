//
// Baked blur + film-grain passes for glow sprites (parallax forest, decor,
// hero, tree, water frames). Applied once at bake time so runtime draw
// stays a plain blit.
//
const GRAIN_ALPHA_MIN = 8
//
// Shared film-grain look for every glow bake (matches the near parallax row).
//
export const GLOW_FILM_GRAIN = {
  strength: 10,
  blockSize: 1,
  seed: 43011
}
//
// Softer grain for letter-pickup caption phrases only.
//
export const GLOW_CAPTION_FILM_GRAIN = {
  strength: 4,
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
//
// Weaker film grain for large letter captions after pickup.
//
export function applyGlowCaptionGrainToCanvas(canvas, seedOffset = 0) {
  if (!canvas?.width || !canvas?.height) return
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  applyFilmGrainToContext(ctx, canvas.width, canvas.height, {
    strength: GLOW_CAPTION_FILM_GRAIN.strength,
    blockSize: GLOW_CAPTION_FILM_GRAIN.blockSize,
    seed: GLOW_CAPTION_FILM_GRAIN.seed + (seedOffset | 0)
  })
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
export function applyParallaxPostFxToContext(ctx, width, height, cfg) {
  if (!cfg) return
  cfg.blurRadius > 0 && applyBlurToContext(ctx, width, height, cfg.blurRadius)
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
// Adds luminance film grain to every opaque pixel on a baked canvas.
//
function applyFilmGrainToContext(ctx, width, height, cfg) {
  const { strength, blockSize, seed } = cfg
  if (!strength || strength <= 0) return
  const block = Math.max(1, blockSize | 0)
  const imageData = ctx.getImageData(0, 0, width, height)
  const px = imageData.data
  for (let y = 0; y < height; y++) {
    const by = (y / block) | 0
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (px[i + 3] < GRAIN_ALPHA_MIN) continue
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
