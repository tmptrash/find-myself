import { CFG } from '../../../cfg.js'

//
// Forest section palette — every colour on lesson-forest.0 must come from the
// game-wide palette aliases (CFG.visual.colors.palette).
//
export const FOREST_PAL = CFG.visual.colors.palette
export const GAMEPLAY_TREE_FOLIAGE_KEY = 'gameplayTreeFoliage'
//
// Lower sky fraction that picks up dawn gold (between the trunks, not zenith).
//
const SKY_DAWN_BOTTOM_FRAC = 0.28
const SKY_DAWN_GLOW_STRENGTH = 0.34

/**
 * Parses a palette hex key or raw hex string into an RGB triplet.
 * @param {string} keyOrHex - Semantic key on the palette or '#rrggbb'
 * @returns {{ r: number, g: number, b: number }}
 */
export function forestRgb(keyOrHex) {
  const hex = keyOrHex.startsWith('#') ? keyOrHex : FOREST_PAL[keyOrHex]
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  }
}

/**
 * Darker cave fill — deep brown (no green void in pit earth gaps).
 * @returns {{ r: number, g: number, b: number }}
 */
export function forestCaveEarthDeepRgb() {
  const loam = forestRgb('groundLoam')
  const clay = forestRgb('groundClay')
  return {
    r: Math.round(loam.r * 0.88 + clay.r * 0.12),
    g: Math.round(loam.g * 0.88 + clay.g * 0.12),
    b: Math.round(loam.b * 0.88 + clay.b * 0.12)
  }
}

/**
 * Bottom stratum of the baked earth band (matches groundEarthLayersColor).
 * @returns {{ r: number, g: number, b: number }}
 */
export function forestGroundEarthBottomLayerRgb() {
  return forestRgb('groundDeep')
}

/**
 * Forest contour ink by role (forest / eye / platform / gameplay).
 * @param {'forest'|'eye'|'platform'|'gameplay'} [role='forest']
 * @returns {{ r: number, g: number, b: number }}
 */
export function forestContourRgb(role = 'forest') {
  return forestRgb(FOREST_PAL.forestContour[role])
}


/**
 * Samples the forest sky gradient (dark teal zenith → mid → hazy horizon)
 * with dawn gold rising in the lower band. Shared by the level's sky bake
 * and the menu's forest background.
 * @param {number} mixT - 0 at the zenith, 1 at the horizon
 * @returns {{ r: number, g: number, b: number }} Palette-snapped colour
 */
export function forestSkyBandRgb(mixT) {
  const zenith = forestRgb('forestSkyZenith')
  const mid = forestRgb('forestSkyMid')
  const horizon = forestRgb('forestSkyHorizon')
  let c = mixT < 0.5
    ? blendRgb(zenith, mid, mixT * 2)
    : blendRgb(mid, horizon, (mixT - 0.5) * 2)
  const dawnStart = 1 - SKY_DAWN_BOTTOM_FRAC
  if (mixT > dawnStart) {
    const u = (mixT - dawnStart) / (1 - dawnStart)
    c = blendRgb(c, getForestLightRgb('core'), SKY_DAWN_GLOW_STRENGTH * u)
  }
  return snapToPalette(c)
}

/**
 * Warm golden FOREST light tiers (see cfg forestLightCore/Mid/Bright).
 * @param {'core'|'mid'|'bright'} [tier='mid']
 * @returns {{ r: number, g: number, b: number }}
 */
export function getForestLightRgb(tier = 'mid') {
  const key = tier === 'core'
    ? 'forestLightCore'
    : tier === 'bright'
      ? 'forestLightBright'
      : 'forestLightMid'
  return forestRgb(key)
}
//
// Parsed swatches for nearest-neighbour snaps so mixed/dimmed fills never
// leave the game-wide palette.
//
const PALETTE_RGBS = FOREST_PAL.swatches.map(hex => forestRgb(hex))
//
// Integer RGB → nearest swatch memo. Per-frame colour lerps (grass tints,
// fades, decor darkening) snap the same few hundred values every frame, and
// each miss is a 96-swatch scan. Cleared when full so it stays bounded.
//
const SNAP_CACHE_MAX = 8192
const snapCache = new Map()

/**
 * Snaps an RGB triplet onto the nearest game-wide palette swatch.
 * @param {{ r: number, g: number, b: number }} c
 * @returns {{ r: number, g: number, b: number }}
 */
export function snapToPalette(c) {
  const cacheable = isByte(c.r) && isByte(c.g) && isByte(c.b)
  const key = cacheable ? (c.r << 16) | (c.g << 8) | c.b : -1
  const hit = cacheable ? snapCache.get(key) : undefined
  const best = hit ?? nearestPaletteSwatch(c)
  if (cacheable && !hit) {
    snapCache.size >= SNAP_CACHE_MAX && snapCache.clear()
    snapCache.set(key, best)
  }
  return { r: best.r, g: best.g, b: best.b }
}


/**
 * Colour main-tree palette with nearground parallax foliage for one screen corner.
 * @param {string} parallaxCornerKey
 * @returns {Object}
 */
/**
 * Blends two RGB triplets and snaps the result to the palette. Identity
 * white (a "no tint" multiply on a baked sprite) stays unsnapped.
 * @param {{r: number, g: number, b: number}} a - From
 * @param {{r: number, g: number, b: number}} b - To
 * @param {number} t - 0..1
 * @returns {{r: number, g: number, b: number}}
 */
export function lerpForestRgb(a, b, t) {
  const u = Math.max(0, Math.min(1, t))
  const mixed = {
    r: Math.round(a.r + (b.r - a.r) * u),
    g: Math.round(a.g + (b.g - a.g) * u),
    b: Math.round(a.b + (b.b - a.b) * u)
  }
  if (isIdentityWhite(a) || isIdentityWhite(b)) return mixed
  return snapToPalette(mixed)
}










function nearestPaletteSwatch(c) {
  let best = PALETTE_RGBS[0]
  let bestD = Infinity
  for (let i = 0; i < PALETTE_RGBS.length; i++) {
    const s = PALETTE_RGBS[i]
    const dr = c.r - s.r
    const dg = c.g - s.g
    const db = c.b - s.b
    const d = dr * dr + dg * dg + db * db
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  return best
}
function isByte(v) {
  return Number.isInteger(v) && v >= 0 && v <= 255
}
//
// Unsnapped linear blend of two RGB triplets (callers snap the result).
//
function blendRgb(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t)
  }
}
function isIdentityWhite(c) {
  return c.r === 255 && c.g === 255 && c.b === 255
}
