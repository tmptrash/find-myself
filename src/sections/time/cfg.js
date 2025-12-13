import { CFG as GLOBAL_CFG, deepMerge } from '../../cfg.js'
//
// Time section local configuration
// This config is merged with global CFG
// Time section uses grayscale palette (black, white, shades of gray)
//
export const TIME_CFG = {
  visual: {
    //
    // Colors specific to time section (grayscale only)
    //
    colors: {
      background: "#2A2A2A",         // Dark gray background (almost black)
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
    }
  }
}
//
// Export merged configuration
//
export const CFG = deepMerge(GLOBAL_CFG, TIME_CFG)

