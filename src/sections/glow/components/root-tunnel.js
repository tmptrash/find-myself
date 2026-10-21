import { CFG } from '../../../cfg.js'
import { toCanvas, getRGB } from '../../../utils/helper.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { GLOW_PAL } from '../utils/glow-palette.js'
import { glowEyeBerryColors, addEyeBerry, addTaperedPass } from '../utils/glow-eye-berry.js'
import { applyGlowFilmGrainToCanvas } from '../utils/glow-parallax-grain.js'
//
// Tunnel the eye-flower's roots tear through the island while they drag the
// hero under. Nothing of it exists before the pull: a narrow ragged crack
// splits the turf, then the cut runs down through the soil and past the
// bottom of the playfield, winding a little, narrowing and darkening.
// The walls are an open soil section (uneven strata, stones, thin roots,
// ledges), lit warm at the lip. Living roots run along the walls, coil
// around the hero and drag him down; the flower's vines and eye-berries
// trail behind him from the opening.
//
// Layer sits above the lake fill (12) and the island (11.8) so the cut also
// shows through the soil under the waterline; the darkness sits under the HUD.
//
const TUNNEL_Z = 12.3
const DARK_Z = CFG.visual.zIndex.ui - 2
const TAU = Math.PI * 2
//
// Spine of the cut, sampled every few px from the turf down to the bottom.
//
const SPINE_STEP = 4
const SURFACE_OVERLAP = 6
const HW_TOP = 32
const HW_BOTTOM = 20
const HW_MIN = 11
const WALL_TOP = 22
const WALL_BOTTOM = 13
const LEAN_PX = 30
const LEAN_POW = 1.3
const WIGGLE_AMP = 8
const WIGGLE_LEN = 58
const WIGGLE_NOISE_AMP = 5
const WIGGLE_NOISE_STEP = 40
const WIGGLE_IN_PX = 60
//
// No symmetry: each wall gets its own slow width drift, fine jags and
// a few ledges that bite into the cavity.
//
const EDGE_NOISE_STEP = 22
const EDGE_NOISE_AMP = 0.2
const EDGE_JAG_STEP = 5
const EDGE_JAG_PX = 2.4
const WALL_NOISE_STEP = 14
const WALL_NOISE_AMP = 0.6
const OUTER_JAG_STEP = 8
const OUTER_JAG_PX = 5
const WALL_MIN = 4
const LEDGE_COUNT = 7
const LEDGE_DEPTH_MIN = 4
const LEDGE_DEPTH_RANGE = 6
const LEDGE_LEN_MIN = 10
const LEDGE_LEN_RANGE = 14
//
// The crack stays narrow at the turf; only the torn soil around it flares.
//
const MOUTH_DEPTH = 22
const MOUTH_FLARE = 12
const MOUTH_OPEN_PX = 3
const BAKE_PAD = 10
const CLOD_HEADROOM = 20
const SURFACE_SAMPLE_STEP = 4
const SURFACE_CUT_PX = 1
//
// Soil section: wavy strata, specks, stones and thin roots.
//
const STRATA_H_MIN = 5
const STRATA_H_RANGE = 9
const STRATA_GAP_MIN = 2
const STRATA_GAP_RANGE = 10
const STRATA_ALPHA = 0.75
const STRATA_WAVE = 2.5
const STRATA_FREQ = 0.11
const STRATA_TILT = 0.12
const STRATA_STEP = 6
const STRATA_SEAM_PHASE = 1.3
const FLECK_AREA = 70
const FLECK_SIZE_MIN = 1
const FLECK_SIZE_RANGE = 1.5
const FLECK_ALPHA = 0.55
const WALL_STONE_GAP = 26
const WALL_STONE_R_MIN = 2.5
const WALL_STONE_R_RANGE = 4.5
const EDGE_STONE_GAP = 60
const EDGE_STONE_R_MIN = 3
const EDGE_STONE_R_RANGE = 3
const STONE_SIDES_MIN = 6
const STONE_SIDES_RANGE = 3
const STONE_JIT_MIN = 0.75
const STONE_JIT_RANGE = 0.4
const STONE_FLAT = 0.8
const STONE_LIGHT_SCALE = 0.5
const STONE_LIGHT_DX = -0.28
const STONE_LIGHT_DY = -0.32
const STONE_CONTOUR_W = 1.2
const WALL_ROOT_GAP = 34
const ROOT_SEGMENTS_MIN = 3
const ROOT_SEGMENTS_RANGE = 4
const ROOT_SEG_MIN = 5
const ROOT_SEG_RANGE = 4
const ROOT_W = 1.6
const ROOT_TIP_FRAC = 0.4
const ROOT_BEND = 0.5
const ROOT_ANGLE_RANGE = 0.9
const ROOT_ALPHA = 0.7
const ROOT_BRANCH_CHANCE = 0.4
const HANG_ROOT_GAP = 40
const HANG_ROOT_LEN_MIN = 8
const HANG_ROOT_LEN_RANGE = 12
const HANG_ROOT_W = 2.2
const HANG_ROOT_DROOP = 0.9
//
// Cavity: warm daylight spill under the crack, darkness growing with depth,
// scrape marks of the roots on the back wall.
//
const CAVITY_BAND_H = 16
const CAVITY_DARK_MIN = 0.12
const CAVITY_DARK_MAX = 0.8
const CAVITY_DARK_PX = 360
const CAVITY_GLOW_BANDS = 4
const CAVITY_GLOW_BAND_H = 9
const CAVITY_GLOW_ALPHA = 0.55
const GOUGE_GAP = 14
const GOUGE_LEN_MIN = 14
const GOUGE_LEN_RANGE = 26
const GOUGE_W = 1.4
const GOUGE_ALPHA = 0.45
const GOUGE_SHADOW_DX = 1.4
const OUTER_EDGE_W = 2.5
const OUTER_EDGE_ALPHA = 0.3
const EDGE_CONTOUR_W = 1.6
const EDGE_CONTOUR_ALPHA = 0.9
const RIM_LIGHT_PX = 110
const RIM_LIGHT_W = 2.4
const RIM_LIGHT_ALPHA = 0.85
const RIM_LIGHT_LEFT = 0.45
const RIM_HOT_PX = 36
const RIM_HOT_W = 1.4
//
// Torn lip: turf strip, chipped clods, pebbles and crumbs.
//
const TURF_H = 5
const TURF_LIGHT_H = 1.5
const CLODS_PER_SIDE = 3
const CLOD_W_MIN = 6
const CLOD_W_RANGE = 6
const CLOD_H_MIN = 4
const CLOD_H_RANGE = 4
const CLOD_LIFT = 7
const CLOD_TILT_MIN = 0.3
const CLOD_TILT_RANGE = 0.5
const CLOD_SIDES = 6
const CLOD_TURF_CHANCE = 0.5
const CLOD_TURF_FRAC = 0.35
const INNER_CLODS = 3
const INNER_CLOD_DEPTH = 14
const PEBBLE_COUNT = 8
const PEBBLE_R_MIN = 1.5
const PEBBLE_R_RANGE = 2
const PEBBLE_LIFT = 3
const LIP_CRUMBS = 16
const LIP_CRUMB_SPREAD = 8
//
// Deep earth under the playfield floor, baked across the view once.
//
const DEEP_MARGIN = 40
const DEEP_DARK_BANDS = 8
const DEEP_DARK_TOP = 0.42
const DEEP_DARK_BOTTOM = 0.86
const DEEP_STONE_SPACING = 70
const DEEP_ROOT_SPACING = 110
const DEEP_GRAIN_SEED = 7121
//
// Sediment lenses: broken, tapered layers instead of stripes across the view.
//
const LENS_AREA = 5200
const LENS_W_MIN = 60
const LENS_W_RANGE = 260
const LENS_H_MIN = 3
const LENS_H_RANGE = 7
const LENS_STEP = 8
const LENS_SAG = 6
const LENS_ALPHA = 0.5
//
// Darkness closes in from below: lighter bands at the top of the view.
//
const DARK_BANDS = 8
const DARK_TOP_FRAC = 0.5
//
// Reveal: the crack splits open sideways, then the roots tear the cut down
// ahead of the hero with a ragged front.
//
const OPEN_SCALE_MIN = 0.3
const MOUTH_REVEAL = MOUTH_DEPTH + 8
const TEAR_SPEED = 620
const REVEAL_COLUMNS = 16
const REVEAL_JAG_PX = 12
//
// Live strands: two trailing flower strands from the opening (a leafy vine
// and the red stalk with eye-berries) and three roots from the hero down to
// the tearing front, hugging the walls.
//
const STRAND_POINTS = 14
const STRAND_CONTOUR_W = 1.4
const STRAND_LIGHT_FRAC = 0.35
const STRAND_TIP_W = 1.2
const SWAY_SPEED = 7
const SWAY_WAVE = 3
const HUG_RAMP_GAIN = 2.2
const TRAIL_STRANDS = [
  { kind: 'vine', from: -0.5, dx: -8, dy: -16, w: 4, sway: 5, phase: 0.4 },
  { kind: 'stalk', from: 0.35, dx: 7, dy: -20, w: 3, sway: 4, phase: 2.1 }
]
const PULL_STRANDS = [
  { side: -1, dx: -10, dy: 16, hug: 0.78, w: 5, sway: 3, phase: 1.1, reach: 150 },
  { side: 1, dx: 9, dy: 22, hug: 0.72, w: 4, sway: 4, phase: 3.3, reach: 190 },
  { side: -1, dx: -4, dy: 30, hug: 0.35, w: 3, sway: 5, phase: 5.2, reach: 240 }
]
const PULL_TIP_BACK = 4
const PULL_SWAY_BASE = 0.35
const PULL_WAVE_MULT = 1.8
const ROOTLET_EVERY = 3
const ROOTLET_LEN = 6
const ROOTLET_DROP = 4
const ROOTLET_W = 1.4
const LEAF_EVERY = 3
const LEAF_RADII = [2.6, 2.2, 1.4]
const LEAF_STEP = 2.2
const LEAF_CONTOUR = 1.1
const BERRY_SPOTS = [0.3, 0.52, 0.74]
const BERRY_R_MIN = 4
const BERRY_R_RANGE = 1.6
const BERRY_STEM_PX = 5
const BERRY_STEM_W = 1.6
const BERRY_CONTOUR_W = 1.3
const PUPIL_R_FRAC = 0.42
const PUPIL_LOOK_FRAC = 0.42
//
// Coils around the hero (sprite-centre offsets, scaled with the hero).
//
const COILS = [
  { dy: -14, kind: 'vine' },
  { dy: 2, kind: 'root' },
  { dy: 18, kind: 'vine' }
]
const COIL_RX = 17
const COIL_RY = 5
const COIL_TILT = 3
const COIL_SEGMENTS = 14
const COIL_W = 4
//
// Crumbs shaken loose from the walls while he is dragged past.
//
const CRUMB_GAP = 0.035
const CRUMB_LIFE = 0.8
const CRUMB_GRAVITY = 900
const CRUMB_R_MIN = 1
const CRUMB_R_RANGE = 1.6
const CRUMB_VX = 50
const CRUMB_SPREAD_Y = 34
const CRUMB_MAX = 60

/**
 * Bakes the tunnel for one grab and adds its draw layers (hidden until
 * open() is called). Bakes are tied to this live Kaplay inst.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.x - Crack centre X (world)
 * @param {number} cfg.groundY - Soil line under the turf at x
 * @param {function(Object, number): number} cfg.surfaceAt - Turf top Y for (surfaceTarget, x)
 * @param {Object} cfg.surfaceTarget - First argument of surfaceAt
 * @param {number} cfg.bottomY - Deepest world Y the cut must reach
 * @param {number} cfg.earthBottomY - World Y where the playfield earth band ends
 * @param {number} cfg.leanDir - -1 leans left with depth, 1 right
 * @param {number} cfg.seed - Bake seed
 * @param {function(): void} cfg.drawPrey - Draws the hero between the back and front strands
 * @returns {Object} Root-tunnel inst
 */
export function create(cfg) {
  const { k } = cfg
  const pal = GLOW_PAL.glowRootTunnel
  const flowerPal = GLOW_PAL.glowEyeFlower
  const surfaceY = cfg.surfaceAt(cfg.surfaceTarget, cfg.x)
  const inst = {
    k,
    x: cfg.x,
    groundY: cfg.groundY,
    surfaceY,
    topY: surfaceY - SURFACE_OVERLAP,
    bottomY: cfg.bottomY,
    earthBottomY: cfg.earthBottomY,
    leanDir: cfg.leanDir,
    seed: cfg.seed,
    surfaceAt: cfg.surfaceAt,
    surfaceTarget: cfg.surfaceTarget,
    drawPrey: cfg.drawPrey,
    pal,
    spine: [],
    probeOut: { x: 0, l: 0, r: 0 },
    bake: null,
    deep: null,
    open: 0,
    revealY: surfaceY,
    tearing: false,
    revealJag: [],
    time: 0,
    prey: { x: cfg.x, y: surfaceY, scale: 1, squash: 0 },
    dragging: false,
    crumbIn: 0,
    crumbs: [],
    dark: 0,
    trail: TRAIL_STRANDS.map(newStrandPath),
    pullers: PULL_STRANDS.map(newStrandPath),
    back: PolyBatch.create(),
    front: PolyBatch.create(),
    colors: {
      contour: getRGB(k, pal.contour),
      puller: getRGB(k, pal.puller),
      pullerLight: getRGB(k, pal.pullerLight),
      vine: getRGB(k, flowerPal.vine),
      leaf: getRGB(k, flowerPal.leaf),
      leafLight: getRGB(k, flowerPal.leafLight),
      stem: getRGB(k, flowerPal.stem),
      stemLight: getRGB(k, flowerPal.stemLight),
      crumbs: [pal.crumb, pal.wallStrata[0], pal.stone, pal.clod].map(hex => getRGB(k, hex)),
      darkness: getRGB(k, pal.darkness)
    },
    berryColors: glowEyeBerryColors(k)
  }
  const rng = createSeededRandom(cfg.seed)
  buildSpine(inst, rng)
  inst.revealJag = Array.from({ length: REVEAL_COLUMNS }, () => rng() * REVEAL_JAG_PX)
  inst.bake = bakeTunnel(inst, rng)
  k.add([
    k.z(TUNNEL_Z),
    {
      draw() {
        onDraw(inst)
      }
    }
  ])
  k.add([
    k.z(DARK_Z),
    {
      draw() {
        drawDarkness(inst)
      }
    }
  ])
  return inst
}

/**
 * Splits the crack open (0 closed … 1 open). Fully open, the roots start
 * tearing the cut downward. The deep earth under the playfield is baked on
 * the first call, once the camera has settled on the island.
 * @param {Object} inst - Root-tunnel inst
 * @param {number} u - Opening progress
 */
export function setOpen(inst, u) {
  inst.deep === null && (inst.deep = bakeDeepEarth(inst, createSeededRandom(inst.seed + DEEP_GRAIN_SEED)))
  inst.open = Math.max(inst.open, Math.min(1, u))
  inst.revealY = Math.max(inst.revealY, inst.groundY + MOUTH_REVEAL * inst.open)
  inst.open >= 1 && (inst.tearing = true)
}

/**
 * Where the coils grip the hero this frame.
 * @param {Object} inst - Root-tunnel inst
 * @param {number} x - Sprite centre X
 * @param {number} y - Sprite centre Y
 * @param {number} scale - Hero scale
 * @param {number} squash - Horizontal squash (0..1)
 */
export function setPrey(inst, x, y, scale, squash) {
  const prey = inst.prey
  prey.x = x
  prey.y = y
  prey.scale = scale
  prey.squash = squash
}

/**
 * Crumbs rain off the walls while he is dragged down.
 * @param {Object} inst - Root-tunnel inst
 * @param {boolean} on
 */
export function setDragging(inst, on) {
  inst.dragging = on
}

/**
 * Underground darkness over the whole level (0..1, under the HUD).
 * @param {Object} inst - Root-tunnel inst
 * @param {number} v
 */
export function setDarkness(inst, v) {
  inst.dark = Math.max(0, Math.min(1, v))
}

/**
 * Cut centre X at a world Y (follows the winding spine).
 * @param {Object} inst - Root-tunnel inst
 * @param {number} y - World Y
 * @returns {number}
 */
export function spineX(inst, y) {
  return probe(inst, y).x
}

/**
 * Half the cavity width at a world Y.
 * @param {Object} inst - Root-tunnel inst
 * @param {number} y - World Y
 * @returns {number}
 */
export function halfWidth(inst, y) {
  const p = probe(inst, y)
  return (p.r - p.l) * 0.5
}

/**
 * Advances the tearing front, strand sway and loose crumbs.
 * @param {Object} inst - Root-tunnel inst
 * @param {number} dt - Frame time in seconds
 */
export function onUpdate(inst, dt) {
  inst.time += dt
  inst.tearing && (inst.revealY = Math.min(inst.bottomY, inst.revealY + TEAR_SPEED * dt))
  updateCrumbs(inst, dt)
}

//
// Strand point arrays are allocated once and refilled every frame.
//
function newStrandPath(spec) {
  return {
    spec,
    pts: Array.from({ length: STRAND_POINTS }, () => ({ x: 0, y: 0 }))
  }
}
//
// One sample per SPINE_STEP: centre, cavity edges (l, r) and outer soil
// edges (ol, or), each wall drifting on its own noise.
//
function buildSpine(inst, rng) {
  const length = inst.bottomY - inst.topY + SPINE_STEP * 2
  const noise = {
    wig: makeNoise(rng, length, WIGGLE_NOISE_STEP),
    left: makeNoise(rng, length, EDGE_NOISE_STEP),
    right: makeNoise(rng, length, EDGE_NOISE_STEP),
    jagL: makeNoise(rng, length, EDGE_JAG_STEP),
    jagR: makeNoise(rng, length, EDGE_JAG_STEP),
    wallL: makeNoise(rng, length, WALL_NOISE_STEP),
    wallR: makeNoise(rng, length, WALL_NOISE_STEP),
    outL: makeNoise(rng, length, OUTER_JAG_STEP),
    outR: makeNoise(rng, length, OUTER_JAG_STEP)
  }
  const ledgeTop = inst.groundY + MOUTH_DEPTH
  const ledges = Array.from({ length: LEDGE_COUNT }, () => ({
    y: ledgeTop + rng() * (inst.bottomY - ledgeTop),
    side: rng() < 0.5 ? -1 : 1,
    depth: LEDGE_DEPTH_MIN + rng() * LEDGE_DEPTH_RANGE,
    len: LEDGE_LEN_MIN + rng() * LEDGE_LEN_RANGE
  }))
  const phase = rng() * TAU
  const depthSpan = Math.max(1, inst.bottomY - inst.groundY)
  const mouthSpan = inst.groundY + MOUTH_DEPTH - inst.topY
  for (let y = inst.topY; y <= inst.bottomY + SPINE_STEP; y += SPINE_STEP) {
    const d = y - inst.topY
    const t = clamp01((y - inst.groundY) / depthSpan)
    const mouth = clamp01(1 - d / mouthSpan)
    const mouth2 = mouth * mouth
    const wigIn = clamp01((y - inst.groundY) / WIGGLE_IN_PX)
    const wiggle = WIGGLE_AMP * Math.sin(y / WIGGLE_LEN + phase) + WIGGLE_NOISE_AMP * noiseAt(noise.wig, WIGGLE_NOISE_STEP, d)
    const x = inst.x + inst.leanDir * LEAN_PX * Math.pow(t, LEAN_POW) + wiggle * wigIn
    const hw = HW_TOP + (HW_BOTTOM - HW_TOP) * t
    const wall = WALL_TOP + (WALL_BOTTOM - WALL_TOP) * t
    const hwL = Math.max(HW_MIN, hw * (1 + EDGE_NOISE_AMP * noiseAt(noise.left, EDGE_NOISE_STEP, d)) +
      EDGE_JAG_PX * noiseAt(noise.jagL, EDGE_JAG_STEP, d) - ledgeBite(ledges, -1, y) + mouth2 * MOUTH_OPEN_PX)
    const hwR = Math.max(HW_MIN, hw * (1 + EDGE_NOISE_AMP * noiseAt(noise.right, EDGE_NOISE_STEP, d)) +
      EDGE_JAG_PX * noiseAt(noise.jagR, EDGE_JAG_STEP, d) - ledgeBite(ledges, 1, y) + mouth2 * MOUTH_OPEN_PX)
    const wallL = Math.max(WALL_MIN, wall * (1 + WALL_NOISE_AMP * noiseAt(noise.wallL, WALL_NOISE_STEP, d)) +
      OUTER_JAG_PX * noiseAt(noise.outL, OUTER_JAG_STEP, d)) + mouth2 * MOUTH_FLARE
    const wallR = Math.max(WALL_MIN, wall * (1 + WALL_NOISE_AMP * noiseAt(noise.wallR, WALL_NOISE_STEP, d)) +
      OUTER_JAG_PX * noiseAt(noise.outR, OUTER_JAG_STEP, d)) + mouth2 * MOUTH_FLARE
    inst.spine.push({ y, x, t, l: x - hwL, r: x + hwR, ol: x - hwL - wallL, or: x + hwR + wallR })
  }
}
function ledgeBite(ledges, side, y) {
  let bite = 0
  ledges.forEach(ledge => {
    if (ledge.side !== side) return
    const u = (y - ledge.y) / ledge.len
    if (u <= -1 || u >= 1) return
    bite = Math.max(bite, ledge.depth * (1 - u * u))
  })
  return bite
}
//
// Interpolated spine sample at a world Y (shared output object).
//
function probe(inst, y) {
  const spine = inst.spine
  const f = Math.max(0, Math.min(spine.length - 1, (y - inst.topY) / SPINE_STEP))
  const i = Math.min(spine.length - 2, Math.floor(f))
  const u = f - i
  const a = spine[i]
  const b = spine[i + 1]
  const out = inst.probeOut
  out.x = a.x + (b.x - a.x) * u
  out.l = a.l + (b.l - a.l) * u
  out.r = a.r + (b.r - a.r) * u
  return out
}
function makeNoise(rng, length, step) {
  return Array.from({ length: Math.ceil(length / step) + 2 }, () => rng() * 2 - 1)
}
function noiseAt(knots, step, d) {
  const f = Math.max(0, d / step)
  const i = Math.min(knots.length - 2, Math.floor(f))
  const u = f - i
  const s = u * u * (3 - 2 * u)
  return knots[i] + (knots[i + 1] - knots[i]) * s
}
function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

//
// Bake: soil walls, cavity, torn root ends, then the lip debris on top,
// all cut along the turf line; film grain once.
//
function bakeTunnel(inst, rng) {
  const box = tunnelBox(inst)
  const canvas = toCanvas({ width: box.w, height: box.h }, ctx => paintTunnel(inst, ctx, rng, box))
  applyGlowFilmGrainToCanvas(canvas, inst.seed)
  const name = `glow-root-tunnel-${inst.seed}`
  inst.k.loadSprite(name, canvas)
  return { name, ox: box.x1, oy: box.y1, w: box.w, h: box.h }
}
function tunnelBox(inst) {
  let x1 = Infinity
  let x2 = -Infinity
  inst.spine.forEach(s => {
    x1 = Math.min(x1, s.ol)
    x2 = Math.max(x2, s.or)
  })
  const left = Math.floor(x1 - BAKE_PAD)
  const top = Math.floor(inst.surfaceY - CLOD_HEADROOM)
  const right = Math.ceil(x2 + BAKE_PAD)
  const bottom = Math.ceil(inst.bottomY)
  return { x1: left, y1: top, x2: right, y2: bottom, w: right - left, h: bottom - top }
}
function paintTunnel(inst, ctx, rng, box) {
  ctx.translate(-box.x1, -box.y1)
  ctx.save()
  traceBelowSurface(inst, ctx, box)
  ctx.clip()
  paintWall(inst, ctx, rng, box)
  paintCavity(inst, ctx, rng, box)
  paintEdgeStones(inst, ctx, rng)
  paintHangingRoots(inst, ctx, rng)
  ctx.restore()
  paintLip(inst, ctx, rng)
}
//
// Clip region: everything below the turf line, so the cut follows the
// mound's slope instead of ending in a straight lid.
//
function traceBelowSurface(inst, ctx, box) {
  ctx.beginPath()
  ctx.moveTo(box.x1, box.y2)
  for (let x = box.x1; x <= box.x2 + SURFACE_SAMPLE_STEP; x += SURFACE_SAMPLE_STEP) {
    ctx.lineTo(x, inst.surfaceAt(inst.surfaceTarget, x) + SURFACE_CUT_PX)
  }
  ctx.lineTo(box.x2, box.y2)
  ctx.closePath()
}
function tracePath(ctx, spine, leftKey, rightKey) {
  ctx.beginPath()
  spine.forEach((s, i) => i ? ctx.lineTo(s[leftKey], s.y) : ctx.moveTo(s[leftKey], s.y))
  for (let i = spine.length - 1; i >= 0; i--) ctx.lineTo(spine[i][rightKey], spine[i].y)
  ctx.closePath()
}
//
// Open soil cut: base fill, uneven strata, specks, stones, thin roots and
// the torn turf strip at the top, all inside the outer wall outline; a
// faint dark edge where the cut meets the untouched earth.
//
function paintWall(inst, ctx, rng, box) {
  const pal = inst.pal
  ctx.save()
  tracePath(ctx, inst.spine, 'ol', 'or')
  ctx.clip()
  ctx.fillStyle = pal.wall
  ctx.fillRect(box.x1, box.y1, box.w, box.h)
  paintStrata(ctx, rng, box, inst.surfaceY + TURF_H, inst.x, pal.wallStrata)
  paintFlecks(ctx, rng, box, inst.surfaceY, pal.wallStrata)
  paintWallStones(inst, ctx, rng)
  paintWallRoots(inst, ctx, rng)
  paintTurf(inst, ctx, box)
  ctx.restore()
  ctx.globalAlpha = OUTER_EDGE_ALPHA
  ctx.strokeStyle = pal.contour
  ctx.lineWidth = OUTER_EDGE_W
  strokeEdge(ctx, inst.spine, 'ol')
  strokeEdge(ctx, inst.spine, 'or')
  ctx.globalAlpha = 1
}
function paintStrata(ctx, rng, box, startY, pivotX, colors) {
  ctx.globalAlpha = STRATA_ALPHA
  let y = startY
  while (y < box.y2) {
    const h = STRATA_H_MIN + rng() * STRATA_H_RANGE
    const phase = rng() * TAU
    const tilt = (rng() * 2 - 1) * STRATA_TILT
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)]
    ctx.beginPath()
    for (let x = box.x1; x <= box.x2 + STRATA_STEP; x += STRATA_STEP) {
      ctx.lineTo(x, y + Math.sin(x * STRATA_FREQ + phase) * STRATA_WAVE + (x - pivotX) * tilt)
    }
    for (let x = box.x2 + STRATA_STEP; x >= box.x1; x -= STRATA_STEP) {
      ctx.lineTo(x, y + h + Math.sin(x * STRATA_FREQ + phase + STRATA_SEAM_PHASE) * STRATA_WAVE + (x - pivotX) * tilt)
    }
    ctx.closePath()
    ctx.fill()
    y += h + STRATA_GAP_MIN + rng() * STRATA_GAP_RANGE
  }
  ctx.globalAlpha = 1
}
function paintFlecks(ctx, rng, box, topY, colors) {
  const count = Math.floor(box.w * (box.y2 - topY) / FLECK_AREA)
  ctx.globalAlpha = FLECK_ALPHA
  for (let i = 0; i < count; i++) {
    const size = FLECK_SIZE_MIN + rng() * FLECK_SIZE_RANGE
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)]
    ctx.fillRect(box.x1 + rng() * box.w, topY + rng() * (box.y2 - topY), size, size)
  }
  ctx.globalAlpha = 1
}
//
// Stones sit in the wall band on either side, never in the open cavity.
//
function paintWallStones(inst, ctx, rng) {
  const pal = inst.pal
  const fills = [pal.stone, pal.stoneWarm, pal.stoneDark]
  const count = Math.floor((inst.bottomY - inst.groundY) / WALL_STONE_GAP)
  for (let i = 0; i < count; i++) {
    const y = inst.groundY + rng() * (inst.bottomY - inst.groundY)
    const s = sampleAt(inst, y)
    const left = rng() < 0.5
    const x = left ? s.l - rng() * (s.l - s.ol) : s.r + rng() * (s.or - s.r)
    const r = WALL_STONE_R_MIN + rng() * WALL_STONE_R_RANGE
    paintStone(ctx, rng, x, y, r, fills[Math.floor(rng() * fills.length)], pal.stoneLight, pal.contour)
  }
}
function paintStone(ctx, rng, x, y, r, fill, light, contour) {
  const sides = STONE_SIDES_MIN + Math.floor(rng() * STONE_SIDES_RANGE)
  const rot = rng() * TAU
  const pts = Array.from({ length: sides }, (_, i) => {
    const a = rot + (i / sides) * TAU
    const rr = r * (STONE_JIT_MIN + rng() * STONE_JIT_RANGE)
    return [x + Math.cos(a) * rr, y + Math.sin(a) * rr * STONE_FLAT]
  })
  fillPoly(ctx, pts, fill)
  const lx = x + r * STONE_LIGHT_DX
  const ly = y + r * STONE_LIGHT_DY
  fillPoly(ctx, pts.map(([px, py]) => [lx + (px - x) * STONE_LIGHT_SCALE, ly + (py - y) * STONE_LIGHT_SCALE]), light)
  strokePoly(ctx, pts, contour, STONE_CONTOUR_W)
}
function fillPoly(ctx, pts, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))
  ctx.closePath()
  ctx.fill()
}
function strokePoly(ctx, pts, color, width) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineJoin = 'round'
  ctx.beginPath()
  pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))
  ctx.closePath()
  ctx.stroke()
}
//
// Thin roots grow out of the cavity edge into the soil, some forking.
//
function paintWallRoots(inst, ctx, rng) {
  const count = Math.floor((inst.bottomY - inst.groundY) / WALL_ROOT_GAP)
  ctx.globalAlpha = ROOT_ALPHA
  for (let i = 0; i < count; i++) {
    const y = inst.groundY + rng() * (inst.bottomY - inst.groundY)
    const s = sampleAt(inst, y)
    const side = rng() < 0.5 ? -1 : 1
    const angle = (side < 0 ? Math.PI : 0) + (rng() * 2 - 1) * ROOT_ANGLE_RANGE
    paintRootLine(ctx, rng, side < 0 ? s.l : s.r, y, angle, ROOT_W, inst.pal.root, true)
  }
  ctx.globalAlpha = 1
}
function paintRootLine(ctx, rng, x, y, angle, width, color, canBranch) {
  const segments = ROOT_SEGMENTS_MIN + Math.floor(rng() * ROOT_SEGMENTS_RANGE)
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  let a = angle
  for (let i = 0; i < segments; i++) {
    const len = ROOT_SEG_MIN + rng() * ROOT_SEG_RANGE
    const nx = x + Math.cos(a) * len
    const ny = y + Math.sin(a) * len
    ctx.lineWidth = width * (1 - (1 - ROOT_TIP_FRAC) * (i / segments))
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(nx, ny)
    ctx.stroke()
    canBranch && i === 1 && rng() < ROOT_BRANCH_CHANCE &&
      paintRootLine(ctx, rng, nx, ny, a + (rng() < 0.5 ? -1 : 1) * ROOT_ANGLE_RANGE, width * ROOT_TIP_FRAC, color, false)
    x = nx
    y = ny
    a += (rng() * 2 - 1) * ROOT_BEND
  }
}
//
// Torn turf: a moss strip with a lit top edge along the mound line.
//
function paintTurf(inst, ctx, box) {
  const pal = inst.pal
  for (let x = box.x1; x < box.x2; x += SURFACE_SAMPLE_STEP) {
    const top = inst.surfaceAt(inst.surfaceTarget, x)
    ctx.fillStyle = pal.turf
    ctx.fillRect(x, top, SURFACE_SAMPLE_STEP, TURF_H)
    ctx.fillStyle = pal.turfLight
    ctx.fillRect(x, top, SURFACE_SAMPLE_STEP, TURF_LIGHT_H)
  }
}
//
// Cavity: dark earth interior, warm spill under the crack, stepped
// darkness with depth, root scrapes; dark torn edge and warm rim light.
//
function paintCavity(inst, ctx, rng, box) {
  const pal = inst.pal
  ctx.save()
  tracePath(ctx, inst.spine, 'l', 'r')
  ctx.clip()
  ctx.fillStyle = pal.cavity
  ctx.fillRect(box.x1, box.y1, box.w, box.h)
  paintGouges(inst, ctx, rng)
  ctx.fillStyle = pal.cavityGlow
  for (let i = 0; i < CAVITY_GLOW_BANDS; i++) {
    ctx.globalAlpha = CAVITY_GLOW_ALPHA * (1 - i / CAVITY_GLOW_BANDS)
    ctx.fillRect(box.x1, inst.surfaceY + i * CAVITY_GLOW_BAND_H, box.w, CAVITY_GLOW_BAND_H)
  }
  ctx.fillStyle = pal.cavityDeep
  for (let y = inst.groundY; y < box.y2; y += CAVITY_BAND_H) {
    const u = clamp01((y - inst.groundY) / CAVITY_DARK_PX)
    ctx.globalAlpha = CAVITY_DARK_MIN + (CAVITY_DARK_MAX - CAVITY_DARK_MIN) * u * u * (3 - 2 * u)
    ctx.fillRect(box.x1, y, box.w, CAVITY_BAND_H)
  }
  ctx.globalAlpha = 1
  ctx.restore()
  paintCavityEdges(inst, ctx)
}
function paintGouges(inst, ctx, rng) {
  const pal = inst.pal
  const count = Math.floor((inst.bottomY - inst.groundY) / GOUGE_GAP)
  ctx.lineCap = 'round'
  ctx.lineWidth = GOUGE_W
  for (let i = 0; i < count; i++) {
    const y = inst.groundY + rng() * (inst.bottomY - inst.groundY)
    const s = sampleAt(inst, y)
    const x = s.l + rng() * (s.r - s.l)
    const len = GOUGE_LEN_MIN + rng() * GOUGE_LEN_RANGE
    const endX = x + spineX(inst, y + len) - s.x
    ctx.globalAlpha = GOUGE_ALPHA
    ctx.strokeStyle = pal.cavityDeep
    strokeLine(ctx, x + GOUGE_SHADOW_DX, y, endX + GOUGE_SHADOW_DX, y + len)
    ctx.strokeStyle = pal.gouge
    strokeLine(ctx, x, y, endX, y + len)
  }
  ctx.globalAlpha = 1
}
function strokeLine(ctx, x1, y1, x2, y2) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}
//
// Dark torn edge on both walls; daylight catches the far (right) wall more,
// fading with depth, with a hot rim right under the opening.
//
function paintCavityEdges(inst, ctx) {
  const pal = inst.pal
  const spine = inst.spine
  ctx.lineCap = 'round'
  ctx.globalAlpha = EDGE_CONTOUR_ALPHA
  ctx.strokeStyle = pal.contour
  ctx.lineWidth = EDGE_CONTOUR_W
  strokeEdge(ctx, spine, 'l')
  strokeEdge(ctx, spine, 'r')
  for (let i = 1; i < spine.length; i++) {
    const a = spine[i - 1]
    const b = spine[i]
    const depth = b.y - inst.surfaceY
    if (depth > RIM_LIGHT_PX) break
    const fade = 1 - depth / RIM_LIGHT_PX
    const hot = depth < RIM_HOT_PX
    ctx.strokeStyle = pal.wallLight
    ctx.lineWidth = RIM_LIGHT_W
    ctx.globalAlpha = RIM_LIGHT_ALPHA * fade
    strokeLine(ctx, a.r - 1, a.y, b.r - 1, b.y)
    ctx.globalAlpha = RIM_LIGHT_ALPHA * fade * RIM_LIGHT_LEFT
    strokeLine(ctx, a.l + 1, a.y, b.l + 1, b.y)
    if (!hot) continue
    ctx.strokeStyle = pal.wallRim
    ctx.lineWidth = RIM_HOT_W
    ctx.globalAlpha = RIM_LIGHT_ALPHA * (1 - depth / RIM_HOT_PX)
    strokeLine(ctx, a.r - 1, a.y, b.r - 1, b.y)
  }
  ctx.globalAlpha = 1
}
function strokeEdge(ctx, spine, key) {
  ctx.beginPath()
  spine.forEach((s, i) => i ? ctx.lineTo(s[key], s.y) : ctx.moveTo(s[key], s.y))
  ctx.stroke()
}
//
// Stones half torn out of the wall, sticking into the cavity.
//
function paintEdgeStones(inst, ctx, rng) {
  const pal = inst.pal
  const count = Math.floor((inst.bottomY - inst.groundY) / EDGE_STONE_GAP)
  for (let i = 0; i < count; i++) {
    const y = inst.groundY + MOUTH_DEPTH + rng() * (inst.bottomY - inst.groundY - MOUTH_DEPTH)
    const s = sampleAt(inst, y)
    const x = rng() < 0.5 ? s.l : s.r
    const r = EDGE_STONE_R_MIN + rng() * EDGE_STONE_R_RANGE
    paintStone(ctx, rng, x, y, r, rng() < 0.5 ? pal.stone : pal.stoneWarm, pal.stoneLight, pal.contour)
  }
}
//
// Snapped root ends drooping from both walls into the cavity.
//
function paintHangingRoots(inst, ctx, rng) {
  const pal = inst.pal
  const count = Math.floor((inst.bottomY - inst.groundY) / HANG_ROOT_GAP)
  ctx.lineCap = 'round'
  for (let i = 0; i < count; i++) {
    const y = inst.surfaceY + TURF_H + rng() * (inst.bottomY - inst.surfaceY)
    const s = sampleAt(inst, y)
    const side = rng() < 0.5 ? -1 : 1
    const x = side < 0 ? s.l : s.r
    const len = HANG_ROOT_LEN_MIN + rng() * HANG_ROOT_LEN_RANGE
    const midX = x - side * len * 0.5
    const endX = x - side * len * 0.6
    const endY = y + len * HANG_ROOT_DROOP
    ctx.strokeStyle = pal.contour
    ctx.lineWidth = HANG_ROOT_W + STONE_CONTOUR_W
    strokeCurve(ctx, x, y, midX, y, endX, endY)
    ctx.strokeStyle = pal.rootDark
    ctx.lineWidth = HANG_ROOT_W
    strokeCurve(ctx, x, y, midX, y, endX, endY)
  }
}
function strokeCurve(ctx, x1, y1, cx, cy, x2, y2) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.quadraticCurveTo(cx, cy, x2, y2)
  ctx.stroke()
}
//
// Torn lip above the turf line: chipped clods tilted away from the crack,
// a few hanging into it, pebbles and crumbs.
//
function paintLip(inst, ctx, rng) {
  const pal = inst.pal
  const top = sampleAt(inst, inst.surfaceY)
  for (let side = -1; side <= 1; side += 2) {
    const edge = side < 0 ? top.l : top.r
    const reach = side < 0 ? top.l - top.ol : top.or - top.r
    for (let i = 0; i < CLODS_PER_SIDE; i++) {
      const x = edge + side * rng() * reach
      const y = inst.surfaceAt(inst.surfaceTarget, x) - rng() * CLOD_LIFT
      paintClod(inst, ctx, rng, x, y, side * (CLOD_TILT_MIN + rng() * CLOD_TILT_RANGE))
    }
  }
  for (let i = 0; i < INNER_CLODS; i++) {
    const y = inst.surfaceY + TURF_H + rng() * INNER_CLOD_DEPTH
    const s = sampleAt(inst, y)
    const side = rng() < 0.5 ? -1 : 1
    paintClod(inst, ctx, rng, side < 0 ? s.l : s.r, y, -side * CLOD_TILT_MIN)
  }
  const span = top.or - top.ol
  for (let i = 0; i < PEBBLE_COUNT; i++) {
    const x = top.ol + rng() * span
    const y = inst.surfaceAt(inst.surfaceTarget, x) - rng() * PEBBLE_LIFT
    const fill = rng() < 0.5 ? pal.stone : pal.stoneLight
    paintStone(ctx, rng, x, y, PEBBLE_R_MIN + rng() * PEBBLE_R_RANGE, fill, pal.stoneLight, pal.contour)
  }
  for (let i = 0; i < LIP_CRUMBS; i++) {
    const x = top.ol + rng() * span
    const y = inst.surfaceAt(inst.surfaceTarget, x) - rng() * LIP_CRUMB_SPREAD
    const size = FLECK_SIZE_MIN + rng() * FLECK_SIZE_RANGE
    ctx.fillStyle = rng() < 0.5 ? pal.clod : pal.wall
    ctx.fillRect(x, y, size, size)
  }
}
function paintClod(inst, ctx, rng, x, y, tilt) {
  const pal = inst.pal
  const w = CLOD_W_MIN + rng() * CLOD_W_RANGE
  const h = CLOD_H_MIN + rng() * CLOD_H_RANGE
  const cos = Math.cos(tilt)
  const sin = Math.sin(tilt)
  const pts = Array.from({ length: CLOD_SIDES }, (_, i) => {
    const a = (i / CLOD_SIDES) * TAU
    const jit = STONE_JIT_MIN + rng() * STONE_JIT_RANGE
    const lx = Math.cos(a) * w * 0.5 * jit
    const ly = Math.sin(a) * h * 0.5 * jit
    return [x + lx * cos - ly * sin, y + lx * sin + ly * cos]
  })
  fillPoly(ctx, pts, rng() < 0.5 ? pal.clod : pal.wall)
  if (rng() < CLOD_TURF_CHANCE) {
    const capY = -h * 0.5 + h * CLOD_TURF_FRAC
    fillPoly(ctx, [
      [x + (-w * 0.5) * cos - (-h * 0.5) * sin, y + (-w * 0.5) * sin + (-h * 0.5) * cos],
      [x + (w * 0.5) * cos - (-h * 0.5) * sin, y + (w * 0.5) * sin + (-h * 0.5) * cos],
      [x + (w * 0.5) * cos - capY * sin, y + (w * 0.5) * sin + capY * cos],
      [x + (-w * 0.5) * cos - capY * sin, y + (-w * 0.5) * sin + capY * cos]
    ], pal.turf)
  }
  strokePoly(ctx, pts, pal.contour, STONE_CONTOUR_W)
}
//
// Raw spine sample nearest to a world Y (bake time only).
//
function sampleAt(inst, y) {
  const i = Math.max(0, Math.min(inst.spine.length - 1, Math.round((y - inst.topY) / SPINE_STEP)))
  return inst.spine[i]
}

//
// Earth below the playfield floor across the current view: same strata
// language as the cut, darker toward the bottom, film grain once.
//
function bakeDeepEarth(inst, rng) {
  const k = inst.k
  const x1 = Math.floor(k.camPos().x - k.width() * 0.5 - DEEP_MARGIN)
  const y1 = Math.floor(inst.earthBottomY)
  const w = Math.ceil(k.width() + DEEP_MARGIN * 2)
  const h = Math.ceil(inst.bottomY - y1)
  if (h <= 0) return false
  const box = { x1, y1, x2: x1 + w, y2: y1 + h, w, h }
  const canvas = toCanvas({ width: w, height: h }, ctx => paintDeepEarth(inst, ctx, rng, box))
  applyGlowFilmGrainToCanvas(canvas, DEEP_GRAIN_SEED + inst.seed)
  const name = `glow-root-tunnel-deep-${inst.seed}`
  k.loadSprite(name, canvas)
  return { name, ox: x1, oy: y1, w, h }
}
function paintDeepEarth(inst, ctx, rng, box) {
  const pal = inst.pal
  ctx.translate(-box.x1, -box.y1)
  ctx.fillStyle = pal.deepEarth
  ctx.fillRect(box.x1, box.y1, box.w, box.h)
  paintLenses(ctx, rng, box, pal.wallStrata)
  paintFlecks(ctx, rng, box, box.y1, pal.wallStrata)
  const stones = Math.floor(box.w / DEEP_STONE_SPACING)
  for (let i = 0; i < stones; i++) {
    const r = WALL_STONE_R_MIN + rng() * WALL_STONE_R_RANGE
    paintStone(ctx, rng, box.x1 + rng() * box.w, box.y1 + rng() * box.h, r, pal.stoneDark, pal.stone, pal.contour)
  }
  const roots = Math.floor(box.w / DEEP_ROOT_SPACING)
  ctx.globalAlpha = ROOT_ALPHA
  for (let i = 0; i < roots; i++) {
    paintRootLine(ctx, rng, box.x1 + rng() * box.w, box.y1 + rng() * box.h, rng() * TAU, ROOT_W, pal.rootDark, true)
  }
  ctx.fillStyle = pal.cavityDeep
  const bandH = box.h / DEEP_DARK_BANDS
  for (let i = 0; i < DEEP_DARK_BANDS; i++) {
    ctx.globalAlpha = DEEP_DARK_TOP + (DEEP_DARK_BOTTOM - DEEP_DARK_TOP) * (i / (DEEP_DARK_BANDS - 1))
    ctx.fillRect(box.x1, box.y1 + i * bandH, box.w, Math.ceil(bandH))
  }
  ctx.globalAlpha = 1
}
//
// Lens-shaped sediment patches: thickest in the middle, pinching out at
// both ends, slightly sagging, scattered at random depths.
//
function paintLenses(ctx, rng, box, colors) {
  const count = Math.floor(box.w * box.h / LENS_AREA)
  ctx.globalAlpha = LENS_ALPHA
  for (let i = 0; i < count; i++) {
    const w = LENS_W_MIN + rng() * LENS_W_RANGE
    const h = LENS_H_MIN + rng() * LENS_H_RANGE
    const x0 = box.x1 + rng() * box.w - w * 0.5
    const y0 = box.y1 + rng() * box.h
    const sag = (rng() * 2 - 1) * LENS_SAG
    const steps = Math.max(2, Math.ceil(w / LENS_STEP))
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)]
    ctx.beginPath()
    for (let s = 0; s <= steps; s++) {
      const u = s / steps
      const bulge = Math.sin(u * Math.PI)
      ctx.lineTo(x0 + w * u, y0 + sag * bulge - h * 0.5 * bulge)
    }
    for (let s = steps; s >= 0; s--) {
      const u = s / steps
      const bulge = Math.sin(u * Math.PI)
      ctx.lineTo(x0 + w * u, y0 + sag * bulge + h * 0.5 * bulge)
    }
    ctx.closePath()
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

//
// Draw order: deep earth, the cut, back strands and coil halves, the hero,
// front coil halves with trailing strands and berries.
//
function onDraw(inst) {
  if (inst.open <= 0) return
  drawDeepEarth(inst)
  drawCut(inst)
  queueBack(inst)
  PolyBatch.flush(inst.back, inst.k)
  inst.drawPrey?.()
  queueFront(inst)
  PolyBatch.flush(inst.front, inst.k)
}
function drawDeepEarth(inst) {
  const deep = inst.deep
  const k = inst.k
  if (!deep || k.camPos().y + k.height() * 0.5 <= inst.earthBottomY) return
  k.drawSprite({ sprite: deep.name, pos: k.vec2(deep.ox, deep.oy), width: deep.w, height: deep.h })
}
//
// The cut in vertical slices, each revealed to a slightly different depth
// so the tearing front stays ragged; the crack splits open sideways first.
//
function drawCut(inst) {
  const k = inst.k
  const bake = inst.bake
  const ease = 1 - (1 - inst.open) * (1 - inst.open)
  const sx = OPEN_SCALE_MIN + (1 - OPEN_SCALE_MIN) * ease
  const left = inst.x - (inst.x - bake.ox) * sx
  const colW = bake.w / REVEAL_COLUMNS
  for (let i = 0; i < REVEAL_COLUMNS; i++) {
    const h = Math.min(bake.h, inst.revealY - inst.revealJag[i] - bake.oy)
    if (h <= 0) continue
    k.drawSprite({
      sprite: bake.name,
      pos: k.vec2(left + i * colW * sx, bake.oy),
      width: colW * sx,
      height: h,
      quad: { x: i / REVEAL_COLUMNS, y: 0, w: 1 / REVEAL_COLUMNS, h: h / bake.h }
    })
  }
}
function queueBack(inst) {
  const batch = inst.back
  const c = inst.colors
  inst.pullers.forEach(strand => queuePuller(inst, strand))
  inst.crumbs.forEach(crumb => PolyBatch.addDisc(batch, crumb.x, crumb.y, crumb.r, crumb.color))
  COILS.forEach(coil => queueCoilHalf(inst, batch, coil, false, c))
}
function queueFront(inst) {
  const c = inst.colors
  COILS.forEach(coil => queueCoilHalf(inst, inst.front, coil, true, c))
  inst.trail.forEach(strand => queueTrail(inst, strand))
}
//
// Path from (x0, y0) to (x1, y1) that bends with the cut, swings with time
// and hugs one wall: along an arc (trailing strands) or more and more
// toward the end (roots reaching down to the front).
//
function fillStrandPath(inst, strand, x0, y0, x1, y1, side, hug, ramp) {
  const spec = strand.spec
  const c0 = spineX(inst, y0)
  const c1 = spineX(inst, y1)
  const last = strand.pts.length - 1
  strand.pts.forEach((p, i) => {
    const u = i / last
    const y = y0 + (y1 - y0) * u
    const bend = spineX(inst, y) - (c0 + (c1 - c0) * u)
    const weight = ramp ? Math.min(1, u * HUG_RAMP_GAIN) : Math.sin(u * Math.PI)
    const swayIn = ramp ? PULL_SWAY_BASE + (1 - PULL_SWAY_BASE) * u : Math.sin(u * Math.PI)
    const sway = spec.sway * Math.sin(inst.time * SWAY_SPEED + spec.phase + u * SWAY_WAVE * (ramp ? PULL_WAVE_MULT : 1)) * swayIn
    p.x = x0 + (x1 - x0) * u + bend + side * hug * halfWidth(inst, y) * weight + sway
    p.y = y
  })
}
//
// Living root: from the coils down along a wall to the tearing front.
//
function queuePuller(inst, strand) {
  const spec = strand.spec
  const prey = inst.prey
  const x0 = prey.x + spec.dx * prey.scale
  const y0 = prey.y + spec.dy * prey.scale
  const y1 = Math.min(inst.revealY - PULL_TIP_BACK, y0 + spec.reach)
  if (y1 <= y0) return
  fillStrandPath(inst, strand, x0, y0, spineX(inst, y1), y1, spec.side, spec.hug, true)
  queueRootlets(inst.back, strand.pts, spec.side, inst.colors)
  queueStrandBody(inst.back, strand.pts, spec.w, inst.colors.puller, inst.colors.pullerLight, inst.colors.contour)
}
//
// Short side rootlets clawing into the wall the root runs along.
//
function queueRootlets(batch, pts, side, c) {
  for (let i = ROOTLET_EVERY; i < pts.length - 1; i += ROOTLET_EVERY) {
    const p = pts[i]
    const flip = (i / ROOTLET_EVERY) % 2 ? side : -side
    const ex = p.x + flip * ROOTLET_LEN
    const ey = p.y + ROOTLET_DROP
    PolyBatch.addLine(batch, p.x, p.y, ex, ey, ROOTLET_W + STRAND_CONTOUR_W * 2, c.contour)
    PolyBatch.addLine(batch, p.x, p.y, ex, ey, ROOTLET_W, c.puller)
  }
}
//
// Flower strand trailing from the opening to the hero: leafy vine or the
// red stalk with eye-berries watching him.
//
function queueTrail(inst, strand) {
  const spec = strand.spec
  const prey = inst.prey
  const c = inst.colors
  const y0 = inst.surfaceY + TURF_H
  const x0 = spineX(inst, y0) + spec.from * halfWidth(inst, y0)
  const x1 = prey.x + spec.dx * prey.scale
  const y1 = prey.y + spec.dy * prey.scale
  fillStrandPath(inst, strand, x0, y0, x1, y1, Math.sign(spec.from), Math.abs(spec.from), false)
  const vine = spec.kind === 'vine'
  queueStrandBody(inst.front, strand.pts, spec.w, vine ? c.vine : c.stem, vine ? c.leafLight : c.stemLight, c.contour)
  vine ? queueLeaves(inst, strand.pts) : queueBerries(inst, strand.pts)
}
function queueStrandBody(batch, pts, w, fill, light, contour) {
  addTaperedPass(batch, pts, w + STRAND_CONTOUR_W * 2, STRAND_TIP_W + STRAND_CONTOUR_W * 2, contour)
  addTaperedPass(batch, pts, w, STRAND_TIP_W, fill)
  addTaperedPass(batch, pts, w * STRAND_LIGHT_FRAC, STRAND_TIP_W * STRAND_LIGHT_FRAC, light)
}
function queueLeaves(inst, pts) {
  const batch = inst.front
  const c = inst.colors
  for (let i = LEAF_EVERY; i < pts.length - 1; i += LEAF_EVERY) {
    const p = pts[i]
    const q = pts[i + 1]
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1
    const flip = (i / LEAF_EVERY) % 2 ? 1 : -1
    const nx = (-(q.y - p.y) / len) * flip
    const ny = ((q.x - p.x) / len) * flip
    LEAF_RADII.forEach((r, j) => PolyBatch.addDisc(batch, p.x + nx * LEAF_STEP * (j + 1), p.y + ny * LEAF_STEP * (j + 1), r + LEAF_CONTOUR, c.contour))
    LEAF_RADII.forEach((r, j) => PolyBatch.addDisc(batch, p.x + nx * LEAF_STEP * (j + 1), p.y + ny * LEAF_STEP * (j + 1), r, j ? c.leaf : c.leafLight))
  }
}
function queueBerries(inst, pts) {
  const batch = inst.front
  const c = inst.colors
  const prey = inst.prey
  BERRY_SPOTS.forEach((spot, j) => {
    const i = Math.round(spot * (pts.length - 1))
    const p = pts[i]
    const q = pts[Math.min(pts.length - 1, i + 1)]
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1
    const flip = j % 2 ? 1 : -1
    const bx = p.x + (-(q.y - p.y) / len) * flip * BERRY_STEM_PX
    const by = p.y + ((q.x - p.x) / len) * flip * BERRY_STEM_PX
    const r = BERRY_R_MIN + BERRY_R_RANGE * ((j * 7) % 3) / 2
    const lookX = prey.x - bx
    const lookY = prey.y - by
    const look = Math.hypot(lookX, lookY) || 1
    PolyBatch.addLine(batch, p.x, p.y, bx, by, BERRY_STEM_W + STRAND_CONTOUR_W * 2, c.contour)
    PolyBatch.addLine(batch, p.x, p.y, bx, by, BERRY_STEM_W, c.stem)
    addEyeBerry(
      batch,
      bx,
      by,
      r,
      bx + (lookX / look) * r * PUPIL_LOOK_FRAC,
      by + (lookY / look) * r * PUPIL_LOOK_FRAC,
      r * PUPIL_R_FRAC,
      inst.berryColors,
      BERRY_CONTOUR_W
    )
  })
}
//
// Coil band around the hero: the half behind him goes into the back batch,
// the half in front into the front batch; contour pass first.
//
function queueCoilHalf(inst, batch, coil, front, c) {
  const prey = inst.prey
  const cx = prey.x
  const cy = prey.y + coil.dy * prey.scale
  const rx = COIL_RX * prey.scale * (1 - prey.squash)
  const ry = COIL_RY * prey.scale
  const fill = coil.kind === 'vine' ? c.vine : c.puller
  const light = coil.kind === 'vine' ? c.leafLight : c.pullerLight
  const passes = [[COIL_W + STRAND_CONTOUR_W * 2, c.contour], [COIL_W, fill], [COIL_W * STRAND_LIGHT_FRAC, light]]
  passes.forEach(([w, color]) => {
    for (let i = 0; i < COIL_SEGMENTS; i++) {
      const a0 = (i / COIL_SEGMENTS) * TAU
      const a1 = ((i + 1) / COIL_SEGMENTS) * TAU
      if ((Math.sin((a0 + a1) * 0.5) > 0) !== front) continue
      const x0 = cx + Math.cos(a0) * rx
      const y0 = cy + Math.sin(a0) * ry + Math.cos(a0) * COIL_TILT
      const x1 = cx + Math.cos(a1) * rx
      const y1 = cy + Math.sin(a1) * ry + Math.cos(a1) * COIL_TILT
      PolyBatch.addLine(batch, x0, y0, x1, y1, w, color)
      PolyBatch.addDisc(batch, x1, y1, w * 0.5, color)
    }
  })
}
//
// Loose crumbs: spawned at the walls beside the hero while dragged, fall
// under gravity and expire.
//
function updateCrumbs(inst, dt) {
  const crumbs = inst.crumbs
  for (let i = crumbs.length - 1; i >= 0; i--) {
    const crumb = crumbs[i]
    crumb.life -= dt
    crumb.vy += CRUMB_GRAVITY * dt
    crumb.x += crumb.vx * dt
    crumb.y += crumb.vy * dt
    crumb.life <= 0 && crumbs.splice(i, 1)
  }
  if (!inst.dragging) return
  inst.crumbIn -= dt
  if (inst.crumbIn > 0 || crumbs.length >= CRUMB_MAX) return
  inst.crumbIn = CRUMB_GAP
  const y = inst.prey.y + (Math.random() * 2 - 1) * CRUMB_SPREAD_Y
  const p = probe(inst, y)
  const side = Math.random() < 0.5 ? -1 : 1
  const colors = inst.colors.crumbs
  crumbs.push({
    x: side < 0 ? p.l : p.r,
    y,
    vx: -side * Math.random() * CRUMB_VX,
    vy: 0,
    r: CRUMB_R_MIN + Math.random() * CRUMB_R_RANGE,
    life: CRUMB_LIFE,
    color: colors[Math.floor(Math.random() * colors.length)]
  })
}
function drawDarkness(inst) {
  if (inst.dark <= 0) return
  const k = inst.k
  const bandH = Math.ceil(k.height() / DARK_BANDS)
  for (let i = 0; i < DARK_BANDS; i++) {
    k.drawRect({
      pos: k.vec2(0, i * bandH),
      width: k.width(),
      height: bandH,
      color: inst.colors.darkness,
      opacity: inst.dark * (DARK_TOP_FRAC + (1 - DARK_TOP_FRAC) * i / (DARK_BANDS - 1)),
      fixed: true
    })
  }
}
