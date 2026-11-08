import { CFG } from '../cfg.js'
import { isAnyKeyDown } from '../utils/helper.js'
import * as TouchControls from '../utils/touch-controls.js'
import * as Sound from '../utils/sound.js'
import * as HeroPicture from '../utils/hero-picture.js'
import { applyForestGameplaySharpBake } from '../sections/forest/utils/forest-focus-depth.js'
import {
  bindDefaultHeroFootFx,
  updateHeroFootprints,
  drawHeroFootprints,
  playHeroRunStepFx,
  playHeroLandFx
} from '../utils/hero-foot-fx.js'
//
// Hero frames are cut from the picture sheet (hero-picture.js) into 96 px
// sprites drawn at scale 1, so one sprite pixel is one screen pixel.
//
const SPRITE_SIZE = HeroPicture.FRAME_SIZE
//
// Exported bake dimensions for debug / HUD consumers.
//
export const HERO_BAKE_SPRITE_SIZE = SPRITE_SIZE
//
// Every hero shares one baked frame set under this sprite-name prefix. All
// frames take the gameplay grain with one seed, so swapping frames (or the
// pupils moving) never shimmers the body.
//
export const HERO_SPRITE_PREFIX = 'hero'
const HERO_GRAIN_SEED = 7300
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
const RUN_FRAME_COUNT = HeroPicture.RUN_FRAME_COUNT
export const HERO_RUN_FRAME_COUNT = RUN_FRAME_COUNT
//
// Ignore airborne flicker shorter than this — prevents run↔squat loops when
// the hitbox briefly loses contact with a platform mid-stride
//
const MIN_AIR_TIME_FOR_JUMP = 0.06
//
// Jump — 7 frames like the sheet: crouch, stretch take-off, rising, peak
// with the legs tucked up, early descent, full-leg descent and the landing
// crouch (held briefly right after touching the ground).
//
const JUMP_FRAME_COUNT = HeroPicture.JUMP_FRAME_COUNT
export const HERO_JUMP_FRAME_COUNT = JUMP_FRAME_COUNT

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
const IDLE_MELODY = [
  [659.25, 1], [784.0, 1], [880.0, 1.5], [784.0, 0.5],
  [659.25, 1], [587.33, 1], [523.25, 2],
  [587.33, 1], [659.25, 1], [784.0, 1.5], [659.25, 0.5],
  [587.33, 1], [523.25, 1], [587.33, 2]
]
const IDLE_MELODY_BEAT = 0.42          // Seconds per beat
const IDLE_MELODY_GAP = 0.1            // Silence inserted between notes
const IDLE_MELODY_SUSTAIN = 0.9        // Fraction of the beat the tone rings
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
// Idle look directions: the pupils wander between straight ahead and
// LOOK_DIRECTIONS points round the eye (every 30°). A look offset shorter
// than LOOK_CENTRE_RADIUS reads as straight ahead, and so does a lookAtPos
// nearer than LOOK_AT_DEAD_ZONE px. A wink (one eye open, ready scene)
// looks left, ahead or right.
//
const LOOK_DIRECTIONS = 12
const LOOK_STEP_RAD = Math.PI * 2 / LOOK_DIRECTIONS
const LOOK_CENTRE_RADIUS = 0.5
const LOOK_AT_DEAD_ZONE = 20
const LOOK_AHEAD = { x: 0, y: 0 }
const LOOK_VECTORS = Array.from({ length: LOOK_DIRECTIONS }, (_, i) => ({ x: Math.cos(i * LOOK_STEP_RAD), y: Math.sin(i * LOOK_STEP_RAD) }))
const LOOK_TARGETS = [LOOK_AHEAD, ...LOOK_VECTORS]
const WINK_SIDES = [-1, 0, 1]

export const HEROES = {
  HERO: 'hero',
  ANTIHERO: 'antiHero'
}
//
// Live Kaplay instances whose hero frames are fully baked. Kaplay's asset
// lookup can outlive a torn-down engine (see engine-switch.js), so
// k.getSprite() alone must not skip loadHeroSprites on a fresh k.
//
const heroFramesBakedFor = new WeakSet()
/**
 * Creates hero or anti-hero with full logic setup
 * @param {Object} config - Hero configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {string} [config.type='hero'] - Character type ('hero' or 'antiHero')
 * @param {boolean} [config.controllable=true] - Whether controlled by keyboard
 * @param {Object} [config.sfx] - AudioContext for sound effects
 * @param {boolean} [config.footFx=true] - Built-in landing dust, footprints and step sounds
 * @param {string|null} [config.stepSoundScene=null] - Scene id for step/land SFX routing
 * @param {boolean} [config.airAnimDuringFlicker=false] - Keep jump anim through brief ungrounded flicker
 * @param {boolean} [config.runDuringFlicker=false] - Keep run cycle through brief ungrounded flicker
 * @param {string} [config.dustColor] - Dust particle color (hex string), defaults to gray
 * @param {boolean} [config.suppressDust=false] - Disable landing and run-start dust
 * @param {boolean} [config.suppressFootprints=false] - Leave no footprints while running
 * @param {boolean} [config.hitboxPadding=0] - Additional padding around collision box (for menu hover/click)
 * @param {boolean} [config.isStatic=false] - If true, no physics/gravity is applied
 * @param {boolean} [config.fixed=config.isStatic] - If true, position is screen-space (HUD indicators); a static
 *   decorative hero left at its default scrolls with the world instead
 * @param {Function} [config.idleNotePostBake] - Grain pass for baked mouth-note glyphs
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
    footFx = true,
    stepSoundScene = null,
    airAnimDuringFlicker = false,
    runDuringFlicker = false,
    dustColor = null,      // Dust particle color (hex string)
    suppressDust = false,  // Disable landing and run-start dust for this hero
    suppressFootprints = false, // Leave no footprints while running
    isStatic = false,      // If true, no physics (for indicators / decorative heroes)
    fixed = isStatic,      // If true, position is screen-space (HUD); defaults to isStatic
    hitboxPadding = 0,     // Additional padding around collision box (for menu hover/click)
    ambient = false,       // Decorative background character — no collision area
    ambientWalk = false,   // Decorative walker — run cycle instead of idle eye sprites
    ambientRunSpeed = null, // Seconds per run frame when ambientWalk is true
    idleNotePostBake = null // Optional grain pass for baked mouth-note glyphs
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
  const collisionOffsetX = COLLISION_OFFSET_X - hitboxPadding
  const collisionOffsetY = COLLISION_OFFSET_Y - hitboxPadding
  const collisionWidth = COLLISION_WIDTH + hitboxPadding * 2
  const collisionHeight = COLLISION_HEIGHT + hitboxPadding * 2
  loadHeroSprites(k)
  const character = k.add([
    k.sprite(`${HERO_SPRITE_PREFIX}_0_0`),
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
    //
    // fixed() pins the character to screen-space (HUD indicators); a static
    // world hero (e.g. a bonus fragment) skips both fixed() and body() so it
    // scrolls naturally with the camera without being affected by gravity.
    //
    ...(fixed ? [k.fixed()] : (isStatic ? [] : [k.body()])),
    k.anchor("center"),
    k.scale(scale),
    k.z(CFG.visual.zIndex.player),
  ])
  const inst = {
    character,
    k,
    type,
    controllable,
    isStatic,
    fixed,
    sfx,
    footFx,
    footEffectsEnabled: footFx !== false,
    stepSoundScene,
    airAnimDuringFlicker,
    runDuringFlicker,
    idleNotePostBake,                     // Forest film grain on baked mouth-note glyphs
    spritePrefix: HERO_SPRITE_PREFIX,
    dustColor,
    suppressDust,
    suppressFootprints,
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
    isDying: false,
    isSubmerging: false,  // Forest lake sink — scene drives Y; skip physics/anim pipeline
    isSpawned: false,   // Flag to prevent controls before spawn completes
    invulnerabilityTimer: 0,  // Timer for spawn invulnerability
    isInvulnerable: false,  // Flag for spawn invulnerability
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
    carrierGrounded: false,     // Set by a level carrier that pins the hero (counts as ground)
    //
    // Head-bonk: full-height collision for the rest of this jump
    //
    jumpCeilingBonk: false,
    //
    // After a letter dialog closes on Space, ignore jump until jump keys are released
    //
    jumpKeyReleaseGate: false,
    controlsDisabled: false,  // Flag to temporarily disable controls during zone transitions
    jumpDisabled: false,      // Flag to block only jumping while movement stays free (e.g. intro hints)
    footprints: [],          // Trail of footprints left by walking, fade out over FOOTPRINT_LIFETIME
    lastFootprintFoot: 1,    // Alternates between -1 (left foot) and +1 (right foot)
    //
    // Idle vocalization state: notes drift up from the mouth and a soft
    // humming/whistling sound plays while the hero stands still.
    //
    idleVocalization,
    idleNotePostBake,
    idleNotes: [],
    idleNoteEmitTimer: IDLE_NOTE_EMIT_MIN + Math.random() * (IDLE_NOTE_EMIT_MAX - IDLE_NOTE_EMIT_MIN),
    idleMelodyIndex: 0,
    idleStillTime: 0,
    whistlePulse: 0,
    whistleLeanSide: 1,
    ambientWalk,
    ambientRunSpeed: ambientRunSpeed ?? RUN_ANIM_SPEED * 2.4
  }
  idleNotePostBake && ensureIdleNoteGlyphSprites(k, idleNotePostBake)
  //
  // Collision handlers require k.area() — skipped for ambient decorative characters
  //
  character.onCollide?.(CFG.game.platformName, () => onCollisionPlatform(inst))
  character.onUpdate(() => onUpdate(inst))
  controllable && setupControls(inst)
  bindDefaultHeroFootFx(inst, config)
  //
  // Footprint renderer: a single fixed entity that draws and ages footprints
  // for this hero. Drawn behind the player so prints sit on the ground.
  //
  k.add([
    k.z(FOOTPRINT_Z),
    {
      update() {
        updateHeroFootprints(inst)
      },
      draw() {
        drawHeroFootprints(k, inst)
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
 * Waits for the hero picture sheet — await once before the first
 * loadHeroSprites() (engine boot).
 * @returns {Promise<void>}
 */
export function loadHeroPicture() {
  return HeroPicture.load()
}

/**
 * Bakes the hero's frames (idle looks, closed eyes, winks, run, jump) into
 * a live Kaplay instance once; every hero and anti-hero shares them.
 * Does nothing until loadHeroPicture() has resolved.
 * @param {Object} k - Kaplay instance
 */
export function loadHeroSprites(k) {
  if (heroFramesBakedFor.has(k)) return
  bakeHeroFrames(k)
  isHeroFrameSetPresentOnK(k) && heroFramesBakedFor.add(k)
}

/**
 * Idle sprite whose pupils look along (x, y): straight ahead when the
 * offset is short, else the nearest of the baked look directions.
 * @param {string} prefix - Hero sprite prefix (HERO_SPRITE_PREFIX)
 * @param {number} x - Look offset X (-1..1, + right)
 * @param {number} y - Look offset Y (-1..1, + down)
 * @returns {string} Sprite name
 */
export function heroLookSpriteName(prefix, x, y) {
  if (Math.hypot(x, y) < LOOK_CENTRE_RADIUS) return `${prefix}_0_0`
  const step = Math.round(Math.atan2(y, x) / LOOK_STEP_RAD)
  return `${prefix}_look_${(step + LOOK_DIRECTIONS) % LOOK_DIRECTIONS}`
}

/**
 * Wink sprite: left eye shut, right eye open looking left (-1), ahead (0)
 * or right (1); a fractional side picks the nearest.
 * @param {string} prefix - Hero sprite prefix (HERO_SPRITE_PREFIX)
 * @param {number} side - Pupil side, -1..1
 * @returns {string} Sprite name
 */
export function heroWinkSpriteName(prefix, side) {
  return `${prefix}_wink_${Math.round(Math.max(-1, Math.min(1, side)))}`
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
function setEyesClosed(inst, closed, opts = {}) {
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
  applyCalmIdleSprite(inst)
}

/**
 * Returns the kaplay sprite key currently shown on the hero character.
 * @param {Object} inst - Hero instance
 * @returns {string}
 */
export function getActiveSpriteKey(inst) {
  if (inst.currentEyeSprite) return inst.currentEyeSprite
  if (inst.jumpPhase && inst.jumpPhase !== 'none') return heroJumpSpriteName(inst.jumpFrame ?? 0)
  if (inst.isRunning) return heroRunSpriteName(inst.runFrame ?? 0)
  return heroLookSpriteName(HERO_SPRITE_PREFIX, inst.eyeOffsetX ?? 0, inst.eyeOffsetY ?? 0)
}

/**
 * Forces the closed-eyes idle sprite (used during forest lake drowning).
 * @param {Object} inst - Hero instance
 */
export function applyCalmIdleSprite(inst) {
  const ch = inst?.character
  if (!ch?.exists?.()) return
  inst.isRunning = false
  inst.wasJumping = false
  const closedName = `${HERO_SPRITE_PREFIX}_closed`
  //
  // Re-applying the sprite every frame (forest drowning) would remount Kaplay
  // components and fight the scene-driven sink tween.
  //
  if (inst.currentEyeSprite === closedName) return
  useHeroSprite(inst, closedName)
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
 * Reveals the hero at the spawn point with invulnerability and clean jump state.
 * @param {Object} inst - Hero instance
 * @param {Object} [_opts] - Reserved for API compatibility (assembly effect removed)
 */
export function spawn(inst, _opts = {}) {
  const { character } = inst
  character.hidden = false
  character.vel.x = 0
  character.vel.y = 0
  resetAirborneState(inst)
  inst.isSpawned = true
  inst.isInvulnerable = true
  inst.invulnerabilityTimer = 3.0
  inst.spawnLandGrace = 0.35
}

function heroRunSpriteName(frame) {
  return `${HERO_SPRITE_PREFIX}-run-${frame}`
}
function heroJumpSpriteName(frame) {
  return `${HERO_SPRITE_PREFIX}-jump-${frame}`
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
  // Lake drowning in forest — position/opacity are driven by the scene sink tween.
  //
  if (inst.isSubmerging) {
    const ch = inst.character
    //
    // moveTo (not direct pos.x/pos.y mutation) so Kaplay marks the transform
    // dirty and actually redraws the sprite at its new position — a direct
    // pos write silently skips the render-transform cache invalidation,
    // leaving the hero visually frozen while sinking.
    //
    if (ch?.pos && (inst.drownSinkX != null || inst.drownSinkY != null)) {
      const x = inst.drownSinkX != null ? Math.round(inst.drownSinkX) : ch.pos.x
      const y = inst.drownSinkY != null ? inst.drownSinkY : ch.pos.y
      ch.moveTo(x, y)
    }
    inst.drownHeroDrawZ != null && (ch.z = inst.drownHeroDrawZ)
    ch && (ch.hidden = true)
    //
    // Body is removed in forest drowning — only scene-driven Y applies.
    //
    ch?.vel && (ch.vel.x = 0, ch.vel.y = 0)
    return
  }
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
    snapPosToPixels(inst)
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
    // Effective movement this frame, read by idle vocalization and the
    // horizontal-fall twig
    //
    inst._effectivelyMoving = isMovingLeft || isMovingRight
    pollJumpInput(inst)
  }
  //
  // Determine movement state; requires spawn so keys don't trigger sounds before hero appears.
  //
  const isMoving = inst.isSpawned && !inst.controlsDisabled && (
    TouchControls.needsTouchControls()
      ? (TouchControls.isMoveLeftHeld() || TouchControls.isMoveRightHeld()
        || isAnyKeyDown(inst.k, CFG.controls.moveLeft) || isAnyKeyDown(inst.k, CFG.controls.moveRight))
      : (isAnyKeyDown(inst.k, CFG.controls.moveLeft) || isAnyKeyDown(inst.k, CFG.controls.moveRight))
  )
  //
  // Check if character is grounded (use isGrounded method or check if falling/jumping)
  //
  const isGrounded = isHeroGrounded(inst)
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
    const jumpHeld = isAnyKeyDown(inst.k, CFG.controls.jump)
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
  // letter dialogs on forest logs).
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
      if (inst.jumpFrame !== 0) {
        inst.jumpFrame = 0
        useHeroSprite(inst, heroJumpSpriteName(0))
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
    if (inst.jumpKeyReleaseGate || inst.controlsDisabled || inst.jumpDisabled || !inst.controllable) {
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
    //
    // Switch between frame 0 (squash) and frame 1 (stretch) while on ground
    //
    if (inst.squashTimer < JUMP_STRETCH_START) {
      //
      // First part: squash (frame 0)
      //
      if (inst.jumpFrame !== 0) {
        inst.jumpFrame = 0
        useHeroSprite(inst, heroJumpSpriteName(0))
      }
    } else {
      //
      // Second part: start stretching while still on ground (frame 1)
      //
      // This creates anticipation before the actual jump
      //
      if (inst.jumpFrame !== 1) {
        inst.jumpFrame = 1
        useHeroSprite(inst, heroJumpSpriteName(1))
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
          inst.character.flipX = inst.direction === -1
          return
        }
        //
        // Forest thin branch/log flicker while walking: keep the run cycle below
        // instead of freezing on a single run frame (used to return here even
        // when isMoving).
        //
        if (!inst.runDuringFlicker) {
          inst.character.flipX = inst.direction === -1
          return
        }
      }
    }
    const groundFlicker = (inst.spawnLandGrace > 0 && inst.jumpPhase !== 'jumping') ||
      (inst.airTime < MIN_AIR_TIME_FOR_JUMP &&
        Math.abs(inst.character.vel.y) < 80 &&
        inst.jumpPhase !== 'jumping')
    //
    // Forest keeps a real in-progress jump animating through brief ungrounded
    // flicker (thin branch/log collision) instead of snapping back to run/idle.
    // Gating this on raw vel.y thresholds instead of the jump-state flags used
    // to misfire from ordinary gravity noise (a single frame's downward pull
    // easily exceeds a low px/s threshold on any fps dip), forcing the hero
    // into jump frames — and killing the run animation — while just standing
    // or walking on the branch. wasJumping / jumpPhase alone only turn true
    // once a real jump has already been recognised, so they can't misfire.
    //
    const forestAirAnim = inst.airAnimDuringFlicker && (inst.wasJumping || inst.jumpPhase === 'jumping')
    if (inst.isSpawned && (!groundFlicker || forestAirAnim)) {
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
        useHeroSprite(inst, heroJumpSpriteName(targetFrame))
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
        useHeroSprite(inst, heroJumpSpriteName(6))
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
    if (!inst.isRunning && !inst.wasJumping) {
      inst.runFrame = 0
      inst.runTimer = 0
      inst.currentEyeSprite = null
      inst.character.use(inst.k.sprite(heroRunSpriteName(0)))
      //
      // Create dust particles when starting to run (skip in water)
      //
      !inst.suppressDust && inst.onSpawnRunStartDust?.(inst, inst.direction)
    } else if (inst.wasJumping) {
      //
      // Just landed - continue with current frame, just update sprite
      //
      inst.wasJumping = false
      inst.currentEyeSprite = null
      inst.character.use(inst.k.sprite(heroRunSpriteName(inst.runFrame)))
    }

    inst.isRunning = true
    inst.runTimer += inst.k.dt()
    if (inst.runTimer > RUN_ANIM_SPEED) {
      inst.runFrame = (inst.runFrame + 1) % RUN_FRAME_COUNT
      inst.currentEyeSprite = null
      inst.character.use(inst.k.sprite(heroRunSpriteName(inst.runFrame)))
      inst.runTimer = 0
      //
      // Step sound + footprint on the contact frames (a foot plants on the
      // ground twice per 8-frame cycle — frames 0 and 4)
      //
      inst.runFrame % (RUN_FRAME_COUNT / 2) === 0 && playHeroRunStepFx(inst, inst.runFrame)
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
  snapPosToPixels(inst)
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
  //
  // Sentinel keys force syncJumpCollision to rebuild the standing box — zero
  // keys matched its "unchanged" check and left a mid-jump tucked shape on.
  //
  inst.jumpCollisionTuck = -1
  inst.jumpCollisionLift = -1
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
  const grounded = isHeroGrounded(inst)
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
    sink > 0 && ch.moveBy(0, -sink)
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
    const closedName = `${HERO_SPRITE_PREFIX}_closed`
    //
    // Always re-apply: run frames swap the sprite without clearing
    // currentEyeSprite, so a stale closedName match left the hero frozen
    // on a sideways run frame after keys were released.
    //
    useHeroSprite(inst, closedName)
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
    useHeroSprite(inst, heroLookSpriteName(HERO_SPRITE_PREFIX, inst.eyeOffsetX, inst.eyeOffsetY))
  }
  //
  // Eye animation: look along the direction to lookAtPos if set (straight
  // ahead when it is close), otherwise wander between straight ahead and
  // the look directions round the eye
  //
  if (inst.lookAtPos) {
    const heroPos = inst.character?.pos
    if (heroPos) {
      const dx = inst.lookAtPos.x - heroPos.x
      const dy = inst.lookAtPos.y - heroPos.y
      const dist = Math.hypot(dx, dy)
      const far = dist > LOOK_AT_DEAD_ZONE
      inst.targetEyeX = far ? dx / dist : 0
      inst.targetEyeY = far ? dy / dist : 0
    }
  } else {
    inst.eyeTimer += inst.k.dt()
    if (inst.eyeTimer > inst.k.rand(EYE_ANIM_MIN_DELAY, EYE_ANIM_MAX_DELAY)) {
      const look = inst.k.choose(LOOK_TARGETS)
      inst.targetEyeX = look.x
      inst.targetEyeY = look.y
      inst.eyeTimer = 0
    }
  }
  //
  // Smoothly interpolate to target position
  //
  inst.eyeOffsetX = inst.k.lerp(inst.eyeOffsetX, inst.targetEyeX, EYE_LERP_SPEED)
  inst.eyeOffsetY = inst.k.lerp(inst.eyeOffsetY, inst.targetEyeY, EYE_LERP_SPEED)
  //
  // Switch to the baked look sprite nearest the smoothed offset
  //
  const spriteName = heroLookSpriteName(HERO_SPRITE_PREFIX, inst.eyeOffsetX, inst.eyeOffsetY)
  //
  // Update sprite only if eye position changed
  //
  if (inst.currentEyeSprite !== spriteName) {
    useHeroSprite(inst, spriteName)
  }
}

//
// Slow run cycle for distant background walkers — avoids idle/run sprite fighting
//
function updateAmbientWalkAnimation(inst) {
  inst.runTimer += inst.k.dt()
  if (inst.runTimer >= inst.ambientRunSpeed) {
    inst.runFrame = (inst.runFrame + 1) % RUN_FRAME_COUNT
    inst.runTimer = 0
  }
  const runSprite = heroRunSpriteName(inst.runFrame)
  if (inst.currentEyeSprite !== runSprite) {
    useHeroSprite(inst, runSprite)
  }
}

/**
 * Setup keyboard controls for character
 * @param {Object} inst - Hero instance
 */
function setupControls(inst) {
  //
  // Virtual jump button always jumps (touch controls are never confused)
  //
  TouchControls.registerVirtualJumpHandler(() => attemptHeroJump(inst))
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
  if (inst.isDying) return false
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
  const useSprites = Boolean(inst.idleNotePostBake && k._idleNoteGlyphMap)
  for (const note of inst.idleNotes) {
    const fade = 1 - note.age / IDLE_NOTE_LIFETIME
    const alpha = Math.max(0, Math.min(1, fade))
    const opacity = alpha * 0.85
    if (useSprites) {
      const baked = k._idleNoteGlyphMap[note.glyph]
      baked && k.drawSprite({
        sprite: baked.name,
        pos: k.vec2(note.x, note.y),
        anchor: 'center',
        angle: note.angle,
        color: k.rgb(255, 255, 255),
        opacity,
        //
        // Native bake dimensions — squashing into a square would shrink glyphs vs drawText.
        //
        width: baked.width,
        height: baked.height
      })
    } else {
      k.drawText({
        text: note.glyph,
        pos: k.vec2(note.x, note.y),
        size: IDLE_NOTE_FONT_SIZE,
        anchor: 'center',
        color: k.rgb(255, 255, 255),
        opacity,
        angle: note.angle,
        font: fontName
      })
    }
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
  const noBuiltInFootFx = inst.footFx === false || !inst.footEffectsEnabled
  //
  // Scenes without built-in foot FX: real air time can still land-SFX if
  // wasJumping was cleared by wood flicker — never treat micro-ungrounds as landings.
  //
  const mayLandFx = inst.wasJumping ||
    (noBuiltInFootFx && inst.airAnimDuringFlicker && inst.airTime >= MIN_AIR_TIME_FOR_JUMP)
  if (wasInAir && mayLandFx && inst.landFxCooldown <= 0 && inst.spawnLandGrace <= 0) {
    inst.landFxCooldown = LAND_FX_COOLDOWN
    //
    // Prefer the surface stamped by the platform collide tag this frame
    //
    noBuiltInFootFx && inst.sfx && !inst.sfx._forestSurface && (inst.sfx._forestSurface = 'ground')
    playHeroLandFx(inst, inst.wasJumping)
  }
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
  useHeroSprite(inst, heroLookSpriteName(HERO_SPRITE_PREFIX, inst.eyeOffsetX ?? 0, inst.eyeOffsetY ?? 0))
}

/**
 * Rounds hero world position to whole pixels for crisp 1:1 rendering before integer zoom.
 * @param {Object} inst - Hero instance
 */
export function snapPosToPixels(inst) {
  const ch = inst?.character
  if (!ch?.pos) return
  ch.pos.x = Math.round(ch.pos.x)
  if (!inst?.isSubmerging) {
    ch.pos.y = Math.round(ch.pos.y)
  }
}


//
// Bakes the hero's frames from the picture sheet into the live k: the idle
// stance looking straight ahead and in every look direction, with both eyes
// shut and winking (right eye open), then the run and jump frames.
//
function bakeHeroFrames(k) {
  const P = HERO_SPRITE_PREFIX
  commitHeroFrame(k, `${P}_0_0`, HeroPicture.bakeIdleFrame([LOOK_AHEAD, LOOK_AHEAD]))
  LOOK_VECTORS.forEach((look, i) => commitHeroFrame(k, `${P}_look_${i}`, HeroPicture.bakeIdleFrame([look, look])))
  commitHeroFrame(k, `${P}_closed`, HeroPicture.bakeIdleFrame([null, null]))
  WINK_SIDES.forEach(side => commitHeroFrame(k, heroWinkSpriteName(P, side), HeroPicture.bakeIdleFrame([null, { x: side, y: 0 }])))
  for (let f = 0; f < RUN_FRAME_COUNT; f++) commitHeroFrame(k, `${P}-run-${f}`, HeroPicture.bakeRunFrame(f))
  for (let f = 0; f < JUMP_FRAME_COUNT; f++) commitHeroFrame(k, `${P}-jump-${f}`, HeroPicture.bakeJumpFrame(f))
}
//
// Grains one baked frame and hands it to Kaplay.
//
function commitHeroFrame(k, spriteName, canvas) {
  if (!canvas) return
  applyForestGameplaySharpBake(canvas, HERO_GRAIN_SEED)
  k.loadSprite(spriteName, canvas)
  canvas.width = 0
  canvas.height = 0
}
//
// Every baked hero frame name, for the "fully baked on this k" check.
//
function heroFrameSpriteNames() {
  const P = HERO_SPRITE_PREFIX
  return [
    `${P}_0_0`,
    `${P}_closed`,
    ...LOOK_VECTORS.map((_, i) => `${P}_look_${i}`),
    ...WINK_SIDES.map(side => heroWinkSpriteName(P, side)),
    ...Array.from({ length: RUN_FRAME_COUNT }, (_, f) => `${P}-run-${f}`),
    ...Array.from({ length: JUMP_FRAME_COUNT }, (_, f) => `${P}-jump-${f}`)
  ]
}
//
// Kaplay contact, or a level-owned carrier that pins the hero every frame
// (e.g. a stick riding a creature) — its teleported collider loses contact
// most frames. A rising hero is never grounded, so a launch is not undone:
// Kaplay keeps the platform one physics step after a launch, and counting
// that as ground flashed the idle stance between the crouch and the stretch.
//
function isHeroGrounded(inst) {
  const ch = inst.character
  if ((ch?.vel?.y ?? 0) < 0) return false
  return Boolean(ch?.isGrounded?.() || inst.carrierGrounded)
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
  inst.jumpFrame = 5
  useHeroSprite(inst, heroJumpSpriteName(5))
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
    if (typeof ch.isGrounded !== 'function' || !isHeroGrounded(inst)) return false
  }
  const headTop = ch.pos.y + (inst.collisionBaseOffsetY ?? -16) - (inst.collisionBaseHeight ?? 74) / 2
  const heroFeetY = ch.pos.y + (inst.collisionBaseOffsetY ?? -16) + (inst.collisionBaseHeight ?? 74) / 2
  const heroHalfW = (inst.collisionBaseWidth ?? 40) / 2 + 6
  const heroLeft = ch.pos.x - heroHalfW
  const heroRight = ch.pos.x + heroHalfW
  const platforms = [...inst.k.get(CFG.game.platformName), ...inst.k.get('platform')]
  for (const obj of platforms) {
    if (!obj?.exists?.() || obj === ch || obj.hidden || obj.pos.y < -5000) continue
    if (obj.is?.('startBranch')) continue
    if (obj.is?.(CFG.game.noCeilingTag)) continue
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
// Polls jump keys every frame (same path as movement). Edge-triggered
// onKeyPress / onPhysicalKeyPress broke after menu→level transitions because
// stale window listeners threw before the level hero handler ran; polling only
// needs isAnyKeyDown, which already drives left/right reliably.
//
function pollJumpInput(inst) {
  if (!inst.isSpawned || inst.controlsDisabled || !inst.controllable) {
    inst.jumpPollHeld = false
    return
  }
  const jumpDown = isAnyKeyDown(inst.k, CFG.controls.jump)
  jumpDown && !inst.jumpPollHeld && attemptHeroJump(inst)
  inst.jumpPollHeld = jumpDown
}
//
// Starts the pre-jump squash when jump keys are pressed and every guard passes.
//
function attemptHeroJump(inst) {
  //
  // controllable=false: no crouch→jump.
  //
  if (!inst.isSpawned || inst.controlsDisabled || inst.jumpDisabled || !inst.controllable) return
  //
  // Dialog Space must not chain into a jump — wait until jump keys are up
  //
  if (inst.jumpKeyReleaseGate) return
  if (isJumpCeilingBlocked(inst)) return
  if (inst.canJump && !inst.isSquashing) {
    inst.isSquashing = true
    inst.squashTimer = 0
    inst.jumpFrame = 0
    useHeroSprite(inst, heroJumpSpriteName(0))
  }
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
//
// True when every hero frame is registered on this Kaplay instance.
//
function isHeroFrameSetPresentOnK(k) {
  return heroFrameSpriteNames().every(name => heroSpriteExistsOnK(k, name))
}
//
// True when a sprite name is registered on this Kaplay instance.
//
function heroSpriteExistsOnK(k, spriteName) {
  try {
    return Boolean(k.getSprite(spriteName))
  } catch (_) {
    return false
  }
}
//
// Rebakes the frame set on the live k when a frame is missing.
//
function ensureHeroSpriteOnK(inst, spriteName) {
  if (heroSpriteExistsOnK(inst.k, spriteName)) return
  heroFramesBakedFor.delete(inst.k)
  loadHeroSprites(inst.k)
}
//
// Applies a hero sprite by name; falls back to the straight-ahead idle frame if missing.
//
function useHeroSprite(inst, spriteName) {
  ensureHeroSpriteOnK(inst, spriteName)
  const name = heroSpriteExistsOnK(inst.k, spriteName) ? spriteName : `${HERO_SPRITE_PREFIX}_0_0`
  if (!heroSpriteExistsOnK(inst.k, name)) return
  inst.character.use(inst.k.sprite(name))
  inst.currentEyeSprite = name
}
//
// Bakes mouth-note glyphs once per Kaplay instance for forest grain.
//
function ensureIdleNoteGlyphSprites(k, postBake) {
  if (k._idleNoteGlyphMap) return
  k._idleNoteGlyphMap = {}
  const glyphs = new Set()
  Object.values(IDLE_NOTE_GLYPHS).forEach(arr => arr.forEach(g => glyphs.add(g)))
  const fontFamily = CFG.visual.fonts.regularFull.replace(/'/g, '')
  let i = 0
  glyphs.forEach(glyph => {
    const canvas = bakeIdleNoteGlyphCanvas(glyph, fontFamily)
    postBake?.(canvas, 7400 + i)
    const name = 'idle-note-glyph-' + i
    const width = canvas.width
    const height = canvas.height
    k.loadSprite(name, canvas)
    canvas.width = 0
    canvas.height = 0
    k._idleNoteGlyphMap[glyph] = { name, width, height }
    i++
  })
}
//
// Draws one note glyph centred on a small white canvas.
//
function bakeIdleNoteGlyphCanvas(glyph, fontFamily) {
  const pad = 4
  const size = IDLE_NOTE_FONT_SIZE
  const probe = document.createElement('canvas').getContext('2d')
  probe.font = `${size}px ${fontFamily}`
  const w = Math.ceil(probe.measureText(glyph).width + pad * 2)
  const h = Math.ceil(size * 1.3 + pad * 2)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, w)
  canvas.height = Math.max(1, h)
  const ctx = canvas.getContext('2d')
  ctx.font = `${size}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(glyph, canvas.width / 2, canvas.height / 2)
  return canvas
}
