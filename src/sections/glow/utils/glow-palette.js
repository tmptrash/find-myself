import { CFG } from '../../../cfg.js'
import { applyFoliageDensityToPalette } from './glow-pixel-density.js'

//
// Glow section palette — every colour on lesson-glow.0 must come from the
// game-wide palette aliases (CFG.visual.colors.palette).
//
export const GLOW_PAL = CFG.visual.colors.palette

/**
 * Parses a palette hex key or raw hex string into an RGB triplet.
 * @param {string} keyOrHex - Semantic key on the palette or '#rrggbb'
 * @returns {{ r: number, g: number, b: number }}
 */
export function glowRgb(keyOrHex) {
  const hex = keyOrHex.startsWith('#') ? keyOrHex : GLOW_PAL[keyOrHex]
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  }
}

/**
 * Neutral dark playfield fill before the colour world (matches ready exit).
 * @returns {{ r: number, g: number, b: number }}
 */
export function glowPreludeBackdropRgb() {
  return glowRgb('glowPreludeBackdrop')
}

/**
 * Cave pit floor — lower soil layer (groundSand), slightly lifted for readability.
 * @returns {{ r: number, g: number, b: number }}
 */
export function glowCaveEarthFloorRgb() {
  const mud = glowRgb('mudGround')
  const clay = glowRgb('groundClay')
  const sand = glowRgb('groundSand')
  return {
    r: Math.round(mud.r * 0.62 + clay.r * 0.28 + sand.r * 0.1),
    g: Math.round(mud.g * 0.62 + clay.g * 0.28 + sand.g * 0.1),
    b: Math.round(mud.b * 0.62 + clay.b * 0.28 + sand.b * 0.1)
  }
}

/**
 * Darker cave fill — deep brown (no green void in pit earth gaps).
 * @returns {{ r: number, g: number, b: number }}
 */
export function glowCaveEarthDeepRgb() {
  const mud = glowRgb('mudGround')
  const clay = glowRgb('groundClay')
  return {
    r: Math.round(mud.r * 0.88 + clay.r * 0.12),
    g: Math.round(mud.g * 0.88 + clay.g * 0.12),
    b: Math.round(mud.b * 0.88 + clay.b * 0.12)
  }
}

const GROUND_EARTH_LAYER_CONTRAST_PULL = 0.52
const GROUND_EARTH_LAYER_FRAC_TOP = 0.5

function lerpGlowRgb(a, b, t) {
  const u = Math.max(0, Math.min(1, t))
  return {
    r: Math.round(a.r + (b.r - a.r) * u),
    g: Math.round(a.g + (b.g - a.g) * u),
    b: Math.round(a.b + (b.b - a.b) * u)
  }
}

function softenGlowGroundEarthLayers(layers) {
  const n = layers.length
  const avg = layers.reduce((acc, layer) => ({
    r: acc.r + layer.rgb.r,
    g: acc.g + layer.rgb.g,
    b: acc.b + layer.rgb.b
  }), { r: 0, g: 0, b: 0 })
  avg.r = Math.round(avg.r / n)
  avg.g = Math.round(avg.g / n)
  avg.b = Math.round(avg.b / n)
  const pull = GROUND_EARTH_LAYER_CONTRAST_PULL
  return layers.map(layer => ({
    ...layer,
    rgb: lerpGlowRgb(layer.rgb, avg, pull)
  }))
}

/**
 * Bottom stratum of the baked earth band (matches groundEarthLayersColor/Gray).
 * @param {boolean} [grayPhase=false] - Gray underground band before colour fade
 * @returns {{ r: number, g: number, b: number }}
 */
export function glowGroundEarthBottomLayerRgb(grayPhase = false) {
  const topsoil = glowRgb('groundChernozem')
  const sand = glowRgb('groundSand')
  const voidRgb = glowRgb('void')
  const shadow = glowRgb(GLOW_PAL.glowShadow)
  const stack = grayPhase
    ? softenGlowGroundEarthLayers([
      { rgb: lerpGlowRgb(topsoil, shadow, 0.1), frac: GROUND_EARTH_LAYER_FRAC_TOP },
      { rgb: lerpGlowRgb(sand, voidRgb, 0.28) }
    ])
    : softenGlowGroundEarthLayers([
      { rgb: topsoil, frac: GROUND_EARTH_LAYER_FRAC_TOP },
      { rgb: sand }
    ])
  return stack[stack.length - 1].rgb
}

/**
 * Glow contour ink by role (forest / eye / platform / gameplay).
 * @param {'forest'|'eye'|'platform'|'gameplay'} [role='forest']
 * @returns {{ r: number, g: number, b: number }}
 */
export function glowContourRgb(role = 'forest') {
  return glowRgb(GLOW_PAL.glowContour[role])
}

/**
 * drawRockToCanvas palette for glow floor rocks (shadow / mid / light).
 * @returns {{ fillR: number, fillG: number, fillB: number, lightR: number, lightG: number, lightB: number, darkR: number, darkG: number, darkB: number }}
 */
export function glowRockShadedDrawPalette() {
  const shadow = glowRgb(GLOW_PAL.glowRock.shadow)
  const mid = glowRgb(GLOW_PAL.glowRock.mid)
  const light = glowRgb(GLOW_PAL.glowRock.light)
  return {
    fillR: mid.r, fillG: mid.g, fillB: mid.b,
    lightR: light.r, lightG: light.g, lightB: light.b,
    darkR: shadow.r, darkG: shadow.g, darkB: shadow.b
  }
}

/**
 * Warm golden GLOW light tiers (see cfg glowLightCore/Mid/Bright).
 * @param {'core'|'mid'|'bright'} [tier='mid']
 * @returns {{ r: number, g: number, b: number }}
 */
export function getGlowLightRgb(tier = 'mid') {
  const key = tier === 'core'
    ? 'glowLightCore'
    : tier === 'bright'
      ? 'glowLightBright'
      : 'glowLightMid'
  return glowRgb(key)
}
//
// Parsed swatches for nearest-neighbour snaps so mixed/dimmed fills never
// leave the game-wide palette.
//
const PALETTE_RGBS = GLOW_PAL.swatches.map(hex => glowRgb(hex))

/**
 * Snaps an RGB triplet onto the nearest game-wide palette swatch.
 * @param {{ r: number, g: number, b: number }} c
 * @returns {{ r: number, g: number, b: number }}
 */
export function snapToPalette(c) {
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
  return { r: best.r, g: best.g, b: best.b }
}

/**
 * Single-tone decor gray for the main tree before L (no trunk/leaf shades).
 * @returns {Object} Canvas RGB palette for renderGlowTreeToCanvas()
 */
export function getTreePaletteFlatDecor() {
  const c = glowRgb('decorGray')
  return {
    rootR: c.r, rootG: c.g, rootB: c.b,
    trunkR: c.r, trunkG: c.g, trunkB: c.b,
    branchR: c.r, branchG: c.g, branchB: c.b,
    leafR: c.r, leafG: c.g, leafB: c.b,
    leafOpacity: 1,
    leafShades: [c, c, c],
    barkShades: { dark: c, highlight: c },
    leafVein: c,
    woodOutline: c,
    flatSilhouette: true
  }
}

/**
 * Same flat single-tone tree as getTreePaletteFlatDecor(), except the roots
 * Roots use the same decorGray tone as the trunk (only the root mass is
 * revealed after G, not a separate gray).
 * @returns {Object} Canvas RGB palette for renderGlowTreeToCanvas()
 */
export function getTreePaletteFlatDecorRootsVisible() {
  const c = glowRgb('decorGray')
  return {
    rootR: c.r, rootG: c.g, rootB: c.b,
    trunkR: c.r, trunkG: c.g, trunkB: c.b,
    branchR: c.r, branchG: c.g, branchB: c.b,
    leafR: c.r, leafG: c.g, leafB: c.b,
    leafOpacity: 1,
    leafShades: [c, c, c],
    barkShades: { dark: c, highlight: c },
    leafVein: c,
    woodOutline: c,
    flatSilhouette: true
  }
}

/**
 * Gray-phase foreground tree palette.
 * @returns {Object} Canvas RGB palette for renderGlowTreeToCanvas()
 */
export function getTreePaletteGray() {
  const t = GLOW_PAL.treeGray
  const root = glowRgb('void')
  const trunk = glowRgb(t.trunk)
  const branch = glowRgb(t.branch)
  const leaf = glowRgb(t.leaf)
  return {
    rootR: root.r, rootG: root.g, rootB: root.b,
    trunkR: trunk.r, trunkG: trunk.g, trunkB: trunk.b,
    branchR: branch.r, branchG: branch.g, branchB: branch.b,
    leafR: leaf.r, leafG: leaf.g, leafB: leaf.b,
    leafOpacity: 1,
    leafShades: [
      glowRgb(t.trunk),
      glowRgb(t.branch),
      glowRgb(t.leaf)
    ],
    //
    // Bark cracks: cold teal shadow, green highlight (monochrome forest phase).
    //
    barkShades: {
      dark: glowRgb('glowShadow'),
      highlight: glowRgb('playfieldGray')
    },
    leafVein: glowRgb('void'),
    woodOutline: glowContourRgb('forest'),
    woodMassStyle: true,
    noLeafDetails: true
  }
}

/**
 * Cute mushroom palette — one decor-gray tone (pre-L flat world).
 * @returns {Object} Hex colour map for drawCuteMushroomToCanvas()
 */
export function getCuteMushroomFlatDecorColors() {
  const stem = GLOW_PAL.decorGray
  const cap = GLOW_PAL.lightGray
  const spot = GLOW_PAL.glowOutlineLight
  return {
    body: stem,
    bodyShade: stem,
    cap,
    capDark: stem,
    capLight: cap,
    spot,
    outline: GLOW_PAL.decorGray,
    face: GLOW_PAL.lightGray,
    blush: stem
  }
}

/**
 * Trampoline mushroom in the flat pre-L phase — same decor gray as the lake.
 * @returns {Object} Hex colour map for drawCuteMushroomToCanvas()
 */
export function getCuteMushroomFlatWaterColors() {
  return getCuteMushroomFlatDecorColors()
}

/**
 * Pit trampoline in flat mono — light cap, dark stem, void outline on gray floor.
 * @returns {Object} Hex colour map for drawCuteMushroomToCanvas()
 */
export function getCuteMushroomFlatPitBakeColors() {
  const cap = GLOW_PAL.lightGray
  const stem = GLOW_PAL.decorGray
  const spot = GLOW_PAL.glowOutlineLight
  return {
    body: stem,
    bodyShade: stem,
    cap,
    capDark: stem,
    capLight: cap,
    spot,
    outline: GLOW_PAL.decorGray,
    face: GLOW_PAL.lightGray,
    blush: stem
  }
}
/**
 * True while the level stays flat gray (before L / colour world).
 * @param {Object} [z] - Glow zones object
 * @param {number} [colorFade] - Scene colour fade 0..1
 * @returns {boolean}
 */
export function isGlowGrayExploreBeforeL(z, colorFade = 0) {
  if (!z) return false
  if (z.lCollected || z.colorWorld) return false
  return true
}

/**
 * Warm "lit" main-tree palette shown after the L (light) letter is collected.
 * Sand tones make the main tree stand out against the gray parallax forest.
 * @returns {Object} Canvas RGB palette for renderGlowTreeToCanvas()
 */
export function getTreePaletteLit() {
  return applyFoliageDensityToPalette(getTreePaletteLitBase(), 'nearground')
}

/**
 * Lit main-tree palette with nearground parallax foliage for one screen corner.
 * @param {string} parallaxCornerKey
 * @returns {Object}
 */
export function getTreePaletteLitForCorner(parallaxCornerKey) {
  return getTreePaletteWithNearParallaxFoliage(getTreePaletteLitBase(), parallaxCornerKey)
}

/**
 * Main-tree colour palette with nearground parallax-matched foliage.
 * @returns {Object}
 */
export function getTreePaletteColor() {
  return getTreePaletteColorForCorner('parallaxTreeCornerTL')
}

/**
 * Colour main-tree palette with nearground parallax foliage for one screen corner.
 * @param {string} parallaxCornerKey
 * @returns {Object}
 */
export function getTreePaletteColorForCorner(parallaxCornerKey) {
  return getTreePaletteWithNearParallaxFoliage(
    getTreePaletteFromGlowTreeEntry(GLOW_PAL.treeColor),
    parallaxCornerKey
  )
}

/**
 * Copies nearground parallax leaf tones onto a trunk palette (main tree).
 * @param {Object} trunkPalette - Base tree palette (lit or colour trunk)
 * @param {string} parallaxCornerKey - GLOW_PAL parallaxTreeCorner* key
 * @returns {Object}
 */
export function getTreePaletteWithNearParallaxFoliage(trunkPalette, parallaxCornerKey = 'parallaxTreeCornerTL') {
  const lit = applyFoliageDensityToPalette(trunkPalette, 'nearground')
  const near = applyFoliageDensityToPalette(
    getTreePaletteFromGlowTreeEntry(GLOW_PAL[parallaxCornerKey]),
    'nearground'
  )
  return {
    ...lit,
    leafR: near.leafR,
    leafG: near.leafG,
    leafB: near.leafB,
    leafShades: near.leafShades,
    leafVein: near.leafVein,
    leafOpacity: near.leafOpacity,
    noLeafDetails: near.noLeafDetails
  }
}

function getTreePaletteLitBase() {
  const t = GLOW_PAL.treeLit
  const root = glowRgb(t.root)
  const trunk = glowRgb(t.trunk)
  const branch = glowRgb(t.branch)
  const leaf = glowRgb(t.leaf)
  return {
    rootR: root.r, rootG: root.g, rootB: root.b,
    trunkR: trunk.r, trunkG: trunk.g, trunkB: trunk.b,
    branchR: branch.r, branchG: branch.g, branchB: branch.b,
    leafR: leaf.r, leafG: leaf.g, leafB: leaf.b,
    leafOpacity: 1,
    leafShades: [
      glowRgb(t.trunk),
      glowRgb(t.branch),
      glowRgb(t.leaf)
    ],
    barkShades: {
      dark: glowRgb(GLOW_PAL.bark.dark),
      highlight: glowRgb(GLOW_PAL.bark.highlight)
    },
    leafVein: glowRgb(t.root),
    woodOutline: glowContourRgb('forest'),
    woodMassStyle: true,
    noLeafDetails: true
  }
}

/**
 * Parallax forest tree palette for one screen-corner quadrant (see cfg parallaxTreeCorner*).
 * @param {string} cornerKey - One of parallaxTreeCornerTL/TR/BL/BR on GLOW_PAL
 * @returns {Object} Canvas RGB palette for renderGlowTreeToCanvas()
 */
export function getTreePaletteParallaxCorner(cornerKey) {
  return getTreePaletteFromGlowTreeEntry(GLOW_PAL[cornerKey])
}

function getTreePaletteFromGlowTreeEntry(t) {
  const root = glowRgb(t.root)
  const trunk = glowRgb(t.trunk)
  const branch = glowRgb(t.branch)
  const leaf = glowRgb(t.leaf)
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
      dark: glowRgb(GLOW_PAL.bark.dark),
      highlight: glowRgb(GLOW_PAL.bark.highlight)
    },
    leafVein: glowRgb((t.leafShades && t.leafShades[0]) || t.leaf),
    woodOutline: glowContourRgb('forest'),
    woodMassStyle: true,
    noLeafDetails: true
  }
}

function massLeafShadesFromEntry(t) {
  const hexes = t.leafShades || [t.leaf, t.leaf, t.leaf]
  const shadow = hexes[0]
  const base = hexes[Math.min(1, hexes.length - 1)]
  const light = hexes[Math.min(2, hexes.length - 1)]
  return [glowRgb(shadow), glowRgb(base), glowRgb(light)]
}

/**
 * One-tone silhouette palette for a parallax tree/bush row.
 * @param {string} keyOrHex - Palette key or '#rrggbb'
 * @returns {Object} Canvas RGB palette for renderGlowTreeToCanvas()
 */
export function getTreePaletteSolid(keyOrHex) {
  const c = glowRgb(keyOrHex)
  return {
    rootR: c.r, rootG: c.g, rootB: c.b,
    trunkR: c.r, trunkG: c.g, trunkB: c.b,
    branchR: c.r, branchG: c.g, branchB: c.b,
    leafR: c.r, leafG: c.g, leafB: c.b,
    leafOpacity: 1,
    leafShades: [c],
    barkShades: { dark: c, highlight: c },
    leafVein: c,
    noLeafDetails: true,
    flatSilhouette: true
  }
}

/**
 * Builds a dimmed background variant of a tree palette: every tone is blended
 * toward the given backdrop colour. Distant trees painted with this palette
 * stay fully OPAQUE — reduced brightness comes from the colours themselves,
 * never from draw transparency.
 * @param {Object} base - Palette from getTreePaletteGray()/Lit()/Color()
 * @param {{r: number, g: number, b: number}} bg - Backdrop colour to blend toward
 * @param {number} blend - Blend amount 0..1 (0 = base tones, 1 = backdrop)
 * @param {boolean} [flatLeaves=false] - Paint ALL leaves with one single tone
 * @param {number} [leafDarken=0] - Extra push of the foliage toward the darkest
 *   swatch so heavily blended leaves still differ slightly from the backdrop
 * @param {boolean} [uniformWood=false] - Collapse the WHOLE tree to the blended
 *   trunk tone: leaves, branches and bark all match the trunk exactly, so the
 *   tree reads as one flat silhouette (2nd+ background rows)
 * @param {number} [leafWarmBlend=0] - Extra leaf-only blend toward the backdrop
 *   (keep 0 for GLOW 70/20/10 — gold/orange stay rare accents)
 * @returns {Object} Canvas RGB palette for renderGlowTreeToCanvas()
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
  const b = GLOW_PAL.bark
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
  const v = glowRgb('glowShadow')
  return snapToPalette({
    r: Math.round(c.r + (v.r - c.r) * t),
    g: Math.round(c.g + (v.g - c.g) * t),
    b: Math.round(c.b + (v.b - c.b) * t)
  })
}
