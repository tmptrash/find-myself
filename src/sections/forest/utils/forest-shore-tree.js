import { CFG } from '../../../cfg.js'
import {
  buildGlowShoreAccentTree,
  renderGlowTreeIntoContext
} from './glow-tree.js'
import { getTreePaletteColor, getGlowGameplayTreeVolumeShades } from './glow-palette.js'
import {
  colorKey,
  drawStaticDecorSprite,
  ensureStaticDecorSprite,
  isWorldSpanInView
} from './glow-static-bake.js'
//
// Shore accent left of the chain-buoy eyes — same procedural language as the
// hero tree, but one horizontal branch the hero can land on after the
// leftmost stalk-eye.
//
const SHORE_TREE_SEED = 0x4a71
const SHORE_TREE_LEFT_OF_EYE = 175
const SHORE_TREE_BRANCH_ABOVE_EYE = 96
const SHORE_TREE_BRANCH_ANGLE = 0
const SHORE_TREE_BRANCH_LEN = 120
const SHORE_TREE_CROWN_ABOVE_BRANCH = 46
const SHORE_TREE_STALK_EYE_RADIUS = 11
const SHORE_TREE_FIRST_EYE_ROLE = 'chainTrampFirst'
const SHORE_TREE_BAKE_WORLD_W = CFG.visual.glow.worldWidth
const SHORE_TREE_BAKE_WORLD_H = CFG.visual.glow.worldHeight
const SHORE_TREE_BAKE_SLOT = 'shoreTreeFull-v7'
const SHORE_TREE_BAKE_GRAIN_SEED = 0.61
const SHORE_TREE_CULL_PAD = 120
const SHORE_TREE_BOUNDS_PAD = 28
const SHORE_TREE_WOOD_BOUNDS_PAD = 12
const SHORE_TREE_FOLIAGE_CELL_PAD = 10

/**
 * Places the shore tree left of the first stalk-eye so its horizontal branch
 * sits above that eye — the landing after the eye-to-eye bounce.
 * @param {Array<Object>} buoySpots - Chain-buoy spot list
 * @param {number} floorY - Ground line Y
 * @returns {{ x: number, groundY: number, trunkH: number, branchAttachY: number }|null}
 */
export function buildGlowShoreTreeLayout(buoySpots, floorY) {
  const leftEye = buoySpots?.find(s => s.chainTrampRole === SHORE_TREE_FIRST_EYE_ROLE) ??
    buoySpots?.filter(s => !s.prizeEye).reduce((best, s) => (!best || s.x < best.x ? s : best), null)
  if (!leftEye) return null
  const eyeTopY = leftEye.groundY - leftEye.segmentCount * leftEye.segmentLen - SHORE_TREE_STALK_EYE_RADIUS
  const branchAttachY = eyeTopY - SHORE_TREE_BRANCH_ABOVE_EYE
  return {
    x: leftEye.x - SHORE_TREE_LEFT_OF_EYE,
    groundY: floorY,
    trunkH: floorY - branchAttachY + SHORE_TREE_CROWN_ABOVE_BRANCH,
    branchAttachY
  }
}

/**
 * Creates the shore-tree decor inst (baked main-tree-style sprite).
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {Object} cfg.layout - Result of buildGlowShoreTreeLayout()
 * @returns {Object} Shore-tree inst
 */
export function create(cfg) {
  const { k, layout } = cfg
  const treeData = buildGlowShoreAccentTree({
    seed: SHORE_TREE_SEED,
    trunkX: layout.x,
    groundY: layout.groundY,
    trunkH: layout.trunkH,
    branchAttachY: layout.branchAttachY,
    branchAngle: SHORE_TREE_BRANCH_ANGLE,
    branchLen: SHORE_TREE_BRANCH_LEN
  })
  return { k, x: layout.x, treeData, bounds: treeDataBounds(treeData) }
}

/**
 * Draws the baked shore tree in the colour-world tree palette.
 * @param {Object} inst - Shore-tree inst
 * @param {number} [opacity=1] - Reveal fade
 * @param {{x1: number, x2: number}|null} [view=null] - Camera cull span
 */
export function onDraw(inst, opacity = 1, view = null) {
  const { bounds } = inst
  if (!isWorldSpanInView(bounds.x1 - SHORE_TREE_CULL_PAD, bounds.x2 + SHORE_TREE_CULL_PAD, view)) return
  const palette = getTreePaletteColor()
  const baked = ensureStaticDecorSprite(
    inst.k,
    inst,
    SHORE_TREE_BAKE_SLOT,
    colorKey(palette.leafShades[0], palette.leafShades[palette.leafShades.length - 1]),
    bounds,
    ctx => paintShoreTree(ctx, inst.treeData, palette),
    inst.x * SHORE_TREE_BAKE_GRAIN_SEED
  )
  drawStaticDecorSprite(inst.k, baked, opacity)
}
//
// Same side-lit wood as the main tree so both gameplay trees share one light.
//
function paintShoreTree(ctx, treeData, palette) {
  const lit = { ...palette, woodVolume: getGlowGameplayTreeVolumeShades() }
  renderGlowTreeIntoContext(ctx, treeData, lit, SHORE_TREE_BAKE_WORLD_W, SHORE_TREE_BAKE_WORLD_H)
}
//
// Root segments use the same {sx, sy, ex, ey, w} shape as wood segments.
//
function treeDataBounds(treeData) {
  const bounds = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity }
  const grow = (x, y, r) => {
    bounds.x1 = Math.min(bounds.x1, x - r)
    bounds.y1 = Math.min(bounds.y1, y - r)
    bounds.x2 = Math.max(bounds.x2, x + r)
    bounds.y2 = Math.max(bounds.y2, y + r)
  }
  const growSeg = seg => {
    const r = Math.max(seg.w ?? 0, seg.w2 ?? 0) * 0.5 + SHORE_TREE_WOOD_BOUNDS_PAD
    grow(seg.sx, seg.sy, r)
    grow(seg.ex, seg.ey, r)
  }
  treeData.trunkSegs.forEach(growSeg)
  treeData.branchSegs.forEach(growSeg)
  treeData.rootSegs.forEach(growSeg)
  const cellPx = getTreePaletteColor().foliageClusterCellPx
  treeData.leaves.forEach(leaf => {
    if (leaf.type !== 'cluster') {
      grow(leaf.x, leaf.y, leaf.size)
      return
    }
    leaf.cells.forEach(c => grow(leaf.x + c.dx * cellPx, leaf.y + c.dy * cellPx, cellPx + SHORE_TREE_FOLIAGE_CELL_PAD))
  })
  bounds.x1 -= SHORE_TREE_BOUNDS_PAD
  bounds.y1 -= SHORE_TREE_BOUNDS_PAD
  bounds.x2 += SHORE_TREE_BOUNDS_PAD
  bounds.y2 += SHORE_TREE_BOUNDS_PAD
  return bounds
}
