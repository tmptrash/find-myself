import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { saveLastLevel, isSectionComplete } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import * as Bugs from '../components/bugs.js'
import * as SmallBugs from '../components/small-bugs.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as BugPyramid from '../components/bug-pyramid.js'
import * as LevelIndicator from '../components/level-indicator.js'
import { createLevelTransition } from '../../../utils/transition.js'
//
// Bug constants (from bugs.js)
//
const BUG_BODY_SIZE = 6
//
// Platform dimensions (minimal margins for large play area)
//
const TOP_MARGIN = CFG.visual.gameArea.topMargin
const BOTTOM_MARGIN = CFG.visual.gameArea.bottomMargin
const LEFT_MARGIN = CFG.visual.gameArea.leftMargin
const RIGHT_MARGIN = CFG.visual.gameArea.rightMargin
//
// Platform dimensions
//
const FLOOR_Y = CFG.visual.screen.height - BOTTOM_MARGIN
//
// Hero spawn positions
//
const HERO_SPAWN_X = LEFT_MARGIN + 100
const HERO_SPAWN_Y = FLOOR_Y - 50
//
// Anti-hero platform (right side, above hero height)
//
const HERO_HEIGHT = 96  // SPRITE_SIZE (32) * HERO_SCALE (3)
const ANTIHERO_PLATFORM_WIDTH = 160
const ANTIHERO_PLATFORM_HEIGHT = 20
const ANTIHERO_PLATFORM_Y = FLOOR_Y - HERO_HEIGHT - 80  // Above hero height (lowered)
const ANTIHERO_PLATFORM_X = CFG.visual.screen.width - RIGHT_MARGIN / 2 - 40
const ANTIHERO_SPAWN_X = ANTIHERO_PLATFORM_X - 20  // Shift anti-hero 20px left from platform center
const ANTIHERO_SPAWN_Y = ANTIHERO_PLATFORM_Y - ANTIHERO_PLATFORM_HEIGHT / 2 - 50

/**
 * Level 0 scene for touch section - Introduction level
 * Large game area with minimal obstacles
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel0(k) {
  k.scene("level-touch.0", () => {
    //
    // Save progress
    //
    saveLastLevel('level-touch.0')
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
    // Start touch.mp3 background music
    //
    const touchMusic = k.play('touch', {
      loop: true,
      volume: CFG.audio.backgroundMusic.touch
    })
    //
    // Stop music when leaving the scene
    //
    k.onSceneLeave(() => {
      touchMusic.stop()
    })
    //
    // Draw background
    //
    k.onDraw(() => {
      k.drawRect({
        width: k.width(),
        height: k.height(),
        pos: k.vec2(0, 0),
        color: k.rgb(42, 42, 42)  // CFG.visual.colors.background
      })
    })
    //
    // Create simple bottom platform
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
    // Create level indicator (TOUCH letters)
    //
    LevelIndicator.create({
      k,
      levelNumber: 0,
      activeColor: '#8B5A50',
      inactiveColor: '#808080',
      completedColor: '#8B5A50',
      topPlatformHeight: TOP_MARGIN,
      sideWallWidth: LEFT_MARGIN
    })
    //
    //
    // Bottom platform (full width)
    //
    k.add([
      k.rect(CFG.visual.screen.width, BOTTOM_MARGIN),
      k.pos(CFG.visual.screen.width / 2, CFG.visual.screen.height - BOTTOM_MARGIN / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(31, 31, 31),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Anti-hero platform position (for reference - will be replaced by bug)
    // Note: platformCenterX is defined later when creating bug4
    //
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
    // Create two background canvases: one for back layer, one for middle+front
    //
    const createBackLayerCanvas = () => {
      const canvas = document.createElement('canvas')
      canvas.width = k.width()
      canvas.height = k.height()
      const ctx = canvas.getContext('2d')
      //
      // 1. Draw darkened ground area
      //
      if (layers.length > 0 && layers[0].trees.length > 0) {
        const backLayer = layers[0]
        const avgCrownY = backLayer.trees.reduce((sum, t) => sum + t.crownCenterY, 0) / backLayer.trees.length
        const floorY = FLOOR_Y
        
        ctx.fillStyle = 'rgb(28, 28, 28)'
        ctx.fillRect(0, avgCrownY, canvas.width, floorY - avgCrownY)
      }
      //
      // 2. Draw back layer only (layerIndex 0)
      //
      if (layers[0]) {
        drawLayerToCanvas(ctx, layers[0], 0, null)
      }
      
      return canvas
    }
    
    const createMiddleFrontCanvas = () => {
      const canvas = document.createElement('canvas')
      canvas.width = k.width()
      canvas.height = k.height()
      const ctx = canvas.getContext('2d')
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
      //
      // 1. Draw middle layer (all trees)
      //
      if (layers[1]) {
        drawLayerToCanvas(ctx, layers[1], 0, null)
      }
      //
      // 2. Draw 60% of front layer trees (exclude dynamic trees)
      //
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
      
      return canvas
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
    
    const backLayerCanvas = createBackLayerCanvas()
    const middleFrontCanvas = createMiddleFrontCanvas()
    const backTexture = k.loadSprite('bg-touch-back', backLayerCanvas.toDataURL())
    const middleFrontTexture = k.loadSprite('bg-touch-middle-front', middleFrontCanvas.toDataURL())
    //
    // Draw back layer canvas (before big bugs, z=2)
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
    // Draw middle+front layer canvas (after big bugs, z=7)
    //
    k.add([
      k.z(7),
      {
        draw() {
          k.drawSprite({
            sprite: 'bg-touch-middle-front',
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
    // Check completed sections for hero appearance
    //
    const isWordComplete = isSectionComplete('word')
    const isTimeComplete = isSectionComplete('time')
    //
    // Hero body color: yellow if time section complete, otherwise default gray
    //
    const heroBodyColor = isTimeComplete ? "#FF8C00" : "#C0C0C0"
    //
    // Big bug constants (needed for bug4 creation)
    //
    const BIG_BUG_COLOR = "#1A1C1A"  // Black color for bug4 (anti-hero platform)
    //
    // Calculate back layer tree color for bugs 1, 2, 3
    // Back layer (layerIndex 0) tree color: 12 * 0.2 + 42 * 0.8 = 36 (R), 16 * 0.2 + 42 * 0.8 = 37 (G), 12 * 0.2 + 42 * 0.8 = 36 (B)
    // Mix between black (#1A1C1A = rgb(26, 28, 26)) and tree color (#242524 = rgb(36, 37, 36))
    // Average: rgb(31, 32.5, 31) ≈ rgb(31, 33, 31) = #1F211F
    //
    const BACK_LAYER_TREE_COLOR = "#1F211F"  // Color between black and back layer trees for better visibility
    const BIG_BUG_Z_INDEX = 8  // In front of layer 1 trees (z=7), behind dynamic trees (z=25), below player (z=10)
    const BIG_BUG_LEG_SPREAD_FACTOR = 0.25
    const BIG_BUG_LEG_THICKNESS = 3.0
    const BIG_BUG_CRAWL_SPEED = 12  // Increased speed for tall bugs
    const BIG_BUG_SCALE = 3.0
    //
    // Create bug 4 (platform bug for anti-hero) before creating anti-hero
    // Note: bug4 is created here but hero reference will be set later
    //
    const BUG_BODY_SIZE_FOR_BUG4 = 6  // From bugs.js
    const bug4LegDropFactor = 0.95
    const bug4Radius = BUG_BODY_SIZE_FOR_BUG4 * 1.5 * BIG_BUG_SCALE  // Same radius as other big bugs
    //
    // Position bug4 on the right side but visible on screen
    // Place it at about 85% of screen width from left
    // Note: floorWidth is defined later, calculate it here for bug4 positioning
    //
    const bug4FloorWidth = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
    const bug4X = LEFT_MARGIN + bug4FloorWidth * 0.85
    //
    // Calculate bug4 position same way as other big bugs
    // First determine desired leg length (similar to bug1 - tallest)
    // Then calculate body Y position from floor
    // Finally adjust so that bug's back (top) is at ANTIHERO_PLATFORM_Y
    //
    // Legs length = 2 body lengths (same as bug1 and bug2)
    // 2 body lengths = BUG_BODY_SIZE * 1.5 * BIG_BUG_SCALE * 2 = 6 * 1.5 * 3.0 * 2 = 54
    const bug4LegLength1 = 28  // First segment
    const bug4LegLength2 = 26  // Second segment (total = 54, equals 2 body lengths)
    const bug4LegReach = (bug4LegLength1 + bug4LegLength2) * BIG_BUG_SCALE * bug4LegDropFactor
    //
    // Calculate body Y position so that top of head is at ANTIHERO_PLATFORM_Y
    // and legs touch FLOOR_Y
    // Top of flat head is at bug4BodyY - flatHeadHeight / 2
    // We want top of head at ANTIHERO_PLATFORM_Y
    // So: bug4BodyY = ANTIHERO_PLATFORM_Y + flatHeadHeight / 2
    //
    // For bugs with upward legs, legs go up from sides first, then down to floor
    // Legs are positioned at floorY = bug4BodyY + reach * legDropFactor
    // We want floorY = FLOOR_Y
    // So: FLOOR_Y = bug4BodyY + reach * legDropFactor
    // Therefore: reach * legDropFactor = FLOOR_Y - bug4BodyY
    // reach = (FLOOR_Y - bug4BodyY) / legDropFactor
    //
    const flatHeadHeight = bug4Radius * 0.8
    const bug4BodyY = ANTIHERO_PLATFORM_Y + flatHeadHeight / 2
    const requiredLegReach = (FLOOR_Y - bug4BodyY) / bug4LegDropFactor
    
    //
    // Calculate leg lengths to ensure legs touch FLOOR_Y
    //
    let bug4LegLength1Final, bug4LegLength2Final
    
    if (bug4LegReach < requiredLegReach) {
      //
      // Need longer legs - adjust leg lengths proportionally
      //
      const scaleFactor = requiredLegReach / bug4LegReach
      bug4LegLength1Final = bug4LegLength1 * scaleFactor
      bug4LegLength2Final = bug4LegLength2 * scaleFactor
    } else {
      //
      // Current leg lengths are sufficient
      //
      bug4LegLength1Final = bug4LegLength1
      bug4LegLength2Final = bug4LegLength2
    }
    
    const bigBug4Inst = Bugs.create({
      k,
      x: bug4X,
      y: bug4BodyY,
      hero: null,  // Will be set later after hero is created
      surface: 'floor',
      scale: BIG_BUG_SCALE,  // Same scale as other big bugs
      legLength1: bug4LegLength1Final,  // Adjusted to ensure legs touch FLOOR_Y
      legLength2: bug4LegLength2Final,  // Adjusted to ensure legs touch FLOOR_Y
      crawlSpeed: BIG_BUG_CRAWL_SPEED * 0.3,  // Slow movement
      legSpreadFactor: BIG_BUG_LEG_SPREAD_FACTOR,
      legDropFactor: bug4LegDropFactor,
      customColor: BIG_BUG_COLOR,  // Same color as other big bugs
      zIndex: BIG_BUG_Z_INDEX,
      showOutline: false,
      hasUpwardLegs: true,
      targetFloorY: FLOOR_Y,  // Use fixed FLOOR_Y for legs
      legThickness: BIG_BUG_LEG_THICKNESS,
      bodyShape: 'circle',  // Circle shape like other big bugs
      legCount: 2,
      hasUpwardLegs: true,  // Legs go up from sides first, then down
      sfx: sound,
      bounds: {
        minX: LEFT_MARGIN + bug4Radius,  // Don't go beyond left platform (account for body radius)
        maxX: CFG.visual.screen.width - RIGHT_MARGIN - bug4Radius,  // Don't go beyond right platform (account for body radius)
        minY: bug4BodyY,
        maxY: bug4BodyY
      }
    })
    //
    // Mark bug4 as having flat head (for special rendering)
    // and upward legs (legs go up from sides first, then down to floor)
    // Also mark as platform bug that doesn't react to hero
    //
    bigBug4Inst.hasFlatHead = true
    bigBug4Inst.hasUpwardLegs = true
    bigBug4Inst.isPlatformBug = true  // Don't react to hero
    //
    // Set bug to move slowly (crawling state)
    //
    bigBug4Inst.state = 'crawling'
    bigBug4Inst.vx = bigBug4Inst.crawlSpeed  // Start moving right
    bigBug4Inst.vy = 0
    bigBug4Inst.isMother = true
    bigBug4Inst.originalY = bug4BodyY
    bigBug4Inst.isScared = false
    bigBug4Inst.scareTimer = 0
    bigBug4Inst.maxDrop = 0
    //
    // Create invisible platform on bug's back (head) for anti-hero
    // Top of flat head is at ANTIHERO_PLATFORM_Y
    // Platform should be on top of the head
    //
    const bug4BackPlatformWidth = bug4Radius * 2.5  // Wide platform on bug's back
    const bug4BackPlatformHeight = 10
    //
    // Platform top should be at ANTIHERO_PLATFORM_Y (top of bug's head)
    // With anchor "top", platform top is at Y
    // So: bug4BackPlatformY = ANTIHERO_PLATFORM_Y
    //
    const bug4BackPlatformY = ANTIHERO_PLATFORM_Y
    
    const antiHeroPlatform = k.add([
      k.rect(bug4BackPlatformWidth, bug4BackPlatformHeight),
      k.pos(bug4X, bug4BackPlatformY),
      k.anchor("top"),  // Anchor at top so platform sits on head
      k.area(),
      k.body({ isStatic: true }),
      k.opacity(0),  // Invisible
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Create anti-hero first (needed for hero annihilation setup)
    // Position anti-hero directly on top of platform (on top of bug's head)
    //
    const antiHeroSpawnX = bug4X  // Center on bug's back
    const antiHeroSpawnY = bug4BackPlatformY - 50  // On top of platform (slightly above to let physics settle)
    const antiHeroInst = Hero.create({
      k,
      x: antiHeroSpawnX,
      y: antiHeroSpawnY,
      type: Hero.HEROES.ANTIHERO,
      controllable: false,
      sfx: sound,
      antiHero: null,
      addArms: true
    })
    //
    // Hide character immediately to prevent double appearance
    //
    if (antiHeroInst.character) {
      antiHeroInst.character.hidden = true
    }
    //
    // Create hero with anti-hero reference for annihilation
    //
    const heroInst = Hero.create({
      k,
      x: HERO_SPAWN_X,
      y: HERO_SPAWN_Y,
      type: Hero.HEROES.HERO,
      controllable: true,
      sfx: sound,
      antiHero: antiHeroInst,
      onAnnihilation: () => {
        //
        // Transition after annihilation to next level
        //
        createLevelTransition(k, 'level-touch.0', () => {
          k.go('level-touch.1')
        })
      },
      currentLevel: 'level-touch.0',
      jumpForce: CFG.game.jumpForce,
      addMouth: true,
      bodyColor: heroBodyColor
    })
    //
    // Hide character immediately to prevent double appearance
    //
    if (heroInst.character) {
      heroInst.character.hidden = true
    }
    //
    // Spawn hero after delay
    //
    const HERO_SPAWN_DELAY = 0.5
    let heroSpawned = false
    k.wait(HERO_SPAWN_DELAY, () => {
      if (!heroSpawned && heroInst.character) {
        Hero.spawn(heroInst)
        grassDrawer.heroRef = heroInst
        heroSpawned = true
      }
    })
    //
    // Spawn anti-hero after delay
    // Position is already set correctly at creation time
    // Use flag to ensure spawn is called only once
    //
    let antiHeroSpawned = false
    k.wait(HERO_SPAWN_DELAY, () => {
      if (!antiHeroSpawned && antiHeroInst.character) {
        Hero.spawn(antiHeroInst)
        antiHeroSpawned = true
      }
    })
    //
    // Create bugs on the floor
    //
    const bugFloorY = FLOOR_Y - 4  // Lower by 6 pixels total (was -10)
    const bugs = []  // Big bugs only
    const smallBugs = []  // Small bugs and debug bug
    const floorWidth = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
    //
    // Create three big bugs with different leg heights
    // Note: BIG_BUG_* constants are defined earlier before bug4 creation
    //
    // Bug 1: Tallest (very long legs)
    //
    const bug1LegLength1 = 100
    const bug1LegLength2 = 90
    const bug1LegDropFactor = 0.95
    const bug1LegReach = (bug1LegLength1 + bug1LegLength2) * BIG_BUG_SCALE * bug1LegDropFactor
    const bug1X = LEFT_MARGIN + floorWidth * 0.3
    const bug1Y = bugFloorY - bug1LegReach
    //
    // Set boundary for bug1: stop before bug4 and don't go beyond platforms
    //
    const bug1BodyRadius = BUG_BODY_SIZE * 1.5 * BIG_BUG_SCALE * 0.9
    const bug1MaxX = bug4X - 150  // Stop 150px before bug4
    const bug1MinX = LEFT_MARGIN + bug1BodyRadius  // Don't go beyond left platform
    const bug1MaxXWithPlatform = Math.min(bug1MaxX, CFG.visual.screen.width - RIGHT_MARGIN - bug1BodyRadius)  // Don't go beyond right platform
    
    const bigBug1Inst = Bugs.create({
      k,
      x: bug1X,
      y: bug1Y,
      hero: heroInst,
      surface: 'floor',
      scale: BIG_BUG_SCALE,
      legLength1: bug1LegLength1,
      legLength2: bug1LegLength2,
      crawlSpeed: BIG_BUG_CRAWL_SPEED,
      legSpreadFactor: BIG_BUG_LEG_SPREAD_FACTOR,
      legDropFactor: bug1LegDropFactor,
      customColor: BACK_LAYER_TREE_COLOR,
      zIndex: BIG_BUG_Z_INDEX,
      showOutline: false,
      legThickness: BIG_BUG_LEG_THICKNESS,
      bodyShape: 'circle',
      legCount: 2,
      sfx: sound,
      bounds: {
        minX: bug1MinX,
        maxX: bug1MaxXWithPlatform,
        minY: bug1Y,
        maxY: bug1Y
      }
    })
    //
    // Bug 2: Medium height
    //
    const bug2LegLength1 = 80
    const bug2LegLength2 = 70
    const bug2LegDropFactor = 0.90
    const bug2LegReach = (bug2LegLength1 + bug2LegLength2) * BIG_BUG_SCALE * bug2LegDropFactor
    const bug2X = LEFT_MARGIN + floorWidth * 0.6
    const bug2Y = bugFloorY - bug2LegReach
    //
    // Set boundary for bug2: stop before bug4 and don't go beyond platforms
    //
    const bug2BodyRadius = BUG_BODY_SIZE * 1.5 * BIG_BUG_SCALE * 0.9
    const bug2MaxX = bug4X - 150  // Stop 150px before bug4
    const bug2MinX = LEFT_MARGIN + bug2BodyRadius  // Don't go beyond left platform
    const bug2MaxXWithPlatform = Math.min(bug2MaxX, CFG.visual.screen.width - RIGHT_MARGIN - bug2BodyRadius)  // Don't go beyond right platform
    
    const bigBug2Inst = Bugs.create({
      k,
      x: bug2X,
      y: bug2Y,
      hero: heroInst,
      surface: 'floor',
      scale: BIG_BUG_SCALE,
      legLength1: bug2LegLength1,
      legLength2: bug2LegLength2,
      crawlSpeed: BIG_BUG_CRAWL_SPEED,
      legSpreadFactor: BIG_BUG_LEG_SPREAD_FACTOR,
      legDropFactor: bug2LegDropFactor,
      customColor: BACK_LAYER_TREE_COLOR,
      zIndex: BIG_BUG_Z_INDEX,
      showOutline: false,
      legThickness: BIG_BUG_LEG_THICKNESS,
      bodyShape: 'circle',
      legCount: 2,
      sfx: sound,
      bounds: {
        minX: bug2MinX,
        maxX: bug2MaxXWithPlatform,
        minY: bug2Y,
        maxY: bug2Y
      }
    })
    //
    // Update bug4 hero reference now that hero is created
    //
    bigBug4Inst.hero = heroInst
    //
    // Store state for all big bugs and add to bugs array
    //
    const bigBugs = [
      { inst: bigBug1Inst, y: bug1Y },
      { inst: bigBug2Inst, y: bug2Y },
      { inst: bigBug4Inst, y: bug4BodyY }
    ]
    
    bigBugs.forEach(({ inst, y }) => {
      inst.originalY = y
      inst.isScared = false
      inst.scareTimer = 0
      inst.scareDuration = 2.0
      inst.maxDrop = 0
      inst.isMother = true
      inst.justRecovered = false
      bugs.push(inst)
    })
    //
    // Create regular bugs
    //
    for (let i = 0; i < 12; i++) {
      //
      // Distribute bugs across the floor
      //
      const spacing = (floorWidth - 200) / 11
      const bugX = LEFT_MARGIN + 100 + i * spacing + (Math.random() - 0.5) * 30
      // Larger bugs with smaller size variation - closer to big bugs
      const bugScale = 1.0 + Math.random() * 0.3  // Range: 1.0 to 1.3 (was 0.6 to 1.4)
      //
      // Use longer legs for small bugs to ensure they reach the floor and extend fully
      // Longer legs help prevent knees from touching ground - legs should stand on foot tips
      //
      const smallBugLegLength1 = 12  // Longer first segment
      const smallBugLegLength2 = 11  // Longer second segment
      const smallBugLegReach = (smallBugLegLength1 + smallBugLegLength2) * bugScale
      const smallBugLegDropFactor = 1.0  // Full drop factor to ensure legs reach floor
      //
      // Calculate body Y position so legs touch the floor
      // Need to account for body radius - body center is at bugY, but bottom of body is at bugY + bodyRadius
      // Legs attach to bottom of body, so: floorY = bugY + bodyRadius + reach * legDropFactor
      // We want floorY = bugFloorY
      // So: bugY = bugFloorY - bodyRadius - reach * legDropFactor
      // Add extra offset to lower body position
      //
      const bodyRadius = BUG_BODY_SIZE * 1.5 * bugScale * 0.9
      const bodyLowerOffset = 10  // Additional offset to lower body (reduced to straighten legs)
      const bugY = bugFloorY - bodyRadius - smallBugLegReach * smallBugLegDropFactor + bodyLowerOffset
      
      const bugInst = SmallBugs.create({
        k,
        x: bugX,
        y: bugY,
        hero: heroInst,
        surface: 'floor',
        scale: bugScale,
        legLength1: smallBugLegLength1,
        legLength2: smallBugLegLength2,
        legDropFactor: smallBugLegDropFactor,
        targetFloorY: bugFloorY,  // Explicitly set floor Y so legs touch platform
        legSpreadFactor: 0.3,  // Keep legs close to body
        legCount: 4,  // Will be converted to 6 legs by component logic
        sfx: sound,
        touchRadius: 50,  // Increased distance for level 0
        bounds: {
          minX: LEFT_MARGIN + 30,
          maxX: CFG.visual.screen.width - RIGHT_MARGIN - 30,
          minY: bugY,
          maxY: bugY
        }
      })
      //
      // Store original Y position and escape state
      //
      bugInst.originalY = bugY
      bugInst.isScared = false
      bugInst.scareTimer = 0
      bugInst.scareDuration = 2.0
      bugInst.maxDrop = 0
      bugInst.isMother = false
      bugInst.justRecovered = false
      
      smallBugs.push(bugInst)
    }
    //
    // Update bug4 platform and anti-hero position to follow bug movement
    //
    k.onUpdate(() => {
      //
      // Sync platform and anti-hero with bug4 movement
      //
      if (bigBug4Inst && antiHeroPlatform && antiHeroInst) {
        //
        // Update platform position to follow bug's head top
        // Top of flat head is at bug4BodyY - flatHeadHeight / 2
        //
        const flatHeadHeight = bug4Radius * 0.8
        const headTopY = bigBug4Inst.y - flatHeadHeight / 2
        antiHeroPlatform.pos.x = bigBug4Inst.x
        antiHeroPlatform.pos.y = headTopY
        
        //
        // Update anti-hero position to stay on platform
        //
        if (antiHeroInst.character) {
          antiHeroInst.character.pos.x = bigBug4Inst.x
          //
          // Keep anti-hero on platform (let physics handle Y, but sync X)
          //
        }
      }
    })
    //
    // Add hero collision check for bugs to trigger scare behavior
    //
    k.onUpdate(() => {
      const heroX = heroInst.character.pos.x
      const heroY = heroInst.character.pos.y
      const HERO_RADIUS = 50  // Increased distance for level 0
      const dt = k.dt()
      
      for (const bugInst of bugs) {
        //
        // Bugs in pyramid don't react to hero (don't get scared)
        // Platform bug (bug4) also doesn't react to hero
        //
        if (bugInst.state === 'pyramid' || bugInst.isPlatformBug) {
          continue
        }
        
        const dx = bugInst.x - heroX
        const dy = bugInst.y - heroY
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        //
        // Update justRecovered timer - reset after short time regardless of distance
        //
        if (bugInst.justRecovered) {
          if (bugInst.justRecoveredTimer === undefined) {
            bugInst.justRecoveredTimer = 0.5  // Short cooldown period
          }
          bugInst.justRecoveredTimer -= dt
          if (bugInst.justRecoveredTimer <= 0) {
            bugInst.justRecovered = false
            bugInst.justRecoveredTimer = undefined
          }
        }
        
        if (distance < HERO_RADIUS) {
          //
          // Hero is close
          //
          if (!bugInst.isScared && !bugInst.justRecovered) {
            //
            // Bug gets scared
            //
            bugInst.isScared = true
            bugInst.scareTimer = 0
            bugInst.state = 'scared'
            bugInst.vx = 0
            bugInst.vy = 0
            //
            // Play scare sound
            //
            sound && Sound.playBugScareSound(sound)
            //
            // Calculate max drop based on actual leg lengths
            //
            const reach = (bugInst.legLength1 + bugInst.legLength2) * bugInst.scale
            bugInst.maxDrop = reach * 0.5
          }
        }
        
        if (bugInst.isScared) {
          //
          // Bug is scared - drop body and wait
          //
          if (bugInst.dropOffset < bugInst.maxDrop) {
            bugInst.dropOffset += dt * 200
            if (bugInst.dropOffset > bugInst.maxDrop) bugInst.dropOffset = bugInst.maxDrop
          }
          //
          // Count scare time
          //
          bugInst.scareTimer += dt
          
          if (bugInst.scareTimer >= bugInst.scareDuration) {
            //
            // Scare duration is over - determine escape direction and start crawling
            // Direction is based on hero position at THIS moment
            //
            const currentDx = bugInst.x - heroX
            const escapeDirection = currentDx < 0 ? -1 : 1
            //
            // Start crawling away from hero
            //
            bugInst.isScared = false
            bugInst.justRecovered = true
            bugInst.justRecoveredTimer = 0.5  // Short cooldown period
            bugInst.state = 'crawling'
            bugInst.movementAngle = escapeDirection < 0 ? Math.PI : 0
            bugInst.vx = Math.cos(bugInst.movementAngle) * bugInst.crawlSpeed
            bugInst.vy = 0
          }
        }
        
        if (!bugInst.isScared && bugInst.dropOffset > 0) {
          //
          // Lift body back up when not scared
          //
          bugInst.dropOffset -= dt * 150
          if (bugInst.dropOffset < 0) bugInst.dropOffset = 0
        }
      }
    })
    //
    // Bug pyramid system
    //
    const activePyramids = []
    const pyramidCheckInterval = 0.5  // Check for groups every 0.5 seconds
    let pyramidCheckTimer = 0
    
    //
      // Update bugs and pyramids
    //
    k.onUpdate(() => {
      const dt = k.dt()
      
      bugs.forEach(bug => Bugs.onUpdate(bug, dt))
      smallBugs.forEach(bug => SmallBugs.onUpdate(bug, dt))
      
      //
      // Update active pyramids (iterate backwards to safely remove)
      //
      for (let i = activePyramids.length - 1; i >= 0; i--) {
        const pyramid = activePyramids[i]
        BugPyramid.onUpdate(pyramid, dt)
        //
        // Check for bugs that can join this pyramid
        // Check both big bugs and small bugs
        //
        if (pyramid.isActive) {
          const allBugs = [...bugs, ...smallBugs]
          const availableBugs = allBugs.filter(bug => 
            bug.isMother === false && 
            bug.state !== 'pyramid' && 
            bug.state !== 'scared' &&
            bug.state !== 'recovering' &&
            !bug.isScattering
          )
          
          availableBugs.forEach(bug => {
            //
            // Check distance to pyramid center
            //
            const dx = bug.x - pyramid.centerX
            const dy = bug.y - pyramid.centerY
            const dist = Math.sqrt(dx * dx + dy * dy)
            
            if (dist <= 60) {  // JOIN_DETECTION_RADIUS
              //
              // Try to add bug to pyramid (timer will be reset to 0 in addBug)
              //
              const added = BugPyramid.addBug(pyramid, bug)
              if (added) {
                //
                // Bug successfully added, timer reset to 0 for another 5 seconds
                //
              }
            }
          })
        }
        //
        // Remove destroyed pyramids
        //
        if (!pyramid.isActive) {
          activePyramids.splice(i, 1)
        }
      }
      
      //
      // Check for new bug groups to form pyramids
      //
      pyramidCheckTimer += dt
      if (pyramidCheckTimer >= pyramidCheckInterval) {
        pyramidCheckTimer = 0
        
        //
        // Check if any bugs are still scattering (can't form new pyramid until all scattered)
        //
        const anyScattering = bugs.some(bug => bug.isScattering === true)
        
        if (anyScattering) {
          //
          // Wait for all bugs to finish scattering before allowing new pyramid
          //
          return
        }
        
        //
        // Get only small bugs (not in pyramid, not scared, not scattering)
        // Use all bugs (big + small) and filter for small bugs
        //
        const allBugs = [...bugs, ...smallBugs]
        const availableSmallBugs = allBugs.filter(bug => 
          bug.isMother === false && 
          bug.state !== 'pyramid' && 
          bug.state !== 'scared' &&
          bug.state !== 'recovering' &&
          !bug.isScattering
        )
        
        //
        // Find bug groups
        //
        const group = BugPyramid.findBugGroup(availableSmallBugs)
        
        if (group && group.length >= 5) {
          //
          // Check if bugs in this group are already in a pyramid
          //
          const alreadyInPyramid = group.some(bug => 
            activePyramids.some(pyramid => 
              pyramid.bugs.some(b => b.inst === bug)
            )
          )
          
          if (!alreadyInPyramid) {
            //
            // Create new pyramid
            //
            const pyramid = BugPyramid.create({
              k,
              bugs: group,
              hero: heroInst
            })
            
            if (pyramid) {
              activePyramids.push(pyramid)
            }
          }
        }
      }
    })
    //
    // Create FPS counter
    //
    const fpsCounter = FpsCounter.create({ k })
    //
    // Update FPS counter
    //
    k.onUpdate(() => {
      FpsCounter.onUpdate(fpsCounter)
    })
    //
    // Draw bugs with individual z-indices
    //
    bugs.forEach(bugInst => {
    k.add([
        k.z(bugInst.zIndex),
      {
        draw() {
            Bugs.draw(bugInst)
        }
      }
    ])
    })
    //
    // Draw small bugs (including debug bug)
    //
    smallBugs.forEach(bugInst => {
      k.add([
        k.z(bugInst.zIndex),
        {
          draw() {
            SmallBugs.draw(bugInst)
          }
        }
      ])
    })
    //
    // Return to menu on ESC
    //
    k.onKeyPress("escape", () => {
      Sound.stopAmbient(sound)
      k.go("menu")
    })
  })
}

