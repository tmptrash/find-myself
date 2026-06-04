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
// Base half-dimensions of the eye shape in canvas pixels
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
// Maximum pupil travel distance in baked pixels when tracking hero
//
const GAZE_MAX_X = 12
const GAZE_MAX_Y = 9
//
// Gaze lerp speed — 0–1 per frame weight; lower = smoother
//
const GAZE_LERP = 0.05
//
// Eyes sit left and right of the brain center
//
const BRAIN_HEIGHT_RATIO = 0.5
const EYE_OFFSET_X = 185
const EYE_SCALE = 0.80
const EYE_OPACITY = 0.40
//
// 90 precomputed fiber records — deterministic hash so baked sprite is stable
//
const FIBER_COUNT = 90
const EYE_FIBERS = buildFibers()

/**
 * Spawns two dreaming eye sprites that look down toward the hero
 * @param {Object} k - Kaplay instance
 * @param {Object} layout - Playfield bounds
 * @param {Object|null} hero - Hero instance to track (optional)
 * @returns {Object} Eye inst
 */
export function create(k, layout, hero = null) {
  const { topPlatformHeight = 360, bottomPlatformHeight = 86, sideWallWidth = 192 } = layout ?? {}
  const playLeft = sideWallWidth
  const playTop = topPlatformHeight
  const playWidth = k.width() - sideWallWidth * 2
  const playHeight = k.height() - topPlatformHeight - bottomPlatformHeight
  const brainCenterX = playLeft + playWidth * 0.5
  const brainCenterY = playTop + playHeight * BRAIN_HEIGHT_RATIO
  const inst = { k, eyes: [], hero }
  //
  // Two eyes: left eye and right eye, symmetrically around the brain center
  //
  for (let idx = 0; idx < EYE_COUNT; idx++) {
    const cx = brainCenterX + (idx === 0 ? -EYE_OFFSET_X : EYE_OFFSET_X)
    const cy = brainCenterY
    const baked = bakeEyeSclera(k, idx, EYE_SCALE)
    const sprite = k.add([
      k.sprite(baked.key),
      k.pos(cx, cy),
      k.anchor('center'),
      k.scale(1),
      k.fixed(),
      k.opacity(EYE_OPACITY),
      k.z(EYE_Z - idx * 0.4)
    ])
    //
    // Scaled iris and pupil radii match the baked sprite proportions
    //
    const EW = Math.round(EYE_HALF_W * EYE_SCALE)
    const EH = Math.round(EYE_HALF_H * EYE_SCALE)
    const pupilR = Math.round(EH * 0.48)
    const pupil = spawnLivePupil(k, cx, cy, pupilR, EYE_Z - idx * 0.4 + 0.05, EYE_OPACITY)
    inst.eyes.push({
      sprite,
      pupil,
      cx,
      cy,
      openScale: 1,
      blinkState: 'open',
      blinkFrame: 0,
      blinkTimer: BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN),
      gazeX: 0,
      gazeY: 0,
      gazeTargetX: 0,
      gazeTargetY: GAZE_MAX_Y
    })
  }
  k.onUpdate(() => onUpdate(inst))
  return inst
}

//
// Advances blink, gaze and pupil position for each eye every frame
//
function onUpdate(inst) {
  const { eyes, hero } = inst
  eyes.forEach(eye => {
    updateBlink(eye)
    updateGaze(eye, hero)
    //
    // Apply vertical blink scale — scaleY animates from 1 (open) to 0 (closed)
    //
    eye.sprite.scale.y = eye.openScale
    //
    // Scale pupil vertically with the blink so it disappears when eye closes
    //
    eye.pupil.scaleY = eye.openScale
    //
    // Feed current gaze offset to the live pupil object for rendering
    //
    eye.pupil.gazeX = eye.gazeX
    eye.pupil.gazeY = eye.gazeY
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
// When a hero is present, gaze direction is computed from eye center toward hero position.
// Without hero the gaze defaults to a gentle downward look (GAZE_MAX_Y).
//
function updateGaze(eye, hero) {
  if (hero?.character) {
    const dx = hero.character.pos.x - eye.cx
    const dy = hero.character.pos.y - eye.cy
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len > 0) {
      eye.gazeTargetX = (dx / len) * GAZE_MAX_X
      eye.gazeTargetY = (dy / len) * GAZE_MAX_Y
    }
  }
  eye.gazeX += (eye.gazeTargetX - eye.gazeX) * GAZE_LERP
  eye.gazeY += (eye.gazeTargetY - eye.gazeY) * GAZE_LERP
}

//
// Creates a live game object whose draw() renders the animated pupil at the
// current gaze offset. Pupil is separate from the baked sclera sprite so it
// can be repositioned every frame without re-baking the canvas.
//
function spawnLivePupil(k, cx, cy, pupilR, z, opacity) {
  const pupilObj = k.add([
    k.pos(cx, cy),
    k.fixed(),
    k.z(z),
    {
      gazeX: 0,
      gazeY: GAZE_MAX_Y,
      scaleY: 1,
      draw() {
        if (this.scaleY < 0.04) return
        const px = this.gazeX
        const py = this.gazeY * this.scaleY
        //
        // Outer soft shadow ring
        //
        k.drawCircle({
          pos: k.vec2(px, py),
          radius: pupilR * 1.18,
          color: k.rgb(6, 4, 14),
          opacity: opacity * 0.45
        })
        //
        // Pupil — near-black disc
        //
        k.drawCircle({
          pos: k.vec2(px, py),
          radius: pupilR,
          color: k.rgb(8, 5, 16),
          opacity: opacity * 0.92
        })
      }
    }
  ])
  return pupilObj
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
// Renders the eye sclera + iris (without pupil) to a canvas and loads as sprite.
// The pupil is rendered as a separate live object so it can be repositioned each frame.
//
function bakeEyeSclera(k, idx, scale) {
  const EW = Math.round(EYE_HALF_W * scale)
  const EH = Math.round(EYE_HALF_H * scale)
  const PAD = EYE_BAKE_PAD
  const CW = EW * 2 + PAD * 2
  const CH = EH * 2 + PAD * 2
  const CX = CW * 0.5
  const CY = CH * 0.5
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
    const r1 = Math.round(EH * 0.48) + 2 + f.r1add * scale
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
  // Eye outline stroke
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
