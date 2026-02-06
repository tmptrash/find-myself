import { CFG } from '../cfg.js'
import { initScene, stopTimeSectionMusic } from '../components/scene-helper.js'
import * as Hero from '../../../components/hero.js'
import * as Sound from '../../../utils/sound.js'
import { set, get } from '../../../utils/progress.js'
import { getColor, toPng, parseHex } from '../../../utils/helper.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as OneSpikes from '../components/one-spikes.js'
import * as MovingCars from '../components/moving-cars.js'
//
// Platform dimensions (in pixels, for 1920x1080 resolution)
//
const PLATFORM_TOP_HEIGHT = 100
const PLATFORM_BOTTOM_HEIGHT = 100
const PLATFORM_SIDE_WIDTH = 50
const CORNER_RADIUS = 20  // Radius for rounded corners
//
// Corridor dimensions
//
const CORRIDOR_HEIGHT = 200  // Height of the corridor
const UPPER_CORRIDOR_HEIGHT = 350  // Upper corridor is taller to fit clouds
const CORRIDOR_Y = 200  // Position upper corridor at top (room for clouds above)
const LOWER_CORRIDOR_Y = 680  // Position lower corridor
const PASSAGE_WIDTH = 100  // Width of passage between corridors
//
// Hero and monster spawn positions
//
const HERO_SPAWN_X = 350  // Hero starts more to the right
const HERO_SPAWN_Y = CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT / 2
const MONSTER_SPAWN_X = PLATFORM_SIDE_WIDTH + 30  // Monster starts at the left (closer to wall)
const MONSTER_SPAWN_Y = CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT / 2
const ANTIHERO_SPAWN_X = PLATFORM_SIDE_WIDTH + 50  // Anti-hero at the left of lower corridor
const ANTIHERO_SPAWN_Y = LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT / 2
//
// Section configuration
//
const SECTION_COUNT = 11  // Number of sections from left to right

/**
 * Time section level 3 scene
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel3(k) {
  k.scene("level-time.3", () => {
    //
    // Save progress immediately when entering this level
    //
    set('lastLevel', 'level-time.3')
    //
    // Stop previous level music
    //
    stopTimeSectionMusic()
    //
    // Create sound instance
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    //
    // Start time.mp3, kids.mp3 and clock.mp3 background music
    //
    const timeMusic = k.play('time', {
      loop: true,
      volume: CFG.audio.backgroundMusic.time
    })
    const kidsMusic = k.play('time0-kids', {
      loop: true,
      volume: CFG.audio.backgroundMusic.kids
    })
    const clockMusic = k.play('clock', {
      loop: true,
      volume: CFG.audio.backgroundMusic.clock
    })
    //
    // Stop all music when leaving the scene
    //
    k.onSceneLeave(() => {
      timeMusic.stop()
      kidsMusic.stop()
      clockMusic.stop()
    })
    //
    // Initialize level with heroes (skip default platforms)
    //
    const { hero, antiHero, levelIndicator } = initScene({
      k,
      levelName: 'level-time.3',
      levelNumber: 4,
      skipPlatforms: true,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: CORRIDOR_Y - 50,  // UI positioned above upper corridor with more space
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y
    })
    //
    // Create custom corridor platforms
    //
    createCorridorPlatforms(k)
    //
    // Add city background (preloaded sprite with autumn leaves)
    //
    k.add([
      k.sprite('city-background-level3'),
      k.pos(CFG.visual.screen.width / 2, CFG.visual.screen.height / 2),
      k.anchor('center'),
      k.z(13)  // Behind everything except gradient
    ])
    //
    // Add clouds at the top of upper corridor
    //
    createCloudsAtTop(k)
    //
    // Add moving cars on bottom platform
    //
    MovingCars.create({
      k,
      platformBottomHeight: PLATFORM_BOTTOM_HEIGHT,
      platformSideWidth: PLATFORM_SIDE_WIDTH,
      carCount: 5
    })
    //
    // Create time sections with clocks
    //
    const sections = createTimeSections(k)
    //
    // Create monster that chases the hero
    //
    const monster = createMonster(k, hero, sound, levelIndicator)
    //
    // Setup control inversion based on current section
    //
    setupControlInversion(hero, sections)
    //
    // Spawn hero
    //
    Hero.spawn(hero)
    //
    // Set hero z-index between snow layers (behind snow at z=25, in front of snow at z=12)
    //
    hero.character.z = 20
    //
    // Spawn anti-hero
    //
    Hero.spawn(antiHero)
    //
    // Set anti-hero z-index between snow layers (behind snow at z=25, in front of snow at z=12)
    //
    antiHero.character.z = 20
    //
    // Create snow particle system
    //
    const snowSystem = createSnowParticles(k)
    //
    // Update snow particles
    //
    k.onUpdate(() => {
      updateSnowParticles(snowSystem)
    })
    //
    // Create obstacle spikes (digit "1") in clusters in both corridors
    //
    createObstacleSpikes(k, hero, sound, levelIndicator, sections)
    //
    // Create snow drifts on corridor floors
    //
    createSnowDrifts(k)
    //
    // Create rounded corners for corridors
    //
    createRoundedCorners(k)
    //
    // Check if monster collides with hero or clocks
    //
    k.onUpdate(() => {
      //
      // Check collision with hero
      //
      if (hero && !hero.isDying && !hero.isAnnihilating) {
        const bodyDistX = Math.abs(monster.x - hero.character.pos.x)
        const bodyDistY = Math.abs(monster.y - hero.character.pos.y)
        
        if (bodyDistX < 50 && bodyDistY < 50) {
          //
          // Monster touched hero - trigger death sequence with life score effects
          //
          const savedSfx = hero.sfx
          const savedLevelIndicator = levelIndicator
          //
          // 1. Stop subtitle sound immediately if playing
          //
          Sound.stopSubtitleSound()
          //
          // 2. Trigger death animation
          //
          Hero.death(hero, () => {
            //
            // 3. After death particles dispersed, minimal pause before life effects
            //
            k.wait(0.1, () => {
              //
              // 4. Lower all level sounds (ambient, background music)
              //
              if (savedSfx && savedSfx.audioContext) {
                const ctx = savedSfx.audioContext
                //
                // Fade out ambient and other sounds quickly
                //
                if (savedSfx.ambientGain) {
                  savedSfx.ambientGain.gain.setValueAtTime(savedSfx.ambientGain.gain.value, ctx.currentTime)
                  savedSfx.ambientGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
                }
              }
              //
              // Stop or fade all background music tracks
              //
              Sound.fadeOutAllMusic()
              //
              // 5. Increment life score and show all effects
              //
              const currentScore = get('lifeScore', 0)
              const newScore = currentScore + 1
              set('lifeScore', newScore)
              
              if (savedLevelIndicator && savedLevelIndicator.lifeImage && savedLevelIndicator.lifeImage.sprite && savedLevelIndicator.lifeImage.sprite.exists()) {
                //
                // Update score text and remove old outline
                //
                if (savedLevelIndicator.updateLifeScore) {
                  savedLevelIndicator.updateLifeScore(newScore)
                }
                //
                // Play life sound
                //
                Sound.playLifeSound(k)
                //
                // Flash life image red aggressively (20 flashes = 1 second, faster)
                //
                const originalColor = savedLevelIndicator.lifeImage.sprite.color
                flashLifeImageLevel3(k, savedLevelIndicator, originalColor, 0)
                //
                // Create particles around life score
                //
                createLifeScoreParticlesLevel3(k, savedLevelIndicator)
              }
              //
              // 6. Wait 0.8 seconds for effects to be visible, then reload
              //
              k.wait(0.8, () => {
                k.go('level-time.3')
              })
            })
          })
        }
      }
      
      sections.forEach(section => {
        if (section.clock && section.clock.exists && section.clock.exists()) {
          let shouldDestroy = false
          //
          // Check collision with monster body
          //
          const bodyDistX = Math.abs(monster.x - section.clock.pos.x)
          const bodyDistY = Math.abs(monster.y - section.clock.pos.y)
          
          if (bodyDistX < 40 && bodyDistY < 40) {
            shouldDestroy = true
          }
          //
          // Check collision with each leg (end point of each leg)
          //
          if (!shouldDestroy) {
            monster.legs.forEach(leg => {
              //
              // Get the position of the last segment (foot) of each leg
              //
              const lastSegmentIndex = leg.segments.length - 1
              if (lastSegmentIndex >= 0) {
                const footX = leg.segments[lastSegmentIndex].x
                const footY = leg.segments[lastSegmentIndex].y
                const footDistX = Math.abs(footX - section.clock.pos.x)
                const footDistY = Math.abs(footY - section.clock.pos.y)
                
                if (footDistX < 30 && footDistY < 30) {
                  shouldDestroy = true
                }
              }
            })
          }
          //
          // If monster or any leg touched the clock, destroy it with particle effect
          //
          if (shouldDestroy) {
            createClockDisintegrationEffect(k, section.clock)
            k.destroy(section.clock)
            section.clock = null  // Mark as destroyed
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
  })
}

/**
 * Create corridor platforms for level 3
 * @param {Object} k - Kaplay instance
 */
function createCorridorPlatforms(k) {
  const platformColor = getColor(k, CFG.visual.colors.platform)
  //
  // Top corridor wall (upper corridor ceiling)
  //
  k.add([
    k.rect(k.width(), CORRIDOR_Y),
    k.pos(0, 0),
    k.area(),
    k.body({ isStatic: true }),
    platformColor,
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Middle wall between corridors (with passage on the right)
  //
  const passageStartX = k.width() - PLATFORM_SIDE_WIDTH - PASSAGE_WIDTH
  k.add([
    k.rect(passageStartX, LOWER_CORRIDOR_Y - (CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT)),
    k.pos(0, CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT),
    k.area(),
    k.body({ isStatic: true }),
    platformColor,
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Bottom wall (lower corridor floor)
  //
  k.add([
    k.rect(k.width(), k.height() - (LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT)),
    k.pos(0, LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT),
    k.area(),
    k.body({ isStatic: true }),
    platformColor,
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Lower corridor ceiling (from left to passage)
  //
  k.add([
    k.rect(passageStartX, CORRIDOR_HEIGHT),
    k.pos(0, LOWER_CORRIDOR_Y - CORRIDOR_HEIGHT),
    k.area(),
    k.body({ isStatic: true }),
    platformColor,
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Left wall (covers both corridors)
  //
  k.add([
    k.rect(PLATFORM_SIDE_WIDTH, LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT),
    k.pos(0, CORRIDOR_Y),
    k.area(),
    k.body({ isStatic: true }),
    platformColor,
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Right wall (covers both corridors)
  //
  k.add([
    k.rect(PLATFORM_SIDE_WIDTH, LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT),
    k.pos(k.width() - PLATFORM_SIDE_WIDTH, CORRIDOR_Y),
    k.area(),
    k.body({ isStatic: true }),
    platformColor,
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
}

/**
 * Create snow particle system
 * @param {Object} k - Kaplay instance
 * @returns {Object} Snow system instance
 */
function createSnowParticles(k) {
  const particles = []
  const PARTICLE_COUNT = 800
  const MARGIN = 10  // Margin from platform edges
  const gameAreaLeft = PLATFORM_SIDE_WIDTH + MARGIN
  const gameAreaRight = k.width() - PLATFORM_SIDE_WIDTH - MARGIN
  const gameAreaWidth = gameAreaRight - gameAreaLeft
  const HEIGHT = k.height()
  //
  // Create particles as game objects with random initial positions within game area
  //
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const size = 1 + Math.random() * 2
    const opacity = 0.3 + Math.random() * 0.4
    //
    // Create particle as a game object (constrained to game area horizontally)
    //
    const particle = k.add([
      k.rect(size, size),
      k.pos(gameAreaLeft + Math.random() * gameAreaWidth, Math.random() * HEIGHT),
      k.color(255, 255, 255),
      k.opacity(opacity),
      k.z(100),  // Very high z-index to be above everything
      k.fixed()  // Fixed to screen, not world
    ])
    
    particles.push({
      obj: particle,
      speedX: 150 + Math.random() * 100,
      speedY: -30 + Math.random() * 60,
      gameAreaLeft,
      gameAreaRight,
      gameAreaWidth,
      height: HEIGHT
    })
  }
  
  return {
    k,
    particles,
    gameAreaLeft,
    gameAreaRight,
    gameAreaWidth
  }
}

/**
 * Update snow particles
 * @param {Object} inst - Snow system instance
 */
function updateSnowParticles(inst) {
  const { k, particles, gameAreaLeft, gameAreaRight, gameAreaWidth } = inst
  const dt = k.dt()
  //
  // Get screen bounds
  //
  const screenHeight = k.height()
  //
  // Update each particle
  //
  particles.forEach(p => {
    //
    // Move particle right with vertical variation (blizzard)
    //
    p.obj.pos.x += p.speedX * dt
    p.obj.pos.y += p.speedY * dt
    //
    // Wrap around when particle goes off game area (constrained horizontally)
    //
    if (p.obj.pos.x > gameAreaRight + 10) {
      p.obj.pos.x = gameAreaLeft - 10
      p.obj.pos.y = Math.random() * screenHeight
      p.speedY = -30 + Math.random() * 60
    }
    if (p.obj.pos.x < gameAreaLeft - 10) {
      p.obj.pos.x = gameAreaRight + 10
      p.obj.pos.y = Math.random() * screenHeight
    }
    if (p.obj.pos.y < -10) {
      p.obj.pos.y = screenHeight + 10
      p.obj.pos.x = gameAreaLeft + Math.random() * gameAreaWidth
    }
    if (p.obj.pos.y > screenHeight + 10) {
      p.obj.pos.y = -10
      p.obj.pos.x = gameAreaLeft + Math.random() * gameAreaWidth
    }
  })
}

/**
 * Create time sections with clock backgrounds
 * @param {Object} k - Kaplay instance
 * @returns {Array} Array of section objects
 */
function createTimeSections(k) {
  const sections = []
  const upperCorridorCenterY = CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT / 2
  const lowerCorridorCenterY = LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT / 2
  //
  // Fixed section configuration for upper corridor (4 sections with fixed inversion pattern)
  //
  const UPPER_SECTION_COUNT = 4
  const upperCorridorWidth = k.width() - PLATFORM_SIDE_WIDTH * 2 - PASSAGE_WIDTH
  const upperSectionWidth = upperCorridorWidth / UPPER_SECTION_COUNT
  //
  // Fixed inversion pattern: false, true, false, true (alternating)
  //
  const upperInversionPattern = [false, true, false, true]
  
  for (let i = 0; i < UPPER_SECTION_COUNT; i++) {
    const sectionStartX = PLATFORM_SIDE_WIDTH + upperSectionWidth * i
    const sectionCenterX = sectionStartX + upperSectionWidth / 2
    const isReversed = upperInversionPattern[i]
    const clockSize = 42 + (i * 3)  // Fixed progression: 42, 45, 48, 51
    const clockGrayLevel = 160 + (i * 15)  // Fixed progression: 160, 175, 190, 205
    const clockYOffset = -20 + (i * 10)  // Fixed progression: -20, -10, 0, 10
    const minutes = 10 + (i * 15)  // Fixed times: 10, 25, 40, 55
    const seconds = i * 15  // Fixed seconds: 0, 15, 30, 45
    
    const clock = k.add([
      k.text(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`, {
        size: clockSize,
        align: "center"
      }),
      k.pos(sectionCenterX, upperCorridorCenterY + clockYOffset),
      k.anchor("center"),
      k.color(clockGrayLevel, clockGrayLevel, clockGrayLevel),
      k.opacity(0.7),
      k.z(19),  // High z-index to be visible above background
      k.fixed()
    ])
    
    sections.push({
      x: sectionStartX,
      y: CORRIDOR_Y,
      width: upperSectionWidth,
      height: UPPER_CORRIDOR_HEIGHT,
      centerX: sectionCenterX,
      isReversed,
      clock,
      clockTime: { minutes, seconds },
      corridor: 'upper'
    })
  }
  //
  // Fixed section configuration for lower corridor (5 sections with fixed inversion pattern)
  //
  const LOWER_SECTION_COUNT = 5
  const lowerCorridorWidth = k.width() - PLATFORM_SIDE_WIDTH * 2
  const lowerSectionWidth = lowerCorridorWidth / LOWER_SECTION_COUNT
  //
  // Fixed inversion pattern: true, false, true, false, true (alternating, starting with true)
  //
  const lowerInversionPattern = [true, false, true, false, true]
  
  for (let i = 0; i < LOWER_SECTION_COUNT; i++) {
    const sectionStartX = PLATFORM_SIDE_WIDTH + lowerSectionWidth * i
    const sectionCenterX = sectionStartX + lowerSectionWidth / 2
    const isReversed = lowerInversionPattern[i]
    const clockSize = 44 + (i * 2)  // Fixed progression: 44, 46, 48, 50, 52
    const clockGrayLevel = 150 + (i * 12)  // Fixed progression: 150, 162, 174, 186, 198
    const clockYOffset = -25 + (i * 12)  // Fixed progression: -25, -13, -1, 11, 23
    const minutes = 5 + (i * 12)  // Fixed times: 5, 17, 29, 41, 53
    const seconds = i * 12  // Fixed seconds: 0, 12, 24, 36, 48
    
    const clock = k.add([
      k.text(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`, {
        size: clockSize,
        align: "center"
      }),
      k.pos(sectionCenterX, lowerCorridorCenterY + clockYOffset),
      k.anchor("center"),
      k.color(clockGrayLevel, clockGrayLevel, clockGrayLevel),
      k.opacity(0.7),
      k.z(19),  // High z-index to be visible above background
      k.fixed()
    ])
    
    sections.push({
      x: sectionStartX,
      y: LOWER_CORRIDOR_Y,
      width: lowerSectionWidth,
      height: CORRIDOR_HEIGHT,
      centerX: sectionCenterX,
      isReversed,
      clock,
      clockTime: { minutes, seconds },
      corridor: 'lower'
    })
  }
  //
  // Animate clocks
  //
  k.onUpdate(() => {
    sections.forEach(section => {
      //
      // Skip if clock was destroyed
      //
      if (!section.clock || !section.clock.exists || !section.clock.exists()) {
        return
      }
      
      if (section.isReversed) {
        //
        // Decrease time
        //
        section.clockTime.seconds -= k.dt()
        
        if (section.clockTime.seconds < 0) {
          section.clockTime.seconds = 59
          section.clockTime.minutes--
          if (section.clockTime.minutes < 0) {
            section.clockTime.minutes = 59
          }
        }
      } else {
        //
        // Increase time
        //
        section.clockTime.seconds += k.dt()
        
        if (section.clockTime.seconds >= 60) {
          section.clockTime.seconds = 0
          section.clockTime.minutes++
          if (section.clockTime.minutes >= 60) {
            section.clockTime.minutes = 0
          }
        }
      }
      //
      // Update display
      //
      const m = Math.floor(Math.abs(section.clockTime.minutes))
      const s = Math.floor(Math.abs(section.clockTime.seconds))
      section.clock.text = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    })
  })
  
  return sections
}

/**
 * Create clock disintegration particle effect
 * @param {Object} k - Kaplay instance
 * @param {Object} clock - Clock text object to disintegrate
 */
function createClockDisintegrationEffect(k, clock) {
  const PARTICLE_COUNT = 30
  const PARTICLE_SIZE = 3
  const clockPos = clock.pos
  const clockColor = clock.color || k.rgb(180, 180, 180)
  //
  // Create particles at clock position
  //
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    //
    // Random starting position around clock
    //
    const offsetX = k.rand(-20, 20)
    const offsetY = k.rand(-15, 15)
    //
    // Random velocity (explosion outward)
    //
    const angle = k.rand(0, Math.PI * 2)
    const speed = k.rand(100, 300)
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed
    //
    // Create particle
    //
    const particle = k.add([
      k.rect(PARTICLE_SIZE, PARTICLE_SIZE),
      k.pos(clockPos.x + offsetX, clockPos.y + offsetY),
      k.color(clockColor.r, clockColor.g, clockColor.b),
      k.opacity(1.0),
      k.anchor("center"),
      k.z(19),  // Above everything except UI
      k.fixed()
    ])
    //
    // Store velocity and lifetime
    //
    particle.vx = vx
    particle.vy = vy
    particle.lifetime = 0
    particle.maxLifetime = 1.0  // Particles last 1 second
    //
    // Animate particle
    //
    particle.onUpdate(() => {
      const dt = k.dt()
      particle.lifetime += dt
      //
      // Move particle
      //
      particle.pos.x += particle.vx * dt
      particle.pos.y += particle.vy * dt
      //
      // Apply gravity
      //
      particle.vy += 500 * dt
      //
      // Fade out
      //
      const fadeProgress = particle.lifetime / particle.maxLifetime
      particle.opacity = 1 - fadeProgress
      //
      // Destroy when lifetime is over
      //
      if (particle.lifetime >= particle.maxLifetime) {
        k.destroy(particle)
      }
    })
  }
}

/**
 * Create monster that chases the hero
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @param {Object} sfx - Sound instance for step sounds
 * @returns {Object} Monster instance with returnHome method
 */
function createMonster(k, heroInst, sfx, levelIndicator) {
  const MONSTER_SPEED = 110  // Even faster movement
  const BODY_SIZE = 60
  const LEG_COUNT = 8
  const SEGMENT_COUNT = 6
  const SEGMENT_LENGTH = 24
  const LEG_WIDTH = 6
  const STEP_HEIGHT = 40  // How high legs lift when stepping
  
  const monsterX = MONSTER_SPAWN_X
  const monsterY = MONSTER_SPAWN_Y
  //
  // Create legs with IK
  //
  const legs = []
  for (let i = 0; i < LEG_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / LEG_COUNT
    const restDistance = 60  // Distance from center when at rest
    const bodyEdgeOffset = 10  // Start legs from inside the body (close to center)
    const leg = {
      segments: [],
      targetX: monsterX + Math.cos(angle) * restDistance,
      targetY: monsterY + Math.sin(angle) * restDistance,
      groundTargetX: monsterX + Math.cos(angle) * restDistance,
      groundTargetY: monsterY + Math.sin(angle) * restDistance,
      baseAngle: angle,
      stepPhase: (i / LEG_COUNT),  // Offset so legs step in sequence
      isLifted: false,
      liftProgress: 0,
      lastStepSoundTime: 0  // Track when last sound was played
    }
    //
    // Create segments for this leg starting from body edge
    //
    for (let j = 0; j < SEGMENT_COUNT; j++) {
      leg.segments.push({
        x: monsterX + Math.cos(angle) * (bodyEdgeOffset + j * SEGMENT_LENGTH),
        y: monsterY + Math.sin(angle) * (bodyEdgeOffset + j * SEGMENT_LENGTH)
      })
    }
    
    legs.push(leg)
  }
  //
  // Create body (morphing shape) - use many small overlapping circles
  //
  const bodyCircles = []
  const BODY_CIRCLE_COUNT = 60
  for (let i = 0; i < BODY_CIRCLE_COUNT; i++) {
    const baseRadius = (BODY_SIZE / 4) * (0.3 + Math.random() * 1.2)
    const circle = k.add([
      k.circle(baseRadius),
      k.pos(monsterX, monsterY),
      k.color(40, 40, 45),
      k.opacity(1.0),
      k.z(14),
      k.fixed()
    ])
    bodyCircles.push({
      obj: circle,
      phaseOffset: Math.random() * Math.PI * 2,
      radius: 0.3 + Math.random() * 0.8,
      speed: 0.6 + Math.random() * 0.8,
      baseRadius: baseRadius
    })
  }
  //
  // Create eyes
  //
  const eyes = []
  const EYE_RADIUS = 6
  const PUPIL_RADIUS = 3
  const eyePositions = [
    { x: -12, y: -12 },  // Top-left
    { x: 12, y: -12 },   // Top-right
    { x: -12, y: 12 },   // Bottom-left
    { x: 12, y: 12 }     // Bottom-right
  ]
  
  for (let i = 0; i < 4; i++) {
    const eyePos = eyePositions[i]
    //
    // White eye background
    //
    const eyeWhite = k.add([
      k.circle(EYE_RADIUS),
      k.pos(monsterX + eyePos.x, monsterY + eyePos.y),
      k.color(255, 255, 255),
      k.opacity(1.0),
      k.z(14),
      k.fixed()
    ])
    //
    // Black pupil
    //
    const pupil = k.add([
      k.circle(PUPIL_RADIUS),
      k.pos(monsterX + eyePos.x, monsterY + eyePos.y),
      k.color(0, 0, 0),
      k.opacity(1.0),
      k.z(14),
      k.fixed()
    ])
    
    eyes.push({
      white: eyeWhite,
      pupil: pupil,
      offsetX: eyePos.x,
      offsetY: eyePos.y
    })
  }
  
  const inst = {
    k,
    x: monsterX,
    y: monsterY,
    startX: monsterX,
    startY: monsterY,
    hero: heroInst,
    sfx,
    speed: MONSTER_SPEED,
    legs,
    bodyCircles,
    eyes,
    bodySize: BODY_SIZE,
    legWidth: LEG_WIDTH,
    segmentLength: SEGMENT_LENGTH,
    segmentCount: SEGMENT_COUNT,
    stepHeight: STEP_HEIGHT,
    morphTimer: 0,
    stepTimer: 0,
    wobbleX: 0,
    wobbleY: 0,
    isReturningHome: false,
    currentMoveDirectionX: 1,
    currentMoveDirectionY: 1
  }
  //
  // Update monster
  //
  k.onUpdate(() => {
    const dt = k.dt()
    
    let moveDirectionX = 1
    let moveDirectionY = 1
    const heroX = inst.hero.character.pos.x
    const heroY = inst.hero.character.pos.y
    //
    // Check if hero is annihilating - monster stays in place but continues animating
    //
    const isAnnihilating = inst.hero.isAnnihilating
    //
    // Check if monster should return home
    //
    if (inst.isReturningHome) {
      //
      // Move towards start position (no chaotic movement)
      //
      const distanceToStartX = inst.startX - inst.x
      const distanceToStartY = inst.startY - inst.y
      moveDirectionX = distanceToStartX > 0 ? 1 : -1
      moveDirectionY = distanceToStartY > 0 ? 1 : -1
      //
      // Move monster towards start position (straight line, no wobble)
      //
      if (!isAnnihilating && Math.abs(distanceToStartX) > 10) {
        inst.x += moveDirectionX * inst.speed * dt
      }
      if (!isAnnihilating && Math.abs(distanceToStartY) > 10) {
        inst.y += moveDirectionY * inst.speed * dt
      }
      //
      // No wobble when returning home
      //
      inst.wobbleX = 0
      inst.wobbleY = 0
    } else {
      //
      // Normal chase behavior towards hero
      //
      const distanceX = heroX - inst.x
      const distanceY = heroY - inst.y
      moveDirectionX = distanceX > 0 ? 1 : -1
      moveDirectionY = distanceY > 0 ? 1 : -1
      //
      // Move monster towards hero (stop moving if annihilating)
      //
      if (!isAnnihilating && Math.abs(distanceX) > 10) {
        inst.x += moveDirectionX * inst.speed * dt + Math.sin(inst.morphTimer * 5) * 8 * dt
      }
      if (!isAnnihilating && Math.abs(distanceY) > 10) {
        inst.y += moveDirectionY * inst.speed * dt
      }
    }
    //
    // Store movement direction for leg calculations
    //
    inst.currentMoveDirectionX = moveDirectionX
    inst.currentMoveDirectionY = moveDirectionY
    //
    // Add chaotic wobble to movement (reduced) - only when chasing (not when returning home)
    // Keep wobble during annihilation for natural look
    //
    if (!inst.isReturningHome) {
      inst.wobbleX = Math.sin(inst.morphTimer * 3) * 10
      inst.wobbleY = Math.cos(inst.morphTimer * 2.3) * 8
    } else {
      //
      // When returning home, keep slight wobble during annihilation
      //
      if (isAnnihilating) {
        inst.wobbleX = Math.sin(inst.morphTimer * 2) * 5
        inst.wobbleY = Math.cos(inst.morphTimer * 1.5) * 4
      } else {
        inst.wobbleX = 0
        inst.wobbleY = 0
      }
    }
    //
    // Update body morphing - create organic blob-like shape
    //
    inst.morphTimer += dt * 2
    inst.bodyCircles.forEach((bc, i) => {
      const phase = inst.morphTimer * bc.speed + bc.phaseOffset
      const offsetX = Math.cos(phase) * 10 * bc.radius
      const offsetY = Math.sin(phase * 1.3) * 10 * bc.radius
      bc.obj.pos.x = inst.x + offsetX + inst.wobbleX
      bc.obj.pos.y = inst.y + offsetY + inst.wobbleY
      const scale = 0.9 + Math.sin(phase * 2) * 0.1
      bc.obj.radius = bc.baseRadius * scale
    })
    //
    // Update eyes position and make pupils look at hero
    //
    inst.eyes.forEach(eye => {
      const eyeX = inst.x + eye.offsetX + inst.wobbleX
      const eyeY = inst.y + eye.offsetY + inst.wobbleY
      //
      // Update white part position
      //
      eye.white.pos.x = eyeX
      eye.white.pos.y = eyeY
      //
      // Calculate direction to hero for pupil
      //
      const toHeroX = heroX - eyeX
      const toHeroY = heroY - eyeY
      const distToHero = Math.hypot(toHeroX, toHeroY)
      //
      // Move pupil towards hero within eye bounds
      //
      const maxPupilOffset = 3  // Maximum distance pupil can move from center
      if (distToHero > 0) {
        const pupilOffsetX = (toHeroX / distToHero) * maxPupilOffset
        const pupilOffsetY = (toHeroY / distToHero) * maxPupilOffset
        eye.pupil.pos.x = eyeX + pupilOffsetX
        eye.pupil.pos.y = eyeY + pupilOffsetY
      } else {
        eye.pupil.pos.x = eyeX
        eye.pupil.pos.y = eyeY
      }
    })
    //
    // Update step timer
    //
    inst.stepTimer += dt * 1.5
    //
    // Update legs with proper IK and stepping
    //
    inst.legs.forEach((leg, legIndex) => {
      const stepCycle = (inst.stepTimer + leg.stepPhase) % 2
      const restDistance = 60  // Distance from center when at rest
      //
      // Calculate angle relative to movement direction to distribute legs properly
      //
      const legAngleFromCenter = leg.baseAngle
      const movementAngle = inst.currentMoveDirectionX > 0 ? 0 : Math.PI
      const angleDiff = Math.abs(((legAngleFromCenter - movementAngle + Math.PI) % (Math.PI * 2)) - Math.PI)
      //
      // Distribute legs: front 1/3 ahead of body, middle 1/3 beside, back 1/3 behind
      //
      let forwardBias
      if (angleDiff < Math.PI / 3) {
        //
        // Front legs - go ahead of body (reduced distance)
        //
        forwardBias = inst.currentMoveDirectionX * 80
      } else if (angleDiff > (2 * Math.PI) / 3) {
        //
        // Back legs - step forward but stay behind front legs
        //
        forwardBias = inst.currentMoveDirectionX * 40
      } else {
        //
        // Side legs - stay well ahead
        //
        forwardBias = inst.currentMoveDirectionX * 60
      }
      const legDistance = restDistance
      //
      // Calculate ideal ground position for this leg
      //
      const idealGroundX = inst.x + Math.cos(leg.baseAngle) * legDistance + forwardBias + inst.wobbleX
      const idealGroundY = inst.y + Math.sin(leg.baseAngle) * legDistance + inst.wobbleY
      //
      // Check if leg needs to step (too far from ideal position)
      //
      const distToIdeal = Math.hypot(leg.groundTargetX - idealGroundX, leg.groundTargetY - idealGroundY)
      
      if (stepCycle < 0.4 && distToIdeal > 50) {
        //
        // Lift leg and move to new position
        //
        leg.isLifted = true
        leg.liftProgress = stepCycle / 0.4
        //
        // Interpolate ground target
        //
        leg.groundTargetX = leg.groundTargetX + (idealGroundX - leg.groundTargetX) * 0.3
        leg.groundTargetY = leg.groundTargetY + (idealGroundY - leg.groundTargetY) * 0.3
      } else if (stepCycle >= 0.4) {
        leg.isLifted = false
        leg.liftProgress = 0
      }
      //
      // Calculate target with lift
      //
      const lift = leg.isLifted ? Math.sin(leg.liftProgress * Math.PI) * inst.stepHeight : 0
      leg.targetX = leg.groundTargetX
      leg.targetY = leg.groundTargetY - lift
      //
      // FABRIK IK: Forward and backward reaching
      //
      // Forward pass: start from end, reach backwards to base
      //
      let endX = leg.targetX
      let endY = leg.targetY
      
      for (let i = inst.segmentCount - 1; i >= 0; i--) {
        const segment = leg.segments[i]
        
        if (i === 0) {
          //
          // First segment attaches close to body center
          //
          const bodyAttachOffset = 10  // Small offset from center
          const bodyEdgeX = inst.x + Math.cos(leg.baseAngle) * bodyAttachOffset
          const bodyEdgeY = inst.y + Math.sin(leg.baseAngle) * bodyAttachOffset
          const dx = segment.x - bodyEdgeX
          const dy = segment.y - bodyEdgeY
          const dist = Math.hypot(dx, dy)
          if (dist > 0) {
            segment.x = bodyEdgeX
            segment.y = bodyEdgeY
          }
        } else {
          //
          // Pull segment towards end target
          //
          const dx = segment.x - endX
          const dy = segment.y - endY
          const dist = Math.hypot(dx, dy)
          if (dist > 0) {
            segment.x = endX + (dx / dist) * inst.segmentLength
            segment.y = endY + (dy / dist) * inst.segmentLength
          }
          endX = segment.x
          endY = segment.y
        }
      }
      //
      // Backward pass: start from base (close to body center), push forward to end
      //
      const bodyAttachOffset = 10  // Small offset from center
      const bodyEdgeX = inst.x + Math.cos(leg.baseAngle) * bodyAttachOffset + inst.wobbleX
      const bodyEdgeY = inst.y + Math.sin(leg.baseAngle) * bodyAttachOffset + inst.wobbleY
      
      leg.segments[0].x = bodyEdgeX
      leg.segments[0].y = bodyEdgeY
      
      for (let i = 1; i < inst.segmentCount; i++) {
        const prevSegment = leg.segments[i - 1]
        const segment = leg.segments[i]
        
        const dx = segment.x - prevSegment.x
        const dy = segment.y - prevSegment.y
        const dist = Math.hypot(dx, dy)
        
        if (dist > 0) {
          segment.x = prevSegment.x + (dx / dist) * inst.segmentLength
          segment.y = prevSegment.y + (dy / dist) * inst.segmentLength
        }
      }
    })
    //
    // Check collision with hero
    //
    const heroBox = {
      x: inst.hero.character.pos.x - 48,
      y: inst.hero.character.pos.y - 48,
      width: 96,
      height: 96
    }
    
    const monsterBox = {
      x: inst.x - inst.bodySize / 2,
      y: inst.y - inst.bodySize / 2,
      width: inst.bodySize,
      height: inst.bodySize
    }
    
    if (monsterBox.x < heroBox.x + heroBox.width &&
        monsterBox.x + monsterBox.width > heroBox.x &&
        monsterBox.y < heroBox.y + heroBox.height &&
        monsterBox.y + monsterBox.height > heroBox.y) {
      if (!inst.hero.isDying && !inst.hero.isAnnihilating) {
        import('../../../components/hero.js').then(Hero => {
          //
          // Save references before death animation
          //
          const savedSfx = inst.hero.sfx
          const savedLevelIndicator = levelIndicator
          //
          // 1. Stop subtitle sound immediately if playing
          //
          import('../../../utils/sound.js').then(Sound => {
            Sound.stopSubtitleSound()
          })
          //
          // 2. Trigger death animation
          //
          Hero.death(inst.hero, () => {
            //
            // 3. After death particles dispersed, minimal pause before life effects
            //
            k.wait(0.1, () => {
              import('../../../utils/sound.js').then(Sound => {
                //
                // 4. Lower all level sounds (ambient, background music)
                //
                if (savedSfx && savedSfx.audioContext) {
                  const ctx = savedSfx.audioContext
                  //
                  // Fade out ambient and other sounds quickly
                  //
                  if (savedSfx.ambientGain) {
                    savedSfx.ambientGain.gain.setValueAtTime(savedSfx.ambientGain.gain.value, ctx.currentTime)
                    savedSfx.ambientGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
                  }
                }
                //
                // Stop or fade all background music tracks
                //
                Sound.fadeOutAllMusic()
                //
                // 5. Increment life score and show all effects
                //
                const currentScore = get('lifeScore', 0)
                const newScore = currentScore + 1
                set('lifeScore', newScore)
                
                if (savedLevelIndicator && savedLevelIndicator.lifeImage && savedLevelIndicator.lifeImage.sprite && savedLevelIndicator.lifeImage.sprite.exists()) {
                  //
                  // Update score text and remove old outline
                  //
                  if (savedLevelIndicator.updateLifeScore) {
                    savedLevelIndicator.updateLifeScore(newScore)
                  }
                  //
                  // Play life sound
                  //
                  Sound.playLifeSound(k)
                  //
                  // Flash life image red aggressively (20 flashes = 1 second, faster)
                  //
                  const originalColor = savedLevelIndicator.lifeImage.sprite.color
                  flashLifeImageLevel3(k, savedLevelIndicator, originalColor, 0)
                  //
                  // Create particles around life score
                  //
                  createLifeScoreParticlesLevel3(k, savedLevelIndicator)
                }
                //
                // 6. Wait 0.8 seconds for effects to be visible, then reload
                //
                k.wait(0.8, () => {
                  k.go('level-time.3')
                })
              })
            })
          })
        })
      }
    }
  })
  //
  // Draw legs with pads at the end (using game object with z-index)
  //
  k.add([
    {
      draw() {
        inst.legs.forEach(leg => {
      leg.segments.forEach((segment, i) => {
        if (i < leg.segments.length - 1) {
          const nextSegment = leg.segments[i + 1]
          //
          // Draw gray leg (same color as body)
          //
          k.drawLine({
            p1: k.vec2(segment.x, segment.y),
            p2: k.vec2(nextSegment.x, nextSegment.y),
            width: inst.legWidth,
            color: k.rgb(40, 40, 45),
            opacity: 1.0
          })
        }
      })
      //
      // Draw pad at the end of each leg
      //
      const lastSegment = leg.segments[leg.segments.length - 1]
      k.drawCircle({
        pos: k.vec2(lastSegment.x, lastSegment.y),
        radius: inst.legWidth * 1.5,
        color: k.rgb(40, 40, 45),
        opacity: 1.0
      })
        })
      }
    },
    k.z(13)  // Below body circles (14) so legs appear behind body
  ])
  
  return inst
}

/**
 * Setup control inversion based on current section
 * @param {Object} heroInst - Hero instance
 * @param {Array} sections - Array of section objects
 */
function setupControlInversion(heroInst, sections) {
  const k = heroInst.k
  //
  // Track the furthest section reached (rightmost in upper, leftmost in lower)
  //
  let currentSection = null
  let maxSectionIndex = -1
  
  k.onUpdate(() => {
    const heroX = heroInst.character.pos.x
    const heroY = heroInst.character.pos.y
    //
    // Find which section hero is in (check both x and y coordinates)
    //
    const newSection = sections.find(s => 
      heroX >= s.x && 
      heroX < s.x + s.width &&
      heroY >= s.y &&
      heroY < s.y + s.height
    )
    
    if (!newSection) return
    
    const newIndex = sections.indexOf(newSection)
    //
    // Check if hero moved into a new section
    //
    if (newSection !== currentSection) {
      //
      // Only switch controls if entering a NEW zone further than before
      //
      if (newIndex > maxSectionIndex) {
        //
        // Hero reached a new zone - switch controls
        //
        heroInst.controlsReversed = newSection.isReversed
        maxSectionIndex = newIndex
      }
      //
      // If going back (newIndex <= maxSectionIndex), don't switch controls
      //
      
      currentSection = newSection
    }
  })
}

/**
 * Creates obstacle spikes (digit "1") in clusters throughout corridors
 * Spikes are placed in the CENTER of each section, not at boundaries
 * @param {Object} k - Kaplay instance
 * @param {Object} hero - Hero instance for collision
 * @param {Object} sound - Sound instance for effects
 * @param {Array} sections - Time sections to place spikes in their centers
 */
function createObstacleSpikes(k, hero, sound, levelIndicator, sections) {
  //
  // Spike Y positions
  //
  const upperCorridorY = CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT - 85  // Raised to sit on floor
  const lowerCorridorY = LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT - 15  // Lowered to sit on floor
  //
  // Place spikes in CENTER of alternating sections (avoid section boundaries)
  // Upper corridor: sections 0 and 2 (indices 0, 2)
  // Lower corridor: sections 0, 2, 4 (indices 4, 6, 8 in combined array)
  //
  const spikePositions = [
    //
    // Upper corridor - section 0 (first section, center)
    //
    { sectionIndex: 0, count: 2 },
    //
    // Upper corridor - section 2 (third section, center)
    //
    { sectionIndex: 2, count: 3 },
    //
    // Lower corridor - section 0 (first section, center) - index 4 in sections array
    //
    { sectionIndex: 4, count: 3 },
    //
    // Lower corridor - section 2 (third section, center) - index 6 in sections array
    //
    { sectionIndex: 6, count: 2 },
    //
    // Lower corridor - section 4 (fifth section, center) - index 8 in sections array
    //
    { sectionIndex: 8, count: 3 }
  ]
  
  const clusters = []
  
  spikePositions.forEach(pos => {
    const section = sections[pos.sectionIndex]
    if (!section) return
    
    const clusterWidth = 30 * (pos.count - 1)  // Width based on spike count
    const clusterCenterX = section.centerX
    const clusterStartX = clusterCenterX - clusterWidth / 2
    const clusterEndX = clusterCenterX + clusterWidth / 2
    const clusterY = section.corridor === 'upper' ? upperCorridorY : lowerCorridorY
    
    clusters.push({
      startX: clusterStartX,
      endX: clusterEndX,
      y: clusterY,
      count: pos.count
    })
  })
  //
  // Create each cluster
  //
  clusters.forEach(cluster => {
    OneSpikes.create({
      k,
      startX: cluster.startX,
      endX: cluster.endX,
      y: cluster.y,
      hero,
      currentLevel: 'level-time.3',
      digitCount: cluster.count,
      fakeDigitCount: 0,  // No fake spikes - all are deadly
      sfx: sound,
      levelIndicator
    })
    //
    // Create snow mounds at the base of each spike cluster
    //
    const clusterCenterX = (cluster.startX + cluster.endX) / 2
    const clusterWidth = (cluster.endX - cluster.startX) + 40  // Extra width around spikes
    const moundHeight = 18  // Taller snow mound at base
    
    k.add([
      k.pos(clusterCenterX, cluster.y + 10),  // Lower position to cover platform better
      k.z(9),  // Behind spikes (10) and snow drifts (12)
      {
        draw() {
          //
          // Draw snow mound at base of spikes
          //
          const points = []
          const steps = 20
          
          for (let i = 0; i <= steps; i++) {
            const t = i / steps
            const x = (t - 0.5) * clusterWidth
            //
            // Flatter curve for better ground coverage (changed from pow 2 to pow 4)
            //
            const y = -moundHeight * (1 - Math.pow(2 * t - 1, 4))
            points.push(k.vec2(x, y))
          }
          
          points.push(k.vec2(clusterWidth / 2, 0))
          points.push(k.vec2(-clusterWidth / 2, 0))
          //
          // Draw mound
          //
          k.drawPolygon({
            pts: points,
            color: k.rgb(245, 245, 255),
            opacity: 0.95
          })
          //
          // Add subtle highlight (ensure it stays within mound)
          //
          const highlightRadius = clusterWidth * 0.08
          const highlightY = -moundHeight * 0.5
          //
          // Only draw if highlight stays above baseline
          //
          if (Math.abs(highlightY) - highlightRadius > 0) {
            k.drawCircle({
              radius: highlightRadius,
              color: k.rgb(255, 255, 255),
              pos: k.vec2(0, highlightY),
              opacity: 0.7
            })
          }
        }
      }
    ])
  })
}

/**
 * Creates clouds at the very top of upper corridor
 * @param {Object} k - Kaplay instance
 */
function createCloudsAtTop(k) {
  //
  // Cloud parameters (positioned above upper corridor)
  //
  const cloudTopY = CORRIDOR_Y + 20  // Just inside corridor top
  const cloudBottomY = CORRIDOR_Y + 80  // Hanging down into corridor
  const cloudDenseLayerY = CORRIDOR_Y + 30  // Dense layer inside corridor
  const cloudSparseLayerStartY = CORRIDOR_Y + 50  // Start of sparse layer
  const cloudSparseLayerEndY = CORRIDOR_Y + 80  // End of sparse layer
  const baseCloudColor = k.rgb(250, 250, 255)  // White with slight blue tint for clouds
  
  //
  // Create multiple clouds spread horizontally across the screen
  // Cover almost entire width like snow
  //
  const screenWidth = k.width()
  const cloudStartX = PLATFORM_SIDE_WIDTH + 50  // Start a bit inside left margin
  const cloudEndX = screenWidth - PLATFORM_SIDE_WIDTH - 50  // End a bit before right margin
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
      color: k.rgb(245, 245, 250),
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
      color: k.rgb(255, 255, 255),
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
      k.z(16),  // Above city background (15.5) but below time digits and other elements
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
 * Creates snow drifts on corridor floors
 * @param {Object} k - Kaplay instance
 */
function createSnowDrifts(k) {
  //
  // Snow drift configurations (x, width, height, corridor)
  //
  const upperFloorY = CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT - 70  // Raised to sit on floor
  const lowerFloorY = LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT  // Lowered to sit on floor
  //
  // Calculate passage area (where snow should not appear)
  //
  const passageStartX = k.width() - PLATFORM_SIDE_WIDTH - PASSAGE_WIDTH
  const passageEndX = k.width() - PLATFORM_SIDE_WIDTH
  //
  // Generate continuous snow drifts covering entire floor without gaps
  // Snow starts AFTER left platform and ends BEFORE right platform
  //
  const drifts = []
  //
  // Upper corridor - continuous coverage from left platform edge to passage start
  //
  const upperCorridorStart = PLATFORM_SIDE_WIDTH + 50
  const upperCorridorEnd = passageStartX - 50
  
  for (let x = upperCorridorStart; x < upperCorridorEnd; x += 20 + Math.random() * 15) {
    const width = 60 + Math.random() * 120  // 60-180px width (large and overlapping for continuous coverage)
    const height = 8 + Math.random() * 15   // 8-23px height
    const zIndex = Math.random() > 0.5 ? 12 : 25  // 50% behind hero, 50% in front
    const shapeType = Math.floor(Math.random() * 3)  // 0, 1, or 2 for different shapes
    const skew = -0.3 + Math.random() * 0.6  // -0.3 to 0.3 for asymmetry
    
    drifts.push({ x, width, height, y: upperFloorY, z: zIndex, shapeType, skew })
  }
  //
  // Lower corridor - continuous coverage from left platform edge to passage start, and from passage end to right platform edge
  //
  const lowerCorridorStart1 = PLATFORM_SIDE_WIDTH + 70
  const lowerCorridorEnd1 = passageStartX
  
  for (let x = lowerCorridorStart1; x < lowerCorridorEnd1; x += 20 + Math.random() * 15) {
    const width = 60 + Math.random() * 120  // 60-180px width (large and overlapping for continuous coverage)
    const height = 8 + Math.random() * 15   // 8-23px height
    const zIndex = Math.random() > 0.5 ? 12 : 25  // 50% behind hero, 50% in front
    const shapeType = Math.floor(Math.random() * 3)  // 0, 1, or 2 for different shapes
    const skew = -0.3 + Math.random() * 0.6  // -0.3 to 0.3 for asymmetry
    
    drifts.push({ x, width, height, y: lowerFloorY, z: zIndex, shapeType, skew })
  }
  //
  // Lower corridor right section (from passage end to right edge)
  //
  const lowerCorridorStart2 = passageEndX
  const lowerCorridorEnd2 = k.width() - PLATFORM_SIDE_WIDTH
  
  for (let x = lowerCorridorStart2; x < lowerCorridorEnd2; x += 20 + Math.random() * 15) {
    const width = 60 + Math.random() * 120  // 60-180px width (large and overlapping for continuous coverage)
    const height = 8 + Math.random() * 15   // 8-23px height
    const zIndex = Math.random() > 0.5 ? 12 : 25  // 50% behind hero, 50% in front
    const shapeType = Math.floor(Math.random() * 3)  // 0, 1, or 2 for different shapes
    const skew = -0.3 + Math.random() * 0.6  // -0.3 to 0.3 for asymmetry
    
    drifts.push({ x, width, height, y: lowerFloorY, z: zIndex, shapeType, skew })
  }
  //
  // Add extra smaller drifts between main ones for even more coverage
  //
  for (let x = upperCorridorStart; x < upperCorridorEnd; x += 15 + Math.random() * 12) {
    const width = 40 + Math.random() * 70  // 40-110px width (medium)
    const height = 5 + Math.random() * 8    // 5-13px height (smaller)
    const zIndex = Math.random() > 0.3 ? 12 : 25  // More behind hero
    const shapeType = Math.floor(Math.random() * 3)  // 0, 1, or 2 for different shapes
    const skew = -0.3 + Math.random() * 0.6  // -0.3 to 0.3 for asymmetry
    
    drifts.push({ x, width, height, y: upperFloorY, z: zIndex, shapeType, skew })
  }
  
  for (let x = lowerCorridorStart1; x < lowerCorridorEnd1; x += 15 + Math.random() * 12) {
    const width = 40 + Math.random() * 70  // 40-110px width (medium)
    const height = 5 + Math.random() * 8    // 5-13px height (smaller)
    const zIndex = Math.random() > 0.3 ? 12 : 25  // More behind hero
    const shapeType = Math.floor(Math.random() * 3)  // 0, 1, or 2 for different shapes
    const skew = -0.3 + Math.random() * 0.6  // -0.3 to 0.3 for asymmetry
    
    drifts.push({ x, width, height, y: lowerFloorY, z: zIndex, shapeType, skew })
  }
  
  for (let x = lowerCorridorStart2; x < lowerCorridorEnd2; x += 15 + Math.random() * 12) {
    const width = 40 + Math.random() * 70  // 40-110px width (medium)
    const height = 5 + Math.random() * 8    // 5-13px height (smaller)
    const zIndex = Math.random() > 0.3 ? 12 : 25  // More behind hero
    const shapeType = Math.floor(Math.random() * 3)  // 0, 1, or 2 for different shapes
    const skew = -0.3 + Math.random() * 0.6  // -0.3 to 0.3 for asymmetry
    
    drifts.push({ x, width, height, y: lowerFloorY, z: zIndex, shapeType, skew })
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
          // Draw main snow mound (lightest layer)
          //
          k.drawPolygon({
            pts: points,
            color: k.rgb(240, 240, 250),
            opacity: baseOpacity
          })
          //
          // Draw shadow layer (darker at bottom)
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
            color: k.rgb(200, 200, 220),
            opacity: shadowOpacity
          })
          //
          // Draw highlight on top (brightest spot, offset by skew)
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
              color: k.rgb(255, 255, 255),
              pos: k.vec2(highlightOffset, highlightY),
              opacity: highlightOpacity
            })
          }
        }
      }
    ])
  })
}
function flashLifeImageLevel3(k, levelIndicator, originalColor, count) {
  if (!levelIndicator || !levelIndicator.lifeImage || !levelIndicator.lifeImage.sprite || !levelIndicator.lifeImage.sprite.exists()) {
    return
  }
  if (count >= 20) {
    levelIndicator.lifeImage.sprite.color = originalColor
    return
  }
  //
  // Aggressive flashing - bright red to white
  //
  levelIndicator.lifeImage.sprite.color = count % 2 === 0 ? k.rgb(255, 0, 0) : k.rgb(255, 255, 255)
  k.wait(0.05, () => flashLifeImageLevel3(k, levelIndicator, originalColor, count + 1))
}
function createLifeScoreParticlesLevel3(k, levelIndicator) {
  if (!levelIndicator || !levelIndicator.lifeImage || !levelIndicator.lifeImage.sprite || !levelIndicator.lifeImage.sprite.exists()) {
    return
  }
  
  const lifeImageX = levelIndicator.lifeImage.sprite.pos.x
  const lifeImageY = levelIndicator.lifeImage.sprite.pos.y
  const particleCount = 15
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount
    const speed = 80 + Math.random() * 40
    const lifetime = 0.8 + Math.random() * 0.4
    const size = 4 + Math.random() * 4
    
    const particle = k.add([
      k.rect(size, size),
      k.pos(lifeImageX, lifeImageY),
      k.color(255, 0, 0),
      k.opacity(1),
      k.z(CFG.visual.zIndex.ui + 10),
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
      
      if (age >= lifetime && particle.exists && particle.exists()) {
        k.destroy(particle)
      }
    })
  }
}


/**
 * Creates a rounded corner sprite using canvas
 * @param {number} radius - Corner radius
 * @param {string} backgroundColor - Background color as hex string
 * @returns {string} Data URL of the corner sprite
 */
function createRoundedCornerSprite(radius, backgroundColor) {
  const size = radius * 2
  const dataURL = toPng({ width: size, height: size }, (ctx) => {
    const [r, g, b] = parseHex(backgroundColor)
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
    //
    // Draw L-shaped corner with rounded inner angle
    // Start with full square
    //
    ctx.fillRect(0, 0, size, size)
    //
    // Cut out top-right quarter circle to create rounded inner corner
    //
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(size, size, radius, Math.PI, Math.PI * 1.5, false)
    ctx.lineTo(size, size)
    ctx.closePath()
    ctx.fill()
    //
    // Reset composite operation
    //
    ctx.globalCompositeOperation = 'source-over'
  })
  return dataURL
}

/**
 * Creates rounded corners for corridors
 * @param {Object} k - Kaplay instance
 */
function createRoundedCorners(k) {
  const radius = CORNER_RADIUS
  const backgroundColor = CFG.visual.colors.background
  //
  // Create corner sprite
  //
  const cornerDataURL = createRoundedCornerSprite(radius, backgroundColor)
  k.loadSprite('corner-sprite-level3', cornerDataURL)
  //
  // Upper corridor corners (only left side, no corners on passage side)
  // Bottom-left corner
  //
  k.add([
    k.sprite('corner-sprite-level3'),
    k.pos(PLATFORM_SIDE_WIDTH - CORNER_RADIUS, CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT + CORNER_RADIUS),
    k.rotate(270),
    k.z(CFG.visual.zIndex.platforms + 1),
    k.anchor('topleft')
  ])
  //
  // Lower corridor corners (only left side, no corners on passage side)
  // Top-left corner
  //
  k.add([
    k.sprite('corner-sprite-level3'),
    k.pos(PLATFORM_SIDE_WIDTH - CORNER_RADIUS, LOWER_CORRIDOR_Y - CORNER_RADIUS),
    k.z(CFG.visual.zIndex.platforms + 1),
    k.anchor('topleft')
  ])
  //
  // Bottom-left corner
  //
  k.add([
    k.sprite('corner-sprite-level3'),
    k.pos(PLATFORM_SIDE_WIDTH - CORNER_RADIUS, LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT + CORNER_RADIUS),
    k.rotate(270),
    k.z(CFG.visual.zIndex.platforms + 1),
    k.anchor('topleft')
  ])
  //
  // Bottom-right corner (only full right wall)
  //
  k.add([
    k.sprite('corner-sprite-level3'),
    k.pos(k.width() - PLATFORM_SIDE_WIDTH + CORNER_RADIUS, LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT + CORNER_RADIUS),
    k.rotate(180),
    k.z(CFG.visual.zIndex.platforms + 1),
    k.anchor('topleft')
  ])
}
