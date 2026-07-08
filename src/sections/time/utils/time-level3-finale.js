import { CFG } from '../cfg.js'
import { getColor, getRGB, isAnyKeyDown, parseHex } from '../../../utils/helper.js'
import * as TouchControls from '../../../utils/touch-controls.js'

//
// Lower-corridor finale: last stretch before the anti-hero — wall, calm movement, monster pacing.
//
const LOWER_FINALE_ZONE_RATIO = 0.2
const INPUT_SAMPLE_WINDOW = 3.0
const MINIMAL_INPUT_TARGET = 1.0
const MINIMAL_INPUT_TOLERANCE = 0.35
const JUMP_PRESS_CREDIT = 0.15
const CALM_HOLD_DURATION = 5.0
const WALL_RISE_DURATION = 0.45
const WALL_LOWER_DURATION = 0.55
const ANTIHERO_WALL_OFFSET_X = 58
const ANTIHERO_WALL_WIDTH = 44
const WALL_OUTLINE_WIDTH = 2
const WALL_OUTLINE_COLOR = '#000000'
const CALM_COUNTDOWN_FONT_SIZE = 22
const CALM_COUNTDOWN_OFFSET_X = 34
const CALM_COUNTDOWN_OFFSET_Y = 48
//
// Drop shadow of the calm countdown (single black copy offset right+down) —
// the same text shadow style the glow level uses.
//
const CALM_COUNTDOWN_OUTLINE_OFFSETS = [[1, 1]]

/**
 * Creates the anti-hero finale controller (wall + movement sampling for monster pacing).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.hero - Hero instance
 * @param {Object} cfg.antiHero - Anti-hero instance
 * @param {Object} cfg.monster - Monster instance from createMonster()
 * @param {number} cfg.lowerCorridorY - Lower corridor top Y
 * @param {number} cfg.lowerCorridorHeight - Lower corridor height
 * @param {number} cfg.sideWallWidth - Playfield side wall width
 * @returns {Object} Finale instance
 */
export function create(cfg) {
  const {
    k,
    hero,
    antiHero,
    monster,
    lowerCorridorY,
    lowerCorridorHeight,
    sideWallWidth
  } = cfg
  const playLeft = sideWallWidth
  const playRight = k.width() - sideWallWidth
  const playWidth = playRight - playLeft
  const finaleZoneMaxX = playLeft + playWidth * LOWER_FINALE_ZONE_RATIO
  const floorY = lowerCorridorY + lowerCorridorHeight
  const wallFillColor = getColor(k, CFG.visual.colors.platform)
  const outlineColor = getRGB(k, WALL_OUTLINE_COLOR)
  const inst = {
    k,
    hero,
    antiHero,
    monster,
    lowerCorridorY,
    lowerCorridorHeight,
    floorY,
    finaleZoneMaxX,
    active: false,
    wallOpened: false,
    calmTimer: 0,
    inputSamples: [],
    jumpPressCredit: 0,
    prevJumpPhase: 'none',
    wallRaised: false,
    wallProgress: 0,
    wallLowering: false,
    wallDrawHeight: 0,
    wallDrawOpacity: 0,
    wallBody: null,
    wallVisual: null,
    calmTimerLabel: null,
    calmTimerOutlineLabels: null,
    pauseChase: false,
    allowMonsterEat: true,
    chaseScale: 1
  }
  inst.wallBody = k.add([
    k.rect(ANTIHERO_WALL_WIDTH, 1),
    k.pos(0, floorY),
    k.anchor('botleft'),
    k.area(),
    k.body({ isStatic: true }),
    wallFillColor,
    k.opacity(0),
    k.z(CFG.visual.zIndex.platforms + 1),
    'antihero-finale-wall',
    CFG.game.platformName
  ])
  inst.wallVisual = k.add([
    k.rect(ANTIHERO_WALL_WIDTH, 1),
    k.pos(0, floorY),
    k.anchor('botleft'),
    wallFillColor,
    k.outline(WALL_OUTLINE_WIDTH, outlineColor),
    k.opacity(0),
    k.z(CFG.visual.zIndex.platforms + 3)
  ])
  setupJumpPressListeners(inst)
  k.onUpdate(() => onUpdate(inst))
  return inst
}

/**
 * Whether the hero is inside the lower corridor.
 * @param {Object} inst - Finale instance
 * @returns {boolean}
 */
export function isHeroInLowerCorridor(inst) {
  const y = inst.hero?.character?.pos?.y
  if (y == null) return false
  return y >= inst.lowerCorridorY && y <= inst.floorY
}

/**
 * Whether the hero is inside the left finale zone near the anti-hero.
 * @param {Object} inst - Finale instance
 * @returns {boolean}
 */
function isHeroInFinaleZone(inst) {
  const heroX = inst.hero?.character?.pos?.x
  if (heroX == null) return false
  return isHeroInLowerCorridor(inst) && heroX <= inst.finaleZoneMaxX
}

/**
 * Per-frame finale update: movement sampling, wall animation, monster pacing flags.
 * @param {Object} inst - Finale instance
 */
function onUpdate(inst) {
  syncWallPosition(inst)
  if (inst.wallOpened) {
    updateFinaleZone(inst)
    updateWallAnimation(inst, inst.k.dt())
    syncMonsterFlags(inst)
    return
  }
  if (!isHeroInLowerCorridor(inst)) {
    resetFinaleProgress(inst)
    syncMonsterFlags(inst)
    return
  }
  const heroX = inst.hero.character.pos.x
  if (heroX > inst.finaleZoneMaxX) {
    resetFinaleProgress(inst)
    syncMonsterFlags(inst)
    return
  }
  inst.active = true
  inst.wallRaised = true
  updateFinaleZone(inst)
  updateWallAnimation(inst, inst.k.dt())
  syncMonsterFlags(inst)
}

/**
 * Samples hero input and updates monster pacing while in the finale zone.
 * @param {Object} inst - Finale instance
 */
function updateFinaleZone(inst) {
  inst.active = isHeroInFinaleZone(inst)
  if (!inst.active) {
    resetPacingState(inst)
    return
  }
  recordActionInputSample(inst)
  const movementMode = classifyHeroMovement(inst)
  updateFinalePacing(inst, movementMode)
  updateCalmCountdownTimer(inst)
}

/**
 * Resets calm progress when the hero leaves the finale zone (wall stays open once lowered).
 * @param {Object} inst - Finale instance
 */
function resetFinaleProgress(inst) {
  inst.active = false
  resetPacingState(inst)
  if (!inst.wallOpened) {
    inst.wallLowering = false
    inst.wallRaised = false
  }
}

/**
 * Clears pacing timers and input samples without affecting the wall state.
 * @param {Object} inst - Finale instance
 */
function resetPacingState(inst) {
  inst.calmTimer = 0
  inst.inputSamples = []
  inst.jumpPressCredit = 0
  inst.prevJumpPhase = 'none'
  inst.pauseChase = false
  inst.allowMonsterEat = true
  inst.chaseScale = 1
  destroyCalmCountdownTimer(inst)
}

/**
 * Registers jump key presses so brief taps count toward the calm input window.
 * @param {Object} inst - Finale instance
 */
function setupJumpPressListeners(inst) {
  const { k } = inst
  CFG.controls.jump.forEach(key => {
    k.onKeyPress(key, () => onJumpKeyPress(inst))
  })
}

/**
 * Adds jump press credit when the hero taps jump in the finale zone.
 * @param {Object} inst - Finale instance
 */
function onJumpKeyPress(inst) {
  if (!isHeroInFinaleZone(inst)) return
  inst.jumpPressCredit += JUMP_PRESS_CREDIT
}

/**
 * Whether run controls are held this frame (keyboard, touch, or hero run state).
 * @param {Object} k - Kaplay instance
 * @param {Object} hero - Hero instance
 * @returns {boolean}
 */
function isRunInputHeld(k, hero) {
  if (!hero?.isSpawned || hero.controlsDisabled) return false
  return hero.isRunning
    || TouchControls.isMoveLeftHeld()
    || TouchControls.isMoveRightHeld()
    || isAnyKeyDown(k, CFG.controls.moveLeft)
    || isAnyKeyDown(k, CFG.controls.moveRight)
}

/**
 * Whether jump is active this frame (key held, jump phase, or virtual jump pulse).
 * @param {Object} k - Kaplay instance
 * @param {Object} hero - Hero instance
 * @returns {boolean}
 */
function isJumpInputActive(k, hero) {
  if (!hero?.isSpawned || hero.controlsDisabled) return false
  return hero.jumpPhase !== 'none'
    || hero.wasJumping
    || isAnyKeyDown(k, CFG.controls.jump)
}

/**
 * Stores run/jump key-hold duration samples in a rolling window.
 * @param {Object} inst - Finale instance
 */
function recordActionInputSample(inst) {
  const { k, hero } = inst
  const dt = k.dt()
  let pressed = 0
  isRunInputHeld(k, hero) && (pressed += dt)
  isJumpInputActive(k, hero) && (pressed += dt)
  const jumpStarted = inst.prevJumpPhase === 'none' && hero.jumpPhase !== 'none'
  jumpStarted && (inst.jumpPressCredit += JUMP_PRESS_CREDIT)
  inst.prevJumpPhase = hero.jumpPhase
  pressed += inst.jumpPressCredit
  inst.jumpPressCredit = 0
  const now = k.time()
  inst.inputSamples.push({ t: now, pressed })
  const cutoff = now - INPUT_SAMPLE_WINDOW
  inst.inputSamples = inst.inputSamples.filter(s => s.t >= cutoff)
}

/**
 * Total seconds of run/jump input held within the rolling sample window.
 * @param {Object} inst - Finale instance
 * @returns {number}
 */
function getTotalActionInput(inst) {
  return inst.inputSamples.reduce((sum, s) => sum + s.pressed, 0)
}

/**
 * Classifies hero movement for monster pacing in the finale zone.
 * @param {Object} inst - Finale instance
 * @returns {'aggressive'|'minimal'|'still'}
 */
function classifyHeroMovement(inst) {
  const totalInput = getTotalActionInput(inst)
  const minBand = MINIMAL_INPUT_TARGET - MINIMAL_INPUT_TOLERANCE
  const maxBand = MINIMAL_INPUT_TARGET + MINIMAL_INPUT_TOLERANCE
  if (totalInput >= minBand && totalInput <= maxBand) return 'minimal'
  if (totalInput > maxBand) return 'aggressive'
  return 'still'
}

/**
 * Updates calm timer, wall state, and monster chase permission from movement mode.
 * @param {Object} inst - Finale instance
 * @param {'aggressive'|'minimal'|'still'} movementMode
 */
function updateFinalePacing(inst, movementMode) {
  const { k } = inst
  if (movementMode === 'minimal') {
    inst.pauseChase = true
    inst.allowMonsterEat = false
    inst.chaseScale = 0
    if (!inst.wallOpened) {
      inst.calmTimer += k.dt()
      if (inst.calmTimer >= CALM_HOLD_DURATION) {
        openWallPermanently(inst)
      }
    }
    return
  }
  inst.calmTimer = 0
  inst.pauseChase = false
  inst.allowMonsterEat = true
  inst.chaseScale = movementMode === 'still' ? 1 : getFinaleChaseScale(inst)
}

/**
 * Maps excess run/jump input to monster chase intensity in the finale zone.
 * @param {Object} inst - Finale instance
 * @returns {number} Chase scale (0–1)
 */
function getFinaleChaseScale(inst) {
  const totalInput = getTotalActionInput(inst)
  const maxBand = MINIMAL_INPUT_TARGET + MINIMAL_INPUT_TOLERANCE
  const excess = totalInput - maxBand
  return Math.min(1, Math.max(0.5, 0.5 + excess / INPUT_SAMPLE_WINDOW))
}

/**
 * Lowers the wall permanently and keeps monster tracking hero movement.
 * @param {Object} inst - Finale instance
 */
function openWallPermanently(inst) {
  if (inst.wallOpened) return
  inst.wallOpened = true
  inst.wallLowering = true
  inst.wallRaised = false
  inst.calmTimer = 0
  destroyCalmCountdownTimer(inst)
}

/**
 * Copies finale flags onto the monster instance for chase/collision logic.
 * @param {Object} inst - Finale instance
 */
function syncMonsterFlags(inst) {
  inst.monster.isReturningHome = false
  if (!inst.active) {
    inst.monster.finalePauseChase = false
    inst.monster.finaleAllowEat = true
    inst.monster.finaleChaseScale = 1
    inst.monster.finaleIdleSway = false
    return
  }
  inst.monster.finalePauseChase = inst.pauseChase
  inst.monster.finaleAllowEat = inst.allowMonsterEat
  inst.monster.finaleChaseScale = inst.chaseScale
  inst.monster.finaleIdleSway = inst.pauseChase
}

/**
 * Positions the wall just to the right of the anti-hero.
 * @param {Object} inst - Finale instance
 */
function syncWallPosition(inst) {
  const antiX = inst.antiHero?.character?.pos?.x ?? 0
  const wallX = antiX + ANTIHERO_WALL_OFFSET_X
  inst.wallBody.pos.x = wallX
  inst.wallVisual.pos.x = wallX
}

/**
 * Animates the wall rising and lowering.
 * @param {Object} inst - Finale instance
 * @param {number} dt - Frame delta
 */
function updateWallAnimation(inst, dt) {
  if (inst.wallOpened) {
    animateWallProgress(inst, 0, dt)
    return
  }
  if (!inst.wallRaised) {
    inst.wallProgress = 0
    setWallHeight(inst, 0)
    return
  }
  animateWallProgress(inst, 1, dt)
}

/**
 * Moves wallProgress toward a target height fraction.
 * @param {Object} inst - Finale instance
 * @param {number} target - Target progress 0–1
 * @param {number} dt - Frame delta
 */
function animateWallProgress(inst, target, dt) {
  const speed = target > inst.wallProgress
    ? 1 / WALL_RISE_DURATION
    : 1 / WALL_LOWER_DURATION
  if (inst.wallProgress < target) {
    inst.wallProgress = Math.min(target, inst.wallProgress + speed * dt)
  } else if (inst.wallProgress > target) {
    inst.wallProgress = Math.max(target, inst.wallProgress - speed * dt)
  }
  const height = inst.lowerCorridorHeight * inst.wallProgress
  setWallHeight(inst, height)
}

/**
 * Applies the current wall height to physics body and visual draw state.
 * @param {Object} inst - Finale instance
 * @param {number} height - Visible wall height in pixels
 */
function setWallHeight(inst, height) {
  const visible = height > 1
  const h = Math.max(1, height)
  inst.wallDrawHeight = h
  inst.wallDrawOpacity = visible ? 1 : 0
  inst.wallBody.height = h
  inst.wallBody.opacity = visible ? 1 : 0
  inst.wallVisual.height = h
  inst.wallVisual.opacity = visible ? 1 : 0
}

/**
 * Shows a small countdown near the hero while calm pacing holds the monster still.
 * @param {Object} inst - Finale instance
 */
function updateCalmCountdownTimer(inst) {
  const { k, hero } = inst
  const showTimer = inst.pauseChase && !inst.wallOpened && inst.active
  if (!showTimer) {
    destroyCalmCountdownTimer(inst)
    return
  }
  const seconds = Math.max(0, Math.ceil(CALM_HOLD_DURATION - inst.calmTimer))
  const fontFamily = CFG.visual.fonts.regularFull.replace(/'/g, '')
  const timerX = hero.character.pos.x + CALM_COUNTDOWN_OFFSET_X
  const timerY = hero.character.pos.y - CALM_COUNTDOWN_OFFSET_Y
  const fillColor = parseHex(CFG.visual.colors.hero.body)
  if (!inst.calmTimerLabel) {
    inst.calmTimerOutlineLabels = CALM_COUNTDOWN_OUTLINE_OFFSETS.map(([dx, dy]) =>
      k.add([
        k.text(String(seconds), { size: CALM_COUNTDOWN_FONT_SIZE, font: fontFamily }),
        k.pos(timerX + dx, timerY + dy),
        k.anchor('center'),
        k.color(0, 0, 0),
        k.z(CFG.visual.zIndex.ui + 9)
      ])
    )
    inst.calmTimerLabel = k.add([
      k.text(String(seconds), { size: CALM_COUNTDOWN_FONT_SIZE, font: fontFamily }),
      k.pos(timerX, timerY),
      k.anchor('center'),
      k.color(...fillColor),
      k.z(CFG.visual.zIndex.ui + 10)
    ])
  }
  inst.calmTimerLabel.text = String(seconds)
  inst.calmTimerLabel.pos.x = timerX
  inst.calmTimerLabel.pos.y = timerY
  inst.calmTimerOutlineLabels?.forEach((label, i) => {
    const [dx, dy] = CALM_COUNTDOWN_OUTLINE_OFFSETS[i]
    label.text = String(seconds)
    label.pos.x = timerX + dx
    label.pos.y = timerY + dy
  })
}

/**
 * Removes the calm countdown label near the hero.
 * @param {Object} inst - Finale instance
 */
function destroyCalmCountdownTimer(inst) {
  inst.calmTimerOutlineLabels?.forEach(label => label.destroy())
  inst.calmTimerOutlineLabels = null
  inst.calmTimerLabel?.destroy()
  inst.calmTimerLabel = null
}
