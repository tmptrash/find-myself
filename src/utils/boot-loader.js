//
// Shared DOM loader (same markup as index.html). Fatal errors may replace
// innerHTML — ensureLoaderStructure() restores the bar before reuse.
//
const LOADER_INNER_HTML = `<div style="color: #888; font-size: 24px; margin-bottom: 20px;">Loading. Please wait...</div><div style="width: 325px; height: 4px; background: #333; border-radius: 2px; overflow: hidden;"><div id="loader-bar" style="width: 0%; height: 100%; background: #DC143C; transition: width 0.1s;"></div></div>`

export const DEFAULT_GPU_YIELD_FRAMES = 2

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
}

export function hideLoader() {
  const loaderEl = document.getElementById('loader')
  if (!loaderEl) return
  loaderEl.style.display = 'none'
}

export function setLoaderBarPct(pct) {
  const bar = document.getElementById('loader-bar')
  if (!bar) return
  bar.style.width = `${Math.min(100, Math.max(0, pct))}%`
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
