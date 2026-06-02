import { buildCloudCrown, computeCloudCrownsBounds, drawCloudCrownToCanvas } from '../../../utils/draw-cloud-crown.js'
import { CFG } from '../cfg.js'

//
// Touch L0-style scrolling cloud band — muted purple-grey for word void
//
const CLOUD_SCROLL_SPEED = 7
const CLOUD_SPRITE_NAME = 'word-cloud-band'
const CLOUD_CANVAS_PAD = 48
const CLOUD_Z = (CFG.visual.zIndex.wordThoughtSky ?? -118) + 2
const WORD_CLOUD_R = 52
const WORD_CLOUD_G = 54
const WORD_CLOUD_B = 78

/**
 * Creates infinitely scrolling cloud crowns across the top of the playfield void
 * @param {Object} k - Kaplay instance
 * @param {Object} layout - Layout configuration
 * @param {number} layout.playLeft - Left edge of cloud band
 * @param {number} layout.playRight - Right edge of cloud band
 * @param {number} layout.playTop - Top platform bottom Y (playfield start)
 * @returns {Object} Cloud band instance
 */
export function create(k, layout) {
  const { playLeft, playRight, playTop } = layout
  const areaLeft = playLeft
  const areaRight = playRight
  const cloudTopY = playTop + 16
  const cloudBottomY = playTop + 130
  const cloudCount = 16
  const cloudRandomness = 28
  const baseCloudColor = k.rgb(WORD_CLOUD_R, WORD_CLOUD_G, WORD_CLOUD_B)
  const bandWidth = areaRight - areaLeft
  const cloudSpacing = bandWidth / cloudCount
  const cloudConfigs = []
  for (let i = 0; i < cloudCount; i++) {
    const baseX = cloudSpacing * i + cloudSpacing * 0.5
    const cloudX = baseX + (Math.random() - 0.5) * cloudRandomness
    const cloudY = cloudTopY + Math.random() * (cloudBottomY - cloudTopY)
    cloudConfigs.push(buildCloudCrown({ x: cloudX, y: cloudY }))
  }
  const localConfigs = cloudConfigs.map(c => ({ ...c, y: c.y - cloudTopY }))
  const { minX: minDrawX, maxX: maxDrawX, minY: minDrawY, maxY: maxDrawY } = computeCloudCrownsBounds(localConfigs)
  const pad = CLOUD_CANVAS_PAD
  const contentWidth = Math.ceil(maxDrawX - minDrawX)
  const contentHeight = Math.ceil(maxDrawY - minDrawY)
  const canvasWidth = contentWidth + pad * 2
  const canvasHeight = contentHeight + pad * 2
  const originX = minDrawX - pad
  const originY = minDrawY - pad
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  const drawAtWrapOffset = (wrapOffsetX) => {
    for (const cloud of localConfigs) {
      drawCloudCrownToCanvas(ctx, cloud, baseCloudColor, {
        offsetX: wrapOffsetX - originX + pad,
        offsetY: -originY + pad
      })
    }
  }
  drawAtWrapOffset(0)
  drawAtWrapOffset(-bandWidth)
  drawAtWrapOffset(bandWidth)
  k.loadSprite(CLOUD_SPRITE_NAME, canvas)
  canvas.width = 0
  canvas.height = 0
  const bandY = cloudTopY + originY
  const scrollInst = { offset: 0 }
  const spriteLeft = areaLeft + originX
  k.add([
    k.sprite(CLOUD_SPRITE_NAME),
    k.pos(spriteLeft, bandY),
    k.anchor('topleft'),
    k.fixed(),
    k.z(CLOUD_Z),
    {
      update() {
        scrollInst.offset = (scrollInst.offset + CLOUD_SCROLL_SPEED * k.dt()) % bandWidth
        this.pos.x = spriteLeft + scrollInst.offset - bandWidth
      }
    }
  ])
  k.add([
    k.sprite(CLOUD_SPRITE_NAME),
    k.pos(spriteLeft, bandY),
    k.anchor('topleft'),
    k.fixed(),
    k.z(CLOUD_Z),
    {
      update() {
        this.pos.x = spriteLeft + scrollInst.offset
      }
    }
  ])
  return scrollInst
}
