import { CFG } from '../cfg.js'
import { initScene } from '../utils/scene.js'
import { getColor } from '../utils/helper.js'
import * as Hero from '../components/hero.js'
import { HEROES } from '../components/hero.js'
import * as Sound from '../utils/sound.js'
import * as Spikes from '../components/spike.js'
import { createLightningState, updateLightning, drawLightning } from '../utils/connection.js'

export function sceneLevel4(k) {
  k.scene("level-1.4", () => {
    // Initialize level with common setup (skip standard platforms)
    const { sound } = initScene({
      k,
      backgroundColor: CFG.colors['level-1.4'].background,
      platformColor: CFG.colors['level-1.4'].platform,
      skipPlatforms: true
    })
    
    // Create custom platforms with pit in the middle
    const pitInfo = createCustomPlatforms(k, CFG.colors['level-1.4'].platform)
    
    // Create anti-hero instance
    const antiHero = Hero.create({
      k,
      x: k.width() * CFG.levels['level-1.4'].antiHeroSpawn.x / 100,
      y: k.height() * CFG.levels['level-1.4'].antiHeroSpawn.y / 100,
      type: 'antihero',
      sfx: sound
    })
    
    // Create hero instance with annihilation setup
    const hero = Hero.create({
      k,
      x: k.width() * CFG.levels['level-1.4'].heroSpawn.x / 100,
      y: k.height() * CFG.levels['level-1.4'].heroSpawn.y / 100,
      type: HEROES.HERO,
      sfx: sound,
      antiHero,
      onAnnihilation: () => k.go("menu")
    })
    
    // Create bottom of the pit (platform at pit depth)
    const heroHeight = k.height() * 0.08  // Approximate hero height (8% of screen)
    const pitDepth = heroHeight * 1.3  // Pit depth slightly more than hero height
    const bottomPlatformHeight = k.height() * CFG.levels['level-1.4'].bottomPlatformHeight / 100
    const pitBottomY = k.height() - bottomPlatformHeight + pitDepth
    
    // Create pit bottom platform
    k.add([
      k.rect(pitInfo.width, k.height() - pitBottomY),
      k.pos(pitInfo.centerX - pitInfo.width / 2, pitBottomY),
      k.area(),
      k.body({ isStatic: true }),
      getColor(k, CFG.colors['level-1.4'].platform),
      "platform"
    ])
    
    // Create spikes at the bottom of the pit (pointing up)
    const spikeHeight = Spikes.getSpikeHeight(k)
    const spikes = Spikes.create({
      k,
      x: pitInfo.centerX,
      y: pitBottomY - spikeHeight / 2,
      orientation: Spikes.ORIENTATIONS.FLOOR,
      onHit: (inst) => onSpikeHit(k, hero, inst),
      sfx: sound
    })
    spikes.spike.opacity = 1
    
    // Add spike tag to hero for collision detection
    hero.character.use("player")
    
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

/**
 * Handle spike collision with hero
 * @param {Object} k - Kaplay instance
 * @param {Object} hero - Hero instance
 * @param {Object} spikes - Spikes instance
 */
function onSpikeHit(k, hero, spikes) {
  Spikes.show(spikes)
  Hero.death(hero, () => k.go("level-1.4"))
}

/**
 * Create custom platforms with a pit in the middle
 * @param {Object} k - Kaplay instance
 * @param {String} color - Platform color
 * @returns {Object} Pit information (centerX, width)
 */
function createCustomPlatforms(k, color) {
  const bottomPlatformHeight = k.height() * CFG.levels['level-1.4'].bottomPlatformHeight / 100
  const topPlatformHeight = k.height() * CFG.levels['level-1.4'].topPlatformHeight / 100
  const sideWallWidth = k.width() * CFG.visual.sideWallWidth / 100
  
  // Calculate pit dimensions (same width as spikes)
  const pitWidth = Spikes.getSpikeWidth(k)
  const centerX = k.width() / 2
  const pitLeft = centerX - pitWidth / 2
  const pitRight = centerX + pitWidth / 2
  
  function createPlatform(x, y, width, height) {
    return k.add([
      k.rect(width, height),
      k.pos(x, y),
      k.area(),
      k.body({ isStatic: true }),
      getColor(k, color),
      "platform"
    ])
  }
  
  // Top platform (full width)
  createPlatform(0, 0, k.width(), topPlatformHeight)
  
  // Bottom platform - LEFT side (before pit)
  createPlatform(0, k.height() - bottomPlatformHeight, pitLeft, bottomPlatformHeight)
  
  // Bottom platform - RIGHT side (after pit)
  createPlatform(pitRight, k.height() - bottomPlatformHeight, k.width() - pitRight, bottomPlatformHeight)
  
  // Left wall
  createPlatform(0, topPlatformHeight, sideWallWidth, k.height() - topPlatformHeight - bottomPlatformHeight)
  
  // Right wall
  createPlatform(k.width() - sideWallWidth, topPlatformHeight, sideWallWidth, k.height() - topPlatformHeight - bottomPlatformHeight)
  
  return { centerX, width: pitWidth }
}

