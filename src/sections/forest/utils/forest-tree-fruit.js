import { CFG } from '../../../cfg.js'
import * as Sound from '../../../utils/sound.js'
import { FOREST_SUN_LIT_FRAC, FOREST_SUN_LIT_OFFSET_X, FOREST_SUN_LIT_OFFSET_Y } from './forest-eye-berry.js'
import { FOREST_PAL, forestRgb } from './forest-palette.js'

//
// The apples of the left big forest tree: the tree starts bare and every
// watering of its roots grows one more apple in the crown (drawn from a
// picture), up to one on each of its hangs. A ripe one is what the hero
// knocks loose from the start branch; it falls, rests and is eaten.
//
// Fallen anchor fruit vanishes after this if the centipede never claims it.
//
const FRUIT_GROUND_LINGER_SEC = 10
//
// Bites on a picture fruit are round, like real bites, taken off the side
// facing the eater. Each bite moves that side's front line toward the far
// edge of what is left by an even share of the bites still to come, so the
// fruit always shrinks from the eater's side and is gone by the last bite,
// even when a meal is broken off and taken up again from the other side
// (each side keeps its own line). A bite takes up to BITE_PER_TURN round
// pieces (radius BITE_R of the fruit's, a little random) out of the bands of
// the body (BITE_BANDS: heights, shares of its half-height) that still stick
// out past that line, the most protruding first. The body is sampled on a
// grid of BITE_GRID x BITE_GRID points (squashed like the drawn fruit); the
// cut edge shows the pale flesh.
//
const BITE_R = 0.42
const BITE_R_RANGE = 0.12
const BITE_BANDS = [-0.6, 0, 0.6]
const BITE_PER_TURN = 2
const BITE_JITTER_X = 0.08
const BITE_JITTER_Y = 0.12
//
// Past the front line plus this share of the radius nothing of the fruit is
// left (thin slivers between round bites are cut off too).
//
const BITE_LINE_SLACK = 0.18
const BITE_GRID = 24
const BITE_SQUASH_Y = 0.92
const BITE_FLESH_W = 2
const FRUIT_GROUND_FADE_SEC = 0.9
//
// A watering sprouts its apple this long after it. The apple swells from
// its stem over APPLE_GROW_SEC (from APPLE_GROW_FROM of its size, a little
// past it before it settles), fading in over the first APPLE_FADE_IN share
// of that, and turns from green to red over APPLE_RIPEN_SEC from
// APPLE_RIPEN_AFTER on; only a ripe apple can be knocked down.
//
const APPLE_SPROUT_DELAY = 3
const APPLE_GROW_SEC = 2.4
const APPLE_GROW_FROM = 0.12
const APPLE_GROW_OVERSHOOT = 1.2
const APPLE_FADE_IN = 0.25
const APPLE_RIPEN_AFTER = 1.2
const APPLE_RIPEN_SEC = 3
const APPLE_RIPE_AGE = Math.max(APPLE_GROW_SEC, APPLE_RIPEN_AFTER + APPLE_RIPEN_SEC)
//
// The apple a branch landing shook but did not knock off swings on its
// stem: each landing kicks it (rad/s, the other way each time, ~0.15 rad
// out), a spring (1/s²) pulls it back and damping (1/s) calms it within a
// few swings; under APPLE_SWING_REST it hangs still.
//
const APPLE_SWING_KICK = 0.8
const APPLE_SWING_STIFFNESS = 30
const APPLE_SWING_DAMPING = 2.2
const APPLE_SWING_REST = 0.002
const RAD_TO_DEG = 180 / Math.PI
//
// Fruit hangs on a short visible stem.
//
const FRUIT_STEM_W = 1.8
const FRUIT_STEM_CONTOUR_W = 1
//
// The knocked apple's ground strip: this far from the trunk and from the
// branch trampoline's grass clearing.
//
const ANCHOR_DROP_LEFT_PAD = 16
const ANCHOR_DROP_RIGHT_PAD = 12
const FRUIT_STEM_LEN = 4
const FRUIT_CONTOUR_W = 1.2
const FRUIT_Z = CFG.visual.zIndex.platforms - 1
const FRUIT_FALL_GRAVITY = 1650
//
// A landed apple settles a little INTO the ground (its bottom this many px
// below the floor line) so it nests in the grass instead of hovering above it.
//
const FRUIT_GROUND_SINK = 5
const FRUIT_BOUNCE_RESTITUTION_FIRST = 0.36
const FRUIT_BOUNCE_RESTITUTION_SECOND = 0.2
const FRUIT_BOUNCE_MIN_VY = 95
const FRUIT_BOUNCE_MAX_COUNT = 2
const FRUIT_LAND_ROLL_SPEED = 46
const FRUIT_ROLL_FRICTION = 720
const FRUIT_SETTLE_VX = 5
//
// Keep fallen fruit in front of the right trampoline cap so the centipede's
// feast stays visible (same cap scale as forest level0 TRAMP_RADIUS).
//
const FOREST_RIGHT_TRAMP_CAP_HALF = 38
const FOREST_FRUIT_TRAMP_ROLL_CLEAR = 16
const FOREST_FRUIT_TRAMP_HIDE_X_MAX = 148

/**
 * X centre of the strip between trunk and branch trampoline (for anchor foliage pick).
 * @param {Object} cfg
 * @param {number} cfg.trunkX
 * @param {number} cfg.trunkHalf
 * @param {number} cfg.branchTrampX
 * @param {number} cfg.trampClearHalf
 * @returns {number}
 */
export function computeForestAnchorFruitDropX(cfg) {
  const { x1, x2 } = forestAnchorFruitGroundClearSpan(cfg)
  return (x1 + x2) * 0.5
}

/**
 * World X span on the ground kept clear for the knocked anchor apple (between
 * trunk and branch-trampoline pads). Matches the foliage pick gap.
 * @param {Object} cfg
 * @param {number} cfg.trunkX
 * @param {number} cfg.trunkHalf
 * @param {number} cfg.branchTrampX
 * @param {number} cfg.trampClearHalf
 * @returns {{ x1: number, x2: number }}
 */
export function forestAnchorFruitGroundClearSpan(cfg) {
  const { trunkX, trunkHalf, branchTrampX, trampClearHalf } = cfg
  return {
    x1: trunkX + trunkHalf + ANCHOR_DROP_LEFT_PAD,
    x2: branchTrampX - trampClearHalf - ANCHOR_DROP_RIGHT_PAD
  }
}

/**
 * The tree's apple crop: where apples grow and the picture they are drawn
 * from. The tree starts bare; apples come with waterForestTreeApples().
 * @param {Array<{x: number, y: number, r: number}>} hangs - Their bodies' centres (in the order they come) and radius
 * @param {{sprite: string, unripe: string, w: number, h: number, dx: number, dy: number}} picture - Its ripe and
 *   young sprites, size and top-left offset from the body's centre
 * @returns {Object} Crop inst (levelInst.treeApples)
 */
export function createForestTreeApples(hangs, picture) {
  return { hangs, picture, sprouts: [] }
}

/**
 * The roots were watered: one more apple sprouts APPLE_SPROUT_DELAY later,
 * unless every hang already has an apple on it or on its way.
 * @param {Object} levelInst - Forest level inst (needs treeApples)
 */
export function waterForestTreeApples(levelInst) {
  const crop = levelInst.treeApples
  if (!crop || getForestTreeAppleCount(levelInst) >= crop.hangs.length) return
  crop.sprouts.push(APPLE_SPROUT_DELAY)
}

/**
 * Apples on the tree and on their way (saved level state).
 * @param {Object} levelInst - Forest level inst
 * @returns {number}
 */
export function getForestTreeAppleCount(levelInst) {
  const onTree = levelInst.treeFruitSpots?.filter(f => f.attached).length ?? 0
  return onTree + (levelInst.treeApples?.sprouts.length ?? 0)
}

/**
 * Hangs saved apples back on the tree, already ripe.
 * @param {Object} levelInst - Forest level inst (needs treeApples)
 * @param {number} count - How many
 */
export function restoreForestTreeApples(levelInst, count) {
  if (!levelInst.treeApples) return
  for (let i = 0; i < count; i++) sproutTreeApple(levelInst, APPLE_RIPE_AGE)
}

/**
 * True while a ripe apple hangs on the tree (one the branch can knock down).
 * @param {Object} levelInst - Forest level inst
 * @returns {boolean}
 */
export function hasForestRipeTreeApple(levelInst) {
  return levelInst.treeFruitSpots?.some(isRipeTreeApple) ?? false
}

/**
 * True while the single branch-knocked apple is still falling or on the ground.
 * @param {Object} levelInst - Forest level inst
 * @returns {boolean}
 */
export function hasForestAnchorFruitDropInWorld(levelInst) {
  const spots = levelInst.treeFruitSpots
  if (!spots?.length) return false
  return spots.some(f => f.fromAnchorDrop && !f.removed)
}

/**
 * Knocks the oldest ripe apple off the tree (start-branch knock). No second
 * drop until the centipede has eaten the current one.
 * @param {Object} levelInst - Forest level inst
 * @returns {boolean} True when an apple was knocked loose
 */
export function releaseForestAnchorFruit(levelInst) {
  if (hasForestAnchorFruitDropInWorld(levelInst)) return false
  const fruit = nextAnchorFruit(levelInst)
  if (!fruit) return false
  fruit.attached = false
  fruit.fromAnchorDrop = true
  fruit.vy = 0
  fruit.vx = 0
  fruit.rollDir = pickFruitLandRollDir(fruit.x, fruit.y)
  return true
}

/**
 * A start-branch landing that does not knock the apple off yet: the apple
 * that falls next swings a little left and right on its stem and settles.
 * @param {Object} levelInst - Forest level inst
 */
export function swingForestAnchorFruit(levelInst) {
  const fruit = nextAnchorFruit(levelInst)
  if (!fruit) return
  fruit.swingDir = -(fruit.swingDir || -1)
  fruit.swingVel = (fruit.swingVel ?? 0) + APPLE_SWING_KICK * fruit.swingDir
  fruit.swingAngle ??= 0
}

/**
 * Where the knocked apple still in the world lies (falling or waiting for the
 * centipede), null when there is none — saved level state.
 * @param {Object} levelInst - Forest level inst
 * @param {number} floorY - Ground surface Y used while it is still falling
 * @returns {{x: number, floorY: number}|null}
 */
export function getFallenAnchorFruit(levelInst, floorY) {
  const fruit = levelInst.treeFruitSpots?.find(f => f.fromAnchorDrop && !f.removed && !f.beingEaten && !f.carried)
  return fruit ? { x: fruit.x, floorY: fruit.settled ? (fruit._restFloorY ?? floorY) : floorY } : null
}

/**
 * Puts a saved knocked apple back on the ground at x, already settled, so
 * the centipede comes for it as before.
 * @param {Object} levelInst - Forest level inst
 * @param {number} x - Ground X of the apple
 * @param {number} floorY - Ground surface Y
 */
export function restoreFallenAnchorFruit(levelInst, x, floorY) {
  const crop = levelInst.treeApples
  if (!crop || hasForestAnchorFruitDropInWorld(levelInst)) return
  const r = crop.hangs[0].r
  levelInst.treeFruitSpots.push({
    fromAnchorDrop: true,
    attached: false,
    x,
    y: floorY - r + FRUIT_GROUND_SINK,
    r,
    vy: 0,
    vx: 0,
    rollDir: pickFruitLandRollDir(x, floorY),
    picture: crop.picture,
    airborne: false,
    settled: true,
    _restFloorY: floorY
  })
}

/**
 * Grows the tree's apples and steps falling fruit physics.
 * @param {Object} levelInst - Forest level inst
 * @param {number} dt - Frame delta
 * @param {number} floorY - Ground surface Y
 */
export function tickForestTreeFruits(levelInst, dt, floorY) {
  growTreeApples(levelInst, dt)
  const spots = levelInst.treeFruitSpots
  if (!spots?.length || floorY == null) return
  const now = levelInst.k?.time?.() ?? 0
  let prune = false
  spots.forEach(fruit => {
    if (fruit.removed) return
    if (fruit.attached || fruit.carried) return
    if (!fruit.settled) {
      stepFallingFruit(fruit, dt, floorY, levelInst)
      return
    }
    fruit.settledAt == null && (fruit.settledAt = now)
    //
    // The knocked apple waits on the ground until the centipede eats it.
    //
    if (fruit.beingEaten || fruit.fromAnchorDrop) return
    const linger = now - fruit.settledAt
    if (!fruit.fadeOutStarted && linger >= FRUIT_GROUND_LINGER_SEC) {
      fruit.fadeOutStarted = true
      fruit.fadeOutT = 0
    }
    if (fruit.fadeOutStarted) {
      fruit.fadeOutT = (fruit.fadeOutT ?? 0) + dt
      fruit.fadeOutT >= FRUIT_GROUND_FADE_SEC && (fruit.removed = true, prune = true)
    }
  })
  prune && (levelInst.treeFruitSpots = spots.filter(f => !f.removed))
  spots.forEach(fruit => {
    if (fruit.removed || fruit.attached || fruit.beingEaten || fruit.carried) return
    if (fruit.settled) nudgeForestFruitClearOfRightTramp(levelInst, fruit)
  })
}

/**
 * A creature picks a fallen fruit up: the fruit layer stops drawing it and
 * its physics stop until it is dropped or taken away for good.
 * @param {Object} fruit - Tree fruit spot (fallen)
 */
export function carryForestFruit(fruit) {
  fruit.carried = true
}

/**
 * A carried fruit is dropped from a point: it falls straight down and rests
 * on the ground again (no bounce).
 * @param {Object} fruit - Carried tree fruit spot
 * @param {number} x - World X it drops from
 * @param {number} y - World Y of its centre when dropped
 */
export function dropForestCarriedFruit(fruit, x, y) {
  Object.assign(fruit, {
    carried: false,
    settled: false,
    airborne: true,
    x,
    y,
    vx: 0,
    vy: 0,
    bounceCount: FRUIT_BOUNCE_MAX_COUNT,
    _restFloorY: null,
    settledAt: null
  })
}

/**
 * A carried fruit is taken away for good (it leaves the level's fruit list
 * on the next tick).
 * @param {Object} levelInst - Forest level inst
 * @param {Object} fruit - Carried tree fruit spot
 */
export function removeForestCarriedFruit(levelInst, fruit) {
  fruit.removed = true
  levelInst.treeFruitSpots = levelInst.treeFruitSpots.filter(f => !f.removed)
}

/**
 * Draws a fallen fruit (bites and all) with its body's centre at a point,
 * for a creature carrying it.
 * @param {Object} k - Kaplay instance
 * @param {Object} fruit - Tree fruit spot with a picture
 * @param {number} x - World X of its body's centre
 * @param {number} y - World Y of its body's centre
 * @param {Object} [look] - How the carrier shows it
 * @param {number} [look.zoom=1] - Size factor round its centre
 * @param {number} [look.opacity=1] - Opacity
 * @param {Object} [look.color] - Tint (Kaplay color), none by default
 */
export function drawForestFruitAt(k, fruit, x, y, { zoom = 1, opacity = 1, color = null } = {}) {
  const pic = fruit.picture
  if (!pic) return
  k.drawSprite({
    sprite: bittenPicture(k, fruit),
    pos: k.vec2(x + pic.dx * zoom, y + pic.dy * zoom),
    width: pic.w * zoom,
    height: pic.h * zoom,
    opacity,
    ...(color ? { color } : {})
  })
}

/**
 * Registers a fixed draw layer for tree fruits.
 * @param {Object} k - Kaplay inst
 * @param {Object} levelInst - Forest level inst (needs treeFruitSpots)
 * @param {number} [z=FRUIT_Z] - Draw layer
 * @returns {Object} The layer's game object
 */
export function mountForestTreeFruitLayer(k, levelInst, z = FRUIT_Z) {
  return k.add([
    k.z(z),
    {
      draw() {
        drawForestTreeFruits(levelInst)
      }
    }
  ])
}

/**
 * Draws fruits when the main tree is visible.
 * @param {Object} inst - Forest level inst
 */
function drawForestTreeFruits(inst) {
  const spots = inst.treeFruitSpots
  if (!spots?.length) return
  const k = inst.k
  const camX = k.camPos().x
  const camScale = k.camScale?.()
  const zoom = (typeof camScale === 'object' ? camScale.x : camScale) || 1
  const half = k.width() / (2 * zoom) + 48
  const minX = camX - half
  const maxX = camX + half
  let fallbackColors = null
  for (let i = 0; i < spots.length; i++) {
    const fruit = spots[i]
    if (fruit.removed || fruit.carried || fruit.feastDrawHidden) continue
    if (fruit.x < minX || fruit.x > maxX) continue
    let op = 1
    fruit.fadeOutStarted && (op *= Math.max(0, 1 - (fruit.fadeOutT ?? 0) / FRUIT_GROUND_FADE_SEC))
    if (op <= 0.02) continue
    if (fruit.picture) {
      drawFruitPicture(k, fruit, op)
      continue
    }
    if (!fallbackColors) {
      const fruitPal = FOREST_PAL.forestTreeFruit
      fallbackColors = {
        bodyA: forestRgb(fruitPal.body),
        bodyB: forestRgb(fruitPal.light),
        shadeRgb: forestRgb(fruitPal.shade),
        contourRgb: forestRgb(fruitPal.contour),
        stem: forestRgb(FOREST_PAL.treeColor.root),
        highlight: forestRgb(fruitPal.light)
      }
    }
    const { bodyA, bodyB, shadeRgb, contourRgb, stem, highlight } = fallbackColors
    const t = fruit.hue ?? 0.5
    const rgb = lerpRgb(bodyA, bodyB, t)
    const col = k.rgb(rgb.r, rgb.g, rgb.b)
    const stemCol = k.rgb(stem.r, stem.g, stem.b)
    const leaves = fruit.leaves ?? []
    leaves.forEach(leaf => {
      const leafRgb = leafRgbFromShadeIdx(leaf.shadeIdx)
      const lx = fruit.x + leaf.dx
      const ly = fruit.y + leaf.dy
      drawFruitLeaf(k, lx, ly, leaf.len, leaf.angle, leafRgb, op * 0.95)
    })
    const shadeCol = k.rgb(shadeRgb.r, shadeRgb.g, shadeRgb.b)
    const contourCol = k.rgb(contourRgb.r, contourRgb.g, contourRgb.b)
    fruit.attached && drawFruitStem(k, fruit, stemCol, contourCol, op)
    drawFruitBody(k, fruit, col, shadeCol, contourCol, op)
    const bodyR = fruitDisplayRadius(fruit)
    bodyR > 2 && k.drawCircle({
      pos: k.vec2(
        fruit.x + bodyR * FOREST_SUN_LIT_OFFSET_X - bodyR * 0.08,
        fruit.y + bodyR * FOREST_SUN_LIT_OFFSET_Y - bodyR * 0.1
      ),
      radius: bodyR * 0.18,
      color: k.rgb(highlight.r, highlight.g, highlight.b),
      opacity: op * 0.28
    })
  }
}

/**
 * How far what is left of the fruit still reaches from its centre toward
 * the eater's side (angle 0 = right, PI = left; negative once the bites
 * have eaten past the centre): a picture fruit's front after its bites, a
 * drawn fruit's shrinking radius.
 * @param {Object} fruit - Tree fruit spot
 * @param {number} angle - Direction from the fruit's centre (radians)
 * @returns {number}
 */
export function getForestFruitReach(fruit, angle) {
  if (!fruit.picture) return getForestFruitDisplayRadius(fruit)
  return sideReach(fruit, sideOf(angle))
}

/**
 * Takes one bite out of a picture fruit on the side facing the eater: its
 * front there moves toward the far edge of what is left by an even share of
 * the bites still to come, and the parts sticking out past it lose a round
 * piece each, so every bite makes it visibly smaller from that side.
 * @param {Object} fruit - Tree fruit spot (with a picture)
 * @param {number} angle - Direction from the fruit toward the eater (0 = right, PI = left)
 * @param {number} bitesLeft - Bites still to come in this meal, this one included
 * @param {() => number} rng - Random in [0, 1)
 */
export function biteForestPictureFruit(fruit, angle, bitesLeft, rng) {
  const side = sideOf(angle)
  const r = fruit.r
  const near = sideReach(fruit, side)
  const far = -sideReach(fruit, -side)
  const line = near - (near - far) / Math.max(1, bitesLeft)
  const lines = fruit.biteLines ?? {}
  lines[side] = Math.min(lines[side] ?? Infinity, line + r * BITE_LINE_SLACK)
  fruit.biteLines = lines
  const half = r * BITE_SQUASH_Y
  const band = half * 2 / BITE_BANDS.length
  const bites = fruit.biteMarks ?? []
  BITE_BANDS
    .map(share => ({ y: share * half, front: fruitFront(fruit, side, share * half - band / 2, share * half + band / 2).front }))
    .filter(b => b.front > line)
    .sort((a, b) => b.front - a.front)
    .slice(0, BITE_PER_TURN)
    .forEach(b => {
      const br = r * (BITE_R + rng() * BITE_R_RANGE)
      bites.push({
        x: side * (line + br + (rng() * 2 - 1) * r * BITE_JITTER_X),
        y: b.y + (rng() * 2 - 1) * r * BITE_JITTER_Y,
        r: br
      })
    })
  fruit.biteMarks = bites
  fruit.biteVersion = (fruit.biteVersion ?? 0) + 1
}

/**
 * @param {Object} fruit - Tree fruit spot
 * @returns {number}
 */
export function getForestFruitDisplayRadius(fruit) {
  if (fruit.picture) return fruit.r
  const progress = fruit.eatProgress ?? 0
  return fruit.r * (1 - progress * 0.94)
}
//
// Keeps a fallen fruit's bottom on the ground as bites shrink its radius.
//
export function keepForestFruitRestingOnFloor(fruit) {
  if (!fruit || fruit.attached || fruit.removed) return
  const r = getForestFruitDisplayRadius(fruit)
  if (fruit._restFloorY == null) {
    fruit._restFloorY = fruit.y + r - FRUIT_GROUND_SINK
  }
  fruit.y = fruit._restFloorY - r + FRUIT_GROUND_SINK
}

//
// A fruit drawn from its picture: its body's centre on the fruit, at its
// full size once off the tree; eating it only cuts bites out of it.
//
function drawFruitPicture(k, fruit, op) {
  if (fruit.attached) return drawTreeApple(k, fruit, op)
  const pic = fruit.picture
  k.drawSprite({
    sprite: bittenPicture(k, fruit),
    pos: k.vec2(fruit.x + pic.dx, fruit.y + pic.dy),
    width: pic.w,
    height: pic.h,
    opacity: op
  })
}
//
// An apple on the tree swells from its stem (the picture's top stays put)
// and its green copy gives way to the red one as it ripens.
//
function drawTreeApple(k, fruit, op) {
  const pic = fruit.picture
  const age = fruit.age
  const s = appleGrowScale(age)
  const fade = op * Math.min(1, age / (APPLE_GROW_SEC * APPLE_FADE_IN))
  const ripe = clamp01((age - APPLE_RIPEN_AFTER) / APPLE_RIPEN_SEC)
  const width = pic.w * s
  const height = pic.h * s
  const swing = fruit.swingAngle ?? 0
  if (swing === 0) {
    const pos = k.vec2(fruit.x + pic.dx * s, fruit.y + pic.dy)
    ripe < 1 && k.drawSprite({ sprite: pic.unripe, pos, width, height, opacity: fade })
    ripe > 0 && k.drawSprite({ sprite: pic.sprite, pos, width, height, opacity: fade * ripe })
    return
  }
  //
  // Swinging: turned round its stem, the top of the picture over the apple.
  //
  const pos = k.vec2(fruit.x, fruit.y + pic.dy)
  const anchor = k.vec2(-2 * pic.dx / pic.w - 1, -1)
  const angle = swing * RAD_TO_DEG
  ripe < 1 && k.drawSprite({ sprite: pic.unripe, pos, anchor, angle, width, height, opacity: fade })
  ripe > 0 && k.drawSprite({ sprite: pic.sprite, pos, anchor, angle, width, height, opacity: fade * ripe })
}
//
// Size share of a growing apple: an ease-out that goes a little past full
// size and settles back.
//
function appleGrowScale(age) {
  const u = clamp01(age / APPLE_GROW_SEC) - 1
  const ease = 1 + (APPLE_GROW_OVERSHOOT + 1) * u * u * u + APPLE_GROW_OVERSHOOT * u * u
  return APPLE_GROW_FROM + (1 - APPLE_GROW_FROM) * ease
}
//
// Sprouts due apples and ages the ones on the tree.
//
function growTreeApples(levelInst, dt) {
  const crop = levelInst.treeApples
  if (!crop) return
  const { sprouts } = crop
  let left = 0
  for (const due of sprouts) {
    const t = due - dt
    t > 0 ? (sprouts[left++] = t) : sproutTreeApple(levelInst, 0)
  }
  sprouts.length = left
  levelInst.treeFruitSpots.forEach(f => f.attached && (f.age = Math.min(APPLE_RIPE_AGE, f.age + dt)))
  levelInst.treeFruitSpots.forEach(f => f.attached && f.swingVel != null && stepAppleSwing(f, dt))
}
//
// A swinging apple is a damped pendulum round its stem; once it has all
// but stopped it hangs still again.
//
function stepAppleSwing(fruit, dt) {
  const accel = -APPLE_SWING_STIFFNESS * fruit.swingAngle - APPLE_SWING_DAMPING * fruit.swingVel
  fruit.swingVel += accel * dt
  fruit.swingAngle += fruit.swingVel * dt
  if (Math.abs(fruit.swingAngle) > APPLE_SWING_REST || Math.abs(fruit.swingVel) > APPLE_SWING_REST) return
  fruit.swingAngle = 0
  fruit.swingVel = null
}
//
// The ripe apple the start branch knocks off next (the oldest one).
//
function nextAnchorFruit(levelInst) {
  return levelInst.treeFruitSpots?.find(isRipeTreeApple) ?? null
}
//
// A new apple on the first free hang, already this old.
//
function sproutTreeApple(levelInst, age) {
  const { hangs, picture } = levelInst.treeApples
  const spots = levelInst.treeFruitSpots
  const slot = hangs.findIndex((_, i) => !spots.some(f => f.attached && f.slot === i))
  if (slot < 0) return
  const { x, y, r } = hangs[slot]
  spots.push({ attached: true, slot, x, y, r, picture, age })
}
function isRipeTreeApple(fruit) {
  return fruit.attached && fruit.age >= APPLE_RIPE_AGE
}
function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}
//
// The fruit's picture with its bites cut out, re-baked only when a new bite
// is taken (a handful of times per apple).
//
function bittenPicture(k, fruit) {
  const marks = fruit.biteMarks ?? []
  const version = fruit.biteVersion ?? 0
  if (!version) return fruit.picture.sprite
  if (fruit._bitten?.version === version) return fruit._bitten.sprite
  const src = fruit.picture.canvas
  const canvas = document.createElement('canvas')
  canvas.width = src.width
  canvas.height = src.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(src, 0, 0)
  const scale = src.width / fruit.picture.w
  const cx = -fruit.picture.dx * scale
  const cy = -fruit.picture.dy * scale
  Object.entries(fruit.biteLines ?? {}).forEach(([side, at]) => cutPastLine(ctx, cx, Number(side), at * scale, canvas.width))
  marks.forEach(mark => cutBite(ctx, cx + mark.x * scale, cy + mark.y * scale, mark.r * scale))
  const sprite = `${fruit.picture.sprite}-bitten-${fruit.biteSeed ?? 0}-${version}`
  k.loadSprite(sprite, canvas)
  fruit._bitten = { version, sprite }
  return sprite
}
//
// Bite side of a direction: 1 = right, -1 = left.
//
function sideOf(angle) {
  return Math.cos(angle) >= 0 ? 1 : -1
}
//
// How far what is left of a picture fruit reaches toward a side: its body
// past the bites, no further than that side's cut line.
//
function sideReach(fruit, side) {
  return Math.min(fruitFront(fruit, side).front, fruit.biteLines?.[side] ?? Infinity)
}
//
// Everything of the picture past the front line on the eater's side.
//
function cutPastLine(ctx, cx, side, at, width) {
  const x = cx + side * at
  ctx.clearRect(side > 0 ? x : 0, 0, side > 0 ? width - x : x, ctx.canvas.height)
}
//
// One round bite cut out of the picture, the pale flesh showing along its
// edge on what is left.
//
function cutBite(ctx, x, y, r) {
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-atop'
  const flesh = forestRgb(FOREST_PAL.forestTreeFruit.light)
  ctx.strokeStyle = `rgb(${flesh.r}, ${flesh.g}, ${flesh.b})`
  ctx.lineWidth = BITE_FLESH_W * 2
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}
//
// What is left of a picture fruit's body, sampled on a grid (offsets from
// its centre): how far it reaches toward a side (along x), counting only
// rows between y1 and y2 (all of it by default); -r once nothing is left.
//
function fruitFront(fruit, side, y1 = -Infinity, y2 = Infinity) {
  const r = fruit.r
  const bites = fruit.biteMarks ?? []
  let front = -r
  for (let i = 0; i <= BITE_GRID; i++) {
    for (let j = 0; j <= BITE_GRID; j++) {
      const x = (i / BITE_GRID * 2 - 1) * r
      const y = (j / BITE_GRID * 2 - 1) * r * BITE_SQUASH_Y
      if (y < y1 || y > y2 || x * side <= front) continue
      if ((x / r) ** 2 + (y / (r * BITE_SQUASH_Y)) ** 2 > 1) continue
      if (bites.some(b => (x - b.x) ** 2 + (y - b.y) ** 2 < b.r * b.r)) continue
      front = x * side
    }
  }
  return { front }
}
//
// Radius a drawn (not picture) fruit is shown at.
//
function fruitDisplayRadius(fruit) {
  return getForestFruitDisplayRadius(fruit)
}

function drawFruitBody(k, fruit, col, shadeCol, contourCol, op) {
  const r = fruitDisplayRadius(fruit)
  if (r < 1.2) return
  const bites = fruit.biteCount ?? 0
  const eaten = (fruit.eatProgress ?? 0) > 0.02 || bites > 0
  if (eaten) {
    const pts = buildRaggedFruitPolygon(k, fruit.x, fruit.y, r, fruit.biteMarks ?? [], fruit.biteSeed ?? 0)
    pts.length >= 3 && k.drawPolygon({ pts, color: shadeCol, opacity: op })
    const litX = fruit.x + r * FOREST_SUN_LIT_OFFSET_X
    const litY = fruit.y + r * FOREST_SUN_LIT_OFFSET_Y
    const litPts = buildRaggedFruitPolygon(k, litX, litY, r * FOREST_SUN_LIT_FRAC, fruit.biteMarks ?? [], fruit.biteSeed ?? 0)
    litPts.length >= 3 && k.drawPolygon({ pts: litPts, color: col, opacity: op })
    return
  }
  k.drawCircle({
    pos: k.vec2(fruit.x, fruit.y),
    radius: r + FRUIT_CONTOUR_W,
    color: contourCol,
    opacity: op
  })
  k.drawCircle({
    pos: k.vec2(fruit.x, fruit.y),
    radius: r,
    color: shadeCol,
    opacity: op
  })
  k.drawCircle({
    pos: k.vec2(fruit.x + r * FOREST_SUN_LIT_OFFSET_X, fruit.y + r * FOREST_SUN_LIT_OFFSET_Y),
    radius: r * FOREST_SUN_LIT_FRAC,
    color: col,
    opacity: op
  })
}

function buildRaggedFruitPolygon(k, cx, cy, r, biteMarks, seed) {
  const steps = 16
  const pts = []
  for (let i = 0; i < steps; i++) {
    const a = (Math.PI * 2 * i) / steps
    let rr = r
    biteMarks.forEach(mark => {
      let da = a - mark.angle
      while (da > Math.PI) da -= Math.PI * 2
      while (da < -Math.PI) da += Math.PI * 2
      if (Math.abs(da) < mark.width) {
        rr *= 1 - mark.depth
      }
    })
    const wobble = (((seed + i * 17) % 97) / 97 - 0.5) * r * 0.06
    pts.push(k.vec2(cx + Math.cos(a) * (rr + wobble), cy + Math.sin(a) * (rr + wobble) * 0.92))
  }
  return pts
}

//
// Short stem from the twig tip to the top of the fruit, contoured like it.
//
function drawFruitStem(k, fruit, stemCol, contourCol, op) {
  const sx = fruit.stemX ?? fruit.x
  const sy = fruit.stemY ?? fruit.y - fruit.r - FRUIT_STEM_LEN
  const dx = sx - fruit.x
  const dy = sy - fruit.y
  const len = Math.hypot(dx, dy) || 1
  const p1 = k.vec2(fruit.x + dx / len * fruit.r * 0.8, fruit.y + dy / len * fruit.r * 0.8)
  const p2 = k.vec2(sx, sy)
  k.drawLine({ p1, p2, width: FRUIT_STEM_W + FRUIT_STEM_CONTOUR_W * 2, color: contourCol, opacity: op })
  k.drawLine({ p1, p2, width: FRUIT_STEM_W, color: stemCol, opacity: op })
}


function leafRgbFromShadeIdx(shadeIdx) {
  const shades = FOREST_PAL.treeColor.leafShades || [FOREST_PAL.treeColor.leaf]
  const i = ((shadeIdx ?? 0) % shades.length + shades.length) % shades.length
  return forestRgb(shades[i])
}

function stepFallingFruit(fruit, dt, floorY, levelInst) {
  const restY = floorY - fruit.r + FRUIT_GROUND_SINK
  fruit.vx = fruit.vx ?? 0
  if (fruit.airborne == null) fruit.airborne = true
  if (fruit.airborne) {
    fruit.vy = (fruit.vy ?? 0) + FRUIT_FALL_GRAVITY * dt
    fruit.y += fruit.vy * dt
    if (fruit.y >= restY && fruit.vy >= 0) {
      fruit.y = restY
      fruit._restFloorY = restY + fruit.r - FRUIT_GROUND_SINK
      fruit.fromAnchorDrop && !fruit._anchorFallSoundPlayed &&
        levelInst?.sound &&
        (fruit._anchorFallSoundPlayed = true, Sound.playForestAppleSoftFall(levelInst.sound))
      const nextVy = applyFruitGroundImpact(fruit, fruit.vy)
      fruit.vy = nextVy
      fruit.airborne = nextVy !== 0
    }
    return
  }
  fruit.y = restY
  fruit._restFloorY == null && (fruit._restFloorY = restY + fruit.r - FRUIT_GROUND_SINK)
  fruit.vy = 0
  fruit.x += fruit.vx * dt
  fruit.vx = decayFruitRollSpeed(fruit.vx, dt)
  if (Math.abs(fruit.vx) < FRUIT_SETTLE_VX) {
    fruit.vx = 0
    fruit.settled = true
    levelInst && nudgeForestFruitClearOfRightTramp(levelInst, fruit)
  }
}

function nudgeForestFruitClearOfRightTramp(levelInst, fruit) {
  const trampX = levelInst.trampState?.x
  if (trampX == null) return
  const r = getForestFruitDisplayRadius(fruit)
  const capHalf = FOREST_RIGHT_TRAMP_CAP_HALF
  const blockMin = trampX - capHalf - r - 10
  const blockMax = trampX + FOREST_FRUIT_TRAMP_HIDE_X_MAX
  if (fruit.x < blockMin || fruit.x > blockMax) return
  const lakeX1 = levelInst.lakeX1 ?? 0
  fruit.x = Math.max(lakeX1 + 52, trampX - capHalf - r - FOREST_FRUIT_TRAMP_ROLL_CLEAR)
  fruit.vx = -Math.max(Math.abs(fruit.vx ?? 0), FRUIT_LAND_ROLL_SPEED * 0.65)
  fruit.rollDir = -1
  fruit.settled = false
  fruit.airborne = false
}

function applyFruitGroundImpact(fruit, impactVy) {
  const bounceN = fruit.bounceCount ?? 0
  if (impactVy >= FRUIT_BOUNCE_MIN_VY && bounceN < FRUIT_BOUNCE_MAX_COUNT) {
    const rest = bounceN === 0 ? FRUIT_BOUNCE_RESTITUTION_FIRST : FRUIT_BOUNCE_RESTITUTION_SECOND
    if (bounceN === 0) {
      const roll = (fruit.rollDir ?? 1) * FRUIT_LAND_ROLL_SPEED * Math.min(1.15, impactVy / 420)
      fruit.vx = (fruit.vx ?? 0) + roll
    }
    fruit.bounceCount = bounceN + 1
    return -impactVy * rest
  }
  if (bounceN === 0 && Math.abs(fruit.vx ?? 0) < 8) {
    fruit.vx = (fruit.vx ?? 0) + (fruit.rollDir ?? 1) * FRUIT_LAND_ROLL_SPEED * 0.45
  }
  return 0
}

function decayFruitRollSpeed(vx, dt) {
  const fr = FRUIT_ROLL_FRICTION * dt
  if (vx > 0) return Math.max(0, vx - fr)
  if (vx < 0) return Math.min(0, vx + fr)
  return 0
}

function pickFruitLandRollDir(x, y) {
  const h = mulberry32((Math.round(x * 2.7) ^ Math.round(y * 4.1)) >>> 0)()
  return h < 0.42 ? -1 : 1
}


function drawFruitLeaf(k, x, y, size, angle, rgb, op) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const rot = (lx, ly) => k.vec2(x + lx * cos - ly * sin, y + lx * sin + ly * cos)
  const pts = [
    rot(0, 0),
    rot(-size * 0.62, -size * 0.32),
    rot(0, -size),
    rot(size * 0.62, -size * 0.32)
  ]
  k.drawPolygon({ pts, color: k.rgb(rgb.r, rgb.g, rgb.b), opacity: op })
}

function lerpRgb(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t)
  }
}

function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6D2B79F5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
