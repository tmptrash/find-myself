import * as Sound from "../utils/sound.js"
import { CFG } from "../cfg.js"
import { getRGB } from "../utils/helper.js"
import * as Hero from "../components/hero.js"
import { createLevelTransition } from "../utils/transition.js"

/**
 * Menu scene with hero in center-left
 * @param {Object} k - Kaplay instance
 */
export function sceneMenu(k) {
  k.scene("menu", () => {
    //
    // Show cursor in menu
    //
    k.canvas.style.cursor = 'default'
    
    const centerX = k.width() / 2
    const centerY = k.height() / 2
    
    //
    // Create sound instance and start audio context
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    Sound.startAmbient(sound)

    //
    // Create hero in center (using HERO type)
    //
    const heroInst = Hero.create({
      k,
      x: centerX,
      y: centerY,
      type: Hero.HEROES.HERO,
      scale: 5,
      controllable: false
    })
    
    const hero = heroInst.character
    hero.z = 10
    
    //
    // Add invisible platform under hero to prevent falling
    //
    k.add([
      k.rect(k.width(), 50),
      k.pos(0, centerY + 50),
      k.area(),
      k.body({ isStatic: true }),
      k.opacity(0),
      CFG.levels.platformName
    ])
    
    //
    // Scene instance with all state
    //
    const inst = {
      k,
      centerX,
      centerY,
      hero,
      sound,
      titleObjects: createTitle(k)
    }
    
    //
    // Background layer with animation
    //
    k.onDraw(() => drawScene(inst))
  
    //
    // Hint to start game
    //
    const startText = k.add([
      k.text("press Space or Enter to start", { size: 20 }),
      k.pos(k.width() / 2, k.height() - 50),
      k.anchor("center"),
      k.opacity(1),
      k.color(150, 150, 150), // Gray
      k.z(100)
    ])
    
    //
    // Pulsing animation for start text
    //
    k.onUpdate(() => {
      startText.opacity = 0.5 + Math.sin(k.time() * 3) * 0.5
    })
    
    //
    // Start game on space/enter
    //
    CFG.controls.startGame.forEach(key => {
      k.onKeyPress(key, () => {
        Sound.stopAmbient(sound)
        createLevelTransition(k, 'menu')
      })
    })
    
    //
    // Toggle mute
    //
    CFG.controls.toggleMute.forEach(key => {
      k.onKeyPress(key, () => {
        Sound.toggleMute(sound)
      })
    })
  })
}

/**
 * Create title objects (static, no glitch animation)
 * @param {Object} k - Kaplay instance
 * @returns {Array} Array of title objects
 */
function createTitle(k) {
  const titleY = k.height() * 0.10  // Moved higher (was 0.15)
  const titleSize = k.height() * 0.06  // Smaller size (was 0.08)
  
  const titleText = "FIND YOURSELF"
  const objects = []
  
  //
  // Create each letter as separate object
  //
  const letterSpacing = titleSize * 0.6
  const totalWidth = (titleText.length - 1) * letterSpacing
  const startX = k.width() / 2 - totalWidth / 2
  
  for (let i = 0; i < titleText.length; i++) {
    const char = titleText[i]
    const x = startX + i * letterSpacing
    
    const rgb = getRGB(k, CFG.colors.menu.titleBase)
    
    const letter = k.add([
      k.text(char, {
        size: titleSize,
        font: "jetbrains"
      }),
      k.pos(x, titleY),
      k.anchor("center"),
      k.color(rgb.r, rgb.g, rgb.b),
      k.z(100),
      k.fixed()
    ])
    
    objects.push(letter)
  }
  
  return objects
}

/**
 * Draw background scene
 * @param {Object} inst - Scene instance
 */
function drawScene(inst) {
  const { k } = inst
  
  //
  // Draw dark background
  //
  const bgRgb = getRGB(k, CFG.colors.menu.background)
  k.drawRect({
    width: k.width(),
    height: k.height(),
    pos: k.vec2(0, 0),
    color: k.rgb(bgRgb.r, bgRgb.g, bgRgb.b)
  })
}
