import { CFG } from '../cfg.js'
import { initScene, addLevelIndicator } from '../utils/scene.js'
import { getColor } from '../utils/helper.js'
import * as Hero from '../components/hero.js'
import { HEROES } from '../components/hero.js'
import * as Spikes from '../components/spike.js'
import * as Sound from '../utils/sound.js'
import { createLightningState, updateLightning, drawLightning } from '../utils/connection.js'

export function sceneLevel2(k) {
  k.scene("level-1.2", () => {
    // Initialize level with common setup
    const { sound } = initScene({
      k,
      backgroundColor: CFG.colors['level-1.2'].background,
      platformColor: CFG.colors['level-1.2'].platform
    })
    
    // Add level indicator with spikes
    addLevelIndicator(k, 2, CFG.colors.levelIndicator.active, CFG.colors.levelIndicator.inactive)
    
    // Create anti-hero instance (same position as level 1)
    const antiHero = Hero.create({
      k,
      x: k.width() * CFG.levels['level-1.2'].antiHeroSpawn.x / 100,
      y: k.height() * CFG.levels['level-1.2'].antiHeroSpawn.y / 100,
      type: 'antihero',
      sfx: sound
    })
    
    // Create hero instance with annihilation setup
    const hero = Hero.create({
      k,
      x: k.width() * CFG.levels['level-1.2'].heroSpawn.x / 100,
      y: k.height() * CFG.levels['level-1.2'].heroSpawn.y / 100,
      type: HEROES.HERO,
      sfx: sound,
      antiHero,
      onAnnihilation: () => k.go("level-1.3")
    })
    
    // Add spike tag to hero for collision detection
    hero.character.use("player")
    
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
      orientation: Spikes.ORIENTATIONS.FLOOR,
      onHit: () => onSpikeHit(k, hero, spikes1),
      sfx: sound
    })
    
    // Create second spike
    const spikes2 = Spikes.create({
      k,
      x: spike2X,
      y: platformY - spikeHeight / 2,
      orientation: Spikes.ORIENTATIONS.FLOOR,
      onHit: () => onSpikeHit(k, hero, spikes2),
      sfx: sound
    })
    
    // Start spike animations after 1 second
    Spikes.startAnimation(spikes1)
    Spikes.startAnimation(spikes2)
    
    // Spawn hero with assembly effect
    Hero.spawn(hero)
    
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
  // Show spikes when hero hits them
  Spikes.show(spikes)
  
  // Death effect when hero hits spikes
  Hero.death(hero, () => k.go("level-1.2"))
}

/**
 * Update level logic (sound, lightning)
 * @param {Object} inst - Scene instance
 */
function updateLevel(inst) {
  updateEerieSound(inst)
  updateLightning(inst)
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
