import { CFG } from '../../../cfg.js'
import * as BonusHero from '../../touch/components/bonus-hero.js'
import { get, set } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import { toCanvas } from '../../../utils/helper.js'
import { drawCuteMushroomToCanvas, CUTE_MUSHROOM_ASPECT } from './cute-mushroom.js'
import { GLOW_PAL } from './glow-palette.js'
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
const PIT_MUSH_SPRITE = 'glow0-pit-mush'
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
 */
export function updateGlowPit(pit, char, grounded, justLanded, bonusPlatHome) {
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
  } else if (justLanded && !overCrack) {
    pit.collapseArmed = false
    pit.leftBonusAirborne = false
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
  const voidC = k.rgb(
    Math.max(0, Math.round(groundC.r * 0.82)),
    Math.max(0, Math.round(groundC.g * 0.82)),
    Math.max(0, Math.round(groundC.b * 0.8))
  )
  if (!pit.wallProfile) {
    pit.wallProfile = buildCaveWallProfile(zone, floorY)
  }
  const pts = []
  for (const p of pit.wallProfile.left) {
    pts.push(k.vec2(p.x, p.y))
  }
  for (let i = pit.wallProfile.right.length - 1; i >= 0; i--) {
    pts.push(k.vec2(pit.wallProfile.right[i].x, pit.wallProfile.right[i].y))
  }
  k.drawPolygon({ pts, color: voidC })
  //
  // Jagged earth rim — short vertical notches along the mouth
  //
  const rimC = k.rgb(
    Math.max(0, groundC.r - 38),
    Math.max(0, groundC.g - 38),
    Math.max(0, groundC.b - 35)
  )
  for (let i = 0; i < pit.wallProfile.rim.length; i++) {
    const r = pit.wallProfile.rim[i]
    k.drawLine({
      p1: k.vec2(r.x1, r.y1),
      p2: k.vec2(r.x2, r.y2),
      width: Math.max(1.2, r.w),
      color: rimC,
      opacity: 0.85
    })
  }
}
//
// Irregular stepped cave walls — reads as broken earth, not smooth curves
//
function buildCaveWallProfile(zone, floorY) {
  const steps = 38
  const left = []
  const right = []
  const seed = zone.x1 * 0.017 + floorY * 0.003
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const y = floorY + t * zone.depth
    const jagL = caveWallJag(t, 1, seed)
    const jagR = caveWallJag(t, 2, seed)
    left.push({
      x: zone.x1 + PIT_WALL_W * 0.15 + jagL,
      y
    })
    right.push({
      x: zone.x2 - PIT_WALL_W * 0.15 - jagR,
      y
    })
  }
  const rim = []
  const rimSteps = 14 + Math.floor(Math.random() * 6)
  for (let i = 0; i < rimSteps; i++) {
    const t = i / rimSteps
    const x = zone.x1 + t * zone.width
    const notch = 2 + Math.random() * 7
    rim.push({
      x1: x,
      y1: floorY,
      x2: x + zone.width / rimSteps * 0.85,
      y2: floorY + notch,
      w: 1.1 + Math.random() * 1.4
    })
  }
  return { left, right, rim }
}
function caveWallJag(t, side, seed) {
  const s = side === 1 ? 1 : -1
  return s * (
    Math.sin(t * 17.3 + seed) * 12 +
    Math.sin(t * 43.7 + seed * 1.4) * 8 +
    Math.sin(t * 89 + seed * 0.6) * 5 +
    Math.sin(t * 151 + seed * 2.1) * 3
  ) + Math.sin(t * 31 + seed * side) * zoneBulge(t) * 14
}
function zoneBulge(t) {
  return 0.25 + 0.35 * Math.sin(t * Math.PI * 1.2)
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
