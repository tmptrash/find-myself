//
// A 2D skinned mesh: one continuous picture laid over a grid of COLS × ROWS
// cells (two triangles each, UVs fixed once), bent by a chain of bones
// without seams. Each vertex is bound in the rest pose to the bone of the
// rest spine nearest it and, near a joint, to the next bone too (its two
// weights eased across the joint, summing to 1): every frame the bones'
// rest-to-pose transforms (each bone turned about its own first joint, the
// chain rebuilt from one anchor joint) are blended over the rest vertex —
// always from the rest pose, so nothing drifts. A pose is given by where
// the joints stand (a chain led by its head); a bone may stand shorter or
// longer than at rest, and what it carries is squeezed or stretched along
// it (a body turning away from the eye). Attachments (fins,
// whiskers) are soft regions of the picture turned about their anchor in
// the rest pose before skinning, so they swing and still follow the body.
//
// Why on the CPU: the meshes are small (a few hundred vertices) and Kaplay
// sends a textured polygon's vertices to the GPU on every draw anyway
// (drawPolygon with `uv`, `tex`, `indices`); a vertex shader would need
// per-vertex bone weights, which Kaplay's batch does not carry. The
// working arrays (pose, vertices, points) are reused, so a frame allocates
// only what drawPolygon itself builds.
//
// Coordinates: "local" is the picture's px scaled to world px, origin on
// the anchor joint, as painted (no turn). The pose maps local to world:
// placed at a point, mirrored when facing the other way than painted.
//
const DEBUG_LINE = 1
const DEBUG_JOINT_R = 3
const DEBUG_VERTEX_R = 1.5
const DEBUG_ALPHA = 0.6
const EPS = 1e-6
const HALF = 0.5
const STRETCH_MIN = 0.05
const STRETCH_MAX = 1.6
const TRI = 3

/**
 * Builds a skinned mesh over a picture.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {{w: number, h: number}} cfg.picture - The picture's size (px)
 * @param {number} cfg.scale - World px per picture px
 * @param {number} cfg.cols - Grid columns
 * @param {number} cfg.rows - Grid rows
 * @param {Array<{x: number, y: number}>} cfg.joints - Rest spine joints on the picture (px), head first
 * @param {number} cfg.anchor - The joint the pose is placed by
 * @param {number} cfg.blend - Width of the eased blend across a joint (share of a bone)
 * @param {Array<Object>} [cfg.attachments] - Soft regions: { anchor: {x, y}, center: {x, y}, rx, ry } (picture px)
 * @returns {Object} Mesh instance
 */
export function create(cfg) {
  const { k, picture, scale, cols, rows } = cfg
  const origin = cfg.joints[cfg.anchor]
  const joints = cfg.joints.map(p => toLocal(origin, scale, p))
  const bones = joints.slice(0, -1).map((a, i) => boneBetween(a, joints[i + 1]))
  const inst = {
    k,
    cols,
    rows,
    scale,
    anchor: cfg.anchor,
    joints,
    bones,
    blend: cfg.blend,
    origin,
    attachments: (cfg.attachments ?? []).map(a => ({ anchor: toLocal(origin, scale, a.anchor), center: toLocal(origin, scale, a.center), rx: a.rx * scale, ry: a.ry * scale })),
    rest: [],
    bind: [],
    uv: [],
    indices: [],
    pts: [],
    pose: {
      joints: joints.map(j => ({ x: j.x, y: j.y })),
      turns: bones.map(() => 0),
      cos: bones.map(b => Math.cos(b.angle)),
      sin: bones.map(b => Math.sin(b.angle)),
      stretch: bones.map(() => 1),
      swing: [],
      x: 0,
      y: 0,
      mirrored: false,
      roll: 1
    },
    acc: { x: 0, y: 0 },
    cutIdx: [],
    quadUv: null,
    quadKey: null
  }
  inst.pose.swing = inst.attachments.map(() => 0)
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const u = c / cols
      const v = r / rows
      const local = toLocal(origin, scale, { x: u * picture.w, y: v * picture.h })
      inst.rest.push(local)
      inst.bind.push(bindOf(inst, local))
      inst.uv.push(k.vec2(u, v))
      inst.pts.push(k.vec2(0, 0))
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * (cols + 1) + c
      inst.indices.push(i, i + 1, i + cols + 1, i + 1, i + cols + 2, i + cols + 1)
    }
  }
  return inst
}

/**
 * Sets the pose from where the joints stand (world, head first — a chain
 * led by its head, say): each bone turned to point from its joint to the
 * next and stretched (or shortened: a body seen turning away) to their
 * distance; each attachment swung by `swing[i]` (rad); facing as painted
 * or mirrored; its picture across the spine scaled by `roll` (1 as
 * painted, 0 seen edge-on, -1 the other side: a body rolling over about
 * its spine — the same as mirrored at -1).
 * @param {Object} inst - Mesh instance
 * @param {Object} pose
 * @param {Array<{x: number, y: number}>} pose.joints - World joints, as many as the rest spine's
 * @param {Array<number>} [pose.swing] - Per attachment (rad)
 * @param {boolean} pose.mirrored - Facing the other way than painted
 * @param {number} [pose.roll=1] - Across-the-spine scale (-1..1)
 */
export function setJoints(inst, pose) {
  const p = inst.pose
  const a = pose.joints[inst.anchor]
  pose.swing && pose.swing.forEach((s, i) => { p.swing[i] = s })
  p.x = a.x
  p.y = a.y
  p.mirrored = pose.mirrored
  p.roll = pose.roll ?? 1
  const sign = pose.mirrored ? -1 : 1
  pose.joints.forEach((w, i) => {
    p.joints[i].x = (w.x - a.x) * sign
    p.joints[i].y = w.y - a.y
  })
  inst.bones.forEach((bone, i) => {
    const dx = p.joints[i + 1].x - p.joints[i].x
    const dy = p.joints[i + 1].y - p.joints[i].y
    const angle = Math.atan2(dy, dx)
    p.turns[i] = angle - bone.angle
    p.cos[i] = Math.cos(angle)
    p.sin[i] = Math.sin(angle)
    p.stretch[i] = Math.min(STRETCH_MAX, Math.max(STRETCH_MIN, Math.hypot(dx, dy) / bone.len))
  })
  inst.rest.forEach((r, i) => skinInto(inst, r, inst.bind[i], inst.pts[i]))
}

/**
 * Where a point of the picture is now (world), skinned like the mesh.
 * @param {Object} inst - Mesh instance
 * @param {{x: number, y: number}} picturePx - A point on the picture (px)
 * @param {{x: number, y: number}} out - Written
 * @returns {{x: number, y: number}} out
 */
export function pointAt(inst, picturePx, out) {
  const local = toLocal(inst.origin, inst.scale, picturePx)
  return skinInto(inst, local, bindOf(inst, local), out)
}

/**
 * Draws the mesh with a texture (its quad maps the UVs into it); with a
 * `cut`, only its triangles wholly on the cut's side (a line through
 * (x, y), its normal (nx, ny) pointing to the side kept).
 * @param {Object} inst - Mesh instance
 * @param {Object} tex - Kaplay texture
 * @param {{x: number, y: number, w: number, h: number}} quad - The picture's place in the texture (0..1)
 * @param {Object} [opts] - color, opacity, cut {x, y, nx, ny}
 */
export function onDraw(inst, tex, quad, opts = {}) {
  inst.quadUv ??= inst.uv.map(() => inst.k.vec2(0, 0))
  if (inst.quadKey !== quad) {
    inst.uv.forEach((uv, i) => inst.quadUv[i].set(quad.x + uv.x * quad.w, quad.y + uv.y * quad.h))
    inst.quadKey = quad
  }
  inst.k.drawPolygon({
    pts: inst.pts,
    uv: inst.quadUv,
    indices: opts.cut ? cutIndices(inst, opts.cut) : inst.indices,
    tex,
    color: opts.color,
    opacity: opts.opacity ?? 1
  })
}

/**
 * Draws the mesh's debug overlay: triangles, the bones and joints, each
 * vertex coloured by its main bone, the attachments' anchors.
 * @param {Object} inst - Mesh instance
 * @param {Array<Object>} boneColors - Kaplay colors, one per bone
 * @param {Object} lineColor - Kaplay color of the triangles
 */
export function onDrawDebug(inst, boneColors, lineColor) {
  const k = inst.k
  const { pts, indices } = inst
  for (let t = 0; t < indices.length; t += 3) {
    const a = pts[indices[t]]
    const b = pts[indices[t + 1]]
    const c = pts[indices[t + 2]]
    k.drawLines({ pts: [a, b, c, a], width: DEBUG_LINE, color: lineColor, opacity: DEBUG_ALPHA })
  }
  pts.forEach((p, i) => {
    const bind = inst.bind[i]
    k.drawCircle({ pos: p, radius: DEBUG_VERTEX_R, color: boneColors[bind.w0 >= bind.w1 ? bind.b0 : bind.b1] })
  })
  const world = inst.pose.joints.map(j => toWorld(inst, j, k.vec2(0, 0)))
  world.slice(0, -1).forEach((a, i) => k.drawLine({ p1: a, p2: world[i + 1], width: DEBUG_JOINT_R, color: boneColors[i] }))
  world.forEach(p => k.drawCircle({ pos: p, radius: DEBUG_JOINT_R, color: lineColor }))
  inst.attachments.forEach((a, i) => {
    const out = k.vec2(0, 0)
    skinInto(inst, a.anchor, bindOf(inst, a.anchor), out)
    k.drawCircle({ pos: out, radius: DEBUG_JOINT_R, color: boneColors[i % boneColors.length], outline: { width: DEBUG_LINE, color: lineColor } })
  })
}

/**
 * The world point of a local point under the current placement.
 * @param {Object} inst - Mesh instance
 * @param {{x: number, y: number}} local - Local point
 * @param {{x: number, y: number}} out - Written
 * @returns {{x: number, y: number}} out
 */
export function toWorld(inst, local, out) {
  const p = inst.pose
  out.x = p.x + (p.mirrored ? -local.x : local.x)
  out.y = p.y + local.y
  return out
}
//
// A picture point (px) in local coordinates: scaled, from the anchor
// joint.
//
function toLocal(origin, scale, p) {
  return { x: (p.x - origin.x) * scale, y: (p.y - origin.y) * scale }
}
function boneBetween(a, b) {
  const angle = Math.atan2(b.y - a.y, b.x - a.x)
  return { len: Math.hypot(b.x - a.x, b.y - a.y), angle, cos: Math.cos(angle), sin: Math.sin(angle) }
}
//
// A rest point's binding: the bone nearest it on the rest spine (and how
// far along it), eased into the neighbouring bone within `blend` of a
// joint; its weights in each attachment's soft region.
//
function bindOf(inst, p) {
  let best = 0
  let bestD = Infinity
  let bestT = 0
  inst.bones.forEach((bone, i) => {
    const a = inst.joints[i]
    const b = inst.joints[i + 1]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || EPS)))
    const d = Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t)
    if (d >= bestD) return
    best = i
    bestD = d
    bestT = t
  })
  const half = inst.blend / 2
  const last = inst.bones.length - 1
  let b0 = best
  let b1 = best
  let w1 = 0
  if (bestT < half && best > 0) {
    b0 = best - 1
    b1 = best
    w1 = ease(HALF + bestT / inst.blend)
  } else if (bestT > 1 - half && best < last) {
    b0 = best
    b1 = best + 1
    w1 = ease(HALF - (1 - bestT) / inst.blend)
  }
  const soft = inst.attachments.map(a => {
    const ex = (p.x - a.center.x) / a.rx
    const ey = (p.y - a.center.y) / a.ry
    return 1 - ease(Math.max(0, Math.min(1, (Math.hypot(ex, ey) - HALF) * 2)))
  })
  return { b0, b1, w0: 1 - w1, w1, soft }
}
//
// The triangles wholly on a cut's kept side.
//
function cutIndices(inst, cut) {
  const out = inst.cutIdx
  out.length = 0
  for (let t = 0; t < inst.indices.length; t += TRI) {
    const a = inst.indices[t]
    const b = inst.indices[t + 1]
    const c = inst.indices[t + 2]
    kept(inst, a, cut) && kept(inst, b, cut) && kept(inst, c, cut) && out.push(a, b, c)
  }
  return out
}
function kept(inst, i, cut) {
  return (inst.pts[i].x - cut.x) * cut.nx + (inst.pts[i].y - cut.y) * cut.ny >= 0
}
function ease(u) {
  return u * u * (3 - 2 * u)
}
//
// Skins a rest point: swung by its attachments about their anchors, then
// each of its two bones' rest-to-pose transforms (turned about the bone's
// first joint, moved to where that joint stands) blended by weight;
// placed in the world.
//
function skinInto(inst, rest, bind, out) {
  let x = rest.x
  let y = rest.y
  inst.attachments.forEach((a, i) => {
    const w = bind.soft[i]
    if (w <= 0) return
    const ang = inst.pose.swing[i] * w
    const c = Math.cos(ang)
    const s = Math.sin(ang)
    const dx = x - a.anchor.x
    const dy = y - a.anchor.y
    x = a.anchor.x + dx * c - dy * s
    y = a.anchor.y + dx * s + dy * c
  })
  const local = inst.acc
  local.x = 0
  local.y = 0
  addBone(inst, bind.b0, bind.w0, x, y, local)
  bind.w1 > 0 && addBone(inst, bind.b1, bind.w1, x, y, local)
  return toWorld(inst, local, out)
}
//
// A point carried by one bone: into the bone's rest frame (along, across),
// stretched along it, out along the bone as it stands now.
//
function addBone(inst, i, w, x, y, acc) {
  const bone = inst.bones[i]
  const p = inst.pose
  const rest = inst.joints[i]
  const now = p.joints[i]
  const dx = x - rest.x
  const dy = y - rest.y
  const along = (dx * bone.cos + dy * bone.sin) * p.stretch[i]
  const across = (-dx * bone.sin + dy * bone.cos) * p.roll
  acc.x += w * (now.x + along * p.cos[i] - across * p.sin[i])
  acc.y += w * (now.y + along * p.sin[i] + across * p.cos[i])
}
