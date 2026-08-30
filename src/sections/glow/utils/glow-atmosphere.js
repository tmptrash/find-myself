import { CFG } from '../../../cfg.js'
import * as BonusHero from '../../touch/components/bonus-hero.js'
import { get, set } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import { toCanvas } from '../../../utils/helper.js'
import { drawCuteMushroomToCanvas, CUTE_MUSHROOM_ASPECT, TRAMP_FACE_EYE_SCALE } from './cute-mushroom.js'
import { GLOW_PAL, glowRgb, snapToPalette, getCuteMushroomFlatDecorColors } from './glow-palette.js'
import { buildRockVertices } from '../../../utils/draw-rock.js'
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
// Extra width on the cave floor collider so the hero cannot fall past the sides.
//
const PIT_FLOOR_EXTRA_W = 56
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
const CAVE_LAYOUT_VERSION = 10
const CAVE_WALL_ROCK_STEP = 3
const CAVE_WALL_ROCK_LAYERS = 3
const CAVE_INTERIOR_SPRITE = 'glow0-cave-interior'
const CAVE_BAKE_PAD = 40
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
  const showLeft = Boolean(zones.groundDecorLeft || zones.water)
  const rightOpen = zones.groundRightStripMax >= 0 || Boolean(zones.groundDecorRight)
  const showRight = rightOpen
  const showPit = Boolean(zones.groundDecorRight)
  const spread = Boolean(pitCollapsed && !ctrl.spreadAfterPit)
  if (!spread && ctrl.showLeft === showLeft && ctrl.showRight === showRight &&
    ctrl.showPit === showPit) return
  ctrl.showLeft = showLeft
  ctrl.showRight = showRight
  ctrl.showPit = showPit
  spread && spreadMidgesAfterPit(ctrl)
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
 * Sets up the crack floor lid + optional already-collapsed pit.
 * @param {Object} cfg - Setup config
 * @param {Object} [cfg.tooltipClampInset] - Playfield inset for pit collect hints
 * @returns {Object} Pit state
 */
export function createGlowPit(cfg) {
  const {
    k, floorY, screenW, heroInst, sound, levelIndicator,
    heroBodyColor, groundColor, alreadyCollapsed, cracksVisible = false,
    tooltipClampInset = null
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
    pitCaveIdleTime: 0,
    pitCaveHintShown: false,
    pitCaveHintTooltip: null,
    tooltipClampInset,
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
  const onCrackFloor = footY != null &&
    footY >= pit.floorY - CRACK_STOMP_FEET_MAX &&
    footY <= pit.floorY + 8
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
  if (jumpLanding && overCrack && grounded && footY != null &&
    footY >= pit.floorY - CRACK_STOMP_FEET_MAX && footY <= pit.floorY + 8) {
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
  if (!char?.pos || char.pos.y < pit.floorY - 4) return
  const minX = pit.zone.x1 + PIT_WALL_W - PIT_FLOOR_EXTRA_W / 2 + 6
  const maxX = pit.zone.x2 - PIT_WALL_W + PIT_FLOOR_EXTRA_W / 2 - 6
  if (char.pos.x < minX) char.pos.x = minX
  if (char.pos.x > maxX) char.pos.x = maxX
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
    pit.cracksVisible && drawSurfaceCracks(k, pit, groundC, flatDecor)
    return
  }
  drawCaveInteriorRockStyle(k, pit)
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
  if (!k.getSprite?.(PIT_MUSH_SPRITE)) {
    bakeOnePitMushroomSprite(k, PIT_MUSH_SPRITE, getPitMushroomBakeColors())
  }
  if (!k.getSprite?.(PIT_MUSH_OUTLINE_SPRITE)) {
    bakeOnePitMushroomSprite(k, PIT_MUSH_OUTLINE_SPRITE, GLOW_PAL.cuteMushroom)
  }
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
      eyeScale: TRAMP_FACE_EYE_SCALE
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
function drawCaveInteriorRockStyle(k, pit) {
  const { zone, floorY } = pit
  if (!pit.wallProfile || pit.wallProfile.version !== CAVE_LAYOUT_VERSION) {
    pit.wallProfile = buildCaveSceneLayout(zone, floorY)
    pit._caveSpriteReady = false
  }
  bakeCaveInteriorSprite(k, pit)
  if (pit._caveSpriteReady) {
    k.drawSprite({
      sprite: CAVE_INTERIOR_SPRITE,
      pos: k.vec2(pit._caveSpriteX, pit._caveSpriteY)
    })
    return
  }
  const layout = pit.wallProfile
  const mouth = layout.mouth
  const grassGray = glowRgb('decorGray')
  const pal = buildCavePaletteFlat(grassGray)
  drawCaveVoidFill(k, mouth, pal)
  drawCaveLayoutRocks(k, layout.wallRocks, pal)
  drawCaveLayoutRocks(k, layout.pebbles, pal)
}
//
// Bakes the static cave interior once — wall rocks are dozens of polygons
// per frame otherwise, and the palette is a fixed decor gray.
//
function bakeCaveInteriorSprite(k, pit) {
  const zone = pit.zone
  const ox = zone.x1 - CAVE_BAKE_PAD
  const oy = pit.floorY - 8
  pit._caveSpriteX = ox
  pit._caveSpriteY = oy
  if (pit._caveSpriteReady) return
  if (k.getSprite?.(CAVE_INTERIOR_SPRITE)) {
    pit._caveSpriteReady = true
    return
  }
  const layout = pit.wallProfile
  if (!layout?.mouth) return
  const w = Math.ceil(zone.width + CAVE_BAKE_PAD * 2)
  const h = Math.ceil(zone.depth + CAVE_BAKE_PAD * 2)
  const pal = buildCavePaletteFlat(glowRgb('decorGray'))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.translate(-ox, -oy)
  fillCanvasPoly(ctx, caveMouthPts(layout.mouth), pal.void)
  paintCanvasRocks(ctx, layout.wallRocks, pal)
  paintCanvasRocks(ctx, layout.pebbles, pal)
  k.loadSprite(CAVE_INTERIOR_SPRITE, canvas)
  canvas.width = 0
  canvas.height = 0
  pit._caveSpriteReady = true
}
function caveMouthPts(mouth) {
  if (!mouth?.left?.length || !mouth?.right?.length) return []
  const pts = []
  pts.push({ x: mouth.left[0].x, y: mouth.floorY })
  pts.push({ x: mouth.right[0].x, y: mouth.floorY })
  for (let i = 1; i < mouth.right.length; i++) {
    pts.push({ x: mouth.right[i].x, y: mouth.right[i].y })
  }
  pts.push({ x: mouth.right[mouth.right.length - 1].x, y: mouth.bottomY })
  pts.push({ x: mouth.left[mouth.left.length - 1].x, y: mouth.bottomY })
  for (let i = mouth.left.length - 1; i >= 1; i--) {
    pts.push({ x: mouth.left[i].x, y: mouth.left[i].y })
  }
  return pts
}
function paintCanvasRocks(ctx, rocks, pal) {
  if (!rocks?.length) return
  const tone = caveRockPalette(pal.void)
  const fill = { r: tone.fillR, g: tone.fillG, b: tone.fillB }
  const shade = { r: tone.darkR, g: tone.darkG, b: tone.darkB }
  rocks.forEach((rock, idx) => {
    if (!rock.verts?.length) return
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
function caveRockPalette(groundC) {
  const fill = snapToPalette(groundC)
  const shade = glowRgb('void')
  return {
    fillR: fill.r, fillG: fill.g, fillB: fill.b,
    lightR: fill.r, lightG: fill.g, lightB: fill.b,
    darkR: shade.r, darkG: shade.g, darkB: shade.b
  }
}
function buildCavePaletteFlat(groundC) {
  const g = snapToPalette(groundC)
  return {
    void: g,
    depthOuter: g,
    depthMid: g,
    depthInner: g,
    floor: g,
    pebble: g,
    rim: g,
    rimEdge: g
  }
}
function drawCaveLayoutRocks(k, rocks, pal) {
  if (!rocks?.length) return
  const tone = caveRockPalette(pal.void)
  const fill = k.rgb(tone.fillR, tone.fillG, tone.fillB)
  const shade = k.rgb(tone.darkR, tone.darkG, tone.darkB)
  rocks.forEach((rock, idx) => {
    if (!rock.verts?.length) return
    const pts = rock.verts.map(v => k.vec2(rock.x + v.x, rock.y + v.y))
    k.drawPolygon({ pts, color: idx % 2 === 0 ? fill : shade })
  })
}
function drawCavePit(k, pit, groundC) {
  const { zone, floorY } = pit
  const pal = buildCavePalette(groundC)
  if (!pit.wallProfile || pit.wallProfile.version !== CAVE_LAYOUT_VERSION) {
    pit.wallProfile = buildCaveSceneLayout(zone, floorY)
  }
  const layout = pit.wallProfile
  drawCaveVoidFill(k, layout.mouth, pal)
  drawRaggedCaveWall(k, layout.mouth.left, pal, -1)
  drawRaggedCaveWall(k, layout.mouth.right, pal, 1)
  drawCaveWallRim(k, layout.mouth.left, pal)
  drawCaveWallRim(k, layout.mouth.right, pal)
  drawCaveFloorPebbles(k, layout, pal)
}
//
// Scattered pebbles along the cave floor profile.
//
function drawCaveFloorPebbles(k, layout, pal) {
  const pebbleC = k.rgb(pal.pebble.r, pal.pebble.g, pal.pebble.b)
  layout.pebbles?.forEach(p => {
    k.drawCircle({
      pos: k.vec2(p.x, p.y),
      radius: p.r,
      color: pebbleC
    })
  })
}
//
// Solid dark void for the cave interior — single fill, no layered portals.
//
function drawCaveVoidFill(k, mouth, pal) {
  if (!mouth?.left?.length || !mouth?.right?.length) return
  const pts = []
  pts.push(k.vec2(mouth.left[0].x, mouth.floorY))
  pts.push(k.vec2(mouth.right[0].x, mouth.floorY))
  for (let i = 1; i < mouth.right.length; i++) {
    pts.push(k.vec2(mouth.right[i].x, mouth.right[i].y))
  }
  pts.push(k.vec2(mouth.right[mouth.right.length - 1].x, mouth.bottomY))
  pts.push(k.vec2(mouth.left[mouth.left.length - 1].x, mouth.bottomY))
  for (let i = mouth.left.length - 1; i >= 1; i--) {
    pts.push(k.vec2(mouth.left[i].x, mouth.left[i].y))
  }
  pts.length >= 3 && k.drawPolygon({
    pts,
    color: k.rgb(pal.void.r, pal.void.g, pal.void.b)
  })
}
//
// Soft daylight glow bleeding through the cave mouth — a few overlapping,
// low-opacity circles centred on the opening so the entrance reads as lit
// rock fading to black, not a flat cut-out.
//
const CAVE_GLOW_RADII = [76, 50, 26]
function drawCaveAmbientGlow(k, mouth, pal) {
  if (!mouth?.left?.length || !mouth?.right?.length) return
  const cx = (mouth.left[0].x + mouth.right[0].x) * 0.5
  const topY = mouth.floorY + 4
  const glow = k.rgb(pal.rim.r, pal.rim.g, pal.rim.b)
  CAVE_GLOW_RADII.forEach((r, i) => {
    k.drawCircle({
      pos: k.vec2(cx, topY + r * 0.35),
      radius: r,
      color: glow,
      opacity: 0.1 + i * 0.06
    })
  })
}
//
// Draws one jagged rock wall as stacked blocky slabs along a ragged edge.
//
const CAVE_WALL_SLAB_STEPS = 7
const CAVE_WALL_DEPTH = 22
function drawRaggedCaveWall(k, edge, pal, outwardSign) {
  if (!edge?.length) return
  const rock = k.rgb(pal.depthOuter.r, pal.depthOuter.g, pal.depthOuter.b)
  const shade = k.rgb(pal.depthMid.r, pal.depthMid.g, pal.depthMid.b)
  const n = edge.length
  const step = Math.max(1, Math.floor(n / CAVE_WALL_SLAB_STEPS))
  for (let i = 0; i < n - 1; i += step) {
    const a = edge[i]
    const b = edge[Math.min(n - 1, i + step)]
    const midY = (a.y + b.y) * 0.5
    const depth = CAVE_WALL_DEPTH + caveSeed01(a.x * 0.13 + midY * 0.07) * 14
    const outerX = a.x + outwardSign * depth
    const pts = [
      k.vec2(a.x, a.y),
      k.vec2(b.x, b.y),
      k.vec2(b.x + outwardSign * depth * 0.85, b.y),
      k.vec2(outerX, a.y)
    ]
    k.drawPolygon({
      pts,
      color: i % 2 === 0 ? rock : shade
    })
  }
  //
}
//
// Thin lit edge along a wall's inner (cave-facing) rim, fading toward the
// bottom of the mouth — reads as daylight catching the carved rock facets.
//
function drawCaveWallRim(k, edge, pal) {
  if (!edge?.length) return
  const n = edge.length
  const fadeEnd = Math.max(2, Math.floor(n * 0.4))
  for (let i = 0; i < fadeEnd - 1; i++) {
    const a = edge[i]
    const b = edge[i + 1]
    const opacity = 0.5 * (1 - i / fadeEnd)
    k.drawLine({
      p1: k.vec2(a.x, a.y),
      p2: k.vec2(b.x, b.y),
      width: 2,
      color: k.rgb(pal.rimEdge.r, pal.rimEdge.g, pal.rimEdge.b),
      opacity
    })
  }
}
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
  const floorTop = clampHorizProfile(
    buildJaggedFloorTop(mouth.left[0].x, mouth.right[0].x, bottomY, seed),
    zone,
    floorY,
    bottomY
  )
  const pebbleCount = 28 + Math.floor(caveSeed01(seed + 400) * 14)
  for (let i = 0; i < pebbleCount; i++) {
    const px = mouth.left[0].x + 4 + caveSeed01(seed + i * 3.1) * (mouth.right[0].x - mouth.left[0].x - 8)
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
  appendCaveWallRocks(wallRocks, mouth.left, -1, seed + 600, floorY, bottomY)
  appendCaveWallRocks(wallRocks, mouth.right, 1, seed + 900, floorY, bottomY)
  return { version: CAVE_LAYOUT_VERSION, pebbles, wallRocks, floorTop, mouth, bottomY }
}
//
// Stacks ground-style rock silhouettes along a ragged cave wall edge.
//
function appendCaveWallRocks(wallRocks, edge, outwardSign, seed, floorY, bottomY) {
  if (!edge?.length) return
  for (let layer = 0; layer < CAVE_WALL_ROCK_LAYERS; layer++) {
    const layerSeed = seed + layer * 137
    for (let i = 0; i < edge.length; i += CAVE_WALL_ROCK_STEP) {
      const p = edge[i]
      const radius = 5 + caveSeed01(layerSeed + i * 3.17) * 12
      const depth = 8 + layer * 9 + caveSeed01(layerSeed + i * 7.9) * 20
      const yJ = (caveSeed01(layerSeed + i * 11.3) - 0.5) * 14
      const y = Math.min(bottomY - radius - 2, Math.max(floorY + 2, p.y + yJ))
      wallRocks.push({
        x: p.x + outwardSign * depth,
        y,
        radius,
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
  const sc = pit.sceneRef
  const outlined = sc?.zones?.oCollected || sc?.zones?.colorWorld || (sc?.colorFade ?? 0) >= 0.5
  const sprite = outlined ? PIT_MUSH_OUTLINE_SPRITE : PIT_MUSH_SPRITE
  k.drawSprite({
    sprite,
    pos: k.vec2(x, y),
    anchor: 'bot',
    scale: k.vec2(1, scaleY),
    width: mushW + 4,
    height: mushH + 4,
    color: k.rgb(255, 255, 255)
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
  const innerX = zone.x1 + PIT_WALL_W - PIT_FLOOR_EXTRA_W / 2
  const innerW = Math.max(24, zone.width - PIT_WALL_W * 2 + PIT_FLOOR_EXTRA_W)
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
      persistStorageOnCollect: true,
      platformCollisionYOffset: 6,
      //
      // No log / no solid platform body — only the small bonus fragment
      //
      disablePlatformBody: true,
      customPlatformDraw: () => {},
      collectHintText: 'Three fragments. The\nground keeps secrets.',
      collectHintDuration: 5,
      tooltipClampInset: pit.tooltipClampInset
    })
    if (pit.pitBonus?.miniHero?.character) {
      pit.pitBonus.revealed = true
      pit.pitBonus.platformOpacity = 0
      pit.pitBonus.miniHero.character.opacity = 0.55
      pit.pitBonus.miniHero.character.z = CFG.visual.zIndex.player + 5
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
