import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { get, set } from '../../../utils/progress.js'
import { getRGB } from '../../../utils/helper.js'

//
// Hidden platform and collectible hero configuration
//
const PLATFORM_HEIGHT = 20
const REVEAL_DISTANCE = 150
const BONUS_POINTS = 3
const HERO_SCALE = 1.5
const SPARKLE_INTERVAL_MIN = 2.5
const SPARKLE_INTERVAL_MAX = 5.0
const SPARKLE_DURATION = 0.4
const SPARKLE_RADIUS = 8
const SPARKLE_COLOR_R = 255
const SPARKLE_COLOR_G = 220
const SPARKLE_COLOR_B = 100
const COLLECT_PARTICLE_COUNT = 12
const COLLECT_PARTICLE_SPEED = 120
const COLLECT_PARTICLE_LIFETIME = 0.8
//
// Log platform visual constants (simplified log barrel style)
//
const LOG_BARK_COLOR = '#5C3A1E'
const LOG_BARK_LIGHT = '#7A5030'
const LOG_BARK_DARK = '#3E2510'
const LOG_END_STEPS = 12
const LOG_END_SQUASH = 0.55
const LOG_CRACK_COUNT = 7
const LOG_KNOT_COUNT = 3
const LOG_RING_COLOR = '#A07050'
const LOG_RING_DARK = '#6B4930'
//
// Speed bonus flash effect on HUD small hero
//
const BONUS_FLASH_COUNT = 20
const BONUS_FLASH_INTERVAL = 0.05
const BONUS_PARTICLE_COUNT = 8
const BONUS_PARTICLE_SPEED_MIN = 30
const BONUS_PARTICLE_SPEED_RANGE = 20
const BONUS_PARTICLE_SIZE_MIN = 4
const BONUS_PARTICLE_SIZE_RANGE = 4

/**
 * Creates a hidden bonus platform with a transparent collectible mini-hero.
 * The platform reveals when the hero approaches from a valid direction.
 * Collecting the mini-hero awards bonus points with a particle effect.
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - Center X of the hidden platform
 * @param {number} config.y - Y position (top of platform)
 * @param {number} config.width - Platform width
 * @param {Object} config.heroInst - Main hero instance to track
 * @param {Object} config.levelIndicator - Level indicator for score display
 * @param {Object} [config.sfx] - Sound instance
 * @param {boolean} [config.approachFromAbove] - Only reveal when hero falls from above
 * @param {number} [config.revealDistance] - Custom reveal distance
 * @param {string} [config.heroBodyColor] - Body color for the mini-hero (defaults to main hero color)
 * @param {string} [config.storageKey] - localStorage key to persist collection state
 * @returns {Object} Bonus hero instance
 */
export function create(config) {
  const {
    k, x, y, width,
    heroInst, levelIndicator, sfx,
    approachFromAbove = false,
    revealDistance = REVEAL_DISTANCE,
    heroBodyColor = null,
    storageKey = null
  } = config
  //
  // Skip creation if bonus was already collected in a previous visit
  //
  if (storageKey && get(storageKey, false)) return null
  //
  // Off-screen Y so the collision body is unreachable until hero approaches from above
  //
  const OFF_SCREEN_Y = -5000
  const startY = approachFromAbove ? OFF_SCREEN_Y : y
  //
  // Invisible collision platform
  //
  const platform = k.add([
    k.rect(width, PLATFORM_HEIGHT),
    k.pos(x, startY),
    k.anchor('center'),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Small hero on the platform (completely invisible - only sparkle hints)
  //
  const miniColor = heroBodyColor || heroInst.bodyColor || CFG.visual.colors.hero.body
  const miniHero = Hero.create({
    k,
    x,
    y: y - PLATFORM_HEIGHT / 2 - 10,
    type: Hero.HEROES.HERO,
    controllable: false,
    isStatic: true,
    scale: HERO_SCALE,
    bodyColor: miniColor
  })
  miniHero.character.opacity = 0
  miniHero.character.z = CFG.visual.zIndex.platforms + 1

  const inst = {
    k,
    platform,
    miniHero,
    heroInst,
    levelIndicator,
    sfx,
    x,
    y,
    width,
    revealed: false,
    collected: false,
    platformOpacity: 0,
    sparkleTimer: SPARKLE_INTERVAL_MIN + Math.random() * (SPARKLE_INTERVAL_MAX - SPARKLE_INTERVAL_MIN),
    sparkleActive: false,
    sparkleT: 0,
    collectParticles: [],
    approachFromAbove,
    revealDistance,
    bonusFlashParticles: [],
    miniColor,
    offScreenY: OFF_SCREEN_Y,
    logDetail: generateLogDetail(width, PLATFORM_HEIGHT),
    storageKey
  }
  //
  // Reveal visual when hero physically lands on the platform
  //
  platform.onCollide(() => {
    if (!inst.revealed) inst.revealed = true
  })
  //
  // Draw log platform, sparkle hints, and collection particles
  //
  k.add([
    k.pos(0, 0),
    k.z(CFG.visual.zIndex.player + 5),
    {
      draw() {
        onDraw(inst)
      }
    }
  ])
  k.onUpdate(() => onUpdate(inst))
  return inst
}
//
// Per-frame update: reveal, sparkle, collection detection
//
function onUpdate(inst) {
  const dt = inst.k.dt()
  if (inst.collected) {
    updateCollectParticles(inst, dt)
    updateBonusFlashParticles(inst, dt)
    return
  }
  const heroPos = inst.heroInst.character?.pos
  if (!heroPos) return
  const dx = Math.abs(heroPos.x - inst.x)
  const dy = heroPos.y - inst.y
  //
  // One-way platform: only collidable when hero falls onto it from directly above.
  // Requires hero to be above AND horizontally close. Stays in place once revealed.
  //
  if (inst.approachFromAbove) {
    if (inst.revealed) {
      inst.platform.pos.y = inst.y
    } else {
      const heroAbove = dy < -10 && dx < inst.width / 2 + 30
      inst.platform.pos.y = heroAbove ? inst.y : inst.offScreenY
    }
  }
  //
  // Non-approachFromAbove: distance-based reveal
  //
  if (!inst.revealed && !inst.approachFromAbove) {
    const inRange = dx < inst.revealDistance && Math.abs(dy) < inst.revealDistance
    if (inRange) inst.revealed = true
  }
  //
  // Snap platform and mini-hero to full visibility once revealed
  //
  if (inst.revealed && inst.platformOpacity < 1) {
    inst.platformOpacity = 1
    inst.miniHero.character.opacity = 1
  }
  //
  // Sparkle hint (visible even before platform reveal)
  //
  updateSparkle(inst, dt)
  //
  // Collection check: hero touches the mini-hero area
  //
  if (inst.revealed) {
    const heroX = heroPos.x
    const heroY = heroPos.y
    const collectDist = 40
    if (Math.abs(heroX - inst.x) < collectDist && Math.abs(heroY - (inst.y - PLATFORM_HEIGHT / 2 - 10)) < collectDist + 20) {
      collectBonus(inst)
    }
  }
  updateCollectParticles(inst, dt)
  updateBonusFlashParticles(inst, dt)
}
//
// Sparkle timer and activation
//
function updateSparkle(inst, dt) {
  if (inst.sparkleActive) {
    inst.sparkleT += dt
    if (inst.sparkleT >= SPARKLE_DURATION) {
      inst.sparkleActive = false
      inst.sparkleTimer = SPARKLE_INTERVAL_MIN + Math.random() * (SPARKLE_INTERVAL_MAX - SPARKLE_INTERVAL_MIN)
    }
  } else {
    inst.sparkleTimer -= dt
    if (inst.sparkleTimer <= 0) {
      inst.sparkleActive = true
      inst.sparkleT = 0
    }
  }
}
//
// Draw log platform, sparkle effect, and collection particles
//
function onDraw(inst) {
  const { k } = inst
  //
  // Draw log-style platform when revealed
  //
  if (inst.revealed && inst.platformOpacity > 0) {
    drawLogPlatform(inst)
  }
  //
  // Sparkle hint: small flash near the mini-hero position
  //
  if (inst.sparkleActive && !inst.collected) {
    const t = inst.sparkleT / SPARKLE_DURATION
    const sparkleOpacity = Math.sin(t * Math.PI)
    const sparkleSize = SPARKLE_RADIUS * (0.5 + sparkleOpacity * 0.5)
    const sparkleColor = k.rgb(SPARKLE_COLOR_R, SPARKLE_COLOR_G, SPARKLE_COLOR_B)
    const sparkleY = inst.y - PLATFORM_HEIGHT / 2 - 10
    k.drawCircle({
      pos: k.vec2(inst.x, sparkleY),
      radius: sparkleSize,
      color: sparkleColor,
      opacity: sparkleOpacity * 0.7
    })
    const rayCount = 4
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2 + t * Math.PI
      const rayLen = sparkleSize * 1.5
      k.drawLine({
        p1: k.vec2(
          inst.x + Math.cos(angle) * sparkleSize * 0.5,
          sparkleY + Math.sin(angle) * sparkleSize * 0.5
        ),
        p2: k.vec2(
          inst.x + Math.cos(angle) * rayLen,
          sparkleY + Math.sin(angle) * rayLen
        ),
        width: 1.5,
        color: sparkleColor,
        opacity: sparkleOpacity * 0.5
      })
    }
  }
  //
  // Collection burst particles
  //
  drawCollectParticles(inst)
  drawBonusFlashParticles(inst)
}
//
// Draw a simplified log-style platform
//
function drawLogPlatform(inst) {
  const { k, x, y, width, platformOpacity } = inst
  const w = width
  const h = PLATFORM_HEIGHT
  const halfW = w / 2
  const halfH = h / 2
  const endR = halfH
  const sq = LOG_END_SQUASH
  const opacity = platformOpacity
  const barkColor = getRGB(k, LOG_BARK_COLOR)
  const barkLight = getRGB(k, LOG_BARK_LIGHT)
  const barkDark = getRGB(k, LOG_BARK_DARK)
  //
  // Main barrel body
  //
  const bodyPts = []
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    bodyPts.push(k.vec2(x - halfW + endR * Math.cos(a) * sq, y + endR * Math.sin(a)))
  }
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = -Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    bodyPts.push(k.vec2(x + halfW + endR * Math.cos(a) * sq, y + endR * Math.sin(a)))
  }
  //
  // Dark shadow outline
  //
  k.drawPolygon({ pts: bodyPts.map(p => k.vec2(p.x, p.y + 2)), color: k.rgb(0, 0, 0), opacity: 0.4 * opacity })
  //
  // Bark body
  //
  k.drawPolygon({ pts: bodyPts, color: barkColor, opacity })
  //
  // Light streak on top half
  //
  const topPts = []
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    const r = endR * 0.85
    topPts.push(k.vec2(x - halfW + r * Math.cos(a) * sq, y + r * Math.sin(a) * 0.45 - halfH * 0.2))
  }
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = -Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    const r = endR * 0.85
    topPts.push(k.vec2(x + halfW + r * Math.cos(a) * sq, y + r * Math.sin(a) * 0.45 - halfH * 0.2))
  }
  k.drawPolygon({ pts: topPts, color: barkLight, opacity: 0.5 * opacity })
  //
  // Horizontal bark lines
  //
  for (let i = 0; i < 3; i++) {
    const ly = y - halfH + (h / 4) * (i + 1)
    k.drawRect({
      pos: k.vec2(x - halfW + endR * sq, ly),
      width: w - endR * sq * 2,
      height: 1,
      color: barkDark,
      opacity: 0.3 * opacity
    })
  }
  //
  // Cracks: short dark diagonal lines across the bark
  //
  const detail = inst.logDetail
  for (const crack of detail.cracks) {
    const cdx = Math.cos(crack.angle) * crack.len * 0.5
    const cdy = Math.sin(crack.angle) * crack.len * 0.5
    k.drawLines({
      pts: [k.vec2(x + crack.x - cdx, y + crack.y - cdy), k.vec2(x + crack.x + cdx, y + crack.y + cdy)],
      width: 1.5,
      color: barkDark,
      opacity: 0.7 * opacity
    })
  }
  //
  // Knots: dark ovals with lighter centers on the bark surface
  //
  for (const knot of detail.knots) {
    k.drawEllipse({ pos: k.vec2(x + knot.x, y + knot.y), radiusX: knot.r, radiusY: knot.r * 0.7, color: barkDark, opacity: 0.6 * opacity })
    k.drawEllipse({ pos: k.vec2(x + knot.x, y + knot.y), radiusX: knot.r * 0.45, radiusY: knot.r * 0.3, color: barkLight, opacity: 0.4 * opacity })
  }
  //
  // Right end-grain oval with ring details
  //
  const endCX = x + halfW
  const ringColor = getRGB(k, LOG_RING_COLOR)
  const ringDark = getRGB(k, LOG_RING_DARK)
  k.drawEllipse({ pos: k.vec2(endCX, y), radiusX: endR * sq, radiusY: endR, color: ringColor, opacity })
  k.drawEllipse({ pos: k.vec2(endCX, y), radiusX: endR * sq * 0.75, radiusY: endR * 0.75, color: k.rgb(196, 149, 106), opacity })
  k.drawEllipse({ pos: k.vec2(endCX, y), radiusX: endR * sq * 0.5, radiusY: endR * 0.5, color: ringDark, opacity: 0.3 * opacity })
  k.drawEllipse({ pos: k.vec2(endCX, y), radiusX: endR * sq * 0.2, radiusY: endR * 0.2, color: barkDark, opacity: 0.5 * opacity })
}
//
// Generate random crack and knot positions for a log platform
//
function generateLogDetail(w, h) {
  const halfW = w / 2
  const halfH = h / 2
  const cracks = []
  for (let i = 0; i < LOG_CRACK_COUNT; i++) {
    cracks.push({
      x: -halfW * 0.8 + Math.random() * w * 0.75,
      y: -halfH * 0.8 + Math.random() * h * 0.8,
      angle: Math.random() * Math.PI,
      len: 6 + Math.random() * 10
    })
  }
  const knots = []
  for (let i = 0; i < LOG_KNOT_COUNT; i++) {
    knots.push({
      x: -halfW * 0.6 + Math.random() * w * 0.5,
      y: -halfH * 0.4 + Math.random() * h * 0.4,
      r: 3 + Math.random() * 3
    })
  }
  return { cracks, knots }
}
//
// Collect the bonus: add score, spawn particles, trigger HUD effect
//
function collectBonus(inst) {
  if (inst.collected) return
  inst.collected = true
  inst.miniHero.character.opacity = 0
  inst.miniHero.character.paused = true
  inst.storageKey && set(inst.storageKey, true)
  //
  // Add bonus score
  //
  const currentScore = get('heroScore', 0)
  const newScore = currentScore + BONUS_POINTS
  set('heroScore', newScore)
  inst.levelIndicator?.updateHeroScore?.(newScore)
  //
  // Play collection sound
  //
  playCollectSound(inst)
  //
  // Spawn burst particles at collection point
  //
  for (let i = 0; i < COLLECT_PARTICLE_COUNT; i++) {
    const angle = (i / COLLECT_PARTICLE_COUNT) * Math.PI * 2
    const speed = COLLECT_PARTICLE_SPEED * (0.6 + Math.random() * 0.8)
    inst.collectParticles.push({
      x: inst.x,
      y: inst.y - PLATFORM_HEIGHT / 2 - 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      life: COLLECT_PARTICLE_LIFETIME,
      maxLife: COLLECT_PARTICLE_LIFETIME,
      size: 3 + Math.random() * 4,
      color: Math.random() > 0.5 ? 'gold' : 'white'
    })
  }
  //
  // Trigger speed bonus flash on the HUD small hero
  //
  playBonusFlash(inst, 0)
  createBonusFlashParticles(inst)
}
//
// Flash the HUD small hero between its color and white (same as speed bonus)
//
function playBonusFlash(inst, count) {
  if (count >= BONUS_FLASH_COUNT) {
    inst.levelIndicator?.smallHero?.character && (inst.levelIndicator.smallHero.character.color = inst.k.rgb(255, 255, 255))
    return
  }
  if (!inst.levelIndicator?.smallHero?.character) return
  const heroColor = getRGB(inst.k, inst.miniColor)
  inst.levelIndicator.smallHero.character.color = count % 2 === 0 ? heroColor : inst.k.rgb(255, 255, 255)
  inst.k.wait(BONUS_FLASH_INTERVAL, () => playBonusFlash(inst, count + 1))
}
//
// Create outward-flying particles from the HUD small hero
//
function createBonusFlashParticles(inst) {
  if (!inst.levelIndicator?.smallHero?.character) return
  const sx = inst.levelIndicator.smallHero.character.pos.x
  const sy = inst.levelIndicator.smallHero.character.pos.y
  const heroColor = getRGB(inst.k, inst.miniColor)
  for (let i = 0; i < BONUS_PARTICLE_COUNT; i++) {
    const angle = (i / BONUS_PARTICLE_COUNT) * Math.PI * 2
    const speed = BONUS_PARTICLE_SPEED_MIN + Math.random() * BONUS_PARTICLE_SPEED_RANGE
    inst.bonusFlashParticles.push({
      x: sx,
      y: sy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.8,
      maxLife: 0.8,
      size: BONUS_PARTICLE_SIZE_MIN + Math.random() * BONUS_PARTICLE_SIZE_RANGE,
      color: heroColor
    })
  }
}
//
// Update collection particles
//
function updateCollectParticles(inst, dt) {
  for (let i = inst.collectParticles.length - 1; i >= 0; i--) {
    const p = inst.collectParticles[i]
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 150 * dt
    p.life -= dt
    if (p.life <= 0) inst.collectParticles.splice(i, 1)
  }
}
//
// Update HUD flash particles
//
function updateBonusFlashParticles(inst, dt) {
  for (let i = inst.bonusFlashParticles.length - 1; i >= 0; i--) {
    const p = inst.bonusFlashParticles[i]
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.life -= dt
    if (p.life <= 0) inst.bonusFlashParticles.splice(i, 1)
  }
}
//
// Draw collection burst particles
//
function drawCollectParticles(inst) {
  const { k } = inst
  for (const p of inst.collectParticles) {
    const alpha = Math.max(0, p.life / p.maxLife)
    const color = p.color === 'gold'
      ? k.rgb(SPARKLE_COLOR_R, SPARKLE_COLOR_G, SPARKLE_COLOR_B)
      : k.rgb(240, 240, 240)
    k.drawCircle({ pos: k.vec2(p.x, p.y), radius: p.size * alpha, color, opacity: alpha })
  }
}
//
// Draw HUD flash particles (fixed position, drawn above UI)
//
function drawBonusFlashParticles(inst) {
  const { k } = inst
  for (const p of inst.bonusFlashParticles) {
    const alpha = Math.max(0, p.life / p.maxLife)
    k.drawCircle({ pos: k.vec2(p.x, p.y), radius: p.size * alpha, color: p.color, opacity: alpha, fixed: true })
  }
}
//
// Plays a short bright chime sound on collection
//
function playCollectSound(inst) {
  if (!inst.sfx) return
  const ctx = inst.sfx.audioContext
  if (!ctx || ctx.state !== 'running') return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, now)
  osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15)
  gain.gain.setValueAtTime(0.2, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.4)
  //
  // Higher harmonic for sparkle
  //
  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()
  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(1320, now + 0.05)
  osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.2)
  gain2.gain.setValueAtTime(0.1, now + 0.05)
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
  osc2.connect(gain2)
  gain2.connect(ctx.destination)
  osc2.start(now + 0.05)
  osc2.stop(now + 0.4)
}
