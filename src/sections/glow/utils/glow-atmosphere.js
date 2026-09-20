import { CFG } from '../../../cfg.js'
import { get, set } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import { toCanvas } from '../../../utils/helper.js'
import { drawCuteMushroomToCanvas, CUTE_MUSHROOM_ASPECT, TRAMP_FACE_EYE_SCALE } from './cute-mushroom.js'
import {
  GLOW_PAL,
  glowRgb,
  snapToPalette,
  getCuteMushroomFlatDecorColors,
  getCuteMushroomFlatPitBakeColors
} from './glow-palette.js'
import { buildRockVertices } from '../../../utils/draw-rock.js'
import * as GlowFootParticles from './glow-foot-particles.js'
import {
  drawPitCaveSkeleton,
  caveSkeletonPitFloorTones,
  caveSkeletonEyeIntroTones
} from './glow-cave-skeleton.js'
//
// Midges + right-edge crack pit for the glow level
//
const HERO_BODY_W = 48
const HERO_BODY_H = 96
//
// Cave mouth ~3.4 hero-widths — wider entrance extending further left
//
const CRACK_ZONE_W = Math.round(HERO_BODY_W * 3.4)
const PIT_WALL_W = 20
//
// Asymmetric cave-floor padding — a wide right shelf blocked jumps under the
// entrance lip; keep most of the width on the left wall only.
//
const PIT_FLOOR_EXTRA_W_LEFT = 18
//
// Pit floor reaches the cave mouth's right wall (zone.x2 minus soft clamp).
//
const PIT_FLOOR_EXTRA_W_RIGHT = PIT_WALL_W
//
// Horizontal shelf of rocks at the cave mouth (above the skull) — centred on
// the skull anchor; keep narrow so it does not span the whole mouth.
//
const CAVE_SEAM_TOP_SHELF_HALF_W = 12
//
// Invisible lip shelf at the cave mouth (hero stands here above the skull).
//
const PIT_MOUTH_WALK_SHELF_W = 22
//
// Shorten the mouth lip shelf from the left and widen the cave entrance by the
// same amount (hero stand lip above the skull cross-section).
//
export const CAVE_MOUTH_ENTRANCE_EXPAND_LEFT = 42
//
// Main playfield floor and sealed crack lid start this far left of the cave
// mouth — smaller values shift the overhang lip right above the pit opening.
//
export const CAVE_MOUTH_MAIN_FLOOR_INSET = 22
//
// 2/3 field midges across the playfield, 1/3 clustered at the cave mouth
//
const MIDGE_TOTAL = 30
const MIDGE_PIT_COUNT = Math.round(MIDGE_TOTAL / 3)
const MIDGE_FIELD_COUNT = MIDGE_TOTAL - MIDGE_PIT_COUNT
const MIDGE_SPEED_MIN = 8
const MIDGE_SPEED_MAX = 22
const MIDGE_RADIUS_MIN = 1.2
const MIDGE_RADIUS_MAX = 2.4
const MIDGE_Z = 14
//
// Skip midge circles that sit well outside the current camera window.
//
const MIDGE_DRAW_CULL_PAD = 48
const MIDGE_PIT_SPREAD_X = 36
const MIDGE_PIT_SPREAD_Y = 26
const PIT_TRAMP_FORCE = 920
const PIT_TRAMP_COOLDOWN = 0.55
const PIT_TRAMP_W = 36
const PIT_DEPTH = Math.round(HERO_BODY_H * 1.65)
//
// Wider invisible cap than the painted mushroom — forgiving landings still
// trigger the pit bounce without pixel-perfect centre hits.
//
const PIT_TRAMP_CAP_HALF_W = PIT_TRAMP_W * 0.88
//
// Cave interior waits until the hero has dropped past the mouth lip — avoids
// a flat horizontal bar flashing across the opening on the collapse frame.
//
const CAVE_INTERIOR_REVEAL_FEET_PAST = 14
const PIT_DRAW_CULL_MARGIN = 80
const PIT_PARTICLE_COUNT = 28
//
// Five jump landings on the crack mouth also open the cave (stomp path)
//
const CRACK_STOMP_OPENS = 5
const CRACK_STOMP_FEET_MAX = 14
const CRACK_FALL_OPEN_FEET_MAX = 90
const CRACK_STOMP_PARTICLE_MULT = 2.8
//
// Foot tolerance when detecting the hero on the fragment log above the cave.
//
const BONUS_PLAT_FOOT_PAD_ABOVE = 10
const BONUS_PLAT_FOOT_PAD_BELOW = 14
const BONUS_PLAT_FOOT_X_PAD = 16
const PIT_MUSH_SPRITE = 'glow0-pit-mush'
const PIT_MUSH_OUTLINE_SPRITE = 'glow0-pit-mush-outline'
const PIT_MUSH_FLAT_FILL_SPRITE = 'glow0-pit-mush-flat-fill'
const CAVE_LAYOUT_VERSION = 62
const CAVE_SEAM_COLUMN_X_SPREAD = 7
const CAVE_SEAM_COLUMN_RADIUS_MIN = 6.5
const CAVE_SEAM_COLUMN_RADIUS_MAX = 14
const CAVE_SEAM_TOP_RADIUS_MIN = 5
const CAVE_SEAM_TOP_RADIUS_MAX = 11
//
// Slight east overlap so rock radius covers the void polygon west edge.
//
const CAVE_SEAM_COVER_X_BIAS = 4
//
// Whole seam column shifts west by half a typical column rock width (radius).
//
const CAVE_SEAM_COVER_X_LEFT_SHIFT =
  (CAVE_SEAM_COLUMN_RADIUS_MIN + CAVE_SEAM_COLUMN_RADIUS_MAX) * 0.5
const CAVE_SEAM_SCATTER_COUNT = 16
const CAVE_SEAM_SCATTER_X_OFFSET_MIN = 10
const CAVE_SEAM_SCATTER_X_OFFSET_MAX = 32
const CAVE_SEAM_SCATTER_RADIUS_MIN = 4
const CAVE_SEAM_SCATTER_RADIUS_MAX = 11
const CAVE_SEAM_END_CAP_RADIUS_MIN = 7
const CAVE_SEAM_END_CAP_RADIUS_MAX = 12
const CAVE_SEAM_TOP_EXTRA_RIGHT_OFFSET = 15
const CAVE_SEAM_BOTTOM_EXTRA_DROP = 12
//
// Void seam sits west of the skeleton sprite — skeleton + hero play east of it.
//
const CAVE_INTERIOR_WALL_LEFT_OF_SKELETON = 96
//
// Skull anchor X — must match pitCaveEyePickupCenter in glow-cave-skeleton.js.
//
const PIT_CAVE_SKULL_FLOOR_PAD = 20
const PIT_CAVE_SKULL_R = 14 / (0.42 * 2)
//
// Keep in sync with SKELETON_BAKE_PAD in glow-cave-skeleton.js.
//
const CAVE_SKELETON_BAKE_PAD = 22
//
// Drawn half-width matches ensurePitCaveSkeletonSprite (skullR * 5.2 + bake pad) / 2.
//
const CAVE_SKELETON_SPRITE_HALF_W = PIT_CAVE_SKULL_R * 2.6 + CAVE_SKELETON_BAKE_PAD
//
// Extra interior floor width to the left of the mouth — entrance lip unchanged.
//
const CAVE_INTERIOR_EXTEND_LEFT = 132
const CAVE_LEFT_BLOCK_W = 12
const CAVE_INTERIOR_REVEAL_HOLDOFF = 0.35
const CAVE_WALL_ROCK_STEP = 3
const CAVE_WALL_ROCK_LAYERS = 3
//
// Versioned so a CAVE_LAYOUT_VERSION bump (any change to the cave geometry
// generator) always forces a fresh bake. Glow and menu share one native
// Kaplay instance (see engine-switch.js's NATIVE_RESOLUTION_SCENE_PREFIXES),
// so leaving the level and coming back without a full page reload reuses
// the same k — a fixed unversioned sprite name would keep whatever was
// baked on the very first visit to the cave that session, silently
// outliving any later code fix to the geometry it was baked from.
//
const CAVE_INTERIOR_SPRITE = `glow0-cave-interior-v${CAVE_LAYOUT_VERSION}`
const CAVE_BAKE_PAD = 40
const KEY_PIT_COLLAPSED = 'glow.pitCollapsed'
const KEY_EYES_COLLECTED = 'glow.eyesCollected'
const KEY_LAST_SPAWN_MODE = 'glow.lastSpawnMode'
const SPAWN_MODE_CAVE = 'cave'
const LEFT_MARGIN = 100
const RIGHT_MARGIN = 100
/**
 * Horizontal band of the crack / pit zone (right edge of the playfield).
 * @param {number} screenW - Screen width
 * @param {number} floorY - Floor Y
 * @returns {{ x1: number, x2: number, floorY: number, width: number, depth: number }}
 */
export function getCrackZone(screenW, floorY) {
  const x2 = screenW - RIGHT_MARGIN
  const x1 = x2 - CRACK_ZONE_W
  return { x1, x2, floorY, width: CRACK_ZONE_W, depth: PIT_DEPTH }
}
/**
 * True when the hero's feet stand on the sealed crack-lid collider.
 * @param {Object} pit - Pit state
 * @param {number} heroX - Hero X
 * @param {number} footY - Hero feet Y
 * @returns {boolean}
 */
export function isHeroOnCrackLid(pit, heroX, footY) {
  if (!pit || footY == null) return false
  const { zone } = pit
  return heroX >= zone.x1 - CAVE_MOUTH_MAIN_FLOOR_INSET - CAVE_MOUTH_ENTRANCE_EXPAND_LEFT &&
    heroX <= zone.x2 &&
    footY >= pit.floorY - CRACK_STOMP_FEET_MAX &&
    footY <= pit.floorY + 8
}
/**
 * True when a grass blade X sits over the crack band (keep that strip bare).
 * @param {number} x - World X
 * @param {number} screenW - Screen width
 * @returns {boolean}
 */
export function isCrackGrassExcluded(x, screenW) {
  const zone = getCrackZone(screenW, 0)
  return x >= zone.x1 - 8 && x <= zone.x2 + 8
}
/**
 * True when decor (mushroom / rock) should stay clear of the cave mouth.
 * @param {number} x - World X
 * @param {number} screenW - Screen width
 * @returns {boolean}
 */
export function isCrackDecorExcluded(x, screenW) {
  const zone = getCrackZone(screenW, 0)
  //
  // Symmetric buffer — the cave wall wobbles by the same amplitude on
  // either side (buildCaveMouthEdge), so a decor piece placed just past an
  // asymmetric +8 buffer on the right could still end up sitting on top of
  // the wall when it swings outward that frame.
  //
  const mouthPad = CAVE_MOUTH_MAIN_FLOOR_INSET + CAVE_MOUTH_ENTRANCE_EXPAND_LEFT
  return x >= zone.x1 - mouthPad && x <= zone.x2 + CAVE_MOUTH_MAIN_FLOOR_INSET
}
/**
 * Creates midges: 1/3 at the cave mouth, 2/3 spread across the playfield.
 * @param {Object} k - Kaplay instance
 * @param {number} floorY - Floor Y
 * @param {number} screenW - Screen width
 * @param {Object} [opts] - Options
 * @param {number} [opts.treeX] - Trunk centre (splits left/right field)
 * @returns {Object} Midges controller
 */
export function createGlowMidges(k, floorY, screenW, opts = {}) {
  const treeX = opts.treeX ?? screenW * 0.5
  const zone = getCrackZone(screenW, floorY)
  const pitCx = zone.x1 + zone.width * 0.4
  const pitCy = floorY - 32
  const minY = floorY - 70
  const maxY = floorY - 14
  const midges = []
  for (let i = 0; i < MIDGE_PIT_COUNT; i++) {
    midges.push(makeMidge(
      pitCx + (Math.random() - 0.5) * MIDGE_PIT_SPREAD_X * 2,
      pitCy + (Math.random() - 0.5) * MIDGE_PIT_SPREAD_Y * 2,
      'pit'
    ))
  }
  for (let i = 0; i < MIDGE_FIELD_COUNT; i++) {
    const onLeft = i < MIDGE_FIELD_COUNT / 2
    const x0 = onLeft ? LEFT_MARGIN + 20 : treeX + 40
    const x1 = onLeft ? treeX - 40 : zone.x1 - 20
    const span = Math.max(40, x1 - x0)
    midges.push(makeMidge(
      x0 + Math.random() * span,
      minY + Math.random() * (maxY - minY),
      onLeft ? 'fieldLeft' : 'fieldRight'
    ))
  }
  const ctrl = {
    midges,
    treeX,
    floorY,
    screenW,
    showPit: true,
    showLeft: true,
    showRight: true,
    spreadAfterPit: false,
    pit: {
      minX: pitCx - MIDGE_PIT_SPREAD_X,
      maxX: pitCx + MIDGE_PIT_SPREAD_X,
      minY: pitCy - MIDGE_PIT_SPREAD_Y,
      maxY: Math.min(maxY, pitCy + MIDGE_PIT_SPREAD_Y)
    },
    fieldLeft: {
      minX: LEFT_MARGIN + 16,
      maxX: treeX - 30,
      minY,
      maxY
    },
    fieldRight: {
      minX: treeX + 30,
      maxX: zone.x1 - 16,
      minY,
      maxY
    },
    fieldAll: {
      minX: LEFT_MARGIN + 16,
      maxX: zone.x1 - 16,
      minY,
      maxY
    }
  }
  k.add([
    k.z(MIDGE_Z),
    {
      draw() {
        drawGlowMidges(k, ctrl)
      }
    }
  ])
  return ctrl
}
/**
 * Syncs midge visibility to explored ground sides / open cave.
 * @param {Object} ctrl - Midges controller
 * @param {Object} zones - Glow zone flags
 * @param {boolean} pitCollapsed - Whether the cave is open
 */
export function syncGlowMidgesZones(ctrl, zones, pitCollapsed) {
  if (!ctrl) return
  //
  // Midges stay on for the whole level — only pit midges migrate after collapse.
  //
  ctrl.showLeft = true
  ctrl.showRight = true
  ctrl.showPit = true
  const spread = Boolean(pitCollapsed && !ctrl.spreadAfterPit)
  spread && spreadMidgesAfterPit(ctrl)
}
/**
 * Advances midge wander inside each role's bounds.
 * @param {Object} ctrl - Midges controller
 * @param {number} dt - Delta time
 * @param {number} [worldLife=1] - Post-L meditation fade (0 = frozen/hidden)
 */
export function updateGlowMidges(ctrl, dt, worldLife = 0) {
  if (!ctrl?.midges) return
  ctrl.worldLife = worldLife
  if (worldLife < 0.02) return
  const t = performance.now() * 0.001
  const move = worldLife
  for (const m of ctrl.midges) {
    if (!midgeRoleVisible(ctrl, m.role)) continue
    const bounds = boundsForRole(ctrl, m.role)
    m.driftVx += Math.sin(t * 2.1 + m.phase) * 18 * dt * move
    m.driftVy += Math.cos(t * 2.7 + m.phase * 1.3) * 14 * dt * move
    m.driftVx *= 0.98
    m.driftVy *= 0.98
    const sp = m.speed * dt * move
    m.x += m.driftVx * dt * move + Math.sin(t * 3.2 + m.phase) * sp
    m.y += m.driftVy * dt * move + Math.cos(t * 2.4 + m.phase) * sp * 0.7
    if (m.x < bounds.minX) { m.x = bounds.minX; m.driftVx = Math.abs(m.driftVx) }
    if (m.x > bounds.maxX) { m.x = bounds.maxX; m.driftVx = -Math.abs(m.driftVx) }
    if (m.y < bounds.minY) { m.y = bounds.minY; m.driftVy = Math.abs(m.driftVy) }
    if (m.y > bounds.maxY) { m.y = bounds.maxY; m.driftVy = -Math.abs(m.driftVy) }
  }
}
/**
 * True when the cave mouth should start open on level load. Closed only while
 * the hero is still eyeless and has not entered the pit yet.
 * @param {Object} [zones] - Glow zone flags
 * @param {string|null} [lastSpawnMode] - Persisted spawn mode
 * @param {Object} [heroInst] - Playable hero inst
 * @returns {boolean}
 */
export function shouldGlowPitBeOpenForZones(zones, lastSpawnMode = null, heroInst = null) {
  if (glowHeroHasCollectedEyes(zones, heroInst)) return true
  if (get(KEY_PIT_COLLAPSED, false)) return true
  const mode = lastSpawnMode ?? get(KEY_LAST_SPAWN_MODE, null)
  return mode === SPAWN_MODE_CAVE
}
/**
 * Whether the playable hero already has eyes in the glow section.
 * @param {Object} [zones] - Glow zone flags
 * @param {Object} [heroInst] - Playable hero inst
 * @returns {boolean}
 */
export function glowHeroHasCollectedEyes(zones, heroInst = null) {
  if (heroInst?.noEyes === false) return true
  return Boolean(zones?.eyesCollected || get(KEY_EYES_COLLECTED, false))
}
/**
 * Sets up the crack floor lid + optional already-collapsed pit.
 * @param {Object} cfg - Setup config
 * @param {Object} [cfg.tooltipClampInset] - Playfield inset for pit collect hints
 * @returns {Object} Pit state
 */
export function createGlowPit(cfg) {
  const {
    k, floorY, screenW, heroInst, sound, levelIndicator,
    heroBodyColor, groundColor, alreadyCollapsed, cracksVisible = false,
    tooltipClampInset = null, zones = null, lastSpawnMode = null
  } = cfg
  const zone = getCrackZone(screenW, floorY)
  bakePitMushroomSprite(k)
  const startOpen = Boolean(
    alreadyCollapsed ||
    shouldGlowPitBeOpenForZones(zones, lastSpawnMode, heroInst)
  )
  //
  // Sealed crack lid bridges from the main-floor edge through the crack band
  // until collapse — no gap the hero can fall through on the first jump in.
  //
  const lidX = zone.x1 - CAVE_MOUTH_MAIN_FLOOR_INSET - CAVE_MOUTH_ENTRANCE_EXPAND_LEFT
  const lidW = zone.x2 - lidX
  let crackFloor = null
  !startOpen && (crackFloor = k.add([
    k.rect(lidW, 20),
    k.pos(lidX, floorY),
    k.anchor('topleft'),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName
  ]))
  const pit = {
    k,
    zone,
    floorY,
    screenW,
    heroInst,
    sound,
    levelIndicator,
    heroBodyColor,
    groundColor,
    crackFloor,
    cracksVisible: Boolean(cracksVisible),
    crackSegs: buildFractalCrackSegs(zone),
    collapsed: startOpen,
    particles: [],
    trampState: { cooldown: 0, squash: 0, x: zone.x1 + zone.width * 0.55 },
    pitFloor: null,
    pitWalls: [],
    pitBonus: null,
    collapseArmed: false,
    wasOnBonusPlat: false,
    leftBonusAirborne: false,
    crackStompCount: 0,
    pitCaveIdleTime: 0,
    pitCaveMushroomDone: false,
    pitCaveMushroomMoveAccum: 0,
    pitCaveMushroomHintShows: 0,
    pitCaveMushroomHintPausedUntilExit: false,
    pitCaveHintTooltip: null,
    pitLeftWall: null,
    pitMouthWalkShelf: null,
    tooltipClampInset,
    wallProfile: null,
    caveFloorRevealed: false
  }
  if (pit.collapsed) {
    crackFloor?.destroy?.()
    pit.crackFloor = null
    openPitPhysics(pit)
  }
  return pit
}
/**
 * Shows or hides surface cracks (right-ground reveal).
 * @param {Object} pit - Pit state
 * @param {boolean} visible - Visible flag
 */
export function setGlowPitCracksVisible(pit, visible) {
  if (!pit) return
  pit.cracksVisible = Boolean(visible)
}
/**
 * Opens the cave only after a fall from the upper-right fragment platform
 * onto the crack entrance (jumping over the cracks alone does nothing).
 * @param {Object} pit - Pit state
 * @param {Object} char - Hero character
 * @param {boolean} grounded - Grounded this frame
 * @param {boolean} justLanded - Landed this frame
 * @param {Object|null} bonusPlatHome - Fragment platform {x,y,w}
 * @param {Object} [opts] - Optional { jumpLanding, footY, footParticles }
 */
export function updateGlowPit(pit, char, grounded, justLanded, bonusPlatHome, opts = {}) {
  if (!pit || !char?.pos) return
  syncGlowPitOpenState(pit)
  const dt = pit.k.dt()
  updatePitParticles(pit, dt)
  if (pit.trampState.cooldown > 0) pit.trampState.cooldown -= dt
  if (pit.trampState.squash > 0) pit.trampState.squash = Math.max(0, pit.trampState.squash - dt * 4)
  if (pit.collapsed) {
    clampHeroInCave(pit, char)
    updatePitTrampoline(pit, char)
    return
  }
  if (!pit.cracksVisible) return
  if (pit.skipPitBonus && !pit.collapsed) return
  if (opts.skipCrackCollapse) return
  const { zone } = pit
  const heroX = char.pos.x
  const overCrack = heroX >= zone.x1 && heroX <= zone.x2
  //
  // Arm only after jumping/falling off the upper-right fragment log — standing
  // on it must not open the cave; the player must land on the crack entrance.
  //
  let onBonus = false
  const footY = opts.footY
  if (bonusPlatHome && footY != null) {
    const bw = bonusPlatHome.w || 90
    const platH = bonusPlatHome.h || 28
    onBonus = grounded &&
      heroX >= bonusPlatHome.x - BONUS_PLAT_FOOT_X_PAD &&
      heroX <= bonusPlatHome.x + bw + BONUS_PLAT_FOOT_X_PAD &&
      footY >= bonusPlatHome.y - BONUS_PLAT_FOOT_PAD_ABOVE &&
      footY <= bonusPlatHome.y + platH + BONUS_PLAT_FOOT_PAD_BELOW
  }
  if (onBonus && grounded) {
    pit.wasOnBonusPlat = true
    pit.leftBonusAirborne = false
  }
  if (pit.wasOnBonusPlat && !grounded) {
    pit.leftBonusAirborne = true
    pit.collapseArmed = true
  }
  const onCrackFloor = isHeroOnCrackLid(pit, heroX, footY)
  if (justLanded && grounded && pit.cracksVisible && overCrack && onCrackFloor) {
    pit.onCrackLandingShake?.()
  }
  const fallingOntoCrack = pit.collapseArmed && overCrack && !grounded &&
    footY != null &&
    footY >= pit.floorY - CRACK_FALL_OPEN_FEET_MAX &&
    (char.vel?.y ?? 0) > 0
  const dropFromBonus = justLanded && grounded && pit.collapseArmed &&
    overCrack && onCrackFloor && !onBonus
  if (dropFromBonus || fallingOntoCrack) {
    collapsePit(pit)
    pit.crackStompCount = 0
    pit.collapseArmed = false
    pit.wasOnBonusPlat = false
    pit.leftBonusAirborne = false
    return
  }
  //
  // Landing anywhere else ends the fall-from-log window. Jumping from the
  // ground onto the cracks after that uses the five-stomp path, not a
  // leftover arm from an earlier visit to the fragment log.
  //
  if (justLanded && grounded && !onBonus) {
    pit.collapseArmed = false
    pit.wasOnBonusPlat = false
    pit.leftBonusAirborne = false
  }
  //
  // Stomp path: five normal jump landings on the crack entrance also collapse it
  //
  const jumpLanding = Boolean(opts.jumpLanding)
  const footParticles = opts.footParticles
  if (jumpLanding && overCrack && grounded && isHeroOnCrackLid(pit, heroX, footY)) {
    pit.crackStompCount = (pit.crackStompCount || 0) + 1
    footParticles && GlowFootParticles.spawnLanding(
      footParticles,
      char.pos.x,
      footY,
      pitCrackStompParticleColor(pit),
      CRACK_STOMP_PARTICLE_MULT
    )
    if (pit.crackStompCount >= CRACK_STOMP_OPENS) {
      collapsePit(pit)
      pit.crackStompCount = 0
      pit.collapseArmed = false
      pit.wasOnBonusPlat = false
      pit.leftBonusAirborne = false
    }
  }
}
//
// Soft bounds inside the open cave (no invisible wall bodies)
//
function clampHeroInCave(pit, char) {
  if (!char?.pos) return
  const bottomY = pit.floorY + pit.zone.depth
  const heroFeetOffset = 38
  const feetY = char.pos.y + heroFeetOffset
  //
  // Only clamp on the pit floor — not while the hero is still dropping through
  // the mouth (that horizontal snap felt like tripping on an invisible lip).
  //
  if (feetY < bottomY - 20) return
  const { innerX, innerW } = getGlowPitFloorCollider(pit.zone)
  const minX = innerX + 6
  const maxX = innerX + innerW - 6
  if (char.pos.x < minX) char.pos.x = minX
  if (char.pos.x > maxX) char.pos.x = maxX
  //
  // Pit mushroom uses its own cap snap — skip floor pin while standing on it.
  //
  const mushH = PIT_TRAMP_W * CUTE_MUSHROOM_ASPECT
  const capTop = bottomY - mushH
  const onMushCap = isPitMushroomBouncy(pit) &&
    Math.abs(char.pos.x - pit.trampState.x) < PIT_TRAMP_CAP_HALF_W &&
    feetY >= capTop - 10 && feetY <= capTop + 16
  if (onMushCap) return
  const hero = pit.heroInst
  //
  // Never pin the floor during jump wind-up or launch — that cancelled jumps
  // and froze the sprite on the landing pose every frame.
  //
  if (hero?.isSquashing || hero?.jumpPhase === 'jumping') return
  const vy = char.vel?.y ?? 0
  if (vy < -20) return
  //
  // Pull the hero up only after the static floor collider was tunneled — never
  // while the fall is still in progress (that froze the jump animation mid-air).
  //
  const standY = getGlowPitHeroStandY(pit)
  //
  // Only correct a deep tunnel while falling fast — micro snaps every frame
  // re-fired landing and played a second land crouch on the pit floor.
  //
  const PIT_FLOOR_TUNNEL_MIN = 2
  const PIT_FLOOR_SNAP_MIN_VY = 80
  if (char.pos.y > standY + PIT_FLOOR_TUNNEL_MIN && vy >= PIT_FLOOR_SNAP_MIN_VY) {
    char.pos.y = standY
    char.vel && (char.vel.y = 0)
  }
}
/**
 * Draws surface cracks or the open cave pit.
 * @param {Object} k - Kaplay instance
 * @param {Object} pit - Pit state
 * @param {Object} groundC - Ground fill {r,g,b}
 */
export function drawGlowPit(k, pit, groundC, flatDecor = false) {
  if (!pit) return
  const sc = pit.sceneRef
  if (sc?.k && pit.zone && sc.camera?.viewW) {
    const camX = sc.k.camPos().x
    const zoom = sc.camera.zoom || 1
    const half = sc.camera.viewW / (2 * zoom) + PIT_DRAW_CULL_MARGIN
    if (pit.zone.x2 < camX - half || pit.zone.x1 > camX + half) return
  }
  if (!pit.collapsed) {
    //
    // Hide crack strokes once the hero drops past the mouth lip — otherwise a
    // horizontal segment at floorY reads as a bar in front of him on the way down.
    //
    let showCracks = pit.cracksVisible
    if (showCracks) {
      const char = pit.sceneRef?.heroInst?.character
      const feetY = char?.pos ? char.pos.y + 38 : 0
      showCracks = feetY <= pit.floorY + 8
    }
    if (showCracks) {
      drawSurfaceCracks(k, pit, groundC, flatDecor)
      return
    }
    //
    // Cracks are hidden here for any reason (hero past the lip mid-fall,
    // cracksVisible not on yet, collapsePit not fired this exact frame —
    // it's checked once per frame in updateGlowPit, so there's a brief gap)
    // — as long as the hero is actually standing/falling inside the crack
    // zone's X span, the opening must not stay blank: the solid static
    // ground bake painted behind everything would show through as a flat
    // grey bar right in front of him. Anywhere else in the zone (nobody
    // there) is left alone so an unrevealed crack strip stays untouched.
    //
    const char = pit.sceneRef?.heroInst?.character
    const heroInZone = Boolean(char?.pos && char.pos.x >= pit.zone.x1 && char.pos.x <= pit.zone.x2)
    //
    // Once crack lines are hidden past the lip, keep painting the mouth void
    // while the hero is still over the pit — otherwise the static earth band
    // behind this layer reads as a dark horizontal bar in front of him.
    //
    heroInZone && drawGlowPitMouthVoidFill(k, pit)
    return
  }
  if (pit.outlineOnlyMode) {
    isCaveInteriorVisible(pit)
      ? drawCaveInteriorRockStyle(k, pit, flatDecor)
      : drawGlowPitMouthVoidFill(k, pit)
    return
  }
  if (isCaveInteriorVisible(pit)) {
    drawCaveInteriorRockStyle(k, pit, flatDecor)
    return
  }
  //
  // Detailed wall rocks/pebbles still wait for isCaveInteriorVisible (see its
  // own comment), but the mouth opening itself must go dark the instant the
  // pit collapses — otherwise the solid ground-colour earth band drawn behind
  // everything (drawGlowEarthBand, painted before this call) shows through
  // as a flat grey bar right where the hero is falling.
  //
  drawGlowPitMouthVoidFill(k, pit)
}
/**
 * Eyeless bare world: dark mouth void only (skeleton draws separately).
 * @param {Object} k - Kaplay instance
 * @param {Object} pit - Pit state
 */
export function drawGlowPitBareCave(k, pit) {
  if (!pit) return
  pit.collapsed && drawGlowPitMouthVoidFill(k, pit)
}
/**
 * Eyeless intro pit pass — interior void + skeleton on the floor, mouth void while falling.
 * @param {Object} k - Kaplay instance
 * @param {Object} pit - Pit state
 */
export function drawGlowPitEyeIntroInterior(k, pit) {
  if (!pit) return
  if (!pit.collapsed) {
    drawGlowPitBareCave(k, pit)
    return
  }
  if (isCaveInteriorVisible(pit)) {
    drawCaveInteriorRockStyle(k, pit, true)
    return
  }
  drawGlowPitBareCave(k, pit)
}
/**
 * Draws the cave skeleton without pit camera culling (visible whenever the pit is open).
 * @param {Object} k - Kaplay instance
 * @param {Object} pit - Pit state
 * @param {boolean} flatDecor - Single-tone decor mode
 */
export function drawGlowPitCaveSkeletonScene(k, pit, flatDecor = false) {
  if (!shouldShowPitCaveSkeleton(pit)) return
  const eyeIntroBare = pit.sceneRef?.eyeIntro &&
    pit.sceneRef.eyeIntro.phase !== 'complete' &&
    !glowHeroHasCollectedEyes(pit.sceneRef?.zones, pit.heroInst || pit.sceneRef?.heroInst)
  const tones = eyeIntroBare ? caveSkeletonEyeIntroTones() : caveSkeletonPitFloorTones()
  drawPitCaveSkeleton(k, pit, tones, {
    opacity: eyeIntroBare ? 1 : flatDecor ? 0.96 : 0.92,
    embedded: false,
    bakeVariant: eyeIntroBare ? 'intro' : 'pit'
  })
}
/**
 * Pit mushroom, seam-cover rocks and scattered interior rocks — draw after
 * onDraw earth/static so crisp bake edges do not clip them.
 * @param {Object} k - Kaplay instance
 * @param {Object} pit - Pit state
 * @param {boolean} flatDecor - Single-tone decor mode
 */
export function drawGlowPitCaveMushroom(k, pit) {
  if (!pit?.collapsed) return
  drawPitTrampoline(k, pit)
}
export function drawGlowPitCaveForegroundDecor(k, pit, flatDecor = false) {
  if (!pit?.collapsed) return
  if (!isCaveInteriorVisible(pit)) return
  if (!pit.wallProfile?.mouth) return
  const showRocks = shouldDrawPitCaveRocks(pit)
  if (!showRocks) return
  const pal = buildCavePalette(glowRgb('decorGray'))
  const layout = pit.wallProfile
  const { floorY } = pit
  const wallRocks = layout.wallRocks?.filter(rock => !rock.straddleMouthGround)
  drawCaveLayoutRocks(k, wallRocks, pal, floorY)
  drawCaveLayoutRocks(k, layout.backgroundRocks, pal, floorY)
  const contourRocks = layout.contourRocks?.filter(rock => !rock.straddleMouthGround)
  drawCaveLayoutRocks(k, contourRocks, pal, floorY)
  drawCaveLayoutRocks(k, layout.pebbles, pal, floorY)
}
/**
 * Seam-cover rocks — drawn last so colour-world earth/static cannot hide them.
 * @param {Object} k - Kaplay instance
 * @param {Object} pit - Pit state
 */
/**
 * Forces the cave interior bake to rebuild (layout or colour-world transition).
 * @param {Object|null} pit - Pit state
 */
export function invalidateGlowPitCaveInteriorBake(pit) {
  if (!pit) return
  pit._caveSpriteReady = false
  pit._caveBakeRocksKey = null
}
export function drawGlowPitCaveSeamCoverRocks(k, pit) {
  if (!pit?.collapsed || !pit.wallProfile?.mouth) return
  if (!isCaveInteriorVisible(pit)) return
  if (!shouldDrawPitCaveRocks(pit)) return
  const pal = buildCavePalette(glowRgb('decorGray'))
  const { floorY } = pit
  const layout = pit.wallProfile
  const seamWall = layout.wallRocks?.filter(rock => rock.straddleMouthGround)
  const seamContour = layout.contourRocks?.filter(rock => rock.straddleMouthGround)
  drawCaveLayoutRocks(k, seamWall, pal, floorY)
  drawCaveLayoutRocks(k, seamContour, pal, floorY)
}
//
// Hero feet on the cave pit floor (same band as the lying-eye reveal).
//
export function isHeroOnPitCaveFloor(pit, charOverride = null) {
  const char = charOverride || pit.heroInst?.character || pit.sceneRef?.heroInst?.character
  if (!char?.pos) return false
  const bottomY = pit.floorY + pit.zone.depth
  const feetY = char.pos.y + PIT_CAVE_FLOOR_FEET_Y
  const inBand = feetY >= bottomY - PIT_CAVE_FLOOR_FEET_BAND - 14 &&
    feetY <= bottomY + 20
  if (!inBand) return false
  const grounded = char.isGrounded?.() ?? false
  const vy = char.vel?.y ?? 0
  return grounded || Math.abs(vy) < 160
}
const PIT_CAVE_FLOOR_FEET_Y = 38
const PIT_CAVE_FLOOR_FEET_BAND = 18
/**
 * Skeleton + lying eyes only after the hero lands on the pit floor (or while
 * eyes are still on the ground). Hidden while approaching the cracked surface.
 * @param {Object} pit - Pit state
 * @returns {boolean}
 */
export function shouldShowPitCaveSkeleton(pit) {
  if (!pit?.collapsed) return false
  const zones = pit.sceneRef?.zones
  const heroInst = pit.heroInst || pit.sceneRef?.heroInst
  if (glowHeroHasCollectedEyes(zones, heroInst)) {
    return isCaveInteriorVisible(pit)
  }
  const intro = pit.sceneRef?.eyeIntro
  if (intro?.pickup && !intro.pickup.collected) return true
  if (pit.caveFloorRevealed) return true
  return isHeroOnPitCaveFloor(pit)
}
//
// Cheap stand-in for the full cave bake — just the mouth-shaped dark opening,
// so the entrance reads as "gone" immediately instead of leaving the ground
// fill exposed during the short holdoff before the detailed interior bakes.
//
function drawGlowPitMouthVoidFill(k, pit) {
  if (!pit.wallProfile || pit.wallProfile.version !== CAVE_LAYOUT_VERSION) {
    pit.wallProfile = buildCaveSceneLayout(pit.zone, pit.floorY)
  }
  const pal = buildCavePalette(glowRgb('decorGray'))
  const edge = pit.wallProfile.interiorWallEdge
  drawCaveVoidFill(k, pit.wallProfile.mouth, pal, edge)
}
//
// Private helpers
//
function makeMidge(x, y, role) {
  return {
    x,
    y,
    role,
    radius: MIDGE_RADIUS_MIN + Math.random() * (MIDGE_RADIUS_MAX - MIDGE_RADIUS_MIN),
    speed: MIDGE_SPEED_MIN + Math.random() * (MIDGE_SPEED_MAX - MIDGE_SPEED_MIN),
    phase: Math.random() * Math.PI * 2,
    driftVx: (Math.random() - 0.5) * 14,
    driftVy: (Math.random() - 0.5) * 10
  }
}
function midgeRoleVisible(ctrl, role) {
  if (role === 'pit') return ctrl.showPit
  if (role === 'fieldLeft') return ctrl.showLeft
  if (role === 'fieldRight') return ctrl.showRight || ctrl.spreadAfterPit
  if (role === 'field') return ctrl.showLeft || ctrl.showRight
  return false
}
function boundsForRole(ctrl, role) {
  if (role === 'pit') return ctrl.spreadAfterPit ? ctrl.fieldAll : ctrl.pit
  if (role === 'fieldLeft') return ctrl.fieldLeft
  if (role === 'fieldRight') return ctrl.fieldRight
  return ctrl.fieldAll
}
//
// After the cave opens, pit midges drift left and join the ground band
//
function spreadMidgesAfterPit(ctrl) {
  ctrl.spreadAfterPit = true
  const b = ctrl.fieldAll
  for (const m of ctrl.midges) {
    if (m.role !== 'pit') continue
    m.role = 'field'
    m.x = b.minX + Math.random() * (b.maxX - b.minX)
    m.y = b.minY + Math.random() * (b.maxY - b.minY)
  }
}
function bakePitMushroomSprite(k) {
  //
  // Always rebaked (no k.getSprite skip) — glow and menu share one native
  // Kaplay instance, so a "skip if this name is already loaded" check would
  // keep showing whatever colours/shape were baked on the very first pit
  // created that session even after a code change, across every later
  // level re-entry until a full page reload.
  //
  bakeOnePitMushroomSprite(k, PIT_MUSH_SPRITE, getPitMushroomBakeColors())
  //
  // Purple cap — distinct from the branch (orange) and right (red)
  // trampoline mushrooms so all three read as different little guys.
  //
  bakeOnePitMushroomSprite(k, PIT_MUSH_OUTLINE_SPRITE, GLOW_PAL.cuteMushroomPurple)
  bakeOnePitMushroomFlatMonoSprites(k)
}
function bakeOnePitMushroomFlatMonoSprites(k) {
  bakeOnePitMushroomSprite(k, PIT_MUSH_FLAT_FILL_SPRITE, getCuteMushroomFlatPitBakeColors())
}
function bakeOnePitMushroomSprite(k, name, colors) {
  const mushW = PIT_TRAMP_W
  const totalW = mushW + 4
  const totalH = Math.ceil(mushW * CUTE_MUSHROOM_ASPECT) + 4
  const canvas = toCanvas({ width: totalW, height: totalH, pixelRatio: 1 }, (ctx) => {
    drawCuteMushroomToCanvas(ctx, {
      cx: totalW / 2,
      baseY: totalH - 2,
      width: mushW,
      colors,
      withFace: true,
      eyeScale: TRAMP_FACE_EYE_SCALE,
      simpleShade: true
    })
  })
  k.loadSprite(name, canvas)
  canvas.width = 0
  canvas.height = 0
}
function drawGlowMidges(k, ctrl) {
  const life = ctrl.worldLife ?? 0
  if (life < 0.02) return
  const t = k.time()
  const voidRgb = glowRgb('void')
  const base = ctrl.midgeRgb || voidRgb
  const midgeC = k.rgb(base.r, base.g, base.b)
  const camX = k.camPos().x
  const camScale = k.camScale?.()
  const zoom = (typeof camScale === 'object' ? camScale.x : camScale) || 1
  const half = k.width() / (2 * zoom) + MIDGE_DRAW_CULL_PAD
  const minX = camX - half
  const maxX = camX + half
  for (const m of ctrl.midges) {
    if (!midgeRoleVisible(ctrl, m.role)) continue
    if (m.x < minX || m.x > maxX) continue
    const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 7 + m.phase))
    k.drawCircle({
      pos: k.vec2(m.x, m.y),
      radius: m.radius,
      color: midgeC,
      opacity: (0.35 + pulse * 0.45) * life
    })
  }
}
//
// Fractal crack network — forked, uneven segments unique each load
//
function buildFractalCrackSegs(zone) {
  const segs = []
  //
  // Denser crack field above the cave mouth
  //
  const roots = 6 + Math.floor(Math.random() * 4)
  for (let i = 0; i < roots; i++) {
    const x0 = zone.x1 + zone.width * (0.08 + Math.random() * 0.84)
    const y0 = zone.floorY + 1 + Math.random() * 2
    const ang = (Math.random() - 0.5) * 0.65 + Math.PI * 0.5
    growCrack(segs, x0, y0, ang, 10 + Math.random() * 12, 3, 1.45)
  }
  return segs
}
function growCrack(segs, x, y, angle, len, depth, width) {
  if (depth <= 0 || len < 3) return
  const steps = 2 + Math.floor(Math.random() * 2)
  let cx = x
  let cy = y
  let ang = angle
  for (let i = 0; i < steps; i++) {
    ang += (Math.random() - 0.5) * 0.45
    const stepLen = len / steps * (0.75 + Math.random() * 0.4)
    const nx = cx + Math.cos(ang) * stepLen
    const ny = cy + Math.sin(ang) * stepLen
    segs.push({ x1: cx, y1: cy, x2: nx, y2: ny, w: width })
    cx = nx
    cy = ny
  }
  if (Math.random() < 0.45) {
    growCrack(segs, cx, cy, ang + (0.3 + Math.random() * 0.45), len * 0.45, depth - 1, width * 0.7)
  }
  if (Math.random() < 0.35) {
    growCrack(segs, cx, cy, ang - (0.3 + Math.random() * 0.45), len * 0.4, depth - 1, width * 0.65)
  }
}
function drawSurfaceCracks(k, pit, groundC, flatDecor = false) {
  const deepRgb = flatDecor ? glowRgb('playfieldOuter') : glowRgb('void')
  const deep = k.rgb(deepRgb.r, deepRgb.g, deepRgb.b)
  const opacity = 0.72
  for (const s of pit.crackSegs) {
    k.drawLine({
      p1: k.vec2(s.x1, s.y1),
      p2: k.vec2(s.x2, s.y2),
      width: Math.max(0.85, s.w),
      color: deep,
      opacity
    })
  }
}
function shouldDrawPitCaveRocks(pit) {
  const zones = pit.sceneRef?.zones
  const heroInst = pit.heroInst || pit.sceneRef?.heroInst
  return glowHeroHasCollectedEyes(zones, heroInst)
}
function drawCaveInteriorRockStyle(k, pit, flatDecor = false) {
  const { zone, floorY } = pit
  if (!pit.wallProfile || pit.wallProfile.version !== CAVE_LAYOUT_VERSION) {
    pit.wallProfile = buildCaveSceneLayout(zone, floorY)
    pit._caveSpriteReady = false
    pit._caveBakeRocksKey = null
    pit.collapsed && refreshGlowPitMouthWalkShelf(pit)
  }
  ensureGlowPitMouthWalkShelf(pit)
  const showRocks = shouldDrawPitCaveRocks(pit)
  bakeCaveInteriorSprite(k, pit, showRocks)
  if (pit._caveSpriteReady) {
    drawCaveInteriorBakedSprite(k, pit)
    return
  }
  const layout = pit.wallProfile
  const mouth = layout.mouth
  const pal = buildCavePalette(glowRgb('decorGray'))
  drawCaveVoidFill(k, mouth, pal, layout.interiorWallEdge)
  if (showRocks) {
    drawCaveLayoutRocks(k, layout.wallRocks, pal, floorY)
    drawCaveLayoutRocks(k, layout.pebbles, pal, floorY)
  }
}
//
// Bakes the static cave interior once — wall rocks are dozens of polygons
// per frame otherwise, and the palette is a fixed decor gray.
//
function bakeCaveInteriorSprite(k, pit, showRocks) {
  const zone = pit.zone
  const ox = zone.x1 - CAVE_BAKE_PAD
  const oy = pit.floorY - 8
  pit._caveSpriteX = ox
  pit._caveSpriteY = oy
  const bakeKey = showRocks ? 'rocks' : 'void'
  if (
    pit._caveSpriteReady &&
    pit._caveBakeRocksKey === bakeKey &&
    pit._caveBakeLayoutVersion === CAVE_LAYOUT_VERSION
  ) return
  const layout = pit.wallProfile
  if (!layout?.mouth) return
  const w = Math.ceil(zone.width + CAVE_BAKE_PAD * 2)
  const h = Math.ceil(zone.depth + CAVE_BAKE_PAD * 2)
  const pal = buildCavePalette(glowRgb('decorGray'))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.translate(-ox, -oy)
  fillCanvasPoly(ctx, caveMouthPts(layout.mouth, layout.interiorWallEdge), pal.void)
  const groundY = layout.mouth.floorY
  //
  // Wall/contour rocks are drawn live on the foreground pass so bake void
  // edges do not clip them at the interior seam.
  //
  showRocks && paintCanvasRocks(ctx, layout.backgroundRocks, pal, groundY)
  showRocks && paintCanvasRocks(ctx, layout.pebbles, pal, groundY)
  //
  // Seam-cover rocks are also baked so post-L parallax earth repaints cannot
  // hide the vertical mouth line when the live foreground pass is occluded.
  //
  if (showRocks && layout.wallRocks?.length) {
    const seamWallRocks = layout.wallRocks.filter(rock => rock.straddleMouthGround)
    paintCanvasRocks(ctx, seamWallRocks, pal, groundY)
  }
  if (showRocks && layout.contourRocks?.length) {
    const seamContourRocks = layout.contourRocks.filter(rock => rock.straddleMouthGround)
    paintCanvasRocks(ctx, seamContourRocks, pal, groundY)
  }
  k.loadSprite(CAVE_INTERIOR_SPRITE, canvas)
  canvas.width = 0
  canvas.height = 0
  pit._caveSpriteReady = true
  pit._caveBakeRocksKey = bakeKey
  pit._caveBakeLayoutVersion = CAVE_LAYOUT_VERSION
}
function caveMouthPts(mouth, interiorWallEdge = null) {
  if (!mouth?.left?.length || !mouth?.right?.length) return []
  const leftEdge = interiorWallEdge?.length ? interiorWallEdge : mouth.left
  //
  // This is the shape that ends up PERMANENTLY baked into CAVE_INTERIOR_SPRITE
  // (bakeCaveInteriorSprite caches it and reuses it for the rest of the
  // playthrough) — its old straight top/bottom edges (a flat lipY-offset
  // line left-to-right, same again at bottomY) were exactly the "one crisp
  // horizontal line" the cave read as in screenshots, unlike the live
  // drawCaveVoidFill path which already got a jagged edge. Same
  // buildJaggedHorizontalEdge treatment here, same winding order.
  //
  const pts = []
  const seed = leftEdge[0].x * 0.037
  buildJaggedHorizontalEdge(leftEdge[0].x, mouth.right[0].x, mouth.floorY, seed)
    .forEach(p => pts.push(p))
  for (let i = 1; i < mouth.right.length; i++) {
    pts.push({ x: mouth.right[i].x, y: mouth.right[i].y })
  }
  pts.push({ x: mouth.right[mouth.right.length - 1].x, y: mouth.bottomY })
  pts.push({ x: leftEdge[leftEdge.length - 1].x, y: mouth.bottomY })
  for (let i = leftEdge.length - 1; i >= 1; i--) {
    pts.push({ x: leftEdge[i].x, y: leftEdge[i].y })
  }
  return pts
}
function drawCaveInteriorBakedSprite(k, pit) {
  const zone = pit.zone
  const topPad = Math.max(0, pit.floorY - pit._caveSpriteY)
  const fullH = Math.ceil(zone.depth + CAVE_BAKE_PAD * 2)
  const fullW = Math.ceil(zone.width + CAVE_BAKE_PAD * 2)
  const drawH = Math.max(1, fullH - topPad)
  k.drawSprite({
    sprite: CAVE_INTERIOR_SPRITE,
    pos: k.vec2(Math.round(pit._caveSpriteX), Math.round(pit.floorY)),
    width: fullW,
    height: drawH,
    anchor: 'topleft',
    quad: { x: 0, y: topPad / fullH, w: 1, h: drawH / fullH }
  })
}
//
// Cave decor rocks may only sit on or below the playfield ground line —
// nothing above the mouth entrance (sky side of floorY).
//
function isCaveRockOnOrBelowGround(rock, floorY) {
  if (floorY == null) return true
  return rock.y - rock.radius >= floorY - 0.5
}
function paintCanvasRocks(ctx, rocks, pal, floorY = null) {
  if (!rocks?.length) return
  const tone = caveRockPalette(pal)
  const fill = { r: tone.fillR, g: tone.fillG, b: tone.fillB }
  const shade = { r: tone.darkR, g: tone.darkG, b: tone.darkB }
  rocks.forEach((rock, idx) => {
    if (!rock.verts?.length) return
    if (floorY != null && !isCaveRockOnOrBelowGround(rock, floorY)) return
    const pts = rock.verts.map(v => ({ x: rock.x + v.x, y: rock.y + v.y }))
    fillCanvasPoly(ctx, pts, idx % 2 === 0 ? fill : shade)
  })
}
function fillCanvasPoly(ctx, pts, rgb) {
  if (!pts || pts.length < 3) return
  ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  ctx.closePath()
  ctx.fill()
}
//
// Pit-floor mushroom — lighter cap so it reads on the decor-gray floor.
//
function getPitMushroomBakeColors() {
  return getCuteMushroomFlatDecorColors()
}
//
// Gray stomp dust on the flat decor-gray crack entrance.
//
function pitCrackStompParticleColor(pit) {
  const sc = pit.sceneRef
  if (sc && typeof sc.zones !== 'undefined') {
    const flat = !sc.zones.lCollected && !sc.zones.colorWorld && (sc.colorFade ?? 0) < 0.5
    if (flat) return glowRgb(GLOW_PAL.decorGray)
  }
  return pit.groundColor
}
function caveRockPalette(pal) {
  const fill = snapToPalette(pal.pebble ?? pal.floor ?? glowRgb('midGray'))
  const shade = snapToPalette(pal.depthOuter ?? glowRgb('playfieldOuter'))
  const light = snapToPalette(pal.rimEdge ?? glowRgb('lightGray'))
  return {
    fillR: fill.r, fillG: fill.g, fillB: fill.b,
    lightR: light.r, lightG: light.g, lightB: light.b,
    darkR: shade.r, darkG: shade.g, darkB: shade.b
  }
}
function drawCaveLayoutRocks(k, rocks, pal, floorY = null) {
  if (!rocks?.length) return
  const tone = caveRockPalette(pal)
  const fill = k.rgb(tone.fillR, tone.fillG, tone.fillB)
  const shade = k.rgb(tone.darkR, tone.darkG, tone.darkB)
  rocks.forEach((rock, idx) => {
    if (!rock.verts?.length) return
    if (floorY != null && !isCaveRockOnOrBelowGround(rock, floorY)) return
    const rx = Math.round(rock.x)
    const ry = Math.round(rock.y)
    const pts = rock.verts.map(v => k.vec2(rx + v.x, ry + v.y))
    k.drawPolygon({ pts, color: idx % 2 === 0 ? fill : shade })
  })
}
//
// Solid dark void for the cave interior — single fill, no layered portals.
//
function drawCaveVoidFill(k, mouth, pal, interiorWallEdge = null) {
  if (!mouth?.left?.length || !mouth?.right?.length) return
  const leftEdge = interiorWallEdge?.length ? interiorWallEdge : mouth.left
  const pts = []
  //
  // Top/bottom edges used to be two dead-straight points each — the one
  // "crisp horizontal line" the cave floor/mouth line read as. Jag them the
  // same way the left/right walls already are so the whole silhouette looks
  // equally chaotic and rocks placed near it visibly straddle the boundary.
  //
  const seed = leftEdge[0].x * 0.037
  buildJaggedHorizontalEdge(leftEdge[0].x, mouth.right[0].x, mouth.floorY, seed)
    .forEach(p => pts.push(k.vec2(p.x, p.y)))
  for (let i = 1; i < mouth.right.length; i++) {
    pts.push(k.vec2(mouth.right[i].x, mouth.right[i].y))
  }
  pts.push(k.vec2(mouth.right[mouth.right.length - 1].x, mouth.bottomY))
  pts.push(k.vec2(leftEdge[leftEdge.length - 1].x, mouth.bottomY))
  for (let i = leftEdge.length - 1; i >= 1; i--) {
    pts.push(k.vec2(leftEdge[i].x, leftEdge[i].y))
  }
  pts.length >= 3 && k.drawPolygon({
    pts,
    color: k.rgb(pal.void.r, pal.void.g, pal.void.b)
  })
}
//
// A few jittered points along an otherwise straight horizontal run.
//
const CAVE_MOUTH_LIP_JAG = 16
function buildJaggedHorizontalEdge(xFrom, xTo, baseY, seed) {
  const steps = 6
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = xFrom + (xTo - xFrom) * t
    const jag = (caveSeed01(seed + i * 3.7) - 0.5) * CAVE_MOUTH_LIP_JAG * 2
    pts.push({ x, y: baseY + jag })
  }
  return pts
}
//
// Soft daylight glow bleeding through the cave mouth — a few overlapping,
// low-opacity circles centred on the opening so the entrance reads as lit
// rock fading to black, not a flat cut-out.
//
//
// Palette derived from the current ground tone (gray or colour world)
//
function buildCavePalette(_groundC) {
  return {
    void: glowRgb('void'),
    depthOuter: glowRgb('playfieldOuter'),
    depthMid: glowRgb('dialogFill'),
    depthInner: glowRgb('void'),
    floor: glowRgb('decorGray'),
    pebble: glowRgb('midGray'),
    rim: glowRgb('playfieldOuter'),
    rimEdge: glowRgb('playfieldGray')
  }
}
//
// Builds ragged mouth edges and floor pebbles — no arch lip above ground.
//
function buildCaveSceneLayout(zone, floorY) {
  const bottomY = floorY + zone.depth
  const seed = zone.x1 * 0.017 + floorY * 0.003
  const pebbles = []
  const mouth = buildCaveMouth(zone, floorY, bottomY, seed)
  const cutLeft = getGlowPitEarthBandMouthCutout(zone).leftX
  const skeletonAnchorX = getPitCaveSkeletonAnchorX(zone)
  const skeletonSpriteLeft = skeletonAnchorX - CAVE_SKELETON_SPRITE_HALF_W - 8
  const interiorWallX = Math.min(
    skeletonSpriteLeft - CAVE_INTERIOR_WALL_LEFT_OF_SKELETON,
    cutLeft + 10
  )
  const interiorLeft = interiorWallX + 10
  const floorTopRightX = zone.x2 - CAVE_MOUTH_INSET
  const floorTop = clampHorizProfile(
    buildJaggedFloorTop(interiorLeft, floorTopRightX, bottomY, seed),
    zone,
    floorY,
    bottomY
  )
  const pebbleCount = 28 + Math.floor(caveSeed01(seed + 400) * 14)
  for (let i = 0; i < pebbleCount; i++) {
    const px = interiorLeft + 4 + caveSeed01(seed + i * 3.1) * (mouth.right[0].x - interiorLeft - 8)
    const surfaceY = sampleProfileY(floorTop, px)
    const radius = 2.5 + caveSeed01(seed + i * 7.3) * 6.5
    pebbles.push({
      x: px,
      y: surfaceY + 2 + caveSeed01(seed + i * 5.7) * 10,
      radius,
      verts: buildRockVertices(radius)
    })
  }
  const wallRocks = []
  //
  // inwardSign −1: wobble extends left into the rock cover, never right into
  // the play space (sign +1 pushed the seam east and read as a bar in front
  // of the hero/skeleton).
  //
  const interiorLeftEdge = buildCaveMouthEdge(interiorWallX, floorY, bottomY, seed + 550, -1)
  appendCaveWallRocks(wallRocks, mouth.right, 1, seed + 900, floorY, bottomY)
  const backgroundRocks = buildCaveBackgroundRocks(mouth, floorY, bottomY, seed + 1200, interiorLeft)
  const contourRocks = buildCaveContourRocks(mouth, floorY, bottomY, seed + 1500, interiorWallX)
  const mouthLipRightX = interiorWallX + 8
  appendCaveMouthCeilingLipRocks(contourRocks, mouth, interiorLeftEdge, floorY, seed + 1520, mouthLipRightX)
  appendCaveInteriorSeamColumnRocks(wallRocks, interiorLeftEdge, floorY, bottomY, cutLeft, seed + 2105)
  appendCaveInteriorSeamTopRocks(wallRocks, interiorLeftEdge, floorY, cutLeft, seed + 2188)
  appendCaveInteriorSeamScatterRocks(wallRocks, interiorLeftEdge, floorY, bottomY, cutLeft, seed + 2244)
  appendCaveInteriorSeamEndCapRocks(wallRocks, interiorLeftEdge, floorY, bottomY, cutLeft, seed + 2291)
  return {
    version: CAVE_LAYOUT_VERSION,
    pebbles,
    wallRocks,
    backgroundRocks,
    contourRocks,
    floorTop,
    mouth,
    interiorWallEdge: interiorLeftEdge,
    bottomY
  }
}
//
// Scattered interior rocks on the void floor/walls so the pit is not a flat fill.
//
function buildCaveBackgroundRocks(mouth, floorY, bottomY, seed, interiorLeft = null) {
  const rocks = []
  const x1 = (interiorLeft ?? mouth.left[0].x) + 8
  const x2 = mouth.right[0].x - 8
  const count = 34 + Math.floor(caveSeed01(seed) * 18)
  for (let i = 0; i < count; i++) {
    const px = x1 + caveSeed01(seed + i * 2.9) * (x2 - x1)
    const py = floorY + 14 + caveSeed01(seed + i * 5.1) * (bottomY - floorY - 28)
    const radius = 3 + caveSeed01(seed + i * 8.3) * 9
    rocks.push({ x: px, y: py, radius, verts: buildRockVertices(radius) })
  }
  return rocks
}
//
// Lip rocks straddle the mouth polygon edges so straight bake/crop lines disappear.
//
//
// Tall stack on interiorWallEdge — same poly as caveMouthPts / void bake west wall.
//
//
// Lip of the seam column — covers the vertical line at the ground line only.
//
function caveSeamCoverXAtY(interiorLeftEdge, y, cutLeft, fallbackX) {
  let seamX = cutLeft
  const wallX = sampleProfileXAtY(interiorLeftEdge, y)
  wallX != null && (seamX = Math.max(seamX, wallX))
  return seamX + CAVE_SEAM_COVER_X_BIAS - CAVE_SEAM_COVER_X_LEFT_SHIFT
}
function appendCaveInteriorSeamTopRocks(rocks, interiorLeftEdge, floorY, cutLeft, seed) {
  const count = 3 + Math.floor(caveSeed01(seed) * 2)
  const fallbackX = interiorLeftEdge?.[0]?.x ?? cutLeft
  for (let i = 0; i < count; i++) {
    const radius = CAVE_SEAM_TOP_RADIUS_MIN +
      caveSeed01(seed + i * 3.1) * (CAVE_SEAM_TOP_RADIUS_MAX - CAVE_SEAM_TOP_RADIUS_MIN)
    const y = floorY + radius - 0.5
    const seamX = caveSeamCoverXAtY(interiorLeftEdge, y, cutLeft, fallbackX)
    rocks.push({
      x: seamX + (caveSeed01(seed + i * 5.7) - 0.5) * (CAVE_SEAM_COLUMN_X_SPREAD + 6),
      y,
      radius,
      straddleMouthGround: true,
      verts: buildRockVertices(radius)
    })
  }
}
function appendCaveInteriorSeamColumnRocks(rocks, interiorLeftEdge, floorY, bottomY, cutLeft, seed) {
  const fallbackX = interiorLeftEdge?.[0]?.x ?? cutLeft
  const count = 18 + Math.floor(caveSeed01(seed) * 4)
  const yTop = floorY + CAVE_SEAM_COLUMN_RADIUS_MAX - 0.5
  const yBottom = bottomY - 12
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1)
    const radius = CAVE_SEAM_COLUMN_RADIUS_MIN +
      caveSeed01(seed + i * 4.7) * (CAVE_SEAM_COLUMN_RADIUS_MAX - CAVE_SEAM_COLUMN_RADIUS_MIN)
    let y = yTop + t * (yBottom - yTop)
    y += (caveSeed01(seed + i * 8.1) - 0.5) * 3
    y = Math.max(y, floorY + radius - 0.5)
    const seamX = caveSeamCoverXAtY(interiorLeftEdge, y, cutLeft, fallbackX)
    const x = seamX + (caveSeed01(seed + i * 6.3) - 0.5) * (CAVE_SEAM_COLUMN_X_SPREAD + 4)
    rocks.push({
      x,
      y,
      radius,
      straddleMouthGround: true,
      verts: buildRockVertices(radius)
    })
  }
}
//
// Small rocks east/west of the seam column so the vertical stack reads less uniform.
//
function appendCaveInteriorSeamScatterRocks(rocks, interiorLeftEdge, floorY, bottomY, cutLeft, seed) {
  const fallbackX = interiorLeftEdge?.[0]?.x ?? cutLeft
  const yTop = floorY + CAVE_SEAM_COLUMN_RADIUS_MAX - 0.5
  const yBottom = bottomY - 12
  for (let i = 0; i < CAVE_SEAM_SCATTER_COUNT; i++) {
    const radius = CAVE_SEAM_SCATTER_RADIUS_MIN +
      caveSeed01(seed + i * 2.3) * (CAVE_SEAM_SCATTER_RADIUS_MAX - CAVE_SEAM_SCATTER_RADIUS_MIN)
    let y = yTop + caveSeed01(seed + i * 4.1) * (yBottom - yTop)
    y = Math.max(y, floorY + radius - 0.5)
    const seamX = caveSeamCoverXAtY(interiorLeftEdge, y, cutLeft, fallbackX)
    const side = caveSeed01(seed + i * 6.7) < 0.5 ? -1 : 1
    const off = CAVE_SEAM_SCATTER_X_OFFSET_MIN +
      caveSeed01(seed + i * 7.9) * (CAVE_SEAM_SCATTER_X_OFFSET_MAX - CAVE_SEAM_SCATTER_X_OFFSET_MIN)
    let yFinal = y + (caveSeed01(seed + i * 3.5) - 0.5) * 4
    yFinal = Math.max(yFinal, floorY + radius - 0.5)
    rocks.push({
      x: seamX + side * off + (caveSeed01(seed + i * 9.2) - 0.5) * 6,
      y: yFinal,
      radius,
      straddleMouthGround: true,
      verts: buildRockVertices(radius)
    })
  }
}
//
// One extra cap at the ground-line top and one at the column foot (still on/below floorY).
//
function appendCaveInteriorSeamEndCapRocks(rocks, interiorLeftEdge, floorY, bottomY, cutLeft, seed) {
  const fallbackX = interiorLeftEdge?.[0]?.x ?? cutLeft
  const yBottom = bottomY - 12
  const topRadius = CAVE_SEAM_END_CAP_RADIUS_MIN +
    caveSeed01(seed) * (CAVE_SEAM_END_CAP_RADIUS_MAX - CAVE_SEAM_END_CAP_RADIUS_MIN)
  const topY = floorY + topRadius - 0.5
  const topSeamX = caveSeamCoverXAtY(interiorLeftEdge, topY, cutLeft, fallbackX)
  const topX = topSeamX + (caveSeed01(seed + 1.1) - 0.5) * 8
  rocks.push({
    x: topX,
    y: topY,
    radius: topRadius,
    straddleMouthGround: true,
    verts: buildRockVertices(topRadius)
  })
  const topExtraRadius = CAVE_SEAM_END_CAP_RADIUS_MIN +
    caveSeed01(seed + 8.7) * (CAVE_SEAM_END_CAP_RADIUS_MAX - CAVE_SEAM_END_CAP_RADIUS_MIN)
  const topExtraY = floorY + topExtraRadius - 0.5
  const topExtraSeamX = caveSeamCoverXAtY(interiorLeftEdge, topExtraY, cutLeft, fallbackX)
  rocks.push({
    x: topX + CAVE_SEAM_TOP_EXTRA_RIGHT_OFFSET + (caveSeed01(seed + 9.3) - 0.5) * 4,
    y: topExtraY,
    radius: topExtraRadius,
    straddleMouthGround: true,
    verts: buildRockVertices(topExtraRadius)
  })
  const botRadius = CAVE_SEAM_END_CAP_RADIUS_MIN +
    caveSeed01(seed + 2.4) * (CAVE_SEAM_END_CAP_RADIUS_MAX - CAVE_SEAM_END_CAP_RADIUS_MIN)
  let botY = yBottom + (caveSeed01(seed + 3.8) - 0.5) * 6
  botY = Math.max(botY, floorY + botRadius - 0.5)
  const botSeamX = caveSeamCoverXAtY(interiorLeftEdge, botY, cutLeft, fallbackX)
  rocks.push({
    x: botSeamX + (caveSeed01(seed + 5.2) - 0.5) * 10,
    y: botY,
    radius: botRadius,
    straddleMouthGround: true,
    verts: buildRockVertices(botRadius)
  })
  const botExtraRadius = CAVE_SEAM_END_CAP_RADIUS_MIN +
    caveSeed01(seed + 11.6) * (CAVE_SEAM_END_CAP_RADIUS_MAX - CAVE_SEAM_END_CAP_RADIUS_MIN)
  let botExtraY = botY + CAVE_SEAM_BOTTOM_EXTRA_DROP + (caveSeed01(seed + 12.2) - 0.5) * 5
  botExtraY = Math.min(botExtraY, bottomY - botExtraRadius - 3)
  botExtraY = Math.max(botExtraY, floorY + botExtraRadius - 0.5)
  const botExtraSeamX = caveSeamCoverXAtY(interiorLeftEdge, botExtraY, cutLeft, fallbackX)
  rocks.push({
    x: botExtraSeamX + (caveSeed01(seed + 13.4) - 0.5) * 9,
    y: botExtraY,
    radius: botExtraRadius,
    straddleMouthGround: true,
    verts: buildRockVertices(botExtraRadius)
  })
}
function appendCaveMouthCeilingLipRocks(rocks, mouth, interiorLeftEdge, floorY, seed, lipRightX) {
  if (!interiorLeftEdge?.length || !mouth?.right?.length) return
  const lipSeed = interiorLeftEdge[0].x * 0.041 + floorY * 0.002
  const lipEndX = lipRightX ?? mouth.right[0].x + 4
  const topEdge = buildJaggedHorizontalEdge(
    interiorLeftEdge[0].x - 6,
    lipEndX,
    floorY,
    lipSeed
  )
  topEdge.forEach((p, i) => {
    const radius = 7 + caveSeed01(seed + i * 3.4) * 18
    rocks.push({
      x: p.x + (caveSeed01(seed + i * 5.9) - 0.5) * 10,
      y: p.y + radius * 0.42,
      radius,
      straddleMouthGround: true,
      verts: buildRockVertices(radius)
    })
  })
}
function buildCaveContourRocks(mouth, floorY, bottomY, seed, interiorWallX = null) {
  const rocks = []
  const lipSeed = mouth.left[0].x * 0.037
  const bottomEdge = buildJaggedHorizontalEdge(
    mouth.right[mouth.right.length - 1].x, mouth.left[mouth.left.length - 1].x, mouth.bottomY, lipSeed + 500
  )
  bottomEdge.forEach((p, i) => {
    const radius = 5 + caveSeed01(seed + 300 + i * 3.8) * 12
    rocks.push({
      x: p.x + (caveSeed01(seed + 400 + i * 5.5) - 0.5) * 12,
      y: p.y + radius * 0.25,
      radius,
      verts: buildRockVertices(radius)
    })
  })
  const edgeStride = 2
  if (interiorWallX == null) {
    mouth.left.forEach((p, i) => {
      if (i % edgeStride !== 0) return
      if (p.y < floorY + 6) return
      const radius = 5 + caveSeed01(seed + 700 + i * 2.1) * 11
      rocks.push({
        x: p.x - radius * 0.55,
        y: p.y + (caveSeed01(seed + 800 + i) - 0.5) * 10,
        radius,
        verts: buildRockVertices(radius)
      })
    })
  }
  mouth.right.forEach((p, i) => {
    if (i % edgeStride !== 0) return
    const radius = 5 + caveSeed01(seed + 900 + i * 2.4) * 11
    rocks.push({
      x: p.x + radius * 0.55,
      y: p.y + (caveSeed01(seed + 1000 + i) - 0.5) * 10,
      radius,
      verts: buildRockVertices(radius)
    })
  })
  return rocks
}
//
// Stacks ground-style rock silhouettes along a ragged cave wall edge.
//
function appendCaveWallRocks(wallRocks, edge, outwardSign, seed, floorY, bottomY, minGroundY = floorY) {
  if (!edge?.length) return
  for (let layer = 0; layer < CAVE_WALL_ROCK_LAYERS; layer++) {
    const layerSeed = seed + layer * 137
    for (let i = 0; i < edge.length; i += CAVE_WALL_ROCK_STEP) {
      const p = edge[i]
      const radius = 5 + caveSeed01(layerSeed + i * 3.17) * 12
      //
      // Allowed to go slightly negative (rock drifts inward, straddling the
      // wall line into the void) instead of always sitting outward — a
      // uniformly positive depth made the wall read as one crisp edge with
      // rocks stacked neatly behind it.
      //
      const depth = -38 + layer * 12 + caveSeed01(layerSeed + i * 7.9) * 42
      const yJ = (caveSeed01(layerSeed + i * 11.3) - 0.5) * 14
      //
      // Clamp to [floorY + radius, bottomY - radius - 2] — never above ground
      // (floorY) and never past the pit's own bottom — while keeping p.y's
      // natural spread down the wall so rocks cover its full depth instead
      // of collapsing onto one band right at the ground line.
      //
      const y = Math.max(minGroundY + radius, Math.min(bottomY - radius - 2, p.y + yJ))
      const straddleMouthGround = p.y < floorY + radius
      wallRocks.push({
        x: p.x + outwardSign * depth,
        y,
        radius,
        straddleMouthGround,
        verts: buildRockVertices(radius)
      })
    }
  }
}
//
// Jagged floor horizontal profile
//
const HORIZ_PROFILE_STEPS = 32
const HORIZ_WALK_DRIFT = 4.5
const HORIZ_JAG_SLOW = 11
const HORIZ_JAG_MID = 7
const HORIZ_JAG_FINE = 5
const FLOOR_BAND_H = 11
//
// Shoreline-style left/right cave mouth edges
//
const CAVE_MOUTH_EDGE_STEPS = 28
const CAVE_MOUTH_INSET = 6
const CAVE_MOUTH_WALK = 20
const CAVE_MOUTH_WOBBLE_SLOW = 22
const CAVE_MOUTH_WOBBLE_MID = 14
const CAVE_MOUTH_WOBBLE_FINE = 8
const CAVE_MOUTH_NOTCH = 18
//
// Jagged walk-surface profile along the pit floor
//
function buildJaggedFloorTop(x1, x2, bottomY, seed) {
  return buildJaggedHorizProfile(x1, x2, bottomY - FLOOR_BAND_H, seed + 200, 0)
}
//
// Ragged cave mouth — jagged top lip plus wavy left/right walls
//
function buildCaveMouth(zone, floorY, bottomY, seed) {
  const left = buildCaveMouthEdge(zone.x1 + CAVE_MOUTH_INSET, floorY, bottomY, seed + 50, 1)
  const right = buildCaveMouthEdge(zone.x2 - CAVE_MOUTH_INSET, floorY, bottomY, seed + 350, -1)
  return { left, right, floorY, bottomY }
}
//
// One wavy vertical cave wall edge — shoreline-style, not a straight line
//
function buildCaveMouthEdge(baseX, topY, bottomY, seed, inwardSign) {
  const steps = CAVE_MOUTH_EDGE_STEPS
  const depth = bottomY - topY
  const pts = []
  let walk = 0
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const y = topY + t * depth
    //
    // Blocky steps: hold X for a few samples then jump (ragged rock slabs).
    //
    if (i % 3 === 0) {
      walk += (caveSeed01(seed + i * 4.1) - 0.5) * CAVE_MOUTH_WALK * 1.6
      walk *= 0.82
    }
    const bay = caveSeed01(seed + i * 8.6) > 0.72
      ? (caveSeed01(seed + i * 12.4) - 0.5) * CAVE_MOUTH_NOTCH * 2.4
      : 0
    const wobble =
      walk +
      Math.sin(t * Math.PI * 2.8 + seed * 0.75) * CAVE_MOUTH_WOBBLE_SLOW +
      Math.sin(t * Math.PI * 7.5 + seed * 1.4) * CAVE_MOUTH_WOBBLE_MID +
      Math.sin(t * 28 + seed * 2.15) * CAVE_MOUTH_WOBBLE_FINE +
      bay
    pts.push({ x: baseX + inwardSign * wobble, y })
  }
  return pts
}
//
// Shared horizontal meander — floor top or ceiling lip
//
function buildJaggedHorizProfile(x1, x2, baseY, seed, depthAmp = 0) {
  const steps = HORIZ_PROFILE_STEPS
  const span = x2 - x1
  const pts = []
  let walk = 0
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = x1 + t * span
    walk += (caveSeed01(seed + i * 4.3) - 0.5) * HORIZ_WALK_DRIFT
    walk *= 0.86
    const notch = caveSeed01(seed + i * 8.4) > 0.8
      ? (caveSeed01(seed + i * 11.2) - 0.5) * HORIZ_JAG_MID * 2
      : 0
    const jag =
      walk +
      Math.sin(t * Math.PI * 5.8 + seed * 0.55) * HORIZ_JAG_SLOW +
      Math.sin(t * Math.PI * 14.2 + seed * 1.35) * HORIZ_JAG_MID +
      Math.sin(t * 47 + seed * 2.4) * HORIZ_JAG_FINE +
      notch
    pts.push({
      x,
      y: baseY + jag * (depthAmp > 0 ? 1 : 0.85) +
        (depthAmp > 0 ? caveSeed01(seed + i) * depthAmp * 0.35 : 0)
    })
  }
  return pts
}
//
// Keeps horizontal profiles inside the cave mouth (nothing above floorY)
//
function clampHorizProfile(profile, zone, floorY, bottomY) {
  return profile.map(p => ({
    x: Math.max(zone.x1, Math.min(zone.x2, p.x)),
    y: Math.max(floorY, Math.min(bottomY, p.y))
  }))
}
//
// Linearly samples Y on a jagged {x,y} profile
//
function sampleProfileY(profile, x) {
  if (!profile?.length) return 0
  if (x <= profile[0].x) return profile[0].y
  const last = profile[profile.length - 1]
  if (x >= last.x) return last.y
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i]
    const b = profile[i + 1]
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x)
      return a.y + (b.y - a.y) * t
    }
  }
  return last.y
}
//
// Samples X on a vertical {x,y} wall profile (mouth / interior edges).
//
function sampleProfileXAtY(profile, y) {
  if (!profile?.length) return null
  if (y <= profile[0].y) return profile[0].x
  const last = profile[profile.length - 1]
  if (y >= last.y) return last.x
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i]
    const b = profile[i + 1]
    if (y >= a.y && y <= b.y) {
      const t = (y - a.y) / (b.y - a.y)
      return a.x + (b.x - a.x) * t
    }
  }
  return last.x
}
function caveSeed01(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
/**
 * Pit cave mushroom is visible and bouncy only after the lying eyes are taken.
 * @param {Object} pit - Pit state
 * @returns {boolean}
 */
export function isGlowPitMushroomUnlocked(pit) {
  if (!pit?.collapsed) return false
  const inst = pit?.sceneRef
  if (inst?.zones?.eyesCollected) return true
  if (get(KEY_EYES_COLLECTED, false)) return true
  const intro = inst?.eyeIntro
  if (!intro) return false
  return Boolean(intro.pickup?.collected) ||
    intro.phase === 'runBack' ||
    intro.phase === 'complete'
}
function isPitMushroomVisible(pit) {
  return isGlowPitMushroomUnlocked(pit)
}
function isPitMushroomBouncy(pit) {
  return isGlowPitMushroomUnlocked(pit)
}
function isGlowPitMushroomFlatMono(sc) {
  if (!sc?.zones) return false
  const z = sc.zones
  if (z.lCollected || z.colorWorld) return false
  if ((sc.colorFade ?? 0) >= 0.5) return false
  return true
}
function drawPitTrampoline(k, pit) {
  if (!isPitMushroomVisible(pit)) return
  const x = pit.trampState.x
  const y = pit.floorY + pit.zone.depth - 2
  const squash = pit.trampState.squash
  const scaleY = 1 - squash * 0.35
  const sc = pit.sceneRef
  const z = sc?.zones
  const fade = sc?.colorFade ?? 0
  const colorMush = z?.lCollected || z?.oCollected || z?.colorWorld || fade >= 0.5
  const flatMono = isGlowPitMushroomFlatMono(sc)
  const sprite = colorMush
    ? PIT_MUSH_OUTLINE_SPRITE
    : flatMono
      ? PIT_MUSH_FLAT_FILL_SPRITE
      : PIT_MUSH_SPRITE
  k.drawSprite({
    sprite,
    pos: k.vec2(x, y),
    anchor: 'bot',
    scale: k.vec2(1, scaleY),
    color: k.rgb(255, 255, 255)
  })
}
//
// World X of the pit cave skull anchor (matches glow-cave-skeleton layout).
//
function getPitCaveSkeletonAnchorX(zone) {
  const { innerX } = getGlowPitFloorCollider(zone)
  return innerX + PIT_CAVE_SKULL_FLOOR_PAD + PIT_CAVE_SKULL_R
}
//
// Walkable mouth lip above the pit drop — short span centred over the skull.
//
function getGlowPitMouthWalkShelf(zone) {
  const skullX = getPitCaveSkeletonAnchorX(zone)
  const mouthCapX = zone.x1 + CAVE_MOUTH_INSET + 6
  const rightX = Math.min(skullX + 4, mouthCapX)
  const w = PIT_MOUTH_WALK_SHELF_W
  const x = rightX - w
  return { x, w }
}
//
// Cave pit floor body — spans to the mouth's right wall for full walk room.
//
export function getGlowPitFloorCollider(zone) {
  const innerX = zone.x1 + PIT_WALL_W - PIT_FLOOR_EXTRA_W_LEFT - CAVE_INTERIOR_EXTEND_LEFT
  const innerW = Math.max(24, zone.width - PIT_WALL_W * 2 +
    PIT_FLOOR_EXTRA_W_LEFT + PIT_FLOOR_EXTRA_W_RIGHT + CAVE_INTERIOR_EXTEND_LEFT)
  return { innerX, innerW }
}
/**
 * Horizontal span where onDraw earth/static bands must stay clear so the pit
 * interior (extended floor west of the crack lip) is not painted over the hero.
 * @param {Object} zone - Pit / crack zone from getCrackZone
 * @returns {{ leftX: number, rightX: number }}
 */
export function getGlowPitEarthBandMouthCutout(zone) {
  const lipLeft = zone.x1 - CAVE_MOUTH_MAIN_FLOOR_INSET - CAVE_MOUTH_ENTRANCE_EXPAND_LEFT
  const { innerX } = getGlowPitFloorCollider(zone)
  const leftX = Math.min(lipLeft, innerX - CAVE_LEFT_BLOCK_W * 2)
  const rightX = zone.x2 + CAVE_MOUTH_MAIN_FLOOR_INSET
  return { leftX, rightX }
}
/**
 * True when world X lies inside the open pit mouth cutout (no surface decor).
 * @param {Object|null} pit - Pit state
 * @param {number} x - World X
 * @returns {boolean}
 */
export function isGlowOpenPitMouthWorldX(pit, x) {
  if (!pit?.collapsed || !pit.zone) return false
  const { leftX, rightX } = getGlowPitEarthBandMouthCutout(pit.zone)
  return x >= leftX && x <= rightX
}
export function ensureGlowPitOpenForEyesCollected(pit) {
  syncGlowPitOpenState(pit)
}
/**
 * Keeps the cave open whenever the hero already has eyes; closed only while
 * eyeless and the pit has not been entered yet.
 * @param {Object} pit - Pit state
 */
export function syncGlowPitOpenState(pit) {
  if (!pit) return
  const zones = pit.sceneRef?.zones
  const heroInst = pit.heroInst || pit.sceneRef?.heroInst
  if (!shouldGlowPitBeOpenForZones(zones, null, heroInst)) return
  const hasEyes = glowHeroHasCollectedEyes(zones, heroInst)
  hasEyes && persistGlowEyesFromHeroState(pit)
  hasEyes && (pit.outlineOnlyMode = false)
  hasEyes && (pit.skipPitBonus = true)
  if (!pit.collapsed) {
    hasEyes ? collapsePit(pit) : collapseGlowPitForEyeIntro(pit)
    hasEyes && (pit.outlineOnlyMode = false)
    return
  }
  pit.crackFloor?.destroy?.()
  pit.crackFloor = null
  hasEyes && (pit.outlineOnlyMode = false)
  hasEyes && (pit._caveSpriteReady = false)
  hasEyes && (pit._caveBakeRocksKey = null)
  if (!pit.pitFloor) {
    openPitPhysics(pit)
  } else {
    ensureGlowPitMouthWalkShelf(pit)
  }
}
function persistGlowEyesFromHeroState(pit) {
  const zones = pit.sceneRef?.zones
  const heroInst = pit.heroInst || pit.sceneRef?.heroInst
  if (!zones || heroInst?.noEyes !== false || zones.eyesCollected) return
  zones.eyesCollected = true
  set(KEY_EYES_COLLECTED, true)
  set(KEY_PIT_COLLAPSED, true)
}
/**
 * Hero body Y so feet rest on the cave pit floor collider top.
 * @param {Object} pit - Pit state
 * @returns {number} Kaplay character pos.y
 */
export function getGlowPitHeroStandY(pit) {
  const bottomY = pit.floorY + pit.zone.depth
  const heroFeetOffset = 38
  const embed = 0
  return bottomY - heroFeetOffset + embed
}
function collapsePit(pit) {
  if (pit.collapsed) return
  pit.collapsed = true
  set(KEY_PIT_COLLAPSED, true)
  pit.crackFloor?.destroy?.()
  pit.crackFloor = null
  pit.interiorRevealHoldoff = pit.k.time() + CAVE_INTERIOR_REVEAL_HOLDOFF
  pit._caveSpriteReady = false
  openPitPhysics(pit)
  spawnPitBurst(pit)
}
/**
 * Opens the cave for the eyeless intro — no pit bonus fragment, outline-only
 * interior until the hero collects the lying eyes.
 * @param {Object} pit - Pit state
 */
export function collapseGlowPitForEyeIntro(pit) {
  if (!pit || pit.collapsed) return
  pit.skipPitBonus = true
  pit.outlineOnlyMode = true
  collapsePit(pit)
}
/**
 * Re-opens the cave pit after a level reload when it was collapsed before
 * leave but the persisted flag was missing.
 * @param {Object} pit - Pit state
 * @param {boolean} [forEyeIntro=false] - Eyeless intro outline-only collapse
 */
export function ensureGlowPitCollapsedOnReload(pit, forEyeIntro = false) {
  if (!pit || pit.collapsed) return
  forEyeIntro ? collapseGlowPitForEyeIntro(pit) : collapsePit(pit)
}
/**
 * Restores outline-only cave rendering during the eyeless intro arc.
 * @param {Object} pit - Pit state
 */
export function restoreGlowPitEyeIntroInterior(pit) {
  if (!pit?.collapsed) return
  pit.outlineOnlyMode = true
  pit.skipPitBonus = true
  pit.cracksVisible = true
}
/**
 * World position where the cave bonus fragment (and eye pickup) sits.
 * @param {Object} pit - Pit state
 * @returns {{ x: number, y: number }|null}
 */
export function getGlowPitBonusPosition(pit) {
  if (!pit?.zone) return null
  const { zone, floorY } = pit
  const bottomY = floorY + zone.depth
  const { innerX, innerW } = getGlowPitFloorCollider(zone)
  return {
    x: innerX + innerW * 0.14,
    y: bottomY - 18
  }
}
function openPitPhysics(pit) {
  const { k, zone, floorY } = pit
  const bottomY = floorY + zone.depth
  const { innerX, innerW } = getGlowPitFloorCollider(zone)
  pit.pitFloor?.destroy?.()
  pit.pitFloor = null
  //
  // Floor only — side bounds are soft clamps (no invisible wall rects)
  //
  pit.pitFloor = k.add([
    k.rect(innerW, 16),
    k.pos(innerX, bottomY),
    k.anchor('topleft'),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName
  ])
  //
  // Invisible left wall — pit floor up to the main ground lip (mouth unchanged).
  //
  pit.pitLeftWall?.destroy?.()
  const wallH = bottomY - floorY
  pit.pitLeftWall = k.add([
    k.rect(CAVE_LEFT_BLOCK_W, wallH),
    k.pos(innerX - CAVE_LEFT_BLOCK_W * 0.35, floorY),
    k.anchor('topleft'),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName
  ])
  refreshGlowPitMouthWalkShelf(pit)
}
//
// Recreates the short mouth lip collider (layout bumps or saves before v51).
//
function refreshGlowPitMouthWalkShelf(pit) {
  if (!pit?.collapsed || !pit.k || !pit.zone) return
  const { k, zone, floorY } = pit
  pit.pitMouthWalkShelf?.destroy?.()
  pit.pitMouthWalkShelf = null
  const shelf = getGlowPitMouthWalkShelf(zone)
  pit.pitMouthWalkShelf = k.add([
    k.rect(shelf.w, 16),
    k.pos(shelf.x, floorY),
    k.anchor('topleft'),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName
  ])
}
function ensureGlowPitMouthWalkShelf(pit) {
  if (!pit?.collapsed || !pit.pitFloor) return
  if (pit._mouthShelfLayoutVer === CAVE_LAYOUT_VERSION && pit.pitMouthWalkShelf) return
  refreshGlowPitMouthWalkShelf(pit)
  pit._mouthShelfLayoutVer = CAVE_LAYOUT_VERSION
}
function updatePitTrampoline(pit, char) {
  if (!isPitMushroomBouncy(pit)) return
  if (pit.trampState.cooldown > 0) return
  const x = pit.trampState.x
  const mushH = PIT_TRAMP_W * CUTE_MUSHROOM_ASPECT
  const capTop = pit.floorY + pit.zone.depth - mushH
  const feet = char.pos.y + 38
  const onCap = Math.abs(char.pos.x - x) < PIT_TRAMP_CAP_HALF_W &&
    feet >= capTop - 10 && feet <= capTop + 16
  if (onCap && (char.vel?.y ?? 0) >= -40) {
    if (pit.onPitMushroomLaunch?.(pit, char)) {
      pit.trampState.squash = 1
      return
    }
    char.vel.y = -PIT_TRAMP_FORCE
    pit.trampState.cooldown = PIT_TRAMP_COOLDOWN
    pit.trampState.squash = 1
    if (pit.sound && !pit.sound._glowSfxMuted) {
      Sound.playJumpSound(pit.sound)
    }
  }
}
function spawnPitBurst(pit) {
  const { k, zone, floorY, groundColor } = pit
  const c = groundColor || glowRgb('void')
  for (let i = 0; i < PIT_PARTICLE_COUNT; i++) {
    const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7
    const speed = 120 + Math.random() * 220
    pit.particles.push({
      x: zone.x1 + Math.random() * zone.width,
      y: floorY + 4,
      vx: Math.cos(angle) * speed * (Math.random() < 0.5 ? -1 : 1) * 0.35 + (Math.random() - 0.5) * 80,
      vy: Math.sin(angle) * speed,
      life: 0.5 + Math.random() * 0.7,
      age: 0,
      size: 3 + Math.random() * 5,
      r: c.r,
      g: c.g,
      b: c.b
    })
  }
  k.add([
    k.z(20),
    {
      draw() {
        for (const p of pit.particles) {
          k.drawRect({
            pos: k.vec2(p.x, p.y),
            width: p.size,
            height: p.size,
            color: k.rgb(p.r, p.g, p.b),
            opacity: Math.max(0, 1 - p.age / p.life)
          })
        }
      }
    }
  ])
}
//
// Eyeless intro: interior reveals only after the hero clears the mouth lip.
// With eyes collected the interior stays visible from the surface too.
//
function isCaveInteriorVisible(pit) {
  if (!pit?.collapsed) return false
  const char = pit.heroInst?.character || pit.sceneRef?.heroInst?.character
  //
  // Eyeless intro: show the void interior as soon as the hero hits the pit
  // floor (lying eyes + skeleton), even during the post-collapse holdoff.
  //
  if (pit.outlineOnlyMode && isHeroOnPitCaveFloor(pit, char)) return true
  if (pit.interiorRevealHoldoff != null && pit.k.time() < pit.interiorRevealHoldoff) return false
  const zones = pit.sceneRef?.zones
  const heroInst = pit.heroInst || pit.sceneRef?.heroInst
  if (glowHeroHasCollectedEyes(zones, heroInst)) return true
  if (!char?.pos) return false
  const feetY = char.pos.y + PIT_CAVE_FLOOR_FEET_Y
  return feetY > pit.floorY + CAVE_INTERIOR_REVEAL_FEET_PAST
}
function updatePitParticles(pit, dt) {
  for (let i = pit.particles.length - 1; i >= 0; i--) {
    const p = pit.particles[i]
    p.age += dt
    p.vy += 520 * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (p.age >= p.life) pit.particles.splice(i, 1)
  }
}

export { KEY_PIT_COLLAPSED }
