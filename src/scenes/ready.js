import { CFG } from '../cfg.js'
import { getColor } from '../utils/helper.js'
import { addBackground } from '../sections/word/utils/scene.js'
import * as Sound from '../utils/sound.js'
import * as Particles from '../utils/particles.js'

const LINE_APPEAR_DELAY = 1.5
const LINE_FADE_IN_DURATION = 0.8
const FLICKER_FADE_DURATION = 1.2
const FLICKER_MIN_OPACITY = 0.4
const FLICKER_MAX_OPACITY = 0.75
const FLICKER_CYCLES_BEFORE_FADE = 3  // Number of flicker cycles before fading out
const FINAL_FADE_OUT_DURATION = 2.0   // Duration of final fade to zero (seconds)

//
// Track if ready scene was visited before (session-based, not persistent)
//
let readySceneVisited = false

export function sceneReady(k) {
  k.scene("ready", () => {
    const centerX = k.width() / 2
    const centerY = k.height() / 2
    
    //
    // Check if this is first visit
    //
    const isFirstVisit = !readySceneVisited
    readySceneVisited = true
    
    //
    // Hide cursor on first visit, show it after 4 seconds
    //
    let isCursorVisible = !isFirstVisit  // Track cursor visibility
    let cursorWaitHandle = null  // Store wait handle to cancel it
    
    //
    // Function to show cursor immediately
    //
    const showCursor = () => {
      if (!isCursorVisible) {
        k.canvas.style.removeProperty('cursor')  // Remove inline style to restore CSS cursor
        isCursorVisible = true
        if (cursorWaitHandle) {
          cursorWaitHandle.cancel()
          cursorWaitHandle = null
        }
      }
    }
    
    if (isFirstVisit) {
      k.canvas.style.cursor = "none"
      cursorWaitHandle = k.wait(4, () => {
        showCursor()
      })
    }
    
    //
    // Create sound instance
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    
    //
    // Draw background
    //
    addBackground(k, CFG.colors.ready.background)
    
    //
    // No static title - it will be made of fireflies
    //
    
    //
    // Story text
    //
    const storyLines = [
      "You’ll die. Many times.",
      "You’ll fall for lies.",
      "You’ll doubt every step.",
      "",
      "But each time you break apart -",
      "you’ll find a missing piece of who you are.",
    ]
    
    const lineHeight = 34
    const startY = centerY - (storyLines.length * lineHeight) / 2 + 120  // Even lower position (was +80)
    
    //
    // Create title "find myself" from fireflies
    //
    const titleY = startY / 2 - 40  // Higher position (was startY / 2)
    const titleText = "find myself"
    const titleFontSize = 140  // Slightly smaller font (was 160)
    
    //
    // Calculate positions for each letter using canvas measurement
    //
    const titleParticles = []
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    //
    // Set canvas size with padding
    //
    const padding = 20
    const letterSpacing = 12  // Additional spacing between letters
    const horizontalScale = 1.15  // Stretch horizontally by 15%
    ctx.font = `bold ${titleFontSize}px monospace`
    
    //
    // Calculate total width with letter spacing and horizontal scale
    //
    let totalWidth = 0
    for (let i = 0; i < titleText.length; i++) {
      const charWidth = ctx.measureText(titleText[i]).width * horizontalScale
      totalWidth += charWidth
      if (i < titleText.length - 1) {
        totalWidth += letterSpacing
      }
    }
    
    canvas.width = totalWidth + padding * 2
    canvas.height = titleFontSize + padding * 2
    
    //
    // Draw text on canvas with letter spacing and horizontal stretch
    //
    ctx.fillStyle = 'white'
    ctx.font = `bold ${titleFontSize}px monospace`
    ctx.textBaseline = 'top'
    
    let currentX = padding
    for (let i = 0; i < titleText.length; i++) {
      //
      // Apply horizontal scale for stretched letters
      //
      ctx.save()
      ctx.translate(currentX, padding)
      ctx.scale(horizontalScale, 1)
      ctx.fillText(titleText[i], 0, 0)
      ctx.restore()
      
      const charWidth = ctx.measureText(titleText[i]).width * horizontalScale
      currentX += charWidth + letterSpacing
    }
    
    //
    // Get pixel data
    //
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data
    
    //
    // Sample pixels and create particles on letter edges (contours)
    // with minimum distance constraint for even distribution
    //
    const samplingProbability = 0.397  // Higher probability (+30% from 0.305)
    const minDistance = 4.8  // Minimum distance between particles (reduced for +20% more density)
    const startX = centerX - totalWidth / 2
    
    //
    // Helper function to check if pixel is on edge (has transparent neighbors)
    //
    const isEdgePixel = (x, y, pixels, width, height) => {
      const getAlpha = (px, py) => {
        if (px < 0 || px >= width || py < 0 || py >= height) return 0
        return pixels[(py * width + px) * 4 + 3]
      }
      
      //
      // Check all 8 neighbors
      //
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          if (getAlpha(x + dx, y + dy) < 128) {
            return true  // Has at least one transparent neighbor
          }
        }
      }
      return false
    }
    
    //
    // Helper function to check if position is far enough from existing particles
    //
    const isFarEnough = (x, y, existingParticles, minDist) => {
      const minDistSq = minDist * minDist
      for (let i = 0; i < existingParticles.length; i++) {
        const dx = existingParticles[i].x - x
        const dy = existingParticles[i].y - y
        if (dx * dx + dy * dy < minDistSq) {
          return false
        }
      }
      return true
    }
    
    //
    // Collect all edge pixels first
    //
    const edgePixels = []
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4
        const alpha = pixels[index + 3]
        
        if (alpha > 128 && isEdgePixel(x, y, pixels, canvas.width, canvas.height)) {
          edgePixels.push({ x, y })
        }
      }
    }
    
    //
    // Shuffle edge pixels for random sampling
    //
    for (let i = edgePixels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = edgePixels[i]
      edgePixels[i] = edgePixels[j]
      edgePixels[j] = temp
    }
    
    //
    // Sample particles with minimum distance constraint
    //
    const tempParticles = []
    for (let i = 0; i < edgePixels.length; i++) {
      const pixel = edgePixels[i]
      
      if (Math.random() < samplingProbability && isFarEnough(pixel.x, pixel.y, tempParticles, minDistance)) {
        tempParticles.push(pixel)
        titleParticles.push({
          targetX: startX + pixel.x - padding,
          targetY: titleY + pixel.y - padding,
        })
      }
    }
    
    //
    // Use ALL particles for title only (no text area particles)
    //
    const allParticlePositions = []
    
    //
    // Add title particles
    //
    titleParticles.forEach(p => {
      allParticlePositions.push({ x: p.targetX, y: p.targetY })
    })
    
    //
    // Create custom particle system with predefined positions
    // Use null bounds for unlimited flee behavior
    //
    const particleSystem = {
      k,
      particles: [],
      color: CFG.colors.ready.fireflies,  // Use fireflies color (hero orange)
      baseOpacity: 0.9,  // Much brighter for clarity (was 0.6)
      flickerSpeed: 2,
      trembleRadius: 0.15,  // Minimal movement for sharp edges (was 0.3)
      trembleRadiusAfterFlee: 8,  // Much larger movement after first flee
      mouseInfluence: 150,
      bounds: null,  // No bounds - particles can fly anywhere
      time: 0,
      isCursorVisible: () => isCursorVisible,  // Function to check cursor visibility
      autoScatterTimer: null,  // Timer for automatic scatter
      autoScatterTriggered: false  // Flag to prevent multiple triggers
    }
    
    //
    // Create particles at predefined positions
    //
    allParticlePositions.forEach(pos => {
      particleSystem.particles.push({
        baseX: pos.x,
        baseY: pos.y,
        x: pos.x,
        y: pos.y,
        flickerPhase: Math.random() * Math.PI * 2,
        tremblePhase: Math.random() * Math.PI * 2,
        trembleSpeed: 0.8 + Math.random() * 0.4,  // Random speed multiplier (0.8-1.2)
        fleeSpeed: 0.7 + Math.random() * 0.6,     // Random flee speed multiplier (0.7-1.3)
        opacity: 0.4,
        isFleeing: false,
        fleeStartX: pos.x,
        fleeStartY: pos.y,
        fleeTargetX: pos.x,
        fleeTargetY: pos.y,
        fleeProgress: 0,
        justLanded: false,
        landedTimer: 0,
        floatFadeIn: 0,
        hasEverFled: false  // Track if particle has fled at least once
      })
    })
    
    const textObjects = []
    
    //
    // Create all text objects initially hidden
    //
    storyLines.forEach((line, index) => {
      const textObj = k.add([
        k.text(line, { size: 26, align: "center" }),
        k.pos(centerX, startY + index * lineHeight),
        k.anchor("center"),
        getColor(k, CFG.colors.ready.text),
        k.opacity(0)
      ])
      
      //
      // Add flicker state for each line
      //
      textObj.flickerTime = FLICKER_FADE_DURATION  // Start at max opacity
      textObj.flickerDirection = -1  // Start going down
      textObj.isVisible = false
      textObj.fadeInProgress = 0
      textObj.isFadingIn = false
      textObj.allLinesAppeared = false
      textObj.flickerCycleCount = 0  // Track number of complete flicker cycles
      textObj.isFinalFading = false  // Final fade out to zero
      textObj.finalFadeProgress = 1.0  // 1.0 = visible, 0.0 = invisible
      
      textObjects.push(textObj)
    })
    
    //
    // Hint at bottom (initially hidden)
    //
    const hint = k.add([
      k.text('Space or Enter - start, touch the light — and see what fades', { size: 20 }),
      k.pos(centerX, 1030),  // Fixed: same as menu, k.height() - 50 = 1030
      k.anchor("center"),
      getColor(k, CFG.colors.ready.hint),
      k.opacity(0)
    ])
    
    //
    // Hint state
    //
    hint.isVisible = false
    hint.isFadingIn = false
    hint.fadeInProgress = 0
    hint.allLinesAppeared = false
    
    //
    // Flicker effect for hint (slow fade in/out)
    //
    let hintFlickerTime = FLICKER_FADE_DURATION  // Start at max opacity
    let hintDirection = -1  // Start going down
    
    //
    // Sequentially reveal lines
    //
    let currentLineIndex = 0
    let allLinesRevealed = false
    const waitHandles = []
    
    const skipToEnd = () => {
      //
      // Cancel all pending waits
      //
      waitHandles.forEach(handle => handle.cancel())
      waitHandles.length = 0
      
      //
      // Show all lines instantly
      //
      textObjects.forEach((textObj, index) => {
        if (storyLines[index] !== "") {
          textObj.isVisible = true
          textObj.isFadingIn = false
          textObj.fadeInProgress = 1.0
          textObj.opacity = FLICKER_MAX_OPACITY  // Use max flicker opacity (0.75)
          textObj.allLinesAppeared = true
          textObj.flickerCycleCount = 0
          textObj.isFinalFading = false
          textObj.finalFadeProgress = 1.0
          //
          // Initialize flicker state at max opacity
          //
          textObj.flickerTime = FLICKER_FADE_DURATION
          textObj.flickerDirection = -1
        }
      })
      
      //
      // Show hint
      //
      hint.isVisible = true
      hint.isFadingIn = false
      hint.fadeInProgress = 1.0
      hint.opacity = 1.0
      hint.allLinesAppeared = true
      
      //
      // Initialize hint flicker state at max opacity
      //
      hintFlickerTime = FLICKER_FADE_DURATION
      hintDirection = -1
      
      allLinesRevealed = true
    }
    
    const revealNextLine = () => {
      if (currentLineIndex >= storyLines.length) {
        //
        // All story lines appeared - now show hint
        //
        textObjects.forEach(textObj => {
          textObj.allLinesAppeared = true
        })
        
        //
        // Wait for last story line to finish fading in, then show hint
        //
        const hintWait = k.wait(LINE_FADE_IN_DURATION, () => {
          hint.isVisible = true
          hint.isFadingIn = true
          hint.fadeInProgress = 0
          allLinesRevealed = true
        })
        waitHandles.push(hintWait)
        
        return
      }
      
      const textObj = textObjects[currentLineIndex]
      
      //
      // Skip empty lines (appear instantly)
      //
      if (storyLines[currentLineIndex] === "") {
        textObj.opacity = 0
        textObj.isVisible = false
        currentLineIndex++
        revealNextLine()
        return
      }
      
      //
      // Start fade in
      //
      textObj.isVisible = true
      textObj.isFadingIn = true
      textObj.fadeInProgress = 0
      
      currentLineIndex++
      
      //
      // Schedule next line
      //
      if (currentLineIndex < storyLines.length) {
        const waitHandle = k.wait(LINE_APPEAR_DELAY, revealNextLine)
        waitHandles.push(waitHandle)
      } else {
        //
        // Last story line started fading in - now schedule hint reveal
        //
        const waitHandle = k.wait(LINE_APPEAR_DELAY, revealNextLine)
        waitHandles.push(waitHandle)
      }
    }
    
    //
    // Start revealing lines
    //
    if (isFirstVisit) {
      //
      // First visit - show lines one by one with 1 second initial delay
      //
      const initialWait = k.wait(1, () => {
        revealNextLine()
      })
      waitHandles.push(initialWait)
    } else {
      //
      // Return visit - show everything instantly
      //
      skipToEnd()
    }
    
    //
    // Fade-in and flicker effect for text lines
    //
    k.onUpdate(() => {
      textObjects.forEach(textObj => {
        if (!textObj.isVisible) return
        
        //
        // Fade in animation
        //
        if (textObj.isFadingIn) {
          textObj.fadeInProgress += k.dt() / LINE_FADE_IN_DURATION
          
          if (textObj.fadeInProgress >= 1.0) {
            textObj.fadeInProgress = 1.0
            textObj.isFadingIn = false
          }
          
          //
          // Fade to FLICKER_MAX_OPACITY instead of 1.0
          //
          textObj.opacity = textObj.fadeInProgress * FLICKER_MAX_OPACITY
          return
        }
        
        //
        // Flicker effect (after all lines appeared)
        //
        if (textObj.allLinesAppeared) {
          //
          // Final fade out to zero
          //
          if (textObj.isFinalFading) {
            textObj.finalFadeProgress -= k.dt() / FINAL_FADE_OUT_DURATION
            if (textObj.finalFadeProgress <= 0) {
              textObj.finalFadeProgress = 0
              textObj.opacity = 0
              
              //
              // Check if all lines have faded out and start auto-scatter timer
              //
              const allLinesFaded = textObjects.every(obj => 
                storyLines[textObjects.indexOf(obj)] === "" || obj.finalFadeProgress <= 0
              )
              
              if (allLinesFaded && !particleSystem.autoScatterTriggered) {
                particleSystem.autoScatterTriggered = true
                //
                // Wait 4 seconds then trigger automatic scatter
                //
                particleSystem.autoScatterTimer = k.wait(4, () => {
                  //
                  // Trigger flee for all particles in random directions
                  //
                  particleSystem.particles.forEach(particle => {
                    if (!particle.isFleeing) {
                      particle.isFleeing = true
                      particle.isAutoFleeing = true  // Mark as automatic flee (slower)
                      particle.fleeProgress = 0
                      particle.fleeStartX = particle.x
                      particle.fleeStartY = particle.y
                      particle.hasEverFled = true
                      
                      //
                      // Random direction
                      //
                      const randomAngle = Math.random() * Math.PI * 2
                      const dirX = Math.cos(randomAngle)
                      const dirY = Math.sin(randomAngle)
                      
                      //
                      // Random distance
                      //
                      const fleeDistance = 100 + Math.random() * 150
                      particle.fleeTargetX = particle.x + dirX * fleeDistance
                      particle.fleeTargetY = particle.y + dirY * fleeDistance
                    }
                  })
                })
              }
            } else {
              //
              // Continue flicker during fade out
              //
              textObj.flickerTime += k.dt() * textObj.flickerDirection
              
              if (textObj.flickerTime >= FLICKER_FADE_DURATION) {
                textObj.flickerDirection = -1
                textObj.flickerTime = FLICKER_FADE_DURATION
              } else if (textObj.flickerTime <= 0) {
                textObj.flickerDirection = 1
                textObj.flickerTime = 0
              }
              
              const progress = textObj.flickerTime / FLICKER_FADE_DURATION
              const flickerOpacity = FLICKER_MIN_OPACITY + (FLICKER_MAX_OPACITY - FLICKER_MIN_OPACITY) * progress
              textObj.opacity = flickerOpacity * textObj.finalFadeProgress
            }
          } else {
            //
            // Normal flicker
            //
            textObj.flickerTime += k.dt() * textObj.flickerDirection
            
            //
            // Reverse direction at bounds and count cycles
            //
            if (textObj.flickerTime >= FLICKER_FADE_DURATION) {
              textObj.flickerDirection = -1
              textObj.flickerTime = FLICKER_FADE_DURATION
            } else if (textObj.flickerTime <= 0) {
              textObj.flickerDirection = 1
              textObj.flickerTime = 0
              //
              // Increment cycle count when reaching bottom
              //
              textObj.flickerCycleCount++
              
              //
              // Start final fade after N cycles
              //
              if (textObj.flickerCycleCount >= FLICKER_CYCLES_BEFORE_FADE) {
                textObj.isFinalFading = true
              }
            }
            
            //
            // Interpolate opacity between min and max
            //
            const progress = textObj.flickerTime / FLICKER_FADE_DURATION
            textObj.opacity = FLICKER_MIN_OPACITY + (FLICKER_MAX_OPACITY - FLICKER_MIN_OPACITY) * progress
          }
        }
      })
    })
    
    //
    // Update particles
    //
    k.onUpdate(() => {
      Particles.onUpdate(particleSystem)
    })
    
    //
    // Draw particles
    //
    k.onDraw(() => {
      Particles.draw(particleSystem)
    })
    
    //
    // Hint flicker update loop
    //
    k.onUpdate(() => {
      //
      // Fade in animation
      //
      if (hint.isFadingIn) {
        hint.fadeInProgress += k.dt() / LINE_FADE_IN_DURATION
        
        if (hint.fadeInProgress >= 1.0) {
          hint.fadeInProgress = 1.0
          hint.isFadingIn = false
          hint.allLinesAppeared = true
        }
        
        hint.opacity = hint.fadeInProgress
        return
      }
      
      //
      // Flicker effect (after fade in complete)
      //
      if (hint.allLinesAppeared) {
        hintFlickerTime += k.dt() * hintDirection
        
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
        hint.opacity = FLICKER_MIN_OPACITY + (FLICKER_MAX_OPACITY - FLICKER_MIN_OPACITY) * progress
      }
    })
    
    //
    // Press space/enter to start or skip
    //
    CFG.controls.startGame.forEach(key => {
      k.onKeyPress(key, () => {
        //
        // Show cursor immediately if it was hidden
        //
        showCursor()
        
        //
        // If not all lines revealed yet - skip to end
        //
        if (!allLinesRevealed) {
          skipToEnd()
          return
        }
        
        //
        // Otherwise go to menu
        //
        Sound.stopAmbient(sound)
        k.go("menu")
      })
    })
    
    //
    // Click anywhere to start or skip
    //
    k.onClick(() => {
      //
      // Show cursor immediately if it was hidden
      //
      showCursor()
      
      //
      // If not all lines revealed yet - skip to end
      //
      if (!allLinesRevealed) {
        skipToEnd()
        return
      }
      
      //
      // Otherwise go to menu
      //
      Sound.stopAmbient(sound)
      k.go("menu")
    })
  })
}