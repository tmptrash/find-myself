import { CFG } from '../cfg.js'
import { initScene } from '../utils/scene.js'
import * as Hero from '../components/hero.js'
import { HEROES } from '../components/hero.js'
import * as Spikes from '../components/spike.js'
import * as Sound from '../utils/sound.js'

export function sceneLevel2(k) {
  k.scene("level2", () => {
    // Initialize level with common setup
    const { sound } = initScene({
      k,
      backgroundColor: CFG.colors.level1.background,
      platformColor: CFG.colors.level1.platform
    })
    
    // Create anti-hero instance (same position as level 1)
    const antiHero = Hero.create({
      k,
      x: k.width() * CFG.levels.level1.antiHeroSpawn.x / 100,
      y: k.height() * CFG.levels.level1.antiHeroSpawn.y / 100,
      type: 'antihero',
      sfx: sound
    })
    
    // Create hero instance with annihilation setup
    const hero = Hero.create({
      k,
      x: k.width() * CFG.levels.level2.heroSpawn.x / 100,
      y: k.height() * CFG.levels.level2.heroSpawn.y / 100,
      type: HEROES.HERO,
      sfx: sound,
      antiHero,
      onAnnihilation: () => {
        // TODO: Add next level or end screen
        k.go("menu")
      }
    })
    
    // Add spike tag to hero for collision detection
    hero.character.use("player")
    
    // Calculate spike positions between heroes
    const heroX = k.width() * CFG.levels.level2.heroSpawn.x / 100
    const antiHeroX = k.width() * CFG.levels.level1.antiHeroSpawn.x / 100
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
      soundTimer: k.rand(3, 6)
    }
    
    // Setup eerie sound effect
    k.onUpdate(() => updateEerieSound(inst))
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
  Hero.death(hero, () => k.go("level2"))
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
