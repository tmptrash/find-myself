import { CFG } from '../../../cfg.js'
import { initScene, updateEerieSound } from '../utils/scene.js'
import * as Spikes from '../components/spikes.js'
import * as MovingPlatform from '../../../components/moving-platform.js'

export function sceneLevel3(k) {
  k.scene("level-1.3", () => {
    // Calculate spike positions first
    const heroX = k.width() * CFG.levels['level-1.3'].heroSpawn.x / 100
    const antiHeroX = k.width() * CFG.levels['level-1.3'].antiHeroSpawn.x / 100
    const leftX = Math.min(heroX, antiHeroX)
    const rightX = Math.max(heroX, antiHeroX)
    const distance = rightX - leftX
    
    // First spike at 1/3 distance
    const spike1X = leftX + distance / 3
    
    // Second spike at 2/3 distance
    const spike2X = leftX + distance * 2 / 3
    
    // Moving platforms before each spike
    const spikeWidth = Spikes.getSpikeWidth(k)
    const movingPlatform1X = spike1X - spikeWidth * 1.1  // Before first spike
    const movingPlatform2X = spike2X - spikeWidth * 1.1  // Before second spike
    
    // Initialize level with heroes and TWO gaps in platform
    const { sound, hero, antiHero } = initScene({
      k,
      levelName: 'level-1.3',
      levelNumber: 3,
      nextLevel: 'level-1.4',
      levelTitle: "words like blades",
      levelTitleColor: CFG.colors['level-1.3'].spikes,
      subTitle: "when feelings grow dull, words become sharper",
      subTitleColor: CFG.colors['level-1.3'].background,
      platformGap: [
        // First gap for first moving platform (special jump-to-disable)
        {
          x: movingPlatform1X - spikeWidth / 2,
          width: spikeWidth
        },
        // Second gap for second moving platform (normal timer-based)
        {
          x: movingPlatform2X - spikeWidth / 2,
          width: spikeWidth
        }
      ]
    })
    
    const bottomPlatformHeight = k.height() * CFG.visual.bottomPlatformHeight / 100
    const platformY = k.height() - bottomPlatformHeight
    const spikeHeight = Spikes.getSpikeHeight(k)
    
    // Create first special moving platform (jump-to-disable mode)
    MovingPlatform.create({
      k,
      x: movingPlatform1X,
      y: platformY,
      hero,
      color: CFG.colors['level-1.3'].platform,
      currentLevel: 'level-1.3',
      jumpToDisableSpikes: true,  // Special mode: jump down to disable spikes
      autoOpen: true,  // Auto-open on level start
      sfx: sound
    })
    
    // Create second normal moving platform (timer-based mode)
    MovingPlatform.create({
      k,
      x: movingPlatform2X,
      y: platformY,
      hero,
      color: CFG.colors['level-1.3'].platform,
      currentLevel: 'level-1.3',
      jumpToDisableSpikes: false,  // Normal mode: timer-based (4 seconds)
      autoOpen: false,  // Triggered by hero proximity
      sfx: sound
    })
    
    // Create first spike (static, appears once)
    const spikes1 = Spikes.create({
      k,
      x: spike1X,
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Spikes.ORIENTATIONS.FLOOR,
      onHit: () => Spikes.handleCollision(spikes1, "level-1.3"),
      sfx: sound
    })
    
    // Create second spike (static, appears once)
    const spikes2 = Spikes.create({
      k,
      x: spike2X,
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Spikes.ORIENTATIONS.FLOOR,
      onHit: () => Spikes.handleCollision(spikes2, "level-1.3"),
      sfx: sound
    })
    
    // Start spike animations (appear once like in level 1)
    Spikes.startAnimation(spikes1, 1)
    Spikes.startAnimation(spikes2, 1)
    
    // Scene instance with state
    const inst = {
      k,
      sound,
      soundTimer: k.rand(3, 6)
    }
    
    // Setup eerie sound effect
    k.onUpdate(() => {
      updateEerieSound(inst)
    })
  })
}