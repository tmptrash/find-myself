import { CFG } from '../cfg.js'
import { toCanvas } from '../../../utils/helper.js'
import { loadTouchSprite } from '../../../utils/touch-sprite-registry.js'
import { growTreeRootSegments } from '../../../utils/grow-tree-root.js'

//
// Note-tree horizontal positions (7 trees between 25%–75% of play area)
//
const NOTE_TREE_COUNT = 7
//
// Disco beat: shake interval in seconds (≈120 BPM = 0.5s per beat)
//
const DISCO_BEAT_INTERVAL = 0.5
//
// Shake amplitude applied to all trees on each beat pulse
//
const DISCO_BEAT_SHAKE = 1.6
const NOTE_TREE_START_OFFSET = 0.25
const NOTE_TREE_END_OFFSET = 0.75

/**
 * Returns world X positions of the seven melody note trees
 * @param {number} leftMargin - Left play-area margin
 * @param {number} rightMargin - Right play-area margin
 * @param {number} screenWidth - Screen width in pixels
 * @returns {number[]} X coordinates of each note tree
 */
export function getNoteTreePositions(leftMargin, rightMargin, screenWidth) {
  const playableWidth = screenWidth - leftMargin - rightMargin
  const positions = []
  for (let i = 0; i < NOTE_TREE_COUNT; i++) {
    const t = i / (NOTE_TREE_COUNT - 1)
    positions.push(leftMargin + playableWidth * (NOTE_TREE_START_OFFSET + (NOTE_TREE_END_OFFSET - NOTE_TREE_START_OFFSET) * t))
  }
  return positions
}

/**
 * Creates tree roots that grow from the bottom platform upward
 * Uses organic growth algorithm for realistic root structures
 * Pre-renders trees to sprites for performance
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.floorY - Y position of the floor/platform
 * @param {number} config.leftMargin - Left margin of playable area
 * @param {number} config.rightMargin - Right margin of playable area
 * @param {number} config.screenWidth - Screen width
 * @param {Object} [config.sfx] - Shared Sound instance (uses its AudioContext for notes)
 * @returns {Promise<Object>} Tree roots instance
 */
export async function create(config) {
  const { k, floorY, leftMargin, rightMargin, screenWidth, sfx } = config
  
  //
  // Random helper
  //
  const rand = (min, max) => min + Math.random() * (max - min)
  
  //
  // Create 7 tree roots with equal spacing between them
  // Distribute within 25%-75% of playable area (50% span)
  //
  const rootPositions = getNoteTreePositions(leftMargin, rightMargin, screenWidth)
  
  //
  // Center Y position is exactly at floorY (top of bottom platform)
  //
  const centerY = floorY
  
  //
  // Musical notes (C, D, E, F, G, A, B) - assign one note per tree
  //
  const notes = [
    261.63,  // C4 (до)
    293.66,  // D4 (ре)
    329.63,  // E4 (ми)
    349.23,  // F4 (фа)
    392.00,  // G4 (соль)
    440.00,  // A4 (ля)
    493.88   // B4 (си)
  ]
  
  const roots = rootPositions.map((rootX, index) => {
    //
    // Root growth is delegated to the shared `grow-tree-root` primitive
    // (`src/utils/grow-tree-root.js`) so the in-game L1 roots and the
    // ready/menu background composite roots come out of one algorithm.
    //
    const growRoot = (x, y, angle, segments, thickness, depth = 0) =>
      growTreeRootSegments({ x, y, angle, segments, thickness, depth, rand })
    
    //
    // Branch growth algorithm (adapted from new canvas example for tree tops)
    //
    const growBranch = (x, y, angle, length, thickness, depth = 0, branchEndPoints = []) => {
      const branchSegments = []
      
      if (length <= 6 || thickness <= 0.5 || depth > 7) {
        //
        // At the end of branches, save the endpoint for leaf placement
        //
        if (depth > 2) {
          branchEndPoints.push({ x, y })
        }
        return branchSegments
      }
      
      const step = rand(5, 8)
      let cx = x
      let cy = y
      
      //
      // Build branch path with softer curvature
      //
      for (let i = 0; i < length; i++) {
        const prevX = cx
        const prevY = cy
        
        //
        // Softer organic curvature (less than roots)
        //
        angle += rand(-0.12, 0.12)
        cx += Math.cos(angle) * step
        cy += Math.sin(angle) * step
        
        //
        // Add segment
        //
        branchSegments.push({
          startX: prevX,
          startY: prevY,
          endX: cx,
          endY: cy,
          width: thickness,
          depth
        })
        
        //
        // Small offshoots
        //
        if (Math.random() < 0.07 && depth < 6) {
          const microBranches = growBranch(
            cx,
            cy,
            angle + rand(-1.2, 1.2),
            length * 0.35,
            thickness * 0.5,
            depth + 2,
            branchEndPoints
          )
          branchSegments.push(...microBranches)
        }
      }
      
      //
      // Main branching (45% chance)
      //
      if (Math.random() < 0.45) {
        const sideBranches = growBranch(
          cx,
          cy,
          angle + rand(-0.8, 0.8),
          length * 0.6,
          thickness * 0.65,
          depth + 1,
          branchEndPoints
        )
        branchSegments.push(...sideBranches)
      }
      
      //
      // Continue upward
      //
      const continueBranches = growBranch(
        cx,
        cy,
        angle + rand(-0.25, 0.25),
        length * 0.75,
        thickness * 0.75,
        depth + 1,
        branchEndPoints
      )
      branchSegments.push(...continueBranches)
      
      return branchSegments
    }
    
    //
    // Generate roots from center point (growing downward)
    //
    const numMainRoots = 5
    const allRootSegments = []
    
    for (let i = 0; i < numMainRoots; i++) {
      //
      // All roots start from the same point (center)
      //
      const roots = growRoot(
        rootX,
        centerY,
        Math.PI / 2 + rand(-0.4, 0.4),  // Downward direction
        rand(6, 11),  // Reduced by 20% (was 8-14, now 6-11)
        rand(5, 7)
      )
      allRootSegments.push(...roots)
    }
    
    //
    // Generate branches from center point (growing upward - like a tree)
    //
    const branchEndPoints = []
    const allBranchSegments = []
    
    //
    // First, create a straight trunk section (no branches)
    //
    const trunkHeight = 20  // Straight trunk segments before branching starts (increased)
    const trunkStep = rand(5, 8)
    let trunkX = rootX
    let trunkY = centerY
    
    for (let i = 0; i < trunkHeight; i++) {
      const prevX = trunkX
      const prevY = trunkY
      
      //
      // Move straight up with minimal variation
      //
      trunkY -= trunkStep
      trunkX += rand(-1, 1)  // Slight horizontal variation
      
      allBranchSegments.push({
        startX: prevX,
        startY: prevY,
        endX: trunkX,
        endY: trunkY,
        width: 7,  // Trunk thickness
        depth: 0
      })
    }
    
    //
    // Now start branching from the top of the trunk
    //
    const mainBranches = growBranch(
      trunkX,
      trunkY,
      -Math.PI / 2,  // Upward direction
      16,  // Length segments for branches
      6,  // Starting thickness (slightly thinner than trunk)
      0,  // Initial depth
      branchEndPoints
    )
    allBranchSegments.push(...mainBranches)
    
    //
    // Crown configuration (removed, now using organic branches)
    //
    const crowns = []
    
    //
    // Colors: warm burnt-umber roots (the complementary warm half of the
    // touch section's teal+orange palette — replaces the previous near-
    // black brown that disappeared against the new teal playfield) and
    // muted warm-grey branches so the leafless skeleton still feels like
    // autumn wood rather than steel.
    //
    const branchColor = k.rgb(150, 130, 110)
    const rootColor = k.rgb(140, 78, 40)
    
    //
    // Generate leaf clusters at branch endpoints
    // Use autumn colors: reds, yellows, and oranges with variations
    //
    const leafClusters = []
    branchEndPoints.forEach(endPoint => {
      const leafCount = Math.floor(rand(18, 30))
      const leaves = []
      
      for (let j = 0; j < leafCount; j++) {
        const angle = rand(-Math.PI, Math.PI)
        const dist = rand(0, 70)
        
        //
        // Choose random autumn color type (red, yellow, or orange)
        //
        const colorType = Math.random()
        let leafColor
        if (colorType < 0.4) {
          //
          // Red leaves (40% chance)
          //
          leafColor = k.rgb(
            rand(180, 255),  // Red component
            rand(50, 100),   // Green component
            rand(50, 100)    // Blue component
          )
        } else if (colorType < 0.7) {
          //
          // Yellow leaves (30% chance)
          //
          leafColor = k.rgb(
            rand(220, 255),  // Red component
            rand(180, 220),  // Green component
            rand(50, 100)    // Blue component
          )
        } else {
          //
          // Orange leaves (30% chance)
          //
          leafColor = k.rgb(
            rand(220, 255),  // Red component
            rand(120, 180),  // Green component
            rand(50, 100)    // Blue component
          )
        }
        
        leaves.push({
          x: endPoint.x + Math.cos(angle) * dist,
          y: endPoint.y + Math.sin(angle) * dist * 0.6,
          size: rand(12, 22),
          rotation: rand(-1, 1),
          color: leafColor,
          opacity: rand(0.85, 1.0)
        })
      }
      
      leafClusters.push(leaves)
    })
    
    //
    // Pre-render tree to an offscreen canvas for performance using toCanvas
    //
    //
    // Calculate canvas size based on tree bounds
    //
    const minX = Math.min(...allRootSegments.map(s => Math.min(s.startX, s.endX)), ...allBranchSegments.map(s => Math.min(s.startX, s.endX)))
    const maxX = Math.max(...allRootSegments.map(s => Math.max(s.startX, s.endX)), ...allBranchSegments.map(s => Math.max(s.startX, s.endX)))
    const minY = Math.min(...allBranchSegments.map(s => Math.min(s.startY, s.endY)))
    const maxY = Math.max(...allRootSegments.map(s => Math.max(s.startY, s.endY)))
    
    //
    // Add padding for leaves (which extend beyond branches)
    //
    const padding = 250
    const canvasWidth = (maxX - minX) + padding * 2
    const canvasHeight = (maxY - minY) + padding * 2
    
    //
    // Offset to transform world coordinates to canvas coordinates
    //
    const offsetX = -minX + padding
    const offsetY = -minY + padding
    
    //
    // Convert canvas to data URL using toCanvas
    //
    const dataUrl = toCanvas({ width: canvasWidth, height: canvasHeight, pixelRatio: 1 }, (treeCtx) => {
      //
      // Draw root segments to canvas
      //
      allRootSegments.forEach(segment => {
        const opacity = 0.75 - segment.depth * 0.08
        treeCtx.strokeStyle = `rgba(${rootColor.r}, ${rootColor.g}, ${rootColor.b}, ${Math.max(0.3, opacity)})`
        treeCtx.lineWidth = segment.width
        treeCtx.lineCap = 'round'
        
        treeCtx.beginPath()
        treeCtx.moveTo(segment.startX + offsetX, segment.startY + offsetY)
        treeCtx.lineTo(segment.endX + offsetX, segment.endY + offsetY)
        treeCtx.stroke()
      })
      //
      // Draw branch segments to canvas
      //
      allBranchSegments.forEach(segment => {
        const opacity = 0.7 - segment.depth * 0.07
        treeCtx.strokeStyle = `rgba(${branchColor.r}, ${branchColor.g}, ${branchColor.b}, ${Math.max(0.3, opacity)})`
        treeCtx.lineWidth = segment.width
        treeCtx.lineCap = 'round'
        
        treeCtx.beginPath()
        treeCtx.moveTo(segment.startX + offsetX, segment.startY + offsetY)
        treeCtx.lineTo(segment.endX + offsetX, segment.endY + offsetY)
        treeCtx.stroke()
      })
    })
    const spriteName = `tree-${index}`
    //
    // Bake all leaf clusters to a sprite so draw() replaces thousands of
    // per-frame k.drawPolygon + k.drawLine calls with a single drawSprite.
    // Leaves keep their static positions; only the X shake offset is applied
    // when positioning the sprite, identical to how the branch sprite works.
    //
    const leafDataUrl = toCanvas({ width: canvasWidth, height: canvasHeight, pixelRatio: 1 }, (leafCtx) => {
      leafClusters.forEach(cluster => {
        cluster.forEach(leaf => {
          drawLeafToCanvas(
            leafCtx,
            leaf.x + offsetX,
            leaf.y + offsetY,
            leaf.size,
            leaf.rotation,
            leaf.color,
            leaf.opacity
          )
        })
      })
    })
    const leafSpriteName = `tree-leaf-${index}`
    //
    // White root-only sprite for glow overlay on note touch
    //
    const glowDataUrl = toCanvas({ width: canvasWidth, height: canvasHeight, pixelRatio: 1 }, (glowCtx) => {
      allRootSegments.forEach(segment => {
        const opacity = 0.9 - segment.depth * 0.06
        glowCtx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0.3, opacity)})`
        glowCtx.lineWidth = segment.width + 2
        glowCtx.lineCap = 'round'
        glowCtx.beginPath()
        glowCtx.moveTo(segment.startX + offsetX, segment.startY + offsetY)
        glowCtx.lineTo(segment.endX + offsetX, segment.endY + offsetY)
        glowCtx.stroke()
      })
    })
    const glowSpriteName = `tree-glow-${index}`

    //
    // Pre-cache mutable pos objects so draw() and drawGlow() never allocate vec2 per frame.
    // The x component is updated in-place when touchShake is active; y is always constant.
    //
    const spritePosBaseX = minX - padding
    const spritePosBaseY = minY - padding
    return {
      x: rootX,
      spriteName,
      leafSpriteName,
      glowSpriteName,
      dataUrl,
      leafDataUrl,
      glowDataUrl,
      minX,
      minY,
      padding,
      centerY,
      trunkTop: { x: trunkX, y: trunkY },
      trunkBottom: { x: rootX, y: centerY },
      noteFrequency: notes[index],
      isTouching: false,
      touchShake: 0,
      glowTimer: 0,
      swaySpeed: 0.1 + Math.random() * 0.05,
      swayOffset: Math.random() * Math.PI * 2,
      rootSegments: allRootSegments,
      //
      // Live leaf pool for FallingLeaf — positions match the baked sprite canopy
      //
      leafClusters,
      spritePosBaseX,
      spritePosBaseY,
      spritePos: k.vec2(spritePosBaseX, spritePosBaseY),
      glowPos: k.vec2(spritePosBaseX, spritePosBaseY)
    }
  })
  
  //
  // Load all sprites and wait for completion
  //
  await Promise.all(roots.map(root => {
    return new Promise((resolve) => {
      loadTouchSprite(k, root.spriteName, root.dataUrl)
      loadTouchSprite(k, root.leafSpriteName, root.leafDataUrl)
      loadTouchSprite(k, root.glowSpriteName, root.glowDataUrl)
      setTimeout(resolve, 50)
    })
  }))
  
  return {
    k,
    roots,
    floorY,
    audioContext: null,
    sfx: sfx ?? null,
    echoBus: null,
    //
    // Notes are disabled by default — enabled when the hero collects T letter
    //
    notesEnabled: false,
    //
    // 'same' plays one shared frequency for all trees; 'unique' uses each tree's own note
    //
    noteMode: 'same',
    //
    // Shared note for 'same' mode (C4)
    //
    sameNoteFreq: 261.63,
    //
    // When true, trees cycle through rainbow hues (CH end-game disco)
    //
    discoMode: false,
    discoTimer: 0
  }
}

/**
 * Activates disco mode: all trees cycle through rainbow hues and pulse to the beat.
 * Beat period ~0.5s (120 BPM) — trees shake briefly on each bass hit.
 * @param {Object} inst - Tree roots instance
 */
export function startDisco(inst) {
  inst.discoMode = true
  inst.discoTimer = 0
  //
  // Beat pulse: fires every DISCO_BEAT_INTERVAL seconds and triggers a short shake
  //
  inst.discoBeatTimer = 0
}

/**
 * Deactivates disco mode — trees return to normal tint.
 * @param {Object} inst - Tree roots instance
 */
export function stopDisco(inst) {
  inst.discoMode = false
}

/**
 * Enables tree notes in same-note mode (all trees play one shared tone).
 * Clears any leftover shake / glow so trees start calm.
 * @param {Object} inst - Tree roots instance
 */
export function enableSameNoteMode(inst) {
  inst.notesEnabled = true
  inst.noteMode = 'same'
  for (const root of inst.roots) {
    root.touchShake = 0
    root.glowTimer = 0
  }
}

/**
 * Enables tree notes in unique-note mode (each tree plays its own tone).
 * @param {Object} inst - Tree roots instance
 */
export function enableUniqueNoteMode(inst) {
  inst.notesEnabled = true
  inst.noteMode = 'unique'
}

/**
 * Draw tree roots
 * @param {Object} inst - Tree roots instance
 */
/**
 * Draw a single leaf to canvas context
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} size - Leaf size
 * @param {number} angle - Rotation angle
 * @param {Object} color - Leaf color (r, g, b)
 * @param {number} opacity - Leaf opacity
 */
function drawLeafToCanvas(ctx, x, y, size, angle, color, opacity) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  
  //
  // Draw filled leaf shape
  //
  ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(-size * 0.6, -size * 0.3, 0, -size)
  ctx.quadraticCurveTo(size * 0.6, -size * 0.3, 0, 0)
  ctx.closePath()
  ctx.fill()
  
  //
  // Draw center vein
  //
  ctx.strokeStyle = `rgba(40, 60, 40, ${0.35 * opacity})`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, -size)
  ctx.stroke()
  
  ctx.restore()
}


/**
 * Play a musical note using Web Audio API
 * @param {Object} inst - Tree roots instance
 * @param {number} frequency - Note frequency in Hz
 */
function playNote(inst, frequency) {
  const { k, sfx } = inst
  //
  // Prefer the level's shared Sound AudioContext (already unlocked by gameplay)
  //
  if (!inst.audioContext) {
    inst.audioContext = sfx?.audioContext
      ?? new (window.AudioContext || window.webkitAudioContext)()
  }

  const ctx = inst.audioContext
  ctx.state === 'suspended' && ctx.resume()
  //
  // Lazily build a shared echo bus: feedback delay with a lowpass filter
  // so each note naturally trails off into echoes. Output is mixed into
  // a single bus shared across all notes for a unified ambience.
  //
  if (!inst.echoBus) {
    const echoInput = ctx.createGain()
    const delay = ctx.createDelay(2.0)
    delay.delayTime.value = 0.32
    const feedback = ctx.createGain()
    feedback.gain.value = 0.42
    const echoFilter = ctx.createBiquadFilter()
    echoFilter.type = 'lowpass'
    echoFilter.frequency.value = 1800
    const echoOutput = ctx.createGain()
    echoOutput.gain.value = 0.6
    //
    // Routing: input -> delay -> filter -> [feedback loop] -> output
    //
    echoInput.connect(delay)
    delay.connect(echoFilter)
    echoFilter.connect(feedback)
    feedback.connect(delay)
    echoFilter.connect(echoOutput)
    echoOutput.connect(ctx.destination)
    inst.echoBus = echoInput
  }

  const now = ctx.currentTime
  //
  // Create oscillator for the note
  //
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, now)
  //
  // Envelope (fade in and out)
  //
  gainNode.gain.setValueAtTime(0, now)
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01)
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.2)
  gainNode.gain.linearRampToValueAtTime(0, now + 0.5)

  oscillator.connect(gainNode)
  //
  // Dry signal goes to destination, send a copy to the echo bus
  //
  gainNode.connect(ctx.destination)
  gainNode.connect(inst.echoBus)

  oscillator.start(now)
  oscillator.stop(now + 0.5)
}

/**
 * Play a musical note using Web Audio API (external call)
 * @param {Object} inst - Tree roots instance
 * @param {number} frequency - Note frequency in Hz
 */
export function playNoteExternal(inst, frequency) {
  playNote(inst, frequency)
}

/**
 * Check if hero is touching any tree trunk and play note
 * @param {Object} inst - Tree roots instance
 * @param {Object} heroCharacter - Hero's Kaplay character object
 * @param {number} [maxCheckDistance=Infinity] - Skip roots farther than this from hero X
 * @returns {number} Index of touched tree (-1 if none)
 */
export function checkHeroTreeCollision(inst, heroCharacter, maxCheckDistance = Infinity) {
  const { k, roots } = inst
  
  if (!heroCharacter || !heroCharacter.pos) return -1
  
  const heroX = heroCharacter.pos.x
  const heroY = heroCharacter.pos.y
  const heroWidth = 70  // Horizontal reach for trunk touch while walking
  const trunkWidth = 30  // Trunk collision half-width
  
  let touchedTreeIndex = -1
  
  for (let index = 0; index < roots.length; index++) {
    const root = roots[index]
    if (Math.abs(heroX - root.x) > maxCheckDistance) continue
    //
    // Check if hero is horizontally aligned with trunk
    //
    const isNearTrunk = Math.abs(heroX - root.x) < (heroWidth / 2 + trunkWidth / 2)
    
    //
    // Check if hero is vertically within trunk range
    // Extend the range slightly to catch fast-moving heroes
    //
    const verticalMargin = 50  // Extra margin to catch heroes in flight
    const isInTrunkHeight = heroY >= (root.trunkTop.y - verticalMargin) && 
                            heroY <= (root.trunkBottom.y + verticalMargin)
    
    //
    // Currently touching trunk
    //
    const isTouchingNow = isNearTrunk && isInTrunkHeight
    
    //
    // If just started touching (was not touching before, now touching)
    //
    if (isTouchingNow && !root.isTouching) {
      //
      // Only play audio and glow when notes are enabled (after T letter collected)
      //
      if (inst.notesEnabled) {
        const freq = inst.noteMode === 'same' ? inst.sameNoteFreq : root.noteFrequency
        playNote(inst, freq)
        //
        // Blink and shake only in unique-note mode (phase2+) — in same-note mode (phase1)
        // the trees are silent background actors and should not flash.
        //
        if (inst.noteMode !== 'same') {
          root.touchShake = 2
          root.glowTimer = 0.5
        }
      }
      touchedTreeIndex = index
    }
    
    //
    // Update touching state
    //
    root.isTouching = isTouchingNow
  }
  
  return touchedTreeIndex
}

/**
 * Update tree shake animations
 * @param {Object} inst - Tree roots instance
 * @param {number} [heroX] - Hero world X for proximity culling
 * @param {number} [maxUpdateDistance=Infinity] - Skip idle roots beyond this distance
 */
export function onUpdate(inst, heroX = null, maxUpdateDistance = Infinity) {
  const { roots } = inst
  
  const dt = inst.k.dt()
  for (const root of roots) {
    const dist = heroX == null ? 0 : Math.abs(root.x - heroX)
    const animating = root.touchShake > 0 || root.glowTimer > 0
    if (heroX != null && dist > maxUpdateDistance && !animating) continue
    //
    // Decay touch shake over time
    //
    if (root.touchShake > 0) {
      root.touchShake *= 0.9
      if (root.touchShake < 0.1) {
        root.touchShake = 0
      }
    }
    //
    // Decay root glow timer
    //
    if (root.glowTimer > 0) {
      root.glowTimer = Math.max(0, root.glowTimer - dt)
    }
  }
}

export function draw(inst) {
  const { k, roots } = inst
  const time = k.time()
  //
  // Disco mode: advance timers and trigger beat shake on each beat pulse
  //
  if (inst.discoMode) {
    //
    // Advance color-cycle timer only — no touchShake so trees stay still while
    // cycling through rainbow hues (user asked to remove the beat shaking).
    //
    inst.discoTimer += k.dt()
  }
  for (let idx = 0; idx < roots.length; idx++) {
    const root = roots[idx]
    //
    // Mutate pre-cached pos in place — avoids vec2 allocation per frame.
    // X offset is only non-zero while touchShake > 0 (brief touch feedback).
    //
    root.spritePos.x = root.spritePosBaseX + (root.touchShake !== 0 ? Math.sin(time * 30) * root.touchShake : 0)
    if (inst.discoMode) {
      //
      // Each tree cycles hue at a slightly different phase for wave effect
      //
      const hue = ((inst.discoTimer * 120 + idx * 55) % 360) / 360
      const [dr, dg, db] = hslToRgb(hue, 0.85, 0.65)
      const tint = k.rgb(dr, dg, db)
      k.drawSprite({ sprite: root.leafSpriteName, pos: root.spritePos, color: tint })
      k.drawSprite({ sprite: root.spriteName, pos: root.spritePos, color: tint })
    } else {
      //
      // Draw baked leaf sprite BEFORE the branch sprite so branches cover them.
      // A single drawSprite replaces thousands of per-frame drawPolygon + drawLine calls.
      //
      k.drawSprite({ sprite: root.leafSpriteName, pos: root.spritePos })
      //
      // Draw pre-rendered tree sprite (roots + branches)
      //
      k.drawSprite({ sprite: root.spriteName, pos: root.spritePos })
    }
  }
}
/**
 * Draws blinking white root overlay for trees whose glowTimer is active
 * @param {Object} inst - Tree roots instance
 */
export function drawGlow(inst) {
  const { k, roots } = inst
  const time = k.time()
  for (const root of roots) {
    if (root.glowTimer <= 0) continue
    //
    // Mutate pre-cached glow pos in place — no vec2 allocation.
    //
    root.glowPos.x = root.spritePosBaseX + (root.touchShake !== 0 ? Math.sin(time * 30) * root.touchShake : 0)
    //
    // Blink at ~10Hz, fade out during last 0.5s of the timer
    //
    const blink = (Math.sin(time * 10) + 1) / 2
    const fadeOut = Math.min(1, root.glowTimer / 0.15)
    const alpha = (0.4 + blink * 0.6) * fadeOut
    k.drawSprite({
      sprite: root.glowSpriteName,
      pos: root.glowPos,
      opacity: alpha
    })
  }
}
//
// Converts HSL (0-1 range each) to [r, g, b] in 0-255 range
//
function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h * 6) % 2 - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 1 / 6) { r = c; g = x }
  else if (h < 2 / 6) { r = x; g = c }
  else if (h < 3 / 6) { g = c; b = x }
  else if (h < 4 / 6) { g = x; b = c }
  else if (h < 5 / 6) { r = x; b = c }
  else { r = c; b = x }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

