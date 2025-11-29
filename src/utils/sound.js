import { CFG } from '../cfg.js'
/**
 * Audio context singleton
 * @returns {AudioContext} The single AudioContext instance
 */

let audioContext = null
//
// Global background music state (persists across scene reloads)
//
let globalBackgroundMusic = null
let globalCurrentTrack = null
/**
 * Create sound instance with AudioContext and all audio resources
 * @returns {Object} Sound instance with context, gains, and ambient state
 */
export function create() {
  const ctx = getAudioContext()
  // Create master gains for SFX (reusable)
  const landGain = ctx.createGain()
  landGain.connect(ctx.destination)

  const stepGain = ctx.createGain()
  stepGain.connect(ctx.destination)

  const jumpGain = ctx.createGain()
  jumpGain.gain.value = CFG.audio.sfx.jump
  jumpGain.connect(ctx.destination)

  const spawnGain = ctx.createGain()
  spawnGain.connect(ctx.destination)

  return {
    // Audio context
    audioContext: ctx,
    // SFX master gains
    landGain,
    stepGain,
    jumpGain,
    spawnGain,
    // Ambient music state
    ambientOscillators: [],
    ambientGains: [],
    ambientMasterGain: null,
    ambientIsPlaying: false,
    ambientNoiseNode: null,
    ambientFilterNode: null,
    // Backward compatibility properties (for hero.js annihilation)
    get currentTime() { return ctx.currentTime },
    createOscillator: () => ctx.createOscillator(),
    createGain: () => ctx.createGain(),
    destination: ctx.destination
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
  // Try to start context immediately
  ctx.resume().catch(() => {
    // If failed, will try on first user interaction
  })
  // Try to resume on page load
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
/**
 * Play landing sound
 * @param {Object} instance - Sound instance
 */
export function playLandSound(instance) {
  const now = instance.audioContext.currentTime
  // Oscillators are created each time (they're disposable)
  const oscillator = instance.audioContext.createOscillator()
  // Create temporary GainNode for sound envelope
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
/**
 * Play lightning/electric discharge sound effect
 * @param {Object} instance - Sound instance from create()
 */
export function playLightningSound(instance) {
  const now = instance.audioContext.currentTime
  const duration = 0.08
  // Create white noise for electric crackle
  const bufferSize = instance.audioContext.sampleRate * duration
  const noiseBuffer = instance.audioContext.createBuffer(1, bufferSize, instance.audioContext.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    noiseData[i] = Math.random() * 2 - 1
  }

  const noiseSource = instance.audioContext.createBufferSource()
  noiseSource.buffer = noiseBuffer
  // High-pass filter for electric snap
  const filter = instance.audioContext.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.setValueAtTime(2000, now)
  filter.Q.value = 1

  const gain = instance.audioContext.createGain()
  gain.gain.setValueAtTime(0.015, now)  // Extremely quiet background sound
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  noiseSource.connect(filter)
  filter.connect(gain)
  gain.connect(instance.audioContext.destination)

  noiseSource.start(now)
  noiseSource.stop(now + duration)
}
/**
 * Play blade emerging sound effect (rusty metal scrape)
 * @param {Object} instance - Sound instance from create()
 */
export function playBladeSound(instance) {
  const now = instance.audioContext.currentTime
  const duration = 0.3
  const fadeOutTime = 0.08  // Longer fade out to avoid click
  // Create white noise for friction texture
  const bufferSize = instance.audioContext.sampleRate * duration
  const noiseBuffer = instance.audioContext.createBuffer(1, bufferSize, instance.audioContext.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    noiseData[i] = Math.random() * 2 - 1
  }

  const friction = instance.audioContext.createBufferSource()
  friction.buffer = noiseBuffer
  // Low-pass filter for soft dragging sound (like carpet/floor)
  const lpFilter = instance.audioContext.createBiquadFilter()
  lpFilter.type = 'lowpass'
  lpFilter.Q.value = 1
  lpFilter.frequency.setValueAtTime(800, now)
  lpFilter.frequency.linearRampToValueAtTime(600, now + duration)
  // Low rumble for heavy object weight
  const rumble = instance.audioContext.createOscillator()
  rumble.type = 'sine'
  rumble.frequency.setValueAtTime(60, now)
  rumble.frequency.linearRampToValueAtTime(55, now + duration)

  const rumbleGain = instance.audioContext.createGain()
  rumbleGain.gain.setValueAtTime(0.12, now)
  rumbleGain.gain.setValueAtTime(0.10, now + duration - fadeOutTime)
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  // Main friction gain (softer, more "shhhh")
  const frictionGain = instance.audioContext.createGain()
  frictionGain.gain.setValueAtTime(0.001, now)
  frictionGain.gain.exponentialRampToValueAtTime(0.40, now + 0.05)  // Increased from 0.20 to 0.40
  frictionGain.gain.setValueAtTime(0.40, now + duration - fadeOutTime)  // Increased from 0.20 to 0.40
  frictionGain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  // Connect friction chain
  friction.connect(lpFilter)
  lpFilter.connect(frictionGain)
  frictionGain.connect(instance.audioContext.destination)
  // Connect rumble chain
  rumble.connect(rumbleGain)
  rumbleGain.connect(instance.audioContext.destination)
  // Start
  friction.start(now)
  rumble.start(now)
  rumble.stop(now + duration)
}

/**
 * Play metal ping sound (for blade glints) - katana-like sound
 * @param {Object} instance - Sound instance from create()
 */
export function playMetalPingSound(instance) {
  const now = instance.audioContext.currentTime
  const duration = 0.6  // Longer for katana resonance
  
  //
  // High pitched "swish" (air cutting sound) - starts high and sweeps down
  //
  const swish = instance.audioContext.createOscillator()
  swish.type = 'sine'
  swish.frequency.setValueAtTime(3800, now)
  swish.frequency.exponentialRampToValueAtTime(800, now + duration)  // Long sweep down
  
  //
  // Metallic ring (katana resonance) - pure tone that slowly fades
  //
  const ring = instance.audioContext.createOscillator()
  ring.type = 'triangle'  // Triangle wave for metallic quality
  ring.frequency.setValueAtTime(5200, now)
  ring.frequency.exponentialRampToValueAtTime(4800, now + duration)
  
  //
  // Very sharp attack envelope (instant, like katana slash)
  //
  const swishGain = instance.audioContext.createGain()
  swishGain.gain.setValueAtTime(0.15, now)  // Instant, loud attack
  swishGain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  
  const ringGain = instance.audioContext.createGain()
  ringGain.gain.setValueAtTime(0, now)
  ringGain.gain.linearRampToValueAtTime(0.08, now + 0.05)  // Ring starts after swish
  ringGain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  
  //
  // High-pass filter for crisp katana sound (removes low frequencies)
  //
  const hpFilter = instance.audioContext.createBiquadFilter()
  hpFilter.type = 'highpass'
  hpFilter.frequency.value = 1500
  hpFilter.Q.value = 0.7
  
  //
  // Connect nodes
  //
  swish.connect(swishGain)
  ring.connect(ringGain)
  swishGain.connect(hpFilter)
  ringGain.connect(hpFilter)
  hpFilter.connect(instance.audioContext.destination)
  
  //
  // Start and stop
  //
  swish.start(now)
  ring.start(now)
  swish.stop(now + duration)
  ring.stop(now + duration)
}

/**
 * Play slow text sliding sound effect (for blade arm text)
 * @param {Object} instance - Sound instance from create()
 */
export function playTextSlideSound(instance) {
  const now = instance.audioContext.currentTime
  const duration = 1.0  // Match blade arm extension duration
  const fadeOutTime = 0.15  // Longer fade out for smoother ending
  // Create white noise for friction texture
  const bufferSize = instance.audioContext.sampleRate * duration
  const noiseBuffer = instance.audioContext.createBuffer(1, bufferSize, instance.audioContext.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    noiseData[i] = Math.random() * 2 - 1
  }

  const friction = instance.audioContext.createBufferSource()
  friction.buffer = noiseBuffer
  // Low-pass filter for soft dragging sound (like carpet/floor)
  const lpFilter = instance.audioContext.createBiquadFilter()
  lpFilter.type = 'lowpass'
  lpFilter.Q.value = 1
  lpFilter.frequency.setValueAtTime(800, now)
  lpFilter.frequency.linearRampToValueAtTime(600, now + duration)
  // Low rumble for heavy object weight
  const rumble = instance.audioContext.createOscillator()
  rumble.type = 'sine'
  rumble.frequency.setValueAtTime(60, now)
  rumble.frequency.linearRampToValueAtTime(55, now + duration)

  const rumbleGain = instance.audioContext.createGain()
  rumbleGain.gain.setValueAtTime(0.12, now)
  rumbleGain.gain.setValueAtTime(0.10, now + duration - fadeOutTime)
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  // Main friction gain (softer, more "shhhh")
  const frictionGain = instance.audioContext.createGain()
  frictionGain.gain.setValueAtTime(0.001, now)
  frictionGain.gain.exponentialRampToValueAtTime(0.40, now + 0.05)  // Increased from 0.20 to 0.40
  frictionGain.gain.setValueAtTime(0.40, now + duration - fadeOutTime)  // Increased from 0.20 to 0.40
  frictionGain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  // Connect friction chain
  friction.connect(lpFilter)
  lpFilter.connect(frictionGain)
  frictionGain.connect(instance.audioContext.destination)
  // Connect rumble chain
  rumble.connect(rumbleGain)
  rumbleGain.connect(instance.audioContext.destination)
  // Start
  friction.start(now)
  rumble.start(now)
  rumble.stop(now + duration)
}
/**
 * Play jump sound effect (upward bounce)
 * @param {Object} instance - Sound instance from create()
 */
export function playJumpSound(instance) {
  const now = instance.audioContext.currentTime
  const duration = 0.12
  // Upward pitch sweep
  const jump = instance.audioContext.createOscillator()
  const envelope = instance.audioContext.createGain()

  jump.type = 'sine'
  jump.frequency.setValueAtTime(200, now)
  jump.frequency.exponentialRampToValueAtTime(400, now + duration)
  // Use envelope for fade-out (starts at 1, fades to 0.001)
  envelope.gain.setValueAtTime(1, now)
  envelope.gain.exponentialRampToValueAtTime(0.001, now + duration)
  // Connect through master jumpGain
  jump.connect(envelope)
  envelope.connect(instance.jumpGain)

  jump.start(now)
  jump.stop(now + duration)
}
/**
 * Play running step sound
 * @param {Object} instance - Sound instance
 */
export function playStepSound(instance) {
  const now = instance.audioContext.currentTime

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
/**
 * Play hero spawn sweep sound (energy wave)
 * @param {Object} instance - Sound instance
 */
export function playSpawnSweep(instance) {
  const now = instance.audioContext.currentTime
  // Quick rise (energy wave)
  const sweep = instance.audioContext.createOscillator()
  const sweepEnvelope = instance.audioContext.createGain()

  sweep.type = 'sine'
  sweep.frequency.setValueAtTime(80, now)
  sweep.frequency.exponentialRampToValueAtTime(400, now + 0.15)

  sweepEnvelope.gain.setValueAtTime(0.4, now)
  sweepEnvelope.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
  // Connect through master gain
  sweep.connect(sweepEnvelope)
  sweepEnvelope.connect(instance.spawnGain)

  sweep.start(now)
  sweep.stop(now + 0.15)
}
/**
 * Play hero spawn click sound ("chpok")
 * @param {Object} instance - Sound instance
 */
export function playSpawnClick(instance) {
  const now = instance.audioContext.currentTime
  // Click at spawn moment
  const click = instance.audioContext.createOscillator()
  const clickEnvelope = instance.audioContext.createGain()

  click.type = 'sine'
  click.frequency.setValueAtTime(800, now)

  clickEnvelope.gain.setValueAtTime(0.3, now)
  clickEnvelope.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
  // Connect through master gain
  click.connect(clickEnvelope)
  clickEnvelope.connect(instance.spawnGain)

  click.start(now)
  click.stop(now + 0.05)
}
/**
 * Play death sound effect (bone cracking/breaking)
 * @param {Object} instance - Sound instance from create()
 */
export function playDeathSound(instance) {
  const now = instance.audioContext.currentTime
  // First crack
  createCrack(instance, now, 180, 0.28)
  // Second crack (slightly delayed)
  createCrack(instance, now + 0.08, 150, 0.24)
  // Third crack (final)
  createCrack(instance, now + 0.15, 120, 0.20)
}
/**
 * Play eerie/creepy sound effect (disturbing low frequency drone)
 * @param {Object} inst - Sound instance from create()
 */
export function playGlitchSound(inst) {
  const now = inst.audioContext.currentTime
  const duration = 1.5
  // Deep unsettling bass (40-60 Hz range - creates unease)
  const bass = inst.audioContext.createOscillator()
  const bassGain = inst.audioContext.createGain()

  bass.type = 'sine'
  const baseFreq = 40 + Math.random() * 20
  bass.frequency.setValueAtTime(baseFreq, now)
  bass.frequency.linearRampToValueAtTime(baseFreq + 5, now + duration * 0.5)
  bass.frequency.linearRampToValueAtTime(baseFreq, now + duration)
  // Slow crescendo then fade out
  bassGain.gain.setValueAtTime(0.001, now)
  bassGain.gain.exponentialRampToValueAtTime(0.25, now + 0.4)
  bassGain.gain.setValueAtTime(0.25, now + duration * 0.6)
  bassGain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  bass.connect(bassGain)
  bassGain.connect(inst.audioContext.destination)
  // Dissonant high overtone (tritone interval - "devil's interval")
  const dissonant = inst.audioContext.createOscillator()
  const dissonantGain = inst.audioContext.createGain()

  dissonant.type = 'triangle'
  const tritone = baseFreq * Math.sqrt(2) * 8  // Tritone relationship
  dissonant.frequency.setValueAtTime(tritone, now)
  dissonant.frequency.linearRampToValueAtTime(tritone * 1.02, now + duration)

  dissonantGain.gain.setValueAtTime(0.001, now)
  dissonantGain.gain.exponentialRampToValueAtTime(0.08, now + 0.5)
  dissonantGain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  dissonant.connect(dissonantGain)
  dissonantGain.connect(inst.audioContext.destination)
  // Start all oscillators
  bass.start(now)
  bass.stop(now + duration)
  dissonant.start(now)
  dissonant.stop(now + duration)
}
/**
 * Play absorption/merging sound effect
 * @param {Object} instance - Sound instance
 */
export function playAbsorptionSound(instance) {
  const now = instance.audioContext.currentTime
  const duration = 1.0
  // Soft harmonic tone that rises and falls
  const tone1 = instance.audioContext.createOscillator()
  const tone1Gain = instance.audioContext.createGain()

  tone1.type = 'sine'
  tone1.frequency.setValueAtTime(220, now)  // A3
  tone1.frequency.linearRampToValueAtTime(440, now + duration * 0.5)  // A4
  tone1.frequency.linearRampToValueAtTime(220, now + duration)  // Back to A3

  tone1Gain.gain.setValueAtTime(0, now)
  tone1Gain.gain.linearRampToValueAtTime(0.3, now + 0.1)
  tone1Gain.gain.linearRampToValueAtTime(0.2, now + duration * 0.5)
  tone1Gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  tone1.connect(tone1Gain)
  tone1Gain.connect(instance.audioContext.destination)

  tone1.start(now)
  tone1.stop(now + duration)
  // Second harmonic (fifth above)
  const tone2 = instance.audioContext.createOscillator()
  const tone2Gain = instance.audioContext.createGain()

  tone2.type = 'sine'
  tone2.frequency.setValueAtTime(330, now)  // E4
  tone2.frequency.linearRampToValueAtTime(660, now + duration * 0.5)  // E5
  tone2.frequency.linearRampToValueAtTime(330, now + duration)

  tone2Gain.gain.setValueAtTime(0, now)
  tone2Gain.gain.linearRampToValueAtTime(0.2, now + 0.15)
  tone2Gain.gain.linearRampToValueAtTime(0.15, now + duration * 0.5)
  tone2Gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  tone2.connect(tone2Gain)
  tone2Gain.connect(instance.audioContext.destination)

  tone2.start(now + 0.05)
  tone2.stop(now + duration)
  // Shimmer effect removed (bell-like sound)
}

export function playAnnihilationSound(instance) {
  const now = instance.audioContext.currentTime
  // Deep bass (50Hz -> 20Hz)
  const bass = instance.audioContext.createOscillator()
  const bassGain = instance.audioContext.createGain()
  bass.type = 'sine'
  bass.frequency.setValueAtTime(50, now)
  bass.frequency.exponentialRampToValueAtTime(20, now + 0.5)
  bassGain.gain.setValueAtTime(0.7, now)
  bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
  bass.connect(bassGain)
  bassGain.connect(instance.audioContext.destination)
  bass.start(now)
  bass.stop(now + 0.5)
  // Very low "hum" (30Hz)
  const subBass = instance.audioContext.createOscillator()
  const subBassGain = instance.audioContext.createGain()
  subBass.type = 'sine'
  subBass.frequency.setValueAtTime(30, now)
  subBassGain.gain.setValueAtTime(0.6, now)
  subBassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
  subBass.connect(subBassGain)
  subBassGain.connect(instance.audioContext.destination)
  subBass.start(now)
  subBass.stop(now + 0.6)
}
/**
 * Start background music
 * @param {Object} instance - Sound instance
 * @param {Object} k - Kaplay instance
 * @param {string} trackName - Name of the audio track to play
 */
export function startBackgroundMusic(instance, k, trackName) {
  //
  // If same track is already playing globally, don't restart it
  //
  if (globalBackgroundMusic && globalCurrentTrack === trackName && !globalBackgroundMusic.paused) {
    return
  }
  //
  // Stop any currently playing music
  //
  if (globalBackgroundMusic) {
    globalBackgroundMusic.paused = false
    globalBackgroundMusic.stop()
  }
  //
  // Play the track
  //
  const music = k.play(trackName, {
    volume: CFG.audio.backgroundMusic.volume,
    loop: true
  })

  globalBackgroundMusic = music
  globalCurrentTrack = trackName
}
/**
 * Stop background music
 * @param {Object} instance - Sound instance
 */
export function stopBackgroundMusic(instance) {
  if (globalBackgroundMusic) {
    globalBackgroundMusic.paused = false
    globalBackgroundMusic.stop()
    globalBackgroundMusic = null
    globalCurrentTrack = null
  }
}
/**
 * Check if background music is playing
 * @param {Object} instance - Sound instance
 * @returns {boolean}
 */
export function isBackgroundMusicPlaying(instance) {
  return globalBackgroundMusic && !globalBackgroundMusic.paused
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
 * Play random short sound
 * @param {Object} instance - Sound instance
 */
function playBlip(instance) {
  const oscillator = instance.audioContext.createOscillator()
  const gain = instance.audioContext.createGain()
  const filter = instance.audioContext.createBiquadFilter()
  // Random frequency in range
  const frequencies = [110, 165, 220, 330, 440, 660]
  const frequency = frequencies[Math.floor(Math.random() * frequencies.length)]
  // Different oscillator types for sound variety
  const oscillatorTypes = ['sine', 'triangle', 'square', 'sawtooth']
  oscillator.type = oscillatorTypes[Math.floor(Math.random() * oscillatorTypes.length)]
  oscillator.frequency.value = frequency

  filter.type = 'lowpass'
  filter.frequency.value = 800
  // Envelope
  const now = instance.audioContext.currentTime
  gain.gain.value = 0
  gain.gain.linearRampToValueAtTime(CFG.audio.ambient.blip, now + 0.1)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 2)

  oscillator.connect(filter)
  filter.connect(gain)
  gain.connect(instance.ambientMasterGain)

  oscillator.start(now)
  oscillator.stop(now + 2)
}
/**
 * Create single bone crack sound
 * @param {Object} instance - Sound instance
 * @param {number} time - Start time
 * @param {number} freq - Base frequency
 * @param {number} volume - Volume level
 */
function createCrack(instance, time, freq, volume) {
  const duration = 0.08
  // Sharp crack sound
  const crack = instance.audioContext.createOscillator()
  const crackGain = instance.audioContext.createGain()

  crack.type = 'sawtooth'
  crack.frequency.setValueAtTime(freq, time)
  crack.frequency.exponentialRampToValueAtTime(freq * 0.3, time + duration)
  // Very sharp attack, quick decay
  crackGain.gain.setValueAtTime(volume, time)
  crackGain.gain.exponentialRampToValueAtTime(0.001, time + duration)

  crack.connect(crackGain)
  crackGain.connect(instance.audioContext.destination)

  crack.start(time)
  crack.stop(time + duration)
}
