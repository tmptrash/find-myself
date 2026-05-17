import { CFG } from '../cfg.js'
import * as Sound from '../../../utils/sound.js'
import { getWindowPositions } from '../components/city-background.js'

//
// Module-level timeOfDay persists across scene reloads within the same session.
// 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset, 1 = midnight.
//
let moduleTimeOfDay = 0.35
//
// Full day/night cycle duration (seconds)
//
const CYCLE_DURATION = 60
//
// Z-index: must be above city background sprite (z=15.5) so overlay covers it
//
const Z_OVERLAY = 15.51
//
// Night overlay color (deep blue-black sky)
//
const OVERLAY_R = 5
const OVERLAY_G = 8
const OVERLAY_B = 22
const OVERLAY_MAX_OPACITY = 0.84
//
// Window glow: drawn on a separate layer strictly above the night overlay
//
const Z_WINDOWS = 15.52
const WINDOW_APPEAR_DARKNESS = 0.18
//
// Morning window turn-off times: each window has a personal threshold (timeOfDay) after
// which it goes dark. Uniformly spread between 3 AM (0.125) and 5 AM (0.208) so that
// nearly all windows are off by 5 AM.
//
const WINDOW_MORNING_OFF_MIN = 3 / 24
const WINDOW_MORNING_OFF_MAX = 5 / 24
const WINDOW_TWINKLE_SPEED = 1.4
//
// Window fallback: synthetic positions used only when real building windows unavailable
//
const WINDOW_COUNT = 80
const WINDOW_AREA_TOP_Y = 350
const WINDOW_AREA_BOT_Y = 760
const WINDOW_GLOW_SIZE = 7
//
// Moon: full disc — right side of screen, clearly left of sun, appears after sun fades
//
const MOON_X = CFG.visual.screen.width * 0.72
const MOON_Y = CFG.visual.screen.height * 0.20 + 150
const MOON_RADIUS = 44
//
// Moon glow: large diffuse halo via many concentric circles with linear falloff (soft, not harsh)
//
const MOON_GLOW_STEPS = 12
const MOON_GLOW_MAX_FACTOR = 1.4
//
// Moon only appears when it is already quite dark — prevents sun/moon overlap.
// MOON_APPEAR_RANGE controls how quickly it fades in after the threshold.
//
const MOON_APPEAR_DARKNESS = 0.62
const MOON_APPEAR_RANGE = 0.16
const MOON_BEHIND_CLOUD_BRIGHTNESS_BOOST = 2.4
const MOON_BEHIND_CLOUD_COLOR_BOOST = 24
const MOON_COLOR_R = 200
const MOON_COLOR_G = 195
const MOON_COLOR_B = 180
//
// Crater positions: {x, y} fraction of MOON_RADIUS, r = radius fraction, dark = brightness offset
//
const MOON_CRATERS = [
  { x: -0.30, y: -0.20, r: 0.25, dark: 22 },
  { x: 0.25, y: 0.15, r: 0.20, dark: 18 },
  { x: -0.10, y: 0.35, r: 0.16, dark: 26 },
  { x: 0.40, y: -0.25, r: 0.13, dark: 20 },
  { x: -0.45, y: 0.10, r: 0.11, dark: 16 },
  { x: 0.10, y: -0.45, r: 0.10, dark: 24 }
]
//
// Star field: restricted to upper sky area (above buildings) to avoid stars in silhouettes
//
const STAR_COUNT = 50
const STAR_AREA_H_FRAC = 0.28
const STAR_MIN_R = 0.9
const STAR_MAX_R = 1.8
//
// Slow twinkle — stars pulse gently, almost disappearing at trough
//
const STAR_TWINKLE_SPEED = 0.7
const STAR_APPEAR_DARKNESS = 0.28
//
// Owl sound scheduling
//
const OWL_INTERVAL_MIN = 18
const OWL_INTERVAL_MAX = 44
const OWL_APPEAR_DARKNESS = 0.45
//
// Moon only appears after the general night overlay is thick enough to hide the sun.
// At darkness=0.62 the overlay covers ~57% of brightness — sun is barely perceptible.
//
//
// Dynamic sun: drawn on its own layer below the night overlay so the overlay naturally
// dims it. The sun also fades its own opacity to zero before mid-twilight — this ensures
// it is completely gone at night with no dark-circle artifacts.
//
const SUN_X = CFG.visual.screen.width * 0.85 - 50
const SUN_Y = CFG.visual.screen.height * 0.2 + 150
const SUN_RADIUS = 112
//
// Sun color matches TIME letters / anti-hero accent in the time section
//
const SUN_COLOR_R = 255
const SUN_COLOR_G = 140
const SUN_COLOR_B = 0
//
// Smooth radial fade: more steps avoid visible ring transitions
//
const SUN_GLOW_STEPS = 28
const SUN_GLOW_MAX_FACTOR = 0.488
//
// Sun fades from 100% → 0% opacity as darkness goes from SUN_FADE_START → SUN_FADE_END
//
const SUN_FADE_START = 0.18
const SUN_FADE_END = 0.50
//
// Z-index for the dynamic sun layer: between background (15.5) and overlay (15.51)
//
const Z_SUN = 15.505

/**
 * Returns darkness 0 (full day) → 1 (full night). Pure function of internal timeOfDay.
 * @returns {number}
 */
export function getDarkness() {
  return 0.5 + 0.5 * Math.cos(moduleTimeOfDay * Math.PI * 2)
}

/**
 * Returns current timeOfDay (0 = midnight, 0.5 = noon).
 * @returns {number}
 */
export function getTimeOfDay() {
  return moduleTimeOfDay
}

/**
 * Creates the day/night cycle layer for a scene. Returns cleanup fn.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.sound - Sound instance from Sound.create()
 * @param {Object} [cfg.timeSectionMusic] - { kids } music handles for volume modulation
 * @param {number} [cfg.zIndex] - Override z-index for overlay
 * @returns {{ cleanup: Function }}
 */
export function create(cfg) {
  const stars = generateStars()
  //
  // Use real building window positions; fall back to synthetic if not yet available
  //
  const realWindows = getWindowPositions(cfg.spriteName ?? 'city-background')
  const windows = realWindows.length > 0 ? realWindows : generateWindows()
  const windowPhases = windows.map(() => Math.random() * Math.PI * 2)
  //
  // showSun: when true, draw the sun dynamically on a layer below the overlay.
  // Pass false for levels without a sun (winter, autumn, level 2+).
  //
  const showSun = cfg.showSun !== false
  //
  // showMoon: when false, the moon is never drawn (e.g. level 3 which has its own skybox).
  //
  const showMoon = cfg.showMoon !== false
  //
  // starLayerZ: when provided, stars are drawn on their own layer at that z-index
  // (e.g. below clouds in level 2). Otherwise stars are drawn inside the main overlay.
  //
  const starLayerZ = cfg.starLayerZ ?? null
  //
  // moonLayerZ: when provided, moon is drawn on its own layer at that z-index
  // (e.g. below pixel clouds in level 2). Otherwise drawn inside the main overlay.
  //
  const moonLayerZ = cfg.moonLayerZ ?? null
  const inst = {
    k: cfg.k,
    sound: cfg.sound,
    music: cfg.timeSectionMusic ?? null,
    stars,
    starPhases: stars.map(() => Math.random() * Math.PI * 2),
    windows,
    windowPhases,
    windowBlinks: generateWindowBlinks(windows),
    owlTimer: OWL_INTERVAL_MIN + Math.random() * (OWL_INTERVAL_MAX - OWL_INTERVAL_MIN),
    starsInOverlay: starLayerZ === null,
    moonInOverlay: moonLayerZ === null,
    showMoon
  }
  //
  // Optional dynamic sun layer — sits just above the background sprite but below the overlay
  //
  if (showSun) {
    inst.sunLayer = cfg.k.add([
      cfg.k.z(Z_SUN),
      cfg.k.fixed(),
      {
        draw() {
          const d = getDarkness()
          if (d < SUN_FADE_END) drawSun(inst.k, d)
        }
      }
    ])
  }
  inst.layer = cfg.k.add([
    cfg.k.z(cfg.zIndex ?? Z_OVERLAY),
    cfg.k.fixed(),
    {
      update() { onUpdate(inst) },
      draw() { onDraw(inst) }
    }
  ])
  //
  // Windows drawn on a strictly higher layer so they always appear above the overlay rect
  //
  inst.windowLayer = cfg.k.add([
    cfg.k.z(Z_WINDOWS),
    cfg.k.fixed(),
    { draw() { onDrawWindows(inst) } }
  ])
  //
  // Optional separate stars layer so stars can be placed below clouds in certain levels
  //
  if (starLayerZ !== null) {
    inst.starsLayer = cfg.k.add([
      cfg.k.z(starLayerZ),
      cfg.k.fixed(),
      {
        draw() {
          const d = getDarkness()
          if (d > STAR_APPEAR_DARKNESS) drawStars(inst, d)
        }
      }
    ])
  }
  //
  // Optional separate moon layer so moon can be placed below clouds in certain levels
  //
  if (moonLayerZ !== null && showMoon) {
    inst.moonLayer = cfg.k.add([
      cfg.k.z(moonLayerZ),
      cfg.k.fixed(),
      {
        draw() {
          const d = getDarkness()
          if (d > MOON_APPEAR_DARKNESS) drawMoon(inst, d)
        }
      }
    ])
  }
  inst.cleanup = () => {
    cfg.k.destroy(inst.layer)
    cfg.k.destroy(inst.windowLayer)
    inst.sunLayer && cfg.k.destroy(inst.sunLayer)
    inst.starsLayer && cfg.k.destroy(inst.starsLayer)
    inst.moonLayer && cfg.k.destroy(inst.moonLayer)
  }
  return inst
}

function onUpdate(inst) {
  const dt = inst.k.dt()
  moduleTimeOfDay = (moduleTimeOfDay + dt / CYCLE_DURATION) % 1
  const darkness = getDarkness()
  updateOwlSound(inst, darkness, dt)
  updateKidsVolume(inst, darkness)
  updateWindowBlinks(inst, darkness, dt)
}

function updateOwlSound(inst, darkness, dt) {
  if (darkness < OWL_APPEAR_DARKNESS) return
  inst.owlTimer -= dt
  if (inst.owlTimer > 0) return
  Sound.playOwlHootSound?.(inst.sound)
  inst.owlTimer = OWL_INTERVAL_MIN + Math.random() * (OWL_INTERVAL_MAX - OWL_INTERVAL_MIN)
}

function updateKidsVolume(inst, darkness) {
  if (!inst.music?.kids) return
  inst.music.kids.volume = CFG.audio.backgroundMusic.kids * Math.max(0, 1 - darkness * 1.85)
}

function onDraw(inst) {
  const darkness = getDarkness()
  drawNightOverlay(inst, darkness)
  if (inst.showMoon && inst.moonInOverlay && darkness > MOON_APPEAR_DARKNESS) drawMoon(inst, darkness)
  if (inst.starsInOverlay && darkness > STAR_APPEAR_DARKNESS) drawStars(inst, darkness)
}
//
// Window layer draw: rendered strictly above the night overlay rect
//
function onDrawWindows(inst) {
  const darkness = getDarkness()
  if (darkness <= WINDOW_APPEAR_DARKNESS) return
  drawWindowGlows(inst, darkness)
}

function drawNightOverlay(inst, darkness) {
  if (darkness < 0.01) return
  //
  // Use a steeper (sub-linear) ramp so the overlay covers the sun faster at lower darkness values
  // while capping at OVERLAY_MAX_OPACITY so building silhouettes remain faintly visible at night
  //
  inst.k.drawRect({
    pos: inst.k.vec2(0, 0),
    width: CFG.visual.screen.width,
    height: CFG.visual.screen.height,
    color: inst.k.rgb(OVERLAY_R, OVERLAY_G, OVERLAY_B),
    opacity: Math.min(1, darkness * 1.45) * OVERLAY_MAX_OPACITY
  })
}
//
// Dynamic sun: drawn below the night overlay so the overlay dims it naturally.
// The sun also fades its own opacity as dusk approaches, guaranteeing it is fully
// gone by SUN_FADE_END regardless of overlay opacity.
//
function drawSun(k, darkness) {
  const alpha = darkness < SUN_FADE_START
    ? 1.0
    : 1.0 - (darkness - SUN_FADE_START) / (SUN_FADE_END - SUN_FADE_START)
  const pos = k.vec2(SUN_X, SUN_Y)
  //
  // Draw from center to edge with gradual color/opacity interpolation.
  // This keeps the core and halo continuous (no hard edge between disc and glow).
  //
  for (let s = 0; s < SUN_GLOW_STEPS; s++) {
    const t = s / (SUN_GLOW_STEPS - 1)
    const r = SUN_RADIUS * (0.22 + t * (SUN_GLOW_MAX_FACTOR - 0.22))
    const cr = Math.round(SUN_COLOR_R + (255 - SUN_COLOR_R) * (1 - t) * 0.32)
    const cg = Math.round(SUN_COLOR_G + (216 - SUN_COLOR_G) * (1 - t) * 0.30)
    const cb = Math.round(SUN_COLOR_B + (92 - SUN_COLOR_B) * (1 - t) * 0.18)
    const op = alpha * (1 - t) * (1 - t) * 0.52
    k.drawCircle({ pos, radius: r, color: k.rgb(cr, cg, cb), opacity: op })
  }
  //
  // Slight center boost so sun stays readable but still soft
  //
  k.drawCircle({ pos, radius: SUN_RADIUS * 0.32, color: k.rgb(255, 228, 120), opacity: alpha * 0.32 })
}
//
// Full moon with gradient glow (concentric circles, smaller radius) and craters
//
function drawMoon(inst, darkness) {
  const k = inst.k
  const moonOpacity = Math.min(1, (darkness - MOON_APPEAR_DARKNESS) / MOON_APPEAR_RANGE)
  const layerBoost = inst.moonInOverlay ? 1 : MOON_BEHIND_CLOUD_BRIGHTNESS_BOOST
  const boostedOpacity = Math.min(1, moonOpacity * layerBoost)
  const cb = inst.moonInOverlay ? 0 : MOON_BEHIND_CLOUD_COLOR_BOOST
  const moonR = Math.min(255, MOON_COLOR_R + cb)
  const moonG = Math.min(255, MOON_COLOR_G + cb)
  const moonB = Math.min(255, MOON_COLOR_B + cb)
  const mc = k.rgb(moonR, moonG, moonB)
  const pos = k.vec2(MOON_X, MOON_Y)
  //
  // Soft halo: many concentric circles, linear falloff with low max opacity (gentle diffuse glow)
  //
  for (let s = 0; s < MOON_GLOW_STEPS; s++) {
    const t = s / MOON_GLOW_STEPS
    const r = MOON_RADIUS * (1 + (1 - t) * (MOON_GLOW_MAX_FACTOR - 1))
    const op = boostedOpacity * (1 - t) * 0.12
    k.drawCircle({ pos, radius: r, color: mc, opacity: op })
  }
  //
  // Main disc
  //
  k.drawCircle({ pos, radius: MOON_RADIUS, color: mc, opacity: boostedOpacity * 0.98 })
  //
  // Craters: slightly darker circles layered on top of the disc
  //
  for (const cr of MOON_CRATERS) {
    const cx = MOON_X + cr.x * MOON_RADIUS
    const cy = MOON_Y + cr.y * MOON_RADIUS
    k.drawCircle({
      pos: k.vec2(cx, cy),
      radius: cr.r * MOON_RADIUS,
      color: k.rgb(moonR - cr.dark, moonG - cr.dark, moonB - cr.dark),
      opacity: boostedOpacity * 0.88
    })
  }
}

function drawStars(inst, darkness) {
  const k = inst.k
  const t = k.time() * STAR_TWINKLE_SPEED
  const baseOpacity = Math.min(1, (darkness - STAR_APPEAR_DARKNESS) / 0.45)
  for (let i = 0; i < inst.stars.length; i++) {
    const s = inst.stars[i]
    const twinkle = 0.5 + 0.5 * Math.sin(inst.starPhases[i] + t)
    k.drawCircle({
      pos: k.vec2(s.x, s.y),
      radius: s.r,
      color: k.rgb(240, 245, 255),
      //
      // Nearly disappear at trough (0.04) and fully visible at peak — deep slow pulse
      //
      opacity: baseOpacity * (0.04 + 0.96 * twinkle)
    })
  }
}

//
// Generate blink + reveal state for each window.
// revealDarkness: window turns ON only when darkness crosses this threshold (evening)
// hideDarkness: window turns OFF when darkness drops below this (morning, earlier than reveal)
// canBlink: ~18% of windows occasionally dim briefly (person passing by)
//
function generateWindowBlinks(windows) {
  return windows.map((_, i) => {
    const canBlink = (i * 1.618) % 1 < 0.18
    const revealDarkness = 0.30 + ((i * 2.718) % 1) * 0.35
    const hideDarkness = 0.15 + ((i * 3.141) % 1) * 0.20
    //
    // Personal morning off-time: deterministic per window, spread between 3 AM and 5 AM.
    //
    const lastOnTime = WINDOW_MORNING_OFF_MIN + ((i * 1.732) % 1) * (WINDOW_MORNING_OFF_MAX - WINDOW_MORNING_OFF_MIN)
    return {
      canBlink,
      isOn: true,
      //
      // Staggered phase so not all blinks happen simultaneously
      //
      timer: ((i * 2.414) % 1) * 10,
      onDuration: 6 + ((i * 0.618) % 1) * 14,
      offDuration: 0.10 + ((i * 1.414) % 1) * 0.45,
      revealDarkness,
      hideDarkness,
      lastOnTime
    }
  })
}
//
// Advance each blink timer and toggle window on/off state
//
function updateWindowBlinks(inst, darkness, dt) {
  if (darkness <= WINDOW_APPEAR_DARKNESS) return
  for (const b of inst.windowBlinks) {
    if (!b.canBlink) continue
    b.timer -= dt
    if (b.timer > 0) continue
    b.isOn = !b.isOn
    b.timer = b.isOn ? b.onDuration : b.offDuration
  }
}
//
// Deterministic synthetic window positions in building area — reliable alternative to
// reading actual sprite window coords which can fail to render due to layer timing
//
function generateWindows() {
  const w = CFG.visual.screen.width
  const yRange = WINDOW_AREA_BOT_Y - WINDOW_AREA_TOP_Y
  return Array.from({ length: WINDOW_COUNT }, (_, i) => ({
    x: ((i * 137.508) % 1) * w,
    y: WINDOW_AREA_TOP_Y + ((i * 97.318 + 0.13) % 1) * yRange,
    size: WINDOW_GLOW_SIZE + ((i * 53.7) % 1) * 3,
    warm: (i * 1.618) % 1 > 0.30
  }))
}
//
// Deterministic star positions using golden-ratio scatter (no Math.random so stable)
//
function generateStars() {
  const w = CFG.visual.screen.width
  const h = CFG.visual.screen.height * STAR_AREA_H_FRAC
  return Array.from({ length: STAR_COUNT }, (_, i) => ({
    x: ((i * 137.508) % 1) * w,
    y: ((i * 97.318 + 0.13) % 1) * h,
    r: STAR_MIN_R + ((i * 53.724) % 1) * (STAR_MAX_R - STAR_MIN_R)
  }))
}
//
// Draw window glow spots at actual building window positions — large bloom + bright core
//
function drawWindowGlows(inst, darkness) {
  const k = inst.k
  const t = k.time() * WINDOW_TWINKLE_SPEED
  const baseOpacity = Math.min(1, (darkness - WINDOW_APPEAR_DARKNESS) / 0.35)
  //
  // Determine cycle phase: timeOfDay < 0.5 = post-midnight getting lighter (morning);
  // timeOfDay >= 0.5 = post-noon getting darker (evening)
  //
  const isGettingLighter = moduleTimeOfDay < 0.5
  for (let i = 0; i < inst.windows.length; i++) {
    const blink = inst.windowBlinks[i]
    //
    // Evening: each window waits for darkness to reach its personal reveal threshold
    // Morning: each window turns off when darkness drops below its hide threshold
    //
    if (!isGettingLighter && darkness < blink.revealDarkness) continue
    if (isGettingLighter && darkness < blink.hideDarkness) continue
    //
    // Morning: each window has a personal "last on" time between 3–5 AM.
    // Once the cycle passes that time, the window is dark for the rest of the morning.
    //
    if (isGettingLighter && moduleTimeOfDay > blink.lastOnTime) continue
    //
    // Skip windows that are currently blinking off (person passing inside)
    //
    if (blink.canBlink && !blink.isOn) continue
    const w = inst.windows[i]
    const phase = inst.windowPhases[i]
    const flicker = 0.70 + 0.30 * Math.sin(phase + t * (0.65 + ((phase * 0.09) % 0.38)))
    const op = baseOpacity * flicker
    const color = w.warm ? k.rgb(255, 228, 130) : k.rgb(195, 218, 255)
    drawWindowBlur(k, w.x - w.size / 2, w.y - w.size / 2, w.size, color, op)
  }
}
//
// Simulated window blur: background spread rect + main rect creates soft diffused glow
//
function drawWindowBlur(k, x, y, size, color, op) {
  k.drawRect({ pos: k.vec2(x - 2, y - 2), width: size + 4, height: size + 4, color, opacity: op * 0.08 })
  k.drawRect({ pos: k.vec2(x - 1, y - 1), width: size + 2, height: size + 2, color, opacity: op * 0.15 })
  k.drawRect({ pos: k.vec2(x, y), width: size, height: size, color, opacity: op * 0.45 })
}
