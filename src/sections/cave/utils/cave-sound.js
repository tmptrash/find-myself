import { CFG } from '../../../cfg.js'
//
// Procedural cave ambience on the shared AudioContext (Sound.create()):
// independent drip sources with their own rhythm, pitch and pan; a draught
// blowing through the cave in irregular gusts (low rush, airy whoosh and a
// thin whistle in the cracks); a faint rumble; rare distant pebble falls.
// Everything that should sound far away goes through a cave reverb built
// from a procedural impulse response. Plus the lantern mushroom's spring
// and chime and the plant contraptions.
//
const MASTER_GAIN = CFG.audio.masterVolume
const NOISE_SECONDS = 6
const BROWN_LEAK = 0.02
const BROWN_GAIN = 3.5
//
// Cave reverb: impulse length and decay, early reflections, pre-delay, and
// how fast the highs die out along the tail (one-pole lowpass whose
// coefficient falls from start to end).
//
const REVERB_SECONDS = 2.8
const REVERB_DECAY = 2.2
const REVERB_PREDELAY = 0.018
const REVERB_EARLY = 7
const REVERB_EARLY_FROM = 0.012
const REVERB_EARLY_RANGE = 0.07
const REVERB_EARLY_GAIN = 0.6
const REVERB_DAMP_START = 0.85
const REVERB_DAMP_END = 0.06
const REVERB_RETURN = 0.7
const REVERB_SEND = 0.6
const STEREO = 2
//
// Rumble bed: very low brown noise, its level wandering slowly at random.
//
const RUMBLE_LOWPASS = 120
const RUMBLE_GAIN = 0.08
const RUMBLE_WANDER = 0.35
//
// Draught: a gust controller picks a new target strength now and then —
// mostly lulls, sometimes a gust — and eases toward it; fast turbulence
// flutters on top. Layers follow the strength: a low rush (lowpass opens
// with the gust), an airy whoosh (band moves up) and a narrow whistle that
// only sings in stronger gusts, wandering in pitch and side.
//
const GUST_LULL_CHANCE = 0.55
const GUST_LULL_MIN = 0.04
const GUST_LULL_RANGE = 0.16
const GUST_MIN = 0.35
const GUST_RANGE = 0.65
const GUST_POW = 1.6
const GUST_HOLD_MIN = 1.5
const GUST_HOLD_RANGE = 6
const GUST_EASE_MIN = 0.6
const GUST_EASE_RANGE = 2.2
const FLUTTER_EVERY_MIN = 0.07
const FLUTTER_EVERY_RANGE = 0.2
const FLUTTER_DEPTH = 0.45
const PARAM_SMOOTH = 0.08
const RUSH_GAIN = 0.05
const RUSH_BED = 0.25
const RUSH_LP_MIN = 220
const RUSH_LP_RANGE = 520
const WHOOSH_GAIN = 0.035
const WHOOSH_POW = 1.5
const WHOOSH_BP_MIN = 380
const WHOOSH_BP_RANGE = 800
const WHOOSH_Q = 0.8
const WHOOSH_FLUTTER_HZ = 120
const WHISTLE_GAIN = 0.012
const WHISTLE_FROM = 0.45
const WHISTLE_Q = 22
const WHISTLE_HZ_MIN = 650
const WHISTLE_HZ_RANGE = 650
const WHISTLE_WANDER = 0.4
const WHISTLE_GUST_RISE = 0.25
const WHISTLE_FLUTTER = 2
const WHISTLE_PAN_WANDER = 0.15
const WHISTLE_PAN_MAX = 0.6
const WHISTLE_SEND = 0.4
//
// Drip sources: world Y, pan, base period and pitch; lake sources plop.
//
const DRIP_SOURCES = [
  { y: 250, pan: -0.6, period: 2.3, pitch: 1700 },
  { y: 700, pan: 0.7, period: 3.7, pitch: 1350 },
  { y: 1150, pan: -0.2, period: 5.1, pitch: 2100 },
  { y: 1460, pan: 0.35, period: 2.9, pitch: 1500 },
  { y: 2080, pan: -0.4, period: 4.3, pitch: 560, plop: true },
  { y: 2080, pan: 0.55, period: 6.2, pitch: 470, plop: true }
]
const DRIP_PERIOD_JITTER = 0.55
const DRIP_PERIOD_SCALE = 2.5
const DRIP_VOLUME = 0.12
const DRIP_NEAR_RANGE = 900
const DRIP_FAR_FLOOR = 0.22
const PITCH_JITTER = 0.5
//
// One drop (a real drop rings through the air bubble it traps: a sine
// gliding up in pitch, dying in tens of milliseconds) — after a tiny noise
// click of the impact. Drops on stone ring short and high, sometimes only
// tick; drops into the lake trap a bigger bubble (lower, longer, a soft
// thud). A share of drops throws off tiny droplets that plink after them.
//
const DROP_ATTACK = 0.0015
const PLINK_TAU_MIN = 0.009
const PLINK_TAU_RANGE = 0.012
const PLINK_GLIDE = 2.2
const PLINK_BUBBLE_CHANCE = 0.75
const PLOP_TAU_MIN = 0.022
const PLOP_TAU_RANGE = 0.02
const PLOP_GLIDE = 1.8
const TAU_TAIL = 7
const GLIDE_TAUS = 4
const CLICK_TIME = 0.004
const CLICK_HP = 3000
const CLICK_GAIN = 0.35
const THUD_TIME = 0.014
const THUD_LP = 900
const THUD_GAIN = 0.5
const SPLASH_CHANCE = 0.35
const SPLASH_MAX = 2
const SPLASH_DELAY_MIN = 0.04
const SPLASH_DELAY_RANGE = 0.08
const SPLASH_PITCH_MIN = 1.4
const SPLASH_PITCH_RANGE = 0.6
const SPLASH_GAIN_MIN = 0.25
const SPLASH_GAIN_RANGE = 0.15
//
// Visible drops landing near the hero: pitches and loudness share.
//
const LAND_PLINK_PITCH = 1900
const LAND_PLOP_PITCH = 520
const LAND_VOLUME = 1.3
//
// Distant pebble falls.
//
const PEBBLE_EVERY_MIN = 16
const PEBBLE_EVERY_RANGE = 22
const PEBBLE_COUNT_MIN = 4
const PEBBLE_COUNT_RANGE = 6
const PEBBLE_GAP = 0.09
const PEBBLE_BANDPASS = 1700
const PEBBLE_GAIN = 0.05
const PEBBLE_DECAY = 0.05
const PEBBLE_FADE = 0.8
//
// Steps on the plant's fleshy leaves: a soft muffled pat (low-passed noise,
// slow attack) under a faint leafy rustle; landing is the same, a little
// longer and fuller. About a third as loud as the normal step.
//
const LEAF_STEP_TIME = 0.07
const LEAF_LAND_TIME = 0.11
const LEAF_PAT_LP = 340
const LEAF_PAT_GAIN = 0.7
const LEAF_LAND_GAIN = 1
const LEAF_PAT_ATTACK = 0.012
const LEAF_RUSTLE_BAND = 2600
const LEAF_RUSTLE_Q = 0.7
const LEAF_RUSTLE_SHARE = 0.06
const LEAF_PITCH_JITTER = 0.25
//
// Steps on cave rock: a soft padded footfall, no ringing tone and no
// reverb (those made it sound like a drum) — a muffled low thump of noise
// with a gentle attack and two faint grains of grit crunching under the
// foot, the second a moment later. A landing is the same footfall, only a
// little louder and longer.
//
const STONE_THUD_LP = 260
const STONE_THUD_GAIN = 0.55
const STONE_STEP_TIME = 0.06
const STONE_GRIT_BAND = 1800
const STONE_GRIT_Q = 0.8
const STONE_GRIT_SHARE = 0.1
const STONE_GRIT2_SHARE = 0.06
const STONE_GRIT2_DELAY_MIN = 0.01
const STONE_GRIT2_DELAY_RANGE = 0.015
const STONE_GRIT_TIME = 0.6         // Grit length, share of the step's
const STONE_JITTER = 0.2
const STONE_LAND_GAIN = 1.25
const STONE_LAND_TIME = 1.2
//
// Landing on the spore mushroom's cap: soft flesh giving way — a low
// muffled thump with a gentle attack and a short breath of air pushed out
// through the holes, its filter falling as the cap settles. All noise, no
// tone and no reverb.
//
const CAP_THUD_LP = 170
const CAP_THUD_GAIN = 0.9
const CAP_THUD_TIME = 0.11
const CAP_AIR_FROM = 1400
const CAP_AIR_TO = 500
const CAP_AIR_Q = 0.5
const CAP_AIR_SHARE = 0.12
const CAP_AIR_TIME = 0.16
const CAP_JITTER = 0.15
//
// A puff of noise: band-passed, its centre sliding from one frequency to
// another, with a soft attack.
//
const PUFF_ATTACK = 0.025
//
// Tendrils seizing the hero: a wet slither (noise sweeping down) over a
// low creak.
//
const GRAB_NOISE_FROM = 2400
const GRAB_NOISE_TO = 600
const GRAB_NOISE_GAIN = 0.1
const GRAB_TIME = 0.35
const GRAB_CREAK = 110
const GRAB_CREAK_GAIN = 0.12
const GRAB_CREAK_DROP = 0.7
//
// Lantern mushroom: soft spring, rising chime, dim ticks.
//
const SPRING_FROM = 170
const SPRING_TO = 420
const SPRING_TIME = 0.22
const SPRING_GAIN = 0.16
const CHIME_FREQS = [880, 1320, 1760, 2217]
const CHIME_STAGGER = 0.06
const CHIME_GAIN = 0.05
const CHIME_DECAY = 1.4
const DIM_TICK_FREQ = 1980
const DIM_TICK_GAIN = 0.018
const DIM_TICK_DECAY = 0.12
//
// Hero bursting into fireflies: chirp count, time spread, pitch and decay.
//
const SPARK_CHIRPS = 6
const SPARK_SPREAD = 0.16
const SPARK_FREQ_MIN = 1100
const SPARK_FREQ_RANGE = 700
const SPARK_DROP = 0.6
const SPARK_DECAY = 0.12
const SPARK_GAIN = 0.05
//
// Plant contraptions: trap snap, spore puff, bubble pop, air plant breath.
//
const SNAP_FREQ = 140
const SNAP_GAIN = 0.22
const SNAP_DECAY = 0.18
const SNAP_DROP = 0.5
const SNAP_NOISE_BAND = 900
const SNAP_NOISE_GAIN = 0.12
const SNAP_NOISE_DECAY = 0.12
//
// Spores puffing out: a dry breath of dust falling in pitch, and a couple
// of smaller puffs trailing it at uneven steps.
//
const SPORE_PUFF_FROM = 2400
const SPORE_PUFF_TO = 900
const SPORE_PUFF_Q = 0.6
const SPORE_PUFF_TIME = 0.4
const SPORE_PUFF_GAIN = 0.12
const SPORE_PUFF_TRAIL = 2
const SPORE_TRAIL_STEP = 0.08
const SPORE_TRAIL_SHARE = 0.45
const POP_FREQ = 1400
const POP_GAIN = 0.06
const POP_DECAY = 0.07
const POP_DROP = 0.5
const POP_NOISE_BAND = 3200
const POP_NOISE_GAIN = 0.05
const POP_NOISE_DECAY = 0.05
const AIR_BAND = 700
const AIR_Q = 0.6
const AIR_GAIN = 0.05
const AIR_SUSTAIN = 0.7
const AIR_ATTACK = 0.25
const AIR_RELEASE = 0.8
const AIR_TIME = 4.5
const SILENT = 0.0001
const HALF = 0.5

/**
 * Creates the cave sound bus on the shared AudioContext.
 * @param {Object} sfx - Sound instance from Sound.create()
 * @returns {Object} Cave sound instance
 */
export function create(sfx) {
  const ctx = sfx.audioContext
  const out = ctx.createGain()
  out.gain.value = MASTER_GAIN
  out.connect(ctx.destination)
  const reverb = ctx.createConvolver()
  reverb.buffer = reverbImpulse(ctx)
  const ret = ctx.createGain()
  ret.gain.value = REVERB_RETURN
  const send = ctx.createGain()
  send.gain.value = REVERB_SEND
  send.connect(reverb)
  reverb.connect(ret)
  ret.connect(out)
  return {
    ctx,
    out,
    send,
    loops: [],
    wind: null,
    drips: DRIP_SOURCES.map(src => ({ ...src, wait: Math.random() * src.period * DRIP_PERIOD_SCALE })),
    pebbleWait: PEBBLE_EVERY_MIN + Math.random() * PEBBLE_EVERY_RANGE,
    brown: noiseBuffer(ctx, true),
    white: noiseBuffer(ctx, false),
    stopped: false
  }
}

/**
 * Starts the rumble bed and the draught layers.
 * @param {Object} inst - Cave sound instance
 */
export function startAmbience(inst) {
  const rumble = noiseLayer(inst, inst.brown, 'lowpass', RUMBLE_LOWPASS, 1, RUMBLE_GAIN)
  const rush = noiseLayer(inst, inst.brown, 'lowpass', RUSH_LP_MIN, 1, 0)
  const whoosh = noiseLayer(inst, inst.white, 'bandpass', WHOOSH_BP_MIN, WHOOSH_Q, 0)
  const whistle = noiseLayer(inst, inst.white, 'bandpass', WHISTLE_HZ_MIN, WHISTLE_Q, 0, WHISTLE_SEND)
  inst.loops.push(rumble.nodes, rush.nodes, whoosh.nodes, whistle.nodes)
  inst.wind = {
    rumble,
    rush,
    whoosh,
    whistle,
    level: GUST_LULL_MIN,
    target: GUST_LULL_MIN,
    ease: GUST_EASE_MIN,
    hold: 0,
    flutter: 0,
    flutterWait: 0,
    rumbleLevel: 1,
    whistleHz: WHISTLE_HZ_MIN + Math.random() * WHISTLE_HZ_RANGE,
    pan: 0
  }
}

/**
 * Ticks the draught, drip and pebble timers; drips are louder near the hero.
 * @param {Object} inst - Cave sound instance
 * @param {number} dt - Delta time
 * @param {number} listenerY - Hero world Y
 */
export function onUpdate(inst, dt, listenerY) {
  if (inst.stopped || inst.ctx.state !== 'running') return
  inst.wind && updateWind(inst, dt)
  inst.drips.forEach(d => {
    d.wait -= dt
    if (d.wait > 0) return
    d.wait = d.period * DRIP_PERIOD_SCALE * (1 - DRIP_PERIOD_JITTER / 2 + Math.random() * DRIP_PERIOD_JITTER)
    playDrip(inst, d, Math.max(DRIP_FAR_FLOOR, 1 - Math.abs(d.y - listenerY) / DRIP_NEAR_RANGE))
  })
  inst.pebbleWait -= dt
  if (inst.pebbleWait > 0) return
  inst.pebbleWait = PEBBLE_EVERY_MIN + Math.random() * PEBBLE_EVERY_RANGE
  playPebbleFall(inst)
}

/**
 * Current draught strength (0 calm … 1 strongest gust), for things that
 * sway in it.
 * @param {Object} inst - Cave sound instance
 * @returns {number}
 */
export function gust(inst) {
  return inst.wind ? inst.wind.level : 0
}

/**
 * A falling drop hitting stone (plink) or the lake (plop), panned and
 * faded by its distance from the hero.
 * @param {Object} inst - Cave sound instance
 * @param {number} pan - -1 (left) … 1 (right)
 * @param {number} near - 0 (far) … 1 (right next to the hero)
 * @param {boolean} water - Lands in the lake
 */
export function playDropLand(inst, pan, near, water) {
  if (inst.stopped || inst.ctx.state !== 'running' || near <= 0) return
  playDrip(inst, { pan, pitch: water ? LAND_PLOP_PITCH : LAND_PLINK_PITCH, plop: water }, near * LAND_VOLUME)
}

/**
 * The hero stepping or landing on one of the plant's leaves: a soft,
 * quiet, damp pat with a faint rustle.
 * @param {Object} inst - Cave sound instance
 * @param {boolean} land - Landing (a little longer and fuller)
 */
export function playLeafStep(inst, land) {
  if (!ready(inst)) return
  const at = inst.ctx.currentTime
  const time = land ? LEAF_LAND_TIME : LEAF_STEP_TIME
  const gain = land ? LEAF_LAND_GAIN : LEAF_PAT_GAIN
  const lp = LEAF_PAT_LP * (1 + (Math.random() - HALF) * LEAF_PITCH_JITTER)
  softBurst(inst, inst.brown, at, 'lowpass', lp, 1, time, gain)
  softBurst(inst, inst.white, at, 'bandpass', LEAF_RUSTLE_BAND, LEAF_RUSTLE_Q, time, gain * LEAF_RUSTLE_SHARE)
}

/**
 * Short sparkle when the hero shatters into fireflies: a few quick high
 * chirps packed into a fraction of a second.
 * @param {Object} inst - Cave sound instance
 */
export function playSparkBurst(inst) {
  const { ctx } = inst
  if (inst.stopped || ctx.state !== 'running') return
  for (let i = 0; i < SPARK_CHIRPS; i++) {
    const at = ctx.currentTime + Math.random() * SPARK_SPREAD
    const freq = SPARK_FREQ_MIN + Math.random() * SPARK_FREQ_RANGE
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, at)
    osc.frequency.exponentialRampToValueAtTime(freq * SPARK_DROP, at + SPARK_DECAY)
    g.gain.setValueAtTime(SPARK_GAIN, at)
    g.gain.exponentialRampToValueAtTime(SILENT, at + SPARK_DECAY)
    osc.connect(g)
    g.connect(inst.out)
    osc.start(at)
    osc.stop(at + SPARK_DECAY)
  }
}

/**
 * A trap leaf snapping shut: a low thump with a short wet rasp.
 * @param {Object} inst - Cave sound instance
 */
export function playLeafSnap(inst) {
  if (!ready(inst)) return
  const at = inst.ctx.currentTime
  tone(inst, SNAP_FREQ, at, SNAP_GAIN, SNAP_DECAY, false, SNAP_DROP)
  noiseHit(inst, at, SNAP_NOISE_BAND, SNAP_NOISE_GAIN, SNAP_NOISE_DECAY)
}

/**
 * The hero stepping or landing on rock: a soft muffled thump with a faint
 * crunch of grit; a landing is the same footfall, a little louder.
 * @param {Object} inst - Cave sound instance
 * @param {boolean} land - Landing (a little louder and longer)
 */
export function playStoneStep(inst, land) {
  if (!ready(inst)) return
  const at = inst.ctx.currentTime
  const pitch = 1 + (Math.random() - HALF) * STONE_JITTER
  const gain = STONE_THUD_GAIN * (land ? STONE_LAND_GAIN : 1)
  const time = STONE_STEP_TIME * (land ? STONE_LAND_TIME : 1)
  const grit = time * STONE_GRIT_TIME
  const later = at + STONE_GRIT2_DELAY_MIN + Math.random() * STONE_GRIT2_DELAY_RANGE
  softBurst(inst, inst.brown, at, 'lowpass', STONE_THUD_LP * pitch, 1, time, gain)
  softBurst(inst, inst.white, at, 'bandpass', STONE_GRIT_BAND * pitch, STONE_GRIT_Q, grit, gain * STONE_GRIT_SHARE)
  softBurst(inst, inst.white, later, 'bandpass', STONE_GRIT_BAND * pitch, STONE_GRIT_Q, grit, gain * STONE_GRIT2_SHARE)
}

/**
 * The hero landing on the spore mushroom's cap: a short dull thump.
 * @param {Object} inst - Cave sound instance
 */
export function playCapLand(inst) {
  if (!ready(inst)) return
  const at = inst.ctx.currentTime
  const pitch = 1 + (Math.random() - HALF) * CAP_JITTER
  softBurst(inst, inst.brown, at, 'lowpass', CAP_THUD_LP * pitch, 1, CAP_THUD_TIME, CAP_THUD_GAIN)
  puff(inst, at, CAP_AIR_FROM * pitch, CAP_AIR_TO * pitch, CAP_AIR_Q, CAP_AIR_TIME, CAP_THUD_GAIN * CAP_AIR_SHARE)
}

/**
 * A trap's tendrils seizing the hero: a wet slither and a low creak.
 * @param {Object} inst - Cave sound instance
 */
export function playTendrilGrab(inst) {
  if (!ready(inst)) return
  const { ctx } = inst
  const at = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = inst.white
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.setValueAtTime(GRAB_NOISE_FROM, at)
  band.frequency.exponentialRampToValueAtTime(GRAB_NOISE_TO, at + GRAB_TIME)
  const g = ctx.createGain()
  g.gain.setValueAtTime(GRAB_NOISE_GAIN, at)
  g.gain.exponentialRampToValueAtTime(SILENT, at + GRAB_TIME)
  src.connect(band)
  band.connect(g)
  g.connect(inst.out)
  src.start(at, Math.random() * NOISE_SECONDS / 2, GRAB_TIME * 2)
  tone(inst, GRAB_CREAK, at, GRAB_CREAK_GAIN, GRAB_TIME, false, GRAB_CREAK_DROP)
}

/**
 * Spores leaving the mushroom: a soft dry puff of dust from its holes, a
 * couple of small ones trailing it.
 * @param {Object} inst - Cave sound instance
 */
export function playSporeRelease(inst) {
  if (!ready(inst)) return
  const at = inst.ctx.currentTime
  puff(inst, at, SPORE_PUFF_FROM, SPORE_PUFF_TO, SPORE_PUFF_Q, SPORE_PUFF_TIME, SPORE_PUFF_GAIN)
  for (let i = 1; i <= SPORE_PUFF_TRAIL; i++) {
    const later = at + i * SPORE_TRAIL_STEP * (1 + Math.random())
    puff(inst, later, SPORE_PUFF_FROM, SPORE_PUFF_TO, SPORE_PUFF_Q, SPORE_PUFF_TIME * SPORE_TRAIL_SHARE, SPORE_PUFF_GAIN * SPORE_TRAIL_SHARE)
  }
}

/**
 * A bubble bursting: a tiny high pop.
 * @param {Object} inst - Cave sound instance
 */
export function playBubblePop(inst) {
  if (!ready(inst)) return
  const at = inst.ctx.currentTime
  tone(inst, POP_FREQ, at, POP_GAIN, POP_DECAY, true, POP_DROP)
  noiseHit(inst, at, POP_NOISE_BAND, POP_NOISE_GAIN, POP_NOISE_DECAY)
}

/**
 * The air plant breathing out: a soft band of noise swelling and fading
 * over the blow.
 * @param {Object} inst - Cave sound instance
 */
export function playAirBlow(inst) {
  if (!ready(inst)) return
  const { ctx } = inst
  const at = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = inst.white
  src.loop = true
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = AIR_BAND
  band.Q.value = AIR_Q
  const g = ctx.createGain()
  g.gain.setValueAtTime(SILENT, at)
  g.gain.linearRampToValueAtTime(AIR_GAIN, at + AIR_ATTACK)
  g.gain.linearRampToValueAtTime(AIR_GAIN * AIR_SUSTAIN, at + AIR_TIME - AIR_RELEASE)
  g.gain.linearRampToValueAtTime(SILENT, at + AIR_TIME)
  src.connect(band)
  band.connect(g)
  g.connect(inst.out)
  src.start(at)
  src.stop(at + AIR_TIME)
}

/**
 * Soft spring plus a rising chime when the lantern mushroom lights up.
 * @param {Object} inst - Cave sound instance
 */
export function playLanternBounce(inst) {
  const { ctx } = inst
  if (ctx.state !== 'running') return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(SPRING_FROM, now)
  osc.frequency.exponentialRampToValueAtTime(SPRING_TO, now + SPRING_TIME)
  g.gain.setValueAtTime(SPRING_GAIN, now)
  g.gain.exponentialRampToValueAtTime(SILENT, now + SPRING_TIME * 2)
  osc.connect(g)
  g.connect(inst.out)
  osc.start(now)
  osc.stop(now + SPRING_TIME * 2)
  CHIME_FREQS.forEach((freq, i) => tone(inst, freq, now + i * CHIME_STAGGER, CHIME_GAIN, CHIME_DECAY, true))
}

/**
 * Faint tick as the lantern drops one light step.
 * @param {Object} inst - Cave sound instance
 */
export function playLanternDim(inst) {
  inst.ctx.state === 'running' && tone(inst, DIM_TICK_FREQ, inst.ctx.currentTime, DIM_TICK_GAIN, DIM_TICK_DECAY, true)
}

/**
 * Stops loops and disconnects the bus.
 * @param {Object} inst - Cave sound instance
 */
export function stop(inst) {
  if (inst.stopped) return
  inst.stopped = true
  inst.loops.forEach(nodes => nodes.forEach(n => {
    n.stop?.()
    n.disconnect()
  }))
  inst.loops = []
  inst.out.disconnect()
}
//
// Gust controller: a new target strength after each hold (mostly lulls,
// sometimes a gust), eased toward at its own pace; turbulence flutters on
// top; the whistle drifts in pitch and side; the rumble drifts slowly.
//
function updateWind(inst, dt) {
  const w = inst.wind
  w.hold -= dt
  if (w.hold <= 0) {
    const lull = Math.random() < GUST_LULL_CHANCE
    w.target = lull ? GUST_LULL_MIN + Math.random() * GUST_LULL_RANGE : GUST_MIN + Math.pow(Math.random(), GUST_POW) * GUST_RANGE
    w.hold = GUST_HOLD_MIN + Math.random() * GUST_HOLD_RANGE
    w.ease = GUST_EASE_MIN + Math.random() * GUST_EASE_RANGE
    w.rumbleLevel = 1 + (Math.random() * 2 - 1) * RUMBLE_WANDER
  }
  w.level += (w.target - w.level) * (1 - Math.exp(-dt / w.ease))
  w.flutterWait -= dt
  if (w.flutterWait <= 0) {
    w.flutterWait = FLUTTER_EVERY_MIN + Math.random() * FLUTTER_EVERY_RANGE
    w.flutter = (Math.random() * 2 - 1) * FLUTTER_DEPTH
  }
  w.whistleHz = clamp(w.whistleHz * (1 + (Math.random() * 2 - 1) * WHISTLE_WANDER * dt), WHISTLE_HZ_MIN, WHISTLE_HZ_MIN + WHISTLE_HZ_RANGE)
  w.pan = clamp(w.pan + (Math.random() * 2 - 1) * WHISTLE_PAN_WANDER * dt, -WHISTLE_PAN_MAX, WHISTLE_PAN_MAX)
  applyWind(inst)
}
//
// Pushes the current draught state to the layer filters and gains.
//
function applyWind(inst) {
  const w = inst.wind
  const now = inst.ctx.currentTime
  const level = w.level
  const shake = 1 + w.flutter * level
  const sing = Math.max(0, level - WHISTLE_FROM) / (1 - WHISTLE_FROM)
  setSmooth(w.rumble.gain.gain, RUMBLE_GAIN * w.rumbleLevel, now)
  setSmooth(w.rush.gain.gain, RUSH_GAIN * (RUSH_BED + level) * shake, now)
  setSmooth(w.rush.filter.frequency, RUSH_LP_MIN + RUSH_LP_RANGE * level, now)
  setSmooth(w.whoosh.gain.gain, WHOOSH_GAIN * Math.pow(level, WHOOSH_POW) * shake, now)
  setSmooth(w.whoosh.filter.frequency, WHOOSH_BP_MIN + WHOOSH_BP_RANGE * level + w.flutter * WHOOSH_FLUTTER_HZ, now)
  setSmooth(w.whistle.gain.gain, WHISTLE_GAIN * sing * Math.max(0, 1 + w.flutter * WHISTLE_FLUTTER), now)
  setSmooth(w.whistle.filter.frequency, w.whistleHz * (1 + WHISTLE_GUST_RISE * level), now)
  setSmooth(w.whistle.pan.pan, w.pan, now)
}
function setSmooth(param, value, now) {
  param.setTargetAtTime(value, now, PARAM_SMOOTH)
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}
//
// One drop: a short impact (click on stone, soft thud on water), then the
// bubble's ring gliding up in pitch, panned and partly sent to the reverb;
// sometimes a few tiny droplets plink after it.
//
function playDrip(inst, src, near) {
  const at = inst.ctx.currentTime
  const pan = inst.ctx.createStereoPanner()
  pan.pan.value = src.pan
  pan.connect(inst.out)
  pan.connect(inst.send)
  const pitch = src.pitch * (1 - PITCH_JITTER / 2 + Math.random() * PITCH_JITTER)
  const volume = DRIP_VOLUME * near
  src.plop ? dropThud(inst, at, volume, pan) : dropClick(inst, at, volume, pan)
  const bubble = src.plop || Math.random() < PLINK_BUBBLE_CHANCE
  const tau = src.plop ? PLOP_TAU_MIN + Math.random() * PLOP_TAU_RANGE : PLINK_TAU_MIN + Math.random() * PLINK_TAU_RANGE
  bubble && dropRing(inst, at, pitch, src.plop ? PLOP_GLIDE : PLINK_GLIDE, tau, volume, pan)
  if (Math.random() > SPLASH_CHANCE) return
  const count = 1 + Math.floor(Math.random() * SPLASH_MAX)
  for (let i = 0; i < count; i++) {
    const delay = SPLASH_DELAY_MIN + Math.random() * SPLASH_DELAY_RANGE
    const gain = SPLASH_GAIN_MIN + Math.random() * SPLASH_GAIN_RANGE
    dropRing(inst, at + delay, pitch * (SPLASH_PITCH_MIN + Math.random() * SPLASH_PITCH_RANGE), PLINK_GLIDE, PLINK_TAU_MIN, volume * gain, pan)
  }
}
//
// The trapped bubble ringing: a sine gliding up, quick attack, fast decay.
//
function dropRing(inst, at, pitch, glide, tau, volume, out) {
  const { ctx } = inst
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(pitch, at)
  osc.frequency.exponentialRampToValueAtTime(pitch * glide, at + tau * GLIDE_TAUS)
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(volume, at + DROP_ATTACK)
  g.gain.setTargetAtTime(0, at + DROP_ATTACK, tau)
  osc.connect(g)
  g.connect(out)
  osc.start(at)
  osc.stop(at + DROP_ATTACK + tau * TAU_TAIL)
}
//
// Impact on stone: a few milliseconds of high-passed noise.
//
function dropClick(inst, at, volume, out) {
  burst(inst, at, 'highpass', CLICK_HP, CLICK_TIME, volume * CLICK_GAIN, out)
}
//
// Impact on water: a short low-passed slap.
//
function dropThud(inst, at, volume, out) {
  burst(inst, at, 'lowpass', THUD_LP, THUD_TIME, volume * THUD_GAIN, out)
}
function burst(inst, at, type, freq, time, gain, out) {
  const { ctx } = inst
  const src = ctx.createBufferSource()
  src.buffer = inst.white
  const filter = ctx.createBiquadFilter()
  filter.type = type
  filter.frequency.value = freq
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, at)
  g.gain.exponentialRampToValueAtTime(SILENT, at + time)
  src.connect(filter)
  filter.connect(g)
  g.connect(out)
  src.start(at, Math.random() * NOISE_SECONDS / 2, time * 2)
}
//
// A few band-passed noise clicks fading out — pebbles bouncing far away.
//
function playPebbleFall(inst) {
  const { ctx } = inst
  const count = PEBBLE_COUNT_MIN + Math.floor(Math.random() * PEBBLE_COUNT_RANGE)
  const pan = ctx.createStereoPanner()
  pan.pan.value = Math.random() * 2 - 1
  pan.connect(inst.send)
  pan.connect(inst.out)
  for (let i = 0; i < count; i++) {
    const at = ctx.currentTime + i * PEBBLE_GAP * (1 + Math.random())
    const src = ctx.createBufferSource()
    src.buffer = inst.white
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = PEBBLE_BANDPASS * (1 + Math.random())
    const g = ctx.createGain()
    g.gain.setValueAtTime(PEBBLE_GAIN * Math.pow(PEBBLE_FADE, i), at)
    g.gain.exponentialRampToValueAtTime(SILENT, at + PEBBLE_DECAY)
    src.connect(band)
    band.connect(g)
    g.connect(pan)
    src.start(at, Math.random() * NOISE_SECONDS / 2, PEBBLE_DECAY * 2)
  }
}
//
// A noise burst with a gentle attack (no click), filtered, to the bus.
//
function softBurst(inst, buffer, at, type, freq, q, time, gain) {
  const { ctx } = inst
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = type
  filter.frequency.value = freq
  filter.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(gain, at + LEAF_PAT_ATTACK)
  g.gain.exponentialRampToValueAtTime(SILENT, at + time)
  src.connect(filter)
  filter.connect(g)
  g.connect(inst.out)
  src.start(at, Math.random() * NOISE_SECONDS / 2, time * 2)
}
//
// A breath of noise: band-passed with its centre sliding from one
// frequency to another, soft attack, fading out (no click, no tone).
//
function puff(inst, at, from, to, q, time, gain) {
  const { ctx } = inst
  const src = ctx.createBufferSource()
  src.buffer = inst.white
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = q
  filter.frequency.setValueAtTime(from, at)
  filter.frequency.exponentialRampToValueAtTime(to, at + time)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(gain, at + PUFF_ATTACK)
  g.gain.exponentialRampToValueAtTime(SILENT, at + time)
  src.connect(filter)
  filter.connect(g)
  g.connect(inst.out)
  src.start(at, Math.random() * NOISE_SECONDS / 2, time * 2)
}
function ready(inst) {
  return !inst.stopped && inst.ctx.state === 'running'
}
function tone(inst, freq, at, gain, decay, echo, drop = 1) {
  const { ctx } = inst
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, at)
  drop !== 1 && osc.frequency.exponentialRampToValueAtTime(freq * drop, at + decay)
  g.gain.setValueAtTime(gain, at)
  g.gain.exponentialRampToValueAtTime(SILENT, at + decay)
  osc.connect(g)
  g.connect(inst.out)
  echo && g.connect(inst.send)
  osc.start(at)
  osc.stop(at + decay)
}
//
// One band-passed noise burst (rasp, pop, click), optionally into the
// cave reverb.
//
function noiseHit(inst, at, band, gain, decay, q = 1, echo = false) {
  const { ctx } = inst
  const src = ctx.createBufferSource()
  src.buffer = inst.white
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = band
  filter.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, at)
  g.gain.exponentialRampToValueAtTime(SILENT, at + decay)
  src.connect(filter)
  filter.connect(g)
  g.connect(inst.out)
  echo && g.connect(inst.send)
  src.start(at, 0, decay * 2)
}
//
// Looping filtered noise (started at a random offset so layers sharing a
// buffer never line up), through a gain and a panner to the bus and, if
// asked, partly into the reverb.
//
function noiseLayer(inst, buffer, type, freq, q, gain, send = 0) {
  const { ctx } = inst
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  const filter = ctx.createBiquadFilter()
  filter.type = type
  filter.frequency.value = freq
  filter.Q.value = q
  const g = ctx.createGain()
  g.gain.value = gain
  const pan = ctx.createStereoPanner()
  const sendGain = ctx.createGain()
  sendGain.gain.value = send
  src.connect(filter)
  filter.connect(g)
  g.connect(pan)
  pan.connect(inst.out)
  pan.connect(sendGain)
  sendGain.connect(inst.send)
  src.start(0, Math.random() * NOISE_SECONDS)
  return { filter, gain: g, pan, nodes: [src, filter, g, pan, sendGain] }
}
//
// Stereo cave impulse: silence for the pre-delay, a few early reflections,
// then a noise tail decaying exponentially and losing its highs over time
// (each channel its own noise, so the tail is wide).
//
function reverbImpulse(ctx) {
  const rate = ctx.sampleRate
  const length = Math.floor(rate * REVERB_SECONDS)
  const pre = Math.floor(rate * REVERB_PREDELAY)
  const buffer = ctx.createBuffer(STEREO, length, rate)
  for (let ch = 0; ch < STEREO; ch++) {
    const data = buffer.getChannelData(ch)
    let low = 0
    for (let i = pre; i < length; i++) {
      const t = (i - pre) / (length - pre)
      const damp = REVERB_DAMP_START + (REVERB_DAMP_END - REVERB_DAMP_START) * t
      low += damp * ((Math.random() * 2 - 1) - low)
      data[i] = low * Math.exp(-t * REVERB_SECONDS * REVERB_DECAY)
    }
    for (let e = 0; e < REVERB_EARLY; e++) {
      const at = pre + Math.floor(rate * (REVERB_EARLY_FROM + Math.random() * REVERB_EARLY_RANGE))
      data[at] += (Math.random() * 2 - 1) * REVERB_EARLY_GAIN
    }
  }
  return buffer
}
//
// White noise, or brown noise (integrated white) for the low layers.
//
function noiseBuffer(ctx, brown) {
  const length = Math.floor(ctx.sampleRate * NOISE_SECONDS)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + BROWN_LEAK * white) / (1 + BROWN_LEAK)
    data[i] = brown ? last * BROWN_GAIN : white
  }
  return buffer
}
