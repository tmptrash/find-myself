import { renderGlowTreeToCanvas } from './glow-tree.js'
import {
  getTreePaletteLit,
  getTreePaletteColor,
  getTreePaletteFlatDecor
} from './glow-palette.js'
import { applyGlowFilmGrainToCanvas } from './glow-parallax-grain.js'

//
// Segment ids persisted in localStorage under glow.treeSegmentsRevealed.
//
export const TREE_SEGMENT_HERO_BRANCH = 'heroBranch'
//
// Three equal reveal steps (trunk, roots, branches and leaves split by count).
//
export const TREE_REVEAL_PART_COUNT = 3
export const TREE_SEGMENT_PART_PREFIX = 'treePart-'
//
// Legacy ids from earlier builds (migrated on load).
//
const LEGACY_TRUNK = 'trunk'
const LEGACY_ROOTS = 'roots'
const LEGACY_BRANCH_PREFIX = 'branch-'
const LEGACY_BRANCH_GROUP_PREFIX = 'branchGroup-'
const LEAF_NEAR_BRANCH_PX = 72
const HERO_BRANCH_LEAF_PAD_X = 48
const HERO_BRANCH_LEAF_PAD_Y = 90
const NEAR_BRANCH_PAD_X = 150
const NEAR_BRANCH_PAD_Y = 170
const NEAR_BRANCH_MIN_COUNT = 4
const SEGMENT_SPRITE_PREFIX = 'glow0-tree-seg-'
//
// Builds the reveal queue: three equal tree parts, one per branch landing.
//
export function buildGlowTreeSegmentPlan(treeData) {
  const pending = []
  for (let p = 0; p < TREE_REVEAL_PART_COUNT; p++) {
    pending.push({ id: `${TREE_SEGMENT_PART_PREFIX}${p}` })
  }
  return {
    pendingIds: pending.map(entry => entry.id)
  }
}
/**
 * Filters tree geometry for one segment bake pass.
 * @param {Object} treeData - Full tree from buildGlowTree()
 * @param {string} segmentId - Segment id
 * @returns {Object} Shallow tree data for renderGlowTreeIntoContext
 */
export function treeDataForSegment(treeData, segmentId) {
  const base = {
    seed: treeData.seed,
    trunkSegs: [],
    rootSegs: [],
    branchSegs: [],
    leaves: [],
    horizBranch: treeData.horizBranch,
    trunkBase: treeData.trunkBase ?? treeData.trunkSegs[0],
    rootStartY: treeData.rootStartY,
    groundClipY: treeData.groundClipY,
    heroBranchSegFrom: treeData.heroBranchSegFrom
  }
  if (segmentId === TREE_SEGMENT_HERO_BRANCH) {
    const from = treeData.heroBranchSegFrom ?? 0
    base.branchSegs = treeData.branchSegs.slice(from)
    base.leaves = leavesForHeroBranch(treeData)
    return base
  }
  if (segmentId.startsWith(TREE_SEGMENT_PART_PREFIX)) {
    const part = Number(segmentId.slice(TREE_SEGMENT_PART_PREFIX.length))
    if (!Number.isNaN(part) && part >= 0 && part < TREE_REVEAL_PART_COUNT) {
      applyTreeRevealPartGeometry(treeData, base, part)
    }
    return base
  }
  if (segmentId === LEGACY_TRUNK) {
    base.trunkSegs = treeData.trunkSegs
    return base
  }
  if (segmentId === LEGACY_ROOTS) {
    base.rootSegs = treeData.rootSegs
    return base
  }
  if (segmentId.startsWith(LEGACY_BRANCH_PREFIX)) {
    const idx = Number(segmentId.slice(LEGACY_BRANCH_PREFIX.length))
    if (!Number.isNaN(idx) && treeData.branchSegs[idx]) {
      base.branchSegs = [treeData.branchSegs[idx]]
      base.leaves = leavesNearBranch(treeData, treeData.branchSegs[idx])
    }
  }
  return base
}
/**
 * Maps saved segment ids to the current three-part plan.
 * @param {string[]} savedIds - From localStorage
 * @param {Object} treeData - Full tree
 * @param {Object} plan - From buildGlowTreeSegmentPlan
 * @returns {string[]}
 */
export function normalizePersistedTreeSegmentIds(savedIds, treeData, plan) {
  const valid = new Set(allGlowTreeSegmentIds(treeData, plan))
  const out = new Set()
  savedIds.forEach(id => {
    if (valid.has(id)) {
      out.add(id)
      return
    }
    if (id === TREE_SEGMENT_HERO_BRANCH) {
      out.add(`${TREE_SEGMENT_PART_PREFIX}${TREE_REVEAL_PART_COUNT - 1}`)
      return
    }
    const legacyPart = legacySegmentToRevealPart(id, treeData)
    legacyPart != null && out.add(`${TREE_SEGMENT_PART_PREFIX}${legacyPart}`)
  })
  return [...out]
}
/**
 * Bakes gray-flat, gray-lit, and colour-world sprites for every segment.
 * @param {Object} k - Kaplay instance
 * @param {Object} treeData - Full tree data
 * @param {number} w - Canvas width
 * @param {number} h - Canvas height
 * @param {string[]} segmentIds - All segment ids to bake
 */
export function bakeGlowTreeSegmentSprites(k, treeData, w, h, segmentIds) {
  const palettes = {
    flat: getTreePaletteFlatDecor(),
    lit: getTreePaletteLit(),
    color: getTreePaletteColor()
  }
  segmentIds.forEach(id => {
    bakeOneGlowTreeSegment(k, treeData, w, h, id, palettes)
  })
}
/**
 * Creates kaplay objects for each tree segment (opacity 0 until revealed).
 * @param {Object} k - Kaplay instance
 * @param {string[]} segmentIds - Segment ids
 * @param {number} z - Draw order z index
 * @returns {Object} Map segmentId -> { grayObj, colorObj, fade, revealed }
 */
export function segmentGraySpriteName(segmentId, lit) {
  const suffix = lit ? '-lit' : '-flat'
  return SEGMENT_SPRITE_PREFIX + segmentId + suffix
}
/**
 * Creates kaplay objects for each tree segment (opacity 0 until revealed).
 * @param {Object} k - Kaplay instance
 * @param {string[]} segmentIds - Segment ids
 * @param {number} z - Draw order z index
 * @param {boolean} litGray - Use warm lit gray sprites (after L)
 * @returns {Object} Map segmentId -> { grayObj, colorObj, fade, revealed }
 */
export function createGlowTreeSegmentObjects(k, segmentIds, z, litGray = false) {
  const entries = {}
  segmentIds.forEach(id => {
    const grayName = segmentGraySpriteName(id, litGray)
    const grayObj = k.add([
      k.sprite(grayName),
      k.pos(0, 0),
      k.z(z),
      k.opacity(0)
    ])
    grayObj.hidden = true
    const colorObj = k.add([
      k.sprite(SEGMENT_SPRITE_PREFIX + id + '-color'),
      k.pos(0, 0),
      k.z(z),
      k.opacity(0)
    ])
    colorObj.hidden = true
    entries[id] = { grayObj, colorObj, fade: 0, revealed: false }
  })
  return entries
}
/**
 * All segment ids for a tree (hero + pending plan).
 * @param {Object} treeData - Tree data
 * @param {Object} plan - From buildGlowTreeSegmentPlan
 * @returns {string[]}
 */
export function allGlowTreeSegmentIds(treeData, plan) {
  return [...plan.pendingIds]
}
//
// Story order across the three landings: neighbouring branches (and the
// start branch itself), then the trunk, then roots and the remaining canopy.
//
function applyTreeRevealPartGeometry(treeData, base, partIndex) {
  const heroFrom = treeData.heroBranchSegFrom ?? treeData.branchSegs.length
  const heroSegs = treeData.branchSegs.slice(heroFrom)
  const otherSegs = treeData.branchSegs.slice(0, heroFrom)
  const nearSegs = nearbyBranchSegs(treeData, otherSegs)
  const farSegs = otherSegs.filter(seg => !nearSegs.includes(seg))
  if (partIndex === 0) {
    base.branchSegs = [...nearSegs, ...heroSegs]
    base.leaves = leavesForBranchGroup(treeData, base.branchSegs)
    return
  }
  if (partIndex === 1) {
    base.trunkSegs = treeData.trunkSegs
    return
  }
  base.rootSegs = treeData.rootSegs
  base.branchSegs = farSegs
  const claimed = new Set(leavesForBranchGroup(treeData, [...nearSegs, ...heroSegs]).map(leaf => `${leaf.x}|${leaf.y}`))
  const farLeaves = treeData.leaves.filter(leaf => !claimed.has(`${leaf.x}|${leaf.y}`))
  base.leaves = mergeUniqueLeaves(leavesForBranchGroup(treeData, farSegs), farLeaves)
}
//
// Branches that sit next to the start platform — they appear with it so the
// tree grows outward from the hero instead of in random thirds.
//
function nearbyBranchSegs(treeData, segs) {
  const hb = treeData.horizBranch
  if (!hb || !segs.length) return segs.slice(0, Math.min(NEAR_BRANCH_MIN_COUNT, segs.length))
  const x1 = Math.min(hb.x1, hb.x2) - NEAR_BRANCH_PAD_X
  const x2 = Math.max(hb.x1, hb.x2) + NEAR_BRANCH_PAD_X
  const y1 = hb.y - NEAR_BRANCH_PAD_Y
  const y2 = hb.y + NEAR_BRANCH_PAD_Y
  const near = segs.filter(seg => {
    const mx = (seg.sx + seg.ex) * 0.5
    const my = (seg.sy + seg.ey) * 0.5
    return mx >= x1 && mx <= x2 && my >= y1 && my <= y2
  })
  if (near.length >= NEAR_BRANCH_MIN_COUNT) return near
  const ranked = [...segs].sort((a, b) => {
    const da = branchDistToHero(a, hb)
    const db = branchDistToHero(b, hb)
    return da - db
  })
  return ranked.slice(0, Math.min(NEAR_BRANCH_MIN_COUNT, ranked.length))
}
function branchDistToHero(seg, hb) {
  const mx = (seg.sx + seg.ex) * 0.5
  const my = (seg.sy + seg.ey) * 0.5
  const cx = (hb.x1 + hb.x2) * 0.5
  const dx = mx - cx
  const dy = my - hb.y
  return dx * dx + dy * dy
}
//
// Dedupes leaf entries by position key.
//
function mergeUniqueLeaves(a, b) {
  const seen = new Set()
  const out = []
  ;[...a, ...b].forEach(leaf => {
    const key = `${leaf.x}|${leaf.y}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(leaf)
  })
  return out
}
//
// Maps a legacy segment id to treePart-0..2 when possible.
//
function legacySegmentToRevealPart(id, treeData) {
  if (id === LEGACY_TRUNK || id === LEGACY_ROOTS) return 0
  if (id.startsWith(TREE_SEGMENT_PART_PREFIX)) {
    const p = Number(id.slice(TREE_SEGMENT_PART_PREFIX.length))
    return Number.isNaN(p) ? null : p
  }
  if (id.startsWith(LEGACY_BRANCH_GROUP_PREFIX)) {
    const g = Number(id.slice(LEGACY_BRANCH_GROUP_PREFIX.length))
    if (Number.isNaN(g)) return null
    const heroFrom = treeData.heroBranchSegFrom ?? treeData.branchSegs.length
    const chunk = Math.max(1, Math.ceil(heroFrom / TREE_REVEAL_PART_COUNT))
    const start = g * 6
    return Math.min(TREE_REVEAL_PART_COUNT - 1, Math.floor(start / chunk))
  }
  if (id.startsWith(LEGACY_BRANCH_PREFIX)) {
    const idx = Number(id.slice(LEGACY_BRANCH_PREFIX.length))
    if (Number.isNaN(idx) || idx < 0) return null
    const total = treeData.branchSegs.length
    if (idx >= total) return null
    return Math.min(TREE_REVEAL_PART_COUNT - 1, Math.floor(idx * TREE_REVEAL_PART_COUNT / total))
  }
  return null
}
//
// Bakes flat, lit and colour sprites for one segment id.
//
function bakeOneGlowTreeSegment(k, treeData, w, h, id, palettes) {
  const partial = treeDataForSegment(treeData, id)
  const flatName = SEGMENT_SPRITE_PREFIX + id + '-flat'
  const litName = SEGMENT_SPRITE_PREFIX + id + '-lit'
  const colorName = SEGMENT_SPRITE_PREFIX + id + '-color'
  loadGlowTreeSegmentSprite(k, flatName, renderGlowTreeToCanvas(partial, palettes.flat, w, h), 0)
  loadGlowTreeSegmentSprite(k, litName, renderGlowTreeToCanvas(partial, palettes.lit, w, h), 1)
  loadGlowTreeSegmentSprite(k, colorName, renderGlowTreeToCanvas(partial, palettes.color, w, h), 2)
}
//
// Loads one tree-segment canvas with the shared glow film grain baked in.
//
function loadGlowTreeSegmentSprite(k, name, canvas, seedOffset) {
  applyGlowFilmGrainToCanvas(canvas, name.length * 31 + seedOffset)
  k.loadSprite(name, canvas)
  canvas.width = 0
  canvas.height = 0
}
//
// Leaves that belong to the hero start branch platform band.
//
function leavesForHeroBranch(treeData) {
  const hb = treeData.horizBranch
  if (!hb) return []
  const x1 = Math.min(hb.x1, hb.x2) - HERO_BRANCH_LEAF_PAD_X
  const x2 = Math.max(hb.x1, hb.x2) + HERO_BRANCH_LEAF_PAD_X
  const yTop = hb.physY - HERO_BRANCH_LEAF_PAD_Y
  const yBot = hb.y + HERO_BRANCH_LEAF_PAD_Y
  return treeData.leaves.filter(leaf =>
    leaf.x >= x1 && leaf.x <= x2 && leaf.y >= yTop && leaf.y <= yBot
  )
}
//
// Leaves scattered near several branch segments in one group.
//
function leavesForBranchGroup(treeData, segs) {
  const out = []
  const seen = new Set()
  segs.forEach(seg => {
    leavesNearBranch(treeData, seg).forEach(leaf => {
      const key = `${leaf.x}|${leaf.y}`
      if (seen.has(key)) return
      seen.add(key)
      out.push(leaf)
    })
  })
  return out
}
//
// Leaves scattered near one branch segment endpoint.
//
function leavesNearBranch(treeData, seg) {
  const mx = (seg.sx + seg.ex) * 0.5
  const my = (seg.sy + seg.ey) * 0.5
  return treeData.leaves.filter(leaf => {
    const dx = leaf.x - mx
    const dy = leaf.y - my
    return dx * dx + dy * dy <= LEAF_NEAR_BRANCH_PX * LEAF_NEAR_BRANCH_PX
  })
}
