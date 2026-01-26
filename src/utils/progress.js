import { prop, setProp } from './helper.js'
/**
 * Progress tracking using localStorage
 */
const STORAGE_KEY = 'find-yourself'
/**
 * Get all sections progress from localStorage
 * @returns {Object} Progress object with section completion status and last level
 */
export function getProgress() {
  try { return JSON.parse(localStorage[STORAGE_KEY])}
  catch (error) {}
  //
  // Default progress - all sections incomplete, no last level
  //
  return {
    word: false,
    touch: false,
    feel: false,
    mind: false,
    stress: false,
    time: false,
    lastLevel: null,  // Last played level (e.g., 'level-word.2')
    sounds: {}
  }
}
/**
 * Universal function, which returns a prop's value by it's path
 * @param {*} path Path to the property separated by '.'
 * @param {*} defValue Default value if the property is not found
 * @returns {*} Value of the property or default value if the property is not found
 */
export function get(path, defValue = null) {
  return prop(path, getProgress()) || defValue
}
/**
 * Universal function, which sets a prop's value by it's path
 * @param {*} path Path to the property separated by '.'
 * @param {*} val Value to set
 */
export function set(path, val) {
  const progress = getProgress()
  setProp(path, val, progress)
  try {localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))}
  catch (_) {}
}
/**
 * Mark section as completed
 * @param {string} section - Section name
 */
export function setSectionCompleted(section) {
  const progress = getProgress()
  progress[section] = true
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (error) {
    // Ignore errors
  }
}
/**
 * Save sound status
 * @param {string} soundName - Name of the sound (not a filename)
 */
export function setSoundStatus(soundName, status) {
  const progress = getProgress()
  progress.sounds[soundName] = status
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Reset all progress (for testing)
 */
export function resetProgress() {
  delete localStorage[STORAGE_KEY]
}

