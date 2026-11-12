// URL flag that turns the probe on (e.g. /?scene=lesson-forest.0&perf=1)
const URL_FLAG = 'perf'
const PANEL_ID = 'perf-probe-panel'
const WINDOW_SEC = 3
const MS_PER_SEC = 1000
const P50 = 0.5
const P95 = 0.95
const PANEL_REFRESH_MS = 500
const PANEL_STYLE = 'position:fixed;top:8px;right:8px;z-index:99999;background:#000c;color:#fff;font:12px monospace;padding:6px;border-radius:6px;display:flex;flex-direction:column;gap:4px'
const OFF_STYLE = 'opacity:0.45;text-decoration:line-through'

/**
 * Creates a debug probe: a DOM panel (outside the canvas, so it costs no GPU time)
 * showing rAF frame time p50 / p95 over the last seconds, plus one toggle per level
 * layer, so each layer's effect on the frame time can be measured on a real device.
 * Returns null unless the page URL has `?perf=1`.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay inst
 * @param {string[]} cfg.layers - Names of layers that can be switched off
 * @returns {Object|null} Probe inst
 */
export function create(cfg) {
  const { k, layers } = cfg
  if (!new URLSearchParams(window.location.search).has(URL_FLAG)) return null
  document.getElementById(PANEL_ID)?.remove()
  const panel = document.createElement('div')
  panel.id = PANEL_ID
  panel.style.cssText = PANEL_STYLE
  const stats = document.createElement('div')
  panel.appendChild(stats)
  const inst = { off: new Set(), samples: [], stats, panel, lastT: 0, lastShow: 0, rafId: 0, alive: true }
  layers.forEach(name => panel.appendChild(createToggle(inst, name)))
  document.body.appendChild(panel)
  inst.rafId = requestAnimationFrame(t => onFrame(inst, t))
  k.onSceneLeave(() => destroy(inst))
  return inst
}

/**
 * Tells whether a layer is switched off. Safe to call with a null probe.
 * @param {Object|null} inst - Probe inst
 * @param {string} name - Layer name
 * @returns {boolean} True when the layer must not be drawn
 */
export function isOff(inst, name) {
  return Boolean(inst) && inst.off.has(name)
}

/**
 * Removes the panel and stops sampling.
 * @param {Object} inst - Probe inst
 */
export function destroy(inst) {
  inst.alive = false
  cancelAnimationFrame(inst.rafId)
  inst.panel.remove()
}

// Samples one rAF delta and refreshes the numbers twice a second
function onFrame(inst, t) {
  if (!inst.alive) return
  inst.lastT && inst.samples.push({ t, dt: t - inst.lastT })
  inst.lastT = t
  const from = t - WINDOW_SEC * MS_PER_SEC
  while (inst.samples.length && inst.samples[0].t < from) inst.samples.shift()
  t - inst.lastShow > PANEL_REFRESH_MS && showStats(inst, t)
  inst.rafId = requestAnimationFrame(next => onFrame(inst, next))
}

// Writes fps, p50 and p95 of the sampled frame times into the panel
function showStats(inst, t) {
  inst.lastShow = t
  if (!inst.samples.length) return
  const sorted = inst.samples.map(s => s.dt).sort((a, b) => a - b)
  const at = q => sorted[Math.floor(sorted.length * q)]
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length
  inst.stats.textContent = `fps ${(MS_PER_SEC / avg).toFixed(1)}  p50 ${at(P50).toFixed(1)}  p95 ${at(P95).toFixed(1)} ms`
}

// Button that flips one layer on or off
function createToggle(inst, name) {
  const btn = document.createElement('button')
  btn.textContent = name
  btn.onclick = () => toggleLayer(inst, btn, name)
  return btn
}

// Flips the layer's flag and dims its button while the layer is off
function toggleLayer(inst, btn, name) {
  const wasOff = inst.off.delete(name)
  wasOff || inst.off.add(name)
  btn.style.cssText = wasOff ? '' : OFF_STYLE
}
