import { CFG } from '../../../cfg.js'

//
// Idle mouth wisps — insecurity phrases drifting up and fading from hero's mouth
//
const SPAWN_INTERVAL_MIN = 0.9
const SPAWN_INTERVAL_EXTRA = 1.6
const MOUTH_SIDE_OFFSET = 16
const MOUTH_Y_OFFSET = -38
const WISP_FONT_SIZE = 15
const WISP_LIFETIME = 1.4
const WISP_RISE_SPEED = 26
const WISP_DRIFT_RANGE = 14
const WISP_Z = CFG.visual.zIndex.ui - 2
//
// Insecurity phrases emitted from the hero's mouth in the word section.
// Short fragments so they fit above the head without wrapping.
//
const IDLE_SPEECH_PHRASES = [
  "I'm afraid",
  "why me",
  "I can't",
  "not enough",
  "I'm scared",
  "help",
  "I fail",
  "who am I",
  "I'm lost",
  "too weak",
  "I'm wrong",
  "I'm broken",
  "not worthy",
  "too much",
  "I'm nothing",
  "why try",
  "I'm tired",
  "leave me",
  "don't look",
  "I give up",
  "scared",
  "I don't know",
  "why bother",
  "no hope",
  "too hard",
  "I freeze",
  "am I ok",
  "I'm stuck",
  "no way out",
  "I mess up"
]

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
  const text = IDLE_SPEECH_PHRASES[Math.floor(Math.random() * IDLE_SPEECH_PHRASES.length)]
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
