//
// Cave section configuration (lesson-cave.0, reference: the cave painting
// with the eye-flower, the glowing crevice and the stalk-eye). The cave art
// is free of the fixed 96-swatch palette by design: its colours are picked
// to sit with the painted art of assets/cave0 (its soil block, top strips,
// edges, stones and plants) — dark teal void behind, warm brown soil, gold
// light where the exit is.
//
export const CAVE_CFG = {
  colors: {
    frame: '#0a1416',           // Window frame and the void round the playfield
    contour: '#140d0b',         // Dark contour, brown-black
    glowCore: '#fff6dc',        // Core of every additive glow (tinted per use)
    firefly: '#f0d470',         // Ambient fireflies, warm gold
    fireflyCore: '#fff3c0',
    heroSpark: ['#a6e6d0', '#ffe9a8', '#7fd6c2'],
    lanternGlow: '#62d6f0',     // Halo of the blue lantern mushroom, cold blue
    lanternCore: '#d8f8ff',
    rootLight: '#d8b06a',       // Daylight spilling in through the roots' hole
    fps: '#ffffff'              // FPS readout
  },
  //
  // Back of the cave: the far wall is the soil block studded with ground
  // stones, pulled deep into the dark teal.
  //
  backdrop: {
    wallShade: '#071316'        // Colour the far wall is pulled toward
  },
  //
  // Stones in front of the hero (cave-front.js): pulled toward the
  // room's dark, nearer the eye and out of the light.
  //
  front: {
    shade: '#0a1518',
    shadeAmount: 0.3
  },
  //
  // The cave's soil (its own colours come from the painted soil kit, see
  // cave-earth.js): the cool depth shade pulled over the walls and the
  // ceiling, under a laid stone (its contact shadow) and over the plants.
  //
  earth: {
    shade: '#0b1216'            // Cool blue-black depth shade
  },
  //
  // The lake in the hall's floor (cave-lake.js) in the cave's teal: the
  // water, its light skin and deep tint, the surface lines and the band
  // between them, the algae on its bed (dark, base and lit greens).
  //
  water: {
    water: '#1d5a5c',
    paint: {
      light: '#4f9a92',
      deep: '#0d2e33',
      surfaceLine: '#b9eadc',
      surfaceBand: '#5fb0a2',
      algae: '#2e5a2c',
      algaeLight: '#4f8a3a',
      algaeDark: '#1f3d1e'
    }
  },
  //
  // The runner insects (cave-runner.js): their painted parts pulled a
  // little toward the cave's dark (shadeAmount), the far legs and the far
  // feeler darker still (farShade: how much of their light is taken).
  //
  runner: {
    shade: '#0b1216',
    shadeAmount: 0.18,
    farShade: 0.45
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
  }
}
