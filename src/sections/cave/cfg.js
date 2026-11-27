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
  // feeler darker still (farShade: how much of their light is taken);
  // the flesh that shows where one has been bitten through.
  //
  runner: {
    shade: '#0b1216',
    shadeAmount: 0.18,
    farShade: 0.45,
    flesh: '#7a3b2e'
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
  // the throat seen when it opens its mouth (mouth).
  //
  haggy: {
    tint: '#d9d2c4',
    mouth: '#2a1512',
    //
    // Anatomy (world px). A limb has no joints: it is one flexible body
    // `length` long, a chain of `segments` pieces drawn as one smooth
    // curve `subdivide` times finer, `thickness` times the art's width,
    // tapering from taper[0] at the head to taper[1] at the wrist; a hold
    // may need at most reachShare of the length. The limbs are rooted on
    // the head at `shoulders` ([x, y] from its middle), just inside its
    // rim: a pair at either side (two at its front, two at its back,
    // whichever way it faces) and one in the middle of its underside,
    // its tail. Each keeps its holds round its own place, `keep` px to
    // its side of the head along a level way (the pair on the side it
    // goes to holds ahead, the other pair behind, the tail under the
    // head) — so a limb runs out from where it is rooted.
    // The head keeps off the edge it climbs by hangH under a
    // ceiling, walkH over a top, sideH on a side. It is an ellipse
    // head.rx px across either side of its middle and head.ry up and down
    // (its dome; only the tips of the scales round it reach farther):
    // nothing solid, no water, ever comes inside it, and it never shrinks
    // — in a tight place (a shaft, a gap between ledges) it turns along
    // its way instead.
    // Each limb carries buttons[0] … buttons[1] buttons, set at random
    // along buttonSpan (shares of its length): they ride its skin, moving
    // apart as it stretches.
    //
    anatomy: {
      length: 232,
      segments: 10,
      subdivide: 2,
      thickness: 1,
      taper: [1.55, 0.9],
      reachShare: 0.93,
      shoulders: [[-27, -1], [-25, 9], [0, 20], [25, 9], [27, -1]],
      keep: [-44, -26, 0, 26, 44],
      hangH: 108,
      walkH: 124,
      sideH: 86,
      head: { rx: 31, ry: 25 },
      buttons: [3, 5],
      buttonSpan: [0.12, 0.86]
    },
    //
    // A limb's chain: free, it is `slack` times as long as the way from
    // shoulder to wrist (it curves) and droops `droop` px/s; holding, it
    // runs straight from its hold to the head, its points settling onto
    // that line at tautRate per s. It contracts down to minLength of its
    // full length, changing at lengthRate per s. Its flesh keeps its
    // volume: at girth.rest of its full length it is as thick as its art,
    // longer it gets thinner (down to girth.thin of that), shorter thicker
    // (up to girth.thick) — less so toward the wrist, which keeps to the
    // hand (only girth.wrist of the change there). It keeps `radius` px
    // clear of anything hard.
    //
    limb: {
      slack: 1.13,
      droop: 40,
      tautRate: 14,
      minLength: 0.2,
      lengthRate: 4,
      girth: { rest: 0.55, thin: 0.72, thick: 1.5, wrist: 0.4 },
      radius: 9
    },
    //
    // Turning: the head leans up to `tilt` rad with the way it goes (where
    // its way is too tight for it upright, it turns right along it). It
    // faces the side its way runs to once that way's X share passes
    // faceDx for faceHold s, and turns round in turnTime s (through its
    // face-on picture). Resting, it looks about: to the other side every
    // lookEvery: [min, max] s.
    //
    turning: {
      tilt: 0.3,
      faceDx: 0.35,
      faceHold: 0.3,
      turnTime: 0.2,
      lookEvery: [2.5, 5]
    },
    //
    // Walking on a top the head never comes lower over the ground than
    // minWalk of a limb's length.
    //
    body: {
      minWalk: 0.5
    },
    //
    // Locomotion in its two moods (px, s): the speed of its place on the
    // way and how fast it gets there (accel, 1/s), how closely the head
    // follows that place (follow, rad/s of a critically damped spring),
    // how many hands hold on while it moves (holds), how many may reach
    // at once (reaches), the rest after a hand lands before the next
    // reaches (stepGap), a reach's time (reachTime: [min, max], set by
    // reachSpeed px/s), how far ahead along the way a hand takes its hold
    // (lead), how far a hold may lag behind before the hand steps on
    // (stride). Stalking — creeping up on prey it has felt — it goes slow
    // and soft, every hand it can spare holding on, one reaching at a
    // time and unhurried, its head `crouch` px nearer the surface it
    // creeps on. Roaming it stops now and then (pauseEvery, pause: [min, max] s)
    // and feels about with its free limbs (each on its own: probeChance
    // per try, probeGap s apart at least, a feeling lasting probeTime:
    // [min, max] s). Of its wanders, a share `openings` goes into an
    // opening (a shaft such as the cave's entrance, a niche, a gap by a
    // ledge), the rest anywhere.
    //
    explore: {
      speed: 24,
      accel: 2.5,
      follow: 5,
      holds: 3,
      reaches: 1,
      stepGap: 0.35,
      reachTime: [0.6, 1],
      reachSpeed: 200,
      lead: 46,
      stride: 90,
      pauseEvery: [2.5, 6],
      pause: [1.2, 3.2],
      probeChance: 0.6,
      probeGap: 2.2,
      probeTime: [1.8, 2.8],
      openings: 0.5
    },
    stalk: {
      speed: 46,
      accel: 2.5,
      follow: 4,
      holds: 4,
      reaches: 1,
      stepGap: 0.25,
      reachTime: [0.5, 0.85],
      reachSpeed: 260,
      lead: 50,
      stride: 70,
      crouch: 34
    },
    //
    // Holds: at least minSupport hands hold on while another steps (and a
    // hand steps on only after holding minHold s), sought within search
    // px of where a hand wants to hold; a hold within gap px of another
    // hand's is taken. A hand takes its hold carrying on its limb's line
    // — pointing from its shoulder to the hold — and turns about its
    // claws with the head as it moves.
    //
    grip: {
      minSupport: 2,
      minHold: 0.5,
      search: 80,
      gap: 30
    },
    //
    // Its senses. It is blind and knows of a living thing only by touch —
    // or, a runner, by the tremor of its running. Prey (what the level says it can eat: the
    // hero, a runner) within touch.reach px of a hand is caught; touching
    // a limb or the head it is felt, and it stalks to that place. What it
    // knows grows stale: after memory s with nothing new it gives the
    // stalk up and searches about for investigate s, then roams. It plans
    // a new way to its prey at most every replanGap s (or when the prey
    // was felt replanDist px off). The tremor of prey that runs on the
    // rock (a runner) it feels from tremor.reach px off its head while
    // that prey moves tremor.speed px/s or faster, and stalks toward it
    // — not for tremor.sated s after a meal.
    // A hand that touches water draws back
    // and it looks for another way (at most once every waterGap s), its
    // ways keeping avoid.radius px clear of that spot for avoid.time s (a
    // way through there counts avoid.cost px longer).
    // A meal (eat): the hand brings its prey before the mouth (within
    // `near` px of its place there; not there in carryMost s, it lets the
    // prey drop), then it eats, `bites` times over: its mouth gapes for
    // `gape` s while the prey's end is pushed `deep` px into it, its jaws
    // take `bite` s to close on it, what they took off is chewed for
    // `chew` s (`inside` px in from the mouth's front, the hand drawn
    // `back` px back with the rest), then a `pause` s; it rests `rest` s
    // after the meal.
    //
    sense: {
      touch: {
        reach: 6
      },
      tremor: { reach: 360, speed: 60, sated: 14 },
      memory: 6,
      investigate: 4,
      replanGap: 0.6,
      replanDist: 120,
      waterGap: 2,
      avoid: { radius: 170, time: 25, cost: 900 },
      eat: { near: 10, carryMost: 6, bites: 3, gape: 0.35, bite: 0.45, chew: 1.75, pause: 0.45, deep: 14, back: 8, inside: 9, rest: 1.5 }
    },
    //
    // Work per second: its body and limbs step simHz times a second (farHz
    // while it is farMargin px or more out of sight), its hands' next holds
    // are planned planHz times; a plan looks at maxCandidates holds at most,
    // a way search expands maxExpansions nodes at most.
    //
    perf: {
      simHz: 60,
      farHz: 15,
      farMargin: 400,
      planHz: 15,
      maxCandidates: 40,
      maxExpansions: 2000
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
