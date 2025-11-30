import { CFG as GLOBAL_CFG, deepMerge } from '../../cfg.js'
//
// Word section local configuration
// This config is merged with global CFG
//
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
    // Colors specific to word section
    //
    colors: {
      background: "#3E3E3E",         // Dark gray (foggy gloom)
      platform: "#1A1A1A",           // Nearly black platforms
      blades: "#6B8E9F",             // Steel blue blades (cold steel)
      killerLetter: "#6B8E9F"        // Steel blue killer words (same as blades)
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
  }
}
//
// Export merged configuration
//
export const CFG = deepMerge(GLOBAL_CFG, WORD_CFG)