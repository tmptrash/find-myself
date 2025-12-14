import { CFG } from '../cfg.js'
import { initScene } from '../utils/scene.js'
import * as Hero from '../../../components/hero.js'
import * as TimeDigits from '../components/time-digits.js'
import * as TimePlatform from '../components/time-platform.js'
import * as StaticTimePlatform from '../components/static-time-platform.js'
import * as TimeSpikes from '../components/time-spikes.js'
import * as Sound from '../../../utils/sound.js'
import { saveLastLevel } from '../../../utils/progress.js'

//
// Platform dimensions (in pixels, for 1920x1080 resolution)
// Platforms fill entire top and bottom to hide background
//
const PLATFORM_TOP_HEIGHT = 250
const PLATFORM_BOTTOM_HEIGHT = 250
const PLATFORM_SIDE_WIDTH = 192

//
// Hero spawn positions (in pixels)
//
const HERO_SPAWN_X = 250
const HERO_SPAWN_Y = 790
const ANTIHERO_SPAWN_X = 1670
const ANTIHERO_SPAWN_Y = 790

/**
 * Time section level 0 scene
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel0(k) {
  k.scene("level-time.0", () => {
    //
    // Save progress immediately when entering this level
    //
    saveLastLevel('level-time.0')
    //
    // Create sound instance
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    //
    // Start background music (clock.mp3)
    //
    Sound.startBackgroundMusic(sound, k, 'clock')
    //
    // Stop music when leaving the scene
    //
    k.onSceneLeave(() => {
      Sound.stopBackgroundMusic(sound)
    })
    //
    // Initialize level with heroes and platforms
    //
    const { hero, antiHero } = initScene({
      k,
      levelName: 'level-time.0',
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y,
      onAnnihilation: () => {
        //
        // After annihilation, return to menu
        // TODO: Change to k.go('level-time.1') when level 1 is created
        //
        k.go('menu')
      }
    })
    
    //
    // Override z-index for heroes to be above time digits
    //
    hero.character.z = 20
    antiHero.character.z = 20
    
    //
    // Create time digits background (full screen)
    //
    const timeDigitsInst = TimeDigits.create({ k })
    
    //
    // Update time digits
    //
    k.onUpdate(() => TimeDigits.onUpdate(timeDigitsInst))
    
    //
    // Create a game object for drawing time digits with proper z-index
    //
    k.add([
      {
        draw() {
          TimeDigits.draw(timeDigitsInst)
        }
      },
      k.z(16)  // Above platforms (15) but below player
    ])
    //
    // Spawn heroes (enables movement)
    //
    Hero.spawn(hero)
    Hero.spawn(antiHero)
    //
    // Create time platforms going right and up
    // Platform 1: left-bottom, above hero (2 seconds)
    //
    const timePlatform1 = TimePlatform.create({
      k,
      x: 400,
      y: 760,
      hero,
      duration: 2
    })
    //
    // Platform 2: middle, higher (closer, 2 seconds)
    //
    const timePlatform2 = TimePlatform.create({
      k,
      x: 580,
      y: 690,
      hero,
      duration: 2
    })
    //
    // Platform 3: right, even higher, FAKE (hero passes through)
    //
    const timePlatform3 = TimePlatform.create({
      k,
      x: 760,
      y: 620,
      hero,
      isFake: true
    })
    //
    // Platform 4: static platform with running timer (same Y as platform 2)
    //
    const staticPlatform = StaticTimePlatform.create({
      k,
      x: 880,
      y: 720,
    })
    //
    // Platform 5: 1-second timer, right and up from static platform
    //
    const timePlatform5 = TimePlatform.create({
      k,
      x: 1060,
      y: 650,
      hero,
      duration: 1
    })
    //
    // Platform 6: 1-second timer, right and up from platform 5
    //
    const timePlatform6 = TimePlatform.create({
      k,
      x: 1240,
      y: 580,
      hero,
      duration: 1
    })
    //
    // Update all time platforms
    //
    k.onUpdate(() => {
      TimePlatform.onUpdate(timePlatform1)
      TimePlatform.onUpdate(timePlatform2)
      TimePlatform.onUpdate(timePlatform3)
      TimePlatform.onUpdate(timePlatform5)
      TimePlatform.onUpdate(timePlatform6)
      StaticTimePlatform.onUpdate(staticPlatform)
    })
    //
    // Create time spikes (digit "1") under the time platform to anti-hero
    //
    const timeSpikes = TimeSpikes.create({
      k,
      startX: 450,  // Start after the time platform
      endX: 1600,   // End near the anti-hero
      y: 810,       // Below the time platform, on the floor level
      hero,
      sfx: sound
    })
  })
}
