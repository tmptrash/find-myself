import * as Hero from '../../../components/hero.js'
import { CFG } from '../../../cfg.js'
import { get, set } from '../../../utils/progress.js'
import { getRGB } from '../../../utils/helper.js'
import { loadPictureImage } from '../utils/forest-picture.js'
import { applyForestFilmGrainToCanvas } from '../utils/forest-parallax-grain.js'
import { FOREST_PAL } from '../utils/forest-palette.js'
//
// The hero's dream: once he has dozed off and his eyes are shut
// (Hero.dozeShare reaches 1), a thought bubble (assets/forest/level_end.png)
// swells up beside his head from its small tail bubbles and bobs gently.
// The moment he moves it bursts: it is gone at once, and white fireflies
// drift where it was, fading out one by one.
//
// It dreams up only SHOWS_MAX times (counted in the saved progress under
// SHOWS_KEY, so a page reload does not give them back), and never while the
// caller says no (the hero on the left tree's branch). Once it has dreamt
// them all, the hero no longer dozes off at all. Both dreams come back on
// the very first start of the game (nothing saved yet), when the level is
// started over from the menu (that wipes the forest's progress) and after
// AWAKE_RESET_SEC more in the level since the last one (that time is saved
// under AWAKE_KEY every AWAKE_SAVE_SEC, so reloads and deaths keep it).
//
const URL = 'forest/level_end.png'
const SPRITE_PREFIX = 'forest0-dream-bubble'
const GRAIN_SEED = 9310
const SHOWS_MAX = 2
const SHOWS_KEY = 'forest.dreamShows'
const AWAKE_KEY = 'forest.dreamAwakeSec'
const AWAKE_RESET_SEC = 30 * 60
const AWAKE_SAVE_SEC = 30
//
// The picture is BUBBLE_W world px wide, baked BAKE_RES times sharper and
// drawn linear (it stays smooth while it swells and on scaled touch views).
// Its tail's last bubble (TAIL_X / TAIL_Y of the picture) stands TAIL_DX /
// TAIL_DY off the hero's centre — just above and ahead of his head — and
// the bubble swells from there.
//
const BUBBLE_W = 200
const BAKE_RES = 2
const TAIL_X = 0.048
const TAIL_Y = 0.951
const TAIL_DX = 16
const TAIL_DY = -40
//
// It waits SHOW_DELAY_SEC after his eyes shut, swells in over APPEAR_SEC
// from APPEAR_SCALE of its size (eased out), and bobs BOB_PX up and down
// every BOB_SEC. A cloud, it is a little see-through: BUBBLE_OPACITY at
// its fullest.
//
const SHOW_DELAY_SEC = 0.3
const BUBBLE_OPACITY = 0.82
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
const sheet = loadPictureImage(URL)
let picture = null

/**
 * Waits for the bubble picture (once per page).
 * @returns {Promise<void>}
 */
export async function load() {
  if (picture) return
  const img = await sheet
  picture ??= img && keyBackground(img)
}

/**
 * Creates the dream bubble over a hero (its sprite baked once per live k;
 * nothing shows until load() has resolved).
 * @param {Object} cfg - Bubble configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.heroInst - Hero instance it dreams over (swap it on respawn)
 * @returns {Object} Bubble inst
 */
export function create(cfg) {
  const { k, heroInst } = cfg
  const inst = {
    k,
    heroInst,
    sprite: bake(k),
    shows: get(SHOWS_KEY, 0),
    awakeSec: get(AWAKE_KEY, 0),
    awakeSavedSec: 0,
    visible: false,
    dreamedThisDoze: false,
    shutT: 0,
    show: 0,
    time: 0,
    fireflies: [],
    blast: null,
    blastAnchor: k.vec2(BODY_MID_X * 2 - 1, BODY_MID_Y * 2 - 1),
    color: getRGB(k, FOREST_PAL.dreamFirefly),
    pos: k.vec2(0, 0),
    scale: k.vec2(1, 1),
    anchor: k.vec2(TAIL_X * 2 - 1, TAIL_Y * 2 - 1)
  }
  k.add([
    k.z(Z),
    {
      draw() {
        onDraw(inst)
      }
    }
  ])
  return inst
}

/**
 * Shows the bubble once the hero's eyes have shut (if it still may), bursts
 * it into fireflies when he moves, and drifts the fireflies.
 * @param {Object} inst - Bubble inst
 * @param {number} dt - Seconds since the last frame
 * @param {boolean} allowed - False keeps a new bubble from showing, bursts one that shows and keeps the hero awake (his eyes stay open)
 * @param {boolean} [mayDoze=true] - False keeps the hero awake (his doze timer does not run)
 */
export function onUpdate(inst, dt, allowed, mayDoze = true) {
  inst.shows >= SHOWS_MAX && !inst.visible && tickAwake(inst, dt)
  Hero.setDozes(inst.heroInst, allowed && (inst.visible || (mayDoze && inst.shows < SHOWS_MAX)))
  const doze = Hero.dozeShare(inst.heroInst)
  doze <= 0 && (inst.dreamedThisDoze = false)
  inst.shutT = doze >= 1 ? inst.shutT + dt : 0
  if (inst.visible) {
    doze < 1 || !allowed ? burst(inst) : swell(inst, dt)
  } else if (allowed && inst.sprite && inst.shutT >= SHOW_DELAY_SEC && !inst.dreamedThisDoze && inst.shows < SHOWS_MAX) {
    startDream(inst)
  }
  inst.blast && (inst.blast.t += dt) >= BLAST_SEC && (inst.blast = null)
  inst.fireflies.length && updateFireflies(inst, dt)
}
//
// A new dream: counted for this run of the app.
//
function startDream(inst) {
  inst.visible = true
  inst.dreamedThisDoze = true
  inst.show = 0
  inst.time = 0
  inst.shows++
  set(SHOWS_KEY, inst.shows)
}
function swell(inst, dt) {
  inst.show = Math.min(1, inst.show + dt / APPEAR_SEC)
  inst.time += dt
}
//
// The hero moved: the bubble blasts where it stands and a swarm of
// fireflies flies out of it.
//
function burst(inst) {
  inst.visible = false
  const rect = bubbleRect(inst)
  inst.show = 0
  if (!rect) return
  const midX = rect.x + rect.w * BODY_MID_X
  const midY = rect.y + rect.h * BODY_MID_Y
  inst.blast = { t: 0, pos: inst.k.vec2(midX, midY), size: rect.w / BUBBLE_W / BAKE_RES, opacity: rect.ease * BUBBLE_OPACITY }
  for (let i = 0; i < FIREFLY_COUNT; i++) addFirefly(inst, midX, midY, rect.w * FIREFLY_CORE)
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
  const pos = inst.heroInst?.character?.pos
  if (!pos || !inst.sprite) return null
  const ease = 1 - (1 - inst.show) * (1 - inst.show)
  const w = BUBBLE_W * (APPEAR_SCALE + (1 - APPEAR_SCALE) * ease)
  const h = w * picture.height / picture.width
  const tailX = pos.x + TAIL_DX
  const tailY = pos.y + TAIL_DY + Math.sin(inst.time / BOB_SEC * Math.PI * 2) * BOB_PX
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
  const size = rect.w / BUBBLE_W / BAKE_RES
  inst.pos.x = rect.tailX
  inst.pos.y = rect.tailY
  inst.scale.x = size
  inst.scale.y = size
  inst.k.drawSprite({ sprite: inst.sprite, pos: inst.pos, anchor: inst.anchor, scale: inst.scale, opacity: rect.ease * BUBBLE_OPACITY })
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
// Time in the level since the last dream: saved now and then; once it
// reaches AWAKE_RESET_SEC both dreams come back.
//
function tickAwake(inst, dt) {
  inst.awakeSec += dt
  if (inst.awakeSec >= AWAKE_RESET_SEC) {
    inst.shows = 0
    inst.awakeSec = 0
    inst.awakeSavedSec = 0
    set(SHOWS_KEY, 0)
    set(AWAKE_KEY, 0)
    return
  }
  inst.awakeSec - inst.awakeSavedSec >= AWAKE_SAVE_SEC && saveAwake(inst)
}
function saveAwake(inst) {
  inst.awakeSavedSec = inst.awakeSec
  set(AWAKE_KEY, inst.awakeSec)
}
//
// The picture scaled down to BUBBLE_W × BAKE_RES and grained, once per live
// k (halved step by step so the downscale stays smooth).
//
function bake(k) {
  if (!picture) return null
  const name = `${SPRITE_PREFIX}-${BUBBLE_W}`
  if (k.getSprite(name)) return name
  const w = BUBBLE_W * BAKE_RES
  let src = picture
  while (src.width / 2 >= w) src = halve(src)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = Math.round(picture.height / picture.width * w)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
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
