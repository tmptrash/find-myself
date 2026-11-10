import { CFG } from '../cfg.js'
import * as PolyBatch from './poly-batch.js'
import { parseHex } from './helper.js'
import * as HeroPicture from './hero-picture.js'
//
// The hero's running legs, drawn live under the leg-less run body
// (hero-picture.js): two short fat legs, each bent by two-bone IK from its
// hip on the body to a foot planted on the surface a downward ray finds
// under it. They look like the legs of the hero sheet: a dark contour, a
// fill that rounds from shaded sides to a light core, and faint fur streaks;
// the far leg is the sheet's grey one and goes behind the body and the near
// leg with its whole contour.
//
// Both legs grow out of the body like the legs of the sheet: their
// contours are drawn behind the body, so their sides carry the body's
// outline on down the legs, and their fills are drawn over the body from
// CONTOUR_COVER px above its bottom contour — hiding that dark line where a
// leg joins (between the legs it stays, as the crotch). Over each fill
// lies a veil of the body's own tone at the join (sampled from the bake,
// see sampleBodyTones) in the fill's shape, faded by height alone: from
// clear FADE_IN px above the fill's start to opaque at it, then clear again
// BLEND_DEPTH px below — so at any swing the body runs into the leg with no
// edge, and the leg's own shading and edges only come up below the join.
// The top flares out by up to FLARE px a side (a fillet curve), so the
// body's outline bends into the leg's outline instead of meeting it at a
// corner. The joined part is cut in level slices from the fill's start, so
// its top lies flat along the body's bottom at any swing. The near leg's contour
// is drawn again over the far leg's fill below the fillets, so the near leg
// stays ringed where they overlap without a line into the body. The near
// leg takes the body's own colour (sampled from its lit lower part, above
// the shaded bottom): NEAR_*_SHADE darken it for the leg's bands and
// streaks; the far leg's are the sheet's grey ones.
// FLARE_SLICES steps draw the fillet.
//
// The engine draws polygons without antialiasing, so the legs fake it like
// the baked body's soft edge: a HALO_W wider contour at HALO_OPACITY under
// the contour, and an EDGE band halfway between contour and fill colours
// just inside it.
//
// Sizes are hero sprite px: LEG_W wide inside a LEG_OUTLINE contour, two
// BONE_LEN bones (hip–knee–foot), the hip HIP_TUCK px up inside the body.
// The foot's round end sits on the surface.
//
const LEG_W = 8.6
const LEG_OUTLINE = 1.5
const LEG_MID_SHARE = 0.72
const LEG_CORE_SHARE = 0.4
const STREAK_W = 0.7
const STREAK_OFFSET_SHARE = 0.24
const BONE_LEN = 7.4
const HIP_TUCK = 4
const CONTOUR_COVER = 3
const FADE_IN = 3
const BLEND_DEPTH = 6
const FLARE = 3
const FLARE_LEN = 8
const FLARE_SLICES = 4
const NEAR_MID_SHADE = 0.97
const NEAR_SIDE_SHADE = 0.9
const NEAR_STREAK_SHADE = 0.94
const TONE_SAMPLE_HALF_W = 2
const TONE_SAMPLE_ROW = CONTOUR_COVER + 1
const BODY_SAMPLE_HALF_W = 3
const BODY_SAMPLE_TOP = 12
const BODY_SAMPLE_BOTTOM = 8
const RGBA = 4
const HALO_W = 1.2
const HALO_OPACITY = 0.45
const EDGE_W = LEG_W + LEG_OUTLINE
const EDGE_MIX = 0.5
const CONTOUR_W = LEG_W + LEG_OUTLINE * 2
const FOOT_R = LEG_W / 2 + LEG_OUTLINE
const REACH = BONE_LEN * 2 - 0.01
const MIN_REACH = 2
//
// Gait, one cycle per RUN_CYCLE_SEC, the legs half a cycle apart: a foot
// plants STRIDE/2 ahead of its hip, slides back along the surface for the
// STANCE_SHARE of the cycle to STRIDE/2 behind it, then lifts up to LIFT
// and swings forward. The body dips BOB px each time a foot plants.
//
export const RUN_CYCLE_SEC = 0.2667
const STRIDE = 14
const LIFT = 5
const STANCE_SHARE = 0.5
const BOB = 1.5
//
// The body follows the surface under the planted feet: it sinks or rises
// by the mean height of their surfaces against the hitbox's ground line, up
// to SURFACE_SHIFT_MAX px, easing there at SURFACE_SHIFT_RATE per second.
// A ray looks RAY_DEPTH px down from the hip; with nothing under a foot it
// hangs at full reach.
//
const SURFACE_SHIFT_MAX = 6
const SURFACE_SHIFT_RATE = 14
export const RAY_DEPTH = REACH + FOOT_R + 24
const HALF = HeroPicture.FRAME_SIZE / 2
const LEG_COUNT = HeroPicture.RUN_HIP_POINTS.length
const FAR_LEG = 0
const NEAR_LEG = 1

/**
 * Creates one hero's running legs (pose state and draw batch).
 * @param {Object} k - Kaplay instance
 * @param {{join: Object, body: Object}|null} tones - Run body colours from sampleBodyTones()
 * @returns {Object} Legs inst
 */
export function create(k, tones) {
  return {
    k,
    batch: PolyBatch.create(),
    ...legColorSets(k, tones),
    legs: Array.from({ length: LEG_COUNT }, () => ({ hx: 0, hy: 0, kx: 0, ky: 0, fx: 0, fy: 0 })),
    bodyDy: 0,
    shift: 0,
    ground: [],
    lift: []
  }
}

/**
 * The run body's colours by the near leg, from the finished (graded) bake:
 * join — the mean of the body's row right above where the legs' fills start
 * (TONE_SAMPLE_ROW px up from the bottom contour; the veil takes it, so a
 * fill carries the body on without a step — the body darkens fast towards
 * its bottom outline); body — the mean of the body's lit lower part above
 * that shading (BODY_SAMPLE_TOP..BODY_SAMPLE_BOTTOM px up), the near leg's
 * own colour.
 * @param {HTMLCanvasElement} canvas - Run body bake, FRAME_SIZE square
 * @returns {{join: {r: number, g: number, b: number}, body: {r: number, g: number, b: number}}}
 */
export function sampleBodyTones(canvas) {
  const hip = HeroPicture.RUN_HIP_POINTS[NEAR_LEG]
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  return {
    join: meanColor(ctx, hip.x - TONE_SAMPLE_HALF_W, hip.y - TONE_SAMPLE_ROW, TONE_SAMPLE_HALF_W * 2 + 1, 1),
    body: meanColor(ctx, hip.x - BODY_SAMPLE_HALF_W, hip.y - BODY_SAMPLE_TOP, BODY_SAMPLE_HALF_W * 2 + 1, BODY_SAMPLE_TOP - BODY_SAMPLE_BOTTOM + 1)
  }
}

/**
 * Poses the legs for a running hero: feet on the surfaces under them, the
 * body bobbing and following those surfaces, knees solved by IK.
 * @param {Object} inst - Legs inst
 * @param {Object} cfg
 * @param {number} cfg.x - Hero centre X (world)
 * @param {number} cfg.y - Hero centre Y (world, hitbox position)
 * @param {number} cfg.facing - 1 right, -1 left
 * @param {number} cfg.phase - Gait phase 0..1
 * @param {function(number, number): (number|null)} cfg.groundAt - Surface Y under (x, from y), null when none
 * @param {number} cfg.dt - Seconds since the last pose (0 snaps the body to its surface height)
 */
export function pose(inst, cfg) {
  const { x, y, facing, phase, groundAt, dt } = cfg
  const flatGround = y + HeroPicture.FEET_Y - HALF
  let sum = 0
  let planted = 0
  HeroPicture.RUN_HIP_POINTS.forEach((hip, i) => {
    const gait = legGait(phase + i / LEG_COUNT)
    const leg = inst.legs[i]
    leg.fx = x + (hip.x - HALF + gait.ahead) * facing
    const ground = groundAt(leg.fx, y + hip.y - HALF)
    inst.ground[i] = ground
    inst.lift[i] = gait.lift
    if (!gait.stance || ground === null) return
    sum += ground - flatGround
    planted++
  })
  const target = planted ? Math.max(-SURFACE_SHIFT_MAX, Math.min(SURFACE_SHIFT_MAX, sum / planted)) : 0
  inst.shift = dt > 0 ? inst.shift + (target - inst.shift) * Math.min(1, dt * SURFACE_SHIFT_RATE) : target
  inst.bodyDy = inst.shift + BOB * (0.5 + 0.5 * Math.cos(phase * Math.PI * 2 * LEG_COUNT))
  HeroPicture.RUN_HIP_POINTS.forEach((hip, i) => {
    const leg = inst.legs[i]
    leg.hx = x + (hip.x - HALF) * facing
    leg.hy = y + hip.y - HALF - HIP_TUCK + inst.bodyDy
    const ground = inst.ground[i]
    const footY = ground === null ? leg.hy + REACH : ground - FOOT_R - inst.lift[i]
    solveKnee(leg, leg.fx, footY, facing)
  })
}

/**
 * Draws what goes under the run body: both legs' contours with their soft
 * halo (world space).
 * @param {Object} inst - Legs inst
 * @param {number} [opacity=1] - Shared opacity
 */
export function drawBehind(inst, opacity = 1) {
  inst.legs.forEach((leg, i) => addJoinedTube(inst.batch, leg, fillStartY(leg), CONTOUR_W + HALO_W, inst.colors[i].outline))
  PolyBatch.flush(inst.batch, inst.k, opacity * HALO_OPACITY)
  inst.legs.forEach((leg, i) => addJoinedTube(inst.batch, leg, fillStartY(leg), CONTOUR_W, inst.colors[i].outline))
  PolyBatch.flush(inst.batch, inst.k, opacity)
}

/**
 * Draws the legs over the run body (world space): the far leg's fill, the
 * near leg's contour again where it lies over the far leg, then the near
 * leg's fill. Nothing of a fill shows above its start level, just above the
 * body's bottom contour; the near leg's contour over the far leg starts
 * only below its fillet, where the fills have turned from the body's tone
 * to the legs' own — higher up it would read as a line into the body.
 * @param {Object} inst - Legs inst
 * @param {number} [opacity=1] - Shared opacity
 */
export function drawFront(inst, opacity = 1) {
  const far = inst.legs[FAR_LEG]
  const near = inst.legs[NEAR_LEG]
  const nearColors = inst.colors[NEAR_LEG]
  const ringY = flareEnd(near, fillStartY(near)).y
  drawFill(inst, far, inst.colors[FAR_LEG], opacity)
  addJoinedTube(inst.batch, near, fillStartY(near), CONTOUR_W + HALO_W, nearColors.outline)
  PolyBatch.flush(inst.batch, inst.k, opacity * HALO_OPACITY, 0, Infinity, ringY)
  addJoinedTube(inst.batch, near, fillStartY(near), CONTOUR_W, nearColors.outline)
  PolyBatch.flush(inst.batch, inst.k, opacity, 0, Infinity, ringY)
  drawFill(inst, near, nearColors, opacity)
}
//
// Where a leg is in the gait at a phase: on the surface sliding back
// (stance) or lifted swinging forward with eased speed.
//
function legGait(phase) {
  const p = phase - Math.floor(phase)
  if (p < STANCE_SHARE) return { stance: true, ahead: STRIDE * (0.5 - p / STANCE_SHARE), lift: 0 }
  const u = (p - STANCE_SHARE) / (1 - STANCE_SHARE)
  const eased = u * u * (3 - 2 * u)
  return { stance: false, ahead: STRIDE * (eased - 0.5), lift: LIFT * Math.sin(Math.PI * u) }
}
//
// Two-bone IK: the foot pulled within reach of the hip, the knee off the
// hip–foot line towards the facing side (legs bend forward), never up in
// the join with the body.
//
function solveKnee(leg, footX, footY, facing) {
  let dx = footX - leg.hx
  let dy = footY - leg.hy
  let d = Math.hypot(dx, dy)
  if (d < MIN_REACH) {
    dx = 0
    dy = MIN_REACH
    d = MIN_REACH
  }
  const reach = Math.min(d, REACH)
  const ux = dx / d
  const uy = dy / d
  leg.fx = leg.hx + ux * reach
  leg.fy = leg.hy + uy * reach
  const side = -uy * facing >= 0 ? 1 : -1
  const midY = leg.hy + uy * reach / 2
  const rise = ux * side
  const minKneeY = fillStartY(leg) + FLARE_LEN
  const bend = kneeBend(reach, rise, midY, minKneeY)
  leg.kx = leg.hx + ux * reach / 2 - uy * bend * side
  leg.ky = midY + rise * bend
}
//
// How far the knee sits off the hip–foot line: the bones' full bend, eased
// back where it would lift the knee above minKneeY (a fillet's length under
// the fill's start) — a folded leg never pokes its knee up into the body or
// into the join, where the fill is still turning from the body's tone.
//
function kneeBend(reach, rise, midY, minKneeY) {
  const bend = Math.sqrt(Math.max(0, BONE_LEN * BONE_LEN - reach * reach / 4))
  if (rise >= 0 || midY + rise * bend >= minKneeY) return bend
  return Math.max(0, (midY - minKneeY) / -rise)
}
//
// The level the near leg's fill starts at: CONTOUR_COVER px above the body's
// bottom contour (which runs HIP_TUCK below the hip).
//
function fillStartY(leg) {
  return leg.hy + HIP_TUCK - CONTOUR_COVER
}
//
// A leg's fill from its start level: the soft edge band, shaded sides, mid
// tone, lit core and two fur streaks from the fillet's end (nothing of them
// above the start), then the veil of the body's tone over them, faded by
// height from FADE_IN above the start.
//
function drawFill(inst, leg, colors, opacity) {
  const batch = inst.batch
  const startY = fillStartY(leg)
  addJoinedTube(batch, leg, startY, EDGE_W, colors.edge)
  addJoinedTube(batch, leg, startY, LEG_W, colors.shade)
  addJoinedTube(batch, leg, startY, LEG_W * LEG_MID_SHARE, colors.mid)
  addJoinedTube(batch, leg, startY, LEG_W * LEG_CORE_SHARE, colors.core)
  const flare = flareEnd(leg, startY)
  addStreak(batch, leg, flare.x, flare.y, LEG_W * STREAK_OFFSET_SHARE, colors.streak)
  addStreak(batch, leg, flare.x, flare.y, -LEG_W * STREAK_OFFSET_SHARE, colors.streak)
  PolyBatch.flush(batch, inst.k, opacity, 0, Infinity, startY)
  const top = EDGE_W + flareExtra(0)
  addLevelSlice(batch, leg, startY - FADE_IN, startY, top, top, colors.tone)
  addJoinedTube(batch, leg, startY, EDGE_W, colors.tone)
  PolyBatch.fadeBand(batch, 0, startY - FADE_IN, startY, startY + BLEND_DEPTH)
  PolyBatch.flush(batch, inst.k, opacity, 0, Infinity, startY - FADE_IN)
}
//
// A leg's tube where it joins the body, cut into horizontal slices
// down the upper bone from startY so its top edge always lies level with
// the body's bottom, however the leg swings. Each slice is centred on the
// bone and as thick across it as width plus the fillet's extra, easing to
// none over FLARE_LEN. From the fillet's end the tube runs on round-jointed
// to the knee and foot.
//
function addJoinedTube(batch, leg, startY, width, color) {
  const end = flareEnd(leg, startY)
  for (let i = 0; i < FLARE_SLICES; i++) {
    const t0 = i / FLARE_SLICES
    const t1 = (i + 1) / FLARE_SLICES
    addLevelSlice(
      batch, leg,
      startY + (end.y - startY) * t0, startY + (end.y - startY) * t1,
      width + flareExtra(t0), width + flareExtra(t1),
      color
    )
  }
  PolyBatch.addDisc(batch, end.x, end.y, width / 2, color)
  PolyBatch.addLine(batch, end.x, end.y, leg.kx, leg.ky, width, color)
  PolyBatch.addLine(batch, leg.kx, leg.ky, leg.fx, leg.fy, width, color)
  PolyBatch.addDisc(batch, leg.kx, leg.ky, width / 2, color)
  PolyBatch.addDisc(batch, leg.fx, leg.fy, width / 2, color)
}
//
// One level slice of the upper bone between two heights: horizontal edges
// centred on the bone, as wide as the tube there (not widened for the
// bone's slant, so the joined top never pokes out past the body's
// silhouette — the round knee and the bone below restore the full width).
//
function addLevelSlice(batch, leg, y0, y1, width0, width1, color) {
  const x0 = boneXAt(leg, y0)
  const x1 = boneXAt(leg, y1)
  const h0 = width0 / 2
  const h1 = width1 / 2
  PolyBatch.addQuad(batch, x0 - h0, y0, x0 + h0, y0, x1 + h1, y1, x1 - h1, y1, color)
}
//
// The upper bone's x at a height.
//
function boneXAt(leg, y) {
  const drop = leg.ky - leg.hy
  return drop > 1e-6 ? leg.hx + (leg.kx - leg.hx) * (y - leg.hy) / drop : leg.hx
}
//
// Extra width of the fillet across its length (0 at the start, 1 at its
// end): a squared falloff, so it curves into the leg's side.
//
function flareExtra(t) {
  return FLARE * 2 * (1 - t) * (1 - t)
}
//
// Where the fillet ends: FLARE_LEN down the upper bone from the fill's start
// level, short of the knee.
//
function flareEnd(leg, startY) {
  const startX = boneXAt(leg, startY)
  const dx = leg.kx - startX
  const dy = leg.ky - startY
  const len = Math.hypot(dx, dy)
  const reach = len > 1e-6 ? Math.min(FLARE_LEN, len * 0.9) / len : 0
  return { x: startX + dx * reach, y: startY + dy * reach }
}
//
// A thin streak beside the core, offset across each bone.
//
function addStreak(batch, leg, startX, startY, offset, color) {
  addOffsetLine(batch, startX, startY, leg.kx, leg.ky, offset, color)
  addOffsetLine(batch, leg.kx, leg.ky, leg.fx, leg.fy, offset, color)
}
function addOffsetLine(batch, x1, y1, x2, y2, offset, color) {
  const len = Math.hypot(x2 - x1, y2 - y1)
  if (len < 1e-6) return
  const nx = -(y2 - y1) / len * offset
  const ny = (x2 - x1) / len * offset
  PolyBatch.addLine(batch, x1 + nx, y1 + ny, x2 + nx, y2 + ny, STREAK_W, color)
}
//
// Mean colour of the opaque pixels in a canvas box.
//
function meanColor(ctx, x, y, w, h) {
  const px = ctx.getImageData(Math.round(x), Math.round(y), w, h).data
  const sum = { r: 0, g: 0, b: 0, n: 0 }
  for (let i = 0; i < px.length; i += RGBA) {
    if (px[i + 3] === 0) continue
    sum.r += px[i]
    sum.g += px[i + 1]
    sum.b += px[i + 2]
    sum.n++
  }
  const n = sum.n || 1
  return { r: sum.r / n, g: sum.g / n, b: sum.b / n }
}
//
// Colour sets per leg (back hip first): the near leg's bands are the body's
// own colour darkened, the far leg's the sheet's greys; the edge band sits
// halfway between the contour and the sides, and every set carries the
// join tone for its veil (cfg's fallbacks if the body has not been sampled).
//
function legColorSets(k, tones) {
  const hero = CFG.visual.colors.hero
  const join = tones?.join ?? hexRgb(hero.legNear.joinFallback)
  const body = tones?.body ?? hexRgb(hero.legNear.bodyFallback)
  const near = {
    outline: hexRgb(hero.legNear.outline),
    shade: scaled(body, NEAR_SIDE_SHADE),
    mid: scaled(body, NEAR_MID_SHADE),
    core: body,
    streak: scaled(body, NEAR_STREAK_SHADE)
  }
  const far = {
    outline: hexRgb(hero.legFar.outline),
    shade: hexRgb(hero.legFar.shade),
    mid: hexRgb(hero.legFar.mid),
    core: hexRgb(hero.legFar.core),
    streak: hexRgb(hero.legFar.streak)
  }
  const colors = []
  colors[FAR_LEG] = legKColors(k, join, far)
  colors[NEAR_LEG] = legKColors(k, join, near)
  return { colors }
}
function legKColors(k, tone, leg) {
  return {
    outline: kRgb(k, leg.outline),
    edge: kRgb(k, mixed(leg.outline, leg.shade, EDGE_MIX)),
    shade: kRgb(k, leg.shade),
    mid: kRgb(k, leg.mid),
    core: kRgb(k, leg.core),
    streak: kRgb(k, leg.streak),
    tone: kRgb(k, tone)
  }
}
function mixed(a, b, t) {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t }
}
function scaled(c, f) {
  return { r: c.r * f, g: c.g * f, b: c.b * f }
}
function hexRgb(hex) {
  const [r, g, b] = parseHex(hex)
  return { r, g, b }
}
function kRgb(k, c) {
  return k.rgb(c.r, c.g, c.b)
}
