import { createSeededRandom } from '../../../utils/seeded-random.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from './cave-atlas.js'
import * as Layout from './cave-layout.js'
import * as Ground from './cave-ground.js'
//
// The lake's bed: a few stones (stones.png) and plants that live under
// water (plants.png and plants2.png: tube sponges, corals, anemones,
// curled weed, glowing bulbs) standing on its soil, in clumps and open
// stretches — only where the bed lies deep enough under the surface for
// them, never on the banks' slopes. They are painted into the terrain
// bake over the bed's own tint (which would hide them in its dark),
// pulled toward the deep water's dark teal (SHADE_AMOUNT): darker than
// anything growing on dry land, yet still readable; the water drawn over
// the lake darkens them on. Placed once per page.
//
const SHADE = CAVE_CFG.water.bedShade
const SHADE_AMOUNT = 0.3
const SEED = 7420
//
// The pieces that may stand on the bed.
//
const PLANTS = ['bush0', 'bush1', 'bush2', 'bush3', 'bush4', 'bush6', 'bush7', 'bush8', 'bush10', 'bush12', 'upB11', 'upB16', 'upB19', 'upB20', 'upB21', 'upB22', 'upB23', 'upB26', 'upB27', 'upB28']
const STONES = ['rock1', 'rock3', 'rock5', 'rock7', 'rock8', 'rock10', 'rock12', 'rock13', 'rock17', 'rock19', 'rock20', 'rock22', 'rock24', 'rock25', 'rock29', 'rock36', 'rock38', 'rock39', 'rock43', 'rock46']
//
// Drawn heights (world px): plants PLANT_H..+RANGE, stones STONE_H..
// +RANGE; a stone sinks STONE_SINK px into the soil, a plant UP_SINK.
// Something stands every GAP..+GAP_RANGE px (CLUMP_CHANCE of them close,
// CLUMP_GAP..+RANGE px); STONE_CHANCE of them stones. Plants only where
// the bed is MIN_DEPTH px or more under the surface, stones down from
// STONE_MIN_DEPTH (on the banks' slopes too), all END_CLEAR px in from the
// lake's ends; a piece stands on the lowest soil under its root
// (ROOT_SHARE of its width either side, read every ROOT_STEP px).
//
const PLANT_H = 18
const PLANT_H_RANGE = 16
const STONE_H = 10
const STONE_H_RANGE = 14
const STONE_SINK = 4
const UP_SINK = 3
const GAP = 45
const GAP_RANGE = 80
const CLUMP_CHANCE = 0.45
const CLUMP_GAP = 12
const CLUMP_GAP_RANGE = 16
const STONE_CHANCE = 0.6
const MIN_DEPTH = 120
const STONE_MIN_DEPTH = 50
const END_CLEAR = 40
const ROOT_SHARE = 0.3
const ROOT_STEP = 2
const FLIP_CHANCE = 0.5
let pieces = null

/**
 * Paints the bed's stones and plants that reach into a world rect.
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {{x1: number, y1: number, x2: number, y2: number}} rect - World rect to cover
 */
export function paint(ctx, rect) {
  pieces ??= place()
  pieces.forEach(pc => paintPiece(ctx, rect, pc))
}
function paintPiece(ctx, rect, pc) {
  pc.box.x2 >= rect.x1 && pc.box.x1 <= rect.x2 && pc.box.y2 >= rect.y1 && pc.box.y1 <= rect.y2 &&
    Atlas.drawPiece(ctx, pc.name, pc.x, pc.y, pc.h, { flip: pc.flip, shade: SHADE, shadeAmount: SHADE_AMOUNT })
}
//
// Along the bed: clumps and open stretches, stones among the plants,
// stones first in a clump's paint order so a plant beside one stands over
// it.
//
function place() {
  const rng = createSeededRandom(SEED)
  const floor = Layout.lakeFloor()
  const out = []
  for (let x = Layout.LAKE_X1 + END_CLEAR; x < Layout.LAKE_X2 - END_CLEAR; x += nextGap(rng)) {
    const stone = rng() < STONE_CHANCE
    const pc = stand(rng, floor, x, stone)
    Ground.topAt(floor, x) - Layout.LAKE_SURFACE_Y >= (stone ? STONE_MIN_DEPTH : MIN_DEPTH) && out.push(pc)
  }
  return out.sort((a, b) => Number(b.stone) - Number(a.stone))
}
function nextGap(rng) {
  return rng() < CLUMP_CHANCE ? CLUMP_GAP + rng() * CLUMP_GAP_RANGE : GAP + rng() * GAP_RANGE
}
//
// A stone or a plant standing on the soil at x.
//
function stand(rng, floor, x, stone) {
  const names = stone ? STONES : PLANTS
  const name = names[Math.floor(rng() * names.length)]
  const h = stone ? STONE_H + rng() * STONE_H_RANGE : PLANT_H + rng() * PLANT_H_RANGE
  const w = Atlas.widthAt(name, h)
  const y = lowestUnder(floor, x, w * ROOT_SHARE) + (stone ? STONE_SINK : UP_SINK)
  return { name, x, y, h, stone, flip: rng() < FLIP_CHANCE, box: { x1: x - w / 2, y1: y - h, x2: x + w / 2, y2: y } }
}
function lowestUnder(floor, x, half) {
  let y = -Infinity
  for (let dx = -half; dx <= half; dx += ROOT_STEP) y = Math.max(y, Ground.topAt(floor, x + dx))
  return y
}
