import { CFG } from '../cfg.js'
import { getRGB, parseHex } from '../utils/helper.js'
import { createSeededRandom } from '../utils/seeded-random.js'
import { applyForestFilmGrainToCanvas } from '../sections/forest/utils/forest-parallax-grain.js'
import { paintMossStrand } from '../sections/cave/utils/cave-paint.js'
//
// Global Yes / No confirm dialog, usable from any scene, drawn as a forest
// signboard: a wooden board with grain and knots hangs on two crooked
// leafy vines from the top of the screen, over a vignette that darkens the
// scene's edges. The answers are small wooden tags painted on the board (the
// selected one glows gold and sprouts a leaf); a twig cross in the corner
// closes it. Colours: CFG palette `confirmDialog`.
//
// Motion: the board drops in on its vines with a springy bounce and a
// pendulum swing, sways a little while waiting and jolts on every change of
// choice. "No" (Esc, the cross) gives the camera a light shake and pulls the
// board back up; "Yes" shakes the camera hard, bursts the board into leaves
// and lets it fall — the action runs once that has played.
//
// It opens on "No", so a stray confirm never triggers the action. Arrows /
// WASD move the choice, Enter / Space confirm it; on a touch screen a touch
// sliding over a tag selects it and a tap confirms it (the game takes no
// mouse). Every piece is baked once per live k and
// window scale. Sizes are design px at REF_HEIGHT.
//
// Looks: the forest signboard (default) or the cave's — a pad leaf of the
// monster plant hung on two of its stems, small leaves for the answers.
// Each look has its own palette (CFG `confirmDialog` / `confirmDialogCave`).
//
export const LOOKS = {
  FOREST: 'forest',
  CAVE: 'cave'
}
const PALETTES = {
  [LOOKS.FOREST]: CFG.visual.colors.palette.confirmDialog,
  [LOOKS.CAVE]: CFG.visual.colors.palette.confirmDialogCave
}
const REF_HEIGHT = 1080
const CHOICE_YES = 0
const CHOICE_NO = 1
const CHOICE_COUNT = 2
const PHASE_CLOSED = 'closed'
const PHASE_OPEN = 'open'
const PHASE_OUT = 'out'
const PHASE_BREAK = 'break'
//
// Board: plank size, padding around the question and the tag row, the
// ragged outline (vertex step and jitter, chamfered corners).
//
const BOARD_W = 640
const BOARD_PAD_TOP = 48
const BOARD_PAD_BOTTOM = 40
const BOARD_EDGE_STEP = 40
const BOARD_EDGE_JITTER = 2.5
const BOARD_CHAMFER = 9
const BOARD_CONTOUR = 3
const BOARD_SEAM_FRACS = [0.36, 0.7]
const BOARD_SEAM_ALPHA = 0.45
const BOARD_SEAM_W = 2
const BOARD_GRAIN_LINES = 18
const BOARD_GRAIN_ALPHA = 0.2
const BOARD_GRAIN_W = 1.2
const BOARD_GRAIN_WAVE = 3
const BOARD_GRAIN_STEP = 6
const BOARD_GRAIN_FREQ_MIN = 2
const BOARD_GRAIN_FREQ_RANGE = 3
const BOARD_KNOTS = 3
const BOARD_KNOT_RX = 9
const BOARD_KNOT_RY = 4
const BOARD_KNOT_ALPHA = 0.4
const BOARD_KNOT_MARGIN = 0.12
const BOARD_LIT_H = 5
const BOARD_LIT_ALPHA = 0.5
const BOARD_SHADE_H = 9
const BOARD_SHADE_ALPHA = 0.4
const BOARD_SEED = 7121
//
// Cave board: a pad leaf — a rounded-square oval (SQUARENESS: superellipse
// power) scalloped by lobes of uneven depth, its underside showing as a
// darker band below the rim, veins running from its very centre to every
// side and branching on the way (fractal: each side vein splits the same
// way, thinner, DEPTH levels), a lit rim, and short moss strands with
// drops hanging off its lower edge (extra room baked under the board for
// them). The stems come down onto the leaf and end in knobs on it
// (ATTACH_Y under its top); its cross sits in the leaf's top-right corner
// (CLOSE_INSET from its right side, CLOSE_Y under its top), inside the
// rounded rim and right of the question.
//
const PAD_SQUARENESS = 3
const PAD_LOBES = 9
const PAD_LOBE_AMP = 0.035
const PAD_LOBE_JITTER = 0.02
const PAD_STEPS = 140
const PAD_THICK = 9
const PAD_VEINS = 14
const PAD_VEIN_JITTER = 0.4
const PAD_VEIN_REACH = 0.97
const PAD_VEIN_W = 2.8
const PAD_VEIN_ALPHA = 0.7
const PAD_VEIN_DEPTH = 2
const PAD_VEIN_STEPS = 10
const PAD_VEIN_WANDER = 0.18
const PAD_VEIN_BRANCH_AT = [0.3, 0.5, 0.7]
const PAD_VEIN_FORK_MIN = 0.45
const PAD_VEIN_FORK_RANGE = 0.35
const PAD_VEIN_BRANCH_LEN = 0.6
const PAD_VEIN_THIN = 0.6
const PAD_CENTER_R = 5
const PAD_CENTER_ALPHA = 0.6
const PAD_ATTACH_Y = 38
const PAD_CLOSE_INSET = 50
const PAD_CLOSE_Y = 70
const PAD_RIM_LIT_W = 4
const PAD_RIM_LIT_ALPHA = 0.55
const PAD_STRANDS = 10
const PAD_STRAND_FROM = 0.25
const PAD_STRAND_MIN = 16
const PAD_STRAND_RANGE = 34
const PAD_HANG_ROOM = 64
const PAD_KNOB_R = 6
const PAD_SEED = 7131
//
// Cave answer: a small pad leaf (fewer, deeper lobes, thinner underside).
//
const TAG_PAD_LOBES = 5
const TAG_PAD_LOBE_AMP = 0.06
const TAG_PAD_THICK = 4
//
// Painted question text with a dark shadow.
//
const QUESTION_SIZE = 26
const TEXT_LINE_HEIGHT = 1.15
const QUESTION_LINE_GAP = 10
const QUESTION_SHADOW = 2
const QUESTION_TO_TAGS = 34
//
// Answer tags.
//
const TAG_W = 150
const TAG_H = 54
const TAG_GAP = 48
const TAG_JITTER = 1.5
const TAG_CONTOUR = 2.5
const TAG_TEXT_SIZE = 24
//
// Sprout on the selected tag: two leaves from its top-left corner (offset,
// angles in radians, the second one shorter).
//
const TAG_SPROUT_LEAF = 13
const TAG_SPROUT_X = 6
const TAG_SPROUT_Y = 2
const TAG_SPROUT_ANGLES = [-2.3, -1.2]
const TAG_SPROUT_SECOND_SCALE = 0.8
const TAG_LIT_SCALE = 0.6
const TAG_CHAMFER_SCALE = 0.6
const TAG_EDGE_STEP_SCALE = 0.5
//
// Vines from the top of the screen to two nails on the board.
//
const VINE_ATTACH_FRAC = 0.36
const VINE_NAIL_Y = 8
const VINE_NAIL_R = 4
const VINE_NAIL_GLINT = 0.35
const VINE_TOP_Y = -20
const VINE_W = 5
const VINE_LIGHT_W = 2
//
// Each vine is a crooked polyline: a sideways bow plus a few waves of random
// amplitude and phase, faded to zero at both ends so it still starts above
// the screen and ends on its nail, slowly writhing. Leaves sprout from the
// vine itself, alternating sides, angled down along it.
//
const VINE_SEGMENTS = 24
const VINE_BOW_MAX = 10
const VINE_WAVE_AMP_MIN = 3
const VINE_WAVE_AMP_RANGE = 4
const VINE_WAVE_COUNT_MIN = 1.5
const VINE_WAVE_COUNT_RANGE = 1.5
const VINE_KINK_AMP = 1.5
const VINE_KINK_COUNT = 7
const VINE_WRITHE_SPEED = 0.6
const VINE_SEED = 4243
const VINE_LEAF_TS = [0.16, 0.3, 0.44, 0.58, 0.72, 0.86]
const VINE_LEAF_SCALE = 1.8
const VINE_LEAF_ANGLE = 50
//
// Twig cross in the board's top-right corner.
//
const CLOSE_SIZE = 36
const CLOSE_INSET = 14
const CLOSE_ARM = 0.32
const CLOSE_TWIG_W = 4
const CLOSE_CONTOUR = 2
const CLOSE_HOVER_TILT = 12
const CLOSE_NUB_AT = 0.3
const CLOSE_NUB_X = 0.35
const CLOSE_NUB_Y = 0.25
//
// Leaf sprites (vines, sprouts, burst) and the burst itself.
//
const LEAF_LEN = 16
const LEAF_W = 0.42
const LEAF_CONTOUR = 1.2
const LEAF_BULGE_AT = 0.45
const LEAF_RIB_FROM = 0.1
const LEAF_RIB_TO = 0.8
const LEAF_BAKE_PAD = 0.3
const BURST_COUNT = 64
const BURST_SPEED_MIN = 120
const BURST_SPEED_RANGE = 380
const BURST_UP_BIAS = 160
const BURST_SPIN = 9
const BURST_LIFE_MIN = 0.7
const BURST_LIFE_RANGE = 0.6
const BURST_GRAVITY = 900
const BURST_DRAG = 1.6
const BURST_SCALE_MIN = 1.4
const BURST_SCALE_RANGE = 1.3
//
// Motion: the board's spring toward its rest / exit height, its pendulum
// swing (degrees), the idle sway, the veil fade and the break fall.
//
const SPRING_K = 140
const SPRING_DAMP = 11
const DROP_EXTRA = 120
const EXIT_EXTRA = 160
const SWING_K = 60
const SWING_DAMP = 4.5
const OPEN_SWING_DEG = 6
//
// Angular kick (deg/s) on a change of choice and on the pull back up.
//
const SWING_KICK = 15
const IDLE_SWAY_DEG = 0.7
const IDLE_SWAY_SPEED = 1.3
const VEIL_SPEED = 6
const VEIL_OPACITY = 1
const BREAK_DURATION = 1
const BREAK_FALL_GRAVITY = 1800
const BREAK_FADE = 0.55
const BREAK_SPIN = 40
const MAX_DT = 1 / 30
//
// Camera jolts and the tag pop on a change of choice.
//
const YES_SHAKE = 14
const NO_SHAKE = 4
const SELECT_POP = 0.14
const SELECT_POP_DECAY = 9
const SELECTED_PULSE_AMP = 0.03
const SELECTED_PULSE_SPEED = 4
//
// Vignette veil: transparent centre, dark edges, baked at a fraction of the
// screen and stretched (it is a soft gradient).
//
const VIGNETTE_SCALE = 0.25
const VIGNETTE_INNER = 0.25
const VIGNETTE_CENTER_ALPHA = 0.7
const VIGNETTE_EDGE_ALPHA = 0.97
const BAKE_PAD = 26
const SPRITE_PREFIX = 'confirm-dialog-v4'
const GRAIN_SEED = 8221
const DEG = Math.PI / 180

/**
 * Creates a closed confirm dialog layer.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {string} cfg.question - Question text ('\n' breaks lines)
 * @param {string} cfg.yesLabel - Label of the confirming tag
 * @param {string} cfg.noLabel - Label of the cancelling tag
 * @param {Function} cfg.onYes - Called once "Yes" has played its break
 * @param {Function} [cfg.onSelect] - Called when the highlighted tag changes
 * @param {number} cfg.z - Draw layer
 * @param {boolean} [cfg.defaultYes=false] - Highlight "Yes" when the dialog opens
 * @param {string} [cfg.look=LOOKS.FOREST] - Look of the board (forest signboard or cave leaf)
 * @returns {Object} Dialog inst
 */
export function create(cfg) {
  const { k } = cfg
  const s = k.height() / REF_HEIGHT
  const look = cfg.look ?? LOOKS.FOREST
  const pal = PALETTES[look]
  const sprites = bakeSprites(k, cfg, s, look, pal)
  const inst = {
    k,
    s,
    pal,
    sprites,
    onYes: cfg.onYes,
    onSelect: cfg.onSelect,
    phase: PHASE_CLOSED,
    defaultChoice: cfg.defaultYes ? CHOICE_YES : CHOICE_NO,
    selected: CHOICE_NO,
    closeHovered: false,
    lastMouse: null,
    pivotX: k.width() / 2,
    restY: k.height() / 2 - sprites.boardH / 2,
    y: 0,
    vy: 0,
    angle: 0,
    angVel: 0,
    veil: 0,
    boardAlpha: 1,
    breakT: 0,
    time: 0,
    pops: [0, 0],
    burst: [],
    vines: buildVineShapes()
  }
  k.add([k.z(cfg.z), { update: () => onUpdate(inst), draw: () => onDraw(inst) }])
  return inst
}

/**
 * Drops the board in on its vines with "No" highlighted.
 * @param {Object} inst - Dialog inst
 */
export function open(inst) {
  if (inst.phase !== PHASE_CLOSED) return
  inst.phase = PHASE_OPEN
  inst.selected = inst.defaultChoice
  inst.closeHovered = false
  inst.y = -inst.sprites.boardH - DROP_EXTRA * inst.s
  inst.vy = 0
  inst.angle = (Math.random() < 0.5 ? -1 : 1) * OPEN_SWING_DEG
  inst.angVel = 0
  inst.boardAlpha = 1
  inst.pops = [0, 0]
  inst.lastMouse = { x: inst.k.mousePos().x, y: inst.k.mousePos().y }
}

/**
 * Pulls the board back up without acting.
 * @param {Object} inst - Dialog inst
 */
export function close(inst) {
  if (inst.phase !== PHASE_OPEN) return
  inst.phase = PHASE_OUT
  inst.angVel += SWING_KICK
}

/**
 * @param {Object} inst - Dialog inst
 * @returns {boolean} True while the dialog is on screen (including its
 *   enter / exit motion), so the scene keeps its own input off
 */
export function isOpen(inst) {
  return inst.phase !== PHASE_CLOSED
}

/**
 * Moves the highlight to the other tag (two tags, so any step wraps).
 * @param {Object} inst - Dialog inst
 * @param {number} delta - Step (sign only)
 */
export function moveSelection(inst, delta) {
  if (inst.phase !== PHASE_OPEN) return
  select(inst, (inst.selected + delta + CHOICE_COUNT) % CHOICE_COUNT)
}

/**
 * Confirms the highlighted tag: "Yes" breaks the board into leaves (the
 * action follows), "No" jolts the camera lightly and pulls the board up.
 * @param {Object} inst - Dialog inst
 */
export function confirm(inst) {
  if (inst.phase !== PHASE_OPEN) return
  if (inst.selected === CHOICE_YES) {
    breakBoard(inst)
    return
  }
  inst.k.shake(NO_SHAKE)
  close(inst)
}

/**
 * Mouse movement over a tag highlights it; the twig cross lights up while
 * hovered.
 * @param {Object} inst - Dialog inst
 * @returns {boolean} True when the pointer is over a tag or the cross
 */
export function updatePointer(inst) {
  if (inst.phase !== PHASE_OPEN) return false
  const mouse = inst.k.mousePos()
  const moved = !inst.lastMouse || mouse.x !== inst.lastMouse.x || mouse.y !== inst.lastMouse.y
  inst.lastMouse = { x: mouse.x, y: mouse.y }
  const hit = tagUnderPointer(inst)
  moved && hit != null && select(inst, hit)
  inst.closeHovered = isPointerOverClose(inst)
  return hit != null || inst.closeHovered
}

/**
 * A click on the twig cross closes the dialog, a click on a tag confirms
 * it; a click elsewhere is swallowed.
 * @param {Object} inst - Dialog inst
 */
export function click(inst) {
  if (inst.phase !== PHASE_OPEN) return
  if (isPointerOverClose(inst)) {
    inst.k.shake(NO_SHAKE)
    close(inst)
    return
  }
  const hit = tagUnderPointer(inst)
  if (hit == null) return
  inst.selected = hit
  confirm(inst)
}
function select(inst, index) {
  if (index === inst.selected) return
  inst.selected = index
  inst.pops[index] = 1
  inst.angVel += (index === CHOICE_YES ? -1 : 1) * SWING_KICK
  inst.onSelect?.()
}
//
// "Yes": hard camera jolt, a burst of leaves over the board, then the board
// drops and fades; onYes runs when the break has played.
//
function breakBoard(inst) {
  const { k, s, sprites } = inst
  inst.phase = PHASE_BREAK
  inst.breakT = 0
  inst.vy = -BURST_UP_BIAS * s
  inst.angVel = (Math.random() < 0.5 ? -1 : 1) * BREAK_SPIN
  k.shake(YES_SHAKE)
  for (let i = 0; i < BURST_COUNT; i++) {
    const local = { x: (Math.random() - 0.5) * BOARD_W * s, y: Math.random() * sprites.boardH }
    const at = toWorld(inst, local)
    const a = Math.random() * Math.PI * 2
    const speed = (BURST_SPEED_MIN + Math.random() * BURST_SPEED_RANGE) * s
    inst.burst.push({
      x: at.x,
      y: at.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - BURST_UP_BIAS * s,
      rot: Math.random() * 360,
      spin: (Math.random() - 0.5) * 2 * BURST_SPIN * 60,
      life: BURST_LIFE_MIN + Math.random() * BURST_LIFE_RANGE,
      age: 0,
      scale: BURST_SCALE_MIN + Math.random() * BURST_SCALE_RANGE,
      sprite: sprites.leaves[Math.floor(Math.random() * sprites.leaves.length)]
    })
  }
}
function onUpdate(inst) {
  if (inst.phase === PHASE_CLOSED && !inst.burst.length) return
  const dt = Math.min(inst.k.dt(), MAX_DT)
  inst.time += dt
  updateBoard(inst, dt)
  updateBurst(inst, dt)
  inst.pops = inst.pops.map(p => p * Math.exp(-SELECT_POP_DECAY * dt))
  const veilTarget = inst.phase === PHASE_OPEN ? 1 : 0
  inst.veil += (veilTarget - inst.veil) * Math.min(1, dt * VEIL_SPEED)
}
//
// Spring toward the rest height (or above the screen while leaving), damped
// pendulum swing; while breaking the board falls, spins and fades instead.
//
function updateBoard(inst, dt) {
  if (inst.phase === PHASE_CLOSED) return
  inst.angVel += (-inst.angle * SWING_K - inst.angVel * SWING_DAMP) * dt
  inst.angle += inst.angVel * dt
  if (inst.phase === PHASE_BREAK) {
    inst.vy += BREAK_FALL_GRAVITY * inst.s * dt
    inst.y += inst.vy * dt
    inst.angle += inst.angVel * dt
    inst.boardAlpha = Math.max(0, inst.boardAlpha - dt / BREAK_FADE)
    inst.breakT += dt
    if (inst.breakT < BREAK_DURATION) return
    inst.phase = PHASE_CLOSED
    inst.onYes()
    return
  }
  const hiddenY = -inst.sprites.boardH - EXIT_EXTRA * inst.s
  const target = inst.phase === PHASE_OUT ? hiddenY : inst.restY
  inst.vy += ((target - inst.y) * SPRING_K - inst.vy * SPRING_DAMP) * dt
  inst.y += inst.vy * dt
  inst.phase === PHASE_OUT && inst.y <= hiddenY + 1 && (inst.phase = PHASE_CLOSED)
}
function updateBurst(inst, dt) {
  inst.burst.forEach(leaf => {
    leaf.age += dt
    leaf.vy += BURST_GRAVITY * inst.s * dt
    leaf.vx *= Math.exp(-BURST_DRAG * dt)
    leaf.x += leaf.vx * dt
    leaf.y += leaf.vy * dt
    leaf.rot += leaf.spin * dt
  })
  inst.burst = inst.burst.filter(leaf => leaf.age < leaf.life)
}
//
// Board angle with the idle sway on top of the pendulum (degrees).
//
function boardAngle(inst) {
  return inst.angle + Math.sin(inst.time * IDLE_SWAY_SPEED) * IDLE_SWAY_DEG
}
//
// Board-local point (origin at the top centre of the plank) → screen.
//
function toWorld(inst, local) {
  const a = boardAngle(inst) * DEG
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  return {
    x: inst.pivotX + local.x * cos - local.y * sin,
    y: inst.y + local.x * sin + local.y * cos
  }
}
function toLocal(inst, point) {
  const a = boardAngle(inst) * DEG
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const dx = point.x - inst.pivotX
  const dy = point.y - inst.y
  return { x: dx * cos + dy * sin, y: -dx * sin + dy * cos }
}
function isPointerOverClose(inst) {
  const p = toLocal(inst, inst.k.mousePos())
  const c = inst.sprites.closeAt
  const half = CLOSE_SIZE * inst.s / 2
  return Math.abs(p.x - c.x) <= half && Math.abs(p.y - c.y) <= half
}
function tagUnderPointer(inst) {
  const p = toLocal(inst, inst.k.mousePos())
  const halfW = TAG_W * inst.s / 2
  const halfH = TAG_H * inst.s / 2
  const index = inst.sprites.tagsAt.findIndex(t => Math.abs(p.x - t.x) <= halfW && Math.abs(p.y - t.y) <= halfH)
  return index < 0 ? null : index
}
//
// Veil, vines (lines), then every sprite: vine leaves, board, tags, twig
// cross, flying leaves. The cave's stems come down over its leaf instead
// (drawn after it, ending in their knobs on it).
//
function onDraw(inst) {
  if (inst.phase === PHASE_CLOSED && !inst.burst.length && inst.veil < 0.01) return
  const { k, sprites } = inst
  inst.veil > 0.01 && k.drawSprite({
    sprite: sprites.vignette,
    pos: k.vec2(0, 0),
    width: k.width(),
    height: k.height(),
    opacity: inst.veil * VEIL_OPACITY
  })
  const hanging = inst.phase === PHASE_OPEN || inst.phase === PHASE_OUT
  const onLeaf = Boolean(sprites.knob)
  hanging && !onLeaf && drawVines(inst)
  inst.phase !== PHASE_CLOSED && drawBoard(inst)
  hanging && onLeaf && drawVines(inst)
  inst.burst.forEach(leaf => k.drawSprite({
    sprite: leaf.sprite,
    pos: k.vec2(leaf.x, leaf.y),
    anchor: 'center',
    angle: leaf.rot,
    scale: k.vec2(leaf.scale, leaf.scale),
    opacity: Math.max(0, 1 - leaf.age / leaf.life)
  }))
}
//
// Two crooked vines from above the screen to the board's nails: a dark stem
// with a lighter core, and leaves growing out of the stem.
//
function drawVines(inst) {
  const { k, s, sprites } = inst
  const vine = getRGB(k, inst.pal.vine)
  const vineLight = getRGB(k, inst.pal.vineLight)
  const paths = sprites.nailsAt.map((nail, i) => {
    const bottom = toWorld(inst, nail)
    return vinePath(inst, inst.vines[i], { x: inst.pivotX + nail.x, y: VINE_TOP_Y * s }, bottom)
  })
  paths.forEach(path => k.drawLines({ pts: path.map(p => k.vec2(p.x, p.y)), width: VINE_W * s, color: vine, join: 'round' }))
  paths.forEach(path => k.drawLines({ pts: path.map(p => k.vec2(p.x, p.y)), width: VINE_LIGHT_W * s, color: vineLight, join: 'round' }))
  const leafScale = k.vec2(VINE_LEAF_SCALE, VINE_LEAF_SCALE)
  paths.forEach((path, side) => VINE_LEAF_TS.forEach((t, i) => {
    const at = pointOnPath(path, t)
    const out = (i + side) % 2 === 0 ? 1 : -1
    k.drawSprite({
      sprite: sprites.leaves[i % sprites.leaves.length],
      pos: k.vec2(at.x, at.y),
      anchor: k.vec2(sprites.leafStemAnchorX, 0),
      angle: at.angle / DEG + out * VINE_LEAF_ANGLE,
      scale: leafScale
    })
  }))
  sprites.knob && paths.forEach(path => {
    const end = path[path.length - 1]
    k.drawSprite({ sprite: sprites.knob, pos: k.vec2(end.x, end.y), anchor: 'center' })
  })
}
//
// Fixed random shape of each vine (bow, waves, kinks), seeded so it never
// changes between visits.
//
function buildVineShapes() {
  const rng = createSeededRandom(VINE_SEED)
  return [0, 1].map(() => ({
    bow: (rng() - 0.5) * 2 * VINE_BOW_MAX,
    amp: VINE_WAVE_AMP_MIN + rng() * VINE_WAVE_AMP_RANGE,
    waves: VINE_WAVE_COUNT_MIN + rng() * VINE_WAVE_COUNT_RANGE,
    phase: rng() * Math.PI * 2,
    kinkPhase: rng() * Math.PI * 2
  }))
}
//
// Polyline of one vine between its top and its nail: sideways offset (bow,
// waves, small kinks) under a sin envelope so both ends stay pinned.
//
function vinePath(inst, shape, top, bottom) {
  const { s } = inst
  const dx = bottom.x - top.x
  const dy = bottom.y - top.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const writhe = inst.time * VINE_WRITHE_SPEED
  const pts = []
  for (let i = 0; i <= VINE_SEGMENTS; i++) {
    const t = i / VINE_SEGMENTS
    const envelope = Math.sin(t * Math.PI)
    const wave = Math.sin(t * Math.PI * 2 * shape.waves + shape.phase + writhe) * shape.amp
    const kink = Math.sin(t * Math.PI * 2 * VINE_KINK_COUNT + shape.kinkPhase) * VINE_KINK_AMP
    const off = (shape.bow + wave + kink) * envelope * s
    pts.push({ x: top.x + dx * t + nx * off, y: top.y + dy * t + ny * off })
  }
  return pts
}
//
// Point and direction (radians) at fraction t along a polyline's points.
//
function pointOnPath(pts, t) {
  const f = t * (pts.length - 1)
  const i = Math.min(pts.length - 2, Math.floor(f))
  const u = f - i
  const a = pts[i]
  const b = pts[i + 1]
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, angle: Math.atan2(b.y - a.y, b.x - a.x) }
}
//
// Board, tags (selected pulses, a change of choice pops it) and the cross,
// all following the board's position and angle.
//
function drawBoard(inst) {
  const { k, sprites } = inst
  const angle = boardAngle(inst)
  const opacity = inst.boardAlpha
  k.drawSprite({
    sprite: sprites.board,
    pos: k.vec2(inst.pivotX, inst.y),
    anchor: k.vec2(0, sprites.boardAnchorY),
    angle,
    opacity
  })
  sprites.tagsAt.forEach((at, i) => {
    const selected = i === inst.selected
    const pulse = selected ? SELECTED_PULSE_AMP * Math.sin(inst.time * SELECTED_PULSE_SPEED) : 0
    const scale = 1 + pulse + inst.pops[i] * SELECT_POP
    const p = toWorld(inst, at)
    k.drawSprite({
      sprite: selected ? sprites.tags[i].selected : sprites.tags[i].normal,
      pos: k.vec2(p.x, p.y),
      anchor: 'center',
      angle,
      scale: k.vec2(scale, scale),
      opacity
    })
  })
  const c = toWorld(inst, sprites.closeAt)
  k.drawSprite({
    sprite: inst.closeHovered ? sprites.close.hovered : sprites.close.normal,
    pos: k.vec2(c.x, c.y),
    anchor: 'center',
    angle: angle + (inst.closeHovered ? CLOSE_HOVER_TILT : 0),
    opacity
  })
}
//
// Every bake (board with the question, tag states, cross states, leaves,
// vignette), once per k, scale and question; plus the board-local spots of
// the tags, the cross and the vine nails.
//
function bakeSprites(k, cfg, s, look, pal) {
  const cave = look === LOOKS.CAVE
  const lines = cfg.question.split('\n')
  const lineH = Math.ceil(QUESTION_SIZE * TEXT_LINE_HEIGHT)
  const questionH = lines.length * lineH + (lines.length - 1) * QUESTION_LINE_GAP
  const boardH = (BOARD_PAD_TOP + questionH + QUESTION_TO_TAGS + TAG_H + BOARD_PAD_BOTTOM) * s
  const key = `${SPRITE_PREFIX}-${look}-${Math.round(s * 1000)}-${cfg.question.length}`
  const load = (name, bake) => {
    k.getSprite(name) || k.loadSprite(name, bake())
    return name
  }
  const pad = BAKE_PAD * s
  const hangRoom = cave ? PAD_HANG_ROOM * s : 0
  const board = load(`${key}-board`, () => (cave ? bakePadBoard(lines, lineH, s, boardH, hangRoom, pal) : bakeBoard(lines, lineH, s, boardH, pal)))
  const tagsY = (BOARD_PAD_TOP + questionH + QUESTION_TO_TAGS + TAG_H / 2) * s
  const tagHalfGap = (TAG_W + TAG_GAP) / 2 * s
  const tags = [cfg.yesLabel, cfg.noLabel].map((label, i) => ({
    normal: load(`${key}-tag-${i}`, () => bakeTag(label, s, false, cave, pal)),
    selected: load(`${key}-tag-${i}-selected`, () => bakeTag(label, s, true, cave, pal))
  }))
  const close = {
    normal: load(`${key}-close`, () => bakeClose(s, false, pal)),
    hovered: load(`${key}-close-hovered`, () => bakeClose(s, true, pal))
  }
  const leaves = pal.leaf.map((hex, i) => load(`${key}-leaf-${i}`, () => bakeLeaf(s, hex, pal)))
  const leafPad = BAKE_PAD * s * LEAF_BAKE_PAD
  const leafW = Math.ceil(LEAF_LEN * s + leafPad * 2)
  const vignette = load(`${SPRITE_PREFIX}-${look}-vignette-${k.width()}x${k.height()}`, () => bakeVignette(k.width(), k.height(), pal))
  const knob = cave ? load(`${key}-knob`, () => bakeKnob(s, pal)) : null
  const attachX = BOARD_W * VINE_ATTACH_FRAC * s
  const nailY = (cave ? PAD_ATTACH_Y : VINE_NAIL_Y) * s
  const closeX = (BOARD_W / 2 - (cave ? PAD_CLOSE_INSET : CLOSE_INSET + CLOSE_SIZE / 2)) * s
  const closeY = (cave ? PAD_CLOSE_Y : CLOSE_INSET + CLOSE_SIZE / 2) * s
  return {
    board,
    tags,
    close,
    leaves,
    knob,
    leafStemAnchorX: (2 * leafPad) / leafW - 1,
    vignette,
    boardH,
    boardAnchorY: (2 * pad) / (boardH + pad * 2 + hangRoom) - 1,
    tagsAt: [{ x: -tagHalfGap, y: tagsY }, { x: tagHalfGap, y: tagsY }],
    closeAt: { x: closeX, y: closeY },
    nailsAt: [{ x: -attachX, y: nailY }, { x: attachX, y: nailY }]
  }
}
//
// The signboard: ragged plank outline, wood grain, seams and knots, a lit
// top edge and a shaded bottom, the dark contour, nails for the vines and the
// painted question.
//
function bakeBoard(lines, lineH, s, boardH, pal) {
  const pad = BAKE_PAD * s
  const w = BOARD_W * s
  const canvas = newCanvas(w + pad * 2, boardH + pad * 2)
  const ctx = canvas.getContext('2d')
  const rng = createSeededRandom(BOARD_SEED)
  const outline = raggedRectPath(pad, pad, w, boardH, BOARD_CHAMFER * s, BOARD_EDGE_STEP * s, BOARD_EDGE_JITTER * s, rng)
  ctx.fillStyle = pal.wood
  ctx.fill(outline)
  ctx.save()
  ctx.clip(outline)
  paintWoodGrain(ctx, pad, pad, w, boardH, s, rng, pal)
  ctx.restore()
  ctx.strokeStyle = pal.contour
  ctx.lineWidth = BOARD_CONTOUR * s
  ctx.lineJoin = 'round'
  ctx.stroke(outline)
  const attachX = w * VINE_ATTACH_FRAC
  const nails = [-attachX, attachX]
  nails.forEach(dx => paintNail(ctx, pad + w / 2 + dx, pad + VINE_NAIL_Y * s, s, pal))
  paintQuestion(ctx, lines, lineH, pad, w, s, pal)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  return canvas
}
//
// The cave board: the pad leaf's underside band, its top, veins and lit
// rim, the contour, moss strands off its lower edge and the painted
// question (the stem knobs are drawn live over the stems).
//
function bakePadBoard(lines, lineH, s, boardH, hangRoom, pal) {
  const pad = BAKE_PAD * s
  const w = BOARD_W * s
  const canvas = newCanvas(w + pad * 2, boardH + pad * 2 + hangRoom)
  const ctx = canvas.getContext('2d')
  const rng = createSeededRandom(PAD_SEED)
  const rim = padRim(pad + w / 2, pad + boardH / 2, w / 2, boardH / 2, PAD_LOBES, PAD_LOBE_AMP, rng)
  const top = closedPath(rim)
  const under = closedPath(rim.map(p => ({ x: p.x, y: p.y + PAD_THICK * s })))
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.fillStyle = pal.woodDark
  ctx.fill(under)
  ctx.strokeStyle = pal.contour
  ctx.lineWidth = BOARD_CONTOUR * s
  ctx.stroke(under)
  ctx.fillStyle = pal.wood
  ctx.fill(top)
  ctx.save()
  ctx.clip(top)
  paintPadVeins(ctx, { x: pad + w / 2, y: pad + boardH / 2 }, rim, s, rng, pal)
  ctx.globalAlpha = PAD_RIM_LIT_ALPHA
  ctx.strokeStyle = pal.woodLight
  ctx.lineWidth = PAD_RIM_LIT_W * s
  ctx.stroke(top)
  ctx.restore()
  ctx.strokeStyle = pal.contour
  ctx.lineWidth = BOARD_CONTOUR * s
  ctx.stroke(top)
  paintPadStrands(ctx, rim, s, rng)
  paintQuestion(ctx, lines, lineH, pad, w, s, pal)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  return canvas
}
//
// Rim of a pad leaf: a rounded-square oval scalloped by lobes of uneven
// depth (points clockwise from the right).
//
function padRim(cx, cy, rx, ry, lobes, amp, rng) {
  const phase = rng() * Math.PI * 2
  const depth = Array.from({ length: lobes }, () => 1 + (rng() - 0.5) * 2 * PAD_LOBE_JITTER / amp)
  const exp = 2 / PAD_SQUARENESS
  const pts = []
  for (let i = 0; i < PAD_STEPS; i++) {
    const a = i / PAD_STEPS * Math.PI * 2
    const lobe = Math.floor(((a + phase) / (Math.PI * 2)) * lobes) % lobes
    const m = 1 - amp + amp * Math.abs(Math.sin((a + phase) * lobes / 2)) * depth[lobe]
    const c = Math.cos(a)
    const sn = Math.sin(a)
    pts.push({ x: cx + Math.sign(c) * Math.pow(Math.abs(c), exp) * rx * m, y: cy + Math.sign(sn) * Math.pow(Math.abs(sn), exp) * ry * m, a })
  }
  return pts
}
//
// Veins from the leaf's centre to every side (each reaching almost to the
// rim in its direction, branching on the way), and a dark dot at the
// centre where they meet.
//
function paintPadVeins(ctx, center, rim, s, rng, pal) {
  ctx.globalAlpha = PAD_VEIN_ALPHA
  ctx.strokeStyle = pal.woodDark
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let i = 0; i < PAD_VEINS; i++) {
    const a = (i + (rng() - 0.5) * PAD_VEIN_JITTER) / PAD_VEINS * Math.PI * 2
    const end = rimToward(rim, center, a)
    const len = Math.hypot(end.x - center.x, end.y - center.y) * PAD_VEIN_REACH
    paintVein(ctx, center, Math.atan2(end.y - center.y, end.x - center.x), len, PAD_VEIN_W * s, PAD_VEIN_DEPTH, rng)
  }
  ctx.globalAlpha = PAD_CENTER_ALPHA
  ctx.fillStyle = pal.woodDark
  ctx.beginPath()
  ctx.arc(center.x, center.y, PAD_CENTER_R * s, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}
//
// The rim point lying in a direction from the centre.
//
function rimToward(rim, center, a) {
  const offs = rim.map(p => {
    const d = Math.atan2(p.y - center.y, p.x - center.x) - a
    return Math.abs(Math.atan2(Math.sin(d), Math.cos(d)))
  })
  return rim[offs.indexOf(Math.min(...offs))]
}
//
// One vein: a line wandering a little from a point along a heading, with
// thinner side veins sprouting from it on alternate sides that split the
// same way, until depth runs out.
//
function paintVein(ctx, from, heading, len, w, depth, rng) {
  const pts = [from]
  const headings = [heading]
  let h = heading
  for (let i = 1; i <= PAD_VEIN_STEPS; i++) {
    h += (rng() - 0.5) * PAD_VEIN_WANDER
    const p = pts[i - 1]
    pts.push({ x: p.x + Math.cos(h) * len / PAD_VEIN_STEPS, y: p.y + Math.sin(h) * len / PAD_VEIN_STEPS })
    headings.push(h)
  }
  ctx.lineWidth = w
  ctx.beginPath()
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.stroke()
  if (depth <= 0) return
  const flip = rng() < 0.5 ? 1 : -1
  PAD_VEIN_BRANCH_AT.forEach((t, j) => {
    const at = Math.round(t * PAD_VEIN_STEPS)
    const side = (j % 2 === 0 ? 1 : -1) * flip
    const fork = side * (PAD_VEIN_FORK_MIN + rng() * PAD_VEIN_FORK_RANGE)
    paintVein(ctx, pts[at], headings[at] + fork, len * (1 - t) * PAD_VEIN_BRANCH_LEN, w * PAD_VEIN_THIN, depth - 1, rng)
  })
}
//
// Short moss strands with drops hanging off the leaf's lower edge (below
// its underside band), away from its sides.
//
function paintPadStrands(ctx, rim, s, rng) {
  const lower = rim.filter(p => Math.sin(p.a) > PAD_STRAND_FROM)
  for (let i = 0; i < PAD_STRANDS && lower.length; i++) {
    const p = lower[Math.floor(rng() * lower.length)]
    paintMossStrand(ctx, p.x, p.y + PAD_THICK * s, (PAD_STRAND_MIN + rng() * PAD_STRAND_RANGE) * s, rng)
  }
}
//
// The knob a stem ends in on the leaf.
//
function bakeKnob(s, pal) {
  const r = (PAD_KNOB_R + 1) * s
  const canvas = newCanvas(r * 2 + 2, r * 2 + 2)
  paintStemKnob(canvas.getContext('2d'), canvas.width / 2, canvas.height / 2, s, pal)
  return canvas
}
//
// Where a stem holds the leaf: a round knob of the stem's wood.
//
function paintStemKnob(ctx, x, y, s, pal) {
  ctx.fillStyle = pal.contour
  ctx.beginPath()
  ctx.arc(x, y, (PAD_KNOB_R + 1) * s, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = pal.vine
  ctx.beginPath()
  ctx.arc(x, y, PAD_KNOB_R * s, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = pal.vineLight
  const glint = PAD_KNOB_R * s * VINE_NAIL_GLINT
  ctx.beginPath()
  ctx.arc(x - glint, y - glint, glint, 0, Math.PI * 2)
  ctx.fill()
}
//
// The question painted over the board, with a dark shadow.
//
function paintQuestion(ctx, lines, lineH, pad, w, s, pal) {
  ctx.font = `${Math.round(QUESTION_SIZE * s)}px ${CFG.visual.fonts.regularFull}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  lines.forEach((line, i) => {
    const y = pad + (BOARD_PAD_TOP + i * (lineH + QUESTION_LINE_GAP)) * s
    ctx.fillStyle = pal.textShadow
    ctx.fillText(line, pad + w / 2 + QUESTION_SHADOW * s, y + QUESTION_SHADOW * s)
    ctx.fillStyle = pal.text
    ctx.fillText(line, pad + w / 2, y)
  })
}
function closedPath(pts) {
  const path = new Path2D()
  pts.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)))
  path.closePath()
  return path
}
//
// Wavy grain lines, plank seams, a few knot rings, the lit top strip and the
// shaded bottom strip (all low-alpha steps of the wood tones).
//
function paintWoodGrain(ctx, x, y, w, h, s, rng, pal) {
  ctx.strokeStyle = pal.woodDark
  ctx.globalAlpha = BOARD_GRAIN_ALPHA
  ctx.lineWidth = BOARD_GRAIN_W * s
  for (let i = 0; i < BOARD_GRAIN_LINES; i++) {
    const gy = y + (i + rng()) / BOARD_GRAIN_LINES * h
    const phase = rng() * Math.PI * 2
    const freq = BOARD_GRAIN_FREQ_MIN + rng() * BOARD_GRAIN_FREQ_RANGE
    ctx.beginPath()
    for (let gx = 0; gx <= w; gx += BOARD_GRAIN_STEP * s) {
      const wy = gy + Math.sin(gx / w * Math.PI * freq + phase) * BOARD_GRAIN_WAVE * s
      gx === 0 ? ctx.moveTo(x + gx, wy) : ctx.lineTo(x + gx, wy)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = BOARD_SEAM_ALPHA
  ctx.lineWidth = BOARD_SEAM_W * s
  BOARD_SEAM_FRACS.forEach(f => {
    ctx.beginPath()
    ctx.moveTo(x, y + h * f)
    ctx.lineTo(x + w, y + h * f)
    ctx.stroke()
  })
  ctx.globalAlpha = BOARD_KNOT_ALPHA
  for (let i = 0; i < BOARD_KNOTS; i++) {
    ctx.beginPath()
    ctx.ellipse(x + (BOARD_KNOT_MARGIN + rng() * (1 - BOARD_KNOT_MARGIN * 2)) * w, y + (BOARD_KNOT_MARGIN + rng() * (1 - BOARD_KNOT_MARGIN * 2)) * h, BOARD_KNOT_RX * s, BOARD_KNOT_RY * s, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = BOARD_LIT_ALPHA
  ctx.fillStyle = pal.woodLight
  ctx.fillRect(x, y, w, BOARD_LIT_H * s)
  ctx.globalAlpha = BOARD_SHADE_ALPHA
  ctx.fillStyle = pal.woodDark
  ctx.fillRect(x, y + h - BOARD_SHADE_H * s, w, BOARD_SHADE_H * s)
  ctx.globalAlpha = 1
}
function paintNail(ctx, x, y, s, pal) {
  ctx.fillStyle = pal.contour
  ctx.beginPath()
  ctx.arc(x, y, VINE_NAIL_R * s, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = pal.woodLight
  ctx.beginPath()
  const glint = VINE_NAIL_R * s * VINE_NAIL_GLINT
  ctx.arc(x - glint, y - glint, glint, 0, Math.PI * 2)
  ctx.fill()
}
//
// One answer tag: a small ragged plank (a small pad leaf in the cave look),
// dark — or in the selected colour, with a sprout of two leaves on its
// corner — and its painted label.
//
function bakeTag(label, s, selected, cave, pal) {
  const pad = BAKE_PAD * s
  const w = TAG_W * s
  const h = TAG_H * s
  const canvas = newCanvas(w + pad * 2, h + pad * 2)
  const ctx = canvas.getContext('2d')
  const rng = createSeededRandom(GRAIN_SEED + label.length)
  const rim = cave ? padRim(pad + w / 2, pad + h / 2, w / 2, h / 2, TAG_PAD_LOBES, TAG_PAD_LOBE_AMP, rng) : null
  const outline = cave ? closedPath(rim) : raggedRectPath(pad, pad, w, h, BOARD_CHAMFER * s * TAG_CHAMFER_SCALE, BOARD_EDGE_STEP * s * TAG_EDGE_STEP_SCALE, TAG_JITTER * s, rng)
  if (cave) {
    ctx.fillStyle = pal.contour
    ctx.fill(closedPath(rim.map(p => ({ x: p.x, y: p.y + TAG_PAD_THICK * s }))))
  }
  ctx.fillStyle = selected ? pal.tagSelected : pal.tag
  ctx.fill(outline)
  ctx.save()
  ctx.clip(outline)
  ctx.globalAlpha = BOARD_LIT_ALPHA
  ctx.fillStyle = pal.woodLight
  ctx.fillRect(pad, pad, w, BOARD_LIT_H * s * TAG_LIT_SCALE)
  ctx.restore()
  ctx.strokeStyle = pal.contour
  ctx.lineWidth = TAG_CONTOUR * s
  ctx.lineJoin = 'round'
  ctx.stroke(outline)
  if (selected) {
    TAG_SPROUT_ANGLES.forEach((angle, i) => paintLeaf(ctx, pad + TAG_SPROUT_X * s, pad + TAG_SPROUT_Y * s, angle,
      TAG_SPROUT_LEAF * s * (i === 0 ? 1 : TAG_SPROUT_SECOND_SCALE), pal.leaf[i + 1], s, pal))
  }
  ctx.font = `${Math.round(TAG_TEXT_SIZE * s)}px ${CFG.visual.fonts.regularFull}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = selected ? pal.tagSelectedText : pal.text
  ctx.fillText(label, pad + w / 2, pad + h / 2)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED + label.length + (selected ? 1 : 0))
  return canvas
}
//
// Two crossed twigs with a dark contour and a small side nub each.
//
function bakeClose(s, hovered, pal) {
  const size = CLOSE_SIZE * s
  const pad = BAKE_PAD * s
  const canvas = newCanvas(size + pad * 2, size + pad * 2)
  const ctx = canvas.getContext('2d')
  const c = pad + size / 2
  const arm = size * CLOSE_ARM
  const twigs = [
    [c - arm, c - arm, c + arm, c + arm],
    [c + arm, c - arm, c - arm, c + arm]
  ]
  ctx.lineCap = 'round'
  const stroke = (color, width) => {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    twigs.forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      const nx = x1 + (x2 - x1) * CLOSE_NUB_AT
      const ny = y1 + (y2 - y1) * CLOSE_NUB_AT
      ctx.moveTo(nx, ny)
      ctx.lineTo(nx + arm * CLOSE_NUB_X, ny - arm * CLOSE_NUB_Y)
      ctx.stroke()
    })
  }
  stroke(pal.contour, (CLOSE_TWIG_W + CLOSE_CONTOUR * 2) * s)
  stroke(hovered ? pal.twigHover : pal.twig, CLOSE_TWIG_W * s)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED + (hovered ? 2 : 3))
  return canvas
}
//
// One leaf sprite, pointing right from its stem at the left edge.
//
function bakeLeaf(s, fill, pal) {
  const len = LEAF_LEN * s
  const pad = BAKE_PAD * s * LEAF_BAKE_PAD
  const canvas = newCanvas(len + pad * 2, len * LEAF_W * 2 + pad * 2)
  const ctx = canvas.getContext('2d')
  paintLeaf(ctx, pad, canvas.height / 2, 0, len, fill, s, pal)
  return canvas
}
//
// Teardrop leaf from (x, y) along `angle`, with a dark contour and midrib.
//
function paintLeaf(ctx, x, y, angle, len, fill, s, pal) {
  const half = len * LEAF_W
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(len * LEAF_BULGE_AT, -half, len, 0)
  ctx.quadraticCurveTo(len * LEAF_BULGE_AT, half, 0, 0)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = pal.contour
  ctx.lineWidth = LEAF_CONTOUR * s
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(len * LEAF_RIB_FROM, 0)
  ctx.lineTo(len * LEAF_RIB_TO, 0)
  ctx.stroke()
  ctx.restore()
}
//
// Soft radial veil: light in the middle, dark toward the edges.
//
function bakeVignette(width, height, pal) {
  const w = Math.max(1, Math.round(width * VIGNETTE_SCALE))
  const h = Math.max(1, Math.round(height * VIGNETTE_SCALE))
  const canvas = newCanvas(w, h)
  const ctx = canvas.getContext('2d')
  const radius = Math.hypot(w, h) / 2
  const gradient = ctx.createRadialGradient(w / 2, h / 2, radius * VIGNETTE_INNER, w / 2, h / 2, radius)
  const [r, g, b] = parseHex(pal.backdrop)
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${VIGNETTE_CENTER_ALPHA})`)
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${VIGNETTE_EDGE_ALPHA})`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
  return canvas
}
//
// Rectangle outline with chamfered corners and jittered edge vertices, so
// the plank reads hand-cut rather than drawn with a ruler.
//
function raggedRectPath(x, y, w, h, chamfer, step, jitter, rng) {
  const corners = [
    [x + chamfer, y], [x + w - chamfer, y], [x + w, y + chamfer], [x + w, y + h - chamfer],
    [x + w - chamfer, y + h], [x + chamfer, y + h], [x, y + h - chamfer], [x, y + chamfer]
  ]
  const path = new Path2D()
  corners.forEach(([ax, ay], i) => {
    const [bx, by] = corners[(i + 1) % corners.length]
    const segs = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step))
    for (let j = 0; j < segs; j++) {
      const t = j / segs
      const jx = j === 0 ? 0 : (rng() - 0.5) * 2 * jitter
      const jy = j === 0 ? 0 : (rng() - 0.5) * 2 * jitter
      const px = ax + (bx - ax) * t + jx
      const py = ay + (by - ay) * t + jy
      i === 0 && j === 0 ? path.moveTo(px, py) : path.lineTo(px, py)
    }
  })
  path.closePath()
  return path
}
function newCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width)
  canvas.height = Math.ceil(height)
  return canvas
}
