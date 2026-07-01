import * as FpsCounter from '../../../utils/fps-counter.js'
import * as TreeRoots from '../components/tree-roots.js'
import * as FallingLeaf from '../components/falling-leaf.js'
import { getActiveZoneIndex, isZoneAwake } from './scene-perf.js'

/**
 * Single per-frame loop for touch level 1 gameplay systems.
 * @param {Object} k - Kaplay instance
 * @param {Object} ctx - Scene runtime context
 */
export function onUpdateLesson1GameLoop(k, ctx) {
  const heroX = ctx.heroInst?.character?.pos?.x ?? ctx.defaultHeroX
  const activeZone = getActiveZoneIndex(heroX, ctx.playLeft, ctx.playRight, ctx.zoneCount)
  FpsCounter.onUpdate(ctx.fpsCounter)
  ctx.birdsOnUpdate?.()
  const treesNear = ctx.treeRootsInst.roots.some(r => Math.abs(r.x - heroX) <= ctx.treeRootUpdateMaxDist)
  treesNear && TreeRoots.onUpdate(ctx.treeRootsInst, heroX, ctx.treeRootUpdateMaxDist)
  const melodyZone = getActiveZoneIndex(ctx.treeRootsCenterX, ctx.playLeft, ctx.playRight, ctx.zoneCount)
  const melodyAwake = isZoneAwake(melodyZone, activeZone, ctx.zoneCount)
  ctx.fallingLeafInst && FallingLeaf.onUpdate(ctx.fallingLeafInst)
  onUpdateGiantWorms(k, ctx, activeZone)
  onUpdateTreePhases(k, ctx)
  ctx.wormTooltipOnUpdate?.()
  ctx.fireflyOnUpdate?.(k, activeZone)
  ctx.rainOnUpdate?.()
  melodyAwake && ctx.ambientOnUpdate?.(k)
}
//
// Giant worms + trap2 only tick in awake zones.
//
function onUpdateGiantWorms(k, ctx, activeZone) {
  const { giantWormInst, trap2WormInst, heroInst, levelIndicator } = ctx
  if (!giantWormInst) return
  const wormZone = (x) => getActiveZoneIndex(x, ctx.playLeft, ctx.playRight, ctx.zoneCount)
  const mainAwake = isZoneAwake(wormZone(giantWormInst.x), activeZone, ctx.zoneCount)
  const trap2Awake = trap2WormInst && isZoneAwake(wormZone(trap2WormInst.x), activeZone, ctx.zoneCount)
  //
  // Sync sleeping flag so the internal k.onUpdate in giant-worm.js skips
  // computation when the worm is in a distant zone.
  // Exception: forceActive (set by startDancing) keeps worm awake regardless of zone.
  //
  if (!giantWormInst.forceActive) giantWormInst.sleeping = !mainAwake
  trap2WormInst && (trap2WormInst.sleeping = !trap2Awake)
  if (trap2WormInst) {
    const mainActive = giantWormInst.phase !== 'hidden' || giantWormInst.riseAmount > 0
    const t2Active = trap2WormInst.phase !== 'hidden' || trap2WormInst.riseAmount > 0
    giantWormInst.blocked = t2Active
    trap2WormInst.blocked = mainActive
  }
  if (!heroInst.isDying && heroInst.character?.pos) {
    mainAwake && giantWormInst.riseAmount > 0 && ctx.checkGiantWormCollision(k, heroInst, giantWormInst, levelIndicator, ctx.sound)
    trap2Awake && trap2WormInst?.riseAmount > 0 && ctx.checkGiantWormCollision(k, heroInst, trap2WormInst, levelIndicator, ctx.sound)
  }
}
//
// Phase-based tree interaction system:
//   phase1/phase2 — count unique tree touches (no melody puzzle)
//   melody        — full melody puzzle sequence
//
function onUpdateTreePhases(k, ctx) {
  const { heroInst, gameState, treeRootsInst, sound, lightningState } = ctx
  if (!gameState.treesEnabled) return
  //
  // Per-frame: tick melody pause timer so sequence completion fires without
  // requiring another tree touch after the last note.
  //
  if (gameState.phase === 'melody' && gameState.sequenceCompleteTime !== null) {
    gameState.pauseTimer += k.dt()
    if (gameState.pauseTimer >= ctx.sequencePauseMinimum) {
      ctx.onMelodySolved?.()
      gameState.sequenceCompleteTime = null
      gameState.pauseTimer = 0
    }
    return
  }
  const heroChar = heroInst.character
  if (!heroChar) return
  const touchedTreeIndex = TreeRoots.checkHeroTreeCollision(
    treeRootsInst,
    heroChar,
    ctx.treeCollisionMaxDist
  )
  //
  // Reset duplicate-touch guard when hero leaves all trees
  //
  if (touchedTreeIndex === -1) {
    gameState.lastTouchedTreeIndex = -1
    return
  }
  if (touchedTreeIndex === gameState.lastTouchedTreeIndex) return
  gameState.lastTouchedTreeIndex = touchedTreeIndex
  //
  // Delegate to the scene-provided handler (handles phase routing + collection checks)
  //
  ctx.processTreeTouch?.(touchedTreeIndex)
  //
  // Melody puzzle (phase 'melody') — register note and check wrong notes
  //
  if (gameState.phase === 'melody') {
    processMelodySequence(k, gameState, touchedTreeIndex, ctx.sequencePauseMinimum, sound, lightningState, ctx.onMelodySolved)
  }
}
//
// Melody sequence puzzle: hero must touch trees in order [0,1,2,1,2]
// When complete, calls onMelodySolved callback.
//
function processMelodySequence(k, gameState, touchedTreeIndex, sequencePauseMinimum, sound, lightningState, onMelodySolved) {
  //
  // Handle pending completion pause
  //
  if (gameState.sequenceCompleteTime !== null) {
    if (gameState.pauseTimer < sequencePauseMinimum) return
    onMelodySolved?.()
    gameState.sequenceCompleteTime = null
    gameState.pauseTimer = 0
    return
  }
  const targetSequence = gameState.targetSequence
  const expectedNote = gameState.playerSequence.length < targetSequence.length
    ? targetSequence[gameState.playerSequence.length]
    : targetSequence[0]
  if (touchedTreeIndex === expectedNote) {
    gameState.playerSequence.push(touchedTreeIndex)
    if (gameState.playerSequence.length === targetSequence.length) {
      gameState.sequenceCompleteTime = k.time()
      gameState.pauseTimer = 0
    }
    return
  }
  //
  // Wrong note — thunder feedback
  //
  gameState.playerSequence = []
  gameState.sequenceCompleteTime = null
  gameState.pauseTimer = 0
  sound && lightningState && triggerMelodyWrongThunder(sound, lightningState)
}
//
// Thunder flash on wrong melody note
//
function triggerMelodyWrongThunder(sound, lightningState) {
  lightningState.flashTimer = 0.18
  lightningState.blinkCount = 3
  lightningState.blinkTimer = 0.06
}

/**
 * Returns zone index for a world X coordinate.
 * @param {number} x
 * @param {number} playLeft
 * @param {number} playRight
 * @param {number} zoneCount
 * @returns {number}
 */
export function getL1ZoneForX(x, playLeft, playRight, zoneCount) {
  return getActiveZoneIndex(x, playLeft, playRight, zoneCount)
}
