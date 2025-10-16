// Процедурная генерация мрачной ambient музыки
export class AmbientMusic {
  constructor() {
    this.audioContext = null
    this.oscillators = []
    this.gains = []
    this.masterGain = null
    this.isPlaying = false
    this.noiseNode = null
    this.filterNode = null
  }

  init() {
    if (this.audioContext) return
    
    // Используем глобальный аудио контекст
    this.audioContext = window.gameAudioContext
    
    // Главный регулятор громкости
    this.masterGain = this.audioContext.createGain()
    this.masterGain.gain.value = 0.4
    this.masterGain.connect(this.audioContext.destination)
  }

  async start() {
    this.init()
    
    // Убеждаемся что контекст запущен
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume()
      } catch (e) {
        // Устанавливаем флаг что музыка НЕ играет
        this.isPlaying = false
        return
      }
    }
    
    // Если уже есть осцилляторы и контекст запущен, музыка уже играет
    if (this.isPlaying && this.oscillators.length > 0 && this.audioContext.state === 'running') {
      return
    }
    
    // Если есть старые осцилляторы но контекст был suspended, очищаем их
    if (this.oscillators.length > 0) {
      this.stop()
      // Небольшая задержка для очистки
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    
    this.isPlaying = true
    
    // Низкий дрон (основа)
    this.createDrone(55, 0.08) // A1
    this.createDrone(82.5, 0.06) // E2 (квинта)
    this.createDrone(110, 0.05) // A2 (октава)
    
    // Средние тона (загадочность)
    this.createOscillatingDrone(220, 0.03, 0.002) // A3 с модуляцией
    this.createOscillatingDrone(329.63, 0.02, 0.003) // E4
    
    // Высокие призрачные тона
    this.createOscillatingDrone(440, 0.015, 0.001) // A4
    this.createOscillatingDrone(554.37, 0.01, 0.0015) // C#5
    
    // Добавляем шум для атмосферности
    this.createNoise()
    
    // Случайные звуки для напряжения
    this.scheduleRandomBlips()
  }

  createDrone(frequency, volume) {
    try {
      const oscillator = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()
      
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      
      gain.gain.value = 0
      gain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.5)
      
      oscillator.connect(gain)
      gain.connect(this.masterGain)
      
      oscillator.start()
      
      this.oscillators.push(oscillator)
      this.gains.push(gain)
    } catch (e) {
      // Игнорируем ошибки
    }
  }

  createOscillatingDrone(baseFrequency, volume, modulationDepth) {
    const oscillator = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    const lfo = this.audioContext.createOscillator()
    const lfoGain = this.audioContext.createGain()
    
    oscillator.type = 'triangle'
    oscillator.frequency.value = baseFrequency
    
    // LFO для модуляции частоты
    lfo.type = 'sine'
    lfo.frequency.value = Math.random() * 0.3 + 0.1 // 0.1-0.4 Hz
    lfoGain.gain.value = baseFrequency * modulationDepth
    
    lfo.connect(lfoGain)
    lfoGain.connect(oscillator.frequency)
    
    gain.gain.value = 0
    gain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.5)
    
    oscillator.connect(gain)
    gain.connect(this.masterGain)
    
    oscillator.start()
    lfo.start()
    
    this.oscillators.push(oscillator)
    this.oscillators.push(lfo)
    this.gains.push(gain)
  }

  createNoise() {
    // Создаём белый шум
    const bufferSize = this.audioContext.sampleRate * 2
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    
    this.noiseNode = this.audioContext.createBufferSource()
    this.noiseNode.buffer = buffer
    this.noiseNode.loop = true
    
    // Фильтр для шума
    this.filterNode = this.audioContext.createBiquadFilter()
    this.filterNode.type = 'lowpass'
    this.filterNode.frequency.value = 200
    this.filterNode.Q.value = 0.5
    
    const noiseGain = this.audioContext.createGain()
    noiseGain.gain.value = 0.03
    
    this.noiseNode.connect(this.filterNode)
    this.filterNode.connect(noiseGain)
    noiseGain.connect(this.masterGain)
    
    this.noiseNode.start()
  }

  scheduleRandomBlips() {
    if (!this.isPlaying) return
    
    // Случайный звук каждые 1-3 секунды
    const delay = Math.random() * 2000 + 1000
    
    setTimeout(() => {
      if (this.isPlaying) {
        this.playBlip()
        this.scheduleRandomBlips()
      }
    }, delay)
  }

  playBlip() {
    const oscillator = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    const filter = this.audioContext.createBiquadFilter()
    
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
    const now = this.audioContext.currentTime
    gain.gain.value = 0
    gain.gain.linearRampToValueAtTime(0.08, now + 0.1)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2)
    
    oscillator.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)
    
    oscillator.start(now)
    oscillator.stop(now + 2)
  }

  stop() {
    if (!this.isPlaying) return
    
    this.isPlaying = false
    
    // Плавно затухаем
    const now = this.audioContext.currentTime
    this.masterGain.gain.exponentialRampToValueAtTime(0.001, now + 2)
    
    setTimeout(() => {
      this.oscillators.forEach(osc => {
        try {
          osc.stop()
        } catch (e) {
          // ignore
        }
      })
      
      if (this.noiseNode) {
        try {
          this.noiseNode.stop()
        } catch (e) {
          // ignore
        }
      }
      
      this.oscillators = []
      this.gains = []
    }, 2100)
  }

  setVolume(volume) {
    if (this.masterGain) {
      this.masterGain.gain.value = volume
    }
  }
  
  getStatus() {
    return {
      isPlaying: this.isPlaying,
      audioContextState: this.audioContext ? this.audioContext.state : 'not initialized',
      oscillatorsCount: this.oscillators.length,
      volume: this.masterGain ? this.masterGain.gain.value : 0
    }
  }
  
  isActuallyPlaying() {
    // Проверяем реально ли играет музыка
    return this.isPlaying && 
           this.audioContext && 
           this.audioContext.state === 'running' && 
           this.oscillators.length > 0
  }
}

