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
import * as NoMouse from '../utils/no-mouse.js'
import { unloadSprite } from '../utils/sprite-unload.js'
import { registerEngineTeardown } from '../utils/engine-teardown.js'
import { generateMenuBackgroundCanvas, recomputeMenuBgLayout } from '../utils/menu-bg-generator.js'
import { generateForestMenuBackdrop, forestMenuLayout, loadForestMenuBackdropArt } from '../sections/forest/utils/forest-menu-bg.js'
import * as Clouds from '../sections/forest/utils/forest-clouds.js'
import * as ChainBuoy from '../sections/forest/utils/forest-chain-buoy.js'
import { forestEyeBerryColors } from '../sections/forest/utils/forest-eye-berry.js'
import { FOREST_PAL, getForestLightRgb } from '../sections/forest/utils/forest-palette.js'
import * as Lake from '../components/lake.js'
import * as BombTree from '../sections/forest/utils/forest-bomb-tree.js'
import * as Predator from '../sections/forest/components/predator.js'
import * as SpikyTomato from '../sections/forest/components/spiky-tomato.js'
import * as TrampMushroom from '../sections/forest/utils/forest-tramp-mushroom.js'
import * as AppleBug from '../sections/forest/components/apple-bug.js'
import * as WaterFlower from '../sections/forest/components/water-flower.js'
import * as PropellerBud from '../sections/forest/components/propeller-bud.js'
import * as TreeFruit from '../sections/forest/utils/forest-tree-fruit.js'
import { bakeLeftTreeApple, leftTreeApplePicture, leftTreeApples } from '../sections/forest/utils/forest-left-tree.js'
import { createForestMidges, updateForestMidges } from '../sections/forest/utils/forest-level-atmosphere.js'
import * as MenuEyeStalk from '../sections/forest/components/menu-eye-stalk.js'
import * as CaveMenuStalkEye from '../sections/cave/components/cave-menu-stalk-eye.js'
import * as CaveAtlas from '../sections/cave/utils/cave-atlas.js'
import { createSeededRandom } from '../utils/seeded-random.js'
import * as CaveMenuBg from '../sections/cave/utils/cave-menu-bg.js'
import * as CaveMenuPanel from '../sections/cave/utils/cave-menu-panel.js'
import * as CaveScene from '../sections/cave/utils/cave-scene.js'
import * as CaveSound from '../sections/cave/utils/cave-sound.js'
import { paintPlate } from '../sections/cave/utils/cave-plate.js'
import * as ConfirmDialog from '../components/confirm-dialog.js'
import * as QuestionDrift from '../components/question-drift.js'
import { addForestFilmGrainOverlayLayer, applyForestFilmGrainToCanvas } from '../sections/forest/utils/forest-parallax-grain.js'
//
// Level list: a vertical column of levels, the hero standing left of it as
// the cursor. A level the player can enter shows its picture (the forest's
// stalk-eye, the cave's thorny stalk-eye); every other level is a
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
const CAVE_SECTION = 'cave'
const LEVEL_ICON_EYE_STALK = 'eyeStalk'
const LEVEL_ICON_CAVE_STALK = 'caveStalk'
const FOREST_LESSON_PREFIX = 'lesson-forest.'
const FOREST_FIRST_LESSON = 'lesson-forest.0'
const CAVE_LESSON_PREFIX = 'lesson-cave.'
const CAVE_FIRST_LESSON = 'lesson-cave.0'
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
    section: CAVE_SECTION,
    icon: LEVEL_ICON_CAVE_STALK,
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
const MENU_HERO_GAP = 80
const MENU_HINT_BOTTOM = 26
//
// Level panel: a vertical rounded card behind the hero and the four level
// icons (design px): it reaches PANEL_LEFT_PAD left of the hero, PANEL_RIGHT_PAD
// right of the icons and PANEL_END_SHARE of a row step past the first and
// last rows. The card shows the selected level's own ground at
// PANEL_ART_ALPHA over its colour at PANEL_FILL_ALPHA, alive: for the
// forest the inside of a cloud, its puffs drifting; for the cave its far
// wall over its soil, a runner hunting fireflies there. It is drawn inside
// the card's rounded
// shape (a stencil mask); over it a lit top band fading out over
// PANEL_LIGHT_SHARE of its height and a thin dark contour. Its pictures are
// baked once per live k and window size, film grain included. A new
// selection cross-fades the cards at MENU_PANEL_FADE_RATE per second.
//
const MENU_PANEL_LEFT_PAD = 68
const MENU_PANEL_RIGHT_PAD = 78
const MENU_PANEL_END_SHARE = 0.62
const MENU_PANEL_RADIUS = 34
const MENU_PANEL_FILL_ALPHA = 0.55
const MENU_PANEL_ART_ALPHA = 0.85
//
// The forest card is the inside of a cloud: its cream over rows of lumpy
// puffs (row: middle as a share of the card's height, puff radius as a
// share of its width, colour, drift in design px/s), cooler and darker
// toward the bottom; puffs MENU_PUFF_STEP of their radius apart, each
// radius and height off by up to MENU_PUFF_JITTER of it (seeded
// MENU_PUFF_SEED). Each row is baked as a seamless strip MENU_PUFF_TILE
// card widths wide and drifts sideways at its own pace.
//
const MENU_PANEL_PUFF_ROWS = [
  { y: 0.32, r: 0.3, color: 'mid', drift: 4 },
  { y: 0.6, r: 0.26, color: 'shade', drift: 6.5 },
  { y: 0.84, r: 0.22, color: 'deep', drift: 9 }
]
const MENU_PUFF_STEP = 1.25
const MENU_PUFF_JITTER = 0.3
const MENU_PUFF_SEED = 4437
const MENU_PUFF_TILE = 2
const MENU_PANEL_FADE_RATE = 6
const MENU_PANEL_LIGHT_ALPHA = 0.16
const MENU_PANEL_LIGHT_SHARE = 0.32
const MENU_PANEL_CONTOUR_W = 1.5
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
const MENU_LAKE_SPRITE_KEY = 'menu'
//
// The level's clouds drift this far under the screen top.
//
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
//
// A backdrop comes in and goes out whole — its picture and everything
// living in it at once — under a veil of the screen's base colour, drawn
// over all of it (the crawler included, MENU_VEIL_Z) and under the panel.
//
const MENU_VEIL_Z = 9.5
const MENU_PANEL_Z = 9.7
const OPAQUE = 1
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
const MENU_KEY_START = 'space'
const MENU_KEY_BACK = 'escape'
//
// Space / Enter / Esc are heard twice per press (window keydown before the
// canvas has focus, then Kaplay's own key press): a repeat of the same key
// within this window is the same press.
//
const MENU_KEY_REPEAT_GUARD = 0.25
//
// The hero looks at the selected level's eye: it sits MENU_ICON_EYE_Y icon
// px over its row (the stalk-eye icons' own eye height); a "?" row he looks
// at the glyph itself.
//
const MENU_ICON_EYE_Y = -20
//
// Menu sound follows the selected level: the forest level's birds.mp3
// fades in (over MENU_BIRDS_FADE_SEC) while the forest row is selected and
// out on any other row; the cave level's own ambience (cave-sound.js: the
// drips and the draught) fades in the same way on the cave row, its drips
// heard as from MENU_CAVE_LISTENER_Y of the level (near the upper hall).
//
const MENU_BIRDS_VOLUME = CFG.audio.backgroundMusic.birds
const MENU_BIRDS_FADE_SEC = 1.5
const MENU_CAVE_FADE_SEC = 1.5
const MENU_CAVE_LISTENER_Y = 700
//
// Section-complete markers saved as lastLesson point at the next section's
// first lesson.
//
const MENU_COMPLETE_NEXT_LESSON = {
  'forest-complete': CAVE_FIRST_LESSON
}
const MENU_SCENE_GUARD_DELAY = 0.2
const MENU_BAKE_INPUTS_HOLD = 2
const MENU_PREWARM_YIELD_FRAMES = 2
const menuPrewarmedSize = new WeakMap()
const MENU_LEAVE_BG_HEX = '#1A1A1A'
//
// The menu shows all at once: a solid cover (the leave cover's colour)
// stays over it until its living parts are made and every asset has
// loaded, then MENU_REVEAL_FRAMES more frames drawn under it (never longer
// than MENU_REVEAL_MAX s in all, should an asset never come); it then
// fades out over MENU_REVEAL_FADE s.
//
const MENU_REVEAL_FRAMES = 2
const MENU_REVEAL_FADE = 0.2
const MENU_REVEAL_MAX = 3
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
    const caveSound = startMenuCaveSound(sound)
    registerEngineTeardown(() => stopMenuLoops(music, sound, caveSound))
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
      caveSound,
      caveVolume: 0,
      layout,
      levels,
      selected,
      lastLevel,
      heroInst,
      heroY: levels[selected].y,
      lastMouse: { x: k.mousePos().x, y: k.mousePos().y },
      gaze: { x: 0, y: 0 },
      lastKey: null,
      lastKeyAt: 0,
      continueOnNo: false,
      isLeavingScene: false,
      sceneReady: false,
      bgOpacity: { [BACKDROP_FOREST]: 0, [BACKDROP_CAVE]: 0, [BACKDROP_NIGHT]: 0, [BACKDROP_MYSTERY]: 0 },
      panelCave: 0,
      panelFade: 0,
      cavePanel: null,
      caveBg: CaveMenuBg.create({ k, width: k.width(), height: k.height(), onSplash: (strength, near) => CaveSound.playFishSplash(caveSound, strength, near), onSnap: near => CaveSound.playSnap(caveSound, near), onBubble: (r, near) => CaveSound.playBubble(caveSound, r, near) }),
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
      closed: false,
      lifeReady: false,
      revealIn: MENU_REVEAL_FRAMES,
      revealWait: 0,
      cover: 1
    }
    inst.tomatoes = SpikyTomato.create({
      k,
      earTrees: inst.earTrees,
      particles: null,
      sfx: sound,
      groundY: forestLayout.groundY
    })
    inst.crawler = createMenuCrawler(inst)
    inst.menuTramps = createMenuTramps(k, forestLayout)
    startMenuForestLife(inst)
    inst.bgOpacity[levels[selected].backdrop] = 1
    createMenuEyeStalks(inst)
    k.add([k.z(MENU_BG_Z), { draw: () => drawBackdrops(inst) }])
    k.add([k.z(MENU_VEIL_Z), { draw: () => drawBackdropVeil(inst) }])
    inst.panel = loadMenuPanel(k, layout)
    inst.panelDraws = createPanelDraws(inst)
    inst.cavePanel = CaveMenuPanel.create({ k, panel: inst.panel, ground: caveGround(layout) })
    inst.panelCave = levels[selected].section === CAVE_SECTION ? 1 : 0
    k.add([k.z(MENU_PANEL_Z), { draw: () => drawMenuPanel(inst) }])
    k.add([k.z(MENU_ICON_Z), { draw: () => drawLevelIcons(inst) }])
    k.add([k.z(MENU_TEXT_Z), { draw: () => drawLevelTexts(inst) }])
    inst.dialogs = Object.fromEntries(Object.values(ConfirmDialog.LOOKS).map(look => [look, createRestartDialog(inst, look)]))
    inst.dialog = inst.dialogs[ConfirmDialog.LOOKS.FOREST]
    k.add([k.z(MENU_LEAVE_COVER_Z), { draw: () => drawLeaveCover(inst) }])
    k.add([k.z(MENU_LEAVE_COVER_Z), { draw: () => drawRevealCover(inst) }])
    addForestFilmGrainOverlayLayer(k, MENU_FILM_GRAIN_Z)
    k.onUpdate(() => onUpdate(inst))
    bindMenuInput(inst)
    k.wait(MENU_SCENE_GUARD_DELAY, () => { inst.sceneReady = true })
    //
    // The cave picture is baked and its first frames are through: what it
    // was baked from goes (the cave level builds what it needs again).
    //
    k.wait(MENU_BAKE_INPUTS_HOLD, CaveScene.releaseBakeInputs)
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
  await Promise.all([loadForestMenuBackdropArt(), Clouds.loadForestClouds(), ConfirmDialog.loadConfirmDialogArt(), loadMenuForestLife(k), CaveAtlas.load()])
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
 * Frees the menu's screen-sized backdrops once a level is running (the
 * night picture, the forest layers, the cave picture: the level never
 * draws them, yet their textures stayed on the GPU and their canvases in
 * memory all through it). The menu is no longer prewarmed after this:
 * going back to it paints and loads them again under the loader
 * (goToMenuAfterAssets).
 * @param {Object} k - Kaplay inst
 */
export function releaseMenuAssets(k) {
  unloadSprite(k, MENU_NIGHT_SPRITE)
  menuNightBakedFor.delete(k)
  menuNightCanvasCache.forEach(freeCanvas)
  menuNightCanvasCache.clear()
  menuForestPiecesByK.get(k)?.forEach(piece => unloadSprite(k, piece.sprite))
  menuForestPiecesByK.delete(k)
  menuForestBackdropCache.forEach(layers => layers.forEach(layer => freeCanvas(layer.canvas)))
  menuForestBackdropCache.clear()
  CaveMenuBg.release(k)
  CaveMenuPanel.release(k)
  menuPrewarmedSize.delete(k)
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
//
// Gives a canvas's pixels back at once (not when it is collected: a left
// menu scene may still hold the layer it was painted for).
//
function freeCanvas(canvas) {
  canvas.width = 0
  canvas.height = 0
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
// The forest icon is one of the level's stalk-eyes cut short, the cave's
// one of its thorny stalk-eyes; their pupils follow the hero. Only the
// selected level's eye is open, the others shut theirs.
//
function createMenuEyeStalks(inst) {
  inst.levels.filter(level => level.icon === LEVEL_ICON_EYE_STALK).forEach(level => MenuEyeStalk.create(stalkIconCfg(inst, level)))
  inst.levels.filter(level => level.icon === LEVEL_ICON_CAVE_STALK && !level.mystery).forEach(level => CaveMenuStalkEye.create(stalkIconCfg(inst, level)))
}
function stalkIconCfg(inst, level) {
  const pose = { x: inst.layout.columnX, y: level.y, scale: 1 }
  return {
    k: inst.k,
    z: MENU_ICON_Z,
    getPose: () => {
      pose.scale = inst.layout.s * level.selectScale
      return pose
    },
    getLookAt: () => inst.heroInst.character.pos,
    isVisible: () => !inst.isLeavingScene,
    isOpen: () => level.index === inst.selected
  }
}
//
// Keyboard and mouse bindings. Menu: up/down (w/s) choose, Space enters the
// selected level, Enter asks to restart it, Esc goes back; hover
// selects a row, a click enters it; a click or tap off the level panel
// continues the last level. While the dialog is open every key and
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
  inst.mouseCancel = NoMouse.onMousePress(point => onMousePress(inst, point))
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
  openRestartDialog(inst, level, false)
}
//
// Drops the level's restart board. A board raised by a click (continueOnNo)
// also answers "No" by continuing the level, because the click meant "play".
//
function openRestartDialog(inst, level, continueOnNo) {
  inst.continueOnNo = continueOnNo
  inst.dialog = inst.dialogs[level.dialog ?? ConfirmDialog.LOOKS.FOREST]
  ConfirmDialog.open(inst.dialog)
}
//
// The restart question in one look (each level asks in its own: the forest
// signboard, the cave's soil plate).
//
function createRestartDialog(inst, look) {
  return ConfirmDialog.create({
    k: inst.k,
    question: MENU_RESTART_QUESTION,
    yesLabel: MENU_RESTART_YES,
    noLabel: MENU_RESTART_NO,
    onYes: () => restartLevel(inst),
    onNo: () => inst.continueOnNo && enterLevel(inst, inst.levels[inst.selected]),
    defaultYes: true,
    onSelect: () => Sound.playMenuClickSound(inst.sound),
    z: MENU_DIALOG_Z,
    look,
    paintPlate: look === ConfirmDialog.LOOKS.CAVE && CaveAtlas.isLoaded() ? paintPlate : null
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
// A click or tap on a row selects it and asks whether to start that level
// over (Yes) or continue it (No) when it has saved progress; otherwise it
// enters at once. A click elsewhere continues the last level.
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
  askRestartOrEnter(inst, level)
  return true
}
//
// A level with saved progress asks first; a fresh one just starts.
//
function askRestartOrEnter(inst, level) {
  if (!level.playable || inst.isLeavingScene || isMenuTransitionBlocking(inst.k)) return
  const saved = get('lastLesson', null)
  if (!saved?.startsWith(level.lessonPrefix)) {
    enterLevel(inst, level)
    return
  }
  openRestartDialog(inst, level, true)
}
//
// A click or tap anywhere off the level panel continues the level last
// played (the selected one when nothing is saved yet).
//
function continueOnTouchOutsidePanel(inst) {
  if (isPointerOnPanel(inst)) return false
  const saved = get('lastLesson', null)
  const level = inst.levels.find(row => saved?.startsWith(row.lessonPrefix)) ?? inst.levels[inst.selected]
  selectLevel(inst, level.index)
  enterLevel(inst, level)
  return true
}
function isPointerOnPanel(inst) {
  const pointer = inst.k.mousePos()
  return isPointOnPanel(inst, pointer.x, pointer.y)
}
function isPointOnPanel(inst, x, y) {
  const { panel } = inst
  return x >= panel.x && x <= panel.x + panel.w && y >= panel.y && y <= panel.y + panel.h
}
//
// The mouse never reaches Kaplay (see no-mouse.js), so its click comes with
// the page point: off the level panel it does what Space does.
//
function onMousePress(inst, point) {
  const rect = inst.k.canvas.getBoundingClientRect()
  const x = (point.x - rect.left) * inst.k.width() / rect.width
  const y = (point.y - rect.top) * inst.k.height() / rect.height
  isPointOnPanel(inst, x, y) || onStartKey(inst, MENU_KEY_START)
}
function onBackKey(inst) {
  if (!inst.sceneReady || inst.isLeavingScene || isMenuTransitionBlocking(inst.k)) return
  if (isRepeatedKeyPress(inst, MENU_KEY_BACK)) return
  if (ConfirmDialog.isOpen(inst.dialog)) {
    ConfirmDialog.close(inst.dialog)
    return
  }
  stopMenuLoops(inst.music, inst.sound, inst.caveSound)
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
  stopMenuLoops(inst.music, inst.sound, inst.caveSound)
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
  stopMenuLoops(inst.music, inst.sound, inst.caveSound)
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
  updateHeroGaze(inst)
  inst.levels.forEach(row => updateLevelRow(inst, row, dt))
  updateBackdropFade(inst, level.backdrop, dt)
  updatePanelLook(inst, level, dt)
  inst.panelCave > MENU_FADE_EPS && CaveMenuPanel.onUpdate(inst.cavePanel)
  inst.bgOpacity[BACKDROP_CAVE] > MENU_FADE_EPS && CaveMenuBg.onUpdate(inst.caveBg)
  inst.bgOpacity[BACKDROP_MYSTERY] > MENU_FADE_EPS && QuestionDrift.onUpdate(inst.mysteryBg, dt)
  ChainBuoy.onUpdate(inst.forestEyes, hero.pos.x, hero.pos.y, dt, ChainBuoy.collectSights(inst.forestEyes, inst.crawler, inst.forestLife?.bud), true, inst.crawler)
  BombTree.onUpdate(inst.earTrees, dt)
  SpikyTomato.onUpdate(inst.tomatoes, dt)
  updateMenuCrawler(inst, dt)
  updateMenuForestLife(inst, dt)
  updateMenuMusic(inst, dt)
  updateReveal(inst, dt)
}
//
// The cover over a menu still coming up: held until its living parts are
// made and every asset has loaded (and a few frames drawn under it), then
// faded away — everything appears together.
//
function updateReveal(inst, dt) {
  if (inst.cover <= 0) return
  inst.revealWait += dt
  if (inst.revealIn > 0 && inst.revealWait < MENU_REVEAL_MAX) {
    inst.lifeReady && inst.k.loadProgress() >= 1 && inst.revealIn--
    return
  }
  inst.cover = Math.max(0, inst.cover - dt / MENU_REVEAL_FADE)
}
//
// The panel's colour eases to the selected level's (0 forest … 1 cave).
//
function updatePanelLook(inst, level, dt) {
  const want = level.section === CAVE_SECTION ? 1 : 0
  inst.panelCave += (want - inst.panelCave) * Math.min(1, dt * MENU_PANEL_FADE_RATE)
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
// The hero keeps his eyes on the selected level's eye (as it breathes).
//
function updateHeroGaze(inst) {
  const level = inst.levels[inst.selected]
  inst.gaze.x = inst.layout.columnX
  inst.gaze.y = level.y + (showsQuestionMark(level) ? 0 : MENU_ICON_EYE_Y * inst.layout.s * level.selectScale)
  Hero.setLookAtPos(inst.heroInst, inst.gaze)
}
//
// The crawler is shown with the forest only; while shown it heads for a new
// random spot of its strip every few seconds.
//
function updateMenuCrawler(inst, dt) {
  const crawler = inst.crawler
  crawler.obj.hidden = inst.bgOpacity[BACKDROP_FOREST] <= MENU_FADE_EPS
  inst.crawlerT -= dt
  if (inst.crawlerT <= 0) {
    inst.crawlerT = MENU_CRAWLER_RETARGET_MIN + Math.random() * MENU_CRAWLER_RETARGET_RANGE
    crawler.homeX = crawler.minX + Math.random() * (crawler.maxX - crawler.minX)
  }
  Predator.update(crawler, dt)
}
//
// The lake's water, the tree's apples, the bug, the flower and the midges
// live all the while; they show with the forest only (the veil fades them
// with it).
//
function updateMenuForestLife(inst, dt) {
  inst.lake && Lake.onUpdate(inst.lake)
  const life = inst.forestLife
  if (!life) return
  const forest = inst.bgOpacity[BACKDROP_FOREST]
  const hidden = forest <= MENU_FADE_EPS
  inst.menuTramps.forEach(t => updateMenuTramp(inst, t, dt, hidden))
  AppleBug.setHidden(life.bug, hidden)
  WaterFlower.setHidden(life.flower, hidden)
  life.fruitLayer.hidden = hidden
  updateForestMidges(life.midges, dt, hidden ? 0 : OPAQUE)
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
// any other row (and the cave ambience on the cave row).
//
function updateMenuMusic(inst, dt) {
  const backdrop = inst.levels[inst.selected].backdrop
  updateMenuCaveSound(inst, backdrop === BACKDROP_CAVE, dt)
  const birds = inst.music.birds
  if (!birds) return
  const target = backdrop === BACKDROP_FOREST ? MENU_BIRDS_VOLUME : 0
  const step = MENU_BIRDS_VOLUME * dt / MENU_BIRDS_FADE_SEC
  birds.volume = birds.volume < target ? Math.min(target, birds.volume + step) : Math.max(target, birds.volume - step)
}
//
// Fades the cave's drips and draught in on the cave row, out elsewhere;
// they only run while they can be heard.
//
function updateMenuCaveSound(inst, shown, dt) {
  const step = dt / MENU_CAVE_FADE_SEC
  inst.caveVolume = shown ? Math.min(1, inst.caveVolume + step) : Math.max(0, inst.caveVolume - step)
  CaveSound.setVolume(inst.caveSound, inst.caveVolume)
  inst.caveVolume > 0 && CaveSound.onUpdate(inst.caveSound, dt, MENU_CAVE_LISTENER_Y)
}
//
// Night picture under the forest, cave and "?" ones (a switch fades the old
// one out, then the new one in): the night and "?" ones with their own
// opacity, the forest and the cave whole — every part at once — under the
// veil (drawBackdropVeil).
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
  forest > MENU_FADE_EPS && drawForestBackdrop(inst)
  inst.bgOpacity[BACKDROP_CAVE] > MENU_FADE_EPS && CaveMenuBg.onDraw(inst.caveBg)
  const mystery = inst.bgOpacity[BACKDROP_MYSTERY]
  mystery > MENU_FADE_EPS && QuestionDrift.onDraw(inst.mysteryBg, mystery)
}
//
// The veil over a forest or cave backdrop still coming in or going out:
// the screen's base colour, as thick as the backdrop is still missing.
//
function drawBackdropVeil(inst) {
  if (inst.isLeavingScene) return
  const shown = Math.max(inst.bgOpacity[BACKDROP_FOREST], inst.bgOpacity[BACKDROP_CAVE])
  if (shown <= MENU_FADE_EPS || shown >= OPAQUE) return
  const { k } = inst
  k.drawRect({
    pos: k.vec2(-MENU_BG_EDGE_OVERSCAN, -MENU_BG_EDGE_OVERSCAN),
    width: k.width() + MENU_BG_EDGE_OVERSCAN * 2,
    height: k.height() + MENU_BG_EDGE_OVERSCAN * 2,
    color: getRGB(k, CFG.visual.colors.ready.background),
    opacity: OPAQUE - shown
  })
}
//
// The cave card's soil line: through the foot of the cave level's eye on
// the panel.
//
function caveGround(layout) {
  const row = LEVELS.findIndex(level => level.section === CAVE_SECTION)
  return { y: layout.firstY + row * layout.step + CaveMenuStalkEye.ICON_FOOT_Y * layout.s, eyeX: layout.columnX }
}
//
// The forest goes back to front like the level: baked sky and parallax
// rows, the drifting clouds, the baked front scene, the lake (bed, algae,
// water), the bomb trees' roots and trees with their bombs, then the stalk
// eyes — all of it opaque (the veil fades it).
//
function drawForestBackdrop(inst) {
  const { k } = inst
  const pieces = inst.forestPieces
  drawForestPieces(k, pieces.slice(0, -1), OPAQUE)
  Clouds.onDraw(inst.clouds, OPAQUE)
  drawForestPieces(k, pieces.slice(-1), OPAQUE)
  inst.menuTramps.forEach(t => drawMenuTramp(k, t, OPAQUE))
  Lake.drawBed(k, inst.lake, OPAQUE)
  Lake.drawAlgae(k, inst.lake, OPAQUE)
  Lake.drawFill(k, inst.lake, OPAQUE)
  BombTree.onDrawRoots(inst.earTrees, OPAQUE)
  BombTree.onDrawTrees(inst.earTrees, OPAQUE)
  SpikyTomato.onDraw(inst.tomatoes, OPAQUE)
  ChainBuoy.onDraw(inst.forestEyes, forestEyeBerryColors(k))
}
function drawForestPieces(k, pieces, opacity) {
  pieces.forEach(piece => k.drawSprite({
    sprite: piece.sprite,
    pos: k.vec2(piece.x, piece.y),
    opacity
  }))
}
//
// The level panel behind the hero and the icons: each look shown (the two
// cross-fading) as its live ground inside the card's shape, then its frame.
//
function drawMenuPanel(inst) {
  if (inst.isLeavingScene) return
  const { k, panel } = inst
  const pos = k.vec2(panel.x1 - panel.pad, panel.y1 - panel.pad)
  const cave = inst.panelCave
  //
  // The cave look whole and opaque underneath (its runner and fireflies
  // with it), the forest look over it fading: every part of a look comes
  // in at once.
  //
  inst.panelFade = OPAQUE - cave
  cave > MENU_FADE_EPS && k.drawMasked(inst.panelDraws.cave, inst.panelDraws.mask)
  inst.panelFade > MENU_FADE_EPS && k.drawMasked(inst.panelDraws.forest, inst.panelDraws.mask)
  inst.panelFade > 0 && k.drawSprite({ sprite: panel.forestFrame, pos, opacity: inst.panelFade })
  cave > 0 && k.drawSprite({ sprite: panel.caveFrame, pos, opacity: cave })
}
//
// The drawing passes the stencil mask takes (made once: no new functions
// every frame).
//
function createPanelDraws(inst) {
  return {
    mask: () => drawPanelMask(inst),
    forest: () => drawPanelCloud(inst),
    cave: () => drawPanelCave(inst)
  }
}
//
// The card's rounded shape, the mask its ground is drawn in.
//
function drawPanelMask(inst) {
  const { k, panel } = inst
  k.drawRect({ pos: k.vec2(panel.x1, panel.y1), width: panel.w, height: panel.h, radius: panel.radius })
}
//
// The forest card's ground: the cloud's cream, then its rows of puffs,
// each strip drifting at its own pace (drawn twice so it wraps round).
//
function drawPanelCloud(inst) {
  const { k, panel } = inst
  const t = k.time()
  k.drawSprite({ sprite: panel.cloudBase, pos: k.vec2(panel.x1, panel.y1), opacity: inst.panelFade })
  panel.cloudRows.forEach((sprite, i) => {
    const off = (t * MENU_PANEL_PUFF_ROWS[i].drift * panel.s) % panel.tileW
    k.drawSprite({ sprite, pos: k.vec2(panel.x1 - off, panel.y1), opacity: inst.panelFade * MENU_PANEL_ART_ALPHA })
    k.drawSprite({ sprite, pos: k.vec2(panel.x1 - off + panel.tileW, panel.y1), opacity: inst.panelFade * MENU_PANEL_ART_ALPHA })
  })
}
//
// The cave card's ground: the cave's far wall, its soil (the cave eye grows
// out of it) and the runner hunting fireflies over it (cave-menu-panel.js).
//
function drawPanelCave(inst) {
  CaveMenuPanel.onDraw(inst.cavePanel)
}
//
// Bakes the level panel's pictures for the current layout (once per live k
// and window size): each look's frame, the cloud's cream and its drifting
// rows; returns them with the card's screen box.
//
function loadMenuPanel(k, layout) {
  const s = layout.s
  const pad = MENU_PANEL_PAD * s
  const x1 = layout.heroX - MENU_PANEL_LEFT_PAD * s
  const x2 = layout.columnX + MENU_PANEL_RIGHT_PAD * s
  const y1 = layout.firstY - layout.step * MENU_PANEL_END_SHARE
  const y2 = layout.firstY + layout.step * (LEVELS.length - 1 + MENU_PANEL_END_SHARE)
  const w = Math.round(x2 - x1)
  const h = Math.round(y2 - y1)
  const tileW = w * MENU_PUFF_TILE
  const key = `${MENU_PANEL_SPRITE}-v5-${k.width()}x${k.height()}`
  const panel = {
    s,
    pad,
    x1: Math.round(x1),
    y1: Math.round(y1),
    w,
    h,
    radius: MENU_PANEL_RADIUS * s,
    tileW,
    forestFrame: `${key}-forest`,
    caveFrame: `${key}-cave`,
    cloudBase: `${key}-cloud`,
    cloudRows: MENU_PANEL_PUFF_ROWS.map((_, i) => `${key}-cloud-row${i}`)
  }
  k.getSprite(panel.forestFrame) || k.loadSprite(panel.forestFrame, bakePanelFrame(w, h, s, FOREST_PAL.menuPanelForest))
  k.getSprite(panel.caveFrame) || k.loadSprite(panel.caveFrame, bakePanelFrame(w, h, s, FOREST_PAL.menuPanelCave))
  k.getSprite(panel.cloudBase) || k.loadSprite(panel.cloudBase, bakePanelGround(w, h, FOREST_PAL.menuPanelForest, paintPanelCloudBase))
  const rng = createSeededRandom(MENU_PUFF_SEED)
  panel.cloudRows.forEach((name, i) => { k.getSprite(name) || k.loadSprite(name, bakePanelPuffRow(tileW, h, w, MENU_PANEL_PUFF_ROWS[i], rng)) })
  return panel
}
//
// A look's frame over its card: the lit band fading down from the top and
// the thin dark contour, then film grain.
//
function bakePanelFrame(w, h, s, look) {
  const pad = MENU_PANEL_PAD * s
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w + pad * 2)
  canvas.height = Math.ceil(h + pad * 2)
  const ctx = canvas.getContext('2d')
  const card = new Path2D()
  card.roundRect(pad, pad, w, h, MENU_PANEL_RADIUS * s)
  const light = ctx.createLinearGradient(0, pad, 0, pad + h * MENU_PANEL_LIGHT_SHARE)
  light.addColorStop(0, look.light)
  light.addColorStop(1, `${look.light}00`)
  ctx.globalAlpha = MENU_PANEL_LIGHT_ALPHA
  ctx.fillStyle = light
  ctx.fill(card)
  ctx.globalAlpha = 1
  ctx.strokeStyle = look.contour
  ctx.lineWidth = MENU_PANEL_CONTOUR_W * s
  ctx.stroke(card)
  applyForestFilmGrainToCanvas(canvas, MENU_PANEL_GRAIN_SEED)
  return canvas
}
//
// A card's still ground (its whole box; the mask rounds it): the look's
// translucent colour with the level's ground over it, film grain.
//
function bakePanelGround(w, h, look, paintArt) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.globalAlpha = MENU_PANEL_FILL_ALPHA
  ctx.fillStyle = look.fill
  ctx.fillRect(0, 0, w, h)
  ctx.globalAlpha = MENU_PANEL_ART_ALPHA
  paintArt(ctx, w, h)
  applyForestFilmGrainToCanvas(canvas, MENU_PANEL_GRAIN_SEED)
  return canvas
}
//
// The cloud's cream.
//
function paintPanelCloudBase(ctx, w, h) {
  ctx.fillStyle = FOREST_PAL.menuPanelCloud.light
  ctx.fillRect(0, 0, w, h)
}
//
// One row of the cloud's puffs as a seamless strip tileW wide (each puff
// also drawn a strip's width on either side, so its ends meet), filled on
// down to the card's bottom; its sizes are shares of the card's width.
//
function bakePanelPuffRow(tileW, h, cardW, row, rng) {
  const canvas = document.createElement('canvas')
  canvas.width = tileW
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const r = row.r * cardW
  const y = row.y * h
  ctx.fillStyle = FOREST_PAL.menuPanelCloud[row.color]
  ctx.beginPath()
  const count = Math.max(1, Math.round(tileW / (r * MENU_PUFF_STEP)))
  const step = tileW / count
  for (let i = 0; i < count; i++) {
    const pr = r * (1 + (rng() * 2 - 1) * MENU_PUFF_JITTER)
    const py = y + (rng() * 2 - 1) * r * MENU_PUFF_JITTER
    const px = (i + (rng() * 2 - 1) * MENU_PUFF_JITTER) * step
    for (let wrap = -1; wrap <= 1; wrap++) {
      const x = px + wrap * tileW
      ctx.moveTo(x + pr, py)
      ctx.arc(x, py, pr, 0, Math.PI * 2)
    }
  }
  ctx.rect(0, y, tileW, h - y)
  ctx.fill()
  applyForestFilmGrainToCanvas(canvas, MENU_PANEL_GRAIN_SEED + 1)
  return canvas
}
//
// "?" glyphs for locked levels and ones not reached yet (one sprite pass),
// then the prohibition rings and slashes over the locked ones (one
// primitive pass) — the stalk-eye icons draw themselves.
//
function drawLevelIcons(inst) {
  if (inst.isLeavingScene) return
  const { k, layout } = inst
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
//
// The same cover while the menu comes up (fading away once it is all there).
//
function drawRevealCover(inst) {
  if (inst.cover <= 0 || inst.isLeavingScene) return
  const { k } = inst
  k.drawRect({ pos: k.vec2(0, 0), width: k.width(), height: k.height(), color: getRGB(k, MENU_LEAVE_BG_HEX), opacity: inst.cover })
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
  inst.mouseCancel?.()
  CanvasBackdrop.clearCanvasBackdrop(inst.k)
  stopMenuLoops(inst.music, inst.sound, inst.caveSound)
  inst.heroInst.character.destroy()
}
//
// Stops the menu's looping sounds: its music, the cave ambience and
// Valera's propeller whirr (the bud's own update, which would fade it out,
// stops with the scene).
//
function stopMenuLoops(music, sound, caveSound) {
  stopMenuMusic(music)
  Sound.stopPropellerHum(sound)
  CaveSound.stop(caveSound)
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
// The cave level's ambience, running silent until the cave row is selected.
//
function startMenuCaveSound(sound) {
  const caveSound = CaveSound.create(sound, 0)
  CaveSound.startAmbience(caveSound)
  return caveSound
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
    spriteKey: `${MENU_LAKE_SPRITE_KEY}-${k.width()}x${k.height()}`
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
// The two ground trampolines, live like the level's: swaying now and
// then on their own (their contact shadows are baked into the backdrop).
//
function createMenuTramps(k, forestLayout) {
  return forestLayout.tramps.map(t => {
    const sprite = TrampMushroom.bake(k, t.kind, t.width)
    return { ...t, sprite, squash: 0, pos: k.vec2(t.x, t.footY), scale: k.vec2(1, 1), look: { sprite, frame: 0 } }
  })
}
function updateMenuTramp(inst, tramp, dt, hidden) {
  tramp.squash > 0 && (tramp.squash = Math.max(0, tramp.squash - dt * TrampMushroom.SQUASH_RELAX))
  TrampMushroom.tickIdleSqueeze(tramp, dt) && !hidden && Sound.playTrampMushroomSnap(inst.sound)
}
function drawMenuTramp(k, tramp, opacity) {
  if (!tramp.sprite) return
  const look = TrampMushroom.squeezeLook(tramp.sprite, tramp, tramp.look)
  tramp.scale.y = 1 - tramp.squash * TrampMushroom.SQUASH_DRAW
  k.drawSprite({ sprite: look.sprite, frame: look.frame, pos: tramp.pos, anchor: 'bot', scale: tramp.scale, opacity })
}
//
// The forest's live life is created once its pictures are baked on this k
// (prewarmed at boot; a fresh engine bakes them on the first visit), unless
// the menu is gone by then.
//
function startMenuForestLife(inst) {
  loadMenuForestLife(inst.k).then(ready => onMenuForestLifeLoaded(inst, ready))
}
//
// The forest life's art is in: it is made (unless the menu is gone), and
// the menu may show.
//
function onMenuForestLifeLoaded(inst, ready) {
  ready && !inst.closed && createMenuForestLife(inst)
  inst.lifeReady = true
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
  const { groundY, lake, appleTreeX, bugHoleX, branchTrampX, scale } = forestLayout
  const hangs = leftTreeApples({ x: appleTreeX, y: groundY }, scale)
  const orchard = { k, treeFruitSpots: [], treeApples: TreeFruit.createForestTreeApples(hangs, leftTreeApplePicture(k)) }
  TreeFruit.restoreForestTreeApples(orchard, MENU_TREE_APPLES)
  const midges = createForestMidges(k, groundY, k.width(), { treeX: appleTreeX, lakeX2: lake.x2, trampX: branchTrampX, lakeOnly: true, z: MENU_MIDGE_Z })
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
      fieldTrampX: branchTrampX,
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
    isVisible: () => !inst.isLeavingScene && inst.bgOpacity[BACKDROP_FOREST] > MENU_FADE_EPS,
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
