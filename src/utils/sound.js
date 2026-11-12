import { CFG } from '../cfg.js'
/**
 * Audio context singleton
 * @returns {AudioContext} The single AudioContext instance
 */

let audioContext = null
//
// Global mute flag for procedural sounds (used during transitions)
//
let globalMuteProceduralSounds = false
//
// Single active rain loop across all Sound.create() instances (shared AudioContext)
//
//
// Forest anchor apple hitting the ground: short, soft, low thud.
//
const APPLE_THUD_VOLUME = 0.5
const APPLE_THUD_DURATION = 0.06
const APPLE_THUD_ATTACK = 0.003
const APPLE_THUD_FREQ_START = 150
const APPLE_THUD_FREQ_JITTER = 20
const APPLE_THUD_FREQ_END = 70
const APPLE_THUD_NOISE_DURATION = 0.03
const APPLE_THUD_NOISE_CUTOFF = 260
const APPLE_THUD_NOISE_Q = 0.5
const APPLE_THUD_NOISE_MIX = 0.35
const APPLE_THUD_SILENT = 0.001
//
// Menu click envelopes end at this gain (exponential ramps cannot reach 0).
//
const MENU_CLICK_SILENCE = 0.001
//
// Forest spiky tomato burst: noise blast, sub thump and a short shard rattle.
//
const TOMATO_BLAST_DURATION = 0.7
const TOMATO_BLAST_NOISE_DECAY = 9
const TOMATO_BLAST_NOISE_GAIN = 0.34
const TOMATO_BLAST_FILTER_START = 2600
const TOMATO_BLAST_FILTER_END = 260
const TOMATO_BLAST_THUMP_START = 95
const TOMATO_BLAST_THUMP_END = 32
const TOMATO_BLAST_THUMP_GAIN = 0.32
const TOMATO_BLAST_SHARD_COUNT = 6
const TOMATO_BLAST_SHARD_SPREAD = 0.22
const TOMATO_BLAST_SHARD_FREQ_MIN = 1400
const TOMATO_BLAST_SHARD_FREQ_RANGE = 1800
const TOMATO_BLAST_SHARD_DURATION = 0.05
const TOMATO_BLAST_SHARD_GAIN = 0.035
//
// A stalk-eye's indignant "hmph!" when the hero lands on it: a voiced buzz
// (a sawtooth and its octave, quieter) through a mouth-like band-pass that
// opens as the pitch jumps up from STALK_EYE_HMPH_F0 to STALK_EYE_HMPH_PEAK
// by STALK_EYE_HMPH_RISE_SEC, then drops to STALK_EYE_HMPH_F1, wobbling at
// STALK_EYE_HMPH_WOBBLE_HZ by STALK_EYE_HMPH_WOBBLE_HZ_DEPTH Hz.
//
const STALK_EYE_HMPH_SEC = 0.36
const STALK_EYE_HMPH_RISE_SEC = 0.11
const STALK_EYE_HMPH_F0 = 190
const STALK_EYE_HMPH_PEAK = 300
const STALK_EYE_HMPH_F1 = 150
const STALK_EYE_HMPH_WOBBLE_HZ = 9
const STALK_EYE_HMPH_WOBBLE_HZ_DEPTH = 14
const STALK_EYE_HMPH_FORMANT_START = 620
const STALK_EYE_HMPH_FORMANT_PEAK = 980
const STALK_EYE_HMPH_FORMANT_END = 520
const STALK_EYE_HMPH_Q = 3.5
const STALK_EYE_HMPH_GAIN = 0.16
const STALK_EYE_HMPH_OCTAVE_GAIN = 0.35
//
// Forest eye-flower grab: a leafy shiver when it notices the hero, a wet
// squeeze when the tentacles close, and a heavy earth gulp when it drags
// him under (sub thump, low rumble and a rattle of pebbles).
//
const FLOWER_RUSTLE_SEC = 0.42
const FLOWER_RUSTLE_BAND_HZ = 1900
const FLOWER_RUSTLE_Q = 1.4
const FLOWER_RUSTLE_GAIN = 0.16
const FLOWER_RUSTLE_TREMOLO_HZ = 23
const FLOWER_RUSTLE_TREMOLO_DEPTH = 0.6
const FLOWER_SQUEEZE_SEC = 0.32
const FLOWER_SQUEEZE_LP_START = 1300
const FLOWER_SQUEEZE_LP_END = 320
const FLOWER_SQUEEZE_NOISE_GAIN = 0.2
const FLOWER_SQUEEZE_TONE_START = 170
const FLOWER_SQUEEZE_TONE_END = 70
const FLOWER_SQUEEZE_TONE_GAIN = 0.16
const FLOWER_GULP_SEC = 0.9
const FLOWER_GULP_THUMP_START = 110
const FLOWER_GULP_THUMP_END = 28
const FLOWER_GULP_THUMP_GAIN = 0.42
const FLOWER_GULP_RUMBLE_LP_START = 900
const FLOWER_GULP_RUMBLE_LP_END = 140
const FLOWER_GULP_RUMBLE_GAIN = 0.3
const FLOWER_GULP_PEBBLE_COUNT = 9
const FLOWER_GULP_PEBBLE_SPREAD = 0.45
const FLOWER_GULP_PEBBLE_SEC = 0.03
const FLOWER_GULP_PEBBLE_BAND_MIN = 1800
const FLOWER_GULP_PEBBLE_BAND_RANGE = 2600
const FLOWER_GULP_PEBBLE_GAIN = 0.07
const FLOWER_SFX_ATTACK_SEC = 0.012
const FLOWER_SFX_FLOOR = 0.0001
//
// Forest propeller bud in flight: a looped band of noise chopped by its
// blades (PROP_HUM_BLADE_HZ, times the spin rate) over a soft low hum.
// The level follows the volume asked each frame (PROP_HUM_SMOOTH s), and
// PROP_HUM_RELEASE s after it drops to 0 the nodes are let go.
//
const PROP_HUM_GAIN = 0.16
const PROP_HUM_NOISE_SEC = 2
const PROP_HUM_BAND_HZ = 820
const PROP_HUM_BAND_Q = 0.9
const PROP_HUM_BLADE_HZ = 34
const PROP_HUM_CHOP_DEPTH = 0.45
const PROP_HUM_TONE_HZ = 96
const PROP_HUM_TONE_GAIN = 0.22
const PROP_HUM_SMOOTH = 0.08
const PROP_HUM_RELEASE = 0.5
//
// Jump: an upward sine sweep fading out over JUMP_SWEEP_DURATION.
//
const JUMP_SWEEP_DURATION = 0.12
const JUMP_FREQ_START = 200
const JUMP_FREQ_END = 400
const JUMP_FADE_END = 0.001
/**
 * Create sound instance with AudioContext and all audio resources
 * @returns {Object} Sound instance with context, gains, and ambient state
 */
export function create() {
  const ctx = getAudioContext()
  //
  // Create master gains for SFX (reusable)
  //
  const landGain = ctx.createGain()
  const forestSfxGain = ctx.createGain()
  forestSfxGain.gain.value = 1
  forestSfxGain.connect(ctx.destination)
  landGain.connect(forestSfxGain)

  const stepGain = ctx.createGain()
  stepGain.connect(forestSfxGain)
  const predatorFootGain = ctx.createGain()
  predatorFootGain.gain.value = 0
  predatorFootGain.connect(forestSfxGain)

  const jumpGain = ctx.createGain()
  jumpGain.gain.value = CFG.audio.sfx.jump
  jumpGain.connect(forestSfxGain)

  const spawnGain = ctx.createGain()
  spawnGain.connect(forestSfxGain)
  return {
    // Audio context
    audioContext: ctx,
    // SFX master gains
    landGain,
    stepGain,
    predatorFootGain,
    jumpGain,
    spawnGain,
    forestSfxGain,
    // Ambient music state
    ambientOscillators: [],
    ambientGains: [],
    ambientMasterGain: null,
    ambientIsPlaying: false,
    ambientNoiseNode: null,
    ambientFilterNode: null
  }
}
/**
 * Start audio context - initializes and resumes the audio context
 * Should be called once when sound instance is created
 * @param {Object} inst - Sound instance
 * @returns {Promise<void>}
 */
export async function startAudioContext(inst) {
  const ctx = inst.audioContext
  //
  // Try to start context immediately
  //
  ctx.resume().catch(() => {
    //
    // If failed, will try on first user interaction
    //
  })
  //
  // Try to resume on page load
  //
  window.addEventListener('load', () => {
    ctx.resume()
  })
}
/**
 * Resume audio context (useful for user interactions)
 * @param {Object} inst - Sound instance
 * @returns {Promise<void>}
 */
export async function resumeAudioContext(inst) {
  const ctx = inst.audioContext
  if (ctx && ctx.state === 'suspended') {
    await ctx.resume()
  }
}
// ============================================
// AMBIENT MUSIC FUNCTIONS
// ============================================
/**
 * Start ambient music
 * @param {Object} instance - Sound instance
 */
export async function startAmbient(instance) {
  initAmbient(instance)
  // Remember if context was suspended
  const wasSuspended = instance.audioContext.state === 'suspended'
  // Make sure context is started
  if (wasSuspended) {
    try {
      await resumeAudioContext(instance)
    } catch (e) {
      // Set flag that music is NOT playing
      instance.ambientIsPlaying = false
      return
    }
  }
  // CRITICAL CHECK: if context is still not running after resume,
  // DON'T create oscillators (they will wait and start on first interaction)
  if (instance.audioContext.state !== 'running') {
    instance.ambientIsPlaying = false
    return
  }
  // If music is actually playing (not just flag, but really), don't restart
  if (isAmbientPlaying(instance) && !wasSuspended) {
    return
  }
  // If context was suspended or there are "dead" oscillators, clean them
  if (instance.ambientOscillators.length > 0) {
    stopAmbient(instance)
    // Small delay for cleanup
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  instance.ambientIsPlaying = true
  //
  // Low drone (foundation) - use config
  //
  createDrone(instance, 55, CFG.audio.ambient.bass)
  createDrone(instance, 82.5, CFG.audio.ambient.bass * 0.75)
  createDrone(instance, 110, CFG.audio.ambient.bass * 0.625)
  //
  // Mid tones (mystery) - use config
  //
  createOscillatingDrone(instance, 220, CFG.audio.ambient.mid, 0.002)
  createOscillatingDrone(instance, 329.63, CFG.audio.ambient.mid * 0.67, 0.003)
  //
  // High ghostly tones - use config
  //
  createOscillatingDrone(instance, 440, CFG.audio.ambient.high, 0.001)
  createOscillatingDrone(instance, 554.37, CFG.audio.ambient.high * 0.67, 0.0015)
  //
  // Add noise for atmosphere (electric tension sound)
  //
  createNoise(instance)
}
/**
 * Stop ambient music
 * @param {Object} instance - Sound instance
 */
export function stopAmbient(instance) {
  instance.ambientIsPlaying = false
  // Immediately stop all oscillators
  instance.ambientOscillators.forEach(osc => {
    try {
      osc.stop()
      osc.disconnect()
    } catch (e) {
      // Oscillator already stopped
    }
  })

  if (instance.ambientNoiseNode) {
    try {
      instance.ambientNoiseNode.stop()
      instance.ambientNoiseNode.disconnect()
    } catch (e) {
      // Node already stopped
    }
  }
  // Disconnect all gain nodes
  instance.ambientGains.forEach(gain => {
    try {
      gain.disconnect()
    } catch (e) {
      // Gain already disconnected
    }
  })
  // Reset master channel volume (from config)
  if (instance.ambientMasterGain) {
    instance.ambientMasterGain.gain.cancelScheduledValues(instance.audioContext.currentTime)
    instance.ambientMasterGain.gain.value = CFG.audio.ambient.volume
  }

  instance.ambientOscillators = []
  instance.ambientGains = []
  instance.ambientNoiseNode = null
}
/**
 * Set ambient volume
 * @param {Object} instance - Sound instance
 * @param {number} volume - Volume level (0-1)
 */
export function setAmbientVolume(instance, volume) {
  if (instance.ambientMasterGain) {
    instance.ambientMasterGain.gain.value = volume
  }
}
//
// Plain HTML5 Audio for the forest ear-tree whisper.mp3 loop — deliberately
// bypasses Kaplay's own sound system for the same reason as water-steps (see
// that section below): a k.play() lookup made while any unrelated background
// asset is still loading can silently no-op with no error, which is exactly
// what made the ear-tree whisper never actually play. A single looping
// <audio> element, unlocked by an early user gesture, plays reliably.
//
const EAR_TREE_WHISPER_URL = './sounds/whisper.mp3'
let earTreeWhisperAudio = null
function getEarTreeWhisperAudio() {
  if (earTreeWhisperAudio) return earTreeWhisperAudio
  earTreeWhisperAudio = new Audio(EAR_TREE_WHISPER_URL)
  earTreeWhisperAudio.loop = true
  earTreeWhisperAudio.volume = 0
  earTreeWhisperAudio.preload = 'auto'
  return earTreeWhisperAudio
}
/**
 * Unlocks the ear-tree whisper HTML5 audio element. Call once from a real
 * user gesture (keydown/pointerdown/touchstart) so the first real fade-in is
 * never the very first play() attempt on this element.
 */
export function unlockEarTreeWhisperAudio() {
  const audio = getEarTreeWhisperAudio()
  const restoreVolume = audio.volume
  audio.volume = 0
  audio.play().then(() => {
    audio.pause()
    audio.currentTime = 0
    audio.volume = restoreVolume
  }).catch(() => {})
}
/**
 * Fades the ear-tree whisper loop in or out by proximity.
 * @param {number} volume - Target volume 0..1
 */
export function setEarTreeWhisperVolume(volume) {
  const audio = getEarTreeWhisperAudio()
  const v = Math.max(0, Math.min(1, volume))
  audio.volume = v
  if (v <= 0.001) {
    //
    // Rewind on fade-out (not just pause) so walking away and back plays
    // the whisper from the start every time, instead of resuming mid-loop.
    //
    if (!audio.paused) {
      audio.pause()
      audio.currentTime = 0
    }
    return
  }
  if (audio.paused) {
    audio.play().catch(() => {})
  }
}
/**
 * Rewinds the ear-tree whisper loop to the start while it is audible.
 * Used when the hero turns back toward a lip-tree after moving away.
 */
export function rewindEarTreeWhisperToStart() {
  const audio = earTreeWhisperAudio
  if (!audio || audio.paused || audio.volume <= 0.001) return
  audio.currentTime = 0
}
/**
 * Check if ambient music is actually playing
 * @param {Object} instance - Sound instance
 * @returns {boolean} True if music is actively playing
 */
export function isAmbientPlaying(instance) {
  return instance.ambientIsPlaying &&
         instance.audioContext &&
         instance.audioContext.state === 'running' &&
         instance.ambientOscillators.length > 0
}
// ============================================
// AMBIENT MUSIC INTERNAL FUNCTIONS
// ============================================
/**
 * Create drone with frequency modulation
 * @param {Object} instance - Sound instance
 * @param {number} baseFrequency - Base frequency in Hz
 * @param {number} volume - Volume level
 * @param {number} modulationDepth - Modulation depth
 */
/**
 * Play random short sound
 * @param {Object} instance - Sound instance
 */
// ============================================
// SOUND EFFECTS FUNCTIONS
// ============================================
//
// A Web Audio AudioContext can drop from 'running' to 'suspended' mid-session
// on its own (browser power-saving after a stretch of no audio activity, a
// brief tab-focus loss that doesn't fully background the page, etc.) — with
// no error and no console warning. Every procedural SFX call after that point
// schedules its oscillators/gains exactly as before, but nothing is audible
// until the context resumes, and nothing here ever resumed it again: confirmed
// live by forcing audioContext.suspend() mid-session and repeating real
// jump-and-land cycles — every single landing kept silently scheduling sound
// on the still-suspended context forever, matching the reported "landing
// sound sometimes just doesn't play, works other times" (this exact context
// can go suspended on some play sessions and not others, hence the
// intermittency, unlike a deterministic "always broken" bug). Call this first
// in any procedural SFX entry point so a suspended context self-heals instead
// of staying silently dead for the rest of the session.
//
// @param {Object} instance - Sound instance
//
function resumeAudioContextIfSuspended(instance) {
  instance?.audioContext?.state === 'suspended' &&
    instance.audioContext.resume().catch(() => {})
}
/**
 * Play landing sound effect
 * @param {Object} instance - Sound instance from create()
 * @param {string} [currentLevel] - Current level name to determine sound type
 */
export function playLandSound(instance, currentLevel = null) {
  resumeAudioContextIfSuspended(instance)
  if (!instance?.audioContext || instance.audioContext.state !== 'running') return
  if (instance._forestSfxMuted) return
  const now = instance.audioContext.currentTime
  const isForestSection = currentLevel && currentLevel.startsWith('lesson-forest.')
  if (isForestSection) {
    if (instance._forestSurface === 'water') return
    //
    // Dedicated land hits (same family as steps, louder, via landGain)
    //
    instance._forestSurface === 'wood'
      ? playForestWoodKnockLand(instance)
      : playForestGroundLand(instance)
  } else {
    //
    // Normal landing sound (outside the forest)
    //
    const oscillator = instance.audioContext.createOscillator()
    const envelope = instance.audioContext.createGain()
    
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(CFG.audio.sfx.landFreqStart, now)
    oscillator.frequency.exponentialRampToValueAtTime(CFG.audio.sfx.landFreqEnd, now + 0.08)
    
    envelope.gain.setValueAtTime(CFG.audio.sfx.land, now)
    envelope.gain.exponentialRampToValueAtTime(CFG.audio.sfx.landFade, now + CFG.audio.sfx.landDuration)
    //
    // Connect through master gain
    //
    oscillator.connect(envelope)
    envelope.connect(instance.landGain)
    
    oscillator.start(now)
    oscillator.stop(now + CFG.audio.sfx.landDuration)
  }
}

/**
 * Play jump sound effect (upward bounce)
 * @param {Object} instance - Sound instance from create()
 */
export function playJumpSound(instance) {
  resumeAudioContextIfSuspended(instance)
  if (instance?._forestSfxMuted) return
  const now = instance.audioContext.currentTime
  const jump = instance.audioContext.createOscillator()
  const envelope = instance.audioContext.createGain()
  jump.type = 'sine'
  jump.frequency.setValueAtTime(JUMP_FREQ_START, now)
  jump.frequency.exponentialRampToValueAtTime(JUMP_FREQ_END, now + JUMP_SWEEP_DURATION)
  envelope.gain.setValueAtTime(1, now)
  envelope.gain.exponentialRampToValueAtTime(JUMP_FADE_END, now + JUMP_SWEEP_DURATION)
  jump.connect(envelope)
  envelope.connect(instance.jumpGain)
  jump.start(now)
  jump.stop(now + JUMP_SWEEP_DURATION)
}
/**
 * Play step sound effect
 * @param {Object} instance - Sound instance from create()
 * @param {string} [currentLevel] - Current level name to determine sound type
 */
export function playStepSound(instance, currentLevel = null) {
  resumeAudioContextIfSuspended(instance)
  if (instance?._forestSfxMuted) return
  const now = instance.audioContext.currentTime
  const isForestSection = currentLevel && currentLevel.startsWith('lesson-forest.')
  if (isForestSection) {
    if (instance._forestSurface === 'water') return
    instance._forestSurface === 'wood'
      ? playForestWoodKnockStep(instance)
      : playForestGroundStep(instance)
  } else {
    //
    // Normal step sound (outside the forest)
    //
    const oscillator = instance.audioContext.createOscillator()
    const envelope = instance.audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(CFG.audio.sfx.stepFreqStart, now)
    oscillator.frequency.exponentialRampToValueAtTime(CFG.audio.sfx.stepFreqEnd, now + 0.03)

    envelope.gain.setValueAtTime(CFG.audio.sfx.step, now)
    envelope.gain.exponentialRampToValueAtTime(CFG.audio.sfx.stepFade, now + CFG.audio.sfx.stepDuration)
    //
    // Connect through master gain
    //
    oscillator.connect(envelope)
    envelope.connect(instance.stepGain)

    oscillator.start(now)
    oscillator.stop(now + CFG.audio.sfx.stepDuration)
  }
}






//
// Forest section: dull muffled step on dry earth.
//
function playForestGroundStep(instance) {
  const now = instance.audioContext.currentTime
  const duration = 0.08
  const bufferSize = instance.audioContext.sampleRate * duration
  const noiseBuffer = instance.audioContext.createBuffer(1, bufferSize, instance.audioContext.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    noiseData[i] = Math.random() * 2 - 1
  }
  const noiseSource = instance.audioContext.createBufferSource()
  noiseSource.buffer = noiseBuffer
  const filter = instance.audioContext.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(160, now)
  filter.frequency.linearRampToValueAtTime(80, now + duration)
  filter.Q.value = 0.25
  const envelope = instance.audioContext.createGain()
  envelope.gain.setValueAtTime(0.001, now)
  envelope.gain.linearRampToValueAtTime(CFG.audio.sfx.step * 1.6, now + 0.012)
  envelope.gain.exponentialRampToValueAtTime(0.001, now + duration)
  noiseSource.connect(filter)
  filter.connect(envelope)
  envelope.connect(instance.stepGain)
  noiseSource.start(now)
  noiseSource.stop(now + duration)
}

//
// Forest section: dull muffled landing on dry earth (same timbre as step, louder).
//
function playForestGroundLand(instance) {
  const now = instance.audioContext.currentTime
  const duration = 0.11
  const bufferSize = instance.audioContext.sampleRate * duration
  const noiseBuffer = instance.audioContext.createBuffer(1, bufferSize, instance.audioContext.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    noiseData[i] = Math.random() * 2 - 1
  }
  const noiseSource = instance.audioContext.createBufferSource()
  noiseSource.buffer = noiseBuffer
  const filter = instance.audioContext.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(180, now)
  filter.frequency.linearRampToValueAtTime(90, now + duration)
  filter.Q.value = 0.25
  const envelope = instance.audioContext.createGain()
  envelope.gain.setValueAtTime(0.001, now)
  envelope.gain.linearRampToValueAtTime(CFG.audio.sfx.land * 2.0, now + 0.012)
  envelope.gain.exponentialRampToValueAtTime(0.001, now + duration)
  noiseSource.connect(filter)
  filter.connect(envelope)
  envelope.connect(instance.landGain)
  noiseSource.start(now)
  noiseSource.stop(now + duration)
}
//
// Mutes or restores predator foot SFX (cuts active one-shots via master gain).
//
export function setForestPredatorFootGain(instance, gain) {
  const g = instance.predatorFootGain
  if (!g) return
  const now = instance.audioContext.currentTime
  g.gain.cancelScheduledValues(now)
  g.gain.setValueAtTime(gain > 0.001 ? 1 : 0, now)
}
//
// Soft tap when a predator leg plants on the ground (many legs — keep quiet).
//
export function playForestPredatorFootstep(instance) {
  const footGain = instance.predatorFootGain ?? instance.stepGain
  const now = instance.audioContext.currentTime
  const duration = 0.052
  const bufferSize = instance.audioContext.sampleRate * duration
  const noiseBuffer = instance.audioContext.createBuffer(1, bufferSize, instance.audioContext.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize
    noiseData[i] = (Math.random() * 2 - 1) * (1 - t * 0.85) * 0.55
  }
  const noiseSource = instance.audioContext.createBufferSource()
  noiseSource.buffer = noiseBuffer
  const filter = instance.audioContext.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(220, now)
  filter.frequency.linearRampToValueAtTime(128, now + duration)
  filter.Q.value = 0.2
  const envelope = instance.audioContext.createGain()
  envelope.gain.setValueAtTime(0.001, now)
  envelope.gain.linearRampToValueAtTime(CFG.audio.sfx.step * CFG.audio.sfx.predatorFootNoise, now + 0.01)
  envelope.gain.exponentialRampToValueAtTime(0.001, now + duration)
  const thump = instance.audioContext.createOscillator()
  thump.type = 'sine'
  thump.frequency.setValueAtTime(92, now)
  thump.frequency.exponentialRampToValueAtTime(58, now + duration)
  const thumpGain = instance.audioContext.createGain()
  thumpGain.gain.setValueAtTime(0.001, now)
  thumpGain.gain.linearRampToValueAtTime(CFG.audio.sfx.step * CFG.audio.sfx.predatorFootThump, now + 0.008)
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  noiseSource.connect(filter)
  filter.connect(envelope)
  envelope.connect(footGain)
  thump.connect(thumpGain)
  thumpGain.connect(footGain)
  noiseSource.start(now)
  noiseSource.stop(now + duration)
  thump.start(now)
  thump.stop(now + duration)
}

/**
 * Forest spiky tomato explosion — a muffled noise blast with a sub thump and a
 * few bright shard ticks scattered right after the impact.
 * @param {Object} instance - Sound instance from create()
 */
/**
 * Short creak when a lip-tree rocks from a nearby landing jolt.
 * @param {Object} instance - Sound instance from create()
 */
export function playForestEarTreeShake(instance) {
  if (!instance?.audioContext) return
  playForestSoftWoodImpact(instance, instance.landGain, CFG.audio.sfx.land * 0.55, 0.11)
}

//
// Anchor apple knocked from the start branch — soft padded thump when it drops.
//
export function playForestAppleSoftFall(instance) {
  if (!instance?.audioContext) return
  playForestAppleSoftImpact(instance, instance.landGain, CFG.audio.sfx.land * APPLE_THUD_VOLUME)
}

export function playForestTomatoExplosion(instance) {
  if (!instance?.audioContext) return
  const ctx = instance.audioContext
  const out = instance.forestSfxGain || ctx.destination
  const now = ctx.currentTime
  const size = Math.floor(ctx.sampleRate * TOMATO_BLAST_DURATION)
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < size; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-(i / size) * TOMATO_BLAST_NOISE_DECAY)
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(TOMATO_BLAST_FILTER_START, now)
  filter.frequency.exponentialRampToValueAtTime(TOMATO_BLAST_FILTER_END, now + TOMATO_BLAST_DURATION)
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(TOMATO_BLAST_NOISE_GAIN, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + TOMATO_BLAST_DURATION)
  noise.connect(filter)
  filter.connect(noiseGain)
  noiseGain.connect(out)
  const thump = ctx.createOscillator()
  thump.type = 'sine'
  thump.frequency.setValueAtTime(TOMATO_BLAST_THUMP_START, now)
  thump.frequency.exponentialRampToValueAtTime(TOMATO_BLAST_THUMP_END, now + TOMATO_BLAST_DURATION)
  const thumpGain = ctx.createGain()
  thumpGain.gain.setValueAtTime(0.001, now)
  thumpGain.gain.linearRampToValueAtTime(TOMATO_BLAST_THUMP_GAIN, now + 0.015)
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + TOMATO_BLAST_DURATION)
  thump.connect(thumpGain)
  thumpGain.connect(out)
  noise.start(now)
  noise.stop(now + TOMATO_BLAST_DURATION)
  thump.start(now)
  thump.stop(now + TOMATO_BLAST_DURATION)
  for (let i = 0; i < TOMATO_BLAST_SHARD_COUNT; i++) {
    playTomatoShardTick(ctx, out, now + Math.random() * TOMATO_BLAST_SHARD_SPREAD)
  }
}



//
// Forest section: deep wooden knock on branches and log platforms.
//
function playForestWoodKnockLand(instance) {
  playForestSoftWoodImpact(instance, instance.landGain, CFG.audio.sfx.land * 1.4, 0.1)
}

function playForestWoodKnockStep(instance) {
  playForestSoftWoodImpact(instance, instance.stepGain, CFG.audio.sfx.step * 1.2, 0.07)
}

//
// Apple on soft forest floor: a dull low "tuk" — a quick sine body dropping
// in pitch plus a heavily muffled noise puff, both gone within ~60 ms.
//
function playForestAppleSoftImpact(instance, destinationGain, peakAmp) {
  const ctx = instance.audioContext
  const now = ctx.currentTime
  const end = now + APPLE_THUD_DURATION
  const bufferSize = Math.floor(ctx.sampleRate * APPLE_THUD_NOISE_DURATION)
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(APPLE_THUD_NOISE_CUTOFF, now)
  filter.Q.value = APPLE_THUD_NOISE_Q
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(peakAmp * APPLE_THUD_NOISE_MIX, now)
  noiseGain.gain.exponentialRampToValueAtTime(APPLE_THUD_SILENT, now + APPLE_THUD_NOISE_DURATION)
  noise.connect(filter)
  filter.connect(noiseGain)
  noiseGain.connect(destinationGain)
  noise.start(now)
  noise.stop(now + APPLE_THUD_NOISE_DURATION)
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(APPLE_THUD_FREQ_START + Math.random() * APPLE_THUD_FREQ_JITTER, now)
  osc.frequency.exponentialRampToValueAtTime(APPLE_THUD_FREQ_END, end)
  const oscGain = ctx.createGain()
  oscGain.gain.setValueAtTime(APPLE_THUD_SILENT, now)
  oscGain.gain.linearRampToValueAtTime(peakAmp, now + APPLE_THUD_ATTACK)
  oscGain.gain.exponentialRampToValueAtTime(APPLE_THUD_SILENT, end)
  osc.connect(oscGain)
  oscGain.connect(destinationGain)
  osc.start(now)
  osc.stop(end)
}

//
// Soft padded wood step — muffled thump similar to mushroom-trampoline bounce.
//

function playForestSoftWoodImpact(instance, destinationGain, peakAmp, duration) {
  const ctx = instance.audioContext
  const now = ctx.currentTime
  const bufferSize = Math.floor(ctx.sampleRate * duration)
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(520, now)
  filter.frequency.linearRampToValueAtTime(280, now + duration)
  filter.Q.value = 0.4
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.001, now)
  noiseGain.gain.linearRampToValueAtTime(peakAmp * 0.65, now + 0.006)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  noise.connect(filter)
  filter.connect(noiseGain)
  noiseGain.connect(destinationGain)
  noise.start(now)
  noise.stop(now + duration + 0.02)
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(340 + Math.random() * 40, now)
  osc.frequency.exponentialRampToValueAtTime(180, now + duration)
  const oscGain = ctx.createGain()
  oscGain.gain.setValueAtTime(0.001, now)
  oscGain.gain.linearRampToValueAtTime(peakAmp * 0.35, now + 0.008)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  osc.connect(oscGain)
  oscGain.connect(destinationGain)
  osc.start(now)
  osc.stop(now + duration + 0.02)
}


/**
 * Play crunch sound (for creature walking) - crispy, crunchy footstep
 * @param {Object} instance - Sound instance from create()
 */
export function playCrunchSound(instance) {
  const now = instance.audioContext.currentTime
  const duration = 0.08
  
  //
  // Create white noise buffer for crunch texture
  //
  const bufferSize = instance.audioContext.sampleRate * duration
  const buffer = instance.audioContext.createBuffer(1, bufferSize, instance.audioContext.sampleRate)
  const data = buffer.getChannelData(0)
  
  //
  // Fill with white noise and apply amplitude envelope in buffer for crisp attack
  //
  for (let i = 0; i < bufferSize; i++) {
    const progress = i / bufferSize
    const envelopeShape = Math.exp(-progress * 8)  // Fast decay for crisp, crunchy attack
    data[i] = (Math.random() * 2 - 1) * envelopeShape
  }
  
  //
  // Create buffer source
  //
  const noise = instance.audioContext.createBufferSource()
  noise.buffer = buffer
  
  //
  // Low oscillator for impact "thud" (footstep weight)
  //
  const thud = instance.audioContext.createOscillator()
  thud.type = 'sine'
  thud.frequency.setValueAtTime(80, now)
  thud.frequency.exponentialRampToValueAtTime(40, now + 0.05)
  
  const thudGain = instance.audioContext.createGain()
  thudGain.gain.setValueAtTime(0.3, now)
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
  
  //
  // Main envelope for noise (very fast attack for crunch)
  //
  const envelope = instance.audioContext.createGain()
  envelope.gain.setValueAtTime(0, now)
  envelope.gain.linearRampToValueAtTime(CFG.audio.sfx.step * 0.6, now + 0.003)  // Very fast attack, slightly quieter
  envelope.gain.exponentialRampToValueAtTime(0.001, now + duration)
  
  //
  // High-pass filter for crispness (cut the low rumble)
  //
  const hpFilter = instance.audioContext.createBiquadFilter()
  hpFilter.type = 'highpass'
  hpFilter.frequency.value = 1200  // Higher cutoff for crispy sound
  hpFilter.Q.value = 0.5
  
  //
  // Band-pass filter to shape crunch character
  //
  const bpFilter = instance.audioContext.createBiquadFilter()
  bpFilter.type = 'bandpass'
  bpFilter.frequency.value = 2500  // High frequencies for crunch
  bpFilter.Q.value = 1.5  // Focused crunch
  
  //
  // Connect noise path: noise → envelope → highpass → bandpass → stepGain
  //
  noise.connect(envelope)
  envelope.connect(hpFilter)
  hpFilter.connect(bpFilter)
  bpFilter.connect(instance.stepGain)  // Use master step gain
  
  //
  // Connect thud path: thud → thudGain → stepGain
  //
  thud.connect(thudGain)
  thudGain.connect(instance.stepGain)  // Use master step gain
  
  //
  // Start both sources
  //
  noise.start(now)
  thud.start(now)
  thud.stop(now + 0.05)
}

/**
 * Plays the short dry "click" of switching the selected level in the menu:
 * a high-passed noise snap plus a quick falling sine blip.
 * @param {Object} instance - Sound instance from create()
 */
export function playMenuClickSound(instance) {
  const cfg = CFG.audio.sfx.menuClick
  const ctx = instance.audioContext
  const now = ctx.currentTime
  const end = now + cfg.duration
  const frames = Math.ceil(ctx.sampleRate * cfg.duration)
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames)
  const tone = ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.setValueAtTime(cfg.lowpass, now)
  tone.connect(instance.spawnGain)
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const highpass = ctx.createBiquadFilter()
  highpass.type = 'highpass'
  highpass.frequency.setValueAtTime(cfg.noiseHighpass, now)
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(MENU_CLICK_SILENCE, now)
  noiseGain.gain.linearRampToValueAtTime(cfg.volume, now + cfg.attack)
  noiseGain.gain.exponentialRampToValueAtTime(MENU_CLICK_SILENCE, end)
  noise.connect(highpass)
  highpass.connect(noiseGain)
  noiseGain.connect(tone)
  const blip = ctx.createOscillator()
  blip.type = 'sine'
  blip.frequency.setValueAtTime(cfg.blipFreqStart, now)
  blip.frequency.exponentialRampToValueAtTime(cfg.blipFreqEnd, end)
  const blipGain = ctx.createGain()
  blipGain.gain.setValueAtTime(MENU_CLICK_SILENCE, now)
  blipGain.gain.linearRampToValueAtTime(cfg.blipVolume, now + cfg.attack)
  blipGain.gain.exponentialRampToValueAtTime(MENU_CLICK_SILENCE, end)
  blip.connect(blipGain)
  blipGain.connect(tone)
  noise.start(now)
  noise.stop(end)
  blip.start(now)
  blip.stop(end)
}
/**
 * Play evil laugh sound effect (sinister laugh for life counter)
 * @param {Object} instance - Sound instance
 */
/**
 * Play victory sound (ascending bright tones)
 * @param {Object} instance - Sound instance
 */
/**
 * Play a soft, gentle sound when the hero dies
 * @param {Object} instance - Sound instance
 */
export function playGentleLifeSound(instance) {
  if (instance?._forestSfxMuted) return
  const { audioContext } = instance
  const now = audioContext.currentTime
  //
  // Soft descending sine tone: empathetic, not harsh
  //
  const osc = audioContext.createOscillator()
  const gain = audioContext.createGain()
  const filter = audioContext.createBiquadFilter()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(520, now)
  osc.frequency.exponentialRampToValueAtTime(260, now + 0.9)
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(1200, now)
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.14, now + 0.06)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0)
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(audioContext.destination)
  osc.start(now)
  osc.stop(now + 1.1)
}
/**
 * Play a soft, gentle letter pickup chime
 * @param {Object} instance - Sound instance from create()
 */
export function playLetterPickupSoft(instance) {
  if (instance?._forestSfxMuted) return
  const now = instance.audioContext.currentTime
  const duration = 0.55
  //
  // Warm triangle wave — softer timbre than sine
  //
  const osc = instance.audioContext.createOscillator()
  const gain = instance.audioContext.createGain()
  const filter = instance.audioContext.createBiquadFilter()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(523, now)
  osc.frequency.exponentialRampToValueAtTime(659, now + 0.18)
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(1400, now)
  filter.Q.value = 0.5
  //
  // Quiet attack, gentle decay — no sustain plateau
  //
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.exponentialRampToValueAtTime(0.07, now + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(instance.forestSfxGain || instance.audioContext.destination)
  osc.start(now)
  osc.stop(now + duration)
  //
  // Soft overtone a fifth above for warmth
  //
  const osc2 = instance.audioContext.createOscillator()
  const gain2 = instance.audioContext.createGain()
  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(784, now)
  osc2.frequency.exponentialRampToValueAtTime(988, now + 0.18)
  gain2.gain.setValueAtTime(0.001, now)
  gain2.gain.exponentialRampToValueAtTime(0.035, now + 0.03)
  gain2.gain.exponentialRampToValueAtTime(0.001, now + duration)
  osc2.connect(gain2)
  gain2.connect(instance.audioContext.destination)
  osc2.start(now)
  osc2.stop(now + duration)
}







//
// Private functions
//
/**
 * Get or create global AudioContext
 * @returns {AudioContext} The single AudioContext instance
 */
function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }

  return audioContext
}
/**
 * Initialize ambient music (internal)
 * @param {Object} instance - Sound instance
 */
function initAmbient(instance) {
  if (instance.ambientMasterGain) return
  //
  // Master volume control (from config)
  //
  instance.ambientMasterGain = instance.audioContext.createGain()
  instance.ambientMasterGain.gain.value = CFG.audio.ambient.volume
  instance.ambientMasterGain.connect(instance.audioContext.destination)
}
/**
 * Create simple drone
 * @param {Object} instance - Sound instance
 * @param {number} frequency - Frequency in Hz
 * @param {number} volume - Volume level
 */
function createDrone(instance, frequency, volume) {
  try {
    const oscillator = instance.audioContext.createOscillator()
    const gain = instance.audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = frequency

    gain.gain.value = 0
    gain.gain.linearRampToValueAtTime(volume, instance.audioContext.currentTime + CFG.audio.ambient.fadeInTime)

    oscillator.connect(gain)
    gain.connect(instance.ambientMasterGain)

    oscillator.start()

    instance.ambientOscillators.push(oscillator)
    instance.ambientGains.push(gain)
  } catch (e) {
    // Ignore errors
  }
}
/**
 * Create drone with frequency modulation
 * @param {Object} instance - Sound instance
 * @param {number} baseFrequency - Base frequency in Hz
 * @param {number} volume - Volume level
 * @param {number} modulationDepth - Modulation depth
 */
function createOscillatingDrone(instance, baseFrequency, volume, modulationDepth) {
  const oscillator = instance.audioContext.createOscillator()
  const gain = instance.audioContext.createGain()
  const lfo = instance.audioContext.createOscillator()
  const lfoGain = instance.audioContext.createGain()

  oscillator.type = 'triangle'
  oscillator.frequency.value = baseFrequency
  // LFO for frequency modulation
  lfo.type = 'sine'
  lfo.frequency.value = Math.random() * 0.3 + 0.1 // 0.1-0.4 Hz
  lfoGain.gain.value = baseFrequency * modulationDepth

  lfo.connect(lfoGain)
  lfoGain.connect(oscillator.frequency)

  gain.gain.value = 0
  gain.gain.linearRampToValueAtTime(volume, instance.audioContext.currentTime + CFG.audio.ambient.fadeInTime)

  oscillator.connect(gain)
  gain.connect(instance.ambientMasterGain)

  oscillator.start()
  lfo.start()

  instance.ambientOscillators.push(oscillator)
  instance.ambientOscillators.push(lfo)
  instance.ambientGains.push(gain)
}
/**
 * Create white noise
 * @param {Object} instance - Sound instance
 */
function createNoise(instance) {
  // Create white noise
  const bufferSize = instance.audioContext.sampleRate * 2
  const buffer = instance.audioContext.createBuffer(1, bufferSize, instance.audioContext.sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  instance.ambientNoiseNode = instance.audioContext.createBufferSource()
  instance.ambientNoiseNode.buffer = buffer
  instance.ambientNoiseNode.loop = true
  // Filter for noise
  instance.ambientFilterNode = instance.audioContext.createBiquadFilter()
  instance.ambientFilterNode.type = 'lowpass'
  instance.ambientFilterNode.frequency.value = 200
  instance.ambientFilterNode.Q.value = 0.5

  const noiseGain = instance.audioContext.createGain()
  noiseGain.gain.value = CFG.audio.ambient.noise

  instance.ambientNoiseNode.connect(instance.ambientFilterNode)
  instance.ambientFilterNode.connect(noiseGain)
  noiseGain.connect(instance.ambientMasterGain)

  instance.ambientNoiseNode.start()
}


/**
 * Soft humming/whistling note used as the default hero idle vocalization.
 * One note plays per call — schedule several to imply a slow tune. A flute-like
 * triangle wave with a vibrato adds the "humming" quality, while the
 * `whistleMode` flag swaps it for a thinner, breathy sine + filtered noise so
 * the hero appears to be lightly whistling in tutorial scenes.
 * @param {Object} inst - Sound instance from create()
 * @param {Object} [config] - Note parameters
 * @param {number} [config.delay=0] - Schedule offset in seconds
 * @param {number} [config.frequency=440] - Base pitch (Hz)
 * @param {number} [config.duration=0.55] - Note length in seconds
 * @param {boolean} [config.whistleMode=false] - Use a breathier whistle timbre
 * @param {number} [config.volume=1] - Per-note gain multiplier
 */
export function playIdleHumNote(inst, config = {}) {
  if (!inst?.audioContext || inst._forestSfxMuted) return
  const ctx = inst.audioContext
  if (ctx.state === 'suspended') {
    ctx.resume()
  }
  const {
    delay = 0,
    frequency = 440,
    duration = 0.55,
    whistleMode = false,
    volume = 1
  } = config
  const now = ctx.currentTime + delay
  //
  // Master keeps the idle humming quiet enough to sit under sfx and ambience.
  //
  const master = ctx.createGain()
  master.gain.setValueAtTime((whistleMode ? 0.05 : 0.07) * volume, now)
  master.connect(ctx.destination)
  //
  // Soft low-pass smooths digital harshness for the humming variant.
  //
  const filter = ctx.createBiquadFilter()
  filter.type = whistleMode ? 'bandpass' : 'lowpass'
  filter.frequency.setValueAtTime(whistleMode ? frequency * 1.2 : 1800, now)
  filter.Q.value = whistleMode ? 8 : 0.6
  filter.connect(master)
  //
  // LFO adds a tiny vibrato so the note feels human instead of mechanical.
  //
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.setValueAtTime(whistleMode ? 6 : 4.5, now)
  const lfoGain = ctx.createGain()
  lfoGain.gain.setValueAtTime(whistleMode ? 6 : 3, now)
  lfo.connect(lfoGain)
  //
  // Carrier — whistle uses a pure sine, humming uses triangle for warmth.
  //
  const osc = ctx.createOscillator()
  osc.type = whistleMode ? 'sine' : 'triangle'
  osc.frequency.setValueAtTime(frequency, now)
  lfoGain.connect(osc.frequency)
  //
  // Smooth bell-shaped envelope: gentle attack, hold, soft release.
  //
  const env = ctx.createGain()
  env.gain.setValueAtTime(0, now)
  env.gain.linearRampToValueAtTime(1, now + 0.12)
  env.gain.linearRampToValueAtTime(0.85, now + duration * 0.7)
  env.gain.exponentialRampToValueAtTime(0.001, now + duration)
  osc.connect(env)
  env.connect(filter)
  osc.start(now)
  osc.stop(now + duration + 0.05)
  lfo.start(now)
  lfo.stop(now + duration + 0.05)
}



/**
 * Mute all procedural sounds (used during transitions)
 */
export function muteProceduralSounds() {
  globalMuteProceduralSounds = true
}

/**
 * Unmute all procedural sounds
 */
export function unmuteProceduralSounds() {
  globalMuteProceduralSounds = false
}

/**
 * Suspends the global AudioContext to silence all procedural sounds immediately.
 * Existing oscillators and noise buffers stop producing output.
 */
export function suspendGlobalAudio() {
  audioContext?.state === 'running' && audioContext.suspend()
}

/**
 * Resumes the global AudioContext after suspension
 */
export function resumeGlobalAudio() {
  audioContext?.state === 'suspended' && audioContext.resume()
}


/**
 * Plays a wet "splat/splash" sound (hero stepping/landing in puddle)
 * Layered: low-pass noise body + bandpass high-end "splash" burst + a quick
 * pitched "plop" tone, so it reads clearly as a wet splash and can be heard
 * over rain ambience.
 * @param {Object} instance - Sound instance
 * @param {number} [volume=0.3] - Peak volume multiplier (0..1+)
 */
export function playSplashSound(instance, volume = 0.3) {
  if (globalMuteProceduralSounds) return
  const ctx = instance.audioContext
  if (!ctx || ctx.state !== 'running') return
  const now = ctx.currentTime
  const duration = 0.22
  //
  // Softer water motion: airy filtered noise + brief hiss — avoids drum-like sine body.
  //
  const bufferSize = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  const bodyNoise = ctx.createBufferSource()
  bodyNoise.buffer = buffer
  const bodyFilter = ctx.createBiquadFilter()
  bodyFilter.type = 'lowpass'
  bodyFilter.frequency.setValueAtTime(520, now)
  bodyFilter.frequency.exponentialRampToValueAtTime(140, now + duration)
  bodyFilter.Q.value = 0.45
  const bodyGain = ctx.createGain()
  bodyGain.gain.setValueAtTime(0.001, now)
  bodyGain.gain.linearRampToValueAtTime(volume * 0.38, now + 0.022)
  bodyGain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  bodyNoise.connect(bodyFilter)
  bodyFilter.connect(bodyGain)
  bodyGain.connect(ctx.destination)
  bodyNoise.start(now)
  bodyNoise.stop(now + duration)
  const hissNoise = ctx.createBufferSource()
  hissNoise.buffer = buffer
  const hissFilter = ctx.createBiquadFilter()
  hissFilter.type = 'bandpass'
  hissFilter.frequency.setValueAtTime(4200, now)
  hissFilter.Q.value = 0.9
  const hissGain = ctx.createGain()
  const hissPeak = volume * 0.22
  hissGain.gain.setValueAtTime(0.001, now)
  hissGain.gain.linearRampToValueAtTime(hissPeak, now + 0.004)
  hissGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11)
  hissNoise.connect(hissFilter)
  hissFilter.connect(hissGain)
  hissGain.connect(ctx.destination)
  hissNoise.start(now)
  hissNoise.stop(now + 0.14)
}
//
// Forest shallow water — replay water_steps.mp3 while wading until hero leaves water.
// Each take gets a random playback speed and volume so the chained loop never
// sounds mechanical.
//
const WATER_STEPS_LOOP_DURATION = 1
const WATER_STEPS_VOLUME_JITTER = 0.3
/**
 * Plays a single water-steps take (no chained replay) — used when the hero
 * first falls into the forest lake.
 * @param {Object} instance - Sound instance
 * @param {number} [volume=0.42] - Playback volume 0..1
 */
export function playWaterStepsOnce(instance, volume = 0.42) {
  if (!instance) return
  const jitter = 1 + (Math.random() - 0.5) * WATER_STEPS_VOLUME_JITTER
  const vol = Math.min(1, Math.max(0.05, volume * jitter))
  playWaterStepsHtml5(vol, 1)
}
/**
 * Stops forest water-steps loop playback.
 * @param {Object} instance - Sound instance
 */
export function stopWaterStepsLoop(instance) {
  instance._waterStepsWanted = false
  try {
    instance._waterStepsHandle?.stop?.()
  } catch (error) {
    //
    // Already stopped
    //
  }
  instance._waterStepsHandle = null
  instance._waterStepsLoopActive = false
}
//
// Plain HTML5 Audio pool for water_steps.mp3 — deliberately bypasses
// Kaplay's own sound system. Kaplay resolves a named sound through its own
// asset registry and its own internal AudioContext (both independent from
// this module and from each other's load timing) and can silently no-op a
// lookup made while any unrelated background asset is still loading instead
// of throwing, so a k.play() call here could produce nothing at all with no
// error to fall back on. A bare <audio> element sidesteps all of that and,
// once unlocked by any prior user gesture on the page (see
// unlockWaterStepsAudio below), plays reliably every time.
//
const WATER_STEPS_URL = './sounds/water_steps.mp3'
const WATER_STEPS_POOL_SIZE = 2
let waterStepsPool = null
let waterStepsPoolIndex = 0
//
// Lazily builds a small rotating pool so back-to-back chained takes never
// fight over the same element's playback state.
//
function getWaterStepsPool() {
  if (waterStepsPool) return waterStepsPool
  waterStepsPool = Array.from({ length: WATER_STEPS_POOL_SIZE }, () => {
    const audio = new Audio(WATER_STEPS_URL)
    audio.preload = 'auto'
    return audio
  })
  return waterStepsPool
}
/**
 * Unlocks the water-steps HTML5 audio pool. Call once from a real user
 * gesture (keydown/pointerdown/touchstart) so the drowning sequence's first
 * chained take is never the very first play() attempt on these elements.
 */
export function unlockWaterStepsAudio() {
  getWaterStepsPool().forEach(audio => {
    const restoreVolume = audio.volume
    audio.volume = 0
    audio.play().then(() => {
      audio.pause()
      audio.currentTime = 0
      audio.volume = restoreVolume
    }).catch(() => {})
  })
}
//
// Plays one water-steps take from the pool at the given volume/speed.
//
function playWaterStepsHtml5(volume, speed) {
  const pool = getWaterStepsPool()
  const audio = pool[waterStepsPoolIndex]
  waterStepsPoolIndex = (waterStepsPoolIndex + 1) % pool.length
  audio.pause()
  audio.currentTime = 0
  audio.volume = Math.min(1, Math.max(0.05, volume))
  audio.playbackRate = speed
  audio.play().catch(() => {})
  return {
    duration: WATER_STEPS_LOOP_DURATION,
    stop() {
      audio.pause()
      audio.currentTime = 0
    }
  }
}
/**
 * Stops the trampoline lake water-steps chain.
 * @param {Object} instance - Sound instance
 */
export function stopTrampWaterStepsLoop(instance) {
  if (!instance) return
  instance._trampWaterStepsWanted = false
  instance._trampWaterStepsBusy = false
  instance._trampWaterStepsGen = (instance._trampWaterStepsGen || 0) + 1
  try {
    instance._trampWaterStepsHandle?.stop?.()
  } catch (error) {
    //
    // Already stopped
    //
  }
  instance._trampWaterStepsHandle = null
}
/**
 * Forest propeller bud's whirr, called every frame: starts the loop when
 * asked to be heard, follows the volume and the spin rate, and lets the
 * loop go a moment after the volume falls to 0.
 * @param {Object} instance - Sound instance from create()
 * @param {number} volume - 0..1 (0 while it does not spin or is out of earshot)
 * @param {number} rate - Spin rate (1 = cruise; higher whirrs faster)
 */
export function setPropellerHum(instance, volume, rate) {
  if (!instance) return
  const muted = globalMuteProceduralSounds || instance._forestSfxMuted
  const level = muted ? 0 : volume
  level > 0 && !instance._propellerHum && startPropellerHum(instance)
  const hum = instance._propellerHum
  if (!hum) return
  const now = hum.ctx.currentTime
  hum.master.gain.setTargetAtTime(level * PROP_HUM_GAIN, now, PROP_HUM_SMOOTH)
  hum.chopLfo.frequency.setTargetAtTime(PROP_HUM_BLADE_HZ * rate, now, PROP_HUM_SMOOTH)
  hum.tone.frequency.setTargetAtTime(PROP_HUM_TONE_HZ * rate, now, PROP_HUM_SMOOTH)
  if (level > 0) {
    hum.quietSince = null
    return
  }
  hum.quietSince ??= now
  now - hum.quietSince > PROP_HUM_RELEASE && stopPropellerHum(instance)
}
/**
 * Stops the propeller bud's whirr at once (level leave / teardown).
 * @param {Object} instance - Sound instance from create()
 */
export function stopPropellerHum(instance) {
  const hum = instance?._propellerHum
  if (!hum) return
  instance._propellerHum = null
  hum.sources.forEach(node => node.stop())
  hum.master.disconnect()
}
/**
 * Forest eye-flower notices the hero: a short trembling rustle of its blades.
 * @param {Object} instance - Sound instance from create()
 */
export function playFlowerRustle(instance) {
  const ctx = runningProceduralContext(instance)
  if (!ctx) return
  const now = ctx.currentTime
  const noise = ctx.createBufferSource()
  noise.buffer = createReadyTvNoiseBuffer(ctx, FLOWER_RUSTLE_SEC)
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = FLOWER_RUSTLE_BAND_HZ
  band.Q.value = FLOWER_RUSTLE_Q
  const env = createFlowerEnvelope(ctx, now, FLOWER_RUSTLE_GAIN, FLOWER_RUSTLE_SEC)
  //
  // Fast tremolo makes the hiss read as many leaves shivering, not wind.
  //
  const tremolo = ctx.createOscillator()
  const depth = ctx.createGain()
  const shiver = ctx.createGain()
  tremolo.frequency.value = FLOWER_RUSTLE_TREMOLO_HZ
  depth.gain.value = FLOWER_RUSTLE_TREMOLO_DEPTH * 0.5
  shiver.gain.value = 1 - FLOWER_RUSTLE_TREMOLO_DEPTH * 0.5
  tremolo.connect(depth)
  depth.connect(shiver.gain)
  noise.connect(band)
  band.connect(shiver)
  shiver.connect(env)
  env.connect(ctx.destination)
  noise.start(now)
  tremolo.start(now)
  noise.stop(now + FLOWER_RUSTLE_SEC)
  tremolo.stop(now + FLOWER_RUSTLE_SEC)
}
/**
 * Forest eye-flower tentacles close around the hero: wet, sinking squeeze.
 * @param {Object} instance - Sound instance from create()
 */
export function playFlowerSqueeze(instance) {
  const ctx = runningProceduralContext(instance)
  if (!ctx) return
  const now = ctx.currentTime
  const end = now + FLOWER_SQUEEZE_SEC
  const noise = ctx.createBufferSource()
  noise.buffer = createReadyTvNoiseBuffer(ctx, FLOWER_SQUEEZE_SEC)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(FLOWER_SQUEEZE_LP_START, now)
  lp.frequency.exponentialRampToValueAtTime(FLOWER_SQUEEZE_LP_END, end)
  const noiseEnv = createFlowerEnvelope(ctx, now, FLOWER_SQUEEZE_NOISE_GAIN, FLOWER_SQUEEZE_SEC)
  noise.connect(lp)
  lp.connect(noiseEnv)
  noiseEnv.connect(ctx.destination)
  const tone = ctx.createOscillator()
  tone.type = 'sine'
  tone.frequency.setValueAtTime(FLOWER_SQUEEZE_TONE_START, now)
  tone.frequency.exponentialRampToValueAtTime(FLOWER_SQUEEZE_TONE_END, end)
  const toneEnv = createFlowerEnvelope(ctx, now, FLOWER_SQUEEZE_TONE_GAIN, FLOWER_SQUEEZE_SEC)
  tone.connect(toneEnv)
  toneEnv.connect(ctx.destination)
  noise.start(now)
  tone.start(now)
  noise.stop(end)
  tone.stop(end)
}
/**
 * A stalk-eye's indignant "hmph!" — the hero just landed on it.
 * @param {Object} instance - Sound instance from create()
 */
export function playStalkEyeHmph(instance) {
  const ctx = runningProceduralContext(instance)
  if (!ctx) return
  const now = ctx.currentTime
  const peakAt = now + STALK_EYE_HMPH_RISE_SEC
  const end = now + STALK_EYE_HMPH_SEC
  const mouth = ctx.createBiquadFilter()
  mouth.type = 'bandpass'
  mouth.Q.value = STALK_EYE_HMPH_Q
  mouth.frequency.setValueAtTime(STALK_EYE_HMPH_FORMANT_START, now)
  mouth.frequency.linearRampToValueAtTime(STALK_EYE_HMPH_FORMANT_PEAK, peakAt)
  mouth.frequency.exponentialRampToValueAtTime(STALK_EYE_HMPH_FORMANT_END, end)
  const env = createFlowerEnvelope(ctx, now, STALK_EYE_HMPH_GAIN, STALK_EYE_HMPH_SEC)
  mouth.connect(env)
  env.connect(ctx.destination)
  const wobble = ctx.createOscillator()
  wobble.frequency.value = STALK_EYE_HMPH_WOBBLE_HZ
  const wobbleDepth = ctx.createGain()
  wobbleDepth.gain.value = STALK_EYE_HMPH_WOBBLE_HZ_DEPTH
  wobble.connect(wobbleDepth)
  const voices = [1, 2].map(mult => hmphVoice(ctx, mouth, wobbleDepth, mult, now, peakAt, end))
  wobble.start(now)
  wobble.stop(end)
  voices.forEach(osc => {
    osc.start(now)
    osc.stop(end)
  })
}
/**
 * Forest eye-flower drags the hero underground: sub thump, falling rumble and
 * a scatter of pebble ticks.
 * @param {Object} instance - Sound instance from create()
 */
export function playFlowerEarthGulp(instance) {
  const ctx = runningProceduralContext(instance)
  if (!ctx) return
  const now = ctx.currentTime
  const end = now + FLOWER_GULP_SEC
  const thump = ctx.createOscillator()
  thump.type = 'sine'
  thump.frequency.setValueAtTime(FLOWER_GULP_THUMP_START, now)
  thump.frequency.exponentialRampToValueAtTime(FLOWER_GULP_THUMP_END, end)
  const thumpEnv = createFlowerEnvelope(ctx, now, FLOWER_GULP_THUMP_GAIN, FLOWER_GULP_SEC)
  thump.connect(thumpEnv)
  thumpEnv.connect(ctx.destination)
  const noise = ctx.createBufferSource()
  noise.buffer = createReadyTvNoiseBuffer(ctx, FLOWER_GULP_SEC)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(FLOWER_GULP_RUMBLE_LP_START, now)
  lp.frequency.exponentialRampToValueAtTime(FLOWER_GULP_RUMBLE_LP_END, end)
  const rumbleEnv = createFlowerEnvelope(ctx, now, FLOWER_GULP_RUMBLE_GAIN, FLOWER_GULP_SEC)
  noise.connect(lp)
  lp.connect(rumbleEnv)
  rumbleEnv.connect(ctx.destination)
  thump.start(now)
  noise.start(now)
  thump.stop(end)
  noise.stop(end)
  for (let i = 0; i < FLOWER_GULP_PEBBLE_COUNT; i++) {
    playFlowerPebbleTick(ctx, now + Math.random() * FLOWER_GULP_PEBBLE_SPREAD)
  }
}
/**
 * Plays a single water drip sound (short pitched sine with fast decay)
 * @param {Object} instance - Sound instance
 * @param {number} [volume=0.15] - Volume
 */
export function playDripSound(instance, volume = 0.15) {
  if (globalMuteProceduralSounds) return
  const ctx = instance.audioContext
  if (!ctx || ctx.state !== 'running') return
  const now = ctx.currentTime
  const freq = 800 + Math.random() * 1200
  const duration = 0.06 + Math.random() * 0.06
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, now)
  osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + duration)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(volume, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 2500
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration)
}
/**
 * Plays a cricket/cicada chirp (fast oscillating tone burst)
 * @param {Object} instance - Sound instance
 */
export function playCricketSound(instance) {
  if (globalMuteProceduralSounds) return
  const ctx = instance.audioContext
  if (!ctx || ctx.state !== 'running') return
  const now = ctx.currentTime
  //
  // Rapid chirp: short high-frequency burst with tremolo
  //
  const chirpCount = 2 + Math.floor(Math.random() * 4)
  const chirpDuration = 0.03 + Math.random() * 0.02
  const chirpGap = 0.04 + Math.random() * 0.03
  const freq = 4000 + Math.random() * 2000
  const vol = 0.04 + Math.random() * 0.03
  for (let i = 0; i < chirpCount; i++) {
    const t = now + i * (chirpDuration + chirpGap)
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq + Math.random() * 200, t)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.001, t)
    gain.gain.linearRampToValueAtTime(vol, t + chirpDuration * 0.2)
    gain.gain.exponentialRampToValueAtTime(0.001, t + chirpDuration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + chirpDuration)
  }
}
/**
 * Plays an owl hoot sound: two soft low-frequency tones
 * @param {Object} instance - Sound instance
 */
export function playOwlSound(instance, volumeMultiplier = 1) {
  if (globalMuteProceduralSounds) return
  const ctx = instance.audioContext
  if (!ctx || ctx.state !== 'running') return
  const now = ctx.currentTime
  //
  // Two soft hoots ("hoo... hoo") with short pause between them
  //
  const baseFreq = 280 + Math.random() * 60
  const vol = (0.22 + Math.random() * 0.08) * volumeMultiplier
  const hootDuration = 0.32
  const gap = 0.18
  for (let i = 0; i < 2; i++) {
    const t = now + i * (hootDuration + gap)
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(baseFreq * 1.05, t)
    osc.frequency.linearRampToValueAtTime(baseFreq, t + hootDuration * 0.7)
    //
    // Lowpass filter for soft, breathy quality
    //
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 700
    filter.Q.value = 0.6
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.001, t)
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.06)
    gain.gain.setValueAtTime(vol, t + hootDuration * 0.6)
    gain.gain.exponentialRampToValueAtTime(0.001, t + hootDuration)
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + hootDuration + 0.05)
  }
}


//
// One bright shard tick for the tomato burst — a damped square chirp.
//
function playTomatoShardTick(ctx, out, at) {
  const osc = ctx.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(TOMATO_BLAST_SHARD_FREQ_MIN + Math.random() * TOMATO_BLAST_SHARD_FREQ_RANGE, at)
  const g = ctx.createGain()
  g.gain.setValueAtTime(TOMATO_BLAST_SHARD_GAIN, at)
  g.gain.exponentialRampToValueAtTime(0.001, at + TOMATO_BLAST_SHARD_DURATION)
  osc.connect(g)
  g.connect(out)
  osc.start(at)
  osc.stop(at + TOMATO_BLAST_SHARD_DURATION)
}
//
// Fills a mono buffer with white noise (shared by every power-on noise layer).
//
function createReadyTvNoiseBuffer(ctx, seconds) {
  const size = Math.ceil(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1
  return buffer
}
//
// The whirr's nodes: looped noise through a band, chopped by a blade-rate
// LFO, plus a quiet low triangle, all into the forest SFX bus at silence.
//
function startPropellerHum(instance) {
  const ctx = runningProceduralContext(instance)
  if (!ctx) return
  const noise = ctx.createBufferSource()
  noise.buffer = createReadyTvNoiseBuffer(ctx, PROP_HUM_NOISE_SEC)
  noise.loop = true
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = PROP_HUM_BAND_HZ
  band.Q.value = PROP_HUM_BAND_Q
  const chop = ctx.createGain()
  chop.gain.value = 1 - PROP_HUM_CHOP_DEPTH
  const chopLfo = ctx.createOscillator()
  chopLfo.frequency.value = PROP_HUM_BLADE_HZ
  const chopDepth = ctx.createGain()
  chopDepth.gain.value = PROP_HUM_CHOP_DEPTH
  const tone = ctx.createOscillator()
  tone.type = 'triangle'
  tone.frequency.value = PROP_HUM_TONE_HZ
  const toneGain = ctx.createGain()
  toneGain.gain.value = PROP_HUM_TONE_GAIN
  const master = ctx.createGain()
  master.gain.value = 0
  chopLfo.connect(chopDepth)
  chopDepth.connect(chop.gain)
  noise.connect(band)
  band.connect(chop)
  chop.connect(master)
  tone.connect(toneGain)
  toneGain.connect(chop)
  master.connect(instance.forestSfxGain ?? ctx.destination)
  noise.start()
  chopLfo.start()
  tone.start()
  instance._propellerHum = { ctx, master, chopLfo, tone, sources: [noise, chopLfo, tone], quietSince: null }
}
//
// Audio context ready for a one-shot procedural sound (null while muted or suspended).
//
function runningProceduralContext(instance) {
  if (globalMuteProceduralSounds) return null
  const ctx = instance?.audioContext
  return ctx && ctx.state === 'running' ? ctx : null
}
//
// Gain node with a short attack and an exponential tail to silence.
//
function createFlowerEnvelope(ctx, at, peak, duration) {
  const env = ctx.createGain()
  env.gain.setValueAtTime(FLOWER_SFX_FLOOR, at)
  env.gain.linearRampToValueAtTime(peak, at + FLOWER_SFX_ATTACK_SEC)
  env.gain.exponentialRampToValueAtTime(FLOWER_SFX_FLOOR, at + duration)
  return env
}
//
// One voice of the stalk-eye's "hmph": a sawtooth at mult × the pitch
// contour (the octave quieter), wobbled, into the mouth filter.
//
function hmphVoice(ctx, mouth, wobbleDepth, mult, now, peakAt, end) {
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(STALK_EYE_HMPH_F0 * mult, now)
  osc.frequency.exponentialRampToValueAtTime(STALK_EYE_HMPH_PEAK * mult, peakAt)
  osc.frequency.exponentialRampToValueAtTime(STALK_EYE_HMPH_F1 * mult, end)
  wobbleDepth.connect(osc.frequency)
  const level = ctx.createGain()
  level.gain.value = mult === 1 ? 1 : STALK_EYE_HMPH_OCTAVE_GAIN
  osc.connect(level)
  level.connect(mouth)
  return osc
}
//
// One pebble knocking on another — a tiny band-passed noise click.
//
function playFlowerPebbleTick(ctx, at) {
  const noise = ctx.createBufferSource()
  noise.buffer = createReadyTvNoiseBuffer(ctx, FLOWER_GULP_PEBBLE_SEC)
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = FLOWER_GULP_PEBBLE_BAND_MIN + Math.random() * FLOWER_GULP_PEBBLE_BAND_RANGE
  const env = createFlowerEnvelope(ctx, at, FLOWER_GULP_PEBBLE_GAIN, FLOWER_GULP_PEBBLE_SEC)
  noise.connect(band)
  band.connect(env)
  env.connect(ctx.destination)
  noise.start(at)
  noise.stop(at + FLOWER_GULP_PEBBLE_SEC)
}
