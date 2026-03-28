import { CFG } from '../cfg.js'
import * as SmallBugs from './small-bugs.js'
import * as Sound from '../../../utils/sound.js'
import { getRGB } from '../../../utils/helper.js'
//
// Glow mechanics configuration
//
const GLOW_DURATION = 3.0
const GLOW_AURA_RADIUS = 150
const HERO_TOUCH_RADIUS = 50
const BUG_CHAIN_RADIUS = 50
const TRAMPOLINE_FORCE = 1100
const GLOW_PULSE_SPEED = 4.0
const TRAMPOLINE_COOLDOWN = 0.3
//
// Landing squat detection range (hero above bug triggers squat on landing)
//
const SQUAT_HORIZONTAL_RANGE = 35
const SQUAT_VERTICAL_MIN = -70
const SQUAT_VERTICAL_MAX = 5
//
// Instant landing squat depth (pixels) and recovery time (seconds)
// Uses 'recovering' state for immediate dip without pause
//
const LANDING_SQUAT_DEPTH = 8
const LANDING_SQUAT_RECOVERY = 0.25
//
// Vertical offset from platform surface to bug center (prevents clipping into platform)
//
const BUG_SURFACE_OFFSET = 20
//
// Smooth gradient glow ring configuration
// Each ring adds opacity, creating natural falloff from center to edge
//
const GLOW_RING_COUNT = 30
const GLOW_MAX_OPACITY = 0.12
/**
 * Creates a glow bug manager that wraps SmallBugs with glow, trampoline,
 * and chain reaction mechanics
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.hero - Hero instance
 * @param {Object} cfg.sfx - Sound instance
 * @param {Array} cfg.platforms - Array of {x, y, width} defining platforms for bug placement
 * @param {number} [cfg.bugsPerPlatform=3] - Base number of bugs per platform
 * @returns {Object} GlowBug manager instance
 */
export function create(cfg) {
  const { k, hero, sfx, platforms, bugsPerPlatform = 3, minBugsPerPlatform = 2 } = cfg
  //
  // Create bugs evenly distributed across platforms
  //
  const entries = []
  platforms.forEach(platform => {
    const count = Math.max(minBugsPerPlatform, Math.round(platform.width / 200 * bugsPerPlatform))
    for (let i = 0; i < count; i++) {
      const bugX = platform.x - platform.width / 2 + (i + 0.5) * (platform.width / count)
      //
      // Position bug body above platform surface
      //
      const bugY = platform.y - BUG_SURFACE_OFFSET
      const smallBug = SmallBugs.create({
        k,
        x: bugX,
        y: bugY,
        hero,
        sfx,
        surface: 'floor',
        scale: 1.3,
        bounds: {
          minX: platform.x - platform.width / 2 + 20,
          maxX: platform.x + platform.width / 2 - 20
        },
        crawlSpeed: 35 + Math.random() * 25,
        touchRadius: 45
      })
      entries.push({
        bug: smallBug,
        isGlowing: false,
        glowTimer: 0,
        glowColor: getRGB(k, smallBug.pattern.bodyColor),
        trampolineCooldown: 0
      })
    }
  })
  const inst = {
    k,
    hero,
    sfx,
    entries,
    glowRadius: GLOW_AURA_RADIUS
  }
  return inst
}

/**
 * Updates all glow bugs: movement, glow timers, hero collision,
 * trampoline effect, and chain reactions
 * @param {Object} inst - GlowBug manager instance
 * @param {number} dt - Delta time
 */
export function onUpdate(inst, dt) {
  const { k, hero, entries } = inst
  //
  // Update each bug
  //
  entries.forEach(entry => {
    SmallBugs.onUpdate(entry.bug, dt)
    //
    // Decrement glow timer
    //
    if (entry.isGlowing) {
      entry.glowTimer -= dt
      if (entry.glowTimer <= 0) {
        entry.isGlowing = false
        entry.glowTimer = 0
      }
    }
    //
    // Decrement trampoline cooldown
    //
    if (entry.trampolineCooldown > 0) {
      entry.trampolineCooldown -= dt
    }
    //
    // Check hero touch to activate or re-activate glow (resets timer on every contact)
    //
    if (hero?.character?.pos) {
      const dx = hero.character.pos.x - entry.bug.x
      const dy = hero.character.pos.y - entry.bug.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < HERO_TOUCH_RADIUS) {
        activateGlow(entry)
      }
    }
    //
    // Landing squat: hero falling near a bug triggers instant partial dip
    // Uses 'recovering' state with direct dropOffset for immediate effect
    //
    if (hero?.character?.pos && hero.character.vel?.y > 0 && entry.bug.state !== 'scared' && entry.bug.state !== 'recovering') {
      const ldx = Math.abs(hero.character.pos.x - entry.bug.x)
      const ldy = hero.character.pos.y - entry.bug.y
      if (ldx < SQUAT_HORIZONTAL_RANGE && ldy > SQUAT_VERTICAL_MIN && ldy < SQUAT_VERTICAL_MAX) {
        entry.bug.state = 'recovering'
        entry.bug.stateTimer = LANDING_SQUAT_RECOVERY
        entry.bug.dropOffset = LANDING_SQUAT_DEPTH
        entry.bug.vx = 0
      }
    }
    //
    // Trampoline: glowing bug boosts hero upward when hero lands on it
    //
    if (entry.isGlowing && entry.trampolineCooldown <= 0 && hero?.character?.pos) {
      const dx = hero.character.pos.x - entry.bug.x
      const dy = hero.character.pos.y - entry.bug.y
      const horizontalDist = Math.abs(dx)
      //
      // Hero must be above bug and falling down, within horizontal range
      //
      if (horizontalDist < 30 && dy < -5 && dy > -60 && hero.character.vel?.y > 0) {
        hero.character.vel.y = -TRAMPOLINE_FORCE
        entry.trampolineCooldown = TRAMPOLINE_COOLDOWN
        //
        // Reset glow timer on trampoline activation
        //
        entry.glowTimer = GLOW_DURATION
        //
        // Play bounce sound and trigger instant squat
        //
        inst.sfx && Sound.playJumpSound(inst.sfx)
        entry.bug.state = 'recovering'
        entry.bug.stateTimer = LANDING_SQUAT_RECOVERY
        entry.bug.dropOffset = LANDING_SQUAT_DEPTH
        entry.bug.vx = 0
      }
    }
  })
  //
  // Chain reaction: glowing bugs spread glow to nearby non-glowing bugs
  //
  for (let a = 0; a < entries.length; a++) {
    if (!entries[a].isGlowing) continue
    for (let b = 0; b < entries.length; b++) {
      if (a === b || entries[b].isGlowing) continue
      const dx = entries[a].bug.x - entries[b].bug.x
      const dy = entries[a].bug.y - entries[b].bug.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < BUG_CHAIN_RADIUS) {
        activateGlow(entries[b])
      }
    }
  }
}

/**
 * Draws all glow bugs with glow auras
 * @param {Object} inst - GlowBug manager instance
 */
export function onDraw(inst) {
  const { k, entries } = inst
  entries.forEach(entry => {
    //
    // Draw glow aura when glowing
    //
    if (entry.isGlowing) {
      const pulse = 0.7 + Math.sin(k.time() * GLOW_PULSE_SPEED) * 0.3
      const radius = GLOW_AURA_RADIUS * pulse
      const c = entry.glowColor
      //
      // Glow center follows bug body (shifts down when squatting via dropOffset)
      //
      const glowY = entry.bug.y + (entry.bug.dropOffset || 0)
      //
      // Draw smooth radial gradient glow: each ring drawn from outer to inner
      // with opacity following inverse-square falloff for natural light decay
      //
      for (let i = 0; i < GLOW_RING_COUNT; i++) {
        const t = i / GLOW_RING_COUNT
        const ringRadius = radius * (1 - t)
        const falloff = t * t
        const ringOpacity = GLOW_MAX_OPACITY * falloff
        k.drawCircle({
          pos: k.vec2(entry.bug.x, glowY),
          radius: ringRadius,
          color: k.rgb(c.r, c.g, c.b),
          opacity: ringOpacity
        })
      }
    }
    //
    // Draw the bug
    //
    SmallBugs.draw(entry.bug)
  })
}

/**
 * Returns positions and radii of all currently glowing bugs
 * Used by shadow creature for light avoidance
 * @param {Object} inst - GlowBug manager instance
 * @returns {Array} Array of {x, y, radius} for each glowing bug
 */
export function getGlowingPositions(inst) {
  return inst.entries
    .filter(e => e.isGlowing)
    .map(e => ({ x: e.bug.x, y: e.bug.y, radius: GLOW_AURA_RADIUS }))
}

/**
 * Activates glow on a bug entry
 * @param {Object} entry - Bug entry with glow state
 */
function activateGlow(entry) {
  entry.isGlowing = true
  entry.glowTimer = GLOW_DURATION
}
