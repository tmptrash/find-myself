import { CFG } from '../../../cfg.js'
import { get } from '../../../utils/progress.js'
import * as Hero from '../../../components/hero.js'
import { GLOW_PAL } from './glow-palette.js'

//
// Letter-by-letter body fill toward the post-L stillness white hero.
//
export const GLOW_HERO_FILL_G = 0.25
export const GLOW_HERO_FILL_L = 0.5
export const GLOW_MEDITATION_COUNTDOWN = 10
export const KEY_COLLECTED_G = 'glow.collectedG'
export const KEY_COLLECTED_L = 'glow.collectedL'
export const KEY_COLLECTED_O = 'glow.collectedO'
export const KEY_COLLECTED_W = 'glow.collectedW'
export const KEY_REVEALED_L_LIT = 'glow.revealedLSun'
export const KEY_EYES_COLLECTED = 'glow.eyesCollected'
const COLOR_CROSSFADE_EPS = 0.02
const FILL_BURST_DURATION = 0.65
const FILL_BURST_RADIUS = 54
const FILL_BURST_Y_OFFSET = 26
const FILL_STEP_BURST_THRESHOLD = 0.02
//
// True while the menu / glow hero should use hollow→filled progression.
//
export function usesGlowHeroFillProgress(progress, inGlowPlay) {
  if (progress?.glow?.completed && !inGlowPlay) return false
  if (progress?.touch?.completed && !inGlowPlay) return false
  return true
}
//
// Linear countdown progress while the post-L stillness timer runs.
//
export function meditationCountdownLinear(remaining) {
  if (remaining == null) return 0
  return 1 - Math.max(0, remaining) / GLOW_MEDITATION_COUNTDOWN
}
function smoothstep01(t) {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}
/**
 * 0→1 hollow-to-white fill based on collected GLOW letters and the L timer.
 * @param {Object} [opts] - Zone flags; defaults read from localStorage
 * @returns {number}
 */
export function getGlowHeroFillProgress(opts = {}) {
  const gCollected = opts.gCollected ?? get(KEY_COLLECTED_G, false)
  const lCollected = opts.lCollected ?? get(KEY_COLLECTED_L, false)
  const lZoneLit = opts.lZoneLit ?? get(KEY_REVEALED_L_LIT, false)
  const oCollected = opts.oCollected ?? get(KEY_COLLECTED_O, false)
  const wCollected = opts.wCollected ?? get(KEY_COLLECTED_W, false)
  const countdownRemaining = opts.meditationCountdown ?? null
  if (lZoneLit || oCollected || wCollected) return 1
  if (lCollected && countdownRemaining != null) {
    const base = gCollected ? GLOW_HERO_FILL_L : GLOW_HERO_FILL_L
    const t = smoothstep01(meditationCountdownLinear(countdownRemaining))
    return base + (1 - base) * t
  }
  if (lCollected) return GLOW_HERO_FILL_L
  if (gCollected) return GLOW_HERO_FILL_G
  return 0
}
export function triggerGlowHeroFillBurst(inst) {
  if (!inst) return
  inst.heroFillBurst = FILL_BURST_DURATION
}
export function updateGlowHeroFillBurst(inst, dt) {
  if (!inst?.heroFillBurst || inst.heroFillBurst <= 0) return
  inst.heroFillBurst = Math.max(0, inst.heroFillBurst - dt)
}
export function drawGlowHeroFillBurst(k, heroInst, inst) {
  if (!inst?.heroFillBurst || inst.heroFillBurst <= 0) return
  const char = heroInst?.character
  if (!char?.pos) return
  const t = 1 - inst.heroFillBurst / FILL_BURST_DURATION
  const r = FILL_BURST_RADIUS * (0.35 + t * 1.15)
  const op = Math.max(0, 1 - t) * 0.48
  k.drawCircle({
    pos: k.vec2(char.pos.x, char.pos.y - FILL_BURST_Y_OFFSET),
    radius: r,
    color: k.rgb(255, 255, 255),
    opacity: op
  })
}
function glowHeroSpriteReady(k, spriteKey) {
  if (!spriteKey) return false
  try {
    return Boolean(k.getSprite(spriteKey))
  } catch (_) {
    return false
  }
}
function buildFilledHeroSpritePrefix(hero, filledBodyColor, filledOutlineColor) {
  return Hero.buildHeroSpritePrefix({
    type: hero.type,
    bodyColor: filledBodyColor,
    outlineColor: filledOutlineColor,
    addMouth: hero.addMouth,
    addArms: hero.addArms,
    addWatch: hero.addWatch,
    drawBakeOutline: true,
    drawBakeBody: true,
    eyeWhiteColor: CFG.visual.colors.hero.eyeWhite,
    pupilColor: CFG.visual.colors.hero.eyePupil,
    noEyes: hero.noEyes,
    transparentEyeInterior: false,
    outlineRimPx: hero.outlineRimPx
  })
}
function mapOutlineSpriteToFilled(outlineKey, outlinePrefix, filledPrefix) {
  if (outlineKey && outlinePrefix && filledPrefix && outlineKey.startsWith(outlinePrefix)) {
    return filledPrefix + outlineKey.slice(outlinePrefix.length)
  }
  return null
}
function preloadGlowHeroFullSprites(inst, cfg) {
  const hero = inst.heroInst
  if (!hero) return
  const filledPrefix = buildFilledHeroSpritePrefix(hero, cfg.filledBodyColor, cfg.filledOutlineColor)
  const idleKey = `${filledPrefix}_0_0`
  const bakedNoEyes = Boolean(hero.noEyes)
  if (inst._glowHeroFullSpritesPreloaded &&
    inst._glowHeroFullSpritesNoEyes === bakedNoEyes &&
    inst.k.getSprite(idleKey)) {
    return
  }
  Hero.loadHeroSprites({
    k: inst.k,
    type: Hero.HEROES.HERO,
    bodyColor: cfg.filledBodyColor,
    outlineColor: cfg.filledOutlineColor,
    eyeWhiteColor: CFG.visual.colors.hero.eyeWhite,
    pupilColor: CFG.visual.colors.hero.eyePupil,
    drawBakeOutline: true,
    drawBakeBody: true,
    noEyes: bakedNoEyes,
    addMouth: hero.addMouth,
    addArms: hero.addArms,
    addWatch: hero.addWatch,
    outlineRimPx: hero.outlineRimPx,
    postBakeCanvas: cfg.postBakeCanvas || null
  })
  if (!inst.k.getSprite(idleKey)) return
  inst._glowHeroFullSpritesPreloaded = true
  inst._glowHeroFullSpritesNoEyes = bakedNoEyes
}
//
// Maps the live hollow frame key to the matching colour-world filled sprite.
//
function resolveGlowHeroFilledSpriteKey(inst, cfg, frameKey) {
  const hero = inst.heroInst
  if (!hero) return null
  preloadGlowHeroFullSprites(inst, cfg)
  const filledPrefix = buildFilledHeroSpritePrefix(hero, cfg.filledBodyColor, cfg.filledOutlineColor)
  if (inst.heroBodyFillApplied || !hero.outlineOnly) {
    return frameKey?.startsWith(hero.spritePrefix) ? frameKey : `${hero.spritePrefix}_0_0`
  }
  const filledKey = mapOutlineSpriteToFilled(frameKey, hero.spritePrefix, filledPrefix)
  return glowHeroSpriteReady(inst.k, filledKey) ? filledKey : `${filledPrefix}_0_0`
}
export function clearGlowHeroFillPreview(inst) {
  inst.heroFillPreview?.exists?.() && inst.heroFillPreview.destroy()
  inst.heroFillPreview = null
  const char = inst.heroInst?.character
  char?.exists?.() && (char.opacity = 1)
}
function ensureHeroFillPreview(inst, cfg) {
  const hero = inst.heroInst
  const char = hero?.character
  if (!char?.exists?.() || inst.heroBodyFillApplied) return
  const idleKey = resolveGlowHeroFilledSpriteKey(inst, cfg, `${hero.spritePrefix}_0_0`)
  if (!idleKey) return
  const filledPrefix = buildFilledHeroSpritePrefix(hero, cfg.filledBodyColor, cfg.filledOutlineColor)
  if (inst.heroFillFilledPrefix !== filledPrefix && inst.heroFillPreview?.exists?.()) {
    inst.heroFillPreview.destroy()
    inst.heroFillPreview = null
  }
  inst.heroFillFilledPrefix = filledPrefix
  if (inst.heroFillPreview?.exists?.()) return
  inst.heroFillPreview = inst.k.add([
    inst.k.sprite(idleKey),
    inst.k.pos(char.pos.x, char.pos.y),
    inst.k.anchor('center'),
    inst.k.scale(char.scale),
    inst.k.z(char.z + 0.01),
    inst.k.opacity(0),
    'heroFillPreview'
  ])
  inst.heroFillPreview.color = char.color
}
function syncHeroFillPreviewSprite(inst, cfg) {
  const hero = inst.heroInst
  const preview = inst.heroFillPreview
  const char = hero?.character
  if (!preview?.exists?.() || !char?.exists?.()) return false
  const outlineKey = Hero.getActiveSpriteKey(hero)
  const filledKey = resolveGlowHeroFilledSpriteKey(inst, cfg, outlineKey)
  const matched = glowHeroSpriteReady(inst.k, filledKey)
  matched && preview.use(inst.k.sprite(filledKey))
  preview.pos.x = char.pos.x
  preview.pos.y = char.pos.y
  preview.scale = char.scale
  preview.flipX = char.flipX
  preview.angle = char.angle ?? 0
  preview.z = char.z + 0.01
  preview.color = char.color
  return matched
}
function applyGlowHeroBodyFill(inst, cfg) {
  clearGlowHeroFillPreview(inst)
  if (inst.heroBodyFillApplied) {
    const filledChar = inst.heroInst?.character
    filledChar?.exists?.() && (filledChar.opacity = 1)
    return
  }
  const hero = inst.heroInst
  const char = hero?.character
  if (!char?.exists?.()) return
  if (!hero.outlineOnly) {
    inst.heroBodyFillApplied = true
    char.opacity = 1
    return
  }
  const k = inst.k
  const outlineKey = Hero.getActiveSpriteKey(hero)
  const spriteKey = resolveGlowHeroFilledSpriteKey(inst, cfg, outlineKey)
  if (!glowHeroSpriteReady(k, spriteKey)) return
  const filledPrefix = buildFilledHeroSpritePrefix(hero, cfg.filledBodyColor, cfg.filledOutlineColor)
  hero.outlineOnly = false
  char.opacity = 1
  hero.bodyColor = String(cfg.filledBodyColor).replace('#', '')
  hero.outlineColor = String(cfg.filledOutlineColor).replace('#', '')
  hero.eyeWhiteColor = CFG.visual.colors.hero.eyeWhite
  hero.pupilColor = CFG.visual.colors.hero.eyePupil
  hero.transparentEyeInterior = false
  hero.spritePrefix = filledPrefix
  inst.heroBodyFillApplied = true
  char.use(k.sprite(spriteKey))
  hero.currentEyeSprite = spriteKey
  char.color = k.rgb(255, 255, 255)
}
/**
 * Crossfades the hollow hero into a white filled body while letters unlock.
 * @param {Object} inst - Scene inst with heroInst and fill state
 * @param {Object} cfg - Bake colours for the filled sprite set
 * @param {Object} [fillOpts] - Overrides for getGlowHeroFillProgress
 */
export function syncGlowHeroFillVisual(inst, cfg, fillOpts = {}) {
  const char = inst.heroInst?.character
  if (!char?.exists?.()) return
  const fade = getGlowHeroFillProgress(fillOpts)
  const prev = inst._lastHeroFillAmount ?? 0
  if (fade > prev + FILL_STEP_BURST_THRESHOLD) {
    triggerGlowHeroFillBurst(inst)
  }
  inst._lastHeroFillAmount = fade
  if (inst.heroBodyFillApplied) {
    clearGlowHeroFillPreview(inst)
    char.opacity = 1
    return
  }
  if (fade <= 0.001) {
    clearGlowHeroFillPreview(inst)
    char.opacity = 1
    return
  }
  if (fade >= 0.98 - COLOR_CROSSFADE_EPS) {
    cfg.onFullFill ? cfg.onFullFill(inst) : applyGlowHeroBodyFill(inst, cfg)
    return
  }
  ensureHeroFillPreview(inst, cfg)
  const poseMatched = syncHeroFillPreviewSprite(inst, cfg)
  const showFilledPreview = poseMatched && fade > 0.001
  char.opacity = showFilledPreview ? 0 : 1
  const preview = inst.heroFillPreview
  preview?.exists?.() && (preview.opacity = showFilledPreview ? fade : 0)
}
export const GLOW_MENU_HERO_FILL_CFG = {
  filledBodyColor: String(CFG.visual.colors.hero.eyeWhite).replace('#', ''),
  filledOutlineColor: GLOW_PAL.heroOutline
}
export const GLOW_LEVEL_HERO_FILL_CFG = {
  filledBodyColor: String(CFG.visual.colors.hero.eyeWhite).replace('#', ''),
  filledOutlineColor: GLOW_PAL.heroOutline
}
