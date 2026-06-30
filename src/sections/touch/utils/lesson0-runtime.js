import * as Hero from '../../../components/hero.js'
import * as Bugs from '../components/bugs.js'
import * as SmallBugs from '../components/small-bugs.js'
import * as BugPyramid from '../components/bug-pyramid.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as Rain from '../components/rain.js'
import * as Sound from '../../../utils/sound.js'
import { drawRealisticBird } from '../utils/realistic-bird.js'
import { getCameraCenterX, getDistanceThreshold, isWithinDistance } from './scene-perf.js'

//
// Bug scare / pyramid tuning (mirrors level0.js)
//
const L0_BUG_SCARE_HERO_RADIUS = 50
const L0_PYRAMID_JOIN_RADIUS_SQ = 60 * 60
const L0_PYRAMID_CHECK_INTERVAL = 0.5
const L0_CULL_SCREEN_MULT = 2
const L0_ATMOSPHERE_SCREEN_MULT = 1.5

/**
 * Single per-frame game loop for touch level 0 (preserves legacy call order).
 * @param {Object} k - Kaplay instance
 * @param {Object} ctx - Scene runtime context assembled in sceneLevel0
 */
export function onUpdateLevel0GameLoop(k, ctx) {
  const cameraX = getCameraCenterX(k, ctx.heroInst)
  const cullDist = getDistanceThreshold(k, L0_CULL_SCREEN_MULT)
  const atmosphereDist = getDistanceThreshold(k, L0_ATMOSPHERE_SCREEN_MULT)
  const atmosphereActive = isWithinDistance(ctx.atmosphereAnchorX, cameraX, atmosphereDist)
  ctx.rainInst && (ctx.rainInst.logicPaused = !atmosphereActive)
  //
  // 1. Floor thorns
  //
  ctx.checkFloorThorns(k, ctx.heroInst, ctx.floorThornData, ctx.levelIndicator)
  //
  // 2. Bug4 platform + anti-hero sync
  //
  syncBug4Platform(ctx.bigBug4Inst, ctx.antiHeroPlatform, ctx.antiHeroInst, ctx.bug4Radius)
  //
  // 3. Bug scare behaviour
  //
  onUpdateBugScare(k, ctx)
  //
  // 4. Bugs, pyramids, decorative culling
  //
  onUpdateBugsAndPyramids(k, ctx, cameraX, cullDist)
  //
  // 5. FPS counter
  //
  FpsCounter.onUpdate(ctx.fpsCounter)
  //
  // 6. Small-bug pyramid z-index
  //
  onUpdateSmallBugZIndex(ctx.smallBugDrawObjects)
  //
  // 7. Rain audio bootstrap
  //
  ctx.startRainWhenReady()
  //
  // 8–11. Atmospheric SFX (only near playfield anchor)
  //
  atmosphereActive && ctx.onUpdateThunder?.(k, ctx.thunderState, ctx.sound)
  atmosphereActive && onUpdateCricketTimer(k, ctx.cricketState, ctx.sound)
  atmosphereActive && onUpdateFrogTimer(k, ctx.frogState)
  atmosphereActive && onUpdateOwlTimer(k, ctx.owlState, ctx.sound)
  //
  // 12. Rain simulation
  //
  atmosphereActive && ctx.rainInst && Rain.onUpdate(ctx.rainInst)
  //
  // 13. Trap spikes
  //
  ctx.trapOnUpdate?.()
  //
  // 14. Monster conversation
  //
  ctx.conversationOnUpdate?.()
  //
  // 15. Small-bug ambient phrases
  //
  ctx.smallBugPhraseOnUpdate?.()
  //
  // 16. Puddles
  //
  ctx.puddleOnUpdate?.()
  //
  // 17. Fireflies (per-object cull)
  //
  onUpdateL0FirefliesCulled(k, ctx.fireflies, cameraX, cullDist)
  //
  // 18. Background birds (per-object cull)
  //
  onUpdateL0Birds(k, ctx.birds, ctx.birdSkyHeight, ctx.birdFlapBlendTime, ctx.birdGlidePose, cameraX, cullDist)
}
//
// Keeps anti-hero platform glued to the platform bug head.
//
function syncBug4Platform(bigBug4Inst, antiHeroPlatform, antiHeroInst, bug4Radius) {
  if (!bigBug4Inst || !antiHeroPlatform || !antiHeroInst) return
  const flatHeadHeight = bug4Radius * 0.8
  const headTopY = bigBug4Inst.y - flatHeadHeight / 2
  antiHeroPlatform.pos.x = bigBug4Inst.x
  antiHeroPlatform.pos.y = headTopY
  antiHeroInst.character && (antiHeroInst.character.pos.x = bigBug4Inst.x)
}
//
// Hero proximity scare logic for floor bugs.
//
function onUpdateBugScare(k, ctx) {
  const { heroInst, bugs, sound } = ctx
  if (!heroInst?.character?.pos) return
  const heroX = heroInst.character.pos.x
  const heroY = heroInst.character.pos.y
  const dt = k.dt()
  const scareRadiusSq = L0_BUG_SCARE_HERO_RADIUS * L0_BUG_SCARE_HERO_RADIUS
  for (const bugInst of bugs) {
    if (bugInst.state === 'pyramid' || bugInst.isPlatformBug) continue
    if (bugInst.justRecovered) {
      if (bugInst.justRecoveredTimer === undefined) bugInst.justRecoveredTimer = 0.5
      bugInst.justRecoveredTimer -= dt
      if (bugInst.justRecoveredTimer <= 0) {
        bugInst.justRecovered = false
        bugInst.justRecoveredTimer = undefined
      }
    }
    const dx = bugInst.x - heroX
    const dy = bugInst.y - heroY
    const distSq = dx * dx + dy * dy
    if (distSq < scareRadiusSq) {
      if (!bugInst.isScared && !bugInst.justRecovered) {
        bugInst.isScared = true
        bugInst.scareTimer = 0
        bugInst.state = 'scared'
        bugInst.vx = 0
        bugInst.vy = 0
        sound && Sound.playBugScareSound(sound)
        sound && Sound.playHeroMeowSound(sound)
        Hero.crouch(heroInst, ctx.heroBugCrouchDuration)
        const reach = (bugInst.legLength1 + bugInst.legLength2) * bugInst.scale
        bugInst.maxDrop = reach * 0.5
      }
    }
    if (bugInst.isScared) {
      if (bugInst.dropOffset < bugInst.maxDrop) {
        bugInst.dropOffset += dt * 200
        if (bugInst.dropOffset > bugInst.maxDrop) bugInst.dropOffset = bugInst.maxDrop
      }
      bugInst.scareTimer += dt
      if (bugInst.scareTimer >= bugInst.scareDuration) {
        const currentDx = bugInst.x - heroX
        const escapeDirection = currentDx < 0 ? -1 : 1
        bugInst.isScared = false
        bugInst.justRecovered = true
        bugInst.justRecoveredTimer = 0.5
        bugInst.state = 'crawling'
        bugInst.movementAngle = escapeDirection < 0 ? Math.PI : 0
        bugInst.vx = Math.cos(bugInst.movementAngle) * bugInst.crawlSpeed
        bugInst.vy = 0
      }
    }
    if (!bugInst.isScared && bugInst.dropOffset > 0) {
      bugInst.dropOffset -= dt * 150
      if (bugInst.dropOffset < 0) bugInst.dropOffset = 0
    }
  }
}
//
// Updates crawlers/pyramids; skips bugs outside cull radius unless mid-scare/pyramid.
//
function onUpdateBugsAndPyramids(k, ctx, cameraX, cullDist) {
  const { heroInst, bugs, smallBugs, allBugsCombined, activePyramids, pyramidRuntime } = ctx
  if (heroInst.isAnnihilating) return
  const dt = k.dt()
  for (const bug of bugs) {
    const active = bug.isScared || bug.state === 'pyramid' || bug.isScattering || isWithinDistance(bug.x, cameraX, cullDist)
    active && Bugs.onUpdate(bug, dt)
  }
  for (const bug of smallBugs) {
    const active = bug.state === 'pyramid' || bug.isScattering || isWithinDistance(bug.x, cameraX, cullDist)
    active && SmallBugs.onUpdate(bug, dt)
  }
  for (let i = activePyramids.length - 1; i >= 0; i--) {
    const pyramid = activePyramids[i]
    const pyramidNear = isWithinDistance(pyramid.centerX, cameraX, cullDist)
    pyramidNear && BugPyramid.onUpdate(pyramid, dt)
    if (pyramid.isActive && pyramidNear) {
      for (const bug of allBugsCombined) {
        if (bug.isMother || bug.state === 'pyramid' || bug.state === 'scared' || bug.state === 'recovering' || bug.isScattering) continue
        if (!isWithinDistance(bug.x, cameraX, cullDist)) continue
        const dx = bug.x - pyramid.centerX
        const dy = bug.y - pyramid.centerY
        dx * dx + dy * dy <= L0_PYRAMID_JOIN_RADIUS_SQ && BugPyramid.addBug(pyramid, bug)
      }
    }
    !pyramid.isActive && activePyramids.splice(i, 1)
  }
  pyramidRuntime.timer += dt
  if (pyramidRuntime.timer < L0_PYRAMID_CHECK_INTERVAL) return
  pyramidRuntime.timer = 0
  if (bugs.some(bug => bug.isScattering === true)) return
  const availableSmallBugs = []
  for (const bug of allBugsCombined) {
    if (bug.isMother || bug.state === 'pyramid' || bug.state === 'scared' || bug.state === 'recovering' || bug.isScattering) continue
    if (!isWithinDistance(bug.x, cameraX, cullDist)) continue
    availableSmallBugs.push(bug)
  }
  const group = BugPyramid.findBugGroup(availableSmallBugs)
  if (!group || group.length < 5) return
  const alreadyInPyramid = group.some(bug =>
    activePyramids.some(pyramid => pyramid.bugs.some(b => b.inst === bug))
  )
  if (alreadyInPyramid) return
  const pyramid = BugPyramid.create({ k, bugs: group, hero: heroInst, sound: ctx.sound })
  pyramid && activePyramids.push(pyramid)
}
//
// Pyramid-state small bugs render above trees.
//
function onUpdateSmallBugZIndex(smallBugDrawObjects) {
  for (const { bug, obj } of smallBugDrawObjects) {
    const pyramidZIndex = bug.state === 'pyramid' ? 30 : bug.zIndex
    obj.exists() && (obj.z = pyramidZIndex)
  }
}
//
// Ambient timer helpers (logic extracted from scene inline callbacks).
//
function onUpdateCricketTimer(k, state, sound) {
  state.timer -= k.dt()
  if (state.timer > 0) return
  Sound.playCricketSound(sound)
  state.timer = state.intervalMin + Math.random() * (state.intervalMax - state.intervalMin)
}
function onUpdateFrogTimer(k, state) {
  state.timer -= k.dt()
  if (state.timer > 0) return
  Sound.playFrogSound(k)
  state.timer = state.intervalMin + Math.random() * (state.intervalMax - state.intervalMin)
}
function onUpdateOwlTimer(k, state, sound) {
  state.timer -= k.dt()
  if (state.timer > 0) return
  Math.random() < 0.6 ? Sound.playOwlSound(sound) : Sound.playBirdChirpSound(sound)
  state.timer = state.intervalMin + Math.random() * (state.intervalMax - state.intervalMin)
}
//
// Bird simulation with decorative culling.
//
function onUpdateL0Birds(k, birds, skyHeight, flapBlendTime, glidePose, cameraX, cullDist) {
  const time = k.time()
  const dt = k.dt()
  const topY = birds._topMargin ?? 0
  for (const bird of birds) {
    if (!isWithinDistance(bird.x, cameraX, cullDist)) continue
    bird.x += bird.speed * dt
    if (bird.x > k.width() + 50) {
      bird.x = -50
      bird.baseY = topY + Math.random() * skyHeight
    }
    bird.y = bird.baseY + Math.sin((time + bird.timeOffset) * bird.frequency + bird.phaseOffset) * bird.amplitude
    bird.flapTimer += dt
    const currentDuration = bird.isFlapping ? bird.flapDuration : bird.glideDuration
    if (bird.flapTimer > currentDuration) {
      bird.isFlapping = !bird.isFlapping
      bird.flapTimer = 0
    }
    const targetBlend = bird.isFlapping ? 1 : 0
    const blendStep = dt / flapBlendTime
    if (bird.modeBlend < targetBlend) bird.modeBlend = Math.min(targetBlend, bird.modeBlend + blendStep)
    else if (bird.modeBlend > targetBlend) bird.modeBlend = Math.max(targetBlend, bird.modeBlend - blendStep)
    const flapWave = Math.sin((time + bird.timeOffset) * 8 + bird.phaseOffset)
    bird.wingPhase = glidePose + (flapWave - glidePose) * bird.modeBlend
  }
}
/**
 * Draws birds after simulation step (called from draw callback).
 * @param {Object} k
 * @param {Array} birds
 * @param {number} cameraX
 * @param {number} cullDist
 */
export function drawL0Birds(k, birds, cameraX, cullDist) {
  for (const bird of birds) {
    if (!isWithinDistance(bird.x, cameraX, cullDist)) continue
    drawRealisticBird(k, bird, bird.wingPhase)
  }
}
//
// Firefly drift with decorative culling.
//
function onUpdateL0FirefliesCulled(k, fireflies, cameraX, cullDist) {
  if (!fireflies?.length) return
  const dt = k.dt()
  const t = k.time()
  const bounds = fireflies._bounds
  if (!bounds) return
  for (const f of fireflies) {
    if (!isWithinDistance(f.x, cameraX, cullDist)) continue
    f.x += f.driftVx * dt + Math.sin(t * f.glowSpeed + f.phase) * f.speed * 0.3 * dt
    f.y += Math.cos(t * f.glowSpeed * 0.7 + f.phase) * f.speed * 0.6 * dt
    if (f.x < bounds.minX) f.x = bounds.maxX
    if (f.x > bounds.maxX) f.x = bounds.minX
    if (f.y < bounds.minY) f.y = bounds.minY
    if (f.y > bounds.maxY) f.y = bounds.maxY
  }
}
