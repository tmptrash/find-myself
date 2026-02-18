//
// Background birds constants
//
const BIRD_COUNT = 5
const SKY_HEIGHT = 300

/**
 * Create background birds system
 * @param {Object} k - Kaplay instance
 * @returns {Object} Birds system instance
 */
export function create(k) {
  //
  // Create birds data
  //
  const birds = []
  
  for (let i = 0; i < BIRD_COUNT; i++) {
    const startX = Math.random() * k.width()
    const startY = 100 + Math.random() * SKY_HEIGHT
    const speed = 30 + Math.random() * 30
    const amplitude = 8 + Math.random() * 15
    const frequency = 0.5 + Math.random() * 1.0
    const phaseOffset = Math.random() * Math.PI * 2
    const timeOffset = Math.random() * 10
    const isDark = Math.random() < 0.5
    //
    // Dark birds are bigger (closer), gray birds are smaller (farther)
    // More blurred colors (lighter gray)
    //
    const size = isDark ? (6 + Math.random() * 4) : (3 + Math.random() * 2)
    
    birds.push({
      x: startX,
      y: startY,
      baseY: startY,
      speed,
      amplitude,
      frequency,
      size,
      phaseOffset,
      timeOffset,
      color: isDark ? k.rgb(80, 80, 80) : k.rgb(120, 120, 120),  // Lighter gray for blur effect
      wingPhase: 0,
      isFlapping: Math.random() > 0.5,
      flapTimer: Math.random() * 3,
      flapDuration: 0.8 + Math.random() * 0.4,
      glideDuration: 2.0 + Math.random() * 2.0
    })
  }
  //
  // Create game object with draw function and z-index
  //
  const birdsLayer = k.add([
    k.z(15.6),  // Above background and city buildings
    k.fixed(),
    {
      draw() {
        drawBirds(k, birds)
      }
    }
  ])
  //
  // Create inst
  //
  const inst = {
    k,
    birds,
    birdsLayer
  }
  
  return inst
}

/**
 * Draw all birds
 * @param {Object} k - Kaplay instance
 * @param {Array} birds - Array of bird objects
 */
function drawBirds(k, birds) {
  const time = k.time()
  const dt = k.dt()
  
  for (const bird of birds) {
    //
    // Update position
    //
    bird.x += bird.speed * dt
    //
    // Wrap around screen
    //
    if (bird.x > k.width() + 50) {
      bird.x = -50
      bird.baseY = 100 + Math.random() * SKY_HEIGHT
    }
    //
    // Sine wave flight pattern
    //
    bird.y = bird.baseY + Math.sin((time + bird.timeOffset) * bird.frequency + bird.phaseOffset) * bird.amplitude
    //
    // Update flapping state timer
    //
    bird.flapTimer += dt
    const currentDuration = bird.isFlapping ? bird.flapDuration : bird.glideDuration
    
    if (bird.flapTimer > currentDuration) {
      bird.isFlapping = !bird.isFlapping
      bird.flapTimer = 0
    }
    //
    // Wing animation: flap or glide
    //
    let wingAngle
    if (bird.isFlapping) {
      bird.wingPhase = Math.sin((time + bird.timeOffset) * 8 + bird.phaseOffset)
      wingAngle = bird.wingPhase * 0.8
    } else {
      wingAngle = 0.7
    }
    //
    // Draw bird as two wings with one bend each (more realistic)
    //
    const wingSpan = bird.size * 3.0
    const wingHeight = Math.abs(wingAngle) * wingSpan * 0.4
    const wingThickness = bird.size * 0.3
    //
    // Center point of bird
    //
    const centerX = bird.x
    const centerY = bird.y
    //
    // Left wing with bend
    // First segment: center to mid-point
    // Second segment: mid-point to tip
    //
    const leftMidX = centerX - wingSpan * 0.5
    const leftMidY = centerY - wingHeight * 0.6
    const leftTipX = centerX - wingSpan
    const leftTipY = centerY - wingHeight * 0.3
    //
    // Right wing with bend
    //
    const rightMidX = centerX + wingSpan * 0.5
    const rightMidY = centerY - wingHeight * 0.6
    const rightTipX = centerX + wingSpan
    const rightTipY = centerY - wingHeight * 0.3
    //
    // Draw left wing (two segments)
    //
    k.drawLine({
      p1: k.vec2(centerX, centerY),
      p2: k.vec2(leftMidX, leftMidY),
      width: wingThickness,
      color: bird.color,
      opacity: 0.3
    })
    k.drawLine({
      p1: k.vec2(leftMidX, leftMidY),
      p2: k.vec2(leftTipX, leftTipY),
      width: wingThickness * 0.7,
      color: bird.color,
      opacity: 0.3
    })
    //
    // Draw right wing (two segments)
    //
    k.drawLine({
      p1: k.vec2(centerX, centerY),
      p2: k.vec2(rightMidX, rightMidY),
      width: wingThickness,
      color: bird.color,
      opacity: 0.3
    })
    k.drawLine({
      p1: k.vec2(rightMidX, rightMidY),
      p2: k.vec2(rightTipX, rightTipY),
      width: wingThickness * 0.7,
      color: bird.color,
      opacity: 0.3
    })
  }
}
