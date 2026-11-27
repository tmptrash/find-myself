import * as Hero from '../../../components/hero.js'
//
// The hero held in a clawed hand (the climber's): his body's picture is
// not drawn as one flat sprite but as a fine grid, and where the claws
// dig into him the grid is pressed in — so he is squeezed only there, his
// own shape left as it is everywhere else (he grows neither taller nor
// narrower as a whole). His legs dangle as ever, behind and before the
// body.
// The grid has GRID cells each way over the sprite's frame. Each finger
// pulls what it has hooked toward the palm, along its own way (from its
// root to its farthest point, where the claw bends over): a grid point
// right there goes DENT px, less the farther it lies to the side (a bell
// DENT_R px wide) or past the claw (a bell DENT_PAST px long — so his
// outline beyond the claw caves in), and between the claw and the
// finger's root evenly less down to nothing (he is pressed together
// there). The grip works a little: DENT_PULSE px either way at
// DENT_PULSE_HZ.
//
const GRID = 20
const DENT = 7
const DENT_R = 4
const DENT_PAST = 14
const DENT_PULSE = 1
const DENT_PULSE_HZ = 2.2
const HALF = 0.5
const DEG = 180 / Math.PI
const LEGS_AT = { x: 0, y: 0, groundY: null }

/**
 * Creates what draws a held hero (its grid and its legs, made once).
 * @param {Object} k - Kaplay instance
 * @returns {Object} Held hero instance
 */
export function create(k) {
  const count = (GRID + 1) * (GRID + 1)
  const inst = {
    k,
    legs: Hero.createStandLegs(k),
    pts: Array.from({ length: count }, () => k.vec2(0, 0)),
    uv: Array.from({ length: count }, () => k.vec2(0, 0)),
    indices: gridIndices(),
    shift: new Float32Array(count * 2),
    v: k.vec2(0, 0)
  }
  return inst
}

/**
 * Draws the held hero: his legs behind, his body pressed in where the
 * claws dig into it, his legs' front part.
 * @param {Object} inst - Held hero instance
 * @param {string} sprite - His picture (an idle sprite)
 * @param {{x: number, y: number}} at - World point of his middle
 * @param {number} angle - How far he leans (degrees)
 * @param {Array<Array<number>>} claws - The fingers on him: a line each, its points' world x, y in turn
 */
export function onDraw(inst, sprite, at, angle, claws) {
  const k = inst.k
  const data = k.getSprite(sprite)?.data
  const frame = data?.frames?.[0]
  if (!frame) return
  drawLegs(inst, at, angle, false)
  layGrid(inst, data, frame.q, at, angle)
  inst.shift.fill(0)
  for (const line of claws) dent(inst, line, DENT + DENT_PULSE * Math.sin(k.time() * DENT_PULSE_HZ * Math.PI * 2))
  inst.pts.forEach((p, n) => p.set(p.x + inst.shift[n * 2], p.y + inst.shift[n * 2 + 1]))
  k.drawPolygon({ pts: inst.pts, uv: inst.uv, indices: inst.indices, tex: frame.tex })
  drawLegs(inst, at, angle, true)
}
//
// His legs (behind the body, or their part over it), leaning with him.
//
function drawLegs(inst, at, angle, front) {
  const k = inst.k
  k.pushTransform()
  k.pushTranslate(inst.v.set(at.x, at.y))
  k.pushRotate(angle)
  Hero.drawStandingHeroLegs(inst.legs, LEGS_AT, front)
  k.popTransform()
}
//
// The grid as the plain sprite would lie: over the frame, its middle on
// the legs' hips at `at`, leaning; each point with its place in the
// atlas page.
//
function layGrid(inst, data, q, at, angle) {
  const cos = Math.cos(angle / DEG)
  const sin = Math.sin(angle / DEG)
  for (let row = 0; row <= GRID; row++) {
    for (let col = 0; col <= GRID; col++) {
      const n = row * (GRID + 1) + col
      const x = (col / GRID - HALF) * data.width
      const y = (row / GRID - HALF) * data.height + inst.legs.bodyDy
      inst.pts[n].set(at.x + x * cos - y * sin, at.y + x * sin + y * cos)
      inst.uv[n].set(q.x + q.w * col / GRID, q.y + q.h * row / GRID)
    }
  }
}
//
// One finger's pull on the grid (added to every point's shift): from
// its hold — the point of its line farthest along its way — back toward
// its root, `depth` px there.
//
function dent(inst, line, depth) {
  const last = line.length - 2
  const len = Math.hypot(line[last] - line[0], line[last + 1] - line[1])
  if (len <= 0) return
  const fx = (line[last] - line[0]) / len
  const fy = (line[last + 1] - line[1]) / len
  let reach = 0
  let hold = 0
  for (let i = 2; i <= last; i += 2) {
    const along = (line[i] - line[0]) * fx + (line[i + 1] - line[1]) * fy
    if (along <= reach) continue
    reach = along
    hold = i
  }
  if (reach <= 0) return
  for (let n = 0; n < inst.pts.length; n++) {
    const dx = inst.pts[n].x - line[hold]
    const dy = inst.pts[n].y - line[hold + 1]
    const along = dx * fx + dy * fy
    const side = dx * fy - dy * fx
    const lengthwise = along >= 0 ? Math.exp(-along * along / (DENT_PAST * DENT_PAST)) : Math.max(0, 1 + along / reach)
    const pull = depth * lengthwise * Math.exp(-side * side / (DENT_R * DENT_R))
    inst.shift[n * 2] -= fx * pull
    inst.shift[n * 2 + 1] -= fy * pull
  }
}
//
// The grid's cells as triangles.
//
function gridIndices() {
  const out = []
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const n = row * (GRID + 1) + col
      out.push(n, n + 1, n + GRID + 1, n + 1, n + GRID + 2, n + GRID + 1)
    }
  }
  return out
}
