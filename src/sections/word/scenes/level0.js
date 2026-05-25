import { CFG } from '../cfg.js'
import { initScene, checkSpeedBonus, playLifeDeathEffects, playSpeedBonusEffects } from '../utils/scene.js'
import * as Blades from '../components/blades.js'
import * as Hero from '../../../components/hero.js'
import * as FlyingWords from '../components/flying-words.js'
import * as WordPile from '../components/word-pile.js'
import * as WordGrass from '../components/word-grass.js'
import * as BonusHero from '../../touch/components/bonus-hero.js'
import * as WordHudTooltips from '../utils/word-hud-tooltips.js'
import * as LifeDeduction from '../../touch/utils/life-deduction.js'
import * as Tooltip from '../../../utils/tooltip.js'
import { get, set } from '../../../utils/progress.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as Sound from '../../../utils/sound.js'
import { createLevelTransition } from '../../../utils/transition.js'

//
// Death messages (shown randomly on death)
//
const DEATH_MESSAGES = [
  "Cut again.",
  "Words hurt. Remember?",
  "Too sharp for you?",
  "It stings, doesn't it?",
  "Still bleeding?",
  "You let it cut you.",
  "That one went deep."
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
const BONUS_PLATFORM_COLLISION_WIDTH = 128
const BONUS_PLATFORM_REVEAL_WIDTH = 160
const BONUS_STORAGE_KEY = 'word.level0BonusCollected'
//
// Life deduction trap (mirrors touch level 0)
//
const LIFE_DEDUCT_THRESHOLD = 10
const LIFE_DEDUCT_FLAG = 'word.level0LifeDeduction'
const WORD_L0_PLAYFIELD_BG_R = 62
const WORD_L0_PLAYFIELD_BG_G = 62
const WORD_L0_PLAYFIELD_BG_B = 62
//
// Hover tooltip copy
//
const WORD_HERO_TOOLTIP_TEXT = "I'm calmnnnnn....."
const WORD_ANTIHERO_TOOLTIP_TEXT = 'get yourself together -\nrag and come here )'
const WORD_BLADE_TOOLTIP_TEXT = 'touch me and I\'ll give\nyou a couple of fragments'
const HERO_TOOLTIP_HOVER_SIZE = 80
const HERO_TOOLTIP_Y_OFFSET = -100
const ANTIHERO_TOOLTIP_HOVER_SIZE = 80
const ANTIHERO_TOOLTIP_Y_OFFSET = -60
const BLADE_TOOLTIP_WIDTH = 100
const BLADE_TOOLTIP_HEIGHT = 60
const BLADE_TOOLTIP_Y_OFFSET = -70
const FLYING_WORD_TOOLTIP_WIDTH = 72
const FLYING_WORD_TOOLTIP_HEIGHT = 28
const FLYING_WORD_TOOLTIP_Y_OFFSET = -36
//
// Blades rush trap and proximity rattle
//
const BLADES2_RUSH_APPROACH = 280
const BLADES2_RUSH_SPEED = 820
const BLADE_PROXIMITY_RANGE = 120
const BLADE_RATTLE_COOLDOWN = 0.35
//
// Funny hover lines for flying words (fallback when word is unmapped)
//
const FLYING_WORD_TOOLTIP_FALLBACK = 'just a thought passing through...'
const FLYING_WORD_TOOLTIPS = {
  pain: 'ouch, that one stings',
  hurt: 'emotional damage: confirmed',
  fear: 'boo! …still here?',
  doubt: 'are you sure about that?',
  lost: 'have you tried turning yourself around?',
  dark: 'mood: midnight forever',
  void: 'staring contest with nothingness',
  empty: 'like my inbox on monday',
  cold: 'brr — someone hug the hero',
  numb: 'feelings.exe not responding',
  alone: 'introvert simulator 3000',
  torn: 'paper heart, scissors life',
  break: 'please handle with care',
  cut: 'words like blades, remember?',
  bleed: 'that metaphor got too real',
  scar: 'character development, they said',
  wound: 'still tender, be gentle',
  grief: 'heavy backpack of feelings',
  cry: 'hydration via tears, valid',
  fall: 'gravity is undefeated',
  sink: 'quicksand but emotional',
  drown: 'too many thoughts, not enough air',
  fade: 'ghosting yourself again?',
  die: 'dramatic much?',
  end: 'plot twist incoming',
  why: 'philosophy speedrun any%',
  how: 'instructions unclear',
  who: 'identity crisis loading…',
  am: 'to be or not to be',
  I: 'main character energy',
  '...': 'the silence is loud',
  no: 'boundary setting: elite',
  never: 'famous last words',
  'can\'t': 'challenge accepted?',
  'won\'t': 'stubborn and proud'
}


/**
 * Level 0 scene - Introduction level with blade obstacles
 * Three blade blocks: two static, one trap with appearing blades
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel0(k) {
  k.scene("level-word.0", () => {
    //
    // Reset scores when entering from a different section.
    // Uses lastSection key (not lastLevel) so the check survives section-complete pre-routing.
    //
    if (get('lastSection', null) !== 'word') {
      set('heroScore', 0)
      set('lifeScore', 0)
    }
    set('lastSection', 'word')
    //
    // Save progress immediately when entering this level
    //
    set('lastLevel', 'level-word.0')
    //
    // Initialize level with heroes
    const { sound, hero, antiHero, levelIndicator, fpsCounter, breathMusic } = initScene({
      k,
      levelName: 'level-word.0',
      levelNumber: 1,
      nextLevel: 'level-word.1',
      levelTitle: "words like blades",
      levelTitleColor: CFG.visual.colors.blades,
      subTitle: "some words are sharper than any blade...",
      subTitleColor: CFG.visual.colors.blades,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y,
      onAnnihilation: () => {
        breathMusic && breathMusic.stop && breathMusic.stop()
        const levelTime = FpsCounter.getLevelTime(fpsCounter)
        const speedBonusEarned = checkSpeedBonus(k, 'level-word.0', levelTime, levelIndicator)
        const currentScore = get('heroScore', 0)
        const pointsToAdd = speedBonusEarned ? 2 : 1
        const newScore = currentScore + pointsToAdd
        set('heroScore', newScore)
        levelIndicator && levelIndicator.updateHeroScore && levelIndicator.updateHeroScore(newScore)
        sound && Sound.playVictorySound(sound)
        playSpeedBonusEffects(k, levelIndicator)
        const transitionDelay = speedBonusEarned ? 2.8 : 1.8
        k.wait(transitionDelay, () => {
          createLevelTransition(k, 'level-word.0')
        })
      }
    })
    //
    // Life deduction intro when life score is high enough (once per save)
    //
    const currentLifeScore = get('lifeScore', 0)
    const lifeTrapAlreadyShown = get(LIFE_DEDUCT_FLAG, false)
    const showLifeTrap = !lifeTrapAlreadyShown && currentLifeScore >= LIFE_DEDUCT_THRESHOLD
    const sceneLock = { locked: showLifeTrap }
    showLifeTrap && (hero.controlsDisabled = true) && (sceneLock.heroInst = hero)
    showLifeTrap && LifeDeduction.show({
      k,
      currentScore: currentLifeScore,
      levelIndicator,
      sound,
      deductFlag: LIFE_DEDUCT_FLAG,
      sceneLock,
      sceneBgRgb: { r: WORD_L0_PLAYFIELD_BG_R, g: WORD_L0_PLAYFIELD_BG_G, b: WORD_L0_PLAYFIELD_BG_B }
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
    // Create word pile for depth atmosphere effect
    // Multiple layers of static words at different depths creating "word dump" feeling
    //
    const wordPile = WordPile.create({
      k,
      customBounds: platformBounds
    })
    
    //
    // Create flying words for atmosphere
    //
    const flyingWords = FlyingWords.create({
      k,
      hero,
      currentLevel: 'level-word.0',
      onDeath: () => showDeathMessage(k, hero, null, levelIndicator, sound),
      color: '#B0B0B0',  // Light gray for ghostly/ethereal flying words
      customBounds: platformBounds,
      letterToWordRatio: CFG.visual.flyingWords.letterToWordRatio,
      killerLetterCount: 1  // Level 0: 1 killer letter
    })
    
    //
    // Update flying words animation
    //
    k.onUpdate(() => {
      FlyingWords.onUpdate(flyingWords)
    })
    //
    // Calculate positions
    //
    const leftX = Math.min(HERO_SPAWN_X, ANTIHERO_SPAWN_X)
    const rightX = Math.max(HERO_SPAWN_X, ANTIHERO_SPAWN_X)
    const distance = rightX - leftX
    
    const platformY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT
    const bladeHeight = Blades.getBladeHeight(k)
    
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
    const blades2RushState = { triggered: false, active: false }
    const bladeProximityState = { cooldown: 0 }
    
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
    
    //
    // Create word grass and trees for additional atmosphere
    // Pass blade positions so grass doesn't spawn near them
    //
    const bladePositions = [blade1X, blade2X, blade3X]
    const wordGrass = WordGrass.create({
      k,
      customBounds: platformBounds,
      hero,
      bladePositions,
      movingPlatformPositions: []  // No moving platforms on level 0
    })
    
    //
    // Update word grass animation
    //
    k.onUpdate(() => {
      WordGrass.onUpdate(wordGrass)
    })
    BonusHero.create({
      k,
      x: BONUS_PLATFORM_X,
      y: BONUS_PLATFORM_Y,
      width: BONUS_PLATFORM_WIDTH,
      collisionWidth: BONUS_PLATFORM_COLLISION_WIDTH,
      heroInst: hero,
      levelIndicator,
      sfx: sound,
      approachFromAbove: true,
      platformText: 'platform',
      revealWidth: BONUS_PLATFORM_REVEAL_WIDTH,
      storageKey: BONUS_STORAGE_KEY
    })
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
    if (showLifeTrap || lifeTrapAlreadyShown) {
      k.onUpdate(() => onUpdateBlades2Rush(k, blades2, hero, blades2RushState, blade2X))
    }
    k.onUpdate(() => onUpdateBladeProximity(k, hero, [blades1, blades2, blades3], sound, bladeProximityState))
    
    //
    // Trap blades that appear when hero gets close to blade3
    //
    const trapDistance = 20  // Distance to trigger trap (very close)
    const bladeWidth = Blades.getBladeWidth(k)
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
      }
    })
  })
}

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
  const messageText = k.add([
    k.text(message, {
      size: 28,
      align: "center",
      font: CFG.visual.fonts.regularFull.replace(/'/g, '')
    }),
    k.pos(centerX, messageY),
    k.anchor("center"),
    k.color(107, 142, 159),  // Blade color (steel blue)
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 10)
  ])
  
  //
  // Animation state
  //
  const inst = {
    k,
    messageText,
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
      k.destroy(messageText)
      //
      // Restart level
      //
      k.go("level-word.0")
      return
    }
    
    if (inst.phase === 'fade_in') {
      //
      // Fade in message
      //
      const progress = Math.min(1, inst.timer / CFG.visual.deathMessage.fadeDuration)
      messageText.opacity = progress
      
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
      messageText.opacity = 1 - progress
      
      if (progress >= 1) {
        //
        // Clean up and restart level
        //
        updateInterval.cancel()
        skipHandlers.forEach(h => h.cancel())
        k.destroy(messageText)
        k.go("level-word.0")
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
  Tooltip.create({
    k,
    targets: [{
      x: () => hero.character.pos.x,
      y: () => hero.character.pos.y,
      width: HERO_TOOLTIP_HOVER_SIZE,
      height: HERO_TOOLTIP_HOVER_SIZE,
      text: WORD_HERO_TOOLTIP_TEXT,
      offsetY: HERO_TOOLTIP_Y_OFFSET
    }]
  })
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
      x: () => word.textObj.pos.x,
      y: () => word.textObj.pos.y,
      width: FLYING_WORD_TOOLTIP_WIDTH,
      height: FLYING_WORD_TOOLTIP_HEIGHT,
      text: () => getFlyingWordTooltip(word.textObj.text),
      offsetY: FLYING_WORD_TOOLTIP_Y_OFFSET,
      visible: () => inPlayArea(word.textObj.pos.x, word.textObj.pos.y)
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

//
// Rushes the second blade block horizontally when the hero approaches
//
function onUpdateBlades2Rush(k, bladesInst, heroInst, state, bladeStartX) {
  if (state.done || !heroInst?.character?.pos || !bladesInst?.blade?.exists?.()) return
  const heroX = heroInst.character.pos.x
  const bladeX = bladesInst.baseX
  if (!state.triggered && heroX > bladeStartX - BLADES2_RUSH_APPROACH && heroX < bladeStartX + 120) {
    state.triggered = true
    state.active = true
    bladesInst.isRushing = true
  }
  if (!state.active) return
  const dir = heroX >= bladeX ? 1 : -1
  bladesInst.baseX += dir * BLADES2_RUSH_SPEED * k.dt()
  bladesInst.blade.pos.x = bladesInst.baseX
  Math.abs(heroX - bladesInst.baseX) < 40 && (state.done = true)
}

//
// Plays metallic rattle when the hero is near blade letters
//
function onUpdateBladeProximity(k, heroInst, bladeInsts, sound, state) {
  if (!heroInst?.character?.pos || !sound) return
  state.cooldown -= k.dt()
  if (state.cooldown > 0) return
  const heroX = heroInst.character.pos.x
  const heroY = heroInst.character.pos.y
  let closest = BLADE_PROXIMITY_RANGE
  bladeInsts.forEach(bladeInst => {
    if (!bladeInst?.blade?.exists?.()) return
    const dx = heroX - bladeInst.blade.pos.x
    const dy = heroY - bladeInst.blade.pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    dist < closest && (closest = dist)
  })
  if (closest >= BLADE_PROXIMITY_RANGE) return
  const proximity = 1 - closest / BLADE_PROXIMITY_RANGE
  Sound.playBladeProximityRattle(sound, proximity)
  state.cooldown = BLADE_RATTLE_COOLDOWN
}

