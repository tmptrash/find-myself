import { CFG } from '../cfg.js'
//
// Procedural organic tree (wiggly trunk, optional roots, branch clusters
// with autumn leaves) drawn onto a 2D canvas — used by the menu backdrop.
//
//
// Flat-canopy mode: leaf-to-blob radius scale. Overlapping full-alpha circles
// merge into clean rounded canopy clumps (storybook style, no leaf details).
//
const FLAT_CANOPY_BLOB_SCALE = 0.85

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
 * @param {number} [opts.rootAngleBase] - Base angle for primary roots (radians). Default `Math.PI / 2` (straight down). Use `0`/`PI` for horizontal spread, `PI/4` / `3*PI/4` for diagonal.
 * @param {number} [opts.rootAngleSpread] - Random spread added to `rootAngleBase` per root. Default 0.95 rad.
 * @returns {{ trunkSegments: Array, rootSegments: Array, branchClusters: Array }}
 */
export function buildOrganicTreeData(trunkBottomY, trunkTopY, opts = {}) {
  const rootAbsoluteMaxY = opts.rootAbsoluteMaxY ?? (CFG.visual.screen.height - 6)
  const rootCountMin = opts.rootCountMin ?? 3
  const rootCountMax = opts.rootCountMax ?? 4
  const rootSegmentsMin = opts.rootSegmentsMin ?? 22
  const rootSegmentsRange = opts.rootSegmentsRange ?? 14
  const includeRoots = opts.includeRoots !== false
  const rootAngleBase = opts.rootAngleBase ?? Math.PI / 2
  const rootAngleSpread = opts.rootAngleSpread ?? 0.95
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
      const rootAngle = rootAngleBase + (Math.random() - 0.5) * rootAngleSpread
      const rootSegmentsCount = rootSegmentsMin + Math.floor(Math.random() * rootSegmentsRange)
      const rootThickness = 3 + Math.random() * 1.5
      rootSegments.push(...growTreeRoots(0, trunkBottomY, rootAngle, rootSegmentsCount, rootThickness, 0, rootAbsoluteMaxY))
    }
  }
  return { trunkSegments, rootSegments, branchClusters }
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
//
// Single realistic leaf (two quadratic halves and a midrib).
//
function drawRealisticLeafToCanvas(ctx, x, y, size, angle, r, g, b, opacity) {
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
    swayAmount: 0.6 + Math.random() * 1
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
  //
  // Flat-canopy trees draw foliage as plain solid circles — overlapping
  // full-alpha blobs merge into rounded storybook clumps without leaf details.
  //
  if (tree.flatCanopy) {
    for (const leaf of cluster.leaves) {
      ctx.fillStyle = `rgba(${leaf.r}, ${leaf.g}, ${leaf.b}, ${tree.opacity})`
      ctx.beginPath()
      ctx.arc(
        tree.x + cluster.pivotX + leaf.x + sway,
        cluster.pivotY + leaf.y,
        leaf.size * FLAT_CANOPY_BLOB_SCALE,
        0, Math.PI * 2
      )
      ctx.fill()
    }
    return
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
