import { CFG } from '../cfg.js'
import { toCanvas } from '../../../utils/helper.js'

const TOUCH_FLOOR_ROCK_COUNT_DEFAULT = 5
const TOUCH_FLOOR_ROCK_RADIUS_MIN = 38
const TOUCH_FLOOR_ROCK_RADIUS_MAX = 92
const TOUCH_FLOOR_ROCK_BASE_R = 76
const TOUCH_FLOOR_ROCK_BASE_G = 76
const TOUCH_FLOOR_ROCK_BASE_B = 80
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
    excludeHalfWidth
  } = opts
  const playableW = CFG.visual.screen.width - leftMargin - rightMargin
  const rocks = []
  let spriteIdx = 0
  for (let i = 0; i < rockCount; i++) {
    const radius = TOUCH_FLOOR_ROCK_RADIUS_MIN + Math.random() * (TOUCH_FLOOR_ROCK_RADIUS_MAX - TOUCH_FLOOR_ROCK_RADIUS_MIN)
    let posX = leftMargin + 40 + Math.random() * (playableW - 80)
    let safety = 0
    while (
      excludeCenterX != null &&
      excludeHalfWidth != null &&
      Math.abs(posX - excludeCenterX) < excludeHalfWidth &&
      safety < 35
    ) {
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
        if (excludeCenterX != null && excludeHalfWidth != null && Math.abs(satX - excludeCenterX) < excludeHalfWidth) continue
        rocks.push(buildSingleFloorRock(k, floorY, satX, satRadius, `${spritePrefix}-${spriteIdx++}`))
      }
    }
  }
  rocks.forEach(r => k.loadSprite(r.spriteName, r.dataUrl))
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
 * @returns {Object} Rock descriptor (worldX, radius, etc.)
 */
export function addSingleFloorRockAt(k, floorY, posX, spriteName, drawZ) {
  const radius = TOUCH_FLOOR_ROCK_RADIUS_MIN + Math.random() * (TOUCH_FLOOR_ROCK_RADIUS_MAX - TOUCH_FLOOR_ROCK_RADIUS_MIN) * 0.45
  const rock = buildSingleFloorRock(k, floorY, posX, radius, spriteName)
  k.loadSprite(rock.spriteName, rock.dataUrl)
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
  const vertCount = 14 + Math.floor(Math.random() * 9)
  const verts = []
  for (let v = 0; v < vertCount; v++) {
    const t = v / vertCount
    const a = t * Math.PI * 2 + (Math.random() - 0.5) * 0.18
    const heavySide = Math.sin(a) > 0 ? 1.05 : 0.92
    const r = radius * (0.82 + Math.random() * 0.28) * heavySide
    verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.62 })
  }
  const tint = -8 + Math.floor(Math.random() * 24)
  const fillR = Math.max(0, Math.min(255, TOUCH_FLOOR_ROCK_BASE_R + tint))
  const fillG = Math.max(0, Math.min(255, TOUCH_FLOOR_ROCK_BASE_G + tint))
  const fillB = Math.max(0, Math.min(255, TOUCH_FLOOR_ROCK_BASE_B + tint + 4))
  const lightR = Math.max(0, Math.min(255, fillR + 32))
  const lightG = Math.max(0, Math.min(255, fillG + 32))
  const lightB = Math.max(0, Math.min(255, fillB + 32))
  const darkR = Math.max(0, Math.min(255, fillR - 28))
  const darkG = Math.max(0, Math.min(255, fillG - 28))
  const darkB = Math.max(0, Math.min(255, fillB - 28))
  const totalW = Math.ceil(radius * 2.6)
  const totalH = Math.ceil(radius * 1.9)
  const cx = totalW / 2
  const cy = totalH * 0.56
  const traceOutline = (ctx) => {
    ctx.beginPath()
    const v0 = verts[0]
    ctx.moveTo(cx + v0.x, cy + v0.y)
    for (let v = 0; v < verts.length; v++) {
      const cur = verts[v]
      const next = verts[(v + 1) % verts.length]
      const midX = cx + (cur.x + next.x) / 2
      const midY = cy + (cur.y + next.y) / 2
      ctx.quadraticCurveTo(cx + cur.x, cy + cur.y, midX, midY)
    }
    ctx.closePath()
  }
  const dataUrl = toCanvas({ width: totalW, height: totalH, pixelRatio: 1 }, (ctx) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
    ctx.beginPath()
    ctx.ellipse(cx, cy + radius * 0.42, radius * 1.0, radius * 0.18, 0, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fill()
    const grad = ctx.createLinearGradient(0, cy - radius * 0.7, 0, cy + radius * 0.7)
    grad.addColorStop(0, `rgb(${lightR}, ${lightG}, ${lightB})`)
    grad.addColorStop(0.55, `rgb(${fillR}, ${fillG}, ${fillB})`)
    grad.addColorStop(1, `rgb(${darkR}, ${darkG}, ${darkB})`)
    ctx.fillStyle = grad
    traceOutline(ctx)
    ctx.fill()
    ctx.save()
    traceOutline(ctx)
    ctx.clip()
    const blotchCount = 6 + Math.floor(Math.random() * 6)
    for (let b = 0; b < blotchCount; b++) {
      const bx = cx + (Math.random() - 0.5) * radius * 1.4
      const by = cy + (Math.random() - 0.5) * radius * 0.9
      const br = radius * (0.08 + Math.random() * 0.18)
      const lighter = Math.random() < 0.5
      const a = 0.06 + Math.random() * 0.08
      ctx.fillStyle = lighter
        ? `rgba(255, 255, 255, ${a})`
        : `rgba(0, 0, 0, ${a + 0.02})`
      ctx.beginPath()
      ctx.ellipse(bx, by, br, br * (0.6 + Math.random() * 0.4), Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
    ctx.beginPath()
    ctx.ellipse(cx - radius * 0.32, cy - radius * 0.28, radius * 0.55, radius * 0.18, -0.45, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
    ctx.beginPath()
    ctx.ellipse(cx, cy + radius * 0.34, radius * 0.78, radius * 0.18, 0, 0, Math.PI)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.lineWidth = 1.4
    traceOutline(ctx)
    ctx.stroke()
  })
  const posY = floorY - totalH * 0.45 + Math.random() * 6
  return { spriteName, dataUrl, x: posX, y: posY, totalW, totalH, radius, worldX: posX + cx - totalW / 2, worldY: posY + cy }
}
