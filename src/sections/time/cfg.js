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
      kids: GLOBAL_CFG.audio.masterVolume * 0.8,   // kids.mp3 volume (56% of master)
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
  visual: {
    //
    // Colors specific to time section (grayscale only)
    //
    colors: {
      background: "#505050",         // Same as platforms (medium gray)
      platform: "#505050",           // Medium gray platforms
      hero: {
        body: "#C0C0C0",             // Light gray hero (not pure white)
        outline: "#000000"           // Black outline
      },
      antiHero: {
        body: "#606060",             // Medium-light gray anti-hero (not too dark)
        outline: "#000000"           // Black outline
      },
      text: "#FFFFFF",               // White text
      accent: "#808080"              // Medium gray for accents
    },
    //
    // Spike glint effect configuration (similar to blade glint)
    //
    spikeGlint: {
      intervalMin: 40,     // Minimum seconds between glints (even slower)
      intervalMax: 120,    // Maximum seconds between glints (even slower)
      duration: 0.6        // Duration of light glint effect (seconds)
    }
  }
}
//
// Export merged configuration
//
export const CFG = deepMerge(GLOBAL_CFG, TIME_CFG)

