import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set, get } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as Tooltip from '../../../utils/tooltip.js'
import * as BonusHero from '../components/bonus-hero.js'
import * as LevelIndicator from '../components/level-indicator.js'
import * as LogPlatform from '../utils/log-platform.js'
import { createLevelTransition } from '../../../utils/transition.js'
import { goToMenuAfterAssets } from '../../../utils/level-assets.js'
import { loadTouchSprite } from '../../../utils/touch-sprite-registry.js'
import * as TouchControls from '../../../utils/touch-controls.js'
import * as TouchInput from '../../../utils/touch-input.js'
import { renderHintWithEnter } from '../../../utils/touch-tap-button.js'
import * as FloorRocks from '../utils/floor-rocks.js'
import * as BackgroundBirds from '../../time/components/background-birds.js'
import * as OrganicParallax from '../utils/organic-parallax-tree.js'
import { drawThorns } from '../components/jungle-decor.js'
import { getRGB, isAnyKeyDown } from '../../../utils/helper.js'

//
// Game area — same proportions as time section level 0
//
const TOP_MARGIN = 250
const BOTTOM_MARGIN = 255
const LEFT_MARGIN = 192
const RIGHT_MARGIN = 192
const SCREEN_W = CFG.visual.screen.width
const SCREEN_H = CFG.visual.screen.height
const FLOOR_Y = SCREEN_H - BOTTOM_MARGIN
const PLAYABLE_W = SCREEN_W - LEFT_MARGIN - RIGHT_MARGIN
//
// Background color
//
const BG_R = 26
const BG_G = 26
const BG_B = 26
const WALL_COLOR = 31
const WALL_COLOR_HEX = '#1F1F1F'
//
// Hero and anti-hero colors
//
const HERO_BODY_COLOR = '#909090'
const ANTIHERO_BODY_COLOR = '#8B5A50'
const TRAINING_LABEL_COLOR_HEX = '#8B5A50'
const TRAINING_LABEL_INACTIVE_HEX = '#B0B0B0'
const TRAINING_LABEL_LETTER_COUNT = 8
const TRAINING_LETTERS_AFTER_HOVER = 1
const TRAINING_LETTERS_AFTER_HUD_SMALL_HERO = 2
const TRAINING_LETTERS_AFTER_HUD_LIFE = 3
const TRAINING_LETTERS_AFTER_HUD_TIME = 4
const TRAINING_LETTERS_AFTER_RUN = 5
const TRAINING_LETTERS_AFTER_MAIN = 6
const TRAINING_LETTERS_AFTER_BONUS = 7
const TRAINING_LETTERS_AFTER_COMPLETE = 8
const TRAINING_LABEL_FONT_SIZE = 48
const TRAINING_LABEL_Y = TOP_MARGIN - TRAINING_LABEL_FONT_SIZE - 32
const TRAINING_LABEL_LETTER_SPACING = -14
const TRAINING_HUD_CENTER_Y = TRAINING_LABEL_Y + TRAINING_LABEL_FONT_SIZE / 2 + 10
//
// Main log platform (center, lowered and smaller)
//
const MAIN_PLATFORM_X = LEFT_MARGIN + PLAYABLE_W / 2
const MAIN_PLATFORM_Y = FLOOR_Y - 98
const MAIN_PLATFORM_W = 140
const MAIN_PLATFORM_H = 22
//
// Bonus platform (above and right of main platform, wider and shifted left)
//
const BONUS_PLATFORM_X = MAIN_PLATFORM_X + MAIN_PLATFORM_W / 2 + 88
const BONUS_PLATFORM_Y = MAIN_PLATFORM_Y - 95
const BONUS_PLATFORM_W = 72
//
// Collision box for the hidden log platform.  The box is shifted right by
// half its width so its left edge aligns with the platform anchor point.
// Height matches the regular wooden platform (MAIN_PLATFORM_H) so the
// hidden log feels like a real platform when the hero lands on it.
//
const BONUS_PLATFORM_COLLISION_WIDTH = 84
const BONUS_PLATFORM_COLLISION_HEIGHT = MAIN_PLATFORM_H
const BONUS_PLATFORM_COLLISION_X_OFFSET = BONUS_PLATFORM_COLLISION_WIDTH / 2
const BONUS_PLATFORM_COLLISION_Y_OFFSET = 9
//
// Single red spike cluster to the right of the hidden bonus platform
//
const SPIKE_AFTER_BONUS_GAP = 52
const SPIKE_START_X = BONUS_PLATFORM_X + BONUS_PLATFORM_W / 2 + SPIKE_AFTER_BONUS_GAP
const SPIKE_ZONE_WIDTH = 130
const SPIKE_END_X = SPIKE_START_X + SPIKE_ZONE_WIDTH
const SPIKE_PASS_MARGIN = 36
const SPIKE_MAX_CLUSTERS = 1
const FLOOR_THORN_SPACING = 14
const FLOOR_THORN_WIDTH_MIN = 7
const FLOOR_THORN_WIDTH_MAX = 14
const FLOOR_THORN_MIN_PER_CLUSTER = 2
const FLOOR_THORN_MAX_PER_CLUSTER = 6
const FLOOR_THORN_HEIGHT_MIN = 11
const FLOOR_THORN_HEIGHT_MAX = 20
const FLOOR_THORN_TIP_OFFSET = 3
const FLOOR_THORN_RAISE_OFFSET = 1
const FLOOR_THORN_CLUSTER_MIN = 70
const FLOOR_THORN_CLUSTER_EXTRA = 140
const FLOOR_THORN_GAP_MIN = 80
const FLOOR_THORN_GAP_EXTRA = 140
const FLOOR_THORN_FEET_TOLERANCE_LOW = 28
const FLOOR_THORN_FEET_TOLERANCE_HIGH = 12
const FLOOR_THORN_FEET_MIN_PENETRATION_PAST_TIP = 2
const FLOOR_THORN_COLLISION_TIP_BIAS_DOWN = 14
const FLOOR_THORN_FEET_BELOW_BASE_PAD = 10
const FLOOR_THORN_DEATH_RELOAD_DELAY = 0.8
const FLOOR_THORN_DRAW_Z = 27
const FLOOR_THORN_BLADE_FILL_R = 196
const FLOOR_THORN_BLADE_FILL_G = 38
const FLOOR_THORN_BLADE_FILL_B = 42
const HERO_HITBOX_HEIGHT_FOR_THORNS = 69
const HERO_HITBOX_OFFSET_Y_FOR_THORNS = 3
const HERO_HALF_WIDTH_THORNS = 15
//
// Anti-hero and hero spawn
//
const ANTIHERO_X = SCREEN_W - RIGHT_MARGIN - 120
const ANTIHERO_Y = FLOOR_Y - 50
const HERO_SPAWN_X = LEFT_MARGIN + 110
const HERO_SPAWN_Y = FLOOR_Y - 50
const HERO_SPAWN_DELAY = 0.5
const PLATFORM_FOREGROUND_Z = 26
const HERO_SPAWN_Z = 28
const ANTIHERO_Z = 28
const ANTIHERO_TOOLTIP_TEXT = "im waitn for u here"
const ANTIHERO_TOOLTIP_HOVER_SIZE = 80
const ANTIHERO_TOOLTIP_Y_OFFSET = -60
const ANTIHERO_MOUSE_HOVER_HALF = ANTIHERO_TOOLTIP_HOVER_SIZE / 2
const TRAINING_SURFACE_FLOOR_THRESHOLD = 80
//
// TRAINING label letter-pair burst particles (life-death style circles)
//
const TRAINING_LABEL_PARTICLE_COUNT = 15
const TRAINING_LABEL_PARTICLE_SPEED_MIN = 80
const TRAINING_LABEL_PARTICLE_SPEED_EXTRA = 40
const TRAINING_LABEL_PARTICLE_LIFETIME_MIN = 0.8
const TRAINING_LABEL_PARTICLE_LIFETIME_EXTRA = 0.4
const TRAINING_LABEL_PARTICLE_SIZE_MIN = 4
const TRAINING_LABEL_PARTICLE_SIZE_EXTRA = 4
const TRAINING_LABEL_PARTICLE_LETTER_Y_OFFSET = 24
//
// HUD small-hero flash on annihilation (touch level 0 pattern)
//
const HERO_SCORE_FLASH_COUNT = 20
const HERO_SCORE_FLASH_INTERVAL = 0.05
const HERO_SCORE_PARTICLE_COUNT = 8
const HERO_SCORE_PARTICLE_SPEED_MIN = 30
const HERO_SCORE_PARTICLE_SPEED_RANGE = 20
const HERO_SCORE_PARTICLE_SIZE_MIN = 4
const HERO_SCORE_PARTICLE_SIZE_RANGE = 4
const HERO_SCORE_PARTICLE_LIFETIME_MIN = 0.8
const HERO_SCORE_PARTICLE_LIFETIME_RANGE = 0.4
//
// Life image flash + red particles on thorn death (same as touch level 0)
//
const LIFE_FLASH_COUNT = 20
const LIFE_FLASH_INTERVAL = 0.05
const LIFE_PARTICLE_COUNT = 15
const LIFE_PARTICLE_SPEED_MIN = 80
const LIFE_PARTICLE_SPEED_EXTRA = 40
const LIFE_PARTICLE_LIFETIME_MIN = 0.8
const LIFE_PARTICLE_LIFETIME_EXTRA = 0.4
const LIFE_PARTICLE_SIZE_MIN = 4
const LIFE_PARTICLE_SIZE_EXTRA = 4
//
// Ground stripe above bottom platform (time level 0 style)
//
const GROUND_STRIPE_HEIGHT = 3
const GROUND_STRIPE_COLOR_R = 20
const GROUND_STRIPE_COLOR_G = 20
const GROUND_STRIPE_COLOR_B = 20
const GROUND_STRIPE_Z = 27
//
// Foreground tree row sits slightly above the floor line
//
const TREE_FLOOR_Y_OFFSET = -3
//
// Blocking rock under the main log platform (fits between log underside and floor line)
//
const MAIN_PLATFORM_BOTTOM_Y = MAIN_PLATFORM_Y + MAIN_PLATFORM_H / 2
const BLOCKING_ROCK_TOP_GAP = 6
const BLOCKING_ROCK_MAX_HEIGHT = FLOOR_Y - MAIN_PLATFORM_BOTTOM_Y - BLOCKING_ROCK_TOP_GAP
const BLOCKING_ROCK_RADIUS = Math.floor(BLOCKING_ROCK_MAX_HEIGHT / 1.9)
const BLOCKING_ROCK_CENTER_X = MAIN_PLATFORM_X
const BLOCKING_ROCK_FLOOR_DROP = 10
const BLOCKING_ROCK_SPRITE = 'training-blocking-rock'
const BLOCKING_ROCK_DRAW_Z = 15
const BLOCKING_ROCK_SPRITE_HALF_W_EST = 1.3
const BLOCKING_ROCK_COLLISION_RADIUS_RATIO = 0.82
const BLOCKING_ROCK_COLLISION_FLOOR_INSET = 0.4
const BLOCKING_ROCK_STRIPE_EXCLUDE_HALF_W = Math.ceil(BLOCKING_ROCK_RADIUS * BLOCKING_ROCK_SPRITE_HALF_W_EST) + 12
//
// Tutorial hints
//
const HINT_Y_OFFSET = -100
const HINT_0_TEXT = "hiii! im Yuna\n— a lil weerd lookin\nbut thats okayy!\nlets gro an lern\ntogetherrr ^_^"
const HINT_WELCOME_DURATION = 6.5
const HINT_MOUSE_TEXT = 'use the mouz to put\nur arro on yur uthr\nhalf to git a tip!\nthe mouz helps us\nlern bowt the werld'
const HINT_1_TEXT = 'gud! now press ← →, A D\nto run to the woden\nplatform ovr there!'
const HINT_2_TEXT = 'wow! press Space, ↑\nto jmp on the platform'
const HINT_2_APPROACH_X = MAIN_PLATFORM_X - 165
const HINT_3_TEXT = 'gud! now find the blinkn\npeece an jmp on it — a\npeece is a part of u\nit helps u liv yur life!'
const HINT_4_TEXT = 'spykes is on yur rite!\nif u fal on them u die!'
const HINT_5_TEXT = 'now find urself — yur uthr\nhalf. tuch it to no urself mor!'
const MAIN_PLATFORM_STAND_Y_MAX = MAIN_PLATFORM_Y + 22
const MAIN_PLATFORM_STAND_Y_MIN = MAIN_PLATFORM_Y - 88
const MAIN_PLATFORM_STAND_X_HALF = MAIN_PLATFORM_W / 2 + 28
const BONUS_COLLECT_HINT_DURATION = 3
const BONUS_PLATFORM_STAND_Y_MAX = BONUS_PLATFORM_Y + 30
const BONUS_PLATFORM_STAND_Y_MIN = BONUS_PLATFORM_Y - 110
const BONUS_PLATFORM_STAND_X_HALF = BONUS_PLATFORM_W / 2 + 40
//
// Pause inserted between an action completing and the next hint appearing.
// Hints are now persistent (no auto-hide), so this is the only delay.
//
const HINT_TRANSITION_GAP = 0.5
const FRAGMENT_LEAVE_FIND_YOURSELF_DELAY = 2
const ANTIHERO_HOVER_PAUSE = 2
const TRAINING_TARGET_TIME_SECONDS = 99 * 60
const HUD_FROZEN_TOOLTIP_DURATION = 2
const HUD_SMALL_HERO_HINT = 'put ur arro on the litl\nhiro on the top-rite to\nsee how meny peeces u\ngot. peeces help u\nundrstand urself an bete\nlifes hard stuf!'
const HUD_SMALL_HERO_TOOLTIP = 'ur peeces'
const HUD_LIFE_HINT = 'yay! nxt to the hiro\nis life wif its scor.\nit plays aginst u an\nmaks trubl by turnig\nthem to points. hovr on it!'
const HUD_LIFE_TOOLTIP = 'life scor'
const HUD_TIME_HINT = 'supr! now hovr on the\ngrin time on the rite of\nthe timr on top — thats\nhow long u hav to bete\nthe lev to git mor peeces!'
const HUD_TIME_TOOLTIP = "bete the lev in time\nto git mor peeces"
const HUD_UI_HOVER_HALF = 42
const TRAINING_COMPLETE_MESSAGE = 'now ur redy to explor urself.\nlets start wif tuch...'
const TRAINING_COMPLETE_MESSAGE_DURATION = 5
const TRAINING_COMPLETE_FONT_SIZE_RATIO = 0.036
const TRAINING_COMPLETE_LINE_SPACING = 8
const TRAINING_COMPLETE_OUTLINE_OFFSET = 2
const TRAINING_COMPLETE_TEXT_Z = CFG.visual.zIndex.ui + 1200
//
// Skip training text (below game area floor line)
//
const SKIP_FONT_SIZE = 20
const SKIP_TEXT_Y = FLOOR_Y + Math.round(BOTTOM_MARGIN * 0.42)
const SKIP_MIN_OPACITY = 0.3
const SKIP_MAX_OPACITY = 0.7
const SKIP_FLICKER_SPEED = 0.9
//
// Rounded corners
//
const CORNER_RADIUS = 20
const CORNER_SPRITE_NAME = 'training-corner-sprite'
const BOTTOM_CORNER_Z = 28
//
// Clouds (touch level 0 style)
//
const CLOUD_SCROLL_SPEED = 8
const CLOUD_TOP_Y = TOP_MARGIN + 20
const CLOUD_BOTTOM_Y = TOP_MARGIN + 100
const CLOUD_COUNT = 18
const CLOUD_RANDOMNESS = 20
const CLOUD_Z = 1
const CLOUD_CIRCLE_R = 36
const CLOUD_CIRCLE_G = 37
const CLOUD_CIRCLE_B = 36
//
// Parallax tree layers (touch level 0 style)
//
const PARALLAX_FAR_CIRCLE_Z = 2
const PARALLAX_FAR_ORGANIC_Z = 3
const PARALLAX_GREY_LEAF_ROW_Z = 4
const PARALLAX_BLACK_LEAF_ROW_Z = 5
const FRONT_ORGANIC_DARK_BACKDROP_Z = 23
const FRONT_ORGANIC_DYNAMIC_Z = 25
const BACK_SIMPLE_TREE_COUNT = 22
const BACK_ORGANIC_FAR_COUNT = 15
const BACK_ORGANIC_MID_COUNT = 9
const BACK_ORGANIC_FAR_HEIGHT_SCALE = 0.78
const BACK_ORGANIC_FAR_SILHOUETTE_DIM = 0.12
const BACK_ORGANIC_SILHOUETTE_DIM = 0.26
const BACK_ORGANIC_GREY_BLEND_FAR = 0.96
const BACK_ORGANIC_GREY_BLEND_NEAR = 0.90
const CLOUD_CIRCLE_BLEND_FAR = 0.9
const CLOUD_CIRCLE_BLEND_NEAR = 0.74
const GREY_LEAF_ROW_COUNT = 24
const BLACK_LEAF_ROW_COUNT = 14
const GREY_LEAF_ROW_SLOT_BIAS = 0.38
const BLACK_LEAF_ROW_SLOT_BIAS = 0.42
const GREY_ORGANIC_TRUNK_R = 22
const GREY_ORGANIC_TRUNK_G = 22
const GREY_ORGANIC_TRUNK_B = 22
const GREY_ORGANIC_LEAF_R = 24
const GREY_ORGANIC_LEAF_G = 24
const GREY_ORGANIC_LEAF_B = 24
const GREY_ORGANIC_JITTER = 4
const BLACK_LEAF_SILHOUETTE_DIM = 0.48
const BLACK_ORGANIC_TRUNK_R = 11
const BLACK_ORGANIC_TRUNK_G = 11
const BLACK_ORGANIC_TRUNK_B = 15
const BLACK_ORGANIC_LEAF_R = 15
const BLACK_ORGANIC_LEAF_G = 15
const BLACK_ORGANIC_LEAF_B = 20
const PARALLAX_BACK_SCALE = 1.12
const PARALLAX_GREY_LEAF_SCALE = 1.02
const PARALLAX_BLACK_LEAF_SCALE = 0.68
const PARALLAX_FRONT_SCALE = 0.36
const FRONT_ORGANIC_TREE_COUNT = 12
const FRONT_ORGANIC_DARK_DIM_RGB = 0.38
const FRONT_ORGANIC_DARK_BACKDROP_OPACITY_SCALE = 0.88
const FRONT_LEAF_R = 140
const FRONT_LEAF_G = 105
const FRONT_LEAF_B = 28
const FRONT_LEAF_JITTER = 18
const BLACK_LEAF_CLOUD_GAP = 48
const BLACK_LEAF_BRANCH_CLEARANCE = 72
const BLACK_LEAF_HEIGHT_MIN = 90
const BLACK_LEAF_HEIGHT_RANGE = 55
const TREE_ROOT_COLOR_R = 48
const TREE_ROOT_COLOR_G = 58
const TREE_ROOT_COLOR_B = 42
const TREE_ROOT_ABSOLUTE_MAX_Y = CFG.visual.screen.height - 6
const ORGANIC_ROOT_DEPTH_MAX = 123
//
// Grass clumps
//
const GRASS_CLUSTER_COUNT = 7
const GRASS_BLADE_SWAY_SPEED = 0.9
const GRASS_BLADE_SWAY_AMP = 0.18
const GRASS_DRAW_Z = 19
const GRASS_EXCLUDE_HALF_W = 120
//
// Rocks and birds
//
const ROCK_DRAW_Z = 7
const ROCK_SPRITE_PREFIX = 'training-rock'
const ROCK_EXCLUDE_CENTER_X = MAIN_PLATFORM_X
const ROCK_EXCLUDE_HALF_W = 80
const BIRD_LAYER_Z = 6
//
// Ambient sounds
//
const BIRD_CHIRP_INTERVAL_MIN = 4
const BIRD_CHIRP_INTERVAL_EXTRA = 8
const OWL_INTERVAL_MIN = 10
const OWL_INTERVAL_EXTRA = 16
const CRICKET_INTERVAL_MIN = 1.5
const CRICKET_INTERVAL_EXTRA = 3

/**
 * Training level — tutorial introduction before touch.0.
 * @param {Object} k - Kaplay instance
 */
export function sceneTouchTraining(k) {
  k.scene('level-touch.training', () => {
    //
    // Reset life score when first entering the touch section from another section.
    // heroScore is always read from localStorage and is not reset here.
    //
    if (get('lastSection', null) !== 'touch') {
      set('lifeScore', 0)
    }
    set('lastSection', 'touch')
    set('lastLevel', 'level-touch.training')
    Tooltip.unsuppressAll()
    //
    // Background and gravity
    //
    k.setBackground(k.rgb(BG_R, BG_G, BG_B))
    k.canvas?.style.setProperty('background-color', `rgb(${BG_R}, ${BG_G}, ${BG_B})`, 'important')
    k.onSceneLeave(() => { k.canvas?.style.removeProperty('background-color') })
    k.setGravity(CFG.game.gravity)
    k.onDraw(() => {
      k.drawRect({ width: k.width(), height: k.height(), pos: k.vec2(0, 0), color: k.rgb(BG_R, BG_G, BG_B) })
    })
    //
    // Sound
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    k.onSceneLeave(() => Sound.stopAmbient(sound))
    //
    // Touch level 0 style clouds and parallax background trees
    //
    createBackgroundClouds(k)
    createBackParallaxTrees(k)
    createFrontSwayingOrganicTrees(k)
    //
    // Background birds
    //
    BackgroundBirds.create(k, { zIndex: BIRD_LAYER_Z })
    //
    // Walls and corners
    //
    createWalls(k)
    createRoundedCorners(k)
    //
    // Floor collision
    //
    k.add([
      k.rect(PLAYABLE_W, BOTTOM_MARGIN + 10),
      k.pos(LEFT_MARGIN, FLOOR_Y),
      k.area(),
      k.body({ isStatic: true }),
      k.color(WALL_COLOR, WALL_COLOR, WALL_COLOR),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Grass in clumps along the floor
    //
    const grassState = { blades: generateGrassClumps(), timer: 0 }
    k.add([k.z(GRASS_DRAW_Z), {
      draw() { drawGrass(k, grassState) },
      update() { onUpdateGrass(k, grassState) }
    }])
    //
    // Floor rocks
    //
    FloorRocks.addTouchSectionFloorRocks(k, {
      floorY: FLOOR_Y,
      leftMargin: LEFT_MARGIN,
      rightMargin: RIGHT_MARGIN,
      drawZ: ROCK_DRAW_Z,
      spritePrefix: ROCK_SPRITE_PREFIX,
      rockCount: 6,
      excludeCenterX: ROCK_EXCLUDE_CENTER_X,
      excludeHalfWidth: ROCK_EXCLUDE_HALF_W
    })
    //
    // Main log platform (touch section style)
    //
    LogPlatform.create({
      k,
      x: MAIN_PLATFORM_X,
      y: MAIN_PLATFORM_Y,
      width: MAIN_PLATFORM_W,
      height: MAIN_PLATFORM_H,
      withSnow: false,
      z: PLATFORM_FOREGROUND_Z
    })
    //
    // Large blocking rock under the log — hero cannot walk through
    //
    createBlockingRockUnderPlatform(k)
    //
    // Single spike cluster to the right of the hidden bonus platform
    //
    const floorThornBaseY = FLOOR_Y - FLOOR_THORN_RAISE_OFFSET
    const thornsData = generateFloorThornsWithGaps(
      SPIKE_START_X,
      SPIKE_END_X,
      floorThornBaseY,
      [
        { center: HERO_SPAWN_X, halfWidth: 100 },
        { center: MAIN_PLATFORM_X, halfWidth: MAIN_PLATFORM_W / 2 + 40 }
      ],
      SPIKE_MAX_CLUSTERS
    )
    const spikeCluster = computeSpikeClusterMetrics(thornsData)
    const spikePassX = spikeCluster.passX
    k.add([k.z(FLOOR_THORN_DRAW_Z), {
      draw() {
        drawThorns(
          k,
          thornsData,
          k.rgb(FLOOR_THORN_BLADE_FILL_R, FLOOR_THORN_BLADE_FILL_G, FLOOR_THORN_BLADE_FILL_B)
        )
      }
    }])
    //
    // Black ground stripe above bottom platform — foreground layer (hero draws above)
    //
    createGroundStripe(k)
    //
    // TRAINING header + score HUD (same sizes as touch levels)
    //
    const levelIndicator = LevelIndicator.create({
      k,
      levelNumber: 0,
      sectionLabel: 'TRAINING',
      sectionLabelCompletedLetters: 0,
      activeColor: TRAINING_LABEL_COLOR_HEX,
      inactiveColor: TRAINING_LABEL_INACTIVE_HEX,
      completedColor: TRAINING_LABEL_COLOR_HEX,
      heroBodyColor: HERO_BODY_COLOR,
      topPlatformHeight: TOP_MARGIN,
      sideWallWidth: LEFT_MARGIN,
      sectionLabelLetterSpacing: TRAINING_LABEL_LETTER_SPACING,
      sectionLabelY: TRAINING_LABEL_Y
    })
    //
    // FPS counter aligned with TRAINING row and HUD icons
    //
    const fpsCounter = FpsCounter.create({
      k,
      showTimer: true,
      targetTime: TRAINING_TARGET_TIME_SECONDS,
      topY: TRAINING_HUD_CENTER_Y
    })
    k.onUpdate(() => FpsCounter.onUpdate(fpsCounter))
    TouchControls.create({
      k,
      floorY: FLOOR_Y,
      leftMargin: LEFT_MARGIN,
      rightMargin: RIGHT_MARGIN
    })
    //
    // Anti-hero
    //
    const antiHeroInst = Hero.create({
      k,
      x: ANTIHERO_X,
      y: ANTIHERO_Y,
      type: Hero.HEROES.ANTIHERO,
      controllable: false,
      sfx: sound,
      antiHero: null,
      bodyColor: ANTIHERO_BODY_COLOR
    })
    antiHeroInst.character && (antiHeroInst.character.hidden = true)
    antiHeroInst.character && (antiHeroInst.character.z = ANTIHERO_Z)
    //
    // Hint and death state
    //
    const hintState = {
      shown1: false,
      shown2: false,
      shown3: false,
      shown4: false,
      shown5: false,
      welcomeDone: false,
      awaitingMouseHint: false,
      mouseHintHovering: false,
      mouseHintDone: false,
      fragmentCollected: false,
      wasOnBonusPlatform: false,
      wasOnMainPlatform: false,
      visitedBonusPlatform: false,
      landedOnBonusPlatform: false,
      runKeysUsed: false,
      antiHeroPersistentTooltipDisabled: false,
      leftBonusPlatformAt: 0,
      findYourselfAfterLeave: false,
      trainingLabelLetters: 0,
      spikesPassed: false,
      bonusCollectUntil: 0,
      spikePassX,
      levelDone: false,
      isDead: false,
      currentTip: null,
      currentHintType: null,
      hudTutorialStep: null,
      hudFrozenTip: null,
      smallHeroTooltipDone: false,
      lifeTooltipDone: false,
      timeTooltipDone: false
    }
    //
    // Anti-hero hover tooltip (enabled after mouse tutorial completes)
    //
    Tooltip.create({
      k,
      targets: [{
        x: () => antiHeroInst.character?.pos?.x ?? ANTIHERO_X,
        y: () => antiHeroInst.character?.pos?.y ?? ANTIHERO_Y,
        width: ANTIHERO_TOOLTIP_HOVER_SIZE,
        height: ANTIHERO_TOOLTIP_HOVER_SIZE,
        text: ANTIHERO_TOOLTIP_TEXT,
        offsetY: ANTIHERO_TOOLTIP_Y_OFFSET,
        visible: () => hintState.mouseHintDone && !hintState.mouseHintHovering &&
          !hintState.antiHeroPersistentTooltipDisabled
      }]
    })
    const spikeDead = { active: false }
    //
    // Main hero
    //
    const heroInst = Hero.create({
      k,
      x: HERO_SPAWN_X,
      y: HERO_SPAWN_Y,
      type: Hero.HEROES.HERO,
      controllable: true,
      sfx: sound,
      antiHero: antiHeroInst,
      bodyColor: HERO_BODY_COLOR,
      jumpForce: CFG.game.jumpForce,
      currentLevel: 'level-touch.training',
      //
      // Tutorial hero softly whistles + emits music notes while standing
      // still, to keep the empty practice scene feeling alive.
      //
      idleVocalization: 'whistling',
      onAnnihilation: () => {
        hintState.levelDone = true
        heroInst.controlsDisabled = true
        hintState.currentTip && Tooltip.destroy(hintState.currentTip)
        hintState.currentTip = null
        hintState.currentHintType = null
        applyTrainingLetterProgress(k, levelIndicator, hintState, sound, TRAINING_LETTERS_AFTER_COMPLETE)
        BonusHero.finalizeCollection(bonusHeroInst)
        Tooltip.suppressAll()
        const newScore = get('heroScore', 0) + 1
        set('heroScore', newScore)
        levelIndicator.updateHeroScore(newScore)
        playHeroScoreEffects(k, levelIndicator, HERO_BODY_COLOR)
        Sound.playVictorySound(sound)
        showTrainingCompleteMessage(k, () => {
          Sound.stopAmbient(sound)
          createLevelTransition(k, 'level-touch.training')
        })
      }
    })
    heroInst.character && (heroInst.character.hidden = true)
    heroInst.character && (heroInst.character.z = HERO_SPAWN_Z)
    //
    // Bonus hero on hidden platform
    //
    const bonusHeroInst = BonusHero.create({
      k,
      x: BONUS_PLATFORM_X,
      y: BONUS_PLATFORM_Y,
      width: BONUS_PLATFORM_W,
      heroInst,
      levelIndicator,
      sfx: sound,
      heroBodyColor: HERO_BODY_COLOR,
      storageKey: 'touch.trainingBonusCollected',
      platformZ: PLATFORM_FOREGROUND_Z,
      collisionWidth: BONUS_PLATFORM_COLLISION_WIDTH,
      platformCollisionHeight: BONUS_PLATFORM_COLLISION_HEIGHT,
      platformCollisionXOffset: BONUS_PLATFORM_COLLISION_X_OFFSET,
      platformCollisionYOffset: BONUS_PLATFORM_COLLISION_Y_OFFSET
    })
    levelIndicator.updateHeroScore = ((orig) => (score) => {
      orig(score)
      hintState.fragmentCollected = true
      hintState.bonusCollectUntil = k.time() + BONUS_COLLECT_HINT_DURATION
      hintState.currentTip && Tooltip.destroy(hintState.currentTip)
      hintState.currentTip = null
      hintState.currentHintType = null
    })(levelIndicator.updateHeroScore)
    //
    // Spike death, hints, skip text
    //
    k.onUpdate(() => checkFloorThorns(k, heroInst, thornsData, spikeCluster, levelIndicator, hintState, spikeDead))
    k.onUpdate(() => onUpdateHints(k, hintState, heroInst, levelIndicator, sound))
    k.onUpdate(() => onUpdateAntiHeroMouseHint(k, antiHeroInst, hintState, heroInst, levelIndicator, fpsCounter, sound))
    k.onUpdate(() => onUpdateHudMouseTutorial(k, hintState, heroInst, levelIndicator, fpsCounter, sound))
    k.onUpdate(() => onUpdateTrainingSurface(heroInst, sound))
    //
    // Skip-training prompt: keyboard text on desktop, touch devices replace
    // the "Enter" word with a tappable button while keeping the surrounding
    // phrase visible. Flickering animation reuses the existing onUpdate path.
    //
    const performSkipTraining = () => {
      if (hintState.levelDone || spikeDead.active) return
      destroyTrainingHints(k, hintState)
      Tooltip.suppressAll()
      Sound.stopAmbient(sound)
      createLevelTransition(k, 'level-touch.training')
    }
    const skipFont = CFG.visual.fonts.thinFull.replace(/'/g, '')
    const skipHintInst = renderHintWithEnter({
      k,
      centerX: LEFT_MARGIN + PLAYABLE_W / 2,
      y: SKIP_TEXT_Y,
      prefix: 'Press ',
      suffix: ' to skip training',
      fontSize: SKIP_FONT_SIZE,
      font: skipFont,
      color: [180, 180, 180],
      z: CFG.visual.zIndex.ui,
      onTap: performSkipTraining
    })
    const skipAnim = { hint: skipHintInst, phase: 0, dir: 1 }
    k.onUpdate(() => onUpdateSkipHint(k, skipAnim))
    //
    // Keyboard fallback for desktop and external keyboards on tablets.
    //
    k.onKeyPress('enter', performSkipTraining)
    k.onKeyPress('escape', () => goToMenuAfterAssets(k))
    //
    // Spawn characters and show first hint
    //
    k.wait(HERO_SPAWN_DELAY, () => {
      heroInst.controlsDisabled = true
      heroInst.character && Hero.spawn(heroInst)
      antiHeroInst.character && Hero.spawn(antiHeroInst)
      showTimedHint(k, hintState, heroInst, HINT_0_TEXT, 'welcome', HINT_WELCOME_DURATION, () => {
        if (hintState.levelDone || hintState.isDead || hintState.awaitingMouseHint) return
        hintState.welcomeDone = true
        hintState.awaitingMouseHint = true
        transitionToHint(k, hintState, heroInst, HINT_MOUSE_TEXT, 'mouse')
      })
    })
    scheduleAmbientSounds(k, sound)
  })
}

//
// Black ground stripe above the bottom platform — skips blocking rock so no dark line on rock
//
function createGroundStripe(k) {
  const stripeY = FLOOR_Y - GROUND_STRIPE_HEIGHT
  const stripeRight = LEFT_MARGIN + PLAYABLE_W
  const excludeLeft = BLOCKING_ROCK_CENTER_X - BLOCKING_ROCK_STRIPE_EXCLUDE_HALF_W
  const excludeRight = BLOCKING_ROCK_CENTER_X + BLOCKING_ROCK_STRIPE_EXCLUDE_HALF_W
  k.add([
    k.z(GROUND_STRIPE_Z),
    {
      draw() {
        const color = k.rgb(GROUND_STRIPE_COLOR_R, GROUND_STRIPE_COLOR_G, GROUND_STRIPE_COLOR_B)
        if (LEFT_MARGIN < excludeLeft) {
          k.drawRect({
            width: excludeLeft - LEFT_MARGIN,
            height: GROUND_STRIPE_HEIGHT,
            pos: k.vec2(LEFT_MARGIN, stripeY),
            color
          })
        }
        if (excludeRight < stripeRight) {
          k.drawRect({
            width: stripeRight - excludeRight,
            height: GROUND_STRIPE_HEIGHT,
            pos: k.vec2(excludeRight, stripeY),
            color
          })
        }
      }
    }
  ])
}

//
// Large floor rock under the log with solid collision — blocks horizontal passage
//
function createBlockingRockUnderPlatform(k) {
  const rockDrawX = BLOCKING_ROCK_CENTER_X - Math.ceil(BLOCKING_ROCK_RADIUS * BLOCKING_ROCK_SPRITE_HALF_W_EST)
  const rock = FloorRocks.addSingleFloorRockAt(
    k,
    FLOOR_Y,
    rockDrawX,
    BLOCKING_ROCK_SPRITE,
    BLOCKING_ROCK_DRAW_Z,
    BLOCKING_ROCK_RADIUS,
    true
  )
  rock.y += BLOCKING_ROCK_FLOOR_DROP
  //
  // Collision aligned with the visible rock blob (bottom rests on FLOOR_Y)
  //
  const collisionCenterX = rock.x + rock.totalW / 2
  const collisionCenterY = rock.y + rock.totalH - rock.radius * BLOCKING_ROCK_COLLISION_FLOOR_INSET
  const collisionRadius = rock.radius * BLOCKING_ROCK_COLLISION_RADIUS_RATIO
  k.add([
    k.circle(collisionRadius),
    k.pos(collisionCenterX, collisionCenterY),
    k.anchor('center'),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    k.z(PLATFORM_FOREGROUND_Z - 1),
    CFG.game.platformName
  ])
}

//
// Static boundary walls
//
function createWalls(k) {
  k.add([
    k.rect(LEFT_MARGIN, SCREEN_H),
    k.pos(LEFT_MARGIN / 2, SCREEN_H / 2),
    k.anchor('center'),
    k.area(),
    k.body({ isStatic: true }),
    k.color(WALL_COLOR, WALL_COLOR, WALL_COLOR),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  k.add([
    k.rect(RIGHT_MARGIN, SCREEN_H),
    k.pos(SCREEN_W - RIGHT_MARGIN / 2, SCREEN_H / 2),
    k.anchor('center'),
    k.area(),
    k.body({ isStatic: true }),
    k.color(WALL_COLOR, WALL_COLOR, WALL_COLOR),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  k.add([
    k.rect(SCREEN_W, TOP_MARGIN),
    k.pos(SCREEN_W / 2, TOP_MARGIN / 2),
    k.anchor('center'),
    k.area(),
    k.body({ isStatic: true }),
    k.color(WALL_COLOR, WALL_COLOR, WALL_COLOR),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
}

//
// Rounded corners at game area edges
//
function createRoundedCorners(k) {
  const canvas = document.createElement('canvas')
  canvas.width = CORNER_RADIUS
  canvas.height = CORNER_RADIUS
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = WALL_COLOR_HEX
  ctx.fillRect(0, 0, CORNER_RADIUS, CORNER_RADIUS)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc(CORNER_RADIUS, CORNER_RADIUS, CORNER_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  loadTouchSprite(k, CORNER_SPRITE_NAME, canvas.toDataURL())
  k.add([k.sprite(CORNER_SPRITE_NAME), k.pos(LEFT_MARGIN, TOP_MARGIN), k.z(CFG.visual.zIndex.platforms + 1)])
  k.add([k.sprite(CORNER_SPRITE_NAME), k.pos(SCREEN_W - RIGHT_MARGIN, TOP_MARGIN), k.rotate(90), k.z(CFG.visual.zIndex.platforms + 1)])
  k.add([k.sprite(CORNER_SPRITE_NAME), k.pos(LEFT_MARGIN, FLOOR_Y), k.rotate(270), k.z(BOTTOM_CORNER_Z)])
  k.add([k.sprite(CORNER_SPRITE_NAME), k.pos(SCREEN_W - RIGHT_MARGIN, FLOOR_Y), k.rotate(180), k.z(BOTTOM_CORNER_Z)])
}

//
// Creates dark background clouds that scroll slowly (touch level 0 style)
//
function createBackgroundClouds(k) {
  const baseCloudColor = k.rgb(CLOUD_CIRCLE_R, CLOUD_CIRCLE_G, CLOUD_CIRCLE_B)
  const areaLeft = LEFT_MARGIN
  const areaRight = SCREEN_W - RIGHT_MARGIN
  const bandWidth = areaRight - areaLeft
  const cloudSpacing = bandWidth / CLOUD_COUNT
  const cloudConfigs = []
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const baseX = cloudSpacing * i + cloudSpacing * 0.5
    const cloudX = baseX + (Math.random() - 0.5) * CLOUD_RANDOMNESS
    const cloudY = CLOUD_TOP_Y + Math.random() * (CLOUD_BOTTOM_Y - CLOUD_TOP_Y)
    const crownSize = (50 + Math.random() * 60) * 1.2
    const crownCount = 5 + Math.floor(Math.random() * 4)
    const crowns = []
    for (let j = 0; j < crownCount; j++) {
      crowns.push({
        offsetX: (Math.random() - 0.5) * crownSize * 0.7,
        offsetY: (Math.random() - 0.5) * crownSize * 0.5,
        sizeVariation: 0.6 + Math.random() * 0.6,
        opacityVariation: 0.7 + Math.random() * 0.2
      })
    }
    cloudConfigs.push({
      x: cloudX,
      y: cloudY,
      crownSize,
      crowns,
      color: baseCloudColor,
      opacity: 0.85 + Math.random() * 0.1
    })
  }
  const inst = { scrollX: 0 }
  k.add([
    k.z(CLOUD_Z),
    {
      draw() {
        inst.scrollX = (inst.scrollX + CLOUD_SCROLL_SPEED * k.dt()) % bandWidth
        for (let copy = 0; copy < 2; copy++) {
          const baseOffset = areaLeft + inst.scrollX - copy * bandWidth
          for (const cloud of cloudConfigs) {
            const cx = cloud.x + baseOffset
            if (cx + cloud.crownSize < areaLeft || cx - cloud.crownSize > areaRight) continue
            for (const crown of cloud.crowns) {
              k.drawCircle({
                pos: k.vec2(cx + crown.offsetX, cloud.y + crown.offsetY),
                radius: cloud.crownSize * crown.sizeVariation,
                color: cloud.color,
                opacity: cloud.opacity * crown.opacityVariation
              })
            }
          }
        }
      }
    }
  ])
}

//
// Builds all back parallax tree layers (touch level 0 style)
//
function createBackParallaxTrees(k) {
  const treeFloorY = FLOOR_Y + TREE_FLOOR_Y_OFFSET
  createBackCircleTrees(k, treeFloorY)
  createBackOrganicRows(k, treeFloorY)
  createGreyLeafRow(k, treeFloorY)
  createBlackLeafRow(k, treeFloorY)
}

//
// Far-back grey circle-crown trees (touch level 0 back row)
//
function createBackCircleTrees(k, treeFloorY) {
  const scale = PARALLAX_BACK_SCALE
  const colorMix = 0.2
  const treeTrunkR = Math.round(12 * colorMix + BG_R * (1 - colorMix))
  const treeTrunkG = Math.round(16 * colorMix + BG_G * (1 - colorMix))
  const treeTrunkB = Math.round(12 * colorMix + BG_B * (1 - colorMix))
  const treeLeafR = Math.round(16 * colorMix + BG_R * (1 - colorMix))
  const treeLeafG = Math.round(20 * colorMix + BG_G * (1 - colorMix))
  const treeLeafB = Math.round(16 * colorMix + BG_B * (1 - colorMix))
  const trees = []
  for (let i = 0; i < BACK_SIMPLE_TREE_COUNT; i++) {
    const spacing = PLAYABLE_W / (BACK_SIMPLE_TREE_COUNT - 1)
    const treeX = LEFT_MARGIN + spacing * i + (Math.random() - 0.5) * 20
    const baseTreeHeight = (90 + Math.random() * 70) * scale
    const crownCenterY = treeFloorY - baseTreeHeight
    const trunkTop = crownCenterY
    const trunkBottom = treeFloorY
    const trunkHeight = trunkBottom - trunkTop
    const trunkWidth = (4 + Math.random() * 4) * scale
    const crownSize = (50 + Math.random() * 60) * scale
    const crownCount = 5 + Math.floor(Math.random() * 4)
    const crowns = []
    for (let j = 0; j < crownCount; j++) {
      crowns.push({
        offsetX: (Math.random() - 0.5) * crownSize * 0.7,
        offsetY: (Math.random() - 0.5) * crownSize * 0.5,
        sizeVariation: 0.6 + Math.random() * 0.6,
        opacityVariation: 0.7 + Math.random() * 0.2
      })
    }
    const tree = {
      x: treeX,
      trunkTop,
      trunkHeight,
      trunkWidth,
      crownSize,
      crownCenterY,
      crowns,
      trunkColor: k.rgb(treeTrunkR, treeTrunkG, treeTrunkB),
      leafColor: k.rgb(treeLeafR, treeLeafG, treeLeafB),
      opacity: 0.85 + Math.random() * 0.1
    }
    const cloudBlend = Math.random() < 0.52 ? CLOUD_CIRCLE_BLEND_FAR : CLOUD_CIRCLE_BLEND_NEAR
    tree.trunkColor = tintKapRgbTowardCloudCircle(k, tree.trunkColor, cloudBlend)
    tree.leafColor = tintKapRgbTowardCloudCircle(k, tree.leafColor, cloudBlend)
    trees.push(tree)
  }
  k.add([k.z(PARALLAX_FAR_CIRCLE_Z), {
    draw() { drawBackCircleTrees(k, trees) }
  }])
}

//
// Draws far-back circle-crown trees
//
function drawBackCircleTrees(k, trees) {
  for (const tree of trees) {
    k.drawRect({
      pos: k.vec2(tree.x - tree.trunkWidth / 2, tree.trunkTop),
      width: tree.trunkWidth,
      height: tree.trunkHeight,
      color: tree.trunkColor,
      opacity: tree.opacity
    })
    for (const crown of tree.crowns) {
      k.drawCircle({
        pos: k.vec2(tree.x + crown.offsetX, tree.crownCenterY + crown.offsetY),
        radius: tree.crownSize * crown.sizeVariation,
        color: tree.leafColor,
        opacity: tree.opacity * crown.opacityVariation
      })
    }
  }
}

//
// Back organic far + mid silhouette rows (touch level 0 style)
//
function createBackOrganicRows(k, treeFloorY) {
  const scale = PARALLAX_BACK_SCALE
  const rows = [
    {
      count: BACK_ORGANIC_FAR_COUNT,
      heightScale: BACK_ORGANIC_FAR_HEIGHT_SCALE,
      dim: BACK_ORGANIC_FAR_SILHOUETTE_DIM,
      slotBias: 0
    },
    {
      count: BACK_ORGANIC_MID_COUNT,
      heightScale: 1,
      dim: BACK_ORGANIC_SILHOUETTE_DIM,
      slotBias: 0.41
    }
  ]
  let treeIdx = 0
  for (const row of rows) {
    for (let oi = 0; oi < row.count; oi++) {
      const slotT = (oi + 1 + row.slotBias) / (row.count + 1)
      let posX = LEFT_MARGIN + PLAYABLE_W * slotT + (Math.random() - 0.5) * 44
      if (posX < LEFT_MARGIN + 28 || posX > LEFT_MARGIN + PLAYABLE_W - 28) {
        posX = LEFT_MARGIN + PLAYABLE_W * slotT
      }
      const baseTreeHeight = (70 + Math.random() * 80) * scale * row.heightScale
      const trunkBottom = treeFloorY
      const trunkActualHeight = baseTreeHeight * (0.52 + Math.random() * 0.12)
      const trunkTop = trunkBottom - trunkActualHeight
      const organic = OrganicParallax.buildOrganicTreeData(trunkBottom, trunkTop, {
        includeRoots: false,
        rootAbsoluteMaxY: Math.min(TREE_ROOT_ABSOLUTE_MAX_Y, trunkBottom + ORGANIC_ROOT_DEPTH_MAX),
        rootSegmentsMin: 11,
        rootSegmentsRange: 14
      })
      const palette = OrganicParallax.buildTreePalette()
      const depthBlend = Math.random() < 0.52 ? BACK_ORGANIC_GREY_BLEND_FAR : BACK_ORGANIC_GREY_BLEND_NEAR
      const tree = {
        trunkTop,
        trunkBottom,
        trunkSegments: organic.trunkSegments,
        rootSegments: organic.rootSegments,
        branchClusters: organic.branchClusters,
        trunkColor: k.rgb(palette.trunk.r, palette.trunk.g, palette.trunk.b),
        rootColor: k.rgb(TREE_ROOT_COLOR_R, TREE_ROOT_COLOR_G, TREE_ROOT_COLOR_B),
        leafColor: k.rgb(120, 90, 40),
        opacity: 1
      }
      tree.trunkColor = tintKapRgbTowardCloudCircle(k, tree.trunkColor, depthBlend)
      tree.leafColor = tintKapRgbTowardCloudCircle(k, tree.leafColor, depthBlend)
      tree.rootColor = tintKapRgbTowardCloudCircle(k, tree.rootColor, depthBlend)
      for (const cluster of tree.branchClusters) {
        for (const leaf of cluster.leaves) {
          tintLeafRgbTowardBg(leaf, depthBlend)
        }
      }
      OrganicParallax.dimOrganicTreeColors(tree, row.dim)
      const spriteName = `training-back-organic-${treeIdx}`
      OrganicParallax.prerenderOrganicTreeSprites(k, tree, spriteName)
      k.add([k.z(PARALLAX_FAR_ORGANIC_Z), {
        draw() { drawPrerenderedOrganicTree(k, tree) }
      }])
      treeIdx++
    }
  }
}

//
// Grey-leaf organic mid band (static, touch level 0 style)
//
function createGreyLeafRow(k, treeFloorY) {
  const scale = PARALLAX_GREY_LEAF_SCALE
  for (let oi = 0; oi < GREY_LEAF_ROW_COUNT; oi++) {
    const slotT = (oi + 1 + GREY_LEAF_ROW_SLOT_BIAS) / (GREY_LEAF_ROW_COUNT + 1)
    let posX = LEFT_MARGIN + PLAYABLE_W * slotT + (Math.random() - 0.5) * 38
    if (posX < LEFT_MARGIN + 24 || posX > LEFT_MARGIN + PLAYABLE_W - 24) {
      posX = LEFT_MARGIN + PLAYABLE_W * slotT
    }
    const baseTreeHeight = (140 + Math.random() * 90) * scale
    const trunkBottom = treeFloorY
    const trunkActualHeight = baseTreeHeight * (0.52 + Math.random() * 0.12)
    const trunkTop = trunkBottom - trunkActualHeight
    const organic = OrganicParallax.buildOrganicTreeData(trunkBottom, trunkTop, {
      includeRoots: false,
      rootAbsoluteMaxY: Math.min(TREE_ROOT_ABSOLUTE_MAX_Y, trunkBottom + ORGANIC_ROOT_DEPTH_MAX),
      rootSegmentsMin: 11,
      rootSegmentsRange: 14
    })
    const trunkRgb = jitterGreyOrganicRgb(GREY_ORGANIC_TRUNK_R, GREY_ORGANIC_TRUNK_G, GREY_ORGANIC_TRUNK_B)
    const leafRgb = jitterGreyOrganicRgb(GREY_ORGANIC_LEAF_R, GREY_ORGANIC_LEAF_G, GREY_ORGANIC_LEAF_B)
    const tree = {
      trunkTop,
      trunkBottom,
      trunkSegments: organic.trunkSegments,
      rootSegments: organic.rootSegments,
      branchClusters: organic.branchClusters,
      trunkColor: k.rgb(trunkRgb.r, trunkRgb.g, trunkRgb.b),
      rootColor: k.rgb(trunkRgb.r, trunkRgb.g, trunkRgb.b),
      leafColor: k.rgb(leafRgb.r, leafRgb.g, leafRgb.b),
      opacity: 1
    }
    for (const cluster of tree.branchClusters) {
      for (const leaf of cluster.leaves) {
        leaf.r = leafRgb.r
        leaf.g = leafRgb.g
        leaf.b = leafRgb.b
      }
    }
    const spriteName = `training-grey-leaf-${oi}`
    OrganicParallax.prerenderOrganicTreeSprites(k, tree, spriteName)
    k.add([k.z(PARALLAX_GREY_LEAF_ROW_Z), {
      draw() { drawPrerenderedOrganicTree(k, tree) }
    }])
  }
}

//
// Black-leaf organic mid band (static, touch level 0 style)
//
function createBlackLeafRow(k, treeFloorY) {
  const scale = PARALLAX_BLACK_LEAF_SCALE
  //
  // Cap tree height so canopies sit below the cloud band with visible gap
  //
  const maxTrunkHeight = treeFloorY - (CLOUD_BOTTOM_Y + BLACK_LEAF_CLOUD_GAP) - BLACK_LEAF_BRANCH_CLEARANCE
  for (let oi = 0; oi < BLACK_LEAF_ROW_COUNT; oi++) {
    const slotT = (oi + 1 + BLACK_LEAF_ROW_SLOT_BIAS) / (BLACK_LEAF_ROW_COUNT + 1)
    let posX = LEFT_MARGIN + PLAYABLE_W * slotT + (Math.random() - 0.5) * 38
    if (posX < LEFT_MARGIN + 24 || posX > LEFT_MARGIN + PLAYABLE_W - 24) {
      posX = LEFT_MARGIN + PLAYABLE_W * slotT
    }
    const baseTreeHeight = (BLACK_LEAF_HEIGHT_MIN + Math.random() * BLACK_LEAF_HEIGHT_RANGE) * scale
    const trunkBottom = treeFloorY
    const trunkActualHeight = Math.min(
      baseTreeHeight * (0.52 + Math.random() * 0.12),
      maxTrunkHeight
    )
    const trunkTop = trunkBottom - trunkActualHeight
    const organic = OrganicParallax.buildOrganicTreeData(trunkBottom, trunkTop, {
      includeRoots: false,
      rootAbsoluteMaxY: Math.min(TREE_ROOT_ABSOLUTE_MAX_Y, trunkBottom + ORGANIC_ROOT_DEPTH_MAX),
      rootSegmentsMin: 11,
      rootSegmentsRange: 14
    })
    const tree = {
      trunkTop,
      trunkBottom,
      trunkSegments: organic.trunkSegments,
      rootSegments: organic.rootSegments,
      branchClusters: organic.branchClusters,
      trunkColor: k.rgb(BLACK_ORGANIC_TRUNK_R, BLACK_ORGANIC_TRUNK_G, BLACK_ORGANIC_TRUNK_B),
      rootColor: k.rgb(BLACK_ORGANIC_TRUNK_R, BLACK_ORGANIC_TRUNK_G, BLACK_ORGANIC_TRUNK_B),
      leafColor: k.rgb(BLACK_ORGANIC_LEAF_R, BLACK_ORGANIC_LEAF_G, BLACK_ORGANIC_LEAF_B),
      opacity: 1
    }
    for (const cluster of tree.branchClusters) {
      for (const leaf of cluster.leaves) {
        leaf.r = BLACK_ORGANIC_LEAF_R
        leaf.g = BLACK_ORGANIC_LEAF_G
        leaf.b = BLACK_ORGANIC_LEAF_B
      }
    }
    OrganicParallax.dimOrganicTreeColors(tree, BLACK_LEAF_SILHOUETTE_DIM)
    const spriteName = `training-black-leaf-${oi}`
    OrganicParallax.prerenderOrganicTreeSprites(k, tree, spriteName)
    k.add([k.z(PARALLAX_BLACK_LEAF_ROW_Z), {
      draw() { drawPrerenderedOrganicTree(k, tree) }
    }])
  }
}

//
// Front organic trees with swaying branch clusters (touch level 0 front row)
//
function createFrontSwayingOrganicTrees(k) {
  const treeFloorY = FLOOR_Y + TREE_FLOOR_Y_OFFSET
  const scale = PARALLAX_FRONT_SCALE
  const spacing = PLAYABLE_W / (FRONT_ORGANIC_TREE_COUNT - 1)
  const treeMargin = 80
  const dynamicTrees = []
  for (let i = 0; i < FRONT_ORGANIC_TREE_COUNT; i++) {
    let randomOffset = (Math.random() - 0.5) * 25
    if (i === 0) randomOffset = Math.max(0, randomOffset) + treeMargin
    if (i === FRONT_ORGANIC_TREE_COUNT - 1) randomOffset = Math.min(0, randomOffset) - treeMargin
    const posX = LEFT_MARGIN + spacing * i + randomOffset
    const baseTreeHeight = (120 + Math.random() * 90) * scale
    const trunkBottom = treeFloorY
    const trunkActualHeight = baseTreeHeight * (0.55 + Math.random() * 0.1)
    const trunkTop = trunkBottom - trunkActualHeight
    const organic = OrganicParallax.buildOrganicTreeData(trunkBottom, trunkTop, {
      includeRoots: false,
      rootAbsoluteMaxY: Math.min(TREE_ROOT_ABSOLUTE_MAX_Y, trunkBottom + ORGANIC_ROOT_DEPTH_MAX),
      rootSegmentsMin: 13,
      rootSegmentsRange: 17
    })
    const palette = OrganicParallax.buildTreePalette()
    const tree = {
      x: posX,
      trunkTop,
      trunkBottom,
      trunkSegments: organic.trunkSegments,
      rootSegments: organic.rootSegments,
      branchClusters: organic.branchClusters,
      trunkColor: k.rgb(palette.trunk.r, palette.trunk.g, palette.trunk.b),
      rootColor: k.rgb(TREE_ROOT_COLOR_R, TREE_ROOT_COLOR_G, TREE_ROOT_COLOR_B),
      leafColor: k.rgb(FRONT_LEAF_R, FRONT_LEAF_G, FRONT_LEAF_B),
      opacity: 0.95
    }
    applyFrontYellowLeafColors(tree)
    dynamicTrees.push(tree)
  }
  dynamicTrees.forEach((tree, idx) => {
    const baseName = `training-front-tree-${idx}`
    OrganicParallax.prerenderOrganicDarkBackdropSprite(
      k,
      tree,
      baseName,
      FRONT_ORGANIC_DARK_DIM_RGB,
      FRONT_ORGANIC_DARK_BACKDROP_OPACITY_SCALE
    )
    OrganicParallax.prerenderOrganicTreeSprites(k, tree, baseName)
  })
  k.add([k.z(FRONT_ORGANIC_DARK_BACKDROP_Z), {
    draw() {
      for (const tree of dynamicTrees) {
        tree.darkBackdropSpriteName && k.drawSprite({
          sprite: tree.darkBackdropSpriteName,
          pos: k.vec2(tree.darkBackdropX, tree.darkBackdropY),
          anchor: 'topleft'
        })
      }
    }
  }])
  k.add([k.z(FRONT_ORGANIC_DYNAMIC_Z), {
    draw() { drawFrontSwayingOrganicTrees(k, dynamicTrees) }
  }])
}

//
// Draws front organic trees with per-cluster branch sway
//
function drawFrontSwayingOrganicTrees(k, trees) {
  const time = k.time()
  for (const tree of trees) {
    if (!tree.branchClusters) continue
    tree.trunkSpriteName && k.drawSprite({
      sprite: tree.trunkSpriteName,
      pos: k.vec2(tree.trunkSpriteX, tree.trunkSpriteY)
    })
    for (const cluster of tree.branchClusters) {
      if (!cluster.spriteName) continue
      const dt = k.dt()
      const targetDeg = Math.sin(time * cluster.swaySpeed + cluster.swayPhase) * cluster.swayAmount
      const ease = Math.min(1, dt * OrganicParallax.BRANCH_SWAY_SMOOTH_PER_SEC)
      cluster.smoothedAngleDeg = cluster.smoothedAngleDeg == null
        ? targetDeg
        : cluster.smoothedAngleDeg + (targetDeg - cluster.smoothedAngleDeg) * ease
      k.drawSprite({
        sprite: cluster.spriteName,
        pos: k.vec2(cluster.worldPivotX, cluster.worldPivotY),
        anchor: k.vec2(cluster.anchorX, cluster.anchorY),
        angle: cluster.smoothedAngleDeg
      })
    }
  }
}

//
// Paints autumn-yellow leaves on front-row branch clusters (touch level 0 style)
//
function applyFrontYellowLeafColors(tree) {
  for (const cluster of tree.branchClusters) {
    for (const leaf of cluster.leaves) {
      leaf.r = Math.max(110, Math.min(175, FRONT_LEAF_R + (Math.random() - 0.5) * FRONT_LEAF_JITTER))
      leaf.g = Math.max(75, Math.min(130, FRONT_LEAF_G + (Math.random() - 0.5) * FRONT_LEAF_JITTER))
      leaf.b = Math.max(12, Math.min(45, FRONT_LEAF_B + (Math.random() - 0.5) * FRONT_LEAF_JITTER))
    }
  }
}

//
// Draws a prerendered static organic tree (trunk + branch clusters)
//
function drawPrerenderedOrganicTree(k, tree) {
  tree.trunkSpriteName && k.drawSprite({
    sprite: tree.trunkSpriteName,
    pos: k.vec2(tree.trunkSpriteX, tree.trunkSpriteY)
  })
  for (const cluster of tree.branchClusters) {
    cluster.spriteName && k.drawSprite({
      sprite: cluster.spriteName,
      pos: k.vec2(cluster.worldPivotX, cluster.worldPivotY),
      anchor: k.vec2(cluster.anchorX, cluster.anchorY)
    })
  }
}

//
// Blends Kaplay RGB toward cloud-grey circle color
//
function tintKapRgbTowardCloudCircle(k, kapRgb, amount) {
  return k.rgb(
    Math.round(kapRgb.r * (1 - amount) + CLOUD_CIRCLE_R * amount),
    Math.round(kapRgb.g * (1 - amount) + CLOUD_CIRCLE_G * amount),
    Math.round(kapRgb.b * (1 - amount) + CLOUD_CIRCLE_B * amount)
  )
}

//
// Blends leaf RGB toward scene background grey
//
function tintLeafRgbTowardBg(leaf, amount) {
  leaf.r = Math.round(leaf.r * (1 - amount) + BG_R * amount)
  leaf.g = Math.round(leaf.g * (1 - amount) + BG_G * amount)
  leaf.b = Math.round(leaf.b * (1 - amount) + BG_B * amount)
}

//
// Per-tree RGB jitter for grey-leaf parallax band
//
function jitterGreyOrganicRgb(baseR, baseG, baseB) {
  const j = GREY_ORGANIC_JITTER
  return {
    r: Math.max(14, Math.min(32, Math.round(baseR + (Math.random() - 0.5) * j))),
    g: Math.max(14, Math.min(32, Math.round(baseG + (Math.random() - 0.5) * j))),
    b: Math.max(14, Math.min(32, Math.round(baseB + (Math.random() - 0.5) * j)))
  }
}

//
// Generates grass blades in organic clumps (not uniform)
//
function generateGrassClumps() {
  const blades = []
  for (let c = 0; c < GRASS_CLUSTER_COUNT; c++) {
    let centerX = LEFT_MARGIN + 80 + Math.random() * (PLAYABLE_W - 160)
    let safety = 0
    while (Math.abs(centerX - HERO_SPAWN_X) < GRASS_EXCLUDE_HALF_W && safety < 25) {
      centerX = LEFT_MARGIN + 80 + Math.random() * (PLAYABLE_W - 160)
      safety++
    }
    const clusterRadius = 35 + Math.random() * 55
    const bladesInCluster = 5 + Math.floor(Math.random() * 9)
    for (let b = 0; b < bladesInCluster; b++) {
      const dist = Math.pow(Math.random(), 1.6) * clusterRadius
      const sign = Math.random() < 0.5 ? -1 : 1
      const x = centerX + sign * dist
      if (x < LEFT_MARGIN + 8 || x > LEFT_MARGIN + PLAYABLE_W - 8) continue
      const h = 14 + Math.random() * 18
      blades.push({
        x,
        h,
        phase: Math.random() * Math.PI * 2,
        r: 55 + Math.floor(Math.random() * 30),
        g: 70 + Math.floor(Math.random() * 30)
      })
    }
  }
  return blades
}

//
// Draws swaying grass clumps
//
function drawGrass(k, state) {
  const t = state.timer
  for (const blade of state.blades) {
    const sway = Math.sin(t * GRASS_BLADE_SWAY_SPEED + blade.phase) * GRASS_BLADE_SWAY_AMP * blade.h
    k.drawLine({
      p1: k.vec2(blade.x, FLOOR_Y),
      p2: k.vec2(blade.x + sway, FLOOR_Y - blade.h),
      width: 1.5,
      color: k.rgb(blade.r, blade.g, 30),
      opacity: 0.65
    })
  }
}

//
// Advances grass sway timer
//
function onUpdateGrass(k, state) {
  state.timer += k.dt()
}

//
// Generates floor thorns in clusters of 2–6 (touch level 0 pattern)
//
function generateFloorThornsWithGaps(startX, endX, baseY, excludeZones, maxClusters) {
  const thorns = []
  let x = startX
  let clusterCount = 0
  while (x < endX) {
    if (maxClusters != null && clusterCount >= maxClusters) break
    const clusterEnd = Math.min(
      x + FLOOR_THORN_CLUSTER_MIN + Math.random() * FLOOR_THORN_CLUSTER_EXTRA,
      endX
    )
    let cx = x
    let placedInCluster = 0
    const targetInCluster =
      FLOOR_THORN_MIN_PER_CLUSTER +
      Math.floor(
        Math.random() *
          (FLOOR_THORN_MAX_PER_CLUSTER - FLOOR_THORN_MIN_PER_CLUSTER + 1)
      )
    while (placedInCluster < targetInCluster && cx < clusterEnd) {
      const tx = cx + (Math.random() - 0.5) * 6
      cx += FLOOR_THORN_SPACING
      const inExcluded = excludeZones.some(z => Math.abs(tx - z.center) < z.halfWidth)
      if (inExcluded) continue
      thorns.push({
        x: tx,
        baseY,
        width: FLOOR_THORN_WIDTH_MIN + Math.random() * (FLOOR_THORN_WIDTH_MAX - FLOOR_THORN_WIDTH_MIN),
        height: FLOOR_THORN_HEIGHT_MIN + Math.random() * (FLOOR_THORN_HEIGHT_MAX - FLOOR_THORN_HEIGHT_MIN),
        tipOffset: (Math.random() - 0.5) * FLOOR_THORN_TIP_OFFSET
      })
      placedInCluster++
    }
    clusterCount++
    const gap = FLOOR_THORN_GAP_MIN + Math.random() * FLOOR_THORN_GAP_EXTRA
    x = clusterEnd + gap
  }
  return thorns
}

//
// Spike cluster bounds from first to last thorn (count + horizontal span)
//
function computeSpikeClusterMetrics(thornsData) {
  if (!thornsData.length) {
    return {
      count: 0,
      leftX: SPIKE_START_X,
      rightX: SPIKE_END_X,
      passX: SPIKE_END_X + SPIKE_PASS_MARGIN
    }
  }
  const sorted = [...thornsData].sort((a, b) => a.x - b.x)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const leftX = first.x - first.width / 2
  const rightX = last.x + last.width / 2
  return {
    count: thornsData.length,
    leftX,
    rightX,
    passX: rightX + SPIKE_PASS_MARGIN
  }
}

//
// Checks hero feet against floor thorns each frame
//
function checkFloorThorns(k, heroInst, floorThornData, spikeCluster, levelIndicator, hintState, spikeDead) {
  if (spikeDead.active || hintState.levelDone || heroInst.isDying) return
  if (!heroInst.isSpawned || !heroInst.character?.pos) return
  const heroX = heroInst.character.pos.x
  const heroFeetY =
    heroInst.character.pos.y +
    HERO_HITBOX_HEIGHT_FOR_THORNS / 2 +
    HERO_HITBOX_OFFSET_Y_FOR_THORNS
  if (heroFeetY < FLOOR_Y - FLOOR_THORN_FEET_TOLERANCE_LOW ||
      heroFeetY > FLOOR_Y + FLOOR_THORN_FEET_TOLERANCE_HIGH) {
    return
  }
  if (spikeCluster.count === 0) return
  if (heroX < spikeCluster.leftX - HERO_HALF_WIDTH_THORNS ||
      heroX > spikeCluster.rightX + HERO_HALF_WIDTH_THORNS) {
    return
  }
  for (const thorn of floorThornData) {
    const collisionTipY = thorn.baseY - thorn.height + FLOOR_THORN_COLLISION_TIP_BIAS_DOWN
    if (heroFeetY < collisionTipY + FLOOR_THORN_FEET_MIN_PENETRATION_PAST_TIP ||
        heroFeetY > thorn.baseY + FLOOR_THORN_FEET_BELOW_BASE_PAD) {
      continue
    }
    if (Math.abs(heroX - thorn.x) < thorn.width / 2 + HERO_HALF_WIDTH_THORNS) {
      onHeroSpikeDeath(k, heroInst, levelIndicator, hintState, spikeDead)
      return
    }
  }
}

//
// Hero death on spikes: disintegration, life laugh, reload training
//
function onHeroSpikeDeath(k, heroInst, levelIndicator, hintState, spikeDead) {
  if (heroInst.isDying || spikeDead.active) return
  spikeDead.active = true
  hintState.isDead = true
  hintState.currentTip && Tooltip.destroy(hintState.currentTip)
  hintState.currentTip = null
  Hero.death(heroInst, () => {
    const currentScore = get('lifeScore', 0)
    const newScore = currentScore + 1
    set('lifeScore', newScore)
    levelIndicator?.updateLifeScore?.(newScore)
    if (levelIndicator?.lifeImage?.sprite?.exists?.()) {
      Sound.playLifeSound(k)
      const originalColor = levelIndicator.lifeImage.sprite.color
      flashLifeImageOnThornDeath(k, levelIndicator, originalColor, 0)
      createLifeParticlesOnThornDeath(k, levelIndicator)
    }
    k.wait(FLOOR_THORN_DEATH_RELOAD_DELAY, () => k.go('level-touch.training'))
  })
}

//
// Flashes life image red/white on thorn death (touch level 0 pattern)
//
function flashLifeImageOnThornDeath(k, levelIndicator, originalColor, count) {
  if (!levelIndicator?.lifeImage?.sprite?.exists?.()) return
  if (count >= LIFE_FLASH_COUNT) {
    levelIndicator.lifeImage.sprite.color = originalColor
    levelIndicator.lifeImage.sprite.opacity = 1.0
    return
  }
  if (count % 2 === 0) {
    levelIndicator.lifeImage.sprite.color = k.rgb(255, 100, 100)
    levelIndicator.lifeImage.sprite.opacity = 1.0
  } else {
    levelIndicator.lifeImage.sprite.color = k.rgb(255, 255, 255)
    levelIndicator.lifeImage.sprite.opacity = 0.5
  }
  k.wait(LIFE_FLASH_INTERVAL, () => flashLifeImageOnThornDeath(k, levelIndicator, originalColor, count + 1))
}

//
// Red square particles radiating from life icon on thorn death
//
function createLifeParticlesOnThornDeath(k, levelIndicator) {
  if (!levelIndicator?.lifeImage?.sprite?.exists?.()) return
  const lifeX = levelIndicator.lifeImage.sprite.pos.x
  const lifeY = levelIndicator.lifeImage.sprite.pos.y
  for (let i = 0; i < LIFE_PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / LIFE_PARTICLE_COUNT
    const speed = LIFE_PARTICLE_SPEED_MIN + Math.random() * LIFE_PARTICLE_SPEED_EXTRA
    const lifetime = LIFE_PARTICLE_LIFETIME_MIN + Math.random() * LIFE_PARTICLE_LIFETIME_EXTRA
    const size = LIFE_PARTICLE_SIZE_MIN + Math.random() * LIFE_PARTICLE_SIZE_EXTRA
    const particle = k.add([
      k.rect(size, size),
      k.pos(lifeX, lifeY),
      k.color(255, 0, 0),
      k.opacity(1),
      k.z(CFG.visual.zIndex.ui + 10),
      k.anchor('center'),
      k.fixed()
    ])
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed
    const particleState = { elapsed: 0 }
    particle.onUpdate(() => onUpdateLifeParticle(k, particle, vx, vy, lifetime, particleState))
  }
}

//
// Updates a single life-death particle until its lifetime expires
//
function onUpdateLifeParticle(k, particle, vx, vy, lifetime, particleState) {
  particleState.elapsed += k.dt()
  particle.pos.x += vx * k.dt()
  particle.pos.y += vy * k.dt()
  particle.opacity = 1 - particleState.elapsed / lifetime
  if (particleState.elapsed >= lifetime) k.destroy(particle)
}

//
// Flickers skip hint surrounding text opacity (Enter button stays solid).
//
function onUpdateSkipHint(k, anim) {
  const FLICKER_DUR = 1 / SKIP_FLICKER_SPEED
  anim.phase += k.dt()
  if (anim.phase >= FLICKER_DUR) {
    anim.phase = 0
    anim.dir *= -1
  }
  const t = anim.dir > 0 ? anim.phase / FLICKER_DUR : 1 - anim.phase / FLICKER_DUR
  const op = SKIP_MIN_OPACITY + (SKIP_MAX_OPACITY - SKIP_MIN_OPACITY) * t
  anim.hint.setOpacity(op)
}

//
// Removes all active training hint tooltips before leaving the scene
//
function destroyTrainingHints(k, hintState) {
  hintState.levelDone = true
  hintState.currentTip && Tooltip.destroy(hintState.currentTip)
  hintState.currentTip = null
  hintState.currentHintType = null
  hintState.hudFrozenTip && Tooltip.destroy(hintState.hudFrozenTip)
  hintState.hudFrozenTip = null
}

//
// Shows a forced tooltip above the hero.
// When `duration` is Infinity (default) the bubble stays put forever and is
// only cleared by another showHint() / transitionToHint() call (or scene
// teardown). Use a finite `duration` for self-progressing hints like the
// opening welcome message.
//
function showHint(k, hintState, heroInst, text, hintType, duration = Infinity) {
  hintState.currentTip && Tooltip.destroy(hintState.currentTip)
  hintState.currentTip = null
  hintState.currentHintType = null
  if (hintState.levelDone || hintState.isDead) return
  const target = {
    x: () => heroInst.character?.pos?.x ?? 0,
    y: () => heroInst.character?.pos?.y ?? 0,
    width: 0,
    height: 0,
    text,
    offsetY: HINT_Y_OFFSET
  }
  const tip = Tooltip.create({ k, targets: [target], forceVisible: true })
  tip.activeTarget = target
  tip.frozenX = Math.round(heroInst.character?.pos?.x ?? 0)
  tip.frozenY = Math.round(heroInst.character?.pos?.y ?? 0)
  tip.opacity = 1
  hintState.currentTip = tip
  hintState.currentHintType = hintType
  if (duration === Infinity) return
  k.wait(duration, () => {
    if (hintState.currentTip === tip) {
      Tooltip.destroy(tip)
      hintState.currentTip = null
      hintState.currentHintType = null
    }
  })
}

//
// Hides the current hint, waits HINT_TRANSITION_GAP seconds, then shows the
// next hint. Used for "action complete → small pause → next hint" flow.
//
function transitionToHint(k, hintState, heroInst, text, hintType) {
  hintState.currentTip && Tooltip.destroy(hintState.currentTip)
  hintState.currentTip = null
  hintState.currentHintType = null
  k.wait(HINT_TRANSITION_GAP, () => {
    if (hintState.levelDone || hintState.isDead) return
    showHint(k, hintState, heroInst, text, hintType)
  })
}

//
// Shows a hint for a fixed duration then runs an optional callback
//
function showTimedHint(k, hintState, heroInst, text, hintType, duration, onDone) {
  showHint(k, hintState, heroInst, text, hintType, duration)
  onDone && k.wait(duration, onDone)
}

//
// Updates tutorial hints and keeps active hint anchored to the hero
//
function onUpdateHints(k, hintState, heroInst, levelIndicator, sound) {
  if (hintState.levelDone || hintState.isDead) return
  updateTrainingLabelProgress(k, levelIndicator, hintState, heroInst, sound)
  if (hintState.currentTip && heroInst.character) {
    hintState.currentTip.frozenX = Math.round(heroInst.character.pos.x)
    hintState.currentTip.frozenY = Math.round(heroInst.character.pos.y)
  }
  const bonusHintActive = k.time() < hintState.bonusCollectUntil
  const onMainPlatform = isHeroGroundedOnMainPlatform(heroInst)
  const onBonusPlatform = isHeroGroundedOnBonusPlatform(heroInst)
  const heroX = heroInst.character?.pos?.x ?? 0
  //
  // Hero pressed a run key — replace the run hint with the jump hint
  // (after a brief gap defined by HINT_TRANSITION_GAP).
  //
  if (!hintState.shown2 && hintState.shown1 && hintState.runKeysUsed && !hintState.shown3 &&
      !onMainPlatform && !onBonusPlatform && !bonusHintActive && !heroInst.controlsDisabled &&
      !hintState.wasOnBonusPlatform && !hintState.findYourselfAfterLeave &&
      heroX >= HINT_2_APPROACH_X) {
    hintState.shown2 = true
    transitionToHint(k, hintState, heroInst, HINT_2_TEXT, 'jump')
  }
  //
  // Hero lands on the log — replace previous hint with fragment hint
  //
  if (!hintState.shown3 && hintState.shown2 && onMainPlatform && !hintState.wasOnMainPlatform && !bonusHintActive) {
    hintState.shown3 = true
    transitionToHint(k, hintState, heroInst, HINT_3_TEXT, 'fragment')
  }
  hintState.wasOnMainPlatform = onMainPlatform
  if (onBonusPlatform && !hintState.landedOnBonusPlatform) {
    hintState.landedOnBonusPlatform = true
    if (!hintState.shown4 && !hintState.spikesPassed && !bonusHintActive) {
      hintState.shown4 = true
      transitionToHint(k, hintState, heroInst, HINT_4_TEXT, 'spikes')
    }
  }
  //
  // After leaving the hidden platform for 2s — replace hint with find-yourself
  //
  if (onBonusPlatform) {
    hintState.leftBonusPlatformAt = 0
    hintState.findYourselfAfterLeave = false
  } else if (hintState.wasOnBonusPlatform || (hintState.fragmentCollected && hintState.visitedBonusPlatform)) {
    hintState.leftBonusPlatformAt === 0 && (hintState.leftBonusPlatformAt = k.time())
    if (k.time() - hintState.leftBonusPlatformAt >= FRAGMENT_LEAVE_FIND_YOURSELF_DELAY &&
        !hintState.findYourselfAfterLeave) {
      hintState.findYourselfAfterLeave = true
      if (!hintState.levelDone) {
        hintState.shown5 = true
        transitionToHint(k, hintState, heroInst, HINT_5_TEXT, 'antihero')
      }
    }
  }
  if (onBonusPlatform || hintState.fragmentCollected) {
    hintState.visitedBonusPlatform = true
  }
  hintState.wasOnBonusPlatform = onBonusPlatform
  //
  // Hero cleared the spike cluster — swap the spike hint for the
  // find-yourself one (with the standard transition gap).
  //
  if (!hintState.spikesPassed && (heroInst.character?.pos?.x ?? 0) > hintState.spikePassX) {
    hintState.spikesPassed = true
    hintState.shown4 = true
    if (!hintState.shown5 && !hintState.levelDone) {
      hintState.shown5 = true
      transitionToHint(k, hintState, heroInst, HINT_5_TEXT, 'antihero')
    }
  }
}

//
// Marks TRAINING label letters brown as tutorial milestones complete
//
function updateTrainingLabelProgress(k, levelIndicator, hintState, heroInst, sound) {
  if (!levelIndicator?.letterObjects?.length) return
  if (hintState.mouseHintDone && hintState.trainingLabelLetters < TRAINING_LETTERS_AFTER_RUN &&
      heroInst.isSpawned && !heroInst.controlsDisabled &&
      (isAnyKeyDown(k, CFG.controls.moveLeft) || isAnyKeyDown(k, CFG.controls.moveRight))) {
    hintState.runKeysUsed = true
    applyTrainingLetterProgress(k, levelIndicator, hintState, sound, TRAINING_LETTERS_AFTER_RUN)
  }
  if (hintState.trainingLabelLetters < TRAINING_LETTERS_AFTER_MAIN && isHeroGroundedOnMainPlatform(heroInst)) {
    applyTrainingLetterProgress(k, levelIndicator, hintState, sound, TRAINING_LETTERS_AFTER_MAIN)
  }
  if (hintState.trainingLabelLetters < TRAINING_LETTERS_AFTER_BONUS && isHeroGroundedOnBonusPlatform(heroInst)) {
    applyTrainingLetterProgress(k, levelIndicator, hintState, sound, TRAINING_LETTERS_AFTER_BONUS)
  }
  if (hintState.trainingLabelLetters < TRAINING_LETTERS_AFTER_COMPLETE && hintState.levelDone) {
    applyTrainingLetterProgress(k, levelIndicator, hintState, sound, TRAINING_LETTERS_AFTER_COMPLETE)
  }
}

//
// Colors TRAINING letters and plays milestone feedback
//
function applyTrainingLetterProgress(k, levelIndicator, hintState, sound, completedLetters) {
  if (completedLetters <= hintState.trainingLabelLetters) return
  const prevLetters = hintState.trainingLabelLetters
  hintState.trainingLabelLetters = completedLetters
  LevelIndicator.setSectionLabelLetterProgress(levelIndicator, completedLetters)
  if (completedLetters >= TRAINING_LETTERS_AFTER_COMPLETE) return
  sound && Sound.playVictorySound(sound)
  createTrainingLabelParticles(k, levelIndicator, prevLetters, completedLetters)
}

//
// Tracks hero surface for wood knock landing (touch level 2 style)
//
function onUpdateTrainingSurface(heroInst, sound) {
  if (!heroInst?.character?.exists?.()) return
  const hx = heroInst.character.pos.x
  const hy = heroInst.character.pos.y
  if (Math.abs(hy - FLOOR_Y) < TRAINING_SURFACE_FLOOR_THRESHOLD) {
    sound._l2Surface = null
    return
  }
  const nearMain = Math.abs(hx - MAIN_PLATFORM_X) < MAIN_PLATFORM_STAND_X_HALF
  const nearBonus = Math.abs(hx - BONUS_PLATFORM_X) < BONUS_PLATFORM_STAND_X_HALF
  sound._l2Surface = (nearMain || nearBonus) ? 'wood' : null
}

//
// After welcome hint, enables controls once the player hovers the anti-hero
//
function onUpdateAntiHeroMouseHint(k, antiHeroInst, hintState, heroInst, levelIndicator, fpsCounter, sound) {
  if (hintState.levelDone || hintState.isDead || hintState.mouseHintDone) return
  if (!antiHeroInst.character?.exists?.() || !heroInst.character?.exists?.()) return
  if (!hintState.awaitingMouseHint || hintState.mouseHintHovering) return
  const mp = TouchInput.getPointerPos(k)
  const ax = antiHeroInst.character.pos.x
  const ay = antiHeroInst.character.pos.y
  const hovered = Math.abs(mp.x - ax) < ANTIHERO_MOUSE_HOVER_HALF &&
    Math.abs(mp.y - ay) < ANTIHERO_MOUSE_HOVER_HALF
  hovered && beginAntiHeroHoverTutorial(k, antiHeroInst, hintState, heroInst, levelIndicator, fpsCounter, sound)
}

//
// Shows anti-hero tooltip for 2s after first hover, then HUD mouse tutorial
//
function beginAntiHeroHoverTutorial(k, antiHeroInst, hintState, heroInst, levelIndicator, fpsCounter, sound) {
  hintState.awaitingMouseHint = false
  hintState.mouseHintHovering = true
  applyTrainingLetterProgress(k, levelIndicator, hintState, sound, TRAINING_LETTERS_AFTER_HOVER)
  hintState.currentTip && Tooltip.destroy(hintState.currentTip)
  hintState.currentTip = null
  hintState.currentHintType = null
  const ax = Math.round(antiHeroInst.character.pos.x)
  const ay = Math.round(antiHeroInst.character.pos.y)
  const target = {
    x: ax,
    y: ay,
    width: ANTIHERO_TOOLTIP_HOVER_SIZE,
    height: ANTIHERO_TOOLTIP_HOVER_SIZE,
    text: ANTIHERO_TOOLTIP_TEXT,
    offsetY: ANTIHERO_TOOLTIP_Y_OFFSET
  }
  const tip = Tooltip.create({ k, targets: [target], forceVisible: true })
  tip.activeTarget = target
  tip.frozenX = ax
  tip.frozenY = ay
  tip.opacity = 1
  k.wait(ANTIHERO_HOVER_PAUSE, () => {
    Tooltip.destroy(tip)
    if (hintState.mouseHintDone || hintState.levelDone || hintState.isDead) return
    hintState.mouseHintHovering = false
    hintState.mouseHintDone = true
    hintState.antiHeroPersistentTooltipDisabled = true
    heroInst.controlsDisabled = true
    beginHudMouseTutorial(k, hintState, heroInst, levelIndicator, fpsCounter, sound)
  })
}

//
// Starts the HUD hover tutorial chain before the run hint
//
function beginHudMouseTutorial(k, hintState, heroInst, levelIndicator, fpsCounter, sound) {
  hintState.hudTutorialStep = 'smallHeroHint'
  showHint(k, hintState, heroInst, HUD_SMALL_HERO_HINT, 'hudSmallHero')
}

//
// Tracks HUD hover steps: small hero, life, green timer, then run hint
//
function onUpdateHudMouseTutorial(k, hintState, heroInst, levelIndicator, fpsCounter, sound) {
  if (!hintState.mouseHintDone || hintState.hudTutorialStep === 'done' || hintState.levelDone || hintState.isDead) return
  if (hintState.hudFrozenTip) return
  const mp = TouchInput.getPointerPos(k)
  if (hintState.hudTutorialStep === 'smallHeroHint' && !hintState.smallHeroTooltipDone) {
    const sh = levelIndicator.smallHero?.character
    if (!sh?.pos) return
    isMouseOverPoint(mp, sh.pos.x, sh.pos.y, HUD_UI_HOVER_HALF) &&
      (hintState.smallHeroTooltipDone = true) &&
      beginHudStepTooltip(k, hintState, levelIndicator, sound, sh.pos.x, sh.pos.y, HUD_SMALL_HERO_TOOLTIP, TRAINING_LETTERS_AFTER_HUD_SMALL_HERO, () => {
        hintState.hudTutorialStep = 'lifeHint'
        transitionToHint(k, hintState, heroInst, HUD_LIFE_HINT, 'hudLife')
      })
    return
  }
  if (hintState.hudTutorialStep === 'lifeHint' && !hintState.lifeTooltipDone) {
    const life = levelIndicator.lifeImage?.pos
    if (!life) return
    isMouseOverPoint(mp, life.x, life.y, HUD_UI_HOVER_HALF) &&
      (hintState.lifeTooltipDone = true) &&
      beginHudStepTooltip(k, hintState, levelIndicator, sound, life.x, life.y, HUD_LIFE_TOOLTIP, TRAINING_LETTERS_AFTER_HUD_LIFE, () => {
        hintState.hudTutorialStep = 'timeHint'
        transitionToHint(k, hintState, heroInst, HUD_TIME_HINT, 'hudTime')
      })
    return
  }
  if (hintState.hudTutorialStep === 'timeHint' && !hintState.timeTooltipDone) {
    const targetText = fpsCounter?.targetText
    if (!targetText?.pos) return
    isMouseOverPoint(mp, targetText.pos.x, targetText.pos.y, HUD_UI_HOVER_HALF) &&
      (hintState.timeTooltipDone = true) &&
      beginHudStepTooltip(k, hintState, levelIndicator, sound, targetText.pos.x, targetText.pos.y, HUD_TIME_TOOLTIP, TRAINING_LETTERS_AFTER_HUD_TIME, () => {
        hintState.hudTutorialStep = 'done'
        finishHudMouseTutorial(k, hintState, heroInst)
      })
  }
}

//
// Starts HUD tooltip on hover and colors the next TRAINING letter immediately
//
function beginHudStepTooltip(k, hintState, levelIndicator, sound, x, y, text, letterCount, onAfterTooltip) {
  if (hintState.hudFrozenTip) return
  applyTrainingLetterProgress(k, levelIndicator, hintState, sound, letterCount)
  showHudFrozenTooltip(k, hintState, x, y, text, onAfterTooltip)
}

//
// Enables controls and shows the run hint after HUD tutorial completes
//
function finishHudMouseTutorial(k, hintState, heroInst) {
  heroInst.controlsDisabled = false
  hintState.shown1 = true
  transitionToHint(k, hintState, heroInst, HINT_1_TEXT, 'run')
}

//
// Shows a fixed HUD tooltip for two seconds, then runs callback once
//
function showHudFrozenTooltip(k, hintState, x, y, text, onDone) {
  hintState.hudFrozenTip && Tooltip.destroy(hintState.hudFrozenTip)
  const target = {
    x: Math.round(x),
    y: Math.round(y),
    width: HUD_UI_HOVER_HALF * 2,
    height: HUD_UI_HOVER_HALF * 2,
    text,
    offsetY: 50,
    forceBelow: true
  }
  const tip = Tooltip.create({ k, targets: [target], forceVisible: true })
  tip.activeTarget = target
  tip.frozenX = target.x
  tip.frozenY = target.y
  tip.opacity = 1
  hintState.hudFrozenTip = tip
  k.wait(HUD_FROZEN_TOOLTIP_DURATION, () => {
    Tooltip.destroy(tip)
    if (hintState.hudFrozenTip === tip) hintState.hudFrozenTip = null
    onDone?.()
  })
}

//
// True when the mouse is within a square hit area around a point
//
function isMouseOverPoint(mp, x, y, half) {
  return Math.abs(mp.x - x) < half && Math.abs(mp.y - y) < half
}

//
// Circle particles radiating from the newly completed TRAINING letter pair
//
function createTrainingLabelParticles(k, levelIndicator, prevLetters, completedLetters) {
  if (!levelIndicator?.letterObjects?.length || completedLetters <= prevLetters) return
  const activeLetters = levelIndicator.letterObjects
    .slice(prevLetters, completedLetters)
    .filter((letter) => letter?.exists?.())
  if (!activeLetters.length) return
  const cx = activeLetters.reduce((sum, letter) => sum + letter.pos.x, 0) / activeLetters.length
  const cy = activeLetters.reduce((sum, letter) => sum + letter.pos.y, 0) / activeLetters.length + TRAINING_LABEL_PARTICLE_LETTER_Y_OFFSET
  const labelColor = getRGB(k, TRAINING_LABEL_COLOR_HEX)
  for (let i = 0; i < TRAINING_LABEL_PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / TRAINING_LABEL_PARTICLE_COUNT
    const speed = TRAINING_LABEL_PARTICLE_SPEED_MIN + Math.random() * TRAINING_LABEL_PARTICLE_SPEED_EXTRA
    const lifetime = TRAINING_LABEL_PARTICLE_LIFETIME_MIN + Math.random() * TRAINING_LABEL_PARTICLE_LIFETIME_EXTRA
    const size = TRAINING_LABEL_PARTICLE_SIZE_MIN + Math.random() * TRAINING_LABEL_PARTICLE_SIZE_EXTRA
    const particle = k.add([
      k.circle(size),
      k.pos(cx, cy),
      k.color(labelColor.r, labelColor.g, labelColor.b),
      k.opacity(1),
      k.z(CFG.visual.zIndex.ui + 10),
      k.anchor('center'),
      k.fixed()
    ])
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed
    const particleState = { elapsed: 0 }
    particle.onUpdate(() => onUpdateTrainingLabelParticle(k, particle, vx, vy, lifetime, particleState))
  }
}

//
// Updates a single TRAINING label burst particle until its lifetime expires
//
function onUpdateTrainingLabelParticle(k, particle, vx, vy, lifetime, particleState) {
  particleState.elapsed += k.dt()
  particle.pos.x += vx * k.dt()
  particle.pos.y += vy * k.dt()
  particle.opacity = 1 - particleState.elapsed / lifetime
  particleState.elapsed >= lifetime && k.destroy(particle)
}

//
// True when the hero is standing on the main log platform
//
function isHeroOnMainPlatform(heroInst) {
  if (!heroInst.character?.pos) return false
  const heroX = heroInst.character.pos.x
  const heroY = heroInst.character.pos.y
  return Math.abs(heroX - MAIN_PLATFORM_X) < MAIN_PLATFORM_STAND_X_HALF
    && heroY <= MAIN_PLATFORM_STAND_Y_MAX
    && heroY >= MAIN_PLATFORM_STAND_Y_MIN
}

//
// True when the hero is standing on the hidden bonus platform
//
function isHeroOnBonusPlatform(heroInst) {
  if (!heroInst.character?.pos) return false
  const heroX = heroInst.character.pos.x
  const heroY = heroInst.character.pos.y
  return Math.abs(heroX - BONUS_PLATFORM_X) < BONUS_PLATFORM_STAND_X_HALF
    && heroY <= BONUS_PLATFORM_STAND_Y_MAX
    && heroY >= BONUS_PLATFORM_STAND_Y_MIN
}

//
// True when the hero has landed on the main log platform
//
function isHeroGroundedOnMainPlatform(heroInst) {
  if (!heroInst.character?.exists?.()) return false
  if (!heroInst.character.isGrounded?.()) return false
  return isHeroOnMainPlatform(heroInst)
}

//
// True when the hero has landed on the hidden bonus platform
//
function isHeroGroundedOnBonusPlatform(heroInst) {
  if (!heroInst.character?.exists?.()) return false
  if (!heroInst.character.isGrounded?.()) return false
  return isHeroOnBonusPlatform(heroInst)
}

//
// Shows centered completion message before leaving training
//
function showTrainingCompleteMessage(k, onDone) {
  const textSize = Math.round(k.height() * TRAINING_COMPLETE_FONT_SIZE_RATIO)
  const font = CFG.visual.fonts.regularFull.replace(/'/g, '')
  const textX = k.width() / 2
  const textY = k.height() / 2
  const { r, g, b } = getRGB(k, TRAINING_LABEL_COLOR_HEX)
  const outlineOffsets = [
    [-TRAINING_COMPLETE_OUTLINE_OFFSET, 0], [TRAINING_COMPLETE_OUTLINE_OFFSET, 0],
    [0, -TRAINING_COMPLETE_OUTLINE_OFFSET], [0, TRAINING_COMPLETE_OUTLINE_OFFSET],
    [-TRAINING_COMPLETE_OUTLINE_OFFSET, -TRAINING_COMPLETE_OUTLINE_OFFSET],
    [TRAINING_COMPLETE_OUTLINE_OFFSET, -TRAINING_COMPLETE_OUTLINE_OFFSET],
    [-TRAINING_COMPLETE_OUTLINE_OFFSET, TRAINING_COMPLETE_OUTLINE_OFFSET],
    [TRAINING_COMPLETE_OUTLINE_OFFSET, TRAINING_COMPLETE_OUTLINE_OFFSET]
  ]
  const nodes = outlineOffsets.map(([dx, dy]) => k.add([
    k.text(TRAINING_COMPLETE_MESSAGE, {
      size: textSize,
      align: 'center',
      lineSpacing: TRAINING_COMPLETE_LINE_SPACING,
      font
    }),
    k.pos(textX + dx, textY + dy),
    k.anchor('center'),
    k.color(0, 0, 0),
    k.fixed(),
    k.z(TRAINING_COMPLETE_TEXT_Z)
  ]))
  nodes.push(k.add([
    k.text(TRAINING_COMPLETE_MESSAGE, {
      size: textSize,
      align: 'center',
      lineSpacing: TRAINING_COMPLETE_LINE_SPACING,
      font
    }),
    k.pos(textX, textY),
    k.anchor('center'),
    k.color(r, g, b),
    k.fixed(),
    k.z(TRAINING_COMPLETE_TEXT_Z + 1)
  ]))
  k.wait(TRAINING_COMPLETE_MESSAGE_DURATION, () => {
    nodes.forEach((node) => node.destroy?.())
    onDone?.()
  })
}

//
// Flashes HUD small hero and spawns particles on annihilation (touch level pattern)
//
function playHeroScoreEffects(k, levelIndicator, bodyColorHex) {
  if (!levelIndicator?.smallHero?.character) return
  const heroColor = getRGB(k, bodyColorHex)
  flashSmallHeroScore(k, levelIndicator, heroColor, 0)
  createHeroScoreParticles(k, levelIndicator, heroColor)
}

//
// Flash small hero between hero color and white
//
function flashSmallHeroScore(k, levelIndicator, heroColor, count) {
  if (!levelIndicator?.smallHero?.character?.exists?.()) return
  if (count >= HERO_SCORE_FLASH_COUNT) {
    levelIndicator.smallHero.character.color = k.rgb(255, 255, 255)
    return
  }
  levelIndicator.smallHero.character.color = count % 2 === 0
    ? heroColor
    : k.rgb(255, 255, 255)
  k.wait(HERO_SCORE_FLASH_INTERVAL, () => flashSmallHeroScore(k, levelIndicator, heroColor, count + 1))
}

//
// Circle particles radiating from HUD small hero on score gain
//
function createHeroScoreParticles(k, levelIndicator, heroColor) {
  if (!levelIndicator?.smallHero?.character?.exists?.()) return
  const heroX = levelIndicator.smallHero.character.pos.x
  const heroY = levelIndicator.smallHero.character.pos.y
  for (let i = 0; i < HERO_SCORE_PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / HERO_SCORE_PARTICLE_COUNT
    const speed = HERO_SCORE_PARTICLE_SPEED_MIN + Math.random() * HERO_SCORE_PARTICLE_SPEED_RANGE
    const lifetime = HERO_SCORE_PARTICLE_LIFETIME_MIN + Math.random() * HERO_SCORE_PARTICLE_LIFETIME_RANGE
    const size = HERO_SCORE_PARTICLE_SIZE_MIN + Math.random() * HERO_SCORE_PARTICLE_SIZE_RANGE
    const particle = k.add([
      k.circle(size),
      k.pos(heroX, heroY),
      k.color(heroColor.r, heroColor.g, heroColor.b),
      k.opacity(1),
      k.z(CFG.visual.zIndex.ui + 11),
      k.anchor('center'),
      k.fixed()
    ])
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed
    const particleState = { elapsed: 0 }
    particle.onUpdate(() => onUpdateHeroScoreParticle(k, particle, vx, vy, lifetime, particleState))
  }
}

//
// Updates a single HUD score particle until its lifetime expires
//
function onUpdateHeroScoreParticle(k, particle, vx, vy, lifetime, particleState) {
  particleState.elapsed += k.dt()
  particle.pos.x += vx * k.dt()
  particle.pos.y += vy * k.dt()
  particle.opacity = 1 - particleState.elapsed / lifetime
  if (particleState.elapsed >= lifetime) k.destroy(particle)
}

//
// Schedules ambient bird, owl, and cricket sounds
//
function scheduleAmbientSounds(k, sound) {
  scheduleBirdChirps(k, sound)
  scheduleOwlHoots(k, sound)
  scheduleCrickets(k, sound)
}

function scheduleBirdChirps(k, sound) {
  const delay = BIRD_CHIRP_INTERVAL_MIN + Math.random() * BIRD_CHIRP_INTERVAL_EXTRA
  k.wait(delay, () => {
    Sound.playBirdChirpSound(sound)
    scheduleBirdChirps(k, sound)
  })
}

function scheduleOwlHoots(k, sound) {
  const delay = OWL_INTERVAL_MIN + Math.random() * OWL_INTERVAL_EXTRA
  k.wait(delay, () => {
    Sound.playOwlSound(sound)
    scheduleOwlHoots(k, sound)
  })
}

function scheduleCrickets(k, sound) {
  const delay = CRICKET_INTERVAL_MIN + Math.random() * CRICKET_INTERVAL_EXTRA
  k.wait(delay, () => {
    Sound.playCricketSound(sound)
    scheduleCrickets(k, sound)
  })
}
