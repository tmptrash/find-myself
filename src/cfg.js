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
    // Physics
    moveSpeed: 450,              // Hero movement speed (px/s)
    jumpForce: 800,              // Jump force (px/s)
    gravity: 2200,               // Gravity (px/s²)
  },
  colors: {
    outlineTextColor: "000000",
    // Level 1 colors
    level1: {
      background: "FFDAB9",         // Light peach background
      platform: "3E2723",           // Dark brown platforms
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
    // Window dimensions
    windowWidth: 1280,
    windowHeight: 920,
    
    // Platform dimensions
    platformHeight: 80,            // Large platform height
    wallWidth: 30,                 // Corridor wall width
    smallPlatformHeight: 20,       // Small platform height
    
    // UI dimensions
    instructionsFontSize: 14,      // Instructions font size
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
      
      // Hero spawn position (on bottom platform)
      heroSpawn: {
        x: 250,
        y: 801
      },
      antiHeroSpawn: {
        x: 1100,
        y: 801
      },
      
      // Platform configuration
      platforms: {
        bottom: { height: 150 },
        top: { height: 150 },
        leftWall: { width: 30 },
        rightWall: { width: 30 },
      }
    },
    
    level2: {
      name: "Level 2",
      
      // Hero spawn position (on bottom platform)
      heroSpawn: {
        x: 250,
        y: 801
      },
      
      // Platform configuration
      platforms: {
        bottom: { height: 150 },
        top: { height: 150 },
        leftWall: { width: 30 },
        rightWall: { width: 30 },
      }
    }
  },
}
