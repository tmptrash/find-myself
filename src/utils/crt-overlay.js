import { CFG } from '../cfg.js'
import { getRGB, parseHex } from './helper.js'

//
// Screen-space CRT post layer (scanlines, phosphor tint, noise). No radial
// vignette: its gradient steps read as rings spreading from the centre.
// Baked full-viewport sprites rebuild only on resize — no per-frame readbacks.
//
const SPRITE_SCANLINES = 'crt-screen-scanlines'
const SPRITE_NOISE_TILE = 'crt-noise-tile'
const SPRITE_CHROMA_LEFT = 'crt-chroma-edge-left'
const SPRITE_CHROMA_RIGHT = 'crt-chroma-edge-right'
const NOISE_SEED = 0x637274
const SPRITE_SOFT_BAND_LIGHT = 'crt-soft-band-light'
const SPRITE_SOFT_BAND_DARK = 'crt-soft-band-dark'
const CHROMA_EDGE_CANVAS_H = 4
//
// Soft band bake: tall enough that nearest-filter stretching shows no steps.
//
const SOFT_BAND_CANVAS_W = 4
const SOFT_BAND_CANVAS_H = 256
const GLITCH_HUM_BAR = 'humBar'
const GLITCH_VERTICAL_ROLL = 'verticalRoll'
const GLITCH_SNOW_BURST = 'snowBurst'
const GLITCH_BRIGHTNESS_SAG = 'brightnessSag'
const GLITCH_COLOR_DRIFT = 'colorDrift'
//
// Hum bar is the most common fault on a real set, so it appears twice.
//
const GLITCH_KINDS = [
  GLITCH_HUM_BAR,
  GLITCH_HUM_BAR,
  GLITCH_VERTICAL_ROLL,
  GLITCH_SNOW_BURST,
  GLITCH_BRIGHTNESS_SAG,
  GLITCH_COLOR_DRIFT
]
const GLITCH_EDGE_IN = 0.2
const GLITCH_EDGE_OUT = 0.25
const SNOW_JITTER_HZ = 30

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
  ensureCrtSoftBandSprites(k, crt)
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

/**
 * Bakes the grey CRT noise tile (CPU canvas, no GPU readback). Shared with the
 * DOM loader CRT layer so both grains match.
 * @param {Object} crt - CFG.visual.crt
 * @returns {HTMLCanvasElement}
 */
export function bakeCrtNoiseTileCanvas(crt) {
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
// Draw order: warm tint → edge chroma → scanlines → noise → interference.
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
  drawFullScreenSprite(k, SPRITE_SCANLINES, w, h, scaledOpacity(crt.scanlines.opacity, master))
  drawCrtNoise(k, w, h, crt, master, inst.noiseScroll)
  drawCrtInterference(k, w, h, crt, master, inst.interference)
  drawCrtGlitch(k, w, h, crt, master, inst.glitch)
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
  drawNoiseTiles(k, w, h, crt, scaledOpacity(crt.noise.opacity, master), 0, scrollY)
}

function drawNoiseTiles(k, w, h, crt, op, offX, offY) {
  if (op <= 0.001 || !k.getSprite(SPRITE_NOISE_TILE)) return
  const tile = crt.noise.tileSize ?? 192
  const ox = offX % tile
  const oy = offY % tile
  for (let y = -tile; y < h + tile; y += tile) {
    for (let x = -tile; x < w; x += tile) {
      k.drawSprite({
        sprite: SPRITE_NOISE_TILE,
        pos: k.vec2(x + tile - ox, y - oy),
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
  const bandH = intf.bandHeightPx ?? 44
  const y = band.y + band.t * (intf.driftPxPerSec ?? 0)
  drawSoftBand(k, SPRITE_SOFT_BAND_LIGHT, w, y, bandH, op * Math.max(0, fade))
}
//
// Soft vertical-gradient band stretched across the screen, centred at y.
//
function drawSoftBand(k, spriteName, w, y, bandH, opacity) {
  if (opacity <= 0.001 || !k.getSprite(spriteName)) return
  k.drawSprite({
    sprite: spriteName,
    pos: k.vec2(0, y - bandH * 0.5),
    anchor: 'topleft',
    width: w,
    height: bandH,
    opacity,
    fixed: true
  })
}

function drawFullScreenTint(k, w, h, hex, opacity) {
  if (opacity <= 0.001) return
  k.drawRect({
    pos: k.vec2(0, 0),
    anchor: 'topleft',
    width: w,
    height: h,
    color: getRGB(k, hex),
    opacity,
    fixed: true
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
}

function ensureCrtNoiseTileSprite(k, crt) {
  if (k.getSprite(SPRITE_NOISE_TILE)) return
  k.loadSprite(SPRITE_NOISE_TILE, bakeCrtNoiseTileCanvas(crt))
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

function ensureCrtSoftBandSprites(k, crt) {
  if (k.getSprite(SPRITE_SOFT_BAND_LIGHT)) return
  k.loadSprite(SPRITE_SOFT_BAND_LIGHT, bakeSoftBandCanvas(crt.glitches?.humBar?.tint ?? crt.interference.bandTint))
  k.loadSprite(SPRITE_SOFT_BAND_DARK, bakeSoftBandCanvas(CFG.visual.colors.outline))
}
//
// Bell-shaped alpha profile so band edges dissolve instead of reading as lines.
//
function bakeSoftBandCanvas(tintHex) {
  const canvas = document.createElement('canvas')
  canvas.width = SOFT_BAND_CANVAS_W
  canvas.height = SOFT_BAND_CANVAS_H
  const ctx = canvas.getContext('2d')
  const [r, g, b] = parseHex(tintHex)
  for (let y = 0; y < SOFT_BAND_CANVAS_H; y++) {
    const s = Math.sin(((y + 0.5) / SOFT_BAND_CANVAS_H) * Math.PI)
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${s * s})`
    ctx.fillRect(0, y, SOFT_BAND_CANVAS_W, 1)
  }
  return canvas
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
  const seed = (now * 1000 + pseudoRand(now) * 999) | 0
  const kind = GLITCH_KINDS[seed % GLITCH_KINDS.length]
  const kindCfg = crt.glitches[kind]
  const durSpan = Math.max(0.02, kindCfg.maxDurationSec - kindCfg.minDurationSec)
  return {
    kind,
    t: 0,
    durationSec: kindCfg.minDurationSec + pseudoRand(now * 1.13 + 9.2) * durSpan,
    seed,
    startY: k.height() * pseudoRand(seed * 0.31)
  }
}

//
// Rare analog TV faults — soft, whole-picture effects envelope-faded in and
// out, so they read as signal trouble rather than drawn lines.
//
function drawCrtGlitch(k, w, h, crt, master, glitch) {
  if (!glitch || !crt.glitches?.enabled) return
  const u = Math.min(1, glitch.t / Math.max(0.04, glitch.durationSec))
  const envelope = u < GLITCH_EDGE_IN ? u / GLITCH_EDGE_IN : u > 1 - GLITCH_EDGE_OUT ? (1 - u) / GLITCH_EDGE_OUT : 1
  const strength = clamp01(master) * envelope
  if (strength <= 0.001) return
  const kindCfg = crt.glitches[glitch.kind]
  if (glitch.kind === GLITCH_HUM_BAR) drawGlitchHumBar(k, w, h, kindCfg, glitch, u, strength)
  else if (glitch.kind === GLITCH_VERTICAL_ROLL) drawGlitchVerticalRoll(k, w, h, kindCfg, u, strength)
  else if (glitch.kind === GLITCH_SNOW_BURST) drawGlitchSnowBurst(k, w, h, crt, kindCfg, glitch, strength)
  else if (glitch.kind === GLITCH_BRIGHTNESS_SAG) drawGlitchBrightnessSag(k, w, h, kindCfg, u, strength)
  else if (glitch.kind === GLITCH_COLOR_DRIFT) drawGlitchColorDrift(k, w, h, crt, kindCfg, glitch, u, strength)
}
//
// Mains hum bar: one wide soft bright band drifting slowly down the picture.
//
function drawGlitchHumBar(k, w, h, cfg, glitch, u, strength) {
  const bandH = h * cfg.heightFrac
  const y = glitch.startY + u * h * 0.5
  drawSoftBand(k, SPRITE_SOFT_BAND_LIGHT, w, y, bandH, cfg.opacity * strength)
}
//
// Lost vertical sync: the dark blanking gap between frames slides top to
// bottom once while the whole picture dims.
//
function drawGlitchVerticalRoll(k, w, h, cfg, u, strength) {
  const barH = h * cfg.heightFrac
  const y = -barH + u * (h + barH * 2)
  drawFullScreenTint(k, w, h, CFG.visual.colors.outline, cfg.dimOpacity * strength)
  drawSoftBand(k, SPRITE_SOFT_BAND_DARK, w, y, barH, cfg.opacity * strength)
}
//
// Weak signal: snow flares up and jumps every frame, contrast drops a little.
//
function drawGlitchSnowBurst(k, w, h, crt, cfg, glitch, strength) {
  const step = Math.floor(glitch.t * SNOW_JITTER_HZ)
  const tile = crt.noise.tileSize ?? 192
  const ox = pseudoRand(glitch.seed + step * 1.3) * tile
  const oy = pseudoRand(glitch.seed + step * 2.7) * tile
  drawNoiseTiles(k, w, h, crt, cfg.opacity * strength, ox, oy)
  drawFullScreenTint(k, w, h, CFG.visual.colors.outline, cfg.dimOpacity * strength)
}
//
// Supply voltage sag: a few quick brightness dips across the whole frame.
//
function drawGlitchBrightnessSag(k, w, h, cfg, u, strength) {
  const pulse = Math.abs(Math.sin(u * Math.PI * cfg.pulses))
  drawFullScreenTint(k, w, h, CFG.visual.colors.outline, cfg.opacity * strength * pulse)
}
//
// Colour subcarrier drift: the picture briefly washes towards red or cyan.
//
function drawGlitchColorDrift(k, w, h, crt, cfg, glitch, u, strength) {
  const tint = glitch.seed % 2 === 0 ? crt.chroma.leftTint : crt.chroma.rightTint
  drawFullScreenTint(k, w, h, tint, cfg.opacity * strength * Math.sin(u * Math.PI))
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
