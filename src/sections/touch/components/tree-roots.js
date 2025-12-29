import { CFG } from '../cfg.js'

/**
 * Creates tree roots that grow from the bottom platform upward
 * Uses organic growth algorithm for realistic root structures
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.floorY - Y position of the floor/platform
 * @param {number} config.leftMargin - Left margin of playable area
 * @param {number} config.rightMargin - Right margin of playable area
 * @param {number} config.screenWidth - Screen width
 * @returns {Object} Tree roots instance
 */
export function create(config) {
  const { k, floorY, leftMargin, rightMargin, screenWidth } = config
  
  //
  // Random helper
  //
  const rand = (min, max) => min + Math.random() * (max - min)
  
  //
  // Create 4 tree roots closer together
  // Distribute within 30%-70% of playable area (instead of full width)
  //
  const playableWidth = screenWidth - leftMargin - rightMargin
  const startOffset = 0.25  // Start at 25% from left
  const endOffset = 0.75    // End at 75% from left
  const treeSpan = endOffset - startOffset
  
  const rootPositions = [
    leftMargin + playableWidth * (startOffset + treeSpan * 0.125),  // ~27.5%
    leftMargin + playableWidth * (startOffset + treeSpan * 0.375),  // ~43.75%
    leftMargin + playableWidth * (startOffset + treeSpan * 0.625),  // ~56.25%
    leftMargin + playableWidth * (startOffset + treeSpan * 0.875)   // ~72.5%
  ]
  
  //
  // Center Y position is exactly at floorY (top of bottom platform)
  //
  const centerY = floorY
  
  //
  // Musical notes (C, D, E, F) - assign one note per tree
  //
  const notes = [261.63, 293.66, 329.63, 349.23]  // C4, D4, E4, F4 frequencies
  
  const roots = rootPositions.map((rootX, index) => {
    //
    // Organic root growth algorithm (adapted from canvas example)
    //
    const growRoot = (x, y, angle, segments, thickness, depth = 0) => {
      const rootSegments = []
      
      if (segments <= 0 || thickness <= 0.4 || depth > 6) {
        return rootSegments
      }
      
      const step = rand(4, 7)
      let cx = x
      let cy = y
      
      //
      // Build root path with organic curvature
      //
      for (let i = 0; i < segments; i++) {
        const prevX = cx
        const prevY = cy
        
        //
        // Organic curvature
        //
        angle += rand(-0.18, 0.18)
        cx += Math.cos(angle) * step
        cy += Math.sin(angle) * step
        
        //
        // Add segment
        //
        rootSegments.push({
          startX: prevX,
          startY: prevY,
          endX: cx,
          endY: cy,
          width: thickness,
          depth
        })
        
        //
        // Micro roots (small side branches)
        //
        if (Math.random() < 0.08 && depth < 5) {
          const microRoots = growRoot(
            cx,
            cy,
            angle + rand(-1.5, 1.5),
            rand(2, 4),
            thickness * 0.35,
            depth + 2
          )
          rootSegments.push(...microRoots)
        }
      }
      
      //
      // Main branching (40% chance)
      //
      if (Math.random() < 0.4) {
        const branchRoots = growRoot(
          cx,
          cy,
          angle + rand(-1, 1),
          segments * 0.6,
          thickness * 0.6,
          depth + 1
        )
        rootSegments.push(...branchRoots)
      }
      
      //
      // Continue main root
      //
      const continueRoots = growRoot(
        cx,
        cy,
        angle + rand(-0.3, 0.3),
        segments * 0.8,
        thickness * 0.8,
        depth + 1
      )
      rootSegments.push(...continueRoots)
      
      return rootSegments
    }
    
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
    // Colors (brownish roots and grayish branches like in example)
    //
    const branchColor = k.rgb(120, 120, 120)  // Gray branches like in example
    const rootColor = k.rgb(70, 45, 30)  // Base root color
    
    //
    // Generate leaf clusters at branch endpoints
    //
    const leafClusters = []
    branchEndPoints.forEach(endPoint => {
      const leafCount = Math.floor(rand(18, 30))
      const leaves = []
      
      for (let j = 0; j < leafCount; j++) {
        const angle = rand(-Math.PI, Math.PI)
        const dist = rand(0, 70)
        
        leaves.push({
          x: endPoint.x + Math.cos(angle) * dist,
          y: endPoint.y + Math.sin(angle) * dist * 0.6,
          size: rand(12, 22),
          rotation: rand(-1, 1),
          color: k.rgb(
            rand(70, 110),
            rand(110, 150),
            rand(70, 110)
          ),
          opacity: rand(0.85, 1.0)
        })
      }
      
      leafClusters.push(leaves)
    })
    
    return {
      x: rootX,
      rootSegments: allRootSegments,
      branchSegments: allBranchSegments,
      leafClusters,
      centerY,
      branchColor,
      rootColor,
      trunkTop: { x: trunkX, y: trunkY },
      trunkBottom: { x: rootX, y: centerY },
      noteFrequency: notes[index],
      isTouching: false,
      touchShake: 0,
      swaySpeed: 0.1 + Math.random() * 0.05,
      swayOffset: Math.random() * Math.PI * 2
    }
  })
  
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
 * Draw a single leaf using quadratic curves
 * @param {Object} k - Kaplay instance
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} size - Leaf size
 * @param {number} angle - Rotation angle
 * @param {Object} color - Leaf color
 * @param {number} opacity - Leaf opacity
 */
function drawLeaf(k, x, y, size, angle, color, opacity) {
  //
  // Draw leaf shape using polygon (approximating quadratic curve)
  //
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  
  //
  // Create leaf shape points (approximating bezier curve)
  //
  const points = []
  const steps = 10
  
  //
  // Left side of leaf (quadratic curve from base to tip)
  //
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    //
    // Quadratic bezier: P = (1-t)^2 * P0 + 2*(1-t)*t * P1 + t^2 * P2
    // P0 = (0, 0), P1 = (-size*0.6, -size*0.3), P2 = (0, -size)
    //
    const px = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * (-size * 0.6) + t * t * 0
    const py = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * (-size * 0.3) + t * t * (-size)
    
    //
    // Rotate and translate point
    //
    points.push(k.vec2(
      x + px * cos - py * sin,
      y + px * sin + py * cos
    ))
  }
  
  //
  // Right side of leaf (quadratic curve from tip to base)
  //
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    //
    // Quadratic bezier: P = (1-t)^2 * P0 + 2*(1-t)*t * P1 + t^2 * P2
    // P0 = (0, -size), P1 = (size*0.6, -size*0.3), P2 = (0, 0)
    //
    const px = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * (size * 0.6) + t * t * 0
    const py = (1 - t) * (1 - t) * (-size) + 2 * (1 - t) * t * (-size * 0.3) + t * t * 0
    
    //
    // Rotate and translate point
    //
    points.push(k.vec2(
      x + px * cos - py * sin,
      y + px * sin + py * cos
    ))
  }
  
  //
  // Draw filled leaf
  //
  k.drawPolygon({
    pts: points,
    color: color,
    opacity: opacity
  })
  
  //
  // Draw center vein (line from base to tip)
  //
  const veinEndX = x + 0 * cos - (-size) * sin
  const veinEndY = y + 0 * sin + (-size) * cos
  
  k.drawLine({
    p1: k.vec2(x, y),
    p2: k.vec2(veinEndX, veinEndY),
    width: 1,
    color: k.rgb(40, 60, 40),
    opacity: 0.35
  })
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
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01)  // Quick fade in
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.2)   // Sustain
  gainNode.gain.linearRampToValueAtTime(0, now + 0.5)     // Fade out
  
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  
  oscillator.start(now)
  oscillator.stop(now + 0.5)
}

/**
 * Check if hero is touching any tree trunk and play note
 * @param {Object} inst - Tree roots instance
 * @param {Object} heroCharacter - Hero's Kaplay character object
 */
export function checkHeroTreeCollision(inst, heroCharacter) {
  const { k, roots } = inst
  
  if (!heroCharacter || !heroCharacter.pos) return
  
  const heroX = heroCharacter.pos.x
  const heroY = heroCharacter.pos.y
  const heroWidth = 30  // Approximate hero width
  const trunkWidth = 15  // Trunk collision width
  
  roots.forEach(root => {
    //
    // Check if hero is horizontally aligned with trunk
    //
    const isNearTrunk = Math.abs(heroX - root.x) < (heroWidth / 2 + trunkWidth / 2)
    
    //
    // Check if hero is vertically within trunk range
    //
    const isInTrunkHeight = heroY >= root.trunkTop.y && heroY <= root.trunkBottom.y
    
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
      // Start tree shake animation
      //
      root.touchShake = 8
    }
    
    //
    // Update touching state
    //
    root.isTouching = isTouchingNow
  })
}

/**
 * Update tree shake animations
 * @param {Object} inst - Tree roots instance
 */
export function onUpdate(inst) {
  const { roots } = inst
  
  roots.forEach(root => {
    //
    // Decay touch shake over time
    //
    if (root.touchShake > 0) {
      root.touchShake *= 0.9  // Exponential decay
      if (root.touchShake < 0.1) {
        root.touchShake = 0
      }
    }
  })
}

export function draw(inst) {
  const { k, roots } = inst
  const time = k.time()
  
  roots.forEach(root => {
    const sway = Math.sin(time * root.swaySpeed + root.swayOffset) * 2
    //
    // Add touch shake (oscillating left-right)
    //
    const touchShakeOffset = Math.sin(time * 30) * root.touchShake
    const totalSway = sway + touchShakeOffset
    
    //
    // Draw root segments (growing downward)
    // Roots shake very little (close to base)
    //
    root.rootSegments.forEach(segment => {
      //
      // Calculate opacity based on depth (like in original: 0.75 - depth * 0.08)
      //
      const opacity = 0.75 - segment.depth * 0.08
      
      //
      // Roots shake minimally (10% of total sway)
      //
      k.drawLine({
        p1: k.vec2(segment.startX + totalSway * 0.1, segment.startY),
        p2: k.vec2(segment.endX + totalSway * 0.1, segment.endY),
        width: segment.width,
        color: root.rootColor,
        opacity: Math.max(0.3, opacity)
      })
    })
    
    //
    // Draw leaf clusters (behind branches)
    // Leaves shake the most (far from base)
    //
    root.leafClusters.forEach(cluster => {
      cluster.forEach(leaf => {
        //
        // Calculate shake based on leaf height (distance from base)
        // Higher leaves shake more
        //
        const leafHeightFromBase = root.centerY - leaf.y
        const heightFactor = Math.max(0, leafHeightFromBase / 400)  // Normalize by expected max height
        const leafShake = totalSway * (1.0 + heightFactor * 2.0)  // Leaves shake 1x-3x more
        
        drawLeaf(
          k,
          leaf.x + leafShake,
          leaf.y,
          leaf.size,
          leaf.rotation,
          leaf.color,
          leaf.opacity
        )
      })
    })
    
    //
    // Draw branch segments (growing upward - tree structure)
    // Shake increases with height from base
    //
    root.branchSegments.forEach(segment => {
      //
      // Calculate opacity based on depth (0.7 - depth * 0.07 like in example)
      //
      const opacity = 0.7 - segment.depth * 0.07
      
      //
      // Apply more sway to higher parts of tree
      // Height factor: 0 at base (centerY), 1 at ~200px above
      //
      const heightFromBase = root.centerY - segment.startY
      const heightFactor = Math.max(0, heightFromBase / 200)
      //
      // Trunk (near base): 0.2x sway
      // Middle branches: 0.5-1.5x sway
      // Top branches: 1.5-2.5x sway
      //
      const segmentSway = totalSway * (0.2 + heightFactor * 1.5)
      
      k.drawLine({
        p1: k.vec2(segment.startX + segmentSway, segment.startY),
        p2: k.vec2(segment.endX + segmentSway, segment.endY),
        width: segment.width,
        color: root.branchColor,
        opacity: Math.max(0.3, opacity)
      })
    })
  })
}

