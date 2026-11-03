import { FOREST_LAYER_GRADE, applyForestLayerGradeToCanvas } from './forest-parallax-grain.js'
import { forestFilmGrainBlockPxForTier } from './forest-pixel-density.js'
import { cutPicture, loadPictureImage, wipePictureFringe } from './forest-picture.js'
import { bakeForestFootPlants } from './forest-foot-plants.js'
import { STONE_KIND, forestGroundStones } from './forest-stones.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import * as TreeJolt from './forest-tree-jolt.js'
//
// The bomb trees of forest level 0, cut from assets/forest/bombs.png (its
// stray backdrop fringe wiped): two pale-trunked trees with red blossoms,
// each with its roots and its bomb flower. A tree stands on the ground line
// (its roots under it) and rocks round its foot when the hero lands near it;
// its bomb sits in the fork of its trunk (components/spiky-tomato.js).
// Ferns, grass and sometimes a mossy stone stand over the seam between the
// trunk and its roots.
// Spots take the pictures in turn. The sheet starts loading with this
// module (game boot); sprites are baked once per live k.
//
const URL = 'forest/bombs.png'
const SPRITE_PREFIX = 'forest0-bomb-tree-v1'
const GRAIN_SEED = 7400
//
// Per picture (px): the tree above ground and the middle of its trunk's
// foot, its roots and the middle of their top, where the bomb sits (fork of
// the trunk) and the bomb flower.
//
const TREES = [
  {
    crown: { x: 100, y: 36, w: 533, h: 491 },
    footX: 369.5,
    footHalfW: 43.5,
    roots: { x: 86, y: 549, w: 550, h: 284 },
    rootsX: 369,
    seat: { x: 380, y: 95 },
    bomb: { x: 300, y: 868, w: 171, h: 182 }
  },
  {
    crown: { x: 724, y: 9, w: 635, h: 518 },
    footX: 964.5,
    footHalfW: 66,
    roots: { x: 692, y: 549, w: 689, h: 300 },
    rootsX: 985,
    seat: { x: 1020, y: 100 },
    bomb: { x: 933, y: 871, w: 170, h: 182 }
  }
]
//
// World px per picture px for the trees and for the bombs; the trunk's
// foot and the roots' top overlap the ground line by GROUND_TUCK px.
//
const TREE_SCALE = 0.38
const BOMB_SCALE = 0.22
const GROUND_TUCK = 2
//
// Landing jolt (utils/forest-tree-jolt.js): the tree swings round its foot
// by up to SHAKE_MAX_RAD.
//
const SHAKE_MAX_RAD = 0.07
const RAD_TO_DEG = 180 / Math.PI
const VIEW_PAD = 20
//
// Greens over each trunk's foot (world px from the foot; footHalfW: half the
// trunk there on the picture): ferns on both flanks and over the trunk, a
// row of grass tufts across the seam, and at STONE_CHANCE a small mossy
// stone (STONE_W wide) on one flank.
//
const PLANTS_HALF_W = 64
const PLANTS_ABOVE = 46
const PLANTS_BELOW = 10
const PLANTS_SEED = 7460
const PLANTS_SEED_STEP = 101
const FERN_OUTER_GAP = 8
const FERN_OUTER_SIZE = 28
const FERN_INNER_SHARE = 0.45
const FERN_INNER_SIZE = 20
const TUFT_OVERHANG = 16
const TUFT_STEP = 7
const STONE_CHANCE = 0.5
const STONE_LEFT_SHARE = 0.5
const STONE_GAP = 18
const STONE_W = 24
const bakedByK = new WeakMap()
const plantsByK = new WeakMap()
let sheet = null
const picture = loadPictureImage(URL).then(img => {
  sheet ??= img && wipePictureFringe(img)
  return sheet
})

/**
 * Waits for the bomb tree sheet (once per page).
 * @returns {Promise<void>}
 */
export async function loadForestBombTrees() {
  await picture
}

/**
 * Creates the bomb trees on their spots (their sprites are baked once per
 * live k as soon as the sheet has loaded; nothing is drawn before).
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {Array<{x: number, groundY: number}>} cfg.spots - World points where the trunks meet the ground
 * @returns {Object} Bomb tree inst
 */
export function create(cfg) {
  const { k, spots } = cfg
  const trees = spots.map((spot, i) => ({ x: spot.x, groundY: spot.groundY, look: TREES[i % TREES.length], lookIndex: i % TREES.length, sprites: null, jolt: TreeJolt.create() }))
  const inst = { k, trees }
  ensureSprites(inst)
  return inst
}

/**
 * Advances the landing jolts.
 * @param {Object} inst - Bomb tree inst
 * @param {number} dt - Frame delta
 */
export function onUpdate(inst, dt) {
  inst.trees.forEach(tree => TreeJolt.onUpdate(tree.jolt, dt))
}

/**
 * Starts the landing jolt on one tree (restarts it if already rocking).
 * @param {Object} inst - Bomb tree inst
 * @param {number} index - Tree index
 */
export function shake(inst, index) {
  const tree = inst.trees[index]
  tree && TreeJolt.start(tree.jolt)
}

/**
 * Where a tree's bomb sits (the fork of its trunk), following the jolt.
 * @param {Object} inst - Bomb tree inst
 * @param {number} index - Tree index
 * @returns {{x: number, y: number}|null}
 */
export function getCrownTop(inst, index) {
  const tree = inst.trees[index]
  if (!tree) return null
  const dx = (tree.look.seat.x - tree.look.footX) * TREE_SCALE
  const dy = (tree.look.seat.y - (tree.look.crown.y + tree.look.crown.h)) * TREE_SCALE
  const a = shakeAngle(tree)
  return {
    x: tree.x + dx * Math.cos(a) - dy * Math.sin(a),
    y: tree.groundY + GROUND_TUCK + dx * Math.sin(a) + dy * Math.cos(a)
  }
}

/**
 * A tree's bomb flower sprite and world size (null before the bake).
 * @param {Object} inst - Bomb tree inst
 * @param {number} index - Tree index
 * @returns {{sprite: string, w: number, h: number}|null}
 */
export function getBombLook(inst, index) {
  ensureSprites(inst)
  return inst.trees[index]?.sprites?.bomb ?? null
}

/**
 * Draws every tree above the ground line, rocking round its foot.
 * @param {Object} inst - Bomb tree inst
 * @param {number} [opacity=1] - Reveal fade
 * @param {{x1: number, x2: number}|null} [view=null] - Visible world X range for culling
 */
export function onDrawTrees(inst, opacity = 1, view = null) {
  ensureSprites(inst)
  const k = inst.k
  inst.trees.forEach(tree => {
    const s = tree.sprites?.crown
    if (!s || !inView(tree.x - s.w, tree.x + s.w, view)) return
    k.drawSprite({
      sprite: s.sprite,
      pos: k.vec2(tree.x, tree.groundY + GROUND_TUCK),
      anchor: k.vec2(s.anchorX, 1),
      angle: shakeAngle(tree) * RAD_TO_DEG,
      opacity
    })
    const p = tree.plants
    p && k.drawSprite({ sprite: p.sprite, pos: k.vec2(tree.x + p.dx, tree.groundY + p.dy), opacity })
  })
}

/**
 * Draws every tree's roots under the ground line.
 * @param {Object} inst - Bomb tree inst
 * @param {number} [opacity=1] - Reveal fade
 * @param {{x1: number, x2: number}|null} [view=null] - Visible world X range for culling
 */
export function onDrawRoots(inst, opacity = 1, view = null) {
  ensureSprites(inst)
  const k = inst.k
  inst.trees.forEach(tree => {
    const s = tree.sprites?.roots
    if (!s) return
    const x = tree.x - s.footX
    inView(x, x + s.w, view) && k.drawSprite({ sprite: s.sprite, pos: k.vec2(x, tree.groundY - GROUND_TUCK), opacity })
  })
}
//
// Hands the trees their sprites once the sheet is there.
//
function ensureSprites(inst) {
  if (inst.trees[0]?.sprites) return
  const baked = bakeSprites(inst.k)
  baked && inst.trees.forEach((tree, i) => {
    tree.sprites = baked[tree.lookIndex]
    tree.plants = footPlants(inst.k, tree, i)
  })
}
//
// The greens over one tree's foot, baked once per live k and spot index.
//
function footPlants(k, tree, index) {
  let byIndex = plantsByK.get(k)
  byIndex || plantsByK.set(k, byIndex = new Map())
  const cached = byIndex.get(index)
  if (cached) return cached
  const seed = PLANTS_SEED + index * PLANTS_SEED_STEP
  const rng = createSeededRandom(seed)
  const half = tree.look.footHalfW * TREE_SCALE
  const mossy = forestGroundStones().filter(s => s.kind === STONE_KIND.MOSSY)
  const side = rng() < STONE_LEFT_SHARE ? -1 : 1
  const stone = mossy.length && rng() < STONE_CHANCE ? mossy[Math.floor(rng() * mossy.length)] : null
  const plants = bakeForestFootPlants(k, {
    name: `${SPRITE_PREFIX}-plants-${index}`,
    halfW: PLANTS_HALF_W,
    above: PLANTS_ABOVE,
    below: PLANTS_BELOW,
    seed,
    ferns: [
      { x: -half - FERN_OUTER_GAP, size: FERN_OUTER_SIZE },
      { x: half + FERN_OUTER_GAP, size: FERN_OUTER_SIZE },
      { x: -half * FERN_INNER_SHARE, size: FERN_INNER_SIZE },
      { x: half * FERN_INNER_SHARE, size: FERN_INNER_SIZE }
    ],
    tufts: { from: -half - TUFT_OVERHANG, to: half + TUFT_OVERHANG, step: TUFT_STEP },
    stones: stone ? [{
      x: side * (half + STONE_GAP),
      canvas: stone.canvas,
      w: STONE_W,
      h: STONE_W * stone.canvas.height / stone.canvas.width
    }] : []
  })
  byIndex.set(index, plants)
  return plants
}
//
// Every picture's tree, roots and bomb as sprites, graded and grained like
// the forest's baked material; once per live k (null until the sheet has
// loaded).
//
function bakeSprites(k) {
  if (!sheet) return null
  const cached = bakedByK.get(k)
  if (cached) return cached
  const out = TREES.map((look, i) => {
    const crown = bakePart(k, look.crown, TREE_SCALE, `${i}-crown`)
    const roots = bakePart(k, look.roots, TREE_SCALE, `${i}-roots`)
    const bomb = bakePart(k, look.bomb, BOMB_SCALE, `${i}-bomb`)
    return {
      crown: { ...crown, anchorX: ((look.footX - look.crown.x) / look.crown.w) * 2 - 1 },
      roots: { ...roots, footX: (look.rootsX - look.roots.x) * TREE_SCALE },
      bomb
    }
  })
  bakedByK.set(k, out)
  return out
}
//
// One part of the sheet as a graded, grained sprite at a scale.
//
function bakePart(k, rect, scale, id) {
  const canvas = cutPicture(sheet, rect, scale)
  applyForestLayerGradeToCanvas(canvas, {
    ...FOREST_LAYER_GRADE.material,
    grainBlockSize: forestFilmGrainBlockPxForTier('gameplay')
  }, GRAIN_SEED + rect.x)
  const sprite = `${SPRITE_PREFIX}-${id}`
  k.loadSprite(sprite, canvas)
  return { sprite, w: canvas.width, h: canvas.height }
}
//
// Current jolt swing of a tree (radians).
//
function shakeAngle(tree) {
  return TreeJolt.angle(tree.jolt, SHAKE_MAX_RAD)
}
//
// True when a world X span is (near) the visible range.
//
function inView(x1, x2, view) {
  return !view || !(x2 < view.x1 - VIEW_PAD || x1 > view.x2 + VIEW_PAD)
}
