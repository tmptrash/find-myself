//
// Glow level camera — scrolls a 3000×1080 world horizontally through a fixed
// viewport window (playfield between the HUD bar and the bottom screen margin).
//
// Kaplay uses a *center-anchored* camera: cam.pos is the world point drawn at
// the canvas centre. The playfield window is inset (top HUD + side margins +
// bottom strip), so fixedCamY is chosen once so the full map height fits the
// window without ever scrolling vertically.
//

/**
 * Creates the glow camera controller.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.viewW - Visible world width through the playfield window
 * @param {number} cfg.viewH - Visible world height through the playfield window
 * @param {number} cfg.worldW - Full world width
 * @param {number} cfg.leftMargin - World/playfield inset on the left
 * @param {number} cfg.rightMargin - World/playfield inset on the right
 * @param {number} [cfg.fixedCamY] - World Y drawn at screen vertical centre.
 *   Defaults to the live screen's own centre (world height fills whatever
 *   window height there is); pass a fixed design-resolution half-height
 *   instead to keep the world pinned to its design layout and let a
 *   taller-than-design window grow as pure letterbox padding above/below.
 * @returns {Object} Camera instance
 */
export function create(cfg) {
  const { k, viewW, viewH, worldW, leftMargin, rightMargin, fixedCamY: fixedCamYOverride } = cfg
  //
  // Keep the world origin aligned with the screen origin: screen centre is
  // the fixed vertical camera anchor since the world height already matches
  // the playfield window (top HUD bar + bottom strip are screen-space only).
  //
  const fixedCamY = fixedCamYOverride ?? Math.round(k.height() / 2)
  const halfViewW = viewW / 2
  return {
    k,
    viewW,
    viewH,
    worldW,
    leftMargin,
    rightMargin,
    fixedCamY,
    minCamX: leftMargin + halfViewW,
    maxCamX: worldW - rightMargin - halfViewW,
    //
    // 1 = full playfield; higher values zoom in (Kaplay camScale).
    //
    zoom: 1,
    introZoomActive: false,
    introPhase: 'hold',
    introZoomElapsed: 0,
    introHoldDuration: 0,
    introZoomDuration: 0,
    introZoomFrom: 1,
    shakeAmp: 0,
    shakeDuration: 0,
    shakeElapsed: 0,
    shakeOffsetX: 0,
    shakeOffsetY: 0
  }
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
 * Starts the opening camera intro: holds a tight hero close-up for
 * `holdDurationSec`, then snaps back out to the full playfield view over
 * `zoomOutDurationSec`.
 * @param {Object} inst - Camera instance
 * @param {number} fromScale - Starting camScale (e.g. 4 = zoomed in)
 * @param {number} holdDurationSec - Seconds to hold the zoomed-in view
 * @param {number} zoomOutDurationSec - Ease-out duration in seconds
 */
export function beginIntroZoom(inst, fromScale, holdDurationSec, zoomOutDurationSec) {
  inst.introZoomFrom = fromScale
  inst.introHoldDuration = holdDurationSec
  inst.introZoomDuration = zoomOutDurationSec
  inst.introZoomElapsed = 0
  inst.introPhase = 'hold'
  inst.introZoomActive = true
  inst.zoom = fromScale
  inst.k.camScale(fromScale)
}
/**
 * Advances the intro zoom animation; call once per frame from the scene update.
 * Holds the tight zoom in place, then eases it out with a fast-start,
 * decelerating "jerk" back to the full playfield view.
 * @param {Object} inst - Camera instance
 * @param {number} dt - Delta time in seconds
 */
export function updateIntroZoom(inst, dt) {
  if (!inst.introZoomActive) return
  inst.introZoomElapsed += dt
  if (inst.introPhase === 'hold') {
    if (inst.introZoomElapsed < inst.introHoldDuration) return
    inst.introPhase = 'zoomOut'
    inst.introZoomElapsed = 0
  }
  const t = Math.min(1, inst.introZoomElapsed / inst.introZoomDuration)
  const eased = 1 - (1 - t) * (1 - t)
  inst.zoom = inst.introZoomFrom + (1 - inst.introZoomFrom) * eased
  inst.k.camScale(inst.zoom)
  if (t >= 1) {
    inst.introZoomActive = false
    inst.zoom = 1
    inst.k.camScale(1)
  }
}

/**
 * Follows the hero horizontally only; vertical camera position stays fixed so
 * jumps never scroll the map up or down. During the intro zoom the camera
 * centres on the hero both axes, then eases toward the fixed playfield Y.
 * @param {Object} inst - Camera instance from create()
 * @param {number} heroX - Hero world X (anchor centre)
 * @param {number} [heroY] - Hero world Y (used during intro zoom)
 */
export function followHero(inst, heroX, heroY) {
  const zoom = inst.zoom || 1
  const halfViewW = inst.viewW / (2 * zoom)
  const minCamX = inst.leftMargin + halfViewW
  const maxCamX = inst.worldW - inst.rightMargin - halfViewW
  const desiredCamX = Math.max(minCamX, Math.min(maxCamX, heroX))
  let desiredCamY = inst.fixedCamY
  if (inst.introZoomActive && heroY != null) {
    if (inst.introPhase === 'hold') {
      desiredCamY = heroY
    } else {
      const t = Math.min(1, inst.introZoomElapsed / inst.introZoomDuration)
      const eased = 1 - (1 - t) * (1 - t)
      desiredCamY = heroY + (inst.fixedCamY - heroY) * eased
    }
  }
  const shakeX = inst.shakeOffsetX ?? 0
  const shakeY = inst.shakeOffsetY ?? 0
  const k = inst.k
  let camX = alignCamXForSubject(k, heroX, desiredCamX + shakeX)
  let camY = desiredCamY + shakeY
  if (inst.introZoomActive && heroY != null) {
    camY = alignCamYForSubject(k, heroY, desiredCamY + shakeY)
  }
  k.camPos(camX, camY)
}
/**
 * Sets camera position so a world subject lands on an integer screen pixel.
 * Use during scripted pans (letter peek) while the hero must stay crisp.
 * @param {Object} k - Kaplay instance
 * @param {number} subjectX - World X of the subject to pixel-align (hero)
 * @param {number} subjectY - World Y of the subject to pixel-align (hero)
 * @param {number} desiredCamX - Target camera X before alignment
 * @param {number} desiredCamY - Target camera Y before alignment
 */
export function setCamPosForPixelAlignedSubject(k, subjectX, subjectY, desiredCamX, desiredCamY) {
  k.camPos(
    alignCamXForSubject(k, subjectX, desiredCamX),
    alignCamYForSubject(k, subjectY, desiredCamY)
  )
}
/**
 * Pixel-aligns only camera X so a subject stays crisp during scripted pans
 * while camera Y remains fixed (letter peek, intro hold).
 * @param {Object} k - Kaplay instance
 * @param {number} subjectX - World X of the subject to pixel-align
 * @param {number} desiredCamX - Target camera X before alignment
 * @param {number} camY - Camera Y to keep unchanged
 */
export function setCamPosForPixelAlignedSubjectX(k, subjectX, desiredCamX, camY) {
  k.camPos(alignCamXForSubject(k, subjectX, desiredCamX), camY)
}
/**
 * Nudges the hero onto the vertical screen-pixel grid without moving the
 * camera — keeps the map from bobbing vertically during jumps.
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
function alignCamYForSubject(k, subjectY, desiredCamY) {
  const halfH = k.height() / 2
  return subjectY + halfH - Math.round(subjectY - desiredCamY + halfH)
}
