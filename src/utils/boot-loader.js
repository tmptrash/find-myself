//
// Shared DOM loader (same markup as index.html). Fatal errors may replace
// innerHTML — ensureLoaderStructure() restores the bar before reuse.
//
const LOADER_INNER_HTML = `<div style="color: #888; font-size: 24px; margin-bottom: 20px;">Loading. Please wait...</div><div style="width: 325px; height: 4px; background: #333; border-radius: 2px; overflow: hidden;"><div id="loader-bar" style="width: 0%; height: 100%; background: #DC143C; transition: width 0.1s;"></div></div>`

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
// While real progress stalls on long main-thread work, the bar still creeps
// toward 99% from wall-clock time so the loader never looks frozen mid-way.
//
const LOADER_BAR_MIN_DRIFT_PER_SEC = 5.5
const LOADER_BAR_MIN_DRIFT_PER_SEC_BOOST = 9.5
//
// Glow bootstrap reports truth in bursts — faster creep keeps the bar moving
// between those reports so the screen reads as loading, not frozen.
//
export function setLoaderBarCreepBoost(boosted) {
  if (boosted) {
    loaderBarCreepPerSec = 48
    loaderBarCreepHeadroom = 22
  } else {
    loaderBarCreepPerSec = LOADER_BAR_CREEP_PER_SEC_DEFAULT
    loaderBarCreepHeadroom = LOADER_BAR_CREEP_HEADROOM_DEFAULT
  }
  isLoaderVisible() && startLoaderBarAnimation()
}

export function ensureLoaderStructure() {
  const loaderEl = document.getElementById('loader')
  if (!loaderEl) return
  if (!document.getElementById('loader-bar')) {
    loaderEl.innerHTML = LOADER_INNER_HTML
  }
}

export function showLoader() {
  ensureLoaderStructure()
  const loaderEl = document.getElementById('loader')
  if (!loaderEl) return
  loaderEl.style.display = 'flex'
  loaderBarReportedPct = 0
  loaderBarDisplayPct = 0
  loaderBarSessionStartMs = performance.now()
  const bar = document.getElementById('loader-bar')
  bar && (bar.style.width = '0%')
  startLoaderBarAnimation()
  document.querySelectorAll('canvas').forEach(canvas => {
    canvas.style.visibility = 'hidden'
  })
}

export function isLoaderVisible() {
  const loaderEl = document.getElementById('loader')
  return Boolean(loaderEl && loaderEl.style.display === 'flex')
}

export function hideLoader() {
  const bar = document.getElementById('loader-bar')
  bar && (bar.style.width = '100%')
  loaderBarDisplayPct = 100
  loaderBarReportedPct = Math.max(loaderBarReportedPct, 100)
  stopLoaderBarAnimation()
  setLoaderBarCreepBoost(false)
  const loaderEl = document.getElementById('loader')
  if (!loaderEl) return
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
function loaderBarTimeDriftTargetPct(ts) {
  const minDrift = loaderBarCreepPerSec >= 40
    ? LOADER_BAR_MIN_DRIFT_PER_SEC_BOOST
    : LOADER_BAR_MIN_DRIFT_PER_SEC
  const sessionSec = Math.max(0, (ts - loaderBarSessionStartMs) / 1000)
  return Math.min(99, sessionSec * minDrift)
}
function loaderBarCreepCeilingPct(ts) {
  if (loaderBarReportedPct >= 100) return 100
  const headroomCap = Math.min(99, loaderBarReportedPct + loaderBarCreepHeadroom)
  const timeCap = loaderBarTimeDriftTargetPct(ts)
  return Math.max(headroomCap, timeCap)
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
    const creepCeiling = loaderBarCreepCeilingPct(ts)
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
