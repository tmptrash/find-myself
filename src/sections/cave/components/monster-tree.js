import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import * as Layout from '../utils/cave-layout.js'
//
// The level's monster tree: assets/tree.png drawn once per live k into the
// world (scaled and mirrored per Layout.TREE_PICTURE), drawn behind the
// hero. For each of its three big leaves the part nearer than the hero —
// from under his feet down to the bottom of the leaf's near lip — is cut
// into its own sprite and drawn over him.
// The picture starts loading with this module (game boot); a level opened
// before it is ready bakes it the moment it arrives.
//
const SPRITE_PREFIX = 'cave0-tree-v4'
const GRAIN_SEED = 9800
//
// A leaf's front cut reaches this far past its walking ends (the hero's
// half width and some) and this far below its lip line; the lip line is
// sampled every LIP_STEP px.
//
const FRONT_PAD = 40
const LIP_EXTRA = 4
const LIP_STEP = 8
//
// The front cut starts this far under the walking line (plus the leaf's
// walkDrop), so it never covers the hero's feet standing on it.
//
const FRONT_TOP_GAP = 2
const treeImage = loadImage(Layout.TREE_PICTURE.url)
const bakedByK = new WeakMap()

/**
 * Creates the tree (baked now if the picture is loaded, else once it is).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @returns {Object} Tree instance
 */
export function create(cfg) {
  const { k } = cfg
  const inst = { k, baked: bakedByK.get(k) ?? null }
  !inst.baked && treeImage.then(img => { img && (inst.baked = bake(k, img)) })
  return inst
}

/**
 * Draws the whole tree (behind the hero).
 * @param {Object} inst - Tree instance
 */
export function onDrawBack(inst) {
  const b = inst.baked
  b && inst.k.drawSprite({ sprite: b.back, pos: inst.k.vec2(b.x, b.y) })
}

/**
 * Draws the near parts of the leaves (over the hero).
 * @param {Object} inst - Tree instance
 */
export function onDrawFront(inst) {
  const b = inst.baked
  b && b.fronts.forEach(f => inst.k.drawSprite({ sprite: f.name, pos: inst.k.vec2(f.x, f.y) }))
}
//
// The picture as an image (null if it fails to load: the level then runs
// without the tree picture).
//
function loadImage(url) {
  const img = new Image()
  img.src = url
  return img.decode().then(() => img, () => null)
}
//
// Draw the tree at its world size and place, grain it, cut the leaf
// fronts out of it; once per live k.
//
function bake(k, img) {
  const cached = bakedByK.get(k)
  if (cached) return cached
  const t = Layout.TREE_PICTURE
  const w = Math.ceil(t.w * t.scale)
  const h = Math.ceil(t.h * t.scale)
  const a = Layout.treePoint(0, 0)
  const b = Layout.treePoint(t.w, t.h)
  const x = Math.round(Math.min(a.x, b.x))
  const y = Math.round(a.y)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.setTransform(t.mirror ? -t.scale : t.scale, 0, 0, t.scale, t.mirror ? w : 0, 0)
  ctx.drawImage(img, 0, 0, t.w, t.h)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  const back = `${SPRITE_PREFIX}-back`
  k.loadSprite(back, canvas)
  const fronts = Layout.PLANT_LEAVES.map(leaf => cutFront(k, canvas, x, y, leaf))
  const out = { back, x, y, fronts }
  bakedByK.set(k, out)
  return out
}
//
// The near part of one leaf (cut from the grained tree): from just under
// the hero's feet down to the lip line (a little lower), across the leaf's
// walking span and a pad.
//
function cutFront(k, src, srcX, srcY, leaf) {
  const x1 = Math.floor(leaf.x1 - FRONT_PAD)
  const x2 = Math.ceil(leaf.x2 + FRONT_PAD)
  const lip = []
  for (let x = x2; x >= x1; x -= LIP_STEP) lip.push({ x, y: lipYAt(leaf.lip, x) + LIP_EXTRA })
  lip.push({ x: x1, y: lipYAt(leaf.lip, x1) + LIP_EXTRA })
  const y1 = Math.ceil(leaf.y + leaf.walkDrop + FRONT_TOP_GAP)
  const y2 = Math.ceil(Math.max(...lip.map(p => p.y)))
  const canvas = document.createElement('canvas')
  canvas.width = x2 - x1
  canvas.height = Math.max(1, y2 - y1)
  const ctx = canvas.getContext('2d')
  ctx.translate(-x1, -y1)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y1)
  lip.forEach(p => ctx.lineTo(p.x, p.y))
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(src, srcX, srcY)
  const name = `${SPRITE_PREFIX}-front-${leaf.id}`
  k.loadSprite(name, canvas)
  return { name, x: x1, y: y1 }
}
//
// Height of a lip line (points sorted by x) at x, flat past its ends.
//
function lipYAt(lip, x) {
  if (x <= lip[0].x) return lip[0].y
  for (let i = 1; i < lip.length; i++) {
    const a = lip[i - 1]
    const b = lip[i]
    if (x <= b.x) return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x || 1)
  }
  return lip[lip.length - 1].y
}
