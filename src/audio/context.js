// ============================================
// SINGLE AUDIO CONTEXT FOR THE ENTIRE GAME
// ============================================
// Singleton pattern for AudioContext

let audioContext = null

/**
 * Get or create global AudioContext
 * @returns {AudioContext} The single AudioContext instance
 */
export function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    
    // Try to start context immediately
    audioContext.resume().catch(() => {
      // If failed, will try on first user interaction
    })
    
    // Try to resume on page load
    window.addEventListener('load', () => {
      audioContext.resume()
    })
  }
  
  return audioContext
}

/**
 * Resume audio context (useful for user interactions)
 * @returns {Promise<void>}
 */
export async function resumeAudioContext() {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
}
