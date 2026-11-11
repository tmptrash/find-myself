import * as Sound from "../utils/sound.js"
import { CFG } from "../cfg.js"
import { getRGB, bindBackToMenuKeys, bindStartGameKeys } from "../utils/helper.js"
import * as Hero from "../components/hero.js"
import { showTransitionToLevel } from "../utils/transition.js"
import { goAfterPreparingAssets } from "../utils/lesson-assets.js"
import { getProgress, get, set, normalizeSceneName } from "../utils/progress.js"
import * as BootLoader from "../utils/boot-loader.js"
import * as CanvasBackdrop from "../utils/canvas-backdrop.js"
import { bindPointerActivate } from '../utils/pointer-activate.js'
import { registerEngineTeardown } from '../utils/engine-teardown.js'
import { generateMenuBackgroundCanvas, recomputeMenuBgLayout } from '../utils/menu-bg-generator.js'
import { generateForestMenuBackdrop, forestMenuLayout, loadForestMenuBackdropArt } from '../sections/forest/utils/forest-menu-bg.js'
import { bakeForestLakeStonePile } from '../sections/forest/utils/forest-stones.js'
import * as Clouds from '../sections/forest/utils/forest-clouds.js'
import * as ChainBuoy from '../sections/forest/utils/forest-chain-buoy.js'
import { forestEyeBerryColors } from '../sections/forest/utils/forest-eye-berry.js'
import { FOREST_PAL, getForestLightRgb } from '../sections/forest/utils/forest-palette.js'
import { isTouchDevice } from '../utils/touch-input.js'
import * as Lake from '../sections/forest/utils/forest-lake.js'
import * as BombTree from '../sections/forest/utils/forest-bomb-tree.js'
import * as Predator from '../sections/forest/components/predator.js'
import * as SpikyTomato from '../sections/forest/components/spiky-tomato.js'
import * as AppleBug from '../sections/forest/components/apple-bug.js'
import * as WaterFlower from '../sections/forest/components/water-flower.js'
import * as PropellerBud from '../sections/forest/components/propeller-bud.js'
import * as TreeFruit from '../sections/forest/utils/forest-tree-fruit.js'
import { bakeLeftTreeApple, leftTreeApplePicture, leftTreeApples } from '../sections/forest/utils/forest-left-tree.js'
import { createForestMidges, updateForestMidges } from '../sections/forest/utils/forest-level-atmosphere.js'
import * as MenuEyeStalk from '../sections/forest/components/menu-eye-stalk.js'
import * as GlowMushroom from '../sections/cave/components/glow-mushroom.js'
import * as CaveMenuBg from '../sections/cave/utils/cave-menu-bg.js'
import * as ConfirmDialog from '../components/confirm-dialog.js'
import * as QuestionDrift from '../components/question-drift.js'
import { addForestFilmGrainOverlayLayer, applyForestFilmGrainToCanvas } from '../sections/forest/utils/forest-parallax-grain.js'
//
// Level list: a vertical column of levels, the hero standing left of it as
// the cursor. A level the player can enter shows its picture (the forest's
// stalk-eye, the cave's glowing mushroom); every other level is a
// "?" crossed by the red prohibition sign. A level hidden until reached
// shows a plain "?" (and cannot be entered) until the hero has got there,
// over a black backdrop of
// drifting "?" glyphs. Each level owns a backdrop: on a switch the old one
// fades out, then the selected one fades in.
//
const BACKDROP_FOREST = 'forest'
const BACKDROP_CAVE = 'cave'
const BACKDROP_NIGHT = 'night'
const BACKDROP_MYSTERY = 'mystery'
const LEVEL_ICON_EYE_STALK = 'eyeStalk'
const LEVEL_ICON_GLOW_MUSHROOM = 'glowMushroom'
const FOREST_LESSON_PREFIX = 'lesson-forest.'
const FOREST_FIRST_LESSON = 'lesson-forest.0'
const CAVE_LESSON_PREFIX = 'lesson-cave.'
const CAVE_FIRST_LESSON = 'lesson-cave.0'
//
// Cave icon: one of the level's always-lit mushrooms, standing on the row.
//
const MENU_GLOW_MUSHROOM_SCALE = 0.8
const MENU_GLOW_MUSHROOM_SEED = 23
const LEVELS = [
  {
    section: 'forest',
    icon: LEVEL_ICON_EYE_STALK,
    backdrop: BACKDROP_FOREST,
    dialog: ConfirmDialog.LOOKS.FOREST,
    lessonPrefix: FOREST_LESSON_PREFIX,
    firstLesson: FOREST_FIRST_LESSON
  },
  {
    section: 'cave',
    icon: LEVEL_ICON_GLOW_MUSHROOM,
    hiddenUntilReached: true,
    backdrop: BACKDROP_CAVE,
    dialog: ConfirmDialog.LOOKS.CAVE,
    lessonPrefix: CAVE_LESSON_PREFIX,
    firstLesson: CAVE_FIRST_LESSON
  }
]
//
// Layout in design px at MENU_REF_HEIGHT, scaled with the window height (and
// with the width on a narrow window — a phone held upright — so the key hint
// fits across at MENU_REF_WIDTH); the column stands at MENU_COLUMN_X_FRAC of
// the width, never so far left that the level panel leaves the screen
// (MENU_PANEL_MIN_MARGIN), centred on MENU_COLUMN_Y_FRAC of the height.
//
const MENU_REF_HEIGHT = 1080
const MENU_REF_WIDTH = 760
const MENU_PANEL_MIN_MARGIN = 12
//
// On small layouts (a phone) the hero cursor shrinks with the layout like the
// level icons; on larger ones it stays at 1:1 so its pixel art stays crisp.
//
const MENU_COMPACT_MAX_S = 700 / MENU_REF_HEIGHT
const MENU_COLUMN_X_FRAC = 0.2
const MENU_COLUMN_Y_FRAC = 0.5
const MENU_ITEM_STEP = 112
const MENU_HERO_GAP = 118
const MENU_HINT_BOTTOM = 26
//
// Level panel: a vertical rounded card behind the hero and the four level
// icons (design px): it reaches PANEL_LEFT_PAD left of the hero, PANEL_RIGHT_PAD
// right of the icons and PANEL_END_SHARE of a row step past the first and
// last rows. The card is the forest-teal fill at PANEL_FILL_ALPHA, a lit top
// band fading out over PANEL_LIGHT_SHARE of its height and a dark contour;
// baked once per live k and window size, film grain included.
//
const MENU_PANEL_LEFT_PAD = 68
const MENU_PANEL_RIGHT_PAD = 78
const MENU_PANEL_END_SHARE = 0.62
const MENU_PANEL_RADIUS = 34
const MENU_PANEL_FILL_ALPHA = 0.84
const MENU_PANEL_LIGHT_ALPHA = 0.16
const MENU_PANEL_LIGHT_SHARE = 0.32
const MENU_PANEL_CONTOUR_W = 3
const MENU_PANEL_PAD = 4
const MENU_PANEL_SPRITE = 'menu-level-panel'
const MENU_PANEL_GRAIN_SEED = 4423
//
// Mouse hover band of one row: from the hero's spot past the icon.
//
const MENU_ROW_LEFT_PAD = 50
const MENU_ROW_RIGHT_REACH = 80
//
// Hero glide between rows and the gentle breathing pulse of the selected icon.
//
const MENU_HERO_EASE = 12
const MENU_SELECT_PULSE_AMP = 0.06
const MENU_SELECT_PULSE_SPEED = 2.8
const MENU_SELECT_SCALE_EASE = 8
//
// A selected "?" (a level not reached or locked) rocks side to side round
// its centre (degrees, radians per second); off the row it settles upright.
//
const MENU_QUESTION_ROCK_AMP = 12
const MENU_QUESTION_ROCK_SPEED = 3.2
const MENU_QUESTION_ROCK_EASE = 8
//
// Backdrop switch: the old level's picture fades out first (seconds), and
// only once it is gone the new one fades in. Texts fade (per second,
// eased).
//
const BG_FADE_OUT_TIME = 0.35
const BG_FADE_IN_TIME = 0.5
const MENU_FADE_EPS = 0.01
//
// Night backdrop for the levels without their own picture: the darkened
// menu-bg forest blended over the scene base colour, baked once per k.
//
const MENU_NIGHT_SPRITE = 'menu-night-bg'
const MENU_NIGHT_ALPHA = 0.35
//
// Full-screen sprites live in a texture atlas: linear sampling at the very
// edge rows pulls in neighbour texels. Drawing overscanned by one pixel
// pushes those rows off-screen.
//
const MENU_BG_EDGE_OVERSCAN = 1
const MENU_FOREST_LAYER_SPRITE = 'menu-forest-layer'
//
// Live decor of the forest backdrop without its own fade (stalk eyes, the
// crawler) shows once the forest backdrop is mostly in.
//
const MENU_FOREST_LIVE_MIN_OPACITY = 0.5
const MENU_LAKE_SPRITE_KEY = 'menu'
//
// The lake's right bank edge is ragged like the level's (px), and the
// level's clouds drift this far under the screen top.
//
const MENU_LAKE_BANK_JAG = 22
const MENU_CLOUD_TOP = 24
//
// The crawler roams the ground east of the lake, heading for a new random
// spot every few seconds; it never hunts the menu hero.
//
const MENU_CRAWLER_RETARGET_MIN = 2.5
const MENU_CRAWLER_RETARGET_RANGE = 4
//
// The apple tree lives as in the level: apples hang in its crown
// (MENU_TREE_APPLES at first). The water flower at the trunk
// (MENU_WATER_FLOWER_SHIFT design px right of it) grows its drop from the
// start (MENU_FLOWER_START_DELAY); once it is full it falls on its own
// after MENU_FLOWER_WAIT_MIN..+RANGE s, waters the tree, a new apple grows
// and MENU_APPLE_FALL_AFTER s later an apple falls (again MENU_APPLE_RETRY
// s later while one still lies on the ground); then the next drop. The
// apple bug lives in its burrow by the tree (its cave under it) and midges
// hang over the lake for the bug's tongue. All of it draws over the baked
// forest, under the level panel.
//
const MENU_TREE_APPLES = 3
const MENU_FLOWER_START_DELAY = 1
const MENU_FLOWER_WAIT_MIN = 1
const MENU_FLOWER_WAIT_RANGE = 2
const MENU_APPLE_FALL_AFTER = 7
const MENU_APPLE_RETRY = 2
const MENU_WATER_FLOWER_SHIFT = 15
const MENU_BUG_TUNNEL_Z = 1
const MENU_WATER_FLOWER_Z = 2.5
const MENU_FRUIT_Z = 3
const MENU_BUG_Z = 3.5
const MENU_MIDGE_Z = 4
const MENU_MIDGE_LIGHT = 'bright'
//
// Valera the propeller bud flies to and fro between the two big trees'
// branches, resting MENU_BUD_REST seconds on each: on the left one
// MENU_BUD_LEFT_SHARE of the way in from its leafy tip, on the right one
// MENU_BUD_RIGHT_SHARE of the way out from the trunk (as in the level).
// It is drawn at the backdrop's scale, in front of the trees.
//
const MENU_BUD_REST = { min: 3, max: 10 }
const MENU_BUD_LEFT_SHARE = 0.3
const MENU_BUD_RIGHT_SHARE = 0.4
const MENU_BUD_Z = 3.6
const MENU_BUD_ROOTS_Z = MENU_BUG_TUNNEL_Z
//
// Valera's propeller whirr in the backdrop: no hero walks near it there, so
// it whirrs as if the hero stood this near (loudness goes with its square:
// about half of its full whirr) whenever it flies.
//
const MENU_BUD_HUM_LEVEL = 0.7
//
// Draw layers.
//
const MENU_BG_Z = 0
const MENU_PANEL_Z = 5
const MENU_ICON_Z = 10
const MENU_TEXT_Z = 20
const MENU_FILM_GRAIN_Z = CFG.visual.zIndex.ui + 20
const MENU_LEAVE_COVER_Z = CFG.visual.zIndex.ui + 1000
//
// "?" glyph and the red prohibition sign over it (ring + slash). The glyph
// is baked into a canvas sized to its ink box, so its centre is the circle's.
//
const MENU_QUESTION_MARK_TEXT = '?'
const MENU_QUESTION_MARK_SIZE = 72
const MENU_QUESTION_MARK_HEX = FOREST_PAL.lightGray
const MENU_QUESTION_MARK_SPRITE = 'menu-question-mark'
const MENU_QUESTION_MARK_SHADOW_OFFSET = 3
const MENU_QUESTION_MARK_PAD = 4
//
// Optical nudge: the glyph's bowl hangs left of its stem, so a box-centred
// "?" still reads left of the ring's centre.
//
const MENU_QUESTION_MARK_NUDGE_X = 4
const PROHIBITED_RING_RADIUS = 40
const PROHIBITED_RING_SEGMENTS = 36
const PROHIBITED_RING_WIDTH = 5
const PROHIBITED_SLASH_WIDTH = 7
const PROHIBITED_SLASH_REACH = 0.72
const PROHIBITED_COLOR = FOREST_PAL.menuProhibited
//
// Baked texts: the key hint (centred), in the regular font with a dark drop
// shadow.
//
const MENU_TEXT_FONT = CFG.visual.fonts.regularFull
const MENU_TEXT_HEX = CFG.visual.colors.hero.eyeWhite
const MENU_TEXT_SHADOW_HEX = CFG.visual.colors.outline
//
// Key hint at the bottom: key names in the hint gold, their meaning in the
// text cream, pairs spaced apart.
//
const MENU_HINT_SIZE = 16
const MENU_HINT_OPACITY = 0.8
const MENU_HINT_ITEMS = [
  { key: '↑ ↓', label: 'choose' },
  { key: 'space', label: 'play' },
  { key: 'enter', label: 'restart' },
  { key: 'esc', label: 'back' }
]
const MENU_HINT_KEY_GAP = ' '
const MENU_HINT_ITEM_GAP = '     '
const MENU_HINT_SPRITE = 'menu-hint'
const MENU_HINT_PAD = 4
const MENU_HINT_SHADOW_OFFSET = 1.5
const MENU_HINT_GRAIN_SEED = 4411
//
// Restart confirm dialog (Enter on a playable level): Yes clears that
// level's saved state and starts it from its first lesson.
//
const MENU_RESTART_QUESTION = 'Are you sure you want to start\nthis level from the beginning?'
const MENU_RESTART_YES = 'Yes'
const MENU_RESTART_NO = 'No'
const MENU_DIALOG_Z = CFG.visual.zIndex.ui + 10
const MENU_KEY_RESTART = 'enter'
const MENU_KEY_BACK = 'escape'
//
// Space / Enter / Esc are heard twice per press (window keydown before the
// canvas has focus, then Kaplay's own key press): a repeat of the same key
// within this window is the same press.
//
const MENU_KEY_REPEAT_GUARD = 0.25
//
// The hero's eyes dart around while it waits: a new glance every
// MENU_GLANCE_MIN..+RANGE seconds at a random spot this far around the hero.
//
const MENU_GLANCE_MIN = 0.25
const MENU_GLANCE_RANGE = 0.9
const MENU_GLANCE_REACH_X = 220
const MENU_GLANCE_REACH_Y = 160
//
// Menu sound follows the selected level: the forest level's birds.mp3
// fades in (over MENU_BIRDS_FADE_SEC) while the forest row is selected and
// out on any other row (the other levels have no menu sound yet).
//
const MENU_BIRDS_VOLUME = CFG.audio.backgroundMusic.birds
const MENU_BIRDS_FADE_SEC = 1.5
//
// Section-complete markers saved as lastLesson point at the next section's
// first lesson.
//
const MENU_COMPLETE_NEXT_LESSON = {
  'forest-complete': CAVE_FIRST_LESSON
}
const MENU_SCENE_GUARD_DELAY = 0.2
const MENU_PREWARM_YIELD_FRAMES = 2
const menuPrewarmedSize = new WeakMap()
const MENU_LEAVE_BG_HEX = '#1A1A1A'
const MENU_HUSH_INTERVAL_MS = 200
const MENU_HUSH_DURATION_MS = 8000

/**
 * Menu scene: a vertical level column with the hero as the cursor.
 * @param {Object} k - Kaplay instance
 */
export function sceneMenu(k) {
  k.scene("menu", () => {
    //
    // Native-resolution engine: every layout value comes from the live window.
    //
    recomputeMenuBgLayout(k.width(), k.height())
    if (k.transitionCleanup) {
      try { k.transitionCleanup() } catch (_) { /* stale cleanup */ }
      k.transitionCleanup = null
    }
    k.volume(1)
    k.setGravity(0)
    CanvasBackdrop.applyCanvasBackdrop(k, CFG.visual.colors.ready.background)
    const lastLevel = syncMenuLastLesson()
    const progress = getProgress()
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    const music = startMenuMusic(k)
    registerEngineTeardown(() => stopMenuLoops(music, sound))
    loadMenuAssets(k)
    const layout = computeMenuLayout(k)
    const levels = LEVELS.map((level, i) => buildMenuLevel(level, i, layout, progress))
    const selected = Math.max(0, levels.findIndex(level => lastLevel?.startsWith(`lesson-${level.section}.`)))
    const heroInst = Hero.create({
      k,
      x: layout.heroX,
      y: levels[selected].y,
      type: Hero.HEROES.HERO,
      controllable: false,
      isStatic: true,
      idleVocalization: null,
      sfx: sound,
      drawScale: menuHeroDrawScale(layout)
    })
    Hero.setAwakeOverride(heroInst, true)
    const forestLayout = forestMenuLayout(k.width(), k.height())
    const forestPieces = loadMenuForestLayerSprites(k)
    const inst = {
      k,
      sound,
      music,
      layout,
      levels,
      selected,
      lastLevel,
      heroInst,
      heroY: levels[selected].y,
      lastMouse: { x: k.mousePos().x, y: k.mousePos().y },
      glanceT: 0,
      lastKey: null,
      lastKeyAt: 0,
      isLeavingScene: false,
      sceneReady: false,
      bgOpacity: { [BACKDROP_FOREST]: 0, [BACKDROP_CAVE]: 0, [BACKDROP_NIGHT]: 0, [BACKDROP_MYSTERY]: 0 },
      caveBg: CaveMenuBg.create({ k, width: k.width(), height: k.height() }),
      mysteryBg: QuestionDrift.create({
        k,
        width: k.width(),
        height: k.height(),
        s: layout.s,
        sprite: questionMarkSpriteName(layout.s),
        color: CFG.visual.colors.menu.mysteryBg,
        shadowColor: CFG.visual.colors.menu.mysteryShadow
      }),
      forestLayout,
      forestPieces,
      forestEyes: ChainBuoy.create({ k, spots: forestLayout.eyeSpots, earthBottomY: k.height() }),
      lake: createMenuLake(k, forestLayout),
      earTrees: BombTree.create({
        k,
        spots: forestLayout.earTreeSpots.map(spot => ({ x: spot.x, groundY: forestLayout.groundY }))
      }),
      clouds: Clouds.create({ k, x1: 0, x2: k.width(), topY: MENU_CLOUD_TOP }),
      crawlerT: 0,
      forestLife: null,
      closed: false
    }
    inst.shorePile = loadMenuShorePile(k, inst.lake)
    inst.tomatoes = SpikyTomato.create({
      k,
      earTrees: inst.earTrees,
      particles: null,
      sfx: sound,
      groundY: forestLayout.groundY
    })
    inst.crawler = createMenuCrawler(inst)
    startMenuForestLife(inst)
    inst.bgOpacity[levels[selected].backdrop] = 1
    createMenuEyeStalks(inst)
    k.add([k.z(MENU_BG_Z), { draw: () => drawBackdrops(inst) }])
    inst.panel = loadMenuPanel(k, layout)
    k.add([k.z(MENU_PANEL_Z), { draw: () => drawMenuPanel(inst) }])
    k.add([k.z(MENU_ICON_Z), { draw: () => drawLevelIcons(inst) }])
    k.add([k.z(MENU_TEXT_Z), { draw: () => drawLevelTexts(inst) }])
    inst.dialogs = Object.fromEntries(Object.values(ConfirmDialog.LOOKS).map(look => [look, createRestartDialog(inst, look)]))
    inst.dialog = inst.dialogs[ConfirmDialog.LOOKS.FOREST]
    k.add([k.z(MENU_LEAVE_COVER_Z), { draw: () => drawLeaveCover(inst) }])
    addForestFilmGrainOverlayLayer(k, MENU_FILM_GRAIN_Z)
    k.onUpdate(() => onUpdate(inst))
    bindMenuInput(inst)
    k.wait(MENU_SCENE_GUARD_DELAY, () => { inst.sceneReady = true })
    k.onSceneLeave(() => onMenuLeave(inst))
  })
}

/**
 * Bakes the menu's heavy static assets ahead of time on the given live
 * Kaplay instance — the backdrops (night, forest, cave) for the current window size, the hero
 * cursor and the baked texts. Called under the first boot loader, so the
 * first menu visit only reuses loaded sprites.
 * @param {Object} k - Kaplay inst (native-resolution engine)
 * @returns {Promise<void>} Resolves when every bake is loaded into k
 */
export async function prewarmMenuAssets(k) {
  const size = menuBakeSize(k)
  recomputeMenuBgLayout(k.width(), k.height())
  await Promise.all([loadForestMenuBackdropArt(), Clouds.loadForestClouds(), ConfirmDialog.loadConfirmDialogArt(), loadMenuForestLife(k)])
  buildMenuNightSprite(k)
  await BootLoader.yieldForGpu(MENU_PREWARM_YIELD_FRAMES)
  loadMenuForestLayerSprites(k)
  await BootLoader.yieldForGpu(MENU_PREWARM_YIELD_FRAMES)
  CaveMenuBg.prewarm(k, k.width(), k.height())
  await BootLoader.yieldForGpu(MENU_PREWARM_YIELD_FRAMES)
  await document.fonts?.load?.(`${MENU_HINT_SIZE}px ${MENU_TEXT_FONT}`)
  loadMenuAssets(k)
  menuPrewarmedSize.set(k, size)
}

/**
 * Whether the menu's bakes are ready for this live k at its current screen
 * size (the window may have changed since — a tablet's browser bar, the
 * fullscreen button — and then the menu would bake everything again while
 * entering, freezing the screen).
 * @param {Object} k - Kaplay inst
 * @returns {boolean}
 */
export function isMenuPrewarmed(k) {
  return menuPrewarmedSize.get(k) === menuBakeSize(k)
}
function menuBakeSize(k) {
  return `${Math.round(k.width())}x${Math.round(k.height())}`
}

function menuHeroDrawScale(layout) {
  return layout.s < MENU_COMPACT_MAX_S ? layout.s : 1
}
//
// Per-level row state: position, what it shows and whether it can be entered.
//
function buildMenuLevel(level, index, layout, progress) {
  const section = progress[level.section]
  const completed = Boolean(section?.completed)
  const reached = completed || Boolean(section?.reached) || Boolean(progress.lastLesson?.startsWith(level.lessonPrefix))
  const mystery = Boolean(level.hiddenUntilReached) && !reached
  const playable = Boolean(level.icon) && !mystery
  return {
    ...level,
    index,
    y: layout.firstY + index * layout.step,
    completed,
    reached,
    mystery,
    backdrop: mystery ? BACKDROP_MYSTERY : level.backdrop,
    playable,
    selectScale: 1,
    questionAngle: 0
  }
}
//
// Window-derived layout: column and hero X, row Y spacing,
// hint Y.
//
function computeMenuLayout(k) {
  const s = Math.min(k.height() / MENU_REF_HEIGHT, k.width() / MENU_REF_WIDTH)
  const step = MENU_ITEM_STEP * s
  const panelReach = (MENU_HERO_GAP + MENU_PANEL_LEFT_PAD + MENU_PANEL_PAD) * s + MENU_PANEL_MIN_MARGIN
  const columnX = Math.round(Math.max(k.width() * MENU_COLUMN_X_FRAC, panelReach))
  return {
    s,
    step,
    columnX,
    heroX: columnX - MENU_HERO_GAP * s,
    firstY: k.height() * MENU_COLUMN_Y_FRAC - step * (LEVELS.length - 1) / 2,
    hintY: k.height() - MENU_HINT_BOTTOM * s
  }
}
//
// The forest icon is one of the level's stalk-eyes cut short; its pupil
// follows the hero (no size pulse on selection).
//
function createMenuEyeStalks(inst) {
  const { k } = inst
  inst.levels.filter(level => level.icon === LEVEL_ICON_EYE_STALK).forEach(level => {
    const pose = { x: inst.layout.columnX, y: level.y, scale: 1 }
    MenuEyeStalk.create({
      k,
      z: MENU_ICON_Z,
      getPose: () => {
        pose.scale = inst.layout.s * level.selectScale
        return pose
      },
      getLookAt: () => inst.heroInst.character.pos,
      isVisible: () => !inst.isLeavingScene
    })
  })
  inst.glowMushrooms = inst.levels.filter(level => level.icon === LEVEL_ICON_GLOW_MUSHROOM && !level.mystery).map(level => ({
    level,
    mushroom: GlowMushroom.create({ k, x: inst.layout.columnX, y: level.y, seed: MENU_GLOW_MUSHROOM_SEED, moss: false })
  }))
}
//
// Keyboard and mouse bindings. Menu: up/down (w/s) choose, Space enters the
// selected level, Enter asks to restart it, Esc goes back; hover
// selects a row, a click enters it; on a touch device a tap off the level
// panel continues the last level. While the dialog is open every key and
// click goes to it instead.
//
function bindMenuInput(inst) {
  const { k } = inst
  inst.keyCancels = [
    k.onKeyPress('up', () => moveSelection(inst, -1)),
    k.onKeyPress('w', () => moveSelection(inst, -1)),
    k.onKeyPress('down', () => moveSelection(inst, 1)),
    k.onKeyPress('s', () => moveSelection(inst, 1)),
    k.onKeyPress('left', () => ConfirmDialog.moveSelection(inst.dialog, -1)),
    k.onKeyPress('a', () => ConfirmDialog.moveSelection(inst.dialog, -1)),
    k.onKeyPress('right', () => ConfirmDialog.moveSelection(inst.dialog, 1)),
    k.onKeyPress('d', () => ConfirmDialog.moveSelection(inst.dialog, 1))
  ]
  inst.startCancel = bindStartGameKeys(k, key => onStartKey(inst, key))
  inst.pointerCancel = bindPointerActivate(k, () => onPointerActivate(inst))
  inst.backCancel = bindBackToMenuKeys(k, () => onBackKey(inst))
}
//
// Space plays the selected level, Enter asks to restart it (playable
// levels only); with the dialog open both confirm its highlighted button.
//
function onStartKey(inst, key) {
  if (inst.isLeavingScene || isMenuTransitionBlocking(inst.k)) return
  if (isRepeatedKeyPress(inst, key)) return
  if (ConfirmDialog.isOpen(inst.dialog)) {
    ConfirmDialog.confirm(inst.dialog)
    return
  }
  const level = inst.levels[inst.selected]
  if (key !== MENU_KEY_RESTART) {
    enterLevel(inst, level)
    return
  }
  if (!level.playable) return
  inst.dialog = inst.dialogs[level.dialog ?? ConfirmDialog.LOOKS.FOREST]
  ConfirmDialog.open(inst.dialog)
}
//
// The restart question in one look (each level asks in its own: the forest
// signboard, the cave's pad leaf).
//
function createRestartDialog(inst, look) {
  return ConfirmDialog.create({
    k: inst.k,
    question: MENU_RESTART_QUESTION,
    yesLabel: MENU_RESTART_YES,
    noLabel: MENU_RESTART_NO,
    onYes: () => restartLevel(inst),
    defaultYes: true,
    onSelect: () => Sound.playMenuClickSound(inst.sound),
    z: MENU_DIALOG_Z,
    look
  })
}
//
// Steps the selection with wrap-around (last → first and back); with the
// dialog open, up/down move its highlight instead.
//
function moveSelection(inst, delta) {
  if (inst.isLeavingScene) return
  if (ConfirmDialog.isOpen(inst.dialog)) {
    ConfirmDialog.moveSelection(inst.dialog, delta)
    return
  }
  const count = inst.levels.length
  selectLevel(inst, (inst.selected + delta + count) % count)
}
function selectLevel(inst, index) {
  if (index === inst.selected) return
  inst.selected = index
  Sound.playMenuClickSound(inst.sound)
}
//
// A click on a row selects it and enters it; a click elsewhere does nothing.
//
function onPointerActivate(inst) {
  if (inst.isLeavingScene) return false
  if (ConfirmDialog.isOpen(inst.dialog)) {
    ConfirmDialog.click(inst.dialog)
    return true
  }
  const level = levelUnderPointer(inst)
  if (!level) return continueOnTouchOutsidePanel(inst)
  selectLevel(inst, level.index)
  enterLevel(inst, level)
  return true
}
//
// On a phone or tablet a tap anywhere off the level panel continues the
// level last played (the selected one when nothing is saved yet).
//
function continueOnTouchOutsidePanel(inst) {
  if (!isTouchDevice() || isPointerOnPanel(inst)) return false
  const saved = get('lastLesson', null)
  const level = inst.levels.find(row => saved?.startsWith(row.lessonPrefix)) ?? inst.levels[inst.selected]
  selectLevel(inst, level.index)
  enterLevel(inst, level)
  return true
}
function isPointerOnPanel(inst) {
  const { panel } = inst
  const pointer = inst.k.mousePos()
  return pointer.x >= panel.x && pointer.x <= panel.x + panel.w && pointer.y >= panel.y && pointer.y <= panel.y + panel.h
}
function onBackKey(inst) {
  if (!inst.sceneReady || inst.isLeavingScene || isMenuTransitionBlocking(inst.k)) return
  if (isRepeatedKeyPress(inst, MENU_KEY_BACK)) return
  if (ConfirmDialog.isOpen(inst.dialog)) {
    ConfirmDialog.close(inst.dialog)
    return
  }
  stopMenuLoops(inst.music, inst.sound)
  goAfterPreparingAssets(inst.k, "ready")
}
//
// Enters a playable level: it continues the saved lesson of that level or
// starts from its first one; locked levels ignore the press.
//
function enterLevel(inst, level) {
  if (!level.playable || inst.isLeavingScene || isMenuTransitionBlocking(inst.k)) return
  const saved = get('lastLesson', null)
  const lesson = saved?.startsWith(level.lessonPrefix) ? saved : level.firstLesson
  beginMenuSceneLeave(inst)
  stopMenuLoops(inst.music, inst.sound)
  showTransitionToLevel(inst.k, lesson)
}
//
// True for the second hearing of one key press (see MENU_KEY_REPEAT_GUARD).
//
function isRepeatedKeyPress(inst, key) {
  const now = inst.k.time()
  const repeated = inst.lastKey === key && now - inst.lastKeyAt < MENU_KEY_REPEAT_GUARD
  inst.lastKey = key
  inst.lastKeyAt = now
  return repeated
}
//
// "Yes" in the restart dialog: the selected level's saved state is cleared
// (its completed mark stays) and it starts from its first lesson. Every
// level after it is forgotten whole, so it is a "?" again until reached.
//
function restartLevel(inst) {
  const level = inst.levels[inst.selected]
  if (inst.isLeavingScene || !level.playable) return
  const fresh = { completed: level.completed, ...(level.hiddenUntilReached && level.reached ? { reached: true } : {}) }
  //
  // A restart is not the first start: the forest flower fills at once.
  //
  level.section === 'forest' && (fresh.flowerSeen = true)
  set(level.section, fresh)
  inst.levels.slice(level.index + 1).forEach(later => set(later.section, { completed: false }))
  set('lastLesson', level.firstLesson)
  beginMenuSceneLeave(inst)
  stopMenuLoops(inst.music, inst.sound)
  showTransitionToLevel(inst.k, level.firstLesson)
}
//
// Row under the mouse: within half a row step of its centre, inside the band
// from the hero's spot past the icon.
//
function levelUnderPointer(inst) {
  const { k, layout } = inst
  const mouse = k.mousePos()
  if (mouse.x < layout.heroX - MENU_ROW_LEFT_PAD * layout.s) return null
  if (mouse.x > layout.columnX + MENU_ROW_RIGHT_REACH * layout.s) return null
  return inst.levels.find(level => Math.abs(mouse.y - level.y) < layout.step / 2) ?? null
}
function onUpdate(inst) {
  if (inst.isLeavingScene) return
  const { k } = inst
  const dt = k.dt()
  updatePointerHover(inst)
  const level = inst.levels[inst.selected]
  inst.heroY += (level.y - inst.heroY) * Math.min(1, dt * MENU_HERO_EASE)
  //
  // A fresh vec2, not an in-place edit: Kaplay only refreshes the transform
  // of a fixed object when its pos is assigned.
  //
  const hero = inst.heroInst.character
  hero.pos = k.vec2(inst.layout.heroX, inst.heroY)
  inst.glowMushrooms.forEach(item => {
    GlowMushroom.setStill(item.mushroom, item.level.index !== inst.selected)
    GlowMushroom.onUpdate(item.mushroom, null)
  })
  updateHeroGlance(inst, dt)
  inst.levels.forEach(row => updateLevelRow(inst, row, dt))
  updateBackdropFade(inst, level.backdrop, dt)
  inst.bgOpacity[BACKDROP_CAVE] > MENU_FADE_EPS && CaveMenuBg.onUpdate(inst.caveBg, hero.pos)
  inst.bgOpacity[BACKDROP_MYSTERY] > MENU_FADE_EPS && QuestionDrift.onUpdate(inst.mysteryBg, dt)
  ChainBuoy.onUpdate(inst.forestEyes, hero.pos.x, hero.pos.y, dt)
  BombTree.onUpdate(inst.earTrees, dt)
  SpikyTomato.onUpdate(inst.tomatoes, dt)
  updateMenuCrawler(inst, dt)
  updateMenuForestLife(inst, dt)
  updateMenuMusic(inst, dt)
}
//
// Switching backdrops one after the other: every other picture fades out
// first; the selected one fades in only when none of them is left.
//
function updateBackdropFade(inst, shown, dt) {
  const others = Object.keys(inst.bgOpacity).filter(key => key !== shown)
  others.forEach(key => {
    inst.bgOpacity[key] = Math.max(0, inst.bgOpacity[key] - dt / BG_FADE_OUT_TIME)
  })
  if (others.some(key => inst.bgOpacity[key] > 0)) return
  inst.bgOpacity[shown] = Math.min(1, inst.bgOpacity[shown] + dt / BG_FADE_IN_TIME)
}
//
// Darting eyes: every so often the hero glances at a new random spot around
// itself.
//
function updateHeroGlance(inst, dt) {
  inst.glanceT -= dt
  if (inst.glanceT > 0) return
  inst.glanceT = MENU_GLANCE_MIN + Math.random() * MENU_GLANCE_RANGE
  const pos = inst.heroInst.character.pos
  Hero.setLookAtPos(inst.heroInst, {
    x: pos.x + (Math.random() * 2 - 1) * MENU_GLANCE_REACH_X,
    y: pos.y + (Math.random() * 2 - 1) * MENU_GLANCE_REACH_Y
  })
}
//
// The crawler is shown with the forest only; while shown it heads for a new
// random spot of its strip every few seconds.
//
function updateMenuCrawler(inst, dt) {
  const crawler = inst.crawler
  crawler.obj.hidden = inst.bgOpacity[BACKDROP_FOREST] < MENU_FOREST_LIVE_MIN_OPACITY
  inst.crawlerT -= dt
  if (inst.crawlerT <= 0) {
    inst.crawlerT = MENU_CRAWLER_RETARGET_MIN + Math.random() * MENU_CRAWLER_RETARGET_RANGE
    crawler.homeX = crawler.minX + Math.random() * (crawler.maxX - crawler.minX)
  }
  Predator.update(crawler, dt)
}
//
// The tree's apples, the bug, the flower and the midges live all the while;
// they show with the forest only (the midges fade with it).
//
function updateMenuForestLife(inst, dt) {
  const life = inst.forestLife
  if (!life) return
  const forest = inst.bgOpacity[BACKDROP_FOREST]
  const hidden = forest < MENU_FOREST_LIVE_MIN_OPACITY
  AppleBug.setHidden(life.bug, hidden)
  WaterFlower.setHidden(life.flower, hidden)
  life.fruitLayer.hidden = hidden
  updateForestMidges(life.midges, dt, forest)
  TreeFruit.tickForestTreeFruits(life.orchard, dt, inst.forestLayout.groundY)
  updateMenuWaterCycle(life, dt)
}
//
// Nobody shakes the flower or knocks the apples down in the menu: a full
// drop falls on its own after a short wait; once it has watered the tree
// (onMenuDropLanded) an apple falls a little later.
//
function updateMenuWaterCycle(life, dt) {
  if (life.appleLeft > 0) {
    life.appleLeft -= dt
    life.appleLeft <= 0 && dropMenuApple(life)
    return
  }
  if (!WaterFlower.isRipe(life.flower)) return
  life.flowerWait -= dt
  if (life.flowerWait > 0) return
  life.flowerWait = nextMenuFlowerWait()
  WaterFlower.pierce(life.flower)
}
//
// The drop splashed down by the tree: a new apple starts growing, and an
// apple falls once it has had time to ripen.
//
function onMenuDropLanded(inst) {
  const life = inst.forestLife
  if (!life) return
  TreeFruit.waterForestTreeApples(life.orchard)
  life.appleLeft = MENU_APPLE_FALL_AFTER
}
function dropMenuApple(life) {
  TreeFruit.releaseForestAnchorFruit(life.orchard) || (life.appleLeft = MENU_APPLE_RETRY)
}
function nextMenuFlowerWait() {
  return MENU_FLOWER_WAIT_MIN + Math.random() * MENU_FLOWER_WAIT_RANGE
}
//
// A touch sliding over a row selects it (the game takes no mouse; touches
// arrive through the pointer); a resting touch never fights the keyboard.
//
function updatePointerHover(inst) {
  if (ConfirmDialog.isOpen(inst.dialog)) {
    ConfirmDialog.updatePointer(inst.dialog)
    inst.lastMouse = { x: inst.k.mousePos().x, y: inst.k.mousePos().y }
    return
  }
  const mouse = inst.k.mousePos()
  const moved = mouse.x !== inst.lastMouse.x || mouse.y !== inst.lastMouse.y
  inst.lastMouse = { x: mouse.x, y: mouse.y }
  const level = levelUnderPointer(inst)
  moved && level && selectLevel(inst, level.index)
}
//
// Selected playable row: icon breathes; a selected "?" rocks; the rest
// settle back.
//
function updateLevelRow(inst, row, dt) {
  const { k } = inst
  const isSelected = row.index === inst.selected && row.playable
  const scaleTarget = isSelected ? 1 + MENU_SELECT_PULSE_AMP * Math.sin(k.time() * MENU_SELECT_PULSE_SPEED) : 1
  row.selectScale += (scaleTarget - row.selectScale) * Math.min(1, dt * MENU_SELECT_SCALE_EASE)
  const rocking = row.index === inst.selected && showsQuestionMark(row)
  const angleTarget = rocking ? MENU_QUESTION_ROCK_AMP * Math.sin(k.time() * MENU_QUESTION_ROCK_SPEED) : 0
  row.questionAngle += (angleTarget - row.questionAngle) * Math.min(1, dt * MENU_QUESTION_ROCK_EASE)
}
function showsQuestionMark(level) {
  return !level.icon || level.mystery
}
//
// Fades the birds toward full volume on the forest row, toward silence on
// any other row.
//
function updateMenuMusic(inst, dt) {
  const birds = inst.music.birds
  if (!birds) return
  const target = inst.levels[inst.selected].backdrop === BACKDROP_FOREST ? MENU_BIRDS_VOLUME : 0
  const step = MENU_BIRDS_VOLUME * dt / MENU_BIRDS_FADE_SEC
  birds.volume = birds.volume < target ? Math.min(target, birds.volume + step) : Math.max(target, birds.volume - step)
}
//
// Night picture under the forest, cave and "?" ones; each is drawn with its own
// opacity (a switch fades the old one out, then the new one in).
//
function drawBackdrops(inst) {
  if (inst.isLeavingScene) return
  const { k } = inst
  const night = inst.bgOpacity[BACKDROP_NIGHT]
  night > MENU_FADE_EPS && k.drawSprite({
    sprite: MENU_NIGHT_SPRITE,
    pos: k.vec2(-MENU_BG_EDGE_OVERSCAN, -MENU_BG_EDGE_OVERSCAN),
    width: k.width() + MENU_BG_EDGE_OVERSCAN * 2,
    height: k.height() + MENU_BG_EDGE_OVERSCAN * 2,
    opacity: night
  })
  const forest = inst.bgOpacity[BACKDROP_FOREST]
  forest > MENU_FADE_EPS && drawForestBackdrop(inst, forest)
  const cave = inst.bgOpacity[BACKDROP_CAVE]
  cave > MENU_FADE_EPS && CaveMenuBg.onDraw(inst.caveBg, cave)
  const mystery = inst.bgOpacity[BACKDROP_MYSTERY]
  mystery > MENU_FADE_EPS && QuestionDrift.onDraw(inst.mysteryBg, mystery)
}
//
// The forest goes back to front like the level: baked sky and parallax
// rows, the drifting clouds, the baked front scene, the lake (bed, algae,
// water), the stone pile over its shallows, the bomb trees' roots
// and trees with their bombs, then the stalk eyes once the forest is mostly
// in.
//
function drawForestBackdrop(inst, forest) {
  const { k } = inst
  const pieces = inst.forestPieces
  drawForestPieces(k, pieces.slice(0, -1), forest)
  Clouds.onDraw(inst.clouds, forest)
  drawForestPieces(k, pieces.slice(-1), forest)
  Lake.drawBed(k, inst.lake, forest)
  Lake.drawAlgae(k, inst.lake, forest)
  Lake.drawFill(k, inst.lake, forest)
  inst.shorePile.sprite && k.drawSprite({ sprite: inst.shorePile.sprite, pos: k.vec2(inst.shorePile.x, inst.shorePile.y), opacity: forest })
  BombTree.onDrawRoots(inst.earTrees, forest)
  BombTree.onDrawTrees(inst.earTrees, forest)
  SpikyTomato.onDraw(inst.tomatoes, forest)
  forest > MENU_FOREST_LIVE_MIN_OPACITY && ChainBuoy.onDraw(inst.forestEyes, forestEyeBerryColors(k))
}
function drawForestPieces(k, pieces, opacity) {
  pieces.forEach(piece => k.drawSprite({
    sprite: piece.sprite,
    pos: k.vec2(piece.x, piece.y),
    opacity
  }))
}
//
// The level panel behind the hero and the icons.
//
function drawMenuPanel(inst) {
  if (inst.isLeavingScene) return
  const { k, panel } = inst
  k.drawSprite({ sprite: panel.sprite, pos: k.vec2(panel.x, panel.y) })
}
//
// Bakes the level panel for the current layout (once per live k and window
// size) and returns its sprite and screen top-left.
//
function loadMenuPanel(k, layout) {
  const s = layout.s
  const pad = MENU_PANEL_PAD * s
  const x1 = layout.heroX - MENU_PANEL_LEFT_PAD * s
  const x2 = layout.columnX + MENU_PANEL_RIGHT_PAD * s
  const y1 = layout.firstY - layout.step * MENU_PANEL_END_SHARE
  const y2 = layout.firstY + layout.step * (LEVELS.length - 1 + MENU_PANEL_END_SHARE)
  const sprite = `${MENU_PANEL_SPRITE}-v2-${k.width()}x${k.height()}`
  k.getSprite(sprite) || k.loadSprite(sprite, bakeMenuPanel(x2 - x1, y2 - y1, s))
  return { sprite, x: Math.round(x1 - pad), y: Math.round(y1 - pad), w: x2 - x1 + pad * 2, h: y2 - y1 + pad * 2 }
}
//
// The panel card: translucent forest-teal fill, a lit band fading down from
// the top and the dark contour, then film grain.
//
function bakeMenuPanel(w, h, s) {
  const pad = MENU_PANEL_PAD * s
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w + pad * 2)
  canvas.height = Math.ceil(h + pad * 2)
  const ctx = canvas.getContext('2d')
  const radius = MENU_PANEL_RADIUS * s
  const card = new Path2D()
  card.roundRect(pad, pad, w, h, radius)
  ctx.globalAlpha = MENU_PANEL_FILL_ALPHA
  ctx.fillStyle = FOREST_PAL.menuPanel
  ctx.fill(card)
  const light = ctx.createLinearGradient(0, pad, 0, pad + h * MENU_PANEL_LIGHT_SHARE)
  light.addColorStop(0, FOREST_PAL.menuPanelLight)
  light.addColorStop(1, `${FOREST_PAL.menuPanelLight}00`)
  ctx.globalAlpha = MENU_PANEL_LIGHT_ALPHA
  ctx.fillStyle = light
  ctx.fill(card)
  ctx.globalAlpha = 1
  ctx.strokeStyle = FOREST_PAL.menuPanelContour
  ctx.lineWidth = MENU_PANEL_CONTOUR_W * s
  ctx.stroke(card)
  applyForestFilmGrainToCanvas(canvas, MENU_PANEL_GRAIN_SEED)
  return canvas
}
//
// Glowing cave mushrooms (body, then the additive halo), "?" glyphs for
// locked levels and ones not reached yet (one sprite pass), then the
// prohibition rings and slashes over the locked ones (one primitive pass) —
// the forest mushroom icon draws itself.
//
function drawLevelIcons(inst) {
  if (inst.isLeavingScene) return
  const { k, layout } = inst
  inst.glowMushrooms.forEach(item => drawGlowMushroomIcon(inst, item))
  const locked = inst.levels.filter(level => !level.icon)
  inst.levels.filter(showsQuestionMark).forEach(level => k.drawSprite({
    sprite: questionMarkSpriteName(layout.s),
    pos: k.vec2(layout.columnX + MENU_QUESTION_MARK_NUDGE_X * layout.s, level.y),
    anchor: 'center',
    angle: level.questionAngle
  }))
  const color = getRGB(k, PROHIBITED_COLOR)
  locked.filter(level => !level.completed).forEach(level => drawProhibitedSign(k, layout.columnX, level.y, layout.s, color))
}
//
// Cave icon: its visible art (cap top to ground) centred on the row; it
// lives like in the level (now and then it squats).
//
function drawGlowMushroomIcon(inst, item) {
  const { layout } = inst
  const { level, mushroom } = item
  const scale = MENU_GLOW_MUSHROOM_SCALE * layout.s * level.selectScale
  GlowMushroom.setPose(mushroom, layout.columnX, level.y + GlowMushroom.visibleHeight(mushroom, scale) / 2, scale)
  GlowMushroom.onDraw(mushroom)
  GlowMushroom.onDrawHalo(mushroom)
}
//
// Red ring with the diagonal slash over a locked level.
//
function drawProhibitedSign(k, cx, cy, scale, color) {
  const r = PROHIBITED_RING_RADIUS * scale
  for (let i = 0; i < PROHIBITED_RING_SEGMENTS; i++) {
    const a1 = (i / PROHIBITED_RING_SEGMENTS) * Math.PI * 2
    const a2 = ((i + 1) / PROHIBITED_RING_SEGMENTS) * Math.PI * 2
    k.drawLine({
      p1: k.vec2(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r),
      p2: k.vec2(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r),
      width: PROHIBITED_RING_WIDTH * scale,
      color
    })
  }
  const reach = r * PROHIBITED_SLASH_REACH
  k.drawLine({
    p1: k.vec2(cx - reach, cy - reach),
    p2: k.vec2(cx + reach, cy + reach),
    width: PROHIBITED_SLASH_WIDTH * scale,
    color
  })
}
//
// The key hint centred at the bottom.
//
function drawLevelTexts(inst) {
  if (inst.isLeavingScene) return
  const { k, layout } = inst
  k.drawSprite({
    sprite: menuHintSpriteName(layout.s),
    pos: k.vec2(k.width() / 2, layout.hintY),
    anchor: 'center',
    opacity: MENU_HINT_OPACITY
  })
}
//
// Solid cover while leaving — the menu art never flashes during level load.
//
function drawLeaveCover(inst) {
  if (!inst.isLeavingScene) return
  const { k } = inst
  k.drawRect({ pos: k.vec2(0, 0), width: k.width(), height: k.height(), color: getRGB(k, MENU_LEAVE_BG_HEX) })
}
function beginMenuSceneLeave(inst) {
  if (inst.isLeavingScene) return
  inst.isLeavingScene = true
  inst.pointerCancel?.cancel()
  inst.heroInst.character.hidden = true
}
function onMenuLeave(inst) {
  inst.closed = true
  inst.keyCancels.forEach(c => c?.cancel?.())
  inst.startCancel.cancel()
  inst.backCancel.cancel()
  inst.pointerCancel?.cancel()
  CanvasBackdrop.clearCanvasBackdrop(inst.k)
  stopMenuLoops(inst.music, inst.sound)
  inst.heroInst.character.destroy()
}
//
// Stops the menu's looping sounds: its music and Valera's propeller whirr
// (the bud's own update, which would fade it out, stops with the scene).
//
function stopMenuLoops(music, sound) {
  stopMenuMusic(music)
  Sound.stopPropellerHum(sound)
}
//
// True while a live pre-level transition overlay owns input. Clears a stale
// transitionCleanup handle left behind after a broken leave.
//
function isMenuTransitionBlocking(k) {
  if (!k.transitionCleanup) return false
  if (k._transitionOverlay?.exists?.()) return true
  try { k.transitionCleanup() } catch (_) { /* stale cleanup */ }
  k.transitionCleanup = null
  return false
}
//
// Normalises the saved lesson (legacy 'lastLevel' key, stale names,
// section-complete markers) and writes it back when it changed.
//
function syncMenuLastLesson() {
  const legacy = get('lastLevel', null)
  if (legacy) {
    get('lastLesson', null) || set('lastLesson', legacy.replace(/^level-/, 'lesson-'))
    localStorage.removeItem('lastLevel')
  }
  const saved = get('lastLesson', null)
  const normalized = normalizeSceneName(saved)
  const next = normalized in MENU_COMPLETE_NEXT_LESSON ? MENU_COMPLETE_NEXT_LESSON[normalized] : normalized
  //
  // A save from a removed level (word / touch / time) has no scene to resume.
  //
  const lastLevel = LEVELS.some(level => next?.startsWith(level.lessonPrefix)) ? next : null
  lastLevel !== saved && set('lastLesson', lastLevel)
  return lastLevel
}
//
// The menu's sound tracks, all silent until their level is selected.
//
function startMenuMusic(k) {
  return {
    birds: k.play("birds", { loop: true, volume: 0 })
  }
}
//
// HTML music can resume after pause() if play() resolves late, and then keeps
// sounding once the Web Audio graph is torn down for the Forest loader — so
// the tracks are hushed repeatedly for a while.
//
function stopMenuMusic(music) {
  Object.values(music).forEach(play => {
    if (!play) return
    const hush = () => {
      play.volume = 0
      play.loop = false
      play.paused = true
      play.stop?.()
    }
    hush()
    const timer = setInterval(hush, MENU_HUSH_INTERVAL_MS)
    setTimeout(() => clearInterval(timer), MENU_HUSH_DURATION_MS)
  })
}
//
// Every bake the scene draws: night backdrop, forest layers, hero cursor
// frames and the texts — each a no-op once loaded on this k.
//
function loadMenuAssets(k) {
  buildMenuNightSprite(k)
  loadMenuForestLayerSprites(k)
  Hero.loadHeroSprites(k)
  loadMenuTextSprites(k)
}
//
// Hint / "?" sprites at the window's text scale.
//
function loadMenuTextSprites(k) {
  const s = computeMenuLayout(k).s
  loadQuestionMarkSprite(k, s)
  loadMenuHintSprite(k, s)
}
//
// Key hint line: each key in the hint gold, then its meaning in the text
// cream, with a dark drop shadow under both.
//
function loadMenuHintSprite(k, s) {
  const name = menuHintSpriteName(s)
  if (k.getSprite(name)) return
  const size = Math.round(MENU_HINT_SIZE * s)
  const probe = document.createElement('canvas').getContext('2d')
  probe.font = `${size}px ${MENU_TEXT_FONT}`
  const runs = []
  MENU_HINT_ITEMS.forEach((item, i) => {
    runs.push({ text: item.key, color: FOREST_PAL.menuHintKey })
    runs.push({ text: MENU_HINT_KEY_GAP + item.label, color: MENU_TEXT_HEX })
    i < MENU_HINT_ITEMS.length - 1 && runs.push({ text: MENU_HINT_ITEM_GAP, color: null })
  })
  const width = runs.reduce((sum, run) => sum + probe.measureText(run.text).width, 0)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width + MENU_HINT_PAD * 2)
  canvas.height = Math.ceil(size * 1.3 + MENU_HINT_PAD * 2)
  const ctx = canvas.getContext('2d')
  ctx.font = probe.font
  ctx.textBaseline = 'top'
  let x = MENU_HINT_PAD
  runs.forEach(run => {
    if (run.color) {
      ctx.fillStyle = MENU_TEXT_SHADOW_HEX
      ctx.fillText(run.text, x + MENU_HINT_SHADOW_OFFSET, MENU_HINT_PAD + MENU_HINT_SHADOW_OFFSET)
      ctx.fillStyle = run.color
      ctx.fillText(run.text, x, MENU_HINT_PAD)
    }
    x += ctx.measureText(run.text).width
  })
  applyForestFilmGrainToCanvas(canvas, MENU_HINT_GRAIN_SEED)
  k.loadSprite(name, canvas)
}
function menuHintSpriteName(s) {
  return `${MENU_HINT_SPRITE}-v3-${Math.round(MENU_HINT_SIZE * s)}`
}
//
// "?" baked into a canvas sized to the glyph's ink box (measured, not the
// font's line box), with its drop shadow — drawn centred it sits in the
// middle of the prohibition ring.
//
function loadQuestionMarkSprite(k, s) {
  const name = questionMarkSpriteName(s)
  if (k.getSprite(name)) return
  const size = Math.round(MENU_QUESTION_MARK_SIZE * s)
  const font = `${size}px ${MENU_TEXT_FONT}`
  const probe = document.createElement('canvas').getContext('2d')
  probe.font = font
  const m = probe.measureText(MENU_QUESTION_MARK_TEXT)
  const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight
  const inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
  const shadow = MENU_QUESTION_MARK_SHADOW_OFFSET * s
  const pad = MENU_QUESTION_MARK_PAD
  const canvas = document.createElement('canvas')
  //
  // The shadow offset pads both sides, so the glyph itself stays centred.
  //
  canvas.width = Math.ceil(inkW + (shadow + pad) * 2)
  canvas.height = Math.ceil(inkH + (shadow + pad) * 2)
  const ctx = canvas.getContext('2d')
  ctx.font = font
  ctx.textBaseline = 'alphabetic'
  const x = pad + shadow + m.actualBoundingBoxLeft
  const y = pad + shadow + m.actualBoundingBoxAscent
  ctx.fillStyle = MENU_TEXT_SHADOW_HEX
  ctx.fillText(MENU_QUESTION_MARK_TEXT, x + shadow, y + shadow)
  ctx.fillStyle = MENU_QUESTION_MARK_HEX
  ctx.fillText(MENU_QUESTION_MARK_TEXT, x, y)
  k.loadSprite(name, canvas)
}
function questionMarkSpriteName(s) {
  return `${MENU_QUESTION_MARK_SPRITE}-v2-${Math.round(MENU_QUESTION_MARK_SIZE * s)}`
}
//
// Forest backdrop layers for the current screen size, painted once and
// cached, so a new engine only re-uploads them.
//
const menuForestBackdropCache = new Map()
function forestMenuBackdrop(width, height) {
  const cacheKey = `${width}x${height}`
  const cached = menuForestBackdropCache.get(cacheKey)
  if (cached) return cached
  const layers = generateForestMenuBackdrop({ width, height })
  menuForestBackdropCache.set(cacheKey, layers)
  return layers
}
//
// Uploads the forest layers once per live k (keyed by k, so a fresh engine
// after a resolution swap re-uploads instead of finding an empty registry).
// Returns the draw list (under the lake).
//
const menuForestPiecesByK = new WeakMap()
function loadMenuForestLayerSprites(k) {
  const loaded = menuForestPiecesByK.get(k)
  if (loaded) return loaded
  const pieces = forestMenuBackdrop(k.width(), k.height()).map((piece, i) => {
    const sprite = `${MENU_FOREST_LAYER_SPRITE}-v2-${i}`
    k.loadSprite(sprite, piece.canvas)
    return { ...piece, sprite }
  })
  menuForestPiecesByK.set(k, pieces)
  return pieces
}
//
// The lake's tree-side stone pile, the level's own (shaped by the live
// lake's bed), drawn over the water; baked once per k and window size.
//
const menuShorePileByK = new WeakMap()
function loadMenuShorePile(k, lake) {
  const key = `${k.width()}x${k.height()}`
  const cached = menuShorePileByK.get(k)
  if (cached?.key === key) return cached
  const pile = bakeForestLakeStonePile(k, lake, lake.surfaceY)
  const placed = { key, sprite: pile?.name, x: pile?.x ?? 0, y: pile?.y ?? 0 }
  menuShorePileByK.set(k, placed)
  return placed
}
//
// The level's lake for the menu layout (sprites keyed by window size, since
// the layout follows it).
//
function createMenuLake(k, forestLayout) {
  const { lake, groundY } = forestLayout
  return Lake.create({
    k,
    x1: lake.x1,
    x2Core: lake.x2Core,
    surfaceY: lake.surfaceY,
    floorY: groundY,
    spriteKey: `${MENU_LAKE_SPRITE_KEY}-${k.width()}x${k.height()}`,
    bankJag: MENU_LAKE_BANK_JAG
  })
}
//
// The level's crawler on the ground east of the lake; it never hunts.
//
function createMenuCrawler(inst) {
  const { k, forestLayout } = inst
  const { minX, maxX } = forestLayout.crawler
  return Predator.create({
    k,
    x: minX + Math.random() * (maxX - minX),
    minX,
    maxX,
    groundAt: () => forestLayout.groundY,
    hero: inst.heroInst,
    canHuntHero: () => false
  })
}
//
// The forest's live life is created once its pictures are baked on this k
// (prewarmed at boot; a fresh engine bakes them on the first visit), unless
// the menu is gone by then.
//
function startMenuForestLife(inst) {
  loadMenuForestLife(inst.k).then(ready => ready && !inst.closed && createMenuForestLife(inst))
}
function loadMenuForestLife(k) {
  return Promise.all([AppleBug.load(k), WaterFlower.load(k), bakeLeftTreeApple(k), PropellerBud.load(k)]).then(baked => baked.every(Boolean))
}
//
// The level's apple tree crop on the menu's tree (its "level" for the
// bug), the midges over the lake, the water flower at the trunk, the
// apple bug in its burrow and Valera on the big trees' branches.
//
function createMenuForestLife(inst) {
  const { k, forestLayout } = inst
  const { groundY, lake, appleTreeX, bugHoleX, scale } = forestLayout
  const hangs = leftTreeApples({ x: appleTreeX, y: groundY }, scale)
  const orchard = { k, treeFruitSpots: [], treeApples: TreeFruit.createForestTreeApples(hangs, leftTreeApplePicture(k)) }
  TreeFruit.restoreForestTreeApples(orchard, MENU_TREE_APPLES)
  const midges = createForestMidges(k, groundY, k.width(), { treeX: appleTreeX, lakeX2: lake.x2, lakeOnly: true, z: MENU_MIDGE_Z })
  //
  // The level's warm gold (left unset, midges fall back to the void green).
  //
  midges.midgeRgb = getForestLightRgb(MENU_MIDGE_LIGHT)
  const flower = WaterFlower.create({
    k,
    x: WaterFlower.footXUnderHeart(appleTreeX) + Math.round(MENU_WATER_FLOWER_SHIFT * scale),
    y: groundY,
    z: MENU_WATER_FLOWER_Z,
    startDelay: MENU_FLOWER_START_DELAY,
    rootArea: { x1: 0, x2: k.width() },
    onSoilWatered: () => onMenuDropLanded(inst)
  })
  inst.forestLife = {
    orchard,
    midges,
    flower,
    fruitLayer: TreeFruit.mountForestTreeFruitLayer(k, orchard, MENU_FRUIT_Z),
    bug: AppleBug.create({
      k,
      holeX: bugHoleX,
      groundY,
      lakeX2: lake.x2,
      treeX: appleTreeX,
      levelInst: orchard,
      midges,
      flower,
      predator: inst.crawler,
      tunnelZ: MENU_BUG_TUNNEL_Z,
      z: MENU_BUG_Z
    }),
    bud: createMenuPropellerBud(inst),
    flowerWait: nextMenuFlowerWait(),
    appleLeft: 0
  }
}
//
// Valera between the two branches (see MENU_BUD_REST), in its own space:
// the backdrop's screen px over its scale. It wakes for a menu hero near
// and shows with the forest only.
//
function createMenuPropellerBud(inst) {
  const { k, forestLayout } = inst
  const { leftBranch, rightBranch, scale } = forestLayout
  const toBud = v => v / scale
  return PropellerBud.create({
    k,
    stops: [
      {
        x: toBud(leftBranch.x1 + (leftBranch.x2 - leftBranch.x1) * MENU_BUD_LEFT_SHARE),
        y: toBud(leftBranch.y),
        perch: PropellerBud.PERCH.BRANCH
      },
      {
        x: toBud(rightBranch.x1 + (rightBranch.x2 - rightBranch.x1) * MENU_BUD_RIGHT_SHARE),
        y: toBud(rightBranch.y),
        perch: PropellerBud.PERCH.BRANCH
      }
    ],
    rest: MENU_BUD_REST,
    scale,
    getHeroPos: () => menuHeroInBudSpace(inst),
    isVisible: () => !inst.isLeavingScene && inst.bgOpacity[BACKDROP_FOREST] >= MENU_FOREST_LIVE_MIN_OPACITY,
    sound: inst.sound,
    humFloor: MENU_BUD_HUM_LEVEL,
    z: MENU_BUD_Z,
    rootsZ: MENU_BUD_ROOTS_Z
  })
}
function menuHeroInBudSpace(inst) {
  const pos = inst.heroInst.character?.pos
  return pos ? { x: pos.x / inst.forestLayout.scale, y: pos.y / inst.forestLayout.scale } : null
}
//
// Night backdrop: scene base colour plus the darkened menu-bg forest, baked
// once per live k; the composed canvas is cached per size.
//
const menuNightBakedFor = new WeakSet()
const menuNightCanvasCache = new Map()
function buildMenuNightSprite(k) {
  if (menuNightBakedFor.has(k)) return
  menuNightBakedFor.add(k)
  const cacheKey = `${k.width()}x${k.height()}`
  const canvas = menuNightCanvasCache.get(cacheKey) ?? composeMenuNightCanvas(k.width(), k.height())
  menuNightCanvasCache.set(cacheKey, canvas)
  k.loadSprite(MENU_NIGHT_SPRITE, canvas)
}
function composeMenuNightCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = CFG.visual.colors.ready.background
  ctx.fillRect(0, 0, width, height)
  const picture = generateMenuBackgroundCanvas(CFG.visual.colors.ready.background)
  ctx.globalAlpha = MENU_NIGHT_ALPHA
  ctx.drawImage(picture, 0, 0)
  picture.width = 0
  picture.height = 0
  return canvas
}
