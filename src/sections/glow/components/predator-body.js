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

/**
 * Builds the spine parked on the ground at x.
 * @param {Object} inst
 */
export function initBody(inst) {
  inst.segments = []
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
export function tickBody(inst, dt) {
  const head = inst.segments[0]
  const ride0 = ride(inst, 0)
  head.x = inst.x
  head.y = inst.groundAt(inst.x) - ride0 - inst.headLift
  const gap = SPACING * inst.stretch
  const followBase = 1 - Math.exp(-dt * 9)
  for (let i = 1; i < inst.segments.length; i++) {
    const prev = inst.segments[i - 1]
    const seg = inst.segments[i]
    const aim = inst.dir
    const wantX = prev.x - aim * gap
    const wantY = inst.groundAt(wantX) - ride(inst, i) - inst.headLift * (1 - i / inst.segments.length)
    const along = i / (inst.segments.length - 1)
    const follow = followBase * (1 - along * 0.4)
    seg.x += (wantX - seg.x) * follow
    seg.y += (wantY - seg.y) * follow
  }
}

function ride(inst, index) {
  const segR = index === 0 ? 8 : 5
  return segR + inst.bodyClear
}

function segmentRadius(index) {
  const t = index / (SEGMENT_COUNT - 1)
  if (t < 0.18) return 11 - t / 0.18 * 2.2
  if (t < 0.72) return 8.6 - (t - 0.18) * 2.4
  return 6.4 - (t - 0.72) * 7
}
