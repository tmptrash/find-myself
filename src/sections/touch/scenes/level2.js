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
// Rounded corner configuration for game area
//
const CORNER_RADIUS = 20
const CORNER_SPRITE_NAME = 'touch2-corner-sprite'
const WALL_COLOR_HEX = '#1F1F1F'
//
// Platform dimensions
//
const FLOOR_Y = CFG.visual.screen.height - BOTTOM_MARGIN
//
// Hero spawn positions
//
const HERO_SPAWN_X = CFG.visual.screen.width - RIGHT_MARGIN - 250
const HERO_SPAWN_Y = FLOOR_Y - 50
//
// Icicle spike configuration (deadly floor barrier)
//
const ICICLE_HEIGHT_MIN = 50
const ICICLE_HEIGHT_MAX = 90
const ICICLE_WIDTH_MIN = 16
const ICICLE_WIDTH_MAX = 30
const ICICLE_SPACING = 22
const ICICLE_SAFE_ZONE_X = CFG.visual.screen.width - RIGHT_MARGIN - 400
const ICICLE_COLOR_R = 255
const ICICLE_COLOR_G = 255
const ICICLE_COLOR_B = 255
const ICICLE_OUTLINE_WIDTH = 2
const ICICLE_KILL_TOLERANCE = 10
//
// Moon configuration (drawn on mountains canvas)
//
const MOON_X = 1400
const MOON_Y = 320
const MOON_RADIUS = 56
const MOON_COLOR_R = 200
const MOON_COLOR_G = 195
const MOON_COLOR_B = 180
const MOON_GLOW_RADIUS = 30
//
// Pre-defined crater positions relative to moon center (fraction of radius)
//
const MOON_CRATERS = [
  { x: -0.3, y: -0.2, r: 0.25, dark: 25 },
  { x: 0.25, y: 0.15, r: 0.2, dark: 20 },
  { x: -0.1, y: 0.35, r: 0.16, dark: 30 },
  { x: 0.4, y: -0.25, r: 0.13, dark: 22 },
  { x: -0.45, y: 0.1, r: 0.11, dark: 18 },
  { x: 0.1, y: -0.45, r: 0.1, dark: 28 },
  { x: 0.3, y: 0.4, r: 0.09, dark: 15 }
]
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
    // Set background to match wall color (prevents visible bars at top/bottom)
    //
    k.setBackground(k.rgb(31, 31, 31))
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
    // Create rounded corners at all four game area corners
    //
    createRoundedCorners(k)
    //
    // Create level indicator (TOUCH letters)
    //
    const levelIndicator = LevelIndicator.create({
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
    // Generate icicle spikes on the floor (left portion, safe zone on right)
    //
    const icicleData = generateIcicles()
    //
    // Draw icicle spikes layer
    //
    k.add([
      k.pos(0, 0),
      k.z(11),
      {
        draw() {
          drawIcicles(k, icicleData)
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
      // Check if hero touches icicle spikes (deadly floor barrier)
      //
      if (!heroInst.isDying && heroInst.character?.pos) {
        checkIcicleCollision(k, heroInst, icicleData, levelIndicator)
      }
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
  // Create canvas and draw bushes on it using toPng
  //
  const createBushesCanvas = () => {
    //
    // Calculate arc multiplier for bushes (higher at edges, lower in center)
    //
    const screenCenter = k.width() / 2
    const maxDistance = Math.max(screenCenter - LEFT_MARGIN, k.width() - RIGHT_MARGIN - screenCenter)
    
    return toPng({ width: k.width(), height: k.height(), pixelRatio: 1 }, (ctx) => {
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
    })
  }
  
  const bushesDataURL = createBushesCanvas()
  const bushesTexture = k.loadSprite('bg-touch-level2-background-bushes-near', bushesDataURL)
  
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
  // Create canvas for mountains using toPng
  //
  const createMountainsCanvas = () => {
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
    
    return toPng({ width: screenWidth, height: screenHeight, pixelRatio: 1 }, (ctx) => {
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
      //
      // Draw moon in front of mountains
      //
      drawLevel2Moon(ctx)
    })
  }
  
  const mountainsDataURL = createMountainsCanvas()
  k.loadSprite('bg-touch-level2-mountains', mountainsDataURL)
  
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

/**
 * Generates icicle spike data for the bottom floor barrier
 * Icicles cover the floor from left wall to the safe zone on the right
 * @returns {Array} Array of icicle objects with position, size, and tip offset
 */
function generateIcicles() {
  const icicles = []
  const startX = LEFT_MARGIN + 5
  const endX = ICICLE_SAFE_ZONE_X
  for (let x = startX; x < endX; x += ICICLE_SPACING) {
    icicles.push({
      x: x + (Math.random() - 0.5) * 8,
      baseY: FLOOR_Y,
      width: ICICLE_WIDTH_MIN + Math.random() * (ICICLE_WIDTH_MAX - ICICLE_WIDTH_MIN),
      height: ICICLE_HEIGHT_MIN + Math.random() * (ICICLE_HEIGHT_MAX - ICICLE_HEIGHT_MIN),
      tipOffset: (Math.random() - 0.5) * 4
    })
  }
  return icicles
}

/**
 * Draws icicle spikes pointing upward from the floor
 * Each icicle has a dark outline and semi-transparent blue-white fill
 * @param {Object} k - Kaplay instance
 * @param {Array} icicleData - Array of icicle objects
 */
function drawIcicles(k, icicleData) {
  const outlineColor = k.rgb(0, 0, 0)
  const icicleColor = k.rgb(ICICLE_COLOR_R, ICICLE_COLOR_G, ICICLE_COLOR_B)
  const ow = ICICLE_OUTLINE_WIDTH
  icicleData.forEach(icicle => {
    //
    // Draw black outline (slightly larger triangle behind the icicle)
    //
    k.drawPolygon({
      pts: [
        k.vec2(icicle.x - icicle.width / 2 - ow, icicle.baseY + ow),
        k.vec2(icicle.x + icicle.width / 2 + ow, icicle.baseY + ow),
        k.vec2(icicle.x + icicle.tipOffset, icicle.baseY - icicle.height - ow)
      ],
      color: outlineColor
    })
    //
    // Draw icicle fill (semi-transparent blue-white)
    //
    k.drawPolygon({
      pts: [
        k.vec2(icicle.x - icicle.width / 2, icicle.baseY),
        k.vec2(icicle.x + icicle.width / 2, icicle.baseY),
        k.vec2(icicle.x + icicle.tipOffset, icicle.baseY - icicle.height)
      ],
      color: icicleColor
    })
  })
}

/**
 * Checks if hero is touching any icicle spike and triggers death
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @param {Array} icicleData - Array of icicle objects
 */
function checkIcicleCollision(k, heroInst, icicleData, levelIndicator) {
  const heroX = heroInst.character.pos.x
  const heroY = heroInst.character.pos.y
  //
  // Hero is only at risk if within the icicle zone (left of safe zone)
  //
  if (heroX > ICICLE_SAFE_ZONE_X) return
  //
  // Check if hero feet are near floor level and within icicle X range
  //
  for (const icicle of icicleData) {
    const dx = Math.abs(heroX - icicle.x)
    if (dx > icicle.width) continue
    //
    // Hero dies if their center is below the icicle tip
    //
    if (heroY > icicle.baseY - icicle.height + ICICLE_KILL_TOLERANCE) {
      onHeroDeath(k, heroInst, levelIndicator)
      return
    }
  }
}
//
// Life death effect constants
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
const DEATH_RELOAD_DELAY = 0.8

/**
 * Handles hero death: increments life score, plays laugh sound,
 * flashes life image, creates particles, then reloads the level
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @param {Object} levelIndicator - Level indicator with lifeImage and updateLifeScore
 */
function onHeroDeath(k, heroInst, levelIndicator) {
  if (heroInst.isDying) return
  Hero.death(heroInst, () => {
    const currentScore = get('lifeScore', 0)
    const newScore = currentScore + 1
    set('lifeScore', newScore)
    levelIndicator?.updateLifeScore?.(newScore)
    //
    // Play laugh sound and trigger life image visual effects
    //
    if (levelIndicator?.lifeImage?.sprite?.exists?.()) {
      Sound.playLifeSound(k)
      const originalColor = levelIndicator.lifeImage.sprite.color
      flashLifeImage(k, levelIndicator, originalColor, 0)
      createLifeParticles(k, levelIndicator)
    }
    k.wait(DEATH_RELOAD_DELAY, () => k.go('level-touch.2'))
  })
}

/**
 * Flashes life image red/white alternating to indicate death
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator with lifeImage
 * @param {Object} originalColor - Original color to restore after flash
 * @param {number} count - Current flash iteration
 */
function flashLifeImage(k, levelIndicator, originalColor, count) {
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
  k.wait(LIFE_FLASH_INTERVAL, () => flashLifeImage(k, levelIndicator, originalColor, count + 1))
}

/**
 * Creates red particles radiating outward from the life image on death
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator with lifeImage position
 */
function createLifeParticles(k, levelIndicator) {
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
    let elapsed = 0
    particle.onUpdate(() => {
      elapsed += k.dt()
      particle.pos.x += vx * k.dt()
      particle.pos.y += vy * k.dt()
      particle.opacity = 1 - elapsed / lifetime
      if (elapsed >= lifetime) {
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
  // Bottom-left corner (rotate 270°)
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(LEFT_MARGIN, CFG.visual.screen.height - BOTTOM_MARGIN),
    k.rotate(270),
    k.z(CFG.visual.zIndex.platforms + 1)
  ])
  //
  // Bottom-right corner (rotate 180°)
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(CFG.visual.screen.width - RIGHT_MARGIN, CFG.visual.screen.height - BOTTOM_MARGIN),
    k.rotate(180),
    k.z(CFG.visual.zIndex.platforms + 1)
  ])
}

/**
 * Draws a full moon with smooth radial glow and craters on the background canvas
 * Uses canvas radial gradient for seamless glow falloff
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function drawLevel2Moon(ctx) {
  ctx.save()
  //
  // Draw smooth radial glow using canvas gradient
  //
  const outerR = MOON_RADIUS + MOON_GLOW_RADIUS
  const gradient = ctx.createRadialGradient(MOON_X, MOON_Y, MOON_RADIUS * 0.8, MOON_X, MOON_Y, outerR)
  gradient.addColorStop(0, `rgba(${MOON_COLOR_R}, ${MOON_COLOR_G}, ${MOON_COLOR_B}, 0.15)`)
  gradient.addColorStop(0.4, `rgba(${MOON_COLOR_R}, ${MOON_COLOR_G}, ${MOON_COLOR_B}, 0.06)`)
  gradient.addColorStop(1, `rgba(${MOON_COLOR_R}, ${MOON_COLOR_G}, ${MOON_COLOR_B}, 0)`)
  ctx.beginPath()
  ctx.arc(MOON_X, MOON_Y, outerR, 0, Math.PI * 2)
  ctx.fillStyle = gradient
  ctx.fill()
  //
  // Draw solid moon disc
  //
  ctx.beginPath()
  ctx.arc(MOON_X, MOON_Y, MOON_RADIUS, 0, Math.PI * 2)
  ctx.fillStyle = `rgb(${MOON_COLOR_R}, ${MOON_COLOR_G}, ${MOON_COLOR_B})`
  ctx.fill()
  //
  // Draw craters as darker circles clipped to moon disc
  //
  ctx.save()
  ctx.beginPath()
  ctx.arc(MOON_X, MOON_Y, MOON_RADIUS, 0, Math.PI * 2)
  ctx.clip()
  MOON_CRATERS.forEach(crater => {
    const cr = MOON_COLOR_R - crater.dark
    const cg = MOON_COLOR_G - crater.dark
    const cb = MOON_COLOR_B - crater.dark
    ctx.beginPath()
    ctx.arc(
      MOON_X + crater.x * MOON_RADIUS,
      MOON_Y + crater.y * MOON_RADIUS,
      crater.r * MOON_RADIUS,
      0, Math.PI * 2
    )
    ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`
    ctx.fill()
  })
  ctx.restore()
  ctx.restore()
}
