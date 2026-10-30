//
// Cave section configuration. The rock ledge art (cave-ledge.js) is free of
// the fixed 96-swatch palette by design: its colours are picked for
// material, light and depth to match the cave reference art.
//
// A: the wide ledge (the reference's upper-left platform), the base for
// every rock ledge style. Lengths in px; shares are of the ledge length
// unless noted.
//
const WIDE = {
  seed: 5150,
  thick: 120,             // Body thickness at the wall
  tipShare: 0.4,          // Thickness at the free end (share of thick)
  topWave: 1.5,           // Walkable top irregularity
  lobes: 5,               // Rock masses bulging from the underside
  lobeDepth: 42,
  lobeWidth: 0.12,
  overhang: 34,           // How far the top lip juts past the body
  //
  // Rubble stones, big to small: radius, its random share (smaller
  // down to r * (1 - range)), tries per (r x r) of body area.
  //
  stones: [
    { r: 36, range: 0.35, tries: 0.6 },
    { r: 22, range: 0.4, tries: 1.2 },
    { r: 12, range: 0.4, tries: 3 },
    { r: 6, range: 0.4, tries: 0.35 },
    { r: 3, range: 0.3, tries: 0.15 }
  ],
  topMoss: 10,            // Moss thickness on top (it swells and thins along it)
  frontShare: 0.4,        // Share of top grass and leaves drawn in front of the hero
  topGrass: 0.35,         // Chance of a grass tuft per top step
  topLeaves: 0.2,         // Chance of a leaf sprig per top step
  lipVines: 0.3,          // Chance of a short vine over the lip per step
  underVines: 0.35,       // Chance of a vine per underside step
  swayShare: 0.4,         // Share of underside vines that sway in the draught (not baked)
  ferns: 2,
  tufts: 7,
  mushrooms: 2,
  roots: 5,
  vines: 3
}
//
// Dark rubble of the back rows nearest the camera (also one of the mid
// row's ledge looks).
//
const BACK_NEAR = {
  void: '#070a0b',
  rock: ['#2c3332', '#262c2c', '#202627', '#1b2021', '#161b1c', '#121617'],
  rockLit: ['#4c5a52', '#414c47', '#363f3c', '#2d3533', '#252c2b'],
  gaps: ['#0a0e0f', '#0e1314', '#131819', '#181e1e', '#101a12', '#18261a'],
  stones: [
    { r: 40, range: 0.35, tries: 0.6 },
    { r: 24, range: 0.4, tries: 1.4 },
    { r: 12, range: 0.4, tries: 3 }
  ]
}
//
// Dark teal rubble of the mid row (also one of its ledge looks).
//
const BACK_MID = {
  void: '#0c1112',
  rock: ['#5a6864', '#4c5956', '#404b49', '#353e3d', '#2c3434', '#242b2c'],
  rockLit: ['#90a28e', '#7a8b7e', '#66756d', '#53605b', '#424d4b'],
  gaps: ['#121819', '#192022', '#20292a', '#29322f', '#1c2a1d', '#2a3f27'],
  stones: [
    { r: 30, range: 0.35, tries: 0.6 },
    { r: 18, range: 0.4, tries: 1.4 },
    { r: 10, range: 0.4, tries: 3 },
    { r: 5, range: 0.4, tries: 4 }
  ]
}
//
// Stone sizes for the mid row's ledge looks: big boulders and fine gravel.
//
const BOULDERS = [
  { r: 52, range: 0.3, tries: 0.6 },
  { r: 30, range: 0.4, tries: 1 },
  { r: 14, range: 0.4, tries: 2 },
  { r: 6, range: 0.4, tries: 3 }
]
const GRAVEL = [
  { r: 18, range: 0.35, tries: 0.8 },
  { r: 10, range: 0.4, tries: 2 },
  { r: 5, range: 0.4, tries: 4 },
  { r: 3, range: 0.3, tries: 6 }
]
export const CAVE_CFG = {
  ledge: {
    colors: {
      void: '#121012',          // Darkest crevices, outline
      rock: [
        '#b9b6aa',              // Top stones, light warm grey in the light
        '#a6a398',              // Upper stones, light grey
        '#908e85',              // Middle stones, grey
        '#7a7973',              // Lower stones, mid grey
        '#666763',              // Deep stones, dark grey
        '#53575a'               // Bottom stones, cool slate in shadow
      ],
      gaps: [
        '#1d1c1b',              // Deep gap, near black
        '#2c2a28',              // Dark earth
        '#3d3b38',              // Grey grit
        '#504e4a',              // Lighter grit
        '#24301f',              // Moss in shadow
        '#3e5a2c'               // Moss
      ],
      rockLit: [
        '#ebe6d2',              // Lit edges on top, warm off-white
        '#d6d1be',              // Upper lit edges
        '#bdb9aa',              // Middle lit edges
        '#a2a097',              // Lower lit edges
        '#878a88'               // Bottom lit edges, cool grey
      ],
      moss: [
        '#14231a',              // Moss shadow, deep green
        '#24402b',              // Dark teal-green body
        '#4a6630',              // Muted olive
        '#6f8c36',              // Natural mid green
        '#a9b84a',              // Yellow-green on exposed tops
        '#d6c870'               // Muted golden light on selected patches
      ],
      root: ['#21160f', '#3e2a1e', '#6e4c31'],
      vine: ['#0f1c16', '#1f3a2a', '#3c6236', '#6f9244', '#cfd49a'],
      mushroom: { stem: '#d8d3b4', cap: '#9fcbb4', gill: '#6c9a8a' },
      flower: ['#e8e2c4', '#d9c46a', '#b7cfe0']   // Small pale cave flowers: cream, gold, pale blue
    },
    wide: WIDE,
    //
    // The entry ledge (thinner, fewer plants), the target ledge on the
    // right wall, and the lit ground: the same look, other shapes.
    //
    entry: { ...WIDE, seed: 5160, thick: 96, lobes: 4, ferns: 1, mushrooms: 1 },
    target: { ...WIDE, seed: 5170, thick: 100, tipShare: 0.5, overhang: 26, lobes: 3 },
    ground: { ...WIDE, seed: 5180, mushrooms: 1, ferns: 2 },
    //
    // Ledges in the back parallax row: the same look (all baked: no live
    // vines, nothing in front of the hero), long slabs with ragged ends
    // (endJag / endBulge); the free ones are arched bridges (archRise: how
    // high the top arches, archMid: thickness left in the middle); each
    // ledge offsets the seed.
    //
    back: { ...WIDE, seed: 5300, vines: 0, swayShare: 0, frontShare: 0, roots: 2, mushrooms: 1, tipShare: 0.85, lobes: 2, lobeDepth: 16, lobeWidth: 0.2, overhang: 10, endJag: 14, endBulge: 18, archRise: 42, archMid: 0.4 }
  },
  //
  // Back parallax rows in the same rubble, but dark (the rows are further
  // pulled into the cave shade when baked): mid ledges and floating rocks,
  // near side masses darkest. Stone sizes per row (bigger far away).
  //
  parallax: {
    mid: BACK_MID,
    near: BACK_NEAR,
    //
    // Looks of the mid row's ledges (a ledge's bridge and paired ledge take
    // its look; neighbours always differ): stone tones, all darker than the
    // gameplay ledges (the row's shade darkens them further), stone sizes,
    // thickness (thickScale) and shape, and how green they are.
    //
    looks: [
      {
        name: 'slate',          // Cool blue-grey boulders, thick
        colors: {
          void: '#0d1114',
          rock: ['#7c858a', '#6c757a', '#5d666b', '#4f575c', '#42494e', '#363c41'],
          rockLit: ['#a6b0b2', '#929c9f', '#7f888b', '#6c7477', '#5a6164'],
          gaps: ['#121618', '#1a1f22', '#23292c', '#2d3437', '#1b2a20', '#2c4029']
        },
        thickScale: 1.2,
        style: { stones: BOULDERS, lobes: 3, lobeDepth: 26 }
      },
      {
        name: 'moss',           // Green-tinted gravel, overgrown
        colors: {
          void: '#0c120e',
          rock: ['#6b7766', '#5d6858', '#505a4c', '#434c40', '#373f35', '#2c332b'],
          rockLit: ['#98a68a', '#85937a', '#73806a', '#626d5b', '#525b4c'],
          gaps: ['#0f1510', '#161e17', '#1f281f', '#283228', '#1d3220', '#2f4d2a']
        },
        thickScale: 0.85,
        style: { stones: GRAVEL, topMoss: 18, topGrass: 0.6, topLeaves: 0.35, lipVines: 0.5, underVines: 0.6, ferns: 3, tufts: 10 }
      },
      {
        name: 'earth',          // Warm brown-grey, bare, rooty, deep lobes
        colors: {
          void: '#120e0b',
          rock: ['#7d7266', '#6d6358', '#5e554b', '#50483f', '#433c34', '#37312b'],
          rockLit: ['#a89c8a', '#958a79', '#827868', '#706758', '#5e5649'],
          gaps: ['#17120e', '#201a15', '#2a231c', '#342c24', '#22281a', '#33402a']
        },
        thickScale: 1,
        style: { topMoss: 5, topGrass: 0.15, topLeaves: 0.08, lipVines: 0.1, underVines: 0.15, roots: 8, ferns: 1, tufts: 3, lobes: 3, lobeDepth: 32 }
      },
      {
        name: 'near',           // Near-black boulders
        colors: BACK_NEAR,
        thickScale: 1.1,
        style: { stones: BOULDERS }
      },
      {
        name: 'teal',           // Dark teal gravel, thin and wavy
        colors: BACK_MID,
        thickScale: 0.8,
        style: { stones: GRAVEL, topWave: 3, lobes: 1 }
      }
    ],
    //
    // The far wall behind the ledges: the same rubble, stones of many
    // different darknesses (shade drifts in big patches, then varies per
    // stone), and greens growing on it.
    //
    far: {
      void: '#0a0f10',
      rock: ['#6a7874', '#5c6a66', '#4f5c59', '#434f4d', '#384342', '#2e3737', '#252d2e'],
      rockLit: ['#97a99e', '#83958b', '#718279', '#606f69', '#505d59'],
      gaps: ['#101617', '#151c1d', '#1b2324', '#222b2b', '#18261a', '#253a25'],
      stones: [
        { r: 44, range: 0.35, tries: 0.6 },
        { r: 26, range: 0.4, tries: 1.2 },
        { r: 14, range: 0.4, tries: 2.2 },
        { r: 7, range: 0.4, tries: 2.5 }
      ],
      greens: ['#0e1a13', '#24412d', '#3f6a44', '#76a058'],   // Shadow, dark, mid, light
      patchFreq: 0.012,
      patchShade: 0.3,
      stoneShade: 0.45,
      vines: 34,
      ferns: 26,
      sprigs: 60,
      mossStrands: 30
    },
    shadeDepth: 160
  },
  //
  // Walls, ceiling and the lake basin in the same rubble: stone sizes (a
  // bit sparser than the ledges, these areas are big) and how deep into the
  // rock the stones sink into full shadow.
  //
  //
  // Stones at the monster plant's foot (the bed humps and the scree heap)
  // in the walls' light-grey rubble: many sizes, from boulders to grit,
  // and how deep under a heap's top they sink into full shadow.
  //
  plantFoot: {
    stones: [
      { r: 44, range: 0.45, tries: 0.5 },
      { r: 26, range: 0.45, tries: 1 },
      { r: 14, range: 0.45, tries: 2.4 },
      { r: 7, range: 0.4, tries: 0.3 },
      { r: 3, range: 0.3, tries: 0.1 }
    ],
    shadeDepth: 120,
    shadeMin: 0.05
  },
  rubble: {
    seed: 5190,
    stones: [
      { r: 36, range: 0.35, tries: 0.5 },
      { r: 22, range: 0.4, tries: 1 },
      { r: 12, range: 0.4, tries: 2.4 },
      { r: 6, range: 0.4, tries: 0.3 }
    ],
    shadeDepth: 90,
    shadeMin: 0.15
  }
}
