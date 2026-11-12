//
// Spine. The head moves first. Each segment behind it chases the one in
// front with its own lag, so a turn or a stop ripples down the body instead
// of rotating the whole animal at once.
//

//
// Same head-to-tail length as the original 8×12 chain. More, shorter gaps
// keep that length and round the silhouette.
//
const SEGMENT_COUNT = 14
const BODY_LENGTH = 84
const SPACING = BODY_LENGTH / (SEGMENT_COUNT - 1)
//
// In the water the follow lag would pull the tail far behind a swimming head
// (the body read as stretched back to the shore), so gaps are capped there.
//
const SWIM_MAX_GAP_STRETCH = 1.1
//
// How high the head's and a body segment's centre ride above the ground; the
// head is carried higher so its mandibles hang down to the ground.
//
export const HEAD_RIDE = 12
const BODY_RIDE = 5
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
  const stretch = Math.max(1, inst.stretch ?? 1)
  const gap = SPACING * stretch
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
  head.x = inst.x
  head.y = inst.groundAt(inst.x) - ride0 - inst.headLift - gaitLift(inst, 0)
  const gap = SPACING * inst.stretch
  const followBase = 1 - Math.exp(-dt * (inst.spineFollowRate ?? 9))
  const maxGap = inst.swimming ? SPACING * Math.max(1, inst.stretch) * SWIM_MAX_GAP_STRETCH : Infinity
  for (let i = 1; i < inst.segments.length; i++) {
    const prev = inst.segments[i - 1]
    const seg = inst.segments[i]
    const aim = inst.dir
    const wantX = prev.x - aim * gap
    const wantY = inst.groundAt(wantX) - ride(inst, i) - inst.headLift * (1 - i / inst.segments.length) - gaitLift(inst, i)
    const along = i / (inst.segments.length - 1)
    const follow = followBase * (1 - along * 0.4)
    seg.x += (wantX - seg.x) * follow
    seg.y += (wantY - seg.y) * follow
    const off = seg.x - prev.x
    Math.abs(off) > maxGap && (seg.x = prev.x + Math.sign(off) * maxGap)
  }
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
  return segR + inst.bodyClear
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
  const t = index / (SEGMENT_COUNT - 1)
  if (t < 0.18) return 11 - t / 0.18 * 2.2
  if (t < 0.72) return 8.6 - (t - 0.18) * 2.4
  return 6.4 - (t - 0.72) * 7
}
