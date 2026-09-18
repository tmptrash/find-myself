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
const LOADER_BAR_CREEP_PER_SEC = 22
const LOADER_BAR_CREEP_HEADROOM = 12

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
  stopLoaderBarAnimation()
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
  loaderBarDisplayPct = Math.max(loaderBarDisplayPct, loaderBarReportedPct)
  bar.style.width = `${loaderBarDisplayPct}%`
  isLoaderVisible() && startLoaderBarAnimation()
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
    const creepCeiling = loaderBarReportedPct >= 100
      ? 100
      : Math.min(99, loaderBarReportedPct + LOADER_BAR_CREEP_HEADROOM)
    if (loaderBarDisplayPct < creepCeiling) {
      loaderBarDisplayPct = Math.min(
        creepCeiling,
        loaderBarDisplayPct + LOADER_BAR_CREEP_PER_SEC * dt
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
