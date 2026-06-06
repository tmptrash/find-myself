import { CFG } from '../../../cfg.js'
import * as Sound from '../../../utils/sound.js'
import * as Tooltip from '../../../utils/tooltip.js'
import { set } from '../../../utils/progress.js'
import { parseHex } from '../../../utils/helper.js'
import * as CanvasBackdrop from '../../../utils/canvas-backdrop.js'

//
// Life deduction animation constants
//
const DEDUCT_AMOUNT = 5
const FADE_IN = 0.6
const SCORE_HOLD = 0.8
const COUNT_DURATION = 0.8
const BLINK_SPEED = 6
const BLINK_DURATION = 1.0
const RESULT_FADE_IN = 0.5
const RESULT_HOLD = 1.5
const FADE_OUT = 0.8
const OVERLAY_OPACITY = 0
//
// How dark the level appears behind the life-deduction dialog (0 = none, 1 = black)
//
const OVERLAY_DIM_MAX = 0.42
const LIFE_SCALE = 0.3
const SHOW_DELAY = 0.5
const INTRO_TEXT = "Life strikes back"
const RESULT_TEXT = "One problem added"
const FONT_SIZE = 32
const SCORE_FONT_SIZE = 74
const BLINK_COLOR = '#E07060'
const RESULT_COLOR_R = 230
const RESULT_COLOR_G = 110
const RESULT_COLOR_B = 100
const BOX_WIDTH = 560
const BOX_HEIGHT = 340
const BOX_RADIUS = 16
const INTRO_Y_OFFSET = -120
const RESULT_Y_OFFSET = 120
const LIFE_X_OFFSET = -50
const SCORE_X_OFFSET = 55
const SCORE_Y_OFFSET = 0
const OUTLINE_OFFSET = 1.5
const BORDER_WIDTH = 3
const BUBBLE_FRAME_ALPHA = 0.88
const BUBBLE_FILL_ALPHA = 1.0
//
// Warm accent used as the complementary foreground on cool/dark scene backdrops
//
const COMPLEMENT_WARM_R = 224
const COMPLEMENT_WARM_G = 128
const COMPLEMENT_WARM_B = 64
//
// Time section uses black playfield — orange is its complement
//
const TIME_COMPLEMENT_R = 255
const TIME_COMPLEMENT_G = 140
const TIME_COMPLEMENT_B = 0
//
// Total animation duration (all phases combined)
//
export const TOTAL_DURATION = SHOW_DELAY + FADE_IN + SCORE_HOLD + COUNT_DURATION
  + BLINK_DURATION + RESULT_FADE_IN + RESULT_HOLD + FADE_OUT

/**
 * Shows life score deduction animation inside a tooltip-styled white bubble.
 * Phases: fadeIn -> scoreHold -> counting -> blink -> resultFadeIn -> resultHold -> fadeOut
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.currentScore - Current life score before deduction
 * @param {Object} config.levelIndicator - Level indicator instance for HUD score update
 * @param {Object} config.sound - Sound instance for tick sound during countdown
 * @param {string} config.deductFlag - localStorage key to mark deduction done
 * @param {*} [config.deductFlagValue=true] - Value to set for deductFlag (e.g. counter)
 * @param {string[]} [config.extraFlags] - Additional localStorage keys to set to true
 * @param {Object} [config.sceneLock] - Shared lock; heroInst.controlsDisabled cleared on end
 * @param {Function} [config.onComplete] - Callback fired after animation finishes
 * @param {Object} [config.sceneBgRgb] - Scene backdrop RGB (matches visible fill); letterbox dimmer blends correctly
 * @param {number} config.sceneBgRgb.r
 * @param {number} config.sceneBgRgb.g
 * @param {number} config.sceneBgRgb.b
 */
export function show(config) {
  const { k, currentScore, levelIndicator, sound, deductFlag, extraFlags, sceneLock, onComplete, sceneBgRgb } = config
  const deductFlagValue = config.deductFlagValue ?? true
  //
  // Persist the deducted score and mark as used immediately
  //
  const newScore = Math.max(0, currentScore - DEDUCT_AMOUNT)
  set('lifeScore', newScore)
  set(deductFlag, deductFlagValue)
  extraFlags?.forEach(flag => set(flag, true))
  //
  // Delay the visual hint by SHOW_DELAY seconds
  //
  k.wait(SHOW_DELAY, () => showAnimation(k, currentScore, newScore, levelIndicator, sound, sceneLock, onComplete, sceneBgRgb))
}
//
// Runs the actual life deduction animation after the delay
//
function showAnimation(k, currentScore, newScore, levelIndicator, sound, sceneLock, onComplete, sceneBgRgb) {
  const sceneBackdropHex = sceneBgRgb ? rgbToHex(sceneBgRgb) : null
  const palette = resolveComplementaryPalette(sceneBgRgb)
  const centerX = CFG.visual.screen.width / 2
  const centerY = CFG.visual.screen.height / 2
  Tooltip.suppressAll()
  const boxX = centerX - BOX_WIDTH / 2
  const boxY = centerY - BOX_HEIGHT / 2
  //
  // Play ominous sound at animation start
  //
  sound && Sound.playScarySound(sound)
  //
  // Full-screen cover in fixed screen space (letterbox + gameplay)
  //
  const overlay = k.add([
    k.fixed(),
    k.z(CFG.visual.zIndex.ui + 50),
    k.opacity(0),
    {
      draw() {
        drawFullscreenDimmer(k, overlay.opacity, sceneBgRgb)
      }
    }
  ])
  //
  // Rounded-rect bubble — scene fill with warm complementary border/text
  //
  const bubble = k.add([
    k.fixed(),
    k.z(CFG.visual.zIndex.ui + 51),
    k.opacity(0),
    {
      draw() {
        const o = bubble.opacity
        k.drawRect({
          pos: k.vec2(boxX - BORDER_WIDTH, boxY - BORDER_WIDTH),
          width: BOX_WIDTH + BORDER_WIDTH * 2,
          height: BOX_HEIGHT + BORDER_WIDTH * 2,
          radius: BOX_RADIUS + BORDER_WIDTH,
          color: k.rgb(palette.frameR, palette.frameG, palette.frameB),
          opacity: o * BUBBLE_FRAME_ALPHA
        })
        k.drawRect({
          pos: k.vec2(boxX, boxY),
          width: BOX_WIDTH,
          height: BOX_HEIGHT,
          radius: BOX_RADIUS,
          color: k.rgb(palette.fillR, palette.fillG, palette.fillB),
          opacity: o * BUBBLE_FILL_ALPHA
        })
      }
    }
  ])
  //
  // Intro text outlines (black, drawn slightly behind)
  //
  const oo = OUTLINE_OFFSET
  const introOutlineOffsets = [[-oo, -oo], [0, -oo], [oo, -oo], [-oo, 0], [oo, 0], [-oo, oo], [0, oo], [oo, oo]]
  const introOutlines = introOutlineOffsets.map(([dx, dy]) => k.add([
    k.text(INTRO_TEXT, { size: FONT_SIZE, align: 'center' }),
    k.pos(centerX + dx, centerY + INTRO_Y_OFFSET + dy),
    k.anchor('center'),
    k.color(0, 0, 0),
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 52)
  ]))
  //
  // Intro text (white, drawn on top of outlines)
  //
  const introText = k.add([
    k.text(INTRO_TEXT, { size: FONT_SIZE, align: 'center' }),
    k.pos(centerX, centerY + INTRO_Y_OFFSET),
    k.anchor('center'),
    k.color(palette.textR, palette.textG, palette.textB),
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 52.1),
    k.fixed()
  ])
  //
  // Life icon
  //
  const lifeIcon = k.add([
    k.sprite('life'),
    k.pos(centerX + LIFE_X_OFFSET, centerY + SCORE_Y_OFFSET),
    k.anchor('center'),
    k.scale(LIFE_SCALE),
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 52)
  ])
  //
  // Score outlines (black)
  //
  const scoreX = centerX + SCORE_X_OFFSET
  const scoreY = centerY + SCORE_Y_OFFSET + 15
  const outlineOffsets = [[-oo, 0], [oo, 0], [0, -oo], [0, oo]]
  const scoreOutlines = outlineOffsets.map(([dx, dy]) => k.add([
    k.text(currentScore.toString(), { size: SCORE_FONT_SIZE }),
    k.pos(scoreX + dx, scoreY + dy),
    k.anchor('left'),
    k.color(0, 0, 0),
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 52)
  ]))
  //
  // Score text
  //
  const scoreText = k.add([
    k.text(currentScore.toString(), { size: SCORE_FONT_SIZE }),
    k.pos(scoreX, scoreY),
    k.anchor('left'),
    k.color(palette.textR, palette.textG, palette.textB),
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 52.1),
    k.fixed()
  ])
  //
  // Result text outlines (black, drawn slightly behind)
  //
  const resultOutlines = introOutlineOffsets.map(([dx, dy]) => k.add([
    k.text(RESULT_TEXT, { size: FONT_SIZE }),
    k.pos(centerX + dx, centerY + RESULT_Y_OFFSET + dy),
    k.anchor('center'),
    k.color(0, 0, 0),
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 52)
  ]))
  //
  // Result text (red, drawn on top of outlines)
  //
  const resultText = k.add([
    k.text(RESULT_TEXT, { size: FONT_SIZE }),
    k.pos(centerX, centerY + RESULT_Y_OFFSET),
    k.anchor('center'),
    k.color(palette.resultR, palette.resultG, palette.resultB),
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 52.1),
    k.fixed()
  ])
  //
  // Animation state machine
  //
  const state = {
    timer: 0,
    phase: 'fadeIn',
    displayedScore: currentScore,
    blinkTimer: 0,
    lastTickScore: currentScore
  }
  const el = { overlay, bubble, introText, introOutlines, lifeIcon, scoreText, scoreOutlines, resultText, resultOutlines }
  const updateHandler = k.onUpdate(() => {
    state.timer += k.dt()
    onUpdateDeduction(
      k,
      state,
      el,
      currentScore,
      newScore,
      updateHandler,
      levelIndicator,
      sound,
      sceneLock,
      onComplete,
      sceneBackdropHex,
      palette
    )
  })
}
//
// Helper: set opacity on all score outlines
//
function setOutlinesOpacity(outlines, opacity) {
  outlines.forEach(o => { o.opacity = opacity })
}
//
// Helper: update text on all outlines
//
function setOutlinesText(outlines, text) {
  outlines.forEach(o => { o.text = text })
}
//
// Drives the animation phases
//
function onUpdateDeduction(
  k,
  state,
  el,
  fromScore,
  toScore,
  updateHandler,
  levelIndicator,
  sound,
  sceneLock,
  onComplete,
  sceneBackdropHex,
  palette
) {
  const { overlay, bubble, introText, introOutlines, lifeIcon, scoreText, scoreOutlines, resultText, resultOutlines } = el
  if (state.phase === 'fadeIn') {
    const p = Math.min(1, state.timer / FADE_IN)
    overlay.opacity = p
    bubble.opacity = p
    introText.opacity = p
    setOutlinesOpacity(introOutlines, p)
    lifeIcon.opacity = p
    //
    // Continuously sync CSS letterbox bars with the canvas dim level.
    // The overlay dims the canvas by OVERLAY_DIM_MAX * p, so bars should
    // match: rgb(r*(1-p*DIM), ...).
    //
    syncBackdropToDim(k, sceneBackdropHex, p)
    scoreText.opacity = p
    setOutlinesOpacity(scoreOutlines, p)
    if (p >= 1) {
      state.phase = 'scoreHold'
      state.timer = 0
    }
  } else if (state.phase === 'scoreHold') {
    if (state.timer >= SCORE_HOLD) {
      state.phase = 'counting'
      state.timer = 0
    }
  } else if (state.phase === 'counting') {
    const p = Math.min(1, state.timer / COUNT_DURATION)
    const eased = 1 - Math.pow(1 - p, 2)
    state.displayedScore = Math.max(0, Math.round(fromScore - (fromScore - toScore) * eased))
    scoreText.text = state.displayedScore.toString()
    setOutlinesText(scoreOutlines, state.displayedScore.toString())
    if (state.displayedScore !== state.lastTickScore && sound) {
      Sound.playScoreTickSound(sound, p)
      state.lastTickScore = state.displayedScore
    }
    if (p >= 1) {
      state.phase = 'blink'
      state.timer = 0
      state.blinkTimer = 0
      levelIndicator?.updateLifeScore?.(toScore)
    }
  } else if (state.phase === 'blink') {
    state.blinkTimer += k.dt()
    const blinkValue = (Math.sin(state.blinkTimer * BLINK_SPEED * Math.PI * 2) + 1) / 2
    const blinkRgb = parseHex(BLINK_COLOR)
    scoreText.color = k.rgb(
      palette.textR + (blinkRgb[0] - palette.textR) * blinkValue,
      palette.textG + (blinkRgb[1] - palette.textG) * blinkValue,
      palette.textB + (blinkRgb[2] - palette.textB) * blinkValue
    )
    if (state.blinkTimer >= BLINK_DURATION) {
      scoreText.color = k.rgb(palette.textR, palette.textG, palette.textB)
      state.phase = 'resultFadeIn'
      state.timer = 0
    }
  } else if (state.phase === 'resultFadeIn') {
    const p = Math.min(1, state.timer / RESULT_FADE_IN)
    resultText.opacity = p
    setOutlinesOpacity(resultOutlines, p)
    if (p >= 1) {
      state.phase = 'resultHold'
      state.timer = 0
    }
  } else if (state.phase === 'resultHold') {
    if (state.timer >= RESULT_HOLD) {
      state.phase = 'fadeOut'
      state.timer = 0
    }
  } else if (state.phase === 'fadeOut') {
    const p = Math.min(1, state.timer / FADE_OUT)
    const opacity = 1 - p
    //
    // Sync CSS bars to the current overlay dim: overlay.opacity goes 1→0,
    // so dim also goes from OVERLAY_DIM_MAX down to 0.
    //
    syncBackdropToDim(k, sceneBackdropHex, opacity)
    overlay.opacity = opacity
    bubble.opacity = opacity
    introText.opacity = opacity
    setOutlinesOpacity(introOutlines, opacity)
    lifeIcon.opacity = opacity
    scoreText.opacity = opacity
    setOutlinesOpacity(scoreOutlines, opacity)
    resultText.opacity = opacity
    setOutlinesOpacity(resultOutlines, opacity)
    if (p >= 1) {
      updateHandler.cancel()
      k.destroy(overlay)
      k.destroy(bubble)
      k.destroy(introText)
      introOutlines.forEach(o => k.destroy(o))
      k.destroy(lifeIcon)
      scoreOutlines.forEach(o => k.destroy(o))
      k.destroy(scoreText)
      k.destroy(resultText)
      resultOutlines.forEach(o => k.destroy(o))
      Tooltip.unsuppressAll()
      //
      // Final restoration: fully sync k.setBackground + CSS to the original scene color.
      //
      sceneBackdropHex && CanvasBackdrop.applyCanvasBackdrop(k, sceneBackdropHex)
      sceneLock && (sceneLock.locked = false)
      sceneLock?.heroInst && (sceneLock.heroInst.controlsDisabled = false)
      onComplete?.()
    }
  }
}
//
// Letterboxed margins live in fixed screen space — overlay must use fixed draw calls.
//
function drawFullscreenDimmer(k, overlayOpacity, sceneBgRgb) {
  if (overlayOpacity <= 0) return
  //
  // Semi-transparent black dim — the level stays visible underneath while
  // the dialog reads clearly on top. Canvas CSS backdrop (set separately)
  // keeps letterbox bars matched to the scene fill colour.
  //
  const dimStrength = sceneBgRgb ? OVERLAY_DIM_MAX : OVERLAY_OPACITY
  const dim = overlayOpacity * dimStrength
  if (dim <= 0) return
  k.drawRect({
    width: k.width(),
    height: k.height(),
    pos: k.vec2(0, 0),
    color: k.rgb(0, 0, 0),
    opacity: dim,
    fixed: true
  })
}
//
// Builds fill + warm complementary text/frame colours from the scene backdrop
//
function resolveComplementaryPalette(sceneBgRgb) {
  const fallback = {
    fillR: 72,
    fillG: 74,
    fillB: 82,
    frameR: 230,
    frameG: 233,
    frameB: 238,
    textR: 255,
    textG: 255,
    textB: 255,
    resultR: RESULT_COLOR_R,
    resultG: RESULT_COLOR_G,
    resultB: RESULT_COLOR_B
  }
  if (!sceneBgRgb) return fallback
  const { r, g, b } = sceneBgRgb
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  const isTimeBlack = r < 8 && g < 8 && b < 8
  const accentR = isTimeBlack ? TIME_COMPLEMENT_R : COMPLEMENT_WARM_R
  const accentG = isTimeBlack ? TIME_COMPLEMENT_G : COMPLEMENT_WARM_G
  const accentB = isTimeBlack ? TIME_COMPLEMENT_B : COMPLEMENT_WARM_B
  const useWarmAccent = isTimeBlack || luminance < 130
  return {
    fillR: r,
    fillG: g,
    fillB: b,
    frameR: useWarmAccent ? accentR : 230,
    frameG: useWarmAccent ? accentG : 233,
    frameB: useWarmAccent ? accentB : 238,
    textR: useWarmAccent ? accentR : 255,
    textG: useWarmAccent ? accentG : 255,
    textB: useWarmAccent ? accentB : 255,
    resultR: useWarmAccent ? accentR : RESULT_COLOR_R,
    resultG: useWarmAccent ? accentG : RESULT_COLOR_G,
    resultB: useWarmAccent ? accentB : RESULT_COLOR_B
  }
}
//
// Converts scene backdrop RGB to a hex string for canvas-backdrop sync
//
function rgbToHex(sceneBgRgb) {
  const hex = (n) => n.toString(16).padStart(2, '0')
  return `#${hex(sceneBgRgb.r)}${hex(sceneBgRgb.g)}${hex(sceneBgRgb.b)}`
}
//
// Syncs CSS letterbox bars with the current overlay dim level (overlayOpacity 0→1).
// Called every frame during fadeIn and fadeOut so bars match the canvas exactly.
//
function syncBackdropToDim(k, sceneBackdropHex, overlayOpacity) {
  if (!sceneBackdropHex) return
  const [r, g, b] = parseHex(sceneBackdropHex)
  const dim = overlayOpacity * OVERLAY_DIM_MAX
  const dr = Math.round(r * (1 - dim))
  const dg = Math.round(g * (1 - dim))
  const db = Math.round(b * (1 - dim))
  //
  // Update both Kaplay clear color and CSS backdrop so letterbox bars,
  // canvas edges, and any transparent canvas areas all match the dimmed scene.
  //
  k.setBackground(k.rgb(dr, dg, db))
  CanvasBackdrop.setCssBackdrop(k.canvas, dr, dg, db)
}
