import { glowRgb } from './glow-palette.js'
import { getGlowPitFloorCollider } from './glow-atmosphere.js'
//
// Must match EYE_INTRO_EYE_GAP in glow-eye-intro.js (pickup eye spacing).
//
const PIT_CAVE_EYE_GAP = 14
//
// Same front-view bust proportions as drawUndergroundSkeleton in level0.js.
//
const PIT_CAVE_SKULL_SOCKET_X_FRAC = 0.42
const PIT_CAVE_SKULL_SOCKET_Y_FRAC = 0.08
const PIT_CAVE_SKULL_SOCKET_R_FRAC = 0.3
const PIT_CAVE_SKULL_R = PIT_CAVE_EYE_GAP / (PIT_CAVE_SKULL_SOCKET_X_FRAC * 2)

const PIT_CAVE_SKELETON_SPRITE = 'glow-pit-cave-skeleton'
const SKELETON_BAKE_PAD = 22
const CAVE_SKELETON_LAYOUT_VERSION = 34
//
// Skull sits against the widened interior's left wall (not the mouth lip).
//
const PIT_CAVE_SKULL_FLOOR_PAD = 20
const CAVE_RIB_FRACTURE_ECG_BEATS = 3
const CAVE_RIB_FRACTURE_PEAK_FRAC = 0.62
//
// Rib surface cracks: ribIndex, side, t along horizontal shaft, length factor.
//
const CAVE_RIB_SURFACE_CRACKS = [
  { ribIndex: 0, side: 1, t: 0.42, len: 0.55 },
  { ribIndex: 2, side: -1, t: 0.38, len: 0.48 },
  { ribIndex: 3, side: 1, t: 0.52, len: 0.5 },
  { ribIndex: 5, side: -1, t: 0.45, len: 0.42 }
]
const CAVE_THORAX_HORIZONTAL_SCALE = 2.45
const CAVE_THORAX_VERTICAL_SCALE = 1.72
const CAVE_THORAX_RIB_COUNT = 6
const CAVE_THORAX_RIB_BAR_THICK = 2.05
const CAVE_THORAX_RIB_ROW_GAP = 2.75
const CAVE_THORAX_RIB_HALF_LEN_CELLS = [7.2, 8.8, 10.2, 10.2, 8.6, 7.0]
const CAVE_THORAX_RIB_SPINE_GAP_FRAC = 2.05
const CAVE_THORAX_SHEAR_STUB_LEN_FRAC = 0.22
const CAVE_THORAX_SHEAR_SEED_SALT = 7919
//
// Ribs that no longer touch the spine (air gap at the root), per side.
//
const CAVE_THORAX_RIB_DETACHED = [
  { ribIndex: 1, side: -1 },
  { ribIndex: 3, side: 1 },
  { ribIndex: 4, side: -1 },
  { ribIndex: 5, side: 1 }
]
const CAVE_SKELETON_RIB_PAIRS = 11
//
// Front-view skull sampled from the user reference (white bg stripped).
//
const CAVE_REF_SKULL_GRID = [
  '........BBBBBBBB........',
  '......BMBBBBBBBBMB......',
  '....HMBBBBBBBHHHBBMH....',
  '...HBBBBBBBBBHHHHBBBH...',
  '...BBBBBBBBBBHHHHHBBB...',
  '..HBBBBBBBBBBBBHHHBBBH..',
  '..BBBBBBBBBBBBBHHBBBBB..',
  '.HMBMBBBBBBBBBBBBBBMBMH.',
  '.BBBMMBBBBBBBBBBBBMMBBB.',
  '.MBBMMBBBBBBBBBBBBMMBBM.',
  '.MBBMBBBBBBBBBBBBBBMBBM.',
  '.MBMBBBBBBBBBBBBBBBBMBM.',
  '.MMBBBBBBBBBBBBBBBBBBMM.',
  '.MBBBBBBBBBBBBBBBBBBBBMB.',
  '.BBBBBBBBBBBBBBBBBBBBBBB.',
  '..BBBBBBBBBBBBBBBBBBBBBB..',
  '..BBBBBBBBBBBBBBBBBBBBBB..',
  '..BBBBBBBBBBBBBBBBBBBBBB..',
  '.HMBBBBBBBBBBBBBBBBBBBH.',
  '.HMBBBBBBBBBBBBBBBBBBBH.',
  '.HMBBMMBBBBBBBBBBBMBBBH.',
  '..HBB.BBBBBBBBBBBB.BBH..',
  '......BBBBBBBHBBBB......',
  '......BBBBBBBHBBBB......',
  '......HBBMBMMBMBBH......',
  '.......HBBBBBBBBH.......'
]
const PIT_WALL_W = 20
const PIT_FLOOR_EXTRA_W_LEFT = 18
const PIT_FLOOR_EXTRA_W_RIGHT = 6
/**
 * Same world centre as spawnGlowCavePickupEyes / getGlowPitBonusPosition.
 * @param {Object} pit - Pit state
 * @returns {{ x: number, y: number }|null}
 */
function pitCaveEyePickupCenter(pit) {
  if (!pit?.zone) return null
  const { zone, floorY } = pit
  const bottomY = floorY + zone.depth
  const { innerX } = getGlowPitFloorCollider(zone)
  return {
    x: innerX + PIT_CAVE_SKULL_FLOOR_PAD + PIT_CAVE_SKULL_R,
    y: bottomY - 18
  }
}
/**
 * World positions for the lying pickup eyes (skull socket line).
 * @param {Object} pit - Pit state
 * @returns {{ cx: number, cy: number, leftX: number, rightX: number, y: number }}
 */
export function getPitCaveSkullEyeLine(pit) {
  const sk = ensurePitCaveSkeletonLayout(pit)
  const r = sk.skullR
  const eyeY = sk.y - r * PIT_CAVE_SKULL_SOCKET_Y_FRAC
  return {
    cx: sk.x,
    cy: eyeY,
    leftX: sk.x - r * PIT_CAVE_SKULL_SOCKET_X_FRAC,
    rightX: sk.x + r * PIT_CAVE_SKULL_SOCKET_X_FRAC,
    y: eyeY
  }
}
/**
 * Ensures pit.caveSkeleton holds a stable back-wall pose for the pit cave.
 * @param {Object} pit - Pit state
 * @returns {Object} Skeleton layout
 */
export function ensurePitCaveSkeletonLayout(pit) {
  if (pit.caveSkeleton?.version === CAVE_SKELETON_LAYOUT_VERSION) {
    return pit.caveSkeleton
  }
  pit._caveSkeletonSpriteReady = false
  const bonus = pitCaveEyePickupCenter(pit)
  const r = PIT_CAVE_SKULL_R
  const eyeLineY = bonus?.y ?? pit.floorY + pit.zone.depth - 28
  const cx = bonus?.x ?? pit.zone.x1 + pit.zone.width * 0.52
  const seed = Math.floor(cx * 17.31 + eyeLineY * 9.07 + r * 41)
  pit.caveSkeleton = {
    version: CAVE_SKELETON_LAYOUT_VERSION,
    x: cx,
    y: eyeLineY + r * PIT_CAVE_SKULL_SOCKET_Y_FRAC,
    angle: 0,
    skullR: r,
    ribLayout: buildCaveSkeletonRibLayout(seed)
  }
  return pit.caveSkeleton
}
//
// Stable pseudo-random rib set per pit (missing pairs, breaks, spine gaps).
//
function buildCaveSkeletonRibLayout(seed) {
  let s = seed >>> 0
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
  const ribs = []
  for (let i = 0; i < CAVE_SKELETON_RIB_PAIRS; i++) {
    const t = i / (CAVE_SKELETON_RIB_PAIRS - 1)
    const present = rand() > (0.06 + t * 0.14)
    if (!present) {
      ribs.push({ present: false })
      continue
    }
    const broken = rand() > 0.28
    const spineGap = broken && rand() > 0.35
    const side = rand() > 0.5 ? 1 : -1
    ribs.push({
      present: true,
      t,
      broken,
      spineGap,
      side,
      span: 0.92 + rand() * 0.28 - t * 0.62,
      droop: 0.05 + rand() * 0.14 + t * 0.06,
      twist: (rand() - 0.5) * 0.35,
      shiftX: broken ? (rand() - 0.5) * 0.55 : 0,
      shiftY: broken ? (rand() - 0.5) * 0.38 : 0
    })
  }
  const loose = []
  const looseCount = 2 + Math.floor(rand() * 4)
  for (let j = 0; j < looseCount; j++) {
    loose.push({
      x: (rand() - 0.5) * 1.1,
      y: 1.55 + rand() * 1.35,
      len: 0.18 + rand() * 0.42,
      angle: (rand() - 0.5) * 1.4
    })
  }
  const spineBreaks = []
  if (rand() > 0.55) {
    spineBreaks.push({ t: 0.35 + rand() * 0.45, gap: 0.06 + rand() * 0.1 })
  }
  const sheared = pickThoraxShearedRibRows(seed)
  return { ribs, loose, spineBreaks, sheared }
}
//
// One connected rib row per side removed entirely — only a short spine stub remains.
//
function pickThoraxShearedRibRows(seed) {
  let s = (seed + CAVE_THORAX_SHEAR_SEED_SALT) >>> 0
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
  const leftPool = []
  const rightPool = []
  for (let i = 0; i < CAVE_THORAX_RIB_COUNT; i++) {
    !isCaveThoraxRibDetached(i, -1) && leftPool.push(i)
    !isCaveThoraxRibDetached(i, 1) && rightPool.push(i)
  }
  const pick = (pool) => pool[Math.floor(rand() * pool.length)]
  return {
    left: leftPool.length ? pick(leftPool) : null,
    right: rightPool.length ? pick(rightPool) : null
  }
}
/**
 * Bone tones for the cave skeleton (flat gray or shaded earth band).
 * @param {boolean} flatDecor - Single-tone decor mode
 * @returns {{ fill: Object, deep: Object, light: Object }}
 */
export function caveSkeletonTones(flatDecor) {
  if (flatDecor) {
    const g = glowRgb('decorGray')
    return { fill: g, deep: g, light: g }
  }
  return {
    fill: glowRgb('playfieldOuter'),
    deep: glowRgb('void'),
    light: glowRgb('midGray')
  }
}
/**
 * Pit-floor skeleton — readable on flat gray cave decor (not one-tone mud).
 * @returns {{ fill: Object, deep: Object, light: Object }}
 */
export function caveSkeletonPitFloorTones() {
  return {
    fill: glowRgb('midGray'),
    deep: glowRgb('void'),
    light: glowRgb('decorGray')
  }
}
/**
 * Eyeless intro pit — lighter bones on the flat void floor.
 * @returns {{ fill: Object, deep: Object, light: Object }}
 */
export function caveSkeletonEyeIntroTones() {
  return {
    fill: glowRgb('lightGray'),
    deep: glowRgb('void'),
    light: glowRgb('decorGray')
  }
}
/**
 * Draws the cave skeleton embedded in the back wall (does not touch baked rocks).
 * @param {Object} k - Kaplay instance
 * @param {Object} pit - Pit state
 * @param {Object} tones - { fill, deep, light } rgb objects
 * @param {Object} opts - { opacity, embedded }
 */
export function drawPitCaveSkeleton(k, pit, tones, opts = {}) {
  if (!pit) return
  const sk = ensurePitCaveSkeletonLayout(pit)
  const opacity = opts.opacity ?? 0.85
  const embedded = Boolean(opts.embedded)
  const bakeVariant = opts.bakeVariant ?? 'pit'
  ensurePitCaveSkeletonSprite(k, pit, tones, embedded, bakeVariant)
  if (!pit._caveSkeletonSpriteReady) return
  const uniform = embedded ? 0.55 : 1
  const anchorOffY = (pit._caveSkeletonSkullOffsetY ?? 0) * uniform
  k.drawSprite({
    sprite: PIT_CAVE_SKELETON_SPRITE,
    pos: k.vec2(sk.x, sk.y + anchorOffY),
    anchor: 'center',
    width: pit._caveSkeletonBakeW * uniform,
    height: pit._caveSkeletonBakeH * uniform,
    opacity
  })
}
//
// Bakes the skeleton once per Kaplay instance (re-bake if embed mode changes).
//
function ensurePitCaveSkeletonSprite(k, pit, tones, embedded, bakeVariant = 'pit') {
  const bakeKey = `${embedded ? 'embed' : 'free'}-${bakeVariant}`
  if (pit._caveSkeletonSpriteReady && pit._caveSkeletonBakeKey === bakeKey &&
    pit._caveSkeletonSkullOffsetY != null) return
  const sk = ensurePitCaveSkeletonLayout(pit)
  const r = sk.skullR
  const w = Math.ceil(r * 5.2 + SKELETON_BAKE_PAD * 2)
  const h = Math.ceil(r * 7.4 + SKELETON_BAKE_PAD * 2)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const skullCy = SKELETON_BAKE_PAD + r * 0.55
  ctx.translate(w / 2, skullCy)
  drawCaveSkeletonToCtx(ctx, sk, tones, sk.ribLayout || buildCaveSkeletonRibLayout(0))
  k.loadSprite(PIT_CAVE_SKELETON_SPRITE, canvas)
  canvas.width = 0
  canvas.height = 0
  pit._caveSkeletonBakeW = w
  pit._caveSkeletonBakeH = h
  //
  // sk.x/sk.y is the skull pivot — sprite anchor is the bake centre, not the cranium.
  //
  pit._caveSkeletonSkullOffsetY = h / 2 - skullCy
  pit._caveSkeletonSpriteReady = true
  pit._caveSkeletonBakeKey = bakeKey
}
//
// Solid bone fill — only D reads as void; B/M/H share one bone tone (no dither dots).
//
function caveSkeletonSolidPalette(boneCss, deepCss) {
  return { D: deepCss, M: boneCss, B: boneCss, H: boneCss }
}
//
// Fills '.' pockets trapped inside bone (jaw/cheek); border air and D voids stay open.
//
function solidifyEnclosedDots(grid) {
  const h = grid.length
  const w = grid[0].length
  const isAir = (ch) => ch === '.'
  const reachable = Array.from({ length: h }, () => Array(w).fill(false))
  const queue = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isAir(grid[y][x])) continue
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        reachable[y][x] = true
        queue.push([x, y])
      }
    }
  }
  while (queue.length) {
    const [x, y] = queue.shift()
    const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      if (reachable[ny][nx] || !isAir(grid[ny][nx])) continue
      reachable[ny][nx] = true
      queue.push([nx, ny])
    }
  }
  return grid.map((row, y) =>
    row.split('').map((ch, x) =>
      isAir(ch) && !reachable[y][x] ? 'B' : ch
    ).join('')
  )
}
//
// Paints a sampled pixel grid (D/M/B/H) centered on centerX from topY.
// Cell bounds are contiguous so scaled bone reads solid, not perforated.
//
function drawReferencePixelGrid(ctx, grid, u, palette, centerX, topY, scaleX = 1, scaleY = 1) {
  const h = grid.length
  const w = grid[0].length
  const left = centerX - (w * u * scaleX) / 2
  for (let y = 0; y < h; y++) {
    const row = grid[y]
    const y0 = topY + y * u * scaleY
    const y1 = topY + (y + 1) * u * scaleY
    const py = Math.floor(y0)
    const ph = Math.max(1, Math.ceil(y1) - py)
    for (let x = 0; x < w; x++) {
      const ch = row[x]
      if (ch === '.') continue
      const fill = palette[ch]
      if (!fill) continue
      const x0 = left + x * u * scaleX
      const x1 = left + (x + 1) * u * scaleX
      const px = Math.floor(x0)
      const pw = Math.max(1, Math.ceil(x1) - px)
      ctx.fillStyle = fill
      ctx.fillRect(px, py, pw, ph)
    }
  }
}
//
// Reference skull — bitmap traced from the user art (scaled to skullR).
//
function drawCaveSkullFromReference(ctx, r, boneCss, deepCss) {
  const grid = solidifyEnclosedDots(CAVE_REF_SKULL_GRID)
  const palette = caveSkeletonSolidPalette(boneCss, deepCss)
  const gw = grid[0].length
  const gh = grid.length
  const u = (r * 2.14) / gw
  const topY = -gh * u * 0.44
  drawReferencePixelGrid(ctx, grid, u, palette, 0, topY)
}
//
// Draws one thorax rib side — full arc, detached gap, or spine-only shear stub.
//
function drawCaveThoraxRibSide(ctx, boneCss, deepCss, side, barY, halfLen, spineHalf, thick, drop, hook, ribIndex, ribLayout) {
  if (isCaveThoraxRibSheared(ribIndex, side, ribLayout)) {
    drawCaveRibSpineShearStub(ctx, boneCss, deepCss, side, barY, spineHalf, thick, halfLen)
    return
  }
  const detached = isCaveThoraxRibDetached(ribIndex, side)
  drawCaveRibSideRounded(ctx, boneCss, deepCss, side, barY, halfLen, spineHalf, thick, drop, hook, detached, ribIndex)
}
//
// One rib side: uniform stroke; mirrored L/R; detached ribs start after a spine gap.
//
function drawCaveRibSideRounded(ctx, boneCss, deepCss, side, barY, halfLen, spineHalf, thick, drop, hook, detached, ribIndex) {
  const midY = barY + thick * 0.5
  const outerX = side < 0 ? -halfLen + thick * 0.5 : halfLen - thick * 0.5
  const spineX = side < 0 ? -spineHalf : spineHalf
  const dropY = barY + drop
  const hookX = side < 0 ? outerX + hook : outerX - hook
  const gap = thick * CAVE_THORAX_RIB_SPINE_GAP_FRAC
  const startX = detached ? spineX + side * gap : spineX
  detached && ctx.save()
  if (detached) {
    const jitter = caveDetachedRibJitter(ribIndex, side, thick)
    ctx.translate(0, jitter.dy)
    ctx.translate(startX, midY)
    ctx.rotate(jitter.angle)
    ctx.translate(-startX, -midY)
  }
  ctx.strokeStyle = boneCss
  ctx.lineWidth = thick
  ctx.lineCap = detached ? 'butt' : 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(startX, midY)
  ctx.lineTo(outerX, midY)
  ctx.lineTo(outerX, dropY)
  ctx.lineTo(hookX, dropY)
  ctx.stroke()
  detached && drawCaveRibFractureEcg(ctx, deepCss, startX, midY, thick, side)
  drawCaveRibSurfaceCracks(ctx, deepCss, ribIndex, side, startX, midY, outerX, dropY, thick)
  detached && ctx.restore()
}
//
// Small vertical offset and tilt so detached ribs read as fallen fragments.
//
function caveDetachedRibJitter(ribIndex, side, thick) {
  const seed = ribIndex * 19 + side * 41
  const dy = ((seed % 5) - 2) * thick * 0.38
  const angle = ((seed % 7) - 3) * 0.052
  return { dy, angle }
}
//
// Detached rib root: V-notches toward the spine only (no vertical seam on the bone).
//
function drawCaveRibFractureEcg(ctx, deepCss, fractureX, midY, thick, side) {
  const towardSpine = -side
  const halfH = thick * 0.52
  const yTop = midY - halfH
  const yBot = midY + halfH
  const peak = thick * CAVE_RIB_FRACTURE_PEAK_FRAC
  const beats = CAVE_RIB_FRACTURE_ECG_BEATS
  const notchH = (yBot - yTop) / beats
  const edgeW = Math.max(1, thick * 0.12)
  ctx.fillStyle = deepCss
  ctx.strokeStyle = deepCss
  ctx.lineWidth = edgeW
  ctx.lineJoin = 'miter'
  ctx.lineCap = 'butt'
  for (let b = 0; b < beats; b++) {
    const yA = yTop + b * notchH + notchH * 0.12
    const yB = yTop + (b + 1) * notchH - notchH * 0.12
    const yPeak = (yA + yB) * 0.5
    const tipX = fractureX + towardSpine * peak
    ctx.beginPath()
    ctx.moveTo(fractureX, yA)
    ctx.lineTo(tipX, yPeak)
    ctx.lineTo(fractureX, yB)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(fractureX, yA)
    ctx.lineTo(tipX, yPeak)
    ctx.lineTo(fractureX, yB)
    ctx.stroke()
  }
}
//
// Small weathering cracks on selected rib shafts and corners.
//
function drawCaveRibSurfaceCracks(ctx, deepCss, ribIndex, side, startX, midY, outerX, dropY, thick) {
  ctx.strokeStyle = deepCss
  ctx.lineWidth = Math.max(1, thick * 0.16)
  ctx.lineCap = 'round'
  CAVE_RIB_SURFACE_CRACKS.forEach((cr) => {
    if (cr.ribIndex !== ribIndex || cr.side !== side) return
    const cx = startX + (outerX - startX) * cr.t
    const crackLen = thick * cr.len
    ctx.beginPath()
    ctx.moveTo(cx, midY - thick * 0.08)
    ctx.lineTo(cx + side * crackLen * 0.15, midY + crackLen * 0.55)
    ctx.stroke()
  })
  if (ribIndex % 2 === 0) {
    ctx.beginPath()
    ctx.moveTo(outerX, midY + thick * 0.05)
    ctx.lineTo(outerX + side * thick * 0.2, dropY - thick * 0.35)
    ctx.stroke()
  }
}
//
// Vertical stress cracks on the sternum/spine blocks between rib rows.
//
function drawCaveSpineWeathering(ctx, deepCss, spineHalf, blockTop, blockH, thick) {
  ctx.strokeStyle = deepCss
  ctx.lineWidth = Math.max(1, thick * 0.14)
  ctx.lineCap = 'round'
  const cx = 0
  ctx.beginPath()
  ctx.moveTo(cx, blockTop + blockH * 0.2)
  ctx.lineTo(cx - spineHalf * 0.12, blockTop + blockH * 0.55)
  ctx.lineTo(cx, blockTop + blockH * 0.82)
  ctx.stroke()
}
//
// True when this rib row is broken off the spine on the given side.
//
function isCaveThoraxRibDetached(ribIndex, side) {
  const entry = CAVE_THORAX_RIB_DETACHED.find((row) => row.side === side)
  return entry != null && entry.ribIndex === ribIndex
}
//
// Rib row sheared off at the spine — full arc omitted, stub only.
//
function isCaveThoraxRibSheared(ribIndex, side, ribLayout) {
  const sheared = ribLayout?.sheared
  if (!sheared) return false
  return side < 0 ? sheared.left === ribIndex : sheared.right === ribIndex
}
//
// Short bone nub at the spine with a jagged fracture facing outward.
//
function drawCaveRibSpineShearStub(ctx, boneCss, deepCss, side, barY, spineHalf, thick, halfLen) {
  const midY = barY + thick * 0.5
  const spineX = side < 0 ? -spineHalf : spineHalf
  const stubLen = Math.max(thick * 2.4, halfLen * CAVE_THORAX_SHEAR_STUB_LEN_FRAC)
  const outerX = spineX + side * stubLen
  const halfH = thick * 0.46
  ctx.fillStyle = boneCss
  ctx.beginPath()
  ctx.moveTo(spineX, midY - halfH)
  ctx.lineTo(outerX, midY - halfH)
  ctx.lineTo(outerX, midY + halfH)
  ctx.lineTo(spineX, midY + halfH)
  ctx.closePath()
  ctx.fill()
  drawCaveRibFractureEcg(ctx, deepCss, outerX, midY, thick, -side)
}
//
// Thoracic block — solid rib pairs with wide vertical gaps (no pixel checkerboard).
//
function drawCaveThoraxSolid(ctx, r, spineTopY, boneCss, deepCss, ribLayout) {
  const u = r / 10.4
  const cellX = u * CAVE_THORAX_HORIZONTAL_SCALE
  const cellY = u * CAVE_THORAX_VERTICAL_SCALE
  const spineHalf = cellX * 1.18
  const ribThick = cellY * CAVE_THORAX_RIB_BAR_THICK
  const ribGap = cellY * CAVE_THORAX_RIB_ROW_GAP
  const drop = cellY * 2.15
  const hook = cellX * 1.75
  const bone = (x, y, w, h) => {
    ctx.fillStyle = boneCss
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h))
  }
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  let y = spineTopY + cellY * 0.4
  const sternumTop = y
  const sternumH = cellY * 1.7
  bone(-spineHalf, y, spineHalf * 2, sternumH)
  drawCaveSpineWeathering(ctx, deepCss, spineHalf, sternumTop, sternumH, ribThick)
  y += cellY * 2.1
  const lens = CAVE_THORAX_RIB_HALF_LEN_CELLS
  for (let i = 0; i < CAVE_THORAX_RIB_COUNT; i++) {
    const halfLen = lens[i] * cellX
    const barY = y
    drawCaveThoraxRibSide(
      ctx,
      boneCss,
      deepCss,
      -1,
      barY,
      halfLen,
      spineHalf,
      ribThick,
      drop,
      hook,
      i,
      ribLayout
    )
    drawCaveThoraxRibSide(
      ctx,
      boneCss,
      deepCss,
      1,
      barY,
      halfLen,
      spineHalf,
      ribThick,
      drop,
      hook,
      i,
      ribLayout
    )
    const gapTop = barY + ribThick
    bone(-spineHalf, gapTop, spineHalf * 2, ribGap)
    i % 2 === 1 && drawCaveSpineWeathering(ctx, deepCss, spineHalf, gapTop, ribGap, ribThick)
    y += ribThick + ribGap
  }
  const tailTop = y
  const tailH = cellY * 2.4
  bone(-spineHalf, tailTop, spineHalf * 2, tailH)
  drawCaveSpineWeathering(ctx, deepCss, spineHalf, tailTop, tailH, ribThick)
}
//
// Front-view buried skeleton — matches drawUndergroundSkeleton in level0.js.
//
function drawCaveSkeletonToCtx(ctx, sk, tones, ribLayout) {
  const boneCss = `rgb(${tones.light.r}, ${tones.light.g}, ${tones.light.b})`
  const deepCss = `rgb(${tones.deep.r}, ${tones.deep.g}, ${tones.deep.b})`
  const r = sk.skullR
  ctx.save()
  ctx.rotate(sk.angle || 0)
  ctx.globalAlpha = 0.85
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  drawCaveSkullFromReference(ctx, r, boneCss, deepCss)
  //
  // Thoracic ribs sampled from the user torso reference.
  //
  const spineTopY = r * 1.42
  drawCaveThoraxSolid(ctx, r, spineTopY, boneCss, deepCss, ribLayout)
  ctx.strokeStyle = boneCss
  ctx.lineWidth = 2
  ribLayout.loose.forEach((chip) => {
    const cx = chip.x * r
    const cy = spineTopY + chip.y * r
    const ex = cx + Math.cos(chip.angle) * chip.len * r
    const ey = cy + Math.sin(chip.angle) * chip.len * r
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(ex, ey)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(ex, ey, 1.5, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
  ctx.restore()
}
