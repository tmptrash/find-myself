//
// Fixed sprite ids used only inside Touch section scenes (for grep / tooling).
// Procedural names (organic tree clusters, mushrooms, rocks, roots) are registered
// automatically via loadTouchSprite().
//
export const TOUCH_LEVEL_KNOWN_SPRITE_IDS = {
  'lesson-touch.0': [
    'bg-touch-l0-black-back',
    'bg-touch-l0-back-organic',
    'bg-touch-l0-grey-leaf-mid',
    'bg-touch-l0-black-leaf-mid',
    'bg-touch-l0-front-static',
    'touch0-corner-sprite'
  ],
  'lesson-touch.1': [
    'bg-touch-back',
    'bg-touch-front-static',
    'touch1-corner-sprite'
  ],
  'lesson-touch.2': [
    'bg-touch-level2-background-bushes-near',
    'bg-touch-level2-mountains',
    'bg-touch-level2-darkest-trees',
    'bg-touch-level2-background-dark-trees',
    'touch2-corner-sprite'
  ],
  'lesson-touch.3': [
    'touch3-corner-sprite',
    'bg-touch-level3-sky',
    'bg-touch-level3-mountains',
    'bg-touch-level3-dark-trees',
    'bg-touch-level3-medium-trees',
    'bg-touch-level3-front-trees'
  ],
  'lesson-touch.4': [
    'center-arrow-level3'
  ]
}

const trackedTouchSpriteNames = new Set()

/**
 * Remember a Touch-only sprite id for GPU cleanup after the scene is swapped (see level-assets drain path).
 * @param {string} name - Kaplay sprite asset id
 */
export function registerTouchLevelSprite(name) {
  trackedTouchSpriteNames.add(name)
}

export function drainTrackedTouchSpriteNames() {
  const out = [...trackedTouchSpriteNames]
  trackedTouchSpriteNames.clear()
  return out
}

/**
 * Same as k.loadSprite but registers the asset for Touch-level VRAM cleanup.
 * @param {Object} k - Kaplay instance
 * @param {string} name - Sprite id
 * @param {*} src - Kaplay sprite source
 * @returns {*} Kaplay loadSprite return value
 */
export function loadTouchSprite(k, name, src) {
  registerTouchLevelSprite(name)
  const result = k.loadSprite(name, src)
  //
  // Release the HTMLCanvasElement's 2D backing store right after Kaplay reads it,
  // so the GPU buffer is freed without waiting for GC.
  //
  if (src && src.nodeName === 'CANVAS') {
    src.width = 0
    src.height = 0
  }
  return result
}
