//
// Forest section tuning that is not colour (Forest colours are palette
// aliases in CFG.visual.colors.palette).
//
// Water flower by the left big tree (components/water-flower.js). Lengths in
// world px, times in seconds, speeds in px/s; the water volume is the share
// of one full bubble.
//
const WATER_FLOWER = {
  height: 107,                      // Picture height, stem's foot to the top leaf
  //
  // Bubble growing out of the flower: it swells from nothing and hangs lower
  // as it grows, then stops at its full size.
  //
  bubbleMaxRadius: 19,
  bubbleGrowDuration: 12.5,         // With regrowDelay: 15 s from a burst to the next full bubble
  bubbleWaterFill: 0.5,             // Share of the bubble's height the water stands at
  regrowDelay: 2.5,                 // Bare flower this long after a burst
  startDelay: 10,                   // Bare flower this long the first time the game starts
  //
  // Hanging motion: a slow sway round the flower and a soft wobble of the
  // skin; landings nearby kick both.
  //
  swayAmplitude: 0.05,              // Idle sway (radians)
  swaySpeed: 0.7,
  swayStiffness: 22,
  swayDamping: 2.4,
  wobbleStiffness: 140,
  wobbleDamping: 7,
  landingSwayKick: 1.2,             // Sway speed a landing adds (rad/s)
  landingWobbleKick: 2.2,           // Squash speed a landing adds (share/s)
  //
  // Landing trigger: the whole plant shakes round its stem's foot like the
  // bomb trees, and a full-size bubble falls once the shake has died down.
  //
  landingRadius: 56,                // Max distance from the stem's foot to the hero's landing X
  shakeMaxAngle: 0.05,              // Plant's swing at the start of the shake (radians)
  shakeDropDelay: 0.5,              // From the landing to the bubble tearing off
  //
  // Fall and burst.
  //
  fallGravity: 1500,
  fallStretch: 0.0004,              // Stretch per px/s of fall speed
  fallMaxStretch: 0.2,
  burstSplashDrops: 40,
  burstSplashPower: 3.1,            // Splash drop speed share (1: a drip's splash)
  burstSpread: 0.9,                 // Share of the radius the water lands and splashes across
  //
  // Ground water.
  //
  puddleSpreadSpeed: 26,
  puddleWidth: 26,                  // Puddle half width for one full bubble
  puddleThickness: 3.2,
  soilAbsorptionDuration: 3.5,
  soilDryingDuration: 9
}

//
// Apple bug living in a burrow by the left big tree (components/apple-bug.js).
// Lengths in world px, times in seconds, speeds in px/s, angles in radians.
//
const APPLE_BUG = {
  shellWidth: 60,                   // Shell picture width
  holeWidth: 200,                   // Burrow picture width (its hole fits the bug)
  bodyLift: 18.6,                   // Body's origin (hips) over the ground at rest: knees bent out at the shell's rim
  //
  // It moves in dashes: speed rises and falls over each dash (peak speed),
  // with a pause and a new pose between them. dashStart skips that share
  // of the speed's rise, so a dash starts that fast at once (0.5: at peak).
  //
  stroll: { speed: 130, dashMin: 0.16, dashMax: 0.32, pauseMin: 0.15, pauseMax: 0.55 },
  fetch: { speed: 190, dashMin: 0.22, dashMax: 0.36, pauseMin: 0.03, pauseMax: 0.08 },  // ~110 px/s: on its way to an apple
  dart: { speed: 340, dashMin: 0.45, dashMax: 0.55, pauseMin: 0, pauseMax: 0.02, dashStart: 0.5 },  // Past the flower's drop: for the apple at once
  run: { speed: 300, dashMin: 0.4, dashMax: 0.6, pauseMin: 0.01, pauseMax: 0.04, dashStart: 0.5 },  // Home with an apple: hurries to hide it
  flee: { speed: 300, dashMin: 0.45, dashMax: 0.7, pauseMin: 0, pauseMax: 0.02, dashStart: 0.5 },  // Scared of the water: no stops
  turnDuration: 0.08,               // A quick hop round
  stepDuration: 0.085,
  stepLift: 3.24,
  //
  // Burrow: it goes in only with an apple or when something scares it.
  //
  hideMin: 3,                       // At the start and after a crawler sent it in
  hideMax: 6,
  waterScareReach: 70,              // The flower's water falling this near the shell (across) scares it too
  scaredHide: 1,                    // After the flower's water hit it or fell near it: in and straight out again
  appleHideMin: 5,                  // After it took an apple home
  appleHideMax: 8,
  bombHideMin: 2,                   // After the burst of the bomb nearest its burrow (a short scare)
  bombHideMax: 4,
  crawlerFearReach: 150,            // A crawler eating this near sends it home; it keeps this far from one while out
  lakeShare: 0.6,                   // Share of its outings spent hunting at the lake
  //
  // Lake hunt: it stands lakeStandGap past the lake's edge, its front feet
  // still on the flat ground before the bank dips to the water, and
  // catches midges over the lake with its tongue.
  //
  lakeStandGap: 108,
  huntMin: 7,
  huntMax: 12,
  tongueReach: 140,
  tongueOut: 0.11,
  tongueBack: 0.16,
  tongueWaitMin: 0.6,
  tongueWaitMax: 1.6,
  //
  // Strolls round the tree's foot on its right side.
  //
  wanderMin: 5,
  wanderMax: 10,
  wanderReach: 170,                 // Past the trunk's middle
  //
  // Apples it notices: falling or lying this far left and right of the trunk.
  //
  appleLeft: 200,
  appleRight: 300,
  //
  // The burrow's tunnel under the ground: tunnelDelay after it dashed into
  // the hole with an apple it shows up in the cave's left rounded end, runs to
  // the far end, stores or eats the apple and runs back.
  //
  tunnelWidth: 450,                 // Tunnel picture width: the full-size bug fits its narrow middle
  tunnelDepth: 60,                  // Soil strip between the ground (the burrow's doorway) and the cave's top stones
  tunnelDelay: 0.4,
  tunnelDark: 0.45,                 // How dark the apples stored underground look
  tunnelBugDark: 0.72,              // How dark the bug itself looks underground
  tunnel: { speed: 170, dashMin: 0.25, dashMax: 0.4, pauseMin: 0.04, pauseMax: 0.12 },
  tunnelRush: { speed: 340, dashMin: 0.45, dashMax: 0.6, pauseMin: 0, pauseMax: 0.02, dashStart: 0.5 },  // An apple fell up there: back out at once
  pileMax: 3,                       // Apples stored at the far end; with that many there it eats the next one
  eatBites: 8
}

//
// Propeller bud "Valera" (components/propeller-bud.js): a rooted leafy cone
// with a seed propeller over its head that flies on from stop to stop ahead
// of the hero and at last off the level for good. The whole creature,
// propeller included, stands about 70px. Lengths in world px, times in
// seconds, speeds in px/s.
//
const PROPELLER_BUD = {
  headSize: 34,                     // Head width (the rest of its picture scales with it)
  wakeReach: 420,                   // Hero this near: it wakes and its pupils follow him now and then
  sleepReach: 560,                  // Hero farther on its perch: it falls asleep (pupils gone, breathing)
  fleeReach: 260,                   // Hero this near at a ground stop: it flies on to the next one before he reaches it
  propFrameSec: 0.01,               // Every propeller frame shows this long while it spins
  //
  // The propeller drives the arc in jerks. The body hangs under it and
  // squashes when the pull of a dash, a turn or a stop loads it.
  //
  flySpeed: 320,
  flyAccel: 700,                    // How fast that speed may change along the arc
  landDuration: 0.55,               // Descent onto the spot while the body is still swinging
  //
  // Roots: two paws grow down into the ground after it sits (or curl onto
  // a branch) and pull back in before it takes off.
  //
  rootGrow: 0.7,
  rootRetract: 0.3
}

//
// Hint for a hero who never shook the water flower's bubble loose himself
// (utils/forest-drop-hint.js): after this many deaths or this long on the
// move the apple bug bites the bubble off for him, up to `bites` times.
//
const DROP_HINT = {
  deaths: 5,
  moveSeconds: 30,
  bites: 3
}

export const FOREST_CFG = {
  waterFlower: WATER_FLOWER,
  appleBug: APPLE_BUG,
  propellerBud: PROPELLER_BUD,
  dropHint: DROP_HINT
}
