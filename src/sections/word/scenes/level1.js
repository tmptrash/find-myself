import { CFG } from '../cfg.js'
import { initScene, checkSpeedBonus, playLifeDeathEffects, playSpeedBonusEffects, createOutlinedDeathMessage, spawnWordBackgroundHeroes } from '../utils/scene.js'
import * as Blades from '../components/blades.js'
import * as Hero from '../../../components/hero.js'
import * as MovingPlatform from '../../../components/moving-platform.js'
import * as FlyingWords from '../components/flying-words.js'
import * as WordPile from '../components/word-pile.js'
import * as WordGrass from '../components/word-grass.js'
import { set, get } from '../../../utils/progress.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as Sound from '../../../utils/sound.js'
import { createLevelTransition } from '../../../utils/transition.js'
import * as WordCeilingTrap from '../utils/word-ceiling-trap.js'
import * as BonusHero from '../../touch/components/bonus-hero.js'
import * as WordIdleAaaTrap from '../utils/word-idle-aaa-trap.js'

//
// Death messages (shown randomly on death)
//
const DEATH_MESSAGES = [
  "Falling is easy.",
  "You fall the same way.",
  "The ground always wins.",
  "Fall fast. Learn slowly.",
  "Not every fall teaches.",
  "You fell for it again."
]

//
// Platform dimensions (in pixels, for 1920x1080 resolution)
//
const PLATFORM_TOP_HEIGHT = 360      // Top platform height (33.3% of 1080)
const PLATFORM_BOTTOM_HEIGHT = 360   // Bottom platform height (33.3% of 1080)
const PLATFORM_SIDE_WIDTH = 192      // Side walls width (10% of 1920)

//
// Hero spawn positions (in pixels)
//
const HERO_SPAWN_X = 230    // 12% of 1920
const HERO_SPAWN_Y = 705    // Adjusted to stand on platform
const ANTIHERO_SPAWN_X = 1690  // 88% of 1920
const ANTIHERO_SPAWN_Y = 705   // Adjusted to stand on platform
//
// Pit / moving platform shifted right so it does not overlap HELP label
//
const PIT_X_EXTRA_OFFSET = 100
const PIT_RAISE_DELAY = 4.5
//
// Hidden bonus platform to the right of the ceiling drop tube
//
const BONUS_PLATFORM_GAP = 48
const BONUS_PLATFORM_Y_OFFSET = 58
const BONUS_PLATFORM_COLLISION_WIDTH = 80
const BONUS_PLATFORM_REVEAL_WIDTH = 150
const BONUS_PLATFORM_COLLISION_TOP_TRIM = 12
const BONUS_PLATFORM_COLLISION_X_OFFSET = 18
const BONUS_STORAGE_KEY = 'word.level1BonusCollected'

/**
 * Shows a random death message and then restarts the level
 * @param {Object} k - Kaplay instance
 * @param {Object} hero - Hero instance
 * @param {Object} bladesInst - Blades instance that was hit
 * @param {Object} [levelIndicator] - Level indicator for life score update
 * @param {Object} [sound] - Sound instance for effects
 */
function showDeathMessage(k, hero, bladesInst, levelIndicator = null, sound = null) {
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
  
  //
  // Calculate position (below bottom platform, centered)
  //
  const centerX = CFG.visual.screen.width / 2
  const messageY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT + 200
  
  //
  // Create message text
  //
  const deathMsg = createOutlinedDeathMessage(k, { message, centerX, messageY })
  //
  // Animation state
  //
  const inst = {
    k,
    deathMsg,
    timer: 0,
    phase: 'fade_in',
    skipRequested: false
  }
  
  //
  // Listen for skip inputs (space, enter, mouse click)
  //
  const skipHandlers = []
  
  const requestSkip = () => {
    inst.skipRequested = true
  }
  
  skipHandlers.push(k.onKeyPress("space", requestSkip))
  skipHandlers.push(k.onKeyPress("enter", requestSkip))
  skipHandlers.push(k.onClick(requestSkip))
  
  //
  // Show blades and trigger death animation
  //
  if (bladesInst) {
    bladesInst.wasShownOnDeath = true  // Stop glint animation on death
    Blades.show(bladesInst)
  }
  Hero.death(hero, () => {
    // This callback will be called after message sequence completes
  })
  
  //
  // Update animation
  //
  const updateInterval = k.onUpdate(() => {
    inst.timer += k.dt()
    
    //
    // Handle skip request
    //
    if (inst.skipRequested) {
      //
      // Clean up immediately
      //
      updateInterval.cancel()
      skipHandlers.forEach(h => h.cancel())
      deathMsg.destroy()
      //
      // Restart level
      //
      k.go("level-word.1")
      return
    }
    
    if (inst.phase === 'fade_in') {
      //
      // Fade in message
      //
      const progress = Math.min(1, inst.timer / CFG.visual.deathMessage.fadeDuration)
      deathMsg.setOpacity(progress)
      
      if (progress >= 1) {
        inst.phase = 'hold'
        inst.timer = 0
      }
    } else if (inst.phase === 'hold') {
      //
      // Hold message
      //
      if (inst.timer >= CFG.visual.deathMessage.duration) {
        inst.phase = 'fade_out'
        inst.timer = 0
      }
    } else if (inst.phase === 'fade_out') {
      //
      // Fade out message
      //
      const progress = Math.min(1, inst.timer / CFG.visual.deathMessage.fadeDuration)
      deathMsg.setOpacity(1 - progress)
      
      if (progress >= 1) {
        //
        // Clean up and restart level
        //
        updateInterval.cancel()
        skipHandlers.forEach(h => h.cancel())
        deathMsg.destroy()
        k.go("level-word.1")
      }
    }
  })
}

export function sceneLevel1(k) {
  k.scene("level-word.1", () => {
    //
    // Save progress immediately when entering this level
    //
    set('lastLevel', 'level-word.1')
    //
    // Calculate moving platform position and gap
    //
    const centerX = CFG.visual.screen.width / 2
    const bladeWidth = Blades.getBladeWidth(k)
    const movingPlatformX = centerX + CFG.visual.screen.width * 0.05 + PIT_X_EXTRA_OFFSET
    
    //
    // Define platform gap
    //
    const platformGap = {
      x: movingPlatformX - bladeWidth / 2,  // Gap under platform
      width: bladeWidth  // Gap width matches blade width
    }
    
    //
    // Initialize level with heroes and gap in platform (for trap)
    //
    let bonusInst = null
    const { sound, hero, antiHero, levelIndicator, fpsCounter, breathMusic, platformColor } = initScene({
      k,
      levelName: 'level-word.1',
      levelNumber: 2,
      nextLevel: 'level-word.2',
      levelTitle: "words like blades",
      levelTitleColor: CFG.visual.colors.blades,
      subTitle: "sometimes words cut deeper than blades...",
      subTitleColor: CFG.visual.colors.blades,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y,
      platformGap,
      onAnnihilation: () => {
        breathMusic && breathMusic.stop && breathMusic.stop()
        bonusInst && BonusHero.finalizeCollection(bonusInst)
        const levelTime = FpsCounter.getLevelTime(fpsCounter)
        const speedBonusEarned = checkSpeedBonus(k, 'level-word.1', levelTime, levelIndicator)
        const currentScore = get('heroScore', 0)
        const pointsToAdd = speedBonusEarned ? 2 : 1
        const newScore = currentScore + pointsToAdd
        set('heroScore', newScore)
        levelIndicator && levelIndicator.updateHeroScore && levelIndicator.updateHeroScore(newScore)
        sound && Sound.playVictorySound(sound)
        playSpeedBonusEffects(k, levelIndicator)
        const transitionDelay = speedBonusEarned ? 2.8 : 1.8
        k.wait(transitionDelay, () => {
          createLevelTransition(k, 'level-word.1')
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
    // Create flying words for atmosphere
    //
    const flyingWords = FlyingWords.create({
      k,
      hero,
      currentLevel: 'level-word.1',
      onDeath: () => showDeathMessage(k, hero, null, levelIndicator, sound),
      customBounds: platformBounds,
      letterToWordRatio: CFG.visual.flyingWords.letterToWordRatio,
      killerLetterCount: 2  // Level 1: 4 killer letters
    })
    
    //
    // Create word pile for depth atmosphere effect
    //
    const wordPile = WordPile.create({
      k,
      customBounds: platformBounds
    })
    spawnWordBackgroundHeroes(k, {
      hero,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH
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
      platformGaps: [platformGap],  // Pass the gap so grass doesn't spawn over it
      movingPlatformPositions: [movingPlatformX]  // Grass avoids moving platform area
    })
    
    //
    // Update word grass animation
    //
    k.onUpdate(() => {
      WordGrass.onUpdate(wordGrass)
    })
    //
    // Create moving platform (at floor level)
    //
    const platformY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT
    
    const movingPlatform = MovingPlatform.create({
      k,
      x: movingPlatformX,
      y: platformY,
      hero,
      color: platformColor,
      currentLevel: 'level-word.1',
      sfx: sound,
      raiseDelay: PIT_RAISE_DELAY,
      onBladeHit: (blades) => showDeathMessage(k, hero, blades, levelIndicator, sound)
    })
    const bonusPlatformX = movingPlatformX + bladeWidth / 2 + BONUS_PLATFORM_GAP + BONUS_PLATFORM_COLLISION_WIDTH / 2
    bonusInst = BonusHero.create({
      k,
      x: bonusPlatformX,
      y: platformY - BONUS_PLATFORM_Y_OFFSET,
      width: BONUS_PLATFORM_COLLISION_WIDTH,
      collisionWidth: BONUS_PLATFORM_COLLISION_WIDTH,
      heroInst: hero,
      levelIndicator,
      sfx: sound,
      approachFromAbove: true,
      platformText: 'block',
      platformCollisionTopTrim: BONUS_PLATFORM_COLLISION_TOP_TRIM,
      platformCollisionXOffset: BONUS_PLATFORM_COLLISION_X_OFFSET,
      revealWidth: BONUS_PLATFORM_REVEAL_WIDTH,
      storageKey: BONUS_STORAGE_KEY
    })
    let ceilingTrapInst = null
    ceilingTrapInst = WordCeilingTrap.create({
      k,
      hero,
      gapCenterX: movingPlatformX,
      pitWidth: bladeWidth,
      playfieldTopY: PLATFORM_TOP_HEIGHT,
      platformTopY: platformY,
      sfx: sound,
      onHit: () => showDeathMessage(k, hero, ceilingTrapInst.ceilingBlades, levelIndicator, sound)
    })
    WordIdleAaaTrap.create({
      k,
      hero,
      floorY: platformY,
      sfx: sound,
      onHit: (bladesInst) => showDeathMessage(k, hero, bladesInst, levelIndicator, sound)
    })
  })
}
