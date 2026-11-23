import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { getRGB } from '../../../utils/helper.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import * as SkinMesh from '../../../utils/skin-mesh.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from '../utils/cave-atlas.js'
import * as CaveLake from '../utils/cave-lake.js'
import * as Anim from '../utils/cave-giant-anim.js'
//
// The lake's giant (creature.png): its body drawn whole as one skinned
// mesh (skin-mesh.js) bent by a spine of bones (head, neck, front torso,
// rear torso, tail base, tail middle, tail end), its paddles drawn apart
// over it — each set in its socket on the body (the socket skinned with
// the body) and turned about it by its rowing stroke. It is drawn behind
// the soil, so the lake bed's walls hide it as it comes and goes.
//
// The head leads: only the head is steered; it leaves a trail behind it,
// and every joint of the body stands on that trail at its own distance
// behind the head, as if the body were drawn along by the head along its
// path (cave-giant-anim.js adds the swim's wave on top). The head turns
// in arcs (its pitch no faster than its speed allows over ARC_R px).
//
// Behaviour (a state machine):
// - AWAY behind a wall; now and then it comes in (ENTER) from either side,
//   head first;
// - SWIM: only ever onward, roaming the deep water ahead and hunting the
//   fish ahead of it: closing in slowly, then a lunge, its lower jaw
//   dropping open (the mouth's pink inside and its teeth showing) as it
//   nears the fish; once half the fish is in its mouth the jaw snaps shut
//   on it and the fish is gone; now and then it hangs still (IDLE);
// - it never turns about in the lake: reaching the far end it swims on
//   behind the wall (EXIT) until its tail is gone, waits there and comes
//   back in from that same wall, head first the other way;
// - every so often its head rises in an arc to the surface (SURFACE), the
//   body following, and it BREATHEs: the body floating level, nearly
//   still, mist puffing from its nostrils; then it DIVEs, the head going
//   down, the body following it under;
// - after a while or a few meals it leaves through the wall ahead, and
//   comes out again a little later from either side.
// It lives its own life under the water: nothing stands or rides on it.
// The body is heavy: speed and pitch change slowly.
//
const SPRITE = 'cave0-giant-v6'
const MIST_SPRITE = 'cave0-giant-mist-v1'
const GRAIN_SEED = 9540
const G = CAVE_CFG.giant
//
// The body (giantBody piece px — creature.png faces right; its pieces are
// mirrored as they are cut, so here it faces left, its snout at x 0 like
// all the giant's own art): its size, the rest spine head to tail (the
// anchor joint the mesh is placed by), the top of its back (a level line
// along the top of its head, the highest of it: breathing, it stands out
// of the water), the snout and its three nostrils (the mist comes out of
// each).
//
const PICTURE = { w: 1699, h: 401 }
const JOINTS = [
  { x: 8, y: 113 },
  { x: 292, y: 158 },
  { x: 578, y: 219 },
  { x: 878, y: 256 },
  { x: 1135, y: 264 },
  { x: 1383, y: 218 },
  { x: 1580, y: 218 },
  { x: 1686, y: 215 }
]
const ANCHOR = 2
const BACK = [{ x: 130, y: 15 }, { x: 357, y: 15 }]
const SNOUT = { x: 6, y: 121 }
const NOSTRILS = [{ x: 44, y: 63 }, { x: 83, y: 67 }, { x: 133, y: 74 }]
//
// The jaw (giantBody px): the mouth line, snout to corner (where the lips
// meet, the jaw's hinge); the lower jaw's outline (the mouth line, then
// down behind the corner and along the chin: cut out of the body and drawn
// apart); the gullet (between the lips, where a caught fish's middle is
// held); how far it drops open (rad), how fast it opens and snaps shut
// (share per s); it gapes within GAPE_R px of its prey and holds a fish
// in its shut jaws GULP_TIME s before it is gone. The jaw's cut reaches
// JAW_EDGE px past its outline (so no seam shows where it meets the body),
// its piece JAW_PAD px wider still. TEETH teeth along each lip (none at
// the corner end, past TEETH_SPAN of the lip), TOOTH_LEN px long, TOOTH_W
// wide, with a TOOTH_RIM px dark rim (world), never reaching past
// TOOTH_GAP of the gap to the other lip. The open mouth is see-through
// (the water shows in the gap) but for its pink back: solid, crisp-edged,
// from the corner out to the lips' point GAPE_AT (a MOUTH index), its
// front edge an arc from the upper lip to the lower one bowed back toward
// the corner by GAPE_BOW of the gap there, drawn through GAPE_STEPS
// steps. It opens at OPEN_RATE, at LUNGE_OPEN_RATE in a rush.
//
const MOUTH = [{ x: 12, y: 124 }, { x: 20, y: 131 }, { x: 40, y: 131 }, { x: 60, y: 133 }, { x: 90, y: 140 }, { x: 120, y: 148 }, { x: 150, y: 158 }, { x: 170, y: 163 }, { x: 190, y: 167 }, { x: 212, y: 171 }]
const HINGE = MOUTH[MOUTH.length - 1]
const GULLET = { x: 40, y: 131 }
const JAW = MOUTH.concat([{ x: 215, y: 190 }, { x: 213, y: 281 }, { x: 180, y: 269 }, { x: 150, y: 256 }, { x: 120, y: 242 }, { x: 100, y: 232 }, { x: 80, y: 220 }, { x: 60, y: 205 }, { x: 40, y: 187 }, { x: 25, y: 168 }, { x: 15, y: 154 }, { x: 8, y: 130 }])
const JAW_EDGE = 3
const JAW_PAD = 4
const JAW_OPEN = 0.5
const OPEN_RATE = 2.5
const LUNGE_OPEN_RATE = 8
const SHUT_RATE = 10
const GAPE_R = 110
//
// Eating (s, share of open, rad): the jaws snap shut on the fish and hold
// it SNAP_HOLD s, then chew CHEWS times, each CHEW_PERIOD s long, opening
// to CHEW_OPEN for its first CHEW_OPEN_SHARE and biting down after, then
// swallow over SWALLOW_TIME s. Caught, the fish is held by its middle
// between the lips' front ends, turned head out of the mouth (along the
// head's line, tilted OUT_TILT of the jaw's drop down toward the gap): its
// tail half is in the mouth (hidden), its front sticks out and jerks — up
// to THRASH rad at THRASH_HZ, each jerk sharpened by THRASH_SNAP, weaker
// as it goes in. It stays out so for HOLD_OUT of the gulp (the bites and
// their blood come meanwhile), then it is drawn on into the mouth (eased)
// until it is gone at the gulp's end (GULP_TIME s). It slows to EAT_SPEED
// px/s to eat (as fast as it speeds up in a rush).
// Blood clouds out of the mouth: BLOOD_BITE puffs as it bites, BLOOD_CHEW
// at each chew's bite, BLOOD_GONE as it swallows.
//
const SNAP_HOLD = 0.2
const CHEWS = 3
const CHEW_PERIOD = 0.4
const CHEW_OPEN = 0.25
const CHEW_OPEN_SHARE = 0.45
const SWALLOW_TIME = 0.3
const GULP_TIME = SNAP_HOLD + CHEWS * CHEW_PERIOD + SWALLOW_TIME
const THRASH = 0.35
const EAT_SPEED = 10
const THRASH_HZ = 7
const THRASH_SNAP = 0.4
const OUT_TILT = 0.5
const HOLD_OUT = 0.55
const BLOOD_BITE = 4
const BLOOD_CHEW = 4
const BLOOD_GONE = 6
//
// Blood in the water (world px, s): a puff of the mist's baked cloud
// tinted the blood's colour, starting within BLOOD_SPREAD px of the
// snout, thrown on with BLOOD_CARRY of the snout's own speed and at up to
// BLOOD_DRIFT px/s any way (slowed by BLOOD_DRAG per s,
// sinking BLOOD_SINK px/s), growing from BLOOD_S0 to BLOOD_S1..+RANGE px
// over BLOOD_LIFE..+RANGE s while it thins out (BLOOD_ALPHA at its
// thickest, fading in over BLOOD_IN of its life).
//
const BLOOD_SPREAD = 4
const BLOOD_CARRY = 0.8
const BLOOD_DRIFT = 14
const BLOOD_DRAG = 1.2
const BLOOD_SINK = 3
const BLOOD_S0 = 3
const BLOOD_S1 = 14
const BLOOD_S1_RANGE = 10
const BLOOD_LIFE = 1.6
const BLOOD_LIFE_RANGE = 1.2
const BLOOD_ALPHA = 0.95
const BLOOD_IN = 0.08
const NOTHING = Object.freeze([])
const TEETH = 9
const TEETH_SPAN = 0.85
const TOOTH_LEN = 3
const TOOTH_W = 1.6
const TOOTH_RIM = 0.5
const TOOTH_GAP = 0.45
const GAPE_AT = 4
const GAPE_BOW = 0.7
const GAPE_STEPS = 8
//
// The pink back as a fan from the corner over its outline: the upper lip
// from the corner out to GAPE_AT, the arc, the lower lip back in.
//
const GAPE_POINTS = (MOUTH.length - 2 - GAPE_AT) * 2 + GAPE_STEPS + 1
const GAPE_INDICES = Array.from({ length: GAPE_POINTS - 1 }, (_, i) => [GAPE_POINTS, i, i + 1]).flat()
//
// How far its outline reaches over (GIRTH_UP) and under (GIRTH_DOWN: its
// paddles hanging under the middle of it too) each joint's spine point
// (giantBody px), and how much further down its dropped jaw reaches at
// the snout fully open (the joint behind half that).
//
const GIRTH_UP = [49, 151, 152, 141, 87, 80, 119, 63]
const GIRTH_DOWN = [56, 156, 454, 400, 294, 76, 119, 63]
const JAW_REACH = 100
const SOCKET_R = 76
const SOCKET_SOFT = 0.35
const SOCKET_FROM = 105
const TRANSPARENT = '00'
//
// Paddles: the piece, its root on its piece (px: the end that sits in the
// socket), the socket on the body (giantBody px) and the bone the socket
// rides on. A paddle covers its socket: the socket painted on the body
// (its light rim and its hole) is covered over with the body's own skin
// from SOCKET_FROM px over it (a disc SOCKET_R px round, soft over its
// outer SOCKET_SOFT share), so nothing of it shows round the paddle's root.
//
const FINS = [
  { piece: 'giantFinFront', root: { x: 48, y: 59 }, socket: { x: 528, y: 311 }, bone: 2 },
  { piece: 'giantFinHind', root: { x: 38, y: 44 }, socket: { x: 1005, y: 335 }, bone: 3 }
]
const SCALE = G.length / PICTURE.w
const TEX_OVER = 3
const ATLAS_GAP = 4
const DEG = 180 / Math.PI
//
// Movement (world px, s, rad): cruising, slow and fast swims (dev),
// stalking, chasing, leaving, rising; speeding up and slowing (ACCEL: its
// inertia; LUNGE_ACCEL in a chase, a burst); the speed the animation
// counts as full (the chase's: the tail beats harder the faster it wants
// to swim). Pitch: the arc's radius (the head's pitch turns at most
// speed / ARC_R rad/s, and at least PITCH_MIN_RATE), how readily it
// follows a change (PITCH_EASE), its limits, the least run a pitch toward
// a target is worked out over. The trail keeps a point every TRAIL_STEP
// px swum, as far back as the body is long and TRAIL_SPARE more. The
// body laid along it bends at most JOINT_BEND rad at a joint and
// BODY_BEND rad all told off its head; the head lies within HEAD_TILT rad
// of level.
//
const CRUISE = 28
const SLOW = 16
const FAST = 60
const STALK = 55
const LUNGE = 160
const LEAVE_SPEED = 36
const RISE_SPEED = 30
const ACCEL = 16
const LUNGE_ACCEL = 110
const TOP_SPEED = LUNGE
const ARC_R = 140
const PITCH_MIN_RATE = 0.05
const PITCH_EASE = 1.2
const MAX_PITCH = 0.4
const PITCH_DX_MIN = 60
const TRAIL_STEP = 3
const TRAIL_SPARE = 30
const JOINT_BEND = 0.35
const BODY_BEND = Math.PI / 4
const HEAD_TILT = 0.6
//
// The lake (for the head): HEAD_EDGE px inside the open water's ends
// (out of the banks' hollows), SUB_TOP px under the surface when
// submerged (never pushed down to it: a head
// above that line may only sink) and BED_CLEAR over the bed. Breathing,
// the top of the back stands BACK_ABOVE px out of the water (the head
// reaching its height within SURFACE_NEAR px and held there at HOLD_RATE;
// within SURFACE_UP px it counts as up and swims along the surface — the
// waves move that height a little, so a tighter bound would flicker), the
// body floating level at LEVEL_RATE per s. Surfacing, it swims on along
// the surface (room ahead) at SURFACE_SPEED, its mouth SURFACE_GAPE open
// while it moves faster than SURFACE_GAPE_SPEED, till its tail has come up within LEVEL_TOL px of its
// head's height along its own path, so its body is level when it stops.
// The head looks HEAD_LOOK px ahead: its pitch never aims it into the bed
// nor (under water) up past the submerged line there, so it levels off in
// an arc before it meets either; one still pushed along a bound swims
// on the bound's own slope.
//
const HEAD_EDGE = 50
const SUB_TOP = 24
const BED_CLEAR = 34
const BACK_ABOVE = 22
const SURFACE_NEAR = 2
const SURFACE_UP = 6
const LEVEL_RATE = 0.8
const HOLD_RATE = 3
const SURFACE_SPEED = 50
const SURFACE_GAPE = 0.7
const SURFACE_GAPE_SPEED = 12
const LEVEL_TOL = 8
const HEAD_LOOK = [60, 120, 180]
//
// Rhythm: it breathes every BREATH_EVERY..+RANGE s of swimming for
// BREATH_TIME..+RANGE s. A breath blows a jet of mist from each nostril
// every PUFF_EVERY s (it draws in INHALE_LEAD s before each, both heard:
// ctx.onBreath):
// PUFF_COUNT wisps one after another (PUFF_GAP s apart), each a baked
// cloud of soft blobs and streaks (MIST_VARIANTS of them, MIST_PX square,
// MIST_BLOBS blobs and MIST_STREAKS streaks), thrown up at PUFF_UP..+RANGE
// px/s and aside at up to PUFF_SPEED, slowed by PUFF_DRAG per s, swaying
// PUFF_SWAY px at PUFF_SWAY_HZ, turning up to PUFF_SPIN rad/s, growing
// from PUFF_S0 to PUFF_S1..+RANGE px wide and fading in over PUFF_IN of
// its life (PUFF_LIFE..+RANGE s) and out after. It dives to DIVE_DEPTH of
// the deep water, DIVE_AHEAD px on.
//
const BREATH_EVERY = 12
const BREATH_EVERY_RANGE = 10
const BREATH_TIME = 7
const BREATH_TIME_RANGE = 5
const PUFF_EVERY = 1.7
const INHALE_LEAD = 0.8
const PUFF_COUNT = 7
const PUFF_GAP = 0.05
const PUFF_UP = 34
const PUFF_UP_RANGE = 22
const PUFF_SPEED = 12
const PUFF_DRAG = 0.7
const PUFF_SWAY = 6
const PUFF_SWAY_HZ = 0.5
const PUFF_SPIN = 0.6
const PUFF_S0 = 3
const PUFF_S1 = 13
const PUFF_S1_RANGE = 8
const PUFF_IN = 0.15
const PUFF_LIFE = 1.3
const PUFF_LIFE_RANGE = 0.7
const PUFF_ALPHA = 0.55
const MIST_VARIANTS = 3
const MIST_PX = 64
const MIST_BLOBS = 10
const MIST_BLOB_R = 7
const MIST_BLOB_R_RANGE = 11
const MIST_SPREAD = 18
const MIST_BLOB_ALPHA = 0.32
const MIST_STREAKS = 3
const MIST_STREAK_ALPHA = 0.14
const MIST_STREAK_W = 2.5
const MIST_SEED = 9560
const DIVE_DEPTH = 0.6
const DIVE_AHEAD = 180
//
// Visits: the first after FIRST_VISIT s; gone behind a wall, left or
// right, it comes back out of either (at random) after AWAY..+RANGE s to
// hunt again — so it shows now and then whatever the hero does (the
// giant's dev scene, holding it in the lake, has it come back the other
// way within BACK_IN..+RANGE s). Its head comes in from HEAD_HIDE px behind the water's end at
// ENTER_DEPTH of the deep water and swims ENTER_IN px in before roaming;
// it is gone once its tail is EXIT_OUT px past the end. It stays
// STAY..+RANGE s or until MEALS fish are eaten. Roaming, it heads
// AHEAD..+RANGE px on; with less than AHEAD left ahead it goes through the
// wall. Now and then it hangs still (IDLE_CHANCE on reaching a spot) for
// IDLE_TIME..+RANGE s.
const FIRST_VISIT = 10
const AWAY = 15
const AWAY_RANGE = 15
const BACK_IN = 2
const BACK_IN_RANGE = 3
const HEAD_HIDE = 15
const ENTER_IN = 120
const EXIT_OUT = 20
const ENTER_DEPTH = 0.55
const STAY = 40
const STAY_RANGE = 25
const MEALS = 3
const AHEAD = 160
const AHEAD_RANGE = 260
const IDLE_CHANCE = 0.2
const IDLE_TIME = 3
const IDLE_TIME_RANGE = 3
const ROAM_ARRIVE = 30
//
// Hunting: a small fish (ctx.canEat) ahead of its snout within SEE px, with CHASE_ROOM px
// of lake ahead of it; stalked, then chased from within LUNGE_R px for at
// most LUNGE_TIME s: the fish bolts straight on ahead of it, and it swims
// after it, faster, steering (only by its pitch, along arcs, never thrown
// up or down) so that the middle of its open gape (halfway between the
// upper lip and the dropped jaw, GAPE_DY px under its head as painted)
// comes onto the fish's line, aimed CHASE_LEAD px ahead of the fish: if
// it gets there in time the fish swims right between its jaws, else it
// misses. While stalking it already heads for that line — hurrying (at
// SCHOOL_RUSH) when its prey swims in a school (SCHOOL_MIN fish or more
// within SCHOOL_R px of it). It gives up once the lake runs out
// (CHASE_STOP px ahead). Only a fish it has caught up with, in line with
// its mouth, can be caught (never one over or under its head, nothing is
// drawn in): measured from the gape's middle along the head's line
// (snout-ward) and across it, it seizes the fish once the fish's middle
// is within EAT_BACK..EAT_R along and EAT_W across. It rests
// REST..+RANGE s after. A fish
// that strays right in front of its mouth (within SNAP_R along and SNAP_W
// across) it rushes at then and there, rested or not.
//
const SEE = 420
const CHASE_ROOM = 320
const SNAP_R = 45
const SNAP_W = 10
const LUNGE_R = 170
const LUNGE_TIME = 4
const CHASE_LEAD = 60
const CHASE_STOP = 40
const EAT_R = 18
const EAT_BACK = 6
const EAT_W = 7
const SCHOOL_R = 120
const SCHOOL_MIN = 3
const SCHOOL_RUSH = 85
const REST = 2
const REST_RANGE = 3
const CULL_MARGIN = 300
const DEBUG_TEXT = 12
const DEBUG_TEXT_UP = 80
const SEED = 7731
const HALF = 0.5
const GAPE_DY = ((GULLET.y + HINGE.y + (GULLET.x - HINGE.x) * Math.sin(-JAW_OPEN) + (GULLET.y - HINGE.y) * Math.cos(-JAW_OPEN)) * HALF - JOINTS[0].y) * SCALE
const TINY = 1e-3
const OPENING_MIN = 4
const HELD_OVERLAP = 14
export const MODE = { AWAY: 'away', ENTER: 'enter', SWIM: 'swim', IDLE: 'idle', SURFACE: 'surface', BREATHE: 'breathe', DIVE: 'dive', EXIT: 'exit' }
const ANIM_STATE = {
  [MODE.ENTER]: Anim.STATE.SWIM,
  [MODE.SWIM]: Anim.STATE.SWIM,
  [MODE.EXIT]: Anim.STATE.SWIM,
  [MODE.IDLE]: Anim.STATE.IDLE,
  [MODE.SURFACE]: Anim.STATE.SURFACE,
  [MODE.BREATHE]: Anim.STATE.BREATHE,
  [MODE.DIVE]: Anim.STATE.DIVE
}
export const COMMAND = { IDLE: 'idle', SLOW: 'slow', FAST: 'fast', SURFACE: 'surface', DIVE: 'dive', TURN: 'turn', AUTO: 'auto' }
const partsFor = new WeakMap()
const mistFor = new WeakMap()
let atlas = null
let mistCanvas = null

/**
 * Creates the lake's giant (away behind the bed's wall at first; in the
 * lake at once and staying when `stay` is set, as in the giant's dev
 * scene).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.lake - Lake instance (cave-lake.js)
 * @param {boolean} [cfg.stay=false] - Never leave for good (dev scene)
 * @returns {Object} Giant instance
 */
export function create(cfg) {
  const { k, lake } = cfg
  bake(k)
  const span = CaveLake.span(lake)
  const mesh = SkinMesh.create({ k, picture: PICTURE, scale: SCALE, cols: G.mesh.cols, rows: G.mesh.rows, joints: JOINTS, anchor: ANCHOR, blend: G.mesh.blend })
  const reach = [0]
  mesh.bones.forEach(b => reach.push(reach[reach.length - 1] + b.len))
  const inst = {
    k,
    lake,
    rng: createSeededRandom(SEED),
    span,
    minX: CaveLake.openSpan(lake).x1 + HEAD_EDGE,
    maxX: CaveLake.openSpan(lake).x2 - HEAD_EDGE,
    mesh,
    reach,
    keep: reach[reach.length - 1] + TRAIL_SPARE,
    anim: Anim.create(mesh.bones.length),
    stay: Boolean(cfg.stay),
    locked: false,
    cmdSpeed: null,
    surfaceX: null,
    mode: MODE.AWAY,
    modeT: 0,
    awayFor: cfg.stay ? 0 : FIRST_VISIT,
    returnSide: null,
    visiting: false,
    stayFor: 0,
    breathIn: BREATH_EVERY,
    breathFor: 0,
    idleFor: 0,
    meals: 0,
    restFor: 0,
    prey: null,
    lunging: false,
    side: -1,
    facing: 1,
    pos: { x: span.x1 - HEAD_HIDE, y: CaveLake.surfaceAt(lake, span.x1) },
    trail: [],
    swum: 0,
    joints: JOINTS.map(() => ({ x: 0, y: 0 })),
    girthUp: GIRTH_UP.map(g => g * SCALE),
    girthDown: GIRTH_DOWN.map(() => 0),
    body: null,
    target: { x: 0, y: 0 },
    want: 0,
    speed: 0,
    pitch: 0,
    puffIn: 0,
    inhaled: true,
    puffs: [],
    open: 0,
    held: null,
    gulpT: 0,
    bites: 0,
    heldTurn: 0,
    inward: { x: 0, y: 0 },
    rel: { along: 0, across: 0, x: 0, y: 0 },
    blood: [],
    bloodRgb: getRGB(k, G.blood),
    gullet: { x: 0, y: 0 },
    gape: { x: 0, y: 0 },
    lips: { x: 0, y: 0 },
    opening: { x: 0, y: 0, nx: 1, ny: 0 },
    heldShows: null,
    out: { x: 1, y: 0 },
    upper: MOUTH.map(() => k.vec2(0, 0)),
    lower: MOUTH.map(() => k.vec2(0, 0)),
    gapePts: Array.from({ length: GAPE_POINTS + 1 }, () => k.vec2(0, 0)),
    gapeRgb: getRGB(k, G.gape),
    hinge: { x: 0, y: 0 },
    tooth: [k.vec2(0, 0), k.vec2(0, 0), k.vec2(0, 0)],
    toothRgb: getRGB(k, G.tooth),
    toothEdgeRgb: getRGB(k, G.toothEdge),
    snout: { x: 0, y: 0 },
    snoutV: { x: 0, y: 0 },
    nostril: { x: 0, y: 0 },
    socket: { x: 0, y: 0 },
    a: { x: 0, y: 0 },
    b: { x: 0, y: 0 },
    v: k.vec2(0, 0),
    mistRgb: getRGB(k, G.mist),
    debugRgb: getRGB(k, G.debugLine),
    boneRgbs: G.debugBones.map(hex => getRGB(k, hex))
  }
  inst.fearPts = [inst.snout, inst.joints[ANCHOR], inst.joints[inst.joints.length - 1]]
  inst.body = { pts: inst.joints, up: inst.girthUp, down: inst.girthDown }
  resetTrail(inst)
  return inst
}

/**
 * Runs the giant on: its state, its head's movement, its body along the
 * head's trail, its animation, its hunt, its back as ground, its breath.
 * @param {Object} inst - Giant instance
 * @param {Object} ctx
 * @param {Array<Object>} ctx.school - The lake's fish (cave-fish.js instances)
 * @param {(fish: Object) => {x: number, y: number}|null} ctx.headOf - A fish's head while it can be caught
 * @param {(fish: Object) => boolean} ctx.canEat - Whether it hunts that fish (only the small ones)
 * @param {(fish: Object) => {x: number, y: number}|null} ctx.middleOf - Its body's middle (half of it in a mouth that reaches there)
 * @param {(fish: Object, dir: number) => void} ctx.onChase - A fish is chased: it bolts straight on that way
 * @param {(fish: Object, out: Object) => void} ctx.onSeize - A fish is caught in the jaws (to be held head out along `out`)
 * @param {(fish: Object, at: Object, angle: number, dir: Object, share: number) => void} ctx.onHold - Holds a fish in the jaws (Fish.hold)
 * @param {(fish: Object) => void} ctx.onEat - A fish is swallowed (gone)
 * @param {(exhale: boolean, x: number) => void} ctx.onBreath - It breathes out (true) or in at world X
 */
export function onUpdate(inst, ctx) {
  const dt = inst.k.dt()
  if (dt <= 0) return
  inst.modeT += dt
  updatePuffs(inst, dt)
  updateBlood(inst, dt)
  if (inst.mode === MODE.AWAY) {
    inst.awayFor -= dt
    inst.awayFor <= 0 && comeIn(inst, inst.returnSide)
    return
  }
  decide(inst, ctx, dt)
  if (inst.mode === MODE.AWAY) return
  move(inst, dt)
  Anim.onUpdate(inst.anim, { state: ANIM_STATE[inst.mode], speed: Math.min(1, Math.max(inst.speed, inst.want) / TOP_SPEED), dt })
  layBody(inst)
  SkinMesh.setJoints(inst.mesh, { joints: inst.joints, mirrored: inst.facing > 0 })
  const sx = inst.snout.x
  const sy = inst.snout.y
  SkinMesh.pointAt(inst.mesh, SNOUT, inst.snout)
  SkinMesh.pointAt(inst.mesh, GULLET, inst.gullet)
  placeGape(inst)
  inst.snoutV.x = (inst.snout.x - sx) / dt
  inst.snoutV.y = (inst.snout.y - sy) / dt
  inst.held ? gulp(inst, ctx, dt) : inst.lunging && bite(inst, ctx)
  openJaw(inst, ctx, dt)
}

/**
 * A dev command (the giant's dev scene): holds it in a state until AUTO
 * (TURN: through the wall ahead and back the other way).
 * @param {Object} inst - Giant instance
 * @param {string} cmd - COMMAND
 * @param {number} [x] - For SURFACE: where along the lake (world X)
 */
export function command(inst, cmd, x) {
  inst.locked = cmd !== COMMAND.AUTO
  inst.prey = null
  inst.lunging = false
  inst.cmdSpeed = cmd === COMMAND.SLOW ? SLOW : cmd === COMMAND.FAST ? FAST : null
  inst.mode === MODE.AWAY && comeIn(inst, null)
  if (cmd === COMMAND.IDLE) setMode(inst, MODE.IDLE)
  if (cmd === COMMAND.SLOW || cmd === COMMAND.FAST || cmd === COMMAND.AUTO) {
    setMode(inst, MODE.SWIM)
    pickAhead(inst)
  }
  cmd === COMMAND.SURFACE && startSurface(inst, x ?? inst.pos.x)
  cmd === COMMAND.DIVE && startDive(inst)
  cmd === COMMAND.TURN && exit(inst, true)
}

/**
 * What of it the lake's life (its fish, the striders on the surface)
 * fears while it is in the lake (its snout, its middle, its tail's end),
 * else nothing.
 * @param {Object} inst - Giant instance
 * @returns {Array<{x: number, y: number}>}
 */
export function fearPoints(inst) {
  return inst.mode === MODE.AWAY ? NOTHING : inst.fearPts
}

/**
 * Its body for the fish to keep clear of while it is in the lake: its
 * spine head to tail (world) and how far its outline reaches over and
 * under each joint (world px; under, its paddles too, and more at the head
 * while its jaw is dropped), else null.
 * @param {Object} inst - Giant instance
 * @returns {{pts: Array<{x: number, y: number}>, up: Array<number>, down: Array<number>}|null}
 */
export function bodyLine(inst) {
  if (inst.mode === MODE.AWAY) return null
  inst.girthDown.forEach((_, i) => {
    const jaw = i === 0 ? 1 : i === 1 ? HALF : 0
    inst.girthDown[i] = (GIRTH_DOWN[i] + inst.open * JAW_REACH * jaw) * SCALE
  })
  return inst.body
}

/**
 * Draws the giant (behind the soil): its body bent as one mesh, the open
 * mouth's inside and its upper teeth, the lower jaw and its teeth, its
 * paddles in their sockets, a fish held in its mouth (in front of all of
 * it, only what sticks out past the mouth's line); the blood it leaves in
 * the water.
 * @param {Object} inst - Giant instance
 * @param {{left: number, right: number, top: number, bottom: number}} view - World rect in view
 * @param {(fish: Object, view: Object, cut: Function) => void} drawHeld - Draws a fish held in its mouth where `cut(x, y)` says it shows
 */
export function onDraw(inst, view, drawHeld) {
  const p = inst.joints[ANCHOR]
  const seen = inst.mode !== MODE.AWAY && p.x > view.left - CULL_MARGIN && p.x < view.right + CULL_MARGIN && p.y > view.top - CULL_MARGIN && p.y < view.bottom + CULL_MARGIN
  seen && drawBody(inst, view, drawHeld)
  drawBlood(inst)
}
//
// The giant itself: the body, the open mouth's pink back, the upper teeth,
// the jaw and its teeth, the paddles, then a fish held in its mouth in
// front of all of it — only what sticks out past the mouth's line (the
// rest, in the mouth, hidden).
//
function drawBody(inst, view, drawHeld) {
  const parts = partsFor.get(inst.k)
  const frame = inst.k.getSprite(SPRITE)?.data?.frames?.[0]
  if (!parts || !frame) return
  SkinMesh.onDraw(inst.mesh, frame.tex, parts.giantBody.quad)
  SkinMesh.pointAt(inst.mesh, HINGE, inst.hinge)
  const gaping = inst.open > 0
  ;(gaping || inst.held) && lipPoints(inst)
  gaping && drawGape(inst)
  gaping && drawTeeth(inst, inst.upper, inst.lower)
  drawPart(inst, parts.giantJaw, inst.hinge, jawTurn(inst))
  gaping && drawTeeth(inst, inst.lower, inst.upper)
  FINS.forEach((fin, i) => drawFin(inst, parts[fin.piece], fin, inst.anim.fins[i]))
  inst.held && drawHeld(inst.held, view, mouthCut(inst))
}

/**
 * Draws its breath's mist over the water.
 * @param {Object} inst - Giant instance
 */
export function onDrawMist(inst) {
  const k = inst.k
  const mist = mistFor.get(k)
  if (!mist) return
  inst.puffs.forEach(p => {
    if (p.t < 0) return
    const share = Math.min(1, p.t / p.life)
    const size = PUFF_S0 + (p.size - PUFF_S0) * (1 - (1 - share) * (1 - share))
    const fade = Math.min(1, share / PUFF_IN) * (1 - share)
    k.drawSprite({ sprite: MIST_SPRITE, quad: mist[p.variant], width: size, height: size, pos: inst.v.set(p.x, p.y), anchor: 'center', angle: p.rot * DEG, color: inst.mistRgb, opacity: PUFF_ALPHA * fade })
  })
}

/**
 * Draws the debug overlay: the mesh's triangles, bones, weights and
 * attachments, the back's body, the state.
 * @param {Object} inst - Giant instance
 */
export function onDrawDebug(inst) {
  if (inst.mode === MODE.AWAY) return
  SkinMesh.onDrawDebug(inst.mesh, inst.boneRgbs, inst.debugRgb)
  const text = `${inst.mode} speed ${Math.round(inst.speed)} pitch ${inst.pitch.toFixed(2)}${inst.locked ? ' (held)' : ''}`
  inst.k.drawText({ text, pos: inst.k.vec2(inst.pos.x - DEBUG_TEXT_UP, inst.pos.y - DEBUG_TEXT_UP), size: DEBUG_TEXT, color: inst.debugRgb })
}
//
// In from behind a wall (the given side, else either — truly at random,
// not by its seeded moves, so no one knows where it will come from), at a
// depth of the deep water there, head first into the lake, the body
// straight behind it.
//
function comeIn(inst, side) {
  inst.side = side ?? (Math.random() < HALF ? -1 : 1)
  inst.facing = -inst.side
  inst.returnSide = null
  const inX = inst.side < 0 ? inst.minX : inst.maxX
  inst.pos.x = inst.side < 0 ? inst.span.x1 - HEAD_HIDE : inst.span.x2 + HEAD_HIDE
  inst.pos.y = depthAt(inst, inX, ENTER_DEPTH)
  inst.speed = CRUISE
  inst.pitch = 0
  resetTrail(inst)
  if (!inst.visiting) {
    inst.visiting = true
    inst.meals = 0
    inst.stayFor = STAY + inst.rng() * STAY_RANGE
    inst.breathIn = BREATH_EVERY + inst.rng() * BREATH_EVERY_RANGE
  }
  setMode(inst, MODE.ENTER)
  setTarget(inst, inX + inst.facing * ENTER_IN, inst.pos.y, inst.cmdSpeed ?? CRUISE)
}
//
// A straight trail behind the head (as long as the body and some).
//
function resetTrail(inst) {
  inst.swum = inst.keep
  inst.trail.length = 0
  for (let s = 0; s <= inst.keep; s += TRAIL_STEP) inst.trail.push({ x: inst.pos.x - inst.facing * (inst.keep - s), y: inst.pos.y, s })
}
function setMode(inst, mode) {
  inst.mode = mode
  inst.modeT = 0
}
function setTarget(inst, x, y, speed) {
  inst.target.x = x
  inst.target.y = y
  inst.want = speed
}
//
// A depth share of the water at x (0 just under the surface the head may
// rise to, 1 just over the bed).
//
function depthAt(inst, x, share) {
  const top = CaveLake.surfaceAt(inst.lake, x) + SUB_TOP
  const bottom = Math.max(top, CaveLake.bottomAt(inst.lake, x) - BED_CLEAR)
  return top + (bottom - top) * share
}
//
// The head's height while breathing: the back's top BACK_ABOVE px out of
// the water with the body level.
//
function breatheY(inst, x) {
  const backTop = (Math.min(BACK[0].y, BACK[1].y) - JOINTS[0].y) * SCALE
  return CaveLake.surfaceAt(inst.lake, x) - BACK_ABOVE - backTop
}
//
// How much lake lies ahead of its head.
//
function roomAhead(inst) {
  return inst.facing > 0 ? inst.maxX - inst.pos.x : inst.pos.x - inst.minX
}
//
// What it does now (the state machine's transitions and targets).
//
function decide(inst, ctx, dt) {
  const { mode } = inst
  if (mode === MODE.ENTER) {
    roomAhead(inst) < inst.maxX - inst.minX - ENTER_IN && setMode(inst, MODE.SWIM)
    return
  }
  if (mode === MODE.EXIT) {
    exitOn(inst)
    return
  }
  if (roomAhead(inst) <= 0 && mode !== MODE.BREATHE) {
    exit(inst, inst.stay || inst.locked || (inst.stayFor > 0 && inst.meals < MEALS))
    return
  }
  if (mode === MODE.SURFACE || mode === MODE.BREATHE) {
    breathe(inst, ctx, dt)
    return
  }
  if (mode === MODE.DIVE) {
    inst.pos.y >= inst.target.y - SURFACE_NEAR && setMode(inst, MODE.SWIM)
    return
  }
  if (inst.locked) {
    mode === MODE.SWIM && roam(inst)
    inst.want = mode === MODE.IDLE ? 0 : inst.want
    return
  }
  inst.stayFor -= dt
  inst.breathIn -= dt
  inst.restFor -= dt
  if (!inst.stay && (inst.stayFor <= 0 || inst.meals >= MEALS) && !inst.lunging) {
    exit(inst, false)
    return
  }
  if (inst.breathIn <= 0 && !inst.lunging) {
    startSurface(inst, inst.pos.x + inst.facing * Math.min(roomAhead(inst), AHEAD))
    return
  }
  if (snap(inst, ctx)) return
  if (mode === MODE.IDLE) {
    inst.idleFor -= dt
    inst.idleFor <= 0 && setMode(inst, MODE.SWIM)
    inst.want = 0
    return
  }
  hunt(inst, ctx) || roam(inst)
}
//
// After the fish ahead of it (stalking, then the chase); true while
// hunting.
//
function hunt(inst, ctx) {
  inst.lunging && (inst.modeT >= LUNGE_TIME || roomAhead(inst) < CHASE_STOP) && endHunt(inst)
  !inst.prey && inst.restFor <= 0 && pickPrey(inst, ctx)
  const p = inst.prey && ctx.headOf(inst.prey)
  if (!p || (p.x - inst.snout.x) * inst.facing < 0) {
    inst.prey && endHunt(inst)
    return false
  }
  !inst.lunging && Math.hypot(p.x - inst.snout.x, p.y - inst.snout.y) < LUNGE_R && chase(inst, ctx)
  const m = ctx.middleOf(inst.prey) ?? p
  if (!inst.lunging) {
    setTarget(inst, p.x + (inst.pos.x - inst.snout.x), m.y - GAPE_DY, inSchool(ctx, p) ? SCHOOL_RUSH : STALK)
    return true
  }
  setTarget(inst, m.x + inst.pos.x - inst.gape.x + inst.facing * CHASE_LEAD, m.y - GAPE_DY, LUNGE)
  return true
}
//
// Whether a fish's head is in a school (enough of the lake's fish near).
//
function inSchool(ctx, p) {
  let n = 0
  ctx.school.forEach(fish => {
    const h = ctx.headOf(fish)
    h && Math.hypot(h.x - p.x, h.y - p.y) < SCHOOL_R && n++
  })
  return n >= SCHOOL_MIN
}
//
// A small fish in front of its mouth: it rushes at it at once (out of
// hanging still, too); true if so.
//
function snap(inst, ctx) {
  if (inst.lunging || inst.held) return false
  const fish = ctx.school.find(f => {
    const m = ctx.canEat(f) && ctx.middleOf(f)
    const r = m && toMouth(inst, m)
    return r && r.along > 0 && r.along < SNAP_R && Math.abs(r.across) < SNAP_W
  })
  if (!fish) return false
  inst.prey = fish
  inst.mode === MODE.IDLE && setMode(inst, MODE.SWIM)
  chase(inst, ctx)
  return true
}
//
// The chase begins: the fish bolts straight on ahead of it.
//
function chase(inst, ctx) {
  inst.lunging = true
  inst.modeT = 0
  ctx.onChase(inst.prey, inst.facing)
}
function pickPrey(inst, ctx) {
  let best = null
  let bestD = SEE
  const end = inst.facing > 0 ? inst.maxX : inst.minX
  ctx.school.forEach(fish => {
    const p = ctx.canEat(fish) && ctx.headOf(fish)
    if (!p || (p.x - inst.snout.x) * inst.facing <= 0 || (end - p.x) * inst.facing < CHASE_ROOM) return
    const d = Math.hypot(p.x - inst.snout.x, p.y - inst.snout.y)
    if (d >= bestD) return
    best = fish
    bestD = d
  })
  inst.prey = best
}
function endHunt(inst) {
  inst.prey = null
  inst.lunging = false
  inst.restFor = REST + inst.rng() * REST_RANGE
}
//
// Roaming onward: a new spot ahead once near the last, through the wall
// when the lake runs out ahead; now and then it hangs still.
//
function roam(inst) {
  const ahead = (inst.target.x - inst.pos.x) * inst.facing
  if (ahead > ROAM_ARRIVE && inst.want > 0) return
  if (roomAhead(inst) < AHEAD) {
    exit(inst, true)
    return
  }
  if (!inst.locked && inst.rng() < IDLE_CHANCE) {
    setMode(inst, MODE.IDLE)
    inst.idleFor = IDLE_TIME + inst.rng() * IDLE_TIME_RANGE
    return
  }
  pickAhead(inst)
}
function pickAhead(inst) {
  const x = inst.pos.x + inst.facing * Math.min(roomAhead(inst), AHEAD + inst.rng() * AHEAD_RANGE)
  setTarget(inst, x, depthAt(inst, x, inst.rng()), inst.cmdSpeed ?? CRUISE)
}
//
// Lunging: once it has caught up with its prey, half of it in the mouth
// (the fish's middle in the mouth's zone), it seizes it — the jaw snaps
// shut on it.
//
function bite(inst, ctx) {
  const p = inst.prey && ctx.middleOf(inst.prey)
  if (!p) return
  const r = toMouth(inst, p)
  if (r.along > EAT_R || r.along < -EAT_BACK || Math.abs(r.across) > EAT_W) return
  inst.held = inst.prey
  inst.gulpT = 0
  inst.bites = 0
  inst.heldTurn = headTurn(inst)
  ctx.onSeize(inst.held, outWay(inst))
  bleed(inst, BLOOD_BITE)
  endHunt(inst)
}
//
// The middle of its gape: halfway between the gullet on the upper lip and
// the same point of the dropped jaw (turned about the hinge by how open
// the mouth is; the other way when it faces right, mirrored); and so
// between the lips' front ends (the snout and the jaw's tip).
//
function placeGape(inst) {
  SkinMesh.pointAt(inst.mesh, HINGE, inst.hinge)
  const turn = inst.facing * inst.open * JAW_OPEN
  const c = Math.cos(turn)
  const s = Math.sin(turn)
  const dx = inst.gullet.x - inst.hinge.x
  const dy = inst.gullet.y - inst.hinge.y
  inst.gape.x = (inst.gullet.x + inst.hinge.x + dx * c - dy * s) * HALF
  inst.gape.y = (inst.gullet.y + inst.hinge.y + dx * s + dy * c) * HALF
  const sx = inst.snout.x - inst.hinge.x
  const sy = inst.snout.y - inst.hinge.y
  inst.lips.x = (inst.snout.x + inst.hinge.x + sx * c - sy * s) * HALF
  inst.lips.y = (inst.snout.y + inst.hinge.y + sx * s + sy * c) * HALF
}
//
// Where a held fish shows (heldShows): past the mouth's line, from the
// upper lip's front end to the lower one's (all but shut — the ends under
// OPENING_MIN px apart, where their line could lie along the head — the
// line across its way out at the lips).
//
function mouthCut(inst) {
  const up = inst.upper
  const low = inst.lower
  const o = inst.opening
  if (Math.hypot(low[0].x - up[0].x, low[0].y - up[0].y) < OPENING_MIN) {
    const out = outWay(inst)
    o.x = inst.lips.x
    o.y = inst.lips.y
    o.nx = out.x
    o.ny = out.y
  } else {
    lineThrough(o, up[0], low[0], inst.hinge)
    o.nx = -o.nx
    o.ny = -o.ny
  }
  inst.heldShows ??= (x, y) => heldShows(inst, x, y)
  return inst.heldShows
}
//
// A held fish shows out of the mouth and over its edge, back to
// HELD_OVERLAP px behind the mouth's line (it is nearer the eye than the
// giant's lips and lies over them, not cut off right at them); deeper in
// the mouth it is hidden.
//
function heldShows(inst, x, y) {
  return side(inst.opening, x, y) > -HELD_OVERLAP
}
//
// A line through a and b, its normal toward `toward`.
//
function lineThrough(line, a, b, toward) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  line.x = a.x
  line.y = a.y
  line.nx = -dy / len
  line.ny = dx / len
  if (side(line, toward.x, toward.y) >= 0) return
  line.nx = -line.nx
  line.ny = -line.ny
}
function side(line, x, y) {
  return (x - line.x) * line.nx + (y - line.y) * line.ny
}
//
// The way out of the mouth: along the head's line toward the snout,
// tilted down toward the open gap by OUT_TILT of the jaw's drop.
//
function outWay(inst) {
  const fx = inst.snout.x - inst.hinge.x
  const fy = inst.snout.y - inst.hinge.y
  const fl = Math.hypot(fx, fy) || 1
  const a = inst.facing * inst.open * JAW_OPEN * OUT_TILT
  const c = Math.cos(a)
  const s = Math.sin(a)
  inst.out.x = (fx * c - fy * s) / fl
  inst.out.y = (fx * s + fy * c) / fl
  return inst.out
}
//
// A point as seen from its mouth: off the gape's middle (x, y), how far
// along the head's line toward the snout (along) and across it (across).
//
function toMouth(inst, p) {
  const fx = inst.snout.x - inst.hinge.x
  const fy = inst.snout.y - inst.hinge.y
  const fl = Math.hypot(fx, fy) || 1
  const r = inst.rel
  r.x = p.x - inst.gape.x
  r.y = p.y - inst.gape.y
  r.along = (r.x * fx + r.y * fy) / fl
  r.across = (r.y * fx - r.x * fy) / fl
  return r
}
//
// A fish in its jaws: held between the lips' front ends, its front out,
// turned with the head, jerking ever weaker; at each chew's bite blood
// clouds out; after HOLD_OUT of the gulp it is drawn on into the mouth;
// at the end it is swallowed (gone).
//
function gulp(inst, ctx, dt) {
  inst.gulpT += dt
  const share = Math.max(0, Math.min(1, (inst.gulpT / GULP_TIME - HOLD_OUT) / (1 - HOLD_OUT)))
  const wave = Math.sin(inst.gulpT * THRASH_HZ * Math.PI * 2)
  const thrash = THRASH * (1 - share) * Math.sign(wave) * Math.pow(Math.abs(wave), THRASH_SNAP)
  SkinMesh.pointAt(inst.mesh, HINGE, inst.hinge)
  const ix = inst.hinge.x - inst.snout.x
  const iy = inst.hinge.y - inst.snout.y
  const il = Math.hypot(ix, iy) || 1
  inst.inward.x = ix / il
  inst.inward.y = iy / il
  ctx.onHold(inst.held, inst.lips, headTurn(inst) - inst.heldTurn + thrash, inst.inward, share * share * (3 - 2 * share))
  const chew = Math.floor(chewPhase(inst))
  if (chew < CHEWS && chew >= inst.bites && chewPhase(inst) - chew >= CHEW_OPEN_SHARE) {
    inst.bites++
    bleed(inst, BLOOD_CHEW)
  }
  if (inst.gulpT < GULP_TIME || inst.open > 0) return
  bleed(inst, BLOOD_GONE)
  ctx.onEat(inst.held)
  inst.held = null
  inst.meals++
}
//
// How far into its chewing it is (chews, from 0; negative before).
//
function chewPhase(inst) {
  return (inst.gulpT - SNAP_HOLD) / CHEW_PERIOD
}
//
// The head's turn on the screen (rad, the mirrored way when it faces
// right).
//
function headTurn(inst) {
  const t = inst.mesh.pose.turns[0]
  return inst.facing > 0 ? -t : t
}
//
// Blood out of its mouth: a few puffs at the snout, thrown on with it
// (unless the snout just jumped: the giant was put back in).
//
function bleed(inst, count) {
  const steady = Math.hypot(inst.snoutV.x, inst.snoutV.y) < LUNGE * 2
  const vx = steady ? inst.snoutV.x * BLOOD_CARRY : 0
  const vy = steady ? inst.snoutV.y * BLOOD_CARRY : 0
  for (let i = 0; i < count; i++) {
    const a = inst.rng() * Math.PI * 2
    inst.blood.push({
      x: inst.snout.x + Math.cos(a) * BLOOD_SPREAD * inst.rng(),
      y: inst.snout.y + Math.sin(a) * BLOOD_SPREAD * inst.rng(),
      vx: vx + Math.cos(a) * BLOOD_DRIFT * inst.rng(),
      vy: vy + Math.sin(a) * BLOOD_DRIFT * inst.rng(),
      t: 0,
      life: BLOOD_LIFE + inst.rng() * BLOOD_LIFE_RANGE,
      size: BLOOD_S1 + inst.rng() * BLOOD_S1_RANGE,
      variant: Math.floor(inst.rng() * MIST_VARIANTS),
      rot: inst.rng() * Math.PI * 2
    })
  }
}
//
// Blood in the water drifts, slows, sinks a little.
//
function updateBlood(inst, dt) {
  const drag = Math.exp(-BLOOD_DRAG * dt)
  inst.blood.forEach(p => {
    p.t += dt
    p.vx *= drag
    p.vy *= drag
    p.x += p.vx * dt
    p.y += (p.vy + BLOOD_SINK) * dt
  })
  inst.blood = inst.blood.filter(p => p.t < p.life)
}
//
// The jaw: dropping open as it nears its prey (and all through a lunge),
// snapping shut on a fish, then chewing it; half open as it swims along
// the surface.
//
function openJaw(inst, ctx, dt) {
  const p = !inst.held && inst.prey && ctx.headOf(inst.prey)
  const near = p && Math.hypot(p.x - inst.snout.x, p.y - inst.snout.y) < GAPE_R
  const chewing = inst.held && chewPhase(inst) >= 0 && chewPhase(inst) < CHEWS && chewPhase(inst) % 1 < CHEW_OPEN_SHARE
  const want = chewing ? CHEW_OPEN : !inst.held && (inst.lunging || near) ? 1 : surfaceSwim(inst) ? SURFACE_GAPE : 0
  const step = (inst.held ? SHUT_RATE : inst.lunging ? LUNGE_OPEN_RATE : OPEN_RATE) * dt
  inst.open = Math.max(0, Math.min(1, inst.open + Math.max(-step, Math.min(step, want - inst.open))))
}
//
// Swimming along the surface (breathing, or up and on its way to its
// breathing spot): it goes with its mouth open.
//
function surfaceSwim(inst) {
  const up = inst.mode === MODE.BREATHE || (inst.mode === MODE.SURFACE && inst.pos.y <= breatheY(inst, inst.pos.x) + SURFACE_UP)
  return up && inst.speed > SURFACE_GAPE_SPEED
}
//
// Up to breathe: its head heads for the breathing height at x, in an arc.
//
function startSurface(inst, x) {
  inst.surfaceX = x
  inst.prey = null
  inst.lunging = false
  setMode(inst, MODE.SURFACE)
}
//
// Rising until the head is at its breathing height (and swimming on along
// the surface to its spot if it is not there yet, and on till its body
// lies level behind it), then breathing — level, puffing, still — as long
// as it wants; then the dive. Held by a dev command it breathes on.
//
function breathe(inst, ctx, dt) {
  const y = breatheY(inst, inst.pos.x)
  if (inst.mode === MODE.SURFACE) {
    const up = inst.pos.y <= y + SURFACE_UP
    const short = (inst.surfaceX - inst.pos.x) * inst.facing > ROAM_ARRIVE
    const sloped = roomAhead(inst) > ROAM_ARRIVE && !bodyLevel(inst)
    setTarget(inst, inst.surfaceX, y, up ? SURFACE_SPEED : RISE_SPEED)
    if (!up || short || sloped) return
    setMode(inst, MODE.BREATHE)
    inst.breathFor = BREATH_TIME + inst.rng() * BREATH_TIME_RANGE
    inst.puffIn = 0
    return
  }
  setTarget(inst, inst.pos.x + inst.facing * ROAM_ARRIVE, y, 0)
  breath(inst, ctx, dt)
  if (inst.locked) return
  inst.breathFor -= dt
  inst.breathFor <= 0 && startDive(inst)
}
//
// One breath's rhythm: drawing in INHALE_LEAD s before the puff, then the
// puff and its blow.
//
function breath(inst, ctx, dt) {
  inst.puffIn -= dt
  if (!inst.inhaled && inst.puffIn <= INHALE_LEAD) {
    inst.inhaled = true
    ctx.onBreath(false, inst.pos.x)
  }
  if (inst.puffIn > 0) return
  puff(inst)
  inst.inhaled = false
  ctx.onBreath(true, inst.pos.x)
}
//
// Down again, head first: a spot on ahead in the deep water; the head's
// pitch turns down in an arc and the body follows it under.
//
function startDive(inst) {
  setMode(inst, MODE.DIVE)
  inst.breathIn = BREATH_EVERY + inst.rng() * BREATH_EVERY_RANGE
  const x = inst.pos.x + inst.facing * Math.min(roomAhead(inst), DIVE_AHEAD)
  setTarget(inst, x, depthAt(inst, x, DIVE_DEPTH), CRUISE)
}
//
// Through the wall ahead at its depth, until its tail is gone behind it;
// then away — briefly to come back the other way, or until its next visit.
//
function exit(inst, comeBack) {
  inst.side = inst.facing
  inst.returnSide = comeBack ? inst.side : null
  inst.prey = null
  inst.lunging = false
  setMode(inst, MODE.EXIT)
  const x = inst.side < 0 ? inst.span.x1 - G.length * 2 : inst.span.x2 + G.length * 2
  setTarget(inst, x, inst.pos.y, inst.cmdSpeed ?? (comeBack ? CRUISE : LEAVE_SPEED))
}
function exitOn(inst) {
  const tail = inst.joints[inst.joints.length - 1]
  const gone = inst.side < 0 ? tail.x < inst.span.x1 - EXIT_OUT : tail.x > inst.span.x2 + EXIT_OUT
  if (!gone) return
  inst.stay || inst.locked || (inst.returnSide = null)
  const comeBack = inst.returnSide !== null
  setMode(inst, MODE.AWAY)
  inst.visiting = comeBack
  inst.awayFor = comeBack ? BACK_IN + inst.rng() * BACK_IN_RANGE : AWAY + inst.rng() * AWAY_RANGE
}
//
// The head moving: its pitch turned toward its target along an arc (no
// faster than its speed allows), speed eased (its inertia), along its
// heading; breathing, held at its height and the body floated level.
// Held inside the lake's water while in it; the trail laid behind it.
//
function move(inst, dt) {
  const delta = pitchWanted(inst) - inst.pitch
  const rate = Math.max(PITCH_MIN_RATE, inst.speed / ARC_R)
  inst.pitch += Math.sign(delta) * Math.min(Math.abs(delta) * PITCH_EASE, rate) * dt
  const accel = (inst.lunging || inst.held ? LUNGE_ACCEL : ACCEL) * dt
  const want = inst.held ? Math.min(inst.want, EAT_SPEED) : inst.want
  inst.speed += Math.max(-accel, Math.min(accel, want - inst.speed))
  const x0 = inst.pos.x
  const y0 = inst.pos.y
  inst.pos.x += inst.facing * Math.cos(inst.pitch) * inst.speed * dt
  inst.pos.y -= Math.sin(inst.pitch) * inst.speed * dt
  if (inst.mode === MODE.BREATHE) {
    inst.pos.y += (inst.target.y - inst.pos.y) * (1 - Math.exp(-HOLD_RATE * dt))
    levelTrail(inst, dt)
  }
  inWater(inst) && keepInWater(inst, y0) && alongBound(inst, x0, y0)
  layTrail(inst)
}
function inWater(inst) {
  return inst.mode !== MODE.ENTER && inst.mode !== MODE.EXIT
}
function pitchWanted(inst) {
  if (inst.mode === MODE.BREATHE) return 0
  const dx = Math.max(PITCH_DX_MIN, (inst.target.x - inst.pos.x) * inst.facing)
  const toTarget = Math.atan2(inst.pos.y - inst.target.y, dx)
  return Math.max(-MAX_PITCH, Math.min(MAX_PITCH, inWater(inst) ? clearAhead(inst, toTarget) : toTarget))
}
//
// A pitch kept from aiming the head into the bed or, under water, up past
// the submerged line at any of the HEAD_LOOK distances ahead (surfacing,
// its aim at its breathing height already levels it off there).
//
function clearAhead(inst, pitch) {
  const rising = inst.mode === MODE.SURFACE
  let p = pitch
  HEAD_LOOK.forEach(d => {
    const b = headBounds(inst, inst.pos.x + inst.facing * d, rising)
    p = Math.max(p, Math.atan2(inst.pos.y - b.bottom, d))
    rising || (p = Math.min(p, Math.atan2(inst.pos.y - b.top, d)))
  })
  return p
}
//
// A head pushed along a bound swims on its slope: its pitch set to the way
// it really moved this frame.
//
function alongBound(inst, x0, y0) {
  const run = Math.abs(inst.pos.x - x0)
  if (run < TINY) return
  inst.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, Math.atan2(y0 - inst.pos.y, run)))
}
//
// The head's top and bottom in the water at x (rising: up to its breathing
// height).
//
function headBounds(inst, x, rising) {
  const top = rising ? breatheY(inst, x) : CaveLake.surfaceAt(inst.lake, x) + SUB_TOP
  return { top, bottom: Math.max(top, CaveLake.bottomAt(inst.lake, x) - BED_CLEAR) }
}
//
// Whether its body lies level behind its head: its tail's place on the
// trail within LEVEL_TOL px of the head's height.
//
function bodyLevel(inst) {
  trailAt(inst, inst.reach[inst.reach.length - 1], inst.a)
  return Math.abs(inst.a.y - inst.pos.y) < LEVEL_TOL
}
//
// The head held in the water: over the bed, and under the submerged line
// (only kept from rising past it, never pushed down — a head coming down
// from breathing just sinks on); surfacing or breathing it may rise to
// its breathing height. Along the lake only a breathing head is held
// inside its ends (a swimming one reaching an end swims on through the
// wall: held there, it would only move up and down and fold its body
// along that trail).
//
function keepInWater(inst, y0) {
  const p = inst.pos
  inst.mode === MODE.BREATHE && (p.x = Math.max(inst.minX, Math.min(inst.maxX, p.x)))
  const { top, bottom } = headBounds(inst, p.x, inst.mode === MODE.SURFACE || inst.mode === MODE.BREATHE)
  const y = p.y
  p.y < top && p.y < y0 && (p.y = Math.min(y0, top))
  p.y = Math.min(bottom, p.y)
  return p.y !== y && inst.mode !== MODE.BREATHE
}
//
// The head's path: a point every TRAIL_STEP px swum, as long as the body;
// how far the head has swum is kept up to the moment (also between the
// points, so the body follows the head smoothly, not a point at a time).
//
function layTrail(inst) {
  const trail = inst.trail
  const last = trail[trail.length - 1]
  const d = Math.hypot(inst.pos.x - last.x, inst.pos.y - last.y)
  inst.swum = last.s + d
  if (d < TRAIL_STEP) return
  trail.push({ x: inst.pos.x, y: inst.pos.y, s: inst.swum })
  while (trail.length > 2 && trail[1].s < inst.swum - inst.keep) trail.shift()
}
//
// Breathing, the body floats up level with the head: its trail eased to
// the head's height.
//
function levelTrail(inst, dt) {
  const ease = 1 - Math.exp(-LEVEL_RATE * dt)
  inst.trail.forEach(p => { p.y += (inst.pos.y - p.y) * ease })
}
//
// The body along the head's trail: each bone pointing from its joint's
// place on the trail to the next one's, turned by its wave, held within
// its bend limits (the head near level, each joint and the whole body
// bending only so far: a sharp turn of the trail never folds it), then
// the whole floated by the bob.
//
function layBody(inst) {
  const j = inst.joints
  j[0].x = inst.pos.x
  j[0].y = inst.pos.y
  const sign = inst.facing > 0 ? -1 : 1
  const level = inst.facing > 0 ? Math.PI : 0
  let head = level
  let prev = level
  for (let i = 1; i < j.length; i++) {
    trailAt(inst, inst.reach[i - 1], inst.a)
    trailAt(inst, inst.reach[i], inst.b)
    const len = inst.reach[i] - inst.reach[i - 1]
    let angle = Math.atan2(inst.b.y - inst.a.y, inst.b.x - inst.a.x) + sign * inst.anim.waves[i - 1]
    angle = i === 1 ? within(angle, level, HEAD_TILT) : within(within(angle, prev, JOINT_BEND), head, BODY_BEND)
    i === 1 && (head = angle)
    prev = angle
    j[i].x = j[i - 1].x + Math.cos(angle) * len
    j[i].y = j[i - 1].y + Math.sin(angle) * len
  }
  j.forEach(p => { p.y += inst.anim.bob })
}
//
// An angle held within `limit` rad of `about`.
//
function within(angle, about, limit) {
  const d = Math.atan2(Math.sin(angle - about), Math.cos(angle - about))
  return about + Math.max(-limit, Math.min(limit, d))
}
//
// The point on the trail `back` px behind the head (the head itself at 0;
// between the last point and the head, on the way between them).
//
function trailAt(inst, back, out) {
  const trail = inst.trail
  const s = inst.swum - back
  const last = trail[trail.length - 1]
  if (back <= 0 || s >= last.s) {
    const t = back <= 0 ? 1 : (s - last.s) / (inst.swum - last.s || 1)
    out.x = last.x + (inst.pos.x - last.x) * t
    out.y = last.y + (inst.pos.y - last.y) * t
    return out
  }
  for (let i = trail.length - 1; i > 0; i--) {
    const a = trail[i - 1]
    if (s < a.s) continue
    const b = trail[i]
    const t = Math.min(1, (s - a.s) / (b.s - a.s || 1))
    out.x = a.x + (b.x - a.x) * t
    out.y = a.y + (b.y - a.y) * t
    return out
  }
  out.x = trail[0].x
  out.y = trail[0].y
  return out
}
//
// A breath: a few mist puffs from each nostril, rising and spreading.
//
function puff(inst) {
  inst.puffIn = PUFF_EVERY
  NOSTRILS.forEach(n => {
    SkinMesh.pointAt(inst.mesh, n, inst.nostril)
    for (let i = 0; i < PUFF_COUNT; i++) {
      inst.puffs.push({
        x: inst.nostril.x,
        y: inst.nostril.y,
        vx: (inst.rng() * 2 - 1) * PUFF_SPEED,
        vy: -(PUFF_UP + inst.rng() * PUFF_UP_RANGE),
        t: -i * PUFF_GAP,
        life: PUFF_LIFE + inst.rng() * PUFF_LIFE_RANGE,
        size: PUFF_S1 + inst.rng() * PUFF_S1_RANGE,
        variant: Math.floor(inst.rng() * MIST_VARIANTS),
        rot: inst.rng() * Math.PI * 2,
        spin: (inst.rng() * 2 - 1) * PUFF_SPIN,
        sway: inst.rng() * Math.PI * 2
      })
    }
  })
}
//
// The mist rises, slows, sways and turns as it spreads.
//
function updatePuffs(inst, dt) {
  const drag = Math.exp(-PUFF_DRAG * dt)
  inst.puffs.forEach(p => {
    p.t += dt
    if (p.t < 0) return
    p.vx *= drag
    p.vy *= drag
    p.x += (p.vx + Math.sin(p.t * PUFF_SWAY_HZ * Math.PI * 2 + p.sway) * PUFF_SWAY) * dt
    p.y += p.vy * dt
    p.rot += p.spin * dt
  })
  inst.puffs = inst.puffs.filter(p => p.t < p.life)
}
//
// Blood in the water: the mist's clouds in the blood's colour, growing
// and thinning out.
//
function drawBlood(inst) {
  const mist = mistFor.get(inst.k)
  if (!mist) return
  inst.blood.forEach(p => {
    const share = Math.min(1, p.t / p.life)
    const size = BLOOD_S0 + (p.size - BLOOD_S0) * (1 - (1 - share) * (1 - share))
    const fade = Math.min(1, share / BLOOD_IN) * (1 - share)
    inst.k.drawSprite({ sprite: MIST_SPRITE, quad: mist[p.variant], width: size, height: size, pos: inst.v.set(p.x, p.y), anchor: 'center', angle: p.rot * DEG, color: inst.bloodRgb, opacity: BLOOD_ALPHA * fade })
  })
}
//
// A paddle in its socket (the socket skinned with the body), turned with
// its bone and by its stroke.
//
function drawFin(inst, part, fin, stroke) {
  SkinMesh.pointAt(inst.mesh, fin.socket, inst.socket)
  drawPart(inst, part, inst.socket, inst.mesh.pose.turns[fin.bone] + stroke)
}
//
// The body's paddle sockets covered with its skin from over each.
//
function healSockets(body) {
  const ctx = body.getContext('2d')
  FINS.forEach(fin => {
    const { x, y } = fin.socket
    const size = SOCKET_R * 2
    const patch = document.createElement('canvas')
    patch.width = size
    patch.height = size
    const pctx = patch.getContext('2d')
    pctx.drawImage(body, x - SOCKET_R, y - SOCKET_FROM - SOCKET_R, size, size, 0, 0, size, size)
    const g = pctx.createRadialGradient(SOCKET_R, SOCKET_R, SOCKET_R * (1 - SOCKET_SOFT), SOCKET_R, SOCKET_R, SOCKET_R)
    g.addColorStop(0, G.mist)
    g.addColorStop(1, G.mist + TRANSPARENT)
    pctx.globalCompositeOperation = 'destination-in'
    pctx.fillStyle = g
    pctx.fillRect(0, 0, size, size)
    ctx.drawImage(patch, x - SOCKET_R, y - SOCKET_R)
  })
  return body
}
//
// A part drawn apart from the body (a paddle, the jaw): set by its anchor
// at `at`, turned by `turn` (rad, as painted), mirrored with the body.
//
function drawPart(inst, part, at, turn) {
  const mirrored = inst.facing > 0
  const angle = turn * DEG
  inst.k.drawSprite({
    sprite: SPRITE,
    quad: part.quad,
    width: part.w * SCALE,
    height: part.h * SCALE,
    pos: inst.v.set(at.x, at.y),
    anchor: mirrored ? part.anchorMirrored : part.anchor,
    angle: mirrored ? -angle : angle,
    flipX: mirrored
  })
}
//
// The jaw's turn (as painted): the head's, dropped by how open it is.
//
function jawTurn(inst) {
  return inst.mesh.pose.turns[0] - inst.open * JAW_OPEN
}
//
// The lips in the world: the upper one along the mouth line (skinned with
// the body), the lower one the dropped jaw's edge (turned about the hinge
// as the jaw's sprite is).
//
function lipPoints(inst) {
  const turn = jawTurn(inst)
  const c = Math.cos(turn)
  const s = Math.sin(turn)
  const m = inst.facing > 0 ? -1 : 1
  MOUTH.forEach((p, i) => {
    SkinMesh.pointAt(inst.mesh, p, inst.upper[i])
    const dx = (p.x - HINGE.x) * SCALE
    const dy = (p.y - HINGE.y) * SCALE
    inst.lower[i].x = inst.hinge.x + m * (dx * c - dy * s)
    inst.lower[i].y = inst.hinge.y + dx * s + dy * c
  })
}
//
// Teeth along one lip, pointing across the mouth at the other lip, each a
// pale fang over its dark rim.
//
function drawTeeth(inst, from, to) {
  const last = MOUTH.length - 1
  for (let j = 0; j < TEETH; j++) {
    const u = (j + HALF) / TEETH * TEETH_SPAN * last
    const i = Math.floor(u)
    const f = u - i
    const bx = from[i].x + (from[i + 1].x - from[i].x) * f
    const by = from[i].y + (from[i + 1].y - from[i].y) * f
    const gx = to[i].x + (to[i + 1].x - to[i].x) * f - bx
    const gy = to[i].y + (to[i + 1].y - to[i].y) * f - by
    const gap = Math.hypot(gx, gy)
    if (gap < TINY) continue
    const len = Math.min(TOOTH_LEN, gap * TOOTH_GAP)
    drawTooth(inst, bx, by, gx / gap, gy / gap, len + TOOTH_RIM, TOOTH_W * HALF + TOOTH_RIM, inst.toothEdgeRgb)
    drawTooth(inst, bx, by, gx / gap, gy / gap, len, TOOTH_W * HALF, inst.toothRgb)
  }
}
function drawTooth(inst, bx, by, nx, ny, len, half, color) {
  const [a, b, tip] = inst.tooth
  a.x = bx - ny * half
  a.y = by + nx * half
  b.x = bx + ny * half
  b.y = by - nx * half
  tip.x = bx + nx * len
  tip.y = by + ny * len
  inst.k.drawPolygon({ pts: inst.tooth, color })
}
//
// The mouth's pink back: the upper lip from the corner out to GAPE_AT,
// an arc down to the lower lip bowed back toward the corner (a quadratic
// curve through a point pulled from the gap's middle toward the corner),
// the lower lip back in; filled as a fan from the corner.
//
function drawGape(inst) {
  const { upper, lower, gapePts: pts } = inst
  const corner = MOUTH.length - 1
  const a = upper[GAPE_AT]
  const b = lower[GAPE_AT]
  const mx = (a.x + b.x) * HALF
  const my = (a.y + b.y) * HALF
  const hx = (upper[corner].x + lower[corner].x) * HALF - mx
  const hy = (upper[corner].y + lower[corner].y) * HALF - my
  const pull = GAPE_BOW * Math.hypot(a.x - b.x, a.y - b.y) / (Math.hypot(hx, hy) || 1)
  const cx = mx + hx * pull
  const cy = my + hy * pull
  let n = 0
  for (let i = corner - 1; i > GAPE_AT; i--) pts[n++].set(upper[i].x, upper[i].y)
  for (let st = 0; st <= GAPE_STEPS; st++) {
    const t = st / GAPE_STEPS
    const u = 1 - t
    pts[n++].set(u * u * a.x + 2 * u * t * cx + t * t * b.x, u * u * a.y + 2 * u * t * cy + t * t * b.y)
  }
  for (let i = GAPE_AT + 1; i < corner; i++) pts[n++].set(lower[i].x, lower[i].y)
  pts[n].set((upper[corner].x + lower[corner].x) * HALF, (upper[corner].y + lower[corner].y) * HALF)
  inst.k.drawPolygon({ pts, indices: GAPE_INDICES, color: inst.gapeRgb })
}
//
// The atlas: the body (without its lower jaw), the jaw and the paddles
// cut from their sheet, each scaled to TEX_OVER times its drawn size, laid
// in one canvas, grained, loaded once per live k as its own texture; each
// part's quad (and the jaw's and a paddle's anchors at its hinge or root,
// as painted and mirrored).
//
function bake(k) {
  if (partsFor.has(k)) return
  atlas ??= buildAtlas()
  if (!atlas) return
  k.loadSprite(SPRITE, atlas.canvas, { singular: true, filter: 'linear' })
  const parts = { giantBody: atlas.parts.giantBody }
  FINS.forEach(fin => {
    parts[fin.piece] = withAnchor(k, atlas.parts[fin.piece], fin.root)
  })
  parts.giantJaw = withAnchor(k, atlas.parts.giantJaw, { x: HINGE.x - atlas.jawBox.x, y: HINGE.y - atlas.jawBox.y })
  partsFor.set(k, parts)
  bakeMist(k)
}
//
// A part's anchors at a point on it (px), as painted and mirrored.
//
function withAnchor(k, part, at) {
  const ax = at.x / part.w * 2 - 1
  const ay = at.y / part.h * 2 - 1
  return { ...part, anchor: k.vec2(ax, ay), anchorMirrored: k.vec2(-ax, ay) }
}
function buildAtlas() {
  const names = ['giantBody', 'giantJaw'].concat(FINS.map(fin => fin.piece))
  const pieces = ['giantBody'].concat(FINS.map(fin => fin.piece)).map(name => Atlas.piece(name))
  if (pieces.some(src => !src)) return null
  const [body, ...fins] = pieces.map(mirrored)
  const jaw = cutJaw(body)
  const srcs = [healSockets(bodyWithoutJaw(body)), jaw.canvas].concat(fins)
  const sizes = srcs.map(src => ({ w: Math.round(src.width * SCALE * TEX_OVER), h: Math.round(src.height * SCALE * TEX_OVER) }))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(...sizes.map(z => z.w)) + ATLAS_GAP * 2
  canvas.height = sizes.reduce((sum, z) => sum + z.h + ATLAS_GAP, ATLAS_GAP)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  const parts = {}
  let y = ATLAS_GAP
  names.forEach((name, i) => {
    const z = sizes[i]
    ctx.drawImage(srcs[i], ATLAS_GAP, y, z.w, z.h)
    parts[name] = { quad: { x: ATLAS_GAP / canvas.width, y: y / canvas.height, w: z.w / canvas.width, h: z.h / canvas.height }, w: srcs[i].width, h: srcs[i].height }
    y += z.h + ATLAS_GAP
  })
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  return { canvas, parts, jawBox: jaw.box }
}
//
// The lower jaw cut from the body (its outline grown by JAW_EDGE, in a
// box JAW_PAD wider), and its place in the body px.
//
function cutJaw(src) {
  const xs = JAW.map(p => p.x)
  const ys = JAW.map(p => p.y)
  const box = { x: Math.min(...xs) - JAW_PAD, y: Math.min(...ys) - JAW_PAD }
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(...xs) + JAW_PAD - box.x
  canvas.height = Math.max(...ys) + JAW_PAD - box.y
  const ctx = canvas.getContext('2d')
  ctx.translate(-box.x, -box.y)
  jawPath(ctx)
  ctx.lineWidth = JAW_EDGE * 2
  ctx.lineJoin = 'round'
  ctx.fill()
  ctx.stroke()
  ctx.globalCompositeOperation = 'source-in'
  ctx.drawImage(src, 0, 0)
  return { canvas, box }
}
function jawPath(ctx) {
  ctx.beginPath()
  JAW.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
  ctx.closePath()
}
//
// A piece flipped left to right (creature.png faces the other way).
//
function mirrored(src) {
  const canvas = document.createElement('canvas')
  canvas.width = src.width
  canvas.height = src.height
  const ctx = canvas.getContext('2d')
  ctx.scale(-1, 1)
  ctx.drawImage(src, -src.width, 0)
  return canvas
}
//
// The body's cut with the lower jaw (drawn apart) cleared. (Each piece of
// the sheet keeps only its own island — cave-atlas.js isolates them — so
// no paddle reaches into the body's cut nor the belly into a paddle's.)
//
function bodyWithoutJaw(src) {
  const canvas = document.createElement('canvas')
  canvas.width = src.width
  canvas.height = src.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(src, 0, 0)
  ctx.globalCompositeOperation = 'destination-out'
  jawPath(ctx)
  ctx.fill()
  return canvas
}
//
// The mist's wisps: MIST_VARIANTS soft clouds side by side in one canvas
// (blobs of fading white heaped about the middle, a few thin streaks curling
// through them), grained, loaded once per live k; each variant's quad.
//
function bakeMist(k) {
  if (mistFor.has(k)) return
  mistCanvas ??= paintMist()
  k.loadSprite(MIST_SPRITE, mistCanvas, { singular: true, filter: 'linear' })
  mistFor.set(k, Array.from({ length: MIST_VARIANTS }, (_, i) => k.quad(i / MIST_VARIANTS, 0, 1 / MIST_VARIANTS, 1)))
}
function paintMist() {
  const canvas = document.createElement('canvas')
  canvas.width = MIST_PX * MIST_VARIANTS
  canvas.height = MIST_PX
  const ctx = canvas.getContext('2d')
  const rng = createSeededRandom(MIST_SEED)
  for (let v = 0; v < MIST_VARIANTS; v++) {
    const cx = (v + HALF) * MIST_PX
    const cy = MIST_PX * HALF
    for (let b = 0; b < MIST_BLOBS; b++) paintBlob(ctx, rng, cx, cy)
    for (let st = 0; st < MIST_STREAKS; st++) paintStreak(ctx, rng, cx, cy)
  }
  applyForestFilmGrainToCanvas(canvas, MIST_SEED)
  return canvas
}
//
// One soft blob of the cloud: a white disc fading to nothing at its rim,
// nearer the middle the bigger it is (so the cloud stays inside its cell).
//
function paintBlob(ctx, rng, cx, cy) {
  const r = MIST_BLOB_R + rng() * MIST_BLOB_R_RANGE
  const reach = Math.max(0, MIST_PX * HALF - r)
  const spread = Math.min(MIST_SPREAD, reach)
  const a = rng() * Math.PI * 2
  const d = Math.sqrt(rng()) * spread
  const x = cx + Math.cos(a) * d
  const y = cy + Math.sin(a) * d
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(255,255,255,${MIST_BLOB_ALPHA})`)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}
//
// A thin streak curling through the cloud (the breath's swirl).
//
function paintStreak(ctx, rng, cx, cy) {
  const r = MIST_SPREAD * (HALF + rng() * HALF)
  const a = rng() * Math.PI * 2
  const sweep = Math.PI * (HALF + rng())
  ctx.strokeStyle = `rgba(255,255,255,${MIST_STREAK_ALPHA})`
  ctx.lineWidth = MIST_STREAK_W
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx + (rng() - HALF) * MIST_SPREAD, cy + (rng() - HALF) * MIST_SPREAD, r, a, a + sweep)
  ctx.stroke()
}
