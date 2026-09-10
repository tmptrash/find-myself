import { CFG } from '../../../cfg.js'
import { get, set } from '../../../utils/progress.js'
import * as Hero from '../../../components/hero.js'
import {
  getCrackZone,
  collapseGlowPitForEyeIntro,
  drawGlowPitOutline,
  getGlowPitBonusPosition,
  getGlowPitHeroStandY,
  ensureGlowPitOpenForEyesCollected,
  glowHeroHasCollectedEyes,
  isGlowPitMushroomUnlocked as isPitMushroomUnlockedForPit,
  isHeroOnCrackLid,
  KEY_PIT_COLLAPSED
} from './glow-atmosphere.js'

//
// Persisted once the hero collects the cave eyes and returns to the tree.
//
export const KEY_EYES_COLLECTED = 'glow.eyesCollected'
const EYE_INTRO_CAVE_APPROACH_X = 220
const EYE_INTRO_TREE_RETURN_X = 340
const EYE_INTRO_PICKUP_RADIUS = 34
const EYE_INTRO_EYE_WHITE_R = 5.5
const EYE_INTRO_PUPIL_R = 2.4
const EYE_INTRO_EYE_GAP = 14
const EYE_INTRO_REVEAL_FX_DURATION = 0.55
const EYE_INTRO_REVEAL_FLASH_R = 42
const EYE_INTRO_ATTACH_CLOSED_DURATION = 1
const EYE_INTRO_ATTACH_MOVE_THRESHOLD = 3
const EYE_INTRO_ATTACH_JUMP_VEL_Y = 40
const EYE_INTRO_PIT_FEET_Y = 38
const EYE_INTRO_PIT_FLOOR_BAND = 18
//
// Creates runtime state for the pre-G eyeless intro (only when eyes not saved).
//
export function createGlowEyeIntroState() {
  return {
    phase: 'runRight',
    pickup: null,
    revealFx: 0,
    revealFxDone: false,
    eyesOpeningTimer: 0,
    attachClosedApplied: false
  }
}
//
// True until the cave-eye pickup is saved — blocks world reveals and decor.
//
export function isGlowEyeIntroPending(zones) {
  return zones && !zones.eyesCollected
}
//
// Post-eyeless gameplay (HUD G fill, decor reveals, trampolines, etc.).
//
export function isGlowEyesGameplayUnlocked(zones) {
  return Boolean(zones?.eyesCollected)
}
//
// Pit cave mushroom is visible and bouncy only after the lying eyes are picked up.
//
export function isGlowPitMushroomUnlocked(inst) {
  return isPitMushroomUnlockedForPit(inst?.pit)
}
//
// True while the hero wears newly attached eyes (closed, then open).
//
export function isGlowEyeIntroAttachActive(inst) {
  return Boolean(inst?.eyeIntro?.eyesOpeningTimer > 0)
}
//
// Bare world: flat ground + branch + midges only (no tree/decor/letters).
//
export function isGlowEyeIntroBareWorld(inst) {
  return isGlowEyeIntroPending(inst?.zones) && inst?.eyeIntro?.phase !== 'complete'
}
//
// Foot bursts / landing dust off during the whole eyeless arc (incl. run back).
//
export function shouldGlowSuppressFootDetails(inst) {
  return isGlowEyeIntroPending(inst?.zones) && inst?.eyeIntro?.phase !== 'complete'
}
//
// Blocks tree segments, ground decor, tramp reveals, letter logic, etc.
//
export function shouldGlowBlockWorldReveal(inst) {
  return isGlowEyeIntroBareWorld(inst)
}
//
// Cave mouth cracks + proximity hum during the right-edge approach.
//
export function isGlowEyeIntroCaveActive(inst) {
  if (!isGlowEyeIntroPending(inst?.zones) || !inst?.eyeIntro) return false
  return inst.eyeIntro.phase === 'awaitJump' ||
    inst.eyeIntro.phase === 'caveOpen' ||
    inst.eyeIntro.phase === 'inCave' ||
    inst.eyeIntro.phase === 'collectEyes' ||
    inst.eyeIntro.phase === 'runBack'
}
//
// All midges visible from the first frame while the intro is pending.
//
export function syncGlowEyeIntroMidges(ctrl) {
  if (!ctrl) return
  ctrl.showLeft = true
  ctrl.showRight = true
  ctrl.showPit = true
}
//
// Bakes hero sprites without eyes and tags the inst for reload on pickup.
//
export function initGlowHeroWithoutEyes(heroInst) {
  if (!heroInst) return
  heroInst.noEyes = true
  Hero.loadHeroSprites(heroInst)
  const prefix = heroInst.spritePrefix || heroInst.type
  const spriteName = `${prefix}_0_0`
  heroInst.character?.use(heroInst.k.sprite(spriteName))
  heroInst.currentEyeSprite = spriteName
}
//
// Attaches eyes; if the hero stands still they stay closed for one second,
// otherwise run/jump skips the closed-eyes beat entirely.
//
export function revealGlowHeroEyes(inst, heroInst) {
  if (!heroInst || !inst?.eyeIntro) return
  const char = heroInst.character
  heroInst.noEyes = false
  Hero.loadHeroSprites(heroInst)
  //
  // Closed eyes apply on the first still frame — immediate run/jump skips them.
  //
  heroInst.currentEyeSprite = null
  inst.eyeIntro.attachClosedApplied = false
  inst.eyeIntro.eyesOpeningTimer = EYE_INTRO_ATTACH_CLOSED_DURATION
  inst.eyeIntro.attachHeroX = char?.pos?.x ?? 0
  inst.eyeIntro.attachHeroGrounded = char?.isGrounded?.() ?? true
  inst.eyeIntro.revealFx = EYE_INTRO_REVEAL_FX_DURATION
  inst.eyeIntro.revealFxDone = false
}
/**
 * Per-frame eyeless intro logic.
 * @param {Object} inst - Glow scene inst
 * @param {Object} char - Hero Kaplay body
 * @param {Object} heroInst - Hero component inst
 * @param {number} floorY - Main floor Y
 * @param {number} worldW - World width
 * @param {number} treeX - Main tree trunk X
 * @param {boolean} grounded - Hero grounded this frame
 * @param {boolean} justLanded - Hero landed this frame
 * @param {number} footY - Hero feet Y
 */
export function onUpdateGlowEyeIntro(inst, char, heroInst, floorY, worldW, treeX, grounded, justLanded, footY) {
  if (!inst?.eyeIntro || inst.eyeIntro.phase === 'complete' || !char?.pos) return
  const intro = inst.eyeIntro
  const dt = inst.k.dt()
  //
  // Reveal FX timer after picking up eyes.
  //
  intro.revealFx > 0 && (intro.revealFx = Math.max(0, intro.revealFx - dt))
  //
  // Closed eyes for one second after pickup while the hero stands still.
  //
  if (intro.eyesOpeningTimer > 0) {
    if (didGlowEyeAttachHeroMove(intro, char, heroInst)) {
      finishGlowEyeAttachSequence(inst, heroInst)
      return
    }
    !intro.attachClosedApplied &&
      (Hero.setEyesClosed(heroInst, true, { idleOnly: true }), intro.attachClosedApplied = true)
    intro.eyesOpeningTimer = Math.max(0, intro.eyesOpeningTimer - dt)
    intro.eyesOpeningTimer <= 0 && finishGlowEyeAttachSequence(inst, heroInst)
    return
  }
  const heroX = char.pos.x
  const zone = getCrackZone(worldW, floorY)
  const pit = inst.pit
  intro.revealFx <= 0 && !intro.revealFxDone && intro.phase === 'runBack' && (intro.revealFxDone = true)
  //
  // Run to the cave mouth on the right (after Yan intro hints unlock controls).
  //
  if (intro.phase === 'runRight') {
    !inst.introLock &&
      heroX >= zone.x1 - EYE_INTRO_CAVE_APPROACH_X &&
      enterGlowEyeIntroCaveApproach(inst, zone)
    return
  }
  //
  // First jump onto the crack band: open the cave only on landing (lid stays
  // solid in the air so the hero cannot fall through a gap mid-arc).
  //
  if (intro.phase === 'awaitJump' && pit && !pit.collapsed) {
    tryOpenGlowEyeIntroCave(inst, char, zone, pit, grounded, justLanded, footY)
    return
  }
  //
  // Lying eyes appear only after the hero lands on the pit floor.
  //
  if (intro.phase === 'inCave' && pit?.collapsed) {
    tryRevealGlowCaveFloorEyes(inst, char, pit)
    return
  }
  //
  // Touch both lying eyes to attach them to the hero.
  //
  if (intro.phase === 'collectEyes' && intro.pickup && heroInst) {
    tryCollectGlowCaveEyes(inst, heroInst, char)
    return
  }
  //
  // After eyes: return to the tree to unlock normal exploration.
  //
  if (intro.phase === 'runBack' && heroX <= treeX + EYE_INTRO_TREE_RETURN_X) {
    completeGlowEyeIntro(inst)
  }
}
//
// Draws cave pickup eyes, outline-only interior helpers, hint anchor, reveal FX.
//
export function onDrawGlowEyeIntro(inst, k, heroBodyHex, heroEyeWhiteHex) {
  if (!inst?.eyeIntro) return
  const intro = inst.eyeIntro
  const pit = inst.pit
  pit && pit.collapsed && pit.outlineOnlyMode &&
    !glowHeroHasCollectedEyes(inst.zones, inst.heroInst) &&
    drawGlowPitOutline(k, pit)
  intro.pickup && drawGlowCavePickupEyes(k, intro.pickup, inst.heroInst, heroBodyHex, heroEyeWhiteHex)
  intro.revealFx > 0 && drawGlowEyeRevealFx(k, inst.heroInst, intro.revealFx)
}
//
// Private helpers
//
function enterGlowEyeIntroCaveApproach(inst, zone) {
  const intro = inst.eyeIntro
  intro.phase = 'awaitJump'
  inst.pit && (inst.pit.cracksVisible = true)
}
function tryOpenGlowEyeIntroCave(inst, char, zone, pit, grounded, justLanded, footY) {
  if (!justLanded || !grounded || !isHeroOnCrackLid(pit, char.pos.x, footY)) return
  collapseGlowPitForEyeIntro(pit)
  inst.eyeIntro.phase = 'inCave'
}
function tryRevealGlowCaveFloorEyes(inst, char, pit) {
  if (inst.eyeIntro.pickup) return
  const bottomY = pit.floorY + pit.zone.depth
  const feetY = char.pos.y + EYE_INTRO_PIT_FEET_Y
  const grounded = char.isGrounded?.() ?? false
  const onPitFloor = feetY >= bottomY - EYE_INTRO_PIT_FLOOR_BAND &&
    feetY <= bottomY + 8
  if (!grounded || !onPitFloor) return
  inst.eyeIntro.pickup = spawnGlowCavePickupEyes(inst, pit)
  inst.eyeIntro.phase = 'collectEyes'
}
function spawnGlowCavePickupEyes(inst, pit) {
  const bonusPos = getGlowPitBonusPosition(pit)
  const cx = bonusPos?.x ?? pit.zone.x1 + pit.zone.width * 0.52
  const cy = bonusPos?.y ?? pit.floorY + pit.zone.depth - 28
  return {
    cx,
    cy,
    leftX: cx - EYE_INTRO_EYE_GAP * 0.5,
    rightX: cx + EYE_INTRO_EYE_GAP * 0.5,
    y: cy,
    collected: false
  }
}
function tryCollectGlowCaveEyes(inst, heroInst, char) {
  const pickup = inst.eyeIntro.pickup
  if (!pickup || pickup.collected) return
  const dx = char.pos.x - pickup.cx
  const dy = char.pos.y - pickup.cy
  if (Math.hypot(dx, dy) > EYE_INTRO_PICKUP_RADIUS) return
  pickup.collected = true
  persistGlowEyesCollected(inst)
  revealGlowHeroEyes(inst, heroInst)
  inst.eyeIntro.phase = 'runBack'
  if (inst.pit) {
    inst.pit.outlineOnlyMode = false
  }
}
function persistGlowEyesCollected(inst) {
  if (!inst?.zones || inst.zones.eyesCollected) return
  inst.zones.eyesCollected = true
  set(KEY_EYES_COLLECTED, true)
  set(KEY_PIT_COLLAPSED, true)
}
function didGlowEyeAttachHeroMove(intro, char, heroInst) {
  if (!char?.pos || !intro) return false
  const dx = Math.abs(char.pos.x - (intro.attachHeroX ?? char.pos.x))
  const jumped = intro.attachHeroGrounded &&
    (!(char.isGrounded?.() ?? true) || (char.vel?.y ?? 0) < -EYE_INTRO_ATTACH_JUMP_VEL_Y)
  const running = heroInst?.jumpPhase && heroInst.jumpPhase !== 'none'
  const inputMoving = heroInst?._effectivelyMoving === true || heroInst?.isRunning
  return dx > EYE_INTRO_ATTACH_MOVE_THRESHOLD || jumped || running || inputMoving
}
function finishGlowEyeAttachSequence(inst, heroInst) {
  if (!heroInst || !inst?.eyeIntro) return
  inst.eyeIntro.eyesOpeningTimer = 0
  inst.eyeIntro.attachClosedApplied = false
  Hero.setEyesClosed(heroInst, false)
  heroInst.currentEyeSprite = null
}
function completeGlowEyeIntro(inst) {
  inst.eyeIntro.phase = 'complete'
  persistGlowEyesCollected(inst)
  inst.eyeIntro.pickup = null
  inst.pit && ensureGlowPitOpenForEyesCollected(inst.pit)
}
/**
 * Restores cave eyes and intro phase after a reload when the pit stayed open.
 * @param {Object} inst - Glow scene inst
 */
export function restoreGlowEyeIntroFromPersistedState(inst) {
  if (!inst?.eyeIntro || !inst.pit?.collapsed) return
  if (glowHeroHasCollectedEyes(inst.zones, inst.heroInst)) {
    inst.pit.outlineOnlyMode = false
    ensureGlowPitOpenForEyesCollected(inst.pit)
    return
  }
  const pit = inst.pit
  pit.outlineOnlyMode = true
  pit.skipPitBonus = true
  pit.cracksVisible = true
  if (inst.eyeIntro.phase !== 'runBack' && inst.eyeIntro.phase !== 'complete') {
    inst.eyeIntro.phase = 'collectEyes'
  }
  !inst.eyeIntro.pickup && (inst.eyeIntro.pickup = spawnGlowCavePickupEyes(inst, pit))
}
export function snapGlowHeroToPitFloor(inst, heroInst) {
  const pit = inst?.pit
  const char = heroInst?.character
  if (!pit?.collapsed || !char?.pos) return
  char.pos.y = getGlowPitHeroStandY(pit)
  char.vel && (char.vel.x = 0, char.vel.y = 0)
}
//
// Finishes the eyeless arc when the hero launches from the cave mushroom
// onto the big-tree branch (same unlock as returning to the tree on foot).
//
export function unlockGlowEyesGameplayFromBranchLaunch(inst) {
  if (!inst?.eyeIntro || inst.eyeIntro.phase === 'complete') return
  completeGlowEyeIntro(inst)
}
function drawGlowCavePickupEyes(k, pickup, heroInst, bodyHex, eyeWhiteHex) {
  if (pickup.collected) return
  const heroPos = heroInst?.character?.pos
  const targetX = heroPos?.x ?? pickup.cx
  const targetY = (heroPos?.y ?? pickup.y) - 20
  drawGlowTrackingEye(k, pickup.leftX, pickup.y, targetX, targetY, bodyHex, eyeWhiteHex)
  drawGlowTrackingEye(k, pickup.rightX, pickup.y, targetX, targetY, bodyHex, eyeWhiteHex)
}
function drawGlowTrackingEye(k, ex, ey, tx, ty, bodyHex, eyeWhiteHex) {
  const dx = tx - ex
  const dy = ty - ey
  const dist = Math.hypot(dx, dy) || 1
  const travel = EYE_INTRO_EYE_WHITE_R - EYE_INTRO_PUPIL_R - 0.4
  const px = ex + (dx / dist) * travel
  const py = ey + (dy / dist) * travel
  const outline = CFG.visual.colors.outline
  k.drawCircle({
    pos: k.vec2(ex, ey),
    radius: EYE_INTRO_EYE_WHITE_R + 1,
    color: k.rgb(...parseHexRgb(outline))
  })
  k.drawCircle({
    pos: k.vec2(ex, ey),
    radius: EYE_INTRO_EYE_WHITE_R,
    color: k.rgb(...parseHexRgb(eyeWhiteHex))
  })
  k.drawCircle({
    pos: k.vec2(px, py),
    radius: EYE_INTRO_PUPIL_R,
    color: k.rgb(...parseHexRgb(outline))
  })
}
function drawGlowEyeRevealFx(k, heroInst, revealFx) {
  const char = heroInst?.character
  if (!char?.pos) return
  const t = 1 - revealFx / EYE_INTRO_REVEAL_FX_DURATION
  const r = EYE_INTRO_REVEAL_FLASH_R * (0.4 + t * 0.9)
  const op = Math.max(0, 1 - t) * 0.55
  k.drawCircle({
    pos: k.vec2(char.pos.x, char.pos.y - 28),
    radius: r,
    color: k.rgb(255, 255, 255),
    opacity: op
  })
}
function parseHexRgb(hex) {
  const h = String(hex).replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16)
  ]
}
