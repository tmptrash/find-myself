import { CFG } from '../cfg.js'
import { initScene, checkSpeedBonus, playLifeDeathEffects, playSpeedBonusEffects, createOutlinedDeathMessage } from '../utils/scene.js'
import * as WordPitFill from '../utils/word-pit-fill.js'
import * as Blades from '../components/blades.js'
import * as Hero from '../../../components/hero.js'
import * as MovingPlatform from '../../../components/moving-platform.js'
import * as FlyingWords from '../components/flying-words.js'
import * as WordHudTooltips from '../utils/word-hud-tooltips.js'
import * as WordBladeProximity from '../utils/word-blade-proximity.js'
import * as WordKillerProximity from '../utils/word-killer-proximity.js'
import * as Tooltip from '../../../utils/tooltip.js'
import * as LifeDeduction from '../../touch/utils/life-deduction.js'
import * as LevelHelp from '../../../utils/level-help.js'
import { set, get } from '../../../utils/progress.js'
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
  "We never sleep \u00a9 Your thoughts",
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
const HERO_SPAWN_Y = 705    // Adjusted to stand on platform
const ANTIHERO_SPAWN_X = 1690  // 88% of 1920
const ANTIHERO_SPAWN_Y = 705   // Adjusted to stand on platform
//
// Hover tooltip copy
//
const WORD_L2_ANTIHERO_TOOLTIP_TEXT = 'Memory is a muscle.\nFlex it, rag'
const ANTIHERO_TOOLTIP_HOVER_SIZE = 80
const ANTIHERO_TOOLTIP_Y_OFFSET = -60
const BLADE_PROXIMITY_RANGE = 200
const BLADE_RATTLE_COOLDOWN = 0.35
//
// Keep word count matching level 0 for consistent performance across all word levels
//
const FLYING_WORD_COUNT = 22
//
// Life deduction trap (shown once when life score reaches threshold)
//
const LIFE_DEDUCT_THRESHOLD = 5
const LIFE_DEDUCT_FLAG = 'word.level2LifeDeduction'
//
// Canvas backdrop RGB for the life-deduction dialog overlay
// matches word section platform color (#2A2A38 = 42, 42, 56)
//
const WORD_L2_BACKDROP_R = 42
const WORD_L2_BACKDROP_G = 42
const WORD_L2_BACKDROP_B = 56
//
// Crimson section color for life-deduction dialog text
//
const WORD_TEXT_COLOR_R = 220
const WORD_TEXT_COLOR_G = 20
const WORD_TEXT_COLOR_B = 60
//
// Anti-hero escape trap: once the life-deduction dialog has been shown the anti-hero
// teleports to the hero's starting position so all traps must be crossed again.
// All moving-platform traps are reset so they can fire again.
//
const ANTIHERO_ESCAPE_TRIGGER_DISTANCE = 120
const ANTIHERO_HIDE_DURATION = 0.25
//
// Disappear / reappear particle burst — small crimson dust specks that scatter
// outward from the teleport point and evaporate quickly.
//
const DISAPPEAR_PARTICLE_COUNT = 14
const DISAPPEAR_PARTICLE_MIN_SPEED = 110
const DISAPPEAR_PARTICLE_MAX_SPEED = 260
const DISAPPEAR_PARTICLE_RADIUS = 3
const DISAPPEAR_PARTICLE_LIFE = 0.5

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
      k.go("level-word.2")
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
        k.go("level-word.2")
      }
    }
  })
}

export function sceneLevel2(k) {
  k.scene("level-word.2", () => {
    //
    // Save progress immediately when entering this level
    //
    set('lastLevel', 'level-word.2')
    // Calculate moving platform position first (110px from hero start position)
    const bladeWidth = Blades.getBladeWidth(k)
    const movingPlatformX = HERO_SPAWN_X + 110  // 110px from hero
    
    // Calculate positions for blade platforms
    const leftX = Math.min(HERO_SPAWN_X, ANTIHERO_SPAWN_X)
    const rightX = Math.max(HERO_SPAWN_X, ANTIHERO_SPAWN_X)
    const distance = rightX - leftX
    
    // First blade at 0.42 distance, second blade at 0.73 distance
    const blade1X = leftX + distance * 0.42
    const blade2X = leftX + distance * 0.73
    
    // Second moving platform before second blade (rightmost)
    const movingPlatform2X = blade2X - bladeWidth * 1.1  // Closer to second blade
    
    //
    // Define platform gaps
    //
    const platformGaps = [
      // First gap for first moving platform
      {
        x: movingPlatformX - bladeWidth / 2,
        width: bladeWidth
      },
      // Second gap for second moving platform
      {
        x: movingPlatform2X - bladeWidth / 2,
        width: bladeWidth
      }
    ]
    
    // Initialize level with heroes and gaps in platform
    const { sound, hero, antiHero, levelIndicator, fpsCounter, breathMusic, platformColor, playfieldColor } = initScene({
      k,
      levelName: 'level-word.2',
      levelNumber: 3,
      nextLevel: 'level-word.3',
      levelTitle: "words like blades",
      levelTitleColor: CFG.visual.colors.blades,
      subTitle: "words are blades that never rust",
      subTitleColor: CFG.visual.colors.blades,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y,
      platformGap: platformGaps,
      onAnnihilation: () => {
        breathMusic && breathMusic.stop && breathMusic.stop()
        const levelTime = FpsCounter.getLevelTime(fpsCounter)
        const speedBonusEarned = checkSpeedBonus(k, 'level-word.2', levelTime, levelIndicator)
        const currentScore = get('heroScore', 0)
        const pointsToAdd = speedBonusEarned ? 2 : 1
        const newScore = currentScore + pointsToAdd
        set('heroScore', newScore)
        levelIndicator && levelIndicator.updateHeroScore && levelIndicator.updateHeroScore(newScore)
        sound && Sound.playVictorySound(sound)
        speedBonusEarned && playSpeedBonusEffects(k, levelIndicator)
        const transitionDelay = speedBonusEarned ? 2.8 : 1.8
        k.wait(transitionDelay, () => {
          createLevelTransition(k, 'level-word.2')
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
      currentLevel: 'level-word.2',
      onDeath: () => showDeathMessage(k, hero, null, levelIndicator, sound),
      customBounds: platformBounds,
      wordCount: FLYING_WORD_COUNT,
      letterToWordRatio: CFG.visual.flyingWords.letterToWordRatio,
      killerLetterCount: 4  // Level 2: 4 killer letters
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
    const platformY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT
    const bladeHeight = Blades.getBladeHeight(k)
    //
    // Pit shafts under moving-platform gaps — playfield purple, not void black
    //
    platformGaps.forEach((gap) => {
      WordPitFill.addPitShaftFill(k, {
        x: gap.x,
        width: gap.width,
        topY: platformY,
        bottomY: CFG.visual.screen.height,
        playfieldColor
      })
    })
    //
    // Save platform references so the anti-hero escape trap can reset them
    //
    const movingPlatform1 = MovingPlatform.create({
      k,
      x: movingPlatformX,
      y: platformY,
      hero,
      color: platformColor,
      currentLevel: 'level-word.2',
      sfx: sound,
      onBladeHit: (blades) => showDeathMessage(k, hero, blades, levelIndicator, sound)
    })
    const movingPlatform2 = MovingPlatform.create({
      k,
      x: movingPlatform2X,
      y: platformY,
      hero,
      color: platformColor,
      currentLevel: 'level-word.2',
      sfx: sound,
      raiseDelay: 5.0,  // 3 seconds more than default (2.0 s)
      onBladeHit: (blades) => showDeathMessage(k, hero, blades, levelIndicator, sound)
    })
    //
    // Life deduction dialog — shown once when life score reaches threshold.
    // Anti-hero escape trap activates after the dialog (or immediately if
    // the dialog was already shown in a previous session).
    //
    const currentLifeScore = get('lifeScore', 0)
    const lifeTrapAlreadyShown = get(LIFE_DEDUCT_FLAG, false)
    const showLifeTrap = !lifeTrapAlreadyShown && currentLifeScore > LIFE_DEDUCT_THRESHOLD
    const trapCount = (showLifeTrap || lifeTrapAlreadyShown) ? 1 : 0
    levelIndicator.updateTrapCount(trapCount)
    const sceneLock = { locked: showLifeTrap }
    showLifeTrap && (hero.controlsDisabled = true) && (sceneLock.heroInst = hero)
    showLifeTrap && LifeDeduction.show({
      k,
      currentScore: currentLifeScore,
      levelIndicator,
      sound,
      deductFlag: LIFE_DEDUCT_FLAG,
      sceneLock,
      sceneBgRgb: { r: WORD_L2_BACKDROP_R, g: WORD_L2_BACKDROP_G, b: WORD_L2_BACKDROP_B },
      textColorRgb: { r: WORD_TEXT_COLOR_R, g: WORD_TEXT_COLOR_G, b: WORD_TEXT_COLOR_B },
      onComplete: () => setupAntiHeroEscapeTrap(k, hero, antiHero, movingPlatform1, movingPlatform2, sound)
    })
    //
    // If dialog was already shown in a previous session, activate trap immediately.
    // Do NOT re-check lifeScore here — the dialog already reduced it below the
    // threshold, so we only need to confirm the flag was set.
    //
    lifeTrapAlreadyShown &&
      setupAntiHeroEscapeTrap(k, hero, antiHero, movingPlatform1, movingPlatform2, sound)
    // Create first blade
    const blades1 = Blades.create({
      k,
      x: blade1X,
      y: platformY - bladeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => showDeathMessage(k, hero, blades1, levelIndicator, sound),
      sfx: sound
    })
    
    // Create second blade
    const blades2 = Blades.create({
      k,
      x: blade2X,
      y: platformY - bladeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => showDeathMessage(k, hero, blades2, levelIndicator, sound),
      sfx: sound
    })
    
    // Start blade animations after 1 second
    Blades.startAnimation(blades1)
    Blades.startAnimation(blades2)
    setupWordLevel2HoverTooltips(k, {
      levelIndicator,
      fpsCounter,
      hero,
      antiHero,
      blades1,
      blades2
    })
    WordBladeProximity.create({
      k,
      hero,
      bladeInsts: [blades1, blades2],
      sound,
      proximityRange: BLADE_PROXIMITY_RANGE,
      rattleCooldown: BLADE_RATTLE_COOLDOWN
    })
  })
}

//
// Registers standard HUD tooltips and level-themed hero hover lines
//
function setupWordLevel2HoverTooltips(k, ctx) {
  const { levelIndicator, fpsCounter, hero, antiHero } = ctx
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
      text: WORD_L2_ANTIHERO_TOOLTIP_TEXT,
      offsetY: ANTIHERO_TOOLTIP_Y_OFFSET
    }]
  })
}
//
// Registers the anti-hero escape trap for word level 2.
// When the hero gets within ANTIHERO_ESCAPE_TRIGGER_DISTANCE of the anti-hero
// the anti-hero vanishes with a sound, reappears at the HERO's starting position
// (left side of the level), and all moving-platform traps reset so they fire again.
//
function setupAntiHeroEscapeTrap(k, hero, antiHero, platform1, platform2, sound) {
  //
  // escaping: true while the teleport animation is in progress (debounce guard).
  // escaped:  true after the first escape is complete — prevents a second escape
  //           and allows the anti-hero to be annihilated normally.
  //
  const state = { escaping: false, escaped: false }
  k.onUpdate(() => onUpdateAntiHeroEscape(k, hero, antiHero, platform1, platform2, state, sound))
}
//
// Checks hero proximity each frame and triggers the anti-hero escape when close enough.
// Only fires once per level session — after the first escape the trap is disarmed.
//
function onUpdateAntiHeroEscape(k, hero, antiHero, platform1, platform2, state, sound) {
  if (state.escaping || state.escaped) return
  if (!antiHero.character.exists()) return
  const dist = Math.abs(hero.character.pos.x - antiHero.character.pos.x)
  if (dist > ANTIHERO_ESCAPE_TRIGGER_DISTANCE) return
  state.escaping = true
  //
  // Play disappear sound, hide the anti-hero, and burst crimson dust at vanish point
  //
  sound && Sound.playDisappearSound(sound)
  spawnDisappearParticles(k, antiHero.character.pos.x, antiHero.character.pos.y)
  antiHero.character.opacity = 0
  k.wait(ANTIHERO_HIDE_DURATION, () => {
    if (!antiHero.character.exists()) return
    //
    // Teleport to the hero's starting position (left side of the level)
    // so the hero must traverse all traps again.
    // Burst dust at the arrival point too.
    //
    antiHero.character.pos.x = HERO_SPAWN_X
    antiHero.character.pos.y = HERO_SPAWN_Y
    antiHero.character.opacity = 1
    spawnDisappearParticles(k, HERO_SPAWN_X, HERO_SPAWN_Y)
    MovingPlatform.reset(platform1)
    MovingPlatform.reset(platform2)
    //
    // Mark escape as done — anti-hero stays put and can now be annihilated
    //
    state.escaping = false
    state.escaped = true
  })
}
//
// Spawns crimson dust particles that scatter outward and fade, called when the
// anti-hero vanishes or materialises so the teleport feels tangible.
//
function spawnDisappearParticles(k, x, y) {
  for (let i = 0; i < DISAPPEAR_PARTICLE_COUNT; i++) {
    const angle = (i / DISAPPEAR_PARTICLE_COUNT) * Math.PI * 2 + k.rand(-0.4, 0.4)
    const speed = k.rand(DISAPPEAR_PARTICLE_MIN_SPEED, DISAPPEAR_PARTICLE_MAX_SPEED)
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed
    const startX = x + k.rand(-18, 18)
    const startY = y + k.rand(-18, 18)
    const state = { vx, vy, life: DISAPPEAR_PARTICLE_LIFE }
    const particle = k.add([
      k.pos(startX, startY),
      k.z(CFG.visual.zIndex.player + 2),
      {
        draw() {
          const ratio = Math.max(0, state.life / DISAPPEAR_PARTICLE_LIFE)
          k.drawCircle({
            pos: k.vec2(0, 0),
            radius: DISAPPEAR_PARTICLE_RADIUS * ratio,
            color: k.rgb(WORD_TEXT_COLOR_R, WORD_TEXT_COLOR_G, WORD_TEXT_COLOR_B),
            opacity: ratio
          })
        }
      }
    ])
    particle.onUpdate(() => {
      state.life -= k.dt()
      particle.pos.x += state.vx * k.dt()
      particle.pos.y += state.vy * k.dt()
      state.life <= 0 && particle.destroy()
    })
  }
}
