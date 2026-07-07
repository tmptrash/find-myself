//
// Pure Canvas2D drawing primitive for a single mushroom (cap + stem +
// highlight + dots) used both by Touch L0 mushroom sprite generation
// and by the ready/menu background generator. Keeps a single source
// of truth for the mushroom silhouette so on-screen mushrooms and
// background mushrooms stay visually identical.
//
const DEFAULT_OUTLINE_ALPHA = 0.82
const STEM_LINE_WIDTH = 1.5
const HIGHLIGHT_ALPHA = 0.15
const DOT_FILL = 'rgba(255, 255, 240, 0.3)'
const DOT_MAX_COUNT = 3

/**
 * Draws one mushroom (stem + cap + highlight + texture dots) onto a 2D
 * canvas context. The mushroom is rendered upright with its stem base at
 * `(cx, baseY)`.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} opts
 * @param {number} opts.cx - Horizontal centre of the mushroom (canvas px)
 * @param {number} opts.baseY - Bottom Y of the stem (canvas px)
 * @param {number} opts.capWidth - Cap width along its major axis (px)
 * @param {number} opts.capHeight - Cap half-height along its minor axis (px)
 * @param {number} opts.stemWidth - Stem width at the base (px)
 * @param {number} opts.stemHeight - Stem height (px)
 * @param {number[]} opts.capColor - `[r, g, b]` cap fill in 0..255
 * @param {number} [opts.outlineAlpha=0.82]
 * @param {string} [opts.outlineColor=null] - CSS colour for the outline stroke
 *   (null = default translucent black using outlineAlpha)
 * @param {number} [opts.outlineWidth=1.5] - Outline stroke width (px)
 * @param {boolean} [opts.flat=false] - Single-tone silhouette: stem uses the
 *   cap colour and highlight/dots are skipped (glow gray-phase style)
 */
export function drawMushroomToCanvas(ctx, opts) {
  const {
    cx,
    baseY,
    capWidth,
    capHeight,
    stemWidth,
    stemHeight,
    capColor,
    outlineAlpha = DEFAULT_OUTLINE_ALPHA,
    outlineColor = null,
    outlineWidth = STEM_LINE_WIDTH,
    flat = false
  } = opts
  //
  // Stem top sits exactly under the cap base so the half-ellipse cap
  // covers the stem joint cleanly without an outline seam.
  //
  const stemTop = baseY - stemHeight
  ctx.strokeStyle = outlineColor ?? `rgba(0, 0, 0, ${outlineAlpha})`
  ctx.lineWidth = outlineWidth
  ctx.lineJoin = 'round'
  //
  // Stem: slightly tapered trapezoid lightened from the cap colour so the
  // cap reads as the focal colour and the stem fades into shadow.
  // Flat mode keeps the stem in the exact cap colour (single-tone silhouette).
  //
  ctx.fillStyle = flat
    ? `rgb(${capColor[0]}, ${capColor[1]}, ${capColor[2]})`
    : `rgb(${Math.min(255, capColor[0] + 40)}, ${Math.min(255, capColor[1] + 50)}, ${Math.min(255, capColor[2] + 30)})`
  ctx.beginPath()
  ctx.moveTo(cx - stemWidth / 2, baseY)
  ctx.lineTo(cx - stemWidth * 0.4, stemTop)
  ctx.lineTo(cx + stemWidth * 0.4, stemTop)
  ctx.lineTo(cx + stemWidth / 2, baseY)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  //
  // Cap: half-ellipse, full colour, outlined for clean read at small size
  //
  ctx.fillStyle = `rgb(${capColor[0]}, ${capColor[1]}, ${capColor[2]})`
  ctx.beginPath()
  ctx.ellipse(cx, stemTop, capWidth / 2, capHeight, 0, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  //
  // Flat mode ends here — no highlight arc and no cap dots.
  //
  if (flat) return
  //
  // Cap highlight: small lighter arc near the top-left gives a sense of
  // ambient light without needing a real light source.
  //
  ctx.fillStyle = `rgba(255, 255, 255, ${HIGHLIGHT_ALPHA})`
  ctx.beginPath()
  ctx.ellipse(cx - capWidth * 0.1, stemTop - capHeight * 0.3, capWidth * 0.25, capHeight * 0.3, 0, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  //
  // Random pale dots scattered on the cap. Count is randomised but
  // bounded so caps never read as polka-dotted noise.
  //
  const dotCount = Math.floor(Math.random() * DOT_MAX_COUNT) + 1
  ctx.fillStyle = DOT_FILL
  for (let d = 0; d < dotCount; d++) {
    const dotX = cx + (Math.random() - 0.5) * capWidth * 0.6
    const dotY = stemTop - capHeight * (0.2 + Math.random() * 0.5)
    ctx.beginPath()
    ctx.arc(dotX, dotY, 1 + Math.random(), 0, Math.PI * 2)
    ctx.fill()
  }
}
