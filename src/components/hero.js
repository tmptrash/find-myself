import { CFG } from '../cfg.js'
import { getHex, isAnyKeyDown, onPhysicalKeyPress, getColor, parseHex, getRGB, toCanvas } from '../utils/helper.js'
import * as TouchControls from '../utils/touch-controls.js'
import * as Sound from '../utils/sound.js'
import { createLevelTransition, getNextLevel } from '../utils/transition.js'
import * as TouchHandHold from '../sections/touch/utils/touch-hand-hold.js'
import { set } from '../utils/progress.js'
import { isAnyPanelOpen } from '../utils/lesson-help.js'
//
// Sprite rendering: 96x96 at scale 1 for crisp 1px outlines
//
const SPRITE_SIZE = 96
const RENDER_SCALE = 1
//
// Collision box parameters (in 96x96 local sprite space)
//
const COLLISION_WIDTH = 30
const COLLISION_HEIGHT = 69
const COLLISION_OFFSET_X = 0
//
// Shift collision down so bottom aligns with sprite feet.
// Top edge lowered to avoid collision above hero's head.
//
const COLLISION_OFFSET_Y = 3
//
// Hero parameters — scale 1 since sprites are already at display resolution
//
const HERO_SCALE = 1
const RUN_ANIM_SPEED = 0.03333
const PARTICLE_SHAPES = ['square', 'rect_h', 'rect_v', 'small_square']
//
// Annihilation explosion uses filled circles so the burst feels organic
//
const ANNIHILATION_PARTICLE_SHAPE = 'circle'
//
// Assembly (spawn) also uses circles — character materialises from round sparks
//
const SPAWN_PARTICLE_SHAPE = 'circle'
//
// Run cycle — 8 frames like the reference sheet. Each leg loops around the
// same stride circle half a cycle apart: it plants at the front, sweeps
// back along the ground, then lifts (shorter leg, raised foot) and swings
// forward. All values are in 96px sprite space.
//
const RUN_FRAME_COUNT = 8
const RUN_LEG_CENTER_X = 43
const RUN_LEG_SPREAD = 11
const RUN_LEG_HEIGHT = 18
const RUN_LEG_LIFT_SHORTEN = 7
const RUN_LEG_LIFT_RAISE = 9
const RUN_FOOT_Y = 84
const RUN_BODY_BOB = 4
//
// Forward lean while running: torso rotates around the hips so the head
// leads. Legs stay unrotated (planted) and clamped to the body side lines
// so they never trail past the spine (flipX mirrors left runs).
//
const RUN_LEAN_RAD = 0.2
//
// How far legs tuck up into the torso so there is never a gap at the crotch
//
const LEG_INTO_BODY = 2
//
// Ignore airborne flicker shorter than this — prevents run↔squat loops when
// the hitbox briefly loses contact with a platform mid-stride
//
const MIN_AIR_TIME_FOR_JUMP = 0.06
//
// Idle silhouette totals (head + torso). Jump frames compress toward the
// peak and expand back to these values on the way down.
//
const IDLE_HEAD_HEIGHT = 24
const IDLE_BODY_HEIGHT = 24
const IDLE_HEAD_Y = 18
const IDLE_BODY_Y = 42
const IDLE_LEG_Y = 66
const IDLE_LEG_HEIGHT = 18
//
// Jump air-body compression (frames 1→3 ascent, 3→5 descent). Peak is the
// shortest; early ascent / late descent match idle proportions.
//
const JUMP_AIR_HEAD_H = [24, 18, 14, 18, 24]
const JUMP_AIR_BODY_H = [24, 16, 10, 16, 24]
const JUMP_AIR_TOP_Y = [8, 14, 18, 14, 8]
//
// Confusion key set — each control key (kaplay name + physical code) that the
// word level 4 confusion platform can remap to moveLeft / moveRight / jump.
// Arrows (left/right/up) and letters (a/d/w) are shuffled independently; space
// is reassigned to one of the three actions.
//
const CONFUSION_KEYS = [
  { name: 'left', phys: 'ArrowLeft' },
  { name: 'right', phys: 'ArrowRight' },
  { name: 'up', phys: 'ArrowUp' },
  { name: 'a', phys: 'KeyA' },
  { name: 'd', phys: 'KeyD' },
  { name: 'w', phys: 'KeyW' },
  { name: 'space', phys: null }
]
const CONFUSION_NORMAL_JUMP_NAMES = ['up', 'w', 'space']
//
// Jump — 7 frames like the reference sheet: crouch, stretch take-off,
// rising, peak with the legs tucked up, early descent, full-leg descent and
// the landing crouch (held briefly right after touching the ground).
//
const JUMP_FRAME_COUNT = 7
const LAND_SQUASH_TIME = 0.08
const JUMP_SQUASH_TIME = 0.03
const JUMP_CEILING_CLEARANCE = 44
const JUMP_STRETCH_START = 0.1
//
// Collision at jump peak: bottom rises (tuck) and the whole box lifts with
// the silhouette. Both ramp smoothly via |vel.y| / takeoff — not a hard snap.
//
const JUMP_COLLISION_MAX_TUCK = 0.42
const JUMP_COLLISION_MAX_LIFT = 20
//
// Ignore a second land collide / ring spawn within this window (guards
// against one-frame grounded flicker from hitbox resize or multi-platform)
//
const LAND_FX_COOLDOWN = 0.2
//
// After a real land, ignore brief ungrounding (log snap / hitbox settle)
// so the crouch→idle sequence cannot restart as a second landing.
//
const POST_LAND_AIR_LOCK = 0.18
const EYE_ANIM_MIN_DELAY = 1.5
const EYE_ANIM_MAX_DELAY = 3.5
const EYE_LERP_SPEED = 0.1
const ANTIHERO_TAG = 'annihilation'
//
// Touch section completion tint — steel teal matching the anti-hero
// body colour used across touch levels (`#5A8898`).
//
const TOUCH_SECTION_HERO_COLOR = CFG.visual.colors.sections.touch.body
//
// Time section completion tint — orange/yellow anti-hero accent (`#FF8C00`), not global antiHero brown
//
const TIME_SECTION_HERO_COLOR = '#FF8C00'
//
// Landing dust particles
//

const DUST_PARTICLE_COUNT = 6
const DUST_PARTICLE_SIZE = 6
const DUST_PARTICLE_SPEED = 80
const DUST_PARTICLE_LIFETIME = 0.4
//
// Footprint trail: small fading marks left where the hero steps
//
const FOOTPRINT_LIFETIME = 2.0
const FOOTPRINT_RADIUS_X = 5
const FOOTPRINT_RADIUS_Y = 2
const FOOTPRINT_OFFSET_X = 4
const FOOTPRINT_OFFSET_Y = -1
const FOOTPRINT_COLOR_R = 35
const FOOTPRINT_COLOR_G = 25
const FOOTPRINT_COLOR_B = 18
const FOOTPRINT_OPACITY_START = 0.55
const FOOTPRINT_Z = 9
//
// Idle vocalization: notes drift from the hero's mouth while standing still
// and a soft humming/whistling note plays in the background. Disabled by
// passing `idleVocalization: null` (used by scenes that already render
// another mouth effect, e.g. cold breath in winter levels).
//
const IDLE_NOTE_OFFSET_Y = -28          // Mouth height above hero center (pixels)
const IDLE_NOTE_OFFSET_X = -16          // Notes emerge to the LEFT of the head
const IDLE_NOTE_LIFETIME = 2.2          // How long each note stays visible (seconds)
const IDLE_NOTE_RISE_SPEED = 28         // Vertical drift speed (px/s, upward)
const IDLE_NOTE_DRIFT_AMPLITUDE = 16    // Horizontal sway amplitude (px)
const IDLE_NOTE_DRIFT_FREQ = 1.4        // Horizontal sway frequency (Hz)
const IDLE_NOTE_FONT_SIZE = 22          // Glyph size for drawText
const IDLE_NOTE_Z = 9999                // Render notes in front of every other object
const IDLE_NOTE_EMIT_MIN = 0.6          // Min seconds between note particles
const IDLE_NOTE_EMIT_MAX = 1.6          // Max seconds between note particles
//
// Glyph set per vocalization mode. The 'sleeping' mode (default for the
// anti-hero) shows soft "z-Z" letters to imply quiet snoring instead of
// musical singing.
//
const IDLE_NOTE_GLYPHS = {
  humming: ['♪', '♫', '♩', '♬'],
  whistling: ['♪', '♫', '♩', '♬'],
  sleeping: ['z', 'Z', 'z'],
  childSinging: ['tu', 'ru', 'ruu', 'la', 'laa', 'tu-ru', 'tuuu', 'la-la']
}
//
// Vocalization only starts after the hero has been standing still for
// this many seconds — keeps the audio quiet during normal play and only
// kicks in when the player visibly pauses.
//
const IDLE_VOCALIZATION_DELAY = 2.0
//
// Idle melody the hero hums while standing still — a gentle looping motif
// over the C-major pentatonic (C5 D5 E5 G5 A5). Each entry is
// [frequency, beats]; the note emitter waits for the beat length before the
// next note, so every visible glyph coincides with its pitch and the whole
// stream reads as one synchronized tune. Only the hero is heard — the
// anti-hero produces visual notes but stays silent.
//
export const IDLE_MELODY = [
  [659.25, 1], [784.0, 1], [880.0, 1.5], [784.0, 0.5],
  [659.25, 1], [587.33, 1], [523.25, 2],
  [587.33, 1], [659.25, 1], [784.0, 1.5], [659.25, 0.5],
  [587.33, 1], [523.25, 1], [587.33, 2]
]
export const IDLE_MELODY_BEAT = 0.42          // Seconds per beat
export const IDLE_MELODY_GAP = 0.1            // Silence inserted between notes
export const IDLE_MELODY_SUSTAIN = 0.9        // Fraction of the beat the tone rings
//
// How fast the per-note lean pulse decays (for mushrooms / other listeners)
//
const WHISTLE_PULSE_DECAY = 2.8
//
// Module-level kill switch for idle vocalization. Toggled from the scene
// transition code so the menu hero stops emitting notes while the
// pre-level overlay is on screen (notes are drawn at a very high z and
// would otherwise float over the subtitle text).
//
let idleVocalizationSuppressed = false
//
// Death animation timing
//
const DEATH_ANIMATION_DURATION = 0.4
const DEATH_PARTICLE_POINTS = 20
//
// Corner radii for rounded body parts — tuned for smooth cartoon look at 96px
//
const HEAD_CORNER_RADIUS = 12
const ARM_CORNER_RADIUS = 4
const LEG_CORNER_RADIUS = 4
//
// Airborne jump frames: knees tuck slightly forward while the feet stay
// under the body (human jump tuck). Positive bend = knee forward in sprite
// px; foot ends near the hip so heels read as pulled under the butt.
//
const JUMP_LEG_BEND = [0, 4, 6, 8, 6, 3, 0]
//
// Front leg uses a lighter tuck so the two legs stay distinguishable
//
const JUMP_FRONT_LEG_BEND_RATIO = 0.7
const LEG_FILL_WIDTH = 9
const LEG_OUTLINE_WIDTH = 11
//
// How far bent jump legs start inside the torso so the round hip join is
// fully covered by the body fill (no outline burr at the crotch).
//
const JUMP_LEG_HIP_OVERLAP = 10
//
// Character width (head + body have same width, no shoulder bulge in new design)
//
const CHAR_WIDTH = 30
//
// Arm dimensions: each arm is exactly half of a full leg pill, cut vertically.
// ARM_HALF_W is the fill half-width (half of leg fill width 9, rounded up).
// ARM_H equals the default leg height so proportions match perfectly.
//
const ARM_HALF_W = 5
const ARM_H = 28
//
// Eye geometry constants (all in 96px sprite coordinates)
//
const EYE_RING_RADIUS = 5
const EYE_WHITE_RADIUS = 4
const PUPIL_RADIUS = 2
const EYE_OFFSET_X_LEFT = 9
const EYE_OFFSET_X_RIGHT = 21
const EYE_OFFSET_Y = 9
const EYE_PUPIL_SHIFT = 2
const PUPIL_SIDE_SHIFT = 2

export const HEROES = {
  HERO: 'hero',
  ANTIHERO: 'antiHero'
}
/**
 * Creates hero or anti-hero with full logic setup
 * @param {Object} config - Hero configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {string} [config.type='hero'] - Character type ('hero' or 'antiHero')
 * @param {boolean} [config.controllable=true] - Whether controlled by keyboard
 * @param {Object} [config.sfx] - AudioContext for sound effects
 * @param {Object} [config.antiHero] - Anti-hero instance for annihilation setup
 * @param {Function} [config.onAnnihilation] - Callback when hero meets anti-hero
 * @param {string} [config.currentLevel] - Current level name for transition
 * @param {string} [config.dustColor] - Dust particle color (hex string), defaults to gray
 * @param {boolean} [config.hitboxPadding=0] - Additional padding around collision box (for menu hover/click)
 * @returns {Object} Hero instance with character, k, type, controllable, sfx, and animation state
 */
export function create(config) {
  const {
    k,
    x,
    y,
    type = HEROES.HERO,
    controllable = type === HEROES.HERO,
    sfx = null,
    scale = HERO_SCALE,
    antiHero = null,
    onAnnihilation = null,
    currentLevel = null,
    bodyColor = null,      // Custom body color (hex string)
    outlineColor = null,   // Custom outline color (hex string), defaults to black
    dustColor = null,      // Dust particle color (hex string)
    isStatic = false,      // If true, no physics (for indicators)
    addMouth = false,      // If true, add black horizontal mouth line (only for idle)
    addArms = false,       // If true, add simple vertical arms
    addWatch = false,      // If true, draw small watch on right wrist (requires addArms)
    outlineOnly = false,   // If true, draw only outline (no body fill)
    hitboxPadding = 0,     // Additional padding around collision box (for menu hover/click)
    ambient = false,       // Decorative background character — no annihilation tag
    ambientWalk = false,   // Decorative walker — run cycle instead of idle eye sprites
    ambientRunSpeed = null, // Seconds per run frame when ambientWalk is true
    eyeWhiteColor = null   // Override eye fill color (null = use config default white)
  } = config
  //
  // Idle vocalization defaults: the hero whistles a soft tune ('humming'),
  // the anti-hero shows quiet "z-Z" sleeping glyphs without sound. Scenes
  // can override by passing an explicit `idleVocalization` (use `null` to
  // disable entirely — useful when another mouth effect like cold breath
  // is already rendered).
  //
  const defaultVocalization = type === HEROES.ANTIHERO ? 'sleeping' : 'humming'
  const idleVocalization = config.idleVocalization !== undefined ? config.idleVocalization : defaultVocalization

  const defaultBodyColor = type === HEROES.HERO ? CFG.visual.colors.hero.body : CFG.visual.colors.antiHero.body
  //
  // Ensure colors are strings and remove # symbols
  //
  const effectiveBodyColor = String(bodyColor ?? defaultBodyColor).replace('#', '')
  const effectiveOutlineColor = String(outlineColor ?? CFG.visual.colors.outline).replace('#', '')
  //
  // Load sprites for this hero configuration.
  // This will use cached sprites if already loaded
  // Pass colors with # for loadHeroSprites (it will handle removal internally)
  //
  try {
    const bodyColorWithHash = bodyColor ?? defaultBodyColor
    const outlineColorWithHash = outlineColor ?? CFG.visual.colors.outline
    loadHeroSprites({
      k,
      type,
      bodyColor: bodyColorWithHash,
      outlineColor: outlineColorWithHash,
      addMouth,
      addArms,
      addWatch,
      outlineOnly,
      eyeWhiteColor,
      character: null  // Marker to indicate this is an inst-like object
    })
  } catch (error) {
    console.error('Failed to load hero sprites:', error)
  }
  //
  // Generate sprite prefix based on customization (colors already have # removed)
  //
  const effectiveEyeWhiteKey = eyeWhiteColor ? String(eyeWhiteColor).replace('#', '') : ''
  const spritePrefix = `${type}_${effectiveBodyColor}_${effectiveOutlineColor}${addMouth ? '_mouth' : ''}${addArms ? '_arms' : ''}${addWatch ? '_watch' : ''}${outlineOnly ? '_outline' : ''}${effectiveEyeWhiteKey ? '_ew' + effectiveEyeWhiteKey : ''}`
  const spriteName = `${spritePrefix}_0_0`

  const collisionOffsetX = COLLISION_OFFSET_X - hitboxPadding
  const collisionOffsetY = COLLISION_OFFSET_Y - hitboxPadding
  const collisionWidth = COLLISION_WIDTH + hitboxPadding * 2
  const collisionHeight = COLLISION_HEIGHT + hitboxPadding * 2

  //
  // Ensure sprite is loaded before using it
  //
  let spriteComponent
  try {
    const existingSprite = k.getSprite(spriteName)
    if (existingSprite) {
      spriteComponent = k.sprite(spriteName)
    } else {
      //
      // Sprite not found, try to load it now
      //
      loadHeroSprites({
        k,
        type,
        bodyColor: effectiveBodyColor,
        outlineColor: effectiveOutlineColor,
        addMouth,
        addArms,
        addWatch,
        outlineOnly
      })
      //
      // Try to use the sprite (it should be loaded now)
      //
      spriteComponent = k.sprite(spriteName)
    }
  } catch (error) {
    //
      // Fallback: use default sprite name or rectangle placeholder
      //
    const defaultSpriteName = `${type}_0_0`
    try {
      const defaultSprite = k.getSprite(defaultSpriteName)
      if (defaultSprite) {
        spriteComponent = k.sprite(defaultSpriteName)
      } else {
        spriteComponent = k.rect(SPRITE_SIZE * RENDER_SCALE, SPRITE_SIZE * RENDER_SCALE)
      }
    } catch (fallbackError) {
      //
      // If everything fails, use rectangle placeholder
      //
      spriteComponent = k.rect(SPRITE_SIZE * RENDER_SCALE, SPRITE_SIZE * RENDER_SCALE)
    }
  }

  const character = k.add([
    spriteComponent,
    k.pos(x, y),
    //
    // Ambient decorative characters skip collision detection — they only move via manual
    // position updates and never interact with platforms or other entities. Without k.area()
    // they remain invisible in Kaplay debug mode (no hitbox outline rendered).
    //
    ...(!ambient ? [k.area({
      shape: new k.Rect(
        k.vec2(collisionOffsetX, collisionOffsetY),
        collisionWidth,
        collisionHeight
      )
    })] : []),
    ...(isStatic ? [k.fixed()] : [k.body()]),  // Use fixed() for static, body() for physics
    k.anchor("center"),
    k.scale(scale),
    k.z(CFG.visual.zIndex.player),
  ])
  type === HEROES.ANTIHERO && !ambient && character.use(ANTIHERO_TAG)

  const inst = {
    character,
    k,
    type,
    controllable,
    isStatic,
    sfx,
    antiHero,
    onAnnihilation,
    currentLevel,
    bodyColor: effectiveBodyColor,        // Store effective body color (not null)
    outlineColor: effectiveOutlineColor,  // Store effective outline color for re-baking
    addMouth,                             // Feature flags persisted for runtime recolour
    addArms,
    addWatch,
    outlineOnly,
    eyeWhiteColor,                        // Eye-white override persisted for runtime recolour
    spritePrefix,
    dustColor,
    speed: CFG.game.moveSpeed,
    jumpForce: config.jumpForce ?? CFG.game.jumpForce,
    direction: 1,
    canJump: true,
    runFrame: 0,
    runTimer: 0,
    isRunning: false,
    wasJumping: false,
    jumpFrame: 0,     // Current jump animation frame
    jumpPhase: 'none', // 'squashing', 'jumping', 'none'
    squashTimer: 0,   // Timer for pre-jump squash animation
    isSquashing: false, // Flag for pre-jump squash
    landSquashTimer: 0, // Remaining time the landing crouch frame is held
    crouchTimer: 0,   // Remaining time the hero is forced into the squat pose
    isCrouching: false, // True while crouchTimer > 0 and hero is grounded
    eyeOffsetX: 0,
    eyeOffsetY: 0,
    targetEyeX: 0,
    targetEyeY: 0,
    eyeTimer: 0,
    currentEyeSprite: null,
    eyesClosed: false,  // When true, idle uses the closed-eyes sprite (calm)
    //
    // When true with eyesClosed: closed eyes only while standing still;
    // running still uses the normal run cycle (celebration / calm idle look)
    //
    eyesClosedIdleOnly: false,
    awakeOverride: false, // When true, idle vocalization is paused (hero forced awake)
    lookAtPos: null,
    isAnnihilating: false,
    isDying: false,
    isSpawned: false,   // Flag to prevent controls before spawn completes
    invulnerabilityTimer: 0,  // Timer for spawn invulnerability
    isInvulnerable: false,  // Flag for spawn invulnerability
    controlsReversed: false,  // Flag for control inversion (time section level 3)
    annihilationLocked: false, // When true, touching the anti-hero does not annihilate
    //
    // Base collision-box params (in local sprite space) cached so the jump
    // leg-tuck can shrink the box from the bottom and restore it on landing.
    //
    collisionBaseOffsetX: collisionOffsetX,
    collisionBaseOffsetY: collisionOffsetY,
    collisionBaseWidth: collisionWidth,
    collisionBaseHeight: collisionHeight,
    jumpCollisionScale: 1,      // Current collision height / base height
    jumpCollisionLift: 0,       // Upward hitbox shift at jump peak (px)
    jumpCollisionTuck: 0,       // 0..1 how far the feet edge has risen this jump
    jumpTakeoffSpeed: 0,        // |vel.y| at leave-ground — scales peak tuck
    landFxCooldown: 0,          // Seconds left before another land FX may fire
    airTime: 0,                 // Seconds continuously airborne (filters platform flicker)
    spawnLandGrace: 0,          // After spawn, ignore settle-fall jump/land for this long
    postLandAirLock: 0,         // After land, ignore brief air flicker (no second crouch)
    //
    // Head-bonk: full-height collision for the rest of this jump
    //
    jumpCeilingBonk: false,
    //
    // After a letter dialog closes on Space, ignore jump until jump keys are released
    //
    jumpKeyReleaseGate: false,
    confusionMap: null,        // Random key-remap set by word level 4 confusion platform
    controlsDisabled: false,  // Flag to temporarily disable controls during zone transitions
    footprints: [],          // Trail of footprints left by walking, fade out over FOOTPRINT_LIFETIME
    lastFootprintFoot: 1,    // Alternates between -1 (left foot) and +1 (right foot)
    //
    // Idle vocalization state: notes drift up from the mouth and a soft
    // humming/whistling sound plays while the hero stands still.
    //
    idleVocalization,
    idleNotes: [],
    idleNoteEmitTimer: IDLE_NOTE_EMIT_MIN + Math.random() * (IDLE_NOTE_EMIT_MAX - IDLE_NOTE_EMIT_MIN),
    idleMelodyIndex: 0,
    idleStillTime: 0,
    whistlePulse: 0,
    whistleLeanSide: 1,
    ambientWalk,
    ambientRunSpeed: ambientRunSpeed ?? RUN_ANIM_SPEED * 2.4
  }
  //
  // Collision handlers require k.area() — skipped for ambient decorative characters
  //
  character.onCollide?.(CFG.game.platformName, () => onCollisionPlatform(inst))
  character.onUpdate(() => onUpdate(inst))
  controllable && setupControls(inst)
  antiHero && character.onCollide?.(ANTIHERO_TAG, () => onAnnihilationCollide(inst))
  //
  // Footprint renderer: a single fixed entity that draws and ages footprints
  // for this hero. Drawn behind the player so prints sit on the ground.
  //
  k.add([
    k.z(FOOTPRINT_Z),
    {
      update() {
        onUpdateFootprints(inst)
      },
      draw() {
        drawFootprints(k, inst)
      }
    }
  ])
  //
  // Idle vocalization renderer: drifts music notes above the hero's mouth.
  // Drawn slightly above the player (z = IDLE_NOTE_Z) so notes never hide
  // behind the sprite while it animates.
  //
  k.add([
    k.z(IDLE_NOTE_Z),
    {
      update() {
        onUpdateIdleNotes(inst)
      },
      draw() {
        drawIdleNotes(k, inst)
      }
    }
  ])

  return inst
}

/**
 * Loads sprites for hero or anti-hero with customizable parameters
 * Can be called with inst object or individual parameters
 * @param {Object} inst - Hero instance or Kaplay instance
 * @param {string} [type] - Hero type (HERO or ANTIHERO) - required if first param is k
 * @param {string} [bodyColor=null] - Body color in hex format (null = use default from config)
 * @param {string} [outlineColor=null] - Outline color in hex format (null = use default from config)
 * @param {boolean} [addMouth=false] - Add mouth to idle sprites
 * @param {boolean} [addArms=false] - Add arms to sprites
 * @param {boolean} [addWatch=false] - Add watch on right wrist
 */
export function loadHeroSprites(inst, type = null, bodyColor = null, outlineColor = null, addMouth = false, addArms = false, addWatch = false) {
  //
  // Determine if called with inst or individual parameters
  //
  let k, heroType, color, outline, mouth, arms, watch, hollow, eyeWhite

  if (inst.k && inst.type !== undefined) {
    //
    // Called with inst-like object (has k and type properties)
    //
    k = inst.k
    heroType = inst.type
    color = inst.bodyColor
    outline = inst.outlineColor
    mouth = inst.addMouth || false
    arms = inst.addArms || false
    watch = inst.addWatch || false
    hollow = inst.outlineOnly || false
    eyeWhite = inst.eyeWhiteColor || null
  } else {
    //
    // Called with individual parameters (for preloading)
    //
    k = inst
    heroType = type
    color = bodyColor
    outline = outlineColor
    mouth = addMouth
    arms = addArms
    watch = addWatch
    hollow = false
    eyeWhite = null
  }
  //
  // Use default colors from config if not provided
  //
  let effectiveBodyColor = color || (heroType === HEROES.HERO ? CFG.visual.colors.hero.body : CFG.visual.colors.antiHero.body)
  let effectiveOutlineColor = outline || CFG.visual.colors.outline
  //
  // Ensure colors are valid strings
  //
  if (!effectiveBodyColor || typeof effectiveBodyColor !== 'string') {
    effectiveBodyColor = heroType === HEROES.HERO ? CFG.visual.colors.hero.body : CFG.visual.colors.antiHero.body
  }
  if (!effectiveOutlineColor || typeof effectiveOutlineColor !== 'string') {
    effectiveOutlineColor = CFG.visual.colors.outline
  }
  //
  // Remove # from colors for prefix (colors are normalized in createFrame via getHex)
  // Ensure colors are strings before calling replace
  //
  const bodyColorForPrefix = String(effectiveBodyColor).replace('#', '')
  const outlineColorForPrefix = String(effectiveOutlineColor).replace('#', '')
  //
  // Generate unique prefix for this sprite variant
  //
  const eyeWhiteKey = eyeWhite ? String(eyeWhite).replace('#', '') : ''
  const prefix = `${heroType}_${bodyColorForPrefix}_${outlineColorForPrefix}${mouth ? '_mouth' : ''}${arms ? '_arms' : ''}${watch ? '_watch' : ''}${hollow ? '_outline' : ''}${eyeWhiteKey ? '_ew' + eyeWhiteKey : ''}`
  //
  // Skip generation if sprites for this configuration are already in the asset registry.
  //
  try { if (k.getSprite(`${prefix}_0_0`)) return } catch (e) {}
  //
  // Load all eye variants (9 positions) for idle animation
  //
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      const spriteName = `${prefix}_${x}_${y}`
      try {
        const spriteData = createFrame(heroType, 'idle', 0, x, y, effectiveBodyColor, effectiveOutlineColor, mouth, arms, hollow, watch, false, eyeWhite)
        //
        // createFrame now returns an HTMLCanvasElement (was a data URL string).
        // Ensure we got a valid sprite source before passing to loadSprite.
        //
        if (spriteData) {
          try {
            k.loadSprite(spriteName, spriteData)
            spriteData.width = 0
            spriteData.height = 0
          } catch (loadError) {
            //
            // Skip this sprite if loading fails
            //
          }
        }
      } catch (error) {
        //
        // Skip this sprite if there's an error creating it
        //
      }
    }
  }
  //
  // Closed-eyes idle frame (eyes filled with the body colour, no pupils) used
  // when the hero is calm. Baked once as `${prefix}_closed`.
  //
  try {
    const closedData = createFrame(heroType, 'idle', 0, 0, 0, effectiveBodyColor, effectiveOutlineColor, mouth, arms, hollow, watch, true, eyeWhite)
    if (closedData) {
      try {
        k.loadSprite(`${prefix}_closed`, closedData)
        closedData.width = 0
        closedData.height = 0
      } catch (loadError) {
        //
        // Skip this sprite if loading fails
        //
      }
    }
  } catch (error) {
    //
    // Skip this sprite if there's an error creating it
    //
  }
  //
  // Load jump animation frames (3 frames)
  //
  for (let frame = 0; frame < JUMP_FRAME_COUNT; frame++) {
    try {
      const spriteData = createFrame(heroType, 'jump', frame, 0, 0, effectiveBodyColor, effectiveOutlineColor, mouth, arms, hollow, watch, false, eyeWhite)
      if (spriteData) {
        try {
          k.loadSprite(`${prefix}-jump-${frame}`, spriteData)
          spriteData.width = 0
          spriteData.height = 0
        } catch (loadError) {
          //
          // Skip this sprite if loading fails
          //
        }
      }
    } catch (error) {
      //
      // Skip this sprite if there's an error creating it
      //
    }
  }
  //
  // Load run frames (3 frames)
  //
  for (let frame = 0; frame < RUN_FRAME_COUNT; frame++) {
    try {
      const spriteData = createFrame(heroType, 'run', frame, 0, 0, effectiveBodyColor, effectiveOutlineColor, mouth, arms, hollow, watch, false, eyeWhite)
      if (spriteData) {
        try {
          k.loadSprite(`${prefix}-run-${frame}`, spriteData)
          spriteData.width = 0
          spriteData.height = 0
        } catch (loadError) {
          //
          // Skip this sprite if loading fails
          //
        }
      }
    } catch (error) {
      //
      // Skip this sprite if there's an error creating it
      //
    }
  }
}
/**
 * Death effect with particle explosion
 * @param {Object} inst - Hero instance
 * @param {Function} onComplete - Callback when death animation completes
 * @param {Object} [opts] - Options
 * @param {boolean} [opts.suppressParticles] - Skip body/eye particles (scene provides custom ones)
 */
export function death(inst, onComplete, opts = {}) {
  if (inst.isDying) return
  inst.isDying = true
  const { k, character, sfx } = inst
  const centerX = character.pos.x
  const centerY = character.pos.y
  //
  // Apply slow motion effect
  //
  applySlowMotion(inst)
  //
  // Stop control and play sound
  //
  character.paused = true
  inst.controllable = false
  sfx && Sound.playDeathSound(sfx)
  if (!opts.suppressParticles) {
    //
    // Create body particles explosion
    //
    createBodyParticles(inst, centerX, centerY)
    //
    // Create eye particles
    //
    createEyeParticles(inst, centerX, centerY)
  }
  //
  // Hide character immediately
  //
  if (character.exists()) {
    k.destroy(character)
  }
  //
  // Wait for particles to finish + additional pause before callback
  //
  k.wait(DEATH_ANIMATION_DURATION, () => onComplete?.())
}

/**
 * Sets a world position for the hero to look at. When set, eyes
 * track this position instead of wandering randomly.
 * Pass null to resume random eye movement.
 * @param {Object} inst - Hero instance
 * @param {Object|null} pos - { x, y } world position or null
 */
export function setLookAtPos(inst, pos) {
  inst.lookAtPos = pos
}

/**
 * Forces the character awake: idle vocalization stops and eyes shut by the
 * singing reopen on the next update. Used by the menu while the player
 * hovers an anti-hero so the central hero wakes up and watches it; clearing
 * the override lets him doze off and resume the idle tune by himself.
 * @param {Object} inst - Hero instance
 * @param {boolean} awake - True to hold the character awake
 */
export function setAwakeOverride(inst, awake) {
  inst.awakeOverride = !!awake
}

/**
 * Toggles the calm "closed eyes" look. While enabled the idle animation holds a
 * baked frame whose eyes are filled with the body colour (no pupils), reading as
 * shut eyes. Disabling resumes normal eye wander/tracking.
 * @param {Object} inst - Hero instance
 * @param {boolean} closed - True to close the eyes, false to reopen
 * @param {Object} [opts]
 * @param {boolean} [opts.idleOnly=false] - Close eyes only while idle (allow run)
 */
export function setEyesClosed(inst, closed, opts = {}) {
  inst.eyesClosed = !!closed
  inst.eyesClosedIdleOnly = closed ? !!opts.idleOnly : false
  //
  // Drop the cached idle sprite name: run/jump frames swap the sprite
  // without touching the cache, so a stale match could skip re-applying the
  // idle frame and leave the hero frozen sideways (e.g. landing in water).
  //
  inst.currentEyeSprite = null
  //
  // Any external eye-state change overrides a singing-induced closure, so
  // the idle-notes updater never force-reopens eyes shut by drowning,
  // meditation or a calm pose.
  //
  inst.eyesClosedBySinging = false
}

/**
 * Arms a one-shot gate so the next jump waits until jump keys are released.
 * Used after letter dialogs closed with Space so the same press cannot crouch.
 * @param {Object} inst - Hero instance
 */
export function armJumpKeyReleaseGate(inst) {
  if (!inst) return
  inst.jumpKeyReleaseGate = true
  inst.jumpKeyReleaseHold = 0
  inst.isSquashing = false
  inst.squashTimer = 0
  inst.landSquashTimer = 0
  inst.jumpPhase = 'none'
  inst.wasJumping = false
  inst.jumpCeilingBonk = false
  syncPlatformLanding(inst)
  inst.canJump = false
}

/**
 * Puts the hero into calm meditation pose: closed eyes, idle frame, jump/run
 * state cleared so re-entering the calm platform never leaves a sideways squat.
 * @param {Object} inst - Hero instance
 */
export function enterCalmPose(inst) {
  setEyesClosed(inst, true)
  inst.isSquashing = false
  inst.squashTimer = 0
  inst.isCrouching = false
  inst.crouchTimer = 0
  inst.jumpPhase = 'none'
  inst.jumpFrame = 0
  inst.isRunning = false
  inst.wasJumping = false
  inst.runFrame = 0
  inst.runTimer = 0
}

/**
 * Recolours an existing anti-hero's body at runtime, rebaking its sprites and
 * swapping the visible sprite, then plays a sparkle + sound flourish. Mirrors
 * the touch level 1 grey→active transformation so other sections can reuse it.
 * @param {Object} inst - Anti-hero instance
 * @param {string} bodyColorHex - New body colour (hex, with or without leading #)
 */
export function recolorAntiHero(inst, bodyColorHex) {
  const { k } = inst
  if (!inst.character?.exists?.()) return
  inst.bodyColor = bodyColorHex
  const newHex = String(bodyColorHex).replace('#', '')
  const outlineHex = String(inst.outlineColor || CFG.visual.colors.outline).replace('#', '')
  //
  // Rebuild the sprite prefix with the new body colour, keeping feature flags
  //
  inst.spritePrefix = `${inst.type}_${newHex}_${outlineHex}${inst.addMouth ? '_mouth' : ''}${inst.addArms ? '_arms' : ''}${inst.addWatch ? '_watch' : ''}`
  loadHeroSprites(inst)
  //
  // Wait a frame for the sprites to bake, then swap the visible sprite and flourish
  //
  k.wait(0.05, () => {
    if (!inst.character?.exists?.()) return
    try {
      inst.character.use(k.sprite(getSpriteName(inst, inst.eyeOffsetX, inst.eyeOffsetY)))
    } catch (error) {
      //
      // Sprite not ready — the tint fallback below still snaps to the new colour
      //
    }
    inst.character.color = k.rgb(255, 255, 255)
    createColorChangeSparkles(inst, bodyColorHex)
    inst.sfx && Sound.playMouthSound(inst.sfx)
  })
}

/**
 * Globally suppresses idle vocalization (visual notes + whistle sounds)
 * for every hero/anti-hero instance. Used by the pre-level transition
 * overlay so the menu hero's notes don't bleed in front of the subtitle.
 */
export function suppressIdleVocalization() {
  idleVocalizationSuppressed = true
}

/**
 * Re-enables idle vocalization after a previous suppressIdleVocalization()
 * call. Pre-existing per-instance settings (idleVocalization: null) are
 * unaffected — only the module-level kill switch is released.
 */
export function unsuppressIdleVocalization() {
  idleVocalizationSuppressed = false
}

/**
 * Forces the hero into the squat (jump-frame-0) pose for a short duration.
 * Used to make the hero visibly cower when something startles him, e.g. a
 * bug crawling onto his feet. Only affects controllable, grounded heroes
 * and is suppressed while annihilating or dying.
 * @param {Object} inst - Hero instance
 * @param {number} duration - Crouch hold time in seconds
 */
export function crouch(inst, duration = 0.4) {
  if (!inst || inst.isAnnihilating || inst.isDying) return
  if (!inst.character?.exists?.()) return
  //
  // Extend existing crouch instead of restarting, so repeated bug taps
  // keep the pose smooth.
  //
  inst.crouchTimer = Math.max(inst.crouchTimer || 0, duration)
  inst.isCrouching = true
}
/**
 * Spawn hero with assembly effect from particles
 * @param {Object} inst - Hero instance
 */
export function spawn(inst) {
  const { k, character, type, sfx, bodyColor } = inst
  const x = character.pos.x
  const y = character.pos.y
  //
  // Hide character initially
  //
  character.hidden = true
  //
  // Freeze physics during assembly — otherwise the hidden body falls, lands,
  // and leaves jump/land state that stuck the hero until the first real jump.
  //
  const prevGravityScale = character.gravityScale
  character.gravityScale = 0
  character.vel.x = 0
  character.vel.y = 0
  character.pos.x = x
  character.pos.y = y
  resetAirborneState(inst)
  //
  // Determine particle color based on type
  //
  // Use custom bodyColor if provided, otherwise use default from config
  //
  const colors = CFG.visual.colors
  const particleColor = bodyColor || (type === HEROES.HERO ? colors.hero.body : colors.antiHero.body)
  //
  // Generate target points along character outline
  //
  // Character is approximately SPRITE_SIZE x RENDER_SCALE pixels
  //
  const charSize = SPRITE_SIZE * RENDER_SCALE
  const targetPoints = []
  //
  // Generate points around the perimeter of the character
  //
  for (let i = 0; i < DEATH_PARTICLE_POINTS; i++) {
    const angle = (i / DEATH_PARTICLE_POINTS) * Math.PI * 2
    const radius = charSize / 2 * 0.5  // Reduce radius by 50% (smaller outline)
    const offsetX = Math.cos(angle) * radius * k.rand(0.5, 1)
    const offsetY = Math.sin(angle) * radius * k.rand(0.5, 1)

    targetPoints.push({
      x: x + offsetX,
      y: y + offsetY
    })
  }
  //
  // Create particles for assembly effect
  //
  const particles = []
  //
  // Scale and particle size
  //
  const scale = 2
  const particleSize = 4
  const outlineSize = particleSize + 1
  //
  // Create particles
  //
  for (let i = 0; i < DEATH_PARTICLE_POINTS; i++) {
    const startX = x + k.rand(-100, 100)
    const startY = y + k.rand(-100, 100)
    //
    // Assembly uses circles — rotation is irrelevant for a circle
    //
    const particle = createParticleWithOutline(k, startX, startY, particleColor, SPAWN_PARTICLE_SHAPE, 0, particleSize, scale)
    particle.use("assemblyParticle")
    //
    // Assign target point from the outline (cycle through points)
    //
    const targetPoint = targetPoints[i % targetPoints.length]
    particle.targetX = targetPoint.x
    particle.targetY = targetPoint.y
    particle.speed = k.rand(200, 400)

    particles.push(particle)
  }
  //
  // Play sweep sound at the start of assembly effect
  //
  sfx && Sound.playSpawnSweep(sfx)
  //
  // Animate particles to center
  //
  let particlesGathered = false
  let soundPlayed = false

  const updateHandler = k.onUpdate(() => {
    //
    // Keep the body pinned while hidden so gravity can't start a land loop
    //
    character.pos.x = x
    character.pos.y = y
    character.vel.x = 0
    character.vel.y = 0
    if (!particlesGathered) {
      let allGathered = true
      let allNearTarget = true

      particles.forEach(particle => {
        if (!particle.exists()) return

        const dx = particle.targetX - particle.pos.x
        const dy = particle.targetY - particle.pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > 5) {
          allGathered = false
          const moveSpeed = particle.speed * k.dt()
          particle.pos.x += (dx / dist) * moveSpeed
          particle.pos.y += (dy / dist) * moveSpeed
        }
        //
        // Check if particles are close to target (for early sound trigger)
        //
        if (dist > 20) {
          allNearTarget = false
        }
      })
      //
      // Play click sound when particles are close but not yet fully assembled
      //
      if (!soundPlayed && allNearTarget && sfx) {
        Sound.playSpawnClick(sfx)
        soundPlayed = true
      }

      if (allGathered) {
        particlesGathered = true
        //
        // Remove particles
        //
        particles.forEach(p => {
          if (p.exists()) k.destroy(p)
        })
        //
        // Reveal at the spawn point with a clean grounded jump state
        //
        character.pos.x = x
        character.pos.y = y
        character.vel.x = 0
        character.vel.y = 0
        character.gravityScale = prevGravityScale ?? 1
        character.hidden = false
        resetAirborneState(inst)
        //
        // Mark hero as spawned (allow controls) and invulnerable
        //
        inst.isSpawned = true
        inst.isInvulnerable = true
        inst.invulnerabilityTimer = 3.0  // 3 seconds of invulnerability
        //
        // Spawn Y sits slightly above the floor — ignore the short settle
        // fall so it can't start the jump/land crouch hang.
        //
        inst.spawnLandGrace = 0.35
        //
        // Cancel update
        //
        updateHandler.cancel()
      }
    }
  })
}

/**
 * Create particles around hero when a new body part is added
 * @param {Object} inst - Hero instance
 */
function createBodyPartParticles(inst) {
  const k = inst.k
  const heroX = inst.character.pos.x
  const heroY = inst.character.pos.y
  const particleCount = 12
  const bodyColor = inst.bodyColor || CFG.visual.colors.hero.body
  //
  // Create heart particles flying outward (hero body color with black outline)
  //
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount
    const speed = 80 + Math.random() * 40
    const lifetime = 0.6 + Math.random() * 0.4
    const heartSize = 20 + Math.random() * 10
    //
    // Create black outline hearts (8 directions)
    //
    const outlineOffset = 1.5
    const outlineOffsets = [
      [-outlineOffset, -outlineOffset],
      [0, -outlineOffset],
      [outlineOffset, -outlineOffset],
      [-outlineOffset, 0],
      [outlineOffset, 0],
      [-outlineOffset, outlineOffset],
      [0, outlineOffset],
      [outlineOffset, outlineOffset]
    ]
    
    outlineOffsets.forEach(([dx, dy]) => {
      const outlineParticle = k.add([
        k.text('♥', { size: heartSize }),
        k.pos(heroX + dx, heroY + dy),
        k.color(0, 0, 0),
        k.opacity(1),
        k.z(50)
      ])
      //
      // Animate outline particle
      //
      const startTime = k.time()
      outlineParticle.onUpdate(() => {
        const elapsed = k.time() - startTime
        if (elapsed > lifetime) {
          k.destroy(outlineParticle)
          return
        }
        outlineParticle.pos.x += Math.cos(angle) * speed * k.dt()
        outlineParticle.pos.y += Math.sin(angle) * speed * k.dt()
        outlineParticle.opacity = 1 - (elapsed / lifetime)
      })
    })
    //
    // Create main colored heart
    //
    const colorClean = String(bodyColor).replace('#', '')
    const r = parseInt(colorClean.substring(0, 2), 16)
    const g = parseInt(colorClean.substring(2, 4), 16)
    const b = parseInt(colorClean.substring(4, 6), 16)
    
    const particle = k.add([
      k.text('♥', { size: heartSize }),
      k.pos(heroX, heroY),
      k.color(r, g, b),
      k.opacity(1),
      k.z(51)
    ])
    //
    // Animate particle outward with fade
    //
    const startTime = k.time()
    particle.onUpdate(() => {
      const elapsed = k.time() - startTime
      if (elapsed > lifetime) {
        k.destroy(particle)
        return
      }
      particle.pos.x += Math.cos(angle) * speed * k.dt()
      particle.pos.y += Math.sin(angle) * speed * k.dt()
      particle.opacity = 1 - (elapsed / lifetime)
    })
  }
}

/**
 * Update character animation and state
 * @param {Object} inst - Hero instance
 */
function onUpdate(inst) {
  //
  // Virtual jump button (touch devices)
  //
  TouchControls.processVirtualJump()
  //
  // Skip updates during annihilation (but allow paused for post-absorption idle)
  //
  if (inst.isAnnihilating) return
  //
  // Update invulnerability timer
  //
  if (inst.isInvulnerable) {
    inst.invulnerabilityTimer -= inst.k.dt()
    if (inst.invulnerabilityTimer <= 0) {
      inst.isInvulnerable = false
      inst.invulnerabilityTimer = 0
    }
  }
  //
  // For non-controllable characters (like in menu), always use idle animation
  //
  if (!inst.controllable) {
    inst.ambientWalk ? updateAmbientWalkAnimation(inst) : updateIdleAnimation(inst)
    inst.character.flipX = inst.direction === -1
    return
  }
  //
  // Handle movement input (check if spawned first)
  //
  if (inst.isSpawned && !inst.controlsDisabled) {
    let isMovingLeft = false
    let isMovingRight = false
    if (TouchControls.needsTouchControls()) {
      isMovingLeft = TouchControls.isMoveLeftHeld() || isAnyKeyDown(inst.k, CFG.controls.moveLeft)
      isMovingRight = TouchControls.isMoveRightHeld() || isAnyKeyDown(inst.k, CFG.controls.moveRight)
    } else {
      isMovingLeft = isAnyKeyDown(inst.k, CFG.controls.moveLeft)
      isMovingRight = isAnyKeyDown(inst.k, CFG.controls.moveRight)
    }
    //
    // Apply control inversion if flag is set (for time section level 3)
    //
    if (inst.controlsReversed) {
      const temp = isMovingLeft
      isMovingLeft = isMovingRight
      isMovingRight = temp
    }
    //
    // Apply confusion key map if set (word level 4 confusion platform).
    // Each remapped key that resolves to a movement action drives that movement;
    // jump-mapped keys are handled separately in setupControls.
    //
    if (inst.confusionMap) {
      const km = inst.confusionMap.keyMap
      isMovingLeft = false
      isMovingRight = false
      CONFUSION_KEYS.forEach(entry => {
        const action = km[entry.name]
        if (action !== 'moveLeft' && action !== 'moveRight') return
        const keys = entry.phys ? [entry.name, entry.phys] : [entry.name]
        if (!isAnyKeyDown(inst.k, keys)) return
        action === 'moveLeft' ? (isMovingLeft = true) : (isMovingRight = true)
      })
    }
    //
    // Apply movement only once per frame, prioritizing last pressed direction
    //
    if (isMovingLeft && !isMovingRight) {
      inst.character.move(-inst.speed, 0)
      inst.direction = -1
    } else if (isMovingRight && !isMovingLeft) {
      inst.character.move(inst.speed, 0)
      inst.direction = 1
    }
    //
    // Store effective movement so the animation system can use it even when
    // confused remapping routes non-standard keys (up/down/space) into movement
    //
    inst._effectivelyMoving = isMovingLeft || isMovingRight
  }
  //
  // Determine movement state; requires spawn so keys don't trigger sounds before hero appears.
  // When confusion is active, use the stored effective flag instead of raw key state so the
  // run animation plays correctly for any key that resolves to horizontal movement.
  //
  const isMoving = inst.isSpawned && !inst.controlsDisabled && (
    inst.confusionMap
      ? (inst._effectivelyMoving === true)
      : (TouchControls.needsTouchControls()
          ? (TouchControls.isMoveLeftHeld() || TouchControls.isMoveRightHeld()
            || isAnyKeyDown(inst.k, CFG.controls.moveLeft) || isAnyKeyDown(inst.k, CFG.controls.moveRight))
          : (isAnyKeyDown(inst.k, CFG.controls.moveLeft) || isAnyKeyDown(inst.k, CFG.controls.moveRight)))
  )
  //
  // Check if character is grounded (use isGrounded method or check if falling/jumping)
  //
  const isGrounded = inst.character.isGrounded()
  //
  // Tick land-FX debounce so a grounded flicker can't double-fire dust/sound
  //
  inst.landFxCooldown > 0 && (inst.landFxCooldown = Math.max(0, inst.landFxCooldown - inst.k.dt()))
  //
  // Post-spawn floor settle — ignore brief fall before the feet plant
  //
  inst.spawnLandGrace > 0 && (inst.spawnLandGrace = Math.max(0, inst.spawnLandGrace - inst.k.dt()))
  //
  // Post-land air lock — log snaps / hitbox resize must not restart jump/land
  //
  inst.postLandAirLock > 0 && (inst.postLandAirLock = Math.max(0, inst.postLandAirLock - inst.k.dt()))
  //
  // Clear dialog Space gate only after jump keys have been fully released
  // for a beat — prevents key-repeat / same-frame Space from re-crouching.
  //
  if (inst.jumpKeyReleaseGate) {
    const jumpHeld = inst.k.isKeyDown('space') || inst.k.isKeyDown('up') || inst.k.isKeyDown('w')
    if (jumpHeld) {
      inst.jumpKeyReleaseHold = 0
    } else {
      inst.jumpKeyReleaseHold = (inst.jumpKeyReleaseHold || 0) + inst.k.dt()
      //
      // Hold the gate longer so dialog Space cannot chain into wood jumps
      //
      if (inst.jumpKeyReleaseHold >= 0.22) {
        inst.jumpKeyReleaseGate = false
        inst.jumpKeyReleaseHold = 0
        inst.canJump = true
      }
    }
  }
  //
  // Wood platforms: pre-jump squash can briefly unground — abort only that
  // orphaned squash so it cannot loop crouch↔air. Never cancel an intentional
  // grounded squash while postLandAirLock is ticking (that killed jumps after
  // letter dialogs on glow logs).
  //
  if (inst.isSquashing && !isGrounded) {
    cancelJumpSquash(inst)
    syncJumpCollision(inst)
  }
  //
  // While controls are locked (dialog / intro), freeze jump/land poses to idle
  //
  if (inst.controlsDisabled || !inst.controllable) {
    if (inst.isSquashing || inst.landSquashTimer > 0 || inst.jumpPhase !== 'none') {
      cancelJumpSquash(inst)
      inst.landSquashTimer = 0
      inst.wasJumping = false
      syncJumpCollision(inst)
      if (isGrounded && !isMoving) {
        updateIdleAnimation(inst)
        inst.character.flipX = inst.direction === -1
        return
      }
    }
  } else if (inst.postLandAirLock > 0 && !inst.isSquashing) {
    //
    // Air-lock only suppresses false land-crouch — never eat a real jump squash
    //
    inst.landSquashTimer = 0
    if (inst.jumpPhase !== 'none' && isGrounded) {
      inst.jumpPhase = 'none'
      inst.wasJumping = false
      syncJumpCollision(inst)
    }
  }
  //
  // Forced crouch pose (e.g. bug touch reaction). Holds the hero in the
  // squat sprite for a short duration and blocks the rest of the animation
  // pipeline so running/idle frames don't immediately override it.
  //
  if (inst.crouchTimer > 0 && isGrounded) {
    inst.crouchTimer -= inst.k.dt()
    if (inst.crouchTimer <= 0) {
      inst.crouchTimer = 0
      inst.isCrouching = false
    } else {
      inst.isCrouching = true
      const prefix = inst.spritePrefix || inst.type
      if (inst.jumpFrame !== 0) {
        inst.jumpFrame = 0
        inst.character.use(inst.k.sprite(`${prefix}-jump-0`))
      }
      inst.character.flipX = inst.direction === -1
      return
    }
  }
  //
  // Handle pre-jump squash animation (only when grounded)
  //
  if (inst.isSquashing && isGrounded) {
    //
    // Dialog Space must never finish a crouch→launch on wood platforms
    //
    if (inst.jumpKeyReleaseGate || inst.controlsDisabled || !inst.controllable) {
      cancelJumpSquash(inst)
      updateIdleAnimation(inst)
      inst.character.flipX = inst.direction === -1
      return
    }
    if (isJumpCeilingBlocked(inst)) {
      cancelJumpSquash(inst)
      inst.eyesClosed && updateIdleAnimation(inst)
      inst.character.flipX = inst.direction === -1
      return
    }
    inst.squashTimer += inst.k.dt()
    const prefix = inst.spritePrefix || inst.type
    //
    // Switch between frame 0 (squash) and frame 1 (stretch) while on ground
    //
    if (inst.squashTimer < JUMP_STRETCH_START) {
      //
      // First part: squash (frame 0)
      //
      if (inst.jumpFrame !== 0) {
        inst.jumpFrame = 0
        inst.character.use(inst.k.sprite(`${prefix}-jump-0`))
      }
    } else {
      //
      // Second part: start stretching while still on ground (frame 1)
      //
      // This creates anticipation before the actual jump
      //
      if (inst.jumpFrame !== 1) {
        inst.jumpFrame = 1
        inst.character.use(inst.k.sprite(`${prefix}-jump-1`))
      }
    }
    //
    // Squash / pre-stretch frames shrink the hitbox with the body
    //
    syncJumpCollision(inst)

    if (inst.squashTimer >= JUMP_SQUASH_TIME) {
      //
      // Squash animation complete - actually jump!
      //
      inst.character.vel.y = -inst.jumpForce
      inst.jumpTakeoffSpeed = inst.jumpForce
      inst.canJump = false
      inst.isSquashing = false
      inst.squashTimer = 0
      inst.jumpPhase = 'jumping'
      inst.jumpCeilingBonk = false
      inst.postLandAirLock = 0
      //
      // Keep frame 1 (stretch) for smooth transition to air
      //
    }
    //
    // Update direction during squash
    //
    inst.character.flipX = inst.direction === -1
    //
    // Don't process other animations during squash
    //
    return
  }

  if (!isGrounded) {
    //
    // While particles assemble the body still falls under gravity — ignore
    // air time / jump frames so reveal doesn't inherit a stuck land loop.
    //
    if (!inst.isSpawned) {
      inst.airTime = 0
      inst.wasJumping = false
      inst.jumpPhase = 'none'
      inst.landSquashTimer = 0
      syncJumpCollision(inst)
    } else {
      inst.airTime += inst.k.dt()
    }
    //
    // Brief platform contact flicker (run or idle) — stay in the current
    // cycle instead of entering jump/land-squat (spawn settle + log jitter /
    // gold sprite swap). Only keep air anim if a real jump was already underway.
    //
    if (inst.postLandAirLock > 0) {
      const intentionalJump = inst.wasJumping && inst.jumpPhase === 'jumping'
      if (!intentionalJump) {
        inst.airTime = 0
        inst.jumpPhase = 'none'
        inst.wasJumping = false
        inst.landSquashTimer = 0
        inst.isSquashing = false
        inst.squashTimer = 0
        inst.jumpCeilingBonk = false
        //
        // Do not zero vel.y — that pinned the hero inside thin wood / froze
        // trampoline launches under overhead branches.
        //
        syncJumpCollision(inst)
        if (!isMoving) {
          updateIdleAnimation(inst)
        }
        inst.character.flipX = inst.direction === -1
        return
      }
    }
    const groundFlicker = (inst.spawnLandGrace > 0 && inst.jumpPhase !== 'jumping') ||
      (inst.airTime < MIN_AIR_TIME_FOR_JUMP &&
        Math.abs(inst.character.vel.y) < 80 &&
        inst.jumpPhase !== 'jumping')
    if (inst.isSpawned && !groundFlicker) {
      //
      // Cancel any squash that was accidentally started while airborne (e.g. when
      // standing on a dynamic/floating platform that Kaplay doesn't mark as grounded).
      // Without this, the squash state persists until the hero next touches solid
      // ground, causing an involuntary jump on landing.
      //
      if (inst.isSquashing) {
        inst.isSquashing = false
        inst.squashTimer = 0
      }
      //
      // Head into a branch/platform: full standing height and fall (no tucked pose)
      //
      resolveJumpCeilingBonk(inst)
      //
      // Jumping - update animation based on velocity (position in jump arc)
      //
      const prefix = inst.spritePrefix || inst.type
      const velocity = inst.character.vel.y
      let targetFrame = inst.jumpFrame
      if (inst.jumpCeilingBonk) {
        //
        // After a ceiling hit stay at full-body descent frames
        //
        targetFrame = velocity < 200 ? 4 : 5
      } else if (velocity < -400) {
        targetFrame = 1
      } else if (velocity < -150) {
        targetFrame = 2
      } else if (velocity < 100) {
        targetFrame = 3
      } else if (velocity < 400) {
        targetFrame = 4
      } else {
        targetFrame = 5
      }
      if (targetFrame !== inst.jumpFrame) {
        inst.jumpFrame = targetFrame
        inst.character.use(inst.k.sprite(`${prefix}-jump-${targetFrame}`))
      }
      syncJumpCollision(inst)
      if (!inst.wasJumping) {
        inst.runFrame = 0
        inst.runTimer = 0
        inst.isRunning = false
        inst.wasJumping = true
        inst.jumpPhase = 'jumping'
      }
      inst.character.flipX = inst.direction === -1
      return
    }
  } else {
    //
    // Kaplay platform onCollide fires on contact enter — refresh canJump every grounded frame.
    //
    !inst.isSquashing && (inst.canJump = true)
    //
    // Only play the landing crouch after a real jump, not a mid-run flicker
    //
    if (inst.jumpPhase !== 'none') {
      //
      // Air-lock after log snap / gold sprite swap is not a real jump landing
      //
      const realJump = inst.airTime >= MIN_AIR_TIME_FOR_JUMP &&
        inst.spawnLandGrace <= 0 &&
        inst.postLandAirLock <= 0
      inst.jumpPhase = 'none'
      inst.jumpFrame = 0
      inst.isSquashing = false
      inst.squashTimer = 0
      inst.jumpCeilingBonk = false
      if (realJump) {
        inst.landSquashTimer = LAND_SQUASH_TIME
        inst.postLandAirLock = POST_LAND_AIR_LOCK
        const prefix = inst.spritePrefix || inst.type
        inst.character.use(inst.k.sprite(`${prefix}-jump-6`))
        inst.currentEyeSprite = null
      } else {
        inst.wasJumping = false
        inst.landSquashTimer = 0
      }
    }
    inst.airTime = 0
    inst.jumpCeilingBonk = false
    //
    // Grounded ⇒ full hitbox (syncJumpCollision never compresses on the ground)
    //
    syncJumpCollision(inst)
    //
    // Hold the landing crouch for a beat unless the player is already
    // running — the run cycle takes over immediately in that case.
    // Celebration idleOnly must reach closed-eyes idle after a run, so
    // land squash must not swallow that transition.
    //
    if (inst.landSquashTimer > 0) {
      inst.landSquashTimer -= inst.k.dt()
      if (!isMoving && inst.landSquashTimer > 0 && !(inst.eyesClosed && inst.eyesClosedIdleOnly)) {
        inst.character.flipX = inst.direction === -1
        return
      }
      inst.landSquashTimer = 0
      inst.wasJumping = false
    }
  }
  //
  // Celebration / calm idleOnly: keys up on the ground ⇒ always leave the
  // sideways run frame and return to idle (closed eyes when eyesClosed).
  //
  if (inst.eyesClosedIdleOnly && inst.eyesClosed && isGrounded && !isMoving && !inst.isSquashing) {
    inst.isRunning = false
    inst.wasJumping = false
    inst.landSquashTimer = 0
    inst.jumpPhase = 'none'
    updateIdleAnimation(inst)
    inst.character.flipX = inst.direction === -1
    return
  }
  //
  // Calm meditation: always hold the closed-eyes idle frame on the ground,
  // even while walking on the calm platform (no run/side-view frames).
  // idleOnly (celebration): closed eyes only while standing still — run is OK.
  //
  if (inst.eyesClosed && isGrounded && inst.jumpPhase === 'none' && !inst.isSquashing) {
    if (!inst.eyesClosedIdleOnly || !isMoving) {
      inst.isRunning = false
      inst.wasJumping = false
      updateIdleAnimation(inst)
      inst.character.flipX = inst.direction === -1
      return
    }
  }

  if (isMoving) {
    //
    // Running - switch frames smoothly (time-based animation)
    //
    // Only reset animation if starting from idle (not from jump)
    //
    const prefix = inst.spritePrefix || inst.type
    if (!inst.isRunning && !inst.wasJumping) {
      inst.runFrame = 0
      inst.runTimer = 0
      inst.currentEyeSprite = null
      inst.character.use(inst.k.sprite(`${prefix}-run-0`))
      //
      // Create dust particles when starting to run (skip in water)
      //
      !inst.suppressDust && createRunStartDust(inst, inst.direction)
    } else if (inst.wasJumping) {
      //
      // Just landed - continue with current frame, just update sprite
      //
      inst.wasJumping = false
      inst.currentEyeSprite = null
      inst.character.use(inst.k.sprite(`${prefix}-run-${inst.runFrame}`))
    }

    inst.isRunning = true
    inst.runTimer += inst.k.dt()
    if (inst.runTimer > RUN_ANIM_SPEED) {
      inst.runFrame = (inst.runFrame + 1) % RUN_FRAME_COUNT
      inst.currentEyeSprite = null
      inst.character.use(inst.k.sprite(`${prefix}-run-${inst.runFrame}`))
      inst.runTimer = 0
      //
      // Step sound + footprint on the contact frames (a foot plants on the
      // ground twice per 8-frame cycle — frames 0 and 4)
      //
      if (inst.runFrame % (RUN_FRAME_COUNT / 2) === 0) {
        inst.sfx && Sound.playStepSound(inst.sfx, inst.currentLevel)
        spawnFootprint(inst)
      }
    }
  } else {
    //
    // Idle - with eye animation
    //
    updateIdleAnimation(inst)
  }
  //
  // Mirror based on direction
  //
  inst.character.flipX = inst.direction === -1
}
//
// Clears jump/land timers and restores the full grounded hitbox. Used after
// spawn assembly and after manual platform snaps.
//
function resetAirborneState(inst) {
  inst.wasJumping = false
  inst.jumpFrame = 0
  inst.jumpPhase = 'none'
  inst.isSquashing = false
  inst.squashTimer = 0
  inst.landSquashTimer = 0
  inst.airTime = 0
  inst.jumpCeilingBonk = false
  inst.jumpCollisionTuck = 0
  inst.jumpCollisionLift = 0
  syncJumpCollision(inst)
}
//
// 0 at takeoff/landing, 1 at apex — smooth in |vel.y| so the hitbox bottom
// rises with jump height instead of jumping on a single peak frame.
//
function getJumpPeakFactor(inst) {
  const vy = inst.character?.vel?.y ?? 0
  const takeoff = Math.max(80, inst.jumpTakeoffSpeed || inst.jumpForce || 1)
  if (vy < 0) return 1 - Math.min(1, (-vy) / takeoff)
  return 1 - Math.min(1, vy / takeoff)
}
//
// Raises and shortens the collision box with jump height. ONLY while
// airborne — resizing on the ground ejected the hero into a jump loop.
// On restore the character is nudged so the feet edge does not expand
// down into the platform.
//
function syncJumpCollision(inst) {
  const area = inst.character?.area
  if (!area) return
  const ch = inst.character
  const grounded = typeof ch.isGrounded === 'function' && ch.isGrounded()
  //
  // After a head-bonk keep the full standing hitbox while falling
  //
  const compressed = !grounded && inst.jumpPhase === 'jumping' && !inst.jumpCeilingBonk
  const peak = compressed ? getJumpPeakFactor(inst) : 0
  const tuck = peak * JUMP_COLLISION_MAX_TUCK
  const lift = peak * JUMP_COLLISION_MAX_LIFT
  const tuckKey = Math.round(tuck * 200) / 200
  const liftKey = Math.round(lift * 2) / 2
  if (tuckKey === inst.jumpCollisionTuck && liftKey === inst.jumpCollisionLift) return
  const prevHeight = Math.max(8, Math.round(inst.collisionBaseHeight * (1 - (inst.jumpCollisionTuck || 0))))
  const prevOffsetY = inst.collisionBaseOffsetY - (inst.jumpCollisionLift || 0)
  const prevBottom = prevOffsetY + prevHeight
  const scale = 1 - tuck
  inst.jumpCollisionScale = scale
  inst.jumpCollisionLift = liftKey
  inst.jumpCollisionTuck = tuckKey
  const height = Math.max(8, Math.round(inst.collisionBaseHeight * scale))
  //
  // Lift the whole box with the body; shorter height also raises the feet
  //
  const offsetY = inst.collisionBaseOffsetY - liftKey
  if (grounded) {
    const sink = (offsetY + height) - prevBottom
    sink > 0 && (ch.pos.y -= sink)
  }
  area.shape = new inst.k.Rect(
    inst.k.vec2(inst.collisionBaseOffsetX, offsetY),
    inst.collisionBaseWidth,
    height
  )
}

/**
 * Update idle animation with eye movement
 * @param {Object} inst - Hero instance
 */
function updateIdleAnimation(inst) {
  //
  // Calm: hold the closed-eyes idle frame and skip all eye wander/tracking
  //
  if (inst.eyesClosed) {
    inst.isRunning = false
    inst.wasJumping = false
    const prefix = inst.spritePrefix || inst.type
    const closedName = `${prefix}_closed`
    //
    // Always re-apply: run frames swap the sprite without clearing
    // currentEyeSprite, so a stale closedName match left the hero frozen
    // on a sideways run frame after keys were released (touch L1 end music).
    //
    inst.character.use(inst.k.sprite(closedName))
    inst.currentEyeSprite = closedName
    return
  }
  //
  // If just stopped running or just landed, instantly switch to idle
  //
  if (inst.isRunning || inst.wasJumping) {
    inst.isRunning = false
    inst.wasJumping = false
    inst.runFrame = 0
    inst.runTimer = 0
    //
    // Instantly switch to current idle sprite
    //
    const roundedX = Math.round(inst.eyeOffsetX)
    const roundedY = Math.round(inst.eyeOffsetY)
    const spriteName = getSpriteName(inst, roundedX, roundedY)
    inst.character.use(inst.k.sprite(spriteName))
    inst.currentEyeSprite = spriteName
  }
  //
  // Eye animation: track lookAtPos if set, otherwise random wander
  //
  if (inst.lookAtPos) {
    const heroPos = inst.character?.pos
    if (heroPos) {
      const dx = inst.lookAtPos.x - heroPos.x
      const dy = inst.lookAtPos.y - heroPos.y
      inst.targetEyeX = dx > 20 ? 1 : dx < -20 ? -1 : 0
      inst.targetEyeY = dy > 20 ? 1 : dy < -20 ? -1 : 0
    }
  } else {
    inst.eyeTimer += inst.k.dt()
    if (inst.eyeTimer > inst.k.rand(EYE_ANIM_MIN_DELAY, EYE_ANIM_MAX_DELAY)) {
      inst.targetEyeX = inst.k.choose([-1, 0, 1])
      inst.targetEyeY = inst.k.choose([-1, 0, 1])
      inst.eyeTimer = 0
    }
  }
  //
  // Smoothly interpolate to target position
  //
  inst.eyeOffsetX = inst.k.lerp(inst.eyeOffsetX, inst.targetEyeX, EYE_LERP_SPEED)
  inst.eyeOffsetY = inst.k.lerp(inst.eyeOffsetY, inst.targetEyeY, EYE_LERP_SPEED)
  //
  // Round for pixel-art style
  //
  const roundedX = Math.round(inst.eyeOffsetX)
  const roundedY = Math.round(inst.eyeOffsetY)
  //
  // Switch to preloaded sprite with eyes
  //
  const spriteName = getSpriteName(inst, roundedX, roundedY)
  //
  // Update sprite only if eye position changed
  //
  if (inst.currentEyeSprite !== spriteName) {
    inst.character.use(inst.k.sprite(spriteName))
    inst.currentEyeSprite = spriteName
  }
}

//
// Slow run cycle for distant background walkers — avoids idle/run sprite fighting
//
function updateAmbientWalkAnimation(inst) {
  const prefix = inst.spritePrefix || inst.type
  inst.runTimer += inst.k.dt()
  if (inst.runTimer >= inst.ambientRunSpeed) {
    inst.runFrame = (inst.runFrame + 1) % RUN_FRAME_COUNT
    inst.runTimer = 0
  }
  const runSprite = `${prefix}-run-${inst.runFrame}`
  if (inst.currentEyeSprite !== runSprite) {
    inst.character.use(inst.k.sprite(runSprite))
    inst.currentEyeSprite = runSprite
  }
}

/**
 * Setup keyboard controls for character
 * @param {Object} inst - Hero instance
 */
function setupControls(inst) {
  //
  // Core jump execution — shared by all key bindings
  //
  const executeJump = () => {
    //
    // controllable=false / open letter panels: Space closes the dialog and must
    // not start a crouch→jump (especially on glow wood platforms after O).
    //
    if (!inst.isSpawned || inst.isAnnihilating || inst.controlsDisabled || !inst.controllable) return
    if (isAnyPanelOpen()) return
    //
    // Dialog Space must not chain into a jump — wait until jump keys are up
    //
    if (inst.jumpKeyReleaseGate) return
    if (isJumpCeilingBlocked(inst)) return
    if (inst.canJump && !inst.isSquashing) {
      inst.isSquashing = true
      inst.squashTimer = 0
      inst.jumpFrame = 0
      const prefix = inst.spritePrefix || inst.type
      inst.character.use(inst.k.sprite(`${prefix}-jump-0`))
    }
  }
  //
  // Resolve whether a confusion key (by kaplay name) is currently mapped to jump
  //
  const confusionJumps = (name) => inst.confusionMap && inst.confusionMap.keyMap[name] === 'jump'
  //
  // Unified jump handler for a single control key. When confused, the key only
  // jumps if its remap resolves to jump; otherwise only the normal jump keys jump.
  //
  const jumpHandlerFor = (name) => () => {
    if (inst.confusionMap) {
      confusionJumps(name) && executeJump()
    } else if (CONFUSION_NORMAL_JUMP_NAMES.includes(name)) {
      executeJump()
    }
  }
  //
  // Register a jump handler on every confusion key (kaplay name + physical code)
  // so any key the confusion map reassigns to jump can trigger a jump.
  //
  CONFUSION_KEYS.forEach(entry => {
    const handler = jumpHandlerFor(entry.name)
    inst.k.onKeyPress(entry.name, handler)
    entry.phys && onPhysicalKeyPress(entry.phys, handler)
  })
  //
  // Virtual jump button always jumps (touch controls are never confused)
  //
  TouchControls.registerVirtualJumpHandler(executeJump)
}

/**
 * Create landing dust particles
 * @param {Object} inst - Hero instance
 */
function createLandingDust(inst) {
  const { k, character } = inst
  //
  // Calculate foot position (bottom of collision box)
  //
  const footY = character.pos.y + (COLLISION_HEIGHT / 2) + COLLISION_OFFSET_Y
  const footX = character.pos.x

  createDustParticles(inst, footX, footY, 'splash')
}

/**
 * Create run start dust particles
 * @param {Object} inst - Hero instance
 * @param {number} direction - Movement direction (-1 = left, 1 = right)
 */
function createRunStartDust(inst, direction) {
  const { k, character } = inst
  //
  // Calculate foot position (bottom of collision box)
  //
  const footY = character.pos.y + (COLLISION_HEIGHT / 2) + COLLISION_OFFSET_Y
  const footX = character.pos.x

  createDustParticles(inst, footX, footY, 'run', direction)
}

/**
 * Create dust particles (shared logic for landing and run start)
 * @param {Object} inst - Hero instance
 * @param {number} footX - X position of foot
 * @param {number} footY - Y position of foot
 * @param {string} type - 'splash' (both sides) or 'run' (backward direction)
 * @param {number} direction - Movement direction (for run type)
 */
function createDustParticles(inst, footX, footY, type = 'splash', direction = 1) {
  const { k } = inst
  //
  // Create dust particles at feet position
  //
  for (let i = 0; i < DUST_PARTICLE_COUNT; i++) {
    //
    // Determine particle direction based on type
    //
    let side
    if (type === 'splash') {
      //
      // Splash: particles spread to both sides
      //
      side = i < DUST_PARTICLE_COUNT / 2 ? -1 : 1
    } else {
      //
      // Run: particles go backward (opposite to movement direction)
      //
      side = -direction
    }
    //
    // Angle: mostly horizontal with slight upward direction (like splash)
    //
    // Range: 5-30 degrees from horizontal (flatter splash)
    //
    const angle = k.rand(5, 30) * (Math.PI / 180)
    const speed = k.rand(DUST_PARTICLE_SPEED * 0.8, DUST_PARTICLE_SPEED * 1.5)
    const vx = Math.cos(angle) * speed * side
    const vy = -Math.sin(angle) * speed  // Negative = upward
    //
    // Start from foot position, spread horizontally to sides
    //
    const offsetX = side * k.rand(5, 15)

    //
    // Create particle with custom or default color
    //
    const outlineColor = getRGB(k, CFG.visual.colors.outline)
    let particleR, particleG, particleB
    if (inst.dustColor) {
      //
      // Use custom dust color (hex string) - parse directly to get RGB values
      // Keep blue tint by varying channels differently
      //
      const [baseR, baseG, baseB] = parseHex(inst.dustColor)
      //
      // Vary channels to keep blue tint: less variation for red (keep it darker),
      // more variation for green and blue (but keep blue dominant)
      //
      const variationR = k.rand(-5, 5)  // Less variation for red
      const variationG = k.rand(-8, 8)  // Medium variation for green
      const variationB = k.rand(-10, 5)  // More variation for blue, but don't go too bright
      particleR = Math.max(0, Math.min(255, baseR + variationR))
      particleG = Math.max(0, Math.min(255, baseG + variationG))
      particleB = Math.max(0, Math.min(255, baseB + variationB))
    } else {
      //
      // Default gray color
      //
      particleR = 150
      particleG = 150
      particleB = 150
    }
    
    const particle = k.add([
      k.rect(DUST_PARTICLE_SIZE, DUST_PARTICLE_SIZE),
      k.pos(footX + offsetX, footY - 2),  // Slightly above ground
      k.color(particleR, particleG, particleB),
      k.outline(1.5, k.rgb(outlineColor.r, outlineColor.g, outlineColor.b)),
      k.opacity(0.9),
      k.anchor("center"),
      k.z(50),
    ])
    //
    // Store particle velocity and lifetime
    //
    particle.vx = vx
    particle.vy = vy
    particle.lifetime = 0
    particle.maxLifetime = DUST_PARTICLE_LIFETIME
    //
    // Update particle position and fade out
    //
    particle.onUpdate(() => {
      particle.lifetime += k.dt()
      //
      // Move particle
      //
      particle.pos.x += particle.vx * k.dt()
      particle.pos.y += particle.vy * k.dt()
      //
      // Apply gravity (particles fall down after initial splash)
      //
      particle.vy += 600 * k.dt()
      //
      // Apply friction (horizontal slowdown)
      //
      particle.vx *= 0.97
      //
      // Fade out based on lifetime
      //
      const progress = particle.lifetime / particle.maxLifetime
      particle.opacity = 0.9 * (1 - progress)
      //
      // Destroy when lifetime expires
      //
      if (particle.lifetime >= particle.maxLifetime) {
        k.destroy(particle)
      }
    })
  }
}

/**
 * Spawns a small footprint at the hero's current foot position.
 * Footprints alternate left/right and fade out over FOOTPRINT_LIFETIME.
 * @param {Object} inst - Hero instance
 */
function spawnFootprint(inst) {
  //
  // Levels can disable the footprint trail entirely (e.g. glow section).
  //
  if (inst.suppressFootprints) return
  if (!inst.character?.pos) return
  const footY = inst.character.pos.y + (COLLISION_HEIGHT / 2) + COLLISION_OFFSET_Y + FOOTPRINT_OFFSET_Y
  //
  // Alternate left/right foot offset so footprints zigzag slightly
  //
  inst.lastFootprintFoot = -inst.lastFootprintFoot
  const footX = inst.character.pos.x + inst.lastFootprintFoot * FOOTPRINT_OFFSET_X
  inst.footprints.push({
    x: footX,
    y: footY,
    life: FOOTPRINT_LIFETIME
  })
}
/**
 * Ages footprints over time and removes expired entries.
 * @param {Object} inst - Hero instance
 */
function onUpdateFootprints(inst) {
  const dt = inst.k.dt()
  const arr = inst.footprints
  for (let i = arr.length - 1; i >= 0; i--) {
    arr[i].life -= dt
    if (arr[i].life <= 0) arr.splice(i, 1)
  }
}
/**
 * Draws all live footprints for this hero as small fading dark ovals.
 * @param {Object} k - Kaplay instance
 * @param {Object} inst - Hero instance
 */
function drawFootprints(k, inst) {
  for (const fp of inst.footprints) {
    const alpha = (fp.life / FOOTPRINT_LIFETIME) * FOOTPRINT_OPACITY_START
    k.drawEllipse({
      pos: k.vec2(fp.x, fp.y),
      radiusX: FOOTPRINT_RADIUS_X,
      radiusY: FOOTPRINT_RADIUS_Y,
      color: k.rgb(FOOTPRINT_COLOR_R, FOOTPRINT_COLOR_G, FOOTPRINT_COLOR_B),
      opacity: alpha
    })
  }
}

//
// True when the hero/anti-hero meets all conditions to emit idle notes
// and (for the hero only) the whistle sound. The sfx gate is intentionally
// lenient so the anti-hero still shows visual notes even when no audio
// instance is passed in. Decorative (non-controllable / static) characters
// — e.g. the central hero on the main menu — bypass the spawn/ground
// checks so they can vocalize without needing a level scene around them.
//
function canVocalize(inst) {
  if (idleVocalizationSuppressed) return false
  if (inst.awakeOverride) return false
  if (!inst.idleVocalization) return false
  if (!inst.character?.exists?.()) return false
  if (inst.isAnnihilating || inst.isDying) return false
  if (inst.controlsDisabled) return false
  if (inst.isRunning || inst.wasJumping) return false
  //
  // Held movement keys also block vocalization: while the closed-eyes hold
  // suppresses the run animation, isRunning stays false even though the hero
  // is moving — without this check the singing (and the shut eyes) would
  // never end once movement starts, freezing the idle frame during a run.
  //
  if (inst._effectivelyMoving) return false
  const isDecorative = inst.controllable === false || inst.isStatic === true
  if (!isDecorative) {
    if (!inst.isSpawned) return false
    if (!inst.character.isGrounded?.()) return false
  }
  return true
}

//
// Updates floating note particles and schedules new emissions + hum sounds.
// Run every frame; cheap when no notes are alive and vocalization is off.
//
function onUpdateIdleNotes(inst) {
  const dt = inst.k.dt()
  decayWhistlePulse(inst)
  const active = canVocalize(inst)
  //
  // Track how long the hero has been continuously idle. Moving, jumping,
  // dying, etc. all reset the timer so the singing only starts after a
  // visible pause.
  //
  if (active) {
    inst.idleStillTime += dt
  } else {
    inst.idleStillTime = 0
  }
  //
  // The singing hero keeps his eyes serenely shut while notes flow from his
  // mouth. Only a closure made HERE is reopened when the song ends — eyes
  // shut externally (drowning, meditation, calm pose) are left untouched.
  //
  const singing = active && inst.idleStillTime >= IDLE_VOCALIZATION_DELAY
  if (singing && !inst.eyesClosed) {
    inst.eyesClosed = true
    inst.eyesClosedBySinging = true
  } else if (!singing && inst.eyesClosedBySinging) {
    inst.eyesClosedBySinging = false
    inst.eyesClosed = false
  }
  //
  // The melody restarts from its first note whenever the song is interrupted.
  //
  !singing && (inst.idleMelodyIndex = 0)
  //
  // Always age + drift existing notes so they fade out naturally if the
  // hero starts moving mid-emission.
  //
  for (const note of inst.idleNotes) {
    note.age += dt
    note.x = note.baseX + Math.sin((note.age + note.driftPhase) * IDLE_NOTE_DRIFT_FREQ * Math.PI * 2) * IDLE_NOTE_DRIFT_AMPLITUDE * (note.age / IDLE_NOTE_LIFETIME)
    note.y -= IDLE_NOTE_RISE_SPEED * dt
  }
  inst.idleNotes = inst.idleNotes.filter(n => n.age < IDLE_NOTE_LIFETIME)
  //
  // Only emit fresh notes/sounds after the idle warm-up has elapsed.
  //
  if (!active) return
  if (inst.idleStillTime < IDLE_VOCALIZATION_DELAY) return
  //
  // Single timer drives both the visual glyph and (for the hero) the
  // whistle note, so every note the player sees coincides with the
  // matching pitch in the audio. The timer follows the melody rhythm: each
  // note holds for its beat count before the next one is emitted.
  //
  inst.idleNoteEmitTimer -= dt
  if (inst.idleNoteEmitTimer <= 0) {
    const [, beats] = IDLE_MELODY[inst.idleMelodyIndex % IDLE_MELODY.length]
    spawnIdleNote(inst)
    playIdleVocalNote(inst)
    //
    // Pulse for listeners (e.g. L1 mushrooms leaning with each whistle note)
    //
    inst.whistlePulse = 1
    inst.whistleLeanSide = (inst.idleMelodyIndex % 2 === 0) ? 1 : -1
    inst.idleNoteEmitTimer = beats * IDLE_MELODY_BEAT + IDLE_MELODY_GAP
    inst.idleMelodyIndex = (inst.idleMelodyIndex + 1) % IDLE_MELODY.length
  }
}
//
// Decays the whistle lean pulse each frame (mushrooms / other listeners read it)
//
function decayWhistlePulse(inst) {
  if (!inst.whistlePulse) return
  inst.whistlePulse = Math.max(0, inst.whistlePulse - inst.k.dt() * WHISTLE_PULSE_DECAY)
}

//
// Pushes a new note particle beside the hero's mouth — offset to the LEFT
// of the head so the stream never covers the face.
//
function spawnIdleNote(inst) {
  const ch = inst.character
  if (!ch?.pos) return
  const mouthX = ch.pos.x + IDLE_NOTE_OFFSET_X
  const mouthY = ch.pos.y + IDLE_NOTE_OFFSET_Y
  const glyphs = IDLE_NOTE_GLYPHS[inst.idleVocalization] || IDLE_NOTE_GLYPHS.humming
  inst.idleNotes.push({
    baseX: mouthX,
    x: mouthX,
    y: mouthY,
    age: 0,
    driftPhase: Math.random(),
    glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
    angle: (Math.random() - 0.5) * 18
  })
}

//
// Picks a pleasant pitch from the hero's scale and triggers a soft whistle
// note through the shared sound system. The anti-hero and any "sleeping"
// vocalization stay silent on purpose — only the hero is heard, while
// other characters still get visual glyphs for atmosphere.
//
function playIdleVocalNote(inst) {
  if (!inst.sfx) return
  if (inst.type === HEROES.ANTIHERO) return
  if (inst.idleVocalization === 'sleeping') return
  //
  // Pitch and length come from the current melody step so the audio follows
  // the same tune the floating note glyphs visualize.
  //
  const [frequency, beats] = IDLE_MELODY[inst.idleMelodyIndex % IDLE_MELODY.length]
  Sound.playIdleHumNote(inst.sfx, {
    frequency,
    duration: beats * IDLE_MELODY_BEAT * IDLE_MELODY_SUSTAIN,
    whistleMode: true
  })
}

//
// Renders the live note glyphs above the hero. Notes fade from full opacity
// at birth to zero just before they expire.
//
function drawIdleNotes(k, inst) {
  if (!inst.idleNotes?.length) return
  const fontName = CFG?.visual?.fonts?.regularFull
  for (const note of inst.idleNotes) {
    const fade = 1 - note.age / IDLE_NOTE_LIFETIME
    const alpha = Math.max(0, Math.min(1, fade))
    k.drawText({
      text: note.glyph,
      pos: k.vec2(note.x, note.y),
      size: IDLE_NOTE_FONT_SIZE,
      anchor: 'center',
      color: k.rgb(255, 255, 255),
      opacity: alpha * 0.85,
      angle: note.angle,
      font: fontName
    })
  }
}
/**
 * Handle collision with platform
 * @param {Object} inst - Hero instance
 */
function onCollisionPlatform(inst) {
  //
  // Set canJump flag when touching platform
  //
  const wasInAir = !inst.canJump
  inst.canJump = true
  //
  // Play landing sound and create dust if was in air (once per cooldown)
  //
  const isGlow = inst.currentLevel?.startsWith('lesson-glow.')
  //
  // Glow: real air time can still land-SFX if wasJumping was cleared by wood
  // flicker — never treat gold-swap micro-ungrounds as landings.
  //
  const mayLandFx = inst.wasJumping ||
    (isGlow && inst.airTime >= MIN_AIR_TIME_FOR_JUMP)
  if (wasInAir && mayLandFx && inst.landFxCooldown <= 0 && inst.spawnLandGrace <= 0) {
    inst.landFxCooldown = LAND_FX_COOLDOWN
    //
    // Prefer the surface stamped by the platform collide tag this frame
    //
    if (isGlow && inst.sfx && !inst.sfx._glowSurface) {
      inst.sfx._glowSurface = 'ground'
    }
    inst.sfx && Sound.playLandSound(inst.sfx, inst.currentLevel)
    !isGlow && inst.wasJumping && inst.sfx && Sound.playJumpSound(inst.sfx, inst.currentLevel)
    //
    // Skip dust particles when suppressDust is set (e.g. landing in water)
    //
    !inst.suppressDust && createLandingDust(inst)
  }
}

/**
 * Points a character's pupils toward a world position.
 * @param {Object} inst - Hero or anti-hero instance
 * @param {number} worldX - Target world X
 * @param {number} worldY - Target world Y
 */
export function setEyesLookingAt(inst, worldX, worldY) {
  const pos = inst.character?.pos
  if (!pos?.exists?.()) return
  const dx = worldX - pos.x
  const dy = worldY - pos.y
  inst.eyeOffsetX = dx > 8 ? 1 : dx < -8 ? -1 : 0
  inst.eyeOffsetY = dy > 8 ? 1 : dy < -8 ? -1 : 0
  inst.character.use(inst.k.sprite(getSpriteName(inst, inst.eyeOffsetX, inst.eyeOffsetY)))
}

/**
 * Forces pupils toward a face-to-face partner even when the heroes stand very close.
 * @param {Object} inst - Hero or anti-hero instance
 * @param {number} partnerX - Partner world X
 * @param {number} partnerY - Partner world Y
 */
export function setEyesLookingAtPartner(inst, partnerX, partnerY) {
  const pos = inst.character?.pos
  if (!pos?.exists?.()) return
  const dx = partnerX - pos.x
  const dy = partnerY - pos.y
  //
  // Always pick a horizontal gaze direction; vertical only when clearly above/below
  //
  inst.eyeOffsetX = dx >= 0 ? 1 : -1
  inst.eyeOffsetY = dy > 6 ? 1 : dy < -6 ? -1 : 0
  inst.character.use(inst.k.sprite(getSpriteName(inst, inst.eyeOffsetX, inst.eyeOffsetY)))
}

/**
 * Temporarily hides baked sprite arms (used during touch L3 hand-hold draw).
 * @param {Object} inst - Hero or anti-hero instance
 * @param {boolean} hidden - When true, swap to a no-arms sprite
 */
export function setArmsHidden(inst, hidden) {
  if (hidden) {
    inst._savedAddArms === undefined && (inst._savedAddArms = inst.addArms)
    inst.addArms = false
  } else if (inst._savedAddArms !== undefined) {
    inst.addArms = inst._savedAddArms
    inst._savedAddArms = undefined
  }
  refreshHeroSpriteForArms(inst)
}

/**
 * Resets jump tuck and animation after manual platform snap (log platforms).
 * @param {Object} inst - Hero instance
 */
export function syncPlatformLanding(inst) {
  const char = inst?.character
  if (!char?.exists?.()) return
  resetAirborneState(inst)
  inst.canJump = true
  const prefix = inst.spritePrefix || inst.type
  char.use(inst.k.sprite(getSpriteName(inst, inst.eyeOffsetX ?? 0, inst.eyeOffsetY ?? 0)))
}

/**
 * Faces a character toward its partner and holds the idle frame during hand-hold.
 * @param {Object} inst - Hero or anti-hero instance
 * @param {number} partnerX - Partner world X
 */
export function forceIdleFacingPartner(inst, partnerX) {
  const ch = inst.character
  if (!ch?.exists?.()) return
  inst.isRunning = false
  inst.wasJumping = false
  inst.jumpPhase = 'none'
  ch.flipX = ch.pos.x > partnerX
  ch.use(inst.k.sprite(getSpriteName(inst, inst.eyeOffsetX ?? 0, inst.eyeOffsetY ?? 0)))
}

/**
 * Handle annihilation collision between hero and anti-hero
 * Both characters dissolve into particles and merge
 * @param {Object} inst - Hero instance
 */
export function onAnnihilationCollide(inst) {
  if (inst.isAnnihilating) return
  //
  // Annihilation can be temporarily locked (e.g. word level 4 keeps the grey
  // anti-hero inert until the hero calms it). While locked, touching does nothing.
  //
  if (inst.annihilationLocked) return

  inst.isAnnihilating = true
  const { k } = inst
  if (inst.currentLevel === 'lesson-touch.3' && inst.antiHero?.character?.exists?.()) {
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
      p.pos.x += p.vx * k.dt()
      p.pos.y += p.vy * k.dt()
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
            p.pos.x += p.vx * k.dt()
            p.pos.y += p.vy * k.dt()
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
            const nextLevel = getNextLevel(inst.currentLevel)
            const isLastWordLevel = inst.currentLevel === 'lesson-word.4' && nextLevel === 'word-complete'
            const isLastTimeLevel = inst.currentLevel === 'lesson-time.3' && nextLevel === 'time-complete'
            
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
                        console.error(`Failed to load sprite ${newSpriteName}:`, error)
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
                        createLevelTransition(k, inst.currentLevel)
                      })
                    })
                  })
                })
              })
            } else if (inst.currentLevel === 'lesson-touch.3' && nextLevel === 'touch-complete' && (!inst.addArms || inst.bodyColor !== TOUCH_SECTION_HERO_COLOR)) {
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
                        createLevelTransition(k, inst.currentLevel)
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
                      createLevelTransition(k, inst.currentLevel)
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
                  createLevelTransition(k, inst.currentLevel)
                })
              })
            } else {
              //
              // Normal sequence: pause after absorption and shake, then fade and show text
              //
              k.wait(0.6, () => {
                if (inst.currentLevel) {
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
                    createLevelTransition(k, inst.currentLevel)
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

/**
 * Universal function for character creation
 * Single function for hero and anti-hero
 * @param {string} type - Character type: 'hero' or 'antiHero'
 * @param {string} animation - Animation type: 'idle', 'run', 'jump'
 * @param {number} frame - Frame number (for animations)
 * @param {number} eyeOffsetX - Pupil X offset
 * @param {number} eyeOffsetY - Pupil Y offset
 * @param {string} [customBodyColor] - Custom body color in hex format
 * @param {string} [customOutlineColor] - Custom outline color in hex format
 * @param {boolean} [addMouth=false] - Add horizontal mouth line (only for idle animation)
 * @param {boolean} [addArms=false] - Add simple vertical arms
 * @param {boolean} [outlineOnly=false] - Draw only outline (no body fill)
 * @param {boolean} [addWatch=false] - Draw small watch on right wrist (requires addArms)
 * @returns {string} Base64 encoded sprite data
 */
function createFrame(type = HEROES.HERO, animation = 'idle', frame = 0, eyeOffsetX = 0, eyeOffsetY = 0, customBodyColor = null, customOutlineColor = null, addMouth = false, addArms = false, outlineOnly = false, addWatch = false, eyesClosed = false, eyeWhiteColor = null) {
  //
  // Choose body color - custom or default
  //
  let bodyColor

  if (customBodyColor) {
    bodyColor = customBodyColor
  } else {
    const colors = type === HEROES.HERO ? CFG.visual.colors.hero : CFG.visual.colors.antiHero
    bodyColor = colors.body
  }
  //
  // Ensure bodyColor is a valid string
  //
  if (!bodyColor || typeof bodyColor !== 'string') {
    const colors = type === HEROES.HERO ? CFG.visual.colors.hero : CFG.visual.colors.antiHero
    bodyColor = colors.body || '#FF8C00'
  }
  //
  // Choose outline color - custom or default (black)
  //
  const outlineColorRaw = customOutlineColor || CFG.visual.colors.outline
  const outlineColor = String(outlineColorRaw || '#000000').replace('#', '')
  //
  // Base parameters for different animations
  //
  let headY = IDLE_HEAD_Y
  let bodyY = IDLE_BODY_Y
  let headX = 33
  let bodyX = 33
  let bodyHeight = IDLE_BODY_HEIGHT
  let headHeight = IDLE_HEAD_HEIGHT
  let leftArmY = 40
  let rightArmY = 40
  let leftLegY = IDLE_LEG_Y
  let rightLegY = IDLE_LEG_Y
  let leftArmX = 25
  let rightArmX = 65
  let leftLegX = 33
  let rightLegX = 54
  let legHeight = IDLE_LEG_HEIGHT
  let leftLegHeight = legHeight
  let rightLegHeight = legHeight
  //
  // Run animation: 8-frame stride cycle (reference sheet). The two legs run
  // the SAME loop half a cycle apart — plant at the front, sweep back along
  // the ground, lift and swing forward. The body dips slightly on the
  // contact poses. Step sound plays on the contact frames (0 and 4).
  //
  if (animation === 'run') {
    const phase = frame / RUN_FRAME_COUNT
    const left = runLegPose(phase)
    const right = runLegPose(phase + 0.5)
    leftLegX = left.x
    leftLegY = left.y
    leftLegHeight = left.height
    rightLegX = right.x
    rightLegY = right.y
    rightLegHeight = right.height
    //
    // Contact bob: the body sits lowest when a foot plants (phase 0 / 0.5)
    // and rises through the passing poses.
    //
    const bob = Math.round((1 - Math.abs(Math.sin(phase * Math.PI * 2))) * RUN_BODY_BOB)
    headY += bob
    bodyY += bob
    leftArmY += bob
    rightArmY += bob
  }
  //
  // Jump animation — crouch / air arc / land. Air frames compress the
  // torso smoothly toward the peak and expand back to idle length on
  // the way down (symmetric). Outer hip lines stay flush with the legs.
  //
  if (animation === 'jump') {
    if (frame === 0 || frame === 6) {
      //
      // Ground crouch (take-off anticipation / landing hold)
      //
      headY = 45
      headHeight = 15
      bodyY = 60
      bodyHeight = 12
      leftArmY = 63
      rightArmY = 63
      rightLegY = 72
      rightLegX = 54
      leftLegY = 72
      leftLegX = 33
      legHeight = 12
    } else {
      //
      // Air frames 1..5 map onto JUMP_AIR_* tables (index 0..4).
      // Body shortens toward the peak (frame 3) and lengthens again.
      //
      const air = frame - 1
      headHeight = JUMP_AIR_HEAD_H[air]
      bodyHeight = JUMP_AIR_BODY_H[air]
      headY = JUMP_AIR_TOP_Y[air]
      bodyY = headY + headHeight
      leftArmY = bodyY + 2
      rightArmY = bodyY + 2
      //
      // Legs stay flush with the body sides (no hip dimples) and tuck
      // shorter near the peak, extending again on descent
      //
      const peakTuck = air === 2 ? 10 : air === 1 || air === 3 ? 14 : IDLE_LEG_HEIGHT
      legHeight = peakTuck
      leftLegX = 33
      rightLegX = 54
      leftLegY = bodyY + bodyHeight - 2
      rightLegY = leftLegY
    }
    leftArmX = 25
    rightArmX = 65
    leftLegHeight = legHeight
    rightLegHeight = legHeight
  }
  //
  // Tuck legs into the torso so the crotch never shows a gap
  //
  leftLegY -= LEG_INTO_BODY
  rightLegY -= LEG_INTO_BODY
  leftLegHeight += LEG_INTO_BODY
  rightLegHeight += LEG_INTO_BODY
  //
  // Create sprite using toCanvas
  //
  try {
    return toCanvas({ width: SPRITE_SIZE, height: SPRITE_SIZE, pixelRatio: RENDER_SCALE }, (ctx) => {
      ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE)
      const OL = getHex(outlineColor)
      const BL = getHex(bodyColor)
      //
      // Arms are drawn only in idle mode (hidden during run and jump).
      // Fully rounded (pill) shape — shoulder top mirrors the arm bottom curvature.
      //
      const showArms = addArms && animation !== 'run' && animation !== 'jump'
      //
      // Flat crotch on every pose: body side lines run straight into the outer
      // leg edges (no rounded belly / hip dimples).
      //
      const bodyH = headHeight + bodyHeight + 1
      //
      // Run lean: rotate only the torso around the hips. Legs stay planted
      // (unrotated) and clamped to the body sides so they never trail past
      // the spine — rotating legs with the body made the run look like a squat.
      //
      const leanRad = animation === 'run' ? RUN_LEAN_RAD : 0
      const leanPivotX = headX + CHAR_WIDTH / 2
      const leanPivotY = headY + headHeight + bodyHeight
      if (animation === 'run') {
        leftLegX = Math.max(headX, Math.min(leftLegX, headX + CHAR_WIDTH - LEG_FILL_WIDTH))
        rightLegX = Math.max(headX, Math.min(rightLegX, headX + CHAR_WIDTH - LEG_FILL_WIDTH))
      }
      //
      // Step 1: leg outlines — start at the body bottom so inner black edges
      // never climb into the torso (only a tiny tuck seals the crotch join)
      //
      const bodyBottom = headY + headHeight + bodyHeight
      const legOutlineTop = Math.max(leftLegY, bodyBottom - LEG_INTO_BODY)
      const legOutlineH = leftLegHeight - (legOutlineTop - leftLegY)
      ctx.fillStyle = OL
      const jumpLegBend = animation === 'jump' ? (JUMP_LEG_BEND[frame] ?? 0) : 0
      if (jumpLegBend !== 0) {
        //
        // Black outline on every bent jump frame (body already has OL rim;
        // legs need the same treatment in air). Fill is painted in step 4.
        //
        const hipTop = bodyBottom - JUMP_LEG_HIP_OVERLAP
        const leftH = Math.max(1, leftLegY + leftLegHeight - hipTop)
        const rightH = Math.max(1, rightLegY + rightLegHeight - hipTop)
        strokeBentLeg(ctx, leftLegX + LEG_FILL_WIDTH / 2, hipTop, leftH, jumpLegBend, LEG_OUTLINE_WIDTH)
        strokeBentLeg(ctx, rightLegX + LEG_FILL_WIDTH / 2, hipTop, rightH, jumpLegBend * JUMP_FRONT_LEG_BEND_RATIO, LEG_OUTLINE_WIDTH)
      } else {
        fillRoundedRectBottom(ctx, leftLegX - 1, legOutlineTop - 1, 11, Math.max(2, legOutlineH + 2), LEG_CORNER_RADIUS + 1)
        fillRoundedRectBottom(ctx, rightLegX - 1, legOutlineTop - 1, 11, Math.max(2, rightLegHeight - (legOutlineTop - rightLegY) + 2), LEG_CORNER_RADIUS + 1)
      }
      //
      // Step 2: torso + arms (optionally leaned) — painted after legs so the
      // solid body covers any leftover outline pixels at the hip join
      //
      if (leanRad) {
        ctx.save()
        ctx.translate(leanPivotX, leanPivotY)
        ctx.rotate(leanRad)
        ctx.translate(-leanPivotX, -leanPivotY)
      }
      ctx.fillStyle = OL
      if (showArms) {
        fillHalfPillLeft(ctx, headX - 1 - ARM_HALF_W, leftArmY - 1, ARM_HALF_W + 1, ARM_H + 2, ARM_CORNER_RADIUS + 1)
        fillHalfPillRight(ctx, headX + CHAR_WIDTH, rightArmY - 1, ARM_HALF_W + 1, ARM_H + 2, ARM_CORNER_RADIUS + 1)
      }
      fillRoundedRectTop(ctx, headX - 1, headY - 1, CHAR_WIDTH + 2, headHeight + bodyHeight + 2, HEAD_CORNER_RADIUS + 1)
      if (!outlineOnly) {
        ctx.fillStyle = BL
        if (showArms) {
          fillHalfPillLeft(ctx, headX - ARM_HALF_W, leftArmY, ARM_HALF_W, ARM_H, ARM_CORNER_RADIUS)
          fillHalfPillRight(ctx, headX + CHAR_WIDTH, rightArmY, ARM_HALF_W, ARM_H, ARM_CORNER_RADIUS)
        }
        fillRoundedRectTop(ctx, headX, headY, CHAR_WIDTH, bodyH, HEAD_CORNER_RADIUS)
      }
      //
      // Step 3: eyes + mouth on the torso
      //
      const eyeY = headY + EYE_OFFSET_Y
      ctx.fillStyle = OL
      if (animation === 'run' || animation === 'jump') {
        ctx.beginPath()
        ctx.arc(headX + EYE_OFFSET_X_RIGHT, eyeY, EYE_RING_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.arc(headX + EYE_OFFSET_X_LEFT, eyeY, EYE_RING_RADIUS, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(headX + EYE_OFFSET_X_RIGHT, eyeY, EYE_RING_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      }
      if (!outlineOnly) {
        ctx.fillStyle = eyesClosed ? BL : (eyeWhiteColor ? getHex(eyeWhiteColor) : getHex(CFG.visual.colors[type].eyeWhite))
        if (animation === 'run' || animation === 'jump') {
          ctx.beginPath()
          ctx.arc(headX + EYE_OFFSET_X_RIGHT, eyeY, EYE_WHITE_RADIUS, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.arc(headX + EYE_OFFSET_X_LEFT, eyeY, EYE_WHITE_RADIUS, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(headX + EYE_OFFSET_X_RIGHT, eyeY, EYE_WHITE_RADIUS, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      if (!eyesClosed) {
        ctx.fillStyle = OL
        if (animation === 'run' || animation === 'jump') {
          ctx.beginPath()
          ctx.arc(headX + EYE_OFFSET_X_RIGHT + PUPIL_SIDE_SHIFT, eyeY, PUPIL_RADIUS, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.arc(headX + EYE_OFFSET_X_LEFT + eyeOffsetX * EYE_PUPIL_SHIFT, eyeY + eyeOffsetY * EYE_PUPIL_SHIFT, PUPIL_RADIUS, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(headX + EYE_OFFSET_X_RIGHT + eyeOffsetX * EYE_PUPIL_SHIFT, eyeY + eyeOffsetY * EYE_PUPIL_SHIFT, PUPIL_RADIUS, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      if (addMouth && animation === 'idle') {
        ctx.strokeStyle = OL
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.arc(headX + 15, headY + 17, 7, 0.15 * Math.PI, 0.85 * Math.PI)
        ctx.stroke()
      }
      if (addWatch && animation === 'idle') {
        const watchY = rightArmY + ARM_H - 6
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(headX + CHAR_WIDTH + 1, watchY, 3, 3)
      }
      leanRad && ctx.restore()
      //
      // Step 4: leg fills (unrotated). Outer hip continuity: 1px outline only
      // on the outside — never draw outline on the inner crotch side of the body.
      //
      if (!outlineOnly) {
        ctx.fillStyle = BL
        if (jumpLegBend !== 0) {
          const hipTop = bodyBottom - JUMP_LEG_HIP_OVERLAP
          const leftH = Math.max(1, leftLegY + leftLegHeight - hipTop)
          const rightH = Math.max(1, rightLegY + rightLegHeight - hipTop)
          //
          // Body fill over the OL stroke from step 1 — leaves a 1 px black rim
          //
          strokeBentLeg(ctx, leftLegX + LEG_FILL_WIDTH / 2, hipTop, leftH, jumpLegBend, LEG_FILL_WIDTH)
          strokeBentLeg(ctx, rightLegX + LEG_FILL_WIDTH / 2, hipTop, rightH, jumpLegBend * JUMP_FRONT_LEG_BEND_RATIO, LEG_FILL_WIDTH)
          //
          // Cover the hip join with body fill so OL does not peek at the crotch
          //
          ctx.fillRect(headX, bodyBottom - LEG_INTO_BODY, CHAR_WIDTH, LEG_INTO_BODY + 3)
        } else {
          fillRoundedRectBottom(ctx, leftLegX, leftLegY, 9, leftLegHeight, LEG_CORNER_RADIUS)
          fillRoundedRectBottom(ctx, rightLegX, rightLegY, 9, rightLegHeight, LEG_CORNER_RADIUS)
          //
          // Outer side seals only (1px black + body fill) — no inner black into torso
          //
          const sealTop = bodyBottom - LEG_INTO_BODY
          const sealH = LEG_INTO_BODY + 2
          ctx.fillStyle = OL
          ctx.fillRect(headX - 1, sealTop, 1, sealH)
          ctx.fillRect(headX + CHAR_WIDTH, sealTop, 1, sealH)
          ctx.fillStyle = BL
          ctx.fillRect(headX, sealTop, LEG_FILL_WIDTH, sealH)
          ctx.fillRect(headX + CHAR_WIDTH - LEG_FILL_WIDTH, sealTop, LEG_FILL_WIDTH, sealH)
          //
          // Run: black crotch seam between the legs (body fill covers the
          // torso bottom outline; without this the gap reads as missing ink).
          //
          if (animation === 'run') {
            const innerL = Math.min(leftLegX + LEG_FILL_WIDTH, rightLegX + LEG_FILL_WIDTH)
            const innerR = Math.max(leftLegX, rightLegX)
            if (innerR > innerL) {
              ctx.fillStyle = OL
              ctx.fillRect(innerL, bodyBottom, innerR - innerL, 1)
            }
          }
        }
      }
    })
  } catch (error) {
    //
    // Fallback: return a minimal valid data URL (1x1 transparent pixel)
    //
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  }
}
//
// Adds arms to hero sprites immediately (touch level 3 annihilation)
//
function applyHeroArms(inst) {
  inst.addArms = true
  refreshHeroSpriteForArms(inst)
}
//
// Rebuilds the visible sprite after addArms toggles.
//
function refreshHeroSpriteForArms(inst) {
  const bodyColorClean = String(inst.bodyColor || CFG.visual.colors.hero.body).replace('#', '')
  const outlineColorClean = String(CFG.visual.colors.outline).replace('#', '')
  const hasMouth = inst.addMouth
  const hasWatch = inst.addWatch
  inst.spritePrefix = `${inst.type}_${bodyColorClean}_${outlineColorClean}${hasMouth ? '_mouth' : ''}${inst.addArms ? '_arms' : ''}${hasWatch ? '_watch' : ''}`
  loadHeroSprites(inst)
  inst.character?.use?.(inst.k.sprite(getSpriteName(inst, inst.eyeOffsetX ?? 0, inst.eyeOffsetY ?? 0)))
}
/**
 * Get sprite name for character (supports custom colors)
 * @param {Object} inst - Hero instance
 * @param {number} eyeX - Eye X offset (-1, 0, 1)
 * @param {number} eyeY - Eye Y offset (-1, 0, 1)
 * @returns {string} Sprite name
 */
function getSpriteName(inst, eyeX = 0, eyeY = 0) {
  //
  // Always round eye coordinates to ensure sprite names are clean integers
  //
  const roundedX = Math.round(eyeX)
  const roundedY = Math.round(eyeY)
  //
  // Use custom sprite prefix if bodyColor is set
  //
  const prefix = inst.spritePrefix || inst.type
  return `${prefix}_${roundedX}_${roundedY}`
}

/**
 * Apply slow motion effect
 * @param {Object} inst - Hero instance
 */
function applySlowMotion(inst) {
  const { k } = inst
  const originalTimeScale = k.timeScale ?? 1
  const slowMotionScale = 0.1
  const slowMotionDuration = 0.5
  k.timeScale = slowMotionScale
  k.wait(slowMotionDuration, () => {
    k.timeScale = originalTimeScale
  })
}

/**
 * Get particle colors for hero type
 * @param {Object} inst - Hero instance
 * @returns {Array<string>} Array of color hex strings
 */
function getParticleColors(inst) {
  //
  // Death shards stay filled with body hues plus thin outline only — never solid outline blobs.
  //
  const isTimeSection = inst.currentLevel && inst.currentLevel.startsWith('lesson-time.')
  if (isTimeSection) {
    const { type } = inst
    return type === HEROES.HERO
      ? deathParticlePaletteFromHex('#8B5A50')
      : deathParticlePaletteFromHex('#FF8C00')
  }
  const colors = CFG.visual.colors
  return inst.type === HEROES.HERO
    ? deathParticlePaletteFromHex(inst.bodyColor || colors.hero.body)
    : deathParticlePaletteFromHex(colors.antiHero.body)
}

/**
 * Builds four body-tone hex shades from one hero colour (no outline-only shards).
 *
 * @param {string} hex - Hero fill hex
 * @returns {string[]} Four palette strings for particle bodies
 */
function deathParticlePaletteFromHex(hex) {
  const [r, g, b] = parseHex(hex)
  const clamp = (v) => Math.max(18, Math.min(248, Math.round(v)))
  const toHex = (rr, gg, bb) => `#${clamp(rr).toString(16).padStart(2, '0')}${clamp(gg).toString(16).padStart(2, '0')}${clamp(bb).toString(16).padStart(2, '0')}`
  return [
    toHex(r, g, b),
    toHex(r * 0.88, g * 0.88, b * 0.88),
    toHex(r * 0.72, g * 0.72, b * 0.72),
    toHex(Math.min(255, r * 1.08), Math.min(255, g * 1.06), Math.min(255, b * 1.04))
  ]
}

/**
 * Create sparkle particles around hero's mouth
 * @param {Object} inst - Hero instance
 */
function createMouthSparkles(inst) {
  const { k, character } = inst
  const centerX = character.pos.x
  const centerY = character.pos.y
  //
  // Create small sparkle particles
  //
  const sparkleCount = 12
  const sparkles = []
  
  for (let i = 0; i < sparkleCount; i++) {
    //
    // Position sparkles in a small area around the mouth (lower part of face)
    //
    const angle = (Math.PI * 2 * i) / sparkleCount
    const distance = 15 + Math.random() * 10
    const offsetX = Math.cos(angle) * distance
    const offsetY = 5 + Math.sin(angle) * distance * 0.5  // Biased downward (mouth area)
    //
    // Sparkle colors (bright yellow/white)
    //
    const colors = [
      k.rgb(255, 255, 200),  // Pale yellow
      k.rgb(255, 255, 255),  // White
      k.rgb(255, 240, 150),  // Light gold
      k.rgb(200, 255, 255)   // Light cyan
    ]
    const sparkleColor = colors[Math.floor(Math.random() * colors.length)]
    //
    // Create sparkle particle (small circle)
    //
    const size = 2 + Math.random() * 3
    const sparkle = k.add([
      k.circle(size),
      k.pos(centerX + offsetX, centerY + offsetY),
      k.color(sparkleColor),
      k.opacity(0.8),
      k.z(CFG.visual.zIndex.player + 1)
    ])
    //
    // Store sparkle data
    //
    sparkle.vx = (Math.random() - 0.5) * 40
    sparkle.vy = -20 - Math.random() * 30  // Move up
    sparkle.lifetime = 0
    sparkle.maxLifetime = 0.8 + Math.random() * 0.4
    sparkle.originalSize = size
    
    sparkles.push(sparkle)
  }
  //
  // Animate sparkles
  //
  const sparkleInterval = k.onUpdate(() => {
    sparkles.forEach((sparkle, index) => {
      if (!sparkle.exists()) return
      
      sparkle.lifetime += k.dt()
      //
      // Move sparkle
      //
      sparkle.pos.x += sparkle.vx * k.dt()
      sparkle.pos.y += sparkle.vy * k.dt()
      //
      // Apply upward drift and slow down
      //
      sparkle.vy -= 80 * k.dt()  // Upward acceleration
      sparkle.vx *= 0.95
      //
      // Fade out and shrink based on lifetime
      //
      const progress = sparkle.lifetime / sparkle.maxLifetime
      sparkle.opacity = 0.8 * (1 - progress)
      //
      // Twinkle effect (size pulsing)
      //
      const twinkle = Math.sin(sparkle.lifetime * 20) * 0.3 + 0.7
      //
      // Destroy when lifetime expires
      //
      if (sparkle.lifetime >= sparkle.maxLifetime) {
        k.destroy(sparkle)
      }
    })
    //
    // Clean up when all sparkles are done
    //
    if (sparkles.every(s => !s.exists())) {
      sparkleInterval.cancel()
    }
  })
}

/**
 * Create sparkle particles around hero for color change effect
 * @param {Object} inst - Hero instance
 * @param {string} color - New color (hex string)
 */
/**
 * Create color change sparkle particles around hero
 * Similar to particles when small hero completes a level
 * @param {Object} inst - Hero instance
 * @param {string} color - New body color (hex)
 */
function createColorChangeSparkles(inst, color) {
  const { k, character } = inst
  const centerX = character.pos.x
  const centerY = character.pos.y
  //
  // Parse hex color to RGB
  //
  const colorValue = parseInt(color.replace('#', ''), 16)
  const r = (colorValue >> 16) & 0xFF
  const g = (colorValue >> 8) & 0xFF
  const b = colorValue & 0xFF
  //
  // Create circle particles flying outward (similar to heart particles for small hero)
  //
  const particleCount = 12
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount
    const speed = 80 + Math.random() * 40
    const lifetime = 0.6 + Math.random() * 0.4
    const circleSize = 8 + Math.random() * 6
    //
    // Create black outline circles (8 directions)
    //
    const outlineOffset = 1.5
    const outlineOffsets = [
      [-outlineOffset, -outlineOffset],
      [0, -outlineOffset],
      [outlineOffset, -outlineOffset],
      [-outlineOffset, 0],
      [outlineOffset, 0],
      [-outlineOffset, outlineOffset],
      [0, outlineOffset],
      [outlineOffset, outlineOffset]
    ]
    
    outlineOffsets.forEach(([dx, dy]) => {
      const outlineParticle = k.add([
        k.circle(circleSize),
        k.pos(centerX + dx, centerY + dy),
        k.color(0, 0, 0),
        k.opacity(1),
        k.z(50)
      ])
      //
      // Animate outline particle
      //
      const startTime = k.time()
      outlineParticle.onUpdate(() => {
        const elapsed = k.time() - startTime
        if (elapsed > lifetime) {
          k.destroy(outlineParticle)
          return
        }
        outlineParticle.pos.x += Math.cos(angle) * speed * k.dt()
        outlineParticle.pos.y += Math.sin(angle) * speed * k.dt()
        outlineParticle.opacity = 1 - (elapsed / lifetime)
      })
    })
    //
    // Create main colored circle
    //
    const particle = k.add([
      k.circle(circleSize),
      k.pos(centerX, centerY),
      k.color(r, g, b),
      k.opacity(1),
      k.z(51)
    ])
    //
    // Animate particle outward with fade
    //
    const startTime = k.time()
    particle.onUpdate(() => {
      const elapsed = k.time() - startTime
      if (elapsed > lifetime) {
        k.destroy(particle)
        return
      }
      particle.pos.x += Math.cos(angle) * speed * k.dt()
      particle.pos.y += Math.sin(angle) * speed * k.dt()
      particle.opacity = 1 - (elapsed / lifetime)
    })
  }
}

/**
 * Create body particles for death explosion
 * @param {Object} inst - Hero instance
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @returns {Array} Array of particle objects
 */
function createBodyParticles(inst, centerX, centerY) {
  const { k } = inst
  const particleColors = getParticleColors(inst)
  const particleCount = 16
  const particles = []
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + k.rand(-0.4, 0.4)
    const speed = k.rand(150, 350)
    const pSize = k.rand(4, 8)
    const oSize = pSize + 2
    const colorHex = k.choose(particleColors)
    const [r, g, b] = parseHex(colorHex)
    const rotation = k.rand(0, 360)
    //
    // Create invisible body for physics
    //
    const particleZ = inst.deathParticleZ ?? 20
    const body = k.add([
      k.rect(pSize, pSize),
      k.pos(centerX, centerY),
      k.anchor("center"),
      k.rotate(rotation),
      k.z(CFG.visual.zIndex.playerShadow),
      k.area(),
      k.body(),
      k.opacity(0)
    ])
    //
    // Create visual particle that follows the body
    //
    const particle = k.add([
      k.pos(centerX, centerY),
      k.anchor("center"),
      k.rotate(rotation),
      k.z(particleZ),
      k.opacity(1),
      {
        draw() {
          //
          // Draw black outline first
          //
          k.drawRect({
            width: oSize,
            height: oSize,
            pos: k.vec2(0, 0),
            anchor: "center",
            color: getRGB(k, CFG.visual.colors.outline)
          })
          //
          // Draw colored particle on top
          //
          k.drawRect({
            width: pSize,
            height: pSize,
            pos: k.vec2(0, 0),
            anchor: "center",
            color: k.rgb(r, g, b)
          })
        }
      }
    ])
    //
    // Set initial velocity
    //
    body.vel.x = Math.cos(angle) * speed
    body.vel.y = Math.sin(angle) * speed
    particle.lifetime = 0
    particle.rotSpeed = k.rand(-540, 540)
    particle.maxLifetime = 2.0
    particle.body = body
    //
    // Update particle
    //
    particle.onUpdate(() => {
      particle.lifetime += k.dt()
      particle.pos = particle.body.pos
      particle.angle = particle.body.angle
      particle.body.vel.x *= 0.98
      particle.body.angle += particle.rotSpeed * k.dt()
      //
      // Fade out over lifetime
      //
      const fadeStartTime = 1.0
      if (particle.lifetime > fadeStartTime) {
        const fadeProgress = (particle.lifetime - fadeStartTime) / (particle.maxLifetime - fadeStartTime)
        particle.opacity = Math.max(0, 1 - fadeProgress)
      }
      //
      // Destroy when max lifetime reached or falls off screen
      //
      if (particle.lifetime > particle.maxLifetime || particle.pos.y > k.height() + 100) {
        k.destroy(particle.body)
        k.destroy(particle)
      }
    })
    particles.push(particle)
  }
  return particles
}

/**
 * Create eye particles for death explosion
 * @param {Object} inst - Hero instance
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @returns {Array} Array of eye particle objects
 */
function createEyeParticles(inst, centerX, centerY) {
  const { k } = inst
  const eyeWhiteSize = 3 * RENDER_SCALE
  const pupilSize = 1 * RENDER_SCALE
  const eyeAngles = [k.rand(0, Math.PI * 2), k.rand(0, Math.PI * 2)]
  const particles = []
  //
  // Check if we're in time section for grayscale eyes
  //
  const isTimeSection = inst.currentLevel && inst.currentLevel.startsWith('lesson-time.')
  const eyeWhiteColor = isTimeSection ? [200, 200, 200] : [255, 255, 255]  // Light gray or white
  const pupilColor = isTimeSection ? [100, 100, 100] : [0, 0, 0]  // Dark gray or black
  
  for (let i = 0; i < 2; i++) {
    const angle = eyeAngles[i]
    const speed = k.rand(150, 350)
    //
    // Eye background (white or light gray)
    //
    const eyeZ = inst.deathParticleZ ?? 20
    const eyeWhite = k.add([
      k.rect(eyeWhiteSize, eyeWhiteSize),
      k.pos(centerX, centerY),
      k.color(eyeWhiteColor[0], eyeWhiteColor[1], eyeWhiteColor[2]),
      k.anchor("center"),
      k.z(eyeZ),
      k.area(),
      k.body()
    ])
    //
    // Pupil (black or dark gray)
    //
    const pupil = eyeWhite.add([
      k.rect(pupilSize, pupilSize),
      k.pos(0, 0),
      k.color(pupilColor[0], pupilColor[1], pupilColor[2]),
      k.anchor("center"),
      k.z(CFG.visual.zIndex.eyePupil)
    ])
    //
    // Set initial velocity
    //
    eyeWhite.vel.x = Math.cos(angle) * speed
    eyeWhite.vel.y = Math.sin(angle) * speed
    eyeWhite.lifetime = 0
    eyeWhite.maxLifetime = 2.0
    //
    // Update eye
    //
    eyeWhite.onUpdate(() => {
      eyeWhite.lifetime += k.dt()
      eyeWhite.vel.x *= 0.98
      pupil.opacity = eyeWhite.opacity
      //
      // Fade out over lifetime
      //
      const fadeStartTime = 1.0
      if (eyeWhite.lifetime > fadeStartTime) {
        const fadeProgress = (eyeWhite.lifetime - fadeStartTime) / (eyeWhite.maxLifetime - fadeStartTime)
        eyeWhite.opacity = Math.max(0, 1 - fadeProgress)
      }
      //
      // Destroy when max lifetime reached or falls off screen
      //
      if (eyeWhite.lifetime > eyeWhite.maxLifetime || eyeWhite.pos.y > k.height() + 100) {
        k.destroy(eyeWhite)
      }
    })
    particles.push(eyeWhite)
  }
  return particles
}
//
// Helper function to calculate particle dimensions based on shape type
//
function getParticleDimensions(k, shapeType, particleSize, scale) {
  const outlineSize = particleSize + 1
  let pWidth, pHeight, oWidth, oHeight

  if (shapeType === 'square') {
    pWidth = pHeight = particleSize * scale
    oWidth = oHeight = outlineSize * scale
  } else if (shapeType === 'rect_h') {
    pWidth = particleSize * scale * k.rand(1.3, 1.8)
    pHeight = particleSize * scale * k.rand(0.6, 0.8)
    oWidth = pWidth + 1 * scale
    oHeight = pHeight + 1 * scale
  } else if (shapeType === 'rect_v') {
    pWidth = particleSize * scale * k.rand(0.6, 0.8)
    pHeight = particleSize * scale * k.rand(1.3, 1.8)
    oWidth = pWidth + 1 * scale
    oHeight = pHeight + 1 * scale
  } else if (shapeType === 'circle') {
    //
    // For circles pWidth/pHeight store the diameter; radius = pWidth / 2
    //
    const diameter = particleSize * scale * k.rand(0.7, 1.1)
    pWidth = pHeight = diameter
    oWidth = oHeight = diameter + 2 * scale
  } else {
    pWidth = pHeight = particleSize * scale * k.rand(0.7, 0.9)
    oWidth = oHeight = pWidth + 1 * scale
  }

  return { pWidth, pHeight, oWidth, oHeight }
}
//
// Helper function to create a particle with outline
//
function createParticleWithOutline(k, x, y, colorHex, shapeType, rotation, particleSize, scale) {
  const [r, g, b] = parseHex(colorHex)
  const { pWidth, pHeight, oWidth, oHeight } = getParticleDimensions(k, shapeType, particleSize, scale)
  const isCircle = shapeType === 'circle'

  return k.add([
    k.pos(x, y),
    k.anchor("center"),
    k.rotate(rotation),
    k.z(CFG.visual.zIndex.assemblyParticles),
    {
      draw() {
        if (isCircle) {
          //
          // Draw outline circle behind, colored circle on top
          //
          k.drawCircle({
            radius: oWidth / 2,
            pos: k.vec2(0, 0),
            color: getRGB(k, CFG.visual.colors.outline)
          })
          k.drawCircle({
            radius: pWidth / 2,
            pos: k.vec2(0, 0),
            color: k.rgb(r, g, b)
          })
        } else {
          //
          // Draw outline rect behind, colored rect on top
          //
          k.drawRect({
            width: oWidth,
            height: oHeight,
            pos: k.vec2(0, 0),
            anchor: "center",
            color: getRGB(k, CFG.visual.colors.outline)
          })
          k.drawRect({
            width: pWidth,
            height: pHeight,
            pos: k.vec2(0, 0),
            anchor: "center",
            color: k.rgb(r, g, b)
          })
        }
      }
    }
  ])
}
//
// Draws a filled rectangle with only the two bottom corners rounded.
// One leg pose on the 8-frame run cycle: x sweeps between the front and
// back stops on a cosine, and while the leg swings forward (negative half
// of the sine) it lifts — the pill shortens and the foot rises off the
// ground line. On the stance half the foot stays planted on RUN_FOOT_Y.
//
function runLegPose(phase) {
  const angle = Math.PI * 2 * phase
  const lift = Math.max(0, -Math.sin(angle))
  const height = RUN_LEG_HEIGHT - Math.round(lift * RUN_LEG_LIFT_SHORTEN)
  const footY = RUN_FOOT_Y - Math.round(lift * RUN_LEG_LIFT_RAISE)
  return {
    x: Math.round(RUN_LEG_CENTER_X + Math.cos(angle) * RUN_LEG_SPREAD),
    y: footY - height,
    height
  }
}
//
// Flat top connects seamlessly to the flat bottom of body outline/fill,
// eliminating the body-to-leg gap visible in all animation frames.
// Caller sets ctx.fillStyle before calling.
//
//
// Draws one bent jump leg as a thick round-capped stroke along a quadratic
// curve: the hip stays put while the foot swings sideways by `bend` px, so
// the leg reads as a smooth rounded knee instead of a broken pill.
// Uses the current ctx.fillStyle as the stroke colour.
// @param {CanvasRenderingContext2D} ctx - Canvas context
// @param {number} cx - Leg center X at the hip
// @param {number} topY - Leg top Y (flush with the body bottom)
// @param {number} h - Total leg length
// @param {number} bend - Knee forward offset (positive = toward facing direction)
// @param {number} width - Stroke thickness (fill or outline width)
//
function strokeBentLeg(ctx, cx, topY, h, bend, width) {
  const half = width / 2
  //
  // Butt cap at the hip (body covers this end); round disc only at the foot
  // so the hip join never sprouts a round-cap burr outside the torso.
  //
  const startY = topY
  const endY = Math.max(startY + 1, topY + h - half)
  const kneeX = cx + bend
  const footX = cx + bend * 0.12
  const kneeY = topY + h * 0.42
  ctx.strokeStyle = ctx.fillStyle
  ctx.lineWidth = width
  ctx.lineCap = 'butt'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(cx, startY)
  ctx.quadraticCurveTo(kneeX, kneeY, footX, endY)
  ctx.stroke()
  //
  // Rounded foot tip (same fill colour as the stroke)
  //
  ctx.beginPath()
  ctx.arc(footX, endY, half, 0, Math.PI * 2)
  ctx.fill()
}
function fillRoundedRectBottom(ctx, x, y, w, h, r) {
  const cr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + w, y)
  ctx.lineTo(x + w, y + h - cr)
  ctx.arcTo(x + w, y + h, x, y + h, cr)
  ctx.lineTo(x + cr, y + h)
  ctx.arcTo(x, y + h, x, y, cr)
  ctx.lineTo(x, y)
  ctx.closePath()
  ctx.fill()
}
//
// Draws a filled rectangle with only the two top corners rounded.
// Bottom corners are flat so the shape connects to legs without narrowing.
// Caller sets ctx.fillStyle before calling.
//
function fillRoundedRectTop(ctx, x, y, w, h, r) {
  const cr = Math.min(r, w / 2, h)
  ctx.beginPath()
  ctx.moveTo(x + cr, y)
  ctx.arcTo(x + w, y, x + w, y + h, cr)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x, y + h)
  ctx.arcTo(x, y, x + w, y, cr)
  ctx.closePath()
  ctx.fill()
}
//
// Draws the left half of a vertical pill: flat right side, rounded left/top/bottom.
// Used for the left arm — flat side is placed flush against the body left outline so
// the arm merges into the torso without any visible gap or separator.
// Caller sets ctx.fillStyle before calling.
//
function fillHalfPillLeft(ctx, x, y, w, h, r) {
  const cr = Math.min(r, w, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + w, y)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x + cr, y + h)
  ctx.arcTo(x, y + h, x, y, cr)
  ctx.lineTo(x, y + cr)
  ctx.arcTo(x, y, x + w, y, cr)
  ctx.closePath()
  ctx.fill()
}
//
// Draws the right half of a vertical pill: flat left side, rounded right/top/bottom.
// Used for the right arm — flat side is placed flush against the body right outline so
// the arm merges into the torso without any visible gap or separator.
// Caller sets ctx.fillStyle before calling.
//
function fillHalfPillRight(ctx, x, y, w, h, r) {
  const cr = Math.min(r, w, h / 2)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + w - cr, y)
  ctx.arcTo(x + w, y, x + w, y + h, cr)
  ctx.lineTo(x + w, y + h - cr)
  ctx.arcTo(x + w, y + h, x, y + h, cr)
  ctx.lineTo(x, y + h)
  ctx.closePath()
  ctx.fill()
}
//
// Aborts a blocked pre-jump squash so the hero returns to idle instead of
// staying stuck in the squat frame under a low platform ceiling.
//
function cancelJumpSquash(inst) {
  inst.isSquashing = false
  inst.squashTimer = 0
  inst.jumpFrame = 0
  inst.jumpPhase = 'none'
  inst.jumpCeilingBonk = false
}
//
// Head hits a branch/platform mid-jump: kill upward velocity, restore full
// standing hitbox, and keep falling (no tucked peak pose stuck under wood).
//
function resolveJumpCeilingBonk(inst) {
  const ch = inst.character
  if (!ch?.exists?.()) return
  if (inst.jumpCeilingBonk) {
    //
    // Kill only upward motion — let gravity pull the hero down after the hit
    //
    if (ch.vel && ch.vel.y < 0) ch.vel.y = 80
    return
  }
  if (inst.jumpPhase !== 'jumping' && !inst.wasJumping) return
  const velY = ch.vel?.y ?? 0
  //
  // Only while rising into a real underside contact (not "near" overhead wood)
  //
  if (velY >= 0) return
  if (!isHeadAgainstCeiling(inst, true)) return
  inst.jumpCeilingBonk = true
  inst.jumpPhase = 'jumping'
  inst.wasJumping = true
  //
  // Stop the rise and start a soft fall from the contact point
  //
  if (ch.vel) ch.vel.y = 80
  //
  // Force syncJumpCollision to rebuild the full standing box
  //
  inst.jumpCollisionTuck = -1
  inst.jumpCollisionLift = -1
  syncJumpCollision(inst)
  const prefix = inst.spritePrefix || inst.type
  inst.jumpFrame = 5
  try {
    ch.use(inst.k.sprite(`${prefix}-jump-5`))
  } catch (error) {
    //
    // Sprite may lag one frame after a gold recolour bake
    //
  }
}
//
// True when a platform underside sits against / just above the hero's head.
// Airborne mode requires actual underside contact — a distant log above the
// trampoline must not cancel the bounce at takeoff.
//
function isHeadAgainstCeiling(inst, airborneOk = false) {
  const ch = inst.character
  if (!ch?.exists?.()) return false
  if (!airborneOk) {
    if (typeof ch.isGrounded !== 'function' || !ch.isGrounded()) return false
  }
  const headTop = ch.pos.y + (inst.collisionBaseOffsetY ?? -16) - (inst.collisionBaseHeight ?? 74) / 2
  const heroFeetY = ch.pos.y + (inst.collisionBaseOffsetY ?? -16) + (inst.collisionBaseHeight ?? 74) / 2
  const heroHalfW = (inst.collisionBaseWidth ?? 40) / 2 + 6
  const heroLeft = ch.pos.x - heroHalfW
  const heroRight = ch.pos.x + heroHalfW
  const platforms = [...inst.k.get(CFG.game.platformName), ...inst.k.get('platform')]
  for (const obj of platforms) {
    if (!obj?.exists?.() || obj === ch || obj.hidden || obj.pos.y < -5000) continue
    if (obj.is?.(ANTIHERO_TAG)) continue
    //
    // Hidden/off-screen pads must not count as ceilings
    //
    if (obj.pos.y > 5000) continue
    const rect = getPlatformWorldRect(obj)
    if (!rect) continue
    const hOverlap = heroRight > rect.left && heroLeft < rect.right
    if (!hOverlap) continue
    const standingOn = heroFeetY >= rect.top - 6 && heroFeetY <= rect.bottom + 10
    if (standingOn) continue
    if (airborneOk) {
      //
      // Head must actually touch the underside (tight band), not merely be
      // under a platform somewhere above (trampoline under L log).
      //
      const touchingUnderside = rect.bottom >= headTop - 8 && rect.bottom <= headTop + 14
      if (touchingUnderside) return true
      continue
    }
    const overhead = rect.bottom > headTop + 2 && rect.top < headTop + JUMP_CEILING_CLEARANCE
    if (overhead) return true
  }
  return false
}
//
// True when a platform sits directly above the hero with too little room to jump.
//
function isJumpCeilingBlocked(inst) {
  //
  // Heroes without a body component (e.g. drowning hero after unuse('body'))
  // have no isGrounded — treat them as never ceiling-blocked instead of crashing.
  //
  return isHeadAgainstCeiling(inst, false)
}
//
// World-space AABB for a static platform body (supports topleft and center anchors).
//
function getPlatformWorldRect(obj) {
  const w = obj.width ?? obj.area?.shape?.width ?? 0
  const h = obj.height ?? obj.area?.shape?.height ?? 0
  if (!w || !h) return null
  const offX = obj.area?.offset?.x ?? 0
  const offY = obj.area?.offset?.y ?? 0
  const anchor = obj.anchor ?? 'topleft'
  let left
  let top
  if (anchor === 'topleft' || anchor === 'top' || anchor === 'botleft') {
    left = obj.pos.x + offX
    top = obj.pos.y + offY
  } else {
    left = obj.pos.x + offX - w / 2
    top = obj.pos.y + offY - h / 2
  }
  return { left, top, right: left + w, bottom: top + h }
}
