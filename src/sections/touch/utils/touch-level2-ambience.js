import { CFG } from '../../../cfg.js'
import * as Sound from '../../../utils/sound.js'

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
const L2_BUNNY_ON_LAKE_CHANCE = 0.52
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
 * @returns {{ lakeBounds, stopWildlife, snowmanX }}
 */
export function setupTouchLevel2Ambience(cfg) {
  const { k, floorY, leftMargin, rightMargin, topMargin, heroInst, sound, logPileX, rightLogPileX } = cfg
  const lakeBounds = computeLakeBounds(floorY, leftMargin)
  addTwinklingStars(k, floorY, leftMargin, rightMargin, topMargin)
  addFrozenLake(k, lakeBounds)
  const crowAnimState = { mouthOpen: false, mouthTimer: 0 }
  const snowmanX = addWatchingSnowman(k, heroInst, floorY, rightMargin, logPileX)
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

function addFrozenLake(k, bounds) {
  const { minX, maxX, topY, botY } = bounds
  const midY = (topY + botY) / 2
  const rx = (maxX - minX) / 2
  const ry = (botY - topY) / 2 + 4
  const cx = (minX + maxX) / 2
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
  k.add([
    k.z(L2_DECOR_ABOVE_PLATFORMS_Z),
    {
      draw() {
        fillEllipse(k, cx, midY, rx * 1.02, ry * 0.92, k.rgb(128, 180, 238), 0.82)
        fillEllipse(k, cx - rx * 0.08, midY - 3, rx * 0.88, ry * 0.72, k.rgb(185, 220, 255), 0.55)
        strokeEllipse(k, cx, midY, rx * 1.02, ry * 0.92, k.rgb(95, 148, 210), 0.72, 2)
        //
        // Hairline cracks on ice
        //
        k.drawLine({
          p1: k.vec2(cx - rx * 0.35, midY + ry * 0.15),
          p2: k.vec2(cx + rx * 0.22, midY - ry * 0.05),
          width: 1,
          color: k.rgb(140, 178, 212),
          opacity: 0.35
        })
        //
        // Animated sun glints: bright ovals that pulse softly
        //
        const t = k.time()
        for (const g of glints) {
          const alpha = 0.18 + 0.32 * (Math.sin(t * g.speed + g.phase) * 0.5 + 0.5)
          fillEllipse(k, g.x, g.y, g.rx, g.ry, k.rgb(248, 255, 255), alpha)
        }
      }
    }
  ])
}

function maybeAddLakeRabbit(k, bounds) {
  if (Math.random() > L2_BUNNY_ON_LAKE_CHANCE) return
  const { minX, maxX, topY, botY } = bounds
  const bx = minX + (maxX - minX) * (0.28 + Math.random() * 0.46)
  const by = topY + (botY - topY) * (0.42 + Math.random() * 0.28)
  const facing = Math.random() < 0.5 ? -1 : 1
  k.add([
    k.z(L2_DECOR_ABOVE_PLATFORMS_Z + 1),
    {
      draw() {
        const bodyRx = 11
        const bodyRy = 7
        fillEllipse(k, bx, by, bodyRx, bodyRy, k.rgb(252, 248, 242), 0.92)
        fillEllipse(k, bx + facing * 9, by - 5, 5, 5, k.rgb(252, 248, 242), 0.92)
        fillEllipse(k, bx + facing * 12, by - 10, 3, 9, k.rgb(252, 240, 246), 0.85)
        fillEllipse(k, bx + facing * 11, by - 11, 3, 9, k.rgb(252, 240, 246), 0.85)
        k.drawCircle({
          pos: k.vec2(bx + facing * 10, by - 6),
          radius: 1.1,
          color: k.rgb(40, 38, 42),
          opacity: 0.9
        })
      }
    }
  ])
}

function addWatchingSnowman(k, heroInst, floorY, rightMargin, logPileX) {
  const footY = floorY - 4
  //
  // Place snowman to the right of the first log pile (or a fallback X).
  //
  const fallbackX = CFG.visual.screen.width - rightMargin - 200
  const cx = logPileX != null
    ? logPileX + L2_SNOWMAN_LOG_OFFSET_X
    : fallbackX
  const snowmanX = cx
  const baseY = footY - L2_SNOWMAN_BODY_R
  const midY = baseY - L2_SNOWMAN_BODY_R - L2_SNOWMAN_STACK_GAP
  const headY = midY - L2_SNOWMAN_HEAD_R - L2_SNOWMAN_STACK_GAP
  k.add([
    k.z(L2_SNOWMAN_Z),
    {
      draw() {
        //
        // Branch arms — left and right sticks with two twigs each.
        //
        const armY = midY + 2
        const armLen = 36
        const armSpread = 14
        for (const armSide of [-1, 1]) {
          const armEndX = cx + armSide * (L2_SNOWMAN_BODY_R * 0.72 + armLen)
          const armEndY = armY - 8
          k.drawLine({
            p1: k.vec2(cx + armSide * L2_SNOWMAN_BODY_R * 0.68, armY),
            p2: k.vec2(armEndX, armEndY),
            width: 2.5,
            color: k.rgb(38, 28, 18),
            opacity: 1
          })
          //
          // Two short twigs branching from the arm tip
          //
          k.drawLine({
            p1: k.vec2(armEndX, armEndY),
            p2: k.vec2(armEndX + armSide * 10, armEndY - armSpread),
            width: 1.5,
            color: k.rgb(38, 28, 18),
            opacity: 1
          })
          k.drawLine({
            p1: k.vec2(armEndX, armEndY),
            p2: k.vec2(armEndX + armSide * 14, armEndY + 4),
            width: 1.5,
            color: k.rgb(38, 28, 18),
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

const L2_CROW_MP3_VOLUME = 0.65
const L2_CROW_MP3_NAMES = ['l2-crow-0', 'l2-crow-1']

//
// How long the crow's beak stays open after a caw
//
const L2_CROW_MOUTH_OPEN_DURATION = 0.9
function startDistantWildlifeTimers(k, sound, crowAnimState) {
  //
  // Pre-load mp3 crow samples once per scene load.
  //
  k.loadSound(L2_CROW_MP3_NAMES[0], '/assets/sounds/crow0.mp3')
  k.loadSound(L2_CROW_MP3_NAMES[1], '/assets/sounds/crow1.mp3')
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
      k.play(L2_CROW_MP3_NAMES[Math.floor(Math.random() * 2)], { volume: L2_CROW_MP3_VOLUME })
      //
      // Open crow's beak for the duration of the call
      //
      crowAnimState.mouthOpen = true
      crowAnimState.mouthTimer = L2_CROW_MOUTH_OPEN_DURATION
      crowTimer = L2_CROW_INTERVAL_MIN + Math.random() * (L2_CROW_INTERVAL_MAX - L2_CROW_INTERVAL_MIN)
    }
    if (owlTimer <= 0) {
      if (Math.random() < 0.55) {
        sound && Sound.playOwlSound(sound)
      }
      owlTimer = L2_OWL_INTERVAL_MIN + Math.random() * (L2_OWL_INTERVAL_MAX - L2_OWL_INTERVAL_MIN)
    }
  })
  return () => ev.cancel()
}

//
// Crow perched on top of the right log pile: body, wings, tail, beak and eyes.
// Crow perched on the right log pile. The beak opens when a crow.mp3 sample plays.
// The crow always faces the hero: beak points toward heroInst's current position.
//
const L2_CROW_Z = 5
function addCrowOnLogs(k, floorY, logPileX, crowAnimState, heroInst) {
  //
  // Fallback to a sensible position if no log pile X was provided.
  // Scale factor of 1.35 enlarges the crow relative to the original design.
  // Pre-cache colors to avoid allocating new Color objects each frame.
  //
  const bodyColor  = k.rgb(22, 20, 22)
  const headColor  = k.rgb(18, 16, 18)
  const wingColor  = k.rgb(32, 28, 36)
  const tailColor  = k.rgb(20, 18, 20)
  const eyeWhite   = k.rgb(230, 230, 230)
  const pupilColor = k.rgb(10, 8, 10)
  const beakUpper  = k.rgb(55, 50, 35)
  const beakLower  = k.rgb(45, 40, 28)
  const mouthInner = k.rgb(160, 80, 60)
  const feetColor  = k.rgb(60, 50, 30)
  const sc = 1.35
  const cx = logPileX != null ? logPileX + 22 : CFG.visual.screen.width - 260
  //
  // Perch height: sit on top of the log pile (logs are stacked ~90px tall above floor)
  //
  const perchY = floorY - 94
  k.add([
    k.z(L2_CROW_Z),
    {
      draw() {
        //
        // Facing direction: +1 = beak points right (hero is right of crow)
        //
        const heroX = heroInst?.character?.pos?.x ?? cx + 1
        const s = heroX >= cx ? 1 : -1
        //
        // Body — dark oval
        //
        k.drawEllipse({
          pos: k.vec2(cx, perchY),
          radiusX: 12 * sc,
          radiusY: 9 * sc,
          color: bodyColor,
          opacity: 1
        })
        //
        // Head — small circle on the beak side
        //
        k.drawCircle({
          pos: k.vec2(cx + 9 * sc * s, perchY - 8 * sc),
          radius: 7 * sc,
          color: headColor,
          opacity: 1
        })
        //
        // Wing highlight — dark feather sheen away from head
        //
        k.drawEllipse({
          pos: k.vec2(cx - 2 * sc * s, perchY - 1 * sc),
          radiusX: 7 * sc,
          radiusY: 4 * sc,
          color: wingColor,
          opacity: 0.9
        })
        //
        // Tail — wedge pointing opposite to the beak
        //
        k.drawTriangle({
          p1: k.vec2(cx - 10 * sc * s, perchY + 2 * sc),
          p2: k.vec2(cx - 22 * sc * s, perchY + 6 * sc),
          p3: k.vec2(cx - 10 * sc * s, perchY + 9 * sc),
          color: tailColor,
          opacity: 1
        })
        //
        // Eye — on the beak side
        //
        k.drawCircle({
          pos: k.vec2(cx + 12 * sc * s, perchY - 9 * sc),
          radius: 2.2 * sc,
          color: eyeWhite,
          opacity: 1
        })
        k.drawCircle({
          pos: k.vec2(cx + 12.5 * sc * s, perchY - 9 * sc),
          radius: 1.1 * sc,
          color: pupilColor,
          opacity: 1
        })
        //
        // Beak pointing toward hero
        //
        if (crowAnimState.mouthOpen) {
          k.drawTriangle({
            p1: k.vec2(cx + 10 * sc * s, perchY - 8 * sc),
            p2: k.vec2(cx + 20 * sc * s, perchY - 7 * sc),
            p3: k.vec2(cx + 10 * sc * s, perchY - 5 * sc),
            color: beakUpper,
            opacity: 1
          })
          k.drawTriangle({
            p1: k.vec2(cx + 10 * sc * s, perchY - 5 * sc),
            p2: k.vec2(cx + 19 * sc * s, perchY - 3 * sc),
            p3: k.vec2(cx + 10 * sc * s, perchY - 2 * sc),
            color: beakLower,
            opacity: 1
          })
          k.drawTriangle({
            p1: k.vec2(cx + 10 * sc * s, perchY - 5 * sc),
            p2: k.vec2(cx + 19 * sc * s, perchY - 5 * sc),
            p3: k.vec2(cx + 10 * sc * s, perchY - 3 * sc),
            color: mouthInner,
            opacity: 0.85
          })
        } else {
          k.drawTriangle({
            p1: k.vec2(cx + 10 * sc * s, perchY - 8 * sc),
            p2: k.vec2(cx + 20 * sc * s, perchY - 6 * sc),
            p3: k.vec2(cx + 10 * sc * s, perchY - 4 * sc),
            color: beakUpper,
            opacity: 1
          })
        }
        //
        // Feet — symmetric, grip the log
        //
        k.drawLine({
          p1: k.vec2(cx + 2 * sc, perchY + 8 * sc),
          p2: k.vec2(cx + 2 * sc, perchY + 15 * sc),
          width: 1.5,
          color: feetColor,
          opacity: 1
        })
        k.drawLine({
          p1: k.vec2(cx + 8 * sc, perchY + 8 * sc),
          p2: k.vec2(cx + 8 * sc, perchY + 15 * sc),
          width: 1.5,
          color: feetColor,
          opacity: 1
        })
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
