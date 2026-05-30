//
// Pure Canvas2D drawing primitive for a single grass blade. The on-
// screen dynamic grass drawer (Touch L0) uses Kaplay's k.drawLine for
// per-frame sway and hero interaction; this canvas-side equivalent is
// used by the menu/ready background generator (and any other static
// bake path) so all grass on screen shares one visual style.
//

/**
 * Builds a randomised grass-blade descriptor anchored at `(baseX, grassY)`.
 * Mirrors L0's `buildGrassBlade` shape so dynamic & static blades share
 * one data layout.
 *
 * @param {Object} opts
 * @param {number} opts.baseX - Blade base X (world px)
 * @param {number} opts.grassY - Ground line Y (world px)
 * @param {number} opts.scale - Layer scale factor (1 = front)
 * @param {number} opts.baseOpacity - Layer base opacity in 0..1
 * @param {number} opts.baseR - Base R (0..255)
 * @param {number} opts.baseG - Base G (0..255)
 * @param {number} opts.baseB - Base B (0..255)
 * @returns {Object} Blade descriptor
 */
export function buildGrassBladeData(opts) {
  const { baseX, grassY, scale, baseOpacity, baseR, baseG, baseB } = opts
  const height = (10 + Math.random() * 20) * scale
  const bendX = (Math.random() - 0.5) * 6
  return {
    x1: baseX,
    y1: grassY,
    baseX2: baseX + bendX,
    y2: grassY - height,
    height,
    swaySpeed: 0.8 + Math.random() * 0.6,
    swayAmount: (2 + Math.random() * 3) * scale,
    swayOffset: Math.random() * Math.PI * 2,
    color: {
      r: clamp255(baseR + Math.random() * 20),
      g: clamp255(baseG + Math.random() * 20),
      b: clamp255(baseB + Math.random() * 15)
    },
    opacity: baseOpacity + Math.random() * 0.15,
    width: (0.8 + Math.random() * 0.4) * scale
  }
}

/**
 * Draws a single grass blade onto a 2D canvas context as a straight
 * line from base `(x1, y1)` to tip `(baseX2, y2)`. The static draw uses
 * sway = 0 (no animation) so the resulting image bakes the resting
 * pose into the canvas.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} blade - Output of `buildGrassBladeData`
 * @param {number} [sway=0] - Optional horizontal offset added to the tip
 */
export function drawGrassBladeToCanvas(ctx, blade, sway = 0) {
  ctx.strokeStyle = `rgba(${Math.round(blade.color.r)}, ${Math.round(blade.color.g)}, ${Math.round(blade.color.b)}, ${blade.opacity})`
  ctx.lineWidth = blade.width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(blade.x1, blade.y1)
  ctx.lineTo(blade.baseX2 + sway, blade.y2)
  ctx.stroke()
}

function clamp255(v) {
  return Math.max(0, Math.min(255, v))
}
