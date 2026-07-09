import * as Sound from "../utils/sound.js"
import { CFG } from "../cfg.js"
import { getRGB, parseHex } from "../utils/helper.js"
import * as Hero from "../components/hero.js"
import { createLevelTransition, showTransitionToLevel } from "../utils/transition.js"
import { normalizeSceneName } from "../utils/progress.js"
import { goAfterPreparingAssets } from "../utils/lesson-assets.js"
import { getProgress, get, set, resetProgress } from "../utils/progress.js"
import { drawConnectionWave } from "../utils/connection.js"
import * as Particles from "../utils/particles.js"
import * as Cursor from "../utils/cursor.js"
import * as CanvasBackdrop from "../utils/canvas-backdrop.js"
import { renderHintWithEnter } from "../utils/touch-tap-button.js"
import * as Grass from '../components/grass.js'
import {
  generateMenuBackgroundCanvas,
  MENU_BG_GROUND_Y,
  MENU_BG_HORIZON_LINE_HEIGHT,
  MENU_BG_CANVAS_W,
  MENU_BG_CANVAS_H
} from '../utils/menu-bg-generator.js'
//
// Section colors configuration (body color only, outline is always black)
// All colors are imported from global config (CFG.visual.colors.sections)
//
const SECTION_COLORS = {
  glow: CFG.visual.colors.sections.glow,
  word: CFG.visual.colors.sections.word,
  touch: CFG.visual.colors.sections.touch,
  feel: CFG.visual.colors.sections.feel,
  mind: CFG.visual.colors.sections.mind,
  time: CFG.visual.colors.sections.time
}
//
// Section hover descriptions (shown on floating title when hovering over anti-hero)
//
const SECTION_DESCRIPTIONS = {
  glow: 'color perception',
  time: 'time sense',
  word: 'inner voices',
  touch: 'physical contact',
  feel: 'emotions',
  mind: 'intellect'
}
//
// Background fade transition speed (higher = faster)
//
const BG_FADE_SPEED = 3.0
//
// Combined static background — ONE baked full-screen image holding the
// black base and the darkened menu-bg picture (moon, tree layers, rocks,
// roots, mushrooms), drawn as a single sprite per frame. Baked lazily once
// per session; re-entering the menu reuses the loaded sprite.
//
const MENU_STATIC_SPRITE = 'menu-static-bg'
const MENU_BG_BASE_OPACITY = 0.35
//
// Full-screen sprites live in a texture atlas: linear sampling at the very
// edge rows pulls in neighbour texels, which reads as thin horizontal lines
// at the top/bottom of the canvas. Drawing the sprite overscanned by one
// pixel pushes those edge rows off-screen.
//
const MENU_BG_EDGE_OVERSCAN = 1
//
// Swaying grass along the menu-bg horizon — the shared Grass component with
// the same density principle the ready scene uses: the further from the
// screen centre, the more tufts. The tint fades with the background when an
// anti-hero is hovered.
//
const MENU_GRASS_TUFT_COUNT = 44
const MENU_GRASS_EDGE_INSET = 30
//
// The density ramp spans the FULL half-width of the canvas, so the tuft
// probability keeps growing all the way to the screen edges instead of
// saturating partway out.
//
const MENU_GRASS_DENSITY_RAMP = MENU_BG_CANVAS_W / 2 - MENU_GRASS_EDGE_INSET
//
// The blades take the SAME tone as the near-row glow-forest foliage: the
// palette tree-leaf green pushed toward the warm haze by the combined
// near-row blend of the glow level (0.3 base + 0.3 leaf-only ⇒ 0.51 total).
//
const MENU_GRASS_LEAF_HAZE_BLEND = 0.51
const MENU_GRASS_HAZE_RGB = parseHex(CFG.visual.colors.palette.warmHaze)
const [MENU_GRASS_TINT_R, MENU_GRASS_TINT_G, MENU_GRASS_TINT_B] = parseHex(CFG.visual.colors.palette.treeColor.leaf).map((c, i) => Math.round(c + (MENU_GRASS_HAZE_RGB[i] - c) * MENU_GRASS_LEAF_HAZE_BLEND))
//
// Firefly particles target opacity when hovering an anti-hero
//
const PARTICLES_HOVER_OPACITY = 0.8
const PARTICLES_FADE_IN_SPEED = 4.0
const PARTICLES_FADE_OUT_SPEED = 0.5
//
// Menu audio configuration (relative to CFG.audio.masterVolume)
//
const MENU_AUDIO = {
  menuMusicNormal: CFG.audio.masterVolume * 0.3,      // menu.mp3 normal volume (21% of master)
  menuMusicHover: CFG.audio.masterVolume * 0.08,      // menu.mp3 hover volume (5.6% of master)
  kidsMusicTarget: CFG.audio.masterVolume * 0.4,      // kids.mp3 target volume (28% of master)
  kidsMusicHover: CFG.audio.masterVolume * 0.1,       // kids.mp3 hover volume (7% of master)
  kidsMusicFadeInDuration: 4.0                         // Fade-in duration in seconds
}

//
// Prohibited sign visual style (drawn on locked anti-heroes when hovered).
// Ring + slash drawn in a dark crimson, pulsing gently.
//
const PROHIBITED_RING_RADIUS = 40
const PROHIBITED_RING_SEGMENTS = 36
const PROHIBITED_RING_WIDTH = 5
const PROHIBITED_SLASH_WIDTH = 7
const PROHIBITED_PULSE_SPEED = 2.8
const PROHIBITED_COLOR = '#B82C2C'
const PROHIBITED_SIGN_OPACITY = 1.0
const MENU_ANTIHERO_HOVER_AMP = 0.08
const MENU_ANTIHERO_PULSE_SPEED = 2.8
const MENU_ANTIHERO_HOVER_LERP = 8
//
// Green checkmark displayed on completed anti-heroes when hovered
//
const CHECKMARK_COLOR_R = 90
const CHECKMARK_COLOR_G = 210
const CHECKMARK_COLOR_B = 100
const CHECKMARK_SIZE = 28
const CHECKMARK_WIDTH = 6
const CHECKMARK_OPACITY = 1.0
const CHECKMARK_PULSE_SPEED = 1.8
//
// Scene-leave cover — sits above menu sprites so anti-heroes do not flash during load
//
const MENU_LEAVE_COVER_Z = CFG.visual.zIndex.ui + 1000
const MENU_LEAVE_BG_R = 26
const MENU_LEAVE_BG_G = 26
const MENU_LEAVE_BG_B = 26
//
// Per-letter progress labels below anti-heroes —
// the current level letter and every letter before it are highlighted; completed sections show all.
//
const SECTION_LABEL_FONT_SIZE = 18
const SECTION_LABEL_LETTER_SPACING = -1
//
// Letter sequences for each section (matching their in-game HUD indicators)
//
const SECTION_LETTERS = {
  glow:   ['G', 'L', 'O', 'W'],
  touch:  ['T', 'O', 'U', 'C', 'H'],
  time:   ['T', '1', 'M', 'E'],
  word:   ['W', 'O', 'R', 'D', 'S'],
  feel:   ['F', 'E', 'E', 'L'],
  mind:   ['M', 'I', 'N', 'D']
}
//
// Storage keys of the collected GLOW letters — the menu label under the glow
// anti-hero lights up exactly as many letters as the hero has found.
//
const GLOW_LETTER_KEYS = ['glow.collectedG', 'glow.collectedL', 'glow.collectedO', 'glow.collectedW']
//
// Touch "H" hangs lower and continuously sways — mirroring the in-game TOUCH HUD indicator
//
const TOUCH_H_INDEX = 4
const TOUCH_H_TILT = 22
const TOUCH_H_Y_RATIO = 0.3
const TOUCH_H_X_OFFSET = -6
const TOUCH_H_WOBBLE_SPEED = 2.5
const TOUCH_H_WOBBLE_AMPLITUDE = 4
function getSectionDisplayName(section) {
  //
  // Return section name as-is (singular form)
  //
  return section
}
/**
 * Returns the index of the HUD letter that matches the player's current level.
 * Level 0 maps to the first letter (e.g. word "W"), level 1 to the second ("O"), etc.
 * @param {string} section - Section key ('touch', 'time', 'word', …)
 * @param {string|null} lastLevel - Value of get('lastLesson')
 * @param {Object} progress - Full progress object from getProgress()
 * @returns {number} Active letter index, -1 when unknown, -2 when the whole section is done
 */
function getSectionActiveLetterIndex(section, lastLevel, progress) {
  //
  // Fully completed section → highlight every letter
  //
  if (progress[section]?.completed) return -2
  //
  // Glow lights one letter per collected in-level letter (G, L, O, W) —
  // independent of the level number.
  //
  if (section === 'glow') {
    const collected = GLOW_LETTER_KEYS.filter(key => get(key, false)).length
    return collected - 1
  }
  if (!lastLevel) return -1
  if (section === 'touch' && lastLevel.startsWith('lesson-touch.')) {
    const n = parseInt(lastLevel.replace('lesson-touch.', ''), 10)
    return isNaN(n) ? -1 : n
  }
  if (section === 'time' && lastLevel.startsWith('lesson-time.')) {
    const n = parseInt(lastLevel.replace('lesson-time.', ''), 10)
    return isNaN(n) ? -1 : n
  }
  if (section === 'word' && lastLevel.startsWith('lesson-word.')) {
    const n = parseInt(lastLevel.replace('lesson-word.', ''), 10)
    return isNaN(n) ? -1 : n
  }
  return -1
}
/**
 * Get section label positions (arranged in circle)
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {number} radius - Circle radius
 * @returns {Array} Array of section configs with positions
 */
function getSectionPositions(centerX, centerY, radius) {
  //
  // Clockwise order (6 sections, 60° apart): glow → touch → word → time → feel → mind.
  //
  const sections = ['touch', 'word', 'time', 'feel', 'mind', 'glow']
  const angleStep = (Math.PI * 2) / sections.length
  //
  // Start angle shifted to have 2 anti-heroes at top
  // -120° puts first anti-hero at top-left, second at top-right
  //
  const startAngle = -Math.PI * 2 / 3  // -120 degrees
  
  return sections.map((section, index) => {
    const angle = startAngle + angleStep * index
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius
    
    return {
      section,
      x,
      y,
      color: SECTION_COLORS[section]
    }
  })
}

/**
 * Menu scene with hero in center
 * @param {Object} k - Kaplay instance
 */
export function sceneMenu(k) {
  k.scene("menu", () => {
    //
    // Restore volume to 1 (in case it was muted by transition)
    //
    k.volume(1)
    //
    // Set the canvas backdrop to the READY scene background: the menu shares
    // the same tone, and the baked static sprite blends into this exact colour
    // at its top/bottom bands, so the letterbox bars never read as horizontal
    // strips of a different tone.
    //
    CanvasBackdrop.applyCanvasBackdrop(k, CFG.visual.colors.ready.background)
    //
    // Clean up persistent word-pile objects from previous scenes
    //
    k.get("word-pile-text").forEach(obj => obj.destroy())
    k.get("word-pile-outline").forEach(obj => obj.destroy())
    k.get("flying-word").forEach(obj => obj.destroy())
    k.flyingWordsInstance = null
    //
    // Clean up life.png sprite from level indicators
    //
    k.get("life").forEach(obj => obj.destroy())
    
    //
    // Reset flying words instance so it can be recreated in next level
    //
    k.flyingWordsInstance = null
    
    //
    // Ensure default cursor type when entering menu
    //
    Cursor.setCursor('arrow')
    
    //
    // Disable gravity in menu
    //
    k.setGravity(0)
    
    const centerX = CFG.visual.screen.width / 2
    const centerY = 500
    const radius = 302
    //
    // Create stars for background
    //
    const stars = createStars(k, 150)
    //
    // Create firefly particles background
    //
    const particlesBg = Particles.create({
      k,
      particleCount: 180,
      color: '#FF8C00',
      baseOpacity: 0,
      flickerSpeed: 1.5,
      trembleRadius: 12,
      gaussianFactor: 0.35,
      disableMouseInteraction: true
    })
    
    const progress = getProgress()
    //
    // Migrate legacy 'lastLevel' key (old format: 'level-touch.1') to 'lastLesson'
    // ('lesson-touch.1'). Only runs once — removes the old key afterwards.
    //
    const legacyLastLevel = get('lastLevel', null)
    if (legacyLastLevel) {
      const migrated = legacyLastLevel.startsWith('level-') ? legacyLastLevel.replace(/^level-/, 'lesson-') : legacyLastLevel
      if (!get('lastLesson', null)) set('lastLesson', migrated)
      localStorage.removeItem('lastLevel')
    }
    //
    // Sanitize lastLesson: section-complete markers should point to the next section
    //
    let lastLevel = get('lastLesson', null)
    const normalizedLastLevel = normalizeSceneName(lastLevel)
    if (normalizedLastLevel !== lastLevel) {
      lastLevel = normalizedLastLevel
      set('lastLesson', lastLevel)
    }
    if (lastLevel === 'word-complete') {
      lastLevel = 'lesson-time.0'
      set('lastLesson', lastLevel)
    } else if (lastLevel === 'time-complete') {
      lastLevel = null
      set('lastLesson', lastLevel)
    } else if (lastLevel === 'touch-complete') {
      lastLevel = 'lesson-word.0'
      set('lastLesson', lastLevel)
    } else if (lastLevel === 'glow-complete') {
      lastLevel = 'lesson-touch.0'
      set('lastLesson', lastLevel)
    }
    const currentSection = getSectionFromLevel(lastLevel)
    
    //
    // Create sound instance and start audio context
    // Don't start ambient automatically - it will play on hover
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    //
    // Play menu background music
    //
    const menuMusic = k.play("menu", { loop: true, volume: MENU_AUDIO.menuMusicNormal })
    const MENU_MUSIC_NORMAL_VOLUME = MENU_AUDIO.menuMusicNormal
    const MENU_MUSIC_HOVER_VOLUME = MENU_AUDIO.menuMusicHover
    //
    // Play kids.mp3 music with fade in
    //
    const kidsMusic = k.play("kids", { loop: true, volume: 0 })
    const KIDS_MUSIC_TARGET_VOLUME = MENU_AUDIO.kidsMusicTarget
    const KIDS_MUSIC_HOVER_VOLUME = MENU_AUDIO.kidsMusicHover
    const KIDS_MUSIC_CURRENT_SECTION_VOLUME = MENU_AUDIO.kidsMusicHover * 0.5  // Even quieter when hovering current section
    const KIDS_MUSIC_FADE_IN_DURATION = MENU_AUDIO.kidsMusicFadeInDuration
    let kidsMusicFadeTimer = 0

    //
    // Create hero in center (using HERO type)
    // Color progression: gray → gold (glow) → teal (touch) → orange (time) → red (word)
    //
    const noSectionsComplete = !progress.touch?.completed && !progress.time?.completed && !progress.word?.completed && !progress.glow?.completed
    const heroBodyColor = progress.word?.completed ? "#E74C3C" : progress.time?.completed ? "#FF8C00" : progress.touch?.completed ? CFG.visual.colors.sections.touch.body : progress.glow?.completed ? CFG.visual.colors.sections.glow.body : "#656565"
    const heroInst = Hero.create({
      k,
      x: centerX,
      y: centerY,
      type: Hero.HEROES.HERO,
      scale: 5 / 3,
      controllable: false,
      addMouth: Boolean(progress.word?.completed),
      addArms: Boolean(progress.touch?.completed),
      bodyColor: heroBodyColor,
      outlineColor: noSectionsComplete ? "#1A1A1A" : null,
      //
      // Menu hero whistles softly when the player stops moving the mouse,
      // emitting music notes from his mouth (handled by Hero.create's
      // built-in idle vocalization once a sound instance is available).
      //
      sfx: sound
    })
    
    const hero = heroInst.character
    hero.z = 10
    //
    // Apply same color tint as inactive anti-heroes when no sections complete
    //
    if (noSectionsComplete) {
      hero.color = k.rgb(255, 255, 255)
    }
    //
    // Create 6 anti-heroes around the main hero (sections)
    //
    const sectionConfigs = getSectionPositions(centerX, centerY, radius)
    const antiHeroes = []
    const sectionLabels = []
    //
    // Floating animation configuration (firefly-like in all directions)
    //
    const FLOAT_RADIUS = 6         // Maximum float distance from base position
    const FLOAT_SPEED_X = 0.8      // Speed of horizontal floating
    const FLOAT_SPEED_Y = 1.2      // Speed of vertical floating
    
    sectionConfigs.forEach((config, index) => {
      const isCompleted = progress[config.section]?.completed || false
      //
      // Always create with gray body (sprite generation)
      // Color tint will be applied in onUpdate for completed/hovered sections
      // For time section when completed, use yellow color
      //
      const grayColor = '#656565'
      const grayOutlineColor = '#1A1A1A'
      const yellowColor = '#FF8C00'  // Anti-hero orange/yellow color (same as hero color in time-complete)
      const bodyColor = grayColor  // Always gray for sprite
      const outlineColor = isCompleted ? CFG.visual.colors.outline : grayOutlineColor
      //
      // Create anti-hero for this section
      //
      const antiHeroInst = Hero.create({
        k,
        x: config.x,
        y: config.y,
        type: Hero.HEROES.ANTIHERO,
        scale: 1,
        controllable: false,
        isStatic: true,
        bodyColor,
        outlineColor,
        addMouth: config.section === 'word' || config.section === 'time',
        addArms: config.section === 'touch' || config.section === 'word' || config.section === 'time',
        addWatch: config.section === 'time',
        hitboxPadding: 5,
        //
        // Section icon anti-heroes are purely decorative; suppress the
        // "z-Z" sleeping glyphs that would otherwise float over the UI.
        //
        idleVocalization: null
      })
      //
      // Preload section color variant with black outline for hover/completed state
      //
      Hero.loadHeroSprites({
        k,
        type: Hero.HEROES.ANTIHERO,
        bodyColor: grayColor,
        outlineColor: CFG.visual.colors.outline,
        addMouth: config.section === 'word' || config.section === 'time',
        addArms: config.section === 'touch' || config.section === 'word' || config.section === 'time',
        addWatch: config.section === 'time'
      })
      //
      // For time section, also preload yellow variant (with mouth, as time now has mouth)
      //
      if (config.section === 'time') {
        Hero.loadHeroSprites({
          k,
          type: Hero.HEROES.ANTIHERO,
          bodyColor: yellowColor,
          outlineColor: CFG.visual.colors.outline,
          addMouth: true,
          addArms: true,
          addWatch: true
        })
      }
      //
      // Preload section-colored variant for accurate hover/completed color
      // (avoids dark tinting that occurs when multiplying gray × section color)
      //
      Hero.loadHeroSprites({
        k,
        type: Hero.HEROES.ANTIHERO,
        bodyColor: config.color.body,
        outlineColor: CFG.visual.colors.outline,
        addMouth: config.section === 'word' || config.section === 'time',
        addArms: config.section === 'touch' || config.section === 'word' || config.section === 'time',
        addWatch: config.section === 'time'
      })
      //
      // Cache sprite prefixes for outline switching
      // Remove # from colors to match loadHeroSprites prefix format
      //
      const grayColorNoHash = grayColor.replace('#', '')
      const grayOutlineColorNoHash = grayOutlineColor.replace('#', '')
      const outlineColorNoHash = CFG.visual.colors.outline.replace('#', '')
      const yellowColorNoHash = yellowColor.replace('#', '')
      const sectionColorNoHash = config.color.body.replace('#', '')
      const hasMouth = config.section === 'word' || config.section === 'time'
      const hasArms = config.section === 'touch' || config.section === 'word' || config.section === 'time'
      const hasWatch = config.section === 'time'
      const suffixes = `${hasMouth ? '_mouth' : ''}${hasArms ? '_arms' : ''}${hasWatch ? '_watch' : ''}`
      antiHeroInst.spritePrefixGray = `${Hero.HEROES.ANTIHERO}_${grayColorNoHash}_${grayOutlineColorNoHash}${suffixes}`
      antiHeroInst.spritePrefixBlack = `${Hero.HEROES.ANTIHERO}_${grayColorNoHash}_${outlineColorNoHash}${suffixes}`
      antiHeroInst.spritePrefixYellow = config.section === 'time' ? `${Hero.HEROES.ANTIHERO}_${yellowColorNoHash}_${outlineColorNoHash}_mouth_arms_watch` : null
      antiHeroInst.spritePrefixColored = `${Hero.HEROES.ANTIHERO}_${sectionColorNoHash}_${outlineColorNoHash}${suffixes}`
      antiHeroInst.currentPrefix = isCompleted ? antiHeroInst.spritePrefixColored : antiHeroInst.spritePrefixGray
      //
      // Switch to colored sprite immediately if section is completed
      // (Hero.create uses gray body, so the actual sprite needs replacing)
      //
      if (isCompleted) {
        antiHeroInst.spritePrefix = antiHeroInst.spritePrefixColored
        antiHeroInst.character.use(k.sprite(`${antiHeroInst.spritePrefixColored}_0_0`))
        antiHeroInst.character.color = k.rgb(255, 255, 255)
      }
      //
      // Store base position and phase offsets for floating animation
      //
      antiHeroInst.baseX = config.x
      antiHeroInst.baseY = config.y
      antiHeroInst.floatPhaseX = index * 1.1 + Math.random() * 2
      antiHeroInst.floatPhaseY = index * 0.7 + Math.random() * 2
      
      antiHeroInst.character.z = 10
      //
      // Store section info for hover color change
      //
      antiHeroInst.section = config.section
      antiHeroInst.sectionColor = config.color.body
      antiHeroInst.isCompleted = isCompleted
      antiHeroInst.grayColor = grayColor
      antiHeroInst.yellowColor = yellowColor
      antiHeroInst.originalBodyColor = bodyColor
      antiHeroInst.baseScale = 1
      
      //
      // Add click handlers for implemented sections
      // Only if section is not completed AND previous section is completed (or it's the first section)
      //
      const sectionOrder = ['glow', 'touch', 'word', 'time', 'feel', 'mind']
      const currentIndex = sectionOrder.indexOf(config.section)
      const previousIndex = currentIndex === 0 ? sectionOrder.length - 1 : currentIndex - 1
      const previousSection = sectionOrder[previousIndex]
      const isPreviousCompleted = progress[previousSection]?.completed || false
      const canAccess = currentIndex === 0 || isPreviousCompleted  // First section is always accessible
      
      if (config.section === 'word' && !isCompleted && canAccess) {
        antiHeroInst.character.onClick(() => {
          //
          // Ignore the click while a pre-level transition is running — the
          // click is the transition's own skip, not a new section entry.
          //
          if (k.transitionCleanup) return
          //
          // Mark that we're leaving the scene
          //
          beginMenuSceneLeave(k, inst)
          
          //
          // Stop ambient sound
          //
          Sound.stopAmbient(sound)
          
          Cursor.setCursor('arrow')
          //
          // Get last level for word section or start from beginning
          //
          const isWordLevel = lastLevel && lastLevel.startsWith('lesson-word.')
          
          if (isWordLevel) {
            //
            // Continue from last word level with transition
            //
            menuMusic.stop()
            kidsMusic.stop()
            showTransitionToLevel(k, lastLevel)
          } else {
            //
            // Start word section from beginning with intro phrase
            //
            menuMusic.stop()
            kidsMusic.stop()
            createLevelTransition(k, 'menu')
          }
        })
      }
      
      if (config.section === 'glow' && !isCompleted && canAccess) {
        antiHeroInst.character.onClick(() => {
          //
          // Ignore the click while a pre-level transition is running — the
          // click is the transition's own skip, not a new section entry.
          //
          if (k.transitionCleanup) return
          beginMenuSceneLeave(k, inst)
          Sound.stopAmbient(sound)
          Cursor.setCursor('arrow')
          menuMusic.stop()
          kidsMusic.stop()
          const currentLastLevel = get('lastLesson', null)
          //
          // Always route through the transition so the pre-level phrase
          // (with its glow0-pre voice-over) plays before the glow level.
          //
          if (currentLastLevel && currentLastLevel.startsWith('lesson-glow.')) {
            showTransitionToLevel(k, currentLastLevel)
          } else {
            showTransitionToLevel(k, 'lesson-glow.0')
          }
        })
      }
      if (config.section === 'touch' && !isCompleted && canAccess) {
        antiHeroInst.character.onClick(() => {
          //
          // Ignore the click while a pre-level transition is running — the
          // click is the transition's own skip, not a new section entry.
          //
          if (k.transitionCleanup) return
          beginMenuSceneLeave(k, inst)
          
          //
          // Stop ambient sound
          //
          Sound.stopAmbient(sound)
          Cursor.setCursor('arrow')
          //
          // Stop music
          //
          menuMusic.stop()
          kidsMusic.stop()
          //
          // Determine which level to go to
          //
          const lastTouchLevel = get('lastLesson', null)
          
          if (lastTouchLevel && lastTouchLevel.startsWith('lesson-touch.')) {
            showTransitionToLevel(k, lastTouchLevel)
          } else {
            goAfterPreparingAssets(k, 'lesson-touch.0')
          }
        })
      }
      
      if (config.section === 'time' && !isCompleted && canAccess) {
        antiHeroInst.character.onClick(() => {
          //
          // Ignore the click while a pre-level transition is running — the
          // click is the transition's own skip, not a new section entry.
          //
          if (k.transitionCleanup) return
          beginMenuSceneLeave(k, inst)
          
          //
          // Stop ambient sound
          //
          Sound.stopAmbient(sound)
          
          //
          Cursor.setCursor('arrow')
          //
          // Stop music
          //
          menuMusic.stop()
          kidsMusic.stop()
          //
          // Get last level for time section or start from beginning
          //
          const isTimeLevel = lastLevel && lastLevel.startsWith('lesson-time.')
          
          if (isTimeLevel) {
            //
            // Continue from last time level with transition
            //
            showTransitionToLevel(k, lastLevel)
          } else {
            //
            // Start time section from beginning
            //
            createLevelTransition(k, 'menu-time')
          }
        })
      }
      
      antiHeroes.push(antiHeroInst)
      //
      // Per-letter progress label below the anti-hero.
      // Completed levels → section colour; remaining → gray.
      // Touch "H" hangs lower and sways like the in-game HUD indicator.
      // Unknown sections (never visited) are hidden — "unknown" appears in the
      // hover-title floating label instead (see updateTitle).
      //
      const isCurrentSection = Boolean(lastLevel?.startsWith(`lesson-${config.section}.`))
      const labelVisible = isCompleted || isCurrentSection
      //
      // Store "unknown" flag on the anti-hero for hover-title lookup
      //
      antiHeroInst.isUnknown = !labelVisible
      const labelEntry = createSectionProgressLabel(
        k, config, progress, lastLevel, grayColor, labelVisible
      )
      sectionLabels.push(labelEntry)
    })
    
    //
    // Create arrows between anti-heroes in clockwise order
    // Sort anti-heroes by angle clockwise
    // Clockwise order: sort by ascending angle (smaller angles first, going clockwise)
    //
    const sortedAntiHeroes = [...antiHeroes].sort((a, b) => {
      //
      // Calculate angle for each anti-hero relative to center
      //
      const angleA = Math.atan2(a.baseY - centerY, a.baseX - centerX)
      const angleB = Math.atan2(b.baseY - centerY, b.baseX - centerX)
      //
      // Normalize angles to 0-2π range
      //
      const normalizedA = ((angleA + Math.PI * 2) % (Math.PI * 2))
      const normalizedB = ((angleB + Math.PI * 2) % (Math.PI * 2))
      //
      // Sort ascending for clockwise order (smaller angles first)
      //
      return normalizedA - normalizedB
    })
    
    const arrows = sortedAntiHeroes.map((fromAntiHero, i) => {
      const toAntiHero = sortedAntiHeroes[(i + 1) % sortedAntiHeroes.length]
      return { fromAntiHero, toAntiHero }
    })
    
    //
    // Combined static background sprite (baked once per session).
    //
    buildMenuStaticSprite(k)
    //
    // Swaying grass along the menu-bg horizon — shared Grass component in
    // manual-draw mode (no z given): drawScene renders it between the
    // background and the stars, fading it together with the background.
    //
    const grassField = Grass.create({
      k,
      floorY: MENU_BG_GROUND_Y + MENU_BG_HORIZON_LINE_HEIGHT,
      left: MENU_GRASS_EDGE_INSET,
      right: MENU_BG_CANVAS_W - MENU_GRASS_EDGE_INSET,
      tuftCount: MENU_GRASS_TUFT_COUNT,
      density: (x) => Math.min(1, Math.abs(x - centerX) / MENU_GRASS_DENSITY_RAMP),
      getTint: () => getMenuGrassTint(inst)
    })
    //
    // Scene instance with all state
    //
    const inst = {
      k,
      centerX,
      centerY,
      hero,
      sound,
      particlesBg,
      stars,
      grassField,
      title: createTitle(k, centerX, centerY, radius),
      antiHeroes,
      sectionLabels,
      arrows,  // Store arrows data in instance
      currentSection,
      progress,  // Store progress for checking section completion
      floatTime: 0,
      floatRadius: FLOAT_RADIUS,
      floatSpeedX: FLOAT_SPEED_X,
      floatSpeedY: FLOAT_SPEED_Y,
      hoveredAntiHero: null,
      heroInst,
      isLeavingScene: false,
      heartbeatPhase: 0,
      lastHeartbeatTime: 0,
      bgDefaultOpacity: 1.0
    }
    
    //
    // Track mouse position and check for hover over anti-heroes
    //
    k.onUpdate(() => {
      if (inst.isLeavingScene) return
      //
      // Update trembling particles
      //
      Particles.onUpdate(particlesBg)
      //
      // Fade in kids music
      //
      if (kidsMusicFadeTimer < KIDS_MUSIC_FADE_IN_DURATION) {
        kidsMusicFadeTimer += k.dt()
        const progress = Math.min(kidsMusicFadeTimer / KIDS_MUSIC_FADE_IN_DURATION, 1.0)
        kidsMusic.volume = progress * KIDS_MUSIC_TARGET_VOLUME
      }
      //
      // Update heartbeat phase for lightning pulsation (60 BPM = 1 beat per second)
      //
      const HEARTBEAT_BPM = 60
      const heartbeatSpeed = HEARTBEAT_BPM / 60
      inst.heartbeatPhase = (inst.heartbeatPhase + k.dt() * heartbeatSpeed) % 1
      
      const mousePos = k.mousePos()
      let foundHover = false
      let hoveredInst = null
      
      //
      // Check each anti-hero for hover
      //
      antiHeroes.forEach(antiHeroInst => {
        const char = antiHeroInst.character
        const dx = mousePos.x - char.pos.x
        const dy = mousePos.y - char.pos.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const hoverRadius = 60  // Hover detection radius (increased for better detection)
        
        if (distance < hoverRadius) {
          hoveredInst = antiHeroInst
          foundHover = true
        }
      })
      //
      // The sleeping singer wakes while an anti-hero is hovered: the song
      // pauses, the eyes open and follow the hovered character; once the
      // mouse leaves he dozes off and the idle tune resumes on its own.
      //
      Hero.setAwakeOverride(heroInst, Boolean(hoveredInst))
      Hero.setLookAtPos(heroInst, hoveredInst
        ? { x: hoveredInst.character.pos.x, y: hoveredInst.character.pos.y }
        : null)
      
      //
      // Update colors for all anti-heroes based on hover state
      //
      antiHeroes.forEach(antiHeroInst => {
        //
        // Determine target color and sprite based on state
        //
        let targetColor
        let desiredPrefix
        const isHovered = antiHeroInst === hoveredInst
        const isCurrentSection = inst.currentSection === antiHeroInst.section
        const shouldUseBlackOutline = isHovered || antiHeroInst.isCompleted || isCurrentSection
        //
        // Special handling for time section: use yellow when completed or current
        //
        if (antiHeroInst.section === 'time' && (antiHeroInst.isCompleted || isCurrentSection)) {
          targetColor = antiHeroInst.yellowColor
          desiredPrefix = antiHeroInst.spritePrefixYellow
        } else if (antiHeroInst.section === 'time' && isHovered) {
          //
          // Time section hovered but not completed: show yellow
          //
          targetColor = antiHeroInst.yellowColor
          desiredPrefix = antiHeroInst.spritePrefixYellow
        } else if (shouldUseBlackOutline) {
          //
          // Hovered, completed, or current section: use section-colored sprite
          //
          targetColor = antiHeroInst.sectionColor
          desiredPrefix = antiHeroInst.spritePrefixColored
        } else {
          //
          // Not hovered, not completed, not current: gray
          //
          targetColor = antiHeroInst.grayColor
          desiredPrefix = antiHeroInst.spritePrefixGray
        }
        //
        // White tint for all states since sprites now have correct colors baked in
        //
        antiHeroInst.character.color = k.rgb(255, 255, 255)
        //
        // Switch sprite variant if needed
        //
        if (antiHeroInst.currentPrefix !== desiredPrefix) {
          antiHeroInst.currentPrefix = desiredPrefix
          antiHeroInst.spritePrefix = desiredPrefix
          antiHeroInst.character.use(k.sprite(`${desiredPrefix}_0_0`))
        }
        //
        // Keep anti-hero at base position; scale breathes gently while hovered
        //
        antiHeroInst.character.pos.x = antiHeroInst.baseX
        antiHeroInst.character.pos.y = antiHeroInst.baseY
        const baseScale = antiHeroInst.baseScale ?? 1
        antiHeroInst.hoverScale == null && (antiHeroInst.hoverScale = 1)
        const targetHoverScale = isHovered
          ? 1 + MENU_ANTIHERO_HOVER_AMP * Math.sin(k.time() * MENU_ANTIHERO_PULSE_SPEED)
          : 1
        antiHeroInst.hoverScale += (targetHoverScale - antiHeroInst.hoverScale) *
          Math.min(1, MENU_ANTIHERO_HOVER_LERP * k.dt())
        const pulseScale = baseScale * antiHeroInst.hoverScale
        antiHeroInst.character.scale = k.vec2(pulseScale, pulseScale)
      })
      
      //
      // Per-letter label update: show hover outlines and animate the touch "H" wobble
      //
      sectionLabels.forEach(entry => {
        if (!entry.labelVisible) return
        const { letters, section, isCompleted, fallingH } = entry
        const isHover = hoveredInst && hoveredInst.section === section
        const isCurrent = inst.currentSection === section
        const outlineOpacity = (isHover || isCurrent || isCompleted) ? 1 : 0
        letters.forEach(letterEntry => {
          letterEntry.outlines.forEach(outlineObj => {
            outlineObj.opacity = outlineOpacity
          })
        })
        //
        // Animate the dangling "H" for the touch section
        //
        if (section === 'touch' && fallingH && fallingH.length > 0) {
          const wobbleAngle = TOUCH_H_TILT + Math.sin(k.time() * TOUCH_H_WOBBLE_SPEED) * TOUCH_H_WOBBLE_AMPLITUDE
          fallingH.forEach(obj => { obj.angle = wobbleAngle })
        }
      })
      
      //
      // Change cursor to pointer when hovering over implemented sections
      // Only if previous section is completed OR if this is the current section being played
      // Don't change cursor if leaving scene
      //
      if (!inst.isLeavingScene) {
        if (hoveredInst) {
          //
          // Get previous section in clockwise order
          //
          const sectionOrder = ['glow', 'touch', 'word', 'time', 'feel', 'mind']
          const currentIndex = sectionOrder.indexOf(hoveredInst.section)
          const previousIndex = currentIndex === 0 ? sectionOrder.length - 1 : currentIndex - 1
          const previousSection = sectionOrder[previousIndex]
          const previousAntiHero = antiHeroes.find(ah => ah.section === previousSection)
          const isPreviousCompleted = previousAntiHero ? previousAntiHero.isCompleted : false
          
          //
          // Word, touch, and time sections are clickable
          // Can access if: previous section is completed (or it's the first section) OR if this is the current section being played
          //
          const isImplementedSection = (hoveredInst.section === 'glow' || hoveredInst.section === 'word' || hoveredInst.section === 'touch' || hoveredInst.section === 'time')
          const isCurrentSection = inst.currentSection === hoveredInst.section
          const canAccess = isCurrentSection || (currentIndex === 0 || isPreviousCompleted)  // Current section is always accessible, or first section, or previous completed
          
          if (isImplementedSection && !hoveredInst.isCompleted && canAccess) {
            Cursor.setCursor('pointer')
          } else {
            Cursor.setCursor('arrow')
          }
        } else {
          Cursor.setCursor('arrow')
        }
      }
      
      inst.hoveredAntiHero = hoveredInst
      //
      // Make hero and antihero eyes look at each other when hovering
      //
      if (hoveredInst && hoveredInst.character?.pos) {
        Hero.setLookAtPos(inst.heroInst, { x: hoveredInst.character.pos.x, y: hoveredInst.character.pos.y })
        Hero.setLookAtPos(hoveredInst, { x: hero.pos.x, y: hero.pos.y })
      } else {
        Hero.setLookAtPos(inst.heroInst, null)
        antiHeroes.forEach(ah => Hero.setLookAtPos(ah, null))
      }
      //
      // Fade default background out when hovering any anti-hero, back in when not
      //
      const bgDefaultTarget = hoveredInst ? 0.0 : 1.0
      inst.bgDefaultOpacity += (bgDefaultTarget - inst.bgDefaultOpacity) * Math.min(k.dt() * BG_FADE_SPEED, 1.0)
      //
      // Fireflies only appear for antiheroes whose section is completed or currently being played
      //
      const lastLevel = get('lastLesson', null)
      const isEmptyLS = lastLevel === null
      const touchAH = antiHeroes.find(ah => ah.section === 'touch')
      const fireflyAllowed = hoveredInst && (
        hoveredInst.isCompleted ||
        (inst.currentSection && hoveredInst.section === inst.currentSection) ||
        (isEmptyLS && touchAH && hoveredInst === touchAH)
      )
      //
      // Fade firefly particles in when hovering allowed anti-hero, out otherwise
      //
      if (fireflyAllowed) {
        particlesBg.baseOpacity = Math.min(PARTICLES_HOVER_OPACITY, particlesBg.baseOpacity + k.dt() * PARTICLES_FADE_IN_SPEED)
      } else {
        particlesBg.baseOpacity += (0 - particlesBg.baseOpacity) * Math.min(k.dt() * PARTICLES_FADE_OUT_SPEED, 1.0)
      }
      //
      // Attract fireflies toward hovered anti-hero, scatter when unhovered
      //
      if (fireflyAllowed) {
        particlesBg.attractTarget = {
          x: hoveredInst.character.pos.x,
          y: hoveredInst.character.pos.y,
          active: true
        }
      } else if (particlesBg.attractTarget) {
        particlesBg.attractTarget.active = false
      }
      //
      // Control music volume based on hover state
      //
      if (!inst.isLeavingScene) {
        //
        // Check if hovering over anti-hero of current section
        //
        const isCurrentSectionHover = foundHover && hoveredInst && !hoveredInst.isCompleted && inst.currentSection && hoveredInst.section === inst.currentSection
        
        if (foundHover && hoveredInst && !hoveredInst.isCompleted) {
          //
          // Fade music volume down when hovering
          //
          const targetVolume = MENU_MUSIC_HOVER_VOLUME
          menuMusic.volume += (targetVolume - menuMusic.volume) * 5 * k.dt()
          //
          // Fade kids music volume down when hovering
          // Even quieter when hovering current section (with lightning and heartbeat)
          //
          if (kidsMusicFadeTimer >= KIDS_MUSIC_FADE_IN_DURATION) {
            const kidsTargetVolume = isCurrentSectionHover ? KIDS_MUSIC_CURRENT_SECTION_VOLUME : KIDS_MUSIC_HOVER_VOLUME
            kidsMusic.volume += (kidsTargetVolume - kidsMusic.volume) * 5 * k.dt()
          }
        } else {
          //
          // Fade music volume back to normal when not hovering
          //
          const targetVolume = MENU_MUSIC_NORMAL_VOLUME
          menuMusic.volume += (targetVolume - menuMusic.volume) * 3 * k.dt()
          //
          // Fade kids music volume back to normal when not hovering
          //
          if (kidsMusicFadeTimer >= KIDS_MUSIC_FADE_IN_DURATION) {
            const kidsTargetVolume = KIDS_MUSIC_TARGET_VOLUME
            kidsMusic.volume += (kidsTargetVolume - kidsMusic.volume) * 3 * k.dt()
          }
        }
        
        //
        // Play heartbeat sound for current section anti-hero OR touch anti-hero when localStorage is empty
        //
        const isTouchAntiHeroHover = isEmptyLS && touchAH && !touchAH.isCompleted && hoveredInst === touchAH
        
        if (isCurrentSectionHover || isTouchAntiHeroHover) {
          const HEARTBEAT_INTERVAL = 1.0
          if (k.time() - inst.lastHeartbeatTime >= HEARTBEAT_INTERVAL) {
            Sound.playHeartbeatSound(sound)
            inst.lastHeartbeatTime = k.time()
          }
        }
      }
      
      //
      // Update title movement or hide when leaving
      //
      if (inst.isLeavingScene) {
        hideTitle(inst.title)
        } else {
        updateTitle(inst.title, k, hoveredInst)
      }
      
      //
      // Control ambient sound based on hover state
      // Only start ambient for current section being played (not completed sections)
      //
      if (!inst.isLeavingScene) {
        //
        // Check if hovering over anti-hero of current section
        //
        const isCurrentSectionHover = foundHover && hoveredInst && !hoveredInst.isCompleted && inst.currentSection && hoveredInst.section === inst.currentSection
        
        if (isCurrentSectionHover) {
          //
          // Start ambient if hovering over current section and not already playing
          //
          if (!Sound.isAmbientPlaying(sound)) {
            Sound.startAmbient(sound)
          }
        } else {
          //
          // Stop ambient if not hovering over current section or section is completed
          //
          if (Sound.isAmbientPlaying(sound)) {
            Sound.stopAmbient(sound)
          }
        }
      }
    })
    
    //
    // Background layer with animation
    //
    k.onDraw(() => {
      //
      // Solid cover while leaving — prevents menu art flashing during level load
      //
      if (inst.isLeavingScene) {
        k.drawRect({
          width: k.width(),
          height: k.height(),
          pos: k.vec2(0, 0),
          color: k.rgb(26, 26, 26)
        })
        return
      }
      drawScene(inst)
    })
    //
    // Full-screen cover while leaving — above all menu sprites (anti-heroes, hero, UI)
    //
    k.add([
      k.z(MENU_LEAVE_COVER_Z),
      k.fixed(),
      {
        draw() {
          if (!inst.isLeavingScene) return
          k.drawRect({
            width: k.width(),
            height: k.height(),
            pos: k.vec2(0, 0),
            color: k.rgb(MENU_LEAVE_BG_R, MENU_LEAVE_BG_G, MENU_LEAVE_BG_B)
          })
        }
      }
    ])
    //
    // High-z layer: draws the prohibited slash in front of all hero/anti-hero sprites
    //
    k.add([
      k.z(CFG.visual.zIndex.player + 1),
      {
        draw() {
          if (inst.isLeavingScene) return
          drawProhibitedSlashFront(k, inst)
          drawCompletedCheckmarkFront(k, inst)
        }
      }
    ])
    //
    // Check if there's a saved game
    //
    const hasSavedGame = lastLevel !== null
    
    //
    // Hint text - Space to continue, Enter to start new, ESC to go back.
    // If all sections completed, don't show continue option.
    // Touch devices keep the full hint visible but render the "Enter" word
    // as a tappable button so phones can start a new game without a keyboard.
    //
    const allCompleted = progress.word?.completed && progress.touch?.completed
    const HINT_FONT_SIZE = 20
    const HINT_CENTER_X = 960
    const HINT_Y = 1030
    let hintPrefix
    let hintSuffix
    if (allCompleted) {
      hintPrefix = ''
      hintSuffix = ' - new game  |  ESC - back'
    } else if (hasSavedGame) {
      hintPrefix = 'Space - continue  |  '
      hintSuffix = ' - new game  |  ESC - back'
    } else {
      hintPrefix = 'Space / '
      hintSuffix = ' - start  |  ESC - back'
    }
    const hintParts = renderHintWithEnter({
      k,
      centerX: HINT_CENTER_X,
      y: HINT_Y,
      prefix: hintPrefix,
      suffix: hintSuffix,
      fontSize: HINT_FONT_SIZE,
      onTap: () => startGame(true)
    })
    //
    // Smooth flicker animation for hint text (text only — the touch
    // button keeps its high contrast so the tap target stays readable).
    //
    const FLICKER_FADE_DURATION = 1.2
    const FLICKER_MIN_OPACITY = 0.5
    const FLICKER_MAX_OPACITY = 1.0
    let hintFlickerTime = FLICKER_FADE_DURATION
    let hintDirection = -1
    k.onUpdate(() => {
      hintFlickerTime += hintDirection * k.dt()
      if (hintFlickerTime >= FLICKER_FADE_DURATION) {
        hintDirection = -1
        hintFlickerTime = FLICKER_FADE_DURATION
      } else if (hintFlickerTime <= 0) {
        hintDirection = 1
        hintFlickerTime = 0
      }
      const progress = hintFlickerTime / FLICKER_FADE_DURATION
      const newOpacity = FLICKER_MIN_OPACITY + (FLICKER_MAX_OPACITY - FLICKER_MIN_OPACITY) * progress
      hintParts.setOpacity(newOpacity)
    })
    
    //
    // Start game controls
    // Space or Enter - Continue from last saved level or start from beginning
    //
    //
    // Start game action: Space continues saved game or starts new; Enter always starts new
    //
    const startGame = (forceNew) => {
      if (allCompleted && !forceNew) return
      //
      // A pre-level transition is already running (its overlay + phrase are
      // on screen) — pressing Space again must skip INSIDE the transition,
      // not restart it (a restart made the phrase blink and fade in again).
      //
      if (k.transitionCleanup) return
      beginMenuSceneLeave(k, inst)
      Sound.stopAmbient(sound)
      menuMusic.stop()
      kidsMusic.stop()
      Cursor.setCursor('arrow')
      //
      // The first glow level always enters through the transition, so the
      // pre-level phrase (with its glow0-pre voice-over) is shown.
      //
      if (forceNew) {
        resetProgress()
        showTransitionToLevel(k, 'lesson-glow.0')
      } else if (hasSavedGame) {
        showTransitionToLevel(k, lastLevel)
      } else {
        showTransitionToLevel(k, 'lesson-glow.0')
      }
    }
    k.onKeyPress("space", () => startGame(false))
    k.onKeyPress("enter", () => startGame(true))
    
    //
    // Back to ready scene (ESC) — guarded to prevent firing from a scene transition
    //
    const SCENE_GUARD_DELAY = 0.2
    let sceneReady = false
    k.wait(SCENE_GUARD_DELAY, () => { sceneReady = true })
    k.onKeyPress("escape", () => {
      if (!sceneReady) return
      //
      // If a level transition overlay is active (pre-level text), let the
      // transition's own Esc handler take care of navigation (it goes to menu).
      //
      if (k.transitionCleanup) return
      Sound.stopAmbient(sound)
      menuMusic.stop()
      kidsMusic.stop()
      k.transitionCleanup?.()
      goAfterPreparingAssets(k, "ready")
    })
    
    //
    // Cleanup when leaving scene
    //
    k.onSceneLeave(() => {
      CanvasBackdrop.clearCanvasBackdrop(k)
      //
      // Stop menu music
      //
      menuMusic.stop()
      kidsMusic.stop()
      //
      // Destroy all game objects
      //
      heroInst.character.destroy()
      antiHeroes.forEach(antiHeroInst => {
        antiHeroInst.character.destroy()
      })
      sectionLabels.forEach(entry => {
        entry.allObjects.forEach(obj => obj.destroy())
      })
      
      //
      // Destroy title objects
      //
      inst.title.letters.forEach(letter => {
        letter.destroy()
      })
      
      hintParts.destroy()
      
      //
      // Stop ambient sound
      //
      Sound.stopAmbient(sound)
    })
  })
}

/**
 * Create title with circular motion around anti-heroes
 * @param {Object} k - Kaplay instance
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {number} radius - Radius of anti-heroes circle
 * @returns {Object} Title instance with state
 */
function createTitle(k, centerX, centerY, radius) {
  const defaultText = "find"
  const titleSize = 32
  const amberColor = k.rgb(228, 155, 36)
  const dimColor = k.rgb(120, 120, 120)
  //
  // Drop shadow (single black copy offset right+down) — the same text
  // shadow style the glow level uses.
  //
  const outlineOffsets = [
    { dx: 2, dy: 2 }
  ]
  //
  // Pre-allocate letter objects for the longest possible text (section descriptions)
  //
  const maxTextLength = Math.max(
    defaultText.length,
    ...Object.values(SECTION_DESCRIPTIONS).map(d => d.length)
  )
  const letters = []
  const outlineLetters = []
  const circleRadius = radius + 100
  
  for (let i = 0; i < maxTextLength; i++) {
    const char = i < defaultText.length ? defaultText[i] : ' '
    const isVisible = i < defaultText.length
    //
    // Drop-shadow copies of the letter (see outlineOffsets above)
    //
    const shadows = outlineOffsets.map(offset => k.add([
      k.text(char, { size: titleSize }),
      k.pos(offset.dx, offset.dy),
      k.anchor("center"),
      k.color(0, 0, 0),
      k.opacity(0),
      k.z(CFG.visual.zIndex.ui + 49),
      k.fixed()
    ]))
    
    const letter = k.add([
      k.text(char, { size: titleSize }),
      k.pos(0, 0),
      k.anchor("center"),
      k.color(dimColor),
      k.outline(0, k.rgb(0, 0, 0)),
      k.z(CFG.visual.zIndex.ui + 50),
      k.fixed(),
      k.opacity(isVisible ? 1 : 0)
    ])
    
    letters.push(letter)
    outlineLetters.push(shadows.map((shadow, index) => ({
      node: shadow,
      dx: outlineOffsets[index].dx,
      dy: outlineOffsets[index].dy
    })))
  }
  
  return {
    letters,
    outlineLetters,
    text: defaultText,
    defaultText,
    targetText: defaultText,
    circleRadius,
    centerX,
    centerY,
    angle: 0,
    targetAngle: 0,
    isHovering: false,
    hoverAngle: 0,
    hoverRange: 0.3,
    hoverPhase: 0,
    moveSpeed: 0.15,
    snapSpeed: 3.0,
    amberColor,
    dimColor,
    isReversed: false,
    targetReversed: false,
    reverseFadePhase: 1.0,
    isReverseChanging: false,
    baseOpacity: 0.3,
    textFadePhase: 1.0,
    isTextChanging: false
  }
}

/**
 * Update title circular movement
 * @param {Object} titleInst - Title instance
 * @param {Object} k - Kaplay instance
 * @param {Object|null} hoveredAntiHero - Currently hovered anti-hero
 */
function updateTitle(titleInst, k, hoveredAntiHero) {
  const dt = k.dt()
  //
  // Determine target text based on hover state
  //
  //
  // Unknown sections (never visited) show generic "unknown" in the floating title
  //
  const newTargetText = hoveredAntiHero
    ? (hoveredAntiHero.isUnknown ? 'unknown' : (SECTION_DESCRIPTIONS[hoveredAntiHero.section] || titleInst.defaultText))
    : titleInst.defaultText
  //
  // Start text change fade if target text changed
  //
  if (newTargetText !== titleInst.targetText) {
    titleInst.targetText = newTargetText
    titleInst.isTextChanging = true
    titleInst.textFadePhase = 1.0
  }
  //
  // Handle text change fade animation (fade out → swap text → fade in)
  //
  if (titleInst.isTextChanging) {
    if (titleInst.textFadePhase > 0 && titleInst.text !== titleInst.targetText) {
      titleInst.textFadePhase -= dt * 5.0
      if (titleInst.textFadePhase <= 0) {
        titleInst.textFadePhase = 0
        titleInst.text = titleInst.targetText
      }
    } else if (titleInst.textFadePhase < 1) {
      titleInst.textFadePhase += dt * 4.0
      if (titleInst.textFadePhase >= 1) {
        titleInst.textFadePhase = 1
        titleInst.isTextChanging = false
      }
    }
  }
  //
  // Determine if letters should be reversed based on angle
  // Text direction depends on position on circle (clockwise motion)
  //
  const normalizedAngle = ((titleInst.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  const degrees = (normalizedAngle * 180 / Math.PI)
  //
  // Bottom half (30°-210°) → reversed, top half → normal
  //
  const shouldReverse = degrees >= 30 && degrees < 210
  //
  // Check if reversal state needs to change
  //
  if (shouldReverse !== titleInst.targetReversed) {
    titleInst.targetReversed = shouldReverse
    if (!titleInst.isReverseChanging) {
      titleInst.isReverseChanging = true
      titleInst.reverseFadePhase = 1.0
    }
  }
  //
  // Handle fade animation for reversal change
  //
  if (titleInst.isReverseChanging) {
    if (titleInst.reverseFadePhase > 0 && titleInst.isReversed !== titleInst.targetReversed) {
      titleInst.reverseFadePhase -= dt * 3.33
      if (titleInst.reverseFadePhase <= 0) {
        titleInst.reverseFadePhase = 0
        titleInst.isReversed = titleInst.targetReversed
      }
    } else if (titleInst.reverseFadePhase < 1) {
      titleInst.reverseFadePhase += dt * 2.5
      if (titleInst.reverseFadePhase >= 1) {
        titleInst.reverseFadePhase = 1
        titleInst.isReverseChanging = false
      }
    }
  }
  //
  // Update hover state
  //
  if (hoveredAntiHero) {
    if (!titleInst.isHovering) {
      const dx = hoveredAntiHero.character.pos.x - titleInst.centerX
      const dy = hoveredAntiHero.character.pos.y - titleInst.centerY
      titleInst.hoverAngle = Math.atan2(dy, dx)
      titleInst.isHovering = true
      titleInst.hoverPhase = 0
    }
    //
    // Move to hovered position quickly
    //
    let angleDiff = titleInst.hoverAngle - titleInst.angle
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
    titleInst.angle += angleDiff * titleInst.snapSpeed * dt
    //
    // Update hover phase for back-and-forth movement
    //
    titleInst.hoverPhase += dt * 2
    const hoverOffset = Math.sin(titleInst.hoverPhase) * titleInst.hoverRange
    titleInst.targetAngle = titleInst.hoverAngle + hoverOffset
    //
    // Change to anti-hero's section color
    //
    const sectionHex = hoveredAntiHero.section === 'time'
      ? '#FF8C00'
      : hoveredAntiHero.sectionColor
    const sectionRgb = getRGB(k, sectionHex)
    const targetColor = k.rgb(sectionRgb.r, sectionRgb.g, sectionRgb.b)
    titleInst.letters.forEach(letter => {
      letter.color.r += (targetColor.r - letter.color.r) * 5 * dt
      letter.color.g += (targetColor.g - letter.color.g) * 5 * dt
      letter.color.b += (targetColor.b - letter.color.b) * 5 * dt
    })
  } else {
    titleInst.isHovering = false
    //
    // Rotate slowly around circle
    //
    titleInst.angle += titleInst.moveSpeed * dt
    titleInst.targetAngle = titleInst.angle
    //
    // Dim letters back to gray
    //
    titleInst.letters.forEach(letter => {
      letter.color.r += (titleInst.dimColor.r - letter.color.r) * 3 * dt
      letter.color.g += (titleInst.dimColor.g - letter.color.g) * 3 * dt
      letter.color.b += (titleInst.dimColor.b - letter.color.b) * 3 * dt
    })
  }
  //
  // Position each letter along the arc
  // Scale arc length based on current text length with constant per-character spacing
  //
  const textLength = titleInst.text.length
  const arcCharSpacing = 0.075
  const arcLength = arcCharSpacing * (textLength - 1)
  const angleStep = textLength > 1 ? arcLength / (textLength - 1) : 0
  
  titleInst.letters.forEach((letter, index) => {
    const outlines = titleInst.outlineLetters[index]
    //
    // Hide letters beyond current text length
    //
    if (index >= textLength) {
      letter.opacity = 0
      outlines.forEach(outline => {
        outline.node.opacity = 0
      })
      return
    }
    //
    // Update letter character if needed
    //
    const currentChar = titleInst.text[index]
    if (letter.text !== currentChar) {
      letter.text = currentChar
    }
    outlines.forEach(outline => {
      if (outline.node.text !== currentChar) {
        outline.node.text = currentChar
      }
    })
    //
    // Determine letter index based on order (reversed or not)
    //
    const displayIndex = titleInst.isReversed ? (textLength - 1 - index) : index
    const letterAngle = titleInst.angle + (displayIndex - textLength / 2) * angleStep
    //
    // Position on circle
    //
    const x = titleInst.centerX + Math.cos(letterAngle) * titleInst.circleRadius
    const y = titleInst.centerY + Math.sin(letterAngle) * titleInst.circleRadius
    letter.pos.x = x
    letter.pos.y = y
    //
    // Rotate letter to follow arc (tangent to circle)
    //
    letter.angle = letterAngle + Math.PI / 2
    //
    // Apply opacity combining hover, reversal fade, and text change fade
    //
    const baseFinalOpacity = hoveredAntiHero ? 1.0 : titleInst.baseOpacity
    const finalOpacity = baseFinalOpacity * titleInst.reverseFadePhase * titleInst.textFadePhase
    letter.opacity = finalOpacity
    //
    // Toggle outline: black on hover, hidden when idle
    //
    const outlineOpacity = hoveredAntiHero ? finalOpacity : 0
    outlines.forEach(outline => {
      outline.node.pos.x = x + outline.dx
      outline.node.pos.y = y + outline.dy
      outline.node.angle = letter.angle
      outline.node.opacity = outlineOpacity
    })
    letter.outline.width = 0
  })
}

//
// Hide title instantly (used when leaving scene)
//
function hideTitle(titleInst) {
  titleInst.letters.forEach(letter => {
    letter.opacity = 0
  })
  titleInst.outlineLetters.forEach(outlines => {
    outlines.forEach(outline => {
      outline.node.opacity = 0
    })
  })
}

//
// Extract section name from level id (e.g., 'lesson-word.2' -> 'word')
//
function getSectionFromLevel(levelName) {
  if (!levelName) return null
  const match = levelName.match(/^(?:level|lesson)-(\w+)\./)
  return match ? match[1] : null
}

/**
 * Create stars for background
 * @param {Object} k - Kaplay instance
 * @param {number} count - Number of stars
 * @returns {Array} Array of star objects
 */
function createStars(k, count) {
  const stars = []
  
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * k.width(),
      y: Math.random() * k.height(),
      size: 0.5 + Math.random() * 1.5,  // Star size 0.5-2px
      opacity: 0.3 + Math.random() * 0.4,  // Opacity 0.3-0.7
      twinkleSpeed: 0.5 + Math.random() * 1.5,  // Twinkle speed
      twinklePhase: Math.random() * Math.PI * 2  // Random start phase
    })
  }
  
  return stars
}

/**
 * Draw background scene
 * @param {Object} inst - Scene instance
 */
function drawScene(inst) {
  const { k, hero, hoveredAntiHero, particlesBg, stars, grassField, arrows, centerX, centerY, antiHeroes, sectionLabels, progress } = inst
  
  //
  // Get gray color from first anti-hero (same as inactive anti-heroes use)
  //
  const grayColorHex = antiHeroes && antiHeroes.length > 0 ? antiHeroes[0].grayColor : '#656565'  // Body color of inactive anti-heroes
  const grayOutlineColorHex = '#1A1A1A'  // Outline color of inactive anti-heroes
  const grayColorRgb = getRGB(k, grayColorHex)
  const grayOutlineColorRgb = getRGB(k, grayOutlineColorHex)
  
  //
  // Draw menu background image (darkened)
  //
  drawMenuBackground(inst)
  //
  // Swaying grass on the horizon strip — fades out with the background when
  // hovering an anti-hero (opacity fade, see getMenuGrassTint)
  //
  Grass.draw(grassField)
  
  //
  // Draw stars with twinkling effect
  //
  stars.forEach(star => {
    star.twinklePhase += star.twinkleSpeed * k.dt()
    const twinkle = 0.5 + Math.sin(star.twinklePhase) * 0.5  // 0 to 1
    const currentOpacity = star.opacity * twinkle
    
    k.drawCircle({
      pos: k.vec2(star.x, star.y),
      radius: star.size,
      color: k.rgb(255, 255, 255),
      opacity: currentOpacity
    })
  })
  
  //
  // Draw trembling particles
  //
  Particles.draw(particlesBg)
  //
  // Draw arrows between anti-heroes in clockwise order (as curved arcs)
  //
  if (arrows && arrows.length > 0) {
    //
    // Arrow material matches time-level0 street lamp metal:
    // medium gray-blue body, black outline, and semi-transparent so they blend
    // with the menu background the same way distant lamp poles do.
    //
    const ARROW_COLOR = k.rgb(128, 130, 136)
    const ARROW_OUTLINE_COLOR = k.rgb(0, 0, 0)
    const ARROW_OPACITY = 0.78
    const ARROW_WIDTH = 9
    const ARROW_OUTLINE_WIDTH = 2
    const ARROW_START_OFFSET = 120  // Distance from anti-hero where arrow starts (increased for shorter arrows)
    const ARROW_END_OFFSET = 120  // Distance to anti-hero where arrow ends (increased for shorter arrows)
    const ARROWHEAD_SIZE = 22  // Arrowhead size
    const ARC_RADIUS_OFFSET = 5  // How far the arc curves outward (reduced to bring arrows closer to center)
    const ARC_SEGMENTS = 30  // Number of segments for smooth arc
    
    arrows.forEach(({ fromAntiHero, toAntiHero }) => {
      //
      // Only draw arrow if the source anti-hero's section is completed
      //
      if (!fromAntiHero.isCompleted) {
        return
      }
      
      //
      // Use ARROW_COLOR directly (same base color as inactive anti-hero sprites)
      //
      const arrowBodyColor = ARROW_COLOR
      const arrowOutlineColor = ARROW_OUTLINE_COLOR
      
      //
      // Get current positions of anti-heroes
      //
      const fromX = fromAntiHero.character.pos.x
      const fromY = fromAntiHero.character.pos.y
      const toX = toAntiHero.character.pos.x
      const toY = toAntiHero.character.pos.y
      
      //
      // Calculate angles from center to each anti-hero
      //
      const fromAngle = Math.atan2(fromY - centerY, fromX - centerX)
      const toAngle = Math.atan2(toY - centerY, toX - centerX)
      
      //
      // Calculate distance from center to anti-heroes
      //
      const fromDist = Math.sqrt((fromX - centerX) ** 2 + (fromY - centerY) ** 2)
      const toDist = Math.sqrt((toX - centerX) ** 2 + (toY - centerY) ** 2)
      const avgDist = (fromDist + toDist) / 2
      
      //
      // Normalize angles to 0-2π range
      //
      const normalizedFrom = ((fromAngle + Math.PI * 2) % (Math.PI * 2))
      const normalizedTo = ((toAngle + Math.PI * 2) % (Math.PI * 2))
      
      //
      // Calculate angle difference for clockwise direction
      //
      let angleDiff = normalizedTo - normalizedFrom
      if (angleDiff < 0) {
        angleDiff += Math.PI * 2
      }
      //
      // If angle is more than π, we're going the long way - take the shorter path
      //
      if (angleDiff > Math.PI) {
        angleDiff = angleDiff - Math.PI * 2
      }
      //
      // Ensure angle is positive (clockwise direction)
      //
      if (angleDiff < 0) {
        angleDiff = Math.abs(angleDiff)
      }
      
      //
      // Calculate start and end angles for the arrow
      // Arrow starts at some distance from first anti-hero (going clockwise)
      // Arrow ends at some distance before second anti-hero
      //
      // Convert pixel offsets to angular offsets
      const startAngleOffset = ARROW_START_OFFSET / avgDist
      const endAngleOffset = ARROW_END_OFFSET / avgDist
      
      // Calculate start angle (from first anti-hero + offset)
      const arrowStartAngle = normalizedFrom + startAngleOffset
      // Calculate end angle (to second anti-hero - offset)
      const arrowEndAngle = normalizedTo - endAngleOffset
      
      //
      // Calculate actual angle span of the arrow (clockwise)
      //
      let arrowAngleSpan = arrowEndAngle - arrowStartAngle
      // Normalize to 0-2π range
      if (arrowAngleSpan < 0) {
        arrowAngleSpan += Math.PI * 2
      }
      // If span is more than π, we're going the wrong way
      if (arrowAngleSpan > Math.PI) {
        arrowAngleSpan = arrowAngleSpan - Math.PI * 2
      }
      // Ensure positive (clockwise)
      if (arrowAngleSpan < 0) {
        arrowAngleSpan = Math.abs(arrowAngleSpan)
      }
      //
      // Ensure arrow doesn't span more than the space between anti-heroes
      //
      const maxSpan = Math.PI / 3  // 60 degrees for 6 anti-heroes
      if (arrowAngleSpan > maxSpan) {
        arrowAngleSpan = maxSpan
      }
      
      //
      // Calculate arc radius (closer to center than anti-heroes)
      //
      const arcRadius = avgDist - 40 + ARC_RADIUS_OFFSET  // Subtract more offset to bring arrows closer to center
      
      //
      // Draw arc using multiple line segments
      // Start from arrowStartAngle and go clockwise by arrowAngleSpan
      //
      const arcPoints = []
      const numSegments = Math.max(8, Math.floor(ARC_SEGMENTS * (arrowAngleSpan / (Math.PI / 3))))
      for (let i = 0; i <= numSegments; i++) {
        const t = i / numSegments
        const currentAngle = arrowStartAngle + arrowAngleSpan * t
        const x = centerX + Math.cos(currentAngle) * arcRadius
        const y = centerY + Math.sin(currentAngle) * arcRadius
        arcPoints.push({ x, y })
      }
      
      //
      // Draw arc outline pass: first segment extended backward for uniform back edge
      //
      for (let i = 0; i < arcPoints.length - 1; i++) {
        let p1x = arcPoints[i].x
        let p1y = arcPoints[i].y
        if (i === 0) {
          const dx = arcPoints[1].x - arcPoints[0].x
          const dy = arcPoints[1].y - arcPoints[0].y
          const len = Math.sqrt(dx * dx + dy * dy)
          p1x -= (dx / len) * ARROW_OUTLINE_WIDTH
          p1y -= (dy / len) * ARROW_OUTLINE_WIDTH
        }
        k.drawLine({
          p1: k.vec2(p1x, p1y),
          p2: k.vec2(arcPoints[i + 1].x, arcPoints[i + 1].y),
          width: ARROW_WIDTH + ARROW_OUTLINE_WIDTH * 2,
          color: arrowOutlineColor,
          opacity: ARROW_OPACITY
        })
      }
      //
      // Draw arc body pass on top of outline
      //
      for (let i = 0; i < arcPoints.length - 1; i++) {
        k.drawLine({
          p1: k.vec2(arcPoints[i].x, arcPoints[i].y),
          p2: k.vec2(arcPoints[i + 1].x, arcPoints[i + 1].y),
          width: ARROW_WIDTH,
          color: arrowBodyColor,
          opacity: ARROW_OPACITY
        })
      }
      
      //
      // Draw sharp arrowhead at the end (pointing to next anti-hero)
      // Position it BEYOND the end of the arc to make it appear at the actual end
      //
      const lastPoint = arcPoints[arcPoints.length - 1]
      const secondLastPoint = arcPoints[arcPoints.length - 2]
      
      //
      // Calculate the direction angle of the arrow at the end
      //
      const arrowAngle = Math.atan2(
        lastPoint.y - secondLastPoint.y,
        lastPoint.x - secondLastPoint.x
      )
      
      //
      // Move the tip point forward along the arc direction
      // This positions the triangle at the actual end of the visible arc
      //
      const tipOffset = ARROW_WIDTH + ARROW_OUTLINE_WIDTH  // Move tip forward more to align with arc end
      const actualTipX = lastPoint.x + Math.cos(arrowAngle) * tipOffset
      const actualTipY = lastPoint.y + Math.sin(arrowAngle) * tipOffset
      
      //
      // Create triangle pointing forward
      // Make it blunter by increasing the spread angle to π/6 (30 degrees on each side)
      //
      const baseAngle = arrowAngle + Math.PI  // 180 degrees back
      const spreadAngle = Math.PI / 6  // 30 degrees spread (blunter triangle)
      
      //
      // Calculate base points: go back from tip, then spread left/right
      //
      const baseLeftAngle = baseAngle - spreadAngle
      const baseRightAngle = baseAngle + spreadAngle
      
      //
      // Tip point is pushed forward from the last arc point
      //
      const tipPoint = k.vec2(actualTipX, actualTipY)
      const baseLeft = k.vec2(
        actualTipX + Math.cos(baseLeftAngle) * ARROWHEAD_SIZE,
        actualTipY + Math.sin(baseLeftAngle) * ARROWHEAD_SIZE
      )
      const baseRight = k.vec2(
        actualTipX + Math.cos(baseRightAngle) * ARROWHEAD_SIZE,
        actualTipY + Math.sin(baseRightAngle) * ARROWHEAD_SIZE
      )
      
      //
      // Outline triangle (larger) - ensure tip is also outlined
      //
      const outlineSize = ARROWHEAD_SIZE + ARROW_OUTLINE_WIDTH + 1
      const outlineLeft = k.vec2(
        actualTipX + Math.cos(baseLeftAngle) * outlineSize,
        actualTipY + Math.sin(baseLeftAngle) * outlineSize
      )
      const outlineRight = k.vec2(
        actualTipX + Math.cos(baseRightAngle) * outlineSize,
        actualTipY + Math.sin(baseRightAngle) * outlineSize
      )
      //
      // Extend tip forward for outline to ensure tip is outlined
      //
      const outlineTipX = actualTipX + Math.cos(arrowAngle) * (ARROW_OUTLINE_WIDTH + 1)
      const outlineTipY = actualTipY + Math.sin(arrowAngle) * (ARROW_OUTLINE_WIDTH + 1)
      const outlineTipPoint = k.vec2(outlineTipX, outlineTipY)
      //
      // Draw filled polygon for outline (black) - includes extended tip
      //
      k.drawPolygon({
        pts: [outlineTipPoint, outlineLeft, outlineRight],
        color: arrowOutlineColor,
        opacity: ARROW_OPACITY
      })
      //
      // Draw main filled triangle (gray)
      //
      k.drawPolygon({
        pts: [tipPoint, baseLeft, baseRight],
        color: arrowBodyColor,
        opacity: ARROW_OPACITY
      })
    })
  }
  
  //
  // Draw lightning between hero and hovered anti-hero
  // Only for incomplete sections that match the current section being played
  // OR if localStorage is empty, show electricity on touch anti-hero when hovered
  //
  const lastLevel = get('lastLesson', null)
  const isEmptyLocalStorage = lastLevel === null
  
  if (isEmptyLocalStorage) {
    //
    // Find touch anti-hero when localStorage is empty (touch is the first section)
    // Show electricity only when hovering over it
    //
    const touchAntiHero = antiHeroes.find(ah => ah.section === 'touch')
    if (touchAntiHero && !touchAntiHero.isCompleted && hoveredAntiHero === touchAntiHero) {
      const heroPos = { x: hero.pos.x, y: hero.pos.y }
      const antiHeroPos = { 
        x: touchAntiHero.character.pos.x, 
        y: touchAntiHero.character.pos.y 
      }
      
      //
      // Draw electric connection
      //
      drawConnectionWave(k, heroPos, antiHeroPos, {
        segmentWidth: 8,
        mainWidth: 3,
        opacity: 0.6,
        heartbeatPhase: inst.heartbeatPhase
      })
    }
  } else if (hoveredAntiHero && !hoveredAntiHero.isCompleted && inst.currentSection && hoveredAntiHero.section === inst.currentSection) {
    const heroPos = { x: hero.pos.x, y: hero.pos.y }
    const antiHeroPos = { 
      x: hoveredAntiHero.character.pos.x, 
      y: hoveredAntiHero.character.pos.y 
    }
    
    //
    // Draw electric connection
    //
    drawConnectionWave(k, heroPos, antiHeroPos, {
      segmentWidth: 8,
      mainWidth: 3,
      opacity: 0.6,
      heartbeatPhase: inst.heartbeatPhase
    })
  }
  //
  // Draw prohibited sign over hovered anti-hero when their section is locked
  //
  if (hoveredAntiHero && isAntiHeroLocked(hoveredAntiHero, progress, inst.currentSection)) {
    drawProhibitedSign(k, hoveredAntiHero.character.pos.x, hoveredAntiHero.character.pos.y)
  }
}
//
// Hides menu sprites and paints a solid background while assets load for the next scene
//
function beginMenuSceneLeave(k, inst) {
  if (inst.isLeavingScene) return
  inst.isLeavingScene = true
  k.setBackground(k.rgb(MENU_LEAVE_BG_R, MENU_LEAVE_BG_G, MENU_LEAVE_BG_B))
  k.canvas?.style.setProperty('background-color', `rgb(${MENU_LEAVE_BG_R}, ${MENU_LEAVE_BG_G}, ${MENU_LEAVE_BG_B})`, 'important')
  inst.heroInst?.character && (inst.heroInst.character.hidden = true)
  inst.antiHeroes?.forEach((antiHeroInst) => {
    antiHeroInst.character && (antiHeroInst.character.hidden = true)
  })
  inst.sectionLabels?.forEach((entry) => {
    entry.allObjects.forEach(obj => { obj.hidden = true })
  })
  inst.title && hideTitle(inst.title)
}
//
// Returns true when the given anti-hero's section cannot be accessed yet:
// the previous section must be completed first.
//
function isAntiHeroLocked(antiHeroInst, progress, currentSection) {
  const sectionOrder = ['glow', 'touch', 'word', 'time', 'feel', 'mind']
  const idx = sectionOrder.indexOf(antiHeroInst.section)
  if (idx <= 0) return false
  const prevSection = sectionOrder[idx - 1]
  const isPrevCompleted = progress[prevSection]?.completed || false
  return !isPrevCompleted && !antiHeroInst.isCompleted && antiHeroInst.section !== currentSection
}
//
// Draws a crimson ⊘ prohibition ring + slash centered on (cx, cy).
// The circle encircles the anti-hero sprite, creating a "wearing the sign" look.
//
function drawProhibitedSign(k, cx, cy) {
  const t = k.time()
  const r = PROHIBITED_RING_RADIUS + Math.sin(t * PROHIBITED_PULSE_SPEED * 0.7) * 2
  const [pr, pg, pb] = parseHex(PROHIBITED_COLOR)
  const color = k.rgb(pr, pg, pb)
  //
  // Red ring outline drawn as arc segments — circle is empty inside (no fill)
  //
  for (let i = 0; i < PROHIBITED_RING_SEGMENTS; i++) {
    const a1 = (i / PROHIBITED_RING_SEGMENTS) * Math.PI * 2
    const a2 = ((i + 1) / PROHIBITED_RING_SEGMENTS) * Math.PI * 2
    k.drawLine({
      p1: k.vec2(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r),
      p2: k.vec2(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r),
      width: PROHIBITED_RING_WIDTH,
      color,
      opacity: PROHIBITED_SIGN_OPACITY
    })
  }
}
//
// Draws only the diagonal slash (⊘ prohibition style) — called at high z-index so the
// slash appears in front of the anti-hero sprite.
//
function drawProhibitedSlashFront(k, inst) {
  const { hoveredAntiHero, progress, currentSection } = inst
  if (!hoveredAntiHero || !isAntiHeroLocked(hoveredAntiHero, progress, currentSection)) return
  const cx = hoveredAntiHero.character.pos.x
  const cy = hoveredAntiHero.character.pos.y
  const t = k.time()
  const r = PROHIBITED_RING_RADIUS + Math.sin(t * PROHIBITED_PULSE_SPEED * 0.7) * 2
  const [pr, pg, pb] = parseHex(PROHIBITED_COLOR)
  const color = k.rgb(pr, pg, pb)
  const slashR = r * 0.72
  k.drawLine({
    p1: k.vec2(cx - slashR, cy - slashR),
    p2: k.vec2(cx + slashR, cy + slashR),
    width: PROHIBITED_SLASH_WIDTH,
    color,
    opacity: PROHIBITED_SIGN_OPACITY
  })
}
//
// Draws a green checkmark on completed anti-heroes when hovered — rendered at
// high z-index so it appears in front of the anti-hero sprite.
//
function drawCompletedCheckmarkFront(k, inst) {
  const { hoveredAntiHero } = inst
  if (!hoveredAntiHero || !hoveredAntiHero.isCompleted) return
  const cx = hoveredAntiHero.character.pos.x
  const cy = hoveredAntiHero.character.pos.y
  const pulse = 0.9 + 0.1 * Math.sin(k.time() * CHECKMARK_PULSE_SPEED)
  const s = CHECKMARK_SIZE * pulse
  const color = k.rgb(CHECKMARK_COLOR_R, CHECKMARK_COLOR_G, CHECKMARK_COLOR_B)
  const op = CHECKMARK_OPACITY
  //
  // Two lines forming a ✓: short down-right stroke, then long up-right stroke.
  // A filled circle at the junction ensures no gap appears when the pulse animates.
  //
  const jx = cx - s * 0.1
  const jy = cy + s * 0.45
  k.drawLine({ p1: k.vec2(cx - s * 0.55, cy), p2: k.vec2(jx, jy), width: CHECKMARK_WIDTH, color, opacity: op })
  k.drawLine({ p1: k.vec2(jx, jy), p2: k.vec2(cx + s * 0.65, cy - s * 0.45), width: CHECKMARK_WIDTH, color, opacity: op })
  k.drawCircle({ pos: k.vec2(jx, jy), radius: CHECKMARK_WIDTH / 2, color, opacity: op })
}
//
// Draw menu background with section-specific fade transitions
//
function drawMenuBackground(inst) {
  const { k, bgDefaultOpacity } = inst
  //
  // Draw the combined static background sprite with fade (hidden when
  // hovering an anti-hero). The darkening is already baked into the image.
  //
  bgDefaultOpacity > 0.01 && k.drawSprite({
    sprite: MENU_STATIC_SPRITE,
    pos: k.vec2(-MENU_BG_EDGE_OVERSCAN, -MENU_BG_EDGE_OVERSCAN),
    width: k.width() + MENU_BG_EDGE_OVERSCAN * 2,
    height: k.height() + MENU_BG_EDGE_OVERSCAN * 2,
    opacity: bgDefaultOpacity
  })
}
//
// Bakes the combined static menu background ONCE per session: the black
// base plus the menu-bg picture (moon, tree layers, rocks, roots,
// mushrooms) at its darkening alpha, loaded as a single sprite.
//
let menuStaticSpriteBaked = false
function buildMenuStaticSprite(k) {
  if (menuStaticSpriteBaked) return
  menuStaticSpriteBaked = true
  const canvas = document.createElement('canvas')
  canvas.width = MENU_BG_CANVAS_W
  canvas.height = MENU_BG_CANVAS_H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = CFG.visual.colors.ready.background
  ctx.fillRect(0, 0, MENU_BG_CANVAS_W, MENU_BG_CANVAS_H)
  //
  // The picture's plain sky/underground bands are filled with the same READY
  // background colour the menu uses, so blended over the same colour they
  // disappear — no horizontal strips above and below the composition.
  //
  const bgCanvas = generateMenuBackgroundCanvas(CFG.visual.colors.ready.background)
  ctx.globalAlpha = MENU_BG_BASE_OPACITY
  ctx.drawImage(bgCanvas, 0, 0)
  ctx.globalAlpha = 1
  bgCanvas.width = 0
  bgCanvas.height = 0
  k.loadSprite(MENU_STATIC_SPRITE, canvas)
  canvas.width = 0
  canvas.height = 0
}
//
// Grass tint for the menu horizon: the shared glow grass green fading OUT
// through opacity together with the background when an anti-hero is hovered
// (never darkening toward black — the blades keep their colour while they
// dissolve).
//
function getMenuGrassTint(inst) {
  const op = inst.bgDefaultOpacity
  if (op <= 0.01) return null
  return {
    r: MENU_GRASS_TINT_R,
    g: MENU_GRASS_TINT_G,
    b: MENU_GRASS_TINT_B,
    opacity: op
  }
}
/**
 * Creates the per-letter progress label displayed below each anti-hero.
 * Colored letters = current level and every level before it; gray = not yet reached.
 * For the touch section the last letter "H" always hangs lower and sways.
 * @param {Object} k - Kaplay instance
 * @param {Object} config - Section config object from getSectionPositions()
 * @param {Object} progress - Full progress object from getProgress()
 * @param {string|null} lastLevel - Value of get('lastLesson')
 * @param {string} grayColor - Hex string for inactive/gray letters
 * @param {boolean} [visible=true] - When false, shows "unknown" instead of letter sequence
 * @returns {Object} Label entry stored in sectionLabels[]
 */
function createSectionProgressLabel(k, config, progress, lastLevel, grayColor, visible = true) {
  const section = config.section
  //
  // Sections the player hasn't reached yet: hide the label entirely.
  // The word "unknown" will appear in the floating hover-title instead.
  //
  if (!visible) {
    return {
      letters: [],
      fallingH: [],
      allObjects: [],
      labelVisible: false,
      section,
      sectionColor: grayColor,
      grayColor,
      isCompleted: false
    }
  }
  const letters = SECTION_LETTERS[section] || [section.toUpperCase()]
  const activeLetterIndex = getSectionActiveLetterIndex(section, lastLevel, progress)
  const allLettersActive = activeLetterIndex === -2
  //
  // Time section always uses the anti-hero's orange/yellow, matching the in-game HUD indicator
  //
  const sectionColor = section === 'time' ? '#FF8C00' : config.color.body
  //
  // Layout: center the word at (config.x, config.y + 55)
  //
  const fontSize = SECTION_LABEL_FONT_SIZE
  const spacing = SECTION_LABEL_LETTER_SPACING
  const letterStep = fontSize + spacing
  const totalWidth = letters.length * letterStep - spacing
  const baseX = config.x - totalWidth / 2 + fontSize / 2
  const baseY = config.y + 55
  const fallingExtraY = Math.round(fontSize * TOUCH_H_Y_RATIO)
  //
  // Drop shadow (single black copy offset right+down) — the same text
  // shadow style the glow level uses.
  //
  const outlineOffsets = [
    { dx: 1, dy: 1 }
  ]
  const letterEntries = []
  const fallingH = []
  const allObjects = []
  letters.forEach((letter, i) => {
    const isFalling = section === 'touch' && i === TOUCH_H_INDEX
    const isActive = allLettersActive || (activeLetterIndex >= 0 && i <= activeLetterIndex)
    const colorHex = isFalling && !isActive ? grayColor : (isActive ? sectionColor : grayColor)
    const { r, g, b } = getRGB(k, colorHex)
    const lx = baseX + i * letterStep
    const ly = isFalling ? baseY + fallingExtraY : baseY
    const lxOff = isFalling ? TOUCH_H_X_OFFSET : 0
    //
    // Black drop shadow — shown only when hovered / current section.
    // Falling H uses the default topleft anchor so rotation pivots at the
    // top-left corner of the glyph (the top of the left vertical stroke),
    // giving a natural pendulum hang.  Regular letters keep anchor('center').
    //
    const outlines = outlineOffsets.map(({ dx, dy }) => {
      const components = [
        k.text(letter, { size: fontSize }),
        k.pos(lx + lxOff + dx, ly + dy),
        k.color(0, 0, 0),
        k.opacity(0),
        k.z(99)
      ]
      !isFalling && components.push(k.anchor('center'))
      const outlineObj = k.add(components)
      isFalling && (outlineObj.angle = TOUCH_H_TILT)
      allObjects.push(outlineObj)
      return outlineObj
    })
    //
    // Main colored letter on top
    //
    const mainComponents = [
      k.text(letter, { size: fontSize }),
      k.pos(lx + lxOff, ly),
      k.color(r, g, b),
      k.z(100)
    ]
    !isFalling && mainComponents.push(k.anchor('center'))
    const mainObj = k.add(mainComponents)
    isFalling && (mainObj.angle = TOUCH_H_TILT)
    allObjects.push(mainObj)
    letterEntries.push({ main: mainObj, outlines })
    if (isFalling) {
      fallingH.push(mainObj, ...outlines)
    }
  })
  return {
    letters: letterEntries,
    fallingH,
    allObjects,
    section,
    sectionColor,
    grayColor,
    isCompleted: progress[section]?.completed || false,
    labelVisible: true
  }
}

