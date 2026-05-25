import { CFG } from '../cfg.js'
import { toCanvas } from '../../../utils/helper.js'

//
// Distant floor bookshelves baked into the section background layer
//
const SHELF_BASE_WIDTH = 150
const SHELF_BASE_HEIGHT = 190
const SIDE_WALL_WIDTH = 192
const SHELF_Z = CFG.visual.zIndex.background
const FLOOR_SHELF_COUNT = 3
const FLOOR_SHELF_SCALE_MIN = 1.9
const FLOOR_SHELF_SCALE_MAX = 2.5
const FLOOR_SHELF_X_POSITIONS = [0.14, 0.5, 0.86]
const FLOOR_SHELF_OPACITY_MIN = 0.22
const FLOOR_SHELF_OPACITY_MAX = 0.38
const SCRATCH_COUNT = 12
const BOOK_ROWS = [
  [
    { x: 20, y: 22, w: 12, h: 34, shade: 0 },
    { x: 34, y: 18, w: 10, h: 38, shade: 1 },
    { x: 47, y: 26, w: 15, h: 30, shade: 2 },
    { x: 65, y: 20, w: 9, h: 36, shade: 0 },
    { x: 77, y: 24, w: 13, h: 32, shade: 1 },
    { x: 94, y: 17, w: 11, h: 39, shade: 2 },
    { x: 108, y: 25, w: 16, h: 31, shade: 0 }
  ],
  [
    { x: 22, y: 75, w: 14, h: 35, shade: 1 },
    { x: 39, y: 80, w: 9, h: 30, shade: 2 },
    { x: 51, y: 70, w: 12, h: 40, shade: 0 },
    { x: 66, y: 77, w: 18, h: 33, shade: 1 },
    { x: 88, y: 73, w: 10, h: 37, shade: 2 },
    { x: 101, y: 81, w: 20, h: 29, shade: 0 }
  ],
  [
    { x: 24, y: 130, w: 10, h: 34, shade: 2 },
    { x: 37, y: 126, w: 14, h: 38, shade: 0 },
    { x: 55, y: 136, w: 18, h: 28, shade: 1 },
    { x: 77, y: 122, w: 11, h: 42, shade: 2 },
    { x: 91, y: 132, w: 15, h: 32, shade: 0 },
    { x: 110, y: 128, w: 12, h: 36, shade: 1 }
  ]
]

/**
 * Bakes muted floor bookshelves into the farthest full-screen background layer
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.bottomPlatformHeight - Bottom platform height in pixels
 * @param {string} config.backgroundColor - Section background hex color
 * @returns {Object} Bookshelf background instance
 */
export function create(config) {
  const { k, bottomPlatformHeight, backgroundColor } = config
  const bgColor = backgroundColor || CFG.visual.colors.background
  const floorY = k.height() - bottomPlatformHeight
  const playAreaLeft = SIDE_WALL_WIDTH
  const playAreaWidth = k.width() - SIDE_WALL_WIDTH * 2
  const palette = buildPalette(bgColor, CFG.visual.colors.platform)
  const placements = buildPlacements(playAreaLeft, playAreaWidth, floorY)
  const spriteKey = `word-bg-bookshelves-gray-v2-${k.width()}x${k.height()}-${bgColor.replace('#', '')}`
  if (!k.getSprite(spriteKey)) {
    const canvas = toCanvas({ width: k.width(), height: k.height(), pixelRatio: 1 }, (ctx) => {
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, k.width(), k.height())
      placements.forEach((placement) => drawBookshelfOnFloor(ctx, placement, palette))
    })
    k.loadSprite(spriteKey, canvas)
    canvas.width = 0
    canvas.height = 0
  }
  const sprite = k.add([
    k.sprite(spriteKey),
    k.pos(0, 0),
    k.z(SHELF_Z),
    k.fixed()
  ])
  return { k, sprite, palette }
}

//
// Builds evenly spaced floor placements with varied scale, angle, and fade
//
function buildPlacements(playAreaLeft, playAreaWidth, floorY) {
  const placements = []
  const rand = seededRandom(90210)
  for (let i = 0; i < FLOOR_SHELF_COUNT; i++) {
    const xRatio = FLOOR_SHELF_X_POSITIONS[i] ?? (i + 1) / (FLOOR_SHELF_COUNT + 1)
    placements.push({
      x: playAreaLeft + playAreaWidth * xRatio,
      y: floorY,
      scale: FLOOR_SHELF_SCALE_MIN + rand() * (FLOOR_SHELF_SCALE_MAX - FLOOR_SHELF_SCALE_MIN),
      angle: (-10 + rand() * 20) * Math.PI / 180,
      opacity: FLOOR_SHELF_OPACITY_MIN + rand() * (FLOOR_SHELF_OPACITY_MAX - FLOOR_SHELF_OPACITY_MIN),
      seed: Math.floor(i * 137 + rand() * 50)
    })
  }
  return placements
}

//
// Draws one tilted bookshelf standing on the floor line
//
function drawBookshelfOnFloor(ctx, placement, palette) {
  ctx.save()
  ctx.globalAlpha = placement.opacity
  ctx.translate(placement.x, placement.y)
  ctx.rotate(placement.angle)
  ctx.translate(-SHELF_BASE_WIDTH * placement.scale / 2, -SHELF_BASE_HEIGHT * placement.scale)
  drawBookshelf(ctx, 0, 0, placement.scale, placement.seed, palette)
  ctx.restore()
}

//
// Builds a fully gray palette from the level background and platform colors
//
function buildPalette(bgHex, platformHex) {
  const bg = bgHex || CFG.visual.colors.background
  const platform = platformHex || CFG.visual.colors.platform
  return {
    bg,
    frame: mixHex(platform, bg, 0.35),
    stroke: mixHex(platform, bg, 0.55),
    wood: mixHex(bg, platform, 0.18),
    woodDark: mixHex(platform, bg, 0.48),
    woodLight: mixHex(bg, platform, 0.08),
    shelf: mixHex(platform, bg, 0.42),
    books: [
      mixHex(bg, platform, 0.12),
      mixHex(bg, platform, 0.28),
      mixHex(platform, bg, 0.22)
    ]
  }
}

//
// Blends two hex colors
//
function mixHex(fg, bg, amount) {
  const parse = (hex) => {
    const h = hex.replace('#', '')
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    }
  }
  const a = parse(fg)
  const b = parse(bg)
  const t = Math.min(1, Math.max(0, amount))
  const r = Math.round(a.r + (b.r - a.r) * t)
  const g = Math.round(a.g + (b.g - a.g) * t)
  const bl = Math.round(a.b + (b.b - a.b) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
}

//
// Rounded rectangle helper for canvas drawing
//
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

//
// Single horizontal shelf plank
//
function drawShelf(ctx, x, y, w, palette) {
  ctx.fillStyle = palette.shelf
  ctx.strokeStyle = palette.stroke
  ctx.lineWidth = 4
  roundRect(ctx, x, y, w, 10, 4)
  ctx.fill()
  ctx.stroke()
}

//
// One gray book block on a shelf
//
function drawBook(ctx, x, y, w, h, shade, palette) {
  ctx.fillStyle = palette.books[shade % palette.books.length]
  ctx.strokeStyle = palette.stroke
  ctx.lineWidth = 3
  roundRect(ctx, x, y, w, h, 3)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = palette.woodLight
  ctx.lineWidth = 1.5
  ctx.save()
  ctx.globalAlpha *= 0.14
  ctx.beginPath()
  ctx.moveTo(x + w * 0.35, y + 5)
  ctx.lineTo(x + w * 0.35, y + h - 5)
  ctx.stroke()
  ctx.restore()
}

//
// Full bookshelf unit with gray books and wood grain scratches
//
function drawBookshelf(ctx, x, y, scale, seed, palette) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.fillStyle = palette.frame
  ctx.strokeStyle = palette.stroke
  ctx.lineWidth = 5
  roundRect(ctx, 0, 0, 150, 190, 10)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = palette.wood
  ctx.strokeStyle = palette.stroke
  ctx.lineWidth = 4
  roundRect(ctx, 8, 8, 134, 174, 7)
  ctx.fill()
  ctx.stroke()
  drawShelf(ctx, 14, 58, 122, palette)
  drawShelf(ctx, 14, 112, 122, palette)
  drawShelf(ctx, 14, 166, 122, palette)
  BOOK_ROWS[0].forEach((book) => drawBook(ctx, book.x, book.y, book.w, book.h, book.shade, palette))
  BOOK_ROWS[1].forEach((book) => drawBook(ctx, book.x, book.y, book.w, book.h, book.shade, palette))
  BOOK_ROWS[2].forEach((book) => drawBook(ctx, book.x, book.y, book.w, book.h, book.shade, palette))
  ctx.strokeStyle = palette.woodLight
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.18
  ctx.beginPath()
  ctx.moveTo(18, 18)
  ctx.lineTo(130, 18)
  ctx.moveTo(20, 176)
  ctx.lineTo(128, 176)
  ctx.stroke()
  ctx.strokeStyle = palette.woodDark
  ctx.globalAlpha = 0.28
  const rand = seededRandom(seed)
  for (let i = 0; i < SCRATCH_COUNT; i++) {
    const sx = 18 + rand() * 110
    const sy = 18 + rand() * 150
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx + 8 + rand() * 12, sy + rand() * 3)
    ctx.stroke()
  }
  ctx.restore()
}

//
// Deterministic pseudo-random for stable scratch patterns per shelf
//
function seededRandom(seed) {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
}
