//
// Master audio volume - all other volumes are calculated from this
//
const MASTER_VOLUME = 0.7

export const CFG = {
  game: {
    moveSpeed: 300,
    jumpForce: 620,
    gravity: 2000,
    platformName: "platform"
  },
  controls: {
    // Movement
    moveLeft: ['left', 'a'],       // Move left
    moveRight: ['right', 'd'],     // Move right
    
    // Actions
    jump: ['up', 'w', 'space'],    // Jump
    
    // System
    backToMenu: ['escape'],        // Return to menu
    startGame: ['space', 'enter']  // Start game (from menu/start)
  },
  visual: {
    screen: {
      width: 1920,
      height: 1080,
      background: "#000000"
    },
    fonts: {
      regular: 'jetbrains',
      thin: 'jetbrains-thin',
      regularFull: "'JetBrains Mono'",
      thinFull: "'JetBrains Mono Thin'"
    },
    colors: {
      outlineTextColor: "#000000",
      // Common colors
      levelIndicator: {
        active: "#DC143C",     // Red for active/completed levels
        inactive: "#555555",   // Gray for inactive/future levels
      },
      // Level 0 colors (intro level - word section)
      "level-word.0": {
        background: "#3E3E3E",         // Dark gray (foggy gloom)
        platform: "#1A1A1A",           // Nearly black platforms
        blades: "#6B8E9F",             // Steel blue blades (cold steel)
        instructions: "#CCCCCC",       // Light gray instructions
      },
      // Level 1 colors (word section)
      "level-word.1": {
        background: "#3E3E3E",         // Dark gray (foggy gloom)
        platform: "#1A1A1A",           // Nearly black platforms
        blades: "#6B8E9F",             // Steel blue blades (cold steel)
        instructions: "#CCCCCC",       // Light gray instructions
      },
      // Level 2 colors (word section)
      "level-word.2": {
        background: "#3E3E3E",         // Dark gray (foggy gloom)
        platform: "#1A1A1A",           // Nearly black platforms
        blades: "#6B8E9F",             // Steel blue blades (cold steel)
        instructions: "#CCCCCC",       // Light gray instructions
      },
      // Level 3 colors (word section)
      "level-word.3": {
        background: "#3E3E3E",         // Dark gray (foggy gloom)
        platform: "#1A1A1A",           // Nearly black platforms
        blades: "#6B8E9F",             // Steel blue blades (cold steel)
        instructions: "#CCCCCC",       // Light gray instructions
      },
      // Level 4 colors (word section)
      "level-word.4": {
        background: "#3E3E3E",         // Dark gray (foggy gloom)
        platform: "#1A1A1A",           // Nearly black platforms
        blades: "#6B8E9F",             // Steel blue blades (cold steel)
        instructions: "#CCCCCC",       // Light gray instructions
      },
      
      // Splash/menu colors
      menu: {
        background: "#191919",         // Dark gray background
        gridLines: "#323232",          // Grid lines
        titleBase: "#FF8C00",          // Title base color
        startButton: "#FF6432",        // Ready button color
        muteText: "#FFA500",           // Mute text color
        dividerLine: "#FF8C00",        // Divider line
      },
      
      // Ready screen colors
      ready: {
        background: "#191919",         // Dark background      
        title: "#FF8C00",              // Orange title (hero color)
        text: "#ff930e",               // Yellow-orange for story lines (lighter, more yellow)
        fireflies: "#FF8C00",          // Hero color for fireflies
        hint: "#969696",               // Hint color
      },
      
      // Hero colors (for procedural generation)
      hero: {
        body: "#FF8C00",               // Orange body color
        outline: "#000000",            // Black outline
        eyeWhite: "#FFFFFF",           // Eye white
        eyePupil: "#000000",           // Pupil
      },
      
      // Anti-hero colors
      antiHero: {
        body: "#8B5A50",               // Reddish-brown
        outline: "#000000",            // Black outline
        eyeWhite: "#FFFFFF",           // Eye white
        eyePupil: "#000000",           // Pupil
      },
      
      // Section colors for menu anti-heroes
      sections: {
        word: {
          body: "#DC143C",             // Crimson red
          outline: "#8B0000",          // Dark red
          lightning: "#DC143C"
        },
        touch: {
          body: "#FF6B35",             // Orange-red
          outline: "#CC4400",          // Dark orange
          lightning: "#FF6B35"
        },
        feel: {
          body: "#FFD700",             // Gold
          outline: "#B8860B",          // Dark goldenrod
          lightning: "#FFD700"
        },
        mind: {
          body: "#4ECDC4",             // Turquoise
          outline: "#2C7A7B",          // Dark teal
          lightning: "#4ECDC4"
        },
        stress: {
          body: "#9B59B6",             // Purple
          outline: "#6C3483",          // Dark purple
          lightning: "#9B59B6"
        },
        time: {
          body: "#34495E",             // Dark blue-gray
          outline: "#1C2833",          // Very dark blue
          lightning: "#34495E"
        }
      }
    },
    // UI dimensions
    instructionsFontSize: 18,      // Instructions font size
    titleFontSize: 64,             // Title font size
    
    // UI positions
    instructionsX: 20,             // Instructions X position
    instructionsY: 20,             // Instructions Y position
    //
    // Flying words/letters configuration
    //
    flyingWords: {
      letterToWordRatio: 0.6  // 75% letters, 25% words (0.0 = all words, 1.0 = all letters)
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
