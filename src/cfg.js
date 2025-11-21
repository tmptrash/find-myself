//
// Master audio volume - all other volumes are calculated from this
//
const MASTER_VOLUME = 0.7

//
// Deep merge function to combine nested objects
// Used for merging section-specific configs with global config
//
export function deepMerge(target, source) {
  const result = { ...target }
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  
  return result
}

export const CFG = {
  game: {
    moveSpeed: 300,
    jumpForce: 620,
    gravity: 2000,
    platformName: "platform"
  },
  controls: {
    moveLeft: ['left', 'a'],       // Move left
    moveRight: ['right', 'd'],     // Move right
    jump: ['up', 'w', 'space'],    // Jump
    backToMenu: ['escape'],        // Return to menu
    startGame: ['space', 'enter']  // Start game (from menu/start)
  },
  visual: {
    screen: {
      width: 1920,
      height: 1080
    },
    fonts: {
      regular: 'jetbrains',
      thin: 'jetbrains-thin',
      regularFull: "'JetBrains Mono'",
      thinFull: "'JetBrains Mono Thin'"
    },
    colors: {
      background: "#000000",
      outlineTextColor: "#000000",
      // Common colors
      levelIndicator: {
        active: "#DC143C",             // Red for active/completed levels
        inactive: "#555555"            // Gray for inactive/future levels
      },
      // Splash/menu colors
      menu: {
        platformColor: "#1A1A1A"       // Platform color (for menu background)
      },
      // Ready screen colors
      ready: {
        background: "#191919",         // Dark background
        fireflies: "#FF8C00",          // Hero color for fireflies
        hint: "#969696"                // Hint color
      },
      // Hero colors (for procedural generation)
      hero: {
        body: "#FF8C00",               // Orange body color
        outline: "#000000",            // Black outline
        eyeWhite: "#FFFFFF",           // Eye white
        eyePupil: "#000000"            // Pupil
      },
      // Anti-hero colors
      antiHero: {
        body: "#8B5A50",               // Reddish-brown
        outline: "#000000",            // Black outline
        eyeWhite: "#FFFFFF",           // Eye white
        eyePupil: "#000000"            // Pupil
      }
    },
    //
    // Z-indices (layers)
    //
    zIndex: {
      background: -100,
      flyingWords: -50,
      platforms: 0,
      player: 10,
      ui: 100
    }
  },
  audio: {
    masterVolume: MASTER_VOLUME,
    //
    // Ambient music (splash/menu) - volumes relative to masterVolume
    //
    ambient: {
      volume: MASTER_VOLUME * 1.11,
      bass: MASTER_VOLUME * 0.149,
      mid: MASTER_VOLUME * 0.056,
      high: MASTER_VOLUME * 0.028,
      noise: MASTER_VOLUME * 0.484,
      blip: MASTER_VOLUME * 0.149,
      fadeInTime: 0.5
    },
    //
    // Background music for levels
    //
    backgroundMusic: {
      volume: MASTER_VOLUME * 0.143
    },
    //
    // Level sound effects
    //
    sfx: {
      jump: MASTER_VOLUME * 0.62,
      land: MASTER_VOLUME * 0.613,
      landFade: MASTER_VOLUME * 0.612,
      landDuration: 0.05,
      landFreqStart: 180,
      landFreqEnd: 60,
      step: MASTER_VOLUME * 0.613,
      stepFade: MASTER_VOLUME * 0.041,
      stepDuration: 0.05,
      stepFreqStart: 180,
      stepFreqEnd: 60
    }
  }
}
