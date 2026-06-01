import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'

//
// Large muted heroes on the mid-background — in front of drifting words,
// behind the playfield. Varied scale reads as depth; eyes track the hero.
//
const BG_HERO_COUNT = 3
const BG_HERO_X_RATIOS = [0.12, 0.5, 0.88]
const BG_HERO_SCALES = [5.2, 7.4, 6.0]
const BG_HERO_OPACITY = 1
const BG_HERO_Z = CFG.visual.zIndex.wordBackgroundHero ?? CFG.visual.zIndex.background + 12
const BG_HERO_FEET_INSET = 14
const BG_HERO_LOOK_Y_OFFSET = 52
const DEFAULT_SIDE_WALL = 192

/**
 * Spawns large static background heroes with eye tracking
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {Object} config.hero - Playable hero instance (look-at target)
 * @param {number} config.bottomPlatformHeight - Bottom platform height in pixels
 * @param {number} [config.sideWallWidth] - Play area side margin
 * @returns {Object} Background heroes instance
 */
export function create(config) {
  const {
    k,
    hero,
    bottomPlatformHeight,
    sideWallWidth = DEFAULT_SIDE_WALL
  } = config
  const inst = { k, hero, heroes: [] }
  if (!hero) return inst
  const floorY = k.height() - bottomPlatformHeight
  const playLeft = sideWallWidth
  const playWidth = k.width() - sideWallWidth * 2
  const palette = CFG.visual.colors.backgroundHero || []
  for (let i = 0; i < BG_HERO_COUNT; i++) {
    const x = playLeft + playWidth * (BG_HERO_X_RATIOS[i] ?? (i + 1) / (BG_HERO_COUNT + 1))
    const y = floorY - BG_HERO_FEET_INSET
    const bodyColor = palette[i % palette.length] || CFG.visual.colors.hero.body
    const scale = BG_HERO_SCALES[i] ?? BG_HERO_SCALES[BG_HERO_SCALES.length - 1]
    const bgHero = Hero.create({
      k,
      x,
      y,
      type: Hero.HEROES.HERO,
      controllable: false,
      bodyColor,
      scale,
      isStatic: true,
      idleVocalization: null
    })
    bgHero.character.z = BG_HERO_Z
    bgHero.character.opacity = BG_HERO_OPACITY
    inst.heroes.push(bgHero)
  }
  k.onUpdate(() => onUpdate(inst))
  return inst
}

//
// Eyes aim at the playable hero's feet so giant heads on the horizon look downward
//
function onUpdate(inst) {
  const target = inst.hero?.character?.pos
  if (!target) return
  const lookAt = { x: target.x, y: target.y + BG_HERO_LOOK_Y_OFFSET }
  for (const bgHero of inst.heroes) {
    Hero.setLookAtPos(bgHero, lookAt)
  }
}
