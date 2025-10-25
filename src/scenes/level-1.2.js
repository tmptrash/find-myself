import { CFG } from '../cfg.js'
import { initScene, updateEerieSound } from '../utils/scene.js'
import * as Spikes from '../components/spikes.js'
import { createLightningState, updateLightning, drawLightning } from '../utils/connection.js'

export function sceneLevel2(k) {
  k.scene("level-1.2", () => {
    // Initialize level with heroes
    const { sound, hero, antiHero } = initScene({
      k,
      levelName: 'level-1.2',
      levelNumber: 2,
      nextLevel: 'level-1.3'
    })
    
    // Calculate spike positions between heroes
    const heroX = k.width() * CFG.levels['level-1.2'].heroSpawn.x / 100
    const antiHeroX = k.width() * CFG.levels['level-1.2'].antiHeroSpawn.x / 100
    const leftX = Math.min(heroX, antiHeroX)
    const rightX = Math.max(heroX, antiHeroX)
    const distance = rightX - leftX
    
    // First spike at 0.42 distance (shifted right, leaving landing space)
    const spike1X = leftX + distance * 0.42
    // Second spike at 0.73 distance (shifted further right)
    const spike2X = leftX + distance * 0.73
    
    const bottomPlatformHeight = k.height() * CFG.visual.bottomPlatformHeight / 100
    const platformY = k.height() - bottomPlatformHeight
    const spikeHeight = Spikes.getSpikeHeight(k)
    
    // Create first spike
    const spikes1 = Spikes.create({
      k,
      x: spike1X,
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Spikes.ORIENTATIONS.FLOOR,
      onHit: () => Spikes.handleCollision(spikes1, "level-1.2"),
      sfx: sound
    })
    
    // Create second spike
    const spikes2 = Spikes.create({
      k,
      x: spike2X,
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Spikes.ORIENTATIONS.FLOOR,
      onHit: () => Spikes.handleCollision(spikes2, "level-1.2"),
      sfx: sound
    })
    
    // Start spike animations after 1 second
    Spikes.startAnimation(spikes1)
    Spikes.startAnimation(spikes2)
    
    // Scene instance with state
    const inst = {
      k,
      sound,
      soundTimer: k.rand(3, 6),
      hero,
      antiHero,
      ...createLightningState()
    }
    
    // Setup eerie sound effect and lightning
    k.onUpdate(() => {
      updateEerieSound(inst)
      updateLightning(inst)
    })
    
    // Draw lightning effect
    k.onDraw(() => drawLightning(inst))
  })
}
