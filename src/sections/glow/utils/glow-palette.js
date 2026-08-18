import { CFG } from '../../../cfg.js'

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
 * Cute mushroom palette — one decor-gray tone (pre-L flat world).
 * @returns {Object} Hex colour map for drawCuteMushroomToCanvas()
 */
export function getCuteMushroomFlatDecorColors() {
  const g = GLOW_PAL.decorGray
  return {
    body: g,
    bodyShade: g,
    cap: g,
    capDark: g,
    capLight: g,
    spot: g,
    //
    // The pit cave floor/walls are also flat decorGray (see
    // buildCavePaletteFlat in glow-atmosphere.js) — an outline in the same
    // tone made the trampoline mushroom fully invisible there. `void` is
    // the darkest palette swatch already used for every other dark outline
    // in the level, so this keeps the silhouette readable everywhere this
    // palette is used without introducing a new hue.
    //
    outline: GLOW_PAL.void,
    face: GLOW_PAL.void,
    blush: g
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
 * Warm "lit" main-tree palette shown after the L (light) letter is collected.
 * Sand tones make the main tree stand out against the gray parallax forest.
 * @returns {Object} Canvas RGB palette for renderGlowTreeToCanvas()
 */
export function getTreePaletteLit() {
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
    woodOutline: glowRgb('void')
  }
}

/**
 * Colour-phase foreground tree palette (after O is collected).
 * @returns {Object} Canvas RGB palette for renderGlowTreeToCanvas()
 */
export function getTreePaletteColor() {
  const t = GLOW_PAL.treeColor
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
    leafShades: (t.leafShades || [t.leaf]).map(h => glowRgb(h)),
    //
    // Colour-phase bark crack tones come from the palette bark set.
    //
    barkShades: {
      dark: glowRgb(GLOW_PAL.bark.dark),
      highlight: glowRgb(GLOW_PAL.bark.highlight)
    },
    leafVein: glowRgb((t.leafShades && t.leafShades[0]) || t.leaf),
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
      dark: glowRgb(t.root),
      highlight: glowRgb(GLOW_PAL.warmHaze)
    },
    leafVein: glowRgb(t.root),
    woodOutline: glowRgb('void')
  }
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
 * @param {number} [leafWarmBlend=0] - EXTRA blend of the foliage only toward
 *   the backdrop tone — with a warm haze backdrop the leaves lean orange
 *   while the wood keeps its base blend (near colour-world row)
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
// Blends a palette tone toward the darkest swatch (void), then snaps back
// onto a real palette entry so the fill never invents a new colour.
//
function darkenRgb(c, t) {
  if (t <= 0) return c
  const v = glowRgb('void')
  return snapToPalette({
    r: Math.round(c.r + (v.r - c.r) * t),
    g: Math.round(c.g + (v.g - c.g) * t),
    b: Math.round(c.b + (v.b - c.b) * t)
  })
}
