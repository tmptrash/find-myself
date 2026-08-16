//
// Rain depth layers: far (faint), mid (medium), near (prominent)
// Each layer has its own color, speed, size and drop count
//
const LAYERS = [
  { r: 100, g: 120, b: 150, opacity: 0.25, speed: 180, length: 10, width: 1.5, count: 22 },
  { r: 70, g: 95, b: 130, opacity: 0.4, speed: 280, length: 16, width: 2, count: 16 },
  { r: 40, g: 65, b: 100, opacity: 0.55, speed: 400, length: 22, width: 2.5, count: 12 }
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
//
// Bug body radius constant (BUG_BODY_SIZE * 1.5 from bugs.js) for edge splash positioning
//
const BUG_BODY_RADIUS_FACTOR = 9
const SMALL_BUG_HIT_HALF = 8
//
// Fraction of drops that originate from tree canopies instead of screen top
//
const TREE_DROP_CHANCE = 0.15
const CLOUD_CENTER_OFFSET = 60
//
// Reused rain draw primitives.
//
let _rainDrawK = null
let _rainP1 = null
let _rainP2 = null
let _rainPos = null
const _splashPool = []
function ensureRainDrawScratch(k) {
  if (_rainDrawK === k) return
  _rainDrawK = k
  _rainP1 = k.vec2(0, 0)
  _rainP2 = k.vec2(0, 0)
  _rainPos = k.vec2(0, 0)
}

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
  const screenW = k.width()
  const screenH = k.height()
  //
  // Build canopy spawn points from tree crown data
  //
  const canopyPoints = buildCanopyPoints(trees)
  //
  // Initialize drop arrays for each layer
  //
  const playableW = rightX - leftX
  const viewW = Math.min(playableW, screenW)
  const layers = LAYERS.map((layerCfg, li) => {
    const drops = []
    const dropCount = Math.max(1, Math.round(layerCfg.count * intensity))
    for (let i = 0; i < dropCount; i++) {
      drops.push(spawnDrop(leftX, playableW, topY, floorY, canopyPoints, leftX, viewW))
    }
    return {
      cfg: layerCfg,
      drops,
      splashes: [],
      zIndex: LAYER_Z[li],
      color: k.rgb(layerCfg.r, layerCfg.g, layerCfg.b)
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
    screenH,
    logicPaused: false
  }
  //
  // Register draw objects for each layer at their respective z-indices
  //
  layers.forEach((layer, li) => {
    k.add([
      k.pos(0, 0),
      k.z(layer.zIndex),
      {
        width: rightX - leftX + leftX,
        height: screenH,
        draw() {
          onDraw(inst, li)
        }
      }
    ])
  })
  return inst
}

/**
 * Updates all rain layers (call from scene game loop).
 * @param {Object} inst - Rain instance from create()
 */
export function onUpdate(inst) {
  if (inst.logicPaused) return
  onUpdateRain(inst)
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
function spawnDrop(leftX, playableW, topY, floorY, canopyPoints, spawnX1, spawnW) {
  const cloudY = topY + CLOUD_CENTER_OFFSET
  const x1 = spawnX1 ?? leftX
  const w = spawnW ?? playableW
  const x = x1 + Math.random() * w
  const y = cloudY + Math.random() * (floorY - cloudY)
  return { x, y, active: true }
}

/**
 * Updates all rain layers: moves drops, checks collisions, spawns splashes
 * @param {Object} inst - Rain instance
 */
function onUpdateRain(inst) {
  const { k, layers, topY, floorY, leftX, rightX, heroInst, antiHeroInst, monsterBugs, smallBugs, canopyPoints } = inst
  const dt = k.dt()
  const playableW = rightX - leftX
  const camX = k.camPos().x
  const viewHalf = inst.screenW / 2
  const viewX1 = camX - viewHalf - 80
  const viewX2 = camX + viewHalf + 80
  const viewW = viewX2 - viewX1
  const heroPos = heroInst.character ? heroInst.character.pos : null
  const antiPos = antiHeroInst?.character ? antiHeroInst.character.pos : null
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
      const offscreen = drop.x < viewX1 || drop.x > viewX2
      if (drop.y >= floorY) {
        !offscreen && addSplash(splashes, drop.x, floorY, layer.cfg)
        resetDrop(drop, leftX, playableW, topY, canopyPoints, viewX1, viewW)
        continue
      }
      if (drop.x > rightX + 20) {
        resetDrop(drop, leftX, playableW, topY, canopyPoints, viewX1, viewW)
        continue
      }
      if (offscreen) continue
      if (heroPos && hitTest(drop, heroPos.x, heroPos.y - 25, HERO_HIT_HALF_W, HERO_HIT_HALF_H)) {
        addSplash(splashes, drop.x, drop.y, layer.cfg)
        resetDrop(drop, leftX, playableW, topY, canopyPoints, viewX1, viewW)
        continue
      }
      if (antiPos && hitTest(drop, antiPos.x, antiPos.y - 25, HERO_HIT_HALF_W, HERO_HIT_HALF_H)) {
        addSplash(splashes, drop.x, drop.y, layer.cfg)
        resetDrop(drop, leftX, playableW, topY, canopyPoints, viewX1, viewW)
        continue
      }
      let hitMonster = false
      for (let m = 0; m < monsterBugs.length; m++) {
        const bug = monsterBugs[m]
        if (bug.x < viewX1 - 40 || bug.x > viewX2 + 40) continue
        const bugRadius = BUG_BODY_RADIUS_FACTOR * (bug.scale || 1)
        const bugCenterY = bug.y + (bug.dropOffset || 0)
        if (hitTest(drop, bug.x, bugCenterY, BUG_HIT_HALF_W, BUG_HIT_HALF_H)) {
          const dx = drop.x - bug.x
          const dy = drop.y - bugCenterY
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          addSplash(splashes, bug.x + (dx / dist) * bugRadius, bugCenterY + (dy / dist) * bugRadius, layer.cfg)
          resetDrop(drop, leftX, playableW, topY, canopyPoints, viewX1, viewW)
          hitMonster = true
          break
        }
      }
      if (hitMonster) continue
      if (li < 2) continue
      for (let s = 0; s < smallBugs.length; s++) {
        const sb = smallBugs[s]
        if (sb.state === 'pyramid') continue
        if (sb.x < viewX1 || sb.x > viewX2) continue
        if (hitTest(drop, sb.x, sb.y, SMALL_BUG_HIT_HALF, SMALL_BUG_HIT_HALF)) {
          addSplash(splashes, drop.x, drop.y, layer.cfg)
          resetDrop(drop, leftX, playableW, topY, canopyPoints, viewX1, viewW)
          break
        }
      }
    }
    //
    // Update splash particles
    //
    for (let s = splashes.length - 1; s >= 0; s--) {
      const sp = splashes[s]
      sp.life -= dt
      if (sp.life <= 0) {
        releaseSplash(sp)
        splashes[s] = splashes[splashes.length - 1]
        splashes.pop()
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
    const sp = _splashPool.pop() || {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      r: 0,
      g: 0,
      b: 0,
      opacity: 0
    }
    sp.x = x
    sp.y = y
    sp.vx = Math.cos(angle) * speed
    sp.vy = Math.sin(angle) * speed
    sp.life = SPLASH_LIFETIME * (0.6 + Math.random() * 0.4)
    sp.r = layerCfg.r
    sp.g = layerCfg.g
    sp.b = layerCfg.b
    sp.opacity = layerCfg.opacity
    splashes.push(sp)
  }
}
function releaseSplash(sp) {
  _splashPool.push(sp)
}

/**
 * Resets a drop to spawn from cloud level within the playable area
 * @param {Object} drop - Drop to reset
 * @param {number} leftX - Left edge of playable area
 * @param {number} playableW - Width of playable area
 * @param {number} topY - Bottom of top platform (cloud spawn line)
 * @param {Array<Object>} canopyPoints - Tree canopy spawn points
 */
function resetDrop(drop, leftX, playableW, topY, canopyPoints, spawnX1, spawnW) {
  const x1 = spawnX1 ?? leftX
  const w = spawnW ?? playableW
  const fromTree = canopyPoints.length > 0 && Math.random() < TREE_DROP_CHANCE
  const canopy = fromTree ? pickVisibleCanopyPoint(canopyPoints, x1, w) : null
  if (canopy) {
    drop.x = canopy.x + (Math.random() - 0.5) * 20
    drop.y = canopy.y + Math.random() * 10
    return
  }
  const cloudY = topY + CLOUD_CENTER_OFFSET
  drop.x = x1 + Math.random() * w
  drop.y = cloudY + (Math.random() - 0.5) * 40
}

/**
 * Picks a canopy drip origin that currently sits in the spawn window.
 * @param {Array<{x: number, y: number}>} canopyPoints
 * @param {number} x1 - Spawn window left
 * @param {number} w - Spawn window width
 * @returns {{x: number, y: number}|null}
 */
function pickVisibleCanopyPoint(canopyPoints, x1, w) {
  const x2 = x1 + w
  let found = null
  let n = 0
  for (let i = 0; i < canopyPoints.length; i++) {
    const pt = canopyPoints[i]
    if (pt.x < x1 || pt.x > x2) continue
    n++
    if (Math.random() < 1 / n) found = pt
  }
  return found
}

/**
 * Draws all drops and splashes for a single rain layer
 * @param {Object} inst - Rain instance
 * @param {number} li - Layer index
 */
function onDraw(inst, li) {
  if (inst.logicPaused) return
  const { k, layers } = inst
  ensureRainDrawScratch(k)
  const layer = layers[li]
  const cfg = layer.cfg
  const color = layer.color
  const camX = k.camPos().x
  const viewHalf = inst.screenW / 2
  const viewX1 = camX - viewHalf - 80
  const viewX2 = camX + viewHalf + 80
  for (const drop of layer.drops) {
    if (!drop.active) continue
    if (drop.x < viewX1 || drop.x > viewX2) continue
    _rainP1.x = drop.x
    _rainP1.y = drop.y
    _rainP2.x = drop.x + WIND_VX * 0.02
    _rainP2.y = drop.y + cfg.length
    k.drawLine({
      p1: _rainP1,
      p2: _rainP2,
      width: cfg.width,
      color,
      opacity: cfg.opacity
    })
  }
  for (const sp of layer.splashes) {
    if (sp.x < viewX1 || sp.x > viewX2) continue
    const alpha = (sp.life / SPLASH_LIFETIME) * sp.opacity
    _rainPos.x = sp.x
    _rainPos.y = sp.y
    k.drawCircle({
      pos: _rainPos,
      radius: SPLASH_SIZE,
      color,
      opacity: alpha
    })
  }
}
