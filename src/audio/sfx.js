import { CONFIG } from '../config.js'

// ============================================
// ЗВУКОВЫЕ ЭФФЕКТЫ ДЛЯ ИГРЫ
// ============================================

/**
 * Создание инстанса звуковых эффектов с переиспользуемыми GainNode
 * @returns {Object} Объект с AudioContext и мастер-гейнами для каждого типа звука
 */
export function create() {
  const ctx = window.gameAudioContext
  
  // Создаем мастер-гейны для каждого типа звука (переиспользуемые)
  // Они позволяют управлять общей громкостью звуков каждого типа
  // и избегают создания новых GainNode при каждом воспроизведении
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
    // Добавляем для обратной совместимости (используется в hero.js для аннигиляции)
    get currentTime() { return ctx.currentTime },
    createOscillator: () => ctx.createOscillator(),
    createGain: () => ctx.createGain(),
    destination: ctx.destination
  }
}

// Звук приземления
export function playLandSound(sfx) {
  const now = sfx.context.currentTime
  
  // Oscillator создаем каждый раз (они одноразовые)
  const oscillator = sfx.context.createOscillator()
  // Создаем временный GainNode для envelope звука
  const envelope = sfx.context.createGain()
  
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(CONFIG.audio.sfx.landFreqStart, now)
  oscillator.frequency.exponentialRampToValueAtTime(CONFIG.audio.sfx.landFreqEnd, now + 0.08)
  
  envelope.gain.setValueAtTime(CONFIG.audio.sfx.landVolume, now)
  envelope.gain.exponentialRampToValueAtTime(CONFIG.audio.sfx.landFade, now + CONFIG.audio.sfx.landDuration)
  
  // Подключаем через мастер-гейн
  oscillator.connect(envelope)
  envelope.connect(sfx.landGain)
  
  oscillator.start(now)
  oscillator.stop(now + CONFIG.audio.sfx.landDuration)
}

// Звук шагов при беге
export function playStepSound(sfx) {
  const now = sfx.context.currentTime
  
  const oscillator = sfx.context.createOscillator()
  const envelope = sfx.context.createGain()
  
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(CONFIG.audio.sfx.stepFreqStart, now)
  oscillator.frequency.exponentialRampToValueAtTime(CONFIG.audio.sfx.stepFreqEnd, now + 0.03)
  
  envelope.gain.setValueAtTime(CONFIG.audio.sfx.stepVolume, now)
  envelope.gain.exponentialRampToValueAtTime(CONFIG.audio.sfx.stepFade, now + CONFIG.audio.sfx.stepDuration)
  
  // Подключаем через мастер-гейн
  oscillator.connect(envelope)
  envelope.connect(sfx.stepGain)
  
  oscillator.start(now)
  oscillator.stop(now + CONFIG.audio.sfx.stepDuration)
}

// Звук появления героя после аннигиляции
// "Импульс энергии" - быстрое нарастание + щелчок
export function playSpawnSound(sfx) {
  const now = sfx.context.currentTime
  
  // Быстрое нарастание (волна энергии)
  const sweep = sfx.context.createOscillator()
  const sweepEnvelope = sfx.context.createGain()
  
  sweep.type = 'sine'
  sweep.frequency.setValueAtTime(80, now)
  sweep.frequency.exponentialRampToValueAtTime(400, now + 0.15)
  
  sweepEnvelope.gain.setValueAtTime(0.4, now)
  sweepEnvelope.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
  
  // Подключаем через мастер-гейн
  sweep.connect(sweepEnvelope)
  sweepEnvelope.connect(sfx.spawnGain)
  
  sweep.start(now)
  sweep.stop(now + 0.15)
  
  // Щелчок в момент появления
  const click = sfx.context.createOscillator()
  const clickEnvelope = sfx.context.createGain()
  
  click.type = 'sine'
  click.frequency.setValueAtTime(800, now + 0.15)
  
  clickEnvelope.gain.setValueAtTime(0.3, now + 0.15)
  clickEnvelope.gain.exponentialRampToValueAtTime(0.001, now + 0.20)
  
  // Подключаем через мастер-гейн
  click.connect(clickEnvelope)
  clickEnvelope.connect(sfx.spawnGain)
  
  click.start(now + 0.15)
  click.stop(now + 0.20)
}

