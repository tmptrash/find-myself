import { growTreeRootSegments } from '../utils/grow-tree-root.js'
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
//
// Optional short static roots under each tuft (opt-in via cfg.roots) — a
// couple of tiny straight ticks, not the full organic tree-root algorithm,
// since these only need to read as "planted", not as a detailed root mass.
// Length is relative to that tuft's own average blade height (~80% of it),
// not a flat constant, so taller tufts (e.g. the mud-zone scale bump) grow
// proportionally longer roots.
//
const GRASS_ROOT_LEN_RATIO = 0.8
const GRASS_ROOT_FAN_COUNT = 2
const GRASS_ROOT_SEGMENTS = 9
const GRASS_ROOT_THICKNESS = 1.5
const GRASS_ROOT_SPREAD = 6
const CULL_PAD = 48
//
// Optional per-blade warm hue variation (opt-in via cfg.hueVaryMax) — most
// blades stay whatever colour the scene's getTint resolved, a minority
// shift toward a warm autumn tone, cubic-skewed so only a small fraction
// ever reads noticeably warm. Breaks up a field that otherwise reads as one
// uniform flat green.
//
const HUE_VARY_TARGET = { r: 196, g: 118, b: 46 }
const HUE_VARY_SKEW = 3
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
 * @param {Function} [cfg.getScaleMult] - (x) => multiplier on top of the
 *   normal random blade scale; lets one zone (e.g. a hiding spot) grow
 *   taller/thicker blades without touching the rest of the field
 * @param {Function} cfg.getTint - (blade) => {r,g,b[,opacity]} tint or null
 *   to hide the blade this frame; opacity (0..1) fades the blade without
 *   darkening its colour
 * @param {Function} [cfg.getSwayScale] - () => 0..1 multiplier for blade
 *   sway; omit for full sway
 * @param {Function} [cfg.postBakeCanvas] - (canvas, seedOffset) => void on the
 *   finished blade atlas (e.g. a film-grain pass)
 * @param {boolean} [cfg.roots] - Grow a couple of short static root ticks
 *   under each tuft (needs cfg.getRootColor)
 * @param {Function} [cfg.getRootColor] - () => {r,g,b} root tint, re-read
 *   every frame same as getTint (e.g. the gray→colour-world transition)
 * @param {Function} [cfg.getRootVisible] - (worldX) => whether fractal roots
 *   at this X should draw (independent of per-blade tint opacity fades)
 * @param {number} [cfg.hueVaryMax] - 0..1 max per-blade blend toward a warm
 *   autumn tone on top of getTint's resolved colour; cubic-skewed so only a
 *   minority of blades shift noticeably (breaks up a flat uniform-green
 *   field). Omit for no variation.
 * @param {number} [cfg.hueVarySkew] - exponent on each blade's colorSeed
 *   before hueVaryMax is applied; 1 = even green/orange mix, 3 = mostly green.
 * @returns {Object} Grass inst with the blades and the Kaplay layer
 */
export function create(cfg) {
  const { k, floorY, left, right, tuftCount, z, excluded, density, getScaleMult, getTint, getSwayScale, postBakeCanvas, roots, getRootColor, getRootVisible, hueVaryMax, hueVarySkew } = cfg
  loadBladeSprites(k, postBakeCanvas)
  const { blades, tufts } = buildBlades(left, right, tuftCount, excluded, density, getScaleMult)
  const inst = {
    k,
    floorY,
    blades,
    getTint,
    getSwayScale,
    tuftRoots: roots ? buildTuftFractalRoots(tufts) : null,
    getRootColor: roots ? getRootColor : null,
    getRootVisible: roots ? getRootVisible : null,
    hueVaryMax: hueVaryMax ?? 0,
    hueVarySkew: hueVarySkew ?? HUE_VARY_SKEW,
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
function buildBlades(left, right, tuftCount, excluded, density, getScaleMult) {
  const blades = []
  const tufts = []
  let attempts = 0
  while (tufts.length < tuftCount && attempts < tuftCount * TUFT_PLACE_ATTEMPTS) {
    attempts++
    const centerX = left + Math.random() * (right - left)
    if (excluded?.(centerX)) continue
    if (density && Math.random() > density(centerX)) continue
    const tuft = { x: centerX, avgBladeHeight: BLADE_H, blades: [] }
    tufts.push(tuft)
    const count = TUFT_BLADES_MIN + Math.floor(Math.random() * (TUFT_BLADES_RANGE + 1))
    let heightSum = 0
    let heightCount = 0
    for (let b = 0; b < count; b++) {
      const x = centerX + (Math.random() - 0.5) * 2 * TUFT_SPREAD
      if (excluded?.(x)) continue
      const variant = Math.floor(Math.random() * BLADE_VARIANTS)
      const flipX = Math.random() < 0.5
      const scale = (BLADE_SCALE_MIN + Math.random() * BLADE_SCALE_RANGE) * (getScaleMult?.(x) ?? 1)
      const height = BLADE_H * scale
      heightSum += height
      heightCount++
      const blade = {
        x,
        quad: bladeAtlasQuad(variant, flipX),
        width: BLADE_W * scale,
        height,
        swaySpeed: SWAY_SPEED_MIN + Math.random() * SWAY_SPEED_RANGE,
        swayPhase: Math.random() * Math.PI * 2,
        colorSeed: Math.random()
      }
      blades.push(blade)
      tuft.blades.push(blade)
    }
    heightCount > 0 && (tuft.avgBladeHeight = heightSum / heightCount)
  }
  blades.sort((a, b) => a.x - b.x)
  return { blades, tufts }
}
//
// Fractal root fans under tufts that have several neighboring blades —
// length scales to 80% of the tallest blade in that tuft cluster.
//
function buildTuftFractalRoots(tufts) {
  const fans = []
  tufts.forEach(tuft => {
    if ((tuft.blades?.length ?? 0) < TUFT_BLADES_MIN) return
    const rand = (min, max) => min + Math.random() * (max - min)
    const tallest = tuft.blades.reduce((m, b) => Math.max(m, b.height), tuft.avgBladeHeight)
    const maxLen = tallest * GRASS_ROOT_LEN_RATIO
    for (let i = 0; i < GRASS_ROOT_FAN_COUNT; i++) {
      const side = i % 2 === 0 ? 1 : -1
      const anchorX = tuft.x + side * Math.random() * GRASS_ROOT_SPREAD
      const segs = growTreeRootSegments({
        x: 0,
        y: 0,
        angle: Math.PI / 2 + side * rand(0.14, 0.34),
        segments: GRASS_ROOT_SEGMENTS,
        thickness: GRASS_ROOT_THICKNESS,
        lateralBiasPerSegment: side * 0.045,
        rand
      })
      fans.push({ x: anchorX, segs, maxLen })
    }
  })
  fans.sort((a, b) => a.x - b.x)
  return fans
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
    const color = inst.hueVaryMax > 0
      ? hueVariedRgb(k, tint, blade, inst.hueVaryMax, inst.hueVarySkew)
      : grassTintRgb(k, tint)
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
  //
  // Optional root ticks, grouped in their own pass after every blade sprite
  // — mixing sprites and primitives in alternating order breaks batching.
  //
  const rootTint = inst.tuftRoots && inst.getRootColor?.()
  if (rootTint) {
    const rootColor = k.rgb(rootTint.r, rootTint.g, rootTint.b)
    for (const fan of inst.tuftRoots) {
      if (fan.x < minX - 16 || fan.x > maxX + 16) continue
      if (inst.getRootVisible?.(fan.x) === false) continue
      let used = 0
      for (const seg of fan.segs) {
        const dx = seg.endX - seg.startX
        const dy = seg.endY - seg.startY
        const segLen = Math.hypot(dx, dy)
        if (used >= fan.maxLen || segLen < 0.01) break
        const drawLen = Math.min(segLen, fan.maxLen - used)
        const t = drawLen / segLen
        k.drawLine({
          p1: k.vec2(fan.x + seg.startX, inst.floorY + seg.startY),
          p2: k.vec2(fan.x + seg.startX + dx * t, inst.floorY + seg.startY + dy * t),
          width: Math.max(0.65, seg.width * 0.52),
          color: rootColor
        })
        used += drawLen
      }
    }
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
// Blends the resolved tint toward a warm autumn tone by this blade's own
// fixed colorSeed, cubed so only a minority of blades shift noticeably —
// breaks up an otherwise flat uniform-green field. Can't reuse the single
// cached grassTintRgb here since every blade now potentially ends up a
// different final colour.
//
function hueVariedRgb(k, tint, blade, hueVaryMax, hueVarySkew = HUE_VARY_SKEW) {
  const t = Math.pow(blade.colorSeed ?? 0, hueVarySkew) * hueVaryMax
  return k.rgb(
    tint.r + (HUE_VARY_TARGET.r - tint.r) * t,
    tint.g + (HUE_VARY_TARGET.g - tint.g) * t,
    tint.b + (HUE_VARY_TARGET.b - tint.b) * t
  )
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
