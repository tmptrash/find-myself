import { CFG, getConsciousnessColor, getLevelColors, atmosphericDepthColor } from '../cfg.js'
import { getColor, getRGB } from '../../../utils/helper.js'

//
// Spawn buffer: distance outside playable area where words can spawn/respawn
//
const SPAWN_BUFFER = 100
//
// Thin outline — four diagonal offsets create a solid black stroke around killer words
//
const WORD_OUTLINE_SIZE = 2.4
const WORD_OUTLINE_OFFSETS = [
  [-WORD_OUTLINE_SIZE, -WORD_OUTLINE_SIZE],
  [WORD_OUTLINE_SIZE, -WORD_OUTLINE_SIZE],
  [-WORD_OUTLINE_SIZE, WORD_OUTLINE_SIZE],
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
    customBounds = null
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
    k.flyingWordsInstance.hero = hero  // Update hero reference for new game session
    k.flyingWordsInstance.currentLevel = currentLevel
    k.flyingWordsInstance.onDeath = onDeath
    k.flyingWordsInstance.playfieldHex = resolvePlayfieldHex(cfg)
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
        rotationSpeedZ
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

  return inst
}

/**
 * Updates flying words animation
 * @param {Object} inst - Flying words instance
 */
export function onUpdate(inst) {
  const { words, killerLetters } = inst

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
    word.textObj.pos.x += word.speedX * k.dt()
    
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
    const flutter = Math.sin(word.wavePhase) * word.waveAmplitude * 0.2  // Very subtle horizontal flutter
    const fallSpeed = word.speedY + Math.abs(Math.sin(word.wavePhase * 0.5)) * 5  // Minimal variable falling speed
    
    word.textObj.pos.x += flutter * k.dt()
    word.textObj.pos.y += fallSpeed * k.dt()

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
    word.textObj.angle = word.rotation
    
    //
    // Sync outline texts (thin border)
    //
    if (word.outlineTexts) {
      word.outlineTexts.forEach((outlineText, i) => {
        const [dx, dy] = WORD_OUTLINE_OFFSETS[i]
        outlineText.pos.x = word.textObj.pos.x + dx
        outlineText.pos.y = word.textObj.pos.y + dy
        outlineText.angle = word.rotation
      })
    }
    
    //
    // Sync outline object if it exists (legacy bold layer — unused)
    //
    if (word.outlineObj) {
      word.outlineObj.pos.x = word.textObj.pos.x + 0.5
      word.outlineObj.pos.y = word.textObj.pos.y + 0.5
      word.outlineObj.angle = word.rotation
    }

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
    
    //
    // When word is edge-on (scaleX near 0), it becomes nearly invisible
    // Initialize scale if it doesn't exist
    //
    if (!word.textObj.scale) {
      word.textObj.scale = k.vec2(1, 1)
    }
    word.textObj.scale.x = Math.max(0.05, scaleX)
    
    //
    // Edge-on rotation blends toward playfield instead of fading alpha
    // Killer words keep accent pulse — no phrase depth blend
    //
    !word.isKiller && applyFlyingWordDepthColor(word, k, scaleX, inst.playfieldHex)

    //
    // Respawn logic: if word exits right or bottom (+ 100px buffer), respawn at left
    //
    const approximateWordWidth = 150
    
    if (word.textObj.pos.x > playableRight + SPAWN_BUFFER || word.textObj.pos.y > playableBottom + SPAWN_BUFFER) {
      //
      // Respawn at left, 100px before playable area
      // Y position: random from top-100px to bottom
      //
      word.textObj.pos.x = playableLeft - SPAWN_BUFFER - Math.random() * approximateWordWidth
      word.textObj.pos.y = playableTop - SPAWN_BUFFER + Math.random() * (playableBottom - playableTop + SPAWN_BUFFER)
      
      //
      // Sync outline texts position
      //
      if (word.outlineTexts) {
        word.outlineTexts.forEach((outlineText, i) => {
          const [dx, dy] = WORD_OUTLINE_OFFSETS[i]
          outlineText.pos.x = word.textObj.pos.x + dx
          outlineText.pos.y = word.textObj.pos.y + dy
        })
      }
      
      //
      // Sync outline position if it exists
      //
      if (word.outlineObj) {
        word.outlineObj.pos.x = word.textObj.pos.x + 0.5
        word.outlineObj.pos.y = word.textObj.pos.y + 0.5
      }
      
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
    
    // //
    // // Keep words within left boundary
    // //
    // if (word.textObj.pos.x < playableLeft) {
    //   word.textObj.pos.x = playableLeft + 10
    // }
    
    // //
    // // Keep words within top boundary
    // //
    // if (word.textObj.pos.y < playableTop) {
    //   word.textObj.pos.y = playableTop + 10
    // }
  //
  // Subtle color pulse on killer words
  //
  word.isKiller && pulseKillerColor(word, inst)
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
    // Reset outline positions
    //
    if (letter.outlineTexts) {
      letter.outlineTexts.forEach((outline, i) => {
        const [dx, dy] = WORD_OUTLINE_OFFSETS[i]
        outline.pos.x = x + dx
        outline.pos.y = y + dy
      })
    }
    
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
  // Set z-index: behind large background heroes, above bookshelf layer
  //
  const zIndex = CFG.visual.zIndex.wordFlyingWords ?? CFG.visual.zIndex.flyingWords

  //
  // Depth based on layer — color shift toward playfield, not alpha
  //
  const depthBase = isBehindHero ? FLYING_WORD_DEPTH_FAR : FLYING_WORD_DEPTH_NEAR
  const playfieldHex = params.playfieldHex ?? getConsciousnessColor('gameWorld')
  const phraseColor = pickPhraseColor(isBehindHero, playfieldHex)
  const fontFamily = CFG.visual.fonts.regularFull.replace(/'/g, '')
  
  const textObj = k.add([
    k.text(text, {
      size: size,
      font: fontFamily
    }),
    k.pos(x, y),
    k.anchor('center'),
    getColor(k, phraseColor),
    k.opacity(REGULAR_WORD_OPACITY),
    k.z(zIndex),
    k.fixed(),
    k.stay(),
    "flying-word"
  ])

  return {
    textObj,
    outlineTexts: [],
    outlineObj: null,
    fontFamily,
    phraseColor,
    speedX,
    speedY,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * WORD_ROTATION_SPEED_RANGE,
    rotationZ: Math.random() * 360,  // Initial Z rotation
    rotationSpeedZ: (Math.random() - 0.5) * rotationSpeedZ,  // Use parameter for Z-axis rotation speed
    wavePhase: Math.random() * Math.PI * 2,
    waveSpeed: 1.5 + Math.random() * 2,  // 1.5-3.5 wave frequency - subtle flutter
    waveAmplitude: 8 + Math.random() * 12,  // 8-20 amplitude for subtle horizontal wobble
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

  word.textObj.pos.x = x
  word.textObj.pos.y = playableTop + Math.random() * (playableBottom - playableTop)
  word.speedX = minSpeed + Math.random() * (maxSpeed - minSpeed)
  word.speedY = 2 + Math.random() * 8  // Very slow falling down (2-10 px/s) - minimal vertical drift
  word.rotation = Math.random() * 360
  word.rotationSpeed = (Math.random() - 0.5) * WORD_ROTATION_SPEED_RANGE
  word.rotationZ = Math.random() * 360
  word.rotationSpeedZ = (Math.random() - 0.5) * rotationSpeedZ  // Use parameter for Z-axis rotation speed
  word.wavePhase = Math.random() * Math.PI * 2
  word.waveSpeed = 1.5 + Math.random() * 2  // 1.5-3.5 wave frequency - subtle flutter
  word.waveAmplitude = 8 + Math.random() * 12  // 8-20 amplitude for subtle horizontal wobble
  applyFlyingWordDepthColor(word, inst.k, 1, inst.playfieldHex)
  word.textObj.text = text
  
  //
  // Initialize scale if it doesn't exist
  //
  if (!word.textObj.scale) {
    word.textObj.scale = inst.k.vec2(1, 1)
  }
  word.textObj.scale.x = 1
  word.textObj.textSize = size
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
  // Use a random killer word instead of a letter
  //
  const text = KILLER_WORDS[Math.floor(Math.random() * KILLER_WORDS.length)]

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
    k.area({ scale: 0.6 }),  // Collision area (slightly smaller than visual)
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
    // Don't kill hero if they're annihilating or already dying
    //
    if (currentInst.hero.isAnnihilating || currentInst.hero.isDying) return
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
  // Outline draw entity — k.pos(0,0) is required for draw() to use world-space coords.
  // No k.stay() so it is destroyed on scene change (prevents bleed into menu).
  // Reads textObj.pos and angle each frame to stay locked to the moving killer word.
  //
  k.add([
    k.pos(0, 0),
    k.z(zIndex - 0.01),
    k.fixed(),
    {
      draw() {
        WORD_OUTLINE_OFFSETS.forEach(([ox, oy]) => {
          k.drawText({
            text,
            size,
            font: fontFamily,
            anchor: 'center',
            pos: k.vec2(textObj.pos.x + ox, textObj.pos.y + oy),
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
    outlineTexts: [],
    outlineObj: null,
    fontFamily,
    speedX,
    speedY,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 120,
    rotationZ: Math.random() * 360,
    rotationSpeedZ: (Math.random() - 0.5) * rotationSpeedZ,
    wavePhase: Math.random() * Math.PI * 2,
    waveSpeed: 1.5 + Math.random() * 2,
    waveAmplitude: 8 + Math.random() * 12,
    isBehindHero: false,  // Killer words are always in front
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
// Depth cue via color blend — regular words are semi-transparent
//
function applyFlyingWordDepthColor(word, k, scaleX, playfieldHex) {
  const edgeDepth = (1 - scaleX) * FLYING_WORD_EDGE_DEPTH_BOOST
  const depth = Math.min(1, (word.depthBase ?? FLYING_WORD_DEPTH_NEAR) + edgeDepth)
  const colorHex = atmosphericDepthColor(word.phraseColor, playfieldHex, depth)
  word.textObj.opacity = REGULAR_WORD_OPACITY
  word.textObj.color = getRGB(k, colorHex)
}

