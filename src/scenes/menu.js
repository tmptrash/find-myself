import * as Sound from "../utils/sound.js"
import { CFG } from "../cfg.js"
import { getRGB } from "../utils/helper.js"
import * as Hero from "../components/hero.js"
import { createLevelTransition } from "../utils/transition.js"
import { getProgress, getSectionPositions, SECTION_COLORS, getLastLevel } from "../utils/progress.js"
import { drawConnectionWave } from "../utils/connection.js"

/**
 * Menu scene with hero in center-left
 * @param {Object} k - Kaplay instance
 */
export function sceneMenu(k) {
  k.scene("menu", () => {
    //
    // Show cursor in menu
    //
    k.canvas.style.cursor = 'default'
    
    //
    // Disable gravity in menu
    //
    k.setGravity(0)
    
    const centerX = k.width() / 2
    //
    // Move hero group lower - closer to vertical center
    //
    const centerY = k.height() / 2 + 30
    
    //
    // Create sound instance and start audio context
    // Don't start ambient automatically - it will play on hover
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)

    //
    // Create hero in center (using HERO type)
    //
    const heroInst = Hero.create({
      k,
      x: centerX,
      y: centerY,
      type: Hero.HEROES.HERO,
      scale: 5,
      controllable: false
    })
    
    const hero = heroInst.character
    hero.z = 10
    
    //
    // Create 6 anti-heroes around the main hero (sections)
    // Reduced radius to bring them closer
    //
    const progress = getProgress()
    const radius = Math.min(k.width(), k.height()) * 0.28  // Reduced from 0.35 to 0.28
    const sectionConfigs = getSectionPositions(centerX, centerY, radius)
    const antiHeroes = []
    const sectionLabels = []
    
    sectionConfigs.forEach(config => {
      const isCompleted = progress[config.section]
      
      //
      // Determine body color: gray if not completed, section color if completed
      // Outline is always black
      //
      const grayColor = 'A0A0A0'      // Gray body
      const bodyColor = isCompleted ? config.color.body : grayColor
      
      //
      // Create anti-hero for this section
      //
      const antiHeroInst = Hero.create({
        k,
        x: config.x,
        y: config.y,
        type: Hero.HEROES.ANTIHERO,
        scale: 3,
        controllable: false,
        bodyColor
      })
      
      antiHeroInst.character.z = 10
      antiHeroes.push(antiHeroInst)
      
      //
      // Add section label below anti-hero
      //
      const labelColor = isCompleted ? getRGB(k, bodyColor) : getRGB(k, grayColor)
      const label = k.add([
        k.text(config.section, { size: 18, font: "jetbrains" }),
        k.pos(config.x, config.y + 50),
        k.anchor("center"),
        k.color(labelColor.r, labelColor.g, labelColor.b),
        k.z(100)
      ])
      
      sectionLabels.push(label)
    })
    
    //
    // Scene instance with all state
    //
    const inst = {
      k,
      centerX,
      centerY,
      hero,
      sound,
      titleObjects: createTitle(k),
      antiHeroes,
      sectionLabels,
      hoveredAntiHero: null  // Track which anti-hero is hovered
    }
    
    //
    // Track mouse position and check for hover over anti-heroes
    //
    k.onUpdate(() => {
      const mousePos = k.mousePos()
      let foundHover = false
      
      //
      // Check each anti-hero for hover
      //
      antiHeroes.forEach(antiHeroInst => {
        const char = antiHeroInst.character
        const dx = mousePos.x - char.pos.x
        const dy = mousePos.y - char.pos.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const hoverRadius = 60  // Hover detection radius (increased for better detection)
        
        if (distance < hoverRadius) {
          inst.hoveredAntiHero = antiHeroInst
          foundHover = true
        }
      })
      
      //
      // Control ambient sound based on hover state
      //
      if (foundHover) {
        //
        // Start ambient if hovering and not already playing
        //
        if (!Sound.isAmbientPlaying(sound)) {
          Sound.startAmbient(sound)
        }
      } else {
        //
        // Stop ambient if not hovering
        //
        if (Sound.isAmbientPlaying(sound)) {
          Sound.stopAmbient(sound)
        }
        inst.hoveredAntiHero = null
      }
    })
    
    //
    // Background layer with animation
    //
    k.onDraw(() => drawScene(inst))
  
    //
    // Check if there's a saved game
    //
    const lastLevel = getLastLevel()
    const hasSavedGame = lastLevel !== null
    
    //
    // Hint text - same for both cases (will continue or start new based on save)
    //
    const hintText = "press Space or Enter to start"
    
    const startText = k.add([
      k.text(hintText, { size: 20 }),
      k.pos(k.width() / 2, k.height() - 50),
      k.anchor("center"),
      k.opacity(1),
      k.color(150, 150, 150), // Gray
      k.z(100)
    ])
    
    //
    // Pulsing animation for start text
    //
    k.onUpdate(() => {
      startText.opacity = 0.5 + Math.sin(k.time() * 3) * 0.5
    })
    
    //
    // Start game controls
    // Space or Enter - Continue from last saved level or start from beginning
    //
    k.onKeyPress("space", () => {
      Sound.stopAmbient(sound)
      if (hasSavedGame) {
        //
        // Continue from last saved level (skip intro phrase)
        //
        k.go(lastLevel)
      } else {
        //
        // No save - start from beginning with intro phrase
        //
        createLevelTransition(k, 'menu')
      }
    })
    
    k.onKeyPress("enter", () => {
      Sound.stopAmbient(sound)
      if (hasSavedGame) {
        //
        // Continue from last saved level (skip intro phrase)
        //
        k.go(lastLevel)
      } else {
        //
        // No save - start from beginning with intro phrase
        //
        createLevelTransition(k, 'menu')
      }
    })
    
    //
    // Toggle mute
    //
    CFG.controls.toggleMute.forEach(key => {
      k.onKeyPress(key, () => {
        Sound.toggleMute(sound)
      })
    })
  })
}

/**
 * Create title objects (static, no glitch animation)
 * @param {Object} k - Kaplay instance
 * @returns {Array} Array of title objects
 */
function createTitle(k) {
  const titleY = k.height() * 0.10  // Moved higher (was 0.15)
  const titleSize = k.height() * 0.06  // Smaller size (was 0.08)
  
  const titleText = "FIND YOURSELF"
  const objects = []
  
  //
  // Create each letter as separate object
  //
  const letterSpacing = titleSize * 0.6
  const totalWidth = (titleText.length - 1) * letterSpacing
  const startX = k.width() / 2 - totalWidth / 2
  
  for (let i = 0; i < titleText.length; i++) {
    const char = titleText[i]
    const x = startX + i * letterSpacing
    
    const rgb = getRGB(k, CFG.colors.menu.titleBase)
    
    const letter = k.add([
      k.text(char, {
        size: titleSize,
        font: "jetbrains"
      }),
      k.pos(x, titleY),
      k.anchor("center"),
      k.color(rgb.r, rgb.g, rgb.b),
      k.z(100),
      k.fixed()
    ])
    
    objects.push(letter)
  }
  
  return objects
}

/**
 * Draw background scene
 * @param {Object} inst - Scene instance
 */
function drawScene(inst) {
  const { k, hero, hoveredAntiHero } = inst
  
  //
  // Draw dark background
  //
  const bgRgb = getRGB(k, CFG.colors.menu.background)
  k.drawRect({
    width: k.width(),
    height: k.height(),
    pos: k.vec2(0, 0),
    color: k.rgb(bgRgb.r, bgRgb.g, bgRgb.b)
  })
  
  //
  // Draw lightning between hero and hovered anti-hero
  //
  if (hoveredAntiHero) {
    const heroPos = { x: hero.pos.x, y: hero.pos.y }
    const antiHeroPos = { 
      x: hoveredAntiHero.character.pos.x, 
      y: hoveredAntiHero.character.pos.y 
    }
    
    //
    // Draw electric connection
    //
    drawConnectionWave(k, heroPos, antiHeroPos, {
      segmentWidth: 8,
      mainWidth: 3,
      opacity: 0.6
    })
  }
}
