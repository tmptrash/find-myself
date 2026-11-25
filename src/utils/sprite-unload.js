//
// Kaplay (the pinned alpha) has no call to unload a sprite: every picture
// loaded on an engine keeps its GPU texture until that engine is torn
// down. A scene's own big bakes (the menu's screen-sized backdrops) then
// stay on the GPU all through the levels — tens of MB a phone's GPU is
// asked to hold for nothing, and what it drops the game's WebGL context
// over. This frees one: its frames are taken off the texture packer (a
// picture with a texture of its own gives that texture back at once; one
// on a shared page only frees its place there) and its name is forgotten,
// so it can be loaded again later. It reaches into the engine's internals
// (`k._k.assets`), so it does nothing where those are not as expected.
//

/**
 * Frees a loaded sprite's texture and forgets its name on this engine.
 * @param {Object} k - Kaplay instance
 * @param {string} name - Sprite name
 * @returns {boolean} Whether it was loaded and is now freed
 */
export function unloadSprite(k, name) {
  const assets = k?._k?.assets
  const registry = assets?.sprites?.assets
  const frames = registry?.get?.(name)?.data?.frames
  if (!frames || !assets.packer?._remove) return false
  frames.forEach(frame => assets.packer._remove(frame.id))
  registry.delete(name)
  return true
}
