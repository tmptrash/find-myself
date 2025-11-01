import { CFG } from '../../../cfg.js'
import { initScene } from '../utils/scene.js'
import * as Blades from '../components/blades.js'
import * as MovingPlatform from '../../../components/moving-platform.js'
import * as BladeArm from '../components/blade-arm.js'

export function sceneLevel3(k) {
  k.scene("level-word.3", () => {
    // Calculate hero position shifted right by 2 spike widths
    const singleSpikeWidth = Blades.getSingleSpikeWidth(k)
    const heroXBase = k.width() * CFG.levels['level-word.3'].heroSpawn.x / 100
    const heroX = heroXBase + singleSpikeWidth * 3  // Shift right by 2 pyramids
    const antiHeroX = k.width() * CFG.levels['level-word.3'].antiHeroSpawn.x / 100
    const leftX = Math.min(heroX, antiHeroX)
    const rightX = Math.max(heroX, antiHeroX)
    const distance = rightX - leftX
    
    // First spike at 1/3 distance
    const spike1X = leftX + distance / 3
    
    // Second spike at 2/3 distance
    const spike2X = leftX + distance * 2 / 3
    
    // Moving platforms before each spike
    const spikeWidth = Blades.getSpikeWidth(k)
    const movingPlatform1X = spike1X - spikeWidth * 1.1  // Before first spike
    const movingPlatform2X = spike2X - spikeWidth * 1.1  // Before second spike
    
    // Initialize level with heroes and TWO gaps in platform
    const heroY = k.height() * CFG.levels['level-word.3'].heroSpawn.y / 100
    const { sound, hero, antiHero } = initScene({
      k,
      levelName: 'level-word.3',
      levelNumber: 4,  // Show 4 red blades in indicator
      nextLevel: 'level-word.4',
      levelTitle: "words like blades",
      levelTitleColor: CFG.colors['level-word.3'].spikes,
      subTitle: "when feelings grow dull, words become sharper",
      subTitleColor: CFG.colors['level-word.3'].background,
      heroX: heroX,  // Custom hero position (shifted right by 2 pyramids)
      heroY: heroY,
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
    const spikeHeight = Blades.getSpikeHeight(k)
    
    // Create first special moving platform (jump-to-disable mode)
    MovingPlatform.create({
      k,
      x: movingPlatform1X,
      y: platformY,
      hero,
      color: CFG.colors['level-word.3'].platform,
      currentLevel: 'level-word.3',
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
      color: CFG.colors['level-word.3'].platform,
      currentLevel: 'level-word.3',
      jumpToDisableSpikes: false,  // Normal mode: timer-based (4 seconds)
      autoOpen: false,  // Triggered by hero proximity
      sfx: sound
    })
    
    // Create first spike (static, appears once)
    const spikes1 = Blades.create({
      k,
      x: spike1X,
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => Blades.handleCollision(spikes1, "level-word.3"),
      sfx: sound
    })
    
    // Create second spike (static, appears once)
    const spikes2 = Blades.create({
      k,
      x: spike2X,
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => Blades.handleCollision(spikes2, "level-word.3"),
      sfx: sound
    })
    
    // Start spike animations (appear once like in level 1)
    Blades.startAnimation(spikes1, 1)
    Blades.startAnimation(spikes2, 1)
    
    // Create blade arm that extends from the left (positioned at hero's height)
    BladeArm.create({
      k,
      y: heroY,
      hero,
      color: CFG.colors['level-word.3'].spikes,
      sfx: sound,
      currentLevel: 'level-word.3'
    })
    
    // Eerie sound effects removed for cleaner audio experience
  })
}