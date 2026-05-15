import { CFG } from '../cfg.js'
import { toCanvas } from '../../../utils/helper.js'
import { loadTouchSprite } from '../../../utils/touch-sprite-registry.js'

//
// Branch rotation easing used by dynamic organic-tree drawers (per frame).
//
export const BRANCH_SWAY_SMOOTH_PER_SEC = 8.5

/**
 * Random trunk (+ paired root) palette — chocolates / gray-brown / reddish.
 *
 * @returns {{ trunk: { r: number, g: number, b: number }, root: { r: number, g: number, b: number } }}
 */
export function buildTreePalette() {
  const palettes = [
    { trunk: [55, 40, 28], root: [40, 28, 18] },
    { trunk: [80, 55, 35], root: [55, 38, 22] },
    { trunk: [95, 85, 70], root: [60, 50, 35] },
    { trunk: [105, 60, 40], root: [70, 38, 22] },
    { trunk: [70, 65, 50], root: [50, 42, 28] }
  ]
  const base = palettes[Math.floor(Math.random() * palettes.length)]
  const jitter = (v) => Math.max(0, Math.min(255, v + Math.floor((Math.random() - 0.5) * 14)))
  return {
    trunk: { r: jitter(base.trunk[0]), g: jitter(base.trunk[1]), b: jitter(base.trunk[2]) },
    root: { r: jitter(base.root[0]), g: jitter(base.root[1]), b: jitter(base.root[2]) }
  }
}

/**
 * Procedural organic tree: wiggly trunk segments, roots, branch clusters with autumn leaves.
 *
 * @param {number} trunkBottomY - Ground contact Y
 * @param {number} trunkTopY - Upper trunk Y (organic trunk grows upward inside span)
 * @param {Object} [opts] - Generation overrides
 * @param {number} [opts.rootAbsoluteMaxY] - Hard cap for root tips (screen/world bottom)
 * @param {number} [opts.rootCountMin] - Minimum primary roots (inclusive)
 * @param {number} [opts.rootCountMax] - Maximum primary roots (inclusive)
 * @param {number} [opts.rootSegmentsMin] - Minimum segments per primary root
 * @param {number} [opts.rootSegmentsRange] - Random span added to min (exclusive upper via Math.random)
 * @param {boolean} [opts.includeRoots=true] - When false, trunk-only (no underground roots)
 * @returns {{ trunkSegments: Array, rootSegments: Array, branchClusters: Array }}
 */
export function buildOrganicTreeData(trunkBottomY, trunkTopY, opts = {}) {
  const rootAbsoluteMaxY = opts.rootAbsoluteMaxY ?? (CFG.visual.screen.height - 6)
  const rootCountMin = opts.rootCountMin ?? 3
  const rootCountMax = opts.rootCountMax ?? 4
  const rootSegmentsMin = opts.rootSegmentsMin ?? 22
  const rootSegmentsRange = opts.rootSegmentsRange ?? 14
  const includeRoots = opts.includeRoots !== false
  const trunkSegments = []
  const trunkSteps = 14
  const trunkStep = (trunkBottomY - trunkTopY) / trunkSteps
  let cx = 0
  let cy = trunkBottomY
  for (let i = 0; i < trunkSteps; i++) {
    const prevX = cx
    const prevY = cy
    cx += (Math.random() - 0.5) * 1.5
    cy -= trunkStep
    trunkSegments.push({ startX: prevX, startY: prevY, endX: cx, endY: cy, width: 5 + Math.random() * 1.5, depth: 0 })
  }
  const trunkTopX = cx
  const trunkTopY2 = cy
  const palette = buildAutumnPalette()
  const branchClusters = [
    buildBranchCluster(trunkTopX, trunkTopY2, -Math.PI / 2, 10, 4, palette),
    buildBranchCluster(trunkTopX, trunkTopY2, -Math.PI / 2 - 0.45, 8, 3.4, palette),
    buildBranchCluster(trunkTopX, trunkTopY2, -Math.PI / 2 + 0.45, 8, 3.4, palette)
  ]
  const rootSegments = []
  if (includeRoots) {
    const rootCount = rootCountMin + Math.floor(Math.random() * (rootCountMax - rootCountMin + 1))
    for (let r = 0; r < rootCount; r++) {
      const rootAngle = Math.PI / 2 + (Math.random() - 0.5) * 0.95
      const rootSegmentsCount = rootSegmentsMin + Math.floor(Math.random() * rootSegmentsRange)
      const rootThickness = 3 + Math.random() * 1.5
      rootSegments.push(...growTreeRoots(0, trunkBottomY, rootAngle, rootSegmentsCount, rootThickness, 0, rootAbsoluteMaxY))
    }
  }
  return { trunkSegments, rootSegments, branchClusters }
}

/**
 * Pulls trunk + foliage RGB toward a flat background grey so mid-distance trees read softer.
 *
 * @param {Object} tree - Organic tree descriptor (mutated)
 * @param {{ r: number, g: number, b: number }} bg - Target fog colour
 * @param {number} amount - Blend strength in [0, 1]
 */
export function blendOrganicTowardBackground(tree, bg, amount) {
  const mix = (ch, bch) => Math.round(ch * (1 - amount) + bch * amount)
  tree.trunkColor = {
    r: mix(tree.trunkColor.r, bg.r),
    g: mix(tree.trunkColor.g, bg.g),
    b: mix(tree.trunkColor.b, bg.b)
  }
  if (tree.leafColor) {
    tree.leafColor = {
      r: mix(tree.leafColor.r, bg.r),
      g: mix(tree.leafColor.g, bg.g),
      b: mix(tree.leafColor.b, bg.b)
    }
  }
  tree.rootColor && (tree.rootColor = {
    r: mix(tree.rootColor.r, bg.r),
    g: mix(tree.rootColor.g, bg.g),
    b: mix(tree.rootColor.b, bg.b)
  })
  if (!tree.branchClusters) return
  for (const cluster of tree.branchClusters) {
    for (const leaf of cluster.leaves) {
      leaf.r = mix(leaf.r, bg.r)
      leaf.g = mix(leaf.g, bg.g)
      leaf.b = mix(leaf.b, bg.b)
    }
  }
}

/**
 * Darkens trunk, unified root and every leaf RGB so whole reads farther away (parallax mid-layer).
 *
 * @param {Object} tree - Tree descriptor used by drawOrganicTreeToCanvas (mutated)
 * @param {number} factor - Multiplier in (0, 1]
 */
export function dimOrganicTreeColors(tree, factor) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.floor(v * factor)))
  tree.trunkColor = {
    r: clamp(tree.trunkColor.r),
    g: clamp(tree.trunkColor.g),
    b: clamp(tree.trunkColor.b)
  }
  tree.rootColor && (tree.rootColor = {
    r: clamp(tree.rootColor.r),
    g: clamp(tree.rootColor.g),
    b: clamp(tree.rootColor.b)
  })
  tree.leafColor && (tree.leafColor = {
    r: clamp(tree.leafColor.r),
    g: clamp(tree.leafColor.g),
    b: clamp(tree.leafColor.b)
  })
  if (!tree.branchClusters) return
  for (const cluster of tree.branchClusters) {
    for (const leaf of cluster.leaves) {
      leaf.r = clamp(leaf.r)
      leaf.g = clamp(leaf.g)
      leaf.b = clamp(leaf.b)
    }
  }
}

/**
 * Draw trunk, roots and clusters (branches + leaves) on a 2D canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} tree - Tree with trunkSegments, rootSegments, branchClusters, trunkColor
 * @param {number} sway - Horizontal sway offset passed into cluster drawing
 */
export function drawOrganicTreeToCanvas(ctx, tree, sway) {
  if (!tree.branchClusters) return
  const trunkColor = `rgba(${tree.trunkColor.r}, ${tree.trunkColor.g}, ${tree.trunkColor.b}, ${tree.opacity})`
  const rc = tree.rootColor || { r: 60, g: 40, b: 25 }
  const rootAlpha = Math.min(1, tree.opacity) * 0.92
  const rootColor = `rgba(${rc.r}, ${rc.g}, ${rc.b}, ${rootAlpha})`
  ctx.lineCap = 'round'
  for (const seg of tree.rootSegments) {
    ctx.strokeStyle = rootColor
    ctx.lineWidth = seg.width
    ctx.beginPath()
    ctx.moveTo(tree.x + seg.startX, seg.startY)
    ctx.lineTo(tree.x + seg.endX, seg.endY)
    ctx.stroke()
  }
  for (const seg of tree.trunkSegments) {
    ctx.strokeStyle = trunkColor
    ctx.lineWidth = seg.width
    ctx.beginPath()
    ctx.moveTo(tree.x + seg.startX, seg.startY)
    ctx.lineTo(tree.x + seg.endX, seg.endY)
    ctx.stroke()
  }
  for (const cluster of tree.branchClusters) {
    drawClusterToCanvas(ctx, tree, cluster, sway, trunkColor)
  }
}

/**
 * Single realistic leaf for sprite bake paths (cluster sprites).
 *
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawRealisticLeafToCanvas(ctx, x, y, size, angle, r, g, b, opacity) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(-size * 0.6, -size * 0.3, 0, -size)
  ctx.quadraticCurveTo(size * 0.6, -size * 0.3, 0, 0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = `rgba(40, 60, 40, ${0.35 * opacity})`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, -size)
  ctx.stroke()
  ctx.restore()
}

function growTreeRoots(x, y, angle, segments, thickness, depth, maxY) {
  const out = []
  if (segments <= 0 || thickness <= 0.35 || depth > 6) return out
  const step = 5 + Math.random() * 4
  let cx = x
  let cy = y
  for (let i = 0; i < segments; i++) {
    const prevX = cx
    const prevY = cy
    const downwardBias = cy < maxY - 25 ? (Math.PI / 2 - angle) * 0.1 : 0
    angle += (Math.random() - 0.5) * 0.26 + downwardBias
    cx += Math.cos(angle) * step
    cy += Math.sin(angle) * step
    if (cy > maxY) {
      cy = maxY
      out.push({ startX: prevX, startY: prevY, endX: cx, endY: cy, width: thickness, depth })
      return out
    }
    out.push({ startX: prevX, startY: prevY, endX: cx, endY: cy, width: thickness, depth })
    if (Math.random() < 0.14 && depth < 4) {
      out.push(...growTreeRoots(cx, cy, angle + (Math.random() - 0.5) * 0.65, Math.floor(segments * 0.55), thickness * 0.72, depth + 1, maxY))
    }
  }
  return out
}

function growTreeBranches(x, y, angle, length, thickness, depth = 0, endpoints = []) {
  const out = []
  if (length <= 3 || thickness <= 0.45 || depth > 7) {
    endpoints.push({ x, y, depth })
    return out
  }
  const step = 4 + Math.random() * 4
  let cx = x
  let cy = y
  for (let i = 0; i < length; i++) {
    const prevX = cx
    const prevY = cy
    angle += (Math.random() - 0.5) * 0.24
    cx += Math.cos(angle) * step
    cy += Math.sin(angle) * step
    out.push({ startX: prevX, startY: prevY, endX: cx, endY: cy, width: thickness, depth })
    if (depth >= 2 && i > 0 && i % 2 === 0 && Math.random() < 0.45) {
      endpoints.push({ x: cx, y: cy, depth, mid: true })
    }
  }
  if (Math.random() < 0.8) {
    out.push(...growTreeBranches(cx, cy, angle + (Math.random() - 0.5) * 1.6, Math.floor(length * 0.65), thickness * 0.65, depth + 1, endpoints))
  }
  if (Math.random() < 0.55 && depth < 5) {
    out.push(...growTreeBranches(cx, cy, angle + (Math.random() - 0.5) * 1.2, Math.floor(length * 0.55), thickness * 0.55, depth + 1, endpoints))
  }
  out.push(...growTreeBranches(cx, cy, angle + (Math.random() - 0.5) * 0.5, Math.floor(length * 0.78), thickness * 0.78, depth + 1, endpoints))
  return out
}

function makeLeafCluster(endpoint, palette) {
  const leaves = []
  const isMid = !!endpoint.mid
  const count = isMid ? 8 + Math.floor(Math.random() * 7) : 14 + Math.floor(Math.random() * 9)
  const spread = isMid ? 14 : 22
  for (let j = 0; j < count; j++) {
    const a = Math.random() * Math.PI * 2
    const dist = Math.random() * spread
    const colorBase = palette[Math.floor(Math.random() * palette.length)]
    const r = Math.max(0, Math.min(255, colorBase[0] + Math.floor((Math.random() - 0.5) * 30)))
    const g = Math.max(0, Math.min(255, colorBase[1] + Math.floor((Math.random() - 0.5) * 30)))
    const b = Math.max(0, Math.min(255, colorBase[2] + Math.floor((Math.random() - 0.5) * 20)))
    leaves.push({
      x: endpoint.x + Math.cos(a) * dist,
      y: endpoint.y + Math.sin(a) * dist * 0.7,
      size: 5 + Math.random() * 6,
      rotation: (Math.random() - 0.5) * Math.PI * 2,
      r, g, b,
      opacity: 0.85 + Math.random() * 0.15
    })
  }
  return leaves
}

function buildAutumnPalette() {
  return [
    [40, 75, 35],
    [60, 95, 40],
    [150, 110, 30],
    [200, 160, 50],
    [180, 100, 40],
    [220, 130, 60],
    [160, 50, 35],
    [200, 70, 50]
  ]
}

function buildBranchCluster(pivotX, pivotY, angle, length, thickness, palette) {
  const endpoints = []
  const branchSegments = growTreeBranches(0, 0, angle, length, thickness, 0, endpoints)
  const leaves = []
  endpoints.forEach(ep => leaves.push(...makeLeafCluster(ep, palette)))
  return {
    branchSegments,
    leaves,
    pivotX,
    pivotY,
    swayPhase: Math.random() * Math.PI * 2,
    swaySpeed: 0.7 + Math.random() * 0.6,
    swayAmount: 0.6 + Math.random() * 1,
    smoothedAngleDeg: null
  }
}

function drawClusterToCanvas(ctx, tree, cluster, sway, trunkColor) {
  for (const seg of cluster.branchSegments) {
    ctx.strokeStyle = trunkColor
    ctx.lineWidth = seg.width
    ctx.beginPath()
    ctx.moveTo(tree.x + cluster.pivotX + seg.startX + sway * 0.4, cluster.pivotY + seg.startY)
    ctx.lineTo(tree.x + cluster.pivotX + seg.endX + sway, cluster.pivotY + seg.endY)
    ctx.stroke()
  }
  for (const leaf of cluster.leaves) {
    drawRealisticLeafToCanvas(
      ctx,
      tree.x + cluster.pivotX + leaf.x + sway,
      cluster.pivotY + leaf.y,
      leaf.size,
      leaf.rotation,
      leaf.r, leaf.g, leaf.b,
      leaf.opacity * tree.opacity
    )
  }
}

/**
 * Bake trunk + roots and each branch cluster to sprites for hinged sway rendering.
 *
 * @param {Object} k - Kaplay instance
 * @param {Object} tree - Organic tree descriptor (mutated with sprite metadata)
 * @param {string} baseSpriteName - Unique prefix for loadSprite keys
 */
export function prerenderOrganicTreeSprites(k, tree, baseSpriteName) {
  if (!tree.branchClusters) return
  prerenderTrunkSprite(k, tree, `${baseSpriteName}-trunk`)
  tree.branchClusters.forEach((cluster, i) => {
    prerenderClusterSprite(k, tree, cluster, `${baseSpriteName}-cluster-${i}`)
  })
}

/**
 * Bake one dimmed full-organic-tree PNG (sway=0) for depth pass behind hinged sprites.
 *
 * @param {Object} k - Kaplay instance
 * @param {Object} tree - Organic tree (mutated with darkBackdropSpriteName, darkBackdropX, darkBackdropY)
 * @param {string} baseSpriteName - Prefix shared with prerenderOrganicTreeSprites
 * @param {number} [dimRgbFactor=0.38] - RGB multiplier for farther read
 * @param {number} [opacityScale=0.88] - Whole-tree alpha scale after dimming
 */
export function prerenderOrganicDarkBackdropSprite(k, tree, baseSpriteName, dimRgbFactor = 0.38, opacityScale = 0.88) {
  if (!tree.branchClusters) return
  const bb = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  extendOrganicTreeCanvasBounds(tree, bb, 0)
  if (!isFinite(bb.minX)) return
  const pad = 20
  const w = Math.ceil(bb.maxX - bb.minX + pad * 2)
  const h = Math.ceil(bb.maxY - bb.minY + pad * 2)
  const snap = dimOrganicTreeSnapshot(tree, dimRgbFactor, opacityScale)
  const name = `${baseSpriteName}-dark-backdrop`
  const dataUrl = toCanvas({ width: w, height: h, pixelRatio: 1 }, (ctx) => {
    ctx.translate(-bb.minX + pad, -bb.minY + pad)
    drawOrganicTreeToCanvas(ctx, snap, 0)
  })
  loadTouchSprite(k, name, dataUrl)
  tree.darkBackdropSpriteName = name
  tree.darkBackdropX = bb.minX - pad
  tree.darkBackdropY = bb.minY - pad
}

function prerenderTrunkSprite(k, tree, spriteName) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  const accum = (seg) => {
    if (seg.startX < minX) minX = seg.startX
    if (seg.endX < minX) minX = seg.endX
    if (seg.startX > maxX) maxX = seg.startX
    if (seg.endX > maxX) maxX = seg.endX
    if (seg.startY < minY) minY = seg.startY
    if (seg.endY < minY) minY = seg.endY
    if (seg.startY > maxY) maxY = seg.startY
    if (seg.endY > maxY) maxY = seg.endY
  }
  for (const seg of tree.trunkSegments) accum(seg)
  for (const seg of tree.rootSegments) accum(seg)
  if (!isFinite(minX)) return
  const pad = 8
  const w = Math.ceil(maxX - minX + pad * 2)
  const h = Math.ceil(maxY - minY + pad * 2)
  const trunkColorStr = `rgba(${tree.trunkColor.r}, ${tree.trunkColor.g}, ${tree.trunkColor.b}, ${tree.opacity})`
  const rc = tree.rootColor || { r: 60, g: 40, b: 25 }
  const rootColorStr = `rgba(${rc.r}, ${rc.g}, ${rc.b}, 0.9)`
  const dataUrl = toCanvas({ width: w, height: h, pixelRatio: 1 }, (ctx) => {
    ctx.translate(-minX + pad, -minY + pad)
    ctx.lineCap = 'round'
    for (const seg of tree.rootSegments) {
      ctx.strokeStyle = rootColorStr
      ctx.lineWidth = seg.width
      ctx.beginPath()
      ctx.moveTo(seg.startX, seg.startY)
      ctx.lineTo(seg.endX, seg.endY)
      ctx.stroke()
    }
    for (const seg of tree.trunkSegments) {
      ctx.strokeStyle = trunkColorStr
      ctx.lineWidth = seg.width
      ctx.beginPath()
      ctx.moveTo(seg.startX, seg.startY)
      ctx.lineTo(seg.endX, seg.endY)
      ctx.stroke()
    }
  })
  loadTouchSprite(k, spriteName, dataUrl)
  tree.trunkSpriteName = spriteName
  tree.trunkSpriteX = tree.x + minX - pad
  tree.trunkSpriteY = minY - pad
}

function prerenderClusterSprite(k, tree, cluster, spriteName) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const seg of cluster.branchSegments) {
    if (seg.startX < minX) minX = seg.startX
    if (seg.endX < minX) minX = seg.endX
    if (seg.startX > maxX) maxX = seg.startX
    if (seg.endX > maxX) maxX = seg.endX
    if (seg.startY < minY) minY = seg.startY
    if (seg.endY < minY) minY = seg.endY
    if (seg.startY > maxY) maxY = seg.startY
    if (seg.endY > maxY) maxY = seg.endY
  }
  for (const leaf of cluster.leaves) {
    if (leaf.x - leaf.size < minX) minX = leaf.x - leaf.size
    if (leaf.x + leaf.size > maxX) maxX = leaf.x + leaf.size
    if (leaf.y - leaf.size < minY) minY = leaf.y - leaf.size
    if (leaf.y + leaf.size > maxY) maxY = leaf.y + leaf.size
  }
  if (0 < minX) minX = 0
  if (0 > maxX) maxX = 0
  if (0 < minY) minY = 0
  if (0 > maxY) maxY = 0
  if (!isFinite(minX)) return
  const pad = 12
  const w = Math.ceil(maxX - minX + pad * 2)
  const h = Math.ceil(maxY - minY + pad * 2)
  const trunkColorStr = `rgba(${tree.trunkColor.r}, ${tree.trunkColor.g}, ${tree.trunkColor.b}, ${tree.opacity})`
  const dataUrl = toCanvas({ width: w, height: h, pixelRatio: 1 }, (ctx) => {
    ctx.translate(-minX + pad, -minY + pad)
    ctx.lineCap = 'round'
    for (const seg of cluster.branchSegments) {
      ctx.strokeStyle = trunkColorStr
      ctx.lineWidth = seg.width
      ctx.beginPath()
      ctx.moveTo(seg.startX, seg.startY)
      ctx.lineTo(seg.endX, seg.endY)
      ctx.stroke()
    }
    for (const leaf of cluster.leaves) {
      drawRealisticLeafToCanvas(ctx, leaf.x, leaf.y, leaf.size, leaf.rotation, leaf.r, leaf.g, leaf.b, leaf.opacity * tree.opacity)
    }
  })
  loadTouchSprite(k, spriteName, dataUrl)
  cluster.spriteName = spriteName
  const pivotPxX = -minX + pad
  const pivotPxY = -minY + pad
  cluster.anchorX = (pivotPxX / w) * 2 - 1
  cluster.anchorY = (pivotPxY / h) * 2 - 1
  cluster.worldPivotX = tree.x + cluster.pivotX
  cluster.worldPivotY = cluster.pivotY
}

//
// World-space bounds for baking a full-tree overlay (matches drawOrganicTreeToCanvas coordinates).
//
function extendOrganicTreeCanvasBounds(tree, bb, sway) {
  if (!tree.branchClusters) return
  const mergePt = (x, y) => {
    if (x < bb.minX) bb.minX = x
    if (x > bb.maxX) bb.maxX = x
    if (y < bb.minY) bb.minY = y
    if (y > bb.maxY) bb.maxY = y
  }
  const sx = sway
  for (const seg of tree.rootSegments) {
    mergePt(tree.x + seg.startX, seg.startY)
    mergePt(tree.x + seg.endX, seg.endY)
  }
  for (const seg of tree.trunkSegments) {
    mergePt(tree.x + seg.startX, seg.startY)
    mergePt(tree.x + seg.endX, seg.endY)
  }
  for (const cluster of tree.branchClusters) {
    const bx = tree.x + cluster.pivotX
    const py = cluster.pivotY
    for (const seg of cluster.branchSegments) {
      mergePt(bx + seg.startX + sx * 0.4, py + seg.startY)
      mergePt(bx + seg.endX + sx, py + seg.endY)
    }
    for (const leaf of cluster.leaves) {
      const lx = bx + leaf.x + sx
      const ly = py + leaf.y
      const r = leaf.size + 10
      mergePt(lx - r, ly - r)
      mergePt(lx + r, ly + r)
    }
  }
}

//
// Non-mutating dimmed copy for one-shot canvas bake (live tree keeps palette for hinged sprites).
//
function dimOrganicTreeSnapshot(tree, rgbFactor, opacityScale) {
  const clampChan = (v) => Math.max(0, Math.min(255, Math.floor(v * rgbFactor)))
  const cloneColor = (c) => ({
    r: clampChan(c.r),
    g: clampChan(c.g),
    b: clampChan(c.b)
  })
  const clusters = tree.branchClusters.map((cluster) => ({
    pivotX: cluster.pivotX,
    pivotY: cluster.pivotY,
    branchSegments: cluster.branchSegments,
    leaves: cluster.leaves.map((leaf) => ({
      ...leaf,
      r: clampChan(leaf.r),
      g: clampChan(leaf.g),
      b: clampChan(leaf.b)
    }))
  }))
  const rcBase = tree.rootColor || { r: 60, g: 40, b: 25 }
  const lcBase = tree.leafColor || { r: 120, g: 90, b: 40 }
  return {
    x: tree.x,
    y: tree.y,
    trunkTop: tree.trunkTop,
    trunkBottom: tree.trunkBottom,
    trunkHeight: tree.trunkHeight,
    trunkWidth: tree.trunkWidth,
    crownCenterY: tree.crownCenterY,
    trunkSegments: tree.trunkSegments,
    rootSegments: tree.rootSegments,
    branchClusters: clusters,
    crowns: tree.crowns,
    trunkColor: cloneColor(tree.trunkColor),
    rootColor: cloneColor(rcBase),
    leafColor: cloneColor(lcBase),
    opacity: Math.min(1, tree.opacity * opacityScale)
  }
}
