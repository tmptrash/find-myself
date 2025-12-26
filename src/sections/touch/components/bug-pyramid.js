import { CFG } from '../../../cfg.js'
import { getRGB } from '../../../utils/helper.js'
//
// Pyramid parameters
//
const GROUP_DETECTION_RADIUS = 40  // Distance for bugs to form a group
const PYRAMID_DURATION = 5.0  // How long pyramid exists (seconds)
const TRAMPOLINE_BOUNCE_FORCE = 1200  // Bounce force for hero
const BUG_SPACING = 20  // Spacing between bugs in pyramid
const PYRAMID_BASE_HEIGHT = 8  // Height of pyramid base (for collision) - reduced to make hero land lower
const JOIN_DETECTION_RADIUS = 60  // Distance for bugs to join existing tower
//
// Calculate tower layout based on bug count
// Bugs stack vertically on top of each other
// For many bugs, can have multiple bugs per level
//
function calculateTowerLayout(bugCount) {
  if (bugCount < 5) return null
  
  const levels = []
  
  if (bugCount === 5) {
    levels.push(2, 2, 1)  // 2 bottom, 2 middle, 1 top
  } else if (bugCount === 6) {
    levels.push(2, 2, 2)  // 2 per level
  } else if (bugCount === 7) {
    levels.push(3, 2, 2)  // 3 bottom, 2 middle, 2 top
  } else if (bugCount === 8) {
    levels.push(3, 3, 2)  // 3 bottom, 3 middle, 2 top
  } else if (bugCount === 9) {
    levels.push(3, 3, 3)  // 3 per level
  } else if (bugCount === 10) {
    levels.push(4, 3, 3)  // 4 bottom, 3 middle, 3 top
  } else if (bugCount === 11) {
    levels.push(4, 4, 3)  // 4 bottom, 4 middle, 3 top
  } else if (bugCount === 12) {
    levels.push(4, 4, 4)  // 4 per level
  } else {
    //
    // For larger groups, create vertical tower
    // More bugs = more levels = taller tower
    // Calculate number of levels based on bug count (roughly 2-3 bugs per level)
    //
    const numLevels = Math.max(3, Math.ceil(bugCount / 2.5))  // More levels for more bugs
    const bugsPerLevel = Math.ceil(bugCount / numLevels)
    let remaining = bugCount
    
    for (let i = 0; i < numLevels && remaining > 0; i++) {
      const levelSize = Math.min(bugsPerLevel, remaining)
      levels.push(levelSize)
      remaining -= levelSize
    }
  }
  
  //
  // Reverse to get bottom-up order (bottom level first)
  //
  levels.reverse()
  
  return levels
}

/**
 * Creates a bug pyramid from a group of bugs
 * @param {Object} config - Pyramid configuration
 * @param {Object} config.k - Kaplay instance
 * @param {Array} config.bugs - Array of bug instances
 * @param {Object} config.hero - Hero instance
 * @returns {Object} Pyramid instance
 */
export function create(config) {
  const { k, bugs, hero } = config
  
  if (bugs.length < 5) return null
  
  //
  // Calculate tower layout (vertical stacking)
  //
  const layout = calculateTowerLayout(bugs.length)
  if (!layout) return null
  
  //
  // Calculate center position (average of bug positions)
  //
  let centerX = 0
  let centerY = 0
  bugs.forEach(bug => {
    centerX += bug.x
    centerY += bug.y
  })
  centerX /= bugs.length
  centerY /= bugs.length
  
  //
  // Store original bug states
  //
  const bugStates = bugs.map(bug => ({
    inst: bug,
    originalX: bug.x,
    originalY: bug.y,
    originalState: bug.state,
    originalVx: bug.vx,
    originalVy: bug.vy
  }))
  
  //
  // Position bugs in vertical tower formation
  // Bugs stack on top of each other
  //
  let bugIndex = 0
  const pyramidPositions = []
  //
  // Use floor Y from first bug (all bugs should be on same floor level)
  //
  const floorY = centerY
  //
  // Bug body size for vertical spacing
  //
  const BUG_BODY_SIZE = 6  // From bugs.js
  const BASE_BUG_HEIGHT = BUG_BODY_SIZE * 1.5 * 2  // Base bug height (body size * scale * 2)
  const VERTICAL_SPACING = BASE_BUG_HEIGHT * 0.6  // Spacing between levels (bugs overlap slightly)
  
  //
  // Calculate tower height and width
  //
  let currentY = floorY
  let topLevelY = floorY  // Store top level Y position
  let topLevelMaxRadius = 0  // Store max bug radius on top level
  
  layout.forEach((levelSize, levelIndex) => {
    //
    // Calculate horizontal positions for bugs on this level
    //
    const levelWidth = levelSize * BUG_SPACING
    const startX = centerX - levelWidth / 2 + BUG_SPACING / 2
    
    //
    // Track tallest bug on this level for next level positioning
    //
    let maxBugHeight = 0
    
    for (let i = 0; i < levelSize && bugIndex < bugs.length; i++) {
      const bug = bugs[bugIndex]
      const targetX = startX + i * BUG_SPACING
      //
      // Calculate bug height based on its scale
      //
      const bugHeight = BUG_BODY_SIZE * 1.5 * bug.scale * 2
      maxBugHeight = Math.max(maxBugHeight, bugHeight)
      
      //
      // Track top level bug radius for platform positioning
      //
      if (levelIndex === layout.length - 1) {
        const bugRadius = BUG_BODY_SIZE * 1.5 * bug.scale
        topLevelMaxRadius = Math.max(topLevelMaxRadius, bugRadius)
      }
      
      const targetY = currentY  // Stack vertically
      
      //
      // Stop bug movement
      //
      bug.state = 'pyramid'
      bug.vx = 0
      bug.vy = 0
      
      pyramidPositions.push({
        bug,
        targetX,
        targetY,
        levelIndex
      })
      
      bugIndex++
    }
    
    //
    // Save top level Y position before moving up
    //
    if (levelIndex === layout.length - 1) {
      topLevelY = currentY
    }
    
    //
    // Move up for next level based on tallest bug on current level
    //
    currentY -= maxBugHeight * 0.6
  })
  
  //
  // Create collision platform for trampoline
  // Platform is positioned on top of top-level bugs' backs
  //
  const maxLevelSize = Math.max(...layout)
  const towerWidth = maxLevelSize * BUG_SPACING
  //
  // Find actual top level bugs and calculate platform position from their real positions
  //
  const topLevelBugs = pyramidPositions.filter(p => p.levelIndex === layout.length - 1)
  let actualTopLevelY = topLevelY
  let actualTopLevelMaxRadius = topLevelMaxRadius
  
  if (topLevelBugs.length > 0) {
    //
    // Use actual bug positions and radii
    //
    actualTopLevelY = topLevelBugs[0].targetY
    actualTopLevelMaxRadius = 0
    topLevelBugs.forEach(({ bug }) => {
      const bugRadius = BUG_BODY_SIZE * 1.5 * bug.scale
      actualTopLevelMaxRadius = Math.max(actualTopLevelMaxRadius, bugRadius)
    })
  }
  //
  // Platform should be on top of bugs' backs (top of bug body)
  // Bug center is at actualTopLevelY, bug top (back) is at actualTopLevelY - actualTopLevelMaxRadius
  // Position platform at bugs' backs level
  //
  const bugTopY = actualTopLevelY - actualTopLevelMaxRadius  // Top of bug (back)
  //
  // Position platform so its top edge is at bugs' backs level
  // With anchor "top", platform Y is at top edge
  //
  const platformY = bugTopY + PYRAMID_BASE_HEIGHT / 2  // Adjust for anchor "top"
  
  const platform = k.add([
    k.rect(towerWidth, PYRAMID_BASE_HEIGHT),
    k.pos(centerX, platformY),
    k.anchor("top"),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),  // Invisible collision
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName,  // Allow hero to jump from platform
    "bug-pyramid-trampoline"  // Also tag for trampoline effect
  ])
  
  //
  // Handle hero collision with trampoline (bounce effect)
  // Hero can also jump normally from this platform
  //
  let lastBounceTime = 0
  
  const inst = {
    k,
    bugs: bugStates,
    pyramidPositions,
    platform,
    hero,
    centerX,
    centerY,
    layout,
    timer: 0,
    lastBounceTime: 0,
    isActive: true
  }
  
  return inst
}

/**
 * Update pyramid - animate bugs into position, handle timer, and check hero collision
 * @param {Object} inst - Pyramid instance
 * @param {number} dt - Delta time
 */
export function onUpdate(inst, dt) {
  if (!inst.isActive) return
  
  inst.timer += dt
  
  //
  // Animate bugs moving into tower positions
  // Bugs move both horizontally and vertically to stack
  //
  const animationSpeed = 200  // pixels per second
  inst.pyramidPositions.forEach(({ bug, targetX, targetY }) => {
    const dx = targetX - bug.x
    const dy = targetY - bug.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    if (dist > 1) {
      const moveDist = Math.min(dist, animationSpeed * dt)
      //
      // Move both horizontally and vertically
      //
      bug.x += (dx / dist) * moveDist
      bug.y += (dy / dist) * moveDist
    } else {
      bug.x = targetX
      bug.y = targetY
    }
  })
  
  //
  // Platform collision is handled automatically via CFG.game.platformName tag
  // Hero can jump normally from the platform
  // No need for manual collision handling - Kaplay handles it automatically
  //
  
  //
  // Check if pyramid duration expired
  //
  if (inst.timer >= PYRAMID_DURATION) {
    //
    // Force destroy pyramid
    //
    destroy(inst)
    return  // Stop updating after destroy
  }
}

/**
 * Draw pyramid (visual representation)
 * @param {Object} inst - Pyramid instance
 */
export function draw(inst) {
  if (!inst.isActive) return
  
  const { k, pyramidPositions, centerX, centerY, layout } = inst
  
  //
  // Draw bugs in their pyramid positions
  // Bugs are drawn by Bugs.draw() function, we just ensure they're positioned correctly
  //
  // Could add visual effects here if needed
  //
}

/**
 * Add a bug to existing pyramid tower
 * @param {Object} inst - Pyramid instance
 * @param {Object} bug - Bug instance to add
 */
export function addBug(inst, bug) {
  if (!inst.isActive) return false
  
  //
  // Check if bug is already in pyramid
  //
  const alreadyInPyramid = inst.bugs.some(b => b.inst === bug)
  if (alreadyInPyramid) return false
  
  //
  // Add bug to pyramid
  //
  const bugState = {
    inst: bug,
    originalX: bug.x,
    originalY: bug.y,
    originalState: bug.state,
    originalVx: bug.vx,
    originalVy: bug.vy
  }
  
  inst.bugs.push(bugState)
  
  //
  // Recalculate tower layout with new bug count
  //
  const newLayout = calculateTowerLayout(inst.bugs.length)
  if (!newLayout) return false
  
  inst.layout = newLayout
  
  //
  // Recalculate center position
  //
  let centerX = 0
  let centerY = 0
  inst.bugs.forEach(({ inst: b }) => {
    centerX += b.x
    centerY += b.y
  })
  centerX /= inst.bugs.length
  centerY /= inst.bugs.length
  inst.centerX = centerX
  inst.centerY = centerY
  
  //
  // Recalculate all bug positions
  //
  const BUG_BODY_SIZE = 6
  const floorY = centerY
  let bugIndex = 0
  let currentY = floorY
  let topLevelY = floorY  // Store top level Y position
  let topLevelMaxRadius = 0  // Store max bug radius on top level
  
  inst.pyramidPositions = []
  
  newLayout.forEach((levelSize, levelIndex) => {
    const levelWidth = levelSize * BUG_SPACING
    const startX = centerX - levelWidth / 2 + BUG_SPACING / 2
    
    let maxBugHeight = 0
    
    for (let i = 0; i < levelSize && bugIndex < inst.bugs.length; i++) {
      const b = inst.bugs[bugIndex].inst
      const targetX = startX + i * BUG_SPACING
      const bugHeight = BUG_BODY_SIZE * 1.5 * b.scale * 2
      maxBugHeight = Math.max(maxBugHeight, bugHeight)
      
      //
      // Track top level bug radius for platform positioning
      //
      if (levelIndex === newLayout.length - 1) {
        const bugRadius = BUG_BODY_SIZE * 1.5 * b.scale
        topLevelMaxRadius = Math.max(topLevelMaxRadius, bugRadius)
      }
      
      const targetY = currentY
      
      b.state = 'pyramid'
      b.vx = 0
      b.vy = 0
      
      inst.pyramidPositions.push({
        bug: b,
        targetX,
        targetY,
        levelIndex
      })
      
      bugIndex++
    }
    
    //
    // Save top level Y position before moving up
    //
    if (levelIndex === newLayout.length - 1) {
      topLevelY = currentY
    }
    
    currentY -= maxBugHeight * 0.6
  })
  
  //
  // Update platform position
  // Find actual top level bugs and calculate platform position from their real positions
  //
  const topLevelBugs = inst.pyramidPositions.filter(p => p.levelIndex === newLayout.length - 1)
  let actualTopLevelY = topLevelY
  let actualTopLevelMaxRadius = topLevelMaxRadius
  
  if (topLevelBugs.length > 0) {
    //
    // Use actual bug positions and radii
    //
    actualTopLevelY = topLevelBugs[0].targetY
    actualTopLevelMaxRadius = 0
    topLevelBugs.forEach(({ bug }) => {
      const bugRadius = BUG_BODY_SIZE * 1.5 * bug.scale
      actualTopLevelMaxRadius = Math.max(actualTopLevelMaxRadius, bugRadius)
    })
  }
  //
  // Platform should be on top of bugs' backs (top of bug body)
  // Position platform so its top edge is at bugs' backs level
  //
  const bugTopY = actualTopLevelY - actualTopLevelMaxRadius  // Top of bug (back)
  const platformY = bugTopY + PYRAMID_BASE_HEIGHT / 2  // Adjust for anchor "top"
  
  if (inst.platform && inst.platform.exists()) {
    inst.platform.pos.x = centerX
    inst.platform.pos.y = platformY
  }
  
  //
  // Reset timer to extend pyramid duration by 5 seconds
  //
  inst.timer = 0
  
  return true
}

/**
 * Destroy pyramid and restore bugs to normal behavior
 * @param {Object} inst - Pyramid instance
 */
export function destroy(inst) {
  if (!inst.isActive) return
  
  inst.isActive = false
  
  //
  // Restore bugs to normal behavior and scatter them
  //
  inst.bugs.forEach(({ inst: bug, originalY }) => {
    //
    // Force exit from pyramid state immediately
    //
    bug.state = 'crawling'
    
    //
    // Restore original Y position (floor level)
    //
    bug.y = originalY
    
    //
    // Scatter bugs in random horizontal directions (left or right)
    // Small bugs only move horizontally on floor
    //
    const direction = Math.random() > 0.5 ? 1 : -1  // Left or right
    const scatterSpeed = 200 + Math.random() * 100  // Faster scatter speed
    bug.vx = direction * scatterSpeed
    bug.vy = 0  // No vertical movement for floor bugs
    
    //
    // Reset state timer to allow movement
    //
    bug.stateTimer = bug.crawlDuration || 10.0
    
    //
    // Set movement angle for crawling (only horizontal)
    //
    if (bug.surface === 'floor') {
      bug.movementAngle = bug.vx > 0 ? 0 : Math.PI
    }
    
    //
    // Mark bug as scattering (so it can't form new pyramid immediately)
    //
    bug.isScattering = true
    bug.scatterTimer = 3.0  // Scatter for 3 seconds to ensure they spread out
  })
  
  //
  // Remove platform
  //
  if (inst.platform && inst.platform.exists()) {
    inst.k.destroy(inst.platform)
  }
}

/**
 * Check if bugs are close enough to form a pyramid
 * @param {Array} bugs - Array of bug instances
 * @returns {Array|null} Group of bugs that can form pyramid, or null
 */
export function findBugGroup(bugs) {
  //
  // Filter out bugs that are already in pyramid or scared
  //
  const availableBugs = bugs.filter(bug => 
    bug.state !== 'pyramid' && 
    bug.state !== 'scared' && 
    bug.state !== 'recovering' &&
    bug.isMother === false  // Only small bugs can form pyramid
  )
  
  if (availableBugs.length < 5) return null
  
  //
  // Find groups of bugs that are close together
  //
  const groups = []
  const processed = new Set()
  
  availableBugs.forEach(bug => {
    if (processed.has(bug)) return
    
    const group = [bug]
    processed.add(bug)
    
    //
    // Find all bugs within detection radius
    //
    availableBugs.forEach(otherBug => {
      if (processed.has(otherBug)) return
      
      const dx = bug.x - otherBug.x
      const dy = bug.y - otherBug.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist <= GROUP_DETECTION_RADIUS) {
        group.push(otherBug)
        processed.add(otherBug)
      }
    })
    
    if (group.length >= 3) {
      groups.push(group)
    }
  })
  
  //
  // Return largest group
  //
  if (groups.length === 0) return null
  
  groups.sort((a, b) => b.length - a.length)
  return groups[0]
}

