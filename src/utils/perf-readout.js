import { getResizeRebootCount } from './window-resize.js'
import { get, set } from './progress.js'
//
// URL flag that turns the readout on (e.g. /?scene=lesson-forest.0&perf=1).
// A Home Screen app starts at the manifest's start_url and keeps its own
// storage, so there the readout is toggled by a tap with TOGGLE_TOUCHES
// fingers instead and the choice is remembered under PROGRESS_KEY.
//
const URL_FLAG = 'perf'
const PROGRESS_KEY = 'perfReadout'
const TOGGLE_TOUCHES = 3
const STANDALONE_QUERY = '(display-mode: standalone), (display-mode: fullscreen)'
const WINDOW_MS = 3000
const REFRESH_MS = 500
const MS_PER_SEC = 1000
const P50 = 0.5
const P95 = 0.95
const STYLE = 'position:fixed;top:4px;right:4px;z-index:99999;background:#000a;color:#fff;font:11px monospace;padding:4px 6px;border-radius:4px;white-space:pre;pointer-events:none'

/**
 * Debug readout (with `?perf=1`, or toggled by a three-finger tap): rAF frame time p50 / p95 over the last
 * seconds plus what the browser gives the page (window size, pixel ratio,
 * canvas buffer and CSS size, fullscreen), so a frame-rate difference between
 * window modes on a device can be traced to its cause. A DOM element outside
 * the canvas, so it costs no GPU time.
 * @returns {Object} Readout inst
 */
export function create() {
  const el = document.createElement('div')
  el.style.cssText = STYLE
  const inst = { el, samples: [], lastT: 0, lastShow: 0, on: false }
  window.addEventListener('touchstart', e => onTouchStart(inst, e), { capture: true, passive: true })
  const startOn = new URLSearchParams(window.location.search).has(URL_FLAG) || get(PROGRESS_KEY, false)
  startOn && turnOn(inst)
  return inst
}

// A tap with TOGGLE_TOUCHES fingers flips the readout and remembers it
function onTouchStart(inst, e) {
  if (e.touches.length !== TOGGLE_TOUCHES) return
  inst.on ? turnOff(inst) : turnOn(inst)
  set(PROGRESS_KEY, inst.on)
}
function turnOn(inst) {
  if (inst.on) return
  inst.on = true
  inst.samples.length = 0
  inst.lastT = 0
  document.body.appendChild(inst.el)
  requestAnimationFrame(t => onFrame(inst, t))
}
function turnOff(inst) {
  inst.on = false
  inst.el.remove()
}

// Samples one rAF delta, drops old ones and refreshes the text twice a second
function onFrame(inst, t) {
  if (!inst.on) return
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
    `fullscreen ${Boolean(document.fullscreenElement)} app ${isApp()} reboots ${getResizeRebootCount()}\n` +
    `gl ${glRenderer(canvas)}`
}

// True when started from the Home Screen / installed as an app
function isApp() {
  return navigator.standalone === true || window.matchMedia(STANDALONE_QUERY).matches
}

// The GPU the page really draws with (a software renderer explains a crawl)
function glRenderer(canvas) {
  const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl')
  const info = gl?.getExtension('WEBGL_debug_renderer_info')
  return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'n/a'
}
