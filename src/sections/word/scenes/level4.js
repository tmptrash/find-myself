import { CFG } from '../cfg.js'
import { initScene, checkSpeedBonus, playLifeDeathEffects } from '../utils/scene.js'
import { getColor } from '../../../utils/helper.js'
import * as Hero from '../../../components/hero.js'
import * as Blades from '../components/blades.js'
import * as MovingPlatform from '../../../components/moving-platform.js'
import * as BladeArm from '../components/blade-arm.js'
import * as FlyingWords from '../components/flying-words.js'
import * as WordPile from '../components/word-pile.js'
import * as WordGrass from '../components/word-grass.js'
import { set, get } from '../../../utils/progress.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as Sound from '../../../utils/sound.js'
import { createLevelTransition } from '../../../utils/transition.js'

//
// Platform dimensions (in pixels, for 1920x1080 resolution)
//
const PLATFORM_TOP_HEIGHT = 360      // Top platform height (33.3% of 1080)
const PLATFORM_BOTTOM_HEIGHT = 360   // Bottom platform height (33.3% of 1080)
const PLATFORM_SIDE_WIDTH = 192      // Side walls width (10% of 1920)

//
// Hero spawn positions (in pixels)
//
const HERO_SPAWN_X_BASE = 576   // 30% of 1920 (base position before shift)
const HERO_SPAWN_Y = 705        // Adjusted to stand on platform
const ANTIHERO_SPAWN_X = 1690   // 88% of 1920
const ANTIHERO_SPAWN_Y = 705    // Adjusted to stand on platform

//
// Letter bullet configuration
//
const BULLET_SPEED = 600
const BULLET_SIZE = 22
const BULLET_OUTLINE_WIDTH = 2
const CREATURE_FREEZE_DURATION = 1.0
const CREATURE_HIT_PARTICLE_COUNT = 15
const CREATURE_HIT_PARTICLE_SIZE = 4
const CREATURE_FLASH_COUNT = 10
const CREATURE_HIT_DISTANCE = 50
const SHOOT_KEYS = ['shift', 'ShiftLeft', 'ShiftRight']
const INSTRUCTIONS_SHOW_MAX = 2
const INSTRUCTIONS_INITIAL_DELAY = 1.0
const INSTRUCTIONS_FADE_IN_DURATION = 0.5
const INSTRUCTIONS_HOLD_DURATION = 4.0
const INSTRUCTIONS_FADE_OUT_DURATION = 0.5
//
// Random letters for projectiles
//
const BULLET_LETTERS = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
]
//
// Death messages for level 4
//
const DEATH_MESSAGES = [
  "Some words strike first.",
  "Not every word waits to hurt you.",
  "Sharp words move faster than you think.",
  "Watch your step — and your words.",
  "Words hit harder when you're running."
]

/**
 * Show death message and restart level after delay
 * @param {Object} k - Kaplay instance
 * @param {Object} hero - Hero instance
 * @param {Object} bladesInst - Blades instance (optional)
 * @param {Object} bladeArmInst - Blade arm instance (optional)
 * @param {Object} [levelIndicator] - Level indicator for life score update
 * @param {Object} [sound] - Sound instance for effects
 */
function showDeathMessage(k, hero, bladesInst, bladeArmInst = null, levelIndicator = null, sound = null) {
  //
  // Increment life score and update display
  //
  const currentLifeScore = get('lifeScore', 0)
  const newLifeScore = currentLifeScore + 1
  set('lifeScore', newLifeScore)
  levelIndicator && levelIndicator.updateLifeScore && levelIndicator.updateLifeScore(newLifeScore)
  playLifeDeathEffects(k, levelIndicator)
  //
  // Select random message
  //
  const message = DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)]
  const centerX = CFG.visual.screen.width / 2
  const messageY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT + 200
  
  //
  // Create message text
  //
  const messageText = k.add([
    k.text(message, {
      size: 32,
      align: "center",
      font: CFG.visual.fonts.regularFull.replace(/'/g, '')
    }),
    k.pos(centerX, messageY),
    k.anchor("center"),
    k.color(107, 142, 159),  // Steel blue (blade color)
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 20)
  ])
  
  let timer = 0
  let phase = 'fade_in'
  let restartTriggered = false
  
  //
  // Restart level function
  //
  const restartLevel = () => {
    if (restartTriggered) return
    restartTriggered = true
    //
    // Reset blade arm state if provided
    //
    if (bladeArmInst) {
      bladeArmInst.heroIsDead = false
    }
    k.destroy(messageText)
    k.go("level-word.4")
  }
  
  //
  // Show blades and trigger death animation with particles
  //
  if (bladesInst) {
    bladesInst.wasShownOnDeath = true  // Stop glint animation on death
    Blades.show(bladesInst)
  }
  Hero.death(hero, () => {
    // Death animation with particles will play
  })
  
  //
  // Update animation phases
  //
  const updateInterval = k.onUpdate(() => {
    timer += k.dt()
    
    if (phase === 'fade_in') {
      const progress = Math.min(1, timer / CFG.visual.deathMessage.fadeDuration)
      messageText.opacity = progress
      if (progress >= 1) {
        phase = 'hold'
        timer = 0
      }
    } else if (phase === 'hold') {
      if (timer >= CFG.visual.deathMessage.duration) {
        phase = 'fade_out'
        timer = 0
      }
    } else if (phase === 'fade_out') {
      const progress = Math.min(1, timer / CFG.visual.deathMessage.fadeDuration)
      messageText.opacity = 1 - progress
      if (progress >= 1) {
        updateInterval.cancel()
        restartLevel()
      }
    }
  })
  
  //
  // Allow user to skip message with key press or click
  //
  k.onKeyPress(["space", "enter"], () => {
    updateInterval.cancel()
    restartLevel()
  })
  k.onClick(() => {
    updateInterval.cancel()
    restartLevel()
  })
}


export function sceneLevel4(k) {
  k.scene("level-word.4", () => {
    //
    // Save progress immediately when entering this level
    //
    set('lastLevel', 'level-word.4')
    // Calculate hero position shifted right by 3 blade widths
    const singleBladeWidth = Blades.getSingleBladeWidth(k)
    const customHeroX = HERO_SPAWN_X_BASE + singleBladeWidth * 3  // Shift right by 3 pyramids
    const leftX = Math.min(customHeroX, ANTIHERO_SPAWN_X)
    const rightX = Math.max(customHeroX, ANTIHERO_SPAWN_X)
    const distance = rightX - leftX
    
    // Moving platforms at 1/3 and 2/3 distance
    const bladeWidth = Blades.getBladeWidth(k)
    const movingPlatform1X = leftX + distance / 3  // First platform at 1/3 distance
    const movingPlatform2X = leftX + distance * 2 / 3  // Second platform at 2/3 distance
    
    //
    // Define platform gaps
    //
    const platformGaps = [
      // First gap for first moving platform (special jump-to-disable)
      {
        x: movingPlatform1X - bladeWidth / 2,
        width: bladeWidth
      },
      // Second gap for second moving platform (normal timer-based)
      {
        x: movingPlatform2X - bladeWidth / 2,
        width: bladeWidth
      }
    ]
    
    // Initialize level with heroes and TWO gaps in platform
    const { sound, hero, antiHero, levelIndicator, fpsCounter, breathMusic } = initScene({
      k,
      levelName: 'level-word.4',
      levelNumber: 5,
      nextLevel: 'word-complete',
      levelTitle: "words like blades",
      levelTitleColor: CFG.visual.colors.blades,
      subTitle: "when feelings grow dull, words become sharper",
      subTitleColor: CFG.visual.colors.blades,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: customHeroX,  // Custom hero position (shifted right by 3 pyramids)
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y,
      platformGap: platformGaps,
      onAnnihilation: () => {
        breathMusic && breathMusic.stop && breathMusic.stop()
        const levelTime = FpsCounter.getLevelTime(fpsCounter)
        const speedBonusEarned = checkSpeedBonus(k, 'level-word.4', levelTime, levelIndicator)
        const currentScore = get('heroScore', 0)
        const pointsToAdd = speedBonusEarned ? 2 : 1
        const newScore = currentScore + pointsToAdd
        set('heroScore', newScore)
        levelIndicator && levelIndicator.updateHeroScore && levelIndicator.updateHeroScore(newScore)
        sound && Sound.playVictorySound(sound)
        k.wait(1.3, () => {
          createLevelTransition(k, 'level-word.4')
        })
      }
    })
    
    //
    // Calculate platform boundaries for flying words
    //
    const platformBounds = {
      left: PLATFORM_SIDE_WIDTH,
      right: CFG.visual.screen.width - PLATFORM_SIDE_WIDTH,
      top: PLATFORM_TOP_HEIGHT,
      bottom: CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT
    }
    
    //
    // Create blade arm first (needed for death callbacks)
    //
    const bottomPlatformY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT  // 720
    const heroHalfHeight = 37  // Half of hero's height
    const textY = bottomPlatformY - heroHalfHeight - 15    // Text at mid-body height above bottom platform, raised by 30px
    const bladeArm = BladeArm.create({
      k,
      y: textY,
      hero,
      currentLevel: 'level-word.4',
      sfx: sound,
      onHit: (bladeArmInst) => showDeathMessage(k, hero, null, bladeArmInst, levelIndicator, sound)
    })
    
    //
    // Create flying words for atmosphere
    //
    const flyingWords = FlyingWords.create({
      k,
      hero,
      currentLevel: 'level-word.4',
      onDeath: () => {
        //
        // Stop blade arm movement
        //
        bladeArm.heroIsDead = true
        showDeathMessage(k, hero, null, bladeArm, levelIndicator, sound)
      },
      color: '#B0B0B0',  // Light gray for ghostly/ethereal flying words
      customBounds: platformBounds,
      letterToWordRatio: CFG.visual.flyingWords.letterToWordRatio,
      killerLetterCount: 4  // Level 4: 4 killer letters
    })
    
    //
    // Create word pile for depth atmosphere effect
    //
    const wordPile = WordPile.create({
      k,
      customBounds: platformBounds
    })
    
    //
    // Update flying words animation
    //
    k.onUpdate(() => {
      FlyingWords.onUpdate(flyingWords)
    })
    
    //
    // Create word grass on bottom platform (no static blades on this level)
    //
    const wordGrass = WordGrass.create({
      k,
      customBounds: platformBounds,
      hero,
      bladePositions: [],  // No static blades on this level
      platformGaps,  // Pass the gaps so grass doesn't spawn over them
      movingPlatformPositions: [movingPlatform1X, movingPlatform2X]  // Two moving platforms
    })
    
    //
    // Update word grass animation
    //
    k.onUpdate(() => {
      WordGrass.onUpdate(wordGrass)
    })
    const platformY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT
    const bladeHeight = Blades.getBladeHeight(k)
    
    // Create first special moving platform (jump-to-disable mode)
    MovingPlatform.create({
      k,
      x: movingPlatform1X,
      y: platformY,
      hero,
      color: CFG.visual.colors.platform,
      currentLevel: 'level-word.4',
      jumpToDisableBlades: true,  // Special mode: jump down to disable blades
      autoOpen: true,  // Auto-open on level start
      sfx: sound,
      onBladeHit: (blades) => showDeathMessage(k, hero, blades, bladeArm, levelIndicator, sound)
    })
    
    // Create second normal moving platform (timer-based mode)
    MovingPlatform.create({
      k,
      x: movingPlatform2X,
      y: platformY,
      hero,
      color: CFG.visual.colors.platform,
      currentLevel: 'level-word.4',
      jumpToDisableBlades: false,  // Normal mode: timer-based (5 seconds)
      autoOpen: false,  // Triggered by hero proximity
      sfx: sound,
      raiseTimeout: 6.0,  // Close 1 second later than default (4 seconds)
      onBladeHit: (blades) => showDeathMessage(k, hero, blades, bladeArm, levelIndicator, sound)
    })
    //
    // Create static blades after first pit to prevent jumping over
    //
    const firstPitRightEdge = movingPlatform1X + bladeWidth / 2
    const staticBladesX = firstPitRightEdge + singleBladeWidth * 2  // Position 2 pyramids after pit
    const staticBladesY = platformY - bladeHeight * 0.5  // Extend up from platform level
    //
    // Create tall static blades (always visible, prevent jumping over pit)
    //
    const staticBlades = Blades.create({
      k,
      x: staticBladesX,
      y: staticBladesY,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => showDeathMessage(k, hero, staticBlades, bladeArm, levelIndicator, sound),
      sfx: sound,
      color: CFG.visual.colors.blades,
      disableAnimation: true  // Disable vibration and glint
    })
    //
    // Make blades visible immediately
    //
    Blades.show(staticBlades)
    //
    // Create static blades after second pit to prevent jumping over
    //
    const secondPitRightEdge = movingPlatform2X + bladeWidth / 2
    const staticBlades2X = secondPitRightEdge + singleBladeWidth * 2  // Position 2 pyramids after pit
    const staticBlades2Y = platformY - bladeHeight * 0.5  // Extend up from platform level
    //
    // Create tall static blades (always visible, prevent jumping over pit)
    //
    const staticBlades2 = Blades.create({
      k,
      x: staticBlades2X,
      y: staticBlades2Y,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => showDeathMessage(k, hero, staticBlades2, bladeArm, levelIndicator, sound),
      sfx: sound,
      color: CFG.visual.colors.blades,
      disableAnimation: true  // Disable vibration and glint
    })
    //
    // Make second blades visible immediately
    //
    Blades.show(staticBlades2)
    //
    // Setup letter throwing mechanic (hero throws letters at creature)
    //
    setupHeroShooting(k, hero, bladeArm, levelIndicator)
    showLetterInstructions(k)
  })
}

/**
 * Setup hero shooting system (throw letters at blade-arm creature)
 * @param {Object} k - Kaplay instance
 * @param {Object} hero - Hero instance
 * @param {Object} bladeArm - Blade arm creature instance
 * @param {Object} levelIndicator - Level indicator instance
 */
function setupHeroShooting(k, hero, bladeArm, levelIndicator) {
  SHOOT_KEYS.forEach(key => {
    k.onKeyPress(key, () => {
      const currentScore = get('heroScore', 0)
      if (currentScore > 0 && hero.character && hero.character.exists()) {
        const heroFacingRight = !hero.character.flipX
        //
        // Reduce hero score by 1
        //
        const newScore = currentScore - 1
        set('heroScore', newScore)
        levelIndicator && levelIndicator.updateHeroScore && levelIndicator.updateHeroScore(newScore)
        createLetterBullet(k, hero, heroFacingRight, bladeArm)
      } else if (currentScore === 0) {
        hero.sfx && Sound.playEmptyClickSound(hero.sfx)
      }
    })
  })
}

/**
 * Create a letter projectile that flies horizontally
 * @param {Object} k - Kaplay instance
 * @param {Object} hero - Hero instance
 * @param {boolean} facingRight - Direction hero is facing
 * @param {Object} bladeArm - Blade arm creature instance
 */
function createLetterBullet(k, hero, facingRight, bladeArm) {
  const heroPos = hero.character.pos
  const direction = facingRight ? 1 : -1
  const heroColor = getColor(k, CFG.visual.colors.hero.body)
  const letter = BULLET_LETTERS[Math.floor(Math.random() * BULLET_LETTERS.length)]
  const fontFamily = CFG.visual.fonts.regularFull.replace(/'/g, '')
  //
  // Play shoot sound
  //
  Sound.playBulletShootSound(hero.sfx)
  //
  // Create letter bullet with outline
  //
  const bullet = k.add([
    k.pos(heroPos.x, heroPos.y),
    k.z(21),
    k.anchor('center'),
    'letter-bullet',
    {
      draw() {
        //
        // Draw black outline offsets
        //
        const outlineOffsets = [
          [-BULLET_OUTLINE_WIDTH, -BULLET_OUTLINE_WIDTH],
          [0, -BULLET_OUTLINE_WIDTH],
          [BULLET_OUTLINE_WIDTH, -BULLET_OUTLINE_WIDTH],
          [-BULLET_OUTLINE_WIDTH, 0],
          [BULLET_OUTLINE_WIDTH, 0],
          [-BULLET_OUTLINE_WIDTH, BULLET_OUTLINE_WIDTH],
          [0, BULLET_OUTLINE_WIDTH],
          [BULLET_OUTLINE_WIDTH, BULLET_OUTLINE_WIDTH]
        ]
        outlineOffsets.forEach(([dx, dy]) => {
          k.drawText({
            text: letter,
            size: BULLET_SIZE,
            font: fontFamily,
            pos: k.vec2(dx, dy),
            anchor: 'center',
            color: k.rgb(0, 0, 0)
          })
        })
        //
        // Draw main letter in hero color
        //
        k.drawText({
          text: letter,
          size: BULLET_SIZE,
          font: fontFamily,
          pos: k.vec2(0, 0),
          anchor: 'center',
          color: heroColor
        })
      }
    }
  ])
  //
  // Move bullet horizontally
  //
  bullet.onUpdate(() => {
    bullet.pos.x += BULLET_SPEED * direction * k.dt()
    if (bullet.pos.x < 0 || bullet.pos.x > k.width()) {
      k.destroy(bullet)
    }
  })
  //
  // Check collision with blade-arm creature
  //
  bullet.onUpdate(() => {
    if (!bladeArm || !bladeArm.collisionArea) return
    const creatureX = bladeArm.collisionArea.pos.x
    const creatureY = bladeArm.collisionArea.pos.y
    const distX = Math.abs(bullet.pos.x - creatureX)
    const distY = Math.abs(bullet.pos.y - creatureY)
    if (distX < CREATURE_HIT_DISTANCE && distY < CREATURE_HIT_DISTANCE) {
      onCreatureHit(k, bladeArm, hero.sfx)
      k.destroy(bullet)
    }
  })
}

/**
 * Handle blade-arm creature being hit by letter
 * @param {Object} k - Kaplay instance
 * @param {Object} bladeArm - Blade arm creature instance
 * @param {Object} sfx - Sound instance
 */
function onCreatureHit(k, bladeArm, sfx) {
  //
  // Add freeze duration (accumulate if already frozen)
  //
  if (!bladeArm.freezeTimeRemaining) {
    bladeArm.freezeTimeRemaining = 0
  }
  bladeArm.freezeTimeRemaining += CREATURE_FREEZE_DURATION
  //
  // Mark as frozen if not already
  //
  if (!bladeArm.isFrozen) {
    bladeArm.isFrozen = true
    startFreezeCountdown(k, bladeArm)
  }
  sfx && Sound.playBulletHitSound(sfx)
  createCreatureHitParticles(k, bladeArm)
  flashCreature(k, bladeArm, 0)
}

/**
 * Start freeze countdown for blade-arm creature
 * @param {Object} k - Kaplay instance
 * @param {Object} bladeArm - Blade arm creature instance
 */
function startFreezeCountdown(k, bladeArm) {
  const unfreezeLoop = k.onUpdate(() => {
    if (!bladeArm || !bladeArm.freezeTimeRemaining) {
      unfreezeLoop.cancel()
      return
    }
    bladeArm.freezeTimeRemaining -= k.dt()
    if (bladeArm.freezeTimeRemaining <= 0) {
      bladeArm.isFrozen = false
      bladeArm.freezeTimeRemaining = 0
      unfreezeLoop.cancel()
    }
  })
}

/**
 * Create particles when creature is hit
 * @param {Object} k - Kaplay instance
 * @param {Object} bladeArm - Blade arm creature instance
 */
function createCreatureHitParticles(k, bladeArm) {
  const hitX = bladeArm.collisionArea.pos.x
  const hitY = bladeArm.collisionArea.pos.y
  for (let i = 0; i < CREATURE_HIT_PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 100 + Math.random() * 200
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed
    const particle = k.add([
      k.rect(CREATURE_HIT_PARTICLE_SIZE, CREATURE_HIT_PARTICLE_SIZE),
      k.pos(hitX, hitY),
      k.color(107, 142, 159),
      k.opacity(1.0),
      k.anchor('center'),
      k.z(22)
    ])
    particle.onUpdate(() => {
      particle.pos.x += vx * k.dt()
      particle.pos.y += vy * k.dt()
      particle.opacity -= k.dt() * 2
      if (particle.opacity <= 0) {
        k.destroy(particle)
      }
    })
  }
}

/**
 * Flash creature text when hit (alternates between white and original)
 * @param {Object} k - Kaplay instance
 * @param {Object} bladeArm - Blade arm creature instance
 * @param {number} count - Current flash count
 */
function flashCreature(k, bladeArm, count) {
  if (count >= CREATURE_FLASH_COUNT) return
  const isWhite = count % 2 === 0
  const newColor = isWhite ? k.rgb(255, 255, 255) : k.rgb(107, 142, 159)
  //
  // Flash all text objects (last one is main text)
  //
  const mainText = bladeArm.textObjects[bladeArm.textObjects.length - 1]
  if (mainText) {
    mainText.color = newColor
  }
  k.wait(0.05, () => flashCreature(k, bladeArm, count + 1))
}

/**
 * Show letter throwing instructions (shown only first 2 times)
 * @param {Object} k - Kaplay instance
 */
function showLetterInstructions(k) {
  let showCount = get('level4LetterInstructionsCount', 0)
  if (showCount >= INSTRUCTIONS_SHOW_MAX) return
  set('level4LetterInstructionsCount', showCount + 1)
  const centerX = CFG.visual.screen.width / 2 - 20
  const textY = 140
  const content = "use Shift to throw letters at the creature"
  const fontFamily = CFG.visual.fonts.regularFull.replace(/'/g, '')
  //
  // Create outline texts
  //
  const outlineOffsets = [
    [-2, -2], [0, -2], [2, -2],
    [-2, 0], [2, 0],
    [-2, 2], [0, 2], [2, 2]
  ]
  const outlineTexts = outlineOffsets.map(([dx, dy]) =>
    k.add([
      k.text(content, { size: 20, font: fontFamily }),
      k.pos(centerX + dx, textY + dy),
      k.anchor("center"),
      k.color(0, 0, 0),
      k.opacity(0),
      k.z(CFG.visual.zIndex.ui + 10),
      k.fixed()
    ])
  )
  const mainText = k.add([
    k.text(content, { size: 20, font: fontFamily }),
    k.pos(centerX, textY),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 10),
    k.fixed()
  ])
  //
  // Animate instructions (delay -> fade in -> hold -> fade out)
  //
  const inst = { timer: 0, phase: 'initial_delay' }
  const updateLoop = k.onUpdate(() => {
    inst.timer += k.dt()
    if (inst.phase === 'initial_delay') {
      if (inst.timer >= INSTRUCTIONS_INITIAL_DELAY) {
        inst.phase = 'fade_in'
        inst.timer = 0
      }
    } else if (inst.phase === 'fade_in') {
      const progress = Math.min(inst.timer / INSTRUCTIONS_FADE_IN_DURATION, 1)
      mainText.opacity = progress
      outlineTexts.forEach(t => { t.opacity = progress })
      if (progress >= 1) {
        inst.phase = 'hold'
        inst.timer = 0
      }
    } else if (inst.phase === 'hold') {
      if (inst.timer >= INSTRUCTIONS_HOLD_DURATION) {
        inst.phase = 'fade_out'
        inst.timer = 0
      }
    } else if (inst.phase === 'fade_out') {
      const progress = Math.min(inst.timer / INSTRUCTIONS_FADE_OUT_DURATION, 1)
      mainText.opacity = 1 - progress
      outlineTexts.forEach(t => { t.opacity = 1 - progress })
      if (progress >= 1) {
        k.destroy(mainText)
        outlineTexts.forEach(t => k.destroy(t))
        updateLoop.cancel()
      }
    }
  })
}

