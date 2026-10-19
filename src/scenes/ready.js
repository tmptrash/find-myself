import { CFG } from '../cfg.js'
import { parseHex, bindStartGameKeys } from '../utils/helper.js'
import * as TouchInput from '../utils/touch-input.js'
import * as CanvasBackdrop from '../utils/canvas-backdrop.js'
import { addBackground } from '../sections/word/utils/scene.js'
import * as Sound from '../utils/sound.js'
import * as Cursor from '../utils/cursor.js'
import { goToMenuAfterAssets } from '../utils/lesson-assets.js'
import { loadHeroSprites, HEROES, IDLE_MELODY, IDLE_MELODY_BEAT, IDLE_MELODY_GAP, IDLE_MELODY_SUSTAIN, buildHeroSpritePrefix } from '../components/hero.js'
import { renderHintWithEnter } from '../utils/touch-tap-button.js'
import {
  generateMenuBackgroundCanvas,
  recomputeMenuBgLayout,
  drawMenuMoon,
  MENU_BG_GROUND_Y,
  MENU_BG_HORIZON_LINE_HEIGHT,
  MENU_BG_CANVAS_W,
  MENU_BG_CANVAS_H,
  MENU_BG_MOON_CENTER_X,
  MENU_BG_MOON_CENTER_Y,
  MENU_BG_MOON_HALO_KEEPOUT,
  MENU_BG_FRONT_LEAF_RGB
} from '../utils/menu-bg-generator.js'
import * as Grass from '../components/grass.js'
import { drawGlowFilmGrainWorldPatch } from '../sections/glow/utils/glow-parallax-grain.js'
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
// Fixed pixel margin from the bottom edge (matches the moon's fixed-margin
// corner anchoring) so the hint sits the same distance off the bottom at
// any resolution. Recomputed by recomputeReadyLayout() from the live
// k.height() — every `let` below this comment is resolution-derived and
// updated the same way, mirroring Glow's recomputeGlowScreenLayout pattern.
//
const HINT_BOTTOM_MARGIN = 35
let HINT_Y = CFG.visual.screen.height - HINT_BOTTOM_MARGIN
//
// Crawling letter title — centred at the very top of the canvas,
// well above the central monster illustration.
//
const INSTRUCTIONS_TITLE = 'rootward'
const TITLE_FONT_FAMILY = "'JetBrains Mono', monospace"
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
const TITLE_FLICKER_MIN = 0.7
const TITLE_FLICKER_MAX = 1.0
//
// Layout z-layers. Background pieces (clouds, stars, fireflies,
// grass) stack between the baked menu-bg sprite and the foreground
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
//
// Grass renders ABOVE the spider/hero layer, so the hero-n running right
// along the horizon passes BEHIND the blades before leaving the screen.
//
const Z_GRASS = Z_SPIDER + 5
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
const FIREFLY_COUNT = 14
//
// Design-reference top of the sky band (front-tree canopy). Kept as a ratio
// of the reference screen height so it scales with GROUND_Y the same way at
// any resolution instead of clipping the firefly band on shorter windows.
//
const FIREFLY_MIN_Y_RATIO = 450 / CFG.visual.screen.height
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
// Grass is excluded from the central horizontal band where the
// monster illustration stands (matches the keep-out used by rocks /
// mushrooms in `menu-bg-generator.js`). The field itself is the shared
// Grass component (same tufts as the glow level) tinted glow-grass green.
//
const GRASS_CENTER_KEEPOUT_HALF = 400
const GRASS_TUFT_COUNT = 44
const GRASS_EDGE_INSET = 30
//
// Density gradient: the further from the screen centre, the more grass. The
// weight ramps from 0 at the keep-out edge to 1 at the very screen edge, so
// the probability keeps growing across the whole strip instead of
// saturating partway out. Computed from the live canvas width inside
// recomputeReadyLayout() rather than frozen at import time.
//
let GRASS_DENSITY_RAMP = MENU_BG_CANVAS_W / 2 - GRASS_CENTER_KEEPOUT_HALF - GRASS_EDGE_INSET
//
// The blades take the SAME tone as the near-row glow-forest foliage: the
// palette tree-leaf green pushed toward the warm haze by the combined
// near-row blend of the glow level (0.3 base + 0.3 leaf-only ⇒ 0.51 total).
//
//
// Grass matches the warm yellow-orange foliage of the front-row side trees,
// at half brightness so it doesn't overpower the night scene
//
const GRASS_TINT = {
  r: Math.round(MENU_BG_FRONT_LEAF_RGB.r / 2),
  g: Math.round(MENU_BG_FRONT_LEAF_RGB.g / 2),
  b: Math.round(MENU_BG_FRONT_LEAF_RGB.b / 2)
}
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
// Hero offset preserved from the original layout (hero stood ~83 px
// left of the monster centre) so the hero still reads as standing in
// front of the monster's mouth, just now centred on the canvas.
//
const HERO_OFFSET_FROM_LIFE_CENTER_X = -260
const HERO_X = Math.round(LIFE_X + LIFE_WIDTH / 2 + HERO_OFFSET_FROM_LIFE_CENTER_X)
//
// The hero sprite canvas (96×96) has ~12 px of empty padding below
// the legs, so when the sprite is drawn with its BOTTOM at HERO_Y the
// visible feet end above HERO_Y at the illustration display scale.
// Push HERO_Y down by that padding so the hero's actual feet land
// ON the black horizon strip rather than floating above it.
//
const HERO_FEET_PADDING = 17
const HERO_Y = MENU_BG_GROUND_Y + HERO_FEET_PADDING
//
// Central illustration hero render size — matches the menu scene's
// native SPRITE_SIZE (96 px) so the hero in front of the monster
// reads at the same scale as the section anti-heroes orbiting the
// menu. Distinct from the tiny two-heroes icon below the description.
//
const HERO_ILLUSTRATION_SPRITE_SIZE = 96
//
// Hero sprite names (loaded in index.js at game start).
// HERO_ILLUSTRATION_SPRITE_NAME uses eyes right-up (1, -1).
//
//
// Hero in the ready scene now takes the touch section's identity steel
// teal (`#5A8898`) — the cool half of the silver/teal complementary
// pair and the same colour the anti-hero (and touch-completed hero)
// wear throughout every touch level. Keeps the on-boarding hero in
// chromatic agreement with the very first section the player enters.
//
const HERO_READY_BODY_COLOR = '#5A8898'
//
// The CENTRAL hero illustration uses a richer sprite variant that
// adds a mouth, two visible arms and a wrist watch on top of the
// plain hero body.
//
const HERO_ILLUSTRATION_SPRITE_PREFIX = 'hero_5A8898_000000_mouth_arms_watch'
//
// Anti-hero color in the duality icon is the warm complement of the
// hero's steel teal — a vibrant orange that, paired with the teal
// hero on the same row, visualises the "you vs shadow self" duality
// through a textbook complementary colour pair.
//
const ANTIHERO_READY_BODY_COLOR = '#E07020'
//
// Lone hero rendered at its native 96px bake resolution (1:1 pixel scale).
// It stands on the ground line just right of the centre eye, in one fixed
// body colour for the whole scene (no section-colour reveal).
//
const HERO_N_SPRITE_SIZE = 96
const HERO_WATCH_GAP_X = 40
const HERO_BODY_COLOR = CFG.visual.colors.palette.heroBodyGray
const HERO_BAKE_OPTS = {
  type: HEROES.HERO,
  bodyColor: HERO_BODY_COLOR,
  outlineColor: CFG.visual.colors.outline,
  noEyes: true
}
const HERO_N_SPRITE_PREFIX = buildHeroSpritePrefix(HERO_BAKE_OPTS)
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
// branch as an actual ground step in the glow level — no real scene change,
// just routing into the same procedural ground-footstep sound.
//
const HERO_N_STEP_SOUND_LEVEL = 'lesson-glow.0'
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
// Geometry of the hero's eyes inside the 96 px sprite canvas (mirrors the
// head/eye constants in components/hero.js), scaled to the 80 px title-hero
// display size. Used to overlay a single open eye on the closed-eyes sprite
// during the wake-up sequence.
//
const HERO_SPRITE_CANVAS_SIZE = 96
const HERO_N_SPRITE_SCALE = HERO_N_SPRITE_SIZE / HERO_SPRITE_CANVAS_SIZE
const HERO_HEAD_X = 33
const HERO_HEAD_Y = 18
const HERO_EYE_LEFT_X = HERO_HEAD_X + 9
const HERO_EYE_RIGHT_X = HERO_HEAD_X + 21
const HERO_EYE_CANVAS_Y = HERO_HEAD_Y + 9
const HERO_EYE_RING_RADIUS = 5
const HERO_EYE_WHITE_RADIUS = 4
const HERO_EYE_PUPIL_RADIUS = 2
const HERO_EYE_PUPIL_SHIFT = 2
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
// Idle notes for hero-n while he waits with closed eyes — the same melody
// the in-game hero hums, with rising note glyphs above his head. Values
// mirror the IDLE_NOTE_* constants in components/hero.js (mouth offset
// scaled to the 80 px title-hero size).
//
const HERO_N_NOTE_GLYPHS = ['♪', '♫', '♩', '♬']
const HERO_N_NOTE_LIFETIME = 2.2
const HERO_N_NOTE_RISE_SPEED = 28
const HERO_N_NOTE_DRIFT_AMPLITUDE = 16
const HERO_N_NOTE_DRIFT_FREQ = 1.4
const HERO_N_NOTE_FONT_SIZE = 22
const HERO_N_NOTE_OFFSET_Y = -23
//
// Notes emerge to the LEFT of the head so the stream never covers the face.
//
const HERO_N_NOTE_OFFSET_X = -14
const HERO_N_VOCAL_DELAY = 2.0
//
// Mouth notes + idle hum stay off through the word section (see menu hero too).
//
const HERO_N_IDLE_VOCAL_ENABLED = false
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
// centred between the horizon line and the bottom hint. The last line
// has two icons embedded inline between its words.
//
//
// New description: 5 lines of narrative text, no icons
//
const READY_DESC_LINES = [
  'At the beginning, I move without',
  'seeing. The journey begins when',
  'I learn to look...'
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
//
// Narrative body copy — cool teal-gray (ready.text) on the deep teal frame.
//
/**
 * Recomputes every resolution-derived ready-scene layout value from the
 * live kaplay viewport. Must run before recomputeMenuBgLayout()'s exports
 * are read, and before any of the sprite baking / field creation calls
 * below it — mirrors Glow's recomputeGlowScreenLayout() pattern, since
 * "ready" now shares the native-resolution engine with menu/Glow/touch
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
  GRASS_DENSITY_RAMP = MENU_BG_CANVAS_W / 2 - GRASS_CENTER_KEEPOUT_HALF - GRASS_EDGE_INSET
  LIFE_X = Math.round(MENU_BG_CANVAS_W / 2 - LIFE_WIDTH / 2)
  LIFE_Y = MENU_BG_GROUND_Y - LIFE_HEIGHT + LIFE_Y_SINK - READY_EYE_RAISE_PX
  HERO_N_GROUND_CENTER_Y = MENU_BG_GROUND_Y + HERO_FEET_PADDING - HERO_N_SPRITE_SIZE / 2 - HERO_N_GROUND_LIFT_PX
  CENTER_X = Math.round(MENU_BG_CANVAS_W / 2)
  TITLE_TEXT_X = CENTER_X
  AVAILABLE_H = HINT_Y - MENU_BG_GROUND_Y
  DESCRIPTION_START_Y = Math.round(MENU_BG_GROUND_Y + (AVAILABLE_H - BLOCK_HEIGHT) / 2) + 20
}

export function sceneReady(k) {
  k.scene('ready', async () => {
    //
    // Ready now shares the native-resolution engine with menu, Glow and
    // touch lesson 0 — recompute the whole baked-background + layout state
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
    // Hero illustration is steel teal (cool half of the complementary
    // pair); the anti-hero in the duality icon below is vibrant orange
    // (warm half). Loading both up-front guarantees the icon row has
    // its complementary sprite ready before draw.
    //
    //
    // Plain hero variant — used by the small "two heroes" icon below
    // the description. Keeps the icon readable at small sizes.
    //
    loadHeroSprites(k, HEROES.HERO, HERO_READY_BODY_COLOR, null, false, false, false)
    //
    // Eyeless body bake for the lone hero — eyes are drawn on top so they
    // can look at the centre eye, close while idle and follow the walk.
    //
    loadHeroSprites({ k, ...HERO_BAKE_OPTS })
    //
    // Richer hero variant for the CENTRAL illustration — adds mouth,
    // both arms and a wrist watch on top of the plain body. Loaded
    // alongside the plain variant so both sprites coexist; the
    // illustration draw selects this one via the `_mouth_arms_watch`
    // prefix suffix.
    //
    loadHeroSprites(k, HEROES.HERO, HERO_READY_BODY_COLOR, null, true, true, true)
    loadHeroSprites(k, HEROES.ANTIHERO, ANTIHERO_READY_BODY_COLOR, null, false, false, false)
    CanvasBackdrop.applyCanvasBackdrop(k, CFG.visual.colors.ready.background)
    k.onSceneLeave(() => CanvasBackdrop.clearCanvasBackdrop(k))
    k.get("word-pile-text").forEach(obj => obj.destroy())
    k.get("word-pile-outline").forEach(obj => obj.destroy())
    k.get("flying-word").forEach(obj => obj.destroy())
    k.flyingWordsInstance = null
    Cursor.setVisible(false)
    k.onSceneLeave(() => Cursor.setVisible(true))
    const centerX = k.width() / 2
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    const spiderState = {
      timer: 0,
      titleFlicker: 1,
      departureFade: 1,
      eyeFinalFade: 0
    }
    const bgPlane = addBackground(k, CFG.visual.colors.ready.background)
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
    // Swaying grass tufts along the horizon strip — the shared Grass
    // component (the same baked blades as the glow level), skipping the
    // central keep-out band around the monster illustration. The density
    // weight grows with the distance from the centre, so the field thickens
    // towards the screen edges.
    //
    Grass.create({
      k,
      floorY: MENU_BG_GROUND_Y + MENU_BG_HORIZON_LINE_HEIGHT,
      left: GRASS_EDGE_INSET,
      right: MENU_BG_CANVAS_W - GRASS_EDGE_INSET,
      tuftCount: GRASS_TUFT_COUNT,
      z: Z_GRASS,
      excluded: (x) => Math.abs(x - CENTER_X) <= GRASS_CENTER_KEEPOUT_HALF,
      density: (x) => Math.min(1, (Math.abs(x - CENTER_X) - GRASS_CENTER_KEEPOUT_HALF) / GRASS_DENSITY_RAMP),
      getTint: (blade) => ({
        ...GRASS_TINT,
        opacity: readySceneDepartureOpacity(spiderState)
      })
    })
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
    // Hint text — desktop renders the full line; touch devices keep the same
    // surrounding text and replace the "Enter" word with a tappable button.
    //
    const hintRgb = parseHex(CFG.visual.colors.ready.hint)
    const hint = renderHintWithEnter({
      k,
      centerX,
      y: HINT_Y,
      prefix: 'press Space, ',
      suffix: ' or click to start',
      fontSize: HINT_FONT_SIZE,
      color: hintRgb,
      z: Z_HINT,
      onTap: () => exitToMenu()
    })
    //
    // Title letter layout — every glyph is a static baked letter.
    //
    const titleLetters = pickLettersFromTitle(k, titleText, INSTRUCTIONS_TITLE, TITLE_FONT_SIZE, TITLE_FONT_FAMILY)
    titleLetters.forEach(li => {
      bakeReadyLetterSprite(k, li.char)
      bakeReadyLetterShadowSprite(k, li.char)
    })
    const hero = createReadyHero()
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
    // Glow film grain — same look as lesson-glow.0, drawn over the whole scene.
    //
    k.add([
      k.fixed(),
      k.z(Z_FILM_GRAIN),
      {
        draw() {
          const op = spiderState.departureFade ?? 1
          if (op <= 0.001) return
          drawGlowFilmGrainWorldPatch(k, 0, 0, k.width(), k.height(), 0.14 * op)
        }
      }
    ])
    //
    // Controls
    //
    const exitToMenu = () => {
      Sound.stopAmbient(sound)
      goToMenuAfterAssets(k)
    }
    const startGameInputCancel = bindStartGameKeys(k, () => exitToMenu())
    k.onMousePress(exitToMenu)
    k.onSceneLeave(() => startGameInputCancel.cancel())
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
  ctx.font = `${TEXT_FONT_SIZE}px 'JetBrains Mono Thin', 'JetBrains Mono', monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let cursorY = DESCRIPTION_START_Y + 40
  for (const line of READY_DESC_LINES) {
    ctx.fillStyle = '#000000'
    ctx.fillText(line, CENTER_X + READY_TEXT_SHADOW_OFFSET, cursorY + READY_TEXT_SHADOW_OFFSET)
    ctx.fillStyle = CFG.visual.colors.ready.text
    ctx.fillText(line, CENTER_X, cursorY)
    cursorY += TEXT_LINE_HEIGHT
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
// Draws every fixed title letter (heroes are drawn on the hero layer).
//
function onDrawTitle(k, spiderState, titleLetters) {
  const flicker = spiderState.titleFlicker ?? 1
  for (const letter of titleLetters) {
    const op = flicker * readyTitleOpacity()
    if (op <= 0.001) continue
    const shadowPos = k.vec2(letter.x + TITLE_SHADOW_OFFSET, letter.y + TITLE_SHADOW_OFFSET)
    const pos = k.vec2(letter.x, letter.y)
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
function createReadyHero() {
  return {
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
    heroNotes: [],
    heroNoteTimer: 0,
    heroMelodyIndex: 0,
    heroIdleTime: 0,
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
// ────────── Animated overlay helpers (clouds / fireflies / grass / ambient sound) ──────────
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
  HERO_N_IDLE_VOCAL_ENABLED && updateHeroNNotes(hero, sound, dt)
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
// Backdrop fade while the hero walks right — stars, moon, grass, hint, baked
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
// Idle singing for hero-n: while he stands with closed eyes the same melody
// the in-game hero hums plays note by note, each pitch paired with a rising
// glyph above his head. Interruptions restart the melody from the top.
//
function updateHeroNNotes(spider, sound, dt) {
  if (!HERO_N_IDLE_VOCAL_ENABLED) return
  //
  // Age + drift existing notes so they fade out naturally in any phase.
  //
  for (const note of spider.heroNotes) {
    note.age += dt
    note.x = note.baseX + Math.sin((note.age + note.driftPhase) * HERO_N_NOTE_DRIFT_FREQ * Math.PI * 2) * HERO_N_NOTE_DRIFT_AMPLITUDE * (note.age / HERO_N_NOTE_LIFETIME)
    note.y -= HERO_N_NOTE_RISE_SPEED * dt
  }
  spider.heroNotes = spider.heroNotes.filter(n => n.age < HERO_N_NOTE_LIFETIME)
  if (spider.heroPhase !== 'idle' || spider.heroGone) {
    spider.heroIdleTime = 0
    spider.heroMelodyIndex = 0
    spider.heroNoteTimer = 0
    return
  }
  //
  // Only sing after a short warm-up, like the in-game hero.
  //
  spider.heroIdleTime += dt
  if (spider.heroIdleTime < HERO_N_VOCAL_DELAY) return
  spider.heroNoteTimer -= dt
  if (spider.heroNoteTimer > 0) return
  const [frequency, beats] = IDLE_MELODY[spider.heroMelodyIndex % IDLE_MELODY.length]
  spider.heroNotes.push({
    baseX: spider.heroX + HERO_N_NOTE_OFFSET_X,
    x: spider.heroX + HERO_N_NOTE_OFFSET_X,
    y: spider.heroY + HERO_N_NOTE_OFFSET_Y,
    age: 0,
    driftPhase: Math.random(),
    glyph: HERO_N_NOTE_GLYPHS[Math.floor(Math.random() * HERO_N_NOTE_GLYPHS.length)]
  })
  Sound.playIdleHumNote(sound, {
    frequency,
    duration: beats * IDLE_MELODY_BEAT * IDLE_MELODY_SUSTAIN,
    whistleMode: true
  })
  spider.heroNoteTimer = beats * IDLE_MELODY_BEAT + IDLE_MELODY_GAP
  spider.heroMelodyIndex = (spider.heroMelodyIndex + 1) % IDLE_MELODY.length
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
// Draws the lone hero: eyeless body bake plus overlaid eyes that watch the
// centre eye, close while idle and follow the walk direction.
//
function drawTitleHero(k, spider) {
  if (spider.heroGone) return
  const cx = spider.heroX
  const cy = spider.heroY
  k.drawSprite({
    sprite: `${HERO_N_SPRITE_PREFIX}${resolveHeroFrameSuffix(spider)}`,
    pos: k.vec2(cx - HERO_N_SPRITE_SIZE / 2, cy - HERO_N_SPRITE_SIZE / 2),
    width: HERO_N_SPRITE_SIZE,
    height: HERO_N_SPRITE_SIZE,
    flipX: spider.heroPhase === 'lookLeft'
  })
  const closedIdleFace =
    spider.heroPhase === 'idle' || spider.heroPhase === 'wakeBothEyes'
  if (spider.heroPhase === 'wakeOneEye') {
    drawHeroTitleSingleClosedEye(k, cx, cy, HERO_EYE_LEFT_X)
    drawHeroWakeEye(k, spider, cx, cy)
  }
  closedIdleFace && drawHeroTitleClosedEyeContours(k, spider, cx, cy)
  !closedIdleFace && drawHeroTitleFilledEyes(k, spider, cx, cy)
  drawHeroNNotes(k, spider)
}
//
// Matches hero.js run-lean side-eye anchor in 96px sprite space.
//
const HERO_CANVAS_HEAD_X = 33
const HERO_CANVAS_HEAD_Y = 18
const HERO_CANVAS_BODY_BOTTOM = HERO_CANVAS_HEAD_Y + 24 + 24
const HERO_RUN_LEAN_RAD = 0.2
const HERO_CHAR_WIDTH = 30
const HERO_PUPIL_SIDE_SHIFT = 2
const HERO_RUN_BODY_BOB = 4
//
// Vertical bob baked into each run frame (matches hero.js createFrame run bob).
//
function readyHeroRunFrameBobPx(frame) {
  const phase = frame / HERO_N_RUN_FRAME_COUNT
  return Math.round((1 - Math.abs(Math.sin(phase * Math.PI * 2))) * HERO_RUN_BODY_BOB)
}
//
// Side-view eye position for the title runner's run frames (mirrored when facing left).
//
function readyHeroSideEyeCanvasPos(facingLeft, runFrame = 0) {
  const headX = HERO_CANVAS_HEAD_X
  const headY = HERO_CANVAS_HEAD_Y + readyHeroRunFrameBobPx(runFrame)
  const localX = headX + 21
  const localY = headY + 9
  const pivotX = headX + HERO_CHAR_WIDTH / 2
  const dx = localX - pivotX
  const dy = localY - HERO_CANVAS_BODY_BOTTOM
  const cos = Math.cos(HERO_RUN_LEAN_RAD)
  const sin = Math.sin(HERO_RUN_LEAN_RAD)
  let x = pivotX + dx * cos - dy * sin
  const y = HERO_CANVAS_BODY_BOTTOM + dx * sin + dy * cos
  if (facingLeft) {
    const center = HERO_SPRITE_CANVAS_SIZE / 2
    x = 2 * center - x
  }
  return { x, y }
}
//
// One white/black eye disc for the filled title runner (body is noEyes bake).
//
function drawHeroTitleEyeDisc(k, ex, ey, pupilDx, pupilDy, scale, opacity) {
  k.drawCircle({
    pos: k.vec2(ex, ey),
    radius: HERO_EYE_RING_RADIUS * scale,
        color: k.rgb(0, 0, 0),
    opacity
  })
  k.drawCircle({
    pos: k.vec2(ex, ey),
    radius: HERO_EYE_WHITE_RADIUS * scale,
    color: k.rgb(255, 255, 255),
    opacity
  })
  k.drawCircle({
    pos: k.vec2(ex + pupilDx, ey + pupilDy),
    radius: HERO_EYE_PUPIL_RADIUS * scale,
    color: k.rgb(0, 0, 0),
    opacity
  })
}
//
// Runner eyes — side profile while moving, front pair while paused idle.
//
function drawHeroTitleFilledEyes(k, spider, cx, cy, departureFade = 1) {
  if (departureFade <= 0.001) return
  if (spider.heroPhase === 'wakeOneEye') return
  const s = HERO_N_SPRITE_SCALE
  const baseX = cx - HERO_N_SPRITE_SIZE / 2
  const baseY = cy - HERO_N_SPRITE_SIZE / 2
  const facingLeft = spider.heroPhase === 'lookLeft'
  const sideView =
    spider.heroPhase === 'run' ||
    spider.heroPhase === 'finalWalk' ||
    spider.heroPhase === 'lookLeft'
  if (sideView) {
    const { x, y } = readyHeroSideEyeCanvasPos(facingLeft, spider.heroRunFrame ?? 0)
    const pupilDx = (facingLeft ? -HERO_PUPIL_SIDE_SHIFT : HERO_PUPIL_SIDE_SHIFT) * s
    drawHeroTitleEyeDisc(
      k,
      baseX + x * s,
      baseY + y * s,
      pupilDx,
      0,
      s,
      departureFade
    )
    return
  }
  if (spider.heroPhase === 'watch') {
    drawHeroWatchEyes(k, baseX, baseY, s, departureFade)
    return
  }
  if (spider.heroPhase !== 'pause') return
  const eyeY = baseY + HERO_EYE_CANVAS_Y * s
  for (const eyeX of [HERO_EYE_LEFT_X, HERO_EYE_RIGHT_X]) {
    drawHeroTitleEyeDisc(k, baseX + eyeX * s, eyeY, 0, 0, s, departureFade)
  }
}
//
// Front eye pair with both pupils turned toward the centre eye while the
// hero waits beside it.
//
function drawHeroWatchEyes(k, baseX, baseY, scale, opacity) {
  const eyeY = baseY + HERO_EYE_CANVAS_Y * scale
  const dx = LIFE_X + LIFE_WIDTH / 2 - (baseX + HERO_SPRITE_CANVAS_SIZE * scale / 2)
  const dy = LIFE_Y + LIFE_HEIGHT / 2 - eyeY
  const len = Math.hypot(dx, dy) || 1
  const shift = HERO_EYE_PUPIL_SHIFT * scale
  for (const eyeX of [HERO_EYE_LEFT_X, HERO_EYE_RIGHT_X]) {
    drawHeroTitleEyeDisc(k, baseX + eyeX * scale, eyeY, dx / len * shift, dy / len * shift, scale, opacity)
  }
}
//
// Closed-eye rings while the runner idles and hums (noEyes body bake).
//
function drawHeroTitleClosedEyeContours(k, spider, cx, cy, departureFade = 1) {
  if (departureFade <= 0.001) return
  const phase = spider.heroPhase
  if (phase !== 'idle' && phase !== 'wakeBothEyes') return
  drawHeroTitleSingleClosedEye(k, cx, cy, HERO_EYE_LEFT_X, departureFade)
  drawHeroTitleSingleClosedEye(k, cx, cy, HERO_EYE_RIGHT_X, departureFade)
}
//
// One closed eye — black ring filled with the body colour (eyelid).
//
function drawHeroTitleSingleClosedEye(k, cx, cy, eyeCanvasX, departureFade = 1) {
  if (departureFade <= 0.001) return
  const s = HERO_N_SPRITE_SCALE
  const ex = cx - HERO_N_SPRITE_SIZE / 2 + eyeCanvasX * s
  const ey = cy - HERO_N_SPRITE_SIZE / 2 + HERO_EYE_CANVAS_Y * s
  const bodyRgb = parseHex(HERO_BODY_COLOR)
  const contour = k.rgb(0, 0, 0)
  const pos = k.vec2(ex, ey)
  k.drawCircle({
    pos,
    radius: HERO_EYE_RING_RADIUS * s,
    color: contour,
    opacity: departureFade
  })
  k.drawCircle({
    pos,
    radius: HERO_EYE_WHITE_RADIUS * s,
    color: k.rgb(bodyRgb[0], bodyRgb[1], bodyRgb[2]),
    opacity: departureFade
  })
}
//
// Frame-name suffix shared by every title-hero sprite variant, driven by
// the current phase (run / closed-eyes idle / neutral default).
//
function resolveHeroFrameSuffix(spider) {
  //
  // A mid-stride running pose (both legs clearly apart), held and mirrored
  // to face left — not the neutral idle stance.
  //
  if (spider.heroPhase === 'lookLeft') return `-run-${HERO_N_LOOK_LEFT_RUN_FRAME}`
  if (spider.heroPhase === 'run' || spider.heroPhase === 'finalWalk') return `-run-${spider.heroRunFrame}`
  if (spider.heroPhase === 'idle' || spider.heroPhase === 'wakeOneEye' || spider.heroPhase === 'wakeBothEyes') {
    return '_closed'
  }
  return '_0_0'
}
//
// Draws the rising melody note glyphs above the idle hero-n's head.
//
function drawHeroNNotes(k, spider, departureFade = 1) {
  if (!HERO_N_IDLE_VOCAL_ENABLED || !spider.heroNotes?.length) return
  const fontName = CFG?.visual?.fonts?.regularFull
  for (const note of spider.heroNotes) {
    const fade = Math.max(0, Math.min(1, 1 - note.age / HERO_N_NOTE_LIFETIME))
    k.drawText({
      text: note.glyph,
      pos: k.vec2(note.x, note.y),
      size: HERO_N_NOTE_FONT_SIZE,
      anchor: 'center',
      color: k.rgb(255, 255, 255),
      opacity: fade * 0.85 * departureFade,
      font: fontName
    })
  }
}
//
// Overlays one open eye (the right one) on the closed-eyes sprite during the
// wake-up step: black ring, white eyeball and a pupil that wanders left and
// right while the hero checks whether the coast is clear.
//
function drawHeroWakeEye(k, spider, cx, cy, departureFade = 1) {
  if (departureFade <= 0.001) return
  const s = HERO_N_SPRITE_SCALE
  const ex = cx - HERO_N_SPRITE_SIZE / 2 + HERO_EYE_RIGHT_X * s
  const ey = cy - HERO_N_SPRITE_SIZE / 2 + HERO_EYE_CANVAS_Y * s
  const pupilDx = Math.sin(spider.heroWakeTimer * HERO_N_WAKE_PUPIL_FREQ * Math.PI * 2) * HERO_EYE_PUPIL_SHIFT * s
  drawHeroTitleEyeDisc(k, ex, ey, pupilDx, 0, s, departureFade)
}
