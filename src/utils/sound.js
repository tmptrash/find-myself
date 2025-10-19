import { CONFIG } from '../config.js'

/**
 * Audio context singleton
 * @returns {AudioContext} The single AudioContext instance
 */

let audioContext = null

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
 * Start audio context - initializes and resumes the audio context
 * Should be called once when sound instance is created
 * @param {Object} instance - Sound instance
 * @returns {Promise<void>}
 */
export async function startAudioContext(instance) {
  const ctx = instance.audioContext
  
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
 * @param {Object} instance - Sound instance
 * @returns {Promise<void>}
 */
export async function resumeAudioContext(instance) {
  const ctx = instance.audioContext
  if (ctx && ctx.state === 'suspended') {
    await ctx.resume()
  }
}

// ============================================
// CREATE SOUND INSTANCE
// ============================================

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
  
  const spawnGain = ctx.createGain()
  spawnGain.connect(ctx.destination)
  
  return {
    // Audio context
    audioContext: ctx,
    
    // SFX master gains
    landGain,
    stepGain,
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

// ============================================
// AMBIENT MUSIC FUNCTIONS
// ============================================

/**
 * Initialize ambient music (internal)
 * @param {Object} instance - Sound instance
 */
function initAmbient(instance) {
  if (instance.ambientMasterGain) return
  
  // Master volume control (from config)
  instance.ambientMasterGain = instance.audioContext.createGain()
  instance.ambientMasterGain.gain.value = CONFIG.audio.ambient.masterVolume
  instance.ambientMasterGain.connect(instance.audioContext.destination)
}

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
  
  // Low drone (foundation) - use config
  createDrone(instance, 55, CONFIG.audio.ambient.bassVolume) // A1
  createDrone(instance, 82.5, CONFIG.audio.ambient.bassVolume * 0.75) // E2 (fifth)
  createDrone(instance, 110, CONFIG.audio.ambient.bassVolume * 0.625) // A2 (octave)
  
  // Mid tones (mystery) - use config
  createOscillatingDrone(instance, 220, CONFIG.audio.ambient.midVolume, 0.002) // A3 with modulation
  createOscillatingDrone(instance, 329.63, CONFIG.audio.ambient.midVolume * 0.67, 0.003) // E4
  
  // High ghostly tones - use config
  createOscillatingDrone(instance, 440, CONFIG.audio.ambient.highVolume, 0.001) // A4
  createOscillatingDrone(instance, 554.37, CONFIG.audio.ambient.highVolume * 0.67, 0.0015) // C#5
  
  // Add noise for atmosphere
  createNoise(instance)
  
  // Random sounds for tension
  scheduleRandomBlips(instance)
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
    instance.ambientMasterGain.gain.value = CONFIG.audio.ambient.masterVolume
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
    gain.gain.linearRampToValueAtTime(volume, instance.audioContext.currentTime + CONFIG.audio.ambient.fadeInTime)
    
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
  gain.gain.linearRampToValueAtTime(volume, instance.audioContext.currentTime + CONFIG.audio.ambient.fadeInTime)
  
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
  noiseGain.gain.value = CONFIG.audio.ambient.noiseVolume
  
  instance.ambientNoiseNode.connect(instance.ambientFilterNode)
  instance.ambientFilterNode.connect(noiseGain)
  noiseGain.connect(instance.ambientMasterGain)
  
  instance.ambientNoiseNode.start()
}

/**
 * Schedule random sounds
 * @param {Object} instance - Sound instance
 */
function scheduleRandomBlips(instance) {
  if (!instance.ambientIsPlaying) return
  
  // Random sound every 1-3 seconds
  const delay = Math.random() * 2000 + 1000
  
  setTimeout(() => {
    if (instance.ambientIsPlaying) {
      playBlip(instance)
      scheduleRandomBlips(instance)
    }
  }, delay)
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
  gain.gain.linearRampToValueAtTime(CONFIG.audio.ambient.blipVolume, now + 0.1)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 2)
  
  oscillator.connect(filter)
  filter.connect(gain)
  gain.connect(instance.ambientMasterGain)
  
  oscillator.start(now)
  oscillator.stop(now + 2)
}

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
  oscillator.frequency.setValueAtTime(CONFIG.audio.sfx.landFreqStart, now)
  oscillator.frequency.exponentialRampToValueAtTime(CONFIG.audio.sfx.landFreqEnd, now + 0.08)
  
  envelope.gain.setValueAtTime(CONFIG.audio.sfx.landVolume, now)
  envelope.gain.exponentialRampToValueAtTime(CONFIG.audio.sfx.landFade, now + CONFIG.audio.sfx.landDuration)
  
  // Connect through master gain
  oscillator.connect(envelope)
  envelope.connect(instance.landGain)
  
  oscillator.start(now)
  oscillator.stop(now + CONFIG.audio.sfx.landDuration)
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
  oscillator.frequency.setValueAtTime(CONFIG.audio.sfx.stepFreqStart, now)
  oscillator.frequency.exponentialRampToValueAtTime(CONFIG.audio.sfx.stepFreqEnd, now + 0.03)
  
  envelope.gain.setValueAtTime(CONFIG.audio.sfx.stepVolume, now)
  envelope.gain.exponentialRampToValueAtTime(CONFIG.audio.sfx.stepFade, now + CONFIG.audio.sfx.stepDuration)
  
  // Connect through master gain
  oscillator.connect(envelope)
  envelope.connect(instance.stepGain)
  
  oscillator.start(now)
  oscillator.stop(now + CONFIG.audio.sfx.stepDuration)
}

/**
 * Play hero spawn sound after annihilation
 * "Energy pulse" - quick rise + click
 * @param {Object} instance - Sound instance
 */
export function playSpawnSound(instance) {
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
  
  // Click at spawn moment
  const click = instance.audioContext.createOscillator()
  const clickEnvelope = instance.audioContext.createGain()
  
  click.type = 'sine'
  click.frequency.setValueAtTime(800, now + 0.15)
  
  clickEnvelope.gain.setValueAtTime(0.3, now + 0.15)
  clickEnvelope.gain.exponentialRampToValueAtTime(0.001, now + 0.20)
  
  // Connect through master gain
  click.connect(clickEnvelope)
  clickEnvelope.connect(instance.spawnGain)
  
  click.start(now + 0.15)
  click.stop(now + 0.20)
}

/**
 * Play annihilation sound effect (deep powerful explosion)
 * @param {Object} instance - Sound instance from create()
 */
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

