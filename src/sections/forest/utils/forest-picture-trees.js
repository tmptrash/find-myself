import { shuffledCopy } from '../../../utils/helper.js'
//
// Trees of forest level 0's parallax rows, cut from pictures: the far row
// from assets/forest/trees_far.png, the middle and near rows from
// assets/forest/trees_mid.png. Each row stands its trees on the ground line,
// each a little bigger or smaller and some mirrored so repeats do not read as
// copies; the row's baked canvas then gets its depth blur, grade and haze.
// The pictures start loading with this module (game boot) and are prepared
// once per page.
//
export const TREE_SHEET = { FAR: 'far', MID: 'mid' }
//
// Per picture: the trees (rect x / width and the middle of the trunk's foot,
// px), the rows they span (top to the feet), whether stray backdrop
// pixels (bright green / cyan fringes round the crowns) are wiped out, and
// how much bigger its trees are drawn than its px (trees_mid.png is
// exported MID_SHEET_SCALE times smaller than the art the rows were sized
// for — 682 px tall instead of 724 — to stay within a 2048 px texture).
//
const MID_SHEET_SCALE = 724 / 682
const SHEETS = {
  [TREE_SHEET.FAR]: {
    url: 'forest/trees_far.png',
    top: 40,
    foot: 660,
    scale: 1,
    wipeFringe: true,
    trees: [
      { x: 15, w: 314, footX: 193 },
      { x: 341, w: 202, footX: 433.5 },
      { x: 553, w: 356, footX: 737 },
      { x: 921, w: 187, footX: 1019.5 },
      { x: 1114, w: 310, footX: 1216 },
      { x: 1443, w: 217, footX: 1554 },
      { x: 1669, w: 296, footX: 1812.5 },
      { x: 1981, w: 180, footX: 2063 }
    ]
  },
  [TREE_SHEET.MID]: {
    url: 'forest/trees_mid.png',
    top: 27,
    foot: 623,
    scale: MID_SHEET_SCALE,
    wipeFringe: false,
    trees: [
      { x: 11, w: 275, footX: 161.5 },
      { x: 287, w: 202, footX: 384 },
      { x: 494, w: 312, footX: 640 },
      { x: 807, w: 212, footX: 911 },
      { x: 1023, w: 289, footX: 1135.5 },
      { x: 1323, w: 237, footX: 1443 },
      { x: 1568, w: 199, footX: 1668 },
      { x: 1774, w: 267, footX: 1877 }
    ]
  }
}
//
// A fringe pixel's green or blue channel beats its red one by at least this
// much (the trees' own grey-green stays well under it).
//
const FRINGE_EXCESS = 45
//
// Per tree: its size varies this much around the row's scale, and this share
// of the trees is drawn mirrored.
//
const TREE_SCALE_JITTER = 0.08
const MIRROR_SHARE = 0.5
//
// A tree's rect may hold bits of its neighbours: only its own figure is
// kept — the biggest 8-connected piece of pixels at least TREE_SOLID_ALPHA
// opaque, grown TREE_FRINGE_PX px into its soft edge — everything else in
// the rect is cleared (once per page).
//
const TREE_SOLID_ALPHA = 24
const TREE_FRINGE_PX = 2
const RGBA = 4
const pictures = Object.fromEntries(Object.entries(SHEETS).map(([id, sheet]) => [id, loadPicture(sheet)]))
const ready = {}

/**
 * Waits for every tree picture (once per page).
 * @returns {Promise<void>}
 */
export async function loadForestPictureTrees() {
  await Promise.all(Object.entries(pictures).map(async ([id, picture]) => { ready[id] ??= await picture }))
}

/**
 * Draws a row's trees, their trunks' feet on the ground line: the picture's
 * trees in turn (each round in a new random order), each at a slightly
 * random size, some mirrored. Draws nothing until loadForestPictureTrees()
 * has resolved.
 * @param {CanvasRenderingContext2D} ctx - The row's canvas (world coordinates)
 * @param {string} sheetId - TREE_SHEET.*
 * @param {Array<number>} xs - World X of each tree's foot
 * @param {number} baseY - World Y of the feet
 * @param {number} scale - World px per picture px
 */
export function drawForestPictureTrees(ctx, sheetId, xs, baseY, scale) {
  const trees = ready[sheetId]
  if (!trees) return
  const sheet = SHEETS[sheetId]
  const h = sheet.foot - sheet.top
  let round = []
  xs.forEach(x => {
    round.length || (round = shuffledCopy(sheet.trees))
    const tree = round.pop()
    const s = scale * sheet.scale * (1 + (Math.random() * 2 - 1) * TREE_SCALE_JITTER)
    const mirror = Math.random() < MIRROR_SHARE ? -1 : 1
    ctx.save()
    ctx.imageSmoothingQuality = 'high'
    ctx.translate(x, baseY)
    ctx.scale(s * mirror, s)
    ctx.drawImage(trees[sheet.trees.indexOf(tree)], tree.x - tree.footX, -h, tree.w, h)
    ctx.restore()
  })
}
//
// A picture's trees ready to draw (null if it fails to load): each cut out
// of the image (or of a copy with its backdrop fringes wiped out) on its
// own canvas.
//
function loadPicture(sheet) {
  const img = new Image()
  img.src = sheet.url
  return img.decode().then(() => isolateTrees(sheet.wipeFringe ? wipeFringe(img) : img, sheet), () => null)
}
//
// Each tree of a picture cut out on its own canvas, its neighbours' bits
// cleared (indexed as the sheet's trees).
//
function isolateTrees(picture, sheet) {
  return sheet.trees.map(tree => isolateTree(picture, tree, sheet))
}
function isolateTree(picture, tree, sheet) {
  const w = tree.w
  const h = sheet.foot - sheet.top
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(picture, tree.x, sheet.top, w, h, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h)
  const keep = biggestPiece(data.data, w, h)
  for (let g = 0; g < TREE_FRINGE_PX; g++) growInto(keep, data.data, w, h)
  for (let i = 0; i < w * h; i++) keep[i] || (data.data[i * RGBA + 3] = 0)
  ctx.putImageData(data, 0, 0)
  return canvas
}
//
// The biggest 8-connected piece of solid pixels, as a mask.
//
function biggestPiece(px, w, h) {
  const label = new Int32Array(w * h).fill(-1)
  const stack = []
  let best = -1
  let bestSize = 0
  let next = 0
  for (let start = 0; start < w * h; start++) {
    if (label[start] >= 0 || px[start * RGBA + 3] < TREE_SOLID_ALPHA) continue
    const id = next++
    let size = 0
    label[start] = id
    stack.push(start)
    while (stack.length) {
      const i = stack.pop()
      size++
      const x = i % w
      const y = (i - x) / w
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const n = ny * w + nx
          if (label[n] >= 0 || px[n * RGBA + 3] < TREE_SOLID_ALPHA) continue
          label[n] = id
          stack.push(n)
        }
      }
    }
    size > bestSize && (best = id, bestSize = size)
  }
  const keep = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) label[i] === best && (keep[i] = 1)
  return keep
}
//
// Grows a mask by one pixel into any pixel with some alpha (the soft edge).
//
function growInto(keep, px, w, h) {
  const add = []
  for (let i = 0; i < w * h; i++) {
    if (keep[i] || px[i * RGBA + 3] === 0) continue
    const x = i % w
    const near = (x > 0 && keep[i - 1]) || (x < w - 1 && keep[i + 1]) || (i >= w && keep[i - w]) || (i < w * (h - 1) && keep[i + w])
    near && add.push(i)
  }
  add.forEach(i => { keep[i] = 1 })
}
//
// Copy of a picture without its backdrop fringes (one pixel read of the
// loaded image, never of a drawn GPU canvas).
//
function wipeFringe(img) {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const px = data.data
  for (let i = 0; i < px.length; i += 4) {
    Math.max(px[i + 1], px[i + 2]) - px[i] >= FRINGE_EXCESS && (px[i + 3] = 0)
  }
  ctx.putImageData(data, 0, 0)
  return canvas
}
