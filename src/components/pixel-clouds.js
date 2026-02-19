/**
 * Create realistic pixel art clouds using metaball technique
 * Based on test.html algorithm
 * @param {Object} config - Cloud configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {number} [config.size=200] - Cloud size
 * @param {number} [config.layers=15] - Number of layers
 * @param {string} [config.lightSide='right'] - Light direction
 * @param {string} [config.baseColor='#f5d5b8'] - Base color
 * @param {string} [config.shadowColor='#9ba4d6'] - Shadow color
 * @param {string} [config.highlightColor='#ffeedd'] - Highlight color
 * @param {number} [config.pixelSize=2] - Pixel size
 * @param {number} [config.zIndex=5] - Z-index
 * @returns {Object} Cloud sprite object
 */
export function create(config) {
  const {
    k,
    x,
    y,
    size = 200,
    layers = 15,
    lightSide = 'right',
    baseColor = '#f5d5b8',
    shadowColor = '#9ba4d6',
    highlightColor = '#ffeedd',
    pixelSize = 2,
    zIndex = 5
  } = config
  //
  // Convert hex colors to RGB
  //
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }
  
  const rgbToHex = (r, g, b) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
  }
  
  const base = hexToRgb(baseColor)
  const shadow = hexToRgb(shadowColor)
  const highlight = hexToRgb(highlightColor)
  //
  // Create canvas for cloud
  //
  const canvas = document.createElement('canvas')
  const cloudSize = size * 2
  canvas.width = cloudSize
  canvas.height = cloudSize
  const ctx = canvas.getContext('2d')
  //
  // Create cloud layers (metaball technique)
  //
  const cloudLayers = []
  
  for (let layerIndex = 0; layerIndex < layers; layerIndex++) {
    const layerDepth = layerIndex / layers
    const bubblesInLayer = Math.floor(3 + Math.random() * 5)
    const bubbles = []
    
    const layerLightBoost = layerDepth * 0.6
    const layerDarkness = (1 - layerDepth) * 0.3
    
    for (let i = 0; i < bubblesInLayer; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = Math.random() * size * 0.5
      const radius = size * 0.15 + Math.random() * size * 0.25
      
      const bx = Math.cos(angle) * distance
      const by = Math.sin(angle) * distance * 0.6 - (layerDepth - 0.5) * size * 0.3
      
      bubbles.push({
        x: bx,
        y: by,
        radius: radius,
        density: 0.5 + Math.random() * 0.4
      })
    }
    
    cloudLayers.push({
      bubbles: bubbles,
      depth: layerDepth,
      lightBoost: layerLightBoost,
      darkness: layerDarkness
    })
  }
  //
  // Draw cloud layers
  //
  for (const layer of cloudLayers) {
    const halfSize = size
    
    for (let py = -halfSize; py <= halfSize; py += pixelSize) {
      for (let px = -halfSize; px <= halfSize; px += pixelSize) {
        let totalDensity = 0
        
        for (const bubble of layer.bubbles) {
          const dx = px - bubble.x
          const dy = py - bubble.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < bubble.radius) {
            const falloff = 1 - (dist / bubble.radius)
            totalDensity += falloff * falloff * bubble.density
          }
        }
        
        const threshold = 0.25 - layer.depth * 0.1
        
        if (totalDensity > threshold) {
          const density = Math.min(totalDensity, 1)
          
          let lightFactor = 0
          
          switch (lightSide) {
            case 'right':
              lightFactor = (px / halfSize) * 0.5 + 0.5
              break
            case 'left':
              lightFactor = (-px / halfSize) * 0.5 + 0.5
              break
            case 'top':
              lightFactor = (-py / halfSize) * 0.5 + 0.5
              break
            case 'bottom':
              lightFactor = (py / halfSize) * 0.5 + 0.5
              break
          }
          
          lightFactor = lightFactor * 0.5 + density * 0.2 + layer.lightBoost - layer.darkness
          lightFactor = Math.max(0, Math.min(1, lightFactor))
          
          let r, g, b
          
          if (lightFactor > 0.65) {
            const t = (lightFactor - 0.65) / 0.35
            r = Math.floor(base.r + (highlight.r - base.r) * t)
            g = Math.floor(base.g + (highlight.g - base.g) * t)
            b = Math.floor(base.b + (highlight.b - base.b) * t)
          } else if (lightFactor > 0.3) {
            r = Math.floor(base.r)
            g = Math.floor(base.g)
            b = Math.floor(base.b)
          } else {
            const t = lightFactor / 0.3
            r = Math.floor(shadow.r + (base.r - shadow.r) * t)
            g = Math.floor(shadow.g + (base.g - shadow.g) * t)
            b = Math.floor(shadow.b + (base.b - shadow.b) * t)
          }
          
          ctx.fillStyle = rgbToHex(r, g, b)
          ctx.fillRect(
            size + px,
            size + py,
            pixelSize,
            pixelSize
          )
        }
      }
    }
  }
  //
  // Convert canvas to data URL for Kaplay sprite
  //
  const cloudSprite = canvas.toDataURL()
  const spriteId = `cloud-${Date.now()}-${Math.random()}`
  k.loadSprite(spriteId, cloudSprite)
  //
  // Create cloud object
  //
  const cloudObj = k.add([
    k.sprite(spriteId),
    k.pos(x, y),
    k.anchor('center'),
    k.z(zIndex),
    k.fixed()
  ])
  
  return cloudObj
}
