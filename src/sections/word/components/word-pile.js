import { CFG } from '../cfg.js'
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
// Depth layers configuration - 2 levels of depth
//
const DEPTH_LAYERS = [
  {
    name: 'far_back',
    zIndex: -100,
    minSize: 100,
    maxSize: 180,
    opacity: 1.0,
    color: '#3B3B3B',
    outlineColor: null,
    outlineOpacity: 0,
    count: 37,
    letterRatio: 0,
    blurred: true,
    blurLevel: 'heavy'
  },
  {
    name: 'mid_depth',
    zIndex: -50,
    minSize: 90,
    maxSize: 140,
    opacity: 1.0,
    color: '#4A4A4A',
    outlineColor: '#3A3A3A',
    outlineOpacity: 0.8,
    count: 10,
    letterRatio: 0,
    blurred: true,
    blurLevel: 'medium'
  }
]

/**
 * Creates word pile system using pre-rendered canvas
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
  
  const playableLeft = customBounds.left
  const playableRight = customBounds.right
  const playableTop = customBounds.top
  const playableBottom = customBounds.bottom
  
  const width = customBounds.right - customBounds.left
  const height = customBounds.bottom - customBounds.top
  //
  // Create off-screen canvas for pre-rendering
  //
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  //
  // Clear canvas with transparent background
  //
  ctx.clearRect(0, 0, width, height)
  //
  // Generate word data for all layers
  //
  const wordDataLayers = []
  
  DEPTH_LAYERS.forEach(layerConfig => {
    const layerPositions = []
    for (let i = 0; i < layerConfig.count; i++) {
      layerPositions.push(i)
    }
    //
    // Shuffle positions
    //
    for (let i = layerPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [layerPositions[i], layerPositions[j]] = [layerPositions[j], layerPositions[i]]
    }
    
    const layerWords = []
    
    for (let i = 0; i < layerConfig.count; i++) {
      const positionSlot = layerPositions[i]
      const segment = (positionSlot + 0.5 + (Math.random() - 0.5) * 0.6) / layerConfig.count
      
      const wordData = generateWordData(layerConfig, width, height, segment)
      layerWords.push(wordData)
    }
    
    wordDataLayers.push({
      config: layerConfig,
      words: layerWords
    })
  })
  //
  // Sort all words by z-index (deepest first) for correct drawing order
  //
  const allWords = []
  wordDataLayers.forEach(layer => {
    layer.words.forEach(word => {
      allWords.push({ ...word, layerConfig: layer.config })
    })
  })
  allWords.sort((a, b) => a.zIndex - b.zIndex)
  //
  // Render all words to canvas
  //
  allWords.forEach(word => {
    renderWordToCanvas(ctx, word)
  })
  //
  // Load canvas as sprite
  //
  const dataURL = canvas.toDataURL()
  const spriteId = `word-pile-bg-${Date.now()}-${Math.random()}`
  k.loadSprite(spriteId, dataURL)
  //
  // Create sprite object
  //
  const sprite = k.add([
    k.sprite(spriteId),
    k.pos(playableLeft, playableTop),
    k.z(-100),
    k.fixed()
  ])
  
  return {
    k,
    sprite,
    spriteId,
    playableLeft,
    playableRight,
    playableTop,
    playableBottom
  }
}

/**
 * Generate word data (position, rotation, etc.)
 * @param {Object} layerConfig - Layer configuration
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} widthSegment - Position segment (0-1)
 * @returns {Object} Word data
 */
function generateWordData(layerConfig, width, height, widthSegment) {
  const text = WORDS[Math.floor(Math.random() * WORDS.length)]
  const size = layerConfig.minSize + Math.random() * (layerConfig.maxSize - layerConfig.minSize)
  
  const segmentWidth = width * 0.2
  const baseX = widthSegment * width
  const randomOffset = (Math.random() - 0.5) * segmentWidth * 0.5
  const x = Math.max(50, Math.min(width - 50, baseX + randomOffset))
  
  const rotation = (80 + Math.random() * 20) * Math.PI / 180
  const y = height - size * 0.9
  
  const zIndex = layerConfig.zIndex + (Math.random() - 0.5) * 2
  
  const isBlurred = layerConfig.blurred === true
  const blurLevel = layerConfig.blurLevel || 'medium'
  const blurOpacityMultiplier = isBlurred 
    ? (blurLevel === 'medium' ? 0.4 : 0.25)
    : 1.0
  const textOpacityMultiplier = isBlurred
    ? (blurLevel === 'medium' ? 0.75 : 0.6)
    : 1.0
  
  return {
    text,
    x,
    y,
    rotation,
    size,
    zIndex,
    color: layerConfig.color,
    opacity: layerConfig.opacity * textOpacityMultiplier,
    outlineColor: layerConfig.outlineColor,
    outlineOpacity: layerConfig.outlineOpacity * blurOpacityMultiplier,
    hasOutline: layerConfig.outlineColor !== null,
    blurLevel
  }
}

/**
 * Render word to canvas context
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} wordData - Word data
 */
function renderWordToCanvas(ctx, wordData) {
  ctx.save()
  //
  // Set up transformation
  //
  ctx.translate(wordData.x, wordData.y)
  ctx.rotate(wordData.rotation)
  //
  // Set font (use JetBrains Mono from global config)
  //
  ctx.font = `${wordData.size}px ${CFG.visual.fonts.regularFull.replace(/'/g, '')}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  //
  // Draw outline if needed
  //
  if (wordData.hasOutline && wordData.outlineColor) {
    const outlineColor = hexToRGBA(wordData.outlineColor, wordData.outlineOpacity)
    ctx.fillStyle = outlineColor
    
    const offsets = getOutlineOffsets(wordData.blurLevel)
    offsets.forEach(([dx, dy]) => {
      ctx.fillText(wordData.text, dx, dy)
    })
  }
  //
  // Draw main text
  //
  const textColor = hexToRGBA(wordData.color, wordData.opacity)
  ctx.fillStyle = textColor
  ctx.fillText(wordData.text, 0, 0)
  
  ctx.restore()
}

/**
 * Get outline offsets based on blur level
 * @param {string} blurLevel - Blur level
 * @returns {Array} Array of [dx, dy] offsets
 */
function getOutlineOffsets(blurLevel) {
  if (blurLevel === 'medium') {
    return [
      [-7, -7], [-4, -7], [0, -7], [4, -7], [7, -7],
      [-7, -4], [-4, -4], [0, -4], [4, -4], [7, -4],
      [-7,  0], [-4,  0],          [4,  0], [7,  0],
      [-7,  4], [-4,  4], [0,  4], [4,  4], [7,  4],
      [-7,  7], [-4,  7], [0,  7], [4,  7], [7,  7]
    ]
  } else if (blurLevel === 'heavy') {
    return [
      [-9, -9], [-5, -9], [0, -9], [5, -9], [9, -9],
      [-9, -5], [-5, -5], [0, -5], [5, -5], [9, -5],
      [-9,  0], [-5,  0],          [5,  0], [9,  0],
      [-9,  5], [-5,  5], [0,  5], [5,  5], [9,  5],
      [-9,  9], [-5,  9], [0,  9], [5,  9], [9,  9]
    ]
  }
  return []
}

/**
 * Convert hex color to RGBA string
 * @param {string} hex - Hex color
 * @param {number} opacity - Opacity (0-1)
 * @returns {string} RGBA string
 */
function hexToRGBA(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/**
 * Destroys word pile
 * @param {Object} inst - Word pile instance
 */
export function destroy(inst) {
  const { k, sprite } = inst
  k.destroy(sprite)
}

/**
 * Reset word pile state (no longer needed with canvas approach)
 */
export function reset() {
  // No-op: canvas is regenerated each time
}
