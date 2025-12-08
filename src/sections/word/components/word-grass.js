import { CFG } from '../cfg.js'
import { parseHex } from '../../../utils/helper.js'
//
// Global state to persist grass positions across level restarts
//
let savedGrassData = null
//
// Grass parameters
//
const GRASS_COLOR = '#2A4A2A'  // Dark green
const GRASS_LETTERS = ['|', '/', 'v', 'V', 'y', 'y', 'Y']  // Letters that look like grass blades
const GRASS_ROWS = 1  // Only one row on bottom platform
const GRASS_HEIGHT = 40  // Height of each grass blade
const GRASS_SPACING = 80  // Spacing between grass clusters
const GRASS_VERTICAL_OFFSET = 12  // Move grass up on screen (from bottom platform edge)
const SWAY_AMPLITUDE = 8  // How much grass sways at the top
const SWAY_SPEED = 1.2  // Speed of swaying
const BLADE_SAFE_DISTANCE = 50  // Minimum distance from blade obstacles

/**
 * Creates word grass system
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {Object} config.customBounds - Playable area bounds {left, right, top, bottom}
 * @param {Object} config.hero - Hero instance for interaction detection
 * @param {Array} config.bladePositions - Array of blade X positions to avoid
 * @param {Array} config.platformGaps - Array of gap objects {x, width} to avoid
 * @param {Array} config.movingPlatformPositions - Array of moving platform X positions to avoid
 * @returns {Object} Word grass instance
 */
export function create(config) {
  const { k, customBounds, hero, bladePositions = [], platformGaps = [], movingPlatformPositions = [] } = config
  //
  // Always destroy existing grass first
  //
  const existingGrassBlades = k.get("word-grass-blade")
  const existingGrassOutlines = k.get("word-grass-outline")
  
  existingGrassBlades.forEach(obj => obj.destroy())
  existingGrassOutlines.forEach(obj => obj.destroy())
  //
  // If we have saved grass data, recreate with exact same parameters
  // But filter out grass that's over gaps or near moving platforms
  //
  if (savedGrassData) {
    const grassBlades = []
    const [grassR, grassG, grassB] = parseHex(GRASS_COLOR)
    const GAP_SAFETY_MARGIN = 80
    
    savedGrassData.forEach(savedGrass => {
      const x = savedGrass.x
      //
      // Check if grass is over a gap
      //
      let overGap = false
      for (const gap of platformGaps) {
        const gapLeft = gap.x - GAP_SAFETY_MARGIN
        const gapRight = gap.x + gap.width + GAP_SAFETY_MARGIN
        if (x >= gapLeft && x <= gapRight) {
          overGap = true
          break
        }
      }
      
      if (overGap) return
      //
      // Check if grass is too close to any moving platform
      //
      let tooCloseToMovingPlatform = false
      for (const platformX of movingPlatformPositions) {
        if (Math.abs(x - platformX) < BLADE_SAFE_DISTANCE) {
          tooCloseToMovingPlatform = true
          break
        }
      }
      
      if (tooCloseToMovingPlatform) return
      
      const grass = recreateGrassBlade(k, savedGrass, grassR, grassG, grassB)
      grassBlades.push(grass)
    })
    
    return {
      k,
      grassBlades,
      playableLeft: customBounds.left,
      playableRight: customBounds.right,
      time: 0
    }
  }
  
  const playableLeft = customBounds.left
  const playableRight = customBounds.right
  const playableBottom = customBounds.bottom
  
  const grassBlades = []
  
  //
  // Create grass blades in a single row on bottom platform
  //
  const [grassR, grassG, grassB] = parseHex(GRASS_COLOR)
  
  for (let row = 0; row < GRASS_ROWS; row++) {
    const rowY = playableBottom + GRASS_VERTICAL_OFFSET
    const bladesInRow = Math.floor((playableRight - playableLeft) / GRASS_SPACING)
    
    let i = 0
    while (i < bladesInRow) {
      const x = playableLeft + (i * GRASS_SPACING) + Math.random() * GRASS_SPACING * 0.5
      
      //
      // Check if grass is too close to any blade
      //
      let tooCloseToBlades = false
      for (const bladeX of bladePositions) {
        if (Math.abs(x - bladeX) < BLADE_SAFE_DISTANCE) {
          tooCloseToBlades = true
          break
        }
      }
      
      if (tooCloseToBlades) {
        i++
        continue
      }
      
      //
      // Check if grass is over a gap in the platform (with extended safety margin)
      //
      let overGap = false
      const GAP_SAFETY_MARGIN = 80  // Extra margin around gaps to prevent grass near edges
      for (const gap of platformGaps) {
        const gapLeft = gap.x - GAP_SAFETY_MARGIN
        const gapRight = gap.x + gap.width + GAP_SAFETY_MARGIN
        if (x >= gapLeft && x <= gapRight) {
          overGap = true
          break
        }
      }
      
      if (overGap) {
        i++
        continue
      }
      //
      // Check if grass is too close to any moving platform (redundant safety check)
      //
      let tooCloseToMovingPlatform = false
      for (const platformX of movingPlatformPositions) {
        if (Math.abs(x - platformX) < BLADE_SAFE_DISTANCE) {
          tooCloseToMovingPlatform = true
          break
        }
      }
      
      if (tooCloseToMovingPlatform) {
        i++
        continue
      }
      //
      // Randomly skip some grass clusters (40% chance) to create natural gaps
      // This makes gaps in platform less obvious
      //
      if (Math.random() < 0.4) {
        i++
        continue
      }
      
      //
      // Predefined grass cluster combinations
      //
      const predefinedClusters = [
        ['Y', 'V'],
        ['Y', '|'],
        ['V', '|'],
        ['V', 'V'],
        ['V', 'v'],
        ['|', '|'],
        ['v', 'v']
      ]
      
      const clusterGrassSize = GRASS_HEIGHT * (0.6 + Math.random() * 0.8)
      
      //
      // 70% chance to use predefined cluster, 30% chance for random
      //
      let clusterLetters
      if (Math.random() < 0.7) {
        clusterLetters = predefinedClusters[Math.floor(Math.random() * predefinedClusters.length)]
      } else {
        const doubleStrokeLetters = ['v', 'V', 'y', 'Y']
        const getLetterWeight = (letter) => doubleStrokeLetters.includes(letter) ? 2 : 1
        const targetBladeCount = 3 + Math.floor(Math.random() * 2)
        
        clusterLetters = []
        let currentBladeCount = 0
        
        while (currentBladeCount < targetBladeCount) {
          const letter = GRASS_LETTERS[Math.floor(Math.random() * GRASS_LETTERS.length)]
          const letterWeight = getLetterWeight(letter)
          
          if (currentBladeCount + letterWeight <= targetBladeCount) {
            clusterLetters.push(letter)
            currentBladeCount += letterWeight
          } else if (clusterLetters.length === 0) {
            clusterLetters.push(letter)
            currentBladeCount += letterWeight
            break
          } else {
            const singleBladeLetters = GRASS_LETTERS.filter(l => !doubleStrokeLetters.includes(l))
            if (currentBladeCount < targetBladeCount && singleBladeLetters.length > 0) {
              const singleLetter = singleBladeLetters[Math.floor(Math.random() * singleBladeLetters.length)]
              clusterLetters.push(singleLetter)
              currentBladeCount += 1
            }
            break
          }
        }
      }
      
      //
      // All grass blades at same baseline
      //
      const adjustedRowY = rowY
      
      //
      // Create each letter in the cluster
      //
      for (let c = 0; c < clusterLetters.length; c++) {
        const clusterOffsetX = c * (2 + Math.random() * 2)
        const finalX = x + clusterOffsetX
      
        const letter = clusterLetters[c]
        const baseRotation = -5 + Math.random() * 10
      
      //
      // Create outline by drawing black text multiple times with offsets
      //
      const outlineOffsets = [
        [-1, -1], [0, -1], [1, -1],
        [-1, 0],           [1, 0],
        [-1, 1],  [0, 1],  [1, 1]
      ]
      
      const outlineObjects = []
      outlineOffsets.forEach(([dx, dy]) => {
        const outlineText = k.add([
          k.text(letter, {
            size: clusterGrassSize,
            font: CFG.visual.fonts.thinFull.replace(/'/g, '')
          }),
          k.pos(finalX + dx, adjustedRowY + dy),
          k.color(0, 0, 0),
          k.opacity(0.7 + Math.random() * 0.3),
          k.rotate(baseRotation),
          k.anchor('bot'),
          k.z(CFG.visual.zIndex.platforms - 1.1),
          k.fixed(),
          "word-grass-outline"
        ])
        outlineObjects.push({ outline: outlineText, dx, dy })
      })
      
      //
      // Create main grass blade text
      //
      const grassBlade = k.add([
        k.text(letter, {
          size: clusterGrassSize,
          font: CFG.visual.fonts.thinFull.replace(/'/g, '')
        }),
        k.pos(finalX, adjustedRowY),
        k.color(grassR, grassG, grassB),
        k.opacity(0.7 + Math.random() * 0.3),
        k.rotate(baseRotation),
        k.anchor('bot'),
        k.z(CFG.visual.zIndex.platforms - 1),
        k.fixed(),
        "word-grass-blade"
      ])
      
      grassBlades.push({
        blade: grassBlade,
        outlines: outlineObjects,
        baseRotation,
        baseX: finalX,
        baseY: adjustedRowY,
        grassSize: clusterGrassSize,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: SWAY_SPEED * (0.8 + Math.random() * 0.4)
      })
      }
      
      i++
    }
  }
  //
  // Save grass data for future recreation
  //
  savedGrassData = grassBlades.map(grass => ({
    letter: grass.blade.text,
    x: grass.baseX,
    y: grass.baseY,
    size: grass.grassSize,
    rotation: grass.baseRotation,
    opacity: grass.blade.opacity,
    swayOffset: grass.swayOffset,
    swaySpeed: grass.swaySpeed,
    outlines: grass.outlines.map(o => ({ dx: o.dx, dy: o.dy }))
  }))
  
  const inst = {
    k,
    grassBlades,
    hero,
    playableLeft,
    playableRight,
    time: 0
  }
  
  return inst
}
/**
 * Recreate a grass blade with saved parameters
 * @param {Object} k - Kaplay instance
 * @param {Object} savedGrass - Saved grass parameters
 * @param {number} grassR - Red color component
 * @param {number} grassG - Green color component
 * @param {number} grassB - Blue color component
 * @returns {Object} Grass object
 */
function recreateGrassBlade(k, savedGrass, grassR, grassG, grassB) {
  //
  // Create outline objects first
  //
  const outlineObjects = []
  savedGrass.outlines.forEach(({ dx, dy }) => {
    const outline = k.add([
      k.text(savedGrass.letter, {
        size: savedGrass.size,
        font: CFG.visual.fonts.thinFull.replace(/'/g, '')
      }),
      k.pos(savedGrass.x + dx, savedGrass.y + dy),
      k.color(0, 0, 0),
      k.opacity(1),
      k.rotate(savedGrass.rotation),
      k.anchor('bot'),
      k.z(CFG.visual.zIndex.platforms - 1.1),
      k.fixed(),
      "word-grass-outline"
    ])
    outlineObjects.push({ outline, dx, dy })
  })
  //
  // Create main blade
  //
  const grassBlade = k.add([
    k.text(savedGrass.letter, {
      size: savedGrass.size,
      font: CFG.visual.fonts.thinFull.replace(/'/g, '')
    }),
    k.pos(savedGrass.x, savedGrass.y),
    k.color(grassR, grassG, grassB),
    k.opacity(savedGrass.opacity),
    k.rotate(savedGrass.rotation),
    k.anchor('bot'),
    k.z(CFG.visual.zIndex.platforms - 1),
    k.fixed(),
    "word-grass-blade"
  ])
  
  return {
    blade: grassBlade,
    outlines: outlineObjects,
    baseRotation: savedGrass.rotation,
    baseX: savedGrass.x,
    baseY: savedGrass.y,
    grassSize: savedGrass.size,
    swayOffset: savedGrass.swayOffset,
    swaySpeed: savedGrass.swaySpeed
  }
}
/**
 * Reset grass state (call when leaving word section completely)
 */
export function reset() {
  savedGrassData = null
}

/**
 * Updates grass animation
 * @param {Object} inst - Word grass instance
 */
export function onUpdate(inst) {
  const { k, grassBlades, time } = inst
  
  inst.time += k.dt()
  
  //
  // Update grass swaying (only top sways, bottom is fixed in ground)
  //
  grassBlades.forEach(grass => {
    const { blade, outlines, baseRotation, baseX, baseY, swayOffset, swaySpeed } = grass
    
    //
    // Gentle wind sway
    //
    const windSway = Math.sin(time * swaySpeed + swayOffset) * SWAY_AMPLITUDE
    const totalAngle = baseRotation + windSway
    
    blade.angle = totalAngle
    
    //
    // Keep base position absolutely fixed
    //
    blade.pos.x = baseX
    blade.pos.y = baseY
    
    //
    // Update outline positions and rotations to match main blade
    //
    outlines.forEach(({ outline, dx, dy }) => {
      outline.angle = totalAngle
      outline.pos.x = baseX + dx
      outline.pos.y = baseY + dy
    })
  })
}

/**
 * Destroys all grass objects
 * @param {Object} inst - Word grass instance
 */
export function destroy(inst) {
  inst.grassBlades.forEach(grass => {
    grass.blade.destroy()
    grass.outlines.forEach(outline => outline.outline.destroy())
  })
}
