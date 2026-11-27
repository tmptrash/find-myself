import { CFG } from '../../../cfg.js'
//
// Procedural cave ambience on the shared AudioContext (Sound.create()):
// independent drip sources with their own rhythm, pitch and pan; a faint
// rumble; rare distant pebble falls.
// Everything that should sound far away goes through a cave reverb built
// from a procedural impulse response. Plus the hero's steps on the mossy
// earth, the lantern mushroom's spring and chime and the sparkle of his
// shattering.
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
// Rumble bed: very low brown noise, its level wandering slowly at random
// (a new level every RUMBLE_HOLD..+RANGE s, RUMBLE_WANDER either way),
// eased there over PARAM_SMOOTH s.
//
const RUMBLE_LOWPASS = 120
const RUMBLE_GAIN = 0.08
const RUMBLE_WANDER = 0.35
const RUMBLE_HOLD = 1.5
const RUMBLE_HOLD_RANGE = 6
const PARAM_SMOOTH = 0.08
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
//
// A fish's splash: a lake drop (plop) from the middle, FISH_SPLASH_GAIN
// times a drip's loudness.
//
const FISH_SPLASH = { pan: 0, pitch: 420, plop: true }
const FISH_SPLASH_GAIN = 2.2
//
// The lurker's head bursting out of the water or dragging the hero under
// it: a slosh — noise through a band swept up from SLOSH_F0 to SLOSH_F1
// over SLOSH_RISE s and down to SLOSH_F2 by SLOSH_TIME, swelling in over
// SLOSH_ATTACK — and SLOSH_GULPS low gurgling bubbles (SLOSH_GULP_PITCH..
// twice it, rising by SLOSH_GULP_GLIDE) from SLOSH_GULP_FROM s on, within
// SLOSH_GULP_SPREAD s; loud SLOSH_GAIN near the hero, never under
// DRIP_FAR_FLOOR of it.
//
const SLOSH_F0 = 260
const SLOSH_F1 = 1100
const SLOSH_F2 = 320
const SLOSH_RISE = 0.12
const SLOSH_TIME = 0.6
const SLOSH_ATTACK = 0.03
const SLOSH_Q = 1.4
const SLOSH_GAIN = 0.5
const SLOSH_GULPS = 4
const SLOSH_GULP_PITCH = 180
const SLOSH_GULP_GLIDE = 2.4
const SLOSH_GULP_TAU = 0.035
const SLOSH_GULP_FROM = 0.08
const SLOSH_GULP_SPREAD = 0.35
const SLOSH_GULP_GAIN = 0.8
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
// Attack of a soft muffled pat of filtered noise (the rock footfall).
//
const PAT_ATTACK = 0.02
//
// Steps on cave rock: a soft padded footfall, no ringing tone and no
// reverb (those made it sound like a drum) — a muffled low thump of noise
// with a gentle attack and two faint grains of grit crunching under the
// foot, the second a moment later — kept soft: a low, quiet pad, the grit
// barely there. A landing is the same footfall, only a little louder and
// longer.
//
const STONE_THUD_LP = 170
const STONE_THUD_GAIN = 0.36
const STONE_STEP_TIME = 0.075
const STONE_GRIT_BAND = 1200
const STONE_GRIT_Q = 0.8
const STONE_GRIT_SHARE = 0.04
const STONE_GRIT2_SHARE = 0.025
const STONE_GRIT2_DELAY_MIN = 0.01
const STONE_GRIT2_DELAY_RANGE = 0.015
const STONE_GRIT_TIME = 0.6         // Grit length, share of the step's
const STONE_JITTER = 0.2
const STONE_LAND_GAIN = 1.25
const STONE_LAND_TIME = 1.2
//
// The lurker's jaws snapping shut on a runner: a crisp crack of noise
// (SNAP_BAND, Q SNAP_Q, SNAP_TIME s) over a short wet thump (SNAP_THUD_LP,
// SNAP_THUD_TIME s), SNAP_GAIN loud by the hero, faded with distance —
// and the shell giving way in them: SNAP_CRACKLES small dry ticks within
// SNAP_CRACKLE_SPREAD s (see TICK_ATTACK), about SNAP_CRACKLE_BAND …
// SNAP_CRACKLE_RANGE more Hz, SNAP_CRACKLE_TIME s each, SNAP_CRACKLE_SHARE
// as loud at most.
//
const SNAP_BAND = 2600
const SNAP_Q = 1.4
const SNAP_TIME = 0.05
const SNAP_THUD_LP = 320
const SNAP_THUD_TIME = 0.09
const SNAP_GAIN = 0.4
const SNAP_THUD_SHARE = 0.8
const SNAP_CRACKLES = 4
const SNAP_CRACKLE_SPREAD = 0.08
const SNAP_CRACKLE_BAND = 1900
const SNAP_CRACKLE_RANGE = 1500
const SNAP_CRACKLE_TIME = 0.022
const SNAP_CRACKLE_SHARE = 0.5
//
// A tick — one small dry crack of a shell: a narrow band of noise (Q
// TICK_Q) swelling in over TICK_ATTACK s (no click) and gone at once; a
// crackle is a few of them at uneven moments, each TICK_FADE … 1 as loud,
// at random.
//
const TICK_ATTACK = 0.002
const TICK_Q = 2.2
const TICK_FADE = 0.35
//
// A hand of the climber taking hold of the rock: a soft pat — a muffled
// low thump of noise (under GRIP_LP Hz, GRIP_TIME s, its pitch varied by
// GRIP_JITTER) with a faint grain of grit under the claws (a band about
// GRIP_GRIT_BAND Hz, Q GRIP_GRIT_Q, GRIP_GRIT_TIME s, GRIP_GRIT_SHARE as
// loud), GRIP_GAIN loud right by the hero.
//
const GRIP_GAIN = 0.42
const GRIP_LP = 520
const GRIP_TIME = 0.12
const GRIP_JITTER = 0.3
const GRIP_GRIT_BAND = 1100
const GRIP_GRIT_Q = 1
const GRIP_GRIT_TIME = 0.05
const GRIP_GRIT_SHARE = 0.12
//
// The climber's bite into flesh: its jaws' dull clamp (brown noise under
// BITE_THUD_LP Hz, BITE_THUD_TIME s), the wet tear of the meat (a band of
// noise sliding down from BITE_TEAR_F0 to BITE_TEAR_F1 Hz, BITE_TEAR_Q
// narrow, swelling in over BITE_TEAR_ATTACK s and gone by BITE_TEAR_TIME
// s, BITE_TEAR_SHARE as loud) and BITE_RIPS fibres giving way one by one
// within BITE_RIP_SPREAD s (tiny dull ticks under BITE_RIP_LP … twice
// that Hz, BITE_RIP_TIME s each, BITE_RIP_SHARE as loud).
//
const BITE_GAIN = 0.5
const BITE_THUD_LP = 240
const BITE_THUD_TIME = 0.1
const BITE_TEAR_F0 = 1500
const BITE_TEAR_F1 = 420
const BITE_TEAR_Q = 1.6
const BITE_TEAR_ATTACK = 0.012
const BITE_TEAR_TIME = 0.2
const BITE_TEAR_SHARE = 0.9
const BITE_RIPS = 5
const BITE_RIP_SPREAD = 0.13
const BITE_RIP_LP = 700
const BITE_RIP_TIME = 0.018
const BITE_RIP_SHARE = 0.7
//
// The climber's jaws on a runner — a crunch that is held back: soft and
// low underneath, lightly crisp on top, never a hard brittle break. The
// body squashed (brown noise under CRUNCH_SQUASH_LP Hz, swelling in with
// no click, as long as the jaws take and never under CRUNCH_SQUASH_MIN s,
// CRUNCH_SQUASH_SHARE as loud) and its shell crackling in the mouth:
// CRUNCH_CRACKS small dry ticks (never fewer than CRUNCH_MIN_CRACKS: a
// chew) at uneven moments within the bite's time, about CRUNCH_BAND …
// CRUNCH_BAND_RANGE more Hz, CRUNCH_TIME s each, CRUNCH_TICK_SHARE as
// loud at most. No two crunches are alike — a row of chews is not one
// sound repeated: each has its own shade, its pitch (the squash's and the
// ticks' alike) off by up to CRUNCH_TINT either way, its loudness by
// CRUNCH_LOUD_VARY, the count of its ticks by CRUNCH_COUNT_VARY, their
// length by CRUNCH_TIME_VARY.
//
const CRUNCH_GAIN = 0.3
const CRUNCH_SQUASH_LP = 480
const CRUNCH_SQUASH_MIN = 0.1
const CRUNCH_SQUASH_SHARE = 0.9
const CRUNCH_CRACKS = 7
const CRUNCH_MIN_CRACKS = 1
const CRUNCH_TINT = 0.38
const CRUNCH_LOUD_VARY = 0.3
const CRUNCH_COUNT_VARY = 0.6
const CRUNCH_TIME_VARY = 0.5
const CRUNCH_BAND = 1500
const CRUNCH_BAND_RANGE = 1200
const CRUNCH_TIME = 0.024
const CRUNCH_TICK_SHARE = 0.6
//
// A bubble popping on the lake's surface: a tiny wet "plip" — a sine
// sliding up BUBBLE_RISE times over BUBBLE_TIME s from BUBBLE_FREQ (for a
// bubble BUBBLE_REF_R px round; a smaller one higher, a bigger one lower,
// kept within BUBBLE_FREQ_MIN..MAX), BUBBLE_GAIN loud by the hero.
//
const BUBBLE_FREQ = 900
const BUBBLE_REF_R = 2
const BUBBLE_FREQ_MIN = 500
const BUBBLE_FREQ_MAX = 1800
const BUBBLE_RISE = 1.8
const BUBBLE_TIME = 0.05
const BUBBLE_GAIN = 0.05
//
// Lantern mushroom: a soft spring (no ringing chime over it).
//
const SPRING_FROM = 170
const SPRING_TO = 420
const SPRING_TIME = 0.22
const SPRING_GAIN = 0.16
//
// Hero bursting into fireflies — soft: a few low mellow chirps, each
// swelling in over SPARK_ATTACK s (no click) and fading slowly: chirp
// count, time spread, pitch and decay.
//
const SPARK_CHIRPS = 5
const SPARK_SPREAD = 0.22
const SPARK_FREQ_MIN = 660
const SPARK_FREQ_RANGE = 420
const SPARK_DROP = 0.6
const SPARK_ATTACK = 0.018
const SPARK_DECAY = 0.22
const SPARK_GAIN = 0.034
//
// The giant's breath through its nostrils. Blowing out: a wide gust of
// noise (band-passed, EXHALE_Q) falling in pitch from EXHALE_FROM to
// EXHALE_TO Hz over EXHALE_TIME s after an EXHALE_ATTACK s rise, a low
// rumble of brown noise under it (lowpass BREATH_RUMBLE_HZ, sinking by
// BREATH_RUMBLE_DROP); drawing in: quieter, rising from INHALE_FROM to
// INHALE_TO Hz, a slow INHALE_ATTACK s swell over INHALE_TIME s. Both
// partly into the cave's echo (BREATH_ECHO).
//
const EXHALE_FROM = 650
const EXHALE_TO = 200
const EXHALE_Q = 0.4
const EXHALE_ATTACK = 0.18
const EXHALE_TIME = 1.1
const EXHALE_GAIN = 0.42
const BREATH_RUMBLE_HZ = 220
const BREATH_RUMBLE_DROP = 0.6
const BREATH_RUMBLE_GAIN = 0.32
const INHALE_FROM = 260
const INHALE_TO = 560
const INHALE_Q = 0.6
const INHALE_ATTACK = 0.45
const INHALE_TIME = 0.8
const INHALE_GAIN = 0.21
const BREATH_ECHO = 0.5
const SILENT = 0.0001
const HALF = 0.5

/**
 * Creates the cave sound bus on the shared AudioContext.
 * @param {Object} sfx - Sound instance from Sound.create()
 * @param {number} [volume=1] - Starting loudness of the whole bus, 0..1
 * @returns {Object} Cave sound instance
 */
export function create(sfx, volume = 1) {
  const ctx = sfx.audioContext
  const out = ctx.createGain()
  out.gain.value = MASTER_GAIN * volume
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
    rumble: null,
    drips: DRIP_SOURCES.map(src => ({ ...src, wait: Math.random() * src.period * DRIP_PERIOD_SCALE })),
    pebbleWait: PEBBLE_EVERY_MIN + Math.random() * PEBBLE_EVERY_RANGE,
    brown: noiseBuffer(ctx, true),
    white: noiseBuffer(ctx, false),
    stopped: false
  }
}

/**
 * Starts the rumble bed.
 * @param {Object} inst - Cave sound instance
 */
export function startAmbience(inst) {
  const layer = noiseLayer(inst, inst.brown, 'lowpass', RUMBLE_LOWPASS, 1, RUMBLE_GAIN)
  inst.loops.push(layer.nodes)
  inst.rumble = { layer, hold: 0 }
}

/**
 * Ticks the rumble, drip and pebble timers; drips are louder near the hero.
 * @param {Object} inst - Cave sound instance
 * @param {number} dt - Delta time
 * @param {number} listenerY - Hero world Y
 */
export function onUpdate(inst, dt, listenerY) {
  if (inst.stopped || inst.ctx.state !== 'running') return
  inst.rumble && updateRumble(inst, dt)
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
 * Sets the loudness of the whole cave bus (the menu fades the cave in and
 * out with its row), smoothed so a frame-by-frame fade never clicks.
 * @param {Object} inst - Cave sound instance
 * @param {number} volume - 0..1
 */
export function setVolume(inst, volume) {
  if (inst.stopped) return
  setSmooth(inst.out.gain, MASTER_GAIN * volume, inst.ctx.currentTime)
}

/**
 * A fish breaking the lake's surface: a drop into the lake (a plop) at
 * its strength, faded by its distance from the hero.
 * @param {Object} inst - Cave sound instance
 * @param {number} strength - 0..1 (leaving the water is a small one)
 * @param {number} near - 0 (far) … 1 (right next to the hero)
 */
export function playFishSplash(inst, strength, near) {
  if (!ready(inst)) return
  playDrip(inst, FISH_SPLASH, Math.max(DRIP_FAR_FLOOR, near) * strength * FISH_SPLASH_GAIN)
}

/**
 * The lurker plant breaking the water: a slosh with low gurgles.
 * @param {Object} inst - Cave sound instance
 * @param {number} near - 1 by the hero, falling off with distance
 */
export function playSlosh(inst, near) {
  if (!ready(inst)) return
  const { ctx } = inst
  const at = ctx.currentTime
  const volume = Math.max(DRIP_FAR_FLOOR, near) * SLOSH_GAIN
  const src = ctx.createBufferSource()
  src.buffer = inst.white
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.Q.value = SLOSH_Q
  band.frequency.setValueAtTime(SLOSH_F0, at)
  band.frequency.exponentialRampToValueAtTime(SLOSH_F1, at + SLOSH_RISE)
  band.frequency.exponentialRampToValueAtTime(SLOSH_F2, at + SLOSH_TIME)
  const g = ctx.createGain()
  g.gain.setValueAtTime(SILENT, at)
  g.gain.exponentialRampToValueAtTime(volume, at + SLOSH_ATTACK)
  g.gain.exponentialRampToValueAtTime(SILENT, at + SLOSH_TIME)
  src.connect(band)
  band.connect(g)
  g.connect(inst.out)
  g.connect(inst.send)
  src.start(at, Math.random() * NOISE_SECONDS / 2, SLOSH_TIME * 2)
  for (let i = 0; i < SLOSH_GULPS; i++) {
    const pitch = SLOSH_GULP_PITCH * (1 + Math.random())
    dropRing(inst, at + SLOSH_GULP_FROM + Math.random() * SLOSH_GULP_SPREAD, pitch, SLOSH_GULP_GLIDE, SLOSH_GULP_TAU, volume * SLOSH_GULP_GAIN, inst.out)
  }
}

/**
 * Soft sparkle when the hero shatters into fireflies: a few low mellow
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
    g.gain.setValueAtTime(SILENT, at)
    g.gain.linearRampToValueAtTime(SPARK_GAIN, at + SPARK_ATTACK)
    g.gain.exponentialRampToValueAtTime(SILENT, at + SPARK_DECAY)
    osc.connect(g)
    g.connect(inst.out)
    osc.start(at)
    osc.stop(at + SPARK_DECAY)
  }
}

/**
 * The hero stepping or landing on the mossy earth: a soft muffled thump with a faint
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
 * The lake giant breathing through its nostrils: a blow out or a draw in.
 * @param {Object} inst - Cave sound instance
 * @param {boolean} exhale - Blowing out (else drawing in)
 * @param {number} near - Loudness by how near the hero is, 0..1
 */
export function playGiantBreath(inst, exhale, near) {
  if (!ready(inst) || near <= 0) return
  const at = inst.ctx.currentTime
  if (!exhale) {
    sweep(inst, inst.white, at, 'bandpass', INHALE_FROM, INHALE_TO, INHALE_Q, INHALE_ATTACK, INHALE_TIME, INHALE_GAIN * near)
    return
  }
  sweep(inst, inst.white, at, 'bandpass', EXHALE_FROM, EXHALE_TO, EXHALE_Q, EXHALE_ATTACK, EXHALE_TIME, EXHALE_GAIN * near)
  sweep(inst, inst.brown, at, 'lowpass', BREATH_RUMBLE_HZ, BREATH_RUMBLE_HZ * BREATH_RUMBLE_DROP, 1, EXHALE_ATTACK, EXHALE_TIME, BREATH_RUMBLE_GAIN * near)
}

/**
 * The lurker's jaws snapping shut on a runner: a crack over a wet thump,
 * the shell crackling in them.
 * @param {Object} inst - Cave sound instance
 * @param {number} near - 1 by the hero, falling off with distance
 */
export function playSnap(inst, near) {
  if (!ready(inst) || near <= 0) return
  const at = inst.ctx.currentTime
  const gain = SNAP_GAIN * near
  softBurst(inst, inst.white, at, 'bandpass', SNAP_BAND, SNAP_Q, SNAP_TIME, gain)
  softBurst(inst, inst.brown, at, 'lowpass', SNAP_THUD_LP, 1, SNAP_THUD_TIME, gain * SNAP_THUD_SHARE)
  crackle(inst, at, SNAP_CRACKLES, SNAP_CRACKLE_SPREAD, SNAP_CRACKLE_BAND, SNAP_CRACKLE_RANGE, SNAP_CRACKLE_TIME, gain * SNAP_CRACKLE_SHARE)
}

/**
 * A hand of the climber taking hold of the rock: a soft muffled pat.
 * @param {Object} inst - Cave sound instance
 * @param {number} near - 1 by the hero, falling off with distance
 */
export function playGrip(inst, near) {
  if (!ready(inst) || near <= 0) return
  const at = inst.ctx.currentTime
  const pitch = 1 + (Math.random() - HALF) * GRIP_JITTER
  const gain = GRIP_GAIN * near
  softBurst(inst, inst.brown, at, 'lowpass', GRIP_LP * pitch, 1, GRIP_TIME, gain)
  softBurst(inst, inst.white, at, 'bandpass', GRIP_GRIT_BAND * pitch, GRIP_GRIT_Q, GRIP_GRIT_TIME, gain * GRIP_GRIT_SHARE)
}

/**
 * The climber biting into what it holds: a dull clamp of jaws, the wet
 * tear of flesh and a few fibres ripping.
 * @param {Object} inst - Cave sound instance
 * @param {number} near - 1 by the hero, falling off with distance
 */
export function playBite(inst, near) {
  if (!ready(inst) || near <= 0) return
  const at = inst.ctx.currentTime
  const gain = BITE_GAIN * near
  softBurst(inst, inst.brown, at, 'lowpass', BITE_THUD_LP, 1, BITE_THUD_TIME, gain)
  sweep(inst, inst.white, at, 'bandpass', BITE_TEAR_F0, BITE_TEAR_F1, BITE_TEAR_Q, BITE_TEAR_ATTACK, BITE_TEAR_TIME, gain * BITE_TEAR_SHARE)
  for (let i = 0; i < BITE_RIPS; i++) burst(inst, at + Math.random() * BITE_RIP_SPREAD, 'lowpass', BITE_RIP_LP * (1 + Math.random()), BITE_RIP_TIME, gain * BITE_RIP_SHARE, inst.out)
}

/**
 * The climber's jaws crunching a runner: its body squashed, its shell
 * crackling lightly within `time` s — a whole bite, or (strength under 1)
 * a chew: fewer ticks, quieter.
 * @param {Object} inst - Cave sound instance
 * @param {number} near - 1 by the hero, falling off with distance
 * @param {number} strength - 1: a bite; less: a chew
 * @param {number} time - How long the jaws take (s)
 */
export function playCrunch(inst, near, strength, time) {
  if (!ready(inst) || near <= 0) return
  const at = inst.ctx.currentTime
  const tint = vary(CRUNCH_TINT)
  const gain = CRUNCH_GAIN * near * strength * vary(CRUNCH_LOUD_VARY)
  const cracks = Math.max(CRUNCH_MIN_CRACKS, Math.round(CRUNCH_CRACKS * strength * vary(CRUNCH_COUNT_VARY)))
  softBurst(inst, inst.brown, at, 'lowpass', CRUNCH_SQUASH_LP * tint, 1, Math.max(CRUNCH_SQUASH_MIN, time), gain * CRUNCH_SQUASH_SHARE)
  crackle(inst, at, cracks, time, CRUNCH_BAND * tint, CRUNCH_BAND_RANGE * tint, CRUNCH_TIME * vary(CRUNCH_TIME_VARY), gain * CRUNCH_TICK_SHARE)
}

/**
 * A bubble popping on the lake's surface: a tiny plip, higher the smaller
 * the bubble.
 * @param {Object} inst - Cave sound instance
 * @param {number} r - The bubble's radius (px)
 * @param {number} near - 1 by the hero, falling off with distance
 */
export function playBubble(inst, r, near) {
  if (!ready(inst) || near <= 0) return
  const { ctx } = inst
  const now = ctx.currentTime
  const freq = Math.max(BUBBLE_FREQ_MIN, Math.min(BUBBLE_FREQ_MAX, BUBBLE_FREQ * BUBBLE_REF_R / r))
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, now)
  osc.frequency.exponentialRampToValueAtTime(freq * BUBBLE_RISE, now + BUBBLE_TIME)
  g.gain.setValueAtTime(BUBBLE_GAIN * near, now)
  g.gain.exponentialRampToValueAtTime(SILENT, now + BUBBLE_TIME * 2)
  osc.connect(g)
  g.connect(inst.out)
  osc.start(now)
  osc.stop(now + BUBBLE_TIME * 2)
}

/**
 * A soft spring when the hero bounces off the dry mushroom.
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
// The rumble's level: a new one now and then, eased there.
//
function updateRumble(inst, dt) {
  const r = inst.rumble
  r.hold -= dt
  if (r.hold > 0) return
  r.hold = RUMBLE_HOLD + Math.random() * RUMBLE_HOLD_RANGE
  setSmooth(r.layer.gain.gain, RUMBLE_GAIN * (1 + (Math.random() * 2 - 1) * RUMBLE_WANDER), inst.ctx.currentTime)
}
function setSmooth(param, value, now) {
  param.setTargetAtTime(value, now, PARAM_SMOOTH)
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
// 1, off by up to `share` either way at random.
//
function vary(share) {
  return 1 + (Math.random() * 2 - 1) * share
}
//
// A crackle: `count` ticks at uneven moments within `spread` s, each a
// band of noise about `band` … `range` more Hz, `time` s long.
//
function crackle(inst, at, count, spread, band, range, time, gain) {
  for (let i = 0; i < count; i++) tick(inst, at + Math.random() * spread, band + Math.random() * range, time, gain * (TICK_FADE + Math.random() * (1 - TICK_FADE)))
}
function tick(inst, at, freq, time, gain) {
  const { ctx } = inst
  const src = ctx.createBufferSource()
  src.buffer = inst.white
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  filter.Q.value = TICK_Q
  const g = ctx.createGain()
  g.gain.setValueAtTime(SILENT, at)
  g.gain.linearRampToValueAtTime(gain, at + TICK_ATTACK)
  g.gain.exponentialRampToValueAtTime(SILENT, at + time)
  src.connect(filter)
  filter.connect(g)
  g.connect(inst.out)
  src.start(at, Math.random() * NOISE_SECONDS / 2, time * 2)
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
  g.gain.linearRampToValueAtTime(gain, at + PAT_ATTACK)
  g.gain.exponentialRampToValueAtTime(SILENT, at + time)
  src.connect(filter)
  filter.connect(g)
  g.connect(inst.out)
  src.start(at, Math.random() * NOISE_SECONDS / 2, time * 2)
}
//
// Filtered noise swelling in over `attack` s and dying out by `time` s,
// its filter gliding from f0 to f1 Hz; to the bus and partly the echo.
//
function sweep(inst, buffer, at, type, f0, f1, q, attack, time, gain) {
  const { ctx } = inst
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = type
  filter.frequency.setValueAtTime(f0, at)
  filter.frequency.exponentialRampToValueAtTime(f1, at + time)
  filter.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(SILENT, at)
  g.gain.linearRampToValueAtTime(gain, at + attack)
  g.gain.exponentialRampToValueAtTime(SILENT, at + time)
  const echo = ctx.createGain()
  echo.gain.value = BREATH_ECHO
  src.connect(filter)
  filter.connect(g)
  g.connect(inst.out)
  g.connect(echo)
  echo.connect(inst.send)
  src.start(at, Math.random() * NOISE_SECONDS / 2, time * 2)
}
function ready(inst) {
  return !inst.stopped && inst.ctx.state === 'running'
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
