import { CFG } from '../cfg.js'
import { initScene, startTimeSectionMusic, stopTimeSectionMusic } from '../utils/scene.js'
import * as Hero from '../../../components/hero.js'
import * as TimeDigits from '../components/time-digits.js'
import * as TimePlatform from '../components/time-platform.js'
import * as Sound from '../../../utils/sound.js'
import { saveLastLevel } from '../../../utils/progress.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
//
// Platform dimensions (in pixels, for 1920x1080 resolution)
//
const PLATFORM_TOP_HEIGHT = 150
const PLATFORM_BOTTOM_HEIGHT = 150
const PLATFORM_SIDE_WIDTH = 192
//
// Hero size (approximately)
//
const HERO_HEIGHT = 96  // SPRITE_SIZE (32) * HERO_SCALE (3)
const HERO_WIDTH = 96   // SPRITE_SIZE (32) * HERO_SCALE (3)
//
// Level geometry
//
const BOTTOM_PLATFORM_TOP = 1080 - PLATFORM_BOTTOM_HEIGHT  // 930
const FLOOR_Y = 700
//
// Hero spawn positions
//
const HERO_SPAWN_X = PLATFORM_SIDE_WIDTH + 100
const HERO_SPAWN_Y = FLOOR_Y - 50
const ANTIHERO_SPAWN_X = 1920 - PLATFORM_SIDE_WIDTH - 100
const ANTIHERO_SPAWN_Y = FLOOR_Y - 50

/**
 * Time section level 2 scene
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel2(k) {
  k.scene("level-time.2", () => {
    //
    // Save progress immediately when entering this level
    //
    saveLastLevel('level-time.2')
    //
    // Create sound instance
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    //
    // Start background music (only if not already playing)
    // Note: kids.mp3 and time.mp3 persist across level reloads
    //
    startTimeSectionMusic(k)
    //
    // Start clock.mp3 locally (restarts on each level load for synchronization)
    //
    const clockMusic = k.play('clock', {
      loop: true,
      volume: CFG.audio.backgroundMusic.clock
    })
    //
    // Stop clock music when leaving the scene (will restart on reload for sync)
    //
    k.onSceneLeave(() => {
      clockMusic.stop()
    })
    //
    // Initialize level with heroes and platforms
    //
    const { hero, antiHero } = initScene({
      k,
      levelName: 'level-time.2',
      levelNumber: 3,
      skipPlatforms: true,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y,
      onAnnihilation: () => {
        //
        // Stop time section music before going to menu
        //
        stopTimeSectionMusic()
        //
        // Move to menu (TODO: create level 3 or time-complete scene)
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
    // Hide anti-hero initially (will appear after spawn delay)
    //
    antiHero.character.hidden = true
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
    // Create FPS counter
    //
    const fpsCounter = FpsCounter.create({ k })
    //
    // Update FPS counter
    //
    k.onUpdate(() => {
      FpsCounter.onUpdate(fpsCounter)
    })
    //
    // Create custom platforms for this level
    //
    createLevelPlatforms(k, sound)
    //
    // TODO: Add level-specific platforms, obstacles, and mechanics here
    //
    //
    // Spawn hero immediately
    //
    Hero.spawn(hero)
    //
    // Spawn anti-hero after delay
    //
    const ANTIHERO_SPAWN_DELAY = 3
    k.wait(ANTIHERO_SPAWN_DELAY, () => {
      Hero.spawn(antiHero)
    })
  })
}

/**
 * Creates basic level platforms (top, bottom, left, right walls)
 * @param {Object} k - Kaplay instance
 * @param {Object} sound - Sound instance
 */
function createLevelPlatforms(k, sound) {
  const backgroundPlatformColor = k.Color.fromHex(CFG.visual.colors.platform)
  //
  // Top platform (ceiling)
  //
  k.add([
    k.rect(k.width(), PLATFORM_TOP_HEIGHT),
    k.pos(0, 0),
    k.area(),
    k.body({ isStatic: true }),
    k.color(backgroundPlatformColor),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Bottom platform (floor)
  //
  k.add([
    k.rect(k.width(), PLATFORM_BOTTOM_HEIGHT),
    k.pos(0, k.height() - PLATFORM_BOTTOM_HEIGHT),
    k.area(),
    k.body({ isStatic: true }),
    k.color(backgroundPlatformColor),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Left wall
  //
  k.add([
    k.rect(PLATFORM_SIDE_WIDTH, k.height()),
    k.pos(0, 0),
    k.area(),
    k.body({ isStatic: true }),
    k.color(backgroundPlatformColor),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Right wall
  //
  k.add([
    k.rect(PLATFORM_SIDE_WIDTH, k.height()),
    k.pos(k.width() - PLATFORM_SIDE_WIDTH, 0),
    k.area(),
    k.body({ isStatic: true }),
    k.color(backgroundPlatformColor),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
}

