/**
 * Progress tracking using localStorage
 */
const STORAGE_KEY = 'find-yourself-progress'

/**
 * Section colors configuration (body color only, outline is always black)
 */
export const SECTION_COLORS = {
  word: {
    body: 'FF0000'      // Red
  },
  touch: {
    body: 'FF8C00'      // Orange
  },
  feel: {
    body: 'FFD700'      // Gold
  },
  memory: {
    body: '00CED1'      // Dark turquoise
  },
  stress: {
    body: '9370DB'      // Medium purple
  },
  time: {
    body: '00FF00'      // Lime green
  }
}

/**
 * Get all sections progress from localStorage
 * @returns {Object} Progress object with section completion status and last level
 */
export function getProgress() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    // Ignore errors
  }
  
  //
  // Default progress - all sections incomplete, no last level
  //
  return {
    word: false,
    touch: false,
    feel: false,
    memory: false,
    stress: false,
    time: false,
    lastLevel: null  // Last played level (e.g., 'level-word.2')
  }
}

/**
 * Mark section as completed
 * @param {string} section - Section name
 */
export function markSectionComplete(section) {
  const progress = getProgress()
  progress[section] = true
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Check if section is completed
 * @param {string} section - Section name
 * @returns {boolean} True if section is completed
 */
export function isSectionComplete(section) {
  const progress = getProgress()
  return progress[section] || false
}

/**
 * Save last played level
 * @param {string} levelName - Level name (e.g., 'level-word.2')
 */
export function saveLastLevel(levelName) {
  const progress = getProgress()
  progress.lastLevel = levelName
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Get last played level
 * @returns {string|null} Last level name or null if no progress
 */
export function getLastLevel() {
  const progress = getProgress()
  return progress.lastLevel || null
}

/**
 * Reset all progress (for testing)
 */
export function resetProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Get section label positions (arranged in circle)
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {number} radius - Circle radius
 * @returns {Array} Array of section configs with positions
 */
export function getSectionPositions(centerX, centerY, radius) {
  const sections = ['word', 'touch', 'feel', 'memory', 'stress', 'time']
  const angleStep = (Math.PI * 2) / 6  // 360 / 6 degrees
  const startAngle = -Math.PI / 2  // Start at top
  
  return sections.map((section, index) => {
    const angle = startAngle + angleStep * index
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius
    
    return {
      section,
      x,
      y,
      color: SECTION_COLORS[section]
    }
  })
}

