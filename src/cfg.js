//
// Master audio volume - all other volumes are calculated from this
//
const MASTER_VOLUME = 0.7
//
// Game-wide 96-colour palette (single source of truth, row-major). Sampled
// from the forest level reference art: swatches present in the picture are
// taken from it directly, hue families it lacks (blue, violet, purple, pink)
// carry the same colour grade. Every colour used in game code MUST be one of
// these values (brightness via opacity is allowed). Rows are hue families,
// index 0 = darkest tone.
//
const PALETTE = {
  gray0: '#2d4141',
  gray1: '#444c4a',
  gray2: '#595b54',
  gray3: '#77756b',
  gray4: '#928d78',
  gray5: '#a7a685',
  gray6: '#c9c7c1',
  gray7: '#f4f1de',
  sand0: '#5c5141',
  sand1: '#786652',
  sand2: '#86836b',
  sand3: '#a49b7e',
  sand4: '#c4b493',
  sand5: '#cac597',
  mauve0: '#5d414c',
  mauve1: '#74555c',
  mauve2: '#906f70',
  mauve3: '#a88981',
  mauve4: '#bda393',
  mauve5: '#d1bea4',
  slate0: '#404556',
  slate1: '#515a65',
  slate2: '#5c7c81',
  slate3: '#7b928c',
  slate4: '#91ac9a',
  slate5: '#b3c4aa',
  rose0: '#513932',
  rose1: '#854f48',
  rose2: '#b4746a',
  rose3: '#a28157',
  rose4: '#e4b48e',
  brown0: '#5b4039',
  brown1: '#6c534c',
  brown2: '#b17168',
  brown3: '#b18c76',
  brown4: '#b2a687',
  red0: '#9c4d4a',
  red1: '#b55555',
  red2: '#bf5f5d',
  red3: '#cb694d',
  red4: '#e0a180',
  red5: '#debfa2',
  orange0: '#93442d',
  orange1: '#cc6548',
  orange2: '#bf7554',
  orange3: '#c6863e',
  orange4: '#cca269',
  orange5: '#c9c392',
  gold0: '#876341',
  gold1: '#a77b42',
  gold2: '#b1964b',
  gold3: '#d5b45c',
  gold4: '#f0d470',
  gold5: '#e5e3a7',
  green0: '#50682d',
  green1: '#657e33',
  green2: '#6f963d',
  green3: '#87b04c',
  green4: '#a6c55f',
  green5: '#cccb6d',
  teal0: '#1f4c57',
  teal1: '#276666',
  teal2: '#3f7866',
  teal3: '#869e7f',
  teal4: '#8db984',
  teal5: '#bdc487',
  cyan0: '#1c4c51',
  cyan1: '#3b6064',
  cyan2: '#26726e',
  cyan3: '#5a9c8c',
  cyan4: '#7eb495',
  cyan5: '#a6cda1',
  blue0: '#2d3f72',
  blue1: '#3b5484',
  blue2: '#4c7292',
  blue3: '#628da4',
  blue4: '#7da6b2',
  blue5: '#9fc2b9',
  violet0: '#393a75',
  violet1: '#4c4d87',
  violet2: '#68669a',
  violet3: '#897eaa',
  violet4: '#a898b4',
  violet5: '#c0b7be',
  purple0: '#59366a',
  purple1: '#72477f',
  purple2: '#8d5f92',
  purple3: '#a878a6',
  purple4: '#bd93b3',
  purple5: '#d0b4bb',
  pink0: '#763461',
  pink1: '#994869',
  pink2: '#b56376',
  pink3: '#ca7e87',
  pink4: '#d69a94',
  pink5: '#dab9aa'
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
    platformName: "platform",
    noCeilingTag: "noJumpCeiling" // Ground-only platforms that never block a jump from below or beside
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
    // Forest section world — wider than the viewport; the level scrolls a camera
    // through a fixed on-screen playfield window (see forest-camera.js).
    //
    forest: {
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
      // DOM loader: the Forest chain-buoy stalk-eye lying on its side (same inks
      // as forestEyeFlower — red stalk, white berry, gray contour and pupil).
      //
      loader: {
        message: PALETTE.gray7,
        contour: PALETTE.rose1,     // Warm burgundy-brown outline (stalk, spikes, eye)
        berry: PALETTE.gray7,       // Warm ivory sclera
        berryShade: PALETTE.sand4,  // Muted shade on the sclera's unlit side
        pupil: PALETTE.cyan0,       // Dark teal pupil
        stem: PALETTE.red2,         // Muted coral-red stalk body
        stemLight: PALETTE.pink4    // Dusty coral highlight on the stalk's upper edge
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
        // Shared draw-moon body — warm cream (palette snap of L3 amber disc).
        //
        moon: PALETTE.orange5,
        fireflies: "#F4C040",
        hint: "#809AA8",
        text: "#9AB5C4",
        title: "#E07020",
        emphasis: "#F4C040",
        ghostWords: "#3E708A",
        //
        // Page-load CRT power-on: cool phosphor line + halo, gray snow ramp.
        //
        tvPowerOn: {
          lineCore: PALETTE.gray7,
          lineHalo: PALETTE.blue5,
          snow: [PALETTE.gray0, PALETTE.gray1, PALETTE.gray2, PALETTE.gray3, PALETTE.gray4, PALETTE.gray5, PALETTE.gray6, PALETTE.gray7]
        }
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
        // FOREST palette balance (~70 / 20 / 10) — perception level: most of the
        // frame reads cool forest; earth is supporting; gold/orange are rare
        // accents so any warm spark draws the eye. Do not sprinkle gold across
        // parallax rows or ambient decor — reserve it for sky dawn, the lit
        // main tree, HUD/letters, and forestAttention beats.
        //
        // ~70% — dark / medium green & blue-green (void, sky, parallax, grass).
        // ~20% — warm earth (ground, wood, rocks, terracotta mushrooms).
        // ~10% — gold / orange (sparse; uneven placement is intentional).
        //
        // Forest void — near-black forest floor (green/teal, never pure black).
        //
        void: PALETTE.green0,
        //
        // Playfield frame — neutral darkest gray so no green rims the play zone.
        //
        playfieldOuter: PALETTE.gray0,
        midGray: PALETTE.green1,
        //
        // Zenith lift for parallax sky gradients and colour-world canopy air.
        //
        forestLift: PALETTE.teal1,
        //
        // Forest sky — dark green-teal foundation (#18332F / #23483B / #2B5944 →
        // palette greens/teals). Stays darker than canopy foliage; dawn gold
        // lives in forestSkyDawnGlow and the lower sky band only.
        //
        forestSkyZenith: PALETTE.teal1,
        forestSkyMid: PALETTE.teal3,
        forestSkyHorizon: PALETTE.gray5,
        //
        // Depth-grade pivots: far rows dissolve into warm sunlit air, mid rows
        // into cool sage, the near row keeps nearly its own tones.
        //
        forestHaze: {
          far: PALETTE.gray5,
          mid: PALETTE.teal3,
          near: PALETTE.slate2
        },
        //
        // FOREST light — warm gold as colour (not gray brightness). Use sparingly:
        // core in sky gaps / haze, mid on reveals & HUD, bright on letter peaks.
        // Reference #DFAF58 / #E8C66F / #F0D58A → gold3 / gold4 / gold5.
        //
        forestLightCore: PALETTE.gold3,
        forestLightMid: PALETTE.gold4,
        forestLightBright: PALETTE.gold5,
        forestSkyDawnGlow: PALETTE.gold3,
        //
        // Cold forest shadow (green-blue), not neutral gray — for foliage depth.
        //
        forestShadow: PALETTE.teal0,
        lightGray: PALETTE.gray6,
        brightLight: PALETTE.gray7,
        //
        // Whole gray ramp, dark to light — monochrome (gray-phase) bakes such
        // as the idle menu forest.
        //
        grayRamp: [PALETTE.gray0, PALETTE.gray1, PALETTE.gray2, PALETTE.gray3, PALETTE.gray4, PALETTE.gray5, PALETTE.gray6, PALETTE.gray7],
        heroBodyGray: PALETTE.gray6,
        heroOutline: PALETTE.gray0,
        letterFill: PALETTE.gray6,
        letterOutline: PALETTE.gray0,
        //
        // Lighter outline used across the Forest level's own hero/decor/rock
        // silhouettes in place of the harsher, near-black heroOutline/void —
        // menu.js still reads heroOutline/decorOutline directly so it keeps
        // its original darker rim.
        //
        //
        // Role-based contours (#172621 → gray0 forest ink) — not pure black and
        // not one width everywhere. void stays fill/backdrop only.
        //
        forestContour: {
          forest: PALETTE.gray0,
          eye: PALETTE.green0,
          platform: PALETTE.brown0,
          gameplay: PALETTE.gray0
        },
        //
        // Hologram portal (ground portal): blue analog projection.
        //
        holoDoor: {
          mouth: PALETTE.gray0,
          core: PALETTE.gray7,
          edge: PALETTE.blue5,
          glow: PALETTE.blue3,
          band: PALETTE.blue1,
          field: PALETTE.blue2,
          spark: PALETTE.blue4
        },
        //
        // Soft gray rim for low-priority decor (captions, muted props).
        //
        forestOutlineLight: PALETTE.gray2,
        decorGray: PALETTE.gray5,
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
        // Stalk-eye decor — warm luminous sclera in the cool forest (FOREST =
        // seeing). Refs #162A25 / #E8D8B0 / #17201D / #F5E8C9 → nearest
        // palette swatches; contour is green-black, not pure black.
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
        // Lake paint over the base water fill, all at low opacity so the
        // surface stays calm: a lighter skin under the surface, a darker
        // deep end, soft tree reflections and thin shore ripples. The water
        // is see-through, so the murk behind it, the sandy bed with pebbles
        // and the swaying algae are painted as their own layer underneath.
        //
        waterPaint: {
          light: PALETTE.cyan3,
          deep: PALETTE.cyan0,
          reflection: PALETTE.teal0,
          ripple: PALETTE.cyan5,
          murkTop: PALETTE.cyan1,
          murkDeep: PALETTE.teal0,
          bank: PALETTE.brown1,        // Earth fill under the shallow shore ends (topsoil tone)
          bed: PALETTE.rose3,          // Sand settled on the ledges and the floor
          bedRim: PALETTE.sand4,       // Lit top edge of the sand layer
          bedEdge: PALETTE.rose0,      // Dark cut where the bed meets the earth band
          bedGravel: PALETTE.slate0,   // Gravel specks in the sand
          pebble: PALETTE.slate1,
          pebbleLight: PALETTE.slate3,
          stone: PALETTE.sand1,        // Faceted boulders on the floor
          stoneLight: PALETTE.sand4,   // Boulder face lit from the upper left
          stoneDark: PALETTE.sand0,    // Boulder shadow facet
          stoneContour: PALETTE.gray0,
          snag: PALETTE.brown0,        // Sunken branch
          snagLight: PALETTE.mauve1,   // Lit top line of the branch
          surfaceLine: PALETTE.cyan5,  // Bright top line of the double surface
          surfaceBand: PALETTE.cyan3,  // Light band between the two surface lines
          algae: PALETTE.green1,
          algaeLight: PALETTE.green3,
          algaeDark: PALETTE.green0
        },
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
        groundSand: PALETTE.rose0,
        groundDeep: PALETTE.rose0,     // Deepest earth stratum + bottom depth fade (darkest warm brown)
        //
        // Wet mud patch under the mud-zone tall grass — a darker, warmer
        // earth tone than plain groundDark so the soft-mud band reads as a
        // distinct surface once the grass overlay lets it show through.
        //
        mudGround: PALETTE.brown0,
        gold: PALETTE.gold4,
        //
        // Terracotta decor + cute mushrooms — refs #B86B4A / #D48A57 / #6D4038
        // (nearest palette orange2 / orange3 / brown0).
        //
        forestMushroom: {
          cap: PALETTE.orange2,
          light: PALETTE.orange3,
          shadow: PALETTE.brown0
        },
        //
        // Floor / cave rocks — green-brown stone (not neutral decor gray).
        // Refs #4C5146 / #646657 / #77705A → gray1 / sand1 / sand2.
        //
        forestRock: {
          shadow: PALETTE.gray1,
          mid: PALETTE.sand1,
          light: PALETTE.sand2
        },
        //
        // Pit cave interior: muted reddish-brown stones with a warm lit cap,
        // dark soil shade, and the deepest warm brown for the recessed back.
        //
        forestCave: {
          stone: PALETTE.rose1,        // Stone body
          stoneShade: PALETTE.brown0,  // Shaded stones / dark soil clods
          stoneLight: PALETTE.brown1,  // Lit cap on the upper left of a stone
          recess: PALETTE.rose0,       // Darkest recessed back of the cave
          lip: PALETTE.brown1          // Faint daylight on soil under the mouth
        },
        //
        // Scatter caps — same family, slight hue steps (no cool rainbow caps).
        //
        mushrooms: [PALETTE.orange2, PALETTE.brown1, PALETTE.orange2, PALETTE.brown2],
        mushroomsDark: [PALETTE.brown0, PALETTE.brown0, PALETTE.brown0, PALETTE.brown0],
        mushroomsLight: [PALETTE.orange3, PALETTE.brown2, PALETTE.orange3, PALETTE.orange2],
        //
        // Visual grammar: life, hazard, oddity, "pay attention" — trampolines,
        // ear-tree leaves. Slightly richer cap than forestMushroom, not neon.
        //
        forestAttention: {
          //
          // Ear-tree (bomb tree) look: pale cream wood — the only light trunk
          // in the level, so with its dark contour it reads apart from the
          // teal forest, brown soil / roots and the rose apple bark — under
          // deep crimson leaves (red = danger).
          //
          leaf: PALETTE.red0,          // Ear-tree leaf body
          leafLight: PALETTE.red2,     // Lit half of the leaf
          leafVein: PALETTE.mauve0,    // Leaf rim and midrib
          stem: PALETTE.sand4,         // Ear-tree trunk and limbs
          stemLight: PALETTE.sand5,    // Bark plates catching the light on the left flank
          stemShade: PALETTE.sand2,    // Shaded right flank and limb undersides
          stemFissure: PALETTE.sand0,  // Bark fissures
          mushroomCap: PALETTE.red2,
          mushroomCapDark: PALETTE.brown0,
          mushroomCapLight: PALETTE.orange3,
          blush: PALETTE.red3
        },
        //
        // Canopy apples on the main tree — warm reds with a shaded underside
        // (same ball stack as forestEyeFlower berries).
        //
        forestTreeFruit: {
          body: PALETTE.red2,          // Lit apple face
          light: PALETTE.red3,         // Brighter variation on some fruit
          shade: PALETTE.red0,         // Full-disk underside shadow
          contour: PALETTE.gray0       // Dark rim
        },
        //
        // Eye-flower on the lake island: a red stalk of white eye-berries
        // (doll's eyes) and leafy tentacle vines on a mossy earth mound.
        //
        forestEyeFlower: {
          contour: PALETTE.gray0,      // Green-black contour around every part
          berry: PALETTE.gray7,        // Lit eye-berry (white)
          berryShade: PALETTE.mauve4,  // Shaded underside of the berry
          pupil: PALETTE.gray0,        // Berry pupil
          stem: PALETTE.red0,          // Red stalk and berry stems
          stemLight: PALETTE.red2,     // Lit edge of the stalk
          undergroundStem: PALETTE.brown0,     // Buried stalk — a step off the earth fill
          undergroundStemLight: PALETTE.brown1, // Buried stalk lit line, barely lighter
          undergroundStemContour: PALETTE.rose0, // Buried stalk outline melts into the earth
          vine: PALETTE.green0,        // Tentacle vines
          leaf: PALETTE.green1,        // Leaf body
          leafLight: PALETTE.green2,   // Lit half of the leaf
          soil: PALETTE.brown0,        // Island earth
          soilDark: PALETTE.sand0,     // Earth strata
          soilLight: PALETTE.brown1,   // Loose earth thrown up by the grab
          stone: PALETTE.gray2,        // Pebbles burst out of the hole
          stoneLight: PALETTE.sand2,   // Lit pebbles
          stoneDark: PALETTE.gray1,    // Shaded pebbles
          hole: PALETTE.gray0,         // Torn earth where the hero vanished
          splash: PALETTE.cyan4,       // Droplets where thrown earth hits the lake
          fade: PALETTE.gray0          // Level fade-out after the grab
        },
        //
        // Tunnel the flower's roots tear through the island when they drag
        // the hero under: an open soil cut, warm light at the lip, darkness below.
        //
        forestRootTunnel: {
          contour: PALETTE.gray0,      // Clod, stone and root contours
          wall: PALETTE.brown1,        // Torn soil wall, a step lighter than the earth around it
          wallStrata: [PALETTE.rose0, PALETTE.brown0, PALETTE.sand0, PALETTE.rose1], // Uneven earth layers in the cut
          wallLight: PALETTE.rose2,    // Forest light caught on the torn upper lip
          wallRim: PALETTE.orange2,    // Hot rim right under the opening
          cavity: PALETTE.rose0,       // Tunnel interior
          cavityGlow: PALETTE.rose1,   // Daylight spilling into the crack
          cavityDeep: PALETTE.gray0,   // Interior darkens with depth
          gouge: PALETTE.brown0,       // Fresh scrapes the roots left on the back wall
          stone: PALETTE.gray2,        // Stones embedded in the cut
          stoneWarm: PALETTE.sand1,    // Warm stones
          stoneLight: PALETTE.sand2,   // Lit stone faces
          stoneDark: PALETTE.gray1,    // Deep stones
          root: PALETTE.brown3,        // Thin roots in the soil cut
          rootDark: PALETTE.rose1,     // Torn root ends hanging into the cavity
          turf: PALETTE.green1,        // Torn turf on the lip
          turfLight: PALETTE.green2,   // Lit turf edge
          clod: PALETTE.brown1,        // Chipped clods on the lip
          puller: PALETTE.brown3,      // Living roots that drag the hero down
          pullerLight: PALETTE.brown4, // Lit ridge of the living roots
          crumb: PALETTE.brown1,       // Soil crumbs shaken loose
          deepEarth: PALETTE.rose0,    // Earth below the playfield, seen while the camera follows
          darkness: PALETTE.gray0      // Underground atmosphere closing in
        },
        //
        // Colour-world forest floor: mossy hill, ferns, light spike bushes,
        // small cream mushrooms and the ragged ground rim (reference concept art).
        //
        forestFloor: {
          contour: PALETTE.gray0,      // Green-black plant / hill contour
          fernDark: PALETTE.teal0,     // Back fronds (dark teal like the reference)
          fernMid: PALETTE.teal1,      // Front fronds
          fernLight: PALETTE.teal2,    // Lit leaflets
          plume: PALETTE.green5,       // Light spike face
          plumeLight: PALETTE.gold5,   // Lit chevrons on the spike
          plumeShade: PALETTE.gold3,   // Spike rim, midrib, shaded chevrons
          plumeStem: PALETTE.green3,   // Short spike stalks
          mushCap: PALETTE.mauve5,     // Cream cap
          mushCapLight: PALETTE.gray7, // Cap highlight
          mushGill: PALETTE.sand3,     // Shaded cap underside
          mushStem: PALETTE.sand5,     // Slender stem
          mushOutline: PALETTE.brown0, // Mushroom contour
          spotCap: PALETTE.red1,       // Rare red spotted cap on the hill
          spotCapLight: PALETTE.red3,  // Red cap highlight
          spotDot: PALETTE.gray7,      // Red cap spots
          mossDeep: PALETTE.teal0,     // Cool shadow under the moss
          mossShadow: PALETTE.green0,  // Moss shadow mass
          mossMid: PALETTE.green1,     // Moss base mass
          mossLight: PALETTE.green2,   // Sunlit clover clumps
          mossGlint: PALETTE.green3,   // Rare brightest moss tips
          grass: PALETTE.green1,       // Hill grass blades
          grassDry: PALETTE.gold3,     // Dry straw blades
          stone: PALETTE.sand1,        // Warm grey-brown boulders that make up the hill
          stoneLight: PALETTE.sand2,   // Boulder lit face (upper left)
          stoneDark: PALETTE.sand0,    // Boulder shadow face and gaps between stones
          slopeSoilTop: PALETTE.rose1,   // Eroded reddish-brown soil just under the moss
          slopeSoil: PALETTE.brown0,     // Main exposed soil of the slope
          slopeSoilDeep: PALETTE.rose0,  // Darkest soil at the slope foot
          slopeSoilLight: PALETTE.brown1, // Faint warm crumbs on the upper soil line
          rimSoil: PALETTE.brown0,     // Dark soil lip under the ground line
          rimEarth: PALETTE.brown1,    // Crumbly earth bumps on the lip
          rimMoss: PALETTE.green1,     // Moss patches along the ground line
          rimMossLight: PALETTE.green3, // Lit moss along the ground line
          rimDry: PALETTE.gold2,       // Dry litter patches along the ground line
          rimDryLight: PALETTE.gold4,  // Sunlit litter specks
          rimPebble: PALETTE.slate2,   // Pebbles poking out of the lip
          shaft: PALETTE.gold5         // Diagonal sunlight shafts
        },
        //
        // Dry-stone pile at the right end of the lake: distinct faceted warm
        // grey stones lit from the upper left, in two depth layers — far
        // stones darker and duller, near stones lighter.
        //
        forestShoreRock: {
          //
          // Deepest layer: a solid dark backing inside the pile silhouette
          // plus small dark stones, so no water shows between the stones.
          //
          back: {
            fill: PALETTE.gray1,       // Solid backing behind every stone
            contour: PALETTE.gray0,    // Stone outline
            crevice: PALETTE.gray0,    // Cracks
            shadow: PALETTE.gray0,     // Lower-right facets
            faces: [PALETTE.gray1, PALETTE.sand0, PALETTE.gray1], // Stone body tones
            light: PALETTE.gray2,      // Upper-left facets
            glint: PALETTE.sand1       // Thin lit edge along the top
          },
          far: {
            contour: PALETTE.gray0,    // Stone outline
            crevice: PALETTE.gray0,    // Cracks
            shadow: PALETTE.gray1,     // Lower-right facets
            faces: [PALETTE.gray2, PALETTE.sand1, PALETTE.gray2], // Stone body tones
            light: PALETTE.gray3,      // Upper-left facets
            glint: PALETTE.sand2       // Thin lit edge along the top
          },
          near: {
            contour: PALETTE.gray0,    // Stone outline
            crevice: PALETTE.gray1,    // Cracks
            shadow: PALETTE.gray2,     // Lower-right facets
            faces: [PALETTE.gray3, PALETTE.sand2, PALETTE.gray3, PALETTE.gray4], // Stone body tones (warm grey mix)
            light: PALETTE.gray4,      // Upper-left facets
            glint: PALETTE.gray5,      // Thin lit edge along the top
            moss: PALETTE.green1,      // Rare moss specks on dry stones
            mossLight: PALETTE.green2  // Lit moss speck edge
          }
        },
        //
        // Extra colour-world underground props (cobble beds, voids, pebbles, grit).
        //
        forestUnderground: {
          stone: PALETTE.gray1,        // Deep-clay stone body (dark stone gray)
          stoneLight: PALETTE.gray2,   // Stone lit cap and face speckles
          contour: PALETTE.gray0,      // Cobble contour and dark voids
          grit: PALETTE.brown2,        // Tiny soil specks and void lips
          pebble: PALETTE.rose2        // Warm pebbles in the topsoil
        },
        //
        // Spiky tomato grenade on the lip-trees — danger red, green spikes.
        //
        //
        // Bomb bud on the ear-trees: orange body with gold spikes and cream
        // petals, so it pops against the crimson leaves it hangs in.
        //
        forestTomato: {
          body: PALETTE.orange1,
          light: PALETTE.red4,
          dark: PALETTE.orange0,
          outline: PALETTE.brown0,
          spike: PALETTE.gold1,
          stem: PALETTE.sand0,
          petal: PALETTE.red5,        // Flower-like petals around the bud
          petalLight: PALETTE.gray7,  // Petal midrib highlight
          stamen: PALETTE.gold4       // Pollen dot on the bud
        },
        //
        // Dark rim tone for gray ground decor (rocks, trampoline mushroom).
        //
        decorOutline: PALETTE.gray1,
        //
        // Neutral gray wood steps — wood-landing dust tone.
        //
        treeGray: {
          root: PALETTE.gray0,
          trunk: PALETTE.gray1,
          branch: PALETTE.gray2,
          leaf: PALETTE.gray3
        },
        //
        // Colour-world main tree: dark brown wood with juicy green foliage —
        // matches the foreground trees of the reference forest picture.
        //
        //
        // Grooves / highlights for the two gameplay brown trees (main + shore).
        //
        forestTreeBark: {
          groove: PALETTE.rose0,
          highlight: PALETTE.orange4,
          //
          // Gameplay-tree volume: the sun from the left lights a wide flank
          // band; the right flank is a light rose wash so the shade stays a
          // warm mid brown instead of a dark one.
          //
          lit: PALETTE.orange2,
          rim: PALETTE.rose2,
          shade: PALETTE.rose1,
          deep: PALETTE.rose1,
          //
          // Root relief (reference lake tree): the same dark earth tone as
          // the bomb-tree roots, so they stay part of the soil, with a soft
          // contour and a lit upper edge in the topsoil tone.
          //
          root: PALETTE.rose0,
          rootLit: PALETTE.brown1,
          rootContour: PALETTE.rose0
        },
        //
        // Warm rust-brown wood like the reference lake tree.
        //
        treeColor: {
          root: PALETTE.rose0,
          trunk: PALETTE.orange0,
          branch: PALETTE.orange0,
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
        // White leaves the hero bursts into on a touch death (mostly white,
        // a few in the shade tone so the burst keeps some depth).
        //
        heroDeathLeaves: [PALETTE.gray7, PALETTE.gray7, PALETTE.gray6],
        //
        // Red prohibition sign over the locked levels of the menu.
        //
        menuProhibited: PALETTE.red1,
        //
        // Cool air target when parallax trees soften into the sky (not gold).
        //
        warmHaze: PALETTE.teal2,
        //
        // Eye-intro umbrella stroller — grays only, each part on its own value
        // step so the tube frame, fabric, strap and wheels stay readable.
        //
        forestStroller: {
          outline: PALETTE.gray0,      // Ink contour around every part
          tube: PALETTE.gray6,         // Near-side aluminium tube
          tubeShade: PALETTE.gray4,    // Near tube underside
          tubeGlint: PALETTE.gray7,    // Thin metal highlight
          farTube: PALETTE.gray4,      // Far-side tube (in shadow)
          farTubeShade: PALETTE.gray2, // Far tube underside
          fabric: PALETTE.gray3,       // Back sling
          fabricLight: PALETTE.gray4,  // Seat pan facing up
          fabricShade: PALETTE.gray2,  // Hem and folds
          strap: PALETTE.gray6,        // Lap and crotch strap
          buckle: PALETTE.gray4,       // Strap buckle
          grip: PALETTE.gray3,         // Foam handle grips
          gripRib: PALETTE.gray1,      // Grip ribbing
          plate: PALETTE.gray3,        // Footrest plate
          plateLight: PALETTE.gray5,   // Footrest top edge
          tire: PALETTE.gray1,         // Near wheel tyres
          rim: PALETTE.gray4,          // Near wheel discs
          hub: PALETTE.gray6,          // Wheel hubs and rivets
          farTire: PALETTE.gray0,      // Far wheel tyres
          farRim: PALETTE.gray3        // Far wheel discs
        },
        //
        // Parallax forest quadrants — all cool turquoise / blue so the
        // green gameplay trees read in front of them. X picks left/right;
        // canopy row picks top/bottom.
        //
        parallaxTreeCornerTL: {
          root: PALETTE.teal0,
          trunk: PALETTE.cyan1,
          branch: PALETTE.cyan1,
          leaf: PALETTE.teal1,
          leafShades: [PALETTE.cyan0, PALETTE.teal1, PALETTE.cyan2]
        },
        parallaxTreeCornerTR: {
          root: PALETTE.teal0,
          trunk: PALETTE.cyan1,
          branch: PALETTE.cyan1,
          leaf: PALETTE.cyan2,
          leafShades: [PALETTE.teal0, PALETTE.cyan2, PALETTE.cyan3]
        },
        parallaxTreeCornerBL: {
          root: PALETTE.teal0,
          trunk: PALETTE.gray1,
          branch: PALETTE.gray1,
          leaf: PALETTE.teal2,
          leafShades: [PALETTE.teal0, PALETTE.teal2, PALETTE.cyan3]
        },
        parallaxTreeCornerBR: {
          root: PALETTE.teal0,
          trunk: PALETTE.gray1,
          branch: PALETTE.gray1,
          leaf: PALETTE.teal1,
          leafShades: [PALETTE.cyan0, PALETTE.teal1, PALETTE.cyan2]
        },
        //
        // Crowns of the two gameplay trees (main + shore): sunlit green, so
        // the playable trees stand out in front of the all-blue parallax.
        //
        gameplayTreeFoliage: {
          root: PALETTE.green0,
          trunk: PALETTE.gray1,
          branch: PALETTE.gray1,
          leaf: PALETTE.green3,
          leafShades: [PALETTE.green1, PALETTE.green2, PALETTE.green4],
          //
          // Star leaves (reference apple tree): every leaf unit is a small
          // flat star of round leaflets around one joint.
          //
          sprigLeaves: true
        },
        //
        // Branch trampoline — standard forestMushroom terracotta (unusual beat,
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
        // Right ground + pit cave trampolines — forestAttention (richer, not brighter).
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
        //
        // Menu ring forest icon: same mushroom, but it sits on the dark menu
        // backdrop with no forest light around it, so the cap and stem run
        // brighter and more saturated than in the level.
        //
        cuteMushroomMenu: {
          body: PALETTE.gray7,
          bodyShade: PALETTE.sand4,
          cap: PALETTE.orange1,
          capDark: PALETTE.orange0,
          capLight: PALETTE.rose4,
          spot: PALETTE.gray7,
          outline: PALETTE.gray0,
          face: PALETTE.brown0,
          blush: PALETTE.pink3
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
        forest: {
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
      birds: MASTER_VOLUME * 0.22,  // birds.mp3 ambient for forest level
      whisper: MASTER_VOLUME * 0.38,  // whisper.mp3 near forest lip-trees
      forestLetterDialog: MASTER_VOLUME * 0.85,
      //
      // Touch lesson 0 letter dialog voice-overs (louder than forest)
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
      //
      // Menu level switch: a dry tick — a very short high-passed noise
      // snap over a quick falling blip.
      //
      menuClick: {
        volume: MASTER_VOLUME * 0.5,
        duration: 0.035,
        noiseHighpass: 2400,
        blipFreqStart: 1900,
        blipFreqEnd: 900,
        blipVolume: MASTER_VOLUME * 0.25
      },
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
      stepFreqEnd: 60,
      //
      // Centipede leg taps (fractions of `step`): noise patter and low thump.
      //
      predatorFootNoise: 0.44,
      predatorFootThump: 0.16,
      //
      // Ready CRT power-on — TV hiss fading to silence (duration set in ready.js).
      //
      readyTvHiss: MASTER_VOLUME * 0.19,
      readyTvClick: MASTER_VOLUME * 0.32,
      readyTvDegauss: MASTER_VOLUME * 0.22,
      readyTvWhine: MASTER_VOLUME * 0.008
      }
    }
}
