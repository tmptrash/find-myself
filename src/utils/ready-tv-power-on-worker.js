import * as TvRender from './ready-tv-power-on-render.js'

//
// Worker side of the CRT power-on overlay: owns the transferred
// OffscreenCanvas so snow keeps animating while the page thread is blocked.
//
const MSG = TvRender.TV_WORKER_MSG

let renderInst = null

self.onmessage = (event) => onMessage(event.data)

function onMessage(msg) {
  if (msg.type === MSG.INIT) {
    renderInst = TvRender.create({
      canvas: msg.canvas,
      colors: msg.colors,
      emit: (type) => self.postMessage({ type })
    })
    TvRender.start(renderInst)
    return
  }
  if (!renderInst) return
  msg.type === MSG.SPOT && TvRender.setSpotStrength(renderInst, msg.value)
  msg.type === MSG.FADE_OUT && TvRender.fadeOut(renderInst, msg.durationSec)
}
