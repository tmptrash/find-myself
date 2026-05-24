import { CFG } from '../../../cfg.js'

//
// Idle mouth wisps — small letters/words drifting up and fading
//
const SPAWN_INTERVAL_MIN = 1.4
const SPAWN_INTERVAL_EXTRA = 2.2
const MOUTH_SIDE_OFFSET = 16
const MOUTH_Y_OFFSET = -38
const WISP_FONT_SIZE = 16
const WISP_LIFETIME = 1.1
const WISP_RISE_SPEED = 28
const WISP_DRIFT_RANGE = 12
const WISP_Z = CFG.visual.zIndex.ui - 2
const IDLE_SPEECH_CHARS = 'aeiouwhyamno'
const IDLE_SPEECH_WORDS = ['why', 'no', 'I', 'am', '...', 'help', 'lost']

/**
 * Spawns drifting letters from the hero mouth while idle in word levels
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @returns {Object|null} Speech inst
 */
export function create(k, heroInst) {
  if (!heroInst?.currentLevel?.startsWith('level-word.')) return null
  const inst = {
    k,
    heroInst,
    timer: 0,
    nextDelay: SPAWN_INTERVAL_MIN + Math.random() * SPAWN_INTERVAL_EXTRA
  }
  k.onUpdate(() => onUpdate(inst))
  return inst
}

//
// Emits a mouth wisp when the hero stands still on the ground
//
function onUpdate(inst) {
  const { k, heroInst } = inst
  const ch = heroInst?.character
  if (!ch?.exists?.() || !heroInst.isSpawned || heroInst.isAnnihilating) return
  if (heroInst.controlsDisabled || !ch.isGrounded?.()) {
    inst.timer = 0
    return
  }
  const moving = Math.abs(ch.vel?.x || 0) > 20
  if (moving || heroInst.isSquashing) {
    inst.timer = 0
    return
  }
  inst.timer += k.dt()
  if (inst.timer < inst.nextDelay) return
  inst.timer = 0
  inst.nextDelay = SPAWN_INTERVAL_MIN + Math.random() * SPAWN_INTERVAL_EXTRA
  spawnMouthWisp(inst)
}

//
// Creates one floating letter or word above the hero mouth
//
function spawnMouthWisp(inst) {
  const { k, heroInst } = inst
  const ch = heroInst.character
  const useWord = Math.random() < 0.35
  const text = useWord
    ? IDLE_SPEECH_WORDS[Math.floor(Math.random() * IDLE_SPEECH_WORDS.length)]
    : IDLE_SPEECH_CHARS[Math.floor(Math.random() * IDLE_SPEECH_CHARS.length)]
  const faceSide = heroInst.direction || 1
  const mouthSideX = MOUTH_SIDE_OFFSET * faceSide
  const driftX = (Math.random() - 0.5) * WISP_DRIFT_RANGE
  const wisp = k.add([
    k.text(text, {
      size: WISP_FONT_SIZE,
      font: CFG.visual.fonts.thinFull.replace(/'/g, '')
    }),
    k.pos(ch.pos.x + mouthSideX + driftX, ch.pos.y + MOUTH_Y_OFFSET),
    k.anchor('center'),
    k.color(180, 180, 190),
    k.opacity(0.85),
    k.z(WISP_Z)
  ])
  const state = { elapsed: 0, vx: faceSide * 10 + driftX * 0.35 }
  wisp.onUpdate(() => onUpdateWisp(k, wisp, state))
}

//
// Rises and fades a single mouth wisp until destroyed
//
function onUpdateWisp(k, wisp, state) {
  state.elapsed += k.dt()
  wisp.pos.y -= WISP_RISE_SPEED * k.dt()
  wisp.pos.x += state.vx * k.dt()
  wisp.opacity = Math.max(0, 0.85 * (1 - state.elapsed / WISP_LIFETIME))
  state.elapsed >= WISP_LIFETIME && k.destroy(wisp)
}
