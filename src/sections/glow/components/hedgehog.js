import { CFG } from '../../../cfg.js'
import { getRGB, toCanvas } from '../../../utils/helper.js'
import { GLOW_PAL } from '../utils/glow-palette.js'
import { applyGlowLayerGradeToCanvas, GLOW_LAYER_GRADE } from '../utils/glow-parallax-grain.js'

//
// Pixel-art hedgehog colours. Kept local to this component (not routed
// through the level's flat/gray/lit/colour palette phases directly) but
// mirrored into a matching gray pair so the creature can fade to the same
// single-tone gray as the rest of the world in flat/monochrome mode and
// back to full colour once the world turns colourful — exactly like the
// tree/mushroom decor elsewhere in this level.
//
const MANE_HEX = GLOW_PAL.hedgehogMane
const MANE_DARK_HEX = GLOW_PAL.hedgehogManeDark
const MANE_GRAY_HEX = GLOW_PAL.decorGray
const FACE_HEX = GLOW_PAL.hedgehogFace
const FACE_GRAY_HEX = GLOW_PAL.lightGray
const CHEEK_HEX = GLOW_PAL.hedgehogCheek
const EYE_HEX = GLOW_PAL.void
//
// Light gray silhouette rim (GLOW_PAL.glowOutlineLight) — drawn as a
// slightly larger copy of each shape behind its fill, the same "bigger
// shape behind" trick used elsewhere in this level (see the arrowhead /
// rock outline drawing).
//
const OUTLINE_PAD = 1.6
//
// Rounded mane (the round, quill-covered back/head silhouette). The dome
// itself is a plain ellipse — the roundness the hero-style rim needs —
// while the spikes are a separate jagged layer fanned across its top arc.
//
const MANE_CX = -12
//
// y=0 is the ground line (feet). Body stretches back-left from the face.
// Kept a few units clear of 0 (bottom = MANE_CY + MANE_RY) so the stub legs
// below always keep a bit of visible length instead of the body's own
// silhouette sinking past the ground line.
//
const MANE_CY = -21
const MANE_RX = 24
const MANE_RY = 17
//
// Spikes fan almost all the way around the dome — from low on the back,
// up over the crown, to just short of the face — so only the front/snout
// side of the silhouette stays smooth. Length tapers to zero at both arc
// ends (sin bell curve) so the low back spikes shrink away naturally
// instead of poking down past the ground line.
//
//
// Denser and closer to uniform length (less alternating long/short) than
// before — the reference photo reads as many fine, similarly-sized quills
// rather than a few big jagged triangles.
//
const SPIKE_COUNT = 44
const SPIKE_ARC_START = 95
const SPIKE_ARC_END = 305
const SPIKE_LEN = 11
const SPIKE_LEN_SHORT_FACTOR = 0.9
const SPIKE_SWAY_PHASE_STEP = 0.6
const SPIKE_SWAY_AMP_DEG = 5
//
// Rounded snout: a smooth arc for the back/top/bottom blending into the
// mane, tapering to one sharp point at the front (the reference's long
// pointed nose) instead of a boxy wedge.
//
const FACE_PATCH_CX = 8
const FACE_PATCH_CY = -15
const FACE_PATCH_RX = 10
const FACE_PATCH_RY = 9
//
// Belly divider (facing right): from the head-circle crown, left-down-back
// to the upper rear spine, then along the mane rim to the front underside.
//
const BELLY_HEAD_TOP_ANGLE = -90
const BELLY_BACK_SPINE_ANGLE = 202
const BELLY_FRONT_TOP_ANGLE = 30
const BELLY_DIVIDER_CTRL_X_OFFSET = -16
const BELLY_DIVIDER_CTRL_Y_OFFSET = 10
const BELLY_MANE_ARC_STEP_DEG = 8
const SNOUT_CX = 15
const SNOUT_CY = -14
const SNOUT_RX = 5
const SNOUT_RY = 4
const SNOUT_NOSE_LEN = 3.5
const SNOUT_ARC_STEPS = 8
const SNOUT_ARC_START = 55
const SNOUT_ARC_END = 300
//
// Small round black nose at the snout tip — same footprint as before, just
// an oval instead of a rectangle, with a thin outline so it stays neat.
//
const NOSE_TIP_X = SNOUT_CX + SNOUT_RX + SNOUT_NOSE_LEN - 0.2
const NOSE_TIP_RX = 1.85
const NOSE_TIP_RY = 1.45
const NOSE_TIP_Y = SNOUT_CY + 0.15
const NOSE_OUTLINE_PAD = 0.35
//
// Eye sat high on the snout — big white ball with a dark pupil shifted
// toward the nose, like the hero's own eyes. Drawn live every frame
// (cheap — 3 small ellipses) on top of the baked body so it can track the
// hero; the body itself never needs a live redraw.
//
const EYE_CX = 14.5
const EYE_CY = -16.2
const EYE_R = 2.4
const PUPIL_R = 1.15
const PUPIL_OFFSET_X = 0.35
const PUPIL_OFFSET_Y = 0
const EYE_GAZE_TRAVEL = 0.75
const EYE_WHITE_HEX = GLOW_PAL.brightLight
const CHEEK_CX = 18
const CHEEK_CY = -13.5
const CHEEK_R = 1.8
const EAR_L = { x: 0, y: -27, rx: 2.6, ry: 3 }
const EAR_R = { x: 5, y: -28, rx: 2.4, ry: 2.8 }
//
// Small closed-mouth line on the underside of the snout, just behind the
// nose tip.
//
const MOUTH_P1 = [15.5, -11.5]
const MOUTH_CTRL = [17.8, -10.2]
const MOUTH_P2 = [20.5, -12.8]
const MOUTH_WIDTH = 0.75
//
// Stub legs peeking out from under the body, tall enough to actually plant
// the raised mane on the ground instead of leaving it floating or (as
// before the body was raised) nearly touching down on its own.
//
const LEG_BODY_BOTTOM_Y = MANE_CY + MANE_RY
const LEGS = [
  { x: 0, bodyY: LEG_BODY_BOTTOM_Y, hind: false },
  { x: -20, bodyY: LEG_BODY_BOTTOM_Y, hind: true }
]
const LEG_RX = 2
const LEG_RY = 2.6
const FRONT_THIGH_LEN = 4
const FRONT_SHANK_LEN = 5.5
const HIND_THIGH_LEN = 4.5
const HIND_SHANK_LEN = 5
const HIND_KNEE_BEND = 2.8
const TOE_OFFSETS = [-1.6, 0, 1.6]
const TOE_RX = 0.75
const TOE_RY = 0.55
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
const HEDGEHOG_BAKE_VERSION = 'v10'
const BODY_SPRITE_PREFIX = `glow0-hedgehog-${HEDGEHOG_BAKE_VERSION}-body-`
const CURLED_SPRITE_NAME = `glow0-hedgehog-${HEDGEHOG_BAKE_VERSION}-curled`
const GRAY_SUFFIX = '-gray'
const COLOR_SUFFIX = '-color'
const BAKE_HALF_W = 58
//
// Wide enough for the back arc (mane + spikes) and tall enough for
// ears/spikes. BAKE_Y_MAX is only a few px past 0 (ground) — just enough
// slack for the curled-ball pose's own bottom overshoot (see CURL_CY +
// CURL_R) — because anchor:'bot' places local y = BAKE_Y_MAX at inst.y on
// screen, not local y = 0; every live draw below (legs) that shares this
// coordinate space must offset by -BAKE_Y_MAX to land on the same ground
// line as the baked body instead of drifting apart from it.
//
const BAKE_Y_MIN = -62
const BAKE_Y_MAX = 4
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
const CURL_CX = -4
const CURL_CY = -12
const CURL_R = 14
const CURL_FACE_RX = 8
const CURL_FACE_RY = 7
const CURL_PAW_L = { x: -5, y: -2 }
const CURL_PAW_R = { x: 3, y: -2 }
const CURL_SPIKE_COUNT = 18
const CURL_SPIKE_LEN = 7
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
const GAZE_MAX_HERO_DIST = 480
const GAZE_LERP_SPEED = 9
const GAZE_SIDE_SLACK = 28
const GAZE_WANDER_INTERVAL_MIN = 1.2
const GAZE_WANDER_INTERVAL_MAX = 2.6
//
// Touch-death hitbox — AABB in art local space (ground at inst.x / y = 0),
// sized to mane + spikes + snout, then shrunk slightly inside that silhouette.
// Centre X is offset from inst.x because the body sits mostly behind the anchor.
//
const TOUCH_HITBOX_SHRINK = 0.76
//
// Pull the rear edge (mane / back spikes) inward so the box does not hang
// past the visible quills.
//
const TOUCH_BACK_INSET = 7
const TOUCH_LOCAL_MIN_X = MANE_CX - MANE_RX - SPIKE_LEN - OUTLINE_PAD + TOUCH_BACK_INSET
const TOUCH_LOCAL_MAX_X = NOSE_TIP_X + NOSE_TIP_RX + NOSE_OUTLINE_PAD
const TOUCH_LOCAL_TOP_Y = MANE_CY - MANE_RY - SPIKE_LEN - OUTLINE_PAD
const TOUCH_LOCAL_BOTTOM_Y = 3
const TOUCH_CENTER_LOCAL_X = (TOUCH_LOCAL_MIN_X + TOUCH_LOCAL_MAX_X) / 2
const TOUCH_HALF_W = ((TOUCH_LOCAL_MAX_X - TOUCH_LOCAL_MIN_X) / 2) * TOUCH_HITBOX_SHRINK
const TOUCH_HALF_H_TOP = (-TOUCH_LOCAL_TOP_Y) * TOUCH_HITBOX_SHRINK
const TOUCH_HALF_H_BOTTOM = TOUCH_LOCAL_BOTTOM_Y * TOUCH_HITBOX_SHRINK
//
// Temporary — wireframe of the touch AABB in world space while tuning.
//
const TOUCH_HITBOX_DEBUG = false
const TOUCH_HITBOX_DEBUG_LINE_WIDTH = 2
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
  const box = touchHitboxWorldAabb(inst)
  return heroX >= box.left && heroX <= box.right &&
    heroFootY >= box.top && heroFootY <= box.bottom
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
    TOUCH_HITBOX_DEBUG && drawTouchHitboxDebug(inst)
    return
  }
  const frameIdx = currentIdleFrameIndex(inst)
  drawBakedSprite(inst, BODY_SPRITE_PREFIX + frameIdx, dir, inst.turnScale, fade)
  drawLegs(inst, dir, fade)
  TOUCH_HITBOX_DEBUG && drawTouchHitboxDebug(inst)
}
//
// Blits the gray variant of a baked sprite, then the colour variant on top
// with opacity = fade — a plain alpha crossfade between the two baked
// palettes, the same technique the level's parallax layers use.
//
function drawBakedSprite(inst, baseName, dir, scale, fade) {
  const k = inst.k
  const pos = k.vec2(inst.x, inst.y)
  const width = BAKE_W * inst.scale * scale
  const height = BAKE_H * inst.scale * scale
  fade < 0.98 && k.drawSprite({ sprite: baseName + GRAY_SUFFIX, pos, anchor: 'bot', width, height, flipX: dir === -1 })
  fade > 0.02 && k.drawSprite({ sprite: baseName + COLOR_SUFFIX, pos, anchor: 'bot', width, height, flipX: dir === -1, opacity: fade })
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
  const sclera = getRGB(k, EYE_WHITE_HEX)
  const pupil = getRGB(k, EYE_HEX)
  const eyeAlpha = inst.turnScale
  if (eyeAlpha <= 0.02) return
  const breathe = Math.sin(frameIdx / IDLE_FRAME_COUNT * 2 * Math.PI) * BREATH_AMP
  const eyeCy = EYE_CY + breathe
  const s = inst.scale * inst.turnScale
  const toWorld = (localX, localY) => k.vec2(inst.x + dir * s * localX, inst.y + s * localY)
  const eyePos = toWorld(EYE_CX + inst.pupilX, eyeCy + inst.pupilY)
  k.drawEllipse({
    pos: eyePos,
    radiusX: EYE_R * s,
    radiusY: EYE_R * s,
    color: sclera,
    opacity: eyeAlpha
  })
  k.drawEllipse({
    pos: toWorld(EYE_CX + inst.pupilX + PUPIL_OFFSET_X, eyeCy + inst.pupilY + PUPIL_OFFSET_Y),
    radiusX: PUPIL_R * s,
    radiusY: PUPIL_R * s,
    color: pupil,
    opacity: eyeAlpha * (fade > 0.02 ? fade : 1)
  })
}
//
// Live stub legs — planted while idle, alternating a small step-lift while
// walking. Hidden while curled up.
//
function drawLegs(inst, dir, fade) {
  const k = inst.k
  const outline = getRGB(k, GLOW_PAL.glowOutlineLight)
  const maneGray = getRGB(k, MANE_GRAY_HEX)
  const maneColor = getRGB(k, MANE_HEX)
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
    const hipX = inst.x + dir * s * (leg.x + forward)
    //
    // Offset by -BAKE_Y_MAX to land on the exact same ground line the baked
    // body sprite anchors to (see the BAKE_Y_MAX comment above) — without
    // this the legs and the body silhouette drift apart vertically.
    //
    const hipY = inst.y + s * (leg.bodyY - lift - BAKE_Y_MAX)
    const groundY = inst.y - s * BAKE_Y_MAX
    drawLegHip(k, hipX, hipY, s, fade > 0.02 ? maneColor : maneGray, outline, legAlpha, fade > 0.02 ? fade : 1)
    if (leg.hind) {
      drawHindLeg(k, dir, s, hipX, hipY, groundY, outline, maneGray, maneColor, fade, legAlpha)
      return
    }
    drawFrontLeg(k, dir, s, hipX, hipY, groundY, outline, maneGray, maneColor, fade, legAlpha)
  })
}
//
// Front leg — thigh and shank down to the ground line (y = inst.y).
//
function drawFrontLeg(k, dir, s, hipX, hipY, groundY, outline, maneGray, maneColor, fade, legAlpha) {
  const footY = groundY
  const kneeX = hipX + dir * s * 1.6
  const kneeY = hipY + (footY - hipY) * 0.42
  const footX = hipX + dir * s * 2.4
  const fill = fade > 0.02 ? maneColor : maneGray
  const strokeSeg = (x1, y1, x2, y2, pad) => {
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len * pad * s
    const ny = dx / len * pad * s
    k.drawPolygon({
      pts: [
        k.vec2(x1 + nx, y1 + ny),
        k.vec2(x2 + nx, y2 + ny),
        k.vec2(x2 - nx, y2 - ny),
        k.vec2(x1 - nx, y1 - ny)
      ],
      color: outline,
      opacity: legAlpha
    })
    k.drawPolygon({
      pts: [
        k.vec2(x1 + nx * 0.55, y1 + ny * 0.55),
        k.vec2(x2 + nx * 0.55, y2 + ny * 0.55),
        k.vec2(x2 - nx * 0.55, y2 - ny * 0.55),
        k.vec2(x1 - nx * 0.55, y1 - ny * 0.55)
      ],
      color: fill,
      opacity: legAlpha * (fade > 0.02 ? fade : 1)
    })
  }
  strokeSeg(hipX, hipY, kneeX, kneeY, LEG_RX + OUTLINE_PAD)
  strokeSeg(kneeX, kneeY, footX, footY, LEG_RX)
  const toeColor = fade > 0.02 ? maneColor : maneGray
  TOE_OFFSETS.forEach((toeX) => {
    const toePos = k.vec2(footX + dir * s * toeX, footY - TOE_RY * s * 0.35)
    k.drawEllipse({ pos: toePos, radiusX: TOE_RX * s, radiusY: TOE_RY * s, color: toeColor, opacity: legAlpha * (fade > 0.02 ? fade : 1) })
  })
}
//
// Hind leg with a visible hock — thigh down, knee back, shank forward to toes.
//
function drawHindLeg(k, dir, s, anchorX, anchorY, groundY, outline, maneGray, maneColor, fade, legAlpha) {
  const thighEndX = anchorX + dir * s * 0.2
  const thighEndY = anchorY + s * (HIND_THIGH_LEN * 0.55)
  const kneeX = thighEndX - dir * s * HIND_KNEE_BEND
  const kneeY = thighEndY + s * 1.4
  const footX = kneeX + dir * s * 2.2
  const footY = groundY
  const fill = fade > 0.02 ? maneColor : maneGray
  const strokeSeg = (x1, y1, x2, y2, pad) => {
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len * pad * s
    const ny = dx / len * pad * s
    k.drawPolygon({
      pts: [
        k.vec2(x1 + nx, y1 + ny),
        k.vec2(x2 + nx, y2 + ny),
        k.vec2(x2 - nx, y2 - ny),
        k.vec2(x1 - nx, y1 - ny)
      ],
      color: outline,
      opacity: legAlpha
    })
    k.drawPolygon({
      pts: [
        k.vec2(x1 + nx * 0.55, y1 + ny * 0.55),
        k.vec2(x2 + nx * 0.55, y2 + ny * 0.55),
        k.vec2(x2 - nx * 0.55, y2 - ny * 0.55),
        k.vec2(x1 - nx * 0.55, y1 - ny * 0.55)
      ],
      color: fill,
      opacity: legAlpha * (fade > 0.02 ? fade : 1)
    })
  }
  strokeSeg(anchorX, anchorY, kneeX, kneeY, LEG_RX + OUTLINE_PAD)
  strokeSeg(kneeX, kneeY, footX, footY, LEG_RX)
  const toeColor = fade > 0.02 ? maneColor : maneGray
  TOE_OFFSETS.forEach((toeX) => {
    const toePos = k.vec2(footX + dir * s * toeX, footY - TOE_RY * s * 0.35)
    k.drawEllipse({ pos: toePos, radiusX: TOE_RX * s, radiusY: TOE_RY * s, color: toeColor, opacity: legAlpha * (fade > 0.02 ? fade : 1) })
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
    targetX = (localDx / len) * EYE_GAZE_TRAVEL
    targetY = (dy / len) * EYE_GAZE_TRAVEL
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
    heroInFront = dist < GAZE_MAX_HERO_DIST && dx * dir > -GAZE_SIDE_SLACK
    if (heroInFront) {
      const localDx = dir * dx
      const len = Math.hypot(localDx, dy) || 1
      targetX = (localDx / len) * EYE_GAZE_TRAVEL
      targetY = (dy / len) * EYE_GAZE_TRAVEL
    }
  }
  if (!heroInFront) {
    if (inst.gazeWanderTimer <= 0) {
      inst.gazeWanderTimer = randRange(GAZE_WANDER_INTERVAL_MIN, GAZE_WANDER_INTERVAL_MAX)
      inst.gazeWanderX = EYE_GAZE_TRAVEL * (0.2 + Math.random() * 0.65)
      inst.gazeWanderY = EYE_GAZE_TRAVEL * (0.15 + Math.random() * 0.7)
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
    bakeVariant(k, name, pixelRatio, (ctx, maneHex, maneDarkHex, faceHex, cheekHex) => drawIdleBodyFrame(ctx, breathe, swayPhase, maneHex, maneDarkHex, faceHex, cheekHex))
    names.push(name)
  }
  bakeVariant(k, CURLED_SPRITE_NAME, pixelRatio, (ctx, maneHex, maneDarkHex, faceHex) => drawCurledFrame(ctx, maneHex, maneDarkHex, faceHex))
  return names
}
//
// Bakes one gray + one colour canvas for a given sprite base name, sharing
// the same drawFn (parameterised by which mane/face hex to paint with).
//
function bakeVariant(k, baseName, pixelRatio, drawFn) {
  const grayCanvas = toCanvas({ width: BAKE_W, height: BAKE_H, pixelRatio }, (ctx) => {
    ctx.translate(BAKE_HALF_W, -BAKE_Y_MIN)
    drawFn(ctx, MANE_GRAY_HEX, MANE_GRAY_HEX, FACE_GRAY_HEX, FACE_GRAY_HEX)
  })
  applyGlowLayerGradeToCanvas(grayCanvas, GLOW_LAYER_GRADE.foreground, baseName.length * 17)
  k.loadSprite(baseName + GRAY_SUFFIX, grayCanvas)
  const colorCanvas = toCanvas({ width: BAKE_W, height: BAKE_H, pixelRatio }, (ctx) => {
    ctx.translate(BAKE_HALF_W, -BAKE_Y_MIN)
    drawFn(ctx, MANE_HEX, MANE_DARK_HEX, FACE_HEX, CHEEK_HEX)
  })
  applyGlowLayerGradeToCanvas(colorCanvas, GLOW_LAYER_GRADE.foreground, baseName.length * 17 + 1)
  k.loadSprite(baseName + COLOR_SUFFIX, colorCanvas)
}
//
// Draws one baked idle body frame onto a raw 2D canvas context (already
// translated so local (0, 0) sits at the ground line, screen space).
//
function drawIdleBodyFrame(ctx, breathe, swayPhase, maneHex, maneDarkHex, faceHex, cheekHex) {
  const maneCy = MANE_CY + breathe
  const faceCy = FACE_PATCH_CY + breathe
  const snoutCy = SNOUT_CY + breathe
  fillEllipseCtx(ctx, MANE_CX, maneCy, MANE_RX + OUTLINE_PAD, MANE_RY + OUTLINE_PAD, GLOW_PAL.glowOutlineLight)
  fillEllipseCtx(ctx, MANE_CX, maneCy, MANE_RX, MANE_RY, faceHex)
  drawBrownBackPatch(ctx, maneCy, faceCy, maneHex)
  drawSpikeCrown(ctx, MANE_CX, maneCy, MANE_RX + OUTLINE_PAD * 0.35, MANE_RY + OUTLINE_PAD * 0.35, OUTLINE_PAD * 0.4, swayPhase, maneDarkHex, maneHex)
  drawSpikeCrown(ctx, MANE_CX, maneCy, MANE_RX, MANE_RY, 0, swayPhase, maneHex, maneDarkHex)
  fillPolyCtx(ctx, buildSnoutPoints(SNOUT_CX, snoutCy, SNOUT_RX, SNOUT_RY, SNOUT_NOSE_LEN), faceHex)
  fillEllipseCtx(ctx, FACE_PATCH_CX, faceCy, FACE_PATCH_RX, FACE_PATCH_RY, faceHex)
  drawSnoutNoseTip(ctx, snoutCy)
  drawBakedEye(ctx, snoutCy)
  strokeQuadCtx(
    ctx,
    MOUTH_P1[0], MOUTH_P1[1] + breathe,
    MOUTH_CTRL[0], MOUTH_CTRL[1] + breathe,
    MOUTH_P2[0], MOUTH_P2[1] + breathe,
    MOUTH_WIDTH, GLOW_PAL.glowOutlineLight
  )
}
//
// Brown mane/spine above the torso divider (head crown → rear spine); the
// light belly stays as the full-ellipse underpaint drawn before this patch.
//
function drawBrownBackPatch(ctx, maneCy, faceCy, maneHex) {
  const headTop = ellipsePoint(FACE_PATCH_CX, faceCy, FACE_PATCH_RX, FACE_PATCH_RY, BELLY_HEAD_TOP_ANGLE)
  const backSpine = ellipsePoint(MANE_CX, maneCy, MANE_RX, MANE_RY, BELLY_BACK_SPINE_ANGLE)
  const ctrlX = headTop[0] + BELLY_DIVIDER_CTRL_X_OFFSET
  const ctrlY = headTop[1] + BELLY_DIVIDER_CTRL_Y_OFFSET
  const arcEndDeg = 360 + BELLY_FRONT_TOP_ANGLE
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(MANE_CX, maneCy, MANE_RX, MANE_RY, 0, 0, Math.PI * 2)
  ctx.clip()
  ctx.beginPath()
  ctx.moveTo(headTop[0], headTop[1])
  ctx.quadraticCurveTo(ctrlX, ctrlY, backSpine[0], backSpine[1])
  for (let deg = BELLY_BACK_SPINE_ANGLE; deg <= arcEndDeg; deg += BELLY_MANE_ARC_STEP_DEG) {
    const norm = deg >= 360 ? deg - 360 : deg
    const p = ellipsePoint(MANE_CX, maneCy, MANE_RX, MANE_RY, norm)
    ctx.lineTo(p[0], p[1])
  }
  ctx.lineTo(headTop[0], headTop[1])
  ctx.closePath()
  ctx.fillStyle = maneHex
  ctx.fill()
  ctx.restore()
}
//
// Rounded hip socket where each leg meets the body.
//
function drawLegHip(k, hipX, hipY, s, fill, outline, legAlpha, fillFade) {
  k.drawEllipse({
    pos: k.vec2(hipX, hipY),
    radiusX: (LEG_RX + OUTLINE_PAD * 0.35) * s,
    radiusY: (LEG_RY + OUTLINE_PAD * 0.35) * s,
    color: outline,
    opacity: legAlpha
  })
  k.drawEllipse({
    pos: k.vec2(hipX, hipY),
    radiusX: LEG_RX * s,
    radiusY: LEG_RY * s,
    color: fill,
    opacity: legAlpha * fillFade
  })
}
//
// Draws the curled-ball defensive pose onto a raw 2D canvas context — a
// round spiky sphere with no visible snout/eye/legs.
//
function drawCurledFrame(ctx, maneHex, maneDarkHex, faceHex) {
  fillEllipseCtx(ctx, CURL_CX, CURL_CY, CURL_R + OUTLINE_PAD, CURL_R + OUTLINE_PAD, GLOW_PAL.glowOutlineLight)
  drawCurlSpikeBall(ctx, CURL_CX, CURL_CY, CURL_R + OUTLINE_PAD, OUTLINE_PAD, GLOW_PAL.glowOutlineLight, GLOW_PAL.glowOutlineLight)
  fillEllipseCtx(ctx, CURL_CX, CURL_CY, CURL_R, CURL_R, maneHex)
  drawCurlSpikeBall(ctx, CURL_CX, CURL_CY, CURL_R, 0, maneHex, maneDarkHex)
  fillEllipseCtx(ctx, CURL_CX + 1, CURL_CY + 1, CURL_FACE_RX, CURL_FACE_RY, faceHex)
  fillEllipseCtx(ctx, CURL_PAW_L.x, CURL_PAW_L.y, 2.4, 2, maneDarkHex)
  fillEllipseCtx(ctx, CURL_PAW_R.x, CURL_PAW_R.y, 2.4, 2, maneDarkHex)
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
function buildArcSpikePoints(cx, cy, rx, ry, pad, swayPhase, arcStart, arcEnd, count, spikeLen) {
  const angles = []
  for (let i = 0; i <= count; i++) {
    angles.push(arcStart + (arcEnd - arcStart) * (i / count))
  }
  const spikes = []
  const span = arcEnd - arcStart || 1
  for (let i = 0; i < count; i++) {
    const baseA = angles[i]
    const nextA = angles[i + 1]
    const sway = Math.sin(swayPhase + i * SPIKE_SWAY_PHASE_STEP) * SPIKE_SWAY_AMP_DEG
    const mid = (baseA + nextA) / 2 + sway
    const t = (mid - arcStart) / span
    const taper = Math.sin(Math.PI * Math.min(1, Math.max(0, t)))
    const len = pad + spikeLen * taper * (i % 2 === 0 ? 1 : SPIKE_LEN_SHORT_FACTOR)
    spikes.push({
      baseL: ellipsePoint(cx, cy, rx, ry, baseA),
      baseR: ellipsePoint(cx, cy, rx, ry, nextA),
      tip: ellipsePoint(cx, cy, rx + len, ry + len * 0.85, mid),
      alt: i % 2 === 1
    })
  }
  return spikes
}
//
// Draws individual triangular quills across the back arc.
//
function drawSpikeCrown(ctx, cx, cy, rx, ry, pad, swayPhase, mainHex, darkHex) {
  const spikes = buildArcSpikePoints(cx, cy, rx, ry, pad, swayPhase, SPIKE_ARC_START, SPIKE_ARC_END, SPIKE_COUNT, SPIKE_LEN)
  spikes.forEach((spike) => {
    fillPolyCtx(ctx, [spike.baseL, spike.tip, spike.baseR], spike.alt ? darkHex : mainHex)
  })
}
//
// Builds a full 360° ring of spikes for the curled-ball pose — same
// zigzag rim/tip construction as the crown, just wrapped all the way
// around with no taper (every spike full length).
//
function drawCurlSpikeBall(ctx, cx, cy, r, pad, mainHex, darkHex) {
  for (let i = 0; i < CURL_SPIKE_COUNT; i++) {
    const a0 = (360 / CURL_SPIKE_COUNT) * i
    const a1 = (360 / CURL_SPIKE_COUNT) * (i + 1)
    const baseL = ellipsePoint(cx, cy, r, r, a0)
    const baseR = ellipsePoint(cx, cy, r, r, a1)
    const mid = (a0 + a1) / 2
    const len = pad + CURL_SPIKE_LEN * (i % 2 === 0 ? 1 : CURL_SPIKE_LEN_SHORT_FACTOR)
    const tip = ellipsePoint(cx, cy, r + len, r + len, mid)
    fillPolyCtx(ctx, [baseL, tip, baseR], i % 2 === 1 ? darkHex : mainHex)
  }
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
// Baked eye on the cream snout — white sclera + dark pupil (live gaze
// overlay tracks the hero on top each frame).
//
function drawBakedEye(ctx, snoutCy) {
  const eyeY = EYE_CY + (snoutCy - SNOUT_CY)
  fillEllipseCtx(ctx, EYE_CX, eyeY, EYE_R + OUTLINE_PAD * 0.2, EYE_R + OUTLINE_PAD * 0.2, GLOW_PAL.glowOutlineLight)
  fillEllipseCtx(ctx, EYE_CX, eyeY, EYE_R, EYE_R, EYE_WHITE_HEX)
  fillEllipseCtx(ctx, EYE_CX + PUPIL_OFFSET_X, eyeY + PUPIL_OFFSET_Y, PUPIL_R, PUPIL_R, EYE_HEX)
}
//
// Small round black nose at the snout tip.
//
function drawSnoutNoseTip(ctx, snoutCy) {
  const tipY = NOSE_TIP_Y + (snoutCy - SNOUT_CY)
  fillEllipseCtx(ctx, NOSE_TIP_X, tipY, NOSE_TIP_RX + NOSE_OUTLINE_PAD, NOSE_TIP_RY + NOSE_OUTLINE_PAD, GLOW_PAL.glowOutlineLight)
  fillEllipseCtx(ctx, NOSE_TIP_X, tipY, NOSE_TIP_RX, NOSE_TIP_RY, EYE_HEX)
}
//
// Small rounded ear poking out from the quill dome.
//
function drawEar(ctx, ear, maneCy, maneHex) {
  const cy = ear.y + (maneCy - MANE_CY)
  fillEllipseCtx(ctx, ear.x, cy, ear.rx + OUTLINE_PAD * 0.4, ear.ry + OUTLINE_PAD * 0.4, GLOW_PAL.glowOutlineLight)
  fillEllipseCtx(ctx, ear.x, cy, ear.rx, ear.ry, maneHex)
}
//
// Soft pink cheek blush on the snout.
//
function drawCheek(ctx, snoutCy, cheekHex) {
  const cheekY = CHEEK_CY + (snoutCy - SNOUT_CY)
  fillEllipseCtx(ctx, CHEEK_CX, cheekY, CHEEK_R, CHEEK_R, cheekHex)
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
// World-space AABB for touch death — matches art local space and facing flip.
//
function touchHitboxWorldAabb(inst) {
  const s = inst.scale * inst.turnScale
  const dir = inst.facing === 'left' ? -1 : 1
  const centerX = inst.x + dir * s * TOUCH_CENTER_LOCAL_X
  const halfW = TOUCH_HALF_W * s
  return {
    left: centerX - halfW,
    right: centerX + halfW,
    top: inst.y - TOUCH_HALF_H_TOP * s,
    bottom: inst.y + TOUCH_HALF_H_BOTTOM * s
  }
}
//
// Debug overlay — outline only, same box as isTouchingHero() (remove when done).
//
function drawTouchHitboxDebug(inst) {
  const k = inst.k
  const { left, right, top, bottom } = touchHitboxWorldAabb(inst)
  const debugColor = getRGB(k, GLOW_PAL.mushrooms[0])
  k.drawLines({
    pts: [
      k.vec2(left, top),
      k.vec2(right, top),
      k.vec2(right, bottom),
      k.vec2(left, bottom),
      k.vec2(left, top)
    ],
    width: TOUCH_HITBOX_DEBUG_LINE_WIDTH,
    color: debugColor
  })
}
//
// Uniform random float in [min, max).
//
function randRange(min, max) {
  return min + Math.random() * (max - min)
}
