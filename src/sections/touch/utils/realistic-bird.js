/**
 * Builds a reusable draw cache for a bird to avoid per-frame vec2 allocations.
 * Call once per bird after creating it; pass the cache to drawRealisticBird.
 * @param {Object} k - Kaplay instance
 * @returns {Object} Pre-allocated vec2 collection
 */
export function buildBirdDrawCache(k) {
  return {
    bodyPos: k.vec2(0, 0),
    headPos: k.vec2(0, 0),
    //
    // Wing segment endpoints: two sides (L=0, R=1), four joints each.
    // shoulder[side], elbow[side], wrist[side], tip[side]
    //
    shoulderL: k.vec2(0, 0),
    elbowL: k.vec2(0, 0),
    wristL: k.vec2(0, 0),
    tipL: k.vec2(0, 0),
    shoulderR: k.vec2(0, 0),
    elbowR: k.vec2(0, 0),
    wristR: k.vec2(0, 0),
    tipR: k.vec2(0, 0)
  }
}

/**
 * Shared realistic bird silhouette for Touch section sky layers (L0, L1, …).
 * Body ellipse + head + curved multi-segment wings (gull-like M shape).
 *
 * @param {Object} k - Kaplay instance
 * @param {Object} bird - Descriptor with x, y, size, color (rgb object or compatible)
 * @param {number} wingFlap - Flap phase value (typically blended sine toward glide pose)
 * @param {Object} [dc] - Optional pre-allocated draw cache from buildBirdDrawCache().
 *   When provided eliminates all k.vec2 allocations from this call.
 */
export function drawRealisticBird(k, bird, wingFlap, dc) {
  const wingSpan = bird.size * 2.6
  const thickness = Math.max(1, bird.size * 0.35)
  const opacity = 0.88
  const elbowDrop = wingFlap * bird.size * 0.55
  const wristDrop = wingFlap * bird.size * 1.1
  const tipDrop = wingFlap * bird.size * 1.4
  if (dc) {
    //
    // Fast path: mutate pre-allocated vec2 instances — zero GC pressure.
    //
    dc.bodyPos.x = bird.x
    dc.bodyPos.y = bird.y
    k.drawEllipse({ pos: dc.bodyPos, radiusX: bird.size * 0.55, radiusY: bird.size * 0.32, color: bird.color, opacity })
    dc.headPos.x = bird.x + bird.size * 0.5
    dc.headPos.y = bird.y - bird.size * 0.05
    k.drawCircle({ pos: dc.headPos, radius: Math.max(1, bird.size * 0.22), color: bird.color, opacity })
    dc.shoulderL.x = bird.x - bird.size * 0.3; dc.shoulderL.y = bird.y - bird.size * 0.05
    dc.elbowL.x = bird.x - wingSpan * 0.35;    dc.elbowL.y = bird.y - bird.size * 0.2 + elbowDrop
    dc.wristL.x = bird.x - wingSpan * 0.7;     dc.wristL.y = bird.y - bird.size * 0.05 + wristDrop
    dc.tipL.x = bird.x - wingSpan;             dc.tipL.y = bird.y + tipDrop
    k.drawLine({ p1: dc.shoulderL, p2: dc.elbowL, width: thickness, color: bird.color, opacity })
    k.drawLine({ p1: dc.elbowL, p2: dc.wristL, width: thickness * 0.85, color: bird.color, opacity })
    k.drawLine({ p1: dc.wristL, p2: dc.tipL, width: thickness * 0.65, color: bird.color, opacity })
    dc.shoulderR.x = bird.x + bird.size * 0.3; dc.shoulderR.y = bird.y - bird.size * 0.05
    dc.elbowR.x = bird.x + wingSpan * 0.35;    dc.elbowR.y = bird.y - bird.size * 0.2 + elbowDrop
    dc.wristR.x = bird.x + wingSpan * 0.7;     dc.wristR.y = bird.y - bird.size * 0.05 + wristDrop
    dc.tipR.x = bird.x + wingSpan;             dc.tipR.y = bird.y + tipDrop
    k.drawLine({ p1: dc.shoulderR, p2: dc.elbowR, width: thickness, color: bird.color, opacity })
    k.drawLine({ p1: dc.elbowR, p2: dc.wristR, width: thickness * 0.85, color: bird.color, opacity })
    k.drawLine({ p1: dc.wristR, p2: dc.tipR, width: thickness * 0.65, color: bird.color, opacity })
    return
  }
  //
  // Fallback slow path (no cache provided — used by level0 L0 bird drawer)
  //
  k.drawEllipse({
    pos: k.vec2(bird.x, bird.y),
    radiusX: bird.size * 0.55,
    radiusY: bird.size * 0.32,
    color: bird.color,
    opacity
  })
  k.drawCircle({
    pos: k.vec2(bird.x + bird.size * 0.5, bird.y - bird.size * 0.05),
    radius: Math.max(1, bird.size * 0.22),
    color: bird.color,
    opacity
  })
  for (const side of [-1, 1]) {
    const shoulder = k.vec2(bird.x + side * bird.size * 0.3, bird.y - bird.size * 0.05)
    const elbow = k.vec2(bird.x + side * wingSpan * 0.35, bird.y - bird.size * 0.2 + elbowDrop)
    const wrist = k.vec2(bird.x + side * wingSpan * 0.7, bird.y - bird.size * 0.05 + wristDrop)
    const tip = k.vec2(bird.x + side * wingSpan, bird.y + tipDrop)
    k.drawLine({ p1: shoulder, p2: elbow, width: thickness, color: bird.color, opacity })
    k.drawLine({ p1: elbow, p2: wrist, width: thickness * 0.85, color: bird.color, opacity })
    k.drawLine({ p1: wrist, p2: tip, width: thickness * 0.65, color: bird.color, opacity })
  }
}
