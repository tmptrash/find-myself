import { CFG } from '../../../cfg.js'
import * as BonusHero from '../../touch/components/bonus-hero.js'
import { get, set } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import { toCanvas } from '../../../utils/helper.js'
import { drawCuteMushroomToCanvas, CUTE_MUSHROOM_ASPECT } from './cute-mushroom.js'
import { GLOW_PAL } from './glow-palette.js'
import * as GlowFootParticles from './glow-foot-particles.js'
//
// Midges + right-edge crack pit for the glow level
//
const HERO_BODY_W = 48
const HERO_BODY_H = 96
//
// Cave mouth ~3.4 hero-widths — wider entrance extending further left
//
const CRACK_ZONE_W = Math.round(HERO_BODY_W * 3.4)
const PIT_DEPTH = Math.round(HERO_BODY_H * 1.65)
const PIT_WALL_W = 20
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
const MIDGE_PIT_SPREAD_X = 36
const MIDGE_PIT_SPREAD_Y = 26
const PIT_TRAMP_FORCE = 920
const PIT_TRAMP_COOLDOWN = 0.55
const PIT_TRAMP_W = 36
const PIT_PARTICLE_COUNT = 28
//
// Five jump landings on the crack mouth also open the cave (stomp path)
//
const CRACK_STOMP_OPENS = 5
const CRACK_STOMP_FEET_MAX = 14
const CRACK_STOMP_PARTICLE_MULT = 2.8
const PIT_MUSH_SPRITE = 'glow0-pit-mush'
const CAVE_LAYOUT_VERSION = 5
const KEY_PIT_COLLAPSED = 'glow.pitCollapsed'
const KEY_PIT_BONUS = 'glow.pitBonusCollected'
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
  return x >= zone.x1 - 36 && x <= zone.x2 + 8
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
    showPit: false,
    showLeft: false,
    showRight: false,
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
  ctrl.showLeft = Boolean(zones.groundDecorLeft || zones.water)
  ctrl.showRight = Boolean(zones.groundDecorRight)
  ctrl.showPit = Boolean(zones.groundDecorRight)
  if (pitCollapsed && !ctrl.spreadAfterPit) {
    spreadMidgesAfterPit(ctrl)
  }
}
/**
 * @deprecated Use syncGlowMidgesZones
 */
export function setGlowMidgesVisible(ctrl, visible) {
  if (!ctrl) return
  ctrl.showPit = Boolean(visible)
  ctrl.showLeft = Boolean(visible)
  ctrl.showRight = Boolean(visible)
}
/**
 * Advances midge wander inside each role's bounds.
 * @param {Object} ctrl - Midges controller
 * @param {number} dt - Delta time
 */
export function updateGlowMidges(ctrl, dt) {
  if (!ctrl?.midges) return
  const t = performance.now() * 0.001
  for (const m of ctrl.midges) {
    if (!midgeRoleVisible(ctrl, m.role)) continue
    const bounds = boundsForRole(ctrl, m.role)
    m.driftVx += Math.sin(t * 2.1 + m.phase) * 18 * dt
    m.driftVy += Math.cos(t * 2.7 + m.phase * 1.3) * 14 * dt
    m.driftVx *= 0.98
    m.driftVy *= 0.98
    const sp = m.speed * dt
    m.x += m.driftVx * dt + Math.sin(t * 3.2 + m.phase) * sp
    m.y += m.driftVy * dt + Math.cos(t * 2.4 + m.phase) * sp * 0.7
    if (m.x < bounds.minX) { m.x = bounds.minX; m.driftVx = Math.abs(m.driftVx) }
    if (m.x > bounds.maxX) { m.x = bounds.maxX; m.driftVx = -Math.abs(m.driftVx) }
    if (m.y < bounds.minY) { m.y = bounds.minY; m.driftVy = Math.abs(m.driftVy) }
    if (m.y > bounds.maxY) { m.y = bounds.maxY; m.driftVy = -Math.abs(m.driftVy) }
  }
}
/**
 * Sets up the crack floor lid + optional already-collapsed pit.
 * @param {Object} cfg - Setup config
 * @returns {Object} Pit state
 */
export function createGlowPit(cfg) {
  const {
    k, floorY, screenW, heroInst, sound, levelIndicator,
    heroBodyColor, groundColor, alreadyCollapsed, cracksVisible = false
  } = cfg
  const zone = getCrackZone(screenW, floorY)
  bakePitMushroomSprite(k)
  const crackFloor = k.add([
    k.rect(zone.width, 20),
    k.pos(zone.x1, floorY),
    k.anchor('topleft'),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName
  ])
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
    collapsed: Boolean(alreadyCollapsed || get(KEY_PIT_COLLAPSED, false)),
    particles: [],
    trampState: { cooldown: 0, squash: 0, x: zone.x1 + zone.width * 0.55 },
    pitFloor: null,
    pitWalls: [],
    pitBonus: null,
    collapseArmed: false,
    wasOnBonusPlat: false,
    leftBonusAirborne: false,
    crackStompCount: 0,
    wallProfile: null
  }
  if (pit.collapsed) {
    crackFloor.destroy?.()
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
  const { zone } = pit
  const heroX = char.pos.x
  const overCrack = heroX >= zone.x1 && heroX <= zone.x2
  //
  // Arm only after jumping/falling off the upper-right fragment log — standing
  // on it must not open the cave; the player must land on the crack entrance.
  //
  let onBonus = false
  if (bonusPlatHome) {
    const bw = bonusPlatHome.w || 90
    onBonus = grounded &&
      heroX >= bonusPlatHome.x - 16 &&
      heroX <= bonusPlatHome.x + bw + 16 &&
      char.pos.y < bonusPlatHome.y + 90
  }
  if (onBonus && grounded) {
    pit.wasOnBonusPlat = true
    pit.leftBonusAirborne = false
  }
  if (pit.wasOnBonusPlat && !grounded) {
    pit.leftBonusAirborne = true
    pit.collapseArmed = true
  }
  if (pit.collapseArmed && overCrack && justLanded) {
    collapsePit(pit)
    pit.collapseArmed = false
    pit.wasOnBonusPlat = false
    pit.leftBonusAirborne = false
    pit.crackStompCount = 0
  } else if (justLanded && !overCrack) {
    pit.collapseArmed = false
    pit.leftBonusAirborne = false
  }
  //
  // Stomp path: five normal jump landings on the crack entrance also collapse it
  //
  const jumpLanding = Boolean(opts.jumpLanding)
  const footY = opts.footY
  const footParticles = opts.footParticles
  if (jumpLanding && overCrack && grounded && footY != null &&
    footY >= pit.floorY - CRACK_STOMP_FEET_MAX && footY <= pit.floorY + 8) {
    pit.crackStompCount = (pit.crackStompCount || 0) + 1
    footParticles && GlowFootParticles.spawnLanding(
      footParticles,
      char.pos.x,
      footY,
      pit.groundColor,
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
  if (!char?.pos || char.pos.y < pit.floorY - 4) return
  const minX = pit.zone.x1 + PIT_WALL_W + 6
  const maxX = pit.zone.x2 - PIT_WALL_W - 6
  if (char.pos.x < minX) char.pos.x = minX
  if (char.pos.x > maxX) char.pos.x = maxX
}
/**
 * Draws surface cracks or the open cave pit.
 * @param {Object} k - Kaplay instance
 * @param {Object} pit - Pit state
 * @param {Object} groundC - Ground fill {r,g,b}
 */
export function drawGlowPit(k, pit, groundC) {
  if (!pit) return
  if (!pit.collapsed) {
    pit.cracksVisible && drawSurfaceCracks(k, pit, groundC)
    return
  }
  drawCavePit(k, pit, groundC)
  drawPitTrampoline(k, pit)
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
  if (k.getSprite?.(PIT_MUSH_SPRITE)) return
  const mushW = PIT_TRAMP_W
  const totalW = mushW + 4
  const totalH = Math.ceil(mushW * CUTE_MUSHROOM_ASPECT) + 4
  const canvas = toCanvas({ width: totalW, height: totalH, pixelRatio: 1 }, (ctx) => {
    drawCuteMushroomToCanvas(ctx, {
      cx: totalW / 2,
      baseY: totalH - 2,
      width: mushW,
      colors: GLOW_PAL.cuteMushroomGray,
      withFace: false
    })
  })
  k.loadSprite(PIT_MUSH_SPRITE, canvas)
  canvas.width = 0
  canvas.height = 0
}
function drawGlowMidges(k, ctrl) {
  const t = k.time()
  for (const m of ctrl.midges) {
    if (!midgeRoleVisible(ctrl, m.role)) continue
    const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 7 + m.phase))
    k.drawCircle({
      pos: k.vec2(m.x, m.y),
      radius: m.radius,
      color: k.rgb(28, 26, 22),
      opacity: 0.35 + pulse * 0.45
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
function drawSurfaceCracks(k, pit, groundC) {
  const deep = k.rgb(
    Math.max(0, groundC.r - 45),
    Math.max(0, groundC.g - 45),
    Math.max(0, groundC.b - 42)
  )
  for (const s of pit.crackSegs) {
    k.drawLine({
      p1: k.vec2(s.x1, s.y1),
      p2: k.vec2(s.x2, s.y2),
      width: Math.max(0.85, s.w),
      color: deep,
      opacity: 0.72
    })
  }
}
function drawCavePit(k, pit, groundC) {
  const { zone, floorY } = pit
  const pal = buildCavePalette(groundC)
  if (!pit.wallProfile || pit.wallProfile.version !== CAVE_LAYOUT_VERSION) {
    pit.wallProfile = buildCaveSceneLayout(zone, floorY)
  }
  const layout = pit.wallProfile
  //
  // Three concentric jagged oval rings — light outside, dark center void
  //
  drawCaveDepthLayers(k, layout.depthLayers, pal, layout.mouth)
  drawJaggedPebbleBed(k, layout.floorTop, layout.bottomY, pal)
  for (const p of layout.pebbles) {
    k.drawCircle({
      pos: k.vec2(p.x, p.y),
      radius: p.r,
      color: k.rgb(pal.pebble.r, pal.pebble.g, pal.pebble.b),
      opacity: 0.88
    })
  }
  drawJaggedFloorBand(k, layout.floorTop, layout.bottomY, pal)
}
//
// Palette derived from the current ground tone (gray or colour world)
//
function buildCavePalette(groundC) {
  const g = groundC
  return {
    void: caveClampRgb(g.r * 0.12, g.g * 0.12, g.b * 0.11),
    depthOuter: caveClampRgb(g.r * 0.68, g.g * 0.64, g.b * 0.58),
    depthMid: caveClampRgb(g.r * 0.48, g.g * 0.45, g.b * 0.42),
    depthInner: caveClampRgb(g.r * 0.3, g.g * 0.28, g.b * 0.26),
    floor: caveClampRgb(Math.min(255, g.r + 32), Math.min(255, g.g + 28), Math.min(255, g.b + 20)),
    pebble: caveClampRgb(g.r * 0.56, g.g * 0.53, g.b * 0.5)
  }
}
function caveClampRgb(r, g, b) {
  return {
    r: Math.max(0, Math.min(255, Math.round(r))),
    g: Math.max(0, Math.min(255, Math.round(g))),
    b: Math.max(0, Math.min(255, Math.round(b)))
  }
}
//
// Builds jagged oval rings and floor pebbles for the open cave mouth
//
function buildCaveSceneLayout(zone, floorY) {
  const bottomY = floorY + zone.depth
  const seed = zone.x1 * 0.017 + floorY * 0.003
  const pebbles = []
  const mouth = buildCaveMouth(zone, floorY, bottomY, seed)
  const floorTop = clampHorizProfile(
    buildJaggedFloorTop(mouth.left[0].x, mouth.right[0].x, bottomY, seed),
    zone,
    floorY,
    bottomY
  )
  const depthLayers = buildDepthArchLayers(zone, floorY, bottomY, seed, mouth)
  const pebbleCount = 26 + Math.floor(caveSeed01(seed + 400) * 10)
  for (let i = 0; i < pebbleCount; i++) {
    const px = mouth.left[0].x + 4 + caveSeed01(seed + i * 3.1) * (mouth.right[0].x - mouth.left[0].x - 8)
    const surfaceY = sampleProfileY(floorTop, px)
    pebbles.push({
      x: px,
      y: surfaceY + 3 + caveSeed01(seed + i * 5.7) * 12,
      r: 1.8 + caveSeed01(seed + i * 7.3) * 3.5
    })
  }
  return { version: CAVE_LAYOUT_VERSION, pebbles, floorTop, depthLayers, mouth, bottomY }
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
const CAVE_MOUTH_EDGE_STEPS = 42
const CAVE_MOUTH_INSET = 4
const CAVE_MOUTH_WALK = 10
const CAVE_MOUTH_WOBBLE_SLOW = 17
const CAVE_MOUTH_WOBBLE_MID = 11
const CAVE_MOUTH_WOBBLE_FINE = 6
const CAVE_MOUTH_NOTCH = 13
//
// Three nested depth ovals — equal pixel ring width between each boundary
//
const DEPTH_LAYER_COUNT = 3
const DEPTH_RING_DIVISIONS = 4
const DEPTH_OVAL_STEPS = 72
const DEPTH_OVAL_JAG_WALK = 0.1
const DEPTH_OVAL_JAG_SLOW = 0.17
const DEPTH_OVAL_JAG_MID = 0.11
const DEPTH_OVAL_JAG_FINE = 0.06
const DEPTH_OVAL_BAY_CHANCE = 0.76
const DEPTH_OVAL_BAY_AMP = 0.22
const DEPTH_OVAL_SCALE_MIN = 0.74
const DEPTH_OVAL_SCALE_MAX = 1.16
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
    walk += (caveSeed01(seed + i * 4.1) - 0.5) * CAVE_MOUTH_WALK
    walk *= 0.9
    const bay = caveSeed01(seed + i * 8.6) > 0.78
      ? (caveSeed01(seed + i * 12.4) - 0.5) * CAVE_MOUTH_NOTCH * 2.2
      : 0
    const wobble =
      walk +
      Math.sin(t * Math.PI * 3.5 + seed * 0.75) * CAVE_MOUTH_WOBBLE_SLOW +
      Math.sin(t * Math.PI * 10.5 + seed * 1.4) * CAVE_MOUTH_WOBBLE_MID +
      Math.sin(t * 38 + seed * 2.15) * CAVE_MOUTH_WOBBLE_FINE +
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
// Three nested jagged ovals — portal rings receding into the cave
//
function buildDepthArchLayers(zone, floorY, bottomY, seed, mouth) {
  const leftX = mouth.left[0].x
  const rightX = mouth.right[0].x
  const cx = (leftX + rightX) / 2
  const tunnelTop = floorY + 8
  const tunnelBottom = bottomY - FLOOR_BAND_H - 8
  const cy = (tunnelTop + tunnelBottom) / 2
  const maxRx = (rightX - leftX) * 0.5 - 6
  const maxRy = (tunnelBottom - tunnelTop) * 0.5
  const ringRx = maxRx / DEPTH_RING_DIVISIONS
  const ringRy = maxRy / DEPTH_RING_DIVISIONS
  const layers = []
  for (let i = 0; i < DEPTH_LAYER_COUNT; i++) {
    const rx = maxRx - ringRx * (i + 1)
    const ry = maxRy - ringRy * (i + 1)
    const oval = buildJaggedOvalProfile(cx, cy, rx, ry, seed + 800 + i * 137)
    layers.push(clipOvalToMouth(clipPolygonBelowHoriz(oval, floorY), mouth))
  }
  return layers
}
//
// Shoreline-style ragged oval — not a smooth geometric ellipse
//
function buildJaggedOvalProfile(cx, cy, rx, ry, seed) {
  const steps = DEPTH_OVAL_STEPS
  const pts = []
  let radWalk = 0
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const ang = t * Math.PI * 2
    radWalk += (caveSeed01(seed + i * 5.1) - 0.5) * DEPTH_OVAL_JAG_WALK
    radWalk *= 0.88
    const bay = caveSeed01(seed + i * 9.7) > DEPTH_OVAL_BAY_CHANCE
      ? (caveSeed01(seed + i * 13.3) - 0.5) * DEPTH_OVAL_BAY_AMP * 2
      : 0
    const rawScale =
      1 +
      radWalk +
      Math.sin(ang * 4.2 + seed * 0.65) * DEPTH_OVAL_JAG_SLOW +
      Math.sin(ang * 9.5 + seed * 1.35) * DEPTH_OVAL_JAG_MID +
      Math.sin(ang * 21 + seed * 2.05) * DEPTH_OVAL_JAG_FINE +
      Math.sin(ang * 43 + seed * 0.45) * (DEPTH_OVAL_JAG_FINE * 0.65) +
      (caveSeed01(seed + i * 3.3) - 0.5) * (DEPTH_OVAL_JAG_MID * 0.9) +
      bay
    const scale = Math.max(DEPTH_OVAL_SCALE_MIN, Math.min(DEPTH_OVAL_SCALE_MAX, rawScale))
    pts.push({
      x: cx + Math.cos(ang) * rx * scale,
      y: cy + Math.sin(ang) * ry * scale
    })
  }
  return pts
}
function drawCaveDepthLayers(k, layers, pal, mouth) {
  if (!layers?.length || !mouth) return
  const groundY = mouth.floorY
  //
  // Outermost ring — flat ground lip, nothing above floorY
  //
  const mouthClip = clipPolygonBelowHoriz(buildMouthPolygon(mouth), groundY)
  mouthClip.length >= 3 && k.drawPolygon({
    pts: mouthClip.map(p => k.vec2(p.x, p.y)),
    color: k.rgb(pal.depthOuter.r, pal.depthOuter.g, pal.depthOuter.b)
  })
  const fills = [pal.depthMid, pal.depthInner, pal.void]
  for (let i = 0; i < layers.length; i++) {
    const layer = clipPolygonBelowHoriz(layers[i], groundY)
    if (layer.length < 3) continue
    const c = fills[i] || pal.void
    k.drawPolygon({
      pts: layer.map(p => k.vec2(p.x, p.y)),
      color: k.rgb(c.r, c.g, c.b)
    })
  }
}
//
// Closed polygon for the jagged cave mouth opening (top edge at ground level)
//
function buildMouthPolygon(mouth) {
  const pts = []
  pts.push({ x: mouth.left[0].x, y: mouth.floorY })
  pts.push({ x: mouth.right[0].x, y: mouth.floorY })
  for (let i = 1; i < mouth.right.length; i++) pts.push(mouth.right[i])
  pts.push({
    x: mouth.right[mouth.right.length - 1].x,
    y: mouth.bottomY
  })
  pts.push({
    x: mouth.left[mouth.left.length - 1].x,
    y: mouth.bottomY
  })
  for (let i = mouth.left.length - 1; i >= 1; i--) pts.push(mouth.left[i])
  return pts
}
//
// Keeps oval points inside the wavy left/right mouth walls
//
function clipOvalToMouth(oval, mouth) {
  return oval.map(p => {
    const leftX = sampleEdgeXAtY(mouth.left, p.y)
    const rightX = sampleEdgeXAtY(mouth.right, p.y)
    return {
      x: Math.max(leftX, Math.min(rightX, p.x)),
      y: Math.max(mouth.floorY, Math.min(mouth.bottomY, p.y))
    }
  })
}
//
// Horizontal ground cut — removes everything above floorY
//
function clipPolygonBelowHoriz(polygon, minY) {
  if (!polygon?.length) return []
  const out = []
  const n = polygon.length
  for (let i = 0; i < n; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % n]
    const aIn = a.y >= minY
    const bIn = b.y >= minY
    aIn && out.push(a)
    if (aIn !== bIn) {
      const t = (minY - a.y) / (b.y - a.y)
      out.push({
        x: a.x + (b.x - a.x) * t,
        y: minY
      })
    }
  }
  return out
}
//
// Samples X on a vertical {x,y} edge profile
//
function sampleEdgeXAtY(edge, y) {
  if (!edge?.length) return 0
  if (y <= edge[0].y) return edge[0].x
  const last = edge[edge.length - 1]
  if (y >= last.y) return last.x
  for (let i = 0; i < edge.length - 1; i++) {
    const a = edge[i]
    const b = edge[i + 1]
    if (y >= a.y && y <= b.y) {
      const t = (y - a.y) / (b.y - a.y)
      return a.x + (b.x - a.x) * t
    }
  }
  return last.x
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
function drawJaggedFloorBand(k, floorTop, bottomY, pal) {
  if (!floorTop?.length) return
  const pts = []
  for (const p of floorTop) pts.push(k.vec2(p.x, p.y))
  pts.push(k.vec2(floorTop[floorTop.length - 1].x, bottomY))
  pts.push(k.vec2(floorTop[0].x, bottomY))
  k.drawPolygon({
    pts,
    color: k.rgb(pal.floor.r, pal.floor.g, pal.floor.b)
  })
}
function drawJaggedPebbleBed(k, floorTop, bottomY, pal) {
  if (!floorTop?.length) return
  const bedTop = floorTop.map(p => ({
    x: p.x,
    y: p.y + 2 + caveSeed01(p.x * 0.07) * 3
  }))
  const pts = []
  for (const p of bedTop) pts.push(k.vec2(p.x, p.y))
  pts.push(k.vec2(bedTop[bedTop.length - 1].x, bottomY))
  pts.push(k.vec2(bedTop[0].x, bottomY))
  k.drawPolygon({
    pts,
    color: k.rgb(pal.pebble.r, pal.pebble.g, pal.pebble.b),
    opacity: 0.55
  })
}
function caveSeed01(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
function drawPitTrampoline(k, pit) {
  const x = pit.trampState.x
  const y = pit.floorY + pit.zone.depth - 2
  const squash = pit.trampState.squash
  const scaleY = 1 - squash * 0.35
  const mushW = PIT_TRAMP_W
  const mushH = mushW * CUTE_MUSHROOM_ASPECT
  k.drawSprite({
    sprite: PIT_MUSH_SPRITE,
    pos: k.vec2(x, y),
    anchor: 'bot',
    scale: k.vec2(1, scaleY),
    width: mushW + 4,
    height: mushH + 4
  })
}
function collapsePit(pit) {
  if (pit.collapsed) return
  pit.collapsed = true
  set(KEY_PIT_COLLAPSED, true)
  pit.crackFloor?.destroy?.()
  pit.crackFloor = null
  openPitPhysics(pit)
  spawnPitBurst(pit)
}
function openPitPhysics(pit) {
  const { k, zone, floorY } = pit
  const bottomY = floorY + zone.depth
  const innerX = zone.x1 + PIT_WALL_W
  const innerW = Math.max(24, zone.width - PIT_WALL_W * 2)
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
  if (!get(KEY_PIT_BONUS, false) && pit.heroInst) {
    //
    // Fragment sits left in the widened cave — not under the fall line
    //
    const bonusX = innerX + innerW * 0.14
    pit.pitBonus = BonusHero.create({
      k,
      x: bonusX,
      y: bottomY - 8,
      width: 40,
      heroInst: pit.heroInst,
      levelIndicator: pit.levelIndicator,
      sfx: pit.sound,
      approachFromAbove: false,
      heroBodyColor: pit.heroBodyColor,
      storageKey: KEY_PIT_BONUS,
      platformCollisionYOffset: 6,
      //
      // No log / no solid platform body — only the small bonus fragment
      //
      disablePlatformBody: true,
      customPlatformDraw: () => {},
      collectHintText: 'Another fragment.\nThe ground keeps secrets.',
      collectHintDuration: 5
    })
    if (pit.pitBonus?.miniHero?.character) {
      pit.pitBonus.revealed = true
      pit.pitBonus.platformOpacity = 0
      pit.pitBonus.miniHero.character.opacity = 0.55
      pit.pitBonus.miniHero.character.pos.x = bonusX
      pit.pitBonus.miniHero.character.pos.y = bottomY - 18
    }
  }
}
function updatePitTrampoline(pit, char) {
  if (pit.trampState.cooldown > 0) return
  const x = pit.trampState.x
  const mushH = PIT_TRAMP_W * CUTE_MUSHROOM_ASPECT
  const capTop = pit.floorY + pit.zone.depth - mushH
  const feet = char.pos.y + 38
  const onCap = Math.abs(char.pos.x - x) < PIT_TRAMP_W * 0.55 &&
    feet >= capTop - 10 && feet <= capTop + 16
  if (onCap && (char.vel?.y ?? 0) >= -40) {
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
  const c = groundColor || { r: 60, g: 50, b: 40 }
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
      r: c.r + Math.floor((Math.random() - 0.5) * 30),
      g: c.g + Math.floor((Math.random() - 0.5) * 25),
      b: c.b + Math.floor((Math.random() - 0.5) * 20)
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

export { KEY_PIT_COLLAPSED, KEY_PIT_BONUS, CRACK_ZONE_W, PIT_DEPTH }
