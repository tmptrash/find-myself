import { CFG } from '../cfg.js'
import { toPng } from '../../../utils/helper.js'
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
// Floating animation parameters (firefly-like random trajectory per background)
//
const FLOAT_AMP_MIN = 3
const FLOAT_AMP_MAX = 8
const FLOAT_SPEED_MIN = 0.4
const FLOAT_SPEED_MAX = 1.1
const FREQ_MIN = 0.4
const FREQ_MAX = 1.5
const MIX_MIN = 0.3
const MIX_MAX = 0.7
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
  // Create separate sprite per layer for independent floating animation
  //
  const layerSprites = []
  const baseSpriteId = `word-pile-bg-${Date.now()}`
  
  wordDataLayers.forEach((layer, layerIndex) => {
    const layerWords = layer.words.map(word => ({ ...word, layerConfig: layer.config }))
    const dataURL = toPng({ width, height, pixelRatio: 1 }, (ctx) => {
      ctx.clearRect(0, 0, width, height)
      layerWords.forEach(word => renderWordToCanvas(ctx, word))
    })
    const spriteId = `${baseSpriteId}-${layerIndex}`
    k.loadSprite(spriteId, dataURL)
    const sprite = k.add([
      k.sprite(spriteId),
      k.pos(playableLeft, playableTop),
      k.z(layer.config.zIndex),
      k.fixed()
    ])
    //
    // Random trajectory coefficients (firefly-like, unique per background)
    //
    const freq1 = FREQ_MIN + Math.random() * (FREQ_MAX - FREQ_MIN)
    const freq2 = FREQ_MIN + Math.random() * (FREQ_MAX - FREQ_MIN)
    const freq3 = FREQ_MIN + Math.random() * (FREQ_MAX - FREQ_MIN)
    const mix1 = MIX_MIN + Math.random() * (MIX_MAX - MIX_MIN)
    const mix2 = MIX_MIN + Math.random() * (MIX_MAX - MIX_MIN)
    layerSprites.push({
      dt: performance.now() + Math.random() * 100,
      sprite,
      baseX: playableLeft,
      baseY: playableTop,
      freq1,
      freq2,
      freq3,
      mix1,
      mix2
    })
  })
  //
  // Register floating animation update, cancel on scene leave
  //
  const inst = {
    k,
    layerSprites,
    playableLeft,
    playableRight,
    playableTop,
    playableBottom
  }
  const updateController = k.onUpdate(() => onUpdate(inst))
  k.onSceneLeave(() => updateController.cancel())
  
  return inst
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
 * Per-frame floating animation for background word layers
 * Each of 2 backgrounds follows its own random firefly-like trajectory (Lissajous curve)
 * @param {Object} inst - Word pile instance
 */
function onUpdate(inst) {
  inst.layerSprites.forEach((layer, i) => {
    layer.dt = performance.now() / (700 * (i + .7))
    layer.sprite.pos.x = layer.baseX + Math.cos(layer.dt) * 10
    layer.sprite.pos.y = layer.baseY + Math.sin(layer.dt) * 15
  })
}

/**
 * Destroys word pile
 * @param {Object} inst - Word pile instance
 */
export function destroy(inst) {
  const { k, layerSprites } = inst
  layerSprites.forEach((layer) => k.destroy(layer.sprite))
}

/**
 * Reset word pile state (no longer needed with canvas approach)
 */
export function reset() {
  // No-op: canvas is regenerated each time
}
