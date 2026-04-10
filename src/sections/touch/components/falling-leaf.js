import { CFG } from '../cfg.js'
//
// Spawn timing
//
const INITIAL_SPAWN_DELAY = 2
const SPAWN_INTERVAL_MIN = 2
const SPAWN_INTERVAL_RANGE = 3
//
// Minimum remaining leaves ratio (stop spawning at 30% of original)
//
const MIN_LEAVES_RATIO = 0.3
const MAX_FALLEN_LEAVES = 70
//
// Falling physics
//
const FALL_SPEED_MIN = 25
const FALL_SPEED_RANGE = 20
const WIND_SPEED_MIN = -8
const WIND_SPEED_RANGE = 16
const FLUTTER_SPEED_MIN = 1.5
const FLUTTER_SPEED_RANGE = 2.0
const FLUTTER_AMPLITUDE = 0.3
//
// 2D rotation (in-plane spin like flying-words)
//
const ROTATION_2D_SPEED_RANGE = 120
const ROTATION_LERP_SPEED = 0.5
const ROTATION_CHANGE_MIN = 2
const ROTATION_CHANGE_RANGE = 3
//
// Pseudo Z-axis tumble (scale.x driven by cos)
//
const ROTATION_Z_SPEED_RANGE = 80
const ROTATION_Z_LERP_SPEED = 0.4
const ROTATION_Z_MIN_SCALE = 0.1
//
// Z-index layers (ground leaves above platforms z=16, below grass z=20)
//
const FALLING_Z = 17
const GROUND_Z = 17
//
// Ground behavior (one-shot impulse on hero contact, then friction settles)
//
const GROUND_CONTACT_DISTANCE_X = 20
const GROUND_CONTACT_DISTANCE_Y = 60
//
// Random slide impulse per contact (pixels of initial velocity)
//
const SLIDE_IMPULSE_MIN = 0.5
const SLIDE_IMPULSE_RANGE = 2.0
//
// Random spin impulse per contact (degrees of initial angular velocity)
//
const SPIN_IMPULSE_MIN = 1.0
const SPIN_IMPULSE_RANGE = 5.0
//
// Z-axis tumble impulse per contact (degrees of angular velocity, affects scaleX)
//
const TUMBLE_IMPULSE_MIN = 15
const TUMBLE_IMPULSE_RANGE = 40
//
// Friction dampens slide, spin, and tumble each frame
//
const GROUND_FRICTION = 0.88
const GROUND_SPIN_FRICTION = 0.85
const GROUND_TUMBLE_FRICTION = 0.88
//
// Per-leaf random slide range multiplier (assigned on landing)
//
const SLIDE_RANGE_MIN = 0.5
const SLIDE_RANGE_MULT = 1.5
//
// Airborne hero interaction (nudge when hero touches a falling leaf)
//
const AIR_PUSH_DISTANCE_X = 40
const AIR_PUSH_DISTANCE_Y = 60
const AIR_PUSH_FACTOR = 0.6
//
// Poison collision combines leaf radius with hero half-dimensions.
// Hero visual box is SPRITE_SIZE(32) * HERO_SCALE(3) = 96px; half = 48px.
// We use slightly tighter values so it feels fair.
//
const POISON_HERO_HALF_W = 20
const POISON_HERO_HALF_H = 40
//
// Leaf shape bezier resolution
//
const BEZIER_STEPS = 8

/**
 * Creates falling leaves system that detaches leaves from TreeRoots trees.
 * Leaves fall with multi-axis rotation and settle on the ground.
 * Hero stepping on grounded leaves pushes them slightly.
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {Object} config.treeRoots - TreeRoots instance (with roots[].leafClusters)
 * @param {number} config.floorY - Y coordinate of the floor
 * @param {Object} config.hero - Hero instance
 * @param {number} config.leftBound - Left boundary for leaves
 * @param {number} config.rightBound - Right boundary for leaves
 * @returns {Object} Falling leaves instance
 */
export function create(config) {
  const { k, treeRoots, floorY, hero, leftBound, rightBound, poisonChance = 0, poisonColor = null, onPoisonHit = null } = config
  //
  // Count total initial leaves across all trees
  //
  let totalInitialLeaves = 0
  for (const root of treeRoots.roots) {
    for (const cluster of root.leafClusters) {
      totalInitialLeaves += cluster.length
    }
  }

  const inst = {
    k,
    treeRoots,
    floorY,
    hero,
    leftBound,
    rightBound,
    fallingLeaves: [],
    groundLeaves: [],
    totalInitialLeaves,
    spawnedCount: 0,
    spawnTimer: 0,
    nextSpawnTime: INITIAL_SPAWN_DELAY,
    poisonChance,
    poisonColor,
    onPoisonHit
  }
  //
  // Drawer for grounded leaves (on floor surface, above platforms)
  //
  k.add([
    k.z(GROUND_Z),
    {
      draw() {
        drawLeaves(inst, inst.groundLeaves)
      }
    }
  ])
  //
  // Drawer for falling leaves (above tree roots sprite)
  //
  k.add([
    k.z(FALLING_Z),
    {
      draw() {
        drawLeaves(inst, inst.fallingLeaves)
      }
    }
  ])

  return inst
}

/**
 * Updates all falling and grounded leaves, spawns new ones periodically
 * @param {Object} inst - Falling leaves instance
 */
export function onUpdate(inst) {
  const dt = inst.k.dt()
  //
  // Count remaining leaves on all trees
  //
  const remaining = countRemainingLeaves(inst)
  const minLeaves = Math.floor(inst.totalInitialLeaves * MIN_LEAVES_RATIO)
  //
  // Spawn new leaves on a timer (stop when too few remain on trees)
  //
  inst.spawnTimer += dt
  if (inst.spawnTimer >= inst.nextSpawnTime && remaining > minLeaves && inst.spawnedCount < MAX_FALLEN_LEAVES) {
    spawnLeaf(inst)
    inst.spawnTimer = 0
    inst.nextSpawnTime = SPAWN_INTERVAL_MIN + Math.random() * SPAWN_INTERVAL_RANGE
  }
  //
  // Update falling leaves
  //
  for (let i = inst.fallingLeaves.length - 1; i >= 0; i--) {
    const leaf = inst.fallingLeaves[i]
    updateFallingLeaf(inst, leaf)
    //
    // Move to ground array when landed
    //
    if (leaf.grounded) {
      inst.fallingLeaves.splice(i, 1)
      inst.groundLeaves.push(leaf)
    }
  }
  //
  // Update grounded leaves (hero drag interaction)
  //
  for (const leaf of inst.groundLeaves) {
    updateGroundLeaf(inst, leaf)
  }
  //
  // Track hero X for velocity calculation next frame
  //
  if (inst.hero?.character?.pos) {
    inst.lastHeroX = inst.hero.character.pos.x
  }
}

/**
 * Draw leaves using the teardrop polygon shape with Z-axis tumble
 */
function drawLeaves(inst, leaves) {
  const k = inst.k

  for (const leaf of leaves) {
    k.pushTransform()
    k.pushTranslate(leaf.x, leaf.y)
    k.pushRotate(leaf.angle)
    k.pushScale(leaf.scaleX, 1)
    //
    // Build teardrop polygon points (centered at origin)
    //
    const pts = buildLeafPoints(k, leaf.size)
    k.drawPolygon({
      pts,
      color: leaf.color,
      opacity: leaf.opacity
    })
    k.popTransform()
  }
}

/**
 * Build teardrop leaf shape points using quadratic bezier curves
 * @param {Object} k - Kaplay instance
 * @param {number} size - Leaf size (height)
 * @returns {Array} Array of vec2 points
 */
function buildLeafPoints(k, size) {
  const pts = []
  //
  // Left side: base (0,0) → control (-size*0.6, -size*0.3) → tip (0, -size)
  //
  for (let i = 0; i <= BEZIER_STEPS; i++) {
    const t = i / BEZIER_STEPS
    const oneMinusT = 1 - t
    const px = 2 * oneMinusT * t * (-size * 0.6)
    const py = 2 * oneMinusT * t * (-size * 0.3) + t * t * (-size)
    pts.push(k.vec2(px, py))
  }
  //
  // Right side: tip (0, -size) → control (size*0.6, -size*0.3) → base (0, 0)
  //
  for (let i = 0; i <= BEZIER_STEPS; i++) {
    const t = i / BEZIER_STEPS
    const oneMinusT = 1 - t
    const px = 2 * oneMinusT * t * (size * 0.6)
    const py = oneMinusT * oneMinusT * (-size) + 2 * oneMinusT * t * (-size * 0.3)
    pts.push(k.vec2(px, py))
  }
  return pts
}

/**
 * Count remaining leaves across all tree root clusters
 */
function countRemainingLeaves(inst) {
  let count = 0
  for (const root of inst.treeRoots.roots) {
    for (const cluster of root.leafClusters) {
      count += cluster.length
    }
  }
  return count
}

/**
 * Detach a random leaf from a random TreeRoots tree cluster
 */
function spawnLeaf(inst) {
  const roots = inst.treeRoots.roots
  //
  // Collect all non-empty clusters with their root reference
  //
  const candidates = []
  for (const root of roots) {
    for (let ci = 0; ci < root.leafClusters.length; ci++) {
      const cluster = root.leafClusters[ci]
      if (cluster.length > 0) {
        candidates.push({ root, clusterIdx: ci, cluster })
      }
    }
  }
  if (candidates.length === 0) return
  //
  // Pick random cluster, then random leaf within it
  //
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  const leafIdx = Math.floor(Math.random() * pick.cluster.length)
  const srcLeaf = pick.cluster[leafIdx]
  //
  // Remove leaf from tree cluster (disappears from tree drawing)
  //
  pick.cluster.splice(leafIdx, 1)
  inst.spawnedCount++
  //
  // Initial angle in degrees (source rotation is in radians)
  //
  const angleDeg = srcLeaf.rotation * 180 / Math.PI
  //
  // Determine if this leaf is poisonous (random chance from config)
  //
  const isPoisonous = inst.poisonChance > 0 && Math.random() < inst.poisonChance
  const leafColor = isPoisonous && inst.poisonColor ? inst.poisonColor : srcLeaf.color
  //
  // Create falling leaf data
  //
  inst.fallingLeaves.push({
    x: srcLeaf.x,
    y: srcLeaf.y,
    size: srcLeaf.size,
    color: leafColor,
    opacity: srcLeaf.opacity,
    baseOpacity: srcLeaf.opacity,
    angle: angleDeg,
    scaleX: 1,
    poisonous: isPoisonous,
    poisonTriggered: false,
    //
    // Movement
    //
    speedX: WIND_SPEED_MIN + Math.random() * WIND_SPEED_RANGE,
    speedY: FALL_SPEED_MIN + Math.random() * FALL_SPEED_RANGE,
    wavePhase: Math.random() * Math.PI * 2,
    waveSpeed: FLUTTER_SPEED_MIN + Math.random() * FLUTTER_SPEED_RANGE,
    waveAmplitude: 8 + Math.random() * 12,
    //
    // 2D rotation state (smooth direction changes like flying-words)
    //
    rotSpeed: (Math.random() - 0.5) * ROTATION_2D_SPEED_RANGE,
    rotTargetMod: (Math.random() - 0.5) * 2,
    rotCurrentMod: 0,
    rotTimer: 0,
    rotDur: ROTATION_CHANGE_MIN + Math.random() * ROTATION_CHANGE_RANGE,
    //
    // Z-axis rotation state (pseudo-3D tumble via scaleX)
    //
    rotZ: Math.random() * 360,
    rotZSpeed: (Math.random() - 0.5) * ROTATION_Z_SPEED_RANGE,
    rotZTargetMod: (Math.random() - 0.5) * 2,
    rotZCurrentMod: 0,
    rotZTimer: 0,
    rotZDur: ROTATION_CHANGE_MIN + Math.random() * ROTATION_CHANGE_RANGE,
    //
    // Ground state
    //
    grounded: false,
    groundVx: 0
  })
}

/**
 * Animate a leaf falling with wind, flutter, and multi-axis rotation
 */
function updateFallingLeaf(inst, leaf) {
  const dt = inst.k.dt()
  //
  // Horizontal flutter (subtle sine wobble)
  //
  leaf.wavePhase += leaf.waveSpeed * dt
  const flutter = Math.sin(leaf.wavePhase) * leaf.waveAmplitude * FLUTTER_AMPLITUDE
  //
  // Position update
  //
  leaf.x += (leaf.speedX + flutter) * dt
  leaf.y += leaf.speedY * dt
  //
  // Clamp horizontal position within bounds
  //
  leaf.x = Math.max(inst.leftBound, Math.min(inst.rightBound, leaf.x))
  //
  // Smooth 2D rotation direction changes
  //
  leaf.rotTimer += dt
  if (leaf.rotTimer >= leaf.rotDur) {
    leaf.rotTargetMod = (Math.random() - 0.5) * 2
    leaf.rotTimer = 0
    leaf.rotDur = ROTATION_CHANGE_MIN + Math.random() * ROTATION_CHANGE_RANGE
  }
  leaf.rotCurrentMod += (leaf.rotTargetMod - leaf.rotCurrentMod) * ROTATION_LERP_SPEED * dt
  leaf.angle += leaf.rotSpeed * (1 + leaf.rotCurrentMod * 0.7) * dt
  //
  // Smooth Z-axis rotation direction changes
  //
  leaf.rotZTimer += dt
  if (leaf.rotZTimer >= leaf.rotZDur) {
    leaf.rotZTargetMod = (Math.random() - 0.5) * 2
    leaf.rotZTimer = 0
    leaf.rotZDur = ROTATION_CHANGE_MIN + Math.random() * ROTATION_CHANGE_RANGE
  }
  leaf.rotZCurrentMod += (leaf.rotZTargetMod - leaf.rotZCurrentMod) * ROTATION_Z_LERP_SPEED * dt
  leaf.rotZ += leaf.rotZSpeed * (1 + leaf.rotZCurrentMod * 0.8) * dt
  //
  // Scale X simulates viewing angle (edge-on = thin)
  //
  const zRad = leaf.rotZ * Math.PI / 180
  leaf.scaleX = Math.max(ROTATION_Z_MIN_SCALE, Math.abs(Math.cos(zRad)))
  //
  // Dim opacity when edge-on (same technique as flying-words)
  //
  leaf.opacity = leaf.baseOpacity * (0.3 + 0.7 * leaf.scaleX)
  //
  // Nudge leaf if hero touches it mid-air (per-frame impulse)
  //
  if (inst.hero?.character?.pos) {
    const hero = inst.hero.character
    const dxHero = hero.pos.x - leaf.x
    const dyHero = hero.pos.y - leaf.y
    if (Math.abs(dxHero) < AIR_PUSH_DISTANCE_X && Math.abs(dyHero) < AIR_PUSH_DISTANCE_Y) {
      const heroVx = hero.pos.x - (inst.lastHeroX ?? hero.pos.x)
      leaf.speedX += heroVx * AIR_PUSH_FACTOR
      //
      // Poison leaf kills hero when bounding boxes overlap (leaf size + hero half-size)
      //
      if (leaf.poisonous && !leaf.poisonTriggered && inst.onPoisonHit &&
          Math.abs(dxHero) < leaf.size + POISON_HERO_HALF_W &&
          Math.abs(dyHero) < leaf.size + POISON_HERO_HALF_H) {
        leaf.poisonTriggered = true
        inst.onPoisonHit(leaf)
      }
    }
  }
  //
  // Check if leaf reached the ground
  //
  if (leaf.y >= inst.floorY) {
    leaf.y = inst.floorY
    leaf.grounded = true
    leaf.scaleX = 1
    leaf.opacity = leaf.baseOpacity * 0.8
    leaf.groundVx = 0
    //
    // Each leaf gets its own random slide range multiplier
    //
    leaf.slideMult = SLIDE_RANGE_MIN + Math.random() * SLIDE_RANGE_MULT
    leaf.heroTouching = false
  }
}

/**
 * One-shot impulse when hero first contacts a grounded leaf.
 * Each contact gives a random slide + spin in the hero's direction,
 * then friction decelerates until the leaf settles in a new position.
 */
function updateGroundLeaf(inst, leaf) {
  if (!inst.hero?.character?.pos) return
  const hero = inst.hero.character
  const distX = Math.abs(hero.pos.x - leaf.x)
  const heroNearGround = Math.abs(hero.pos.y - inst.floorY) < GROUND_CONTACT_DISTANCE_Y
  const isTouching = distX < GROUND_CONTACT_DISTANCE_X && heroNearGround
  //
  // One-shot impulse on first contact (not repeated while hero stays on leaf)
  //
  if (isTouching && !leaf.heroTouching) {
    //
    // Poison leaf on ground kills hero when feet horizontally overlap the leaf
    //
    if (leaf.poisonous && !leaf.poisonTriggered && inst.onPoisonHit && distX < leaf.size + POISON_HERO_HALF_W) {
      leaf.poisonTriggered = true
      inst.onPoisonHit(leaf)
      return
    }
    const heroVx = hero.pos.x - (inst.lastHeroX ?? hero.pos.x)
    const dir = heroVx >= 0 ? 1 : -1
    const mult = leaf.slideMult ?? 1
    //
    // Random slide velocity in hero's direction
    //
    leaf.groundVx = dir * (SLIDE_IMPULSE_MIN + Math.random() * SLIDE_IMPULSE_RANGE) * mult
    //
    // Random spin impulse for orientation change
    //
    leaf.groundSpin = dir * (SPIN_IMPULSE_MIN + Math.random() * SPIN_IMPULSE_RANGE) * mult
    //
    // Random Z-axis tumble impulse (leaf flips toward/away from viewer)
    //
    const tumbleDir = Math.random() < 0.5 ? 1 : -1
    leaf.groundTumble = tumbleDir * (TUMBLE_IMPULSE_MIN + Math.random() * TUMBLE_IMPULSE_RANGE) * mult
  }
  leaf.heroTouching = isTouching
  //
  // Apply friction and move
  //
  leaf.groundVx *= GROUND_FRICTION
  leaf.x += leaf.groundVx
  //
  // Apply angular velocity with friction (leaf settles in new orientation)
  //
  const spin = leaf.groundSpin ?? 0
  if (Math.abs(spin) > 0.01) {
    leaf.angle += spin
    leaf.groundSpin = spin * GROUND_SPIN_FRICTION
  }
  //
  // Apply Z-axis tumble (pseudo-3D flip via scaleX)
  //
  const tumble = leaf.groundTumble ?? 0
  if (Math.abs(tumble) > 0.1) {
    leaf.rotZ = (leaf.rotZ ?? 0) + tumble
    leaf.groundTumble = tumble * GROUND_TUMBLE_FRICTION
    const zRad = leaf.rotZ * Math.PI / 180
    leaf.scaleX = Math.max(ROTATION_Z_MIN_SCALE, Math.abs(Math.cos(zRad)))
  }
  //
  // Keep within bounds
  //
  leaf.x = Math.max(inst.leftBound, Math.min(inst.rightBound, leaf.x))
}
