import { GLOW_PAL, glowRgb } from './glow-palette.js'

//
// Small raft over the left lake (where the W log used to sit) — bobs with
// the same wave phase as the baked water surface.
//
const LAKE_RAFT_X_FRAC = 0.34
const LAKE_RAFT_W = 92
const LAKE_RAFT_H = 11
const LAKE_RAFT_SINK_INTO_WAVE = 5
const LAKE_RAFT_PLANK_COUNT = 5
const LAKE_RAFT_Z = 12.35
const GLASSES_LENS_RX = 9
const GLASSES_LENS_RY = 7
const GLASSES_BRIDGE_W = 5
const GLASSES_TEMPLE_LEN = 11
const GLASSES_LIFT_ON_RAFT = 3

/**
 * World X for the lake raft (left lake, above the old W spot).
 * @param {number} lakeX1
 * @param {number} lakeX2
 * @returns {number}
 */
export function glowLakeRaftWorldX(lakeX1, lakeX2) {
  return lakeX1 + (lakeX2 - lakeX1) * LAKE_RAFT_X_FRAC
}

/**
 * Registers the bobbing raft + glasses draw layer.
 * @param {Object} k - Kaplay inst
 * @param {function(): Object|null} getLevelInst - Live glow level inst
 */
export function mountGlowLakeRaftLayer(k, getLevelInst) {
  k.add([
    k.z(LAKE_RAFT_Z),
    {
      draw() {
        const inst = getLevelInst()
        drawGlowLakeRaft(k, inst)
      }
    }
  ])
}

/**
 * @param {Object} k - Kaplay inst
 * @param {Object|null} inst - Glow level inst
 */
export function drawGlowLakeRaft(k, inst) {
  if (!inst?.zones?.water) return
  const x1 = inst.lakeX1
  const x2 = inst.lakeX2
  if (x1 == null || x2 == null) return
  const surfaceAt = inst.lakeSurfaceAt
  if (typeof surfaceAt !== 'function') return
  const raftX = inst.lakeRaftX ?? glowLakeRaftWorldX(x1, x2)
  const surfaceY = surfaceAt(raftX)
  const raftTop = surfaceY - LAKE_RAFT_SINK_INTO_WAVE - LAKE_RAFT_H
  drawLakeRaftPlanks(k, raftX, raftTop, LAKE_RAFT_W, LAKE_RAFT_H)
  drawLakeRaftGlasses(k, raftX, raftTop - GLASSES_LIFT_ON_RAFT)
}

function drawLakeRaftPlanks(k, cx, topY, w, h) {
  const dark = toKaplayRgb(k, GLOW_PAL.treeColor.trunk)
  const mid = toKaplayRgb(k, GLOW_PAL.treeColor.branch)
  const light = toKaplayRgb(k, GLOW_PAL.treeColor.leafShades[2])
  const outline = toKaplayRgb(k, GLOW_PAL.glowContour.forest)
  const left = cx - w * 0.5
  const plankW = w / LAKE_RAFT_PLANK_COUNT
  for (let i = 0; i < LAKE_RAFT_PLANK_COUNT; i++) {
    const px = left + i * plankW + 1
    const pw = plankW - 2
    const jitter = (i % 2) * 0.6
    k.drawRect({
      pos: k.vec2(px, topY + jitter),
      width: pw,
      height: h - jitter,
      color: i % 2 ? mid : dark,
      outline: { width: 1, color: outline },
      opacity: 0.96
    })
    k.drawRect({
      pos: k.vec2(px + 1, topY + jitter + 1),
      width: Math.max(2, pw * 0.35),
      height: 2,
      color: light,
      opacity: 0.35
    })
  }
}

function drawLakeRaftGlasses(k, cx, bridgeY) {
  const frame = toKaplayRgb(k, GLOW_PAL.glowContour.forest)
  const lensCol = toKaplayRgb(k, GLOW_PAL.eyeCreature.sclera)
  const glintCol = toKaplayRgb(k, GLOW_PAL.gold)
  const dx = GLASSES_LENS_RX + GLASSES_BRIDGE_W * 0.5
  const leftCx = cx - dx
  const rightCx = cx + dx
  const lensY = bridgeY
  k.drawEllipse({
    pos: k.vec2(leftCx, lensY),
    radiusX: GLASSES_LENS_RX,
    radiusY: GLASSES_LENS_RY,
    color: lensCol,
    opacity: 0.88,
    outline: { width: 2, color: frame }
  })
  k.drawEllipse({
    pos: k.vec2(rightCx, lensY),
    radiusX: GLASSES_LENS_RX,
    radiusY: GLASSES_LENS_RY,
    color: lensCol,
    opacity: 0.88,
    outline: { width: 2, color: frame }
  })
  k.drawRect({
    pos: k.vec2(cx - GLASSES_BRIDGE_W * 0.5, lensY - 1.5),
    width: GLASSES_BRIDGE_W,
    height: 3,
    color: frame
  })
  k.drawLine({
    p1: k.vec2(leftCx - GLASSES_LENS_RX, lensY),
    p2: k.vec2(leftCx - GLASSES_LENS_RX - GLASSES_TEMPLE_LEN, lensY - 2),
    width: 2,
    color: frame
  })
  k.drawLine({
    p1: k.vec2(rightCx + GLASSES_LENS_RX, lensY),
    p2: k.vec2(rightCx + GLASSES_LENS_RX + GLASSES_TEMPLE_LEN, lensY - 2),
    width: 2,
    color: frame
  })
  k.drawCircle({
    pos: k.vec2(leftCx - 3, lensY - 2),
    radius: 2,
    color: glintCol,
    opacity: 0.55
  })
  k.drawCircle({
    pos: k.vec2(rightCx + 2, lensY - 2),
    radius: 1.6,
    color: glintCol,
    opacity: 0.45
  })
}

function toKaplayRgb(k, hex) {
  const c = glowRgb(hex)
  return k.rgb(c.r, c.g, c.b)
}
