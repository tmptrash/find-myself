//
// How the lake's fish (cave-fish.js) swim: a spine of
// bones in 3D — x and y as on the screen, z into it — solved as a
// follow-the-leader IK chain (the head is steered, every joint behind it
// is pulled after the one before it at its bone's length, and no joint
// bends more than its limit, so the body flows along the head's path);
// steering the head toward a direction (turning about through the depth
// when it lies straight behind); the head's swim with its side-to-side beat (in z, toward and
// away from the eye — from the side that shows as the body turning
// edge-on and back) and a little up and down; and which way a spine faces
// on the screen.
//
const TURN_BEHIND = -1 + 1e-3
const TURN_SIDE_PULL = 0.5
const SIDE_EPS = 1e-3

/**
 * A straight spine: count + 1 joints behind (x, y, z), the head first,
 * facing dir.
 * @param {number} count - Bones
 * @param {{x: number, y: number, z: number}} head - Head point
 * @param {number} dir - Facing: 1 right, -1 left
 * @param {number} seg - Bone length (px)
 * @returns {Array<{x: number, y: number, z: number}>}
 */
export function createSpine(count, head, dir, seg) {
  return Array.from({ length: count + 1 }, (_, i) => ({ x: head.x - dir * seg * i, y: head.y, z: head.z }))
}

/**
 * Pulls every joint after the one before it at the bone's length, turned
 * back within maxBend (rad) of the bone before (the first of the heading).
 * @param {Array<{x: number, y: number, z: number}>} joints - Spine, head first
 * @param {{x: number, y: number, z: number}} h - Heading (unit)
 * @param {number} seg - Bone length (px)
 * @param {number} maxBend - Most a joint bends (rad)
 */
export function followSpine(joints, h, seg, maxBend) {
  let px = h.x
  let py = h.y
  let pz = h.z
  for (let i = 1; i < joints.length; i++) {
    const a = joints[i - 1]
    const b = joints[i]
    let dx = a.x - b.x
    let dy = a.y - b.y
    let dz = a.z - b.z
    const l = Math.hypot(dx, dy, dz) || 1
    dx /= l
    dy /= l
    dz /= l
    const angle = Math.acos(clamp(dx * px + dy * py + dz * pz, -1, 1))
    if (angle > maxBend) {
      const s = Math.sin(angle) || 1
      const wa = Math.sin(maxBend) / s
      const wb = Math.sin(angle - maxBend) / s
      dx = px * wb + dx * wa
      dy = py * wb + dy * wa
      dz = pz * wb + dz * wa
      const n = Math.hypot(dx, dy, dz) || 1
      dx /= n
      dy /= n
      dz /= n
    }
    b.x = a.x - dx * seg
    b.y = a.y - dy * seg
    b.z = a.z - dz * seg
    px = dx
    py = dy
    pz = dz
  }
}

/**
 * Turns a heading toward a direction by at most `step` rad (slerp);
 * straight behind, it turns through the depth on its own side.
 * @param {{x: number, y: number, z: number}} h - Heading (unit), changed
 * @param {{x: number, y: number, z: number}} want - Wanted direction (unit), may be changed
 * @param {number} step - Most it turns (rad)
 * @param {number} turnSide - -1 or 1: which way through the depth
 */
export function turnToward(h, want, step, turnSide) {
  let dot = clamp(h.x * want.x + h.y * want.y + h.z * want.z, -1, 1)
  if (dot < TURN_BEHIND) {
    setDir(want, want.x, want.y, want.z + turnSide * TURN_SIDE_PULL)
    dot = clamp(h.x * want.x + h.y * want.y + h.z * want.z, -1, 1)
  }
  const angle = Math.acos(dot)
  if (angle <= step) {
    setDir(h, want.x, want.y, want.z)
    return
  }
  const s = Math.sin(angle)
  const a = Math.sin(angle - step) / s
  const b = Math.sin(step) / s
  setDir(h, h.x * a + want.x * b, h.y * a + want.y * b, h.z * a + want.z * b)
}

/**
 * Moves the head along its heading at `speed`, beating side to side (in
 * z) by `amp` rad and up and down by `vert` at the beat's phase.
 * @param {{x: number, y: number, z: number}} head - Head joint, moved
 * @param {{x: number, y: number, z: number}} h - Heading (unit)
 * @param {Object} beat
 * @param {number} beat.speed - Px/s
 * @param {number} beat.phase - Beat phase (rad)
 * @param {number} beat.amp - Side beat (rad)
 * @param {number} beat.vert - Up-and-down beat (share)
 * @param {number} dt - Delta time
 */
export function swimHead(head, h, beat, dt) {
  const l = Math.hypot(h.x, h.z)
  const sx = l < SIDE_EPS ? 0 : -h.z / l
  const sz = l < SIDE_EPS ? 1 : h.x / l
  const lat = Math.tan(beat.amp * Math.sin(beat.phase))
  const mx = h.x + sx * lat
  const my = h.y + beat.vert * Math.cos(beat.phase)
  const mz = h.z + sz * lat
  const ml = Math.hypot(mx, my, mz) || 1
  head.x += mx / ml * beat.speed * dt
  head.y += my / ml * beat.speed * dt
  head.z += mz / ml * beat.speed * dt
}

/**
 * Which way a spine faces on the screen: its head's side of its tail,
 * once more than `edge` px apart (a spine seen head-on keeps its way).
 * @param {Array<{x: number}>} joints - Spine, head first
 * @param {number} prev - Facing so far
 * @param {number} edge - Dead band (px)
 * @returns {number} 1 or -1
 */
export function facingOf(joints, prev, edge) {
  const dx = joints[0].x - joints[joints.length - 1].x
  return Math.abs(dx) > edge ? Math.sign(dx) : prev
}

/**
 * Normalises (x, y, z) into v.
 * @param {{x: number, y: number, z: number}} v - Changed
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
export function setDir(v, x, y, z) {
  const l = Math.hypot(x, y, z) || 1
  v.x = x / l
  v.y = y / l
  v.z = z / l
}

/**
 * Distance between two 3D points.
 * @param {{x: number, y: number, z: number}} a
 * @param {{x: number, y: number, z: number}} b
 * @returns {number}
 */
export function dist3(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

/**
 * v held between lo and hi.
 * @param {number} v
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}
