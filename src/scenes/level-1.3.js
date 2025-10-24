import { CFG } from '../cfg.js'
import { initScene } from '../utils/scene.js'
import * as Hero from '../components/hero.js'
import { HEROES } from '../components/hero.js'
import * as Spikes from '../components/spike.js'
import * as Sound from '../utils/sound.js'
import { createLightningState, updateLightning, drawLightning } from '../utils/connection.js'

export function sceneLevel3(k) {
  k.scene("level-1.3", () => {
    // Initialize level with common setup
    const { sound } = initScene({
      k,
      backgroundColor: CFG.colors['level-1.3'].background,
      platformColor: CFG.colors['level-1.3'].platform
    })
    
    // Create anti-hero instance (same position as level 1)
    const antiHero = Hero.create({
      k,
      x: k.width() * CFG.levels['level-1.3'].antiHeroSpawn.x / 100,
      y: k.height() * CFG.levels['level-1.3'].antiHeroSpawn.y / 100,
      type: 'antihero',
      sfx: sound
    })
    
    // Create hero instance with annihilation setup
    const hero = Hero.create({
      k,
      x: k.width() * CFG.levels['level-1.3'].heroSpawn.x / 100,
      y: k.height() * CFG.levels['level-1.3'].heroSpawn.y / 100,
      type: HEROES.HERO,
      sfx: sound,
      antiHero,
      onAnnihilation: () => k.go("menu")
    })
    
    // Add spike tag to hero for collision detection
    hero.character.use("player")
    
    // Calculate spike positions between heroes
    const heroX = k.width() * CFG.levels['level-1.3'].heroSpawn.x / 100
    const antiHeroX = k.width() * CFG.levels['level-1.3'].antiHeroSpawn.x / 100
    const leftX = Math.min(heroX, antiHeroX)
    const rightX = Math.max(heroX, antiHeroX)
    const distance = rightX - leftX
    
    // First spike at 1/3 distance
    const spike1X = leftX + distance / 3
    // Second spike at 2/3 distance
    const spike2X = leftX + distance * 2 / 3
    
    const bottomPlatformHeight = k.height() * CFG.visual.bottomPlatformHeight / 100
    const platformY = k.height() - bottomPlatformHeight
    const spikeHeight = Spikes.getSpikeHeight(k)
    const hiddenY = platformY + spikeHeight / 2 + 4  // 4 pixels below platform surface
    
    // Create first spike (starts hidden)
    const spikes1 = Spikes.create({
      k,
      x: spike1X,
      y: hiddenY,
      orientation: Spikes.ORIENTATIONS.FLOOR,
      onHit: () => onSpikeHit(k, hero, spikes1),
      sfx: sound
    })
    spikes1.spike.opacity = 1  // Visible from start
    spikes1.spike.z = -50  // Behind platforms
    
    // Create second spike (starts hidden)
    const spikes2 = Spikes.create({
      k,
      x: spike2X,
      y: hiddenY,
      orientation: Spikes.ORIENTATIONS.FLOOR,
      onHit: () => onSpikeHit(k, hero, spikes2),
      sfx: sound
    })
    spikes2.spike.opacity = 1  // Visible from start
    spikes2.spike.z = -50  // Behind platforms
    
    // Spawn hero with assembly effect
    Hero.spawn(hero)
    
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
      spike1State: 'waiting',  // waiting, extending, retracting, waiting-for-spike2, cycle-complete
      spike2State: 'waiting',
      targetY: platformY - spikeHeight / 2,
      hiddenY,
      animationTimer: 0,
      animationSpeed: 0.5,  // seconds for extend/retract
      cycleTimer: 0,
      cycleDelay: 1,  // seconds after spike2 before restarting
      spikeDelay: 1,  // seconds between spike1 and spike2
      firstCycleComplete: false  // Track if first visible cycle is done
    }
    
    // Start spike animation after 1 second
    k.wait(1, () => {
      inst.spike1State = 'extending'
      inst.animationTimer = 0  // Reset timer for smooth animation
      sound && Sound.playSpikeSound(sound)
    })
    
    // Setup eerie sound effect and lightning
    k.onUpdate(() => updateLevel(inst))
    
    // Draw lightning effect
    k.onDraw(() => drawLightning(inst))
  })
}

/**
 * Handle spike collision with hero
 * @param {Object} k - Kaplay instance
 * @param {Object} hero - Hero instance
 * @param {Object} spikes - Spikes instance
 */
function onSpikeHit(k, hero, spikes) {
  // Show spikes when hero hits them (ensure visibility)
  spikes.spike.opacity = 1
  
  // Death effect when hero hits spikes
  Hero.death(hero, () => k.go("level-1.3"))
}

/**
 * Update level logic (sound, lightning, spikes animation)
 * @param {Object} inst - Scene instance
 */
function updateLevel(inst) {
  updateEerieSound(inst)
  updateLightning(inst)
  updateSpikesAnimation(inst)
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

/**
 * Update eerie sound timer and play sound randomly
 * @param {Object} inst - Scene instance
 */
function updateEerieSound(inst) {
  const { k, sound } = inst
  
  inst.soundTimer -= k.dt()
  
  if (inst.soundTimer <= 0) {
    sound && Sound.playGlitchSound(sound)
    inst.soundTimer = k.rand(4, 8)  // Next sound in 4-8 seconds
  }
}

