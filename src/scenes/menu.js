import * as Sound from "../utils/sound.js"
import { CFG } from "../cfg.js"
import { getRGB } from "../utils/helper.js"
import * as Hero from "../components/hero.js"
import { createLevelTransition, showTransitionToLevel } from "../utils/transition.js"
import { getProgress, getSectionPositions, getLastLevel, resetProgress } from "../utils/progress.js"
import { drawConnectionWave } from "../utils/connection.js"
import * as Particles from "../utils/particles.js"

/**
 * Menu scene with hero in center
 * @param {Object} k - Kaplay instance
 */
export function sceneMenu(k) {
  k.scene("menu", () => {
    //
    // Clean up persistent word-pile objects from previous scenes
    //
    k.get("word-pile-text").forEach(obj => obj.destroy())
    k.get("word-pile-outline").forEach(obj => obj.destroy())
    k.get("flying-word").forEach(obj => obj.destroy())
    
    //
    // Reset flying words instance so it can be recreated in next level
    //
    k.flyingWordsInstance = null
    
    //
    // Ensure default custom cursor is visible when entering menu
    //
    k.canvas.classList.remove('cursor-pointer')
    k.canvas.style.removeProperty('cursor')
    
    //
    // Disable gravity in menu
    //
    k.setGravity(0)
    
    const centerX = CFG.visual.screen.width / 2
    const centerY = 500
    const radius = 302
    //
    // Create firefly particles background
    //
    const particlesBg = Particles.create({
      k,
      particleCount: 180,
      color: '#FF8C00',
      baseOpacity: 0.8,
      flickerSpeed: 1.5,
      trembleRadius: 12,
      gaussianFactor: 0.35,
      disableMouseInteraction: true
    })
    
    const progress = getProgress()
    const lastLevel = getLastLevel()
    const currentSection = getSectionFromLevel(lastLevel)
    
    //
    // Create sound instance and start audio context
    // Don't start ambient automatically - it will play on hover
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    //
    // Play menu background music
    //
    const menuMusic = k.play("menu", { loop: true, volume: 0.3 })
    const MENU_MUSIC_NORMAL_VOLUME = 0.3
    const MENU_MUSIC_HOVER_VOLUME = 0.08

    //
    // Create hero in center (using HERO type)
    //
    const heroInst = Hero.create({
      k,
      x: centerX,
      y: centerY,
      type: Hero.HEROES.HERO,
      scale: 5,
      controllable: false,
      addMouth: Boolean(progress.word)
    })
    
    const hero = heroInst.character
    hero.z = 10
    //
    // Create 6 anti-heroes around the main hero (sections)
    //
    const sectionConfigs = getSectionPositions(centerX, centerY, radius)
    const antiHeroes = []
    const sectionLabels = []
    //
    // Floating animation configuration (firefly-like in all directions)
    //
    const FLOAT_RADIUS = 6         // Maximum float distance from base position
    const FLOAT_SPEED_X = 0.8      // Speed of horizontal floating
    const FLOAT_SPEED_Y = 1.2      // Speed of vertical floating
    
    sectionConfigs.forEach((config, index) => {
      const isCompleted = progress[config.section]
      //
      // Determine body color: gray if not completed, section color if completed
      // Outline is always black
      //
      const grayColor = '#656565'
      const grayOutlineColor = '#454545'
      const bodyColor = isCompleted ? config.color.body : grayColor
      const outlineColor = isCompleted ? null : grayOutlineColor
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
        bodyColor,
        outlineColor,
        addMouth: config.section === 'word',
        addArms: config.section === 'touch',
        hitboxPadding: 5
      })
      //
      // Preload black-outline variant for hover/completed state
      //
      Hero.loadHeroSprites({
        k,
        type: Hero.HEROES.ANTIHERO,
        bodyColor,
        outlineColor: CFG.visual.colors.outline,
        addMouth: config.section === 'word',
        addArms: config.section === 'touch'
      })
      //
      // Cache sprite prefixes for outline switching
      //
      antiHeroInst.spritePrefixGray = `${Hero.HEROES.ANTIHERO}_${bodyColor}_${outlineColor || CFG.visual.colors.outline}${config.section === 'word' ? '_mouth' : ''}${config.section === 'touch' ? '_arms' : ''}`
      antiHeroInst.spritePrefixBlack = `${Hero.HEROES.ANTIHERO}_${bodyColor}_${CFG.visual.colors.outline}${config.section === 'word' ? '_mouth' : ''}${config.section === 'touch' ? '_arms' : ''}`
      antiHeroInst.currentPrefix = antiHeroInst.spritePrefixGray
      //
      // Store base position and phase offsets for floating animation
      //
      antiHeroInst.baseX = config.x
      antiHeroInst.baseY = config.y
      antiHeroInst.floatPhaseX = index * 1.1 + Math.random() * 2
      antiHeroInst.floatPhaseY = index * 0.7 + Math.random() * 2
      
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
      // Only if section is not completed
      //
      if (config.section === 'word' && !isCompleted) {
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
          const isWordLevel = lastLevel && lastLevel.startsWith('level-word.')
          
          if (isWordLevel) {
            //
            // Continue from last word level with transition
            //
            showTransitionToLevel(k, lastLevel)
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
      const labelPosX = config.x
      const labelPosY = config.y + 50
      const label = k.add([
        k.text(config.section, { size: 18 }),
        k.pos(labelPosX, labelPosY),
        k.anchor("center"),
        k.color(labelColor.r, labelColor.g, labelColor.b),
        k.z(100)
      ])
      const outlineOffsets = [
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 }
      ]
      const labelOutlines = outlineOffsets.map(offset => {
        const outlineNode = k.add([
          k.text(config.section, { size: 18 }),
          k.pos(labelPosX + offset.dx, labelPosY + offset.dy),
          k.anchor("center"),
          k.color(0, 0, 0),
          k.opacity(0),
          k.z(99)
        ])
        return { node: outlineNode, dx: offset.dx, dy: offset.dy }
      })
      
      sectionLabels.push({
        label,
        outlines: labelOutlines,
        section: config.section,
        sectionColor: config.color.body,
        grayColor,
        isCompleted
      })
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
      title: createTitle(k, centerX, centerY, radius),
      antiHeroes,
      sectionLabels,
      currentSection,
      floatTime: 0,
      floatRadius: FLOAT_RADIUS,
      floatSpeedX: FLOAT_SPEED_X,
      floatSpeedY: FLOAT_SPEED_Y,
      hoveredAntiHero: null,
      isLeavingScene: false,
      heartbeatPhase: 0,
      lastHeartbeatTime: 0
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
      // Update heartbeat phase for lightning pulsation (60 BPM = 1 beat per second)
      //
      const HEARTBEAT_BPM = 60
      const heartbeatSpeed = HEARTBEAT_BPM / 60
      inst.heartbeatPhase = (inst.heartbeatPhase + k.dt() * heartbeatSpeed) % 1
      
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
        const shouldUseBlackOutline = antiHeroInst === hoveredInst || antiHeroInst.isCompleted
        
        if (shouldUseBlackOutline) {
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
        
        //
        // Switch outline variant by changing sprite prefix
        //
        const desiredPrefix = shouldUseBlackOutline ? antiHeroInst.spritePrefixBlack : antiHeroInst.spritePrefixGray
        if (antiHeroInst.currentPrefix !== desiredPrefix) {
          antiHeroInst.currentPrefix = desiredPrefix
          antiHeroInst.spritePrefix = desiredPrefix
          antiHeroInst.character.use(k.sprite(`${desiredPrefix}_0_0`))
        }
      })
      
      //
      // Update section labels: color + outline on hover/completed/current
      //
      sectionLabels.forEach(entry => {
        const { label, outlines, section, sectionColor, grayColor, isCompleted } = entry
        const isHover = hoveredInst && hoveredInst.section === section
        const isCurrent = inst.currentSection === section
        const useHighlight = isHover || isCompleted || isCurrent
        const targetColor = useHighlight ? sectionColor : grayColor
        const labelRgb = getRGB(k, targetColor)
        label.color = k.rgb(labelRgb.r, labelRgb.g, labelRgb.b)
        const outlineOpacity = useHighlight ? 1 : 0
        outlines.forEach(outlineObj => {
          outlineObj.node.opacity = outlineOpacity
          outlineObj.node.pos.x = label.pos.x + outlineObj.dx
          outlineObj.node.pos.y = label.pos.y + outlineObj.dy
        })
      })
      
      //
      // Change cursor to pointer when hovering over word anti-hero
      // Don't change cursor if leaving scene
      //
      if (!inst.isLeavingScene) {
        if (hoveredInst && hoveredInst.section === 'word' && !hoveredInst.isCompleted) {
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
      // Control music volume based on hover state
      //
      if (!inst.isLeavingScene) {
        if (foundHover && hoveredInst && !hoveredInst.isCompleted) {
          //
          // Fade music volume down when hovering
          //
          const targetVolume = MENU_MUSIC_HOVER_VOLUME
          menuMusic.volume += (targetVolume - menuMusic.volume) * 5 * k.dt()
          //
          // Play heartbeat sound at the right phase (once per cycle)
          //
          const HEARTBEAT_INTERVAL = 1.0
          if (k.time() - inst.lastHeartbeatTime >= HEARTBEAT_INTERVAL) {
            Sound.playHeartbeatSound(sound)
            inst.lastHeartbeatTime = k.time()
          }
        } else {
          //
          // Fade music volume back to normal when not hovering
          //
          const targetVolume = MENU_MUSIC_NORMAL_VOLUME
          menuMusic.volume += (targetVolume - menuMusic.volume) * 3 * k.dt()
        }
      }
      
      //
      // Update title movement or hide when leaving
      //
      if (inst.isLeavingScene) {
        hideTitle(inst.title)
      } else {
        updateTitle(inst.title, k, hoveredInst)
      }
      
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
    const hasSavedGame = lastLevel !== null
    
    //
    // Hint text - Space to continue, Enter to start new, ESC to go back
    // If all sections completed, don't show continue option
    //
    const allCompleted = progress.word  // Only word section is implemented
    
    let hintText
    if (allCompleted) {
      hintText = "Enter - new game  |  ESC - back"
    } else if (hasSavedGame) {
      hintText = "Space - continue  |  Enter - new game  |  ESC - back"
    } else {
      hintText = "Space or Enter - start  |  ESC - back"
    }
    //
    // Create outline shadows for hint text
    //
    const outlineOffsets = [
      { dx: -2, dy: 0 },
      { dx: 2, dy: 0 },
      { dx: 0, dy: -2 },
      { dx: 0, dy: 2 },
      { dx: -1, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: 1, dy: 1 }
    ]
    
    const startTextOutlines = []
    outlineOffsets.forEach(({ dx, dy }) => {
      const outline = k.add([
        k.text(hintText, { size: 20 }),
        k.pos(960 + dx, 1030 + dy),
        k.anchor("center"),
        k.opacity(1),
        k.color(0, 0, 0),
        k.z(99)
      ])
      startTextOutlines.push(outline)
    })
    
    const startText = k.add([
      k.text(hintText, { size: 20 }),
      k.pos(960, 1030),  // Fixed: k.width() / 2 = 960, k.height() - 50 = 1030
      k.anchor("center"),
      k.opacity(1),
      k.color(150, 150, 150), // Gray
      k.z(100)
    ])
    
    //
    // Smooth flicker animation for start text (like in ready scene)
    //
    const FLICKER_FADE_DURATION = 1.2
    const FLICKER_MIN_OPACITY = 0.5
    const FLICKER_MAX_OPACITY = 1.0
    
    let hintFlickerTime = FLICKER_FADE_DURATION  // Start at max opacity
    let hintDirection = -1  // Start fading down
    
    k.onUpdate(() => {
      //
      // Update flicker timer
      //
      hintFlickerTime += hintDirection * k.dt()
      
      //
      // Reverse direction at bounds
      //
      if (hintFlickerTime >= FLICKER_FADE_DURATION) {
        hintDirection = -1
        hintFlickerTime = FLICKER_FADE_DURATION
      } else if (hintFlickerTime <= 0) {
        hintDirection = 1
        hintFlickerTime = 0
      }
      
      //
      // Interpolate opacity between min and max
      //
      const progress = hintFlickerTime / FLICKER_FADE_DURATION
      const newOpacity = FLICKER_MIN_OPACITY + (FLICKER_MAX_OPACITY - FLICKER_MIN_OPACITY) * progress
      startText.opacity = newOpacity
      //
      // Update outline opacity
      //
      startTextOutlines.forEach(outline => {
        outline.opacity = newOpacity
      })
    })
    
    //
    // Start game controls
    // Space or Enter - Continue from last saved level or start from beginning
    //
    k.onKeyPress("space", () => {
      //
      // Don't allow starting if word section is completed (only implemented section)
      //
      if (progress.word) {
        return
      }
      
      //
      // Mark that we're leaving the scene
      //
      inst.isLeavingScene = true
      
      Sound.stopAmbient(sound)
      //
      // Reset cursor to default (remove pointer class)
      //
      k.canvas.classList.remove('cursor-pointer')
      
      if (hasSavedGame) {
        //
        // Continue from last saved level with transition (show red text)
        //
        showTransitionToLevel(k, lastLevel)
      } else {
        //
        // No save - start from beginning with intro phrase
        //
        createLevelTransition(k, 'menu')
      }
    })
    
    k.onKeyPress("enter", () => {
      //
      // Mark that we're leaving the scene
      //
      inst.isLeavingScene = true
      
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
    // Back to ready scene (ESC)
    //
    k.onKeyPress("escape", () => {
      Sound.stopAmbient(sound)
      k.go("ready")
    })
    
    //
    // Cleanup when leaving scene
    //
    k.onSceneLeave(() => {
      //
      // Stop menu music
      //
      menuMusic.stop()
      //
      // Destroy all game objects
      //
      heroInst.character.destroy()
      antiHeroes.forEach(antiHeroInst => {
        antiHeroInst.character.destroy()
      })
      sectionLabels.forEach(entry => {
        entry.label.destroy()
        entry.outlines.forEach(outlineObj => outlineObj.node.destroy())
      })
      
      //
      // Destroy title objects
      //
      inst.title.letters.forEach(letter => {
        letter.destroy()
      })
      
      startTextOutlines.forEach(outline => {
        outline.destroy()
      })
      startText.destroy()
      
      //
      // Stop ambient sound
      //
      Sound.stopAmbient(sound)
    })
  })
}

/**
 * Create title with circular motion around anti-heroes
 * @param {Object} k - Kaplay instance
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {number} radius - Radius of anti-heroes circle
 * @returns {Object} Title instance with state
 */
function createTitle(k, centerX, centerY, radius) {
  const text = "find"  // Only "find" word
  const titleSize = 32  // Smaller size (was 48)
  const amberColor = k.rgb(228, 155, 36)
  const dimColor = k.rgb(120, 120, 120)  // Gray (was amber-dimmed)
  const outlineOffsets = [
    { dx: -2, dy: 0 },
    { dx: 2, dy: 0 },
    { dx: 0, dy: -2 },
    { dx: 0, dy: 2 },
    { dx: -2, dy: -2 },
    { dx: 2, dy: -2 },
    { dx: -2, dy: 2 },
    { dx: 2, dy: 2 }
  ]
  
  //
  // Create each letter as separate object
  //
  const letters = []
  const outlineLetters = []
  const circleRadius = radius + 100  // Slightly smaller (was +120)
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    
    //
    // Outline shadows (four directions)
    //
    const shadows = outlineOffsets.map(offset => k.add([
      k.text(char, { size: titleSize }),
      k.pos(offset.dx, offset.dy),
      k.anchor("center"),
      k.color(0, 0, 0),
      k.opacity(0),
      k.z(CFG.visual.zIndex.ui + 49),
      k.fixed()
    ]))
    
    const letter = k.add([
      k.text(char, { size: titleSize }),
      k.pos(0, 0),
        k.anchor("center"),
      k.color(dimColor),  // Start dimmed
      k.outline(0, k.rgb(0, 0, 0)),
      k.z(CFG.visual.zIndex.ui + 50),
      k.fixed()
    ])
    
    letters.push(letter)
    outlineLetters.push(shadows.map((shadow, index) => ({
      node: shadow,
      dx: outlineOffsets[index].dx,
      dy: outlineOffsets[index].dy
    })))
  }
  
  return {
    letters,
    outlineLetters,
    text,  // Single text
    circleRadius,
    centerX,
    centerY,
    angle: 0,  // Current angle on circle
    targetAngle: 0,  // Target angle when hovering
    isHovering: false,
    hoverAngle: 0,  // Angle of hovered anti-hero
    hoverRange: 0.3,  // Range of movement when hovering (radians)
    hoverPhase: 0,  // Phase for back-and-forth movement
    moveSpeed: 0.15,  // Normal rotation speed
    snapSpeed: 3.0,  // Fast snap to hover position
    amberColor,
    dimColor,
    isReversed: false,  // Current letter order
    targetReversed: false,  // Target letter order
    reverseFadePhase: 1.0,  // 1.0 = fully visible, 0.0 = invisible (for reversal)
    isReverseChanging: false,  // Is reversal fade animation active
    baseOpacity: 0.3  // Base opacity when not hovering (dimmed)
  }
}

/**
 * Update title circular movement
 * @param {Object} titleInst - Title instance
 * @param {Object} k - Kaplay instance
 * @param {Object|null} hoveredAntiHero - Currently hovered anti-hero
 */
function updateTitle(titleInst, k, hoveredAntiHero) {
  const dt = k.dt()
  
  //
  // Determine if letters should be reversed based on angle
  // Text direction depends on position on circle (clockwise motion)
  // 
  // Angles (starting from -120° = top-left):
  // - Top-left (240°): 23 hours → normal (inverted)
  // - Top-right (300°): 13 hours → normal (inverted)
  // - Right (0°/360°): 15 hours → normal (inverted)
  // - Bottom-right (60°): 17 hours → reverse (inverted)
  // - Bottom-left (120°): 19 hours → reverse (inverted)
  // - Left (180°): 21 hours → reverse (inverted)
  //
  const normalizedAngle = ((titleInst.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  
  //
  // Convert to degrees for easier understanding (0° = right, increases counter-clockwise)
  //
  const degrees = (normalizedAngle * 180 / Math.PI)
  
  let shouldReverse = false
  
  //
  // Top-right quadrant (270° to 30°): normal (inverted from reverse)
  // This covers 13 hours (top-right) and 15 hours (right)
  //
  if (degrees >= 270 || degrees < 30) {
    shouldReverse = false
  }
  //
  // Right to bottom (30° to 150°): reverse (inverted from normal)
  // This covers 17 hours (bottom-right) and 19 hours (bottom-left)
  //
  else if (degrees >= 30 && degrees < 150) {
    shouldReverse = true
  }
  //
  // Left side (150° to 210°): reverse (inverted from normal)
  // This covers 21 hours (left)
  //
  else if (degrees >= 150 && degrees < 210) {
    shouldReverse = true
  }
  //
  // Top-left (210° to 270°): normal (inverted from reverse)
  // This covers 23 hours (top-left)
  //
  else if (degrees >= 210 && degrees < 270) {
    shouldReverse = false
  }
  
  //
  // Check if reversal state needs to change
  //
  if (shouldReverse !== titleInst.targetReversed) {
    titleInst.targetReversed = shouldReverse
    //
    // Start fade animation for reversal
    //
    if (!titleInst.isReverseChanging) {
      titleInst.isReverseChanging = true
      titleInst.reverseFadePhase = 1.0
    }
  }
  
  //
  // Handle fade animation for reversal change
  //
  if (titleInst.isReverseChanging) {
    if (titleInst.reverseFadePhase > 0 && titleInst.isReversed !== titleInst.targetReversed) {
      //
      // Fade out (300ms = 0.3s, so speed = 1/0.3 = 3.33)
      //
      titleInst.reverseFadePhase -= dt * 3.33
      if (titleInst.reverseFadePhase <= 0) {
        titleInst.reverseFadePhase = 0
        //
        // Switch reversal at complete fade
        //
        titleInst.isReversed = titleInst.targetReversed
      }
    } else if (titleInst.reverseFadePhase < 1) {
      //
      // Fade in (400ms = 0.4s, so speed = 1/0.4 = 2.5) - slower than fade out
      //
      titleInst.reverseFadePhase += dt * 2.5
      if (titleInst.reverseFadePhase >= 1) {
        titleInst.reverseFadePhase = 1
        titleInst.isReverseChanging = false
      }
    }
  }
  
  //
  // Update hover state
  //
  if (hoveredAntiHero) {
    if (!titleInst.isHovering) {
      //
      // Just started hovering - calculate angle to anti-hero
      //
      const dx = hoveredAntiHero.character.pos.x - titleInst.centerX
      const dy = hoveredAntiHero.character.pos.y - titleInst.centerY
      titleInst.hoverAngle = Math.atan2(dy, dx)
      titleInst.isHovering = true
      titleInst.hoverPhase = 0
    }
    
    //
    // Move to hovered position quickly
    //
    let angleDiff = titleInst.hoverAngle - titleInst.angle
    
    //
    // Normalize angle difference to [-PI, PI]
    //
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
    
    titleInst.angle += angleDiff * titleInst.snapSpeed * dt
    
    //
    // Update hover phase for back-and-forth movement
    //
    titleInst.hoverPhase += dt * 2
    const hoverOffset = Math.sin(titleInst.hoverPhase) * titleInst.hoverRange
    titleInst.targetAngle = titleInst.hoverAngle + hoverOffset
    
    //
    // Change to anti-hero's color
    //
    const targetColor = hoveredAntiHero.character.color
    titleInst.letters.forEach(letter => {
      letter.color.r += (targetColor.r - letter.color.r) * 5 * dt
      letter.color.g += (targetColor.g - letter.color.g) * 5 * dt
      letter.color.b += (targetColor.b - letter.color.b) * 5 * dt
    })
  } else {
    titleInst.isHovering = false
    
    //
    // Rotate slowly around circle
    //
    titleInst.angle += titleInst.moveSpeed * dt
    titleInst.targetAngle = titleInst.angle
    
    //
    // Dim letters
    //
    titleInst.letters.forEach(letter => {
      const currentR = letter.color.r
      const targetR = titleInst.dimColor.r
      letter.color.r += (targetR - currentR) * 3 * dt
      letter.color.g += (titleInst.dimColor.g - letter.color.g) * 3 * dt
      letter.color.b += (titleInst.dimColor.b - letter.color.b) * 3 * dt
    })
  }
  
  //
  // Position each letter along the arc
  //
  const textLength = titleInst.text.length
  //
  // Arc length for "find" word
  //
  const arcLength = 0.3
  const angleStep = textLength > 1 ? arcLength / (textLength - 1) : 0
  
  titleInst.letters.forEach((letter, index) => {
    //
    // Update letter character if needed
    //
    const currentChar = titleInst.text[index]
    if (letter.text !== currentChar) {
      letter.text = currentChar
    }
    //
    // Update outline characters to match
    //
    const outlines = titleInst.outlineLetters[index]
    outlines.forEach(outline => {
      if (outline.node.text !== currentChar) {
        outline.node.text = currentChar
      }
    })
    
    //
    // Determine letter index based on order (reversed or not)
    //
    const displayIndex = titleInst.isReversed ? (textLength - 1 - index) : index
    
    //
    // Calculate angle for this letter
    //
    const letterAngle = titleInst.angle + (displayIndex - textLength / 2) * angleStep
    
    //
    // Position on circle
    //
    const x = titleInst.centerX + Math.cos(letterAngle) * titleInst.circleRadius
    const y = titleInst.centerY + Math.sin(letterAngle) * titleInst.circleRadius
    
    letter.pos.x = x
    letter.pos.y = y
    
    //
    // Rotate letter to follow arc (tangent to circle)
    //
    letter.angle = letterAngle + Math.PI / 2
    
    //
    // Apply base opacity for dimming based on hover
    // Also apply reversal fade phase
    //
    const baseFinalOpacity = hoveredAntiHero ? 1.0 : titleInst.baseOpacity
    const finalOpacity = baseFinalOpacity * titleInst.reverseFadePhase
    letter.opacity = finalOpacity
    
    //
    // Toggle outline: black on hover (drawn with shadow letters), none when idle
    //
    const outlineOpacity = hoveredAntiHero ? finalOpacity : 0
    outlines.forEach(outline => {
      outline.node.pos.x = x + outline.dx
      outline.node.pos.y = y + outline.dy
      outline.node.angle = letter.angle
      outline.node.opacity = outlineOpacity
    })
    //
    // Disable text outline component to avoid conflicts (kept at 0)
    //
    letter.outline.width = 0
  })
}

//
// Hide title instantly (used when leaving scene)
//
function hideTitle(titleInst) {
  titleInst.letters.forEach(letter => {
    letter.opacity = 0
  })
  titleInst.outlineLetters.forEach(outlines => {
    outlines.forEach(outline => {
      outline.node.opacity = 0
    })
  })
}

//
// Extract section name from level id (e.g., 'level-word.2' -> 'word')
//
function getSectionFromLevel(levelName) {
  if (!levelName || !levelName.startsWith('level-')) return null
  const withoutPrefix = levelName.slice('level-'.length)
  const parts = withoutPrefix.split('.')
  return parts[0] || null
}

/**
 * Draw background scene
 * @param {Object} inst - Scene instance
 */
function drawScene(inst) {
  const { k, hero, hoveredAntiHero, particlesBg } = inst
  
  //
  // Draw gray background (same color as level platforms)
  //
  const bgRgb = getRGB(k, CFG.visual.colors.menu.platformColor)
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
      opacity: 0.6,
      heartbeatPhase: inst.heartbeatPhase
    })
  }
}
