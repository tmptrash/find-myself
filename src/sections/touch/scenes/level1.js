import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set, get } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import * as Bugs from '../components/bugs.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as LevelIndicator from '../components/level-indicator.js'
import * as TreeRoots from '../components/tree-roots.js'
import { createLevelTransition } from '../../../utils/transition.js'
import { goToMenuAfterAssets, goAfterPreparingAssets } from '../../../utils/level-assets.js'
import { loadTouchSprite } from '../../../utils/touch-sprite-registry.js'
import { toCanvas, getRGB, parseHex } from '../../../utils/helper.js'
import * as FallingLeaf from '../components/falling-leaf.js'
import * as Rain from '../components/rain.js'
import * as Tooltip from '../../../utils/tooltip.js'
import * as LifeDeduction from '../utils/life-deduction.js'
import * as GiantWorm from '../components/giant-worm.js'
import { drawRealisticBird } from '../utils/realistic-bird.js'
import * as OrganicParallax from '../utils/organic-parallax-tree.js'
import { addTouchSectionFloorRocks, addSingleFloorRockAt } from '../utils/floor-rocks.js'
import { createHangingSpider, spiderHoverTooltipTarget } from '../utils/hanging-spider.js'
import * as BonusHero from '../components/bonus-hero.js'
//
// Platform dimensions (minimal margins for large play area)
//
const TOP_MARGIN = CFG.visual.gameArea.topMargin
const BOTTOM_MARGIN = CFG.visual.gameArea.bottomMargin
const LEFT_MARGIN = CFG.visual.gameArea.leftMargin
const RIGHT_MARGIN = CFG.visual.gameArea.rightMargin
//
// Rounded corner configuration
//
const CORNER_RADIUS = 20
const CORNER_SPRITE_NAME = 'touch1-corner-sprite'
const WALL_COLOR_HEX = '#2A2A2A'
//
// Platform dimensions
//
const FLOOR_Y = CFG.visual.screen.height - BOTTOM_MARGIN - 200
//
// Hero spawn positions
//
const HERO_SPAWN_X = LEFT_MARGIN + 100
const HERO_SPAWN_Y = FLOOR_Y - 50
//
// Anti-hero spawn position
//
const ANTIHERO_SPAWN_X = CFG.visual.screen.width - RIGHT_MARGIN - 100
const ANTIHERO_SPAWN_Y = FLOOR_Y - 50
//
// Speed bonus effects (flash small hero + particles on quick completion)
//
const SPEED_BONUS_FLASH_COUNT = 20
const SPEED_BONUS_FLASH_INTERVAL = 0.05
const SPEED_BONUS_PARTICLE_COUNT = 8
const SPEED_BONUS_PARTICLE_SPEED_MIN = 30
const SPEED_BONUS_PARTICLE_SPEED_RANGE = 20
const SPEED_BONUS_PARTICLE_SIZE_MIN = 4
const SPEED_BONUS_PARTICLE_SIZE_RANGE = 4
const SPEED_BONUS_PARTICLE_LIFETIME_MIN = 0.8
const SPEED_BONUS_PARTICLE_LIFETIME_RANGE = 0.4
//
// Rain intensity (fraction of default drop count)
//
const RAIN_INTENSITY = 0.1
//
// Firefly configuration: small glowing dots that drift between tree layers
//
const FIREFLY_COUNT = 18
const FIREFLY_MIN_SPEED = 8
const FIREFLY_MAX_SPEED = 25
const FIREFLY_DRIFT_RANGE = 40
const FIREFLY_RADIUS_MIN = 1.5
const FIREFLY_RADIUS_MAX = 3
const FIREFLY_GLOW_SPEED_MIN = 0.8
const FIREFLY_GLOW_SPEED_MAX = 2.5
const FIREFLY_COLOR_R = 220
const FIREFLY_COLOR_G = 255
const FIREFLY_COLOR_B = 180
//
// Hero push distance for fireflies (same mechanic as snowflakes)
//
const FIREFLY_PUSH_DISTANCE = 60
const FIREFLY_PUSH_STRENGTH = 8
//
// Z-indices for firefly layers (behind/between/in front of trees)
//
const FIREFLY_LAYERS_Z = [1, 4, 8, 24]
//
// Thunder and lightning configuration
//
const THUNDER_INTERVAL_MIN = 8
const THUNDER_INTERVAL_MAX = 15
const LIGHTNING_FLASH_DURATION = 0.18
const LIGHTNING_FLASH_OPACITY = 0.28
const LIGHTNING_BLINK_COUNT = 3
const LIGHTNING_BLINK_INTERVAL = 0.06
const THUNDER_MULTI_CHANCE = 0.5
const THUNDER_MULTI_MAX = 3
const THUNDER_MULTI_DELAY_MIN = 0.4
const THUNDER_MULTI_DELAY_MAX = 1.2
//
// Forest ambient sound intervals (level 1)
//
const L1_BIRD_INTERVAL_MIN = 4
const L1_BIRD_INTERVAL_MAX = 9
const L1_CRICKET_INTERVAL_MIN = 3
const L1_CRICKET_INTERVAL_MAX = 7
const L1_FROG_INTERVAL_MIN = 6
const L1_FROG_INTERVAL_MAX = 14
const L1_CROW_MP3_INTERVAL_MIN = 8
const L1_CROW_MP3_INTERVAL_MAX = 20
const L1_CROW_MP3_VOLUME = 0.6
const L1_CROW_MP3_NAMES = ['l1-crow-0', 'l1-crow-1']
const L1_CROW_MOUTH_OPEN_DURATION = 0.9
const L1_CROW_ROCK_DRAW_Z = 9
//
// Crow sits on the bare ground just to the right of the hero spawn (no rock, no grass zone).
//
const L1_CROW_X = LEFT_MARGIN + 160
const L1_CROW_TOOLTIP_TEXT = 'you are a loser'
const L1_CROW_TOOLTIP_HOVER_W = 52
const L1_CROW_TOOLTIP_HOVER_H = 48
const L1_CROW_TOOLTIP_OFFSET_Y = -52
//
// Middle parallax layer: same organic autumn trees as touch L0, darkened for depth.
//
const L1_MIDDLE_ORGANIC_TREE_COUNT = 6
const L1_MIDDLE_ORGANIC_COLOR_DIM = 0.3
const L1_MIDDLE_GREYWASH = 0.48
//
// Front organic row reads farther away than gameplay props (no sway; baked into front PNG).
//
const L1_FRONT_ORGANIC_COLOR_DIM = 0.2
const L1_FRONT_ORGANIC_GREYWASH = 0.58
const L1_BACK_ROW_FAR_BLEND = 0.62
const L1_BACK_ROW_NEAR_BLEND = 0.36
const L1_SCENE_BG_R = 42
const L1_SCENE_BG_G = 42
const L1_SCENE_BG_B = 42
//
// Mushroom decoration constants for level 1
//
const L1_MUSHROOM_COUNT = 6
const L1_MUSHROOM_FUNNY_CHANCE = 0.38
const L1_SPIDER_TOOLTIP_TEXT = 'apartment for rent, cheap'
//
// Occasional mushroom hover jokes (English)
//
const L1_MUSHROOM_FUNNY_LINES = [
  'still more grounded than my ex',
  'do not tap — union mushroom',
  'certified organic-ish',
  'contains zero bitcoin',
  'I peaked in the spore era'
]
const L1_MUSHROOM_CAP_WIDTH_MIN = 14
const L1_MUSHROOM_CAP_WIDTH_MAX = 26
const L1_MUSHROOM_STEM_HEIGHT_MIN = 10
const L1_MUSHROOM_STEM_HEIGHT_MAX = 20
//
// Scrolling cloud constants
//
const CLOUD_SCROLL_SPEED = 8
const CLOUD_TOP_Y = TOP_MARGIN + 20
const CLOUD_BOTTOM_Y = TOP_MARGIN + 100
const CLOUD_COUNT = 18
const CLOUD_RANDOMNESS = 20
//
// Tooltip texts
//
const HERO_TOOLTIP_TEXT = "find yourself"
const HERO_TOOLTIP_HOVER_SIZE = 80
const HERO_TOOLTIP_Y_OFFSET = -100
const TOUCH_INDICATOR_TOOLTIP_TEXT = "here you see how far you have\ncome in learning touch"
const TOUCH_INDICATOR_TOOLTIP_WIDTH = 250
const TOUCH_INDICATOR_TOOLTIP_HEIGHT = 50
const TOUCH_INDICATOR_TOOLTIP_Y_OFFSET = -30
const GREEN_TIMER_TOOLTIP_TEXT = "complete the level in time\nto earn more points"
const GREEN_TIMER_TOOLTIP_WIDTH = 80
const GREEN_TIMER_TOOLTIP_HEIGHT = 20
const GREEN_TIMER_TOOLTIP_Y_OFFSET = 30
const FPS_COUNTER_TOP_Y = 55
const SMALL_HERO_TOOLTIP_TEXT = "your points"
const SMALL_HERO_TOOLTIP_SIZE = 60
const SMALL_HERO_TOOLTIP_Y_OFFSET = 50
const LIFE_TOOLTIP_TEXT = "life score"
const LIFE_TOOLTIP_SIZE = 60
const LIFE_TOOLTIP_Y_OFFSET = 50
//
// Falling leaf tooltip phrases (shown when hovering a leaf in the air)
//
const LEAF_FALLING_PHRASES = [
  "aaaaaa!!!!",
  "I'm freeee!",
  "Wheee!!",
  "not again...",
  "fly, fly, fly!"
]
//
// Grounded leaf tooltip phrases (shown when hovering a leaf on the floor)
//
const LEAF_GROUND_PHRASES = [
  "I used to be somebody",
  "don't step on me!",
  "I'm fine. this is fine",
  "tell my branch\nI said hi",
  "floor life is\nnot so bad",
  "I'm on a break",
  "five more minutes...",
  "was that a foot?!",
  "I regret nothing",
  "at least it's warm\ndown here"
]
//
// Poison leaf tooltip phrases (shown on hover over blue leaves)
//
const LEAF_POISON_PHRASES = [
  "don't touch me",
  "I dare you",
  "feeling brave?",
  "you won't like this",
  "blue means danger"
]
const LEAF_TOOLTIP_HOVER_SIZE = 30
const LEAF_TOOLTIP_Y_OFFSET = -30
//
// Poison leaf settings (blue leaves that kill the hero on contact)
//
const POISON_LEAF_CHANCE = 0.4
const POISON_LEAF_COLOR_HEX = '#4488CC'
const POISON_DEATH_RELOAD_DELAY = 0.8
//
// Worm crawling on root level — peristaltic wave locomotion.
// Worms move mostly straight with large-radius arcs.
// Body contracts ~30% during wave, never bunching into a cluster.
//
const WORM_BASE_Y = FLOOR_Y + 30
const WORM_DRAW_Z = 17
const WORM_SEGMENT_COUNT = 12
const WORM_SEGMENT_RADIUS = 2.5
const WORM_REST_SPACING = 4.0
const WORM_WAVE_SPEED = 0.3
const WORM_HEAD_SPEED = 3.5
const WORM_FOLLOW_SPEED = 6
const WORM_STEER_SPEED = 0.4
const WORM_STEER_AMPLITUDE = 0.15
const WORM_DIRECTION_CHANGE_MIN = 10
const WORM_DIRECTION_CHANGE_RANGE = 20
const WORM_WAVE_DELAY = 0.4
const WORM_CONTRACT_MIN = 0.7
const WORM_CONTRACT_MAX = 1.0
const WORM_MAX_STRETCH = 1.2
const WORM_BULGE_AMOUNT = 0.85
const WORM_TRAIL_FADE_SPEED = 0.00035
const WORM_TRAIL_MAX_POINTS = 420
const WORM_TRAIL_COLOR = '#060806'
const WORM_BODY_COLOR = '#6E4538'
const WORM_HEAD_COLOR = '#8B5E48'
const WORM_VENTRAL_HIGHLIGHT = '#A07868'
const WORM_SEGMENT_RING_OPACITY = 0.42
const WORM_EYE_RADIUS = 1.4
const WORM_PUPIL_RADIUS = 0.7
const WORM_EYE_SPACING = 2.0
const WORM_COUNT = 3
const WORM_Y_ZONE_HEIGHT = 15
//
// Small worm hover tooltips
//
const WORM_HOVER_WIDTH = 50
const WORM_HOVER_HEIGHT = 30
const WORM_TOOLTIP_OFFSET_Y = -28
const SMALL_WORM_PHRASES = [
  "you should see\nmy dad",
  "I'm just a\nbaby noodle",
  "do worms have\nfeelings? yes."
]
//
// Life icon flash/particle effects on death
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
// First tree trunk tooltip (note name hint)
//
const FIRST_TREE_TOOLTIP_TEXT = "C"
const FIRST_TREE_TOOLTIP_HOVER_WIDTH = 40
const FIRST_TREE_TOOLTIP_EXTRA_HEIGHT = 80
const FIRST_TREE_TOOLTIP_Y_OFFSET = -60
//
// Anti-hero tooltip (shown while gray/inactive)
//
const ANTIHERO_TOOLTIP_TEXT = "wait... do I know you?\nyou look familiar"
const ANTIHERO_TOOLTIP_HOVER_SIZE = 80
const ANTIHERO_TOOLTIP_Y_OFFSET = -70
//
// Antihero timed hints (shown if player hasn't solved the melody puzzle)
//
const ANTIHERO_HINT_WAIT_DELAY = 30
const ANTIHERO_HINT_WAIT_TEXT = "I'm waiting for you here"
const ANTIHERO_HINT_NOTES_DELAY = 60
const ANTIHERO_HINT_NOTES_TEXT = "C - Do, D - Re, E - Mi\nplay the trees"
const ANTIHERO_HINT_DISPLAY_TIME = 5
const ANTIHERO_HINT_NOTES_DISPLAY_TIME = 10
const ANTIHERO_HINT_NOTES_REPEAT_INTERVAL = 30
const ANTIHERO_HINT_Y_OFFSET = -140
//
// Giant worm obstacle (emerges from ground left of antihero)
//
const GIANT_WORM_X_OFFSET = 200
//
// Life deduction (level-specific flags and threshold)
//
const LIFE_DEDUCT_THRESHOLD = 10
const LIFE_DEDUCT_FLAG = 'touch.level1TrapAdded'
const LIFE_DEDUCT_VISITED_FLAG = 'touch.level1Visited'
const LIFE_DEDUCT_LEAVES_FLAG = 'touch.level1LeavesActive'

/**
 * Level 1 scene for touch section
 * Basic platform layout with simple obstacles
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel1(k) {
  k.scene("level-touch.1", async () => {
    //
    // Save progress
    //
    set('lastLevel', 'level-touch.1')
    //
    // Set background to match wall color (prevents visible bars at top/bottom)
    //
    k.setBackground(k.rgb(L1_SCENE_BG_R, L1_SCENE_BG_G, L1_SCENE_BG_B))
    //
    // Letterbox outside the scaled game view stays transparent in CSS; pin canvas backing to scene grey.
    //
    k.canvas?.style.setProperty(
      'background-color',
      `rgb(${L1_SCENE_BG_R}, ${L1_SCENE_BG_G}, ${L1_SCENE_BG_B})`,
      'important'
    )
    k.onSceneLeave(() => {
      k.canvas?.style.removeProperty('background-color')
    })
    //
    // Set gravity
    //
    k.setGravity(CFG.game.gravity)
    //
    // Create sound instance
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    //
    // Draw background
    //
    k.onDraw(() => {
      k.drawRect({
        width: k.width(),
        height: k.height(),
        pos: k.vec2(0, 0),
        color: k.rgb(L1_SCENE_BG_R, L1_SCENE_BG_G, L1_SCENE_BG_B)
      })
    })
    //
    // Scrolling clouds: generate configs and add live draw object
    //
    const cloudConfigs = createScrollingCloudConfigs()
    createScrollingClouds(k, cloudConfigs)
    //
    // Create grass/bushes/trees decoration with parallax depth layers
    //
    const grassY = FLOOR_Y - 2
    const playableWidth = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
    const bgColor = { r: L1_SCENE_BG_R, g: L1_SCENE_BG_G, b: L1_SCENE_BG_B }
    //
    // Blend Kaplay RGB colours toward the flat scene fog for distant silhouettes.
    //
    const tintKapRgbTowardBg = (kapRgb, amount) => k.rgb(
      Math.round(kapRgb.r * (1 - amount) + bgColor.r * amount),
      Math.round(kapRgb.g * (1 - amount) + bgColor.g * amount),
      Math.round(kapRgb.b * (1 - amount) + bgColor.b * amount)
    )
    //
    // Create parallax layers (all three layers)
    //
    const layers = []
    const layerConfigs = [
      { name: 'back', colorMix: 0.2, opacity: 1.0, yOffset: 0, scale: 1.5 },      // Tallest, opaque to cover darkened area
      { name: 'middle', colorMix: 0.55, opacity: 1.0, yOffset: -15, scale: 1.0 }, // Medium height, medium contrast
      { name: 'front', colorMix: 1.0, opacity: 0.95, yOffset: -30, scale: 0.6 }   // Shortest, bright colors
    ]
    
    for (let layerIndex = 0; layerIndex < layerConfigs.length; layerIndex++) {
      const config = layerConfigs[layerIndex]
      const colorMix = config.colorMix
      const baseOpacity = config.opacity
      const yOffset = config.yOffset
      const scale = config.scale
      //
      // Interpolate color towards background for distant layers
      // Back layer (layerIndex 0) - monochrome dark
      // Middle layer (layerIndex 1) - dark colored (dark green leaves, dark brown trunk)
      // Front layer (layerIndex 2) - bright colored (bright green leaves, brown trunk, bright green grass)
      //
      const grassBaseR = layerIndex === 2 ? 40 : 50 * colorMix + bgColor.r * (1 - colorMix)
      const grassBaseG = layerIndex === 2 ? 85 : 80 * colorMix + bgColor.g * (1 - colorMix)
      const grassBaseB = layerIndex === 2 ? 40 : 50 * colorMix + bgColor.b * (1 - colorMix)
      
      const bushBaseR = layerIndex === 2 ? 35 : 35 * colorMix + bgColor.r * (1 - colorMix)
      const bushBaseG = layerIndex === 2 ? 70 : 55 * colorMix + bgColor.g * (1 - colorMix)
      const bushBaseB = layerIndex === 2 ? 35 : 35 * colorMix + bgColor.b * (1 - colorMix)
      
      const treeLeafR = layerIndex === 0 ? 12 * colorMix + bgColor.r * (1 - colorMix) : (layerIndex === 1 ? 12 * colorMix + bgColor.r * (1 - colorMix) : 40)
      const treeLeafG = layerIndex === 0 ? 16 * colorMix + bgColor.g * (1 - colorMix) : (layerIndex === 1 ? 16 * colorMix + bgColor.g * (1 - colorMix) : 75)
      const treeLeafB = layerIndex === 0 ? 12 * colorMix + bgColor.b * (1 - colorMix) : (layerIndex === 1 ? 12 * colorMix + bgColor.b * (1 - colorMix) : 40)
      
      const treeTrunkR = layerIndex === 0 ? 10 * colorMix + bgColor.r * (1 - colorMix) : (layerIndex === 1 ? 10 * colorMix + bgColor.r * (1 - colorMix) : 70)
      const treeTrunkG = layerIndex === 0 ? 10 * colorMix + bgColor.g * (1 - colorMix) : (layerIndex === 1 ? 10 * colorMix + bgColor.g * (1 - colorMix) : 50)
      const treeTrunkB = layerIndex === 0 ? 10 * colorMix + bgColor.b * (1 - colorMix) : (layerIndex === 1 ? 10 * colorMix + bgColor.b * (1 - colorMix) : 30)
      //
      // Generate grass blade data for this layer
      // All grass grows from ground level (grassY), not affected by yOffset
      // Back layer most dense (continuous), front layer least dense
      //
      const grassBlades = []
      const clusterBands = layerIndex === 0 ? 26 + Math.floor(Math.random() * 14) : 13 + Math.floor(Math.random() * 10)
      for (let c = 0; c < clusterBands; c++) {
        if (Math.random() < 0.085) continue
        let centerX = LEFT_MARGIN + 50 + Math.random() * (playableWidth - 100)
        let guard = 0
        while (Math.abs(centerX - HERO_SPAWN_X) < 130 && guard < 40) {
          centerX = LEFT_MARGIN + 50 + Math.random() * (playableWidth - 100)
          guard++
        }
        const clusterRadius = (layerIndex === 0 ? 36 : 24) + Math.random() * (layerIndex === 0 ? 110 : 80)
        const bladesInCluster = (layerIndex === 0 ? 6 : 5) + Math.floor(Math.random() * (layerIndex === 0 ? 16 : 14))
        for (let b = 0; b < bladesInCluster; b++) {
          const dist = Math.pow(Math.random(), 1.52) * clusterRadius
          const ang = Math.random() * Math.PI * 2
          const baseX = centerX + Math.cos(ang) * dist * 0.94
          if (baseX < LEFT_MARGIN + 8 || baseX > LEFT_MARGIN + playableWidth - 8) continue
        const height = (10 + Math.random() * 20) * scale
        const bendX = (Math.random() - 0.5) * 6
        const swaySpeed = 0.8 + Math.random() * 0.6
        const swayAmount = (2 + Math.random() * 3) * scale
        const swayOffset = Math.random() * Math.PI * 2
        grassBlades.push({
          x1: baseX,
          y1: grassY,
          baseX2: baseX + bendX,
          y2: grassY - height,
          height: height,
          swaySpeed: swaySpeed,
          swayAmount: swayAmount,
          swayOffset: swayOffset,
          color: k.rgb(
            grassBaseR + Math.random() * 20,
            grassBaseG + Math.random() * 20,
            grassBaseB + Math.random() * 15
          ),
          opacity: baseOpacity + Math.random() * 0.15,
          width: (0.8 + Math.random() * 0.4) * scale
        })
        }
      }
      //
      // Generate bush data for this layer
      // For front layer: don't create bushes separately, will alternate with trees
      //
      const bushes = []
      const bushCount = layerIndex === 2 ? 0 : 0
      
      for (let i = 0; i < bushCount; i++) {
        const spacing = playableWidth / (bushCount + 1)
        const randomness = layerIndex === 0 ? 30 : (layerIndex === 1 ? 60 : 40)
        const bushX = LEFT_MARGIN + spacing * (i + 1) + (Math.random() - 0.5) * randomness
        const baseBushSize = (40 + Math.random() * 60) * scale
        
        const bush = {
          x: bushX,
          y: grassY + yOffset - baseBushSize / 2,
          size: baseBushSize,
          color: k.rgb(
            bushBaseR + Math.random() * 15,
            bushBaseG + Math.random() * 15,
            bushBaseB + Math.random() * 10
          ),
          opacity: baseOpacity + Math.random() * 0.1
        }
        
        bushes.push(bush)
      }
      //
      // Generate tree data for this layer
      // For front layer: create both trees and bushes in alternating pattern
      //
      const trees = []
      const treeCount = layerIndex === 0 ? 18 : (layerIndex === 1 ? L1_MIDDLE_ORGANIC_TREE_COUNT : 0)
      
      for (let i = 0; i < treeCount; i++) {
        //
        // Mid-distance organic canopy — procedural twin of touch L0, dimmed so front stays brightest.
        //
        if (layerIndex === 1) {
          const spacing = playableWidth / (treeCount + 1)
          const randomness = 48
          const treeX = LEFT_MARGIN + spacing * (i + 1) + (Math.random() - 0.5) * randomness
          const baseTreeHeight = (105 + Math.random() * 135) * scale
          const crownCenterY = grassY + yOffset - baseTreeHeight
          const trunkBottom = grassY
          const trunkActualHeight = baseTreeHeight * (0.55 + Math.random() * 0.1)
          const trunkTop = trunkBottom - trunkActualHeight
          const trunkWidth = (5 + Math.random() * 3) * scale
          const organic = OrganicParallax.buildOrganicTreeData(trunkBottom, trunkTop, {
            rootAbsoluteMaxY: CFG.visual.screen.height - 6,
            includeRoots: false
          })
          const palette = OrganicParallax.buildTreePalette()
          const tree = {
            x: treeX,
            y: grassY + yOffset,
            trunkTop,
            trunkBottom,
            trunkHeight: trunkActualHeight,
            trunkWidth,
            crownCenterY,
            crowns: [],
            trunkSegments: organic.trunkSegments,
            rootSegments: organic.rootSegments,
            branchClusters: organic.branchClusters,
            trunkColor: k.rgb(palette.trunk.r, palette.trunk.g, palette.trunk.b),
            leafColor: k.rgb(120, 90, 40),
            opacity: baseOpacity + Math.random() * 0.08,
            swaySpeed: 0,
            swayAmount: 0,
            swayOffset: 0
          }
          OrganicParallax.dimOrganicTreeColors(tree, L1_MIDDLE_ORGANIC_COLOR_DIM)
          OrganicParallax.blendOrganicTowardBackground(tree, bgColor, L1_MIDDLE_GREYWASH)
          trees.push(tree)
          continue
        }
        const spacing = playableWidth / (treeCount - 1)
        const randomness = layerIndex === 0 ? 20 : 25
        const treeX = LEFT_MARGIN + spacing * i + (Math.random() - 0.5) * randomness
        const baseTreeHeight = (120 + Math.random() * 100) * scale
        const crownCenterY = grassY + yOffset - baseTreeHeight
        const trunkTop = crownCenterY
        const trunkBottom = grassY
        const trunkHeight = trunkBottom - trunkTop
        const trunkWidth = layerIndex === 0 ? (4 + Math.random() * 4) * scale : (6 + Math.random() * 6) * scale
        const crownSize = (50 + Math.random() * 60) * scale
        
        const crownCount = layerIndex === 0 ? 5 + Math.floor(Math.random() * 4) : 3 + Math.floor(Math.random() * 3)
        const crowns = []
        
        for (let j = 0; j < crownCount; j++) {
          crowns.push({
            offsetX: (Math.random() - 0.5) * crownSize * (layerIndex === 0 ? 0.7 : 0.5),
            offsetY: (Math.random() - 0.5) * crownSize * (layerIndex === 0 ? 0.5 : 0.4),
            sizeVariation: layerIndex === 0 ? 0.6 + Math.random() * 0.6 : 0.8 + Math.random() * 0.5,
            opacityVariation: layerIndex === 0 ? 0.7 + Math.random() * 0.2 : 0.85 + Math.random() * 0.15
          })
        }
        
        const tree = {
          x: treeX,
          y: grassY + yOffset,
          trunkTop: trunkTop,
          trunkBottom: trunkBottom,
          trunkHeight: trunkHeight,
          trunkWidth: trunkWidth,
          crownSize: crownSize,
          crownCenterY: crownCenterY,
          crowns: crowns,
          trunkColor: k.rgb(
            treeTrunkR,
            treeTrunkG,
            treeTrunkB
          ),
          leafColor: k.rgb(
            treeLeafR,
            treeLeafG,
            treeLeafB
          ),
          opacity: layerIndex === 0 ? 0.85 + Math.random() * 0.1 : baseOpacity,
          swaySpeed: 0.2 + Math.random() * 0.15,
          swayAmount: (1 + Math.random() * 1.5) * scale,
          swayOffset: Math.random() * Math.PI * 2
        }
        if (layerIndex === 0) {
          const depthBlend = Math.random() < 0.52 ? L1_BACK_ROW_FAR_BLEND : L1_BACK_ROW_NEAR_BLEND
          tree.trunkColor = tintKapRgbTowardBg(tree.trunkColor, depthBlend)
          tree.leafColor = tintKapRgbTowardBg(tree.leafColor, depthBlend)
        }
        
        trees.push(tree)
      }
      //
      // For front layer: create alternating trees and bushes
      //
      if (layerIndex === 2) {
        const totalElements = 14
        const spacing = playableWidth / (totalElements - 1)
        const TREE_MARGIN = 80
        
        for (let i = 0; i < totalElements; i++) {
          const randomness = 25
          //
          // Limit randomness for first and last elements to prevent overflow
          //
          let randomOffset = (Math.random() - 0.5) * randomness
          //
          // For first element: add extra margin and only allow positive offset
          //
          if (i === 0) {
            randomOffset = Math.max(0, randomOffset) + TREE_MARGIN
          }
          //
          // For last element: subtract extra margin and only allow negative offset
          //
          if (i === totalElements - 1) {
            randomOffset = Math.min(0, randomOffset) - TREE_MARGIN
          }
          
          const posX = LEFT_MARGIN + spacing * i + randomOffset
          //
          // Front canopy is organic-only (same generator as touch L0): rain reads crowns from leaf samples.
          //
          const baseTreeHeight = (175 + Math.random() * 285) * scale
            const crownCenterY = grassY + yOffset - baseTreeHeight
            const trunkBottom = grassY
          const trunkActualHeight = baseTreeHeight * (0.55 + Math.random() * 0.1)
            const trunkTop = trunkBottom - trunkActualHeight
            const trunkWidth = (5 + Math.random() * 3) * scale
          const organic = OrganicParallax.buildOrganicTreeData(trunkBottom, trunkTop, {
            rootAbsoluteMaxY: CFG.visual.screen.height - 6,
            rootSegmentsMin: 10,
            rootSegmentsRange: 16
          })
          const rainCrowns = []
          for (const cluster of organic.branchClusters) {
            for (let l = 0; l < cluster.leaves.length; l += 3) {
              const leaf = cluster.leaves[l]
              const worldLeafX = cluster.pivotX + leaf.x
              const worldLeafY = cluster.pivotY + leaf.y
              rainCrowns.push({ offsetX: worldLeafX, offsetY: worldLeafY - crownCenterY })
            }
          }
          const palette = OrganicParallax.buildTreePalette()
            const tree = {
              x: posX,
              y: grassY + yOffset,
            trunkTop,
            trunkBottom,
            trunkHeight: trunkActualHeight,
            trunkWidth,
            crownCenterY,
            crowns: rainCrowns,
            trunkSegments: organic.trunkSegments,
            rootSegments: organic.rootSegments,
            branchClusters: organic.branchClusters,
            trunkColor: k.rgb(palette.trunk.r, palette.trunk.g, palette.trunk.b),
            rootColor: k.rgb(palette.root.r, palette.root.g, palette.root.b),
            leafColor: k.rgb(120, 90, 40),
              opacity: 0.95,
            swaySpeed: 0,
            swayAmount: 0,
            swayOffset: 0
          }
          OrganicParallax.dimOrganicTreeColors(tree, L1_FRONT_ORGANIC_COLOR_DIM)
          OrganicParallax.blendOrganicTowardBackground(tree, bgColor, L1_FRONT_ORGANIC_GREYWASH)
            trees.push(tree)
        }
      }
      
      layers.push({ grassBlades, bushes, trees, name: config.name })
    }
    //
    // Baked PNGs: back carries distant rows + organic mids; front PNG carries grass + organic trees (static).
    //
    const createBackCanvas = () => {
      const bw = CFG.visual.screen.width
      const bh = CFG.visual.screen.height
      return toCanvas({ width: bw, height: bh, pixelRatio: 1 }, (ctx) => {
        if (layers[0]) {
          drawLayerToCanvas(ctx, layers[0], 0, null)
        }
        if (layers[1]) {
          drawLayerToCanvas(ctx, layers[1], 0, null)
        }
      })
    }
    
    const createFrontStaticCanvas = () => {
      const bw = CFG.visual.screen.width
      const bh = CFG.visual.screen.height
      return toCanvas({ width: bw, height: bh, pixelRatio: 1 }, (ctx) => {
        if (layers[2]) {
          drawLayerToCanvas(ctx, layers[2], 0, null)
        }
      })
    }
    //
    // Helper function to draw layer to canvas
    //
    const drawLayerToCanvas = (ctx, layer, time, skipIndices) => {
      //
      // Draw trees
      //
      for (const tree of layer.trees) {
        const sway = Math.sin(time * tree.swaySpeed + tree.swayOffset) * tree.swayAmount
        //
        // Organic autumn trees (touch L0 style): trunk segments + roots + clusters.
        //
        if (tree.branchClusters && tree.trunkSegments) {
          OrganicParallax.drawOrganicTreeToCanvas(ctx, tree, sway)
          continue
        }
        //
        // Draw trunk
        //
        ctx.fillStyle = `rgba(${tree.trunkColor.r}, ${tree.trunkColor.g}, ${tree.trunkColor.b}, ${tree.opacity})`
        ctx.fillRect(
          tree.x + sway * 0.2 - tree.trunkWidth / 2,
          tree.trunkTop,
          tree.trunkWidth,
          tree.trunkHeight
        )
        //
        // Draw branches
        //
        if (tree.branches) {
          for (const branch of tree.branches) {
            ctx.strokeStyle = `rgba(${tree.trunkColor.r}, ${tree.trunkColor.g}, ${tree.trunkColor.b}, ${tree.opacity})`
            ctx.lineWidth = branch.width
            ctx.beginPath()
            ctx.moveTo(tree.x + branch.startX + sway * 0.2, branch.startY)
            ctx.lineTo(tree.x + branch.endX + sway * 0.3, branch.endY)
            ctx.stroke()
          }
        }
        //
        // Draw crowns
        //
        for (const crown of tree.crowns) {
          const colorShift = crown.colorShift || 0
          const leafR = Math.min(255, tree.leafColor.r + colorShift)
          const leafG = Math.min(255, tree.leafColor.g + colorShift)
          const leafB = Math.min(255, tree.leafColor.b + colorShift)
          
          ctx.fillStyle = `rgba(${leafR}, ${leafG}, ${leafB}, ${tree.opacity * crown.opacityVariation})`
          ctx.beginPath()
          ctx.arc(
            tree.x + crown.offsetX + sway,
            tree.crownCenterY + crown.offsetY,
            tree.crownSize * crown.sizeVariation,
            0,
            Math.PI * 2
          )
          ctx.fill()
        }
      }
      //
      // Draw bushes
      //
      for (const bush of layer.bushes) {
        const time = 0
        const sway = Math.sin(time * bush.swaySpeed + bush.swayOffset) * bush.swayAmount
        
        for (const crown of bush.crowns) {
          const colorShift = crown.colorShift || 0
          const leafR = Math.min(255, bush.color.r + colorShift)
          const leafG = Math.min(255, bush.color.g + colorShift)
          const leafB = Math.min(255, bush.color.b + colorShift)
          
          ctx.fillStyle = `rgba(${leafR}, ${leafG}, ${leafB}, ${bush.opacity * crown.opacityVariation})`
          ctx.beginPath()
          ctx.arc(
            bush.x + crown.offsetX + sway,
            bush.y + crown.offsetY,
            bush.size * crown.sizeVariation * 0.5,
            0,
            Math.PI * 2
          )
          ctx.fill()
        }
      }
    }
    
    const backDataURL = createBackCanvas()
    const frontStaticDataURL = createFrontStaticCanvas()
    loadTouchSprite(k, 'bg-touch-back', backDataURL)
    loadTouchSprite(k, 'bg-touch-front-static', frontStaticDataURL)
    //
    // Draw back canvas: clouds + back trees + middle trees (z=2)
    //
    k.add([
      k.z(2),
      {
        draw() {
          k.drawSprite({
            sprite: 'bg-touch-back',
            pos: k.vec2(0, 0),
            anchor: "topleft"
          })
        }
      }
    ])
    //
    // Draw front static trees canvas (z=7, in front of birds at z=5)
    //
    k.add([
      k.z(7),
      {
        draw() {
          k.drawSprite({
            sprite: 'bg-touch-front-static',
            pos: k.vec2(0, 0),
            anchor: "topleft"
          })
        }
      }
    ])
    const l1Rocks = addTouchSectionFloorRocks(k, {
      floorY: FLOOR_Y,
      leftMargin: LEFT_MARGIN,
      rightMargin: RIGHT_MARGIN,
      drawZ: L1_CROW_ROCK_DRAW_Z,
      spritePrefix: 'rock-l1',
      rockCount: 5,
      excludeCenterX: HERO_SPAWN_X,
      excludeHalfWidth: 125
    })
    //
    // Create birds flying in the background (same realistic silhouette as Touch L0).
    //
    const birds = []
    const BIRD_COUNT = 5
    const SKY_HEIGHT = 400
    const BIRD_FLAP_GLIDE_BLEND_TIME = 0.45
    const BIRD_GLIDE_POSE = 0.45
    
    for (let i = 0; i < BIRD_COUNT; i++) {
      const startX = Math.random() * k.width()
      const startY = TOP_MARGIN + Math.random() * SKY_HEIGHT
      const speed = 40 + Math.random() * 30
      const amplitude = 10 + Math.random() * 20
      const frequency = 0.5 + Math.random() * 1.0
      const phaseOffset = Math.random() * Math.PI * 2
      const timeOffset = Math.random() * 10
      const isTreeColor = Math.random() < 0.5
      //
      // Black birds are bigger (closer), gray birds are smaller (farther)
      //
      const size = isTreeColor ? (4 + Math.random() * 3) : (8 + Math.random() * 6)
      
      const initialFlapping = Math.random() > 0.5
      birds.push({
        x: startX,
        y: startY,
        baseY: startY,
        speed: speed,
        amplitude: amplitude,
        frequency: frequency,
        size: size,
        phaseOffset: phaseOffset,
        timeOffset: timeOffset,
        color: isTreeColor ? k.rgb(36, 37, 36) : k.rgb(5, 5, 5),
        wingPhase: 0,
        isFlapping: initialFlapping,
        flapTimer: Math.random() * 3,
        flapDuration: 0.8 + Math.random() * 0.4,
        glideDuration: 2.0 + Math.random() * 2.0,
        modeBlend: initialFlapping ? 1 : 0
      })
    }
    
    k.add([
      k.z(5),
      {
        draw() {
          const time = k.time()
          const dt = k.dt()
          
          for (const bird of birds) {
            bird.x += bird.speed * dt
            if (bird.x > k.width() + 50) {
              bird.x = -50
              bird.baseY = TOP_MARGIN + Math.random() * SKY_HEIGHT
            }
            bird.y = bird.baseY + Math.sin((time + bird.timeOffset) * bird.frequency + bird.phaseOffset) * bird.amplitude
            bird.flapTimer += dt
            const currentDuration = bird.isFlapping ? bird.flapDuration : bird.glideDuration
            
            if (bird.flapTimer > currentDuration) {
              bird.isFlapping = !bird.isFlapping
              bird.flapTimer = 0
            }
            const targetBlend = bird.isFlapping ? 1 : 0
            const blendStep = dt / BIRD_FLAP_GLIDE_BLEND_TIME
            if (bird.modeBlend < targetBlend) {
              bird.modeBlend = Math.min(targetBlend, bird.modeBlend + blendStep)
            } else if (bird.modeBlend > targetBlend) {
              bird.modeBlend = Math.max(targetBlend, bird.modeBlend - blendStep)
            }
            const flapWave = Math.sin((time + bird.timeOffset) * 8 + bird.phaseOffset)
            const wingFlap = BIRD_GLIDE_POSE + (flapWave - BIRD_GLIDE_POSE) * bird.modeBlend
            bird.wingPhase = wingFlap
            drawRealisticBird(k, bird, wingFlap)
          }
        }
      }
    ])
    //
    // Create dynamic grass drawer with hero interaction
    //
    const allGrassBlades = []
    for (const layer of layers) {
      allGrassBlades.push(...layer.grassBlades)
    }
    
    const grassDrawer = k.add([
      k.z(20),
      {
        heroRef: null,
        draw() {
          const time = k.time()
          const heroX = this.heroRef ? this.heroRef.character.pos.x : -1000
          const heroY = this.heroRef ? this.heroRef.character.pos.y : -1000
          const HERO_RADIUS = 50
          const PUSH_FORCE = 15
          
          for (const blade of allGrassBlades) {
            const baseSway = Math.sin(time * blade.swaySpeed + blade.swayOffset) * blade.swayAmount
            //
            // Check distance to hero
            //
            const dx = blade.x1 - heroX
            const dy = blade.y1 - heroY
            const distance = Math.sqrt(dx * dx + dy * dy)
            //
            // Add push effect if hero is close
            //
            let pushSway = 0
            if (distance < HERO_RADIUS) {
              const pushStrength = (1 - distance / HERO_RADIUS)
              pushSway = (dx / distance) * pushStrength * PUSH_FORCE
            }
            
            k.drawLine({
              p1: k.vec2(blade.x1, blade.y1),
              p2: k.vec2(blade.baseX2 + baseSway + pushSway, blade.y2),
              width: blade.width,
              color: blade.color,
              opacity: blade.opacity
            })
          }
        }
      }
    ])
    //
    // Create walls and boundaries
    //
    // Left wall (full height)
    //
    k.add([
      k.rect(LEFT_MARGIN, CFG.visual.screen.height),
      k.pos(LEFT_MARGIN / 2, CFG.visual.screen.height / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(L1_SCENE_BG_R, L1_SCENE_BG_G, L1_SCENE_BG_B),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Right wall (full height)
    //
    k.add([
      k.rect(RIGHT_MARGIN, CFG.visual.screen.height),
      k.pos(CFG.visual.screen.width - RIGHT_MARGIN / 2, CFG.visual.screen.height / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(L1_SCENE_BG_R, L1_SCENE_BG_G, L1_SCENE_BG_B),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Top wall (full width)
    //
    k.add([
      k.rect(CFG.visual.screen.width, TOP_MARGIN),
      k.pos(CFG.visual.screen.width / 2, TOP_MARGIN / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(L1_SCENE_BG_R, L1_SCENE_BG_G, L1_SCENE_BG_B),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Create rounded corners at all four game area corners
    //
    createRoundedCorners(k)
    //
    // Create level indicator (TOUCH letters)
    //
    //
    // Hero body color: red if word complete, orange if time complete, brown if touch complete, otherwise gray
    //
    const isTouchComplete = get('touch.completed', false)
    const isWordComplete = get('word.completed', false)
    const isTimeComplete = get('time.completed', false)
    const heroBodyColor = isWordComplete ? "#E74C3C" : isTimeComplete ? "#FF8C00" : isTouchComplete ? "#8B5A50" : "#C0C0C0"
    const levelIndicator = LevelIndicator.create({
      k,
      levelNumber: 1,
      activeColor: '#8B5A50',
      inactiveColor: '#808080',
      completedColor: '#8B5A50',
      heroBodyColor,
      topPlatformHeight: TOP_MARGIN,
      sideWallWidth: LEFT_MARGIN
    })
    //
    // Life deduction logic: leaves are paused until deduction animation plays.
    // First visit with eligible score: mark as visited, no deduction yet.
    // Second visit (after death/reload): show deduction and activate leaves.
    //
    const currentLifeScore = get('lifeScore', 0)
    const trapAlreadyAdded = get(LIFE_DEDUCT_FLAG, false)
    const leavesAlreadyActive = get(LIFE_DEDUCT_LEAVES_FLAG, false)
    const alreadyVisited = get(LIFE_DEDUCT_VISITED_FLAG, false)
    const eligible = !trapAlreadyAdded && currentLifeScore >= LIFE_DEDUCT_THRESHOLD
    //
    // Determine whether to show deduction and whether leaves should fall
    //
    let showTrap = false
    let leavesActive = leavesAlreadyActive
    if (eligible && !alreadyVisited) {
      set(LIFE_DEDUCT_VISITED_FLAG, true)
    } else if (eligible && alreadyVisited) {
      showTrap = true
      leavesActive = true
    }
    const trapCountValue = (showTrap || trapAlreadyAdded) ? 1 : 0
    levelIndicator.updateTrapCount(trapCountValue)
    //
    // Scene-level lock: hero controls disabled during life deduction animation
    //
    const sceneLock = { locked: showTrap }
    //
    // Bottom platform (full width) - raised by 200px, but extends to bottom
    //
    k.add([
      k.rect(CFG.visual.screen.width, BOTTOM_MARGIN + 200),
      k.pos(CFG.visual.screen.width / 2, CFG.visual.screen.height - (BOTTOM_MARGIN + 200) / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(L1_SCENE_BG_R, L1_SCENE_BG_G, L1_SCENE_BG_B),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Create anti-hero first (starts gray/inactive)
    //
    const antiHeroInst = Hero.create({
      k,
      x: ANTIHERO_SPAWN_X,
      y: ANTIHERO_SPAWN_Y,
      type: Hero.HEROES.ANTIHERO,
      controllable: false,
      bodyColor: '#B0B0B0',  // Gray color for inactive state
      addArms: true
    })
    
    //
    // Game state for melody puzzle
    //
    const gameState = {
      antiHeroActive: false,
      playerSequence: [],
      targetSequence: [0, 1, 2, 1, 2],  // C, D, E, D, E (tree indices) - exactly 5 notes
      melodyNotes: [261.63, 293.66, 329.63, 293.66, 329.63],  // Frequencies
      isNearAntiHero: false,
      isPlayingMelody: false,
      melodyTimer: 0,
      lastTouchedTreeIndex: -1,  // Track last touched tree to prevent duplicate detection
      sequenceCompleteTime: null,  // Time when sequence was completed (for pause check)
      pauseTimer: 0,  // Timer for tracking pause after sequence completion
      hintTimer: 0,
      hintWaitShown: false,
      hintNotesFirstShown: false,
      hintNotesLastShownAt: 0,
      currentHint: null
    }
    
    //
    // Minimum pause after completing sequence before it's considered valid
    //
    const SEQUENCE_PAUSE_MINIMUM = 1.0  // 1 second
    //
    // Pause before anti-hero starts playing the melody
    //
    const MELODY_PRE_PLAY_DELAY = 1.0  // 1 second
    
    //
    // Note names for display
    //
    const noteNames = ['C', 'D', 'E', 'D', 'E']
    
    //
    // Function to play melody sequence
    //
    function playMelody() {
      if (gameState.isPlayingMelody) return
      
      gameState.isPlayingMelody = true
      gameState.currentNoteIndex = -1
      let noteIndex = 0
      
      const playNextNote = () => {
        if (noteIndex < gameState.melodyNotes.length) {
          //
          // Set current note index before playing
          //
          gameState.currentNoteIndex = noteIndex
          TreeRoots.playNoteExternal(treeRootsInst, gameState.melodyNotes[noteIndex])
          noteIndex++
          
          if (noteIndex < gameState.melodyNotes.length) {
            k.wait(0.6, playNextNote)
          } else {
            k.wait(0.6, () => {
              gameState.isPlayingMelody = false
              gameState.currentNoteIndex = -1
            })
          }
        }
      }
      //
      // Wait before playing the first note so player can see the bubble
      //
      k.wait(MELODY_PRE_PLAY_DELAY, playNextNote)
    }
    
    //
    // Function to create sparkle particles around anti-hero for color change
    //
    function createAntiHeroSparkles(colorHex) {
      const centerX = antiHeroInst.character.pos.x
      const centerY = antiHeroInst.character.pos.y
      //
      // Parse hex color to RGB
      //
      const colorValue = parseInt(colorHex.replace('#', ''), 16)
      const r = (colorValue >> 16) & 0xFF
      const g = (colorValue >> 8) & 0xFF
      const b = colorValue & 0xFF
      //
      // Create small sparkle particles
      //
      const sparkleCount = 12
      const sparkles = []
      
      for (let i = 0; i < sparkleCount; i++) {
        //
        // Position sparkles around anti-hero body
        //
        const angle = (Math.PI * 2 * i) / sparkleCount
        const distance = 15 + Math.random() * 10
        const offsetX = Math.cos(angle) * distance
        const offsetY = Math.sin(angle) * distance
        //
        // Sparkle colors (variations of brown)
        //
        const colors = [
          k.rgb(r, g, b),  // Base brown
          k.rgb(Math.min(255, r + 30), Math.min(255, g + 20), Math.min(255, b + 15)),  // Lighter brown
          k.rgb(Math.max(0, r - 20), Math.max(0, g - 15), Math.max(0, b - 10)),  // Darker brown
          k.rgb(200, 150, 120)  // Light brown
        ]
        const sparkleColor = colors[Math.floor(Math.random() * colors.length)]
        //
        // Create sparkle particle (small circle)
        //
        const size = 2 + Math.random() * 3
        const sparkle = k.add([
          k.circle(size),
          k.pos(centerX + offsetX, centerY + offsetY),
          k.color(sparkleColor),
          k.opacity(0.8),
          k.z(CFG.visual.zIndex.player + 1)
        ])
        //
        // Store sparkle data
        //
        sparkle.vx = (Math.random() - 0.5) * 40
        sparkle.vy = -20 - Math.random() * 30  // Move up
        sparkle.lifetime = 0
        sparkle.maxLifetime = 0.8 + Math.random() * 0.4
        sparkle.originalSize = size
        
        sparkles.push(sparkle)
      }
      //
      // Animate sparkles
      //
      const sparkleInterval = k.onUpdate(() => {
        sparkles.forEach((sparkle) => {
          if (!sparkle.exists()) return
          
          sparkle.lifetime += k.dt()
          //
          // Move sparkle
          //
          sparkle.pos.x += sparkle.vx * k.dt()
          sparkle.pos.y += sparkle.vy * k.dt()
          //
          // Apply gravity
          //
          sparkle.vy -= 80 * k.dt()  // Upward acceleration
          sparkle.vx *= 0.95
          //
          // Fade out
          //
          const progress = sparkle.lifetime / sparkle.maxLifetime
          sparkle.opacity = 0.8 * (1 - progress)
          //
          // Twinkle effect
          //
          const twinkle = Math.sin(sparkle.lifetime * 20) * 0.3 + 0.7
          sparkle.scale = twinkle
          
          if (sparkle.lifetime >= sparkle.maxLifetime) {
            k.destroy(sparkle)
          }
        })
        //
        // Clean up when all sparkles are done
        //
        if (sparkles.every(s => !s.exists())) {
          sparkleInterval.cancel()
        }
      })
    }
    
    //
    // Function to activate anti-hero
    //
    function activateAntiHero() {
      if (gameState.antiHeroActive) return  // Already activated
      
      //
      // Pause before activation to let player realize they succeeded
      //
      k.wait(0.5, () => {
        gameState.antiHeroActive = true
        //
        // Change anti-hero color to brown (active) by reloading sprites
        // This preserves white eyes with black pupils, as eyes are drawn separately
        //
        const activeColor = CFG.visual.colors.antiHero.body  // #8B5A50
        Hero.loadHeroSprites({
          k,
          type: Hero.HEROES.ANTIHERO,
          bodyColor: activeColor,
          outlineColor: CFG.visual.colors.outline,
          addArms: true
        })
        //
        // Update sprite prefix and change character sprite
        //
        const spritePrefix = `antiHero_${activeColor.replace('#', '')}_${CFG.visual.colors.outline.replace('#', '')}_arms`
        const newSpriteName = `${spritePrefix}_0_0`
        
        //
        // Function to apply sprite change
        //
        const applySpriteChange = () => {
          try {
            //
            // Check if sprite exists before using it
            //
            const sprite = k.getSprite(newSpriteName)
            if (sprite) {
              antiHeroInst.character.use(k.sprite(newSpriteName))
              antiHeroInst.spritePrefix = spritePrefix
              antiHeroInst.bodyColor = activeColor
              //
              // Reset color tint to white (no tint) since sprite is already brown
              //
              antiHeroInst.character.color = k.rgb(255, 255, 255)
              
              //
              // Create sparkle particles around anti-hero
              //
              createAntiHeroSparkles(activeColor)
              
              //
              // Play success sound after color change (same as mouth sound)
              //
              k.wait(0.2, () => {
                Sound.playMouthSound(sound)
              })
              
              //
              // Enable annihilation by setting antiHero reference and setting up collision
              //
              heroInst.antiHero = antiHeroInst
              //
              // Set up collision handler for annihilation using Hero's full logic
              //
              heroInst.character.onCollide('annihilation', () => {
                Hero.onAnnihilationCollide(heroInst)
              })
              return true
            }
          } catch (error) {
            //
            // Sprite not found, will retry
            //
          }
          return false
        }
        
        //
        // Wait for sprites to load, then update
        // Try multiple times with increasing delays
        //
        k.wait(0.1, () => {
          if (!applySpriteChange()) {
            //
            // Retry after longer delay
            //
            k.wait(0.2, () => {
              if (!applySpriteChange()) {
                //
                // Fallback: use tint method if sprite loading fails
                //
                const brownR = 139  // #8B5A50
                const brownG = 90
                const brownB = 80
                const grayR = 176  // #B0B0B0
                const grayG = 176
                const grayB = 176
                const tintR = Math.round((brownR / grayR) * 255)
                const tintG = Math.round((brownG / grayG) * 255)
                const tintB = Math.round((brownB / grayB) * 255)
                antiHeroInst.character.color = k.rgb(
                  Math.min(255, Math.max(0, tintR)),
                  Math.min(255, Math.max(0, tintG)),
                  Math.min(255, Math.max(0, tintB))
                )
                createAntiHeroSparkles(activeColor)
                k.wait(0.2, () => {
                  Sound.playMouthSound(sound)
                })
                //
                // Enable annihilation by setting antiHero reference and setting up collision
                //
                heroInst.antiHero = antiHeroInst
                //
                // Set up collision handler for annihilation using Hero's full logic
                //
                heroInst.character.onCollide('annihilation', () => {
                  Hero.onAnnihilationCollide(heroInst)
                })
              }
            })
          }
        })
      })
    }
    
    //
    // No need to set gray color - it's already set via bodyColor parameter
    //
    
    //
    // Create hero with anti-hero reference
    //
    const heroInst = Hero.create({
      k,
      x: HERO_SPAWN_X,
      y: HERO_SPAWN_Y,
      type: Hero.HEROES.HERO,
      controllable: true,
      sfx: sound,
      antiHero: gameState.antiHeroActive ? antiHeroInst : null,
      onAnnihilation: () => {
        //
        // Check for speed bonus before scoring
        //
        const levelTime = FpsCounter.getLevelTime(fpsCounter)
        const speedBonusEarned = checkSpeedBonus(levelTime)
        const currentScore = get('heroScore', 0)
        const pointsToAdd = speedBonusEarned ? 3 : 1
        const newScore = currentScore + pointsToAdd
        set('heroScore', newScore)
        levelIndicator?.updateHeroScore?.(newScore)
        sound && Sound.playVictorySound(sound)
        speedBonusEarned && playSpeedBonusEffects(k, levelIndicator)
        const transitionDelay = speedBonusEarned ? 2.3 : 1.3
        k.wait(transitionDelay, () => {
        createLevelTransition(k, 'level-touch.1', () => {
          k.go('level-touch.2')
          })
        })
      },
      currentLevel: 'level-touch.1',
      addMouth: isWordComplete,
      addArms: isTouchComplete,
      bodyColor: heroBodyColor
    })
    //
    // Lock hero controls while life deduction animation plays
    //
    if (sceneLock.locked) {
      heroInst.controlsDisabled = true
      sceneLock.heroInst = heroInst
    }
    //
    // Show life deduction animation if eligible on second visit
    //
    if (showTrap) {
      LifeDeduction.show({
        k,
        currentScore: currentLifeScore,
        levelIndicator,
        sound,
        deductFlag: LIFE_DEDUCT_FLAG,
        extraFlags: [LIFE_DEDUCT_LEAVES_FLAG],
        sceneLock,
        sceneBgRgb: { r: L1_SCENE_BG_R, g: L1_SCENE_BG_G, b: L1_SCENE_BG_B },
        onComplete: () => {
          fallingLeafInst.poisonChance = POISON_LEAF_CHANCE
        }
      })
    }
    //
    // Spawn hero and anti-hero
    //
    Hero.spawn(heroInst)
    Hero.spawn(antiHeroInst)
    //
    // Allow hero to jump when standing on the antihero's head
    //
    antiHeroInst.character.use(CFG.game.platformName)
    //
    // Hidden bonus hero to the left and above antihero
    // Reachable by jumping from the antihero's platform area
    //
    const BONUS_X = ANTIHERO_SPAWN_X - 100
    const BONUS_Y = ANTIHERO_SPAWN_Y - 100
    BonusHero.create({
      k,
      x: BONUS_X,
      y: BONUS_Y,
      width: 80,
      heroInst,
      levelIndicator,
      sfx: sound,
      approachFromAbove: true,
      heroBodyColor,
      storageKey: 'touch.level1BonusCollected'
    })
    //
    // Set hero reference for grass drawer
    //
    grassDrawer.heroRef = heroInst
    //
    // Create tree roots (async - wait for sprites to load)
    //
    const treeRootsInst = await TreeRoots.create({
      k,
      floorY: FLOOR_Y,
      leftMargin: LEFT_MARGIN,
      rightMargin: RIGHT_MARGIN,
      screenWidth: CFG.visual.screen.width
    })
    //
    // Add custom drawing for tree roots (above platform z=15, but behind player z=10)
    // Set z=16 so roots draw on top of platform
    //
    k.add([
      k.z(16),
      {
        draw() {
          TreeRoots.draw(treeRootsInst)
        }
      }
    ])
    //
    // White root glow overlay: blinking sprite on top of roots during note play
    //
    k.add([
      k.z(17),
      {
        draw() {
          TreeRoots.drawGlow(treeRootsInst)
        }
      }
    ])
    //
    // Worms crawling along the root level leaving dark trails
    //
    const wormInsts = []
    for (let i = 0; i < WORM_COUNT; i++) {
      wormInsts.push(createWorm(k, i))
    }
    //
    // Tooltips on small worms: each has a unique funny English phrase.
    // Position tracked dynamically via getter functions.
    //
    const wormTooltipTargets = wormInsts.map((wormInst, i) => ({
      x: () => wormInst.segments[0].x,
      y: () => wormInst.segments[0].y,
      width: WORM_HOVER_WIDTH,
      height: WORM_HOVER_HEIGHT,
      text: SMALL_WORM_PHRASES[i % SMALL_WORM_PHRASES.length],
      offsetY: WORM_TOOLTIP_OFFSET_Y
    }))
    Tooltip.create({ k, targets: wormTooltipTargets })
    //
    // Giant worm obstacle: emerges from the ground left of the antihero
    //
    const giantWormInst = GiantWorm.create({
      k,
      x: ANTIHERO_SPAWN_X - GIANT_WORM_X_OFFSET,
      floorY: FLOOR_Y,
      hero: heroInst,
      sfx: sound
    })
    //
    // Tooltip on the giant worm (dynamic position tracks the worm body)
    //
    const WORM_TOOLTIP_TEXT = "come closer,\ndon't be afraid"
    const WORM_TOOLTIP_WIDTH = 60
    const WORM_TOOLTIP_HEIGHT = 80
    const wormTooltipTarget = {
      x: giantWormInst.x,
      y: FLOOR_Y - 40,
      width: WORM_TOOLTIP_WIDTH,
      height: WORM_TOOLTIP_HEIGHT,
      text: WORM_TOOLTIP_TEXT,
      offsetY: -90
    }
    Tooltip.create({ k, targets: [wormTooltipTarget] })
    k.onUpdate(() => {
      wormTooltipTarget.y = FLOOR_Y - giantWormInst.riseAmount / 2
      wormTooltipTarget.x = giantWormInst.x + (giantWormInst.leanOffset || 0)
      wormTooltipTarget.height = Math.max(10, giantWormInst.riseAmount)
    })
    //
    // Tooltip on first tree trunk (note "C")
    //
    const firstRoot = treeRootsInst.roots[0]
    const firstTrunkVisualHeight = firstRoot.trunkBottom.y - firstRoot.trunkTop.y + FIRST_TREE_TOOLTIP_EXTRA_HEIGHT
    const firstTrunkCenterY = firstRoot.trunkBottom.y - firstTrunkVisualHeight / 2
    Tooltip.create({
      k,
      targets: [{
        x: firstRoot.x,
        y: firstTrunkCenterY,
        width: FIRST_TREE_TOOLTIP_HOVER_WIDTH,
        height: firstTrunkVisualHeight,
        text: FIRST_TREE_TOOLTIP_TEXT,
        offsetY: FIRST_TREE_TOOLTIP_Y_OFFSET
      }]
    })
    //
    // Create falling leaves system (leaves detach from TreeRoots trees).
    // 40% of leaves are poisonous (blue) and kill the hero on contact.
    // Leaves are paused until life deduction animation completes.
    //
    const poisonColor = getRGB(k, POISON_LEAF_COLOR_HEX)
    const fallingLeafInst = FallingLeaf.create({
      k,
      treeRoots: treeRootsInst,
      floorY: FLOOR_Y,
      hero: heroInst,
      leftBound: LEFT_MARGIN,
      rightBound: CFG.visual.screen.width - RIGHT_MARGIN,
      poisonChance: leavesActive ? POISON_LEAF_CHANCE : 0,
      poisonColor,
      onPoisonHit: () => onPoisonLeafDeath(k, heroInst, levelIndicator),
      onLeafGroundLand: () => Sound.playLeafGroundRustle(sound, 0.16 + Math.random() * 0.14)
    })
    //
    // Normal leaves always fall; poison (blue) leaves only after deduction
    //
    fallingLeafInst.paused = false
    //
    // Create bugs (obstacles)
    //
    //
    // Bug 1: Patrol on floor
    //
    Bugs.create({
      k,
      x: LEFT_MARGIN + 350,
      y: FLOOR_Y - 40,
      patrolStart: LEFT_MARGIN + 250,
      patrolEnd: CFG.visual.screen.width - RIGHT_MARGIN - 250,
      speed: 80
    })
    //
    // Create FPS counter
    //
    const fpsCounter = FpsCounter.create({
      k,
      showTimer: true,
      targetTime: CFG.gameplay.speedBonusTime
        ? CFG.gameplay.speedBonusTime['level-touch.1']
        : null
    })
    //
    // Update FPS counter and check tree collisions
    //
    k.onUpdate(() => {
      FpsCounter.onUpdate(fpsCounter)
      //
      // Update tree shake animations
      //
      TreeRoots.onUpdate(treeRootsInst)
      //
      // Update falling leaves (spawn, fall, ground interaction)
      //
      FallingLeaf.onUpdate(fallingLeafInst)
      //
      // Giant worm collision: hero dies if overlapping any visible part of the body
      //
      if (!heroInst.isDying && heroInst.character?.pos && giantWormInst.riseAmount > 0) {
        checkGiantWormCollision(k, heroInst, giantWormInst, levelIndicator)
      }
      
      //
      // Update pause timer if sequence was completed
      //
      if (gameState.sequenceCompleteTime !== null) {
        gameState.pauseTimer += k.dt()
        
        //
        // Check if pause is sufficient and activate anti-hero
        //
        if (gameState.pauseTimer >= SEQUENCE_PAUSE_MINIMUM) {
          //
          // Pause was sufficient - activate anti-hero
          //
          try {
            activateAntiHero()
            gameState.sequenceCompleteTime = null
            gameState.pauseTimer = 0
          } catch (error) {
            //
            // If activation fails, reset
            //
            gameState.sequenceCompleteTime = null
            gameState.pauseTimer = 0
          }
        }
      }
      
      //
      // Check if hero is touching tree trunks
      //
      const touchedTreeIndex = TreeRoots.checkHeroTreeCollision(treeRootsInst, heroInst.character)
      
      //
      // Track when player stops touching a tree to allow re-touching the same tree
      //
      if (touchedTreeIndex === -1 && gameState.lastTouchedTreeIndex !== -1) {
        //
        // Player stopped touching a tree - reset to allow touching the same tree again
        //
        gameState.lastTouchedTreeIndex = -1
      }
      
      //
      // If a tree was touched, add to player sequence
      // Check sequence regardless of proximity to anti-hero
      //
      if (touchedTreeIndex !== -1 && !gameState.antiHeroActive) {
        //
        // Prevent processing the same touch event multiple times
        // If same tree is touched twice in a row, reset sequence
        //
        if (touchedTreeIndex === gameState.lastTouchedTreeIndex) {
          //
          // Same tree touched twice - reset sequence
          //
          gameState.playerSequence = []
          gameState.lastTouchedTreeIndex = -1
          gameState.sequenceCompleteTime = null
          gameState.pauseTimer = 0
          return
        }
        
        //
        // Check if sequence was recently completed - if pause is too short, reset
        //
        if (gameState.sequenceCompleteTime !== null) {
          if (gameState.pauseTimer < SEQUENCE_PAUSE_MINIMUM) {
            //
            // Pause is too short - reset sequence
            //
            gameState.playerSequence = []
            gameState.sequenceCompleteTime = null
            gameState.pauseTimer = 0
            gameState.lastTouchedTreeIndex = -1
            return
          }
          //
          // Pause is sufficient - clear the completion time
          //
          gameState.sequenceCompleteTime = null
          gameState.pauseTimer = 0
        }
        
        const currentSequence = gameState.playerSequence
        const targetSequence = gameState.targetSequence
        const firstNoteIndex = targetSequence[0]  // First note must be this index (0)
        
        //
        // Algorithm:
        // 1. If sequence is empty, only accept first note (0) to start
        // 2. Current sequence must match a subarray of target sequence starting from the same note
        // 3. Check if next note matches expected note from target sequence
        // 4. If wrong note - reset and wait for note 0
        // 5. If sequences match completely and 2 seconds passed - activate
        //
        
        //
        // Step 1: If sequence is empty, only accept first note (0)
        //
        if (currentSequence.length === 0) {
          if (touchedTreeIndex !== firstNoteIndex) {
            //
            // Wrong first note - ignore it, wait for correct first note
            //
            gameState.lastTouchedTreeIndex = -1
            return
          }
        }
        
        //
        // Step 2: Find where current sequence matches in target sequence
        // Current sequence must match a subarray starting from position where first note matches
        //
        let matchingStartPosition = -1
        
        if (currentSequence.length > 0) {
          //
          // Find position in target sequence where current sequence starts
          // It must start from a position where first note matches
          //
          const firstNote = currentSequence[0]
          for (let i = 0; i <= targetSequence.length - currentSequence.length; i++) {
            if (targetSequence[i] === firstNote) {
              //
              // Check if current sequence matches from this position
              //
              let matches = true
              for (let j = 0; j < currentSequence.length; j++) {
                if (targetSequence[i + j] !== currentSequence[j]) {
                  matches = false
                  break
                }
              }
              if (matches) {
                matchingStartPosition = i
                break
              }
            }
          }
        } else {
          //
          // Sequence is empty, will start from position 0
          //
          matchingStartPosition = 0
        }
        
        //
        // Step 3: Check if next note matches expected note from target sequence
        //
        if (matchingStartPosition === -1) {
          //
          // Current sequence doesn't match any part of target sequence
          // Reset and wait for first note (0)
          //
          gameState.playerSequence = []
          gameState.lastTouchedTreeIndex = -1
          gameState.sequenceCompleteTime = null
          gameState.pauseTimer = 0
          //
          // If touched note is first note (0), we can start new sequence
          //
          if (touchedTreeIndex !== firstNoteIndex) {
            return
          }
          //
          // If it's first note, set matching position to 0 and continue
          //
          matchingStartPosition = 0
        }
        
        //
        // Check if next note matches expected note
        //
        const nextPosition = matchingStartPosition + currentSequence.length
        
        //
        // Only check expected note if we haven't reached the end of target sequence
        //
        if (nextPosition >= targetSequence.length) {
          //
          // Sequence is already complete - reset
          //
          gameState.playerSequence = []
          gameState.lastTouchedTreeIndex = -1
          gameState.sequenceCompleteTime = null
          gameState.pauseTimer = 0
          //
          // If touched note is first note (0), we can start new sequence
          //
          if (touchedTreeIndex !== firstNoteIndex) {
            return
          }
          //
          // If it's first note, continue to add it
          //
        } else {
          const expectedNote = targetSequence[nextPosition]
          
          //
          // Step 4: If wrong note - reset and wait for note 0
          //
          if (touchedTreeIndex !== expectedNote) {
            //
            // Wrong note - reset sequence and wait for first note (0)
            //
            gameState.playerSequence = []
            gameState.lastTouchedTreeIndex = -1
            gameState.sequenceCompleteTime = null
            gameState.pauseTimer = 0
            //
            // If wrong note was first note (0), we can start new sequence
            // Otherwise, ignore and wait for first note
            //
            if (touchedTreeIndex !== firstNoteIndex) {
              return
            }
            //
            // If it's first note, continue to add it below
            //
          }
        }
        
        //
        // All checks passed - add note to sequence
        //
        gameState.playerSequence.push(touchedTreeIndex)
        gameState.lastTouchedTreeIndex = touchedTreeIndex
        
        //
        // Step 5: Check if sequences match completely
        //
        const newSequence = gameState.playerSequence
        const newLength = newSequence.length
        
        //
        // Check if current sequence matches target sequence exactly
        //
        if (newLength === targetSequence.length) {
          let exactMatch = true
          for (let i = 0; i < targetSequence.length; i++) {
            if (newSequence[i] !== targetSequence[i]) {
              exactMatch = false
              break
            }
          }
          
          if (exactMatch) {
            //
            // Sequences match completely! Record completion time
            // Don't clear sequence yet - wait for 2 second pause
            //
            gameState.sequenceCompleteTime = k.time()
            gameState.pauseTimer = 0  // Start pause timer
          } else {
            //
            // Sequence length matches but content doesn't - reset
            //
            gameState.playerSequence = []
            gameState.lastTouchedTreeIndex = -1
            gameState.sequenceCompleteTime = null
            gameState.pauseTimer = 0
          }
        }
      } else {
        //
        // No tree touched or anti-hero already active - reset touch tracking
        //
        gameState.lastTouchedTreeIndex = -1
      }
      
      //
      // Check collision with anti-hero to trigger melody (actual touch)
      //
      if (heroInst.character && antiHeroInst.character) {
        //
        // Check if characters are actually touching (collision distance)
        //
        const dx = heroInst.character.pos.x - antiHeroInst.character.pos.x
        const dy = heroInst.character.pos.y - antiHeroInst.character.pos.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const touchDistance = 50  // Characters must be within 50 pixels to trigger
        
        const wasNear = gameState.isNearAntiHero
        gameState.isNearAntiHero = distance < touchDistance
        
        //
        // If just got near (wasn't near before, now near), play melody
        //
        if (gameState.isNearAntiHero && !wasNear && !gameState.antiHeroActive) {
          playMelody()
        }
      }
      //
      // Timed hints from anti-hero while melody puzzle is unsolved
      //
      onUpdateAntiHeroHints(k, gameState, antiHeroInst)
    })
    
    //
    // Draw speech bubble with notes
    //
    k.add([
      k.z(CFG.visual.zIndex.ui),
      {
        draw() {
          //
          // Only show bubble when near anti-hero or playing melody
          //
          if (!gameState.isNearAntiHero && !gameState.isPlayingMelody) return
          if (gameState.antiHeroActive) return  // Hide after activation
          
          let bubbleX = antiHeroInst.character.pos.x
          const bubbleY = antiHeroInst.character.pos.y - 100
          
          //
          // Draw speech bubble background (larger for better readability)
          //
          const bubbleWidth = 280
          const bubbleHeight = 120  // Increased height for text
          const cornerRadius = 10
          const outlineWidth = 3
          
          //
          // Adjust bubble position to stay within screen bounds
          //
          const screenWidth = k.width()
          const screenHeight = k.height()
          const margin = 20  // Additional margin from screen edges
          const screenRight = screenWidth - margin
          const screenLeft = margin
          const bubbleRight = bubbleX + bubbleWidth / 2 + outlineWidth
          const bubbleLeft = bubbleX - bubbleWidth / 2 - outlineWidth
          
          //
          // Shift left if bubble goes off right edge
          //
          if (bubbleRight > screenRight) {
            bubbleX = screenRight - bubbleWidth / 2 - outlineWidth
          }
          //
          // Shift right if bubble goes off left edge
          //
          if (bubbleLeft < screenLeft) {
            bubbleX = screenLeft + bubbleWidth / 2 + outlineWidth
          }
          //
          // Also check top boundary (don't let bubble go above screen)
          //
          const bubbleTop = bubbleY - bubbleHeight / 2 - outlineWidth
          if (bubbleTop < margin) {
            // If bubble would go above screen, move it down
            // (but this shouldn't happen normally)
          }
          
          //
          // Draw outline (slightly larger rectangle)
          //
          k.drawRect({
            pos: k.vec2(bubbleX - bubbleWidth / 2 - outlineWidth, bubbleY - bubbleHeight / 2 - outlineWidth),
            width: bubbleWidth + outlineWidth * 2,
            height: bubbleHeight + outlineWidth * 2,
            radius: cornerRadius + outlineWidth,
            color: k.rgb(0, 0, 0),
            opacity: 0.96
          })
          
          //
          // Draw white background
          //
          k.drawRect({
            pos: k.vec2(bubbleX - bubbleWidth / 2, bubbleY - bubbleHeight / 2),
            width: bubbleWidth,
            height: bubbleHeight,
            radius: cornerRadius,
            color: k.rgb(255, 255, 255),
            opacity: 0.98
          })
          
          //
          // Draw request text above notes
          //
          k.drawText({
            text: 'play this:',
            pos: k.vec2(bubbleX, bubbleY - 35),
            size: 18,
            font: CFG.visual.fonts.regularFull,
            color: k.rgb(40, 40, 40),
            anchor: 'center'
          })
          
          //
          // Draw notes (larger and more visible)
          //
          const noteSpacing = 50
          const startX = bubbleX - (gameState.targetSequence.length - 1) * noteSpacing / 2
          
          gameState.targetSequence.forEach((noteIndex, i) => {
            const noteX = startX + i * noteSpacing
            const noteY = bubbleY + 10  // Moved down a bit to make room for text
            
            //
            // Highlight current note if melody is playing
            //
            const isCurrentNote = gameState.isPlayingMelody && i === gameState.currentNoteIndex
            
            //
            // Draw note circle with black outline
            //
            const circleRadius = isCurrentNote ? 20 : 18
            const outlineWidth = 2
            
            //
            // Draw black outline circle
            //
            k.drawCircle({
              pos: k.vec2(noteX, noteY),
              radius: circleRadius + outlineWidth,
              color: k.rgb(0, 0, 0),
              opacity: 1.0
            })
            
            //
            // Draw circle - dark green when current note is playing, gray otherwise
            //
            k.drawCircle({
              pos: k.vec2(noteX, noteY),
              radius: circleRadius,
              color: isCurrentNote ? k.rgb(80, 130, 80) : k.rgb(120, 120, 120),
              opacity: 1.0
            })
            
            //
            // Draw note name (moved down by 1 pixel)
            //
            k.drawText({
              text: noteNames[i],
              pos: k.vec2(noteX, noteY + 1),
              size: isCurrentNote ? 24 : 20,
              font: CFG.visual.fonts.regularFull,
              color: k.rgb(255, 255, 255),
              anchor: 'center'
            })
          })
        }
      }
    ])
    //
    // Create level transition for next level
    //
    const transition = createLevelTransition(k)
    //
    // Rain: very light rain (25% of default intensity)
    //
    const frontTrees = layers[2] ? layers[2].trees : []
    Rain.create({
      k,
      topY: TOP_MARGIN,
      floorY: FLOOR_Y,
      leftX: LEFT_MARGIN,
      rightX: CFG.visual.screen.width - RIGHT_MARGIN,
      heroInst,
      antiHeroInst,
      trees: frontTrees,
      intensity: RAIN_INTENSITY
    })
    //
    // Fireflies: small glowing dots drifting between tree layers
    //
    createFireflies(k, heroInst)
    //
    // Tooltip: hero (tracks hero position dynamically)
    //
    Tooltip.create({
      k,
      targets: [{
        x: () => heroInst.character.pos.x,
        y: () => heroInst.character.pos.y,
        width: HERO_TOOLTIP_HOVER_SIZE,
        height: HERO_TOOLTIP_HOVER_SIZE,
        text: HERO_TOOLTIP_TEXT,
        offsetY: HERO_TOOLTIP_Y_OFFSET
      }]
    })
    //
    // Tooltip: TOUCH indicator letters (top-left corner)
    //
    const touchLettersCenterX = LEFT_MARGIN + 40 + TOUCH_INDICATOR_TOOLTIP_WIDTH / 2
    const touchLettersCenterY = TOP_MARGIN / 2
    Tooltip.create({
      k,
      targets: [{
        x: touchLettersCenterX,
        y: touchLettersCenterY,
        width: TOUCH_INDICATOR_TOOLTIP_WIDTH,
        height: TOUCH_INDICATOR_TOOLTIP_HEIGHT,
        text: TOUCH_INDICATOR_TOOLTIP_TEXT,
        offsetY: TOUCH_INDICATOR_TOOLTIP_Y_OFFSET
      }]
    })
    //
    // Tooltip: green timer (appears below, positioned at FPS counter row)
    //
    Tooltip.create({
      k,
      targets: [{
        x: k.width() / 2 + 140,
        y: FPS_COUNTER_TOP_Y,
        width: GREEN_TIMER_TOOLTIP_WIDTH,
        height: GREEN_TIMER_TOOLTIP_HEIGHT,
        text: GREEN_TIMER_TOOLTIP_TEXT,
        offsetY: GREEN_TIMER_TOOLTIP_Y_OFFSET,
        forceBelow: true
      }]
    })
    //
    // Tooltip: small hero icon (score) - appears below
    //
    Tooltip.create({
      k,
      targets: [{
        x: levelIndicator.smallHero.character.pos.x,
        y: levelIndicator.smallHero.character.pos.y,
        width: SMALL_HERO_TOOLTIP_SIZE,
        height: SMALL_HERO_TOOLTIP_SIZE,
        text: SMALL_HERO_TOOLTIP_TEXT,
        offsetY: SMALL_HERO_TOOLTIP_Y_OFFSET,
        forceBelow: true
      }]
    })
    //
    // Tooltip: life icon - appears below
    //
    Tooltip.create({
      k,
      targets: [{
        x: levelIndicator.lifeImage.pos.x,
        y: levelIndicator.lifeImage.pos.y,
        width: LIFE_TOOLTIP_SIZE,
        height: LIFE_TOOLTIP_SIZE,
        text: LIFE_TOOLTIP_TEXT,
        offsetY: LIFE_TOOLTIP_Y_OFFSET,
        forceBelow: true
      }]
    })
    //
    // Tooltip: anti-hero (shown only while gray/inactive, hidden once activated)
    //
    Tooltip.create({
      k,
      targets: [{
        x: () => gameState.antiHeroActive ? -9999 : antiHeroInst.character.pos.x,
        y: () => antiHeroInst.character.pos.y,
        width: ANTIHERO_TOOLTIP_HOVER_SIZE,
        height: ANTIHERO_TOOLTIP_HOVER_SIZE,
        text: ANTIHERO_TOOLTIP_TEXT,
        offsetY: ANTIHERO_TOOLTIP_Y_OFFSET
      }]
    })
    //
    // Tooltip: falling and grounded leaves (separate phrases per state)
    //
    createLeafTooltips(k, fallingLeafInst)
    //
    // Thunder + lightning flash at random intervals
    //
    const lightningState = {
      timer: THUNDER_INTERVAL_MIN + Math.random() * (THUNDER_INTERVAL_MAX - THUNDER_INTERVAL_MIN),
      flashTimer: 0,
      blinkCount: 0,
      blinkTimer: 0
    }
    k.add([
      k.z(0),
      {
        draw() {
          drawLightningFlash(k, lightningState)
        }
      }
    ])
    k.onUpdate(() => onUpdateLightning(k, lightningState, sound))
    //
    // Forest ambience: birds, cicadas/crickets and frogs at random intervals
    //
    const birdState = { timer: L1_BIRD_INTERVAL_MIN + Math.random() * (L1_BIRD_INTERVAL_MAX - L1_BIRD_INTERVAL_MIN) }
    k.onUpdate(() => onUpdateBirdAmbient(k, birdState, sound))
    const cricketState = { timer: L1_CRICKET_INTERVAL_MIN + Math.random() * (L1_CRICKET_INTERVAL_MAX - L1_CRICKET_INTERVAL_MIN) }
    k.onUpdate(() => onUpdateCricketAmbient(k, cricketState, sound))
    const frogState = { timer: L1_FROG_INTERVAL_MIN + Math.random() * (L1_FROG_INTERVAL_MAX - L1_FROG_INTERVAL_MIN) }
    k.onUpdate(() => onUpdateFrogAmbient(k, frogState, sound))
    //
    // Random distant crow calls from mp3 samples (two files alternated).
    //
    k.loadSound(L1_CROW_MP3_NAMES[0], '/assets/sounds/crow0.mp3')
    k.loadSound(L1_CROW_MP3_NAMES[1], '/assets/sounds/crow1.mp3')
    const crowMp3State = {
      timer: L1_CROW_MP3_INTERVAL_MIN + Math.random() * (L1_CROW_MP3_INTERVAL_MAX - L1_CROW_MP3_INTERVAL_MIN),
      mouthOpen: false,
      mouthTimer: 0
    }
    //
    // Crow stands directly on the ground — no rock perch, no rock visual.
    // A virtual perch descriptor with radius 0 places the body center at FLOOR_Y - 9*sc.
    //
    const sc = 1.35
    const crowPerch = { worldX: L1_CROW_X, worldY: FLOOR_Y, radius: 0 }
    addCrowOnRock(k, crowPerch, crowMp3State, heroInst)
    //
    // Tooltip on crow hover: "you are a loser"
    //
    Tooltip.create({
      k,
      targets: [{
        x: crowPerch.worldX,
        y: crowPerch.worldY - 9 * sc,
        width: L1_CROW_TOOLTIP_HOVER_W,
        height: L1_CROW_TOOLTIP_HOVER_H,
        text: L1_CROW_TOOLTIP_TEXT,
        offsetY: L1_CROW_TOOLTIP_OFFSET_Y
      }]
    })
    k.onUpdate(() => onUpdateCrowMp3Ambient(k, crowMp3State))
    //
    // Small mushrooms scattered along the ground (some carry joke hovers)
    //
    const l1Mushrooms = createL1Mushrooms(k)
    const mushroomTipTargets = l1Mushrooms
      .filter(m => m.tooltipText)
      .map(m => ({
        x: m.x + m.width * 0.5,
        y: m.y + m.height * 0.45,
        width: Math.max(34, m.width + 6),
        height: Math.max(28, m.height + 4),
        text: m.tooltipText,
        offsetY: -32
      }))
    mushroomTipTargets.length && Tooltip.create({ k, targets: mushroomTipTargets })
    const spiderL1Inst = createHangingSpider({
      k,
      heroInst,
      treeRootsInst,
      noteTreeIndices: [...new Set(gameState.targetSequence)],
      floorY: FLOOR_Y
    })
    Tooltip.create({
      k,
      targets: [spiderHoverTooltipTarget(spiderL1Inst, L1_SPIDER_TOOLTIP_TEXT)]
    })
    //
    // ESC key to return to menu
    //
    k.onKeyPress("escape", () => {
      goToMenuAfterAssets(k)
    })
  })
}

/**
 * Check if player earned speed bonus for completing level faster than target
 * @param {number} levelTime - Time taken to complete level (seconds)
 * @returns {boolean} True if speed bonus earned
 */
function checkSpeedBonus(levelTime) {
  const targetTime = CFG.gameplay.speedBonusTime
    && CFG.gameplay.speedBonusTime['level-touch.1']
  if (!targetTime) return false
  return levelTime < targetTime
}

/**
 * Play speed bonus visual effects on the small hero indicator
 * Flashes hero color/white and creates circle particles flying outward
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator with smallHero
 */
function playSpeedBonusEffects(k, levelIndicator) {
  if (!levelIndicator?.smallHero?.character) return
  const bodyColorHex = levelIndicator.smallHero.bodyColor || CFG.visual.colors.sections.touch.body
  const heroColor = getRGB(k, bodyColorHex)
  flashSmallHeroBonus(k, levelIndicator, heroColor, 0)
  createSpeedBonusParticles(k, levelIndicator, heroColor)
}

/**
 * Flash small hero between hero color and white for speed bonus
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator with smallHero
 * @param {Object} heroColor - RGB color matching the hero body
 * @param {number} count - Current flash iteration
 */
function flashSmallHeroBonus(k, levelIndicator, heroColor, count) {
  if (count >= SPEED_BONUS_FLASH_COUNT) {
    levelIndicator.smallHero.character.color = k.rgb(255, 255, 255)
    return
  }
  levelIndicator.smallHero.character.color = count % 2 === 0
    ? heroColor
    : k.rgb(255, 255, 255)
  k.wait(SPEED_BONUS_FLASH_INTERVAL, () => flashSmallHeroBonus(k, levelIndicator, heroColor, count + 1))
}

/**
 * Create circle particles flying outward from small hero on speed bonus
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator with smallHero
 * @param {Object} heroColor - RGB color matching the hero body
 */
function createSpeedBonusParticles(k, levelIndicator, heroColor) {
  if (!levelIndicator?.smallHero?.character) return
  const heroX = levelIndicator.smallHero.character.pos.x
  const heroY = levelIndicator.smallHero.character.pos.y
  for (let i = 0; i < SPEED_BONUS_PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / SPEED_BONUS_PARTICLE_COUNT
    const speed = SPEED_BONUS_PARTICLE_SPEED_MIN + Math.random() * SPEED_BONUS_PARTICLE_SPEED_RANGE
    const lifetime = SPEED_BONUS_PARTICLE_LIFETIME_MIN + Math.random() * SPEED_BONUS_PARTICLE_LIFETIME_RANGE
    const size = SPEED_BONUS_PARTICLE_SIZE_MIN + Math.random() * SPEED_BONUS_PARTICLE_SIZE_RANGE
    //
    // Create small circle particle matching hero body color
    //
    const particle = k.add([
      k.circle(size),
      k.pos(heroX, heroY),
      k.color(heroColor.r, heroColor.g, heroColor.b),
      k.opacity(1),
      k.z(CFG.visual.zIndex.ui + 11),
      k.anchor('center'),
      k.fixed()
    ])
    const velocityX = Math.cos(angle) * speed
    const velocityY = Math.sin(angle) * speed
    let age = 0
    particle.onUpdate(() => {
      const dt = k.dt()
      age += dt
      particle.pos.x += velocityX * dt
      particle.pos.y += velocityY * dt
      particle.opacity = 1 - (age / lifetime)
      if (age >= lifetime && particle.exists?.()) {
        k.destroy(particle)
      }
    })
  }
}

/**
 * Creates a rounded corner sprite using canvas (L-shaped with rounded inner corner)
 * @param {number} radius - Corner radius in pixels
 * @param {string} color - Fill color in hex format
 * @returns {string} Data URL of the corner sprite
 */
function createRoundedCornerSprite(radius, color) {
  const canvas = document.createElement('canvas')
  canvas.width = radius
  canvas.height = radius
  const ctx = canvas.getContext('2d')
  //
  // Draw L-shaped corner with rounded inner angle
  //
  ctx.fillStyle = color
  ctx.fillRect(0, 0, radius, radius)
  //
  // Cut out quarter circle to create rounded inner corner
  //
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc(radius, radius, radius, 0, Math.PI * 2)
  ctx.fill()
  return canvas.toDataURL()
}

/**
 * Handles hero death from touching a poison (blue) leaf.
 * Increments life score, flashes life icon, then reloads the level.
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @param {Object} levelIndicator - Level indicator with lifeImage
 */
function onPoisonLeafDeath(k, heroInst, levelIndicator) {
  if (heroInst.isDying) return
  Hero.death(heroInst, () => {
    const currentScore = get('lifeScore', 0)
    const newScore = currentScore + 1
    set('lifeScore', newScore)
    levelIndicator?.updateLifeScore?.(newScore)
    if (levelIndicator?.lifeImage?.sprite?.exists?.()) {
      Sound.playLifeSound(k)
      const originalColor = levelIndicator.lifeImage.sprite.color
      flashLifeImageOnDeath(k, levelIndicator, originalColor, 0)
      createLifeParticlesOnDeath(k, levelIndicator)
    }
    k.wait(POISON_DEATH_RELOAD_DELAY, () => goAfterPreparingAssets(k, 'level-touch.1'))
  })
}
//
// Flashes life image red/white on poison death
//
function flashLifeImageOnDeath(k, levelIndicator, originalColor, count) {
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
  k.wait(LIFE_FLASH_INTERVAL, () => flashLifeImageOnDeath(k, levelIndicator, originalColor, count + 1))
}
//
// Red square particles radiating from life icon on death
//
function createLifeParticlesOnDeath(k, levelIndicator) {
  if (!levelIndicator?.lifeImage?.sprite?.exists?.()) return
  const lifeX = levelIndicator.lifeImage.sprite.pos.x
  const lifeY = levelIndicator.lifeImage.sprite.pos.y
  for (let i = 0; i < LIFE_PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / LIFE_PARTICLE_COUNT
    const speed = LIFE_PARTICLE_SPEED_MIN + Math.random() * LIFE_PARTICLE_SPEED_EXTRA
    const lifetime = LIFE_PARTICLE_LIFETIME_MIN + Math.random() * LIFE_PARTICLE_LIFETIME_EXTRA
    const size = LIFE_PARTICLE_SIZE_MIN + Math.random() * LIFE_PARTICLE_SIZE_EXTRA
    const pData = {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      lifetime,
      elapsed: 0
    }
    const particle = k.add([
      k.rect(size, size),
      k.pos(lifeX, lifeY),
      k.color(255, 0, 0),
      k.opacity(1),
      k.z(CFG.visual.zIndex.ui + 10),
      k.anchor('center'),
      k.fixed()
    ])
    particle.onUpdate(() => onUpdateDeathParticle(k, particle, pData))
  }
}
//
// Updates a death particle (movement + fade + destroy)
//
function onUpdateDeathParticle(k, particle, pData) {
  pData.elapsed += k.dt()
  particle.pos.x += pData.vx * k.dt()
  particle.pos.y += pData.vy * k.dt()
  particle.opacity = 1 - pData.elapsed / pData.lifetime
  if (pData.elapsed >= pData.lifetime) {
    k.destroy(particle)
  }
}

/**
 * Creates rounded corners at all four corners of the game area
 * @param {Object} k - Kaplay instance
 */
function createRoundedCorners(k) {
  const cornerDataURL = createRoundedCornerSprite(CORNER_RADIUS, WALL_COLOR_HEX)
  loadTouchSprite(k, CORNER_SPRITE_NAME, cornerDataURL)
  //
  // Top-left corner
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(LEFT_MARGIN, TOP_MARGIN),
    k.z(CFG.visual.zIndex.platforms + 1)
  ])
  //
  // Top-right corner (rotate 90°)
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(CFG.visual.screen.width - RIGHT_MARGIN, TOP_MARGIN),
    k.rotate(90),
    k.z(CFG.visual.zIndex.platforms + 1)
  ])
  //
  // Bottom corners need higher z so grass / leaves / floor decor do not cover rounded clips.
  //
  const BOTTOM_CORNER_Z = 26
  //
  // Bottom-left corner (rotate 270°) — at FLOOR_Y (raised platform)
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(LEFT_MARGIN, FLOOR_Y),
    k.rotate(270),
    k.z(BOTTOM_CORNER_Z)
  ])
  //
  // Bottom-right corner (rotate 180°) — at FLOOR_Y (raised platform)
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(CFG.visual.screen.width - RIGHT_MARGIN, FLOOR_Y),
    k.rotate(180),
    k.z(BOTTOM_CORNER_Z)
  ])
}

/**
 * Generates cloud configuration data for the scrolling cloud system.
 * Cloud X positions are relative to a band (0 to bandWidth) so two copies
 * can tile seamlessly during scrolling.
 * @returns {Object} Cloud config with bandWidth and cloud array
 */
function createScrollingCloudConfigs() {
  const areaLeft = LEFT_MARGIN
  const areaRight = CFG.visual.screen.width - RIGHT_MARGIN
  const bandWidth = areaRight - areaLeft
  const cloudSpacing = bandWidth / CLOUD_COUNT
  const baseCloudColor = { r: 36, g: 37, b: 36 }
  const configs = []
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
    configs.push({
          x: cloudX,
      y: cloudY,
      crownSize,
      crowns,
          color: baseCloudColor,
      opacity: 0.85 + Math.random() * 0.1
    })
  }
  return { bandWidth, areaLeft, areaRight, configs }
}

/**
 * Creates the scrolling cloud draw object that moves clouds to the right
 * in a seamless loop (two copies of the band tiled side-by-side).
 * @param {Object} k - Kaplay instance
 * @param {Object} cloudData - Output of createScrollingCloudConfigs
 */
function createScrollingClouds(k, cloudData) {
  const { bandWidth, areaLeft, areaRight, configs } = cloudData
  const inst = { scrollX: 0 }
  k.add([
    k.z(1),
    {
      draw() {
        inst.scrollX = (inst.scrollX + CLOUD_SCROLL_SPEED * k.dt()) % bandWidth
        for (let copy = 0; copy < 2; copy++) {
          const baseOffset = areaLeft + inst.scrollX - copy * bandWidth
          for (const cloud of configs) {
            const cx = cloud.x + baseOffset
            if (cx + cloud.crownSize < areaLeft || cx - cloud.crownSize > areaRight) continue
            for (const crown of cloud.crowns) {
              k.drawCircle({
                pos: k.vec2(cx + crown.offsetX, cloud.y + crown.offsetY),
                radius: cloud.crownSize * crown.sizeVariation,
                color: k.rgb(cloud.color.r, cloud.color.g, cloud.color.b),
                opacity: cloud.opacity * crown.opacityVariation
              })
            }
          }
        }
      }
    }
  ])
}

/**
 * Creates dynamic tooltips for leaves. Falling leaves get "scream" phrases,
 * grounded leaves get funny "resting" phrases. Phrases are assigned via
 * WeakMaps so each leaf keeps its phrase stable across frames.
 * @param {Object} k - Kaplay instance
 * @param {Object} fallingLeafInst - FallingLeaf instance with fallingLeaves/groundLeaves
 */
function createLeafTooltips(k, fallingLeafInst) {
  //
  // Separate phrase maps: falling vs grounded (so phrase changes on landing).
  // Poison leaves always use the poison pool regardless of state.
  //
  const fallingPhraseMap = new WeakMap()
  const groundPhraseMap = new WeakMap()
  const getPhrase = (leaf, isFalling) => {
    if (leaf.poisonous) {
      if (!fallingPhraseMap.has(leaf)) {
        fallingPhraseMap.set(leaf, LEAF_POISON_PHRASES[Math.floor(Math.random() * LEAF_POISON_PHRASES.length)])
      }
      return fallingPhraseMap.get(leaf)
    }
    const map = isFalling ? fallingPhraseMap : groundPhraseMap
    const pool = isFalling ? LEAF_FALLING_PHRASES : LEAF_GROUND_PHRASES
    if (!map.has(leaf)) {
      map.set(leaf, pool[Math.floor(Math.random() * pool.length)])
    }
    return map.get(leaf)
  }
  //
  // Pre-allocate tooltip target slots refreshed each frame via onUpdate
  //
  const tooltipTargets = []
  const MAX_TRACKED_LEAVES = 200
  for (let i = 0; i < MAX_TRACKED_LEAVES; i++) {
    tooltipTargets.push({
      x: -9999,
      y: -9999,
      width: LEAF_TOOLTIP_HOVER_SIZE,
      height: LEAF_TOOLTIP_HOVER_SIZE,
      text: "",
      offsetY: LEAF_TOOLTIP_Y_OFFSET
    })
  }
  Tooltip.create({ k, targets: tooltipTargets })
  //
  // Sync tooltip target positions/texts with actual leaf positions each frame
  //
  k.onUpdate(() => onUpdateLeafTooltips(fallingLeafInst, tooltipTargets, getPhrase))
}
//
// Updates leaf tooltip target positions. Poison leaves get warning phrases,
// falling leaves get scream phrases, grounded leaves get resting phrases.
//
function onUpdateLeafTooltips(fallingLeafInst, targets, getPhrase) {
  const falling = fallingLeafInst.fallingLeaves
  const ground = fallingLeafInst.groundLeaves
  let idx = 0
  //
  // Falling leaves first
  //
  for (let i = 0; i < falling.length && idx < targets.length; i++, idx++) {
    targets[idx].x = falling[i].x
    targets[idx].y = falling[i].y
    targets[idx].text = getPhrase(falling[i], true)
  }
  //
  // Grounded leaves next
  //
  for (let i = 0; i < ground.length && idx < targets.length; i++, idx++) {
    targets[idx].x = ground[i].x
    targets[idx].y = ground[i].y
    targets[idx].text = getPhrase(ground[i], false)
  }
  //
  // Hide remaining unused slots
  //
  for (; idx < targets.length; idx++) {
    targets[idx].x = -9999
    targets[idx].y = -9999
  }
}
//
// Shows timed speech bubbles from the anti-hero if the melody puzzle
// is unsolved for too long. First hint at 30s, notes hint at 60s,
// then notes hint repeats every 30s.
//
function onUpdateAntiHeroHints(k, gameState, antiHeroInst) {
  if (gameState.antiHeroActive) return
  gameState.hintTimer += k.dt()
  //
  // First hint: "I'm waiting for you here" after 30 seconds (once)
  //
  if (!gameState.hintWaitShown && gameState.hintTimer >= ANTIHERO_HINT_WAIT_DELAY) {
    gameState.hintWaitShown = true
    showAntiHeroHint(k, gameState, antiHeroInst, ANTIHERO_HINT_WAIT_TEXT, ANTIHERO_HINT_DISPLAY_TIME)
  }
  //
  // Notes hint: first at 60s, then repeats every 30s
  //
  if (!gameState.hintNotesFirstShown && gameState.hintTimer >= ANTIHERO_HINT_NOTES_DELAY) {
    gameState.hintNotesFirstShown = true
    gameState.hintNotesLastShownAt = gameState.hintTimer
    showAntiHeroHint(k, gameState, antiHeroInst, ANTIHERO_HINT_NOTES_TEXT, ANTIHERO_HINT_NOTES_DISPLAY_TIME)
  } else if (gameState.hintNotesFirstShown && !gameState.currentHint) {
    const elapsed = gameState.hintTimer - gameState.hintNotesLastShownAt
    if (elapsed >= ANTIHERO_HINT_NOTES_REPEAT_INTERVAL) {
      gameState.hintNotesLastShownAt = gameState.hintTimer
      showAntiHeroHint(k, gameState, antiHeroInst, ANTIHERO_HINT_NOTES_TEXT, ANTIHERO_HINT_NOTES_DISPLAY_TIME)
    }
  }
}
//
// Displays a forced-visible tooltip above the anti-hero for a fixed duration.
// Uses a higher Y offset when the hover tooltip is also visible to avoid overlap.
//
function showAntiHeroHint(k, gameState, antiHeroInst, text, duration) {
  gameState.currentHint && Tooltip.destroy(gameState.currentHint)
  const target = {
    x: () => antiHeroInst.character.pos.x,
    y: () => antiHeroInst.character.pos.y,
    width: 0,
    height: 0,
    text,
    offsetY: ANTIHERO_HINT_Y_OFFSET
  }
  gameState.currentHint = Tooltip.create({
    k,
    targets: [target],
    forceVisible: true
  })
  gameState.currentHint.activeTarget = target
  gameState.currentHint.frozenX = Math.round(antiHeroInst.character.pos.x)
  gameState.currentHint.frozenY = Math.round(antiHeroInst.character.pos.y)
  gameState.currentHint.opacity = 1
  k.wait(duration, () => {
    gameState.currentHint && Tooltip.destroy(gameState.currentHint)
    gameState.currentHint = null
  })
}
/**
 * Creates a small worm that crawls along the root level with peristaltic locomotion.
 * A contraction wave travels head-to-tail through connected segments.
 * The head leads movement; body follows with distance constraints.
 * @param {Object} k - Kaplay instance
 * @param {number} index - Worm index for varied starting position and direction
 * @returns {Object} Worm instance
 */
function createWorm(k, index) {
  const leftBound = LEFT_MARGIN + 40
  const rightBound = CFG.visual.screen.width - RIGHT_MARGIN - 40
  const range = rightBound - leftBound
  //
  // Spread worms across the playable area
  //
  const zoneWidth = range / WORM_COUNT
  const startX = leftBound + zoneWidth * index + Math.random() * zoneWidth
  const yZoneCenter = WORM_BASE_Y + index * WORM_Y_ZONE_HEIGHT
  const startAngle = (index % 2 === 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.5
  //
  // Initialize segments in a line behind the head
  //
  const segments = []
  for (let i = 0; i < WORM_SEGMENT_COUNT; i++) {
    segments.push({
      x: startX - i * WORM_REST_SPACING * Math.cos(startAngle),
      y: yZoneCenter - i * WORM_REST_SPACING * Math.sin(startAngle)
    })
  }
  const inst = {
    segments,
    heading: startAngle,
    wavePhase: Math.random() * Math.PI * 2,
    steerPhase: Math.random() * Math.PI * 2,
    directionTimer: WORM_DIRECTION_CHANGE_MIN + Math.random() * WORM_DIRECTION_CHANGE_RANGE,
    trail: [],
    leftBound,
    rightBound,
    yMin: WORM_BASE_Y + index * WORM_Y_ZONE_HEIGHT - 3,
    yMax: WORM_BASE_Y + (index + 1) * WORM_Y_ZONE_HEIGHT
  }
        k.add([
    k.z(WORM_DRAW_Z),
    { draw() { onDrawWorm(k, inst) } }
  ])
  k.onUpdate(() => onUpdateWorm(k, inst))
  return inst
}
//
// Peristaltic wave locomotion: head leads, contraction wave travels head-to-tail.
// Segments smoothly follow their predecessor with soft lerp and hard distance clamp.
//
function onUpdateWorm(k, inst) {
  const dt = k.dt()
  const head = inst.segments[0]
  inst.wavePhase += dt * WORM_WAVE_SPEED
  inst.steerPhase += dt * WORM_STEER_SPEED
  //
  // Periodic direction reversal
  //
  inst.directionTimer -= dt
  if (inst.directionTimer <= 0) {
    inst.heading += Math.PI
    inst.directionTimer = WORM_DIRECTION_CHANGE_MIN + Math.random() * WORM_DIRECTION_CHANGE_RANGE
  }
  //
  // Head pulses forward: speed modulated by the contraction wave
  //
  const headWave = (Math.sin(inst.wavePhase * Math.PI * 2) + 1) / 2
  const speed = WORM_HEAD_SPEED * (0.2 + headWave * 0.8)
  //
  // Sinusoidal steering for gentle curves
  //
  inst.heading += Math.sin(inst.steerPhase) * WORM_STEER_AMPLITUDE * dt
  //
  // Boundary steering: gentle turn away from edges (large-radius arc)
  //
  const edgeMargin = 50
  if (head.x < inst.leftBound + edgeMargin && Math.cos(inst.heading) < 0) {
    inst.heading += 0.02
  } else if (head.x > inst.rightBound - edgeMargin && Math.cos(inst.heading) > 0) {
    inst.heading -= 0.02
  }
  if (head.y < inst.yMin && Math.sin(inst.heading) < 0) {
    inst.heading += 0.03
  } else if (head.y > inst.yMax && Math.sin(inst.heading) > 0) {
    inst.heading -= 0.03
  }
  //
  // Keep heading mostly horizontal with gentle correction
  //
  inst.heading -= Math.sin(inst.heading) * 0.005
  //
  // Advance head along curved heading
  //
  head.x += Math.cos(inst.heading) * speed * dt
  head.y += Math.sin(inst.heading) * speed * dt
  head.y = Math.max(inst.yMin, Math.min(inst.yMax, head.y))
  //
  // Body segments: each follows its predecessor with a soft lerp.
  // The contraction wave modulates target distance (short = contracted, long = extended).
  // Hard clamp enforces max stretch so segments never disconnect.
  //
  for (let i = 1; i < inst.segments.length; i++) {
    const prev = inst.segments[i - 1]
    const seg = inst.segments[i]
    const dx = prev.x - seg.x
    const dy = prev.y - seg.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 0.01) continue
    //
    // Contraction wave: phase-shifted per segment so wave travels along body
    //
    const segWave = (Math.sin((inst.wavePhase - i * WORM_WAVE_DELAY) * Math.PI * 2) + 1) / 2
    const targetDist = WORM_REST_SPACING * (WORM_CONTRACT_MIN + segWave * (WORM_CONTRACT_MAX - WORM_CONTRACT_MIN))
    //
    // Soft follow: smoothly move toward target position behind predecessor
    //
    const targetX = prev.x - (dx / dist) * targetDist
    const targetY = prev.y - (dy / dist) * targetDist
    const lerp = Math.min(1, WORM_FOLLOW_SPEED * dt)
    seg.x += (targetX - seg.x) * lerp
    seg.y += (targetY - seg.y) * lerp
    //
    // Hard distance constraint: never stretch beyond max
    //
    const cdx = prev.x - seg.x
    const cdy = prev.y - seg.y
    const cDist = Math.sqrt(cdx * cdx + cdy * cdy)
    const maxDist = WORM_REST_SPACING * WORM_MAX_STRETCH
    if (cDist > maxDist) {
      seg.x = prev.x - (cdx / cDist) * maxDist
      seg.y = prev.y - (cdy / cDist) * maxDist
    }
    seg.y = Math.max(inst.yMin, Math.min(inst.yMax, seg.y))
  }
  //
  // Trail: record tail position, slowly fade old points
  //
  const tail = inst.segments[inst.segments.length - 1]
  inst.trail.push({ x: tail.x, y: tail.y, opacity: 1 })
  if (inst.trail.length > WORM_TRAIL_MAX_POINTS) {
    inst.trail.shift()
  }
  for (let i = inst.trail.length - 1; i >= 0; i--) {
    inst.trail[i].opacity -= WORM_TRAIL_FADE_SPEED
    if (inst.trail[i].opacity <= 0) {
      inst.trail.splice(i, 1)
    }
  }
}
//
// Draws the worm: dark trail, circle segments with peristaltic bulge, tiny eyes
//
function onDrawWorm(k, inst) {
  const trailRgb = parseHex(WORM_TRAIL_COLOR)
  const bodyRgb = parseHex(WORM_BODY_COLOR)
  const headRgb = parseHex(WORM_HEAD_COLOR)
  const ventralRgb = parseHex(WORM_VENTRAL_HIGHLIGHT)
  //
  // Narrow damp-soil smear behind the worm (reads subtler than solid rects)
  //
  for (const pt of inst.trail) {
    k.drawEllipse({
      pos: k.vec2(pt.x, pt.y),
      radiusX: 5,
      radiusY: 1.8,
      color: k.rgb(trailRgb[0], trailRgb[1], trailRgb[2]),
      opacity: pt.opacity * 0.55
    })
  }
  const segs = inst.segments
  //
  // Continuous muscular tube: thick stroke along the spine with peristaltic width
  //
  for (let i = 0; i < segs.length - 1; i++) {
    const a = segs[i]
    const b = segs[i + 1]
    const segWave = (Math.sin((inst.wavePhase - i * WORM_WAVE_DELAY) * Math.PI * 2) + 1) / 2
    const bulge = 1 - segWave
    const tubeW = (WORM_SEGMENT_RADIUS + bulge * WORM_BULGE_AMOUNT) * 2.35
    const rgb = i === 0 ? headRgb : bodyRgb
    k.drawLine({
      p1: k.vec2(a.x, a.y),
      p2: k.vec2(b.x, b.y),
      width: tubeW,
      color: k.rgb(rgb[0], rgb[1], rgb[2]),
      opacity: 0.94
    })
    //
    // Soft ventral highlight (lighter underside band)
    //
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    k.drawLine({
      p1: k.vec2(a.x, a.y + 1.1),
      p2: k.vec2(b.x, b.y + 1.1),
      width: tubeW * 0.38,
      color: k.rgb(ventralRgb[0], ventralRgb[1], ventralRgb[2]),
      opacity: 0.45
    })
    //
    // Annulated rings at segment joins for an earthworm-like segmentation
    //
    const ringWave = (Math.sin((inst.wavePhase - (i + 0.5) * WORM_WAVE_DELAY) * Math.PI * 2) + 1) / 2
    const ringR = WORM_SEGMENT_RADIUS * 0.35 + ringWave * 0.25
    k.drawCircle({
      pos: k.vec2(mx, my),
      radius: ringR,
      color: k.rgb(26, 18, 14),
      opacity: WORM_SEGMENT_RING_OPACITY
    })
  }
  //
  // Head cap + eyes (detail sits on top of the tube)
  //
  const head = segs[0]
  const headWave = (Math.sin(inst.wavePhase * Math.PI * 2) + 1) / 2
  const headR = WORM_SEGMENT_RADIUS + (1 - headWave) * WORM_BULGE_AMOUNT + 0.9
  k.drawCircle({
    pos: k.vec2(head.x, head.y),
    radius: headR + 1,
    color: k.rgb(12, 10, 8),
    opacity: 0.65
  })
  k.drawCircle({
    pos: k.vec2(head.x, head.y),
    radius: headR,
    color: k.rgb(headRgb[0], headRgb[1], headRgb[2]),
    opacity: 1
  })
  drawWormEyes(k, inst, head)
}
//
// Draws two tiny eyes on the worm's head, facing the movement direction
//
function drawWormEyes(k, inst, head) {
  const next = inst.segments[1]
  const dx = head.x - next.x
  const dy = head.y - next.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const nx = dist > 0 ? dx / dist : Math.cos(inst.heading)
  const ny = dist > 0 ? dy / dist : 0
  const px = -ny
  const py = nx
  const eyeForward = 1.5
  for (let side = -1; side <= 1; side += 2) {
    const ex = head.x + nx * eyeForward + px * WORM_EYE_SPACING * side
    const ey = head.y + ny * eyeForward + py * WORM_EYE_SPACING * side
    k.drawCircle({
      pos: k.vec2(ex, ey),
      radius: WORM_EYE_RADIUS,
      color: k.rgb(220, 220, 210)
    })
    k.drawCircle({
      pos: k.vec2(ex + nx * 0.3, ey + ny * 0.3),
      radius: WORM_PUPIL_RADIUS,
      color: k.rgb(20, 20, 20)
    })
  }
}
//
// Checks hero collision against the giant worm's risen body.
// Delegates to GiantWorm.checkCollision which accounts for spine offsets and tapered width.
//
function checkGiantWormCollision(k, heroInst, wormInst, levelIndicator) {
  const heroX = heroInst.character.pos.x
  const heroY = heroInst.character.pos.y
  if (GiantWorm.checkCollision(wormInst, heroX, heroY)) {
    GiantWorm.startSmiling(wormInst)
    onPoisonLeafDeath(k, heroInst, levelIndicator)
  }
}
//
// Fireflies that drift between tree layers at different z-depths
//
function createFireflies(k, heroInst) {
  const playableW = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
  const fireflies = []
  for (let i = 0; i < FIREFLY_COUNT; i++) {
    fireflies.push({
      x: LEFT_MARGIN + Math.random() * playableW,
      y: TOP_MARGIN + 50 + Math.random() * (FLOOR_Y - TOP_MARGIN - 100),
      baseX: 0,
      baseY: 0,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      pushVx: 0,
      pushVy: 0,
      radius: FIREFLY_RADIUS_MIN + Math.random() * (FIREFLY_RADIUS_MAX - FIREFLY_RADIUS_MIN),
      glowSpeed: FIREFLY_GLOW_SPEED_MIN + Math.random() * (FIREFLY_GLOW_SPEED_MAX - FIREFLY_GLOW_SPEED_MIN),
      phase: Math.random() * Math.PI * 2,
      speed: FIREFLY_MIN_SPEED + Math.random() * (FIREFLY_MAX_SPEED - FIREFLY_MIN_SPEED),
      layerIndex: i % FIREFLY_LAYERS_Z.length
    })
  }
  fireflies.forEach(f => { f.baseX = f.x; f.baseY = f.y })
  //
  // One draw object per z-layer so fireflies interleave with tree sprites
  //
  FIREFLY_LAYERS_Z.forEach((zVal, li) => {
    k.add([
      k.z(zVal),
          {
            draw() {
          drawFireflyLayer(k, fireflies, li)
        }
      }
    ])
  })
  let lastHeroX = heroInst.character?.pos?.x ?? 0
  let lastHeroY = heroInst.character?.pos?.y ?? 0
  k.onUpdate(() => {
    onUpdateFireflies(k, fireflies)
    //
    // Push fireflies away when hero runs or jumps nearby
    //
    if (!heroInst.character?.pos) return
    const heroX = heroInst.character.pos.x
    const heroY = heroInst.character.pos.y
    const heroVx = heroX - lastHeroX
    const heroVy = heroY - lastHeroY
    lastHeroX = heroX
    lastHeroY = heroY
    const heroSpeed = Math.abs(heroVx) + Math.abs(heroVy)
    if (heroSpeed < 0.5) return
    const dt = k.dt()
    for (const f of fireflies) {
      const dx = f.x - heroX
      const dy = f.y - heroY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist >= FIREFLY_PUSH_DISTANCE || dist < 1) continue
      const force = (1 - dist / FIREFLY_PUSH_DISTANCE) * FIREFLY_PUSH_STRENGTH * dt
      f.pushVx += (dx / dist) * force + heroVx * force * 0.3
      f.pushVy += (dy / dist) * force + heroVy * force * 0.3
    }
  })
}
//
// Per-frame drift: gentle sine-wave wander within bounds
//
function onUpdateFireflies(k, fireflies) {
  const dt = k.dt()
  const t = k.time()
  const minX = LEFT_MARGIN + 10
  const maxX = CFG.visual.screen.width - RIGHT_MARGIN - 10
  const minY = TOP_MARGIN + 30
  const maxY = FLOOR_Y - 20
  for (const f of fireflies) {
    f.x += Math.sin(t * f.glowSpeed + f.phase) * f.speed * dt + f.pushVx
    f.y += Math.cos(t * f.glowSpeed * 0.7 + f.phase) * f.speed * 0.6 * dt + f.pushVy
    //
    // Decay push velocity over time
    //
    f.pushVx *= 0.96
    f.pushVy *= 0.96
    if (f.x < minX) f.x = minX
    if (f.x > maxX) f.x = maxX
    if (f.y < minY) f.y = minY
    if (f.y > maxY) f.y = maxY
  }
}
//
// Draw fireflies belonging to a specific z-layer
//
function drawFireflyLayer(k, fireflies, layerIndex) {
  const t = k.time()
  for (const f of fireflies) {
    if (f.layerIndex !== layerIndex) continue
    const glow = (Math.sin(t * f.glowSpeed + f.phase) + 1) / 2
    const alpha = 0.15 + glow * 0.7
    //
    // Soft glow halo
    //
                k.drawCircle({
      pos: k.vec2(f.x, f.y),
      radius: f.radius * 3,
      color: k.rgb(FIREFLY_COLOR_R, FIREFLY_COLOR_G, FIREFLY_COLOR_B),
      opacity: alpha * 0.15
    })
    //
    // Bright core
    //
    k.drawCircle({
      pos: k.vec2(f.x, f.y),
      radius: f.radius,
      color: k.rgb(FIREFLY_COLOR_R, FIREFLY_COLOR_G, FIREFLY_COLOR_B),
      opacity: alpha
    })
  }
}
//
// Update lightning timer: trigger thunder sound and flash
//
function onUpdateLightning(k, state, sound) {
  const dt = k.dt()
  //
  // Count down active flash
  //
  if (state.flashTimer > 0) {
    state.flashTimer = Math.max(0, state.flashTimer - dt)
  }
  //
  // Blink: schedule additional short flashes after the main one
  //
  if (state.blinkCount > 0) {
    state.blinkTimer -= dt
    if (state.blinkTimer <= 0) {
      state.flashTimer = LIGHTNING_FLASH_DURATION * 0.6
      state.blinkCount--
      state.blinkTimer = LIGHTNING_BLINK_INTERVAL
    }
  }
  state.timer -= dt
  if (state.timer <= 0) {
    playVariedThunder(sound)
    state.flashTimer = LIGHTNING_FLASH_DURATION
    state.blinkCount = LIGHTNING_BLINK_COUNT
    state.blinkTimer = LIGHTNING_BLINK_INTERVAL
    state.timer = THUNDER_INTERVAL_MIN + Math.random() * (THUNDER_INTERVAL_MAX - THUNDER_INTERVAL_MIN)
  }
}
//
// Play 1-3 thunder rumbles with random durations and delays
//
function playVariedThunder(sound) {
  const durations = [1.5, 2.5, 3.5, 4.5, 5.0]
  const mainDuration = durations[Math.floor(Math.random() * durations.length)]
  Sound.playThunderSound(sound, { duration: mainDuration })
  //
  // Chance to add follow-up rumbles
  //
  if (Math.random() < THUNDER_MULTI_CHANCE) {
    const extraCount = 1 + Math.floor(Math.random() * (THUNDER_MULTI_MAX - 1))
    let cumulativeDelay = 0
    for (let i = 0; i < extraCount; i++) {
      cumulativeDelay += THUNDER_MULTI_DELAY_MIN + Math.random() * (THUNDER_MULTI_DELAY_MAX - THUNDER_MULTI_DELAY_MIN)
      const extraDuration = 1.0 + Math.random() * 2.5
      const extraVolume = 0.4 + Math.random() * 0.4
      Sound.playThunderSound(sound, { duration: extraDuration, volume: extraVolume, delay: cumulativeDelay })
    }
  }
}
//
// Draw lightning flash: a single full-screen white overlay that fades out smoothly.
// No horizontal strips — uniform alpha prevents visible banding.
//
function drawLightningFlash(k, state) {
  if (state.flashTimer <= 0) return
  const progress = state.flashTimer / LIGHTNING_FLASH_DURATION
  k.drawRect({
    pos: k.vec2(0, 0),
    width: CFG.visual.screen.width,
    height: CFG.visual.screen.height,
    color: k.rgb(225, 230, 248),
    opacity: progress * LIGHTNING_FLASH_OPACITY
  })
}
//
// Periodically play a distant crow call from one of the two mp3 samples.
//
function onUpdateCrowMp3Ambient(k, state) {
  //
  // Count down mouth-open timer; close beak when done
  //
  if (state.mouthTimer > 0) {
    state.mouthTimer -= k.dt()
    if (state.mouthTimer <= 0) state.mouthOpen = false
  }
  state.timer -= k.dt()
  if (state.timer <= 0) {
    k.play(L1_CROW_MP3_NAMES[Math.floor(Math.random() * 2)], { volume: L1_CROW_MP3_VOLUME })
    state.mouthOpen = true
    state.mouthTimer = L1_CROW_MOUTH_OPEN_DURATION
    state.timer = L1_CROW_MP3_INTERVAL_MIN + Math.random() * (L1_CROW_MP3_INTERVAL_MAX - L1_CROW_MP3_INTERVAL_MIN)
  }
}
//
// Periodically play a small bird chirp or owl hoot
//
function onUpdateBirdAmbient(k, state, sound) {
  state.timer -= k.dt()
  if (state.timer <= 0) {
    Math.random() < 0.7 ? Sound.playBirdChirpSound(sound) : Sound.playOwlSound(sound)
    state.timer = L1_BIRD_INTERVAL_MIN + Math.random() * (L1_BIRD_INTERVAL_MAX - L1_BIRD_INTERVAL_MIN)
  }
}
//
// Periodically play cricket/cicada chirps
//
function onUpdateCricketAmbient(k, state, sound) {
  state.timer -= k.dt()
  if (state.timer <= 0) {
    Sound.playCricketSound(sound)
    state.timer = L1_CRICKET_INTERVAL_MIN + Math.random() * (L1_CRICKET_INTERVAL_MAX - L1_CRICKET_INTERVAL_MIN)
  }
}
//
// Periodically play a frog croak
//
function onUpdateFrogAmbient(k, state, sound) {
  state.timer -= k.dt()
  if (state.timer <= 0) {
    Sound.playFrogSound(sound)
    state.timer = L1_FROG_INTERVAL_MIN + Math.random() * (L1_FROG_INTERVAL_MAX - L1_FROG_INTERVAL_MIN)
  }
}
//
// Creates small mushrooms scattered along the level 1 ground
//
function createL1Mushrooms(k) {
  const playableW = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
  const mushrooms = []
  //
  // Earthy/forest mushroom palette (browns, reds, yellows)
  //
  const capColors = [
    [120, 70, 35], [160, 80, 40], [180, 50, 50],
    [140, 110, 50], [90, 60, 35], [170, 60, 70]
  ]
  for (let i = 0; i < L1_MUSHROOM_COUNT; i++) {
    const capW = L1_MUSHROOM_CAP_WIDTH_MIN + Math.random() * (L1_MUSHROOM_CAP_WIDTH_MAX - L1_MUSHROOM_CAP_WIDTH_MIN)
    const capH = capW * (0.4 + Math.random() * 0.3)
    const stemH = L1_MUSHROOM_STEM_HEIGHT_MIN + Math.random() * (L1_MUSHROOM_STEM_HEIGHT_MAX - L1_MUSHROOM_STEM_HEIGHT_MIN)
    const stemW = capW * (0.25 + Math.random() * 0.15)
    const totalW = Math.ceil(capW + 4)
    const totalH = Math.ceil(capH + stemH + 4)
    const color = capColors[Math.floor(Math.random() * capColors.length)]
    const spriteName = `mushroom-l1-${i}`
    const dataUrl = toCanvas({ width: totalW, height: totalH, pixelRatio: 1 }, (ctx) => {
      drawMushroomShape(ctx, totalW, totalH, capW, capH, stemH, stemW, color)
    })
    const posX = LEFT_MARGIN + 60 + Math.random() * (playableW - 120)
    const tipRoll = Math.random()
    const tooltipText = tipRoll < L1_MUSHROOM_FUNNY_CHANCE
      ? L1_MUSHROOM_FUNNY_LINES[Math.floor(Math.random() * L1_MUSHROOM_FUNNY_LINES.length)]
      : null
    mushrooms.push({
      spriteName,
      dataUrl,
      x: posX,
      y: FLOOR_Y - totalH + 2,
      width: totalW,
      height: totalH,
      tooltipText
    })
  }
  mushrooms.forEach(m => loadTouchSprite(k, m.spriteName, m.dataUrl))
  k.add([
    k.z(6),
    {
      draw() {
        for (const m of mushrooms) {
          k.drawSprite({ sprite: m.spriteName, pos: k.vec2(m.x, m.y) })
        }
      }
    }
  ])
  return mushrooms
}
//
// Draw a mushroom on a 2D canvas (cap + stem + texture dots)
//
function drawMushroomShape(ctx, totalW, totalH, capW, capH, stemH, stemW, color) {
  const cx = totalW / 2
  const stemTop = totalH - stemH - 2
  //
  // Stem: tapered rectangle
  //
  ctx.fillStyle = `rgb(${Math.min(255, color[0] + 40)}, ${Math.min(255, color[1] + 50)}, ${Math.min(255, color[2] + 30)})`
  ctx.beginPath()
  ctx.moveTo(cx - stemW / 2, totalH - 2)
  ctx.lineTo(cx - stemW * 0.4, stemTop)
  ctx.lineTo(cx + stemW * 0.4, stemTop)
  ctx.lineTo(cx + stemW / 2, totalH - 2)
  ctx.closePath()
  ctx.fill()
  //
  // Cap: half-ellipse
  //
  ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
  ctx.beginPath()
  ctx.ellipse(cx, stemTop, capW / 2, capH, 0, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  //
  // Cap highlight
  //
  ctx.fillStyle = `rgba(255, 255, 255, 0.15)`
  ctx.beginPath()
  ctx.ellipse(cx - capW * 0.1, stemTop - capH * 0.3, capW * 0.25, capH * 0.3, 0, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  //
  // White spots on cap for texture
  //
  const dotCount = Math.floor(Math.random() * 3) + 1
  ctx.fillStyle = `rgba(255, 255, 240, 0.3)`
  for (let d = 0; d < dotCount; d++) {
    const dotX = cx + (Math.random() - 0.5) * capW * 0.6
    const dotY = stemTop - capH * (0.2 + Math.random() * 0.5)
    ctx.beginPath()
    ctx.arc(dotX, dotY, 1 + Math.random(), 0, Math.PI * 2)
    ctx.fill()
  }
}
//
// Draws an animated crow perched on top of a floor rock.
// The beak opens when a crow MP3 sample plays (crowMp3State.mouthOpen).
// The crow always faces the hero: beak points toward hero's current position.
//
function addCrowOnRock(k, rock, crowMp3State, heroInst) {
  //
  // Pre-cache colors to avoid allocating new Color objects each frame
  //
  const bodyColor  = k.rgb(22, 20, 22)
  const headColor  = k.rgb(18, 16, 18)
  const wingColor  = k.rgb(32, 28, 36)
  const tailColor  = k.rgb(20, 18, 20)
  const eyeWhite   = k.rgb(230, 230, 230)
  const pupilColor = k.rgb(10, 8, 10)
  const beakUpper  = k.rgb(55, 50, 35)
  const beakLower  = k.rgb(45, 40, 28)
  const mouthInner = k.rgb(160, 80, 60)
  const feetColor  = k.rgb(60, 50, 30)
  const sc = 1.35
  const cx = rock.worldX
  //
  // Rock visual top is at worldY - radius*0.62 (ellipse vertical semi-axis).
  // Offset up by half the crow body height (~9*sc) so it sits ON the rock surface.
  //
  const perchY = rock.worldY - rock.radius * 0.62 - 9 * sc
  k.add([
    k.z(L1_CROW_ROCK_DRAW_Z),
    {
      draw() {
        //
        // Facing direction: +1 = beak points right, -1 = beak points left
        //
        const heroX = heroInst?.character?.pos?.x ?? cx + 1
        const s = heroX >= cx ? 1 : -1
        //
        // Body — dark oval
        //
        k.drawEllipse({
          pos: k.vec2(cx, perchY),
          radiusX: 12 * sc,
          radiusY: 9 * sc,
          color: bodyColor,
          opacity: 1
        })
        //
        // Head — small circle on the beak side
        //
        k.drawCircle({
          pos: k.vec2(cx + 9 * sc * s, perchY - 8 * sc),
          radius: 7 * sc,
          color: headColor,
          opacity: 1
        })
        //
        // Wing highlight — dark feather sheen on the body side (away from head)
        //
        k.drawEllipse({
          pos: k.vec2(cx - 2 * sc * s, perchY - 1 * sc),
          radiusX: 7 * sc,
          radiusY: 4 * sc,
          color: wingColor,
          opacity: 0.9
        })
        //
        // Tail — narrow wedge pointing opposite to the beak
        //
        k.drawTriangle({
          p1: k.vec2(cx - 10 * sc * s, perchY + 2 * sc),
          p2: k.vec2(cx - 22 * sc * s, perchY + 6 * sc),
          p3: k.vec2(cx - 10 * sc * s, perchY + 9 * sc),
          color: tailColor,
          opacity: 1
        })
        //
        // Eye — on the beak side
        //
        k.drawCircle({
          pos: k.vec2(cx + 12 * sc * s, perchY - 9 * sc),
          radius: 2.2 * sc,
          color: eyeWhite,
          opacity: 1
        })
        k.drawCircle({
          pos: k.vec2(cx + 12.5 * sc * s, perchY - 9 * sc),
          radius: 1.1 * sc,
          color: pupilColor,
          opacity: 1
        })
        //
        // Beak pointing toward the hero
        //
        if (crowMp3State.mouthOpen) {
          k.drawTriangle({
            p1: k.vec2(cx + 10 * sc * s, perchY - 8 * sc),
            p2: k.vec2(cx + 20 * sc * s, perchY - 7 * sc),
            p3: k.vec2(cx + 10 * sc * s, perchY - 5 * sc),
            color: beakUpper,
            opacity: 1
          })
          k.drawTriangle({
            p1: k.vec2(cx + 10 * sc * s, perchY - 5 * sc),
            p2: k.vec2(cx + 19 * sc * s, perchY - 3 * sc),
            p3: k.vec2(cx + 10 * sc * s, perchY - 2 * sc),
            color: beakLower,
            opacity: 1
          })
          k.drawTriangle({
            p1: k.vec2(cx + 10 * sc * s, perchY - 5 * sc),
            p2: k.vec2(cx + 19 * sc * s, perchY - 5 * sc),
            p3: k.vec2(cx + 10 * sc * s, perchY - 3 * sc),
            color: mouthInner,
            opacity: 0.85
          })
        } else {
          k.drawTriangle({
            p1: k.vec2(cx + 10 * sc * s, perchY - 8 * sc),
            p2: k.vec2(cx + 20 * sc * s, perchY - 6 * sc),
            p3: k.vec2(cx + 10 * sc * s, perchY - 4 * sc),
            color: beakUpper,
            opacity: 1
          })
        }
        //
        // Feet — symmetric, grip the rock surface
        //
        k.drawLine({
          p1: k.vec2(cx + 2 * sc, perchY + 8 * sc),
          p2: k.vec2(cx + 2 * sc, perchY + 15 * sc),
          width: 1.5,
          color: feetColor,
          opacity: 1
        })
        k.drawLine({
          p1: k.vec2(cx + 8 * sc, perchY + 8 * sc),
          p2: k.vec2(cx + 8 * sc, perchY + 15 * sc),
          width: 1.5,
          color: feetColor,
          opacity: 1
        })
      }
    }
  ])
}
