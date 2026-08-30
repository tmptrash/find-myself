import { glowRgb } from './glow-palette.js'
//
// Foot burst particles for glow level landings
//
const LANDING_COUNT = 10
const PARTICLE_Z = 19
const GRAVITY = 540
const LANDING_SPEED_MIN = 90
const LANDING_SPEED_RANGE = 140
//
// Wide radial burst (death, big impacts) — angles cover a full arc from
// low-left to low-right through straight up, so plenty of particles always
// shoot upward instead of just a shallow forward-up puff like a footstep.
//
const BURST_SPEED_MIN = 110
const BURST_SPEED_RANGE = 220
const BURST_ANGLE_MIN_DEG = 15
const BURST_ANGLE_RANGE_DEG = 150
//
// Leaf-shaped burst (hero death) — teardrop leaves instead of dust squares,
// tumbling outward with their own spin. Sized and timed like the touch
// section's own death-leaf burst (lesson1.js) so it reads as a clear
// "the hero scattered into leaves" beat rather than a quick dust puff —
// big enough to read at a glance and slow-falling enough (reduced gravity)
// to stay on screen through the death countdown.
//
const LEAF_SIZE_MIN = 10
const LEAF_SIZE_RANGE = 9
const LEAF_ROT_SPEED_RANGE = 420
const LEAF_BEZIER_STEPS = 6
const LEAF_GRAVITY_SCALE = 0.55
//
// Once past the initial outward burst, leaves settle into a gentle
// wind-blown flutter down to the ground instead of continuing to
// accelerate — same fall character as the touch section's own falling
// leaves (see falling-leaf.js): a capped descent speed plus a side-to-side
// sine sway, so they visibly drift down and land rather than just hanging
// mid-air fading out on a timer.
//
const LEAF_MAX_FALL_SPEED = 135
const LEAF_FLUTTER_SPEED_MIN = 1.5
const LEAF_FLUTTER_SPEED_RANGE = 2
const LEAF_FLUTTER_AMPLITUDE = 26
//
// Fraction of horizontal burst velocity still remaining after one full
// second — decays the initial outward scatter speed away so leaves settle
// into the gentle flutter above instead of drifting sideways indefinitely.
//
const LEAF_HORIZONTAL_DRAG_PER_SEC = 0.15
//
// Once a leaf reaches the ground it rests there (still gently spinning
// down) for LEAF_GROUND_LINGER seconds and only then fades out over
// LEAF_GROUND_FADE — the hero visibly scatters into leaves that settle on
// the floor before disappearing.
//
const LEAF_GROUND_LINGER = 1.4
const LEAF_GROUND_FADE = 0.55
const LEAF_GROUND_SPIN_DECAY = 0.9
//
// Cache of pre-built leaf polygon point sets, keyed by rounded size —
// avoids rebuilding the same small point array for every particle.
//
const leafPointsCache = new Map()
//
// Creates the foot-particle pool and a single draw pass for the level scene
//
export function create(cfg) {
  const { k } = cfg
  const inst = {
    k,
    particles: [],
    drawHook: null
  }
  inst.drawHook = k.add([
    k.z(PARTICLE_Z),
    {
      draw() {
        drawParticles(inst)
      }
    }
  ])
  return inst
}
//
// Ages and moves every live foot particle
//
export function onUpdate(inst, dt) {
  if (!inst?.particles?.length) return
  for (let i = inst.particles.length - 1; i >= 0; i--) {
    const p = inst.particles[i]
    p.age += dt
    p.shape === 'leaf' ? updateLeafParticle(p, dt) : updateDustParticle(p, dt)
    p.age >= p.life && inst.particles.splice(i, 1)
  }
}
//
// Clears all live foot burst particles (e.g. water landing before drowning).
//
export function clear(inst) {
  inst && (inst.particles = [])
}
//
// Splash on landing — countMult scales density (crack stomps use a higher mult)
//
export function spawnLanding(inst, footX, footY, color, countMult = 1) {
  if (!inst) return
  if (import.meta.env.DEV) {
    window.__glowFootSpawnTotal = (window.__glowFootSpawnTotal || 0) + 1
  }
  const count = Math.round(LANDING_COUNT * countMult)
  for (let i = 0; i < count; i++) {
    pushParticle(inst, footX, footY, color, LANDING_SPEED_MIN, LANDING_SPEED_RANGE, true)
  }
}
//
// Wide radial burst (e.g. a hedgehog-touch death) — more particles than a
// footstep, spread through a much wider arc so a good share fly straight up.
//
export function spawnBurst(inst, x, y, color, count) {
  if (!inst) return
  for (let i = 0; i < count; i++) {
    pushBurstParticle(inst, x, y, color)
  }
}
//
// Leaf-shaped radial burst (e.g. a hedgehog-touch death) — same wide arc as
// spawnBurst, but tumbling teardrop leaves instead of squares. colors may
// be a single colour or a palette array; each leaf picks one at random so
// the burst reads as a scatter of individual leaves. groundY, if given, is
// the line each leaf actually flutters down to and lands on (see
// updateLeafParticle) rather than just hanging in the air until it fades.
//
export function spawnLeafBurst(inst, x, y, colors, count, groundY = null) {
  if (!inst) return
  const palette = Array.isArray(colors) ? colors : [colors || glowRgb('void')]
  for (let i = 0; i < count; i++) {
    pushLeafBurstParticle(inst, x, y, palette[Math.floor(Math.random() * palette.length)], groundY)
  }
}
//
// Private helpers
//
function pushParticle(inst, footX, footY, color, speedMin, speedRange, splash) {
  const side = splash ? (Math.random() < 0.5 ? -1 : 1) : (Math.random() < 0.5 ? -1 : 1)
  const angle = (5 + Math.random() * 28) * (Math.PI / 180)
  const speed = speedMin + Math.random() * speedRange
  const c = color || glowRgb('void')
  inst.particles.push({
    x: footX + side * (4 + Math.random() * 14),
    y: footY - 2 + Math.random() * 4,
    vx: Math.cos(angle) * speed * side * (splash ? 1 : 0.65),
    vy: -Math.sin(angle) * speed * (splash ? 1 : 1.15),
    life: 0.35 + Math.random() * 0.45,
    age: 0,
    size: 2 + Math.random() * 4,
    r: c.r,
    g: c.g,
    b: c.b
  })
}
function pushBurstParticle(inst, x, y, color) {
  const side = Math.random() < 0.5 ? -1 : 1
  const angle = (BURST_ANGLE_MIN_DEG + Math.random() * BURST_ANGLE_RANGE_DEG) * (Math.PI / 180)
  const speed = BURST_SPEED_MIN + Math.random() * BURST_SPEED_RANGE
  const c = color || glowRgb('void')
  inst.particles.push({
    x: x + side * (2 + Math.random() * 10),
    y: y - 4 + Math.random() * 8,
    vx: Math.cos(angle) * speed * side,
    vy: -Math.sin(angle) * speed,
    life: 0.5 + Math.random() * 0.6,
    age: 0,
    size: 3 + Math.random() * 5,
    r: c.r,
    g: c.g,
    b: c.b
  })
}
function pushLeafBurstParticle(inst, x, y, color, groundY) {
  const side = Math.random() < 0.5 ? -1 : 1
  const angle = (BURST_ANGLE_MIN_DEG + Math.random() * BURST_ANGLE_RANGE_DEG) * (Math.PI / 180)
  const speed = BURST_SPEED_MIN + Math.random() * BURST_SPEED_RANGE
  const c = color || glowRgb('void')
  const size = LEAF_SIZE_MIN + Math.random() * LEAF_SIZE_RANGE
  inst.particles.push({
    x: x + side * (2 + Math.random() * 10),
    y: y - 4 + Math.random() * 8,
    vx: Math.cos(angle) * speed * side,
    vy: -Math.sin(angle) * speed,
    life: Infinity,
    age: 0,
    fadeFrom: null,
    size,
    r: c.r,
    g: c.g,
    b: c.b,
    shape: 'leaf',
    pts: buildLeafPoints(inst.k, size),
    angle: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * LEAF_ROT_SPEED_RANGE,
    gravityScale: LEAF_GRAVITY_SCALE,
    groundY,
    landed: false,
    wavePhase: Math.random() * Math.PI * 2,
    waveSpeed: LEAF_FLUTTER_SPEED_MIN + Math.random() * LEAF_FLUTTER_SPEED_RANGE
  })
}
//
// Plain dust/spark particle — unmodified ballistic arc under full gravity.
//
function updateDustParticle(p, dt) {
  p.vy += GRAVITY * dt
  p.x += p.vx * dt
  p.y += p.vy * dt
}
//
// Leaf particle — bursts outward same as dust, but once the outward
// velocity decays past the fall-speed cap it settles into a slow,
// wind-blown flutter (capped fall speed + side sway) down to groundY, then
// lingers briefly, spinning down, before fading out — same fall/settle
// character as the touch section's own falling leaves.
//
function updateLeafParticle(p, dt) {
  if (p.landed) {
    p.groundLinger = (p.groundLinger ?? 0) + dt
    p.rotSpeed *= LEAF_GROUND_SPIN_DECAY
    p.angle += p.rotSpeed * dt
    p.groundLinger >= LEAF_GROUND_LINGER && startLeafFade(p)
    return
  }
  p.vy += GRAVITY * LEAF_GRAVITY_SCALE * dt
  p.vy > LEAF_MAX_FALL_SPEED && (p.vy = LEAF_MAX_FALL_SPEED)
  p.vx *= Math.pow(LEAF_HORIZONTAL_DRAG_PER_SEC, dt)
  p.wavePhase += p.waveSpeed * dt
  const flutter = Math.sin(p.wavePhase) * LEAF_FLUTTER_AMPLITUDE
  p.x += (p.vx + flutter) * dt
  p.y += p.vy * dt
  p.angle += p.rotSpeed * dt
  if (p.groundY != null && p.y >= p.groundY) {
    p.y = p.groundY
    p.landed = true
    p.groundLinger = 0
    p.vx = 0
    p.vy = 0
  }
}
//
// Builds a small teardrop leaf polygon (two quadratic-bezier halves) at
// local origin, cached by rounded size so repeated bursts reuse the array.
//
function buildLeafPoints(k, size) {
  const key = Math.round(size * 2) / 2
  if (leafPointsCache.has(key)) return leafPointsCache.get(key)
  const pts = []
  for (let i = 0; i <= LEAF_BEZIER_STEPS; i++) {
    const t = i / LEAF_BEZIER_STEPS
    const oneMinusT = 1 - t
    const px = 2 * oneMinusT * t * (-size * 0.6)
    const py = 2 * oneMinusT * t * (-size * 0.3) + t * t * (-size)
    pts.push(k.vec2(px, py))
  }
  for (let i = 0; i <= LEAF_BEZIER_STEPS; i++) {
    const t = i / LEAF_BEZIER_STEPS
    const oneMinusT = 1 - t
    const px = 2 * oneMinusT * t * (size * 0.6)
    const py = oneMinusT * oneMinusT * (-size) + 2 * oneMinusT * t * (-size * 0.3)
    pts.push(k.vec2(px, py))
  }
  leafPointsCache.set(key, pts)
  return pts
}
function drawParticles(inst) {
  const k = inst.k
  for (const p of inst.particles) {
    if (p.shape === 'leaf') {
      drawLeafParticle(k, p, leafOpacity(p))
      continue
    }
    const opacity = Math.max(0, 1 - p.age / p.life)
    k.drawRect({
      pos: k.vec2(p.x, p.y),
      width: p.size,
      height: p.size,
      color: k.rgb(p.r, p.g, p.b),
      opacity
    })
  }
}
//
// Draws one leaf particle rotated in place around its own centre. Points
// are rotated/translated by hand into world space rather than through
// k.pushTransform()/popTransform() — that push-matrix stack doesn't end up
// applied to drawPolygon() in this Kaplay build, which silently drew every
// leaf at the wrong (invisible) spot.
//
//
// Arms the fade-out: from here on the leaf has LEAF_GROUND_FADE seconds
// left, after which onUpdate() drops it from the pool.
//
function startLeafFade(p) {
  if (p.fadeFrom != null) return
  p.fadeFrom = p.age
  p.life = p.age + LEAF_GROUND_FADE
}
//
// Leaves stay fully opaque all the way down and only dissolve once resting
// on the ground, unlike dust which fades across its whole lifespan.
//
function leafOpacity(p) {
  if (p.fadeFrom == null) return 1
  return Math.max(0, 1 - (p.age - p.fadeFrom) / LEAF_GROUND_FADE)
}
function drawLeafParticle(k, p, opacity) {
  const rad = p.angle * Math.PI / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const pts = p.pts.map(pt => k.vec2(p.x + pt.x * cos - pt.y * sin, p.y + pt.x * sin + pt.y * cos))
  k.drawPolygon({ pts, color: k.rgb(p.r, p.g, p.b), opacity })
}
