import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { saveLastLevel, isSectionComplete } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import * as Bugs from '../components/bugs.js'
import * as Dust from '../components/dust.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
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
const ANTIHERO_SPAWN_X = CFG.visual.screen.width - RIGHT_MARGIN - 100
const ANTIHERO_SPAWN_Y = FLOOR_Y - 50

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
      const treeCount = layerIndex === 0 ? 18 : (layerIndex === 1 ? 9 : 0)
      
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
    // Create background canvas with static layers
    //
    const createBackgroundCanvas = () => {
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
      // 2. Draw back layer (all trees)
      //
      if (layers[0]) {
        drawLayerToCanvas(ctx, layers[0], 0, null)
      }
      //
      // 3. Draw middle layer (all trees)
      //
      if (layers[1]) {
        drawLayerToCanvas(ctx, layers[1], 0, null)
      }
      //
      // 4. Draw 60% of front layer trees (exclude dynamic trees)
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
    
    const bgCanvas = createBackgroundCanvas()
    const bgTexture = k.loadSprite('bg-touch-0', bgCanvas.toDataURL())
    //
    // Draw background
    //
    k.onDraw(() => {
      k.drawSprite({
        sprite: 'bg-touch-0',
        pos: k.vec2(0, 0),
        anchor: "topleft"
      })
    })
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
      const size = 6 + Math.random() * 5
      const phaseOffset = Math.random() * Math.PI * 2
      const timeOffset = Math.random() * 10
      
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
              color: k.rgb(14, 16, 14),
              opacity: 0.85
            })
            
            k.drawLine({
              p1: leftWingMid,
              p2: leftWingTip,
              width: wingThickness * 2,
              color: k.rgb(14, 16, 14),
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
              color: k.rgb(14, 16, 14),
              opacity: 0.85
            })
            
            k.drawLine({
              p1: rightWingMid,
              p2: rightWingTip,
              width: wingThickness * 2,
              color: k.rgb(14, 16, 14),
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
              const sway = Math.sin(time * tree.swaySpeed + tree.swayOffset) * tree.swayAmount
              //
              // Draw trunk
              //
              const trunkCenterY = (tree.trunkTop + tree.trunkBottom) / 2
              
              k.drawRect({
                pos: k.vec2(tree.x + sway * 0.2, trunkCenterY),
                width: tree.trunkWidth,
                height: tree.trunkHeight,
                anchor: "center",
                color: tree.trunkColor,
                opacity: tree.opacity
              })
              //
              // Draw branches
              //
              if (tree.branches) {
                for (const branch of tree.branches) {
                  k.drawLine({
                    p1: k.vec2(tree.x + branch.startX + sway * 0.2, branch.startY),
                    p2: k.vec2(tree.x + branch.endX + sway * 0.3, branch.endY),
                    width: branch.width,
                    color: tree.trunkColor,
                    opacity: tree.opacity
                  })
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
                
                k.drawCircle({
                  pos: k.vec2(
                    tree.x + crown.offsetX + sway,
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
    // Create hero
    //
    const heroInst = Hero.create({
      k,
      x: HERO_SPAWN_X,
      y: HERO_SPAWN_Y,
      type: Hero.HEROES.HERO,
      controllable: true,
      sfx: sound,
      currentLevel: 'level-touch.0',
      jumpForce: CFG.game.jumpForce,
      addMouth: isWordComplete,
      bodyColor: heroBodyColor
    })
    //
    // Spawn hero after delay
    //
    const HERO_SPAWN_DELAY = 0.5
    k.wait(HERO_SPAWN_DELAY, () => {
      Hero.spawn(heroInst)
      grassDrawer.heroRef = heroInst
    })
    //
    // Create anti-hero
    //
    const antiHeroInst = Hero.create({
      k,
      x: ANTIHERO_SPAWN_X,
      y: ANTIHERO_SPAWN_Y,
      type: Hero.HEROES.ANTIHERO,
      controllable: false,
      sfx: sound,
      antiHero: null,
      addArms: true
    })
    //
    // Spawn anti-hero after delay
    //
    k.wait(HERO_SPAWN_DELAY, () => Hero.spawn(antiHeroInst))
    //
    // Link heroes for annihilation
    //
    heroInst.antiHero = antiHeroInst
    //
    // Create dust particles in game area only
    //
    const dustInst = Dust.create({ 
      k,
      bounds: {
        left: LEFT_MARGIN,
        right: CFG.visual.screen.width - RIGHT_MARGIN,
        top: TOP_MARGIN,
        bottom: CFG.visual.screen.height - BOTTOM_MARGIN
      }
    })
    //
    // Create bugs on the floor
    //
    const bugFloorY = FLOOR_Y - 10
    const bugs = []
    const floorWidth = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
    
    for (let i = 0; i < 12; i++) {
      //
      // Distribute bugs across the floor
      //
      const spacing = (floorWidth - 200) / 11
      const bugX = LEFT_MARGIN + 100 + i * spacing + (Math.random() - 0.5) * 30
      const bugScale = 0.6 + Math.random() * 0.8
      //
      // Adjust Y position based on scale to prevent legs from extending below platform
      // Keep bugs on the edge, just slightly adjust for larger scales
      //
      const bugY = bugFloorY - (bugScale - 1.0) * 8
      
      const bugInst = Bugs.create({
        k,
        x: bugX,
        y: bugY,
        hero: heroInst,
        surface: 'floor',
        scale: bugScale,
        sfx: sound,
        bounds: {
          minX: LEFT_MARGIN + 30,
          maxX: CFG.visual.screen.width - RIGHT_MARGIN - 30,
          minY: bugY,
          maxY: bugY
        }
      })
      //
      // Store original Y position
      //
      bugInst.originalY = bugY
      
      bugs.push(bugInst)
    }
    //
    // Create pushable creature with eyes
    //
    const CREATURE_X = k.width() / 2
    const CREATURE_Y = FLOOR_Y - 32
    const CREATURE_SIZE = 55
    const EYE_SIZE = 7
    const PUPIL_SIZE = 3.5
    
    const creature = k.add([
      k.rect(CREATURE_SIZE, CREATURE_SIZE, { radius: 8 }),
      k.pos(CREATURE_X, CREATURE_Y),
      k.color(80, 60, 50),
      k.outline(3, k.rgb(0, 0, 0)),
      k.area(),
      k.body({ isStatic: false, mass: 10 }),
      k.anchor("center"),
      k.z(22),
      "platform",
      {
        leftEyeX: -CREATURE_SIZE * 0.25,
        rightEyeX: CREATURE_SIZE * 0.25,
        eyeY: -CREATURE_SIZE * 0.15,
        leftPupilX: 0,
        leftPupilY: 0,
        rightPupilX: 0,
        rightPupilY: 0
      }
    ])
    //
    // Update pupil positions to look at hero
    //
    creature.onUpdate(() => {
      const heroX = heroInst.character.pos.x
      const heroY = heroInst.character.pos.y
      const MAX_PUPIL_OFFSET = EYE_SIZE * 0.4
      //
      // Left eye
      //
      const leftEyeWorldX = creature.pos.x + creature.leftEyeX
      const leftEyeWorldY = creature.pos.y + creature.eyeY
      const leftDx = heroX - leftEyeWorldX
      const leftDy = heroY - leftEyeWorldY
      const leftDist = Math.sqrt(leftDx * leftDx + leftDy * leftDy)
      
      if (leftDist > 0) {
        creature.leftPupilX = (leftDx / leftDist) * MAX_PUPIL_OFFSET
        creature.leftPupilY = (leftDy / leftDist) * MAX_PUPIL_OFFSET
      }
      //
      // Right eye
      //
      const rightEyeWorldX = creature.pos.x + creature.rightEyeX
      const rightEyeWorldY = creature.pos.y + creature.eyeY
      const rightDx = heroX - rightEyeWorldX
      const rightDy = heroY - rightEyeWorldY
      const rightDist = Math.sqrt(rightDx * rightDx + rightDy * rightDy)
      
      if (rightDist > 0) {
        creature.rightPupilX = (rightDx / rightDist) * MAX_PUPIL_OFFSET
        creature.rightPupilY = (rightDy / rightDist) * MAX_PUPIL_OFFSET
      }
    })
    //
    // Draw eyes on creature
    //
    creature.onDraw(() => {
      //
      // Left eye white
      //
      k.drawCircle({
        pos: k.vec2(creature.leftEyeX, creature.eyeY),
        radius: EYE_SIZE,
        color: k.rgb(255, 255, 255),
        opacity: 1
      })
      //
      // Left pupil
      //
      k.drawCircle({
        pos: k.vec2(creature.leftEyeX + creature.leftPupilX, creature.eyeY + creature.leftPupilY),
        radius: PUPIL_SIZE,
        color: k.rgb(0, 0, 0),
        opacity: 1
      })
      //
      // Right eye white
      //
      k.drawCircle({
        pos: k.vec2(creature.rightEyeX, creature.eyeY),
        radius: EYE_SIZE,
        color: k.rgb(255, 255, 255),
        opacity: 1
      })
      //
      // Right pupil
      //
      k.drawCircle({
        pos: k.vec2(creature.rightEyeX + creature.rightPupilX, creature.eyeY + creature.rightPupilY),
        radius: PUPIL_SIZE,
        color: k.rgb(0, 0, 0),
        opacity: 1
      })
    })
    //
    // Update bugs and dust
    //
    k.onUpdate(() => {
      bugs.forEach(bug => Bugs.onUpdate(bug, k.dt()))
      Dust.onUpdate(dustInst, k.dt())
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
    // Draw dust in front of hero but behind platforms
    //
    k.add([
      k.z(CFG.visual.zIndex.player + 3),  // Between hero (10) and platforms (15)
      {
        draw() {
          Dust.draw(dustInst)
        }
      }
    ])
    //
    // Draw bugs on top of everything
    //
    k.add([
      k.z(CFG.visual.zIndex.ui - 1),  // Just below UI layer
      {
        draw() {
          bugs.forEach(bug => Bugs.draw(bug))
        }
      }
    ])
    //
    // Return to menu on ESC
    //
    k.onKeyPress("escape", () => {
      Sound.stopAmbient(sound)
      k.go("menu")
    })
  })
}

