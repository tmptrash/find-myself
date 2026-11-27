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
//
// A frame DROPPED_SHARE of the usual one long, or longer, missed a screen
// refresh. A heap GC_DROP_BYTES smaller than a frame before was collected.
// Long tasks are the browser's own count of them (50 ms and over).
//
const DROPPED_SHARE = 1.5
const GC_DROP_BYTES = 1e6
const BYTES_PER_MB = 1e6
const MS_PER_MIN = 60000
const LONG_TASK = 'longtask'
const STYLE = 'position:fixed;top:4px;right:4px;z-index:99999;background:#000a;color:#fff;font:11px monospace;padding:4px 6px;border-radius:4px;white-space:pre;pointer-events:none'

/**
 * Debug readout (with `?perf=1`, or toggled by a three-finger tap): where a
 * frame's time goes in this very browser, over the last seconds —
 * - the frames: how many a second, their length (p50 / p95 / longest) and
 *   how many a second missed a screen refresh;
 * - the page's own share: the time its frame callbacks ran (js) and how
 *   long after the frame's start they began (late: the main thread was
 *   busy with something else, or the browser handed the frame over late).
 *   Few js and late ms with frames still missed: the wait is on the GPU's
 *   or the browser's side, not in the page's code;
 * - memory: the heap (typed arrays and image data count in it, canvases
 *   and textures do not), the smallest it has been since the page loaded
 *   and how long ago that load was — a heap many times its smallest is
 *   leaking, and the two tell how fast — then how fast it grows between
 *   collections, collections a second and long tasks so far;
 * - what the browser gives the page (window size, pixel ratio, canvas
 *   buffer and CSS size, fullscreen, the GPU it draws with).
 * A DOM element outside the canvas. While it is on, the page's frame
 * callbacks are timed (requestAnimationFrame is wrapped).
 * @returns {Object} Readout inst
 */
export function create() {
  const el = document.createElement('div')
  el.style.cssText = STYLE
  const inst = { el, samples: [], lastT: 0, lastShow: 0, on: false, raf: null, frameT: -1, js: 0, late: 0, heap: 0, heapMin: Infinity, longTasks: 0, gl: null }
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
  watchFrames(inst)
  inst.raf(t => onFrame(inst, t))
}
//
// Times the page's frame callbacks from now on (once): every callback
// asked for goes through timeCallback; the readout's own loop keeps to
// the browser's plain requestAnimationFrame, out of the count. Long tasks
// are counted where the browser reports them.
//
function watchFrames(inst) {
  if (inst.raf) return
  inst.raf = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = cb => inst.raf(t => timeCallback(inst, cb, t))
  if (!window.PerformanceObserver?.supportedEntryTypes?.includes(LONG_TASK)) return
  new PerformanceObserver(list => countLongTasks(inst, list)).observe({ entryTypes: [LONG_TASK] })
}
function countLongTasks(inst, list) {
  inst.longTasks += list.getEntries().length
}
//
// One frame callback of the page: the frame's first one notes how late it
// began; each adds its time to the frame's.
//
function timeCallback(inst, cb, t) {
  const start = performance.now()
  if (t !== inst.frameT) {
    inst.frameT = t
    inst.late = start - t
    inst.js = 0
  }
  cb(t)
  inst.js += performance.now() - start
}
function turnOff(inst) {
  inst.on = false
  inst.el.remove()
}
//
// Samples one frame (its length, the page's time in it and how late that
// began, the heap), drops old samples and refreshes the text twice a
// second.
//
function onFrame(inst, t) {
  if (!inst.on) return
  const heap = performance.memory?.usedJSHeapSize ?? 0
  inst.lastT && inst.samples.push({ t, dt: t - inst.lastT, js: inst.js, late: inst.late, grown: heap - inst.heap })
  inst.lastT = t
  inst.heap = heap
  heap > 0 && heap < inst.heapMin && (inst.heapMin = heap)
  while (inst.samples.length && inst.samples[0].t < t - WINDOW_MS) inst.samples.shift()
  t - inst.lastShow > REFRESH_MS && show(inst, t)
  inst.raf(next => onFrame(inst, next))
}
//
// Writes the frame stats, the page's share of them, memory and the page /
// canvas geometry.
//
function show(inst, t) {
  inst.lastShow = t
  if (!inst.samples.length) return
  const secs = (t - inst.samples[0].t + inst.samples[0].dt) / MS_PER_SEC
  const dt = sortedOf(inst, 'dt')
  const js = sortedOf(inst, 'js')
  const late = sortedOf(inst, 'late')
  const dropped = inst.samples.filter(s => s.dt > at(dt, P50) * DROPPED_SHARE).length
  const grown = inst.samples.reduce((sum, s) => sum + Math.max(0, s.grown), 0)
  const collected = inst.samples.filter(s => s.grown < -GC_DROP_BYTES).length
  const canvas = document.querySelector('canvas')
  const rect = canvas?.getBoundingClientRect()
  inst.gl ??= glRenderer(canvas)
  inst.el.textContent =
    `fps ${(inst.samples.length / secs).toFixed(0)}  p50 ${at(dt, P50).toFixed(1)}  p95 ${at(dt, P95).toFixed(1)}  max ${at(dt, 1).toFixed(1)} ms  missed ${(dropped / secs).toFixed(1)}/s\n` +
    `js p50 ${at(js, P50).toFixed(1)}  p95 ${at(js, P95).toFixed(1)}  max ${at(js, 1).toFixed(1)} ms  late p50 ${at(late, P50).toFixed(1)}  p95 ${at(late, P95).toFixed(1)}  max ${at(late, 1).toFixed(1)} ms\n` +
    `heap ${(inst.heap / BYTES_PER_MB).toFixed(0)} MB  lowest ${(inst.heapMin / BYTES_PER_MB).toFixed(0)} MB  page up ${(t / MS_PER_MIN).toFixed(1)} min\n` +
    `heap +${(grown / BYTES_PER_MB / secs).toFixed(0)} MB/s  gc ${(collected / secs).toFixed(1)}/s  long tasks ${inst.longTasks}\n` +
    `win ${window.innerWidth}x${window.innerHeight} dpr ${window.devicePixelRatio}\n` +
    `canvas buf ${canvas?.width}x${canvas?.height} css ${rect?.width.toFixed(0)}x${rect?.height.toFixed(0)}\n` +
    `fullscreen ${Boolean(document.fullscreenElement)} app ${isApp()} reboots ${getResizeRebootCount()}\n` +
    `gl ${inst.gl ?? 'n/a'}`
}
function sortedOf(inst, key) {
  return inst.samples.map(s => s[key]).sort((a, b) => a - b)
}
function at(sorted, q) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]
}
// True when started from the Home Screen / installed as an app
function isApp() {
  return navigator.standalone === true || window.matchMedia(STANDALONE_QUERY).matches
}
//
// The GPU the page really draws with (a software renderer explains a
// crawl); asked once the canvas is there — the question itself goes to
// the GPU, it is not one to ask twice a second.
//
function glRenderer(canvas) {
  const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl')
  const info = gl?.getExtension('WEBGL_debug_renderer_info')
  return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : null
}
