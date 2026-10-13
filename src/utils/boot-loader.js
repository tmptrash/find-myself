import * as LoaderCrt from './loader-crt.js'
//
// Shared DOM loader (same markup as index.html). Fatal errors may replace
// innerHTML — ensureLoaderStructure() restores the bar before reuse.
//
const LOADER_INNER_HTML = `<div id="loader-panel"><div id="loader-message">Loading. Please wait...</div><div id="loader-track"><div id="loader-bar"></div></div></div>`
//
// Panel chrome over CRT snow: near-opaque plate, bright type, thick glowing bar.
//
const LOADER_PANEL_BG_OVER_CRT = 'rgba(14, 20, 26, 0.97)'
const LOADER_PANEL_SHADOW_OVER_CRT = '0 0 0 1px rgba(216, 228, 236, 0.18), 0 10px 60px rgba(0, 0, 0, 0.95)'
const LOADER_MESSAGE_COLOR = '#ebf0ee'
const LOADER_TRACK_HEIGHT_OVER_CRT = '6px'
const LOADER_TRACK_HEIGHT_DEFAULT = '4px'
const LOADER_UI_FADE_SEC = 0.32
//
// Optional owner of the hide sequence (CRT intro keeps snow running after the bar finishes).
//
let loaderHideHandler = null
//
// Old-TV layer over the plain loader; the TV intro canvas brings its own glass.
//
let loaderCrt = null

export const DEFAULT_GPU_YIELD_FRAMES = 2
//
// Reported progress (truth) vs displayed width (smooth creep between reports).
//
let loaderBarReportedPct = 0
let loaderBarDisplayPct = 0
let loaderBarAnimFrame = null
let loaderBarCreepPerSec = 22
let loaderBarCreepHeadroom = 12
let loaderBarSessionStartMs = 0
const LOADER_BAR_CREEP_PER_SEC_DEFAULT = 22
const LOADER_BAR_CREEP_HEADROOM_DEFAULT = 12
//
// Displayed width may creep slightly ahead of the last reported value (headroom)
// so short gaps between yields still show motion — never past reported + headroom.
//
const LOADER_BAR_CREEP_HEADROOM_BOOST = 16
const LOADER_BAR_CREEP_PER_SEC_BOOST = 20
const LOADER_Z_DEFAULT = '9999'
const LOADER_Z_OVER_CRT = '10001'
const LOADER_BG_OPAQUE = '#000000'
const LOADER_BG_TRANSPARENT = 'transparent'
//
// Glow bootstrap reports truth in bursts — creep keeps the bar moving
// between those reports so the screen reads as loading, not frozen.
//
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

export function ensureLoaderStructure() {
  const loaderEl = document.getElementById('loader')
  if (!loaderEl) return
  if (!document.getElementById('loader-panel')) {
    loaderEl.innerHTML = LOADER_INNER_HTML
    applyLoaderChromeStyles()
  }
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
 * Snaps the bar to 100%, then fades the loader UI out and hides it — the
 * full-screen backdrop (if any) is left to the caller.
 * @param {number} holdSec - How long the full bar stays visible before fading
 * @returns {Promise<void>}
 */
export function completeAndFadeOutLoaderUi(holdSec) {
  const bar = document.getElementById('loader-bar')
  bar && (bar.style.width = '100%')
  loaderBarDisplayPct = 100
  loaderBarReportedPct = 100
  stopLoaderBarAnimation()
  const loaderEl = document.getElementById('loader')
  if (!loaderEl) return Promise.resolve()
  return wait(holdSec).then(() => {
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
 * @param {Object} [opts]
 * @param {boolean} [opts.transparentBackdrop] - Let a CRT/snow layer show through
 * @param {boolean} [opts.elevatedZ] - Draw above the TV intro canvas
 * @param {string[]} [opts.keepCanvasIds] - Do not hide these canvases (TV overlay)
 * @param {boolean} [opts.preserveBar] - Keep current bar width (re-show only)
 */
export function showLoader(opts = {}) {
  ensureLoaderStructure()
  const loaderEl = document.getElementById('loader')
  if (!loaderEl) return
  loaderEl.style.display = 'flex'
  loaderEl.style.background = opts.transparentBackdrop ? LOADER_BG_TRANSPARENT : LOADER_BG_OPAQUE
  loaderEl.style.zIndex = opts.elevatedZ ? LOADER_Z_OVER_CRT : LOADER_Z_DEFAULT
  setLoaderPanelOverCrt(opts.transparentBackdrop === true)
  setLoaderCrtVisible(loaderEl, opts.transparentBackdrop !== true)
  if (!opts.preserveBar) {
    loaderBarReportedPct = 0
    loaderBarDisplayPct = 0
    loaderBarSessionStartMs = performance.now()
    const bar = document.getElementById('loader-bar')
    bar && (bar.style.width = '0%')
  }
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
  setLoaderCrtVisible(loaderEl, true)
}

export function isLoaderVisible() {
  const loaderEl = document.getElementById('loader')
  return Boolean(loaderEl && loaderEl.style.display === 'flex')
}

export function hideLoader() {
  if (!loaderHideHandler) {
    finishHideLoader()
    return
  }
  const handler = loaderHideHandler
  loaderHideHandler = null
  handler()
}
function finishHideLoader() {
  const bar = document.getElementById('loader-bar')
  bar && (bar.style.width = '100%')
  loaderBarDisplayPct = 100
  loaderBarReportedPct = Math.max(loaderBarReportedPct, 100)
  stopLoaderBarAnimation()
  setLoaderBarCreepBoost(false)
  const loaderEl = document.getElementById('loader')
  if (!loaderEl) return
  setLoaderPanelOverCrt(false)
  restoreLoaderDefaultBackdrop()
  setLoaderCrtVisible(loaderEl, false)
  loaderEl.style.display = 'none'
  document.querySelectorAll('canvas').forEach(canvas => {
    canvas.style.visibility = 'visible'
  })
}

export function setLoaderBarPct(pct) {
  const bar = document.getElementById('loader-bar')
  if (!bar) return
  const clamped = Math.min(100, Math.max(0, pct))
  if (clamped === 0) {
    loaderBarReportedPct = 0
    loaderBarDisplayPct = 0
    bar.style.width = '0%'
    return
  }
  if (clamped <= loaderBarReportedPct) return
  loaderBarReportedPct = clamped
  if (loaderBarDisplayPct < loaderBarReportedPct) {
    loaderBarDisplayPct = loaderBarReportedPct
    bar.style.width = `${loaderBarDisplayPct}%`
  }
  isLoaderVisible() && startLoaderBarAnimation()
}
function loaderBarCreepCeilingPct() {
  if (loaderBarReportedPct >= 100) return 100
  return Math.min(99, loaderBarReportedPct + loaderBarCreepHeadroom)
}
function startLoaderBarAnimation() {
  if (loaderBarAnimFrame != null) return
  let lastTs = performance.now()
  const step = (ts) => {
    const bar = document.getElementById('loader-bar')
    if (!bar || !isLoaderVisible()) {
      loaderBarAnimFrame = null
      return
    }
    const dt = Math.min(0.05, (ts - lastTs) / 1000)
    lastTs = ts
    const creepCeiling = loaderBarCreepCeilingPct()
    if (loaderBarDisplayPct < creepCeiling) {
      loaderBarDisplayPct = Math.min(
        creepCeiling,
        loaderBarDisplayPct + loaderBarCreepPerSec * dt
      )
      bar.style.width = `${loaderBarDisplayPct}%`
    }
    loaderBarAnimFrame = requestAnimationFrame(step)
  }
  loaderBarAnimFrame = requestAnimationFrame(step)
}
function stopLoaderBarAnimation() {
  loaderBarAnimFrame != null && cancelAnimationFrame(loaderBarAnimFrame)
  loaderBarAnimFrame = null
}

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

export function showFatalLoaderError(message) {
  const loaderEl = document.getElementById('loader')
  if (!loaderEl) return
  loaderEl.innerHTML = `<div style="color:#fff;font-family:monospace;text-align:center;padding:24px">${message}</div>`
  loaderEl.style.display = 'flex'
}
//
// Readable loader chrome on top of CRT snow (panel + high-contrast type).
//
function applyLoaderChromeStyles() {
  const panel = document.getElementById('loader-panel')
  const message = document.getElementById('loader-message')
  const track = document.getElementById('loader-track')
  const bar = document.getElementById('loader-bar')
  panel && Object.assign(panel.style, {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '28px 40px',
    borderRadius: '8px',
    background: 'transparent'
  })
  message && Object.assign(message.style, {
    color: LOADER_MESSAGE_COLOR,
    fontSize: '24px',
    marginBottom: '20px',
    textShadow: '0 2px 6px rgba(0, 0, 0, 1)'
  })
  track && Object.assign(track.style, {
    width: '325px',
    height: LOADER_TRACK_HEIGHT_DEFAULT,
    background: '#333',
    borderRadius: '3px',
    overflow: 'hidden'
  })
  bar && Object.assign(bar.style, {
    width: '0%',
    height: '100%',
    background: '#DC143C',
    transition: 'width 0.1s'
  })
}
//
// Over CRT snow the panel turns into a solid plate so text and bar never drown.
//
function setLoaderPanelOverCrt(overCrt) {
  const panel = document.getElementById('loader-panel')
  const track = document.getElementById('loader-track')
  const bar = document.getElementById('loader-bar')
  if (!panel) return
  panel.style.background = overCrt ? LOADER_PANEL_BG_OVER_CRT : 'transparent'
  panel.style.boxShadow = overCrt ? LOADER_PANEL_SHADOW_OVER_CRT : 'none'
  track && (track.style.height = overCrt ? LOADER_TRACK_HEIGHT_OVER_CRT : LOADER_TRACK_HEIGHT_DEFAULT)
  bar && (bar.style.boxShadow = overCrt ? '0 0 12px rgba(220, 20, 60, 0.85)' : 'none')
}

function setLoaderCrtVisible(loaderEl, visible) {
  !loaderCrt && visible && (loaderCrt = LoaderCrt.create(loaderEl))
  LoaderCrt.setVisible(loaderCrt, visible)
}

function wait(sec) {
  return new Promise(resolve => setTimeout(resolve, sec * 1000))
}
