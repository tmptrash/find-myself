import { get, set } from '../../../utils/progress.js'

//
// Pre-G eyeless intro steps counted toward the G HUD fill (x/8).
//
export const KEY_HUD_G_CAVE_ENTERED = 'glow.hudGCaveEntered'
export const KEY_HUD_G_PIT_MUSH_LAUNCH = 'glow.hudGPitMushLaunch'

export function markGlowHudGCaveEntered() {
  !get(KEY_HUD_G_CAVE_ENTERED, false) && set(KEY_HUD_G_CAVE_ENTERED, true)
}

export function markGlowHudGPitMushLaunch() {
  !get(KEY_HUD_G_PIT_MUSH_LAUNCH, false) && set(KEY_HUD_G_PIT_MUSH_LAUNCH, true)
}

export function countGlowHudGCaveIntroParts() {
  let n = 0
  get(KEY_HUD_G_CAVE_ENTERED, false) && n++
  get(KEY_HUD_G_PIT_MUSH_LAUNCH, false) && n++
  return n
}
