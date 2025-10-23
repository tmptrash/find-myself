export const CFG = {
  audio: {
    // Ambient music (splash/menu)
    ambient: {
      masterVolume: 0.52,        // Overall ambient music volume
      bassVolume: 0.08,          // Low drones volume
      midVolume: 0.03,           // Mid tones volume
      highVolume: 0.015,         // High tones volume
      noiseVolume: 0.03,         // Noise volume
      blipVolume: 0.08,          // Random sounds volume
      fadeInTime: 0.5,           // Fade-in time (seconds)
    },
    
    // Level sound effects
    sfx: {
      landVolume: 0.343,         // Landing sound volume
      landFade: 0.029,           // Landing fade
      landDuration: 0.1,         // Sound duration (seconds)
      landFreqStart: 250,        // Start frequency (Hz)
      landFreqEnd: 80,           // End frequency (Hz)
      
      stepVolume: 0.176,         // Step sound volume
      stepFade: 0.022,           // Step fade
      stepDuration: 0.05,        // Sound duration (seconds)
      stepFreqStart: 180,        // Start frequency (Hz)
      stepFreqEnd: 60,           // End frequency (Hz)
    }
  },
  gameplay: {
    // Physics (as ratios of screen height for resolution independence)
    moveSpeedRatio: 0.33,        // Hero movement speed (screen heights/s)
    jumpForceRatio: 0.65,        // Jump force (screen heights/s)
    gravityRatio: 2.17,          // Gravity (screen heights/s²)
  },
  colors: {
    outlineTextColor: "000000",
    // Level 1 colors
    level1: {
      background: "FFDAB9",         // Light peach background
      platform: "2C3E50",           // Dark brown platforms
      spikes: "DC143C",             // Crimson red spikes (danger!)
      instructions: "FFDAB9",       // Instructions text color
    },
    
    // Splash/menu colors
    menu: {
      background: "191919",         // Dark gray background
      gridLines: "323232",          // Grid lines
      titleBase: "FF8C00",          // Title base color
      startButton: "FF6432",        // Ready button color
      muteText: "FFA500",           // Mute text color
      dividerLine: "FF8C00",        // Divider line
    },
    
    // Ready screen colors
    ready: {
      background: "191919",         // Dark background      
      hint: "969696",               // Hint color
    },
    
    // Hero colors (for procedural generation)
    hero: {
      body: "FF8C00",               // Orange body color
      outline: "000000",            // Black outline
      eyeWhite: "FFFFFF",           // Eye white
      eyePupil: "000000",           // Pupil
    },
    
    // Anti-hero colors
    antiHero: {
      body: "8B5A50",               // Reddish-brown
      outline: "000000",            // Black outline
      eyeWhite: "FFFFFF",           // Eye white
      eyePupil: "000000",           // Pupil
    }
  },
  controls: {
    // Movement
    moveLeft: ['left', 'a'],       // Move left
    moveRight: ['right', 'd'],     // Move right
    moveUp: ['up', 'w'],           // Move up (for jump)
    
    // Actions
    jump: ['up', 'w', 'space'],    // Jump
    
    // System
    toggleMute: ['m'],             // Toggle sound
    backToMenu: ['escape'],        // Return to menu
    startGame: ['space', 'enter'], // Start game (from menu/start)
  },
  visual: {
    // Platform dimensions (in % of screen dimensions)
    bottomPlatformHeight: 33.3,    // Bottom platform height (% of screen height)
    topPlatformHeight: 33.3,       // Top platform height (% of screen height)
    sideWallWidth: 10,             // Side walls width (% of screen width)
    
    // UI dimensions
    instructionsFontSize: 18,      // Instructions font size
    titleFontSize: 64,             // Title font size
    
    // UI positions
    instructionsX: 20,             // Instructions X position
    instructionsY: 20,             // Instructions Y position
    
    // Z-indices (layers)
    zIndex: {
      background: -100,
      platforms: 0,
      player: 10,
      ui: 100,
    }
  },
  levels: {
    level1: {
      name: "Level 1",
      
      // Hero spawn position (% of screen dimensions)
      // Heroes spawn on bottom platform (33.3% height starts at 66.7% Y)
      heroSpawn: {
        x: 12,    // % of screen width (left side, after left wall at 20%)
        y: 64     // % of screen height (on bottom platform)
      },
      antiHeroSpawn: {
        x: 88,    // % of screen width (right side, before right wall at 80%)
        y: 64     // % of screen height (on bottom platform)
      }
    },
    
    level2: {
      name: "Level 2",
      
      // Hero spawn position (% of screen dimensions)
      heroSpawn: {
        x: 25,    // % of screen width (left side)
        y: 64     // % of screen height (on bottom platform)
      }
    }
  },
}
