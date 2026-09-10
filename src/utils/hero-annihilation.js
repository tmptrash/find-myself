import { CFG } from '../cfg.js'
import { loadHeroSprites, getSpriteName } from '../components/hero.js'
import * as Sound from './sound.js'
import { createLevelTransition, getNextLevel } from './transition.js'
import * as TouchHandHold from '../sections/touch/utils/touch-hand-hold.js'
import { set } from './progress.js'
import {
  createParticleWithOutline,
  createBodyPartParticles,
  createMouthSparkles,
  createColorChangeSparkles
} from './hero-particles.js'

export const ANNIHILATION_TAG = 'annihilation'
//
// Annihilation explosion uses filled circles so the burst feels organic
//
const ANNIHILATION_PARTICLE_SHAPE = 'circle'
//
// Touch section completion tint — steel teal matching the anti-hero
// body colour used across touch levels (`#5A8898`).
//
const TOUCH_SECTION_HERO_COLOR = CFG.visual.colors.sections.touch.body
//
// Time section completion tint — orange/yellow anti-hero accent (`#FF8C00`), not global antiHero brown
//
const TIME_SECTION_HERO_COLOR = '#FF8C00'

/**
 * Tags the anti-hero and wires hero collision to the annihilation sequence.
 * @param {Object} heroInst - Playable hero instance
 * @param {Object} antiHeroInst - Anti-hero instance
 * @param {Object} cfg - Annihilation config
 * @param {string} cfg.currentLevel - Current level name for transitions
 * @param {Function} [cfg.onAnnihilation] - Callback after normal annihilation
 */
export function bindHeroAnnihilation(heroInst, antiHeroInst, cfg) {
  heroInst.antiHero = antiHeroInst
  heroInst.onAnnihilation = cfg.onAnnihilation ?? null
  heroInst.annihilationLevel = cfg.currentLevel ?? null
  antiHeroInst?.character?.tag?.(ANNIHILATION_TAG)
  heroInst.character?.onCollide?.(ANNIHILATION_TAG, () => onAnnihilationCollide(heroInst))
}
/**
 * Handle annihilation collision between hero and anti-hero
 * @param {Object} inst - Hero instance
 */
function onAnnihilationCollide(inst) {
  if (inst.isAnnihilating) return
  //
  // Annihilation can be temporarily locked (e.g. word level 4 keeps the grey
  // anti-hero inert until the hero calms it). While locked, touching does nothing.
  //
  if (inst.annihilationLocked) return

  inst.isAnnihilating = true
  const { k } = inst
  if (inst.annihilationLevel === 'lesson-touch.3' && inst.antiHero?.character?.exists?.()) {
    TouchHandHold.begin(inst, (targetPos) => startAnnihilationExplosion(inst, targetPos))
    return
  }
  const target = inst.antiHero.character
  target.paused = true
  const targetPos = k.vec2(target.pos.x, target.pos.y)
  k.destroy(target)
  startAnnihilationExplosion(inst, targetPos)
}
//
// Particle scatter / absorption sequence after anti-hero is removed.
//
function startAnnihilationExplosion(inst, targetPos) {
  const { k, character: player, sfx } = inst
  inst.isRunning = false
  inst.runFrame = 0
  inst.runTimer = 0
  inst.wasJumping = false  // Reset jump flag
  //
  // Force idle sprite (not jump!) using current eye position
  //
  player.use(k.sprite(getSpriteName(inst, inst.eyeOffsetX, inst.eyeOffsetY)))
  //
  // Stop horizontal movement but keep vertical (gravity)
  //
  if (player.vel) {
    player.vel.x = 0
  }
  //
  // Create explosion particles immediately (all at once)
  //
  const particles = []
  const particleCount = 80  // Create many particles at once
  //
  // Get anti-hero colors (use custom bodyColor if provided, otherwise use default)
  //
  // Anti-hero colors
  //
  const antiHeroBodyColor = inst.antiHero.bodyColor || CFG.visual.colors.antiHero.body
  const antiHeroOutlineColor = CFG.visual.colors.outline

  const scale = 2
  const particleSize = 4
  const outlineSize = particleSize + 1  // Reduced from +2 to +1 (thinner outline)

  for (let i = 0; i < particleCount; i++) {
    //
    // Randomly choose body or outline color (80% body, 20% outline for more red)
    //
    const useBodyColor = k.rand(0, 1) > 0.2
    const particleColorHex = useBodyColor ? antiHeroBodyColor : antiHeroOutlineColor

    const particleX = targetPos.x + k.rand(-20, 20)
    const particleY = targetPos.y + k.rand(-20, 20)
    //
    // Annihilation uses circles — rotation is irrelevant for a circle
    //
    const particle = createParticleWithOutline(k, particleX, particleY, particleColorHex, ANNIHILATION_PARTICLE_SHAPE, 0, particleSize, scale)
    //
    // Random direction for explosion (scatter in all directions)
    //
    const angle = k.rand(0, Math.PI * 2)
    const speed = k.rand(250, 500)

    particle.vx = Math.cos(angle) * speed
    particle.vy = Math.sin(angle) * speed
    particle.lifetime = 0
    particle.phase = 'scatter'
    //
    // Target will be set AFTER scatter phase
    //
    particle.targetX = null
    particle.targetY = null

    particles.push(particle)
  }
  //
  // Play scatter + deep boom immediately after particles are created, before they
  // start moving. AnnihilationSound routes to the master output so it stays audible
  // even when glitch gain is muted (e.g. word level 4 after the calm platform).
  //
  sfx && Sound.playScatterSound(sfx)
  sfx && Sound.playAnnihilationSound(sfx)
  //
  // PHASE 1: Particles scatter outward (0.4 sec)
  //
  const scatterDuration = 0.4
  let scatterTime = 0
  let absorptionSoundStarted = false
  // let shakeStarted = false  // Temporarily disabled
  // const originalCamPos = k.camPos()  // Temporarily disabled
  // const shakeIntensity = 20  // Temporarily disabled

  const scatterInterval = k.onUpdate(() => {
    scatterTime += k.dt()
    const progress = Math.min(scatterTime / scatterDuration, 1)
    
    //
    // Start absorption sound near the end of scatter phase (at 95% progress)
    //
    if (!absorptionSoundStarted && progress >= 0.95) {
      sfx && Sound.playAbsorptionSound(sfx)
      absorptionSoundStarted = true
    }
    
    // if (!shakeStarted && scatterTime > 0) {
    //   shakeStarted = true
    // }
    
    //
    // Screen shake during scatter phase (temporarily disabled)
    //
    // if (shakeStarted) {
    //   const shakeX = k.rand(-shakeIntensity, shakeIntensity)
    //   const shakeY = k.rand(-shakeIntensity, shakeIntensity)
    //   k.camPos(originalCamPos.x + shakeX, originalCamPos.y + shakeY)
    // }
    //
    // Animate particles - scatter outward
    //
    particles.forEach(p => {
      if (!p.exists()) return

      p.lifetime += k.dt()
      //
      // Move outward (all particles are in scatter phase)
      //
      p.moveBy(p.vx * k.dt(), p.vy * k.dt())
      //
      // Update outline position
      //
      if (p.outline && p.outline.exists()) {
        p.outline.pos.x = p.pos.x
        p.outline.pos.y = p.pos.y
      }
      //
      // Slow down
      //
      p.vx *= 0.96
      p.vy *= 0.96
    })

    if (progress >= 1) {
      scatterInterval.cancel()
      //
      // STEP 5: Small pause before absorption (0.2 sec)
      // Sound already started earlier during scatter phase
      //
      k.wait(0.2, () => {
        //
        // PHASE 2: Particles absorbed into hero with screen shake
        //
        let absorbTime = 0
        const maxAbsorbDuration = 5.0  // Longer duration for particles to converge into hero
        let heroFlickerTimer = 0
        const heroFlickerInterval = 0.08
        //
        // STEP 6: Screen shake starts immediately with absorption
        //
        const originalCamPos = k.camPos()
        const shakeIntensity = 20
        //
        // Update all particle targets to hero's current position AFTER scatter
        //
        particles.forEach(p => {
          if (p.exists()) {
            //
            // Set target to center of hero (all particles converge to one point)
            //
            p.targetX = player.pos.x
            p.targetY = player.pos.y
            //
            // Reset velocity slightly toward hero to ensure movement starts
            //
            const dx = p.targetX - p.pos.x
            const dy = p.targetY - p.pos.y
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist > 0) {
              //
              // Give initial push toward hero
              //
              const initialSpeed = 100
              p.vx = (dx / dist) * initialSpeed
              p.vy = (dy / dist) * initialSpeed
            }
          }
        })

        const absorbInterval = k.onUpdate(() => {
          absorbTime += k.dt()
          heroFlickerTimer += k.dt()
          //
          // Hero flickers during absorption
          //
          if (heroFlickerTimer >= heroFlickerInterval) {
            player.opacity = player.opacity === 1 ? 0.3 : 1
            heroFlickerTimer = 0
          }
          //
          // Continue screen shake during absorption (temporarily disabled)
          //
          // const shakeX = k.rand(-shakeIntensity, shakeIntensity)
          // const shakeY = k.rand(-shakeIntensity, shakeIntensity)
          // k.camPos(originalCamPos.x + shakeX, originalCamPos.y + shakeY)
          //
          // Count remaining particles
          //
          let activeParticles = 0
          //
          // Animate particles - accelerate toward hero
          //
          particles.forEach(p => {
            if (!p.exists()) return

            activeParticles++

            const dx = p.targetX - p.pos.x
            const dy = p.targetY - p.pos.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            //
            // Particle reached target - destroy it (small threshold for center convergence)
            //
            if (dist <= 8) {
              if (p.outline && p.outline.exists()) k.destroy(p.outline)
              k.destroy(p)
              return
            }
            //
            // Strong acceleration with progressive time boost
            //
            // Higher initial acceleration for faster absorption
            //
            const timeBoost = 1 + (absorbTime / maxAbsorbDuration) * 5  // Up to 6x boost
            const baseAcceleration = 1200 / Math.max(dist, 3)  // Higher base, lower min distance
            const acceleration = baseAcceleration * timeBoost
            //
            // Apply acceleration toward target
            //
            p.vx += (dx / dist) * acceleration * k.dt() * 60
            p.vy += (dy / dist) * acceleration * k.dt() * 60
            //
            // Move particle
            //
            p.moveBy(p.vx * k.dt(), p.vy * k.dt())
            //
            // Update outline position
            //
            if (p.outline && p.outline.exists()) {
              p.outline.pos.x = p.pos.x
              p.outline.pos.y = p.pos.y
            }
            //
            // Check if overshot target
            //
            const newDist = Math.sqrt(
              Math.pow(p.targetX - p.pos.x, 2) +
              Math.pow(p.targetY - p.pos.y, 2)
            )

            if (newDist > dist) {
              //
              // Overshot - destroy particle
              //
              if (p.outline && p.outline.exists()) k.destroy(p.outline)
              k.destroy(p)
              return
            }

            p.opacity = 1.0
          })
          //
          // All particles absorbed
          //
          if (activeParticles === 0 || absorbTime >= maxAbsorbDuration) {
            absorbInterval.cancel()
            //
            // Clean up particles and outlines
            //
            particles.forEach(p => {
              if (p.outline && p.outline.exists()) k.destroy(p.outline)
              if (p.exists()) k.destroy(p)
            })
            //
            // Stop hero flickering
            //
            player.opacity = 1
            //
            // Restore camera
            //
            k.camPos(originalCamPos)
            //
            // STEP 7: Check if this is the last level of word, touch or time section
            //
            const nextLevel = getNextLevel(inst.annihilationLevel)
            const isLastWordLevel = inst.annihilationLevel === 'lesson-word.4' && nextLevel === 'word-complete'
            const isLastTimeLevel = inst.annihilationLevel === 'lesson-time.3' && nextLevel === 'time-complete'
            
            if (isLastWordLevel && (!inst.addMouth || inst.bodyColor !== '#DC143C')) {
              //
              // Special sequence for completing word section: add mouth and red color before transition
              //
              k.wait(0.4, () => {
                //
                // Store original volumes
                //
                const originalMusicVolume = Sound.getBackgroundMusicVolume(sfx)
                //
                // Fade out music and blade sounds to very quiet, increase glitch volume
                //
                let fadeTimer = 0
                const FADE_DURATION = 0.5
                const TARGET_MUSIC_VOLUME = 0.005  // Even quieter music (was 0.02)
                const TARGET_BLADE_VOLUME = 0.003  // Even quieter blade sounds (was 0.01)
                const TARGET_GLITCH_VOLUME = 3.5  // Make glitch sound even louder
                
                const fadeInterval = k.onUpdate(() => {
                  fadeTimer += k.dt()
                  const progress = Math.min(1, fadeTimer / FADE_DURATION)
                  //
                  // Fade music down
                  //
                  const newMusicVolume = originalMusicVolume + (TARGET_MUSIC_VOLUME - originalMusicVolume) * progress
                  Sound.setBackgroundMusicVolume(sfx, newMusicVolume)
                  //
                  // Fade blade sounds down
                  //
                  Sound.setBladeSoundVolume(sfx, 1.0 - progress * (1.0 - TARGET_BLADE_VOLUME))
                  //
                  // Fade glitch sounds up
                  //
                  Sound.setGlitchSoundVolume(sfx, 1.0 + progress * (TARGET_GLITCH_VOLUME - 1.0))
                  
                  if (progress >= 1) {
                    fadeInterval.cancel()
                  }
                })
                //
                // Play pre-mouth sound (louder glitch) - wait 1.3 seconds after fade completes
                //
                k.wait(0.35, () => {
                  sfx && Sound.playMouthSound(sfx)
                  //
                  // Add mouth to hero sprite
                  //
                  k.wait(0.2, () => {
                  //
                  // Update inst: add mouth, arms, watch and red color (DC143C) before loading sprites
                  //
                  inst.addMouth = true
                  inst.addArms = true
                  inst.addWatch = true
                  const redColor = '#DC143C'
                  inst.bodyColor = redColor
                  const bodyColorClean = String(redColor).replace('#', '')
                  const outlineColorClean = String(CFG.visual.colors.outline).replace('#', '')
                  inst.spritePrefix = `${inst.type}_${bodyColorClean}_${outlineColorClean}_mouth_arms_watch`
                    //
                    // Create visual effect (particles around hero)
                    //
                    createBodyPartParticles(inst)
                    //
                    // Reload sprites with mouth, arms and watch
                    //
                    loadHeroSprites({
                      k: inst.k,
                      type: inst.type,
                      bodyColor: redColor,
                      outlineColor: CFG.visual.colors.outline,
                      addMouth: true,
                      addArms: true,
                      addWatch: true,
                      character: null
                    })
                    //
                    // Wait a frame to ensure sprites are loaded, then update character sprite
                    //
                    k.wait(0.05, () => {
                      //
                      // Use getSpriteName to get the correct sprite with mouth
                      //
                      const newSpriteName = getSpriteName(inst, 0, 0)
                      //
                      // Update character sprite to show mouth
                      //
                      try {
                        player.use(k.sprite(newSpriteName))
                      } catch (error) {
                        //
                        // Sprite load failed — continue with transition
                        //
                      }
                      //
                      // Play mouth appearance sound (louder transformation sound)
                      //
                      sfx && Sound.playMouthSound(sfx)
                      //
                      // Create sparkle particles around mouth
                      //
                      createMouthSparkles(inst)
                      //
                      // Pause to show the mouth longer
                      //
                      k.wait(1.0, () => {
                        //
                        // Fade volumes back to normal
                        //
                        let restoreTimer = 0
                        const RESTORE_DURATION = 0.8
                        
                        const restoreInterval = k.onUpdate(() => {
                          restoreTimer += k.dt()
                          const progress = Math.min(1, restoreTimer / RESTORE_DURATION)
                          //
                          // Restore music volume
                          //
                          const newMusicVolume = TARGET_MUSIC_VOLUME + (originalMusicVolume - TARGET_MUSIC_VOLUME) * progress
                          Sound.setBackgroundMusicVolume(sfx, newMusicVolume)
                          //
                          // Restore blade sound volume
                          //
                          Sound.setBladeSoundVolume(sfx, TARGET_BLADE_VOLUME + (1.0 - TARGET_BLADE_VOLUME) * progress)
                          //
                          // Restore glitch sound volume
                          //
                          Sound.setGlitchSoundVolume(sfx, TARGET_GLITCH_VOLUME + (1.0 - TARGET_GLITCH_VOLUME) * progress)
                          
                          if (progress >= 1) {
                            restoreInterval.cancel()
                          }
                        })
                        //
                        // Save progress and show transition
                        //
                        if (nextLevel && nextLevel !== 'menu') {
                          set('lastLesson', nextLevel)
                        }
                        inst.character.hidden = true
                        createLevelTransition(k, inst.annihilationLevel)
                      })
                    })
                  })
                })
              })
            } else if (inst.annihilationLevel === 'lesson-touch.3' && nextLevel === 'touch-complete' && (!inst.addArms || inst.bodyColor !== TOUCH_SECTION_HERO_COLOR)) {
              //
              // Special sequence for completing touch section: change hero color to touch anti-hero teal and add arms
              //
              k.wait(1.5, () => {
                //
                // Store original volumes
                //
                const originalMusicVolume = Sound.getBackgroundMusicVolume(sfx)
                //
                // Fade out music to quiet, increase glitch volume
                //
                let fadeTimer = 0
                const FADE_DURATION = 1.0
                const TARGET_MUSIC_VOLUME = 0.005
                const TARGET_GLITCH_VOLUME = 3.5

                const fadeInterval = k.onUpdate(() => {
                  fadeTimer += k.dt()
                  const progress = Math.min(1, fadeTimer / FADE_DURATION)
                  //
                  // Fade music down
                  //
                  const newMusicVolume = originalMusicVolume + (TARGET_MUSIC_VOLUME - originalMusicVolume) * progress
                  Sound.setBackgroundMusicVolume(sfx, newMusicVolume)
                  //
                  // Fade glitch sounds up
                  //
                  Sound.setGlitchSoundVolume(sfx, 1.0 + progress * (TARGET_GLITCH_VOLUME - 1.0))

                  if (progress >= 1) {
                    fadeInterval.cancel()
                  }
                })
                //
                // Play transformation sound after fade completes
                //
                k.wait(1.0, () => {
                  sfx && Sound.playMouthSound(sfx)
                  //
                  // Update inst: change to touch section color and add arms
                  //
                  const touchColor = TOUCH_SECTION_HERO_COLOR
                  inst.bodyColor = touchColor
                  inst.addArms = true
                  const touchColorClean = String(touchColor).replace('#', '')
                  const outlineColorClean = String(CFG.visual.colors.outline).replace('#', '')
                  const hasMouth = inst.addMouth
                  inst.spritePrefix = `${inst.type}_${touchColorClean}_${outlineColorClean}${hasMouth ? '_mouth' : ''}_arms`
                  //
                  // Create visual effect (particles around hero)
                  //
                  createBodyPartParticles(inst)
                  //
                  // Reload sprites with touch section color and arms
                  //
                  loadHeroSprites({
                    k: inst.k,
                    type: inst.type,
                    bodyColor: touchColor,
                    outlineColor: CFG.visual.colors.outline,
                    addMouth: hasMouth,
                    addArms: true,
                    character: null
                  })
                  //
                  // Wait a frame to ensure sprites are loaded, then update character sprite
                  //
                  k.wait(0.05, () => {
                    //
                    // Use getSpriteName to get the correct sprite with pink color and arms
                    //
                    const newSpriteName = getSpriteName(inst, 0, 0)
                    //
                    // Update character sprite to show pink color with arms
                    //
                    try {
                      player.use(k.sprite(newSpriteName))
                    } catch (error) {
                      // Sprite load failed, continue with transition
                    }
                    //
                    // Play transformation sound
                    //
                    sfx && Sound.playMouthSound(sfx)
                    //
                    // Create sparkle particles around hero (pink particles)
                    //
                    createColorChangeSparkles(inst, touchColor)
                    //
                    // Pause to show the transformed hero
                    //
                    k.wait(2.5, () => {
                      //
                      // Fade volumes back to normal
                      //
                      let restoreTimer = 0
                      const RESTORE_DURATION = 0.8

                      const restoreInterval = k.onUpdate(() => {
                        restoreTimer += k.dt()
                        const progress = Math.min(1, restoreTimer / RESTORE_DURATION)
                        //
                        // Restore music volume
                        //
                        const newMusicVolume = TARGET_MUSIC_VOLUME + (originalMusicVolume - TARGET_MUSIC_VOLUME) * progress
                        Sound.setBackgroundMusicVolume(sfx, newMusicVolume)
                        //
                        // Restore glitch sound volume
                        //
                        Sound.setGlitchSoundVolume(sfx, TARGET_GLITCH_VOLUME + (1.0 - TARGET_GLITCH_VOLUME) * progress)

                        if (progress >= 1) {
                          restoreInterval.cancel()
                        }
                      })
                      //
                      // Save progress and show transition
                      //
                      if (nextLevel && nextLevel !== 'menu') {
                        set('lastLesson', nextLevel)
                      }
                      inst.character.hidden = true
                      //
                      // Small pause before transitioning to touch-complete
                      //
                      k.wait(0.5, () => {
                        createLevelTransition(k, inst.annihilationLevel)
                      })
                    })
                  })
                })
              })
            } else if (isLastTimeLevel && (inst.bodyColor !== TIME_SECTION_HERO_COLOR || !inst.addArms || !inst.addWatch)) {
              //
              // Special sequence for completing time section: orange anti-hero color with arms and watch
              //
              k.wait(1.5, () => {
                //
                // Store original volumes
                //
                const originalMusicVolume = Sound.getBackgroundMusicVolume(sfx)
                //
                // Fade out music to quiet, increase glitch volume
                //
                let fadeTimer = 0
                const FADE_DURATION = 1.0  // 1 second fade
                const TARGET_MUSIC_VOLUME = 0.005
                const TARGET_GLITCH_VOLUME = 3.5
                
                const fadeInterval = k.onUpdate(() => {
                  fadeTimer += k.dt()
                  const progress = Math.min(1, fadeTimer / FADE_DURATION)
                  //
                  // Fade music down
                  //
                  const newMusicVolume = originalMusicVolume + (TARGET_MUSIC_VOLUME - originalMusicVolume) * progress
                  Sound.setBackgroundMusicVolume(sfx, newMusicVolume)
                  //
                  // Fade glitch sounds up
                  //
                  Sound.setGlitchSoundVolume(sfx, 1.0 + progress * (TARGET_GLITCH_VOLUME - 1.0))
                  
                  if (progress >= 1) {
                    fadeInterval.cancel()
                  }
                })
                //
                // Play color change sound right after fade completes (color change happens in 1 second)
                //
                k.wait(1.0, () => {
                  sfx && Sound.playMouthSound(sfx)
                  //
                  // Update inst: orange anti-hero color with arms and watch BEFORE loading sprites
                  //
                  const timeColor = TIME_SECTION_HERO_COLOR
                  inst.bodyColor = timeColor
                  inst.addArms = true
                  inst.addWatch = true
                  const timeColorClean = String(timeColor).replace('#', '')
                  const outlineColorClean = String(CFG.visual.colors.outline).replace('#', '')
                  const hasMouth = inst.addMouth
                  inst.spritePrefix = `${inst.type}_${timeColorClean}_${outlineColorClean}${hasMouth ? '_mouth' : ''}_arms_watch`
                  //
                  // Reload sprites with orange color, arms and watch
                  //
                  loadHeroSprites({
                    k: inst.k,
                    type: inst.type,
                    bodyColor: timeColor,
                    outlineColor: CFG.visual.colors.outline,
                    addMouth: hasMouth,
                    addArms: true,
                    addWatch: true,
                    character: null
                  })
                  //
                  // Wait a frame to ensure sprites are loaded, then update character sprite
                  //
                  k.wait(0.05, () => {
                    //
                    // Use getSpriteName to get the correct sprite with orange color, arms and watch
                    //
                    const newSpriteName = getSpriteName(inst, 0, 0)
                    //
                    // Update character sprite to show orange hero with arms and watch
                    //
                    try {
                      player.use(k.sprite(newSpriteName))
                    } catch (error) {
                      // Sprite load failed, continue with transition
                    }
                    //
                    // Play color transformation sound
                    //
                    sfx && Sound.playMouthSound(sfx)
                    //
                    // Create sparkle particles around hero (orange particles)
                    //
                    createColorChangeSparkles(inst, timeColor)
                    //
                    // Pause to show the transformed hero longer
                    //
                    k.wait(2.5, () => {
                      //
                      // Fade volumes back to normal
                      //
                      let restoreTimer = 0
                      const RESTORE_DURATION = 0.8
                      
                      const restoreInterval = k.onUpdate(() => {
                        restoreTimer += k.dt()
                        const progress = Math.min(1, restoreTimer / RESTORE_DURATION)
                        //
                        // Restore music volume
                        //
                        const newMusicVolume = TARGET_MUSIC_VOLUME + (originalMusicVolume - TARGET_MUSIC_VOLUME) * progress
                        Sound.setBackgroundMusicVolume(sfx, newMusicVolume)
                        //
                        // Restore glitch sound volume
                        //
                        Sound.setGlitchSoundVolume(sfx, TARGET_GLITCH_VOLUME + (1.0 - TARGET_GLITCH_VOLUME) * progress)
                        
                        if (progress >= 1) {
                          restoreInterval.cancel()
                        }
                      })
                      //
                      // Save progress and show transition
                      //
                      if (nextLevel && nextLevel !== 'menu') {
                        set('lastLesson', nextLevel)
                      }
                      inst.character.hidden = true
                      //
                      // Small pause after annihilation before transitioning to next level
                      //
                      k.wait(0.5, () => {
                      createLevelTransition(k, inst.annihilationLevel)
                      })
                    })
                  })
                })
              })
            } else if (isLastTimeLevel) {
              //
              // Time section finale when hero already has orange body, arms and watch
              //
              k.wait(0.6, () => {
                if (nextLevel && nextLevel !== 'menu') {
                  set('lastLesson', nextLevel)
                }
                inst.character.hidden = true
                k.wait(0.5, () => {
                  createLevelTransition(k, inst.annihilationLevel)
                })
              })
            } else {
              //
              // Normal sequence: pause after absorption and shake, then fade and show text
              //
              k.wait(0.6, () => {
                if (inst.annihilationLevel) {
                  //
                  // Save NEXT level progress to localStorage before transition
                  //
                  // (so player continues from the next level, not the current one)
                  //
                  if (nextLevel && nextLevel !== 'menu') {
                    set('lastLesson', nextLevel)
                  }
                  inst.character.hidden = true
                  //
                  // Small pause after annihilation before transitioning to next level
                  //
                  k.wait(0.5, () => {
                  //
                  // Call onAnnihilation callback if provided, otherwise use default transition
                  //
                  if (inst.onAnnihilation) {
                    inst.onAnnihilation()
                  } else {
                    createLevelTransition(k, inst.annihilationLevel)
                  }
                  })
                }
              })
            }
          }
        })
      })
    }
  })
}
