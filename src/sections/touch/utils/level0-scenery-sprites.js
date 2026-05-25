//
// Scrolling cloud band (seamless horizontal loop via PNG sprite)
//
const CLOUD_SCROLL_SPEED = 8
const CLOUD_BAND_HEIGHT = 110
const CLOUD_SPRITE_NAME = 'touch-l0-cloud-band'
//
// Floor thorn bake sprite
//
const THORN_SPRITE_NAME = 'touch-l0-floor-thorns'
const THORN_CANVAS_PAD_Y = 28

/**
 * Creates infinitely scrolling cloud band from a pre-baked PNG strip
 * @param {Object} k - Kaplay instance
 * @param {Object} layout - Play area layout
 * @param {number} layout.areaLeft - Left edge of cloud band
 * @param {number} layout.areaRight - Right edge of cloud band
 * @param {number} layout.cloudTopY - Top Y of cloud layer
 * @param {number} layout.cloudBottomY - Bottom Y of cloud layer
 * @param {number} layout.cloudCount - Number of cloud puffs in the band
 * @param {number} layout.cloudRandomness - Horizontal jitter per cloud
 * @param {Object} layout.baseCloudColor - Kaplay RGB color
 */
export function createScrollingCloudBand(k, layout) {
  const {
    areaLeft,
    areaRight,
    cloudTopY,
    cloudBottomY,
    cloudCount,
    cloudRandomness,
    baseCloudColor
  } = layout
  const bandWidth = areaRight - areaLeft
  const cloudSpacing = bandWidth / cloudCount
  const cloudConfigs = []
  for (let i = 0; i < cloudCount; i++) {
    const baseX = cloudSpacing * i + cloudSpacing * 0.5
    const cloudX = baseX + (Math.random() - 0.5) * cloudRandomness
    const cloudY = cloudTopY + Math.random() * (cloudBottomY - cloudTopY)
    const crownSize = (50 + Math.random() * 60) * 1.2
    const crownCount = 5 + Math.floor(Math.random() * 4)
    const crowns = []
    for (let j = 0; j < crownCount; j++) {
      crowns.push({
        offsetX: (Math.random() - 0.5) * crownSize * 0.7,
        offsetY: (Math.random() - 0.5) * crownSize * 0.5,
        sizeVariation: 0.6 + Math.random() * 0.6,
        opacityVariation: 0.7 + Math.random() * 0.2
      })
    }
    cloudConfigs.push({
      x: cloudX,
      y: cloudY,
      crownSize,
      crowns,
      color: baseCloudColor,
      opacity: 0.85 + Math.random() * 0.1
    })
  }
  const canvas = document.createElement('canvas')
  canvas.width = bandWidth
  canvas.height = CLOUD_BAND_HEIGHT
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, bandWidth, CLOUD_BAND_HEIGHT)
  const yShift = cloudTopY - (cloudTopY + cloudBottomY) / 2 + CLOUD_BAND_HEIGHT / 2 - 50
  for (const cloud of cloudConfigs) {
    for (const crown of cloud.crowns) {
      const cx = cloud.x + crown.offsetX
      const cy = cloud.y + crown.offsetY - yShift
      const r = cloud.crownSize * crown.sizeVariation
      ctx.globalAlpha = cloud.opacity * crown.opacityVariation
      ctx.fillStyle = `rgb(${baseCloudColor.r}, ${baseCloudColor.g}, ${baseCloudColor.b})`
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
  k.loadSprite(CLOUD_SPRITE_NAME, canvas)
  canvas.width = 0
  canvas.height = 0
  const bandY = (cloudTopY + cloudBottomY) / 2 - CLOUD_BAND_HEIGHT / 2
  const scrollInst = { offset: 0 }
  const cloudZ = 1
  k.add([
    k.sprite(CLOUD_SPRITE_NAME),
    k.pos(areaLeft, bandY),
    k.z(cloudZ),
    {
      update() {
        scrollInst.offset = (scrollInst.offset + CLOUD_SCROLL_SPEED * k.dt()) % bandWidth
        this.pos.x = areaLeft + scrollInst.offset - bandWidth
      }
    }
  ])
  k.add([
    k.sprite(CLOUD_SPRITE_NAME),
    k.pos(areaLeft, bandY),
    k.z(cloudZ),
    {
      update() {
        this.pos.x = areaLeft + scrollInst.offset
      }
    }
  ])
}

/**
 * Bakes floor thorn spikes into a single PNG sprite
 * @param {Object} k - Kaplay instance
 * @param {Array} thornData - Thorn descriptors from generateFloorThornsWithGaps
 * @param {Object} fillColor - Kaplay RGB fill color
 * @param {number} drawZ - Z-index for the sprite
 * @returns {Object|null} Kaplay game object or null when no thorns
 */
export function createFloorThornSprite(k, thornData, fillColor, drawZ) {
  if (!thornData?.length) return null
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  thornData.forEach(thorn => {
    minX = Math.min(minX, thorn.x - thorn.width)
    maxX = Math.max(maxX, thorn.x + thorn.width)
    minY = Math.min(minY, thorn.baseY - thorn.height)
    maxY = Math.max(maxY, thorn.baseY + 4)
  })
  const padX = 8
  const width = Math.ceil(maxX - minX + padX * 2)
  const height = Math.ceil(maxY - minY + THORN_CANVAS_PAD_Y)
  const offsetX = minX - padX
  const offsetY = minY - THORN_CANVAS_PAD_Y / 2
  const shifted = thornData.map(thorn => ({
    ...thorn,
    x: thorn.x - offsetX,
    baseY: thorn.baseY - offsetY
  }))
  const dataUrl = document.createElement('canvas')
  dataUrl.width = width
  dataUrl.height = height
  const ctx = dataUrl.getContext('2d')
  ctx.clearRect(0, 0, width, height)
  //
  // Draw thorns via offscreen Kaplay-style polygons on canvas
  //
  const thornColor = fillColor
  const outlineColor = { r: 10, g: 9, b: 8 }
  const hi = { r: 118, g: 98, b: 78 }
  shifted.forEach(thorn => {
    const hw = thorn.width / 2
    const h = thorn.height
    const skew = Math.sin(thorn.x * 0.09 + thorn.baseY * 0.02) * (hw * 0.35)
    const tipX = thorn.x + (thorn.tipOffset || 0) + Math.cos(thorn.x * 0.06) * (hw * 0.25)
    const tipY = thorn.baseY - h
    const midRX = thorn.x + hw * 0.25 + skew
    const midLX = thorn.x - hw * 0.35 + skew * 0.4
    const upperMidY = thorn.baseY - h * 0.38
    const ow = 1.15
    ctx.fillStyle = `rgb(${outlineColor.r}, ${outlineColor.g}, ${outlineColor.b})`
    ctx.beginPath()
    ctx.moveTo(thorn.x - hw - ow, thorn.baseY + ow * 0.6)
    ctx.lineTo(thorn.x + hw + ow, thorn.baseY + ow * 0.6)
    ctx.lineTo(midRX + ow * 0.8, upperMidY)
    ctx.lineTo(tipX, tipY - ow)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = `rgb(${thornColor.r}, ${thornColor.g}, ${thornColor.b})`
    ctx.beginPath()
    ctx.moveTo(thorn.x - hw, thorn.baseY)
    ctx.lineTo(thorn.x + hw, thorn.baseY)
    ctx.lineTo(midRX, upperMidY - 1)
    ctx.lineTo(tipX, tipY)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = `rgba(${hi.r}, ${hi.g}, ${hi.b}, 0.35)`
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.moveTo(midLX, thorn.baseY - 3)
    ctx.lineTo(tipX - skew * 0.2, tipY + h * 0.08)
    ctx.stroke()
  })
  k.loadSprite(THORN_SPRITE_NAME, dataUrl)
  dataUrl.width = 0
  dataUrl.height = 0
  return k.add([
    k.sprite(THORN_SPRITE_NAME),
    k.pos(offsetX, offsetY),
    k.z(drawZ)
  ])
}
