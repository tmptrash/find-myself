//
// Forest level camera — one world pixel is always one screen pixel. The
// playfield (a fixed world rectangle) fills the whole screen and the camera
// follows the hero across it on every axis where the screen is smaller than
// the playfield. On an axis where the screen is larger, the playfield sits
// centred with void around it and the camera stands still on that axis.
//
// Kaplay uses a *center-anchored* camera: cam.pos is the world point drawn at
// the canvas centre.
//
// With a vertical rest the camera stays at the height it has for a hero at
// restY and only rises by as much as he climbs above riseY (higher than the
// rest, e.g. a high branch).
//
const FOLLOW_Y_RATE = 8
//
// Look-ahead on a screen held upright (taller than wide): the camera leads
// the running hero by LEAD_SHARE of the view's width in the way he runs, so
// more of the level shows ahead of him and he sits toward the trailing edge.
// The lead never moves while he stands. It takes a new way only after he
// has run that way for LEAD_TURN_HOLD seconds (a step or a turn on the spot
// changes nothing), and then shifts only as he runs: LEAD_CATCH px of lead
// per px he covers, ramping in over LEAD_RAMP seconds and slowing down
// within LEAD_SOFT px of where it is going — so he drifts across the screen
// to the other side over a run instead of the view jumping. A move under
// LEAD_MOVE_EPS px a frame does not count as running.
//
const LEAD_SHARE = 0.22
const LEAD_MOVE_EPS = 0.5
const LEAD_TURN_HOLD = 0.4
const LEAD_CATCH = 0.45
const LEAD_RAMP = 0.5
const LEAD_SOFT = 60
const LEAD_SOFT_MIN = 0.15

/**
 * Creates the forest camera controller.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.playX - World X of the playfield's left edge
 * @param {number} cfg.playY - World Y of the playfield's top edge
 * @param {number} cfg.playW - Playfield width (world px, fixed)
 * @param {number} cfg.playH - Playfield height (world px, fixed)
 * @param {{restY: number, riseY: number}} [cfg.rest] - Hero Y the camera keeps to and the hero Y
 *   above which it rises with him (none: it follows him everywhere)
 * @returns {Object} Camera instance
 */
export function create(cfg) {
  const { k, playX, playY, playW, playH, rest = null } = cfg
  const rect = playfieldScreenRect(k.width(), k.height(), playW, playH)
  const viewW = rect.x2 - rect.x1
  const viewH = rect.y2 - rect.y1
  const minCamX = playX - rect.x1 + k.width() / 2
  const minCamY = playY - rect.y1 + k.height() / 2
  return {
    k,
    viewW,
    viewH,
    minCamX,
    maxCamX: minCamX + playW - viewW,
    minCamY,
    maxCamY: minCamY + playH - viewH,
    camY: minCamY,
    rest,
    //
    // 1 = full playfield; higher values zoom in (Kaplay camScale).
    //
    zoom: 1,
    leadX: 0,
    leadDir: 0,
    runDir: 0,
    runTime: 0,
    lastHeroX: null,
    shakeAmp: 0,
    shakeDuration: 0,
    shakeElapsed: 0,
    shakeOffsetX: 0,
    shakeOffsetY: 0
  }
}

/**
 * Where the playfield shows on screen: the whole screen on an axis where the
 * playfield is larger than the screen, centred (whole pixels) where it is
 * smaller — except a screen narrower than the playfield and taller than it
 * (a phone held upright): there it stands on the screen's bottom edge, so
 * the void is only above the sky and the on-screen buttons stay over the
 * ground.
 * @param {number} screenW - Live screen width
 * @param {number} screenH - Live screen height
 * @param {number} playW - Playfield width (world px)
 * @param {number} playH - Playfield height (world px)
 * @returns {Object} Screen rectangle { x1, y1, x2, y2 }
 */
export function playfieldScreenRect(screenW, screenH, playW, playH) {
  const x1 = Math.max(0, Math.round((screenW - playW) / 2))
  const slack = Math.max(0, screenH - playH)
  const y1 = screenW < playW ? slack : Math.round(slack / 2)
  return { x1, y1, x2: x1 + Math.min(screenW, playW), y2: y1 + Math.min(screenH, playH) }
}

/**
 * Starts a short screen shake on the playfield camera.
 * @param {Object} inst - Camera instance
 * @param {number} amplitude - Peak offset in world pixels
 * @param {number} durationSec - Fade-out duration in seconds
 */
export function triggerShake(inst, amplitude, durationSec) {
  inst.shakeAmp = amplitude
  inst.shakeDuration = durationSec
  inst.shakeElapsed = 0
}

/**
 * Advances shake decay; call once per frame before followHero.
 * @param {Object} inst - Camera instance
 * @param {number} dt - Delta time in seconds
 */
export function updateShake(inst, dt) {
  if (!inst.shakeDuration || inst.shakeElapsed >= inst.shakeDuration) {
    inst.shakeOffsetX = 0
    inst.shakeOffsetY = 0
    return
  }
  inst.shakeElapsed += dt
  const t = 1 - inst.shakeElapsed / inst.shakeDuration
  const amp = inst.shakeAmp * t
  inst.shakeOffsetX = (Math.random() - 0.5) * 2 * amp
  inst.shakeOffsetY = (Math.random() - 0.5) * 2 * amp
}

/**
 * Follows the hero: at once horizontally, eased vertically (only where the
 * screen is shorter than the playfield, and with a vertical rest only above
 * its riseY), never past the playfield's edges.
 * @param {Object} inst - Camera instance from create()
 * @param {number} heroX - Hero world X (anchor centre)
 * @param {number} heroY - Hero world Y (anchor centre)
 * @param {boolean} [pixelAlignX=true] - Snap cam X so the hero outline stays crisp
 * @param {boolean} [freeY=false] - Follow him vertically everywhere (ignore the rest)
 */
export function followHero(inst, heroX, heroY, pixelAlignX = true, freeY = false) {
  const targetY = clampCamY(inst, followY(inst, heroY, freeY))
  inst.camY += (targetY - inst.camY) * Math.min(1, inst.k.dt() * FOLLOW_Y_RATE)
  placeCamera(inst, heroX, pixelAlignX)
}

/**
 * Puts the camera straight onto the hero (spawn, respawn, teleports).
 * @param {Object} inst - Camera instance from create()
 * @param {number} heroX - Hero world X (anchor centre)
 * @param {number} heroY - Hero world Y (anchor centre)
 * @param {boolean} [freeY=false] - Follow him vertically everywhere (ignore the rest)
 */
export function snapToHero(inst, heroX, heroY, freeY = false) {
  inst.camY = clampCamY(inst, followY(inst, heroY, freeY))
  inst.leadX = 0
  inst.leadDir = 0
  inst.runDir = 0
  inst.runTime = 0
  inst.lastHeroX = heroX
  placeCamera(inst, heroX, true)
}

/**
 * Nudges the hero onto the vertical screen-pixel grid — keeps his outline
 * crisp whatever the camera does vertically.
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @param {number} camY - Current camera world Y
 */
export function snapHeroScreenY(k, heroInst, camY) {
  const ch = heroInst?.character
  if (!ch?.pos || heroInst?.isSubmerging) return
  const halfH = k.height() / 2
  const screenY = ch.pos.y - camY + halfH
  const target = Math.round(screenY)
  const delta = target - screenY
  delta !== 0 && (ch.pos.y += delta)
}
export function getParallaxLayerPad(inst, speed, horizBleed = 0) {
  const maxScroll = inst.maxCamX - inst.minCamX
  return Math.ceil(maxScroll * (1 - speed)) + horizBleed
}
//
// World X for a parallax sprite. Speed is the layer's camera-follow fraction:
// 1.0 = moves with the world, lower values lag behind (Owlboy-style).
//
export function getParallaxDrawX(inst, speed, horizBleed = 0) {
  const scroll = inst.k.camPos().x - inst.minCamX
  const pad = getParallaxLayerPad(inst, speed, horizBleed)
  return -pad + scroll * (1 - speed)
}
//
// Sets the camera at the hero's X (clamped) and the eased camera Y, both on
// the whole-pixel grid, plus the shake.
//
function placeCamera(inst, heroX, pixelAlignX) {
  const k = inst.k
  const aimX = heroX + updateLead(inst, heroX)
  const desiredCamX = Math.max(inst.minCamX, Math.min(inst.maxCamX, aimX))
  const camX = pixelAlignX && desiredCamX === aimX
    ? alignCamXForSubject(k, heroX, desiredCamX)
    : alignCamToGrid(k.width(), desiredCamX)
  const camY = alignCamToGrid(k.height(), inst.camY)
  k.camPos(camX + (inst.shakeOffsetX ?? 0), camY + (inst.shakeOffsetY ?? 0))
}
//
// The camera's look-ahead this frame (see LEAD_SHARE): none unless the
// screen is held upright.
//
function updateLead(inst, heroX) {
  const k = inst.k
  const moved = inst.lastHeroX === null ? 0 : heroX - inst.lastHeroX
  inst.lastHeroX = heroX
  if (k.height() <= k.width()) {
    inst.leadX = 0
    return 0
  }
  if (Math.abs(moved) <= LEAD_MOVE_EPS) return inst.leadX
  trackRun(inst, Math.sign(moved), k.dt())
  const delta = inst.leadDir * inst.viewW * LEAD_SHARE - inst.leadX
  const ramp = Math.min(1, Math.max(0, inst.runTime - LEAD_TURN_HOLD) / LEAD_RAMP)
  const soft = Math.max(LEAD_SOFT_MIN, Math.min(1, Math.abs(delta) / LEAD_SOFT))
  const step = Math.abs(moved) * LEAD_CATCH * ramp * soft
  inst.leadX += Math.sign(delta) * Math.min(Math.abs(delta), step)
  return inst.leadX
}
//
// How long the hero has been running his current way; the lead takes that
// way once he has kept to it LEAD_TURN_HOLD seconds.
//
function trackRun(inst, dir, dt) {
  inst.runTime = dir === inst.runDir ? inst.runTime + dt : 0
  inst.runDir = dir
  inst.runTime >= LEAD_TURN_HOLD && (inst.leadDir = dir)
}
//
// The hero Y the camera centres on: his own, or the rest height raised by
// how far he is above riseY.
//
function followY(inst, heroY, freeY) {
  const { rest } = inst
  if (!rest || freeY) return heroY
  return rest.restY + Math.min(0, heroY - rest.riseY)
}
function clampCamY(inst, y) {
  return Math.max(inst.minCamY, Math.min(inst.maxCamY, y))
}
//
// Kaplay maps world to screen as (subject - camPos) + screenSize/2. When the
// window is an odd width the screen centre is fractional (e.g. 960.5), so
// camPos === subject still lands the hero on a half-pixel column and the 1 px
// outline shimmers — most visible while running. Offset camPos so the subject
// renders on an integer screen coordinate instead.
//
function alignCamXForSubject(k, subjectX, desiredCamX) {
  const halfW = k.width() / 2
  return subjectX + halfW - Math.round(subjectX - desiredCamX + halfW)
}
//
// Camera position whose world-to-screen offset is a whole number of pixels,
// so the world itself lands on the screen-pixel grid.
//
function alignCamToGrid(screenSize, cam) {
  const half = screenSize / 2
  return half - Math.round(half - cam)
}
