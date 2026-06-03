import { CFG } from '../cfg.js'

//
// Words that float left-to-right then burst into individual falling letters (leaf fall effect)
//
const CASCADE_WORDS = [
  'find', 'you', 'lost', 'self', 'fear', 'soul', 'mind', 'echo',
  'dark', 'free', 'gone', 'real', 'void', 'feel', 'wake', 'near',
  'here', 'know', 'save', 'run', 'pain', 'hope', 'truth', 'seen'
]
const CASCADE_ACTIVE_COUNT = 4
const CASCADE_SPAWN_INTERVAL_MIN = 3.5
const CASCADE_SPAWN_INTERVAL_MAX = 7.0
//
// Horizontal drift speed (pixels/s) — words float lazily right
//
const CASCADE_FLOAT_SPEED_MIN = 16
const CASCADE_FLOAT_SPEED_MAX = 32
//
// Time before dissolving (s) — so words are visible for a while before bursting
//
const CASCADE_FLOAT_DURATION_MIN = 4.0
const CASCADE_FLOAT_DURATION_MAX = 8.5
const CASCADE_FONT_SIZE = 20
const CASCADE_WORD_OPACITY = 0.52
//
// Particle physics — leaf-like fall after dissolve
//
const CASCADE_PARTICLE_GRAVITY = 55
const CASCADE_PARTICLE_FALL_MIN = 18
const CASCADE_PARTICLE_FALL_MAX = 72
const CASCADE_PARTICLE_SWING = 26
const CASCADE_PARTICLE_FADE_DURATION = 3.2
//
// Small upward pop on burst before gravity pulls down
//
const CASCADE_PARTICLE_INITIAL_UP = 35
//
// Leaf-like spin — random direction, moderate speed so tumbling reads clearly
//
const CASCADE_PARTICLE_SPIN_MIN = 60
const CASCADE_PARTICLE_SPIN_MAX = 200
//
// Approximate per-character width used to spread burst positions
//
const CASCADE_CHAR_STEP = CASCADE_FONT_SIZE * 0.58
//
// Violet-purple hue to match section palette
//
const CASCADE_COLOR_R = 155
const CASCADE_COLOR_G = 105
const CASCADE_COLOR_B = 210
//
// Z sits slightly behind regular flying words, visible over background layers
//
const CASCADE_Z = (CFG.visual.zIndex.wordFlyingWords ?? -85) - 0.5

/**
 * Creates floating words that drift left-to-right, dissolve into falling letter particles
 * @param {Object} k - Kaplay instance
 * @param {Object} layout - Layout configuration
 * @param {number} layout.topPlatformHeight - Top platform height in pixels
 * @param {number} layout.bottomPlatformHeight - Bottom platform height in pixels
 * @param {number} layout.sideWallWidth - Side wall width in pixels
 * @returns {Object} Cascade instance
 */
export function create(k, layout) {
  const { topPlatformHeight, bottomPlatformHeight, sideWallWidth } = layout
  const playLeft = sideWallWidth
  const playRight = k.width() - sideWallWidth
  const playTop = topPlatformHeight
  const playBottom = k.height() - bottomPlatformHeight
  const inst = {
    k,
    playLeft,
    playRight,
    playTop,
    playBottom,
    words: [],
    particles: [],
    spawnTimer: CASCADE_SPAWN_INTERVAL_MIN + Math.random() * CASCADE_SPAWN_INTERVAL_MAX
  }
  k.add([
    k.pos(0, 0),
    k.z(CASCADE_Z),
    k.fixed(),
    { draw() { onDraw(inst) } }
  ])
  k.onUpdate(() => onUpdate(inst))
  return inst
}

//
// Advances floating words and falling letter particles each frame
//
function onUpdate(inst) {
  const { k } = inst
  const dt = k.dt()
  inst.spawnTimer -= dt
  if (inst.spawnTimer <= 0 && inst.words.length < CASCADE_ACTIVE_COUNT) {
    inst.spawnTimer = CASCADE_SPAWN_INTERVAL_MIN + Math.random() * (CASCADE_SPAWN_INTERVAL_MAX - CASCADE_SPAWN_INTERVAL_MIN)
    spawnWord(inst)
  }
  //
  // Move floating words right; dissolve when time or off-screen
  //
  for (let i = inst.words.length - 1; i >= 0; i--) {
    const w = inst.words[i]
    w.x += w.speed * dt
    w.age += dt
    if (w.age >= w.duration || w.x > inst.playRight + CASCADE_FONT_SIZE * 8) {
      dissolveWord(inst, w)
      inst.words.splice(i, 1)
    }
  }
  //
  // Advance letter particles: gravity + horizontal swing + leaf tumble + fade
  //
  for (let i = inst.particles.length - 1; i >= 0; i--) {
    const p = inst.particles[i]
    p.vy += CASCADE_PARTICLE_GRAVITY * dt
    p.x += (p.vx + Math.sin(p.swingPhase) * CASCADE_PARTICLE_SWING) * dt
    p.y += p.vy * dt
    p.swingPhase += p.swingSpeed * dt
    p.angle += p.angularVelocity * dt
    p.age += dt
    p.opacity = Math.max(0, 1 - p.age / CASCADE_PARTICLE_FADE_DURATION) * CASCADE_WORD_OPACITY
    if (p.opacity <= 0 || p.y > inst.playBottom + 140) inst.particles.splice(i, 1)
  }
}

//
// Spawns a new word entering from the left at a random height
//
function spawnWord(inst) {
  const word = CASCADE_WORDS[Math.floor(Math.random() * CASCADE_WORDS.length)]
  const wordWidth = word.length * CASCADE_CHAR_STEP
  const y = inst.playTop + (inst.playBottom - inst.playTop) * (0.08 + Math.random() * 0.58)
  inst.words.push({
    word,
    x: inst.playLeft - wordWidth * 0.5,
    y,
    speed: CASCADE_FLOAT_SPEED_MIN + Math.random() * (CASCADE_FLOAT_SPEED_MAX - CASCADE_FLOAT_SPEED_MIN),
    age: 0,
    duration: CASCADE_FLOAT_DURATION_MIN + Math.random() * (CASCADE_FLOAT_DURATION_MAX - CASCADE_FLOAT_DURATION_MIN)
  })
}

//
// Converts a floating word into individual letter particles with leaf-like physics
//
function dissolveWord(inst, w) {
  const totalWidth = w.word.length * CASCADE_CHAR_STEP
  const startX = w.x - totalWidth * 0.5
  w.word.split('').forEach((char, idx) => {
    //
    // Each letter gets a slightly different horizontal drift and swing so they scatter visually
    //
    //
    // Random spin: positive or negative direction so letters tumble in both ways
    //
    const spinMag = CASCADE_PARTICLE_SPIN_MIN + Math.random() * (CASCADE_PARTICLE_SPIN_MAX - CASCADE_PARTICLE_SPIN_MIN)
    inst.particles.push({
      char,
      x: startX + idx * CASCADE_CHAR_STEP,
      y: w.y,
      vx: (Math.random() - 0.5) * 52,
      vy: -(CASCADE_PARTICLE_INITIAL_UP * (0.5 + Math.random() * 0.7)),
      swingPhase: Math.random() * Math.PI * 2,
      swingSpeed: 1.6 + Math.random() * 2.4,
      angle: Math.random() * 360,
      angularVelocity: spinMag * (Math.random() < 0.5 ? 1 : -1),
      age: 0,
      opacity: CASCADE_WORD_OPACITY
    })
  })
}

//
// Renders floating words and falling letter particles
//
function onDraw(inst) {
  const { k } = inst
  const color = k.rgb(CASCADE_COLOR_R, CASCADE_COLOR_G, CASCADE_COLOR_B)
  inst.words.forEach(w => {
    k.drawText({
      text: w.word,
      pos: k.vec2(w.x, w.y),
      size: CASCADE_FONT_SIZE,
      color,
      anchor: 'center',
      opacity: CASCADE_WORD_OPACITY
    })
  })
  inst.particles.forEach(p => {
    k.drawText({
      text: p.char,
      pos: k.vec2(p.x, p.y),
      size: Math.round(CASCADE_FONT_SIZE * 0.88),
      color,
      anchor: 'center',
      angle: p.angle,
      opacity: p.opacity
    })
  })
}
