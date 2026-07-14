//
// Master audio volume - all other volumes are calculated from this
//
const MASTER_VOLUME = 0.7
//
// Game-wide 96-colour palette (single source of truth, image order, row-major).
// Every colour used in game code MUST be one of these values (brightness via
// opacity is allowed). Rows are hue families, index 0 = darkest tone.
//
const PALETTE = {
  gray0: '#2f3b3d',
  gray1: '#464b4f',
  gray2: '#5c6163',
  gray3: '#7b7d77',
  gray4: '#999991',
  gray5: '#b5b2ac',
  gray6: '#d4d0cd',
  gray7: '#ebf0ee',
  sand0: '#57483b',
  sand1: '#6e5f4d',
  sand2: '#8a7b63',
  sand3: '#a3987a',
  sand4: '#bdb395',
  sand5: '#d6d0b0',
  mauve0: '#614257',
  mauve1: '#7a586a',
  mauve2: '#997482',
  mauve3: '#b39196',
  mauve4: '#c9adab',
  mauve5: '#decbbf',
  slate0: '#444a66',
  slate1: '#566178',
  slate2: '#6c8091',
  slate3: '#839ea6',
  slate4: '#99bab5',
  slate5: '#bed4c8',
  rose0: '#5e4452',
  rose1: '#80575b',
  rose2: '#9e7565',
  rose3: '#ba9273',
  rose4: '#d1ae8a',
  brown0: '#5c4644',
  brown1: '#785a55',
  brown2: '#9c756a',
  brown3: '#b89184',
  brown4: '#ccad9b',
  red0: '#8f3648',
  red1: '#b04a58',
  red2: '#cc6764',
  red3: '#e38674',
  red4: '#e8a68e',
  red5: '#ebcbbc',
  orange0: '#8a3c24',
  orange1: '#9e5333',
  orange2: '#bd6f42',
  orange3: '#d48d57',
  orange4: '#e0ac6c',
  orange5: '#e8cd97',
  gold0: '#855c22',
  gold1: '#9e7a36',
  gold2: '#ba9745',
  gold3: '#ccb45c',
  gold4: '#e3d176',
  gold5: '#e6dfa1',
  green0: '#2d5b16',
  green1: '#41761f',
  green2: '#569229',
  green3: '#6fae3a',
  green4: '#93c653',
  green5: '#c0dc82',
  teal0: '#255461',
  teal1: '#346c70',
  teal2: '#4d8a7e',
  teal3: '#68a88e',
  teal4: '#8ac290',
  teal5: '#b7d9a9',
  cyan0: '#255269',
  cyan1: '#336c7a',
  cyan2: '#438c91',
  cyan3: '#5ba9a4',
  cyan4: '#80c2ac',
  cyan5: '#abdbb8',
  blue0: '#364996',
  blue1: '#4761ad',
  blue2: '#5782ba',
  blue3: '#709fcf',
  blue4: '#8cbade',
  blue5: '#add6e0',
  violet0: '#46449c',
  violet1: '#5d59b3',
  violet2: '#7c75c9',
  violet3: '#a08fdb',
  violet4: '#c0aae3',
  violet5: '#d6caeb',
  purple0: '#683b8a',
  purple1: '#864ea6',
  purple2: '#a46abd',
  purple3: '#c385d6',
  purple4: '#d8a3e3',
  purple5: '#e8c5e6',
  pink0: '#85347a',
  pink1: '#a8487f',
  pink2: '#c4668c',
  pink3: '#db84a1',
  pink4: '#e6a3af',
  pink5: '#ebc7ca'
}
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
    jumpForce: 640,
    gravity: 2000,
    platformName: "platform"
  },
  controls: {
    moveLeft: ['left', 'a', 'KeyA'],       // Move left (KeyA = physical key for any layout)
    moveRight: ['right', 'd', 'KeyD'],     // Move right (KeyD = physical key for any layout)
    jump: ['up', 'w', 'space', 'KeyW'],    // Jump (KeyW = physical key for any layout)
    backToMenu: ['escape'],
    startGame: ['space', 'enter']
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
      outline: "#000000",
      // Common colors
      levelIndicator: {
        active: "#DC143C",             // Red for active/completed levels
        inactive: "#555555"            // Gray for inactive/future levels
      },
      // Splash/menu colors
      menu: {
        platformColor: "#1A1A1A"       // Platform color (for menu background)
      },
      //
      // Ready screen colors. The scene runs on a teal+orange
      // complementary palette so the on-boarding story already shows the
      // visual grammar the rest of the game speaks. Deep teal backs the
      // dark frame; the hero in the illustration is steel teal; warm
      // amber/orange focal points (title, glints, anti-hero in the
      // duality icon) provide the complementary punch.
      //
      ready: {
        background: "#1A2530",
        fireflies: "#F4C040",
        hint: "#809AA8",
        text: "#9AB5C4",
        title: "#E07020",
        emphasis: "#F4C040",
        ghostWords: "#3E708A"
      },
      // Hero colors (for procedural generation)
      hero: {
        body: "#FF8C00",               // Orange body color
        eyeWhite: "#FFFFFF",           // Eye white
        eyePupil: "#000000"            // Pupil
      },
      // Anti-hero colors
      antiHero: {
        body: "#8B5A50",               // Reddish-brown
        eyeWhite: "#FFFFFF",           // Eye white
        eyePupil: "#000000"            // Pupil
      },
      //
      // Section colors (body color for each game section)
      // word section color is also in its local config (src/sections/word/cfg.js)
      //
      //
      // Game-wide palette. Semantic aliases only — every value is a reference
      // into the single PALETTE constant at the top of this file (no literals).
      //
      palette: {
        swatches: Object.values(PALETTE),
        void: PALETTE.gray0,
        playfieldOuter: PALETTE.gray2,
        playfieldGray: PALETTE.gray4,
        midGray: PALETTE.gray3,
        lightGray: PALETTE.gray6,
        brightLight: PALETTE.gray7,
        heroBodyGray: PALETTE.gray6,
        heroOutline: PALETTE.gray0,
        letterFill: PALETTE.gray6,
        letterOutline: PALETTE.gray0,
        decorGray: PALETTE.gray3,
        dialogFill: PALETTE.gray1,
        dialogText: PALETTE.gray6,
        dialogBorder: PALETTE.gray3,
        grassGreen: PALETTE.green2,
        water: PALETTE.cyan2,
        waterDeep: PALETTE.teal0,
        //
        // Colour-world backdrop: the bright warm haze above the ground line
        // (warmHaze below) and a dark earth band under it (root zone).
        //
        groundDark: PALETTE.gray0,
        gold: PALETTE.gold3,
        mushrooms: [PALETTE.red1, PALETTE.orange2, PALETTE.purple1, PALETTE.blue2],
        //
        // Darkest tone of each mushroom cap family — used for cap outlines.
        //
        mushroomsDark: [PALETTE.red0, PALETTE.orange0, PALETTE.purple0, PALETTE.blue0],
        //
        // Lighter tone of each mushroom cap family — cap highlights.
        //
        mushroomsLight: [PALETTE.red3, PALETTE.orange4, PALETTE.purple3, PALETTE.blue3],
        //
        // Dark rim tone for gray ground decor (rocks, trampoline mushroom).
        //
        decorOutline: PALETTE.gray1,
        treeGray: {
          root: PALETTE.gray1,
          trunk: PALETTE.gray2,
          branch: PALETTE.gray3,
          leaf: PALETTE.gray4
        },
        //
        // Warm sand tones for the main tree after the L (light) letter — makes
        // it stand out against the pure-gray parallax forest.
        //
        treeLit: {
          root: PALETTE.sand0,
          trunk: PALETTE.sand1,
          branch: PALETTE.sand2,
          leaf: PALETTE.sand3
        },
        //
        // Colour-world main tree: dark brown wood with juicy green foliage —
        // matches the foreground trees of the reference forest picture.
        //
        treeColor: {
          root: PALETTE.brown0,
          trunk: PALETTE.brown1,
          branch: PALETTE.brown2,
          leaf: PALETTE.green3
        },
        //
        // Colour-world background forest: warm amber wood dissolving into a
        // golden haze (the backdrop tone the layers are blended toward).
        //
        treeAmber: {
          root: PALETTE.orange0,
          trunk: PALETTE.orange1,
          branch: PALETTE.orange2,
          leaf: PALETTE.green1
        },
        warmHaze: PALETTE.orange4,
        //
        // Cute chubby mushroom (glow trampoline + decor): cream body, warm
        // orange spotted cap; the gray set mirrors it inside the gray family.
        //
        cuteMushroom: {
          body: PALETTE.sand5,
          bodyShade: PALETTE.sand3,
          cap: PALETTE.orange3,
          capDark: PALETTE.orange0,
          capLight: PALETTE.orange5,
          spot: PALETTE.gray7,
          outline: PALETTE.brown0,
          face: PALETTE.brown0,
          blush: PALETTE.red3
        },
        cuteMushroomGray: {
          body: PALETTE.gray5,
          bodyShade: PALETTE.gray4,
          cap: PALETTE.gray3,
          capDark: PALETTE.gray1,
          capLight: PALETTE.gray6,
          spot: PALETTE.gray6,
          outline: PALETTE.gray1,
          face: PALETTE.gray0,
          blush: PALETTE.gray4
        },
        bark: {
          dark: PALETTE.mauve0,
          mid: PALETTE.sand2,
          light: PALETTE.orange2,
          highlight: PALETTE.orange5
        },
        //
        // Log platform wood — slightly lighter than the main tree with a
        // warmer orange-brown tint; ring/core tones for the cut end.
        //
        log: {
          bark: PALETTE.rose2,
          barkLight: PALETTE.rose3,
          barkDark: PALETTE.brown0,
          ring: PALETTE.rose3,
          ringDark: PALETTE.brown1,
          core: PALETTE.rose4
        }
      },
      sections: {
        glow: {
          body: PALETTE.gold3  // Gold from the game palette — perception through colour
        },
        word: {
          body: '#DC143C'      // Crimson red - matches anti-hero and WORDS indicator
        },
        touch: {
          body: '#5A8898'      // Steel teal — complementary to silver hero; matches in-game touch anti-hero
        },
        feel: {
          body: '#FF69B4'      // Hot pink - emotions, passion, feelings
        },
        mind: {
          body: '#D2B48C'      // Tan/Sepia - old, faded, nostalgic
        },
        time: {
          body: '#4169E1'      // Royal blue - eternal, flowing, deep
        }
      }
    },
    //
    // Z-indices (layers)
    //
    zIndex: {
      background: -100,
      flyingWords: -25,  // Between near_front (-1) and mid_depth (-50)
      platforms: 16,  // High z-index so platforms are always on top
      player: 10,
      playerShadow: 9,
      playerAbove: 11,
      assemblyParticles: 101,
      eyePupil: 1,
      ui: 100,
      blades: 14  // Just below platforms, above everything else including huge words
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
    // Background music volumes for different sections
    //
    backgroundMusic: {
      volume: MASTER_VOLUME * 0.143,  // Default fallback volume
      kids: MASTER_VOLUME * 0.143,
      time: MASTER_VOLUME * 0.143,
      clock: MASTER_VOLUME * 0.143,
      touch: MASTER_VOLUME * 0.4,
      word: MASTER_VOLUME * 0.3,
      breath: MASTER_VOLUME * 0.15, // breath.mp3 (parallel with word in word section)
      birds: MASTER_VOLUME * 0.22,  // birds.mp3 ambient for glow level
      //
      // Letter dialog voice-overs (glow-g / glow-l / glow-ow)
      //
      glowLetterDialog: MASTER_VOLUME * 0.85,
      //
      // Touch lesson 0 letter dialog voice-overs (louder than glow)
      //
      touchLetterDialog: Math.min(1, MASTER_VOLUME * 1.35),
      //
      // Volume multiplier applied to level BGM while a letter VO dialog is open
      //
      dialogMusicDuck: 0.18
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
      step: MASTER_VOLUME * 0.75,
      stepFade: MASTER_VOLUME * 0.075,
      stepDuration: 0.05,
      stepFreqStart: 180,
      stepFreqEnd: 60
      }
    }
}
