import * as Sound from "../audio/sound.js"
import { CONFIG } from "../config.js"
import { getRGB } from "../utils/helpers.js"

export function menuScene(k) {
  k.scene("menu", () => {
    const centerX = k.width() / 2
    const centerY = k.height() / 2
    
    // Start ambient music immediately
    const sound = Sound.create()
    Sound.startAmbient(sound)
    
    // Variables for eye animation
    let eyeOffsetX = 0
    let eyeOffsetY = 0
    let targetEyeX = 0
    let targetEyeY = 0
    let eyeTimer = 0
    
    // Variables for background animation
    let bgOffset = 0
    let glitchTimer = 0
    let titleGlitchTimer = 0
    let bgShiftTimer = 0
    let targetBgShift = 0
    let currentBgShift = 0
    
    // Array of glitches on background
    let glitches = []
    
    // Variables for glitchy dividing line
    let lineGlitchTimer = 0
    
    // Variables for vertical boundary rotation
    let boundaryRotation = 0 // Current angle
    let targetBoundaryRotation = 0 // Target angle
    let boundaryRotationTimer = 0
    
    // Variables for smooth hero movement (independent timers)
    let leftHeroTimer = 0
    let rightHeroTimer = 0
    let leftHeroTargetX = 0
    let leftHeroTargetY = 0
    let rightHeroTargetX = 0
    let rightHeroTargetY = 0
    
    // Variables for energy connection between heroes
    let connectionPulse = 0
    
    // Create random background glitches
    function createGlitch() {
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
    
    // Background layer with animation
    k.onDraw(() => {
      // Moving background - simple wave trajectory
      bgOffset += k.dt() * 10
      const waveX = Math.sin(bgOffset * 0.1) * 5
      const waveY = Math.cos(bgOffset * 0.15) * 5
      
      // Smooth interpolation to target shift
      currentBgShift = k.lerp(currentBgShift, targetBgShift, 0.05)
      
      // Smooth interpolation to target rotation angle
      boundaryRotation = k.lerp(boundaryRotation, targetBoundaryRotation, 0.03)
      
      // Add padding for background movement
      const padding = 20
      
      // Calculate vertical boundary offset due to rotation
      const boundaryCenter = centerX + currentBgShift
      const rotationOffset = Math.tan(boundaryRotation) * (k.height() / 2)
      
      // Left side - light peach (polygon) - from config
      k.drawPolygon({
        pts: [
          k.vec2(waveX - padding, waveY - padding),
          k.vec2(boundaryCenter + rotationOffset + padding, waveY - padding),
          k.vec2(boundaryCenter - rotationOffset + padding, k.height() - waveY + padding),
          k.vec2(waveX - padding, k.height() - waveY + padding)
        ],
        color: getRGB(k, CONFIG.colors.level1.background),
      })
      
      // Right side - dark brown (polygon) - from config
      k.drawPolygon({
        pts: [
          k.vec2(boundaryCenter + rotationOffset - padding, -waveY - padding),
          k.vec2(k.width() - waveX + padding, -waveY - padding),
          k.vec2(k.width() - waveX + padding, k.height() + waveY + padding),
          k.vec2(boundaryCenter - rotationOffset - padding, k.height() + waveY + padding)
        ],
        color: getRGB(k, CONFIG.colors.level1.platform),
      })
      
      // Glow around right hero for contrast (follows hero)
      connectionPulse += k.dt() * 2
      const glowSize = 40 + Math.sin(connectionPulse) * 10
      const glowOpacity = 0.3 + Math.sin(connectionPulse * 1.5) * 0.15
      
      k.drawCircle({
        pos: k.vec2(rightHero.pos.x, rightHero.pos.y),
        radius: glowSize,
        color: k.rgb(255, 140, 0),
        opacity: glowOpacity
      })
      
      // Sound wave between heroes (diagonal, emerges from behind them)
      const connectionSegments = []
      const segmentWidth = 8 // Smaller width for smoother wave
      const startX = leftHero.pos.x // Start from left hero center
      const startY = leftHero.pos.y
      const endX = rightHero.pos.x // End at right hero center
      const endY = rightHero.pos.y
      const lineWidth = endX - startX
      const numConnectionSegments = Math.ceil(lineWidth / segmentWidth)
      
      for (let i = 0; i <= numConnectionSegments; i++) {
        const t = i / numConnectionSegments // Progress from 0 to 1
        const x = startX + (endX - startX) * t
        const baseY = startY + (endY - startY) * t // Linear Y interpolation
        
        // Sound wave: multiple frequencies with variable amplitude
        const mainWave = Math.sin(k.time() * 4 + i * 0.5) * 12
        const harmonic1 = Math.sin(k.time() * 8 + i * 1.0) * 6
        const harmonic2 = Math.sin(k.time() * 12 + i * 1.5) * 3
        
        // Amplitude modulation ("pulse" effect)
        const amplitude = 0.8 + Math.sin(k.time() * 2) * 0.3
        
        // Random micro-oscillations for liveliness
        const noise = (k.rand(0, 1) - 0.5) * 2
        
        const waveY = (mainWave + harmonic1 + harmonic2 + noise) * amplitude
        
        connectionSegments.push({
          x: x,
          y: baseY + waveY
        })
      }
      
      // Draw multiple sound waves with different thickness
      for (let i = 0; i < connectionSegments.length - 1; i++) {
        const current = connectionSegments[i]
        const next = connectionSegments[i + 1]
        
        const lineColor = k.rand(0, 1) > 0.95 
          ? k.choose([k.rgb(255, 165, 0), k.rgb(255, 200, 100), k.rgb(255, 100, 50)]) 
          : k.rgb(255, 140, 0)
        
        // Main wave
        k.drawLine({
          p1: k.vec2(current.x, current.y),
          p2: k.vec2(next.x, next.y),
          width: 4,
          color: lineColor,
          opacity: 0.7
        })
        
        // Second wave (thicker, with offset)
        const offset1 = Math.sin(k.time() * 5 + i * 0.3) * 5
        k.drawLine({
          p1: k.vec2(current.x, current.y + offset1),
          p2: k.vec2(next.x, next.y + offset1),
          width: 2,
          color: lineColor,
          opacity: 0.4
        })
        
        // Third wave (thin, with different offset)
        const offset2 = Math.sin(k.time() * 7 + i * 0.6) * 8
        k.drawLine({
          p1: k.vec2(current.x, current.y + offset2),
          p2: k.vec2(next.x, next.y + offset2),
          width: 1,
          color: lineColor,
          opacity: 0.3
        })
      }
      
      // Draw glitches in orange palette
      for (const glitch of glitches) {
        const isLeft = glitch.side === "left"
        // Glitches: different orange shades
        const colorType = k.rand(0, 3)
        const glitchColor = colorType < 1 
          ? k.rgb(255, 165, 0)     // Orange
          : colorType < 2 
          ? k.rgb(255, 140, 0)     // Dark orange
          : k.rgb(255, 200, 100)   // Light orange
        
        k.drawRect({
          pos: k.vec2(glitch.x, glitch.y),
          width: glitch.width,
          height: glitch.height,
          color: glitchColor,
          opacity: 0.3 + k.rand(0, 0.3)
        })
      }
      
      // Dividing line removed - only jerky background segments remain
    })
    
    // Update glitches and animations
    k.onUpdate(() => {
      glitchTimer += k.dt()
      bgShiftTimer += k.dt()
      boundaryRotationTimer += k.dt()
      
      // Create new glitches
      if (glitchTimer > 0.1) {
        if (k.rand(0, 1) > 0.7) {
          glitches.push(createGlitch())
        }
        glitchTimer = 0
      }
      
      // Remove old glitches
      glitches = glitches.filter(g => {
        g.age += k.dt()
        return g.age < g.lifetime
      })
      
      // Random background shift left-right
      if (bgShiftTimer > k.rand(0.3, 1.5)) {
        // Strong glitch - rare, large shift
        if (k.rand(0, 1) > 0.85) {
          targetBgShift = k.rand(-150, 150)
        } 
        // Medium glitch
        else if (k.rand(0, 1) > 0.6) {
          targetBgShift = k.rand(-60, 60)
        }
        // Weak glitch - frequent, small shift
        else {
          targetBgShift = k.rand(-25, 25)
        }
        bgShiftTimer = 0
      }
      
      // Smooth rotation of vertical boundary
      if (boundaryRotationTimer > k.rand(3, 6)) {
        // Sometimes rotate boundary
        if (k.rand(0, 1) > 0.3) {
          // Random angle in radians (±15 degrees)
          targetBoundaryRotation = k.rand(-0.26, 0.26)
        } else {
          // Return to vertical
          targetBoundaryRotation = 0
        }
        boundaryRotationTimer = 0
      }
    })
    
    // Left hero (normal - yellow) - start with center gaze
    const leftHero = k.add([
      k.sprite("hero_0_0"),
      k.pos(centerX * 0.5, centerY),
      k.anchor("center"),
      k.scale(3),
      k.opacity(1),
      k.z(10), // Draw over line
      {
        baseX: centerX * 0.5,
        baseY: centerY,
        glitchOffsetX: 0,
        glitchOffsetY: 0,
      }
    ])
    
    // Right hero (anti-version - black) - start with center gaze
    const rightHero = k.add([
      k.sprite("antihero_0_0"),
      k.pos(centerX * 1.5, centerY),
      k.anchor("center"),
      k.scale(3),
      k.opacity(1),
      k.z(10), // Draw over line
      {
        baseX: centerX * 1.5,
        baseY: centerY,
        glitchOffsetX: 0,
        glitchOffsetY: 0,
      }
    ])
    
    // Hero animation - smooth movement in random directions
    k.onUpdate(() => {
      // Independent left hero movement
      leftHeroTimer += k.dt()
      if (leftHeroTimer > k.rand(1.5, 2.5)) { // New target every 1.5-2.5 seconds
        leftHeroTargetX = k.rand(-100, 100)
        leftHeroTargetY = k.rand(-100, 100)
        leftHeroTimer = 0
      }
      
      // Independent right hero movement
      rightHeroTimer += k.dt()
      if (rightHeroTimer > k.rand(1.5, 2.5)) { // New target every 1.5-2.5 seconds
        rightHeroTargetX = k.rand(-100, 100)
        rightHeroTargetY = k.rand(-100, 100)
        rightHeroTimer = 0
      }
      
      // Smoothly move to target positions
      leftHero.glitchOffsetX = k.lerp(leftHero.glitchOffsetX, leftHeroTargetX, 0.02)
      leftHero.glitchOffsetY = k.lerp(leftHero.glitchOffsetY, leftHeroTargetY, 0.02)
      
      rightHero.glitchOffsetX = k.lerp(rightHero.glitchOffsetX, rightHeroTargetX, 0.02)
      rightHero.glitchOffsetY = k.lerp(rightHero.glitchOffsetY, rightHeroTargetY, 0.02)
      
      // Heroes fully opaque
      leftHero.opacity = 1
      rightHero.opacity = 1
      
      const wave = Math.sin(k.time() * 2) * 10
      leftHero.pos.y = centerY + wave + leftHero.glitchOffsetY
      leftHero.pos.x = leftHero.baseX + leftHero.glitchOffsetX
      rightHero.pos.y = centerY - wave + rightHero.glitchOffsetY
      rightHero.pos.x = rightHero.baseX + rightHero.glitchOffsetX
      
      // Eye animation - smooth movement
      eyeTimer += k.dt()
      
      // Choose new target position every 1.5-3.5 seconds
      if (eyeTimer > k.rand(1.5, 3.5)) {
        targetEyeX = k.choose([-1, 0, 1])
        targetEyeY = k.choose([-1, 0, 1])
        eyeTimer = 0
      }
      
      // Smoothly interpolate to target position
      eyeOffsetX = k.lerp(eyeOffsetX, targetEyeX, 0.1)
      eyeOffsetY = k.lerp(eyeOffsetY, targetEyeY, 0.1)
      
      // Round for pixel-art style
      const roundedX = Math.round(eyeOffsetX)
      const roundedY = Math.round(eyeOffsetY)
      
      // Switch to preloaded sprite
      const heroSpriteName = `hero_${roundedX}_${roundedY}`
      const antiHeroSpriteName = `antihero_${roundedX}_${roundedY}`
      
      // Save current sprite for change detection
      if (!leftHero.currentEyeSprite || leftHero.currentEyeSprite !== heroSpriteName) {
        leftHero.use(k.sprite(heroSpriteName))
        leftHero.currentEyeSprite = heroSpriteName
      }
      if (!rightHero.currentEyeSprite || rightHero.currentEyeSprite !== antiHeroSpriteName) {
        rightHero.use(k.sprite(antiHeroSpriteName))
        rightHero.currentEyeSprite = antiHeroSpriteName
      }
    })
    
    // Game title with glitch effects
    const titleLetters = "FIND YOU".split("")
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
    
    // Glitch effects for title (more inertial)
    k.onUpdate(() => {
      titleGlitchTimer += k.dt()
      
      if (titleGlitchTimer > 0.08) { // Update less frequently for more inertia
        titleObjects.forEach((obj, i) => {
          // Soft random shifts
          if (k.rand(0, 1) > 0.92) { // Rare glitches (8% chance)
            obj.glitchOffsetX = k.rand(-5, 5) // Smaller amplitude
            obj.glitchOffsetY = k.rand(-3, 3)
          } else {
            // Smooth fade
            obj.glitchOffsetX *= 0.9
            obj.glitchOffsetY *= 0.9
          }
          
          // Smooth movement to target position
          obj.pos.x = k.lerp(obj.pos.x, obj.baseX + obj.glitchOffsetX, 0.15)
          obj.pos.y = k.lerp(obj.pos.y, obj.baseY + obj.glitchOffsetY, 0.15)
          
          // Rare color change - orange palette
          if (k.rand(0, 1) > 0.97) { // Less frequent color change
            const colors = [
              k.rgb(255, 140, 0),   // Dark orange (main)
              k.rgb(255, 165, 0),   // Orange
              k.rgb(62, 39, 35),    // Dark brown background
              k.rgb(255, 100, 50),  // Red-orange accent
              k.rgb(255, 218, 185), // Light peach
              k.rgb(255, 200, 100), // Light orange
            ]
            obj.color = k.choose(colors)
          }
          
          // Soft flicker
          if (k.rand(0, 1) > 0.95) { // Rare flicker (5% chance)
            obj.opacity = k.rand(0.6, 1) // Smaller range
          } else {
            obj.opacity = k.lerp(obj.opacity, 1, 0.08)
          }
          
          // Very rare size change
          if (k.rand(0, 1) > 0.98) {
            obj.scale = k.vec2(k.rand(0.9, 1.2), k.rand(0.9, 1.2)) // Smaller range
          } else {
            if (obj.scale) {
              obj.scale = k.lerp(obj.scale, k.vec2(1, 1), 0.15)
            }
          }
        })
        
        titleGlitchTimer = 0
      }
      
      // Smooth wave across all letters
      titleObjects.forEach((obj, i) => {
        obj.pos.y = obj.baseY + obj.glitchOffsetY + Math.sin(k.time() * 2 + i * 0.3) * 5
      })
    })
    
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
    const muteText = k.add([
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
    
    // Transition to game (use config)
    CONFIG.controls.startGame.forEach(key => {
      k.onKeyPress(key, () => {
        Sound.stopAmbient(sound)
        k.go("level1")
      })
    })
    
    // Music control (use config)
    CONFIG.controls.toggleMute.forEach(key => {
      k.onKeyPress(key, async () => {
        const isPlaying = Sound.isAmbientPlaying(sound)
        
        // Toggle volume
        if (sound.ambientMasterGain) {
          const currentVolume = sound.ambientMasterGain.gain.value
          if (isPlaying && currentVolume > 0.01) {
            Sound.setAmbientVolume(sound, 0)
          } else {
            Sound.setAmbientVolume(sound, CONFIG.audio.ambient.masterVolume)
            Sound.resumeAudioContext(sound)
          }
        }
      })
    })
    
    // Stop music when leaving scene
    k.onSceneLeave(() => {
      Sound.stopAmbient(sound)
    })
  })
}
