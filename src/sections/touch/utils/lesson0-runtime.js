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
//
// Max fly-in speed (px/s) when fireflies converge to form a platform
//
const L0_PLATFORM_FLY_SPEED = 160
//
// Speed at which fireflies are gently pushed back inside the Y bounds (px/s).
// Soft clamp prevents the instantaneous position snap that occurs when exiting
// platform mode (where Y clamping is disabled so fireflies can reach the exact
// platform height above the normal minY bound).
//
const L0_SOFT_CLAMP_SPEED = 220

/**
 * Single per-frame game loop for touch level 0 (preserves legacy call order).
 * @param {Object} k - Kaplay instance
 * @param {Object} ctx - Scene runtime context assembled in sceneLesson0
 */
export function onUpdateLesson0GameLoop(k, ctx) {
  const cameraX = getCameraCenterX(k, ctx.heroInst)
  const cullDist = getDistanceThreshold(k, L0_CULL_SCREEN_MULT)
  const atmosphereDist = getDistanceThreshold(k, L0_ATMOSPHERE_SCREEN_MULT)
  const atmosphereActive = isWithinDistance(ctx.atmosphereAnchorX, cameraX, atmosphereDist)
  ctx.rainInst && (ctx.rainInst.logicPaused = !atmosphereActive)
  //
  // 1. Floor thorns
  //
  ctx.checkFloorThorns(k, ctx.heroInst, ctx.floorThornData, ctx.levelIndicator, ctx.sound)
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
  // 17. Fireflies (per-object cull) with behavior mode
  //
  onUpdateL0FirefliesCulled(k, ctx.fireflies, cameraX, cullDist, ctx.touchLetterState)
  //
  // 18. TOUCH letter system
  //
  ctx.touchLetterState?.onUpdate?.()
  //
  // 19. Background birds (per-object cull)
  //
  onUpdateL0Birds(k, ctx.birds, ctx.birdSkyHeight, ctx.birdFlapBlendTime, ctx.birdGlidePose, cameraX, cullDist)
}
//
// Keeps the monster-head platform glued to the platform bug head.
//
function syncBug4Platform(bigBug4Inst, antiHeroPlatform, _unused, bug4Radius) {
  if (!bigBug4Inst || !antiHeroPlatform) return
  const flatHeadHeight = bug4Radius * 0.8
  const headTopY = bigBug4Inst.y - flatHeadHeight / 2
  antiHeroPlatform.pos.x = bigBug4Inst.x
  antiHeroPlatform.pos.y = headTopY
}
//
// Hero proximity scare logic for floor bugs.
//
function onUpdateBugScare(k, ctx) {
  const { heroInst, bugs, sound } = ctx
  if (!heroInst?.character?.pos) return
  //
  // In gather phase (after C) bugs walk near the hero without fright
  //
  if (ctx.touchLetterState?.cCollected) return
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
  //
  // Pyramids only form after letter U is collected and before letter C is collected
  //
  if (!ctx.touchLetterState?.uCollected) return
  if (ctx.touchLetterState?.cCollected) return
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
// Firefly drift with decorative culling and behavioral modes.
// Mode is stored on fireflies._mode; hero ref on fireflies._heroRef.
//
function onUpdateL0FirefliesCulled(k, fireflies, cameraX, cullDist, touchLetterState) {
  if (!fireflies?.length) return
  const dt = k.dt()
  const t = k.time()
  const bounds = fireflies._bounds
  if (!bounds) return
  const mode = fireflies._mode ?? 'default'
  const hero = fireflies._heroRef
  const heroPos = hero?.character?.pos
  const heroX = heroPos?.x ?? -9999
  const heroY = heroPos?.y ?? -9999
  const L0_FLEE_RADIUS = 195
  const L0_FLEE_SPEED = 180
  const L0_FOLLOW_DIST = 85
  const L0_FOLLOW_SPEED = 120
  const L0_GATHER_SPEED = 320
  //
  // Track whether every firefly in platform mode has reached its locked target position.
  // Starts true; flipped to false if any firefly is still in flight.
  //
  let allAtPlatform = mode === 'platform'
  for (const f of fireflies) {
    //
    // In platform mode all fireflies must converge regardless of screen position
    // so that the arrival check is accurate; otherwise culled fireflies would be
    // missed and _allAtPlatform would flip true prematurely.
    //
    if (mode !== 'platform' && !isWithinDistance(f.x, cameraX, cullDist)) continue
    //
    // Wander baseline (always applied as a gentle undercurrent)
    //
    const wander = Math.sin(t * f.glowSpeed + f.phase) * f.speed * 0.15 * dt
    const wanderY = Math.cos(t * f.glowSpeed * 0.7 + f.phase) * f.speed * 0.25 * dt
    if (mode === 'flee') {
      //
      // Flee from hero when within radius
      //
      const dx = f.x - heroX
      const dy = f.y - heroY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < L0_FLEE_RADIUS && dist > 1) {
        const nx = dx / dist
        const ny = dy / dist
        const strength = (1 - dist / L0_FLEE_RADIUS) * L0_FLEE_SPEED * dt
        f.x += nx * strength + wander
        f.y += ny * strength + wanderY
      } else {
        f.x += f.driftVx * dt + wander
        f.y += (f.driftVy ?? 0) * dt + wanderY
        if (f.y <= bounds.minY || f.y >= bounds.maxY) {
          f.driftVy = -(f.driftVy ?? 8)
        }
      }
    } else if (mode === 'follow') {
      //
      // Orbit hero with random offset, clamped so fireflies stay within bounds
      //
      const targetX = heroX + Math.cos(f.phase * 3 + t * 0.6) * L0_FOLLOW_DIST
      const targetY = Math.max(bounds.minY, heroY - 30 + Math.sin(f.phase * 2.1 + t * 0.5) * L0_FOLLOW_DIST * 0.5)
      const dx = targetX - f.x
      const dy = targetY - f.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const moveSpeed = Math.min(dist * 2.5, L0_FOLLOW_SPEED) * dt
      if (dist > 2) {
        f.x += (dx / dist) * moveSpeed + wander * 0.3
        f.y += (dy / dist) * moveSpeed + wanderY * 0.3
      }
    } else if (mode === 'platform') {
      //
      // Converge at normal speed to fixed platform position, then hold still.
      // No oscillation — firefly positions must match the collision box exactly.
      //
      const platformX = fireflies._platformX ?? heroX
      const platformY = fireflies._platformY ?? heroY
      const spreadX = (f.phase * 7919) % 130 - 65
      const targetX = platformX + spreadX
      const targetY = platformY
      const dx = targetX - f.x
      const dy = targetY - f.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 0.5) {
        //
        // Close enough — snap and freeze in place
        //
        f.x = targetX
        f.y = targetY
      } else {
        //
        // Move at constant speed toward target so approach looks natural
        //
        const move = Math.min(dist, L0_PLATFORM_FLY_SPEED * dt)
        f.x += (dx / dist) * move
        f.y += (dy / dist) * move
        //
        // This firefly hasn't arrived yet — platform is not fully formed
        //
        allAtPlatform = false
      }
    } else if (mode === 'collect') {
      //
      // Each firefly has individual f.collected flag:
      // collected ones orbit hero; uncollected ones wander normally
      //
      if (f.collected) {
        const targetX = heroX + Math.cos(f.phase * 3 + t * 0.6) * L0_FOLLOW_DIST
        const targetY = Math.max(bounds.minY, heroY - 30 + Math.sin(f.phase * 2.1 + t * 0.5) * L0_FOLLOW_DIST * 0.5)
        const dx = targetX - f.x
        const dy = targetY - f.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const moveSpeed = Math.min(dist * 2.5, L0_FOLLOW_SPEED) * dt
        if (dist > 2) {
          f.x += (dx / dist) * moveSpeed + wander * 0.3
          f.y += (dy / dist) * moveSpeed + wanderY * 0.3
        }
      } else {
        //
        // Uncollected: drift horizontally AND vertically for natural random flight
        //
        f.x += f.driftVx * dt + wander
        f.y += (f.driftVy ?? 0) * dt + wanderY
        if (f.y <= bounds.minY || f.y >= bounds.maxY) {
          f.driftVy = -(f.driftVy ?? 8)
        }
      }
    } else if (mode === 'gather') {
      //
      // Rush to hero position
      //
      const dx = heroX - f.x
      const dy = (heroY - 20) - f.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const speed = Math.min(dist * 4, L0_GATHER_SPEED) * dt
      if (dist > 8) {
        f.x += (dx / dist) * speed + wander * 0.2
        f.y += (dy / dist) * speed + wanderY * 0.2
      }
    } else if (mode === 'scatter') {
      //
      // Post-U scatter: each firefly has its own randomised X and Y velocity
      //
      f.x += (f.driftVx ?? 20) * dt + wander
      f.y += (f.driftVy ?? 0) * dt + wanderY
      //
      // Reverse Y velocity when hitting top/bottom bounds
      //
      if (f.y <= bounds.minY || f.y >= bounds.maxY) {
        f.driftVy = -(f.driftVy ?? 20)
      }
    } else {
      //
      // Default: drift horizontally and vertically for natural random movement
      //
      f.x += f.driftVx * dt + wander
      f.y += (f.driftVy ?? 0) * dt + wanderY
      if (f.y <= bounds.minY || f.y >= bounds.maxY) {
        f.driftVy = -(f.driftVy ?? 8)
      }
    }
    //
    // Bounce off horizontal bounds instead of teleporting to opposite side.
    // In platform mode, skip the Y clamp so fireflies can reach the exact
    // target height even if it sits above the normal minY bound.
    //
    if (f.x < bounds.minX) { f.x = bounds.minX; f.driftVx = Math.abs(f.driftVx ?? 5) }
    else if (f.x > bounds.maxX) { f.x = bounds.maxX; f.driftVx = -Math.abs(f.driftVx ?? 5) }
    if (mode !== 'platform') {
      //
      // Soft clamp: gradually push fireflies back inside bounds at L0_SOFT_CLAMP_SPEED.
      // A hard snap would cause a visible jump when exiting platform mode (where Y
      // clamping is disabled and fireflies can sit above bounds.minY).
      //
      const softMove = L0_SOFT_CLAMP_SPEED * dt
      if (f.y < bounds.minY) f.y = Math.min(f.y + softMove, bounds.minY)
      else if (f.y > bounds.maxY) f.y = Math.max(f.y - softMove, bounds.maxY)
    }
    //
    // Ensure minimum horizontal drift so fireflies never become completely static
    //
    const MIN_DRIFT = 4
    if (Math.abs(f.driftVx ?? 0) < MIN_DRIFT) {
      f.driftVx = (f.driftVx ?? 0) >= 0 ? MIN_DRIFT : -MIN_DRIFT
    }
  }
  //
  // Expose whether all fireflies have reached platform position so the scene can
  // delay creating the collision box until every firefly is actually in place.
  //
  if (mode === 'platform') {
    fireflies._allAtPlatform = allAtPlatform
  }
}
