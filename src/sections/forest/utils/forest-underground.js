import { FOREST_PAL, forestRgb } from './forest-palette.js'
import { GROUND_LAYER_FRACS } from './forest-earth-band.js'
import { forestUndergroundLargeFeatureAlpha, forestUndergroundSmallDetailAlpha } from './forest-atmosphere.js'
import { buildRockVertices, drawRockToCanvas } from '../../../utils/draw-rock.js'
//
// Buried decor of the forest earth band, shared by the forest level and the
// menu backdrop: rocks, cracks, pebble clusters, hair-roots, fossils, slate
// stone groups, sediment streaks, voids, warm pebbles, grit, shells, bones,
// coins, bottles and worms. The layout object places it: band span and
// depth, the big tree (whose root zone keeps less small decor), an optional
// extra zone that gets guaranteed decor, and an optional rootlet filter.
//
// Decor keeps this far in from the band's left / right ends.
//
const UG_AREA_EDGE_INSET = 40
//
// Underground decor in the root zone: buried rocks, cracks, pebble clusters,
// hanging rootlets, fossil spirals and one buried skeleton (no burrows).
//
const UG_TOP_PAD = 30
const UG_BOTTOM_PAD = 2
const UG_ROCK_COUNT = 14
const UG_CRACK_COUNT = 18
const UG_PEBBLE_CLUSTER_COUNT = 22
const UG_ROOTLET_COUNT = 26
const UG_SHELL_COUNT = 9
const UG_BONE_COUNT = 9
const UG_COIN_COUNT = 6
const UG_BOTTLE_COUNT = 2
const UG_WORM_COUNT = 8
const UG_FOSSIL_COUNT = 4
//
// Colour-world extras from the reference: loose groups of dark slate stones
// in the deep clay (a dense group guaranteed at each end of the band, a few
// scattered singles between), sediment streaks, dark voids with a lit lip,
// warm pebbles in the topsoil and fine grit.
//
const UG_BOULDER_PILE_COUNT = 4
const UG_BOULDER_PILE_EDGE_INSET = 60
const UG_BOULDER_PILE_STONES_MIN = 4
const UG_BOULDER_PILE_STONES_RANGE = 4
const UG_BOULDER_EDGE_PILE_STONES_MIN = 8
const UG_BOULDER_EDGE_PILE_STONES_RANGE = 4
const UG_BOULDER_SCATTER_COUNT = 14
const UG_BOULDER_R_MIN = 5
const UG_BOULDER_R_RANGE = 13
const UG_BOULDER_PILE_SPREAD = 150
const UG_BOULDER_DEEP_FRAC = 0.72
const UG_BOULDER_MIN_GAP_MULT = 0.85
const UG_BOULDER_PLACE_ATTEMPTS = 12
const UG_BOULDER_OUTLINE_PX = 1.5
//
// Lumpy, rounded silhouette: random-radius lobes joined by quadratic curves.
//
const UG_BOULDER_LOBES_MIN = 7
const UG_BOULDER_LOBES_RANGE = 5
const UG_BOULDER_LOBE_R_MIN = 0.8
const UG_BOULDER_LOBE_R_RANGE = 0.28
const UG_BOULDER_SQUASH_MIN = 0.78
const UG_BOULDER_SQUASH_RANGE = 0.2
//
// Mottled face: a soft lit cap toward the top-left plus a few light speckles.
//
const UG_BOULDER_CAP_OFFSET = 0.22
const UG_BOULDER_CAP_SCALE = 0.68
const UG_BOULDER_CAP_ALPHA = 0.35
const UG_BOULDER_SPECKLES_MIN = 2
const UG_BOULDER_SPECKLES_RANGE = 4
const UG_BOULDER_SPECKLE_R_MIN = 0.7
const UG_BOULDER_SPECKLE_R_RANGE = 1.1
const UG_BOULDER_SPECKLE_ALPHA = 0.55
const UG_STREAK_COUNT = 80
const UG_STREAK_LEN_MIN = 30
const UG_STREAK_LEN_RANGE = 110
const UG_STREAK_PX = 1.5
const UG_STREAK_ALPHA = 0.4
const UG_POCKET_COUNT = 30
const UG_POCKET_R_MIN = 2.5
const UG_POCKET_R_RANGE = 5
const UG_POCKET_LIP_ALPHA = 0.55
const UG_POCKET_VOID_ALPHA = 0.7
const UG_WARM_PEBBLE_COUNT = 160
const UG_WARM_PEBBLE_R_MIN = 1.2
const UG_WARM_PEBBLE_R_RANGE = 1.6
const UG_WARM_PEBBLE_TOP_FRAC = 0.45
//
// East of the main tree the roots carry the underground: most small pink
// pebbles, grit specks and grit-lipped pockets are dropped there, and the
// few surviving pebbles grow so they read as stones, not noise.
//
const UG_RIGHT_WARM_PEBBLE_KEEP = 0.12
const UG_RIGHT_WARM_PEBBLE_R_MULT = 1.9
const UG_RIGHT_GRIT_KEEP = 0.35
const UG_RIGHT_POCKET_KEEP = 0.4
//
// Small decor (pebbles, grit, pockets, shells, bones, coins, worms) is cut
// to about half across the band and thinned harder under the central tree
// so its big roots stay the read. Rocks, boulders and roots are untouched.
//
const UG_SMALL_DECOR_KEEP = 0.5
const UG_ROOT_SMALL_DECOR_KEEP = 0.2
const UG_ROOT_CLEAR_HALF = 320
const UG_GRIT_COUNT = 900
const UG_GRIT_PX_MIN = 1
const UG_GRIT_PX_RANGE = 2
const UG_GRIT_ALPHA = 0.55
const UG_BONE_KNOB_R = 2.3
const UG_BONE_KNOB_SPLIT = 1.7
const UG_BONE_SHAFT_PX = 2.4

/**
 * Builds a random buried-decor layout for an earth band.
 * @param {Object} layout - Band layout
 * @param {number} layout.x1 - Band left X
 * @param {number} layout.x2 - Band right X
 * @param {number} layout.surfaceY - Ground line Y (band top)
 * @param {number} layout.bandH - Band height
 * @param {number} layout.bottomY - Deepest Y for decor
 * @param {number} layout.treeX - Big tree trunk X
 * @param {number} layout.treeClearHalf - Half-width of the trunk zone
 * @param {function(number): boolean} [layout.skipRootlet] - True drops a hair-root at that X
 * @returns {Object} Decor spec (carries its layout)
 */
export function buildUndergroundSpec(layout) {
  return buildSpec(layout)
}

/**
 * Paints a decor spec with one mode's tones.
 * @param {CanvasRenderingContext2D} ctx - Target context
 * @param {Object} spec - From buildUndergroundSpec()
 * @param {Object} tones - From undergroundStaticEarthTones() (or a mode's own)
 */
export function renderUndergroundSpec(ctx, spec, tones) {
  renderSpec(ctx, spec, tones)
}

/**
 * Brown underground tones of the static colour earth band.
 * @returns {Object}
 */
export function undergroundStaticEarthTones() {
  return staticEarthTones()
}
//
// Generates the random layout of all underground features once, so both
// colour variants can be rendered from identical geometry.
//
//
// Random keep roll for one small underground decor item at world X.
//
function keepUndergroundSmallDecor(layout, x) {
  const keep = Math.abs(x - layout.treeX) < UG_ROOT_CLEAR_HALF ? UG_ROOT_SMALL_DECOR_KEEP : UG_SMALL_DECOR_KEEP
  return Math.random() < keep
}
function buildSpec(layout) {
  const areaX1 = layout.x1 + UG_AREA_EDGE_INSET
  const areaX2 = layout.x2 - UG_AREA_EDGE_INSET
  const areaY1 = layout.surfaceY + UG_TOP_PAD
  const areaY2 = layout.bottomY - UG_BOTTOM_PAD
  const randX = () => areaX1 + Math.random() * (areaX2 - areaX1)
  const randY = () => areaY1 + Math.random() * (areaY2 - areaY1)
  //
  // Buried rocks — reuse the shared rock silhouette generator.
  //
  const rocks = []
  for (let i = 0; i < UG_ROCK_COUNT; i++) {
    const radius = 12 + Math.random() * 22
    rocks.push({ x: randX(), y: randY(), radius, verts: buildRockVertices(radius) })
  }
  //
  // Cracks — thin polylines with one smaller side branch each.
  //
  const cracks = []
  for (let i = 0; i < UG_CRACK_COUNT; i++) {
    const pts = [{ x: randX(), y: randY() }]
    for (let s = 0; s < 3; s++) {
      const last = pts[pts.length - 1]
      pts.push({ x: last.x + (Math.random() - 0.5) * 46, y: last.y + 8 + Math.random() * 22 })
    }
    const mid = pts[1]
    const branch = [
      { x: mid.x, y: mid.y },
      { x: mid.x + (Math.random() - 0.5) * 36, y: mid.y + 10 + Math.random() * 16 }
    ]
    cracks.push({ pts, branch })
  }
  //
  // Pebble clusters — a handful of tiny stones packed together.
  //
  const pebbles = []
  for (let i = 0; i < UG_PEBBLE_CLUSTER_COUNT; i++) {
    const cx = randX()
    const cy = randY()
    if (!keepUndergroundSmallDecor(layout, cx)) continue
    const stones = []
    const count = 3 + Math.floor(Math.random() * 4)
    for (let s = 0; s < count; s++) {
      stones.push({ x: cx + (Math.random() - 0.5) * 26, y: cy + (Math.random() - 0.5) * 14, r: 2 + Math.random() * 3 })
    }
    pebbles.push(stones)
  }
  //
  // Rootlets — thin hair-roots hanging down from dry ground only. The whole
  // left field is the lake, so nothing hangs under the water.
  //
  const dryX1 = layout.treeX + layout.treeClearHalf
  const randRootX = () => dryX1 + Math.random() * Math.max(1, areaX2 - dryX1)
  const rootlets = []
  for (let i = 0; i < UG_ROOTLET_COUNT; i++) {
    const rx = randRootX()
    const pts = [{ x: rx, y: layout.surfaceY + 4 }]
    let px = rx
    let py = layout.surfaceY + 4
    const segs = 2 + Math.floor(Math.random() * 2)
    for (let s = 0; s < segs; s++) {
      px += (Math.random() - 0.5) * 14
      py += 10 + Math.random() * 16
      pts.push({ x: px, y: py })
    }
    rootlets.push(pts)
  }
  //
  // One fossil spiral — a small ammonite curled among the stones.
  //
  const fossils = []
  for (let i = 0; i < UG_FOSSIL_COUNT; i++) {
    const x = randX()
    keepUndergroundSmallDecor(layout, x) && fossils.push({ x, y: randY(), r: 7 + Math.random() * 7 })
  }
  //
  // Boulder piles sit on the band floor; grit specks are spread everywhere.
  //
  const deepY1 = layout.surfaceY + layout.bandH * UG_BOULDER_DEEP_FRAC
  const placedStones = []
  const boulderPiles = [
    buildUndergroundStoneGroup(areaX1 + UG_BOULDER_PILE_EDGE_INSET, deepY1, areaY2, true, placedStones),
    buildUndergroundStoneGroup(areaX2 - UG_BOULDER_PILE_EDGE_INSET, deepY1, areaY2, true, placedStones)
  ]
  for (let i = 0; i < UG_BOULDER_PILE_COUNT; i++) {
    boulderPiles.push(buildUndergroundStoneGroup(randX(), deepY1, areaY2, false, placedStones))
  }
  boulderPiles.push(buildUndergroundScatteredStones(randX, deepY1, areaY2, placedStones))
  const rightX = layout.treeX + layout.treeClearHalf
  const keepOnRight = (x, keep) => x < rightX || Math.random() < keep
  const grit = []
  for (let i = 0; i < UG_GRIT_COUNT; i++) {
    const x = randX()
    keepOnRight(x, UG_RIGHT_GRIT_KEEP) && keepUndergroundSmallDecor(layout, x) &&
      grit.push({ x, y: randY(), px: UG_GRIT_PX_MIN + Math.floor(Math.random() * UG_GRIT_PX_RANGE), light: Math.random() < 0.5 })
  }
  const streaks = []
  for (let i = 0; i < UG_STREAK_COUNT; i++) {
    streaks.push({ x: randX(), y: randY(), len: UG_STREAK_LEN_MIN + Math.random() * UG_STREAK_LEN_RANGE, tilt: (Math.random() - 0.5) * 0.06 })
  }
  const pockets = []
  for (let i = 0; i < UG_POCKET_COUNT; i++) {
    const r = UG_POCKET_R_MIN + Math.random() * UG_POCKET_R_RANGE
    const x = randX()
    keepOnRight(x, UG_RIGHT_POCKET_KEEP) && keepUndergroundSmallDecor(layout, x) &&
      pockets.push({ x, y: randY(), rx: r * (1.2 + Math.random() * 0.6), ry: r })
  }
  const warmPebbles = []
  const topsoilY2 = layout.surfaceY + layout.bandH * UG_WARM_PEBBLE_TOP_FRAC
  for (let i = 0; i < UG_WARM_PEBBLE_COUNT; i++) {
    const x = randX()
    const y = Math.random() < 0.75 ? areaY1 + Math.random() * (topsoilY2 - areaY1) : randY()
    const r = UG_WARM_PEBBLE_R_MIN + Math.random() * UG_WARM_PEBBLE_R_RANGE
    if (!keepUndergroundSmallDecor(layout, x)) continue
    if (x < rightX) {
      warmPebbles.push({ x, y, r })
      continue
    }
    Math.random() < UG_RIGHT_WARM_PEBBLE_KEEP && warmPebbles.push({ x, y, r: r * UG_RIGHT_WARM_PEBBLE_R_MULT })
  }
  //
  // Shells, bones, coins, bottles, worms — simple silhouettes for humour.
  //
  const shells = []
  for (let i = 0; i < UG_SHELL_COUNT; i++) {
    const x = randX()
    keepUndergroundSmallDecor(layout, x) && shells.push({
      x,
      y: randY(),
      w: 10 + Math.random() * 8,
      h: 7 + Math.random() * 5,
      flip: Math.random() < 0.5
    })
  }
  const bones = []
  for (let i = 0; i < UG_BONE_COUNT; i++) {
    const x = randX()
    const y = randY()
    const angle = (Math.random() - 0.5) * 0.8
    keepUndergroundSmallDecor(layout, x) && bones.push({ x, y, angle, len: 18 + Math.random() * 14 })
  }
  const coins = []
  for (let i = 0; i < UG_COIN_COUNT; i++) {
    const x = randX()
    keepUndergroundSmallDecor(layout, x) && coins.push({ x, y: randY(), r: 3 + Math.random() * 2 })
  }
  const bottles = []
  for (let i = 0; i < UG_BOTTLE_COUNT; i++) {
    bottles.push({ x: randX(), y: randY(), h: 14 + Math.random() * 6, tilt: (Math.random() - 0.5) * 0.5 })
  }
  const worms = []
  for (let i = 0; i < UG_WORM_COUNT; i++) {
    const x = randX()
    const y = randY()
    if (!keepUndergroundSmallDecor(layout, x)) continue
    const pts = [{ x, y }]
    for (let s = 0; s < 4; s++) {
      const last = pts[pts.length - 1]
      pts.push({ x: last.x + 6 + Math.random() * 8, y: last.y + (Math.random() - 0.5) * 6 })
    }
    worms.push(pts)
  }
  return {
    rocks, cracks, pebbles, rootlets, fossils, boulderPiles, grit, streaks, pockets, warmPebbles,
    shells, bones, coins, bottles, worms, skeleton: null, layout
  }
}
//
// One loose group of slate stones in the deep clay — spaced apart (only a
// slight touch between neighbours), denser toward the group centre.
//
function buildUndergroundStoneGroup(cx, y1, y2, edgeGroup, placed) {
  const countMin = edgeGroup ? UG_BOULDER_EDGE_PILE_STONES_MIN : UG_BOULDER_PILE_STONES_MIN
  const countRange = edgeGroup ? UG_BOULDER_EDGE_PILE_STONES_RANGE : UG_BOULDER_PILE_STONES_RANGE
  const count = countMin + Math.floor(Math.random() * countRange)
  const stones = []
  for (let s = 0; s < count; s++) {
    const u = (Math.random() + Math.random()) * 0.5 - 0.5
    const stone = placeUndergroundStone(cx + u * UG_BOULDER_PILE_SPREAD, y1, y2, placed)
    stone && stones.push(stone)
  }
  return stones
}
//
// Single stones spread along the deep layer between the groups.
//
function buildUndergroundScatteredStones(randX, y1, y2, placed) {
  const stones = []
  for (let s = 0; s < UG_BOULDER_SCATTER_COUNT; s++) {
    const stone = placeUndergroundStone(randX(), y1, y2, placed)
    stone && stones.push(stone)
  }
  return stones
}
//
// Tries a few jittered spots around x until one does not overlap earlier stones.
//
function placeUndergroundStone(x, y1, y2, placed) {
  const r = UG_BOULDER_R_MIN + Math.random() * UG_BOULDER_R_RANGE
  for (let attempt = 0; attempt < UG_BOULDER_PLACE_ATTEMPTS; attempt++) {
    const sx = x + (Math.random() - 0.5) * r * 2 * attempt
    const sy = y1 + r + Math.random() * Math.max(1, y2 - y1 - r * 2)
    const clear = placed.every(o => Math.hypot(o.x - sx, o.y - sy) >= (o.r + r) * UG_BOULDER_MIN_GAP_MULT)
    if (!clear) continue
    const stone = buildUndergroundStoneShape(sx, sy, r)
    placed.push(stone)
    return stone
  }
  return null
}
//
// Lumpy rounded outline (lobe radii vary) plus speckle positions on the face.
//
function buildUndergroundStoneShape(x, y, r) {
  const lobes = UG_BOULDER_LOBES_MIN + Math.floor(Math.random() * UG_BOULDER_LOBES_RANGE)
  const squash = UG_BOULDER_SQUASH_MIN + Math.random() * UG_BOULDER_SQUASH_RANGE
  const phase = Math.random() * Math.PI * 2
  const verts = []
  for (let i = 0; i < lobes; i++) {
    const angle = phase + (i + (Math.random() - 0.5) * 0.5) / lobes * Math.PI * 2
    const lr = UG_BOULDER_LOBE_R_MIN + Math.random() * UG_BOULDER_LOBE_R_RANGE
    verts.push({ x: Math.cos(angle) * lr, y: Math.sin(angle) * lr * squash })
  }
  const speckles = []
  const speckleCount = UG_BOULDER_SPECKLES_MIN + Math.floor(Math.random() * UG_BOULDER_SPECKLES_RANGE)
  for (let i = 0; i < speckleCount; i++) {
    const a = Math.random() * Math.PI * 2
    const d = Math.sqrt(Math.random()) * 0.6
    speckles.push({
      x: Math.cos(a) * d,
      y: Math.sin(a) * d * squash,
      r: UG_BOULDER_SPECKLE_R_MIN + Math.random() * UG_BOULDER_SPECKLE_R_RANGE
    })
  }
  return { x, y, r, verts, speckles }
}
//
// Scales baked underground decor opacity by depth (large masses fade slower).
//
function paintUndergroundDecorAtDepth(ctx, layout, y, large, paintFn) {
  const a = large
    ? forestUndergroundLargeFeatureAlpha(y, layout.surfaceY, layout.bandH)
    : forestUndergroundSmallDetailAlpha(y, layout.surfaceY, layout.bandH)
  if (a < 0.03) return
  ctx.save()
  ctx.globalAlpha *= a
  paintFn()
  ctx.restore()
}
//
// Renders the shared underground layout with one mode's tones.
//
function renderSpec(ctx, spec, tones) {
  const layout = spec.layout
  const fillCss = `rgb(${tones.fill.r}, ${tones.fill.g}, ${tones.fill.b})`
  const deepCss = `rgb(${tones.deep.r}, ${tones.deep.g}, ${tones.deep.b})`
  const lightCss = `rgb(${tones.light.r}, ${tones.light.g}, ${tones.light.b})`
  tones.stone && paintUndergroundSediment(ctx, spec, tones, deepCss)
  //
  // Buried rocks — flat single-tone silhouettes, no outline.
  //
  const rockPalette = {
    fillR: tones.fill.r, fillG: tones.fill.g, fillB: tones.fill.b,
    lightR: tones.fill.r, lightG: tones.fill.g, lightB: tones.fill.b,
    darkR: tones.fill.r, darkG: tones.fill.g, darkB: tones.fill.b
  }
  spec.rocks.forEach(rock => {
    paintUndergroundDecorAtDepth(ctx, layout, rock.y, false, () => {
      drawRockToCanvas(ctx, { cx: rock.x, cy: rock.y, radius: rock.radius, verts: rock.verts, palette: rockPalette, skipOutline: true, skipShadow: true })
    })
  })
  //
  // Cracks — thin fissures with a short side branch.
  //
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const strokeCss = tones.monoStrokes ? fillCss : deepCss
  ctx.strokeStyle = strokeCss
  ctx.globalAlpha = 0.7
  ctx.lineWidth = 1.4
  spec.cracks.forEach(crack => {
    const cy = crack.pts[0]?.y ?? layout.surfaceY
    paintUndergroundDecorAtDepth(ctx, layout, cy, false, () => {
      strokePolyline(ctx, crack.pts)
      strokePolyline(ctx, crack.branch)
    })
  })
  ctx.globalAlpha = 1
  //
  // Pebble clusters.
  //
  ctx.fillStyle = fillCss
  spec.pebbles.forEach(stones => {
    stones.forEach(stone => {
      paintUndergroundDecorAtDepth(ctx, layout, stone.y, false, () => {
        ctx.beginPath()
        ctx.arc(stone.x, stone.y, stone.r, 0, Math.PI * 2)
        ctx.fill()
      })
    })
  })
  //
  // Hair-roots hanging from the ground line.
  //
  ctx.strokeStyle = strokeCss
  ctx.globalAlpha = 0.6
  ctx.lineWidth = 1.6
  spec.rootlets.forEach(pts => {
    const rx = pts[0]?.x ?? 0
    if (rx < layout.treeX - layout.treeClearHalf) return
    if (layout.skipRootlet?.(rx)) return
    const ry = pts[pts.length - 1]?.y ?? pts[0]?.y ?? layout.surfaceY
    paintUndergroundDecorAtDepth(ctx, layout, ry, false, () => strokePolyline(ctx, pts))
  })
  ctx.globalAlpha = 1
  //
  // Fossil spiral — a small two-turn ammonite drawn in the light tone.
  //
  ctx.strokeStyle = lightCss
  ctx.lineWidth = 1.5
  spec.fossils?.forEach(fossil => {
    paintUndergroundDecorAtDepth(ctx, layout, fossil.y, false, () => {
      ctx.globalAlpha = 0.75
      strokeUndergroundFossil(ctx, fossil)
    })
  })
  ctx.globalAlpha = 1
  tones.stone && paintUndergroundBoulderPiles(ctx, layout, spec.boulderPiles, tones)
  tones.grit && paintUndergroundGrit(ctx, layout, spec.grit, tones, deepCss)
  tones.pebble && paintUndergroundWarmPebbles(ctx, layout, spec.warmPebbles, tones)
  //
  // Buried shells — half-ovals with a split line.
  //
  spec.shells?.forEach(shell => {
    paintUndergroundDecorAtDepth(ctx, layout, shell.y, false, () => {
      ctx.save()
      ctx.translate(shell.x, shell.y)
      shell.flip && ctx.scale(-1, 1)
      ctx.fillStyle = lightCss
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.ellipse(0, 0, shell.w * 0.5, shell.h * 0.45, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = deepCss
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(-shell.w * 0.35, 0)
      ctx.lineTo(shell.w * 0.35, 0)
      ctx.stroke()
      ctx.restore()
    })
  })
  ctx.globalAlpha = 1
  //
  // Bones — two short segments with knobs.
  //
  spec.bones?.forEach(bone => {
    paintUndergroundDecorAtDepth(ctx, layout, bone.y, false, () => {
      ctx.save()
      ctx.translate(bone.x, bone.y)
      ctx.rotate(bone.angle)
      ctx.strokeStyle = lightCss
      ctx.lineWidth = UG_BONE_SHAFT_PX
      ctx.lineCap = 'round'
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.moveTo(-bone.len * 0.5, 0)
      ctx.lineTo(bone.len * 0.5, 0)
      ctx.stroke()
      ctx.fillStyle = lightCss
      for (const end of [-0.5, 0.5]) {
        for (const side of [-1, 1]) {
          ctx.beginPath()
          ctx.arc(bone.len * end, side * UG_BONE_KNOB_SPLIT, UG_BONE_KNOB_R, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.restore()
    })
  })
  ctx.globalAlpha = 1
  //
  // Coins — tiny buried discs.
  //
  ctx.fillStyle = lightCss
  spec.coins?.forEach(coin => {
    paintUndergroundDecorAtDepth(ctx, layout, coin.y, false, () => {
      ctx.globalAlpha = 0.75
      ctx.beginPath()
      ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2)
      ctx.fill()
    })
  })
  ctx.globalAlpha = 1
  //
  // Bottles — stuck at an angle (message in a bottle vibes).
  //
  spec.bottles?.forEach(bottle => {
    paintUndergroundDecorAtDepth(ctx, layout, bottle.y, false, () => {
      ctx.save()
      ctx.translate(bottle.x, bottle.y)
      ctx.rotate(bottle.tilt)
      ctx.fillStyle = lightCss
      ctx.globalAlpha = 0.7
      ctx.fillRect(-3, -bottle.h * 0.5, 6, bottle.h * 0.65)
      ctx.fillRect(-2, -bottle.h * 0.5 - 4, 4, 4)
      ctx.restore()
    })
  })
  ctx.globalAlpha = 1
  //
  // Worms — wavy polylines.
  //
  ctx.strokeStyle = deepCss
  ctx.lineWidth = 1.4
  ctx.lineCap = 'round'
  spec.worms?.forEach(pts => {
    const wy = pts[pts.length - 1]?.y ?? pts[0]?.y ?? layout.surfaceY
    paintUndergroundDecorAtDepth(ctx, layout, wy, false, () => {
      ctx.globalAlpha = 0.65
      strokePolyline(ctx, pts)
    })
  })
  ctx.globalAlpha = 1
}
//
// Two-turn ammonite spiral in the current stroke style.
//
function strokeUndergroundFossil(ctx, fossil) {
  const turns = 2
  const steps = 40
  ctx.beginPath()
  for (let s = 0; s <= steps; s++) {
    const t = s / steps
    const angle = t * turns * Math.PI * 2
    const px = fossil.x + Math.cos(angle) * fossil.r * t
    const py = fossil.y + Math.sin(angle) * fossil.r * t
    s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.stroke()
}
//
// Sediment streaks along the strata and dark voids with a lit lower lip,
// painted first so every other buried feature sits on top of them.
//
function paintUndergroundSediment(ctx, spec, tones, deepCss) {
  const lipCss = `rgb(${tones.grit.r}, ${tones.grit.g}, ${tones.grit.b})`
  const voidCss = `rgb(${tones.contour.r}, ${tones.contour.g}, ${tones.contour.b})`
  ctx.strokeStyle = deepCss
  ctx.lineWidth = UG_STREAK_PX
  ctx.lineCap = 'round'
  ctx.globalAlpha = UG_STREAK_ALPHA
  spec.streaks?.forEach(streak => {
    ctx.beginPath()
    ctx.moveTo(streak.x, streak.y)
    ctx.quadraticCurveTo(streak.x + streak.len * 0.5, streak.y - 2, streak.x + streak.len, streak.y + streak.len * streak.tilt)
    ctx.stroke()
  })
  spec.pockets?.forEach(pocket => {
    ctx.globalAlpha = UG_POCKET_LIP_ALPHA
    ctx.fillStyle = lipCss
    ctx.beginPath()
    ctx.ellipse(pocket.x, pocket.y + 1.5, pocket.rx, pocket.ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = UG_POCKET_VOID_ALPHA
    ctx.fillStyle = voidCss
    ctx.beginPath()
    ctx.ellipse(pocket.x, pocket.y, pocket.rx, pocket.ry, 0, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}
//
// Small warm pebbles, mostly in the topsoil.
//
function paintUndergroundWarmPebbles(ctx, layout, pebbles, tones) {
  ctx.fillStyle = `rgb(${tones.pebble.r}, ${tones.pebble.g}, ${tones.pebble.b})`
  pebbles?.forEach(p => {
    paintUndergroundDecorAtDepth(ctx, layout, p.y, false, () => {
      ctx.beginPath()
      ctx.ellipse(p.x, p.y, p.r * 1.25, p.r, 0, 0, Math.PI * 2)
      ctx.fill()
    })
  })
}
//
// Dark slate stones in the deep clay: contour, body, soft lit cap, speckles.
//
function paintUndergroundBoulderPiles(ctx, layout, piles, tones) {
  const stoneCss = `rgb(${tones.stone.r}, ${tones.stone.g}, ${tones.stone.b})`
  const lightCss = `rgb(${tones.stoneLight.r}, ${tones.stoneLight.g}, ${tones.stoneLight.b})`
  const contourCss = `rgb(${tones.contour.r}, ${tones.contour.g}, ${tones.contour.b})`
  piles?.forEach(stones => stones.forEach(stone => {
    paintUndergroundDecorAtDepth(ctx, layout, stone.y, true, () => {
      paintUndergroundStone(ctx, stone, stoneCss, lightCss, contourCss)
    })
  }))
}
function paintUndergroundStone(ctx, stone, stoneCss, lightCss, contourCss) {
  ctx.fillStyle = contourCss
  traceUndergroundStonePath(ctx, stone, stone.x, stone.y, stone.r + UG_BOULDER_OUTLINE_PX)
  ctx.fill()
  ctx.fillStyle = stoneCss
  traceUndergroundStonePath(ctx, stone, stone.x, stone.y, stone.r)
  ctx.fill()
  ctx.save()
  ctx.clip()
  ctx.globalAlpha = UG_BOULDER_CAP_ALPHA
  ctx.fillStyle = lightCss
  const capR = stone.r * UG_BOULDER_CAP_SCALE
  const capShift = stone.r * UG_BOULDER_CAP_OFFSET
  traceUndergroundStonePath(ctx, stone, stone.x - capShift, stone.y - capShift, capR)
  ctx.fill()
  ctx.globalAlpha = UG_BOULDER_SPECKLE_ALPHA
  stone.speckles.forEach(sp => {
    ctx.beginPath()
    ctx.arc(stone.x + sp.x * stone.r, stone.y + sp.y * stone.r, sp.r, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.restore()
}
//
// Fine soil grit: half light specks, half dark, so the earth reads textured.
//
function paintUndergroundGrit(ctx, layout, grit, tones, deepCss) {
  const gritCss = `rgb(${tones.grit.r}, ${tones.grit.g}, ${tones.grit.b})`
  const topsoilY2 = layout.surfaceY + layout.bandH * GROUND_LAYER_FRACS[0]
  ctx.globalAlpha = UG_GRIT_ALPHA
  grit?.forEach(g => {
    if (g.y < topsoilY2) return
    paintUndergroundDecorAtDepth(ctx, layout, g.y, false, () => {
      ctx.fillStyle = g.light ? gritCss : deepCss
      const r = g.px * 0.52
      ctx.beginPath()
      ctx.arc(g.x, g.y, r, 0, Math.PI * 2)
      ctx.fill()
    })
  })
  ctx.globalAlpha = 1
}
//
// Closed lumpy outline: quadratic curves through lobe midpoints keep it rounded.
//
function traceUndergroundStonePath(ctx, stone, cx, cy, r) {
  const verts = stone.verts
  const n = verts.length
  const first = verts[0]
  const last = verts[n - 1]
  ctx.beginPath()
  ctx.moveTo(cx + (last.x + first.x) * 0.5 * r, cy + (last.y + first.y) * 0.5 * r)
  for (let i = 0; i < n; i++) {
    const v = verts[i]
    const next = verts[(i + 1) % n]
    ctx.quadraticCurveTo(cx + v.x * r, cy + v.y * r, cx + (v.x + next.x) * 0.5 * r, cy + (v.y + next.y) * 0.5 * r)
  }
  ctx.closePath()
}
//
// Brown underground tones baked into the static colour earth band.
//
function staticEarthTones() {
  return {
    fill: forestRgb('groundSand'),
    deep: forestRgb(FOREST_PAL.log.bark),
    light: forestRgb(FOREST_PAL.log.barkLight),
    monoStrokes: true,
    ...undergroundColorExtraTones()
  }
}
//
// Cobble, void, pebble and grit tones for the static colour earth band.
//
function undergroundColorExtraTones() {
  const tones = FOREST_PAL.forestUnderground
  return {
    stone: forestRgb(tones.stone),
    stoneLight: forestRgb(tones.stoneLight),
    contour: forestRgb(tones.contour),
    grit: forestRgb(tones.grit),
    pebble: forestRgb(tones.pebble)
  }
}
//
// Strokes an open polyline through the given points.
//
function strokePolyline(ctx, pts) {
  ctx.beginPath()
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
  ctx.stroke()
}
