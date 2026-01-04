import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { saveLastLevel, isSectionComplete } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import * as Dust from '../components/dust.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as LevelIndicator from '../components/level-indicator.js'
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
const FLOOR_Y = CFG.visual.screen.height - BOTTOM_MARGIN
//
// Hero spawn positions
//
const HERO_SPAWN_X = LEFT_MARGIN + 100
const HERO_SPAWN_Y = FLOOR_Y - 50
//
// Anti-hero spawn position (on top-left platform)
// Will be set after platforms are created
//
const ANTIHERO_SPAWN_X = LEFT_MARGIN + 200  // Same as first platform X
const ANTIHERO_SPAWN_Y = TOP_MARGIN + 250   // Same as first platform Y

/**
 * Level 2 scene for touch section - Simple level without obstacles
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel2(k) {
  k.scene("level-touch.2", () => {
    //
    // Save progress
    //
    saveLastLevel('level-touch.2')
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
        color: k.rgb(42, 42, 42)
      })
    })
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
    const isWordComplete = isSectionComplete('word')
    const isTimeComplete = isSectionComplete('time')
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
    const snowColor = '#96B4DC' // rgb(150, 180, 220) in hex
    
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
        // Transition after annihilation - go back to menu (last level)
        //
        createLevelTransition(k, 'level-touch.2', () => {
          k.go('menu')
        })
      },
      currentLevel: 'level-touch.2',
      jumpForce: CFG.game.jumpForce,
      addMouth: isWordComplete,
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
      color: { r: 150, g: 180, b: 220 }  // Snow color (light blue)
    })
    //
    // Create blue snow drifts on bottom platform floor
    //
    createSnowDrifts(k)
    //
    // Create arrow in snow pointing right (to guide hero direction)
    // Uses same style as arrows between anti-heroes in menu
    //
    const arrowY = FLOOR_Y - 40  // Slightly above bottom platform (moved down more)
    const arrowX = k.width() / 2 + 50  // Center arrow horizontally, shifted right by 50px
    const ARROWHEAD_SIZE = 24  // Larger arrowhead (increased from 18)
    const ARROW_OUTLINE_WIDTH = 2  // Outline width for body (reduced by 1px)
    const ARROWHEAD_OUTLINE_WIDTH = 4  // Outline width for triangle (unchanged)
    const ARROW_OPACITY = 1.0  // Same as menu arrows
    const ARROW_BODY_WIDTH = 16  // Width of arrow body rectangle (increased from 12)
    const ARROW_BODY_LENGTH = 45  // Shorter arrow body (reduced from 65)
    const arrowAngle = 0  // Pointing right (0 radians)
    const spreadAngle = Math.PI / 3  // 60 degrees spread (blunter triangle)
    const arrowColor = k.rgb(150, 180, 220)  // Snow color (light blue)
    const arrowOutlineColor = k.rgb(0, 0, 0)  // Black outline
    
    k.add([
      k.pos(arrowX, arrowY),
      k.z(CFG.visual.zIndex.platforms - 2),  // Behind platforms but visible
      {
        update() {
          //
          // Sway arrow up and down by a couple pixels
          //
          const swayAmount = 2  // 2 pixels up and down
          const swaySpeed = 2.5  // Speed of swaying
          const offsetY = Math.sin(k.time() * swaySpeed) * swayAmount
          this.pos.y = arrowY + offsetY
        },
        draw() {
          //
          // Draw arrow body (long rectangle on the left)
          //
          const bodyStartX = -ARROW_BODY_LENGTH
          const bodyEndX = -ARROWHEAD_SIZE / 2
          const bodyHalfWidth = ARROW_BODY_WIDTH / 2
          
          //
          // Draw body outline (darker, larger) with rounded corners
          //
          const bodyOutlineWidth = ARROW_BODY_WIDTH + ARROW_OUTLINE_WIDTH * 2
          const bodyOutlineHalfWidth = bodyOutlineWidth / 2
          const cornerRadius = 3  // Rounded corner radius
          k.drawRect({
            width: ARROW_BODY_LENGTH + ARROWHEAD_SIZE / 2 + ARROW_OUTLINE_WIDTH,
            height: bodyOutlineWidth,
            pos: k.vec2(bodyStartX - ARROW_OUTLINE_WIDTH / 2, 0),
            anchor: "center",
            radius: cornerRadius,
            color: arrowOutlineColor,
            opacity: ARROW_OPACITY
          })
          
          //
          // Draw main body rectangle with rounded corners
          //
          k.drawRect({
            width: ARROW_BODY_LENGTH + ARROWHEAD_SIZE / 2,
            height: ARROW_BODY_WIDTH,
            pos: k.vec2(bodyStartX, 0),
            anchor: "center",
            radius: cornerRadius,
            color: arrowColor,
            opacity: ARROW_OPACITY
          })
          
          //
          // Calculate arrow head points with rounded corners
          //
          const baseAngle = arrowAngle + Math.PI  // 180 degrees back
          const baseLeftAngle = baseAngle - spreadAngle
          const baseRightAngle = baseAngle + spreadAngle
          const triangleOffsetX = -12  // Shift triangle left (increased)
          const triangleCornerRadius = 3  // Rounded corner radius for triangle
          
          //
          // Helper function to create rounded corner points
          //
          const createRoundedCorner = (p1, corner, p2, radius, steps) => {
            const points = []
            //
            // Calculate vectors from corner to adjacent points
            //
            const v1x = p1.x - corner.x
            const v1y = p1.y - corner.y
            const v2x = p2.x - corner.x
            const v2y = p2.y - corner.y
            const len1 = Math.sqrt(v1x * v1x + v1y * v1y)
            const len2 = Math.sqrt(v2x * v2x + v2y * v2y)
            
            //
            // Normalize and calculate cut distance
            //
            const n1x = v1x / len1
            const n1y = v1y / len1
            const n2x = v2x / len2
            const n2y = v2y / len2
            
            //
            // Calculate angle between vectors
            //
            const dot = n1x * n2x + n1y * n2y
            const angle = Math.acos(Math.max(-1, Math.min(1, dot)))
            const cutDist = radius / Math.tan(angle / 2)
            
            //
            // Start and end points of rounded corner
            //
            const startX = corner.x + n1x * cutDist
            const startY = corner.y + n1y * cutDist
            const endX = corner.x + n2x * cutDist
            const endY = corner.y + n2y * cutDist
            
            //
            // Calculate center of arc
            //
            const bisectorX = n1x + n2x
            const bisectorY = n1y + n2y
            const bisectorLen = Math.sqrt(bisectorX * bisectorX + bisectorY * bisectorY)
            const centerDist = radius / Math.sin(angle / 2)
            const centerX = corner.x + (bisectorX / bisectorLen) * centerDist
            const centerY = corner.y + (bisectorY / bisectorLen) * centerDist
            
            //
            // Generate arc points
            //
            const startAngle = Math.atan2(startY - centerY, startX - centerX)
            const endAngle = Math.atan2(endY - centerY, endX - centerX)
            
            for (let i = 0; i <= steps; i++) {
              const t = i / steps
              let angle = startAngle + (endAngle - startAngle) * t
              //
              // Handle angle wrap
              //
              if (endAngle < startAngle) {
                angle = startAngle + (endAngle + Math.PI * 2 - startAngle) * t
                if (angle > Math.PI) angle -= Math.PI * 2
              }
              points.push(k.vec2(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius))
            }
            
            return { points, start: k.vec2(startX, startY), end: k.vec2(endX, endY) }
          }
          
          //
          // Tip point (pointing right, shifted left)
          //
          const tipPoint = k.vec2(ARROWHEAD_SIZE / 2 + triangleOffsetX, 0)
          const baseLeft = k.vec2(
            Math.cos(baseLeftAngle) * ARROWHEAD_SIZE + triangleOffsetX,
            Math.sin(baseLeftAngle) * ARROWHEAD_SIZE
          )
          const baseRight = k.vec2(
            Math.cos(baseRightAngle) * ARROWHEAD_SIZE + triangleOffsetX,
            Math.sin(baseRightAngle) * ARROWHEAD_SIZE
          )
          
          //
          // Create rounded corners for main triangle
          //
          const tipCorner = createRoundedCorner(baseRight, tipPoint, baseLeft, triangleCornerRadius, 8)
          const leftCorner = createRoundedCorner(tipPoint, baseLeft, baseRight, triangleCornerRadius, 8)
          const rightCorner = createRoundedCorner(baseLeft, baseRight, tipPoint, triangleCornerRadius, 8)
          
          //
          // Build triangle points with rounded corners
          //
          const trianglePoints = []
          trianglePoints.push(tipCorner.start)
          trianglePoints.push(...tipCorner.points.slice(1, -1))
          trianglePoints.push(leftCorner.start)
          trianglePoints.push(...leftCorner.points.slice(1, -1))
          trianglePoints.push(rightCorner.start)
          trianglePoints.push(...rightCorner.points.slice(1, -1))
          
          //
          // Outline triangle (larger) - bigger black outline (shifted left)
          //
          const outlineSize = ARROWHEAD_SIZE + ARROWHEAD_OUTLINE_WIDTH
          const outlineLeft = k.vec2(
            Math.cos(baseLeftAngle) * outlineSize + triangleOffsetX,
            Math.sin(baseLeftAngle) * outlineSize
          )
          const outlineRight = k.vec2(
            Math.cos(baseRightAngle) * outlineSize + triangleOffsetX,
            Math.sin(baseRightAngle) * outlineSize
          )
          
          //
          // Extend tip forward for outline (shifted left)
          //
          const outlineTipX = ARROWHEAD_SIZE / 2 + triangleOffsetX + Math.cos(arrowAngle) * ARROWHEAD_OUTLINE_WIDTH
          const outlineTipY = Math.sin(arrowAngle) * ARROWHEAD_OUTLINE_WIDTH
          const outlineTipPoint = k.vec2(outlineTipX, outlineTipY)
          
          //
          // Create rounded corners for outline triangle
          //
          const outlineTipCorner = createRoundedCorner(outlineRight, outlineTipPoint, outlineLeft, triangleCornerRadius + 1, 8)
          const outlineLeftCorner = createRoundedCorner(outlineTipPoint, outlineLeft, outlineRight, triangleCornerRadius + 1, 8)
          const outlineRightCorner = createRoundedCorner(outlineLeft, outlineRight, outlineTipPoint, triangleCornerRadius + 1, 8)
          
          //
          // Build outline triangle points with rounded corners
          //
          const outlinePoints = []
          outlinePoints.push(outlineTipCorner.start)
          outlinePoints.push(...outlineTipCorner.points.slice(1, -1))
          outlinePoints.push(outlineLeftCorner.start)
          outlinePoints.push(...outlineLeftCorner.points.slice(1, -1))
          outlinePoints.push(outlineRightCorner.start)
          outlinePoints.push(...outlineRightCorner.points.slice(1, -1))
          
          //
          // Draw filled polygon for outline (darker) with rounded corners
          //
          k.drawPolygon({
            pts: outlinePoints,
            color: arrowOutlineColor,
            opacity: ARROW_OPACITY
          })
          
          //
          // Draw main filled triangle (lighter) with rounded corners
          //
          k.drawPolygon({
            pts: trianglePoints,
            color: arrowColor,
            opacity: ARROW_OPACITY
          })
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
  const baseCloudColor = k.rgb(100, 100, 120)  // Gray-blue color for clouds
  
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
      mainSize: 50,
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
      mainSize: 42,
      puffs: [
        { radius: 0.8, offsetX: -0.7, offsetY: 0 },
        { radius: 0.85, offsetX: -0.3, offsetY: -0.08 },
        { radius: 0.75, offsetX: 0.3, offsetY: -0.08 },
        { radius: 0.8, offsetX: 0.7, offsetY: 0 },
        { radius: 0.7, offsetX: 0, offsetY: 0.12 }
      ],
      color: k.rgb(95, 95, 115),
      opacity: 0.55
    },
    //
    // Type 3: Small wide cloud (4 puffs)
    //
    {
      mainSize: 35,
      puffs: [
        { radius: 0.75, offsetX: -0.6, offsetY: 0 },
        { radius: 0.8, offsetX: -0.2, offsetY: -0.08 },
        { radius: 0.8, offsetX: 0.2, offsetY: -0.08 },
        { radius: 0.75, offsetX: 0.6, offsetY: 0 }
      ],
      color: k.rgb(105, 105, 125),
      opacity: 0.5
    },
    //
    // Type 4: Very wide cloud (7 puffs)
    //
    {
      mainSize: 55,
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
    const sizeVariation = 1.0 + Math.random() * 0.3  // 1.0 to 1.3 (larger for dense layer)
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
    const sizeVariation = 0.9 + Math.random() * 0.2  // 0.9 to 1.1
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
            color: k.rgb(150, 180, 220),  // Light blue
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
 * Creates a snow platform
 * Concept: A minimal rectangular platform made of blue snow
 * Simple, clean snow platform without internal elements
 * Blue color represents the coldness of touch, frozen connections
 * 
 * Visual design:
 * - Minimal rectangular platform (just enough to walk on)
 * - Blue snow material with subtle texture
 * - Clean, simple appearance
 * 
 * @param {Object} k - Kaplay instance
 */
function createRootBridgePlatform(k) {
  //
  // Platform position - connects left and right sides
  //
  const platformCenterX = CFG.visual.screen.width / 2
  const platformY = FLOOR_Y - 100  // Lower platform - jumpable height
  const platformWidth = 200  // Minimal width - just enough to walk on
  const platformHeight = 30  // Minimal height
  //
  // Colors for snow platform
  //
  const snowColor = k.rgb(150, 180, 220)  // Light blue for snow
  const darkSnowColor = k.rgb(120, 150, 190)  // Darker blue for depth
  const lightSnowColor = k.rgb(180, 210, 240)  // Lighter blue for highlights
  //
  // Create main platform (collision area)
  //
  k.add([
    k.rect(platformWidth, platformHeight),
    k.pos(platformCenterX, platformY),
    k.anchor("center"),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),  // Invisible - we'll draw custom graphics
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Create artistic platform visualization
  //
  k.add([
    k.pos(platformCenterX, platformY),
    k.z(CFG.visual.zIndex.platforms - 1),
    {
      draw() {
        //
        // Draw snow platform with wavy top surface (like snow drifts)
        //
        const steps = 20
        const points = []
        //
        // Create wavy top surface using similar formula as snow drifts
        //
        for (let i = 0; i <= steps; i++) {
          const t = i / steps
          const x = (t - 0.5) * platformWidth
          //
          // Create wavy snow surface - use parabolic curve like snow drifts
          //
          const waveHeight = 6  // Height of waves
          const y = -platformHeight / 2 - waveHeight * (1 - Math.pow(2 * t - 1, 2))
          points.push(k.vec2(x, y))
        }
        //
        // Add bottom points to close the shape (flat bottom)
        //
        points.push(k.vec2(platformWidth / 2, platformHeight / 2))
        points.push(k.vec2(-platformWidth / 2, platformHeight / 2))
        //
        // Draw main snow platform (wavy shape)
        //
        k.drawPolygon({
          pts: points,
          color: darkSnowColor,
          opacity: 0.9
        })
        //
        // Draw shadow layer (darker blue at bottom, like snow drifts)
        //
        const shadowPoints = []
        for (let i = 0; i <= steps; i++) {
          const t = i / steps
          const x = (t - 0.5) * platformWidth
          const waveHeight = 6
          const shadowHeight = waveHeight * 0.3
          const y = -platformHeight / 2 - shadowHeight * (1 - Math.pow(2 * t - 1, 2))
          shadowPoints.push(k.vec2(x, y))
        }
        shadowPoints.push(k.vec2(platformWidth / 2, platformHeight / 2))
        shadowPoints.push(k.vec2(-platformWidth / 2, platformHeight / 2))
        
        k.drawPolygon({
          pts: shadowPoints,
          color: k.rgb(100, 130, 180),  // Darker blue shadow
          opacity: 0.7
        })
        //
        // Draw lighter snow layer on top (wavy surface)
        //
        const topPoints = []
        for (let i = 0; i <= steps; i++) {
          const t = i / steps
          const x = (t - 0.5) * platformWidth
          const waveHeight = 6
          const y = -platformHeight / 2 - waveHeight * (1 - Math.pow(2 * t - 1, 2))
          topPoints.push(k.vec2(x, y))
        }
        //
        // Add bottom points for top layer (shallower, following wave)
        //
        for (let i = steps; i >= 0; i--) {
          const t = i / steps
          const x = (t - 0.5) * platformWidth
          const waveHeight = 6
          const topLayerHeight = platformHeight * 0.7
          const y = -platformHeight / 2 - waveHeight * (1 - Math.pow(2 * t - 1, 2)) + topLayerHeight
          topPoints.push(k.vec2(x, y))
        }
        
        k.drawPolygon({
          pts: topPoints,
          color: snowColor,
          opacity: 0.8
        })
      }
    }
  ])
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
  const snowColor = k.rgb(150, 180, 220)
  const darkSnowColor = k.rgb(120, 150, 190)
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

