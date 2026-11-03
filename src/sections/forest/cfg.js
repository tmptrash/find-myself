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
  startDelay: 10,                   // Bare flower this long after the level starts
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
  shellWidth: 50,                   // Shell picture width
  holeWidth: 190,                   // Burrow picture width (its hole fits the bug)
  bodyLift: 18,                     // Body's origin over the ground at rest
  //
  // It moves in dashes: speed rises and falls over each dash (peak speed),
  // with a pause and a new pose between them. dashStart skips that share
  // of the speed's rise, so a dash starts that fast at once (0.5: at peak).
  //
  stroll: { speed: 130, dashMin: 0.16, dashMax: 0.32, pauseMin: 0.15, pauseMax: 0.55 },
  run: { speed: 105, dashMin: 0.3, dashMax: 0.5, pauseMin: 0.05, pauseMax: 0.12 },  // ~55 px/s: for an apple and home with it
  flee: { speed: 300, dashMin: 0.45, dashMax: 0.7, pauseMin: 0, pauseMax: 0.02, dashStart: 0.5 },  // Scared of the water: no stops
  turnDuration: 0.08,               // A quick hop round
  stepDuration: 0.085,
  stepLift: 3.6,
  //
  // Burrow: how long it hides after dashing into the dark hole.
  //
  hideMin: 3,
  hideMax: 6,
  waterScareReach: 70,              // The flower's water falling this near the shell (across) scares it too
  scaredHideMin: 14,                // After the flower's water hit it or fell near it
  scaredHideMax: 18,
  appleHideMin: 5,                  // After it took an apple home
  appleHideMax: 8,
  lakeShare: 0.6,                   // Share of its outings spent hunting at the lake
  //
  // Lake hunt: it stands lakeStandGap past the lake's edge, its front feet
  // still on the flat ground before the bank dips to the water, and
  // catches midges over the lake with its tongue.
  //
  lakeStandGap: 100,
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
  appleRight: 300
}

export const FOREST_CFG = {
  waterFlower: WATER_FLOWER,
  appleBug: APPLE_BUG
}
