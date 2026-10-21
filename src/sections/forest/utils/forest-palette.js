import { CFG } from '../../../cfg.js'
import { applyFoliageDensityToPalette } from './forest-pixel-density.js'

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
  const mud = forestRgb('mudGround')
  const clay = forestRgb('groundClay')
  return {
    r: Math.round(mud.r * 0.88 + clay.r * 0.12),
    g: Math.round(mud.g * 0.88 + clay.g * 0.12),
    b: Math.round(mud.b * 0.88 + clay.b * 0.12)
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
 * drawRockToCanvas palette for forest floor rocks (shadow / mid / light).
 * @returns {{ fillR: number, fillG: number, fillB: number, lightR: number, lightG: number, lightB: number, darkR: number, darkG: number, darkB: number }}
 */
export function forestRockShadedDrawPalette() {
  const shadow = forestRgb(FOREST_PAL.forestRock.shadow)
  const mid = forestRgb(FOREST_PAL.forestRock.mid)
  const light = forestRgb(FOREST_PAL.forestRock.light)
  return {
    fillR: mid.r, fillG: mid.g, fillB: mid.b,
    lightR: light.r, lightG: light.g, lightB: light.b,
    darkR: shadow.r, darkG: shadow.g, darkB: shadow.b
  }
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
 * Main-tree colour palette with nearground parallax-matched foliage.
 * @returns {Object}
 */
export function getTreePaletteColor() {
  return getTreePaletteColorForCorner(GAMEPLAY_TREE_FOLIAGE_KEY)
}

/**
 * Colour main-tree palette with nearground parallax foliage for one screen corner.
 * @param {string} parallaxCornerKey
 * @returns {Object}
 */
/**
 * Groove / highlight tones for gameplay-tree bark (main, shore, lip-trees).
 * @returns {{ dark: { r: number, g: number, b: number }, highlight: { r: number, g: number, b: number } }}
 */
export function getForestGameplayTreeBarkShades() {
  const bark = FOREST_PAL.forestTreeBark
  return {
    dark: forestRgb(bark.groove),
    highlight: forestRgb(bark.highlight)
  }
}

/**
 * Side-light tones for the gameplay trees' volume pass (sun from the left).
 * @returns {{ lit: Object, rim: Object, shade: Object, deep: Object }}
 */
export function getForestGameplayTreeVolumeShades() {
  const bark = FOREST_PAL.forestTreeBark
  return {
    lit: forestRgb(bark.lit),
    rim: forestRgb(bark.rim),
    shade: forestRgb(bark.shade),
    deep: forestRgb(bark.deep)
  }
}

export function getTreePaletteColorForCorner(parallaxCornerKey) {
  return {
    ...getTreePaletteWithNearParallaxFoliage(
      getTreePaletteFromForestTreeEntry(FOREST_PAL.treeColor),
      parallaxCornerKey
    ),
    //
    // Gameplay trees keep full bark passes; parallax rows stay flat (woodMassStyle).
    //
    woodMassStyle: false,
    //
    // Roots stay the old flat mass stroke; trunk/branch keep detailed bark.
    //
    simpleRoots: true,
    barkShades: getForestGameplayTreeBarkShades()
  }
}

/**
 * Copies nearground parallax leaf tones onto a trunk palette (main tree).
 * @param {Object} trunkPalette - Base tree palette (colour trunk)
 * @param {string} parallaxCornerKey - FOREST_PAL parallaxTreeCorner* key
 * @returns {Object}
 */
export function getTreePaletteWithNearParallaxFoliage(trunkPalette, parallaxCornerKey = 'parallaxTreeCornerTL') {
  const lit = applyFoliageDensityToPalette(trunkPalette, 'nearground')
  const entry = FOREST_PAL[parallaxCornerKey]
  const near = applyFoliageDensityToPalette(getTreePaletteFromForestTreeEntry(entry), 'nearground')
  return {
    ...lit,
    leafR: near.leafR,
    leafG: near.leafG,
    leafB: near.leafB,
    leafShades: near.leafShades,
    leafVein: near.leafVein,
    leafOpacity: near.leafOpacity,
    noLeafDetails: near.noLeafDetails,
    sprigLeaves: Boolean(entry.sprigLeaves)
  }
}

/**
 * Parallax forest tree palette for one screen-corner quadrant (see cfg parallaxTreeCorner*).
 * @param {string} cornerKey - One of parallaxTreeCornerTL/TR/BL/BR on FOREST_PAL
 * @returns {Object} Canvas RGB palette for renderForestTreeToCanvas()
 */
export function getTreePaletteParallaxCorner(cornerKey) {
  return getTreePaletteFromForestTreeEntry(FOREST_PAL[cornerKey])
}

function getTreePaletteFromForestTreeEntry(t) {
  const root = forestRgb(t.root)
  const trunk = forestRgb(t.trunk)
  const branch = forestRgb(t.branch)
  const leaf = forestRgb(t.leaf)
  return {
    rootR: root.r, rootG: root.g, rootB: root.b,
    trunkR: trunk.r, trunkG: trunk.g, trunkB: trunk.b,
    branchR: branch.r, branchG: branch.g, branchB: branch.b,
    leafR: leaf.r, leafG: leaf.g, leafB: leaf.b,
    leafOpacity: 1,
    leafShades: massLeafShadesFromEntry(t),
    //
    // Wood uses trunk / branch / shadow only — no bark micro-texture pass.
    //
    barkShades: {
      dark: forestRgb(FOREST_PAL.bark.dark),
      highlight: forestRgb(FOREST_PAL.bark.highlight)
    },
    leafVein: forestRgb((t.leafShades && t.leafShades[0]) || t.leaf),
    woodOutline: forestContourRgb('forest'),
    woodMassStyle: true,
    noLeafDetails: true
  }
}

function massLeafShadesFromEntry(t) {
  const hexes = t.leafShades || [t.leaf, t.leaf, t.leaf]
  const shadow = hexes[0]
  const base = hexes[Math.min(1, hexes.length - 1)]
  const light = hexes[Math.min(2, hexes.length - 1)]
  return [forestRgb(shadow), forestRgb(base), forestRgb(light)]
}

/**
 * Builds a dimmed background variant of a tree palette: every tone is blended
 * toward the given backdrop colour. Distant trees painted with this palette
 * stay fully OPAQUE — reduced brightness comes from the colours themselves,
 * never from draw transparency.
 * @param {Object} base - Palette from getTreePaletteParallaxCorner()/Color()
 * @param {{r: number, g: number, b: number}} bg - Backdrop colour to blend toward
 * @param {number} blend - Blend amount 0..1 (0 = base tones, 1 = backdrop)
 * @param {boolean} [flatLeaves=false] - Paint ALL leaves with one single tone
 * @param {number} [leafDarken=0] - Extra push of the foliage toward the darkest
 *   swatch so heavily blended leaves still differ slightly from the backdrop
 * @param {boolean} [uniformWood=false] - Collapse the WHOLE tree to the blended
 *   trunk tone: leaves, branches and bark all match the trunk exactly, so the
 *   tree reads as one flat silhouette (2nd+ background rows)
 * @param {number} [leafWarmBlend=0] - Extra leaf-only blend toward the backdrop
 *   (keep 0 for FOREST 70/20/10 — gold/orange stay rare accents)
 * @returns {Object} Canvas RGB palette for renderForestTreeToCanvas()
 */
export function buildDimmedTreePalette(base, bg, blend, flatLeaves = false, leafDarken = 0, uniformWood = false, leafWarmBlend = 0) {
  const mix = (r, g, b) => snapToPalette({
    r: Math.round(r + (bg.r - r) * blend),
    g: Math.round(g + (bg.g - g) * blend),
    b: Math.round(b + (bg.b - b) * blend)
  })
  const mixRgb = (c) => mix(c.r, c.g, c.b)
  //
  // Extra leaf-only push toward the backdrop tone (orange haze warms the
  // foliage while green stays the leading colour).
  //
  const warmRgb = (c) => snapToPalette({
    r: Math.round(c.r + (bg.r - c.r) * leafWarmBlend),
    g: Math.round(c.g + (bg.g - c.g) * leafWarmBlend),
    b: Math.round(c.b + (bg.b - c.b) * leafWarmBlend)
  })
  const root = mix(base.rootR, base.rootG, base.rootB)
  const trunk = mix(base.trunkR, base.trunkG, base.trunkB)
  const branch = uniformWood ? trunk : mix(base.branchR, base.branchG, base.branchB)
  const leaf = uniformWood ? trunk : warmRgb(darkenRgb(mix(base.leafR, base.leafG, base.leafB), leafDarken))
  const darkenLeafRgb = (c) => warmRgb(darkenRgb(mixRgb(c), leafDarken))
  return {
    rootR: root.r, rootG: root.g, rootB: root.b,
    trunkR: trunk.r, trunkG: trunk.g, trunkB: trunk.b,
    branchR: branch.r, branchG: branch.g, branchB: branch.b,
    leafR: leaf.r, leafG: leaf.g, leafB: leaf.b,
    leafOpacity: 1,
    //
    // flatLeaves collapses the foliage to a single tone (far background rows).
    //
    leafShades: flatLeaves ? [leaf] : (base.leafShades ?? [leaf]).map(darkenLeafRgb),
    //
    // Uniform wood keeps the bark texture invisible: both crack tones equal
    // the trunk tone, so the silhouette stays one flat colour.
    //
    barkShades: uniformWood ? { dark: trunk, highlight: trunk } : {
      dark: mixRgb(base.barkShades?.dark ?? root),
      highlight: mixRgb(base.barkShades?.highlight ?? leaf)
    },
    //
    // Background trees stay clean: plain leaves (no vein) and no outline.
    //
    leafVein: mixRgb(base.leafVein ?? root),
    noLeafDetails: base.noLeafDetails ?? true,
    woodMassStyle: base.woodMassStyle ?? false,
    woodOutline: base.woodOutline,
    branchesOverTrunk: base.branchesOverTrunk
  }
}

/**
 * Bark shading tones for pixel-art trunk texture.
 * @returns {{ dark: string, mid: string, light: string, highlight: string }}
 */
export function getTreeBarkPalette() {
  const b = FOREST_PAL.bark
  return {
    dark: b.dark,
    mid: b.mid,
    light: b.light,
    highlight: b.highlight
  }
}
//
// Blends a palette tone toward the darkest swatch (void), then snaps back
// onto a real palette entry so the fill never invents a new colour.
//
function darkenRgb(c, t) {
  if (t <= 0) return c
  const v = forestRgb('forestShadow')
  return snapToPalette({
    r: Math.round(c.r + (v.r - c.r) * t),
    g: Math.round(c.g + (v.g - c.g) * t),
    b: Math.round(c.b + (v.b - c.b) * t)
  })
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
