// ============================================
// GLOBAL GAME CONFIGURATION
// ============================================
// All configurable parameters in one place

export const CONFIG = {
  // ==========================================
  // AUDIO
  // ==========================================
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

  // ==========================================
  // GAMEPLAY
  // ==========================================
  gameplay: {
    // Physics
    moveSpeed: 450,              // Hero movement speed (px/s)
    jumpForce: 800,              // Jump force (px/s)
    gravity: 2200,               // Gravity (px/s²)
    
    // Animations
    runAnimSpeed: 0.04,          // Run animation speed (sec per frame)
    runFrameCount: 6,            // Number of run frames
    eyeAnimMinDelay: 1.5,        // Min eye animation delay (sec)
    eyeAnimMaxDelay: 3.5,        // Max eye animation delay (sec)
    eyeLerpSpeed: 0.1,           // Eye interpolation speed
    
    // Hero and collision sizes
    heroScale: 3,                // Hero sprite scale
    spriteSize: 32,              // Base sprite size (px, before scaling)
    collisionWidth: 14,          // Collision box width (px)
    collisionHeight: 25,         // Collision box height (px)
    collisionOffsetX: 0,         // Collision box X offset
    collisionOffsetY: 0,         // Collision box Y offset
  },

  // ==========================================
  // COLORS
  // ==========================================
  colors: {
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
      button: "FF6432",             // "Are you ready?" button
      buttonText: "FFFFFF",         // Button text
      buttonOutline: "000000",      // Button outline
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

  // ==========================================
  // CONTROLS (KEYS)
  // ==========================================
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

  // ==========================================
  // VISUAL
  // ==========================================
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
    buttonFontSize: 36,            // Button font size
    
    // UI positions
    instructionsX: 20,             // Instructions X position
    instructionsY: 20,             // Instructions Y position
    
    // Menu animations
    menu: {
      bgScrollSpeed: 0.5,          // Background scroll speed
      glitchFrequency: 0.5,        // Glitch frequency (seconds)
      titlePulseSpeed: 3,          // Title pulse speed
      buttonPulseAmount: 0.03,     // Button pulse amplitude
      buttonHoverScale: 1.08,      // Button scale on hover
    },
    
    // Z-indices (layers)
    zIndex: {
      background: -100,
      platforms: 0,
      player: 10,
      ui: 100,
    }
  },

  // ==========================================
  // LEVELS
  // ==========================================
  levels: {
    level1: {
      name: "Level 1",
      
      // Hero spawn position (on bottom platform)
      heroSpawn: {
        x: 250,                    // Left side of screen
        y: 801,                    // On bottom platform (calculated: 840 - 39px offset)
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
        x: 250,                    // Left side of screen
        y: 801,                    // On bottom platform (calculated: 840 - 39px offset)
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
