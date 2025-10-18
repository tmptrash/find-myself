// Procedural generation of dark ambient music
import { CONFIG } from '../config.js'
import { getAudioContext, resumeAudioContext } from './context.js'

// Create ambient music instance
export function create() {
  return {
    audioContext: null,
    oscillators: [],
    gains: [],
    masterGain: null,
    isPlaying: false,
    noiseNode: null,
    filterNode: null
  }
}

// Initialize audio context
function init(instance) {
  if (instance.audioContext) return
  
  // Get single audio context
  instance.audioContext = getAudioContext()
  
  // Master volume control (from config)
  instance.masterGain = instance.audioContext.createGain()
  instance.masterGain.gain.value = CONFIG.audio.ambient.masterVolume
  instance.masterGain.connect(instance.audioContext.destination)
}

// Start ambient music
export async function start(instance) {
  init(instance)
  
  // Remember if context was suspended
  const wasSuspended = instance.audioContext.state === 'suspended'
  
  // Make sure context is started
  if (wasSuspended) {
    try {
      await resumeAudioContext()
    } catch (e) {
      // Set flag that music is NOT playing
      instance.isPlaying = false
      return
    }
  }
  
  // CRITICAL CHECK: if context is still not running after resume,
  // DON'T create oscillators (they will wait and start on first interaction)
  if (instance.audioContext.state !== 'running') {
    instance.isPlaying = false
    return
  }
  
  // If music is actually playing (not just flag, but really), don't restart
  if (isActuallyPlaying(instance) && !wasSuspended) {
    return
  }
  
  // If context was suspended or there are "dead" oscillators, clean them
  if (instance.oscillators.length > 0) {
    stop(instance)
    // Small delay for cleanup
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  instance.isPlaying = true
  
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

// Create simple drone
function createDrone(instance, frequency, volume) {
  try {
    const oscillator = instance.audioContext.createOscillator()
    const gain = instance.audioContext.createGain()
    
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    
    gain.gain.value = 0
    gain.gain.linearRampToValueAtTime(volume, instance.audioContext.currentTime + CONFIG.audio.ambient.fadeInTime)
    
    oscillator.connect(gain)
    gain.connect(instance.masterGain)
    
    oscillator.start()
    
    instance.oscillators.push(oscillator)
    instance.gains.push(gain)
  } catch (e) {
    // Ignore errors
  }
}

// Create drone with frequency modulation
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
  gain.connect(instance.masterGain)
  
  oscillator.start()
  lfo.start()
  
  instance.oscillators.push(oscillator)
  instance.oscillators.push(lfo)
  instance.gains.push(gain)
}

// Create white noise
function createNoise(instance) {
  // Create white noise
  const bufferSize = instance.audioContext.sampleRate * 2
  const buffer = instance.audioContext.createBuffer(1, bufferSize, instance.audioContext.sampleRate)
  const data = buffer.getChannelData(0)
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  
  instance.noiseNode = instance.audioContext.createBufferSource()
  instance.noiseNode.buffer = buffer
  instance.noiseNode.loop = true
  
  // Filter for noise
  instance.filterNode = instance.audioContext.createBiquadFilter()
  instance.filterNode.type = 'lowpass'
  instance.filterNode.frequency.value = 200
  instance.filterNode.Q.value = 0.5
  
  const noiseGain = instance.audioContext.createGain()
  noiseGain.gain.value = CONFIG.audio.ambient.noiseVolume
  
  instance.noiseNode.connect(instance.filterNode)
  instance.filterNode.connect(noiseGain)
  noiseGain.connect(instance.masterGain)
  
  instance.noiseNode.start()
}

// Schedule random sounds
function scheduleRandomBlips(instance) {
  if (!instance.isPlaying) return
  
  // Random sound every 1-3 seconds
  const delay = Math.random() * 2000 + 1000
  
  setTimeout(() => {
    if (instance.isPlaying) {
      playBlip(instance)
      scheduleRandomBlips(instance)
    }
  }, delay)
}

// Play random short sound
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
  gain.connect(instance.masterGain)
  
  oscillator.start(now)
  oscillator.stop(now + 2)
}

// Stop ambient music
export function stop(instance) {    
  instance.isPlaying = false
  
  // Immediately stop all oscillators
  instance.oscillators.forEach(osc => {
    try {
      osc.stop()
      osc.disconnect()
    } catch (e) {
      // Oscillator already stopped
    }
  })
  
  if (instance.noiseNode) {
    try {
      instance.noiseNode.stop()
      instance.noiseNode.disconnect()
    } catch (e) {
      // Node already stopped
    }
  }
  
  // Disconnect all gain nodes
  instance.gains.forEach(gain => {
    try {
      gain.disconnect()
    } catch (e) {
      // Gain already disconnected
    }
  })
  
  // Reset master channel volume (from config)
  if (instance.masterGain) {
    instance.masterGain.gain.cancelScheduledValues(instance.audioContext.currentTime)
    instance.masterGain.gain.value = CONFIG.audio.ambient.masterVolume
  }
  
  instance.oscillators = []
  instance.gains = []
  instance.noiseNode = null
}

// Set volume
export function setVolume(instance, volume) {
  if (instance.masterGain) {
    instance.masterGain.gain.value = volume
  }
}

// Get music status
export function getStatus(instance) {
  return {
    isPlaying: instance.isPlaying,
    audioContextState: instance.audioContext ? instance.audioContext.state : 'not initialized',
    oscillatorsCount: instance.oscillators.length,
    volume: instance.masterGain ? instance.masterGain.gain.value : 0
  }
}

// Check if music is actually playing
export function isActuallyPlaying(instance) {
  return instance.isPlaying && 
         instance.audioContext && 
         instance.audioContext.state === 'running' && 
         instance.oscillators.length > 0
}
