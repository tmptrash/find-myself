//
// Swaying grass — thick baked blade sprites growing in tufts (never an even
// spread). Blades are baked white and tinted at draw time, so any scene can
// colour (or hide) each blade per frame through the getTint callback.
// Extracted from the glow section so every section shares one grass look.
//
const BLADE_VARIANTS = 5
const BLADE_W = 14
const BLADE_H = 34
const BLADE_SCALE_MIN = 0.55
const BLADE_SCALE_RANGE = 0.65
const SWAY_DEG = 4
const SWAY_SPEED_MIN = 0.8
const SWAY_SPEED_RANGE = 0.7
const TUFT_BLADES_MIN = 3
const TUFT_BLADES_RANGE = 4
const TUFT_SPREAD = 14
//
// Generous retry budget per tuft — density-weighted placement rejects many
// candidate positions, so the sampler needs room to keep the tuft count.
//
const TUFT_PLACE_ATTEMPTS = 24
const CULL_PAD = 48
//
// Every blade shape lives in ONE atlas sprite instead of a sprite per
// variant. A dense field draws dozens of blades per frame, and with one
// texture per variant the renderer had to break its batch on almost every
// blade (the field is sorted by x, so variants alternate constantly).
// Sharing a single texture lets the whole field go out as one batch.
//
const BLADE_ATLAS_SPRITE = 'grass-blade-atlas'
//
// Each variant is baked twice — upright and mirrored — so a blade picks its
// flip by atlas cell instead of the flipX draw flag, which would mirror the
// quad's UV window and sample a neighbouring cell.
//
const BLADE_ATLAS_CELLS = BLADE_VARIANTS * 2
//
// Transparent gutter around each cell so bilinear filtering at the quad
// edges can never pull pixels out of the cell next door.
//
const BLADE_ATLAS_PAD = 2
const BLADE_CELL_W = BLADE_W + BLADE_ATLAS_PAD * 2
const BLADE_CELL_H = BLADE_H + BLADE_ATLAS_PAD * 2
const BLADE_ATLAS_W = BLADE_CELL_W * BLADE_ATLAS_CELLS
const BLADE_ATLAS_H = BLADE_CELL_H
//
// One shared UV window per atlas cell (see bladeAtlasQuad).
//
const bladeQuadCache = []
//
// Reused draw colour so settled fields do not allocate k.rgb per blade.
//
let lastTintRef = null
let lastTintRgb = null
let lastTintK = null

/**
 * Creates a swaying grass field along a ground line
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.floorY - Ground line Y the blades grow from
 * @param {number} cfg.left - Left edge of the growth strip
 * @param {number} cfg.right - Right edge of the growth strip
 * @param {number} cfg.tuftCount - Number of tufts to place
 * @param {number} [cfg.z] - Z index of the grass layer; omit it to skip the
 *   layer entirely and drive rendering manually via draw() (scenes with an
 *   immediate-mode draw pipeline)
 * @param {Function} [cfg.excluded] - (x) => true to skip this X position
 * @param {Function} [cfg.density] - (x) => 0..1 acceptance weight; positions
 *   with a low weight grow fewer tufts (density gradient across the strip)
 * @param {Function} cfg.getTint - (blade) => {r,g,b[,opacity]} tint or null
 *   to hide the blade this frame; opacity (0..1) fades the blade without
 *   darkening its colour
 * @param {Function} [cfg.getSwayScale] - () => 0..1 multiplier for blade
 *   sway; omit for full sway
 * @param {Function} [cfg.postBakeCanvas] - (canvas, seedOffset) => void on the
 *   finished blade atlas (e.g. a film-grain pass)
 * @returns {Object} Grass inst with the blades and the Kaplay layer
 */
export function create(cfg) {
  const { k, floorY, left, right, tuftCount, z, excluded, density, getTint, getSwayScale, postBakeCanvas } = cfg
  loadBladeSprites(k, postBakeCanvas)
  const blades = buildBlades(left, right, tuftCount, excluded, density)
  const inst = {
    k,
    floorY,
    blades,
    getTint,
    getSwayScale,
    layer: null
  }
  z !== undefined && (inst.layer = k.add([
    k.z(z),
    {
      draw() {
        onDraw(inst)
      }
    }
  ]))
  return inst
}

/**
 * Draws the grass field immediately (manual mode, for scenes that render
 * inside one ordered draw callback instead of z-layered objects)
 * @param {Object} inst - Grass inst from create()
 */
export function draw(inst) {
  onDraw(inst)
}
//
// Places the tufts: each tuft packs several blades close around its centre
// with mixed variants, scales and flips so no two tufts look alike. The
// optional density callback rejection-samples candidate positions, so the
// tufts concentrate where the weight is high.
//
function buildBlades(left, right, tuftCount, excluded, density) {
  const blades = []
  let tufts = 0
  let attempts = 0
  while (tufts < tuftCount && attempts < tuftCount * TUFT_PLACE_ATTEMPTS) {
    attempts++
    const centerX = left + Math.random() * (right - left)
    if (excluded?.(centerX)) continue
    if (density && Math.random() > density(centerX)) continue
    tufts++
    const count = TUFT_BLADES_MIN + Math.floor(Math.random() * (TUFT_BLADES_RANGE + 1))
    for (let b = 0; b < count; b++) {
      const x = centerX + (Math.random() - 0.5) * 2 * TUFT_SPREAD
      if (excluded?.(x)) continue
      const variant = Math.floor(Math.random() * BLADE_VARIANTS)
      const flipX = Math.random() < 0.5
      const scale = BLADE_SCALE_MIN + Math.random() * BLADE_SCALE_RANGE
      blades.push({
        x,
        quad: bladeAtlasQuad(variant, flipX),
        width: BLADE_W * scale,
        height: BLADE_H * scale,
        swaySpeed: SWAY_SPEED_MIN + Math.random() * SWAY_SPEED_RANGE,
        swayPhase: Math.random() * Math.PI * 2
      })
    }
  }
  blades.sort((a, b) => a.x - b.x)
  return blades
}
//
// Bakes the white grass-blade shapes (tapered curved silhouettes, some with a
// shorter side leaf) into one atlas: every variant upright, then every
// variant mirrored. Blades are tinted at draw time, so the atlas stays white.
//
function loadBladeSprites(k, postBakeCanvas) {
  const atlas = document.createElement('canvas')
  atlas.width = BLADE_ATLAS_W
  atlas.height = BLADE_ATLAS_H
  const atlasCtx = atlas.getContext('2d')
  for (let i = 0; i < BLADE_VARIANTS; i++) {
    const cell = bakeOneBladeCell()
    drawBladeCellIntoAtlas(atlasCtx, cell, i, false)
    drawBladeCellIntoAtlas(atlasCtx, cell, i + BLADE_VARIANTS, true)
    cell.width = 0
    cell.height = 0
  }
  postBakeCanvas?.(atlas, 2000)
  k.loadSprite(BLADE_ATLAS_SPRITE, atlas)
  atlas.width = 0
  atlas.height = 0
}
//
// Paints one blade variant onto its own scratch canvas.
//
function bakeOneBladeCell() {
  const canvas = document.createElement('canvas')
  canvas.width = BLADE_W
  canvas.height = BLADE_H
  const ctx = canvas.getContext('2d')
  drawBladeShape(ctx, BLADE_W / 2, BLADE_H, BLADE_H)
  //
  // Roughly half the variants carry a shorter side leaf for variety.
  //
  Math.random() < 0.5 && drawBladeShape(ctx, BLADE_W / 2 + (Math.random() < 0.5 ? -3 : 3), BLADE_H, BLADE_H * (0.45 + Math.random() * 0.2))
  return canvas
}
//
// Blits one baked blade into its atlas cell, optionally mirrored, leaving the
// transparent gutter around it untouched.
//
function drawBladeCellIntoAtlas(atlasCtx, cell, cellIndex, mirrored) {
  const x = cellIndex * BLADE_CELL_W + BLADE_ATLAS_PAD
  atlasCtx.save()
  if (mirrored) {
    atlasCtx.translate(x + BLADE_W, BLADE_ATLAS_PAD)
    atlasCtx.scale(-1, 1)
    atlasCtx.drawImage(cell, 0, 0)
  } else {
    atlasCtx.drawImage(cell, x, BLADE_ATLAS_PAD)
  }
  atlasCtx.restore()
}
//
// UV window of one blade's atlas cell. Every blade of the same variant and
// flip shares one immutable quad object, resolved at placement time so the
// per-frame draw never recomputes it. Kaplay's Quad.scale() only reads the
// quad and returns a new one, so sharing it across blades is safe.
//
function bladeAtlasQuad(variant, flipX) {
  const cellIndex = flipX ? variant + BLADE_VARIANTS : variant
  bladeQuadCache[cellIndex] ??= {
    x: (cellIndex * BLADE_CELL_W + BLADE_ATLAS_PAD) / BLADE_ATLAS_W,
    y: BLADE_ATLAS_PAD / BLADE_ATLAS_H,
    w: BLADE_W / BLADE_ATLAS_W,
    h: BLADE_H / BLADE_ATLAS_H
  }
  return bladeQuadCache[cellIndex]
}
//
// Draws one tapered blade silhouette in white: wide at the base, curving to
// a sharp tip, filled as a closed path so the blade reads thick.
//
function drawBladeShape(ctx, baseX, baseY, height) {
  const bend = (Math.random() - 0.5) * 9
  const tipX = baseX + bend
  const tipY = baseY - height + 2
  const halfW = 1.6 + Math.random() * 1.5
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(baseX - halfW, baseY)
  ctx.quadraticCurveTo(baseX - halfW + bend * 0.35, baseY - height * 0.55, tipX, tipY)
  ctx.quadraticCurveTo(baseX + halfW + bend * 0.35, baseY - height * 0.55, baseX + halfW, baseY)
  ctx.closePath()
  ctx.fill()
}
//
// Per-frame tuft renderer: each blade is a tinted sprite anchored at its
// base, swaying by a few degrees of rotation. The scene callback resolves
// the tint (or hides the blade by returning null).
//
function onDraw(inst) {
  const k = inst.k
  const time = k.time()
  const blades = inst.blades
  const camX = k.camPos().x
  const camScale = k.camScale?.()
  const zoom = (typeof camScale === 'object' ? camScale.x : camScale) || 1
  const half = k.width() / (2 * zoom) + CULL_PAD
  const minX = camX - half
  const maxX = camX + half
  const start = firstBladeAtOrAfter(blades, minX)
  const swayScale = inst.getSwayScale?.() ?? 1
  for (let i = start; i < blades.length; i++) {
    const blade = blades[i]
    if (blade.x > maxX) break
    const tint = inst.getTint(blade)
    if (!tint) continue
    const color = grassTintRgb(k, tint)
    const angle = Math.sin(time * blade.swaySpeed + blade.swayPhase) * SWAY_DEG * swayScale
    k.drawSprite({
      sprite: BLADE_ATLAS_SPRITE,
      pos: k.vec2(blade.x, inst.floorY),
      anchor: 'bot',
      width: blade.width,
      height: blade.height,
      quad: blade.quad,
      angle,
      color,
      opacity: tint.opacity ?? 1
    })
  }
}
//
// Reuses the last k.rgb when getTint returns the same object (settled colour world).
//
function grassTintRgb(k, tint) {
  if (lastTintK === k && lastTintRef === tint && lastTintRgb) return lastTintRgb
  lastTintK = k
  lastTintRef = tint
  lastTintRgb = k.rgb(tint.r, tint.g, tint.b)
  return lastTintRgb
}
//
// First blade whose x is >= minX in the sorted blade list.
//
function firstBladeAtOrAfter(blades, minX) {
  let lo = 0
  let hi = blades.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (blades[mid].x < minX) lo = mid + 1
    else hi = mid
  }
  return lo
}
