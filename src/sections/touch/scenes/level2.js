import { CFG } from '../cfg.js'
import { CFG as GLOBAL_CFG } from '../../../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set, get } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import { toPng } from '../../../utils/helper.js'
import { drawFirTree } from '../components/fir-tree.js'
import * as Dust from '../components/dust.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as LevelIndicator from '../components/level-indicator.js'
import { createLevelTransition } from '../../../utils/transition.js'
import { arcY } from '../utils/trees.js'
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
/**
 * Level 2 scene for touch section - Simple level without obstacles
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel2(k) {
  k.scene("level-touch.2", () => {
    //
    // Save progress
    //
    set('lastLevel', 'level-touch.2')
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
    // Start touch.mp3 background music with same volume as level 0
    // Use global CFG to ensure same volume as level 0
    //
    const touchMusic = k.play('touch', {
      loop: true,
      volume: GLOBAL_CFG.audio.backgroundMusic.touch
    })
    //
    // Ensure music volume is set correctly (same as level 0)
    // Set volume explicitly to match level 0 using global CFG
    //
    k.wait(0.1, () => {
      touchMusic.volume = GLOBAL_CFG.audio.backgroundMusic.touch
    })
    //
    // Stop music when leaving the scene
    //
    k.onSceneLeave(() => {
      touchMusic.stop()
    })
    //
    // Set background to black
    //
    k.setBackground(k.Color.fromHex("#000000"))
    //
    // Draw background (black)
    //
    //
    // Create dark mountains in the background
    //
    createMountains(k)
    //
    // Create dark bushes on background
    //
    createBackgroundBushesNear(k)  // Near layer - grayer, shorter
    //
    // Create darkest background trees (third layer - darkest and tallest)
    //
    createBackgroundDarkestTrees(k)
    //
    // Create background dark trees (larger, darker, more of them)
    //
    createBackgroundDarkTrees(k)
    //
    // Create foreground trees with gray color (from previous level) in front of hero
    //
    createForegroundTrees(k)
    //
    // Create walls
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
      levelNumber: 2,
      activeColor: '#8B5A50',
      inactiveColor: '#808080',
      completedColor: '#8B5A50',
      topPlatformHeight: TOP_MARGIN,
      sideWallWidth: LEFT_MARGIN
    })
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
    // Check completed sections for hero appearance
    //
    const isTimeComplete = get('time', false)
    //
    // Hero body color: yellow if time section complete, otherwise default gray
    //
    const heroBodyColor = isTimeComplete ? "#FF8C00" : "#C0C0C0"
    //
    // Create clouds under top platform (top wall)
    //
    createCloudsUnderTopPlatform(k)
    //
    // Create platforms first to get first platform position and states
    //
    const platformsData = createDiagonalPlatforms(k)
    const firstPlatform = platformsData.firstPlatform
    const platformStates = platformsData.platformStates
    //
    // Create anti-hero on first platform (top-left)
    //
    const antiHeroInst = Hero.create({
      k,
      x: firstPlatform.x,
      y: firstPlatform.y - 50,  // Above platform
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
    //
    // Snow color for dust particles (matching snowdrifts)
    //
    const snowColor = '#FFFFFF' // Pure white in hex
    
    const heroInst = Hero.create({
      k,
      x: HERO_SPAWN_X,
      y: HERO_SPAWN_Y,
      type: Hero.HEROES.HERO,
      controllable: true,
      sfx: sound,
      antiHero: antiHeroInst,
      dustColor: snowColor,
      onAnnihilation: () => {
        //
        // Transition after annihilation - go to level 3
        //
        createLevelTransition(k, 'level-touch.2', () => {
          k.go('level-touch.3')
        })
      },
      currentLevel: 'level-touch.2',
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
        heroSpawned = true
      }
    })
    //
    // Spawn anti-hero after delay
    //
    let antiHeroSpawned = false
    k.wait(HERO_SPAWN_DELAY, () => {
      if (!antiHeroSpawned && antiHeroInst.character) {
        Hero.spawn(antiHeroInst)
        antiHeroSpawned = true
      }
    })
    //
    // Create dust particles in game area only
    // Use snow color for particles (same as snow platform)
    //
    const dustInst = Dust.create({ 
      k,
      bounds: {
        left: LEFT_MARGIN,
        right: CFG.visual.screen.width - RIGHT_MARGIN,
        top: TOP_MARGIN,
        bottom: CFG.visual.screen.height - BOTTOM_MARGIN
      },
      color: { r: 255, g: 255, b: 255 }  // Snow color (pure white)
    })
    //
    // Create blue snow drifts on bottom platform floor
    //
    createSnowDrifts(k)
    //
    // Create arrow in snow pointing right (to guide hero direction)
    // Created as sprite from canvas for perfect synchronization
    //
    const arrowY = FLOOR_Y - 100  // Higher above bottom platform
    const arrowX = k.width() / 2 + 500  // Center arrow horizontally, shifted right by 500px
    const arrowFillColor = k.rgb(100, 130, 180)  // Darker blue for fill
    const ARROW_BODY_LENGTH = 75  // Length of arrow body (rectangle) - increased
    const ARROW_BODY_WIDTH = 18  // Width of arrow body - increased
    const ARROWHEAD_SIZE = 30  // Size of arrowhead triangle - increased
    
    //
    // Create arrow sprite from canvas
    //
    const createArrowSprite = () => {
      //
      // Calculate canvas size (with padding for "ears" and tip)
      //
      const baseWidth = ARROW_BODY_WIDTH * 2.2  // Base width for "ears"
      const canvasWidth = ARROW_BODY_LENGTH + ARROWHEAD_SIZE + 30  // Total width + extra padding for tip
      const canvasHeight = baseWidth + 20  // Height for "ears" + padding
      const canvasCenterX = ARROW_BODY_LENGTH / 2 + 10  // Center X accounting for left padding
      const canvasCenterY = canvasHeight / 2
      
      //
      // Create canvas
      //
      const canvas = document.createElement('canvas')
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      const ctx = canvas.getContext('2d')
      
      //
      // Set fill color (convert Kaplay color to hex)
      //
      const fillR = Math.round(arrowFillColor.r)
      const fillG = Math.round(arrowFillColor.g)
      const fillB = Math.round(arrowFillColor.b)
      ctx.fillStyle = `rgb(${fillR}, ${fillG}, ${fillB})`
      
      //
      // Arrow body (rectangle) - left side
      //
      const bodyLeftX = canvasCenterX - ARROW_BODY_LENGTH / 2
      const bodyRightX = canvasCenterX + ARROW_BODY_LENGTH / 2
      const bodyTopY = canvasCenterY - ARROW_BODY_WIDTH / 2
      
      //
      // Arrowhead (triangle) - right side with "ears" (wider base)
      //
      const tipX = bodyRightX + ARROWHEAD_SIZE
      const tipY = canvasCenterY  // Same Y as body center
      const baseLeftX = bodyRightX
      const baseLeftY = canvasCenterY - baseWidth / 2  // Top "ear"
      const baseRightX = bodyRightX
      const baseRightY = canvasCenterY + baseWidth / 2  // Bottom "ear"
      
      //
      // Draw soft outline (multiple layers for softness)
      //
      const outlineWidth = 3
      const outlineLayers = 3
      
      for (let layer = outlineLayers; layer > 0; layer--) {
        const layerWidth = outlineWidth * (layer / outlineLayers)
        const layerOpacity = .8
        
        ctx.strokeStyle = `rgba(0, 0, 0, ${layerOpacity})`
        ctx.lineWidth = layerWidth
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        
        //
        // Draw arrow body outline (rectangle)
        //
        ctx.strokeRect(
          bodyLeftX - layerWidth / 2,
          bodyTopY - layerWidth / 2,
          ARROW_BODY_LENGTH + layerWidth,
          ARROW_BODY_WIDTH + layerWidth
        )
        
        //
        // Draw arrowhead outline (triangle)
        //
        ctx.beginPath()
        ctx.moveTo(tipX + layerWidth / 2, tipY)
        ctx.lineTo(baseLeftX - layerWidth / 2, baseLeftY - layerWidth / 2)
        ctx.lineTo(baseRightX - layerWidth / 2, baseRightY + layerWidth / 2)
        ctx.closePath()
        ctx.stroke()
      }
      
      //
      // Draw arrow body fill (rectangle)
      //
      ctx.fillRect(bodyLeftX, bodyTopY, ARROW_BODY_LENGTH, ARROW_BODY_WIDTH)
      
      //
      // Draw arrowhead fill (triangle)
      //
      ctx.beginPath()
      ctx.moveTo(tipX, tipY)
      ctx.lineTo(baseLeftX, baseLeftY)
      ctx.lineTo(baseRightX, baseRightY)
      ctx.closePath()
      ctx.fill()
      
      //
      // Convert canvas to data URL and load as sprite
      //
      const dataURL = canvas.toDataURL()
      const spriteId = `arrow-touch-level2-${Date.now()}`
      k.loadSprite(spriteId, dataURL)
      
      return spriteId
    }
    
    const arrowSpriteId = createArrowSprite()
    
    //
    // Store base Y position for consistent movement
    //
    const arrowBaseY = arrowY
    
    //
    // Create arrow sprite object
    //
    k.add([
      k.sprite(arrowSpriteId),
      k.pos(arrowX, arrowBaseY),
      k.anchor("center"),
      k.z(CFG.visual.zIndex.player + 1),  // Above background but below platforms
    {
      draw() {
          //
          // Sway arrow up and down by a couple pixels
          //
          const swayAmount = 2  // 2 pixels up and down
          const swaySpeed = 2.5  // Speed of swaying
          const offsetY = Math.sin(k.time() * swaySpeed) * swayAmount
          this.pos.y = arrowBaseY + offsetY
        }
      }
    ])
    //
    // Platform visibility system
    //
    const VISIBILITY_RADIUS = 120  // Reduced radius for tighter detection
    const VISIBILITY_DURATION = 2.0
    const MAX_JUMPS = 3
    const PLATFORM_HEIGHT = 30  // Platform height constant
    let wasGrounded = false
    //
    // Create hero influence radius halo (visible circle around hero)
    // Draw halo in onDraw callback to ensure it's always visible
    //
    k.onDraw(() => {
      //
      // Draw influence radius halo around hero
      // Only draw when hero exists and character is available
      // Single outer circle at maximum radius, barely visible
      //
      if (!heroInst || !heroInst.character || !heroInst.character.pos) return
      
      const heroX = heroInst.character.pos.x
      const heroY = heroInst.character.pos.y
      
      //
      // Draw single outer circle at maximum radius
      //
      const glowColor = k.rgb(255, 255, 255)  // White matching snow theme
      const haloOpacity = 0.08  // Barely visible opacity
      
      k.drawCircle({
        radius: VISIBILITY_RADIUS,
        pos: k.vec2(heroX, heroY),
        color: glowColor,
        opacity: haloOpacity
      })
    })
    //
    // Update dust and platform visibility
    //
    k.onUpdate(() => {
      const dt = k.dt()
      Dust.onUpdate(dustInst, dt)
      //
      // Check if hero just landed
      //
      const isGrounded = heroInst.character.isGrounded()
      const justLanded = !wasGrounded && isGrounded
      wasGrounded = isGrounded
      //
      // Get hero position
      //
      const heroX = heroInst.character.pos.x
      const heroY = heroInst.character.pos.y
      //
      // Helper function to check if platform edges intersect with visibility circle
      //
      const isPlatformInRadius = (state) => {
        const platformHalfWidth = state.width / 2
        const platformHalfHeight = PLATFORM_HEIGHT / 2
        //
        // Platform bounds
        //
        const platformLeft = state.x - platformHalfWidth
        const platformRight = state.x + platformHalfWidth
        const platformTop = state.y - platformHalfHeight
        const platformBottom = state.y + platformHalfHeight
        //
        // Find closest point on platform rectangle to hero
        //
        const closestX = Math.max(platformLeft, Math.min(heroX, platformRight))
        const closestY = Math.max(platformTop, Math.min(heroY, platformBottom))
        //
        // Calculate distance from hero to closest point on platform
        //
        const dx = closestX - heroX
        const dy = closestY - heroY
        const distance = Math.sqrt(dx * dx + dy * dy)
        //
        // Platform is in radius if closest point is within circle
        //
        return distance <= VISIBILITY_RADIUS
      }
      //
      // If hero just landed, reveal nearby platforms
      // Platforms appear ONLY on landing, not when touching from below
      //
      if (justLanded) {
        //
        // Check each platform
        //
        platformStates.forEach(state => {
          //
          // Check if platform edges intersect with visibility circle
          //
          if (isPlatformInRadius(state)) {
            //
            // Increase jump count (up to MAX_JUMPS)
            //
            if (state.jumpCount < MAX_JUMPS) {
              state.jumpCount++
            }
            //
            // Reset visibility timer (start fade out)
            //
            state.visibilityTimer = VISIBILITY_DURATION
            //
            // Start shake effect (400ms)
            //
            state.shakeTimer = 0.4
          }
        })
      }
      //
      // Update platform visibility timers and opacity
      //
      platformStates.forEach((state, index) => {
        //
        // First platform (where anti-hero stands) is always visible
        //
        if (index === 0) {
          state.opacity = 1.0
          state.visibilityTimer = VISIBILITY_DURATION
          state.jumpCount = MAX_JUMPS
          //
          // Always enable collision for first platform
          //
          if (!state.hasCollision && state.collisionObject) {
            state.collisionObject.use(k.area())
            state.hasCollision = true
          }
          return
        }
        
        //
        // Update shake effect
        //
        if (state.shakeTimer > 0) {
          state.shakeTimer -= dt
          //
          // Apply random shake offset (stronger at start, weaker at end)
          //
          const shakeIntensity = state.shakeTimer / 0.4  // 1.0 at start, 0.0 at end
          const maxShake = 4 * shakeIntensity  // Max 4px shake
          state.shakeOffsetX = (Math.random() - 0.5) * maxShake * 2
          state.shakeOffsetY = (Math.random() - 0.5) * maxShake * 2
        } else {
          //
          // Shake finished - reset offsets
          //
          state.shakeOffsetX = 0
          state.shakeOffsetY = 0
        }
        
        if (state.visibilityTimer > 0) {
          //
          // Decrease timer
          //
          state.visibilityTimer -= dt
          //
          // Calculate base opacity from jump count
          // 1 jump: 0.33, 2 jumps: 0.66, 3 jumps: 1.0
          //
          const baseOpacity = state.jumpCount / MAX_JUMPS
          //
          // Calculate fade progress (0 = just jumped, 1 = timer expired)
          //
          const fadeProgress = 1 - (state.visibilityTimer / VISIBILITY_DURATION)
          //
          // Interpolate opacity: start at baseOpacity, fade to 0
          // Each jump makes platform less transparent (higher baseOpacity)
          //
          state.opacity = baseOpacity * (1 - fadeProgress)
        } else if (state.jumpCount > 0) {
          //
          // Timer expired - platform becomes invisible
          //
          state.opacity = 0
        }
        //
        // Enable/disable collision based on visibility (works for all platforms including fake)
        //
        if (state.collisionObject) {
          if (state.opacity > 0 && !state.hasCollision) {
            //
            // Platform became visible - enable collision
            //
            state.collisionObject.use(k.area())
            state.hasCollision = true
          } else if (state.opacity <= 0 && state.hasCollision) {
            //
            // Platform became invisible - disable collision (hero will fall)
            //
            //
            // Remove area component to disable collision
            //
            state.collisionObject.unuse("area")
            state.hasCollision = false
          }
        }
      })
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
      k.z(CFG.visual.zIndex.player + 3),
      {
        draw() {
          Dust.draw(dustInst)
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

/**
 * Creates clouds under the top platform (top wall)
 * @param {Object} k - Kaplay instance
 */
function createCloudsUnderTopPlatform(k) {
  //
  // Cloud parameters
  //
  const cloudTopY = TOP_MARGIN + 40  // Top Y position (dense layer here)
  const cloudBottomY = TOP_MARGIN + 100  // Bottom Y position (sparse clouds here)
  const cloudDenseLayerY = TOP_MARGIN + 50  // Dense layer Y position
  const cloudSparseLayerStartY = TOP_MARGIN + 60  // Start of sparse layer
  const cloudSparseLayerEndY = cloudBottomY  // End of sparse layer
  const baseCloudColor = k.rgb(36, 37, 36)  // Dark color like in previous level
  
  //
  // Create multiple clouds spread horizontally across the screen
  // Cover almost entire width like snow
  //
  const screenWidth = k.width()
  const playableWidth = screenWidth - LEFT_MARGIN - RIGHT_MARGIN
  const cloudStartX = LEFT_MARGIN + 50  // Start a bit inside left margin
  const cloudEndX = screenWidth - RIGHT_MARGIN - 50  // End a bit before right margin
  const cloudCoverageWidth = cloudEndX - cloudStartX
  
  //
  // Create dense layer at top (more clouds, closer together)
  //
  const denseCloudCount = 24  // Even more clouds for solid coverage without gaps
  const denseCloudSpacing = cloudCoverageWidth / (denseCloudCount - 1)
  
  //
  // Create sparse layer below (fewer clouds, more spread out)
  //
  const sparseCloudCount = 8  // Fewer clouds for sparse coverage
  const sparseCloudSpacing = cloudCoverageWidth / (sparseCloudCount - 1)
  
  //
  // Generate clouds programmatically to cover almost entire width
  // Create overlapping clouds like snow covering the top
  //
  const cloudTypes = [
    //
    // Type 1: Large wide cloud (6 puffs)
    //
    {
      mainSize: 80,
      puffs: [
        { radius: 0.7, offsetX: -0.8, offsetY: -0.05 },
        { radius: 0.75, offsetX: -0.4, offsetY: -0.1 },
        { radius: 0.65, offsetX: 0.4, offsetY: -0.1 },
        { radius: 0.7, offsetX: 0.8, offsetY: -0.05 },
        { radius: 0.6, offsetX: -0.2, offsetY: 0.15 },
        { radius: 0.6, offsetX: 0.2, offsetY: 0.15 }
      ],
      color: baseCloudColor,
      opacity: 0.6
    },
    //
    // Type 2: Medium wide cloud (5 puffs)
    //
    {
      mainSize: 70,
      puffs: [
        { radius: 0.8, offsetX: -0.7, offsetY: 0 },
        { radius: 0.85, offsetX: -0.3, offsetY: -0.08 },
        { radius: 0.75, offsetX: 0.3, offsetY: -0.08 },
        { radius: 0.8, offsetX: 0.7, offsetY: 0 },
        { radius: 0.7, offsetX: 0, offsetY: 0.12 }
      ],
      color: k.rgb(36, 37, 36),
      opacity: 0.55
    },
    //
    // Type 3: Small wide cloud (4 puffs)
    //
    {
      mainSize: 60,
      puffs: [
        { radius: 0.75, offsetX: -0.6, offsetY: 0 },
        { radius: 0.8, offsetX: -0.2, offsetY: -0.08 },
        { radius: 0.8, offsetX: 0.2, offsetY: -0.08 },
        { radius: 0.75, offsetX: 0.6, offsetY: 0 }
      ],
      color: k.rgb(36, 37, 36),
      opacity: 0.5
    },
    //
    // Type 4: Very wide cloud (7 puffs)
    //
    {
      mainSize: 90,
      puffs: [
        { radius: 0.65, offsetX: -1.0, offsetY: 0 },
        { radius: 0.7, offsetX: -0.6, offsetY: -0.1 },
        { radius: 0.75, offsetX: -0.2, offsetY: -0.12 },
        { radius: 0.75, offsetX: 0.2, offsetY: -0.12 },
        { radius: 0.7, offsetX: 0.6, offsetY: -0.1 },
        { radius: 0.65, offsetX: 1.0, offsetY: 0 },
        { radius: 0.6, offsetX: 0, offsetY: 0.15 }
      ],
      color: baseCloudColor,
      opacity: 0.65
    }
  ]
  
  //
  // Generate clouds with dense layer at top, sparse layer below
  //
  const cloudConfigs = []
  
  //
  // Create dense layer at top (solid coverage, no gaps)
  //
  for (let i = 0; i < denseCloudCount; i++) {
    const baseX = cloudStartX + denseCloudSpacing * i
    
    //
    // Add small randomness for natural look (less variation for dense layer)
    // Overlap clouds to ensure no gaps
    //
    const randomOffset = (Math.random() - 0.5) * (denseCloudSpacing * 0.6)  // Overlap with neighbors
    const x = baseX + randomOffset
    
    //
    // Select cloud type with some variation
    //
    const typeIndex = i % cloudTypes.length
    const cloudType = cloudTypes[typeIndex]
    
    //
    // Vary size slightly for more natural look
    // Make dense layer clouds slightly larger for better overlap
    //
    const sizeVariation = 1.0 + Math.random() * 0.4  // 1.0 to 1.4 (larger for dense layer)
    const mainSize = cloudType.mainSize * sizeVariation
    
    //
    // Create multiple rows for dense layer to ensure no gaps
    // Divide clouds into 2-3 rows for complete coverage
    //
    const rowsPerLayer = 2
    const rowIndex = Math.floor((i % denseCloudCount) / (denseCloudCount / rowsPerLayer))
    const rowYOffset = rowIndex * 8  // 8px between rows
    const yVariation = (Math.random() - 0.5) * 3  // ±1.5px variation within row
    const cloudY = cloudDenseLayerY + rowYOffset + yVariation
    
    cloudConfigs.push({
      x: x,
      y: cloudY,
      mainSize: mainSize,
      puffs: cloudType.puffs,
      color: cloudType.color,
      opacity: cloudType.opacity * (0.9 + Math.random() * 0.2)  // Slight opacity variation
    })
  }
  
  //
  // Create sparse layer below (fewer clouds, more spread out)
  //
  for (let i = 0; i < sparseCloudCount; i++) {
    const baseX = cloudStartX + sparseCloudSpacing * i
    
    //
    // Add more randomness for sparse layer
    //
    const randomOffset = (Math.random() - 0.5) * 40  // ±20px random offset
    const x = baseX + randomOffset
    
    //
    // Select cloud type with some variation
    //
    const typeIndex = (i + denseCloudCount) % cloudTypes.length
    const cloudType = cloudTypes[typeIndex]
    
    //
    // Vary size slightly for more natural look
    //
    const sizeVariation = 1.0 + Math.random() * 0.3  // 1.0 to 1.3
    const mainSize = cloudType.mainSize * sizeVariation
    
    //
    // Distribute Y positions in sparse layer (more variation)
    // Use quadratic function to bias towards top of sparse layer
    //
    const sparseYRange = cloudSparseLayerEndY - cloudSparseLayerStartY
    const yDistribution = Math.random() * Math.random()  // 0 to 1, biased towards 0 (top)
    const cloudY = cloudSparseLayerStartY + yDistribution * sparseYRange
    
    cloudConfigs.push({
      x: x,
      y: cloudY,
      mainSize: mainSize,
      puffs: cloudType.puffs,
      color: cloudType.color,
      opacity: cloudType.opacity * (0.9 + Math.random() * 0.2)  // Slight opacity variation
    })
  }
  
  cloudConfigs.forEach((cloudConfig) => {
    k.add([
      k.pos(cloudConfig.x, cloudConfig.y),
      k.z(CFG.visual.zIndex.platforms - 1),  // Behind platforms
      {
        draw() {
          //
          // Draw cloud as overlapping circles (puffy cloud shape)
          //
          const mainSize = cloudConfig.mainSize
          
          //
          // Main cloud body (largest circle in center)
          //
          k.drawCircle({
            radius: mainSize,
            pos: k.vec2(0, 0),
            color: cloudConfig.color,
            opacity: cloudConfig.opacity
          })
          
          //
          // Draw all puffs for this cloud
          //
          cloudConfig.puffs.forEach((puff) => {
            k.drawCircle({
              radius: mainSize * puff.radius,
              pos: k.vec2(puff.offsetX * mainSize, puff.offsetY * mainSize),
              color: cloudConfig.color,
              opacity: cloudConfig.opacity
            })
          })
        }
      }
    ])
  })
}

/**
 * Creates blue snow drifts on bottom platform floor
 * @param {Object} k - Kaplay instance
 */
function createSnowDrifts(k) {
  //
  // Snow drift configurations for bottom platform
  //
  const floorY = FLOOR_Y
  //
  // Generate many snow drifts with random sizes covering entire floor
  //
  const drifts = []
  //
  // Fill entire bottom platform with drifts
  //
  const corridorStart = LEFT_MARGIN
  const corridorEnd = k.width() - RIGHT_MARGIN
  
  for (let x = corridorStart; x < corridorEnd; x += 40 + Math.random() * 30) {
    const width = 50 + Math.random() * 90  // 50-140px width (larger and overlapping)
    const height = 8 + Math.random() * 15   // 8-23px height
    const zIndex = Math.random() > 0.5 ? 12 : 25  // 50% behind hero, 50% in front
    const shapeType = Math.floor(Math.random() * 3)  // 0, 1, or 2 for different shapes
    const skew = -0.3 + Math.random() * 0.6  // -0.3 to 0.3 for asymmetry
    
    drifts.push({ x, width, height, y: floorY, z: zIndex, shapeType, skew })
  }
  //
  // Add some extra smaller drifts between main ones for more coverage
  //
  for (let x = corridorStart; x < corridorEnd; x += 30 + Math.random() * 25) {
    const width = 30 + Math.random() * 50  // 30-80px width (medium)
    const height = 5 + Math.random() * 8    // 5-13px height (smaller)
    const zIndex = Math.random() > 0.3 ? 12 : 25  // More behind hero
    const shapeType = Math.floor(Math.random() * 3)  // 0, 1, or 2 for different shapes
    const skew = -0.3 + Math.random() * 0.6  // -0.3 to 0.3 for asymmetry
    
    drifts.push({ x, width, height, y: floorY, z: zIndex, shapeType, skew })
  }
  //
  // Create each drift as a mound shape with multiple layers
  //
  drifts.forEach(drift => {
    k.add([
      k.pos(drift.x, drift.y),
      k.z(drift.z),  // Either behind hero (12) or in front (25)
      {
        draw() {
          //
          // Drifts in front of hero (z=25) are slightly more transparent
          //
          const baseOpacity = drift.z === 25 ? 0.7 : 0.95
          const shadowOpacity = drift.z === 25 ? 0.5 : 0.7
          const highlightOpacity = drift.z === 25 ? 0.6 : 0.85
          //
          // Draw snow drift as a polygon (mound shape)
          //
          const points = []
          const steps = 20
          //
          // Create curved top using different shape formulas based on shapeType
          //
          for (let i = 0; i <= steps; i++) {
            const t = i / steps
            const x = (t - 0.5 + drift.skew * (t - 0.5)) * drift.width
            let y
            //
            // Different shape types for variety
            //
            if (drift.shapeType === 0) {
              //
              // Parabolic curve (classic mound)
              //
              y = -drift.height * (1 - Math.pow(2 * t - 1, 2))
            } else if (drift.shapeType === 1) {
              //
              // Steeper peak (more pointed)
              //
              y = -drift.height * (1 - Math.pow(Math.abs(2 * t - 1), 1.5))
            } else {
              //
              // Flatter top (more spread out)
              //
              y = -drift.height * (1 - Math.pow(2 * t - 1, 4))
            }
            points.push(k.vec2(x, y))
          }
          //
          // Add bottom points to close the shape
          //
          points.push(k.vec2(drift.width / 2, 0))
          points.push(k.vec2(-drift.width / 2, 0))
          //
          // Draw main snow mound (light blue layer)
          //
          k.drawPolygon({
            pts: points,
            color: k.rgb(255, 255, 255),  // Pure white
            opacity: baseOpacity
          })
          //
          // Draw shadow layer (darker blue at bottom)
          //
          const shadowPoints = []
          for (let i = 0; i <= steps; i++) {
            const t = i / steps
            const x = (t - 0.5 + drift.skew * (t - 0.5)) * drift.width
            const y = -drift.height * 0.3 * (1 - Math.pow(2 * t - 1, 2))
            shadowPoints.push(k.vec2(x, y))
          }
          shadowPoints.push(k.vec2(drift.width / 2, 0))
          shadowPoints.push(k.vec2(-drift.width / 2, 0))
          
          k.drawPolygon({
            pts: shadowPoints,
            color: k.rgb(100, 130, 180),  // Darker blue shadow
            opacity: shadowOpacity
          })
          //
          // Draw highlight on top (brightest blue spot, offset by skew)
          // Ensure it stays within the mound (not below y=0)
          //
          const highlightOffset = drift.skew * drift.width * 0.2
          const highlightRadius = drift.width * 0.15
          const highlightY = -drift.height * 0.7
          //
          // Only draw highlight if it stays above the baseline
          //
          if (Math.abs(highlightY) - highlightRadius > 0) {
            k.drawCircle({
              radius: highlightRadius,
              color: k.rgb(200, 220, 255),  // Bright blue highlight
              pos: k.vec2(highlightOffset, highlightY),
              opacity: highlightOpacity
            })
          }
        }
      }
    ])
  })
}

/**
 * Creates platforms forming a path from top-left to bottom-right
 * All platforms are arranged so hero can jump from one to another
 * Leading to the final platform near anti-hero position
 * Platforms are invisible by default and become visible when hero lands nearby
 * @param {Object} k - Kaplay instance
 * @returns {Object} Object with first platform position and platform states array
 */
function createDiagonalPlatforms(k) {
  //
  // Platform parameters
  //
  const platformHeight = 30
  //
  // Jump physics: max horizontal distance ~180px (with margin)
  // jumpForce: 640, gravity: 2000, moveSpeed: 300
  // Max jump time: 2 * (jumpForce / gravity) = 0.64s
  // Max distance: moveSpeed * jumpTime = 300 * 0.64 ≈ 192px
  // Use 160px spacing for comfortable jumps
  //
  const maxJumpDistance = 160
  //
  // Colors for snow platforms
  //
  const snowColor = k.rgb(255, 255, 255)  // Pure white
  const darkSnowColor = k.rgb(200, 200, 200)  // Light gray for dark snow
  //
  // Platform visibility system
  // Each platform has: opacity (0-1), jumpCount (0-3), visibilityTimer (0-2 seconds)
  //
  const platformStates = []
  const VISIBILITY_RADIUS = 250  // Radius around hero to reveal platforms
  const VISIBILITY_DURATION = 2.0  // 2 seconds visibility after landing
  const MAX_JUMPS = 3  // 3 jumps to fully reveal platform
  //
  // Helper function to create a snow platform with visibility state
  //
  const createSnowPlatform = (x, y, width, index) => {
    //
    // First platform (where anti-hero stands) is always visible
    //
    const isFirstPlatform = index === 0
    //
    // Initialize platform state
    //
    const platformState = {
      x,
      y,
      width,
      opacity: isFirstPlatform ? 1.0 : 0,  // First platform visible, others invisible
      jumpCount: isFirstPlatform ? MAX_JUMPS : 0,  // First platform fully revealed
      visibilityTimer: isFirstPlatform ? VISIBILITY_DURATION : 0,  // First platform timer set
      visualObject: null,  // Will store visual object reference
      collisionObject: null,  // Will store collision object reference
      hasCollision: false,  // Track if collision is enabled
      shakeTimer: 0,  // Timer for shake effect (400ms)
      shakeOffsetX: 0,  // Current shake offset X
      shakeOffsetY: 0  // Current shake offset Y
    }
    platformStates.push(platformState)
    //
    // Create collision platform
    // First platform has collision enabled immediately
    //
    const collisionComponents = [
      k.rect(width, platformHeight),
      k.pos(x, y),
      k.anchor("center"),
      k.body({ isStatic: true }),
      k.opacity(0),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ]
    //
    // First platform needs collision enabled from start
    //
    if (isFirstPlatform) {
      collisionComponents.push(k.area())
      platformState.hasCollision = true
    }
    
    const collisionObj = k.add(collisionComponents)
    platformState.collisionObject = collisionObj
    //
    // Create visual platform (snow style) with dynamic opacity
    //
    const visualObj = k.add([
      k.pos(x, y),
      k.z(CFG.visual.zIndex.platforms - 1),
      {
        draw() {
          //
          // Use opacity from platform state
          //
          const currentOpacity = platformState.opacity
          if (currentOpacity <= 0) return  // Don't draw if invisible
          //
          // Apply shake offset to drawing position
          //
          const drawX = platformState.shakeOffsetX
          const drawY = platformState.shakeOffsetY
          
          const steps = 20
          const points = []
          const waveHeight = 6
          //
          // Create wavy top surface (with shake offset)
          //
          for (let i = 0; i <= steps; i++) {
            const t = i / steps
            const px = (t - 0.5) * width + drawX
            const py = -platformHeight / 2 - waveHeight * (1 - Math.pow(2 * t - 1, 2)) + drawY
            points.push(k.vec2(px, py))
          }
          points.push(k.vec2(width / 2 + drawX, platformHeight / 2 + drawY))
          points.push(k.vec2(-width / 2 + drawX, platformHeight / 2 + drawY))
          //
          // Draw shadow layer (with shake offset)
          //
          const shadowPoints = []
          for (let i = 0; i <= steps; i++) {
            const t = i / steps
            const px = (t - 0.5) * width + drawX
            const shadowHeight = waveHeight * 0.3
            const py = -platformHeight / 2 - shadowHeight * (1 - Math.pow(2 * t - 1, 2)) + drawY
            shadowPoints.push(k.vec2(px, py))
          }
          shadowPoints.push(k.vec2(width / 2 + drawX, platformHeight / 2 + drawY))
          shadowPoints.push(k.vec2(-width / 2 + drawX, platformHeight / 2 + drawY))
          
          k.drawPolygon({
            pts: shadowPoints,
            color: k.rgb(100, 130, 180),
            opacity: 0.7 * currentOpacity
          })
          //
          // Draw main platform
          //
          k.drawPolygon({
            pts: points,
            color: darkSnowColor,
            opacity: 0.9 * currentOpacity
          })
          //
          // Draw top layer (with shake offset)
          //
          const topPoints = []
          for (let i = 0; i <= steps; i++) {
            const t = i / steps
            const px = (t - 0.5) * width + drawX
            const py = -platformHeight / 2 - waveHeight * (1 - Math.pow(2 * t - 1, 2)) + drawY
            topPoints.push(k.vec2(px, py))
          }
          for (let i = steps; i >= 0; i--) {
            const t = i / steps
            const px = (t - 0.5) * width + drawX
            const topLayerHeight = platformHeight * 0.7
            const py = -platformHeight / 2 - waveHeight * (1 - Math.pow(2 * t - 1, 2)) + topLayerHeight + drawY
            topPoints.push(k.vec2(px, py))
          }
          
          k.drawPolygon({
            pts: topPoints,
            color: snowColor,
            opacity: 0.8 * currentOpacity
          })
        }
      }
    ])
    platformState.visualObject = visualObj
  }
  //
  // Define 7 platforms forming a path from top-left to bottom-right
  // Platforms arranged diagonally from top-left to bottom-right
  //
  const startX = LEFT_MARGIN + 200
  const endX = CFG.visual.screen.width - RIGHT_MARGIN - 200
  const totalHorizontalDistance = endX - startX
  //
  // Vertical positions: platforms go from top-left to bottom-right
  //
  const startY = TOP_MARGIN + 250
  const endY = FLOOR_Y - 100
  const totalVerticalDistance = endY - startY
  //
  // Create 7 platforms evenly spaced horizontally
  //
  const platformCount = 7
  const platforms = []
  
  for (let i = 0; i < platformCount; i++) {
    const t = i / (platformCount - 1)  // 0 to 1
    let x = startX + totalHorizontalDistance * t
    const y = startY + totalVerticalDistance * t
    //
    // Platform 4 (middle) is longest, others are medium
    // Middle platform shortened by 20% on the right side
    //
    let width = i === 3 ? 200 : 140
    if (i === 3) {
      //
      // Reduce width by 20% (from 200 to 160)
      // Shift center left by half the reduction to keep left edge in place
      //
      const widthReduction = width * 0.2  // 40 pixels
      width = width - widthReduction  // 160 pixels
      x = x - widthReduction / 2  // Shift left by 20 pixels
    }
    
    platforms.push({ x, y, width })
  }
  //
  // Create all platforms
  //
  platforms.forEach((platform, index) => {
    createSnowPlatform(platform.x, platform.y, platform.width, index)
  })
  //
  // Create 2 fake platforms (no collision) to confuse player
  // Positioned to the right and up from platforms 2 and 5
  //
  const fakePlatformOffsets = [
    { sourceIndex: 1, offsetX: 220 + (totalHorizontalDistance / (platformCount - 1)) + 100, offsetY: 40 + (totalVerticalDistance / (platformCount - 1)) - 40 },  // Fake platform from platform 2 (moved further right)
    { sourceIndex: 4, offsetX: 120, offsetY: -120 }   // Fake platform from platform 5 (moved left)
  ]
  
  fakePlatformOffsets.forEach((fake, fakeIndex) => {
    const sourcePlatform = platforms[fake.sourceIndex]
    const fakeX = sourcePlatform.x + fake.offsetX
    const fakeY = sourcePlatform.y + fake.offsetY
    const fakeWidth = 140
    
    //
    // Create fake platform state (invisible by default, same as regular platforms)
    //
    const fakePlatformState = {
      x: fakeX,
      y: fakeY,
      width: fakeWidth,
      opacity: 0,  // Start invisible like other platforms
      jumpCount: 0,
      visibilityTimer: 0,
      visualObject: null,
      collisionObject: null,
      hasCollision: false,  // Collision enabled when visible
      shakeTimer: 0,
      shakeOffsetX: 0,
      shakeOffsetY: 0,
      isFake: true  // Mark as fake platform (for reference only)
    }
    platformStates.push(fakePlatformState)
    
    //
    // Create collision object (same as regular platforms)
    //
    const fakeCollisionComponents = [
      k.rect(fakeWidth, platformHeight),
      k.pos(fakeX, fakeY),
      k.anchor("center"),
      k.body({ isStatic: true }),
      k.opacity(0),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ]
    const fakeCollisionObj = k.add(fakeCollisionComponents)
    fakePlatformState.collisionObject = fakeCollisionObj
    
    //
    // Create visual platform (same as regular platforms)
    //
    const fakeVisualObj = k.add([
      k.pos(fakeX, fakeY),
      k.z(CFG.visual.zIndex.platforms - 1),
      {
        draw() {
          const currentOpacity = fakePlatformState.opacity
          if (currentOpacity <= 0) return
          
          const drawX = fakePlatformState.shakeOffsetX
          const drawY = fakePlatformState.shakeOffsetY
          
          const steps = 20
          const points = []
          const waveHeight = 6
          
          for (let i = 0; i <= steps; i++) {
            const t = i / steps
            const px = (t - 0.5) * fakeWidth + drawX
            const py = -platformHeight / 2 - waveHeight * (1 - Math.pow(2 * t - 1, 2)) + drawY
            points.push(k.vec2(px, py))
          }
          points.push(k.vec2(fakeWidth / 2 + drawX, platformHeight / 2 + drawY))
          points.push(k.vec2(-fakeWidth / 2 + drawX, platformHeight / 2 + drawY))
          
          const shadowPoints = []
          for (let i = 0; i <= steps; i++) {
            const t = i / steps
            const px = (t - 0.5) * fakeWidth + drawX
            const shadowHeight = waveHeight * 0.3
            const py = -platformHeight / 2 - shadowHeight * (1 - Math.pow(2 * t - 1, 2)) + drawY
            shadowPoints.push(k.vec2(px, py))
          }
          shadowPoints.push(k.vec2(fakeWidth / 2 + drawX, platformHeight / 2 + drawY))
          shadowPoints.push(k.vec2(-fakeWidth / 2 + drawX, platformHeight / 2 + drawY))
          
          k.drawPolygon({
            pts: shadowPoints,
            color: k.rgb(100, 130, 180),
            opacity: 0.7 * currentOpacity
          })
          
          k.drawPolygon({
            pts: points,
            color: darkSnowColor,
            opacity: 0.9 * currentOpacity
          })
          
          const topPoints = []
          for (let i = 0; i <= steps; i++) {
            const t = i / steps
            const px = (t - 0.5) * fakeWidth + drawX
            const py = -platformHeight / 2 - waveHeight * (1 - Math.pow(2 * t - 1, 2)) + drawY
            topPoints.push(k.vec2(px, py))
          }
          for (let i = steps; i >= 0; i--) {
            const t = i / steps
            const px = (t - 0.5) * fakeWidth + drawX
            const topLayerHeight = platformHeight * 0.7
            const py = -platformHeight / 2 - waveHeight * (1 - Math.pow(2 * t - 1, 2)) + topLayerHeight + drawY
            topPoints.push(k.vec2(px, py))
          }
          
          k.drawPolygon({
            pts: topPoints,
            color: snowColor,
            opacity: 0.8 * currentOpacity
          })
        }
      }
    ])
    fakePlatformState.visualObject = fakeVisualObj
  })
  
  //
  // Return first platform position and platform states for visibility system
  //
  return {
    firstPlatform: platforms[0],
    platformStates: platformStates
  }
}

function createBackgroundBushesNear(k) {
  //
  // Create near layer bushes - grayer, shorter, in front of far layer
  //
  const grassY = FLOOR_Y - 2
  const playableWidth = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
  const yOffset = -80  // Raised bushes higher
  
  //
  // Random helper
  //
  const rand = (min, max) => min + Math.random() * (max - min)
  
  //
  // Create many bushes for continuous strip
  //
  const totalElements = 80  // More bushes for continuous horizontal strip
  const spacing = playableWidth / (totalElements - 1)
  const bushes = []
  
  for (let i = 0; i < totalElements; i++) {
    const posX = LEFT_MARGIN + spacing * i
    
    //
    // Create bushes with 100% density for continuous strip
    //
    // Always create bush (no random skip)
    
    //
    // Near layer bushes - base size (shorter than far layer)
    //
    const bushSize = (20 + Math.random() * 30) * 0.7 * 6.4  // Base size (shorter than far layer)
    const crownCount = 8 + Math.floor(Math.random() * 10)  // More crowns for continuous density
    const crowns = []
    
    for (let j = 0; j < crownCount; j++) {
      const angle = Math.random() * Math.PI * 2
      const distance = Math.random() * bushSize * 0.8
      const x = Math.cos(angle) * distance
      const y = Math.sin(angle) * distance * 0.6
      
      crowns.push({
        offsetX: x,
        offsetY: y,
        sizeVariation: 0.5 + Math.random() * 0.5,
        opacityVariation: 0.6 + Math.random() * 0.4
      })
    }
    
    //
    // Dark gray bush color for near layer (much darker)
    //
    const grayBushColor = k.rgb(18, 20, 22)  // Much darker gray color
    
    bushes.push({
      x: posX,
      y: grassY + yOffset,
      size: bushSize,
      crowns: crowns,
      color: grayBushColor,
      opacity: 0.85,  // Slightly more opaque for continuous appearance
      swaySpeed: 0.1 + Math.random() * 0.05,
      swayAmount: (0.5 + Math.random() * 0.5) * 0.7,
      swayOffset: Math.random() * Math.PI * 2
    })
  }
  
  //
  // Create canvas and draw bushes on it
  //
  const createBushesCanvas = () => {
    const canvas = document.createElement('canvas')
    canvas.width = k.width()
    canvas.height = k.height()
    const ctx = canvas.getContext('2d')
    
    //
    // Calculate arc multiplier for bushes (higher at edges, lower in center)
    //
    const screenCenter = k.width() / 2
    const maxDistance = Math.max(screenCenter - LEFT_MARGIN, k.width() - RIGHT_MARGIN - screenCenter)
    
    //
    // Draw bushes on canvas with arc variation
    //
    bushes.forEach(bush => {
      const sway = 0  // No sway for static canvas
      
      //
      // Calculate distance from center and apply arc formula
      //
      const distanceFromCenter = Math.abs(bush.x - screenCenter)
      const normalizedDistance = distanceFromCenter / maxDistance  // 0 at center, 1 at edges
      const arcMultiplier = 0.7 + normalizedDistance * 0.6  // 0.7 at center, 1.3 at edges (creates arc)
      
      bush.crowns.forEach(crown => {
        ctx.fillStyle = `rgba(${bush.color.r}, ${bush.color.g}, ${bush.color.b}, ${bush.opacity * crown.opacityVariation})`
        ctx.beginPath()
        ctx.arc(
          bush.x + crown.offsetX + sway,
          bush.y + crown.offsetY,
          bush.size * crown.sizeVariation * 0.5 * arcMultiplier,  // Apply arc multiplier to size
          0,
          Math.PI * 2
        )
        ctx.fill()
      })
    })
    
    return canvas
  }
  
  const bushesCanvas = createBushesCanvas()
  const bushesTexture = k.loadSprite('bg-touch-level2-background-bushes-near', bushesCanvas.toDataURL())
  
  //
  // Draw bushes canvas (in front of far bushes, but behind trees)
  //
  k.add([
    k.z(2),  // In front of far bushes (z=1.5) but behind trees
    {
      draw() {
        k.drawSprite({
          sprite: 'bg-touch-level2-background-bushes-near',
          pos: k.vec2(0, 0),
          anchor: "topleft"
        })
      }
    }
  ])
}

function createMountains(k) {
  //
  // Create mountains using segment-based random point generation
  //
  const screenWidth = k.width()
  const screenHeight = k.height()
  const horizonY = FLOOR_Y  // Mountains start from bottom platform
  //
  // Color palette
  //
  const colors = {
    sky: '#000000',            // Black background
    snow: 'rgb(255, 255, 255)', // Pure white snow
    rockLeft: 'rgb(73, 121, 141)',  // Left side rock color
    rockRight: 'rgb(62, 105, 121)', // Right side rock color
    rockRightLight: 'rgb(130, 176, 209)' // Right side light rock color
  }
  
  const fixedPointOnSegment = (x1, y1, x2, y2, percent) => {
    //
    // Fixed point on segment (no randomness) - always same position
    //
    const n = percent / 100
    const a = (y2 - y1) / (x2 - x1)
    const x = x1 + (x2 - x1) * n
    const y = a * (x - x1) + y1
    return { x, y }
  }
  
  //
  // Draw single mountain (fixed positions, no randomness)
  //
  const drawMountain = (ctx, x, y, width, height, mountainData, alpha = 1, customColors = null) => {
    ctx.save()
    ctx.globalAlpha = alpha
    
    //
    // Use custom colors if provided, otherwise use default colors
    //
    const mountainColors = customColors || colors
    
    //
    // Fixed positions (no randomness) - always same place
    //
    const leftMountainBaseX = x + mountainData.widthVariation / 2
    const rightMountainBaseX = x + width - mountainData.widthVariation / 2
    const mountainTopY = y - mountainData.heightVariation / 2
    const mountainTopX = x + (width - mountainData.centerVariation) / 2 + mountainData.centerVariation / 2
    
    const leftSnow = fixedPointOnSegment(leftMountainBaseX, y, mountainTopX, mountainTopY, 85)  // Higher snow line for sharper peaks (was 70%)
    const rightSnow = fixedPointOnSegment(rightMountainBaseX, y, mountainTopX, mountainTopY, 85)  // Higher snow line for sharper peaks (was 70%)
    const midSnow = {
      x: mountainTopX,
      y: (leftSnow.y + rightSnow.y) / 2
    }
    
    const leftSnowPoints = []
    const rightSnowPoints = []
    for (let i = 1; i <= 2; i++) {
      const leftPoint = fixedPointOnSegment(leftSnow.x, leftSnow.y, midSnow.x, midSnow.y, 100 / 3 * i)  // Fixed position
      leftPoint.y += 15 * (1 - 2 * (i % 2))  // Fixed offset
      leftSnowPoints.push(leftPoint)
      
      const rightPoint = fixedPointOnSegment(midSnow.x, midSnow.y, rightSnow.x, rightSnow.y, 100 / 3 * i)  // Fixed position
      rightPoint.y += 15 * (-1 + 2 * (i % 2))  // Fixed offset
      rightSnowPoints.push(rightPoint)
    }
    
    //
    // Draw snow cap (left side)
    //
    ctx.fillStyle = mountainColors.snow
    ctx.beginPath()
    ctx.moveTo(leftSnow.x, leftSnow.y)
    leftSnowPoints.forEach(point => ctx.lineTo(point.x, point.y))
    ctx.lineTo(midSnow.x, midSnow.y)
    ctx.lineTo(mountainTopX, mountainTopY)
    ctx.fill()
    
    //
    // Draw snow cap (right side - light)
    //
    ctx.fillStyle = mountainColors.rockRightLight
    ctx.beginPath()
    ctx.moveTo(midSnow.x, midSnow.y)
    rightSnowPoints.forEach(point => ctx.lineTo(point.x, point.y))
    ctx.lineTo(rightSnow.x, rightSnow.y)
    ctx.lineTo(mountainTopX, mountainTopY)
    ctx.fill()
    
    //
    // Draw left rock face
    //
    ctx.fillStyle = mountainColors.rockLeft
    ctx.beginPath()
    ctx.moveTo(leftMountainBaseX, y)
    ctx.lineTo(leftSnow.x, leftSnow.y)
    leftSnowPoints.forEach(point => ctx.lineTo(point.x, point.y))
    ctx.lineTo(midSnow.x, midSnow.y)
    ctx.lineTo(midSnow.x, y)
    ctx.fill()
    
    //
    // Draw right rock face
    //
    ctx.fillStyle = mountainColors.rockRight
    ctx.beginPath()
    ctx.moveTo(midSnow.x, midSnow.y)
    rightSnowPoints.forEach(point => ctx.lineTo(point.x, point.y))
    ctx.lineTo(rightSnow.x, rightSnow.y)
    ctx.lineTo(rightMountainBaseX, y)
    ctx.lineTo(mountainTopX, y)
    ctx.fill()
    
    ctx.restore()
  }
  
  //
  // Create canvas for mountains
  //
  const createMountainsCanvas = () => {
    const canvas = document.createElement('canvas')
    canvas.width = screenWidth
    canvas.height = screenHeight
    const ctx = canvas.getContext('2d')
    
    //
    // Disable anti-aliasing for pixel art effect
    //
    ctx.imageSmoothingEnabled = false
    
    //
    // Draw dark night sky (fill entire canvas to avoid horizontal line)
    //
    ctx.fillStyle = colors.sky
    ctx.fillRect(0, 0, screenWidth, screenHeight)
    
    //
    // Draw three mountains: left (shadowed, lower), center (higher, sharper), right (light)
    // Made higher and stretched horizontally
    //
    const screenThird = screenWidth / 3
    
    //
    // Left mountain: shadowed, lower (but higher than before)
    //
    const leftMountainParams = {
      widthVariation: 40,  // Narrower for sharper peak
      heightVariation: 1200,  // 2x higher
      centerVariation: 250  // Narrower variation for sharper peak
    }
    const leftMountainHeight = 2500  // 2x higher
    const leftMountainX = -100  // Start further left
    const leftMountainWidth = screenThird + 200  // Wider
    
    //
    // Center mountain: higher, sharper (made even higher)
    //
    const centerMountainParams = {
      widthVariation: 30,  // Narrower for sharpest peak
      heightVariation: 1500,  // 2x higher
      centerVariation: 200  // Narrower variation for sharpest peak
    }
    const centerMountainHeight = 2800  // 2x higher
    const centerMountainX = screenThird - 400  // Start further left to accommodate much wider base
    const centerMountainWidth = screenThird + 900  // Much wider base
    
    //
    // Right mountain: light (made higher)
    //
    const rightMountainParams = {
      widthVariation: 45,  // Narrower for sharper peak
      heightVariation: 1300,  // 2x higher
      centerVariation: 280  // Narrower variation for sharper peak
    }
    const rightMountainHeight = 2200  // 2x higher
    const rightMountainX = screenThird * 2 - 150  // Start further left
    const rightMountainWidth = screenThird + 250  // Wider, extends to edge
    
    //
    // Draw left mountain (shadowed, darker colors)
    //
    drawMountain(ctx, leftMountainX, horizonY, leftMountainWidth, leftMountainHeight, leftMountainParams, 1.0, {
      snow: 'rgb(200, 210, 220)',  // Darker snow
      rockLeft: 'rgb(50, 80, 100)',  // Darker left rock
      rockRight: 'rgb(40, 70, 90)',  // Darker right rock
      rockRightLight: 'rgb(90, 130, 150)'  // Darker light rock
    })
    
    //
    // Draw center mountain (higher, sharper, normal colors)
    //
    drawMountain(ctx, centerMountainX, horizonY, centerMountainWidth, centerMountainHeight, centerMountainParams, 1.0, {
      snow: colors.snow,
      rockLeft: colors.rockLeft,
      rockRight: colors.rockRight,
      rockRightLight: colors.rockRightLight
    })
    
    //
    // Draw right mountain (light, brighter colors)
    //
    drawMountain(ctx, rightMountainX, horizonY, rightMountainWidth, rightMountainHeight, rightMountainParams, 1.0, {
      snow: 'rgb(245, 248, 250)',  // Brighter snow
      rockLeft: 'rgb(90, 140, 160)',  // Brighter left rock
      rockRight: 'rgb(80, 130, 150)',  // Brighter right rock
      rockRightLight: 'rgb(150, 190, 220)'  // Brighter light rock
    })
    
    return canvas
  }
  
  const mountainsCanvas = createMountainsCanvas()
  k.loadSprite('bg-touch-level2-mountains', mountainsCanvas.toDataURL())
  
  //
  // Draw mountains canvas (behind everything)
  //
  k.add([
    k.z(1),  // Very far back, behind trees
    {
      draw() {
        k.drawSprite({
          sprite: 'bg-touch-level2-mountains',
          pos: k.vec2(0, 0),
          anchor: "topleft"
        })
      }
    }
  ])
}
/**
 * First level background dark fir trees. They are distributed evenly across the screen.
 * @param {*} ctx Canvas context
 */
function drawBackgroundDarkestTrees(ctx) {
  const w = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
  const treesAmount = 50
  const treePeriod = w / treesAmount
  const treesLayers = 1

  for ( let i = 0; i < treesAmount; i++ ) {
    const x = i * treePeriod + Math.random() * treePeriod + LEFT_MARGIN
    drawFirTree(ctx, x, FLOOR_Y, arcY(x, LEFT_MARGIN, w, 400, 480), {
      layers: treesLayers,
      trunkWidthPercent: .03,
      trunkHeightPercent: Math.random() * .2 + .1,
      trunkColor: '#050505',
      leftColor: [7, 7, 7],
      rightColor: [10, 10, 10],
      layer0WidthPercent: .5,
      layersDecWidthPercent: .15,
      layersSharpness: Math.floor(Math.random() * 10 + 10)
    })
  }
}
function createBackgroundDarkestTrees(k) {
  const png = toPng({ width: k.width(), height: k.height() }, drawBackgroundDarkestTrees)
  k.loadSprite('bg-touch-level2-darkest-trees', png)  
  //
  // Draw trees canvas (behind all other trees - lowest z-index)
  //
  k.add([
    k.z(3),  // Behind background trees (z=4) but above mountains (z=1)
    {
      draw() {
        k.drawSprite({
          sprite: 'bg-touch-level2-darkest-trees',
          pos: k.vec2(0, 0),
          anchor: "topleft"
        })
      }
    }
  ])
}
/**
 * First level background dark fir trees. They are distributed evenly across the screen.
 * @param {*} ctx Canvas context
 */
function drawBackgroundDarkTrees(ctx) {
  const w = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
  const treesAmount = 30
  const treePeriod = w / treesAmount
  const treesLayers = 4

  for ( let i = 0; i < treesAmount; i++ ) {
    const x = i * treePeriod + Math.random() * treePeriod + LEFT_MARGIN
    drawFirTree(ctx, x, FLOOR_Y, arcY(x, LEFT_MARGIN, w, 300, 380), {
      layers: Math.random() * treesLayers + 4,
      trunkWidthPercent: .03,
      trunkHeightPercent: Math.random() * .2 + .1,
      trunkColor: '#101010',
      leftColor: [15, 15, 15],
      rightColor: [25, 20, 25],
      layer0WidthPercent: .3,
      layersDecWidthPercent: .15,
      layersSharpness: Math.floor(Math.random() * 10 + 10)
    })
  }
}

function createBackgroundDarkTrees(k) {
  const png = toPng({ width: k.width(), height: k.height() }, drawBackgroundDarkTrees)
  k.loadSprite('bg-touch-level2-background-dark-trees', png)
  //
  // Draw trees canvas (behind other trees)
  //
  k.add([
    k.z(4),  // Behind foreground trees (z=5) but above background
    {
      draw() {
        k.drawSprite({
          sprite: 'bg-touch-level2-background-dark-trees',
          pos: k.vec2(0, 0),
          anchor: "topleft"
        })
      }
    }
  ])
}
/**
 * First level foreground fir trees. They are distributed evenly across the screen.
 * @param {*} ctx Canvas context
 */
function drawForegroundTrees(ctx) {
  const w = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
  const treesAmount = 15
  const treePeriod = w / treesAmount
  const treesLayers = 4

  for ( let i = 0; i < treesAmount; i++ ) {
    const x = i * treePeriod + Math.random() * treePeriod + LEFT_MARGIN
    drawFirTree(ctx, x, FLOOR_Y, arcY(x, LEFT_MARGIN, w, 200, 280), {
      layers: Math.random() * treesLayers + 4,
      trunkWidthPercent: .03,
      trunkHeightPercent: Math.random() * .2 + .1,
      leftColor: [30, 100, 40],
      rightColor: [30, 150, 40],
      layer0WidthPercent: .3,
      layersDecWidthPercent: .15,
      layersSharpness: Math.floor(Math.random() * 10 + 10)
    })
  }
}

function createForegroundTrees(k) {
  const png = toPng({ width: k.width(), height: k.height() }, drawForegroundTrees)
  k.loadSprite('bg-touch-level2-foreground-trees', png)
  
  //
  // Draw trees canvas (in front of hero)
  //
  k.add([
    k.z(CFG.visual.zIndex.player - 1),  // In front of hero (z=11)
    {
      draw() {
        k.drawSprite({
          sprite: 'bg-touch-level2-foreground-trees',
          pos: k.vec2(0, 0),
          anchor: "topleft"
        })
      }
    }
  ])
}