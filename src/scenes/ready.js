import { CFG } from '../cfg.js'
import { getColor, getRGB } from '../utils/helper.js'
import { addBackground } from '../sections/word/utils/scene.js'

export function sceneReady(k) {
  k.scene("ready", () => {
    const centerX = k.width() / 2
    const centerY = k.height() / 2
    
    // Draw background
    addBackground(k, CFG.colors.ready.background)
    
    // Title
    k.add([
      k.text("FIND MYSELF", { size: 64 }),
      k.pos(centerX, 100),
      k.anchor("center"),
      getColor(k, CFG.colors.ready.title),
    ])
    
    // Story text
    const storyLines = [
      "Life laughs at your plans.",
      "Rules bend, promises break, logic fails.",
      "You move forward — and the floor disappears.",
      "You wait — and time devours you.",
      "Every step, every mistake — a reflection of yourself.",
      "You are searching for what's left of you.",
      "Fragments scattered across twisted worlds:",
      "words that cut, memories that fade,",
      "touches that burn, time that slips away.",
      "Each world hides a piece of who you are.",
      "Each encounter teaches — and hurts.",
      "When you find yourself, you absorb your other half…",
      "and the world changes again.",
      "Because finding yourself",
      "means surviving every version of you...",
    ]
    
    const lineHeight = 34
    const startY = centerY - (storyLines.length * lineHeight) / 2 + 20
    
    storyLines.forEach((line, index) => {
      k.add([
        k.text(line, { size: 26, align: "center" }),
        k.pos(centerX, startY + index * lineHeight),
        k.anchor("center"),
        getColor(k, CFG.colors.ready.text),
      ])
    })
    
    // Hint at bottom
    k.add([
      k.text('press Space or Enter to start', { size: 20 }),
      k.pos(centerX, k.height() - 80),
      k.anchor("center"),
      getColor(k, CFG.colors.ready.hint),
    ])
    
    //
    // Press space/enter to start
    //
    CFG.controls.startGame.forEach(key => {
      k.onKeyPress(key, () => {
        k.go("menu")
      })
    })
    
    //
    // Click anywhere to start (same as space/enter)
    //
    k.onClick(() => {
      k.go("menu")
    })
  })
}
