import * as Earth from './cave-earth.js'
//
// A rectangular plate of the cave's soil (the menu's Yes / No board and
// its answer tags in the cave look): assembled like a platform from the
// soil kit (cave-earth.js) — the soil block with stones in it, ragged
// edges and corners all round, the top strips along its top.
//
//
// The top strips' line sits this far under the plate's top (their lumps
// rise above it).
//
const TOP_DROP = 14

/**
 * Paints a soil plate filling the rect (x, y, w, h) of a canvas.
 * @param {CanvasRenderingContext2D} ctx - Target context
 * @param {number} x - Left
 * @param {number} y - Top
 * @param {number} w - Width
 * @param {number} h - Height
 * @param {number} seed - Plate seed
 * @param {boolean} [bare=false] - Nothing laid in its soil (a small plate whose label must read clean)
 */
export function paintPlate(ctx, x, y, w, h, seed, bare = false) {
  const topY = y + TOP_DROP
  const x2 = x + w
  const y2 = y + h
  const inset = Earth.CORE_INSET
  const body = {
    core: [
      { x: x + inset, y: topY + Earth.TOP_INSET },
      { x: x2 - inset, y: topY + Earth.TOP_INSET },
      { x: x2 - inset, y: y2 - inset },
      { x: x + inset, y: y2 - inset }
    ],
    edges: [
      { name: 'edgeB', pts: [{ x, y: y2 }, { x: x2, y: y2 }] },
      { name: 'edgeL', pts: [{ x, y: topY }, { x, y: y2 }] },
      { name: 'edgeR', pts: [{ x: x2, y: topY }, { x: x2, y: y2 }] }
    ],
    corners: [
      { name: 'cornerTL', x, y: topY },
      { name: 'cornerTR', x: x2, y: topY },
      { name: 'cornerBL', x, y: y2 },
      { name: 'cornerBR', x: x2, y: y2 }
    ],
    top: { x1: x, x2, at: () => topY, fadeL: true, fadeR: true },
    bare
  }
  const layer = Earth.soilLayer(body, seed)
  ctx.drawImage(layer.canvas, layer.x, layer.y)
}
