import { CFG } from '../cfg.js'
import { toCanvas } from '../../../utils/helper.js'
import { loadTouchSprite } from '../../../utils/touch-sprite-registry.js'
import { growTreeRootSegments } from '../../../utils/grow-tree-root.js'

//
// Note-tree horizontal positions (7 trees between 25%–75% of play area)
//
const NOTE_TREE_COUNT = 7
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
 * @returns {Promise<Object>} Tree roots instance
 */
export async function create(config) {
  const { k, floorY, leftMargin, rightMargin, screenWidth } = config
  
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
      // Draw branch segments to canvas (leaves are drawn dynamically now)
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

    return {
      x: rootX,
      spriteName,
      glowSpriteName,
      dataUrl,
      glowDataUrl,
      minX,
      minY,
      padding,
      centerY,
      leafClusters,
      trunkTop: { x: trunkX, y: trunkY },
      trunkBottom: { x: rootX, y: centerY },
      noteFrequency: notes[index],
      isTouching: false,
      touchShake: 0,
      glowTimer: 0,
      swaySpeed: 0.1 + Math.random() * 0.05,
      swayOffset: Math.random() * Math.PI * 2,
      rootSegments: allRootSegments
    }
  })
  
  //
  // Load all sprites and wait for completion
  //
  await Promise.all(roots.map(root => {
    return new Promise((resolve) => {
      loadTouchSprite(k, root.spriteName, root.dataUrl)
      loadTouchSprite(k, root.glowSpriteName, root.glowDataUrl)
      setTimeout(resolve, 50)
    })
  }))
  
  return {
    k,
    roots,
    floorY,
    audioContext: null
  }
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
 * Draw a single leaf using quadratic curves
 * @param {Object} k - Kaplay instance
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} size - Leaf size
 * @param {number} angle - Rotation angle
 * @param {Object} color - Leaf color
 * @param {number} opacity - Leaf opacity
 */
//
// Local-space leaf polygons cached by quantized size. Each leaf used to
// rebuild 22 bezier points + 22 vec2 objects every single frame; reusing
// the cached template (and pushing a transform once per leaf) eliminates
// thousands of allocations per render at no visual cost.
//
const LEAF_POINT_CACHE = new Map()
//
// Reusable vec2s for the leaf vein, hoisted so each leaf draw doesn't
// allocate two more objects.
//
let _leafVeinP1 = null
let _leafVeinP2 = null

function getLeafTemplate(k, size) {
  const key = Math.round(size * 4)
  let pts = LEAF_POINT_CACHE.get(key)
  if (pts) return pts
  pts = []
  const steps = 10
  //
  // Left side: bezier base → tip (P0=(0,0), P1=(-s*0.6,-s*0.3), P2=(0,-s))
  //
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const px = 2 * (1 - t) * t * (-size * 0.6)
    const py = 2 * (1 - t) * t * (-size * 0.3) + t * t * (-size)
    pts.push(k.vec2(px, py))
  }
  //
  // Right side: bezier tip → base, mirrored
  //
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const px = 2 * (1 - t) * t * (size * 0.6)
    const py = (1 - t) * (1 - t) * (-size) + 2 * (1 - t) * t * (-size * 0.3)
    pts.push(k.vec2(px, py))
  }
  LEAF_POINT_CACHE.set(key, pts)
  return pts
}

function drawLeaf(k, x, y, size, angle, color, opacity) {
  const pts = getLeafTemplate(k, size)
  //
  // Push transform once: the cached point template is in local-leaf space,
  // so a translate+rotate places it correctly without recomputing points.
  //
  k.pushTransform()
  k.pushTranslate(x, y)
  k.pushRotate((angle * 180) / Math.PI)
  k.drawPolygon({
    pts,
    color,
    opacity
  })
  //
  // Vein in local space — base (0,0) to tip (0,-size). Reuse pre-allocated
  // vec2s so this branch never allocates either.
  //
  if (!_leafVeinP1) {
    _leafVeinP1 = k.vec2(0, 0)
    _leafVeinP2 = k.vec2(0, 0)
  }
  _leafVeinP1.x = 0; _leafVeinP1.y = 0
  _leafVeinP2.x = 0; _leafVeinP2.y = -size
  k.drawLine({
    p1: _leafVeinP1,
    p2: _leafVeinP2,
    width: 1,
    color: k.rgb(40, 60, 40),
    opacity: 0.35
  })
  k.popTransform()
}

/**
 * Play a musical note using Web Audio API
 * @param {Object} inst - Tree roots instance
 * @param {number} frequency - Note frequency in Hz
 */
function playNote(inst, frequency) {
  const { k } = inst

  if (!inst.audioContext) {
    inst.audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }

  const ctx = inst.audioContext
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
 * @returns {number} Index of touched tree (-1 if none)
 */
export function checkHeroTreeCollision(inst, heroCharacter) {
  const { k, roots } = inst
  
  if (!heroCharacter || !heroCharacter.pos) return -1
  
  const heroX = heroCharacter.pos.x
  const heroY = heroCharacter.pos.y
  const heroWidth = 60  // Increased width for better detection during flight
  const trunkWidth = 25  // Increased trunk collision width
  
  let touchedTreeIndex = -1
  
  roots.forEach((root, index) => {
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
      playNote(inst, root.noteFrequency)
      //
      // Start tree shake animation and root glow blink
      //
      root.touchShake = 2
      root.glowTimer = 0.5
      touchedTreeIndex = index
    }
    
    //
    // Update touching state
    //
    root.isTouching = isTouchingNow
  })
  
  return touchedTreeIndex
}

/**
 * Update tree shake animations
 * @param {Object} inst - Tree roots instance
 */
export function onUpdate(inst) {
  const { roots } = inst
  
  const dt = inst.k.dt()
  roots.forEach(root => {
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
  })
}

export function draw(inst) {
  const { k, roots } = inst
  const time = k.time()

  roots.forEach(root => {
    //
    // Only shake when touched (no natural sway)
    //
    const touchShakeOffset = Math.sin(time * 30) * root.touchShake
    //
    // Draw leaves dynamically BEFORE the sprite so branches cover them
    //
    for (const cluster of root.leafClusters) {
      for (const leaf of cluster) {
        drawLeaf(k, leaf.x + touchShakeOffset, leaf.y, leaf.size, leaf.rotation, leaf.color, leaf.opacity)
      }
    }
    //
    // Draw pre-rendered tree sprite (roots + branches only)
    // Sprite's top-left corner is at (minX - padding, minY - padding)
    //
    k.drawSprite({
      sprite: root.spriteName,
      pos: k.vec2(
        root.minX - root.padding + touchShakeOffset,
        root.minY - root.padding
      )
    })
  })
}
/**
 * Draws blinking white root overlay for trees whose glowTimer is active
 * @param {Object} inst - Tree roots instance
 */
export function drawGlow(inst) {
  const { k, roots } = inst
  const time = k.time()
  roots.forEach(root => {
    if (root.glowTimer <= 0) return
    const touchShakeOffset = Math.sin(time * 30) * root.touchShake
    //
    // Blink at ~10Hz, fade out during last 0.5s of the timer
    //
    const blink = (Math.sin(time * 10) + 1) / 2
    const fadeOut = Math.min(1, root.glowTimer / 0.15)
    const alpha = (0.4 + blink * 0.6) * fadeOut
    k.drawSprite({
      sprite: root.glowSpriteName,
      pos: k.vec2(
        root.minX - root.padding + touchShakeOffset,
        root.minY - root.padding
      ),
      opacity: alpha
    })
  })
}

