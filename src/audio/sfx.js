import { CONFIG } from '../config.js'

// ============================================
// ЗВУКОВЫЕ ЭФФЕКТЫ ДЛЯ ИГРЫ
// ============================================

// Создание инстанса (возвращает глобальный AudioContext)
export function create() {
  return window.gameAudioContext
}

// Звук приземления
export function playLandSound(audioContext) {
  const now = audioContext.currentTime
  
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(CONFIG.audio.sfx.landFreqStart, now)
  oscillator.frequency.exponentialRampToValueAtTime(CONFIG.audio.sfx.landFreqEnd, now + 0.08)
  
  gainNode.gain.setValueAtTime(CONFIG.audio.sfx.landVolume, now)
  gainNode.gain.exponentialRampToValueAtTime(CONFIG.audio.sfx.landFade, now + CONFIG.audio.sfx.landDuration)
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  oscillator.start(now)
  oscillator.stop(now + CONFIG.audio.sfx.landDuration)
}

// Звук шагов при беге
export function playStepSound(audioContext) {
  const now = audioContext.currentTime
  
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(CONFIG.audio.sfx.stepFreqStart, now)
  oscillator.frequency.exponentialRampToValueAtTime(CONFIG.audio.sfx.stepFreqEnd, now + 0.03)
  
  gainNode.gain.setValueAtTime(CONFIG.audio.sfx.stepVolume, now)
  gainNode.gain.exponentialRampToValueAtTime(CONFIG.audio.sfx.stepFade, now + CONFIG.audio.sfx.stepDuration)
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  oscillator.start(now)
  oscillator.stop(now + CONFIG.audio.sfx.stepDuration)
}

// Звук появления героя после аннигиляции
// "Импульс энергии" - быстрое нарастание + щелчок
export function playSpawnSound(audioContext) {
  const now = audioContext.currentTime
  
  // Быстрое нарастание (волна энергии)
  const sweep = audioContext.createOscillator()
  const sweepGain = audioContext.createGain()
  
  sweep.type = 'sine'
  sweep.frequency.setValueAtTime(80, now)
  sweep.frequency.exponentialRampToValueAtTime(400, now + 0.15)
  
  sweepGain.gain.setValueAtTime(0.4, now)
  sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
  
  sweep.connect(sweepGain)
  sweepGain.connect(audioContext.destination)
  
  sweep.start(now)
  sweep.stop(now + 0.15)
  
  // Щелчок в момент появления
  const click = audioContext.createOscillator()
  const clickGain = audioContext.createGain()
  
  click.type = 'sine'
  click.frequency.setValueAtTime(800, now + 0.15)
  
  clickGain.gain.setValueAtTime(0.3, now + 0.15)
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.20)
  
  click.connect(clickGain)
  clickGain.connect(audioContext.destination)
  
  click.start(now + 0.15)
  click.stop(now + 0.20)
}

