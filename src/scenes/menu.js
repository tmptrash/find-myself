import * as Sound from "../utils/sound.js"
import { CFG } from "../cfg.js"
import { getRGB, parseHex } from "../utils/helper.js"
import * as Hero from "../components/hero.js"
import { createLevelTransition, showTransitionToLevel } from "../utils/transition.js"
import { getProgress, get, resetProgress } from "../utils/progress.js"
import { drawConnectionWave } from "../utils/connection.js"
import * as Particles from "../utils/particles.js"
//
// Section colors configuration (body color only, outline is always black)
// All colors are imported from global config (CFG.visual.colors.sections)
//
const SECTION_COLORS = {
  word: CFG.visual.colors.sections.word,
  touch: CFG.visual.colors.sections.touch,
  feel: CFG.visual.colors.sections.feel,
  mind: CFG.visual.colors.sections.mind,
  stress: CFG.visual.colors.sections.stress,
  time: CFG.visual.colors.sections.time
}
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

/**
 * Get section name for display (singular form)
 * @param {string} section - Section name
 * @returns {string} Section name in singular form
 */
function getSectionDisplayName(section) {
  //
  // Return section name as-is (singular form)
  //
  return section
}

/**
 * Get section label positions (arranged in circle)
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {number} radius - Circle radius
 * @returns {Array} Array of section configs with positions
 */
function getSectionPositions(centerX, centerY, radius) {
  const sections = ['word', 'touch', 'feel', 'mind', 'stress', 'time']
  const angleStep = (Math.PI * 2) / 6  // 360 / 6 = 60 degrees
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
    // Reset background color to black (in case coming from time section)
    //
    k.setBackground(k.Color.fromHex("#000000"))
    //
    // Clean up persistent word-pile objects from previous scenes
    //
    k.get("word-pile-text").forEach(obj => obj.destroy())
    k.get("word-pile-outline").forEach(obj => obj.destroy())
    k.get("flying-word").forEach(obj => obj.destroy())
    //
    // Clean up life.png sprite from level indicators
    //
    k.get("life").forEach(obj => obj.destroy())
    
    //
    // Reset flying words instance so it can be recreated in next level
    //
    k.flyingWordsInstance = null
    
    //
    // Ensure default custom cursor is visible when entering menu
    //
    k.canvas.classList.remove('cursor-pointer')
    k.canvas.style.removeProperty('cursor')
    
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
      baseOpacity: 0.8,
      flickerSpeed: 1.5,
      trembleRadius: 12,
      gaussianFactor: 0.35,
      disableMouseInteraction: true
    })
    
    const progress = getProgress()
    const lastLevel = get('lastLevel', null)
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
    // Use gray color like in time section
    //
    const heroBodyColor = progress.time ? "#FF8C00" : "#C0C0C0"  // Yellow if time complete, gray otherwise
    const heroInst = Hero.create({
      k,
      x: centerX,
      y: centerY,
      type: Hero.HEROES.HERO,
      scale: 5,
      controllable: false,
      addMouth: Boolean(progress.word),
      bodyColor: heroBodyColor
    })
    
    const hero = heroInst.character
    hero.z = 10
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
      const isCompleted = progress[config.section]
      //
      // Always create with gray body (sprite generation)
      // Color tint will be applied in onUpdate for completed/hovered sections
      // For time section when completed, use yellow color
      //
      const grayColor = '#656565'
      const grayOutlineColor = '#454545'
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
        scale: 3,
        controllable: false,
        bodyColor,
        outlineColor,
        addMouth: config.section === 'word',
        addArms: config.section === 'touch',
        hitboxPadding: 5
      })
      //
      // Preload section color variant with black outline for hover/completed state
      //
      Hero.loadHeroSprites({
        k,
        type: Hero.HEROES.ANTIHERO,
        bodyColor: grayColor,
        outlineColor: CFG.visual.colors.outline,
        addMouth: config.section === 'word',
        addArms: config.section === 'touch'
      })
      //
      // For time section, also preload yellow variant
      //
      if (config.section === 'time') {
        Hero.loadHeroSprites({
          k,
          type: Hero.HEROES.ANTIHERO,
          bodyColor: yellowColor,
          outlineColor: CFG.visual.colors.outline
        })
      }
      //
      // Cache sprite prefixes for outline switching
      // Remove # from colors to match loadHeroSprites prefix format
      //
      const grayColorNoHash = grayColor.replace('#', '')
      const grayOutlineColorNoHash = grayOutlineColor.replace('#', '')
      const outlineColorNoHash = CFG.visual.colors.outline.replace('#', '')
      const yellowColorNoHash = yellowColor.replace('#', '')
      antiHeroInst.spritePrefixGray = `${Hero.HEROES.ANTIHERO}_${grayColorNoHash}_${grayOutlineColorNoHash}${config.section === 'word' ? '_mouth' : ''}${config.section === 'touch' ? '_arms' : ''}`
      antiHeroInst.spritePrefixBlack = `${Hero.HEROES.ANTIHERO}_${grayColorNoHash}_${outlineColorNoHash}${config.section === 'word' ? '_mouth' : ''}${config.section === 'touch' ? '_arms' : ''}`
      antiHeroInst.spritePrefixYellow = config.section === 'time' ? `${Hero.HEROES.ANTIHERO}_${yellowColorNoHash}_${outlineColorNoHash}` : null
      antiHeroInst.currentPrefix = isCompleted ? antiHeroInst.spritePrefixBlack : antiHeroInst.spritePrefixGray
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
      
      //
      // Add click handlers for implemented sections
      // Only if section is not completed AND previous section is completed (or it's the first section)
      //
      const sectionOrder = ['time', 'word', 'touch', 'feel', 'mind', 'stress']
      const currentIndex = sectionOrder.indexOf(config.section)
      const previousIndex = currentIndex === 0 ? sectionOrder.length - 1 : currentIndex - 1
      const previousSection = sectionOrder[previousIndex]
      const isPreviousCompleted = progress[previousSection] || false
      const canAccess = currentIndex === 0 || isPreviousCompleted  // First section is always accessible
      
      if (config.section === 'word' && !isCompleted && canAccess) {
        antiHeroInst.character.onClick(() => {
          //
          // Mark that we're leaving the scene
          //
          inst.isLeavingScene = true
          
          //
          // Stop ambient sound
          //
          Sound.stopAmbient(sound)
          
          //
          // Reset cursor to default (remove pointer class)
          //
          k.canvas.classList.remove('cursor-pointer')
          
          //
          // Get last level for word section or start from beginning
          //
          const isWordLevel = lastLevel && lastLevel.startsWith('level-word.')
          
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
      
      if (config.section === 'touch' && !isCompleted && canAccess) {
        antiHeroInst.character.onClick(() => {
          //
          // Mark that we're leaving the scene
          //
          inst.isLeavingScene = true
          
          //
          // Stop ambient sound
          //
          Sound.stopAmbient(sound)
          
          //
          // Reset cursor to default (remove pointer class)
          //
          k.canvas.classList.remove('cursor-pointer')
          
          //
          // Stop music
          //
          menuMusic.stop()
          kidsMusic.stop()
          
          //
          // Determine which level to go to
          //
          const lastLevel = get('lastLevel', null)
          
          if (lastLevel && lastLevel.startsWith('level-touch.')) {
            //
            // Go to the last played touch level with transition (show subtitle)
            //
            showTransitionToLevel(k, lastLevel)
          } else {
            //
            // Go to touch level 0 with transition
            //
            createLevelTransition(k, 'menu-touch')
          }
        })
      }
      
      if (config.section === 'time' && !isCompleted && canAccess) {
        antiHeroInst.character.onClick(() => {
          //
          // Mark that we're leaving the scene
          //
          inst.isLeavingScene = true
          
          //
          // Stop ambient sound
          //
          Sound.stopAmbient(sound)
          
          //
          // Reset cursor to default (remove pointer class)
          //
          k.canvas.classList.remove('cursor-pointer')
          
          //
          // Stop music
          //
          menuMusic.stop()
          kidsMusic.stop()
          
          //
          // Get last level for time section or start from beginning
          //
          const isTimeLevel = lastLevel && lastLevel.startsWith('level-time.')
          
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
      // Add section label below anti-hero (in singular form)
      //
      const displayName = getSectionDisplayName(config.section)
      const labelText = displayName
      
      const labelColor = isCompleted ? getRGB(k, bodyColor) : getRGB(k, grayColor)
      const labelPosX = config.x
      const labelPosY = config.y + 50
      const label = k.add([
        k.text(labelText, { size: 18 }),
        k.pos(labelPosX, labelPosY),
        k.anchor("center"),
        k.color(labelColor.r, labelColor.g, labelColor.b),
        k.z(100)
      ])
      const outlineOffsets = [
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 }
      ]
      const labelOutlines = outlineOffsets.map(offset => {
        const outlineNode = k.add([
          k.text(labelText, { size: 18 }),
          k.pos(labelPosX + offset.dx, labelPosY + offset.dy),
          k.anchor("center"),
          k.color(0, 0, 0),
          k.opacity(0),
          k.z(99)
        ])
        return { node: outlineNode, dx: offset.dx, dy: offset.dy }
      })
      
      sectionLabels.push({
        label,
        outlines: labelOutlines,
        section: config.section,
        sectionColor: config.color.body,
        grayColor,
        isCompleted
      })
    })
    
    //
    // Create arrows pointing clockwise from one anti-hero to the next
    //
    const grayColorHex = '#656565'
    const grayOutlineColorHex = '#454545'
    const grayColorRgb = getRGB(k, grayColorHex)
    const grayOutlineColorRgb = getRGB(k, grayOutlineColorHex)
    const ARROW_COLOR = k.rgb(grayColorRgb.r, grayColorRgb.g, grayColorRgb.b)  // Same gray color as unselected anti-heroes
    const ARROW_OUTLINE_COLOR = k.rgb(grayOutlineColorRgb.r, grayOutlineColorRgb.g, grayOutlineColorRgb.b)  // Same gray outline as unselected anti-heroes
    const ARROW_OPACITY = 1.0
    const ARROW_WIDTH = 8  // Thick arrows
    const ARROW_OUTLINE_WIDTH = 3  // Outline width (increased by 1 pixel)
    const ARROW_OFFSET = 35  // Distance from anti-hero center
    const ARROWHEAD_SIZE = 22  // Arrowhead size
    const ARC_RADIUS_OFFSET = 5  // How far the arc curves outward (reduced to bring arrows closer to center)
    
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
    // Scene instance with all state
    //
    const inst = {
      k,
      centerX,
      centerY,
      hero,
      sound,
      particlesBg,
      stars,  // Add stars to instance
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
      isLeavingScene: false,
      heartbeatPhase: 0,
      lastHeartbeatTime: 0
    }
    
    //
    // Track mouse position and check for hover over anti-heroes
    //
    k.onUpdate(() => {
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
      // Update colors for all anti-heroes based on hover state
      //
      antiHeroes.forEach(antiHeroInst => {
        //
        // Determine target color and sprite based on state
        //
        let targetColor
        let desiredPrefix
        const isHovered = antiHeroInst === hoveredInst
        const shouldUseBlackOutline = isHovered || antiHeroInst.isCompleted
        //
        // Special handling for time section: use yellow when completed
        //
        if (antiHeroInst.section === 'time' && antiHeroInst.isCompleted) {
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
          // Hovered OR completed: show section color
          //
          targetColor = antiHeroInst.sectionColor
          desiredPrefix = antiHeroInst.spritePrefixBlack
        } else {
          //
          // Not hovered and not completed: gray
          //
          targetColor = antiHeroInst.grayColor
          desiredPrefix = antiHeroInst.spritePrefixGray
        }
        //
        // Apply color tint (but not for time section with yellow sprite, as sprite already has correct color)
        //
        if (!(antiHeroInst.section === 'time' && (antiHeroInst.isCompleted || isHovered))) {
          const rgb = getRGB(k, targetColor)
          antiHeroInst.character.color = k.rgb(rgb.r, rgb.g, rgb.b)
        } else {
          //
          // For time section with yellow sprite, use white tint (no color modification)
          //
          antiHeroInst.character.color = k.rgb(255, 255, 255)
        }
        //
        // Switch sprite variant if needed
        //
        if (antiHeroInst.currentPrefix !== desiredPrefix) {
          antiHeroInst.currentPrefix = desiredPrefix
          antiHeroInst.spritePrefix = desiredPrefix
          antiHeroInst.character.use(k.sprite(`${desiredPrefix}_0_0`))
        }
      })
      
      //
      // Update section labels: color + outline on hover/completed/current
      // If section is completed, highlight the NEXT section instead (the one player can play)
      //
      const sectionOrder = ['time', 'word', 'touch', 'feel', 'mind', 'stress']
      
      sectionLabels.forEach(entry => {
        const { label, outlines, section, sectionColor, grayColor, isCompleted } = entry
        const isHover = hoveredInst && hoveredInst.section === section
        const isCurrent = inst.currentSection === section
        
        //
        // If section is completed, don't highlight it
        // Instead, check if this is the next section after a completed one
        // BUT: if currentSection is set (player is playing a section), highlight that section instead
        //
        let isNextAfterCompleted = false
        if (!isCompleted && !inst.currentSection) {
          //
          // Only check for "next after completed" if player is not currently playing any section
          // Check if previous section is completed (this means player can play this section)
          //
          const currentIndex = sectionOrder.indexOf(section)
          const previousIndex = currentIndex === 0 ? sectionOrder.length - 1 : currentIndex - 1
          const previousSection = sectionOrder[previousIndex]
          const previousEntry = sectionLabels.find(e => e.section === previousSection)
          if (previousEntry && previousEntry.isCompleted) {
            isNextAfterCompleted = true
          }
        }
        
        //
        // Highlight if: hovered, current, or next after completed (and not completed itself)
        // Priority: current > hover > next after completed
        //
        const useHighlight = !isCompleted && (isCurrent || isHover || isNextAfterCompleted)
        
        //
        // Special handling for time section: use yellow only when hovered or current
        //
        let targetColor
        if (section === 'time' && useHighlight) {
          targetColor = '#FF8C00'  // Anti-hero orange/yellow color (matches hero in time-complete)
        } else {
          targetColor = useHighlight ? sectionColor : grayColor
        }
        
        const labelRgb = getRGB(k, targetColor)
        label.color = k.rgb(labelRgb.r, labelRgb.g, labelRgb.b)
        const outlineOpacity = useHighlight ? 1 : 0
        outlines.forEach(outlineObj => {
          outlineObj.node.opacity = outlineOpacity
          outlineObj.node.pos.x = label.pos.x + outlineObj.dx
          outlineObj.node.pos.y = label.pos.y + outlineObj.dy
        })
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
          const sectionOrder = ['time', 'word', 'touch', 'feel', 'mind', 'stress']
          const currentIndex = sectionOrder.indexOf(hoveredInst.section)
          const previousIndex = currentIndex === 0 ? sectionOrder.length - 1 : currentIndex - 1
          const previousSection = sectionOrder[previousIndex]
          const previousAntiHero = antiHeroes.find(ah => ah.section === previousSection)
          const isPreviousCompleted = previousAntiHero ? previousAntiHero.isCompleted : false
          
          //
          // Word, touch, and time sections are clickable
          // Can access if: previous section is completed (or it's the first section) OR if this is the current section being played
          //
          const isImplementedSection = (hoveredInst.section === 'word' || hoveredInst.section === 'touch' || hoveredInst.section === 'time')
          const isCurrentSection = inst.currentSection === hoveredInst.section
          const canAccess = isCurrentSection || (currentIndex === 0 || isPreviousCompleted)  // Current section is always accessible, or first section, or previous completed
          
          if (isImplementedSection && !hoveredInst.isCompleted && canAccess) {
            k.canvas.classList.add('cursor-pointer')
          } else {
            //
            // Remove pointer class to use default CSS cursor
            //
            k.canvas.classList.remove('cursor-pointer')
          }
        } else {
          k.canvas.classList.remove('cursor-pointer')
        }
      }
      
      inst.hoveredAntiHero = hoveredInst
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
        // Play heartbeat sound for current section anti-hero OR time anti-hero when localStorage is empty
        //
        const lastLevel = get('lastLevel', null)
        const isEmptyLocalStorage = lastLevel === null
        const timeAntiHero = antiHeroes.find(ah => ah.section === 'time')
        const isTimeAntiHeroHover = isEmptyLocalStorage && timeAntiHero && !timeAntiHero.isCompleted && hoveredInst === timeAntiHero
        
        if (isCurrentSectionHover || isTimeAntiHeroHover) {
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
    k.onDraw(() => drawScene(inst))
  
    //
    // Check if there's a saved game
    //
    const hasSavedGame = lastLevel !== null
    
    //
    // Hint text - Space to continue, Enter to start new, ESC to go back
    // If all sections completed, don't show continue option
    //
    const allCompleted = progress.word && progress.touch  // Both implemented sections
    
    let hintText
    if (allCompleted) {
      hintText = "Enter - new game  |  ESC - back"
    } else if (hasSavedGame) {
      hintText = "Space - continue  |  Enter - new game  |  ESC - back"
    } else {
      hintText = "Space or Enter - start  |  ESC - back"
    }
    //
    // Create outline shadows for hint text
    //
    const outlineOffsets = [
      { dx: -2, dy: 0 },
      { dx: 2, dy: 0 },
      { dx: 0, dy: -2 },
      { dx: 0, dy: 2 },
      { dx: -1, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: 1, dy: 1 }
    ]
    
    const startTextOutlines = []
    outlineOffsets.forEach(({ dx, dy }) => {
      const outline = k.add([
        k.text(hintText, { size: 20 }),
        k.pos(960 + dx, 1030 + dy),
      k.anchor("center"),
      k.opacity(1),
        k.color(0, 0, 0),
        k.z(99)
      ])
      startTextOutlines.push(outline)
    })
    
    const startText = k.add([
      k.text(hintText, { size: 20 }),
      k.pos(960, 1030),  // Fixed: k.width() / 2 = 960, k.height() - 50 = 1030
      k.anchor("center"),
      k.opacity(1),
      k.color(150, 150, 150), // Gray
      k.z(100)
    ])
    
    //
    // Smooth flicker animation for start text (like in ready scene)
    //
    const FLICKER_FADE_DURATION = 1.2
    const FLICKER_MIN_OPACITY = 0.5
    const FLICKER_MAX_OPACITY = 1.0
    
    let hintFlickerTime = FLICKER_FADE_DURATION  // Start at max opacity
    let hintDirection = -1  // Start fading down
    
    k.onUpdate(() => {
      //
      // Update flicker timer
      //
      hintFlickerTime += hintDirection * k.dt()
      
      //
      // Reverse direction at bounds
      //
      if (hintFlickerTime >= FLICKER_FADE_DURATION) {
        hintDirection = -1
        hintFlickerTime = FLICKER_FADE_DURATION
      } else if (hintFlickerTime <= 0) {
        hintDirection = 1
        hintFlickerTime = 0
      }
      
      //
      // Interpolate opacity between min and max
      //
      const progress = hintFlickerTime / FLICKER_FADE_DURATION
      const newOpacity = FLICKER_MIN_OPACITY + (FLICKER_MAX_OPACITY - FLICKER_MIN_OPACITY) * progress
      startText.opacity = newOpacity
      //
      // Update outline opacity
      //
      startTextOutlines.forEach(outline => {
        outline.opacity = newOpacity
      })
    })
    
    //
    // Start game controls
    // Space or Enter - Continue from last saved level or start from beginning
    //
    k.onKeyPress("space", () => {
      //
      // Don't allow starting if all sections are completed
      //
      if (allCompleted) {
        return
      }
      
      //
      // Mark that we're leaving the scene
      //
      inst.isLeavingScene = true
      
      Sound.stopAmbient(sound)
      //
      // Reset cursor to default (remove pointer class)
      //
      k.canvas.classList.remove('cursor-pointer')
      
      if (hasSavedGame) {
        //
        // Continue from last saved level with transition (show red text)
        //
        menuMusic.stop()
        kidsMusic.stop()
        showTransitionToLevel(k, lastLevel)
      } else {
        //
        // No save - start from time section level 0 with transition
        //
        menuMusic.stop()
        kidsMusic.stop()
        createLevelTransition(k, 'menu-time')
      }
    })
    
    k.onKeyPress("enter", () => {
      //
      // Mark that we're leaving the scene
      //
      inst.isLeavingScene = true
      
      Sound.stopAmbient(sound)
      menuMusic.stop()
      kidsMusic.stop()
      //
      // Reset cursor to default (remove pointer class)
      //
      k.canvas.classList.remove('cursor-pointer')
      
      //
      // Enter always starts from time section level 0 with transition
      //
      resetProgress()
      createLevelTransition(k, 'menu-time')
    })
    
    //
    // Back to ready scene (ESC)
    //
    k.onKeyPress("escape", () => {
      Sound.stopAmbient(sound)
      menuMusic.stop()
      kidsMusic.stop()
      k.go("ready")
    })
    
    //
    // Cleanup when leaving scene
    //
    k.onSceneLeave(() => {
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
        entry.label.destroy()
        entry.outlines.forEach(outlineObj => outlineObj.node.destroy())
      })
      
      //
      // Destroy title objects
      //
      inst.title.letters.forEach(letter => {
        letter.destroy()
      })
      
      startTextOutlines.forEach(outline => {
        outline.destroy()
      })
      startText.destroy()
      
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
  const text = "find"  // Only "find" word
  const titleSize = 32  // Smaller size (was 48)
  const amberColor = k.rgb(228, 155, 36)
  const dimColor = k.rgb(120, 120, 120)  // Gray (was amber-dimmed)
  const outlineOffsets = [
    { dx: -2, dy: 0 },
    { dx: 2, dy: 0 },
    { dx: 0, dy: -2 },
    { dx: 0, dy: 2 },
    { dx: -2, dy: -2 },
    { dx: 2, dy: -2 },
    { dx: -2, dy: 2 },
    { dx: 2, dy: 2 }
  ]
  
  //
  // Create each letter as separate object
  //
  const letters = []
  const outlineLetters = []
  const circleRadius = radius + 100  // Slightly smaller (was +120)
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    
    //
    // Outline shadows (four directions)
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
      k.color(dimColor),  // Start dimmed
      k.outline(0, k.rgb(0, 0, 0)),
      k.z(CFG.visual.zIndex.ui + 50),
      k.fixed()
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
    text,  // Single text
    circleRadius,
    centerX,
    centerY,
    angle: 0,  // Current angle on circle
    targetAngle: 0,  // Target angle when hovering
    isHovering: false,
    hoverAngle: 0,  // Angle of hovered anti-hero
    hoverRange: 0.3,  // Range of movement when hovering (radians)
    hoverPhase: 0,  // Phase for back-and-forth movement
    moveSpeed: 0.15,  // Normal rotation speed
    snapSpeed: 3.0,  // Fast snap to hover position
    amberColor,
    dimColor,
    isReversed: false,  // Current letter order
    targetReversed: false,  // Target letter order
    reverseFadePhase: 1.0,  // 1.0 = fully visible, 0.0 = invisible (for reversal)
    isReverseChanging: false,  // Is reversal fade animation active
    baseOpacity: 0.3  // Base opacity when not hovering (dimmed)
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
  // Determine if letters should be reversed based on angle
  // Text direction depends on position on circle (clockwise motion)
  // 
  // Angles (starting from -120° = top-left):
  // - Top-left (240°): 23 hours → normal (inverted)
  // - Top-right (300°): 13 hours → normal (inverted)
  // - Right (0°/360°): 15 hours → normal (inverted)
  // - Bottom-right (60°): 17 hours → reverse (inverted)
  // - Bottom-left (120°): 19 hours → reverse (inverted)
  // - Left (180°): 21 hours → reverse (inverted)
  //
  const normalizedAngle = ((titleInst.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  
  //
  // Convert to degrees for easier understanding (0° = right, increases counter-clockwise)
  //
  const degrees = (normalizedAngle * 180 / Math.PI)
  
  let shouldReverse = false
  
  //
  // Top-right quadrant (270° to 30°): normal (inverted from reverse)
  // This covers 13 hours (top-right) and 15 hours (right)
  //
  if (degrees >= 270 || degrees < 30) {
    shouldReverse = false
  }
  //
  // Right to bottom (30° to 150°): reverse (inverted from normal)
  // This covers 17 hours (bottom-right) and 19 hours (bottom-left)
  //
  else if (degrees >= 30 && degrees < 150) {
    shouldReverse = true
  }
  //
  // Left side (150° to 210°): reverse (inverted from normal)
  // This covers 21 hours (left)
  //
  else if (degrees >= 150 && degrees < 210) {
    shouldReverse = true
  }
  //
  // Top-left (210° to 270°): normal (inverted from reverse)
  // This covers 23 hours (top-left)
  //
  else if (degrees >= 210 && degrees < 270) {
    shouldReverse = false
  }
  
  //
  // Check if reversal state needs to change
  //
  if (shouldReverse !== titleInst.targetReversed) {
    titleInst.targetReversed = shouldReverse
    //
    // Start fade animation for reversal
    //
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
      //
      // Fade out (300ms = 0.3s, so speed = 1/0.3 = 3.33)
      //
      titleInst.reverseFadePhase -= dt * 3.33
      if (titleInst.reverseFadePhase <= 0) {
        titleInst.reverseFadePhase = 0
        //
        // Switch reversal at complete fade
        //
        titleInst.isReversed = titleInst.targetReversed
      }
    } else if (titleInst.reverseFadePhase < 1) {
      //
      // Fade in (400ms = 0.4s, so speed = 1/0.4 = 2.5) - slower than fade out
      //
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
      //
      // Just started hovering - calculate angle to anti-hero
      //
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
    
    //
    // Normalize angle difference to [-PI, PI]
    //
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
    // Change to anti-hero's color
    // Special handling for time section: use yellow color directly
    //
    let targetColor
    if (hoveredAntiHero.section === 'time') {
      //
      // For time section, use yellow color directly (not from character.color which is white for sprite)
      //
      const yellowRgb = getRGB(k, '#FF8C00')
      targetColor = k.rgb(yellowRgb.r, yellowRgb.g, yellowRgb.b)
    } else {
      targetColor = hoveredAntiHero.character.color
    }
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
    // Dim letters
    //
    titleInst.letters.forEach(letter => {
      const currentR = letter.color.r
      const targetR = titleInst.dimColor.r
      letter.color.r += (targetR - currentR) * 3 * dt
      letter.color.g += (titleInst.dimColor.g - letter.color.g) * 3 * dt
      letter.color.b += (titleInst.dimColor.b - letter.color.b) * 3 * dt
    })
  }
  
  //
  // Position each letter along the arc
  //
  const textLength = titleInst.text.length
  //
  // Arc length for "find" word
  //
  const arcLength = 0.3
  const angleStep = textLength > 1 ? arcLength / (textLength - 1) : 0
  
  titleInst.letters.forEach((letter, index) => {
    //
    // Update letter character if needed
    //
    const currentChar = titleInst.text[index]
    if (letter.text !== currentChar) {
      letter.text = currentChar
    }
    //
    // Update outline characters to match
    //
    const outlines = titleInst.outlineLetters[index]
    outlines.forEach(outline => {
      if (outline.node.text !== currentChar) {
        outline.node.text = currentChar
      }
    })
    
    //
    // Determine letter index based on order (reversed or not)
    //
    const displayIndex = titleInst.isReversed ? (textLength - 1 - index) : index
    
    //
    // Calculate angle for this letter
    //
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
    // Apply base opacity for dimming based on hover
    // Also apply reversal fade phase
    //
    const baseFinalOpacity = hoveredAntiHero ? 1.0 : titleInst.baseOpacity
    const finalOpacity = baseFinalOpacity * titleInst.reverseFadePhase
    letter.opacity = finalOpacity
    
    //
    // Toggle outline: black on hover (drawn with shadow letters), none when idle
    //
    const outlineOpacity = hoveredAntiHero ? finalOpacity : 0
    outlines.forEach(outline => {
      outline.node.pos.x = x + outline.dx
      outline.node.pos.y = y + outline.dy
      outline.node.angle = letter.angle
      outline.node.opacity = outlineOpacity
    })
    //
    // Disable text outline component to avoid conflicts (kept at 0)
    //
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
// Extract section name from level id (e.g., 'level-word.2' -> 'word')
//
function getSectionFromLevel(levelName) {
  if (!levelName || !levelName.startsWith('level-')) return null
  const withoutPrefix = levelName.slice('level-'.length)
  const parts = withoutPrefix.split('.')
  return parts[0] || null
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
  const { k, hero, hoveredAntiHero, particlesBg, stars, arrows, centerX, centerY, antiHeroes, sectionLabels, progress } = inst
  
  //
  // Get gray color from first anti-hero (same as inactive anti-heroes use)
  //
  const grayColorHex = antiHeroes && antiHeroes.length > 0 ? antiHeroes[0].grayColor : '#656565'  // Body color of inactive anti-heroes
  const grayOutlineColorHex = '#202020'  // Outline color of inactive anti-heroes
  const grayColorRgb = getRGB(k, grayColorHex)
  const grayOutlineColorRgb = getRGB(k, grayOutlineColorHex)
  
  //
  // Draw gray background (same color as level platforms)
  //
  const bgRgb = getRGB(k, CFG.visual.colors.menu.platformColor)
  k.drawRect({
    width: k.width(),
    height: k.height(),
    pos: k.vec2(0, 0),
    color: k.rgb(bgRgb.r, bgRgb.g, bgRgb.b)
  })
  
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
    // IMPORTANT: Anti-hero sprites are drawn with #656565 in canvas (see hero.js:1753, 1788)
    // But character.color is applied as a TINT on top of the sprite
    // For inactive anti-heroes, targetColor is grayColor (#656565) and it's applied as:
    // const rgb = getRGB(k, targetColor) -> k.rgb(101, 101, 101)
    // antiHeroInst.character.color = k.rgb(rgb.r, rgb.g, rgb.b) -> k.rgb(101, 101, 101)
    // 
    // This tint multiplies with the sprite color, so the final color is NOT #656565!
    // Let's use a LIGHTER color for the arrow to compensate for the multiplication
    //
    const inactiveGrayColorHex = '#454545'  // Lighter gray to compensate for tint multiplication
    const [r, g, b] = parseHex(inactiveGrayColorHex)
    //
    // Create color directly from hex values
    //
    const ARROW_COLOR = k.rgb(r, g, b)  // Lighter gray to match final displayed color
    const ARROW_OUTLINE_COLOR = k.rgb(grayOutlineColorRgb.r, grayOutlineColorRgb.g, grayOutlineColorRgb.b)  // Same gray outline as unselected anti-heroes
    const ARROW_OPACITY = 1.0
    const ARROW_WIDTH = 8  // Thick arrows
    const ARROW_OUTLINE_WIDTH = 3  // Outline width (increased by 1 pixel)
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
      // Draw arc segments with outline
      //
      for (let i = 0; i < arcPoints.length - 1; i++) {
        //
        // Draw outline first (thicker line)
        //
        k.drawLine({
          p1: k.vec2(arcPoints[i].x, arcPoints[i].y),
          p2: k.vec2(arcPoints[i + 1].x, arcPoints[i + 1].y),
          width: ARROW_WIDTH + ARROW_OUTLINE_WIDTH * 2,
          color: arrowOutlineColor,
          opacity: ARROW_OPACITY
        })
        //
        // Draw main arrow line
        //
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
      const outlineSize = ARROWHEAD_SIZE + ARROW_OUTLINE_WIDTH
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
      const outlineTipX = actualTipX + Math.cos(arrowAngle) * ARROW_OUTLINE_WIDTH
      const outlineTipY = actualTipY + Math.sin(arrowAngle) * ARROW_OUTLINE_WIDTH
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
  // OR if localStorage is empty, show electricity on time anti-hero when hovered
  //
  const lastLevel = get('lastLevel', null)
  const isEmptyLocalStorage = lastLevel === null
  
  if (isEmptyLocalStorage) {
    //
    // Find time anti-hero when localStorage is empty
    // Show electricity only when hovering over it
    //
    const timeAntiHero = antiHeroes.find(ah => ah.section === 'time')
    if (timeAntiHero && !timeAntiHero.isCompleted && hoveredAntiHero === timeAntiHero) {
      const heroPos = { x: hero.pos.x, y: hero.pos.y }
      const antiHeroPos = { 
        x: timeAntiHero.character.pos.x, 
        y: timeAntiHero.character.pos.y 
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
}
