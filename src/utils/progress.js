import { prop, setProp } from './helper.js'
/**
 * Progress tracking using localStorage.
 * All section-specific properties are namespaced under their section key:
 *   touch.completed, touch.lifeDeducted, touch.trapActive,
 *   word.completed, word.lesson4LetterInstructionsCount,
 *   time.completed, time.lesson3SnowballInstructionsCount, etc.
 * Global properties: lastLevel, heroScore, lifeScore, sounds
 */
const STORAGE_KEY = 'find-yourself'
const SECTIONS = ['word', 'touch', 'feel', 'mind', 'stress', 'time']
//
// Time section scene indices run 0–3 (HUD letter levelNumber is 1–4).
//
const TIME_SCENE_MAX_INDEX = 3

/**
 * Maps invalid time scene names (e.g. lesson-time.4 from stale saves) to the last valid level.
 * @param {string|null} sceneName
 * @returns {string|null}
 */
export function normalizeSceneName(sceneName) {
  if (!sceneName || !sceneName.startsWith('lesson-time.')) return sceneName
  const index = parseInt(sceneName.replace('lesson-time.', ''), 10)
  if (Number.isNaN(index) || index <= TIME_SCENE_MAX_INDEX) return sceneName
  return `lesson-time.${TIME_SCENE_MAX_INDEX}`
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
// Migrate old flat format (section: boolean) to new nested format (section: { completed })
//
function migrate(data) {
  let changed = false
  SECTIONS.forEach(s => {
    if (typeof data[s] === 'boolean' || data[s] === undefined) {
      data[s] = { completed: data[s] === true }
      changed = true
    }
  })
  //
  // Move old flat keys into their section namespace
  //
  if (data.lifeDeducted !== undefined) {
    data.touch.lifeDeducted = data.lifeDeducted
    data.touch.trapActive = data.lifeDeducted
    delete data.lifeDeducted
    changed = true
  }
  if (data.level4LetterInstructionsCount !== undefined) {
    data.word.lesson4LetterInstructionsCount = data.level4LetterInstructionsCount
    delete data.level4LetterInstructionsCount
    changed = true
  }
  if (data.level3SnowballInstructionsCount !== undefined) {
    data.time.lesson3SnowballInstructionsCount = data.level3SnowballInstructionsCount
    delete data.level3SnowballInstructionsCount
    changed = true
  }
  if (data.level3GlowInstructionsCount !== undefined) {
    data.touch.lesson3GlowInstructionsCount = data.level3GlowInstructionsCount
    delete data.level3GlowInstructionsCount
    changed = true
  }
  //
  // Migrate old conversations.monsterSeen to touch.monsterSeen
  //
  if (data.conversations?.monsterSeen !== undefined) {
    data.touch.monsterSeen = data.conversations.monsterSeen
    delete data.conversations
    changed = true
  }
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
    const data = JSON.parse(localStorage[STORAGE_KEY])
    return migrate(data)
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
  // Legacy top-level localStorage keys (e.g. devtools edits outside find-yourself)
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
