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
const SPRITE_PREFIX = 'grass-blade-'

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
 * @returns {Object} Grass inst with the blades and the Kaplay layer
 */
export function create(cfg) {
  const { k, floorY, left, right, tuftCount, z, excluded, density, getTint } = cfg
  loadBladeSprites(k)
  const blades = buildBlades(left, right, tuftCount, excluded, density)
  const inst = {
    k,
    floorY,
    blades,
    getTint,
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
      blades.push({
        x,
        variant: Math.floor(Math.random() * BLADE_VARIANTS),
        scale: BLADE_SCALE_MIN + Math.random() * BLADE_SCALE_RANGE,
        flipX: Math.random() < 0.5,
        swaySpeed: SWAY_SPEED_MIN + Math.random() * SWAY_SPEED_RANGE,
        swayPhase: Math.random() * Math.PI * 2
      })
    }
  }
  return blades
}
//
// Bakes the white grass-blade sprite variants (tapered curved silhouettes,
// some with a shorter side leaf) used by the tuft renderer.
//
function loadBladeSprites(k) {
  for (let i = 0; i < BLADE_VARIANTS; i++) {
    const canvas = document.createElement('canvas')
    canvas.width = BLADE_W
    canvas.height = BLADE_H
    const ctx = canvas.getContext('2d')
    drawBladeShape(ctx, BLADE_W / 2, BLADE_H, BLADE_H)
    //
    // Roughly half the variants carry a shorter side leaf for variety.
    //
    Math.random() < 0.5 && drawBladeShape(ctx, BLADE_W / 2 + (Math.random() < 0.5 ? -3 : 3), BLADE_H, BLADE_H * (0.45 + Math.random() * 0.2))
    k.loadSprite(SPRITE_PREFIX + i, canvas)
    canvas.width = 0
    canvas.height = 0
  }
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
  for (const blade of inst.blades) {
    const tint = inst.getTint(blade)
    if (!tint) continue
    const angle = Math.sin(time * blade.swaySpeed + blade.swayPhase) * SWAY_DEG
    k.drawSprite({
      sprite: SPRITE_PREFIX + blade.variant,
      pos: k.vec2(blade.x, inst.floorY),
      anchor: 'bot',
      width: BLADE_W * blade.scale,
      height: BLADE_H * blade.scale,
      angle,
      flipX: blade.flipX,
      color: k.rgb(tint.r, tint.g, tint.b),
      opacity: tint.opacity ?? 1
    })
  }
}
