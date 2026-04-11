/**
 * Draws a fir tree on a canvas context
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} x - Base X position (trunk center)
 * @param {number} y - Base Y position (ground level)
 * @param {number} height - Total tree height
 * @param {Object} [opt] - Drawing options
 * @param {number} [opt.swayOffset] - Horizontal sway offset per layer (px), scaled by layer index
 */
export function drawFirTree(ctx, x, y, height, opt = {}) {
  opt.trunkWidthPercent = Math.min(Math.max(opt?.trunkWidthPercent || .04, .0001), 1)
  opt.trunkHeightPercent = Math.min(Math.max(opt?.trunkHeightPercent || .15, .0001), 1)
  opt.trunkColor = opt?.trunkColor || '#4a2e1f'
  opt.layers = Math.min(Math.max(opt?.layers || 5, 1), 9)
  opt.layer0WidthPercent = Math.min(Math.max(opt?.layer0WidthPercent || .4, .1), .9)
  opt.layersDecWidthPercent = Math.min(Math.max(opt?.layersDecWidthPercent || .15, .1), .9)
  opt.layersSharpness = Math.min(Math.max(opt?.layersSharpness || 10, 0), 50)
  opt.leftColor = opt?.leftColor || [30, 0, 40]
  const swayOffset = opt.swayOffset || 0
  if (height * opt.layers * opt.layersDecWidthPercent >= height) opt.layersDecWidthPercent = (height - .001) / (opt.layers * height)

  const trunkWidth  = height * opt.trunkWidthPercent
  const trunkHeight = height * opt.trunkHeightPercent
  const layerHeight = (height - trunkHeight) / opt.layers
  let baseY = y - trunkHeight

  ctx.fillStyle = opt.trunkColor
  ctx.fillRect(x - trunkWidth / 2, y - trunkHeight, trunkWidth, trunkHeight)

  for (let i = 0; i < opt.layers; i++) {
    const layerWidth = height * opt.layer0WidthPercent - height * opt.layer0WidthPercent * i * opt.layersDecWidthPercent
    const topY = baseY - layerHeight
    const offsetX = (Math.random() - 0.5) * layerWidth / 3
    //
    // Wind sway increases with height (higher layers sway more)
    //
    const layerSway = swayOffset * (i + 1) / opt.layers

    ctx.fillStyle = `rgb(${opt.leftColor[0]}, ${opt.leftColor[1]}, ${opt.leftColor[2]})`
    ctx.beginPath()
    ctx.moveTo(x + offsetX + layerSway, baseY)
    ctx.lineTo(x - layerWidth / 2 + layerSway, baseY)
    ctx.lineTo(x + layerSway, topY - opt.layersSharpness)
    ctx.fill()

    ctx.fillStyle = `rgb(${opt.rightColor[0]}, ${opt.rightColor[1]}, ${opt.rightColor[2]})`
    ctx.beginPath()
    ctx.moveTo(x + offsetX + layerSway, baseY)
    ctx.lineTo(x + layerWidth / 2 + layerSway, baseY)
    ctx.lineTo(x + layerSway, topY - opt.layersSharpness)
    ctx.fill()

    baseY = topY
  }
}
