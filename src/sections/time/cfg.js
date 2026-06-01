import { CFG as GLOBAL_CFG, deepMerge } from '../../cfg.js'
//
// Time section local configuration
// This config is merged with global CFG
// Time section uses grayscale palette (black, white, shades of gray)
//
export const TIME_CFG = {
  audio: {
    //
    // Background music volumes (relative to GLOBAL_CFG.audio.masterVolume)
    //
    backgroundMusic: {
      kids: GLOBAL_CFG.audio.masterVolume * 1.5,   // kids.mp3 volume (56% of master)
      clock: GLOBAL_CFG.audio.masterVolume * 0.6,  // clock.mp3 volume (42% of master)
      time: GLOBAL_CFG.audio.masterVolume * 0.4,   // time.mp3 volume (28% of master)
      words: GLOBAL_CFG.audio.masterVolume * 4     // time0.mp3 volume (100% of master)
    },
    //
    // Spike glint sound effect (metal ping/slash)
    //
    spikeGlint: {
      swishVolume: 0.06,   // Volume of air cutting sound (0-1), quieter than blade
      ringVolume: 0.03     // Volume of metallic ring sound (0-1), quieter than blade
    }
  },
  gameplay: {
    //
    // Target time for speed bonus (in seconds) for each level
    //
    speedBonusTime: {
      'level-time.0': 15,   // Level 0: 15 seconds
      'level-time.1': 75,   // Level 1: 75 seconds
      'level-time.2': 100,   // Level 2: 100 seconds
      'level-time.3': 180   // Level 3: 180 seconds
    }
  },
  visual: {
    //
    // Complementary palette: steel-teal hero + cool playfield against warm
    // orange anti-hero / sun accents (`#FF8C00`).
    //
    colors: {
      background: "#243840",         // Dark teal sky / letterbox
      platform: "#2E4850",           // Teal platform + side walls
      groundStripe: "#1A2830",       // Darker soil strip above bottom platform
      hero: {
        body: "#5A8898",             // Steel teal — matches touch anti-hero teal
        outline: "#000000"           // Black outline
      },
      antiHero: {
        body: "#FF8C00",             // Orange anti-hero accent (matches TIME letters and sun)
        outline: "#000000"           // Black outline
      },
      text: "#FFFFFF",               // White text
      accent: "#808080",             // Medium gray for accents
      //
      // Floating background time phrases — steel-blue shades (complement orange sun)
      //
      floatingPhrase: [
        "#1A2848",                   // Deep navy
        "#243058",                   // Dark steel blue
        "#2E3868",                   // Mid navy
        "#384878",                   // Slate blue
        "#425888",                   // Steel blue
        "#4C6898",                   // Pale steel
        "#5678A8"                    // Sky steel
      ]
    },
    //
    // Spike glint effect configuration (similar to blade glint)
    //
    spikeGlint: {
      intervalMin: 72,     // Minimum seconds between glints (20% more frequent)
      intervalMax: 240,    // Maximum seconds between glints (20% more frequent)
      duration: 0.6        // Duration of light glint effect (seconds)
    }
  }
}
//
// Export merged configuration
//
export const CFG = deepMerge(GLOBAL_CFG, TIME_CFG)

