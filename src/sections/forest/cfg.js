//
// Forest section tuning that is not colour (Forest colours are palette
// aliases in CFG.visual.colors.palette).
//
// Water flower by the left big tree (components/water-flower.js). Lengths in
// world px, times in seconds, speeds in px/s; the water volume is the share
// of one full bubble.
//
const WATER_FLOWER = {
  height: 110,                      // Picture height, stem's foot to the top leaf
  //
  // Bubble growing out of the flower: it swells from nothing and hangs lower
  // as it grows, then stops at its full size.
  //
  bubbleMaxRadius: 19,
  bubbleGrowDuration: 12.5,         // With regrowDelay: 15 s from a burst to the next full bubble
  bubbleWaterFill: 0.5,             // Share of the bubble's height the water stands at
  regrowDelay: 2.5,                 // Bare flower this long after a burst
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

export const FOREST_CFG = {
  waterFlower: WATER_FLOWER
}
