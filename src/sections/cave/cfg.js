//
// Cave section configuration (lesson-cave.0, reference: the cave painting
// with the eye-flower, the glowing crevice and the stalk-eye). The cave art
// is free of the fixed 96-swatch palette by design: its colours are picked
// to sit with the painted props of assets/cave0/plants.png and stones.png —
// dark teal void and waterfalls behind, blue-grey rock islands with moss
// rims and brown roots, gold light where the exit is.
//
export const CAVE_CFG = {
  colors: {
    frame: '#0a1416',           // Window frame and the void round the playfield
    contour: '#140d0b',         // Dark contour, brown-black
    glowCore: '#fff6dc',        // Core of every additive glow (tinted per use)
    firefly: '#f0d470',         // Ambient fireflies, warm gold
    fireflyCore: '#fff3c0',
    heroSpark: ['#a6e6d0', '#ffe9a8', '#7fd6c2'],
    lanternGlow: '#ffb35c',     // Halo of the lantern mushroom, amber
    lanternCore: '#ffe2a6',
    tealGlow: '#6fd8c8',        // Halo of the small teal mushrooms and bulbs
    rootLight: '#d8b06a'        // Daylight spilling in through the roots' hole
  },
  //
  // Back of the cave: the far wall is the forest's ground stones pulled
  // deep into the dark teal, set in dark brown soil; in front of it float
  // distant rock platforms, softened and dimmed toward the room's haze.
  //
  backdrop: {
    wallSoil: '#2b1d16',        // Dark brown soil between the far wall's stones
    wallShade: '#071316',       // Colour the far stones are pulled toward
    farIsles: '#15363b',        // Colour the distant platforms are pulled toward
    midIsles: '#0f2a2f'         // Nearer distant platforms
  },
  //
  // The cave's earth: walkable tops are platforms from the platforms
  // sheet; under them, in the walls, the ceiling and under the lake, its
  // loose stones packed in brown soil (the forest's deep earth, a step
  // darker) that shows between them like mortar.
  //
  earth: {
    soil: ['#3a2822', '#4a342b', '#57402f'],
    shade: '#0b1216'            // Depth shade pulled over a mass away from its lit side
  },
  //
  // The underground lake (components/lake.js) in the cave's teal.
  //
  water: {
    water: '#1d5a5c',
    paint: {
      light: '#4f9a92',
      deep: '#0d2e33',
      reflection: '#0b2226',
      ripple: '#a6dccf',
      murkTop: '#1a4446',
      murkDeep: '#0b2226',
      bank: '#1d272d',
      bed: '#3b3934',
      bedRim: '#686457',
      bedEdge: '#1b120b',
      bedGravel: '#22211e',
      pebble: '#3c3f3e',
      pebbleLight: '#6e7470',
      stone: '#4a4740',
      stoneLight: '#7b776a',
      stoneDark: '#2e2c27',
      stoneContour: '#140d0b',
      snag: '#3c1714',
      snagLight: '#6e2a24',
      surfaceLine: '#b9eadc',
      surfaceBand: '#5fb0a2',
      algae: '#2e5a2c',
      algaeLight: '#4f8a3a',
      algaeDark: '#1f3d1e'
    }
  },
  //
  // The cave's creatures (cave-eye-flower.js, cave-stalk-eye.js): kin of
  // the forest's doll's-eyes bush and stalk-eyes, but hostile: a darker,
  // blood-red stalk set with dark thorns tipped bone-pale, and bloodshot
  // eyes — a pinkish shaded underside, red veins running in from the rim,
  // a red iris ring tight round a small pupil. Leaves are the cave's moss
  // greens; the flowers between the eyes cream with a red heart.
  //
  creature: {
    contour: '#1f1517',         // Red-black contour round every part
    stem: '#7e2b2a',            // Blood-red stalk body
    stemLight: '#b5493e',       // Lit edge of the stalk
    thorn: '#4b1d1b',           // Thorn body, dark maroon
    thornTip: '#d9c7a4',        // Bone-pale thorn tips
    sclera: '#efe6d2',          // Lit eye white, warm cream
    scleraShade: '#c99d93',     // Its shaded underside, pinkish (bloodshot)
    vein: '#b33a37',            // Red veins in the white
    iris: '#8e2424',            // Red iris ring
    pupil: '#140d0e',           // Pupil
    glint: '#fbf6e8',           // Glint on the pupil
    leaf: '#3e5a2c',            // Blade body, moss green
    leafLight: '#6f8c36',       // Blade midrib
    petal: '#e8e2c4',           // Flower petals, cream
    heart: '#b5403a'            // Flower heart, red
  },
  //
  // The exit between the eye-flower's and the stalk-eye's ledges: warm gold
  // light rising out of the crevice (discovery), its glow and dust motes.
  //
  exit: {
    glow: '#f0c46a',            // Glow, warm gold
    core: '#fff1c4',            // Brightest heart of the glow
    mote: '#ffe7a8'             // Dust motes drifting up in it
  }
}
