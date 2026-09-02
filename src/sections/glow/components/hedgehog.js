import { CFG } from '../../../cfg.js'
import { getRGB, toCanvas } from '../../../utils/helper.js'
import { GLOW_PAL } from '../utils/glow-palette.js'

//
// Pixel-art hedgehog colours. Kept local to this component (not routed
// through the level's flat/gray/lit/colour palette phases directly) but
// mirrored into a matching gray pair so the creature can fade to the same
// single-tone gray as the rest of the world in flat/monochrome mode and
// back to full colour once the world turns colourful — exactly like the
// tree/mushroom decor elsewhere in this level.
//
const MANE_HEX = '#3a2a22'
const MANE_GRAY_HEX = GLOW_PAL.decorGray
const FACE_HEX = '#d9a876'
const FACE_GRAY_HEX = GLOW_PAL.lightGray
const EYE_HEX = '#1a1210'
//
// Black silhouette rim, same convention as every other character in the
// game (CFG.visual.colors.outline) — drawn as a slightly larger copy of
// each shape behind its fill, the same "bigger shape behind" trick used
// elsewhere in this level (see the arrowhead / rock outline drawing).
//
const OUTLINE_PAD = 1.6
//
// Rounded mane (the round, quill-covered back/head silhouette). The dome
// itself is a plain ellipse — the roundness the hero-style rim needs —
// while the spikes are a separate jagged layer fanned across its top arc.
//
const MANE_CX = -3
const MANE_CY = -12
const MANE_RX = 16
const MANE_RY = 12
//
// Spikes fan almost all the way around the dome — from low on the back,
// up over the crown, to just short of the face — so only the front/snout
// side of the silhouette stays smooth. Length tapers to zero at both arc
// ends (sin bell curve) so the low back spikes shrink away naturally
// instead of poking down past the ground line.
//
const SPIKE_COUNT = 13
const SPIKE_ARC_START = 100
const SPIKE_ARC_END = 345
const SPIKE_LEN = 12
const SPIKE_LEN_SHORT_FACTOR = 0.7
const SPIKE_SWAY_PHASE_STEP = 0.6
const SPIKE_SWAY_AMP_DEG = 5
//
// Rounded snout: a smooth arc for the back/top/bottom blending into the
// mane, tapering to one sharp point at the front (the reference's long
// pointed nose) instead of a boxy wedge.
//
const SNOUT_CX = 13
const SNOUT_CY = -6
const SNOUT_RX = 8
const SNOUT_RY = 6
const SNOUT_NOSE_LEN = 5
const SNOUT_ARC_STEPS = 10
const SNOUT_ARC_START = 40
const SNOUT_ARC_END = 320
//
// Eye sat high on the snout — big white ball with a dark pupil shifted
// toward the nose, like the hero's own eyes. Drawn live every frame
// (cheap — 3 small ellipses) on top of the baked body so it can track the
// hero; the body itself never needs a live redraw.
//
const EYE_WHITE_HEX = '#ffffff'
const EYE_CX = 16
const EYE_CY = -8
const EYE_WHITE_R = 3.6
const PUPIL_R = 1.9
const PUPIL_OFFSET_X = 0.9
const PUPIL_OFFSET_Y = 0.3
const EYE_PUPIL_TRAVEL = EYE_WHITE_R - PUPIL_R - 0.4
//
// Small closed-mouth line on the underside of the snout, just behind the
// nose tip.
//
const MOUTH_P1 = [15, -2]
const MOUTH_CTRL = [18.7, -0.5]
const MOUTH_P2 = [24.8, -4.9]
const MOUTH_WIDTH = 0.9
//
// Stub legs peeking out from under the body. Drawn live (cheap — a
// handful of ellipses) rather than baked, so they can lift and alternate
// while walking and stay planted while idle/turning.
//
const LEGS = [
  { x: -9, y: 1 },
  { x: 5, y: 1 }
]
const LEG_RX = 2.2
const LEG_RY = 1.8
const LEG_STEP_LIFT = 1.6
const LEG_STEP_FORWARD = 2.4
const LEG_STEP_SPEED = 7
//
// The idle body (mane, spikes, snout, mouth — everything except the eye
// and legs) is baked once into a short looping sequence of PNG sprites,
// in a gray and a colour variant, instead of being redrawn with canvas
// polygon/ellipse calls every frame. Baking happens in a canonical
// unit-scale, facing-right local space; at draw time a single
// k.drawSprite() blit (plus GPU scale + flipX) reproduces any size/
// direction/gray-colour blend for near-zero per-frame cost. Baked at a
// pixel density that matches the final on-screen size (pixelRatio tied to
// the instance's scale) so the crisp/nearest-neighbour renderer never has
// to stretch a low-res bitmap into a blocky enlargement.
//
const IDLE_FRAME_COUNT = 28
const IDLE_LOOP_DURATION = 3.2
const BODY_SPRITE_PREFIX = 'glow0-hedgehog-body-'
const CURLED_SPRITE_NAME = 'glow0-hedgehog-curled'
const GRAY_SUFFIX = '-gray'
const COLOR_SUFFIX = '-color'
const BAKE_HALF_W = 40
const BAKE_Y_MIN = -40
const BAKE_Y_MAX = 14
const BAKE_W = BAKE_HALF_W * 2
const BAKE_H = BAKE_Y_MAX - BAKE_Y_MIN
const BAKE_CENTER_Y = (BAKE_Y_MIN + BAKE_Y_MAX) / 2
const BAKE_PIXEL_RATIO_FACTOR = 2
//
// Idle breathing bob (torso rises/falls, feet stay planted) plus a gentle
// per-spike sway so the quills visibly ripple whenever the body "moves".
// Both complete exactly one slow cycle across the whole baked loop so it
// wraps seamlessly with no pop.
//
const BREATH_AMP = 0.5
//
// Curled defensive ball — a round spiky sphere the hedgehog tucks into
// mid-turn instead of flattening: the snout/eye/legs hide inside it and
// the facing flips while it's fully curled, so reappearing on the other
// side reads as a natural "uncurl", not a paper-thin flip.
//
const CURL_CX = -3
const CURL_CY = -13
const CURL_R = 13
const CURL_SPIKE_COUNT = 16
const CURL_SPIKE_LEN = 8
const CURL_SPIKE_LEN_SHORT_FACTOR = 0.75
const CURL_SCALE = 0.62
//
// Random idle/walk wander — the hedgehog paces a short leash around its
// spawn spot, occasionally turning around mid-walk by curling into a ball.
// Walk segments are long and random; most of the time it keeps going in the
// same direction without stopping. Turning is much rarer than walking — at
// least a 5:1 ratio by time spent moving vs. turning around.
//
const WANDER_IDLE_MIN = 0.4
const WANDER_IDLE_MAX = 1.4
const WANDER_WALK_MIN = 4.5
const WANDER_WALK_MAX = 11
const WANDER_WALK_SPEED = 14
const WANDER_CONTINUE_WALK_CHANCE = 5 / 6
const WANDER_REVERSE_CHANCE = 1 / 6
const WANDER_TURN_DURATION = 0.5
const WANDER_TURN_OUT_FRAC = 0.3
const WANDER_TURN_IN_FRAC = 0.3
const WANDER_BOUND_MARGIN = 6
const WANDER_LEASH = 90
//
// Eye gaze — looks straight at the hero whenever he's within range and on
// the side the face already points toward; otherwise drifts to a random
// forward-and-down point (re-picked every couple of seconds) like it's
// sniffing the ground. Always eased toward its target for a smooth,
// slightly lagging, organic motion instead of snapping.
//
const GAZE_MAX_HERO_DIST = 260
const GAZE_LERP_SPEED = 6
const GAZE_WANDER_INTERVAL_MIN = 1.2
const GAZE_WANDER_INTERVAL_MAX = 2.6
//
// Touch-death hitbox — a plain AABB roughly matching the mane/snout/leg
// silhouette, scaled by the instance's own scale. Sized to the spike crown's
// actual reach (mane radius + spike length) rather than just the body core,
// so it reads as touching the hedgehog itself and not some smaller box
// floating inside it — but pulled back in from the full spike-tip reach so
// a hero jump can still clear it.
//
const TOUCH_HALF_W = 25
const TOUCH_HALF_H_TOP = 28
const TOUCH_HALF_H_BOTTOM = 7
//
// Falling off a platform after an ambush death — simple gravity drop until
// the target ground line, then the normal wander state machine resumes.
// If an edge X is given, the hedgehog first walks there (so it steps off
// the platform's end instead of sinking through its middle) before the
// actual drop begins.
//
const FALL_GRAVITY = 900
const FALL_EDGE_SNAP = 1

/**
 * Creates a small idle pixel-art hedgehog sitting on the ground, breathing
 * in place with rippling quills, wandering a short leash and eyeing the
 * hero when he passes in front of its face. Fades to the same single-tone
 * gray as the rest of the world while the level is in flat/monochrome
 * mode, and to full colour once the world turns colourful. Fatal to the
 * touch — the scene checks isTouchingHero() and handles the kill itself.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.x - Ground X (world space) — also the wander leash centre
 * @param {number} cfg.y - Ground Y — the line his feet rest on
 * @param {number} [cfg.scale=2] - Pixel-art scale factor
 * @param {'left'|'right'} [cfg.facing='right'] - Initial facing direction
 * @param {number} [cfg.z] - Draw z-index (defaults just behind the hero)
 * @param {Object} [cfg.hero] - Hero inst — read each frame so the eyes can track him
 * @param {Object} [cfg.zones] - Level zones — read each frame for the gray/colour fade
 * @param {number} [cfg.minX] - Left wander bound (world space)
 * @param {number} [cfg.maxX] - Right wander bound (world space)
 * @param {boolean} [cfg.hiddenUntilPopOut=false] - Stay invisible and
 *   inactive until popOut() is called (ambush hedgehogs)
 * @returns {Object} Hedgehog inst
 */
export function create(cfg) {
  const { k, x, y, scale = 2, facing = 'right', z = CFG.visual.zIndex.player - 1, hero = null, zones = null, hiddenUntilPopOut = false } = cfg
  const minX = cfg.minX ?? x - WANDER_LEASH
  const maxX = cfg.maxX ?? x + WANDER_LEASH
  const inst = {
    k,
    x,
    y,
    scale,
    facing,
    hero,
    zones,
    minX,
    maxX,
    idleTime: 0,
    legPhase: 0,
    wanderState: 'idle',
    wanderTimer: randRange(WANDER_IDLE_MIN, WANDER_IDLE_MAX),
    turnScale: 1,
    pupilX: PUPIL_OFFSET_X,
    pupilY: PUPIL_OFFSET_Y,
    gazeWanderTimer: 0,
    gazeWanderX: PUPIL_OFFSET_X,
    gazeWanderY: PUPIL_OFFSET_Y,
    popped: !hiddenUntilPopOut,
    falling: false,
    walkingToEdge: false,
    fallVelY: 0,
    fallTargetY: y,
    fallEdgeX: null,
    bodyFrameNames: bakeHedgehogSprites(k, scale)
  }
  inst.obj = k.add([
    k.z(z),
    { draw() { drawHedgehog(inst) } }
  ])
  inst.obj.onUpdate(() => onUpdate(inst))
  return inst
}
//
// True while the hero's feet overlap the hedgehog's rough silhouette box —
// the touch-death hitbox. False while hidden, falling, or fully curled
// (snout/legs tucked away, no exposed danger zone to hit).
//
export function isTouchingHero(inst, heroX, heroFootY) {
  if (!inst?.popped || inst.falling || inst.walkingToEdge) return false
  if (inst.wanderState === 'turn' && inst.turnPhase === 'curled') return false
  const s = inst.scale * inst.turnScale
  const dx = Math.abs(heroX - inst.x)
  const dy = heroFootY - inst.y
  return dx < TOUCH_HALF_W * s && dy > -TOUCH_HALF_H_TOP * s && dy < TOUCH_HALF_H_BOTTOM * s
}
//
// Reveals a hidden ambush hedgehog at (x, y), facing the given direction,
// and starts its normal idle/wander behaviour from a clean state.
//
export function popOut(inst, x, y, facing) {
  if (!inst) return
  x != null && (inst.x = x)
  y != null && (inst.y = y)
  facing && (inst.facing = facing)
  inst.popped = true
  inst.falling = false
  inst.turnScale = 1
  inst.wanderState = 'idle'
  inst.wanderTimer = randRange(WANDER_IDLE_MIN, WANDER_IDLE_MAX)
}
//
// Drops the hedgehog to groundY (simple gravity fall) then resumes normal
// wandering once it lands — used after an ambush kill, or when the
// platform it stands on disappears, so it tumbles off and crawls away
// while the death countdown runs. If edgeX is given and the hedgehog isn't
// already there, it first walks to that edge (see updateWalkToEdge) so it
// visibly steps off the platform's end instead of sinking through its
// middle.
//
export function fallAndCrawlAway(inst, groundY, edgeX) {
  if (!inst) return
  inst.fallVelY = 0
  inst.fallTargetY = groundY
  if (edgeX != null && Math.abs(edgeX - inst.x) > FALL_EDGE_SNAP) {
    inst.falling = false
    inst.walkingToEdge = true
    inst.fallEdgeX = edgeX
    inst.wanderState = 'walk'
    inst.turnScale = 1
    return
  }
  inst.walkingToEdge = false
  inst.falling = true
}
//
// Advances the animation clock and either the fall physics or the idle/
// walk/turn wander state machine + eye gaze target, every tick. Inactive
// (not yet popped out) hedgehogs skip everything, including drawing.
//
function onUpdate(inst) {
  if (!inst.popped) return
  const scene = inst.zones?._sceneRef
  const frozen = !scene?.zones?.oZone && !scene?.zones?.oCollected &&
    (scene?.meditation?.countdown == null || (scene?.meditationWorldLife ?? 0) < 0.02)
  const dt = inst.k.dt()
  //
  // Stillness freezes wander/gaze, but a platform vanishing mid-ambush must
  // keep gravity + walk-to-edge so the hedgehog tumbles off the L-log. The
  // body stays put, but the eyes still track the hero directly while he's
  // the only thing moving in a fully static world — the old distance/facing
  // -gated gaze (updateGaze) resumes the instant it starts wandering again.
  //
  if (frozen && !inst.falling && !inst.walkingToEdge) {
    updateFrozenGaze(inst, dt)
    return
  }
  inst.idleTime += dt
  if (inst.walkingToEdge) {
    updateWalkToEdge(inst, dt)
    return
  }
  if (inst.falling) {
    updateFall(inst, dt)
    return
  }
  updateWander(inst, dt)
  updateGaze(inst, dt)
}
//
// Pre-fall phase: walks toward the platform edge in the facing direction
// before the actual drop starts (see fallAndCrawlAway).
//
function updateWalkToEdge(inst, dt) {
  const dir = inst.fallEdgeX >= inst.x ? 1 : -1
  inst.facing = dir === 1 ? 'right' : 'left'
  inst.legPhase += dt * LEG_STEP_SPEED
  const nextX = inst.x + dir * WANDER_WALK_SPEED * dt
  if ((dir === 1 && nextX >= inst.fallEdgeX) || (dir === -1 && nextX <= inst.fallEdgeX)) {
    inst.x = inst.fallEdgeX
    inst.walkingToEdge = false
    inst.falling = true
    return
  }
  inst.x = nextX
}
//
// Simple gravity drop until the target ground line, then hands back to the
// normal wander state machine (starting idle).
//
function updateFall(inst, dt) {
  inst.fallVelY += FALL_GRAVITY * dt
  inst.y += inst.fallVelY * dt
  if (inst.y < inst.fallTargetY) return
  inst.y = inst.fallTargetY
  inst.falling = false
  inst.fallVelY = 0
  inst.wanderState = 'idle'
  inst.wanderTimer = randRange(WANDER_IDLE_MIN, WANDER_IDLE_MAX)
}
//
// Draws the hedgehog: one baked-sprite blit (gray, or gray + colour on top
// while the world is between gray and colourful) for the whole body while
// idle/walking, or the curled-ball sprite while mid-turn, plus the live
// eye and legs on top. Inactive (not yet popped out) hedgehogs draw nothing.
//
function drawHedgehog(inst) {
  if (!inst.popped) return
  const k = inst.k
  const dir = inst.facing === 'left' ? -1 : 1
  const fade = colorFadeOf(inst)
  if (inst.wanderState === 'turn' && inst.turnPhase === 'curled') {
    drawBakedSprite(inst, CURLED_SPRITE_NAME, dir, CURL_SCALE, fade)
    return
  }
  const frameIdx = currentIdleFrameIndex(inst)
  drawBakedSprite(inst, BODY_SPRITE_PREFIX + frameIdx, dir, inst.turnScale, fade)
  drawEye(inst, frameIdx, dir, fade)
  drawLegs(inst, dir, fade)
}
//
// Blits the gray variant of a baked sprite, then the colour variant on top
// with opacity = fade — a plain alpha crossfade between the two baked
// palettes, the same technique the level's parallax layers use.
//
function drawBakedSprite(inst, baseName, dir, scale, fade) {
  const k = inst.k
  const pos = k.vec2(inst.x, inst.y + BAKE_CENTER_Y * inst.scale)
  const width = BAKE_W * inst.scale * scale
  const height = BAKE_H * inst.scale * scale
  fade < 0.98 && k.drawSprite({ sprite: baseName + GRAY_SUFFIX, pos, anchor: 'center', width, height, flipX: dir === -1 })
  fade > 0.02 && k.drawSprite({ sprite: baseName + COLOR_SUFFIX, pos, anchor: 'center', width, height, flipX: dir === -1, opacity: fade })
}
//
// Current gray→colour fade for the level (0 = fully gray, 1 = fully
// colourful), matching the convention the rest of the level's decor uses.
//
function colorFadeOf(inst) {
  return inst.zones?._sceneRef?.colorFade ?? (inst.zones?.colorWorld ? 1 : 0)
}
//
// Live eye overlay — white sclera + dark pupil, offset by the current gaze
// target and glued to the snout's baked breathing bob for this exact
// frame. Hidden while curled up (tucked away, out of sight).
//
function drawEye(inst, frameIdx, dir, fade) {
  const k = inst.k
  const outline = getRGB(k, CFG.visual.colors.outline)
  const eyeWhite = getRGB(k, EYE_WHITE_HEX)
  const pupil = getRGB(k, EYE_HEX)
  const eyeAlpha = inst.turnScale
  if (eyeAlpha <= 0.02) return
  const breathe = Math.sin(frameIdx / IDLE_FRAME_COUNT * 2 * Math.PI) * BREATH_AMP
  const eyeCy = EYE_CY + breathe
  const s = inst.scale * inst.turnScale
  const toWorld = (localX, localY) => k.vec2(inst.x + dir * s * localX, inst.y + s * localY)
  k.drawEllipse({ pos: toWorld(EYE_CX, eyeCy), radiusX: (EYE_WHITE_R + OUTLINE_PAD * 0.5) * s, radiusY: (EYE_WHITE_R + OUTLINE_PAD * 0.5) * s, color: outline, opacity: eyeAlpha })
  k.drawEllipse({ pos: toWorld(EYE_CX, eyeCy), radiusX: EYE_WHITE_R * s, radiusY: EYE_WHITE_R * s, color: eyeWhite, opacity: eyeAlpha })
  k.drawEllipse({ pos: toWorld(EYE_CX + inst.pupilX, eyeCy + inst.pupilY), radiusX: PUPIL_R * s, radiusY: PUPIL_R * s, color: pupil, opacity: eyeAlpha })
  void fade
}
//
// Live stub legs — planted while idle, alternating a small step-lift while
// walking. Hidden while curled up.
//
function drawLegs(inst, dir, fade) {
  const k = inst.k
  const outline = getRGB(k, CFG.visual.colors.outline)
  const faceGray = getRGB(k, FACE_GRAY_HEX)
  const faceColor = getRGB(k, FACE_HEX)
  const legAlpha = inst.turnScale
  if (legAlpha <= 0.02) return
  const s = inst.scale * inst.turnScale
  LEGS.forEach((leg, i) => {
    //
    // Walking gait: each leg traces a small forward-up-back-down loop —
    // swing phase (sin > 0) lifts it while swinging forward, stance phase
    // (sin < 0) keeps it planted while it slides back under the body.
    //
    const theta = inst.legPhase + i * Math.PI
    const swing = inst.wanderState === 'walk' ? Math.sin(theta) : 0
    const lift = Math.max(0, swing) * LEG_STEP_LIFT
    const forward = swing * LEG_STEP_FORWARD
    const pos = k.vec2(inst.x + dir * s * (leg.x + forward), inst.y + s * (leg.y - lift))
    k.drawEllipse({ pos, radiusX: (LEG_RX + OUTLINE_PAD) * s, radiusY: (LEG_RY + OUTLINE_PAD) * s, color: outline, opacity: legAlpha })
    k.drawEllipse({ pos, radiusX: LEG_RX * s, radiusY: LEG_RY * s, color: faceGray, opacity: legAlpha })
    fade > 0.02 && k.drawEllipse({ pos, radiusX: LEG_RX * s, radiusY: LEG_RY * s, color: faceColor, opacity: legAlpha * fade })
  })
}
//
// Maps the animation clock to a discrete baked idle frame index — exactly
// one breathing+sway cycle across the whole IDLE_FRAME_COUNT loop, at a
// slow, calm real-time pace (IDLE_LOOP_DURATION seconds per full cycle).
//
function currentIdleFrameIndex(inst) {
  const phase = (inst.idleTime / IDLE_LOOP_DURATION) % 1
  return Math.floor(phase * IDLE_FRAME_COUNT) % IDLE_FRAME_COUNT
}
//
// Idle / walk / turn wander state machine — paces a short leash around the
// spawn spot, occasionally curling into a ball to reverse direction.
//
function updateWander(inst, dt) {
  if (inst.wanderState === 'turn') {
    updateWanderTurn(inst, dt)
    return
  }
  inst.turnScale = 1
  inst.wanderTimer -= dt
  if (inst.wanderState === 'walk') {
    inst.legPhase += dt * LEG_STEP_SPEED
    updateWanderWalk(inst, dt)
    return
  }
  updateWanderIdle(inst)
}
//
// Advances the curl-out / curled-hold / curl-in turn animation.
//
function updateWanderTurn(inst, dt) {
  inst.turnProgress += dt / WANDER_TURN_DURATION
  const holdStart = WANDER_TURN_OUT_FRAC
  const holdEnd = 1 - WANDER_TURN_IN_FRAC
  if (inst.turnProgress >= (holdStart + holdEnd) / 2 && !inst.turnFlipped) {
    inst.facing = inst.turnPendingDir
    inst.turnFlipped = true
  }
  if (inst.turnProgress >= 1) {
    inst.wanderState = 'walk'
    inst.wanderTimer = randRange(WANDER_WALK_MIN, WANDER_WALK_MAX)
    inst.turnScale = 1
    inst.turnPhase = 'body'
    return
  }
  if (inst.turnProgress < holdStart) {
    inst.turnPhase = 'body'
    inst.turnScale = 1 - (inst.turnProgress / holdStart) * (1 - CURL_SCALE)
  } else if (inst.turnProgress < holdEnd) {
    inst.turnPhase = 'curled'
    inst.turnScale = CURL_SCALE
  } else {
    inst.turnPhase = 'body'
    inst.turnScale = CURL_SCALE + ((inst.turnProgress - holdEnd) / WANDER_TURN_IN_FRAC) * (1 - CURL_SCALE)
  }
}
//
// Steps the walk, turning around early (instead of just stopping) if the
// leash boundary is about to be crossed.
//
function updateWanderWalk(inst, dt) {
  const dir = inst.facing === 'left' ? -1 : 1
  const nextX = inst.x + dir * WANDER_WALK_SPEED * dt
  if (dir === -1 && nextX <= inst.minX + WANDER_BOUND_MARGIN) {
    startWanderTurn(inst, 'right')
    return
  }
  if (dir === 1 && nextX >= inst.maxX - WANDER_BOUND_MARGIN) {
    startWanderTurn(inst, 'left')
    return
  }
  inst.x = nextX
  if (inst.wanderTimer > 0) return
  //
  // Most walk segments just roll into another random-length stroll in the
  // same direction — only occasionally pause (idle) and consider turning.
  // That keeps the walk:turn time ratio well above 5:1.
  //
  if (Math.random() < WANDER_CONTINUE_WALK_CHANCE) {
    inst.wanderTimer = randRange(WANDER_WALK_MIN, WANDER_WALK_MAX)
    return
  }
  inst.wanderState = 'idle'
  inst.wanderTimer = randRange(WANDER_IDLE_MIN, WANDER_IDLE_MAX)
}
//
// While idle, waits out the timer then either resumes walking the same way
// or turns around and walks the other way. Turning is deliberately rare
// (1/6 chance) so pacing dominates over flip-flopping.
//
function updateWanderIdle(inst) {
  if (inst.wanderTimer > 0) return
  const reverse = Math.random() < WANDER_REVERSE_CHANCE
  const newDir = reverse ? (inst.facing === 'left' ? 'right' : 'left') : inst.facing
  if (newDir !== inst.facing) {
    startWanderTurn(inst, newDir)
    return
  }
  inst.wanderState = 'walk'
  inst.wanderTimer = randRange(WANDER_WALK_MIN, WANDER_WALK_MAX)
}
//
// Kicks off a turn-around: curl into a ball, flip facing while fully
// curled, uncurl facing the new direction.
//
function startWanderTurn(inst, pendingDir) {
  inst.wanderState = 'turn'
  inst.turnProgress = 0
  inst.turnPhase = 'body'
  inst.turnPendingDir = pendingDir
  inst.turnFlipped = false
}
//
// While the world is fully static (frozen, pre-meditation) the hedgehog
// stands still but its eyes keep tracking the hero directly, ignoring the
// facing-side/distance gate the normal wander gaze uses (see updateGaze) —
// looks wherever he actually is, even from behind.
//
function updateFrozenGaze(inst, dt) {
  const dir = inst.facing === 'left' ? -1 : 1
  const heroPos = inst.hero?.character?.pos
  let targetX = inst.pupilX
  let targetY = inst.pupilY
  if (heroPos) {
    const localDx = dir * (heroPos.x - inst.x)
    const dy = heroPos.y - inst.y
    const len = Math.hypot(localDx, dy) || 1
    targetX = (localDx / len) * EYE_PUPIL_TRAVEL
    targetY = (dy / len) * EYE_PUPIL_TRAVEL
  }
  const lerp = Math.min(1, GAZE_LERP_SPEED * dt)
  inst.pupilX += (targetX - inst.pupilX) * lerp
  inst.pupilY += (targetY - inst.pupilY) * lerp
}
//
// Eases the pupil toward the hero (if he's in front of the face and close
// enough) or toward a slowly-changing random forward-and-down point.
//
function updateGaze(inst, dt) {
  inst.gazeWanderTimer -= dt
  const dir = inst.facing === 'left' ? -1 : 1
  const heroPos = inst.hero?.character?.pos
  let heroInFront = false
  let targetX = inst.gazeWanderX
  let targetY = inst.gazeWanderY
  if (heroPos) {
    const dx = heroPos.x - inst.x
    const dy = heroPos.y - inst.y
    const dist = Math.hypot(dx, dy)
    heroInFront = dist < GAZE_MAX_HERO_DIST && dx * dir > 0
    if (heroInFront) {
      const localDx = dir * dx
      const len = Math.hypot(localDx, dy) || 1
      targetX = (localDx / len) * EYE_PUPIL_TRAVEL
      targetY = (dy / len) * EYE_PUPIL_TRAVEL
    }
  }
  if (!heroInFront) {
    if (inst.gazeWanderTimer <= 0) {
      inst.gazeWanderTimer = randRange(GAZE_WANDER_INTERVAL_MIN, GAZE_WANDER_INTERVAL_MAX)
      inst.gazeWanderX = EYE_PUPIL_TRAVEL * (0.2 + Math.random() * 0.65)
      inst.gazeWanderY = EYE_PUPIL_TRAVEL * (0.15 + Math.random() * 0.7)
    }
    targetX = inst.gazeWanderX
    targetY = inst.gazeWanderY
  }
  const lerp = Math.min(1, GAZE_LERP_SPEED * dt)
  inst.pupilX += (targetX - inst.pupilX) * lerp
  inst.pupilY += (targetY - inst.pupilY) * lerp
}
//
// Bakes the whole idle-breathing/quill-sway loop plus the curled-ball
// pose (everything except the eye and legs) into named sprites, each in a
// gray and a colour variant, facing right, at unit scale. Runs once per
// level entry — the per-frame draw cost afterward is one or two sprite
// blits. Baked at a pixel density tied to the instance's scale so the
// bitmap is never stretched into a blocky enlargement by the crisp/
// nearest-neighbour renderer.
//
function bakeHedgehogSprites(k, scale) {
  const pixelRatio = Math.max(2, Math.ceil(scale * BAKE_PIXEL_RATIO_FACTOR))
  const names = []
  for (let f = 0; f < IDLE_FRAME_COUNT; f++) {
    const name = BODY_SPRITE_PREFIX + f
    const breathe = Math.sin(f / IDLE_FRAME_COUNT * 2 * Math.PI) * BREATH_AMP
    const swayPhase = f / IDLE_FRAME_COUNT * 2 * Math.PI
    bakeVariant(k, name, pixelRatio, (ctx, maneHex, faceHex) => drawIdleBodyFrame(ctx, breathe, swayPhase, maneHex, faceHex))
    names.push(name)
  }
  bakeVariant(k, CURLED_SPRITE_NAME, pixelRatio, (ctx, maneHex) => drawCurledFrame(ctx, maneHex))
  return names
}
//
// Bakes one gray + one colour canvas for a given sprite base name, sharing
// the same drawFn (parameterised by which mane/face hex to paint with).
//
function bakeVariant(k, baseName, pixelRatio, drawFn) {
  const grayCanvas = toCanvas({ width: BAKE_W, height: BAKE_H, pixelRatio }, (ctx) => {
    ctx.translate(BAKE_HALF_W, -BAKE_Y_MIN)
    drawFn(ctx, MANE_GRAY_HEX, FACE_GRAY_HEX)
  })
  k.loadSprite(baseName + GRAY_SUFFIX, grayCanvas)
  const colorCanvas = toCanvas({ width: BAKE_W, height: BAKE_H, pixelRatio }, (ctx) => {
    ctx.translate(BAKE_HALF_W, -BAKE_Y_MIN)
    drawFn(ctx, MANE_HEX, FACE_HEX)
  })
  k.loadSprite(baseName + COLOR_SUFFIX, colorCanvas)
}
//
// Draws one baked idle body frame onto a raw 2D canvas context (already
// translated so local (0, 0) sits at the ground line, screen space).
//
function drawIdleBodyFrame(ctx, breathe, swayPhase, maneHex, faceHex) {
  const maneCy = MANE_CY + breathe
  fillEllipseCtx(ctx, MANE_CX, maneCy, MANE_RX + OUTLINE_PAD, MANE_RY + OUTLINE_PAD, CFG.visual.colors.outline)
  fillPolyCtx(ctx, buildSpikeCrownPoints(MANE_CX, maneCy, MANE_RX + OUTLINE_PAD, MANE_RY + OUTLINE_PAD, OUTLINE_PAD, swayPhase), CFG.visual.colors.outline)
  fillEllipseCtx(ctx, MANE_CX, maneCy, MANE_RX, MANE_RY, maneHex)
  fillPolyCtx(ctx, buildSpikeCrownPoints(MANE_CX, maneCy, MANE_RX, MANE_RY, 0, swayPhase), maneHex)
  const snoutCy = SNOUT_CY + breathe
  fillPolyCtx(ctx, buildSnoutPoints(SNOUT_CX, snoutCy, SNOUT_RX + OUTLINE_PAD, SNOUT_RY + OUTLINE_PAD, SNOUT_NOSE_LEN + OUTLINE_PAD), CFG.visual.colors.outline)
  fillPolyCtx(ctx, buildSnoutPoints(SNOUT_CX, snoutCy, SNOUT_RX, SNOUT_RY, SNOUT_NOSE_LEN), faceHex)
  strokeQuadCtx(
    ctx,
    MOUTH_P1[0], MOUTH_P1[1] + breathe,
    MOUTH_CTRL[0], MOUTH_CTRL[1] + breathe,
    MOUTH_P2[0], MOUTH_P2[1] + breathe,
    MOUTH_WIDTH, CFG.visual.colors.outline
  )
}
//
// Draws the curled-ball defensive pose onto a raw 2D canvas context — a
// round spiky sphere with no visible snout/eye/legs.
//
function drawCurledFrame(ctx, maneHex) {
  fillEllipseCtx(ctx, CURL_CX, CURL_CY, CURL_R + OUTLINE_PAD, CURL_R + OUTLINE_PAD, CFG.visual.colors.outline)
  fillPolyCtx(ctx, buildFullSpikeBallPoints(CURL_CX, CURL_CY, CURL_R + OUTLINE_PAD, OUTLINE_PAD), CFG.visual.colors.outline)
  fillEllipseCtx(ctx, CURL_CX, CURL_CY, CURL_R, CURL_R, maneHex)
  fillPolyCtx(ctx, buildFullSpikeBallPoints(CURL_CX, CURL_CY, CURL_R, 0), maneHex)
}
//
// One point on an ellipse at the given angle (degrees, 0 = +x/right,
// 90 = +y/down — standard screen-space trig).
//
function ellipsePoint(cx, cy, rx, ry, deg) {
  const rad = deg * Math.PI / 180
  return [cx + rx * Math.cos(rad), cy + ry * Math.sin(rad)]
}
//
// Builds the jagged spike-crown strip fanned across the mane's top arc:
// rim point, tip point, rim point, tip point, ... — a continuous zigzag
// whose valleys sit exactly on the mane ellipse so it reads as one
// silhouette with the round dome beneath it. Tips sway with a per-spike
// phase offset so the whole comb ripples instead of moving as one rigid
// piece. Length follows a sine taper across the arc (0 at both ends, full
// height near the middle/top) so the low spikes on the back shrink away
// instead of shooting straight down past the ground line.
//
function buildSpikeCrownPoints(cx, cy, rx, ry, pad, swayPhase) {
  const angles = []
  for (let i = 0; i <= SPIKE_COUNT; i++) {
    angles.push(SPIKE_ARC_START + (SPIKE_ARC_END - SPIKE_ARC_START) * (i / SPIKE_COUNT))
  }
  const pts = []
  for (let i = 0; i < SPIKE_COUNT; i++) {
    pts.push(ellipsePoint(cx, cy, rx, ry, angles[i]))
    const sway = Math.sin(swayPhase + i * SPIKE_SWAY_PHASE_STEP) * SPIKE_SWAY_AMP_DEG
    const mid = (angles[i] + angles[i + 1]) / 2 + sway
    const t = (mid - SPIKE_ARC_START) / (SPIKE_ARC_END - SPIKE_ARC_START)
    const taper = Math.sin(Math.PI * Math.min(1, Math.max(0, t)))
    const len = pad + SPIKE_LEN * taper * (i % 2 === 0 ? 1 : SPIKE_LEN_SHORT_FACTOR)
    pts.push(ellipsePoint(cx, cy, rx + len, ry + len, mid))
  }
  pts.push(ellipsePoint(cx, cy, rx, ry, angles[SPIKE_COUNT]))
  return pts
}
//
// Builds a full 360° ring of spikes for the curled-ball pose — same
// zigzag rim/tip construction as the crown, just wrapped all the way
// around with no taper (every spike full length).
//
function buildFullSpikeBallPoints(cx, cy, r, pad) {
  const pts = []
  for (let i = 0; i < CURL_SPIKE_COUNT; i++) {
    const a0 = (360 / CURL_SPIKE_COUNT) * i
    const a1 = (360 / CURL_SPIKE_COUNT) * (i + 1)
    pts.push(ellipsePoint(cx, cy, r, r, a0))
    const mid = (a0 + a1) / 2
    const len = pad + CURL_SPIKE_LEN * (i % 2 === 0 ? 1 : CURL_SPIKE_LEN_SHORT_FACTOR)
    pts.push(ellipsePoint(cx, cy, r + len, r + len, mid))
  }
  return pts
}
//
// Builds the tapered snout wedge: a smooth ellipse arc for the back/top/
// bottom (the part blending into the mane) closed by one sharp point at
// the front for the nose.
//
function buildSnoutPoints(cx, cy, rx, ry, noseLen) {
  const pts = []
  for (let i = 0; i <= SNOUT_ARC_STEPS; i++) {
    const deg = SNOUT_ARC_START + (SNOUT_ARC_END - SNOUT_ARC_START) * (i / SNOUT_ARC_STEPS)
    pts.push(ellipsePoint(cx, cy, rx, ry, deg))
  }
  pts.push([cx + rx + noseLen, cy])
  return pts
}
//
// Fills an ellipse directly on a raw 2D canvas context (bake pass only).
//
function fillEllipseCtx(ctx, cx, cy, rx, ry, colorHex) {
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = colorHex
  ctx.fill()
}
//
// Fills a polygon directly on a raw 2D canvas context (bake pass only).
//
function fillPolyCtx(ctx, points, colorHex) {
  ctx.beginPath()
  points.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)))
  ctx.closePath()
  ctx.fillStyle = colorHex
  ctx.fill()
}
//
// Strokes a rounded quadratic curve directly on a raw 2D canvas context
// (the smiling mouth — bake pass only).
//
function strokeQuadCtx(ctx, x1, y1, cx, cy, x2, y2, width, colorHex) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.quadraticCurveTo(cx, cy, x2, y2)
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.strokeStyle = colorHex
  ctx.stroke()
}
//
// Uniform random float in [min, max).
//
function randRange(min, max) {
  return min + Math.random() * (max - min)
}
