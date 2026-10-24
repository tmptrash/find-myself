import * as Sound from "../utils/sound.js"
import { CFG } from "../cfg.js"
import { getRGB, bindBackToMenuKeys, bindStartGameKeys } from "../utils/helper.js"
import * as Hero from "../components/hero.js"
import { showTransitionToLevel } from "../utils/transition.js"
import { goAfterPreparingAssets } from "../utils/lesson-assets.js"
import { getProgress, get, set, normalizeSceneName } from "../utils/progress.js"
import * as Cursor from "../utils/cursor.js"
import * as BootLoader from "../utils/boot-loader.js"
import * as CanvasBackdrop from "../utils/canvas-backdrop.js"
import { bindPointerActivate } from '../utils/pointer-activate.js'
import { registerEngineTeardown } from '../utils/engine-teardown.js'
import { generateMenuBackgroundCanvas, recomputeMenuBgLayout } from '../utils/menu-bg-generator.js'
import { generateForestMenuBackdrop, forestMenuLayout } from '../sections/forest/utils/forest-menu-bg.js'
import * as ChainBuoy from '../sections/forest/utils/forest-chain-buoy.js'
import { forestEyeBerryColors } from '../sections/forest/utils/forest-eye-berry.js'
import { FOREST_PAL, forestRgb } from '../sections/forest/utils/forest-palette.js'
import * as Lake from '../sections/forest/utils/forest-lake.js'
import * as EarTree from '../sections/forest/utils/forest-ear-tree.js'
import * as Predator from '../sections/forest/components/predator.js'
import * as SpikyTomato from '../sections/forest/components/spiky-tomato.js'
import { applyForestGameplaySharpBake } from '../sections/forest/utils/forest-focus-depth.js'
import * as Grass from '../components/grass.js'
import * as MenuMushroom from '../sections/forest/components/menu-mushroom.js'
import { addForestFilmGrainOverlayLayer } from '../sections/forest/utils/forest-parallax-grain.js'
import { loadForestTextSprite, forestUiHash } from '../sections/forest/utils/forest-ui-bake.js'
//
// Level list: a vertical column of levels, the hero standing left of it as
// the cursor. A level the player can enter shows its picture (only the
// forest has one so far: the trampoline mushroom), its name to the right and
// its description at the bottom; every other level is a "?" crossed by the
// red prohibition sign, with no name and no description. Each level owns a
// backdrop that cross-fades in while it is selected.
//
const BACKDROP_FOREST = 'forest'
const BACKDROP_NIGHT = 'night'
const LEVEL_ICON_MUSHROOM = 'mushroom'
const FOREST_LESSON_PREFIX = 'lesson-forest.'
const FOREST_FIRST_LESSON = 'lesson-forest.0'
const FOREST_DESCRIPTION = [
  'A gray forest that has forgotten its colours.',
  'Look closely: the forest looks back,',
  'and it wakes only for those who learn to see.'
].join('\n')
const LEVELS = [
  { section: 'forest', name: 'forest', icon: LEVEL_ICON_MUSHROOM, description: FOREST_DESCRIPTION, backdrop: BACKDROP_FOREST },
  { section: 'touch', name: 'touch', icon: null, description: null, backdrop: BACKDROP_NIGHT },
  { section: 'word', name: 'word', icon: null, description: null, backdrop: BACKDROP_NIGHT },
  { section: 'time', name: 'time', icon: null, description: null, backdrop: BACKDROP_NIGHT },
  { section: 'feel', name: 'feel', icon: null, description: null, backdrop: BACKDROP_NIGHT }
]
//
// Layout in design px at MENU_REF_HEIGHT, scaled with the window height; the
// column stands at MENU_COLUMN_X_FRAC of the width, centred on
// MENU_COLUMN_Y_FRAC of the height.
//
const MENU_REF_HEIGHT = 1080
const MENU_COLUMN_X_FRAC = 0.2
const MENU_COLUMN_Y_FRAC = 0.42
const MENU_ITEM_STEP = 112
const MENU_HERO_GAP = 118
const MENU_NAME_GAP = 66
const MENU_DESCRIPTION_Y_FRAC = 0.885
const MENU_HINT_BOTTOM = 26
//
// Mouse hover band of one row: from the hero's spot to past the name.
//
const MENU_ROW_LEFT_PAD = 50
const MENU_ROW_RIGHT_REACH = 260
//
// Hero glide between rows and the gentle breathing pulse of the selected icon.
//
const MENU_HERO_EASE = 12
const MENU_SELECT_PULSE_AMP = 0.06
const MENU_SELECT_PULSE_SPEED = 2.8
const MENU_SELECT_SCALE_EASE = 8
//
// Fade speeds (per second, eased): backdrops and texts.
//
const BG_FADE_SPEED = 3
const TEXT_FADE_SPEED = 6
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
// Swaying grass along the forest ground: the level's grass tone shifting
// toward warm gold per blade, so the field reads yellow; none on the lake.
//
const MENU_GRASS_TUFT_COUNT = 40
const MENU_GRASS_EDGE_INSET = 20
const MENU_GRASS_RGB = forestRgb(FOREST_PAL.treeColor.leafShades[0])
const MENU_GRASS_HUE_VARY_MAX = 1
const MENU_GRASS_HUE_VARY_SKEW = 0.5
//
// The crawler roams the ground east of the lake, heading for a new random
// spot every few seconds; it never hunts the menu hero.
//
const MENU_CRAWLER_RETARGET_MIN = 2.5
const MENU_CRAWLER_RETARGET_RANGE = 4
//
// Draw layers.
//
const MENU_BG_Z = 0
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
const PROHIBITED_PULSE_SPEED = 2
const PROHIBITED_PULSE_AMP = 2
const PROHIBITED_COLOR = FOREST_PAL.menuProhibited
//
// Baked texts: level names, descriptions and the key hint, all in the
// regular font with a dark drop shadow.
//
const MENU_TEXT_FONT = CFG.visual.fonts.regularFull
const MENU_TEXT_HEX = CFG.visual.colors.hero.eyeWhite
const MENU_TEXT_SHADOW_HEX = CFG.visual.colors.outline
const MENU_NAME_SIZE = 34
const MENU_DESCRIPTION_SIZE = 22
const MENU_DESCRIPTION_LINE_SPACING = 6
const MENU_HINT_SIZE = 16
const MENU_HINT_OPACITY = 0.55
const MENU_HINT_TEXT = '↑ ↓  choose     enter  play     esc  back'
const MENU_TEXT_SPRITE = 'menu-text'
//
// The selected level's name blinks while the hero stands by it.
//
const MENU_NAME_BLINK_SPEED = 2.5
const MENU_NAME_BLINK_MIN = 0.25
//
// The hero's eyes dart around while it waits: a new glance every
// MENU_GLANCE_MIN..+RANGE seconds at a random spot this far around the hero.
//
const MENU_GLANCE_MIN = 0.25
const MENU_GLANCE_RANGE = 0.9
const MENU_GLANCE_REACH_X = 220
const MENU_GLANCE_REACH_Y = 160
//
// The hero cursor — the white forest hero at its usual size.
//
const MENU_HERO_LOOK = {
  type: Hero.HEROES.HERO,
  bodyColor: CFG.visual.colors.hero.eyeWhite,
  outlineColor: CFG.visual.colors.outline,
  eyeWhiteColor: CFG.visual.colors.hero.eyeWhite,
  pupilColor: CFG.visual.colors.hero.eyePupil,
  outlineOnly: false
}
//
// Menu music (relative to CFG.audio.masterVolume): menu.mp3 at once, kids.mp3
// fading in.
//
const MENU_MUSIC_VOLUME = CFG.audio.masterVolume * 0.3
const MENU_KIDS_VOLUME = CFG.audio.masterVolume * 0.4
const MENU_KIDS_FADE_IN = 4
//
// Section-complete markers saved as lastLesson point at the next section's
// first lesson (time-complete ends the game: no current lesson).
//
const MENU_COMPLETE_NEXT_LESSON = {
  'word-complete': 'lesson-time.0',
  'time-complete': null,
  'touch-complete': 'lesson-word.0',
  'forest-complete': 'lesson-touch.0'
}
const MENU_SCENE_GUARD_DELAY = 0.2
const MENU_PREWARM_YIELD_FRAMES = 2
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
    Cursor.setCursor('arrow')
    const lastLevel = syncMenuLastLesson()
    const progress = getProgress()
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    const music = startMenuMusic(k)
    registerEngineTeardown(() => stopMenuMusic(music))
    loadMenuAssets(k)
    const layout = computeMenuLayout(k)
    const levels = LEVELS.map((level, i) => buildMenuLevel(level, i, layout, progress))
    const selected = Math.max(0, levels.findIndex(level => lastLevel?.startsWith(`lesson-${level.section}.`)))
    const heroInst = Hero.create({
      k,
      x: layout.heroX,
      y: levels[selected].y,
      ...MENU_HERO_LOOK,
      controllable: false,
      isStatic: true,
      idleVocalization: null,
      sfx: sound
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
      musicT: 0,
      glanceT: 0,
      isLeavingScene: false,
      sceneReady: false,
      bgOpacity: { [BACKDROP_FOREST]: 0, [BACKDROP_NIGHT]: 0 },
      forestLayout,
      forestBack: forestPieces.back,
      forestFore: forestPieces.fore,
      forestEyes: ChainBuoy.create({ k, spots: forestLayout.eyeSpots, earthBottomY: k.height() }),
      lake: createMenuLake(k, forestLayout),
      earTrees: EarTree.create({
        k,
        spots: forestLayout.earTreeSpots.map(spot => EarTree.buildSpot(spot.x, forestLayout.groundY, spot.tier))
      }),
      crawlerT: 0
    }
    inst.grass = createMenuGrass(inst)
    inst.tomatoes = SpikyTomato.create({
      k,
      earTrees: inst.earTrees,
      particles: null,
      sfx: sound,
      groundY: forestLayout.groundY
    })
    inst.crawler = createMenuCrawler(inst)
    inst.bgOpacity[levels[selected].backdrop] = 1
    levels[selected].textOpacity = 1
    createMenuMushrooms(inst)
    k.add([k.z(MENU_BG_Z), { draw: () => drawBackdrops(inst) }])
    k.add([k.z(MENU_ICON_Z), { draw: () => drawLevelIcons(inst) }])
    k.add([k.z(MENU_TEXT_Z), { draw: () => drawLevelTexts(inst) }])
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
 * Kaplay instance — both backdrops for the current window size, the hero
 * cursor and the baked texts. Called under the first boot loader, so the
 * first menu visit only reuses loaded sprites.
 * @param {Object} k - Kaplay inst (native-resolution engine)
 * @returns {Promise<void>} Resolves when every bake is loaded into k
 */
export async function prewarmMenuAssets(k) {
  recomputeMenuBgLayout(k.width(), k.height())
  buildMenuNightSprite(k)
  await BootLoader.yieldForGpu(MENU_PREWARM_YIELD_FRAMES)
  loadMenuForestLayerSprites(k)
  await BootLoader.yieldForGpu(MENU_PREWARM_YIELD_FRAMES)
  await document.fonts?.load?.(`${MENU_NAME_SIZE}px ${MENU_TEXT_FONT}`)
  loadMenuAssets(k)
}

//
// Per-level row state: position, what it shows and whether it can be entered.
//
function buildMenuLevel(level, index, layout, progress) {
  const completed = Boolean(progress[level.section]?.completed)
  const playable = Boolean(level.icon)
  return {
    ...level,
    index,
    y: layout.firstY + index * layout.step,
    completed,
    playable,
    showName: playable || completed,
    selectScale: 1,
    textOpacity: 0
  }
}
//
// Window-derived layout: column, hero and name X, row Y spacing, text Y.
//
function computeMenuLayout(k) {
  const s = k.height() / MENU_REF_HEIGHT
  const step = MENU_ITEM_STEP * s
  const columnX = Math.round(k.width() * MENU_COLUMN_X_FRAC)
  return {
    s,
    step,
    columnX,
    heroX: columnX - MENU_HERO_GAP * s,
    nameX: columnX + MENU_NAME_GAP * s,
    firstY: k.height() * MENU_COLUMN_Y_FRAC - step * (LEVELS.length - 1) / 2,
    descriptionY: k.height() * MENU_DESCRIPTION_Y_FRAC,
    hintY: k.height() - MENU_HINT_BOTTOM * s
  }
}
//
// The forest icon is the level's trampoline mushroom; it watches the hero.
//
function createMenuMushrooms(inst) {
  const { k } = inst
  inst.levels.filter(level => level.icon === LEVEL_ICON_MUSHROOM).forEach(level => {
    const pose = { x: inst.layout.columnX, y: level.y, scale: 1 }
    MenuMushroom.create({
      k,
      z: MENU_ICON_Z,
      getPose: () => {
        pose.scale = level.selectScale * inst.layout.s
        return pose
      },
      getLookAt: () => inst.heroInst.character.pos,
      isVisible: () => !inst.isLeavingScene
    })
  })
}
//
// Keyboard (up/down, w/s, space/enter, esc) and mouse (hover selects, click
// enters) bindings.
//
function bindMenuInput(inst) {
  const { k } = inst
  inst.keyCancels = [
    k.onKeyPress('up', () => moveSelection(inst, -1)),
    k.onKeyPress('w', () => moveSelection(inst, -1)),
    k.onKeyPress('down', () => moveSelection(inst, 1)),
    k.onKeyPress('s', () => moveSelection(inst, 1))
  ]
  inst.startCancel = bindStartGameKeys(k, () => enterLevel(inst, inst.levels[inst.selected]))
  inst.pointerCancel = bindPointerActivate(k, () => onPointerActivate(inst))
  inst.backCancel = bindBackToMenuKeys(k, () => onBackKey(inst))
}
//
// Steps the selection with wrap-around (last → first and back).
//
function moveSelection(inst, delta) {
  if (inst.isLeavingScene) return
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
  const level = levelUnderPointer(inst)
  if (!level) return false
  selectLevel(inst, level.index)
  enterLevel(inst, level)
  return true
}
function onBackKey(inst) {
  if (!inst.sceneReady || inst.isLeavingScene || isMenuTransitionBlocking(inst.k)) return
  stopMenuMusic(inst.music)
  goAfterPreparingAssets(inst.k, "ready")
}
//
// Enters a playable level: the forest continues the saved forest lesson or
// starts from its first one; locked levels ignore the press.
//
function enterLevel(inst, level) {
  if (!level.playable || inst.isLeavingScene || isMenuTransitionBlocking(inst.k)) return
  const saved = get('lastLesson', null)
  const lesson = saved?.startsWith(FOREST_LESSON_PREFIX) ? saved : FOREST_FIRST_LESSON
  beginMenuSceneLeave(inst)
  stopMenuMusic(inst.music)
  showTransitionToLevel(inst.k, lesson)
}
//
// Row under the mouse: within half a row step of its centre, inside the band
// from the hero's spot to past the name.
//
function levelUnderPointer(inst) {
  const { k, layout } = inst
  const mouse = k.mousePos()
  if (mouse.x < layout.heroX - MENU_ROW_LEFT_PAD * layout.s) return null
  if (mouse.x > layout.nameX + MENU_ROW_RIGHT_REACH * layout.s) return null
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
  updateHeroGlance(inst, dt)
  inst.levels.forEach(row => updateLevelRow(inst, row, dt))
  Object.keys(inst.bgOpacity).forEach(key => {
    const target = key === level.backdrop ? 1 : 0
    inst.bgOpacity[key] += (target - inst.bgOpacity[key]) * Math.min(1, dt * BG_FADE_SPEED)
  })
  ChainBuoy.onUpdate(inst.forestEyes, hero.pos.x, hero.pos.y, dt)
  EarTree.onUpdate(inst.earTrees, dt)
  SpikyTomato.onUpdate(inst.tomatoes, dt)
  updateMenuCrawler(inst, dt)
  updateMenuMusic(inst, dt)
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
// Mouse movement over a row selects it; a resting mouse never fights the
// keyboard. The pointer cursor marks rows that can be entered.
//
function updatePointerHover(inst) {
  const mouse = inst.k.mousePos()
  const moved = mouse.x !== inst.lastMouse.x || mouse.y !== inst.lastMouse.y
  inst.lastMouse = { x: mouse.x, y: mouse.y }
  const level = levelUnderPointer(inst)
  Cursor.setCursor(level?.playable ? 'pointer' : 'arrow')
  moved && level && selectLevel(inst, level.index)
}
//
// Selected row: icon breathes, its name and description fade in; the rest
// settle back and fade out.
//
function updateLevelRow(inst, row, dt) {
  const { k } = inst
  const isSelected = row.index === inst.selected
  const scaleTarget = isSelected ? 1 + MENU_SELECT_PULSE_AMP * Math.sin(k.time() * MENU_SELECT_PULSE_SPEED) : 1
  row.selectScale += (scaleTarget - row.selectScale) * Math.min(1, dt * MENU_SELECT_SCALE_EASE)
  row.textOpacity += ((isSelected ? 1 : 0) - row.textOpacity) * Math.min(1, dt * TEXT_FADE_SPEED)
}
function updateMenuMusic(inst, dt) {
  if (inst.musicT >= MENU_KIDS_FADE_IN) return
  inst.musicT = Math.min(MENU_KIDS_FADE_IN, inst.musicT + dt)
  inst.music.kids.volume = inst.musicT / MENU_KIDS_FADE_IN * MENU_KIDS_VOLUME
}
//
// Night picture under the forest one; each fades with its own opacity, so a
// switch cross-fades. The forest goes back to front like the level: baked
// back layers, the lake (bed, algae, water), the stone pile over its
// shallows, ear-tree trunks, grass, ear-tree roots / trunk tops / crowns
// with their spiky bombs, then the stalk eyes once the forest is mostly in.
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
  if (forest <= MENU_FADE_EPS) return
  drawForestPieces(k, inst.forestBack, forest)
  Lake.drawBed(k, inst.lake, forest)
  Lake.drawAlgae(k, inst.lake, forest)
  Lake.drawFill(k, inst.lake, forest)
  drawForestPieces(k, inst.forestFore, forest)
  const c = EarTree.earTreeColors(k)
  EarTree.onDrawTrunks(inst.earTrees, c.bark, c.barkShades, c.outline, forest)
  Grass.draw(inst.grass)
  EarTree.onDrawRoots(inst.earTrees, c.root, forest)
  EarTree.onDrawTrunksAboveGrass(inst.earTrees, c.bark, c.barkShades, c.outline, forest)
  EarTree.onDrawBranches(inst.earTrees, c.bark, c.barkShades, c.outline, c.leaves, forest)
  SpikyTomato.onDraw(inst.tomatoes, forest)
  forest > MENU_FOREST_LIVE_MIN_OPACITY && ChainBuoy.onDraw(inst.forestEyes, forestEyeBerryColors(k))
}
function drawForestPieces(k, pieces, opacity) {
  pieces.forEach(piece => k.drawSprite({
    sprite: piece.sprite,
    pos: k.vec2(piece.x, piece.y),
    opacity: opacity * piece.alpha
  }))
}
//
// "?" glyphs first (one sprite pass), then the prohibition rings and slashes
// (one primitive pass) — the mushroom icon draws itself.
//
function drawLevelIcons(inst) {
  if (inst.isLeavingScene) return
  const { k, layout } = inst
  const locked = inst.levels.filter(level => !level.icon)
  locked.forEach(level => k.drawSprite({
    sprite: questionMarkSpriteName(layout.s),
    pos: k.vec2(layout.columnX + MENU_QUESTION_MARK_NUDGE_X * layout.s, level.y),
    anchor: 'center',
    scale: k.vec2(level.selectScale, level.selectScale)
  }))
  const color = getRGB(k, PROHIBITED_COLOR)
  locked.filter(level => !level.completed).forEach(level => drawProhibitedSign(k, layout.columnX, level.y, layout.s * level.selectScale, color))
}
//
// Red ring with the diagonal slash over a locked level.
//
function drawProhibitedSign(k, cx, cy, scale, color) {
  const r = (PROHIBITED_RING_RADIUS + Math.sin(k.time() * PROHIBITED_PULSE_SPEED) * PROHIBITED_PULSE_AMP) * scale
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
// Name to the right of the row (left-aligned, vertically centred), the
// description centred at the bottom, the key hint under it.
//
function drawLevelTexts(inst) {
  if (inst.isLeavingScene) return
  const { k, layout } = inst
  inst.levels.forEach(level => {
    if (level.textOpacity <= MENU_FADE_EPS) return
    level.showName && k.drawSprite({
      sprite: menuTextSpriteName(`name-${level.section}`, MENU_NAME_SIZE, layout.s),
      pos: k.vec2(layout.nameX, level.y),
      anchor: 'left',
      opacity: level.textOpacity * nameBlink(k)
    })
    level.description && k.drawSprite({
      sprite: menuTextSpriteName(`description-${level.section}`, MENU_DESCRIPTION_SIZE, layout.s),
      pos: k.vec2(k.width() / 2, layout.descriptionY),
      anchor: 'center',
      opacity: level.textOpacity
    })
  })
  k.drawSprite({
    sprite: menuTextSpriteName('hint', MENU_HINT_SIZE, layout.s),
    pos: k.vec2(k.width() / 2, layout.hintY),
    anchor: 'center',
    opacity: MENU_HINT_OPACITY
  })
}
//
// Blink factor of the selected name: a soft on/off pulse.
//
function nameBlink(k) {
  return MENU_NAME_BLINK_MIN + (1 - MENU_NAME_BLINK_MIN) * (0.5 + 0.5 * Math.cos(k.time() * MENU_NAME_BLINK_SPEED))
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
  Cursor.setCursor('arrow')
  inst.heroInst.character.hidden = true
}
function onMenuLeave(inst) {
  inst.keyCancels.forEach(c => c?.cancel?.())
  inst.startCancel.cancel()
  inst.backCancel.cancel()
  inst.pointerCancel?.cancel()
  CanvasBackdrop.clearCanvasBackdrop(inst.k)
  stopMenuMusic(inst.music)
  inst.heroInst.character.destroy()
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
  const lastLevel = normalized in MENU_COMPLETE_NEXT_LESSON ? MENU_COMPLETE_NEXT_LESSON[normalized] : normalized
  lastLevel !== saved && set('lastLesson', lastLevel)
  return lastLevel
}
function startMenuMusic(k) {
  return {
    menu: k.play("menu", { loop: true, volume: MENU_MUSIC_VOLUME }),
    kids: k.play("kids", { loop: true, volume: 0 })
  }
}
//
// HTML music can resume after pause() if play() resolves late, and then keeps
// sounding once the Web Audio graph is torn down for the Forest loader — so
// the tracks are hushed repeatedly for a while.
//
function stopMenuMusic(music) {
  [music.menu, music.kids].forEach(play => {
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
  Hero.loadHeroSprites({ k, ...MENU_HERO_LOOK })
  loadMenuTextSprites(k)
}
//
// Name / description / hint / "?" sprites at the window's text scale.
//
function loadMenuTextSprites(k) {
  const s = k.height() / MENU_REF_HEIGHT
  loadQuestionMarkSprite(k, s)
  loadMenuTextSprite(k, 'hint', MENU_HINT_TEXT, MENU_HINT_SIZE, s, MENU_TEXT_HEX)
  LEVELS.forEach(level => {
    loadMenuTextSprite(k, `name-${level.section}`, level.name, MENU_NAME_SIZE, s, MENU_TEXT_HEX)
    level.description && loadMenuTextSprite(k, `description-${level.section}`, level.description, MENU_DESCRIPTION_SIZE, s, MENU_TEXT_HEX)
  })
}
function loadMenuTextSprite(k, key, text, size, s, fillStyle) {
  const name = menuTextSpriteName(key, size, s)
  if (k.getSprite(name)) return
  loadForestTextSprite(k, name, text, {
    fontFamily: MENU_TEXT_FONT,
    fontSize: Math.round(size * s),
    fillStyle,
    shadowStyle: MENU_TEXT_SHADOW_HEX,
    align: 'center',
    lineSpacing: Math.round(MENU_DESCRIPTION_LINE_SPACING * s)
  }, forestUiHash(key))
}
function menuTextSpriteName(key, size, s) {
  return `${MENU_TEXT_SPRITE}-${key}-${Math.round(size * s)}`
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
// Returns the draw lists under and over the lake.
//
const menuForestPiecesByK = new WeakMap()
function loadMenuForestLayerSprites(k) {
  const loaded = menuForestPiecesByK.get(k)
  if (loaded) return loaded
  const layers = forestMenuBackdrop(k.width(), k.height())
  const upload = (list, group) => list.map((piece, i) => {
    const sprite = `${MENU_FOREST_LAYER_SPRITE}-${group}-${i}`
    k.loadSprite(sprite, piece.canvas)
    return { ...piece, sprite }
  })
  const pieces = { back: upload(layers.back, 'back'), fore: upload(layers.fore, 'fore') }
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
// Swaying grass along the forest ground (drawn manually inside the backdrop
// pass), fading with the forest.
//
function createMenuGrass(inst) {
  const { k, forestLayout } = inst
  const { lake } = forestLayout
  return Grass.create({
    k,
    floorY: forestLayout.groundY,
    left: MENU_GRASS_EDGE_INSET,
    right: k.width() - MENU_GRASS_EDGE_INSET,
    tuftCount: MENU_GRASS_TUFT_COUNT,
    excluded: x => x >= lake.x1 && x <= lake.x2,
    postBakeCanvas: applyForestGameplaySharpBake,
    getTint: () => menuGrassTint(inst),
    hueVaryMax: MENU_GRASS_HUE_VARY_MAX,
    hueVarySkew: MENU_GRASS_HUE_VARY_SKEW
  })
}
function menuGrassTint(inst) {
  const opacity = inst.bgOpacity[BACKDROP_FOREST]
  return opacity > MENU_FADE_EPS ? { ...MENU_GRASS_RGB, opacity } : null
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
