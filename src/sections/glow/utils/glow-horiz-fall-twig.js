import { CFG } from '../../../cfg.js'
import { GLOW_PAL, getTreePaletteColor, glowRgb } from './glow-palette.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { predatorBackCatchPoint } from '../components/predator.js'
import { samplePredatorSpineHitPoints } from '../components/predator-body.js'

//
// Dry twigs hung under the shore tree's horizontal branch — they drop on the
// third hero landing on that branch, then regrow after a pause with fade-in.
//
const TWIG_COUNT = 1
const TWIG_ATTACH_BELOW_BRANCH = 5
const TWIG_MAIN_LEN = 52
const TWIG_MAIN_W = 3.2
const TWIG_SIDE_LEN = 14
const TWIG_SIDE_W = 1.8
const TWIG_SIDE_ANGLE = 0.55
const TWIG_LEAF_R = 5
const TWIG_LEAF_TIP_ANGLE = 0.3
const TWIG_LEAF_MIN_SQUEEZE = 0.35
const TWIG_HANG_ANGLE = 0.72
const TWIG_FALL_GRAVITY = 1900
const TWIG_GROUND_LINGER_SEC = 5
const TWIG_FADE_SEC = 0.85
const TWIG_RESPAWN_PAUSE_SEC = 2.5
const TWIG_REGROW_FADE_SEC = 0.75
const TWIG_ROT_SPEED = 2.4
const TWIG_PREDATOR_MOUNT_TIMER_SEC = 15
//
// The near end of a mounted stick is pinned this far behind the head centre;
// the stick never follows the lagging body segments, so its length on the back
// stays the same however far the centipede stretches.
//
const TWIG_BEHIND_HEAD = 6
//
// The stick's centre line sits this far above the highest shell top under it,
// so it lies on the back instead of sinking into the segments.
//
const TWIG_BACK_REST = TWIG_MAIN_W * 0.5 + 0.5
//
// A turn squeezes the stick through zero width instead of tilting it.
//
const TWIG_TURN_SPEED = 3.2
const TWIG_RIDE_EDGE_SLACK = 12
const TWIG_RIDE_EDGE_INSET = 4
const TWIG_RIDE_SHIELD_BELOW = 6
const TWIG_RIDE_JUMP_VEL_Y = -20
const TWIG_FALL_SUBSTEPS = 5
const TWIG_RIDE_PLAT_H = 8
const TWIG_RIDE_PLAT_HALF_W = TWIG_MAIN_LEN * 0.46
//
// Over the centipede, under the hero, the mushrooms and the big trees.
//
const TWIG_Z = CFG.visual.zIndex.player - 0.5
const TWIG_OUTLINE = GLOW_PAL.glowContour.platform
const PLATFORM_HIDE_X = -500
const PLATFORM_HIDE_Y = -5000

/**
 * Creates hanging twigs under the shore horizontal branch (world layout).
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.branchX1 - Branch platform left
 * @param {number} cfg.branchX2 - Branch platform right
 * @param {number} cfg.branchY - Branch walk surface Y
 * @returns {Object} Twig inst
 */
export function create(cfg) {
  const { k, branchX1, branchX2, branchY } = cfg
  const inst = {
    k,
    branchX1,
    branchX2,
    branchY,
    twigs: [],
    batch: PolyBatch.create(),
    dropped: false,
    regrowing: false,
    respawnWait: 0,
    regrowT: 0,
    onCycleReset: null,
    ridePlat: makeRidePlatform(k)
  }
  resetTwigsToHang(inst)
  return inst
}

/**
 * Starts the fall animation for every twig (when idle under the branch).
 * @param {Object} inst - Twig inst
 */
export function dropHorizFallTwigs(inst) {
  if (!inst || inst.dropped || inst.regrowing) return
  if (!inst.twigs.every(t => t.phase === 'idle')) return
  inst.dropped = true
  inst.respawnWait = 0
  inst.twigs.forEach(twig => {
    twig.phase = 'falling'
    twig.vy = 0
    twig.vx = (twig.seed - 0.5) * 28
    twig.rotVel = (twig.seed - 0.5) * TWIG_ROT_SPEED
  })
}

/**
 * Physics, fade-out on the ground, pause, then fade-in regrow under the branch.
 * @param {Object} inst - Twig inst
 * @param {number} dt - Frame delta
 * @param {number} floorY - Ground line Y
 * @param {Object} [predator] - Centipede inst (twig may mount its back)
 */
export function onUpdate(inst, dt, floorY, predator, heroChar) {
  if (!inst?.twigs?.length) return
  inst._heroChar = heroChar ?? inst._heroChar ?? null
  inst.twigs.forEach(twig => stepTwig(twig, dt, floorY, predator, inst))
  syncRidePlatform(inst)
  if (inst.regrowing) {
    inst.regrowT += dt / TWIG_REGROW_FADE_SEC
    const a = Math.min(1, inst.regrowT)
    inst.twigs.forEach(twig => {
      twig.phase = 'idle'
      twig.alpha = a
    })
    if (inst.regrowT >= 1) {
      inst.regrowing = false
      inst.regrowT = 0
      inst.respawnWait = 0
      inst.dropped = false
      inst.onCycleReset?.()
    }
    return
  }
  if (!inst.dropped || !allTwigsGone(inst)) return
  inst.respawnWait += dt
  if (inst.respawnWait < TWIG_RESPAWN_PAUSE_SEC) return
  beginTwigRegrow(inst)
}

/**
 * Draws twigs in tree palette wood tones.
 * @param {Object} inst - Twig inst
 * @param {number} opacity - Scene fade multiplier
 * @param {{x1: number, x2: number}|null} view - Camera cull span
 */
export function onDraw(inst, opacity, view) {
  if (!inst?.twigs?.length || opacity <= 0) return
  const k = inst.k
  const pal = getTreePaletteColor()
  const wood = k.rgb(pal.branchR, pal.branchG, pal.branchB)
  const woodDark = k.rgb(pal.rootR, pal.rootG, pal.rootB)
  const leafShade = pal.leafShades?.[1] ?? { r: pal.leafR, g: pal.leafG, b: pal.leafB }
  const leaf = k.rgb(leafShade.r, leafShade.g, leafShade.b)
  const outlineRgb = glowRgb(TWIG_OUTLINE)
  const outline = k.rgb(outlineRgb.r, outlineRgb.g, outlineRgb.b)
  const batch = inst.batch
  inst.twigs.forEach(twig => {
    if (twig.phase === 'gone') return
    if (view && (twig.x < view.x1 - 80 || twig.x > view.x2 + 80)) return
    const op = opacity * twig.alpha
    if (op <= 0.001) return
    PolyBatch.reset(batch)
    addTwigGeometry(batch, twig, wood, woodDark, leaf, outline)
    PolyBatch.flush(batch, k, op)
  })
}

/**
 * True when the hero stands on a twig riding the centipede.
 * @param {Object} inst - Twig inst
 * @param {Object} char - Hero character
 * @returns {boolean}
 */
export function isHeroRidingPredator(inst, char) {
  return Boolean(inst?.riderLocked && mountedTwig(inst) && char?.pos)
}

/**
 * True while the stick protects the hero from the centipede: standing on it,
 * or airborne after jumping off it and still above the stick.
 * @param {Object} inst - Twig inst
 * @param {Object} char - Hero character
 * @returns {boolean}
 */
export function isHeroShieldedByTwig(inst, char) {
  if (isHeroRidingPredator(inst, char)) return true
  return Boolean(inst?.riderAirborne && mountedTwig(inst) && char?.pos)
}

/**
 * Pins the hero to the stick on the centipede's back: he keeps his own offset
 * along the stick (walking changes it) and otherwise moves with it 1:1.
 * @param {Object} inst - Twig inst
 * @param {Object} char - Hero character
 * @param {Object} [hero] - Hero inst (input shift, stick counts as ground)
 */
export function snapHeroPredatorTwigRide(inst, char, hero) {
  if (!inst) return
  const mounted = mountedTwig(inst)
  if (!mounted || !char?.pos) {
    releaseRider(inst, char)
    inst.riderAirborne = false
    return
  }
  const velY = char.vel?.y ?? 0
  const midX = twigMidX(mounted)
  if (!inst.riderLocked) {
    tryLockRider(inst, char, mounted, midX, velY)
    if (!inst.riderLocked) {
      syncRiderAirborne(inst, char, mounted)
      return
    }
  } else if (velY < TWIG_RIDE_JUMP_VEL_Y) {
    releaseRider(inst, char)
    inst.riderAirborne = true
    return
  } else {
    inst.rideOffset += riderInputShift(hero)
  }
  //
  // Only the player's own steps move him along the stick — collision pushes
  // from the moving platform used to pile up and slide him onto the tail.
  // At either end he stops; leaving the stick takes a jump.
  //
  inst.rideOffset = clampRideOffset(inst.rideOffset)
  char.pos.x = midX + inst.rideOffset
  char.pos.y = mounted.y - HERO_SURFACE_DETECT_Y + HERO_LOG_SNAP_EMBED
  char.vel && (char.vel.y = 0)
  //
  // The rider platform is teleported every frame, so Kaplay keeps losing the
  // contact — the hero counts the stick as ground himself (idle/run frames,
  // landing crouch, jump squash and launch all work as on wood).
  //
  if (hero) {
    hero.carrierGrounded = true
    inst._riderHero = hero
  }
}

export const HORIZ_FALL_TWIG_DRAW_Z = TWIG_Z

const HERO_SURFACE_DETECT_Y = 38
const HERO_LOG_SNAP_EMBED = 1

function tryLockRider(inst, char, mounted, midX, velY) {
  if (velY < TWIG_RIDE_JUMP_VEL_Y) return
  const footY = char.pos.y + HERO_SURFACE_DETECT_Y
  const onPlat = char.curPlatform?.() === inst.ridePlat
  const overStick = Math.abs(char.pos.x - midX) <= TWIG_RIDE_PLAT_HALF_W + TWIG_RIDE_EDGE_SLACK
  const atTop = footY >= mounted.y - 16 && footY <= mounted.y + 18
  if (!onPlat && !(overStick && atTop)) return
  inst.riderLocked = true
  inst.riderAirborne = false
  inst.rideDir == null && (inst.rideDir = Math.random() < 0.5 ? -1 : 1)
  inst.rideOffset = clampRideOffset(char.pos.x - midX)
  //
  // Kaplay already drags a body standing on a moving platform — with our own
  // pin on top of that the hero drifted along the stick, so the carry is off.
  //
  char.stickToPlatform = false
}

function releaseRider(inst, char) {
  if (!inst.riderLocked) return
  inst.riderLocked = false
  inst.rideDir = null
  inst.rideOffset = 0
  char && (char.stickToPlatform = true)
  inst._riderHero && (inst._riderHero.carrierGrounded = false)
  inst._riderHero = null
}

//
// A jump off the stick stays shielded while the hero is still above the
// stick — his feet start inside the shell, so the touch check killed him at
// take-off. Landing anywhere or dropping below the stick ends the shield.
//
function syncRiderAirborne(inst, char, mounted) {
  if (!inst.riderAirborne) return
  const footY = char.pos.y + HERO_SURFACE_DETECT_Y
  const landed = (char.isGrounded?.() ?? false) && (char.vel?.y ?? 0) >= 0
  if (landed || footY > mounted.y + TWIG_RIDE_SHIELD_BELOW) inst.riderAirborne = false
}

function riderInputShift(hero) {
  if (!hero?._effectivelyMoving || !hero.k) return 0
  return (hero.direction ?? 0) * hero.speed * (hero.moveSpeedMult ?? 1) * hero.k.dt()
}

function clampRideOffset(offset) {
  const half = TWIG_RIDE_PLAT_HALF_W - TWIG_RIDE_EDGE_INSET
  return Math.max(-half, Math.min(half, offset))
}

function makeRidePlatform(k) {
  return k.add([
    k.rect(TWIG_RIDE_PLAT_HALF_W * 2, TWIG_RIDE_PLAT_H),
    k.pos(PLATFORM_HIDE_X, PLATFORM_HIDE_Y),
    k.anchor('top'),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName
  ])
}

function resetTwigsToHang(inst) {
  const span = inst.branchX2 - inst.branchX1
  inst.twigs.length = 0
  hideRidePlatform(inst)
  const x = inst.branchX1 + span * 0.62
  const y = inst.branchY + TWIG_ATTACH_BELOW_BRANCH
  inst.twigs.push(makeTwigState(x, y, 0, TWIG_HANG_ANGLE))
}

function beginTwigRegrow(inst) {
  resetTwigsToHang(inst)
  inst.regrowing = true
  inst.regrowT = 0
  inst.twigs.forEach(twig => {
    twig.alpha = 0
    twig.phase = 'idle'
  })
}

function allTwigsGone(inst) {
  return inst.twigs.every(twig => twig.phase === 'gone')
}

function makeTwigState(x, y, index, hangRot) {
  return {
    x,
    y,
    rot: hangRot,
    hangRot,
    phase: 'idle',
    vy: 0,
    vx: 0,
    rotVel: 0,
    alpha: 1,
    seed: 0.22 + index * 0.41,
    groundTimer: 0,
    fadeT: 0,
    predatorTimer: 0
  }
}

function mountedTwig(inst) {
  return inst?.twigs?.find(twig => twig.phase === 'predatorMount') ?? null
}

function stepTwig(twig, dt, floorY, predator, inst) {
  if (twig.phase === 'idle') return
  if (twig.phase === 'predatorMount') {
    const riding = Boolean(inst.riderLocked)
    if (predator) {
      riding && inst.rideDir == null && (inst.rideDir = predator.dir)
      predator.holdFacing = riding
      riding && (predator.dir = inst.rideDir)
    }
    placeTwigOnBack(twig, predator, dt, riding, inst.rideDir)
    !riding && (twig.predatorTimer += dt)
    if (!riding && twig.predatorTimer >= TWIG_PREDATOR_MOUNT_TIMER_SEC) {
      twig.phase = 'falling'
      twig.rot = twig.face >= 0 ? 0 : Math.PI
      twig.face = 1
      twig.vy = 40
      twig.vx = (predator?.dir ?? 1) * 18
      twig.rotVel = 1.1
      predator && (predator.holdFacing = false)
      hideRidePlatform(inst)
    }
    return
  }
  if (twig.phase === 'falling') {
    const slices = TWIG_FALL_SUBSTEPS
    const sdt = dt / slices
    for (let i = 0; i < slices; i++) {
      twig.vy += TWIG_FALL_GRAVITY * sdt
      twig.x += twig.vx * sdt
      twig.y += twig.vy * sdt
      twig.rot += twig.rotVel * sdt
      if (tryMountTwig(twig, predator)) return
      if (twig.y >= floorY - 4) {
        twig.y = floorY - 4
        twig.phase = 'ground'
        twig.vy = 0
        twig.vx *= 0.35
        twig.rotVel *= 0.2
        twig.rot = 0
        return
      }
    }
    return
  }
  if (twig.phase === 'ground') {
    twig.groundTimer += dt
    twig.groundTimer >= TWIG_GROUND_LINGER_SEC && (twig.phase = 'fade', twig.fadeT = 0)
    return
  }
  if (twig.phase === 'fade') {
    twig.fadeT += dt / TWIG_FADE_SEC
    twig.alpha = Math.max(0, 1 - twig.fadeT)
    twig.fadeT >= 1 && (twig.phase = 'gone')
  }
}

function tryMountTwig(twig, predator) {
  if (!predator || twig.vy < 30) return false
  const x2 = twig.x + Math.cos(twig.rot) * TWIG_MAIN_LEN
  const y2 = twig.y + Math.sin(twig.rot) * TWIG_MAIN_LEN
  const hit = predatorBackCatchPoint(predator, twig.x, twig.y, x2, y2)
  if (!hit) return false
  twig.phase = 'predatorMount'
  twig.predatorTimer = 0
  twig.vy = 0
  twig.vx = 0
  twig.rotVel = 0
  twig.alpha = 1
  twig.rot = 0
  twig.face = -(predator.dir || 1)
  placeTwigOnBack(twig, predator, 0)
  return true
}
//
// face: +1 = stick runs to +X from its pinned end, -1 = to -X. It eases
// toward the tail side, so a turn squeezes the horizontal stick thin and
// widens it again on the other side.
//
function placeTwigOnBack(twig, predator, dt, riderLocked, rideDir) {
  const head = predator?.segments?.[0]
  if (!head) return
  const tailDir = riderLocked && rideDir != null ? -rideDir : -(predator.dir || 1)
  if (riderLocked && rideDir != null) {
    twig.face = tailDir
  } else {
    twig.face == null && (twig.face = tailDir)
    twig.face += (tailDir - twig.face) * Math.min(1, dt * TWIG_TURN_SPEED)
  }
  twig.rot = 0
  twig.x = head.x + twig.face * (head.radius + TWIG_BEHIND_HEAD)
  twig.y = backTopUnderTwig(predator, twig.x, twig.x + tailDir * TWIG_MAIN_LEN) - TWIG_BACK_REST
}

//
// Highest shell top along the stick span on the ideal spine. The drawn
// segments lag and pop in and out of the span, which made the rider
// platform jitter and shove the hero sideways.
//
function backTopUnderTwig(predator, xa, xb) {
  const lo = Math.min(xa, xb)
  const hi = Math.max(xa, xb)
  const pts = samplePredatorSpineHitPoints(predator)
  let top = Infinity
  for (const pt of pts) {
    pt.x >= lo && pt.x <= hi && (top = Math.min(top, pt.y - pt.radius))
  }
  if (top === Infinity) {
    const seg = predator.segments[1] ?? predator.segments[0]
    top = seg.y - seg.radius
  }
  return top
}

function twigMidX(twig) {
  return twig.phase === 'predatorMount'
    ? twig.x + twig.face * TWIG_MAIN_LEN * 0.5
    : twig.x + Math.cos(twig.rot) * TWIG_MAIN_LEN * 0.5
}

function syncRidePlatform(inst) {
  const plat = inst.ridePlat
  if (!plat) return
  const mounted = inst.twigs.find(t => t.phase === 'predatorMount')
  if (!mounted) {
    hideRidePlatform(inst)
    return
  }
  plat.pos.x = twigMidX(mounted)
  plat.pos.y = mounted.y
}

function hideRidePlatform(inst) {
  const plat = inst.ridePlat
  if (!plat) return
  plat.pos.x = PLATFORM_HIDE_X
  plat.pos.y = PLATFORM_HIDE_Y
}

//
// Geometry is built in the stick's local frame (main axis = +X) and mapped to
// the world with a rotation plus an X squeeze (the mounted stick's turn).
//
function addTwigGeometry(batch, twig, wood, woodDark, leaf, outline) {
  const sx = twig.phase === 'predatorMount' ? twig.face : 1
  const mid = TWIG_MAIN_LEN * 0.55
  const sideB = TWIG_SIDE_ANGLE * 0.85
  const sideBLen = TWIG_SIDE_LEN * 0.75
  const leafScale = Math.max(TWIG_LEAF_MIN_SQUEEZE, Math.abs(sx))
  const tipLx = TWIG_MAIN_LEN + Math.cos(TWIG_LEAF_TIP_ANGLE) * TWIG_LEAF_R
  const tipLy = Math.sin(TWIG_LEAF_TIP_ANGLE) * TWIG_LEAF_R
  addTwigLine(batch, twig, sx, 0, 0, TWIG_MAIN_LEN, 0, TWIG_MAIN_W, wood)
  addTwigLine(batch, twig, sx, 0, 0, TWIG_MAIN_LEN, 0, TWIG_MAIN_W + 1.2, outline)
  addTwigLine(batch, twig, sx, mid, 0,
    mid + Math.cos(-TWIG_SIDE_ANGLE) * TWIG_SIDE_LEN, Math.sin(-TWIG_SIDE_ANGLE) * TWIG_SIDE_LEN, TWIG_SIDE_W, woodDark)
  addTwigLine(batch, twig, sx, mid, 0, mid + Math.cos(sideB) * sideBLen, Math.sin(sideB) * sideBLen, TWIG_SIDE_W, woodDark)
  PolyBatch.addDisc(batch, twigWorldX(twig, sx, tipLx, tipLy), twigWorldY(twig, tipLx, tipLy), TWIG_LEAF_R * leafScale, leaf)
  PolyBatch.addDisc(batch, twigWorldX(twig, sx, tipLx - 4, tipLy + 2), twigWorldY(twig, tipLx - 4, tipLy + 2),
    TWIG_LEAF_R * 0.65 * leafScale, leaf)
}

function addTwigLine(batch, twig, sx, ax, ay, bx, by, w, color) {
  PolyBatch.addLine(batch,
    twigWorldX(twig, sx, ax, ay), twigWorldY(twig, ax, ay),
    twigWorldX(twig, sx, bx, by), twigWorldY(twig, bx, by), w, color)
}

function twigWorldX(twig, sx, lx, ly) {
  return twig.x + sx * (lx * Math.cos(twig.rot) - ly * Math.sin(twig.rot))
}

function twigWorldY(twig, lx, ly) {
  return twig.y + lx * Math.sin(twig.rot) + ly * Math.cos(twig.rot)
}
