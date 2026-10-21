import { forestFilmGrainBlockPxForTier } from './forest-pixel-density.js'

//
// Shared noise for soft earth seams: the topsoil/subsoil fringe in the ground
// band and the island's rock meeting the soil use the same rounded tongues.
//
const JAG_CELL_PX = forestFilmGrainBlockPxForTier('gameplay')
const FRINGE_LOBE_OCTAVES = [
  { wavelength: 27, amp: 6 },
  { wavelength: 13, amp: 2.5 }
]
const FRINGE_JAG_AMP = 2.5

/**
 * Deterministic hash in [0, 1) (stable across bakes)
 * @param {number} n - Hash input
 * @returns {number}
 */
export function seamHash01(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/**
 * Smooth 1D value noise in [-1, 1]: hashed lattice values, smoothstep blend
 * @param {number} t - Noise coordinate
 * @param {number} seed - Pattern seed
 * @returns {number}
 */
export function seamValueNoise(t, seed) {
  const i = Math.floor(t)
  const a = seamHash01(i * 17.31 + seed)
  const b = seamHash01((i + 1) * 17.31 + seed)
  return (a + (b - a) * smoothstep01(t - i)) * 2 - 1
}

/**
 * Per-cell sample-and-hold offset in [-1, 1] — sharp vertical micro-spikes along X
 * @param {number} x - World X
 * @param {number} index - Seam index (separate pattern per seam)
 * @returns {number}
 */
export function seamJag(x, index) {
  const seed = index * 97.13 + 3.7
  const bx = Math.floor(x / JAG_CELL_PX)
  return seamHash01(bx * 13.7 + seed * 100.3) * 2 - 1
}

/**
 * Rounded tongues plus a little pixel grit, centred on zero (px offset)
 * @param {number} x - World X
 * @param {number} index - Seam index (separate pattern per seam)
 * @returns {number}
 */
export function seamFringeOffset(x, index) {
  let sum = 0
  for (let i = 0; i < FRINGE_LOBE_OCTAVES.length; i++) {
    const octave = FRINGE_LOBE_OCTAVES[i]
    sum += seamValueNoise(x / octave.wavelength, index * 5.1 + i * 13.9) * octave.amp
  }
  return sum + seamJag(x, index) * FRINGE_JAG_AMP
}

/**
 * Largest absolute offset `seamFringeOffset` can return
 * @returns {number}
 */
export function seamFringeMaxOffset() {
  return FRINGE_LOBE_OCTAVES.reduce((sum, octave) => sum + octave.amp, FRINGE_JAG_AMP)
}

function smoothstep01(t) {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}
