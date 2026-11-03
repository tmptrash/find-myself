import { prop, setProp } from './helper.js'
/**
 * Progress tracking using localStorage.
 * Section-specific properties are namespaced under their section key
 * (e.g. forest.completed, cave.completed).
 * Global properties: lastLesson, heroScore, lifeScore, sounds
 */
const STORAGE_KEY = 'rootward'
const LEGACY_STORAGE_KEY = 'find-yourself'
const SECTIONS = ['forest', 'cave']
//
// The forest section used to be called "glow": saves written before the
// rename still carry the old scene names.
//
const LEGACY_FOREST_LESSON_PREFIX = 'lesson-glow.'
const FOREST_LESSON_PREFIX = 'lesson-forest.'
const LEGACY_FOREST_COMPLETE = 'glow-complete'
const FOREST_COMPLETE = 'forest-complete'

/**
 * Maps stale saved scene names to current ones: pre-rename glow scenes to
 * their forest names.
 * @param {string|null} sceneName
 * @returns {string|null}
 */
export function normalizeSceneName(sceneName) {
  if (!sceneName) return sceneName
  if (sceneName === LEGACY_FOREST_COMPLETE) return FOREST_COMPLETE
  if (sceneName.startsWith(LEGACY_FOREST_LESSON_PREFIX)) {
    return FOREST_LESSON_PREFIX + sceneName.slice(LEGACY_FOREST_LESSON_PREFIX.length)
  }
  return sceneName
}
//
// Default progress with section objects
//
function createDefault() {
  const progress = {
    lastLesson: null,
    heroScore: 0,
    lifeScore: 0,
    sounds: {}
  }
  SECTIONS.forEach(s => { progress[s] = { completed: false } })
  return progress
}
//
// Make sure every section has its { completed } object (older saves hold
// a bare boolean, or lack the section altogether)
//
function migrate(data) {
  let changed = false
  SECTIONS.forEach(s => {
    if (typeof data[s] === 'boolean' || data[s] === undefined) {
      data[s] = { completed: data[s] === true }
      changed = true
    }
  })
  if (changed) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }
    catch (_) {}
  }
  return data
}
/**
 * Get all sections progress from localStorage
 * @returns {Object} Progress object with section completion status and last level
 */
export function getProgress() {
  try {
    let raw = localStorage[STORAGE_KEY]
    if (raw == null && localStorage[LEGACY_STORAGE_KEY] != null) {
      raw = localStorage[LEGACY_STORAGE_KEY]
      localStorage.setItem(STORAGE_KEY, raw)
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    }
    if (raw != null) {
      const data = JSON.parse(raw)
      return migrate(data)
    }
  } catch (_) {}
  return createDefault()
}
/**
 * Universal getter — returns a prop's value by dot-separated path
 * @param {string} path Path to the property separated by '.'
 * @param {*} defValue Default value if the property is not found
 * @returns {*} Value of the property or default value if the property is not found
 */
export function get(path, defValue = null) {
  const val = prop(path, getProgress())
  if (val !== null && val !== undefined) return val
  //
  // Legacy top-level localStorage keys (e.g. devtools edits outside rootward)
  //
  if (path === 'heroScore' || path === 'lifeScore') {
    try {
      const legacy = localStorage.getItem(path)
      if (legacy !== null && legacy !== '') {
        const n = Number(legacy)
        if (!Number.isNaN(n)) {
          set(path, n)
          return n
        }
      }
    } catch (_) {}
  }
  return defValue
}
/**
 * Universal setter — sets a prop's value by dot-separated path
 * @param {string} path Path to the property separated by '.'
 * @param {*} val Value to set
 */
export function set(path, val) {
  const progress = getProgress()
  setProp(path, val, progress)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)) }
  catch (_) {}
}
/**
 * Mark section as completed
 * @param {string} section - Section name
 */
export function setSectionCompleted(section) {
  set(section + '.completed', true)
}
/**
 * Save sound status
 * @param {string} soundName - Name of the sound (not a filename)
 * @param {boolean} status - Sound play status
 */
export function setSoundStatus(soundName, status) {
  set('sounds.' + soundName, status)
}
/**
 * Reset all progress (for testing)
 */
export function resetProgress() {
  delete localStorage[STORAGE_KEY]
}
