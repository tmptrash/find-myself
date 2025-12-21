import { CFG } from '../cfg.js'
import { initScene, stopTimeSectionMusic } from '../utils/scene.js'
import * as Hero from '../../../components/hero.js'
import * as Sound from '../../../utils/sound.js'
import { saveLastLevel } from '../../../utils/progress.js'
import { getColor } from '../../../utils/helper.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
//
// Platform dimensions (in pixels, for 1920x1080 resolution)
//
const PLATFORM_TOP_HEIGHT = 100
const PLATFORM_BOTTOM_HEIGHT = 100
const PLATFORM_SIDE_WIDTH = 50
//
// Corridor dimensions
//
const CORRIDOR_HEIGHT = 200  // Height of the corridor
const CORRIDOR_Y = 200  // Position corridor at 200px from top (under T1ME indicator)
const LOWER_CORRIDOR_Y = 650  // Position of lower corridor
const PASSAGE_WIDTH = 100  // Width of passage between corridors
//
// Hero and monster spawn positions
//
const HERO_SPAWN_X = 350  // Hero starts more to the right
const HERO_SPAWN_Y = CORRIDOR_Y + CORRIDOR_HEIGHT / 2
const MONSTER_SPAWN_X = PLATFORM_SIDE_WIDTH + 30  // Monster starts at the left (closer to wall)
const MONSTER_SPAWN_Y = CORRIDOR_Y + CORRIDOR_HEIGHT / 2
const ANTIHERO_SPAWN_X = PLATFORM_SIDE_WIDTH + 50  // Anti-hero at the left of lower corridor
const ANTIHERO_SPAWN_Y = LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT / 2
//
// Section configuration
//
const SECTION_WIDTH = 350  // Width of each time section (reduced to fit all sections)
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
    saveLastLevel('level-time.3')
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
    const kidsMusic = k.play('kids', {
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
    const { hero, antiHero } = initScene({
      k,
      levelName: 'level-time.3',
      levelNumber: 4,
      skipPlatforms: true,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
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
    // Create time sections with clocks
    //
    const sections = createTimeSections(k)
    //
    // Create monster that chases the hero
    //
    const monster = createMonster(k, hero)
    //
    // Setup control inversion based on current section
    //
    setupControlInversion(hero, sections)
    //
    // Spawn hero
    //
    Hero.spawn(hero)
    //
    // Spawn anti-hero
    //
    Hero.spawn(antiHero)
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
    k.rect(passageStartX, LOWER_CORRIDOR_Y - (CORRIDOR_Y + CORRIDOR_HEIGHT)),
    k.pos(0, CORRIDOR_Y + CORRIDOR_HEIGHT),
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
  const WIDTH = k.width()
  const HEIGHT = k.height()
  //
  // Create particles as game objects with random initial positions across entire game world
  //
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const size = 1 + Math.random() * 2
    const opacity = 0.3 + Math.random() * 0.4
    //
    // Create particle as a game object
    //
    const particle = k.add([
      k.rect(size, size),
      k.pos(Math.random() * WIDTH, Math.random() * HEIGHT),
      k.color(255, 255, 255),
      k.opacity(opacity),
      k.z(100),  // Very high z-index to be above everything
      k.fixed()  // Fixed to screen, not world
    ])
    
    particles.push({
      obj: particle,
      speedX: 150 + Math.random() * 100,
      speedY: -30 + Math.random() * 60,
      width: WIDTH,
      height: HEIGHT
    })
  }
  
  return {
    k,
    particles
  }
}

/**
 * Update snow particles
 * @param {Object} inst - Snow system instance
 */
function updateSnowParticles(inst) {
  const { k, particles } = inst
  const dt = k.dt()
  //
  // Get screen bounds
  //
  const screenWidth = k.width()
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
    // Wrap around when particle goes off screen
    //
    if (p.obj.pos.x > screenWidth + 10) {
      p.obj.pos.x = -10
      p.obj.pos.y = Math.random() * screenHeight
      p.speedY = -30 + Math.random() * 60
    }
    if (p.obj.pos.x < -10) {
      p.obj.pos.x = screenWidth + 10
      p.obj.pos.y = Math.random() * screenHeight
    }
    if (p.obj.pos.y < -10) {
      p.obj.pos.y = screenHeight + 10
      p.obj.pos.x = Math.random() * screenWidth
    }
    if (p.obj.pos.y > screenHeight + 10) {
      p.obj.pos.y = -10
      p.obj.pos.x = Math.random() * screenWidth
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
  const startX = PLATFORM_SIDE_WIDTH
  const upperCorridorCenterY = CORRIDOR_Y + CORRIDOR_HEIGHT / 2
  const lowerCorridorCenterY = LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT / 2
  //
  // Define section widths and patterns (varied for unpredictability)
  //
  const sectionWidths = [300, 400, 350, 280, 420, 360, 320, 380, 340, 400, 330]
  const reversalPattern = [false, true, false, true, true, false, true, false, false, true, false]
  const clockSizes = [42, 52, 48, 38, 56, 46, 44, 50, 40, 54, 48]
  //
  // Create sections for UPPER corridor (left to right)
  //
  let currentX = startX
  for (let i = 0; i < SECTION_COUNT; i++) {
    const sectionWidth = sectionWidths[i]
    const isReversed = reversalPattern[i]
    const clockSize = clockSizes[i]
    //
    // Randomize clock appearance for visual variety
    //
    const clockGrayLevel = 140 + Math.floor(Math.random() * 80)  // Random gray from 140 to 220
    const clockYOffset = -30 + Math.floor(Math.random() * 60)     // Random Y offset from -30 to +30
    //
    // Create clock text in background with varied size, color, and position
    //
    const minutes = Math.floor(Math.random() * 60)
    const seconds = Math.floor(Math.random() * 60)
    
    const clock = k.add([
      k.text(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`, {
        size: clockSize,
        align: "center"
      }),
      k.pos(currentX + sectionWidth / 2, upperCorridorCenterY + clockYOffset),
      k.anchor("center"),
      k.color(clockGrayLevel, clockGrayLevel, clockGrayLevel),
      k.opacity(0.7),
      k.z(1),
      k.fixed()
    ])
    
    sections.push({
      x: currentX,
      y: CORRIDOR_Y,
      width: sectionWidth,
      height: CORRIDOR_HEIGHT,
      isReversed,
      clock,
      clockTime: { minutes, seconds },
      corridor: 'upper'
    })
    
    currentX += sectionWidth
  }
  //
  // Create sections for LOWER corridor (right to left)
  //
  currentX = k.width() - PLATFORM_SIDE_WIDTH
  for (let i = 0; i < SECTION_COUNT; i++) {
    const sectionWidth = sectionWidths[i]
    const isReversed = reversalPattern[i]
    const clockSize = clockSizes[i]
    currentX -= sectionWidth
    //
    // Randomize clock appearance for visual variety
    //
    const clockGrayLevel = 140 + Math.floor(Math.random() * 80)  // Random gray from 140 to 220
    const clockYOffset = -30 + Math.floor(Math.random() * 60)     // Random Y offset from -30 to +30
    //
    // Create clock text in background with varied size, color, and position
    //
    const minutes = Math.floor(Math.random() * 60)
    const seconds = Math.floor(Math.random() * 60)
    
    const clock = k.add([
      k.text(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`, {
        size: clockSize,
        align: "center"
      }),
      k.pos(currentX + sectionWidth / 2, lowerCorridorCenterY + clockYOffset),
      k.anchor("center"),
      k.color(clockGrayLevel, clockGrayLevel, clockGrayLevel),
      k.opacity(0.7),
      k.z(1),
      k.fixed()
    ])
    
    sections.push({
      x: currentX,
      y: LOWER_CORRIDOR_Y,
      width: sectionWidth,
      height: CORRIDOR_HEIGHT,
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
 * Create monster that chases the hero
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @returns {Object} Monster instance with returnHome method
 */
function createMonster(k, heroInst) {
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
      liftProgress: 0
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
    //
    // Stop monster if hero is annihilating
    //
    if (inst.hero.isAnnihilating) {
      inst.wobbleX = 0
      inst.wobbleY = 0
      return  // Don't move or update anything
    }
    
    let moveDirectionX = 1
    let moveDirectionY = 1
    const heroX = inst.hero.character.pos.x
    const heroY = inst.hero.character.pos.y
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
      if (Math.abs(distanceToStartX) > 10) {
        inst.x += moveDirectionX * inst.speed * dt
      }
      if (Math.abs(distanceToStartY) > 10) {
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
      // Move monster towards hero
      //
      if (Math.abs(distanceX) > 10) {
        inst.x += moveDirectionX * inst.speed * dt + Math.sin(inst.morphTimer * 5) * 8 * dt
      }
      if (Math.abs(distanceY) > 10) {
        inst.y += moveDirectionY * inst.speed * dt
      }
    }
    //
    // Store movement direction for leg calculations
    //
    inst.currentMoveDirectionX = moveDirectionX
    inst.currentMoveDirectionY = moveDirectionY
    //
    // Add chaotic wobble to movement (reduced) - only when chasing
    //
    if (!inst.isReturningHome) {
      inst.wobbleX = Math.sin(inst.morphTimer * 3) * 10
      inst.wobbleY = Math.cos(inst.morphTimer * 2.3) * 8
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
          Hero.death(inst.hero, () => k.go('level-time.3'))
        })
      }
    }
  })
  //
  // Draw legs with pads at the end
  //
  k.onDraw(() => {
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
  })
  
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

