import { CFG } from '../../cfg.js'
import { initScene, updateEerieSound } from '../../utils/scene.js'
import * as Spikes from '../../components/spikes.js'
import * as MovingPlatform from '../../components/moving-platform.js'
import * as Sound from '../../utils/sound.js'
import * as Hero from '../../components/hero.js'
import { createLightningState, updateLightning, drawLightning } from '../../utils/connection.js'

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
    const hiddenY = platformY + spikeHeight / 2 + 4  // 4 pixels below platform surface
    
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
    
    // Create first spike (starts hidden)
    const spikes1 = Spikes.create({
      k,
      x: spike1X,
      y: hiddenY,
      hero,
      orientation: Spikes.ORIENTATIONS.FLOOR,
      onHit: () => {
        spikes1.spike.opacity = 1
        Hero.death(hero, () => k.go("level-1.3"))
      },
      sfx: sound
    })
    spikes1.spike.opacity = 1  // Visible from start
    spikes1.spike.z = -50  // Behind platforms
    
    // Create second spike (starts hidden)
    const spikes2 = Spikes.create({
      k,
      x: spike2X,
      y: hiddenY,
      hero,
      orientation: Spikes.ORIENTATIONS.FLOOR,
      onHit: () => {
        spikes2.spike.opacity = 1
        Hero.death(hero, () => k.go("level-1.3"))
      },
      sfx: sound
    })
    spikes2.spike.opacity = 1  // Visible from start
    spikes2.spike.z = -50  // Behind platforms
    
    // Scene instance with state
    const inst = {
      k,
      sound,
      soundTimer: k.rand(3, 6),
      hero,
      antiHero,
      ...createLightningState(),
      // Spike animation state
      spikes1,
      spikes2,
      spike1State: 'waiting',  // waiting, extending, retracting, waiting-for-spike2, spike2-active, cycle-complete
      spike2State: 'waiting',
      targetY: platformY - spikeHeight / 2,
      hiddenY,
      animationTimer: 0,
      animationSpeed: 0.15,  // seconds for extend/retract
      cycleTimer: 0,
      cycleDelay: 0.15,  // seconds after spike2 before restarting (reduced 2x)
      spikeDelay: 0.15,  // seconds between spike1 and spike2 (reduced 2x)
      firstCycleComplete: false  // Track if first visible cycle is done
    }
    
    // Start spike animation after 0.5 second
    k.wait(0.5, () => {
      inst.spike1State = 'extending'
      inst.animationTimer = 0  // Reset timer for smooth animation
      sound && Sound.playSpikeSound(sound)
    })
    
    // Setup eerie sound effect and lightning
    k.onUpdate(() => {
      updateEerieSound(inst)
      updateLightning(inst)
      updateSpikesAnimation(inst)
    })
    
    // Draw lightning effect
    k.onDraw(() => drawLightning(inst))
  })
}

/**
 * Update spikes slide animation
 * @param {Object} inst - Scene instance
 */
function updateSpikesAnimation(inst) {
  const { k, spikes1, spikes2, targetY, hiddenY, animationSpeed, sound } = inst
  
  inst.animationTimer += k.dt()
  inst.cycleTimer += k.dt()
  
  // SPIKE 1 STATE MACHINE
  if (inst.spike1State === 'extending') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    spikes1.spike.pos.y = hiddenY + (targetY - hiddenY) * progress
    
    if (progress >= 1) {
      inst.spike1State = 'retracting'
      inst.animationTimer = 0
    }
  } else if (inst.spike1State === 'retracting') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    spikes1.spike.pos.y = targetY + (hiddenY - targetY) * progress
    
    if (progress >= 1) {
      inst.spike1State = 'waiting-for-spike2'
      inst.animationTimer = 0
    }
  } else if (inst.spike1State === 'waiting-for-spike2') {
    // Wait for spikeDelay before starting spike2
    if (inst.animationTimer >= inst.spikeDelay) {
      inst.spike2State = 'extending'
      inst.spike1State = 'spike2-active'  // Prevent re-triggering
      inst.animationTimer = 0
      sound && Sound.playSpikeSound(sound)
    }
  }
  
  // SPIKE 2 STATE MACHINE
  if (inst.spike2State === 'extending') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    spikes2.spike.pos.y = hiddenY + (targetY - hiddenY) * progress
    
    if (progress >= 1) {
      inst.spike2State = 'retracting'
      inst.animationTimer = 0
    }
  } else if (inst.spike2State === 'retracting') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    spikes2.spike.pos.y = targetY + (hiddenY - targetY) * progress
    
    if (progress >= 1) {
      inst.spike2State = 'cycle-complete'
      inst.spike1State = 'cycle-complete'
      inst.animationTimer = 0
      inst.cycleTimer = 0  // Reset cycle timer for the pause
      
      // After first full cycle, make spikes invisible
      if (!inst.firstCycleComplete) {
        inst.firstCycleComplete = true
        spikes1.spike.opacity = 0
        spikes2.spike.opacity = 0
      }
    }
  }
  
  // RESTART CYCLE after delay
  if (inst.spike1State === 'cycle-complete' && inst.cycleTimer >= inst.cycleDelay) {
    inst.cycleTimer = 0
    inst.animationTimer = 0
    inst.spike1State = 'extending'
    inst.spike2State = 'waiting'  // Reset spike2 state for next cycle
    sound && Sound.playSpikeSound(sound)
  }
}