import { shuffledCopy } from '../../../utils/helper.js'
import { applyForestFilmGrainToCanvas } from './forest-parallax-grain.js'
import { cutPicture, loadPictureImage } from './forest-picture.js'
//
// Clouds of forest level 0, cut from assets/forest/clouds.png: a few of the
// sheet's clouds drifting slowly left to right along the top of the whole
// level, in front of the parallax forest. They live in the world, so the
// camera passes them by; each wraps round from the level's right end to its
// left one. The sheet's faint white speckle round the clouds is cut
// away (alpha under SPECK_ALPHA). The sheet starts loading with this module
// (game boot); sprites are baked once per live k.
//
const URL = 'forest/clouds.png'
const SPRITE_PREFIX = 'forest0-cloud-v1'
const GRAIN_SEED = 7900
const SPECK_ALPHA = 48
//
// The clouds on the sheet (px).
//
const CLOUDS = [
  { x: 65, y: 80, w: 477, h: 117 },
  { x: 627, y: 66, w: 434, h: 137 },
  { x: 1147, y: 105, w: 454, h: 78 },
  { x: 1703, y: 66, w: 394, h: 133 },
  { x: 82, y: 297, w: 421, h: 132 },
  { x: 606, y: 299, w: 454, h: 128 },
  { x: 1159, y: 306, w: 431, h: 112 },
  { x: 1704, y: 332, w: 385, h: 77 },
  { x: 1149, y: 568, w: 437, h: 62 },
  { x: 66, y: 550, w: 451, h: 94 },
  { x: 624, y: 516, w: 409, h: 141 },
  { x: 1703, y: 522, w: 391, h: 129 }
]
//
// One cloud per CLOUD_SPACING px of the level, their size (world px per
// sheet px, a little random), drift speed (px/s, a little random) and the
// band they float in (from the band's top).
//
const CLOUD_SPACING = 300
const CLOUD_SCALE = 0.42
const CLOUD_SCALE_JITTER = 0.2
const CLOUD_SPEED = 4
const CLOUD_SPEED_JITTER = 0.4
const CLOUD_BAND_H = 150
const VIEW_PAD = 20
const picture = loadPictureImage(URL).then(img => img && cutSpeckle(img))
const bakedByK = new WeakMap()
let sheet = null

/**
 * Waits for the cloud sheet (once per page).
 * @returns {Promise<void>}
 */
export async function loadForestClouds() {
  sheet ??= await picture
}

/**
 * Creates the drifting clouds (spread evenly along the level, each a
 * random cloud of the sheet at a random height in the band).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.x1 - World X of the level's left end
 * @param {number} cfg.x2 - World X of the level's right end
 * @param {number} cfg.topY - World Y of the band's top
 * @returns {Object} Clouds inst
 */
export function create(cfg) {
  const { k, x1, x2, topY } = cfg
  const maxW = Math.max(...CLOUDS.map(c => c.w)) * CLOUD_SCALE * (1 + CLOUD_SCALE_JITTER)
  const start = x1 - maxW
  const span = x2 - x1 + maxW * 2
  const count = Math.max(1, Math.round(span / CLOUD_SPACING))
  let looks = []
  const clouds = Array.from({ length: count }, (_, i) => {
    looks.length || (looks = shuffledCopy(CLOUDS.map((_, j) => j)))
    return {
      look: looks.pop(),
      scale: CLOUD_SCALE * (1 + (Math.random() * 2 - 1) * CLOUD_SCALE_JITTER),
      speed: CLOUD_SPEED * (1 + (Math.random() * 2 - 1) * CLOUD_SPEED_JITTER),
      offset: (i + Math.random() * 0.5) / count * span,
      y: topY + Math.random() * CLOUD_BAND_H
    }
  })
  return { k, clouds, start, span }
}

/**
 * Draws the clouds on screen where they have drifted to in the world
 * (nothing before the sheet has loaded).
 * @param {Object} inst - Clouds inst
 * @param {number} [opacity=1] - Fade (menu backdrop cross-fade)
 */
export function onDraw(inst, opacity = 1) {
  const k = inst.k
  const sprites = bakeSprites(k)
  if (!sprites) return
  const camX = k.camPos().x
  const halfView = k.width() / 2 / (k.camScale().x || 1) + VIEW_PAD
  const t = k.time()
  inst.clouds.forEach(cloud => {
    const s = sprites[cloud.look]
    const w = s.w * cloud.scale
    const x = inst.start + ((cloud.offset + cloud.speed * t) % inst.span)
    if (x + w < camX - halfView || x > camX + halfView) return
    k.drawSprite({ sprite: s.sprite, pos: k.vec2(x, cloud.y), width: w, height: s.h * cloud.scale, opacity })
  })
}
//
// Every cloud of the sheet as a grained sprite; once per live k (null until
// the sheet has loaded).
//
function bakeSprites(k) {
  if (!sheet) return null
  const cached = bakedByK.get(k)
  if (cached) return cached
  const out = CLOUDS.map((rect, i) => {
    const canvas = cutPicture(sheet, rect, 1)
    applyForestFilmGrainToCanvas(canvas, GRAIN_SEED + i)
    const sprite = `${SPRITE_PREFIX}-${i}`
    k.loadSprite(sprite, canvas)
    return { sprite, w: canvas.width, h: canvas.height }
  })
  bakedByK.set(k, out)
  return out
}
//
// Copy of the sheet without its faint speckle (one pixel read of the loaded
// image, never of a drawn GPU canvas).
//
function cutSpeckle(img) {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  for (let p = 3; p < data.data.length; p += 4) data.data[p] < SPECK_ALPHA && (data.data[p] = 0)
  ctx.putImageData(data, 0, 0)
  return canvas
}
