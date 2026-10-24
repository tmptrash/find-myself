import { CFG } from '../../../cfg.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import {
  FOREST_PAL,
  forestCaveEarthDeepRgb,
  forestRgb
} from './forest-palette.js'
import { applyForestFilmGrainToCanvas } from './forest-parallax-grain.js'
import { drawStaticDecorSprite, ensureStaticDecorSprite } from './forest-static-bake.js'
import { buildRockVertices } from '../../../utils/draw-rock.js'
//
// Midges + right-edge crack pit for the forest level
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
// Invisible lip shelf at the cave mouth.
//
const PIT_MOUTH_WALK_SHELF_W = 22
//
// Painted ground / earth-band mouth line sits this far right of the walk
// shelf's left edge (shorter lip than the invisible stand collider).
//
const CAVE_MOUTH_GROUND_LINE_TRIM_LEFT = 12
//
// Shorten the mouth lip shelf from the left and widen the cave entrance by the
// same amount.
//
export const CAVE_MOUTH_ENTRANCE_EXPAND_LEFT = 42
//
// Pre-collapse earth-band cutout extends this far past the crack zone on the
// right — smaller values tuck the painted mouth gap toward the pit opening.
//
export const CAVE_MOUTH_MAIN_FLOOR_INSET = 22
//
// 2/3 field midges spread along the playfield width, 1/3 at the cave mouth
//
const MIDGE_TOTAL = 60
const MIDGE_PIT_COUNT = Math.round(MIDGE_TOTAL / 3)
const MIDGE_FIELD_COUNT = MIDGE_TOTAL - MIDGE_PIT_COUNT
const MIDGE_SPEED_MIN = 8
const MIDGE_SPEED_MAX = 22
const MIDGE_RADIUS_MIN = 1.2
const MIDGE_RADIUS_MAX = 2.4
//
// Per-midge oscillation frequencies — randomized around these bases so every
// midge traces its own wander curve instead of a shared shape offset only by
// phase (which reads as the same trajectory repeated with a time delay).
//
const MIDGE_FREQ_DRIFT_X_BASE = 2.1
const MIDGE_FREQ_DRIFT_Y_BASE = 2.7
const MIDGE_FREQ_WANDER_X_BASE = 3.2
const MIDGE_FREQ_WANDER_Y_BASE = 2.4
const MIDGE_FREQ_VARIANCE = 0.4
const MIDGE_Z = 14
//
// Skip midge circles that sit well outside the current camera window.
//
const MIDGE_DRAW_CULL_PAD = 48
const MIDGE_PIT_SPREAD_X = 36
const MIDGE_PIT_SPREAD_Y = 26
const PIT_DEPTH = Math.round(HERO_BODY_H * 1.65)
//
// Cave floor spot (share of the crack zone width) where the ground portal opens.
//
const PIT_CAVE_TRAMP_ZONE_T = 0.82
const PIT_DRAW_CULL_MARGIN = 80
const CAVE_LAYOUT_VERSION = 72
//
// Interior decor kept sparse: a few larger stones on the floor and in the
// void rather than dozens of small fragments.
//
const CAVE_FLOOR_PEBBLE_COUNT_MIN = 5
const CAVE_FLOOR_PEBBLE_COUNT_RANGE = 4
const CAVE_FLOOR_PEBBLE_R_MIN = 5
const CAVE_FLOOR_PEBBLE_R_RANGE = 5
const CAVE_BG_ROCK_COUNT_MIN = 6
const CAVE_BG_ROCK_COUNT_RANGE = 4
const CAVE_BG_ROCK_R_MIN = 7
const CAVE_BG_ROCK_R_RANGE = 8
//
// Lit cap on each stone body: a shrunken copy shifted up-left.
//
const CAVE_ROCK_CAP_SCALE = 0.62
const CAVE_ROCK_CAP_SHIFT = 0.22
//
// Depth shading inside the void: darkest toward the low back, a faint lit
// band of soil just under the mouth.
//
const CAVE_RECESS_CENTER_X_FRAC = 0.42
const CAVE_RECESS_CENTER_Y_FRAC = 0.72
const CAVE_RECESS_RADIUS_FRAC = 0.75
const CAVE_RECESS_ALPHA = 0.85
const CAVE_LIP_BAND_FRAC = 0.32
const CAVE_LIP_ALPHA = 0.28
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
// Cave anchor: a point near the west end of the pit floor that the mouth lip
// shelf and the interior west wall are laid out from.
//
const CAVE_INTERIOR_WALL_LEFT_OF_ANCHOR = 96
const PIT_CAVE_ANCHOR_FLOOR_PAD = 37
const CAVE_ANCHOR_CLEAR_HALF_W = 73
//
// Extra interior floor width to the left of the mouth — entrance lip unchanged.
//
const CAVE_INTERIOR_EXTEND_LEFT = 132
const CAVE_LEFT_BLOCK_W = 12
//
// Wall rocks: fewer, larger stones along each wall — still wide enough to
// hide the void / earth join.
//
const CAVE_WALL_ROCK_STEP = 5
const CAVE_WALL_ROCK_LAYERS = 2
const CAVE_WALL_ROCK_R_MIN = 9
const CAVE_WALL_ROCK_R_RANGE = 10
//
// Only every Nth cave stone gets the lit reddish-brown body; the rest take
// the dark soil tone so stones read as embedded, not as pink confetti.
//
const CAVE_ROCK_LIT_EVERY = 3
//
// Versioned so a CAVE_LAYOUT_VERSION bump (any change to the cave geometry
// generator) always forces a fresh bake. Forest and menu share one native
// Kaplay instance (see engine-switch.js's NATIVE_RESOLUTION_SCENE_PREFIXES),
// so leaving the level and coming back without a full page reload reuses
// the same k — a fixed unversioned sprite name would keep whatever was
// baked on the very first visit to the cave that session, silently
// outliving any later code fix to the geometry it was baked from.
//
const CAVE_INTERIOR_SPRITE = `forest0-cave-interior-v${CAVE_LAYOUT_VERSION}`
const CAVE_BAKE_PAD = 40
//
// Foreground / seam-cover rock passes (~190 polygons) are baked per layout
// and decor mode — cached on the wallProfile object, so a layout rebuild
// starts a fresh cache automatically.
//
const CAVE_FOREGROUND_BAKE_SLOT = 'caveForegroundRocks'
const CAVE_SEAM_BAKE_SLOT = 'caveSeamRocks'
const CAVE_ROCK_BAKE_KEY_TONE = 'tone'
const CAVE_FOREGROUND_GRAIN_SEED = 0.29
const CAVE_SEAM_GRAIN_SEED = 0.83
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
export function createForestMidges(k, floorY, screenW, opts = {}) {
  const treeX = opts.treeX ?? screenW * 0.5
  const zone = getCrackZone(screenW, floorY)
  const pitCx = zone.x1 + zone.width * 0.4
  const pitCy = floorY - 32
  const minY = floorY - 70
  const maxY = floorY - 14
  const fieldMinX = LEFT_MARGIN + 16
  const fieldMaxX = zone.x1 - 16
  const fieldSpan = Math.max(40, fieldMaxX - fieldMinX)
  const midges = []
  for (let i = 0; i < MIDGE_PIT_COUNT; i++) {
    midges.push(makeMidge(
      pitCx + (Math.random() - 0.5) * MIDGE_PIT_SPREAD_X * 2,
      pitCy + (Math.random() - 0.5) * MIDGE_PIT_SPREAD_Y * 2,
      'pit'
    ))
  }
  //
  // Even horizontal bands with jitter so the swarm reads across the whole
  // walkable width, not clustered on one side.
  //
  for (let i = 0; i < MIDGE_FIELD_COUNT; i++) {
    const slot = (i + Math.random()) / MIDGE_FIELD_COUNT
    midges.push(makeMidge(
      fieldMinX + slot * fieldSpan,
      minY + Math.random() * (maxY - minY),
      'field'
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
    },
    midgeBatch: PolyBatch.create()
  }
  k.add([
    k.z(MIDGE_Z),
    {
      draw() {
        drawForestMidges(k, ctrl)
      }
    }
  ])
  return ctrl
}
/**
 * Syncs midge visibility to explored ground sides / open cave.
 * @param {Object} ctrl - Midges controller
 * @param {Object} zones - Forest zone flags
 * @param {boolean} pitCollapsed - Whether the cave is open
 */
export function syncForestMidgesZones(ctrl, zones, pitCollapsed) {
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
export function updateForestMidges(ctrl, dt, worldLife = 0) {
  if (!ctrl?.midges) return
  ctrl.worldLife = worldLife
  if (worldLife < 0.02) return
  const t = performance.now() * 0.001
  const move = worldLife
  for (const m of ctrl.midges) {
    if (!midgeRoleVisible(ctrl, m.role)) continue
    const bounds = boundsForRole(ctrl, m.role)
    m.driftVx += Math.sin(t * m.freqDriftX + m.phase) * 18 * dt * move
    m.driftVy += Math.cos(t * m.freqDriftY + m.phaseY) * 14 * dt * move
    m.driftVx *= 0.98
    m.driftVy *= 0.98
    const sp = m.speed * dt * move
    m.x += m.driftVx * dt * move + Math.sin(t * m.freqWanderX + m.phase) * sp
    m.y += m.driftVy * dt * move + Math.cos(t * m.freqWanderY + m.phaseY) * sp * 0.7
    if (m.x < bounds.minX) { m.x = bounds.minX; m.driftVx = Math.abs(m.driftVx) }
    if (m.x > bounds.maxX) { m.x = bounds.maxX; m.driftVx = -Math.abs(m.driftVx) }
    if (m.y < bounds.minY) { m.y = bounds.minY; m.driftVy = Math.abs(m.driftVy) }
    if (m.y > bounds.maxY) { m.y = bounds.maxY; m.driftVy = -Math.abs(m.driftVy) }
  }
}
/**
 * Sets up the always-open cave pit at the right edge of the playfield.
 * @param {Object} cfg - Setup config
 * @returns {Object} Pit state
 */
export function createForestPit(cfg) {
  const {
    k, floorY, screenW, heroInst, sound, levelIndicator,
    heroBodyColor, groundColor
  } = cfg
  const zone = getCrackZone(screenW, floorY)
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
    collapsed: true,
    portalX: zone.x1 + zone.width * PIT_CAVE_TRAMP_ZONE_T,
    pitFloor: null,
    pitWalls: [],
    pitLeftWall: null,
    pitMouthWalkShelf: null,
    wallProfile: null
  }
  openPitPhysics(pit)
  return pit
}
/**
 * Keeps the hero inside the open cave pit.
 * @param {Object} pit - Pit state
 * @param {Object} char - Hero character
 */
export function updateForestPit(pit, char) {
  if (!pit || !char?.pos) return
  clampHeroInCave(pit, char)
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
  const { innerX, innerW } = getForestPitFloorCollider(pit.zone)
  const minX = innerX + 6
  const maxX = innerX + innerW - 6
  if (char.pos.x < minX) char.pos.x = minX
  if (char.pos.x > maxX) char.pos.x = maxX
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
  const standY = getForestPitHeroStandY(pit)
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
 * Draws the open cave pit.
 * @param {Object} k - Kaplay instance
 * @param {Object} pit - Pit state
 */
export function drawForestPit(k, pit) {
  if (!pit) return
  const sc = pit.sceneRef
  if (sc?.k && pit.zone && sc.camera?.viewW) {
    const camX = sc.k.camPos().x
    const zoom = sc.camera.zoom || 1
    const half = sc.camera.viewW / (2 * zoom) + PIT_DRAW_CULL_MARGIN
    if (pit.zone.x2 < camX - half || pit.zone.x1 > camX + half) return
  }
  drawCaveInteriorRockStyle(k, pit)
}
/**
 * Pit mushroom, seam-cover rocks and scattered interior rocks — draw after
 * onDraw earth/static so crisp bake edges do not clip them.
 * @param {Object} k - Kaplay instance
 * @param {Object} pit - Pit state
 */
export function drawForestPitCaveForegroundDecor(k, pit) {
  if (!pit?.wallProfile?.mouth) return
  const layout = pit.wallProfile
  drawBakedCaveRockGroups(k, pit, CAVE_FOREGROUND_BAKE_SLOT, CAVE_FOREGROUND_GRAIN_SEED, [
    layout.wallRocks?.filter(rock => !rock.straddleMouthGround),
    layout.backgroundRocks,
    layout.contourRocks?.filter(rock => !rock.straddleMouthGround),
    layout.pebbles
  ])
}
/**
 * Forces the cave interior bake to rebuild (layout change).
 * @param {Object|null} pit - Pit state
 */
export function invalidateForestPitCaveInteriorBake(pit) {
  if (!pit) return
  pit._caveSpriteReady = false
  pit._caveBakeRocksKey = null
}
/**
 * Seam-cover rocks — drawn last so earth/static cannot hide them.
 * @param {Object} k - Kaplay instance
 * @param {Object} pit - Pit state
 */
export function drawForestPitCaveSeamCoverRocks(k, pit) {
  if (!pit?.wallProfile?.mouth) return
  const layout = pit.wallProfile
  drawBakedCaveRockGroups(k, pit, CAVE_SEAM_BAKE_SLOT, CAVE_SEAM_GRAIN_SEED, [
    layout.wallRocks?.filter(rock => rock.straddleMouthGround),
    layout.contourRocks?.filter(rock => rock.straddleMouthGround)
  ])
}
//
// Bakes rock groups once per layout + decor mode and blits the result. Each
// group keeps its own fill/shade alternation, same as drawCaveLayoutRocks.
//
function drawBakedCaveRockGroups(k, pit, slot, grainSeed, groups) {
  const bounds = caveRockGroupsBounds(groups, pit.floorY)
  if (!bounds) return
  const pal = buildCavePalette()
  drawStaticDecorSprite(k, ensureStaticDecorSprite(k, pit.wallProfile, slot, CAVE_ROCK_BAKE_KEY_TONE, bounds,
    ctx => groups.forEach(rocks => paintCanvasRocks(ctx, rocks, pal, pit.floorY, true)),
    pit.zone.x1 * grainSeed))
}
function caveRockGroupsBounds(groups, floorY) {
  const bounds = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity }
  groups.forEach(rocks => rocks?.forEach(rock => {
    if (!rock.verts?.length || !isCaveRockOnOrBelowGround(rock, floorY)) return
    rock.verts.forEach(v => {
      bounds.x1 = Math.min(bounds.x1, Math.round(rock.x) + v.x)
      bounds.y1 = Math.min(bounds.y1, Math.round(rock.y) + v.y)
      bounds.x2 = Math.max(bounds.x2, Math.round(rock.x) + v.x)
      bounds.y2 = Math.max(bounds.y2, Math.round(rock.y) + v.y)
    })
  }))
  return Number.isFinite(bounds.x1) ? bounds : null
}
//
// Private helpers
//
function makeMidge(x, y, role) {
  const freqMul = () => 1 + (Math.random() - 0.5) * 2 * MIDGE_FREQ_VARIANCE
  return {
    x,
    y,
    role,
    radius: MIDGE_RADIUS_MIN + Math.random() * (MIDGE_RADIUS_MAX - MIDGE_RADIUS_MIN),
    speed: MIDGE_SPEED_MIN + Math.random() * (MIDGE_SPEED_MAX - MIDGE_SPEED_MIN),
    phase: Math.random() * Math.PI * 2,
    phaseY: Math.random() * Math.PI * 2,
    freqDriftX: MIDGE_FREQ_DRIFT_X_BASE * freqMul(),
    freqDriftY: MIDGE_FREQ_DRIFT_Y_BASE * freqMul(),
    freqWanderX: MIDGE_FREQ_WANDER_X_BASE * freqMul(),
    freqWanderY: MIDGE_FREQ_WANDER_Y_BASE * freqMul(),
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
function drawForestMidges(k, ctrl) {
  const life = ctrl.worldLife ?? 0
  if (life < 0.02) return
  const voidRgb = forestRgb('void')
  const base = ctrl.midgeRgb || voidRgb
  const camX = k.camPos().x
  const camScale = k.camScale?.()
  const zoom = (typeof camScale === 'object' ? camScale.x : camScale) || 1
  const half = k.width() / (2 * zoom) + MIDGE_DRAW_CULL_PAD
  const minX = camX - half
  const maxX = camX + half
  const batch = ctrl.midgeBatch
  if (!batch) return
  PolyBatch.reset(batch)
  const color = midgeDrawColor(k, ctrl, base)
  for (const m of ctrl.midges) {
    if (!midgeRoleVisible(ctrl, m.role)) continue
    if (m.x < minX || m.x > maxX) continue
    PolyBatch.addDisc(batch, m.x, m.y, m.radius, color)
  }
  PolyBatch.flush(batch, k, life)
}
//
// One saturated fill per midge — no per-frame pulse or shade ladder.
//
function midgeDrawColor(k, ctrl, base) {
  if (ctrl._midgeColorKey !== base) {
    ctrl._midgeColorKey = base
    ctrl._midgeColor = k.rgb(base.r, base.g, base.b)
  }
  return ctrl._midgeColor
}
function drawCaveInteriorRockStyle(k, pit) {
  const { zone, floorY } = pit
  if (!pit.wallProfile || pit.wallProfile.version !== CAVE_LAYOUT_VERSION) {
    pit.wallProfile = buildCaveSceneLayout(zone, floorY)
    pit._caveSpriteReady = false
    pit._caveBakeRocksKey = null
    pit.collapsed && refreshForestPitMouthWalkShelf(pit)
  }
  ensureForestPitMouthWalkShelf(pit)
  bakeCaveInteriorSprite(k, pit)
  if (pit._caveSpriteReady) {
    drawCaveInteriorBakedSprite(k, pit)
    return
  }
  const layout = pit.wallProfile
  const pal = buildCavePalette()
  drawCaveVoidFill(k, layout.mouth, pal, layout.interiorWallEdge)
  drawCaveLayoutRocks(k, layout.wallRocks, pal, floorY)
  drawCaveLayoutRocks(k, layout.pebbles, pal, floorY)
}
//
// Bakes the static cave interior once — wall rocks are dozens of polygons
// per frame otherwise. Rebaked on a layout change (see
// invalidateForestPitCaveInteriorBake).
//
function bakeCaveInteriorSprite(k, pit) {
  const zone = pit.zone
  const layout = pit.wallProfile
  //
  // The interior floor/void extends well west of the surface crack zone
  // (interiorWallEdge, driven by the cave anchor / CAVE_INTERIOR_EXTEND_LEFT)
  // — a canvas sized from zone.width/zone.x1 alone cropped that whole western
  // span off silently (canvas fill outside 0..width is just clipped), leaving
  // the plain gray earth band visible through the "missing" left portion of
  // the cave with a hard seam where the crop line fell. Size and position the
  // canvas from the actual polygon extent instead.
  //
  const leftEdgeXs = layout?.interiorWallEdge?.length ? layout.interiorWallEdge.map(p => p.x) : []
  const rightEdgeXs = layout?.mouth?.right?.length ? layout.mouth.right.map(p => p.x) : []
  const leftX = Math.min(zone.x1, ...(leftEdgeXs.length ? leftEdgeXs : [zone.x1]))
  const rightX = Math.max(zone.x2, ...(rightEdgeXs.length ? rightEdgeXs : [zone.x2]))
  const ox = leftX - CAVE_BAKE_PAD
  const oy = pit.floorY - 8
  pit._caveSpriteX = ox
  pit._caveSpriteY = oy
  const bakeKey = CAVE_ROCK_BAKE_KEY_TONE
  if (
    pit._caveSpriteReady &&
    pit._caveBakeRocksKey === bakeKey &&
    pit._caveBakeLayoutVersion === CAVE_LAYOUT_VERSION
  ) return
  if (!layout?.mouth) return
  const w = Math.ceil((rightX - leftX) + CAVE_BAKE_PAD * 2)
  const h = Math.ceil(zone.depth + CAVE_BAKE_PAD * 2)
  pit._caveSpriteW = w
  pit._caveSpriteH = h
  const pal = buildCavePalette()
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.translate(-ox, -oy)
  const voidPts = caveMouthPts(layout.mouth, layout.interiorWallEdge)
  fillCanvasPoly(ctx, voidPts, pal.void)
  paintCaveDepthShading(ctx, voidPts, layout.mouth, pal)
  const groundY = layout.mouth.floorY
  //
  // Wall/contour rocks are drawn live on the foreground pass so bake void
  // edges do not clip them at the interior seam.
  //
  paintCanvasRocks(ctx, layout.backgroundRocks, pal, groundY)
  paintCanvasRocks(ctx, layout.pebbles, pal, groundY)
  //
  // Seam-cover rocks are also baked so post-L parallax earth repaints cannot
  // hide the vertical mouth line when the live foreground pass is occluded.
  //
  if (layout.wallRocks?.length) {
    const seamWallRocks = layout.wallRocks.filter(rock => rock.straddleMouthGround)
    paintCanvasRocks(ctx, seamWallRocks, pal, groundY)
  }
  if (layout.contourRocks?.length) {
    const seamContourRocks = layout.contourRocks.filter(rock => rock.straddleMouthGround)
    paintCanvasRocks(ctx, seamContourRocks, pal, groundY)
  }
  applyForestFilmGrainToCanvas(canvas, zone.x1)
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
  const topEdge = caveMouthGroundTopEdge(mouth, leftEdge)
  buildJaggedHorizontalEdge(topEdge.x1, topEdge.x2, mouth.floorY, seed)
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
  //
  // Read the actual baked canvas size (stored by bakeCaveInteriorSprite) —
  // recomputing it from zone.width/zone.depth here previously went stale the
  // moment the bake grew wider than the crack zone to cover the interior's
  // western extension, redrawing the sprite cropped back to the narrow zone
  // width even though the underlying texture was baked wider.
  //
  const fullH = pit._caveSpriteH ?? Math.ceil(zone.depth + CAVE_BAKE_PAD * 2)
  const fullW = pit._caveSpriteW ?? Math.ceil(zone.width + CAVE_BAKE_PAD * 2)
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
//
// roundOrigin snaps each rock centre to whole pixels, matching the live
// drawCaveLayoutRocks pass the foreground bakes replace.
//
function paintCanvasRocks(ctx, rocks, pal, floorY = null, roundOrigin = false) {
  if (!rocks?.length) return
  rocks.forEach((rock, idx) => {
    if (!rock.verts?.length) return
    if (floorY != null && !isCaveRockOnOrBelowGround(rock, floorY)) return
    const rx = roundOrigin ? Math.round(rock.x) : rock.x
    const ry = roundOrigin ? Math.round(rock.y) : rock.y
    const lit = idx % CAVE_ROCK_LIT_EVERY === 0
    fillCanvasPoly(ctx, rock.verts.map(v => ({ x: rx + v.x, y: ry + v.y })), lit ? pal.stone : pal.stoneShade)
    lit && fillCanvasPoly(ctx, caveRockCapPts(rock, rx, ry), pal.stoneLight)
  })
}
//
// Lit cap: the stone outline shrunk and nudged toward the upper left light.
//
function caveRockCapPts(rock, rx, ry) {
  const shift = rock.radius * CAVE_ROCK_CAP_SHIFT
  return rock.verts.map(v => ({
    x: rx - shift + v.x * CAVE_ROCK_CAP_SCALE,
    y: ry - shift + v.y * CAVE_ROCK_CAP_SCALE
  }))
}
//
// Inside the void silhouette only: a dark recess pooled toward the low back,
// and a faint band of daylit soil right under the mouth, so the cave reads
// as hollowed out of the earth instead of a flat cut-out.
//
function paintCaveDepthShading(ctx, voidPts, mouth, pal) {
  if (voidPts.length < 3) return
  const xs = voidPts.map(p => p.x)
  const x1 = Math.min(...xs)
  const x2 = Math.max(...xs)
  const top = mouth.floorY
  const h = mouth.bottomY - top
  const w = x2 - x1
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(voidPts[0].x, voidPts[0].y)
  for (let i = 1; i < voidPts.length; i++) ctx.lineTo(voidPts[i].x, voidPts[i].y)
  ctx.closePath()
  ctx.clip()
  const cx = x1 + w * CAVE_RECESS_CENTER_X_FRAC
  const cy = top + h * CAVE_RECESS_CENTER_Y_FRAC
  const recess = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * CAVE_RECESS_RADIUS_FRAC)
  recess.addColorStop(0, rgbaCss(pal.recess, CAVE_RECESS_ALPHA))
  recess.addColorStop(1, rgbaCss(pal.recess, 0))
  ctx.fillStyle = recess
  ctx.fillRect(x1, top - CAVE_BAKE_PAD, w, h + CAVE_BAKE_PAD * 2)
  const lip = ctx.createLinearGradient(0, top, 0, top + h * CAVE_LIP_BAND_FRAC)
  lip.addColorStop(0, rgbaCss(pal.lip, CAVE_LIP_ALPHA))
  lip.addColorStop(1, rgbaCss(pal.lip, 0))
  ctx.fillStyle = lip
  ctx.fillRect(x1, top - CAVE_BAKE_PAD, w, h * CAVE_LIP_BAND_FRAC + CAVE_BAKE_PAD)
  ctx.restore()
}
function rgbaCss(rgb, alpha) {
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`
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
function drawCaveLayoutRocks(k, rocks, pal, floorY = null) {
  if (!rocks?.length) return
  const fill = k.rgb(pal.stone.r, pal.stone.g, pal.stone.b)
  const shade = k.rgb(pal.stoneShade.r, pal.stoneShade.g, pal.stoneShade.b)
  rocks.forEach((rock, idx) => {
    if (!rock.verts?.length) return
    if (floorY != null && !isCaveRockOnOrBelowGround(rock, floorY)) return
    const rx = Math.round(rock.x)
    const ry = Math.round(rock.y)
    const pts = rock.verts.map(v => k.vec2(rx + v.x, ry + v.y))
    k.drawPolygon({ pts, color: idx % CAVE_ROCK_LIT_EVERY === 0 ? fill : shade })
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
  const topEdge = caveMouthGroundTopEdge(mouth, leftEdge)
  buildJaggedHorizontalEdge(topEdge.x1, topEdge.x2, mouth.floorY, seed)
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
// Palette derived from the current ground tone. Deliberately the SAME set in
// gray and colour-world modes — per the cave/pit art-direction rule (see
// CLAUDE.md section 16) a cave interior stays a near-black void with no gray
// seam at the lip regardless of overworld colour state. An earlier pass
// branched this on colorWorld (lightening the void to groundDark, the same
// tone the sunlit surface earth band uses) so the cave would visibly tint
// with the rest of the level, but that read as a two-tone seam against the
// plain gray underground decor band right beside the pit mouth (which stays
// gray by design — see drawForestEarthBand/renderCombinedGroundBand, unrelated
// to colour world). Kept mode-independent here instead.
//
function buildCavePalette() {
  const cave = FOREST_PAL.forestCave
  return {
    void: forestCaveEarthDeepRgb(),
    stone: forestRgb(cave.stone),
    stoneShade: forestRgb(cave.stoneShade),
    stoneLight: forestRgb(cave.stoneLight),
    recess: forestRgb(cave.recess),
    lip: forestRgb(cave.lip)
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
  const cutLeft = getForestPitEarthBandMouthCutout(zone).leftX
  const anchorClearLeft = getPitCaveAnchorX(zone) - CAVE_ANCHOR_CLEAR_HALF_W
  const interiorWallX = Math.min(
    anchorClearLeft - CAVE_INTERIOR_WALL_LEFT_OF_ANCHOR,
    cutLeft + 10
  )
  const interiorLeft = interiorWallX + 10
  //
  // Real X of the invisible left-wall collider (openPitPhysics) — the west
  // wall rock decoration must sit flush with it, never past it into the
  // decorative void floor that has no collider (reads as floating rocks).
  //
  const { innerX: floorColliderInnerX } = getForestPitFloorCollider(zone)
  const wallColliderLeftX = floorColliderInnerX - CAVE_LEFT_BLOCK_W * 0.35
  const floorTopRightX = zone.x2 - CAVE_MOUTH_INSET
  const floorTop = clampHorizProfile(
    buildJaggedFloorTop(interiorLeft, floorTopRightX, bottomY, seed),
    zone,
    floorY,
    bottomY
  )
  const pebbleCount = CAVE_FLOOR_PEBBLE_COUNT_MIN +
    Math.floor(caveSeed01(seed + 400) * CAVE_FLOOR_PEBBLE_COUNT_RANGE)
  for (let i = 0; i < pebbleCount; i++) {
    const px = interiorLeft + 4 + caveSeed01(seed + i * 3.1) * (mouth.right[0].x - interiorLeft - 8)
    const surfaceY = sampleProfileY(floorTop, px)
    const radius = CAVE_FLOOR_PEBBLE_R_MIN + caveSeed01(seed + i * 7.3) * CAVE_FLOOR_PEBBLE_R_RANGE
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
  // of the hero).
  //
  //
  // buildCaveMouthEdge's own wobble can locally push a point past
  // wallColliderLeftX (west of the real collider) even though the profile's
  // base X is clamped — clamp every point here so the void fill polygon
  // (caveMouthPts / drawCaveVoidFill, both built straight from this edge)
  // never bleeds dark past the collider into the uncollided gray ground,
  // matching the same boundary appendCaveWallRocks's minX already respects.
  //
  const interiorLeftEdge = buildCaveMouthEdge(wallColliderLeftX, floorY, bottomY, seed + 550, -1)
    .map(p => ({ x: Math.max(p.x, wallColliderLeftX), y: p.y }))
  appendCaveWallRocks(wallRocks, mouth.right, 1, seed + 900, floorY, bottomY)
  //
  // Same treatment on the interior's own west wall (outwardSign -1, bulging
  // toward the gray decor outside the cave) — this is the true vertical seam
  // between the dark void and the plain gray earth band west of the cave
  // (distinct from the mouth/ground-line seam the Interior*Seam* rocks below
  // cover, which sits further east at cutLeft). Without this the west edge
  // was a bare jagged fill line with nothing hiding the black/gray join.
  // Clamped to wallColliderLeftX so the column never bulges past the real
  // collider into the decorative, uncollided void floor to its left.
  //
  appendCaveWallRocks(wallRocks, interiorLeftEdge, -1, seed + 2400, floorY, bottomY, floorY, wallColliderLeftX)
  const backgroundRocks = buildCaveBackgroundRocks(mouth, floorY, bottomY, seed + 1200, interiorLeft)
  const contourRocks = buildCaveContourRocks(mouth, floorY, bottomY, seed + 1500, interiorWallX)
  appendCaveMouthCeilingLipRocks(contourRocks, zone, floorY, seed + 1520)
  //
  // Seam cover rocks share the same west-wall clamp so their cover column
  // (which otherwise floors at cutLeft, further west than the collider)
  // also stays flush with the platform's real left edge.
  //
  const seamCutLeft = Math.max(cutLeft, wallColliderLeftX)
  appendCaveInteriorSeamTopRocks(wallRocks, interiorLeftEdge, floorY, seamCutLeft, seed + 2188, zone)
  appendCaveInteriorSeamScatterRocks(wallRocks, interiorLeftEdge, floorY, bottomY, seamCutLeft, seed + 2244)
  appendCaveInteriorSeamEndCapRocks(wallRocks, interiorLeftEdge, floorY, bottomY, seamCutLeft, seed + 2291, zone)
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
  const count = CAVE_BG_ROCK_COUNT_MIN + Math.floor(caveSeed01(seed) * CAVE_BG_ROCK_COUNT_RANGE)
  for (let i = 0; i < count; i++) {
    const px = x1 + caveSeed01(seed + i * 2.9) * (x2 - x1)
    const py = floorY + 14 + caveSeed01(seed + i * 5.1) * (bottomY - floorY - 28)
    const radius = CAVE_BG_ROCK_R_MIN + caveSeed01(seed + i * 8.3) * CAVE_BG_ROCK_R_RANGE
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
function appendCaveInteriorSeamTopRocks(rocks, interiorLeftEdge, floorY, cutLeft, seed, zone) {
  const count = 3 + Math.floor(caveSeed01(seed) * 2)
  const fallbackX = interiorLeftEdge?.[0]?.x ?? cutLeft
  for (let i = 0; i < count; i++) {
    const radius = CAVE_SEAM_TOP_RADIUS_MIN +
      caveSeed01(seed + i * 3.1) * (CAVE_SEAM_TOP_RADIUS_MAX - CAVE_SEAM_TOP_RADIUS_MIN)
    const y = floorY + radius - 0.5
    const seamX = caveSeamCoverXAtY(interiorLeftEdge, y, cutLeft, fallbackX)
    const x = clampRockXToMouthShelf(
      seamX + (caveSeed01(seed + i * 5.7) - 0.5) * (CAVE_SEAM_COLUMN_X_SPREAD + 6),
      radius,
      zone
    )
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
function clampRockXToMouthShelf(x, radius, zone) {
  const span = getForestPitMouthGroundLineSpan(zone)
  const pad = radius * 0.55
  return Math.min(Math.max(x, span.leftX + pad), span.rightX - pad)
}
function appendCaveInteriorSeamEndCapRocks(rocks, interiorLeftEdge, floorY, bottomY, cutLeft, seed, zone) {
  const fallbackX = interiorLeftEdge?.[0]?.x ?? cutLeft
  const yBottom = bottomY - 12
  const topRadius = CAVE_SEAM_END_CAP_RADIUS_MIN +
    caveSeed01(seed) * (CAVE_SEAM_END_CAP_RADIUS_MAX - CAVE_SEAM_END_CAP_RADIUS_MIN)
  const topY = floorY + topRadius - 0.5
  const topSeamX = caveSeamCoverXAtY(interiorLeftEdge, topY, cutLeft, fallbackX)
  const topX = clampRockXToMouthShelf(
    topSeamX + (caveSeed01(seed + 1.1) - 0.5) * 8,
    topRadius,
    zone
  )
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
  const topExtraXRaw = topX + CAVE_SEAM_TOP_EXTRA_RIGHT_OFFSET + (caveSeed01(seed + 9.3) - 0.5) * 4
  const topExtraX = clampRockXToMouthShelf(topExtraXRaw, topExtraRadius, zone)
  rocks.push({
    x: topExtraX,
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
function caveMouthGroundTopEdge(mouth, leftEdge) {
  //
  // Always the full mouth width (west wall to east wall) — this feeds the
  // void polygon's own top boundary (caveMouthPts / drawCaveVoidFill), which
  // must jag across the whole opening. Narrowing it to the invisible walk
  // shelf's span (getForestPitMouthGroundLineSpan) left the polygon's top edge
  // as one long near-flat line outside that narrow shelf range, sitting a
  // few px below the real ground line and exposing the earth-band gap-fill
  // rect behind it as a lighter-gray rectangular strip at the cave mouth.
  //
  return { x1: leftEdge[0].x, x2: mouth.right[0].x }
}
function appendCaveMouthCeilingLipRocks(rocks, zone, floorY, seed) {
  const span = getForestPitMouthGroundLineSpan(zone)
  const lipSeed = span.leftX * 0.041 + floorY * 0.002
  const topEdge = buildJaggedHorizontalEdge(span.leftX, span.rightX, floorY, lipSeed)
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
function appendCaveWallRocks(wallRocks, edge, outwardSign, seed, floorY, bottomY, minGroundY = floorY, minX = null) {
  if (!edge?.length) return
  for (let layer = 0; layer < CAVE_WALL_ROCK_LAYERS; layer++) {
    const layerSeed = seed + layer * 137
    for (let i = 0; i < edge.length; i += CAVE_WALL_ROCK_STEP) {
      const p = edge[i]
      const radius = CAVE_WALL_ROCK_R_MIN + caveSeed01(layerSeed + i * 3.17) * CAVE_WALL_ROCK_R_RANGE
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
      //
      // minX (west wall only): never let a rock drift past the real
      // collider edge into the uncollided decorative void floor.
      //
      let x = p.x + outwardSign * depth
      minX != null && (x = Math.max(x, minX))
      wallRocks.push({
        x,
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
//
// World X of the pit cave layout anchor.
//
function getPitCaveAnchorX(zone) {
  const { innerX } = getForestPitFloorCollider(zone)
  return innerX + PIT_CAVE_ANCHOR_FLOOR_PAD
}
//
// Walkable mouth lip above the pit drop — short span ending at the anchor.
//
function getForestPitMouthWalkShelf(zone) {
  const anchorX = getPitCaveAnchorX(zone)
  const mouthCapX = zone.x1 + CAVE_MOUTH_INSET + 6
  const rightX = Math.min(anchorX + 4, mouthCapX)
  const w = PIT_MOUTH_WALK_SHELF_W
  const x = rightX - w
  return { x, w }
}
//
// Painted ground / baked cave mouth top edge — shorter on the left than the
// invisible walk shelf so the lip line does not overshoot the stand collider.
//
export function getForestPitMouthGroundLineSpan(zone) {
  const shelf = getForestPitMouthWalkShelf(zone)
  const rightX = shelf.x + shelf.w
  const minSpan = 6
  const leftX = Math.min(rightX - minSpan, shelf.x + CAVE_MOUTH_GROUND_LINE_TRIM_LEFT)
  return { leftX, rightX }
}
//
// Left edge of the invisible mouth walk shelf and sealed crack lid collider.
//
export function getForestCaveMouthWalkShelfLeftX(zone) {
  return getForestPitMouthWalkShelf(zone).x
}
//
// Main playfield floor draw and mouth earth-band cutout (collapsed) — trimmed
// ground line, not the full walk shelf span.
//
export function getForestCaveMouthFloorLeftX(zone) {
  return getForestPitMouthGroundLineSpan(zone).leftX
}
//
// Right edge of the painted mouth ground line (matches walk shelf right).
//
export function getForestCaveMouthFloorRightX(zone) {
  return getForestPitMouthGroundLineSpan(zone).rightX
}
//
// Walk shelf span at the cave mouth — matches the invisible lip collider.
//
export function getForestPitMouthWalkShelfSpan(zone) {
  const shelf = getForestPitMouthWalkShelf(zone)
  return { leftX: shelf.x, rightX: shelf.x + shelf.w }
}
//
// Earth-band / static-band cutout for the open pit (full interior width).
//
export function getForestPitEarthBandMouthCutoutForPit(pit) {
  if (!pit?.zone) return { leftX: 0, rightX: 0 }
  //
  // Full interior span — never the tight mouth shelf only, or the static earth
  // band bleeds gray stripes into the left cave volume after collapse.
  //
  return getForestPitEarthBandMouthCutout(pit.zone, false)
}
//
// Cave pit floor body — spans to the mouth's right wall for full walk room.
//
export function getForestPitFloorCollider(zone) {
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
export function getForestPitEarthBandMouthCutout(zone, tightMouth = false) {
  if (tightMouth) return getForestPitMouthGroundLineSpan(zone)
  const lipLeft = getForestCaveMouthFloorLeftX(zone)
  const { innerX } = getForestPitFloorCollider(zone)
  //
  // Matches wallColliderLeftX (buildCaveSceneLayout / pitLeftWall) exactly —
  // this cutout used to reach CAVE_LEFT_BLOCK_W * 2 further west than the
  // real wall collider, leaving a strip between the two boundaries that no
  // rock or void fill is ever allowed to cover (both are clamped to the
  // collider), so the flat earth-gap fill showed through there as a bare
  // untextured sliver next to the cave's west wall.
  //
  const leftX = Math.min(lipLeft, innerX - CAVE_LEFT_BLOCK_W * 0.35)
  const rightX = zone.x2 + CAVE_MOUTH_MAIN_FLOOR_INSET
  return { leftX, rightX }
}
/**
 * True when world X lies inside the open pit mouth cutout (no surface decor).
 * @param {Object|null} pit - Pit state
 * @param {number} x - World X
 * @returns {boolean}
 */
export function isForestOpenPitMouthWorldX(pit, x) {
  if (!pit?.collapsed || !pit.zone) return false
  const { leftX, rightX } = getForestPitEarthBandMouthCutoutForPit(pit)
  return x >= leftX && x <= rightX
}
/**
 * Hero body Y so feet rest on the cave pit floor collider top.
 * @param {Object} pit - Pit state
 * @returns {number} Kaplay character pos.y
 */
export function getForestPitHeroStandY(pit) {
  const bottomY = pit.floorY + pit.zone.depth
  const heroFeetOffset = 38
  const embed = 0
  return bottomY - heroFeetOffset + embed
}
/**
 * Floor X for the pit cave mushroom trampoline (right side of the cave).
 * @param {Object} pit - Pit state
 * @returns {number|null}
 */
export function getForestPitCaveTrampolineX(pit) {
  if (!pit?.zone) return null
  return pit.portalX ?? null
}
function openPitPhysics(pit) {
  const { k, zone, floorY } = pit
  const bottomY = floorY + zone.depth
  const { innerX, innerW } = getForestPitFloorCollider(zone)
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
  refreshForestPitMouthWalkShelf(pit)
}
//
// Recreates the short mouth lip collider (layout bumps or saves before v51).
//
function refreshForestPitMouthWalkShelf(pit) {
  if (!pit?.collapsed || !pit.k || !pit.zone) return
  const { k, zone, floorY } = pit
  pit.pitMouthWalkShelf?.destroy?.()
  pit.pitMouthWalkShelf = null
  const shelf = getForestPitMouthWalkShelf(zone)
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
function ensureForestPitMouthWalkShelf(pit) {
  if (!pit?.collapsed || !pit.pitFloor) return
  if (pit._mouthShelfLayoutVer === CAVE_LAYOUT_VERSION && pit.pitMouthWalkShelf) return
  refreshForestPitMouthWalkShelf(pit)
  pit._mouthShelfLayoutVer = CAVE_LAYOUT_VERSION
}
