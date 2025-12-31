import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { saveLastLevel } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import * as Bugs from '../components/bugs.js'
import * as Dust from '../components/dust.js'
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
const FLOOR_Y = CFG.visual.screen.height - BOTTOM_MARGIN - 250
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
    saveLastLevel('level-touch.1')
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
    // Bottom platform (full width) - raised by 250px, but extends to bottom
    //
    k.add([
      k.rect(CFG.visual.screen.width, BOTTOM_MARGIN + 250),
      k.pos(CFG.visual.screen.width / 2, CFG.visual.screen.height - (BOTTOM_MARGIN + 250) / 2),
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
      // Large pause before activation to let player realize they succeeded
      //
      k.wait(1.5, () => {
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
        // Go back to menu after annihilation
        //
        createLevelTransition(k, 'level-touch.1', () => {
          k.go('menu')
        })
      },
      currentLevel: 'level-touch.1'
    })
    //
    // Spawn hero and anti-hero
    //
    Hero.spawn(heroInst)
    Hero.spawn(antiHeroInst)
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
    // Create dust particles
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
    // Update and draw dust
    //
    k.onUpdate(() => {
      const dt = k.dt()
      Dust.onUpdate(dustInst, dt)
    })
    //
    // Add custom drawing for dust particles
    //
    k.add([
      {
        draw() {
          Dust.draw(dustInst)
        }
      }
    ])
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
          console.log('Sequence reset: same tree touched twice. Current sequence:', gameState.playerSequence)
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
            console.log('Sequence reset: pause too short. Current sequence:', gameState.playerSequence)
            return
          }
          //
          // Pause is sufficient - clear the completion time
          //
          gameState.sequenceCompleteTime = null
          gameState.pauseTimer = 0
        }
        
        //
        // Debug: log when note processing starts
        //
        console.log('Processing note:', touchedTreeIndex, 'Current sequence before:', [...gameState.playerSequence])
        
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
          console.log('Sequence reset: no matching position found. Current sequence:', gameState.playerSequence)
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
          console.log('Sequence reset: already complete. Current sequence:', gameState.playerSequence)
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
            console.log('Sequence reset: wrong note. Expected:', expectedNote, 'Got:', touchedTreeIndex, 'Current sequence:', gameState.playerSequence)
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
        // Debug: log current sequence
        //
        console.log('Current sequence:', gameState.playerSequence)
        
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
  })
}

