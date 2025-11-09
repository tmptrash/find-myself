import { CFG } from '../cfg.js'
import { getColor } from '../utils/helper.js'
import { addBackground } from '../sections/word/utils/scene.js'
import * as Sound from '../utils/sound.js'
import * as Particles from '../utils/particles.js'

const LINE_APPEAR_DELAY = 1.5
const LINE_FADE_IN_DURATION = 0.8
const FLICKER_FADE_DURATION = 1.2
const FLICKER_MIN_OPACITY = 0.5
const FLICKER_MAX_OPACITY = 1.0

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
    // Create sound instance
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    
    //
    // Draw background
    //
    addBackground(k, CFG.colors.ready.background)
    
    //
    // Title
    //
    const title = k.add([
      k.text("find myself", { size: 64 }),
      k.pos(centerX, 100),
      k.anchor("center"),
      getColor(k, CFG.colors.ready.title),
    ])
    
    //
    // Flicker effect for title (slow fade in/out)
    //
    let titleFlickerTime = FLICKER_FADE_DURATION  // Start at max opacity
    let titleDirection = -1  // Start going down
    
    k.onUpdate(() => {
      titleFlickerTime += k.dt() * titleDirection
      
      //
      // Reverse direction at bounds
      //
      if (titleFlickerTime >= FLICKER_FADE_DURATION) {
        titleDirection = -1
        titleFlickerTime = FLICKER_FADE_DURATION
      } else if (titleFlickerTime <= 0) {
        titleDirection = 1
        titleFlickerTime = 0
      }
      
      //
      // Interpolate opacity between min and max
      //
      const progress = titleFlickerTime / FLICKER_FADE_DURATION
      title.opacity = FLICKER_MIN_OPACITY + (FLICKER_MAX_OPACITY - FLICKER_MIN_OPACITY) * progress
    })
    
    //
    // Story text
    //
    const storyLines = [
      "You'll die. Many times.",
      "You'll fall for lies.",
      "You'll doubt every step.",
      "",
      "",
      "But each time you fall —",
      "you'll remember a little more.",
    ]
    
    const lineHeight = 34
    const startY = centerY - (storyLines.length * lineHeight) / 2 + 20
    
    //
    // Calculate bounds for particles (around story text)
    //
    const textBoundsMargin = 200
    const textBounds = {
      x: centerX - 400,
      y: startY - textBoundsMargin,
      width: 800,
      height: (storyLines.length * lineHeight) + textBoundsMargin * 2
    }
    
    //
    // Create particles around text
    //
    const particleSystem = Particles.create({
      k,
      particleCount: 100,
      color: CFG.colors.ready.text,
      baseOpacity: 0.4,
      flickerSpeed: 2,
      trembleRadius: 3,
      mouseInfluence: 150,
      bounds: textBounds
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
      
      textObjects.push(textObj)
    })
    
    //
    // Hint at bottom (initially hidden)
    //
    const hint = k.add([
      k.text('Space or Enter - start', { size: 20 }),
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
          textObj.opacity = 1.0
          textObj.allLinesAppeared = true
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
      // First visit - show lines one by one
      //
      revealNextLine()
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
          
          textObj.opacity = textObj.fadeInProgress
          return
        }
        
        //
        // Flicker effect (after all lines appeared)
        //
        if (textObj.allLinesAppeared) {
          textObj.flickerTime += k.dt() * textObj.flickerDirection
          
          //
          // Reverse direction at bounds
          //
          if (textObj.flickerTime >= FLICKER_FADE_DURATION) {
            textObj.flickerDirection = -1
            textObj.flickerTime = FLICKER_FADE_DURATION
          } else if (textObj.flickerTime <= 0) {
            textObj.flickerDirection = 1
            textObj.flickerTime = 0
          }
          
          //
          // Interpolate opacity between min and max
          //
          const progress = textObj.flickerTime / FLICKER_FADE_DURATION
          textObj.opacity = FLICKER_MIN_OPACITY + (FLICKER_MAX_OPACITY - FLICKER_MIN_OPACITY) * progress
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