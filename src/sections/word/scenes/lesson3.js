import { CFG } from '../cfg.js'
import { initScene, checkSpeedBonus, playLifeDeathEffects, playSpeedBonusEffects, createRoundedCorners, createOutlinedDeathMessage } from '../utils/scene.js'
import { getColor } from '../../../utils/helper.js'
import * as WordPitFill from '../utils/word-pit-fill.js'
import * as Sound from '../../../utils/sound.js'
import * as Blades from '../components/blades.js'
import * as Hero from '../../../components/hero.js'
import * as FlyingWords from '../components/flying-words.js'
import * as LifeDeduction from '../../touch/utils/life-deduction.js'
import * as LevelHelp from '../../../utils/level-help.js'
import { set, get } from '../../../utils/progress.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as WordBladeProximity from '../utils/word-blade-proximity.js'
import * as WordKillerProximity from '../utils/word-killer-proximity.js'
import * as WordHudTooltips from '../utils/word-hud-tooltips.js'
import { createLevelTransition } from '../../../utils/transition.js'

//
// Platform dimensions (in pixels, for 1920x1080 resolution)
// Level 3 has narrower playable area (exactly hero jump height)
//
const PLATFORM_TOP_HEIGHT = 475      // Top platform height (44% of 1080)
const PLATFORM_BOTTOM_HEIGHT = 475   // Bottom platform height (44% of 1080)
const PLATFORM_SIDE_WIDTH = 192      // Side walls width (10% of 1920)
//
// Vertical positions for text below the playfield (inside the bottom platform).
// HELP_Y: "buy help" label sits lower so it never overlaps the death message.
// DEATH_MESSAGE_Y: post-death phrase is placed well below the help label.
//
const HELP_Y_OFFSET = 200            // Pixels below playfield floor for buy-help label
const DEATH_MESSAGE_Y_OFFSET = 360   // Pixels below playfield floor for death message
//
// Pixels of fade transition as a blade crosses the platform boundary.
// Zero means blades pop in/out instantly at the boundary line.
//
const BLADE_EMERGE_PX = 30

//
// Hero spawn positions (in pixels)
//
const HERO_SPAWN_X = 380    // 20% of 1920 (shifted right for better level start)
//
// Spawn Y is set so the hero's foot lands 22 px inside the platform — identical to
// level0's (heroCenter + COLLISION_HEIGHT/2 + COLLISION_OFFSET_Y > floorY) formula.
// Kaplay resolves the overlap in a single frame (instant snap), avoiding the visible
// multi-frame drop that happens when the hero is spawned slightly above the surface.
// Formula: floorY (1080-475=605) + 22 - (COLLISION_HEIGHT/2 + COLLISION_OFFSET_Y=37.5) ≈ 590
//
const HERO_SPAWN_Y = 590
const ANTIHERO_SPAWN_X = 1690  // 88% of 1920
const ANTIHERO_SPAWN_Y = 590
//
// Keep word count matching level 0 for consistent performance across all word levels
//
const FLYING_WORD_COUNT = 22
//
// Life deduction trap: shown once when lifeScore exceeds the threshold.
// After the dialog the blade animation runs at double speed.
//
const LIFE_DEDUCT_THRESHOLD = 5
const LIFE_DEDUCT_FLAG = 'word.level3LifeDeduction'
//
// Visited flag: set on the FIRST entry when conditions are met so the hero
// gets one free attempt before the dialog fires on the SECOND entry.
//
const LIFE_DEDUCT_VISITED_FLAG = 'word.level3TrapVisited'
//
// Canvas backdrop RGB matching word section platform color (#2A2A38 = 42, 42, 56)
//
const WORD_L3_BACKDROP_R = 42
const WORD_L3_BACKDROP_G = 42
const WORD_L3_BACKDROP_B = 56
//
// Crimson section color for life-deduction dialog text
//
const WORD_TEXT_COLOR_R = 220
const WORD_TEXT_COLOR_G = 20
const WORD_TEXT_COLOR_B = 60
//
// Blade animation speed multiplier applied after life deduction fires
//
const BLADE_SPEED_BOOST_FACTOR = 2

//
// Death messages
//
const DEATH_MESSAGES = [
  "Can't stop the thoughts?",
  "Some words bite",
  "Greetings from intrusive thoughts!",
  "We never sleep \u00a9 Your thoughts",
  "You can't hide from us",
  "Peace is just a dream for us",
  "Relax and we'll eat you up!"
]

/**
 * Shows a random death message and then restarts the level
 * @param {Object} k - Kaplay instance
 * @param {Object} hero - Hero instance
 * @param {Object} bladesInst - Blades instance that was hit
 */
function showDeathMessage(k, hero, bladesInst, levelIndicator = null, sound = null) {
  //
  // While the buy-help panel is open the hero is invulnerable — ignore the hit
  //
  if (LevelHelp.isAnyPanelOpen() || LifeDeduction.isActive()) return
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
  const messageY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT + DEATH_MESSAGE_Y_OFFSET
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
    // Phase 1: Fade in (0.5s)
    //
    if (inst.phase === 'fade_in') {
      const fadeInDuration = 0.5
      const progress = Math.min(inst.timer / fadeInDuration, 1)
      inst.deathMsg.setOpacity(progress)
      
      if (progress >= 1) {
        inst.phase = 'display'
        inst.timer = 0
      }
    }
    //
    // Phase 2: Display (2.5s)
    //
    else if (inst.phase === 'display') {
      const displayDuration = 2.5
      
      if (inst.skipRequested || inst.timer >= displayDuration) {
        inst.phase = 'fade_out'
        inst.timer = 0
      }
    }
    //
    // Phase 3: Fade out (0.5s)
    //
    else if (inst.phase === 'fade_out') {
      const fadeOutDuration = 0.5
      const progress = Math.min(inst.timer / fadeOutDuration, 1)
      inst.deathMsg.setOpacity(1 - progress)
      
      if (progress >= 1) {
        //
        // Cleanup
        //
        inst.deathMsg.destroy()
        updateInterval.cancel()
        skipHandlers.forEach(handler => handler.cancel())
        //
        // Restart level
        //
        k.go('level-word.3')
      }
    }
  })
}

export function sceneLevel3(k) {
  k.scene("level-word.3", () => {
    //
    // Save progress immediately when entering this level
    //
    set('lastLevel', 'level-word.3')
    //
    // Track level completion to stop blade animation and sounds
    //
    // Pit gap for blood puddles and grass — same width as blade block
    //
    const pitWidth = Blades.getBladeWidth(k)
    const pitCenterX = CFG.visual.screen.width / 2
    const levelPitGap = { x: pitCenterX - pitWidth / 2, width: pitWidth }
    //
    // Initialize level with heroes (skip standard platforms)
    //
    let levelCompleted = false
    const { sound, hero, antiHero, levelIndicator, fpsCounter, breathMusic, platformColor, playfieldColor } = initScene({
      k,
      levelName: 'level-word.3',
      levelNumber: 4,
      nextLevel: 'level-word.4',
      skipPlatforms: true,
      platformGap: levelPitGap,
      levelTitle: "words like blades",
      levelTitleColor: CFG.visual.colors.blades,
      subTitle: "words are blades that leave invisible wounds",
      subTitleColor: CFG.visual.colors.blades,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      helpY: CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT + HELP_Y_OFFSET,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y,
      onAnnihilation: () => {
        levelCompleted = true
        breathMusic && breathMusic.stop && breathMusic.stop()
        Sound.fadeOutAllMusic()
        const levelTime = FpsCounter.getLevelTime(fpsCounter)
        const speedBonusEarned = checkSpeedBonus(k, 'level-word.3', levelTime, levelIndicator)
        const currentScore = get('heroScore', 0)
        const pointsToAdd = speedBonusEarned ? 2 : 1
        const newScore = currentScore + pointsToAdd
        set('heroScore', newScore)
        levelIndicator && levelIndicator.updateHeroScore && levelIndicator.updateHeroScore(newScore)
        sound && Sound.playVictorySound(sound)
        speedBonusEarned && playSpeedBonusEffects(k, levelIndicator)
        const transitionDelay = speedBonusEarned ? 2.8 : 1.8
        k.wait(transitionDelay, () => {
          createLevelTransition(k, 'level-word.3')
        })
      }
    })
    
    // Create custom platforms with pit in the middle
    const pitInfo = createCustomPlatforms(k, platformColor)
    //
    // Add rounded corners matching level 3's platform dimensions
    //
    createRoundedCorners(k, platformColor, {
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT
    })
    
    //
    // Create flying words for atmosphere (constrained to narrow pit area between walls)
    //
    const flyingWords = FlyingWords.create({
      k,
      hero,
      currentLevel: 'level-word.3',
      onDeath: () => showDeathMessage(k, hero, null, levelIndicator, sound),
      customBounds: {
        left: PLATFORM_SIDE_WIDTH + 20,
        right: CFG.visual.screen.width - PLATFORM_SIDE_WIDTH - 20,
        top: PLATFORM_TOP_HEIGHT,
        bottom: CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT
      },
      wordCount: FLYING_WORD_COUNT,
      letterToWordRatio: CFG.visual.flyingWords.letterToWordRatio,
      killerLetterCount: 6  // Level 3: 6 killer letters
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
    // Create bottom of the pit (platform at pit depth)
    //
    const heroHeight = CFG.visual.screen.height * 0.08  // Approximate hero height (8% of screen)
    const pitDepth = heroHeight * 1.3  // Pit depth slightly more than hero height
    const pitBottomY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT + pitDepth
    const platformY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT
    //
    // Pit shaft fill at a Z below the roots (wordPlayfieldFill + 0.3) so the
    // playfield-purple color shows in the pit while brain roots are still visible
    // on top of it, extending visually into the shaft.
    //
    WordPitFill.addPitShaftFill(k, {
      x: pitInfo.centerX - pitInfo.width / 2,
      width: pitInfo.width,
      topY: platformY,
      bottomY: pitBottomY,
      playfieldColor,
      zIndex: CFG.visual.zIndex.wordPlayfieldFill + 0.3
    })
    //
    // Solid platform floor below the blades (stops the hero from falling through)
    //
    WordPitFill.addPitShaftFill(k, {
      x: pitInfo.centerX - pitInfo.width / 2,
      width: pitInfo.width,
      topY: pitBottomY,
      bottomY: k.height(),
      playfieldColor: platformColor,
      solidPlatform: true
    })
    
    // Create blades at the bottom of the pit (pointing up)
    const bladeHeight = Blades.getBladeHeight(k)
    const bladeWidth = Blades.getBladeWidth(k)
    const pitBlades = Blades.create({
      k,
      x: pitInfo.centerX,
      y: pitBottomY - bladeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => LevelHelp.isAnyPanelOpen() || LifeDeduction.isActive() || Blades.handleCollision(pitBlades, "level-word.3"),
      sfx: sound
    })
    pitBlades.blade.opacity = 1
    
    // Create 3 blades (left floor, center ceiling, right floor)
    const floorBladeY = Blades.getFloorBladeRestCenterY(platformY)
    const ceilingBladeY = PLATFORM_TOP_HEIGHT + bladeHeight * 1.2  // Extend down from ceiling
    
    //
    // Animated blades start hidden (opacity 0) inside the platforms.
    // Their opacity is driven by the animation state in updateBladesAnimation so
    // they fade in as they enter the playfield and fade out as they retract.
    //
    const leftBladeX = pitInfo.centerX - pitInfo.width / 2 - bladeWidth * 2.5
    const hiddenY1 = platformY + bladeHeight * 2  // Hidden deep below platform
    const blades1 = Blades.create({
      k,
      x: leftBladeX,
      y: hiddenY1,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => showDeathMessage(k, hero, blades1, levelIndicator, sound),
      sfx: sound,
      disableAnimation: true
    })
    blades1.blade.opacity = 0
    //
    // Center blade (ceiling, over pit, pointing down) — hidden above top platform
    //
    const hiddenY2 = PLATFORM_TOP_HEIGHT - bladeHeight * 2
    const blades2 = Blades.create({
      k,
      x: pitInfo.centerX,
      y: hiddenY2,
      hero,
      orientation: Blades.ORIENTATIONS.CEILING,
      onHit: () => showDeathMessage(k, hero, blades2, levelIndicator, sound),
      sfx: sound,
      disableAnimation: true
    })
    blades2.blade.opacity = 0
    //
    // Right blade (floor) — hidden below bottom platform, right of pit
    //
    const rightBladeX = pitInfo.centerX + pitInfo.width / 2 + bladeWidth * 1.5
    const hiddenY3 = platformY + bladeHeight * 2  // Hidden deep below platform
    const blades3 = Blades.create({
      k,
      x: rightBladeX,
      y: hiddenY3,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => showDeathMessage(k, hero, blades3, levelIndicator, sound),
      sfx: sound,
      disableAnimation: true
    })
    blades3.blade.opacity = 0
    
    //
    // Scene instance with state
    //
    const inst = {
      k,
      sound,
      blades1,
      blades2,
      blades3,
      targetY1: hiddenY1,
      visibleY1: floorBladeY,
      targetY2: hiddenY2,
      visibleY2: ceilingBladeY,
      targetY3: hiddenY3,
      visibleY3: floorBladeY,
      blade1State: 'waiting',
      blade2State: 'waiting',
      blade3State: 'waiting',
      animationTimer: 0,
      cycleTimer: 0,
      animationSpeed: 0.15,
      bladeDelay: 0.12,
      cycleDelay: 0.12
    }
    //
    // Life deduction trap — fires once when life score reaches threshold.
    // After the dialog the blade animation runs at double speed.
    //
    const currentLifeScore = get('lifeScore', 0)
    const lifeTrapAlreadyShown = get(LIFE_DEDUCT_FLAG, false)
    //
    // Life deduction: hero gets one free attempt before the dialog fires.
    // First entry with eligible score: mark as visited, no dialog.
    // Second entry: show dialog at level start (original behavior).
    //
    const alreadyVisited = get(LIFE_DEDUCT_VISITED_FLAG, false)
    const eligible = !lifeTrapAlreadyShown && currentLifeScore > LIFE_DEDUCT_THRESHOLD
    let showLifeTrap = false
    if (eligible && !alreadyVisited) {
      set(LIFE_DEDUCT_VISITED_FLAG, true)
    } else if (eligible && alreadyVisited) {
      showLifeTrap = true
      set(LIFE_DEDUCT_VISITED_FLAG, false)
    }
    const trapCount = (showLifeTrap || lifeTrapAlreadyShown) ? 1 : 0
    levelIndicator.updateTrapCount(trapCount)
    //
    // If trap was already shown in a previous session, blades run fast immediately.
    // Also boost if dialog fires right now so speed increases after dialog closes.
    //
    if (lifeTrapAlreadyShown) {
      inst.animationSpeed /= BLADE_SPEED_BOOST_FACTOR
      inst.bladeDelay /= BLADE_SPEED_BOOST_FACTOR
      inst.cycleDelay /= BLADE_SPEED_BOOST_FACTOR
    }
    if (showLifeTrap) {
      const sceneLock = { locked: true }
      hero.controlsDisabled = true
      sceneLock.heroInst = hero
      LifeDeduction.show({
        k,
        currentScore: currentLifeScore,
        levelIndicator,
        sound,
        deductFlag: LIFE_DEDUCT_FLAG,
        sceneLock,
        sceneBgRgb: { r: WORD_L3_BACKDROP_R, g: WORD_L3_BACKDROP_G, b: WORD_L3_BACKDROP_B },
        textColorRgb: { r: WORD_TEXT_COLOR_R, g: WORD_TEXT_COLOR_G, b: WORD_TEXT_COLOR_B },
        onComplete: () => {
          //
          // Double blade speed to increase difficulty after the dialog
          //
          inst.animationSpeed /= BLADE_SPEED_BOOST_FACTOR
          inst.bladeDelay /= BLADE_SPEED_BOOST_FACTOR
          inst.cycleDelay /= BLADE_SPEED_BOOST_FACTOR
          sound && Sound.playBladeSound(sound)
        }
      })
    }
    //
    // Start blade animation after 0.5 second
    //
    k.wait(0.5, () => {
      inst.blade1State = 'extending'
      inst.animationTimer = 0
      sound && Sound.playBladeSound(sound)
    })
    
    // Setup blade animation (stops when level is completed)
    k.onUpdate(() => {
      if (!levelCompleted) updateBladesAnimation(inst)
    })
    WordBladeProximity.create({
      k,
      hero,
      bladeInsts: [blades1, blades2, blades3, pitBlades],
      sound,
      proximityRange: 180
    })
    setupWordLevel3HoverTooltips(k, { levelIndicator, fpsCounter, hero })
  })
}
//
// Registers HUD and hero hover tooltips for word level 3
//
function setupWordLevel3HoverTooltips(k, ctx) {
  const { levelIndicator, fpsCounter, hero } = ctx
  WordHudTooltips.setupStandardHudTooltips(k, { levelIndicator, fpsCounter, topPlatformHeight: PLATFORM_TOP_HEIGHT })
  WordHudTooltips.setupHeroInsecurityTooltip(k, hero)
}

/**
 * Update blades animation (cycle: extend, retract, repeat).
 * Positions are updated by the state machine; opacity is derived purely from
 * the blade's current Y so blades are never drawn while inside a platform.
 * @param {Object} inst - Scene instance
 */
function updateBladesAnimation(inst) {
  const { k, blades1, blades2, blades3, targetY1, visibleY1, targetY2, visibleY2, targetY3, visibleY3, animationSpeed, sound } = inst
  inst.animationTimer += k.dt()
  inst.cycleTimer += k.dt()
  //
  // Blade 1 (left floor blade — extends up from bottom platform)
  //
  if (inst.blade1State === 'extending') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    blades1.blade.pos.y = targetY1 + (visibleY1 - targetY1) * progress
    if (progress >= 1) {
      blades1.blade.pos.y = visibleY1
      inst.blade1State = 'retracting'
      inst.animationTimer = 0
    }
  } else if (inst.blade1State === 'retracting') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    blades1.blade.pos.y = visibleY1 + (targetY1 - visibleY1) * progress
    if (progress >= 1) {
      blades1.blade.pos.y = targetY1
      inst.blade1State = 'waiting-for-blade3'
      inst.animationTimer = 0
    }
  } else if (inst.blade1State === 'waiting-for-blade3') {
    if (inst.animationTimer >= inst.bladeDelay) {
      inst.blade3State = 'extending'
      inst.blade1State = 'blade3-active'
      inst.animationTimer = 0
      sound && Sound.playBladeSound(sound)
    }
  }
  //
  // Blade 2 (center ceiling blade — extends down from top platform)
  //
  if (inst.blade2State === 'extending') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    blades2.blade.pos.y = targetY2 + (visibleY2 - targetY2) * progress
    if (progress >= 1) {
      blades2.blade.pos.y = visibleY2
      inst.blade2State = 'retracting'
      inst.animationTimer = 0
    }
  } else if (inst.blade2State === 'retracting') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    blades2.blade.pos.y = visibleY2 + (targetY2 - visibleY2) * progress
    if (progress >= 1) {
      blades2.blade.pos.y = targetY2
      inst.blade2State = 'cycle-complete'
      inst.blade1State = 'cycle-complete'
      inst.blade3State = 'cycle-complete'
      inst.animationTimer = 0
      inst.cycleTimer = 0
    }
  }
  //
  // Blade 3 (right floor blade — extends up from bottom platform)
  //
  if (inst.blade3State === 'extending') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    blades3.blade.pos.y = targetY3 + (visibleY3 - targetY3) * progress
    if (progress >= 1) {
      blades3.blade.pos.y = visibleY3
      inst.blade3State = 'retracting'
      inst.animationTimer = 0
    }
  } else if (inst.blade3State === 'retracting') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    blades3.blade.pos.y = visibleY3 + (targetY3 - visibleY3) * progress
    if (progress >= 1) {
      blades3.blade.pos.y = targetY3
      inst.blade3State = 'waiting-for-blade2'
      inst.animationTimer = 0
    }
  } else if (inst.blade3State === 'waiting-for-blade2') {
    if (inst.animationTimer >= inst.bladeDelay) {
      inst.blade2State = 'extending'
      inst.blade3State = 'blade2-active'
      inst.animationTimer = 0
      sound && Sound.playBladeSound(sound)
    }
  }
  //
  // Restart cycle — blades teleport back to hidden positions
  //
  if (inst.blade1State === 'cycle-complete' && inst.cycleTimer >= inst.cycleDelay) {
    inst.cycleTimer = 0
    inst.animationTimer = 0
    blades1.blade.pos.y = targetY1
    blades2.blade.pos.y = targetY2
    blades3.blade.pos.y = targetY3
    inst.blade1State = 'extending'
    inst.blade2State = 'waiting'
    inst.blade3State = 'waiting'
    sound && Sound.playBladeSound(sound)
  }
  //
  // Opacity derived from current blade position so blades are invisible
  // while inside a platform and fade in only as they enter the playfield
  //
  updateBladesOpacity(inst)
}

/**
 * Update blade opacity from current Y position so blades are invisible while
 * inside a platform and fade in as they approach their visible resting position.
 * Uses distance from the fully-extended position as the reference so blades
 * reach full opacity exactly at visibleY regardless of blade geometry or sink.
 * BLADE_EMERGE_PX controls the fade window (px before visibleY where fade begins).
 * @param {Object} inst - Scene instance
 */
function updateBladesOpacity(inst) {
  const { blades1, blades2, blades3, visibleY1, visibleY2, visibleY3 } = inst
  //
  // Floor blades move UP (decreasing Y) to visible position.
  // Opacity = 1 at visibleY, fades to 0 BLADE_EMERGE_PX pixels above visibleY.
  //
  blades1.blade.opacity = Math.max(0, Math.min(1, 1 - (blades1.blade.pos.y - visibleY1) / BLADE_EMERGE_PX))
  blades3.blade.opacity = Math.max(0, Math.min(1, 1 - (blades3.blade.pos.y - visibleY3) / BLADE_EMERGE_PX))
  //
  // Ceiling blade moves DOWN (increasing Y) to visible position.
  // Opacity = 1 at visibleY2, fades to 0 BLADE_EMERGE_PX pixels below visibleY2.
  //
  blades2.blade.opacity = Math.max(0, Math.min(1, 1 - (visibleY2 - blades2.blade.pos.y) / BLADE_EMERGE_PX))
}

/**
 * Create custom platforms with a pit in the middle
 * @param {Object} k - Kaplay instance
 * @param {String} color - Platform color
 * @returns {Object} Pit information (centerX, width)
 */
function createCustomPlatforms(k, color) {
  // Calculate pit dimensions (same width as blades)
  const pitWidth = Blades.getBladeWidth(k)
  const centerX = CFG.visual.screen.width / 2
  const pitLeft = centerX - pitWidth / 2
  const pitRight = centerX + pitWidth / 2
  
  function createPlatform(x, y, width, height) {
    return k.add([
      k.rect(width, height),
      k.pos(x, y),
      k.area(),
      k.body({ isStatic: true }),
      getColor(k, color),
      CFG.game.platformName,
      k.z(CFG.visual.zIndex.platforms)
    ])
  }
  
  // Top platform (full width)
  createPlatform(0, 0, CFG.visual.screen.width, PLATFORM_TOP_HEIGHT)
  
  // Bottom platform - LEFT side (before pit)
  createPlatform(0, CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT, pitLeft, PLATFORM_BOTTOM_HEIGHT)
  
  // Bottom platform - RIGHT side (after pit)
  createPlatform(pitRight, CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT, CFG.visual.screen.width - pitRight, PLATFORM_BOTTOM_HEIGHT)
  
  // Left wall
  createPlatform(0, PLATFORM_TOP_HEIGHT, PLATFORM_SIDE_WIDTH, CFG.visual.screen.height - PLATFORM_TOP_HEIGHT - PLATFORM_BOTTOM_HEIGHT)
  
  // Right wall
  createPlatform(CFG.visual.screen.width - PLATFORM_SIDE_WIDTH, PLATFORM_TOP_HEIGHT, PLATFORM_SIDE_WIDTH, CFG.visual.screen.height - PLATFORM_TOP_HEIGHT - PLATFORM_BOTTOM_HEIGHT)
  
  return { centerX, width: pitWidth }
}

