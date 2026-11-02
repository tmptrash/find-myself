import { FOREST_LAYER_GRADE, applyForestLayerGradeToCanvas } from './forest-parallax-grain.js'
import { forestFilmGrainBlockPxForTier } from './forest-pixel-density.js'
import { clearPictureRect, cutPicture, loadPictureImage } from './forest-picture.js'
import { isWorldSpanInView } from './forest-static-bake.js'
import { bakeForestFootPlants } from './forest-foot-plants.js'
import { STONE_KIND, forestGroundStones } from './forest-stones.js'
//
// The right big tree (shore accent left of the chain-buoy eyes), cut from
// assets/forest/right-tree.png: the tree above ground stands on the ground line, its roots go under it, and
// its long branch to the right is the one the hero lands on after the
// leftmost stalk-eye. The picture is scaled so that branch's top sits where
// the layout wants the landing; the level builds the branch platform from
// treeData.horizBranch. The broken branch on the picture is the one that
// falls from it (forest-horiz-fall-twig.js). Stones, mushrooms, ferns and
// grass hide the seam where the trunk meets its roots. The picture starts
// loading with this module (game boot); sprites are baked once per live k.
//
const URL = 'forest/right-tree.png'
const SPRITE_PREFIX = 'forest0-right-tree-v5'
const GRAIN_SEED = 7700
const SHORE_TREE_LEFT_OF_EYE = 175
const SHORE_TREE_BRANCH_ABOVE_EYE = 96
const SHORE_TREE_STALK_EYE_RADIUS = 11
const SHORE_TREE_FIRST_EYE_ROLE = 'chainTrampFirst'
//
// Parts of the picture (px): the tree above ground (FOOT_Y: its trunk's
// bottom row, FOOT_X: the trunk's middle there, FOOT_HALF_W: half its width
// there) and its roots (ROOTS_X: the middle of their top).
//
const CROWN = { x: 182, y: 13, w: 620, h: 988 }
const FOOT_X = 391
const FOOT_Y = 994
const FOOT_HALF_W = 63
const ROOTS = { x: 640, y: 551, w: 809, h: 384 }
const ROOTS_X = 1049
//
// The roots' left part reaches into the tree's rect under its crown; that
// corner holds nothing else and is wiped out of the tree.
//
const CROWN_CLEAR = { x: 636, y: 540, w: 166, h: 461 }
//
// The landing branch on the picture: its flat top from the trunk to the
// leafy tip; its middle line lies BRANCH_HALF_W world px under that top.
//
const BRANCH = { x1: 440, x2: 600, y: 240 }
const BRANCH_HALF_W = 4
//
// The broken branch on the picture: its rect, the point on its stick's
// middle line under the cut stump and the stick's end at the leaves (the
// stick's axis runs between the two; the stump rises above the first).
//
const FALL_TWIG = { x: 890, y: 300, w: 196, h: 114 }
const FALL_TWIG_CUT = { x: 910, y: 332 }
const FALL_TWIG_AXIS_END = { x: 1025, y: 382 }
//
// The trunk's foot and the roots' top overlap the ground line by this much.
//
const GROUND_TUCK = 2
const CULL_PAD = 40
//
// Greens over the trunk's foot (world px from the foot): ferns on both
// flanks and over the trunk, a mossy stone on either side, mushrooms and a
// row of grass tufts across the seam.
//
const PLANTS_HALF_W = 92
const PLANTS_ABOVE = 56
const PLANTS_BELOW = 10
const PLANTS_SEED = 7760
const PLANT_FERN_OUTER_GAP = 10
const PLANT_FERN_OUTER_SIZE = 34
const PLANT_FERN_INNER_SHARE = 0.4
const PLANT_FERN_INNER_SIZE = 24
const PLANT_STONE_GAP = 26
const PLANT_STONE_W = [30, 24]
const PLANT_STONE_PICK_STEP = 3
const PLANT_MUSH_GAP = 46
const PLANT_SPOTTED_SHARE = 0.75
const PLANT_TUFT_OVERHANG = 20
const PLANT_TUFT_STEP = 7
const picture = loadPictureImage(URL)
const bakedByK = new WeakMap()
let sheet = null

/**
 * Places the shore tree left of the first stalk-eye so its horizontal branch
 * sits above that eye — the landing after the eye-to-eye bounce.
 * @param {Array<Object>} buoySpots - Chain-buoy spot list
 * @param {number} floorY - Ground line Y
 * @returns {{ x: number, groundY: number, branchAttachY: number }|null}
 */
export function buildForestShoreTreeLayout(buoySpots, floorY) {
  const leftEye = buoySpots?.find(s => s.chainTrampRole === SHORE_TREE_FIRST_EYE_ROLE) ??
    buoySpots?.filter(s => !s.prizeEye).reduce((best, s) => (!best || s.x < best.x ? s : best), null)
  if (!leftEye) return null
  const eyeTopY = leftEye.groundY - leftEye.segmentCount * leftEye.segmentLen - SHORE_TREE_STALK_EYE_RADIUS
  return {
    x: leftEye.x - SHORE_TREE_LEFT_OF_EYE,
    groundY: floorY,
    branchAttachY: eyeTopY - SHORE_TREE_BRANCH_ABOVE_EYE
  }
}

/**
 * Waits for the tree picture (once per page).
 * @returns {Promise<void>}
 */
export async function loadForestShoreTree() {
  sheet ??= await picture
}

/**
 * Creates the shore tree: its scale (branch top on the landing line), its
 * landing branch for the level and its sprites (baked once per live k;
 * nothing is drawn until loadForestShoreTree() has resolved).
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {Object} cfg.layout - Result of buildForestShoreTreeLayout()
 * @returns {Object} Shore-tree inst (treeData.horizBranch: the landing branch)
 */
export function create(cfg) {
  const { k, layout } = cfg
  const branchTopY = layout.branchAttachY - BRANCH_HALF_W
  const scale = (layout.groundY - branchTopY) / (FOOT_Y - BRANCH.y)
  const x1 = Math.round(layout.x + (BRANCH.x1 - FOOT_X) * scale)
  const x2 = Math.round(layout.x + (BRANCH.x2 - FOOT_X) * scale)
  const y = Math.round(branchTopY)
  const horizBranch = { x1, x2, y: layout.branchAttachY, physY: y, w: BRANCH_HALF_W * 2, platSegs: [{ x1, x2, y }] }
  const inst = { k, x: layout.x, groundY: layout.groundY, scale, treeData: { horizBranch } }
  bakeSprites(inst)
  return inst
}

/**
 * The broken branch's sprite for forest-horiz-fall-twig.js: its stick's
 * middle line runs along +X from under the cut stump, which is its anchor
 * (Kaplay anchor units), at the length the twig module expects.
 * @param {Object} inst - Shore-tree inst
 * @param {number} stickLen - World length of the stick from its cut end
 * @returns {{sprite: string, anchorX: number, anchorY: number}|null}
 */
export function fallTwigLook(inst, stickLen) {
  return sheet ? bakeFallTwig(inst.k, stickLen) : null
}

/**
 * Draws the shore tree: its roots under the ground line, the tree above and
 * the greens over the seam between them.
 * @param {Object} inst - Shore-tree inst
 * @param {number} [opacity=1] - Reveal fade
 * @param {{x1: number, x2: number}|null} [view=null] - Camera cull span
 */
export function onDraw(inst, opacity = 1, view = null) {
  const baked = bakeSprites(inst)
  if (!baked) return
  const k = inst.k
  const { crown, roots, plants } = baked
  isWorldSpanInView(roots.x - CULL_PAD, roots.x + roots.w + CULL_PAD, view) &&
    k.drawSprite({ sprite: roots.sprite, pos: k.vec2(roots.x, roots.y), opacity })
  if (!isWorldSpanInView(crown.x - CULL_PAD, crown.x + crown.w + CULL_PAD, view)) return
  k.drawSprite({ sprite: crown.sprite, pos: k.vec2(crown.x, crown.y), opacity })
  k.drawSprite({ sprite: plants.sprite, pos: k.vec2(inst.x + plants.dx, inst.groundY + plants.dy), opacity })
}
//
// The tree's and the roots' sprites with their world top-left and the greens
// over the trunk's foot, graded and grained like the forest's baked
// material; once per live k (null until the picture has loaded).
//
function bakeSprites(inst) {
  if (!sheet) return null
  const cached = bakedByK.get(inst.k)
  if (cached) return cached
  const s = inst.scale
  const crown = bakePart(inst.k, CROWN, s, 'crown', CROWN_CLEAR)
  const roots = bakePart(inst.k, ROOTS, s, 'roots')
  const out = {
    crown: { ...crown, x: Math.round(inst.x - (FOOT_X - CROWN.x) * s), y: Math.round(inst.groundY + GROUND_TUCK - (FOOT_Y - CROWN.y) * s) },
    roots: { ...roots, x: Math.round(inst.x - (ROOTS_X - ROOTS.x) * s), y: inst.groundY - GROUND_TUCK },
    plants: bakeFootPlants(inst.k, FOOT_HALF_W * s)
  }
  bakedByK.set(inst.k, out)
  return out
}
//
// Ferns, mossy stones, mushrooms and grass over the trunk's foot (half: half
// the trunk's width there).
//
function bakeFootPlants(k, half) {
  const mossy = forestGroundStones().filter(stone => stone.kind === STONE_KIND.MOSSY)
  const stones = mossy.length ? PLANT_STONE_W.map((w, i) => {
    const stone = mossy[(i * PLANT_STONE_PICK_STEP) % mossy.length]
    const side = i === 0 ? -1 : 1
    return { x: side * (half + PLANT_STONE_GAP), canvas: stone.canvas, w, h: w * stone.canvas.height / stone.canvas.width }
  }) : []
  return bakeForestFootPlants(k, {
    name: `${SPRITE_PREFIX}-plants`,
    halfW: PLANTS_HALF_W,
    above: PLANTS_ABOVE,
    below: PLANTS_BELOW,
    seed: PLANTS_SEED,
    ferns: [
      { x: -half - PLANT_FERN_OUTER_GAP, size: PLANT_FERN_OUTER_SIZE },
      { x: half + PLANT_FERN_OUTER_GAP, size: PLANT_FERN_OUTER_SIZE },
      { x: -half * PLANT_FERN_INNER_SHARE, size: PLANT_FERN_INNER_SIZE },
      { x: half * PLANT_FERN_INNER_SHARE, size: PLANT_FERN_INNER_SIZE }
    ],
    stones,
    mushrooms: [-half - PLANT_MUSH_GAP],
    spotted: [half * PLANT_SPOTTED_SHARE],
    tufts: { from: -half - PLANT_TUFT_OVERHANG, to: half + PLANT_TUFT_OVERHANG, step: PLANT_TUFT_STEP }
  })
}
//
// The broken branch turned so its stick runs along +X from the cut end,
// scaled so the stick is stickLen long, graded and grained; once per live k.
//
function bakeFallTwig(k, stickLen) {
  const baked = bakedByK.get(k)
  if (baked?.twig) return baked.twig
  const ax = FALL_TWIG_AXIS_END.x - FALL_TWIG_CUT.x
  const ay = FALL_TWIG_AXIS_END.y - FALL_TWIG_CUT.y
  const s = stickLen / Math.hypot(ax, ay)
  const turn = -Math.atan2(ay, ax)
  const corners = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([u, v]) => {
    const px = (FALL_TWIG.x + u * FALL_TWIG.w - FALL_TWIG_CUT.x) * s
    const py = (FALL_TWIG.y + v * FALL_TWIG.h - FALL_TWIG_CUT.y) * s
    return { x: px * Math.cos(turn) - py * Math.sin(turn), y: px * Math.sin(turn) + py * Math.cos(turn) }
  })
  const minX = Math.floor(Math.min(...corners.map(c => c.x)))
  const minY = Math.floor(Math.min(...corners.map(c => c.y)))
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(Math.max(...corners.map(c => c.x))) - minX
  canvas.height = Math.ceil(Math.max(...corners.map(c => c.y))) - minY
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(-minX, -minY)
  ctx.rotate(turn)
  ctx.scale(s, s)
  ctx.drawImage(sheet, FALL_TWIG.x, FALL_TWIG.y, FALL_TWIG.w, FALL_TWIG.h,
    FALL_TWIG.x - FALL_TWIG_CUT.x, FALL_TWIG.y - FALL_TWIG_CUT.y, FALL_TWIG.w, FALL_TWIG.h)
  applyForestLayerGradeToCanvas(canvas, {
    ...FOREST_LAYER_GRADE.material,
    grainBlockSize: forestFilmGrainBlockPxForTier('gameplay')
  }, GRAIN_SEED + FALL_TWIG.x)
  const sprite = `${SPRITE_PREFIX}-fall-twig`
  k.loadSprite(sprite, canvas)
  const twig = { sprite, anchorX: -minX / canvas.width * 2 - 1, anchorY: -minY / canvas.height * 2 - 1 }
  baked && (baked.twig = twig)
  return twig
}
//
// One part of the picture as a graded, grained sprite at a scale (minus an
// optional wiped rect of the picture).
//
function bakePart(k, rect, scale, id, clear = null) {
  const canvas = cutPicture(sheet, rect, scale)
  clear && clearPictureRect(canvas, rect, clear, scale)
  applyForestLayerGradeToCanvas(canvas, {
    ...FOREST_LAYER_GRADE.material,
    grainBlockSize: forestFilmGrainBlockPxForTier('gameplay')
  }, GRAIN_SEED + rect.x)
  const sprite = `${SPRITE_PREFIX}-${id}`
  k.loadSprite(sprite, canvas)
  return { sprite, w: canvas.width, h: canvas.height }
}
