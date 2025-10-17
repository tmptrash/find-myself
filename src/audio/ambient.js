// Процедурная генерация мрачной ambient музыки

// Создание инстанса ambient музыки
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

// Инициализация аудио контекста
function init(instance) {
  if (instance.audioContext) return
  
  // Используем глобальный аудио контекст
  instance.audioContext = window.gameAudioContext
  
  // Главный регулятор громкости
  instance.masterGain = instance.audioContext.createGain()
  instance.masterGain.gain.value = 0.4
  instance.masterGain.connect(instance.audioContext.destination)
}

// Запуск ambient музыки
export async function start(instance) {
  init(instance)
  
  // Запоминаем был ли контекст suspended
  const wasSuspended = instance.audioContext.state === 'suspended'
  
  // Убеждаемся что контекст запущен
  if (wasSuspended) {
    try {
      await instance.audioContext.resume()
    } catch (e) {
      // Устанавливаем флаг что музыка НЕ играет
      instance.isPlaying = false
      return
    }
  }
  
  // КРИТИЧЕСКАЯ ПРОВЕРКА: если контекст все еще не running после resume,
  // НЕ создаем осцилляторы (они будут ждать и запустятся при первой интеракции)
  if (instance.audioContext.state !== 'running') {
    instance.isPlaying = false
    return
  }
  
  // Если музыка реально играет (не просто флаг, а реально), не перезапускаем
  if (isActuallyPlaying(instance) && !wasSuspended) {
    return
  }
  
  // Если контекст был suspended или есть "мертвые" осцилляторы, очищаем их
  if (instance.oscillators.length > 0) {
    stop(instance)
    // Небольшая задержка для очистки
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  instance.isPlaying = true
  
  // Низкий дрон (основа)
  createDrone(instance, 55, 0.08) // A1
  createDrone(instance, 82.5, 0.06) // E2 (квинта)
  createDrone(instance, 110, 0.05) // A2 (октава)
  
  // Средние тона (загадочность)
  createOscillatingDrone(instance, 220, 0.03, 0.002) // A3 с модуляцией
  createOscillatingDrone(instance, 329.63, 0.02, 0.003) // E4
  
  // Высокие призрачные тона
  createOscillatingDrone(instance, 440, 0.015, 0.001) // A4
  createOscillatingDrone(instance, 554.37, 0.01, 0.0015) // C#5
  
  // Добавляем шум для атмосферности
  createNoise(instance)
  
  // Случайные звуки для напряжения
  scheduleRandomBlips(instance)
}

// Создание простого дрона
function createDrone(instance, frequency, volume) {
  try {
    const oscillator = instance.audioContext.createOscillator()
    const gain = instance.audioContext.createGain()
    
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    
    gain.gain.value = 0
    gain.gain.linearRampToValueAtTime(volume, instance.audioContext.currentTime + 0.5)
    
    oscillator.connect(gain)
    gain.connect(instance.masterGain)
    
    oscillator.start()
    
    instance.oscillators.push(oscillator)
    instance.gains.push(gain)
  } catch (e) {
    // Игнорируем ошибки
  }
}

// Создание дрона с модуляцией частоты
function createOscillatingDrone(instance, baseFrequency, volume, modulationDepth) {
  const oscillator = instance.audioContext.createOscillator()
  const gain = instance.audioContext.createGain()
  const lfo = instance.audioContext.createOscillator()
  const lfoGain = instance.audioContext.createGain()
  
  oscillator.type = 'triangle'
  oscillator.frequency.value = baseFrequency
  
  // LFO для модуляции частоты
  lfo.type = 'sine'
  lfo.frequency.value = Math.random() * 0.3 + 0.1 // 0.1-0.4 Hz
  lfoGain.gain.value = baseFrequency * modulationDepth
  
  lfo.connect(lfoGain)
  lfoGain.connect(oscillator.frequency)
  
  gain.gain.value = 0
  gain.gain.linearRampToValueAtTime(volume, instance.audioContext.currentTime + 0.5)
  
  oscillator.connect(gain)
  gain.connect(instance.masterGain)
  
  oscillator.start()
  lfo.start()
  
  instance.oscillators.push(oscillator)
  instance.oscillators.push(lfo)
  instance.gains.push(gain)
}

// Создание белого шума
function createNoise(instance) {
  // Создаём белый шум
  const bufferSize = instance.audioContext.sampleRate * 2
  const buffer = instance.audioContext.createBuffer(1, bufferSize, instance.audioContext.sampleRate)
  const data = buffer.getChannelData(0)
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  
  instance.noiseNode = instance.audioContext.createBufferSource()
  instance.noiseNode.buffer = buffer
  instance.noiseNode.loop = true
  
  // Фильтр для шума
  instance.filterNode = instance.audioContext.createBiquadFilter()
  instance.filterNode.type = 'lowpass'
  instance.filterNode.frequency.value = 200
  instance.filterNode.Q.value = 0.5
  
  const noiseGain = instance.audioContext.createGain()
  noiseGain.gain.value = 0.03
  
  instance.noiseNode.connect(instance.filterNode)
  instance.filterNode.connect(noiseGain)
  noiseGain.connect(instance.masterGain)
  
  instance.noiseNode.start()
}

// Планирование случайных звуков
function scheduleRandomBlips(instance) {
  if (!instance.isPlaying) return
  
  // Случайный звук каждые 1-3 секунды
  const delay = Math.random() * 2000 + 1000
  
  setTimeout(() => {
    if (instance.isPlaying) {
      playBlip(instance)
      scheduleRandomBlips(instance)
    }
  }, delay)
}

// Воспроизведение случайного короткого звука
function playBlip(instance) {
  const oscillator = instance.audioContext.createOscillator()
  const gain = instance.audioContext.createGain()
  const filter = instance.audioContext.createBiquadFilter()
  
  // Случайная частота в диапазоне
  const frequencies = [110, 165, 220, 330, 440, 660]
  const frequency = frequencies[Math.floor(Math.random() * frequencies.length)]
  
  // Разные типы осцилляторов для разнообразия звуков
  const oscillatorTypes = ['sine', 'triangle', 'square', 'sawtooth']
  oscillator.type = oscillatorTypes[Math.floor(Math.random() * oscillatorTypes.length)]
  oscillator.frequency.value = frequency
  
  filter.type = 'lowpass'
  filter.frequency.value = 800
  
  // Envelope
  const now = instance.audioContext.currentTime
  gain.gain.value = 0
  gain.gain.linearRampToValueAtTime(0.08, now + 0.1)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 2)
  
  oscillator.connect(filter)
  filter.connect(gain)
  gain.connect(instance.masterGain)
  
  oscillator.start(now)
  oscillator.stop(now + 2)
}

// Остановка ambient музыки
export function stop(instance) {    
  instance.isPlaying = false
  
  // Мгновенно останавливаем все осцилляторы
  instance.oscillators.forEach(osc => {
    try {
      osc.stop()
      osc.disconnect()
    } catch (e) {
      // Осциллятор уже остановлен
    }
  })
  
  if (instance.noiseNode) {
    try {
      instance.noiseNode.stop()
      instance.noiseNode.disconnect()
    } catch (e) {
      // Нода уже остановлена
    }
  }
  
  // Отключаем все gain узлы
  instance.gains.forEach(gain => {
    try {
      gain.disconnect()
    } catch (e) {
      // Gain уже отключен
    }
  })
  
  // Сбрасываем громкость мастер-канала
  if (instance.masterGain) {
    instance.masterGain.gain.cancelScheduledValues(instance.audioContext.currentTime)
    instance.masterGain.gain.value = 0.4 // Восстанавливаем громкость для следующего запуска
  }
  
  instance.oscillators = []
  instance.gains = []
  instance.noiseNode = null
}

// Установка громкости
export function setVolume(instance, volume) {
  if (instance.masterGain) {
    instance.masterGain.gain.value = volume
  }
}

// Получение статуса музыки
export function getStatus(instance) {
  return {
    isPlaying: instance.isPlaying,
    audioContextState: instance.audioContext ? instance.audioContext.state : 'not initialized',
    oscillatorsCount: instance.oscillators.length,
    volume: instance.masterGain ? instance.masterGain.gain.value : 0
  }
}

// Проверка, реально ли играет музыка
export function isActuallyPlaying(instance) {
  return instance.isPlaying && 
         instance.audioContext && 
         instance.audioContext.state === 'running' && 
         window.gameAudioContext.state === 'running' &&
         instance.oscillators.length > 0
}
