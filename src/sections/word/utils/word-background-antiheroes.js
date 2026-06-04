import { CFG, getConsciousnessColor, atmosphericDepthColor } from '../cfg.js'
import * as Hero from '../../../components/hero.js'

//
// Distant slow-walking anti-heroes — depth via color blend toward playfield
//
const BG_ANTIH_Z = (CFG.visual.zIndex.wordPlayfieldFill ?? -90) - 2
const ANTIHERO_COUNT_MIN = 2
const ANTIHERO_COUNT_MAX = 4
const WALK_SPEED_MIN = 6
const WALK_SPEED_MAX = 18
const SCALE_MIN = 0.65
const SCALE_MAX = 2.0
const DEPTH_MIN = 0.18
const DEPTH_MAX = 0.52
const RUN_FRAME_MIN = 0.09
const RUN_FRAME_MAX = 0.14
const FEET_INSET = 14
const DEFAULT_SIDE_WALL = 192
const WRAP_MARGIN = 140

/**
 * Spawns ambient anti-heroes that drift horizontally across the playfield floor
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {Object} config.hero - Playable hero instance (look-at target)
 * @param {number} config.bottomPlatformHeight - Bottom platform height in pixels
 * @param {number} config.topPlatformHeight - Top platform height in pixels
 * @param {number} [config.sideWallWidth] - Play area side margin
 * @param {string} [config.playfieldColor] - Playfield fill hex for depth blending
 * @returns {Object} Background anti-heroes instance
 */
export function create(config) {
  const {
    k,
    hero,
    bottomPlatformHeight,
    topPlatformHeight,
    sideWallWidth = DEFAULT_SIDE_WALL,
    playfieldColor
  } = config
  const inst = { k, hero, entries: [] }
  if (!hero) return inst
  const floorY = k.height() - bottomPlatformHeight
  const topY = topPlatformHeight ?? 360
  const playLeft = sideWallWidth
  const playRight = k.width() - sideWallWidth
  const playWidth = playRight - playLeft
  const walkYMin = topY + (floorY - topY) * 0.62
  const walkYMax = floorY - FEET_INSET
  const count = Math.floor(k.rand(ANTIHERO_COUNT_MIN, ANTIHERO_COUNT_MAX + 1))
  const baseHex = getConsciousnessColor('backgroundHero')
  const depthBgHex = playfieldColor ?? getConsciousnessColor('gameWorld')
  for (let i = 0; i < count; i++) {
    const depth = k.rand(DEPTH_MIN, DEPTH_MAX)
    const scale = k.rand(SCALE_MIN, SCALE_MAX) * (1 - depth * 0.18)
    const bodyColor = atmosphericDepthColor(baseHex, depthBgHex, depth)
    const direction = Math.random() > 0.5 ? 1 : -1
    const vx = direction * k.rand(WALK_SPEED_MIN, WALK_SPEED_MAX) * (0.55 + (1 - depth) * 0.35)
    const x = playLeft + Math.random() * playWidth
    const y = k.rand(walkYMin, walkYMax)
    const bgAnti = Hero.create({
      k,
      x,
      y,
      type: Hero.HEROES.ANTIHERO,
      controllable: false,
      ambient: true,
      ambientWalk: true,
      ambientRunSpeed: k.rand(RUN_FRAME_MIN, RUN_FRAME_MAX),
      bodyColor,
      scale,
      isStatic: true,
      idleVocalization: null
    })
    bgAnti.character.z = BG_ANTIH_Z - depth * 8
    bgAnti.character.opacity = 1
    bgAnti.direction = direction
    inst.entries.push({
      bgAnti,
      vx,
      playLeft,
      playRight
    })
  }
  k.onUpdate(() => onUpdate(inst))
  return inst
}

//
// Slow horizontal drift with wrap — run animation handled inside hero ambientWalk
//
function onUpdate(inst) {
  const dt = inst.k.dt()
  for (const entry of inst.entries) {
    const ch = entry.bgAnti.character
    if (!ch?.exists?.()) continue
    ch.pos.x += entry.vx * dt
    entry.bgAnti.direction = entry.vx >= 0 ? 1 : -1
    ch.flipX = entry.bgAnti.direction === -1
    if (ch.pos.x < entry.playLeft - WRAP_MARGIN) {
      ch.pos.x = entry.playRight + WRAP_MARGIN * 0.4
    }
    if (ch.pos.x > entry.playRight + WRAP_MARGIN) {
      ch.pos.x = entry.playLeft - WRAP_MARGIN * 0.4
    }
  }
}
