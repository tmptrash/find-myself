import { CFG } from '../cfg.js'
import { getColor, parseHex } from '../utils/helper.js'
import * as TouchInput from '../utils/touch-input.js'
import * as CanvasBackdrop from '../utils/canvas-backdrop.js'
import { addBackground } from '../sections/word/utils/scene.js'
import * as Sound from '../utils/sound.js'
import * as Cursor from '../utils/cursor.js'
import { goToMenuAfterAssets } from '../utils/level-assets.js'
import { drawConnectionWave } from '../utils/connection.js'
import { loadHeroSprites, HEROES } from '../components/hero.js'
import { renderHintWithEnter } from '../utils/touch-tap-button.js'
import {
  MENU_BG_GROUND_Y,
  MENU_BG_HORIZON_LINE_HEIGHT,
  MENU_BG_CANVAS_W
} from '../utils/menu-bg-generator.js'
import { createSwayingGrassField, drawSwayingGrassField } from '../utils/swaying-grass-field.js'

//
// Hint flicker — pinned at the very bottom of the screen so the
// "press Space" callout sits below the description block, with the
// title and monster occupying the upper half of the canvas.
//
const HINT_FLICKER_DURATION = 1.2
const HINT_MIN_OPACITY = 0.4
const HINT_MAX_OPACITY = 0.75
const HINT_FONT_SIZE = 20
const HINT_Y = 1075
//
// Crawling letter title — centred at the very top of the canvas,
// well above the central monster illustration.
//
const INSTRUCTIONS_TITLE = 'find yourself'
const TITLE_FONT_FAMILY = "'JetBrains Mono', monospace"
const TITLE_FONT_SIZE = 54
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
// Stars sit BELOW the drifting cloud layer so twinkles never punch
// through the cloud puffs — clouds read as the nearer sky element.
//
const Z_STARS = CFG.visual.zIndex.background + 2
const Z_FIREFLIES = CFG.visual.zIndex.background + 4
const Z_GRASS = CFG.visual.zIndex.background + 5
const Z_ILLUSTRATION = CFG.visual.zIndex.background + 6
const Z_TEXT = 10
const Z_TITLE = 15
const Z_SPIDER = 50
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
// Moon zone (in the baked menu-bg). Stars are repelled from this
// rectangle so they don't fight the moon halo for visual attention.
// Coordinates are unit ratios of viewport width/height — the moon
// sprite scales with the bg.
//
const MOON_ZONE_CENTER_X_RATIO = 1700 / 1920
const MOON_ZONE_CENTER_Y_RATIO = 160 / 1080
const MOON_ZONE_RADIUS_RATIO = 220 / 1920
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
// mushrooms in `menu-bg-generator.js`).
//
const GRASS_CENTER_KEEPOUT_HALF = 400
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
const LIFE_Y_SINK = 89
const LIFE_Y = MENU_BG_GROUND_Y - LIFE_HEIGHT + LIFE_Y_SINK
const LIFE_OPACITY = 1.0
//
// Hero offset preserved from the original layout (hero stood ~83 px
// left of the monster centre) so the hero still reads as standing in
// front of the monster's mouth, just now centred on the canvas.
//
const HERO_OFFSET_FROM_LIFE_CENTER_X = -2
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
// Anti-hero hover scale effect in the icon row
//
const ANTIHERO_HOVER_RADIUS = 42
const ANTIHERO_HOVER_BASE = 1.18
const ANTIHERO_HOVER_AMP = 0.10
const ANTIHERO_PULSE_SPEED = 2.4
const ANTIHERO_HOVER_LERP_SPEED = 8
const HERO_SPRITE_NAME = 'hero_5A8898_000000_0_0'
//
// The CENTRAL hero illustration uses a richer sprite variant that
// adds a mouth, two visible arms and a wrist watch on top of the
// plain hero body. The small two-heroes icon below (HERO_SPRITE_NAME)
// keeps the plain variant so it stays readable at icon size.
//
const HERO_ILLUSTRATION_SPRITE_PREFIX = 'hero_5A8898_000000_mouth_arms_watch'
//
// Anti-hero color in the duality icon is the warm complement of the
// hero's steel teal — a vibrant orange that, paired with the teal
// hero on the same row, visualises the "you vs shadow self" duality
// through a textbook complementary colour pair.
//
const ANTIHERO_READY_BODY_COLOR = '#E07020'
const ANTIHERO_SPRITE_NAME = 'antiHero_E07020_000000_0_0'
//
// Illustration hero eye wander (mirrors idle animation constants from hero.js)
//
const HERO_EYE_MIN_DELAY = 1.5
const HERO_EYE_MAX_DELAY = 3.5
const HERO_EYE_LERP_SPEED = 0.1
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
// Description block geometry. Narrative paragraph sits CENTRED in a
// column starting slightly below the horizon; the two section label
// rows below it are LEFT-ALIGNED at a fixed column so the icon and
// label edge of both rows form a clean left column.
//
// Pulled up (smaller offset from horizon) so the taller narrative block
// doesn't push the goal rows off-screen after the font size increase.
const DESCRIPTION_START_Y = MENU_BG_GROUND_Y + 52
//
// Narrative text — bigger and wider than the previous 4-line block.
// Two long lines (≈ 66 chars each in monospace) read as a single
// breath and free up vertical space for the hint pinned to the very
// bottom of the canvas.
//
const TEXT_FONT_SIZE = 30
const TEXT_LINE_HEIGHT = 42
//
// Extra space between the narrative paragraph and the section label
// rows — gives the two "Collect / Find" labels their own visual
// breathing room below the description.
//
const DESCRIPTION_BLOCK_GAP = 30
//
// Section label icon — small glyph drawn to the LEFT of its label.
// Both rows share the same left edge `LABEL_BLOCK_LEFT_X` so the
// icons + labels form a clean left-aligned column. The X is picked
// so the WIDER row (label2) ends up roughly centred on the canvas.
//
const ICON_DRAW_R = 12
const ICON_LABEL_GAP = 14
const ICON_ROW_HEIGHT = 56
//
// Left column for the label-row block. Chosen so the longer of the
// two rows is approximately canvas-centred.
//
const LABEL_BLOCK_LEFT_X = 790
//
// "your goal is to ->" sits to the left of the two orange bullet rows
//
const GOAL_LABEL_X = LABEL_BLOCK_LEFT_X - 230
//
// Extra Y to vertically centre the two-heroes pair between label and
// desc lines.
//
const ICON_TWO_HEROES_Y_EXTRA = 14
//
// Animated sparkle constants (matches bonus-hero glow used in time section)
//
const SPARKLE_PULSE_SPEED = 2.5
const SPARKLE_INNER_R = 5
const SPARKLE_OUTER_R = 11
const ICON_LABEL_FONT_SIZE = 22
const ICON_LABEL_DESC_FONT_SIZE = 15
const ICON_LABEL_DESC_OFFSET_Y = 20
//
// Life laugh audio: plays a short ambient laugh at random intervals.
//
//
// Inline color constants — the warm half of the teal+orange
// complementary palette (orange labels) and the cool teal-gray used
// for narrative body copy so it sits gently on top of the deep teal
// background without competing with the orange title.
//
const COLOR_WARM_ORANGE = '#E08040'
const COLOR_TEXT_GRAY = '#9AB5C4'
//
// Approximate monospace char width multiplier (JetBrains Mono)
//
const MONO_CHAR_W_RATIO = 0.6

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
    // Background (menu-bg dark overlay)
    //
    k.add([k.pos(0, 0), k.z(Z_BG_OVERLAY), { draw() { onDrawBg(k) } }])
    //
    // Twinkling star field overlaid on the baked menu-bg so the ready
    // scene gets a living night sky on top of the static composition.
    //
    const starField = createStarField(k)
    k.add([k.pos(0, 0), k.z(Z_STARS), { draw() { drawStarField(k, starField) } }])
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
    // Swaying grass tufts along the horizon strip — short blades
    // gently leaning with a coherent wind sine.
    //
    const grassField = createSwayingGrassField({
      centerX: CENTER_X,
      centerKeepoutHalf: GRASS_CENTER_KEEPOUT_HALF
    })
    k.add([k.pos(0, 0), k.z(Z_GRASS), { draw() { drawSwayingGrassField(k, grassField) } }])
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
    // Central illustration: life-ready.png + procedural hero silhouette
    //
    //
    // Hero illustration eye wander state (starts eyes right-up, matching the sprite prefix)
    //
    const illAnim = {
      eyeX: 1,
      eyeY: -1,
      targetEyeX: 1,
      targetEyeY: -1,
      eyeTimer: 0,
      eyeNextSwitch: HERO_EYE_MIN_DELAY + Math.random() * (HERO_EYE_MAX_DELAY - HERO_EYE_MIN_DELAY)
    }
    k.add([k.pos(0, 0), k.z(Z_ILLUSTRATION), { draw() { onDrawIllustration(k, illAnim) } }])
    //
    // Centered description block (narrative + section labels) below
    // the black horizon strip.
    //
    const descriptionLayout = addDescriptionBlock(k)
    //
    // Animated icon state: sparkle pulse, electric heartbeat, life laugh flash.
    //
    const iconAnim = {
      sparklePhase: 0,
      heartbeatPhase: 0,
      //
      // Anti-hero hover: lerps toward a sine-wave target when mouse is near the icon
      //
      antiHeroScale: 1.0,
      antiHeroTargetScale: 1.0,
      antiHeroPulsePhase: 0.0
    }
    k.onUpdate(() => {
      const dt = k.dt()
      //
      // Hero illustration eye wander
      //
      illAnim.eyeTimer += dt
      if (illAnim.eyeTimer >= illAnim.eyeNextSwitch) {
        illAnim.targetEyeX = k.choose([-1, 0, 1])
        illAnim.targetEyeY = k.choose([-1, 0, 1])
        illAnim.eyeTimer = 0
        illAnim.eyeNextSwitch = HERO_EYE_MIN_DELAY + Math.random() * (HERO_EYE_MAX_DELAY - HERO_EYE_MIN_DELAY)
      }
      illAnim.eyeX = k.lerp(illAnim.eyeX, illAnim.targetEyeX, HERO_EYE_LERP_SPEED)
      illAnim.eyeY = k.lerp(illAnim.eyeY, illAnim.targetEyeY, HERO_EYE_LERP_SPEED)
      iconAnim.sparklePhase += dt * SPARKLE_PULSE_SPEED
      iconAnim.heartbeatPhase = (iconAnim.heartbeatPhase + dt) % 1
      //
      // Anti-hero hover: detect mouse proximity to the two-hero icon
      // group of the second description row, set target scale, lerp
      // smoothly. The hit-test point is the centre of the anti-hero
      // sprite — same `(spacing, sprite_size * 0.35)` offset the icon
      // draw routine uses below, so the hover ring sits exactly on
      // the painted anti-hero face.
      //
      const r2 = ICON_DRAW_R
      const iconY = descriptionLayout.row2.iconY + r2 * 0.6 + ICON_TWO_HEROES_Y_EXTRA
      const antiHeroCX = descriptionLayout.row2.iconX + r2 * 0.85
      const antiHeroCY = iconY - r2 * 0.85 * 0.35
      const mp = TouchInput.getPointerPos(k)
      const dx = mp.x - antiHeroCX
      const dy = mp.y - antiHeroCY
      const distSq = dx * dx + dy * dy
      //
      // When hovering, advance pulse phase and oscillate the target scale like the
      // checkmark / red circle in the menu; when not hovering, return to 1.0
      //
      const isHovering = distSq < ANTIHERO_HOVER_RADIUS * ANTIHERO_HOVER_RADIUS
      if (isHovering) {
        iconAnim.antiHeroPulsePhase += dt * ANTIHERO_PULSE_SPEED
        iconAnim.antiHeroTargetScale = ANTIHERO_HOVER_BASE + ANTIHERO_HOVER_AMP * Math.sin(iconAnim.antiHeroPulsePhase)
      } else {
        iconAnim.antiHeroTargetScale = 1.0
      }
      iconAnim.antiHeroScale += (iconAnim.antiHeroTargetScale - iconAnim.antiHeroScale) * Math.min(1, ANTIHERO_HOVER_LERP_SPEED * dt)
    })
    //
    // Icon illustrations beside each centred section label row
    //
    k.add([k.pos(0, 0), k.z(Z_TEXT), { draw() { onDrawIconIllustrations(k, iconAnim, descriptionLayout) } }])
    //
    // Title text (crawling letters detach from this)
    //
    const outlineOffsets = [[-2,-2],[0,-2],[2,-2],[-2,0],[2,0],[-2,2],[0,2],[2,2]]
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
      spiders.push(spider)
    })
    let hintFlickerTime = HINT_FLICKER_DURATION
    let hintDirection = -1
    let titleFlickerPhase = 0
    k.onUpdate(() => {
      const dt = k.dt()
      spiderState.timer += dt
      spiders.forEach(spider => updateSpider(k, spider, dt, SPIDER_MAX_OPACITY, true))
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
// Draws the darkened background image
//
function onDrawBg(k) {
  k.drawSprite({
    sprite: "menu-bg",
    width: k.width(),
    height: k.height(),
    opacity: 0.5
  })
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
// The moon glow is baked directly into the menu-bg sprite as a
// smooth radial gradient (see `menu-bg-generator.js#drawMoon`), so no
// runtime moon-glow draw layer is needed in the ready scene.
//
//
// Draws the center illustration: life-ready.png as the creature + hero sprite overlaid in front.
// illAnim carries the current eye wander state for the hero sprite.
//
function onDrawIllustration(k, illAnim) {
  //
  // life-ready.png: fully opaque, reduced size, positioned next to the hero
  //
  k.drawSprite({
    sprite: "life-ready",
    pos: k.vec2(LIFE_X, LIFE_Y),
    width: LIFE_WIDTH,
    height: LIFE_HEIGHT,
    opacity: LIFE_OPACITY
  })
  //
  // Hero sprite with animated eyes (idle wander matching hero.js behaviour)
  //
  const eyeX = Math.round(illAnim.eyeX)
  const eyeY = Math.round(illAnim.eyeY)
  k.drawSprite({
    sprite: `${HERO_ILLUSTRATION_SPRITE_PREFIX}_${eyeX}_${eyeY}`,
    pos: k.vec2(HERO_X - HERO_ILLUSTRATION_SPRITE_SIZE / 2, HERO_Y - HERO_ILLUSTRATION_SPRITE_SIZE),
    width: HERO_ILLUSTRATION_SPRITE_SIZE,
    height: HERO_ILLUSTRATION_SPRITE_SIZE,
    opacity: 1.0
  })
}
//
// Adds the full centred description block below the black horizon.
// Returns the layout descriptor (icon coordinates per label row) so
// the icon overlay + hover hit-test can reuse the exact same row Y
// values the text was placed at.
//
function addDescriptionBlock(k) {
  const z = Z_TEXT
  const narrativeFont = "'JetBrains Mono Thin', 'JetBrains Mono', monospace"
  const labelFont = "'JetBrains Mono', monospace"
  const descFont = "'JetBrains Mono Thin', 'JetBrains Mono', monospace"
  //
  // Narrative — four monospaced lines with near-equal character counts
  // (≈ 30–35 each in JetBrains Mono) so every line ends at roughly
  // the same horizontal width when centred under the horizon strip.
  //
  const narrativeLines = [
    'Six worlds await you — time, touch, words,',
    'feelings, mind, and stress. Each hides a piece',
    'of you. Play against Life to find yourself.'
  ]
  let cursorY = DESCRIPTION_START_Y
  for (const line of narrativeLines) {
    addCenteredSegment(k, line, CENTER_X, cursorY, z, TEXT_FONT_SIZE, narrativeFont, COLOR_TEXT_GRAY)
    cursorY += TEXT_LINE_HEIGHT
  }
  cursorY += DESCRIPTION_BLOCK_GAP
  //
  // Section label rows — "Collect fragments" + "Find the other peaces
  // of you". Both rows share the SAME left edge so the icon + label
  // pair lines up vertically into a clean left-aligned column. The
  // desc line under each label uses the same left X as the label so
  // the whole row reads as one left-aligned block.
  //
  const rows = [
    { label: 'Collect fragments', desc: 'Pieces of you. Scattered everywhere.' },
    { label: 'Find the other peaces of you', desc: 'Touch them. Know them.' }
  ]
  const layoutRows = []
  rows.forEach((row, rowIdx) => {
    //
    // Goal label sits to the left of the first orange bullet row only
    //
    rowIdx === 0 && addSegment(k, 'your goal is to', GOAL_LABEL_X, cursorY + 35, z, ICON_LABEL_FONT_SIZE, narrativeFont, COLOR_TEXT_GRAY)
    const rowMeta = addLeftAlignedIconLabelRow(k, row.label, row.desc, cursorY, z, labelFont, descFont)
    layoutRows.push(rowMeta)
    cursorY += ICON_ROW_HEIGHT
  })
  return { row1: layoutRows[0], row2: layoutRows[1] }
}
//
// Renders a single icon+label+desc row LEFT-ALIGNED at
// `LABEL_BLOCK_LEFT_X`. The icon hugs the column's left edge, the
// label follows on the same line, and the desc sits on a second line
// at the same X as the label.
//
function addLeftAlignedIconLabelRow(k, label, desc, rowY, z, labelFont, descFont) {
  //
  // Icon centre sits half a radius right of the column left edge.
  // Label / desc text use anchor 'left' starting just past the icon
  // plus the label gap.
  //
  const iconCenterX = LABEL_BLOCK_LEFT_X + ICON_DRAW_R
  const textLeftX = LABEL_BLOCK_LEFT_X + ICON_DRAW_R * 2 + ICON_LABEL_GAP
  addSegment(k, label, textLeftX, rowY, z, ICON_LABEL_FONT_SIZE, labelFont, COLOR_WARM_ORANGE)
  addSegment(k, desc, textLeftX, rowY + ICON_LABEL_DESC_OFFSET_Y, z, ICON_LABEL_DESC_FONT_SIZE, descFont, COLOR_TEXT_GRAY)
  return { iconX: iconCenterX, iconY: rowY }
}
//
// Draws the two small icon illustrations next to their centred
// section label rows. Coordinates come from the description-block
// layout descriptor so the icons always line up with the row text.
//
function onDrawIconIllustrations(k, iconAnim, descriptionLayout) {
  const r = ICON_DRAW_R
  //
  // Icon 1: "Collect fragments" — animated sun-bunny sparkle glow
  //
  drawFragmentIcon(k, descriptionLayout.row1.iconX, descriptionLayout.row1.iconY + r * 0.6, iconAnim.sparklePhase)
  //
  // Icon 2: "Find the other you" — hero + anti-hero with electric connection
  //
  drawTwoHeroesIcon(k, descriptionLayout.row2.iconX, descriptionLayout.row2.iconY + r * 0.6 + ICON_TWO_HEROES_Y_EXTRA, iconAnim)
}
//
// Icon 1: animated sun-bunny sparkle — outer glow + bright core pulse
//
function drawFragmentIcon(k, cx, cy, sparklePhase) {
  const pulse = 0.5 + 0.5 * Math.abs(Math.sin(sparklePhase))
  //
  // Sparkle glint is warm amber gold — the same accent the rest of
  // the scene uses for warm focal points (title, anti-hero, emphasis
  // text). Replaces the previous near-white cream so the "fragment"
  // visibly reads as on-palette warm light against the deep teal frame.
  //
  const glintColor = k.rgb(244, 192, 64)
  const r = SPARKLE_INNER_R * (0.6 + pulse * 0.4)
  //
  // Soft outer glow
  //
  k.drawCircle({ pos: k.vec2(cx, cy), radius: SPARKLE_OUTER_R * pulse, color: glintColor, opacity: 0.15 * pulse })
  //
  // Bright core
  //
  k.drawCircle({ pos: k.vec2(cx, cy), radius: r, color: glintColor, opacity: 0.85 * pulse })
}
//
// Icon 2: hero + anti-hero sprites with animated electric connection
//
function drawTwoHeroesIcon(k, cx, cy, iconAnim) {
  const { heartbeatPhase, antiHeroScale } = iconAnim
  const r = ICON_DRAW_R
  const hh = r * 0.85
  //
  // Compact icon scale — stays small beside the label row, matching
  // the original layout before the mistaken 96 px enlargement.
  //
  const spacing = r * 0.85
  const spSize = hh * 2.2
  const midY = cy - hh * 0.35
  //
  // Connection drawn FIRST (underneath sprites) so the sprites render on top
  // and cover the faded lightning endpoints — no visible gap between arc and bodies.
  // Endpoints at each sprite center so the connection clearly starts inside each body.
  //
  drawConnectionWave(k,
    { x: cx - spacing, y: midY },
    { x: cx + spacing, y: midY },
    { segmentWidth: 5, mainWidth: 1.8, opacity: 0.55, heartbeatPhase }
  )
  //
  // Hero sprite (left) — drawn after connection to overlap faded arc ends
  //
  k.drawSprite({
    sprite: HERO_SPRITE_NAME,
    pos: k.vec2(cx - spacing - spSize / 2, cy - spSize * 0.9),
    width: spSize,
    height: spSize,
    opacity: 0.9
  })
  //
  // Anti-hero sprite (right) with hover scale effect
  //
  const ahSize = spSize * antiHeroScale
  k.drawSprite({
    sprite: ANTIHERO_SPRITE_NAME,
    pos: k.vec2(cx + spacing - ahSize / 2, cy - ahSize * 0.9),
    width: ahSize,
    height: ahSize,
    opacity: 0.9
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
    settled: false
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
  //
  const totalStringWidth = titleString.length * charWidth
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
    const charX = startX + (charIndex * charWidth) + (charWidth / 2)
    const charY = titleTextObj.pos.y
    letterInfos.push({
      textObj: titleTextObj,
      charIndex,
      char,
      x: charX,
      y: charY,
      color: brighterColor,
      fontSize,
      fontFamily
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
    const outlineOffsets = [[-2,-2],[0,-2],[2,-2],[-2,0],[2,0],[-2,2],[0,2],[2,2]]
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
// Adds a text segment with 4-corner black outline (1px offset) then the colored text on top.
// Used by addDescriptionBlock to give body text a readable dark stroke.
//
function addSegment(k, text, x, y, z, size, font, colorHex) {
  const offsets = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
  offsets.forEach(([dx, dy]) => {
    k.add([
      k.text(text, { size, font }),
      k.pos(x + dx, y + dy),
      k.anchor('left'),
      k.color(0, 0, 0),
      k.z(z - 1)
    ])
  })
  return k.add([
    k.text(text, { size, font }),
    k.pos(x, y),
    k.anchor('left'),
    getColor(k, colorHex),
    k.z(z)
  ])
}
//
// Centred variant of addSegment — places the text + 4-corner outline
// with anchor 'center' so the line sits at `(x, y)` by its midpoint.
//
function addCenteredSegment(k, text, x, y, z, size, font, colorHex) {
  const offsets = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
  offsets.forEach(([dx, dy]) => {
    k.add([
      k.text(text, { size, font }),
      k.pos(x + dx, y + dy),
      k.anchor('center'),
      k.color(0, 0, 0),
      k.z(z - 1)
    ])
  })
  return k.add([
    k.text(text, { size, font }),
    k.pos(x, y),
    k.anchor('center'),
    getColor(k, colorHex),
    k.z(z)
  ])
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
