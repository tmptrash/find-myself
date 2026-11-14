//
// Spine. The head moves first. Each segment behind it chases the one in
// front with its own lag, so a turn or a stop ripples down the body instead
// of rotating the whole animal at once.
//

//
// Head-to-tail length and the number of body sections along it (one per
// segment behind the head).
//
const SEGMENT_COUNT = 17
const BODY_LENGTH = 150
const SPACING = BODY_LENGTH / (SEGMENT_COUNT - 1)
//
// In the water the follow lag would pull the tail far behind a swimming head
// (the body read as stretched back to the shore), so gaps are capped there.
//
const SWIM_MAX_GAP_STRETCH = 1.1
//
// Speeding up it stretches: the gaps grow by up to SPEED_STRETCH_MAX at
// SPEED_STRETCH_FULL px/s, eased at SPEED_STRETCH_EASE per second.
//
const SPEED_STRETCH_MAX = 0.16
const SPEED_STRETCH_FULL = 400
const SPEED_STRETCH_EASE = 8
//
// However much the charge and the speed ask for, the body is never more than
// MAX_STRETCH times its length.
//
const MAX_STRETCH = 1.3
//
// Turning round, the body is inert: every segment chases the one in front,
// so the far ones turn later than the near ones. A segment still on the
// wrong side of the one in front arches up by up to FOLD_LIFT px, so the
// body folds over itself instead of sliding through.
//
const FOLD_LIFT = 5
//
// It stands up and squats on its legs: its ride height grows by up to
// RISE_PX (inst.rise, 0..1). Standing still it rises to look round and
// drops again every RISE_HOLD_MIN..+RANGE seconds; on the move it keeps
// low (RISE_RUN). Eased at RISE_EASE per second.
//
const RISE_PX = 6
const RISE_RUN = 0.15
const RISE_STILL_SPEED = 30
const RISE_HOLD_MIN = 0.5
const RISE_HOLD_RANGE = 1.3
const RISE_EASE = 7
//
// Section radii: the head, then the body tapering evenly from BODY_R_FRONT
// to BODY_R_TAIL.
//
const HEAD_R = 11
const BODY_R_FRONT = 9.2
const BODY_R_TAIL = 6
//
// How high the head's and a body segment's centre ride above the ground; the
// head is carried higher so its mandibles hang down to the ground.
//
export const HEAD_RIDE = 12
const BODY_RIDE = 6
//
// Gait bob: while it runs the body heaves up and down on its legs in sharp
// beats (one per stride, GAIT_PHASE_PER_PX rad per px run), a wave that
// reaches each segment later (GAIT_SEGMENT_LAG rad). The head heaves the
// most; the bob fades in with speed (full at GAIT_FULL_SPEED px/s).
//
const GAIT_PHASE_PER_PX = 0.3
const GAIT_SEGMENT_LAG = 0.55
const GAIT_HEAD_AMP = 2.6
const GAIT_BODY_AMP = 1.7
const GAIT_FULL_SPEED = 90
const GAIT_GAIN_EASE = 8
const GAIT_BEAT_POWER = 2.2

/**
 * Builds the spine parked on the ground at x.
 * @param {Object} inst
 */
export function initBody(inst) {
  inst.segments = []
  inst.gaitPhase = 0
  inst.gaitGain = 0
  inst.speedStretch = 1
  inst.rise = 0
  inst.riseTo = 0
  inst.riseHold = 0
  for (let i = 0; i < SEGMENT_COUNT; i++) {
    const x = inst.x - inst.dir * SPACING * i
    inst.segments.push({
      x,
      y: inst.groundAt(x) - ride(inst, i),
      radius: segmentRadius(i),
      moss: i % 5 === 2
    })
  }
}

/**
 * The body's stretch now: the charge's and the speed's, capped at MAX_STRETCH.
 * @param {Object} inst - Predator inst
 * @returns {number}
 */
export function totalStretch(inst) {
  return Math.min(MAX_STRETCH, Math.max(1, inst.stretch ?? 1) * (inst.speedStretch ?? 1))
}

/**
 * Pulls the chain after the head. stretch lengthens the gaps during a charge.
 * @param {Object} inst
 * @param {number} dt
 */
/**
 * Spine sample for hit tests — full stretched length from the head, not lagging segment poses.
 * @param {Object} inst - Predator inst
 * @returns {Array<{x: number, y: number, radius: number}>}
 */
export function samplePredatorSpineHitPoints(inst) {
  const n = inst.segments?.length ?? 0
  if (!n) return []
  const gap = SPACING * totalStretch(inst)
  const dir = inst.dir
  const pts = []
  for (let i = 0; i < n; i++) {
    const x = inst.x - dir * gap * i
    const y = inst.groundAt(x) - ride(inst, i) - inst.headLift * (1 - i / (n - 1))
    pts.push({ x, y, radius: inst.segments[i].radius })
  }
  return pts
}

export function tickBody(inst, dt) {
  if (applyBlendedRideTurn(inst)) return
  const head = inst.segments[0]
  const ride0 = ride(inst, 0)
  tickGait(inst, dt)
  tickSpeedStretch(inst, dt)
  tickRise(inst, dt)
  head.x = inst.x
  head.y = inst.groundAt(inst.x) - ride0 - inst.headLift - gaitLift(inst, 0)
  const gap = SPACING * totalStretch(inst)
  const followBase = 1 - Math.exp(-dt * (inst.spineFollowRate ?? 9))
  const maxGap = inst.swimming ? SPACING * Math.max(1, inst.stretch) * SWIM_MAX_GAP_STRETCH : Infinity
  for (let i = 1; i < inst.segments.length; i++) {
    const prev = inst.segments[i - 1]
    const seg = inst.segments[i]
    const aim = inst.dir
    const wantX = prev.x - aim * gap
    const fold = Math.max(0, Math.min(1, 1 - aim * (prev.x - seg.x) / gap))
    const wantY = inst.groundAt(wantX) - ride(inst, i) - inst.headLift * (1 - i / inst.segments.length) - gaitLift(inst, i) - fold * FOLD_LIFT
    const along = i / (inst.segments.length - 1)
    const follow = followBase * (1 - along * 0.4)
    seg.x += (wantX - seg.x) * follow
    seg.y += (wantY - seg.y) * follow
    const off = seg.x - prev.x
    Math.abs(off) > maxGap && (seg.x = prev.x + Math.sign(off) * maxGap)
    capSegmentDistance(seg, prev)
  }
}

// However hard the head runs, a segment never lags further behind the one in
// front than the longest gap (SPACING × MAX_STRETCH), so the body never
// stretches past MAX_STRETCH of its length
function capSegmentDistance(seg, prev) {
  const dx = seg.x - prev.x
  const dy = seg.y - prev.y
  const dist = Math.hypot(dx, dy)
  const cap = SPACING * MAX_STRETCH
  if (dist <= cap) return
  seg.x = prev.x + dx * cap / dist
  seg.y = prev.y + dy * cap / dist
}

// Stretches the gaps with the speed
function tickSpeedStretch(inst, dt) {
  const want = inst.swimming ? 1 : 1 + SPEED_STRETCH_MAX * Math.min(1, Math.abs(inst.vx) / SPEED_STRETCH_FULL)
  inst.speedStretch += (want - inst.speedStretch) * Math.min(1, dt * SPEED_STRETCH_EASE)
}

// Stands up while it is still (now tall, now low), keeps low on the move
function tickRise(inst, dt) {
  const still = !inst.swimming && Math.abs(inst.vx) < RISE_STILL_SPEED && inst.state !== 'feast'
  inst.riseHold -= dt
  if (!still) {
    inst.riseTo = RISE_RUN
    inst.riseHold = 0
  } else if (inst.riseHold <= 0) {
    inst.riseTo = inst.riseTo > 0.5 ? Math.random() * 0.3 : 0.7 + Math.random() * 0.3
    inst.riseHold = RISE_HOLD_MIN + Math.random() * RISE_HOLD_RANGE
  }
  inst.rise += (inst.riseTo - inst.rise) * Math.min(1, dt * RISE_EASE)
}

// Advances the stride by the distance run and eases the bob in and out with speed
function tickGait(inst, dt) {
  const speed = inst.swimming ? 0 : Math.abs(inst.vx)
  inst.gaitPhase += speed * dt * GAIT_PHASE_PER_PX
  inst.gaitGain += (Math.min(1, speed / GAIT_FULL_SPEED) - inst.gaitGain) * Math.min(1, dt * GAIT_GAIN_EASE)
}

// How far a segment is heaved up this frame: a sharp beat per stride, later down the body
function gaitLift(inst, index) {
  const beat = 0.5 + 0.5 * Math.sin(inst.gaitPhase - index * GAIT_SEGMENT_LAG)
  const amp = index === 0 ? GAIT_HEAD_AMP : GAIT_BODY_AMP
  return amp * inst.gaitGain * Math.pow(beat, GAIT_BEAT_POWER)
}

function ride(inst, index) {
  const segR = index === 0 ? HEAD_RIDE : BODY_RIDE
  return segR + inst.bodyClear + (inst.rise ?? 0) * RISE_PX
}

//
// Stick turn and body turn share one blend: segments slide from the pose
// captured at landing to the reversed spine, instead of lagging behind a
// heading that already flipped.
//
function applyBlendedRideTurn(inst) {
  const from = inst.rideTurnFromSegs
  const blend = inst.rideTurnBlend
  if (!from?.length || blend == null) return false
  const dir = inst.rideTurnPoseDir ?? inst.dir
  const n = inst.segments.length
  const gap = SPACING * inst.stretch
  const t = Math.max(0, Math.min(1, blend))
  for (let i = 0; i < n; i++) {
    const x = inst.x - dir * gap * i
    const y = inst.groundAt(x) - ride(inst, i) - inst.headLift * (1 - i / Math.max(1, n - 1))
    const seg = inst.segments[i]
    const src = from[i] ?? seg
    seg.x = src.x + (x - src.x) * t
    seg.y = src.y + (y - src.y) * t
  }
  return true
}

function segmentRadius(index) {
  if (index === 0) return HEAD_R
  return BODY_R_FRONT + (BODY_R_TAIL - BODY_R_FRONT) * (index - 1) / (SEGMENT_COUNT - 2)
}
