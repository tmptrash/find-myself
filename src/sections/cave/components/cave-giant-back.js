import { CFG } from '../../../cfg.js'
//
// The giant's back as ground: invisible static bodies, each level, laid
// along the top of its back (each between two points on the picture,
// skinned with the mesh) while that stretch of the back is out of the
// water, parked far below the world otherwise. The first is the main
// stretch (head and hump); the rest step down the tail a few px at a time
// (low enough for the hero to walk up and down them). They are kept apart
// from the mesh's bending: only their ends and heights follow the back.
//
// A hero standing on it is carried along by Kaplay itself (it moves
// whoever stands on a body by that body's move; nothing here moves him
// too, or he would run ahead of the back; the level keeps his position
// unrounded while he rides, so the slow back's fractions are not lost). A
// stretch going under with the hero still on it is not parked at once
// (that move would throw him far below the lake): it goes down with the
// back, no longer ground for riding, and takes him into the water with
// it.
//
const THICK = 12
const PARK_Y = 1e5
const MIN_W = 10
const HOLD_SLACK = 6

/**
 * Creates the back's (parked) bodies.
 * @param {Object} k - Kaplay instance
 * @param {number} count - How many stretches (the main one first)
 * @returns {Object} Back instance: `rect` is the main stretch's
 */
export function create(k, count) {
  const parts = Array.from({ length: count }, () => createPart(k))
  return { k, parts, rect: parts[0].rect, active: false }
}

/**
 * Lays each body along its stretch of the back — level, at the mean
 * height of its two ends — while it is out of the water (or the hero is
 * still on it), else parks it. The back is ground while its main stretch
 * is out.
 * @param {Object} inst - Back instance
 * @param {Array<{a: Object, b: Object, dry: boolean}>|null} spans - Per stretch its two ends (world) and whether it is out of the water; null: all parked
 * @param {Object|null} [char] - The hero's character
 */
export function place(inst, spans, char = null) {
  inst.active = Boolean(spans?.[0].dry)
  inst.parts.forEach((part, i) => placePart(inst.k, part, spans?.[i], char))
}

/**
 * Whether a hero stands on the back now (on a stretch out of the water).
 * @param {Object} inst - Back instance
 * @param {Object|null} char - The hero's character
 * @returns {boolean}
 */
export function isCarrying(inst, char) {
  if (!inst.active || !char?.exists?.() || !char.isGrounded?.()) return false
  return inst.parts.some(part => part.dry && standsOn(part, char))
}

/**
 * Whether the (active) back holds up feet at (x, feetY): over one of its
 * stretches out of the water, at most its thickness and HOLD_SLACK px
 * into it.
 * @param {Object} inst - Back instance
 * @param {number} x - World X
 * @param {number} feetY - World Y of the feet
 * @returns {boolean}
 */
export function holds(inst, x, feetY) {
  return inst.active && inst.parts.some(part => part.dry && holdsOn(part.rect, x, feetY))
}

/**
 * Draws the bodies' outlines (debug).
 * @param {Object} inst - Back instance
 * @param {Object} color - Kaplay color
 */
export function onDrawDebug(inst, color) {
  inst.parts.forEach(part => part.rect.y !== PARK_Y && drawPartDebug(inst.k, part.rect, color))
}
function createPart(k) {
  const body = k.add([
    k.rect(MIN_W, THICK),
    k.pos(0, PARK_Y),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName
  ])
  return { body, dry: false, rect: { x: 0, y: PARK_Y, w: MIN_W, h: THICK } }
}
//
// A stretch laid while it is out of the water or the hero stands on it,
// else parked.
//
function placePart(k, part, span, char) {
  part.dry = Boolean(span?.dry)
  if (part.dry || (span && standsOn(part, char))) {
    lay(k, part, span.a, span.b)
    return
  }
  part.rect.y = PARK_Y
  part.body.pos = k.vec2(0, PARK_Y)
}
//
// A stretch laid level between its two ends.
//
function lay(k, part, a, b) {
  const x = Math.min(a.x, b.x)
  const w = Math.max(MIN_W, Math.abs(a.x - b.x))
  const y = (a.y + b.y) / 2
  part.rect.x = x
  part.rect.y = y
  part.rect.w = w
  part.body.width = w
  part.body.pos = k.vec2(x, y)
}
function standsOn(part, char) {
  return Boolean(char?.exists?.()) && char.curPlatform?.() === part.body
}
function holdsOn(r, x, feetY) {
  return r.y !== PARK_Y && x >= r.x - HOLD_SLACK && x <= r.x + r.w + HOLD_SLACK && feetY <= r.y + THICK + HOLD_SLACK
}
function drawPartDebug(k, r, color) {
  k.drawRect({ pos: k.vec2(r.x, r.y), width: r.w, height: THICK, fill: false, outline: { width: 1, color } })
}
