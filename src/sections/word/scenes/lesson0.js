import { CFG } from '../cfg.js'
import { initScene, checkSpeedBonus, playLifeDeathEffects, playSpeedBonusEffects, createOutlinedDeathMessage } from '../utils/scene.js'
import * as Blades from '../components/blades.js'
import * as Hero from '../../../components/hero.js'
import * as FlyingWords from '../components/flying-words.js'
import * as BonusHero from '../../touch/components/bonus-hero.js'
import * as WordHudTooltips from '../utils/word-hud-tooltips.js'
import * as LifeDeduction from '../../touch/utils/life-deduction.js'
import * as LevelHelp from '../../../utils/lesson-help.js'
import * as WordBlades2ChaseTrap from '../utils/word-blades2-chase-trap.js'
import * as WordBladeProximity from '../utils/word-blade-proximity.js'
import * as WordKillerProximity from '../utils/word-killer-proximity.js'
import * as Tooltip from '../../../utils/tooltip.js'
import { get, set } from '../../../utils/progress.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as Sound from '../../../utils/sound.js'
import { createLevelTransition } from '../../../utils/transition.js'

//
// Death messages (shown randomly on death)
//
const DEATH_MESSAGES = [
  "Can't stop the thoughts?",
  "Some words bite",
  "Greetings from intrusive thoughts!",
  "We never sleep (C) Your thoughts",
  "You can't hide from us",
  "Peace is just a dream for us",
  "Relax and we'll eat you up!"
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
const HERO_SPAWN_Y = 705    // Adjusted to stand on platform (1080 - 360 - 15 for character height)
const ANTIHERO_SPAWN_X = 1690  // 88% of 1920
const ANTIHERO_SPAWN_Y = 705   // Adjusted to stand on platform
//
// Hidden bonus platform above hero (invisible until hero jumps up from the right)
//
const BONUS_PLATFORM_X = 290
const BONUS_PLATFORM_Y = 678
const BONUS_PLATFORM_WIDTH = 180
const BONUS_PLATFORM_COLLISION_WIDTH = 76
const BONUS_PLATFORM_COLLISION_X_OFFSET = 36
const BONUS_PLATFORM_REVEAL_WIDTH = 160
const BONUS_PLATFORM_COLLISION_TOP_TRIM = 12
const BONUS_STORAGE_KEY = 'word.lesson0BonusCollected'
const FLYING_WORD_COUNT = 22
//
// Life deduction trap (mirrors touch level 0)
//
const LIFE_DEDUCT_THRESHOLD = 5
const LIFE_DEDUCT_FLAG = 'word.lesson0LifeDeduction'
//
// Visited flag: set on the FIRST entry when conditions are met so the hero
// gets one free attempt before the dialog fires on the SECOND entry.
//
const LIFE_DEDUCT_VISITED_FLAG = 'word.lesson0TrapVisited'
//
// Crimson section color for life-deduction dialog text
//
const WORD_TEXT_COLOR_R = 220
const WORD_TEXT_COLOR_G = 20
const WORD_TEXT_COLOR_B = 60
//
// Platform color (top/bottom strips visible at canvas edges): matches
// the pfColor used by initScene's applyCanvasBackdrop (#323242).
//
const WORD_L0_BACKDROP_R = 50
const WORD_L0_BACKDROP_G = 50
const WORD_L0_BACKDROP_B = 66
//
// Hover tooltip copy — first thought then cycling insecurity phrases
//
const WORD_ANTIHERO_TOOLTIP_TEXT = 'Get yourself together -\nrag and come here )'
const WORD_BLADE_TOOLTIP_TEXT = 'Touch me and I\'ll give\nyou a couple of fragments'
const ANTIHERO_TOOLTIP_HOVER_SIZE = 80
const ANTIHERO_TOOLTIP_Y_OFFSET = -60
const BLADE_TOOLTIP_WIDTH = 100
const BLADE_TOOLTIP_HEIGHT = 60
const BLADE_TOOLTIP_Y_OFFSET = -70
const FLYING_WORD_TOOLTIP_WIDTH = 72
const FLYING_WORD_TOOLTIP_HEIGHT = 28
const FLYING_WORD_TOOLTIP_Y_OFFSET = -36
//
// Extra vertical offset to lower buy help / goal buttons below default position
//
const HELP_Y_EXTRA_OFFSET = 18
//
// Blades2 chase trap bounds and proximity rattle
//
const BLADES2_PLAY_MARGIN = 48
const BLADE_PROXIMITY_RANGE = 120
const BLADE_RATTLE_COOLDOWN = 0.35
//
// Funny hover lines for flying words (fallback when word is unmapped)
//
const FLYING_WORD_TOOLTIP_FALLBACK = 'Just a thought passing through...'
const FLYING_WORD_TOOLTIPS = {
  pain: 'Ouch, that one stings',
  hurt: 'Emotional damage: confirmed',
  fear: 'Boo! …still here?',
  doubt: 'Are you sure about that?',
  lost: 'Have you tried turning yourself around?',
  dark: 'Mood: midnight forever',
  void: 'Staring contest with nothingness',
  empty: 'Like my inbox on Monday',
  cold: 'Brr — someone hug the hero',
  numb: 'Feelings.exe not responding',
  alone: 'Introvert simulator 3000',
  torn: 'Paper heart, scissors life',
  break: 'Please handle with care',
  cut: 'Words like blades, remember?',
  bleed: 'That metaphor got too real',
  scar: 'Character development, they said',
  wound: 'Still tender, be gentle',
  grief: 'Heavy backpack of feelings',
  cry: 'Hydration via tears, valid',
  fall: 'Gravity is undefeated',
  sink: 'Quicksand but emotional',
  drown: 'Too many thoughts, not enough air',
  fade: 'Ghosting yourself again?',
  die: 'Dramatic much?',
  end: 'Plot twist incoming',
  why: 'Philosophy speedrun any%',
  how: 'Instructions unclear',
  who: 'Identity crisis loading…',
  am: 'To be or not to be',
  I: 'Main character energy',
  '...': 'The silence is loud',
  no: 'Boundary setting: elite',
  never: 'Famous last words',
  'can\'t': 'Challenge accepted?',
  'won\'t': 'Stubborn and proud'
}


/**
 * Level 0 scene - Introduction level with blade obstacles
 * Three blade blocks: two static, one trap with appearing blades
 * @param {Object} k - Kaplay instance
 */
export function sceneLesson0(k) {
  k.scene("lesson-word.0", () => {
    //
    // Reset lifeScore when entering from a different section (word section starts fresh).
    // heroScore carries over from localStorage as accumulated across sections.
    //
    if (get('lastSection', null) !== 'word') {
      set('lifeScore', 0)
    }
    set('lastSection', 'word')
    //
    // Save progress immediately when entering this level
    //
    set('lastLesson', 'lesson-word.0')
    //
    // Initialize level with heroes
    const { sound, hero, antiHero, levelIndicator, fpsCounter, breathMusic } = initScene({
      k,
      levelName: 'lesson-word.0',
      levelNumber: 1,
      nextLevel: 'lesson-word.1',
      levelTitle: "words like blades",
      levelTitleColor: CFG.visual.colors.blades,
      subTitle: "some words are sharper than any blade...",
      subTitleColor: CFG.visual.colors.blades,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      helpY: k.height() - PLATFORM_BOTTOM_HEIGHT + LevelHelp.HELP_UNDER_PLAY_AREA_OFFSET + HELP_Y_EXTRA_OFFSET,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y,
      onAnnihilation: () => {
        breathMusic && breathMusic.stop && breathMusic.stop()
        const levelTime = FpsCounter.getLevelTime(fpsCounter)
        const speedBonusEarned = checkSpeedBonus(k, 'lesson-word.0', levelTime, levelIndicator)
        const currentScore = get('heroScore', 0)
        const pointsToAdd = speedBonusEarned ? 2 : 1
        const newScore = currentScore + pointsToAdd
        set('heroScore', newScore)
        levelIndicator && levelIndicator.updateHeroScore && levelIndicator.updateHeroScore(newScore)
        sound && Sound.playVictorySound(sound)
        playSpeedBonusEffects(k, levelIndicator)
        const transitionDelay = speedBonusEarned ? 2.8 : 1.8
        k.wait(transitionDelay, () => {
          createLevelTransition(k, 'lesson-word.0')
        })
      }
    })
    //
    // Life deduction: hero gets one free attempt before the dialog fires.
    // First entry with eligible score: mark as visited, no dialog.
    // Second entry: show dialog at level start (original behavior).
    //
    const currentLifeScore = get('lifeScore', 0)
    const lifeTrapAlreadyShown = get(LIFE_DEDUCT_FLAG, false)
    const alreadyVisited = get(LIFE_DEDUCT_VISITED_FLAG, false)
    const eligible = !lifeTrapAlreadyShown && currentLifeScore >= LIFE_DEDUCT_THRESHOLD
    let showLifeTrap = false
    if (eligible && !alreadyVisited) {
      set(LIFE_DEDUCT_VISITED_FLAG, true)
    } else if (eligible && alreadyVisited) {
      showLifeTrap = true
      set(LIFE_DEDUCT_VISITED_FLAG, false)
    }
    const trapCount = (showLifeTrap || lifeTrapAlreadyShown) ? 1 : 0
    levelIndicator.updateTrapCount(trapCount)
    const sceneLock = { locked: showLifeTrap }
    if (showLifeTrap) {
      hero.controlsDisabled = true
      sceneLock.heroInst = hero
      LifeDeduction.show({
        k,
        currentScore: currentLifeScore,
        levelIndicator,
        sound,
        deductFlag: LIFE_DEDUCT_FLAG,
        sceneLock,
        sceneBgRgb: { r: WORD_L0_BACKDROP_R, g: WORD_L0_BACKDROP_G, b: WORD_L0_BACKDROP_B },
        textColorRgb: { r: WORD_TEXT_COLOR_R, g: WORD_TEXT_COLOR_G, b: WORD_TEXT_COLOR_B }
      })
    }
    
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
      currentLevel: 'lesson-word.0',
      onDeath: () => showDeathMessage(k, hero, null, levelIndicator, sound),
      customBounds: platformBounds,
      wordCount: FLYING_WORD_COUNT,
      letterToWordRatio: CFG.visual.flyingWords.letterToWordRatio,
      killerLetterCount: 2  // Level 0: 2 killer letters
    })
    
    //
    // Update flying words animation
    //
    k.onUpdate(() => {
      FlyingWords.onUpdate(flyingWords)
    })
    WordKillerProximity.create({
      k,
      hero,
      killerLetters: flyingWords.killerLetters,
      sound
    })
    //
    // Calculate positions
    //
    const leftX = Math.min(HERO_SPAWN_X, ANTIHERO_SPAWN_X)
    const rightX = Math.max(HERO_SPAWN_X, ANTIHERO_SPAWN_X)
    const distance = rightX - leftX
    
    const platformY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT
    const bladeHeight = Blades.getBladeHeight(k)
    const bladeWidth = Blades.getBladeWidth(k)
    
    //
    // Three blade blocks at equal distances
    // Block 1: 0.20 distance (dangerous) - 2 letters A
    // Block 2: 0.40 distance (dangerous) - 2 letters A
    // Block 3: 0.70 distance (safe to pass - trap decoy) - 2 letters A
    //
    const blade1X = leftX + distance * 0.20
    const blade2X = leftX + distance * 0.40
    const blade3X = leftX + distance * 0.70
    
    //
    // Create first static blade block (2 blades)
    //
    const blades1 = Blades.create({
      k,
      x: blade1X,
      y: platformY - 8,  // Lower by 2px
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => showDeathMessage(k, hero, blades1, levelIndicator, sound),
      sfx: sound,
      bladeCount: 2,
      zIndex: CFG.visual.zIndex.platforms - 0.5  // Behind platform
    })
    Blades.show(blades1)  // Show permanently
    
    //
    // Create second static blade block (2 blades)
    //
    const blades2 = Blades.create({
      k,
      x: blade2X,
      y: platformY - 8,  // Lower by 2px
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => showDeathMessage(k, hero, blades2, levelIndicator, sound),
      sfx: sound,
      bladeCount: 2,
      zIndex: CFG.visual.zIndex.platforms - 0.5  // Behind platform
    })
    Blades.show(blades2)  // Show permanently
    
    //
    // Create third blade block (trap - safe to pass)
    // This block is safe to pass through (no collision)
    //
    const blades3 = Blades.create({
      k,
      x: blade3X,
      y: platformY - 8,  // Lower by 2px
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: null,  // No collision - safe to pass
      sfx: sound,
      bladeCount: 2,
      zIndex: CFG.visual.zIndex.platforms - 0.5  // Behind platform
    })
    Blades.show(blades3)  // Show permanently
    //
    // Set z-index higher than hero to show in front
    //
    blades3.blade.z = CFG.visual.zIndex.player + 1
    const proxBlades = [blades1, blades2, blades3]
    
    const bonusHeroInst = BonusHero.create({
      k,
      x: BONUS_PLATFORM_X,
      y: BONUS_PLATFORM_Y,
      width: BONUS_PLATFORM_WIDTH,
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
    //
    // Floor AAA cannot hurt the hero while he stands on the elevated bonus block
    //
    blades2.onHit = () => {
      if (BonusHero.isHeroStandingOn(bonusHeroInst, hero)) return
      showDeathMessage(k, hero, blades2, levelIndicator, sound)
    }
    setupWordLevel0HoverTooltips(k, {
      levelIndicator,
      fpsCounter,
      hero,
      antiHero,
      blades1,
      blades2,
      blades3,
      flyingWords,
      platformBounds
    })
    WordBlades2ChaseTrap.create({
      k,
      hero,
      bladesInst: blades2,
      deductFlag: LIFE_DEDUCT_FLAG,
      minX: PLATFORM_SIDE_WIDTH + BLADES2_PLAY_MARGIN,
      maxX: CFG.visual.screen.width - PLATFORM_SIDE_WIDTH - BLADES2_PLAY_MARGIN,
      bonusHeroInst,
      onHit: () => showDeathMessage(k, hero, blades2, levelIndicator, sound)
    })
    WordBladeProximity.create({
      k,
      hero,
      bladeInsts: proxBlades,
      sound,
      proximityRange: BLADE_PROXIMITY_RANGE,
      rattleCooldown: BLADE_RATTLE_COOLDOWN
    })
    
    //
    // Trap blades that appear when hero gets close to blade3
    //
    const trapDistance = 20  // Distance to trigger trap (very close)
    const gapWidth = -4  // Overlap with blade3
    const trapBladeX = blade3X + bladeWidth / 2 + gapWidth + bladeWidth / 2  // Position overlapping
    
    let trapBlades = null
    let trapTriggered = false
    
    //
    // Check distance to trigger trap
    // Calculate distance to the right edge of blade3 (where trap will appear)
    //
    k.onUpdate(() => {
      if (trapTriggered) return
      
      const blade3RightEdge = blade3X + bladeWidth / 2
      const distanceToTrap = Math.abs(hero.character.pos.x - blade3RightEdge)
      
      if (distanceToTrap < trapDistance) {
        trapTriggered = true
        
        //
        // Create trap blades that appear suddenly
        //
        trapBlades = Blades.create({
          k,
          x: trapBladeX,
          y: platformY - 8,  // Lower by 2px
          hero,
          orientation: Blades.ORIENTATIONS.FLOOR,
          onHit: () => showDeathMessage(k, hero, trapBlades, levelIndicator, sound),
          sfx: sound,
          bladeCount: 2,
          zIndex: CFG.visual.zIndex.platforms - 0.5  // Behind platform
        })
        
        //
        // Start animation immediately
        //
        Blades.startAnimation(trapBlades)
        proxBlades.push(trapBlades)
      }
    })
  })
}

/**
 * Shows a random death message and then restarts the level.
 * On the very first death when the life-deduction trap is pending (grace period),
 * shows the deduction dialog instead and restarts afterward.
 * @param {Object} k - Kaplay instance
 * @param {Object} hero - Hero instance
 * @param {Object} bladesInst - Blades instance that was hit
 * @param {Object} [levelIndicator] - Level indicator for life score update
 * @param {Object} [sound] - Sound instance for effects
 */
function showDeathMessage(k, hero, bladesInst, levelIndicator = null, sound = null) {
  //
  // While the buy-help panel is open the hero is invulnerable — ignore the hit
  //
  if (LevelHelp.isAnyPanelOpen() || LifeDeduction.isActive()) return
  //
  // Increment life score and update display
  //
  const currentLifeScore = get('lifeScore', 0)
  const newLifeScore = currentLifeScore + 1
  set('lifeScore', newLifeScore)
  levelIndicator && levelIndicator.updateLifeScore && levelIndicator.updateLifeScore(newLifeScore)
  playLifeDeathEffects(k, levelIndicator)
  Sound.playLifeSound(k)
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
      k.go("lesson-word.0")
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
        k.go("lesson-word.0")
      }
    }
  })
}

//
// Registers hover tooltips for WORDS HUD, heroes, blades, and flying words
//
function setupWordLevel0HoverTooltips(k, ctx) {
  const { levelIndicator, fpsCounter, hero, antiHero, blades1, blades2, blades3, flyingWords, platformBounds } = ctx
  const inPlayArea = (x, y) =>
    x >= platformBounds.left && x <= platformBounds.right &&
    y >= platformBounds.top && y <= platformBounds.bottom
  WordHudTooltips.setupStandardHudTooltips(k, {
    levelIndicator,
    fpsCounter,
    topPlatformHeight: PLATFORM_TOP_HEIGHT
  })
  WordHudTooltips.setupHeroInsecurityTooltip(k, hero)
  Tooltip.create({
    k,
    targets: [{
      x: () => antiHero.character.pos.x,
      y: () => antiHero.character.pos.y,
      width: ANTIHERO_TOOLTIP_HOVER_SIZE,
      height: ANTIHERO_TOOLTIP_HOVER_SIZE,
      text: WORD_ANTIHERO_TOOLTIP_TEXT,
      offsetY: ANTIHERO_TOOLTIP_Y_OFFSET
    }]
  })
  ;[blades1, blades2, blades3].forEach(bladeInst => {
    Tooltip.create({
      k,
      targets: [{
        x: () => bladeInst.blade.pos.x,
        y: () => bladeInst.blade.pos.y,
        width: BLADE_TOOLTIP_WIDTH,
        height: BLADE_TOOLTIP_HEIGHT,
        text: WORD_BLADE_TOOLTIP_TEXT,
        offsetY: BLADE_TOOLTIP_Y_OFFSET
      }]
    })
  })
  const wordTargets = flyingWords.words
    .filter(word => !word.isLetter)
    .map(word => ({
      x: () => word.x,
      y: () => word.y,
      width: FLYING_WORD_TOOLTIP_WIDTH,
      height: FLYING_WORD_TOOLTIP_HEIGHT,
      text: () => getFlyingWordTooltip(word.text),
      offsetY: FLYING_WORD_TOOLTIP_Y_OFFSET,
      visible: () => inPlayArea(word.x, word.y)
    }))
  wordTargets.length && Tooltip.create({ k, targets: wordTargets })
}

//
// Resolves a funny hover line for a flying word
//
function getFlyingWordTooltip(wordText) {
  const key = String(wordText || '').toLowerCase()
  return FLYING_WORD_TOOLTIPS[key] || FLYING_WORD_TOOLTIP_FALLBACK
}

