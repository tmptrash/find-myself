// URL flag that turns the readout on (e.g. /?scene=lesson-forest.0&perf=1)
const URL_FLAG = 'perf'
const WINDOW_MS = 3000
const REFRESH_MS = 500
const MS_PER_SEC = 1000
const P50 = 0.5
const P95 = 0.95
const STYLE = 'position:fixed;top:4px;right:4px;z-index:99999;background:#000a;color:#fff;font:11px monospace;padding:4px 6px;border-radius:4px;white-space:pre;pointer-events:none'

/**
 * Debug readout (only with `?perf=1`): rAF frame time p50 / p95 over the last
 * seconds plus what the browser gives the page (window size, pixel ratio,
 * canvas buffer and CSS size, fullscreen), so a frame-rate difference between
 * window modes on a device can be traced to its cause. A DOM element outside
 * the canvas, so it costs no GPU time.
 * @returns {Object|null} Readout inst, null when the flag is absent
 */
export function create() {
  if (!new URLSearchParams(window.location.search).has(URL_FLAG)) return null
  const el = document.createElement('div')
  el.style.cssText = STYLE
  document.body.appendChild(el)
  const inst = { el, samples: [], lastT: 0, lastShow: 0 }
  requestAnimationFrame(t => onFrame(inst, t))
  return inst
}

// Samples one rAF delta, drops old ones and refreshes the text twice a second
function onFrame(inst, t) {
  inst.lastT && inst.samples.push({ t, dt: t - inst.lastT })
  inst.lastT = t
  while (inst.samples.length && inst.samples[0].t < t - WINDOW_MS) inst.samples.shift()
  t - inst.lastShow > REFRESH_MS && show(inst, t)
  requestAnimationFrame(next => onFrame(inst, next))
}

// Writes frame stats and the page / canvas geometry
function show(inst, t) {
  inst.lastShow = t
  if (!inst.samples.length) return
  const sorted = inst.samples.map(s => s.dt).sort((a, b) => a - b)
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length
  const at = q => sorted[Math.floor(sorted.length * q)].toFixed(1)
  const canvas = document.querySelector('canvas')
  const rect = canvas?.getBoundingClientRect()
  inst.el.textContent =
    `fps ${(MS_PER_SEC / avg).toFixed(0)}  p50 ${at(P50)}  p95 ${at(P95)} ms\n` +
    `win ${window.innerWidth}x${window.innerHeight} dpr ${window.devicePixelRatio}\n` +
    `canvas buf ${canvas?.width}x${canvas?.height} css ${rect?.width.toFixed(0)}x${rect?.height.toFixed(0)}\n` +
    `fullscreen ${Boolean(document.fullscreenElement)}`
}
