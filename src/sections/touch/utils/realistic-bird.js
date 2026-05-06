/**
 * Shared realistic bird silhouette for Touch section sky layers (L0, L1, …).
 * Body ellipse + head + curved multi-segment wings (gull-like M shape).
 *
 * @param {Object} k - Kaplay instance
 * @param {Object} bird - Descriptor with x, y, size, color (rgb object or compatible)
 * @param {number} wingFlap - Flap phase value (typically blended sine toward glide pose)
 */
export function drawRealisticBird(k, bird, wingFlap) {
  const wingSpan = bird.size * 2.6
  const thickness = Math.max(1, bird.size * 0.35)
  const opacity = 0.88
  //
  // Body: small horizontal ellipse
  //
  k.drawEllipse({
    pos: k.vec2(bird.x, bird.y),
    radiusX: bird.size * 0.55,
    radiusY: bird.size * 0.32,
    color: bird.color,
    opacity
  })
  //
  // Tiny head bump in front (birds drift right)
  //
  k.drawCircle({
    pos: k.vec2(bird.x + bird.size * 0.5, bird.y - bird.size * 0.05),
    radius: Math.max(1, bird.size * 0.22),
    color: bird.color,
    opacity
  })
  //
  // Wing joints: up-flap raises wrist & tip
  //
  const elbowDrop = wingFlap * bird.size * 0.55
  const wristDrop = wingFlap * bird.size * 1.1
  const tipDrop = wingFlap * bird.size * 1.4
  //
  // Two sides: shoulder → elbow → wrist → tip polylines
  //
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
