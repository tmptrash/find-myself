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

export const CFG = {
  //
  // Global debug switches (data only — no game logic here).
  //
  debug: {
    showPerformanceHud: true
  },
  game: {
    moveSpeed: 230,     // Hero run speed (px/s)
    jumpForce: 640,
    gravity: 2000,
    platformName: "platform",
    noCeilingTag: "noJumpCeiling", // Ground-only platforms that never block a jump from below or beside
    //
    // After a death the hero comes back safe for respawnGraceSec seconds
    // (no creature hunts or grabs him), blinking for the first
    // respawnBlinkSec of them.
    //
    respawnGraceSec: 3,
    respawnBlinkSec: 2
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
    // Forest section world — wider than the viewport; the camera shows the
    // part of the fixed playfield round the hero (see forest-camera.js).
    //
    forest: {
      worldWidth: 3000,
      playfieldHeight: 1117         // Playfield height inside the world's walls: fills a 1728x1117 screen
    },
    //
    // Water shared by every level's lake (components/water.js); a level may
    // override any of it (its `tune`), its colours are its own.
    //
    water: {
      //
      // The surface's spring waves (utils/water-wave.js): px between points,
      // speed (px/s), damping (1/s), pull to rest (1/s²), max height (px),
      // how much sharper high crests are drawn, a splash of strength 1
      // (px/s), and the idle kicks keeping the still water barely alive
      // (px/s: the idle waves' size, every idleEvery..+idleRange s).
      //
      wave: {
        spacing: 8,
        speed: 160,
        damping: 0.7,
        tension: 1.2,
        amplitude: 14,
        crestSharp: 0.35,
        kick: 220,
        idleKick: 24,
        idleEvery: 0.2,
        idleRange: 0.4
      },
      //
      // The surface as a thin layer (water-surface.js): a faint main contour
      // (`contourAlpha`, `contourWidth` px) over a softly lit band
      // (`bandAlpha` fading out over `bandDepth` px).
      //
      surface: {
        contourAlpha: 0.38,
        contourWidth: 1,
        bandAlpha: 0.34,
        bandDepth: 8
      },
      //
      // The moving highlights on the surface (water-surface.js), in the
      // palette's `highlight` with its darker `highlightShade` under the main
      // ones: `brightness`, `shadeAlpha`; `density` how much of still water
      // carries one (0 … 1), `secondaryDensity` the same for the fainter ones
      // under the surface (at `secondaryBrightness`); `length` the mean px
      // one runs and `lengthVariation` how uneven (0 … 1); `thickness` px and
      // `thicknessVariation`; `drift` px/s they slide along; `calm` how
      // bright they are on still water, raised by a crest's sharpness
      // (`crestGain` per px), a slope (`slopeGain`) and the water's motion
      // (`motionGain`), which also wakes more of them (`exciteGain`).
      //
      highlight: {
        brightness: 0.9,
        shadeAlpha: 0.5,
        density: 0.42,
        secondaryDensity: 0.22,
        secondaryBrightness: 0.45,
        length: 56,
        lengthVariation: 0.55,
        thickness: 1.4,
        thicknessVariation: 0.9,
        drift: 7,
        calm: 0.3,
        crestGain: 0.35,
        slopeGain: 1.6,
        motionGain: 0.5,
        exciteGain: 0.35
      },
      //
      // The depth gradient in the palette's `depthLight` / `depthDark`:
      // `lightAlpha` at the top, gone `lightEnd` of the way down; dark from
      // `deepFrom` of the way down to `deepAlpha` at `deepTo` of it and on
      // to the bottom (`deepMid` of it half way); `intensity` scales both
      // (0: none).
      //
      gradient: {
        intensity: 1,
        lightAlpha: 0.2,
        lightEnd: 0.5,
        deepFrom: 0.1,
        deepTo: 1,
        deepAlpha: 0.85,
        deepMid: 0.3
      }
    },
    fonts: {
      regularFull: "'JetBrains Mono'",
      thinFull: "'JetBrains Mono Thin'"
    },
    colors: {
      outline: "#000000",
      // Splash/menu colors
      menu: {
        platformColor: "#1A1A1A",      // Platform color (for menu background)
        mysteryBg: "#161616",          // Near-black backdrop of a level not reached yet (lit enough for shadows)
        mysteryShadow: "#000000"       // Shadows of its drifting "?" glyphs
      },
      //
      // On-screen buttons on touch devices (run / jump, fullscreen, back), in
      // the levels' own inks: a see-through green-black face, cream icons
      // (a warm grey while pressed) with green-black contours, a green-black
      // rim on the Home Screen hint.
      //
      touchControls: {
        disc: PALETTE.gray0,
        rim: PALETTE.gray0,
        arrow: PALETTE.gray7,
        arrowShade: PALETTE.gray6,
        contour: PALETTE.gray0
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
        // Shared draw-moon body — warm cream (palette snap of L3 amber disc).
        //
        moon: PALETTE.orange5,
        hint: "#809AA8",
        text: "#9AB5C4"
      },
      debugGroundLine: "#FF0000",      // TEMPORARY: forest ground line debug draw
      // Hero eye colors (pupils painted into the idle frames, menu text white)
      hero: {
        eyeWhite: "#FFFFFF",           // Eye white
        eyePupil: "#000000",           // Pupil
        eyeLid: "#2D2925",             // Edge of a lid closing over an eye (the eye rings' ink)
        sheetEdge: "#4D4740",          // hero.png's outline, for the soft edge left where its paper background is keyed out
        //
        // Live running legs: contours sampled from the leg pieces of
        // hero.png. The near leg takes the run body's own colour and both
        // legs' joins its tone there (sampled from the bake; the fallbacks
        // only until it is); the far leg is the sheet's grey one, toned
        // down to the graded body.
        //
        legNear: {
          outline: "#5C564E",          // Contour
          joinFallback: "#C8BEB0",     // Body tone at the join before it is sampled
          bodyFallback: "#DDD4C6"      // Body colour (near leg) before it is sampled
        },
        legFar: {
          outline: "#474542",          // Contour
          shade: "#6C6B68",            // Fill sides
          mid: "#85837F",              // Between sides and core
          core: "#8C8883",             // Lit core
          streak: "#7E7C78"            // Fur streaks
        }
      },
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
        //
        // Debug FPS readout in the corner — dark grey, no shadow.
        //
        fpsHudText: PALETTE.gray2,
        //
        // The same readout on phones and tablets: black, readable over the
        // bright sky behind the corner buttons.
        //
        fpsHudTextTouch: "#000000",
        //
        // Forest sky — a bright day: light blue overhead, pale blue-mint in
        // the middle, sunlit pale yellow at the horizon; dawn gold lives in
        // forestSkyDawnGlow and the lower sky band only.
        //
        forestSkyZenith: PALETTE.blue4,
        forestSkyMid: PALETTE.blue5,
        forestSkyHorizon: PALETTE.gold5,
        //
        // Depth-grade pivots: far rows dissolve into bright daylight air, mid
        // rows into light sage, the near row keeps nearly its own tones.
        //
        forestHaze: {
          far: PALETTE.blue5,
          mid: PALETTE.slate4,
          near: PALETTE.slate3
        },
        //
        // FOREST light — warm gold as colour (not gray brightness). Use sparingly:
        // core in sky gaps / haze, mid on reveals & HUD, bright on letter peaks.
        // Reference #DFAF58 / #E8C66F / #F0D58A → gold3 / gold4 / gold5.
        //
        forestLightCore: PALETTE.gold3,
        forestLightMid: PALETTE.gold4,
        forestLightBright: PALETTE.gold5,
        //
        // Cold forest shadow (green-blue), not neutral gray — for foliage depth.
        //
        forestShadow: PALETTE.teal0,
        lightGray: PALETTE.gray6,
        brightLight: PALETTE.gray7,
        heroBodyGray: PALETTE.gray6,
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
        decorGray: PALETTE.gray5,
        hudScore: PALETTE.gray5,
        //
        // Predatory crawler — cool forest shadow (teal/green), pale eye,
        // dark red pupil. Shears stay bark-brown so they read as horn, not UI.
        //
        predatorBack: PALETTE.teal0,
        predatorSpike: PALETTE.teal2,       // Back thorns, a shade off the back
        predatorBelly: PALETTE.green0,
        predatorMoss: PALETTE.teal1,
        predatorContour: PALETTE.gray0,
        predatorLeg: PALETTE.teal0,
        predatorEye: PALETTE.sand5,
        predatorPupil: PALETTE.red0,
        predatorHorn: PALETTE.brown1,
        predatorTongue: PALETTE.red1,       // Forked lizard tongue
        predatorMouth: PALETTE.red0,        // Inside the open mouth
        mossStrand: [PALETTE.teal0, PALETTE.green0, PALETTE.green2, PALETTE.green4, PALETTE.gold5], // Hanging moss strand: shadow, stem, leaf, lit leaf, water drop
        dreamFirefly: PALETTE.gray7,       // White fireflies left where the hero's dream bubble bursts
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
          surfaceLine: PALETTE.cyan5,  // The surface's faint contour
          surfaceBand: PALETTE.cyan3,  // Softly lit band under the contour
          highlight: PALETTE.cyan5,    // Moving highlights on the surface
          highlightShade: PALETTE.teal0, // Darker water under the main highlights
          depthLight: PALETTE.cyan3,   // Depth gradient: lighter under the surface
          depthDark: PALETTE.cyan0,    // Depth gradient: darker toward the bed
          algae: PALETTE.green1,
          algaeLight: PALETTE.green3,
          algaeDark: PALETTE.green0
        },
        //
        // Water flower by the left big tree: a soft, see-through
        // light-turquoise drop (pale top, deeper belly, a white glint), and a
        // dark warm wet-soil tone for the soaked ground.
        //
        waterFlower: {
          dropLight: PALETTE.blue5,    // Pale top of the light-turquoise drop
          drop: PALETTE.cyan3,         // Its turquoise body
          dropDeep: PALETTE.cyan2,     // Deeper turquoise under its belly
          dropGlint: PALETTE.gray7,    // Small white glint
          droplet: PALETTE.blue5,      // Spray and splash drops
          puddle: PALETTE.blue3,       // Shallow puddle on the ground
          puddleGlint: PALETTE.blue5,  // Its top glint
          wetSoil: PALETTE.rose0,      // Darkened wet earth
          mossRim: PALETTE.green1,     // Dark edge of the moss spot at the stem's foot
          mossShade: PALETTE.gold2,    // Its shaded clumps
          moss: PALETTE.green5,        // Its body, like the stem's moss
          mossLight: PALETTE.gold4     // Its lit top clumps
        },
        //
        // Apple bug by the left big tree: its snake-like tongue (a darker
        // fork at the tip), the tint that
        // pushes its far legs back and the dark it turns as it runs into
        // its burrow.
        //
        appleBug: {
          tongue: PALETTE.pink1,
          tongueFork: PALETTE.pink0,
          farTint: PALETTE.gray4,      // Its far legs, well darker than the near ones
          deep: PALETTE.gray0
        },
        //
        // Propeller bud: a cream eye with a brown iris and a dark pupil, a
        // bark stick, root-paws the warm brown of the bomb trees' roots.
        //
        propellerBud: {
          pupil: PALETTE.gray7,        // Light pupils darting in its black eyes
          stick: PALETTE.brown1,       // Bark of the branch-like stalk to the propeller
          stickDark: PALETTE.rose0,    // Its rim and shaded fibres
          stickLight: PALETTE.brown3,  // Its lit fibres and knot
          root: PALETTE.brown1,
          rootDark: PALETTE.brown0,
          rootLight: PALETTE.rose1
        },
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
        // Dark loam: the second earth stratum, the topsoil flecks and the
        // grass root ticks — darker and warmer than plain groundDark.
        //
        groundLoam: PALETTE.brown0,
        gold: PALETTE.gold4,
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
        //
        // Canopy apples on the main tree — warm reds with a shaded underside
        // (same ball stack as forestEyeFlower berries).
        //
        forestTreeFruit: {
          body: PALETTE.red2,          // Lit apple face
          light: PALETTE.red3,         // Brighter variation on some fruit
          shade: PALETTE.red0,         // Full-disk underside shadow
          contour: PALETTE.gray0,      // Dark rim
          unripeShade: PALETTE.green0, // Young apple: its red shadows turned green
          unripe: PALETTE.green2,      // Young apple: its red body turned green
          unripeLight: PALETTE.green4  // Young apple: its lit red turned green
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
          mossDeep: PALETTE.teal0,     // Cool shadow under the moss
          mossShadow: PALETTE.green0,  // Moss shadow mass
          mossMid: PALETTE.green1,     // Moss base mass
          mossLight: PALETTE.green2,   // Sunlit clover clumps
          mossGlint: PALETTE.green3,   // Rare brightest moss tips
          grass: PALETTE.green1,       // Hill grass blades
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
          shaft: PALETTE.gold5         // Diagonal sunlight shafts
        },
        //
        // Grass tufts on the ground: three body tones, a lit edge and (rarely) a
        // dry golden tip; no contour.
        //
        forestGrass: {
          shade: PALETTE.green0,       // Dark blade body
          base: PALETTE.green1,        // Main blade body
          light: PALETTE.green2,       // Sunlit blade body
          lit: PALETTE.green3,         // Lit edge down the blade
          tip: PALETTE.green4,         // Pale blade tip
          dry: PALETTE.gold2           // Rare dry golden tip
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
          petal: PALETTE.red5        // Flower-like petals around the bud
        },
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
        // Menu level panel, in the selected level's own colour (laid over the
        // backdrop at part opacity): the forest's green with a dark
        // green-black contour and a soft lit top band, or the cave's soil
        // brown with a brown-black contour and a warm lit band.
        //
        menuPanelForest: { fill: PALETTE.green0, contour: PALETTE.gray0, light: PALETTE.green4 },
        menuPanelCave: { fill: PALETTE.brown0, contour: PALETTE.rose0, light: PALETTE.sand4 },
        //
        // Menu key hint: the key names in a warm gold, their meaning in the
        // cream text tone.
        //
        menuHintKey: PALETTE.gold3,
        //
        // Global confirm dialog (components/confirm-dialog.js): a forest
        // signboard hung on two vines — warm wood planks with grain, knots and
        // a lit top edge, cream painted text.
        // Buttons are small wooden tags; the selected one glows gold. The
        // close button is a twig cross. Leaves fly off when the board breaks.
        //
        confirmDialog: {
          wood: PALETTE.rose1,
          woodDark: PALETTE.rose0,
          woodLight: PALETTE.rose2,
          contour: PALETTE.gray0,
          tagContour: PALETTE.gray0,
          text: PALETTE.gray7,
          textShadow: PALETTE.gray0,
          tag: PALETTE.rose0,
          tagSelected: PALETTE.gold3,
          tagSelectedText: PALETTE.gray0,
          leaf: [PALETTE.green1, PALETTE.green2, PALETTE.green3, PALETTE.gold2],
          vine: PALETTE.green0,
          vineLight: PALETTE.green1,
          twig: PALETTE.brown1,
          twigHover: PALETTE.gold3,
          backdrop: PALETTE.gray0
        },
        //
        // Cave look of the confirm dialog: a fleshy pad leaf of the monster
        // plant (lit rim, darker underside and veins) hung on two of its
        // red-brown stems; the answers are small dark leaves, the chosen one
        // turns the red of the trap flowers; a cross of the plant's wood;
        // cave leaves fly off when it breaks.
        //
        confirmDialogCave: {
          wood: PALETTE.green1,
          woodDark: PALETTE.green0,
          woodLight: PALETTE.green3,
          contour: PALETTE.gray0,
          tagContour: PALETTE.rose0,        // Dark brown rim of the Yes / No plates
          text: PALETTE.gray7,
          textShadow: PALETTE.gray0,
          tag: PALETTE.teal0,
          tagSelected: PALETTE.red1,
          tagSelectedText: PALETTE.gray7,
          leaf: [PALETTE.green0, PALETTE.green1, PALETTE.green2, PALETTE.green3],
          vine: PALETTE.rose0,
          vineLight: PALETTE.rose1,
          twig: PALETTE.brown0,
          twigHover: PALETTE.red3,
          backdrop: PALETTE.gray0
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
          ring: PALETTE.sand2,
          core: PALETTE.sand3
        }
      }
    },
    //
    // Z-indices (layers)
    //
    zIndex: {
      background: -100,
      platforms: 16,  // High z-index so platforms are always on top
      player: 10,
      playerShadow: 9,
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
      fadeInTime: 0.5
    },
    //
    // Background music volumes for different sections
    //
    backgroundMusic: {
      birds: MASTER_VOLUME * 0.22,  // birds.mp3 ambient for forest level
      whisper: MASTER_VOLUME * 1  // whisper.mp3 by the island eye-flower (loudest right at it)
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
        volume: MASTER_VOLUME * 0.035,  // Faint breath of noise under the tap
        duration: 0.09,
        attack: 0.008,                  // Soft onset — no click at the start
        noiseHighpass: 700,
        lowpass: 900,                   // Rounds the tap off (no ring)
        blipFreqStart: 340,
        blipFreqEnd: 210,
        blipVolume: MASTER_VOLUME * 0.2
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
      predatorFootThump: 0.16
      }
    }
}
