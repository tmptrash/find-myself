import * as SoilSeam from './forest-soil-seam.js'
import { forestRgb } from './forest-palette.js'
//
// Layered underground earth band — chernozem topsoil, subsoil, deepest
// stratum — with rolling jagged seams between strata. Shared by the forest
// level's static ground bake and the menu's forest background so both read
// as the same soil. Fractions below are of the band height for the first
// two strata; the last fills the rest.
//
export const GROUND_LAYER_FRACS = [0.36, 0.3]
//
// High-frequency jagged seams between soil layers (sample-and-hold noise, like
// a dense irregular time series — not smooth sine waves).
//
const GROUND_LAYER_SAMPLE_PX = 1
const GROUND_LAYER_INTERIOR_BOUNDARY_AMP = 10
//
// Large rolling hills along every interior seam (reference cross-section) —
// separate seed per boundary so strata do not share the same silhouette.
// Wavelength ratios are non-integer and the lattice is domain-warped, so the
// crests never settle into a regular, sine-like rhythm.
//
const GROUND_LAYER_MACRO_OCTAVES = [
  { wavelength: 347, amp: 24 },
  { wavelength: 151, amp: 15 },
  { wavelength: 63, amp: 8 }
]
const GROUND_LAYER_MACRO_WARP_WAVELENGTH = 229
const GROUND_LAYER_MACRO_WARP_AMP = 120
//
// Slow envelope over the macro sway: calm stretches alternate with wild ones.
//
const GROUND_LAYER_MACRO_ENVELOPE_WAVELENGTH = 610
const GROUND_LAYER_MACRO_ENVELOPE_MIN = 0.45
//
// Topsoil hangs into subsoil as soft rounded tongues (not needle teeth).
//
const GROUND_LAYER_FRINGE_INDEX = 1

/**
 * Colour-world soil strata, top to bottom, as { rgb, frac } (frac of the
 * band height; the last layer fills whatever remains so rounding never
 * leaves a gap). Each stratum is a darker warm brown than the one above.
 * @returns {Array<{ rgb: { r: number, g: number, b: number }, frac?: number }>}
 */
export function groundEarthLayersColor() {
  return [
    { rgb: forestRgb('groundChernozem'), frac: GROUND_LAYER_FRACS[0] },
    { rgb: forestRgb('mudGround'), frac: GROUND_LAYER_FRACS[1] },
    { rgb: forestRgb('groundDeep') }
  ]
}

/**
 * Stacks soil layers top to bottom — flat top on y0, jaggy seams between
 * strata, flat bottom on y0 + height.
 * @param {CanvasRenderingContext2D} ctx - Target context
 * @param {Array} layers - From groundEarthLayersColor() (optional shade per layer)
 * @param {number} x0 - Left edge
 * @param {number} y0 - Ground line (band top)
 * @param {number} width - Band width
 * @param {number} height - Band height
 */
export function paintLayeredEarthBand(ctx, layers, x0, y0, width, height) {
  let cumFrac = 0
  for (let i = 0; i < layers.length; i++) {
    const nextFrac = i < layers.length - 1
      ? cumFrac + layers[i].frac
      : 1
    paintWavyBoundedEarthLayer(
      ctx,
      layers[i].rgb,
      layers[i].shade,
      x0,
      width,
      y0,
      height,
      cumFrac,
      nextFrac,
      i,
      i < layers.length - 1 ? i + 1 : -1
    )
    cumFrac = nextFrac
  }
}
//
// Topsoil hangs into subsoil as soft rounded tongues; deeper seams get sharp
// sample-and-hold spikes.
//
function groundLayerInteriorBoundaryWave(x, layerIndex) {
  if (layerIndex <= 0) return 0
  const macro = groundLayerMacroSeamSway(x, layerIndex)
  if (layerIndex === GROUND_LAYER_FRINGE_INDEX) {
    return macro + SoilSeam.seamFringeOffset(x, layerIndex)
  }
  return macro + SoilSeam.seamJag(x, layerIndex) * GROUND_LAYER_INTERIOR_BOUNDARY_AMP
}
//
// Slow undulation on every interior seam — reads as soil rising and falling.
//
function groundLayerMacroSeamSway(x, layerIndex) {
  const seed = layerIndex * 19.1
  const warpedX = x + SoilSeam.seamValueNoise(x / GROUND_LAYER_MACRO_WARP_WAVELENGTH, seed + 7.7) * GROUND_LAYER_MACRO_WARP_AMP
  let sum = 0
  for (let i = 0; i < GROUND_LAYER_MACRO_OCTAVES.length; i++) {
    const octave = GROUND_LAYER_MACRO_OCTAVES[i]
    sum += SoilSeam.seamValueNoise(warpedX / octave.wavelength, seed + i * 41.3) * octave.amp
  }
  const envelope01 = (SoilSeam.seamValueNoise(x / GROUND_LAYER_MACRO_ENVELOPE_WAVELENGTH, seed + 3.3) + 1) * 0.5
  return sum * (GROUND_LAYER_MACRO_ENVELOPE_MIN + (1 - GROUND_LAYER_MACRO_ENVELOPE_MIN) * envelope01)
}
function groundLayerBoundaryY(x, y0, height, cumFrac, layerIndex) {
  //
  // Top of the earth band is always a flat horizontal seam on FLOOR_Y.
  //
  if (cumFrac <= 0) return y0
  return y0 + height * cumFrac + groundLayerInteriorBoundaryWave(x, layerIndex)
}
//
// Fills one soil stratum between two wavy horizontal curves (top + bottom).
//
function paintWavyBoundedEarthLayer(ctx, rgb, shade, x0, width, y0, height, topFrac, bottomFrac, topLayerIndex, bottomLayerIndex) {
  const steps = Math.max(2, Math.ceil(width / GROUND_LAYER_SAMPLE_PX))
  ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  ctx.beginPath()
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = x0 + t * width
    const y = groundLayerBoundaryY(x, y0, height, topFrac, topLayerIndex)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps
    const x = x0 + t * width
    const y = bottomLayerIndex < 0
      ? y0 + height
      : groundLayerBoundaryY(x, y0, height, bottomFrac, bottomLayerIndex)
    ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
  if (!shade) return
  ctx.fillStyle = `rgb(${shade.rgb.r}, ${shade.rgb.g}, ${shade.rgb.b})`
  ctx.globalAlpha = shade.alpha
  ctx.fill()
  ctx.globalAlpha = 1
}
