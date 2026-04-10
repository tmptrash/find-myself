import { CFG } from '../cfg.js'

//
// Rain depth layers: far (faint), mid (medium), near (prominent)
// Each layer has its own color, speed, size and drop count
//
const LAYERS = [
  { r: 100, g: 120, b: 150, opacity: 0.25, speed: 180, length: 10, width: 1.5, count: 40 },
  { r: 70, g: 95, b: 130, opacity: 0.4, speed: 280, length: 16, width: 2, count: 30 },
  { r: 40, g: 65, b: 100, opacity: 0.55, speed: 400, length: 22, width: 2.5, count: 20 }
]
//
// Z-indices for each rain layer (interleaved with scene layers)
// Far rain behind mid trees (z=3), mid rain behind front trees (z=6), near rain in front (z=22)
//
const LAYER_Z = [3, 6, 22]
//
// Wind drift: slight horizontal movement so drops fall at an angle
//
const WIND_VX = 15
//
// Splash particle settings
//
const SPLASH_COUNT_MIN = 2
const SPLASH_COUNT_MAX = 4
const SPLASH_SPEED_MIN = 20
const SPLASH_SPEED_MAX = 60
const SPLASH_LIFETIME = 0.3
const SPLASH_SIZE = 2
//
// Collision hit-box half-widths for different object types
//
const HERO_HIT_HALF_W = 16
const HERO_HIT_HALF_H = 20
const BUG_HIT_HALF_W = 30
const BUG_HIT_HALF_H = 20
const SMALL_BUG_HIT_HALF = 8
//
// Fraction of drops that originate from tree canopies instead of screen top
//
const TREE_DROP_CHANCE = 0.15
//
// Cloud center offset from topY (clouds sit ~60px below the top platform edge)
//
const CLOUD_CENTER_OFFSET = 60

/**
 * Creates the rain system with multiple depth layers, drops and splashes.
 * @param {Object} cfg - Rain configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.topY - Y coordinate of the bottom of the top platform (cloud level)
 * @param {number} cfg.floorY - Y coordinate of the floor platform
 * @param {number} cfg.leftX - X coordinate of the right edge of the left wall
 * @param {number} cfg.rightX - X coordinate of the left edge of the right wall
 * @param {Object} cfg.heroInst - Hero instance (character.pos for collision)
 * @param {Object} cfg.antiHeroInst - Anti-hero instance (character.pos for collision)
 * @param {Array<Object>} cfg.monsterBugs - Big bug instances [bug0, bug1, bug2]
 * @param {Array<Object>} cfg.smallBugs - Small floor bug instances
 * @param {Array<Object>} cfg.trees - Front-layer tree data (for canopy drop origins)
 * @returns {Object} Rain instance
 */
export function create(cfg) {
  const { k, topY, floorY, leftX, rightX, heroInst, antiHeroInst, monsterBugs = [], smallBugs = [], trees = [], intensity = 1 } = cfg
  const screenW = CFG.visual.screen.width
  const screenH = CFG.visual.screen.height
  //
  // Build canopy spawn points from tree crown data
  //
  const canopyPoints = buildCanopyPoints(trees)
  //
  // Initialize drop arrays for each layer
  //
  const playableW = rightX - leftX
  const layers = LAYERS.map((layerCfg, li) => {
    const drops = []
    const dropCount = Math.max(1, Math.round(layerCfg.count * intensity))
    for (let i = 0; i < dropCount; i++) {
      drops.push(spawnDrop(leftX, playableW, topY, floorY, canopyPoints))
    }
    return {
      cfg: layerCfg,
      drops,
      splashes: [],
      zIndex: LAYER_Z[li]
    }
  })
  const inst = {
    k,
    layers,
    topY,
    floorY,
    leftX,
    rightX,
    heroInst,
    antiHeroInst,
    monsterBugs,
    smallBugs,
    canopyPoints,
    screenW,
    screenH
  }
  //
  // Register draw objects for each layer at their respective z-indices
  //
  layers.forEach((layer, li) => {
    k.add([
      k.z(layer.zIndex),
      {
        draw() {
          onDraw(inst, li)
        }
      }
    ])
  })
  //
  // Single update handler for all layers
  //
  k.onUpdate(() => onUpdate(inst))
  return inst
}

/**
 * Extracts spawn points from tree canopy crowns (front layer trees)
 * @param {Array<Object>} trees - Tree data objects with x, crownCenterY, crownSize, crowns
 * @returns {Array<{x: number, y: number}>}
 */
function buildCanopyPoints(trees) {
  if (!trees || trees.length === 0) return []
  const points = []
  for (const tree of trees) {
    for (const crown of tree.crowns) {
      points.push({
        x: tree.x + crown.offsetX,
        y: tree.crownCenterY + crown.offsetY
      })
    }
  }
  return points
}

/**
 * Creates a new raindrop distributed across the full vertical range.
 * Used at init so rain looks like it has already been falling for a while.
 * @param {number} leftX - Left edge of playable area
 * @param {number} playableW - Width of playable area
 * @param {number} topY - Bottom of top platform (cloud spawn line)
 * @param {number} floorY - Floor Y coordinate
 * @param {Array<Object>} canopyPoints - Tree canopy spawn points
 * @returns {Object} Drop object
 */
function spawnDrop(leftX, playableW, topY, floorY, canopyPoints) {
  const cloudY = topY + CLOUD_CENTER_OFFSET
  const x = leftX + Math.random() * playableW
  const y = cloudY + Math.random() * (floorY - cloudY)
  return { x, y, active: true }
}

/**
 * Updates all rain layers: moves drops, checks collisions, spawns splashes
 * @param {Object} inst - Rain instance
 */
function onUpdate(inst) {
  const { k, layers, topY, floorY, leftX, rightX, heroInst, antiHeroInst, monsterBugs, smallBugs, canopyPoints } = inst
  const dt = k.dt()
  const playableW = rightX - leftX
  const heroPos = heroInst.character ? heroInst.character.pos : null
  const antiPos = antiHeroInst.character ? antiHeroInst.character.pos : null
  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li]
    const speed = layer.cfg.speed
    const drops = layer.drops
    const splashes = layer.splashes
    for (let i = 0; i < drops.length; i++) {
      const drop = drops[i]
      if (!drop.active) continue
      drop.x += WIND_VX * dt
      drop.y += speed * dt
      //
      // Check floor collision
      //
      if (drop.y >= floorY) {
        addSplash(splashes, drop.x, floorY, layer.cfg)
        resetDrop(drop, leftX, playableW, topY, canopyPoints)
        continue
      }
      //
      // Check hero collision
      //
      //
      // Hero hitbox centered on the head (25px above anchor center)
      //
      if (heroPos && hitTest(drop, heroPos.x, heroPos.y - 25, HERO_HIT_HALF_W, HERO_HIT_HALF_H)) {
        addSplash(splashes, drop.x, drop.y, layer.cfg)
        resetDrop(drop, leftX, playableW, topY, canopyPoints)
        continue
      }
      //
      // Check anti-hero collision
      //
      if (antiPos && hitTest(drop, antiPos.x, antiPos.y - 25, HERO_HIT_HALF_W, HERO_HIT_HALF_H)) {
        addSplash(splashes, drop.x, drop.y, layer.cfg)
        resetDrop(drop, leftX, playableW, topY, canopyPoints)
        continue
      }
      //
      // Check monster (big bug) collisions
      //
      let hitMonster = false
      for (let m = 0; m < monsterBugs.length; m++) {
        const bug = monsterBugs[m]
        if (hitTest(drop, bug.x, bug.y, BUG_HIT_HALF_W, BUG_HIT_HALF_H)) {
          addSplash(splashes, drop.x, drop.y, layer.cfg)
          resetDrop(drop, leftX, playableW, topY, canopyPoints)
          hitMonster = true
          break
        }
      }
      if (hitMonster) continue
      //
      // Check small bug collisions (sampled for performance)
      //
      for (let s = 0; s < smallBugs.length; s++) {
        const sb = smallBugs[s]
        if (sb.state === 'pyramid') continue
        if (hitTest(drop, sb.x, sb.y, SMALL_BUG_HIT_HALF, SMALL_BUG_HIT_HALF)) {
          addSplash(splashes, drop.x, drop.y, layer.cfg)
          resetDrop(drop, leftX, playableW, topY, canopyPoints)
          break
        }
      }
      //
      // Reset if drop drifts past the right wall
      //
      if (drop.x > rightX + 20) {
        resetDrop(drop, leftX, playableW, topY, canopyPoints)
      }
    }
    //
    // Update splash particles
    //
    for (let s = splashes.length - 1; s >= 0; s--) {
      const sp = splashes[s]
      sp.life -= dt
      if (sp.life <= 0) {
        splashes.splice(s, 1)
        continue
      }
      sp.x += sp.vx * dt
      sp.y += sp.vy * dt
      sp.vy += 120 * dt
    }
  }
}

/**
 * Simple AABB hit test between a drop point and a rectangular area
 * @param {Object} drop - Drop with x, y
 * @param {number} cx - Center X of target
 * @param {number} cy - Center Y of target
 * @param {number} hw - Half-width
 * @param {number} hh - Half-height
 * @returns {boolean}
 */
function hitTest(drop, cx, cy, hw, hh) {
  return Math.abs(drop.x - cx) < hw && Math.abs(drop.y - cy) < hh
}

/**
 * Spawns splash particles at a collision point
 * @param {Array<Object>} splashes - Splash array to push into
 * @param {number} x - Collision X
 * @param {number} y - Collision Y
 * @param {Object} layerCfg - Layer color/opacity config
 */
function addSplash(splashes, x, y, layerCfg) {
  const count = SPLASH_COUNT_MIN + Math.floor(Math.random() * (SPLASH_COUNT_MAX - SPLASH_COUNT_MIN + 1))
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI * 0.1 - Math.random() * Math.PI * 0.8
    const speed = SPLASH_SPEED_MIN + Math.random() * (SPLASH_SPEED_MAX - SPLASH_SPEED_MIN)
    splashes.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: SPLASH_LIFETIME * (0.6 + Math.random() * 0.4),
      r: layerCfg.r,
      g: layerCfg.g,
      b: layerCfg.b,
      opacity: layerCfg.opacity
    })
  }
}

/**
 * Resets a drop to spawn from cloud level within the playable area
 * @param {Object} drop - Drop to reset
 * @param {number} leftX - Left edge of playable area
 * @param {number} playableW - Width of playable area
 * @param {number} topY - Bottom of top platform (cloud spawn line)
 * @param {Array<Object>} canopyPoints - Tree canopy spawn points
 */
function resetDrop(drop, leftX, playableW, topY, canopyPoints) {
  const fromTree = canopyPoints.length > 0 && Math.random() < TREE_DROP_CHANCE
  if (fromTree) {
    const pt = canopyPoints[Math.floor(Math.random() * canopyPoints.length)]
    drop.x = pt.x + (Math.random() - 0.5) * 20
    drop.y = pt.y + Math.random() * 10
  } else {
    //
    // Spawn from cloud center with slight vertical scatter
    //
    const cloudY = topY + CLOUD_CENTER_OFFSET
    drop.x = leftX + Math.random() * playableW
    drop.y = cloudY + (Math.random() - 0.5) * 40
  }
}

/**
 * Draws all drops and splashes for a single rain layer
 * @param {Object} inst - Rain instance
 * @param {number} li - Layer index
 */
function onDraw(inst, li) {
  const { k, layers } = inst
  const layer = layers[li]
  const cfg = layer.cfg
  const color = k.rgb(cfg.r, cfg.g, cfg.b)
  //
  // Draw raindrops as short angled lines
  //
  for (const drop of layer.drops) {
    if (!drop.active) continue
    k.drawLine({
      p1: k.vec2(drop.x, drop.y),
      p2: k.vec2(drop.x + WIND_VX * 0.02, drop.y + cfg.length),
      width: cfg.width,
      color,
      opacity: cfg.opacity
    })
  }
  //
  // Draw splash particles as tiny fading circles
  //
  for (const sp of layer.splashes) {
    const alpha = (sp.life / SPLASH_LIFETIME) * sp.opacity
    k.drawCircle({
      pos: k.vec2(sp.x, sp.y),
      radius: SPLASH_SIZE,
      color: k.rgb(sp.r, sp.g, sp.b),
      opacity: alpha
    })
  }
}
