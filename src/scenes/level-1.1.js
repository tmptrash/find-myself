import { CFG } from '../cfg.js'
import { initScene, updateEerieSound } from '../utils/scene.js'
import * as Spikes from '../components/spikes.js'
import { createLightningState, updateLightning, drawLightning } from '../utils/connection.js'

export function sceneLevel1(k) {
  k.scene("level-1.1", () => {
    // Initialize level with heroes
    const { sound, hero, antiHero } = initScene({
      k,
      levelName: 'level-1.1',
      levelNumber: 1,
      nextLevel: 'level-1.2',
      showInstructions: true
    })
    
    // Create spikes in the middle of the level
    const centerX = k.width() / 2
    const bottomPlatformHeight = k.height() * CFG.visual.bottomPlatformHeight / 100
    const platformY = k.height() - bottomPlatformHeight
    const spikeHeight = Spikes.getSpikeHeight(k)  // Dynamic spike height based on screen resolution
    
    const spikes = Spikes.create({
      k,
      x: centerX + k.width() * 0.15,  // Shifted right by 15% of screen width
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Spikes.ORIENTATIONS.FLOOR,
      onHit: () => Spikes.handleCollision(spikes, "level-1.1"),
      sfx: sound
    })
    
    // Start spike animation after 2 seconds
    Spikes.startAnimation(spikes, 1)
    
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
      updateEerieSound(inst, 2, 6)
      updateLightning(inst)
    })
    
    // Draw lightning effect
    k.onDraw(() => drawLightning(inst))
  })
}
