import { getRGB } from '../../../utils/helper.js'
import * as Lead from '../../../utils/camera-lead.js'
import * as Layout from './cave-layout.js'
import { CAVE_CFG } from '../cfg.js'
//
// Playfield window and camera of cave lesson 0. The window fills the whole
// screen; only on an axis where the screen is bigger than the world is the
// world centred with a void band beside it, and only when it is bigger on
// both axes does the window get rounded corners. The camera follows the
// hero on both axes and keeps world pixels on whole screen pixels so baked
// art and the hero outline stay crisp.
//
const CORNER_RADIUS = 20
const CORNER_SPRITE = 'cave0-corner-v1'
const CORNER_ARC_END = 1.5
//
// Camera: hero sits a little above the window centre (the level descends),
// smooth follow speed, and a faster catch-up while falling — blended in
// with the fall speed (between FALL_SPEED_FROM and FALL_SPEED_TO) and eased
// over time, so the camera never lurches when the rate changes. On a
// screen held upright it also leads the running hero (camera-lead.js, as
// in the forest): he sits toward the trailing edge, more of the cave shows
// ahead of him.
//
const LOOK_DOWN_FRAC = 0.12
const FOLLOW_RATE = 6
const FALL_FOLLOW_RATE = 11
const FALL_SPEED_FROM = 300
const FALL_SPEED_TO = 900
const RATE_EASE = 4
const ROTATE_TR = 90
const ROTATE_BR = 180
const ROTATE_BL = 270
const cornerFor = new WeakSet()

/**
 * Computes the window rectangle for the live screen and sets up the camera.
 * @param {Object} k - Kaplay instance
 * @returns {Object} View instance
 */
export function create(k) {
  const screenW = k.width()
  const screenH = k.height()
  const winW = Math.min(screenW, Layout.WORLD_W)
  const winH = Math.min(screenH, Layout.WORLD_H)
  bakeCorner(k)
  return {
    k,
    screenW,
    screenH,
    rounded: screenW > Layout.WORLD_W && screenH > Layout.WORLD_H,
    winX: Math.round((screenW - winW) / 2),
    winY: Math.round((screenH - winH) / 2),
    winW,
    winH,
    camX: winW / 2,
    camY: winH / 2,
    rate: FOLLOW_RATE,
    lead: Lead.create(),
    frameRgb: getRGB(k, CAVE_CFG.colors.frame)
  }
}

/**
 * Snaps the camera straight onto a world point (spawn, respawn).
 * @param {Object} inst - View instance
 * @param {number} x - World X
 * @param {number} y - World Y
 */
export function snapTo(inst, x, y) {
  Lead.reset(inst.lead, x)
  inst.camX = clampX(inst, x)
  inst.camY = clampY(inst, y + inst.winH * LOOK_DOWN_FRAC)
  apply(inst)
}

/**
 * Smoothly follows a world point; faster while it falls.
 * @param {Object} inst - View instance
 * @param {number} x - World X
 * @param {number} y - World Y
 * @param {number} vy - Vertical speed (px/s)
 */
export function follow(inst, x, y, vy) {
  const dt = inst.k.dt()
  const fall = Math.max(0, Math.min(1, (vy - FALL_SPEED_FROM) / (FALL_SPEED_TO - FALL_SPEED_FROM)))
  inst.rate += (FOLLOW_RATE + (FALL_FOLLOW_RATE - FOLLOW_RATE) * fall - inst.rate) * (1 - Math.exp(-RATE_EASE * dt))
  const t = 1 - Math.exp(-inst.rate * dt)
  inst.camX += (clampX(inst, x + Lead.update(inst.lead, inst.k, x, inst.winW)) - inst.camX) * t
  inst.camY += (clampY(inst, y + inst.winH * LOOK_DOWN_FRAC) - inst.camY) * t
  apply(inst)
}

/**
 * Visible world rectangle for culling and the darkness pass.
 * @param {Object} inst - View instance
 * @param {Object} [out] - Rectangle to fill (reused by per-frame callers); a new one if left out
 * @returns {{left: number, top: number, right: number, bottom: number}}
 */
export function worldRect(inst, out = {}) {
  out.left = Math.round(inst.camX - inst.winW / 2)
  out.top = Math.round(inst.camY - inst.winH / 2)
  out.right = out.left + inst.winW
  out.bottom = out.top + inst.winH
  return out
}

/**
 * Size of the visible world window.
 * @param {Object} inst - View instance
 * @returns {{w: number, h: number}}
 */
export function windowSize(inst) {
  return { w: inst.winW, h: inst.winH }
}

/**
 * Screen-space void bands beside a world smaller than the screen, rounded
 * corners when it is smaller on both axes.
 * @param {Object} inst - View instance
 */
export function onDrawFrame(inst) {
  const k = inst.k
  const { winX, winY, winW, winH, screenW, screenH } = inst
  const rect = (x, y, w, h) => w > 0 && h > 0 && k.drawRect({ pos: k.vec2(x, y), width: w, height: h, color: inst.frameRgb, fixed: true })
  rect(0, 0, screenW, winY)
  rect(0, winY + winH, screenW, screenH - winY - winH)
  rect(0, winY, winX, winH)
  rect(winX + winW, winY, screenW - winX - winW, winH)
  if (!inst.rounded) return
  const r = CORNER_RADIUS
  const corner = (x, y, angle) => k.drawSprite({ sprite: CORNER_SPRITE, pos: k.vec2(x, y), angle, fixed: true })
  corner(winX - r, winY - r, 0)
  corner(winX + winW + r, winY - r, ROTATE_TR)
  corner(winX + winW + r, winY + winH + r, ROTATE_BR)
  corner(winX - r, winY + winH + r, ROTATE_BL)
}

//
// Kaplay camPos is the world point drawn at the screen centre; the window
// centre is offset from it, and the result is rounded to whole pixels.
//
function apply(inst) {
  const r = worldRect(inst)
  const camPosX = r.left - inst.winX + inst.screenW / 2
  const camPosY = r.top - inst.winY + inst.screenH / 2
  inst.k.camPos(camPosX, camPosY)
}
function clampX(inst, x) {
  const half = inst.winW / 2
  return Math.max(half, Math.min(Layout.WORLD_W - half, x))
}
function clampY(inst, y) {
  const half = inst.winH / 2
  return Math.max(half, Math.min(Layout.WORLD_H - half, y))
}
//
// Square in the frame tone with a quarter-circle cut toward the window.
//
function bakeCorner(k) {
  if (cornerFor.has(k)) return
  const size = CORNER_RADIUS * 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = CAVE_CFG.colors.frame
  ctx.fillRect(0, 0, size, size)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.moveTo(size, size)
  ctx.arc(size, size, CORNER_RADIUS, Math.PI, Math.PI * CORNER_ARC_END, false)
  ctx.closePath()
  ctx.fill()
  k.loadSprite(CORNER_SPRITE, canvas)
  cornerFor.add(k)
}
