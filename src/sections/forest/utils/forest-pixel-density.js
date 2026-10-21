//
// Glow visual pixel-density tiers — one pixel universe, different attention
// levels (background 8–12px clusters … focal 1–2px). Not uniform detail.
//
export const GLOW_PIXEL_DENSITY = {
  background: { clusterCellPx: 14, detailLeavesMin: 0, detailLeavesMax: 0 },
  midground: { clusterCellPx: 10, detailLeavesMin: 0, detailLeavesMax: 1 },
  nearground: { clusterCellPx: 9, detailLeavesMin: 1, detailLeavesMax: 1 },
  gameplay: { clusterCellPx: 5, detailLeavesMin: 1, detailLeavesMax: 2 },
  focal: { clusterCellPx: 2, detailLeavesMin: 1, detailLeavesMax: 2 }
}

/**
 * Merges a foliage density tier into a glow-tree canvas palette.
 * @param {Object} palette - renderGlowTreeIntoContext() palette
 * @param {keyof GLOW_PIXEL_DENSITY} tier
 * @returns {Object}
 */
export function applyFoliageDensityToPalette(palette, tier) {
  const d = GLOW_PIXEL_DENSITY[tier] ?? GLOW_PIXEL_DENSITY.midground
  return {
    ...palette,
    foliageClusterCellPx: d.clusterCellPx,
    foliageDetailLeavesMin: d.detailLeavesMin,
    foliageDetailLeavesMax: d.detailLeavesMax
  }
}

/**
 * buildGlowTree() opts for detail-leaf counts at a tier.
 * @param {keyof GLOW_PIXEL_DENSITY} tier
 * @returns {{ foliageDetailLeavesMin: number, foliageDetailLeavesMax: number }}
 */
export function glowTreeBuildOptsForDensity(tier) {
  const d = GLOW_PIXEL_DENSITY[tier] ?? GLOW_PIXEL_DENSITY.midground
  return {
    foliageDetailLeavesMin: d.detailLeavesMin,
    foliageDetailLeavesMax: d.detailLeavesMax
  }
}

/**
 * Bush oval scale — coarser silhouettes on deeper rows.
 * @param {keyof GLOW_PIXEL_DENSITY} tier
 * @returns {number}
 */
export function glowBushLeafSizeScaleForTier(tier) {
  if (tier === 'background') return 1.42
  if (tier === 'midground') return 1.18
  if (tier === 'nearground') return 1.05
  return 1
}

/**
 * Fewer scattered bush leaves when clusters read larger.
 * @param {keyof GLOW_PIXEL_DENSITY} tier
 * @returns {number}
 */
export function glowBushLeafDensityScaleForTier(tier) {
  if (tier === 'background') return 0.55
  if (tier === 'midground') return 0.78
  return 1
}

/**
 * Film-grain / dither block size for baked surfaces at a tier (matches cluster scale).
 * @param {keyof GLOW_PIXEL_DENSITY} tier
 * @returns {number}
 */
export function glowFilmGrainBlockPxForTier(tier) {
  const d = GLOW_PIXEL_DENSITY[tier] ?? GLOW_PIXEL_DENSITY.gameplay
  return d.clusterCellPx
}

/**
 * Nearest bush row gets extra puffy clusters; far rows stay soft ovals only.
 * @param {keyof GLOW_PIXEL_DENSITY} tier
 * @returns {boolean}
 */
export function glowHiResBushClustersForTier(tier) {
  return tier === 'nearground' || tier === 'gameplay' || tier === 'focal'
}

/**
 * Hi-res bush clump radius range (px) scaled to the tier cluster size.
 * @param {keyof GLOW_PIXEL_DENSITY} tier
 * @returns {{ minPx: number, maxPx: number }}
 */
export function glowBushHiResClusterRadiusRangeForTier(tier) {
  const cell = glowFilmGrainBlockPxForTier(tier)
  return { minPx: cell * 0.9, maxPx: cell * 1.65 }
}
