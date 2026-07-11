import { CFG } from '../../../cfg.js'
import * as Sound from '../../../utils/sound.js'
import { drawCrow } from '../../../utils/crow.js'

//
// Frozen lake band on the left (world coords relative to draw origin at 0,0)
//
const L2_LAKE_EDGE_PAD = 28
//
// Equal pads place the ellipse centre exactly at floorY so the widest
// (left/right) edge of the oval lies precisely on the platform line.
//
const L2_LAKE_VERTICAL_PAD_TOP = 12
const L2_LAKE_VERTICAL_PAD_BOTTOM = 12
const L2_STAR_COUNT = 56
const L2_STAR_TWINKLE_SPEED_MIN = 0.35
const L2_STAR_TWINKLE_SPEED_MAX = 1.1
const L2_SNOWMAN_BODY_R = 28
const L2_SNOWMAN_HEAD_R = 18
const L2_SNOWMAN_STACK_GAP = 6
//
// Snowman stands to the right side of the first log pile, in front of it.
//
const L2_SNOWMAN_LOG_OFFSET_X = 140
//
// Wildlife timer ranges (in seconds)
//
const L2_CROW_INTERVAL_MIN = 4
const L2_CROW_INTERVAL_MAX = 10
const L2_OWL_INTERVAL_MIN = 22
const L2_OWL_INTERVAL_MAX = 48
const L2_AMBIENCE_Z = 1
//
// Lake renders above the floor platform (CFG.visual.zIndex.platform = 1) but BELOW
// the hero (CFG.visual.zIndex.player = 10) so the hero appears in front of the ice.
//
const L2_DECOR_ABOVE_PLATFORMS_Z = 17
//
// Lake sun glints: small bright ovals on ice surface animated by sine
//
const L2_SUN_GLINT_COUNT = 6
const L2_SNOWMAN_Z = 18

/**
 * Stars, frozen lake, snowman with tracking eyes, animated crow on right logs, distant crow/owl ambience.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.floorY - Floor line Y
 * @param {number} cfg.leftMargin
 * @param {number} cfg.rightMargin
 * @param {number} cfg.topMargin - Upper game inset (sky band starts below this)
 * @param {Object} cfg.heroInst - Hero instance (eyes track position)
 * @param {Object|null} cfg.sound - Sound instance
 * @param {number} [cfg.logPileX] - X center of first decorative log pile (snowman placed beside it)
 * @param {number} [cfg.rightLogPileX] - X center of the right log pile (crow perches here)
 * @param {Object} [cfg.lakeState] - Mutable quest state { crackProgress, melted, meltFade }
 * @param {Object} [cfg.snowmanState] - Mutable quest state { collapsed, collapseTime }
 * @returns {{ lakeBounds, stopWildlife, snowmanX }}
 */
export function setupTouchLevel2Ambience(cfg) {
  const { k, floorY, leftMargin, rightMargin, topMargin, heroInst, sound, logPileX, rightLogPileX, lakeState, snowmanState } = cfg
  const lakeBounds = computeLakeBounds(floorY, leftMargin)
  addTwinklingStars(k, floorY, leftMargin, rightMargin, topMargin)
  addFrozenLake(k, lakeBounds, lakeState)
  const crowAnimState = { mouthOpen: false, mouthTimer: 0 }
  const snowmanX = addWatchingSnowman(k, heroInst, floorY, rightMargin, logPileX, snowmanState)
  const crowInfo = addCrowOnLogs(k, floorY, rightLogPileX, crowAnimState, heroInst)
  const stopWildlife = startDistantWildlifeTimers(k, sound, crowAnimState)
  return { lakeBounds, stopWildlife, snowmanX, crowInfo }
}

/**
 * Computes frozen lake bounding box.
 * Exported so callers (e.g. level2.js) can exclude the lake area from snow drifts.
 * @param {number} floorY
 * @param {number} leftMargin
 * @returns {{ minX, maxX, topY, botY }}
 */
export function getLakeBounds(floorY, leftMargin) {
  return computeLakeBounds(floorY, leftMargin)
}

/**
 * Computes the snowman's world X the same way setup places it.
 * Exported so the level can exclude decor (fir trees) around icicle bands.
 * @param {number} [logPileX] - X center of the first decorative log pile
 * @param {number} rightMargin
 * @returns {number} Snowman center X
 */
export function getSnowmanX(logPileX, rightMargin) {
  const fallbackX = CFG.visual.screen.width - rightMargin - 200
  return logPileX != null ? logPileX + L2_SNOWMAN_LOG_OFFSET_X : fallbackX
}

const L2_LAKE_WIDTH = 440

function computeLakeBounds(floorY, leftMargin) {
  const minX = leftMargin + L2_LAKE_EDGE_PAD
  const maxX = minX + L2_LAKE_WIDTH
  const topY = floorY - L2_LAKE_VERTICAL_PAD_TOP
  const botY = floorY + L2_LAKE_VERTICAL_PAD_BOTTOM
  return { minX, maxX, topY, botY }
}

function addTwinklingStars(k, floorY, leftMargin, rightMargin, topMargin) {
  const stars = []
  const skyBottom = floorY - 140
  const skyTop = topMargin + 28
  for (let i = 0; i < L2_STAR_COUNT; i++) {
    stars.push({
      x: leftMargin + 30 + Math.random() * (CFG.visual.screen.width - leftMargin - rightMargin - 60),
      y: skyTop + Math.random() * Math.max(40, skyBottom - skyTop),
      r: 0.6 + Math.random() * 1.35,
      phase: Math.random() * Math.PI * 2,
      speed: L2_STAR_TWINKLE_SPEED_MIN + Math.random() * (L2_STAR_TWINKLE_SPEED_MAX - L2_STAR_TWINKLE_SPEED_MIN),
      //
      // peak: maximum brightness; sin oscillation passes through zero so star can fully vanish.
      //
      peak: 0.55 + Math.random() * 0.40
    })
  }
  k.add([
    k.z(L2_AMBIENCE_Z),
    {
      draw() {
        const t = k.time()
        for (const s of stars) {
          //
          // Sin passes from -1 to +1; mapping to [0,1] lets the star fully disappear.
          //
          const tw = ((Math.sin(t * s.speed + s.phase) + 1) * 0.5) * s.peak
          k.drawCircle({
            pos: k.vec2(s.x, s.y),
            radius: s.r,
            color: k.rgb(245, 248, 255),
            opacity: tw
          })
        }
      }
    }
  ])
}

//
// Quest ice cracking / melting visuals
//
const L2_CRACK_COUNT = 18
const L2_CRACK_SEGMENTS_MIN = 3
const L2_CRACK_SEGMENTS_MAX = 6
const L2_CRACK_SEGMENT_LEN_MIN = 12
const L2_CRACK_SEGMENT_LEN_MAX = 30
const L2_CRACK_FADE_WINDOW = 0.06
const L2_MELT_FADE_DURATION = 1.2
const L2_FREEZE_FADE_DURATION = 1.6
function addFrozenLake(k, bounds, lakeState) {
  const { minX, maxX, topY, botY } = bounds
  const midY = (topY + botY) / 2
  const rx = (maxX - minX) / 2
  const ry = (botY - topY) / 2 + 4
  const cx = (minX + maxX) / 2
  //
  // Fallback state for callers without the quest (never mutated back)
  //
  const state = lakeState ?? { crackProgress: 0, melted: false, meltFade: 0 }
  //
  // Sun glints: random positions inside the lake, each with its own phase/speed
  //
  const glints = []
  for (let i = 0; i < L2_SUN_GLINT_COUNT; i++) {
    const gAngle = Math.random() * Math.PI * 2
    const gDist = Math.sqrt(Math.random())
    glints.push({
      x: cx + Math.cos(gAngle) * rx * 0.78 * gDist,
      y: midY + Math.sin(gAngle) * ry * 0.62 * gDist,
      rx: 5 + Math.random() * 14,
      ry: 2 + Math.random() * 4,
      phase: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 1.4
    })
  }
  //
  // Pre-generated jagged quest cracks: each crack has a reveal threshold so
  // more cracks show up as crackProgress grows
  //
  const cracks = generateLakeCracks(cx, midY, rx, ry)
  k.add([
    k.z(L2_DECOR_ABOVE_PLATFORMS_Z),
    {
      draw() {
        //
        // Advance the melt/refreeze cross-fade toward the quest state
        //
        const dt = k.dt()
        if (state.melted && state.meltFade < 1) {
          state.meltFade = Math.min(1, state.meltFade + dt / L2_MELT_FADE_DURATION)
        } else if (!state.melted && state.meltFade > 0) {
          state.meltFade = Math.max(0, state.meltFade - dt / L2_FREEZE_FADE_DURATION)
        }
        const iceAlpha = 1 - state.meltFade
        const waterAlpha = state.meltFade
        //
        // Open water: calm dark surface, no wave stripes — just a soft
        // depth gradient and the pulsing glints
        //
        if (waterAlpha > 0) {
          fillEllipse(k, cx, midY, rx * 1.02, ry * 0.92, k.rgb(38, 88, 146), 0.92 * waterAlpha)
          fillEllipse(k, cx, midY + 1, rx * 0.8, ry * 0.6, k.rgb(28, 66, 116), 0.7 * waterAlpha)
          strokeEllipse(k, cx, midY, rx * 1.02, ry * 0.92, k.rgb(70, 122, 182), 0.7 * waterAlpha, 2)
        }
        //
        // Frozen surface (fades out while the lake melts)
        //
        if (iceAlpha > 0) {
          fillEllipse(k, cx, midY, rx * 1.02, ry * 0.92, k.rgb(128, 180, 238), 0.82 * iceAlpha)
          fillEllipse(k, cx - rx * 0.08, midY - 3, rx * 0.88, ry * 0.72, k.rgb(185, 220, 255), 0.55 * iceAlpha)
          strokeEllipse(k, cx, midY, rx * 1.02, ry * 0.92, k.rgb(95, 148, 210), 0.72 * iceAlpha, 2)
          //
          // Hairline crack always present on the ice
          //
          k.drawLine({
            p1: k.vec2(cx - rx * 0.35, midY + ry * 0.15),
            p2: k.vec2(cx + rx * 0.22, midY - ry * 0.05),
            width: 1,
            color: k.rgb(140, 178, 212),
            opacity: 0.35 * iceAlpha
          })
          drawLakeCracks(k, cracks, state.crackProgress, iceAlpha)
        }
        //
        // Animated sun glints: bright ovals that pulse softly (dimmer on water)
        //
        const t = k.time()
        const glintScale = 1 - state.meltFade * 0.55
        for (const g of glints) {
          const alpha = (0.18 + 0.32 * (Math.sin(t * g.speed + g.phase) * 0.5 + 0.5)) * glintScale
          fillEllipse(k, g.x, g.y, g.rx, g.ry, k.rgb(248, 255, 255), alpha)
        }
      }
    }
  ])
}
//
// Builds jagged crack polylines scattered over the ice. Cracks are sorted
// by reveal threshold: crack i shows once crackProgress passes i/count.
//
function generateLakeCracks(cx, midY, rx, ry) {
  const cracks = []
  for (let i = 0; i < L2_CRACK_COUNT; i++) {
    const startAngle = Math.random() * Math.PI * 2
    const startDist = Math.sqrt(Math.random()) * 0.7
    let x = cx + Math.cos(startAngle) * rx * startDist
    let y = midY + Math.sin(startAngle) * ry * startDist * 0.7
    let dir = Math.random() * Math.PI * 2
    const pts = [{ x, y }]
    const segments = L2_CRACK_SEGMENTS_MIN + Math.floor(Math.random() * (L2_CRACK_SEGMENTS_MAX - L2_CRACK_SEGMENTS_MIN + 1))
    for (let s = 0; s < segments; s++) {
      const len = L2_CRACK_SEGMENT_LEN_MIN + Math.random() * (L2_CRACK_SEGMENT_LEN_MAX - L2_CRACK_SEGMENT_LEN_MIN)
      dir += (Math.random() - 0.5) * 1.2
      x += Math.cos(dir) * len
      //
      // Vertical spread squashed so cracks follow the flat lake perspective
      //
      y += Math.sin(dir) * len * 0.22
      pts.push({ x, y })
    }
    cracks.push({ pts, threshold: i / L2_CRACK_COUNT })
  }
  return cracks
}
//
// Draws the quest cracks revealed so far; each crack fades in over a small
// progress window so refreezing reads as cracks gradually disappearing
//
function drawLakeCracks(k, cracks, progress, iceAlpha) {
  for (const crack of cracks) {
    const reveal = Math.max(0, Math.min(1, (progress - crack.threshold) / L2_CRACK_FADE_WINDOW))
    if (reveal <= 0) continue
    for (let i = 0; i < crack.pts.length - 1; i++) {
      k.drawLine({
        p1: k.vec2(crack.pts[i].x, crack.pts[i].y),
        p2: k.vec2(crack.pts[i + 1].x, crack.pts[i + 1].y),
        width: 1.4,
        color: k.rgb(58, 96, 140),
        opacity: 0.65 * reveal * iceAlpha
      })
    }
  }
}

//
// Snowman collapse physics
//
const L2_SNOWMAN_GRAVITY = 980
const L2_SNOWMAN_BOUNCE = 0.38
const L2_SNOWMAN_FRICTION = 0.82
const L2_SNOWMAN_SETTLE_SPEED = 28
//
// Mid ball kicks sideways hard; head falls with a lighter lateral nudge
//
const L2_SNOWMAN_MID_VX = 220
const L2_SNOWMAN_MID_VY = -160
const L2_SNOWMAN_HEAD_VX = 55
const L2_SNOWMAN_HEAD_VY = -90
function addWatchingSnowman(k, heroInst, floorY, rightMargin, logPileX, snowmanState) {
  const footY = floorY - 4
  //
  // Place snowman to the right of the first log pile (or a fallback X).
  //
  const cx = getSnowmanX(logPileX, rightMargin)
  const snowmanX = cx
  const baseY = footY - L2_SNOWMAN_BODY_R
  const midY = baseY - L2_SNOWMAN_BODY_R - L2_SNOWMAN_STACK_GAP
  const headY = midY - L2_SNOWMAN_HEAD_R - L2_SNOWMAN_STACK_GAP
  //
  // Fallback state for callers without the quest
  //
  const state = snowmanState ?? { collapsed: false, collapseTime: 0 }
  k.add([
    k.z(L2_SNOWMAN_Z),
    {
      draw() {
        //
        // Collapsed: stacked balls tumble with gravity and settle on the snow
        //
        if (state.collapsed) {
          state.collapseTime = Math.min(state.collapseTime + k.dt(), 10)
          drawCollapsedSnowman(k, cx, footY, state)
          return
        }
        //
        // Branch arms — left and right sticks with two twigs each.
        //
        const armY = midY + 2
        const armLen = 36
        const armSpread = 14
        //
        // Stick-arm colour: warm amber/burnt-umber so the twigs read
        // clearly against the new teal background (the previous near-
        // black brown disappeared into the cool BG). Also doubles as a
        // small warm complementary accent next to the snowman's white
        // body and the cold teal sky.
        //
        const armColor = k.rgb(176, 104, 54)
        for (const armSide of [-1, 1]) {
          const armEndX = cx + armSide * (L2_SNOWMAN_BODY_R * 0.72 + armLen)
          const armEndY = armY - 8
          k.drawLine({
            p1: k.vec2(cx + armSide * L2_SNOWMAN_BODY_R * 0.68, armY),
            p2: k.vec2(armEndX, armEndY),
            width: 2.5,
            color: armColor,
            opacity: 1
          })
          //
          // Two short twigs branching from the arm tip
          //
          k.drawLine({
            p1: k.vec2(armEndX, armEndY),
            p2: k.vec2(armEndX + armSide * 10, armEndY - armSpread),
            width: 1.5,
            color: armColor,
            opacity: 1
          })
          k.drawLine({
            p1: k.vec2(armEndX, armEndY),
            p2: k.vec2(armEndX + armSide * 14, armEndY + 4),
            width: 1.5,
            color: armColor,
            opacity: 1
          })
        }
        k.drawCircle({
          pos: k.vec2(cx, baseY),
          radius: L2_SNOWMAN_BODY_R,
          color: k.rgb(248, 252, 255),
          opacity: 1
        })
        k.drawCircle({
          pos: k.vec2(cx, midY),
          radius: L2_SNOWMAN_BODY_R * 0.72,
          color: k.rgb(242, 248, 252),
          opacity: 1
        })
        k.drawCircle({
          pos: k.vec2(cx, headY),
          radius: L2_SNOWMAN_HEAD_R,
          color: k.rgb(252, 254, 255),
          opacity: 1
        })
        //
        // Eyes track hero (same idea as hanging spider, simplified).
        //
        const hx = heroInst?.character?.pos?.x ?? cx
        const hy = heroInst?.character?.pos?.y ?? headY
        const dx = hx - cx
        const dy = hy - headY
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const maxOff = 2.1
        const pupDx = (dx / dist) * maxOff
        const pupDy = (dy / dist) * maxOff
        const eyeGap = 10
        for (const side of [-1, 1]) {
          const ex = cx + side * eyeGap * 0.5
          const ey = headY - 2
          //
          // Black outline ring, white fill, black pupil — classic snowman eye.
          //
          k.drawCircle({
            pos: k.vec2(ex, ey),
            radius: 6.0,
            color: k.rgb(18, 18, 20),
            opacity: 1
          })
          k.drawCircle({
            pos: k.vec2(ex, ey),
            radius: 4.2,
            color: k.rgb(252, 254, 255),
            opacity: 1
          })
          k.drawCircle({
            pos: k.vec2(ex + pupDx * 0.5, ey + pupDy * 0.5),
            radius: 2.4,
            color: k.rgb(18, 18, 20),
            opacity: 1
          })
        }
        //
        // Carrot nose — orange triangle with a rounded base where it meets the head.
        //
        k.drawTriangle({
          p1: k.vec2(cx, headY + 3),
          p2: k.vec2(cx + 26, headY + 7),
          p3: k.vec2(cx, headY + 13),
          color: k.rgb(235, 128, 48),
          opacity: 1
        })
        k.drawCircle({
          pos: k.vec2(cx, headY + 8),
          radius: 5.4,
          color: k.rgb(235, 128, 48),
          opacity: 1
        })
      }
    }
  ])
  return snowmanX
}
//
// Spawns physics bodies for the three snowballs when the snowman first collapses.
// Mid ball gets a strong sideways kick; head falls with a lighter nudge.
//
function initSnowmanCollapsePieces(state, cx, footY) {
  if (state.pieces) return
  const bodyR = L2_SNOWMAN_BODY_R
  const headR = L2_SNOWMAN_HEAD_R
  const midR = bodyR * 0.72
  const baseY = footY - bodyR
  const midY0 = baseY - bodyR - L2_SNOWMAN_STACK_GAP
  const headY0 = midY0 - headR - L2_SNOWMAN_STACK_GAP
  //
  // Already-settled resume: skip the fall and place pieces on the ground
  //
  if (state.collapseTime >= 2) {
    state.pieces = {
      base: { x: cx, y: footY - bodyR * 0.55, vx: 0, vy: 0, r: bodyR, flatten: 1, settled: true },
      mid: { x: cx + 52, y: footY - midR * 0.85, vx: 0, vy: 0, r: midR, rot: 0.6, rotVel: 0, settled: true },
      head: { x: cx + 96, y: footY - headR * 0.9, vx: 0, vy: 0, r: headR, rot: 0.4, rotVel: 0, settled: true }
    }
    return
  }
  state.pieces = {
    //
    // Base stays put and flattens into a mound (heavy, no lateral kick)
    //
    base: { x: cx, y: baseY, vx: 0, vy: 0, r: bodyR, flatten: 0, settled: false },
    //
    // Mid ball kicks sideways off the stack
    //
    mid: {
      x: cx,
      y: midY0,
      vx: L2_SNOWMAN_MID_VX,
      vy: L2_SNOWMAN_MID_VY,
      r: midR,
      rot: 0,
      rotVel: 5.5,
      settled: false
    },
    head: {
      x: cx,
      y: headY0,
      vx: L2_SNOWMAN_HEAD_VX,
      vy: L2_SNOWMAN_HEAD_VY,
      r: headR,
      rot: 0,
      rotVel: 3.2,
      settled: false
    }
  }
}
//
// Integrates one snowball under gravity until it settles on the floor
//
function stepSnowmanPiece(piece, footY, dt, massScale) {
  if (piece.settled) return
  const floorY = footY - piece.r * (piece.flatten != null ? (1 - 0.45 * piece.flatten) : 0.9)
  piece.vy += L2_SNOWMAN_GRAVITY * massScale * dt
  piece.x += piece.vx * dt
  piece.y += piece.vy * dt
  piece.rot != null && (piece.rot += (piece.rotVel || 0) * dt)
  if (piece.y >= floorY) {
    piece.y = floorY
    if (Math.abs(piece.vy) > L2_SNOWMAN_SETTLE_SPEED) {
      piece.vy *= -L2_SNOWMAN_BOUNCE
      piece.vx *= L2_SNOWMAN_FRICTION
      piece.rotVel != null && (piece.rotVel *= L2_SNOWMAN_FRICTION)
    } else {
      piece.vy = 0
      piece.vx *= 0.9
      Math.abs(piece.vx) < 8 && (piece.vx = 0)
      piece.rotVel != null && (piece.rotVel *= 0.85)
      Math.abs(piece.rotVel || 0) < 0.15 && piece.vx === 0 && (piece.settled = true)
    }
  }
  //
  // Base mound slowly flattens while it rests
  //
  if (piece.flatten != null && piece.y >= floorY - 1) {
    piece.flatten = Math.min(1, piece.flatten + dt * 1.4)
    piece.vx = 0
    piece.vy = 0
    piece.flatten >= 1 && (piece.settled = true)
  }
}
//
// Draws the collapsed snowman using per-piece gravity simulation: the mid
// ball kicks sideways, the head tumbles after it, the base flattens in place.
//
function drawCollapsedSnowman(k, cx, footY, state) {
  initSnowmanCollapsePieces(state, cx, footY)
  const dt = Math.min(k.dt(), 0.05)
  const { base, mid, head } = state.pieces
  //
  // Base is heaviest; mid/head fall at full gravity
  //
  stepSnowmanPiece(base, footY, dt, 1.35)
  stepSnowmanPiece(mid, footY, dt, 1)
  stepSnowmanPiece(head, footY, dt, 0.85)
  //
  // Base ball flattens into a snow mound
  //
  const baseRx = base.r * (1 + 0.35 * base.flatten)
  const baseRy = base.r * (1 - 0.45 * base.flatten)
  fillEllipse(k, base.x, footY - baseRy, baseRx, baseRy, k.rgb(248, 252, 255), 1)
  //
  // Mid ball (kicked sideways)
  //
  const midSquash = mid.settled ? 0.85 : 1
  fillEllipse(k, mid.x, mid.y, mid.r, mid.r * midSquash, k.rgb(242, 248, 252), 1)
  //
  // Head with eyes + sideways carrot
  //
  k.drawCircle({
    pos: k.vec2(head.x, head.y),
    radius: head.r,
    color: k.rgb(252, 254, 255),
    opacity: 1
  })
  const eyeGap = 10
  for (const side of [-1, 1]) {
    const ex = head.x + side * eyeGap * 0.5
    const ey = head.y - 2
    k.drawCircle({ pos: k.vec2(ex, ey), radius: 6.0, color: k.rgb(18, 18, 20), opacity: 1 })
    k.drawCircle({ pos: k.vec2(ex, ey), radius: 4.2, color: k.rgb(252, 254, 255), opacity: 1 })
    k.drawCircle({ pos: k.vec2(ex, ey + 1.4), radius: 2.4, color: k.rgb(18, 18, 20), opacity: 1 })
  }
  k.drawTriangle({
    p1: k.vec2(head.x + head.r * 0.4, head.y + 2),
    p2: k.vec2(head.x + head.r * 0.4 + 22, head.y - 10),
    p3: k.vec2(head.x + head.r * 0.4 + 4, head.y + 10),
    color: k.rgb(235, 128, 48),
    opacity: 1
  })
  //
  // Stick arms lie flat on the snow at both sides of the mound
  //
  const armColor = k.rgb(176, 104, 54)
  const armFade = Math.min(1, state.collapseTime * 2)
  for (const armSide of [-1, 1]) {
    const ax0 = base.x + armSide * baseRx * 0.7
    const ax1 = base.x + armSide * (baseRx * 0.7 + 34)
    const ay = footY - 2
    k.drawLine({ p1: k.vec2(ax0, ay), p2: k.vec2(ax1, ay), width: 2.5, color: armColor, opacity: armFade })
    k.drawLine({ p1: k.vec2(ax1, ay), p2: k.vec2(ax1 + armSide * 10, ay - 5), width: 1.5, color: armColor, opacity: armFade })
  }
}

const L2_CROW_MP3_VOLUME = 0.9
const L2_CROW_MP3_NAMES = ['crow0']

//
// How long the crow's beak stays open after a caw
//
const L2_CROW_MOUTH_OPEN_DURATION = 0.9
function startDistantWildlifeTimers(k, sound, crowAnimState) {
  //
  // 'crow0' is preloaded at boot; no inline loadSound needed here.
  //
  let crowTimer = L2_CROW_INTERVAL_MIN + Math.random() * (L2_CROW_INTERVAL_MAX - L2_CROW_INTERVAL_MIN)
  let owlTimer = L2_OWL_INTERVAL_MIN + Math.random() * (L2_OWL_INTERVAL_MAX - L2_OWL_INTERVAL_MIN)
  const ev = k.onUpdate(() => {
    const dt = k.dt()
    crowTimer -= dt
    owlTimer -= dt
    //
    // Decrement crow mouth open timer
    //
    if (crowAnimState.mouthTimer > 0) {
      crowAnimState.mouthTimer -= dt
      if (crowAnimState.mouthTimer <= 0) {
        crowAnimState.mouthOpen = false
      }
    }
    if (crowTimer <= 0) {
      //
      // Play only mp3 crow recordings; skip the generated crow entirely.
      //
      k.play(L2_CROW_MP3_NAMES[0], { volume: L2_CROW_MP3_VOLUME })
      //
      // Open crow's beak for the duration of the call
      //
      crowAnimState.mouthOpen = true
      crowAnimState.mouthTimer = L2_CROW_MOUTH_OPEN_DURATION
      crowTimer = L2_CROW_INTERVAL_MIN + Math.random() * (L2_CROW_INTERVAL_MAX - L2_CROW_INTERVAL_MIN)
    }
    if (owlTimer <= 0) {
      if (Math.random() < 0.55) {
        //
        // Louder owl so it cuts through the quieter background music in L2
        //
        sound && Sound.playOwlSound(sound, 1.6)
      }
      owlTimer = L2_OWL_INTERVAL_MIN + Math.random() * (L2_OWL_INTERVAL_MAX - L2_OWL_INTERVAL_MIN)
    }
  })
  return () => ev.cancel()
}

//
// Crow perched on top of the right log pile. Draws a realistic crow using the shared
// drawCrow utility; beak opens when a crow.mp3 sample plays. Eyes track the hero.
//
const L2_CROW_Z = 5
function addCrowOnLogs(k, floorY, logPileX, crowAnimState, heroInst) {
  const sc = 1.35
  const cx = logPileX != null ? logPileX + 22 : CFG.visual.screen.width - 260
  //
  // perchY = foot level; drawCrow raises body internally by BODY_RAISE*sc.
  // Log pile top is approximately 64px above floor level.
  //
  const perchY = floorY - 64
  k.add([
    k.z(L2_CROW_Z),
    {
      draw() {
        const heroX = heroInst?.character?.pos?.x ?? cx + 1
        const s = heroX >= cx ? 1 : -1
        //
        // Full brightness boost makes the crow white — stands out against
        // the dark fir-tree background only in L2.
        //
        //
        // Full brightness body (white crow), wings at lower boost so they
        // remain visible as light gray against the white body.
        //
        drawCrow(k, cx, perchY, sc, s, crowAnimState.mouthOpen, heroInst, 255, 155)
      }
    }
  ])
  return { cx, perchY }
}
function fillEllipse(k, cx, cy, rx, ry, color, opacity) {
  const segs = 28
  const pts = []
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2
    pts.push(k.vec2(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry))
  }
  k.drawPolygon({ pts, color, opacity })
}

function strokeEllipse(k, cx, cy, rx, ry, color, opacity, width) {
  const segs = 36
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2
    const a1 = ((i + 1) / segs) * Math.PI * 2
    k.drawLine({
      p1: k.vec2(cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry),
      p2: k.vec2(cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry),
      width,
      color,
      opacity
    })
  }
}
