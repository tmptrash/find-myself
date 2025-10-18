import { CONFIG } from '../config.js'
import { getAudioContext } from './context.js'

// ============================================
// SOUND EFFECTS FOR THE GAME
// ============================================

/**
 * Create sound effects instance with reusable GainNodes
 * @returns {Object} Object with AudioContext and master gains for each sound type
 */
export function create() {
  const ctx = getAudioContext()
  
  // Create master gains for each sound type (reusable)
  // They allow controlling overall volume for each sound type
  // and avoid creating new GainNodes on each playback
  const landGain = ctx.createGain()
  landGain.connect(ctx.destination)
  
  const stepGain = ctx.createGain()
  stepGain.connect(ctx.destination)
  
  const spawnGain = ctx.createGain()
  spawnGain.connect(ctx.destination)
  
  return {
    context: ctx,
    landGain,
    stepGain,
    spawnGain,
    // Add for backward compatibility (used in hero.js for annihilation)
    get currentTime() { return ctx.currentTime },
    createOscillator: () => ctx.createOscillator(),
    createGain: () => ctx.createGain(),
    destination: ctx.destination
  }
}

// Landing sound
export function playLandSound(sfx) {
  const now = sfx.context.currentTime
  
  // Oscillators are created each time (they're disposable)
  const oscillator = sfx.context.createOscillator()
  // Create temporary GainNode for sound envelope
  const envelope = sfx.context.createGain()
  
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(CONFIG.audio.sfx.landFreqStart, now)
  oscillator.frequency.exponentialRampToValueAtTime(CONFIG.audio.sfx.landFreqEnd, now + 0.08)
  
  envelope.gain.setValueAtTime(CONFIG.audio.sfx.landVolume, now)
  envelope.gain.exponentialRampToValueAtTime(CONFIG.audio.sfx.landFade, now + CONFIG.audio.sfx.landDuration)
  
  // Connect through master gain
  oscillator.connect(envelope)
  envelope.connect(sfx.landGain)
  
  oscillator.start(now)
  oscillator.stop(now + CONFIG.audio.sfx.landDuration)
}

// Running step sound
export function playStepSound(sfx) {
  const now = sfx.context.currentTime
  
  const oscillator = sfx.context.createOscillator()
  const envelope = sfx.context.createGain()
  
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(CONFIG.audio.sfx.stepFreqStart, now)
  oscillator.frequency.exponentialRampToValueAtTime(CONFIG.audio.sfx.stepFreqEnd, now + 0.03)
  
  envelope.gain.setValueAtTime(CONFIG.audio.sfx.stepVolume, now)
  envelope.gain.exponentialRampToValueAtTime(CONFIG.audio.sfx.stepFade, now + CONFIG.audio.sfx.stepDuration)
  
  // Connect through master gain
  oscillator.connect(envelope)
  envelope.connect(sfx.stepGain)
  
  oscillator.start(now)
  oscillator.stop(now + CONFIG.audio.sfx.stepDuration)
}

// Hero spawn sound after annihilation
// "Energy pulse" - quick rise + click
export function playSpawnSound(sfx) {
  const now = sfx.context.currentTime
  
  // Quick rise (energy wave)
  const sweep = sfx.context.createOscillator()
  const sweepEnvelope = sfx.context.createGain()
  
  sweep.type = 'sine'
  sweep.frequency.setValueAtTime(80, now)
  sweep.frequency.exponentialRampToValueAtTime(400, now + 0.15)
  
  sweepEnvelope.gain.setValueAtTime(0.4, now)
  sweepEnvelope.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
  
  // Connect through master gain
  sweep.connect(sweepEnvelope)
  sweepEnvelope.connect(sfx.spawnGain)
  
  sweep.start(now)
  sweep.stop(now + 0.15)
  
  // Click at spawn moment
  const click = sfx.context.createOscillator()
  const clickEnvelope = sfx.context.createGain()
  
  click.type = 'sine'
  click.frequency.setValueAtTime(800, now + 0.15)
  
  clickEnvelope.gain.setValueAtTime(0.3, now + 0.15)
  clickEnvelope.gain.exponentialRampToValueAtTime(0.001, now + 0.20)
  
  // Connect through master gain
  click.connect(clickEnvelope)
  clickEnvelope.connect(sfx.spawnGain)
  
  click.start(now + 0.15)
  click.stop(now + 0.20)
}
