import { CFG } from '../../../cfg.js'

//
// Glow section palette — every colour on lesson-glow.0 must come from the
// game-wide palette aliases (CFG.visual.colors.palette).
//
export const GLOW_PAL = CFG.visual.colors.palette
//
// Roots read darker than the trunk: every root tone is pushed toward the
// darkest palette swatch (void) by this amount.
//
const ROOT_DARKEN = 0.35

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
 * Gray-phase foreground tree palette.
 * @returns {Object} Canvas RGB palette for renderGlowTreeToCanvas()
 */
export function getTreePaletteGray() {
  const t = GLOW_PAL.treeGray
  const root = darkenRgb(glowRgb(t.root), ROOT_DARKEN)
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
    // Bark crack tones stay grayscale in the gray phase (palette rule).
    //
    barkShades: {
      dark: glowRgb('void'),
      highlight: glowRgb('playfieldGray')
    },
    leafVein: glowRgb('void'),
    woodOutline: glowRgb('void')
  }
}

/**
 * Warm "lit" main-tree palette shown after the L (light) letter is collected.
 * Sand tones make the main tree stand out against the gray parallax forest.
 * @returns {Object} Canvas RGB palette for renderGlowTreeToCanvas()
 */
export function getTreePaletteLit() {
  const t = GLOW_PAL.treeLit
  const root = darkenRgb(glowRgb(t.root), ROOT_DARKEN)
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
    woodOutline: glowRgb('void')
  }
}

/**
 * Colour-phase foreground tree palette (after O is collected).
 * @returns {Object} Canvas RGB palette for renderGlowTreeToCanvas()
 */
export function getTreePaletteColor() {
  const t = GLOW_PAL.treeColor
  const root = darkenRgb(glowRgb(t.root), ROOT_DARKEN)
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
      glowRgb('#32571d'),
      glowRgb('#4b6c2e'),
      glowRgb('#6d8740'),
      glowRgb('#aabd68'),
      glowRgb('#cfd496')
    ],
    //
    // Colour-phase bark crack tones come from the palette bark set.
    //
    barkShades: {
      dark: glowRgb(GLOW_PAL.bark.dark),
      highlight: glowRgb(GLOW_PAL.bark.highlight)
    },
    leafVein: glowRgb('#32571d'),
    woodOutline: glowRgb('void')
  }
}

/**
 * Warm amber background-forest palette for the colour world (after O):
 * orange-brown wood dissolving into a golden haze, green foliage kept deep
 * so the layers read like the reference forest picture.
 * @returns {Object} Canvas RGB palette for renderGlowTreeToCanvas()
 */
export function getTreePaletteAmber() {
  const t = GLOW_PAL.treeAmber
  const root = darkenRgb(glowRgb(t.root), ROOT_DARKEN)
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
      dark: glowRgb(t.root),
      highlight: glowRgb(GLOW_PAL.warmHaze)
    },
    leafVein: glowRgb(t.root),
    woodOutline: glowRgb('void')
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
 * @returns {Object} Canvas RGB palette for renderGlowTreeToCanvas()
 */
export function buildDimmedTreePalette(base, bg, blend, flatLeaves = false, leafDarken = 0, uniformWood = false) {
  const mix = (r, g, b) => ({
    r: Math.round(r + (bg.r - r) * blend),
    g: Math.round(g + (bg.g - g) * blend),
    b: Math.round(b + (bg.b - b) * blend)
  })
  const mixRgb = (c) => mix(c.r, c.g, c.b)
  const root = mix(base.rootR, base.rootG, base.rootB)
  const trunk = mix(base.trunkR, base.trunkG, base.trunkB)
  const branch = uniformWood ? trunk : mix(base.branchR, base.branchG, base.branchB)
  const leaf = uniformWood ? trunk : darkenRgb(mix(base.leafR, base.leafG, base.leafB), leafDarken)
  const darkenLeafRgb = (c) => darkenRgb(mixRgb(c), leafDarken)
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
    noLeafDetails: true
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
// Blends a palette tone toward the darkest swatch (void) — brightness-only
// variation of a palette colour, allowed by the palette rule.
//
function darkenRgb(c, t) {
  const v = glowRgb('void')
  return {
    r: Math.round(c.r + (v.r - c.r) * t),
    g: Math.round(c.g + (v.g - c.g) * t),
    b: Math.round(c.b + (v.b - c.b) * t)
  }
}
