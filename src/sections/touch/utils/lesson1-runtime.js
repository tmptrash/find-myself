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
  onUpdateMelodyGameplay(k, ctx)
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
  //
  giantWormInst.sleeping = !mainAwake
  trap2WormInst && (trap2WormInst.sleeping = !trap2Awake)
  if (trap2WormInst) {
    const mainActive = giantWormInst.phase !== 'hidden' || giantWormInst.riseAmount > 0
    const t2Active = trap2WormInst.phase !== 'hidden' || trap2WormInst.riseAmount > 0
    giantWormInst.blocked = t2Active
    trap2WormInst.blocked = mainActive
  }
  if (!heroInst.isDying && heroInst.character?.pos) {
    mainAwake && giantWormInst.riseAmount > 0 && ctx.checkGiantWormCollision(k, heroInst, giantWormInst, levelIndicator)
    trap2Awake && trap2WormInst?.riseAmount > 0 && ctx.checkGiantWormCollision(k, heroInst, trap2WormInst, levelIndicator)
  }
}
//
// Melody puzzle, tree touch, anti-hero proximity — unchanged order.
//
function onUpdateMelodyGameplay(k, ctx) {
  const { heroInst, gameState, antiHeroInst, treeRootsInst, sound, lightningState } = ctx
  if (gameState.sequenceCompleteTime !== null) {
    gameState.pauseTimer += k.dt()
    if (gameState.pauseTimer >= ctx.sequencePauseMinimum) {
      try {
        ctx.activateAntiHero()
        gameState.sequenceCompleteTime = null
        gameState.pauseTimer = 0
      } catch (error) {
        gameState.sequenceCompleteTime = null
        gameState.pauseTimer = 0
      }
    }
  }
  const heroChar = heroInst.character
  if (!heroChar) return
  const touchedTreeIndex = TreeRoots.checkHeroTreeCollision(
    treeRootsInst,
    heroChar,
    ctx.treeCollisionMaxDist
  )
  if (touchedTreeIndex === -1 && gameState.lastTouchedTreeIndex !== -1) {
    gameState.lastTouchedTreeIndex = -1
  }
  if (touchedTreeIndex !== -1 && !gameState.antiHeroActive) {
    ctx.processTreeMelodyTouch(k, gameState, touchedTreeIndex, ctx.sequencePauseMinimum, { sound, lightningState })
  } else if (touchedTreeIndex === -1) {
    gameState.lastTouchedTreeIndex = -1
  }
  if (antiHeroInst.character) {
    const dx = heroChar.pos.x - antiHeroInst.character.pos.x
    const dy = heroChar.pos.y - antiHeroInst.character.pos.y
    //
    // Squared distance avoids Math.sqrt — equivalent to distance < 80
    //
    const distSq = dx * dx + dy * dy
    const wasNear = gameState.isNearAntiHero
    gameState.isNearAntiHero = distSq < 6400
    if (!gameState.isNearAntiHero && wasNear) {
      gameState.notesBubbleVisible = false
    }
    if (gameState.isNearAntiHero && !wasNear && !gameState.antiHeroActive) {
      ctx.playMelody()
    }
  }
  ctx.onUpdateAntiHeroHints(k, gameState, antiHeroInst)
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
