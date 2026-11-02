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
// px), the rows they span (top to the feet) and whether stray backdrop
// pixels (bright green / cyan fringes round the crowns) are wiped out.
//
const SHEETS = {
  [TREE_SHEET.FAR]: {
    url: 'forest/trees_far.png',
    top: 40,
    foot: 660,
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
    top: 30,
    foot: 661,
    wipeFringe: false,
    trees: [
      { x: 12, w: 291, footX: 171.5 },
      { x: 305, w: 213, footX: 407.5 },
      { x: 525, w: 329, footX: 679 },
      { x: 856, w: 224, footX: 966.5 },
      { x: 1085, w: 306, footX: 1204 },
      { x: 1403, w: 252, footX: 1530.5 },
      { x: 1664, w: 210, footX: 1769 },
      { x: 1882, w: 282, footX: 1991 }
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
  const picture = ready[sheetId]
  if (!picture) return
  const sheet = SHEETS[sheetId]
  const h = sheet.foot - sheet.top
  let round = []
  xs.forEach(x => {
    round.length || (round = shuffledCopy(sheet.trees))
    const tree = round.pop()
    const s = scale * (1 + (Math.random() * 2 - 1) * TREE_SCALE_JITTER)
    const mirror = Math.random() < MIRROR_SHARE ? -1 : 1
    ctx.save()
    ctx.imageSmoothingQuality = 'high'
    ctx.translate(x, baseY)
    ctx.scale(s * mirror, s)
    ctx.drawImage(picture, tree.x, sheet.top, tree.w, h, tree.x - tree.footX, -h, tree.w, h)
    ctx.restore()
  })
}
//
// A tree picture ready to draw (null if it fails to load): the image
// itself, or a copy with its backdrop fringes wiped out.
//
function loadPicture(sheet) {
  const img = new Image()
  img.src = sheet.url
  return img.decode().then(() => (sheet.wipeFringe ? wipeFringe(img) : img), () => null)
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
