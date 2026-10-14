import { CFG } from '../../../cfg.js'
import { get, set } from '../../../utils/progress.js'
import { applyGlowExperienceDelta, readGlowExperience } from './glow-experience.js'
import * as Hero from '../../../components/hero.js'
import { GLOW_PAL, glowRgb } from './glow-palette.js'
import { drawGlowLakeGlassesSprite, glowLakeGlassesSpriteSize } from './glow-lake-raft.js'

//
// Persisted once the hero picks the glasses up from the lake raft.
//
export const KEY_GLASSES_COLLECTED = 'glow.glassesCollected'
//
// Experience (lifeScore HUD) cost and how long the hero wears the glasses.
//
const GLASSES_EXPERIENCE_COST = 2
const GLASSES_WEAR_DURATION = 2
const GLASSES_WORLD_FX_Z = CFG.visual.zIndex.player + 0.5
const GLASSES_HUD_Z = CFG.visual.zIndex.ui
//
// Slot sits on the teacher eye's row; this Y is only used before the HUD eye exists.
//
const GLASSES_SLOT_FALLBACK_Y = 56
//
// Pickup / return: glasses fly along an arc between the world and the slot.
//
const GLASSES_FLY_DURATION = 0.75
const GLASSES_FLY_ARC_LIFT = 70
const GLASSES_FLY_PEAK_SCALE = 1.45
const GLASSES_FLASH_DURATION = 0.45
const GLASSES_FLASH_R = 46
const GLASSES_FLASH_ALPHA = 0.55
const GLASSES_SPARK_COUNT = 10
const GLASSES_SPARK_SPEED = 130
const GLASSES_SPARK_LIFE = 0.55
const GLASSES_SPARK_R = 2.2
const GLASSES_SLOT_POP_DURATION = 0.3
const GLASSES_SLOT_POP_SCALE = 0.25
//
// Glasses on the hero's face, in hero sprite px (scaled by the character).
//
const WORN_LENS_R = 6
const WORN_LENS_HALF_GAP = 7
const WORN_TEMPLE_REACH = 16
const WORN_SIDE_TEMPLE_BACK = 14
const WORN_FRAME_W = 1.4
const WORN_LENS_ALPHA = 0.16
//
// The bridge arches over the eye line so the cyclops pupil between the
// lenses stays visible; the glint sits in the upper-outer lens corner.
//
const WORN_BRIDGE_LIFT = 0.8
const WORN_GLINT_NEAR = 0.15
const WORN_GLINT_FAR = 0.6
const WORN_GLINT_ALPHA = 0.6

/**
 * Creates the glasses state machine: lying on the lake raft, flying into the
 * top-left HUD slot, and worn by the hero for a few seconds on slot click.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay inst
 * @param {function(): Object|null} cfg.getLevelInst - Live glow level inst
 * @param {number} cfg.leftMargin - Playfield left edge in screen px
 * @param {function(): (number|null)} cfg.getAnchorY - Teacher eye screen Y
 * @param {function(): void} [cfg.onPickupSound] - Plays the pickup sound
 * @param {function(): ({ x: number, y: number }|null)} [cfg.getPortalLookAt] - Portal look target
 * @param {function(number): void} [cfg.onExperienceChanged] - HUD sync after spend
 * @returns {Object} Glasses slot inst
 */
export function create(cfg) {
  const { k } = cfg
  const inst = {
    k,
    getLevelInst: cfg.getLevelInst,
    getPortalLookAt: cfg.getPortalLookAt ?? null,
    onExperienceChanged: cfg.onExperienceChanged ?? null,
    leftMargin: cfg.leftMargin,
    getAnchorY: cfg.getAnchorY,
    onPickupSound: cfg.onPickupSound ?? null,
    collected: Boolean(get(KEY_GLASSES_COLLECTED, false)),
    wearing: false,
    wearTimer: 0,
    fly: null,
    flash: null,
    sparks: [],
    slotPop: 0
  }
  k.add([
    k.z(GLASSES_WORLD_FX_Z),
    {
      update() {
        onUpdate(inst)
      },
      draw() {
        onDrawWorld(inst)
      }
    }
  ])
  k.add([
    k.fixed(),
    k.z(GLASSES_HUD_Z),
    {
      draw() {
        onDrawHud(inst)
      }
    }
  ])
  k.onMousePress('left', () => onSlotPress(inst))
  return inst
}

/**
 * True while the glasses still lie on the lake raft.
 * @param {Object|null} inst - Glasses slot inst
 * @returns {boolean}
 */
export function isGlassesOnLog(inst) {
  return Boolean(inst) && !inst.collected
}

/**
 * Hero touched the glasses on the raft: persist, flash and fly them into the slot.
 * @param {Object} inst - Glasses slot inst
 * @param {{ x: number, y: number }} worldCenter - Glasses centre on the raft
 */
export function collectGlasses(inst, worldCenter) {
  if (!inst || inst.collected) return
  inst.collected = true
  set(KEY_GLASSES_COLLECTED, true)
  inst.flash = { x: worldCenter.x, y: worldCenter.y, t: 0 }
  spawnGlassesSparks(inst, worldCenter)
  startGlassesFly(inst, inst.k.toScreen(inst.k.vec2(worldCenter.x, worldCenter.y)))
  inst.onPickupSound?.()
}

/**
 * True while the glasses sit on the hero's face.
 * @param {Object|null} inst - Glasses slot inst
 * @returns {boolean}
 */
export function isWearing(inst) {
  return Boolean(inst?.wearing)
}

/**
 * True when the slot shows the glasses (hover tooltip + click target).
 * @param {Object|null} inst - Glasses slot inst
 * @returns {boolean}
 */
export function isSlotFilled(inst) {
  return Boolean(inst?.collected) && !inst.wearing && !inst.fly
}

/**
 * Slot centre and size in screen px.
 * @param {Object|null} inst - Glasses slot inst
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
export function slotRect(inst) {
  const { w, h } = glowLakeGlassesSpriteSize()
  if (!inst) return { x: -1000, y: -1000, w, h }
  return {
    x: inst.leftMargin + w * 0.5,
    y: inst.getAnchorY() ?? GLASSES_SLOT_FALLBACK_Y,
    w,
    h
  }
}

//
// Ages the pickup FX, the fly tween and the wear timer.
//
function onUpdate(inst) {
  const dt = inst.k.dt()
  inst.flash && (inst.flash.t += dt)
  inst.flash && inst.flash.t >= GLASSES_FLASH_DURATION && (inst.flash = null)
  updateGlassesSparks(inst, dt)
  updateGlassesFly(inst, dt)
  inst.slotPop = Math.max(0, inst.slotPop - dt)
  if (!inst.wearing) return
  syncGlassesPortalLook(inst)
  inst.wearTimer -= dt
  if (inst.wearTimer > 0 && glowHeroCharacter(inst)) return
  takeGlassesOff(inst)
}

function updateGlassesSparks(inst, dt) {
  if (!inst.sparks.length) return
  inst.sparks.forEach(spark => {
    spark.t += dt
    spark.x += spark.vx * dt
    spark.y += spark.vy * dt
  })
  inst.sparks = inst.sparks.filter(spark => spark.t < GLASSES_SPARK_LIFE)
}

function updateGlassesFly(inst, dt) {
  if (!inst.fly) return
  inst.fly.t += dt
  if (inst.fly.t < GLASSES_FLY_DURATION) return
  inst.fly = null
  inst.slotPop = GLASSES_SLOT_POP_DURATION
}

//
// Slot click: put the glasses on only with enough experience.
//
function onSlotPress(inst) {
  if (!isSlotFilled(inst)) return
  const mouse = inst.k.mousePos()
  const rect = slotRect(inst)
  if (Math.abs(mouse.x - rect.x) > rect.w * 0.5 || Math.abs(mouse.y - rect.y) > rect.h * 0.5) return
  if (readGlowExperience() < GLASSES_EXPERIENCE_COST) return
  const char = glowHeroCharacter(inst)
  if (!char) return
  inst.wearing = true
  inst.wearTimer = GLASSES_WEAR_DURATION
  const score = applyGlowExperienceDelta(-GLASSES_EXPERIENCE_COST)
  inst.onExperienceChanged?.(score)
  inst.flash = { x: char.pos.x, y: char.pos.y + wornEyeLine(inst, char).y, t: 0 }
  syncGlassesPortalLook(inst)
}

//
// Wear time is over: glasses leave the face and fly back into the slot.
//
function takeGlassesOff(inst) {
  inst.wearing = false
  inst.wearTimer = 0
  syncGlassesPortalLook(inst)
  const char = glowHeroCharacter(inst)
  if (!char) {
    inst.slotPop = GLASSES_SLOT_POP_DURATION
    return
  }
  const eye = wornEyeLine(inst, char)
  startGlassesFly(inst, inst.k.toScreen(inst.k.vec2(char.pos.x + eye.x, char.pos.y + eye.y)))
}

function startGlassesFly(inst, fromScreen) {
  inst.fly = { fromX: fromScreen.x, fromY: fromScreen.y, t: 0 }
}

function spawnGlassesSparks(inst, center) {
  inst.sparks = []
  for (let i = 0; i < GLASSES_SPARK_COUNT; i++) {
    const a = (i / GLASSES_SPARK_COUNT) * Math.PI * 2
    inst.sparks.push({
      x: center.x,
      y: center.y,
      vx: Math.cos(a) * GLASSES_SPARK_SPEED,
      vy: Math.sin(a) * GLASSES_SPARK_SPEED,
      t: 0
    })
  }
}

//
// World pass: pickup flash + sparks, then the glasses on the hero's face.
//
function onDrawWorld(inst) {
  const k = inst.k
  const glint = glowRgb(GLOW_PAL.lakeGlasses.glint)
  const glintColor = k.rgb(glint.r, glint.g, glint.b)
  if (inst.flash) {
    const t = inst.flash.t / GLASSES_FLASH_DURATION
    k.drawCircle({
      pos: k.vec2(inst.flash.x, inst.flash.y),
      radius: GLASSES_FLASH_R * (0.35 + t * 0.9),
      color: glintColor,
      opacity: Math.max(0, 1 - t) * GLASSES_FLASH_ALPHA
    })
  }
  inst.sparks.forEach(spark => {
    k.drawCircle({
      pos: k.vec2(spark.x, spark.y),
      radius: GLASSES_SPARK_R,
      color: glintColor,
      opacity: Math.max(0, 1 - spark.t / GLASSES_SPARK_LIFE)
    })
  })
  inst.wearing && drawGlassesOnHero(inst)
}

//
// HUD pass: the slot glasses (with a small pop on arrival) and the fly tween.
//
function onDrawHud(inst) {
  const rect = slotRect(inst)
  if (isSlotFilled(inst)) {
    const pop = inst.slotPop / GLASSES_SLOT_POP_DURATION
    drawGlowLakeGlassesSprite(inst.k, rect.x, rect.y, 1 + Math.sin(pop * Math.PI) * GLASSES_SLOT_POP_SCALE)
  }
  if (!inst.fly) return
  const u = Math.min(1, inst.fly.t / GLASSES_FLY_DURATION)
  const ease = 1 - Math.pow(1 - u, 3)
  const x = inst.fly.fromX + (rect.x - inst.fly.fromX) * ease
  const y = inst.fly.fromY + (rect.y - inst.fly.fromY) * ease - Math.sin(u * Math.PI) * GLASSES_FLY_ARC_LIFT
  drawGlowLakeGlassesSprite(inst.k, x, y, 1 + Math.sin(u * Math.PI) * (GLASSES_FLY_PEAK_SCALE - 1))
}

//
// Wire glasses on the face: two lenses from the front, one lens in profile
// (run / jump), always following the head pose of the current hero frame.
//
function drawGlassesOnHero(inst) {
  const k = inst.k
  const heroInst = inst.getLevelInst()?.heroInst
  const char = glowHeroCharacter(inst)
  if (!char || !heroInst) return
  const s = Math.abs(char.scale?.x ?? 1)
  const eye = wornEyeLine(inst, char)
  const cx = char.pos.x + eye.x
  const cy = char.pos.y + eye.y
  const pal = GLOW_PAL.lakeGlasses
  const ink = glowRgb(CFG.visual.colors.outline)
  const lens = glowRgb(pal.lens)
  const glint = glowRgb(pal.glint)
  const tones = {
    ink: k.rgb(ink.r, ink.g, ink.b),
    lens: k.rgb(lens.r, lens.g, lens.b),
    glint: k.rgb(glint.r, glint.g, glint.b)
  }
  const r = WORN_LENS_R * s
  if (eye.sideView) {
    const dir = heroInst.direction === -1 ? -1 : 1
    drawWornLine(k, tones, cx - dir * r, cy, cx - dir * WORN_SIDE_TEMPLE_BACK * s, cy, s)
    drawWornLens(k, tones, cx, cy, r, s)
    return
  }
  const gap = WORN_LENS_HALF_GAP * s
  drawWornLine(k, tones, cx - gap - r, cy, cx - WORN_TEMPLE_REACH * s, cy, s)
  drawWornLine(k, tones, cx + gap + r, cy, cx + WORN_TEMPLE_REACH * s, cy, s)
  const bridgeY = cy - r * WORN_BRIDGE_LIFT
  drawWornLine(k, tones, cx - gap + r * 0.6, bridgeY, cx + gap - r * 0.6, bridgeY, s)
  drawWornLens(k, tones, cx - gap, cy, r, s)
  drawWornLens(k, tones, cx + gap, cy, r, s)
}

function drawWornLens(k, tones, x, y, r, s) {
  k.drawCircle({ pos: k.vec2(x, y), radius: r, color: tones.lens, opacity: WORN_LENS_ALPHA })
  k.drawLine({
    p1: k.vec2(x - r * WORN_GLINT_FAR, y - r * WORN_GLINT_NEAR),
    p2: k.vec2(x - r * WORN_GLINT_NEAR, y - r * WORN_GLINT_FAR),
    width: WORN_FRAME_W * s,
    color: tones.glint,
    opacity: WORN_GLINT_ALPHA
  })
  k.drawCircle({
    pos: k.vec2(x, y),
    radius: r,
    fill: false,
    outline: { width: WORN_FRAME_W * s, color: tones.ink }
  })
}

function drawWornLine(k, tones, x1, y1, x2, y2, s) {
  k.drawLine({
    p1: k.vec2(x1, y1),
    p2: k.vec2(x2, y2),
    width: WORN_FRAME_W * s,
    color: tones.ink
  })
}

//
// Eye line offset in world px for the hero's current animation frame.
//
function wornEyeLine(inst, char) {
  const heroInst = inst.getLevelInst()?.heroInst
  const s = Math.abs(char.scale?.x ?? 1)
  const eye = heroInst ? Hero.getEyeLineOffset(heroInst) : { x: 0, y: 0, sideView: false }
  return { x: eye.x * s, y: eye.y * s, sideView: eye.sideView }
}

//
// While the glasses are on, the hero tracks the hologram portal with his eyes.
//
function syncGlassesPortalLook(inst) {
  const hero = inst.getLevelInst()?.heroInst
  if (!hero) return
  const target = inst.wearing && inst.getPortalLookAt ? inst.getPortalLookAt() : null
  Hero.setLookAtPos(hero, target)
}

//
// Live, visible playable hero (respawns swap the character object).
//
function glowHeroCharacter(inst) {
  const char = inst.getLevelInst()?.heroInst?.character
  if (!char?.pos || !char.exists?.() || char.hidden) return null
  return char
}
