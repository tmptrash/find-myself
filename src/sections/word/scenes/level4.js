import { CFG } from '../cfg.js'
import { initScene, checkSpeedBonus, playLifeDeathEffects, createOutlinedDeathMessage } from '../utils/scene.js'
import { getColor, toCanvas, parseHex } from '../../../utils/helper.js'
import * as Hero from '../../../components/hero.js'
import * as Blades from '../components/blades.js'
import * as MovingPlatform from '../../../components/moving-platform.js'
import * as BladeArm from '../components/blade-arm.js'
import * as FlyingWords from '../components/flying-words.js'
import * as WordDreamingEyes from '../utils/word-dreaming-eyes.js'
import * as WordHeroIdleSpeech from '../utils/word-hero-idle-speech.js'
import * as WordConsciousnessLayers from '../utils/word-consciousness-layers.js'
import * as WordPitFill from '../utils/word-pit-fill.js'
import { set, get } from '../../../utils/progress.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as WordBladeProximity from '../utils/word-blade-proximity.js'
import * as WordKillerProximity from '../utils/word-killer-proximity.js'
import * as WordHudTooltips from '../utils/word-hud-tooltips.js'
import * as Tooltip from '../../../utils/tooltip.js'
import * as LevelHelp from '../../../utils/level-help.js'
import * as LifeDeduction from '../../touch/utils/life-deduction.js'
import * as Sound from '../../../utils/sound.js'
import { createLevelTransition } from '../../../utils/transition.js'

//
// Platform dimensions (in pixels, for 1920x1080 resolution)
//
const PLATFORM_TOP_HEIGHT = 360      // Top platform height (33.3% of 1080)
const PLATFORM_BOTTOM_HEIGHT = 360   // Bottom platform height (33.3% of 1080)
const PLATFORM_SIDE_WIDTH = 192      // Side walls width (10% of 1920)
//
// "Buy help" label position — further below the playfield floor so it does
// not crowd other elements in the platform area.
//
const HELP_Y_OFFSET = 160            // Pixels below playfield floor for buy-help label
const DEATH_MESSAGE_Y_OFFSET = 280   // Pixels below playfield floor for death message

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
//
// Each Shift-shot swaps the creature to a random word. There are only two
// states: a blue word that kills on touch, and a green word that is harmless.
// The colour is derived from each word's "good" flag.
//
const CREATURE_LETHAL_COLOR = '#4AC6F5'   // Blue — kills the hero on touch
const CREATURE_SAFE_COLOR = '#6BCB77'     // Green — harmless
const CREATURE_WORDS = [
  { text: 'fear', good: false },
  { text: 'doubt', good: false },
  { text: 'hate', good: false },
  { text: 'pain', good: false },
  { text: 'friend', good: true },
  { text: 'love', good: true },
  { text: 'calm', good: true },
  { text: 'hope', good: true }
]
//
// How close (px) the walking creature must be to a pit for it to close so it can cross
//
const MONSTER_PIT_CLOSE_DISTANCE = 170
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
// Keep word count matching level 0 for consistent performance across all word levels
//
const FLYING_WORD_COUNT = 20
//
// Slower horizontal drift for the blue flying words in this level
//
const FLYING_WORD_MIN_SPEED = 28
const FLYING_WORD_MAX_SPEED = 85
//
// Level 4 uses only short killer words (3–4 letters) for visual clarity
//
const LEVEL4_KILLER_WORDS = ['end', 'cut', 'kill', 'drop']
//
// Pits and platforms are shifted left so a calm platform + the anti-hero fit on
// the right. The hero also starts further left (see customHeroX below).
//
const PIT1_DISTANCE_RATIO = 0.12   // First pit, very close to the hero start
const PIT2_DISTANCE_RATIO = 0.5    // Second pit, moved left to open right-side room
//
// Extra leftward shift of the hero spawn (and, by extension, the first pit)
//
const HERO_EXTRA_LEFT = 120
//
// "confusion" word — a solid floating platform shaped like a killer word.
// The hero cannot pass underneath it; they must jump on top, which triggers
// one of several random "confusion" effects.
//
const CONFUSION_WORD_TEXT = 'chaos'      // Word shown on the confusion platform
const CONFUSION_FONT_SIZE = 30
const CONFUSION_TEXT_COLOR = '#4AC6F5'   // Same blue as killer words
const CONFUSION_HOVER_Y = 62             // Pixels above floor where the platform floats
const CONFUSION_BODY_PAD = 6             // Small horizontal margin added to the measured glyph width
const CONFUSION_BODY_HEIGHT = 20         // Solid collision body height (tight around the word)
const CONFUSION_TOP_TOLERANCE = 26       // Hero-feet distance from top counted as "standing on it"
//
// Confusion landing animation
//
const CONFUSION_WOBBLE_COUNT = 4         // Number of full up/down cycles
const CONFUSION_WOBBLE_AMP = 14          // Pixels of wobble amplitude
const CONFUSION_WOBBLE_FREQ = 18.0       // Wobbles per second
const CONFUSION_PARTICLE_COUNT = 16
const CONFUSION_PARTICLE_SIZE = 4
//
// Possible actions a control group can be reassigned to by the confusion platform
//
const CONFUSION_ACTIONS = ['moveLeft', 'moveRight', 'jump']
//
// Confusion landing outcomes — one is chosen at random each time the hero lands:
// remap controls, swap hero/anti-hero places, spawn decoy anti-heroes, return the
// hero to the start, or shatter into killer letters. (Control-handoff was removed
// because the anti-hero is inert until calmed, which would soft-lock the player.)
//
const CONFUSION_OUTCOMES = ['remap', 'swap', 'decoys', 'return', 'shatter']
//
// Shatter outcome: confusion breaks into just three scattering killer letters
//
const CONFUSION_SHATTER_LETTER_SIZE = 30
const CONFUSION_SHATTER_LETTERS = ['c', 'h', 'a']     // Three letters of "chaos"
const CONFUSION_SHATTER_DELAY = 0.7      // Telegraph pause before it breaks — time to jump off
//
// Tight collision box for a scattered letter — smaller than the baked sprite so
// it hugs the glyph (the sprite has outline + padding around the letter)
//
const SHARD_COLLISION_WIDTH = 20
const SHARD_COLLISION_HEIGHT = 24
//
// Decoy outcome: extra anti-heroes, all but one are lethal fakes
//
const DECOY_COUNT = 2
const DECOY_SPREAD = 150                 // Distance kept from the playfield edges
const DECOY_MIN_SEPARATION = 200         // Minimum horizontal gap between any two anti-heroes
const DECOY_CONFUSION_CLEARANCE = 130    // Keep anti-heroes this far from the confusion platform center
//
// "calm" word — a friendly green floating platform placed after the last blades.
// Standing on it fades out the ambient murmur/breath, turns flying words green and
// harmless, makes the monster a green "happy", and shuts the brain's eyes.
// Once the ambient fully fades, the grey anti-hero turns red and can be annihilated.
//
const CALM_WORD_TEXT = 'calm'
const CALM_FONT_SIZE = 30
const CALM_TEXT_COLOR = '#4AC6F5'        // Calm platform is blue (matches the killer-word blue)
const CALM_HOVER_Y = 150                 // Raised so it is only reachable by jumping off the monster
const CALM_BODY_PAD = 6                  // Small horizontal margin added to the measured glyph width
const CALM_BODY_HEIGHT = 20
const CALM_TOP_TOLERANCE = 26
const CALM_FADE_DURATION = 4.0           // Seconds standing on calm to fully silence the murmur
const CALM_AUDIO_RESTORE_TIME = 1.4      // Seconds to fade the ambient back up after leaving calm
const CALM_TIMER_SECONDS = 10            // Countdown the hero must complete standing on calm
const CALM_TIMER_FONT_SIZE = 24          // Countdown text size
const CALM_TIMER_OFFSET_X = 34           // Countdown X offset from the hero centre (to the right)
const CALM_TIMER_OFFSET_Y = 48           // Countdown Y offset above the hero centre
const CALM_MONSTER_WORD = 'happy'        // Word shown on the monster while calm
const CALM_MONSTER_FRIEND_WORD = 'friend' // Word shown on the monster after calm completes
const CALM_MONSTER_COLOR = '#6BCB77'     // Friendly green for the monster + OMM blades + root runners + calm platform
//
// After the 10 s calm countdown finishes, the playfield slowly empties; then a
// short pause before the hero speaks about feeling at one with the world.
//
const CALM_DISSOLVE_DURATION = 3.0       // Seconds for words / platforms / OMM to fade out
const CALM_DISSOLVE_HINT_DELAY = 2.0     // Seconds after dissolve finishes before the hint
const CALM_DISSOLVE_HINT_TEXT = "I feel at one with the world..."
const CALM_DISSOLVE_HINT_DURATION = 4.0
//
// While calm, breath.mp3 swells to this multiple of its base volume (it becomes
// the calming breathing) and a soft calm pad fades in; both revert on leaving.
//
const CALM_BREATH_MULT = 2.8
//
// Riding the green (friendly) monster: how close the hero's feet must be to the
// monster's top, and the per-frame move cap that ignores the wrap-around teleport.
//
const MONSTER_RIDE_TOLERANCE = 36
const MONSTER_RIDE_WRAP_GUARD = 40
const CALM_HINT_TEXT = "you're not ready yet.\nyou need to calm down..."
const CALM_HINT_DURATION = 3.6           // Seconds the grey anti-hero hint stays up
const ANTIHERO_GRAY_COLOR = '#B0B0B0'    // Inert grey anti-hero (until calmed)
const ANTIHERO_RED_COLOR = '#DC143C'     // Active red anti-hero (after calm)
//
// Gentle vertical bob shared by the calm / forget / chaos word platforms, matching
// the floating platforms in time level 0.
//
const PLATFORM_FLOAT_AMP = 6             // Pixels of vertical float
const PLATFORM_FLOAT_SPEED = 1.5         // Float phase advance per second
//
// Mercy points: after every block of deaths, if the hero has spent all bullets
// (0 score) the game grants a few so the level stays beatable without points.
//
const MERCY_DEATH_INTERVAL = 10          // Deaths per mercy check
const MERCY_POINTS = 3                   // Bullets granted each mercy
//
// Engine time of the last calm hint bubble — throttles repeated touch collisions
//
let lastCalmHintTime = -999
//
// "forget" floating platform — disappears a few seconds after hero lands, then reappears
//
const FORGET_COLLISION_WIDTH = 96        // Physics body width — matches the visible word glyphs
const FORGET_PLATFORM_HEIGHT = 14
const FORGET_FONT_SIZE = 21
const FORGET_WORD_TEXT = 'forget'
const FORGET_TEXT_COLOR = '#888899'
const FORGET_OPACITY_NORMAL = 1.0
const FORGET_OPACITY_FADING = 0.3
const FORGET_DISAPPEAR_DELAY = 3.0    // Seconds on platform before it vanishes
const FORGET_WARN_THRESHOLD = 0.8     // Seconds left before fade warning
const FORGET_REAPPEAR_DELAY = 1.2     // Seconds before platform comes back
//
// Bullet canvas dimensions — adds padding around letter for outline room
//
const BULLET_CANVAS_PAD = 10
const BULLET_CANVAS_SIZE = BULLET_SIZE + BULLET_CANVAS_PAD * 2
//
// Module-level cache: letter → sprite key. Sprites are loaded once and reused across
// scene restarts so k.loadSprite is never called twice for the same letter.
//
const _bulletSpriteCache = new Map()
//
// Module-level cache: "text|size|color" → baked sprite info {key, w, h}. The
// confusion and forget word platforms render from these sprites instead of
// issuing 9 drawText calls every frame, keeping the level's FPS high.
//
const _wordSpriteCache = new Map()
//
// Death messages for level 4
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
 * Show death message and restart level after delay
 * @param {Object} k - Kaplay instance
 * @param {Object} hero - Hero instance
 * @param {Object} bladesInst - Blades instance (optional)
 * @param {Object} bladeArmInst - Blade arm instance (optional)
 * @param {Object} [levelIndicator] - Level indicator for life score update
 * @param {Object} [sound] - Sound instance for effects
 */
function showDeathMessage(k, hero, bladesInst, bladeArmInst = null, levelIndicator = null, sound = null, heroScoreAtStart = 0) {
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
  //
  // Restore heroScore to value at level start so spent bullets are refunded
  //
  set('heroScore', heroScoreAtStart)
  //
  // Mercy: after every block of deaths, if the hero is out of bullets (0 score)
  // grant a few so the level stays beatable without points. The grant is gated to
  // one per death block (10, 20, 30 ... deaths) so it only repeats as the life
  // score climbs another 10.
  //
  grantMercyPoints(levelIndicator)
  playLifeDeathEffects(k, levelIndicator)
  //
  // Select random message
  //
  const message = DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)]
  const centerX = CFG.visual.screen.width / 2
  const messageY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT + DEATH_MESSAGE_Y_OFFSET
  
  //
  // Create message text
  //
  const deathMsg = createOutlinedDeathMessage(k, {
    message,
    centerX,
    messageY,
    fontSize: 32,
    zIndex: CFG.visual.zIndex.ui + 20
  })
  
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
    deathMsg.destroy()
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
      deathMsg.setOpacity(progress)
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
      deathMsg.setOpacity(1 - progress)
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

/**
 * Grants mercy bullets once per death block when the hero is out of points, so the
 * level stays beatable without score. Tracks total deaths and how many grants were
 * handed out; each block of MERCY_DEATH_INTERVAL deaths grants MERCY_POINTS at most
 * once (and only if the hero currently has 0 points).
 * @param {Object} levelIndicator - Level indicator (updates the hero score display)
 */
function grantMercyPoints(levelIndicator) {
  const deaths = get('word.level4Deaths', 0) + 1
  set('word.level4Deaths', deaths)
  const dueGrants = Math.floor(deaths / MERCY_DEATH_INTERVAL)
  if (dueGrants <= get('word.level4MercyGranted', 0)) return
  //
  // Consume this death block whether or not we grant, so the next grant needs
  // another full block of deaths (i.e. the life score climbing another 10)
  //
  set('word.level4MercyGranted', dueGrants)
  if (get('heroScore', 0) !== 0) return
  set('heroScore', MERCY_POINTS)
  levelIndicator?.updateHeroScore?.(MERCY_POINTS)
}


export function sceneLevel4(k) {
  k.scene("level-word.4", () => {
    //
    // Save progress immediately when entering this level
    //
    set('lastLevel', 'level-word.4')
    //
    // Save heroScore at level start for restoration on death
    //
    const heroScoreAtStart = get('heroScore', 0)
    // Hero starts further left so the first pit + AAA shift left with it
    const singleBladeWidth = Blades.getSingleBladeWidth(k)
    const customHeroX = HERO_SPAWN_X_BASE - HERO_EXTRA_LEFT
    const leftX = Math.min(customHeroX, ANTIHERO_SPAWN_X)
    const rightX = Math.max(customHeroX, ANTIHERO_SPAWN_X)
    const distance = rightX - leftX
    
    // Moving platforms at 1/3 and 2/3 distance
    const bladeWidth = Blades.getBladeWidth(k)
    const movingPlatform1X = leftX + distance * PIT1_DISTANCE_RATIO  // First pit near the hero
    const movingPlatform2X = leftX + distance * PIT2_DISTANCE_RATIO  // Second pit moved left
    
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
    
    // Initialize level with heroes and two gaps in the bottom platform
    const { sound, hero, antiHero, dreamingEyes, heroSpeech, consciousnessLayers, levelIndicator, fpsCounter, breathMusic, platformColor, playfieldColor } = initScene({
      k,
      levelName: 'level-word.4',
      levelNumber: 5,
      nextLevel: 'word-complete',
      //
      // Anti-hero starts grey and silent — it only turns red (and becomes
      // annihilable) once the hero calms the level on the calm platform.
      //
      antiHeroBodyColor: ANTIHERO_GRAY_COLOR,
      antiHeroSilent: true,
      levelTitle: "words like blades",
      levelTitleColor: CFG.visual.colors.blades,
      subTitle: "when feelings grow dull, words become sharper",
      subTitleColor: CFG.visual.colors.blades,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      helpY: CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT + HELP_Y_OFFSET,
      heroX: customHeroX,  // Custom hero position (shifted right by 3 pyramids)
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y,
      platformGap: platformGaps,
      onAnnihilation: () => {
        breathMusic && breathMusic.stop && breathMusic.stop()
        sound && Sound.stopCalmPad(sound)
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
    // Anti-hero stays inert (grey) until calmed; touching it only shows a hint
    //
    hero.annihilationLocked = true
    antiHero.character.onCollide('player', () => onGrayAntiHeroTouch(k, hero, antiHero))
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
      onHit: (bladeArmInst) => showDeathMessage(k, hero, null, bladeArmInst, levelIndicator, sound, heroScoreAtStart)
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
        showDeathMessage(k, hero, null, bladeArm, levelIndicator, sound, heroScoreAtStart)
      },
      customBounds: platformBounds,
      wordCount: FLYING_WORD_COUNT,
      letterToWordRatio: CFG.visual.flyingWords.letterToWordRatio,
      killerLetterCount: 5,  // Level 4: 5 killer letters
      killerWords: LEVEL4_KILLER_WORDS,  // Only short words for visual clarity
      minSpeed: FLYING_WORD_MIN_SPEED,   // Slower drift than the default
      maxSpeed: FLYING_WORD_MAX_SPEED,
      //
      // Hide the atmospheric drifting words — only killer letters and the brain
      // root-runner words remain in level 4.
      //
      showRegularWords: false
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
    
    // Create first special moving platform (jump-to-disable mode)
    const movingPlatform1 = MovingPlatform.create({
      k,
      x: movingPlatform1X,
      y: platformY,
      hero,
      color: platformColor,
      currentLevel: 'level-word.4',
      jumpToDisableBlades: true,  // Special mode: jump down to disable blades
      autoOpen: true,  // Auto-open on level start
      sfx: sound,
      onBladeHit: (blades) => showDeathMessage(k, hero, blades, bladeArm, levelIndicator, sound, heroScoreAtStart)
    })
    
    //
    // Create second normal moving platform — hero gets 2 extra seconds before
    // the pit closes, giving more time to navigate the blades.
    //
    const movingPlatform2 = MovingPlatform.create({
      k,
      x: movingPlatform2X,
      y: platformY,
      hero,
      color: platformColor,
      currentLevel: 'level-word.4',
      jumpToDisableBlades: false,
      autoOpen: false,
      sfx: sound,
      //
      // stationaryOnly: pit closes only after the hero stands still for 2 s.
      // Moving near the pit keeps it open; running away resets the timer.
      //
      stationaryOnly: true,
      raiseDelay: 2.0,
      onBladeHit: (blades) => showDeathMessage(k, hero, blades, bladeArm, levelIndicator, sound, heroScoreAtStart)
    })
    //
    // The pit-for-monster handler is registered later, once calmCtx exists, so it
    // can also hold the pits closed while the hero is calm.
    //
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
      onHit: () => showDeathMessage(k, hero, staticBlades, bladeArm, levelIndicator, sound, heroScoreAtStart),
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
      onHit: () => showDeathMessage(k, hero, staticBlades2, bladeArm, levelIndicator, sound, heroScoreAtStart),
      sfx: sound,
      color: CFG.visual.colors.blades,
      disableAnimation: true  // Disable vibration and glint
    })
    //
    // Make second blades visible immediately
    //
    Blades.show(staticBlades2)
    //
    // "confusion" word floats between staticBlades and the second pit (closer to right)
    //
    const confusionWordX = staticBladesX + bladeWidth / 2 + (movingPlatform2X - bladeWidth / 2 - staticBladesX - bladeWidth / 2) * 0.65
    const confusionWordY = platformY - CONFUSION_HOVER_Y
    //
    // Context handed to the confusion platform so its random outcomes can affect
    // the hero, anti-hero, flying words, and spawn back to the level start.
    //
    const confusionCtx = {
      sound,
      hero,
      antiHero,
      levelIndicator,
      heroScoreAtStart,
      heroStartX: customHeroX,
      heroStartY: HERO_SPAWN_Y,
      platformBounds,
      confusionX: confusionWordX,
      currentLevel: 'level-word.4'
    }
    const confusionWord = createConfusionWord(k, confusionWordX, confusionWordY, confusionCtx)
    //
    // Single "forget" floating platform — placed to the left of the first pit and
    // raised enough that the hero clears its underside when jumping past it.
    //
    const forgetFloorY = platformY
    const forgetPlatform = createForgetPlatform(k, movingPlatform1X - 240, forgetFloorY - 85, sound, hero)
    //
    // "calm" platform sits between the last blades and the anti-hero. Standing on
    // it fades the ambient, greens the words/monster, shuts the brain eyes, and
    // (once silent) turns the grey anti-hero red so it can finally be annihilated.
    //
    const calmRightX = staticBlades2X + bladeWidth / 2 + (ANTIHERO_SPAWN_X - staticBlades2X - bladeWidth / 2) * 0.5
    //
    // Left-side parking spot (just right of the hero start) used when the chaos
    // swap drops the hero next to the calm platform on the right.
    //
    const calmLeftX = leftX + 130
    const calmWordY = platformY - CALM_HOVER_Y
    const calmCtx = {
      sound,
      breathMusic,
      hero,
      antiHero,
      flyingWords,
      bladeArm,
      dreamingEyes,
      heroSpeech,
      consciousnessLayers,
      bladeInsts: [staticBlades, staticBlades2],
      confusionWord,
      forgetPlatform,
      movingPlatforms: [movingPlatform1, movingPlatform2],
      completed: false
    }
    const calmPlatform = createCalmPlatform(k, calmRightX, calmLeftX, calmWordY, calmCtx)
    calmCtx.calmState = calmPlatform.state
    //
    // Close each pit while the walking creature is over it so "fear" can cross,
    // then release it back to its normal hero trap once the creature has passed.
    // Also holds both pits closed while the hero is calm (calmCtx.pitsHeldClosed)
    // so they never re-open under it once it has stepped onto the calm platform.
    //
    setupPitsForMonster(k, bladeArm, [movingPlatform1, movingPlatform2], calmCtx)
    //
    // Let the chaos outcomes relocate the calm platform (anti-cheese on swap/return)
    //
    confusionCtx.calm = calmPlatform
    //
    // Carry the hero along while it rides the friendly (green) monster, so it can
    // be used as a moving step up to the raised calm platform.
    //
    const monsterRide = { lastX: bladeArm.collisionArea.pos.x }
    k.onUpdate(() => updateMonsterRide(hero, bladeArm, monsterRide))
    //
    // The calm pad lives on the persistent AudioContext, so stepping off fades it
    // out via progress — but a death (or any other exit) skips that. Stop it on
    // scene leave so the meditation drone always fades out and never lingers.
    //
    k.onSceneLeave(() => sound && Sound.stopCalmPad(sound))
    k.onUpdate(() => onUpdateCalmDissolve(k, calmCtx))
    WordBladeProximity.create({
      k,
      hero,
      bladeInsts: [staticBlades, staticBlades2],
      sound
    })
    //
    // Purple pit fills — z placed below the brain roots layer so roots
    // extend visually into both pits (same technique as level 3 pit shaft).
    //
    const pitTopY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT
    WordPitFill.addPitShaftFill(k, {
      x: movingPlatform1X - bladeWidth / 2,
      width: bladeWidth,
      topY: pitTopY,
      bottomY: k.height(),
      playfieldColor,
      zIndex: CFG.visual.zIndex.wordPlayfieldFill + 0.3
    })
    WordPitFill.addPitShaftFill(k, {
      x: movingPlatform2X - bladeWidth / 2,
      width: bladeWidth,
      topY: pitTopY,
      bottomY: k.height(),
      playfieldColor,
      zIndex: CFG.visual.zIndex.wordPlayfieldFill + 0.3
    })
    //
    // Setup letter throwing mechanic (hero throws letters at creature)
    //
    setupHeroShooting(k, hero, bladeArm, levelIndicator)
    showLetterInstructions(k)
    setupWordLevel4HoverTooltips(k, { levelIndicator, fpsCounter, hero })
  })
}
//
// Registers HUD and hero hover tooltips for word level 4
//
function setupWordLevel4HoverTooltips(k, ctx) {
  const { levelIndicator, fpsCounter, hero } = ctx
  WordHudTooltips.setupStandardHudTooltips(k, { levelIndicator, fpsCounter, topPlatformHeight: PLATFORM_TOP_HEIGHT })
  WordHudTooltips.setupHeroInsecurityTooltip(k, hero)
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
  const letter = BULLET_LETTERS[Math.floor(Math.random() * BULLET_LETTERS.length)]
  //
  // Play shoot sound
  //
  Sound.playBulletShootSound(hero.sfx)
  //
  // Get (or bake on first use) a pre-rendered sprite for this letter.
  // Replaces 9 drawText calls per frame with a single drawSprite — eliminates
  // per-frame font rendering overhead for every active bullet.
  //
  const spriteKey = getBulletSpriteKey(k, letter)
  const bullet = k.add([
    k.sprite(spriteKey, { width: BULLET_CANVAS_SIZE, height: BULLET_CANVAS_SIZE }),
    k.pos(heroPos.x, heroPos.y),
    k.z(21),
    k.anchor('center'),
    'letter-bullet'
  ])
  //
  // Move bullet horizontally
  //
  bullet.onUpdate(() => {
    bullet.pos.x += BULLET_SPEED * direction * k.dt()
    ;(bullet.pos.x < 0 || bullet.pos.x > k.width()) && k.destroy(bullet)
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
 * Returns a cached sprite key for the given letter bullet, baking the sprite
 * once from a canvas and caching in _bulletSpriteCache for subsequent calls.
 * @param {Object} k - Kaplay instance
 * @param {string} letter - Single letter character
 * @returns {string} Kaplay sprite key
 */
function getBulletSpriteKey(k, letter) {
  const cacheKey = `word-bullet-letter-${letter}`
  if (_bulletSpriteCache.has(cacheKey)) return _bulletSpriteCache.get(cacheKey)
  const fontFamily = CFG.visual.fonts.regularFull.replace(/'/g, '')
  const [hr, hg, hb] = parseHex(CFG.visual.colors.hero.body)
  const bw = BULLET_OUTLINE_WIDTH
  const cx = BULLET_CANVAS_SIZE / 2
  const cy = BULLET_CANVAS_SIZE / 2
  const canvas = toCanvas({ width: BULLET_CANVAS_SIZE, height: BULLET_CANVAS_SIZE, pixelRatio: 2 }, ctx => {
    ctx.font = `${BULLET_SIZE}px "${fontFamily}"`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    //
    // Draw 8-direction black outline
    //
    ctx.fillStyle = '#000000'
    const offsets = [[-bw, -bw], [0, -bw], [bw, -bw], [-bw, 0], [bw, 0], [-bw, bw], [0, bw], [bw, bw]]
    offsets.forEach(([dx, dy]) => ctx.fillText(letter, cx + dx, cy + dy))
    //
    // Draw main letter in hero body color
    //
    ctx.fillStyle = `rgb(${hr},${hg},${hb})`
    ctx.fillText(letter, cx, cy)
  })
  k.loadSprite(cacheKey, canvas)
  canvas.width = 0
  canvas.height = 0
  _bulletSpriteCache.set(cacheKey, cacheKey)
  return cacheKey
}

/**
 * Measures the rendered pixel width of a word at a given font size.
 * @param {Object} k - Kaplay instance (unused, kept for signature consistency)
 * @param {string} text - Word to measure
 * @param {number} size - Font size in pixels
 * @returns {number} Rendered width in pixels
 */
function measureWordWidth(k, text, size) {
  const fontFamily = CFG.visual.fonts.regularFull.replace(/'/g, '')
  const measureCtx = document.createElement('canvas').getContext('2d')
  measureCtx.font = `${size}px "${fontFamily}"`
  return measureCtx.measureText(text).width
}

/**
 * Bakes a word into a sprite (coloured fill + 8-direction black outline) once
 * and caches it, returning {key, w, h}. Used by the confusion and forget word
 * platforms so they draw one sprite per frame instead of nine drawText calls.
 * @param {Object} k - Kaplay instance
 * @param {string} text - Word to bake
 * @param {number} size - Font size in pixels
 * @param {string} hex - Fill colour hex string
 * @returns {Object} Cached sprite info {key, w, h}
 */
function getWordSpriteInfo(k, text, size, hex) {
  const cacheKey = `word-platform-${text}-${size}-${hex}`
  if (_wordSpriteCache.has(cacheKey)) return _wordSpriteCache.get(cacheKey)
  const fontFamily = CFG.visual.fonts.regularFull.replace(/'/g, '')
  const [r, g, b] = parseHex(hex)
  const ow = 2
  //
  // Canvas sized generously around the measured glyph run plus outline padding
  //
  const w = Math.ceil(size * text.length * 0.72) + 16
  const h = Math.ceil(size * 1.7)
  const cx = w / 2
  const cy = h / 2
  const canvas = toCanvas({ width: w, height: h, pixelRatio: 2 }, ctx => {
    ctx.font = `${size}px "${fontFamily}"`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    //
    // Draw 8-direction black outline
    //
    ctx.fillStyle = '#000000'
    const offsets = [[-ow, -ow], [0, -ow], [ow, -ow], [-ow, 0], [ow, 0], [-ow, ow], [0, ow], [ow, ow]]
    offsets.forEach(([dx, dy]) => ctx.fillText(text, cx + dx, cy + dy))
    //
    // Draw main word in its fill colour
    //
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillText(text, cx, cy)
  })
  k.loadSprite(cacheKey, canvas)
  canvas.width = 0
  canvas.height = 0
  const info = { key: cacheKey, w, h }
  _wordSpriteCache.set(cacheKey, info)
  return info
}

/**
 * Closes each moving-platform pit while the walking creature is near it (so it
 * can cross) and releases it once the creature has moved away.
 * @param {Object} k - Kaplay instance
 * @param {Object} bladeArm - Blade arm creature instance
 * @param {Array} platforms - Moving platform instances to manage
 */
function setupPitsForMonster(k, bladeArm, platforms, calmCtx = null) {
  k.onUpdate(() => onUpdatePitsForMonster(k, bladeArm, platforms, calmCtx))
}
//
// Per-frame: close pits the creature is crossing, release the rest. While the hero
// is calm (calmCtx.pitsHeldClosed) every pit is held closed so none re-open under
// the hero once it has stepped onto the calm platform.
//
function onUpdatePitsForMonster(k, bladeArm, platforms, calmCtx) {
  const heldClosed = !!calmCtx?.pitsHeldClosed
  const area = bladeArm?.collisionArea
  if (!heldClosed && !area?.exists?.()) return
  const monsterX = area?.exists?.() ? area.pos.x : null
  platforms.forEach(mp => {
    const near = heldClosed || (monsterX !== null && Math.abs(monsterX - mp.platform.pos.x) < MONSTER_PIT_CLOSE_DISTANCE)
    MovingPlatform.setMonsterClosed(mp, near)
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
  //
  // Pick a random word. Its colour and lethality follow the "good" flag:
  // green + harmless, or blue + lethal. The new state persists after the flash.
  //
  const entry = CREATURE_WORDS[Math.floor(Math.random() * CREATURE_WORDS.length)]
  const [pr, pg, pb] = parseHex(entry.good ? CREATURE_SAFE_COLOR : CREATURE_LETHAL_COLOR)
  bladeArm.persistColor = k.rgb(pr, pg, pb)
  //
  // Swap the displayed word and update lethality (good = harmless, bad = lethal)
  //
  BladeArm.setWord(bladeArm, entry.text, entry.good, bladeArm.persistColor)
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
 * Flash creature when hit, alternating white and the new cycle colour, then
 * leave it on the new colour permanently (text and legs both update).
 * @param {Object} k - Kaplay instance
 * @param {Object} bladeArm - Blade arm creature instance
 * @param {number} count - Current flash count
 */
function flashCreature(k, bladeArm, count) {
  const persistColor = bladeArm.persistColor || k.rgb(107, 142, 159)
  //
  // Flash finished: lock in the new colour on the text and the legs
  //
  if (count >= CREATURE_FLASH_COUNT) {
    applyCreatureColor(bladeArm, persistColor)
    return
  }
  const isWhite = count % 2 === 0
  const newColor = isWhite ? k.rgb(255, 255, 255) : persistColor
  applyCreatureColor(bladeArm, newColor)
  k.wait(0.05, () => flashCreature(k, bladeArm, count + 1))
}
//
// Applies a colour to the creature's main text and its IK legs.
//
function applyCreatureColor(bladeArm, color) {
  const mainText = bladeArm.textObjects[bladeArm.textObjects.length - 1]
  mainText && (mainText.color = color)
  //
  // drawLegs reads bladeArm.bladeColor each frame — updating it recolours the legs
  //
  bladeArm.bladeColor = color
}

/**
 * Creates the "confusion" solid floating platform shaped like a word.
 * The hero cannot pass underneath; they must jump on top. Landing on top
 * wobbles the platform, emits particles, plays a sound, and then triggers one
 * random confusion outcome (control remap / hero-antihero swap / decoys /
 * return to start / hand control to the anti-hero / shatter into killer letters).
 * @param {Object} k - Kaplay instance
 * @param {number} x - Center X of the platform
 * @param {number} y - Center Y of the platform (above the floor)
 * @param {Object} ctx - Outcome context {sound, hero, antiHero, ...}
 */
function createConfusionWord(k, x, y, ctx) {
  //
  // Measure the actual rendered width of "chaos" so the collision body ends
  // exactly on the first and last letter (the baked sprite has extra padding)
  //
  const bodyWidth = measureWordWidth(k, CONFUSION_WORD_TEXT, CONFUSION_FONT_SIZE) + CONFUSION_BODY_PAD
  const state = {
    heroOn: false,
    wobbleTimer: -1,   // negative = not wobbling
    yOffset: 0,
    floatOffset: Math.random() * Math.PI * 2,
    shattered: false,
    triggering: false,
    passive: false,
    detectHalfW: bodyWidth / 2
  }
  //
  // Solid physics body — blocks passage underneath and acts as a landing platform
  //
  const body = k.add([
    k.rect(bodyWidth, CONFUSION_BODY_HEIGHT),
    k.pos(x - bodyWidth / 2, y - CONFUSION_BODY_HEIGHT / 2),
    k.area(),
    k.body({ isStatic: true }),
    k.anchor('topleft'),
    k.opacity(0),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Word visual as a pre-baked sprite (fill + black outline). Far cheaper than
  // re-rendering 9 drawText calls each frame; it just wobbles vertically.
  //
  const spriteInfo = getWordSpriteInfo(k, CONFUSION_WORD_TEXT, CONFUSION_FONT_SIZE, CONFUSION_TEXT_COLOR)
  const obj = k.add([
    k.sprite(spriteInfo.key, { width: spriteInfo.w, height: spriteInfo.h }),
    k.pos(x, y),
    k.anchor('center'),
    k.z(CFG.visual.zIndex.ui - 5)
  ])
  obj.onUpdate(() => onUpdateConfusionWord(k, obj, body, state, x, y, ctx))
  return {
    body,
    obj,
    state,
    //
    // After the calm meditation completes, chaos turns green and stops triggering
    // random outcomes — it becomes a plain floating platform.
    //
    setPassiveGreen(instK) {
      if (state.passive) return
      state.passive = true
      state.triggering = false
      state.wobbleTimer = -1
      state.yOffset = 0
      const greenInfo = getWordSpriteInfo(instK, CONFUSION_WORD_TEXT, CONFUSION_FONT_SIZE, CALM_MONSTER_COLOR)
      obj.use(instK.sprite(greenInfo.key, { width: greenInfo.w, height: greenInfo.h }))
    }
  }
}
//
// Detects the hero landing on TOP of the confusion platform.
// On landing: wobbles, emits particles, plays sound, then triggers a random outcome.
//
function onUpdateConfusionWord(k, obj, body, state, wordX, wordY, ctx) {
  const hero = ctx.hero
  if (state.shattered || state.dissolving) return
  if (!hero?.character?.exists?.()) return
  //
  // After calm completes, chaos is a passive green platform — float only, no effects
  //
  if (state.passive) {
    state.floatOffset += k.dt() * PLATFORM_FLOAT_SPEED
    const floatY = Math.sin(state.floatOffset) * PLATFORM_FLOAT_AMP
    body.pos.y = wordY - CONFUSION_BODY_HEIGHT / 2 + floatY
    obj.pos.y = wordY + floatY
    const heroX = hero.character.pos.x
    const heroFeetY = hero.character.pos.y + 34
    const platformTop = wordY - CONFUSION_BODY_HEIGHT / 2 + floatY
    const inRange = Math.abs(heroX - wordX) < state.detectHalfW
    const onTop = inRange && hero.character.isGrounded() && Math.abs(heroFeetY - platformTop) < CONFUSION_TOP_TOLERANCE
    state.heroOn = onTop
    return
  }
  //
  // Gentle vertical float (matches the time level 0 platforms), layered under the
  // landing wobble so the platform always drifts up and down a little
  //
  state.floatOffset += k.dt() * PLATFORM_FLOAT_SPEED
  const floatY = Math.sin(state.floatOffset) * PLATFORM_FLOAT_AMP
  body.pos.y = wordY - CONFUSION_BODY_HEIGHT / 2 + floatY
  const heroX = hero.character.pos.x
  const heroFeetY = hero.character.pos.y + 34
  const platformTop = wordY - CONFUSION_BODY_HEIGHT / 2 + floatY
  const inRange = Math.abs(heroX - wordX) < state.detectHalfW
  const onTop = inRange && hero.character.isGrounded() && Math.abs(heroFeetY - platformTop) < CONFUSION_TOP_TOLERANCE
  if (onTop && !state.heroOn && !state.triggering) {
    state.heroOn = true
    state.triggering = true
    state.wobbleTimer = 0
    spawnConfusionParticles(k, wordX, wordY, hero)
    Sound.playScarySound(ctx.sound)
    //
    // Apply the chosen outcome after the wobble animation finishes
    //
    const wobbleDuration = CONFUSION_WOBBLE_COUNT / CONFUSION_WOBBLE_FREQ
    k.wait(wobbleDuration, () => {
      state.triggering = false
      applyConfusionOutcome(k, obj, body, state, wordX, wordY, ctx)
    })
  } else if (!onTop) {
    state.heroOn = false
  }
  //
  // Animate wobble: sine wave over wobbleDuration seconds
  //
  if (state.wobbleTimer >= 0) {
    state.wobbleTimer += k.dt()
    const wobbleDuration = CONFUSION_WOBBLE_COUNT / CONFUSION_WOBBLE_FREQ
    if (state.wobbleTimer < wobbleDuration) {
      state.yOffset = Math.sin(state.wobbleTimer * CONFUSION_WOBBLE_FREQ * Math.PI * 2) * CONFUSION_WOBBLE_AMP
    } else {
      state.wobbleTimer = -1
      state.yOffset = 0
    }
  }
  //
  // Apply the wobble + gentle float offset to the baked word sprite
  //
  obj.pos.y = wordY + state.yOffset + floatY
}
//
// Picks one random confusion outcome and applies it.
//
function applyConfusionOutcome(k, obj, body, state, wordX, wordY, ctx) {
  const outcome = CONFUSION_OUTCOMES[Math.floor(Math.random() * CONFUSION_OUTCOMES.length)]
  if (outcome === 'remap') {
    ctx.hero.confusionMap = getRandomConfusionMap()
  } else if (outcome === 'swap') {
    confusionSwapAntiHero(k, ctx)
  } else if (outcome === 'decoys') {
    confusionSpawnDecoys(k, ctx)
  } else if (outcome === 'return') {
    confusionReturnHero(k, ctx)
  } else if (outcome === 'shatter') {
    //
    // Keep the platform solid and wobbling for a short telegraph so the hero
    // has time to jump off before it actually breaks apart
    //
    state.triggering = true
    state.wobbleTimer = 0
    k.wait(CONFUSION_SHATTER_DELAY, () => {
      state.triggering = false
      confusionShatter(k, obj, body, state, wordX, wordY, ctx)
    })
  }
}
//
// Spawns small coloured particle squares that fly out from the confusion word.
//
function spawnConfusionParticles(k, x, y, hero) {
  const [tr, tg, tb] = parseHex(CONFUSION_TEXT_COLOR)
  for (let i = 0; i < CONFUSION_PARTICLE_COUNT; i++) {
    const angle = (i / CONFUSION_PARTICLE_COUNT) * Math.PI * 2
    const speed = k.rand(60, 180)
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed - 40
    const particle = k.add([
      k.rect(CONFUSION_PARTICLE_SIZE, CONFUSION_PARTICLE_SIZE),
      k.pos(x, y),
      k.anchor('center'),
      k.color(tr, tg, tb),
      k.opacity(1),
      k.z(CFG.visual.zIndex.ui)
    ])
    const state = { vx, vy, life: 0.6 }
    particle.onUpdate(() => {
      state.life -= k.dt()
      if (state.life <= 0) {
        particle.destroy()
        return
      }
      state.vy += 400 * k.dt()
      particle.pos.x += state.vx * k.dt()
      particle.pos.y += state.vy * k.dt()
      particle.opacity = state.life / 0.6
    })
  }
}
//
// Returns a random key map that always preserves all three control functions
// (moveLeft / moveRight / jump). The three arrow keys get a random permutation
// of the functions, the three letter keys (a/d/w) get an independent random
// permutation, and space is reassigned to one of the three functions.
//
function getRandomConfusionMap() {
  const arrows = shuffleActions()
  const letters = shuffleActions()
  const space = CONFUSION_ACTIONS[Math.floor(Math.random() * CONFUSION_ACTIONS.length)]
  return {
    keyMap: {
      left: arrows[0], right: arrows[1], up: arrows[2],
      a: letters[0], d: letters[1], w: letters[2],
      space
    }
  }
}
//
// Fisher–Yates shuffle of the three control actions, returning a fresh array
//
function shuffleActions() {
  const a = CONFUSION_ACTIONS.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}
//
// Confusion outcome: hero and anti-hero swap places. Both vanish (with a laugh,
// no points) and reappear at each other's positions.
//
function confusionSwapAntiHero(k, ctx) {
  const { antiHero, sound, hero } = ctx
  if (!antiHero?.character?.exists?.() || !hero?.character?.exists?.()) return
  //
  // Capture both positions before swapping
  //
  const heroX = hero.character.pos.x
  const heroY = hero.character.pos.y
  const antiX = antiHero.character.pos.x
  const antiY = antiHero.character.pos.y
  Sound.playDisappearSound(sound)
  Sound.playEvilLaughSound(sound)
  spawnConfusionParticles(k, heroX, heroY, hero)
  spawnConfusionParticles(k, antiX, antiY, hero)
  antiHero.character.opacity = 0
  hero.character.opacity = 0
  k.wait(0.5, () => {
    //
    // Hero appears where the anti-hero stood; anti-hero appears where the hero stood
    //
    if (antiHero.character.exists()) {
      antiHero.character.pos.x = heroX
      antiHero.character.pos.y = heroY
      antiHero.character.opacity = 1
      spawnConfusionParticles(k, heroX, heroY, hero)
    }
    if (hero.character.exists()) {
      hero.character.pos.x = antiX
      hero.character.pos.y = antiY
      hero.character.opacity = 1
      spawnConfusionParticles(k, antiX, antiY, hero)
    }
    //
    // Hero now stands on the right (next to calm) — move calm to the left so the
    // swap does not hand the player an easy calm.
    //
    ctx.calm?.relocate('left')
  })
}
//
// Confusion outcome: spawn DECOY_COUNT fake anti-heroes around the real one.
// Fakes have no mouth notes and kill the hero on touch; only the original
// anti-hero (with notes) can be annihilated.
//
function confusionSpawnDecoys(k, ctx) {
  const { antiHero } = ctx
  if (!antiHero?.character?.exists?.()) return
  //
  // Clear any decoys from a previous confusion landing so repeated triggers
  // never accumulate extra anti-heroes (which would steadily drop the FPS)
  //
  clearDecoys(k, ctx)
  ctx._decoys = []
  const baseY = antiHero.character.pos.y
  //
  // Pick spots for the real anti-hero + every decoy. Spots fit a full-height
  // anti-hero (never under the confusion platform) and are spaced apart.
  //
  const spots = pickAntiheroSpots(k, ctx, DECOY_COUNT + 1)
  if (spots.length === 0) return
  //
  // Relocate the REAL anti-hero to the first spot (away from its original
  // right-side position) so the hero cannot rely on where it stood
  //
  spawnConfusionParticles(k, antiHero.character.pos.x, antiHero.character.pos.y, ctx.hero)
  antiHero.character.pos.x = spots[0]
  antiHero.character.pos.y = baseY
  spawnConfusionParticles(k, spots[0], baseY, ctx.hero)
  //
  // Spawn lethal decoys at the remaining spots
  //
  for (let i = 1; i < spots.length; i++) {
    const decoy = Hero.create({
      k,
      x: spots[i],
      y: baseY,
      type: Hero.HEROES.ANTIHERO,
      controllable: false,
      sfx: ctx.sound,
      bodyColor: ANTIHERO_GRAY_COLOR,  // Decoys are grey like the inert anti-hero
      addMouth: true,
      addArms: true,
      addWatch: true,
      idleVocalization: null  // Grey anti-heroes never emit mouth notes
    })
    //
    // Remove the annihilation tag so touching a fake kills the hero instead of
    // winning — only the original anti-hero can be annihilated.
    //
    decoy.character.unuse?.('annihilation')
    decoy.character.onCollide('player', () => onDecoyTouch(k, ctx))
    Hero.spawn(decoy)
    ctx._decoys.push(decoy)
  }
}
//
// Picks up to `count` valid X spots for anti-heroes: inside the playfield,
// far enough from the confusion platform that a full-height anti-hero fits
// (never tucked under it), and separated from each other.
//
function pickAntiheroSpots(k, ctx, count) {
  const left = ctx.platformBounds.left + DECOY_SPREAD
  const right = ctx.platformBounds.right - DECOY_SPREAD
  const forbidLo = ctx.confusionX - DECOY_CONFUSION_CLEARANCE
  const forbidHi = ctx.confusionX + DECOY_CONFUSION_CLEARANCE
  const spots = []
  let attempts = 0
  while (spots.length < count && attempts < 200) {
    attempts++
    const x = k.rand(left, right)
    //
    // Reject spots under the confusion platform (no room for full height)
    //
    if (x > forbidLo && x < forbidHi) continue
    //
    // Reject spots too close to an already-chosen one
    //
    if (spots.some(s => Math.abs(s - x) < DECOY_MIN_SEPARATION)) continue
    spots.push(x)
  }
  return spots
}
//
// Destroys all currently spawned decoy anti-heroes (used before respawning a new
// set, keeping the level free of accumulated objects).
//
function clearDecoys(k, ctx) {
  if (!ctx._decoys) return
  ctx._decoys.forEach(decoy => decoy?.character?.exists?.() && k.destroy(decoy.character))
  ctx._decoys = []
}
//
// Touch handler for decoy anti-heroes — grey decoys are inert and only show the
// "you lack calm" hint, exactly like the real grey anti-hero.
//
function onDecoyTouch(k, ctx) {
  if (ctx.hero.isAnnihilating || ctx.hero.isDying) return
  if (LevelHelp.isAnyPanelOpen() || LifeDeduction.isActive()) return
  showCalmHint(k, ctx.hero.character)
}
//
// Lethal touch handler for shattered chaos letters — these still kill the hero
//
function onShardTouch(k, ctx) {
  if (ctx.hero.isAnnihilating || ctx.hero.isDying) return
  if (LevelHelp.isAnyPanelOpen() || LifeDeduction.isActive()) return
  showDeathMessage(k, ctx.hero, null, null, ctx.levelIndicator, ctx.sound, ctx.heroScoreAtStart)
}
//
// Confusion outcome: the hero is teleported back to the level's start position.
//
function confusionReturnHero(k, ctx) {
  const { hero } = ctx
  if (!hero?.character?.exists?.()) return
  spawnConfusionParticles(k, hero.character.pos.x, hero.character.pos.y, hero)
  hero.character.pos.x = ctx.heroStartX
  hero.character.pos.y = ctx.heroStartY
  spawnConfusionParticles(k, ctx.heroStartX, ctx.heroStartY, hero)
  //
  // Hero is back at the start (left) — if calm was parked left, send it back right
  //
  ctx.calm?.relocate('right')
}
//
// Confusion outcome: the platform shatters into blue killer letters (part of
// "chaos") that scatter, settle, and kill the hero on contact.
//
function confusionShatter(k, obj, body, state, wordX, wordY, ctx) {
  state.shattered = true
  body.destroy()
  //
  // Remove the baked word sprite — it is replaced by the scattering letters
  //
  obj.exists?.() && obj.destroy()
  const letters = CONFUSION_SHATTER_LETTERS
  //
  // Spread the shards across the measured word width (state.detectHalfW = half-width)
  //
  const wordWidth = state.detectHalfW * 2
  const spacing = wordWidth / (letters.length + 1)
  letters.forEach((ch, i) => {
    const lx = wordX - wordWidth / 2 + spacing * (i + 1)
    createConfusionShard(k, ch, lx, wordY, ctx)
  })
}
//
// Creates a single scattering killer letter from the shattered confusion word.
//
function createConfusionShard(k, ch, x, y, ctx) {
  //
  // Pre-baked sprite carries the black outline (k.outline does not render on
  // text), so each scattered letter keeps a solid black stroke
  //
  const info = getWordSpriteInfo(k, ch, CONFUSION_SHATTER_LETTER_SIZE, CONFUSION_TEXT_COLOR)
  //
  // Real physics body (mass + gravity) so the letter falls and tumbles to rest
  // on the floor platform. A custom tight rect (centered on the sprite, since the
  // Rect pos is the box center) hugs the glyph — the baked sprite has outline +
  // padding, so the auto-area would be too tall and wide and shifted.
  //
  const shard = k.add([
    k.sprite(info.key, { width: info.w, height: info.h }),
    k.pos(x, y),
    k.anchor('center'),
    k.area({ shape: new k.Rect(k.vec2(0, 0), SHARD_COLLISION_WIDTH, SHARD_COLLISION_HEIGHT) }),
    k.body(),
    k.z(CFG.visual.zIndex.ui - 5),
    'confusion-shard'
  ])
  //
  // Pop the letter upward and give it a sideways kick; gravity + the solid floor
  // make it scatter and settle along the ground
  //
  shard.jump(k.rand(120, 300))
  const st = { vx: k.rand(-160, 160) }
  shard.onUpdate(() => onUpdateConfusionShard(k, shard, st))
  shard.onCollide('player', () => onShardTouch(k, ctx))
}
//
// Per-frame horizontal scatter for a shard. Vertical motion is handled by the
// body component; horizontal velocity decays with friction once it lands.
//
function onUpdateConfusionShard(k, shard, st) {
  shard.move(st.vx, 0)
  //
  // Apply ground friction once the shard has settled vertically
  //
  shard.isGrounded?.() && (st.vx *= 0.9)
  //
  // Despawn if it falls into a pit and off the bottom of the screen
  //
  shard.pos.y > k.height() + 100 && k.destroy(shard)
}

/**
 * Creates a "forget" platform — invisible physics body + outlined text label.
 * The platform disappears 3 s after the hero lands on it, then reappears.
 * @param {Object} k - Kaplay instance
 * @param {number} x - Center X of the platform
 * @param {number} y - Top surface Y of the platform
 * @param {Object} sound - Sound instance (for optional sfx)
 * @param {Object} hero - Hero instance
 */
function createForgetPlatform(k, x, y, sound, hero) {
  const state = {
    visible: true,
    heroOn: false,
    disappearTimer: FORGET_DISAPPEAR_DELAY,
    reappearTimer: 0,
    origY: y,
    floatOffset: Math.random() * Math.PI * 2,
    textOpacity: FORGET_OPACITY_NORMAL
  }
  //
  // Invisible physics body — narrower than the word label so its edges line
  // up with the visible glyphs instead of extending into empty space
  //
  const body = k.add([
    k.rect(FORGET_COLLISION_WIDTH, FORGET_PLATFORM_HEIGHT),
    k.pos(x - FORGET_COLLISION_WIDTH / 2, y),
    k.area(),
    k.body({ isStatic: true }),
    k.anchor('topleft'),
    k.opacity(0),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Text label as a pre-baked sprite (fill + black outline) — matches the
  // hidden-blades style and avoids per-frame drawText calls
  //
  const spriteInfo = getWordSpriteInfo(k, FORGET_WORD_TEXT, FORGET_FONT_SIZE, FORGET_TEXT_COLOR)
  const label = k.add([
    k.sprite(spriteInfo.key, { width: spriteInfo.w, height: spriteInfo.h }),
    k.pos(x, y + FORGET_PLATFORM_HEIGHT / 2),
    k.anchor('center'),
    k.z(CFG.visual.zIndex.platforms + 1),
    k.opacity(state.textOpacity)
  ])
  body.onUpdate(() => onUpdateForgetPlatform(k, body, label, state, hero))
  return { body, label, state }
}
//
// Manages the forget platform disappear / reappear lifecycle.
// Counts down while the hero stands on it, then hides off-screen, then restores.
//
function onUpdateForgetPlatform(k, body, label, state, hero) {
  if (state.dissolving) return
  if (!hero?.character?.exists?.()) return
  const heroX = hero.character.pos.x
  const heroY = hero.character.pos.y
  const inXRange = heroX > body.pos.x - 20 && heroX < body.pos.x + FORGET_COLLISION_WIDTH + 20
  const inYRange = Math.abs(heroY - body.pos.y) < 55
  state.heroOn = state.visible && inXRange && inYRange && hero.character.isGrounded()
  if (state.visible) {
    if (state.heroOn) {
      state.disappearTimer -= k.dt()
      const fading = state.disappearTimer < FORGET_WARN_THRESHOLD
      const targetOpacity = fading ? FORGET_OPACITY_FADING : FORGET_OPACITY_NORMAL
      label.opacity = targetOpacity
      if (state.disappearTimer <= 0) {
        state.visible = false
        state.reappearTimer = FORGET_REAPPEAR_DELAY
        state.disappearTimer = FORGET_DISAPPEAR_DELAY
        body.pos.y = -10000
        label.pos.y = -10000
        label.opacity = 0
      }
    } else {
      state.disappearTimer = FORGET_DISAPPEAR_DELAY
      label.opacity = FORGET_OPACITY_NORMAL
    }
  } else {
    state.reappearTimer -= k.dt()
    if (state.reappearTimer <= 0) {
      state.visible = true
      body.pos.y = state.origY
      label.pos.y = state.origY + FORGET_PLATFORM_HEIGHT / 2
      label.opacity = FORGET_OPACITY_NORMAL
    }
  }
  //
  // Gentle vertical float while visible (matches the time level 0 platforms)
  //
  if (state.visible) {
    state.floatOffset += k.dt() * PLATFORM_FLOAT_SPEED
    const floatY = Math.sin(state.floatOffset) * PLATFORM_FLOAT_AMP
    body.pos.y = state.origY + floatY
    label.pos.y = state.origY + FORGET_PLATFORM_HEIGHT / 2 + floatY
  }
}

/**
 * Creates the "calm" platform: a solid blue word the hero can stand on. While
 * standing, the ambient/eerie sound fades out, flying words turn green/harmless
 * (and read as pleasant words), the AAA blades become green non-lethal "UUU",
 * the monster turns green "happy" and stops walking, the brain shows a teeth
 * smile, the root-runner words go green, and the hero speaks pleasant phrases.
 * Once the ambient fully fades, the grey anti-hero turns red and is annihilable.
 * The platform can also be relocated left/right by the chaos swap outcome.
 * @param {Object} k - Kaplay instance
 * @param {number} rightX - Default (right-side) center X of the platform
 * @param {number} leftX - Alternate (left-side) center X for the swap anti-cheese
 * @param {number} y - Center Y of the platform (above the floor)
 * @param {Object} ctx - Calm context
 * @returns {Object} Calm platform inst with a relocate() helper
 */
function createCalmPlatform(k, rightX, leftX, y, ctx) {
  //
  // Measure the rendered "calm" width so the collision body hugs the word
  //
  const bodyWidth = measureWordWidth(k, CALM_WORD_TEXT, CALM_FONT_SIZE) + CALM_BODY_PAD
  //
  // Pre-bake both the blue (idle) and green (active) word sprites for swapping
  //
  const blueInfo = getWordSpriteInfo(k, CALM_WORD_TEXT, CALM_FONT_SIZE, CALM_TEXT_COLOR)
  const greenInfo = getWordSpriteInfo(k, CALM_WORD_TEXT, CALM_FONT_SIZE, CALM_MONSTER_COLOR)
  const state = {
    heroOn: false,
    audioProgress: 0,
    timer: CALM_TIMER_SECONDS,
    audioActive: false,
    completed: false,
    floatOffset: Math.random() * Math.PI * 2,
    timerLabel: null,
    body: null,
    x: rightX,
    rightX,
    leftX,
    y,
    bodyWidth,
    detectHalfW: bodyWidth / 2,
    side: 'right',
    monsterSnapshot: null,
    label: null,
    blueKey: blueInfo,
    greenKey: greenInfo,
    isGreen: false
  }
  //
  // Solid landing body — same construction as the chaos platform
  //
  const body = k.add([
    k.rect(bodyWidth, CALM_BODY_HEIGHT),
    k.pos(rightX - bodyWidth / 2, y - CALM_BODY_HEIGHT / 2),
    k.area(),
    k.body({ isStatic: true }),
    k.anchor('topleft'),
    k.opacity(0),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  state.body = body
  //
  // Word visual as a pre-baked sprite (blue fill + black outline)
  //
  const label = k.add([
    k.sprite(blueInfo.key, { width: blueInfo.w, height: blueInfo.h }),
    k.pos(rightX, y),
    k.anchor('center'),
    k.z(CFG.visual.zIndex.ui - 5)
  ])
  state.label = label
  //
  // Capture the true ambient base volumes once so calm fades restore exactly the
  // same levels afterwards (word.mp3 returns, glitch keeps its 0.6 base, etc.)
  //
  ctx.audioBase = {
    music: CFG.audio.backgroundMusic.word,
    breath: CFG.audio.backgroundMusic.breath ?? CFG.audio.backgroundMusic.word * 0.5,
    glitch: Sound.getGlitchSoundVolume(ctx.sound)
  }
  //
  // Restore ambient volumes to full at scene start — a previous run may have left
  // word.mp3/breath/glitch faded out, and startBackgroundMusic does not reset them
  //
  setCalmMurmurFade(ctx, 0)
  ctx.breathMusic && (ctx.breathMusic.volume = ctx.audioBase.breath)
  body.onUpdate(() => onUpdateCalmPlatform(k, state, ctx))
  return {
    state,
    relocate(side) {
      if (side === state.side) return
      state.side = side
      state.x = side === 'left' ? state.leftX : state.rightX
      body.pos.x = state.x - state.bodyWidth / 2
      label.pos.x = state.x
    }
  }
}
//
// Per-frame calm logic: float the platform gently, detect the hero standing on it,
// run the 10s meditation countdown (shown beside the hero), and fade the ambient.
// When the countdown completes the calm becomes permanent — the level stays green.
//
function onUpdateCalmPlatform(k, state, ctx) {
  if (state.dissolving) return
  const hero = ctx.hero
  if (!hero?.character?.exists?.()) return
  //
  // Gentle vertical float (matches the time level 0 platforms)
  //
  state.floatOffset += k.dt() * PLATFORM_FLOAT_SPEED
  const floatY = Math.sin(state.floatOffset) * PLATFORM_FLOAT_AMP
  const platformTop = state.y - CALM_BODY_HEIGHT / 2 + floatY
  state.body && (state.body.pos.y = platformTop)
  state.label && (state.label.pos.y = state.y + floatY)
  //
  // Detect the hero standing on the floated platform top
  //
  const heroX = hero.character.pos.x
  const heroFeetY = hero.character.pos.y + 34
  const inRange = Math.abs(heroX - state.x) < state.detectHalfW
  const onTop = inRange && hero.character.isGrounded() && Math.abs(heroFeetY - platformTop) < CALM_TOP_TOLERANCE
  //
  // Toggle the calm visuals on step on/off. Frozen once completed: the calm is
  // permanent (level stays green, hero's eyes stay open), so re-entering must NOT
  // re-run enterCalm — that would re-close the hero's eyes and corrupt its
  // run/jump animation when it walks off afterwards.
  //
  if (!state.completed && onTop !== state.heroOn) {
    state.heroOn = onTop
    if (onTop) enterCalm(k, state, ctx)
    else exitCalm(k, state, ctx)
  }
  //
  // Meditation countdown — runs only while standing, resets on stepping off
  //
  if (!state.completed) {
    if (onTop) {
      state.timer = Math.max(0, state.timer - k.dt())
      updateCalmTimer(k, state, hero)
      if (state.timer <= 0) completeCalm(k, state, ctx)
    } else if (state.timer !== CALM_TIMER_SECONDS) {
      state.timer = CALM_TIMER_SECONDS
      destroyCalmTimer(state)
    }
  }
  //
  // word.mp3 murmur + eerie glitch fade out while calming and stay muted once
  // completed; they restore quickly if the hero steps off before finishing.
  //
  const murmurCalm = state.completed || onTop
  const murmurRate = murmurCalm ? 1 / CALM_FADE_DURATION : 1 / CALM_AUDIO_RESTORE_TIME
  state.audioProgress = Math.max(0, Math.min(1, state.audioProgress + (murmurCalm ? 1 : -1) * k.dt() * murmurRate))
  setCalmMurmurFade(ctx, state.audioProgress)
  //
  // Meditation pad plays through the countdown, removed on completion / leave
  //
  const wantPad = onTop && !state.completed
  if (wantPad && !state.audioActive) {
    state.audioActive = true
    Sound.startCalmPad(ctx.sound)
    Sound.setCalmPadVolume(ctx.sound, 1)
  } else if (!wantPad && state.audioActive) {
    state.audioActive = false
    Sound.stopCalmPad(ctx.sound)
  }
  //
  // Breath eases from the calm swell down to silence across the countdown
  //
  setCalmBreath(ctx, state, onTop)
}
//
// Completes the meditation: keeps the level green, opens the hero's eyes, turns
// the anti-hero red, opens the brain's third eye (side eyes stay shut), and fully
// fades out the breath + meditation pad.
//
function completeCalm(k, state, ctx) {
  if (state.completed) return
  state.completed = true
  ctx.completed = true
  destroyCalmTimer(state)
  ctx.hero && Hero.setEyesClosed(ctx.hero, false)
  //
  // Keep both pits permanently closed now the calm is complete
  //
  ctx.pitsHeldClosed = true
  ctx.dreamingEyes && WordDreamingEyes.openThirdEye(ctx.dreamingEyes)
  //
  // Resonant awakening cue marking the moment the anti-hero comes alive; the
  // recolor below also plays the touch-L1 transform sound + sparkle burst.
  //
  ctx.sound && Sound.playCalmAwakeningSound(ctx.sound)
  onCalmComplete(k, ctx)
  //
  // Chaos becomes a plain green platform — no more random outcomes
  //
  ctx.confusionWord?.setPassiveGreen?.(k)
  //
  // Restore glitch gain so annihilation scatter/absorption SFX are audible
  //
  ctx.audioBase && Sound.setGlitchSoundVolume(ctx.sound, ctx.audioBase.glitch)
  if (state.audioActive) {
    state.audioActive = false
    Sound.stopCalmPad(ctx.sound)
  }
  ctx.breathMusic?.stop?.()
  settleHeroesOnFloor(k, ctx)
  beginCalmDissolve(k, ctx)
}
//
// Moves the hero and anti-hero onto the main bottom platform before word-only
// platforms are removed so they do not fall through the playfield.
//
function settleHeroesOnFloor(k, ctx) {
  const { hero, antiHero } = ctx
  hero?.character?.exists?.() && (hero.character.pos.y = HERO_SPAWN_Y)
  antiHero?.character?.exists?.() && (antiHero.character.pos.y = ANTIHERO_SPAWN_Y)
}
//
// Slowly fades every platform and word label out after calm completes, turns the
// monster into a swaying "friend", and schedules the solitude hint on the hero.
//
function beginCalmDissolve(k, ctx) {
  if (ctx.dissolve?.started) return
  ctx.dissolve = { started: true, progress: 0, hintScheduled: false }
  ctx.flyingWords && FlyingWords.beginDissolve(ctx.flyingWords, CALM_DISSOLVE_DURATION)
  ctx.consciousnessLayers && WordConsciousnessLayers.beginDissolveRootRunners(ctx.consciousnessLayers)
  ctx.consciousnessLayers && WordConsciousnessLayers.beginDissolveBackgroundWords(ctx.consciousnessLayers, CALM_DISSOLVE_DURATION)
  ctx.bladeInsts?.forEach(b => Blades.beginDissolve(b, CALM_DISSOLVE_DURATION))
  ctx.heroSpeech && WordHeroIdleSpeech.setCalm(ctx.heroSpeech, false)
  //
  // Monster becomes "friend" — stays in place with its idle sway/bounce animation
  //
  const bladeArm = ctx.bladeArm
  if (bladeArm) {
    bladeArm.calmStopped = true
    BladeArm.setWord(bladeArm, CALM_MONSTER_FRIEND_WORD, true, k.rgb(...parseHex(CALM_MONSTER_COLOR)))
  }
  //
  // Only word-based platforms fade out — structural floor/walls and moving pits stay
  //
  ctx.dissolveVisuals = []
  const calmState = ctx.calmState
  calmState && (calmState.dissolving = true)
  calmState?.label?.exists?.() && ctx.dissolveVisuals.push({ obj: calmState.label, base: calmState.label.opacity ?? 1 })
  calmState?.body?.exists?.() && ctx.dissolveVisuals.push({ obj: calmState.body, base: 0, isBody: true, destroyOnComplete: true })
  const forget = ctx.forgetPlatform
  forget?.state && (forget.state.dissolving = true)
  forget?.label?.exists?.() && ctx.dissolveVisuals.push({ obj: forget.label, base: forget.label.opacity ?? 1 })
  forget?.body?.exists?.() && ctx.dissolveVisuals.push({ obj: forget.body, base: 0, isBody: true, destroyOnComplete: true })
  const chaos = ctx.confusionWord
  chaos?.state && (chaos.state.dissolving = true)
  chaos?.obj?.exists?.() && ctx.dissolveVisuals.push({ obj: chaos.obj, base: 1 })
  chaos?.body?.exists?.() && ctx.dissolveVisuals.push({ obj: chaos.body, base: 0, isBody: true, destroyOnComplete: true })
}
//
// Per-frame dissolve progress for platform visuals and the post-dissolve hint
//
function onUpdateCalmDissolve(k, ctx) {
  const dissolve = ctx.dissolve
  if (!dissolve?.started || dissolve.complete) return
  dissolve.progress += k.dt() / CALM_DISSOLVE_DURATION
  const fade = Math.max(0, 1 - dissolve.progress)
  ctx.dissolveVisuals?.forEach(item => {
    if (!item.obj?.exists?.()) return
    item.obj.opacity = item.base > 0 ? item.base * fade : 0
    if (dissolve.progress >= 1 && item.isBody && item.destroyOnComplete) {
      item.obj.destroy()
    }
  })
  if (dissolve.progress >= 1) {
    dissolve.complete = true
    if (!dissolve.hintScheduled) {
      dissolve.hintScheduled = true
      k.wait(CALM_DISSOLVE_HINT_DELAY, () => {
        ctx.hero?.character?.exists?.() && spawnHintBubble(k, ctx.hero.character, CALM_DISSOLVE_HINT_TEXT, CALM_DISSOLVE_HINT_DURATION)
      })
    }
  }
}
//
// Creates/updates the small yellow (hero-coloured) countdown label shown to the
// upper-right of the hero while it meditates on the calm platform.
//
function updateCalmTimer(k, state, hero) {
  const seconds = Math.max(0, Math.ceil(state.timer))
  if (!state.timerLabel) {
    state.timerLabel = k.add([
      k.text(String(seconds), { size: CALM_TIMER_FONT_SIZE, font: CFG.visual.fonts.regularFull.replace(/'/g, '') }),
      k.pos(0, 0),
      k.anchor('center'),
      //
      // Match the hero's actual body colour (it varies with section progress —
      // yellow/orange/brown) so the countdown reads as the hero's own timer
      //
      k.color(...parseHex(hero.bodyColor || CFG.visual.colors.hero.body)),
      k.outline(1, k.rgb(0, 0, 0)),
      k.z(CFG.visual.zIndex.ui + 10)
    ])
  }
  state.timerLabel.text = String(seconds)
  state.timerLabel.pos.x = hero.character.pos.x + CALM_TIMER_OFFSET_X
  state.timerLabel.pos.y = hero.character.pos.y - CALM_TIMER_OFFSET_Y
}
//
// Removes the countdown label if present.
//
function destroyCalmTimer(state) {
  if (state.timerLabel) {
    state.timerLabel.destroy()
    state.timerLabel = null
  }
}
//
// Fades word.mp3 + the eerie glitch out (progress 1 = silent), restoring to base.
//
function setCalmMurmurFade(ctx, progress) {
  const base = ctx.audioBase
  if (!base) return
  const fade = 1 - progress
  Sound.setBackgroundMusicVolume(ctx.sound, base.music * fade)
  Sound.setGlitchSoundVolume(ctx.sound, base.glitch * fade)
}
//
// Breath volume: base level off the platform, swelling on entry, then easing down
// to silence as the countdown runs out (and fully off once completed).
//
function setCalmBreath(ctx, state, onTop) {
  const base = ctx.audioBase
  if (!base || !ctx.breathMusic) return
  let target
  if (state.completed) target = 0
  else if (onTop) target = base.breath * CALM_BREATH_MULT * (state.timer / CALM_TIMER_SECONDS)
  else target = base.breath
  ctx.breathMusic.volume = ctx.breathMusic.volume + (target - ctx.breathMusic.volume) * 0.12
}
//
// Applies the calm look: green harmless/pleasant words, green non-lethal "UUU"
// blades, a green "happy" monster that stops walking, the brain eyes shut closed,
// green root runners, and pleasant hero phrases. Snapshots the monster for exit.
//
function enterCalm(k, state, ctx) {
  //
  // The calm word itself turns green while the hero stands on it
  //
  if (state.label?.exists?.() && !state.isGreen) {
    state.isGreen = true
    state.label.use(k.sprite(state.greenKey.key, { width: state.greenKey.w, height: state.greenKey.h }))
  }
  ctx.flyingWords && FlyingWords.setHarmless(ctx.flyingWords, true)
  ctx.hero && Hero.setEyesClosed(ctx.hero, true)
  //
  // Hold both pits closed so they can't open under the calm hero
  //
  ctx.pitsHeldClosed = true
  ctx.dreamingEyes && WordDreamingEyes.setEyesClosed(ctx.dreamingEyes, true)
  ctx.heroSpeech && WordHeroIdleSpeech.setCalm(ctx.heroSpeech, true)
  ctx.consciousnessLayers && WordConsciousnessLayers.setRootRunnerColor(ctx.consciousnessLayers, k.rgb(...parseHex(CALM_MONSTER_COLOR)))
  //
  // Turn the lethal AAA blades into harmless green UUU
  //
  ctx.bladeInsts?.forEach(b => Blades.setCalmMode(b, true, CALM_MONSTER_COLOR))
  const bladeArm = ctx.bladeArm
  if (bladeArm) {
    if (!state.monsterSnapshot) {
      const mainText = bladeArm.textObjects[bladeArm.textObjects.length - 1]
      state.monsterSnapshot = {
        text: mainText?.text ?? 'fear',
        isFriend: bladeArm.isFriend,
        color: bladeArm.bladeColor
      }
    }
    BladeArm.setWord(bladeArm, CALM_MONSTER_WORD, true, k.rgb(...parseHex(CALM_MONSTER_COLOR)))
    bladeArm.calmStopped = true
  }
}
//
// Reverts the calm look when the hero steps off (sounds restore via progress).
//
function exitCalm(k, state, ctx) {
  //
  // Revert the calm word back to its blue idle sprite
  //
  if (state.label?.exists?.() && state.isGreen) {
    state.isGreen = false
    state.label.use(k.sprite(state.blueKey.key, { width: state.blueKey.w, height: state.blueKey.h }))
  }
  ctx.flyingWords && FlyingWords.setHarmless(ctx.flyingWords, false)
  ctx.hero && Hero.setEyesClosed(ctx.hero, false)
  //
  // Release the pits back to their normal hero trap (only reached pre-completion)
  //
  ctx.pitsHeldClosed = false
  ctx.dreamingEyes && WordDreamingEyes.setEyesClosed(ctx.dreamingEyes, false)
  ctx.heroSpeech && WordHeroIdleSpeech.setCalm(ctx.heroSpeech, false)
  ctx.consciousnessLayers && WordConsciousnessLayers.setRootRunnerColor(ctx.consciousnessLayers, null)
  ctx.bladeInsts?.forEach(b => Blades.setCalmMode(b, false, CALM_MONSTER_COLOR))
  //
  // Restore the monster's lethal "fear" word/colour and let it walk again
  //
  const bladeArm = ctx.bladeArm
  const snap = state.monsterSnapshot
  if (bladeArm && snap) {
    BladeArm.setWord(bladeArm, snap.text, snap.isFriend, snap.color)
    state.monsterSnapshot = null
  }
  bladeArm && (bladeArm.calmStopped = false)
}
//
// Calm fully achieved: turn the grey anti-hero red (touch level 1 style) and
// allow it to be annihilated to finish the level.
//
function onCalmComplete(k, ctx) {
  const { hero, antiHero } = ctx
  antiHero?.character?.exists?.() && Hero.recolorAntiHero(antiHero, ANTIHERO_RED_COLOR)
  hero && (hero.annihilationLocked = false)
}
//
// When the monster is friendly (green, after being shot with a kind word) and the
// hero stands on its back, the hero is carried along with it. The wrap-around
// teleport is ignored via the per-frame move guard so the hero is not dragged off.
//
function updateMonsterRide(hero, bladeArm, ride) {
  const area = bladeArm?.collisionArea
  if (!area?.exists?.() || !hero?.character?.exists?.()) return
  const dx = area.pos.x - ride.lastX
  ride.lastX = area.pos.x
  const monsterTop = area.pos.y - area.height / 2
  const heroFeetY = hero.character.pos.y + 34
  const onBack = bladeArm.isFriend
    && hero.character.isGrounded()
    && heroFeetY > monsterTop - 12
    && heroFeetY < monsterTop + MONSTER_RIDE_TOLERANCE
    && Math.abs(hero.character.pos.x - area.pos.x) < bladeArm.textWidth / 2 + 20
  //
  // The monster body is tagged as a creature, not a platform, so the hero's
  // canJump flag is never reset while standing on it. Force it here so the hero
  // can jump off the monster's back — at the same height as a normal ground jump.
  //
  onBack && (hero.canJump = true)
  //
  // Carry the hero horizontally with the monster (ignoring the wrap teleport)
  //
  onBack && Math.abs(dx) <= MONSTER_RIDE_WRAP_GUARD && (hero.character.pos.x += dx)
}
//
// Grey anti-hero touch: inert until calmed — only shows the calm hint.
//
function onGrayAntiHeroTouch(k, hero, antiHero) {
  if (!hero.annihilationLocked) return
  if (hero.isAnnihilating || hero.isDying) return
  if (LevelHelp.isAnyPanelOpen() || LifeDeduction.isActive()) return
  showCalmHint(k, antiHero.character)
}
//
// Standard white speech-bubble hint shown above a character (grey anti-hero or a
// decoy) when touched, reusing the shared tooltip so it matches every other level.
// Throttled so repeated collisions do not stack bubbles; auto-destroys after the
// hint duration.
//
function showCalmHint(k, charObj) {
  if (!charObj?.exists?.()) return
  const now = k.time()
  if (now - lastCalmHintTime < CALM_HINT_DURATION) return
  lastCalmHintTime = now
  spawnHintBubble(k, charObj, CALM_HINT_TEXT, CALM_HINT_DURATION)
}
//
// Spawns a forced-visible white speech bubble above a character for `duration`
// seconds, then destroys it. Shared by the grey-hint and the calm "ready" hint.
//
function spawnHintBubble(k, charObj, text, duration) {
  if (!charObj?.exists?.()) return
  const target = {
    x: () => charObj.pos.x,
    y: () => charObj.pos.y,
    width: 1,
    height: 1,
    text,
    offsetY: -70
  }
  const tip = Tooltip.create({ k, targets: [target], forceVisible: true })
  //
  // forceVisible skips hover detection, so populate the render state manually
  //
  tip.activeTarget = target
  tip.frozenX = charObj.pos.x
  tip.frozenY = charObj.pos.y
  tip.opacity = 1
  k.wait(duration, () => tip && Tooltip.destroy(tip))
}

/**
 * Show letter throwing instructions (shown only first 2 times)
 * @param {Object} k - Kaplay instance
 */
function showLetterInstructions(k) {
  let showCount = get('word.level4LetterInstructionsCount', 0)
  if (showCount >= INSTRUCTIONS_SHOW_MAX) return
  set('word.level4LetterInstructionsCount', showCount + 1)
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

