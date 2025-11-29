import { CFG as GLOBAL_CFG, deepMerge } from '../../cfg.js'

//
// Word section local configuration
// This config is merged with global CFG
//
export const WORD_CFG = {
  visual: {
    //
    // Colors specific to word section
    //
    colors: {
      background: "#3E3E3E",         // Dark gray (foggy gloom)
      platform: "#1A1A1A",           // Nearly black platforms
      blades: "#6B8E9F",             // Steel blue blades (cold steel)
      killerLetter: "#6B8E9F"        // Steel blue killer letters (same as blades)
    },
    //
    // Flying words/letters configuration for word section
    //
    flyingWords: {
      letterToWordRatio: 0.6  // 60% letters, 40% words (0.0 = all words, 1.0 = all letters)
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
      intervalMax: 25,    // Maximum seconds between glints
      duration: 0.8       // Duration of light glint effect (seconds)
    }
  }
}
//
// Export merged configuration
//
export const CFG = deepMerge(GLOBAL_CFG, WORD_CFG)