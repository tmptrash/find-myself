import { CFG } from '../cfg.js'
import { initScene, updateEerieSound } from '../utils/scene.js'
import { getColor } from '../utils/helper.js'
import * as Sound from '../utils/sound.js'
import * as Spikes from '../components/spikes.js'
import * as Hero from '../components/hero.js'
import { createLightningState, updateLightning, drawLightning } from '../utils/connection.js'

export function sceneLevel4(k) {
  k.scene("level-1.4", () => {
    // Initialize level with heroes (skip standard platforms)
    const { sound, hero, antiHero } = initScene({
      k,
      levelName: 'level-1.4',
      levelNumber: 4,
      nextLevel: 'menu',
      skipPlatforms: true,
      levelTitle: "words like blades",
      levelTitleColor: CFG.colors['level-1.4'].spikes,
      subTitle: "words are blades that leave invisible wounds",
      subTitleColor: CFG.colors['level-1.4'].background
    })
    
    // Create custom platforms with pit in the middle
    const pitInfo = createCustomPlatforms(k, CFG.colors['level-1.4'].platform)
    
    // Create bottom of the pit (platform at pit depth)
    const heroHeight = k.height() * 0.08  // Approximate hero height (8% of screen)
    const pitDepth = heroHeight * 1.3  // Pit depth slightly more than hero height
    const bottomHeight = k.height() * CFG.levels['level-1.4'].bottomPlatformHeight / 100
    const pitBottomY = k.height() - bottomHeight + pitDepth
    
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
    const spikeWidth = Spikes.getSpikeWidth(k)
    const pitSpikes = Spikes.create({
      k,
      x: pitInfo.centerX,
      y: pitBottomY - spikeHeight / 2,
      hero,
      orientation: Spikes.ORIENTATIONS.FLOOR,
      onHit: () => Spikes.handleCollision(pitSpikes, "level-1.4"),
      sfx: sound
    })
    pitSpikes.spike.opacity = 1
    
    // Create 3 spikes (left floor, center ceiling, right floor)
    const bottomPlatformHeight = k.height() * CFG.levels['level-1.4'].bottomPlatformHeight / 100
    const topPlatformHeight = k.height() * CFG.levels['level-1.4'].topPlatformHeight / 100
    const platformY = k.height() - bottomPlatformHeight
    const floorSpikeY = platformY - spikeHeight / 2
    const ceilingSpikeY = topPlatformHeight + spikeHeight / 2
    
    // Left spike (floor, left of pit, closer to pit) - starts hidden BELOW platform (bigger Y)
    const leftSpikeX = pitInfo.centerX - pitInfo.width / 2 - spikeWidth * 2.5
    const hiddenY1 = floorSpikeY + spikeHeight + 4  // Below platform + 4px lower
    const spikes1 = Spikes.create({
      k,
      x: leftSpikeX,
      y: hiddenY1,
      hero,
      orientation: Spikes.ORIENTATIONS.FLOOR,
      onHit: () => {
        spikes1.spike.opacity = 1
        Hero.death(hero, () => k.go("level-1.4"))
      },
      sfx: sound
    })
    spikes1.spike.opacity = 1
    spikes1.spike.z = -50  // Behind platforms
    
    // Center spike (ceiling, over pit, pointing down) - starts hidden INSIDE platform (smaller Y)
    const hiddenY2 = topPlatformHeight - spikeHeight / 2 - 4  // Inside ceiling platform + 4px higher
    const visibleCeilingY = topPlatformHeight + spikeHeight / 2  // Extended down from ceiling
    const spikes2 = Spikes.create({
      k,
      x: pitInfo.centerX,
      y: hiddenY2,
      hero,
      orientation: Spikes.ORIENTATIONS.CEILING,
      onHit: () => {
        spikes2.spike.opacity = 1
        Hero.death(hero, () => k.go("level-1.4"))
      },
      sfx: sound
    })
    spikes2.spike.opacity = 1
    spikes2.spike.z = -50  // Behind platforms
    
    // Right spike (floor, right of pit, closer to anti-hero but with jump space) - starts hidden BELOW platform (bigger Y)
    const rightSpikeX = pitInfo.centerX + pitInfo.width / 2 + spikeWidth * 1.5
    const hiddenY3 = floorSpikeY + spikeHeight + 4  // Below platform + 4px lower
    const spikes3 = Spikes.create({
      k,
      x: rightSpikeX,
      y: hiddenY3,
      hero,
      orientation: Spikes.ORIENTATIONS.FLOOR,
      onHit: () => {
        spikes3.spike.opacity = 1
        Hero.death(hero, () => k.go("level-1.4"))
      },
      sfx: sound
    })
    spikes3.spike.opacity = 1
    spikes3.spike.z = -50  // Behind platforms
    
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
      spikes3,
      targetY1: hiddenY1,      // Hidden position (retracted)
      visibleY1: floorSpikeY,  // Visible position (extended)
      targetY2: hiddenY2,      // Hidden position (retracted up)
      visibleY2: ceilingSpikeY, // Visible position (extended down)
      targetY3: hiddenY3,      // Hidden position (retracted)
      visibleY3: floorSpikeY,  // Visible position (extended)
      spike1State: 'waiting',
      spike2State: 'waiting',
      spike3State: 'waiting',
      animationTimer: 0,
      cycleTimer: 0,
      animationSpeed: 0.15,   // Seconds for extend/retract (up/down movement)
      spikeDelay: 0.15,      // Seconds between spikes (pause between spike1->spike2 and spike2->spike3)
      cycleDelay: 0.15,      // Seconds after last spike before restart
      firstCycleComplete: false
    }
    
    // Start spike animation after 0.5 second
    k.wait(0.5, () => {
      inst.spike1State = 'extending'
      inst.animationTimer = 0
      sound && Sound.playSpikeSound(sound)
    })
    
    // Setup eerie sound effect, lightning and spikes
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
 * Update spikes animation (cycle: extend, retract, repeat)
 * @param {Object} inst - Scene instance
 */
function updateSpikesAnimation(inst) {
  const { k, spikes1, spikes2, spikes3, targetY1, visibleY1, targetY2, visibleY2, targetY3, visibleY3, animationSpeed, sound } = inst
  
  inst.animationTimer += k.dt()
  inst.cycleTimer += k.dt()
  
  // SPIKE 1 STATE MACHINE (Left spikes - first)
  if (inst.spike1State === 'extending') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    spikes1.spike.pos.y = targetY1 + (visibleY1 - targetY1) * progress
    
    if (progress >= 1) {
      spikes1.spike.pos.y = visibleY1
      inst.spike1State = 'retracting'
      inst.animationTimer = 0
    }
  } else if (inst.spike1State === 'retracting') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    spikes1.spike.pos.y = visibleY1 + (targetY1 - visibleY1) * progress
    
    if (progress >= 1) {
      spikes1.spike.pos.y = targetY1
      inst.spike1State = 'waiting-for-spike3'
      inst.animationTimer = 0
    }
  } else if (inst.spike1State === 'waiting-for-spike3') {
    if (inst.animationTimer >= inst.spikeDelay) {
      inst.spike3State = 'extending'
      inst.spike1State = 'spike3-active'
      inst.animationTimer = 0
      sound && Sound.playSpikeSound(sound)
    }
  }
  
  // SPIKE 2 STATE MACHINE (Center spikes - third/last)
  if (inst.spike2State === 'extending') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    spikes2.spike.pos.y = targetY2 + (visibleY2 - targetY2) * progress
    
    if (progress >= 1) {
      spikes2.spike.pos.y = visibleY2
      inst.spike2State = 'retracting'
      inst.animationTimer = 0
    }
  } else if (inst.spike2State === 'retracting') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    spikes2.spike.pos.y = visibleY2 + (targetY2 - visibleY2) * progress
    
    if (progress >= 1) {
      spikes2.spike.pos.y = targetY2
      inst.spike2State = 'cycle-complete'
      inst.spike1State = 'cycle-complete'
      inst.spike3State = 'cycle-complete'
      inst.animationTimer = 0
      inst.cycleTimer = 0
      
      // After first cycle, make spikes invisible
      if (!inst.firstCycleComplete) {
        inst.firstCycleComplete = true
        spikes1.spike.opacity = 0
        spikes2.spike.opacity = 0
        spikes3.spike.opacity = 0
      }
    }
  }
  
  // SPIKE 3 STATE MACHINE (Right spikes - second)
  if (inst.spike3State === 'extending') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    spikes3.spike.pos.y = targetY3 + (visibleY3 - targetY3) * progress
    
    if (progress >= 1) {
      spikes3.spike.pos.y = visibleY3
      inst.spike3State = 'retracting'
      inst.animationTimer = 0
    }
  } else if (inst.spike3State === 'retracting') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    spikes3.spike.pos.y = visibleY3 + (targetY3 - visibleY3) * progress
    
    if (progress >= 1) {
      spikes3.spike.pos.y = targetY3
      inst.spike3State = 'waiting-for-spike2'
      inst.animationTimer = 0
    }
  } else if (inst.spike3State === 'waiting-for-spike2') {
    if (inst.animationTimer >= inst.spikeDelay) {
      inst.spike2State = 'extending'
      inst.spike3State = 'spike2-active'
      inst.animationTimer = 0
      sound && Sound.playSpikeSound(sound)
    }
  }
  
  // RESTART CYCLE after delay
  if (inst.spike1State === 'cycle-complete' && inst.cycleTimer >= inst.cycleDelay) {
    inst.cycleTimer = 0
    inst.animationTimer = 0
    spikes1.spike.pos.y = targetY1
    spikes2.spike.pos.y = targetY2
    spikes3.spike.pos.y = targetY3
    inst.spike1State = 'extending'
    inst.spike2State = 'waiting'
    inst.spike3State = 'waiting'
    sound && Sound.playSpikeSound(sound)
  }
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

