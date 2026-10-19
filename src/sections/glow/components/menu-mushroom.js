import { toCanvas } from '../../../utils/helper.js'
import { GLOW_PAL } from '../utils/glow-palette.js'
import { applyGlowGameplaySharpBake } from '../utils/glow-focus-depth.js'
import {
  CUTE_MUSHROOM_ASPECT,
  TRAMP_FACE_EYE_SCALE,
  drawCuteMushroomPupilOverlay,
  drawCuteMushroomToCanvas
} from '../utils/cute-mushroom.js'
//
// Glow section icon on the menu ring: the trampoline mushroom from
// lesson-glow.0 (same painter, palette and blushy face) standing in for the
// section anti-hero. Two baked variants cover open / closed eyes; pupils are
// drawn live so they can watch the centre hero.
//
const MUSH_W = 84
const BAKE_PAD = 4
const BAKE_BASE_INSET = 2
const BAKE_W = MUSH_W + BAKE_PAD
const BAKE_H = Math.ceil(MUSH_W * CUTE_MUSHROOM_ASPECT) + BAKE_PAD
const SPRITE_OPEN = 'menu-glow-mushroom'
const SPRITE_BLINK = 'menu-glow-mushroom-blink'
const BAKE_GRAIN_SEED = 7331
const BLINK_MIN_INTERVAL = 2.5
const BLINK_MAX_INTERVAL = 6
const BLINK_DURATION = 0.14

/**
 * Creates the menu glow mushroom layer.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.z - Draw layer z
 * @param {function(): {x: number, y: number, scale: number}} cfg.getPose - Icon centre and scale
 * @param {function(): ({x: number, y: number}|null)} cfg.getLookAt - Point the pupils follow (null = straight ahead)
 * @param {function(): boolean} cfg.isVisible - False hides the mushroom (scene leave)
 * @returns {Object} Menu mushroom inst
 */
export function create(cfg) {
  const { k } = cfg
  bakeSprites(k)
  const inst = {
    k,
    getPose: cfg.getPose,
    getLookAt: cfg.getLookAt,
    isVisible: cfg.isVisible,
    blinking: false,
    blinkTimer: randomBlinkGap()
  }
  k.add([
    k.z(cfg.z),
    {
      update() {
        onUpdate(inst)
      },
      draw() {
        onDraw(inst)
      }
    }
  ])
  return inst
}

/**
 * Advances the blink cycle: long random pause with open eyes, then a short
 * closed-eyes hold.
 * @param {Object} inst - Menu mushroom inst
 */
export function onUpdate(inst) {
  inst.blinkTimer -= inst.k.dt()
  if (inst.blinkTimer > 0) return
  inst.blinking = !inst.blinking
  inst.blinkTimer = inst.blinking ? BLINK_DURATION : randomBlinkGap()
}

/**
 * Draws the mushroom centred on the icon pose, then its live pupils.
 * @param {Object} inst - Menu mushroom inst
 */
export function onDraw(inst) {
  if (!inst.isVisible()) return
  const { k } = inst
  const pose = inst.getPose()
  k.drawSprite({
    sprite: inst.blinking ? SPRITE_BLINK : SPRITE_OPEN,
    pos: k.vec2(pose.x, pose.y),
    anchor: 'center',
    scale: k.vec2(pose.scale, pose.scale)
  })
  if (inst.blinking) return
  const look = inst.getLookAt()
  drawCuteMushroomPupilOverlay(k, {
    cx: pose.x,
    baseY: pose.y + (BAKE_H * 0.5 - BAKE_BASE_INSET) * pose.scale,
    width: MUSH_W * pose.scale,
    eyeScale: TRAMP_FACE_EYE_SCALE,
    lookX: look?.x,
    lookY: look?.y
  })
}

//
// Kaplay frees scene-scoped sprites on scene leave and drops them all on an
// engine reboot, so the registry itself decides whether to bake.
//
function bakeSprites(k) {
  if (k.getSprite(SPRITE_OPEN) && k.getSprite(SPRITE_BLINK)) return
  bakeVariant(k, SPRITE_OPEN, true)
  bakeVariant(k, SPRITE_BLINK, false)
}

function bakeVariant(k, name, eyesOpen) {
  const canvas = toCanvas({ width: BAKE_W, height: BAKE_H }, ctx => {
    drawCuteMushroomToCanvas(ctx, {
      cx: BAKE_W / 2,
      baseY: BAKE_H - BAKE_BASE_INSET,
      width: MUSH_W,
      colors: GLOW_PAL.cuteMushroom,
      withFace: true,
      eyesOpen,
      eyeScale: TRAMP_FACE_EYE_SCALE,
      dynamicPupils: eyesOpen,
      simpleShade: true
    })
  })
  applyGlowGameplaySharpBake(canvas, BAKE_GRAIN_SEED + name.length)
  k.loadSprite(name, canvas)
}

function randomBlinkGap() {
  return BLINK_MIN_INTERVAL + Math.random() * (BLINK_MAX_INTERVAL - BLINK_MIN_INTERVAL)
}
