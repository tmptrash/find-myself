//
// Pure Canvas2D drawing primitive for the warm-amber moon used by the
// touch L3 sky background, the ready / menu background composite and
// any other scene that wants the same celestial body.
//
// The moon = soft radial halo + solid disc (warm amber) + a handful of
// darker craters clipped to the disc. All sizes/positions are
// parameter-driven so the caller controls placement, while the moon
// retains its "L3 night sky" identity across scenes.
//
const DEFAULT_GLOW_RATIO = 30 / 56
const DEFAULT_COLOR_R = 232
const DEFAULT_COLOR_G = 200
const DEFAULT_COLOR_B = 145
const HALO_INNER_RATIO = 0.8
const HALO_INNER_ALPHA = 0.15
const HALO_MID_ALPHA = 0.06
const HALO_MID_STOP = 0.4
//
// L3's canonical crater set — preserved here so every moon in the
// game uses the exact same surface markings. Positions are unit
// fractions of the moon radius; `dark` is subtracted from the body
// RGB to get the crater fill colour.
//
const DEFAULT_CRATERS = [
  { x: -0.3, y: -0.2, r: 0.25, dark: 25 },
  { x: 0.25, y: 0.15, r: 0.2, dark: 20 },
  { x: -0.1, y: 0.35, r: 0.16, dark: 30 },
  { x: 0.4, y: -0.25, r: 0.13, dark: 22 },
  { x: -0.45, y: 0.1, r: 0.11, dark: 18 },
  { x: 0.1, y: -0.45, r: 0.1, dark: 28 }
]

/**
 * Draws a full moon (warm amber disc + soft radial halo + clipped
 * craters) onto a 2D canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} opts
 * @param {number} opts.cx - Moon disc centre X (px)
 * @param {number} opts.cy - Moon disc centre Y (px)
 * @param {number} opts.radius - Moon disc radius (px)
 * @param {number} [opts.glowRadius] - Halo extent ADDED to the disc
 *        radius. Defaults so the halo proportion matches L3 (30/56).
 * @param {{ r: number, g: number, b: number }} [opts.color] - Body RGB.
 *        Defaults to the L3 warm amber.
 * @param {Array<{ x: number, y: number, r: number, dark: number }>} [opts.craters]
 *        Crater descriptors (positions/sizes as fractions of `radius`,
 *        `dark` as RGB offset subtracted from body). Defaults to the
 *        L3 crater set.
 */
export function drawMoonToCanvas(ctx, opts) {
  const {
    cx,
    cy,
    radius,
    glowRadius = radius * DEFAULT_GLOW_RATIO,
    color = { r: DEFAULT_COLOR_R, g: DEFAULT_COLOR_G, b: DEFAULT_COLOR_B },
    craters = DEFAULT_CRATERS
  } = opts
  ctx.save()
  //
  // Smooth radial halo — no discrete rings, fades from the disc edge
  // outward to fully transparent. Inner stop starts at 80% of the
  // body so the halo blends seamlessly into the disc.
  //
  const outerR = radius + glowRadius
  const gradient = ctx.createRadialGradient(cx, cy, radius * HALO_INNER_RATIO, cx, cy, outerR)
  gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${HALO_INNER_ALPHA})`)
  gradient.addColorStop(HALO_MID_STOP, `rgba(${color.r}, ${color.g}, ${color.b}, ${HALO_MID_ALPHA})`)
  gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`)
  ctx.beginPath()
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
  ctx.fillStyle = gradient
  ctx.fill()
  //
  // Solid moon disc — warm amber against the cool teal night sky.
  //
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
  ctx.fill()
  //
  // Darker craters clipped to the moon disc so they never spill onto
  // the halo. Each crater shifts the body RGB darker by its `dark`
  // offset, giving subtle surface variation.
  //
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.clip()
  craters.forEach(crater => {
    const cr = color.r - crater.dark
    const cg = color.g - crater.dark
    const cb = color.b - crater.dark
    ctx.beginPath()
    ctx.arc(
      cx + crater.x * radius,
      cy + crater.y * radius,
      crater.r * radius,
      0, Math.PI * 2
    )
    ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`
    ctx.fill()
  })
  ctx.restore()
  ctx.restore()
}
