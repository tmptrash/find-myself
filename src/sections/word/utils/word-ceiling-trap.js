import { CFG } from '../cfg.js'
import { getColor } from '../../../utils/helper.js'
import * as Blades from '../components/blades.js'
import * as Sound from '../../../utils/sound.js'

//
// Drop trap: pit-width tube from playfield top + inverted AAA (word level 1)
//
const TRIGGER_X_MARGIN = 24
const DROP_DURATION = 0.32
const RETRACT_DELAY = 1.1
const RETRACT_DURATION = 0.35
const TUBE_TOP_Y = 0
const BLADE_HANG_OFFSET = 4
const DROP_STOP_ABOVE_FLOOR = 52
const CEILING_BLADE_COUNT = 3
const HERO_COLLISION_WIDTH = 30
const HERO_COLLISION_HEIGHT = 69
const PIT_RATTLE_RANGE = 160
const PIT_RATTLE_COOLDOWN = 0.32
const PIT_STAND_VOLUME_SCALE = 1.85
const TRAP_Z = CFG.visual.zIndex.platforms + 3

/**
 * Creates a repeating ceiling drop trap (solid tube + AAA) over the pit gap
 * @param {Object} config
 * @param {Object} config.k - Kaplay instance
 * @param {Object} config.hero - Hero instance
 * @param {number} config.gapCenterX - Center X of the pit gap
 * @param {number} config.pitWidth - Pit / blade gap width in pixels
 * @param {number} config.playfieldTopY - Top edge of the main play area (below HUD strip)
 * @param {number} config.platformTopY - Bottom floor platform top Y
 * @param {Function} config.onHit - Death callback when trap hits hero
 * @param {Object} [config.sfx] - Sound instance
 * @returns {Object} Trap instance
 */
export function create(config) {
  const { k, hero, gapCenterX, pitWidth, playfieldTopY, platformTopY, onHit, sfx } = config
  const bladeHeight = Blades.getBladeHeight(k)
  const bladeSection = BLADE_HANG_OFFSET + bladeHeight
  const dropStartBottomY = playfieldTopY
  const dropStopBottomY = platformTopY - DROP_STOP_ABOVE_FLOOR + bladeSection
  const dropPlatform = k.add([
    k.rect(pitWidth, dropStartBottomY),
    k.pos(gapCenterX, TUBE_TOP_Y),
    k.anchor('top'),
    k.area(),
    getColor(k, CFG.visual.colors.platform),
    k.opacity(0),
    k.z(TRAP_Z),
    k.fixed()
  ])
  const bladesStartY = dropStartBottomY + BLADE_HANG_OFFSET
  const ceilingBlades = Blades.create({
    k,
    x: gapCenterX,
    y: bladesStartY,
    hero,
    orientation: Blades.ORIENTATIONS.CEILING,
    onHit: () => onAssemblyHit(inst),
    sfx,
    color: CFG.visual.colors.blades,
    bladeCount: CEILING_BLADE_COUNT,
    disableAnimation: true,
    zIndex: TRAP_Z + 1
  })
  ceilingBlades.blade.opacity = 0
  ceilingBlades.collisionEnabled = false
  const inst = {
    k,
    hero,
    gapCenterX,
    pitWidth,
    platformTopY,
    onHit,
    sfx,
    dropPlatform,
    ceilingBlades,
    tubeTopY: TUBE_TOP_Y,
    bladeSection,
    dropStartBottomY,
    dropStopBottomY,
    assemblyBottomY: dropStartBottomY,
    phase: 'idle',
    timer: 0,
    hitTriggered: false,
    rattleCooldown: 0
  }
  dropPlatform.onCollide('player', () => onAssemblyHit(inst))
  setAssemblyBottomY(inst, dropStartBottomY)
  k.onUpdate(() => onUpdate(inst))
  return inst
}

//
// Drops tube + AAA whenever the hero jumps over the pit gap
//
function onUpdate(inst) {
  updateTrapProximityRattle(inst)
  if (inst.phase === 'idle') {
    tryTriggerDrop(inst)
    return
  }
  if (inst.phase === 'dropping') {
    onUpdateDrop(inst)
    checkHeroOverlap(inst)
    return
  }
  if (inst.phase === 'hold') {
    onUpdateHold(inst)
    checkHeroOverlap(inst)
    return
  }
  inst.phase === 'retracting' && onUpdateRetract(inst)
}

//
// Starts drop when the hero is airborne above the pit (open or closed)
//
function tryTriggerDrop(inst) {
  const ch = inst.hero?.character
  if (!ch?.exists?.() || ch.isGrounded?.()) return
  const hx = ch.pos.x
  if (Math.abs(hx - inst.gapCenterX) > inst.pitWidth / 2 + TRIGGER_X_MARGIN) return
  inst.phase = 'dropping'
  inst.timer = 0
  inst.hitTriggered = false
  inst.dropPlatform.opacity = 1
  inst.ceilingBlades.blade.opacity = 1
  inst.ceilingBlades.collisionEnabled = true
  setAssemblyBottomY(inst, inst.dropStartBottomY)
}

//
// Extends the tube downward from the playfield top while AAA hang at the bottom
//
function onUpdateDrop(inst) {
  inst.timer += inst.k.dt()
  const t = Math.min(1, inst.timer / DROP_DURATION)
  const bottomY = inst.dropStartBottomY + (inst.dropStopBottomY - inst.dropStartBottomY) * t
  setAssemblyBottomY(inst, bottomY)
  if (t >= 1) {
    inst.phase = 'hold'
    inst.timer = 0
  }
}

//
// Keeps assembly down briefly, then retracts
//
function onUpdateHold(inst) {
  inst.timer += inst.k.dt()
  if (inst.timer >= RETRACT_DELAY) {
    inst.phase = 'retracting'
    inst.timer = 0
    inst.ceilingBlades.collisionEnabled = false
  }
}

//
// Shortens tube + AAA and hides them for the next jump
//
function onUpdateRetract(inst) {
  inst.timer += inst.k.dt()
  const t = Math.min(1, inst.timer / RETRACT_DURATION)
  const bottomY = inst.dropStopBottomY + (inst.dropStartBottomY - inst.dropStopBottomY) * t
  setAssemblyBottomY(inst, bottomY)
  const fade = 1 - t
  inst.dropPlatform.opacity = fade
  inst.ceilingBlades.blade.opacity = fade
  if (t >= 1) {
    inst.dropPlatform.opacity = 0
    inst.ceilingBlades.blade.opacity = 0
    inst.phase = 'idle'
    inst.timer = 0
    inst.hitTriggered = false
  }
}

//
// Kills the hero once per drop cycle when tube or blades connect
//
function onAssemblyHit(inst) {
  if (inst.hitTriggered || inst.phase === 'idle' || inst.phase === 'retracting') return
  if (inst.hero?.isAnnihilating || inst.hero?.isDead) return
  inst.hitTriggered = true
  inst.onHit?.()
}

//
// Extra overlap pass so a fast jump arc cannot slip through between frames
//
function checkHeroOverlap(inst) {
  if (inst.hitTriggered) return
  const ch = inst.hero?.character
  if (!ch?.exists?.() || inst.hero?.isAnnihilating || inst.hero?.isDead) return
  const halfW = HERO_COLLISION_WIDTH / 2
  const halfH = HERO_COLLISION_HEIGHT / 2
  const heroLeft = ch.pos.x - halfW
  const heroRight = ch.pos.x + halfW
  const heroTop = ch.pos.y - halfH
  const heroBottom = ch.pos.y + halfH
  const tubeLeft = inst.gapCenterX - inst.pitWidth / 2
  const tubeRight = inst.gapCenterX + inst.pitWidth / 2
  const tubeTop = inst.tubeTopY
  const tubeBottom = inst.assemblyBottomY + inst.bladeSection
  const overlapsX = heroRight > tubeLeft && heroLeft < tubeRight
  const overlapsY = heroBottom > tubeTop && heroTop < tubeBottom
  overlapsX && overlapsY && onAssemblyHit(inst)
}

//
// Louder blade rattle when the hero is directly over the pit with visible AAA
//
function updateTrapProximityRattle(inst) {
  if (!inst.sfx || inst.dropPlatform.opacity < 0.08) return
  inst.rattleCooldown -= inst.k.dt()
  if (inst.rattleCooldown > 0) return
  const ch = inst.hero?.character
  if (!ch?.exists?.()) return
  const dx = ch.pos.x - inst.gapCenterX
  const dy = ch.pos.y - (inst.assemblyBottomY + inst.bladeSection)
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist >= PIT_RATTLE_RANGE) return
  const proximity = 1 - dist / PIT_RATTLE_RANGE
  const overPitX = Math.abs(dx) <= inst.pitWidth / 2
  const volumeScale = overPitX ? PIT_STAND_VOLUME_SCALE : 1
  Sound.playBladeProximityRattle(inst.sfx, proximity, volumeScale)
  inst.rattleCooldown = PIT_RATTLE_COOLDOWN
}

//
// Resizes the solid tube from the playfield top and moves AAA to its bottom edge
//
function setAssemblyBottomY(inst, bottomY) {
  inst.assemblyBottomY = bottomY
  const tubeHeight = Math.max(0, bottomY - inst.tubeTopY)
  inst.dropPlatform.pos.x = inst.gapCenterX
  inst.dropPlatform.pos.y = inst.tubeTopY
  inst.dropPlatform.width = inst.pitWidth
  inst.dropPlatform.height = tubeHeight
  const bladeCenterY = bottomY + BLADE_HANG_OFFSET
  inst.ceilingBlades.blade.pos.x = inst.gapCenterX
  inst.ceilingBlades.blade.pos.y = bladeCenterY
  inst.ceilingBlades.baseX = inst.gapCenterX
  inst.ceilingBlades.baseY = bladeCenterY
  inst.ceilingBlades.glintDrawer && (inst.ceilingBlades.glintDrawer.pos.y = bladeCenterY)
}
