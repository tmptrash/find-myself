import { CFG as GLOBAL_CFG, deepMerge } from '../../cfg.js'
//
// Touch section local configuration
// This config is merged with global CFG
//
export const TOUCH_CFG = {
  game: {
    jumpForce: 760  // Higher jump force for touch section (vs 640 in word section)
  },
  gameplay: {
    //
    // Target time for speed bonus (in seconds) for each level
    // Player gets 3 bonus points if completing level faster than this
    //
    speedBonusTime: {
      'level-touch.0': 240,  // Level 0: 4 minutes
      'level-touch.1': 40    // Level 1: 40 seconds
    }
  },
  visual: {
    //
    // Colors specific to touch section
    //
    colors: {
      background: "#2A2A2A",         // Darker gray background
      platform: "#1F1F1F",           // Dark platforms
      sections: {
        touch: {
          body: "#FFC0CB",           // Pink - soft, tactile, skin-like (from global CFG)
          antiHero: "#D8A0AB"        // Darker pink for anti-hero (darker shade of body color)
        }
      }
    },
    //
    // Game area configuration (larger than word section)
    //
    gameArea: {
      topMargin: 110,     // Margin from top (room for small hero and life icons)
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
