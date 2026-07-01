import { CFG } from '../cfg.js'
import { toCanvas } from '../../../utils/helper.js'
import { loadTouchSprite } from '../../../utils/touch-sprite-registry.js'
import { buildRockVertices, buildRockPalette, drawRockToCanvas } from '../../../utils/draw-rock.js'

const TOUCH_FLOOR_ROCK_COUNT_DEFAULT = 5
const TOUCH_FLOOR_ROCK_RADIUS_MIN = 38
const TOUCH_FLOOR_ROCK_RADIUS_MAX = 92
const TOUCH_FLOOR_ROCK_CLUSTER_CHANCE = 0.55
const TOUCH_FLOOR_ROCK_SATELLITES_MIN = 1
const TOUCH_FLOOR_ROCK_SATELLITES_MAX = 2
const TOUCH_FLOOR_ROCK_SAT_RADIUS_RATIO_MIN = 0.42
const TOUCH_FLOOR_ROCK_SAT_RADIUS_RATIO_MAX = 0.82

/**
 * Procedural floor rocks for touch-section scenes (shared silhouette pipeline with L0).
 *
 * @param {Object} k - Kaplay instance
 * @param {Object} opts - Placement / drawing options
 * @param {number} opts.floorY - World Y of floor line
 * @param {number} opts.leftMargin - Playfield left inset
 * @param {number} opts.rightMargin - Playfield right inset
 * @param {number} opts.drawZ - Draw layer z-index
 * @param {string} opts.spritePrefix - Unique sprite name prefix (per scene)
 * @param {number} [opts.rockCount] - Override rock count
 * @param {number} [opts.excludeCenterX] - Optional horizontal center to keep clear
 * @param {number} [opts.excludeHalfWidth] - Half-width of exclusion corridor (px)
 * @returns {Array<Object>} Rock descriptors (worldX, radius, etc.)
 */
export function addTouchSectionFloorRocks(k, opts) {
  const {
    floorY,
    leftMargin,
    rightMargin,
    drawZ,
    spritePrefix,
    rockCount = TOUCH_FLOOR_ROCK_COUNT_DEFAULT,
    excludeCenterX,
    excludeHalfWidth,
    //
    // Additional exclusion zones: [{centerX, halfWidth}, ...]
    //
    excludeZones = []
  } = opts
  //
  // Merge legacy single-zone params with the array for a unified check
  //
  const allZones = [...excludeZones]
  if (excludeCenterX != null && excludeHalfWidth != null) {
    allZones.push({ centerX: excludeCenterX, halfWidth: excludeHalfWidth })
  }
  const isExcluded = (px) => allZones.some(z => Math.abs(px - z.centerX) < z.halfWidth)
  const playableW = CFG.visual.screen.width - leftMargin - rightMargin
  const rocks = []
  let spriteIdx = 0
  for (let i = 0; i < rockCount; i++) {
    const radius = TOUCH_FLOOR_ROCK_RADIUS_MIN + Math.random() * (TOUCH_FLOOR_ROCK_RADIUS_MAX - TOUCH_FLOOR_ROCK_RADIUS_MIN)
    let posX = leftMargin + 40 + Math.random() * (playableW - 80)
    let safety = 0
    while (isExcluded(posX) && safety < 35) {
      posX = leftMargin + 40 + Math.random() * (playableW - 80)
      safety++
    }
    const mainRock = buildSingleFloorRock(k, floorY, posX, radius, `${spritePrefix}-${spriteIdx++}`)
    rocks.push(mainRock)
    if (Math.random() < TOUCH_FLOOR_ROCK_CLUSTER_CHANCE) {
      const satCount = TOUCH_FLOOR_ROCK_SATELLITES_MIN + Math.floor(Math.random() * (TOUCH_FLOOR_ROCK_SATELLITES_MAX - TOUCH_FLOOR_ROCK_SATELLITES_MIN + 1))
      for (let s = 0; s < satCount; s++) {
        const ratio = TOUCH_FLOOR_ROCK_SAT_RADIUS_RATIO_MIN + Math.random() * (TOUCH_FLOOR_ROCK_SAT_RADIUS_RATIO_MAX - TOUCH_FLOOR_ROCK_SAT_RADIUS_RATIO_MIN)
        const satRadius = radius * ratio
        const sign = Math.random() < 0.5 ? -1 : 1
        const horizontalGap = radius * 0.55 + satRadius * 0.4 + Math.random() * 8
        const satX = posX + sign * horizontalGap
        if (isExcluded(satX)) continue
        rocks.push(buildSingleFloorRock(k, floorY, satX, satRadius, `${spritePrefix}-${spriteIdx++}`))
      }
    }
  }
  rocks.forEach(r => loadTouchSprite(k, r.spriteName, r.dataUrl))
  k.add([
    k.z(drawZ),
    {
      draw() {
        for (const rock of rocks) {
          k.drawSprite({ sprite: rock.spriteName, pos: k.vec2(rock.x, rock.y) })
        }
      }
    }
  ])
  return rocks
}

/**
 * Creates a single floor rock at a specific X position and adds it to the scene.
 * Used to place a dedicated perch rock at a fixed location (e.g. for a crow).
 * @param {Object} k - Kaplay instance
 * @param {number} floorY - Y coordinate of the floor
 * @param {number} posX - Horizontal center of the rock
 * @param {string} spriteName - Unique sprite name for the rock
 * @param {number} drawZ - z-index for drawing
 * @param {number} [radius] - Optional fixed radius (px)
 * @param {boolean} [anchorBottom=false] - Align sprite bottom to floorY (no overlap below horizon)
 * @returns {Object} Rock descriptor (worldX, radius, etc.)
 */
export function addSingleFloorRockAt(k, floorY, posX, spriteName, drawZ, radius, anchorBottom = false) {
  const rockRadius = radius ?? TOUCH_FLOOR_ROCK_RADIUS_MIN + Math.random() * (TOUCH_FLOOR_ROCK_RADIUS_MAX - TOUCH_FLOOR_ROCK_RADIUS_MIN) * 0.45
  const rock = buildSingleFloorRock(k, floorY, posX, rockRadius, spriteName)
  anchorBottom && (rock.y = floorY - rock.totalH)
  loadTouchSprite(k, rock.spriteName, rock.dataUrl)
  k.add([
    k.z(drawZ),
    {
      draw() {
        k.drawSprite({ sprite: rock.spriteName, pos: k.vec2(rock.x, rock.y) })
      }
    }
  ])
  return rock
}
function buildSingleFloorRock(k, floorY, posX, radius, spriteName) {
  //
  // Rock silhouette + palette come from the shared `draw-rock`
  // primitive (`src/utils/draw-rock.js`) so floor rocks paint identical
  // to the L0 main rocks and the menu/ready background composite.
  //
  const verts = buildRockVertices(radius)
  const palette = buildRockPalette()
  const totalW = Math.ceil(radius * 2.6)
  const totalH = Math.ceil(radius * 1.9)
  const cx = totalW / 2
  const cy = totalH * 0.56
  const dataUrl = toCanvas({ width: totalW, height: totalH, pixelRatio: 1 }, (ctx) => {
    drawRockToCanvas(ctx, { cx, cy, radius, verts, palette })
  })
  //
  // Lift every rock a couple of pixels off the floor line — previously
  // the small random downward jitter let stones bite into / sit below
  // the grass line, making them read as half-buried instead of resting
  // on the ground. Keeps the visual variance via the random jitter,
  // just shifts the whole range up.
  //
  const ROCK_LIFT_FROM_FLOOR = 5
  const posY = floorY - totalH * 0.45 + Math.random() * 6 - ROCK_LIFT_FROM_FLOOR
  return { spriteName, dataUrl, x: posX, y: posY, totalW, totalH, radius, worldX: posX + cx - totalW / 2, worldY: posY + cy }
}
