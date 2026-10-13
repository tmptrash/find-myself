import { CFG } from '../cfg.js'
import { getRGB, parseHex } from './helper.js'

//
// Screen-space CRT post layer (scanlines, vignette, phosphor tint, noise).
// Baked full-viewport sprites rebuild only on resize — no per-frame readbacks.
//
const SPRITE_SCANLINES = 'crt-screen-scanlines'
const SPRITE_VIGNETTE = 'crt-screen-vignette'
const SPRITE_NOISE_TILE = 'crt-noise-tile'
const SPRITE_CHROMA_LEFT = 'crt-chroma-edge-left'
const SPRITE_CHROMA_RIGHT = 'crt-chroma-edge-right'
const NOISE_SEED = 0x637274
const CHROMA_EDGE_CANVAS_H = 4
const GLITCH_ROLL = 'roll'
const GLITCH_CHROMA_BURST = 'chromaBurst'
const GLITCH_SNOW = 'snow'
const GLITCH_SYNC_DROP = 'syncDrop'
const GLITCH_STUTTER = 'stutterBands'
const GLITCH_KINDS = [
  GLITCH_ROLL,
  GLITCH_CHROMA_BURST,
  GLITCH_SNOW,
  GLITCH_SYNC_DROP,
  GLITCH_STUTTER
]
const GLITCH_ROLL_SLICE_MIN = 4
const GLITCH_ROLL_SLICE_MAX = 7
const GLITCH_SYNC_LINE_COUNT = 6
const GLITCH_STUTTER_BAND_COUNT = 3

/**
 * Adds one persistent full-screen CRT layer to this Kaplay instance. It sits
 * above every scene object (menus, HUD, dialogs, gameplay, transition covers).
 * Safe to call once per bootEngine().
 * @param {Object} k - Kaplay instance
 */
export function installCrtOverlay(k) {
  const crt = CFG.visual.crt
  if (!crt?.enabled) return
  const inst = {
    k,
    bakedW: 0,
    bakedH: 0,
    noiseScroll: 0,
    interference: null,
    nextInterferenceAt: scheduleNextInterference(k, crt),
    glitch: null,
    nextGlitchAt: scheduleNextGlitch(k, crt)
  }
  ensureCrtNoiseTileSprite(k, crt)
  ensureCrtChromaEdgeSprites(k, crt)
  //
  // k.go() removes every root object without stay() at the end of the frame,
  // so a layer re-added per scene would live for one frame only. Global
  // k.onDraw handlers run before the object tree, so they would sit under
  // the scene.
  //
  k.add([
    k.fixed(),
    k.stay(),
    k.z(CFG.visual.zIndex.crt),
    {
      update() {
        onUpdateCrtOverlay(inst)
      },
      draw() {
        onDrawCrtOverlay(inst)
      }
    }
  ])
}

//
// Advances noise scroll and rare horizontal interference bands.
//
function onUpdateCrtOverlay(inst) {
  const crt = CFG.visual.crt
  if (!crt?.enabled) return
  const k = inst.k
  const dt = k.dt()
  const now = k.time()
  const noise = crt.noise
  inst.noiseScroll += dt * (noise.scrollSpeedPxPerSec ?? 0)
  const intf = crt.interference
  if (intf?.enabled) {
    if (inst.interference) {
      inst.interference.t += dt
      if (inst.interference.t >= intf.durationSec) inst.interference = null
    } else if (now >= inst.nextInterferenceAt) {
      const h = k.height()
      inst.interference = {
        y: h * (0.12 + pseudoRand(now * 17.3) * 0.76),
        t: 0
      }
      inst.nextInterferenceAt = scheduleNextInterference(k, crt)
    }
  }
  const glitches = crt.glitches
  if (!glitches?.enabled) return
  if (inst.glitch) {
    inst.glitch.t += dt
    if (inst.glitch.t >= inst.glitch.durationSec) {
      inst.glitch = null
      inst.nextGlitchAt = scheduleNextGlitch(k, crt)
    }
    return
  }
  if (now < inst.nextGlitchAt) return
  inst.glitch = spawnCrtGlitch(k, crt, now)
}

//
// Draw order: warm tint → edge chroma → vignette → scanlines → noise → interference.
//
function onDrawCrtOverlay(inst) {
  const crt = CFG.visual.crt
  if (!crt?.enabled) return
  const k = inst.k
  const master = clamp01(crt.masterIntensity ?? 1)
  if (master <= 0.001) return
  const w = k.width()
  const h = k.height()
  ensureCrtScreenSprites(k, inst, w, h, crt)
  drawPhosphorTint(k, w, h, crt, master)
  drawChromaEdges(k, w, h, crt, master)
  drawFullScreenSprite(k, SPRITE_VIGNETTE, w, h, scaledOpacity(crt.vignette.opacity, master))
  drawFullScreenSprite(k, SPRITE_SCANLINES, w, h, scaledOpacity(crt.scanlines.opacity, master))
  drawCrtNoise(k, w, h, crt, master, inst.noiseScroll)
  drawCrtInterference(k, w, h, crt, master, inst.interference)
  drawCrtGlitch(k, w, h, crt, master, inst.glitch, inst.noiseScroll)
}

function drawPhosphorTint(k, w, h, crt, master) {
  const phosphor = crt.phosphor
  const op = scaledOpacity(phosphor.opacity, master)
  if (op <= 0.001) return
  k.drawRect({
    pos: k.vec2(0, 0),
    anchor: 'topleft',
    width: w,
    height: h,
    color: getRGB(k, phosphor.tint),
    opacity: op
  })
}

function drawChromaEdges(k, w, h, crt, master) {
  const chroma = crt.chroma
  const op = scaledOpacity(chroma.edgeOpacity, master)
  if (op <= 0.001) return
  const stripW = chroma.edgeWidthPx ?? 48
  if (!k.getSprite(SPRITE_CHROMA_LEFT)) return
  k.drawSprite({
    sprite: SPRITE_CHROMA_LEFT,
    pos: k.vec2(0, 0),
    anchor: 'topleft',
    width: stripW,
    height: h,
    opacity: op,
    fixed: true
  })
  k.drawSprite({
    sprite: SPRITE_CHROMA_RIGHT,
    pos: k.vec2(w - stripW, 0),
    anchor: 'topleft',
    width: stripW,
    height: h,
    opacity: op,
    fixed: true
  })
}

function drawCrtNoise(k, w, h, crt, master, scrollY) {
  const noise = crt.noise
  const op = scaledOpacity(noise.opacity, master)
  if (op <= 0.001 || !k.getSprite(SPRITE_NOISE_TILE)) return
  const tile = noise.tileSize ?? 192
  const offsetY = scrollY % tile
  for (let y = -tile; y < h + tile; y += tile) {
    for (let x = 0; x < w; x += tile) {
      k.drawSprite({
        sprite: SPRITE_NOISE_TILE,
        pos: k.vec2(x, y - offsetY),
        anchor: 'topleft',
        width: tile,
        height: tile,
        opacity: op,
        fixed: true
      })
    }
  }
}

function drawCrtInterference(k, w, h, crt, master, band) {
  if (!band || !crt.interference?.enabled) return
  const intf = crt.interference
  const op = scaledOpacity(intf.opacity, master)
  if (op <= 0.001) return
  const dur = Math.max(0.05, intf.durationSec ?? 0.2)
  const u = Math.min(1, band.t / dur)
  const fade = u < 0.35 ? u / 0.35 : 1 - (u - 0.35) / 0.65
  const bandH = intf.bandHeightPx ?? 5
  k.drawRect({
    pos: k.vec2(0, band.y - bandH * 0.5),
    anchor: 'topleft',
    width: w,
    height: bandH,
    color: getRGB(k, intf.bandTint),
    opacity: op * Math.max(0, fade)
  })
}

function drawFullScreenSprite(k, spriteName, w, h, opacity) {
  if (opacity <= 0.001 || !k.getSprite(spriteName)) return
  k.drawSprite({
    sprite: spriteName,
    pos: k.vec2(0, 0),
    anchor: 'topleft',
    width: w,
    height: h,
    opacity,
    fixed: true
  })
}

function ensureCrtScreenSprites(k, inst, w, h, crt) {
  if (inst.bakedW === w && inst.bakedH === h && k.getSprite(SPRITE_SCANLINES)) return
  inst.bakedW = w
  inst.bakedH = h
  k.loadSprite(SPRITE_SCANLINES, bakeScanlineCanvas(w, h, crt))
  k.loadSprite(SPRITE_VIGNETTE, bakeVignetteCanvas(w, h, crt))
}

function ensureCrtNoiseTileSprite(k, crt) {
  if (k.getSprite(SPRITE_NOISE_TILE)) return
  k.loadSprite(SPRITE_NOISE_TILE, bakeNoiseTile(crt))
}

function ensureCrtChromaEdgeSprites(k, crt) {
  if (k.getSprite(SPRITE_CHROMA_LEFT)) return
  const stripW = crt.chroma?.edgeWidthPx ?? 56
  k.loadSprite(
    SPRITE_CHROMA_LEFT,
    bakeChromaEdgeCanvas(stripW, CHROMA_EDGE_CANVAS_H, 'left', crt.chroma.leftTint)
  )
  k.loadSprite(
    SPRITE_CHROMA_RIGHT,
    bakeChromaEdgeCanvas(stripW, CHROMA_EDGE_CANVAS_H, 'right', crt.chroma.rightTint)
  )
}

function bakeScanlineCanvas(w, h, crt) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const spacing = Math.max(2, crt.scanlines.spacingPx ?? 3)
  const [r, g, b] = parseHex(CFG.visual.colors.outline)
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`
  for (let y = 0; y < h; y += spacing) {
    ctx.fillRect(0, y, w, 1)
  }
  return canvas
}

function bakeVignetteCanvas(w, h, crt) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const cx = w * 0.5
  const cy = h * 0.5
  const minDim = Math.min(w, h)
  const inner = minDim * (crt.vignette.innerRadiusFrac ?? 0.4)
  const outer = minDim * (crt.vignette.outerRadiusFrac ?? 0.78)
  const [r, g, b] = parseHex(CFG.visual.colors.outline)
  const grd = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer)
  grd.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`)
  grd.addColorStop(1, `rgba(${r}, ${g}, ${b}, 1)`)
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, w, h)
  return canvas
}

function bakeNoiseTile(crt) {
  const size = crt.noise.tileSize ?? 192
  const block = Math.max(1, crt.noise.blockSize ?? 2)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(size, size)
  const px = imageData.data
  for (let y = 0; y < size; y++) {
    const by = (y / block) | 0
    for (let x = 0; x < size; x++) {
      const bx = (x / block) | 0
      const i = (y * size + x) * 4
      const n = noiseHash(NOISE_SEED, bx, by)
      const v = 118 + n * 28
      px[i] = v
      px[i + 1] = v
      px[i + 2] = v
      px[i + 3] = 255
    }
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

function bakeChromaEdgeCanvas(stripW, stripH, side, tintHex) {
  const canvas = document.createElement('canvas')
  canvas.width = stripW
  canvas.height = stripH
  const ctx = canvas.getContext('2d')
  const [tR, tG, tB] = parseHex(tintHex)
  const grad = ctx.createLinearGradient(0, 0, stripW, 0)
  if (side === 'left') {
    grad.addColorStop(0, `rgba(${tR}, ${tG}, ${tB}, 0.55)`)
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  } else {
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)')
    grad.addColorStop(1, `rgba(${tR}, ${tG}, ${tB}, 0.5)`)
  }
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, stripW, stripH)
  return canvas
}

function scheduleNextInterference(k, crt) {
  const intf = crt.interference
  const min = intf.minIntervalSec ?? 12
  const max = intf.maxIntervalSec ?? 28
  const span = Math.max(0.5, max - min)
  return k.time() + min + pseudoRand(k.time() * 0.71 + 3.1) * span
}

function scheduleNextGlitch(k, crt) {
  const glitches = crt.glitches
  const min = glitches?.minIntervalSec ?? 18
  const max = glitches?.maxIntervalSec ?? 42
  const span = Math.max(1, max - min)
  return k.time() + min + pseudoRand(k.time() * 0.53 + 11.7) * span
}

function spawnCrtGlitch(k, crt, now) {
  const glitches = crt.glitches
  const minDur = glitches?.minDurationSec ?? 0.07
  const maxDur = glitches?.maxDurationSec ?? 0.24
  const durSpan = Math.max(0.02, maxDur - minDur)
  const durationSec = minDur + pseudoRand(now * 1.13 + 9.2) * durSpan
  const seed = (now * 1000 + pseudoRand(now) * 999) | 0
  const kind = GLITCH_KINDS[seed % GLITCH_KINDS.length]
  const h = k.height()
  return {
    kind,
    t: 0,
    durationSec,
    seed,
    bandY: h * (0.1 + pseudoRand(seed * 0.31) * 0.8),
    shiftPx: (pseudoRand(seed * 1.7) - 0.5) * 48
  }
}

//
// Rare full-screen TV malfunctions — several kinds, envelope-faded so they read
// as brief analog hits rather than constant noise.
//
function drawCrtGlitch(k, w, h, crt, master, glitch, noiseScroll) {
  if (!glitch || !crt.glitches?.enabled) return
  const u = Math.min(1, glitch.t / Math.max(0.04, glitch.durationSec))
  const envelope = u < 0.2 ? u / 0.2 : u > 0.75 ? (1 - u) / 0.25 : 1
  const strength = clamp01(master) * envelope
  if (strength <= 0.001) return
  if (glitch.kind === GLITCH_ROLL) drawGlitchRoll(k, w, h, crt, glitch, strength)
  else if (glitch.kind === GLITCH_CHROMA_BURST) drawGlitchChromaBurst(k, w, h, crt, glitch, strength)
  else if (glitch.kind === GLITCH_SNOW) drawGlitchSnow(k, w, h, crt, glitch, strength, noiseScroll)
  else if (glitch.kind === GLITCH_SYNC_DROP) drawGlitchSyncDrop(k, w, h, crt, glitch, strength)
  else if (glitch.kind === GLITCH_STUTTER) drawGlitchStutterBands(k, w, h, crt, glitch, strength)
}

function drawGlitchRoll(k, w, h, crt, glitch, strength) {
  const sliceCount =
    GLITCH_ROLL_SLICE_MIN +
    ((glitch.seed % (GLITCH_ROLL_SLICE_MAX - GLITCH_ROLL_SLICE_MIN + 1)) | 0)
  const sliceH = 6 + (glitch.seed % 5)
  const gap = Math.max(sliceH + 2, (h * 0.55) / sliceCount)
  const chroma = crt.chroma
  const baseOp = scaledOpacity(chroma.edgeOpacity, 1) * strength * 2.8
  for (let i = 0; i < sliceCount; i++) {
    const y = (glitch.bandY + i * gap) % (h - sliceH)
    const shift = glitch.shiftPx + (pseudoRand(glitch.seed + i * 3.1) - 0.5) * 36
    const bandOp = baseOp * (0.65 + pseudoRand(glitch.seed + i) * 0.35)
    k.drawRect({
      pos: k.vec2(0, y),
      anchor: 'topleft',
      width: w,
      height: sliceH,
      color: getRGB(k, crt.interference.bandTint),
      opacity: bandOp * 0.35,
      fixed: true
    })
    if (!k.getSprite(SPRITE_CHROMA_LEFT)) continue
    k.drawSprite({
      sprite: SPRITE_CHROMA_LEFT,
      pos: k.vec2(shift, y),
      anchor: 'topleft',
      width: (chroma.edgeWidthPx ?? 52) * 0.45,
      height: sliceH,
      opacity: bandOp,
      fixed: true
    })
    k.drawSprite({
      sprite: SPRITE_CHROMA_RIGHT,
      pos: k.vec2(w - (chroma.edgeWidthPx ?? 52) * 0.45 + shift * 0.6, y),
      anchor: 'topleft',
      width: (chroma.edgeWidthPx ?? 52) * 0.45,
      height: sliceH,
      opacity: bandOp,
      fixed: true
    })
  }
}

function drawGlitchChromaBurst(k, w, h, crt, glitch, strength) {
  const chroma = crt.chroma
  const stripW = (chroma.edgeWidthPx ?? 52) * (1.2 + pseudoRand(glitch.seed) * 0.6)
  const op = scaledOpacity(chroma.edgeOpacity, 1) * strength * 4.5
  const bandH = h * (0.22 + pseudoRand(glitch.seed * 2.1) * 0.2)
  const y0 = glitch.bandY - bandH * 0.5
  if (!k.getSprite(SPRITE_CHROMA_LEFT)) return
  k.drawSprite({
    sprite: SPRITE_CHROMA_LEFT,
    pos: k.vec2(glitch.shiftPx * 0.4, y0),
    anchor: 'topleft',
    width: stripW,
    height: bandH,
    opacity: op,
    fixed: true
  })
  k.drawSprite({
    sprite: SPRITE_CHROMA_RIGHT,
    pos: k.vec2(w - stripW - glitch.shiftPx * 0.35, y0),
    anchor: 'topleft',
    width: stripW,
    height: bandH,
    opacity: op,
    fixed: true
  })
  k.drawRect({
    pos: k.vec2(0, y0),
    anchor: 'topleft',
    width: w,
    height: bandH,
    color: getRGB(k, chroma.leftTint),
    opacity: op * 0.12,
    fixed: true
  })
}

function drawGlitchSnow(k, w, h, crt, glitch, strength, noiseScroll) {
  const noise = crt.noise
  const op = scaledOpacity(noise.opacity, 1) * strength * 5.5
  if (op <= 0.001 || !k.getSprite(SPRITE_NOISE_TILE)) return
  const tile = noise.tileSize ?? 192
  const offsetY = (noiseScroll + glitch.seed * 0.07) % tile
  for (let y = -tile; y < h + tile; y += tile) {
    for (let x = 0; x < w; x += tile) {
      k.drawSprite({
        sprite: SPRITE_NOISE_TILE,
        pos: k.vec2(x + glitch.shiftPx * 0.2, y - offsetY),
        anchor: 'topleft',
        width: tile,
        height: tile,
        opacity: op,
        fixed: true
      })
    }
  }
}

function drawGlitchSyncDrop(k, w, h, crt, glitch, strength) {
  const lineH = 2 + (glitch.seed % 2)
  const intf = crt.interference
  const chroma = crt.chroma
  for (let i = 0; i < GLITCH_SYNC_LINE_COUNT; i++) {
    const y = (glitch.bandY + i * (h / (GLITCH_SYNC_LINE_COUNT + 2))) % (h - lineH)
    const shift = glitch.shiftPx + (pseudoRand(glitch.seed + i * 5.3) - 0.5) * 64
    const op = strength * (0.35 + pseudoRand(glitch.seed + i * 1.9) * 0.45)
    k.drawRect({
      pos: k.vec2(shift, y),
      anchor: 'topleft',
      width: w,
      height: lineH,
      color: getRGB(k, i % 2 === 0 ? chroma.leftTint : chroma.rightTint),
      opacity: op * 0.22,
      fixed: true
    })
    k.drawRect({
      pos: k.vec2(0, y),
      anchor: 'topleft',
      width: w,
      height: lineH,
      color: getRGB(k, intf.bandTint),
      opacity: op * 0.5,
      fixed: true
    })
  }
}

function drawGlitchStutterBands(k, w, h, crt, glitch, strength) {
  const intf = crt.interference
  const bandH = (intf.bandHeightPx ?? 4) * (1.5 + pseudoRand(glitch.seed) * 1.2)
  const op = scaledOpacity(intf.opacity, 1) * strength * 3.2
  for (let i = 0; i < GLITCH_STUTTER_BAND_COUNT; i++) {
    const y = h * (0.15 + pseudoRand(glitch.seed + i * 7.1) * 0.7)
    k.drawRect({
      pos: k.vec2(0, y - bandH * 0.5),
      anchor: 'topleft',
      width: w,
      height: bandH,
      color: getRGB(k, intf.bandTint),
      opacity: op * (0.7 + pseudoRand(glitch.seed + i) * 0.3),
      fixed: true
    })
  }
}

function noiseHash(seed, x, y) {
  let h = seed ^ (x * 374761393) ^ (y * 668265263)
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

function pseudoRand(t) {
  const x = Math.sin(t * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function scaledOpacity(base, master) {
  return clamp01(base ?? 0) * clamp01(master)
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}
