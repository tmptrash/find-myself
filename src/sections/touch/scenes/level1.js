import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set, get } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import * as Bugs from '../components/bugs.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as LevelIndicator from '../components/level-indicator.js'
import * as TreeRoots from '../components/tree-roots.js'
import { createLevelTransition } from '../../../utils/transition.js'
import { toPng, getRGB, parseHex } from '../../../utils/helper.js'
import * as FallingLeaf from '../components/falling-leaf.js'
import * as Rain from '../components/rain.js'
import * as Tooltip from '../../../utils/tooltip.js'
import * as LifeDeduction from '../utils/life-deduction.js'
import * as GiantWorm from '../components/giant-worm.js'
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
const WALL_COLOR_HEX = '#1F1F1F'
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
const SMALL_HERO_TOOLTIP_TEXT = "your score"
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
const WORM_SEGMENT_COUNT = 7
const WORM_SEGMENT_RADIUS = 3.2
const WORM_REST_SPACING = 5
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
const WORM_BULGE_AMOUNT = 1.2
const WORM_TRAIL_FADE_SPEED = 0.0003
const WORM_TRAIL_MAX_POINTS = 4000
const WORM_TRAIL_COLOR = '#0A0A0A'
const WORM_BODY_COLOR = '#5C3A1E'
const WORM_HEAD_COLOR = '#7A4E2A'
const WORM_EYE_RADIUS = 1.4
const WORM_PUPIL_RADIUS = 0.7
const WORM_EYE_SPACING = 2.0
const WORM_COUNT = 3
const WORM_Y_ZONE_HEIGHT = 15
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
const LIFE_DEDUCT_FLAG = 'touch.level1DeductDone'
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
    k.setBackground(k.rgb(31, 31, 31))
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
        color: k.rgb(42, 42, 42)
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
    const bgColor = { r: 42, g: 42, b: 42 }
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
      const grassDensity = layerIndex === 0 ? 120 : (layerIndex === 1 ? 50 : 25)
      const bladesCount = Math.floor(grassDensity * scale)
      
      for (let i = 0; i < bladesCount; i++) {
        const baseX = LEFT_MARGIN + Math.random() * playableWidth
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
      const treeCount = layerIndex === 0 ? 18 : (layerIndex === 1 ? 5 : 0)
      
      for (let i = 0; i < treeCount; i++) {
        const spacing = playableWidth / (treeCount - 1)
        const randomness = layerIndex === 0 ? 20 : (layerIndex === 1 ? 40 : 25)
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
          const isBush = Math.random() < 0.35
          
          if (isBush) {
            const bushWidth = (30 + Math.random() * 30) * scale
            const bushHeight = (25 + Math.random() * 25) * scale
            const bushCenterY = grassY + yOffset - bushHeight * 0.6
            
            const colorType = Math.floor(Math.random() * 4)
            let baseLeafR, baseLeafG, baseLeafB
            
            if (colorType === 0) {
              baseLeafR = 35
              baseLeafG = 70
              baseLeafB = 35
            } else if (colorType === 1) {
              baseLeafR = 75
              baseLeafG = 65
              baseLeafB = 25
            } else if (colorType === 2) {
              baseLeafR = 85
              baseLeafG = 45
              baseLeafB = 25
            } else {
              baseLeafR = 70
              baseLeafG = 35
              baseLeafB = 30
            }
            
            const crownCount = 12 + Math.floor(Math.random() * 8)
            const crowns = []
            
            for (let j = 0; j < crownCount; j++) {
              const angle = Math.random() * Math.PI * 2
              const radiusX = Math.random() * 0.9
              const radiusY = Math.random() * 0.9
              
              const x = Math.cos(angle) * radiusX * bushWidth
              const y = Math.sin(angle) * radiusY * bushHeight
              
              const heightRatio = (y + bushHeight) / (bushHeight * 2)
              const centerDistance = Math.sqrt((x * x) / (bushWidth * bushWidth) + (y * y) / (bushHeight * bushHeight))
              
              const isTop = heightRatio > 0.6
              const brightness = isTop ? 15 + Math.random() * 20 : -10 + Math.random() * 10
              
              const size = centerDistance < 0.4 ? 0.3 + Math.random() * 0.2 :
                          0.2 + Math.random() * 0.2
              
              crowns.push({
                offsetX: x,
                offsetY: y,
                sizeVariation: size,
                opacityVariation: 0.8 + Math.random() * 0.2,
                colorShift: brightness
              })
            }
            
            const bush = {
              x: posX,
              y: bushCenterY,
              size: Math.max(bushWidth, bushHeight),
              crowns: crowns,
              color: k.rgb(baseLeafR, baseLeafG, baseLeafB),
              opacity: 0.95
            }
            
            bushes.push(bush)
          } else {
            const baseTreeHeight = (250 + Math.random() * 400) * scale
            const crownCenterY = grassY + yOffset - baseTreeHeight
            const trunkBottom = grassY
            const trunkActualHeight = baseTreeHeight * (0.6 + Math.random() * 0.1)
            const trunkTop = trunkBottom - trunkActualHeight
            const trunkWidth = (5 + Math.random() * 3) * scale
            const crownWidth = (45 + Math.random() * 35) * scale
            const crownHeight = (50 + Math.random() * 40) * scale
            
            const colorType = Math.floor(Math.random() * 4)
            let baseLeafR, baseLeafG, baseLeafB
            
            if (colorType === 0) {
              baseLeafR = 40
              baseLeafG = 75
              baseLeafB = 40
            } else if (colorType === 1) {
              baseLeafR = 80
              baseLeafG = 70
              baseLeafB = 30
            } else if (colorType === 2) {
              baseLeafR = 90
              baseLeafG = 50
              baseLeafB = 30
            } else {
              baseLeafR = 75
              baseLeafG = 40
              baseLeafB = 35
            }
            
            const branchCount = 3 + Math.floor(Math.random() * 3)
            const branches = []
            let highestBranchY = trunkBottom
            
            for (let b = 0; b < branchCount; b++) {
              const branchAngle = ((b / branchCount) * Math.PI * 1.2 - Math.PI * 0.6) + (Math.random() - 0.5) * 0.4
              const branchLength = (50 + Math.random() * 40) * scale
              const branchWidth = trunkWidth * (0.6 + Math.random() * 0.3)
              const branchStartHeight = trunkTop + trunkActualHeight * (0.3 + Math.random() * 0.4)
              
              if (branchStartHeight < highestBranchY) {
                highestBranchY = branchStartHeight
              }
              
              branches.push({
                startX: 0,
                startY: branchStartHeight,
                endX: Math.sin(branchAngle) * branchLength,
                endY: branchStartHeight - Math.abs(Math.cos(branchAngle)) * branchLength,
                width: branchWidth,
                angle: branchAngle
              })
            }
            
            const actualTrunkTop = highestBranchY
            const actualTrunkHeight = trunkBottom - actualTrunkTop
            
            const crownCount = 25 + Math.floor(Math.random() * 15)
            const crowns = []
            
            for (let j = 0; j < crownCount; j++) {
              const branchIndex = Math.floor(Math.random() * branches.length)
              const branch = branches[branchIndex]
              const alongBranch = 0.4 + Math.random() * 0.6
              
              const branchX = branch.startX + (branch.endX - branch.startX) * alongBranch
              const branchY = branch.startY + (branch.endY - branch.startY) * alongBranch
              
              const clusterRadius = (18 + Math.random() * 25) * scale
              const angle = Math.random() * Math.PI * 2
              const distance = Math.random() * clusterRadius
              
              const x = branchX + Math.cos(angle) * distance
              const y = branchY + Math.sin(angle) * distance * 0.8
              
              const distFromBranch = distance / clusterRadius
              const heightFromGround = (y - crownCenterY) / crownHeight
              
              const isTop = heightFromGround < -0.3
              const brightness = isTop ? 15 + Math.random() * 25 : -15 + Math.random() * 15
              
              const size = distFromBranch < 0.5 ? 0.25 + Math.random() * 0.25 :
                          0.15 + Math.random() * 0.2
              
              crowns.push({
                offsetX: x,
                offsetY: y - crownCenterY,
                sizeVariation: size,
                opacityVariation: 0.8 + Math.random() * 0.2,
                colorShift: brightness
              })
            }
            
            const tree = {
              x: posX,
              y: grassY + yOffset,
              trunkTop: actualTrunkTop,
              trunkBottom: trunkBottom,
              trunkHeight: actualTrunkHeight,
              trunkWidth: trunkWidth,
              crownSize: Math.max(crownWidth, crownHeight),
              crownCenterY: crownCenterY,
              crowns: crowns,
              branches: branches,
              trunkColor: k.rgb(
                60 + Math.random() * 20,
                40 + Math.random() * 15,
                25 + Math.random() * 10
              ),
              leafColor: k.rgb(
                baseLeafR,
                baseLeafG,
                baseLeafB
              ),
              opacity: 0.95,
              swaySpeed: 0.15 + Math.random() * 0.1,
              swayAmount: (0.8 + Math.random() * 1.0) * scale,
              swayOffset: Math.random() * Math.PI * 2
            }
            
            trees.push(tree)
          }
        }
      }
      
      layers.push({ grassBlades, bushes, trees, name: config.name })
    }
    //
    // Create two background canvases:
    // 1. Back canvas (z=2): clouds + back trees + middle trees
    // 2. Front static canvas (z=7): 60% of front trees (static ones)
    //
    const createBackCanvas = () => {
      return toPng({ width: k.width(), height: k.height(), pixelRatio: 1 }, (ctx) => {
        //
        // Draw back layer trees
        //
        if (layers[0]) {
          drawLayerToCanvas(ctx, layers[0], 0, null)
        }
        //
        // Draw middle layer trees
        //
        if (layers[1]) {
          drawLayerToCanvas(ctx, layers[1], 0, null)
        }
      })
    }
    
    const createFrontStaticCanvas = () => {
      //
      // Calculate dynamic tree indices (will be drawn separately)
      //
      const allFrontTrees = layers[2] ? layers[2].trees : []
      const dynamicTreesSet = new Set()
      for (let i = 0; i < allFrontTrees.length; i++) {
        if (i % 5 < 2) {
          dynamicTreesSet.add(i)
        }
      }
      
      return toPng({ width: k.width(), height: k.height(), pixelRatio: 1 }, (ctx) => {
        if (layers[2]) {
          const staticTrees = layers[2].trees.filter((_, i) => !dynamicTreesSet.has(i))
          const frontLayerStatic = {
            trees: staticTrees,
            bushes: layers[2].bushes,
            grassBlades: layers[2].grassBlades,
            name: layers[2].name
          }
          drawLayerToCanvas(ctx, frontLayerStatic, 0, null)
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
    k.loadSprite('bg-touch-back', backDataURL)
    k.loadSprite('bg-touch-front-static', frontStaticDataURL)
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
    //
    // Create birds flying in the background
    //
    const birds = []
    const BIRD_COUNT = 5
    const SKY_HEIGHT = 400
    
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
        isFlapping: Math.random() > 0.5,
        flapTimer: Math.random() * 3,
        flapDuration: 0.8 + Math.random() * 0.4,
        glideDuration: 2.0 + Math.random() * 2.0
      })
    }
    
    k.add([
      k.z(5),
      {
        draw() {
          const time = k.time()
          const dt = k.dt()
          
          for (const bird of birds) {
            //
            // Update position
            //
            bird.x += bird.speed * dt
            //
            // Wrap around screen
            //
            if (bird.x > k.width() + 50) {
              bird.x = -50
              bird.baseY = TOP_MARGIN + Math.random() * SKY_HEIGHT
            }
            //
            // Sine wave flight pattern
            //
            bird.y = bird.baseY + Math.sin((time + bird.timeOffset) * bird.frequency + bird.phaseOffset) * bird.amplitude
            //
            // Update flapping state timer
            //
            bird.flapTimer += dt
            const currentDuration = bird.isFlapping ? bird.flapDuration : bird.glideDuration
            
            if (bird.flapTimer > currentDuration) {
              bird.isFlapping = !bird.isFlapping
              bird.flapTimer = 0
            }
            //
            // Wing animation: flap or glide
            //
            let wingAngle
            if (bird.isFlapping) {
              bird.wingPhase = Math.sin((time + bird.timeOffset) * 8 + bird.phaseOffset)
              wingAngle = bird.wingPhase * 0.8
            } else {
              wingAngle = 0.7
            }
            //
            // Draw bird as simple wing silhouette (like seagull from distance)
            //
            const wingSpan = bird.size * 2.5
            const wingHeight = Math.abs(wingAngle) * wingSpan * 0.3
            const wingThickness = bird.size * 0.15
            //
            // Left wing - curved line
            //
            const leftWingTip = k.vec2(bird.x - wingSpan, bird.y - wingHeight)
            const leftWingMid = k.vec2(
              bird.x - wingSpan * 0.5,
              bird.y - wingHeight * 0.5
            )
            
            k.drawLine({
              p1: k.vec2(bird.x, bird.y),
              p2: leftWingMid,
              width: wingThickness * 3,
              color: bird.color,
              opacity: 0.85
            })
            
            k.drawLine({
              p1: leftWingMid,
              p2: leftWingTip,
              width: wingThickness * 2,
              color: bird.color,
              opacity: 0.85
            })
            //
            // Right wing - curved line
            //
            const rightWingTip = k.vec2(bird.x + wingSpan, bird.y - wingHeight)
            const rightWingMid = k.vec2(
              bird.x + wingSpan * 0.5,
              bird.y - wingHeight * 0.5
            )
            
            k.drawLine({
              p1: k.vec2(bird.x, bird.y),
              p2: rightWingMid,
              width: wingThickness * 3,
              color: bird.color,
              opacity: 0.85
            })
            
            k.drawLine({
              p1: rightWingMid,
              p2: rightWingTip,
              width: wingThickness * 2,
              color: bird.color,
              opacity: 0.85
            })
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
    // Create dynamic foreground trees drawer (40% of front layer)
    //
    if (layers[2]) {
      const allFrontTrees = layers[2].trees
      const dynamicTreesIndices = []
      const staticTreesIndices = []
      //
      // Distribute trees: every 3rd tree is dynamic, others are static
      //
      for (let i = 0; i < allFrontTrees.length; i++) {
        if (i % 5 < 2) {
          dynamicTreesIndices.push(i)
        } else {
          staticTreesIndices.push(i)
        }
      }
      
      const dynamicTrees = dynamicTreesIndices.map(i => allFrontTrees[i])
      
      k.add([
        k.z(25),
        {
          draw() {
            const time = k.time()
            
            for (const tree of dynamicTrees) {
              const sway = Math.sin(time * tree.swaySpeed + tree.swayOffset) * tree.swayAmount * 8
              //
              // Draw trunk (no sway)
              //
              const trunkCenterY = (tree.trunkTop + tree.trunkBottom) / 2
              
              k.drawRect({
                pos: k.vec2(tree.x, trunkCenterY),
                width: tree.trunkWidth,
                height: tree.trunkHeight,
                anchor: "center",
                color: tree.trunkColor,
                opacity: tree.opacity
              })
              //
              // Draw branches (no sway)
              //
              if (tree.branches) {
                for (const branch of tree.branches) {
                  k.drawLine({
                    p1: k.vec2(tree.x + branch.startX, branch.startY),
                    p2: k.vec2(tree.x + branch.endX, branch.endY),
                    width: branch.width,
                    color: tree.trunkColor,
                    opacity: tree.opacity
                  })
                }
              }
              //
              // Draw crowns (each crown sways independently)
              //
              for (const crown of tree.crowns) {
                const colorShift = crown.colorShift || 0
                const leafR = Math.min(255, tree.leafColor.r + colorShift)
                const leafG = Math.min(255, tree.leafColor.g + colorShift)
                const leafB = Math.min(255, tree.leafColor.b + colorShift)
                //
                // Each crown circle has its own sway based on its position
                //
                const crownPhase = crown.offsetX * 0.1 + crown.offsetY * 0.1
                const crownSway = Math.sin(time * tree.swaySpeed * 5 + tree.swayOffset + crownPhase) * tree.swayAmount * 6
                
                k.drawCircle({
                  pos: k.vec2(
                    tree.x + crown.offsetX + crownSway,
                    tree.crownCenterY + crown.offsetY
                  ),
                  radius: tree.crownSize * crown.sizeVariation,
                  color: k.rgb(leafR, leafG, leafB),
                  opacity: tree.opacity * crown.opacityVariation
                })
              }
            }
          }
        }
      ])
    }
    //
    // Create walls and boundaries
    //
    //
    // Create walls and boundaries
    //
    //
    // Left wall (full height)
    //
    k.add([
      k.rect(LEFT_MARGIN, CFG.visual.screen.height),
      k.pos(LEFT_MARGIN / 2, CFG.visual.screen.height / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(31, 31, 31),
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
      k.color(31, 31, 31),
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
      k.color(31, 31, 31),
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
    const alreadyDeducted = get(LIFE_DEDUCT_FLAG, false)
    const leavesAlreadyActive = get(LIFE_DEDUCT_LEAVES_FLAG, false)
    const alreadyVisited = get(LIFE_DEDUCT_VISITED_FLAG, false)
    const eligible = !alreadyDeducted && currentLifeScore >= LIFE_DEDUCT_THRESHOLD
    //
    // Determine whether to show deduction and whether leaves should fall
    //
    let showDeduction = false
    let leavesActive = leavesAlreadyActive
    if (eligible && !alreadyVisited) {
      set(LIFE_DEDUCT_VISITED_FLAG, true)
    } else if (eligible && alreadyVisited) {
      showDeduction = true
      leavesActive = true
    }
    //
    // Scene-level lock: hero controls disabled during life deduction animation
    //
    const sceneLock = { locked: showDeduction }
    //
    // Bottom platform (full width) - raised by 200px, but extends to bottom
    //
    k.add([
      k.rect(CFG.visual.screen.width, BOTTOM_MARGIN + 200),
      k.pos(CFG.visual.screen.width / 2, CFG.visual.screen.height - (BOTTOM_MARGIN + 200) / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(31, 31, 31),
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
    if (showDeduction) {
      LifeDeduction.show({
        k,
        currentScore: currentLifeScore,
        levelIndicator,
        sound,
        deductFlag: LIFE_DEDUCT_FLAG,
        extraFlags: [LIFE_DEDUCT_LEAVES_FLAG],
        sceneLock,
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
      heroBodyColor
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
    // Worms crawling along the root level leaving dark trails
    //
    for (let i = 0; i < WORM_COUNT; i++) {
      createWorm(k, i)
    }
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
    const WORM_TOOLTIP_TEXT = 'you are my soulmate'
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
      onPoisonHit: () => onPoisonLeafDeath(k, heroInst, levelIndicator)
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
            opacity: 0.4
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
    // ESC key to return to menu
    //
    k.onKeyPress("escape", () => {
      k.go("menu")
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
    k.wait(POISON_DEATH_RELOAD_DELAY, () => k.go('level-touch.1'))
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
  k.loadSprite(CORNER_SPRITE_NAME, cornerDataURL)
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
  // Bottom-left corner (rotate 270°) — at FLOOR_Y (raised platform)
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(LEFT_MARGIN, FLOOR_Y),
    k.rotate(270),
    k.z(CFG.visual.zIndex.platforms + 1)
  ])
  //
  // Bottom-right corner (rotate 180°) — at FLOOR_Y (raised platform)
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(CFG.visual.screen.width - RIGHT_MARGIN, FLOOR_Y),
    k.rotate(180),
    k.z(CFG.visual.zIndex.platforms + 1)
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
  //
  // Dark trail behind the worm
  //
  for (const pt of inst.trail) {
    k.drawRect({
      pos: k.vec2(pt.x - 2.5, pt.y - 1),
      width: 5,
      height: 2,
      color: k.rgb(trailRgb[0], trailRgb[1], trailRgb[2]),
      opacity: pt.opacity * 0.8
    })
  }
  //
  // Body segments: radius pulses with the contraction wave (thick when contracted)
  //
  for (let i = inst.segments.length - 1; i >= 0; i--) {
    const seg = inst.segments[i]
    const isHead = i === 0
    const isTail = i === inst.segments.length - 1
    const segWave = (Math.sin((inst.wavePhase - i * WORM_WAVE_DELAY) * Math.PI * 2) + 1) / 2
    //
    // Bulge inverted: thick when contracted (wave low), thin when extended (wave high)
    //
    const bulge = 1 - segWave
    let r = WORM_SEGMENT_RADIUS + bulge * WORM_BULGE_AMOUNT
    if (isHead) r += 0.6
    if (isTail) r -= 0.4
    const rgb = isHead ? headRgb : bodyRgb
    k.drawCircle({
      pos: k.vec2(seg.x, seg.y),
      radius: r + 1,
      color: k.rgb(0, 0, 0)
    })
    k.drawCircle({
      pos: k.vec2(seg.x, seg.y),
      radius: r,
      color: k.rgb(rgb[0], rgb[1], rgb[2])
    })
    isHead && drawWormEyes(k, inst, seg)
  }
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
    onPoisonLeafDeath(k, heroInst, levelIndicator)
  }
}
