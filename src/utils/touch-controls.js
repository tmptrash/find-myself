import { CFG } from '../cfg.js'
import { isTouchDevice, setTouchPoint, removeTouchPoint } from './touch-input.js'
import { applyForestFilmGrainToCanvas } from '../sections/forest/utils/forest-parallax-grain.js'

//
// Virtual movement state — read by hero each frame
//
const virtualLeft = { active: false }
const virtualRight = { active: false }
let jumpHandler = null
let jumpPulse = false
//
// Shared scene state (one set of listeners for the whole game)
//
let activeInst = null
//
// Held movement fingers: touch id -> 'left' | 'right'. Jump is a one-shot pulse, not stored
//
const movementSlots = new Map()
//
// Kaplay event hooks; cancelled and re-registered on every scene mount
//
let touchStartHook = null
let touchEndHook = null
let touchMoveHook = null
let mouseDownHook = null
let mouseUpHook = null
//
// On-screen control layout (50% larger than base, a clear gap between left/right)
//
const ARROW_SIZE = 108
const ARROW_CENTER_GAP = 190
const ARROW_MARGIN_X = 36
const JUMP_ARROW_MARGIN_X = 36
const CIRCLE_RADIUS = 62
//
// Levels fill the whole screen: the buttons sit this far above its bottom
// edge (and ARROW_MARGIN_X / JUMP_ARROW_MARGIN_X in from its sides).
//
const CONTROL_BOTTOM_MARGIN = 36
//
// The full layout needs a screen this wide (both arrows, the jump button and
// the gaps between them). On a narrower one (a phone held upright) the whole
// layout — sizes, margins, gaps and hit areas — shrinks by width /
// CONTROLS_FULL_W, still along the bottom edge.
//
const CONTROLS_FULL_W = 570
//
// Held upright (taller than wide) the run arrows stand side by side at the
// left, ARROW_PAIR_GAP_UPRIGHT apart, the jump button still at the right;
// that layout needs CONTROLS_FULL_W_UPRIGHT. The arrows' hit areas reach only
// halfway to each other there.
//
const ARROW_PAIR_GAP_UPRIGHT = 24
const ARROW_CENTER_GAP_UPRIGHT = CIRCLE_RADIUS * 2 + ARROW_PAIR_GAP_UPRIGHT
const CONTROLS_FULL_W_UPRIGHT = 500
//
// Touch hit area is much larger than the visible circle (especially horizontally)
// so fingers can land near a button without missing it. Vertical padding stays
// modest to avoid stealing taps from the play area above/below.
//
const HIT_HALF_WIDTH = 112
const HIT_HALF_HEIGHT = 90
//
// Buttons in the levels' own look (cfg colors.touchControls), baked once per
// live k: a see-through green-black disc with a dark rim and a faint light
// glint inside it, a cream arrow (ARROW_BAKE_SCALE of the hit arrow's size)
// in two tones — a shaded bevel ARROW_BEVEL px deep along its lower edges —
// ringed by the green-black contour, film grain over all. The whole button is drawn
// at BUTTON_OPACITY so the level shows through.
//
const BUTTON_OPACITY = 0.55
const DISC_ALPHA = 0.6
const RIM_W = 3
const GLINT_W = 1.5
const GLINT_INSET = 4.5
const GLINT_ALPHA = 0.35
const ARROW_CONTOUR_W = 5
const ARROW_BAKE_SCALE = 0.72
const ARROW_BEVEL = 3
const BAKE_PAD = 2
const BUTTON_TYPES = ['left', 'right', 'jump']
const BUTTON_SPRITE_PREFIX = 'touch-control'
const BUTTON_GRAIN_SEED = 9100
const bakedForK = new WeakSet()
//
// Under the level's entry fade (ui + 100, transition.js), so the buttons
// fade in with the level's picture instead of showing over the black.
//
const CONTROL_Z = CFG.visual.zIndex.ui + 90
//
// Sentinel identifier for the desktop mouse fallback slot
//
const MOUSE_SLOT_ID = 'mouse'

/**
 * True when the device likely has no keyboard (phones, tablets)
 * @returns {boolean}
 */
export function needsTouchControls() {
  return isTouchDevice()
}

/**
 * Registers hero jump handler so the virtual jump button can trigger it
 * @param {Function} fn - Jump action from hero setupControls
 */
export function registerVirtualJumpHandler(fn) {
  jumpHandler = fn
}

/**
 * Processes a queued virtual jump press once per frame
 */
export function processVirtualJump() {
  if (!jumpPulse || !jumpHandler) return
  jumpPulse = false
  jumpHandler()
}

/**
 * True when virtual controls emulate a pressed movement key
 * @param {string} key - Kaplay key name or physical Key* code
 * @returns {boolean}
 */
export function isVirtualKeyDown(key) {
  const leftKeys = CFG.controls.moveLeft
  const rightKeys = CFG.controls.moveRight
  if (leftKeys.includes(key) && virtualLeft.active) return true
  if (rightKeys.includes(key) && virtualRight.active) return true
  return false
}

/**
 * True while the on-screen left run button is held
 * @returns {boolean}
 */
export function isMoveLeftHeld() {
  return virtualLeft.active
}

/**
 * True while the on-screen right run button is held
 * @returns {boolean}
 */
export function isMoveRightHeld() {
  return virtualRight.active
}

/**
 * Shows or hides the on-screen run/jump buttons. Hidden buttons also stop
 * accepting taps so pre-level transition text doesn't leak into gameplay.
 * Safe to call when no controls exist (e.g. desktop) — it becomes a no-op.
 * @param {boolean} visible
 */
export function setVisible(visible) {
  if (!activeInst) return
  activeInst.visible = visible
  if (!visible) {
    //
    // Release any held fingers so the hero stops moving while controls are
    // hidden during the pre-level overlay.
    //
    movementSlots.clear()
    jumpPulse = false
    syncVirtualMovement()
  }
}

/**
 * Creates the run and jump buttons along the bottom of the screen on touch
 * devices (screen space: the levels fill the whole window), hidden: the level
 * shows them with setVisible(true) once its picture is built
 * @param {Object} k - Kaplay instance
 * @returns {Object|null} Touch controls instance
 */
export function create(k) {
  if (!needsTouchControls()) return null
  //
  // Canvas-level CSS so the browser never scrolls/zooms on game touches
  //
  k.canvas && (k.canvas.style.touchAction = 'none')
  const upright = k.height() > k.width()
  const centerGap = upright ? ARROW_CENTER_GAP_UPRIGHT : ARROW_CENTER_GAP
  const scale = Math.min(1, k.width() / (upright ? CONTROLS_FULL_W_UPRIGHT : CONTROLS_FULL_W))
  const centerY = k.height() - (CONTROL_BOTTOM_MARGIN + CIRCLE_RADIUS) * scale
  const leftX = (ARROW_MARGIN_X + CIRCLE_RADIUS) * scale
  const rightX = leftX + centerGap * scale
  const arrowHalfW = Math.min(HIT_HALF_WIDTH, centerGap / 2)
  const jumpX = k.width() - (JUMP_ARROW_MARGIN_X + CIRCLE_RADIUS) * scale
  //
  // Fresh scene mount — clear stale fingers. The jump handler stays: levels
  // create their hero (which registers it) before these controls, and every
  // new hero registers its own.
  //
  movementSlots.clear()
  virtualLeft.active = false
  virtualRight.active = false
  jumpPulse = false
  activeInst = {
    k,
    buttons: [],
    leftX,
    rightX,
    jumpX,
    centerY,
    scale,
    visible: false
  }
  bakeButtonSprites(k)
  activeInst.buttons.push(createArrowButton(k, leftX, centerY, 'left', scale, arrowHalfW))
  activeInst.buttons.push(createArrowButton(k, rightX, centerY, 'right', scale, arrowHalfW))
  activeInst.buttons.push(createArrowButton(k, jumpX, centerY, 'jump', scale, HIT_HALF_WIDTH))
  registerKaplayHandlers(k)
  return activeInst
}

//
// Creates one virtual arrow button drawable
//
function createArrowButton(k, x, y, type, scale, hitHalfW) {
  const drawScale = k.vec2(scale, scale)
  k.add([
    k.z(CONTROL_Z),
    k.fixed(),
    {
      draw() {
        drawControlButton(k, x, y, type, drawScale)
      }
    }
  ])
  return { x, y, halfW: hitHalfW * scale, halfH: HIT_HALF_HEIGHT * scale, type }
}

//
// Draws one baked button.
//
function drawControlButton(k, cx, cy, type, scale) {
  if (!activeInst?.visible) return
  k.drawSprite({
    sprite: buttonSpriteName(type),
    pos: k.vec2(cx, cy),
    anchor: 'center',
    scale,
    opacity: BUTTON_OPACITY
  })
}
function buttonSpriteName(type) {
  return `${BUTTON_SPRITE_PREFIX}-${type}`
}
//
// Bakes the three button sprites once per live k (a fresh engine has an
// empty sprite registry).
//
function bakeButtonSprites(k) {
  if (bakedForK.has(k)) return
  bakedForK.add(k)
  BUTTON_TYPES.forEach((type, i) => k.loadSprite(buttonSpriteName(type), bakeButton(type, BUTTON_GRAIN_SEED + i)))
}
function bakeButton(type, seed) {
  const colors = CFG.visual.colors.touchControls
  const size = (CIRCLE_RADIUS + BAKE_PAD) * 2
  const c = size / 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.globalAlpha = DISC_ALPHA
  ctx.fillStyle = colors.disc
  ctx.beginPath()
  ctx.arc(c, c, CIRCLE_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.lineWidth = RIM_W
  ctx.strokeStyle = colors.rim
  ctx.beginPath()
  ctx.arc(c, c, CIRCLE_RADIUS - RIM_W / 2, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = GLINT_ALPHA
  ctx.lineWidth = GLINT_W
  ctx.strokeStyle = colors.glint
  ctx.beginPath()
  ctx.arc(c, c, CIRCLE_RADIUS - GLINT_INSET, Math.PI, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1
  paintArrow(ctx, c, type, colors)
  applyForestFilmGrainToCanvas(canvas, seed)
  return canvas
}
//
// The arrow: contour stroked under it, the shade fill, then the cream fill
// raised by the bevel (both cut to the arrow), so only its lower edges show
// the shade.
//
function paintArrow(ctx, c, type, colors) {
  const pts = arrowPoints(type).map(([x, y]) => [c + x, c + y])
  ctx.lineJoin = 'round'
  ctx.lineWidth = ARROW_CONTOUR_W
  ctx.strokeStyle = colors.contour
  traceArrow(ctx, pts)
  ctx.stroke()
  ctx.fillStyle = colors.arrowShade
  ctx.fill()
  ctx.save()
  ctx.clip()
  traceArrow(ctx, pts.map(([x, y]) => [x, y - ARROW_BEVEL]))
  ctx.fillStyle = colors.arrow
  ctx.fill()
  ctx.restore()
}
function traceArrow(ctx, pts) {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
}
//
// Arrow corners round the button's centre (left, right, or up for jump).
//
function arrowPoints(type) {
  const half = ARROW_SIZE / 2 * ARROW_BAKE_SCALE
  if (type === 'left') return [[half * 0.35, -half], [-half * 0.55, 0], [half * 0.35, half]]
  if (type === 'right') return [[-half * 0.35, -half], [half * 0.55, 0], [-half * 0.35, half]]
  return [[-half, half * 0.35], [0, -half * 0.55], [half, half * 0.35]]
}

//
// Re-binds Kaplay touch/mouse hooks each scene mount.
// Using Kaplay's API (instead of raw DOM events) avoids the letterbox coordinate
// offset bug and guarantees proper multitouch dispatch on iOS / Android.
//
function registerKaplayHandlers(k) {
  touchStartHook?.cancel?.()
  touchEndHook?.cancel?.()
  mouseDownHook?.cancel?.()
  mouseUpHook?.cancel?.()
  touchStartHook = k.onTouchStart(onKaplayTouchStart)
  touchEndHook = k.onTouchEnd(onKaplayTouchEnd)
  touchMoveHook?.cancel?.()
  touchMoveHook = k.onTouchMove(onKaplayTouchMove)
  mouseDownHook = k.onMousePress(onKaplayMousePress)
  mouseUpHook = k.onMouseRelease(onKaplayMouseRelease)
}

//
// Each new finger maps to a movement button (held) or fires the jump pulse (one-shot)
//
function onKaplayTouchStart(pos, touch) {
  syncKaplayTouchPoint(pos, touch)
  updateMovementSlotFromTouch(pos, touch, true)
}

//
// Maps a touch to a held movement slot, or fires a one-shot jump pulse
//
function updateMovementSlotFromTouch(pos, touch, allowJump) {
  const inst = activeInst
  if (!inst) return
  const btn = hitVirtualButton(inst, pos.x, pos.y)
  const id = touch?.identifier ?? touch?.id ?? MOUSE_SLOT_ID
  if (!btn) {
    movementSlots.delete(id)
    syncVirtualMovement()
    return
  }
  if (btn.type === 'jump') {
    allowJump && (jumpPulse = true)
    movementSlots.delete(id)
    syncVirtualMovement()
    return
  }
  movementSlots.set(id, btn.type)
  syncVirtualMovement()
}

//
// Keeps tooltip hit-testing aligned with Kaplay touch coordinates
//
function onKaplayTouchMove(pos, touch) {
  syncKaplayTouchPoint(pos, touch)
  updateMovementSlotFromTouch(pos, touch)
}

//
// Only the finger that lifted clears its slot — other fingers stay held
//
function onKaplayTouchEnd(_pos, touch) {
  clearKaplayTouchPoint(touch)
  const id = touch?.identifier ?? touch?.id ?? MOUSE_SLOT_ID
  movementSlots.delete(id)
  syncVirtualMovement()
}

//
// Mirrors Kaplay touch positions into touch-input for tooltip hover
//
function syncKaplayTouchPoint(pos, touch) {
  if (!isTouchDevice()) return
  const id = touch?.identifier ?? touch?.id ?? 0
  setTouchPoint(id, { x: pos.x, y: pos.y })
}

//
// Removes Kaplay touch from shared touch-input map
//
function clearKaplayTouchPoint(touch) {
  if (!isTouchDevice()) return
  const id = touch?.identifier ?? touch?.id ?? 0
  removeTouchPoint(id)
}

//
// Desktop / devtools mouse: single-pointer fallback
//
function onKaplayMousePress() {
  const inst = activeInst
  if (!inst) return
  const pos = inst.k.mousePos()
  const btn = hitVirtualButton(inst, pos.x, pos.y)
  if (!btn) return
  if (btn.type === 'jump') {
    jumpPulse = true
    return
  }
  movementSlots.set(MOUSE_SLOT_ID, btn.type)
  syncVirtualMovement()
}

function onKaplayMouseRelease() {
  movementSlots.delete(MOUSE_SLOT_ID)
  syncVirtualMovement()
}

//
// Applies combined left/right state from all held movement fingers
//
function syncVirtualMovement() {
  let left = false
  let right = false
  for (const type of movementSlots.values()) {
    if (type === 'left') left = true
    else if (type === 'right') right = true
  }
  virtualLeft.active = left
  virtualRight.active = right
}

//
// Returns the virtual button under a game-space point, if any
//
function hitVirtualButton(inst, x, y) {
  if (!inst.visible) return null
  for (const btn of inst.buttons) {
    if (Math.abs(x - btn.x) < btn.halfW && Math.abs(y - btn.y) < btn.halfH) return btn
  }
  return null
}
