import { CFG } from '../../../cfg.js'
import { getRGB } from '../../../utils/helper.js'
import { loadPictureImage } from '../utils/forest-picture.js'
import { applyForestFilmGrainToCanvas } from '../utils/forest-parallax-grain.js'
import { FOREST_PAL } from '../utils/forest-palette.js'
//
// A painted thought bubble over the hero's head (a picture like
// assets/forest/level_end.png: a cloud with its tail of small bubbles at the
// bottom left). Shown, it swells up beside his head from its tail and bobs
// gently; burst, it blasts where it stands and white fireflies drift where
// it was, fading out one by one. The dream bubble and the level's opening
// controls bubble are both one of these.
//
// The picture is drawn `width` world px wide, baked BAKE_RES times sharper
// and drawn linear (it stays smooth while it swells and on scaled touch
// views). Its tail's last bubble (TAIL_X / TAIL_Y of the picture) stands
// TAIL_DX / TAIL_DY off the hero's centre — just above and ahead of his
// head — and the bubble swells from there.
//
const BAKE_RES = 2
const TAIL_X = 0.048
const TAIL_Y = 0.951
const TAIL_DX = 16
const TAIL_DY = -40
//
// It swells in over APPEAR_SEC from APPEAR_SCALE of its size (eased out)
// and bobs BOB_PX up and down every BOB_SEC. A cloud, it is a little
// see-through: `opacity` at its fullest (DEFAULT_OPACITY unless given).
//
const DEFAULT_OPACITY = 0.82
const APPEAR_SEC = 0.7
const APPEAR_SCALE = 0.25
const BOB_PX = 3
const BOB_SEC = 2.4
//
// The burst, like a blast: the bubble swells to BLAST_SCALE of its size
// round its body's middle (the middle of its BODY_* share of the picture)
// while it fades out over BLAST_SEC, and FIREFLY_COUNT fireflies are born
// in its core (within FIREFLY_CORE of its width round that middle). Each
// flies out a random way at FIREFLY_BLAST_MIN..+RANGE px/s and slows to a
// stop (FIREFLY_DRAG per second); by then it only hovers, wandering at
// FIREFLY_DRIFT px/s on a heading that turns by up to FIREFLY_TURN rad/s
// and rising FIREFLY_RISE px/s. It shines full for the first FIREFLY_FADE_AT
// of its life (FIREFLY_LIFE_MIN..+RANGE seconds), then fades out gradually.
// Each is FIREFLY_R_MIN..+RANGE px, with a glow FIREFLY_GLOW times as wide
// and FIREFLY_GLOW_ALPHA as strong, twinkling at FIREFLY_TWINKLE_HZ.
//
const BLAST_SEC = 0.2
const BLAST_SCALE = 1.35
const FIREFLY_COUNT = 110
const FIREFLY_CORE = 0.1
const FIREFLY_BLAST_MIN = 90
const FIREFLY_BLAST_RANGE = 230
const FIREFLY_DRAG = 3.2
const FIREFLY_TURN = 2.5
const FIREFLY_FADE_AT = 0.4
const BODY_X1 = 0.05
const BODY_X2 = 0.97
const BODY_Y1 = 0.04
const BODY_Y2 = 0.78
const FIREFLY_R_MIN = 1.2
const FIREFLY_R_RANGE = 1.2
const FIREFLY_GLOW = 3
const FIREFLY_GLOW_ALPHA = 0.25
const FIREFLY_DRIFT = 12
const FIREFLY_RISE = 4
const FIREFLY_TWINKLE_HZ = 2.2
const FIREFLY_LIFE_MIN = 2.4
const FIREFLY_LIFE_RANGE = 1.8
const BODY_MID_X = (BODY_X1 + BODY_X2) / 2
const BODY_MID_Y = (BODY_Y1 + BODY_Y2) / 2
const Z = CFG.visual.zIndex.player + 1
//
// The picture may come without transparency (a light grey/white checker
// painted round the bubble): the light, colourless pixels (brightest
// channel from KEY_LIGHT, channels within KEY_GREY) reachable from its
// border are background — the bubble's warm rim stops the fill; clear
// pixels count as background too. Specks of noise left in it (a kept pixel
// with KEY_SPECK_SIDES of its 4 sides cleared) go too, KEY_SPECK_PASSES
// times over.
//
const KEY_LIGHT = 180
const KEY_GREY = 12
const KEY_ALPHA = 8
const KEY_SPECK_SIDES = 3
const KEY_SPECK_PASSES = 2
const RGBA = 4
const pictures = new Map()

/**
 * Loads and keys a bubble picture (once per page and URL).
 * @param {string} url - Picture URL
 * @returns {Promise<void>}
 */
export async function load(url) {
  if (pictures.get(url)) return
  const img = await loadPictureImage(url)
  img && !pictures.get(url) && pictures.set(url, keyBackground(img))
}

/**
 * Creates a thought bubble over a hero (its sprite baked once per live k;
 * nothing shows until load() has resolved for its picture).
 * @param {Object} cfg - Bubble configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {string} cfg.url - Picture URL (loaded with load())
 * @param {string} cfg.spritePrefix - Sprite name prefix of its bake
 * @param {number} cfg.grainSeed - Film grain seed of its bake
 * @param {number} cfg.width - Width in world px at its full size
 * @param {number} [cfg.opacity] - Opacity at its fullest
 * @param {number} [cfg.z] - Draw z; default just over the hero
 * @returns {Object} Bubble inst
 */
export function create(cfg) {
  const { k, url, width, z = Z } = cfg
  const picture = pictures.get(url) ?? null
  const inst = {
    k,
    picture,
    width,
    opacity: cfg.opacity ?? DEFAULT_OPACITY,
    sprite: picture && bake(k, picture, `${cfg.spritePrefix}-${width}`, width, cfg.grainSeed),
    visible: false,
    show: 0,
    time: 0,
    anchorX: 0,
    anchorY: 0,
    shiftX: 0,
    shiftY: 0,
    hasAnchor: false,
    fireflies: [],
    blast: null,
    blastAnchor: k.vec2(BODY_MID_X * 2 - 1, BODY_MID_Y * 2 - 1),
    color: getRGB(k, FOREST_PAL.dreamFirefly),
    pos: k.vec2(0, 0),
    scale: k.vec2(1, 1),
    anchor: k.vec2(TAIL_X * 2 - 1, TAIL_Y * 2 - 1)
  }
  k.add([
    k.z(z),
    {
      draw() {
        onDraw(inst)
      }
    }
  ])
  return inst
}

/**
 * Starts the bubble swelling up from its tail (no-op without its picture).
 * @param {Object} inst - Bubble inst
 * @returns {boolean} True if it shows now
 */
export function show(inst) {
  if (!inst.sprite) return false
  inst.visible = true
  inst.show = 0
  inst.time = 0
  return true
}

/**
 * True while the bubble is up (from show() until it bursts).
 * @param {Object} inst - Bubble inst
 * @returns {boolean}
 */
export function isShown(inst) {
  return inst.visible
}

/**
 * Bursts a shown bubble: it blasts where it stands and a swarm of
 * fireflies flies out of it.
 * @param {Object} inst - Bubble inst
 */
export function burst(inst) {
  if (!inst.visible) return
  inst.visible = false
  const rect = bubbleRect(inst)
  inst.show = 0
  if (!rect) return
  const midX = rect.x + rect.w * BODY_MID_X
  const midY = rect.y + rect.h * BODY_MID_Y
  inst.blast = { t: 0, pos: inst.k.vec2(midX, midY), size: rect.w / inst.width / BAKE_RES, opacity: rect.ease * inst.opacity }
  for (let i = 0; i < FIREFLY_COUNT; i++) addFirefly(inst, midX, midY, rect.w * FIREFLY_CORE)
}

/**
 * Follows the hero, swells and bobs a shown bubble, plays its blast and
 * drifts its fireflies. Call once per frame.
 * @param {Object} inst - Bubble inst
 * @param {number} dt - Seconds since the last frame
 * @param {{x: number, y: number}|null} heroPos - Hero centre (null: no hero now)
 * @param {{left: number, top: number, right: number}|null} [view] - Visible world rect the bubble is kept inside (null: not kept)
 */
export function onUpdate(inst, dt, heroPos, view = null) {
  inst.hasAnchor = Boolean(heroPos)
  heroPos && (inst.anchorX = heroPos.x, inst.anchorY = heroPos.y)
  if (inst.visible) {
    inst.show = Math.min(1, inst.show + dt / APPEAR_SEC)
    inst.time += dt
    keepInView(inst, view)
  }
  inst.blast && (inst.blast.t += dt) >= BLAST_SEC && (inst.blast = null)
  inst.fireflies.length && updateFireflies(inst, dt)
}
//
// Shifts the bubble (tail and all) so its full-size picture stays inside
// the view: down from the view's top, left from its right edge, right from
// its left edge.
//
function keepInView(inst, view) {
  inst.shiftX = 0
  inst.shiftY = 0
  if (!view || !inst.hasAnchor) return
  const w = inst.width
  const h = w * inst.picture.height / inst.picture.width
  const tailX = inst.anchorX + TAIL_DX
  const top = inst.anchorY + TAIL_DY - h * TAIL_Y - BOB_PX
  const left = tailX - w * TAIL_X
  inst.shiftY = Math.max(0, view.top - top)
  inst.shiftX = Math.min(0, view.right - (left + w)) || Math.max(0, view.left - left)
}
//
// One firefly born in the bubble's core, flung out a random way.
//
function addFirefly(inst, midX, midY, core) {
  const at = Math.random() * Math.PI * 2
  const off = Math.sqrt(Math.random()) * core
  const way = Math.random() * Math.PI * 2
  const speed = FIREFLY_BLAST_MIN + Math.random() * FIREFLY_BLAST_RANGE
  inst.fireflies.push({
    pos: inst.k.vec2(midX + Math.cos(at) * off, midY + Math.sin(at) * off),
    bx: Math.cos(way) * speed,
    by: Math.sin(way) * speed,
    heading: Math.random() * Math.PI * 2,
    r: FIREFLY_R_MIN + Math.random() * FIREFLY_R_RANGE,
    phase: Math.random() * Math.PI * 2,
    age: 0,
    life: FIREFLY_LIFE_MIN + Math.random() * FIREFLY_LIFE_RANGE
  })
}
//
// Each firefly: its blast speed dies away to a stop, then it hovers on a
// slowly turning heading.
//
function updateFireflies(inst, dt) {
  const drag = Math.exp(-FIREFLY_DRAG * dt)
  inst.fireflies.forEach(fly => {
    fly.age += dt
    fly.bx *= drag
    fly.by *= drag
    fly.heading += Math.sin(fly.phase + fly.age * FIREFLY_TURN) * FIREFLY_TURN * dt
    fly.pos.x += (fly.bx + Math.cos(fly.heading) * FIREFLY_DRIFT) * dt
    fly.pos.y += (fly.by + Math.sin(fly.heading) * FIREFLY_DRIFT - FIREFLY_RISE) * dt
  })
  inst.fireflies = inst.fireflies.filter(fly => fly.age < fly.life)
}
//
// Where the bubble's picture lies in the world now (its top-left and size),
// or null without a hero.
//
function bubbleRect(inst) {
  if (!inst.hasAnchor || !inst.sprite) return null
  const ease = 1 - (1 - inst.show) * (1 - inst.show)
  const w = inst.width * (APPEAR_SCALE + (1 - APPEAR_SCALE) * ease)
  const h = w * inst.picture.height / inst.picture.width
  const tailX = inst.anchorX + TAIL_DX + inst.shiftX
  const tailY = inst.anchorY + TAIL_DY + inst.shiftY + Math.sin(inst.time / BOB_SEC * Math.PI * 2) * BOB_PX
  return { x: tailX - w * TAIL_X, y: tailY - h * TAIL_Y, w, h, tailX, tailY, ease }
}
function onDraw(inst) {
  inst.visible && drawBubble(inst)
  inst.blast && drawBlast(inst)
  inst.fireflies.length && drawFireflies(inst)
}
//
// The blasting bubble: swelling round its body's middle as it fades out.
//
function drawBlast(inst) {
  const blast = inst.blast
  const u = blast.t / BLAST_SEC
  const size = blast.size * (1 + (BLAST_SCALE - 1) * (1 - (1 - u) * (1 - u)))
  inst.scale.x = size
  inst.scale.y = size
  inst.k.drawSprite({ sprite: inst.sprite, pos: blast.pos, anchor: inst.blastAnchor, scale: inst.scale, opacity: blast.opacity * (1 - u) })
}
//
// The bubble at its tail's spot by the hero's head, swelling from the tail.
//
function drawBubble(inst) {
  const rect = bubbleRect(inst)
  if (!rect) return
  const size = rect.w / inst.width / BAKE_RES
  inst.pos.x = rect.tailX
  inst.pos.y = rect.tailY
  inst.scale.x = size
  inst.scale.y = size
  inst.k.drawSprite({ sprite: inst.sprite, pos: inst.pos, anchor: inst.anchor, scale: inst.scale, opacity: rect.ease * inst.opacity })
}
//
// Each firefly: a soft glow round a bright core, twinkling as it fades.
//
function drawFireflies(inst) {
  const { k, color } = inst
  inst.fireflies.forEach(fly => {
    const twinkle = 0.6 + 0.4 * Math.sin(fly.phase + fly.age * FIREFLY_TWINKLE_HZ * Math.PI * 2)
    const fade = Math.max(0, (fly.age / fly.life - FIREFLY_FADE_AT) / (1 - FIREFLY_FADE_AT))
    const opacity = (1 - fade * fade) * twinkle
    k.drawCircle({ pos: fly.pos, radius: fly.r * FIREFLY_GLOW, color, opacity: opacity * FIREFLY_GLOW_ALPHA })
    k.drawCircle({ pos: fly.pos, radius: fly.r, color, opacity })
  })
}
//
// The picture scaled down to width × BAKE_RES and grained, once per live k
// (halved step by step so the downscale stays smooth).
//
function bake(k, picture, name, width, grainSeed) {
  if (k.getSprite(name)) return name
  const w = width * BAKE_RES
  let src = picture
  while (src.width / 2 >= w) src = halve(src)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = Math.round(picture.height / picture.width * w)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
  applyForestFilmGrainToCanvas(canvas, grainSeed)
  k.loadSprite(name, canvas, { filter: 'linear' })
  canvas.width = 0
  canvas.height = 0
  return name
}
//
// A picture at half its size.
//
function halve(src) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(src.width / 2)
  canvas.height = Math.round(src.height / 2)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
  return canvas
}
//
// The picture on a canvas with its background keyed out.
//
function keyBackground(img) {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const cleared = floodBackground(image.data, canvas.width, canvas.height)
  for (let n = 0; n < KEY_SPECK_PASSES; n++) clearSpecks(cleared, canvas.width, canvas.height)
  cleared.forEach((gone, i) => gone && (image.data[i * RGBA + 3] = 0))
  ctx.putImageData(image, 0, 0)
  return canvas
}
//
// Which pixels the fill from the border reaches over background.
//
function floodBackground(px, w, h) {
  const fill = { px, cleared: new Uint8Array(w * h), stack: [] }
  for (let x = 0; x < w; x++) {
    pushBackground(fill, x)
    pushBackground(fill, (h - 1) * w + x)
  }
  for (let y = 0; y < h; y++) {
    pushBackground(fill, y * w)
    pushBackground(fill, y * w + w - 1)
  }
  while (fill.stack.length) {
    const i = fill.stack.pop()
    const x = i % w
    x > 0 && pushBackground(fill, i - 1)
    x < w - 1 && pushBackground(fill, i + 1)
    i >= w && pushBackground(fill, i - w)
    i < w * (h - 1) && pushBackground(fill, i + w)
  }
  return fill.cleared
}
function pushBackground(fill, i) {
  if (fill.cleared[i] || !isBackground(fill.px, i * RGBA)) return
  fill.cleared[i] = 1
  fill.stack.push(i)
}
function isBackground(px, o) {
  if (px[o + 3] < KEY_ALPHA) return true
  const hi = Math.max(px[o], px[o + 1], px[o + 2])
  const lo = Math.min(px[o], px[o + 1], px[o + 2])
  return hi >= KEY_LIGHT && hi - lo <= KEY_GREY
}
//
// Kept pixels nearly surrounded by cleared ones are noise in the background.
//
function clearSpecks(cleared, w, h) {
  const specks = []
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      if (cleared[i]) continue
      const sides = cleared[i - 1] + cleared[i + 1] + cleared[i - w] + cleared[i + w]
      sides >= KEY_SPECK_SIDES && specks.push(i)
    }
  }
  for (const i of specks) cleared[i] = 1
}
