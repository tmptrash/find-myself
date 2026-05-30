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
      'level-touch.1': 40,   // Level 1: 40 seconds
      'level-touch.2': 50    // Level 2: 50 seconds
    }
  },
  visual: {
    //
    // Colors specific to touch section. The section runs a teal+orange
    // complementary palette: cool teals occupy the recessive frame
    // (walls / sky / background fog) while warm oranges drive focal
    // points (foliage, hazards, hero progression accents). The section
    // identity color (used by the level indicator + hero-after-touch
    // completion) is a steel teal — it's the direct complementary of
    // the silver default hero, and the colour the anti-hero takes
    // throughout every touch level.
    //
    colors: {
      background: "#1C323A",
      platform: "#152528",
      sections: {
        touch: {
          body: "#5A8898",
          antiHero: "#5A8898"
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
