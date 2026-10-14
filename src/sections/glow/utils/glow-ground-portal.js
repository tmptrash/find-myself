import * as Hero from '../../../components/hero.js'
import { GLOW_PAL } from './glow-palette.js'
import * as HoloFx from './glow-holo-fx.js'
import { applyGlowFilmGrainToCanvas } from './glow-parallax-grain.js'
//
// Flat hologram ellipse lying on the ground: opening radii and the dim band
// of dashed field around it.
//
const PORTAL_RX = 34
const PORTAL_RY = 8
const PORTAL_POINTS = 28
const RING_PAD_X = 16
const RING_PAD_Y = 8
const RING_SPRITE_W = (PORTAL_RX + RING_PAD_X) * 2
const RING_SPRITE_H = (PORTAL_RY + RING_PAD_Y) * 2
const RING_GLOW = [[10, 0.08], [7, 0.12], [4, 0.2], [3, 0.32]]
const RING_BAND_RX = PORTAL_RX + 6
const RING_BAND_RY = PORTAL_RY + 2.5
const RING_BAND_W = 4
const RING_BAND_ALPHA = 0.32
const RING_BAND_DOT_DASH = [1, 3]
const RING_EDGE_W = 2
const RING_CORE_W = 1
const RING_CORE_ALPHA = 0.9
const GHOST_OFFSET_PX = 2
const GHOST_ALPHA = 0.3
//
// Ground field: dashed concentric ellipses fading away from the opening.
//
const FIELD_RX = PORTAL_RX * 2.3
const FIELD_RY = PORTAL_RY * 2.3
const FIELD_RINGS = 4
const FIELD_DASH = [5, 4]
const FIELD_ALPHA = 0.45
const FIELD_OUTER_FADE = 0.6
const FIELD_HOT_ALPHA = 0.7
const FIELD_HOT_DASH = [1, 15]
//
// Light column rising from the opening: alpha-only falloff to the sides and
// upwards with dotted vertical streaks.
//
const BEAM_W = PORTAL_RX * 2
const BEAM_H = 70
const BEAM_ALPHA = 0.32
const BEAM_STREAK_STEP = 6
const BEAM_STREAK_DOT = 3
const BEAM_STREAK_ALPHA = 0.5
//
// Inside the opening: a dark mouth and rings sliding inwards like a tunnel.
//
const MOUTH_ALPHA = 0.8
const TUNNEL_RINGS = 3
const TUNNEL_SPEED = 0.9
const TUNNEL_ALPHA = 0.55
const TUNNEL_DROP = 0.5
//
// TV power-on / power-off shape: first a bright line grows from the centre,
// then it opens vertically into the ellipse with a short flash.
//
const LINE_PHASE = 0.45
const LINE_H = 2
const LINE_GLOW_H = 7
const LINE_GLOW_ALPHA = 0.35
const FLASH_FROM = 0.35
const FLASH_TO = 0.75
const FLASH_ALPHA = 0.6
const OPEN_SPEED = 1 / 0.5
const CLOSE_SPEED = 1 / 0.32
//
// Hero proximity (open / close) and the footprint that swallows the hero.
//
const NEAR_X = 150
const NEAR_Y = 80
const ENTER_HALF_W = PORTAL_RX * 0.75
const ENTER_ABOVE = 8
const ENTER_BELOW = 16
const ENTER_MIN_OPEN = 0.95
//
// Travel timings: fast dive, a beat in the dark, then the hero pops out.
//
const DIVE_SEC = 0.26
const EXIT_WAIT_SEC = 0.08
const EMERGE_SEC = 0.2
const HIDE_PAD = 2
//
// Rising sparks from the opening (no faulty-lamp flicker on the ground portal).
//
const SPARK_SPREAD = PORTAL_RX * 0.8
const SPARK_PER_SEC = 10
//
// Baked sprites, regenerated once per live Kaplay instance.
//
const SPRITE_RING_BACK = 'glow-ground-portal-ring-back'
const SPRITE_RING_FRONT = 'glow-ground-portal-ring-front'
const SPRITE_FIELD = 'glow-ground-portal-field'
const SPRITE_BEAM = 'glow-ground-portal-beam'
const GRAIN_SEED_RING_BACK = 7503
const GRAIN_SEED_RING_FRONT = 7607
const GRAIN_SEED_FIELD = 7709
const GRAIN_SEED_BEAM = 7811
const bakedFor = new WeakMap()

/**
 * Creates the pair of flat holographic portals lying in the ground: the entry
 * opens while the hero is near, swallows the hero (sprite cut by the portal
 * plane, like sinking in water), closes, and the exit then switches on like
 * an old TV and throws the hero out. The level owns the body and camera
 * through the callbacks; this module only owns visuals and timing.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay inst
 * @param {{ x: number, y: number }} cfg.entry - Entry centre on the ground (world px)
 * @param {{ x: number, y: number }} cfg.exit - Exit centre on the ground (world px)
 * @param {number} cfg.heroFootOffset - Hero feet Y relative to character pos
 * @param {function(): Object|null} cfg.getHero - Hero inst getter
 * @param {function(): boolean} cfg.isEnabled - True while the entry may open
 * @param {function(): void} cfg.onDiveStart - Hero touched the open entry (freeze it)
 * @param {function(): void} cfg.onTeleport - Entry sealed, move hero + camera to the exit
 * @param {function(): void} cfg.onEmerge - Hero is out, give control back and launch
 * @param {function(): void} [cfg.onPowerOn] - Exit starts switching on (sound)
 * @returns {Object} Ground portal inst
 */
export function create(cfg) {
  const { k } = cfg
  const pal = GLOW_PAL.holoDoor
  ensureGroundPortalSprites(k)
  const inst = {
    k,
    heroFootOffset: cfg.heroFootOffset,
    getHero: cfg.getHero,
    isEnabled: cfg.isEnabled,
    onDiveStart: cfg.onDiveStart,
    onTeleport: cfg.onTeleport,
    onEmerge: cfg.onEmerge,
    onPowerOn: cfg.onPowerOn,
    entry: createPortal(cfg.entry),
    exit: createPortal(cfg.exit),
    phase: 'idle',
    phaseTime: 0,
    time: 0,
    tones: {
      mouth: HoloFx.paletteColor(k, pal.mouth),
      edge: HoloFx.paletteColor(k, pal.edge),
      glow: HoloFx.paletteColor(k, pal.glow),
      field: HoloFx.paletteColor(k, pal.field),
      spark: HoloFx.paletteColor(k, pal.spark),
      core: HoloFx.paletteColor(k, pal.core)
    }
  }
  return inst
}

/**
 * Ticks openness, proximity and the dive / teleport trip. Call from the level
 * onUpdate every frame (Kaplay object draw would run after k.onDraw and cover
 * the pit-cave hero foreground pass).
 * @param {Object|null} portalInst - Ground portal inst from create()
 */
export function update(portalInst) {
  portalInst && onUpdate(portalInst)
}

/**
 * Draws both portal sites. Call from the level onDraw after cave decor and
 * before drawGlowPitCaveHeroForeground so the hero stays in front.
 * @param {Object|null} portalInst - Ground portal inst from create()
 */
export function draw(portalInst) {
  portalInst && onDraw(portalInst)
}

/**
 * True while the hero is inside the portal trip (dive → dark → emerge). The
 * level should freeze its own hero logic then.
 * @param {Object|null} inst - Ground portal inst
 * @returns {boolean}
 */
export function isTraveling(inst) {
  return Boolean(inst) && inst.phase !== 'idle'
}

/**
 * Cancels a trip and snaps both portals shut (death / respawn safety).
 * @param {Object|null} inst - Ground portal inst
 */
export function reset(inst) {
  if (!inst) return
  setPhase(inst, 'idle')
  shutPortal(inst.entry)
  shutPortal(inst.exit)
}

function shutPortal(portal) {
  portal.t = 0
  portal.target = 0
  portal.sparks = HoloFx.createSparks()
}

function createPortal(pos) {
  return {
    x: pos.x,
    y: pos.y,
    t: 0,
    target: 0,
    sparks: HoloFx.createSparks()
  }
}

//
// Trip state machine, then each portal eases towards its target openness.
//
function onUpdate(inst) {
  const dt = inst.k.dt()
  inst.time += dt
  inst.phaseTime += dt
  updatePhase(inst)
  updatePortal(inst, inst.entry, dt)
  updatePortal(inst, inst.exit, dt)
}

function updatePhase(inst) {
  const char = inst.getHero()?.character
  if (inst.phase === 'idle') {
    updateIdle(inst, char)
    return
  }
  if (inst.phase === 'dive' && inst.phaseTime >= DIVE_SEC) {
    setPhase(inst, 'seal')
    inst.entry.target = 0
    return
  }
  if (inst.phase === 'seal' && inst.entry.t === 0) {
    inst.onTeleport()
    setPhase(inst, 'powerOn')
    inst.exit.target = 1
    inst.onPowerOn?.()
    return
  }
  if (inst.phase === 'powerOn' && inst.exit.t === 1 && inst.phaseTime >= EXIT_WAIT_SEC) {
    setPhase(inst, 'emerge')
    return
  }
  if (inst.phase === 'emerge' && inst.phaseTime >= EMERGE_SEC) {
    setPhase(inst, 'idle')
    inst.exit.target = 0
    inst.onEmerge()
  }
}

//
// Entry follows the hero's distance; a fully open entry under the hero's
// feet (standing or landing, never while rising) starts the dive.
//
function updateIdle(inst, char) {
  const entry = inst.entry
  if (!char?.pos || !inst.isEnabled()) {
    entry.target = 0
    return
  }
  const dx = Math.abs(char.pos.x - entry.x)
  const feetDy = char.pos.y + inst.heroFootOffset - entry.y
  entry.target = dx < NEAR_X && Math.abs(feetDy) < NEAR_Y ? 1 : 0
  const onPortal = dx < ENTER_HALF_W && feetDy > -ENTER_ABOVE && feetDy < ENTER_BELOW
  const falling = (char.vel?.y ?? 0) >= 0
  if (!onPortal || !falling || entry.t < ENTER_MIN_OPEN) return
  setPhase(inst, 'dive')
  inst.onDiveStart()
}

function setPhase(inst, phase) {
  inst.phase = phase
  inst.phaseTime = 0
}

function updatePortal(inst, portal, dt) {
  const k = inst.k
  portal.t = portal.target > portal.t
    ? Math.min(portal.target, portal.t + dt * OPEN_SPEED)
    : Math.max(portal.target, portal.t - dt * CLOSE_SPEED)
  if (portal.t === 0) {
    portal.sparks = HoloFx.createSparks()
    return
  }
  const shape = portalShape(portal.t)
  HoloFx.updateSparks(portal.sparks, k, dt, SPARK_SPREAD * shape.sx, SPARK_PER_SEC * shape.sy)
}

//
// TV-style openness: horizontal scale grows first (a line), then vertical.
//
function portalShape(t) {
  const sx = easeOut(Math.min(1, t / LINE_PHASE))
  const sy = t <= LINE_PHASE ? 0 : easeOut((t - LINE_PHASE) / (1 - LINE_PHASE))
  const flashU = (t - FLASH_FROM) / (FLASH_TO - FLASH_FROM)
  const flash = flashU > 0 && flashU < 1 ? Math.sin(flashU * Math.PI) : 0
  return { sx, sy, flash }
}

function easeOut(u) {
  return 1 - (1 - u) * (1 - u)
}

function easeIn(u) {
  return u * u
}

//
// Back to front: field, mouth, rims, beam, TV flash and sparks — then the cut
// hero on top so they never sit behind the ring while sinking.
//
function onDraw(inst) {
  if (!hasGroundPortalSprites(inst.k)) return
  drawPortal(inst, inst.entry, inst.phase === 'dive' ? diveSink(inst) : null)
  drawPortal(inst, inst.exit, inst.phase === 'emerge' ? emergeSink(inst) : null)
}

function hasGroundPortalSprites(k) {
  return Boolean(k.getSprite(SPRITE_RING_FRONT) && k.getSprite(SPRITE_BEAM))
}

function drawPortal(inst, portal, heroSink) {
  if (portal.t === 0) return
  const k = inst.k
  const shape = portalShape(portal.t)
  const x = portal.x
  const y = portal.y
  const op = portal.t
  drawScaled(k, SPRITE_FIELD, x, y, FIELD_RX * 2 * shape.sx, FIELD_RY * 2 * shape.sy, op)
  shape.sy > 0 && drawMouth(inst, x, y, shape, op)
  drawRing(k, SPRITE_RING_BACK, x, y, shape, op)
  drawBeam(k, x, y, shape, op)
  drawRing(k, SPRITE_RING_FRONT, x + GHOST_OFFSET_PX, y, shape, op * GHOST_ALPHA)
  drawRing(k, SPRITE_RING_FRONT, x, y, shape, op)
  drawTvLine(inst, x, y, shape, op)
  HoloFx.drawSparks(k, portal.sparks, x, y, op * shape.sy, inst.tones)
  heroSink !== null && drawHeroCut(inst, portal, heroSink)
}

function drawScaled(k, sprite, x, y, w, h, opacity) {
  if (w < 1 || h < 1) return
  k.drawSprite({ sprite, pos: k.vec2(x, y), anchor: 'center', width: w, height: h, opacity })
}

//
// The rim keeps a readable thickness while the ellipse is still a thin line.
//
function drawRing(k, sprite, x, y, shape, op) {
  const h = Math.max(LINE_H, RING_SPRITE_H * shape.sy)
  drawScaled(k, sprite, x, y, RING_SPRITE_W * shape.sx, h, op * Math.max(shape.sy, shape.flash))
}

function drawBeam(k, x, y, shape, op) {
  const h = BEAM_H * shape.sy
  if (h < 1) return
  k.drawSprite({
    sprite: SPRITE_BEAM,
    pos: k.vec2(x, y),
    anchor: 'bot',
    width: BEAM_W * shape.sx,
    height: h,
    opacity: op
  })
}

function drawMouth(inst, x, y, shape, op) {
  const k = inst.k
  const rx = PORTAL_RX * shape.sx
  const ry = PORTAL_RY * shape.sy
  k.drawPolygon({ pts: ellipsePoints(k, x, y, rx, ry), color: inst.tones.mouth, opacity: op * MOUTH_ALPHA })
  for (let i = 0; i < TUNNEL_RINGS; i++) {
    const u = 1 - ((inst.time * TUNNEL_SPEED + i / TUNNEL_RINGS) % 1)
    const pts = ellipsePoints(k, x, y + ry * (1 - u) * TUNNEL_DROP, rx * u, ry * u)
    k.drawLines({ pts: [...pts, pts[0]], width: 1, color: inst.tones.glow, opacity: op * TUNNEL_ALPHA * u })
  }
}

//
// Bright TV line while the ellipse is still flat, plus the power-on flash.
//
function drawTvLine(inst, x, y, shape, op) {
  const k = inst.k
  const lineOp = Math.max(1 - shape.sy, shape.flash)
  if (lineOp <= 0) return
  const w = PORTAL_RX * 2 * shape.sx
  k.drawRect({
    pos: k.vec2(x, y),
    anchor: 'center',
    width: w + RING_PAD_X,
    height: LINE_GLOW_H,
    color: inst.tones.glow,
    opacity: op * lineOp * LINE_GLOW_ALPHA
  })
  k.drawRect({
    pos: k.vec2(x, y),
    anchor: 'center',
    width: w,
    height: LINE_H,
    color: inst.tones.core,
    opacity: op * Math.max(lineOp, shape.flash * FLASH_ALPHA)
  })
}

//
// Sink offsets of the hero sprite below its body (0 = standing on the rim).
//
function diveSink(inst) {
  return easeIn(Math.min(1, inst.phaseTime / DIVE_SEC)) * heroHideDepth(inst, inst.entry)
}

function emergeSink(inst) {
  return (1 - easeOut(Math.min(1, inst.phaseTime / EMERGE_SEC))) * heroHideDepth(inst, inst.exit)
}

function heroHideDepth(inst, portal) {
  const char = inst.getHero()?.character
  if (!char?.pos) return 0
  const halfH = Hero.HERO_BAKE_SPRITE_SIZE * (char.scale?.x ?? 1) / 2
  return portal.y - (char.pos.y - halfH) + HIDE_PAD
}

//
// Only the rows above the portal plane are drawn — the rest is "inside".
//
function drawHeroCut(inst, portal, sink) {
  const k = inst.k
  const hero = inst.getHero()
  const char = hero?.character
  if (!char?.pos) return
  const sprite = Hero.getActiveSpriteKey(hero)
  if (!k.getSprite(sprite)) return
  const fullH = Hero.HERO_BAKE_SPRITE_SIZE * (char.scale?.x ?? 1)
  const topY = char.pos.y + sink - fullH / 2
  const visibleH = Math.min(fullH, portal.y - topY)
  if (visibleH <= 0) return
  k.drawSprite({
    sprite,
    pos: k.vec2(char.pos.x, topY),
    anchor: 'top',
    width: fullH,
    height: visibleH,
    quad: { x: 0, y: 0, w: 1, h: visibleH / fullH },
    flipX: char.flipX,
    opacity: char.opacity ?? 1
  })
}

function ellipsePoints(k, x, y, rx, ry) {
  const pts = []
  for (let i = 0; i < PORTAL_POINTS; i++) {
    const a = (i / PORTAL_POINTS) * Math.PI * 2
    pts.push(k.vec2(x + Math.cos(a) * rx, y + Math.sin(a) * ry))
  }
  return pts
}

//
// Bakes (once per live Kaplay instance) the rims, ground field and beam.
//
function ensureGroundPortalSprites(k) {
  if (bakedFor.get(k)) return
  bakedFor.set(k, true)
  k.loadSprite(SPRITE_RING_BACK, bakeGrained(bakeRingCanvas(Math.PI, Math.PI * 2), GRAIN_SEED_RING_BACK))
  k.loadSprite(SPRITE_RING_FRONT, bakeGrained(bakeRingCanvas(0, Math.PI), GRAIN_SEED_RING_FRONT))
  k.loadSprite(SPRITE_FIELD, bakeGrained(bakeFieldCanvas(), GRAIN_SEED_FIELD))
  k.loadSprite(SPRITE_BEAM, bakeGrained(bakeBeamCanvas(), GRAIN_SEED_BEAM))
}

function bakeGrained(canvas, seed) {
  applyGlowFilmGrainToCanvas(canvas, seed)
  return canvas
}

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w)
  canvas.height = Math.ceil(h)
  return canvas
}

function strokeEllipse(ctx, cx, cy, rx, ry, from, to, width, style) {
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, from, to)
  ctx.lineWidth = width
  ctx.strokeStyle = style
  ctx.stroke()
}

//
// One half of the rim (back = far half, front = near half): bloom strokes,
// dim dotted band, edge and hot core — same layering as the holo door arch.
//
function bakeRingCanvas(from, to) {
  const pal = GLOW_PAL.holoDoor
  const canvas = makeCanvas(RING_SPRITE_W, RING_SPRITE_H)
  const ctx = canvas.getContext('2d')
  const cx = RING_SPRITE_W / 2
  const cy = RING_SPRITE_H / 2
  ctx.lineCap = 'round'
  strokeEllipse(ctx, cx, cy, RING_BAND_RX, RING_BAND_RY, from, to, RING_BAND_W, HoloFx.cssColor(pal.band, RING_BAND_ALPHA))
  ctx.setLineDash(RING_BAND_DOT_DASH)
  strokeEllipse(ctx, cx, cy, RING_BAND_RX, RING_BAND_RY, from, to, 1, HoloFx.cssColor(pal.spark, 1))
  ctx.setLineDash([])
  RING_GLOW.forEach(([w, a]) => strokeEllipse(ctx, cx, cy, PORTAL_RX, PORTAL_RY, from, to, w, HoloFx.cssColor(pal.glow, a)))
  strokeEllipse(ctx, cx, cy, PORTAL_RX, PORTAL_RY, from, to, RING_EDGE_W, HoloFx.cssColor(pal.edge, 1))
  strokeEllipse(ctx, cx, cy, PORTAL_RX, PORTAL_RY, from, to, RING_CORE_W, HoloFx.cssColor(pal.core, RING_CORE_ALPHA))
  return canvas
}

//
// Dashed concentric ellipses on the ground, dimmer further out, with a few
// brighter dashes like the door's projection field.
//
function bakeFieldCanvas() {
  const pal = GLOW_PAL.holoDoor
  const canvas = makeCanvas(FIELD_RX * 2, FIELD_RY * 2)
  const ctx = canvas.getContext('2d')
  const cx = FIELD_RX
  const cy = FIELD_RY
  ctx.setLineDash(FIELD_DASH)
  for (let i = 1; i <= FIELD_RINGS; i++) {
    const u = i / FIELD_RINGS
    const rx = PORTAL_RX + (FIELD_RX - PORTAL_RX - 1) * u
    const ry = PORTAL_RY + (FIELD_RY - PORTAL_RY - 1) * u
    ctx.lineDashOffset = Math.random() * FIELD_DASH[0]
    strokeEllipse(ctx, cx, cy, rx, ry, 0, Math.PI * 2, 1, HoloFx.cssColor(pal.field, FIELD_ALPHA * (1 - u * FIELD_OUTER_FADE)))
  }
  ctx.setLineDash(FIELD_HOT_DASH)
  strokeEllipse(ctx, cx, cy, (FIELD_RX + PORTAL_RX) / 2, (FIELD_RY + PORTAL_RY) / 2, 0, Math.PI * 2, 1, HoloFx.cssColor(pal.edge, FIELD_HOT_ALPHA))
  return canvas
}

//
// Light column: one palette colour, alpha falls off sideways (parabola) and
// upwards (linear), with dotted streaks climbing out of the opening.
//
function bakeBeamCanvas() {
  const pal = GLOW_PAL.holoDoor
  const canvas = makeCanvas(BEAM_W, BEAM_H)
  const ctx = canvas.getContext('2d')
  const half = BEAM_W / 2
  for (let x = 0; x < BEAM_W; x++) {
    const side = 1 - Math.pow((x + 0.5 - half) / half, 2)
    const grad = ctx.createLinearGradient(0, BEAM_H, 0, 0)
    grad.addColorStop(0, HoloFx.cssColor(pal.glow, BEAM_ALPHA * side))
    grad.addColorStop(1, HoloFx.cssColor(pal.glow, 0))
    ctx.fillStyle = grad
    ctx.fillRect(x, 0, 1, BEAM_H)
  }
  for (let x = BEAM_STREAK_STEP / 2; x < BEAM_W; x += BEAM_STREAK_STEP) {
    const side = 1 - Math.pow((x - half) / half, 2)
    for (let y = BEAM_H - 1; y > 0; y -= BEAM_STREAK_DOT) {
      const fade = y / BEAM_H
      ctx.fillStyle = HoloFx.cssColor(pal.spark, BEAM_STREAK_ALPHA * side * fade * Math.random())
      ctx.fillRect(Math.round(x), y, 1, 1)
    }
  }
  return canvas
}
