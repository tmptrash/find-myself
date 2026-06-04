import { CFG, getConsciousnessColor, depthConsciousnessColor, atmosphericDepthColor } from '../cfg.js'
import { getRGB, toCanvas } from '../../../utils/helper.js'
import { growTreeRootSegments } from '../../../utils/grow-tree-root.js'
import { getFigureSpriteKey, getMoonSpriteKey, getTouchMoonSpriteKey, getTimeSunSpriteKey, getBrainSpriteKey, computeBrainFitSize } from './word-consciousness-art.js'

//
// Baked sprite draw sizes (match word-consciousness-art.js)
//
const FIGURE_SPRITE_H = 160

//
// Layer counts — tuned for subtle peripheral motion, not visual clutter
//
const THOUGHT_SKY_COUNT = 42
//
// No noise silhouette types remain after removing trees, forks, people, hand, houses
//
const NOISE_SILHOUETTE_COUNT = 0
const THOUGHT_STREAM_COUNT = 52
const CELESTIAL_COUNT = 5
const FOREGROUND_PIECE_COUNT = 5
//
// Text clouds disabled — their large grouped phrase text was the source of "big dark words"
//
const TEXT_CLOUD_COUNT = 0
const DRIFT_MOTIF_COUNT = 22
const MOTIF_FADE_PERIOD_MIN = 9
const MOTIF_FADE_PERIOD_MAX = 22
const MOTIF_FADE_MIN_OPACITY = 0.04
const DRIFT_MOTIF_MAX_OPACITY = 0.68
//
// Wrap-fade: items fade out before teleporting to the opposite edge, then fade back in
//
const WRAP_BUFFER = 80
const WRAP_FADE_SPEED = 3.0
const MOON_DEPTH_BLEND_MIN = 0.55
const MOON_DEPTH_BLEND_MAX = 0.82
const BRAIN_PLAYFIELD_HEIGHT_RATIO = 0.5
const BRAIN_MAX_WIDTH_RATIO = 0.78
const BRAIN_PULSE_SPEED = 0.42
const BRAIN_SIZE_PULSE = 0.05
const BRAIN_TINT_COOL_R = 142
const BRAIN_TINT_COOL_G = 136
const BRAIN_TINT_COOL_B = 172
const BRAIN_TINT_WARM_R = 188
const BRAIN_TINT_WARM_G = 178
const BRAIN_TINT_WARM_B = 212
//
// Neural root lines behind the brain — vine-palette violet filaments
//
const BRAIN_ROOT_ARM_COUNT = 20
const BRAIN_ROOT_SEGMENTS = 58
const BRAIN_ROOT_THICKNESS = 10
//
// Root filament color — shifted toward playfield background (#5A5A70) so roots read
// as a subtle structural element rather than a bright accent
//
const BRAIN_ROOT_COLOR_R = 108
const BRAIN_ROOT_COLOR_G = 100
const BRAIN_ROOT_COLOR_B = 148
//
// Word-runner color is kept at the original brighter tint so runners are legible
// even when the root lines they travel on are muted
//
const BRAIN_ROOT_RUNNER_COLOR_R = 168
const BRAIN_ROOT_RUNNER_COLOR_G = 154
const BRAIN_ROOT_RUNNER_COLOR_B = 204
const BRAIN_ROOT_BASE_OPACITY = 0.52
const BRAIN_ROOT_DEPTH_FADE = 0.07
//
// Root word runners — small words that travel outward along root segments from the brain
//
const ROOT_RUNNER_WORDS = [
  'find', 'you', 'lost', 'self', 'fear', 'hope', 'void', 'dark',
  'dream', 'wake', 'real', 'truth', 'feel', 'know', 'save', 'run',
  'echo', 'soul', 'mind', 'near', 'gone', 'here', 'free', 'see'
]
const ROOT_RUNNER_SPEED = 95
const ROOT_RUNNER_SPAWN_INTERVAL_MIN = 0.2
const ROOT_RUNNER_SPAWN_INTERVAL_MAX = 0.9
const ROOT_RUNNER_MAX_COUNT = 120
const ROOT_RUNNER_FONT_MAX = 13
const ROOT_RUNNER_FONT_MIN = 4
const ROOT_RUNNER_OPACITY = 0.58
const ROOT_RUNNER_FADE_SPEED = 2.0
const LAYER_DRAW_OPACITY = 1
//
// Size ranges — wide spread so each level start feels unique
//
//
// Sky and text sizes capped very small — user wants no large dark words
//
const SKY_SIZE_MIN = 7
const SKY_SIZE_MAX = 11
const CLOUD_TEXT_SIZE_MIN = 7
const CLOUD_TEXT_SIZE_MAX = 10
const NOISE_SCALE_MIN = 0.35
const NOISE_SCALE_MAX = 4.8
const STREAM_SIZE_MIN = 7
const STREAM_SIZE_MAX = 11
//
// Celestial layer — small purple glows, touch moon, time sun
//
const CELESTIAL_KIND_TOUCH_MOON = 'touchMoon'
const CELESTIAL_KIND_TIME_SUN = 'timeSun'
//
// Only moons and suns — glow circles removed (user found them too grey/distracting)
//
const CELESTIAL_KIND_ORDER = [
  CELESTIAL_KIND_TOUCH_MOON,
  CELESTIAL_KIND_TOUCH_MOON,
  CELESTIAL_KIND_TIME_SUN,
  CELESTIAL_KIND_TOUCH_MOON,
  CELESTIAL_KIND_TIME_SUN
]
const CELESTIAL_MOON_SCALE_MIN = 0.42
const CELESTIAL_MOON_SCALE_MAX = 0.92
const CELESTIAL_SUN_SCALE_MIN = 0.34
const CELESTIAL_SUN_SCALE_MAX = 0.72
const CELESTIAL_MOON_OPACITY = 0.68
const CELESTIAL_SUN_OPACITY = 0.52
const CELESTIAL_DEPTH_MIN = 0.52
const CELESTIAL_DEPTH_MAX = 0.82
//
// Floating note glyphs on the void
//
const NOTE_GLYPHS = ['♪', '♫', '♩', '♬']
//
// Drift speeds (pixels per second)
//
const SKY_DRIFT_MIN = 4
const SKY_DRIFT_MAX = 14
const NOISE_DRIFT_MIN = 6
const NOISE_DRIFT_MAX = 18
const STREAM_DRIFT_MIN = 10
const STREAM_DRIFT_MAX = 28
//
// Thought-sky fragments — barely readable whispers
//
const SKY_FRAGMENTS = [
  'maybe', '...', 'why', 'if only', 'remember', 'gone', 'almost',
  'never', 'always', 'somewhere', 'before', 'after', '?', '...',
  'not yet', 'again', 'still', 'almost', 'forget', 'hold on'
]
//
// Consciousness noise — shapes the brain tries to assemble
//
const NOISE_TYPES = []
//
// Thought stream — overlapping inner monologue debris
//
const STREAM_SYMBOLS = [
  '→', '←', '↔', '?', '!', '...', '×', '÷', '+', '−', '≈', '∞',
  'if', 'then', 'or', 'and', 'not', 'why', 'how', '∴', '∵', '~'
]
const STREAM_FORMULAS = [
  'x+y', 'a=b', 'n→∞', 'f(x)', 'Δt', '∫', 'Σ', '2+2', '0=1?', 'lim'
]
const STREAM_SCRIBBLES = [
  '~~~', '///', '|||', '***', '---', '...', '???', '!!!'
]
//
// Memory silhouettes — fleeting image flashes
//
//
// Foreground occlusion — dark forms at screen edges
//
const FOREGROUND_TYPES = ['branch', 'root', 'hand', 'thread', 'abstract']
//
// Intermittent phrase clouds — drift across the full dark void
//
const CLOUD_PHRASES = [
  ['cannot', 'sleep'],
  ['what', 'if'],
  ['they', 'know'],
  ['too', 'late'],
  ['almost', 'there'],
  ['why', 'me'],
  ['not', 'enough'],
  ['still', 'here'],
  ['remember', 'this'],
  ['say', 'something'],
  ['dont', 'look'],
  ['hold', 'on']
]
const CLOUD_WORD_GAP_BASE = 42
//
// Drift motif kinds — count and scale vary randomly each level start
//
//
// Crow sprites are baked once per instance at spawn time so onDraw uses a single
// k.drawSprite call instead of 6 per-frame shape calls
//
const CROW_BAKE_SCALE = 4
const DRIFT_KIND_DEFS = [
  { kind: 'crow', countMin: 1, countMax: 4, scaleMin: 0.5, scaleMax: 2.8, depthMin: 0.26, depthMax: 0.52 },
  { kind: 'note', countMin: 3, countMax: 8, scaleMin: 0.45, scaleMax: 3.4, depthMin: 0.22, depthMax: 0.46 }
]

/**
 * Creates layered consciousness atmosphere (layers 0–4 and 7) inside the playfield
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.sideWallWidth - Play area side margin
 * @param {number} config.topPlatformHeight - Top platform height in pixels
 * @param {number} config.bottomPlatformHeight - Bottom platform height in pixels
 * @returns {Object} Consciousness layers instance
 */
export function create(config) {
  const { k, sideWallWidth, topPlatformHeight, bottomPlatformHeight, playfieldColor } = config
  const colors = CFG.visual.colors.consciousness
  const playLeft = sideWallWidth ?? 192
  const playRight = k.width() - playLeft
  const playTop = topPlatformHeight ?? 360
  const playBottom = k.height() - (bottomPlatformHeight ?? 360)
  const playWidth = playRight - playLeft
  const playHeight = playBottom - playTop
  const screenW = k.width()
  const screenH = k.height()
  const font = CFG.visual.fonts.regularFull.replace(/'/g, '')
  const inst = {
    k,
    playLeft,
    playTop,
    playWidth,
    playHeight,
    screenW,
    screenH,
    font,
    colors,
    playfieldColor: playfieldColor ?? colors.gameWorld ?? CFG.visual.colors.platform,
    thoughtSky: [],
    noiseShapes: [],
    streamItems: [],
    celestialMotifs: [],
    foregroundPieces: [],
    textClouds: [],
    driftMotifs: [],
    rootRunners: [],
    rootStartSegs: [],
    rootSegMap: null,
    rootRunnerTimer: 0,
    rootRunnerSpawnInterval: ROOT_RUNNER_SPAWN_INTERVAL_MIN
  }
  spawnCenterBrain(inst)
  spawnBrainRoots(inst)
  spawnTextClouds(inst)
  spawnDriftMotifs(inst)
  spawnThoughtSky(inst)
  spawnNoiseSilhouettes(inst)
  spawnThoughtStream(inst)
  spawnCelestialMotifs(inst)
  spawnForegroundPieces(inst)
  k.onUpdate(() => onUpdate(inst))
  k.onDraw(() => onDraw(inst))
  return inst
}

//
// Layer 0 — drifting blurred word clouds at the far back
//
function spawnThoughtSky(inst) {
  const { k, screenW, screenH, colors, font } = inst
  for (let i = 0; i < THOUGHT_SKY_COUNT; i++) {
    const text = SKY_FRAGMENTS[Math.floor(Math.random() * SKY_FRAGMENTS.length)]
    const size = randomInRange(SKY_SIZE_MIN, SKY_SIZE_MAX)
    const depth = 0.52 + Math.random() * 0.24
    const x = Math.random() * screenW
    const y = Math.random() * screenH
    const vx = (Math.random() > 0.5 ? 1 : -1) * k.rand(SKY_DRIFT_MIN, SKY_DRIFT_MAX)
    const vy = k.rand(-SKY_DRIFT_MAX * 0.35, SKY_DRIFT_MAX * 0.35)
    inst.thoughtSky.push({
      text, size, x, y, vx, vy,
      color: voidBlendRgb(k, inst, colors.distantThoughts, depth),
      font,
      blur: 2 + Math.floor(Math.random() * 3),
      depth
    })
  }
}

//
// Layer 0b — intermittent multi-word clouds across the full void
//
function spawnTextClouds(inst) {
  const { k, screenW, screenH, colors, font } = inst
  for (let i = 0; i < TEXT_CLOUD_COUNT; i++) {
    const phrase = CLOUD_PHRASES[Math.floor(Math.random() * CLOUD_PHRASES.length)]
    const depth = 0.42 + Math.random() * 0.22
    const size = randomInRange(CLOUD_TEXT_SIZE_MIN, CLOUD_TEXT_SIZE_MAX)
    const wordGap = CLOUD_WORD_GAP_BASE + size * 0.55
    const words = phrase.map((text, wi) => ({
      text,
      offsetX: wi * wordGap,
      offsetY: (Math.random() - 0.5) * (8 + size * 0.12)
    }))
    inst.textClouds.push({
      words,
      x: Math.random() * screenW,
      y: Math.random() * screenH,
      vx: (Math.random() > 0.5 ? 1 : -1) * k.rand(5, 16),
      vy: k.rand(-6, 6),
      depth,
      size,
      font,
      color: voidBlendRgb(k, inst, colors.distantThoughts, depth),
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.25 + Math.random() * 0.35,
      peakDepth: 0.60 + Math.random() * 0.10,
      nearDepth: 0.28 + Math.random() * 0.14
    })
  }
}

//
// Distant drifting moon, trees, crow, and hero silhouettes on the dark void
//
function spawnDriftMotifs(inst) {
  const { k, screenW, screenH, colors } = inst
  let spawned = 0
  const moonCount = Math.floor(randomInRange(1, 3))
  for (let i = 0; i < moonCount && spawned < DRIFT_MOTIF_COUNT; i++) {
    const depth = randomInRange(0.44, 0.66)
    const scale = randomInRange(1.4, 3.2)
    inst.driftMotifs.push({
      kind: 'moon',
      x: screenW * randomInRange(0.12, 0.88),
      y: screenH * randomInRange(0.06, 0.2),
      vx: (Math.random() > 0.5 ? 1 : -1) * k.rand(4, 14) * (1 - depth * 0.35),
      vy: k.rand(-2, 2),
      depth,
      scale,
      phase: Math.random() * Math.PI * 2,
      moonTint: randomInRange(MOON_DEPTH_BLEND_MIN, MOON_DEPTH_BLEND_MAX),
      fadePhase: Math.random() * Math.PI * 2,
      fadePeriod: MOTIF_FADE_PERIOD_MIN + Math.random() * (MOTIF_FADE_PERIOD_MAX - MOTIF_FADE_PERIOD_MIN)
    })
    spawned++
  }
  DRIFT_KIND_DEFS.filter(def => def.kind !== 'moon').forEach(def => {
    const kindCount = Math.floor(randomInRange(def.countMin, def.countMax + 1))
    for (let i = 0; i < kindCount && spawned < DRIFT_MOTIF_COUNT; i++) {
      const depth = randomInRange(def.depthMin, def.depthMax)
      const scale = randomInRange(def.scaleMin, def.scaleMax)
      const yBand = def.kind === 'moon'
        ? screenH * randomInRange(0.05, 0.2)
        : screenH * randomInRange(0.12, 0.78)
      const motif = {
        kind: def.kind,
        x: Math.random() * screenW,
        y: yBand,
        vx: (Math.random() > 0.5 ? 1 : -1) * k.rand(6, 24) * (1 - depth * 0.45),
        vy: def.kind === 'crow' ? k.rand(-5, 5) : k.rand(-4, 4),
        depth,
        scale,
        phase: Math.random() * Math.PI * 2,
        fillHex: atmosphericDepthColor(colors.memories, inst.playfieldColor, depth),
        glyph: def.kind === 'note' ? NOTE_GLYPHS[Math.floor(Math.random() * NOTE_GLYPHS.length)] : null,
        noteTilt: def.kind === 'note' ? k.rand(-22, 22) : 0,
        fadePhase: Math.random() * Math.PI * 2,
        fadePeriod: MOTIF_FADE_PERIOD_MIN + Math.random() * (MOTIF_FADE_PERIOD_MAX - MOTIF_FADE_PERIOD_MIN)
      }
      //
      // Bake crow silhouette to a canvas sprite once at spawn so draw time
      // uses a single k.drawSprite call instead of 6 per-frame shape calls
      //
      if (def.kind === 'crow') {
        const colorHex = atmosphericDepthColor(colors.memories, inst.playfieldColor, depth)
        const hex = colorHex.replace('#', '')
        const cr = parseInt(hex.substring(0, 2), 16)
        const cg = parseInt(hex.substring(2, 4), 16)
        const cb = parseInt(hex.substring(4, 6), 16)
        const crowCanvas = bakeCrowToCanvas(cr, cg, cb)
        const crowKey = `word-crow-${spawned}-${Date.now()}`
        k.loadSprite(crowKey, crowCanvas)
        crowCanvas.width = 0
        crowCanvas.height = 0
        motif.spriteKey = crowKey
      }
      inst.driftMotifs.push(motif)
      spawned++
    }
  })
}

//
// Far-back brain — center of the playfield consciousness
//
function spawnCenterBrain(inst) {
  const { k, playLeft, playTop, playWidth, playHeight } = inst
  const spriteKey = getBrainSpriteKey(k)
  const brainZ = (CFG.visual.zIndex.wordPlayfieldFill ?? -90) + 1
  const { width: baseWidth, height: baseHeight } = computeBrainFitSize(
    playWidth,
    playHeight,
    BRAIN_PLAYFIELD_HEIGHT_RATIO,
    BRAIN_MAX_WIDTH_RATIO
  )
  const centerX = playLeft + playWidth * 0.5
  const centerY = playTop + playHeight * 0.5
  const brainObj = k.add([
    k.sprite(spriteKey),
    k.pos(centerX, centerY),
    k.anchor('center'),
    k.fixed(),
    k.z(brainZ),
    k.opacity(LAYER_DRAW_OPACITY),
    k.color(BRAIN_TINT_COOL_R, BRAIN_TINT_COOL_G, BRAIN_TINT_COOL_B)
  ])
  brainObj.width = baseWidth
  brainObj.height = baseHeight
  inst.centerBrain = {
    obj: brainObj,
    baseWidth,
    baseHeight,
    pulsePhase: 0
  }
}

//
// Neural root network radiating from the brain center — baked once per scene to a canvas sprite
//
function spawnBrainRoots(inst) {
  const { k, playLeft, playTop, playWidth, playHeight, screenW, screenH } = inst
  const centerX = playLeft + playWidth * 0.5
  const centerY = playTop + playHeight * 0.5
  const brainZ = (CFG.visual.zIndex.wordPlayfieldFill ?? -90) + 1
  //
  // Roots sit directly behind the brain sprite so the brain overlaps them at center
  //
  const rootsZ = brainZ - 0.5
  const allSegments = []
  for (let i = 0; i < BRAIN_ROOT_ARM_COUNT; i++) {
    const angle = (i / BRAIN_ROOT_ARM_COUNT) * Math.PI * 2
    //
    // Each arm grows outward from brain center — recursive branching tapers thickness
    //
    const armSegs = growTreeRootSegments({
      x: centerX,
      y: centerY,
      angle,
      segments: BRAIN_ROOT_SEGMENTS,
      thickness: BRAIN_ROOT_THICKNESS,
      rand: (min, max) => min + Math.random() * (max - min)
    })
    allSegments.push(...armSegs)
  }
  //
  // Bake all root segments onto a full-screen canvas sprite (world coords match screen coords)
  //
  const spriteKey = `word-brain-roots-${Date.now()}`
  const canvas = toCanvas({ width: screenW, height: screenH, pixelRatio: 1 }, (ctx) => {
    ctx.lineCap = 'round'
    allSegments.forEach(seg => {
      const opacity = Math.max(0.04, BRAIN_ROOT_BASE_OPACITY - seg.depth * BRAIN_ROOT_DEPTH_FADE)
      ctx.strokeStyle = `rgba(${BRAIN_ROOT_COLOR_R},${BRAIN_ROOT_COLOR_G},${BRAIN_ROOT_COLOR_B},${opacity})`
      ctx.lineWidth = Math.max(0.5, seg.width)
      ctx.beginPath()
      ctx.moveTo(seg.startX, seg.startY)
      ctx.lineTo(seg.endX, seg.endY)
      ctx.stroke()
    })
  })
  k.loadSprite(spriteKey, canvas)
  canvas.width = 0
  canvas.height = 0
  k.add([
    k.sprite(spriteKey),
    k.pos(0, 0),
    k.anchor('topleft'),
    k.fixed(),
    k.z(rootsZ),
    k.opacity(LAYER_DRAW_OPACITY)
  ])
  //
  // Build segment connection map for word-runner animation
  // Key: "Math.round(startX),Math.round(startY)" → segments starting at that point
  //
  const segMap = new Map()
  allSegments.forEach(seg => {
    const key = `${Math.round(seg.startX)},${Math.round(seg.startY)}`
    const bucket = segMap.get(key) ?? []
    bucket.push(seg)
    segMap.set(key, bucket)
  })
  const rcx = Math.round(centerX)
  const rcy = Math.round(centerY)
  //
  // Arm starter segments all begin exactly at brain center — find them by rounded coords
  //
  const startSegs = allSegments.filter(s =>
    Math.abs(Math.round(s.startX) - rcx) <= 2 && Math.abs(Math.round(s.startY) - rcy) <= 2
  )
  inst.rootSegMap = segMap
  inst.rootStartSegs = startSegs
}

//
// Layer 1 — semi-transparent shadow silhouettes
//
function spawnNoiseSilhouettes(inst) {
  const { k, playLeft, playTop, playWidth, playHeight, colors } = inst
  for (let i = 0; i < NOISE_SILHOUETTE_COUNT; i++) {
    const type = NOISE_TYPES[Math.floor(Math.random() * NOISE_TYPES.length)]
    const depth = 0.26 + Math.random() * 0.28
    const scale = randomInRange(NOISE_SCALE_MIN, NOISE_SCALE_MAX)
    const x = playLeft + Math.random() * playWidth
    const y = playTop + Math.random() * playHeight
    const vx = (Math.random() > 0.5 ? 1 : -1) * k.rand(NOISE_DRIFT_MIN, NOISE_DRIFT_MAX)
    const vy = k.rand(-NOISE_DRIFT_MAX * 0.25, NOISE_DRIFT_MAX * 0.25)
    inst.noiseShapes.push({
      type, scale, x, y, vx, vy,
      fillHex: atmosphericDepthColor(colors.distantThoughts, inst.playfieldColor, depth),
      color: playfieldBlendRgb(k, inst, colors.distantThoughts, depth),
      phase: Math.random() * Math.PI * 2,
      depth
    })
  }
}

//
// Layer 2 — slow thought stream (symbols, formulas, scribbles)
//
function spawnThoughtStream(inst) {
  const { k, playLeft, playTop, playWidth, playHeight, colors, font } = inst
  const pools = [STREAM_SYMBOLS, STREAM_FORMULAS, STREAM_SCRIBBLES]
  for (let i = 0; i < THOUGHT_STREAM_COUNT; i++) {
    const pool = pools[Math.floor(Math.random() * pools.length)]
    const text = pool[Math.floor(Math.random() * pool.length)]
    const depth = 0.16 + Math.random() * 0.24
    const size = randomInRange(STREAM_SIZE_MIN, STREAM_SIZE_MAX)
    const x = playLeft + Math.random() * playWidth
    const y = playTop + Math.random() * playHeight
    const vx = (Math.random() > 0.5 ? 1 : -1) * k.rand(STREAM_DRIFT_MIN, STREAM_DRIFT_MAX)
    const vy = k.rand(-STREAM_DRIFT_MAX * 0.4, STREAM_DRIFT_MAX * 0.4)
    const rot = Math.random() * Math.PI * 2
    const rotSpeed = k.rand(-0.4, 0.4)
    inst.streamItems.push({
      text, size, x, y, vx, vy, rot, rotSpeed,
      color: playfieldBlendRgb(k, inst, colors.memories, depth),
      font,
      depth
    })
  }
}

//
// Layer 3 — touch moon and time sun sprites
//
function spawnCelestialMotifs(inst) {
  const { k, playLeft, playTop, playWidth, playHeight } = inst
  const zIdx = CFG.visual.zIndex.wordEmotions ?? -102
  for (let i = 0; i < CELESTIAL_COUNT; i++) {
    const kind = CELESTIAL_KIND_ORDER[i % CELESTIAL_KIND_ORDER.length]
    const x = playLeft + Math.random() * playWidth
    const y = playTop + Math.random() * playHeight
    const vx = k.rand(-8, 8)
    const vy = k.rand(-7, 7)
    const pulsePhase = Math.random() * Math.PI * 2
    const depth = CELESTIAL_DEPTH_MIN + Math.random() * (CELESTIAL_DEPTH_MAX - CELESTIAL_DEPTH_MIN)
    const entry = { kind, x, y, vx, vy, pulsePhase, depth, zIdx }
    kind === CELESTIAL_KIND_TOUCH_MOON && (entry.scale = randomInRange(CELESTIAL_MOON_SCALE_MIN, CELESTIAL_MOON_SCALE_MAX))
    kind === CELESTIAL_KIND_TIME_SUN && (entry.scale = randomInRange(CELESTIAL_SUN_SCALE_MIN, CELESTIAL_SUN_SCALE_MAX))
    inst.celestialMotifs.push(entry)
  }
}

//
// Layer 7 — dark foreground silhouettes at screen edges
//
function spawnForegroundPieces(inst) {
  const { k, colors, playfieldColor } = inst
  const zIdx = CFG.visual.zIndex.wordForeground ?? 8
  const edgeHex = atmosphericDepthColor(colors.foregroundSilhouette, playfieldColor, 0.42)
  const color = getRGB(k, edgeHex)
  const w = k.width()
  const h = k.height()
  const edgeSlots = [
    { x: -w * 0.08, y: h * 0.15, anchor: 'left' },
    { x: w * 1.04, y: h * 0.35, anchor: 'right' },
    { x: -w * 0.05, y: h * 0.72, anchor: 'left' },
    { x: w * 1.02, y: h * 0.58, anchor: 'right' },
    { x: w * 0.5, y: -h * 0.06, anchor: 'top' }
  ]
  for (let i = 0; i < FOREGROUND_PIECE_COUNT; i++) {
    const slot = edgeSlots[i % edgeSlots.length]
    const type = FOREGROUND_TYPES[i % FOREGROUND_TYPES.length]
    const scale = 0.9 + Math.random() * 0.5
    const swayPhase = Math.random() * Math.PI * 2
    inst.foregroundPieces.push({
      type,
      scale,
      x: slot.x,
      y: slot.y,
      swayPhase,
      color,
      zIdx
    })
  }
}

//
// Per-frame motion, wrap-around, and memory flash scheduling
//
function onUpdate(inst) {
  const { k, playLeft, playTop, playWidth, playHeight, screenW, screenH } = inst
  const dt = k.dt()
  wrapDrifters(inst.thoughtSky, 0, 0, screenW, screenH, dt)
  wrapDrifters(inst.textClouds, 0, 0, screenW, screenH, dt)
  wrapDrifters(inst.driftMotifs, 0, 0, screenW, screenH, dt)
  updateDriftMotifs(inst, dt)
  wrapDrifters(inst.noiseShapes, playLeft, playTop, playWidth, playHeight, dt)
  wrapDrifters(inst.streamItems, playLeft, playTop, playWidth, playHeight, dt)
  updateTextClouds(inst, dt)
  updateCelestialMotifs(inst, dt)
  updateCenterBrain(inst, dt)
  updateRootRunners(inst, dt)
}

//
// Moves items and wraps them inside the playfield bounds
//
function wrapDrifters(items, left, top, width, height, dt) {
  items.forEach(item => {
    item.x += item.vx * dt
    item.y += item.vy * dt
    item.rot != null && (item.rot += item.rotSpeed * dt)
    item.pulsePhase != null && (item.pulsePhase += (item.pulseSpeed ?? 0) * dt)
    //
    // Fade-out → teleport → fade-in instead of instant wrapping
    //
    if (item.wrapState === 'out') {
      item.wrapOpacity = Math.max(0, item.wrapOpacity - WRAP_FADE_SPEED * dt)
      if (item.wrapOpacity <= 0) {
        //
        // Teleport to the opposite edge at the moment of full invisibility
        //
        if (item.x < left - WRAP_BUFFER) item.x = left + width + WRAP_BUFFER
        else if (item.x > left + width + WRAP_BUFFER) item.x = left - WRAP_BUFFER
        if (item.y < top - WRAP_BUFFER) item.y = top + height + WRAP_BUFFER
        else if (item.y > top + height + WRAP_BUFFER) item.y = top - WRAP_BUFFER
        item.wrapState = 'in'
        item.wrapOpacity = 0
      }
    } else if (item.wrapState === 'in') {
      item.wrapOpacity = Math.min(1, item.wrapOpacity + WRAP_FADE_SPEED * dt)
      item.wrapOpacity >= 1 && (item.wrapState = null)
    } else {
      const past = item.x < left - WRAP_BUFFER || item.x > left + width + WRAP_BUFFER ||
                   item.y < top - WRAP_BUFFER || item.y > top + height + WRAP_BUFFER
      if (past) {
        item.wrapState = 'out'
        if (item.wrapOpacity == null) item.wrapOpacity = 1
      }
    }
  })
}

//
// Crow flaps, heroes bob, and all motifs fade in/out on independent slow cycles
//
function updateDriftMotifs(inst, dt) {
  const time = inst.k.time()
  inst.driftMotifs.forEach(motif => {
    //
    // Slow sin-wave fade: cubic shaping keeps motifs mostly visible, occasionally near-invisible
    // Max capped at DRIFT_MOTIF_MAX_OPACITY so circles/ovals stay subtle, not overpowering
    //
    motif.fadePhase += (Math.PI * 2 / motif.fadePeriod) * dt
    const wave = (Math.sin(motif.fadePhase) + 1) * 0.5
    motif.fadeOpacity = MOTIF_FADE_MIN_OPACITY + (DRIFT_MOTIF_MAX_OPACITY - MOTIF_FADE_MIN_OPACITY) * (wave * wave * wave)
    motif.kind === 'crow' && (motif.y += Math.sin(time * 3.2 + motif.phase) * 18 * dt)
    motif.kind === 'driftHero' && (motif.y += Math.sin(time * 0.9 + motif.phase) * 10 * dt)
    motif.kind === 'note' && (motif.noteTilt = motif.noteTilt + Math.sin(time * 1.1 + motif.phase) * 12 * dt)
  })
}

//
// Clouds fade in and out — intermittent legibility
//
function updateTextClouds(inst, dt) {
  inst.textClouds.forEach(cloud => {
    cloud.pulsePhase += cloud.pulseSpeed * dt
    const wave = (Math.sin(cloud.pulsePhase) + 1) * 0.5
    const depth = cloud.nearDepth + (cloud.peakDepth - cloud.nearDepth) * wave * wave
    cloud.currentColor = voidBlendRgb(inst.k, inst, inst.colors.distantThoughts, depth)
  })
}

//
// Celestial motifs pulse gently and drift within the playfield
//
function updateCelestialMotifs(inst, dt) {
  const { playLeft, playTop, playWidth, playHeight } = inst
  inst.celestialMotifs.forEach(entry => {
    entry.x += entry.vx * dt
    entry.y += entry.vy * dt
    entry.pulsePhase += dt * 0.35
    if (entry.x < playLeft) entry.vx = Math.abs(entry.vx)
    if (entry.x > playLeft + playWidth) entry.vx = -Math.abs(entry.vx)
    if (entry.y < playTop) entry.vy = Math.abs(entry.vy)
    if (entry.y > playTop + playHeight) entry.vy = -Math.abs(entry.vy)
    entry.currentDepth = entry.depth * (0.92 + Math.sin(entry.pulsePhase) * 0.08)
  })
}

//
// Center brain — gentle size and tint pulse
//
function updateCenterBrain(inst, dt) {
  const cfg = inst.centerBrain
  if (!cfg?.obj) return
  cfg.pulsePhase += dt * BRAIN_PULSE_SPEED
  const wave = (Math.sin(cfg.pulsePhase) + 1) * 0.5
  const sizeMul = 1 + (wave - 0.5) * 2 * BRAIN_SIZE_PULSE
  cfg.obj.width = cfg.baseWidth * sizeMul
  cfg.obj.height = cfg.baseHeight * sizeMul
  cfg.obj.opacity = LAYER_DRAW_OPACITY
  const r = Math.round(BRAIN_TINT_COOL_R + (BRAIN_TINT_WARM_R - BRAIN_TINT_COOL_R) * wave)
  const g = Math.round(BRAIN_TINT_COOL_G + (BRAIN_TINT_WARM_G - BRAIN_TINT_COOL_G) * wave)
  const b = Math.round(BRAIN_TINT_COOL_B + (BRAIN_TINT_WARM_B - BRAIN_TINT_COOL_B) * wave)
  cfg.obj.color = inst.k.rgb(r, g, b)
}

//
// Root word runners — words travel outward from brain center along root segments,
// splitting at branch points and shrinking as the root tapers, then fading at tips
//
function updateRootRunners(inst, dt) {
  if (!inst.rootSegMap) return
  const { rootRunners, rootStartSegs, rootSegMap } = inst
  //
  // Periodically spawn a new runner from a random arm at the brain center
  //
  inst.rootRunnerTimer += dt
  if (inst.rootRunnerTimer >= inst.rootRunnerSpawnInterval && rootRunners.length < ROOT_RUNNER_MAX_COUNT) {
    inst.rootRunnerTimer = 0
    inst.rootRunnerSpawnInterval = ROOT_RUNNER_SPAWN_INTERVAL_MIN + Math.random() * (ROOT_RUNNER_SPAWN_INTERVAL_MAX - ROOT_RUNNER_SPAWN_INTERVAL_MIN)
    rootStartSegs.length > 0 && rootRunners.push(makeRootRunner(rootStartSegs[Math.floor(Math.random() * rootStartSegs.length)]))
  }
  //
  // Advance each runner; spawn child runners at branches, fade at dead ends
  //
  for (let i = rootRunners.length - 1; i >= 0; i--) {
    const r = rootRunners[i]
    if (r.fading) {
      r.opacity -= ROOT_RUNNER_FADE_SPEED * dt
      r.opacity <= 0 && rootRunners.splice(i, 1)
      continue
    }
    const dx = r.seg.endX - r.seg.startX
    const dy = r.seg.endY - r.seg.startY
    const len = Math.sqrt(dx * dx + dy * dy)
    len > 0 && (r.t += (ROOT_RUNNER_SPEED / len) * dt)
    if (r.t >= 1) {
      const nextKey = `${Math.round(r.seg.endX)},${Math.round(r.seg.endY)}`
      const nextSegs = rootSegMap.get(nextKey) ?? []
      if (nextSegs.length === 0) {
        r.fading = true
        r.t = 1
      } else {
        //
        // Continue along first next segment; spawn a runner for each branch
        //
        for (let j = 1; j < nextSegs.length && rootRunners.length < ROOT_RUNNER_MAX_COUNT; j++) {
          rootRunners.push(makeRootRunner(nextSegs[j], r.word, r.opacity))
        }
        r.seg = nextSegs[0]
        r.t = 0
      }
    }
  }
}
//
// Creates a new runner state at the start of a segment
//
function makeRootRunner(seg, word, opacity) {
  return {
    seg,
    t: 0,
    word: word ?? ROOT_RUNNER_WORDS[Math.floor(Math.random() * ROOT_RUNNER_WORDS.length)],
    opacity: opacity ?? ROOT_RUNNER_OPACITY,
    fading: false
  }
}
//
// Draws each runner's word at its current position with size scaled to root thickness
//
function drawRootRunners(inst) {
  if (!inst.rootRunners) return
  const { k, rootRunners } = inst
  const color = k.rgb(BRAIN_ROOT_RUNNER_COLOR_R, BRAIN_ROOT_RUNNER_COLOR_G, BRAIN_ROOT_RUNNER_COLOR_B)
  rootRunners.forEach(r => {
    const x = r.seg.startX + (r.seg.endX - r.seg.startX) * r.t
    const y = r.seg.startY + (r.seg.endY - r.seg.startY) * r.t
    //
    // Font size shrinks with root thickness: thick root near brain = large, thin tip = tiny
    //
    const fontSize = Math.max(ROOT_RUNNER_FONT_MIN, ROOT_RUNNER_FONT_MIN + (ROOT_RUNNER_FONT_MAX - ROOT_RUNNER_FONT_MIN) * (r.seg.width / BRAIN_ROOT_THICKNESS))
    k.drawText({
      text: r.word,
      pos: k.vec2(x, y),
      size: Math.round(fontSize),
      color,
      anchor: 'center',
      opacity: r.opacity
    })
  })
}
//
// Draws all consciousness layers back-to-front inside onDraw
//
function onDraw(inst) {
  drawDriftMotifs(inst)
  drawTextClouds(inst)
  drawThoughtSky(inst)
  drawNoiseSilhouettes(inst)
  drawThoughtStream(inst)
  drawCelestialMotifs(inst)
  drawForegroundPieces(inst)
  drawRootRunners(inst)
}

function drawDriftMotifs(inst) {
  const { k, driftMotifs } = inst
  const sorted = [...driftMotifs].sort((a, b) => b.depth - a.depth)
  sorted.forEach(motif => {
    const op = (motif.fadeOpacity ?? LAYER_DRAW_OPACITY) * (motif.wrapOpacity ?? 1)
    if (motif.kind === 'moon') {
      k.drawSprite({ sprite: getMoonSpriteKey(k), pos: k.vec2(motif.x, motif.y), anchor: 'center', scale: motif.scale, opacity: op })
      return
    }
    const motifColor = playfieldBlendRgb(k, inst, inst.colors.memories, motif.depth)
    if (motif.kind === 'crow') {
      //
      // Use pre-baked canvas sprite — single draw call vs 6 per-frame shape calls
      //
      k.drawSprite({
        sprite: motif.spriteKey,
        pos: k.vec2(motif.x, motif.y),
        anchor: 'center',
        scale: motif.scale / CROW_BAKE_SCALE,
        opacity: op
      })
      return
    }
    if (motif.kind === 'note') { drawNote(k, motif.x, motif.y, motif.scale, motifColor, op, inst.font, motif.glyph, motif.noteTilt); return }
  })
}

//
// Baked figure sprite — single-path silhouette without overlap darkening
//
function drawBakedFigure(k, x, y, scale, fillHex, opacity) {
  k.drawSprite({
    sprite: getFigureSpriteKey(k, fillHex),
    pos: k.vec2(x, y),
    anchor: 'bot',
    scale: (scale * 48) / FIGURE_SPRITE_H,
    opacity
  })
}

//
// Intermittent phrase clouds on the dark void
//
function drawTextClouds(inst) {
  const { k, textClouds } = inst
  textClouds.forEach(cloud => {
    const color = cloud.currentColor ?? cloud.color
    cloud.words.forEach(word => {
      k.drawText({
        text: word.text,
        size: cloud.size,
        font: cloud.font,
        pos: k.vec2(cloud.x + word.offsetX, cloud.y + word.offsetY),
        anchor: 'center',
        color,
        opacity: LAYER_DRAW_OPACITY * (cloud.wrapOpacity ?? 1)
      })
    })
  })
}

//
// Layer 0 draw — ghost-blurred text fragments
//
function drawThoughtSky(inst) {
  const { k, thoughtSky } = inst
  thoughtSky.forEach(item => {
    k.drawText({
      text: item.text,
      size: item.size,
      font: item.font,
      pos: k.vec2(item.x, item.y),
      anchor: 'center',
      color: item.color,
      opacity: LAYER_DRAW_OPACITY * (item.wrapOpacity ?? 1)
    })
  })
}

//
// Layer 1 draw — procedural shadow silhouettes
//
function drawNoiseSilhouettes(inst) {
  const { k, noiseShapes } = inst
  const time = k.time()
  noiseShapes.forEach(shape => {
    const wobble = Math.sin(time * 0.4 + shape.phase) * 6
    drawBackgroundMotif(k, shape.type, shape.x + wobble, shape.y, shape.scale, shape.color, LAYER_DRAW_OPACITY * (shape.wrapOpacity ?? 1), shape.fillHex)
  })
}

//
// Layer 2 draw — drifting symbols and formulas
//
function drawThoughtStream(inst) {
  const { k, streamItems } = inst
  streamItems.forEach(item => {
    k.drawText({
      text: item.text,
      size: item.size,
      font: item.font,
      pos: k.vec2(item.x, item.y),
      anchor: 'center',
      color: item.color,
      opacity: LAYER_DRAW_OPACITY * (item.wrapOpacity ?? 1),
      angle: item.rot ? item.rot * (180 / Math.PI) : 0
    })
  })
}

//
// Layer 3 draw — touch moon, time sun
//
function drawCelestialMotifs(inst) {
  const { k, celestialMotifs } = inst
  celestialMotifs.forEach(entry => {
    const depth = entry.currentDepth ?? entry.depth
    if (entry.kind === CELESTIAL_KIND_TOUCH_MOON) {
      k.drawSprite({
        sprite: getTouchMoonSpriteKey(k),
        pos: k.vec2(entry.x, entry.y),
        anchor: 'center',
        scale: entry.scale,
        opacity: CELESTIAL_MOON_OPACITY * (1 - depth * 0.22)
      })
      return
    }
    k.drawSprite({
      sprite: getTimeSunSpriteKey(k),
      pos: k.vec2(entry.x, entry.y),
      anchor: 'center',
      scale: entry.scale,
      opacity: CELESTIAL_SUN_OPACITY * (1 - depth * 0.18)
    })
  })
}

//
// Layer 7 draw — edge-occluding dark forms
//
function drawForegroundPieces(inst) {
  const { k, foregroundPieces } = inst
  const time = k.time()
  foregroundPieces.forEach(piece => {
    const sway = Math.sin(time * 0.25 + piece.swayPhase) * 8
    drawSilhouette(k, piece.type, piece.x + sway, piece.y, piece.scale * 2.8, piece.color, LAYER_DRAW_OPACITY)
  })
}

//
// Depth-tinted Kaplay RGB from consciousness palette hex
//
function depthRgb(k, hex, depth) {
  return getRGB(k, depthConsciousnessColor(hex, depth))
}

//
// Blends accent toward playfield fill — depth without alpha
//
function playfieldBlendRgb(k, inst, accentHex, depth) {
  return getRGB(k, atmosphericDepthColor(accentHex, inst.playfieldColor, depth))
}

//
// Darkens accent for void layers — depth-only; no blend toward near-black void
//
function voidBlendRgb(k, inst, accentHex, depth) {
  return getRGB(k, depthConsciousnessColor(accentHex, depth))
}

//
// Routes background motifs to richer procedural art
//
function drawBackgroundMotif(k, type, x, y, scale, color, opacity, fillHex) {
  switch (type) {
    case 'crow':
      drawCrow(k, x, y, scale, color, opacity)
      break
    case 'moon':
      k.drawSprite({
        sprite: getMoonSpriteKey(k),
        pos: k.vec2(x, y),
        anchor: 'center',
        scale,
        opacity
      })
      break
    case 'toy':
      drawToy(k, x, y, scale, color, opacity)
      break
    default:
      drawSilhouette(k, type, x, y, scale, color, opacity)
  }
}

//
// Crow in flight — round body, tail lobe, arched ellipse wings, eye, beak
// Used by drawBackgroundMotif for memory flashes (rare; baked version used for drift motifs)
//
function drawCrow(k, x, y, scale, color, opacity) {
  const s = 14 * scale
  k.drawEllipse({ pos: k.vec2(x, y + s * 0.05), radiusX: s * 0.32, radiusY: s * 0.22, color, opacity })
  k.drawEllipse({ pos: k.vec2(x, y + s * 0.38), radiusX: s * 0.18, radiusY: s * 0.16, color, opacity })
  k.drawEllipse({ pos: k.vec2(x - s * 0.82, y - s * 0.26), radiusX: s * 0.74, radiusY: s * 0.18, color, opacity, angle: -16 })
  k.drawEllipse({ pos: k.vec2(x + s * 0.82, y - s * 0.22), radiusX: s * 0.74, radiusY: s * 0.18, color, opacity, angle: 16 })
  k.drawCircle({ pos: k.vec2(x + s * 0.28, y - s * 0.02), radius: s * 0.11, color, opacity })
  k.drawEllipse({ pos: k.vec2(x + s * 0.46, y + s * 0.04), radiusX: s * 0.12, radiusY: s * 0.05, color, opacity, angle: 10 })
}

//
// Teddy silhouette — round body and ear discs
//
function drawToy(k, x, y, scale, color, opacity) {
  const s = 24 * scale
  k.drawCircle({ pos: k.vec2(x, y + s * 0.05), radius: s * 0.3, color, opacity })
  k.drawCircle({ pos: k.vec2(x - s * 0.2, y - s * 0.18), radius: s * 0.1, color, opacity: LAYER_DRAW_OPACITY })
  k.drawCircle({ pos: k.vec2(x + s * 0.2, y - s * 0.18), radius: s * 0.1, color, opacity: LAYER_DRAW_OPACITY })
  k.drawCircle({ pos: k.vec2(x, y - s * 0.08), radius: s * 0.18, color, opacity: LAYER_DRAW_OPACITY })
}


//
// Musical note — drawn head, stem, and optional flag glyph
//
function drawNote(k, x, y, scale, color, opacity, font, glyph, tiltDeg) {
  const s = 16 * scale
  const angle = tiltDeg ?? 0
  if (glyph) {
    k.drawText({
      text: glyph,
      size: Math.round(s * 1.8),
      font,
      pos: k.vec2(x, y),
      anchor: 'center',
      color,
      opacity,
      angle
    })
    return
  }
  k.drawCircle({
    pos: k.vec2(x - s * 0.12, y + s * 0.18),
    radius: s * 0.22,
    color,
    opacity,
    angle: -22 + angle
  })
  k.drawRect({
    pos: k.vec2(x + s * 0.08, y - s * 0.22),
    width: s * 0.07,
    height: s * 0.72,
    color,
    opacity,
    anchor: 'bot',
    angle
  })
}

//
// Procedural silhouette renderer shared by noise, memory, and foreground layers
//
function drawSilhouette(k, type, x, y, scale, color, opacity) {
  const s = 24 * scale
  switch (type) {
    case 'person':
    case 'figure':
      k.drawRect({ pos: k.vec2(x - s * 0.08, y), width: s * 0.12, height: s * 0.48, color, opacity, anchor: 'top', radius: s * 0.04 })
      k.drawRect({ pos: k.vec2(x + s * 0.08, y), width: s * 0.12, height: s * 0.48, color, opacity, anchor: 'top', radius: s * 0.04 })
      k.drawRect({ pos: k.vec2(x, y - s * 0.02), width: s * 0.34, height: s * 0.58, color, opacity, anchor: 'bot', radius: s * 0.08 })
      k.drawCircle({ pos: k.vec2(x, y - s * 0.90), radius: s * 0.22, color, opacity })
      k.drawRect({ pos: k.vec2(x - s * 0.19, y - s * 0.52), width: s * 0.10, height: s * 0.44, color, opacity, anchor: 'top', angle: 14, radius: s * 0.04 })
      k.drawRect({ pos: k.vec2(x + s * 0.19, y - s * 0.52), width: s * 0.10, height: s * 0.44, color, opacity, anchor: 'top', angle: -14, radius: s * 0.04 })
      break
    case 'eye':
      k.drawEllipse({ pos: k.vec2(x, y), radiusX: s * 0.55, radiusY: s * 0.30, color, opacity })
      k.drawCircle({ pos: k.vec2(x, y), radius: s * 0.18, color, opacity: LAYER_DRAW_OPACITY })
      k.drawCircle({ pos: k.vec2(x, y), radius: s * 0.09, color, opacity: LAYER_DRAW_OPACITY })
      break
    case 'face':
      k.drawCircle({ pos: k.vec2(x, y), radius: s * 0.45, color, opacity })
      k.drawCircle({ pos: k.vec2(x - s * 0.17, y - s * 0.10), radius: s * 0.07, color, opacity: LAYER_DRAW_OPACITY })
      k.drawCircle({ pos: k.vec2(x + s * 0.17, y - s * 0.10), radius: s * 0.07, color, opacity: LAYER_DRAW_OPACITY })
      k.drawRect({ pos: k.vec2(x, y + s * 0.04), width: s * 0.05, height: s * 0.09, color, opacity: LAYER_DRAW_OPACITY, anchor: 'center' })
      k.drawRect({ pos: k.vec2(x, y + s * 0.22), width: s * 0.26, height: s * 0.04, color, opacity: LAYER_DRAW_OPACITY, anchor: 'center' })
      break
    case 'hand':
      k.drawRect({ pos: k.vec2(x, y + s * 0.1), width: s * 0.28, height: s * 0.52, color, opacity, anchor: 'top', radius: s * 0.08 })
      k.drawRect({ pos: k.vec2(x - s * 0.08, y + s * 0.04), width: s * 0.44, height: s * 0.1, color, opacity, anchor: 'center', radius: s * 0.04 })
      for (let f = 0; f < 4; f++) {
        k.drawRect({
          pos: k.vec2(x - s * 0.21 + f * s * 0.14, y + s * 0.04),
          width: s * 0.09,
          height: s * 0.30,
          color,
          opacity,
          anchor: 'bot',
          radius: s * 0.04
        })
      }
      k.drawRect({ pos: k.vec2(x - s * 0.26, y + s * 0.10), width: s * 0.09, height: s * 0.22, color, opacity, anchor: 'bot', angle: -38, radius: s * 0.04 })
      break
    case 'fork':
      k.drawRect({ pos: k.vec2(x, y + s * 0.12), width: s * 0.10, height: s * 0.76, color, opacity, anchor: 'top', radius: s * 0.04 })
      k.drawRect({ pos: k.vec2(x, y - s * 0.56), width: s * 0.44, height: s * 0.07, color, opacity, anchor: 'center', radius: s * 0.03 })
      for (let t = 0; t < 4; t++) {
        k.drawRect({ pos: k.vec2(x - s * 0.21 + t * s * 0.14, y - s * 0.60), width: s * 0.07, height: s * 0.38, color, opacity, anchor: 'bot', radius: s * 0.04 })
      }
      break
    case 'house':
      k.drawRect({ pos: k.vec2(x, y), width: s * 0.9, height: s * 0.55, color, opacity, anchor: 'bot', radius: s * 0.06 })
      k.drawEllipse({ pos: k.vec2(x, y - s * 0.58), radiusX: s * 0.54, radiusY: s * 0.44, color, opacity })
      break
    case 'tree':
      k.drawRect({ pos: k.vec2(x, y), width: s * 0.12, height: s * 0.55, color, opacity, anchor: 'bot', radius: s * 0.04 })
      k.drawCircle({ pos: k.vec2(x, y - s * 0.55), radius: s * 0.38, color, opacity })
      break
    case 'clock':
      k.drawCircle({ pos: k.vec2(x, y), radius: s * 0.42, color, opacity })
      k.drawRect({ pos: k.vec2(x, y - s * 0.15), width: s * 0.04, height: s * 0.22, color, opacity, anchor: 'bot', radius: s * 0.02 })
      k.drawRect({ pos: k.vec2(x + s * 0.12, y), width: s * 0.18, height: s * 0.04, color, opacity, anchor: 'left', radius: s * 0.02 })
      break
    case 'toy':
      k.drawCircle({ pos: k.vec2(x, y), radius: s * 0.32, color, opacity })
      k.drawCircle({ pos: k.vec2(x - s * 0.18, y - s * 0.12), radius: s * 0.08, color, opacity })
      k.drawCircle({ pos: k.vec2(x + s * 0.18, y - s * 0.12), radius: s * 0.08, color, opacity })
      break
    case 'window':
      k.drawRect({ pos: k.vec2(x, y), width: s * 0.75, height: s * 0.85, color, opacity, anchor: 'center' })
      k.drawRect({ pos: k.vec2(x, y), width: s * 0.04, height: s * 0.85, color, opacity: LAYER_DRAW_OPACITY, anchor: 'center' })
      k.drawRect({ pos: k.vec2(x, y), width: s * 0.75, height: s * 0.04, color, opacity: LAYER_DRAW_OPACITY, anchor: 'center' })
      break
    case 'swings':
      k.drawRect({ pos: k.vec2(x - s * 0.35, y - s * 0.5), width: s * 0.06, height: s * 0.9, color, opacity, anchor: 'top' })
      k.drawRect({ pos: k.vec2(x + s * 0.35, y - s * 0.5), width: s * 0.06, height: s * 0.9, color, opacity, anchor: 'top' })
      k.drawRect({ pos: k.vec2(x - s * 0.35, y - s * 0.15), width: s * 0.72, height: s * 0.04, color, opacity, anchor: 'left' })
      k.drawRect({ pos: k.vec2(x - s * 0.2, y - s * 0.15), width: s * 0.04, height: s * 0.35, color, opacity, anchor: 'top' })
      k.drawRect({ pos: k.vec2(x + s * 0.2, y - s * 0.15), width: s * 0.04, height: s * 0.28, color, opacity, anchor: 'top' })
      break
    case 'branch':
      k.drawRect({ pos: k.vec2(x, y), width: s * 1.4, height: s * 0.14, color, opacity, anchor: 'center', angle: -25 })
      k.drawRect({ pos: k.vec2(x + s * 0.3, y - s * 0.2), width: s * 0.7, height: s * 0.1, color, opacity, anchor: 'center', angle: -55 })
      break
    case 'root':
      k.drawRect({ pos: k.vec2(x, y), width: s * 0.12, height: s * 1.1, color, opacity, anchor: 'top' })
      k.drawRect({ pos: k.vec2(x - s * 0.25, y + s * 0.5), width: s * 0.55, height: s * 0.1, color, opacity, anchor: 'center', angle: 35 })
      k.drawRect({ pos: k.vec2(x + s * 0.2, y + s * 0.65), width: s * 0.45, height: s * 0.09, color, opacity, anchor: 'center', angle: -30 })
      break
    case 'thread':
      for (let i = 0; i < 5; i++) {
        k.drawRect({
          pos: k.vec2(x + i * s * 0.08, y + i * s * 0.18),
          width: s * 0.04,
          height: s * 0.45,
          color,
          opacity: LAYER_DRAW_OPACITY,
          anchor: 'top',
          angle: -8 + i * 4
        })
      }
      break
    case 'abstract':
    default:
      k.drawCircle({ pos: k.vec2(x, y), radius: s * 0.35, color, opacity })
      k.drawRect({ pos: k.vec2(x + s * 0.2, y - s * 0.15), width: s * 0.55, height: s * 0.12, color, opacity: LAYER_DRAW_OPACITY, anchor: 'center', angle: 40 })
      break
  }
}

//
// Uniform random float in [min, max)
//
function randomInRange(min, max) {
  return min + Math.random() * (max - min)
}

//
// Renders a crow silhouette onto a fresh canvas using Canvas2D so Kaplay can load it as
// a sprite. The shape is drawn in the given RGB colour at CROW_BAKE_SCALE × the drawCrow
// reference size (14 px per unit). The crow is placed so its visual midpoint aligns with
// the canvas centre — k.drawSprite with anchor:'center' will position it correctly.
//
function bakeCrowToCanvas(r, g, b) {
  const s = 14 * CROW_BAKE_SCALE
  const pad = Math.ceil(s * 0.22)
  const W = Math.ceil(s * 3.2 + pad * 2)
  const H = Math.ceil(s * 1.1 + pad * 2)
  const cx = W / 2
  //
  // Crow top extends to -0.44s above origin — pad ensures it is not clipped
  //
  const cy = Math.ceil(s * 0.44 + pad)
  return toCanvas({ width: W, height: H }, ctx => {
    ctx.fillStyle = `rgb(${r},${g},${b})`
    bakeEllipse2d(ctx, cx, cy + s * 0.05, s * 0.32, s * 0.22, 0)
    bakeEllipse2d(ctx, cx, cy + s * 0.38, s * 0.18, s * 0.16, 0)
    bakeEllipse2d(ctx, cx - s * 0.82, cy - s * 0.26, s * 0.74, s * 0.18, -16 * Math.PI / 180)
    bakeEllipse2d(ctx, cx + s * 0.82, cy - s * 0.22, s * 0.74, s * 0.18, 16 * Math.PI / 180)
    bakeCircle2d(ctx, cx + s * 0.28, cy - s * 0.02, s * 0.11)
    bakeEllipse2d(ctx, cx + s * 0.46, cy + s * 0.04, s * 0.12, s * 0.05, 10 * Math.PI / 180)
  })
}
//
// Canvas2D helpers — mirror of Kaplay's k.drawEllipse / k.drawCircle for sprite baking
//
function bakeEllipse2d(ctx, cx, cy, rx, ry, angle) {
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), angle, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
function bakeCircle2d(ctx, cx, cy, r) {
  ctx.beginPath()
  ctx.arc(cx, cy, Math.max(0.5, r), 0, Math.PI * 2)
  ctx.fill()
}
