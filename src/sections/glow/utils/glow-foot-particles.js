//
// Foot burst particles for glow level landings
//
const LANDING_COUNT = 10
const PARTICLE_Z = 19
const GRAVITY = 540
const LANDING_SPEED_MIN = 90
const LANDING_SPEED_RANGE = 140
//
// Creates the foot-particle pool and a single draw pass for the level scene
//
export function create(cfg) {
  const { k } = cfg
  const inst = {
    k,
    particles: [],
    drawHook: null
  }
  inst.drawHook = k.add([
    k.z(PARTICLE_Z),
    {
      draw() {
        drawParticles(inst)
      }
    }
  ])
  return inst
}
//
// Ages and moves every live foot particle
//
export function onUpdate(inst, dt) {
  if (!inst?.particles?.length) return
  for (let i = inst.particles.length - 1; i >= 0; i--) {
    const p = inst.particles[i]
    p.age += dt
    p.vy += GRAVITY * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.age >= p.life && inst.particles.splice(i, 1)
  }
}
//
// Splash on landing — countMult scales density (crack stomps use a higher mult)
//
export function spawnLanding(inst, footX, footY, color, countMult = 1) {
  if (!inst) return
  const count = Math.round(LANDING_COUNT * countMult)
  for (let i = 0; i < count; i++) {
    pushParticle(inst, footX, footY, color, LANDING_SPEED_MIN, LANDING_SPEED_RANGE, true)
  }
}
//
// Private helpers
//
function pushParticle(inst, footX, footY, color, speedMin, speedRange, splash) {
  const side = splash ? (Math.random() < 0.5 ? -1 : 1) : (Math.random() < 0.5 ? -1 : 1)
  const angle = (5 + Math.random() * 28) * (Math.PI / 180)
  const speed = speedMin + Math.random() * speedRange
  const c = color || { r: 70, g: 58, b: 48 }
  inst.particles.push({
    x: footX + side * (4 + Math.random() * 14),
    y: footY - 2 + Math.random() * 4,
    vx: Math.cos(angle) * speed * side * (splash ? 1 : 0.65),
    vy: -Math.sin(angle) * speed * (splash ? 1 : 1.15),
    life: 0.35 + Math.random() * 0.45,
    age: 0,
    size: 2 + Math.random() * 4,
    r: clampChannel(c.r + Math.floor((Math.random() - 0.5) * 24)),
    g: clampChannel(c.g + Math.floor((Math.random() - 0.5) * 20)),
    b: clampChannel(c.b + Math.floor((Math.random() - 0.5) * 18))
  })
}
function drawParticles(inst) {
  const k = inst.k
  for (const p of inst.particles) {
    k.drawRect({
      pos: k.vec2(p.x, p.y),
      width: p.size,
      height: p.size,
      color: k.rgb(p.r, p.g, p.b),
      opacity: Math.max(0, 1 - p.age / p.life)
    })
  }
}
function clampChannel(v) {
  return Math.max(0, Math.min(255, v))
}
