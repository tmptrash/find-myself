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
      landVolume: 0.176,         // Landing sound volume (same as step)
      landFade: 0.022,           // Landing fade (same as step)
      landDuration: 0.05,        // Sound duration (seconds)
      landFreqStart: 180,        // Start frequency (Hz) - same as step
      landFreqEnd: 60,           // End frequency (Hz) - same as step
      
      stepVolume: 0.176,         // Step sound volume
      stepFade: 0.022,           // Step fade
      stepDuration: 0.05,        // Sound duration (seconds)
      stepFreqStart: 180,        // Start frequency (Hz)
      stepFreqEnd: 60,           // End frequency (Hz)
    }
  },
  gameplay: {
    // Physics (as ratios of screen height for resolution independence)
    moveSpeedRatio: 29,        // Hero movement speed (screen heights/s)
    jumpForceRatio: 0.6,         // Jump force (screen heights/s)
    gravityRatio: 2.17,          // Gravity (screen heights/s²)
  },
  colors: {
    outlineTextColor: "000000",
    // Common colors
    levelIndicator: {
      active: "DC143C",     // Red for active/completed levels
      inactive: "555555",   // Gray for inactive/future levels
    },
    // Level 0 colors (intro level - word section)
    "level-word.0": {
      background: "3E3E3E",         // Dark gray (foggy gloom)
      platform: "1A1A1A",           // Nearly black platforms
      spikes: "DC143C",             // Crimson red spikes (for level indicator)
      instructions: "CCCCCC",       // Light gray instructions
    },
    // Level 1 colors (word section)
    "level-word.1": {
      background: "3E3E3E",         // Dark gray (foggy gloom)
      platform: "1A1A1A",           // Nearly black platforms
      spikes: "DC143C",             // Crimson red spikes (danger!)
      instructions: "CCCCCC",       // Light gray instructions
    },
    // Level 2 colors (word section)
    "level-word.2": {
      background: "3E3E3E",         // Dark gray (foggy gloom)
      platform: "1A1A1A",           // Nearly black platforms
      spikes: "DC143C",             // Crimson red spikes (danger!)
      instructions: "CCCCCC",       // Light gray instructions
    },
    // Level 3 colors (word section)
    "level-word.3": {
      background: "3E3E3E",         // Dark gray (foggy gloom)
      platform: "1A1A1A",           // Nearly black platforms
      spikes: "DC143C",             // Crimson red spikes (danger!)
      instructions: "CCCCCC",       // Light gray instructions
    },
    // Level 4 colors (word section)
    "level-word.4": {
      background: "3E3E3E",         // Dark gray (foggy gloom)
      platform: "1A1A1A",           // Nearly black platforms
      spikes: "DC143C",             // Crimson red spikes (danger!)
      instructions: "CCCCCC",       // Light gray instructions
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
      title: "FF8C00",              // Orange title (hero color)
      text: "CCCCCC",               // Light gray text
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
    },
    
    // Section colors for menu anti-heroes
    sections: {
      word: {
        body: "DC143C",             // Crimson red
        outline: "8B0000",          // Dark red
        lightning: "DC143C"
      },
      touch: {
        body: "FF6B35",             // Orange-red
        outline: "CC4400",          // Dark orange
        lightning: "FF6B35"
      },
      feel: {
        body: "FFD700",             // Gold
        outline: "B8860B",          // Dark goldenrod
        lightning: "FFD700"
      },
      memory: {
        body: "4ECDC4",             // Turquoise
        outline: "2C7A7B",          // Dark teal
        lightning: "4ECDC4"
      },
      stress: {
        body: "9B59B6",             // Purple
        outline: "6C3483",          // Dark purple
        lightning: "9B59B6"
      },
      time: {
        body: "34495E",             // Dark blue-gray
        outline: "1C2833",          // Very dark blue
        lightning: "34495E"
      }
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
    platformName: "platform",
    "level-word.0": {
      name: "Level 0 - Word",
      
      // Hero spawn position (% of screen dimensions)
      // Heroes spawn on bottom platform (33.3% height starts at 66.7% Y)
      heroSpawn: {
        x: 12,    // % of screen width (left side, after left wall at 10%)
        y: 64     // % of screen height (on bottom platform)
      },
      antiHeroSpawn: {
        x: 88,    // % of screen width (right side, before right wall at 90%)
        y: 64     // % of screen height (on bottom platform)
      }
    },
    
    "level-word.1": {
      name: "Level 1 - Word",
      
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
    
    "level-word.2": {
      name: "Level 2 - Word",
      
      // Hero spawn position (% of screen dimensions)
      heroSpawn: {
        x: 12,    // % of screen width (more to the right)
        y: 64     // % of screen height (on bottom platform)
      },
      antiHeroSpawn: {
        x: 88,    // % of screen width (right side, before right wall at 80%)
        y: 64     // % of screen height (on bottom platform)
      }
    },
    
    "level-word.3": {
      name: "Level 3 - Word",
      
      // Hero spawn position (% of screen dimensions)
      heroSpawn: {
        x: 30,    // % of screen width (left side)
        y: 64     // % of screen height (on bottom platform)
      },
      antiHeroSpawn: {
        x: 88,    // % of screen width (right side, before right wall at 80%)
        y: 64     // % of screen height (on bottom platform)
      }
    },
    
    "level-word.4": {
      name: "Level 4 - Word",
      
      // Hero spawn position (% of screen dimensions)
      heroSpawn: {
        x: 12,    // % of screen width (left side)
        y: 52     // % of screen height (on bottom platform - higher)
      },
      antiHeroSpawn: {
        x: 88,    // % of screen width (right side)
        y: 52     // % of screen height (on bottom platform - higher)
      },
      
      // Platform heights (gap = hero height, hero touches ceiling when jumping)
      bottomPlatformHeight: 45.5,    // Bottom platform height (% of screen height) - higher than default
      topPlatformHeight: 45.5         // Top platform height (% of screen height) - lower than default
    }
  },
}
