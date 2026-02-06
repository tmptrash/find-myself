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
    // Setup control inversion based on current section for BOTH hero and anti-hero
    //
    setupControlInversion(hero, sections)
    setupControlInversion(antiHero, sections)
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
                Sound.stopSubtitleSound()
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
  const PARTICLE_COUNT = 300
  const MARGIN = 10
  const gameAreaLeft = PLATFORM_SIDE_WIDTH + MARGIN
  const gameAreaRight = k.width() - PLATFORM_SIDE_WIDTH - MARGIN
  const gameAreaWidth = gameAreaRight - gameAreaLeft
  //
  // Define visible areas (exclude clouds, middle platform, and bottom platform)
  //
  const upperCorridorTop = CORRIDOR_Y
  const upperCorridorBottom = CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT
  const lowerCorridorTop = LOWER_CORRIDOR_Y
  const lowerCorridorBottom = LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT
  //
  // Create particles in two corridors only (not in clouds, middle platform, or bottom platform)
  //
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const size = 1 + Math.random() * 2
    const opacity = 0.3 + Math.random() * 0.4
    //
    // Distribute particles between upper and lower corridors (60% upper, 40% lower)
    //
    const inUpperCorridor = Math.random() < 0.6
    const yPos = inUpperCorridor
      ? upperCorridorTop + Math.random() * (upperCorridorBottom - upperCorridorTop)
      : lowerCorridorTop + Math.random() * (lowerCorridorBottom - lowerCorridorTop)
    //
    // Create particle as a game object
    //
    const particle = k.add([
      k.rect(size, size),
      k.pos(gameAreaLeft + Math.random() * gameAreaWidth, yPos),
      k.color(255, 255, 255),
      k.opacity(opacity),
      k.z(15),
      k.fixed()
    ])
    
    particles.push({
      obj: particle,
      speedX: 150 + Math.random() * 100,
      speedY: -30 + Math.random() * 60,
      gameAreaLeft,
      gameAreaRight,
      gameAreaWidth,
      upperCorridorTop,
      upperCorridorBottom,
      lowerCorridorTop,
      lowerCorridorBottom
    })
  }
  
  return {
    k,
    particles,
    gameAreaLeft,
    gameAreaRight,
    gameAreaWidth,
    upperCorridorTop,
    upperCorridorBottom,
    lowerCorridorTop,
    lowerCorridorBottom
  }
}

/**
 * Update snow particles
 * @param {Object} inst - Snow system instance
 */
function updateSnowParticles(inst) {
  const { k, particles, gameAreaLeft, gameAreaRight, gameAreaWidth, upperCorridorTop, upperCorridorBottom, lowerCorridorTop, lowerCorridorBottom } = inst
  const dt = k.dt()
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
    // Determine which corridor particle is in
    //
    const inUpperCorridor = p.obj.pos.y >= upperCorridorTop && p.obj.pos.y <= upperCorridorBottom
    const inLowerCorridor = p.obj.pos.y >= lowerCorridorTop && p.obj.pos.y <= lowerCorridorBottom
    //
    // Wrap horizontally
    //
    if (p.obj.pos.x > gameAreaRight + 10) {
      p.obj.pos.x = gameAreaLeft - 10
      //
      // Respawn in same corridor
      //
      if (inUpperCorridor) {
        p.obj.pos.y = upperCorridorTop + Math.random() * (upperCorridorBottom - upperCorridorTop)
      } else if (inLowerCorridor) {
        p.obj.pos.y = lowerCorridorTop + Math.random() * (lowerCorridorBottom - lowerCorridorTop)
      }
      p.speedY = -30 + Math.random() * 60
    }
    if (p.obj.pos.x < gameAreaLeft - 10) {
      p.obj.pos.x = gameAreaRight + 10
    }
    //
    // Wrap vertically within corridor bounds
    //
    if (inUpperCorridor) {
      if (p.obj.pos.y < upperCorridorTop - 10) {
        p.obj.pos.y = upperCorridorBottom + 10
        p.obj.pos.x = gameAreaLeft + Math.random() * gameAreaWidth
      }
      if (p.obj.pos.y > upperCorridorBottom + 10) {
        p.obj.pos.y = upperCorridorTop - 10
        p.obj.pos.x = gameAreaLeft + Math.random() * gameAreaWidth
      }
    } else if (inLowerCorridor) {
      if (p.obj.pos.y < lowerCorridorTop - 10) {
        p.obj.pos.y = lowerCorridorBottom + 10
        p.obj.pos.x = gameAreaLeft + Math.random() * gameAreaWidth
      }
      if (p.obj.pos.y > lowerCorridorBottom + 10) {
        p.obj.pos.y = lowerCorridorTop - 10
        p.obj.pos.x = gameAreaLeft + Math.random() * gameAreaWidth
      }
    } else {
      //
      // Particle escaped corridor bounds (shouldn't happen), respawn in random corridor
      //
      const respawnInUpper = Math.random() < 0.6
      p.obj.pos.y = respawnInUpper
        ? upperCorridorTop + Math.random() * (upperCorridorBottom - upperCorridorTop)
        : lowerCorridorTop + Math.random() * (lowerCorridorBottom - lowerCorridorTop)
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
                    Sound.stopSubtitleSound()
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
  // Track progress separately for each corridor to prevent control jitter
  // Upper corridor: sections 0-3 (left to right)
  // Lower corridor: sections 4-8 (right to left)
  //
  let currentSection = null
  let maxUpperIndex = -1
  let minLowerIndex = 9
  
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
    const isUpperCorridor = newSection.corridor === 'upper'
    const isLowerCorridor = newSection.corridor === 'lower'
    
    //
    // Check if hero moved into a new section
    //
    if (newSection !== currentSection) {
      let shouldUpdateControls = false
      
      if (isUpperCorridor) {
        //
        // Upper corridor: progress is left to right (indices increase 0→3)
        //
        if (newIndex > maxUpperIndex) {
          maxUpperIndex = newIndex
          shouldUpdateControls = true
        }
      } else if (isLowerCorridor) {
        //
        // Lower corridor: progress is right to left (indices decrease 8→4)
        //
        if (newIndex < minLowerIndex) {
          minLowerIndex = newIndex
          shouldUpdateControls = true
        }
      }
      
      //
      // Only update controls if progressing forward in current corridor
      //
      if (shouldUpdateControls) {
        heroInst.controlsReversed = newSection.isReversed
      }
      
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
    // Create snow mound sprite at the base of each spike cluster using toPng()
    //
    const clusterCenterX = (cluster.startX + cluster.endX) / 2
    const clusterWidth = (cluster.endX - cluster.startX) + 40  // Extra width around spikes
    const moundHeight = 18  // Taller snow mound at base
    
    const moundDataURL = toPng({ width: clusterWidth + 20, height: moundHeight + 10, pixelRatio: 1 }, (ctx) => {
      ctx.translate((clusterWidth + 20) / 2, moundHeight + 10)
      
      const points = []
      const steps = 20
      
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const x = (t - 0.5) * clusterWidth
        const y = -moundHeight * (1 - Math.pow(2 * t - 1, 4))
        points.push({ x, y })
      }
      
      //
      // Draw mound
      //
      ctx.fillStyle = 'rgb(245, 245, 255)'
      ctx.globalAlpha = 0.95
      ctx.beginPath()
      points.forEach((p, i) => {
        if (i === 0) {
          ctx.moveTo(p.x, p.y)
        } else {
          ctx.lineTo(p.x, p.y)
        }
      })
      ctx.lineTo(clusterWidth / 2, 0)
      ctx.lineTo(-clusterWidth / 2, 0)
      ctx.closePath()
      ctx.fill()
      
      //
      // Add highlight
      //
      const highlightRadius = clusterWidth * 0.08
      const highlightY = -moundHeight * 0.5
      
      if (Math.abs(highlightY) - highlightRadius > 0) {
        ctx.fillStyle = 'rgb(255, 255, 255)'
        ctx.globalAlpha = 0.7
        ctx.beginPath()
        ctx.arc(0, highlightY, highlightRadius, 0, Math.PI * 2)
        ctx.fill()
      }
    })
    
    k.loadSprite(`spike-mound-${cluster.startX}-${cluster.y}`, moundDataURL)
    k.add([
      k.sprite(`spike-mound-${cluster.startX}-${cluster.y}`),
      k.pos(clusterCenterX, cluster.y + 10),
      k.anchor('center'),
      k.z(9)  // Behind spikes (10) and snow drifts (12)
    ])
  })
}

/**
 * Creates clouds at the very top of upper corridor using toPng() for performance
 * @param {Object} k - Kaplay instance
 */
function createCloudsAtTop(k) {
  //
  // Cloud parameters (positioned above upper corridor)
  //
  const cloudTopY = CORRIDOR_Y  // Just inside corridor top
  const cloudDenseLayerY = CORRIDOR_Y + 30  // Dense layer inside corridor
  const cloudSparseLayerStartY = CORRIDOR_Y + 50  // Start of sparse layer
  const cloudSparseLayerEndY = CORRIDOR_Y + 80  // End of sparse layer
  const baseCloudColor = { r: 250, g: 250, b: 255 }  // White with slight blue tint for clouds
  
  //
  // Create multiple clouds spread horizontally across the screen
  //
  const screenWidth = k.width()
  const cloudStartX = PLATFORM_SIDE_WIDTH + 60
  const cloudEndX = screenWidth - PLATFORM_SIDE_WIDTH - 70
  const cloudCoverageWidth = cloudEndX - cloudStartX
  
  const denseCloudCount = 24
  const denseCloudSpacing = cloudCoverageWidth / (denseCloudCount - 1)
  const sparseCloudCount = 8
  const sparseCloudSpacing = cloudCoverageWidth / (sparseCloudCount - 1)
  
  //
  // Cloud types configuration
  //
  const cloudTypes = [
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
      opacity: 0.6
    },
    {
      mainSize: 42,
      puffs: [
        { radius: 0.8, offsetX: -0.7, offsetY: 0 },
        { radius: 0.85, offsetX: -0.3, offsetY: -0.08 },
        { radius: 0.75, offsetX: 0.3, offsetY: -0.08 },
        { radius: 0.8, offsetX: 0.7, offsetY: 0 },
        { radius: 0.7, offsetX: 0, offsetY: 0.12 }
      ],
      opacity: 0.55
    },
    {
      mainSize: 35,
      puffs: [
        { radius: 0.75, offsetX: -0.6, offsetY: 0 },
        { radius: 0.8, offsetX: -0.2, offsetY: -0.08 },
        { radius: 0.8, offsetX: 0.2, offsetY: -0.08 },
        { radius: 0.75, offsetX: 0.6, offsetY: 0 }
      ],
      opacity: 0.5
    },
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
      opacity: 0.65
    }
  ]
  
  //
  // Generate cloud configurations
  //
  const cloudConfigs = []
  
  for (let i = 0; i < denseCloudCount; i++) {
    const baseX = cloudStartX + denseCloudSpacing * i
    const randomOffset = (Math.random() - 0.5) * (denseCloudSpacing * 0.6)
    const x = baseX + randomOffset
    const typeIndex = i % cloudTypes.length
    const cloudType = cloudTypes[typeIndex]
    const sizeVariation = 1.0 + Math.random() * 0.3
    const mainSize = cloudType.mainSize * sizeVariation
    const rowsPerLayer = 2
    const rowIndex = Math.floor((i % denseCloudCount) / (denseCloudCount / rowsPerLayer))
    const rowYOffset = rowIndex * 8
    const yVariation = (Math.random() - 0.5) * 3
    const cloudY = cloudDenseLayerY + rowYOffset + yVariation
    
    cloudConfigs.push({
      x: x,
      y: cloudY,
      mainSize: mainSize,
      puffs: cloudType.puffs,
      opacity: cloudType.opacity * (0.9 + Math.random() * 0.2)
    })
  }
  
  for (let i = 0; i < sparseCloudCount; i++) {
    const baseX = cloudStartX + sparseCloudSpacing * i
    const randomOffset = (Math.random() - 0.5) * 40
    const x = baseX + randomOffset
    const typeIndex = (i + denseCloudCount) % cloudTypes.length
    const cloudType = cloudTypes[typeIndex]
    const sizeVariation = 0.9 + Math.random() * 0.2
    const mainSize = cloudType.mainSize * sizeVariation
    const sparseYRange = cloudSparseLayerEndY - cloudSparseLayerStartY
    const yDistribution = Math.random() * Math.random()
    const cloudY = cloudSparseLayerStartY + yDistribution * sparseYRange
    
    cloudConfigs.push({
      x: x,
      y: cloudY,
      mainSize: mainSize,
      puffs: cloudType.puffs,
      opacity: cloudType.opacity * (0.9 + Math.random() * 0.2)
    })
  }
  
  //
  // Render all clouds to a single sprite using toPng()
  // Canvas height increased to prevent clipping
  //
  const cloudsDataURL = toPng({ width: screenWidth, height: 150, pixelRatio: 1 }, (ctx) => {
    cloudConfigs.forEach((cloudConfig) => {
      const canvasX = cloudConfig.x
      const canvasY = cloudConfig.y - cloudTopY  // Relative to top of canvas
      const mainSize = cloudConfig.mainSize
      
      ctx.globalAlpha = cloudConfig.opacity
      ctx.fillStyle = `rgb(${baseCloudColor.r}, ${baseCloudColor.g}, ${baseCloudColor.b})`
      
      //
      // Draw main cloud circle
      //
      ctx.beginPath()
      ctx.arc(canvasX, canvasY, mainSize, 0, Math.PI * 2)
      ctx.fill()
      
      //
      // Draw all puffs
      //
      cloudConfig.puffs.forEach((puff) => {
        ctx.beginPath()
        ctx.arc(
          canvasX + puff.offsetX * mainSize,
          canvasY + puff.offsetY * mainSize,
          mainSize * puff.radius,
          0,
          Math.PI * 2
        )
        ctx.fill()
      })
    })
  })
  
  //
  // Load sprite and add to scene
  //
  k.loadSprite('clouds-level3', cloudsDataURL)
  k.add([
    k.sprite('clouds-level3'),
    k.pos(0, cloudTopY),
    k.z(16),
    k.anchor('topleft')
  ])
}

/**
 * Creates snow drifts on corridor floors using toPng() for performance
 * @param {Object} k - Kaplay instance
 */
function createSnowDrifts(k) {
  //
  // Snow drift configurations (x, width, height, corridor)
  //
  const upperFloorY = CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT - 70
  const lowerFloorY = LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT
  const passageStartX = k.width() - PLATFORM_SIDE_WIDTH - PASSAGE_WIDTH
  const passageEndX = k.width() - PLATFORM_SIDE_WIDTH
  
  //
  // Generate continuous snow drifts data
  //
  const driftsBack = []  // z=12, behind hero
  const driftsFront = []  // z=25, in front of hero
  
  const upperCorridorStart = PLATFORM_SIDE_WIDTH + 100
  const upperCorridorEnd = passageStartX - 60
  
  for (let x = upperCorridorStart; x < upperCorridorEnd; x += 20 + Math.random() * 15) {
    const width = 60 + Math.random() * 120
    const height = 8 + Math.random() * 15
    const zIndex = Math.random() > 0.5 ? 12 : 25
    const shapeType = Math.floor(Math.random() * 3)
    const skew = -0.3 + Math.random() * 0.6
    
    const drift = { x, width, height, y: upperFloorY, shapeType, skew }
    if (zIndex === 12) {
      driftsBack.push(drift)
    } else {
      driftsFront.push(drift)
    }
  }
  
  const lowerCorridorStart1 = PLATFORM_SIDE_WIDTH + 70
  const lowerCorridorEnd1 = passageStartX
  
  for (let x = lowerCorridorStart1; x < lowerCorridorEnd1; x += 20 + Math.random() * 15) {
    const width = 60 + Math.random() * 120
    const height = 8 + Math.random() * 15
    const zIndex = Math.random() > 0.5 ? 12 : 25
    const shapeType = Math.floor(Math.random() * 3)
    const skew = -0.3 + Math.random() * 0.6
    
    const drift = { x, width, height, y: lowerFloorY, shapeType, skew }
    if (zIndex === 12) {
      driftsBack.push(drift)
    } else {
      driftsFront.push(drift)
    }
  }
  
  const lowerCorridorStart2 = passageEndX
  const lowerCorridorEnd2 = k.width() - PLATFORM_SIDE_WIDTH
  
  for (let x = lowerCorridorStart2; x < lowerCorridorEnd2; x += 20 + Math.random() * 15) {
    const width = 60 + Math.random() * 120
    const height = 8 + Math.random() * 15
    const zIndex = Math.random() > 0.5 ? 12 : 25
    const shapeType = Math.floor(Math.random() * 3)
    const skew = -0.3 + Math.random() * 0.6
    
    const drift = { x, width, height, y: lowerFloorY, shapeType, skew }
    if (zIndex === 12) {
      driftsBack.push(drift)
    } else {
      driftsFront.push(drift)
    }
  }
  
  //
  // Add extra smaller drifts
  //
  for (let x = upperCorridorStart; x < upperCorridorEnd; x += 15 + Math.random() * 12) {
    const width = 40 + Math.random() * 70
    const height = 5 + Math.random() * 8
    const zIndex = Math.random() > 0.3 ? 12 : 25
    const shapeType = Math.floor(Math.random() * 3)
    const skew = -0.3 + Math.random() * 0.6
    
    const drift = { x, width, height, y: upperFloorY, shapeType, skew }
    if (zIndex === 12) {
      driftsBack.push(drift)
    } else {
      driftsFront.push(drift)
    }
  }
  
  for (let x = lowerCorridorStart1; x < lowerCorridorEnd1; x += 15 + Math.random() * 12) {
    const width = 40 + Math.random() * 70
    const height = 5 + Math.random() * 8
    const zIndex = Math.random() > 0.3 ? 12 : 25
    const shapeType = Math.floor(Math.random() * 3)
    const skew = -0.3 + Math.random() * 0.6
    
    const drift = { x, width, height, y: lowerFloorY, shapeType, skew }
    if (zIndex === 12) {
      driftsBack.push(drift)
    } else {
      driftsFront.push(drift)
    }
  }
  
  for (let x = lowerCorridorStart2; x < lowerCorridorEnd2; x += 15 + Math.random() * 12) {
    const width = 40 + Math.random() * 70
    const height = 5 + Math.random() * 8
    const zIndex = Math.random() > 0.3 ? 12 : 25
    const shapeType = Math.floor(Math.random() * 3)
    const skew = -0.3 + Math.random() * 0.6
    
    const drift = { x, width, height, y: lowerFloorY, shapeType, skew }
    if (zIndex === 12) {
      driftsBack.push(drift)
    } else {
      driftsFront.push(drift)
    }
  }
  
  //
  // Helper function to draw drift to canvas
  //
  const drawDriftToCanvas = (ctx, drift, isFront) => {
    const baseOpacity = isFront ? 0.7 : 0.95
    const shadowOpacity = isFront ? 0.5 : 0.7
    const highlightOpacity = isFront ? 0.6 : 0.85
    
    ctx.save()
    ctx.translate(drift.x, drift.y)
    
    //
    // Draw main snow mound
    //
    ctx.globalAlpha = baseOpacity
    ctx.fillStyle = 'rgb(240, 240, 250)'
    ctx.beginPath()
    
    const steps = 20
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = (t - 0.5 + drift.skew * (t - 0.5)) * drift.width
      let y
      
      if (drift.shapeType === 0) {
        y = -drift.height * (1 - Math.pow(2 * t - 1, 2))
      } else if (drift.shapeType === 1) {
        y = -drift.height * (1 - Math.pow(Math.abs(2 * t - 1), 1.5))
      } else {
        y = -drift.height * (1 - Math.pow(2 * t - 1, 4))
      }
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    
    ctx.lineTo(drift.width / 2, 0)
    ctx.lineTo(-drift.width / 2, 0)
    ctx.closePath()
    ctx.fill()
    
    //
    // Draw shadow layer
    //
    ctx.globalAlpha = shadowOpacity
    ctx.fillStyle = 'rgb(200, 200, 220)'
    ctx.beginPath()
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = (t - 0.5 + drift.skew * (t - 0.5)) * drift.width
      const y = -drift.height * 0.3 * (1 - Math.pow(2 * t - 1, 2))
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    
    ctx.lineTo(drift.width / 2, 0)
    ctx.lineTo(-drift.width / 2, 0)
    ctx.closePath()
    ctx.fill()
    
    //
    // Draw highlight
    //
    const highlightOffset = drift.skew * drift.width * 0.2
    const highlightRadius = drift.width * 0.15
    const highlightY = -drift.height * 0.7
    
    if (Math.abs(highlightY) - highlightRadius > 0) {
      ctx.globalAlpha = highlightOpacity
      ctx.fillStyle = 'rgb(255, 255, 255)'
      ctx.beginPath()
      ctx.arc(highlightOffset, highlightY, highlightRadius, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.restore()
  }
  
  //
  // Render back snow layer to sprite
  //
  const snowBackDataURL = toPng({ width: k.width(), height: k.height(), pixelRatio: 1 }, (ctx) => {
    driftsBack.forEach(drift => drawDriftToCanvas(ctx, drift, false))
  })
  
  //
  // Render front snow layer to sprite
  //
  const snowFrontDataURL = toPng({ width: k.width(), height: k.height(), pixelRatio: 1 }, (ctx) => {
    driftsFront.forEach(drift => drawDriftToCanvas(ctx, drift, true))
  })
  
  //
  // Load and add sprites
  //
  k.loadSprite('snow-back-level3', snowBackDataURL)
  k.loadSprite('snow-front-level3', snowFrontDataURL)
  
  k.add([
    k.sprite('snow-back-level3'),
    k.pos(0, 0),
    k.z(12),
    k.anchor('topleft')
  ])
  
  k.add([
    k.sprite('snow-front-level3'),
    k.pos(0, 0),
    k.z(25),
    k.anchor('topleft')
  ])
}

/**
 * Flashes the life image to indicate life count increase
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator instance
 * @param {Object} originalColor - Original color
 * @param {number} count - Flash count
 */
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
  // Upper corridor corners (left side only)
  // Top-left corner (where monster starts, upper part)
  //
  k.add([
    k.sprite('corner-sprite-level3'),
    k.pos(PLATFORM_SIDE_WIDTH - CORNER_RADIUS, CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT - 50),
    k.rotate(270),  // No rotation (default orientation, same as lower corridor top-left)
    k.z(30),  // High z-index to be visible above snow
    k.anchor('topleft')
  ])
  //
  // Bottom-left corner (where monster starts, lower part)
  //
  k.add([
    k.sprite('corner-sprite-level3'),
    k.pos(PLATFORM_SIDE_WIDTH - CORNER_RADIUS, CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT + CORNER_RADIUS),
    k.rotate(270),
    k.z(30),  // High z-index to be visible above snow
    k.anchor('topleft')
  ])
  //
  // Lower corridor corners (only left side)
  // Top-left corner
  //
  k.add([
    k.sprite('corner-sprite-level3'),
    k.pos(PLATFORM_SIDE_WIDTH - CORNER_RADIUS, LOWER_CORRIDOR_Y - CORNER_RADIUS),
    k.z(30),  // High z-index to be visible above snow
    k.anchor('topleft')
  ])
  //
  // Bottom-left corner
  //
  k.add([
    k.sprite('corner-sprite-level3'),
    k.pos(PLATFORM_SIDE_WIDTH - CORNER_RADIUS, LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT + CORNER_RADIUS),
    k.rotate(270),
    k.z(30),  // High z-index to be visible above snow
    k.anchor('topleft')
  ])
  //
  // Bottom-right corner (only full right wall)
  //
  k.add([
    k.sprite('corner-sprite-level3'),
    k.pos(k.width() - PLATFORM_SIDE_WIDTH + CORNER_RADIUS, LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT + CORNER_RADIUS),
    k.rotate(180),
    k.z(30),  // High z-index to be visible above snow
    k.anchor('topleft')
  ])
}
