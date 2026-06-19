import { CFG } from '../../../cfg.js'

//
// Body dimensions: smooth tapered tube from thick base to narrow tip
//
const BASE_WIDTH = 48
const TIP_WIDTH = 14
const BODY_HEIGHT = 90
const NODE_COUNT = 24
//
// Rise/retract animation
//
const RISE_SPEED = 90
const RETRACT_SPEED = 70
//
// Last fraction of visible height during retract: worm + soil mounds fade instead of popping off.
//
const WORM_BURROW_SURFACE_FADE_FRAC = 0.34
//
// Arc emergence: worm curves sideways while rising, then straightens
//
const ARC_MAX = 30
const ARC_STRAIGHTEN_SPEED = 3.0
//
// Earth chunks: particles that fly out of the hole during emergence
//
const DIRT_SPAWN_INTERVAL = 0.05
const DIRT_COUNT_PER_SPAWN = 2
const DIRT_SPEED_MIN = 30
const DIRT_SPEED_MAX = 80
const DIRT_GRAVITY = 200
const DIRT_LIFETIME = 1.2
const DIRT_SIZE_MIN = 4
const DIRT_SIZE_MAX = 10
const DIRT_COLOR_R = 55
const DIRT_COLOR_G = 42
const DIRT_COLOR_B = 30
//
// Static earth mounds: piles of dirt at the base while worm is out
//
const MOUND_COUNT = 10
const MOUND_SIZE_MIN = 5
const MOUND_SIZE_MAX = 12
const MOUND_SPREAD = 35
//
// Trigger and retract distances (hero must walk far to make worm hide)
//
const TRIGGER_DISTANCE = 180
const RETRACT_DISTANCE = 400
//
// Sideways lean toward hero
//
const LEAN_SPEED = 3.5
const LEAN_MAX = 50
const IK_FOLLOW_SPEED = 5.0
//
// Visual colors (warm reddish-brown, cartoon worm style)
//
const BODY_COLOR_R = 172
const BODY_COLOR_G = 42
const BODY_COLOR_B = 38
const BODY_HIGHLIGHT_R = 210
const BODY_HIGHLIGHT_G = 55
const BODY_HIGHLIGHT_B = 42
const OUTLINE_COLOR_R = 25
const OUTLINE_COLOR_G = 18
const OUTLINE_COLOR_B = 15
//
// Body bulges: fat rolls with dark outline for organic roundness
//
const BULGE_COUNT = 5
const BULGE_EXTRA_WIDTH = 7
const BULGE_ASPECT = 0.4
//
// Eyes (near the tip)
//
const EYE_RADIUS = 9
const PUPIL_RADIUS = 3
const EYE_SPACING = 16
const EYE_FROM_TIP_T = 0.82
const SCLERA_R = 240
const SCLERA_G = 240
const SCLERA_B = 235
const PUPIL_R = 15
const PUPIL_G = 8
const PUPIL_B = 8
//
// Mouth (below eyes, closes fully when hero is at RETRACT_DISTANCE)
//
const MOUTH_MAX_WIDTH = 32
const MOUTH_MAX_HEIGHT = 22
const MOUTH_FROM_TIP_T = 0.55
const MOUTH_OPEN_DISTANCE = RETRACT_DISTANCE
const TOOTH_COUNT = 6
const TOOTH_HEIGHT = 10
const TOOTH_WIDTH = 5
const MOUTH_COLOR_R = 30
const MOUTH_COLOR_G = 10
const MOUTH_COLOR_B = 10
const TOOTH_COLOR_R = 220
const TOOTH_COLOR_G = 210
const TOOTH_COLOR_B = 190
// Sound timing and volumes
//
const ALIEN_SOUND_INTERVAL = 2.0
const FRICTION_VOLUME = 0.16
const EMERGENCE_VOLUME = 0.18
const ALIEN_VOLUME = 0.1
//
// Smile after eating the hero
//
const SMILE_FADE_SPEED = 3.0

/**
 * Creates a worm obstacle that emerges smoothly from the ground.
 * Rendered as a continuous smooth tube with fat body bulges.
 * Has toothy mouth that opens wider as hero approaches, earth chunks, IK lean.
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - X position (center of worm base)
 * @param {number} config.floorY - Y position of the ground surface
 * @param {Object} config.hero - Hero instance to track
 * @param {Object} [config.sfx] - Sound instance for procedural audio
 * @returns {Object} Worm instance
 */
export function create(config) {
  const { k, x, floorY, hero, sfx } = config
  const spineOffsets = new Array(NODE_COUNT).fill(0)
  //
  // Pre-generate earth mound positions
  //
  const earthMounds = []
  for (let i = 0; i < MOUND_COUNT; i++) {
    const side = i < MOUND_COUNT / 2 ? -1 : 1
    earthMounds.push({
      dx: side * (BASE_WIDTH / 2 + Math.random() * MOUND_SPREAD),
      dy: -Math.random() * 3,
      size: MOUND_SIZE_MIN + Math.random() * (MOUND_SIZE_MAX - MOUND_SIZE_MIN),
      aspect: 0.4 + Math.random() * 0.3
    })
  }
  //
  // Pre-generate bulge positions along the body (evenly spaced, avoiding tip)
  //
  const bulges = []
  for (let i = 0; i < BULGE_COUNT; i++) {
    const t = 0.15 + (i / BULGE_COUNT) * 0.55
    bulges.push({ t, wobble: Math.random() * Math.PI * 2 })
  }
  const inst = {
    k,
    x,
    floorY,
    hero,
    sfx,
    riseAmount: 0,
    phase: 'hidden',
    time: 0,
    spineOffsets,
    leanTarget: 0,
    earthMounds,
    bulges,
    arcDirection: 1,
    arcAmount: 0,
    dirtParticles: [],
    dirtTimer: 0,
    frictionNode: null,
    frictionGain: null,
    alienTimer: 0,
    smiling: false,
    smileT: 0,
    //
    // When blocked = true the worm will not trigger from 'hidden' phase
    // even when the hero is within TRIGGER_DISTANCE. Used externally to
    // enforce a single-worm-at-a-time mutex across multiple instances.
    //
    blocked: false,
    //
    // When sleeping = true (set externally by level zone system),
    // internal onUpdate is skipped entirely to save CPU in far zones.
    //
    sleeping: false,
    //
    // Pre-baked draw colors and shared vec2 instances — eliminates ~140
    // k.rgb/k.vec2 allocations per frame while the worm is visible.
    //
    drawCache: null
  }
  inst.drawCache = buildDrawCache(k)
  k.add([
    k.z(CFG.visual.zIndex.platforms + 15),
    {
      draw() {
        if (inst.sleeping) return
        if (inst.riseAmount <= 0 && inst.dirtParticles.length === 0) return
        onDraw(inst)
      }
    }
  ])
  k.onUpdate(() => onUpdate(inst))
  return inst
}

/**
 * Makes the worm smile after eating the hero (satisfied grin).
 * @param {Object} inst - Worm instance
 */
export function startSmiling(inst) {
  inst.smiling = true
  inst.smileT = 0
}
/**
 * Checks if a point (hero) collides with the worm's risen body.
 * Accounts for spine offsets (IK lean) and tapered body width.
 * @param {Object} inst - Worm instance
 * @param {number} heroX - Hero X position
 * @param {number} heroY - Hero Y position
 * @returns {boolean} True if collision detected
 */
export function checkCollision(inst, heroX, heroY) {
  if (inst.riseAmount <= 0) return false
  //
  // Ground-level collision: hero dies when running through the emergence hole
  // Height is limited so jumping over the base is still possible
  //
  const GROUND_COLLISION_HALF_W = BASE_WIDTH / 2 + 30
  const GROUND_COLLISION_HEIGHT = 50
  if (heroY > inst.floorY - GROUND_COLLISION_HEIGHT && Math.abs(heroX - inst.x) < GROUND_COLLISION_HALF_W) {
    return true
  }
  const wormTop = inst.floorY - inst.riseAmount
  //
  // Check multiple vertical sample points on the hero for reliable collision
  //
  const HERO_HEIGHT_SAMPLES = [0, -20, -40, -60]
  const COLLISION_PADDING = 18
  for (const offset of HERO_HEIGHT_SAMPLES) {
    const sampleY = heroY + offset
    if (sampleY < wormTop || sampleY > inst.floorY) continue
    const t = Math.max(0, Math.min(1, (inst.floorY - sampleY) / BODY_HEIGHT))
    const nodePos = getNodePos(inst, t)
    const bodyW = getWidth(t)
    const halfW = bodyW / 2 + COLLISION_PADDING
    if (Math.abs(heroX - nodePos.x) < halfW) return true
  }
  return false
}
//
// Per-frame update: trigger, rise, hold, retract
//
function onUpdate(inst) {
  if (inst.sleeping && inst.phase === 'hidden' && inst.dirtParticles.length === 0) return
  const dt = inst.k.dt()
  inst.time += dt
  const heroX = inst.hero?.character?.pos?.x ?? -1000
  const heroY = inst.hero?.character?.pos?.y ?? -1000
  const dx = Math.abs(heroX - inst.x)
  const dy = Math.abs(heroY - inst.floorY)
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (inst.phase === 'hidden') {
    if (!inst.blocked && dist < TRIGGER_DISTANCE) {
      inst.phase = 'rising'
      inst.arcDirection = heroX > inst.x ? 1 : -1
      inst.arcAmount = 0
      playEmergenceSound(inst)
      startFrictionSound(inst)
      //
      // Slight screen shake as the giant worm bursts from the ground
      //
      inst.k.shake(4)
    }
  } else if (inst.phase === 'rising') {
    inst.riseAmount += RISE_SPEED * dt
    const riseT = inst.riseAmount / BODY_HEIGHT
    inst.arcAmount = Math.sin(riseT * Math.PI) * ARC_MAX * inst.arcDirection
    spawnDirtParticles(inst, dt)
    if (inst.riseAmount >= BODY_HEIGHT) {
      inst.riseAmount = BODY_HEIGHT
      inst.phase = 'holding'
      stopFrictionSound(inst)
      startAlienAmbient(inst)
    }
  } else if (inst.phase === 'holding') {
    inst.arcAmount += (0 - inst.arcAmount) * ARC_STRAIGHTEN_SPEED * dt
    updateAlienAmbient(inst, dt)
    if (dist > RETRACT_DISTANCE) {
      inst.phase = 'retracting'
      stopAlienAmbient(inst)
      startFrictionSound(inst)
    }
  } else if (inst.phase === 'retracting') {
    if (dist < TRIGGER_DISTANCE) {
      inst.phase = 'rising'
      stopFrictionSound(inst)
      startFrictionSound(inst)
    } else {
      inst.riseAmount -= RETRACT_SPEED * dt
      const riseT = inst.riseAmount / BODY_HEIGHT
      inst.arcAmount = Math.sin(riseT * Math.PI) * ARC_MAX * 0.5 * inst.arcDirection
      spawnDirtParticles(inst, dt)
      if (inst.riseAmount <= 0) {
        inst.riseAmount = 0
        inst.phase = 'hidden'
        inst.spineOffsets.fill(0)
        inst.leanTarget = 0
        inst.arcAmount = 0
        inst.dirtParticles = []
        stopFrictionSound(inst)
      }
    }
  }
  if (inst.riseAmount > 0) {
    updateIK(inst, dt, heroX)
  }
  updateDirtParticles(inst, dt)
  //
  // Smile animation: smoothly transition to grin after eating hero
  //
  if (inst.smiling && inst.smileT < 1) {
    inst.smileT = Math.min(1, inst.smileT + dt * SMILE_FADE_SPEED)
  }
}
//
// IK: tip leans toward hero, lower nodes follow with lag
//
function updateIK(inst, dt, heroX) {
  const heroDir = heroX - inst.x
  const baseLean = heroDir * 0.15
  inst.leanTarget = Math.max(-LEAN_MAX, Math.min(LEAN_MAX, baseLean))
  const tipIdx = NODE_COUNT - 1
  const tipDiff = inst.leanTarget - inst.spineOffsets[tipIdx]
  inst.spineOffsets[tipIdx] += tipDiff * LEAN_SPEED * dt
  for (let i = tipIdx - 1; i >= 0; i--) {
    const t = i / (NODE_COUNT - 1)
    const arcOffset = Math.sin(t * Math.PI) * inst.arcAmount
    const parentInfluence = inst.spineOffsets[i + 1] * t + arcOffset * (1 - t) * 0.3
    const diff = parentInfluence - inst.spineOffsets[i]
    inst.spineOffsets[i] += diff * IK_FOLLOW_SPEED * dt
  }
}
//
// Width of the body at parameter t (0=base, 1=tip)
//
function getWidth(t) {
  return BASE_WIDTH * (1 - t) + TIP_WIDTH * t
}
//
// Calculates a spine node's world position given its t (0=base, 1=tip)
//
function getNodePos(inst, t) {
  const idx = Math.round(t * (NODE_COUNT - 1))
  const clampIdx = Math.max(0, Math.min(NODE_COUNT - 1, idx))
  const y = inst.floorY - t * BODY_HEIGHT
  const offsetX = inst.spineOffsets[clampIdx] || 0
  return { x: inst.x + offsetX, y }
}
//
// Surface fade while retracting into soil so the mesh does not pop off at riseAmount === 0.
//
function wormBurrowSurfaceOpacity(inst) {
  if (inst.phase !== 'retracting') return 1
  const thresh = BODY_HEIGHT * WORM_BURROW_SURFACE_FADE_FRAC
  const r = inst.riseAmount
  if (r >= thresh) return 1
  return Math.max(0, r / thresh)
}
//
// Draw the worm as a smooth continuous tube with fat bulges; circles clamp at floorY.
//
function onDraw(inst) {
  const { k, x, floorY, riseAmount } = inst
  inst.surfaceDrawOpacity = wormBurrowSurfaceOpacity(inst)
  const surfaceOp = inst.surfaceDrawOpacity
  const topY = floorY - riseAmount
  const dc = inst.drawCache
  if (riseAmount > 0) drawEarthMounds(inst)
  drawDirtParticles(inst)
  if (riseAmount <= 0) return
  //
  // Outline pass: slightly larger circles for dark border (only above ground)
  //
  for (let i = 0; i < NODE_COUNT; i++) {
    const t = i / (NODE_COUNT - 1)
    const ny = floorY - t * BODY_HEIGHT
    if (ny < topY) continue
    const w = getWidth(t)
    const r = w / 2 + 2
    if (ny - r > floorY) continue
    const nx = x + (inst.spineOffsets[i] || 0)
    dc.pos.x = nx
    dc.pos.y = Math.min(ny, floorY - r * 0.3)
    k.drawCircle({
      pos: dc.pos,
      radius: r,
      color: dc.outlineColor,
      opacity: surfaceOp
    })
  }
  //
  // Body fill pass: overlapping circles with pre-baked gradient colors (only above ground)
  //
  for (let i = 0; i < NODE_COUNT; i++) {
    const t = i / (NODE_COUNT - 1)
    const ny = floorY - t * BODY_HEIGHT
    if (ny < topY) continue
    const w = getWidth(t)
    const r = w / 2
    if (ny - r > floorY) continue
    const nx = x + (inst.spineOffsets[i] || 0)
    dc.pos.x = nx
    dc.pos.y = Math.min(ny, floorY - r * 0.3)
    k.drawCircle({
      pos: dc.pos,
      radius: r,
      color: dc.nodeColors[i],
      opacity: surfaceOp
    })
  }
  //
  // Fat body bulges: rounded bumps with dark outline for organic roundness
  //
  drawBulges(inst)
  //
  // Highlight sheen along left side for 3D roundness
  //
  for (let i = 1; i < NODE_COUNT - 2; i += 2) {
    const t = i / (NODE_COUNT - 1)
    const ny = floorY - t * BODY_HEIGHT
    if (ny < topY || ny > floorY - 4) continue
    const w = getWidth(t)
    const nx = x + (inst.spineOffsets[i] || 0)
    dc.pos.x = nx - w * 0.2
    dc.pos.y = ny
    k.drawEllipse({
      pos: dc.pos,
      radiusX: w * 0.12,
      radiusY: BODY_HEIGHT / NODE_COUNT * 0.5,
      color: dc.highlightColor,
      opacity: 0.25 * surfaceOp
    })
  }
  if (riseAmount > BODY_HEIGHT * 0.4) drawEyes(inst)
  if (riseAmount > BODY_HEIGHT * 0.35) drawMouth(inst)
}
//
// Draw fat body bulges: horizontal ellipses protruding from the body
// with a dark outline, creating an organic segmented look
//
function drawBulges(inst) {
  const { k, x, floorY, riseAmount } = inst
  const topY = floorY - riseAmount
  const surfaceOp = inst.surfaceDrawOpacity ?? 1
  const dc = inst.drawCache
  for (const bulge of inst.bulges) {
    const ny = floorY - bulge.t * BODY_HEIGHT
    if (ny < topY || ny > floorY - 4) continue
    const idx = Math.round(bulge.t * (NODE_COUNT - 1))
    const nx = x + (inst.spineOffsets[idx] || 0)
    const w = getWidth(bulge.t)
    const bulgeRX = w / 2 + BULGE_EXTRA_WIDTH
    const bulgeRY = bulgeRX * BULGE_ASPECT
    //
    // Subtle breathing animation
    //
    const breathe = 1 + Math.sin(inst.time * 1.5 + bulge.wobble) * 0.04
    dc.pos.x = nx
    dc.pos.y = ny
    k.drawEllipse({
      pos: dc.pos,
      radiusX: (bulgeRX + 2) * breathe,
      radiusY: (bulgeRY + 1.5) * breathe,
      color: dc.outlineColor,
      opacity: 0.85 * surfaceOp
    })
    k.drawEllipse({
      pos: dc.pos,
      radiusX: bulgeRX * breathe,
      radiusY: bulgeRY * breathe,
      color: dc.bulgeBodyColor,
      opacity: 0.9 * surfaceOp
    })
  }
}
//
// Draw earth mounds at the base
//
function drawEarthMounds(inst) {
  const { k, x, floorY } = inst
  const surfaceOp = inst.surfaceDrawOpacity ?? 1
  const dc = inst.drawCache
  for (const m of inst.earthMounds) {
    dc.pos.x = x + m.dx
    dc.pos.y = floorY + m.dy
    k.drawEllipse({
      pos: dc.pos,
      radiusX: m.size,
      radiusY: m.size * m.aspect,
      color: dc.moundColor,
      opacity: 0.8 * surfaceOp
    })
  }
}
//
// Draw mouth below eyes; size scales based on hero proximity.
// At RETRACT_DISTANCE the mouth is fully closed.
//
function drawMouth(inst) {
  const { k, floorY, riseAmount } = inst
  const surfaceOp = inst.surfaceDrawOpacity ?? 1
  const topY = floorY - riseAmount
  const pos = getNodePos(inst, MOUTH_FROM_TIP_T)
  if (pos.y < topY) return
  const dc = inst.drawCache
  //
  // When smiling, draw a curved grin instead of the normal mouth
  //
  if (inst.smiling && inst.smileT > 0) {
    drawSmile(inst, pos, surfaceOp)
    return
  }
  const geo = resolveMouthOpening(inst, pos)
  if (!geo) return
  const { mouthW, mouthH, openT } = geo
  dc.pos.x = pos.x
  dc.pos.y = pos.y
  k.drawEllipse({
    pos: dc.pos,
    radiusX: mouthW / 2,
    radiusY: mouthH / 2,
    color: dc.mouthColor,
    opacity: surfaceOp
  })
  for (let i = 0; i < TOOTH_COUNT; i++) {
    const tx = pos.x - mouthW / 2 + (i + 0.5) * (mouthW / TOOTH_COUNT)
    const th = TOOTH_HEIGHT * openT
    if (th < 0.5) continue
    dc.toothP1.x = tx - TOOTH_WIDTH / 2
    dc.toothP1.y = pos.y - mouthH / 2
    dc.toothP2.x = tx + TOOTH_WIDTH / 2
    dc.toothP2.y = pos.y - mouthH / 2
    dc.toothP3.x = tx
    dc.toothP3.y = pos.y - mouthH / 2 + th
    k.drawTriangle({
      p1: dc.toothP1,
      p2: dc.toothP2,
      p3: dc.toothP3,
      color: dc.toothColor,
      opacity: surfaceOp
    })
    dc.toothP1.y = pos.y + mouthH / 2
    dc.toothP2.y = pos.y + mouthH / 2
    dc.toothP3.y = pos.y + mouthH / 2 - th
    k.drawTriangle({
      p1: dc.toothP1,
      p2: dc.toothP2,
      p3: dc.toothP3,
      color: dc.toothColor,
      opacity: surfaceOp
    })
  }
}
//
// Mouth aperture geometry shared by drawing only (hero proximity scaling).
//
function resolveMouthOpening(inst, pos) {
  const heroX = inst.hero?.character?.pos?.x ?? inst.x + 999
  const heroY = inst.hero?.character?.pos?.y ?? pos.y
  const heroDist = Math.sqrt((heroX - pos.x) ** 2 + (heroY - pos.y) ** 2)
  const openT = Math.max(0, Math.min(1, 1 - heroDist / MOUTH_OPEN_DISTANCE))
  if (openT <= 0) return null
  const bodyW = getWidth(MOUTH_FROM_TIP_T)
  const mouthW = Math.min(MOUTH_MAX_WIDTH * openT, bodyW * 0.9)
  const mouthH = MOUTH_MAX_HEIGHT * openT
  return { pos, mouthW, mouthH, openT }
}
//
// Draw eyes near the tip that track the hero
//
function drawEyes(inst) {
  const { k, x, floorY, riseAmount } = inst
  const topY = floorY - riseAmount
  const pos = getNodePos(inst, EYE_FROM_TIP_T)
  if (pos.y < topY) return
  const heroX = inst.hero?.character?.pos?.x ?? x
  const heroY = inst.hero?.character?.pos?.y ?? pos.y
  const surfaceOp = inst.surfaceDrawOpacity ?? 1
  drawEye(k, pos.x - EYE_SPACING / 2, pos.y, heroX, heroY, surfaceOp, inst.drawCache)
  drawEye(k, pos.x + EYE_SPACING / 2, pos.y, heroX, heroY, surfaceOp, inst.drawCache)
}
//
// Draw a single eye with pupil tracking the hero
//
function drawEye(k, eyeX, eyeY, heroX, heroY, surfaceOp = 1, dc) {
  dc.pos.x = eyeX
  dc.pos.y = eyeY
  k.drawCircle({
    pos: dc.pos,
    radius: EYE_RADIUS + 2,
    color: dc.outlineColor,
    opacity: surfaceOp
  })
  k.drawCircle({
    pos: dc.pos,
    radius: EYE_RADIUS,
    color: dc.scleraColor,
    opacity: surfaceOp
  })
  const dx = heroX - eyeX
  const dy = heroY - eyeY
  const dist = Math.sqrt(dx * dx + dy * dy)
  const maxOffset = EYE_RADIUS - PUPIL_RADIUS - 1
  const nx = dist > 0 ? dx / dist : 0
  const ny = dist > 0 ? dy / dist : 0
  dc.pos2.x = eyeX + nx * maxOffset
  dc.pos2.y = eyeY + ny * maxOffset
  k.drawCircle({
    pos: dc.pos2,
    radius: PUPIL_RADIUS,
    color: dc.pupilColor,
    opacity: surfaceOp
  })
}
//
// Spawns dirt chunks at the ground line while rising or retracting
//
function spawnDirtParticles(inst, dt) {
  if (inst.phase === 'retracting' && inst.riseAmount < BODY_HEIGHT * 0.14) return
  inst.dirtTimer += dt
  if (inst.dirtTimer < DIRT_SPAWN_INTERVAL) return
  inst.dirtTimer -= DIRT_SPAWN_INTERVAL
  for (let i = 0; i < DIRT_COUNT_PER_SPAWN; i++) {
    const side = Math.random() > 0.5 ? 1 : -1
    const speed = DIRT_SPEED_MIN + Math.random() * (DIRT_SPEED_MAX - DIRT_SPEED_MIN)
    inst.dirtParticles.push({
      x: inst.x + side * (BASE_WIDTH / 3 + Math.random() * 10),
      y: inst.floorY - 2 - Math.random() * 5,
      vx: side * speed,
      vy: -(20 + Math.random() * 40),
      life: DIRT_LIFETIME,
      size: DIRT_SIZE_MIN + Math.random() * (DIRT_SIZE_MAX - DIRT_SIZE_MIN)
    })
  }
}
//
// Updates dirt particle positions and removes expired ones
//
function updateDirtParticles(inst, dt) {
  for (let i = inst.dirtParticles.length - 1; i >= 0; i--) {
    const p = inst.dirtParticles[i]
    p.x += p.vx * dt
    p.vx *= 0.97
    p.vy += DIRT_GRAVITY * dt
    p.y += p.vy * dt
    p.life -= dt
    if (p.life <= 0 || p.y > inst.floorY + 10) {
      inst.dirtParticles.splice(i, 1)
    }
  }
}
//
// Draws dirt particles as small irregular shapes
//
function drawDirtParticles(inst) {
  const { k } = inst
  const dc = inst.drawCache
  const surfaceOp = inst.surfaceDrawOpacity ?? 1
  for (const p of inst.dirtParticles) {
    const alpha = Math.max(0, p.life / DIRT_LIFETIME)
    dc.pos.x = p.x - p.size / 2
    dc.pos.y = p.y - p.size / 2
    k.drawRect({
      pos: dc.pos,
      width: p.size,
      height: p.size * 0.6,
      color: dc.dirtColor,
      opacity: alpha * 0.9 * surfaceOp
    })
    dc.pos2.x = p.x - p.size * 0.3
    dc.pos2.y = p.y - p.size * 0.3
    k.drawRect({
      pos: dc.pos2,
      width: p.size * 0.5,
      height: p.size * 0.4,
      color: dc.darkDirtColor,
      opacity: alpha * 0.5 * surfaceOp
    })
  }
}
//
// Plays a short rough burst sound when the worm begins emerging
//
function playEmergenceSound(inst) {
  if (!inst.sfx) return
  const ctx = inst.sfx.audioContext
  if (!ctx || ctx.state !== 'running') return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(35, now)
  osc.frequency.exponentialRampToValueAtTime(18, now + 0.6)
  gain.gain.setValueAtTime(EMERGENCE_VOLUME, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.7)
  const noise = ctx.createBufferSource()
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
  const channel = buffer.getChannelData(0)
  for (let i = 0; i < channel.length; i++) {
    channel[i] = (Math.random() * 2 - 1) * 0.8
  }
  noise.buffer = buffer
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(EMERGENCE_VOLUME * 0.9, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 500
  filter.Q.value = 2
  noise.connect(filter)
  filter.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noise.start(now)
}
//
// Continuous rough friction/scraping loop while worm moves through earth
//
function startFrictionSound(inst) {
  if (!inst.sfx) return
  const ctx = inst.sfx.audioContext
  if (!ctx || ctx.state !== 'running') return
  stopFrictionSound(inst)
  const now = ctx.currentTime
  const noise = ctx.createBufferSource()
  const bufLen = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate)
  const channel = buffer.getChannelData(0)
  for (let i = 0; i < bufLen; i++) {
    channel[i] = (Math.random() * 2 - 1) * 0.7
  }
  noise.buffer = buffer
  noise.loop = true
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 500
  filter.Q.value = 2
  const hiFilter = ctx.createBiquadFilter()
  hiFilter.type = 'highpass'
  hiFilter.frequency.value = 120
  hiFilter.Q.value = 3
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.linearRampToValueAtTime(FRICTION_VOLUME, now + 0.1)
  noise.connect(filter)
  filter.connect(hiFilter)
  hiFilter.connect(gain)
  gain.connect(ctx.destination)
  noise.start(now)
  inst.frictionNode = noise
  inst.frictionGain = gain
}
//
// Stops the friction loop
//
function stopFrictionSound(inst) {
  if (!inst.frictionNode) return
  const ctx = inst.sfx?.audioContext
  if (!ctx) return
  const now = ctx.currentTime
  inst.frictionGain.gain.linearRampToValueAtTime(0.001, now + 0.2)
  const node = inst.frictionNode
  setTimeout(() => { try { node.stop() } catch (_) {} }, 300)
  inst.frictionNode = null
  inst.frictionGain = null
}
//
// Starts sinister alien ambient sounds
//
function startAlienAmbient(inst) {
  inst.alienTimer = 0
  playAlienChirp(inst)
}
//
// Periodically triggers alien chirps
//
function updateAlienAmbient(inst, dt) {
  inst.alienTimer += dt
  if (inst.alienTimer >= ALIEN_SOUND_INTERVAL) {
    inst.alienTimer -= ALIEN_SOUND_INTERVAL
    playAlienChirp(inst)
  }
}
//
// Stops alien ambient sounds
//
function stopAlienAmbient(inst) {
  inst.alienTimer = 0
}
//
// Plays a sinister alien sound: low dissonant growl with FM modulation
//
function playAlienChirp(inst) {
  if (!inst.sfx) return
  const ctx = inst.sfx.audioContext
  if (!ctx || ctx.state !== 'running') return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const baseFreq = 80 + Math.random() * 60
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(baseFreq, now)
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, now + 0.4)
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + 0.8)
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.linearRampToValueAtTime(ALIEN_VOLUME, now + 0.08)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9)
  const mod = ctx.createOscillator()
  const modGain = ctx.createGain()
  mod.frequency.value = 3 + Math.random() * 5
  modGain.gain.value = 40 + Math.random() * 30
  mod.connect(modGain)
  modGain.connect(osc.frequency)
  mod.start(now)
  mod.stop(now + 0.9)
  const distFilter = ctx.createBiquadFilter()
  distFilter.type = 'lowpass'
  distFilter.frequency.value = 300
  distFilter.Q.value = 8
  osc.connect(distFilter)
  distFilter.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.9)
}
//
// Draw a satisfied smile (curved upward arc with teeth peeking out)
//
function drawSmile(inst, mouthPos, surfaceOp = 1) {
  const { k } = inst
  const t = inst.smileT
  const bodyW = getWidth(MOUTH_FROM_TIP_T)
  const smileW = Math.min(MOUTH_MAX_WIDTH * 0.8, bodyW * 0.85) * t
  const smileH = MOUTH_MAX_HEIGHT * 0.35 * t
  if (smileW < 1) return
  const dc = inst.drawCache
  //
  // Dark mouth interior (narrow ellipse for closed-mouth grin)
  //
  dc.pos.x = mouthPos.x
  dc.pos.y = mouthPos.y
  k.drawEllipse({
    pos: dc.pos,
    radiusX: smileW / 2,
    radiusY: smileH / 2,
    color: dc.mouthColor,
    opacity: surfaceOp
  })
  //
  // Curved smile line (arc of small segments)
  //
  const arcSegments = 8
  const curveDepth = smileH * 0.6
  for (let i = 0; i < arcSegments; i++) {
    const a1 = (i / arcSegments) * Math.PI
    const a2 = ((i + 1) / arcSegments) * Math.PI
    dc.lineP1.x = mouthPos.x - smileW / 2 + (smileW * i / arcSegments)
    dc.lineP1.y = mouthPos.y + Math.sin(a1) * curveDepth
    dc.lineP2.x = mouthPos.x - smileW / 2 + (smileW * (i + 1) / arcSegments)
    dc.lineP2.y = mouthPos.y + Math.sin(a2) * curveDepth
    k.drawLine({
      p1: dc.lineP1,
      p2: dc.lineP2,
      width: 2 * t,
      color: dc.outlineColor,
      opacity: surfaceOp
    })
  }
  //
  // Small teeth peeking from the top of the smile
  //
  const toothCount = 3
  for (let i = 0; i < toothCount; i++) {
    const tx = mouthPos.x - smileW * 0.3 + (i * smileW * 0.3)
    const th = 3 * t
    dc.toothP1.x = tx - 2
    dc.toothP1.y = mouthPos.y - smileH * 0.3
    dc.toothP2.x = tx + 2
    dc.toothP2.y = mouthPos.y - smileH * 0.3
    dc.toothP3.x = tx
    dc.toothP3.y = mouthPos.y - smileH * 0.3 + th
    k.drawTriangle({
      p1: dc.toothP1,
      p2: dc.toothP2,
      p3: dc.toothP3,
      color: dc.toothColor,
      opacity: surfaceOp
    })
  }
}
//
// Pre-allocates all colors and shared vec2 instances used in draw functions.
// Called once in create(); eliminates ~140 k.rgb/k.vec2 allocations per frame
// while the worm is visible.
//
function buildDrawCache(k) {
  return {
    outlineColor: k.rgb(OUTLINE_COLOR_R, OUTLINE_COLOR_G, OUTLINE_COLOR_B),
    //
    // 24 gradient colors for body fill — one per node, t = i / (NODE_COUNT - 1).
    // colorShift = t * 0.15 interpolates from base toward highlight.
    //
    nodeColors: Array.from({ length: NODE_COUNT }, (_, i) => {
      const t = i / (NODE_COUNT - 1)
      const s = t * 0.15
      return k.rgb(
        BODY_COLOR_R + (BODY_HIGHLIGHT_R - BODY_COLOR_R) * s,
        BODY_COLOR_G + (BODY_HIGHLIGHT_G - BODY_COLOR_G) * s,
        BODY_COLOR_B + (BODY_HIGHLIGHT_B - BODY_COLOR_B) * s
      )
    }),
    highlightColor: k.rgb(BODY_HIGHLIGHT_R + 30, BODY_HIGHLIGHT_G + 20, BODY_HIGHLIGHT_B + 15),
    bulgeBodyColor: k.rgb(BODY_COLOR_R + 5, BODY_COLOR_G + 3, BODY_COLOR_B + 2),
    moundColor: k.rgb(DIRT_COLOR_R, DIRT_COLOR_G, DIRT_COLOR_B),
    dirtColor: k.rgb(DIRT_COLOR_R, DIRT_COLOR_G, DIRT_COLOR_B),
    darkDirtColor: k.rgb(DIRT_COLOR_R - 15, DIRT_COLOR_G - 12, DIRT_COLOR_B - 10),
    mouthColor: k.rgb(MOUTH_COLOR_R, MOUTH_COLOR_G, MOUTH_COLOR_B),
    toothColor: k.rgb(TOOTH_COLOR_R, TOOTH_COLOR_G, TOOTH_COLOR_B),
    scleraColor: k.rgb(SCLERA_R, SCLERA_G, SCLERA_B),
    pupilColor: k.rgb(PUPIL_R, PUPIL_G, PUPIL_B),
    //
    // Shared position vec2s — mutated before each draw call, safe because
    // Kaplay draw calls are synchronous and immediate (canvas-based).
    //
    pos: k.vec2(0, 0),
    pos2: k.vec2(0, 0),
    toothP1: k.vec2(0, 0),
    toothP2: k.vec2(0, 0),
    toothP3: k.vec2(0, 0),
    lineP1: k.vec2(0, 0),
    lineP2: k.vec2(0, 0)
  }
}
