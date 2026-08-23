//
// Cleanup owned by the currently active scene before a direct engine swap.
//
let engineTeardown = null

/**
 * Registers cleanup for resources that survive ordinary scene destruction.
 * @param {Function|null} fn
 */
export function registerEngineTeardown(fn) {
  engineTeardown = fn
}

/**
 * Runs and clears the current engine-swap cleanup callback.
 */
export function runEngineTeardown() {
  engineTeardown?.()
  engineTeardown = null
}
