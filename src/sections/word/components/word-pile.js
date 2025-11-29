import { CFG } from '../cfg.js'
import { getRGB } from '../../../utils/helper.js'
//
// Words and fragments related to pain, self-discovery, and introspection
//
const WORDS = [
  'pain', 'hurt', 'ache', 'fear', 'doubt', 'lost', 'dark',
  'void', 'empty', 'cold', 'numb', 'alone', 'torn', 'break',
  'cut', 'bleed', 'scar', 'wound', 'grief', 'cry', 'fall',
  'sink', 'drown', 'fade', 'die', 'end', 'why', 'how', 'who',
  'am', 'I', '...', 'no', 'never', 'can\'t', 'won\'t', 'find',
  'seek', 'look', 'where', 'when', 'lost', 'found', 'me',
  'self', 'soul', 'mind', 'heart', 'life', 'death', 'time'
]
//
// Depth layers configuration - 3 levels of depth
// Game area background color: #1A1A1A (dark gray/black)
//
const DEPTH_LAYERS = [
  {
    name: 'far_back',
    zIndex: -100,  // Deepest layer, furthest from camera (most negative = furthest)
    minSize: 100,
    maxSize: 180,
    opacity: 1.0,
    color: '#3B3B3B',  // Very close to game area (#1A1A1A), almost invisible
    outlineColor: null,  // No outline
    outlineOpacity: 0,
    count: 37,
    letterRatio: 0,
    blurred: true,  // Apply blur effect
    blurLevel: 'heavy'  // Heavy blur (very out of focus)
  },
  {
    name: 'mid_depth',
    zIndex: -50,  // Middle layer, between far and near
    minSize: 90,
    maxSize: 140,
    opacity: 1.0,
    color: '#4A4A4A',  // Medium gray, close to game area
    outlineColor: '#3A3A3A',  // Outline almost same as text color
    outlineOpacity: 0.8,
    count: 10,
    letterRatio: 0,
    blurred: true,  // Apply blur effect
    blurLevel: 'medium'  // Medium blur (somewhat out of focus)
  }
]

//
// Total words: 42 (30+12)
// Level 1 (mid, z:-50): 12 words - medium blur, soft outline
// Level 2 (far, z:-100): 30 words - heavy blur, no outline
//

/**
 * Creates word pile system for atmospheric depth effect
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {Object} config.customBounds - Playable area bounds {left, right, top, bottom}
 * @returns {Object} Word pile instance
 */
export function create(config) {
  const { k, customBounds } = config
  
  if (!customBounds) {
    throw new Error('WordPile.create() requires customBounds parameter')
  }
  
  //
  // Check if word-pile objects already exist (from previous level run)
  // If they exist, don't create new ones - just return empty instance
  //
  const existingWords = k.get("word-pile-text")
  if (existingWords.length > 0) {
    //
    // Words already exist, return minimal instance without creating new ones
    //
    return {
      k,
      layers: [],
      playableLeft: customBounds.left,
      playableRight: customBounds.right,
      playableTop: customBounds.top,
      playableBottom: customBounds.bottom
    }
  }
  
  const playableLeft = customBounds.left
  const playableRight = customBounds.right
  const playableTop = customBounds.top
  const playableBottom = customBounds.bottom
  
  const layers = []
  
  //
  // Create depth layers
  // Distribute each layer's words evenly across width
  //
  let totalWordsCreated = 0
  const totalWordsNeeded = DEPTH_LAYERS.reduce((sum, layer) => sum + layer.count, 0)
  
  DEPTH_LAYERS.forEach(layerConfig => {
    const layerWords = []
    
    //
    // Create position array for this layer only
    // This ensures words of this layer spread across the entire width
    //
    const layerPositions = []
    for (let i = 0; i < layerConfig.count; i++) {
      layerPositions.push(i)
    }
    //
    // Shuffle positions within this layer
    //
    for (let i = layerPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [layerPositions[i], layerPositions[j]] = [layerPositions[j], layerPositions[i]]
    }
    
    for (let i = 0; i < layerConfig.count; i++) {
      //
      // All words go behind hero (no near_front layer anymore)
      //
      const shouldBeInFront = false
      
      //
      // Use layer-specific position for even distribution across full width
      // Each layer independently distributes its words across the entire width
      // For better distribution, use full segment width with centered randomness
      //
      const positionSlot = layerPositions[i]
      const segment = (positionSlot + 0.5 + (Math.random() - 0.5) * 0.6) / layerConfig.count  // Centered in segment with ±30% variation
      
      const word = createWordInLayer(k, {
        layerConfig,
        playableLeft,
        playableRight,
        playableTop,
        playableBottom,
        isFrontLayer: shouldBeInFront,
        widthSegment: segment  // Pass segment for even distribution
      })
      layerWords.push(word)
      totalWordsCreated++
    }
    
    layers.push({
      config: layerConfig,
      words: layerWords
    })
  })
  
  const inst = {
    k,
    layers,
    playableLeft,
    playableRight,
    playableTop,
    playableBottom
  }
  
  return inst
}

/**
 * Creates a single word in a specific depth layer
 * @param {Object} k - Kaplay instance
 * @param {Object} params - Word parameters
 * @returns {Object} Word object
 */
function createWordInLayer(k, params) {
  const { layerConfig, playableLeft, playableRight, playableTop, playableBottom, isFrontLayer, widthSegment } = params
  
  //
  // Only use words (no letters)
  //
  const text = WORDS[Math.floor(Math.random() * WORDS.length)]
  
  //
  // Random size within layer's range
  //
  const size = layerConfig.minSize + Math.random() * (layerConfig.maxSize - layerConfig.minSize)
  
  //
  // Position words evenly across width with some randomness
  // Use widthSegment to ensure even distribution
  //
  const playableWidth = playableRight - playableLeft
  const segmentWidth = playableWidth * 0.2  // Each word gets ~20% of width space
  const baseX = playableLeft + (widthSegment * playableWidth)
  const randomOffset = (Math.random() - 0.5) * segmentWidth * 0.5  // Small random offset within segment
  const x = Math.max(playableLeft + 50, Math.min(playableRight - 50, baseX + randomOffset))
  
  //
  // Random rotation - close to vertical (90°), with ±10° variation
  // Total range: 80-100 degrees (almost vertical)
  //
  const baseRotation = 80 + Math.random() * 20  // 80-100 degrees (near vertical)
  
  //
  // Calculate text dimensions for proper positioning
  // Text is rotated 60-120° (nearly vertical)
  //
  const textLength = text.length
  const avgCharWidth = size * 0.6  // Approximate character width in pixels
  const textWidth = textLength * avgCharWidth  // Total text width when horizontal
  
  //
  // SIMPLE APPROACH: Just position at platform level
  // Let Kaplay handle the rotation around center anchor
  // We'll adjust empirically: use small offset to make bottom touch platform
  //
  const y = playableBottom - size * 0.9  // Small offset based on font size (60%)
  
  //
  // Determine z-index based on layer configuration and front/back positioning
  // - Platforms: z = 15
  // - Player (hero): z = 10
  // - Blades: z = 14
  //
  // For front layer (near_front): use z between hero (10) and platforms (15)
  // For back layers: use layer's configured zIndex (negative values = behind hero)
  //
  const finalZIndex = isFrontLayer
    ? 10.5 + Math.random()  // 10.5 to 11.5 (above hero, below platforms)
    : layerConfig.zIndex + (Math.random() - 0.5) * 2  // Use layer's zIndex with slight variation
  
  //
  // Get colors for word and outline
  //
  const wordColorRGB = getRGB(k, layerConfig.color)
  const hasOutline = layerConfig.outlineColor !== null && layerConfig.outlineOpacity > 0
  const outlineColorRGB = hasOutline ? getRGB(k, layerConfig.outlineColor) : getRGB(k, CFG.visual.colors.outline)
  
  //
  // Determine outline pattern based on layer configuration and blur level
  // Medium blur: 7px spread, Heavy blur: 9px spread
  //
  const isBlurred = layerConfig.blurred === true
  const blurLevel = layerConfig.blurLevel || 'medium'
  
  let outlineOffsets = []
  if (hasOutline) {
    if (!isBlurred) {
      // No blur - sharp outline (3px)
      outlineOffsets = [
        [-3, -3], [-2, -3], [-1, -3], [0, -3], [1, -3], [2, -3], [3, -3],
        [-3, -2], [-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [3, -2],
        [-3, -1], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1],
        [-3,  0], [-2,  0], [-1,  0],          [1,  0], [2,  0], [3,  0],
        [-3,  1], [-2,  1], [-1,  1], [0,  1], [1,  1], [2,  1], [3,  1],
        [-3,  2], [-2,  2], [-1,  2], [0,  2], [1,  2], [2,  2], [3,  2],
        [-3,  3], [-2,  3], [-1,  3], [0,  3], [1,  3], [2,  3], [3,  3]
      ]
    } else if (blurLevel === 'medium') {
      // Medium blur - 7px spread, more sparse
      outlineOffsets = [
        [-7, -7], [-4, -7], [0, -7], [4, -7], [7, -7],
        [-7, -4], [-4, -4], [0, -4], [4, -4], [7, -4],
        [-7,  0], [-4,  0],          [4,  0], [7,  0],
        [-7,  4], [-4,  4], [0,  4], [4,  4], [7,  4],
        [-7,  7], [-4,  7], [0,  7], [4,  7], [7,  7]
      ]
    } else if (blurLevel === 'heavy') {
      // Heavy blur - 9px spread, very sparse
      outlineOffsets = [
        [-9, -9], [-5, -9], [0, -9], [5, -9], [9, -9],
        [-9, -5], [-5, -5], [0, -5], [5, -5], [9, -5],
        [-9,  0], [-5,  0],          [5,  0], [9,  0],
        [-9,  5], [-5,  5], [0,  5], [5,  5], [9,  5],
        [-9,  9], [-5,  9], [0,  9], [5,  9], [9,  9]
      ]
    }
  }
  
  //
  // Adjust opacity based on blur level
  // Medium: 40%, Heavy: 25% of original
  //
  const blurOpacityMultiplier = isBlurred 
    ? (blurLevel === 'medium' ? 0.4 : 0.25)
    : 1.0
  const finalOutlineOpacity = layerConfig.outlineOpacity * blurOpacityMultiplier
  
  const outlineTexts = []
  if (hasOutline) {
    outlineOffsets.forEach(([dx, dy]) => {
      const outlineText = k.add([
        k.text(text, {
          size: size,
          font: CFG.visual.fonts.regular
        }),
        k.pos(x + dx, y + dy),
        k.anchor('center'),
        k.color(outlineColorRGB.r, outlineColorRGB.g, outlineColorRGB.b),
        k.opacity(finalOutlineOpacity),
        k.z(finalZIndex - 0.1),
        k.rotate(baseRotation),
        k.fixed(),
        k.stay(),  // Stay persistent across scene changes
        "word-pile-outline"
      ])
      outlineTexts.push(outlineText)
    })
  }
  
  //
  // Adjust main text opacity based on blur level
  // Medium: 75%, Heavy: 60% of original
  //
  const textOpacityMultiplier = isBlurred
    ? (blurLevel === 'medium' ? 0.75 : 0.6)
    : 1.0
  const finalTextOpacity = layerConfig.opacity * textOpacityMultiplier
  
  const textObj = k.add([
    k.text(text, {
      size: size,
      font: CFG.visual.fonts.regular
    }),
    k.pos(x, y),
    k.anchor('center'),
    k.color(wordColorRGB.r, wordColorRGB.g, wordColorRGB.b),
    k.opacity(finalTextOpacity),
    k.z(finalZIndex),
    k.rotate(baseRotation),
    k.fixed(),
    k.stay(),  // Stay persistent across scene changes
    "word-pile-text"
  ])
  
  return {
    textObj,
    outlineTexts,
    baseX: x,
    baseY: y,
    baseRotation
  }
}
/**
 * Destroys all word pile objects
 * @param {Object} inst - Word pile instance
 */
export function destroy(inst) {
  const { k, layers } = inst
  
  layers.forEach(layer => {
    layer.words.forEach(word => {
      k.destroy(word.textObj)
      word.outlineTexts.forEach(outline => k.destroy(outline))
    })
  })
}

