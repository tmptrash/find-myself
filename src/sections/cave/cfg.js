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
  // The climber (cave-haggy.js, haggy_waggy.png), a blind predator on five
  // clawed limbs: its pieces toned a little toward the cave's light (tint),
  // the throat seen when it opens its mouth (mouth). showHolds draws, in
  // the holds colour, every stretch of the platforms' outline its claws
  // may hold.
  //
  haggy: {
    tint: '#d9d2c4',
    mouth: '#2a1512',
    holds: '#ff2a2a',
    showHolds: true,
    //
    // Anatomy (world px). A limb has no joints: it is one flexible body
    // `length` long (it never stretches past that), a chain of `segments`
    // pieces drawn as one smooth curve `subdivide` times finer, `thickness`
    // times the art's width, tapering from taper[0] at the body to
    // taper[1] at the wrist. A hold may need at most reachShare of the
    // length (the rest is slack: the limb curves). The limbs leave the
    // body at `shoulders` ([x, y] from its middle, facing left; mirrored
    // with it). The body keeps off the edge it climbs by hangH under a
    // ceiling, walkH over a top, sideH on a side. How deep the claws go
    // into the soil is not set here: it is the fingers' own length, taken
    // from the art (cave-haggy-draw.js).
    //
    anatomy: {
      length: 232,
      segments: 10,
      subdivide: 2,
      thickness: 1,
      taper: [1.12, 0.92],
      reachShare: 0.93,
      shoulders: [[-13, 9], [-7, 12], [0, 13], [7, 12], [13, 9]],
      hangH: 108,
      walkH: 124,
      sideH: 86
    },
    //
    // A limb's flesh, per step of its chain: how much of its motion it
    // keeps (damping: lower is calmer), how strongly it straightens its
    // bends (stiffness 0 … 0.5: the higher, the broader its curves), how
    // hard its muscle bows it out of the surface it holds (bow, px/s²),
    // how much a free one droops (droop, px/s²), how fast its bow turns
    // to a new side (bowRate, 1/s), and how firmly it comes into its
    // wrist along the hand (wristGuide 0 … 1). No two pieces in a row bend
    // more than maxBend rad (its sharpest curve). It contracts: it is
    // `slack` times as long as the way from shoulder to wrist (so it
    // curves gently instead of hanging in loops), down to minLength of
    // its full length, changing at lengthRate per s and swelling up to
    // `swell` times as thick when short. It keeps `radius` px clear of the
    // soil.
    //
    limb: {
      damping: 0.86,
      stiffness: 0.22,
      maxBend: 0.5,
      slack: 1.13,
      minLength: 0.35,
      lengthRate: 4,
      swell: 1.25,
      bow: 520,
      droop: 380,
      bowRate: 2.5,
      wristGuide: 0.5,
      radius: 7
    },
    //
    // The body's turning: its tilt follows the way it goes (tilt rad on a
    // steep way) as a damped turn of at most angularVel rad/s and
    // angularAccel rad/s². It faces the way it goes; it turns round only
    // when the way has led the other way (past faceDx of its length
    // sideways) for faceHold s, slowing to a stop and turning over
    // turnTime s before it goes on.
    //
    turning: {
      tilt: 0.3,
      angularVel: 1.6,
      angularAccel: 9,
      faceDx: 0.35,
      faceHold: 0.45,
      turnTime: 0.5
    },
    //
    // Locomotion in its two moods (px, s): body speed along its way and
    // how fast it gets there (accel, 1/s), how many hands hold on while
    // the others are free (holds), how stiffly the holding limbs pull the
    // body to its place (pull, 1/s²) and how firmly that settles (damping
    // share of critical: 1 never swings past), the most hands in the air
    // at once, the gap after a hand takes hold before the next one lets
    // go, a reach's time (min, max) at reachSpeed px/s, the tug a hand
    // gives the body as it takes hold (kick), how far ahead of the hands
    // the body may get (lead), how far on along the way a new hold is
    // sought (holdLead), how far a hold may lag behind before the hand
    // steps on (stride). Exploring it stops now and then (pauseEvery,
    // pause: [min, max] s) and feels about with a free limb (probeChance
    // per try, a probe lasting probeTime: [min, max] s).
    //
    explore: {
      speed: 24,
      accel: 2.5,
      holds: 4,
      pull: 9,
      damping: 1,
      reaches: 1,
      stepGap: 0.35,
      reachTime: [0.6, 1],
      reachSpeed: 200,
      kick: 8,
      lead: 46,
      holdLead: 40,
      stride: 90,
      pauseEvery: [2.5, 6],
      pause: [1.2, 3.2],
      probeChance: 0.6,
      probeTime: [1.8, 2.8]
    },
    pursuit: {
      speed: 150,
      accel: 8,
      holds: 3,
      pull: 26,
      damping: 0.9,
      reaches: 2,
      stepGap: 0.05,
      reachTime: [0.2, 0.34],
      reachSpeed: 700,
      kick: 26,
      lead: 80,
      holdLead: 90,
      stride: 70
    },
    //
    // Holds: at least minSupport hands hold on (a hand lets go only while
    // that many others do, and only after holding minHold s), sought
    // within search px of where a hand wants to hold; a hold within gap px
    // of another hand's is taken. ways: how often a stretch of its way is
    // climbed out in the air off the edge, behind the platform, or on the
    // soil's face in front of it (shares; on the face its limbs lie over
    // the soil, so it is off).
    //
    grip: {
      minSupport: 3,
      minHold: 0.5,
      search: 80,
      gap: 30,
      ways: { out: 0.6, behind: 0.4, face: 0 }
    },
    //
    // Hearing: sounds fade out over range px (soil in between muffles
    // them by occlusion); one heard at threshold or louder sets it after
    // its source. At the last place heard — or once silent for memory s
    // on the way — it searches about for investigate s, then roams again.
    // It plans a new way to a sound at most every replanGap s (or when the
    // sound moved replanDist px).
    //
    hearing: {
      range: 900,
      threshold: 0.22,
      occlusion: 0.5,
      memory: 6,
      investigate: 4,
      replanGap: 0.6,
      replanDist: 120
    },
    //
    // Work per second: its body and limbs step simHz times a second (farHz
    // while it is farMargin px or more out of sight), its hands' next holds
    // are planned planHz times; a plan looks at maxCandidates holds at most,
    // a way search expands maxExpansions nodes at most, a limb's chain is
    // settled in limbPasses passes a step. debug draws its workings and
    // timings (also ?haggyDebug in the address).
    //
    perf: {
      simHz: 60,
      farHz: 15,
      farMargin: 400,
      planHz: 15,
      maxCandidates: 40,
      maxExpansions: 2000,
      limbPasses: 4,
      debug: false
    }
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
