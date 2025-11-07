import * as Sound from "../utils/sound.js"
import { CFG } from "../cfg.js"
import { getRGB } from "../utils/helper.js"
import * as Hero from "../components/hero.js"
import { createLevelTransition } from "../utils/transition.js"
import { getProgress, getSectionPositions, getLastLevel, resetProgress } from "../utils/progress.js"
import { drawConnectionWave } from "../utils/connection.js"
import * as Particles from "../utils/particles.js"
import * as Fragments from "../utils/fragments.js"

/**
 * Menu scene with hero in center
 * @param {Object} k - Kaplay instance
 */
export function sceneMenu(k) {
  k.scene("menu", () => {
    
    //
    // Disable gravity in menu
    //
    k.setGravity(0)
    
    // Fixed coordinates for 1920x1080 resolution
    const centerX = 960  // k.width() / 2 = 1920 / 2
    const centerY = 570  // k.height() / 2 + 30 = 1080 / 2 + 30
    
    //
    // Create firefly particles background
    //
    const particlesBg = Particles.create({
      k,
      particleCount: 120,  // Fewer particles for firefly effect
      color: '#D4A574',    // Warm golden-orange (firefly glow)
      baseOpacity: 0.6,
      flickerSpeed: 1.5,   // Slower flicker for organic feel
      trembleRadius: 12,   // Larger floating movement
      mouseInfluence: 200
    })
    
    //
    // Create fragment shadows (ghostly silhouettes of hero)
    //
    const fragmentsBg = Fragments.create({
      k,
      fragmentCount: 5,    // 5 ghostly silhouettes
      speed: 2,            // 2-3 pixels per second
      baseOpacity: 0.15,   // Very transparent
      fadeSpeed: 0.3       // Slow fade in/out
    })
    
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
    // Fixed radius for 1920x1080 resolution
    //
    const progress = getProgress()
    const radius = 302  // Fixed radius (was: Math.min(1920, 1080) * 0.28)
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
      
      //
      // Store section info for hover color change
      //
      antiHeroInst.section = config.section
      antiHeroInst.sectionColor = config.color.body
      antiHeroInst.isCompleted = isCompleted
      antiHeroInst.grayColor = grayColor
      antiHeroInst.originalBodyColor = bodyColor
      
      //
      // Add click handler for word section (only implemented section)
      //
      if (config.section === 'word') {
        antiHeroInst.character.onClick(() => {
          //
          // Mark that we're leaving the scene
          //
          inst.isLeavingScene = true
          
          //
          // Stop ambient sound
          //
          Sound.stopAmbient(sound)
          
          //
          // Reset cursor to default (remove pointer class)
          //
          k.canvas.classList.remove('cursor-pointer')
          
          //
          // Get last level for word section or start from beginning
          //
          const lastLevel = getLastLevel()
          const isWordLevel = lastLevel && lastLevel.startsWith('level-word.')
          
          if (isWordLevel) {
            //
            // Continue from last word level
            //
            k.go(lastLevel)
          } else {
            //
            // Start word section from beginning with intro phrase
            //
            createLevelTransition(k, 'menu')
          }
        })
      }
      
      antiHeroes.push(antiHeroInst)
      
      //
      // Add section label below anti-hero
      //
      const labelColor = isCompleted ? getRGB(k, bodyColor) : getRGB(k, grayColor)
      const label = k.add([
        k.text(config.section, { size: 18 }),
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
      particlesBg,
      fragmentsBg,
      title: createTitle(k),
      antiHeroes,
      sectionLabels,
      hoveredAntiHero: null,  // Track which anti-hero is hovered
      isLeavingScene: false   // Flag to prevent ambient restart when leaving
    }
    
    //
    // Track mouse position and check for hover over anti-heroes
    //
    k.onUpdate(() => {
      //
      // Update trembling particles
      //
      Particles.onUpdate(particlesBg)
      
      //
      // Update fragment shadows
      //
      Fragments.onUpdate(fragmentsBg)
      
      //
      // Update title effects
      //
      updateTitle(inst.title, k)
      
      const mousePos = k.mousePos()
      let foundHover = false
      let hoveredInst = null
      
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
          hoveredInst = antiHeroInst
          foundHover = true
        }
      })
      
      //
      // Update colors for all anti-heroes based on hover state
      //
      antiHeroes.forEach(antiHeroInst => {
        //
        // Determine target color based on state
        //
        let targetColor
        
        if (antiHeroInst === hoveredInst || antiHeroInst.isCompleted) {
          //
          // Hovered OR completed: show section color
          //
          targetColor = antiHeroInst.sectionColor
        } else {
          //
          // Not hovered and not completed: gray
          //
          targetColor = antiHeroInst.grayColor
        }
        
        //
        // Apply color tint
        //
        const rgb = getRGB(k, targetColor)
        antiHeroInst.character.color = k.rgb(rgb.r, rgb.g, rgb.b)
      })
      
      //
      // Change cursor to pointer when hovering over word anti-hero
      // Don't change cursor if leaving scene
      //
      if (!inst.isLeavingScene) {
        if (hoveredInst && hoveredInst.section === 'word') {
          k.canvas.classList.add('cursor-pointer')
        } else {
          //
          // Remove pointer class to use default CSS cursor
          //
          k.canvas.classList.remove('cursor-pointer')
        }
      }
      
      inst.hoveredAntiHero = hoveredInst
      
      //
      // Control ambient sound based on hover state
      // Don't start ambient if leaving scene or if section is completed
      //
      if (!inst.isLeavingScene) {
        if (foundHover && hoveredInst && !hoveredInst.isCompleted) {
          //
          // Start ambient if hovering over incomplete section and not already playing
          //
          if (!Sound.isAmbientPlaying(sound)) {
            Sound.startAmbient(sound)
          }
        } else {
          //
          // Stop ambient if not hovering or section is completed
          //
          if (Sound.isAmbientPlaying(sound)) {
            Sound.stopAmbient(sound)
          }
        }
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
    // Hint text - Space to continue, Enter to start new
    //
    const hintText = hasSavedGame 
      ? "Space - continue  |  Enter - new game"
      : "press Space or Enter to start"
    
    const startText = k.add([
      k.text(hintText, { size: 20 }),
      k.pos(960, 1030),  // Fixed: k.width() / 2 = 960, k.height() - 50 = 1030
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
      //
      // Reset cursor to default (remove pointer class)
      //
      k.canvas.classList.remove('cursor-pointer')
      
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
      //
      // Reset cursor to default (remove pointer class)
      //
      k.canvas.classList.remove('cursor-pointer')
      
      //
      // Enter always resets progress and starts new game
      //
      resetProgress()
      createLevelTransition(k, 'menu')
    })
    
    //
    // Toggle mute
    //
    CFG.controls.toggleMute.forEach(key => {
      k.onKeyPress(key, () => {
        Sound.toggleMute(sound)
      })
    })
    
    //
    // Cleanup when leaving scene
    //
    k.onSceneLeave(() => {
      //
      // Destroy all game objects
      //
      heroInst.character.destroy()
      antiHeroes.forEach(antiHeroInst => {
        antiHeroInst.character.destroy()
      })
      sectionLabels.forEach(label => {
        label.destroy()
      })
      
      //
      // Destroy title objects
      //
      inst.title.findText.destroy()
      inst.title.myselfText.destroy()
      
      startText.destroy()
      
      //
      // Destroy fragment shadows
      //
      Fragments.destroy(fragmentsBg)
      
      //
      // Stop ambient sound
      //
      Sound.stopAmbient(sound)
    })
  })
}

/**
 * Create title with dynamic effects
 * @param {Object} k - Kaplay instance
 * @returns {Object} Title instance with state
 */
function createTitle(k) {
  //
  // Fixed coordinates for 1920x1080 resolution
  //
  const titleY = 108   // k.height() * 0.10 = 1080 * 0.10
  const titleSize = 65  // k.height() * 0.06 = 1080 * 0.06
  
  //
  // Amber color (#e49b24)
  //
  const amberColor = k.rgb(228, 155, 36)
  
  //
  // Create "find" text (left word)
  //
  const findText = k.add([
    k.text("find", { size: titleSize }),
    k.pos(960 - 110, titleY),  // Left of center (one letter width spacing)
    k.anchor("center"),
    k.color(amberColor),
    k.z(100),
    k.fixed()
  ])
  
  //
  // Create "myself" text (right word, appears later)
  //
  const myselfText = k.add([
    k.text("myself", { size: titleSize }),
    k.pos(960 + 130, titleY),  // Right of center (one letter width spacing)
    k.anchor("center"),
    k.color(amberColor),
    k.z(100),
    k.opacity(0),  // Start invisible
    k.fixed()
  ])
  
  return {
    findText,
    myselfText,
    breathPhase: 0,
    flickerPhase: Math.PI,  // Start with "myself" invisible
    lightningPhase: 0,
    showLightning: false,
    lightningOpacity: 1,
    time: 0,
    findFloatPhase: 0,  // Independent float phase for "find"
    myselfFloatPhase: Math.PI * 0.5,  // Independent float phase for "myself" (offset)
    baseFindX: 960 - 110,
    baseMyselfX: 960 + 130,
    baseTitleY: 108
  }
}

/**
 * Update title effects
 * @param {Object} titleInst - Title instance
 * @param {Object} k - Kaplay instance
 */
function updateTitle(titleInst, k) {
  const dt = k.dt()
  titleInst.time += dt
  
  //
  // Breathing effect for "find" (period ~3 sec)
  //
  titleInst.breathPhase += dt * (Math.PI * 2 / 3)  // 3 second period
  const breathScale = 1 + Math.sin(titleInst.breathPhase) * 0.05  // ±5% scale
  titleInst.findText.scale = k.vec2(breathScale, breathScale)
  
  //
  // Independent smooth floating movement for "find"
  //
  titleInst.findFloatPhase += dt * 0.4  // Slow floating speed
  
  const floatRadius = 12  // Movement radius (like fireflies)
  const findFloatX = Math.cos(titleInst.findFloatPhase) * floatRadius + Math.sin(titleInst.findFloatPhase * 0.7) * floatRadius * 0.5
  const findFloatY = Math.sin(titleInst.findFloatPhase * 1.3) * floatRadius + Math.cos(titleInst.findFloatPhase * 0.5) * floatRadius * 0.5
  
  //
  // Apply floating movement to "find"
  //
  titleInst.findText.pos.x = titleInst.baseFindX + findFloatX
  titleInst.findText.pos.y = titleInst.baseTitleY + findFloatY
  
  //
  // Independent smooth floating movement for "myself"
  //
  titleInst.myselfFloatPhase += dt * 0.35  // Slightly different speed
  
  const myselfFloatX = Math.cos(titleInst.myselfFloatPhase) * floatRadius + Math.sin(titleInst.myselfFloatPhase * 0.8) * floatRadius * 0.5
  const myselfFloatY = Math.sin(titleInst.myselfFloatPhase * 1.2) * floatRadius + Math.cos(titleInst.myselfFloatPhase * 0.6) * floatRadius * 0.5
  
  //
  // Flickering for both words (slower fade in/out)
  // Using asymmetric sine wave: long visible period, short invisible period
  //
  titleInst.flickerPhase += dt * 0.8  // Slightly faster (was 0.6)
  
  //
  // Transform sine wave to be visible most of the time
  // Map [-1, 1] to [0.9, 1] for visible, [0, 0.9] for fade
  //
  const rawSine = Math.sin(titleInst.flickerPhase)
  let flickerValue
  
  if (rawSine > 0.8) {
    //
    // Short invisible period (only when sine > 0.8, ~10% of cycle)
    //
    flickerValue = 0
  } else if (rawSine > 0) {
    //
    // Fade out (slow)
    //
    flickerValue = Math.pow((0.8 - rawSine) / 0.8, 2)  // Quadratic fade out
  } else {
    //
    // Fully visible (most of the time)
    //
    flickerValue = 1
  }
  
  //
  // "find" fades in/out
  //
  titleInst.findText.opacity = flickerValue
  
  //
  // "myself" fades in/out (with offset phase)
  //
  const myselfRawSine = Math.sin(titleInst.flickerPhase + Math.PI * 0.3)  // 54° offset (was 90°)
  let myselfFlickerValue
  
  if (myselfRawSine > 0.8) {
    myselfFlickerValue = 0
  } else if (myselfRawSine > 0) {
    myselfFlickerValue = Math.pow((0.8 - myselfRawSine) / 0.8, 2)
          } else {
    myselfFlickerValue = 1
  }
  
  titleInst.myselfText.opacity = myselfFlickerValue
  titleInst.myselfText.pos.x = titleInst.baseMyselfX + myselfFloatX  // Independent floating
  titleInst.myselfText.pos.y = titleInst.baseTitleY + myselfFloatY
  
  //
  // Show lightning only when at least one word is visible
  //
  const minOpacity = Math.min(flickerValue, myselfFlickerValue)
  titleInst.showLightning = minOpacity > 0  // Hide when both words are invisible
  titleInst.lightningOpacity = minOpacity  // Fade with words
}

/**
 * Draw lightning between "find" and "myself"
 * @param {Object} titleInst - Title instance
 * @param {Object} k - Kaplay instance
 */
function drawTitleLightning(titleInst, k) {
  if (!titleInst.showLightning) return
  
  //
  // From first letter "f" in "find" to last letter "f" in "myself"
  //
  const startPos = { 
    x: titleInst.findText.pos.x - 60,  // Left edge of "find" (first "f")
    y: titleInst.findText.pos.y 
  }
  const endPos = { 
    x: titleInst.myselfText.pos.x + 85,  // Right edge of "myself" (last "f")
    y: titleInst.myselfText.pos.y 
  }
  
  //
  // Draw electric connection (fades with minimum word opacity)
  //
  drawConnectionWave(k, startPos, endPos, {
    color: k.rgb(228, 155, 36),  // Amber
    segments: 12,  // More segments for longer distance
    amplitude: 6,
    thickness: 1.5,
    opacity: titleInst.lightningOpacity * 0.25  // Very transparent (was 0.7)
  })
}

/**
 * Draw background scene
 * @param {Object} inst - Scene instance
 */
function drawScene(inst) {
  const { k, hero, hoveredAntiHero, particlesBg, title } = inst
  
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
  // Draw trembling particles
  //
  Particles.draw(particlesBg)
  
  //
  // Draw lightning between "find" and "myself"
  //
  drawTitleLightning(title, k)
  
  //
  // Draw lightning between hero and hovered anti-hero
  // Only for incomplete sections
  //
  if (hoveredAntiHero && !hoveredAntiHero.isCompleted) {
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
