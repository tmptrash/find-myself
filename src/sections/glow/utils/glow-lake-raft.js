import { CFG } from '../../../cfg.js'
import { generateLogDetail, drawLogPlatform } from '../../touch/utils/log-platform.js'
import { GLOW_PAL, glowRgb, isGlowGrayWorld } from './glow-palette.js'
import { applyGlowFilmGrainToCanvas } from './glow-parallax-grain.js'

//
// Small log raft over the left lake (where the W log used to sit) — bobs with
// the same wave phase as the baked water surface.
//
const LAKE_RAFT_X_FRAC = 0.34
const LAKE_RAFT_W = 96
const LAKE_RAFT_H = 12
//
// How many px of the log top stay above the water surface (rest is submerged).
//
const LAKE_RAFT_VISIBLE_ABOVE_SURFACE = 5
//
// Log sits under the lake fill (LAKE_Z = 12) so water hides its submerged
// part; glasses draw above the water so the lenses never get clipped.
//
const LAKE_RAFT_LOG_Z = 11.9
const LAKE_RAFT_GLASSES_Z = 12.35
//
// Lens bottom rests one pixel into the log's top bark.
//
const GLASSES_SINK_INTO_LOG = 1
//
// Baked sprite id for the raft prop (three-quarter horn rims + glass glints).
//
export const GLOW_LAKE_RAFT_GLASSES_SPRITE = 'glow-lake-raft-glasses-v10'
const GLASSES_SPRITE_NAME = GLOW_LAKE_RAFT_GLASSES_SPRITE
const GLASSES_BAKE_SEED = 0x6c616b65
const GLASSES_PIXEL_SCALE = 2
//
// Three-quarter view traced from the pixel reference: far temple curling
// back on the left, near lens big, far lens foreshortened on the right,
// far temple running over the top. F frame, D rim shade, L lens, G glint.
//
const GLASSES_PIXEL_GRID = [
  '..................DFFFFFFD..............',
  '.................FFFFFFFFFFFFD..........',
  '................FFFD...DFFFFFFFFFD......',
  '................FF..........DFFFFFFFFFD.',
  '...DFFD..........................DFFFFFF',
  '..FFFFFFFFD....................FFFDLGGDF',
  '.FFFFFFFFFFFFD.......DFFFFFFF.FFDLLGGLLF',
  'DFFD...DFFFFFFFF..DFFFDLLGGGLDFFLLLGGLLF',
  'FF.........DFFFFDFFFDLLLLGGGLLFFLLGGGLLF',
  '................DFFFLLLLGGGLLLFFLLGGLLDF',
  '..................FFLLLLGGGLLLFFDGGGLLF.',
  '..................FFLLLGGGLLLF..FFGLDF..',
  '..................DFLLLGGGLLLF....FFF...',
  '...................FDLGGGLLDF...........',
  '....................FFGGGDFF............',
  '.....................DFFFF..............'
]
const GLASSES_SPRITE_W = GLASSES_PIXEL_GRID[0].length * GLASSES_PIXEL_SCALE
const GLASSES_SPRITE_H = GLASSES_PIXEL_GRID.length * GLASSES_PIXEL_SCALE
//
// Same wood tones as letter logs on level0 (gray-lit vs colour world).
//
const LOG_TREE_LIT_COLORS = {
  bark: GLOW_PAL.treeLit.branch,
  barkLight: GLOW_PAL.treeLit.trunk,
  barkDark: GLOW_PAL.treeLit.root,
  ring: GLOW_PAL.treeLit.trunk,
  ringDark: GLOW_PAL.glowContour.platform,
  core: GLOW_PAL.treeLit.branch,
  shadow: GLOW_PAL.void
}
const LOG_TREE_COLOR_COLORS = {
  bark: GLOW_PAL.treeColor.root,
  barkLight: GLOW_PAL.treeColor.branch,
  barkDark: GLOW_PAL.treeColor.root,
  ring: GLOW_PAL.treeColor.trunk,
  ringDark: GLOW_PAL.glowContour.platform,
  core: GLOW_PAL.treeColor.branch,
  shadow: GLOW_PAL.void
}
const LOG_RAFT_GRAY_COLORS = {
  bark: GLOW_PAL.decorGray,
  barkLight: GLOW_PAL.decorGray,
  barkDark: GLOW_PAL.glowContour.platform,
  ring: GLOW_PAL.decorGray,
  ringDark: GLOW_PAL.glowContour.platform,
  core: GLOW_PAL.decorGray,
  shadow: GLOW_PAL.void
}

const logDetailCache = new Map()
const glassesSpriteReady = new WeakMap()

/**
 * World X for the lake raft (left lake, above the old W spot).
 * @param {number} lakeX1
 * @param {number} lakeX2
 * @returns {number}
 */
export function glowLakeRaftWorldX(lakeX1, lakeX2) {
  return lakeX1 + (lakeX2 - lakeX1) * LAKE_RAFT_X_FRAC
}

/**
 * Registers the bobbing raft log (under the water) and its glasses (above it).
 * @param {Object} k - Kaplay inst
 * @param {function(): Object|null} getLevelInst - Live glow level inst
 */
export function mountGlowLakeRaftLayer(k, getLevelInst) {
  k.add([
    k.z(LAKE_RAFT_LOG_Z),
    {
      draw() {
        drawGlowLakeRaftLog(k, getLevelInst())
      }
    }
  ])
  k.add([
    k.z(LAKE_RAFT_GLASSES_Z),
    {
      draw() {
        drawGlowLakeRaftGlasses(k, getLevelInst())
      }
    }
  ])
}

/**
 * Draws the half-submerged raft log at the current wave height.
 * @param {Object} k - Kaplay inst
 * @param {Object|null} inst - Glow level inst
 */
export function drawGlowLakeRaftLog(k, inst) {
  const raftTop = lakeRaftTopY(inst)
  if (raftTop == null) return
  const raftCy = raftTop + LAKE_RAFT_H * 0.5
  const detail = getLakeRaftLogDetail(LAKE_RAFT_W, LAKE_RAFT_H)
  drawLogPlatform(k, LAKE_RAFT_W, LAKE_RAFT_H, inst.lakeRaftX, raftCy, 1, detail, lakeRaftLogColors(inst))
}

/**
 * Draws the glasses resting on the raft log (always full palette tones).
 * @param {Object} k - Kaplay inst
 * @param {Object|null} inst - Glow level inst
 */
export function drawGlowLakeRaftGlasses(k, inst) {
  const raftTop = lakeRaftTopY(inst)
  if (raftTop == null) return
  const bottomY = raftTop + GLASSES_SINK_INTO_LOG
  drawLakeRaftGlassesSprite(k, inst.lakeRaftX, bottomY - GLASSES_SPRITE_H * 0.5)
}

//
// Top of the log in world space, or null while the lake is still closed.
//
function lakeRaftTopY(inst) {
  if (!inst?.zones?.water) return null
  if (inst.lakeX1 == null || inst.lakeX2 == null) return null
  if (typeof inst.lakeSurfaceAt !== 'function') return null
  inst.lakeRaftX ??= glowLakeRaftWorldX(inst.lakeX1, inst.lakeX2)
  return inst.lakeSurfaceAt(inst.lakeRaftX) - LAKE_RAFT_VISIBLE_ABOVE_SURFACE
}

function lakeRaftLogColors(inst) {
  if (isGlowGrayWorld(inst.zones)) return LOG_RAFT_GRAY_COLORS
  const fade = inst.colorFade ?? (inst.zones?.colorWorld ? 1 : 0)
  return fade > 0.5 ? LOG_TREE_COLOR_COLORS : LOG_TREE_LIT_COLORS
}

function getLakeRaftLogDetail(w, h) {
  const key = `${w}|${h}`
  if (!logDetailCache.has(key)) {
    logDetailCache.set(key, generateLogDetail(w, h, false))
  }
  return logDetailCache.get(key)
}

function drawLakeRaftGlassesSprite(k, cx, cy) {
  ensureLakeRaftGlassesSprite(k)
  k.drawSprite({
    sprite: GLASSES_SPRITE_NAME,
    pos: k.vec2(cx, cy),
    anchor: 'center'
  })
}

function ensureLakeRaftGlassesSprite(k) {
  if (glassesSpriteReady.get(k)) return
  const canvas = document.createElement('canvas')
  canvas.width = GLASSES_SPRITE_W
  canvas.height = GLASSES_SPRITE_H
  drawGlowLakeGlassesPixelArt(canvas.getContext('2d'))
  applyGlowFilmGrainToCanvas(canvas, GLASSES_BAKE_SEED)
  k.loadSprite(GLASSES_SPRITE_NAME, canvas)
  glassesSpriteReady.set(k, true)
}

function drawGlowLakeGlassesPixelArt(ctx) {
  const pal = GLOW_PAL.lakeGlasses
  const tones = {
    F: cssRgb(CFG.visual.colors.outline),
    D: cssRgb(pal.rim),
    L: cssRgb(pal.lens),
    G: cssRgb(pal.glint)
  }
  const scale = GLASSES_PIXEL_SCALE
  GLASSES_PIXEL_GRID.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const fill = tones[row[x]]
      if (!fill) continue
      ctx.fillStyle = fill
      ctx.fillRect(x * scale, y * scale, scale, scale)
    }
  })
}

function cssRgb(hex) {
  const c = glowRgb(hex)
  return `rgb(${c.r}, ${c.g}, ${c.b})`
}
