import { CFG } from '../cfg.js'
import * as Sound from '../../../utils/sound.js'

const Z_TIME_LEVEL0_AMBIENCE = 15.63
const BIRD_SOUND_INTERVAL_MIN = 4.5
const BIRD_SOUND_INTERVAL_MAX = 11
const STEAM_SPAWN_INTERVAL_MIN = 2.1
const STEAM_SPAWN_INTERVAL_MAX = 5.8
const STEAM_PARTICLE_COUNT = 6
const STEAM_RISE_SPEED_MIN = 38
const STEAM_RISE_SPEED_MAX = 62
const STEAM_DRIFT = 14
const STEAM_LIFE_MIN = 0.45
const STEAM_LIFE_MAX = 0.85
const STEAM_SIZE_MIN = 2.5
const STEAM_SIZE_MAX = 6
const LAMP_POLE_TOP_OFFSET = 218
const LAMP_ARM_LENGTH = 76
const LAMP_METAL_WIDTH = 10
const LAMP_SHADE_HALF_TOP = 9
const LAMP_SHADE_HALF_BOTTOM = 13
const LAMP_SHADE_DROP = 24
const LAMP_SHADE_TOP_BELOW_ARM = -6
const LAMP_SHADE_OFFSET_X = -9
const LAMP_BULB_BELOW_SHADE = 9
const LAMP_ARC_INTERVAL_MIN = 2.0
const LAMP_ARC_INTERVAL_MAX = 4.9
const LAMP_ARC_RECOVER_MIN = 0.62
const LAMP_ARC_RECOVER_MAX = 1.12
const LAMP_POLE_FILL_R = 146
const LAMP_POLE_FILL_G = 148
const LAMP_POLE_FILL_B = 153
const LAMP_POLE_OUTLINE_PAD = 2
const LAMP_SHADE_OUTLINE_SCALE = 1.072
const LAMP_FLICKER_PHASE_SPEED = 44
const LAMP_FLICKER_AMP1 = 0.14
const LAMP_FLICKER_AMP2 = 0.11
const LAMP_FLICKER_AMP3 = 0.09
const LAMP_MICRO_DIM_PER_SEC = 2.8
const LAMP_MICRO_BRIGHT_PER_SEC = 1.1
//
// Same vertical offset as MovingCars `platformTopY` — road surface on bottom platform
//
const STREET_SURFACE_ABOVE_PLATFORM_TOP = 17
const MANHOLE_CENTER_X_OFFSET_FROM_ANTIHRO = 168
const MANHOLE_ELLIPSE_BOTTOM_ABOVE_STREET = 11
const COVER_OFFSET_X_FROM_MANHOLE = 46
const COVER_OFFSET_Y_FROM_MANHOLE = 7

/**
 * Starts street ambience layer for time level 0 (audio loops + visuals).
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.sound - Sound instance from Sound.create()
 * @param {number} cfg.platformSideWidth - Side wall width (game inset)
 * @param {number} cfg.platformBottomHeight - Bottom platform height
 * @param {number} cfg.topPlatformHeight - Top dead-zone height
 * @param {number} cfg.antiHeroSpawnX - Anti-hero spawn X (manhole placed left of them)
 * @returns {{ cleanup: Function }} Call cleanup on scene leave
 */
export function create(cfg) {
  const gaLeft = cfg.platformSideWidth
  const gaRight = CFG.visual.screen.width - cfg.platformSideWidth
  const topY = cfg.topPlatformHeight
  const streetSurfaceY = CFG.visual.screen.height - cfg.platformBottomHeight + STREET_SURFACE_ABOVE_PLATFORM_TOP
  const manholeCx = cfg.antiHeroSpawnX - MANHOLE_CENTER_X_OFFSET_FROM_ANTIHRO
  const manholeCy = streetSurfaceY - MANHOLE_ELLIPSE_BOTTOM_ABOVE_STREET
  const stopMotor = Sound.startDistantMotorAmbience(cfg.sound)
  const steamParticles = []
  const steamInner = cfg.k.rgb(235, 242, 248)
  const steamOuter = cfg.k.rgb(205, 218, 228)
  const lampRecoverTarget = 0.62 + Math.random() * 0.12
  const inst = {
    k: cfg.k,
    sound: cfg.sound,
    gaLeft,
    gaRight,
    topY,
    streetSurfaceY,
    steamParticles,
    manholeCx,
    manholeCy,
    steamInner,
    steamOuter,
    steamTimer: STEAM_SPAWN_INTERVAL_MIN + Math.random() * (STEAM_SPAWN_INTERVAL_MAX - STEAM_SPAWN_INTERVAL_MIN),
    birdTimer: BIRD_SOUND_INTERVAL_MIN + Math.random() * (BIRD_SOUND_INTERVAL_MAX - BIRD_SOUND_INTERVAL_MIN),
    lampBrightness: lampRecoverTarget,
    lampEnvelope: lampRecoverTarget,
    lampFlickerPhase: Math.random() * Math.PI * 8,
    lampNextArcIn: LAMP_ARC_INTERVAL_MIN + Math.random() * (LAMP_ARC_INTERVAL_MAX - LAMP_ARC_INTERVAL_MIN),
    lampRecoveryTimer: 0,
    lampRecoveryDuration: 0.25,
    lampDimPeak: 0.08,
    lampRecoverTarget,
    lampX: gaLeft + 88,
    lampBaseY: streetSurfaceY - 4,
    lampTopY: streetSurfaceY - LAMP_POLE_TOP_OFFSET,
    lampArmEndX: gaLeft + 88 + LAMP_ARM_LENGTH,
    stopMotor
  }
  inst.layer = cfg.k.add([
    cfg.k.z(Z_TIME_LEVEL0_AMBIENCE),
    cfg.k.fixed(),
    {
      update() {
        onUpdateAmbience(inst)
      },
      draw() {
        drawAmbience(inst)
      }
    }
  ])
  inst.cleanup = () => {
    inst.stopMotor()
    cfg.k.destroy(inst.layer)
  }
  return inst
}

function onUpdateAmbience(inst) {
  const dt = inst.k.dt()
  inst.steamTimer -= dt
  if (inst.steamTimer <= 0) {
    spawnSteamBurst(inst)
    inst.steamTimer = STEAM_SPAWN_INTERVAL_MIN + Math.random() * (STEAM_SPAWN_INTERVAL_MAX - STEAM_SPAWN_INTERVAL_MIN)
  }
  updateSteamParticles(inst, dt)
  inst.birdTimer -= dt
  if (inst.birdTimer <= 0) {
    if (Math.random() > 0.42) Sound.playPigeonCooSound(inst.sound)
    else Sound.playBirdChirpSound(inst.sound)
    inst.birdTimer = BIRD_SOUND_INTERVAL_MIN + Math.random() * (BIRD_SOUND_INTERVAL_MAX - BIRD_SOUND_INTERVAL_MIN)
  }
  updateLampBrightness(inst, dt)
}

function spawnSteamBurst(inst) {
  const cx = inst.manholeCx + (Math.random() - 0.5) * 10
  const cy = inst.manholeCy - 4
  for (let i = 0; i < STEAM_PARTICLE_COUNT; i++) {
    const ml = STEAM_LIFE_MIN + Math.random() * (STEAM_LIFE_MAX - STEAM_LIFE_MIN)
    inst.steamParticles.push({
      x: cx + (Math.random() - 0.5) * 16,
      y: cy,
      vx: (Math.random() - 0.5) * STEAM_DRIFT,
      vy: -(STEAM_RISE_SPEED_MIN + Math.random() * (STEAM_RISE_SPEED_MAX - STEAM_RISE_SPEED_MIN)),
      life: ml,
      maxLife: ml,
      size: STEAM_SIZE_MIN + Math.random() * (STEAM_SIZE_MAX - STEAM_SIZE_MIN)
    })
  }
}

function updateSteamParticles(inst, dt) {
  for (let i = inst.steamParticles.length - 1; i >= 0; i--) {
    const p = inst.steamParticles[i]
    p.life -= dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.size += 2.2 * dt
    if (p.life <= 0) inst.steamParticles.splice(i, 1)
  }
}

//
// Slow arc envelope (fault + recovery + sound) × fast multi-band flicker (real lamp)
//
function updateLampBrightness(inst, dt) {
  updateLampArcEnvelope(inst, dt)
  inst.lampFlickerPhase += dt * LAMP_FLICKER_PHASE_SPEED
  const ph = inst.lampFlickerPhase
  let tw = 0.58
    + LAMP_FLICKER_AMP1 * Math.sin(ph * 11.7)
    + LAMP_FLICKER_AMP2 * Math.sin(ph * 29.3 + 2.1)
    + LAMP_FLICKER_AMP3 * Math.sin(ph * 67.9 + 0.6)
    + LAMP_FLICKER_AMP3 * 0.7 * Math.sin(ph * 103.4 + 4.2)
  tw = Math.max(0.22, Math.min(1, tw))
  if (Math.random() < LAMP_MICRO_DIM_PER_SEC * dt) {
    tw *= 0.06 + Math.random() * 0.42
  }
  if (Math.random() < LAMP_MICRO_BRIGHT_PER_SEC * dt) {
    tw = Math.min(1, tw + 0.12 + Math.random() * 0.28)
  }
  inst.lampBrightness = Math.max(0.025, Math.min(1, inst.lampEnvelope * tw))
}

function updateLampArcEnvelope(inst, dt) {
  if (inst.lampRecoveryTimer > 0) {
    inst.lampRecoveryTimer -= dt
    const elapsed = inst.lampRecoveryDuration - Math.max(0, inst.lampRecoveryTimer)
    const u = Math.min(1, elapsed / inst.lampRecoveryDuration)
    inst.lampEnvelope = inst.lampDimPeak + (inst.lampRecoverTarget - inst.lampDimPeak) * u
    return
  }
  inst.lampEnvelope = inst.lampRecoverTarget
  inst.lampNextArcIn -= dt
  if (inst.lampNextArcIn > 0) return
  Sound.playLampArcSound(inst.sound)
  inst.lampDimPeak = 0.035 + Math.random() * 0.055
  inst.lampEnvelope = inst.lampDimPeak
  inst.lampRecoveryDuration = LAMP_ARC_RECOVER_MIN + Math.random() * (LAMP_ARC_RECOVER_MAX - LAMP_ARC_RECOVER_MIN)
  inst.lampRecoveryTimer = inst.lampRecoveryDuration
  inst.lampRecoverTarget = 0.56 + Math.random() * 0.18
  inst.lampNextArcIn = LAMP_ARC_INTERVAL_MIN + Math.random() * (LAMP_ARC_INTERVAL_MAX - LAMP_ARC_INTERVAL_MIN)
}

function drawAmbience(inst) {
  drawStreetLamp(inst)
  drawManholeAndSteam(inst)
}

//
// Thick Г mast: darker gray metal fill + black rim; shade offset along arm
//
function drawStreetLamp(inst) {
  const k = inst.k
  const poleCx = inst.lampX
  const armY = inst.lampTopY
  const armEnd = inst.lampArmEndX
  const W = LAMP_METAL_WIDTH
  const poleFill = k.rgb(LAMP_POLE_FILL_R, LAMP_POLE_FILL_G, LAMP_POLE_FILL_B)
  const poleStroke = k.rgb(0, 0, 0)
  const armLeft = poleCx - W / 2
  const poleTop = armY
  const poleH = inst.lampBaseY - poleTop
  drawOutlinedRect(k, armLeft, poleTop, W, poleH, poleFill, poleStroke, LAMP_POLE_OUTLINE_PAD)
  const armW = armEnd - armLeft
  drawOutlinedRect(k, armLeft, armY - W / 2, armW, W, poleFill, poleStroke, LAMP_POLE_OUTLINE_PAD)
  const shadeCx = armEnd + LAMP_SHADE_OFFSET_X
  const shadeTopY = armY + LAMP_SHADE_TOP_BELOW_ARM
  const shadeBotY = shadeTopY + LAMP_SHADE_DROP
  drawOutlinedTrapezoid(
    k,
    shadeCx,
    shadeTopY,
    shadeBotY,
    LAMP_SHADE_HALF_TOP,
    LAMP_SHADE_HALF_BOTTOM,
    poleFill,
    poleStroke
  )
  const bulbY = shadeBotY + LAMP_BULB_BELOW_SHADE
  const br = inst.lampBrightness
  k.drawCircle({
    pos: k.vec2(shadeCx, bulbY),
    radius: 16,
    color: k.rgb(255, 248, 200),
    opacity: 0.22 * br
  })
  k.drawCircle({
    pos: k.vec2(shadeCx, bulbY),
    radius: 9,
    color: k.rgb(255, 242, 188),
    opacity: 0.32 * br
  })
  k.drawCircle({
    pos: k.vec2(shadeCx, bulbY),
    radius: 4,
    color: k.rgb(255, 255, 235),
    opacity: 0.45 + br * 0.28
  })
}

function drawManholeAndSteam(inst) {
  const k = inst.k
  const cx = inst.manholeCx
  const cy = inst.manholeCy
  k.drawEllipse({
    pos: k.vec2(cx, cy),
    radiusX: 34,
    radiusY: 12,
    color: k.rgb(22, 22, 28),
    opacity: 0.93
  })
  k.drawEllipse({
    pos: k.vec2(cx, cy - 1),
    radiusX: 29,
    radiusY: 8,
    color: k.rgb(6, 6, 10),
    opacity: 0.9
  })
  drawManholeCoverDisc(inst)
  for (const p of inst.steamParticles) {
    const alpha = Math.max(0, p.life / p.maxLife) * 0.38
    k.drawCircle({
      pos: k.vec2(p.x, p.y),
      radius: p.size + 1.5,
      color: inst.steamOuter,
      opacity: alpha * 0.34
    })
    k.drawCircle({
      pos: k.vec2(p.x, p.y),
      radius: p.size,
      color: inst.steamInner,
      opacity: alpha
    })
  }
}

function drawManholeCoverDisc(inst) {
  const k = inst.k
  const cx = inst.manholeCx + COVER_OFFSET_X_FROM_MANHOLE
  const cy = inst.manholeCy + COVER_OFFSET_Y_FROM_MANHOLE
  const ang = 0.44
  const w = 56
  const h = 9
  const c = Math.cos(ang)
  const s = Math.sin(ang)
  const pts = [
    k.vec2(cx + (-w / 2) * c - (-h / 2) * s, cy + (-w / 2) * s + (-h / 2) * c),
    k.vec2(cx + (w / 2) * c - (-h / 2) * s, cy + (w / 2) * s + (-h / 2) * c),
    k.vec2(cx + (w / 2) * c - (h / 2) * s, cy + (w / 2) * s + (h / 2) * c),
    k.vec2(cx + (-w / 2) * c - (h / 2) * s, cy + (-w / 2) * s + (h / 2) * c)
  ]
  k.drawPolygon({
    pts,
    color: k.rgb(58, 58, 64),
    opacity: 0.91
  })
}

//
// Trapezoid shade: opaque mast-gray fill + black rim (centroid-scaled outer ring)
//
function drawOutlinedTrapezoid(k, cx, topY, botY, halfTop, halfBot, fillRgb, strokeRgb) {
  const tl = k.vec2(cx - halfTop, topY)
  const tr = k.vec2(cx + halfTop, topY)
  const br = k.vec2(cx + halfBot, botY)
  const bl = k.vec2(cx - halfBot, botY)
  const ptsInner = [tl, tr, br, bl]
  const mx = (tl.x + tr.x + br.x + bl.x) / 4
  const my = (tl.y + tr.y + br.y + bl.y) / 4
  const s = LAMP_SHADE_OUTLINE_SCALE
  const ptsOuter = ptsInner.map((p) => k.vec2(mx + (p.x - mx) * s, my + (p.y - my) * s))
  k.drawPolygon({
    pts: ptsOuter,
    color: strokeRgb,
    opacity: 1
  })
  k.drawPolygon({
    pts: ptsInner,
    color: fillRgb,
    opacity: 1
  })
}
//
// Black outline pad around filled rect (mast segments)
//
function drawOutlinedRect(k, x, y, w, h, fillRgb, strokeRgb, pad) {
  k.drawRect({
    pos: k.vec2(x - pad, y - pad),
    width: w + pad * 2,
    height: h + pad * 2,
    color: strokeRgb,
    opacity: 1
  })
  k.drawRect({
    pos: k.vec2(x, y),
    width: w,
    height: h,
    color: fillRgb,
    opacity: 1
  })
}
