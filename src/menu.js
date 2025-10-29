import * as Sound from "./utils/sound.js"
import { CFG } from "./cfg.js"
import { getRGB } from "./utils/helper.js"
import * as Hero from "./components/hero.js"
import { drawConnectionWave } from "./utils/connection.js"

export function sceneMenu(k) {
  k.scene("menu", () => {
    const centerX = k.width() / 2
    const centerY = k.height() / 2
    
    // Create sound instance and start audio context
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    Sound.startAmbient(sound)

    // Create heroes using Hero component
    const leftHeroInst = Hero.create({
      k,
      x: centerX * 0.5,
      y: centerY,
      type: Hero.HEROES.HERO,
      scale: 5,
      controllable: false
    })
    
    const rightHeroInst = Hero.create({
      k,
      x: centerX * 1.5,
      y: centerY,
      type: Hero.HEROES.ANTIHERO,
      scale: 5,
      controllable: false
    })
    
    // Get character references
    const leftHero = leftHeroInst.character
    const rightHero = rightHeroInst.character
    
    // Add menu-specific properties
    leftHero.baseX = centerX * 0.5
    leftHero.baseY = centerY
    leftHero.glitchOffsetX = 0
    leftHero.glitchOffsetY = 0
    leftHero.z = 10
    
    rightHero.baseX = centerX * 1.5
    rightHero.baseY = centerY
    rightHero.glitchOffsetX = 0
    rightHero.glitchOffsetY = 0
    rightHero.z = 10
    
    // Scene instance with all state and references
    const inst = {
      k,
      centerX,
      centerY,
      leftHero,
      rightHero,
      sound,
      titleObjects: createTitle(k, centerX, centerY),
      bgOffset: 0,
      glitchTimer: 0,
      titleGlitchTimer: 0,
      bgShiftTimer: 0,
      targetBgShift: 0,
      currentBgShift: 0,
      glitches: [],
      boundaryRotation: 0,
      targetBoundaryRotation: 0,
      boundaryRotationTimer: 0,
      leftHeroTimer: 0,
      rightHeroTimer: 0,
      leftHeroTargetX: 0,
      leftHeroTargetY: 0,
      rightHeroTargetX: 0,
      rightHeroTargetY: 0,
      connectionPulse: 0
    }
    
    // Background layer with animation
    k.onDraw(() => drawScene(inst))
    
    // Update animations
    k.onUpdate(() => updateBackgroundEffects(inst))
  
    // Hero movement animation
    k.onUpdate(() => updateHeroMovement(inst))
  
    // Title glitch effects
    k.onUpdate(() => updateTitleGlitch(inst))
  
    // Hint to start game
    const startText = k.add([
      k.text("PRESS SPACE TO BEGIN", { size: 24 }),
      k.pos(centerX, k.height() - 80),
      k.anchor("center"),
      k.opacity(1),
      k.color(255, 100, 50), // Red-orange accent
      k.outline(4, k.rgb(62, 39, 35)),
    ])
    
    // Sound hint
    k.add([
      k.text("Press M to mute/unmute", { size: 16 }),
      k.pos(centerX, k.height() - 50),
      k.anchor("center"),
      k.opacity(1),
      k.color(255, 165, 0), // Orange
      k.outline(3, k.rgb(62, 39, 35)),
    ])
    
    // Hint blinking
    k.onUpdate(() => {
      startText.opacity = 0.5 + Math.sin(k.time() * 3) * 0.5
    })
    
    // Setup keyboard controls
    setupKeyboardControls(inst)
    
    // Stop music when leaving scene
    k.onSceneLeave(() => Sound.stopAmbient(sound))
  })
}

/**
 * Create title objects with glitch effects
 * @param {Object} k - Kaplay instance
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @returns {Array} Array of title letter objects
 */
function createTitle(k, centerX, centerY) {
  const titleLetters = "FIND MYSELF".split("")
  const titleObjects = []
  
  titleLetters.forEach((letter, i) => {
    const isSpace = letter === " "
    const spacing = 30
    const totalWidth = titleLetters.length * spacing
    const startX = centerX - totalWidth / 2
    
    const letterObj = k.add([
      k.text(letter, { size: isSpace ? 20 : 48 }),
      k.pos(startX + i * spacing, centerY - 150),
      k.anchor("center"),
      k.opacity(1),
      k.color(255, 140, 0), // Dark orange by default
      {
        baseX: startX + i * spacing,
        baseY: centerY - 150,
        index: i,
        glitchOffsetX: 0,
        glitchOffsetY: 0,
      }
    ])
    
    titleObjects.push(letterObj)
  })
  
  return titleObjects
}

/**
 * Setup keyboard controls for scene navigation and audio
 * @param {Object} inst - Scene instance
 */
function setupKeyboardControls(inst) {
  const { k, sound } = inst
  
  // Transition to game (use config)
  CFG.controls.startGame.forEach(key => {
    k.onKeyPress(key, () => {
      Sound.stopAmbient(sound)
      k.go("level-1.3") 
    })
  })
  
  // Music control (use config)
  CFG.controls.toggleMute.forEach(key => {
    k.onKeyPress(key, async () => {
      const isPlaying = Sound.isAmbientPlaying(sound)
      
      // Toggle volume
      if (sound.ambientMasterGain) {
        const currentVolume = sound.ambientMasterGain.gain.value
        if (isPlaying && currentVolume > 0.01) {
          Sound.setAmbientVolume(sound, 0)
        } else {
          Sound.setAmbientVolume(sound, CFG.audio.ambient.masterVolume)
          Sound.resumeAudioContext(sound)
        }
      }
    })
  })
}

function drawScene(inst) {
  const { k, centerX, leftHero, rightHero } = inst
  
  // Moving background
  inst.bgOffset += k.dt() * 10
  const waveX = Math.sin(inst.bgOffset * 0.1) * 5
  const waveY = Math.cos(inst.bgOffset * 0.15) * 5
  
  // Smooth interpolations
  inst.currentBgShift = k.lerp(inst.currentBgShift, inst.targetBgShift, 0.05)
  inst.boundaryRotation = k.lerp(inst.boundaryRotation, inst.targetBoundaryRotation, 0.03)
  
  const padding = 20
  const boundaryCenter = centerX + inst.currentBgShift
  const rotationOffset = Math.tan(inst.boundaryRotation) * (k.height() / 2)
  
  drawBackground(k, { centerX, waveX, waveY, boundaryCenter, rotationOffset, padding })
  
  inst.connectionPulse += k.dt() * 2
  drawHeroGlow(k, rightHero, inst.connectionPulse)
  drawConnectionWave(k, leftHero.pos, rightHero.pos)
  drawGlitches(k, inst.glitches)
}

function createGlitch(k, centerX, currentBgShift) {
  const side = k.rand(0, 1) > 0.5 ? "left" : "right"
  const boundary = centerX + currentBgShift
  const x = side === "left" ? k.rand(0, boundary) : k.rand(boundary, k.width())
  const y = k.rand(0, k.height())
  const width = k.rand(20, 100)
  const height = k.rand(5, 30)
  
  return {
    x, y, width, height, side,
    lifetime: k.rand(0.1, 0.5),
    age: 0
  }
}

function drawBackground(k, state) {
  const { centerX, waveX, waveY, boundaryCenter, rotationOffset, padding } = state
  
  // Left side - light peach
  k.drawPolygon({
    pts: [
      k.vec2(waveX - padding, waveY - padding),
      k.vec2(boundaryCenter + rotationOffset + padding, waveY - padding),
      k.vec2(boundaryCenter - rotationOffset + padding, k.height() - waveY + padding),
      k.vec2(waveX - padding, k.height() - waveY + padding)
    ],
    color: getRGB(k, CFG.colors['level-1.1'].background),  // background color
  })
  
  // Right side - dark brown
  k.drawPolygon({
    pts: [
      k.vec2(boundaryCenter + rotationOffset - padding, -waveY - padding),
      k.vec2(k.width() - waveX + padding, -waveY - padding),
      k.vec2(k.width() - waveX + padding, k.height() + waveY + padding),
      k.vec2(boundaryCenter - rotationOffset - padding, k.height() + waveY + padding)
    ],
    color: getRGB(k, CFG.colors['level-1.1'].platform),  // platform color
  })
}

function drawHeroGlow(k, rightHero, connectionPulse) {
  const glowSize = 40 + Math.sin(connectionPulse) * 10
  const glowOpacity = 0.3 + Math.sin(connectionPulse * 1.5) * 0.15
  
  k.drawCircle({
    pos: k.vec2(rightHero.pos.x, rightHero.pos.y),
    radius: glowSize,
    color: k.rgb(255, 140, 0),
    opacity: glowOpacity
  })
}

function drawGlitches(k, glitches) {
  for (const glitch of glitches) {
    const colorType = k.rand(0, 3)
    const glitchColor = colorType < 1 
      ? k.rgb(255, 165, 0)
      : colorType < 2 
      ? k.rgb(255, 140, 0)
      : k.rgb(255, 200, 100)
    
    k.drawRect({
      pos: k.vec2(glitch.x, glitch.y),
      width: glitch.width,
      height: glitch.height,
      color: glitchColor,
      opacity: 0.3 + k.rand(0, 0.3)
    })
  }
}

function updateBackgroundEffects(inst) {
  const { k, centerX } = inst
  
  inst.glitchTimer += k.dt()
  inst.bgShiftTimer += k.dt()
  inst.boundaryRotationTimer += k.dt()
  
  // Create new glitches
  if (inst.glitchTimer > 0.1) {
    if (k.rand(0, 1) > 0.7) {
      inst.glitches.push(createGlitch(k, centerX, inst.currentBgShift))
    }
    inst.glitchTimer = 0
  }
  
  // Remove old glitches
  inst.glitches = inst.glitches.filter(g => {
    g.age += k.dt()
    return g.age < g.lifetime
  })
  
  // Random background shift
  if (inst.bgShiftTimer > k.rand(0.3, 1.5)) {
    if (k.rand(0, 1) > 0.85) {
      inst.targetBgShift = k.rand(-150, 150)
    } else if (k.rand(0, 1) > 0.6) {
      inst.targetBgShift = k.rand(-60, 60)
    } else {
      inst.targetBgShift = k.rand(-25, 25)
    }
    inst.bgShiftTimer = 0
  }
  
  // Boundary rotation
  if (inst.boundaryRotationTimer > k.rand(3, 6)) {
    if (k.rand(0, 1) > 0.3) {
      inst.targetBoundaryRotation = k.rand(-0.26, 0.26)
    } else {
      inst.targetBoundaryRotation = 0
    }
    inst.boundaryRotationTimer = 0
  }
}

function updateHeroMovement(inst) {
  const { k, centerY, leftHero, rightHero } = inst
  
  // Independent left hero movement
  inst.leftHeroTimer += k.dt()
  if (inst.leftHeroTimer > k.rand(1.5, 2.5)) {
    inst.leftHeroTargetX = k.rand(-100, 100)
    inst.leftHeroTargetY = k.rand(-100, 100)
    inst.leftHeroTimer = 0
  }
  
  // Independent right hero movement
  inst.rightHeroTimer += k.dt()
  if (inst.rightHeroTimer > k.rand(1.5, 2.5)) {
    inst.rightHeroTargetX = k.rand(-100, 100)
    inst.rightHeroTargetY = k.rand(-100, 100)
    inst.rightHeroTimer = 0
  }
  
  // Smoothly move to target positions
  leftHero.glitchOffsetX = k.lerp(leftHero.glitchOffsetX, inst.leftHeroTargetX, 0.02)
  leftHero.glitchOffsetY = k.lerp(leftHero.glitchOffsetY, inst.leftHeroTargetY, 0.02)
  rightHero.glitchOffsetX = k.lerp(rightHero.glitchOffsetX, inst.rightHeroTargetX, 0.02)
  rightHero.glitchOffsetY = k.lerp(rightHero.glitchOffsetY, inst.rightHeroTargetY, 0.02)
  
  // Position with wave
  leftHero.opacity = 1
  rightHero.opacity = 1
  const wave = Math.sin(k.time() * 2) * 10
  leftHero.pos.y = centerY + wave + leftHero.glitchOffsetY
  leftHero.pos.x = leftHero.baseX + leftHero.glitchOffsetX
  rightHero.pos.y = centerY - wave + rightHero.glitchOffsetY
  rightHero.pos.x = rightHero.baseX + rightHero.glitchOffsetX
}

function updateTitleGlitch(inst) {
  const { k, titleObjects } = inst
  
  inst.titleGlitchTimer += k.dt()
  
  if (inst.titleGlitchTimer > 0.08) {
    titleObjects.forEach((obj, i) => {
      if (k.rand(0, 1) > 0.92) {
        obj.glitchOffsetX = k.rand(-5, 5)
        obj.glitchOffsetY = k.rand(-3, 3)
      } else {
        obj.glitchOffsetX *= 0.9
        obj.glitchOffsetY *= 0.9
      }
      
      obj.pos.x = k.lerp(obj.pos.x, obj.baseX + obj.glitchOffsetX, 0.15)
      obj.pos.y = k.lerp(obj.pos.y, obj.baseY + obj.glitchOffsetY, 0.15)
      
      if (k.rand(0, 1) > 0.97) {
        const colors = [
          k.rgb(255, 140, 0),
          k.rgb(255, 165, 0),
          k.rgb(62, 39, 35),
          k.rgb(255, 100, 50),
          k.rgb(255, 218, 185),
          k.rgb(255, 200, 100),
        ]
        obj.color = k.choose(colors)
      }
      
      if (k.rand(0, 1) > 0.95) {
        obj.opacity = k.rand(0.6, 1)
      } else {
        obj.opacity = k.lerp(obj.opacity, 1, 0.08)
      }
      
      if (k.rand(0, 1) > 0.98) {
        obj.scale = k.vec2(k.rand(0.9, 1.2), k.rand(0.9, 1.2))
      } else if (obj.scale) {
        obj.scale = k.lerp(obj.scale, k.vec2(1, 1), 0.15)
      }
    })
    
    inst.titleGlitchTimer = 0
  }
  
  // Wave across letters
  titleObjects.forEach((obj, i) => {
    obj.pos.y = obj.baseY + obj.glitchOffsetY + Math.sin(k.time() * 2 + i * 0.3) * 5
  })
}
