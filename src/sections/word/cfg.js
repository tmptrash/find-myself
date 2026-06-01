import { CFG as GLOBAL_CFG, deepMerge } from '../../cfg.js'
//
// Word section local configuration
// This config is merged with global CFG
//
/**
 * Resolves per-level background and platform colors (deeper levels get darker)
 * @param {string} levelName - Level id (e.g. 'level-word.2')
 * @returns {{ background: string, platform: string }}
 */
export function getLevelColors(levelName) {
  const levelEntry = CFG.visual.levelColors?.[levelName]
  return {
    background: levelEntry?.background ?? CFG.visual.colors.background,
    platform: levelEntry?.platform ?? CFG.visual.colors.platform
  }
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
    // Burgundy playfield — warm red field with steel-blue AAA blades.
    //
    colors: {
      background: "#080606",         // Default — near-black void between bookshelves
      platform: "#452028",           // Default / level 0 playfield
      blades: "#6B8E9F",             // Steel blue AAA blades
      killerLetter: "#6B8E9F",       // Steel blue — matches AAA blades
      deathMessage: "#D05060",       // Bottom death subtitle (light red)
      //
      // Hanging vine letters — light red fill, black outline in word-hanging-vines.js
      //
      vineLetter: [
        "#C84858",
        "#D05868",
        "#D86878",
        "#E07888"
      ],
      backgroundHero: [              // Muted burgundy silhouettes
        "#5A2830",
        "#6A3038",
        "#482028"
      ],
      //
      // Drifting background phrase layers — red shades (thin outline in flying-words.js)
      //
      floatingPhrase: [
        "#2A1018",
        "#381420",
        "#481828",
        "#582030",
        "#682838",
        "#783040",
        "#883848"
      ]
    },
    //
    // Per-level playfield darkness — each deeper level is darker than the last
    //
    levelColors: {
      'level-word.0': { background: '#0A0808', platform: '#452028' },
      'level-word.1': { background: '#080606', platform: '#3A1820' },
      'level-word.2': { background: '#060404', platform: '#301018' },
      'level-word.3': { background: '#040303', platform: '#260C14' },
      'level-word.4': { background: '#020202', platform: '#1E080C' }
    },
    //
    // Layer order: word pile and flying words behind large background heroes
    //
    zIndex: {
      wordVoidBackground: -112,
      wordStaticBgWords: -108,
      wordWordPileFar: -72,
      wordWordPileMid: -58,
      wordFlyingWords: -45,
      wordBackgroundHero: -32
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
