import { CFG } from '../cfg.js'
import * as Sound from '../../../utils/sound.js'
import * as Tooltip from '../../../utils/tooltip.js'
import { getDarkness } from './time-day-night.js'
import { drawCrow } from '../../../utils/crow.js'

const Z_TIME_LEVEL0_AMBIENCE = 15.63
//
// Grass on its own layer above ground stripe (z=16) so it's always visible
//
const Z_GRASS_LAYER = 19
const BIRD_SOUND_INTERVAL_MIN = 4.5
const BIRD_SOUND_INTERVAL_MAX = 11
//
// Bird sounds only during day; crickets only at night
//
const BIRD_DAY_DARKNESS_MAX = 0.35
const CRICKET_SOUND_INTERVAL_MIN = 3.5
const CRICKET_SOUND_INTERVAL_MAX = 9.0
const CRICKET_NIGHT_DARKNESS_MIN = 0.38
//
// Four lamps at x = gaLeft + offset (px); lowered from 218 to 185
// Modes: 'flicker' = dims+arcs, 'steady' = always on, 'off' = dark at night
//
const LAMP_X_OFFSETS = [150, 480, 810, 1140]
const LAMP_MODES = ['flicker', 'steady', 'off', 'flicker']
const LAMP_POLE_TOP_OFFSET = 185
const LAMP_METAL_WIDTH = 9
//
// Curved arm bezier geometry (shepherd's crook shape)
//
const LAMP_CURVE_SEGMENTS = 14
const LAMP_CURVE_CTRL_DX = 62
const LAMP_CURVE_CTRL_DY = -20
const LAMP_ARM_END_DX = 84
const LAMP_ARM_END_DY = 29
//
// Parameter t on the arm bezier where the curve reaches its highest visual point.
// Derived analytically: t = -CTRL_DY / (-2*CTRL_DY + END_DY) = 20/69 ≈ 0.29
//
const CROW_ARC_PERCH_T = (-LAMP_CURVE_CTRL_DY) / (-2 * LAMP_CURVE_CTRL_DY + LAMP_ARM_END_DY)
//
// Bell-shaped shade (6-point polygon: narrow top → wide mid → slight rim)
//
const LAMP_SHADE_HALF_TOP = 5
const LAMP_SHADE_HALF_WIDE = 24
const LAMP_SHADE_HALF_RIM = 19
const LAMP_SHADE_WIDE_FRAC = 0.52
const LAMP_SHADE_HEIGHT = 24
const LAMP_SHADE_OUTLINE_SCALE = 1.08
//
// Bulb glow radii
//
const LAMP_GLOW_R1 = 16
const LAMP_GLOW_R2 = 9
const LAMP_GLOW_R3 = 4
//
// Crow perched on first lamp shade: MP3 sound keys and call timing
//
const CROW_SOUND_NAMES = ['crow0']
const CROW_CALL_INTERVAL_MIN = 5.0
const CROW_CALL_INTERVAL_MAX = 14.0
const CROW_MOUTH_OPEN_DURATION = 0.55
//
// Small delay between sound start and visible mouth-open so they sync visually.
// The MP3 has a brief attack envelope — mouth opens slightly after audio onset.
//
const CROW_MOUTH_OPEN_DELAY = 0.13
const CROW_DRAW_Z = 19.5
//
// Crow scale (matches touch level1 crow)
//
const CROW_SCALE = 1.35
//
// Decorative wider base at pole bottom
//
const LAMP_BASE_PAD = 14
const LAMP_BASE_HEIGHT = 20
const LAMP_ARC_INTERVAL_MIN = 2.0
const LAMP_ARC_INTERVAL_MAX = 4.9
const LAMP_ARC_RECOVER_MIN = 0.62
const LAMP_ARC_RECOVER_MAX = 1.12
//
// Medium gray metal color so lamps blend with the city background silhouettes
//
const LAMP_POLE_FILL_R = 128
const LAMP_POLE_FILL_G = 130
const LAMP_POLE_FILL_B = 136
const LAMP_POLE_OPACITY = 0.78
const LAMP_POLE_OUTLINE_PAD = 2
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
//
// Lamp tooltip text and offset (shown only on the first lamp near the hero)
//
const LAMP_TOOLTIP_TEXT = 'find the one who\nshines beside you'
const LAMP_TOOLTIP_OFFSET_Y = -44
//
// Crow tooltip hover area size and vertical offset
//
const CROW_TOOLTIP_HOVER_W = 52
const CROW_TOOLTIP_HOVER_H = 44
const CROW_TOOLTIP_OFFSET_Y = -50
//
// Grass tufts: small clusters around each lamp pole base
//
const GRASS_POLE_CLUSTER_SIZE = 5
const GRASS_POLE_SPREAD = 38
const GRASS_BLADE_HEIGHT_MIN = 18
const GRASS_BLADE_HEIGHT_MAX = 30
const GRASS_BLADE_ANGLE_SPREAD = 0.44
const GRASS_COLOR_R = 120
const GRASS_COLOR_G = 145
const GRASS_COLOR_B = 92
//
// Grass sway: gentle sinusoidal tip oscillation
//
const GRASS_SWAY_SPEED = 1.1
const GRASS_SWAY_AMP = 2.2
//
// Light cone projected downward from each active lamp shade
//
const CONE_HEIGHT = 125
const CONE_BASE_HALF_W = 75
const CONE_STEPS = 14
//
// Weathering marks on vertical pole segment (dots + horizontal scratches)
//
const POLE_MARK_COUNT = 30
//
// Max tilt displacement (px) at the pole top — bottom stays fixed; negative = leans left
//
const POLE_TILT_MAX = 8
//
// Snow mound on top of the vertical pole: a compact half-disk, width close to the pole
//
const SNOW_CAP_WIDTH_HALF = 5
const SNOW_CAP_HEIGHT = 5

/**
 * Starts street ambience layer for time level 0 (audio loops + visuals).
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.sound - Sound instance from Sound.create()
 * @param {number} cfg.platformSideWidth - Side wall width (game inset)
 * @param {number} cfg.platformBottomHeight - Bottom platform height
 * @param {number} cfg.topPlatformHeight - Top dead-zone height
 * @returns {{ cleanup: Function }} Call cleanup on scene leave
 */
export function create(cfg) {
  const gaLeft = cfg.platformSideWidth
  const gaRight = CFG.visual.screen.width - cfg.platformSideWidth
  const topY = cfg.topPlatformHeight
  const streetSurfaceY = CFG.visual.screen.height - cfg.platformBottomHeight + STREET_SURFACE_ABOVE_PLATFORM_TOP
  const lampBaseY = streetSurfaceY - 4
  const groundLineY = CFG.visual.screen.height - cfg.platformBottomHeight - 4
  //
  // Generate grass tufts clustered around each lamp pole base — one cluster per lamp
  //
  const lampOffsets = cfg.lampXOffsets ?? LAMP_X_OFFSETS
  //
  // showGrass defaults to true; winter/snowy levels pass false to suppress grass
  //
  const showGrass = cfg.showGrass !== false
  //
  // showSnow: when true, draw a snow cap on each lamp shade (winter levels)
  //
  const showSnow = cfg.showSnow === true
  const grassTufts = showGrass
    ? lampOffsets.flatMap((xOff, idx) =>
        generateGrassTufts(gaLeft + xOff - GRASS_POLE_SPREAD, GRASS_POLE_SPREAD * 2, groundLineY, GRASS_POLE_CLUSTER_SIZE, idx * GRASS_POLE_CLUSTER_SIZE)
      )
    : []
  const inst = {
    k: cfg.k,
    sound: cfg.sound,
    gaLeft,
    gaRight,
    topY,
    streetSurfaceY,
    birdTimer: BIRD_SOUND_INTERVAL_MIN + Math.random() * (BIRD_SOUND_INTERVAL_MAX - BIRD_SOUND_INTERVAL_MIN),
    cricketTimer: CRICKET_SOUND_INTERVAL_MIN + Math.random() * (CRICKET_SOUND_INTERVAL_MAX - CRICKET_SOUND_INTERVAL_MIN),
    //
    // Each lamp has its own independent flicker + arc state, plus behavior mode
    //
    lamps: lampOffsets.map((xOff, idx) => createLampState(gaLeft + xOff, lampBaseY, (cfg.lampModes ?? LAMP_MODES)[idx] ?? 'flicker')),
    grassTufts,
    showSnow,
    //
    // Crow: hero reference set later (after the lamp layer is registered)
    //
    crow: null,
    heroInst: cfg.heroInst ?? null
  }
  inst.layer = cfg.k.add([
    cfg.k.z(Z_TIME_LEVEL0_AMBIENCE),
    cfg.k.fixed(),
    {
      update() { onUpdateAmbience(inst) },
      draw() { drawAmbience(inst) }
    }
  ])
  //
  // Grass on a higher-z fixed layer so it appears above the ground stripe (z=16)
  //
  inst.grassLayer = cfg.k.add([
    cfg.k.z(Z_GRASS_LAYER),
    cfg.k.fixed(),
    { draw() { drawGrass(inst) } }
  ])
  //
  // Tooltip on the first lamp shade only (closest to hero)
  //
  const firstLamp = inst.lamps[0]
  Tooltip.create({
    k: cfg.k,
    targets: [{
      x: firstLamp.armEndX,
      y: firstLamp.armEndY + LAMP_SHADE_HEIGHT / 2,
      width: LAMP_SHADE_HALF_WIDE * 2 + 24,
      height: LAMP_SHADE_HEIGHT + 24,
      text: LAMP_TOOLTIP_TEXT,
      offsetY: LAMP_TOOLTIP_OFFSET_Y
    }]
  })
  //
  // Crow: load audio samples, then place crow on the lamp chosen by crowLampIndex.
  // Each level can pass a different index so the crow sits on a unique lamppost.
  //
  //
  // 'crow0' is preloaded at boot; no inline loadSound needed here.
  //
  //
  // crowLampIndex defaults to 0; clamp to valid range in case a level over-specifies.
  //
  const crowLampIdx = Math.min(cfg.crowLampIndex ?? 0, inst.lamps.length - 1)
  const crowLamp = inst.lamps[crowLampIdx]
  //
  // Compute crow's perch on the highest point of the chosen lamp arm bezier arc.
  //
  const poleTopCx = crowLamp.x + crowLamp.tiltPx
  const arcCtrlX = poleTopCx + LAMP_CURVE_CTRL_DX
  const arcCtrlY = crowLamp.topY + LAMP_CURVE_CTRL_DY
  const crowCx = quadBezier(poleTopCx, arcCtrlX, crowLamp.armEndX, CROW_ARC_PERCH_T)
  const crowArcTopY = quadBezier(crowLamp.topY, arcCtrlY, crowLamp.armEndY, CROW_ARC_PERCH_T)
  inst.crow = {
    cx: crowCx,
    //
    // Raise body so that the crow's feet (legBot = perchY + 15*sc) sit exactly
    // on top of the lamp arc rather than below it.
    //
    perchY: crowArcTopY - 18 * CROW_SCALE,
    mouthOpen: false,
    mouthTimer: 0,
    mouthOpenPending: false,
    mouthOpenDelay: 0,
    callTimer: CROW_CALL_INTERVAL_MIN + Math.random() * (CROW_CALL_INTERVAL_MAX - CROW_CALL_INTERVAL_MIN),
    soundIdx: 0
  }
  cfg.k.add([
    cfg.k.z(CROW_DRAW_Z),
    cfg.k.fixed(),
    { draw() { drawCrowOnLamp(cfg.k, inst) } }
  ])
  //
  // Crow tooltip — only created when the caller passes crowTooltipText
  //
  if (cfg.crowTooltipText) {
    Tooltip.create({
      k: cfg.k,
      targets: [{
        x: () => inst.crow.cx,
        y: () => inst.crow.perchY,
        width: CROW_TOOLTIP_HOVER_W,
        height: CROW_TOOLTIP_HOVER_H,
        text: cfg.crowTooltipText,
        offsetY: CROW_TOOLTIP_OFFSET_Y
      }]
    })
  }
  inst.cleanup = () => {
    cfg.k.destroy(inst.layer)
    cfg.k.destroy(inst.grassLayer)
  }
  return inst
}

function onUpdateAmbience(inst) {
  const dt = inst.k.dt()
  const darkness = getDarkness()
  //
  // Crow call timer: opens beak and plays MP3 at random intervals
  //
  onUpdateCrow(inst, dt)
  //
  // Bird sounds only during daytime
  //
  inst.birdTimer -= dt
  if (inst.birdTimer <= 0) {
    if (darkness < BIRD_DAY_DARKNESS_MAX) {
      if (Math.random() > 0.42) Sound.playPigeonCooSound(inst.sound)
      else Sound.playBirdChirpSound(inst.sound)
    }
    inst.birdTimer = BIRD_SOUND_INTERVAL_MIN + Math.random() * (BIRD_SOUND_INTERVAL_MAX - BIRD_SOUND_INTERVAL_MIN)
  }
  //
  // Cricket sounds only at night
  //
  inst.cricketTimer -= dt
  if (inst.cricketTimer <= 0) {
    if (darkness >= CRICKET_NIGHT_DARKNESS_MIN) {
      Sound.playCricketSound(inst.sound)
    }
    inst.cricketTimer = CRICKET_SOUND_INTERVAL_MIN + Math.random() * (CRICKET_SOUND_INTERVAL_MAX - CRICKET_SOUND_INTERVAL_MIN)
  }
  //
  // Update each lamp's brightness independently
  //
  for (const lamp of inst.lamps) {
    updateLampBrightness(lamp, dt, inst.sound)
  }
}

//
// Slow arc envelope (fault + recovery + sound) × fast multi-band flicker (real lamp)
// Only applies to lamps with mode='flicker'; 'steady' holds max brightness; 'off' stays dark
//
function updateLampBrightness(lamp, dt, sound) {
  if (lamp.mode === 'off') {
    lamp.brightness = 0
    return
  }
  if (lamp.mode === 'steady') {
    lamp.brightness = lamp.recoverTarget
    return
  }
  updateLampArcEnvelope(lamp, dt, sound)
  lamp.flickerPhase += dt * LAMP_FLICKER_PHASE_SPEED
  const ph = lamp.flickerPhase
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
  lamp.brightness = Math.max(0.025, Math.min(1, lamp.envelope * tw))
}

function updateLampArcEnvelope(lamp, dt, sound) {
  if (lamp.recoveryTimer > 0) {
    lamp.recoveryTimer -= dt
    const elapsed = lamp.recoveryDuration - Math.max(0, lamp.recoveryTimer)
    const u = Math.min(1, elapsed / lamp.recoveryDuration)
    lamp.envelope = lamp.dimPeak + (lamp.recoverTarget - lamp.dimPeak) * u
    return
  }
  lamp.envelope = lamp.recoverTarget
  lamp.nextArcIn -= dt
  if (lamp.nextArcIn > 0) return
  //
  // Play synchronized neon flicker burst (no bass thump — only electrical crackle)
  //
  Sound.playNeonFlickerBurst?.(sound)
  lamp.dimPeak = 0.035 + Math.random() * 0.055
  lamp.envelope = lamp.dimPeak
  lamp.recoveryDuration = LAMP_ARC_RECOVER_MIN + Math.random() * (LAMP_ARC_RECOVER_MAX - LAMP_ARC_RECOVER_MIN)
  lamp.recoveryTimer = lamp.recoveryDuration
  lamp.recoverTarget = 0.56 + Math.random() * 0.18
  lamp.nextArcIn = LAMP_ARC_INTERVAL_MIN + Math.random() * (LAMP_ARC_INTERVAL_MAX - LAMP_ARC_INTERVAL_MIN)
}

function drawAmbience(inst) {
  const k = inst.k
  const poleFill = k.rgb(LAMP_POLE_FILL_R, LAMP_POLE_FILL_G, LAMP_POLE_FILL_B)
  const poleStroke = k.rgb(0, 0, 0)
  const nightBoost = Math.min(1, Math.max(0, (getDarkness() - 0.15) / 0.45))
  for (const lamp of inst.lamps) {
    drawLamp(k, lamp, poleFill, poleStroke, nightBoost, inst.showSnow)
  }
}

//
// Classic curved-arm street lamp: bezier shepherd's crook arm, bell shade, decorative base
// nightBoost: 0=day, 1=full night (controls bulb glow and light cone intensity)
//
function drawLamp(k, lamp, poleFill, poleStroke, nightBoost, showSnow) {
  const poleCx = lamp.x
  const poleTopY = lamp.topY
  const armEndX = lamp.armEndX
  const armEndY = lamp.armEndY
  const tiltPx = lamp.tiltPx
  const W = LAMP_METAL_WIDTH
  //
  // Arm starts from the tilted top of the pole; control point also shifts with tilt
  //
  const poleTopCx = poleCx + tiltPx
  const ctrlX = poleTopCx + LAMP_CURVE_CTRL_DX
  const ctrlY = poleTopY + LAMP_CURVE_CTRL_DY
  drawCurvedArm(k, poleTopCx, poleTopY + W, ctrlX, ctrlY, armEndX, armEndY, W, poleFill, poleStroke)
  //
  // Tilted pole: parallelogram with blur halo, covers arm's start cap
  //
  const poleH = lamp.baseY - poleTopY
  drawTiltedPole(k, poleCx, poleTopY, W, poleH, tiltPx, poleFill, poleStroke)
  //
  // Weathering marks follow the lean of the pole
  //
  drawPoleMarks(k, lamp.poleMarks, poleCx, poleTopY, poleH, tiltPx)
  //
  // Wider decorative base at pole bottom
  //
  drawDecorativeBase(k, poleCx, lamp.baseY, W, poleFill, poleStroke)
  //
  // Bell-shaped dome shade hanging at arm end
  //
  drawBellShade(k, armEndX, armEndY, poleFill, poleStroke)
  //
  // Optional snow mound sitting on the top of the vertical pole (winter levels)
  //
  showSnow && drawPoleTopSnow(k, poleTopCx, poleTopY, lamp.x)
  //
  // Bulb glow and projected cone — only for active lamps at night
  //
  const bulbY = armEndY + LAMP_SHADE_HEIGHT
  const activeBrightness = lamp.brightness * nightBoost
  if (activeBrightness > 0.01) {
    drawBulbGlow(k, armEndX, bulbY, activeBrightness)
    drawLightCone(k, armEndX, bulbY, activeBrightness)
  }
}

//
// Quadratic bezier interpolation at parameter t
//
function quadBezier(p0, p1, p2, t) {
  return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2
}
//
// Curved arm: outline pass then fill pass along bezier segments (semi-transparent for gray blend)
//
function drawCurvedArm(k, x0, y0, ctrlX, ctrlY, x1, y1, width, fillRgb, strokeRgb) {
  const outW = width + LAMP_POLE_OUTLINE_PAD * 2
  for (let i = 0; i < LAMP_CURVE_SEGMENTS; i++) {
    const t0 = i / LAMP_CURVE_SEGMENTS
    const t1 = (i + 1) / LAMP_CURVE_SEGMENTS
    k.drawLine({
      p1: k.vec2(quadBezier(x0, ctrlX, x1, t0), quadBezier(y0, ctrlY, y1, t0)),
      p2: k.vec2(quadBezier(x0, ctrlX, x1, t1), quadBezier(y0, ctrlY, y1, t1)),
      width: outW,
      color: strokeRgb,
      opacity: LAMP_POLE_OPACITY
    })
  }
  for (let i = 0; i < LAMP_CURVE_SEGMENTS; i++) {
    const t0 = i / LAMP_CURVE_SEGMENTS
    const t1 = (i + 1) / LAMP_CURVE_SEGMENTS
    k.drawLine({
      p1: k.vec2(quadBezier(x0, ctrlX, x1, t0), quadBezier(y0, ctrlY, y1, t0)),
      p2: k.vec2(quadBezier(x0, ctrlX, x1, t1), quadBezier(y0, ctrlY, y1, t1)),
      width,
      color: fillRgb,
      opacity: LAMP_POLE_OPACITY
    })
  }
}
//
// Small snow mound sitting on top of the vertical pole — a white rounded arc polygon
//
function drawPoleTopSnow(k, cx, topY, seed) {
  //
  // Deterministic variation per lamp: use seed (lamp.x) to shift width, height and peak offset
  // so each pole has a slightly unique snow mound without random flicker every frame
  //
  const s1 = Math.sin(seed * 0.031)
  const s2 = Math.sin(seed * 0.077)
  const hw = SNOW_CAP_WIDTH_HALF + s1 * 1.2
  const h = SNOW_CAP_HEIGHT + s2 * 1.4
  const peakShift = s1 * 1.5
  const leftSlump = 1 + s2 * 0.25
  const rightSlump = 1 - s2 * 0.25
  const snowColor = k.rgb(228 + Math.round(s1 * 6), 237 + Math.round(s2 * 5), 250)
  //
  // Semi-ellipse with slight asymmetry: peak is not always centered
  //
  k.drawPolygon({
    pts: [
      k.vec2(cx - hw, topY),
      k.vec2(cx - hw * 0.55 * leftSlump, topY - h * 0.62),
      k.vec2(cx + peakShift, topY - h),
      k.vec2(cx + hw * 0.55 * rightSlump, topY - h * 0.62),
      k.vec2(cx + hw, topY)
    ],
    color: snowColor,
    opacity: 0.85 + s2 * 0.05
  })
}
//
// Six-point bell polygon: narrow top → wide mid → slight rim at bottom
//
function drawBellShade(k, cx, topY, fillRgb, strokeRgb) {
  const wideY = topY + LAMP_SHADE_WIDE_FRAC * LAMP_SHADE_HEIGHT
  const botY = topY + LAMP_SHADE_HEIGHT
  const ptsInner = [
    k.vec2(cx - LAMP_SHADE_HALF_TOP, topY),
    k.vec2(cx + LAMP_SHADE_HALF_TOP, topY),
    k.vec2(cx + LAMP_SHADE_HALF_WIDE, wideY),
    k.vec2(cx + LAMP_SHADE_HALF_RIM, botY),
    k.vec2(cx - LAMP_SHADE_HALF_RIM, botY),
    k.vec2(cx - LAMP_SHADE_HALF_WIDE, wideY)
  ]
  const my = (topY + wideY + botY) / 3
  const s = LAMP_SHADE_OUTLINE_SCALE
  const ptsOuter = ptsInner.map((p) => k.vec2(cx + (p.x - cx) * s, my + (p.y - my) * s))
  k.drawPolygon({ pts: ptsOuter, color: strokeRgb, opacity: LAMP_POLE_OPACITY })
  k.drawPolygon({ pts: ptsInner, color: fillRgb, opacity: LAMP_POLE_OPACITY })
}
//
// Wider decorative base rectangle at the pole bottom
//
function drawDecorativeBase(k, cx, baseBottomY, poleW, fillRgb, strokeRgb) {
  const bw = poleW + LAMP_BASE_PAD * 2
  drawOutlinedRect(k, cx - bw / 2, baseBottomY - LAMP_BASE_HEIGHT, bw, LAMP_BASE_HEIGHT, fillRgb, strokeRgb, LAMP_POLE_OUTLINE_PAD)
}
//
// Three layered glow circles representing the lamp bulb
//
function drawBulbGlow(k, cx, bulbY, br) {
  k.drawCircle({ pos: k.vec2(cx, bulbY), radius: LAMP_GLOW_R1, color: k.rgb(255, 248, 200), opacity: 0.22 * br })
  k.drawCircle({ pos: k.vec2(cx, bulbY), radius: LAMP_GLOW_R2, color: k.rgb(255, 242, 188), opacity: 0.32 * br })
  k.drawCircle({ pos: k.vec2(cx, bulbY), radius: LAMP_GLOW_R3, color: k.rgb(255, 255, 235), opacity: 0.45 + br * 0.28 })
}
//
// Downward cone of warm light projected from the lamp bulb — simulated gradient via trapezoid slices
//
function drawLightCone(k, cx, topY, br) {
  const coneColor = k.rgb(255, 248, 200)
  for (let i = 0; i < CONE_STEPS; i++) {
    const t0 = i / CONE_STEPS
    const t1 = (i + 1) / CONE_STEPS
    const w0 = t0 * CONE_BASE_HALF_W
    const w1 = t1 * CONE_BASE_HALF_W
    const y0 = topY + t0 * CONE_HEIGHT
    const y1 = topY + t1 * CONE_HEIGHT
    //
    // Quadratic falloff so cone fades out near bottom
    //
    const op = (1 - t0) * (1 - t0) * 0.20 * br
    if (op < 0.004) continue
    k.drawPolygon({
      pts: [
        k.vec2(cx - w0, y0),
        k.vec2(cx + w0, y0),
        k.vec2(cx + w1, y1),
        k.vec2(cx - w1, y1)
      ],
      color: coneColor,
      opacity: op
    })
  }
}
//
// Initialize one lamp's independent brightness / arc state with a behavior mode
//
function createLampState(x, baseY, mode) {
  const recoverTarget = 0.62 + Math.random() * 0.12
  //
  // Deterministic slight lean: each lamp tilts a different direction/amount so they look aged
  //
  const tiltPx = ((x / 157 * 2.618) % 1 - 0.5) * POLE_TILT_MAX * 2
  const topY = baseY - LAMP_POLE_TOP_OFFSET
  return {
    x,
    baseY,
    mode,
    topY,
    tiltPx,
    //
    // Arm starts from the tilted pole top; shift arm end accordingly
    //
    armEndX: x + tiltPx + LAMP_ARM_END_DX,
    armEndY: topY + LAMP_ARM_END_DY,
    brightness: mode === 'off' ? 0 : recoverTarget,
    envelope: recoverTarget,
    flickerPhase: Math.random() * Math.PI * 8,
    nextArcIn: LAMP_ARC_INTERVAL_MIN + Math.random() * (LAMP_ARC_INTERVAL_MAX - LAMP_ARC_INTERVAL_MIN),
    recoveryTimer: 0,
    recoveryDuration: 0.25,
    dimPeak: 0.08,
    recoverTarget,
    poleMarks: generatePoleMarks(x / 100)
  }
}
//
// Generates stable grass tuft data; base Y = floor line (ground stripe top).
// startX: left edge of zone, zoneWidth: width, baseIdx: offsets the pseudo-random sequence
//
function generateGrassTufts(startX, zoneWidth, groundLineY, count, baseIdx) {
  const tufts = []
  for (let i = 0; i < count; i++) {
    //
    // Golden-ratio x scatter with baseIdx offset for independent zones
    //
    const baseX = startX + (((i + baseIdx) * 137.508) % 1) * zoneWidth
    //
    // 2-4 blades per tuft for a fuller, more natural look
    //
    const bladeCount = 2 + Math.floor((((i + baseIdx) * 0.514) % 1) * 3)
    const blades = []
    for (let j = 0; j < bladeCount; j++) {
      const angleRaw = (((i + baseIdx) * 41.7 + j * 97.3) % 1) - 0.5
      //
      // Blade width 0.9–2.2 and slight green variation for natural look
      //
      const w = 0.9 + (((i + baseIdx) * 17.3 + j * 43.7) % 1) * 1.3
      const gVar = Math.floor((((i + baseIdx) * 23.1 + j * 71.9) % 1) * 30) - 10
      blades.push({
        dx: ((((i + baseIdx) * 29.3 + j * 61.1) % 1) - 0.5) * 14,
        angle: angleRaw * GRASS_BLADE_ANGLE_SPREAD,
        h: GRASS_BLADE_HEIGHT_MIN + (((i + baseIdx) * 53.7 + j * 37.4) % 1) * (GRASS_BLADE_HEIGHT_MAX - GRASS_BLADE_HEIGHT_MIN),
        swayPhase: ((i + baseIdx) * 29.3 + j * 61.1) % (Math.PI * 2),
        w,
        gVar
      })
    }
    tufts.push({ x: baseX, y: groundLineY, blades })
  }
  return tufts
}
//
// Sparse individual grass blades with gentle sinusoidal sway at the tip
//
function drawGrass(inst) {
  const k = inst.k
  const t = k.time()
  for (const tuft of inst.grassTufts) {
    for (const blade of tuft.blades) {
      const sway = Math.sin(t * GRASS_SWAY_SPEED + blade.swayPhase) * GRASS_SWAY_AMP
      const bx = tuft.x + blade.dx
      //
      // Per-blade color variation for a natural multi-tone look
      //
      const color = k.rgb(GRASS_COLOR_R, GRASS_COLOR_G + blade.gVar, GRASS_COLOR_B)
      //
      // Thick base line (lower third of blade) fades into a thinner tip
      //
      const tipX = bx + Math.sin(blade.angle) * blade.h + sway
      const midX = bx + Math.sin(blade.angle) * blade.h * 0.45
      const midY = tuft.y - blade.h * 0.45
      k.drawLine({ p1: k.vec2(bx, tuft.y), p2: k.vec2(midX, midY), width: blade.w * 1.4, color, opacity: 0.88 })
      k.drawLine({ p1: k.vec2(midX, midY), p2: k.vec2(tipX, tuft.y - blade.h), width: blade.w * 0.7, color, opacity: 0.72 })
    }
  }
}
//
// Generate deterministic weathering marks (dots and horizontal scratches) along the pole.
// Uses a seed so each lamp gets unique but stable marks across frames.
//
function generatePoleMarks(seed) {
  const marks = []
  for (let i = 0; i < POLE_MARK_COUNT; i++) {
    const t = (seed * 1.618 + i * 0.101) % 1
    const isDot = (seed * 2.414 + i * 0.191) % 1 > 0.32
    const offX = ((seed * 3.14 + i * 0.281) % 1 - 0.5) * 6.5
    const scratchW = 1.8 + ((seed * 1.73 + i * 0.37) % 1) * 5.8
    const scratchDy = (((seed * 1.29 + i * 0.227) % 1) - 0.5) * 0.9
    marks.push({ t, isDot, offX, scratchW, scratchDy })
  }
  return marks
}
//
// Draw weathering marks following the pole's lean (cx interpolated between tilted top and straight bottom)
//
function drawPoleMarks(k, marks, cx, topY, height, tiltPx) {
  const dark = k.rgb(75, 77, 83)
  for (const m of marks) {
    const y = topY + m.t * height
    //
    // Marks track the lean: full tilt at top (t=0), no tilt at bottom (t=1)
    //
    const markCx = cx + tiltPx * (1 - m.t) + m.offX
    if (m.isDot) {
      k.drawCircle({ pos: k.vec2(markCx, y), radius: 1.05, color: dark, opacity: 0.5 })
    } else {
      k.drawLine({
        p1: k.vec2(markCx - m.scratchW / 2, y + m.scratchDy),
        p2: k.vec2(markCx + m.scratchW / 2, y - m.scratchDy),
        width: 1,
        color: dark,
        opacity: 0.4
      })
      k.drawLine({
        p1: k.vec2(markCx - m.scratchW * 0.36, y + m.scratchDy + 0.55),
        p2: k.vec2(markCx + m.scratchW * 0.36, y - m.scratchDy + 0.55),
        width: 1,
        color: dark,
        opacity: 0.22
      })
    }
  }
}
//
// Tilted pole drawn as a parallelogram: top edge shifted by tiltPx, bottom edge at pole center.
// A slightly wider ghost copy behind it simulates a soft blur on the metal edges.
//
function drawTiltedPole(k, cx, topY, width, height, tiltPx, fillRgb, strokeRgb) {
  const pad = LAMP_POLE_OUTLINE_PAD
  //
  // Multi-layer blur halo: three ghost polygons at increasing widths for a soft glowing edge
  //
  k.drawPolygon({
    pts: [
      k.vec2(cx + tiltPx - width / 2 - 6, topY - 6),
      k.vec2(cx + tiltPx + width / 2 + 6, topY - 6),
      k.vec2(cx + width / 2 + 6, topY + height + 6),
      k.vec2(cx - width / 2 - 6, topY + height + 6)
    ],
    color: fillRgb,
    opacity: LAMP_POLE_OPACITY * 0.08
  })
  k.drawPolygon({
    pts: [
      k.vec2(cx + tiltPx - width / 2 - 3.5, topY - 3.5),
      k.vec2(cx + tiltPx + width / 2 + 3.5, topY - 3.5),
      k.vec2(cx + width / 2 + 3.5, topY + height + 3.5),
      k.vec2(cx - width / 2 - 3.5, topY + height + 3.5)
    ],
    color: fillRgb,
    opacity: LAMP_POLE_OPACITY * 0.14
  })
  //
  // Outline (stroke) parallelogram
  //
  k.drawPolygon({
    pts: [
      k.vec2(cx + tiltPx - width / 2 - pad, topY - pad),
      k.vec2(cx + tiltPx + width / 2 + pad, topY - pad),
      k.vec2(cx + width / 2 + pad, topY + height + pad),
      k.vec2(cx - width / 2 - pad, topY + height + pad)
    ],
    color: strokeRgb,
    opacity: LAMP_POLE_OPACITY
  })
  //
  // Fill parallelogram
  //
  k.drawPolygon({
    pts: [
      k.vec2(cx + tiltPx - width / 2, topY),
      k.vec2(cx + tiltPx + width / 2, topY),
      k.vec2(cx + width / 2, topY + height),
      k.vec2(cx - width / 2, topY + height)
    ],
    color: fillRgb,
    opacity: LAMP_POLE_OPACITY
  })
}
//
// Outline pad around filled rect (pole segments and base) — semi-transparent to blend with bg
//
function drawOutlinedRect(k, x, y, w, h, fillRgb, strokeRgb, pad) {
  k.drawRect({
    pos: k.vec2(x - pad, y - pad),
    width: w + pad * 2,
    height: h + pad * 2,
    color: strokeRgb,
    opacity: LAMP_POLE_OPACITY
  })
  k.drawRect({
    pos: k.vec2(x, y),
    width: w,
    height: h,
    color: fillRgb,
    opacity: LAMP_POLE_OPACITY
  })
}
//
// Crow update: counts down the call timer and fires the sound + opens the beak.
//
function onUpdateCrow(inst, dt) {
  const crow = inst.crow
  if (!crow) return
  crow.callTimer -= dt
  //
  // Close mouth when timer expires
  //
  if (crow.mouthOpen) {
    crow.mouthTimer -= dt
    if (crow.mouthTimer <= 0) {
      crow.mouthOpen = false
    }
  }
  //
  // Delayed mouth open: sound plays immediately, mouth opens after CROW_MOUTH_OPEN_DELAY
  //
  if (crow.mouthOpenPending) {
    crow.mouthOpenDelay -= dt
    if (crow.mouthOpenDelay <= 0) {
      crow.mouthOpen = true
      crow.mouthTimer = CROW_MOUTH_OPEN_DURATION
      crow.mouthOpenPending = false
    }
  }
  if (crow.callTimer <= 0) {
    crow.callTimer = CROW_CALL_INTERVAL_MIN + Math.random() * (CROW_CALL_INTERVAL_MAX - CROW_CALL_INTERVAL_MIN)
    const soundName = CROW_SOUND_NAMES[crow.soundIdx % CROW_SOUND_NAMES.length]
    crow.soundIdx++
    try { inst.k.play(soundName, { volume: 0.38 }) } catch {}
    //
    // Schedule mouth open slightly after sound onset for visual sync
    //
    crow.mouthOpenPending = true
    crow.mouthOpenDelay = CROW_MOUTH_OPEN_DELAY
  }
}
//
// Crow drawing: realistic bird sitting on the top arc of the lamp arm.
// Eyes track the hero. Delegates to the shared drawCrow utility.
//
function drawCrowOnLamp(k, inst) {
  const crow = inst.crow
  if (!crow) return
  const sc = CROW_SCALE
  const cx = crow.cx
  const perchY = crow.perchY
  const heroX = inst.heroInst?.character?.pos?.x ?? cx + 1
  const s = heroX >= cx ? 1 : -1
  drawCrow(k, cx, perchY, sc, s, crow.mouthOpen, inst.heroInst)
}
