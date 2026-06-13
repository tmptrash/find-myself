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
// Instant tracking — pupils snap to hero each frame with no easing delay
const GAZE_LERP = 1
//
// Eyes sit left and right of the brain center
//
const BRAIN_HEIGHT_RATIO = 0.5
const EYE_OFFSET_X = 185
const EYE_SCALE = 0.80
//
// Third "ajna" eye, set inside the upper part of the brain (between the side
// eyes at the brain centre and the brain's top edge, never poking above it).
// Hidden until the calm meditation completes, then it slowly opens (scaleY 0→1)
// while the side eyes stay shut. Drawn at half the side eyes' size.
//
const THIRD_EYE_UP_FRAC = 0.55           // How far up the brain's upper half it sits (kept within the brain)
const THIRD_EYE_SCALE = EYE_SCALE * 0.5  // Half the size of the side eyes
const THIRD_EYE_OPEN_SPEED = 1.2         // revealT units per second when opening
const THIRD_EYE_OPACITY = 1              // Fully opaque — unlike the subtle side eyes
// Eyes are kept subtle — opacity and scale kept low so they blend into the
// background layer alongside the brain rather than drawing focus.
const EYE_OPACITY = 0.18
//
// Derived iris / pupil geometry — used to clamp gaze so the pupil
// never escapes the iris disc or clips the asymmetric lower arc.
// EH matches the baked canvas half-height (EYE_HALF_H * EYE_SCALE).
//
const EYE_EH = Math.round(EYE_HALF_H * EYE_SCALE)
const GAZE_IRIS_R = Math.round(EYE_EH * 0.95)
const GAZE_PUPIL_R = Math.round(EYE_EH * 0.48)
//
// Maximum radial offset of the pupil centre within the iris disc
//
const GAZE_CIRCLE_MAX = GAZE_IRIS_R - GAZE_PUPIL_R - 1
//
// Lower arc factor is 0.62 × EH — cap downward gaze so the pupil
// disc never crosses this boundary (2 px safety margin)
//
const GAZE_DOWN_MAX = Math.round(EYE_EH * 0.62) - GAZE_PUPIL_R - 2
//
// 90 precomputed fiber records — deterministic hash so baked sprite is stable
//
const FIBER_COUNT = 90
const EYE_FIBERS = buildFibers()
//
// Calm "closed eye" look — when the hero stands on the calm platform the open
// sclera/pupil fade out and each eye is drawn as two gentle lash arcs (an upper
// and a lower curve) meeting at the corners, with no pupil. Stroked in the same
// muted lavender as the open eye so it stays a subtle background element.
//
const EYE_CLOSED_FADE_SPEED = 4.0        // closedT units per second when shutting/opening
const EYE_CLOSED_SAMPLES = 22            // Points sampled along each lid arc
const EYE_CLOSED_UP = 0.55               // Upper lid rise as a fraction of the eye half-height
const EYE_CLOSED_LOW = 0.42              // Lower lid dip as a fraction of the eye half-height
const EYE_CLOSED_STROKE_W = 3            // Lid outline thickness
//
// Closed eye reuses the open eye's palette so it reads as the same eye, just
// shut: the muted lavender sclera fill bounded by the dark eye outline, no pupil.
//
const EYE_CLOSED_FILL = [122, 120, 144]  // Sclera lavender (#7A7890) — matches the open eye
const EYE_CLOSED_OUTLINE = [22, 14, 40]  // Dark eye-outline tone — matches the open eye
const EYE_CLOSED_FILL_OPACITY = EYE_OPACITY  // Sclera fill matches the open eye's subtlety
const EYE_CLOSED_OUTLINE_OPACITY = 0.4   // Slightly stronger outline so the shut lids read

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
  //
  // Shared gaze state — both pupils use the same offset so they look in unison
  //
  const inst = { k, eyes: [], hero, brainCenterX, brainCenterY, gazeX: 0, gazeY: 0, gazeTargetX: 0, gazeTargetY: GAZE_MAX_Y, eyesClosed: false, thirdEyeOpen: false }
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
    const eye = {
      sprite,
      pupil,
      cx,
      cy,
      ew: EW,
      eh: EH,
      openScale: 1,
      closedT: 0,
      blinkState: 'open',
      blinkFrame: 0,
      blinkTimer: BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN)
    }
    //
    // Live "closed eye" lash arcs, faded in by closedT while calm
    //
    spawnClosedEye(k, eye, EYE_Z - idx * 0.4 + 0.06)
    inst.eyes.push(eye)
  }
  //
  // Third eye inside the brain's upper part — created closed (scaleY 0, opacity 0)
  // and revealed later via openThirdEye() once the calm meditation completes. It
  // sits partway up the brain's upper half so it never pokes above the brain, and
  // is baked at half the side eyes' size.
  //
  const tcx = brainCenterX
  const brainHalfH = playHeight * BRAIN_HEIGHT_RATIO / 2
  const tcy = brainCenterY - brainHalfH * THIRD_EYE_UP_FRAC
  const tBaked = bakeEyeSclera(k, 2, THIRD_EYE_SCALE)
  const tSprite = k.add([
    k.sprite(tBaked.key),
    k.pos(tcx, tcy),
    k.anchor('center'),
    k.scale(1, 0),
    k.fixed(),
    k.opacity(0),
    k.z(EYE_Z + 0.1)
  ])
  const TEW = Math.round(EYE_HALF_W * THIRD_EYE_SCALE)
  const TEH = Math.round(EYE_HALF_H * THIRD_EYE_SCALE)
  const tPupilR = Math.round(TEH * 0.48)
  const tPupil = spawnLivePupil(k, tcx, tcy, tPupilR, EYE_Z + 0.15, THIRD_EYE_OPACITY)
  tPupil.scaleY = 0
  inst.eyes.push({
    sprite: tSprite,
    pupil: tPupil,
    cx: tcx,
    cy: tcy,
    ew: TEW,
    eh: TEH,
    openScale: 1,
    closedT: 0,
    revealT: 0,
    isThird: true
  })
  k.onUpdate(() => onUpdate(inst))
  return inst
}

/**
 * Opens the third eye at the top of the brain (it gently reveals while the two
 * side eyes remain shut). Used when the word level 4 calm meditation completes.
 * @param {Object} inst - Dreaming-eyes inst
 */
export function openThirdEye(inst) {
  if (inst) inst.thirdEyeOpen = true
}
//
// Draws the calm closed eye in the same style as the open eye: a muted lavender
// sclera almond bounded by the dark eye outline (two arcs meeting at the corners)
// but flatter and with no iris/pupil. Visible only while the eye's closedT is up.
//
function spawnClosedEye(k, eye, z) {
  k.add([
    k.pos(0, 0),
    k.fixed(),
    k.z(z),
    {
      draw() {
        if (eye.closedT < 0.01) return
        const { cx, cy, ew, eh } = eye
        const upH = eh * EYE_CLOSED_UP
        const lowH = eh * EYE_CLOSED_LOW
        //
        // Sample the upper and lower lid arcs: both bow away from the midline at
        // the centre and meet flush at the corners, forming an almond eye shape.
        //
        const upper = []
        const lower = []
        for (let i = 0; i < EYE_CLOSED_SAMPLES; i++) {
          const t = i / (EYE_CLOSED_SAMPLES - 1)
          const lx = -ew + t * ew * 2
          const fall = 1 - (lx / ew) * (lx / ew)
          upper.push(k.vec2(cx + lx, cy - upH * fall))
          lower.push(k.vec2(cx + lx, cy + lowH * fall))
        }
        //
        // Lavender sclera fill (no iris/pupil), then the dark eye outline on top
        //
        k.drawPolygon({
          pts: upper.concat(lower.slice().reverse()),
          color: k.rgb(...EYE_CLOSED_FILL),
          opacity: eye.closedT * EYE_CLOSED_FILL_OPACITY
        })
        const outline = k.rgb(...EYE_CLOSED_OUTLINE)
        const outlineOp = eye.closedT * EYE_CLOSED_OUTLINE_OPACITY
        k.drawLines({ pts: upper, width: EYE_CLOSED_STROKE_W, color: outline, opacity: outlineOp, cap: 'round', join: 'round' })
        k.drawLines({ pts: lower, width: EYE_CLOSED_STROKE_W, color: outline, opacity: outlineOp, cap: 'round', join: 'round' })
      }
    }
  ])
}

/**
 * Closes (or re-opens) the brain eyes and holds them shut — used by the word
 * level 4 calm platform so the brain "rests" while the hero stands on calm.
 * @param {Object} inst - Dreaming-eyes inst
 * @param {boolean} closed - True to gently shut the eyes, false to re-open them
 */
export function setEyesClosed(inst, closed) {
  if (inst) inst.eyesClosed = closed
}

//
// Advances blink, shared gaze and pupil position every frame
//
function onUpdate(inst) {
  const { eyes } = inst
  //
  // Gaze target is computed once from the brain midpoint so both eyes move in unison
  //
  updateGaze(inst)
  eyes.forEach(eye => {
    //
    // The third eye has its own reveal animation and ignores the calm shut state
    //
    if (eye.isThird) {
      updateThirdEye(inst, eye)
      return
    }
    updateBlink(eye, inst.eyesClosed)
    //
    // Ease the calm closed-eye blend toward its target (1 = closed lash arcs)
    //
    const closedTarget = inst.eyesClosed ? 1 : 0
    if (eye.closedT !== closedTarget) {
      const step = EYE_CLOSED_FADE_SPEED * inst.k.dt()
      const diff = closedTarget - eye.closedT
      eye.closedT += Math.sign(diff) * Math.min(Math.abs(diff), step)
    }
    //
    // Apply vertical blink scale — scaleY animates from 1 (open) to 0 (closed).
    // Fade the baked open sclera out as the calm lash arcs take over so the eye
    // never collapses into a flat horizontal stripe.
    //
    eye.sprite.scale.y = eye.openScale
    eye.sprite.opacity = EYE_OPACITY * (1 - eye.closedT)
    //
    // Scale pupil vertically with the blink so it disappears when eye closes
    //
    eye.pupil.scaleY = eye.openScale
    //
    // Both pupils receive the same shared gaze offset
    //
    eye.pupil.gazeX = inst.gazeX
    eye.pupil.gazeY = inst.gazeY
  })
}

//
// Eases the third eye open (revealT 0→1) once thirdEyeOpen is set, growing its
// sclera sprite from a slit and fading it in. It tracks the shared gaze like the
// other eyes. Stays fully hidden (opacity 0, scaleY 0) until then.
//
function updateThirdEye(inst, eye) {
  const target = inst.thirdEyeOpen ? 1 : 0
  if (eye.revealT !== target) {
    const step = THIRD_EYE_OPEN_SPEED * inst.k.dt()
    const diff = target - eye.revealT
    eye.revealT += Math.sign(diff) * Math.min(Math.abs(diff), step)
  }
  eye.sprite.scale.y = eye.revealT
  eye.sprite.opacity = THIRD_EYE_OPACITY * eye.revealT
  eye.pupil.scaleY = eye.revealT
  //
  // Shared gaze is tuned for the larger side eyes — scale down and clamp to this
  // eye's iris disc so the pupil never escapes the cornea circle
  //
  const gazeScale = THIRD_EYE_SCALE / EYE_SCALE
  const clamped = clampPupilGaze(inst.gazeX * gazeScale, inst.gazeY * gazeScale, eye.eh)
  eye.pupil.gazeX = clamped.gx
  eye.pupil.gazeY = clamped.gy
}

//
// Finite-state blink: open → closing → opening → open. While forceClosed (calm)
// the eyelid eases shut and stays down, then re-opens once calm ends.
//
function updateBlink(eye, forceClosed) {
  if (forceClosed) {
    eye.openScale = Math.max(0.02, eye.openScale - 1 / BLINK_CLOSE_FRAMES)
    eye.wasForceClosed = true
    return
  }
  //
  // Just released from the calm hold — animate the lids back open
  //
  if (eye.wasForceClosed) {
    eye.wasForceClosed = false
    eye.blinkState = 'opening'
    eye.blinkFrame = 0
  }
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
// Gaze direction is computed once from the brain center toward the hero.
// Storing it on inst ensures both eyes share the exact same offset each frame.
// Without a hero the gaze defaults to a gentle downward look (GAZE_MAX_Y).
//
function updateGaze(inst) {
  const { hero, brainCenterX, brainCenterY } = inst
  if (hero?.character) {
    const dx = hero.character.pos.x - brainCenterX
    const dy = hero.character.pos.y - brainCenterY
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len > 0) {
      inst.gazeTargetX = (dx / len) * GAZE_MAX_X
      inst.gazeTargetY = (dy / len) * GAZE_MAX_Y
    }
  }
  inst.gazeX += (inst.gazeTargetX - inst.gazeX) * GAZE_LERP
  inst.gazeY += (inst.gazeTargetY - inst.gazeY) * GAZE_LERP
  //
  // Clamp downward travel so the pupil disc stays above the lower arc
  //
  inst.gazeY = Math.min(inst.gazeY, GAZE_DOWN_MAX)
  //
  // Circular clamp — keep pupil centre within the iris disc
  //
  const dist = Math.sqrt(inst.gazeX * inst.gazeX + inst.gazeY * inst.gazeY)
  if (dist > GAZE_CIRCLE_MAX) {
    inst.gazeX = (inst.gazeX / dist) * GAZE_CIRCLE_MAX
    inst.gazeY = (inst.gazeY / dist) * GAZE_CIRCLE_MAX
  }
}

//
// Keeps a pupil centre (gx, gy) inside the iris disc for an eye of half-height eh.
// Matches the side-eye clamp in updateGaze but accepts per-eye dimensions so the
// smaller third eye can reuse the shared gaze target safely.
//
function clampPupilGaze(gx, gy, eh) {
  const irisR = Math.round(eh * 0.95)
  const pupilR = Math.round(eh * 0.48)
  //
  // The drawn pupil includes a soft outer ring — clamp using its full radius
  //
  const drawR = Math.ceil(pupilR * 1.18)
  const circleMax = irisR - drawR - 1
  const downMax = Math.round(eh * 0.62) - pupilR - 2
  let clampedY = Math.min(gy, downMax)
  const dist = Math.sqrt(gx * gx + clampedY * clampedY)
  if (dist > circleMax) {
    gx = (gx / dist) * circleMax
    clampedY = (clampedY / dist) * circleMax
  }
  return { gx, gy: clampedY }
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
  // Sclera — muted lavender close to the playfield background so the eye
  // reads as a subtle atmospheric element rather than a bright focal point.
  //
  const sg = ctx.createRadialGradient(CX, CY - EH * 0.15, EH * 0.3, CX, CY, EW)
  sg.addColorStop(0, '#7A7890')
  sg.addColorStop(0.65, '#6A6882')
  sg.addColorStop(1, '#5A5870')
  ctx.fillStyle = sg
  ctx.fillRect(0, 0, CW, CH)
  //
  // Iris base gradient — dark background-violet
  //
  const IX = CX, IY = CY
  const ig = ctx.createRadialGradient(IX, IY - irisR * 0.12, 4, IX, IY, irisR)
  ig.addColorStop(0, '#2A2040')
  ig.addColorStop(0.28, '#3A2E52')
  ig.addColorStop(0.55, '#302848')
  ig.addColorStop(0.82, '#241C38')
  ig.addColorStop(1, '#18122A')
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
