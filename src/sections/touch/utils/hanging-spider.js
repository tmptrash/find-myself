import { CFG } from '../cfg.js'

const TOP_MARGIN = CFG.visual.gameArea.topMargin

//
// Hanging spider from silk thread (shared touch decoration).
//
const SPIDER_THREAD_X_RATIO = 0.78
const SPIDER_THREAD_TOP_Y = TOP_MARGIN + 80
const SPIDER_THREAD_LENGTH = 220
//
// Shortest silk length allowed after floor clamping so the spider does not park into terrain or bark.
//
const SPIDER_THREAD_LENGTH_MIN = 42
//
// Lowest pixel (feet / abdomen / hanging sway buffer) must stay above scene floor by at least this clear gap.
//
const SPIDER_CLEARANCE_ABOVE_FLOOR = 54
//
// Approx vertical span from body center down through legs + head bulge for clearance checks only.
//
const SPIDER_BODY_HEAD_LEG_REACH_BELOW_CENTER = 28
const SPIDER_BODY_RADIUS = 9
const SPIDER_HEAD_RADIUS = 6
const SPIDER_LEG_LENGTH = 12
const SPIDER_LEG_COUNT = 4
const SPIDER_EYE_RADIUS = 2.05
const SPIDER_EYE_OFFSET_X = 3.1
const SPIDER_EYE_OFFSET_Y = -1.2
const SPIDER_PUPIL_RADIUS = 1.05
const SPIDER_PUPIL_MAX_OFFSET = 0.95
const SPIDER_SWAY_SPEED = 0.9
const SPIDER_SWAY_AMOUNT = 7
const SPIDER_COLOR_R = 130
const SPIDER_COLOR_G = 132
const SPIDER_COLOR_B = 138
const SPIDER_OUTLINE_COLOR_R = 10
const SPIDER_OUTLINE_COLOR_G = 10
const SPIDER_OUTLINE_COLOR_B = 12
const SPIDER_OUTLINE_WIDTH = 1.5
const SPIDER_LEG_OUTLINE_PAD = 0.9
const SPIDER_THREAD_COLOR_R = 200
const SPIDER_THREAD_COLOR_G = 200
const SPIDER_THREAD_COLOR_B = 210
const SPIDER_THREAD_OPACITY = 0.4

/**
 * Tooltip hover zone centered on the spider body (follows thread sway).
 *
 * @param {Object} inst - Instance from {@link createHangingSpider}
 * @param {string} text - English tooltip phrase
 * @returns {Object} Target descriptor for {@link Tooltip.create}
 */
export function spiderHoverTooltipTarget(inst, text) {
  const HOVER_W = 48
  const HOVER_H = 54
  const OFFSET_Y = -46
  return {
    x: () => spiderBodyCenter(inst, inst.k).x,
    y: () => spiderBodyCenter(inst, inst.k).y,
    width: HOVER_W,
    height: HOVER_H,
    text,
    offsetY: OFFSET_Y
  }
}

/**
 * Spider on silk anchored near foliage (eyes track hero).
 *
 * @param {Object} cfg.k - Kaplay inst
 * @param {Object} cfg.heroInst - Hero instance (for eye tracking)
 * @param {Array<Object>} [cfg.frontTrees] - Parallax trees with branchClusters (touch L0)
 * @param {Object} [cfg.treeRootsInst] - Touch L1 musical tree roots inst (preferred when noteTreeIndices set)
 * @param {number[]} [cfg.noteTreeIndices] - Root indices that play puzzle notes (spider hangs only on these)
 * @param {number} [cfg.floorY] - World floor line Y; thread length is clamped so the spider never reaches it
 * @param {number} [cfg.drawZ=28] - Draw order
 * @returns {Object} Spider instance ({ threadAnchorX, threadAnchorY, threadLength, k, heroInst })
 */
export function createHangingSpider(cfg) {
  const { k, heroInst, frontTrees, treeRootsInst, noteTreeIndices, drawZ = 28, floorY } = cfg
  const playableW = CFG.visual.screen.width - CFG.visual.gameArea.leftMargin - CFG.visual.gameArea.rightMargin
  const leftMargin = CFG.visual.gameArea.leftMargin
  let anchorX = leftMargin + playableW * SPIDER_THREAD_X_RATIO
  let anchorY = SPIDER_THREAD_TOP_Y
  let threadLength = SPIDER_THREAD_LENGTH
  const targetX = leftMargin + playableW * SPIDER_THREAD_X_RATIO
  const roots = treeRootsInst?.roots
  const melodyRoots =
    roots &&
    noteTreeIndices?.length &&
    noteTreeIndices.map(i => roots[i]).filter(Boolean)
  if (melodyRoots && melodyRoots.length > 0) {
    let best = melodyRoots[0]
    let bestDist = Infinity
    for (const root of melodyRoots) {
      const d = Math.abs(root.x - targetX)
      if (d < bestDist) {
        bestDist = d
        best = root
      }
    }
    anchorX = best.trunkTop.x
    anchorY = best.trunkTop.y + 8
    threadLength = 85 + Math.random() * 65
  } else if (frontTrees && frontTrees.length > 0) {
    const candidates = frontTrees.filter(t => t.branchClusters)
    if (candidates.length > 0) {
      let best = candidates[0]
      let bestDist = Infinity
      for (const tree of candidates) {
        const d = Math.abs(tree.x - targetX)
        if (d < bestDist) {
          bestDist = d
          best = tree
        }
      }
      let topWorldX = 0
      let topWorldY = best.trunkTop
      for (const cluster of best.branchClusters) {
        for (const seg of cluster.branchSegments) {
          const wY = cluster.pivotY + seg.endY
          if (wY < topWorldY) {
            topWorldY = wY
            topWorldX = best.x + cluster.pivotX + seg.endX
          }
        }
      }
      anchorX = topWorldX
      anchorY = topWorldY + 4
      threadLength = 90 + Math.random() * 70
    }
  }
  threadLength = clampSpiderThreadToFloor(anchorY, threadLength, floorY)
  const inst = {
    threadAnchorX: anchorX,
    threadAnchorY: anchorY,
    threadLength,
    swayPhase: Math.random() * Math.PI * 2,
    heroInst,
    k
  }
  k.add([
    k.z(drawZ),
    {
      draw() {
        drawHangingSpider(k, inst)
      }
    }
  ])
  return inst
}

function spiderBodyCenter(inst, k) {
  const t = k.time()
  const sway = Math.sin(t * SPIDER_SWAY_SPEED + inst.swayPhase) * SPIDER_SWAY_AMOUNT
  const bodyX = inst.threadAnchorX + sway
  const bodyY = inst.threadAnchorY + inst.threadLength
  return { x: bodyX, y: bodyY + SPIDER_BODY_RADIUS * 0.25 }
}

function drawHangingSpider(k, inst) {
  const t = k.time()
  const sway = Math.sin(t * SPIDER_SWAY_SPEED + inst.swayPhase) * SPIDER_SWAY_AMOUNT
  const bodyX = inst.threadAnchorX + sway
  const bodyY = inst.threadAnchorY + inst.threadLength
  k.drawLine({
    p1: k.vec2(inst.threadAnchorX, inst.threadAnchorY),
    p2: k.vec2(bodyX, bodyY - SPIDER_BODY_RADIUS),
    width: 1,
    color: k.rgb(SPIDER_THREAD_COLOR_R, SPIDER_THREAD_COLOR_G, SPIDER_THREAD_COLOR_B),
    opacity: SPIDER_THREAD_OPACITY
  })
  const spiderColor = k.rgb(SPIDER_COLOR_R, SPIDER_COLOR_G, SPIDER_COLOR_B)
  const outlineColor = k.rgb(SPIDER_OUTLINE_COLOR_R, SPIDER_OUTLINE_COLOR_G, SPIDER_OUTLINE_COLOR_B)
  const legWidth = 1.4
  const legOutlineWidth = legWidth + SPIDER_LEG_OUTLINE_PAD
  for (let s = -1; s <= 1; s += 2) {
    for (let i = 0; i < SPIDER_LEG_COUNT; i++) {
      const tParam = i / (SPIDER_LEG_COUNT - 1)
      const angleDeg = -50 + tParam * 80
      const angleRad = angleDeg * Math.PI / 180
      const legSpread = SPIDER_LEG_LENGTH
      const midX = bodyX + s * Math.cos(angleRad) * legSpread * 0.6
      const midY = bodyY + Math.sin(angleRad) * legSpread * 0.6 - 2
      const tipX = bodyX + s * Math.cos(angleRad) * legSpread * 1.4
      const tipY = bodyY + Math.sin(angleRad) * legSpread * 1.4 + 4
      k.drawLine({ p1: k.vec2(bodyX, bodyY), p2: k.vec2(midX, midY), width: legOutlineWidth, color: outlineColor })
      k.drawLine({ p1: k.vec2(midX, midY), p2: k.vec2(tipX, tipY), width: legOutlineWidth, color: outlineColor })
      k.drawLine({ p1: k.vec2(bodyX, bodyY), p2: k.vec2(midX, midY), width: legWidth, color: spiderColor })
      k.drawLine({ p1: k.vec2(midX, midY), p2: k.vec2(tipX, tipY), width: legWidth, color: spiderColor })
    }
  }
  k.drawEllipse({
    pos: k.vec2(bodyX, bodyY),
    radiusX: SPIDER_BODY_RADIUS + SPIDER_OUTLINE_WIDTH,
    radiusY: SPIDER_BODY_RADIUS * 1.1 + SPIDER_OUTLINE_WIDTH,
    color: outlineColor
  })
  k.drawEllipse({
    pos: k.vec2(bodyX, bodyY),
    radiusX: SPIDER_BODY_RADIUS,
    radiusY: SPIDER_BODY_RADIUS * 1.1,
    color: spiderColor
  })
  const headY = bodyY + SPIDER_BODY_RADIUS * 0.8
  k.drawCircle({
    pos: k.vec2(bodyX, headY),
    radius: SPIDER_HEAD_RADIUS + SPIDER_OUTLINE_WIDTH,
    color: outlineColor
  })
  k.drawCircle({
    pos: k.vec2(bodyX, headY),
    radius: SPIDER_HEAD_RADIUS,
    color: spiderColor
  })
  let pupilDx = 0
  let pupilDy = 0
  if (inst.heroInst?.character?.pos) {
    const dx = inst.heroInst.character.pos.x - bodyX
    const dy = inst.heroInst.character.pos.y - headY
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    pupilDx = (dx / dist) * SPIDER_PUPIL_MAX_OFFSET
    pupilDy = (dy / dist) * SPIDER_PUPIL_MAX_OFFSET
  }
  for (const s of [-1, 1]) {
    const eyeX = bodyX + s * SPIDER_EYE_OFFSET_X
    const eyeY = headY + SPIDER_EYE_OFFSET_Y
    k.drawCircle({
      pos: k.vec2(eyeX, eyeY),
      radius: SPIDER_EYE_RADIUS,
      color: k.rgb(240, 240, 240)
    })
    k.drawCircle({
      pos: k.vec2(eyeX + pupilDx, eyeY + pupilDy),
      radius: SPIDER_PUPIL_RADIUS,
      color: k.rgb(20, 20, 20)
    })
  }
}
//
// Shortens silk when body center + legs would dip below the playable floor line.
//
function clampSpiderThreadToFloor(anchorY, threadLength, floorY) {
  if (floorY == null) return threadLength
  const maxBodyCenterY = floorY - SPIDER_CLEARANCE_ABOVE_FLOOR - SPIDER_BODY_HEAD_LEG_REACH_BELOW_CENTER
  const bodyCenterY = anchorY + threadLength
  if (bodyCenterY <= maxBodyCenterY) return threadLength
  return Math.max(SPIDER_THREAD_LENGTH_MIN, maxBodyCenterY - anchorY)
}
