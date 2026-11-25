import { getRGB } from '../../../utils/helper.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from '../utils/cave-atlas.js'
import * as Layout from '../utils/cave-layout.js'
import * as CaveLake from '../utils/cave-lake.js'
import * as Surface from '../utils/cave-surface.js'
//
// The lurker: a plant like a snake (plant_left.png) rooted on the lake's
// bed right by the left bank. Out of a rosette of leaves grows a long soft
// neck of scales — a strip drawn along a curve from the rosette to the
// head, bending every way, swaying in the water and stretching as it
// reaches (its scales tiled along it and drawn out a little longer the
// longer it is) — and at its end, in a collar, two jaws hinged on opposite
// sides with an eye on a stalk between them (its pupil drawn here, looking
// at whatever the plant watches).
//
// It lies in wait under the water at the mouth of the hollow under the
// bank, its mouth open, its eye on whoever is nearest. Something on the
// bank coming near its edge (the hero or a runner) and its head comes up
// toward the surface out by the bank's face (round its top corner, never
// behind it), the nearer that one comes to the edge the nearer; one
// on the bank's edge it strikes at: its head bursts out of the water by
// the face (a splash), round the bank's top corner and onto the bank at
// it, jaws wide, snatching it right off the bank. Caught, it is chewed
// slowly, stuck in its jaws (drawn by the level between them): the hero
// dragged down under the water and chewed there, the head thrashing; a
// runner up over the water, the top of its upper jaw then ground the hero
// can jump onto (a moving line along the jaw's own top edge, see
// topLine) — then the plant sinks back (taking anyone still on its head
// down into the water).
// A strike that misses snaps shut on nothing and sinks back. Neither its
// neck nor its head ever goes into the soil or behind the bank: the
// neck's line is evened into arcs (no kinks) and pushed out of the soil
// round the bank's corner, and out of the water it is drawn in front of
// the soil (isOut).
//
const SPRITE = 'cave0-lurker'
const GRAIN_SEED = 9620
const C = CAVE_CFG.lurker
//
// Size: world px per sheet px (plant_left.png); the atlas is baked
// BAKE_OVER times finer, its pieces ATLAS_GAP px apart.
//
const SCALE = 0.12
const BAKE_OVER = 2.5
const ATLAS_GAP = 4
//
// The pieces (Atlas): the jaws' hinges (their rounded back tips) and the
// the upper jaw's top edge the hero stands on (the top of its body —
// the longest opaque run down each column, not its spines — every
// STAND_STEP px from STAND_FROM to STAND_TO); the eye's
// ball (middle, radius) and its stalk's foot; the collar (the neck piece's
// top COLLAR_H rows) by its ring's middle, the neck's end NECK_INTO px
// behind it (well under the collar: no joint shows); the neck's scales: BAND columns of the neck piece, BAND_FROM
// down, BAND_LEN rows (whole rows of scales, so they tile), blended over
// BAND_BLEND rows into the rows over it so the tiles meet without a seam;
// the rosette by its foot (the middle of its bottom) and where the neck
// leaves it (deep inside the stub it was cut off at: the stub's cut never
// shows); a leaf of the rosette by its foot (where it was cut off), drawn
// LEAF.size times the plant's scale.
//
// Leaves grow out of the neck all along it (LEAF_COUNT of them, from
// LEAF_FROM to LEAF_TO of its length, to either side by turns, at
// LEAF_TILT rad off the neck's way, the cut foot behind the neck; smaller
// up it, down to LEAF_TIP_SIZE of the lowest one's size by the head): as
// the neck stretches they move apart up it and together again as it
// shortens; they flutter LEAF_FLUTTER rad with the neck's sway. The ones
// out of the water are drawn with the neck over it.
//
const JAW_TOP = { piece: 'lurkerJawTop', hinge: { x: 528, y: 240 } }
const JAW_LOW = { piece: 'lurkerJawLow', hinge: { x: 528, y: 14 } }
const LEAF_COUNT = 12
const LEAF_FROM = 0.05
const LEAF_TO = 0.86
const LEAF_TIP_SIZE = 0.55
const NECK_LEAVES = Array.from({ length: LEAF_COUNT }, (_, i) => {
  const u = i / (LEAF_COUNT - 1)
  return { at: LEAF_FROM + (LEAF_TO - LEAF_FROM) * u, side: i % 2 ? -1 : 1, size: 1 - (1 - LEAF_TIP_SIZE) * u }
})
const LEAF_TILT = 0.75
const LEAF_FLUTTER = 0.12
const STAND_FROM = 30
const STAND_TO = 510
const STAND_STEP = 6
const SOLID_ALPHA = 128
const RGBA = 4
const ALPHA_OFFSET = 3
//
// The jaw's top is ground while it chews a runner over the water, and for
// SINK_CARRY s more as it starts sinking (straight down: it takes the hero
// standing on it down into the water).
//
const SINK_CARRY = 0.6
//
// The ground on its head runs on NECK_WALK px down the top of its neck
// (NECK_EDGE of the neck's half width out from its line).
//
const NECK_WALK = 45
const NECK_EDGE = 0.8
const EYE = { piece: 'lurkerEye', ball: { x: 58, y: 60 }, r: 54, foot: { x: 61, y: 335 } }
const NECK_PIECE = 'lurkerNeck'
const COLLAR_H = 100
const COLLAR_RING = { x: 78, y: 40 }
const NECK_INTO = 40
const BAND = { x: 16, w: 122 }
const BAND_FROM = 260
const BAND_LEN = 376
const BAND_BLEND = 40
const LEAF = { piece: 'lurkerLeaf', foot: { x: 14, y: 118 }, size: 1.7 }
const ROSETTE = { piece: 'lurkerBase', foot: { x: 359, y: 542 }, neck: { x: 386, y: 64 } }
//
// Its jaws (rad, each turned this far from the painted pose): shut, wide
// open striking, chewing slowly (from shut up to CHEW_OPEN more, CHEW_HZ
// times a second — the hero very slowly, HERO_CHEW_HZ; on what it holds
// HOLD_OPEN more from the start: it is stuck between them, GRIP sheet px
// out along them from the hinge, shaken HOLD_SHAKE rad as it chews; a
// runner it chews with smaller bites, RUNNER_OPEN open and RUNNER_CHEW
// more, the runner shrinking to nothing and sinking RUNNER_SINK px down
// into the lower jaw on the way, drawn behind the jaws); they
// open at OPEN_RATE and snap shut at SHUT_RATE per s. The
// eye's stalk sways EYE_SWAY rad at EYE_SWAY_HZ; its pupil (PUPIL_R of the
// ball's radius) sits up to PUPIL_SHIFT of it off the middle toward what
// it looks at.
//
const SHUT = -0.19
const WIDE = 0.55
const CHEW_OPEN = 0.16
const CHEW_HZ = 0.7
const HERO_CHEW_HZ = 0.55
const HOLD_OPEN = 0.16
const RUNNER_OPEN = -0.03
const RUNNER_CHEW = 0.05
const RUNNER_SINK = 12
const HOLD_SHAKE = 0.12
const GRIP = 260
const OPEN_RATE = 6
const SHUT_RATE = 14
const EYE_SWAY = 0.15
const EYE_SWAY_HZ = 0.4
const PUPIL_R = 0.42
const PUPIL_SHIFT = 0.4
//
// Where it waits and strikes (world px, off Layout's bank): its rosette's
// foot BASE_DX px right of the bank's tip on the bed, BASE_SINK px into
// it (its neck comes to the head from the right, never doubling back);
// its head at rest down on the bed, right over the rosette on as short a
// neck as it has (REST_NECK px of it showing), facing up at the bank's
// edge (REST_DIR), its mouth REST_OPEN open, its eye on the bank's edge
// (or on the prey coming near it);
// watching, just under the surface out by the bank's face, clear of its
// top corner (WATCH, off the tip and the surface) facing WATCH_DIR; the neck
// bends round the bank's top corner through VIA (off the tip and the
// surface) while the head is over the bank; chewing, the head held at
// CHEW_AT off the tip and the surface, facing left.
//
const BASE_DX = 200
const BASE_SINK = 4
const REST_NECK = 14
const REST_DIR = { x: -0.55, y: -0.83 }
const REST_OPEN = 0.45
const BANK_LOOK_UP = 40
//
// With no prey on the bank it watches the fish swimming nearest it under
// the water within FISH_R px of its resting head: its eye on it; its head
// too only for a fish up over it (FISH_ABOVE px or more over its head)
// and no nearer than FISH_NEAR px — then turned at it, leaning FISH_LEAN
// px toward it. One close by it follows only with its pupil.
//
const FISH_R = 260
const FISH_NEAR = 90
const FISH_ABOVE = 40
const FISH_LEAN = 22
//
// Resting or watching, its head turns only within the upper sector: its
// way never lower than UP_MOST_Y (a fish swimming round it below would
// spin it about).
//
const UP_MOST_Y = -0.25
const WATCH = { dx: 40, dy: 18 }
const WATCH_DIR = { x: -0.35, y: -0.94 }
const VIA = { dx: 18, dy: -62 }
const CHEW_AT = { dx: 150, dy: -60 }
const CHEW_DIR = { x: -1, y: 0.05 }
//
// The hero it drags down under the water (back round the bank's corner
// first, at DRAG_SPEED px/s) to DRAG_AT (off the tip and the surface),
// chewing him there, its head (not its neck: it swings about the collar,
// the neck held still) thrashing hard every way — turned up to SHAKE_TURN
// rad on two waves (SHAKE_HZ and SHAKE_HZ2, out of step), so it never
// shakes the same way twice running.
//
//
// The hero landing on its head (held over the water, chewing a runner)
// bends it down: a kick of SAG_KICK px/s down, a spring (SAG_K, damped
// SAG_DAMP) back toward SAG_HOLD px under its spot while he stands on it
// (else none); its nose dips SAG_TILT rad per px of that.
//
const SAG_KICK = 110
const SAG_K = 120
const SAG_DAMP = 10
const SAG_HOLD = 3
const SAG_TILT = 0.015
//
// The giant swimming close by (any of its body within GIANT_NEAR px of its
// resting head; one passing farther off it does not mind): it
// hides down on the bed — out of a strike or a watch at once (a runner it
// chews swallowed), its neck drawn back at SINK_SPEED — and hunts nothing,
// its eye on the giant's head; it stays hidden HIDE_HOLD s after the giant
// is gone from over it (so it never bobs up and down as the giant passes
// the edge of that).
//
const GIANT_NEAR = 150
const HIDE_HOLD = 3
//
// Pouncing on a runner (and chewing it till its head is PLANTS_CLEAR px out
// past the bank's tip) its head is among the bank's plants: drawn behind
// them, as the runner is (amongPlants).
//
const PLANTS_CLEAR = 40
const DRAG_AT = { dx: 70, dy: 70 }
const DRAG_SPEED = 300
const SHAKE_TURN = 0.75
const SHAKE_HZ = 2.4
const SHAKE_HZ2 = 1.5
//
// Prey: the hero or a runner on the bank, from WATCH_REACH px short of the
// lip's tip out to EDGE_PAST px past it, at most ABOVE px over the
// surface: the nearer the tip the higher it rises (eased); within
// STRIKE_REACH of the tip it strikes, always (resting, watching or still
// sinking back). A strike: out of the hollow to the watching spot by the
// bank's face, then straight up past the bank's top corner, head up, to
// VIA at OUT_SPEED px/s (OUT_DONE px off it is out) — never behind the
// bank —, then at the prey at LUNGE_SPEED (a runner it pounces on from
// over it, see pounce: its neck arching over like a question mark); it bites within BITE_R px,
// misses after STRIKE_TIME s or once the prey is out of the bank's reach.
// The hero fallen into the lake within WATER_HUNT px out from the bank's
// edge (off the pad plant, off its head) it goes for under the water, at
// LUNGE_SPEED, as he sinks. Chewing lasts CHEW_TIME s (the hero
// CHEW_TIME_HERO from the bite, his drag under included); sinking back it
// goes at SINK_SPEED (first SINK_DOWN px under the surface) and is home
// within HOME_R px.
// Watching, the head eases to its spot at WATCH_RATE per s (at most
// WATCH_SPEED px/s); it turns at TURN_RATE per s. Under the water (drawn
// behind the soil) neither its head nor its jaws go into the soil: its
// jaws (read at JAW_READ px out along its way, JAW_SIDES px either side
// across it) turn the least way off it
// (CLEAR_TURNS rad, tried in order), its head is pushed out of soil within
// SOIL_R px — so it never hides behind a bank, it goes round it.
//
const WATCH_REACH = 260
//
// It watches from up under the surface at most WATCH_MAX s on end (prey
// that stays short of its reach would hold it there): then it goes back
// down and waits WATCH_REST s (still striking at prey coming into reach).
//
const WATCH_MAX = 4
const WATCH_REST = 6
const WATER_HUNT = 480
const POUNCE_UP = 100
const ARC_BEND = { dx: 70, dy: -60 }
const RISE_TIME = 0.45
const HOVER_TIME = 0.3
const DART_SPEED = 1000
//
// The dart always gets the runner: one it has not reached DART_MAX s into
// the dart (it ran off along the bank, out of the neck's reach) it seizes
// all the same.
//
const DART_MAX = 0.6
//
// The dart stops with its open jaws on the ground under the runner, none
// of them in it: the head as low as it may go with every point of the
// jaws' outline (their top and bottom edges, every EDGE_STEP'th column of
// their pieces) over the soil under that point (found within GROUND_LOOK
// px over the runner and GROUND_REACH under it, every GROUND_STEP px) —
// and they snap shut there.
//
const EDGE_STEP = 12
const GROUND_LOOK = 20
const GROUND_REACH = 80
const GROUND_STEP = 2
//
// Over a runner, its jaws turned down at it (from CREST_FROM to CREST_TO of
// straight down, eased in at CREST_RATE per s), its neck hooks over like a
// question mark: up out of the back of its jaws, over in an arc to the
// right through its crest (CREST.dx px right of and CREST.dy px over the
// collar) and down into the water — evened then only CREST_PASSES times
// (the full evening would straighten the hook).
//
const CREST = { dx: 24, dy: 44 }
const CREST_FROM = -0.2
const CREST_TO = 0.6
const CREST_RATE = 5
const CREST_PASSES = 4
const LEFT = { x: -1, y: 0 }
const EDGE_PAST = 30
const ABOVE = 160
const STRIKE_REACH = 75
const OUT_SPEED = 420
const OUT_DONE = 10
const LUNGE_SPEED = 560
const BITE_R = 14
const STRIKE_TIME = 2.4
const CHEW_TIME = 14
const CHEW_TIME_HERO = 1.6
const CHEW_SPEED = 220
const SINK_SPEED = 160
const SINK_DOWN = 40
//
// A sink that has not brought the head home within SINK_MAX_TIME s (held
// off it by the soil) ends anyway: it rests, its head easing home.
//
const SINK_MAX_TIME = 3
const HOME_R = 6
const WATCH_RATE = 3
const WATCH_SPEED = 90
const TURN_RATE = 8
const JAW_READ = [12, 30, 48]
const JAW_SIDES = [-12, 0, 12]
const CLEAR_TURNS = [0.2, -0.2, 0.4, -0.4, 0.6, -0.6, 0.9, -0.9, 1.2, -1.2, 1.6, -1.6]
//
// The neck: a curve from where it leaves the rosette (straight up there)
// to the collar (along the head's way), its ends' pull CURVE_PULL of their
// distance (CURVE_MIN..CURVE_MAX px); sampled every STEP px. It sways
// across its length — a wave SWAY_LEN px long running up it at SWAY_HZ,
// SWAY px wide at its middle (less on a neck shorter than SWAY_FULL_LEN:
// a short one would kink), none at its ends (per state) — and its
// scales are drawn out by STRETCH_SHARE of how much longer than REST_LEN
// it is (up to STRETCH_MAX times). Its head never strays more than REACH
// px from where it leaves the rosette. Its line is evened SMOOTH_PASSES
// times (each point SMOOTH_PULL of the way to its neighbours' middle, the
// first and the last END_KEEP points kept so it leaves the rosette
// straight up and meets the collar along the head), and every point with
// soil within SOIL_R px is pushed SOIL_PUSH px away from it each pass (but
// the SOIL_FREE points at either end, which follow the root and the head).
// Its bend is drawn round the bank's corner (to VIA) by a share eased in
// over VIA_BLEND px, never all at once. The head never turns more than
// HEAD_BEND_MAX rad off the way the neck comes up to it (read over its
// last HEAD_BEND_READ points), so the neck never hooks round under it.
// It never jumps to a new shape: its line, NECK_N points from root to
// collar, eases toward the new one at NECK_EASE per s (and is evened
// again).
//
const CURVE_PULL = 0.45
const CURVE_MIN = 16
const CURVE_MAX = 110
const CURVE_SAMPLES = 24
const STEP = 5
const SWAY_LEN = 90
const SWAY_FULL_LEN = 120
const SWAY_HZ = 0.35
const SWAY = { rest: 5, watch: 3, strike: 0.5, chew: 2, sink: 3 }
const REST_LEN = 120
const STRETCH_SHARE = 0.3
const STRETCH_MAX = 1.4
const SMOOTH_PASSES = 24
const NECK_N = 60
const NECK_EASE = 9
const SMOOTH_PULL = 0.5
const END_KEEP = 2
const SOIL_R = 10
const SOIL_FREE = 6
const HEAD_BEND_MAX = 0.9
const HEAD_BEND_READ = 8
const VIA_BLEND = 30
const UP = { x: 0, y: -1 }
const SOIL_PUSH = 2
const SOIL_DIRS = Array.from({ length: 8 }, (_, i) => ({ x: Math.cos(i * Math.PI / 4), y: Math.sin(i * Math.PI / 4) }))
const REACH = 480
//
// Splash where the head breaks the surface (as the fish's): rings growing
// from RING_R0 to RING_R1 over RING_TIME, RING_FLAT as high as wide; drops
// thrown up DROP_SPEED..+RANGE px/s, DROP_SPREAD wide, falling under
// DROP_GRAVITY. Going out is a big one, coming back in a smaller one. A
// head within NEAR_SURFACE px under the surface (or out) is feared by what
// lives on it.
//
const RING_R0 = 4
const RING_R1 = 30
const RING_TIME = 1
const RING_FLAT = 0.28
const RING_ALPHA = 0.6
const DROPS_OUT = 12
const DROPS_IN = 7
const DROP_SPEED = 110
const DROP_SPEED_RANGE = 120
const DROP_SPREAD = 0.9
const DROP_GRAVITY = 700
const DROP_R = 1.4
const DROP_ALPHA = 0.85
const LINE_W = 1
const SPLASH_OUT = 1
const SPLASH_IN = 0.7
const NEAR_SURFACE = 30
//
// Chewing a runner over the water, drops fall from its mouth, each from
// somewhere else along the lower jaw's underside (its body's bottom edge,
// read down every STAND_STEP'th column from DRIP_COL_FROM to DRIP_COL_TO
// of its piece) every DRIP_EVERY..+RANGE s, DRIP_R px round. Each first
// hangs from the jaw, drawn out over DRIP_HANG s to DRIP_HANG_LEN px long
// (thin, DRIP_THIN as wide at first), then lets go and falls, a drop
// drawn out by its speed (DRIP_FALL_STRETCH per px/s, at most
// DRIP_FALL_MAX times as long as round); where it meets the water a
// DRIP_RING-strong ring and a soft plop (ctx.onDrip).
//
const DRIP_EVERY = 0.35
const DRIP_EVERY_RANGE = 0.6
const DRIP_COL_FROM = 90
const DRIP_COL_TO = 470
const DRIP_R = 1.3
const DRIP_HANG = 0.5
const DRIP_HANG_LEN = 5
const DRIP_THIN = 0.55
const DRIP_FALL_STRETCH = 0.004
const DRIP_FALL_MAX = 1.8
const DRIP_RING = 0.25
const OVER_PAD = 3
const STATE = { REST: 'rest', WATCH: 'watch', STRIKE: 'strike', CHEW: 'chew', SINK: 'sink' }
const PREY = { HERO: 'hero', RUNNER: 'runner' }
const HALF = 0.5
const DEG = 180 / Math.PI
const FULL_TURN = Math.PI * 2
const TINY = 1e-6
const BYTE_MAX = 255
const HEX_RADIX = 16
const atlasFor = new WeakMap()
let atlas = null
let jawTop = null
let jawUnder = null
let jawEdges = null

/**
 * Creates the lurker by the lake's left bank.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.lake - Lake instance (cave-lake.js)
 * @returns {Object} Lurker instance
 */
export function create(cfg) {
  const { k, lake } = cfg
  bake(k)
  const tip = Layout.BANK_TIP_X
  const surface = Layout.LAKE_SURFACE_Y
  const baseX = tip + BASE_DX
  const base = { x: baseX, y: CaveLake.bedTopAt(lake, baseX) + BASE_SINK }
  const root = { x: base.x + (ROSETTE.neck.x - ROSETTE.foot.x) * SCALE, y: base.y + (ROSETTE.neck.y - ROSETTE.foot.y) * SCALE }
  const restReach = REST_NECK + NECK_INTO * SCALE
  const rest = { x: root.x + REST_DIR.x * restReach, y: root.y + REST_DIR.y * restReach }
  const inst = {
    k,
    lake,
    base,
    root,
    rest,
    bankEdge: { x: tip, y: CaveLake.surfaceAt(lake, tip) - BANK_LOOK_UP },
    gripAt: null,
    watch: { x: tip + WATCH.dx, y: surface + WATCH.dy },
    via: { x: tip + VIA.dx, y: surface + VIA.dy },
    chewAt: { x: tip + CHEW_AT.dx, y: surface + CHEW_AT.dy },
    dragAt: { x: tip + DRAG_AT.dx, y: surface + DRAG_AT.dy },
    head: { x: rest.x, y: rest.y },
    dir: { x: REST_DIR.x, y: REST_DIR.y },
    state: STATE.REST,
    stateT: 0,
    out: false,
    pounceFrom: null,
    prey: null,
    look: null,
    jaw: SHUT,
    sway: 0,
    swayAmp: SWAY.rest,
    wasUnder: true,
    rings: [],
    drops: [],
    drips: [],
    dripIn: 0,
    top: [],
    topSpan: null,
    topLine: null,
    curve: [],
    crestCurve: [],
    crest: 0,
    sag: 0,
    sagV: 0,
    watchT: 0,
    calmFor: 0,
    hideFor: 0,
    giantHead: null,
    ridden: false,
    leafAt: { x: 0, y: 0 },
    neck: [],
    spine: [],
    color: getRGB(k, C.tint),
    pupilRgb: getRGB(k, C.pupil),
    splashRgb: getRGB(k, C.splash),
    v: k.vec2(0, 0),
    pool: [],
    uvPool: []
  }
  inst.topLine = { moving: true, id: 'lurkerJaws', span: () => inst.topSpan, at: x => topAt(inst, x) }
  layNeck(inst, Infinity)
  return inst
}

/**
 * Runs it on: watching the bank, striking, chewing, sinking back; its
 * neck along its head; its splashes; its head as ground while it is out.
 * @param {Object} inst - Lurker instance
 * @param {Object} ctx
 * @param {{x: number, y: number}|null} ctx.hero - The hero's centre (null: none to hunt)
 * @param {{x: number, y: number}|null} ctx.sinking - The hero sinking in the lake (null: none)
 * @param {Array<Object>} ctx.runners - The runners (cave-runner.js)
 * @param {(runner: Object) => boolean} ctx.runnerAbout - Whether a runner is about
 * @param {(prey: {kind: string, runner?: Object}) => void} ctx.onSeize - It caught something
 * @param {(prey: {kind: string, runner?: Object}, at: {x: number, y: number}) => void} ctx.onSwallow - It has eaten it
 * @param {(x: number, strength: number) => void} ctx.onSplash - Its head broke the surface
 * @param {(x: number) => void} ctx.onDrip - A drop from its mouth fell into the water
 * @param {Array<Object>} ctx.school - The lake's fish
 * @param {(fish: Object) => {x: number, y: number}|null} ctx.fishHead - A fish's head while it swims in the water
 * @param {{pts: Array<{x: number, y: number}>}|null} ctx.giant - The giant's body in the lake (its spine, head first), else null
 */
export function onUpdate(inst, ctx) {
  const dt = inst.k.dt()
  if (dt <= 0) return
  inst.stateT += dt
  inst.sway += SWAY_HZ * FULL_TURN * dt
  updateSplash(inst, dt)
  updateDrips(inst, ctx, dt)
  updateSag(inst, dt)
  const near = nearestPrey(inst, ctx)
  decide(inst, ctx, near, dt)
  inst.swayAmp += (SWAY[inst.state] - inst.swayAmp) * Math.min(1, dt * 2)
  keepOutOfSoil(inst, dt)
  ;(inst.state === STATE.REST || inst.state === STATE.WATCH) && keepUp(inst.dir)
  limitHeadBend(inst)
  crossSurface(inst, ctx)
  updateCrest(inst, dt)
  layNeck(inst, dt)
  placeTop(inst)
}

/**
 * The top of its upper jaw as a moving line to stand on (Ground's: there
 * only while it chews a runner over the water, and as it starts sinking).
 * @param {Object} inst - Lurker instance
 * @returns {Object} Ground moving line
 */
export function topLine(inst) {
  return inst.topLine
}

/**
 * Whether the hero stands on its head now (he bends it down as he lands).
 * @param {Object} inst - Lurker instance
 * @param {boolean} riding - He stands on it
 */
export function bear(inst, riding) {
  riding && !inst.ridden && (inst.sagV += SAG_KICK)
  inst.ridden = riding
}

/**
 * Whether its head is among the bank's plants (pouncing on a runner there,
 * or chewing it still over the bank): it is drawn behind them then.
 * @param {Object} inst - Lurker instance
 * @returns {boolean}
 */
export function amongPlants(inst) {
  if (inst.prey?.kind !== PREY.RUNNER) return false
  return inst.state === STATE.STRIKE || (inst.state === STATE.CHEW && inst.head.x < Layout.BANK_TIP_X + PLANTS_CLEAR)
}

/**
 * Whether its head is out of the water (it is drawn in front of the
 * banks' soil then: it never goes behind a bank).
 * @param {Object} inst - Lurker instance
 * @returns {boolean}
 */
export function isOut(inst) {
  return inst.head.y < Layout.LAKE_SURFACE_Y
}

/**
 * Its head while it is near the surface or out of the water (for what
 * lives on the surface to fear), else null.
 * @param {Object} inst - Lurker instance
 * @returns {{x: number, y: number}|null}
 */
export function surfacePoint(inst) {
  return inst.head.y < Layout.LAKE_SURFACE_Y + NEAR_SURFACE ? inst.head : null
}

/**
 * Draws its rosette on the bed (always behind the soil: its foot is sunk
 * in the bed).
 * @param {Object} inst - Lurker instance
 * @param {{left: number, right: number, top: number, bottom: number}} view - World rect in view
 */
export function onDrawRosette(inst, view) {
  const parts = atlasFor.get(inst.k)
  parts && inView(inst, view) && drawPart(inst, parts.rosette, inst.base, 0, false)
}

/**
 * Draws the plant over its rosette: its neck, the collar, the jaws with the
 * eye — or what it has caught — between them. Under the water's
 * see-through paint all of the neck and, while its head is under the water,
 * the head (`over` false); over the water (`over` true, once its head is
 * out) the head and only the neck from where it comes OVER_PAD px out of
 * the water (the water's line stays in front of the neck).
 * @param {Object} inst - Lurker instance
 * @param {{left: number, right: number, top: number, bottom: number}} view - World rect in view
 * @param {(prey: {kind: string, runner?: Object}, at: {x: number, y: number}, angle: number, size: number) => void} drawHeld - Draws what is stuck in its jaws (its middle, its turn in degrees, its size: a runner shrinks to nothing as it is chewed)
 * @param {boolean} [over=false] - The part over the water
 */
export function onDraw(inst, view, drawHeld, over = false) {
  const parts = atlasFor.get(inst.k)
  if (!parts || !inView(inst, view)) return
  const from = over ? outOfWater(inst) : 0
  drawLeaves(inst, parts, from)
  drawNeck(inst, parts, from)
  ;(over || !isOut(inst)) && drawHead(inst, parts, drawHeld)
}
//
// The first point of the neck from which on it is all out of the water
// (OVER_PAD px over the surface).
//
function outOfWater(inst) {
  const spine = inst.spine
  for (let i = spine.length - 1; i >= 0; i--) {
    if (spine[i].y > CaveLake.surfaceAt(inst.lake, spine[i].x) - OVER_PAD) return i + 1
  }
  return 0
}
function inView(inst, view) {
  return inst.base.x > view.left - REACH && inst.base.x < view.right + REACH && inst.base.y > view.top - REACH * 2 && inst.base.y - REACH < view.bottom
}

/**
 * Draws its splashes over the water: the rings and the drops.
 * @param {Object} inst - Lurker instance
 */
export function onDrawSplash(inst) {
  const k = inst.k
  inst.rings.forEach(ring => {
    const share = ring.t / RING_TIME
    const r = (RING_R0 + (RING_R1 - RING_R0) * share) * ring.strength
    k.drawEllipse({ pos: inst.v.set(ring.x, CaveLake.surfaceAt(inst.lake, ring.x)), radiusX: r, radiusY: r * RING_FLAT, fill: false, outline: { width: LINE_W, color: inst.splashRgb }, opacity: RING_ALPHA * (1 - share) })
  })
  inst.drops.forEach(drop => k.drawCircle({ pos: inst.v.set(drop.x, drop.y), radius: DROP_R, color: inst.splashRgb, opacity: DROP_ALPHA }))
  inst.drips.forEach(d => drawDrip(inst, d))
}
//
// A drop from its mouth: hanging from the jaw, drawn out (its top on the
// jaw), or falling, drawn out by its speed.
//
function drawDrip(inst, d) {
  const hang = d.hang ? Math.min(1, d.t / DRIP_HANG) : 1
  const rx = DRIP_R * (d.hang ? DRIP_THIN + (1 - DRIP_THIN) * hang : 1)
  const ry = d.hang ? DRIP_R + d.len * HALF : DRIP_R * Math.min(DRIP_FALL_MAX, 1 + d.vy * DRIP_FALL_STRETCH)
  const y = d.hang ? d.y + d.len * HALF : d.y
  inst.k.drawEllipse({ pos: inst.v.set(d.x, y), radiusX: rx, radiusY: ry, color: inst.splashRgb, opacity: DROP_ALPHA })
}
//
// The state machine: resting (or watching the bank's edge), striking,
// chewing, sinking back. The hero on the bank's edge comes before a runner
// it strikes at (it leaves that one for him); while it chews a runner it
// hunts nothing on the bank (its head is then a step over the water for
// him) — but the hero fallen into the water near it it goes for at once,
// swallowing the runner.
//
function decide(inst, ctx, near, dt) {
  const hero = near?.kind === PREY.HERO && near.strike ? near : null
  if (inst.state === STATE.STRIKE) {
    hero && (inst.prey = hero)
    strike(inst, ctx, dt)
    return
  }
  const sinking = sinkingHero(ctx)
  const giant = giantOver(inst, ctx, dt)
  if (giant && hide(inst, ctx)) return
  if (inst.state === STATE.CHEW && sinking && !holdsHero(inst) && !giant) {
    ctx.onSwallow(inst.prey, eyeAt(inst))
    startStrike(inst, sinking)
    return
  }
  if (inst.state === STATE.CHEW) {
    chew(inst, ctx, dt)
    return
  }
  if (giant) {
    inst.state === STATE.SINK ? sink(inst, dt) : watchGiant(inst, giant, dt)
    return
  }
  if (near?.strike) {
    startStrike(inst, near)
    return
  }
  if (sinking) {
    startStrike(inst, sinking)
    return
  }
  if (inst.state === STATE.SINK) {
    sink(inst, dt)
    return
  }
  inst.calmFor = Math.max(0, inst.calmFor - dt)
  const share = near && inst.calmFor <= 0 ? near.share : 0
  inst.watchT = share > 0 ? inst.watchT + dt : 0
  inst.watchT > WATCH_MAX && (inst.calmFor = WATCH_REST)
  const fish = near ? null : fishNear(inst, ctx)
  inst.look = near ?? fish ?? inst.bankEdge
  inst.state = share > 0 ? STATE.WATCH : STATE.REST
  const turn = fish && Math.hypot(fish.x - inst.rest.x, fish.y - inst.rest.y) > FISH_NEAR && fish.y < inst.rest.y - FISH_ABOVE
  turn ? watchFish(inst, fish, dt) : ease(inst, lerpPoint(inst.rest, inst.watch, share), lerpDir(REST_DIR, WATCH_DIR, share), dt)
  inst.jaw += (SHUT + REST_OPEN - inst.jaw) * Math.min(1, OPEN_RATE * dt)
}
//
// The giant's head (as last seen near it) while any of its body swims
// within GIANT_NEAR px of its resting head, and HIDE_HOLD s after; else
// null.
//
function giantOver(inst, ctx, dt) {
  const pts = ctx.giant?.pts
  const over = Boolean(pts?.length) && pts.some(p => Math.hypot(p.x - inst.rest.x, p.y - inst.rest.y) < GIANT_NEAR)
  over && (inst.giantHead = pts[0])
  inst.hideFor = over ? HIDE_HOLD : Math.max(0, inst.hideFor - dt)
  return inst.hideFor > 0 ? inst.giantHead : null
}
//
// Watching the giant swim over it: resting, its head turned up at the
// giant's, its eye on it.
//
function watchGiant(inst, giant, dt) {
  inst.state = STATE.REST
  inst.look = giant
  moveTo(inst, inst.rest, SINK_SPEED, dt)
  turnTo(inst, REST_DIR.x, REST_DIR.y, dt)
  inst.jaw += (SHUT + REST_OPEN - inst.jaw) * Math.min(1, OPEN_RATE * dt)
}
//
// The giant over it: out of a strike (or a runner's chewing: swallowed) it
// sinks back down at once (true: done for this frame). The hero it chews it
// keeps on with, down under the water.
//
function hide(inst, ctx) {
  if (inst.state === STATE.STRIKE) {
    startSink(inst)
    return true
  }
  if (inst.state !== STATE.CHEW || holdsHero(inst)) return false
  ctx.onSwallow(inst.prey, eyeAt(inst))
  startSink(inst)
  return true
}
//
// A way turned up into the upper sector if it points lower (its side
// kept).
//
function keepUp(dir) {
  if (dir.y <= UP_MOST_Y) return
  dir.y = UP_MOST_Y
  dir.x = (Math.sign(dir.x) || -1) * Math.sqrt(1 - UP_MOST_Y * UP_MOST_Y)
}
//
// The fish swimming nearest its resting head within FISH_R px, or null.
//
function fishNear(inst, ctx) {
  let best = null
  let bestD = FISH_R
  ctx.school.forEach(fish => {
    const head = ctx.fishHead(fish)
    if (!head || head.y < Layout.LAKE_SURFACE_Y) return
    const d = Math.hypot(head.x - inst.rest.x, head.y - inst.rest.y)
    if (d >= bestD) return
    bestD = d
    best = head
  })
  return best
}
//
// Watching a fish: the head leaning a little toward it off its rest, turned
// at it.
//
function watchFish(inst, fish, dt) {
  const dx = fish.x - inst.rest.x
  const dy = fish.y - inst.rest.y
  const d = Math.hypot(dx, dy) || 1
  const at = { x: inst.rest.x + dx / d * FISH_LEAN, y: inst.rest.y + dy / d * FISH_LEAN }
  const way = { x: fish.x - inst.head.x, y: fish.y - inst.head.y }
  const l = Math.hypot(way.x, way.y) || 1
  way.x /= l
  way.y /= l
  keepUp(way)
  ease(inst, at, way, dt)
}
//
// The prey on the bank nearest the lip's tip within reach (with how near:
// 0 at WATCH_REACH, 1 within STRIKE_REACH; and whether it is at the edge),
// or null — the hero first whenever he is at the edge.
//
function nearestPrey(inst, ctx) {
  const hero = preyOn(PREY.HERO, ctx.hero, null)
  if (hero?.strike) return hero
  const all = [hero]
  ctx.runners.forEach(runner => ctx.runnerAbout(runner) && all.push(preyOn(PREY.RUNNER, runner.pos, runner)))
  return all.reduce((best, c) => (c && (!best || c.share > best.share) ? c : best), null)
}
//
// A point as prey if it is on the bank within reach of the lip's tip.
//
function preyOn(kind, p, runner) {
  if (!p || !onBank(p)) return null
  const share = Math.max(0, Math.min(1, (p.x - (Layout.BANK_TIP_X - WATCH_REACH)) / (WATCH_REACH - STRIKE_REACH)))
  return { kind, x: p.x, y: p.y, runner, share, strike: p.x >= Layout.BANK_TIP_X - STRIKE_REACH }
}
function onBank(p) {
  return p.x > Layout.BANK_TIP_X - WATCH_REACH && p.x < Layout.BANK_TIP_X + EDGE_PAST && p.y < Layout.LAKE_SURFACE_Y && p.y > Layout.LAKE_SURFACE_Y - ABOVE
}
//
// The strike begins: out of the water first, jaws opening.
//
function startStrike(inst, prey) {
  inst.state = STATE.STRIKE
  inst.stateT = 0
  inst.out = false
  inst.pounceFrom = null
  inst.prey = prey
  inst.gripAt = null
}
//
// Striking: out past the lip's tip, then at the prey (followed as it
// moves); a bite within BITE_R px; a miss once it took too long or the
// prey got away.
//
function strike(inst, ctx, dt) {
  const prey = livePrey(inst.prey, ctx)
  inst.look = prey
  inst.jaw += Math.min(OPEN_RATE * dt, WIDE - inst.jaw)
  if (!prey || inst.stateT > STRIKE_TIME) {
    startSink(inst)
    return
  }
  const head = inst.head
  if (prey.kind === PREY.RUNNER) {
    pounce(inst, ctx, prey, dt)
    return
  }
  if (!inst.out && !prey.water) {
    inst.out = Math.hypot(head.x - inst.via.x, head.y - inst.via.y) < OUT_DONE
    moveTo(inst, outTarget(inst), OUT_SPEED, dt)
    turnTo(inst, 0, -1, dt)
    return
  }
  moveTo(inst, prey, LUNGE_SPEED, dt)
  turnTo(inst, prey.x - head.x, prey.y - head.y, dt)
  Math.hypot(prey.x - head.x, prey.y - head.y) <= BITE_R && seize(inst, ctx, prey)
}
function seize(inst, ctx, prey) {
  inst.state = STATE.CHEW
  inst.stateT = 0
  inst.prey = prey
  ctx.onSeize(prey)
}
//
// At a runner, from over it: the head swept up in an arc (out of the water
// right of the bank's face, through ARC_BEND, curving over to POUNCE_UP px
// over the runner) in RISE_TIME s, its jaws turning from up to straight
// down at it on the way; held there HOVER_TIME s; then a dart straight
// down onto it at DART_SPEED.
//
function pounce(inst, ctx, prey, dt) {
  const head = inst.head
  inst.pounceFrom ??= { x: head.x, y: head.y }
  const to = { x: prey.x, y: prey.y - POUNCE_UP }
  const t = inst.stateT
  if (t < RISE_TIME) {
    const u = t / RISE_TIME
    const e = u * (2 - u)
    const bend = { x: Math.max(prey.x, Layout.BANK_TIP_X) + ARC_BEND.dx, y: Layout.LAKE_SURFACE_Y + ARC_BEND.dy }
    const a = inst.pounceFrom
    head.x = (1 - e) * (1 - e) * a.x + 2 * (1 - e) * e * bend.x + e * e * to.x
    head.y = (1 - e) * (1 - e) * a.y + 2 * (1 - e) * e * bend.y + e * e * to.y
    const turn = Math.PI * e
    setDir(inst, Math.sin(turn) * Math.sign(prey.x - bend.x || -1), -Math.cos(turn))
    return
  }
  if (t < RISE_TIME + HOVER_TIME) {
    head.x = to.x
    head.y = to.y
    setDir(inst, prey.x - head.x, prey.y - head.y)
    return
  }
  const bite = { x: prey.x, y: biteY(inst, prey) }
  moveTo(inst, bite, DART_SPEED, dt)
  setDir(inst, prey.x - head.x, prey.y - head.y)
  const late = t > RISE_TIME + HOVER_TIME + DART_MAX
  ;(late || Math.hypot(bite.x - head.x, bite.y - head.y) <= BITE_R) && seize(inst, ctx, prey)
}
//
// The lowest its head may come down over the runner, its jaws as they are
// now (open, turned down at it): every point of their outline over the
// soil under it.
//
function biteY(inst, prey) {
  const head = inst.head
  let best = Infinity
  const p = { x: 0, y: 0 }
  jawEdgeProfile().forEach(e => {
    jawPoint(inst, e.upper ? JAW_TOP : JAW_LOW, e, e.upper, p)
    const dx = p.x - head.x
    const ground = groundUnder(prey.x + dx, prey.y)
    ground !== null && (best = Math.min(best, ground - (p.y - head.y)))
  })
  return Number.isFinite(best) ? best : prey.y
}
//
// The soil's top under x from about y down (null if none is near).
//
function groundUnder(x, y) {
  for (let gy = y - GROUND_LOOK; gy < y + GROUND_REACH; gy += GROUND_STEP) {
    if (Surface.isSoil(x, gy)) return gy
  }
  return null
}
//
// The head's way set at once (no easing): a pounce's sweep.
//
function setDir(inst, x, y) {
  const l = Math.hypot(x, y)
  if (l < TINY) return
  inst.dir.x = x / l
  inst.dir.y = y / l
}
//
// The hero sinking in the lake within its reach out from the bank's edge
// (WATER_HUNT px), as prey it catches under the water (null: none).
//
function sinkingHero(ctx) {
  const p = ctx.sinking
  if (!p || p.x < Layout.BANK_TIP_X || p.x > Layout.BANK_TIP_X + WATER_HUNT) return null
  return { kind: PREY.HERO, water: true, x: p.x, y: p.y }
}
//
// Where the head heads coming out: from in under the bank first to the
// watching spot out by its face, then straight up past the bank's corner.
//
function outTarget(inst) {
  const head = inst.head
  return head.x < inst.watch.x - OUT_DONE && head.y > Layout.LAKE_SURFACE_Y ? inst.watch : inst.via
}
//
// Where the prey it strikes at is now (the hero gone, or off the bank's
// reach, or a runner no longer about: null).
//
function livePrey(prey, ctx) {
  if (!prey) return null
  if (prey.water) return sinkingHero(ctx)
  const p = prey.kind === PREY.HERO ? ctx.hero : (ctx.runnerAbout(prey.runner) ? prey.runner.pos : null)
  if (!p || p.x < Layout.BANK_TIP_X - WATCH_REACH || p.y > Layout.LAKE_SURFACE_Y) return null
  return { ...prey, x: p.x, y: p.y }
}
//
// Chewing slowly what it holds: a runner up over the water, the head held
// at its spot facing left; the hero dragged down under the water and
// chewed there, very slowly, the head thrashing. Done, it swallows and
// sinks.
//
function chew(inst, ctx, dt) {
  inst.look = null
  const hero = holdsHero(inst)
  hero ? devour(inst, dt) : hold(inst, ctx, dt)
  const open = HALF - HALF * Math.cos(inst.stateT * (hero ? HERO_CHEW_HZ : CHEW_HZ) * FULL_TURN)
  inst.jaw = hero ? SHUT + HOLD_OPEN + CHEW_OPEN * open : SHUT + RUNNER_OPEN + RUNNER_CHEW * open
  if (inst.stateT < (hero ? CHEW_TIME_HERO : CHEW_TIME)) return
  ctx.onSwallow(inst.prey, eyeAt(inst))
  startSink(inst)
}
//
// A runner held up over the water at the chewing spot, facing left.
//
function hold(inst, ctx, dt) {
  moveTo(inst, { x: inst.chewAt.x, y: inst.chewAt.y + inst.sag }, CHEW_SPEED, dt)
  turnTo(inst, CHEW_DIR.x, CHEW_DIR.y + inst.sag * SAG_TILT, dt)
  inst.dripIn -= dt
  if (inst.dripIn > 0) return
  inst.dripIn = DRIP_EVERY + Math.random() * DRIP_EVERY_RANGE
  const under = jawUnderProfile()
  inst.drips.push({ from: under[Math.floor(Math.random() * under.length)], hang: true, t: 0, len: 0, x: 0, y: 0, vy: 0 })
}
//
// The hero dragged down: back round the bank's corner while the head is
// over the bank, then down under the water to its spot, swung to and fro
// and turned this way and that once it is under.
//
function devour(inst, dt) {
  const head = inst.head
  const surface = Layout.LAKE_SURFACE_Y
  if (head.y < surface && head.x < inst.via.x - OUT_DONE) {
    moveTo(inst, inst.via, DRAG_SPEED, dt)
    turnTo(inst, 0, 1, dt)
    return
  }
  if (!inst.gripAt) {
    moveTo(inst, inst.dragAt, DRAG_SPEED, dt)
    turnTo(inst, CHEW_DIR.x, CHEW_DIR.y, dt)
    Math.hypot(head.x - inst.dragAt.x, head.y - inst.dragAt.y) < HOME_R && (inst.gripAt = neckEnd(inst))
    return
  }
  const t = inst.stateT * FULL_TURN
  const a = Math.sin(t * SHAKE_HZ) * Math.cos(t * SHAKE_HZ2)
  const b = Math.sin(t * SHAKE_HZ2 + 1) * Math.cos(t * SHAKE_HZ * HALF)
  const at = Math.atan2(CHEW_DIR.y, CHEW_DIR.x) + (a + b) * SHAKE_TURN
  inst.dir.x = Math.cos(at)
  inst.dir.y = Math.sin(at)
  head.x = inst.gripAt.x + inst.dir.x * NECK_INTO * SCALE
  head.y = inst.gripAt.y + inst.dir.y * NECK_INTO * SCALE
}
function startSink(inst) {
  inst.state = STATE.SINK
  inst.stateT = 0
  inst.prey = null
  inst.gripAt = null
}
//
// Sinking back home into the hollow, jaws shut — from over the bank back
// round the lip's tip first, from over the water straight down under it
// first (taking down anyone standing on its head) —; home, it rests.
//
function sink(inst, dt) {
  inst.jaw += (SHUT - inst.jaw) * Math.min(1, SHUT_RATE * dt)
  moveTo(inst, sinkTarget(inst), SINK_SPEED, dt)
  turnTo(inst, REST_DIR.x, REST_DIR.y, dt)
  if (Math.hypot(inst.head.x - inst.rest.x, inst.head.y - inst.rest.y) > HOME_R && inst.stateT < SINK_MAX_TIME) return
  inst.state = STATE.REST
  inst.stateT = 0
}
//
// Where the head heads sinking now: round the lip's tip while it is over
// the bank, straight down while it is out of the water past the tip, then
// home.
//
function sinkTarget(inst) {
  const head = inst.head
  const surface = Layout.LAKE_SURFACE_Y
  if (head.y < surface && head.x < inst.via.x - OUT_DONE) return inst.via
  return head.y < surface + SINK_DOWN && head.x > inst.via.x - OUT_DONE ? { x: head.x, y: surface + SINK_DOWN } : inst.rest
}
//
// Under the water (drawn behind the soil) the head kept out of the soil
// and its jaws turned off it, the least way that clears them.
//
function keepOutOfSoil(inst, dt) {
  if (inst.head.y < Layout.LAKE_SURFACE_Y) return
  outOfSoil(inst.head)
  if (!jawsInSoil(inst, inst.dir.x, inst.dir.y)) return
  for (const turn of CLEAR_TURNS) {
    const c = Math.cos(turn)
    const sn = Math.sin(turn)
    const x = inst.dir.x * c - inst.dir.y * sn
    const y = inst.dir.x * sn + inst.dir.y * c
    if (jawsInSoil(inst, x, y)) continue
    turnTo(inst, x, y, dt)
    return
  }
}
function jawsInSoil(inst, dx, dy) {
  return JAW_READ.some(r => JAW_SIDES.some(side => Surface.isSoil(inst.head.x + dx * r - dy * side, inst.head.y + dy * r + dx * side)))
}
//
// Watching: the head eased toward its spot and its way.
//
function ease(inst, at, dir, dt) {
  const k = 1 - Math.exp(-WATCH_RATE * dt)
  const dx = (at.x - inst.head.x) * k
  const dy = (at.y - inst.head.y) * k
  const d = Math.hypot(dx, dy)
  const cap = WATCH_SPEED * dt
  const s = d > cap ? cap / d : 1
  inst.head.x += dx * s
  inst.head.y += dy * s
  turnTo(inst, dir.x, dir.y, dt)
}
//
// The head straight on toward a point at a speed, never farther than
// REACH from the neck's root.
//
function moveTo(inst, p, speed, dt) {
  const head = inst.head
  const dx = p.x - head.x
  const dy = p.y - head.y
  const d = Math.hypot(dx, dy)
  const step = Math.min(d, speed * dt)
  d > TINY && (head.x += dx / d * step)
  d > TINY && (head.y += dy / d * step)
  const rx = head.x - inst.root.x
  const ry = head.y - inst.root.y
  const r = Math.hypot(rx, ry)
  if (r <= REACH) return
  head.x = inst.root.x + rx / r * REACH
  head.y = inst.root.y + ry / r * REACH
}
//
// The head's way turned toward (x, y), eased.
//
function turnTo(inst, x, y, dt) {
  const l = Math.hypot(x, y)
  if (l < TINY) return
  const k = Math.min(1, TURN_RATE * dt)
  const d = inst.dir
  d.x += (x / l - d.x) * k
  d.y += (y / l - d.y) * k
  const dl = Math.hypot(d.x, d.y) || 1
  d.x /= dl
  d.y /= dl
}
function lerpPoint(a, b, u) {
  const e = u * u * (3 - 2 * u)
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e }
}
function lerpDir(a, b, u) {
  const e = u * u * (3 - 2 * u)
  const x = a.x + (b.x - a.x) * e
  const y = a.y + (b.y - a.y) * e
  const l = Math.hypot(x, y) || 1
  return { x: x / l, y: y / l }
}
//
// The head breaking the surface: a big splash going out, a smaller one
// coming back in (only out past the lip, where the surface is open).
//
function crossSurface(inst, ctx) {
  const head = inst.head
  const under = head.y > CaveLake.surfaceAt(inst.lake, head.x)
  if (under !== inst.wasUnder && head.x > Layout.BANK_TIP_X) splash(inst, ctx, head.x, under ? SPLASH_IN : SPLASH_OUT, under ? DROPS_IN : DROPS_OUT)
  inst.wasUnder = under
}
function splash(inst, ctx, x, strength, drops) {
  const y = CaveLake.surfaceAt(inst.lake, x)
  inst.rings.push({ x, t: 0, strength })
  for (let i = 0; i < drops; i++) {
    const a = -Math.PI * HALF + (Math.random() * 2 - 1) * DROP_SPREAD
    const s = (DROP_SPEED + Math.random() * DROP_SPEED_RANGE) * strength
    inst.drops.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s })
  }
  ctx.onSplash(x, strength)
}
function updateSplash(inst, dt) {
  inst.rings.forEach(ring => { ring.t += dt })
  inst.rings = inst.rings.filter(ring => ring.t < RING_TIME)
  inst.drops.forEach(drop => {
    drop.vy += DROP_GRAVITY * dt
    drop.x += drop.vx * dt
    drop.y += drop.vy * dt
  })
  inst.drops = inst.drops.filter(drop => drop.vy < 0 || drop.y < CaveLake.surfaceAt(inst.lake, drop.x))
}
//
// Drops from its mouth: hanging from the jaw till they let go (at once
// once it stops chewing), then falling to the water — each a tiny ring
// and a soft plop there.
//
function updateDrips(inst, ctx, dt) {
  const chewing = inst.state === STATE.CHEW
  inst.drips.forEach(d => {
    if (d.hang) {
      hang(inst, d, dt)
      d.hang = chewing && d.t < DRIP_HANG
      d.hang || (d.y += d.len)
      return
    }
    d.vy += DROP_GRAVITY * dt
    d.y += d.vy * dt
    const surface = CaveLake.surfaceAt(inst.lake, d.x)
    if (d.y < surface) return
    d.gone = true
    inst.rings.push({ x: d.x, t: 0, strength: DRIP_RING })
    ctx.onDrip(d.x)
  })
  inst.drips = inst.drips.filter(d => !d.gone)
}
//
// Its head's bend under the hero: a damped spring toward SAG_HOLD while he
// stands on it, else back to none.
//
function updateSag(inst, dt) {
  const to = inst.ridden ? SAG_HOLD : 0
  inst.sagV += (SAG_K * (to - inst.sag) - SAG_DAMP * inst.sagV) * dt
  inst.sag += inst.sagV * dt
}
//
// A drop hanging from its jaw: its top where it hangs from (moving with the
// head), drawn out as it fills.
//
function hang(inst, d, dt) {
  d.t += dt
  const u = Math.min(1, d.t / DRIP_HANG)
  jawPoint(inst, JAW_LOW, d.from, false, d)
  d.len = DRIP_HANG_LEN * u * u
}
//
// The neck's line from the rosette to the collar: two curves meeting at
// its bend (drawn round the bank's corner as the head goes over the bank,
// viaWeight); evened, eased toward from the last frame's, then evenly
// resampled, swaying across.
//
function layNeck(inst, dt) {
  const end = neckEnd(inst)
  const curve = inst.curve
  curve.length = 0
  const tx = end.x - inst.root.x
  const ty = end.y - inst.root.y
  const tl = Math.hypot(tx, ty) || 1
  const way = { x: tx / tl, y: ty / tl }
  const w = viaWeight(inst, end)
  const mid = curvePoint(inst.root, UP, end, inst.dir, HALF)
  const bend = { x: mid.x + (inst.via.x - mid.x) * w, y: mid.y + (inst.via.y - mid.y) * w }
  addCurve(curve, inst.root, UP, bend, way)
  addCurve(curve, bend, way, end, inst.dir)
  const passes = Math.round(SMOOTH_PASSES + (CREST_PASSES - SMOOTH_PASSES) * inst.crest)
  const pts = uniform(curve)
  even(pts, passes)
  const target = fixedCount(pts)
  inst.crest > TINY && blendLine(target, crestLine(inst, end), inst.crest)
  easeNeck(inst, target, dt)
  even(inst.neck, passes)
  resample(inst, inst.neck)
}
//
// How far its neck hooks over (0..1): only while it pounces on a runner,
// the more the more its jaws face down at it, eased.
//
function updateCrest(inst, dt) {
  const pouncing = inst.state === STATE.STRIKE && inst.prey?.kind === PREY.RUNNER
  const u = pouncing ? Math.max(0, Math.min(1, (inst.dir.y - CREST_FROM) / (CREST_TO - CREST_FROM))) : 0
  inst.crest += (u * u * (3 - 2 * u) - inst.crest) * Math.min(1, CREST_RATE * dt)
}
//
// The hooked neck as NECK_N points: up out of the rosette, over to the
// crest, along it to the left and down into the back of the jaws.
//
function crestLine(inst, end) {
  const crest = { x: end.x + CREST.dx, y: end.y - CREST.dy }
  const curve = inst.crestCurve
  curve.length = 0
  addCurve(curve, inst.root, UP, crest, LEFT)
  addCurve(curve, crest, LEFT, end, inst.dir)
  const pts = uniform(curve)
  even(pts, CREST_PASSES)
  return fixedCount(pts)
}
//
// A line moved `w` of the way toward another of as many points.
//
function blendLine(line, other, w) {
  line.forEach((p, i) => {
    p.x += (other[i].x - p.x) * w
    p.y += (other[i].y - p.y) * w
  })
}
//
// The head turned no more than HEAD_BEND_MAX off the way the neck comes
// up to it (not while it thrashes the hero, nor while it bends over a
// runner to drop on it: the neck arches over then, a question mark).
//
function limitHeadBend(inst) {
  const n = inst.neck
  const pouncing = inst.state === STATE.STRIKE && inst.prey?.kind === PREY.RUNNER
  if (inst.gripAt || pouncing || n.length <= HEAD_BEND_READ) return
  const a = n[n.length - 1 - HEAD_BEND_READ]
  const b = n[n.length - 1]
  const way = Math.atan2(b.y - a.y, b.x - a.x)
  const head = Math.atan2(inst.dir.y, inst.dir.x)
  const off = Math.atan2(Math.sin(head - way), Math.cos(head - way))
  if (Math.abs(off) <= HEAD_BEND_MAX) return
  const at = way + Math.sign(off) * HEAD_BEND_MAX
  inst.dir.x = Math.cos(at)
  inst.dir.y = Math.sin(at)
}
//
// The neck's NECK_N points eased toward the new line's: in the middle at
// NECK_EASE per s, nearer its ends ever more at once (its ends — the root,
// the collar — set), so it never folds where it meets the head.
//
function easeNeck(inst, target, dt) {
  const k = 1 - Math.exp(-NECK_EASE * dt)
  const neck = inst.neck
  const last = target.length - 1
  target.forEach((p, i) => {
    const q = neck[i]
    if (!q) {
      neck[i] = { x: p.x, y: p.y }
      return
    }
    const ki = 1 - (1 - k) * Math.sin(Math.PI * i / last)
    q.x += (p.x - q.x) * ki
    q.y += (p.y - q.y) * ki
  })
}
//
// A line as NECK_N points evenly along it.
//
function fixedCount(line) {
  const acc = [0]
  for (let i = 1; i < line.length; i++) acc.push(acc[i - 1] + Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y))
  const len = acc[acc.length - 1]
  const out = []
  let j = 1
  for (let i = 0; i < NECK_N; i++) {
    const s = len * i / (NECK_N - 1)
    while (j < line.length - 1 && acc[j] < s) j++
    const a = line[j - 1]
    const b = line[j]
    const seg = acc[j] - acc[j - 1]
    const u = seg > 0 ? Math.max(0, Math.min(1, (s - acc[j - 1]) / seg)) : 0
    out.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u })
  }
  return out
}
//
// A line's points every STEP px along it.
//
function uniform(line) {
  const out = [{ x: line[0].x, y: line[0].y }]
  let carry = 0
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]
    const b = line[i]
    const seg = Math.hypot(b.x - a.x, b.y - a.y)
    for (let d = STEP - carry; d <= seg; d += STEP) out.push({ x: a.x + (b.x - a.x) * d / seg, y: a.y + (b.y - a.y) * d / seg })
    carry = (carry + seg) % STEP
  }
  const end = line[line.length - 1]
  out.push({ x: end.x, y: end.y })
  return out
}
//
// The neck's line evened into arcs `passes` times and kept out of the soil (its ends
// stay: straight out of the rosette, along the head at the collar).
//
function even(pts, passes) {
  const n = pts.length
  for (let pass = 0; pass < passes; pass++) {
    for (let i = END_KEEP; i < n - END_KEEP; i++) {
      const a = pts[i - 1]
      const b = pts[i + 1]
      const p = pts[i]
      p.x += ((a.x + b.x) * HALF - p.x) * SMOOTH_PULL
      p.y += ((a.y + b.y) * HALF - p.y) * SMOOTH_PULL
      i > SOIL_FREE && i < n - 1 - SOIL_FREE && outOfSoil(p)
    }
  }
}
//
// A point with soil within SOIL_R px pushed SOIL_PUSH px away from it.
//
function outOfSoil(p) {
  let px = 0
  let py = 0
  SOIL_DIRS.forEach(d => {
    if (!Surface.isSoil(p.x + d.x * SOIL_R, p.y + d.y * SOIL_R)) return
    px -= d.x
    py -= d.y
  })
  const l = Math.hypot(px, py)
  if (l < TINY) return
  p.x += px / l * SOIL_PUSH
  p.y += py / l * SOIL_PUSH
}
//
// How far the neck's bend is drawn round the bank's corner (to VIA): none
// with the head well out over the water or down in it, all of it with the
// head over the bank, eased between over VIA_BLEND px either way.
//
function viaWeight(inst, end) {
  const across = Math.max(0, Math.min(1, (inst.via.x + VIA_BLEND - end.x) / (2 * VIA_BLEND)))
  const up = Math.max(0, Math.min(1, (Layout.LAKE_SURFACE_Y + VIA_BLEND - end.y) / (2 * VIA_BLEND)))
  return across * across * (3 - 2 * across) * up * up * (3 - 2 * up)
}
//
// A point of the curve addCurve draws from a (leaving along ta) to b
// (arriving along tb), t of the way.
//
function curvePoint(a, ta, b, tb, t) {
  const d = Math.hypot(b.x - a.x, b.y - a.y)
  const pull = Math.max(CURVE_MIN, Math.min(CURVE_MAX, d * CURVE_PULL))
  const u = 1 - t
  const p1x = a.x + ta.x * pull
  const p1y = a.y + ta.y * pull
  const p2x = b.x - tb.x * pull
  const p2y = b.y - tb.y * pull
  return {
    x: u * u * u * a.x + 3 * u * u * t * p1x + 3 * u * t * t * p2x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * p1y + 3 * u * t * t * p2y + t * t * t * b.y
  }
}
//
// Where the neck ends under the collar: NECK_INTO px behind the hinge.
//
function neckEnd(inst) {
  return { x: inst.head.x - inst.dir.x * NECK_INTO * SCALE, y: inst.head.y - inst.dir.y * NECK_INTO * SCALE }
}
//
// A cubic curve from a (leaving along ta) to b (arriving along tb), its
// points pushed onto `out`.
//
function addCurve(out, a, ta, b, tb) {
  const d = Math.hypot(b.x - a.x, b.y - a.y)
  const pull = Math.max(CURVE_MIN, Math.min(CURVE_MAX, d * CURVE_PULL))
  const p1 = { x: a.x + ta.x * pull, y: a.y + ta.y * pull }
  const p2 = { x: b.x - tb.x * pull, y: b.y - tb.y * pull }
  for (let i = out.length ? 1 : 0; i <= CURVE_SAMPLES; i++) {
    const t = i / CURVE_SAMPLES
    const u = 1 - t
    out.push({
      x: u * u * u * a.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * b.x,
      y: u * u * u * a.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * b.y
    })
  }
}
//
// The curve resampled every STEP px (s: the length from the root), each
// point pushed across by the sway (none at the ends).
//
function resample(inst, curve) {
  const acc = [0]
  for (let i = 1; i < curve.length; i++) acc.push(acc[i - 1] + Math.hypot(curve[i].x - curve[i - 1].x, curve[i].y - curve[i - 1].y))
  const len = acc[acc.length - 1]
  const n = Math.max(2, Math.ceil(len / STEP) + 1)
  const spine = inst.spine
  spine.length = 0
  let j = 1
  for (let i = 0; i < n; i++) {
    const s = len * i / (n - 1)
    while (j < curve.length - 1 && acc[j] < s) j++
    const a = curve[j - 1]
    const b = curve[j]
    const seg = acc[j] - acc[j - 1]
    const u = seg > 0 ? Math.max(0, Math.min(1, (s - acc[j - 1]) / seg)) : 0
    const nx = -(b.y - a.y) / (seg || 1)
    const ny = (b.x - a.x) / (seg || 1)
    const off = inst.swayAmp * Math.min(1, len / SWAY_FULL_LEN) * Math.sin(inst.sway - s / SWAY_LEN * FULL_TURN) * Math.sin(Math.PI * i / (n - 1))
    spine.push({ x: a.x + (b.x - a.x) * u + nx * off, y: a.y + (b.y - a.y) * u + ny * off, s })
  }
  inst.len = len
}
//
// The upper jaw's top edge laid out in the world (left to right) while it
// is ground, else none.
//
function placeTop(inst) {
  const chewing = inst.state === STATE.CHEW && !holdsHero(inst) && inst.head.y < Layout.LAKE_SURFACE_Y
  const sinking = inst.state === STATE.SINK && inst.stateT < SINK_CARRY
  if (!chewing && !sinking) {
    inst.topSpan = null
    return
  }
  const profile = jawTopProfile()
  inst.top.length = profile.length
  profile.forEach((p, i) => {
    inst.top[i] ??= { x: 0, y: 0 }
    jawPoint(inst, JAW_TOP, p, true, inst.top[i])
  })
  neckTop(inst)
  inst.top.sort((a, b) => a.x - b.x)
  inst.topSpan = { x1: inst.top[0].x, x2: inst.top[inst.top.length - 1].x }
}
//
// The top of the neck's last NECK_WALK px behind the head (its upper edge:
// out from its line by half its width the way that is up) added to the
// ground on its head.
//
function neckTop(inst) {
  const spine = inst.spine
  const half = BAND.w * SCALE * HALF * NECK_EDGE
  for (let i = spine.length - 1; i > 0 && inst.len - spine[i].s <= NECK_WALK; i--) {
    const a = spine[i - 1]
    const b = spine[i]
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const up = (b.x - a.x) / l > 0 ? -1 : 1
    inst.top.push({ x: b.x + (b.y - a.y) / l * half * -up, y: b.y + (b.x - a.x) / l * half * up })
  }
}
//
// The jaw's top at a world X (null off it or while it is no ground).
//
function topAt(inst, x) {
  const top = inst.top
  if (!inst.topSpan || x < inst.topSpan.x1 || x > inst.topSpan.x2) return null
  let i = 1
  while (i < top.length - 1 && top[i].x < x) i++
  const a = top[i - 1]
  const b = top[i]
  const u = b.x > a.x ? (x - a.x) / (b.x - a.x) : 0
  return a.y + (b.y - a.y) * u
}
//
// The upper jaw piece's top edge (piece px): down each STAND_STEP'th
// column, the top of its longest opaque run (its body, under its spines);
// read once.
//
function jawTopProfile() {
  if (jawTop) return jawTop
  const src = Atlas.piece(JAW_TOP.piece)
  const { width: w, height: h } = src
  const data = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data
  jawTop = []
  for (let x = STAND_FROM; x <= STAND_TO; x += STAND_STEP) {
    let best = null
    let bestLen = 0
    let from = null
    for (let y = 0; y <= h; y++) {
      const solid = y < h && data[(y * w + x) * RGBA + ALPHA_OFFSET] >= SOLID_ALPHA
      if (solid && from === null) from = y
      if (solid || from === null) continue
      y - from > bestLen && (best = from)
      bestLen = Math.max(bestLen, y - from)
      from = null
    }
    best !== null && jawTop.push({ x, y: best })
  }
  return jawTop
}
//
// Both jaw pieces' outline (piece px): the top and the bottom opaque pixel
// of every EDGE_STEP'th column, spines and all; read once.
//
function jawEdgeProfile() {
  if (jawEdges) return jawEdges
  jawEdges = []
  ;[[JAW_TOP.piece, true], [JAW_LOW.piece, false]].forEach(([name, upper]) => {
    const src = Atlas.piece(name)
    const { width: w, height: h } = src
    const data = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data
    for (let x = 0; x < w; x += EDGE_STEP) {
      let top = -1
      let bottom = -1
      for (let y = 0; y < h; y++) {
        if (data[(y * w + x) * RGBA + ALPHA_OFFSET] < SOLID_ALPHA) continue
        top < 0 && (top = y)
        bottom = y
      }
      top >= 0 && jawEdges.push({ x, y: top, upper }, { x, y: bottom, upper })
    }
  })
  return jawEdges
}
//
// The lower jaw piece's underside (piece px): down each STAND_STEP'th
// column from DRIP_COL_FROM to DRIP_COL_TO, the bottom of its longest
// opaque run (its body, over its spines); read once.
//
function jawUnderProfile() {
  if (jawUnder) return jawUnder
  const src = Atlas.piece(JAW_LOW.piece)
  const { width: w, height: h } = src
  const data = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data
  jawUnder = []
  for (let x = DRIP_COL_FROM; x <= Math.min(DRIP_COL_TO, w - 1); x += STAND_STEP) {
    let best = null
    let bestLen = 0
    let from = null
    for (let y = 0; y <= h; y++) {
      const solid = y < h && data[(y * w + x) * RGBA + ALPHA_OFFSET] >= SOLID_ALPHA
      if (solid && from === null) from = y
      if (solid || from === null) continue
      y - from > bestLen && (best = y)
      bestLen = Math.max(bestLen, y - from)
      from = null
    }
    best !== null && jawUnder.push({ x, y: best })
  }
  return jawUnder
}
//
// The angle (rad) a head piece painted facing left is drawn at: the head
// turns round as one, never mirrored (its jaws keep their own sides of it
// whichever way it faces).
//
function headAngle(inst) {
  return Math.atan2(inst.dir.y, inst.dir.x) - Math.PI
}
//
// A jaw's turn: away from the other one by its opening.
//
function jawTurn(inst, upper) {
  return headAngle(inst) + (upper ? inst.jaw : -inst.jaw)
}
//
// A point of a jaw piece (piece px) in the world, as drawn now.
//
function jawPoint(inst, jaw, p, upper, out) {
  const a = jawTurn(inst, upper)
  const lx = (p.x - jaw.hinge.x) * SCALE
  const ly = (p.y - jaw.hinge.y) * SCALE
  out.x = inst.head.x + lx * Math.cos(a) - ly * Math.sin(a)
  out.y = inst.head.y + lx * Math.sin(a) + ly * Math.cos(a)
  return out
}
//
// The eye's ball in the world: up its stalk along the head's way.
//
function eyeAt(inst) {
  const a = eyeAngle(inst)
  const len = (EYE.foot.y - EYE.ball.y) * SCALE
  return { x: inst.head.x + Math.sin(a) * len, y: inst.head.y - Math.cos(a) * len }
}
function eyeAngle(inst) {
  return Math.atan2(inst.dir.x, -inst.dir.y) + EYE_SWAY * Math.sin(inst.sway * EYE_SWAY_HZ / SWAY_HZ)
}
//
// The neck's leaves from its point `from` on, behind it (their cut feet
// hidden by it), each at its share of the neck's length, turned off its
// way to its side.
//
function drawLeaves(inst, parts, from) {
  const spine = inst.spine
  if (spine.length < 3 || from >= spine.length) return
  const fromS = spine[from].s
  NECK_LEAVES.forEach((leaf, n) => {
    const s = inst.len * leaf.at
    if (s < fromS) return
    let i = 1
    while (i < spine.length - 1 && spine[i].s < s) i++
    const a = spine[i - 1]
    const b = spine[i]
    const u = b.s > a.s ? Math.max(0, Math.min(1, (s - a.s) / (b.s - a.s))) : 0
    const ta = tangentAt(spine, i - 1)
    const tb = tangentAt(spine, i)
    const way = Math.atan2(ta.y + (tb.y - ta.y) * u, ta.x + (tb.x - ta.x) * u) + Math.PI * HALF
    const flutter = LEAF_FLUTTER * Math.sin(inst.sway + n)
    inst.leafAt.x = a.x + (b.x - a.x) * u
    inst.leafAt.y = a.y + (b.y - a.y) * u
    drawPart(inst, parts.leaf, inst.leafAt, way + leaf.side * LEAF_TILT + flutter, leaf.side < 0, leaf.size)
  })
}
//
// The neck's way at one of its points (from the point before it to the one
// after it).
//
function tangentAt(spine, i) {
  const a = spine[Math.max(0, i - 1)]
  const b = spine[Math.min(spine.length - 1, i + 1)]
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1
  return { x: (b.x - a.x) / l, y: (b.y - a.y) / l }
}
//
// The neck: one strip along its spine, its scales tiled along it (each
// tile split off where it ends, so the texture never wraps inside a quad),
// drawn out a little as it stretches.
//
function drawNeck(inst, parts, from) {
  const frame = inst.k.getSprite(SPRITE)?.data?.frames?.[0]
  const spine = inst.spine
  if (!frame || spine.length - from < 2) return
  const q = frame.q
  const stretch = Math.max(1, Math.min(STRETCH_MAX, 1 + (inst.len - REST_LEN) / REST_LEN * STRETCH_SHARE))
  const tile = BAND_LEN * SCALE * stretch
  const strip = { inst, q, band: parts.band.quad, half: BAND.w * SCALE * HALF, pts: [], uv: [] }
  const last = spine.length - 1
  for (let i = from; i <= last; i++) {
    const p = spine[i]
    const a = spine[Math.max(0, i - 1)]
    const b = spine[Math.min(last, i + 1)]
    const tl = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const nx = -(b.y - a.y) / tl
    const ny = (b.x - a.x) / tl
    const fromHead = inst.len - p.s
    const cell = Math.floor(fromHead / tile)
    if (i > from) {
      const prev = inst.len - spine[i - 1].s
      const edge = Math.floor(prev / tile)
      edge !== cell && pushEdge(strip, spine[i - 1], p, nx, ny, edge * tile, prev, fromHead)
    }
    pushPair(strip, p, nx, ny, fromHead / tile - cell)
  }
  inst.k.drawPolygon({ pts: strip.pts, uv: strip.uv, indices: stripIndices(strip.pts.length), tex: frame.tex, color: inst.color })
}
//
// A pair of the strip's vertices across the neck at a point (its texture
// `v` of the way down a tile); the vectors are the instance's own, reused.
//
function pushPair(strip, p, nx, ny, v) {
  const { inst, pts, uv, q, band, half } = strip
  const i = pts.length
  inst.pool[i] ??= inst.k.vec2(0, 0)
  inst.pool[i + 1] ??= inst.k.vec2(0, 0)
  inst.uvPool[i] ??= inst.k.vec2(0, 0)
  inst.uvPool[i + 1] ??= inst.k.vec2(0, 0)
  pts.push(inst.pool[i].set(p.x + nx * half, p.y + ny * half), inst.pool[i + 1].set(p.x - nx * half, p.y - ny * half))
  const vy = q.y + (band.y + v * band.h) * q.h
  uv.push(inst.uvPool[i].set(q.x + band.x * q.w, vy), inst.uvPool[i + 1].set(q.x + (band.x + band.w) * q.w, vy))
}
//
// Where a tile ends between two samples: the end of one tile and the start
// of the next at the same place.
//
function pushEdge(strip, a, b, nx, ny, edgeS, sa, sb) {
  const u = (edgeS - sa) / ((sb - sa) || 1)
  const p = { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }
  pushPair(strip, p, nx, ny, 0)
  pushPair(strip, p, nx, ny, 1)
}
function stripIndices(count) {
  const out = []
  for (let i = 0; i + 3 < count; i += 2) out.push(i, i + 1, i + 2, i + 1, i + 3, i + 2)
  return out
}
//
// The head: the collar on the neck's end, the lower jaw, the eye on its
// stalk with its pupil, the upper jaw over them.
//
function drawHead(inst, parts, drawHeld) {
  const up = Math.atan2(inst.dir.x, -inst.dir.y)
  drawPart(inst, parts.collar, inst.head, up, false)
  const held = inst.state === STATE.CHEW && inst.prey
  held && !holdsHero(inst) && drawHeldRunner(inst, drawHeld)
  drawPart(inst, parts.jawLow, inst.head, jawTurn(inst, false), false)
  if (held && holdsHero(inst)) {
    const grip = GRIP * SCALE
    const shake = HOLD_SHAKE * Math.sin(inst.stateT * HERO_CHEW_HZ * FULL_TURN)
    drawHeld(inst.prey, { x: inst.head.x + inst.dir.x * grip, y: inst.head.y + inst.dir.y * grip }, (headAngle(inst) + shake) * DEG, 1)
  } else if (!held) {
    drawPart(inst, parts.eye, inst.head, eyeAngle(inst), false)
    drawPupil(inst)
  }
  drawPart(inst, parts.jawTop, inst.head, jawTurn(inst, true), false)
}
//
// A runner in its mouth, behind its jaws: shrinking as it is chewed and
// sinking down into the lower jaw.
//
function drawHeldRunner(inst, drawHeld) {
  const grip = GRIP * SCALE
  const eaten = Math.min(1, inst.stateT / CHEW_TIME)
  const d = inst.dir
  const low = { x: d.y, y: -d.x }
  const sink = RUNNER_SINK * eaten
  const shake = HOLD_SHAKE * Math.sin(inst.stateT * CHEW_HZ * FULL_TURN)
  drawHeld(inst.prey, { x: inst.head.x + d.x * grip + low.x * sink, y: inst.head.y + d.y * grip + low.y * sink }, (headAngle(inst) + shake) * DEG, 1 - eaten)
}
//
// Whether it is chewing the hero (he is stuck in its jaws).
//
function holdsHero(inst) {
  return inst.state === STATE.CHEW && inst.prey?.kind === PREY.HERO
}
//
// The pupil: a dark disc on the ball, off its middle toward what the eye
// looks at (the prey it watches, else straight on).
//
function drawPupil(inst) {
  const eye = eyeAt(inst)
  const r = EYE.r * SCALE
  const lx = inst.look ? inst.look.x - eye.x : inst.dir.x
  const ly = inst.look ? inst.look.y - eye.y : inst.dir.y
  const l = Math.hypot(lx, ly) || 1
  inst.k.drawCircle({ pos: inst.v.set(eye.x + lx / l * r * PUPIL_SHIFT, eye.y + ly / l * r * PUPIL_SHIFT), radius: r * PUPIL_R, color: inst.pupilRgb })
}
//
// One piece of the atlas at a world point (its pivot there), turned (rad),
// maybe mirrored, `size` times its size.
//
function drawPart(inst, part, at, angle, mirrored, size = 1) {
  inst.k.drawSprite({
    sprite: SPRITE,
    quad: part.quad,
    width: part.w * size,
    height: part.h * size,
    pos: inst.v.set(at.x, at.y),
    anchor: mirrored ? part.anchorMirrored : part.anchor,
    angle: angle * DEG,
    flipX: mirrored,
    color: inst.color
  })
}
//
// The atlas: the pieces baked once per page at BAKE_OVER times their drawn
// size (the neck's scales as one seamless tile), grained, loaded once per
// live k; per piece its quad, drawn size and anchor (its pivot).
//
function bake(k) {
  if (atlasFor.has(k)) return
  atlas ??= buildAtlas()
  if (!atlas) return
  k.loadSprite(SPRITE, atlas.canvas, { singular: true, filter: 'linear' })
  atlasFor.set(k, Object.fromEntries(Object.entries(atlas.parts).map(([name, part]) => [name, withAnchor(k, part)])))
}
function withAnchor(k, part) {
  const ax = part.pivot.x / part.sw * 2 - 1
  const ay = part.pivot.y / part.sh * 2 - 1
  return { ...part, anchor: k.vec2(ax, ay), anchorMirrored: k.vec2(-ax, ay) }
}
function buildAtlas() {
  const jawTop = Atlas.piece(JAW_TOP.piece)
  const jawLow = Atlas.piece(JAW_LOW.piece)
  const eye = Atlas.piece(EYE.piece)
  const neck = Atlas.piece(NECK_PIECE)
  const rosette = Atlas.piece(ROSETTE.piece)
  const leaf = Atlas.piece(LEAF.piece)
  if (!jawTop || !jawLow || !eye || !neck || !rosette || !leaf) return null
  const items = [
    { name: 'jawTop', src: jawTop, sx: 0, sy: 0, sw: jawTop.width, sh: jawTop.height, pivot: JAW_TOP.hinge },
    { name: 'jawLow', src: jawLow, sx: 0, sy: 0, sw: jawLow.width, sh: jawLow.height, pivot: JAW_LOW.hinge },
    { name: 'eye', src: eye, sx: 0, sy: 0, sw: eye.width, sh: eye.height, pivot: EYE.foot },
    { name: 'collar', src: neck, sx: 0, sy: 0, sw: neck.width, sh: COLLAR_H, pivot: COLLAR_RING },
    { name: 'rosette', src: rosette, sx: 0, sy: 0, sw: rosette.width, sh: rosette.height, pivot: ROSETTE.foot },
    { name: 'band', src: neckTile(neck), sx: 0, sy: 0, sw: BAND.w, sh: BAND_LEN, pivot: { x: 0, y: 0 } },
    { name: 'leaf', src: leaf, sx: 0, sy: 0, sw: leaf.width, sh: leaf.height, pivot: LEAF.foot, size: LEAF.size }
  ]
  const s = SCALE * BAKE_OVER
  const w = Math.ceil(Math.max(...items.map(it => it.sw * s))) + ATLAS_GAP * 2
  const h = Math.ceil(items.reduce((sum, it) => sum + Math.ceil(it.sh * s) + ATLAS_GAP, ATLAS_GAP))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  const parts = {}
  let y = ATLAS_GAP
  items.forEach(it => {
    const pw = Math.ceil(it.sw * s)
    const ph = Math.ceil(it.sh * s)
    ctx.drawImage(it.src, it.sx, it.sy, it.sw, it.sh, ATLAS_GAP, y, pw, ph)
    const drawn = SCALE * (it.size ?? 1)
    parts[it.name] = { quad: { x: ATLAS_GAP / w, y: y / h, w: pw / w, h: ph / h }, w: it.sw * drawn, h: it.sh * drawn, sw: it.sw, sh: it.sh, pivot: it.pivot }
    y += ph + ATLAS_GAP
  })
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  return { canvas, parts }
}
//
// The neck's scales as a tile that repeats down without a seam: BAND_LEN
// rows from BAND_FROM, its last BAND_BLEND rows faded into the rows just
// over its first (so its bottom runs on into its top).
//
function neckTile(neck) {
  const canvas = document.createElement('canvas')
  canvas.width = BAND.w
  canvas.height = BAND_LEN
  const ctx = canvas.getContext('2d')
  ctx.drawImage(neck, BAND.x, BAND_FROM, BAND.w, BAND_LEN, 0, 0, BAND.w, BAND_LEN)
  const over = document.createElement('canvas')
  over.width = BAND.w
  over.height = BAND_BLEND
  const octx = over.getContext('2d')
  octx.drawImage(neck, BAND.x, BAND_FROM - BAND_BLEND, BAND.w, BAND_BLEND, 0, 0, BAND.w, BAND_BLEND)
  const fade = octx.createLinearGradient(0, 0, 0, BAND_BLEND)
  fade.addColorStop(0, hexAlpha(C.pupil, 0))
  fade.addColorStop(1, C.pupil)
  octx.globalCompositeOperation = 'destination-in'
  octx.fillStyle = fade
  octx.fillRect(0, 0, BAND.w, BAND_BLEND)
  ctx.drawImage(over, 0, BAND_LEN - BAND_BLEND)
  return canvas
}
function hexAlpha(hex, alpha) {
  return hex + Math.round(alpha * BYTE_MAX).toString(HEX_RADIX).padStart(2, '0')
}
