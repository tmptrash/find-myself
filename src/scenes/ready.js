import { CFG } from '../cfg.js'
import { getColor } from '../utils/helper.js'
import { addBackground } from '../sections/word/utils/scene.js'
import * as Sound from '../utils/sound.js'
import * as Cursor from '../utils/cursor.js'
import { goToMenuAfterAssets } from '../utils/level-assets.js'
import { drawConnectionWave } from '../utils/connection.js'
import { loadHeroSprites, HEROES } from '../components/hero.js'

//
// Hint flicker
//
const HINT_FLICKER_DURATION = 1.2
const HINT_MIN_OPACITY = 0.4
const HINT_MAX_OPACITY = 0.75
const HINT_FONT_SIZE = 20
const HINT_Y = 1042
//
// Crawling letter title
//
const INSTRUCTIONS_TITLE = 'find yourself'
const TITLE_FONT_FAMILY = "'JetBrains Mono', monospace"
const TITLE_FONT_SIZE = 54
//
// Spider configuration
//
const SPIDER_LEG_LENGTH_1 = 22
const SPIDER_LEG_LENGTH_2 = 28
const SPIDER_SPEED = 60
const SPIDER_DIRECTION_CHANGE_INTERVAL = 5.0
const SPIDER_SCREEN_MARGIN = 80
const SPIDER_SMOOTHING = 2.0
const SPIDER_APPEAR_DELAY = 5.0
const SPIDER_FADE_DURATION = 11.0
const SPIDER_MAX_OPACITY = 0.45
const SPIDER_STEP_DISTANCE = 20
const SPIDER_TURN_SPEED = 90
const SPIDER_EYE_RADIUS = 3
const SPIDER_PUPIL_RADIUS = 1.2
const SPIDER_EYE_SPACING = 10
const SPIDER_EYE_Y_OFFSET = -8
//
// Minimum time before the first spider grows its legs after the scene loads.
// Waves are staggered on top of this offset so letters never transform too early.
//
const SPIDER_LEGS_BASE_DELAY = 7.0
const TITLE_FLICKER_SPEED = 1.5
const TITLE_FLICKER_MIN = 0.7
const TITLE_FLICKER_MAX = 1.0
//
// Layout z-layers
//
const Z_BG_OVERLAY = CFG.visual.zIndex.background + 1
const Z_ILLUSTRATION = 5
const Z_TEXT = 10
const Z_TITLE = 15
const Z_SPIDER = 50
const Z_HINT = 100
//
// Left illustration (life-ready.png + hero sprite).
// Moved to the left side of the screen to free the right half for text.
//
const LIFE_X = 280
const LIFE_Y = 238
const LIFE_WIDTH = 767
const LIFE_HEIGHT = 512
const LIFE_OPACITY = 1.0
const HERO_X = 580
const HERO_Y = 765
const HERO_SPRITE_SIZE = 130
//
// Hero sprite names (loaded in index.js at game start).
// HERO_ILLUSTRATION_SPRITE_NAME uses eyes right-up (1, -1).
//
const HERO_READY_BODY_COLOR = '#909090'
//
// Anti-hero hover scale effect in the icon row
//
const ANTIHERO_HOVER_RADIUS = 42
const ANTIHERO_HOVER_BASE = 1.18
const ANTIHERO_HOVER_AMP = 0.10
const ANTIHERO_PULSE_SPEED = 2.4
const ANTIHERO_HOVER_LERP_SPEED = 8
const HERO_SPRITE_NAME = 'hero_909090_000000_0_0'
const HERO_ILLUSTRATION_SPRITE_PREFIX = 'hero_909090_000000'
const ANTIHERO_SPRITE_NAME = 'antiHero_8B5A50_000000_0_0'
//
// Illustration hero eye wander (mirrors idle animation constants from hero.js)
//
const HERO_EYE_MIN_DELAY = 1.5
const HERO_EYE_MAX_DELAY = 3.5
const HERO_EYE_LERP_SPEED = 0.1
//
// Right-column layout (illustration sits on the left, text on the right):
//   Narrative text + section icons share the same left edge (RIGHT_COLUMN_X).
//   Title is centered above the right column.
//   Narrative text is above the ground line (~y 960).
//   Section icons are below the ground line (ICON_START_Y = 942), with illustrations.
//
const RIGHT_COLUMN_X = 1400
const LEFT_COLUMN_X = RIGHT_COLUMN_X
const TEXT_LEFT = RIGHT_COLUMN_X
const TITLE_TEXT_X = 700
const TITLE_TEXT_Y = 830
const TEXT_START_Y = 380
const TEXT_FONT_SIZE = 24
const TEXT_LINE_HEIGHT = 36
const ICON_START_Y = 820
const ICON_ROW_HEIGHT = 70
//
// Icon illustration dimensions (icons sit to the LEFT of TEXT_LEFT so text aligns with narrative)
//
const ICON_DRAW_R = 13
//
// Horizontal offset from TEXT_LEFT to the icon center (negative = to the left).
//
const ICON_DRAW_CX_OFFSET = -23
//
// Extra Y to vertically centre the two-heroes pair between label and desc lines.
//
const ICON_TWO_HEROES_Y_EXTRA = 16
//
// Animated sparkle constants (matches bonus-hero glow used in time section)
//
const SPARKLE_PULSE_SPEED = 2.5
const SPARKLE_INNER_R = 5
const SPARKLE_OUTER_R = 11
const ICON_LABEL_FONT_SIZE = 20
const ICON_LABEL_DESC_FONT_SIZE = 17
const ICON_LABEL_DESC_OFFSET_Y = 22
//
// Life laugh audio: plays a short ambient laugh at random intervals.
//
//
// Inline color constants
//
const COLOR_WARM_ORANGE = '#C4874A'
const COLOR_TEXT_GRAY = '#7A8090'
//
// Approximate monospace char width multiplier (JetBrains Mono)
//
const MONO_CHAR_W_RATIO = 0.6

export function sceneReady(k) {
  k.scene('ready', async () => {
    //
    // Wait for @font-face fonts to finish loading before any canvas text sampling.
    //
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready } catch {}
    }
    //
    // Load gray hero sprites for the ready scene illustration (no arms, matching original style)
    //
    loadHeroSprites(k, HEROES.HERO, HERO_READY_BODY_COLOR, null, false, false, false)
    k.setBackground(k.Color.fromHex(CFG.visual.colors.ready.background))
    k.get("word-pile-text").forEach(obj => obj.destroy())
    k.get("word-pile-outline").forEach(obj => obj.destroy())
    k.get("flying-word").forEach(obj => obj.destroy())
    k.flyingWordsInstance = null
    Cursor.setCursor('arrow')
    const centerX = k.width() / 2
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    addBackground(k, CFG.visual.colors.ready.background)
    //
    // Background (menu-bg dark overlay)
    //
    k.add([k.pos(0, 0), k.z(Z_BG_OVERLAY), { draw() { onDrawBg(k) } }])
    //
    // Left illustration: life.png + procedural hero silhouette
    //
    //
    // Hero illustration eye wander state (starts eyes right-up, matching the sprite prefix)
    //
    const illAnim = {
      eyeX: 1,
      eyeY: -1,
      targetEyeX: 1,
      targetEyeY: -1,
      eyeTimer: 0,
      eyeNextSwitch: HERO_EYE_MIN_DELAY + Math.random() * (HERO_EYE_MAX_DELAY - HERO_EYE_MIN_DELAY)
    }
    k.add([k.pos(0, 0), k.z(Z_ILLUSTRATION), { draw() { onDrawIllustration(k, illAnim) } }])
    //
    // Left text column (narrative text, starts at LEFT_COLUMN_X)
    //
    addTextPanel(k, LEFT_COLUMN_X, TEXT_START_Y)
    //
    // Animated icon state: sparkle pulse, electric heartbeat, life laugh flash.
    //
    const iconAnim = {
      sparklePhase: 0,
      heartbeatPhase: 0,
      //
      // Anti-hero hover: lerps toward a sine-wave target when mouse is near the icon
      //
      antiHeroScale: 1.0,
      antiHeroTargetScale: 1.0,
      antiHeroPulsePhase: 0.0
    }
    k.onUpdate(() => {
      const dt = k.dt()
      //
      // Hero illustration eye wander
      //
      illAnim.eyeTimer += dt
      if (illAnim.eyeTimer >= illAnim.eyeNextSwitch) {
        illAnim.targetEyeX = k.choose([-1, 0, 1])
        illAnim.targetEyeY = k.choose([-1, 0, 1])
        illAnim.eyeTimer = 0
        illAnim.eyeNextSwitch = HERO_EYE_MIN_DELAY + Math.random() * (HERO_EYE_MAX_DELAY - HERO_EYE_MIN_DELAY)
      }
      illAnim.eyeX = k.lerp(illAnim.eyeX, illAnim.targetEyeX, HERO_EYE_LERP_SPEED)
      illAnim.eyeY = k.lerp(illAnim.eyeY, illAnim.targetEyeY, HERO_EYE_LERP_SPEED)
      iconAnim.sparklePhase += dt * SPARKLE_PULSE_SPEED
      iconAnim.heartbeatPhase = (iconAnim.heartbeatPhase + dt) % 1
      //
      // Anti-hero hover: detect mouse proximity, set target scale, lerp smoothly
      //
      const iconX = TEXT_LEFT + ICON_DRAW_CX_OFFSET
      const twoHeroY = ICON_START_Y + ICON_ROW_HEIGHT + ICON_DRAW_R * 0.6 + ICON_TWO_HEROES_Y_EXTRA
      const r = ICON_DRAW_R
      const antiHeroCX = iconX + r * 0.85
      const antiHeroCY = twoHeroY - r * 0.85 * 0.35
      const mp = k.mousePos()
      const dx = mp.x - antiHeroCX
      const dy = mp.y - antiHeroCY
      const distSq = dx * dx + dy * dy
      //
      // When hovering, advance pulse phase and oscillate the target scale like the
      // checkmark / red circle in the menu; when not hovering, return to 1.0
      //
      const isHovering = distSq < ANTIHERO_HOVER_RADIUS * ANTIHERO_HOVER_RADIUS
      if (isHovering) {
        iconAnim.antiHeroPulsePhase += dt * ANTIHERO_PULSE_SPEED
        iconAnim.antiHeroTargetScale = ANTIHERO_HOVER_BASE + ANTIHERO_HOVER_AMP * Math.sin(iconAnim.antiHeroPulsePhase)
      } else {
        iconAnim.antiHeroTargetScale = 1.0
      }
      iconAnim.antiHeroScale += (iconAnim.antiHeroTargetScale - iconAnim.antiHeroScale) * Math.min(1, ANTIHERO_HOVER_LERP_SPEED * dt)
    })
    //
    // Icon illustrations beside each section label
    //
    k.add([k.pos(0, 0), k.z(Z_TEXT), { draw() { onDrawIconIllustrations(k, iconAnim) } }])
    //
    // Section labels below the ground line
    //
    addIconLabels(k, TEXT_LEFT)
    //
    // Title text (crawling letters detach from this)
    //
    const outlineOffsets = [[-2,-2],[0,-2],[2,-2],[-2,0],[2,0],[-2,2],[0,2],[2,2]]
    const titleOutlines = []
    outlineOffsets.forEach(([dx, dy]) => {
      titleOutlines.push(k.add([
        k.text(INSTRUCTIONS_TITLE, { size: TITLE_FONT_SIZE, font: TITLE_FONT_FAMILY }),
        k.pos(TITLE_TEXT_X + dx, TITLE_TEXT_Y + dy),
        k.anchor('center'),
        k.color(0, 0, 0),
        k.opacity(1),
        k.z(Z_TITLE)
      ]))
    })
    const titleText = k.add([
      k.text(INSTRUCTIONS_TITLE, { size: TITLE_FONT_SIZE, font: TITLE_FONT_FAMILY }),
      k.pos(TITLE_TEXT_X, TITLE_TEXT_Y),
      k.anchor('center'),
      getColor(k, CFG.visual.colors.ready.title),
      k.opacity(1),
      k.z(Z_TITLE)
    ])
    //
    // Hint text
    //
    const hintOutlineOffsets = [[-2,0],[2,0],[0,-2],[0,2],[-1,-1],[1,-1],[-1,1],[1,1]]
    const hintOutlines = []
    hintOutlineOffsets.forEach(([dx, dy]) => {
      hintOutlines.push(k.add([
        k.text('press Space, Enter or click to start', { size: HINT_FONT_SIZE }),
        k.pos(centerX + dx, HINT_Y + dy),
        k.anchor('center'),
        k.color(0, 0, 0),
        k.opacity(1),
        k.z(Z_HINT - 1)
      ]))
    })
    const hint = k.add([
      k.text('press Space, Enter or click to start', { size: HINT_FONT_SIZE }),
      k.pos(centerX, HINT_Y),
      k.anchor('center'),
      getColor(k, CFG.visual.colors.ready.hint),
      k.opacity(1),
      k.z(Z_HINT)
    ])
    //
    // Create crawling letter spiders from the title
    //
    const letterInfos = pickLettersFromTitle(k, titleText, INSTRUCTIONS_TITLE, TITLE_FONT_SIZE, TITLE_FONT_FAMILY)
    const spiders = []
    const spiderState = { timer: 0 }
    //
    // "find yourself" has 13 non-space letters.
    // Five waves spread them so they appear far apart.
    //
    const waves = [[0, 5, 10, 15], [2, 7, 12, 17], [1, 6, 11, 16], [3, 8, 13], [4, 9, 14]]
    const LEG_APPEAR_DURATION = 2.0
    const CRAWL_DURATION = 5.0
    const WAVE_INTERVAL = LEG_APPEAR_DURATION + CRAWL_DURATION
    letterInfos.forEach((letterInfo, i) => {
      const spider = createSpider(k, i, letterInfo)
      let waveIndex = 0
      for (let w = 0; w < waves.length; w++) {
        if (waves[w].includes(i)) { waveIndex = w; break }
        }
      spider.legAppearDelay = SPIDER_LEGS_BASE_DELAY + waveIndex * WAVE_INTERVAL + Math.random() * 0.3
      spider.letterInfo = letterInfo
      spider.titleOutlines = titleOutlines
      spiders.push(spider)
    })
    let hintFlickerTime = HINT_FLICKER_DURATION
    let hintDirection = -1
    let titleFlickerPhase = 0
    k.onUpdate(() => {
      const dt = k.dt()
      spiderState.timer += dt
      spiders.forEach(spider => updateSpider(k, spider, dt, SPIDER_MAX_OPACITY, true))
      //
      // Hint flicker
      //
      hintFlickerTime += dt * hintDirection
      if (hintFlickerTime >= HINT_FLICKER_DURATION) {
        hintDirection = -1
        hintFlickerTime = HINT_FLICKER_DURATION
      } else if (hintFlickerTime <= 0) {
        hintDirection = 1
        hintFlickerTime = 0
      }
      const hintOp = HINT_MIN_OPACITY + (HINT_MAX_OPACITY - HINT_MIN_OPACITY) * (hintFlickerTime / HINT_FLICKER_DURATION)
      hint.opacity = hintOp
      hintOutlines.forEach(o => o.opacity = hintOp)
      //
      // Title subtle flicker
      //
      titleFlickerPhase += dt * TITLE_FLICKER_SPEED
      const titleFlicker = TITLE_FLICKER_MIN + (TITLE_FLICKER_MAX - TITLE_FLICKER_MIN) * (0.5 + 0.5 * Math.sin(titleFlickerPhase))
      titleText.opacity = titleFlicker
      titleOutlines.forEach(o => o.opacity = titleFlicker)
    })
    //
    // Spider draw layer — rendered above all text and title (Z_SPIDER)
    //
    k.add([k.pos(0, 0), k.z(Z_SPIDER), { draw() { onDrawSpidersLayer(k, spiders, spiderState) } }])
    //
    // Controls
    //
    const exitToMenu = () => {
      Sound.stopAmbient(sound)
      goToMenuAfterAssets(k)
    }
    CFG.controls.startGame.forEach(key => k.onKeyPress(key, exitToMenu))
    CFG.controls.backToMenu.forEach(key => k.onKeyPress(key, exitToMenu))
    k.onClick(exitToMenu)
  })
}
//
// Draws the darkened background image
//
function onDrawBg(k) {
  k.drawSprite({
    sprite: "menu-bg",
    width: k.width(),
    height: k.height(),
    opacity: 0.5
  })
}
//
// Draws the center illustration: life-ready.png as the creature + hero sprite overlaid in front.
// illAnim carries the current eye wander state for the hero sprite.
//
function onDrawIllustration(k, illAnim) {
  //
  // life-ready.png: fully opaque, reduced size, positioned next to the hero
  //
  k.drawSprite({
    sprite: "life-ready",
    pos: k.vec2(LIFE_X, LIFE_Y),
    width: LIFE_WIDTH,
    height: LIFE_HEIGHT,
    opacity: LIFE_OPACITY
  })
  //
  // Hero sprite with animated eyes (idle wander matching hero.js behaviour)
  //
  const eyeX = Math.round(illAnim.eyeX)
  const eyeY = Math.round(illAnim.eyeY)
  k.drawSprite({
    sprite: `${HERO_ILLUSTRATION_SPRITE_PREFIX}_${eyeX}_${eyeY}`,
    pos: k.vec2(HERO_X - HERO_SPRITE_SIZE / 2, HERO_Y - HERO_SPRITE_SIZE),
    width: HERO_SPRITE_SIZE,
    height: HERO_SPRITE_SIZE,
    opacity: 1.0
  })
}
//
// Adds the left-column narrative text at 24px with black outline.
// Describes all six worlds and the player's goal.
// Key words are colored (time/touch in orange, Life in red).
//
function addTextPanel(k, leftX, startY) {
  const z = Z_TEXT
  const s = TEXT_FONT_SIZE
  const lh = TEXT_LINE_HEIGHT
  const font = "'JetBrains Mono Thin', 'JetBrains Mono', monospace"
  //
  // Helper: segment with black outline then warm-orange text
  //
  const seg = (text, x, y) => addSegment(k, text, x, y, z, s, font, COLOR_TEXT_GRAY)
  //
  // Block 1 (5 lines): six worlds intro
  //
  const l1y = startY
  seg('Six worlds await you.', leftX, l1y)
  seg('Time, touch, and words,', leftX, l1y + lh)
  seg('feelings, mind, and stress.', leftX, l1y + lh * 2)
  seg('Each hides a piece of your', leftX, l1y + lh * 3)
  seg('scattered identity within.', leftX, l1y + lh * 4)
  //
  // Block 2 (4 lines, after gap): gameplay and goal
  //
  const l6y = l1y + lh * 5 + 14
  seg('Platform, jump, survive.', leftX, l6y)
  seg('Collect every lost fragment.', leftX, l6y + lh)
  seg('Find your shadow self.', leftX, l6y + lh * 2)
  seg('You play against Life —', leftX, l6y + lh * 3)
  seg('know yourself to win.', leftX, l6y + lh * 4)
}
//
// Adds the three section label rows below the ground line.
// All labels share COLOR_WARM_ORANGE; icons are drawn by onDrawIconIllustrations.
//
function addIconLabels(k, leftX) {
  const z = Z_TEXT
  const labelFont = "'JetBrains Mono', monospace"
  const descFont = "'JetBrains Mono Thin', 'JetBrains Mono', monospace"
  const rows = [
    { label: 'Collect fragments', desc: 'Pieces of you. Scattered everywhere.' },
    { label: 'Find the other peaces of you', desc: 'Touch them. Know them.' }
  ]
  rows.forEach((row, i) => {
    const rowY = ICON_START_Y + i * ICON_ROW_HEIGHT
    addSegment(k, row.label, leftX, rowY, z, ICON_LABEL_FONT_SIZE, labelFont, COLOR_WARM_ORANGE)
    addSegment(k, row.desc, leftX, rowY + ICON_LABEL_DESC_OFFSET_Y, z, ICON_LABEL_DESC_FONT_SIZE, descFont, COLOR_TEXT_GRAY)
  })
}
//
// Draws the three small icon illustrations to the LEFT of TEXT_LEFT so text starts
// at the same x as the narrative column above.
//
function onDrawIconIllustrations(k, iconAnim) {
  const iconX = TEXT_LEFT + ICON_DRAW_CX_OFFSET
  //
  // Icon 1: "Collect fragments" — animated sun-bunny sparkle glow
  //
  drawFragmentIcon(k, iconX, ICON_START_Y + ICON_DRAW_R * 0.6, iconAnim.sparklePhase)
  //
  // Icon 2: "Find the other you" — hero + anti-hero with electric connection
  //
  drawTwoHeroesIcon(k, iconX, ICON_START_Y + ICON_ROW_HEIGHT + ICON_DRAW_R * 0.6 + ICON_TWO_HEROES_Y_EXTRA, iconAnim)
}
//
// Icon 1: animated sun-bunny sparkle — outer glow + bright core pulse
//
function drawFragmentIcon(k, cx, cy, sparklePhase) {
  const pulse = 0.5 + 0.5 * Math.abs(Math.sin(sparklePhase))
  const glintColor = k.rgb(255, 255, 220)
  const r = SPARKLE_INNER_R * (0.6 + pulse * 0.4)
  //
  // Soft outer glow
  //
  k.drawCircle({ pos: k.vec2(cx, cy), radius: SPARKLE_OUTER_R * pulse, color: glintColor, opacity: 0.15 * pulse })
  //
  // Bright core
  //
  k.drawCircle({ pos: k.vec2(cx, cy), radius: r, color: glintColor, opacity: 0.85 * pulse })
}
//
// Icon 2: hero + anti-hero sprites with animated electric connection
//
function drawTwoHeroesIcon(k, cx, cy, iconAnim) {
  const { heartbeatPhase, antiHeroScale } = iconAnim
  const r = ICON_DRAW_R
  const hh = r * 0.85
  //
  // Wider spacing so the arc gap between the two sprites is clearly visible.
  //
  const spacing = r * 0.85
  const spSize = hh * 2.2
  const midY = cy - hh * 0.35
  //
  // Connection drawn FIRST (underneath sprites) so the sprites render on top
  // and cover the faded lightning endpoints — no visible gap between arc and bodies.
  // Endpoints at each sprite center so the connection clearly starts inside each body.
  //
  drawConnectionWave(k,
    { x: cx - spacing, y: midY },
    { x: cx + spacing, y: midY },
    { segmentWidth: 5, mainWidth: 1.8, opacity: 0.55, heartbeatPhase }
  )
  //
  // Hero sprite (left) — drawn after connection to overlap faded arc ends
  //
  k.drawSprite({
    sprite: HERO_SPRITE_NAME,
    pos: k.vec2(cx - spacing - spSize / 2, cy - spSize * 0.9),
    width: spSize,
    height: spSize,
    opacity: 0.9
  })
  //
  // Anti-hero sprite (right) with hover scale effect
  //
  const ahSize = spSize * antiHeroScale
  k.drawSprite({
    sprite: ANTIHERO_SPRITE_NAME,
    pos: k.vec2(cx + spacing - ahSize / 2, cy - ahSize * 0.9),
    width: ahSize,
    height: ahSize,
    opacity: 0.9
  })
}
//
// ────────── Spider / crawling letters system ──────────
//

/**
 * Creates a spider from a specific letter in a text object
 * @param {Object} k - Kaplay instance
 * @param {number} index - Spider index
 * @param {Object} sourceInfo - Info about source letter {char, x, y, color, fontSize, fontFamily}
 * @returns {Object} Spider instance
 */
function createSpider(k, index, sourceInfo) {
  const { char, x, y, color, fontSize, fontFamily } = sourceInfo
  const angle = Math.random() * Math.PI * 2
  const speed = SPIDER_SPEED * (0.5 + Math.random() * 0.5)
  const baseAngleOffset = Math.random() * Math.PI * 2
  const legAngles = [
    -Math.PI * 0.8, -Math.PI * 0.6, -Math.PI * 0.4, -Math.PI * 0.2,
    Math.PI * 0.2, Math.PI * 0.4, Math.PI * 0.6, Math.PI * 0.8
  ]
  const legs = legAngles.map((baseAngle, i) => {
    const side = i < 4 ? -1 : 1
    const reach = SPIDER_LEG_LENGTH_1 + SPIDER_LEG_LENGTH_2
    const randomizedAngle = baseAngle + baseAngleOffset
    const footX = x + Math.cos(randomizedAngle) * reach * 0.8
    const footY = y + Math.sin(randomizedAngle) * reach * 0.8
    return {
      baseAngle: randomizedAngle,
      side,
      footX,
      footY,
      targetFootX: footX,
      targetFootY: footY,
      isStepping: false,
      stepProgress: 0,
      stepStartX: footX,
      stepStartY: footY,
      phaseOffset: (i % 2) * Math.PI
    }
  })
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    targetVx: Math.cos(angle) * speed,
    targetVy: Math.sin(angle) * speed,
    speed,
    directionTimer: Math.random() * SPIDER_DIRECTION_CHANGE_INTERVAL,
    legs,
    distanceTraveled: 0,
    color,
    appearDelay: index * 0.15,
    legAppearDelay: 0,
    legAppearTimer: 0,
    letter: char,
    letterSize: fontSize,
    letterFont: fontFamily,
    isActivated: false,
    legExtendT: 0,
    displayAngle: 0,
    charHidden: false,
    letterInfo: null,
    titleOutlines: null,
    targetReturnX: undefined,
    targetReturnY: undefined,
    startReturnX: undefined,
    startReturnY: undefined,
    targetRotation: 0,
    currentRotation: 0,
    legsHidden: false,
    settled: false
  }
}

/**
 * Picks all letters from the title text object and returns position info.
 * @param {Object} k - Kaplay instance
 * @param {Object} titleTextObj - Title text object
 * @param {string} titleString - Title string
 * @param {number} fontSize - Font size
 * @param {string} fontFamily - Font family
 * @returns {Array} Array of letter info objects
 */
function pickLettersFromTitle(k, titleTextObj, titleString, fontSize, fontFamily) {
  const letterInfos = []
  const charWidth = fontSize * MONO_CHAR_W_RATIO
  //
  // titleTextObj uses anchor('center'), so pos.x is the CENTER of the string.
  // Subtract half the total string width to get the true left edge.
  //
  const totalStringWidth = titleString.length * charWidth
  const startX = titleTextObj.pos.x - totalStringWidth / 2
  const brighterColor = k.rgb(245, 110, 110)
  titleString.split('').forEach((char, charIndex) => {
    if (char.trim().length === 0) return
    const charX = startX + (charIndex * charWidth) + (charWidth / 2)
    const charY = titleTextObj.pos.y
    letterInfos.push({
      textObj: titleTextObj,
      charIndex,
      char,
      x: charX,
      y: charY,
      color: brighterColor,
      fontSize,
      fontFamily
    })
  })
  return letterInfos
}

/**
 * Updates spider position, leg timers and activation.
 * @param {Object} k - Kaplay instance
 * @param {Object} spider - Spider instance
 * @param {number} dt - Delta time
 * @param {number} opacity - Current global opacity (drives leg appear timer)
 * @param {boolean} allowFullScreen - If true spiders roam the whole screen
 */
function updateSpider(k, spider, dt, opacity, allowFullScreen) {
  if (opacity > 0) {
    spider.legAppearTimer += dt
  }
  const legAppearTimeElapsed = spider.legAppearTimer - spider.legAppearDelay
  if (legAppearTimeElapsed > 0 && spider.legExtendT < 1) {
    const LEG_GROW_DURATION = 2.0
    spider.legExtendT = Math.min(1, legAppearTimeElapsed / LEG_GROW_DURATION)
  }
  if (!spider.isActivated && spider.legExtendT >= 1) {
    spider.isActivated = true
    if (spider.letterInfo && spider.letterInfo.textObj) {
      spider.color = spider.letterInfo.textObj.color
    }
    if (spider.letterInfo && !spider.charHidden) {
      const { textObj, charIndex } = spider.letterInfo
      const chars = textObj.text.split('')
      chars[charIndex] = ' '
      textObj.text = chars.join('')
      const outlinesToUpdate = textObj.outlines || spider.titleOutlines
      outlinesToUpdate && outlinesToUpdate.forEach(outline => {
          outline.text = textObj.text
        })
      spider.charHidden = true
    }
  }
  if (!spider.isActivated) return
  //
  // Random movement (no return-to-title in the new scene design)
    //
    spider.directionTimer -= dt
    if (spider.directionTimer <= 0) {
      const newAngle = Math.random() * Math.PI * 2
      spider.targetVx = Math.cos(newAngle) * spider.speed
      spider.targetVy = Math.sin(newAngle) * spider.speed
      spider.directionTimer = SPIDER_DIRECTION_CHANGE_INTERVAL * (0.5 + Math.random())
    }
  const smoothing = SPIDER_SMOOTHING * dt
  spider.vx += (spider.targetVx - spider.vx) * smoothing
  spider.vy += (spider.targetVy - spider.vy) * smoothing
  const speed = Math.sqrt(spider.vx * spider.vx + spider.vy * spider.vy)
  if (speed > 1) {
    const targetAngleDeg = Math.atan2(spider.vy, spider.vx) * (180 / Math.PI)
    let diff = targetAngleDeg - spider.displayAngle
    while (diff > 180) diff -= 360
    while (diff < -180) diff += 360
    const maxTurn = SPIDER_TURN_SPEED * dt
    spider.displayAngle += Math.max(-maxTurn, Math.min(maxTurn, diff))
  }
  const oldX = spider.x
  const oldY = spider.y
  spider.x += spider.vx * dt
  spider.y += spider.vy * dt
  const dx = spider.x - oldX
  const dy = spider.y - oldY
  spider.distanceTraveled += Math.sqrt(dx * dx + dy * dy)
  //
  // Screen bounds
  //
  const minX = SPIDER_SCREEN_MARGIN
  const maxX = k.width() - SPIDER_SCREEN_MARGIN
  const minY = SPIDER_SCREEN_MARGIN
  const maxY = allowFullScreen ? k.height() - SPIDER_SCREEN_MARGIN : TITLE_TEXT_Y + 80
  if (spider.x < minX) { spider.x = minX; spider.targetVx = Math.abs(spider.targetVx); spider.vx = Math.abs(spider.vx) * 0.5 }
  else if (spider.x > maxX) { spider.x = maxX; spider.targetVx = -Math.abs(spider.targetVx); spider.vx = -Math.abs(spider.vx) * 0.5 }
  if (spider.y < minY) { spider.y = minY; spider.targetVy = Math.abs(spider.targetVy); spider.vy = Math.abs(spider.vy) * 0.5 }
  else if (spider.y > maxY) { spider.y = maxY; spider.targetVy = -Math.abs(spider.targetVy); spider.vy = -Math.abs(spider.vy) * 0.5 }
  //
  // Leg stepping
  //
  const movementAngle = Math.atan2(spider.vy, spider.vx)
  const reach = SPIDER_LEG_LENGTH_1 + SPIDER_LEG_LENGTH_2
  const maxReach = reach * 0.85
  spider.legs.forEach((leg, i) => {
    const adjustedAngle = leg.baseAngle + movementAngle
    const idealX = spider.x + Math.cos(adjustedAngle) * reach * 0.6
    const idealY = spider.y + Math.sin(adjustedAngle) * reach * 0.6
    const footDx = idealX - leg.footX
    const footDy = idealY - leg.footY
    const footDist = Math.sqrt(footDx * footDx + footDy * footDy)
    const bodyDx = leg.footX - spider.x
    const bodyDy = leg.footY - spider.y
    const bodyDist = Math.sqrt(bodyDx * bodyDx + bodyDy * bodyDy)
    const needsStep = footDist > SPIDER_STEP_DISTANCE || bodyDist > maxReach
    if (!leg.isStepping && needsStep) {
      const phase = Math.floor(spider.distanceTraveled / SPIDER_STEP_DISTANCE) % 2
      const shouldStep = (i % 2 === 0) !== (phase === 0) || bodyDist > maxReach
      if (shouldStep) {
        leg.isStepping = true
        leg.stepProgress = 0
        leg.stepStartX = leg.footX
        leg.stepStartY = leg.footY
        leg.targetFootX = idealX
        leg.targetFootY = idealY
      }
    }
    if (leg.isStepping) {
      leg.stepProgress += dt * 10
      if (leg.stepProgress >= 1) {
        leg.stepProgress = 1
        leg.isStepping = false
        leg.footX = leg.targetFootX
        leg.footY = leg.targetFootY
      } else {
        const t = leg.stepProgress
        const arc = Math.sin(t * Math.PI) * 4
        leg.footX = leg.stepStartX + (leg.targetFootX - leg.stepStartX) * t
        leg.footY = leg.stepStartY + (leg.targetFootY - leg.stepStartY) * t - arc
      }
    }
  })
}

/**
 * Draws all spiders on the Z_SPIDER layer.
 * Called each frame by the k.add draw callback registered with k.z(Z_SPIDER).
 * @param {Object} k - Kaplay instance
 * @param {Array} spiders - Array of spider instances
 * @param {Object} spiderState - Mutable state carrying the scene timer
 */
function onDrawSpidersLayer(k, spiders, spiderState) {
  const { timer } = spiderState
  spiders.forEach(spider => {
    let spiderOpacity = 0
    const timeToAppear = SPIDER_APPEAR_DELAY + spider.appearDelay
    if (timer > timeToAppear) {
      spiderOpacity = Math.min(1, (timer - timeToAppear) / SPIDER_FADE_DURATION) * SPIDER_MAX_OPACITY
    }
    drawSpider(k, spider, spiderOpacity)
  })
}
/**
 * Draws a spider (legs + letter body + eyes).
 * @param {Object} k - Kaplay instance
 * @param {Object} spider - Spider instance
 * @param {number} textOpacity - Opacity for the spider
 */
function drawSpider(k, spider, textOpacity) {
  if (spider.legExtendT > 0 && !spider.legsHidden) {
    const legColor = k.rgb(12, 10, 14)
    const legOpacity = spider.charHidden ? SPIDER_MAX_OPACITY : (textOpacity > 0 ? Math.min(textOpacity, SPIDER_MAX_OPACITY) : 0)
    if (legOpacity > 0) {
    spider.legs.forEach(leg => {
        const effFootX = spider.x + (leg.footX - spider.x) * spider.legExtendT
        const effFootY = spider.y + (leg.footY - spider.y) * spider.legExtendT
      const { jointX, jointY } = solveIK(
          spider.x, spider.y, effFootX, effFootY,
          SPIDER_LEG_LENGTH_1, SPIDER_LEG_LENGTH_2, leg.side
        )
        k.drawLine({ p1: k.vec2(spider.x, spider.y), p2: k.vec2(jointX, jointY), width: 2, color: legColor, opacity: legOpacity })
        k.drawLine({ p1: k.vec2(jointX, jointY), p2: k.vec2(effFootX, effFootY), width: 2, color: legColor, opacity: legOpacity })
        k.drawCircle({ pos: k.vec2(jointX, jointY), radius: 1, color: legColor, opacity: legOpacity })
      })
    }
  }
  if (spider.charHidden) {
    const angleDeg = spider.displayAngle
      spider.currentRotation = angleDeg
    k.pushTransform()
    k.pushTranslate(spider.x, spider.y)
    k.pushRotate(angleDeg)
    const outlineOffsets = [[-2,-2],[0,-2],[2,-2],[-2,0],[2,0],[-2,2],[0,2],[2,2]]
    outlineOffsets.forEach(([dx, dy]) => {
      k.drawText({
        text: spider.letter,
        size: spider.letterSize,
        pos: k.vec2(dx, dy),
        anchor: 'center',
        color: k.rgb(0, 0, 0),
        opacity: 1.0,
        font: spider.letterFont
      })
    })
    k.drawText({
      text: spider.letter,
      size: spider.letterSize,
      pos: k.vec2(0, 0),
      anchor: 'center',
      color: spider.color,
      opacity: 1.0,
      font: spider.letterFont
    })
    drawSpiderEyes(k, spider, angleDeg)
    k.popTransform()
  }
}
//
// Draws two small eyes on the letter body, pupils tracking movement direction.
//
function drawSpiderEyes(k, spider, angleDeg) {
  if (spider.settled) return
  if (spider.legExtendT < 0.3) return
  const eyeOpacity = Math.min(1, (spider.legExtendT - 0.3) / 0.4)
  const scleraColor = k.rgb(220, 220, 210)
  const pupilColor = k.rgb(15, 8, 8)
  const lx = -SPIDER_EYE_SPACING / 2
  const rx = SPIDER_EYE_SPACING / 2
  const ey = SPIDER_EYE_Y_OFFSET
  const velAngle = Math.atan2(spider.vy, spider.vx)
  const localAngle = velAngle - angleDeg * (Math.PI / 180)
  const maxPupilOffset = SPIDER_EYE_RADIUS - SPIDER_PUPIL_RADIUS - 0.5
  const px = Math.cos(localAngle) * maxPupilOffset
  const py = Math.sin(localAngle) * maxPupilOffset
  k.drawCircle({ pos: k.vec2(lx, ey), radius: SPIDER_EYE_RADIUS, color: scleraColor, opacity: eyeOpacity })
  k.drawCircle({ pos: k.vec2(lx + px, ey + py), radius: SPIDER_PUPIL_RADIUS, color: pupilColor, opacity: eyeOpacity })
  k.drawCircle({ pos: k.vec2(rx, ey), radius: SPIDER_EYE_RADIUS, color: scleraColor, opacity: eyeOpacity })
  k.drawCircle({ pos: k.vec2(rx + px, ey + py), radius: SPIDER_PUPIL_RADIUS, color: pupilColor, opacity: eyeOpacity })
}

/**
 * Solves 2-segment IK for a spider leg.
 * @param {number} baseX - Body X
 * @param {number} baseY - Body Y
 * @param {number} targetX - Foot X
 * @param {number} targetY - Foot Y
 * @param {number} len1 - First segment length
 * @param {number} len2 - Second segment length
 * @param {number} side - Bend direction (-1 or 1)
 * @returns {{ jointX: number, jointY: number }}
 */
function solveIK(baseX, baseY, targetX, targetY, len1, len2, side) {
  const dx = targetX - baseX
  const dy = targetY - baseY
  let dist = Math.sqrt(dx * dx + dy * dy)
  const maxReach = len1 + len2 - 0.1
  const minReach = Math.abs(len1 - len2) + 0.1
  dist = Math.max(minReach, Math.min(maxReach, dist))
  const angleToTarget = Math.atan2(dy, dx)
  const cosAngle1 = (dist * dist + len1 * len1 - len2 * len2) / (2 * dist * len1)
  const angle1 = Math.acos(Math.max(-1, Math.min(1, cosAngle1)))
  const jointAngle = angleToTarget + angle1 * side
  const jointX = baseX + Math.cos(jointAngle) * len1
  const jointY = baseY + Math.sin(jointAngle) * len1
  return { jointX, jointY }
}
//
// Adds a text segment with 4-corner black outline (1px offset) then the colored text on top.
// Used by addTextPanel and addIconLabels to give body text a readable dark stroke.
//
function addSegment(k, text, x, y, z, size, font, colorHex) {
  const offsets = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
  offsets.forEach(([dx, dy]) => {
    k.add([
      k.text(text, { size, font }),
      k.pos(x + dx, y + dy),
      k.anchor('left'),
      k.color(0, 0, 0),
      k.z(z - 1)
    ])
  })
  return k.add([
    k.text(text, { size, font }),
    k.pos(x, y),
    k.anchor('left'),
    getColor(k, colorHex),
    k.z(z)
  ])
}
