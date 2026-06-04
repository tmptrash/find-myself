import { CFG, getConsciousnessColor, atmosphericDepthColor } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { parseHex } from '../../../utils/helper.js'

//
// Large muted heroes — bottom, top, and side margins; eyes track the playable hero
//
//
// Place heroes just behind the brain roots (rootsZ = wordPlayfieldFill + 0.5) so
// they appear as deep background silhouettes peeking through the transparent root gaps
//
const BG_HERO_BASE_Z = (CFG.visual.zIndex.wordPlayfieldFill ?? -90) + 0.4
const BG_HERO_COVER_Z = (CFG.visual.zIndex.player ?? 10) - 0.5
const BG_HERO_OPACITY = 0.55
//
// Extra depth boost makes heroes nearly match the playfield background color, so they
// read as a very subtle atmospheric layer rather than prominent silhouettes
//
const BG_HERO_COLOR_DEPTH_BOOST = 0.68
const BG_HERO_LOOK_Y_OFFSET = 52
const BG_HERO_UPSIDE_DOWN_LOOK_Y_OFFSET = -40
const DEFAULT_SIDE_WALL = 192
const HERO_HALF_W_AT_SCALE = 38
const HERO_HALF_H_AT_SCALE = 48
const HERO_COLLISION_PAD = 36
const SIDE_BODY_INSET = 48
const UPSIDE_DOWN_ANGLE = 180
//
// Extra pixels to sink bottom-edge heroes below the floor cover rect — shows heads and shoulders only
//
const BG_HERO_BOTTOM_SINK = 36
//
// Candidate slots — positions resolved with overlap rejection (largest placed first)
//
const BG_HERO_SLOT_DEFS = [
  { edge: 'bottom', xRatio: 0.5, scale: 5.4, depth: 0.2 },
  { edge: 'bottom', xRatio: 0.2, scale: 4.4, depth: 0.26 },
  { edge: 'bottom', xRatio: 0.90, scale: 4.4, depth: 0.26 },
  { edge: 'top', xRatio: 0.26, scale: 3.8, depth: 0.58 },
  { edge: 'top', xRatio: 0.74, scale: 3.6, depth: 0.62 },
  { edge: 'left', yRatio: 0.5, scale: 3.2, depth: 0.68 },
  { edge: 'right', yRatio: 0.5, scale: 3.0, depth: 0.66 }
]

/**
 * Spawns large background heroes with eye tracking on bottom, top, and sides
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {Object} config.hero - Playable hero instance (look-at target)
 * @param {number} config.bottomPlatformHeight - Bottom platform height in pixels
 * @param {number} config.topPlatformHeight - Top platform height in pixels
 * @param {number} [config.sideWallWidth] - Play area side margin
 * @param {string} [config.playfieldColor] - Playfield fill hex for depth blending
 * @returns {Object} Background heroes instance
 */
export function create(config) {
  const {
    k,
    hero,
    bottomPlatformHeight,
    topPlatformHeight,
    sideWallWidth = DEFAULT_SIDE_WALL,
    playfieldColor,
    platformColor
  } = config
  const inst = { k, hero, entries: [] }
  if (!hero) return inst
  const floorY = k.height() - bottomPlatformHeight
  const topY = topPlatformHeight ?? 360
  const playLeft = sideWallWidth
  const playRight = k.width() - sideWallWidth
  const playWidth = playRight - playLeft
  const baseHeroHex = getConsciousnessColor('foregroundSilhouette')
  const depthBgHex = playfieldColor ?? getConsciousnessColor('gameWorld')
  const placements = resolveNonOverlappingPlacements(
    BG_HERO_SLOT_DEFS,
    playLeft,
    playRight,
    playWidth,
    topY,
    floorY
  )
  placements.forEach(({ slot, x, y }) => {
    const bodyColor = atmosphericDepthColor(baseHeroHex, depthBgHex, Math.min(1, slot.depth + BG_HERO_COLOR_DEPTH_BOOST))
    const upsideDown = slot.edge === 'top'
    const bgHero = Hero.create({
      k,
      x,
      y,
      type: Hero.HEROES.HERO,
      controllable: false,
      ambient: true,
      bodyColor,
      scale: slot.scale,
      isStatic: true,
      idleVocalization: null
    })
    bgHero.character.z = BG_HERO_BASE_Z - slot.depth * 0.06
    bgHero.character.opacity = BG_HERO_OPACITY
    upsideDown && (bgHero.character.angle = UPSIDE_DOWN_ANGLE)
    slot.edge === 'left' && (bgHero.character.flipX = true)
    inst.entries.push({ bgHero, edge: slot.edge, upsideDown })
  })
  spawnPlatformCoverRects(k, floorY, topY, sideWallWidth, platformColor)
  k.onUpdate(() => onUpdate(inst))
  return inst
}

//
// Places heroes largest-first and rejects positions that overlap prior ones
//
function resolveNonOverlappingPlacements(slots, playLeft, playRight, playWidth, topY, floorY) {
  const sorted = [...slots].sort((a, b) => b.scale - a.scale)
  const placed = []
  const results = []
  sorted.forEach(slot => {
    const candidates = buildCandidatePoints(slot, playLeft, playRight, playWidth, topY, floorY)
    const radius = heroCollisionRadius(slot.scale)
    for (const point of candidates) {
      if (!overlapsAny(point.x, point.y, radius, placed)) {
        placed.push({ x: point.x, y: point.y, radius })
        results.push({ slot, x: point.x, y: point.y })
        return
      }
    }
  })
  return results
}

//
// Hero collision disc from scale
//
function heroCollisionRadius(scale) {
  return Math.max(HERO_HALF_W_AT_SCALE, HERO_HALF_H_AT_SCALE) * scale + HERO_COLLISION_PAD
}

//
// True when a candidate center sits inside another hero disc
//
function overlapsAny(x, y, radius, placed) {
  return placed.some(p => {
    const dx = x - p.x
    const dy = y - p.y
    return Math.sqrt(dx * dx + dy * dy) < radius + p.radius
  })
}

//
// Preferred anchor plus horizontal nudge candidates per edge
//
function buildCandidatePoints(slot, playLeft, playRight, playWidth, topY, floorY) {
  const nudgeSteps = [-0.14, -0.08, 0, 0.08, 0.14]
  const points = []
  if (slot.edge === 'bottom') {
    nudgeSteps.forEach(nudge => {
      points.push({
        x: playLeft + playWidth * Math.min(0.92, Math.max(0.08, slot.xRatio + nudge)),
        y: centerYHalfBodyBelowFloor(floorY, slot.scale)
      })
    })
    return points
  }
  if (slot.edge === 'top') {
    nudgeSteps.forEach(nudge => {
      points.push({
        x: playLeft + playWidth * Math.min(0.9, Math.max(0.1, slot.xRatio + nudge)),
        y: centerYHalfBodyAboveCeiling(topY, slot.scale)
      })
    })
    return points
  }
  if (slot.edge === 'left') {
    return [{ x: playLeft + SIDE_BODY_INSET, y: centerYHalfBodyBelowFloor(floorY, slot.scale) }]
  }
  return [{ x: playRight - SIDE_BODY_INSET, y: centerYSideInPlayfield(slot, topY, floorY) }]
}

//
// Side watchers — vertical position from slot yRatio inside playfield
//
function centerYSideInPlayfield(slot, topY, floorY) {
  return topY + (floorY - topY) * (slot.yRatio ?? 0.5)
}

//
// Center sunk below the floor cover so only the upper torso and head peek into the playfield
//
function centerYHalfBodyBelowFloor(floorY, scale) {
  return floorY + BG_HERO_BOTTOM_SINK
}

//
// Upside-down — feet on the ceiling line, half hidden in the top platform strip
//
function centerYHalfBodyAboveCeiling(topY, scale) {
  return topY + HERO_HALF_H_AT_SCALE * scale
}

//
// Eyes aim at the playable hero — inverted offset when hanging upside down
//
function onUpdate(inst) {
  const target = inst.hero?.character?.pos
  if (!target) return
  for (const entry of inst.entries) {
    const yOff = entry.upsideDown ? BG_HERO_UPSIDE_DOWN_LOOK_Y_OFFSET : BG_HERO_LOOK_Y_OFFSET
    Hero.setLookAtPos(entry.bgHero, { x: target.x, y: target.y + yOff })
  }
}

//
// Cover rects over all platform bands — bottom included to clip hero feet
// Pit fill z (player - 0.3) sits above cover z (player - 0.5), so pit shows purple, not platform
//
function spawnPlatformCoverRects(k, floorY, topY, sideWallWidth, platformColor) {
  const hex = platformColor ?? CFG.visual.colors.platform
  const [r, g, b] = parseHex(hex)
  const screenW = k.width()
  const screenH = k.height()
  const addRect = (x, y, w, h) => k.add([
    k.rect(w, h),
    k.pos(x, y),
    k.color(r, g, b),
    k.z(BG_HERO_COVER_Z),
    k.fixed()
  ])
  addRect(0, floorY, screenW, screenH - floorY)
  addRect(0, 0, screenW, topY)
  addRect(0, 0, sideWallWidth, screenH)
  addRect(screenW - sideWallWidth, 0, sideWallWidth, screenH)
}
