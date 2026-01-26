import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import * as Bugs from '../components/bugs.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as LevelIndicator from '../components/level-indicator.js'
import * as TreeRoots from '../components/tree-roots.js'
import { createLevelTransition } from '../../../utils/transition.js'
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
    // Create dark background clouds in the distance at the top
    //
    createBackgroundClouds(k)
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
      // 1. Draw darkened ground area (removed to avoid dark line)
      //
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
    // Create level indicator (TOUCH letters)
    //
    LevelIndicator.create({
      k,
      levelNumber: 1,
      activeColor: '#8B5A50',
      inactiveColor: '#808080',
      completedColor: '#8B5A50',
      topPlatformHeight: TOP_MARGIN,
      sideWallWidth: LEFT_MARGIN
    })
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
      bodyColor: '#B0B0B0'  // Gray color for inactive state
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
      pauseTimer: 0  // Timer for tracking pause after sequence completion
    }
    
    //
    // Minimum pause after completing sequence before it's considered valid
    //
    const SEQUENCE_PAUSE_MINIMUM = 1.0  // 1 second
    
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
      
      playNextNote()
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
          outlineColor: CFG.visual.colors.outline
        })
        
        //
        // Update sprite prefix and change character sprite
        //
        const spritePrefix = `antiHero_${activeColor.replace('#', '')}_${CFG.visual.colors.outline.replace('#', '')}`
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
      antiHero: gameState.antiHeroActive ? antiHeroInst : null,  // Only set antiHero if active
      onAnnihilation: () => {
        //
        // Transition after annihilation to next level
        //
        createLevelTransition(k, 'level-touch.1', () => {
          k.go('level-touch.2')
        })
      },
      currentLevel: 'level-touch.1',
      addMouth: true
    })
    //
    // Spawn hero and anti-hero
    //
    Hero.spawn(heroInst)
    Hero.spawn(antiHeroInst)
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
    const fpsCounter = FpsCounter.create({ k })
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
    // ESC key to return to menu
    //
    k.onKeyPress("escape", () => {
      k.go("menu")
    })

function createBackgroundClouds(k) {
  //
  // Dark cloud parameters (similar to back layer trees)
  //
  const cloudTopY = TOP_MARGIN + 20  // Top Y position for clouds
  const cloudBottomY = TOP_MARGIN + 100  // Bottom Y position
  const baseCloudColor = k.rgb(36, 37, 36)  // Same color as back layer trees
  
  //
  // Create clouds spread horizontally across the screen (similar to tree distribution)
  //
  const screenWidth = k.width()
  const cloudStartX = LEFT_MARGIN + 50
  const cloudEndX = screenWidth - RIGHT_MARGIN - 50
  const cloudCoverageWidth = cloudEndX - cloudStartX
  
  //
  // Create clouds similar to back layer trees (18 trees, so 18 clouds)
  //
  const cloudCount = 18  // Same count as back layer trees
  const cloudSpacing = cloudCoverageWidth / (cloudCount - 1)
  
  //
  // Generate cloud configurations (similar to tree crown structure)
  //
  const cloudConfigs = []
  
  for (let i = 0; i < cloudCount; i++) {
    const baseX = cloudStartX + cloudSpacing * i
    //
    // Add randomness similar to trees (randomness = 20 for back layer)
    //
    const randomness = 20
    const randomOffset = (Math.random() - 0.5) * randomness
    const cloudX = baseX + randomOffset
    //
    // Random vertical position within cloud area
    //
    const randomY = cloudTopY + Math.random() * (cloudBottomY - cloudTopY)
    //
    // Crown size similar to trees: (50 + Math.random() * 60) * scale
    // For clouds, use similar range but slightly smaller scale
    //
    const crownSize = (50 + Math.random() * 60) * 1.2  // Similar to trees but slightly smaller
    //
    // Number of circles (crowns) similar to trees: 5 + Math.floor(Math.random() * 4) = 5-8
    //
    const crownCount = 5 + Math.floor(Math.random() * 4)  // 5-8 circles, same as trees
    const crowns = []
    
    //
    // Generate crown circles similar to tree crowns
    //
    for (let j = 0; j < crownCount; j++) {
      //
      // Offset similar to trees: (Math.random() - 0.5) * crownSize * 0.7 for X, * 0.5 for Y
      //
      crowns.push({
        offsetX: (Math.random() - 0.5) * crownSize * 0.7,
        offsetY: (Math.random() - 0.5) * crownSize * 0.5,
        sizeVariation: 0.6 + Math.random() * 0.6,  // Same as trees: 0.6-1.2
        opacityVariation: 0.7 + Math.random() * 0.2  // Same as trees: 0.7-0.9
      })
    }
    //
    // Opacity similar to trees: 0.85 + Math.random() * 0.1
    //
    const baseOpacity = 0.85 + Math.random() * 0.1
    
    cloudConfigs.push({
      x: cloudX,
      y: randomY,
      crownSize: crownSize,
      crowns: crowns,
      color: baseCloudColor,
      opacity: baseOpacity
    })
  }
  
  //
  // Create visual cloud layer (background, behind everything)
  //
  cloudConfigs.forEach((cloudConfig) => {
    k.add([
      k.pos(cloudConfig.x, cloudConfig.y),
      k.z(1),  // Between background (-100) and back trees (z=2), so clouds are visible
      {
        draw() {
          //
          // Draw cloud as multiple circles (similar to tree crowns)
          //
          cloudConfig.crowns.forEach((crown) => {
            k.drawCircle({
              radius: cloudConfig.crownSize * crown.sizeVariation,
              pos: k.vec2(crown.offsetX, crown.offsetY),
              color: cloudConfig.color,
              opacity: cloudConfig.opacity * crown.opacityVariation
            })
          })
        }
      }
    ])
  })
}
  })
}

