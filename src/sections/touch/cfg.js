import { CFG as GLOBAL_CFG, deepMerge } from '../../cfg.js'
//
// Touch section local configuration
// This config is merged with global CFG
//
export const TOUCH_CFG = {
  visual: {
    //
    // Colors specific to touch section
    //
    colors: {
      background: "#2A2A2A",         // Darker gray background
      platform: "#1F1F1F"            // Dark platforms
    },
    //
    // Game area configuration (larger than word section)
    //
    gameArea: {
      topMargin: 80,      // Small margin from top
      bottomMargin: 50,   // Small margin from bottom
      leftMargin: 100,    // Small margin from left
      rightMargin: 100    // Small margin from right
    }
  }
}
//
// Export merged configuration
//
export const CFG = deepMerge(GLOBAL_CFG, TOUCH_CFG)

