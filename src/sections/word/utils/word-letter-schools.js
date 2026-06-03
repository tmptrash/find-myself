import { CFG } from '../cfg.js'

//
// Fish render behind brain (z=-89) and roots (z=-89.5), above playfield fill (z=-90)
// Using k.add with draw() component lets us specify an exact z in the scene sort order
//
const SCHOOL_Z = (CFG.visual.zIndex.wordPlayfieldFill ?? -90) + 0.2
const SCHOOL_BOID_COUNT = 24
const SCHOOL_ATTRACTOR_COUNT = 2
//
// Per-boid max speed is random within this range (units: pixels per 1/60 s frame)
//
const SCHOOL_SPEED_MIN = 0.7
const SCHOOL_SPEED_MAX = 2.4
const SCHOOL_MIN_SPEED = 0.4
//
// Boids steering forces (per frame)
//
const SCHOOL_ATTRACTOR_FORCE = 0.0055
const SCHOOL_ALIGNMENT_FORCE = 0.04
const SCHOOL_SEPARATION_DIST = 36
const SCHOOL_SEPARATION_FORCE = 0.16
const SCHOOL_NOISE_FORCE = 0.18
const SCHOOL_WALL_MARGIN = 50
const SCHOOL_WALL_FORCE = 0.05
//
// How fast each boid can rotate toward its target angle (radians per frame)
//
const SCHOOL_ROTATION_MAX = 0.14
//
// Vertical wobble perpendicular to movement
//
const SCHOOL_WOBBLE_AMP = 2.2
const SCHOOL_WOBBLE_FREQ = 8.5
//
// Fish body draw parameters
//
const SCHOOL_FONT_SIZE_MIN = 10
const SCHOOL_FONT_SIZE_RANGE = 6
const SCHOOL_TAIL_OPACITY = 0.24
const SCHOOL_BODY_OPACITY = 0.08
const SCHOOL_WORD_OPACITY = 0.70
//
// Attractor wander parameters (frame-rate units)
//
const SCHOOL_ATTRACTOR_SPEED = 1.6
const SCHOOL_ATTRACTOR_TURN = 0.04
//
// Purple-violet tones adapted to the word section palette
//
const SCHOOL_COLOR_DEFS = [
  { r: 122, g: 90, b: 154 },
  { r: 154, g: 122, b: 186 },
  { r: 90, g: 60, b: 120 },
  { r: 107, g: 80, b: 128 },
  { r: 138, g: 106, b: 168 },
  { r: 74, g: 48, b: 96 },
  { r: 175, g: 144, b: 204 }
]
//
// Game-themed words matching the word section's emotional vocabulary
//
const SCHOOL_WORDS = [
  'find', 'you', 'lost', 'self', 'fear', 'hope', 'void', 'light',
  'dark', 'dream', 'wake', 'fall', 'rise', 'truth', 'lie', 'real',
  'run', 'hide', 'feel', 'know', 'want', 'need', 'help', 'save'
]

/**
 * Spawns a school of word-fish using boids flocking, drawn inside the playfield background
 * @param {Object} k - Kaplay instance
 * @param {Object} layout - Playfield bounds
 * @param {number} layout.topPlatformHeight - Y where playfield starts
 * @param {number} layout.bottomPlatformHeight - Height of bottom platform in px
 * @param {number} layout.sideWallWidth - Width of side walls in px
 * @returns {Object} School inst
 */
export function create(k, layout) {
  const { topPlatformHeight = 360, bottomPlatformHeight = 86, sideWallWidth = 192 } = layout ?? {}
  const playLeft = sideWallWidth
  const playTop = topPlatformHeight
  const playWidth = k.width() - sideWallWidth * 2
  const playHeight = k.height() - topPlatformHeight - bottomPlatformHeight
  const inst = { k, boids: [], attractors: [], playLeft, playTop, playWidth, playHeight }
  for (let i = 0; i < SCHOOL_ATTRACTOR_COUNT; i++) {
    inst.attractors.push({
      x: playLeft + playWidth * (0.25 + i * 0.5),
      y: playTop + playHeight * (0.3 + (i % 2) * 0.4),
      angle: Math.random() * Math.PI * 2,
      tx: playLeft + Math.random() * playWidth,
      ty: playTop + Math.random() * playHeight,
      timer: Math.random() * 100,
      interval: 80 + Math.random() * 140
    })
  }
  for (let i = 0; i < SCHOOL_BOID_COUNT; i++) {
    const colorDef = SCHOOL_COLOR_DEFS[i % SCHOOL_COLOR_DEFS.length]
    inst.boids.push({
      x: playLeft + Math.random() * playWidth,
      y: playTop + Math.random() * playHeight,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      angle: Math.random() * Math.PI * 2,
      word: SCHOOL_WORDS[i % SCHOOL_WORDS.length],
      color: k.rgb(colorDef.r, colorDef.g, colorDef.b),
      size: SCHOOL_FONT_SIZE_MIN + Math.random() * SCHOOL_FONT_SIZE_RANGE,
      maxSpeed: SCHOOL_SPEED_MIN + Math.random() * (SCHOOL_SPEED_MAX - SCHOOL_SPEED_MIN),
      wobblePhase: Math.random() * Math.PI * 2,
      noiseOffX: Math.random() * 1000,
      noiseOffY: Math.random() * 1000,
      attractorBias: i % SCHOOL_ATTRACTOR_COUNT,
      biasTimer: Math.random() * 200,
      biasInterval: 150 + Math.random() * 200
    })
  }
  k.onUpdate(() => onUpdate(inst))
  //
  // draw() component on a k.add object participates in the global z-sort,
  // placing fish behind brain (-89) and roots (-89.5) but above fill (-90)
  //
  k.add([
    k.z(SCHOOL_Z),
    k.fixed(),
    { draw() { onDraw(inst) } }
  ])
  return inst
}

//
// Advances attractor wander and boid steering each frame
//
function onUpdate(inst) {
  const { k, boids, attractors, playLeft, playTop, playWidth, playHeight } = inst
  const dt = k.dt()
  //
  // Scale factor: dt * 60 converts per-frame units to real-time (60 fps baseline)
  //
  const f = dt * 60
  updateAttractors(attractors, playLeft, playTop, playWidth, playHeight, f)
  updateBoids(boids, attractors, playLeft, playTop, playWidth, playHeight, f, k.time())
}

//
// Wanders each attractor toward random targets, bouncing off playfield edges
//
function updateAttractors(attractors, playLeft, playTop, playWidth, playHeight, f) {
  const margin = 90
  attractors.forEach(a => {
    a.timer += f
    if (a.timer >= a.interval) {
      a.timer = 0
      a.interval = 70 + Math.random() * 150
      a.tx = playLeft + margin + Math.random() * (playWidth - margin * 2)
      a.ty = playTop + margin + Math.random() * (playHeight - margin * 2)
    }
    const dx = a.tx - a.x, dy = a.ty - a.y
    const desired = Math.atan2(dy, dx)
    let diff = desired - a.angle
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    a.angle += diff * SCHOOL_ATTRACTOR_TURN
    a.x += Math.cos(a.angle) * SCHOOL_ATTRACTOR_SPEED * f
    a.y += Math.sin(a.angle) * SCHOOL_ATTRACTOR_SPEED * f
    a.x = Math.max(playLeft + 20, Math.min(playLeft + playWidth - 20, a.x))
    a.y = Math.max(playTop + 20, Math.min(playTop + playHeight - 20, a.y))
  })
}

//
// Applies separation, alignment, attractor pull, noise, and wall avoidance to each boid
//
function updateBoids(boids, attractors, playLeft, playTop, playWidth, playHeight, f, time) {
  let avx = 0, avy = 0
  boids.forEach(b => { avx += b.vx; avy += b.vy })
  avx /= boids.length; avy /= boids.length
  boids.forEach(b => {
    let ax = 0, ay = 0
    b.biasTimer += f
    if (b.biasTimer >= b.biasInterval) {
      b.biasTimer = 0
      b.biasInterval = 120 + Math.random() * 220
      b.attractorBias = Math.floor(Math.random() * attractors.length)
    }
    const att = attractors[b.attractorBias]
    const adx = att.x - b.x, ady = att.y - b.y
    const adist = Math.sqrt(adx * adx + ady * ady) + 0.001
    ax += (adx / adist) * Math.min(adist, 180) * SCHOOL_ATTRACTOR_FORCE
    ay += (ady / adist) * Math.min(adist, 180) * SCHOOL_ATTRACTOR_FORCE
    ax += (avx - b.vx) * SCHOOL_ALIGNMENT_FORCE
    ay += (avy - b.vy) * SCHOOL_ALIGNMENT_FORCE
    boids.forEach(other => {
      if (other === b) return
      const dx = b.x - other.x, dy = b.y - other.y
      const d2 = dx * dx + dy * dy
      if (d2 < SCHOOL_SEPARATION_DIST * SCHOOL_SEPARATION_DIST && d2 > 0) {
        const d = Math.sqrt(d2)
        ax += (dx / d) * SCHOOL_SEPARATION_FORCE * (SCHOOL_SEPARATION_DIST / d)
        ay += (dy / d) * SCHOOL_SEPARATION_FORCE * (SCHOOL_SEPARATION_DIST / d)
      }
    })
    ax += schoolNoise(time + b.noiseOffX) * SCHOOL_NOISE_FORCE
    ay += schoolNoise(time * 0.7 + b.noiseOffY + 5) * SCHOOL_NOISE_FORCE
    applyWallForce(b, ax, ay, playLeft, playTop, playWidth, playHeight)
    b.vx += ax * f
    b.vy += ay * f
    const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
    if (spd > b.maxSpeed) { b.vx = b.vx / spd * b.maxSpeed; b.vy = b.vy / spd * b.maxSpeed }
    if (spd < SCHOOL_MIN_SPEED && spd > 0) { b.vx = b.vx / spd * SCHOOL_MIN_SPEED; b.vy = b.vy / spd * SCHOOL_MIN_SPEED }
    const desired = Math.atan2(b.vy, b.vx)
    let diff = desired - b.angle
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    b.angle += Math.max(-SCHOOL_ROTATION_MAX, Math.min(SCHOOL_ROTATION_MAX, diff))
    b.x += b.vx * f
    b.y += b.vy * f
  })
}

//
// Pushes boid away from playfield walls
//
function applyWallForce(b, ax, ay, playLeft, playTop, playWidth, playHeight) {
  if (b.x < playLeft + SCHOOL_WALL_MARGIN) ax += (playLeft + SCHOOL_WALL_MARGIN - b.x) * SCHOOL_WALL_FORCE
  if (b.x > playLeft + playWidth - SCHOOL_WALL_MARGIN) ax -= (b.x - (playLeft + playWidth - SCHOOL_WALL_MARGIN)) * SCHOOL_WALL_FORCE
  if (b.y < playTop + SCHOOL_WALL_MARGIN) ay += (playTop + SCHOOL_WALL_MARGIN - b.y) * SCHOOL_WALL_FORCE
  if (b.y > playTop + playHeight - SCHOOL_WALL_MARGIN) ay -= (b.y - (playTop + playHeight - SCHOOL_WALL_MARGIN)) * SCHOOL_WALL_FORCE
}

//
// Draws each fish with tail fin, body ellipse, and word text
//
function onDraw(inst) {
  const { k, boids } = inst
  const t = k.time()
  boids.slice().sort((a, b) => a.y - b.y).forEach(b => drawBoid(k, b, t))
}

function drawBoid(k, b, t) {
  const s = b.size
  const cos = Math.cos(b.angle)
  const sin = Math.sin(b.angle)
  const wobble = Math.sin(t * SCHOOL_WOBBLE_FREQ + b.wobblePhase) * SCHOOL_WOBBLE_AMP
  const perpX = -sin * wobble, perpY = cos * wobble
  //
  // Rotate local offset (lx, ly) into world space around boid center
  //
  function world(lx, ly) {
    return k.vec2(b.x + lx * cos - ly * sin + perpX, b.y + lx * sin + ly * cos + perpY)
  }
  k.drawPolygon({
    pts: [
      world(-s * 0.85, 0),
      world(-s * 1.25, -s * 0.25),
      world(-s * 1.17, 0),
      world(-s * 1.25, s * 0.25)
    ],
    color: b.color,
    opacity: SCHOOL_TAIL_OPACITY,
    fill: true
  })
  k.drawEllipse({
    pos: world(-s * 0.1, 0),
    radiusX: s * 0.55,
    radiusY: s * 0.22,
    angle: b.angle * (180 / Math.PI),
    color: b.color,
    opacity: SCHOOL_BODY_OPACITY,
    fill: true
  })
  k.drawText({
    text: b.word,
    pos: k.vec2(b.x + perpX, b.y + perpY),
    angle: b.angle * (180 / Math.PI),
    color: b.color,
    size: s,
    anchor: 'center',
    opacity: SCHOOL_WORD_OPACITY
  })
}

//
// Smooth deterministic pseudo-noise for organic drift — sum of three sine harmonics
//
function schoolNoise(x) {
  return Math.sin(x * 1.2) * 0.5 + Math.sin(x * 2.7 + 1.3) * 0.3 + Math.sin(x * 0.4 + 2.1) * 0.2
}
