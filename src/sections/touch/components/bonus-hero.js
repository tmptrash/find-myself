import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { get, set } from '../../../utils/progress.js'
import { getRGB } from '../../../utils/helper.js'
import * as Tooltip from '../../../utils/tooltip.js'

//
// Hidden platform and collectible hero configuration
//
const PLATFORM_HEIGHT = 20
const TIME_PLATFORM_COLLISION_HEIGHT = 28
//
// Approximate distance from hero center to hero feet (half collision height + offset)
//
const HERO_FEET_OFFSET = 38
//
// Default vertical approach distance: how far above the platform the hero's
// feet can be before the hidden collider activates. Generous on purpose —
// the collider is invisible so a wide activation radius has no visual cost,
// and it ensures high-velocity falls never skip over the invisible platform.
// Individual platforms can override this via the revealDistance config param.
//
const APPROACH_DISTANCE = 320
//
// How far below the platform surface the hero's feet can be to still count
// as landing.
//
const LAND_TOLERANCE = 14
//
// Velocity-based safety net: if the hero's downward velocity would push
// his feet past the platform surface within this many frames, force the
// collider on so a high-velocity fall never skips over the invisible log.
//
const VELOCITY_PREDICTION_FRAMES = 4
//
// When the hero is strictly above the platform AND falling downward we
// apply a larger effective reveal distance so the collider is guaranteed
// to be in place well before the hero reaches the surface. A tight
// per-platform `revealDistance` (e.g. 100px) prevents the platform from
// appearing while the hero is on a floor below it, but that same small
// window can be crossed in a single physics tick at terminal velocity.
// Using this larger distance only while the hero is actively falling
// avoids any false-positive reveal from below.
//
const FALLING_REVEAL_DISTANCE = 260
//
// Once the collider has been enabled it remains "hot" for this many
// seconds — enough for Kaplay to register the actual landing and mark
// the hero as grounded. Without this hold the platform would flicker off
// the moment vertical velocity hits zero (post-impact) and the hero
// would fall through before `isGrounded()` returns true.
//
const COLLIDABLE_HOLD_DURATION = 0.25
const BONUS_POINTS = 3
const HERO_SCALE = 0.5
const SPARKLE_INTERVAL_MIN = 1.5
const SPARKLE_INTERVAL_MAX = 3.5
const SPARKLE_DURATION = 0.5
const SPARKLE_RADIUS = 6
const SPARKLE_COLOR_R = 255
const SPARKLE_COLOR_G = 255
const SPARKLE_COLOR_B = 255
const COLLECT_PARTICLE_COUNT = 12
const COLLECT_PARTICLE_SPEED = 120
const COLLECT_PARTICLE_LIFETIME = 0.8
//
// Same HUD hint whenever any bonus mini-hero is collected (touch section).
//
const BONUS_COLLECT_HINT_TEXT = 'You got 3 fragments.'
//
// How long the collect hint bubble stays above the hero (seconds).
//
const HINT_DISPLAY_DURATION = 3
//
// Float animation and time-style platform text
//
const FLOAT_SPEED = 1.5
const FLOAT_AMPLITUDE = 6
const TIME_PLATFORM_FONT_SIZE = 24
//
// Post-reveal mini-hero opacity pulsation
//
const PULSE_SPEED = 2.5
const PULSE_MIN_OPACITY = 0.5
const PULSE_MAX_OPACITY = 1.0
//
// Click-to-destroy shake animation
//
const SHAKE_DURATION = 0.4
const SHAKE_INTENSITY = 4
const SHAKE_FREQUENCY = 30
//
// Log platform visual constants (simplified log barrel style)
//
const LOG_BARK_COLOR = '#5C3A1E'
const LOG_BARK_LIGHT = '#7A5030'
const LOG_BARK_DARK = '#3E2510'
const LOG_END_STEPS = 12
const LOG_END_SQUASH = 0.55
const LOG_CRACK_COUNT = 7
const LOG_KNOT_COUNT = 3
const LOG_RING_COLOR = '#A07050'
const LOG_RING_DARK = '#6B4930'
//
// Speed bonus flash effect on HUD small hero
//
const BONUS_FLASH_COUNT = 20
const BONUS_FLASH_INTERVAL = 0.05
const BONUS_PARTICLE_COUNT = 8
const BONUS_PARTICLE_SPEED_MIN = 30
const BONUS_PARTICLE_SPEED_RANGE = 20
const BONUS_PARTICLE_SIZE_MIN = 4
const BONUS_PARTICLE_SIZE_RANGE = 4

/**
 * Creates a hidden bonus platform with a transparent collectible mini-hero.
 * The platform reveals when the hero approaches from a valid direction.
 * Collecting the mini-hero awards bonus points with a particle effect.
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - Center X of the hidden platform
 * @param {number} config.y - Y position (top of platform)
 * @param {number} config.width - Platform width (visual / log draw)
 * @param {number} [config.collisionWidth] - Collision box width (defaults to width)
 * @param {Object} config.heroInst - Main hero instance to track
 * @param {Object} config.levelIndicator - Level indicator for score display
 * @param {Object} [config.sfx] - Sound instance
 * @param {boolean} [config.approachFromAbove] - Only reveal when hero falls from above
 * @param {number} [config.revealDistance] - Custom reveal distance
 * @param {string} [config.heroBodyColor] - Body color for the mini-hero (defaults to main hero color)
 * @param {string} [config.storageKey] - localStorage key to persist collection state
 * @param {string} [config.platformText] - Time-style text for platform (e.g. "00:00"); uses log if null
 * @param {number} [config.platformFontSize] - Override font size for time-style platform text
 * @param {number} [config.platformCollisionHeight] - Override collision height for time-style platform
 * @param {number} [config.platformCollisionTopTrim] - Pixels trimmed from the top of the collision box
 * @param {number} [config.platformCollisionXOffset] - Horizontal shift of collision box (right = positive)
 * @param {number} [config.platformCollisionYOffset] - Vertical shift of collision box (down = positive)
 * @param {number} [config.platformZ] - Z-index for platform collision and draw layer
 * @param {number} [config.triggerBelowY] - If set, the platform only reveals when the
 *   hero's center Y exceeds this value while falling. Use this when the hidden platform
 *   is below another floor: the platform stays invisible while the hero walks/jumps on
 *   the floor above and only activates once the hero has dropped past that floor.
 * @param {Function} [config.customPlatformDraw] - Replaces the built-in revealed
 *   platform drawing. Called as customPlatformDraw(inst) so levels can render the
 *   platform in their own visual style (e.g. glow letter logs).
 * @returns {Object} Bonus hero instance
 */
export function create(config) {
  const {
    k, x, y, width,
    heroInst, levelIndicator, sfx,
    approachFromAbove = false,
    revealDistance = APPROACH_DISTANCE,
    revealWidth = null,
    collisionWidth = null,
    heroBodyColor = null,
    storageKey = null,
    platformText = null,
    platformFontSize = TIME_PLATFORM_FONT_SIZE,
    platformCollisionHeight = null,
    platformCollisionTopTrim = 0,
    triggerBelowY = null,
    requireMovingToward = false,
    platformCollisionXOffset = 0,
    platformCollisionYOffset = 0,
    platformZ = CFG.visual.zIndex.platforms,
    customPlatformDraw = null,
    collectHintText = BONUS_COLLECT_HINT_TEXT,
    collectHintDuration = HINT_DISPLAY_DURATION
  } = config
  //
  // Skip creation if bonus was already collected in a previous visit
  //
  if (storageKey && get(storageKey, false)) return null
  //
  // Off-screen Y so the collision body is unreachable until hero approaches from above
  //
  const OFF_SCREEN_Y = -5000
  const startY = approachFromAbove ? OFF_SCREEN_Y : y
  //
  // Collision box height: use explicit override if given, otherwise scale with font size
  //
  const collisionHeight = platformCollisionHeight
    ?? (platformText
      ? Math.round(TIME_PLATFORM_COLLISION_HEIGHT * platformFontSize / TIME_PLATFORM_FONT_SIZE)
      : PLATFORM_HEIGHT)
  const collisionWidthResolved = collisionWidth ?? width
  const collisionTopTrim = platformCollisionTopTrim ?? 0
  const collisionXOffset = platformCollisionXOffset ?? 0
  const collisionYOffset = platformCollisionYOffset ?? 0
  const collisionAreaHeight = Math.max(4, collisionHeight - collisionTopTrim)
  const collisionAreaTop = -collisionHeight / 2 + collisionTopTrim
  //
  // Invisible collision platform. `collisionYOffset` slides the entire
  // hidden box down (positive) or up (negative) without changing its size,
  // letting scenes line the collider up with off-center visual props
  // (e.g. logs that sit lower than the calculated anchor point).
  //
  const platform = k.add([
    k.rect(collisionWidthResolved, collisionAreaHeight),
    k.pos(x + collisionXOffset, startY + (approachFromAbove ? 0 : collisionYOffset)),
    k.anchor('center'),
    k.area({
      shape: new k.Rect(
        k.vec2(-collisionWidthResolved / 2, collisionAreaTop),
        collisionWidthResolved,
        collisionAreaHeight
      )
    }),
    k.body({ isStatic: true }),
    k.opacity(0),
    k.z(platformZ),
    CFG.game.platformName
  ])
  //
  // Small hero on the platform (completely invisible - only sparkle hints).
  // Idle vocalization is disabled so this decorative mini hero never emits
  // notes or whistle sounds — only the main playable hero should.
  //
  const miniColor = heroBodyColor || heroInst.bodyColor || CFG.visual.colors.hero.body
  const miniHero = Hero.create({
    k,
    x,
    y: y - PLATFORM_HEIGHT / 2 - 10,
    type: Hero.HEROES.HERO,
    controllable: false,
    isStatic: true,
    scale: HERO_SCALE,
    bodyColor: miniColor,
    idleVocalization: null
  })
  miniHero.character.opacity = 0
  miniHero.character.z = platformZ + 3

  const inst = {
    k,
    platform,
    miniHero,
    heroInst,
    levelIndicator,
    sfx,
    x,
    y,
    width,
    collisionWidth: collisionWidthResolved,
    platformZ,
    collisionHeight,
    collisionAreaTop,
    collisionXOffset,
    collisionYOffset,
    revealed: false,
    collected: false,
    platformOpacity: 0,
    sparkleTimer: SPARKLE_INTERVAL_MIN + Math.random() * (SPARKLE_INTERVAL_MAX - SPARKLE_INTERVAL_MIN),
    sparkleActive: false,
    sparkleT: 0,
    collectParticles: [],
    approachFromAbove,
    revealDistance,
    //
    // revealWidth: horizontal tolerance for hero detection. Defaults to the
    // resolved collision width plus a small margin so the platform reveals
    // along its FULL collider span. Earlier this defaulted to the visual
    // `width`, which left a dead zone whenever `collisionWidth > width` —
    // the hero would land on the very edge of the collider without ever
    // triggering the reveal and tunnel right through.
    //
    revealWidth: revealWidth ?? (Math.max(collisionWidthResolved, width) + 8),
    //
    // When set, primaryDetection is replaced by a Y-threshold check:
    // the platform only activates once the hero's center descends below
    // this Y while falling. Useful when the hidden platform sits beneath
    // another floor — prevents false reveals during jumps above that floor.
    //
    triggerBelowY,
    requireMovingToward,
    bonusPoints: 0,
    bonusFlashParticles: [],
    miniColor,
    offScreenY: OFF_SCREEN_Y,
    customPlatformDraw,
    collectHintText,
    collectHintDuration,
    logDetail: generateLogDetail(width, PLATFORM_HEIGHT),
    storageKey,
    pulseTimer: 0,
    platformText,
    platformFontSize,
    platformCollisionHeight: collisionHeight,
    floatOffset: Math.random() * Math.PI * 2,
    shakeTimer: 0,
    shakeOffsetX: 0,
    //
    // Tracked between frames so the landing detector can catch a hero
    // whose feet swept past the platform surface in a single tick (fast
    // fall + low fps would otherwise tunnel through the invisible log).
    //
    lastHeroFeetY: null,
    //
    // Sticky "hold" timer: once the collider snaps on, we keep it on for
    // at least COLLIDABLE_HOLD_DURATION seconds. This gives Kaplay's
    // discrete physics solver several frames to register the landing
    // (otherwise `isFalling` flips back to false after impact and the
    // platform would teleport away mid-landing, dropping the hero).
    //
    collidableHoldTimer: 0
  }
  //
  // Draw log platform, sparkle hints, and collection particles
  //
  k.add([
    k.pos(0, 0),
    k.z(platformZ + 2),
    {
      draw() {
        onDraw(inst)
      }
    }
  ])
  k.onUpdate(() => onUpdate(inst))
  //
  // Revealed platforms can be destroyed by clicking on them
  //
  k.onClick(() => onClickPlatform(inst))
  return inst
}
/**
 * Persists bonus collection state to localStorage.
 * Must be called by the level on successful completion.
 * Score was already saved in collectBonus — only the storageKey is persisted here
 * so the platform won't reappear on the next visit.
 * @param {Object} inst - Bonus hero instance returned by create()
 */
export function finalizeCollection(inst) {
  if (!inst || !inst.collected) return
  //
  // Mark platform as permanently collected so it won't appear on future visits.
  // Score is not re-added — collectBonus already wrote it to localStorage.
  //
  inst.storageKey && set(inst.storageKey, true)
}
/**
 * Reverts bonus score from localStorage when the hero dies before level completion.
 * Resets collected state so the platform reappears on restart.
 * @param {Object} inst - Bonus hero instance returned by create()
 */
export function revertCollection(inst) {
  if (!inst || !inst.collected) return
  //
  // Undo the score that collectBonus wrote to localStorage
  //
  const currentScore = get('heroScore', 0)
  set('heroScore', Math.max(0, currentScore - inst.bonusPoints))
  inst.collected = false
  inst.bonusPoints = 0
}

/**
 * True when the hero is grounded on this revealed bonus platform
 * @param {Object} inst - Bonus hero instance
 * @param {Object} heroInst - Main hero instance
 * @returns {boolean}
 */
export function isHeroStandingOn(inst, heroInst) {
  const ch = heroInst?.character
  if (!inst?.revealed || inst.collected || !ch?.exists?.()) return false
  if (!ch.isGrounded?.()) return false
  const heroPos = ch.pos
  const collisionCenterX = inst.x + (inst.collisionXOffset ?? 0)
  if (Math.abs(heroPos.x - collisionCenterX) >= inst.revealWidth / 2) return false
  const floatY = inst.platformText
    ? inst.y + Math.sin(inst.floatOffset) * FLOAT_AMPLITUDE
    : inst.y
  const platformSurface = floatY + inst.collisionAreaTop
  const heroFeetY = heroPos.y + HERO_FEET_OFFSET
  return heroFeetY >= platformSurface - LAND_TOLERANCE
    && heroFeetY <= platformSurface + inst.revealDistance
}
//
// Per-frame update: reveal, sparkle, collection detection
//
function onUpdate(inst) {
  const dt = inst.k.dt()
  //
  // Float animation for time-style platforms (continues after bonus collection)
  //
  inst.platformText && (inst.floatOffset += dt * FLOAT_SPEED)
  if (inst.collected) {
    updateCollectParticles(inst, dt)
    updateBonusFlashParticles(inst, dt)
    //
    // Keep platform swaying after the mini-hero is collected
    //
    if (inst.revealed && inst.platformText) {
      const floatYCollected = inst.y + Math.sin(inst.floatOffset) * FLOAT_AMPLITUDE
      inst.platform.pos.y = floatYCollected + inst.collisionYOffset
      inst.platform.pos.x = inst.x + inst.collisionXOffset
    }
    return
  }
  const heroPos = inst.heroInst.character?.pos
  if (!heroPos) return
  //
  // Current Y with optional float
  //
  const floatY = inst.platformText
    ? inst.y + Math.sin(inst.floatOffset) * FLOAT_AMPLITUDE
    : inst.y
  //
  // Shake animation: platform vibrates before being destroyed
  //
  if (inst.shakeTimer > 0) {
    inst.shakeTimer -= dt
    if (inst.shakeTimer <= 0) {
      inst.shakeTimer = 0
      inst.shakeOffsetX = 0
      inst.platform.pos.y = inst.offScreenY
      inst.revealed = false
      inst.platformOpacity = 0
      inst.miniHero.character.opacity = 0
    } else {
      inst.shakeOffsetX = Math.sin(inst.shakeTimer * SHAKE_FREQUENCY * Math.PI * 2) * SHAKE_INTENSITY
        * (inst.shakeTimer / SHAKE_DURATION)
    }
  }
  const collisionCenterX = inst.x + inst.collisionXOffset
  //
  // Text platforms sway together with their collision box
  //
  const collisionY = inst.platformText ? floatY : (inst.revealed ? inst.y : floatY)
  const heroChar = inst.heroInst.character
  const velX = heroChar.vel?.x || 0
  const velY = heroChar.vel?.y || 0
  const predictedHeroX = heroPos.x + velX * dt * VELOCITY_PREDICTION_FRAMES
  const dx = Math.abs(heroPos.x - collisionCenterX)
  const dxPredicted = Math.abs(predictedHeroX - collisionCenterX)
  const dy = heroPos.y - floatY
  //
  // One-way platform: only collidable when hero is actively falling with feet
  // very close to the surface. The platform must stay off-screen unless the hero
  // is about to land, so it never interferes with upward jumps or side movement.
  //
  if (inst.revealed) {
    inst.platform.pos.y = collisionY + inst.collisionYOffset
    inst.platform.pos.x = collisionCenterX
  } else {
    const platformSurfacePre = floatY + inst.collisionYOffset + inst.collisionAreaTop
    const heroFeetYPre = heroPos.y + HERO_FEET_OFFSET
    const heroAboveSurfacePre = heroFeetYPre < platformSurfacePre - 5
    const aboveMargin = heroAboveSurfacePre ? 52 : 8
    const collLeft = collisionCenterX - inst.collisionWidth / 2 - aboveMargin
    const collRight = collisionCenterX + inst.collisionWidth / 2 + aboveMargin
    const horizontallyAligned = heroPos.x >= collLeft && heroPos.x <= collRight
      || (predictedHeroX >= collLeft && predictedHeroX <= collRight)
    //
    // Pre-compute the platform's collidable surface so the heroOnPlatform
    // check below can verify the hero is grounded AT this platform (and
    // not on some unrelated platform above/below that just happens to be
    // horizontally aligned with the bonus). The aggressive APPROACH_DISTANCE
    // means the collider may be live even when the hero is far above.
    //
    const heroAtPlatformSurface = Math.abs(heroFeetYPre - platformSurfacePre) <= LAND_TOLERANCE * 1.5
    //
    // Check grounded BEFORE moving the platform, so the hero stays supported.
    // If the platform was collidable last frame and hero landed, isGrounded()
    // is true while the collision body is still in place.
    //
    const heroOnPlatform = heroChar.isGrounded?.() && horizontallyAligned
      && heroAtPlatformSurface
      && inst.platform.pos.y !== inst.offScreenY
    if (heroOnPlatform) {
      inst.revealed = true
      inst.platform.pos.y = collisionY + inst.collisionYOffset
      inst.platform.pos.x = collisionCenterX
    } else {
      //
      // Use hero feet position (not center) to determine if the hero
      // is about to land. Only make collidable when feet are directly
      // above the platform surface and hero is falling downward. The
      // detection surface tracks the collision box so a downward Y offset
      // doesn't break landing detection.
      //
      // Reveal logic (kept simple and aggressive to avoid timing issues):
      //
      //   ENABLE the invisible collider whenever the hero is *above* the
      //   platform top AND within APPROACH_DISTANCE vertically AND
      //   horizontally aligned — regardless of his current velocity.
      //
      // A previous version of this code gated detection behind
      // `isFalling = velY > 0`, but that read the velocity AFTER Kaplay
      // had already moved the body in the same frame, so a fast-falling
      // hero could pass the platform during physics before our detector
      // ran. By enabling the collider while the hero is still strictly
      // above it (with a 5 px head-room margin so jumps from below don't
      // bump it on the way up), the platform is always live by the time
      // the hero's body actually intersects it.
      //
      // Three additional safety nets cover edge cases:
      //   * Velocity prediction — projected feet next frames would land.
      //   * Sweep detection — feet jumped from above to below in one tick.
      //   * Sticky hold — once the collider is enabled, it stays live
      //     for COLLIDABLE_HOLD_DURATION so Kaplay's discrete physics
      //     solver has multiple frames to register the landing before we
      //     hide the collider again.
      //
      const platformSurface = floatY + inst.collisionYOffset + inst.collisionAreaTop
      const heroFeetY = heroPos.y + HERO_FEET_OFFSET
      const isFalling = velY > 0
      //
      // 5 px margin keeps a hero who is jumping up from below the
      // platform from triggering it the instant his head reaches the
      // bottom of the collider — he must be clearly above the surface
      // before the platform pops in.
      //
      const ABOVE_MARGIN = 5
      const heroAboveSurface = heroFeetY < platformSurface - ABOVE_MARGIN
      const towardCenter = Math.sign(collisionCenterX - heroPos.x)
      const movingToward = Math.abs(velX) > 12 && towardCenter !== 0 && Math.sign(velX) === towardCenter
      //
      // While the hero is strictly above the platform AND already falling,
      // switch to a larger reveal window so the collider is in place well
      // before the body arrives — a tight window can be crossed in a single
      // physics tick at high fall velocity, causing the hero to tunnel through.
      // The expanded distance is only active while `isFalling` is true, so it
      // never fires from a floor below the platform where the hero is standing.
      //
      const effectiveRevealDist = (inst.requireMovingToward && heroAboveSurface && movingToward)
        || (isFalling && heroAboveSurface)
        ? Math.max(inst.revealDistance, FALLING_REVEAL_DISTANCE)
        : inst.revealDistance
      const heroWithinApproachRange = heroFeetY > platformSurface - effectiveRevealDist
      //
      // triggerBelowY mode: ignore proximity to the hidden platform itself.
      // Instead, activate only when the hero's center has dropped past the
      // reference Y (e.g. the first-floor surface level) while falling.
      // This prevents any reveal during a jump that passes over the platform
      // from above — the platform only appears after the hero has actually
      // fallen clear below the floor above it.
      //
      const primaryDetection = inst.requireMovingToward
        ? (heroAboveSurface && movingToward && heroWithinApproachRange)
        : inst.triggerBelowY !== null
          ? (isFalling && heroPos.y > inst.triggerBelowY)
          : (heroAboveSurface && heroWithinApproachRange)
      const predictedFeetY = heroFeetY + velY * dt * VELOCITY_PREDICTION_FRAMES
      const willCrossSurface = isFalling
        && heroFeetY <= platformSurface + LAND_TOLERANCE
        && predictedFeetY >= platformSurface - LAND_TOLERANCE
      const sweptThroughSurface = isFalling
        && inst.lastHeroFeetY !== null
        && inst.lastHeroFeetY <= platformSurface + LAND_TOLERANCE
        && heroFeetY > platformSurface
        && heroFeetY <= platformSurface + inst.revealDistance
      const detected = horizontallyAligned && (
        primaryDetection
        || willCrossSurface
        || sweptThroughSurface
      )
      //
      // Fast diagonal falls can skip the collider in a single tick — snap
      // the hero onto the platform surface so he cannot tunnel through.
      //
      if (sweptThroughSurface && horizontallyAligned && isFalling) {
        heroChar.pos.y = platformSurface - HERO_FEET_OFFSET
        heroChar.vel && (heroChar.vel.y = 0)
        inst.revealed = true
        inst.collidableHoldTimer = COLLIDABLE_HOLD_DURATION
      }
      //
      // Refresh the sticky-hold timer whenever the detector fires. The
      // platform then stays collidable for COLLIDABLE_HOLD_DURATION even
      // if `velY` momentarily drops to zero on impact, or the detector
      // briefly flips off during the last few pixels before contact.
      //
      if (detected) {
        inst.collidableHoldTimer = COLLIDABLE_HOLD_DURATION
      } else if (inst.collidableHoldTimer > 0) {
        inst.collidableHoldTimer -= dt
      }
      //
      // Hold guard: keep the platform live as long as the hold timer
      // hasn't expired AND the hero is still aligned + near the
      // platform's vertical band. Disengage the hold the moment the
      // hero clearly drifts away so a jump from below doesn't get
      // stopped mid-air.
      //
      const stillNearVertically = heroFeetY > platformSurface - inst.revealDistance * 1.5
        && heroFeetY < platformSurface + inst.revealDistance
      const heldOpen = inst.collidableHoldTimer > 0 && horizontallyAligned && stillNearVertically
      const shouldBeCollidable = detected || heldOpen
      inst.platform.pos.y = shouldBeCollidable ? floatY + inst.collisionYOffset : inst.offScreenY
      inst.platform.pos.x = collisionCenterX
      //
      // Pop the log in as soon as the collider goes live while the hero
      // is falling (or during the post-detect hold window) so the
      // platform reads as solid on the frame of impact — not only after
      // Kaplay marks the hero grounded one tick later.
      //
      shouldBeCollidable && (isFalling || inst.collidableHoldTimer > 0) && (inst.revealed = true)
    }
    //
    // Remember this frame's foot position so the next frame can detect a
    // sweep-through if the hero falls past the surface in one tick.
    //
    inst.lastHeroFeetY = heroPos.y + HERO_FEET_OFFSET
  }
  //
  // Once revealed: show platform and start mini-hero opacity pulse
  //
  if (inst.revealed && inst.platformOpacity < 1) {
    inst.platformOpacity = 1
  }
  //
  // Float mini-hero position together with platform
  //
  if (inst.platformText && inst.miniHero.character.exists()) {
    inst.miniHero.character.pos.y = floatY - PLATFORM_HEIGHT / 2 - 10
  }
  //
  // Post-reveal: pulse mini-hero opacity (visible only when platform is revealed)
  //
  if (inst.revealed && !inst.collected) {
    inst.pulseTimer += dt
    const pulse = (Math.sin(inst.pulseTimer * PULSE_SPEED) + 1) / 2
    inst.miniHero.character.opacity = PULSE_MIN_OPACITY + pulse * (PULSE_MAX_OPACITY - PULSE_MIN_OPACITY)
  }
  //
  // Sparkle hint (visible even before platform reveal)
  //
  updateSparkle(inst, dt)
  //
  // Collection check: hero touches the mini-hero area
  //
  if (inst.revealed) {
    const heroX = heroPos.x
    const heroY = heroPos.y
    const collectDist = 40
    if (Math.abs(heroX - inst.x) < collectDist && Math.abs(heroY - (inst.y - PLATFORM_HEIGHT / 2 - 10)) < collectDist + 20) {
      collectBonus(inst)
    }
  }
  updateCollectParticles(inst, dt)
  updateBonusFlashParticles(inst, dt)
}
//
// Sparkle timer and activation
//
function updateSparkle(inst, dt) {
  if (inst.sparkleActive) {
    inst.sparkleT += dt
    if (inst.sparkleT >= SPARKLE_DURATION) {
      inst.sparkleActive = false
      inst.sparkleTimer = SPARKLE_INTERVAL_MIN + Math.random() * (SPARKLE_INTERVAL_MAX - SPARKLE_INTERVAL_MIN)
    }
  } else {
    inst.sparkleTimer -= dt
    if (inst.sparkleTimer <= 0) {
      inst.sparkleActive = true
      inst.sparkleT = 0
    }
  }
}
//
// Draw log platform, sparkle effect, and collection particles
//
function onDraw(inst) {
  const { k } = inst
  //
  // Apply shake offset to platform and mini-hero during destruction animation
  //
  if (inst.shakeTimer > 0) {
    inst.platform.pos.x = inst.x + inst.collisionXOffset + inst.shakeOffsetX
    inst.miniHero.character.pos.x = inst.x + inst.shakeOffsetX
  } else if (inst.revealed) {
    inst.miniHero.character.pos.x = inst.x
  }
  //
  // Draw platform when revealed
  //
  if (inst.revealed && inst.platformOpacity > 0) {
    if (inst.customPlatformDraw) {
      inst.customPlatformDraw(inst)
    } else if (inst.platformText) {
      drawTimePlatform(inst)
    } else {
      drawLogPlatform(inst)
    }
  }
  //
  // Pre-reveal sparkle: small glint dot visible even before platform is revealed
  //
  if (!inst.collected && !inst.revealed) {
    inst.miniHero.character.opacity = 0
    if (inst.sparkleActive) {
      drawSparkleGlint(inst)
    }
  }
  //
  // Collection burst particles
  //
  drawCollectParticles(inst)
  drawBonusFlashParticles(inst)
}
//
// Small sparkle glint drawn at the bonus hero position (pre-reveal hint)
//
function drawSparkleGlint(inst) {
  const { k, x, sparkleT } = inst
  const baseY = inst.platformText
    ? inst.y + Math.sin(inst.floatOffset) * FLOAT_AMPLITUDE
    : inst.y
  const glintY = baseY - PLATFORM_HEIGHT / 2 - 10
  const t = sparkleT / SPARKLE_DURATION
  const opacity = t < 0.3 ? t / 0.3 : (1 - t) / 0.7
  const glintColor = k.rgb(SPARKLE_COLOR_R, SPARKLE_COLOR_G, SPARKLE_COLOR_B)
  const r = SPARKLE_RADIUS * (0.6 + opacity * 0.4)
  //
  // Soft outer glow
  //
  k.drawCircle({ pos: k.vec2(x, glintY), radius: r * 2, color: glintColor, opacity: opacity * 0.15 })
  //
  // Bright core
  //
  k.drawCircle({ pos: k.vec2(x, glintY), radius: r, color: glintColor, opacity: opacity * 0.7 })
}
//
// Draw time-style text platform (e.g. "00:00" or "00")
//
function drawTimePlatform(inst) {
  const { k, platformOpacity, platformText, platformFontSize, floatOffset } = inst
  const x = inst.x + inst.shakeOffsetX
  const floatY = inst.y + Math.sin(floatOffset) * FLOAT_AMPLITUDE
  const outlineOffsets = [[-2, -2], [0, -2], [2, -2], [-2, 0], [2, 0], [-2, 2], [0, 2], [2, 2]]
  //
  // Black outline text (8 directions)
  //
  outlineOffsets.forEach(([ox, oy]) => {
    k.drawText({
      text: platformText,
      size: platformFontSize,
      font: CFG.visual.fonts.thinFull.replace(/'/g, ''),
      pos: k.vec2(x + ox, floatY + oy),
      anchor: 'center',
      color: k.rgb(0, 0, 0),
      opacity: platformOpacity
    })
  })
  //
  // Main gray text
  //
  k.drawText({
    text: platformText,
    size: platformFontSize,
    font: CFG.visual.fonts.thinFull.replace(/'/g, ''),
    pos: k.vec2(x, floatY),
    anchor: 'center',
    color: k.rgb(192, 192, 192),
    opacity: platformOpacity
  })
}
//
// Draw a simplified log-style platform
//
function drawLogPlatform(inst) {
  const { k, y, width, platformOpacity } = inst
  const x = inst.x + inst.shakeOffsetX
  const w = width
  const h = PLATFORM_HEIGHT
  const halfW = w / 2
  const halfH = h / 2
  const endR = halfH
  const sq = LOG_END_SQUASH
  const opacity = platformOpacity
  const barkColor = getRGB(k, LOG_BARK_COLOR)
  const barkLight = getRGB(k, LOG_BARK_LIGHT)
  const barkDark = getRGB(k, LOG_BARK_DARK)
  //
  // Main barrel body
  //
  const bodyPts = []
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    bodyPts.push(k.vec2(x - halfW + endR * Math.cos(a) * sq, y + endR * Math.sin(a)))
  }
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = -Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    bodyPts.push(k.vec2(x + halfW + endR * Math.cos(a) * sq, y + endR * Math.sin(a)))
  }
  //
  // Dark shadow outline
  //
  k.drawPolygon({ pts: bodyPts.map(p => k.vec2(p.x, p.y + 2)), color: k.rgb(0, 0, 0), opacity: 0.4 * opacity })
  //
  // Bark body
  //
  k.drawPolygon({ pts: bodyPts, color: barkColor, opacity })
  //
  // Light streak on top half
  //
  const topPts = []
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    const r = endR * 0.85
    topPts.push(k.vec2(x - halfW + r * Math.cos(a) * sq, y + r * Math.sin(a) * 0.45 - halfH * 0.2))
  }
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = -Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    const r = endR * 0.85
    topPts.push(k.vec2(x + halfW + r * Math.cos(a) * sq, y + r * Math.sin(a) * 0.45 - halfH * 0.2))
  }
  k.drawPolygon({ pts: topPts, color: barkLight, opacity: 0.5 * opacity })
  //
  // Horizontal bark lines
  //
  for (let i = 0; i < 3; i++) {
    const ly = y - halfH + (h / 4) * (i + 1)
    k.drawRect({
      pos: k.vec2(x - halfW + endR * sq, ly),
      width: w - endR * sq * 2,
      height: 1,
      color: barkDark,
      opacity: 0.3 * opacity
    })
  }
  //
  // Cracks: short dark diagonal lines across the bark
  //
  const detail = inst.logDetail
  for (const crack of detail.cracks) {
    const cdx = Math.cos(crack.angle) * crack.len * 0.5
    const cdy = Math.sin(crack.angle) * crack.len * 0.5
    k.drawLines({
      pts: [k.vec2(x + crack.x - cdx, y + crack.y - cdy), k.vec2(x + crack.x + cdx, y + crack.y + cdy)],
      width: 1.5,
      color: barkDark,
      opacity: 0.7 * opacity
    })
  }
  //
  // Knots: dark ovals with lighter centers on the bark surface
  //
  for (const knot of detail.knots) {
    k.drawEllipse({ pos: k.vec2(x + knot.x, y + knot.y), radiusX: knot.r, radiusY: knot.r * 0.7, color: barkDark, opacity: 0.6 * opacity })
    k.drawEllipse({ pos: k.vec2(x + knot.x, y + knot.y), radiusX: knot.r * 0.45, radiusY: knot.r * 0.3, color: barkLight, opacity: 0.4 * opacity })
  }
  //
  // Right end-grain oval with ring details
  //
  const endCX = x + halfW
  const ringColor = getRGB(k, LOG_RING_COLOR)
  const ringDark = getRGB(k, LOG_RING_DARK)
  k.drawEllipse({ pos: k.vec2(endCX, y), radiusX: endR * sq, radiusY: endR, color: ringColor, opacity })
  k.drawEllipse({ pos: k.vec2(endCX, y), radiusX: endR * sq * 0.75, radiusY: endR * 0.75, color: k.rgb(196, 149, 106), opacity })
  k.drawEllipse({ pos: k.vec2(endCX, y), radiusX: endR * sq * 0.5, radiusY: endR * 0.5, color: ringDark, opacity: 0.3 * opacity })
  k.drawEllipse({ pos: k.vec2(endCX, y), radiusX: endR * sq * 0.2, radiusY: endR * 0.2, color: barkDark, opacity: 0.5 * opacity })
}
//
// Generate random crack and knot positions for a log platform
//
function generateLogDetail(w, h) {
  const halfW = w / 2
  const halfH = h / 2
  const cracks = []
  for (let i = 0; i < LOG_CRACK_COUNT; i++) {
    cracks.push({
      x: -halfW * 0.8 + Math.random() * w * 0.75,
      y: -halfH * 0.8 + Math.random() * h * 0.8,
      angle: Math.random() * Math.PI,
      len: 6 + Math.random() * 10
    })
  }
  const knots = []
  for (let i = 0; i < LOG_KNOT_COUNT; i++) {
    knots.push({
      x: -halfW * 0.6 + Math.random() * w * 0.5,
      y: -halfH * 0.4 + Math.random() * h * 0.4,
      r: 3 + Math.random() * 3
    })
  }
  return { cracks, knots }
}
//
// Collect the bonus: update in-memory HUD display only.
// Intentionally does NOT write to localStorage — that is deferred to
// finalizeCollection() which the level calls only on successful completion.
// If the hero dies, the level restarts without any saved state, so the
// platform reappears and the score reverts to its pre-collection value.
//
function collectBonus(inst) {
  if (inst.collected) return
  inst.collected = true
  inst.miniHero.character.opacity = 0
  inst.miniHero.character.paused = true
  //
  // Update HUD display AND localStorage immediately so the buy-help button
  // can read the correct score from tryPurchaseHelp (which reads localStorage).
  // finalizeCollection still persists on level completion as before.
  //
  const currentScore = get('heroScore', 0)
  const newScore = currentScore + BONUS_POINTS
  inst.bonusPoints = BONUS_POINTS
  set('heroScore', newScore)
  inst.levelIndicator?.updateHeroScore?.(newScore)
  //
  // Play collection sound
  //
  playCollectSound(inst)
  //
  // Spawn burst particles at collection point
  //
  for (let i = 0; i < COLLECT_PARTICLE_COUNT; i++) {
    const angle = (i / COLLECT_PARTICLE_COUNT) * Math.PI * 2
    const speed = COLLECT_PARTICLE_SPEED * (0.6 + Math.random() * 0.8)
    inst.collectParticles.push({
      x: inst.x,
      y: inst.y - PLATFORM_HEIGHT / 2 - 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      life: COLLECT_PARTICLE_LIFETIME,
      maxLife: COLLECT_PARTICLE_LIFETIME,
      size: 3 + Math.random() * 4,
      color: Math.random() > 0.5 ? 'gold' : 'white'
    })
  }
  //
  // Show hint tooltip above the main hero
  //
  showCollectHint(inst)
  //
  // Trigger speed bonus flash on the HUD small hero
  //
  playBonusFlash(inst, 0)
  createBonusFlashParticles(inst)
}
//
// Flash the HUD small hero between its color and white (same as speed bonus)
//
function playBonusFlash(inst, count) {
  if (count >= BONUS_FLASH_COUNT) {
    inst.levelIndicator?.smallHero?.character && (inst.levelIndicator.smallHero.character.color = inst.k.rgb(255, 255, 255))
    return
  }
  if (!inst.levelIndicator?.smallHero?.character) return
  const heroColor = getRGB(inst.k, inst.miniColor)
  inst.levelIndicator.smallHero.character.color = count % 2 === 0 ? heroColor : inst.k.rgb(255, 255, 255)
  inst.k.wait(BONUS_FLASH_INTERVAL, () => playBonusFlash(inst, count + 1))
}
//
// Create outward-flying particles from the HUD small hero
//
function createBonusFlashParticles(inst) {
  if (!inst.levelIndicator?.smallHero?.character) return
  const sx = inst.levelIndicator.smallHero.character.pos.x
  const sy = inst.levelIndicator.smallHero.character.pos.y
  const heroColor = getRGB(inst.k, inst.miniColor)
  for (let i = 0; i < BONUS_PARTICLE_COUNT; i++) {
    const angle = (i / BONUS_PARTICLE_COUNT) * Math.PI * 2
    const speed = BONUS_PARTICLE_SPEED_MIN + Math.random() * BONUS_PARTICLE_SPEED_RANGE
    inst.bonusFlashParticles.push({
      x: sx,
      y: sy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.8,
      maxLife: 0.8,
      size: BONUS_PARTICLE_SIZE_MIN + Math.random() * BONUS_PARTICLE_SIZE_RANGE,
      color: heroColor
    })
  }
}
//
// Update collection particles
//
function updateCollectParticles(inst, dt) {
  for (let i = inst.collectParticles.length - 1; i >= 0; i--) {
    const p = inst.collectParticles[i]
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 150 * dt
    p.life -= dt
    if (p.life <= 0) inst.collectParticles.splice(i, 1)
  }
}
//
// Update HUD flash particles
//
function updateBonusFlashParticles(inst, dt) {
  for (let i = inst.bonusFlashParticles.length - 1; i >= 0; i--) {
    const p = inst.bonusFlashParticles[i]
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.life -= dt
    if (p.life <= 0) inst.bonusFlashParticles.splice(i, 1)
  }
}
//
// Draw collection burst particles
//
function drawCollectParticles(inst) {
  const { k } = inst
  for (const p of inst.collectParticles) {
    const alpha = Math.max(0, p.life / p.maxLife)
    const color = p.color === 'gold'
      ? k.rgb(SPARKLE_COLOR_R, SPARKLE_COLOR_G, SPARKLE_COLOR_B)
      : k.rgb(240, 240, 240)
    k.drawCircle({ pos: k.vec2(p.x, p.y), radius: p.size * alpha, color, opacity: alpha })
  }
}
//
// Draw HUD flash particles (fixed position, drawn above UI)
//
function drawBonusFlashParticles(inst) {
  const { k } = inst
  for (const p of inst.bonusFlashParticles) {
    const alpha = Math.max(0, p.life / p.maxLife)
    k.drawCircle({ pos: k.vec2(p.x, p.y), radius: p.size * alpha, color: p.color, opacity: alpha, fixed: true })
  }
}
//
// Display tooltip hint above the main hero on bonus collection
//
function showCollectHint(inst) {
  const heroPos = inst.heroInst.character?.pos
  if (!heroPos) return
  const target = {
    x: () => inst.heroInst.character?.pos?.x ?? heroPos.x,
    y: () => inst.heroInst.character?.pos?.y ?? heroPos.y,
    width: 1,
    height: 1,
    text: inst.collectHintText,
    offsetY: -60
  }
  const tooltip = Tooltip.create({
    k: inst.k,
    targets: [target],
    forceVisible: true
  })
  //
  // forceVisible skips onUpdate, so we must populate the rendering state manually
  //
  tooltip.activeTarget = target
  tooltip.frozenX = heroPos.x
  tooltip.frozenY = heroPos.y
  tooltip.opacity = 1
  inst.k.wait(inst.collectHintDuration, () => tooltip && Tooltip.destroy(tooltip))
}
//
// Plays a short bright chime sound on collection
//
function playCollectSound(inst) {
  if (!inst.sfx) return
  const ctx = inst.sfx.audioContext
  if (!ctx || ctx.state !== 'running') return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, now)
  osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15)
  gain.gain.setValueAtTime(0.2, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.4)
  //
  // Higher harmonic for sparkle
  //
  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()
  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(1320, now + 0.05)
  osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.2)
  gain2.gain.setValueAtTime(0.1, now + 0.05)
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
  osc2.connect(gain2)
  gain2.connect(ctx.destination)
  osc2.start(now + 0.05)
  osc2.stop(now + 0.4)
}
//
// Handle click on revealed log platform — destroy it so hero falls through
//
function onClickPlatform(inst) {
  if (!inst.revealed || inst.collected || inst.shakeTimer > 0) return
  const { k } = inst
  const mousePos = k.mousePos()
  const halfW = inst.collisionWidth / 2
  const floatY = inst.y + Math.sin(k.time() * FLOAT_SPEED + inst.floatOffset) * FLOAT_AMPLITUDE
  const halfH = inst.collisionHeight / 2
  const withinX = mousePos.x >= inst.x - halfW && mousePos.x <= inst.x + halfW
  const withinY = mousePos.y >= floatY - halfH && mousePos.y <= floatY + halfH
  if (!withinX || !withinY) return
  //
  // Start shake animation, then destroy
  //
  inst.shakeTimer = SHAKE_DURATION
  playCrackleSound(inst)
}
//
// Crackle sound for platform destruction
//
function playCrackleSound(inst) {
  if (!inst.sfx) return
  const ctx = inst.sfx.audioContext
  if (!ctx || ctx.state !== 'running') return
  const now = ctx.currentTime
  const noise = ctx.createBufferSource()
  const bufferSize = ctx.sampleRate * 0.3
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5
  }
  noise.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(800, now)
  filter.Q.value = 1.5
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.25, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
  noise.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  noise.start(now)
  noise.stop(now + 0.3)
}
