import { CFG } from '../cfg.js'
import { getColor, parseHex } from '../utils/helper.js'
import * as TouchInput from '../utils/touch-input.js'
import * as CanvasBackdrop from '../utils/canvas-backdrop.js'
import { addBackground } from '../sections/word/utils/scene.js'
import * as Sound from '../utils/sound.js'
import * as Cursor from '../utils/cursor.js'
import { goToMenuAfterAssets } from '../utils/lesson-assets.js'
import { loadHeroSprites, HEROES, IDLE_MELODY, IDLE_MELODY_BEAT, IDLE_MELODY_GAP, IDLE_MELODY_SUSTAIN } from '../components/hero.js'
import { renderHintWithEnter } from '../utils/touch-tap-button.js'
import {
  generateMenuBackgroundCanvas,
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

//
// Hint flicker — pinned at the very bottom of the screen so the
// "press Space" callout sits below the description block, with the
// title and monster occupying the upper half of the canvas.
//
const HINT_FLICKER_DURATION = 1.2
const HINT_MIN_OPACITY = 0.4
const HINT_MAX_OPACITY = 0.75
const HINT_FONT_SIZE = 20
const HINT_Y = 1045
//
// Crawling letter title — centred at the very top of the canvas,
// well above the central monster illustration.
//
const INSTRUCTIONS_TITLE = 'find yourself'
const TITLE_FONT_FAMILY = "'JetBrains Mono', monospace"
const TITLE_FONT_SIZE = 76
//
// Spider configuration
//
const SPIDER_LEG_LENGTH_1 = 22
const SPIDER_LEG_LENGTH_2 = 28
const SPIDER_SPEED = 60
const SPIDER_DIRECTION_CHANGE_INTERVAL = 5.0
const SPIDER_SCREEN_MARGIN = 80
const SPIDER_SMOOTHING = 2.0
const SPIDER_APPEAR_DELAY = 5.0
const SPIDER_FADE_DURATION = 11.0
const SPIDER_MAX_OPACITY = 0.45
const SPIDER_STEP_DISTANCE = 20
const SPIDER_TURN_SPEED = 90
const SPIDER_EYE_RADIUS = 3
const SPIDER_PUPIL_RADIUS = 1.2
const SPIDER_EYE_SPACING = 10
const SPIDER_EYE_Y_OFFSET = -8
//
// Minimum time before the first spider grows its legs after the scene loads.
// Waves are staggered on top of this offset so letters never transform too early.
//
const SPIDER_LEGS_BASE_DELAY = 7.0
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
// none of them ever twinkles over the moon disc or its halo. Ratios come
// straight from the exported moon geometry of the bg generator, plus a
// safety margin, so the zone always matches the actual baked moon.
//
const MOON_ZONE_MARGIN = 40
const MOON_ZONE_CENTER_X_RATIO = MENU_BG_MOON_CENTER_X / MENU_BG_CANVAS_W
const MOON_ZONE_CENTER_Y_RATIO = MENU_BG_MOON_CENTER_Y / MENU_BG_CANVAS_H
const MOON_ZONE_RADIUS_RATIO = (MENU_BG_MOON_HALO_KEEPOUT + MOON_ZONE_MARGIN) / MENU_BG_CANVAS_W
//
// Wandering fireflies — never higher than the front-layer tree
// canopy so they read as flying AMONG the trees rather than across
// the open sky. Each firefly drifts on a slowly rotating velocity
// vector and twinkles independently. The vertical clamp uses the
// front-tree silhouette top from menu-bg-generator (`FIREFLY_MIN_Y`).
//
const FIREFLY_COUNT = 14
const FIREFLY_MIN_Y = 450
const FIREFLY_MAX_Y = MENU_BG_GROUND_Y - 8
const FIREFLY_MIN_X = 80
const FIREFLY_MAX_X = MENU_BG_CANVAS_W - 80
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
// saturating partway out.
//
const GRASS_DENSITY_RAMP = MENU_BG_CANVAS_W / 2 - GRASS_CENTER_KEEPOUT_HALF - GRASS_EDGE_INSET
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
// Central illustration (life-ready.png + hero sprite). Both are
// horizontally centred around the canvas mid-line; the monster's
// bottom edge sits on the black horizon strip and the hero stands
// on the strip too.
//
const LIFE_WIDTH = 767
const LIFE_HEIGHT = 512
const LIFE_X = Math.round(MENU_BG_CANVAS_W / 2 - LIFE_WIDTH / 2)
//
// life-ready.png has transparent padding below the visible creature body.
// LIFE_Y_SINK pushes the sprite down so the visible bottom rests on the
// black horizon strip rather than floating above it.
//
const LIFE_Y_SINK = 79
const LIFE_Y = MENU_BG_GROUND_Y - LIFE_HEIGHT + LIFE_Y_SINK
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
// Illustration hero eye wander (mirrors idle animation constants from hero.js)
//
const HERO_EYE_MIN_DELAY = 1.5
const HERO_EYE_MAX_DELAY = 3.5
const HERO_EYE_LERP_SPEED = 0.1
//
// Index of 'n' in "find yourself" — replaced by the hero sprite.
// Extra pixel spacing added left/right of this position to let i and d breathe.
//
const HERO_N_CHAR_INDEX = 2
const HERO_N_EXTRA_SPREAD = 12
//
// Index of 'u' in "yourself" — replaced by an upside-down hero sprite
//
const HERO_U_CHAR_INDEX = 7
//
// Rendered size of the hero sprite standing in place of 'n'
//
const HERO_N_SPRITE_SIZE = 80
//
// Offset applied to hero-n position so it sits visually inside the title word
//
const HERO_N_OFFSET_X = 10
const HERO_N_OFFSET_Y = -6
//
// Offsets for the flipped hero-u: shifted left of the char cell and mirrored
// downwards vertically.
//
const HERO_U_OFFSET_X = -12
const HERO_U_OFFSET_Y = -3
//
// Title heroes share the exact colour of the title letters so they read
// as part of the word rather than separate characters.
//
const HERO_TITLE_BODY_COLOR = CFG.visual.colors.ready.title
//
// Sprite prefix for the title hero variant (body colour = title colour)
//
const HERO_N_SPRITE_PREFIX = `hero_${HERO_TITLE_BODY_COLOR.replace('#', '')}_000000`
//
// Hero-n departure sequence. Once the letters start growing legs AND the
// mouse stays still for HERO_N_MOUSE_STILL_DELAY seconds, the title hero
// falls to the black ground line, stands up and runs off-screen right in
// short bursts (a RANDOM 4–8 steps each, then a stop). Any mouse movement
// while he is on the ground freezes him in a closed-eyes idle until the
// mouse rests again.
//
const HERO_N_MOUSE_STILL_DELAY = 10
const HERO_N_FALL_GRAVITY = 1500
const HERO_N_RUN_SPEED = 42
const HERO_N_RUN_FRAME_TIME = 0.09
const HERO_N_RUN_FRAME_COUNT = 8
const HERO_N_RUN_STEPS_MIN = 4
const HERO_N_RUN_STEPS_RANGE = 5
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
// Geometry of the hero's eyes inside the 96 px sprite canvas (mirrors the
// head/eye constants in components/hero.js), scaled to the 80 px title-hero
// display size. Used to overlay a single open eye on the closed-eyes sprite
// during the wake-up sequence.
//
const HERO_SPRITE_CANVAS_SIZE = 96
const HERO_N_SPRITE_SCALE = HERO_N_SPRITE_SIZE / HERO_SPRITE_CANVAS_SIZE
const HERO_EYE_RIGHT_X = 54            // headX (33) + EYE_OFFSET_X_RIGHT (21)
const HERO_EYE_CANVAS_Y = 27           // headY (18) + EYE_OFFSET_Y (9)
const HERO_EYE_RING_RADIUS = 5
const HERO_EYE_WHITE_RADIUS = 4
const HERO_EYE_PUPIL_RADIUS = 2
const HERO_EYE_PUPIL_SHIFT = 2
//
// The 80 px hero frame keeps ~14 px of transparent padding below the feet
// (the 96 px canvas padding scaled to the 80 px display size), so the sprite
// centre must sink below the ground line for the feet to rest ON the strip.
//
const HERO_N_FEET_PADDING = 14
const HERO_N_GROUND_CENTER_Y = MENU_BG_GROUND_Y + HERO_N_FEET_PADDING - HERO_N_SPRITE_SIZE / 2
//
// Fade-out duration for the upside-down hero-u once the letters grow legs.
//
const HERO_U_FADE_DURATION = 1.0
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
const HERO_N_NOTE_OFFSET_X = -16
const HERO_N_VOCAL_DELAY = 2.0
//
// Centered description layout. All narrative + section labels live in
// a single centred block placed BELOW the black horizon strip so the
// upper half of the canvas stays clean for the hint, title and the
// monster + hero illustration. Each text line uses anchor 'center'
// pinned at the canvas centre column.
//
const CENTER_X = Math.round(MENU_BG_CANVAS_W / 2)
const TITLE_TEXT_X = CENTER_X
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
  'A psychological platformer where gameplay',
  'is the lesson. Every obstacle teaches a',
  'new way to interact with the world —',
  'and every discovery brings you one step',
  'closer to understanding yourself.'
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
const AVAILABLE_H = HINT_Y - MENU_BG_GROUND_Y
const DESCRIPTION_START_Y = Math.round(MENU_BG_GROUND_Y + (AVAILABLE_H - BLOCK_HEIGHT) / 2) + 20
//
// Approximate monospace char width multiplier (JetBrains Mono)
//
const MONO_CHAR_W_RATIO = 0.6
//
// Narrative body copy — cool teal-gray so text reads softly on the
// deep teal background without competing with the orange title.
//
const COLOR_TEXT_GRAY = '#9AB5C4'

export function sceneReady(k) {
  k.scene('ready', async () => {
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
    // Title hero variant — same body colour as the title letters, used by
    // the hero-n and the upside-down hero-u inside "find yourself".
    //
    loadHeroSprites(k, HEROES.HERO, HERO_TITLE_BODY_COLOR, null, false, false, false)
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
    Cursor.setCursor('arrow')
    const centerX = k.width() / 2
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    addBackground(k, CFG.visual.colors.ready.background)
    //
    // Combined static background — the darkened menu-bg picture plus the
    // bottom description text, baked once into a single full-screen sprite.
    //
    buildReadyStaticSprite(k)
    k.add([k.pos(0, 0), k.z(Z_BG_OVERLAY), { draw() { onDrawBg(k) } }])
    //
    // Twinkling star field overlaid on the baked menu-bg so the ready
    // scene gets a living night sky on top of the static composition.
    //
    const starField = createStarField(k)
    k.add([k.pos(0, 0), k.z(Z_STARS), { draw() { drawStarField(k, starField) } }])
    //
    // Moon above the stars — baked without the moon in the static bg so
    // the disc and halo sit in front of any nearby twinkles.
    //
    buildReadyMoonSprite(k)
    k.add([k.pos(0, 0), k.z(Z_MOON), { draw() { onDrawMoon(k) } }])
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
      getTint: () => GRASS_TINT
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
    // Central illustration: life-ready.png (teacher creature only)
    //
    k.add([k.pos(0, 0), k.z(Z_ILLUSTRATION), { draw() { onDrawIllustration(k) } }])
    //
    // Title text (crawling letters detach from this). The title carries a
    // drop shadow (single black copy offset right+down) like the glow level.
    //
    const outlineOffsets = [[2, 2]]
    const titleOutlines = []
    outlineOffsets.forEach(([dx, dy]) => {
      titleOutlines.push(k.add([
        k.text(INSTRUCTIONS_TITLE, { size: TITLE_FONT_SIZE, font: TITLE_FONT_FAMILY }),
        k.pos(TITLE_TEXT_X + dx, TITLE_TEXT_Y + dy),
        k.anchor('center'),
        k.color(0, 0, 0),
        k.opacity(1),
        k.z(Z_TITLE)
      ]))
    })
    const titleText = k.add([
      k.text(INSTRUCTIONS_TITLE, { size: TITLE_FONT_SIZE, font: TITLE_FONT_FAMILY }),
      k.pos(TITLE_TEXT_X, TITLE_TEXT_Y),
      k.anchor('center'),
      getColor(k, CFG.visual.colors.ready.title),
      k.opacity(1),
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
    // Create crawling letter spiders from the title
    //
    const letterInfos = pickLettersFromTitle(k, titleText, INSTRUCTIONS_TITLE, TITLE_FONT_SIZE, TITLE_FONT_FAMILY)
    const spiders = []
    const spiderState = { timer: 0 }
    //
    // "find yourself" has 13 non-space letters.
    // Five waves spread them so they appear far apart.
    //
    const waves = [[0, 5, 10, 15], [2, 7, 12, 17], [1, 6, 11, 16], [3, 8, 13], [4, 9, 14]]
    const LEG_APPEAR_DURATION = 2.0
    const CRAWL_DURATION = 5.0
    const WAVE_INTERVAL = LEG_APPEAR_DURATION + CRAWL_DURATION
    letterInfos.forEach((letterInfo, i) => {
      const spider = createSpider(k, i, letterInfo)
      let waveIndex = 0
      for (let w = 0; w < waves.length; w++) {
        if (waves[w].includes(i)) { waveIndex = w; break }
        }
      spider.legAppearDelay = SPIDER_LEGS_BASE_DELAY + waveIndex * WAVE_INTERVAL + Math.random() * 0.3
      spider.letterInfo = letterInfo
      spider.titleOutlines = titleOutlines
      //
      // Hero letters are pre-activated: immediately hide the underlying
      // character in the title text so the hero sprites are visible from
      // the first frame.
      //
      if (spider.isHeroN || spider.isHeroU) {
        const { textObj, charIndex } = letterInfo
        const chars = textObj.text.split('')
        chars[charIndex] = ' '
        textObj.text = chars.join('')
        titleOutlines.forEach(outline => { outline.text = textObj.text })
        spider.charHidden = true
        spider.isActivated = true
        //
        // Departure state machine fields (hero-n runs away, hero-u fades out)
        //
        spider.heroPhase = 'title'
        spider.heroOpacity = 1
        spider.heroX = 0
        spider.heroY = 0
        spider.heroRunFrame = 0
        spider.heroRunTimer = 0
        spider.heroBurstDuration = HERO_N_STEP_DURATION * HERO_N_RUN_STEPS_MIN
        spider.heroFrameTimer = 0
        spider.heroPauseTimer = 0
        spider.heroWakeTimer = 0
        spider.heroFallVel = 0
        spider.heroGone = false
        //
        // Idle singing state (notes + melody while eyes are closed)
        //
        spider.heroNotes = []
        spider.heroNoteTimer = 0
        spider.heroMelodyIndex = 0
        spider.heroIdleTime = 0
      }
      spiders.push(spider)
    })
    //
    // Shared input-stillness tracker driving the title-hero departure logic.
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
      spiders.forEach(spider => updateSpider(k, spider, dt, SPIDER_MAX_OPACITY, true))
      updateTitleHeroes(k, spiders, spiderState, heroLetterState, sound, dt)
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
      hint.setOpacity(hintOp)
      //
      // Title subtle flicker
      //
      titleFlickerPhase += dt * TITLE_FLICKER_SPEED
      const titleFlicker = TITLE_FLICKER_MIN + (TITLE_FLICKER_MAX - TITLE_FLICKER_MIN) * (0.5 + 0.5 * Math.sin(titleFlickerPhase))
      titleText.opacity = titleFlicker
      titleOutlines.forEach(o => o.opacity = titleFlicker)
    })
    //
    // Spider draw layer — rendered above all text and title (Z_SPIDER)
    //
    k.add([k.pos(0, 0), k.z(Z_SPIDER), { draw() { onDrawSpidersLayer(k, spiders, spiderState) } }])
    //
    // Controls
    //
    const exitToMenu = () => {
      Sound.stopAmbient(sound)
      goToMenuAfterAssets(k)
    }
    CFG.controls.startGame.forEach(key => k.onKeyPress(key, exitToMenu))
    CFG.controls.backToMenu.forEach(key => k.onKeyPress(key, exitToMenu))
    k.onClick(exitToMenu)
  })
}
//
// Draws the combined static background (one baked sprite, full opacity —
// the darkening and the description text are already baked in).
//
function onDrawBg(k) {
  k.drawSprite({
    sprite: READY_STATIC_SPRITE,
    pos: k.vec2(-READY_BG_EDGE_OVERSCAN, -READY_BG_EDGE_OVERSCAN),
    width: k.width() + READY_BG_EDGE_OVERSCAN * 2,
    height: k.height() + READY_BG_EDGE_OVERSCAN * 2
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
  let cursorY = DESCRIPTION_START_Y
  for (const line of READY_DESC_LINES) {
    ctx.fillStyle = '#000000'
    ctx.fillText(line, CENTER_X + READY_TEXT_SHADOW_OFFSET, cursorY + READY_TEXT_SHADOW_OFFSET)
    ctx.fillStyle = COLOR_TEXT_GRAY
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
  // `MOON_ZONE_RADIUS_RATIO * w` of the moon centre get re-rolled up to
  // a few times. Avoids visual clutter around the moon's halo.
  //
  const moonCx = MOON_ZONE_CENTER_X_RATIO * w
  const moonCy = MOON_ZONE_CENTER_Y_RATIO * h
  const moonRadius = MOON_ZONE_RADIUS_RATIO * w
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
function drawStarField(k, stars) {
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
      opacity: alpha
    })
  }
}
//
// Moon overlay — drawn above the star field so the disc occludes twinkles.
// Full opacity (not READY_BG_DARKEN_ALPHA) so stars cannot show through the disc.
//
function onDrawMoon(k) {
  const over = READY_BG_EDGE_OVERSCAN
  k.drawSprite({
    sprite: READY_MOON_SPRITE,
    pos: k.vec2(-over, -over),
    width: MENU_BG_CANVAS_W + over * 2,
    height: MENU_BG_CANVAS_H + over * 2,
    opacity: 1
  })
}
//
// The moon glow is baked into READY_MOON_SPRITE (see buildReadyMoonSprite);
// no extra runtime glow pass is needed.
//
//
// Draws the center illustration: life-ready.png as the creature + hero sprite overlaid in front.
// illAnim carries the current eye wander state for the hero sprite.
//
function onDrawIllustration(k) {
  //
  // life-ready.png: the teacher creature only, no hero sprite overlaid
  //
  k.drawSprite({
    sprite: "life-ready",
    pos: k.vec2(LIFE_X, LIFE_Y),
    width: LIFE_WIDTH,
    height: LIFE_HEIGHT,
    opacity: LIFE_OPACITY
  })
}
//
// ────────── Spider / crawling letters system ──────────
//

/**
 * Creates a spider from a specific letter in a text object
 * @param {Object} k - Kaplay instance
 * @param {number} index - Spider index
 * @param {Object} sourceInfo - Info about source letter {char, x, y, color, fontSize, fontFamily}
 * @returns {Object} Spider instance
 */
function createSpider(k, index, sourceInfo) {
  const { char, x, y, color, fontSize, fontFamily } = sourceInfo
  const angle = Math.random() * Math.PI * 2
  const speed = SPIDER_SPEED * (0.5 + Math.random() * 0.5)
  const baseAngleOffset = Math.random() * Math.PI * 2
  const legAngles = [
    -Math.PI * 0.8, -Math.PI * 0.6, -Math.PI * 0.4, -Math.PI * 0.2,
    Math.PI * 0.2, Math.PI * 0.4, Math.PI * 0.6, Math.PI * 0.8
  ]
  const legs = legAngles.map((baseAngle, i) => {
    const side = i < 4 ? -1 : 1
    const reach = SPIDER_LEG_LENGTH_1 + SPIDER_LEG_LENGTH_2
    const randomizedAngle = baseAngle + baseAngleOffset
    const footX = x + Math.cos(randomizedAngle) * reach * 0.8
    const footY = y + Math.sin(randomizedAngle) * reach * 0.8
    return {
      baseAngle: randomizedAngle,
      side,
      footX,
      footY,
      targetFootX: footX,
      targetFootY: footY,
      isStepping: false,
      stepProgress: 0,
      stepStartX: footX,
      stepStartY: footY,
      phaseOffset: (i % 2) * Math.PI
    }
  })
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    targetVx: Math.cos(angle) * speed,
    targetVy: Math.sin(angle) * speed,
    speed,
    directionTimer: Math.random() * SPIDER_DIRECTION_CHANGE_INTERVAL,
    legs,
    distanceTraveled: 0,
    color,
    appearDelay: index * 0.15,
    legAppearDelay: 0,
    legAppearTimer: 0,
    letter: char,
    letterSize: fontSize,
    letterFont: fontFamily,
    isActivated: false,
    legExtendT: 0,
    displayAngle: 0,
    charHidden: false,
    letterInfo: null,
    titleOutlines: null,
    targetReturnX: undefined,
    targetReturnY: undefined,
    startReturnX: undefined,
    startReturnY: undefined,
    targetRotation: 0,
    currentRotation: 0,
    legsHidden: false,
    settled: false,
    //
    // When true this spider stays fixed and renders a hero sprite instead of a letter
    //
    isHeroN: sourceInfo?.isHeroN ?? false,
    //
    // When true this spider renders an upside-down hero sprite (the 'u' in "yourself")
    //
    isHeroU: sourceInfo?.isHeroU ?? false
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
  const charWidth = fontSize * MONO_CHAR_W_RATIO
  //
  // titleTextObj uses anchor('center'), so pos.x is the CENTER of the string.
  // Subtract half the total string width to get the true left edge.
  // Add extra spread around the hero-n position so i and d breathe.
  //
  const totalStringWidth = titleString.length * charWidth + HERO_N_EXTRA_SPREAD * 2
  const startX = titleTextObj.pos.x - totalStringWidth / 2
  //
  // Pre-activation spider letter tint — a brighter orange than the
  // title (`#E07020`) so the letters glow a touch hotter just before
  // they sprout legs. Sits firmly on the warm half of the teal+orange
  // complementary palette.
  //
  const brighterColor = k.rgb(255, 150, 80)
  titleString.split('').forEach((char, charIndex) => {
    if (char.trim().length === 0) return
    //
    // Shift letters after the hero-n by extra spread so i and d have breathing room
    //
    const extraShift = charIndex > HERO_N_CHAR_INDEX ? HERO_N_EXTRA_SPREAD * 2 : 0
    const charX = startX + (charIndex * charWidth) + (charWidth / 2) + extraShift
    const charY = titleTextObj.pos.y
    //
    // Mark the 'n' (hero) and the 'u' in "yourself" (upside-down hero) —
    // both will be replaced by hero sprites.
    //
    const isHeroN = charIndex === HERO_N_CHAR_INDEX
    const isHeroU = charIndex === HERO_U_CHAR_INDEX
    letterInfos.push({
      textObj: titleTextObj,
      charIndex,
      char,
      x: charX,
      y: charY,
      color: brighterColor,
      fontSize,
      fontFamily,
      isHeroN,
      isHeroU
    })
  })
  return letterInfos
}

/**
 * Updates spider position, leg timers and activation.
 * @param {Object} k - Kaplay instance
 * @param {Object} spider - Spider instance
 * @param {number} dt - Delta time
 * @param {number} opacity - Current global opacity (drives leg appear timer)
 * @param {boolean} allowFullScreen - If true spiders roam the whole screen
 */
function updateSpider(k, spider, dt, opacity, allowFullScreen) {
  if (opacity > 0) {
    spider.legAppearTimer += dt
  }
  const legAppearTimeElapsed = spider.legAppearTimer - spider.legAppearDelay
  if (legAppearTimeElapsed > 0 && spider.legExtendT < 1) {
    const LEG_GROW_DURATION = 2.0
    spider.legExtendT = Math.min(1, legAppearTimeElapsed / LEG_GROW_DURATION)
  }
  if (!spider.isActivated && spider.legExtendT >= 1) {
    spider.isActivated = true
    if (spider.letterInfo && spider.letterInfo.textObj) {
      spider.color = spider.letterInfo.textObj.color
    }
    if (spider.letterInfo && !spider.charHidden) {
      const { textObj, charIndex } = spider.letterInfo
      const chars = textObj.text.split('')
      chars[charIndex] = ' '
      textObj.text = chars.join('')
      const outlinesToUpdate = textObj.outlines || spider.titleOutlines
      outlinesToUpdate && outlinesToUpdate.forEach(outline => {
          outline.text = textObj.text
        })
      spider.charHidden = true
    }
  }
  if (!spider.isActivated) return
  //
  // Hero letters stay at their original positions — no wandering
  //
  if (spider.isHeroN || spider.isHeroU) return
  //
  // Random movement (no return-to-title in the new scene design)
    //
    spider.directionTimer -= dt
    if (spider.directionTimer <= 0) {
      const newAngle = Math.random() * Math.PI * 2
      spider.targetVx = Math.cos(newAngle) * spider.speed
      spider.targetVy = Math.sin(newAngle) * spider.speed
      spider.directionTimer = SPIDER_DIRECTION_CHANGE_INTERVAL * (0.5 + Math.random())
    }
  const smoothing = SPIDER_SMOOTHING * dt
  spider.vx += (spider.targetVx - spider.vx) * smoothing
  spider.vy += (spider.targetVy - spider.vy) * smoothing
  const speed = Math.sqrt(spider.vx * spider.vx + spider.vy * spider.vy)
  if (speed > 1) {
    const targetAngleDeg = Math.atan2(spider.vy, spider.vx) * (180 / Math.PI)
    let diff = targetAngleDeg - spider.displayAngle
    while (diff > 180) diff -= 360
    while (diff < -180) diff += 360
    const maxTurn = SPIDER_TURN_SPEED * dt
    spider.displayAngle += Math.max(-maxTurn, Math.min(maxTurn, diff))
  }
  const oldX = spider.x
  const oldY = spider.y
  spider.x += spider.vx * dt
  spider.y += spider.vy * dt
  const dx = spider.x - oldX
  const dy = spider.y - oldY
  spider.distanceTraveled += Math.sqrt(dx * dx + dy * dy)
  //
  // Screen bounds
  //
  const minX = SPIDER_SCREEN_MARGIN
  const maxX = k.width() - SPIDER_SCREEN_MARGIN
  const minY = SPIDER_SCREEN_MARGIN
  const maxY = allowFullScreen ? k.height() - SPIDER_SCREEN_MARGIN : TITLE_TEXT_Y + 80
  if (spider.x < minX) { spider.x = minX; spider.targetVx = Math.abs(spider.targetVx); spider.vx = Math.abs(spider.vx) * 0.5 }
  else if (spider.x > maxX) { spider.x = maxX; spider.targetVx = -Math.abs(spider.targetVx); spider.vx = -Math.abs(spider.vx) * 0.5 }
  if (spider.y < minY) { spider.y = minY; spider.targetVy = Math.abs(spider.targetVy); spider.vy = Math.abs(spider.vy) * 0.5 }
  else if (spider.y > maxY) { spider.y = maxY; spider.targetVy = -Math.abs(spider.targetVy); spider.vy = -Math.abs(spider.vy) * 0.5 }
  //
  // Leg stepping
  //
  const movementAngle = Math.atan2(spider.vy, spider.vx)
  const reach = SPIDER_LEG_LENGTH_1 + SPIDER_LEG_LENGTH_2
  const maxReach = reach * 0.85
  spider.legs.forEach((leg, i) => {
    const adjustedAngle = leg.baseAngle + movementAngle
    const idealX = spider.x + Math.cos(adjustedAngle) * reach * 0.6
    const idealY = spider.y + Math.sin(adjustedAngle) * reach * 0.6
    const footDx = idealX - leg.footX
    const footDy = idealY - leg.footY
    const footDist = Math.sqrt(footDx * footDx + footDy * footDy)
    const bodyDx = leg.footX - spider.x
    const bodyDy = leg.footY - spider.y
    const bodyDist = Math.sqrt(bodyDx * bodyDx + bodyDy * bodyDy)
    const needsStep = footDist > SPIDER_STEP_DISTANCE || bodyDist > maxReach
    if (!leg.isStepping && needsStep) {
      const phase = Math.floor(spider.distanceTraveled / SPIDER_STEP_DISTANCE) % 2
      const shouldStep = (i % 2 === 0) !== (phase === 0) || bodyDist > maxReach
      if (shouldStep) {
        leg.isStepping = true
        leg.stepProgress = 0
        leg.stepStartX = leg.footX
        leg.stepStartY = leg.footY
        leg.targetFootX = idealX
        leg.targetFootY = idealY
      }
    }
    if (leg.isStepping) {
      leg.stepProgress += dt * 10
      if (leg.stepProgress >= 1) {
        leg.stepProgress = 1
        leg.isStepping = false
        leg.footX = leg.targetFootX
        leg.footY = leg.targetFootY
      } else {
        const t = leg.stepProgress
        const arc = Math.sin(t * Math.PI) * 4
        leg.footX = leg.stepStartX + (leg.targetFootX - leg.stepStartX) * t
        leg.footY = leg.stepStartY + (leg.targetFootY - leg.stepStartY) * t - arc
      }
    }
  })
}

/**
 * Draws all spiders on the Z_SPIDER layer.
 * Called each frame by the k.add draw callback registered with k.z(Z_SPIDER).
 * @param {Object} k - Kaplay instance
 * @param {Array} spiders - Array of spider instances
 * @param {Object} spiderState - Mutable state carrying the scene timer
 */
function onDrawSpidersLayer(k, spiders, spiderState) {
  const { timer } = spiderState
  spiders.forEach(spider => {
    let spiderOpacity = 0
    const timeToAppear = SPIDER_APPEAR_DELAY + spider.appearDelay
    if (timer > timeToAppear) {
      spiderOpacity = Math.min(1, (timer - timeToAppear) / SPIDER_FADE_DURATION) * SPIDER_MAX_OPACITY
    }
    drawSpider(k, spider, spiderOpacity)
  })
}
/**
 * Draws a spider (legs + letter body + eyes).
 * @param {Object} k - Kaplay instance
 * @param {Object} spider - Spider instance
 * @param {number} textOpacity - Opacity for the spider
 */
function drawSpider(k, spider, textOpacity) {
  //
  // Hero letters: always draw as hero sprites regardless of activation state.
  // The underlying characters were already hidden in the title text at spider
  // creation. Hero-u is flipped vertically (upside down).
  //
  if (spider.isHeroN || spider.isHeroU) {
    drawTitleHero(k, spider)
    return
  }
  if (spider.legExtendT > 0 && !spider.legsHidden) {
    const legColor = k.rgb(12, 10, 14)
    const legOpacity = spider.charHidden ? SPIDER_MAX_OPACITY : (textOpacity > 0 ? Math.min(textOpacity, SPIDER_MAX_OPACITY) : 0)
    if (legOpacity > 0) {
    spider.legs.forEach(leg => {
        const effFootX = spider.x + (leg.footX - spider.x) * spider.legExtendT
        const effFootY = spider.y + (leg.footY - spider.y) * spider.legExtendT
      const { jointX, jointY } = solveIK(
          spider.x, spider.y, effFootX, effFootY,
          SPIDER_LEG_LENGTH_1, SPIDER_LEG_LENGTH_2, leg.side
        )
        k.drawLine({ p1: k.vec2(spider.x, spider.y), p2: k.vec2(jointX, jointY), width: 2, color: legColor, opacity: legOpacity })
        k.drawLine({ p1: k.vec2(jointX, jointY), p2: k.vec2(effFootX, effFootY), width: 2, color: legColor, opacity: legOpacity })
        k.drawCircle({ pos: k.vec2(jointX, jointY), radius: 1, color: legColor, opacity: legOpacity })
      })
    }
  }
  if (spider.charHidden) {
    const angleDeg = spider.displayAngle
      spider.currentRotation = angleDeg
    k.pushTransform()
    k.pushTranslate(spider.x, spider.y)
    k.pushRotate(angleDeg)
    //
    // Drop shadow (single black copy offset right+down), glow-level style.
    //
    const outlineOffsets = [[2, 2]]
    outlineOffsets.forEach(([dx, dy]) => {
      k.drawText({
        text: spider.letter,
        size: spider.letterSize,
        pos: k.vec2(dx, dy),
        anchor: 'center',
        color: k.rgb(0, 0, 0),
        opacity: 1.0,
        font: spider.letterFont
      })
    })
    k.drawText({
      text: spider.letter,
      size: spider.letterSize,
      pos: k.vec2(0, 0),
      anchor: 'center',
      color: spider.color,
      opacity: 1.0,
      font: spider.letterFont
    })
    drawSpiderEyes(k, spider, angleDeg)
    k.popTransform()
  }
}
//
// Draws two small eyes on the letter body, pupils tracking movement direction.
//
function drawSpiderEyes(k, spider, angleDeg) {
  if (spider.settled) return
  if (spider.legExtendT < 0.3) return
  const eyeOpacity = Math.min(1, (spider.legExtendT - 0.3) / 0.4)
  const scleraColor = k.rgb(220, 220, 210)
  const pupilColor = k.rgb(15, 8, 8)
  const lx = -SPIDER_EYE_SPACING / 2
  const rx = SPIDER_EYE_SPACING / 2
  const ey = SPIDER_EYE_Y_OFFSET
  const velAngle = Math.atan2(spider.vy, spider.vx)
  const localAngle = velAngle - angleDeg * (Math.PI / 180)
  const maxPupilOffset = SPIDER_EYE_RADIUS - SPIDER_PUPIL_RADIUS - 0.5
  const px = Math.cos(localAngle) * maxPupilOffset
  const py = Math.sin(localAngle) * maxPupilOffset
  k.drawCircle({ pos: k.vec2(lx, ey), radius: SPIDER_EYE_RADIUS, color: scleraColor, opacity: eyeOpacity })
  k.drawCircle({ pos: k.vec2(lx + px, ey + py), radius: SPIDER_PUPIL_RADIUS, color: pupilColor, opacity: eyeOpacity })
  k.drawCircle({ pos: k.vec2(rx, ey), radius: SPIDER_EYE_RADIUS, color: scleraColor, opacity: eyeOpacity })
  k.drawCircle({ pos: k.vec2(rx + px, ey + py), radius: SPIDER_PUPIL_RADIUS, color: pupilColor, opacity: eyeOpacity })
}

/**
 * Solves 2-segment IK for a spider leg.
 * @param {number} baseX - Body X
 * @param {number} baseY - Body Y
 * @param {number} targetX - Foot X
 * @param {number} targetY - Foot Y
 * @param {number} len1 - First segment length
 * @param {number} len2 - Second segment length
 * @param {number} side - Bend direction (-1 or 1)
 * @returns {{ jointX: number, jointY: number }}
 */
function solveIK(baseX, baseY, targetX, targetY, len1, len2, side) {
  const dx = targetX - baseX
  const dy = targetY - baseY
  let dist = Math.sqrt(dx * dx + dy * dy)
  const maxReach = len1 + len2 - 0.1
  const minReach = Math.abs(len1 - len2) + 0.1
  dist = Math.max(minReach, Math.min(maxReach, dist))
  const angleToTarget = Math.atan2(dy, dx)
  const cosAngle1 = (dist * dist + len1 * len1 - len2 * len2) / (2 * dist * len1)
  const angle1 = Math.acos(Math.max(-1, Math.min(1, cosAngle1)))
  const jointAngle = angleToTarget + angle1 * side
  const jointX = baseX + Math.cos(jointAngle) * len1
  const jointY = baseY + Math.sin(jointAngle) * len1
  return { jointX, jointY }
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
// Tracks input stillness (mouse motion + key presses) and advances both
// title heroes: hero-u fades out once the letters start growing legs;
// hero-n leaves the title after the input has rested (see the HERO_N_*
// constants for the full sequence).
//
function updateTitleHeroes(k, spiders, spiderState, state, sound, dt) {
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
  const legsStarted = spiderState.timer > SPIDER_LEGS_BASE_DELAY
  spiders.forEach(spider => {
    spider.isHeroU && updateHeroU(spider, legsStarted, dt)
    if (spider.isHeroN) {
      updateHeroN(k, spider, state, legsStarted, dt)
      updateHeroNNotes(spider, sound, dt)
      //
      // Once hero-n has run past the right edge, the scene flows into the
      // menu by itself after a short beat.
      //
      if (spider.heroGone) {
        state.heroGoneTime += dt
        if (state.heroGoneTime >= HERO_N_GONE_MENU_DELAY && !state.heroGoneExited) {
          state.heroGoneExited = true
          Sound.stopAmbient(sound)
          goToMenuAfterAssets(k)
        }
      }
    }
  })
}
//
// Idle singing for hero-n: while he stands with closed eyes the same melody
// the in-game hero hums plays note by note, each pitch paired with a rising
// glyph above his head. Interruptions restart the melody from the top.
//
function updateHeroNNotes(spider, sound, dt) {
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
// Hero-u simply fades away once the letters start growing legs.
//
function updateHeroU(spider, legsStarted, dt) {
  if (!legsStarted || spider.heroGone) return
  spider.heroOpacity = Math.max(0, spider.heroOpacity - dt / HERO_U_FADE_DURATION)
  spider.heroOpacity <= 0 && (spider.heroGone = true)
}
//
// Hero-n departure state machine: title → fall → run bursts / pauses, with
// an interruptible closed-eyes idle whenever the mouse moves on the ground.
//
function updateHeroN(k, spider, state, legsStarted, dt) {
  if (spider.heroGone) return
  if (spider.heroPhase === 'title') {
    if (legsStarted && state.mouseStillTime >= HERO_N_MOUSE_STILL_DELAY) {
      //
      // Leave the title cell: from now on the hero is positioned by its own
      // centre coordinates instead of the letter-cell offsets.
      //
      spider.heroPhase = 'fall'
      spider.heroX = spider.x + HERO_N_OFFSET_X
      spider.heroY = spider.y + HERO_N_OFFSET_Y
      spider.heroFallVel = 0
    }
    return
  }
  if (spider.heroPhase === 'fall') {
    //
    // Free fall with gravity — the hero accelerates towards the ground.
    //
    spider.heroFallVel += HERO_N_FALL_GRAVITY * dt
    spider.heroY += spider.heroFallVel * dt
    if (spider.heroY >= HERO_N_GROUND_CENTER_Y) {
      spider.heroY = HERO_N_GROUND_CENTER_Y
      startHeroNBurst(spider)
    }
    return
  }
  //
  // Ground phases — any mouse movement freezes the hero in closed-eyes idle.
  //
  state.mouseMoved && (spider.heroPhase = 'idle')
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
    }
    if (spider.heroX - HERO_N_SPRITE_SIZE / 2 > k.width()) {
      spider.heroGone = true
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
  }
}
//
// Resets the burst timers and switches hero-n into the running phase. Every
// burst rolls its own length — a random 4–8 steps — so no two runs match.
//
function startHeroNBurst(spider) {
  spider.heroPhase = 'run'
  spider.heroRunTimer = 0
  spider.heroFrameTimer = 0
  spider.heroRunFrame = 0
  spider.heroBurstDuration = HERO_N_STEP_DURATION * (HERO_N_RUN_STEPS_MIN + Math.floor(Math.random() * HERO_N_RUN_STEPS_RANGE))
}
//
// Draws a title hero (hero-n or the flipped hero-u). Inside the title the
// hero sits within its letter cell; after departure hero-n is positioned by
// its own centre coordinates and picks a sprite matching the current phase.
//
function drawTitleHero(k, spider) {
  if (spider.heroGone) return
  const inTitle = spider.isHeroU || spider.heroPhase === 'title'
  const cx = inTitle ? spider.x + (spider.isHeroU ? HERO_U_OFFSET_X : HERO_N_OFFSET_X) : spider.heroX
  const cy = inTitle ? spider.y + (spider.isHeroU ? HERO_U_OFFSET_Y : HERO_N_OFFSET_Y) : spider.heroY
  //
  // Sprite per phase: run frames while bursting, closed eyes while idling or
  // waking with one eye (the open eye is overlaid manually), open eyes
  // otherwise (title, fall, pause, both-eyes wake step).
  //
  const closedEyes = spider.heroPhase === 'idle' || spider.heroPhase === 'wakeOneEye'
  const sprite = spider.heroPhase === 'run'
    ? `${HERO_N_SPRITE_PREFIX}-run-${spider.heroRunFrame}`
    : closedEyes
      ? `${HERO_N_SPRITE_PREFIX}_closed`
      : `${HERO_N_SPRITE_PREFIX}_0_0`
  k.drawSprite({
    sprite,
    pos: k.vec2(cx - HERO_N_SPRITE_SIZE / 2, cy - HERO_N_SPRITE_SIZE / 2),
    width: HERO_N_SPRITE_SIZE,
    height: HERO_N_SPRITE_SIZE,
    flipY: spider.isHeroU,
    opacity: spider.isHeroU ? spider.heroOpacity : 1
  })
  spider.heroPhase === 'wakeOneEye' && drawHeroWakeEye(k, spider, cx, cy)
  drawHeroNNotes(k, spider)
}
//
// Draws the rising melody note glyphs above the idle hero-n's head.
//
function drawHeroNNotes(k, spider) {
  if (!spider.heroNotes?.length) return
  const fontName = CFG?.visual?.fonts?.regularFull
  for (const note of spider.heroNotes) {
    const fade = Math.max(0, Math.min(1, 1 - note.age / HERO_N_NOTE_LIFETIME))
    k.drawText({
      text: note.glyph,
      pos: k.vec2(note.x, note.y),
      size: HERO_N_NOTE_FONT_SIZE,
      anchor: 'center',
      color: k.rgb(255, 255, 255),
      opacity: fade * 0.85,
      font: fontName
    })
  }
}
//
// Overlays one open eye (the right one) on the closed-eyes sprite during the
// wake-up step: black ring, white eyeball and a pupil that wanders left and
// right while the hero checks whether the coast is clear.
//
function drawHeroWakeEye(k, spider, cx, cy) {
  const s = HERO_N_SPRITE_SCALE
  const ex = cx - HERO_N_SPRITE_SIZE / 2 + HERO_EYE_RIGHT_X * s
  const ey = cy - HERO_N_SPRITE_SIZE / 2 + HERO_EYE_CANVAS_Y * s
  const pupilDx = Math.sin(spider.heroWakeTimer * HERO_N_WAKE_PUPIL_FREQ * Math.PI * 2) * HERO_EYE_PUPIL_SHIFT * s
  k.drawCircle({ pos: k.vec2(ex, ey), radius: HERO_EYE_RING_RADIUS * s, color: k.rgb(0, 0, 0) })
  k.drawCircle({ pos: k.vec2(ex, ey), radius: HERO_EYE_WHITE_RADIUS * s, color: k.rgb(255, 255, 255) })
  k.drawCircle({ pos: k.vec2(ex + pupilDx, ey), radius: HERO_EYE_PUPIL_RADIUS * s, color: k.rgb(0, 0, 0) })
}
