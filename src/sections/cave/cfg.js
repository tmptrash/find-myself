//
// Cave section configuration (lesson-cave.0, reference: the cave painting
// with the glowing crevice and the stalk-eye). The cave art
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
    heroSpark: ['#ffe9a8', '#f0d470', '#ffd98a'],
    mushroomDust: '#957663',    // Dust off the dry mushroom: its own colour (tinted like it)
    swarm: '#ffd860',           // The lantern mushroom's fireflies, warm yellow
    swarmCore: '#fff3c0',
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
  // The lake in the hall's floor (cave-lake.js, components/water.js) in
  // the cave's teal: the water, its light skin and deep tint (`deep`, also
  // what sinks under it), the surface's contour and lit band, its
  // highlights and the shade under them, the depth gradient's light and
  // dark, the algae on its bed (dark, base and lit greens), and `bedShade`
  // the dark teal its bed's stones and plants sink into.
  //
  water: {
    water: '#1d5a5c',
    bedShade: '#0a2428',
    //
    // Overrides of CFG.visual.water for this deep lake: its dark starts
    // just under the surface and grows evenly with depth (deepMid half of
    // it half way), full by deepTo of the way down, so all of its bottom
    // lies in the dark, not only its deepest point.
    //
    tune: {
      gradient: { deepFrom: 0.04, deepTo: 0.8, deepMid: 0.5, deepAlpha: 0.8 }
    },
    paint: {
      light: '#4f9a92',
      deep: '#0d2e33',
      surfaceLine: '#b9eadc',
      surfaceBand: '#5fb0a2',
      highlight: '#d4f2e6',
      highlightShade: '#0f3a3e',
      depthLight: '#4f9a92',
      depthDark: '#05161b',
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
  // The water striders on the lake (cave-strider.js): as the runners,
  // their parts pulled a little toward the cave's dark, the far legs and
  // feeler darker still.
  //
  strider: {
    shade: '#0b1216',
    shadeAmount: 0.15,
    farShade: 0.45
  },
  //
  // The lake's fish (cave-fish-paint.js), after cave0/fish.png: soft mauve
  // bodies (darker at the back, warmer at the belly, a peach glow low on
  // the flank and a warm rim of light along the back), peach spots with a
  // deeper edge, mauve fins warming to peach at their tips with faint
  // veins, a big black eye with white glints, a dark plum contour (and a
  // gaping mouth's dark inside).
  // The far side's fin and a fish deep in the water are pulled toward the
  // cave's dark (farShade, depthShade); `sand` the grains it spills
  // picking at the lake's bed.
  //
  fish: {
    back: '#86607f',
    body: '#9c6f8e',
    belly: '#9c6a68',
    glow: '#f0b07a',
    rim: '#f0c99a',
    spot: '#efbd86',
    spotEdge: '#d29a6c',
    fin: '#a0729a',
    finTip: '#e0a684',
    vein: '#5e4558',
    contour: '#3a2a33',
    eye: '#1d1a17',
    glint: '#ffffff',
    gape: '#4a2230',
    splash: '#b9eadc',
    sand: '#a98e66',
    farShade: 0.35,
    depthShade: 0.3
  },
  //
  // The lurker plant by the left bank (cave-lurker.js, plant_left.png):
  // its pieces drawn toned down toward the cave's light (tint), its
  // eye's pupil, the splash its head throws up.
  //
  lurker: {
    tint: '#c9c7b4',
    pupil: '#1d1a17',
    splash: '#b9eadc'
  },
  //
  // The climber (cave-haggy.js, haggy_waggy.png): its pieces toned a
  // little toward the cave's light (tint).
  //
  haggy: {
    tint: '#d9d2c4'
  },
  //
  // The pad plant in the lake (cave-pads.js, plant_mid.png): drawn toned
  // down toward the cave's light.
  //
  pads: {
    tint: '#c9c7b4'
  },
  //
  // Bubbles rising from the lake's bed: their body, their bright rim.
  //
  bubbles: {
    body: '#9fd3cc',
    rim: '#dff5f1'
  },
  //
  // The trumpeter (cave-trumpet.js, plant_right.png): drawn toned down
  // toward the cave's light (tint); its eyelids (and their edge), its
  // pupils, the teeth in its funnel (and their edge).
  //
  trumpet: {
    tint: '#c9c7b4',
    lid: '#5f5a23',
    lidEdge: '#33300f',
    pupil: '#1d1a17',
    tooth: '#eadfba',
    toothDeep: '#b7a47c',
    toothEdge: '#5a3a20'
  },
  //
  // The lake's giant (cave-giant.js): its body (assets/cave0/creature.png)
  // bent as one skinned mesh, its paddles drawn apart. `length` is its drawn length (world px, the
  // picture's width); `mesh` the grid (columns, rows) and how wide the
  // blend across a joint is (share of a bone); `anim` the swim's tuning:
  // beats per s and the body's and tail's swing at full swim (rad), how
  // stiffly the body follows the head's pitch (0..1), how far the wave
  // lags from bone to bone (rad), how quickly it answers a turn (0..1) and
  // an overall speed of the animation; `mist` the breath's colour; `gape`
  // the pink back of its open (see-through) mouth, `tooth` and `toothEdge`
  // its teeth, `blood` what clouds out of its mouth as it eats.
  //
  giant: {
    length: 208,
    mesh: { cols: 48, rows: 10, blend: 0.6 },
    anim: {
      swimFrequency: 0.5,
      swimAmplitude: 0.12,
      tailAmplitude: 0.35,
      bodyStiffness: 0.9,
      phaseOffset: 0.6,
      turnResponsiveness: 0.8,
      animationSpeed: 1
    },
    mist: '#e2ece8',
    gape: '#8a3a46',
    tooth: '#eee3c4',
    toothEdge: '#3a2a1c',
    blood: '#b3202c',
    debugLine: '#ffffff',
    debugBones: ['#ff5a5a', '#ffb347', '#ffe066', '#7ddc6e', '#4fc3f7', '#9575cd', '#f06292']
  },
  //
  // The cave's stalk-eye (cave-stalk-eye.js, cave-menu-stalk-eye.js): kin
  // of the forest's stalk-eyes, but hostile: a darker, blood-red stalk set
  // with dark thorns tipped bone-pale, and bloodshot eyes — a pinkish
  // shaded underside, red veins running in from the rim, a red iris ring
  // tight round a small pupil. Its leaves are the cave's moss greens.
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
    leafLight: '#6f8c36'        // Blade midrib
  }
}
