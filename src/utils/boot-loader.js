//
// Shared DOM loader (same markup as index.html). Fatal errors may replace
// innerHTML — ensureLoaderStructure() restores the bar before reuse.
//
const LOADER_INNER_HTML = `<div style="color: #888; font-size: 24px; margin-bottom: 20px;">Loading. Please wait...</div><div style="width: 325px; height: 4px; background: #333; border-radius: 2px; overflow: hidden;"><div id="loader-bar" style="width: 0%; height: 100%; background: #DC143C; transition: width 0.1s;"></div></div>`

export const DEFAULT_GPU_YIELD_FRAMES = 2
//
// DOM bar never moves backward within one loader session (explicit 0 resets).
//
let loaderBarMaxPct = 0

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
  loaderBarMaxPct = 0
  const bar = document.getElementById('loader-bar')
  bar && (bar.style.width = '0%')
  document.querySelectorAll('canvas').forEach(canvas => {
    canvas.style.visibility = 'hidden'
  })
}

export function isLoaderVisible() {
  const loaderEl = document.getElementById('loader')
  return Boolean(loaderEl && loaderEl.style.display === 'flex')
}

export function hideLoader() {
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
    loaderBarMaxPct = 0
    bar.style.width = '0%'
    return
  }
  if (clamped <= loaderBarMaxPct) return
  loaderBarMaxPct = clamped
  bar.style.width = `${loaderBarMaxPct}%`
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
