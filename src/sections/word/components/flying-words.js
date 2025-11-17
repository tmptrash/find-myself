import { CFG } from '../../../cfg.js'
import { getColor } from '../../../utils/helper.js'

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

/**
 * Creates flying words system for atmospheric effect
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {string} cfg.color - Text color in hex format
 * @param {number} [cfg.wordCount=1440] - Number of words to create
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
    wordCount = 40,
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
  
  const playableLeft = customBounds.left
  const playableRight = customBounds.right
  const playableTop = customBounds.top
  const playableBottom = customBounds.bottom

  const words = []

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
      letterToWordRatio
    })
    words.push(word)
  }

  const inst = {
    k,
    words,
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
    letterToWordRatio
  }

  return inst
}

/**
 * Updates flying words animation
 * @param {Object} inst - Flying words instance
 */
export function onUpdate(inst) {
  const { k, words, playableRight, playableLeft, playableTop, playableBottom } = inst

  words.forEach(word => {
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
    // Sync outline texts (black border)
    //
    if (word.outlineTexts) {
      const outlineOffsets = [
        [-1, -1], [0, -1], [1, -1],
        [-1, 0],           [1, 0],
        [-1, 1],  [0, 1],  [1, 1]
      ]
      word.outlineTexts.forEach((outlineText, i) => {
        const [dx, dy] = outlineOffsets[i]
        outlineText.pos.x = word.textObj.pos.x + dx
        outlineText.pos.y = word.textObj.pos.y + dy
        outlineText.angle = word.rotation
      })
    }
    
    //
    // Sync bold outline texts if they exist
    //
    if (word.boldOutlineTexts && word.boldOutlineTexts.length > 0) {
      const outlineOffsets = [
        [-1, -1], [0, -1], [1, -1],
        [-1, 0],           [1, 0],
        [-1, 1],  [0, 1],  [1, 1]
      ]
      word.boldOutlineTexts.forEach((boldText, i) => {
        const [dx, dy] = outlineOffsets[i]
        boldText.pos.x = word.textObj.pos.x + 0.5 + dx
        boldText.pos.y = word.textObj.pos.y + 0.5 + dy
        boldText.angle = word.rotation
      })
    }
    
    //
    // Sync outline object if it exists (for bold effect)
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
    // Sync outline texts scale and opacity
    //
    if (word.outlineTexts) {
      word.outlineTexts.forEach(outlineText => {
        if (!outlineText.scale) {
          outlineText.scale = k.vec2(1, 1)
        }
        outlineText.scale.x = Math.max(0.05, scaleX)
      })
    }
    
    //
    // Sync bold outline texts scale
    //
    if (word.boldOutlineTexts && word.boldOutlineTexts.length > 0) {
      word.boldOutlineTexts.forEach(boldText => {
        if (!boldText.scale) {
          boldText.scale = k.vec2(1, 1)
        }
        boldText.scale.x = Math.max(0.05, scaleX)
      })
    }
    
    //
    // Sync outline scale if it exists
    //
    if (word.outlineObj) {
      if (!word.outlineObj.scale) {
        word.outlineObj.scale = k.vec2(1, 1)
      }
      word.outlineObj.scale.x = Math.max(0.05, scaleX)
    }
    
    //
    // Adjust opacity based on angle and depth
    // Background objects are more visible now (increased multiplier)
    // Foreground objects are sharper (higher opacity)
    //
    const baseOpacity = word.baseOpacity
    const depthOpacityMultiplier = word.isBehindHero ? 0.9 : 1.0  // Increased from 0.7 to 0.9 for better visibility
    word.textObj.opacity = baseOpacity * (0.3 + 0.7 * scaleX) * depthOpacityMultiplier
    
    //
    // Sync outline texts opacity
    //
    if (word.outlineTexts) {
      word.outlineTexts.forEach(outlineText => {
        outlineText.opacity = word.textObj.opacity
      })
    }
    
    //
    // Sync bold outline texts opacity
    //
    if (word.boldOutlineTexts && word.boldOutlineTexts.length > 0) {
      word.boldOutlineTexts.forEach(boldText => {
        boldText.opacity = word.textObj.opacity * 0.5
      })
    }
    
    //
    // Sync outline opacity if it exists
    //
    if (word.outlineObj) {
      word.outlineObj.opacity = word.textObj.opacity * 0.5
    }

    //
    // Loop words: when they exit beyond right or bottom (by word length), respawn at left/top
    // Respawn at 2-3 word widths behind platforms
    //
    const approximateWordWidth = 150
    const spawnDistanceLeft = approximateWordWidth * 2
    const spawnDistanceTop = approximateWordWidth * 2
    
    if (word.textObj.pos.x > playableRight + 150) {
      //
      // Respawn far left (2-3 words behind left platform)
      //
      word.textObj.pos.x = playableLeft - spawnDistanceLeft - Math.random() * approximateWordWidth
      word.textObj.pos.y = playableTop + Math.random() * (playableBottom - playableTop)
      
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
    
    if (word.textObj.pos.y > playableBottom + 150) {
      //
      // Respawn far above (2-3 words above top platform)
      //
      word.textObj.pos.y = playableTop - spawnDistanceTop - Math.random() * approximateWordWidth
      word.textObj.pos.x = playableLeft + Math.random() * (playableRight - playableLeft)
      
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
  })
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
  // Random position: start from far behind platforms (left or top)
  // For initial spawn, distribute evenly across the entire path
  // 70% chance to start from left, 30% from top
  //
  const startFromLeft = Math.random() < 0.7
  
  //
  // Approximate word/letter width for spacing calculation
  // Average word is ~100-150px, letter is ~40-60px
  //
  const approximateWordWidth = 150
  const spawnDistanceLeft = approximateWordWidth * 2  // 2 words distance behind left platform
  const spawnDistanceTop = approximateWordWidth * 2   // 2 words distance above top platform
  
  let x, y
  if (initialSpawn) {
    //
    // Distribute words evenly across the entire visible path on initial spawn
    //
    if (startFromLeft) {
      // Distribute from far left to far right
      x = playableLeft - spawnDistanceLeft + Math.random() * (playableRight - playableLeft + spawnDistanceLeft + 150)
      y = playableTop + Math.random() * (playableBottom - playableTop)
    } else {
      // Distribute from far top to far bottom
      x = playableLeft + Math.random() * (playableRight - playableLeft)
      y = playableTop - spawnDistanceTop + Math.random() * (playableBottom - playableTop + spawnDistanceTop + 150)
    }
  } else {
    //
    // Regular spawn: far behind platforms (2 word widths distance)
    //
    x = startFromLeft
      ? playableLeft - spawnDistanceLeft - Math.random() * approximateWordWidth  // Start 2-3 words left
      : playableLeft + Math.random() * (playableRight - playableLeft)
    y = startFromLeft
      ? playableTop + Math.random() * (playableBottom - playableTop)
      : playableTop - spawnDistanceTop - Math.random() * approximateWordWidth  // Start 2-3 words above
  }

  //
  // Set z-index: all flying words behind platforms
  //
  const zIndex = CFG.visual.zIndex.flyingWords

  //
  // Opacity based on depth: behind = less transparent (0.4-0.6), front = brighter (0.5-0.7)
  //
  const baseOpacity = isBehindHero
    ? 0.4 + Math.random() * 0.2   // 0.4-0.6 for background (less transparent = more visible)
    : 0.5 + Math.random() * 0.2    // 0.5-0.7 for foreground

  //
  // Use JetBrains Mono font for all words
  //
  const fontFamily = CFG.fonts.regular
  
  //
  // Font weight simulation: some words will have outline for bold effect
  //
  const fontWeight = Math.random()
  const isBold = fontWeight > 0.6  // 40% chance to be bold

  //
  // Create black outline by drawing text multiple times with offset
  //
  const outlineOffsets = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
  ]
  
  const outlineTexts = []
  outlineOffsets.forEach(([dx, dy]) => {
    const outlineText = k.add([
      k.text(text, {
        size: size,
        font: fontFamily
      }),
      k.pos(x + dx, y + dy),
      k.anchor('center'),
      k.color(0, 0, 0),  // Black color for outline
      k.opacity(baseOpacity),
      k.z(zIndex - 0.1),  // Slightly behind main text
      k.fixed()
    ])
    outlineTexts.push(outlineText)
  })

  const textObj = k.add([
    k.text(text, {
      size: size,
      font: fontFamily
    }),
    k.pos(x, y),
    k.anchor('center'),
    getColor(k, color),
    k.opacity(baseOpacity),
    k.z(zIndex),
    k.fixed()
  ])
  
  //
  // Create bold effect by adding additional layer
  //
  let boldOutlineTexts = []
  let outlineObj = null
  if (isBold) {
    outlineOffsets.forEach(([dx, dy]) => {
      const boldOutlineText = k.add([
        k.text(text, {
          size: size,
          font: fontFamily
        }),
        k.pos(x + 0.5 + dx, y + 0.5 + dy),
        k.anchor('center'),
        k.color(0, 0, 0),  // Black color for outline
        k.opacity(baseOpacity * 0.5),
        k.z(zIndex - 0.05),  // Between outline and main text
        k.fixed()
      ])
      boldOutlineTexts.push(boldOutlineText)
    })
    
    outlineObj = k.add([
      k.text(text, {
        size: size,
        font: fontFamily
      }),
      k.pos(x + 0.5, y + 0.5),
      k.anchor('center'),
      getColor(k, color),
      k.opacity(baseOpacity * 0.5),
      k.z(zIndex),
      k.fixed()
    ])
  }

  return {
    textObj,
    outlineTexts,
    outlineObj,
    boldOutlineTexts,
    isBold,
    fontFamily,
    speedX,
    speedY,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 120,  // -60 to +60 degrees per second - moderate tumbling
    rotationZ: Math.random() * 360,  // Initial Z rotation
    rotationSpeedZ: (Math.random() - 0.5) * rotationSpeedZ,  // Use parameter for Z-axis rotation speed
    wavePhase: Math.random() * Math.PI * 2,
    waveSpeed: 1.5 + Math.random() * 2,  // 1.5-3.5 wave frequency - subtle flutter
    waveAmplitude: 8 + Math.random() * 12,  // 8-20 amplitude for subtle horizontal wobble
    baseOpacity,
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
  // Opacity based on depth
  //
  word.baseOpacity = word.isBehindHero
    ? 0.4 + Math.random() * 0.2   // 0.4-0.6 for background (less transparent = more visible)
    : 0.5 + Math.random() * 0.2    // 0.5-0.7 for foreground

  word.textObj.pos.x = x
  word.textObj.pos.y = playableTop + Math.random() * (playableBottom - playableTop)
  word.speedX = minSpeed + Math.random() * (maxSpeed - minSpeed)
  word.speedY = 2 + Math.random() * 8  // Very slow falling down (2-10 px/s) - minimal vertical drift
  word.rotation = Math.random() * 360
  word.rotationSpeed = (Math.random() - 0.5) * 120  // -60 to +60 degrees per second - moderate tumbling
  word.rotationZ = Math.random() * 360
  word.rotationSpeedZ = (Math.random() - 0.5) * rotationSpeedZ  // Use parameter for Z-axis rotation speed
  word.wavePhase = Math.random() * Math.PI * 2
  word.waveSpeed = 1.5 + Math.random() * 2  // 1.5-3.5 wave frequency - subtle flutter
  word.waveAmplitude = 8 + Math.random() * 12  // 8-20 amplitude for subtle horizontal wobble
  word.textObj.opacity = word.baseOpacity
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

  