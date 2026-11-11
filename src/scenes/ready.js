import { CFG } from '../cfg.js'
import { parseHex, getColor, bindStartGameKeys } from '../utils/helper.js'
import * as CanvasBackdrop from '../utils/canvas-backdrop.js'
import * as Sound from '../utils/sound.js'
import { goToMenuAfterAssets } from '../utils/lesson-assets.js'
import * as NoMouse from '../utils/no-mouse.js'
import { loadHeroSprites, HERO_SPRITE_PREFIX, HERO_FEET_OFFSET_Y, heroLookSpriteName, heroWinkSpriteName, createRunLegs, drawRunningHero, createStandLegs, drawStandingHero } from '../components/hero.js'
import { renderHintWithEnter, renderHintLine } from '../utils/touch-tap-button.js'
import { isTouchDevice } from '../utils/touch-input.js'
import {
  generateMenuBackgroundCanvas,
  loadMenuBackgroundArt,
  recomputeMenuBgLayout,
  drawMenuMoon,
  MENU_BG_GROUND_Y,
  MENU_BG_HORIZON_LINE_HEIGHT,
  MENU_BG_CANVAS_W,
  MENU_BG_CANVAS_H,
  MENU_BG_MOON_CENTER_X,
  MENU_BG_MOON_CENTER_Y,
  MENU_BG_MOON_HALO_KEEPOUT
} from '../utils/menu-bg-generator.js'
import { drawForestFilmGrainWorldPatch } from '../sections/forest/utils/forest-parallax-grain.js'
import {
  READY_EYE_DISPLAY_HEIGHT,
  READY_EYE_DISPLAY_WIDTH,
  createEyeHudBlinkState,
  drawReadySceneEye,
  tickReadySceneEyeBlink
} from '../utils/eye-hud.js'

//
// Hint flicker — pinned at the very bottom of the screen so the
// "press Space" callout sits below the description block, with the
// title and monster occupying the upper half of the canvas.
//
const HINT_FLICKER_DURATION = 1.2
const HINT_MIN_OPACITY = 0.4
const HINT_MAX_OPACITY = 0.75
const HINT_FONT_SIZE = 20
//
// Phones and tablets have no keys to press: a tap anywhere starts the game.
//
const TOUCH_HINT = 'tap anywhere to start'
//
// Fixed pixel margin from the bottom edge (matches the moon's fixed-margin
// corner anchoring) so the hint sits the same distance off the bottom at
// any resolution. Recomputed by recomputeReadyLayout() from the live
// k.height() — every `let` below this comment is resolution-derived and
// updated the same way, mirroring Forest's recomputeForestScreenLayout pattern.
//
const HINT_BOTTOM_MARGIN = 35
let HINT_Y = CFG.visual.screen.height - HINT_BOTTOM_MARGIN
//
// Crawling letter title — centred at the very top of the canvas,
// well above the central monster illustration.
//
const INSTRUCTIONS_TITLE = 'rootward'
const TITLE_FONT_FAMILY = CFG.visual.fonts.regularFull
//
// Keeps the glyph-to-hero size ratio of the original 76px title at the
// hero's native 96px bake resolution: 76 * (96 / 80) = 91.2.
//
const TITLE_FONT_SIZE = 91.2
//
// The title is a genuinely hollow rim in the warm moon cream
// (CFG.visual.colors.ready.moon) — transparent inside the glyphs — with a
// single 1px offset
// copy as the drop shadow. Baked to a canvas (bakeReadyTitleSprite) instead
// of live k.text() draws: the rim is built by stamping 8 one-pixel-offset
// dilated copies then punching the original glyph shape back out with
// `destination-out`, which is the only way to get a REAL transparent
// interior (a live k.text() dilate-without-punch reads as bold/thick, and
// there is no erase-style blend mode for live draw calls in Kaplay).
//
const TITLE_SHADOW_OFFSET = 1
const TITLE_OUTLINE_COLOR = CFG.visual.colors.ready.moon
const TITLE_OUTLINE_RIM_PX = 2
const TITLE_OUTLINE_OFFSETS = [
  [-TITLE_OUTLINE_RIM_PX, -TITLE_OUTLINE_RIM_PX], [0, -TITLE_OUTLINE_RIM_PX], [TITLE_OUTLINE_RIM_PX, -TITLE_OUTLINE_RIM_PX],
  [-TITLE_OUTLINE_RIM_PX, 0], [TITLE_OUTLINE_RIM_PX, 0],
  [-TITLE_OUTLINE_RIM_PX, TITLE_OUTLINE_RIM_PX], [0, TITLE_OUTLINE_RIM_PX], [TITLE_OUTLINE_RIM_PX, TITLE_OUTLINE_RIM_PX]
]
//
// Sprite name for the baked title rim (rebaked whenever a letter blanks
// out into a space as it detaches into a spider — see bakeReadyTitleSprite).
//
//
// Title letters stay fixed in the string — each glyph is baked once (hollow
// moon-tone rim + black shadow) and drawn at its measured centre every frame.
//
const READY_LETTER_CANVAS_SIZE = Math.ceil(TITLE_FONT_SIZE * 1.5)
const READY_LETTER_CANVAS_CENTER = READY_LETTER_CANVAS_SIZE / 2
const TITLE_FLICKER_SPEED = 1.5
const TITLE_FLICKER_MIN = 0.85
const TITLE_FLICKER_MAX = 1.0
//
// The title glows: a soft moon-tone halo baked round every glyph (the
// glyph filled and blurred TITLE_GLOW_BLUR px, stacked TITLE_GLOW_PASSES
// times for strength) under its rim, at TITLE_GLOW_OPACITY of the title's
// own flickering opacity.
//
const TITLE_GLOW_BLUR = 4
const TITLE_GLOW_PASSES = 1
const TITLE_GLOW_OPACITY = 0.22
//
// Layout z-layers. Background pieces (clouds, stars, fireflies)
// stack between the baked menu-bg sprite and the foreground
// illustration; foreground UI (text, title, spiders, hint) sits on
// top of everything.
//
const Z_BG_OVERLAY = CFG.visual.zIndex.background + 1
//
// Combined static background — ONE baked full-screen image holding every
// static element of the scene: the darkened menu-bg picture (moon, all tree
// layers, rocks, roots, mushrooms) plus the bottom description text. Drawn
// as a single sprite each frame instead of many separate objects.
//
const READY_STATIC_SPRITE = 'ready-static-bg'
const READY_MOON_SPRITE = 'ready-moon'
const READY_BG_DARKEN_ALPHA = 0.5
const READY_TEXT_SHADOW_OFFSET = 1
//
// Full-screen sprites live in a texture atlas: linear sampling at the very
// edge rows pulls in neighbour texels, which reads as thin horizontal lines
// at the top/bottom of the canvas. Drawing the sprite overscanned by one
// pixel pushes those edge rows off-screen.
//
const READY_BG_EDGE_OVERSCAN = 1
//
// Stars sit BELOW the drifting cloud layer so twinkles never punch
// through the cloud puffs — clouds read as the nearer sky element.
// Moon sits ABOVE the stars so the disc occludes any twinkles near it.
//
const Z_STARS = CFG.visual.zIndex.background + 2
const Z_MOON = CFG.visual.zIndex.background + 3
const Z_FIREFLIES = CFG.visual.zIndex.background + 7
const Z_ILLUSTRATION = CFG.visual.zIndex.background + 6
const Z_TITLE = 15
const Z_SPIDER = 50
const Z_HINT = 100
const Z_FILM_GRAIN = Z_HINT + 5
//
// Blinking stars (sky overlay above the menu-bg sprite). Each star is a
// tiny dot whose alpha (and, for the largest ones, a faint 4-point cross
// flare) is modulated by `sin(time * freq + phase)` so the field reads
// as a slow shimmering night sky rather than fixed dots. Configuration
// constants below stay declarative so the scene file keeps no per-star
// state of its own — the field is generated once on scene enter.
//
const STAR_COUNT_SMALL = 38
const STAR_COUNT_LARGE = 7
const STAR_RADIUS_SMALL_MIN = 0.9
const STAR_RADIUS_SMALL_RANGE = 1.3
const STAR_RADIUS_LARGE_MIN = 1.6
const STAR_RADIUS_LARGE_RANGE = 1.4
const STAR_TWINKLE_FREQ_MIN = 0.5
const STAR_TWINKLE_FREQ_RANGE = 2.4
const STAR_BASE_ALPHA_MIN = 0.35
const STAR_BASE_ALPHA_RANGE = 0.45
const STAR_AMBER_RATIO = 0.62
const STAR_AMBER_R = 244
const STAR_AMBER_G = 192
const STAR_AMBER_B = 96
const STAR_WHITE_R = 230
const STAR_WHITE_G = 240
const STAR_WHITE_B = 250
const STAR_AREA_TOP_RATIO = 0.05
const STAR_AREA_BOTTOM_RATIO = 0.55
const STAR_AREA_LEFT_RATIO = 0.03
const STAR_AREA_RIGHT_RATIO = 0.97
//
// Moon zone (in the baked menu-bg). Stars are repelled from this circle so
// none of them ever twinkles over the moon disc or its halo. Reads the
// exported moon geometry directly (both are already absolute pixel
// coordinates the bg generator keeps in sync with the live resolution via
// recomputeMenuBgLayout — see recomputeReadyLayout()), plus a flat safety
// margin.
//
const MOON_ZONE_MARGIN = 40
//
// Wandering fireflies — never higher than the front-layer tree
// canopy so they read as flying AMONG the trees rather than across
// the open sky. Each firefly drifts on a slowly rotating velocity
// vector and twinkles independently. The vertical clamp uses the
// front-tree silhouette top from menu-bg-generator (`FIREFLY_MIN_Y`).
//
const FIREFLY_COUNT = 40
//
// Design-reference top of the sky band (front-tree canopy). Kept as a ratio
// of the reference screen height so it scales with GROUND_Y the same way at
// any resolution instead of clipping the firefly band on shorter windows.
//
const FIREFLY_MIN_Y_RATIO = 320 / CFG.visual.screen.height
const FIREFLY_EDGE_INSET = 80
let FIREFLY_MIN_Y = FIREFLY_MIN_Y_RATIO * CFG.visual.screen.height
let FIREFLY_MAX_Y = MENU_BG_GROUND_Y - 8
let FIREFLY_MIN_X = FIREFLY_EDGE_INSET
let FIREFLY_MAX_X = MENU_BG_CANVAS_W - FIREFLY_EDGE_INSET
const FIREFLY_SPEED_MIN = 12
const FIREFLY_SPEED_RANGE = 14
const FIREFLY_DIR_CHANGE_INTERVAL_MIN = 2.5
const FIREFLY_DIR_CHANGE_INTERVAL_RANGE = 3.5
const FIREFLY_TURN_SMOOTHNESS = 1.6
const FIREFLY_RADIUS_MIN = 1.7
const FIREFLY_RADIUS_RANGE = 1.4
const FIREFLY_GLOW_RADIUS_MULT = 3.0
const FIREFLY_TWINKLE_FREQ_MIN = 0.6
const FIREFLY_TWINKLE_FREQ_RANGE = 1.5
const FIREFLY_BASE_ALPHA_MIN = 0.45
const FIREFLY_BASE_ALPHA_RANGE = 0.45
const FIREFLY_COLOR_R = 244
const FIREFLY_COLOR_G = 192
const FIREFLY_COLOR_B = 96
//
// Cricket + owl ambient sounds — random intervals so the night soundscape
// stays alive but never feels mechanical. Cricket bursts trigger every
// few seconds; owl hoots are sparse and atmospheric.
//
const CRICKET_INTERVAL_MIN = 2.4
const CRICKET_INTERVAL_RANGE = 4.2
const OWL_INTERVAL_MIN = 14.0
const OWL_INTERVAL_RANGE = 18.0
const AMBIENT_FIRST_DELAY_MIN = 0.8
const AMBIENT_FIRST_DELAY_RANGE = 2.0
//
// Central illustration (eye_0/1/2 at 2× native, then −40%) — centred on horizon.
//
const LIFE_WIDTH = READY_EYE_DISPLAY_WIDTH
const LIFE_HEIGHT = READY_EYE_DISPLAY_HEIGHT
let LIFE_X = Math.round(MENU_BG_CANVAS_W / 2 - LIFE_WIDTH / 2)
//
// Transparent padding below the visible eye — sink onto the horizon strip.
//
const LIFE_Y_SINK = 48
//
// Extra lift so the horizon eye sits higher on the ready illustration.
//
const READY_EYE_RAISE_PX = 50
let LIFE_Y = MENU_BG_GROUND_Y - LIFE_HEIGHT + LIFE_Y_SINK - READY_EYE_RAISE_PX
const LIFE_OPACITY = 1.0
//
// The hero sprite canvas (96×96) has ~12 px of empty padding below
// the legs, so when the sprite is drawn with its BOTTOM at HERO_Y the
// visible feet end above HERO_Y at the illustration display scale.
// Push HERO_Y down by that padding so the hero's actual feet land
// ON the black horizon strip rather than floating above it.
//
const HERO_FEET_PADDING = 17
//
// Lone hero rendered at its native 96px bake resolution (1:1 pixel scale).
// It stands on the ground line HERO_WATCH_GAP_X right of the centre eye
// (HERO_CHAR_WIDTH is the hero's body width).
//
const HERO_N_SPRITE_SIZE = 96
const HERO_WATCH_GAP_X = 40
const HERO_CHAR_WIDTH = 30
//
// Height of the hero's eyes in its 96 px sprite (the watch aims from there).
//
const HERO_EYE_CANVAS_Y = 28
//
// Departure sequence. The hero watches the eye until the input has rested
// for HERO_N_MOUSE_STILL_DELAY seconds, then walks off-screen right in short
// bursts (a RANDOM 4–8 steps each, then a stop) — any mouse movement while
// it walks freezes it in a closed-eyes idle until the input rests again.
// Everything except the eye fades with its progress toward the right edge
// (see updateReadyDepartureFade).
//
const HERO_N_MOUSE_STILL_DELAY = 10
const HERO_N_RUN_SPEED = 42
const HERO_N_RUN_FRAME_TIME = 0.09
const HERO_N_RUN_FRAME_COUNT = 8
const HERO_N_RUN_STEPS_MIN = 4
const HERO_N_RUN_STEPS_RANGE = 5
//
// Passed as the "current level" to Sound.playStepSound so it takes the same
// branch as an actual ground step in the forest level — no real scene change,
// just routing into the same procedural ground-footstep sound.
//
const HERO_N_STEP_SOUND_LEVEL = 'lesson-forest.0'
//
// The 8-frame run cycle contains TWO foot contacts, so one visible step
// lasts half a full sprite cycle.
//
const HERO_N_STEP_DURATION = HERO_N_RUN_FRAME_TIME * HERO_N_RUN_FRAME_COUNT / 2
const HERO_N_RUN_PAUSE = 4
//
// Wake-up sequence after an idle interruption: the hero first opens ONE eye
// and glances left/right with the pupil for a few seconds, then opens the
// second eye briefly, and only then resumes running.
//
const HERO_N_WAKE_ONE_EYE_DURATION = 3
const HERO_N_WAKE_BOTH_EYES_DURATION = 1
//
// After hero-n disappears past the right screen edge the scene waits this
// long and then switches to the menu on its own.
//
const HERO_N_GONE_MENU_DELAY = 2
const HERO_N_WAKE_PUPIL_FREQ = 0.7
//
// Final beat: stop this far from the right edge, face the centre eye, then
// walk off-screen while the eye fades out over the same horizontal span.
//
const HERO_N_LOOK_LEFT_TRIGGER_MARGIN = 80
const HERO_N_LOOK_LEFT_DURATION = 5
const HERO_N_LOOK_LEFT_RUN_FRAME = 2
//
// Now drawn at the native 96px bake resolution (see HERO_N_SPRITE_SIZE),
// the same scale as the central illustration hero, so the lone hero
// reuses its HERO_FEET_PADDING for the same feet-on-the-ground-line fix.
// Lifted an extra few pixels above that so it stands a bit clear of the
// ground line while walking/standing on it.
//
const HERO_N_GROUND_LIFT_PX = 3
let HERO_N_GROUND_CENTER_Y = MENU_BG_GROUND_Y + HERO_FEET_PADDING - HERO_N_SPRITE_SIZE / 2 - HERO_N_GROUND_LIFT_PX
//
// Centered description layout. All narrative + section labels live in
// a single centred block placed BELOW the black horizon strip so the
// upper half of the canvas stays clean for the hint, title and the
// monster + hero illustration. Each text line uses anchor 'center'
// pinned at the canvas centre column.
//
let CENTER_X = Math.round(MENU_BG_CANVAS_W / 2)
let TITLE_TEXT_X = CENTER_X
//
// Fixed pixel margin from the top edge — the title stays top-centre at any
// resolution without stretching toward a taller window.
//
const TITLE_TEXT_Y = 130
//
// Description block geometry. Three-line narrative block vertically
// centred between the horizon line and the bottom hint.
//
const READY_DESC_LINES = [
  'Fear lives in each of us,',
  'but only a few dare to meet',
  'it face to face...'
]
const BLOCK_LINE_COUNT = 5
const TEXT_FONT_SIZE = 36
const TEXT_LINE_HEIGHT = 50
//
// Actual rendered block height: two inter-line gaps + one font height.
// Using font height (not line-height) for the last line gives the true
// visual bottom so the formula creates equal top/bottom gaps.
//
const BLOCK_HEIGHT = (BLOCK_LINE_COUNT - 1) * TEXT_LINE_HEIGHT + TEXT_FONT_SIZE
let AVAILABLE_H = HINT_Y - MENU_BG_GROUND_Y
let DESCRIPTION_START_Y = Math.round(MENU_BG_GROUND_Y + (AVAILABLE_H - BLOCK_HEIGHT) / 2) + 20
const DESC_FIRST_LINE_OFFSET = 40
//
// Short views (a phone in landscape shows ~560 world px top to bottom): the
// hero is drawn at READY_COMPACT_HERO_SCALE round his feet, and the
// description sits right under the ground strip (DESC_GROUND_GAP below it,
// DESC_HINT_GAP above the hint), its type shrunk until its lines fit there.
//
const READY_COMPACT_MAX_H = 700
const READY_COMPACT_HERO_SCALE = 0.7
const DESC_GROUND_GAP = 16
const DESC_HINT_GAP = 12
let HERO_DRAW_SCALE = 1
let TEXT_SCALE = 1
let DESC_FIRST_LINE_Y = DESCRIPTION_START_Y + DESC_FIRST_LINE_OFFSET
//
// Narrative body copy — cool teal-gray (ready.text) on the deep teal frame.
//
/**
 * Recomputes every resolution-derived ready-scene layout value from the
 * live kaplay viewport. Must run before recomputeMenuBgLayout()'s exports
 * are read, and before any of the sprite baking / field creation calls
 * below it — mirrors Forest's recomputeForestScreenLayout() pattern, since
 * "ready" now shares the native-resolution engine with menu/Forest/touch
 * lesson 0 (see engine-switch.js) instead of a fixed 1920x1080 canvas.
 * @param {Object} k - Kaplay inst
 */
function recomputeReadyLayout(k) {
  recomputeMenuBgLayout(k.width(), k.height())
  HINT_Y = k.height() - HINT_BOTTOM_MARGIN
  FIREFLY_MIN_Y = FIREFLY_MIN_Y_RATIO * k.height()
  FIREFLY_MAX_Y = MENU_BG_GROUND_Y - 8
  FIREFLY_MIN_X = FIREFLY_EDGE_INSET
  FIREFLY_MAX_X = MENU_BG_CANVAS_W - FIREFLY_EDGE_INSET
  LIFE_X = Math.round(MENU_BG_CANVAS_W / 2 - LIFE_WIDTH / 2)
  LIFE_Y = MENU_BG_GROUND_Y - LIFE_HEIGHT + LIFE_Y_SINK - READY_EYE_RAISE_PX
  HERO_N_GROUND_CENTER_Y = MENU_BG_GROUND_Y + HERO_FEET_PADDING - HERO_N_SPRITE_SIZE / 2 - HERO_N_GROUND_LIFT_PX
  CENTER_X = Math.round(MENU_BG_CANVAS_W / 2)
  TITLE_TEXT_X = CENTER_X
  AVAILABLE_H = HINT_Y - MENU_BG_GROUND_Y
  DESCRIPTION_START_Y = Math.round(MENU_BG_GROUND_Y + (AVAILABLE_H - BLOCK_HEIGHT) / 2) + 20
  const compact = k.height() < READY_COMPACT_MAX_H
  HERO_DRAW_SCALE = compact ? READY_COMPACT_HERO_SCALE : 1
  TEXT_SCALE = compact ? compactTextScale() : 1
  DESC_FIRST_LINE_Y = compact
    ? Math.round(compactDescriptionTop() + TEXT_FONT_SIZE * TEXT_SCALE / 2)
    : DESCRIPTION_START_Y + DESC_FIRST_LINE_OFFSET
}
//
// Compact description: its lines between the ground strip and the hint, the
// type shrunk (never grown) until they fit.
//
function compactDescriptionTop() {
  return MENU_BG_GROUND_Y + MENU_BG_HORIZON_LINE_HEIGHT + DESC_GROUND_GAP
}
function compactTextScale() {
  const bottom = HINT_Y - HINT_FONT_SIZE / 2 - DESC_HINT_GAP
  const natural = (READY_DESC_LINES.length - 1) * TEXT_LINE_HEIGHT + TEXT_FONT_SIZE
  return Math.min(1, (bottom - compactDescriptionTop()) / natural)
}

export function sceneReady(k) {
  k.scene('ready', async () => {
    //
    // Ready shares the native-resolution engine with menu, Forest and
    // Cave — recompute the whole baked-background + layout state
    // from the live window size before anything below reads it.
    //
    recomputeReadyLayout(k)
    //
    // Wait for @font-face fonts to finish loading before any canvas text sampling.
    //
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready } catch {}
    }
    //
    // The forest pictures the baked background is made of (trees, stones,
    // mushrooms).
    //
    await loadMenuBackgroundArt()
    //
    // Hero frames (shared by every hero; a no-op once baked on this k)
    //
    loadHeroSprites(k)
    CanvasBackdrop.applyCanvasBackdrop(k, CFG.visual.colors.ready.background)
    k.onSceneLeave(() => CanvasBackdrop.clearCanvasBackdrop(k))
    k.get("word-pile-text").forEach(obj => obj.destroy())
    k.get("word-pile-outline").forEach(obj => obj.destroy())
    k.get("flying-word").forEach(obj => obj.destroy())
    k.flyingWordsInstance = null
    const centerX = k.width() / 2
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    const spiderState = {
      timer: 0,
      titleFlicker: 1,
      departureFade: 1,
      eyeFinalFade: 0
    }
    const bgPlane = k.add([
      k.rect(k.width(), k.height()),
      getColor(k, CFG.visual.colors.ready.background),
      k.pos(0, 0),
      k.fixed(),
      k.z(CFG.visual.zIndex.background)
    ])
    //
    // Combined static background — the darkened menu-bg picture plus the
    // bottom description text, baked once into a single full-screen sprite.
    //
    buildReadyStaticSprite(k)
    k.add([k.pos(0, 0), k.z(Z_BG_OVERLAY), { draw() { onDrawBg(k, spiderState) } }])
    //
    // Twinkling star field overlaid on the baked menu-bg so the ready
    // scene gets a living night sky on top of the static composition.
    //
    const starField = createStarField(k)
    k.add([k.pos(0, 0), k.z(Z_STARS), { draw() { drawStarField(k, starField, spiderState) } }])
    //
    // Moon above the stars — baked without the moon in the static bg so
    // the disc and halo sit in front of any nearby twinkles.
    //
    buildReadyMoonSprite(k)
    k.add([k.pos(0, 0), k.z(Z_MOON), { draw() { onDrawMoon(k, spiderState) } }])
    //
    // Wandering fireflies — flicker through the lower sky band among
    // the front-layer tree silhouettes, never rising above the canopy.
    //
    const fireflyField = createFireflyField()
    k.add([k.pos(0, 0), k.z(Z_FIREFLIES), {
      update() { updateFireflyField(k, fireflyField) },
      draw() { drawFireflyField(k, fireflyField) }
    }])
    //
    // Ambient cricket + owl sounds — random intervals scheduled by
    // local timer state. Sounds stay silent until the first user
    // gesture unlocks the audio context (web audio policy).
    //
    const ambient = {
      sound,
      cricketTimer: AMBIENT_FIRST_DELAY_MIN + Math.random() * AMBIENT_FIRST_DELAY_RANGE,
      owlTimer: 4 + Math.random() * 6
    }
    k.onUpdate(() => onUpdateAmbientSounds(k, ambient))
    //
    // Central illustration: eye_big.png
    //
    const readyEyeBlink = createEyeHudBlinkState(k)
    readyEyeBlink.frameIndex = 0
    const readyEyeState = { blink: readyEyeBlink, hero: null }
    k.add([k.pos(0, 0), k.z(Z_ILLUSTRATION), { draw() { onDrawIllustration(k, readyEyeState, spiderState) } }])
    //
    // Invisible title text — only used to measure letter positions. The
    // actual pixels are per-letter baked sprites drawn at Z_TITLE.
    //
    const titleText = k.add([
      k.text(INSTRUCTIONS_TITLE, { size: TITLE_FONT_SIZE, font: TITLE_FONT_FAMILY }),
      k.pos(TITLE_TEXT_X, TITLE_TEXT_Y),
      k.anchor('center'),
      k.opacity(0),
      k.z(Z_TITLE)
    ])
    //
    // Hint text — the keys on desktop, a tap anywhere on touch devices.
    //
    const hintRgb = parseHex(CFG.visual.colors.ready.hint)
    const hintCfg = { k, centerX, y: HINT_Y, fontSize: HINT_FONT_SIZE, color: hintRgb, z: Z_HINT }
    const hint = isTouchDevice()
      ? renderHintLine({ ...hintCfg, text: TOUCH_HINT })
      : renderHintWithEnter({ ...hintCfg, prefix: 'press Space or ', suffix: ' to start', onTap: () => exitToMenu() })
    //
    // Title letter layout — every glyph is a static baked letter.
    //
    const titleLetters = pickLettersFromTitle(k, titleText, INSTRUCTIONS_TITLE, TITLE_FONT_SIZE, TITLE_FONT_FAMILY)
    titleLetters.forEach(li => {
      bakeReadyLetterSprite(k, li.char)
      bakeReadyLetterShadowSprite(k, li.char)
      bakeReadyLetterGlowSprite(k, li.char)
    })
    const hero = createReadyHero(k)
    readyEyeState.hero = hero
    k.add([k.pos(0, 0), k.z(Z_TITLE), { draw() { onDrawTitle(k, spiderState, titleLetters) } }])
    //
    // Shared input-stillness tracker driving the hero departure logic.
    // Both mouse motion and key presses count as player activity.
    //
    const heroLetterState = { lastMouseX: -1, lastMouseY: -1, mouseMoved: false, mouseStillTime: 0, keyPulse: false, heroGoneTime: 0, heroGoneExited: false }
    k.onKeyPress(() => { heroLetterState.keyPulse = true })
    let hintFlickerTime = HINT_FLICKER_DURATION
    let hintDirection = -1
    let titleFlickerPhase = 0
    k.onUpdate(() => {
      const dt = k.dt()
      spiderState.timer += dt
      updateReadyHero(k, hero, spiderState, heroLetterState, sound, dt)
      tickReadySceneEyeBlink(readyEyeState.blink, k, dt)
      //
      // Hint flicker
      //
      hintFlickerTime += dt * hintDirection
      if (hintFlickerTime >= HINT_FLICKER_DURATION) {
        hintDirection = -1
        hintFlickerTime = HINT_FLICKER_DURATION
      } else if (hintFlickerTime <= 0) {
        hintDirection = 1
        hintFlickerTime = 0
      }
      const hintOp = HINT_MIN_OPACITY + (HINT_MAX_OPACITY - HINT_MIN_OPACITY) * (hintFlickerTime / HINT_FLICKER_DURATION)
      hint.setOpacity(hintOp * (spiderState.departureFade ?? 1))
      //
      // Title subtle flicker
      //
      titleFlickerPhase += dt * TITLE_FLICKER_SPEED
      const titleFlicker = TITLE_FLICKER_MIN + (TITLE_FLICKER_MAX - TITLE_FLICKER_MIN) * (0.5 + 0.5 * Math.sin(titleFlickerPhase))
      spiderState.titleFlicker = titleFlicker
      bgPlane.opacity = spiderState.departureFade ?? 1
    })
    //
    // Hero draw layer — rendered above all text and title (Z_SPIDER)
    //
    k.add([k.pos(0, 0), k.z(Z_SPIDER), { draw() { drawTitleHero(k, hero) } }])
    //
    // Forest film grain — same look as lesson-forest.0, drawn over the whole scene.
    //
    k.add([
      k.fixed(),
      k.z(Z_FILM_GRAIN),
      {
        draw() {
          const op = spiderState.departureFade ?? 1
          if (op <= 0.001) return
          drawForestFilmGrainWorldPatch(k, 0, 0, k.width(), k.height(), 0.14 * op)
        }
      }
    ])
    //
    // Controls
    //
    let leaving = false
    const exitToMenu = () => {
      if (leaving) return
      leaving = true
      Sound.stopAmbient(sound)
      goToMenuAfterAssets(k)
    }
    const startGameInputCancel = bindStartGameKeys(k, () => exitToMenu())
    //
    // On a phone or tablet a tap anywhere goes to the menu (the corner HUD
    // buttons are page elements over the canvas, so their taps never get here).
    //
    isTouchDevice() && k.onTouchEnd(exitToMenu)
    //
    // A left click goes to the menu too (the mouse itself stays hidden).
    //
    const stopMouse = NoMouse.onMousePress(exitToMenu)
    k.onSceneLeave(() => {
      startGameInputCancel.cancel()
      stopMouse()
    })
  })
}
//
// Draws the combined static background (one baked sprite, full opacity —
// the darkening and the description text are already baked in).
//
function onDrawBg(k, spiderState) {
  const op = spiderState?.departureFade ?? 1
  if (op <= 0.001) return
  k.drawSprite({
    sprite: READY_STATIC_SPRITE,
    pos: k.vec2(-READY_BG_EDGE_OVERSCAN, -READY_BG_EDGE_OVERSCAN),
    width: k.width() + READY_BG_EDGE_OVERSCAN * 2,
    height: k.height() + READY_BG_EDGE_OVERSCAN * 2,
    opacity: op
  })
}
//
// Bakes every static element of the ready scene into ONE full-screen
// canvas and loads it as a sprite: the scene background colour, the
// menu-bg picture (moon, tree layers, rocks, roots, mushrooms) at the
// darkening alpha the scene used to apply per frame, and the centred
// description block with its drop shadow.
//
function buildReadyStaticSprite(k) {
  const canvas = document.createElement('canvas')
  canvas.width = MENU_BG_CANVAS_W
  canvas.height = MENU_BG_CANVAS_H
  const ctx = canvas.getContext('2d')
  //
  // Base fill + the darkened background picture.
  //
  ctx.fillStyle = CFG.visual.colors.ready.background
  ctx.fillRect(0, 0, MENU_BG_CANVAS_W, MENU_BG_CANVAS_H)
  const bgCanvas = generateMenuBackgroundCanvas(undefined, { skipMoon: true })
  ctx.globalAlpha = READY_BG_DARKEN_ALPHA
  ctx.drawImage(bgCanvas, 0, 0)
  ctx.globalAlpha = 1
  bgCanvas.width = 0
  bgCanvas.height = 0
  //
  // Bottom description block — centred lines with a glow-style drop shadow
  // (single black copy offset right+down).
  //
  ctx.font = `${TEXT_FONT_SIZE * TEXT_SCALE}px ${CFG.visual.fonts.thinFull}, ${CFG.visual.fonts.regularFull}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let cursorY = DESC_FIRST_LINE_Y
  for (const line of READY_DESC_LINES) {
    ctx.fillStyle = '#000000'
    ctx.fillText(line, CENTER_X + READY_TEXT_SHADOW_OFFSET, cursorY + READY_TEXT_SHADOW_OFFSET)
    ctx.fillStyle = CFG.visual.colors.ready.text
    ctx.fillText(line, CENTER_X, cursorY)
    cursorY += TEXT_LINE_HEIGHT * TEXT_SCALE
  }
  k.loadSprite(READY_STATIC_SPRITE, canvas)
  canvas.width = 0
  canvas.height = 0
}
//
// Bakes the menu moon onto a transparent full-screen sprite so the ready
// scene can draw it above the star field (same geometry as the menu bg).
//
function buildReadyMoonSprite(k) {
  const canvas = document.createElement('canvas')
  canvas.width = MENU_BG_CANVAS_W
  canvas.height = MENU_BG_CANVAS_H
  const ctx = canvas.getContext('2d')
  drawMenuMoon(ctx)
  k.loadSprite(READY_MOON_SPRITE, canvas)
  canvas.width = 0
  canvas.height = 0
}
//
// Bakes the title as a hollow moon-tone rim over a hollow black drop shadow,
// from the live text string (spaces where letters have detached into
// spiders). Reloading the same sprite name updates the texture Kaplay
// already drew with, so this can be called again every time a letter
// blanks out.
//
// Both the rim and the shadow are built the same way, on their own canvas:
// 8 one-pixel-offset dilated copies of the glyphs, then the original
// (unshifted) glyph shape is punched back out with `destination-out`,
// leaving only a thin ~1px ring with a genuinely transparent interior — the
// shadow must be hollow too, or its solid interior would show through the
// rim's punched-out hole as a solid black fill instead of true transparency.
//
function bakeReadyTitleHollowRing(w, h, text, x, y, color) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.font = `${TITLE_FONT_SIZE}px ${TITLE_FONT_FAMILY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  TITLE_OUTLINE_OFFSETS.forEach(([dx, dy]) => ctx.fillText(text, x + dx, y + dy))
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000000'
  ctx.fillText(text, x, y)
  return canvas
}
//
// Sprite name for a crawling letter's baked hollow-contour glyph.
//
function readyLetterSpriteName(char) {
  return `ready-letter-${char.charCodeAt(0)}`
}
//
// Bakes a single glyph's 2px hollow moon-tone contour, centred in a small
// square canvas — no shadow, since a detached letter is "only a contour"
// from then on. Reloading the same sprite name is harmless when a repeated
// glyph (e.g. the two 'f's) bakes it twice.
//
function bakeReadyLetterSprite(k, char) {
  const ring = bakeReadyTitleHollowRing(
    READY_LETTER_CANVAS_SIZE, READY_LETTER_CANVAS_SIZE, char,
    READY_LETTER_CANVAS_CENTER, READY_LETTER_CANVAS_CENTER, TITLE_OUTLINE_COLOR
  )
  k.loadSprite(readyLetterSpriteName(char), ring)
  ring.width = 0
  ring.height = 0
}
//
// Black hollow shadow twin for a single title glyph.
//
function readyLetterShadowSpriteName(char) {
  return `ready-letter-shadow-${char.charCodeAt(0)}`
}
//
// Soft moon-tone halo for a single title glyph.
//
function readyLetterGlowSpriteName(char) {
  return `ready-letter-glow-${char.charCodeAt(0)}`
}
function bakeReadyLetterGlowSprite(k, char) {
  const canvas = document.createElement('canvas')
  canvas.width = READY_LETTER_CANVAS_SIZE
  canvas.height = READY_LETTER_CANVAS_SIZE
  const ctx = canvas.getContext('2d')
  ctx.font = `${TITLE_FONT_SIZE}px ${TITLE_FONT_FAMILY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = TITLE_OUTLINE_COLOR
  ctx.filter = `blur(${TITLE_GLOW_BLUR}px)`
  for (let i = 0; i < TITLE_GLOW_PASSES; i++) {
    TITLE_OUTLINE_OFFSETS.forEach(([dx, dy]) => ctx.fillText(char, READY_LETTER_CANVAS_CENTER + dx, READY_LETTER_CANVAS_CENTER + dy))
  }
  k.loadSprite(readyLetterGlowSpriteName(char), canvas)
  canvas.width = 0
  canvas.height = 0
}
function bakeReadyLetterShadowSprite(k, char) {
  const ring = bakeReadyTitleHollowRing(
    READY_LETTER_CANVAS_SIZE, READY_LETTER_CANVAS_SIZE, char,
    READY_LETTER_CANVAS_CENTER, READY_LETTER_CANVAS_CENTER, '#000000'
  )
  k.loadSprite(readyLetterShadowSpriteName(char), ring)
  ring.width = 0
  ring.height = 0
}
//
// Pre-computes the star field once per scene enter so the per-frame
// drawer only modulates alpha. Returns an array of star descriptors
// with viewport-pixel positions, so the field follows window resizes
// implicitly via the same pos-recompute path the rest of the scene
// uses (re-entering the scene rebuilds the field).
//
function createStarField(k) {
  const w = k.width()
  const h = k.height()
  const stars = []
  //
  // Moon-zone repulsion: stars whose centre falls within
  // `MENU_BG_MOON_HALO_KEEPOUT + MOON_ZONE_MARGIN` of the moon centre get
  // re-rolled up to a few times. Avoids visual clutter around the moon's halo.
  //
  const moonCx = MENU_BG_MOON_CENTER_X
  const moonCy = MENU_BG_MOON_CENTER_Y
  const moonRadius = MENU_BG_MOON_HALO_KEEPOUT + MOON_ZONE_MARGIN
  const xMin = STAR_AREA_LEFT_RATIO * w
  const xMax = STAR_AREA_RIGHT_RATIO * w
  const yMin = STAR_AREA_TOP_RATIO * h
  const yMax = STAR_AREA_BOTTOM_RATIO * h
  const tryPlace = () => {
    for (let attempt = 0; attempt < 12; attempt++) {
      const x = xMin + Math.random() * (xMax - xMin)
      const y = yMin + Math.random() * (yMax - yMin)
      if (Math.hypot(x - moonCx, y - moonCy) > moonRadius) return { x, y }
    }
    return null
  }
  //
  // Small twinkling dots — the bulk of the field
  //
  for (let i = 0; i < STAR_COUNT_SMALL; i++) {
    const pos = tryPlace()
    if (!pos) continue
    stars.push(buildStar(pos.x, pos.y, false))
  }
  //
  // Larger stars with cross flares — sparse highlights
  //
  for (let i = 0; i < STAR_COUNT_LARGE; i++) {
    const pos = tryPlace()
    if (!pos) continue
    stars.push(buildStar(pos.x, pos.y, true))
  }
  return stars
}
//
// Builds a single star descriptor. Large stars get a wider radius and
// a flag enabling the cross flare; small stars stay as simple dots.
//
function buildStar(x, y, isLarge) {
  const radius = isLarge
    ? STAR_RADIUS_LARGE_MIN + Math.random() * STAR_RADIUS_LARGE_RANGE
    : STAR_RADIUS_SMALL_MIN + Math.random() * STAR_RADIUS_SMALL_RANGE
  const isAmber = Math.random() < STAR_AMBER_RATIO
  return {
    x,
    y,
    radius,
    isLarge,
    r: isAmber ? STAR_AMBER_R : STAR_WHITE_R,
    g: isAmber ? STAR_AMBER_G : STAR_WHITE_G,
    b: isAmber ? STAR_AMBER_B : STAR_WHITE_B,
    baseAlpha: STAR_BASE_ALPHA_MIN + Math.random() * STAR_BASE_ALPHA_RANGE,
    twinkleFreq: STAR_TWINKLE_FREQ_MIN + Math.random() * STAR_TWINKLE_FREQ_RANGE,
    twinklePhase: Math.random() * Math.PI * 2
  }
}
//
// Draws every star with alpha modulated by sin(time * freq + phase).
// Large stars also draw a faint 4-point cross flare at the brightest
// part of their cycle so the field reads as actual stars rather than
// uniformly flickering dots.
//
function drawStarField(k, stars, spiderState) {
  const sceneOp = spiderState?.departureFade ?? 1
  if (sceneOp <= 0.001) return
  const time = k.time()
  for (const star of stars) {
    //
    // Twinkle: sin gives [-1, 1]; remap to [0.25, 1] so even the dim
    // part of the cycle keeps the star visible (avoids strobe-like
    // on/off flicker which reads as broken pixels).
    //
    const cycle = 0.5 * (1 + Math.sin(time * star.twinkleFreq + star.twinklePhase))
    const alpha = star.baseAlpha * (0.25 + 0.75 * cycle)
    const color = k.rgb(star.r, star.g, star.b)
    //
    // Large stars get a wider, brighter dot during the peak of the
    // twinkle cycle (`radius * (1 + 0.6 * cycle)`) instead of an
    // explicit cross flare — keeps the field free of vertical /
    // horizontal lines while still letting big stars feel "bright".
    //
    const radius = star.isLarge ? star.radius * (1 + 0.6 * cycle) : star.radius
    k.drawCircle({
      pos: k.vec2(star.x, star.y),
      radius,
      color,
      opacity: alpha * readySceneDepartureOpacity(spiderState)
    })
  }
}
//
// Moon overlay — drawn above the star field so the disc occludes twinkles.
// Full opacity (not READY_BG_DARKEN_ALPHA) so stars cannot show through the disc.
//
function onDrawMoon(k, spiderState) {
  const op = spiderState?.departureFade ?? 1
  if (op <= 0.001) return
  const over = READY_BG_EDGE_OVERSCAN
  k.drawSprite({
    sprite: READY_MOON_SPRITE,
    pos: k.vec2(-over, -over),
    width: MENU_BG_CANVAS_W + over * 2,
    height: MENU_BG_CANVAS_H + over * 2,
    opacity: op
  })
}
//
// The moon glow is baked into READY_MOON_SPRITE (see buildReadyMoonSprite);
// no extra runtime glow pass is needed.
//
//
// Draws every fixed title letter — its glow, shadow, then rim (heroes are
// drawn on the hero layer).
//
function onDrawTitle(k, spiderState, titleLetters) {
  const flicker = spiderState.titleFlicker ?? 1
  for (const letter of titleLetters) {
    const op = flicker * readyTitleOpacity()
    if (op <= 0.001) continue
    const shadowPos = k.vec2(letter.x + TITLE_SHADOW_OFFSET, letter.y + TITLE_SHADOW_OFFSET)
    const pos = k.vec2(letter.x, letter.y)
    k.drawSprite({
      sprite: readyLetterGlowSpriteName(letter.char),
      pos,
      anchor: 'center',
      width: READY_LETTER_CANVAS_SIZE,
      height: READY_LETTER_CANVAS_SIZE,
      opacity: op * TITLE_GLOW_OPACITY,
      fixed: true
    })
    k.drawSprite({
      sprite: readyLetterShadowSpriteName(letter.char),
      pos: shadowPos,
      anchor: 'center',
      width: READY_LETTER_CANVAS_SIZE,
      height: READY_LETTER_CANVAS_SIZE,
      opacity: op,
      fixed: true
    })
    k.drawSprite({
      sprite: readyLetterSpriteName(letter.char),
      pos,
      anchor: 'center',
      width: READY_LETTER_CANVAS_SIZE,
      height: READY_LETTER_CANVAS_SIZE,
      opacity: op,
      fixed: true
    })
  }
}
//
// Draws the center illustration: eye_big.png centred on the horizon.
//
function onDrawIllustration(k, readyEyeState, spiderState) {
  const eyeOp = LIFE_OPACITY * readyEyeOpacity(spiderState)
  if (eyeOp <= 0.001) return
  const target = resolveReadyEyeLookTarget(readyEyeState?.hero)
  const frameIndex = readyEyeState?.blink?.frameIndex ?? 0
  const tx = target?.x ?? (LIFE_X + LIFE_WIDTH / 2)
  const ty = target?.y ?? (LIFE_Y + LIFE_HEIGHT / 2)
  drawReadySceneEye(k, {
    left: LIFE_X,
    top: LIFE_Y,
    width: LIFE_WIDTH,
    height: LIFE_HEIGHT,
    frameIndex,
    targetX: tx,
    targetY: ty,
    opacity: eyeOp
  })
}
//
// The central eye tracks the hero from the first frame until it is gone.
//
function resolveReadyEyeLookTarget(hero) {
  if (!hero || hero.heroGone) return null
  return { x: hero.heroX, y: hero.heroY }
}
//
// Lone hero state — starts on the ground line right of the eye, watching it.
//
function createReadyHero(k) {
  return {
    heroLegs: createRunLegs(k),
    heroStandLegs: createStandLegs(k),
    heroPhase: 'watch',
    heroX: LIFE_X + LIFE_WIDTH + HERO_WATCH_GAP_X + HERO_CHAR_WIDTH / 2,
    heroY: HERO_N_GROUND_CENTER_Y,
    heroRunFrame: 0,
    heroRunTimer: 0,
    heroBurstDuration: HERO_N_STEP_DURATION * HERO_N_RUN_STEPS_MIN,
    heroFrameTimer: 0,
    heroPauseTimer: 0,
    heroWakeTimer: 0,
    heroGone: false,
    heroDepartStartX: null,
    heroLookLeftDone: false,
    heroLookLeftTimer: 0
  }
}

/**
 * Picks all letters from the title text object and returns position info.
 * @param {Object} k - Kaplay instance
 * @param {Object} titleTextObj - Title text object
 * @param {string} titleString - Title string
 * @param {number} fontSize - Font size
 * @param {string} fontFamily - Font family
 * @returns {Array} Array of letter info objects
 */
function pickLettersFromTitle(k, titleTextObj, titleString, fontSize, fontFamily) {
  const letterInfos = []
  const centers = measureTitleLetterCenters(k, titleTextObj, titleString, fontSize, fontFamily)
  titleString.split('').forEach((char, charIndex) => {
    if (char.trim().length === 0) return
    letterInfos.push({
      char,
      x: centers[charIndex].x,
      y: centers[charIndex].y
    })
  })
  return letterInfos
}
//
// Centres of every title glyph, matching the on-screen k.text layout.
//
function measureTitleLetterCenters(k, titleTextObj, titleString, fontSize, fontFamily) {
  const originY = titleTextObj.pos.y
  const fmt = k.formatText({
    text: titleString,
    size: fontSize,
    font: fontFamily
  })
  const totalW = titleTextObj.width || fmt.width
  const originX = titleTextObj.pos.x - totalW / 2
  const charW = totalW / Math.max(1, titleString.length)
  return titleString.split('').map((_, i) => ({
    x: originX + i * charW + charW / 2,
    y: originY
  }))
}

//
// ────────── Animated overlay helpers (clouds / fireflies / ambient sound) ──────────
//
// Each helper pair (`create…` + `update…` / `draw…`) builds its data
// once on scene enter and then updates/draws it per frame. State stays
// inside the returned field object — no module-level mutation.
//


/**
 * Builds a wandering-firefly field. Each firefly has a 2D position,
 * a velocity that periodically retargets to a new random direction,
 * and a twinkle phase that modulates its alpha. Fireflies stay below
 * the front-layer tree canopy (`FIREFLY_MIN_Y`) so they never fly
 * higher than the visible trees.
 */
function createFireflyField() {
  const fireflies = []
  for (let i = 0; i < FIREFLY_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = FIREFLY_SPEED_MIN + Math.random() * FIREFLY_SPEED_RANGE
    fireflies.push({
      x: FIREFLY_MIN_X + Math.random() * (FIREFLY_MAX_X - FIREFLY_MIN_X),
      y: FIREFLY_MIN_Y + Math.random() * (FIREFLY_MAX_Y - FIREFLY_MIN_Y),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      targetVx: Math.cos(angle) * speed,
      targetVy: Math.sin(angle) * speed,
      speed,
      dirChangeTimer: FIREFLY_DIR_CHANGE_INTERVAL_MIN + Math.random() * FIREFLY_DIR_CHANGE_INTERVAL_RANGE,
      radius: FIREFLY_RADIUS_MIN + Math.random() * FIREFLY_RADIUS_RANGE,
      twinkleFreq: FIREFLY_TWINKLE_FREQ_MIN + Math.random() * FIREFLY_TWINKLE_FREQ_RANGE,
      twinklePhase: Math.random() * Math.PI * 2,
      baseAlpha: FIREFLY_BASE_ALPHA_MIN + Math.random() * FIREFLY_BASE_ALPHA_RANGE
    })
  }
  return { fireflies }
}

function updateFireflyField(k, field) {
  const dt = k.dt()
  for (const fly of field.fireflies) {
    //
    // Retarget direction periodically so the firefly wanders organically.
    //
    fly.dirChangeTimer -= dt
    if (fly.dirChangeTimer <= 0) {
      const angle = Math.random() * Math.PI * 2
      fly.targetVx = Math.cos(angle) * fly.speed
      fly.targetVy = Math.sin(angle) * fly.speed
      fly.dirChangeTimer = FIREFLY_DIR_CHANGE_INTERVAL_MIN + Math.random() * FIREFLY_DIR_CHANGE_INTERVAL_RANGE
    }
    //
    // Smooth velocity toward the target so direction changes feel
    // floaty rather than jerky.
    //
    const lerp = Math.min(1, FIREFLY_TURN_SMOOTHNESS * dt)
    fly.vx += (fly.targetVx - fly.vx) * lerp
    fly.vy += (fly.targetVy - fly.vy) * lerp
    fly.x += fly.vx * dt
    fly.y += fly.vy * dt
    //
    // Bounce off the bounding box (sky band between the tree canopy
    // and the horizon) so fireflies never rise above the trees and
    // never sink below the ground.
    //
    if (fly.x < FIREFLY_MIN_X) { fly.x = FIREFLY_MIN_X; fly.vx = Math.abs(fly.vx); fly.targetVx = Math.abs(fly.targetVx) }
    else if (fly.x > FIREFLY_MAX_X) { fly.x = FIREFLY_MAX_X; fly.vx = -Math.abs(fly.vx); fly.targetVx = -Math.abs(fly.targetVx) }
    if (fly.y < FIREFLY_MIN_Y) { fly.y = FIREFLY_MIN_Y; fly.vy = Math.abs(fly.vy); fly.targetVy = Math.abs(fly.targetVy) }
    else if (fly.y > FIREFLY_MAX_Y) { fly.y = FIREFLY_MAX_Y; fly.vy = -Math.abs(fly.vy); fly.targetVy = -Math.abs(fly.targetVy) }
  }
}

function drawFireflyField(k, field) {
  const time = k.time()
  const color = k.rgb(FIREFLY_COLOR_R, FIREFLY_COLOR_G, FIREFLY_COLOR_B)
  for (const fly of field.fireflies) {
    //
    // Twinkle: cosine wave remapped to [0.25, 1] so the firefly never
    // disappears entirely (avoids strobe-like on/off flicker).
    //
    const cycle = 0.5 * (1 + Math.sin(time * fly.twinkleFreq + fly.twinklePhase))
    const alpha = fly.baseAlpha * (0.25 + 0.75 * cycle)
    //
    // Soft outer glow + bright core — two concentric circles, the
    // outer one wider but faint, the inner one solid.
    //
    k.drawCircle({
      pos: k.vec2(fly.x, fly.y),
      radius: fly.radius * FIREFLY_GLOW_RADIUS_MULT,
      color,
      opacity: alpha * 0.18
    })
    k.drawCircle({
      pos: k.vec2(fly.x, fly.y),
      radius: fly.radius,
      color,
      opacity: alpha
    })
  }
}

//
// Schedules cricket bursts + occasional owl hoots while the ready
// scene is active. Both call into the existing procedural sound
// primitives in `utils/sound.js` so no new audio nodes are introduced.
//
function onUpdateAmbientSounds(k, ambient) {
  const dt = k.dt()
  ambient.cricketTimer -= dt
  if (ambient.cricketTimer <= 0) {
    Sound.playCricketSound(ambient.sound)
    ambient.cricketTimer = CRICKET_INTERVAL_MIN + Math.random() * CRICKET_INTERVAL_RANGE
  }
  ambient.owlTimer -= dt
  if (ambient.owlTimer <= 0) {
    Sound.playOwlSound(ambient.sound)
    ambient.owlTimer = OWL_INTERVAL_MIN + Math.random() * OWL_INTERVAL_RANGE
  }
}
//
// Tracks input stillness (mouse motion + key presses), advances the hero and
// hands the scene over to the menu shortly after it walks off-screen.
//
function updateReadyHero(k, hero, spiderState, state, sound, dt) {
  const mp = k.mousePos()
  const keyActivity = state.keyPulse
  state.keyPulse = false
  if (mp.x !== state.lastMouseX || mp.y !== state.lastMouseY || keyActivity) {
    state.lastMouseX = mp.x
    state.lastMouseY = mp.y
    state.mouseMoved = true
    state.mouseStillTime = 0
  } else {
    state.mouseMoved = false
    state.mouseStillTime += dt
  }
  updateHeroN(k, hero, state, sound, dt)
  if (hero.heroGone) {
    state.heroGoneTime += dt
    if (state.heroGoneTime >= HERO_N_GONE_MENU_DELAY && !state.heroGoneExited) {
      state.heroGoneExited = true
      Sound.stopAmbient(sound)
      goToMenuAfterAssets(k)
    }
  }
  updateReadyDepartureFade(k, hero, spiderState)
}
//
// Fades the backdrop while the hero walks right (title + centre eye stay
// lit). After the look-back beat, eyeFinalFade takes the eye out; the title stays.
//
function updateReadyDepartureFade(k, runner, spiderState) {
  if (!runner || runner.heroDepartStartX == null) {
    spiderState.departureFade = 1
    spiderState.eyeFinalFade = 0
    return
  }
  if (runner.heroGone) {
    spiderState.departureFade = 0
    spiderState.eyeFinalFade = 1
    return
  }
  if (runner.heroPhase === 'finalWalk') {
    spiderState.eyeFinalFade = 1
    spiderState.departureFade = spiderState._departureFadeHold ?? 0
    return
  }
  if (runner.heroPhase === 'lookLeft') {
    spiderState.departureFade = spiderState._departureFadeHold ?? spiderState.departureFade
    const lookT = runner.heroLookLeftTimer / HERO_N_LOOK_LEFT_DURATION
    spiderState.eyeFinalFade = Math.max(0, Math.min(1, lookT))
    return
  }
  //
  // Closed-eyes idle / wake-up: keep the backdrop at whatever fade level the
  // runner had reached — do not pop the scene back to full brightness.
  //
  const holdsDepartureFade =
    runner.heroPhase === 'idle' ||
    runner.heroPhase === 'wakeOneEye' ||
    runner.heroPhase === 'wakeBothEyes'
  if (holdsDepartureFade) {
    spiderState.departureFade = spiderState._departureFadeHold ?? spiderState.departureFade
    spiderState.eyeFinalFade = 0
    return
  }
  const fadesByRunProgress =
    runner.heroPhase === 'run' ||
    runner.heroPhase === 'pause'
  if (!fadesByRunProgress) {
    spiderState.departureFade = 1
    spiderState.eyeFinalFade = 0
    return
  }
  const fadeEndX = k.width() - HERO_N_LOOK_LEFT_TRIGGER_MARGIN
  const span = fadeEndX - runner.heroDepartStartX
  if (span <= 0) return
  const progress = Math.min(1, ((runner.heroX - runner.heroDepartStartX) / span) * 1.65)
  spiderState.departureFade = Math.max(0, Math.min(1, 1 - progress))
  spiderState._departureFadeHold = spiderState.departureFade
  spiderState.eyeFinalFade = 0
}
//
// Backdrop fade while the hero walks right — stars, moon, hint, baked
// bg and description. Fireflies, title and centre eye stay bright (the eye
// leaves on the final beat; fireflies and title never fade).
//
function readySceneDepartureOpacity(spiderState) {
  return spiderState?.departureFade ?? 1
}
//
// The title wordmark stays through the whole scene — only the centre eye
// leaves after the hero turns back (lookLeft).
//
function readyTitleOpacity() {
  return 1
}
//
// Centre eye: full opacity during the walk, then the eyeFinalFade ramp.
//
function readyEyeOpacity(spiderState) {
  const fade = spiderState?.eyeFinalFade ?? 0
  return Math.max(0, 1 - fade)
}
//
// Hero departure state machine: watch the eye → run bursts / pauses, with
// an interruptible closed-eyes idle whenever the mouse moves while walking,
// then a look-left beat at the right margin and a final walk off-screen.
//
function updateHeroN(k, spider, state, sound, dt) {
  if (spider.heroGone) return
  if (spider.heroPhase === 'watch') {
    state.mouseStillTime >= HERO_N_MOUSE_STILL_DELAY && startHeroNBurst(spider)
    return
  }
  //
  // Ground phases — mouse movement freezes the hero unless the ending beat
  // (look left at the centre eye, then final walk) has already started.
  //
  const endingStarted = spider.heroPhase === 'lookLeft' || spider.heroPhase === 'finalWalk'
  !endingStarted && state.mouseMoved && (spider.heroPhase = 'idle')
  if (spider.heroPhase === 'idle') {
    //
    // After the mouse rests long enough the hero wakes up gradually: one eye
    // first, glancing around, before committing to the run.
    //
    if (state.mouseStillTime >= HERO_N_MOUSE_STILL_DELAY) {
      spider.heroPhase = 'wakeOneEye'
      spider.heroWakeTimer = 0
    }
    return
  }
  if (spider.heroPhase === 'wakeOneEye') {
    spider.heroWakeTimer += dt
    if (spider.heroWakeTimer >= HERO_N_WAKE_ONE_EYE_DURATION) {
      spider.heroPhase = 'wakeBothEyes'
      spider.heroWakeTimer = 0
    }
    return
  }
  if (spider.heroPhase === 'wakeBothEyes') {
    spider.heroWakeTimer += dt
    spider.heroWakeTimer >= HERO_N_WAKE_BOTH_EYES_DURATION && startHeroNBurst(spider)
    return
  }
  if (spider.heroPhase === 'run') {
    spider.heroRunTimer += dt
    spider.heroX += HERO_N_RUN_SPEED * dt
    //
    // Cycle the run animation frames while the burst lasts.
    //
    spider.heroFrameTimer += dt
    if (spider.heroFrameTimer >= HERO_N_RUN_FRAME_TIME) {
      spider.heroFrameTimer = 0
      spider.heroRunFrame = (spider.heroRunFrame + 1) % HERO_N_RUN_FRAME_COUNT
      //
      // Two foot contacts per 8-frame cycle, same as the in-game hero.
      //
      spider.heroRunFrame % (HERO_N_RUN_FRAME_COUNT / 2) === 0 &&
        Sound.playStepSound(sound, HERO_N_STEP_SOUND_LEVEL)
    }
    const lookLeftX = k.width() - HERO_N_LOOK_LEFT_TRIGGER_MARGIN
    if (!spider.heroLookLeftDone && spider.heroX >= lookLeftX) {
      spider.heroPhase = 'lookLeft'
      spider.heroLookLeftDone = true
      spider.heroLookLeftTimer = 0
      spider.heroX = lookLeftX
      return
    }
    if (spider.heroRunTimer >= spider.heroBurstDuration) {
      spider.heroPhase = 'pause'
      spider.heroPauseTimer = 0
    }
    return
  }
  if (spider.heroPhase === 'pause') {
    spider.heroPauseTimer += dt
    spider.heroPauseTimer >= HERO_N_RUN_PAUSE && startHeroNBurst(spider)
    return
  }
  if (spider.heroPhase === 'lookLeft') {
    spider.heroLookLeftTimer += dt
    spider.heroLookLeftTimer >= HERO_N_LOOK_LEFT_DURATION && startHeroNFinalWalk(spider)
    return
  }
  if (spider.heroPhase === 'finalWalk') {
    spider.heroX += HERO_N_RUN_SPEED * dt
    spider.heroFrameTimer += dt
    if (spider.heroFrameTimer >= HERO_N_RUN_FRAME_TIME) {
      spider.heroFrameTimer = 0
      spider.heroRunFrame = (spider.heroRunFrame + 1) % HERO_N_RUN_FRAME_COUNT
      spider.heroRunFrame % (HERO_N_RUN_FRAME_COUNT / 2) === 0 &&
        Sound.playStepSound(sound, HERO_N_STEP_SOUND_LEVEL)
    }
    spider.heroX >= k.width() + HERO_N_SPRITE_SIZE * 0.5 && (spider.heroGone = true)
    return
  }
}
//
// Turns back right and walks the last span off-screen (eye fades on this leg).
//
function startHeroNFinalWalk(spider) {
  spider.heroPhase = 'finalWalk'
  spider.heroFrameTimer = 0
  spider.heroRunFrame = 0
}
//
// Resets the burst timers and switches the runner into the running phase.
// Every burst rolls its own length — a random 4–8 steps — so no two runs
// match. Also used to resume running after each pause.
//
function startHeroNBurst(spider) {
  if (spider.heroDepartStartX == null) {
    spider.heroDepartStartX = spider.heroX
  }
  spider.heroPhase = 'run'
  spider.heroRunTimer = 0
  spider.heroFrameTimer = 0
  spider.heroRunFrame = 0
  spider.heroBurstDuration = HERO_N_STEP_DURATION * (HERO_N_RUN_STEPS_MIN + Math.floor(Math.random() * HERO_N_RUN_STEPS_RANGE))
}
//
// Draws the lone hero on live legs: running, else its baked idle frame for
// the current phase (eyes and all) standing on them.
//
function drawTitleHero(k, spider) {
  if (spider.heroGone) return
  //
  // Scaled round the point under his feet, so he stays on the ground.
  //
  const footY = spider.heroY + HERO_FEET_OFFSET_Y
  k.pushTransform()
  k.pushTranslate(k.vec2(spider.heroX, footY))
  k.pushScale(k.vec2(HERO_DRAW_SCALE, HERO_DRAW_SCALE))
  k.pushTranslate(k.vec2(-spider.heroX, -footY))
  drawTitleHeroPose(k, spider)
  k.popTransform()
}
function drawTitleHeroPose(k, spider) {
  const phase = spider.heroPhase
  if (phase === 'run' || phase === 'finalWalk' || phase === 'lookLeft') {
    drawTitleRunner(k, spider)
    return
  }
  drawStandingHero(k, spider.heroStandLegs, {
    x: spider.heroX,
    y: spider.heroY,
    sprite: heroFrameName(spider),
    groundY: spider.heroY + HERO_FEET_OFFSET_Y
  })
}
//
// The running hero on its live legs: the gait follows the burst's frame
// clock smoothly; facing left it holds one mid-stride pose (both legs
// clearly apart).
//
function drawTitleRunner(k, spider) {
  const lookLeft = spider.heroPhase === 'lookLeft'
  const frame = lookLeft ? HERO_N_LOOK_LEFT_RUN_FRAME : spider.heroRunFrame + spider.heroFrameTimer / HERO_N_RUN_FRAME_TIME
  drawRunningHero(k, spider.heroLegs, {
    x: spider.heroX,
    y: spider.heroY,
    facing: lookLeft ? -1 : 1,
    phase: frame / HERO_N_RUN_FRAME_COUNT,
    groundY: spider.heroY + HERO_FEET_OFFSET_Y
  })
}
//
// Standing sprite for the current phase: shut eyes while idling, one eye
// open glancing left and right while waking, pupils on the centre eye while
// watching it, and straight ahead while pausing.
//
function heroFrameName(spider) {
  const P = HERO_SPRITE_PREFIX
  const phase = spider.heroPhase
  if (phase === 'idle' || phase === 'wakeBothEyes') return `${P}_closed`
  if (phase === 'wakeOneEye') return heroWinkSpriteName(P, Math.sin(spider.heroWakeTimer * HERO_N_WAKE_PUPIL_FREQ * Math.PI * 2))
  if (phase === 'watch') return heroWatchSpriteName(spider)
  return `${P}_0_0`
}
//
// Pupils turned toward the centre eye while the hero waits beside it.
//
function heroWatchSpriteName(spider) {
  const dx = LIFE_X + LIFE_WIDTH / 2 - spider.heroX
  const dy = LIFE_Y + LIFE_HEIGHT / 2 - (spider.heroY - HERO_N_SPRITE_SIZE / 2 + HERO_EYE_CANVAS_Y)
  const len = Math.hypot(dx, dy) || 1
  return heroLookSpriteName(HERO_SPRITE_PREFIX, dx / len, dy / len)
}
