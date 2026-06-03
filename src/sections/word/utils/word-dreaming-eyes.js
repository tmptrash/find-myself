import { CFG } from '../cfg.js'

//
// Penultimate background layer — above playfield fill (-90), behind flying words (-78)
//
const EYE_Z = (CFG.visual.zIndex.wordPlayfieldFill ?? -90) + 6
//
// Two stationary eyes placed symmetrically left and right of the brain
//
const EYE_COUNT = 2
//
// Base half-dimensions of the eye shape in canvas pixels (slightly smaller than before)
//
const EYE_HALF_W = 108
const EYE_HALF_H = 48
//
// Canvas bake padding for edge glow
//
const EYE_BAKE_PAD = 18
//
// Blink timing in frames (≈60 fps)
//
const BLINK_INTERVAL_MIN = 240
const BLINK_INTERVAL_MAX = 480
const BLINK_CLOSE_FRAMES = 5
const BLINK_OPEN_FRAMES = 9
//
// Maximum gaze offset in canvas pixels when iris tracks autonomously
//
const GAZE_MAX_X = 14
const GAZE_MAX_Y = 8
//
// How quickly gaze lerps toward its target (0–1 per frame weight)
//
const GAZE_LERP = 0.04
//
// Interval between autonomous gaze shifts (frames)
//
const GAZE_SHIFT_MIN = 100
const GAZE_SHIFT_MAX = 240
//
// Eyes sit left and right of the brain — same vertical ratio as brain center
//
const BRAIN_HEIGHT_RATIO = 0.5
const EYE_OFFSET_X = 185
const EYE_SCALE = 0.80
const EYE_OPACITY = 0.40
//
// 90 precomputed fiber records — deterministic hash so baked sprite is stable across runs
//
const FIBER_COUNT = 90
const EYE_FIBERS = buildFibers()

/**
 * Spawns two dreaming eye sprites in the deep background of the playfield
 * @param {Object} k - Kaplay instance
 * @param {Object} layout - Playfield bounds
 * @param {number} layout.topPlatformHeight - Y where playfield starts
 * @param {number} layout.bottomPlatformHeight - Height of bottom platform in px
 * @param {number} layout.sideWallWidth - Width of side walls in px
 * @returns {Object} Eye inst
 */
export function create(k, layout) {
  const { topPlatformHeight = 360, bottomPlatformHeight = 86, sideWallWidth = 192 } = layout ?? {}
  const playLeft = sideWallWidth
  const playTop = topPlatformHeight
  const playWidth = k.width() - sideWallWidth * 2
  const playHeight = k.height() - topPlatformHeight - bottomPlatformHeight
  const brainCenterX = playLeft + playWidth * 0.5
  const brainCenterY = playTop + playHeight * BRAIN_HEIGHT_RATIO
  const inst = { k, eyes: [] }
  //
  // Two eyes: left eye and right eye, symmetrically around the brain center
  //
  for (let idx = 0; idx < EYE_COUNT; idx++) {
    const cx = brainCenterX + (idx === 0 ? -EYE_OFFSET_X : EYE_OFFSET_X)
    const cy = brainCenterY
    const baked = bakeEyeSprite(k, idx, EYE_SCALE)
    const sprite = k.add([
      k.sprite(baked.key),
      k.pos(cx, cy),
      k.anchor('center'),
      k.scale(1),
      k.fixed(),
      k.opacity(EYE_OPACITY),
      k.z(EYE_Z - idx * 0.4)
    ])
    inst.eyes.push({
      sprite,
      openScale: 1,
      blinkState: 'open',
      blinkFrame: 0,
      blinkTimer: BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN),
      gazeX: 0,
      gazeY: 0,
      gazeTargetX: 0,
      gazeTargetY: 0,
      gazeTimer: 0,
      gazeInterval: GAZE_SHIFT_MIN + Math.random() * (GAZE_SHIFT_MAX - GAZE_SHIFT_MIN)
    })
  }
  k.onUpdate(() => onUpdate(inst))
  return inst
}

//
// Advances blink and autonomous gaze for each eye every frame
//
function onUpdate(inst) {
  const { eyes } = inst
  eyes.forEach(eye => {
    updateBlink(eye)
    updateGaze(eye)
    //
    // Apply vertical blink scale — scaleY animates from 1 (open) to 0 (closed)
    //
    eye.sprite.scale.y = eye.openScale
  })
}

//
// Finite-state blink: open → closing → opening → open
//
function updateBlink(eye) {
  if (eye.blinkState === 'open') {
    eye.blinkTimer--
    if (eye.blinkTimer <= 0) {
      eye.blinkState = 'closing'
      eye.blinkFrame = 0
      eye.blinkTimer = BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN)
    }
  } else if (eye.blinkState === 'closing') {
    eye.blinkFrame++
    eye.openScale = Math.max(0.02, 1 - eye.blinkFrame / BLINK_CLOSE_FRAMES)
    if (eye.openScale <= 0.02) {
      eye.blinkState = 'opening'
      eye.blinkFrame = 0
    }
  } else {
    eye.blinkFrame++
    eye.openScale = Math.min(1, eye.blinkFrame / BLINK_OPEN_FRAMES)
    eye.openScale >= 1 && (eye.blinkState = 'open')
  }
}

//
// Gaze autonomously shifts to new random targets on a slow timer
//
function updateGaze(eye) {
  eye.gazeTimer++
  if (eye.gazeTimer >= eye.gazeInterval) {
    eye.gazeTimer = 0
    eye.gazeInterval = GAZE_SHIFT_MIN + Math.random() * (GAZE_SHIFT_MAX - GAZE_SHIFT_MIN)
    const targets = [[0, 0], [0, 0], [-GAZE_MAX_X, 0], [GAZE_MAX_X, 0], [0, -GAZE_MAX_Y], [0, GAZE_MAX_Y]]
    const t = targets[Math.floor(Math.random() * targets.length)]
    eye.gazeTargetX = t[0]
    eye.gazeTargetY = t[1]
  }
  eye.gazeX += (eye.gazeTargetX - eye.gazeX) * GAZE_LERP
  eye.gazeY += (eye.gazeTargetY - eye.gazeY) * GAZE_LERP
}

//
// Pre-builds 90 deterministic iris fiber records using integer hashes
//
function buildFibers() {
  const fibers = []
  for (let i = 0; i < FIBER_COUNT; i++) {
    const angle = (i / FIBER_COUNT) * Math.PI * 2
    fibers.push({
      angle,
      wobble: ((i * 7919 % 100) / 100 - 0.5) * 0.06,
      r1add: ((i * 3571 % 100) / 100) * 5,
      r2frac: 0.78 + ((i * 1327 % 100) / 1000) * 0.15,
      thick: 0.5 + ((i * 2311 % 100) / 100) * 0.6,
      //
      // Fiber color — purple-violet spectrum (r: 55–95, g: 28–58, b: 90–140)
      //
      rV: 55 + ((i * 997 % 100) / 100) * 40,
      gV: 28 + ((i * 631 % 100) / 100) * 30,
      bV: 90 + ((i * 1117 % 100) / 100) * 50
    })
  }
  return fibers
}

//
// Renders a fully-open eye to a canvas and loads it as a Kaplay sprite
//
function bakeEyeSprite(k, idx, scale) {
  const EW = Math.round(EYE_HALF_W * scale)
  const EH = Math.round(EYE_HALF_H * scale)
  const PAD = EYE_BAKE_PAD
  const CW = EW * 2 + PAD * 2
  const CH = EH * 2 + PAD * 2
  const CX = CW * 0.5
  const CY = CH * 0.5
  const pupilR = Math.round(EH * 0.48)
  const irisR = Math.round(EH * 0.95)
  const canvas = document.createElement('canvas')
  canvas.width = CW
  canvas.height = CH
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CW, CH)
  //
  // Clip everything to the eye-shaped bezier region
  //
  ctx.save()
  drawEyePath(ctx, CX, CY, EW, EH)
  ctx.clip()
  //
  // Sclera — light lavender tinted white
  //
  const sg = ctx.createRadialGradient(CX, CY - EH * 0.15, EH * 0.3, CX, CY, EW)
  sg.addColorStop(0, '#EDE8F8')
  sg.addColorStop(0.65, '#DDD8F0')
  sg.addColorStop(1, '#C4BCE0')
  ctx.fillStyle = sg
  ctx.fillRect(0, 0, CW, CH)
  //
  // Iris base gradient — deep purple
  //
  const IX = CX, IY = CY
  const ig = ctx.createRadialGradient(IX, IY - irisR * 0.12, 4, IX, IY, irisR)
  ig.addColorStop(0, '#3D2B5C')
  ig.addColorStop(0.28, '#5A3D7A')
  ig.addColorStop(0.55, '#4A3468')
  ig.addColorStop(0.82, '#3A2854')
  ig.addColorStop(1, '#281E40')
  ctx.beginPath()
  ctx.arc(IX, IY, irisR, 0, Math.PI * 2)
  ctx.fillStyle = ig
  ctx.fill()
  //
  // Iris fibers — clipped to iris disc
  //
  ctx.save()
  ctx.beginPath()
  ctx.arc(IX, IY, irisR, 0, Math.PI * 2)
  ctx.clip()
  EYE_FIBERS.forEach(f => {
    const r1 = pupilR + 2 + f.r1add * scale
    const r2 = irisR * f.r2frac
    ctx.beginPath()
    ctx.moveTo(IX + Math.cos(f.angle + f.wobble) * r1, IY + Math.sin(f.angle + f.wobble) * r1)
    ctx.lineTo(IX + Math.cos(f.angle) * r2, IY + Math.sin(f.angle) * r2)
    ctx.strokeStyle = `rgba(${Math.round(f.rV)},${Math.round(f.gV)},${Math.round(f.bV)},0.28)`
    ctx.lineWidth = f.thick
    ctx.stroke()
  })
  ctx.restore()
  //
  // Limbal ring — dark fringe around iris edge
  //
  const lr = ctx.createRadialGradient(IX, IY, irisR * 0.76, IX, IY, irisR)
  lr.addColorStop(0, 'rgba(0,0,0,0)')
  lr.addColorStop(1, 'rgba(0,0,0,0.62)')
  ctx.beginPath()
  ctx.arc(IX, IY, irisR, 0, Math.PI * 2)
  ctx.fillStyle = lr
  ctx.fill()
  //
  // Pupil — near-black with subtle radial gradient
  //
  const pg = ctx.createRadialGradient(IX - pupilR * 0.15, IY - pupilR * 0.15, 1, IX, IY, pupilR)
  pg.addColorStop(0, '#1A1525')
  pg.addColorStop(0.6, '#0D0A1A')
  pg.addColorStop(1, '#080510')
  ctx.beginPath()
  ctx.arc(IX, IY, pupilR, 0, Math.PI * 2)
  ctx.fillStyle = pg
  ctx.fill()
  //
  // Primary corneal highlight
  //
  const hx = IX - irisR * 0.28, hy = IY - irisR * 0.38
  const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, Math.round(irisR * 0.32))
  hg.addColorStop(0, 'rgba(255,255,255,0.88)')
  hg.addColorStop(0.4, 'rgba(255,255,255,0.42)')
  hg.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.save()
  ctx.globalAlpha = 0.80
  ctx.beginPath()
  ctx.ellipse(hx, hy, Math.round(irisR * 0.28), Math.round(irisR * 0.18), -0.4, 0, Math.PI * 2)
  ctx.fillStyle = hg
  ctx.fill()
  ctx.restore()
  //
  // Secondary small highlight
  //
  const h2x = IX + irisR * 0.18, h2y = IY - irisR * 0.22
  const hg2 = ctx.createRadialGradient(h2x, h2y, 0, h2x, h2y, Math.round(irisR * 0.12))
  hg2.addColorStop(0, 'rgba(255,255,255,0.82)')
  hg2.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.save()
  ctx.globalAlpha = 0.48
  ctx.beginPath()
  ctx.arc(h2x, h2y, Math.round(irisR * 0.12), 0, Math.PI * 2)
  ctx.fillStyle = hg2
  ctx.fill()
  ctx.restore()
  ctx.restore()
  //
  // Eye outline
  //
  drawEyePath(ctx, CX, CY, EW, EH)
  ctx.strokeStyle = 'rgba(22,14,40,0.68)'
  ctx.lineWidth = 1.8
  ctx.stroke()
  const key = `word-eye-${idx}-${Date.now()}`
  k.loadSprite(key, canvas)
  canvas.width = 0
  canvas.height = 0
  return { key, w: CW, h: CH }
}

//
// Bezier eye outline path — same shape for both clip region and stroke outline
//
function drawEyePath(ctx, cx, cy, ew, eh) {
  ctx.beginPath()
  ctx.moveTo(cx - ew, cy)
  ctx.bezierCurveTo(cx - ew * 0.5, cy - eh * 1.22, cx + ew * 0.5, cy - eh * 1.22, cx + ew, cy)
  ctx.bezierCurveTo(cx + ew * 0.5, cy + eh * 0.62, cx - ew * 0.5, cy + eh * 0.62, cx - ew, cy)
  ctx.closePath()
}
