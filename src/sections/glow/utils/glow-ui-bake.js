import {
  applyGlowFilmGrainToCanvas,
  applyGlowCaptionGrainToCanvas,
  applyParallaxPostFxToContext
} from './glow-parallax-grain.js'

//
// Shared bake-time grain (and optional blur) for glow HUD / UI sprites.
//
const TEXT_PAD = 3
export const BIRD_FLAP_FRAME_COUNT = 8
const BIRD_BAKE_W = 28
const BIRD_BAKE_H = 18
const BIRD_BAKE_BLUR = 1.2
const BIRD_BAKE_LINE_WIDTH = 2
const ARROW_BAKE_W = 48
const ARROW_BAKE_H = 40
const NOTE_GLYPHS = ['♪', '♫', '♩', '♬', 'z', 'Z']
const NOTE_BAKE_SIZE = 28
const TOOLTIP_BAKE_PAD = 4
//
// Sprite name prefixes for glow UI bakes.
//
export const GLOW_BIRD_SPRITE_PREFIX = 'glow-bird-flap-'
export const GLOW_ARROW_SPRITE_PREFIX = 'glow-arrow-'
export const GLOW_NOTE_SPRITE_PREFIX = 'glow-idle-note-'
export const GLOW_TEXT_SPRITE_PREFIX = 'glow-ui-text-'

/**
 * Applies the standard glow film grain, optionally with blur first.
 * @param {HTMLCanvasElement} canvas
 * @param {number} [seedOffset=0]
 * @param {number} [blurRadius=0]
 */
export function finishGlowUiCanvas(canvas, seedOffset = 0, blurRadius = 0) {
  if (!canvas?.width || !canvas?.height) return
  if (blurRadius > 0) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    applyParallaxPostFxToContext(ctx, canvas.width, canvas.height, {
      blurRadius,
      grainSeedOffset: seedOffset
    })
    return
  }
  applyGlowFilmGrainToCanvas(canvas, seedOffset)
}
//
// Caption-only grain — lighter than the standard HUD / decor bake.
//
export function finishGlowCaptionCanvas(canvas, seedOffset = 0) {
  if (!canvas?.width || !canvas?.height) return
  applyGlowCaptionGrainToCanvas(canvas, seedOffset)
}

/**
 * Bakes multiline text to a canvas (fill + optional single shadow copy).
 * @param {string} text
 * @param {Object} cfg
 * @returns {HTMLCanvasElement}
 */
export function bakeGlowTextCanvas(text, cfg) {
  const {
    fontFamily,
    fontSize,
    fillStyle = '#ffffff',
    shadowStyle = null,
    shadowOffsetX = 1.5,
    shadowOffsetY = 1.5,
    align = 'left',
    lineSpacing = 0,
    pad = TEXT_PAD
  } = cfg
  const lines = String(text).split('\n')
  const probe = document.createElement('canvas').getContext('2d')
  probe.font = `${fontSize}px ${fontFamily}`
  let maxW = 0
  let totalH = 0
  const lineH = Math.ceil(fontSize * 1.15)
  lines.forEach((line, i) => {
    maxW = Math.max(maxW, probe.measureText(line).width)
    totalH += lineH
    i < lines.length - 1 && (totalH += lineSpacing)
  })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(maxW + pad * 2))
  canvas.height = Math.max(1, Math.ceil(totalH + pad * 2))
  const ctx = canvas.getContext('2d')
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.textBaseline = 'top'
  let y = pad
  lines.forEach((line, i) => {
    const lineW = ctx.measureText(line).width
    let x = pad
    align === 'center' && (x = (canvas.width - lineW) / 2)
    align === 'right' && (x = canvas.width - pad - lineW)
    shadowStyle && (() => {
      ctx.fillStyle = shadowStyle
      ctx.fillText(line, x + shadowOffsetX, y + shadowOffsetY)
    })()
    ctx.fillStyle = fillStyle
    ctx.fillText(line, x, y)
    y += lineH + (i < lines.length - 1 ? lineSpacing : 0)
  })
  return canvas
}

/**
 * Bakes text to a Kaplay sprite with glow grain.
 * @param {Object} k
 * @param {string} spriteName
 * @param {string} text
 * @param {Object} cfg
 * @param {number} [seedOffset=0]
 */
export function loadGlowTextSprite(k, spriteName, text, cfg, seedOffset = 0) {
  const canvas = bakeGlowTextCanvas(text, cfg)
  finishGlowUiCanvas(canvas, seedOffset, cfg.blurRadius ?? 0)
  k.loadSprite(spriteName, canvas)
  canvas.width = 0
  canvas.height = 0
}

/**
 * Stable short hash for sprite cache keys.
 * @param {string} key
 * @returns {number}
 */
export function glowUiHash(key) {
  let h = 2166136261
  const s = String(key)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Bakes one bird wing-stroke frame (white mask + blur + grain).
 * @param {Object} k
 */
export function bakeGlowBirdFlapSprites(k) {
  if (k.getSprite(GLOW_BIRD_SPRITE_PREFIX + '0')) return
  for (let f = 0; f < BIRD_FLAP_FRAME_COUNT; f++) {
    const flap = (f / BIRD_FLAP_FRAME_COUNT) * Math.PI * 2
    const canvas = document.createElement('canvas')
    canvas.width = BIRD_BAKE_W
    canvas.height = BIRD_BAKE_H
    const ctx = canvas.getContext('2d')
    const cx = BIRD_BAKE_W / 2
    const cy = BIRD_BAKE_H / 2
    const size = 10
    const wingTipY = cy + Math.sin(flap) * size * 0.7
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = BIRD_BAKE_LINE_WIDTH
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - size, wingTipY)
    ctx.lineTo(cx, cy)
    ctx.lineTo(cx + size, wingTipY)
    ctx.stroke()
    finishGlowUiCanvas(canvas, 7000 + f, BIRD_BAKE_BLUR)
    k.loadSprite(GLOW_BIRD_SPRITE_PREFIX + f, canvas)
    canvas.width = 0
    canvas.height = 0
  }
}

/**
 * Bakes left/right menu-style arrow sprites (white masks for runtime tint).
 * @param {Object} k
 * @param {Function} drawArrowFn - (ctx, w, h, side) => void in local canvas space
 */
export function bakeGlowArrowSprites(k, drawArrowFn) {
  const sides = ['left', 'right']
  sides.forEach((side, si) => {
    const name = `${GLOW_ARROW_SPRITE_PREFIX}${side}`
    if (k.getSprite(name)) return
    const canvas = document.createElement('canvas')
    canvas.width = ARROW_BAKE_W
    canvas.height = ARROW_BAKE_H
    const ctx = canvas.getContext('2d')
    drawArrowFn(ctx, ARROW_BAKE_W, ARROW_BAKE_H, side)
    finishGlowUiCanvas(canvas, 7100 + si)
    k.loadSprite(name, canvas)
    canvas.width = 0
    canvas.height = 0
  })
}

/**
 * Bakes humming / sleeping note glyphs for the hero mouth effect.
 * @param {Object} k
 * @param {string} fontFamily
 */
export function bakeGlowIdleNoteGlyphs(k, fontFamily) {
  NOTE_GLYPHS.forEach((glyph, i) => {
    const name = GLOW_NOTE_SPRITE_PREFIX + i
    if (k.getSprite(name)) return
    loadGlowTextSprite(k, name, glyph, {
      fontFamily,
      fontSize: 22,
      fillStyle: '#ffffff',
      align: 'center'
    }, 7200 + i)
  })
}

/**
 * Maps a note glyph char to its baked sprite name.
 * @param {string} glyph
 * @returns {string|null}
 */
export function glowIdleNoteSpriteForGlyph(glyph) {
  const idx = NOTE_GLYPHS.indexOf(glyph)
  return idx >= 0 ? GLOW_NOTE_SPRITE_PREFIX + idx : null
}

/**
 * Bakes a tooltip bubble (border, fill, pointer, text) to one canvas.
 * @param {Object} layout - Tooltip layout from tooltip.js
 * @param {string} fontFamily
 * @param {number} fontSize
 * @param {number} lineSpacing
 * @returns {HTMLCanvasElement}
 */
export function bakeGlowTooltipCanvas(layout, fontFamily, fontSize, lineSpacing) {
  const BUBBLE_BORDER_WIDTH = 3
  const BUBBLE_CORNER_RADIUS = 10
  const BUBBLE_PADDING_X = 14
  const BUBBLE_PADDING_Y = 10
  const POINTER_WIDTH = 12
  const POINTER_HEIGHT = 10
  const BUBBLE_BORDER_R = 20
  const BUBBLE_BG_R = 245
  const BUBBLE_BG_G = 242
  const BUBBLE_BG_B = 235
  const BUBBLE_BG_OPACITY = 0.92
  const TEXT_COLOR_R = 30
  const halfW = POINTER_WIDTH / 2
  const bx = layout.bubbleX - BUBBLE_BORDER_WIDTH
  const by = layout.bubbleY - BUBBLE_BORDER_WIDTH
  const px = layout.clampedPointerX
  const tipY = layout.pointerTipY
  const baseY = layout.pointerBaseEdge
  let minX = bx
  let minY = by
  let maxX = bx + layout.totalW
  let maxY = by + layout.totalH
  minX = Math.min(minX, px - halfW - BUBBLE_BORDER_WIDTH)
  maxX = Math.max(maxX, px + halfW + BUBBLE_BORDER_WIDTH)
  minY = Math.min(minY, tipY, baseY)
  maxY = Math.max(maxY, tipY, baseY)
  const pad = TOOLTIP_BAKE_PAD
  const canvasW = Math.ceil(maxX - minX + pad * 2)
  const canvasH = Math.ceil(maxY - minY + pad * 2)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, canvasW)
  canvas.height = Math.max(1, canvasH)
  const ctx = canvas.getContext('2d')
  const ox = pad - minX
  const oy = pad - minY
  const bubbleX = layout.bubbleX + ox
  const bubbleY = layout.bubbleY + oy
  roundRect(ctx, bubbleX - BUBBLE_BORDER_WIDTH, bubbleY - BUBBLE_BORDER_WIDTH,
    layout.bubbleW + BUBBLE_BORDER_WIDTH * 2, layout.bubbleH + BUBBLE_BORDER_WIDTH * 2,
    BUBBLE_CORNER_RADIUS + BUBBLE_BORDER_WIDTH)
  ctx.fillStyle = `rgb(${BUBBLE_BORDER_R},${BUBBLE_BORDER_R},${BUBBLE_BORDER_R})`
  ctx.fill()
  roundRect(ctx, bubbleX, bubbleY, layout.bubbleW, layout.bubbleH, BUBBLE_CORNER_RADIUS)
  ctx.fillStyle = `rgba(${BUBBLE_BG_R},${BUBBLE_BG_G},${BUBBLE_BG_B},${BUBBLE_BG_OPACITY})`
  ctx.fill()
  const pointerX = px + ox
  const pointerTip = tipY + oy
  const pointerBase = baseY + oy
  const pointsUp = layout.showBelow
  ctx.fillStyle = `rgb(${BUBBLE_BORDER_R},${BUBBLE_BORDER_R},${BUBBLE_BORDER_R})`
  ctx.beginPath()
  if (pointsUp) {
    ctx.moveTo(pointerX - halfW - BUBBLE_BORDER_WIDTH, pointerBase)
    ctx.lineTo(pointerX + halfW + BUBBLE_BORDER_WIDTH, pointerBase)
    ctx.lineTo(pointerX, pointerTip - BUBBLE_BORDER_WIDTH)
  } else {
    ctx.moveTo(pointerX - halfW - BUBBLE_BORDER_WIDTH, pointerBase)
    ctx.lineTo(pointerX + halfW + BUBBLE_BORDER_WIDTH, pointerBase)
    ctx.lineTo(pointerX, pointerTip + BUBBLE_BORDER_WIDTH)
  }
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = `rgba(${BUBBLE_BG_R},${BUBBLE_BG_G},${BUBBLE_BG_B},${BUBBLE_BG_OPACITY})`
  ctx.beginPath()
  if (pointsUp) {
    ctx.moveTo(pointerX - halfW, pointerBase)
    ctx.lineTo(pointerX + halfW, pointerBase)
    ctx.lineTo(pointerX, pointerTip)
  } else {
    ctx.moveTo(pointerX - halfW, pointerBase)
    ctx.lineTo(pointerX + halfW, pointerBase)
    ctx.lineTo(pointerX, pointerTip)
  }
  ctx.closePath()
  ctx.fill()
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = `rgb(${TEXT_COLOR_R},${TEXT_COLOR_R},${TEXT_COLOR_R})`
  const lines = layout.labelText.split('\n')
  const lineH = Math.ceil(fontSize * 1.15)
  const blockH = lines.length * lineH + (lines.length - 1) * lineSpacing
  let ty = bubbleY + layout.bubbleH / 2 - blockH / 2 + lineH / 2
  lines.forEach((line, i) => {
    ctx.fillText(line, bubbleX + layout.bubbleW / 2, ty)
    ty += lineH + (i < lines.length - 1 ? lineSpacing : 0)
  })
  finishGlowUiCanvas(canvas, glowUiHash(layout.labelText + layout.totalW))
  return canvas
}

/**
 * Bakes one tilted caption phrase (shadow + outline + fill) for letter pickup dialogs.
 * @param {string} text
 * @param {Object} cfg
 * @returns {HTMLCanvasElement}
 */
export function bakeGlowCaptionPieceCanvas(text, cfg) {
  const {
    fontFamily,
    fontSize,
    fillStyle,
    shadowStyle,
    shadowOffsetX = 2,
    shadowOffsetY = 2,
    outlineStyle,
    outlineOffsets = [],
    outlinePad = 1,
    align = 'left',
    lineSpacing = 0,
    pad = 6,
    applyGrain = false
  } = cfg
  const lines = String(text).split('\n')
  const probe = document.createElement('canvas').getContext('2d')
  probe.font = `${fontSize}px ${fontFamily}`
  let maxW = 0
  let totalH = 0
  const lineH = Math.ceil(fontSize * 1.15)
  lines.forEach((line, i) => {
    maxW = Math.max(maxW, probe.measureText(line).width)
    totalH += lineH
    i < lines.length - 1 && (totalH += lineSpacing)
  })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(maxW + pad * 2 + outlinePad * 4))
  canvas.height = Math.max(1, Math.ceil(totalH + pad * 2 + outlinePad * 4))
  const makeLayer = () => {
    const layer = document.createElement('canvas')
    layer.width = canvas.width
    layer.height = canvas.height
    return layer
  }
  const drawLinesOn = (layerCtx, style, ox, oy) => {
    layerCtx.font = `${fontSize}px ${fontFamily}`
    layerCtx.textBaseline = 'top'
    layerCtx.fillStyle = style
    let y = pad + oy
    lines.forEach((line, i) => {
      let x = pad + ox
      const lineW = layerCtx.measureText(line).width
      align === 'center' && (x = (canvas.width - lineW) / 2 + ox)
      align === 'right' && (x = canvas.width - pad - lineW + ox)
      layerCtx.fillText(line, x, y)
      y += lineH + (i < lines.length - 1 ? lineSpacing : 0)
    })
  }
  const shadowLayer = shadowStyle ? makeLayer() : null
  const fillLayer = makeLayer()
  const outlineLayer = outlineStyle ? makeLayer() : null
  shadowStyle && drawLinesOn(shadowLayer.getContext('2d'), shadowStyle, shadowOffsetX, shadowOffsetY)
  const fillCtx = fillLayer.getContext('2d')
  fillCtx.imageSmoothingEnabled = false
  drawLinesOn(fillCtx, fillStyle, 0, 0)
  applyGrain && finishGlowCaptionCanvas(fillLayer, glowUiHash(text + fontSize))
  outlineStyle && outlineOffsets.forEach(([odx, ody]) => {
    const outlineCtx = outlineLayer.getContext('2d')
    outlineCtx.imageSmoothingEnabled = false
    drawLinesOn(outlineCtx, outlineStyle, odx * outlinePad, ody * outlinePad)
  })
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  shadowLayer && ctx.drawImage(shadowLayer, 0, 0)
  //
  // Outline sits under the fill — its 8 offset copies overlap the glyph body,
  // so drawing them on top would repaint most of the fill and turn the text
  // into a thick, blurry blob.
  //
  outlineLayer && ctx.drawImage(outlineLayer, 0, 0)
  ctx.drawImage(fillLayer, 0, 0)
  return canvas
}

/**
 * Bakes the pickup caption first row (before + highlighted letter + after) on
 * one canvas so every glyph shares the same baseline and the collected
 * letter cannot drift or disappear between separate sprites.
 * @param {Object} cfg
 * @returns {{ canvas: HTMLCanvasElement, hlAnchorX: number, hlAnchorY: number, rowCenterDx: number }}
 */
export function bakeGlowCaptionFirstRowCanvas(cfg) {
  const {
    before = '',
    hlChar = '',
    afterFirst = '',
    fontFamily,
    fontSize,
    bodyFillStyle,
    hlFillStyle,
    shadowStyle,
    shadowOffsetX = 2,
    shadowOffsetY = 2,
    outlineStyle,
    outlineOffsets = [],
    outlinePad = 1,
    hlApplyGrain = true,
    pad = 6,
    seed = 0
  } = cfg
  const probe = document.createElement('canvas').getContext('2d')
  probe.font = `${fontSize}px ${fontFamily}`
  const beforeW = before ? probe.measureText(before).width : 0
  const hlW = hlChar ? probe.measureText(hlChar).width : 0
  const afterW = afterFirst ? probe.measureText(afterFirst).width : 0
  const textW = beforeW + hlW + afterW
  const lineH = Math.ceil(fontSize * 1.15)
  const outlineExpand = outlineStyle ? Math.ceil(outlinePad * 2) : 0
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(textW + pad * 2 + outlineExpand * 2))
  canvas.height = Math.max(1, Math.ceil(lineH + pad * 2 + outlineExpand * 2))
  const textX0 = pad + outlineExpand
  const textY = pad + outlineExpand
  const segments = []
  let x = textX0
  before && segments.push({ text: before, x, grain: false, fillStyle: bodyFillStyle })
  before && (x += beforeW)
  hlChar && segments.push({ text: hlChar, x, grain: hlApplyGrain, fillStyle: hlFillStyle })
  hlChar && (x += hlW)
  afterFirst && segments.push({ text: afterFirst, x, grain: false, fillStyle: bodyFillStyle })
  const hlAnchorX = textX0 + beforeW + hlW / 2
  const hlAnchorY = textY + lineH / 2
  //
  // Horizontal distance from the highlighted letter (the row's anchor point)
  // to the row's own visual centre. The caller places the following lines at
  // this offset so every line shares one centre axis — measured here with the
  // same canvas metrics that laid the row out, not re-measured by the caller.
  //
  const rowCenterDx = (afterW - beforeW) / 2
  const makeLayer = () => {
    const layer = document.createElement('canvas')
    layer.width = canvas.width
    layer.height = canvas.height
    return layer
  }
  const drawSegmentsOn = (layerCtx, style, ox, oy, perSegmentFill = false) => {
    layerCtx.font = `${fontSize}px ${fontFamily}`
    layerCtx.textBaseline = 'top'
    layerCtx.imageSmoothingEnabled = false
    segments.forEach(seg => {
      layerCtx.fillStyle = perSegmentFill ? seg.fillStyle : style
      layerCtx.fillText(seg.text, seg.x + ox, textY + oy)
    })
  }
  const shadowLayer = shadowStyle ? makeLayer() : null
  const bodyFillLayer = makeLayer()
  const hlFillLayer = hlChar ? makeLayer() : null
  const outlineLayer = outlineStyle ? makeLayer() : null
  shadowStyle && drawSegmentsOn(shadowLayer.getContext('2d'), shadowStyle, shadowOffsetX, shadowOffsetY)
  const bodyCtx = bodyFillLayer.getContext('2d')
  segments.forEach(seg => {
    if (seg.grain) return
    bodyCtx.font = `${fontSize}px ${fontFamily}`
    bodyCtx.textBaseline = 'top'
    bodyCtx.imageSmoothingEnabled = false
    bodyCtx.fillStyle = seg.fillStyle
    bodyCtx.fillText(seg.text, seg.x, textY)
  })
  if (hlFillLayer) {
    const hlSeg = segments.find(seg => seg.grain)
    const hlCtx = hlFillLayer.getContext('2d')
    hlCtx.imageSmoothingEnabled = false
    hlCtx.font = `${fontSize}px ${fontFamily}`
    hlCtx.textBaseline = 'top'
    hlCtx.fillStyle = hlSeg.fillStyle
    hlCtx.fillText(hlSeg.text, hlSeg.x, textY)
    hlApplyGrain && finishGlowCaptionCanvas(hlFillLayer, glowUiHash(hlChar + fontSize + seed))
  }
  outlineStyle && outlineOffsets.forEach(([odx, ody]) => {
    drawSegmentsOn(outlineLayer.getContext('2d'), outlineStyle, odx * outlinePad, ody * outlinePad)
  })
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  shadowLayer && ctx.drawImage(shadowLayer, 0, 0)
  //
  // Outline first, both fills on top — see bakeGlowCaptionPieceCanvas(): an
  // outline painted last would swallow the highlighted letter's gold.
  //
  outlineLayer && ctx.drawImage(outlineLayer, 0, 0)
  ctx.drawImage(bodyFillLayer, 0, 0)
  hlFillLayer && ctx.drawImage(hlFillLayer, 0, 0)
  return { canvas, hlAnchorX, hlAnchorY, rowCenterDx }
}

/**
 * Creates a glow baked-text holder that swaps Kaplay sprites on text change.
 * @param {Object} k
 * @param {Object} cfg
 * @returns {Object}
 */
export function createGlowBakedTextHolder(k, cfg) {
  const {
    prefix,
    fontFamily,
    fontSize,
    fillStyle,
    shadowStyle,
    shadowOffsetX,
    shadowOffsetY,
    align,
    lineSpacing,
    anchor = 'center',
    z,
    fixed = true,
    seedBase = 9000
  } = cfg
  const holder = {
    k,
    prefix,
    fontFamily,
    fontSize,
    fillStyle,
    shadowStyle,
    shadowOffsetX,
    shadowOffsetY,
    align,
    lineSpacing,
    anchor,
    z,
    fixed,
    seedBase,
    lastText: null,
    lastSprite: null,
    main: null,
    shadow: null
  }
  return holder
}

/**
 * Updates or creates baked-text sprite objects for a holder.
 * @param {Object} holder - From createGlowBakedTextHolder
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} [opacity=1]
 */
export function syncGlowBakedTextHolder(holder, text, x, y, opacity = 1) {
  const { k, prefix, fontFamily, fontSize, fillStyle, shadowStyle, shadowOffsetX, shadowOffsetY, align, lineSpacing, anchor, z, fixed, seedBase } = holder
  if (holder.lastText === text && holder.main?.exists?.()) {
    holder.main.pos.x = x
    holder.main.pos.y = y
    holder.main.opacity = opacity
    holder.shadow && (holder.shadow.opacity = opacity * (holder.shadowOpacity ?? 0.85))
    return
  }
  holder.lastText = text
  const seed = seedBase + glowUiHash(text)
  const mainName = `${prefix}-main-${glowUiHash(text)}`
  loadGlowTextSprite(k, mainName, text, {
    fontFamily, fontSize, fillStyle, align, lineSpacing
  }, seed)
  holder.main?.exists?.() && k.destroy(holder.main)
  holder.shadow?.exists?.() && k.destroy(holder.shadow)
  holder.main = k.add([
    k.sprite(mainName),
    k.pos(x, y),
    k.anchor(anchor),
    k.opacity(opacity),
  ])
  fixed && (holder.main.fixed = true)
  z !== undefined && (holder.main.z = z)
  if (shadowStyle) {
    const shadowName = `${prefix}-shadow-${glowUiHash(text)}`
    loadGlowTextSprite(k, shadowName, text, {
      fontFamily, fontSize, fillStyle: shadowStyle, align, lineSpacing
    }, seed + 1)
    holder.shadow = k.add([
      k.sprite(shadowName),
      k.pos(x + (shadowOffsetX ?? 1.5), y + (shadowOffsetY ?? 1.5)),
      k.anchor(anchor),
      k.opacity(opacity * (holder.shadowOpacity ?? 0.85)),
    ])
    fixed && (holder.shadow.fixed = true)
    z !== undefined && (holder.shadow.z = z - 0.1)
  }
}

/**
 * Destroys baked-text holder Kaplay objects.
 * @param {Object} holder
 */
export function destroyGlowBakedTextHolder(holder) {
  if (!holder) return
  holder.main?.exists?.() && holder.k.destroy(holder.main)
  holder.shadow?.exists?.() && holder.k.destroy(holder.shadow)
  holder.main = null
  holder.shadow = null
  holder.lastText = null
}

//
// Rounded rect helper for tooltip bake.
//
function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.lineTo(x + w - rad, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad)
  ctx.lineTo(x + w, y + h - rad)
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h)
  ctx.lineTo(x + rad, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad)
  ctx.lineTo(x, y + rad)
  ctx.quadraticCurveTo(x, y, x + rad, y)
  ctx.closePath()
}
