import { CFG as GLOBAL_CFG, deepMerge } from '../../cfg.js'
//
// Word section local configuration
// This config is merged with global CFG
//
/**
 * Resolves per-level consciousness palette
 * @param {string} levelName - Level id (e.g. 'level-word.2')
 * @returns {{ background: string, platform: string, playfield: string }}
 */
export function getLevelColors(levelName) {
  const levelEntry = CFG.visual.levelColors?.[levelName]
  const platform = levelEntry?.platform ?? CFG.visual.colors.platform
  return {
    background: levelEntry?.background ?? CFG.visual.colors.background,
    platform,
    playfield: levelEntry?.playfield ?? CFG.visual.colors.consciousness?.gameWorld ?? platform
  }
}

/**
 * Returns a consciousness layer color by key
 * @param {string} layerKey - consciousness key (distantThoughts, memories, gameWorld, etc.)
 * @returns {string} Hex color
 */
export function getConsciousnessColor(layerKey) {
  const c = CFG.visual.colors.consciousness
  return c?.[layerKey] ?? CFG.visual.colors.platform
}

/**
 * Shifts a color by depth — near = lighter, far = darker/cooler/less saturated
 * @param {string} hex - Source hex color
 * @param {number} depth - Depth 0 (near) to 1 (far)
 * @returns {string} Adjusted hex color
 */
export function depthConsciousnessColor(hex, depth) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const t = Math.min(1, Math.max(0, depth))
  const gray = (r + g + b) / 3
  //
  // Higher desaturation coefficient makes far layers look more grey/hazy (platformer style)
  //
  const desatR = r + (gray - r) * t * 0.70
  const desatG = g + (gray - g) * t * 0.70
  const desatB = b + (gray - b) * t * 0.62
  const coolR = desatR * (1 - t * 0.10)
  const coolG = desatG * (1 - t * 0.02)
  const coolB = desatB * (1 + t * 0.06)
  const lift = 1 - t * 0.18
  const lr = Math.round(Math.max(0, Math.min(255, coolR * lift)))
  const lg = Math.round(Math.max(0, Math.min(255, coolG * lift)))
  const lb = Math.round(Math.max(0, Math.min(255, coolB * lift)))
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}

/**
 * Lerps a foreground color toward the playfield/background by depth (0 = near, 1 = far)
 * @param {string} foregroundHex - Object accent hex
 * @param {string} backgroundHex - Background or playfield hex
 * @param {number} depth - Depth 0 (near) to 1 (far)
 * @returns {string} Blended hex color
 */
export function blendTowardBackground(foregroundHex, backgroundHex, depth) {
  const t = Math.min(1, Math.max(0, depth))
  const parse = (hex) => {
    if (!hex) return [0, 0, 0]
    const h = hex.replace('#', '')
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16)
    ]
  }
  const [fr, fg, fb] = parse(foregroundHex)
  const [br, bg, bb] = parse(backgroundHex)
  const r = Math.round(fr + (br - fr) * t)
  const g = Math.round(fg + (bg - fg) * t)
  const b = Math.round(fb + (bb - fb) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Parallax depth tint — farther objects merge into the backdrop, darken, desaturate, and cool
 * @param {string} accentHex - Object accent color
 * @param {string} backgroundHex - Layer backdrop (void sky or playfield fill)
 * @param {number} depth - Depth 0 (near) to 1 (far)
 * @returns {string} Adjusted hex color
 */
export function atmosphericDepthColor(accentHex, backgroundHex, depth) {
  const fallback = backgroundHex ?? accentHex ?? CFG.visual.colors.background
  const accent = accentHex ?? fallback
  const backdrop = backgroundHex ?? fallback
  const t = Math.min(1, Math.max(0, depth))
  const eased = t * t * (3 - 2 * t)
  const merged = blendTowardBackground(accent, backdrop, eased)
  return depthConsciousnessColor(merged, t)
}
export const WORD_CFG = {
  audio: {
    //
    // Blade glint sound effect (metal ping/slash)
    //
    bladeGlint: {
      swishVolume: 0.08,   // Volume of air cutting sound (0-1)
      ringVolume: 0.04     // Volume of metallic ring sound (0-1)
    }
  },
  visual: {
    //
    // Consciousness interior — dark depth to light foreground; hero pops in yellow
    //
    colors: {
      background: "#0A0A12",         // Layer 0 — thought sky (full void)
      platform: "#323242",           // Layer 5 — dark frame strips (top/bottom/sides)
      playfieldOutline: "#3A3A50",   // Muted stroke on drifting words
      blades: "#4AC6F5",             // Interactive accent — steel-cyan blades
      killerLetter: "#4AC6F5",       // Killer words — same accent
      deathMessage: "#D05060",       // Bottom death subtitle
      hero: {
        body: "#F5D44A"              // Hero — warm yellow against the void
      },
      //
      // Consciousness layer palette
      //
      consciousness: {
        thoughtSky: "#0A0A12",         // Layer 0 — farthest back
        distantThoughts: "#403E58",    // Layer 0–1 — drifting whispers (soft grey-violet)
        memories: "#4E4C68",           // Layer 2–4 — mid silhouettes (medium grey-violet)
        backgroundHero: "#625E7A",     // Large watching silhouettes (warm mid-violet)
        gameWorld: "#5A5A70",          // Layer 5 — playable interior fill
        accent: "#4AC6F5",             // Traps, blades, killer words
        foregroundSilhouette: "#302C48", // Layer 7 — edge occlusion (dark violet)
        vine: "#948ABC",               // Layer 6 — hanging vine letters (matches brain root filaments)
        flyingWord: "#7C7A96",         // Layer 6 — drifting thoughts (muted lavender)
        emotions: {
          anxiety: "#686690",          // Soft periwinkle
          fear: "#585676",             // Dusty violet
          hope: "#888AA8",             // Pale lavender
          anger: "#78687A"             // Dusty mauve
        }
      }
    },
    //
    // Per-level palette — deeper levels darken the interior slightly
    //
    levelColors: {
      'level-word.0': { background: '#0A0A12', platform: '#323242', playfield: '#5A5A70' },
      'level-word.1': { background: '#090911', platform: '#2E2E3C', playfield: '#56566C' },
      'level-word.2': { background: '#080810', platform: '#2A2A38', playfield: '#525268' },
      'level-word.3': { background: '#07070E', platform: '#262634', playfield: '#4E4E64' },
      'level-word.4': { background: '#4A4A60', platform: '#222230', playfield: '#4A4A60' }
    },
    //
    // Z-order inside playfield (back → front): sky, noise, stream, emotions, memories, world, flying, vines, foreground
    //
    zIndex: {
      wordThoughtSky: -118,
      wordConsciousnessNoise: -114,
      wordThoughtStream: -108,
      wordEmotions: -102,
      wordMemories: -96,
      wordPlayfieldFill: -90,
      wordBackgroundHero: -72,
      wordFlyingWords: -78,
      wordVines: -58,
      wordForeground: 8
    },
    //
    // Flying words/letters configuration for word section
    //
    flyingWords: {
      letterToWordRatio: 0.6  // 60% letters, 40% words (0.0 = all words, 1.0 = all letters)
    },
    //
    // Killer words configuration
    //
    killerWords: {
      spawnDelay: 3.0  // Delay before killer words start moving (seconds)
    },
    //
    // Death message configuration
    //
    deathMessage: {
      duration: 2.0,      // Message display duration (seconds)
      fadeDuration: 0.3   // Fade in/out duration (seconds)
    },
    //
    // Blade glint effect configuration
    //
    bladeGlint: {
      intervalMin: 10,    // Minimum seconds between glints
      intervalMax: 35,    // Maximum seconds between glints
      duration: 0.8       // Duration of light glint effect (seconds)
    }
  },
  gameplay: {
    //
    // Speed bonus time targets for each level (seconds)
    // Player gets bonus point if completing level faster than this
    //
    speedBonusTime: {
      'level-word.0': 10,   // Level 0
      'level-word.1': 10,   // Level 1
      'level-word.2': 15,   // Level 2
      'level-word.3': 15    // Level 3
    }
  }
}
//
// Export merged configuration
//
export const CFG = deepMerge(GLOBAL_CFG, WORD_CFG)
