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
      word: {
        background: "#3E3E3E",         // Dark gray (foggy gloom)
        platform: "#1A1A1A",           // Nearly black platforms
        blades: "#6B8E9F"              // Steel blue blades (cold steel)
      }
    },
    //
    // Flying words/letters configuration for word section
    //
    flyingWords: {
      letterToWordRatio: 0.6  // 60% letters, 40% words (0.0 = all words, 1.0 = all letters)
    }
  }
}
//
// Export merged configuration
//
export const CFG = deepMerge(GLOBAL_CFG, WORD_CFG)