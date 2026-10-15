//
// Canvas2D ragged ground rim: replaces a ruler-straight ground line with the
// reference's busy edge — a dark wavy soil lip, crumbly earth lumps, patches
// of moss and dry litter that change colour along the run, pebbles poking
// out and a few fallen twigs. The walkable line itself stays at floorY.
//
const RIM_STEP = 3
const RIM_LIP_DEPTH_MIN = 2
const RIM_LIP_DEPTH_RANGE = 5
const RIM_LIP_WAVE_A = 0.09
const RIM_LIP_WAVE_B = 0.23
const RIM_LIP_WAVE_A_AMP = 1.6
const RIM_LIP_WAVE_B_AMP = 1
const RIM_LIP_JITTER = 1.4
const RIM_PATCH_MIN = 14
const RIM_PATCH_RANGE = 46
const RIM_PATCH_GAP_MAX = 18
const RIM_PATCH_MOSS_CHANCE = 0.5
const RIM_PATCH_DRY_CHANCE = 0.35
const RIM_PATCH_RISE_MIN = 1
const RIM_PATCH_RISE_RANGE = 3
const RIM_PATCH_SINK = 2
const RIM_SPECK_SPACING = 4
const RIM_SPECK_PX = 2
const RIM_LUMP_SPACING_MIN = 10
const RIM_LUMP_SPACING_RANGE = 22
const RIM_LUMP_R_MIN = 1.5
const RIM_LUMP_R_RANGE = 2.5
const RIM_PEBBLE_SPACING_MIN = 36
const RIM_PEBBLE_SPACING_RANGE = 70
const RIM_PEBBLE_RX_MIN = 2.5
const RIM_PEBBLE_RX_RANGE = 3.5
const RIM_PEBBLE_RY_FRAC = 0.62
const RIM_PEBBLE_OUTLINE_PX = 1
const RIM_TWIG_SPACING_MIN = 70
const RIM_TWIG_SPACING_RANGE = 120
const RIM_TWIG_LEN_MIN = 6
const RIM_TWIG_LEN_RANGE = 9
const RIM_TWIG_PX = 1.2
const RIM_BOUNDS_UP = 10
const RIM_BOUNDS_DOWN = 12

/**
 * Paints the ragged ground rim along [x1, x2] at floorY.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} opts
 * @param {number} opts.x1 - Left world X
 * @param {number} opts.x2 - Right world X
 * @param {number} opts.floorY - Walkable ground Y
 * @param {() => number} opts.rng - Seeded random in [0, 1)
 * @param {Object} opts.colors - CSS colours
 * @param {string} opts.colors.soil - Dark soil lip
 * @param {string} opts.colors.earth - Crumbly lumps
 * @param {string} opts.colors.moss - Moss patches
 * @param {string} opts.colors.mossLight - Lit moss specks
 * @param {string} opts.colors.dry - Dry litter patches
 * @param {string} opts.colors.dryLight - Sunlit litter specks
 * @param {string} opts.colors.pebble - Pebbles
 * @param {string} opts.colors.contour - Pebble contour
 */
export function drawGroundRimToCanvas(ctx, opts) {
  const { x1, x2, floorY, rng, colors } = opts
  paintSoilLip(ctx, x1, x2, floorY, rng, colors.soil)
  paintLumps(ctx, x1, x2, floorY, rng, colors.earth)
  paintPatches(ctx, x1, x2, floorY, rng, colors)
  paintPebbles(ctx, x1, x2, floorY, rng, colors)
  paintTwigs(ctx, x1, x2, floorY, rng, colors.soil)
}

/**
 * World bounds of a rim run.
 * @param {number} x1 - Left world X
 * @param {number} x2 - Right world X
 * @param {number} floorY - Walkable ground Y
 * @returns {{x1: number, y1: number, x2: number, y2: number}}
 */
export function groundRimBounds(x1, x2, floorY) {
  return { x1: x1 - RIM_BOUNDS_UP, y1: floorY - RIM_BOUNDS_UP, x2: x2 + RIM_BOUNDS_UP, y2: floorY + RIM_BOUNDS_DOWN }
}
//
// Dark band hugging the ground line; its lower edge waves and steps so the
// topsoil reads torn rather than ruled.
//
function paintSoilLip(ctx, x1, x2, floorY, rng, color) {
  const phase = rng() * Math.PI * 2
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x1, floorY - 1)
  ctx.lineTo(x2, floorY - 1)
  for (let x = x2; x >= x1; x -= RIM_STEP) {
    const wave = Math.sin(x * RIM_LIP_WAVE_A + phase) * RIM_LIP_WAVE_A_AMP + Math.sin(x * RIM_LIP_WAVE_B) * RIM_LIP_WAVE_B_AMP
    const depth = RIM_LIP_DEPTH_MIN + RIM_LIP_DEPTH_RANGE * (0.5 + wave / (2 * (RIM_LIP_WAVE_A_AMP + RIM_LIP_WAVE_B_AMP)))
    ctx.lineTo(x, floorY + depth + (rng() - 0.5) * RIM_LIP_JITTER)
  }
  ctx.closePath()
  ctx.fill()
}
function paintLumps(ctx, x1, x2, floorY, rng, color) {
  ctx.fillStyle = color
  for (let x = x1 + rng() * RIM_LUMP_SPACING_MIN; x < x2; x += RIM_LUMP_SPACING_MIN + rng() * RIM_LUMP_SPACING_RANGE) {
    const r = RIM_LUMP_R_MIN + rng() * RIM_LUMP_R_RANGE
    ctx.beginPath()
    ctx.arc(x, floorY + r * 0.3, r, Math.PI, 0)
    ctx.fill()
  }
}
//
// Alternating moss / dry-litter / bare runs, each a low wavy cushion on the
// line with lighter specks along its top.
//
function paintPatches(ctx, x1, x2, floorY, rng, colors) {
  let x = x1
  while (x < x2) {
    const len = RIM_PATCH_MIN + rng() * RIM_PATCH_RANGE
    const roll = rng()
    const kind = roll < RIM_PATCH_MOSS_CHANCE ? 'moss' : roll < RIM_PATCH_MOSS_CHANCE + RIM_PATCH_DRY_CHANCE ? 'dry' : null
    kind && paintPatch(ctx, x, Math.min(x2, x + len), floorY, rng,
      kind === 'moss' ? colors.moss : colors.dry,
      kind === 'moss' ? colors.mossLight : colors.dryLight)
    x += len + rng() * RIM_PATCH_GAP_MAX
  }
}
function paintPatch(ctx, px1, px2, floorY, rng, base, light) {
  const rise = RIM_PATCH_RISE_MIN + rng() * RIM_PATCH_RISE_RANGE
  const w = px2 - px1
  const tops = []
  for (let x = px1; x <= px2; x += RIM_STEP) {
    const t = (x - px1) / Math.max(1, w)
    tops.push({ x, y: floorY - Math.sin(Math.PI * t) * rise - rng() * 1.2 })
  }
  ctx.fillStyle = base
  ctx.beginPath()
  ctx.moveTo(px1, floorY + RIM_PATCH_SINK)
  tops.forEach(p => ctx.lineTo(p.x, p.y))
  ctx.lineTo(px2, floorY + RIM_PATCH_SINK)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = light
  for (let i = 0; i < tops.length; i += Math.max(1, Math.round(RIM_SPECK_SPACING / RIM_STEP))) {
    rng() < 0.6 && ctx.fillRect(Math.round(tops[i].x), Math.round(tops[i].y), RIM_SPECK_PX, RIM_SPECK_PX - 1)
  }
}
function paintPebbles(ctx, x1, x2, floorY, rng, colors) {
  ctx.lineWidth = RIM_PEBBLE_OUTLINE_PX
  ctx.strokeStyle = colors.contour
  ctx.fillStyle = colors.pebble
  for (let x = x1 + rng() * RIM_PEBBLE_SPACING_MIN; x < x2; x += RIM_PEBBLE_SPACING_MIN + rng() * RIM_PEBBLE_SPACING_RANGE) {
    const rx = RIM_PEBBLE_RX_MIN + rng() * RIM_PEBBLE_RX_RANGE
    ctx.beginPath()
    ctx.ellipse(x, floorY + 1, rx, rx * RIM_PEBBLE_RY_FRAC, (rng() - 0.5) * 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
}
function paintTwigs(ctx, x1, x2, floorY, rng, color) {
  ctx.strokeStyle = color
  ctx.lineWidth = RIM_TWIG_PX
  ctx.lineCap = 'round'
  for (let x = x1 + rng() * RIM_TWIG_SPACING_MIN; x < x2; x += RIM_TWIG_SPACING_MIN + rng() * RIM_TWIG_SPACING_RANGE) {
    const len = RIM_TWIG_LEN_MIN + rng() * RIM_TWIG_LEN_RANGE
    const tilt = (rng() - 0.5) * 0.5
    ctx.beginPath()
    ctx.moveTo(x, floorY - 1)
    ctx.lineTo(x + Math.cos(tilt) * len, floorY - 1 + Math.sin(tilt) * len)
    ctx.stroke()
  }
}
