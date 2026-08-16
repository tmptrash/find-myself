//
// Full-screen click catcher so mouse-down on the hero (or any GameObj with
// area()) still reaches skip / close handlers. Kaplay 4000 can swallow
// global onMousePress when the cursor is over an area() body.
//
const CATCHER_Z = 10000
const DEBOUNCE_SEC = 0.16

/**
 * Binds left-click (global + overlay) to fn. Call cancel() to remove it.
 * @param {Object} k - Kaplay instance
 * @param {Function} fn - Activate callback
 * @returns {{ cancel: Function }}
 */
export function bindPointerActivate(k, fn) {
  let lastAt = -1
  const fire = () => {
    const now = k.time()
    if (now - lastAt < DEBOUNCE_SEC) return
    lastAt = now
    fn()
  }
  const catcher = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.anchor('topleft'),
    k.area(),
    k.fixed(),
    k.opacity(0),
    k.z(CATCHER_Z)
  ])
  const pressHandler = k.onMousePress('left', fire)
  const clickHandler = k.onClick ? k.onClick(fire) : null
  const objClick = catcher.onClick?.(fire)
  const objPress = catcher.onMousePress?.(fire)
  return {
    cancel() {
      pressHandler?.cancel?.()
      clickHandler?.cancel?.()
      objClick?.cancel?.()
      objPress?.cancel?.()
      catcher.destroy?.()
    }
  }
}
