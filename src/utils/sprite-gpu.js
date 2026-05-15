/**
 * Replace a sprite's GPU texture with a 1×1 placeholder.
 * Does NOT call tex.free() — freeing GPU memory while Kaplay may still hold a reference
 * causes black squares. Let JavaScript GC collect the old texture object naturally
 * once Kaplay's registry no longer references it.
 * @param {Object} k - Kaplay instance
 * @param {string} name - Sprite asset id
 */
export function squashSpriteReleaseGpu(k, name) {
  try {
    if (!k.getSprite(name)) return
  } catch (_) {
    return
  }
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  k.loadSprite(name, canvas)
}
