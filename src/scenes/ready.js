import { CFG } from '../cfg.js'
import { getColor } from '../utils/helper.js'
import { addBackground } from '../sections/word/utils/scene.js'
import * as Sound from '../utils/sound.js'
import * as Particles from '../utils/particles.js'

const HINT_FLICKER_DURATION = 1.2
const HINT_MIN_OPACITY = 0.4
const HINT_MAX_OPACITY = 0.75

const TITLE_TEXT = 'find myself'
const QUOTE_PRIMARY_TEXT = 'through death and pain'
const QUOTE_SECONDARY_TEXT = '(c) someone very wise'
const ARROW_TEXT = '↓'

const INSTRUCTIONS_TITLE = `Find Myself`
const INSTRUCTIONS_TEXT_LINES = [
  { text: 'is a game about discovering who you are while life keeps changing', normal: true },
  { text: 'your plans. Here, life is the one setting traps. It shifts the ground,', normal: true },
  { text: 'twists logic, and pushes you into mistakes — not to harm you, but to', normal: true },
  { text: 'teach you.', normal: true },
  { text: '', normal: true },
  { text: 'In each world, you search for another "you" — a reflection shaped by', normal: true },
  { text: 'the very forces you\'re learning to face. Reaching them means meeting', normal: true },
  { text: 'yourself honestly.', normal: true },
  { text: '', normal: true },
  { text: 'Life will confuse you. You will fall. ', normal: true, inline: true },
  { text: 'But each fall brings you', important: true, sameLine: true },
  { text: 'closer to who you truly are.', important: true }
]

const DENSITY_MULTIPLIER = 1.2

const TITLE_FONT_FAMILY = "'JetBrains Mono', monospace"
const QUOTE_FONT_FAMILY = "'JetBrains Mono Thin', 'JetBrains Mono', monospace"

const TITLE_FONT_SIZE = 140
const QUOTE_PRIMARY_FONT_SIZE = 70
const QUOTE_SECONDARY_FONT_SIZE = 70
const INSTRUCTIONS_FONT_SIZE = 34
const INSTRUCTIONS_LINE_HEIGHT = 40
const ARROW_FONT_SIZE = 240

const TITLE_HOLD_DURATION = 2
const QUOTE_PRIMARY_HOLD_DURATION = 2.5
const QUOTE_SECONDARY_HOLD_DURATION = 2.5
const INSTRUCTIONS_HOLD_DURATION = 60
const INSTRUCTIONS_FADE_DURATION = 1.5

const LAYOUT_HORIZONTAL_MARGIN = 180

const TREMOR_FORMATION = 0.05
const TREMOR_FREE = 8
const GATHER_SPEED = 0.55
const SCATTER_DISTANCE_MIN = 95
const SCATTER_DISTANCE_MAX = 160

//
// Spider configuration
//
const SPIDER_LEG_LENGTH_1 = 22  // First segment length
const SPIDER_LEG_LENGTH_2 = 28  // Second segment length
const SPIDER_SPEED = 60
const SPIDER_DIRECTION_CHANGE_INTERVAL = 5.0
const SPIDER_SCREEN_MARGIN = 80
const SPIDER_SMOOTHING = 2.0
const SPIDER_APPEAR_DELAY = 2.0    // Seconds before spiders start appearing
const SPIDER_FADE_DURATION = 11.0  // Seconds to fade in
const SPIDER_MAX_OPACITY = 0.45    // Maximum opacity when fully visible
const SPIDER_STEP_DISTANCE = 40    // Distance before leg takes a step
//
// Title flicker configuration
//
const TITLE_FLICKER_SPEED = 1.5
const TITLE_FLICKER_MIN = 0.7
const TITLE_FLICKER_MAX = 1.0

const HINT_Y = 1030

export function sceneReady(k) {
  k.scene('ready', () => {
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
    // Reset cursor to invisible state for this scene
    //
    k.canvas.classList.remove('cursor-pointer')
    k.canvas.style.cursor = 'none'
    
    const centerX = k.width() / 2
    const centerY = k.height() / 2
    
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    
    addBackground(k, CFG.visual.colors.ready.background)
    
    //
    // Hint text (visible immediately)
    //
    const hintOutlineOffsets = [
      { dx: -2, dy: 0 },
      { dx: 2, dy: 0 },
      { dx: 0, dy: -2 },
      { dx: 0, dy: 2 },
      { dx: -1, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: 1, dy: 1 }
    ]
    
    const hintOutlines = []
    hintOutlineOffsets.forEach(({ dx, dy }) => {
      const outline = k.add([
        k.text('press Space, Enter or click to start', { size: 20 }),
        k.pos(centerX + dx, HINT_Y + dy),
        k.anchor('center'),
        k.color(0, 0, 0),
        k.opacity(1),
        k.z(99)
      ])
      hintOutlines.push(outline)
    })
    
    const hint = k.add([
      k.text('press Space, Enter or click to start', { size: 20 }),
      k.pos(centerX, HINT_Y),
      k.anchor('center'),
      getColor(k, CFG.visual.colors.ready.hint),
      k.opacity(1),
      k.z(100)
    ])
    
    let hintFlickerTime = HINT_FLICKER_DURATION
    let hintDirection = -1
    let titleFlickerPhase = 0  // Phase for title flicker animation
    let titleBaseOpacity = 0   // Stores the base opacity from tween
    
    //
    // Instructions text (shown at start)
    //
    const instructionsTextMargin = 200
    const instructionsMaxWidth = k.width() - instructionsTextMargin * 2
    const titleSize = 54
    const lineHeight = INSTRUCTIONS_LINE_HEIGHT
    const titleX = instructionsTextMargin + 50  // Left aligned with margin
    const titleY = 280  // Top position (centered)
    
    //
    // Title "Find Myself" in red (top left)
    //
    const outlineOffsets = [
      [-2, -2], [0, -2], [2, -2],
      [-2, 0],           [2, 0],
      [-2, 2],  [0, 2],  [2, 2]
    ]
    
    const titleOutlines = []
    outlineOffsets.forEach(([dx, dy]) => {
      const outline = k.add([
        k.text(INSTRUCTIONS_TITLE, {
          size: titleSize,
          font: TITLE_FONT_FAMILY
        }),
        k.pos(titleX + dx, titleY + dy),
        k.anchor('left'),
        k.color(0, 0, 0),
        k.opacity(0)
      ])
      titleOutlines.push(outline)
    })
    
    const titleText = k.add([
      k.text(INSTRUCTIONS_TITLE, {
        size: titleSize,
        font: TITLE_FONT_FAMILY
      }),
      k.pos(titleX, titleY),
      k.anchor('left'),
      getColor(k, CFG.visual.colors.ready.title),  // Red #D84C4C
      k.opacity(0)
    ])
    
    //
    // Body text lines with different colors
    //
    const bodyStartY = titleY + 80
    const bodyX = titleX
    const instructionsTextObjects = []
    const instructionsOutlineObjects = []
    
    let currentY = bodyStartY
    let previousLineObj = null
    
    INSTRUCTIONS_TEXT_LINES.forEach((line, index) => {
      //
      // If this line continues on the same line, calculate X offset
      //
      const isSameLine = line.sameLine && previousLineObj
      const x = isSameLine ? previousLineObj.x + previousLineObj.width + 0 : bodyX
      const y = isSameLine ? previousLineObj.y : currentY
      
      const textColor = line.important
        ? CFG.visual.colors.ready.emphasis  // Almost white for important lines
        : CFG.visual.colors.ready.text      // Muted blue for normal lines
      //
      // Create outlines for this line
      //
      const lineOutlines = []
      outlineOffsets.forEach(([dx, dy]) => {
        const outline = k.add([
          k.text(line.text, {
            size: INSTRUCTIONS_FONT_SIZE,
            font: QUOTE_FONT_FAMILY
          }),
          k.pos(x + dx, y + dy),
          k.anchor('left'),
          k.color(0, 0, 0),
          k.opacity(0)
        ])
        instructionsOutlineObjects.push(outline)
        lineOutlines.push(outline)
      })
      //
      // Create main text for this line
      //
      const textObj = k.add([
        k.text(line.text, {
          size: INSTRUCTIONS_FONT_SIZE,
          font: QUOTE_FONT_FAMILY
        }),
        k.pos(x, y),
        k.anchor('left'),
        getColor(k, textColor),
        k.opacity(0)
      ])
      //
      // Store reference to outlines in textObj
      //
      textObj.outlines = lineOutlines
      instructionsTextObjects.push(textObj)
      
      //
      // Update Y position for next line (only if not inline continuation)
      //
      if (!isSameLine) {
        currentY += lineHeight
      }
      
      //
      // Store reference for next line if this is inline
      //
      if (line.inline) {
        previousLineObj = { x, y, width: textObj.width }
      } else {
        previousLineObj = null
      }
    })
    
    //
    // Store all text objects for fade animations
    //
    const instructionsText = instructionsTextObjects[0]  // Reference for compatibility
    const instructionsOutlines = instructionsOutlineObjects
    //
    // Spiders - creatures made from title letters crawling in the background
    // Create spiders from all letters in "Find Myself" title
    //
    const letterInfos = pickLettersFromTitle(k, titleText, INSTRUCTIONS_TITLE, titleSize, TITLE_FONT_FAMILY)
    const spiders = []
    let spiderTimer = 0  // Timer for fade-in delay
    //
    // Wave-based appearance: letters appear in groups, far apart from each other
    // "Find Myself" (without space) = 10 letters (indices 0-9)
    // F(0) i(1) n(2) d(3) M(4) y(5) s(6) e(7) l(8) f(9)
    // Wave 1: indices 0, 4, 8 (F, M, l) - spread far apart
    // Wave 2: indices 2, 5, 9 (n, y, f) - spread far apart
    // Wave 3: indices 1, 6, 7 (i, s, e) - spread far apart
    // Wave 4: index 3 (d) - last one
    //
    const waves = [
      [0, 4, 8],  // Wave 1: F, M, l
      [2, 5, 9],  // Wave 2: n, y, f
      [1, 6, 7],  // Wave 3: i, s, e
      [3]         // Wave 4: d
    ]
    
    const LEG_APPEAR_DURATION = 2.0  // Legs take 2 seconds to appear
    const CRAWL_DURATION = 5.0       // Let them crawl for 5 seconds before next wave
    const WAVE_INTERVAL = LEG_APPEAR_DURATION + CRAWL_DURATION  // 7 seconds between waves
    
    letterInfos.forEach((letterInfo, i) => {
      const spider = createSpider(k, i, letterInfo)
      //
      // Find which wave this letter belongs to
      //
      let waveIndex = 0
      for (let w = 0; w < waves.length; w++) {
        if (waves[w].includes(i)) {
          waveIndex = w
          break
        }
      }
      //
      // Set leg appearance delay based on wave
      //
      spider.legAppearDelay = waveIndex * WAVE_INTERVAL + Math.random() * 0.3
      //
      // Store reference to letterInfo and titleOutlines for later use
      //
      spider.letterInfo = letterInfo
      spider.titleOutlines = titleOutlines
      spiders.push(spider)
    })
    
    //
    // Prepare firefly layouts
    //
    const availableWidth = k.width() - LAYOUT_HORIZONTAL_MARGIN * 2
    
    const titleLayout = generateLayout({
      text: TITLE_TEXT,
      fontSize: TITLE_FONT_SIZE,
      centerX,
      centerY,
      fontFamily: TITLE_FONT_FAMILY
    })
    
    const particleSystem = createParticleSystem(k, titleLayout.positions, 0)
    
    //
    // Particles are created hidden (opacity = 0)
    // They will fade in after instructions disappear
    //
    
    const quotePrimaryLayout = generateLayout({
      text: QUOTE_PRIMARY_TEXT,
      fontSize: QUOTE_PRIMARY_FONT_SIZE,
      centerX,
      centerY,
      desiredCount: particleSystem.particles.length,
      maxWidth: availableWidth,
      samplingProbability: 1,
      minDistance: 1.2,
      singlePixelStroke: true,
      fontFamily: QUOTE_FONT_FAMILY,
      morphTargets: particleSystem.layoutPositions
    })
    
    const quoteSecondaryCenterY = centerY
    const quoteSecondaryLayout = generateLayout({
      text: QUOTE_SECONDARY_TEXT,
      fontSize: QUOTE_SECONDARY_FONT_SIZE,
      centerX,
      centerY: quoteSecondaryCenterY,
      desiredCount: particleSystem.particles.length,
      maxWidth: availableWidth,
      samplingProbability: 1,
      minDistance: 1.2,
      singlePixelStroke: true,
      fontFamily: QUOTE_FONT_FAMILY,
      morphTargets: quotePrimaryLayout.positions
    })
    
    //
    // Arrow layout - positioned above hint text
    //
    const arrowCenterY = HINT_Y - 180  // Position arrow higher above hint
    const arrowLayout = generateLayout({
      text: ARROW_TEXT,
      fontSize: ARROW_FONT_SIZE,
      centerX,
      centerY: arrowCenterY,
      desiredCount: particleSystem.particles.length,
      maxWidth: availableWidth,
      samplingProbability: 1,
      minDistance: 1.2,
      singlePixelStroke: true,
      fontFamily: TITLE_FONT_FAMILY,  // Use same font as title
      morphTargets: null  // No morphing - gather from scattered positions
    })

    
    //
    // Scene timeline state
    //
    const PHASES = {
      INSTRUCTIONS_FADE_IN: 'instructionsFadeIn',
      INSTRUCTIONS_HOLD: 'instructionsHold',
      INSTRUCTIONS_FADE_OUT: 'instructionsFadeOut',
      TITLE_HOLD: 'titleHold',
      TITLE_SCATTER: 'titleScatter',
      QUOTE_PRIMARY_GATHER: 'quotePrimaryGather',
      QUOTE_PRIMARY_HOLD: 'quotePrimaryHold',
      QUOTE_PRIMARY_SCATTER: 'quotePrimaryScatter',
      QUOTE_SECONDARY_GATHER: 'quoteSecondaryGather',
      QUOTE_SECONDARY_HOLD: 'quoteSecondaryHold',
      QUOTE_SECONDARY_SCATTER: 'quoteSecondaryScatter',
      ARROW_GATHER: 'arrowGather',
      ARROW_HOLD: 'arrowHold',
      FREE: 'free'
    }
    
    let currentPhase = PHASES.INSTRUCTIONS_FADE_IN
    let phaseTimer = 0
    let particlesFadedIn = false
    let showParticles = false  // Flag to control particle rendering
    let spidersFadingOut = false  // Flag to control spider fade-out
    let spiderFadeOutProgress = 0  // Progress of spider fade-out (0-1)
    
    //
    // Show instructions immediately with fade in
    //
    titleText.opacity = 0
    titleOutlines.forEach(outline => outline.opacity = 0)
    instructionsTextObjects.forEach(obj => obj.opacity = 0)
    instructionsOutlineObjects.forEach(outline => outline.opacity = 0)
    
    k.tween(
      0,
      1,
      INSTRUCTIONS_FADE_DURATION,
      (val) => {
        titleBaseOpacity = val
        titleOutlines.forEach(outline => outline.opacity = val)
        instructionsTextObjects.forEach(obj => obj.opacity = val)
        instructionsOutlineObjects.forEach(outline => outline.opacity = val)
      },
      k.easings.easeOutQuad
    )
    
    const setPhase = phase => {
      currentPhase = phase
      phaseTimer = 0
    }
    
    //
    // Update loop for particles and timeline
    //
    k.onUpdate(() => {
      phaseTimer += k.dt()
      
      switch (currentPhase) {
        case PHASES.INSTRUCTIONS_FADE_IN: {
          if (phaseTimer >= INSTRUCTIONS_FADE_DURATION) {
            setPhase(PHASES.INSTRUCTIONS_HOLD)
          }
          break
        }
        case PHASES.INSTRUCTIONS_HOLD: {
          if (phaseTimer >= INSTRUCTIONS_HOLD_DURATION) {
            //
            // Fade out instructions
            //
            k.tween(
              0,
              1,
              INSTRUCTIONS_FADE_DURATION,
              (val) => {
                const opacity = 1 - val
                titleBaseOpacity = opacity
                titleOutlines.forEach(outline => outline.opacity = opacity)
                instructionsTextObjects.forEach(obj => obj.opacity = opacity)
                instructionsOutlineObjects.forEach(outline => outline.opacity = opacity)
              },
              k.easings.easeOutQuad
            )
            setPhase(PHASES.INSTRUCTIONS_FADE_OUT)
          }
          break
        }
        case PHASES.INSTRUCTIONS_FADE_OUT: {
          //
          // Show particles with fade in at the start of fade out
          //
          if (!particlesFadedIn) {
            particlesFadedIn = true
            showParticles = true  // Enable particle rendering
            spidersFadingOut = true  // Start fading out spiders
            //
            // Fade in particles
            //
            k.tween(
              0,
              0.4,
              INSTRUCTIONS_FADE_DURATION,
              (val) => {
                particleSystem.particles.forEach(particle => {
                  particle.opacity = val
                })
              },
              k.easings.easeInQuad
            )
          }
          
          if (phaseTimer >= INSTRUCTIONS_FADE_DURATION) {
            //
            // Destroy instruction text objects
            //
            titleText.destroy()
            titleOutlines.forEach(outline => outline.destroy())
            instructionsTextObjects.forEach(obj => obj.destroy())
            instructionsOutlineObjects.forEach(outline => outline.destroy())
            //
            // Start firefly animation with title
            //
            setPhase(PHASES.TITLE_HOLD)
          }
          break
        }
        case PHASES.TITLE_HOLD: {
          if (phaseTimer >= TITLE_HOLD_DURATION) {
            scatterParticles(particleSystem)
            setPhase(PHASES.TITLE_SCATTER)
          }
          break
        }
        case PHASES.TITLE_SCATTER: {
          if (particlesIdle(particleSystem.particles)) {
            moveParticlesToLayout(particleSystem, quotePrimaryLayout.positions)
            setPhase(PHASES.QUOTE_PRIMARY_GATHER)
          }
          break
        }
        case PHASES.QUOTE_PRIMARY_GATHER: {
          if (particlesIdle(particleSystem.particles)) {
            setPhase(PHASES.QUOTE_PRIMARY_HOLD)
          }
          break
        }
        case PHASES.QUOTE_PRIMARY_HOLD: {
          if (phaseTimer >= QUOTE_PRIMARY_HOLD_DURATION) {
            scatterParticles(particleSystem)
            setPhase(PHASES.QUOTE_PRIMARY_SCATTER)
          }
          break
        }
        case PHASES.QUOTE_PRIMARY_SCATTER: {
          if (particlesIdle(particleSystem.particles)) {
            moveParticlesToLayout(particleSystem, quoteSecondaryLayout.positions)
            setPhase(PHASES.QUOTE_SECONDARY_GATHER)
          }
          break
        }
        case PHASES.QUOTE_SECONDARY_GATHER: {
          if (particlesIdle(particleSystem.particles)) {
            setPhase(PHASES.QUOTE_SECONDARY_HOLD)
          }
          break
        }
        case PHASES.QUOTE_SECONDARY_HOLD: {
          if (phaseTimer >= QUOTE_SECONDARY_HOLD_DURATION) {
            scatterParticles(particleSystem)
            setPhase(PHASES.QUOTE_SECONDARY_SCATTER)
          }
          break
        }
        case PHASES.QUOTE_SECONDARY_SCATTER: {
          if (particlesIdle(particleSystem.particles)) {
            moveParticlesToLayout(particleSystem, arrowLayout.positions)
            setPhase(PHASES.ARROW_GATHER)
          }
          break
        }
        case PHASES.ARROW_GATHER: {
          if (particlesIdle(particleSystem.particles)) {
            setPhase(PHASES.ARROW_HOLD)
          }
          break
        }
        case PHASES.ARROW_HOLD: {
          //
          // Arrow stays until user presses key
          //
          break
        }
        case PHASES.FREE:
        default:
          break
      }
      
      //
      // Only update particles if they should be shown
      //
      if (showParticles) {
        Particles.onUpdate(particleSystem)
      }

      //
      // Hint flicker (always active)
      //
      hintFlickerTime += k.dt() * hintDirection
      if (hintFlickerTime >= HINT_FLICKER_DURATION) {
        hintDirection = -1
        hintFlickerTime = HINT_FLICKER_DURATION
      } else if (hintFlickerTime <= 0) {
        hintDirection = 1
        hintFlickerTime = 0
      }
      const hintProgress = hintFlickerTime / HINT_FLICKER_DURATION
      hint.opacity = HINT_MIN_OPACITY + (HINT_MAX_OPACITY - HINT_MIN_OPACITY) * hintProgress
      //
      // Title flicker - subtle opacity variation
      //
      titleFlickerPhase += k.dt() * TITLE_FLICKER_SPEED
      const titleFlicker = TITLE_FLICKER_MIN + (TITLE_FLICKER_MAX - TITLE_FLICKER_MIN) * (0.5 + 0.5 * Math.sin(titleFlickerPhase))
      //
      // Apply flicker to title opacity (using base opacity from tween)
      //
      titleText.opacity = titleBaseOpacity * titleFlicker
      
      //
      // Spider animation
      //
      const dt = k.dt()
      spiderTimer += dt
      //
      // Update spider fade-out progress if fading out
      //
      if (spidersFadingOut && spiderFadeOutProgress < 1) {
        spiderFadeOutProgress += dt / INSTRUCTIONS_FADE_DURATION
        spiderFadeOutProgress = Math.min(1, spiderFadeOutProgress)
      }
      //
      // Calculate current opacity based on timer
      //
      let currentOpacity = 0
      if (spiderTimer > SPIDER_APPEAR_DELAY) {
        const fadeProgress = Math.min(1, (spiderTimer - SPIDER_APPEAR_DELAY) / SPIDER_FADE_DURATION)
        currentOpacity = fadeProgress * SPIDER_MAX_OPACITY
        //
        // Apply fade-out multiplier if spiders are fading out
        //
        if (spidersFadingOut) {
          currentOpacity *= (1 - spiderFadeOutProgress)
        }
      }
      //
      // Update each spider
      //
      spiders.forEach(spider => {
        updateSpider(k, spider, dt, currentOpacity)
      })
    })
    
    k.onDraw(() => {
      //
      // Only draw particles if they should be shown
      //
      if (showParticles) {
        Particles.draw(particleSystem)
      }
      //
      // Draw spiders with individual fade-in (and fade-out) - AFTER particles (on top)
      //
      spiders.forEach(spider => {
        let spiderOpacity = 0
        const timeToAppear = SPIDER_APPEAR_DELAY + spider.appearDelay
        if (spiderTimer > timeToAppear) {
          const fadeProgress = Math.min(1, (spiderTimer - timeToAppear) / SPIDER_FADE_DURATION)
          spiderOpacity = fadeProgress * SPIDER_MAX_OPACITY
          //
          // Apply fade-out multiplier if spiders are fading out
          //
          if (spidersFadingOut) {
            spiderOpacity *= (1 - spiderFadeOutProgress)
          }
        }
        drawSpider(k, spider, spiderOpacity)
      })
    })
    
    //
    // Controls
    //
    const exitToMenu = () => {
      Sound.stopAmbient(sound)
      k.go('menu')
    }
    
    CFG.controls.startGame.forEach(key => {
      k.onKeyPress(key, exitToMenu)
    })
    
    k.onClick(exitToMenu)
  })
}

function createParticleSystem(k, layoutPositions, initialOpacity = 0.4) {
  const count = Math.max(1, Math.floor(layoutPositions.length * DENSITY_MULTIPLIER))
  const extendedPositions = []
  const particles = []
  
  for (let i = 0; i < count; i++) {
    const base = layoutPositions[i % layoutPositions.length]
    const pos = { x: base.x, y: base.y }
    extendedPositions.push(pos)
    particles.push({
      baseX: pos.x,
      baseY: pos.y,
      x: pos.x,
      y: pos.y,
      flickerPhase: Math.random() * Math.PI * 2,
      tremblePhase: Math.random() * Math.PI * 2,
      trembleSpeed: 0.8 + Math.random() * 0.4,
      fleeSpeed: 0.7 + Math.random() * 0.6,
      opacity: initialOpacity,
      isFleeing: false,
      isAutoFleeing: false,
      fleeStartX: pos.x,
      fleeStartY: pos.y,
      fleeTargetX: pos.x,
      fleeTargetY: pos.y,
      fleeProgress: 0,
      floatFadeIn: 0,
      hasEverFled: false,
      fleeCurveX: 0,
      fleeCurveY: 0,
      fleeTimeOffset: Math.random() * Math.PI * 2,
      fleeCurveIntensity: 1 + Math.random() * 0.75
    })
  }
  
  return {
    k,
    particles,
    color: CFG.visual.colors.ready.fireflies,
    baseOpacity: 0.9,
    flickerSpeed: 2,
    trembleRadius: TREMOR_FORMATION,
    trembleRadiusAfterFlee: TREMOR_FORMATION,
    mouseInfluence: 0,
    bounds: null,
    time: 0,
    isCursorVisible: () => false,
    layoutPositions: extendedPositions.map(pos => ({ x: pos.x, y: pos.y }))
  }
}

function generateLayout({
  text,
  fontSize,
  centerX,
  centerY,
  desiredCount,
  samplingProbability = 0.8,
  minDistance = 4,
  maxWidth,
  singlePixelStroke = false,
  fontFamily = TITLE_FONT_FAMILY,
  morphTargets
}) {
  const lines = text.split('\n')
  const padding = 24
  const lineHeight = fontSize * 1.2
  
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.font = `${fontSize}px ${fontFamily}`
  
  const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width))
  const rawCanvasWidth = Math.ceil(maxLineWidth + padding * 2)
  const canvasHeight = Math.ceil(lineHeight * lines.length + padding * 2)
  
  canvas.width = rawCanvasWidth
  canvas.height = canvasHeight
  
  ctx.fillStyle = 'white'
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  const scaleX = maxWidth ? Math.min(1, maxWidth / rawCanvasWidth) : 1
  const effectiveWidth = rawCanvasWidth * scaleX
  
  ctx.save()
  ctx.translate(rawCanvasWidth / 2, 0)
  ctx.scale(scaleX, 1)
  
  const strokeWidth = singlePixelStroke ? Math.max(0.75, 1 / scaleX) : 1
  ctx.lineWidth = strokeWidth
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'white'
  
  lines.forEach((line, index) => {
    const lineY = padding + lineHeight * index + lineHeight / 2
    if (singlePixelStroke) {
      ctx.strokeText(line, 0, lineY)
    } else {
      ctx.fillText(line, 0, lineY)
    }
  })
  
  ctx.restore()
  
  const imageData = ctx.getImageData(0, 0, rawCanvasWidth, canvasHeight)
  const pixels = imageData.data
  
  const edgePixels = collectEdgePixels(rawCanvasWidth, canvasHeight, pixels)
  shuffle(edgePixels)
  
  const positions = []
  const temp = []
  
  for (let i = 0; i < edgePixels.length; i++) {
    const pixel = edgePixels[i]
    if (Math.random() > samplingProbability) continue
    if (!isFarEnough(pixel.x, pixel.y, temp, minDistance)) continue
    temp.push(pixel)
    
    const worldX = centerX - effectiveWidth / 2 + pixel.x * scaleX
    const worldY = centerY - canvasHeight / 2 + pixel.y
    positions.push({ x: worldX, y: worldY })
  }
  
  let finalPositions = positions
  if (desiredCount) {
    finalPositions = normalizeLayoutCount(
      positions,
      desiredCount,
      centerX,
      centerY,
      morphTargets
    )
  }
  
  const metrics = {
    width: effectiveWidth,
    height: canvasHeight,
    lineHeight,
    lines: lines.length
  }
  
  return {
    positions: finalPositions,
    metrics
  }
}

function normalizeLayoutCount(positions, desiredCount, centerX, centerY, morphTargets) {
  if (positions.length === desiredCount) {
    return positions.map(pos => ({ x: pos.x, y: pos.y }))
  }
  
  let adjusted = positions.map(pos => ({ x: pos.x, y: pos.y }))
  
  if (morphTargets && morphTargets.length && adjusted.length) {
    const matched = []
    const remaining = [...adjusted]
    morphTargets.forEach(target => {
      if (!remaining.length) return
      let bestIndex = 0
      let bestDist = Infinity
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i]
        const dx = candidate.x - target.x
        const dy = candidate.y - target.y
        const dist = dx * dx + dy * dy
        if (dist < bestDist) {
          bestDist = dist
          bestIndex = i
        }
      }
      matched.push(remaining.splice(bestIndex, 1)[0])
    })
    adjusted = matched.concat(remaining)
  }
  
  if (adjusted.length > desiredCount) {
    shuffle(adjusted)
    return adjusted.slice(0, desiredCount)
  }
  
  if (adjusted.length === 0) {
    const fallbackX = centerX ?? 0
    const fallbackY = centerY ?? 0
    while (adjusted.length < desiredCount) {
      adjusted.push({ x: fallbackX, y: fallbackY })
    }
    return adjusted
  }
  
  const baseSource =
    morphTargets && morphTargets.length ? morphTargets : positions.length ? positions : adjusted
  let index = 0
  const jitterAmount = 0.35
  
  while (adjusted.length < desiredCount) {
    const source = baseSource[index % baseSource.length]
    const fallback = positions[index % positions.length] || adjusted[adjusted.length - 1]
    const base = source || fallback
    adjusted.push({
      x: base.x + (Math.random() - 0.5) * jitterAmount,
      y: base.y + (Math.random() - 0.5) * jitterAmount
    })
    index++
  }
  
  return adjusted
}

function collectEdgePixels(width, height, pixels) {
  const edgePixels = []
  
  const getAlpha = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0
    return pixels[(y * width + x) * 4 + 3]
  }
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = getAlpha(x, y)
      if (alpha <= 128) continue
      
      let isEdge = false
      for (let dy = -1; dy <= 1 && !isEdge; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          if (getAlpha(x + dx, y + dy) < 128) {
            isEdge = true
            break
          }
        }
      }
      
      if (isEdge) {
        edgePixels.push({ x, y })
      }
    }
  }
  
  return edgePixels
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
}

function isFarEnough(x, y, existing, minDistance) {
  const minDistSq = minDistance * minDistance
  for (let i = 0; i < existing.length; i++) {
    const dx = existing[i].x - x
    const dy = existing[i].y - y
    if (dx * dx + dy * dy < minDistSq) return false
  }
  return true
}

function scatterParticles(system) {
  const { particles } = system
  system.trembleRadius = TREMOR_FREE
  system.trembleRadiusAfterFlee = TREMOR_FREE
  particles.forEach(particle => {
    if (particle.isFleeing) return
    const angle = Math.random() * Math.PI * 2
    const distance = SCATTER_DISTANCE_MIN + Math.random() * (SCATTER_DISTANCE_MAX - SCATTER_DISTANCE_MIN)
    const targetX = particle.x + Math.cos(angle) * distance
    const targetY = particle.y + Math.sin(angle) * distance
    
    particle.isFleeing = true
    particle.isAutoFleeing = true
    particle.fleeProgress = 0
    particle.fleeStartX = particle.x
    particle.fleeStartY = particle.y
    particle.fleeTargetX = targetX
    particle.fleeTargetY = targetY
    particle.hasEverFled = true
    particle.floatFadeIn = 0
  })
}

function moveParticlesToLayout(system, layoutPositions) {
  const { particles } = system
  system.trembleRadius = TREMOR_FORMATION
  system.trembleRadiusAfterFlee = TREMOR_FORMATION
  
  const average = layoutPositions.reduce(
    (acc, pos) => {
      acc.x += pos.x
      acc.y += pos.y
      return acc
    },
    { x: 0, y: 0 }
  )
  const count = layoutPositions.length || 1
  const centerX = average.x / count
  const centerY = average.y / count
  
  const targets = layoutPositions.length
    ? layoutPositions.map(pos => ({ ...pos }))
    : [{ x: centerX, y: centerY }]
  
  const availableParticles = [...particles]
  const assignments = []
  
  targets.forEach(target => {
    if (availableParticles.length === 0) return
    
    let bestIndex = 0
    let bestDistance = Infinity
    
    for (let i = 0; i < availableParticles.length; i++) {
      const candidate = availableParticles[i]
      const dx = target.x - candidate.x
      const dy = target.y - candidate.y
      const distSq = dx * dx + dy * dy
      if (distSq < bestDistance) {
        bestDistance = distSq
        bestIndex = i
      }
    }
    
    const particle = availableParticles.splice(bestIndex, 1)[0]
    assignments.push({ particle, target })
  })
  
  assignments.forEach(({ particle, target }) => {
    particle.isFleeing = true
    particle.isAutoFleeing = true
    particle.fleeSpeed = GATHER_SPEED + Math.random() * 0.22
    particle.fleeProgress = 0
    particle.fleeStartX = particle.x
    particle.fleeStartY = particle.y
    particle.fleeTargetX = target.x
    particle.fleeTargetY = target.y
    particle.hasEverFled = true
    particle.floatFadeIn = 0
    const curveMagnitude = 30 + Math.random() * 55
    const curveAngle = Math.random() * Math.PI * 2
    particle.fleeCurveX = Math.cos(curveAngle) * curveMagnitude
    particle.fleeCurveY = Math.sin(curveAngle) * curveMagnitude
    particle.fleeCurveIntensity = 1 + Math.random() * 0.75
  })
  
  if (availableParticles.length > 0 && targets.length > 0) {
    availableParticles.forEach((particle, index) => {
      const target = targets[index % targets.length]
      particle.isFleeing = true
      particle.isAutoFleeing = true
      particle.fleeSpeed = GATHER_SPEED + Math.random() * 0.22
      particle.fleeProgress = 0
      particle.fleeStartX = particle.x
      particle.fleeStartY = particle.y
      particle.fleeTargetX = target.x
      particle.fleeTargetY = target.y
      particle.hasEverFled = true
      particle.floatFadeIn = 0
      const curveMagnitude = 30 + Math.random() * 55
      const curveAngle = Math.random() * Math.PI * 2
      particle.fleeCurveX = Math.cos(curveAngle) * curveMagnitude
      particle.fleeCurveY = Math.sin(curveAngle) * curveMagnitude
      particle.fleeCurveIntensity = 1 + Math.random() * 0.75
    })
  }
  
  system.layoutPositions = targets.map(pos => ({ x: pos.x, y: pos.y }))
}

function particlesIdle(particles) {
  return particles.every(particle => !particle.isFleeing)
}

/**
 * Creates a spider from a specific letter in a text object
 * @param {Object} k - Kaplay instance
 * @param {number} index - Spider index
 * @param {Object} sourceInfo - Info about source letter {textObj, charIndex, char, x, y, color, fontSize, fontFamily}
 * @returns {Object} Spider instance
 */
function createSpider(k, index, sourceInfo) {
  const { char, x, y, color, fontSize, fontFamily } = sourceInfo
  //
  // Spider starts stationary until legs fully appear
  //
  const angle = Math.random() * Math.PI * 2
  const speed = SPIDER_SPEED * (0.5 + Math.random() * 0.5)
  //
  // Create 8 legs (4 on each side)
  // Leg angles spread around the body with random variation
  //
  const baseAngleOffset = Math.random() * Math.PI * 2  // Random rotation for all legs
  const legAngles = [
    -Math.PI * 0.8, -Math.PI * 0.6, -Math.PI * 0.4, -Math.PI * 0.2,  // Left side
    Math.PI * 0.2, Math.PI * 0.4, Math.PI * 0.6, Math.PI * 0.8       // Right side
  ]
  
  const legs = legAngles.map((baseAngle, i) => {
    const side = i < 4 ? -1 : 1  // Left or right side
    const reach = SPIDER_LEG_LENGTH_1 + SPIDER_LEG_LENGTH_2
    //
    // Apply random offset to base angle
    //
    const randomizedAngle = baseAngle + baseAngleOffset
    //
    // Initial foot target position
    //
    const footX = x + Math.cos(randomizedAngle) * reach * 0.8
    const footY = y + Math.sin(randomizedAngle) * reach * 0.8
    
    return {
      baseAngle: randomizedAngle,
      side,
      footX,
      footY,
      targetFootX: footX,
      targetFootY: footY,
      isStepping: false,
      stepProgress: 0,
      stepStartX: footX,
      stepStartY: footY,
      phaseOffset: (i % 2) * Math.PI
    }
  })
  
  return {
    x,
    y,
    vx: 0,  // Start stationary
    vy: 0,
    targetVx: Math.cos(angle) * speed,
    targetVy: Math.sin(angle) * speed,
    speed,
    directionTimer: Math.random() * SPIDER_DIRECTION_CHANGE_INTERVAL,
    legs,
    distanceTraveled: 0,
    color,  // Use original text color
    appearDelay: index * 0.15,
    legAppearDelay: 0,  // Will be set externally
    legAppearTimer: 0,  // Timer for leg appearance
    letter: char,
    letterSize: fontSize || INSTRUCTIONS_FONT_SIZE,
    letterFont: fontFamily || QUOTE_FONT_FAMILY,
    isActivated: false,  // Becomes true when legs fully appear
    legOpacity: 0,  // Separate opacity for legs
    charHidden: false,  // Track if character was hidden from text
    letterInfo: null,  // Will be set later
    titleOutlines: null  // Will be set later for title letters
  }
}

/**
 * Picks all letters from title text
 * @param {Object} k - Kaplay instance
 * @param {Object} titleTextObj - Title text object
 * @param {string} titleString - Title text string
 * @param {number} fontSize - Font size of the title
 * @param {string} fontFamily - Font family of the title
 * @returns {Array} Array of letter info objects
 */
function pickLettersFromTitle(k, titleTextObj, titleString, fontSize, fontFamily) {
  const letterInfos = []
  //
  // Calculate character width more accurately
  // For monospace font, width is approximately fontSize * 0.6
  //
  const charWidth = fontSize * 0.6
  const startX = titleTextObj.pos.x
  //
  // Use same bright color as title at maximum brightness (matching first image)
  //
  const brighterColor = k.rgb(245, 110, 110)  // Slightly darker red
  
  titleString.split('').forEach((char, charIndex) => {
    //
    // Skip spaces
    //
    if (char.trim().length === 0) return
    //
    // Calculate center position of this character
    // Add half char width to get center instead of left edge
    //
    const charX = startX + (charIndex * charWidth) + (charWidth / 2)
    const charY = titleTextObj.pos.y
    
    letterInfos.push({
      textObj: titleTextObj,
      charIndex,
      char,
      x: charX,
      y: charY,
      color: brighterColor,  // Use brighter color instead of titleTextObj.color
      fontSize,
      fontFamily
    })
  })
  
  return letterInfos
}

/**
 * Picks random letters from text objects and returns their info
 * @param {Object} k - Kaplay instance
 * @param {Array} textObjects - Array of text objects
 * @param {number} count - Number of letters to pick
 * @returns {Array} Array of letter info objects
 */
function pickLettersFromText(k, textObjects, count) {
  const letterInfos = []
  //
  // Calculate approximate character widths for positioning
  //
  const charWidth = INSTRUCTIONS_FONT_SIZE * 0.5  // Approximate monospace width
  
  for (let i = 0; i < count; i++) {
    if (textObjects.length === 0) break
    //
    // Pick random text object
    //
    const textObj = k.choose(textObjects)
    const text = textObj.text
    const textColor = textObj.color
    //
    // Filter non-space characters
    //
    const chars = text.split('')
    const nonSpaceIndices = []
    chars.forEach((c, idx) => {
      if (c.trim().length > 0) {
        nonSpaceIndices.push(idx)
      }
    })
    
    if (nonSpaceIndices.length === 0) continue
    //
    // Pick random character
    //
    const charIndex = k.choose(nonSpaceIndices)
    const char = chars[charIndex]
    //
    // Calculate approximate position of this character
    //
    const charX = textObj.pos.x + charIndex * charWidth
    const charY = textObj.pos.y
    
    letterInfos.push({
      textObj,
      charIndex,
      char,
      x: charX,
      y: charY,
      color: textColor
    })
  }
  
  return letterInfos
}

/**
 * Updates spider position and leg animations
 * @param {Object} k - Kaplay instance
 * @param {Object} spider - Spider instance
 * @param {number} dt - Delta time
 * @param {number} opacity - Current opacity (for legs)
 */
function updateSpider(k, spider, dt, opacity) {
  //
  // Always update leg appearance timer once opacity is greater than 0
  //
  if (opacity > 0) {
    spider.legAppearTimer += dt
  }
  //
  // Update leg opacity if timer is past delay and legs haven't fully appeared
  //
  if (spider.legAppearTimer >= spider.legAppearDelay && spider.legOpacity < opacity) {
    const legFadeSpeed = SPIDER_MAX_OPACITY / 2.0  // Legs appear over 2 seconds (from 0 to SPIDER_MAX_OPACITY)
    spider.legOpacity = Math.min(spider.legOpacity + dt * legFadeSpeed, opacity)
  }
  //
  // Activate spider movement after legs have been appearing for 2 seconds
  //
  const legAppearTimeElapsed = spider.legAppearTimer - spider.legAppearDelay
  if (!spider.isActivated && legAppearTimeElapsed >= 2.0) {
    spider.isActivated = true
    //
    // Capture the current color from the original text at the moment of activation
    //
    if (spider.letterInfo && spider.letterInfo.textObj) {
      spider.color = spider.letterInfo.textObj.color
    }
    //
    // Hide the original character from text and outlines when spider activates
    //
    if (spider.letterInfo && !spider.charHidden) {
      const { textObj, charIndex } = spider.letterInfo
      const chars = textObj.text.split('')
      chars[charIndex] = ' '
      textObj.text = chars.join('')
      //
      // Update outlines as well (either from textObj.outlines or spider.titleOutlines)
      //
      const outlinesToUpdate = textObj.outlines || spider.titleOutlines
      if (outlinesToUpdate) {
        outlinesToUpdate.forEach(outline => {
          outline.text = textObj.text
        })
      }
      spider.charHidden = true
    }
  }
  //
  // Don't move if not activated yet
  //
  if (!spider.isActivated) return
  //
  // Update direction timer
  //
  spider.directionTimer -= dt
  if (spider.directionTimer <= 0) {
    const newAngle = Math.random() * Math.PI * 2
    spider.targetVx = Math.cos(newAngle) * spider.speed
    spider.targetVy = Math.sin(newAngle) * spider.speed
    spider.directionTimer = SPIDER_DIRECTION_CHANGE_INTERVAL * (0.5 + Math.random())
  }
  //
  // Smoothly interpolate velocity
  //
  const smoothing = SPIDER_SMOOTHING * dt
  spider.vx += (spider.targetVx - spider.vx) * smoothing
  spider.vy += (spider.targetVy - spider.vy) * smoothing
  //
  // Store old position for distance calculation
  //
  const oldX = spider.x
  const oldY = spider.y
  //
  // Move spider
  //
  spider.x += spider.vx * dt
  spider.y += spider.vy * dt
  //
  // Track distance traveled
  //
  const dx = spider.x - oldX
  const dy = spider.y - oldY
  spider.distanceTraveled += Math.sqrt(dx * dx + dy * dy)
  //
  // Bounce off screen edges
  //
  const minX = SPIDER_SCREEN_MARGIN
  const maxX = k.width() - SPIDER_SCREEN_MARGIN
  const minY = SPIDER_SCREEN_MARGIN
  const maxY = k.height() - SPIDER_SCREEN_MARGIN
  
  if (spider.x < minX) {
    spider.x = minX
    spider.targetVx = Math.abs(spider.targetVx)
    spider.vx = Math.abs(spider.vx) * 0.5
  } else if (spider.x > maxX) {
    spider.x = maxX
    spider.targetVx = -Math.abs(spider.targetVx)
    spider.vx = -Math.abs(spider.vx) * 0.5
  }
  
  if (spider.y < minY) {
    spider.y = minY
    spider.targetVy = Math.abs(spider.targetVy)
    spider.vy = Math.abs(spider.vy) * 0.5
  } else if (spider.y > maxY) {
    spider.y = maxY
    spider.targetVy = -Math.abs(spider.targetVy)
    spider.vy = -Math.abs(spider.vy) * 0.5
  }
  //
  // Update legs with inverse kinematics
  //
  const movementAngle = Math.atan2(spider.vy, spider.vx)
  const reach = SPIDER_LEG_LENGTH_1 + SPIDER_LEG_LENGTH_2
  
  spider.legs.forEach((leg, i) => {
    //
    // Calculate ideal foot position based on movement direction
    //
    const adjustedAngle = leg.baseAngle + movementAngle
    const idealX = spider.x + Math.cos(adjustedAngle) * reach * 0.7
    const idealY = spider.y + Math.sin(adjustedAngle) * reach * 0.7
    //
    // Distance from current foot to ideal position
    //
    const footDx = idealX - leg.footX
    const footDy = idealY - leg.footY
    const footDist = Math.sqrt(footDx * footDx + footDy * footDy)
    //
    // Check if leg needs to step
    //
    if (!leg.isStepping && footDist > SPIDER_STEP_DISTANCE) {
      //
      // Start stepping - alternating gait (legs step in pairs)
      //
      const shouldStep = (i % 2 === 0) !== (Math.floor(spider.distanceTraveled / SPIDER_STEP_DISTANCE) % 2 === 0)
      if (shouldStep) {
        leg.isStepping = true
        leg.stepProgress = 0
        leg.stepStartX = leg.footX
        leg.stepStartY = leg.footY
        leg.targetFootX = idealX
        leg.targetFootY = idealY
      }
    }
    //
    // Animate stepping
    //
    if (leg.isStepping) {
      leg.stepProgress += dt * 8  // Step speed
      if (leg.stepProgress >= 1) {
        leg.stepProgress = 1
        leg.isStepping = false
        leg.footX = leg.targetFootX
        leg.footY = leg.targetFootY
      } else {
        //
        // Interpolate foot position with arc
        //
        const t = leg.stepProgress
        const arcHeight = 3  // How high the foot lifts
        const arc = Math.sin(t * Math.PI) * arcHeight
        leg.footX = leg.stepStartX + (leg.targetFootX - leg.stepStartX) * t
        leg.footY = leg.stepStartY + (leg.targetFootY - leg.stepStartY) * t - arc
      }
    }
  })
}

/**
 * Draws a spider using inverse kinematics for legs and letter as body
 * @param {Object} k - Kaplay instance
 * @param {Object} spider - Spider instance
 * @param {number} textOpacity - Current text opacity
 */
function drawSpider(k, spider, textOpacity) {
  //
  // Draw legs with separate opacity (fade in gradually)
  //
  if (spider.legOpacity > 0) {
    //
    // Use same color as letter for legs
    //
    const legColor = spider.color
    
    spider.legs.forEach(leg => {
      const { jointX, jointY } = solveIK(
        spider.x, spider.y,
        leg.footX, leg.footY,
        SPIDER_LEG_LENGTH_1, SPIDER_LEG_LENGTH_2,
        leg.side
      )
      //
      // First segment (body to joint)
      //
      k.drawLine({
        p1: k.vec2(spider.x, spider.y),
        p2: k.vec2(jointX, jointY),
        width: 2,
        color: legColor,
        opacity: spider.legOpacity
      })
      //
      // Second segment (joint to foot)
      //
      k.drawLine({
        p1: k.vec2(jointX, jointY),
        p2: k.vec2(leg.footX, leg.footY),
        width: 2,
        color: legColor,
        opacity: spider.legOpacity
      })
      //
      // Draw circle at joint to cover gap
      //
      k.drawCircle({
        pos: k.vec2(jointX, jointY),
        radius: 1,
        color: legColor,
        opacity: spider.legOpacity
      })
    })
  }
  //
  // Draw the letter (body) only if it's been hidden from original text
  //
  if (spider.charHidden) {
    //
    // Always draw letter at full opacity for maximum brightness
    //
    const letterOpacity = 1.0
    //
    // Calculate rotation angle based on movement direction (in degrees)
    //
    const angleRad = Math.atan2(spider.vy, spider.vx)
    const angleDeg = angleRad * (180 / Math.PI)
    
    k.pushTransform()
    k.pushTranslate(spider.x, spider.y)
    k.pushRotate(angleDeg)
    //
    // Draw black outlines for shadow effect (8 directions)
    //
    const outlineOffsets = [
      [-2, -2], [0, -2], [2, -2],
      [-2, 0],           [2, 0],
      [-2, 2],  [0, 2],  [2, 2]
    ]
    
    outlineOffsets.forEach(([dx, dy]) => {
      k.drawText({
        text: spider.letter,
        size: spider.letterSize,
        pos: k.vec2(dx, dy),
        anchor: 'center',
        color: k.rgb(0, 0, 0),
        opacity: letterOpacity,
        font: spider.letterFont
      })
    })
    //
    // Draw main letter on top
    //
    k.drawText({
      text: spider.letter,
      size: spider.letterSize,
      pos: k.vec2(0, 0),
      anchor: 'center',
      color: spider.color,
      opacity: letterOpacity,
      font: spider.letterFont
    })
    
    k.popTransform()
  }
}

/**
 * Solves inverse kinematics for a 2-segment leg
 * @param {number} baseX - Base X (body position)
 * @param {number} baseY - Base Y (body position)
 * @param {number} targetX - Target X (foot position)
 * @param {number} targetY - Target Y (foot position)
 * @param {number} len1 - Length of first segment
 * @param {number} len2 - Length of second segment
 * @param {number} side - Side of the leg (-1 left, 1 right)
 * @returns {Object} Joint position { jointX, jointY }
 */
function solveIK(baseX, baseY, targetX, targetY, len1, len2, side) {
  //
  // Distance from base to target
  //
  const dx = targetX - baseX
  const dy = targetY - baseY
  let dist = Math.sqrt(dx * dx + dy * dy)
  //
  // Clamp distance to reachable range
  //
  const maxReach = len1 + len2 - 0.1
  const minReach = Math.abs(len1 - len2) + 0.1
  dist = Math.max(minReach, Math.min(maxReach, dist))
  //
  // Use law of cosines to find angles
  //
  const angleToTarget = Math.atan2(dy, dx)
  //
  // Angle at base joint
  //
  const cosAngle1 = (dist * dist + len1 * len1 - len2 * len2) / (2 * dist * len1)
  const angle1 = Math.acos(Math.max(-1, Math.min(1, cosAngle1)))
  //
  // Calculate joint position
  // Side determines which way the joint bends
  //
  const jointAngle = angleToTarget + angle1 * side
  const jointX = baseX + Math.cos(jointAngle) * len1
  const jointY = baseY + Math.sin(jointAngle) * len1
  
  return { jointX, jointY }
}