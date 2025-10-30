import { CFG } from '../../../cfg.js'
import { initScene } from '../utils/scene.js'
import * as Spikes from '../components/spikes.js'
import * as MovingPlatform from '../../../components/moving-platform.js'

export function sceneLevel2(k) {
  k.scene("level-1.2", () => {
    // Calculate moving platform position first (110px from hero start position)
    const heroX = k.width() * CFG.levels['level-1.2'].heroSpawn.x / 100
    const spikeWidth = Spikes.getSpikeWidth(k)
    const movingPlatformX = heroX + 110  // 110px from hero
    
    // Calculate positions for spike platforms
    const antiHeroX = k.width() * CFG.levels['level-1.2'].antiHeroSpawn.x / 100
    const leftX = Math.min(heroX, antiHeroX)
    const rightX = Math.max(heroX, antiHeroX)
    const distance = rightX - leftX
    
    // First spike at 0.42 distance, second spike at 0.73 distance
    const spike1X = leftX + distance * 0.42
    const spike2X = leftX + distance * 0.73
    
    // Second moving platform before second spike (rightmost)
    const movingPlatform2X = spike2X - spikeWidth * 1.1  // Closer to second spike
    
    // Initialize level with heroes and gaps in platform
    const { sound, hero, antiHero } = initScene({
      k,
      levelName: 'level-1.2',
      levelNumber: 3,  // Show 3 red blades in indicator
      nextLevel: 'level-1.3',
      levelTitle: "words like blades",
      levelTitleColor: CFG.colors['level-1.2'].spikes,
      subTitle: "words are blades that never rust",
      subTitleColor: CFG.colors['level-1.2'].background,
      platformGap: [
        // First gap for first moving platform
        {
          x: movingPlatformX - spikeWidth / 2,
          width: spikeWidth
        },
        // Second gap for second moving platform
        {
          x: movingPlatform2X - spikeWidth / 2,
          width: spikeWidth
        }
      ]
    })
    
    const bottomPlatformHeight = k.height() * CFG.visual.bottomPlatformHeight / 100
    const platformY = k.height() - bottomPlatformHeight
    const spikeHeight = Spikes.getSpikeHeight(k)
    
    // Create first moving platform
    MovingPlatform.create({
      k,
      x: movingPlatformX,
      y: platformY,
      hero,
      color: CFG.colors['level-1.2'].platform,
      currentLevel: 'level-1.2',
      sfx: sound
    })
    
    // Create second moving platform (before second spike)
    MovingPlatform.create({
      k,
      x: movingPlatform2X,
      y: platformY,
      hero,
      color: CFG.colors['level-1.2'].platform,
      currentLevel: 'level-1.2',
      sfx: sound
    })
    
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
    
    // Eerie sound effects removed for cleaner audio experience
  })
}
