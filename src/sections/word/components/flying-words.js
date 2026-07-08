import { CFG, getConsciousnessColor, getLevelColors, atmosphericDepthColor } from '../cfg.js'
import { getColor, getRGB } from '../../../utils/helper.js'
import * as LevelHelp from '../../../utils/lesson-help.js'
import * as LifeDeduction from '../../touch/utils/life-deduction.js'

//
// Tracks the last time onUpdate() was called. Entities with k.stay() use this to know
// whether they are currently inside a word-level scene. When the value is stale by more
// than WORD_LEVEL_TIMEOUT seconds we assume the player is on the menu or another scene
// and skip rendering / zero-out opacity so nothing bleeds through.
//
let lastOnUpdateTime = -9999
const WORD_LEVEL_TIMEOUT = 0.12
//
// Seconds of spawn grace period at the start of each word level during which
// killer letters cannot harm the hero (gives the player time to orient).
//
const SPAWN_GRACE_DURATION = 2.0

//
// Spawn buffer: distance outside playable area where words can spawn/respawn
//
const SPAWN_BUFFER = 100
//
// Drop shadow of killer words (single black copy offset right+down) — the
// same text shadow style the glow level uses.
//
const WORD_OUTLINE_SIZE = 1.2
const WORD_OUTLINE_OFFSETS = [
  [WORD_OUTLINE_SIZE, WORD_OUTLINE_SIZE]
]
//
// Killer word color pulse
//
const FLYING_WORD_DRAW_OPACITY = 1
const REGULAR_WORD_OPACITY = 0.62
//
// Deeper background layer (isBehindHero) is BRIGHTER — less depth-blended toward playfield
// Foreground layer is slightly more muted (higher depth = more blend)
//
const FLYING_WORD_DEPTH_NEAR = 0.44
const FLYING_WORD_DEPTH_FAR = 0.16
const FLYING_WORD_EDGE_DEPTH_BOOST = 0.62
//
// Gentle tilt speed — words drift slowly so the angle is clearly visible, not a blur
//
const WORD_ROTATION_SPEED_RANGE = 22
//
// Killer letters render in front of large background heroes, behind main player
//
const KILLER_LETTER_Z = (CFG.visual.zIndex.player ?? 10) - 0.8
const KILLER_COLOR_PULSE_SPEED = 2.8
const KILLER_COLOR_PULSE_AMOUNT = 0.22
//
// Calm "harmless" tint — every word turns this soft green and stops killing
// while the hero stands on the calm platform (word level 4)
//
const HARMLESS_WORD_COLOR = { r: 107, g: 203, b: 119 }   // #6BCB77
//
// Speed of the eased fade in/out of the calm green tint (blend units per second)
//
const HARMLESS_BLEND_SPEED = 1.8
//
// Kind words shown on the killer letters while the calm platform is active
//
const PLEASANT_WORDS = ['joy', 'happy', 'calm', 'hope', 'love', 'peace', 'smile', 'kind', 'warm', 'free', 'light', 'glad']

//
// Words and fragments related to pain, self-discovery, and introspection
//
const WORDS = [
  'pain', 'hurt', 'ache', 'fear', 'doubt', 'lost', 'dark',
  'void', 'empty', 'cold', 'numb', 'alone', 'torn', 'break',
  'cut', 'bleed', 'scar', 'wound', 'grief', 'cry', 'fall',
  'sink', 'drown', 'fade', 'die', 'end', 'why', 'how',
  'who', 'am', 'I', '...', 'no', 'never', 'can\'t', 'won\'t'
]

//
// Individual letters for atmospheric effect
//
const LETTERS = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  '?', '!', '.', ',', '-', '\'', '"'
]

//
// Killer words that hurt the player on collision
//
const KILLER_WORDS = [
  'death', 'end', 'bleed', 'cut', 'kill', 'break', 'cease', 'drop'
]

/**
 * Creates flying words system for atmospheric effect
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {string} cfg.color - Text color in hex format
 * @param {Object} [cfg.hero] - Hero instance for killer word collision
 * @param {string} [cfg.currentLevel] - Current level name for restart
 * @param {Function} [cfg.onDeath] - Callback when hero dies from killer word
 * @param {number} [cfg.wordCount=1440] - Number of words to create
 * @param {number} [cfg.killerLetterCount=2] - Number of killer words (default: 2)
 * @param {number} [cfg.minSpeed=3200] - Minimum horizontal speed
 * @param {number} [cfg.maxSpeed=4800] - Maximum horizontal speed
 * @param {number} [cfg.minSize=18] - Minimum font size
 * @param {number} [cfg.maxSize=30] - Maximum font size
 * @param {number} [cfg.rotationSpeedZ=480] - Maximum Z-axis rotation speed (degrees per second)
 * @param {number} [cfg.letterToWordRatio=0.8] - Ratio of letters to words (0.8 = 80% letters, 20% words)
 * @param {Object} [cfg.customBounds] - Custom playable area bounds {left, right, top, bottom}
 * @param {string[]} [cfg.killerWords] - Override killer word list (defaults to global KILLER_WORDS)
 * @returns {Object} Flying words instance
 */
export function create(cfg) {
  const {
    k,
    color,
    hero = null,
    currentLevel = null,
    onDeath = null,
    wordCount = 40,
    killerLetterCount = 1,
    minSpeed = 50,
    maxSpeed = 150,
    minSize = 20,
    maxSize = 28,
    rotationSpeedZ = 150,
    letterToWordRatio = 0.75,
    customBounds = null,
    killerWords = null,
    //
    // When false the atmospheric drifting words are hidden (word level 4 keeps
    // only the killer letters + root runners on a calm-able background)
    //
    showRegularWords = true
  } = cfg

  //
  // Custom bounds must be provided
  //
  if (!customBounds) {
    throw new Error('FlyingWords.create() requires customBounds parameter')
  }
  
  //
  // Check if flying words already exist (from previous level run)
  // Store instance in a global variable to persist across restarts
  //
  if (!k.flyingWordsInstance) {
    k.flyingWordsInstance = null
  }
  
  if (k.flyingWordsInstance) {
    //
    // Instance already exists, just update bounds and hero reference
    //
    k.flyingWordsInstance.playableLeft = customBounds.left
    k.flyingWordsInstance.playableRight = customBounds.right
    k.flyingWordsInstance.playableTop = customBounds.top
    k.flyingWordsInstance.playableBottom = customBounds.bottom
    k.flyingWordsInstance.hero = hero
    k.flyingWordsInstance.currentLevel = currentLevel
    k.flyingWordsInstance.onDeath = onDeath
    k.flyingWordsInstance.playfieldHex = resolvePlayfieldHex(cfg)
    //
    // Reset spawn grace timer so the hero is protected at the start of every level
    //
    k.flyingWordsInstance.spawnProtectionTimer = SPAWN_GRACE_DURATION
    //
    // Clear any calm "harmless" state left over from a previous run
    //
    k.flyingWordsInstance.harmless = false
    k.flyingWordsInstance.harmlessBlend = 0
    restoreKillerWords(k.flyingWordsInstance)
    k.flyingWordsInstance.showRegularWords = showRegularWords
    return k.flyingWordsInstance
  }
  
  const playableLeft = customBounds.left
  const playableRight = customBounds.right
  const playableTop = customBounds.top
  const playableBottom = customBounds.bottom
  const playfieldHex = resolvePlayfieldHex(cfg)

  const words = []
  const killerLetters = []
  //
  // Z-index for regular flying words draw entity
  //
  const wordZIndex = CFG.visual.zIndex.wordFlyingWords ?? CFG.visual.zIndex.flyingWords

  //
  // Create initial words (half behind hero, half in front)
  //
  for (let i = 0; i < wordCount; i++) {
    const isBehindHero = i < wordCount / 2
    const word = createWord(k, {
      color,
      minSpeed,
      maxSpeed,
      minSize,
      maxSize,
      playableTop,
      playableBottom,
      playableLeft,
      playableRight,
      initialSpawn: true,
      isBehindHero,
      rotationSpeedZ,
      letterToWordRatio,
      isKiller: false,
      playfieldHex
    })
    words.push(word)
  }
  
  //
  // Create killer words if hero is provided
  //
  if (hero && currentLevel) {
    for (let i = 0; i < killerLetterCount; i++) {
      const killerLetter = createKillerLetter(k, {
        hero,
        currentLevel,
        onDeath,
        minSpeed,
        maxSpeed,
        minSize: maxSize,  // Killer words are larger
        maxSize: maxSize + 8,
        playableTop,
        playableBottom,
        playableLeft,
        playableRight,
        initialSpawn: false,  // Always spawn from left (off-screen)
        rotationSpeedZ,
        killerWords
      })
      killerLetters.push(killerLetter)
    }
  }

  const inst = {
    k,
    words,
    killerLetters,
    hero,
    currentLevel,
    onDeath,
    //
    // Countdown in seconds; killer letters cannot harm the hero while > 0.
    // Reset to SPAWN_GRACE_DURATION each time a new level session starts.
    //
    spawnProtectionTimer: SPAWN_GRACE_DURATION,
    //
    // When true every word turns green and killer letters cannot harm the hero
    // (set by the calm platform in word level 4)
    //
    harmless: false,
    //
    // Eased 0→1 blend toward the harmless green tint (smooth calm transition)
    //
    harmlessBlend: 0,
    //
    // Hides the atmospheric drifting words while still drawing killer letters
    //
    showRegularWords,
    color,
    minSpeed,
    maxSpeed,
    minSize,
    maxSize,
    playableTop,
    playableBottom,
    playableLeft,
    playableRight,
    rotationSpeedZ,
    letterToWordRatio,
    playfieldHex
  }
  k.flyingWordsInstance = inst

  //
  // Single draw entity renders all regular (non-killer) words each frame via k.drawText.
  // Replaces 22 separate k.text game objects — eliminates per-entity overhead in Kaplay's
  // entity loop while keeping the same visual result. Uses k.stay() to persist across
  // scene restarts (same lifecycle as the killer-letter entities below).
  //
  k.add([
    k.z(wordZIndex),
    k.fixed(),
    k.stay(),
    'flying-words-draw',
    {
      draw() {
        const currentInst = k.flyingWordsInstance
        if (!currentInst) return
        if (currentInst.showRegularWords === false) return
        const inWordLevel = k.time() - lastOnUpdateTime < WORD_LEVEL_TIMEOUT
        if (!inWordLevel) return
        for (const word of currentInst.words) {
          if (word.scaleX < 0.05) continue
          k.pushTransform()
          k.pushTranslate(k.vec2(word.x, word.y))
          k.pushScale(word.scaleX, 1)
          k.drawText({
            text: word.text,
            size: word.size,
            font: word.fontFamily,
            anchor: 'center',
            pos: k.vec2(0, 0),
            angle: word.angle,
            color: word.color,
            opacity: word.opacity * (currentInst.dissolveOpacity ?? 1)
          })
          k.popTransform()
        }
      }
    }
  ])

  return inst
}

/**
 * Updates flying words animation
 * @param {Object} inst - Flying words instance
 */
export function onUpdate(inst) {
  const { words, killerLetters } = inst
  //
  // Refresh scene-presence timestamp so persistent killer-word entities know we are
  // currently inside a word-level (not on the menu or another scene).
  //
  lastOnUpdateTime = inst.k.time()
  //
  // Count down spawn grace period so killer letters are harmless for the first 2 s
  //
  inst.spawnProtectionTimer > 0 && (inst.spawnProtectionTimer -= inst.k.dt())
  //
  // Calm dissolve — fade everything out and stop motion until gone
  //
  if (inst.dissolving) {
    inst.dissolveOpacity = Math.max(0, inst.dissolveOpacity - inst.k.dt() / inst.dissolveDuration)
    killerLetters?.forEach(letter => {
      letter.textObj?.exists?.() && (letter.textObj.opacity = inst.dissolveOpacity)
    })
    if (inst.dissolveOpacity <= 0) {
      inst.dissolving = false
      inst.showRegularWords = false
      killerLetters?.forEach(letter => letter.textObj?.exists?.() && letter.textObj.destroy())
      inst.killerLetters.length = 0
      inst.words.length = 0
    }
    return
  }

  //
  // Update regular words
  //
  words.forEach(word => {
    updateWord(word, inst)
  })
  
  //
  // Update killer words
  //
  if (killerLetters && killerLetters.length > 0) {
    killerLetters.forEach(letter => {
      updateKillerLetter(letter, inst)
    })
  }
  //
  // Ease the green calm tint in/out and apply it once it is meaningfully visible
  //
  const target = inst.harmless ? 1 : 0
  if (inst.harmlessBlend !== target) {
    const step = HARMLESS_BLEND_SPEED * inst.k.dt()
    const diff = target - inst.harmlessBlend
    inst.harmlessBlend += Math.sign(diff) * Math.min(Math.abs(diff), step)
  }
  inst.harmlessBlend > 0.001 && applyHarmlessTint(inst, inst.harmlessBlend)
}

/**
 * Toggles the calm state: green tint + non-lethal killer letters. While calm the
 * killer letters also read as pleasant words; they revert when calm ends.
 * @param {Object} inst - Flying words instance
 * @param {boolean} harmless - True to make all words green and harmless
 */
export function setHarmless(inst, harmless) {
  if (inst.harmless === harmless) return
  inst.harmless = harmless
  harmless ? swapKillerWords(inst) : restoreKillerWords(inst)
}

/**
 * Slowly fades all flying and killer words out and stops their motion. Used when
 * the word level 4 calm meditation completes so the playfield empties peacefully.
 * @param {Object} inst - Flying words instance
 * @param {number} duration - Seconds until fully gone
 */
export function beginDissolve(inst, duration) {
  if (!inst || inst.dissolving) return
  inst.dissolving = true
  inst.dissolveDuration = duration
  inst.dissolveOpacity = 1
}
//
// Blends all regular and killer words toward the harmless green by `blend` (0–1),
// so the transition is gradual rather than an instant recolour.
//
function applyHarmlessTint(inst, blend) {
  const { r, g, b } = HARMLESS_WORD_COLOR
  inst.words.forEach(word => {
    if (!word.color) return
    word.color.r += (r - word.color.r) * blend
    word.color.g += (g - word.color.g) * blend
    word.color.b += (b - word.color.b) * blend
  })
  inst.killerLetters.forEach(letter => {
    const c = letter.textObj
    if (!c?.exists?.()) return
    c.color.r += (r - c.color.r) * blend
    c.color.g += (g - c.color.g) * blend
    c.color.b += (b - c.color.b) * blend
  })
}
//
// Swaps each killer letter's word to a random pleasant word (storing the original)
//
function swapKillerWords(inst) {
  inst.killerLetters.forEach(letter => {
    if (!letter.textObj?.exists?.()) return
    letter._origText = letter._origText ?? letter.textObj.text
    letter.textObj.text = PLEASANT_WORDS[Math.floor(Math.random() * PLEASANT_WORDS.length)]
  })
}
//
// Restores each killer letter's original (lethal) word after calm ends
//
function restoreKillerWords(inst) {
  inst.killerLetters?.forEach(letter => {
    letter.textObj?.exists?.() && letter._origText !== undefined && (letter.textObj.text = letter._origText)
  })
}

/**
 * Updates a single word animation
 * @param {Object} word - Word object
 * @param {Object} inst - Flying words instance
 */
function updateWord(word, inst) {
  const { k, playableRight, playableLeft, playableTop, playableBottom } = inst
  
    //
    // Update horizontal position (constant wind to the right)
    //
    word.x += word.speedX * k.dt()

    //
    // Realistic falling motion with subtle flutter
    // Leaves fall down with slight variations, not pure sine wave
    //
    word.wavePhase += word.waveSpeed * k.dt()

    //
    // Combine downward drift with subtle horizontal wobble
    // Main motion: strong horizontal wind (right)
    // Secondary motion: slight vertical fall and horizontal flutter
    //
    const flutter = Math.sin(word.wavePhase) * word.waveAmplitude * 0.2
    const fallSpeed = word.speedY + Math.abs(Math.sin(word.wavePhase * 0.5)) * 5

    word.x += flutter * k.dt()
    word.y += fallSpeed * k.dt()

    //
    // Update 2D rotation (spinning in plane) - leaves tumble as they fall
    // Smoothly change rotation direction over time with random targets
    //
    if (!word.rotationTargetModifier) {
      word.rotationTargetModifier = (Math.random() - 0.5) * 2  // -1 to +1
      word.rotationCurrentModifier = word.rotationTargetModifier
      word.rotationChangeTimer = 0
      word.rotationChangeDuration = 2 + Math.random() * 3  // 2-5 seconds between changes
    }
    
    word.rotationChangeTimer += k.dt()
    
    //
    // Time to pick a new random target
    //
    if (word.rotationChangeTimer >= word.rotationChangeDuration) {
      word.rotationTargetModifier = (Math.random() - 0.5) * 2  // New random target -1 to +1
      word.rotationChangeTimer = 0
      word.rotationChangeDuration = 2 + Math.random() * 3  // New random duration
    }
    
    //
    // Smoothly interpolate towards target
    //
    const lerpSpeed = 0.5  // Smooth transition speed
    word.rotationCurrentModifier += (word.rotationTargetModifier - word.rotationCurrentModifier) * lerpSpeed * k.dt()
    
    const currentRotationSpeed = word.rotationSpeed * (1 + word.rotationCurrentModifier * 0.7)
    
    word.rotation += currentRotationSpeed * k.dt()
    word.angle = word.rotation

    //
    // Update 3D rotation (turning to face viewer) - realistic tumbling
    // Smoothly change Z rotation direction over time with random targets
    //
    if (!word.rotationZTargetModifier) {
      word.rotationZTargetModifier = (Math.random() - 0.5) * 2  // -1 to +1
      word.rotationZCurrentModifier = word.rotationZTargetModifier
      word.rotationZChangeTimer = 0
      word.rotationZChangeDuration = 2 + Math.random() * 3  // 2-5 seconds between changes
    }
    
    word.rotationZChangeTimer += k.dt()
    
    //
    // Time to pick a new random target
    //
    if (word.rotationZChangeTimer >= word.rotationZChangeDuration) {
      word.rotationZTargetModifier = (Math.random() - 0.5) * 2  // New random target -1 to +1
      word.rotationZChangeTimer = 0
      word.rotationZChangeDuration = 2 + Math.random() * 3  // New random duration
    }
    
    //
    // Smoothly interpolate towards target
    //
    const lerpSpeedZ = 0.4  // Smooth transition speed (slightly slower for Z)
    word.rotationZCurrentModifier += (word.rotationZTargetModifier - word.rotationZCurrentModifier) * lerpSpeedZ * k.dt()
    
    const currentRotationSpeedZ = word.rotationSpeedZ * (1 + word.rotationZCurrentModifier * 0.8)

    word.rotationZ += currentRotationSpeedZ * k.dt()
    const zRotRad = word.rotationZ * Math.PI / 180
    const scaleX = Math.abs(Math.cos(zRotRad))

    word.scaleX = Math.max(0.05, scaleX)

    //
    // Edge-on rotation blends toward playfield instead of fading alpha
    // Killer words keep accent pulse — no phrase depth blend
    //
    !word.isKiller && applyFlyingWordDepthColor(word, k, scaleX, inst.playfieldHex)

    //
    // Respawn logic: if word exits right or bottom (+ 100px buffer), respawn at left
    //
    const approximateWordWidth = 150

    if (word.x > playableRight + SPAWN_BUFFER || word.y > playableBottom + SPAWN_BUFFER) {
      //
      // Respawn at left, 100px before playable area
      // Y position: random from top-100px to bottom
      //
      word.x = playableLeft - SPAWN_BUFFER - Math.random() * approximateWordWidth
      word.y = playableTop - SPAWN_BUFFER + Math.random() * (playableBottom - playableTop + SPAWN_BUFFER)
      //
      // Randomize properties for variety
      //
      word.speedX = inst.minSpeed + Math.random() * (inst.maxSpeed - inst.minSpeed)
      word.speedY = 2 + Math.random() * 8
      word.rotation = Math.random() * 360
      word.rotationSpeed = (Math.random() - 0.5) * 120
      word.rotationZ = Math.random() * 360
      word.rotationSpeedZ = (Math.random() - 0.5) * inst.rotationSpeedZ
      word.wavePhase = Math.random() * Math.PI * 2
    }

  //
  // Subtle color pulse on killer words
  //
  word.isKiller && pulseKillerColor(word, inst)

  //
  // Sync position, angle and scale back to the Kaplay game object for killer letters.
  // Regular words have no textObj — they are rendered by the shared draw entity.
  //
  if (word.textObj) {
    word.textObj.pos.x = word.x
    word.textObj.pos.y = word.y
    word.textObj.angle = word.angle
    if (!word.textObj.scale) word.textObj.scale = k.vec2(1, 1)
    word.textObj.scale.x = word.scaleX
  }
}

/**
 * Updates a single killer word animation
 * @param {Object} letter - Killer word object
 * @param {Object} inst - Flying words instance
 */
function updateKillerLetter(letter, inst) {
  const { k, playableLeft, playableTop, playableBottom } = inst
  
  //
  // Check if word needs respawn (after killing hero)
  //
  if (letter.needsRespawn) {
    //
    // Reset position to spawn point (left side, off-screen)
    //
    const approximateWordWidth = 150
    const spawnDistanceLeft = SPAWN_BUFFER
    const x = playableLeft - spawnDistanceLeft - Math.random() * approximateWordWidth
    const y = playableTop - SPAWN_BUFFER + Math.random() * (playableBottom - playableTop + SPAWN_BUFFER)
    
    letter.textObj.pos.x = x
    letter.textObj.pos.y = y
    //
    // Keep plain-object coords in sync for killer letters (textObj is authoritative)
    //
    letter.x = x
    letter.y = y
    //
    // Reset spawn delay
    //
    letter.spawnDelay = CFG.visual.killerWords.spawnDelay
    letter.needsRespawn = false
    return
  }
  
  //
  // Initialize spawn delay timer if not set
  //
  if (letter.spawnDelay === undefined) {
    letter.spawnDelay = CFG.visual.killerWords.spawnDelay
  }
  
  //
  // Count down spawn delay
  //
  if (letter.spawnDelay > 0) {
    letter.spawnDelay -= k.dt()
    return  // Don't move until delay is over
  }
  
  //
  // After delay, use the same update logic as regular words
  //
  updateWord(letter, inst)
}

/**
 * Creates a single flying word
 * @param {Object} k - Kaplay instance
 * @param {Object} params - Word parameters
 * @returns {Object} Word object
 */
function createWord(k, params) {
  const {
    color,
    minSpeed,
    maxSpeed,
    minSize,
    maxSize,
    playableTop,
    playableBottom,
    playableLeft,
    playableRight,
    initialSpawn,
    isBehindHero,
    rotationSpeedZ,
    letterToWordRatio = 0.8
  } = params

  //
  // Use letterToWordRatio to determine if it's a letter or word
  //
  const isLetter = Math.random() < letterToWordRatio
  const text = isLetter
    ? LETTERS[Math.floor(Math.random() * LETTERS.length)]
    : WORDS[Math.floor(Math.random() * WORDS.length)]

  //
  // Size varies based on depth (behind = smaller, front = larger)
  // Behind: 60-80% of size range, Front: 100-140% of size range
  //
  const sizeMultiplier = isBehindHero
    ? 0.6 + Math.random() * 0.2  // 0.6-0.8
    : 1.0 + Math.random() * 0.4  // 1.0-1.4
  const baseSize = minSize + Math.random() * (maxSize - minSize)
  const size = baseSize * sizeMultiplier

  const speedX = minSpeed + Math.random() * (maxSpeed - minSpeed)
  const speedY = 2 + Math.random() * 8  // Very slow falling down (2-10 px/s) - minimal vertical drift

  //
  // Spawn position: always start from left side, 100px before playable area
  // Y position: from top of playable area + 100px above to bottom of playable area
  //
  const approximateWordWidth = 150
  const spawnDistanceLeft = SPAWN_BUFFER
  
  let x, y
  if (initialSpawn) {
    //
    // Initial spawn: distribute evenly across the path from left spawn point to playable area
    //
    x = playableLeft - spawnDistanceLeft + Math.random() * (spawnDistanceLeft + playableRight - playableLeft)
    y = playableTop - SPAWN_BUFFER + Math.random() * (playableBottom - playableTop + SPAWN_BUFFER)
  } else {
    //
    // Regular spawn: always from left, 100px before playable area
    //
    x = playableLeft - spawnDistanceLeft - Math.random() * approximateWordWidth
    y = playableTop - SPAWN_BUFFER + Math.random() * (playableBottom - playableTop + SPAWN_BUFFER)
  }

  //
  // Depth based on layer — color shift toward playfield, not alpha
  //
  const depthBase = isBehindHero ? FLYING_WORD_DEPTH_FAR : FLYING_WORD_DEPTH_NEAR
  const playfieldHex = params.playfieldHex ?? getConsciousnessColor('gameWorld')
  const phraseColor = pickPhraseColor(isBehindHero, playfieldHex)
  const fontFamily = CFG.visual.fonts.regularFull.replace(/'/g, '')
  //
  // Pre-compute the two color endpoints used for edge-on depth blending.
  // Avoids hex-string math in the per-frame applyFlyingWordDepthColor call.
  //
  const colorNear = getRGB(k, atmosphericDepthColor(phraseColor, playfieldHex, depthBase))
  const colorFar = getRGB(k, atmosphericDepthColor(phraseColor, playfieldHex, Math.min(1, depthBase + FLYING_WORD_EDGE_DEPTH_BOOST)))
  //
  // Plain JS object — rendered by the shared draw entity instead of Kaplay's entity system.
  // Eliminates per-word WebGL overhead without changing any visible behavior.
  //
  return {
    x,
    y,
    text,
    size,
    angle: 0,
    scaleX: 1,
    opacity: REGULAR_WORD_OPACITY,
    color: k.rgb(colorNear.r, colorNear.g, colorNear.b),
    colorNear,
    colorFar,
    fontFamily,
    phraseColor,
    speedX,
    speedY,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * WORD_ROTATION_SPEED_RANGE,
    rotationZ: Math.random() * 360,
    rotationSpeedZ: (Math.random() - 0.5) * rotationSpeedZ,
    wavePhase: Math.random() * Math.PI * 2,
    waveSpeed: 1.5 + Math.random() * 2,
    waveAmplitude: 8 + Math.random() * 12,
    depthBase,
    isBehindHero,
    isLetter,
    sizeMultiplier
  }
}

/**
 * Resets word to start position
 * @param {Object} word - Word object
 * @param {Object} inst - Flying words instance
 * @param {number} x - New X position
 */
function resetWord(word, inst, x) {
  const { playableTop, playableBottom, minSpeed, maxSpeed, minSize, maxSize, rotationSpeedZ, letterToWordRatio } = inst

  //
  // Use letterToWordRatio to determine if it's a letter or word
  //
  word.isLetter = Math.random() < letterToWordRatio
  const text = word.isLetter
    ? LETTERS[Math.floor(Math.random() * LETTERS.length)]
    : WORDS[Math.floor(Math.random() * WORDS.length)]

  //
  // Size varies based on depth
  //
  word.sizeMultiplier = word.isBehindHero
    ? 0.6 + Math.random() * 0.2  // 0.6-0.8
    : 1.0 + Math.random() * 0.4  // 1.0-1.4
  const baseSize = minSize + Math.random() * (maxSize - minSize)
  const size = baseSize * word.sizeMultiplier

  //
  // Depth based on layer — color shift instead of transparency
  //
  word.depthBase = word.isBehindHero ? FLYING_WORD_DEPTH_FAR : FLYING_WORD_DEPTH_NEAR
  word.phraseColor = pickPhraseColor(word.isBehindHero, inst.playfieldHex)

  word.x = x
  word.y = playableTop + Math.random() * (playableBottom - playableTop)
  word.speedX = minSpeed + Math.random() * (maxSpeed - minSpeed)
  word.speedY = 2 + Math.random() * 8
  word.rotation = Math.random() * 360
  word.rotationSpeed = (Math.random() - 0.5) * WORD_ROTATION_SPEED_RANGE
  word.rotationZ = Math.random() * 360
  word.rotationSpeedZ = (Math.random() - 0.5) * rotationSpeedZ
  word.wavePhase = Math.random() * Math.PI * 2
  word.waveSpeed = 1.5 + Math.random() * 2
  word.waveAmplitude = 8 + Math.random() * 12
  word.text = text
  word.size = size
  word.scaleX = 1
  //
  // Refresh cached color endpoints after depthBase and phraseColor changed
  //
  cacheWordColorEndpoints(word, inst.k, inst.playfieldHex)
  applyFlyingWordDepthColor(word, inst.k, 1, inst.playfieldHex)
}

/**
 * Creates a single killer word (deadly flying word)
 * @param {Object} k - Kaplay instance
 * @param {Object} params - Word parameters
 * @returns {Object} Killer word object
 */
function createKillerLetter(k, params) {
  const {
    hero,
    currentLevel,
    onDeath,
    minSpeed,
    maxSpeed,
    minSize,
    maxSize,
    playableTop,
    playableBottom,
    playableLeft,
    playableRight,
    initialSpawn,
    rotationSpeedZ
  } = params

  //
  // Use a random killer word — custom list per level overrides the default
  //
  const wordList = params.killerWords || KILLER_WORDS
  const text = wordList[Math.floor(Math.random() * wordList.length)]

  //
  // Killer words are slightly larger than regular words for visibility
  //
  const size = minSize + Math.random() * (maxSize - minSize) + 2

  const speedX = minSpeed + Math.random() * (maxSpeed - minSpeed)
  const speedY = 2 + Math.random() * 8

  //
  // Spawn position: always start from left side, 100px before playable area
  // Y position: from top of playable area + 100px above to bottom of playable area
  //
  const approximateWordWidth = 150
  const spawnDistanceLeft = SPAWN_BUFFER
  
  let x, y
  if (initialSpawn) {
    //
    // Initial spawn: distribute evenly across the path from left spawn point to playable area
    //
    x = playableLeft - spawnDistanceLeft + Math.random() * (spawnDistanceLeft + playableRight - playableLeft)
    y = playableTop - SPAWN_BUFFER + Math.random() * (playableBottom - playableTop + SPAWN_BUFFER)
  } else {
    //
    // Regular spawn: always from left, 100px before playable area
    //
    x = playableLeft - spawnDistanceLeft - Math.random() * approximateWordWidth
    y = playableTop - SPAWN_BUFFER + Math.random() * (playableBottom - playableTop + SPAWN_BUFFER)
  }

  //
  // Killer word color: from config (same as blades)
  //
  const killerColor = getColor(k, CFG.visual.colors.blades)
  const killerHex = CFG.visual.colors.blades.replace('#', '')
  const baseColorRgb = {
    r: parseInt(killerHex.slice(0, 2), 16),
    g: parseInt(killerHex.slice(2, 4), 16),
    b: parseInt(killerHex.slice(4, 6), 16)
  }

  //
  // Killer words in front of bg heroes (z=9), behind player (z=10) and cover rects (z=9.5)
  //
  const zIndex = KILLER_LETTER_Z

  //
  // Killer words stay fully opaque — accent color from config
  //
  const fontFamily = CFG.visual.fonts.regularFull.replace(/'/g, '')
  
  //
  // Create main killer word with collision area
  //
  const textObj = k.add([
    k.text(text, {
      size: size,
      font: fontFamily
    }),
    k.pos(x, y),
    k.anchor('center'),
    killerColor,
    k.opacity(FLYING_WORD_DRAW_OPACITY),
    //
    // Horizontal scale 1.1 — extends slightly past the text bounding box so all
    // letters including serifs and right-side glyphs are inside the collision zone.
    // Vertical 0.65 keeps the hit-box tighter than full height to avoid false hits.
    //
    k.area({ scale: k.vec2(1.1, 0.65) }),
    k.z(zIndex),
    k.fixed(),
    k.stay(),  // Stay persistent across scene changes
    "flying-word",
    "killer-letter"
  ])
  
  //
  // Setup collision with hero
  //
  textObj.onCollide("player", () => {
    //
    // Get current instance to access updated hero and onDeath
    //
    const currentInst = k.flyingWordsInstance
    if (!currentInst) return
    //
    // Don't kill hero if they're annihilating, already dying, or a help panel is open
    //
    if (currentInst.hero.isAnnihilating || currentInst.hero.isDying) return
    if (LevelHelp.isAnyPanelOpen() || LifeDeduction.isActive()) return
    if (currentInst.spawnProtectionTimer > 0) return
    //
    // Calm platform makes all words harmless — ignore the hit
    //
    if (currentInst.harmless) return
    //
    // Mark word for respawn by setting flag
    //
    const killerWord = currentInst.killerLetters.find(kw => kw.textObj === textObj)
    if (killerWord) {
      killerWord.needsRespawn = true
    }
    //
    // Use custom death handler if provided, otherwise use default
    //
    if (currentInst.onDeath) {
      currentInst.onDeath()
    } else {
      //
      // Default: Import Hero module and trigger death
      //
      import('../../../components/hero.js').then(Hero => {
        Hero.death(currentInst.hero, () => k.go(currentInst.currentLevel))
      })
    }
  })

  //
  // Outline draw entity — persists across word-level transitions via k.stay().
  // Its update() hook checks lastOnUpdateTime to detect when the player navigates away
  // from word levels (e.g. to the menu). When outside word levels both the outline and
  // the blue textObj are hidden to prevent them bleeding onto other scenes.
  //
  // draw() is anchored at (0,0) and reads textObj.pos directly each frame so it never
  // shows a stale position regardless of update order — no pos-sync bookkeeping needed.
  //
  const outlineEntity = k.add([
    k.pos(0, 0),
    k.z(zIndex - 0.01),
    k.fixed(),
    k.stay(),
    {
      update() {
        //
        // Show or hide the blue word depending on whether we are inside a word-level scene
        //
        const inWordLevel = k.time() - lastOnUpdateTime < WORD_LEVEL_TIMEOUT
        if (textObj.exists?.()) {
          textObj.opacity = inWordLevel ? FLYING_WORD_DRAW_OPACITY : 0
        }
      },
      draw() {
        const inWordLevel = k.time() - lastOnUpdateTime < WORD_LEVEL_TIMEOUT
        if (!inWordLevel) return
        if (!textObj.exists?.()) return
        const scaleX = textObj.scale?.x ?? 1
        if (scaleX < 0.12) return
        //
        // Use textObj.pos directly so the outline is always pixel-perfect
        // regardless of when this draw() fires relative to the pos sync in updateWord
        //
        const tx = textObj.pos.x
        const ty = textObj.pos.y
        WORD_OUTLINE_OFFSETS.forEach(([ox, oy]) => {
          k.drawText({
            //
            // Read the live text so the outline follows the calm pleasant-word swap
            //
            text: textObj.text,
            size,
            font: fontFamily,
            anchor: 'center',
            pos: k.vec2(tx + ox, ty + oy),
            angle: textObj.angle,
            color: k.rgb(0, 0, 0),
            opacity: FLYING_WORD_DRAW_OPACITY
          })
        })
      }
    }
  ])

  return {
    textObj,
    outlineEntity,
    fontFamily,
    x,
    y,
    angle: 0,
    scaleX: 1,
    speedX,
    speedY,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 120,
    rotationZ: Math.random() * 360,
    rotationSpeedZ: (Math.random() - 0.5) * rotationSpeedZ,
    wavePhase: Math.random() * Math.PI * 2,
    waveSpeed: 1.5 + Math.random() * 2,
    waveAmplitude: 8 + Math.random() * 12,
    isBehindHero: false,
    isLetter: true,
    sizeMultiplier: 1,
    isKiller: true,
    pulsePhase: Math.random() * Math.PI * 2,
    baseColorRgb,
    proximityLevel: 0,
    baseScale: 1
  }
}

//
// Pulses killer word fill color between steel-blue and a slightly brighter tint
//
function pulseKillerColor(word, inst) {
  const { k } = inst
  word.pulsePhase += k.dt() * KILLER_COLOR_PULSE_SPEED
  const pulse = 1 + Math.sin(word.pulsePhase) * KILLER_COLOR_PULSE_AMOUNT
  const { r, g, b } = word.baseColorRgb
  word.textObj.color = k.rgb(
    Math.min(255, r * pulse),
    Math.min(255, g * pulse),
    Math.min(255, b * pulse)
  )
}

//
// Moving layer 1 — all flying words share the wordsFlying depth slot
//
function resolvePlayfieldHex(cfg) {
  const fromCfg = cfg.playfieldColor
  if (fromCfg) return fromCfg
  const fromLevel = cfg.currentLevel ? getLevelColors(cfg.currentLevel)?.playfield : null
  return fromLevel ?? getConsciousnessColor('gameWorld')
}

//
// Moving layer 1 — all flying words share the wordsFlying depth slot
//
function pickPhraseColor(isBehindHero, playfieldHex) {
  const base = getConsciousnessColor('flyingWord')
  return atmosphericDepthColor(
    base,
    playfieldHex,
    isBehindHero ? FLYING_WORD_DEPTH_FAR : FLYING_WORD_DEPTH_NEAR
  )
}

//
// Pre-computes the two color extremes for a word: full-face (scaleX=1) and edge-on (scaleX=0).
// These are cached on the word so that applyFlyingWordDepthColor can lerp numerically
// instead of running the expensive atmosphericDepthColor hex pipeline every frame.
//
function cacheWordColorEndpoints(word, k, playfieldHex) {
  const depthBase = word.depthBase ?? FLYING_WORD_DEPTH_NEAR
  const depthFar = Math.min(1, depthBase + FLYING_WORD_EDGE_DEPTH_BOOST)
  word.colorNear = getRGB(k, atmosphericDepthColor(word.phraseColor, playfieldHex, depthBase))
  word.colorFar = getRGB(k, atmosphericDepthColor(word.phraseColor, playfieldHex, depthFar))
  if (!word.color) word.color = k.rgb(word.colorNear.r, word.colorNear.g, word.colorNear.b)
}

//
// Depth cue via color blend — lerps between two pre-cached Color extremes.
// No hex parsing or string operations happen here — pure arithmetic per frame.
//
function applyFlyingWordDepthColor(word, k, scaleX, playfieldHex) {
  const near = word.colorNear
  const far = word.colorFar
  if (!near || !far) {
    //
    // Fallback on first call before endpoints are cached
    //
    cacheWordColorEndpoints(word, k, playfieldHex)
    return
  }
  const t = 1 - scaleX
  word.color.r = near.r + (far.r - near.r) * t
  word.color.g = near.g + (far.g - near.g) * t
  word.color.b = near.b + (far.b - near.b) * t
  word.opacity = REGULAR_WORD_OPACITY
}

