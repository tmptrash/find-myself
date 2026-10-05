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
  //
  // Global debug switches (data only — no game logic here).
  //
  debug: {
    showPerformanceHud: true
  },
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
    //
    // Glow section world — wider than the viewport; the level scrolls a camera
    // through a fixed on-screen playfield window (see glow-camera.js).
    //
    glow: {
      worldWidth: 3000,
      worldHeight: 1080
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
      // amber/orange focal points (filled title heroes, glints, anti-hero in
      // the duality icon) provide the complementary punch. Hollow title letters
      // use ready.moon so the wordmark reads with the menu L3 moon disc.
      //
      ready: {
        background: "#1A2530",
        //
        // Menu ring anti-heroes for locked / uncompleted sections — rim
        // close to the scene background so hollow silhouettes stay subtle.
        //
        uncompletedSectionOutline: PALETTE.gray0,
        //
        // Shared draw-moon body — warm cream (Otterisk snap of L3 amber disc).
        //
        moon: PALETTE.orange5,
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
        //
        // GLOW palette balance (~70 / 20 / 10) — perception level: most of the
        // frame reads cool forest; earth is supporting; gold/orange are rare
        // accents so any warm spark draws the eye. Do not sprinkle gold across
        // parallax rows or ambient decor — reserve it for sky dawn, the lit
        // main tree, HUD/letters, and glowAttention beats.
        //
        // ~70% — dark / medium green & blue-green (void, sky, parallax, grass).
        // ~20% — warm earth (ground, wood, rocks, terracotta mushrooms).
        // ~10% — gold / orange (sparse; uneven placement is intentional).
        //
        // Glow void — near-black forest floor (green/teal, never pure black).
        //
        void: PALETTE.green0,
        //
        // Pre-colour glow backdrop — neutral dark gray (ready exit tone), not
        // the green void used once the forest colour world is active.
        //
        glowPreludeBackdrop: PALETTE.gray0,
        //
        // Playfield frame + inner sky base: deep blue-green forest (reference
        // #18352B / #214735 / #2B5740 mapped to Otterisk greens/teals). Warm
        // haze and lit decor still pop against this dark foundation.
        //
        playfieldOuter: PALETTE.teal0,
        playfieldGray: PALETTE.green1,
        midGray: PALETTE.green1,
        //
        // Zenith lift for parallax sky gradients and colour-world canopy air.
        //
        glowForestLift: PALETTE.teal1,
        //
        // Glow sky — dark green-teal foundation (#18332F / #23483B / #2B5944 →
        // Otterisk greens/teals). Stays darker than canopy foliage; dawn gold
        // lives in glowSkyDawnGlow and the lower sky band only.
        //
        glowSkyZenith: PALETTE.green0,
        glowSkyMid: PALETTE.teal0,
        glowSkyHorizon: PALETTE.teal1,
        //
        // GLOW light — warm gold as colour (not gray brightness). Use sparingly:
        // core in sky gaps / haze, mid on reveals & HUD, bright on letter peaks.
        // Reference #DFAF58 / #E8C66F / #F0D58A → gold3 / gold4 / gold5.
        //
        glowLightCore: PALETTE.gold3,
        glowLightMid: PALETTE.gold4,
        glowLightBright: PALETTE.gold5,
        glowSkyDawnGlow: PALETTE.gold3,
        //
        // Cold forest shadow (green-blue), not neutral gray — for foliage depth.
        //
        glowShadow: PALETTE.teal0,
        lightGray: PALETTE.gray6,
        brightLight: PALETTE.gray7,
        heroBodyGray: PALETTE.gray6,
        heroOutline: PALETTE.gray0,
        letterFill: PALETTE.gray6,
        letterOutline: PALETTE.gray0,
        //
        // Lighter outline used across the Glow level's own hero/decor/rock
        // silhouettes in place of the harsher, near-black heroOutline/void —
        // menu.js still reads heroOutline/decorOutline directly so it keeps
        // its original darker rim.
        //
        //
        // Role-based contours (#172621 → gray0 forest ink) — not pure black and
        // not one width everywhere. void stays fill/backdrop only.
        //
        glowContour: {
          forest: PALETTE.gray0,
          eye: PALETTE.green0,
          platform: PALETTE.brown0,
          gameplay: PALETTE.gray0
        },
        //
        // Soft gray rim for low-priority decor (captions, muted props).
        //
        glowOutlineLight: PALETTE.gray2,
        decorGray: PALETTE.gray3,
        dialogFill: PALETTE.gray1,
        dialogText: PALETTE.gray6,
        dialogBorder: PALETTE.gray3,
        hudScore: PALETTE.gray5,
        //
        // Warm cream — soft highlight/shadow tone reused wherever a warm
        // near-white reads better than a cold gray (e.g. death-prompt shadow
        // in the colour world).
        //
        warmCream: PALETTE.sand5,
        //
        // Predatory crawler — cool forest shadow (teal/green), pale eye,
        // dark red pupil. Shears stay bark-brown so they read as horn, not UI.
        //
        predatorBack: PALETTE.teal0,
        predatorBelly: PALETTE.green0,
        predatorMoss: PALETTE.teal1,
        predatorContour: PALETTE.gray0,
        predatorLeg: PALETTE.teal0,
        predatorEye: PALETTE.sand5,
        predatorPupil: PALETTE.red0,
        predatorHorn: PALETTE.brown1,
        //
        // Swamp spirit — muted bog green, cool mist, warm eye. Contour is
        // green-brown ink, never void black or pure white.
        //
        swampSpirit: {
          contour: PALETTE.green0,
          shadow: PALETTE.brown0,
          body: PALETTE.teal1,
          belly: PALETTE.green0,
          mist: PALETTE.teal3,
          damp: PALETTE.green1,
          eye: PALETTE.gold5,
          pupil: PALETTE.green0,
          speck: PALETTE.gold3
        },
        //
        // Stalk-eye decor — warm luminous sclera in the cool forest (GLOW =
        // seeing). Refs #162A25 / #E8D8B0 / #17201D / #F5E8C9 → nearest
        // Otterisk swatches; contour is green-black, not pure black.
        //
        eyeCreature: {
          body: PALETTE.gray0,
          sclera: PALETTE.gold5,
          pupil: PALETTE.green0,
          highlight: PALETTE.red5,
          contour: PALETTE.green0
        },
        //
        // Foreground grass blades — warm straw gold, a different hue family
        // from the near bush layer's leaf green (treeColor.leaf), so the
        // blades never blend into the bushes standing right behind them and
        // read as dry autumn grass under the amber canopy.
        //
        grassGreen: PALETTE.teal4,
        water: PALETTE.cyan2,
        //
        // Branch teleport spiral — cool cyan/teal reads on the warm forest haze
        // while gray ellipses stay for the monochrome reveal.
        //
        branchPortal: {
          spiralBright: PALETTE.cyan3,
          spiralMid: PALETTE.teal4,
          haze: PALETTE.gold5,
          depth: PALETTE.teal3
        },
        //
        // L pickup caption body — warm pale sand on the post-L teal forest so
        // the phrase stays readable once the ground and parallax colour in.
        //
        captionLetterLInk: PALETTE.sand5,
        //
        // G pickup caption body — slightly lighter than decorGray so the phrase
        // reads on the flat prelude without competing with the white G glyph.
        //
        captionLetterGInk: PALETTE.gray5,
        //
        // O pickup caption on the colour forest — was the exact same pale
        // sand5 as the highlighted "O" glyph fill (warmCream below), so the
        // body text and the letter barely read as distinct and the whole
        // caption looked washed out. Now a darker, richer soil tone (same
        // family as the chernozem ground layer) for real contrast against
        // both the pale letter and the forest backdrop.
        //
        captionObservationInk: PALETTE.sand0,
        //
        // Colour-world earth band under the ground line stays in the green/teal
        // void family; warmHaze is cool parallax air (gold dawn is sky-only).
        //
        groundDark: PALETTE.teal0,
        //
        // Layered soil for the underground root-zone earth band (colour
        // world only — the gray-world variant stays tonal gray, no hue):
        // Topsoil (upper half of earth band) and deep sand (lower half).
        //
        groundChernozem: PALETTE.brown1,
        groundClay: PALETTE.brown2,
        groundSand: PALETTE.brown0,
        //
        // Wet mud patch under the mud-zone tall grass — a darker, warmer
        // earth tone than plain groundDark so the soft-mud band reads as a
        // distinct surface once the grass overlay lets it show through.
        //
        mudGround: PALETTE.brown0,
        gold: PALETTE.gold4,
        //
        // Terracotta decor + cute mushrooms — refs #B86B4A / #D48A57 / #6D4038
        // (nearest Otterisk orange2 / orange3 / brown0).
        //
        glowMushroom: {
          cap: PALETTE.orange2,
          light: PALETTE.orange3,
          shadow: PALETTE.brown0
        },
        //
        // Floor / cave rocks — green-brown stone (not neutral decor gray).
        // Refs #4C5146 / #646657 / #77705A → gray1 / sand1 / sand2.
        //
        glowRock: {
          shadow: PALETTE.gray1,
          mid: PALETTE.sand1,
          light: PALETTE.sand2
        },
        //
        // Scatter caps — same family, slight hue steps (no cool rainbow caps).
        //
        mushrooms: [PALETTE.orange2, PALETTE.brown1, PALETTE.orange2, PALETTE.brown2],
        mushroomsDark: [PALETTE.brown0, PALETTE.brown0, PALETTE.brown0, PALETTE.brown0],
        mushroomsLight: [PALETTE.orange3, PALETTE.brown2, PALETTE.orange3, PALETTE.orange2],
        //
        // Visual grammar: life, hazard, oddity, "pay attention" — trampolines,
        // ear-tree mouths. Slightly richer cap than glowMushroom, not neon.
        //
        glowAttention: {
          lip: PALETTE.red2,
          mushroomCap: PALETTE.red2,
          mushroomCapDark: PALETTE.brown0,
          mushroomCapLight: PALETTE.orange3,
          blush: PALETTE.red3
        },
        //
        // Dark rim tone for gray ground decor (rocks, trampoline mushroom).
        //
        decorOutline: PALETTE.gray1,
        //
        // Pre-colour forest silhouettes — green value steps (not gray-green).
        //
        treeGray: {
          root: PALETTE.green0,
          trunk: PALETTE.green0,
          branch: PALETTE.green1,
          leaf: PALETTE.green2
        },
        //
        // Main tree after L — warm brown wood + gold leaf lift (not sand-gray).
        //
        treeLit: {
          root: PALETTE.brown0,
          trunk: PALETTE.brown1,
          branch: PALETTE.brown2,
          leaf: PALETTE.gold3
        },
        //
        // Colour-world main tree: dark brown wood with juicy green foliage —
        // matches the foreground trees of the reference forest picture.
        //
        treeColor: {
          root: PALETTE.brown0,
          trunk: PALETTE.brown1,
          branch: PALETTE.brown2,
          //
          // Pulled back from the brighter green3-5 swatches (read as acid/neon
          // against the warm bark and haze) toward the darker greens plus a
          // couple of muted sage teals for shading variety, without them.
          //
          leaf: PALETTE.green1,
          //
          // Foliage mass tones only: shadow / base / light (index 0..2).
          //
          leafShades: [PALETTE.green0, PALETTE.green1, PALETTE.green2]
        },
        //
        // Cool air target when parallax trees soften into the sky (not gold).
        //
        warmHaze: PALETTE.teal2,
        //
        // Legacy aliases — sky bake uses glowSky* (see renderSkyBand).
        //
        parallaxSkyTopGray: PALETTE.green0,
        parallaxSkyTopColor: PALETTE.teal0,
        //
        // Parallax forest depths — gray steps in flat mode; in colour mode the
        // far/mid rows stay muted sage/teal silhouettes (not orange) so only
        // the sky haze and main lit tree carry warm pop (§16 art direction).
        //
        parallaxGrayNear: PALETTE.green2,
        parallaxGrayMid: PALETTE.green1,
        parallaxGrayFar: PALETTE.teal0,
        //
        // Parallax forest quadrants — cool/warm greens only (no red-pink rows).
        // X picks left/right; canopy row picks top/bottom.
        //
        parallaxTreeCornerTL: {
          root: PALETTE.teal0,
          trunk: PALETTE.teal0,
          branch: PALETTE.teal1,
          leaf: PALETTE.teal2,
          leafShades: [PALETTE.teal0, PALETTE.teal1, PALETTE.teal2]
        },
        parallaxTreeCornerTR: {
          root: PALETTE.green0,
          trunk: PALETTE.green0,
          branch: PALETTE.green1,
          leaf: PALETTE.green2,
          leafShades: [PALETTE.green0, PALETTE.green2, PALETTE.teal3]
        },
        parallaxTreeCornerBL: {
          root: PALETTE.green0,
          trunk: PALETTE.green0,
          branch: PALETTE.teal1,
          leaf: PALETTE.teal3,
          leafShades: [PALETTE.green0, PALETTE.teal2, PALETTE.teal4]
        },
        parallaxTreeCornerBR: {
          root: PALETTE.green0,
          trunk: PALETTE.green0,
          branch: PALETTE.green1,
          leaf: PALETTE.green2,
          leafShades: [PALETTE.green0, PALETTE.green1, PALETTE.green2]
        },
        //
        // Branch trampoline — standard glowMushroom terracotta (unusual beat,
        // same saturation as decor). Gray set mirrors inside the gray family.
        //
        cuteMushroom: {
          body: PALETTE.sand5,
          bodyShade: PALETTE.sand3,
          cap: PALETTE.orange2,
          capDark: PALETTE.brown0,
          capLight: PALETTE.orange3,
          spot: PALETTE.sand5,
          outline: PALETTE.gray0,
          face: PALETTE.brown0,
          blush: PALETTE.orange4
        },
        //
        // Right ground + pit cave trampolines — glowAttention (richer, not brighter).
        //
        cuteMushroomRed: {
          body: PALETTE.sand5,
          bodyShade: PALETTE.sand3,
          cap: PALETTE.red2,
          capDark: PALETTE.brown0,
          capLight: PALETTE.orange3,
          spot: PALETTE.sand5,
          outline: PALETTE.gray0,
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
          dark: PALETTE.teal0,
          mid: PALETTE.brown2,
          light: PALETTE.brown3,
          highlight: PALETTE.orange4
        },
        //
        // Log platform wood — brown family (no gray-mauve cast).
        //
        log: {
          bark: PALETTE.brown2,
          barkLight: PALETTE.brown3,
          barkDark: PALETTE.brown0,
          ring: PALETTE.sand2,
          ringDark: PALETTE.brown1,
          core: PALETTE.sand3
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
      whisper: MASTER_VOLUME * 0.38,  // whisper.mp3 near glow lip-trees
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
