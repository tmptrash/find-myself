import { CFG } from '../cfg.js'
import * as Cursor from './cursor.js'
import { focusGameCanvas } from './canvas-focus.js'
//
// Shared DOM loader. Fatal errors may replace innerHTML —
// ensureLoaderStructure() rebuilds the eye before reuse.
//
const LOADER_MESSAGE_ID = 'loader-message'
const LOADER_PANEL_ID = 'loader-panel'
const LOADER_EYE_ID = 'loader-eye'
const LOADER_MESSAGE_TEXT = 'Loading. Please wait...'
const SVG_NS = 'http://www.w3.org/2000/svg'
//
// Panel chrome over CRT snow: near-opaque plate so the eye never drowns.
//
const LOADER_PANEL_BG_OVER_CRT = 'rgba(14, 20, 26, 0.97)'
const LOADER_PANEL_SHADOW_OVER_CRT = '0 0 0 1px rgba(216, 228, 236, 0.18), 0 10px 60px rgba(0, 0, 0, 0.95)'
const LOADER_UI_FADE_SEC = 0.32
//
// Stalk-eye geometry (SVG user units = CSS px): the Glow chain-buoy eye-berry
// lying on its side. Red contoured stalk with a lit line, side spikes on each
// joint, white berry with shaded underside and a dark pupil on the tip.
//
const EYE_VIEW_W = 360
const EYE_VIEW_H = 96
const STALK_ROOT_X = 14
const STALK_Y = EYE_VIEW_H / 2
const STALK_SEGMENT_LEN = 30
const STALK_SEGMENT_W = 7
const STALK_CONTOUR_PAD = 2
const STALK_LIGHT_FRAC = 0.35
const STALK_JOINT_R = STALK_SEGMENT_W * 0.5
const SPIKE_LEN = STALK_SEGMENT_W * 2.6
const SPIKE_LEN_WOBBLE = STALK_SEGMENT_W * 0.35
const SPIKE_LEAN_BACK = STALK_SEGMENT_W * 0.35
const SPIKE_W = STALK_SEGMENT_W * 0.72
const SPIKE_BALL_R = STALK_SEGMENT_W * 0.95
const STALK_WAVE_AMP = 7
const STALK_WAVE_FREQ = 0.045
const STALK_WAVE_SPEED = 2.2
const EYE_R = 12
const EYE_CONTOUR_W = 1.5
const EYE_BERRY_SHADE_DROP = 0.22
const EYE_BERRY_FACE_FRAC = 0.86
const EYE_PUPIL_FRAC = 0.4
const EYE_PUPIL_R = EYE_R * EYE_PUPIL_FRAC
const EYE_LID_W = 1.4
const EYE_LID_SPAN = 0.85
const STALK_MAX_LEN = EYE_VIEW_W - STALK_ROOT_X - EYE_R * 2 - EYE_CONTOUR_W * 2
//
// Pupil saccades: a quick dart to a random spot, then a hold, as if the eye
// is tracking something that keeps moving around the screen.
//
const PUPIL_MAX_OFFSET = EYE_R - EYE_PUPIL_R - 1
const PUPIL_DART_RATE = 22
const PUPIL_HOLD_MIN_SEC = 0.25
const PUPIL_HOLD_MAX_SEC = 1.3
const PUPIL_MIN_REACH = 0.35
const PUPIL_CENTER_CHANCE = 0.15
//
// Occasional blink: a closed lid on the berry, like the level's buoys.
//
const BLINK_SEC = 0.14
const BLINK_GAP_MIN_SEC = 2.4
const BLINK_GAP_MAX_SEC = 5
const MAX_FRAME_DT = 0.05
//
// Optional owner of the hide sequence (CRT intro keeps snow running after the bar finishes).
//
let loaderHideHandler = null

export const DEFAULT_GPU_YIELD_FRAMES = 2
//
// Reported progress (truth) vs displayed stalk length (smooth creep between reports).
//
let loaderBarReportedPct = 0
let loaderBarDisplayPct = 0
let loaderBarAnimFrame = null
let loaderBarCreepPerSec = 22
let loaderBarCreepHeadroom = 12
const LOADER_BAR_CREEP_PER_SEC_DEFAULT = 22
const LOADER_BAR_CREEP_HEADROOM_DEFAULT = 12
//
// Displayed length may creep slightly ahead of the last reported value (headroom)
// so short gaps between yields still show motion — never past reported + headroom.
//
const LOADER_BAR_CREEP_HEADROOM_BOOST = 16
const LOADER_BAR_CREEP_PER_SEC_BOOST = 20
//
// The stalk never jumps to a report: it catches up at a speed proportional to
// the gap (bounded), so bursts of progress still read as steady growth.
//
const LOADER_BAR_CATCHUP_GAIN = 1.6
const LOADER_BAR_CATCHUP_MAX_PER_SEC = 45
//
// On hide the stalk first grows to its full length, holds a beat, then the
// loader goes. The timeout covers a paused rAF (background tab).
//
const LOADER_FINISH_PER_SEC = 140
const LOADER_FINISH_HOLD_SEC = 0.15
const LOADER_FINISH_TIMEOUT_SEC = 2
const LOADER_Z_DEFAULT = '9999'
const LOADER_Z_OVER_CRT = '10001'
const LOADER_BG_OPAQUE = '#000000'
const LOADER_BG_TRANSPARENT = 'transparent'
//
// Live SVG nodes and animation state of the loader eye.
//
let eye = null
//
// Finish run: stalk grows to 100% before hiding; showLoader() bumps the token
// to cancel a pending hide and keep the same session going.
//
let loaderFinishing = false
let loaderFinishWaiters = []
let loaderHideToken = 0

/**
 * Glow bootstrap reports truth in bursts — creep keeps the stalk growing
 * between those reports so the screen reads as loading, not frozen.
 * @param {boolean} boosted - Faster creep with more headroom
 */
export function setLoaderBarCreepBoost(boosted) {
  if (boosted) {
    loaderBarCreepPerSec = LOADER_BAR_CREEP_PER_SEC_BOOST
    loaderBarCreepHeadroom = LOADER_BAR_CREEP_HEADROOM_BOOST
  } else {
    loaderBarCreepPerSec = LOADER_BAR_CREEP_PER_SEC_DEFAULT
    loaderBarCreepHeadroom = LOADER_BAR_CREEP_HEADROOM_DEFAULT
  }
  isLoaderVisible() && startLoaderBarAnimation()
}
/**
 * Builds the loader panel (caption + eye on a stalk) if it is missing.
 */
export function ensureLoaderStructure() {
  const loaderEl = document.getElementById('loader')
  if (!loaderEl) return
  if (document.getElementById(LOADER_PANEL_ID) && document.getElementById(LOADER_EYE_ID)) return
  loaderEl.innerHTML = ''
  loaderEl.appendChild(buildLoaderPanel())
}
/**
 * Lets a caller take over hideLoader() (e.g. CRT snow outro). The handler
 * receives `finish`, which performs the normal hide.
 * @param {Function|null} handler
 */
export function setLoaderHideHandler(handler) {
  loaderHideHandler = handler
}
/**
 * Grows the stalk to full length, then fades the loader UI out and hides it —
 * the full-screen backdrop (if any) is left to the caller. The pupil keeps
 * watching during the hold and the fade.
 * @param {number} holdSec - How long the full stalk stays visible before fading
 * @returns {Promise<void>}
 */
export function completeAndFadeOutLoaderUi(holdSec) {
  const loaderEl = document.getElementById('loader')
  if (!loaderEl) return Promise.resolve()
  return growStalkToEnd().then(() => wait(holdSec)).then(() => {
    loaderEl.style.transition = `opacity ${LOADER_UI_FADE_SEC}s ease-out`
    loaderEl.style.opacity = '0'
    return wait(LOADER_UI_FADE_SEC)
  }).then(() => {
    loaderEl.style.transition = ''
    finishHideLoader()
    loaderEl.style.opacity = '1'
  })
}
/**
 * Shows the full-screen loader and takes the mouse cursor away until it hides.
 * @param {Object} [opts]
 * @param {boolean} [opts.transparentBackdrop] - Let a CRT/snow layer show through
 * @param {boolean} [opts.elevatedZ] - Draw above the TV intro canvas
 * @param {string[]} [opts.keepCanvasIds] - Do not hide these canvases (TV overlay)
 * @param {boolean} [opts.preserveBar] - Keep current stalk length (re-show only)
 */
export function showLoader(opts = {}) {
  ensureLoaderStructure()
  const loaderEl = document.getElementById('loader')
  if (!loaderEl) return
  //
  // Re-showing a loader still on screen (or finishing) continues the same
  // session: the pending hide is dropped and the stalk keeps its length.
  //
  const continuing = isLoaderVisible()
  loaderHideToken++
  loaderFinishing = false
  loaderEl.style.display = 'flex'
  loaderEl.style.background = opts.transparentBackdrop ? LOADER_BG_TRANSPARENT : LOADER_BG_OPAQUE
  loaderEl.style.zIndex = opts.elevatedZ ? LOADER_Z_OVER_CRT : LOADER_Z_DEFAULT
  setLoaderPanelOverCrt(opts.transparentBackdrop === true)
  Cursor.setHiddenByLoader(true)
  if (!opts.preserveBar && !continuing) {
    loaderBarReportedPct = 0
    loaderBarDisplayPct = 0
  }
  drawLoaderEye(0)
  startLoaderBarAnimation()
  const keepIds = opts.keepCanvasIds ?? []
  document.querySelectorAll('canvas').forEach(canvas => {
    keepIds.includes(canvas.id) || (canvas.style.visibility = 'hidden')
  })
}
/**
 * Opaque loader backdrop again after the CRT intro canvas is removed.
 */
export function restoreLoaderDefaultBackdrop() {
  const loaderEl = document.getElementById('loader')
  if (!loaderEl || loaderEl.style.display !== 'flex') return
  loaderEl.style.background = LOADER_BG_OPAQUE
  loaderEl.style.zIndex = LOADER_Z_DEFAULT
}
/**
 * @returns {boolean} True while the loader overlay is on screen
 */
export function isLoaderVisible() {
  const loaderEl = document.getElementById('loader')
  return Boolean(loaderEl && loaderEl.style.display === 'flex')
}
/**
 * Hides the loader, or hands the hide over to a registered outro handler.
 * The stalk always grows to its full length first, so the loader never
 * vanishes halfway.
 */
export function hideLoader() {
  if (loaderHideHandler) {
    const handler = loaderHideHandler
    loaderHideHandler = null
    handler()
    return
  }
  if (!isLoaderVisible()) {
    finishHideLoader()
    return
  }
  const token = ++loaderHideToken
  growStalkToEnd()
    .then(() => wait(LOADER_FINISH_HOLD_SEC))
    .then(() => token === loaderHideToken && finishHideLoader())
}
/**
 * Reports loading progress. The stalk never shrinks within one visible
 * session — a new phase reporting from 0 only pauses its growth.
 * @param {number} pct - Progress 0..100
 */
export function setLoaderBarPct(pct) {
  const clamped = Math.min(100, Math.max(0, pct))
  if (clamped === 0) {
    loaderBarReportedPct = 0
    return
  }
  if (clamped <= loaderBarReportedPct) return
  loaderBarReportedPct = clamped
  isLoaderVisible() && startLoaderBarAnimation()
}
/**
 * Resolves after the given number of animation frames.
 * @param {number} [frames=DEFAULT_GPU_YIELD_FRAMES]
 * @returns {Promise<void>}
 */
export function yieldForGpu(frames = DEFAULT_GPU_YIELD_FRAMES) {
  return new Promise(resolve => {
    function waitFrames(framesLeft) {
      if (framesLeft <= 0) {
        resolve()
        return
      }
      requestAnimationFrame(() => waitFrames(framesLeft - 1))
    }
    waitFrames(frames)
  })
}
/**
 * Replaces the loader with an error message and gives the cursor back.
 * @param {string} message
 */
export function showFatalLoaderError(message) {
  const loaderEl = document.getElementById('loader')
  if (!loaderEl) return
  stopLoaderBarAnimation()
  eye = null
  Cursor.setHiddenByLoader(false)
  loaderEl.innerHTML = `<div style="color:#fff;font-family:monospace;text-align:center;padding:24px">${message}</div>`
  loaderEl.style.display = 'flex'
}

//
// Resolves once the stalk is drawn at full length (or after the timeout when
// rAF is paused and the stalk cannot grow).
//
function growStalkToEnd() {
  loaderFinishing = true
  loaderBarReportedPct = 100
  startLoaderBarAnimation()
  const grown = new Promise(resolve => {
    loaderBarDisplayPct >= 100 ? resolve() : loaderFinishWaiters.push(resolve)
  })
  return Promise.race([grown, wait(LOADER_FINISH_TIMEOUT_SEC)])
}

function resolveFinishWaiters() {
  const waiters = loaderFinishWaiters
  loaderFinishWaiters = []
  waiters.forEach(resolve => resolve())
}

function finishHideLoader() {
  loaderBarDisplayPct = 100
  loaderBarReportedPct = Math.max(loaderBarReportedPct, 100)
  loaderFinishing = false
  resolveFinishWaiters()
  stopLoaderBarAnimation()
  setLoaderBarCreepBoost(false)
  Cursor.setHiddenByLoader(false)
  const loaderEl = document.getElementById('loader')
  if (!loaderEl) return
  setLoaderPanelOverCrt(false)
  restoreLoaderDefaultBackdrop()
  loaderEl.style.display = 'none'
  document.querySelectorAll('canvas').forEach(canvas => {
    canvas.style.visibility = 'visible'
  })
  focusGameCanvas()
}
//
// Caption above the eye; the panel turns into a plate over CRT snow.
//
function buildLoaderPanel() {
  const colors = CFG.visual.colors.loader
  const panel = document.createElement('div')
  panel.id = LOADER_PANEL_ID
  Object.assign(panel.style, {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '28px 40px',
    borderRadius: '8px',
    background: 'transparent'
  })
  const message = document.createElement('div')
  message.id = LOADER_MESSAGE_ID
  message.textContent = LOADER_MESSAGE_TEXT
  Object.assign(message.style, {
    color: colors.message,
    fontSize: '24px',
    marginBottom: '12px',
    textShadow: '0 2px 6px rgba(0, 0, 0, 1)'
  })
  panel.appendChild(message)
  panel.appendChild(buildLoaderEyeSvg(colors))
  return panel
}
//
// SVG scene: contoured red stalk, spikes, knots, then the eye-berry.
//
function buildLoaderEyeSvg(colors) {
  const svg = svgEl('svg', {
    id: LOADER_EYE_ID,
    width: EYE_VIEW_W,
    height: EYE_VIEW_H,
    viewBox: `0 0 ${EYE_VIEW_W} ${EYE_VIEW_H}`
  })
  svg.style.overflow = 'visible'
  const stalkContour = svgEl('path', strokeAttrs(colors.contour, STALK_SEGMENT_W + STALK_CONTOUR_PAD))
  const stalkBody = svgEl('path', strokeAttrs(colors.stem, STALK_SEGMENT_W))
  const stalkLight = svgEl('path', strokeAttrs(colors.stemLight, STALK_SEGMENT_W * STALK_LIGHT_FRAC))
  const spikes = svgEl('path', strokeAttrs(colors.stem, SPIKE_W))
  const knots = svgEl('path', { fill: colors.stem })
  const eyeGroup = svgEl('g', {})
  const openEye = svgEl('g', {})
  appendLoaderBerryBall(openEye, colors, 0, 0)
  const pupil = svgEl('circle', { r: EYE_PUPIL_R, fill: colors.pupil })
  openEye.appendChild(pupil)
  const closedEye = svgEl('g', { display: 'none' })
  appendLoaderBerryBall(closedEye, colors, 0, 0)
  closedEye.appendChild(svgEl('line', {
    x1: -EYE_R * EYE_LID_SPAN,
    x2: EYE_R * EYE_LID_SPAN,
    y1: 0,
    y2: 0,
    stroke: colors.contour,
    'stroke-width': EYE_LID_W,
    'stroke-linecap': 'round'
  }))
  eyeGroup.appendChild(openEye)
  eyeGroup.appendChild(closedEye)
  svg.appendChild(stalkContour)
  svg.appendChild(stalkBody)
  svg.appendChild(stalkLight)
  svg.appendChild(spikes)
  svg.appendChild(knots)
  svg.appendChild(eyeGroup)
  eye = {
    stalkContour,
    stalkBody,
    stalkLight,
    spikes,
    knots,
    eyeGroup,
    openEye,
    closedEye,
    pupil,
    time: 0,
    pupilX: 0,
    pupilY: 0,
    targetX: 0,
    targetY: 0,
    holdLeft: 0,
    blinkLeft: 0,
    blinkGap: randomRange(BLINK_GAP_MIN_SEC, BLINK_GAP_MAX_SEC)
  }
  return svg
}

function strokeAttrs(color, width) {
  return {
    fill: 'none',
    stroke: color,
    'stroke-width': width,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round'
  }
}
//
// Eye-berry stack matching the in-level chain-buoy (contour, shade, lit face).
//
function appendLoaderBerryBall(parent, colors, cx, cy) {
  parent.appendChild(svgEl('circle', {
    cx,
    cy,
    r: EYE_R + EYE_CONTOUR_W,
    fill: colors.contour
  }))
  parent.appendChild(svgEl('circle', {
    cx,
    cy,
    r: EYE_R,
    fill: colors.berryShade
  }))
  parent.appendChild(svgEl('circle', {
    cx,
    cy: cy - EYE_R * EYE_BERRY_SHADE_DROP,
    r: EYE_R * EYE_BERRY_FACE_FRAC,
    fill: colors.berry
  }))
}

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag)
  Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, String(value)))
  return el
}
//
// Advances the pupil / blink state and redraws the stalk at the shown progress.
//
function drawLoaderEye(dt) {
  if (!eye) return
  eye.time += dt
  tickPupilSaccade(dt)
  const closed = tickBlink(dt)
  const len = STALK_MAX_LEN * loaderBarDisplayPct / 100
  const points = buildStalkPoints(STALK_ROOT_X + len)
  const joints = points.slice(1, -1)
  const tip = points[points.length - 1]
  const spikeTips = joints.map((p, i) => spikeTipFor(p, i))
  const stalkPath = pointsToPath(points)
  eye.stalkContour.setAttribute('d', stalkPath)
  eye.stalkBody.setAttribute('d', stalkPath)
  eye.stalkLight.setAttribute('d', stalkPath)
  eye.spikes.setAttribute('d', joints.map((p, i) => linePath(p, spikeTips[i])).join(' '))
  eye.knots.setAttribute('d', [
    ...joints.map(p => circlePath(p.x, p.y, STALK_JOINT_R)),
    ...spikeTips.map(p => circlePath(p.x, p.y, SPIKE_BALL_R))
  ].join(' '))
  eye.eyeGroup.setAttribute('transform', `translate(${tip.x + EYE_R} ${tip.y})`)
  eye.openEye.setAttribute('display', closed ? 'none' : 'inline')
  eye.closedEye.setAttribute('display', closed ? 'inline' : 'none')
  eye.pupil.setAttribute('cx', eye.pupilX.toFixed(2))
  eye.pupil.setAttribute('cy', eye.pupilY.toFixed(2))
}
//
// Joints every segment length plus the partial tip; the wave grows from zero
// at the root, so the knot stays planted while the tip (and the eye) sways.
//
function buildStalkPoints(tipX) {
  const points = []
  for (let x = STALK_ROOT_X; x < tipX; x += STALK_SEGMENT_LEN) {
    points.push({ x, y: stalkYAt(x) })
  }
  points.push({ x: tipX, y: stalkYAt(tipX) })
  return points
}
//
// Spikes alternate up / down per joint with a fixed per-joint length wobble,
// leaning back toward the root like the buoy arms droop toward the ground.
//
function spikeTipFor(joint, index) {
  const side = index % 2 === 0 ? -1 : 1
  const len = SPIKE_LEN + Math.sin(index * 1.17) * SPIKE_LEN_WOBBLE
  return { x: joint.x - SPIKE_LEAN_BACK, y: joint.y + side * len }
}

function linePath(a, b) {
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`
}

function circlePath(cx, cy, r) {
  return `M${(cx - r).toFixed(1)} ${cy.toFixed(1)} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`
}

function stalkYAt(x) {
  const along = (x - STALK_ROOT_X) / STALK_MAX_LEN
  const wave = Math.sin(x * STALK_WAVE_FREQ - eye.time * STALK_WAVE_SPEED)
  return STALK_Y + wave * STALK_WAVE_AMP * along
}

function pointsToPath(points) {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
}
//
// Quick dart toward the current target, hold, then pick a new spot (now and
// then straight ahead, so it reads as looking around rather than jittering).
//
function tickPupilSaccade(dt) {
  eye.holdLeft -= dt
  if (eye.holdLeft <= 0) {
    pickPupilTarget()
    eye.holdLeft = randomRange(PUPIL_HOLD_MIN_SEC, PUPIL_HOLD_MAX_SEC)
  }
  const ease = Math.min(1, dt * PUPIL_DART_RATE)
  eye.pupilX += (eye.targetX - eye.pupilX) * ease
  eye.pupilY += (eye.targetY - eye.pupilY) * ease
}

function pickPupilTarget() {
  if (Math.random() < PUPIL_CENTER_CHANCE) {
    eye.targetX = 0
    eye.targetY = 0
    return
  }
  const angle = Math.random() * Math.PI * 2
  const reach = PUPIL_MAX_OFFSET * randomRange(PUPIL_MIN_REACH, 1)
  eye.targetX = Math.cos(angle) * reach
  eye.targetY = Math.sin(angle) * reach
}
//
// Returns true while the lid is closed.
//
function tickBlink(dt) {
  if (eye.blinkLeft > 0) {
    eye.blinkLeft = Math.max(0, eye.blinkLeft - dt)
    return eye.blinkLeft > 0
  }
  eye.blinkGap -= dt
  if (eye.blinkGap > 0) return false
  eye.blinkLeft = BLINK_SEC
  eye.blinkGap = randomRange(BLINK_GAP_MIN_SEC, BLINK_GAP_MAX_SEC)
  return true
}

function randomRange(min, max) {
  return min + Math.random() * (max - min)
}
//
// Over CRT snow the panel turns into a solid plate so the caption and the eye
// never drown in the static.
//
function setLoaderPanelOverCrt(overCrt) {
  const panel = document.getElementById(LOADER_PANEL_ID)
  if (!panel) return
  panel.style.background = overCrt ? LOADER_PANEL_BG_OVER_CRT : 'transparent'
  panel.style.boxShadow = overCrt ? LOADER_PANEL_SHADOW_OVER_CRT : 'none'
}

function loaderBarCreepCeilingPct() {
  if (loaderFinishing || loaderBarReportedPct >= 100) return 100
  return Math.min(99, loaderBarReportedPct + loaderBarCreepHeadroom)
}
//
// Behind the last report the stalk catches up (bounded speed); past it, it
// creeps toward the headroom ceiling and slows as it nears it, so it never
// stops dead. A finish run grows it to the end at a fixed fast pace.
//
function stalkGrowthPerSec() {
  if (loaderFinishing) return LOADER_FINISH_PER_SEC
  const gap = loaderBarReportedPct - loaderBarDisplayPct
  if (gap > 0) {
    return Math.min(LOADER_BAR_CATCHUP_MAX_PER_SEC,
      Math.max(loaderBarCreepPerSec, gap * LOADER_BAR_CATCHUP_GAIN))
  }
  const room = loaderBarCreepCeilingPct() - loaderBarDisplayPct
  return loaderBarCreepPerSec * Math.max(0, room / loaderBarCreepHeadroom)
}
//
// One rAF loop per visible loader: grows the stalk and keeps the eye alive.
//
function startLoaderBarAnimation() {
  if (loaderBarAnimFrame != null) return
  let lastTs = performance.now()
  const step = (ts) => {
    if (!isLoaderVisible()) {
      loaderBarAnimFrame = null
      return
    }
    const dt = Math.min(MAX_FRAME_DT, Math.max(0, (ts - lastTs) / 1000))
    lastTs = ts
    const ceiling = loaderBarCreepCeilingPct()
    loaderBarDisplayPct < ceiling &&
      (loaderBarDisplayPct = Math.min(ceiling, loaderBarDisplayPct + stalkGrowthPerSec() * dt))
    drawLoaderEye(dt)
    loaderBarDisplayPct >= 100 && resolveFinishWaiters()
    loaderBarAnimFrame = requestAnimationFrame(step)
  }
  loaderBarAnimFrame = requestAnimationFrame(step)
}

function stopLoaderBarAnimation() {
  loaderBarAnimFrame != null && cancelAnimationFrame(loaderBarAnimFrame)
  loaderBarAnimFrame = null
}

function wait(sec) {
  return new Promise(resolve => setTimeout(resolve, sec * 1000))
}
